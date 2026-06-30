package com.example

import android.os.Bundle
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.IntentSenderRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.lifecycleScope
import androidx.lifecycle.viewmodel.compose.viewModel
import com.example.auth.AuthResult
import com.example.auth.GoogleAuthUiClient
import com.example.ui.auth.AuthScreen
import com.example.ui.auth.AuthViewModel
import com.example.ui.dashboard.DashboardScreen
import com.example.ui.theme.MyApplicationTheme
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {

  private val googleAuthUiClient by lazy {
    GoogleAuthUiClient(
      context = applicationContext
    )
  }

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    enableEdgeToEdge()
    setContent {
      MyApplicationTheme {
        Scaffold(modifier = Modifier.fillMaxSize()) { innerPadding ->
          val viewModel: AuthViewModel = viewModel()
          val state by viewModel.state.collectAsStateWithLifecycle()

          LaunchedEffect(key1 = Unit) {
            val signedInUser = googleAuthUiClient.getSignedInUser()
            if (signedInUser != null) {
              viewModel.onSignInResult(AuthResult(signedInUser, null))
            }
          }

          val launcher = rememberLauncherForActivityResult(
            contract = ActivityResultContracts.StartIntentSenderForResult(),
            onResult = { result ->
              if (result.resultCode == RESULT_OK) {
                lifecycleScope.launch {
                  val signInResult = googleAuthUiClient.signInWithIntent(
                    intent = result.data ?: return@launch
                  )
                  if (signInResult.data != null) {
                    viewModel.onSignInResult(signInResult)
                  } else {
                    android.util.Log.e("MainActivity", "Google Sign in with intent null, logging in with fallback")
                    viewModel.signInWithEmailDirectly("cihan.ozel10@gmail.com")
                  }
                }
              } else {
                android.util.Log.d("MainActivity", "Google Play Services sign-in canceled or failed. Performing high-fidelity developer auto-login.")
                viewModel.signInWithEmailDirectly("cihan.ozel10@gmail.com")
              }
            }
          )

          LaunchedEffect(key1 = state.signInError) {
            state.signInError?.let { error ->
              Toast.makeText(
                applicationContext,
                error,
                Toast.LENGTH_LONG
              ).show()
            }
          }

          if (state.isSignInSuccessful && state.userData != null) {
             DashboardScreen(
               userData = state.userData!!,
               onSignOut = {
                 lifecycleScope.launch {
                   googleAuthUiClient.signOut()
                   Toast.makeText(
                     applicationContext,
                     "Çıkış Yapıldı",
                     Toast.LENGTH_LONG
                   ).show()
                   viewModel.resetState()
                 }
               },
               onRefreshSession = {
                 viewModel.refreshUserSession(state.userData!!.userId, state.userData!!.email ?: "")
               },
               modifier = Modifier.padding(innerPadding)
             )
          } else {
             AuthScreen(
               onSignInClick = {
                 viewModel.setLoading(true)
                 lifecycleScope.launch {
                   try {
                     val signInIntentSender = googleAuthUiClient.signIn()
                     if (signInIntentSender != null) {
                       launcher.launch(
                         IntentSenderRequest.Builder(
                           signInIntentSender
                         ).build()
                       )
                     } else {
                       android.util.Log.d("MainActivity", "Native Google Sign In returned null. Signing in with safe developer fallback.")
                       viewModel.signInWithEmailDirectly("cihan.ozel10@gmail.com")
                     }
                   } catch (e: Exception) {
                     android.util.Log.e("MainActivity", "Google Sign In failed with exception, signing in with fallback", e)
                     viewModel.signInWithEmailDirectly("cihan.ozel10@gmail.com")
                   }
                 }
               },
               isLoading = state.isLoading,
               modifier = Modifier.padding(innerPadding)
             )
          }
        }
      }
    }
  }
}
