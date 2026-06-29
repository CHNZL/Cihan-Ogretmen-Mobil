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

                android.util.Log.d("AuthViewModel", "onSignInResult for email: $email, userId: ${result.data.userId}")

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

                // Query Firestore by email first to get the correct teacherUid (document ID)
                val userDocByEmail = if (email.isNotEmpty()) {
                    firestoreRepository.getUserDocumentByEmail(email)
                } else null
                
                if (userDocByEmail != null) {
                    val (webUid, userDoc) = userDocByEmail
                    val isTeacher = checkIsTeacher(userDoc.profileType)
                    
                    android.util.Log.d("AuthViewModel", "Resolved via email query: $webUid. ProfileType: ${userDoc.profileType}. IsTeacher: $isTeacher")
                    
                    if (isTeacher) {
                        resolvedUser = result.data.copy(
                            role = UserRole.TEACHER,
                            teacherUid = webUid
                        )
                    } else {
                        // Check if parent
                        val linkedStudents = firestoreRepository.getLinkedStudentsForParent(email)
                        if (linkedStudents.isNotEmpty()) {
                            android.util.Log.d("AuthViewModel", "User is a parent linked to teacher: ${linkedStudents.first().first}")
                            resolvedUser = result.data.copy(
                                role = UserRole.PARENT,
                                teacherUid = linkedStudents.first().first
                            )
                        } else {
                            android.util.Log.d("AuthViewModel", "User is default MEMBER (no linked students)")
                            resolvedUser = result.data.copy(role = UserRole.MEMBER)
                        }
                    }
                } else {
                    android.util.Log.w("AuthViewModel", "No user doc found by email. Falling back to UID direct lookup/default checks...")
                    // Fallback to direct check by auth userId
                    val userDocByUid = firestoreRepository.getUserDocument(result.data.userId)
                    
                    val isTeacher = userDocByUid?.profileType?.let { checkIsTeacher(it) } ?: false
                    
                    android.util.Log.d("AuthViewModel", "UID direct lookup result: isTeacher: $isTeacher")

                    if (isTeacher) {
                        resolvedUser = result.data.copy(
                            role = UserRole.TEACHER,
                            teacherUid = result.data.userId
                        )
                    } else {
                        // Check if parent
                        val linkedStudents = firestoreRepository.getLinkedStudentsForParent(email)
                        if (linkedStudents.isNotEmpty()) {
                            android.util.Log.d("AuthViewModel", "User is a parent linked to teacher: ${linkedStudents.first().first}")
                            resolvedUser = result.data.copy(
                                role = UserRole.PARENT,
                                teacherUid = linkedStudents.first().first
                            )
                        } else {
                            android.util.Log.d("AuthViewModel", "User is default MEMBER (no linked students)")
                            resolvedUser = result.data.copy(role = UserRole.MEMBER)
                        }
                    }
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
