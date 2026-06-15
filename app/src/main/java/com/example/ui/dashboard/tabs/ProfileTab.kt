package com.example.ui.dashboard.tabs

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ExitToApp
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.example.auth.UserData

@Composable
fun ProfileTab(
    userData: UserData,
    onSignOut: () -> Unit,
    paddingValues: PaddingValues
) {
    val isAdmin = userData.email == "cihan.ozel10@gmail.com"

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(paddingValues)
            .padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(
            text = "Profil",
            style = MaterialTheme.typography.titleLarge,
            modifier = Modifier.padding(bottom = 24.dp)
        )
        
        Card(
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(
                modifier = Modifier.padding(16.dp)
            ) {
                Text(text = "Ad Soyad: ${userData.username ?: "-"}", style = MaterialTheme.typography.bodyLarge)
                Spacer(modifier = Modifier.height(8.dp))
                Text(text = "E-posta: ${userData.email ?: "-"}", style = MaterialTheme.typography.bodyLarge)
                
                if (isAdmin) {
                    Spacer(modifier = Modifier.height(16.dp))
                    Surface(
                        color = MaterialTheme.colorScheme.tertiaryContainer,
                        shape = MaterialTheme.shapes.small
                    ) {
                        Text(
                            text = "Yönetici (Admin)",
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                            color = MaterialTheme.colorScheme.onTertiaryContainer
                        )
                    }
                }
            }
        }
        
        Spacer(modifier = Modifier.height(32.dp))
        
        if (isAdmin) {
            Button(
                onClick = { /* TODO Admin Actions */ },
                modifier = Modifier.fillMaxWidth()
            ) {
                Text("Google Drive'dan Veri İçe Aktar (Kazanımlar)")
            }
            Spacer(modifier = Modifier.height(16.dp))
        }

        OutlinedButton(
            onClick = onSignOut,
            modifier = Modifier.fillMaxWidth()
        ) {
            Icon(Icons.AutoMirrored.Filled.ExitToApp, contentDescription = "Çıkış")
            Spacer(Modifier.width(8.dp))
            Text("Çıkış Yap")
        }
    }
}
