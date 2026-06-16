package com.example.ui.dashboard

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import coil.compose.AsyncImage
import com.example.auth.UserData
import com.example.ui.dashboard.components.SharedTopAppBar
import com.example.ui.update.UpdateViewModel
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TeacherDashboardScreen(
    userData: UserData,
    onSignOut: () -> Unit,
    modifier: Modifier = Modifier
) {
    var routeStack by remember { mutableStateOf(listOf("Anasayfa")) }
    val selectedRoute = routeStack.last()

    val onNavigate = { newRoute: String ->
        if (newRoute == "Anasayfa") {
            routeStack = listOf("Anasayfa")
        } else {
            routeStack = routeStack + newRoute
        }
    }

    val goBack = {
        if (routeStack.size > 1) {
            routeStack = routeStack.dropLast(1)
        }
    }

    if (routeStack.size > 1) {
        androidx.activity.compose.BackHandler {
            goBack()
        }
    }

    val firestoreRepository = remember { com.example.data.FirestoreRepository() }
    val updateViewModel: UpdateViewModel = viewModel()
    
    val showStartupDialog by updateViewModel.showStartupDialog.collectAsState()
    val updateMessage by updateViewModel.message.collectAsState()
    val context = LocalContext.current

    // Notification State
    var notifications by remember {
        mutableStateOf(
            listOf(
                Notification("1", "Sistem Güncellemesi", "Uygulamanın yeni sürümü yayında."),
                Notification("2", "Yeni Öğrenci Eklendi", "Ahmet Yılmaz sınıf listesine eklendi."),
                Notification("3", "Mesaj", "Veliden gelen yeni bir mesaj var.")
            )
        )
    }

    // Sync selected route with web remote control state
    LaunchedEffect(selectedRoute) {
        val webTab = when (selectedRoute) {
            "Anasayfa" -> "home"
            "Sınıf Listesi" -> "class-list"
            "Ders Programı" -> "lesson-schedule"
            "Oturma Planı" -> "seating-plan"
            "Grup Oluşturucu" -> "group-creator"
            "Yıldızlar Sınıfı" -> "stars-badges"
            "Şanslı Öğrenci" -> "lucky-student"
            "Zamanlayıcı" -> "timer"
            else -> null
        }
        if (webTab != null && userData.userId.isNotEmpty()) {
            firestoreRepository.updateRemoteControlState(
                teacherUid = userData.userId,
                activeTab = webTab
            )
        }
    }

    if (showStartupDialog) {
        AlertDialog(
            onDismissRequest = { updateViewModel.dismissStartupDialog() },
            title = { Text("Yeni Sürüm Mevcut!") },
            text = { Text("Uygulamanın yeni bir sürümü yayınlandı. Şimdi güncellemek ister misiniz?") },
            confirmButton = {
                Button(onClick = { updateViewModel.startDownload(context) }) {
                    Text("Evet, Güncelle")
                }
            },
            dismissButton = {
                TextButton(onClick = { updateViewModel.dismissStartupDialog() }) {
                    Text("Daha Sonra")
                }
            }
        )
    }

    if (updateMessage != null) {
        AlertDialog(
            onDismissRequest = { updateViewModel.clearMessage() },
            title = { Text("Güncelleme Durumu") },
            text = { Text(updateMessage ?: "") },
            confirmButton = {
                Button(onClick = { updateViewModel.clearMessage() }) {
                    Text("Tamam")
                }
            }
        )
    }

    Scaffold(
        topBar = {
            SharedTopAppBar(
                title = selectedRoute.substringBefore("_"),
                userData = userData,
                onBackClick = if (routeStack.size > 1) { { goBack() } } else null,
                onHomeClick = if (routeStack.size > 1) { { onNavigate("Anasayfa") } } else null,
                onSignOut = onSignOut,
                onProfileSettingsClick = { onNavigate("Profil Ayarları") },
                notifications = notifications,
                onNotificationsChanged = { notifications = it }
            )
        }
    ) { paddingValues ->
        Box(modifier = Modifier.padding(paddingValues)) {
            when {
                selectedRoute == "Anasayfa" -> com.example.ui.dashboard.tabs.TeacherHomeContent(
                    userData = userData,
                    updateViewModel = updateViewModel,
                    onRouteSelected = { route ->
                        onNavigate(route)
                    }
                )
                selectedRoute.startsWith("Sınıf Listesi") -> {
                    val filter = selectedRoute.substringAfter("_", "Tümü")
                    com.example.ui.dashboard.tabs.StudentsTab(userData, PaddingValues(0.dp), filter)
                }
                selectedRoute == "Ders Programı" -> com.example.ui.dashboard.tabs.ScheduleTab(userData = userData)
                selectedRoute == "Oturma Planı" -> com.example.ui.dashboard.tabs.SeatingPlanTab(userData = userData)
                selectedRoute == "Grup Oluşturucu" -> com.example.ui.dashboard.tabs.GroupCreatorTab(userData = userData)
                selectedRoute == "Yıldızlar Sınıfı" -> com.example.ui.dashboard.tabs.StarsClassTab(userData = userData)
                selectedRoute == "Şanslı Öğrenci" -> com.example.ui.dashboard.tabs.LuckyStudentTab(userData = userData)
                selectedRoute == "Zamanlayıcı" -> com.example.ui.dashboard.tabs.TimerTab(userData = userData)
                selectedRoute == "Profil Ayarları" -> {
                    com.example.ui.dashboard.tabs.ProfileSettingsTab(
                        userData = userData,
                        onBack = { goBack() }
                    )
                }
                selectedRoute in listOf("Sınıf Yönetimi", "Kitaplık Yönetimi", "Ders Yönetimi", "Turnuva Yönetimi") -> {
                    com.example.ui.dashboard.tabs.MenuCategoryTab(
                        categoryTitle = selectedRoute,
                        onBack = { goBack() },
                        onRouteSelected = { route -> onNavigate(route) }
                    )
                }
                else -> {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Text(
                            text = "${selectedRoute.substringBefore("_")} Sayfası\nYapım Aşamasındadır",
                            style = MaterialTheme.typography.titleLarge,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            textAlign = androidx.compose.ui.text.style.TextAlign.Center
                        )
                    }
                }
            }
        }
    }
}
