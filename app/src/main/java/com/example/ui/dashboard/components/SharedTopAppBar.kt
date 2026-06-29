package com.example.ui.dashboard.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Logout
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.SwapHoriz
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.example.auth.UserData
import com.example.auth.UserRole
import com.example.ui.dashboard.Notification

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SharedTopAppBar(
    title: String,
    userData: UserData,
    onBackClick: (() -> Unit)? = null,
    onHomeClick: (() -> Unit)? = null,
    onSignOut: () -> Unit,
    onProfileSettingsClick: () -> Unit,
    notifications: List<Notification>,
    onNotificationsChanged: (List<Notification>) -> Unit
) {
    val unreadCount = notifications.count { !it.isRead }
    var showNotificationMenu by remember { mutableStateOf(false) }
    var selectedNotification by remember { mutableStateOf<Notification?>(null) }
    var showClearAllConfirm by remember { mutableStateOf(false) }
    
    var showProfileMenu by remember { mutableStateOf(false) }

    // Seçili Bildirim Dialogu
    selectedNotification?.let { notif ->
        AlertDialog(
            onDismissRequest = {
                onNotificationsChanged(
                    notifications.map {
                        if (it.id == notif.id) it.copy(isRead = true) else it
                    }
                )
                selectedNotification = null
            },
            title = { Text(notif.title, fontWeight = FontWeight.Bold) },
            text = { Text(notif.message) },
            confirmButton = {
                Button(onClick = {
                    onNotificationsChanged(
                        notifications.map {
                            if (it.id == notif.id) it.copy(isRead = true) else it
                        }
                    )
                    selectedNotification = null
                }) {
                    Text("Kapat")
                }
            },
            dismissButton = {
                TextButton(onClick = {
                    onNotificationsChanged(notifications.filter { it.id != notif.id })
                    selectedNotification = null
                }) {
                    Text("Sil", color = MaterialTheme.colorScheme.error)
                }
            }
        )
    }

    if (showClearAllConfirm) {
        AlertDialog(
            onDismissRequest = { showClearAllConfirm = false },
            title = { Text("Tümünü Sil") },
            text = { Text("Tüm notificationsi silmek istediğinize emin misiniz?") },
            confirmButton = {
                Button(onClick = {
                    onNotificationsChanged(emptyList())
                    showClearAllConfirm = false
                }) {
                    Text("Evet, Sil")
                }
            },
            dismissButton = {
                TextButton(onClick = { showClearAllConfirm = false }) {
                    Text("İptal")
                }
            }
        )
    }

    TopAppBar(
        title = { Text(title) },
        navigationIcon = {
            if (onBackClick != null) {
                IconButton(onClick = onBackClick) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Geri")
                }
            }
        },
        actions = {
            if (onHomeClick != null) {
                IconButton(onClick = onHomeClick) {
                    Icon(Icons.Default.Home, contentDescription = "Anasayfa")
                }
            }
            Box(modifier = Modifier.wrapContentSize(Alignment.TopEnd)) {
                IconButton(onClick = { showNotificationMenu = !showNotificationMenu }) {
                    BadgedBox(
                        badge = {
                            if (unreadCount > 0) {
                                Badge { Text(unreadCount.toString()) }
                            }
                        }
                    ) {
                        Icon(Icons.Default.Notifications, contentDescription = "Bildirimler")
                    }
                }

                DropdownMenu(
                    expanded = showNotificationMenu,
                    onDismissRequest = { showNotificationMenu = false },
                    modifier = Modifier.width(300.dp)
                ) {
                    if (notifications.isNotEmpty()) {
                        DropdownMenuItem(
                            text = { 
                                Text("Tümünü Sil", color = MaterialTheme.colorScheme.error, fontWeight = FontWeight.Bold) 
                            },
                            onClick = {
                                showClearAllConfirm = true
                                showNotificationMenu = false
                            },
                            leadingIcon = { Icon(Icons.Default.Delete, contentDescription = "Sil", tint = MaterialTheme.colorScheme.error) }
                        )
                        HorizontalDivider()
                    }
                    
                    val unreadNotifs = notifications.filter { !it.isRead }
                    if (unreadNotifs.isEmpty()) {
                        DropdownMenuItem(
                            text = { Text("Okunmamış bildirim yok.") },
                            onClick = { }
                        )
                    } else {
                        unreadNotifs.forEach { notif ->
                            DropdownMenuItem(
                                text = { 
                                    Column {
                                        Text(notif.title, fontWeight = FontWeight.Bold, maxLines = 1)
                                        Text(notif.message, style = MaterialTheme.typography.bodySmall, maxLines = 1, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    }
                                },
                                onClick = {
                                    selectedNotification = notif
                                    showNotificationMenu = false
                                }
                            )
                        }
                    }
                }
            }

            Box(modifier = Modifier.wrapContentSize(Alignment.TopEnd)) {
                IconButton(onClick = { showProfileMenu = !showProfileMenu }) {
                    if (userData.profilePictureUrl != null) {
                        AsyncImage(
                            model = userData.profilePictureUrl,
                            contentDescription = "Profil",
                            modifier = Modifier
                                .size(32.dp)
                                .clip(CircleShape)
                        )
                    } else {
                        Box(
                            modifier = Modifier
                                .size(32.dp)
                                .clip(CircleShape)
                                .background(MaterialTheme.colorScheme.primary),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                userData.username?.take(1)?.uppercase() ?: "T",
                                color = MaterialTheme.colorScheme.onPrimary,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                }

                DropdownMenu(
                    expanded = showProfileMenu,
                    onDismissRequest = { showProfileMenu = false }
                ) {
                    DropdownMenuItem(
                        text = { 
                            if (userData.role == UserRole.ADMIN) {
                                Text("Rol Değiştir (Veli)") 
                            } else {
                                Text("Rol Değiştir (Öğretmen)") 
                            }
                        },
                        onClick = {
                            showProfileMenu = false
                        },
                        leadingIcon = { Icon(Icons.Default.SwapHoriz, contentDescription = "Rol Değiştir") }
                    )
                    DropdownMenuItem(
                        text = { Text("Profil Ayarları") },
                        onClick = {
                            showProfileMenu = false
                            onProfileSettingsClick()
                        },
                        leadingIcon = { Icon(Icons.Default.Person, contentDescription = "Profil Settings") }
                    )
                    DropdownMenuItem(
                        text = { Text("Çıkış", color = MaterialTheme.colorScheme.error) },
                        onClick = {
                            showProfileMenu = false
                            onSignOut()
                        },
                        leadingIcon = { Icon(Icons.Default.Logout, contentDescription = "Çıkış", tint = MaterialTheme.colorScheme.error) }
                    )
                }
            }
        }
    )
}
