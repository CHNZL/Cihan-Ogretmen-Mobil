package com.example.ui.home

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.example.auth.UserData

@Composable
fun HomeScreen(
    userData: UserData?,
    onSignOut: () -> Unit,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier.fillMaxSize().padding(16.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        if(userData?.profilePictureUrl != null) {
            // Can add AsyncImage from Coil if added dependency
        }
        Text(
            text = "Hoş Geldiniz, ${userData?.username ?: "Kullanıcı"}",
            style = MaterialTheme.typography.headlineMedium
        )
        Text(text = "E-posta: ${userData?.email ?: "-"}")
        
        Button(
            onClick = onSignOut,
            modifier = Modifier.padding(top = 16.dp)
        ) {
            Text(text = "Çıkış Yap")
        }
    }
}
