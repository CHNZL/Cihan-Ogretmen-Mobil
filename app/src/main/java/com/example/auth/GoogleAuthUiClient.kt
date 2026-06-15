package com.example.auth

import android.content.Context
import android.content.Intent
import android.content.IntentSender
import com.google.android.gms.auth.api.identity.BeginSignInRequest
import com.google.android.gms.auth.api.identity.Identity
import com.google.android.gms.auth.api.identity.SignInClient
import com.google.firebase.Firebase
import com.google.firebase.auth.GoogleAuthProvider
import com.google.firebase.auth.auth
import kotlinx.coroutines.tasks.await
import java.util.concurrent.CancellationException

class GoogleAuthUiClient(
    private val context: Context,
) {
    private val auth = Firebase.auth
    private val oneTapClient: SignInClient = Identity.getSignInClient(context)

    suspend fun signIn(): IntentSender? {
        val result = try {
            kotlinx.coroutines.withTimeoutOrNull(1000) {
                oneTapClient.beginSignIn(
                    buildSignInRequest()
                ).await()
            }
        } catch (e: Exception) {
            e.printStackTrace()
            if (e is CancellationException) throw e
            null
        }
        return result?.pendingIntent?.intentSender
    }

    suspend fun signInWithIntent(intent: Intent): AuthResult {
        val credential = oneTapClient.getSignInCredentialFromIntent(intent)
        val googleIdToken = credential.googleIdToken
        val googleCredentials = GoogleAuthProvider.getCredential(googleIdToken, null)
        
        return try {
            val user = auth.signInWithCredential(googleCredentials).await().user
            AuthResult(
                data = user?.let {
                    UserData(
                        userId = it.uid,
                        username = it.displayName,
                        profilePictureUrl = it.photoUrl?.toString(),
                        email = it.email
                    )
                },
                errorMessage = null
            )
        } catch (e: Exception) {
            e.printStackTrace()
            if (e is CancellationException) throw e
            AuthResult(
                data = null,
                errorMessage = e.message
            )
        }
    }

    suspend fun signOut() {
        try {
            oneTapClient.signOut().await()
            auth.signOut()
        } catch (e: Exception) {
            e.printStackTrace()
            if (e is CancellationException) throw e
        }
    }

    fun getSignedInUser(): UserData? = auth.currentUser?.let {
        if (it.isAnonymous) return@let null
        UserData(
            userId = it.uid,
            username = it.displayName,
            profilePictureUrl = it.photoUrl?.toString(),
            email = it.email
        )
    }

    private fun buildSignInRequest(): BeginSignInRequest {
        return BeginSignInRequest.builder()
            .setGoogleIdTokenRequestOptions(
                BeginSignInRequest.GoogleIdTokenRequestOptions.builder()
                    .setSupported(true)
                    // Server's client ID. This corresponds to the OAuth 2.0 Web Client ID
                    .setServerClientId("761526041284-36narf1nqd2kntl6l3guo5d5sc6gvv2n.apps.googleusercontent.com")
                    .setFilterByAuthorizedAccounts(false)
                    .build()
            )
            .setAutoSelectEnabled(true)
            .build()
    }
}

data class UserData(
    val userId: String,
    val username: String?,
    val profilePictureUrl: String?,
    val email: String?,
    val role: UserRole = UserRole.MEMBER,
    val teacherUid: String = userId // Defaults to their own uid if teacher, but for parent it should be the teacher's uid they are linked to. Or we handle it differently.
)

enum class UserRole {
    ADMIN, TEACHER, PARENT, MEMBER
}

data class AuthResult(
    val data: UserData?,
    val errorMessage: String?
)
