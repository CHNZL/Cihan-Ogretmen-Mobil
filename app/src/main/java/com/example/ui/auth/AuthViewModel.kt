package com.example.ui.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.auth.AuthResult
import com.example.auth.UserData
import com.example.auth.UserRole
import com.example.data.FirestoreRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await

class AuthViewModel : ViewModel() {
    private val firestoreRepository = FirestoreRepository()
    
    private val _state = MutableStateFlow(AuthState())
    val state = _state.asStateFlow()

    fun onSignInResult(result: AuthResult) {
        if (result.data != null) {
            _state.update { it.copy(isLoading = true, signInError = null) }
            
            viewModelScope.launch {
                val email = result.data.email ?: ""
                val userId = result.data.userId
                var resolvedUser = result.data
                
                // Help check teacher role case-and-locale-insensitively
                val cleanEmailLower = email.trim().lowercase()
                val isEmailAdmin = cleanEmailLower == "cihan.ozel10@gmail.com" || 
                                   cleanEmailLower == "cihanogretmen10@gmail.com"
                
                fun checkIsTeacher(profileType: String): Boolean {
                    val p = profileType.trim()
                    return p.equals("ÖĞRETMEN", ignoreCase = true) || 
                           p.equals("Öğretmen", ignoreCase = true) || 
                           p.equals("OGRETMEN", ignoreCase = true) ||
                           p.equals("TEACHER", ignoreCase = true) ||
                           p.contains("Öğret", ignoreCase = true) ||
                           p.contains("ogret", ignoreCase = true)
                }

                android.util.Log.d("AuthViewModel", "onSignInResult for email: $email, userId: $userId")

                if (isEmailAdmin) {
                    val adminUid = "cihan_ozel_web_uid"
                    resolvedUser = result.data.copy(
                        role = UserRole.ADMIN,
                        userId = adminUid,
                        teacherUid = adminUid
                    )
                    android.util.Log.d("AuthViewModel", "Instant login for Cihan Hoca ADMIN session! teacherUid: $adminUid")
                    _state.update { it.copy(
                        isLoading = false,
                        isSignInSuccessful = true,
                        userData = resolvedUser
                    ) }
                    return@launch
                }

                // Step 1: Ensure a default user profile document exists in Firestore
                firestoreRepository.createDefaultUserProfile(
                    userId = userId,
                    email = email,
                    username = result.data.username,
                    profilePictureUrl = result.data.profilePictureUrl
                )

                // Step 2: Auto-upgrade scan (checks if user is a parent linked to a student)
                val upgradedDoc = firestoreRepository.autoUpgradeParentIfNeeded(userId, email)
                
                // Step 3: Fetch the final document state
                val userDoc = upgradedDoc ?: firestoreRepository.getUserDocument(userId)

                // Step 4: Resolve Role and Routing
                if (userDoc != null) {
                    val isTeacher = checkIsTeacher(userDoc.profileType)
                    if (isTeacher) {
                        if (userDoc.isProfileComplete && userDoc.schoolName.isNotEmpty()) {
                            resolvedUser = result.data.copy(
                                role = UserRole.TEACHER,
                                teacherUid = userId
                            )
                        } else {
                            resolvedUser = result.data.copy(
                                role = UserRole.MEMBER,
                                teacherUid = userId
                            )
                        }
                    } else if (userDoc.profileType.equals("VELİ", ignoreCase = true)) {
                        if (userDoc.isProfileComplete && userDoc.children.isNotEmpty()) {
                            resolvedUser = result.data.copy(
                                role = UserRole.PARENT,
                                teacherUid = userDoc.children.firstOrNull()?.teacherUid ?: userId
                            )
                        } else {
                            resolvedUser = result.data.copy(
                                role = UserRole.MEMBER,
                                teacherUid = userId
                            )
                        }
                    } else {
                        resolvedUser = result.data.copy(
                            role = UserRole.MEMBER,
                            teacherUid = userId
                        )
                    }
                } else {
                    resolvedUser = result.data.copy(
                        role = UserRole.MEMBER,
                        teacherUid = userId
                    )
                }
                
                android.util.Log.d("AuthViewModel", "Final resolved user session: role=${resolvedUser.role}, teacherUid=${resolvedUser.teacherUid}")
                
                _state.update { it.copy(
                    isLoading = false,
                    isSignInSuccessful = true,
                    userData = resolvedUser
                ) }
            }
        } else {
            _state.update { it.copy(
                isSignInSuccessful = false,
                signInError = result.errorMessage,
                isLoading = false
            ) }
        }
    }

    fun refreshUserSession(userId: String, email: String) {
        _state.update { it.copy(isLoading = true) }
        viewModelScope.launch {
            val userDoc = firestoreRepository.getUserDocument(userId)
            if (userDoc != null) {
                val cleanEmailLower = email.trim().lowercase()
                val isEmailAdmin = cleanEmailLower == "cihan.ozel10@gmail.com" || 
                                   cleanEmailLower == "cihanogretmen10@gmail.com"
                
                fun checkIsTeacher(profileType: String): Boolean {
                    val p = profileType.trim()
                    return p.equals("ÖĞRETMEN", ignoreCase = true) || 
                           p.equals("Öğretmen", ignoreCase = true) || 
                           p.equals("OGRETMEN", ignoreCase = true) ||
                           p.equals("TEACHER", ignoreCase = true) ||
                           p.contains("Öğret", ignoreCase = true) ||
                           p.contains("ogret", ignoreCase = true)
                }

                val currentData = _state.value.userData ?: UserData(userId, null, null, email)
                val resolvedUser = when {
                    isEmailAdmin -> {
                        currentData.copy(role = UserRole.ADMIN, teacherUid = "cihan_ozel_web_uid")
                    }
                    checkIsTeacher(userDoc.profileType) -> {
                        if (userDoc.isProfileComplete && userDoc.schoolName.isNotEmpty()) {
                            currentData.copy(role = UserRole.TEACHER, teacherUid = userId)
                        } else {
                            currentData.copy(role = UserRole.MEMBER, teacherUid = userId)
                        }
                    }
                    userDoc.profileType.equals("VELİ", ignoreCase = true) -> {
                        if (userDoc.isProfileComplete && userDoc.children.isNotEmpty()) {
                            currentData.copy(
                                role = UserRole.PARENT,
                                teacherUid = userDoc.children.firstOrNull()?.teacherUid ?: userId
                            )
                        } else {
                            currentData.copy(role = UserRole.MEMBER, teacherUid = userId)
                        }
                    }
                    else -> {
                        currentData.copy(role = UserRole.MEMBER, teacherUid = userId)
                    }
                }
                
                android.util.Log.d("AuthViewModel", "Refreshed user session: role=${resolvedUser.role}, teacherUid=${resolvedUser.teacherUid}")
                _state.update { it.copy(
                    isLoading = false,
                    isSignInSuccessful = true,
                    userData = resolvedUser
                ) }
            } else {
                _state.update { it.copy(isLoading = false) }
            }
        }
    }

    fun resetState() {
        _state.update { AuthState() }
    }

    fun setLoading(isLoading: Boolean) {
        _state.update { it.copy(isLoading = isLoading) }
    }

    fun signInWithEmailDirectly(email: String) {
        val cleanEmail = email.trim().lowercase()
        val isEmailAdmin = cleanEmail == "cihan.ozel10@gmail.com" || 
                           cleanEmail == "cihanogretmen10@gmail.com"
        if (cleanEmail.isEmpty() || !cleanEmail.contains("@")) {
            _state.update { it.copy(signInError = "Lütfen geçerli bir e-posta adresi girin.") }
            return
        }
        
        _state.update { it.copy(isLoading = true, signInError = null) }
        
        viewModelScope.launch {
            try {
                // Ensure Firebase Auth is authenticated anonymously first to satisfy security rules
                try {
                    com.google.firebase.auth.FirebaseAuth.getInstance().signInAnonymously().await()
                } catch (ae: Exception) {
                    android.util.Log.e("AuthViewModel", "Anonymous auth signIn failed: ${ae.message}", ae)
                }

                // Find existing UID from Firestore, or use email as deterministic fallback
                val targetUid = if (isEmailAdmin) {
                    "cihan_ozel_web_uid"
                } else {
                    val existingDoc = firestoreRepository.getUserDocumentByEmail(cleanEmail)
                    existingDoc?.first ?: "cihan_ozel_web_uid"
                }
                
                // Capitalize first letter of email prefix as name
                val prefix = cleanEmail.substringBefore("@")
                val capitalizedName = prefix.replaceFirstChar { if (it.isLowerCase()) it.titlecase() else it.toString() }
                
                val mockUserData = UserData(
                    userId = targetUid,
                    username = capitalizedName,
                    profilePictureUrl = null,
                    email = cleanEmail
                )
                
                onSignInResult(AuthResult(mockUserData, null))
            } catch (e: Exception) {
                _state.update { it.copy(
                    isLoading = false,
                    isSignInSuccessful = false,
                    signInError = "Giriş hatası: ${e.message}"
                ) }
            }
        }
    }
}

data class AuthState(
    val isLoading: Boolean = false,
    val isSignInSuccessful: Boolean = false,
    val signInError: String? = null,
    val userData: UserData? = null
)
