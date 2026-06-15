package com.example.ui.dashboard

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.MenuBook
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.example.auth.UserData
import com.example.ui.update.UpdateViewModel
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TeacherDashboardScreen(
    userData: UserData,
    onSignOut: () -> Unit,
    modifier: Modifier = Modifier
) {
    val drawerState = rememberDrawerState(initialValue = DrawerValue.Closed)
    val scope = rememberCoroutineScope()
    var selectedRoute by remember { mutableStateOf("Anasayfa") }

    val firestoreRepository = remember { com.example.data.FirestoreRepository() }
    val updateViewModel: UpdateViewModel = viewModel()
    
    val showStartupDialog by updateViewModel.showStartupDialog.collectAsState()
    val updateMessage by updateViewModel.message.collectAsState()
    val context = LocalContext.current

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

    ModalNavigationDrawer(
        drawerState = drawerState,
        drawerContent = {
            ModalDrawerSheet {
                Spacer(Modifier.height(16.dp))
                TeacherDrawerContent(
                    selectedRoute = selectedRoute,
                    onRouteSelected = {
                        selectedRoute = it
                        scope.launch { drawerState.close() }
                    },
                    onSignOut = onSignOut,
                    updateViewModel = updateViewModel
                )
            }
        }
    ) {
        Scaffold(
            topBar = {
                TopAppBar(
                    title = { Text(selectedRoute) },
                    navigationIcon = {
                        IconButton(onClick = { scope.launch { drawerState.open() } }) {
                            Icon(Icons.Default.Menu, contentDescription = "Menüyü Aç")
                        }
                    },
                    actions = {
                        IconButton(onClick = { /* Check Notifications */ }) {
                            Icon(Icons.Default.Notifications, contentDescription = "Bildirimler")
                        }
                        Box(
                            modifier = Modifier
                                .padding(end = 16.dp)
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
                )
            }
        ) { paddingValues ->
            Box(modifier = Modifier.padding(paddingValues)) {
                when (selectedRoute) {
                    "Anasayfa" -> com.example.ui.dashboard.tabs.TeacherHomeContent(
                        userData = userData,
                        onRouteSelected = { route ->
                            selectedRoute = route
                        }
                    )
                    "Sınıf Listesi" -> com.example.ui.dashboard.tabs.StudentsTab(userData, PaddingValues(0.dp))
                    "Ders Programı" -> com.example.ui.dashboard.tabs.ScheduleTab(userData = userData)
                    "Oturma Planı" -> com.example.ui.dashboard.tabs.SeatingPlanTab(userData = userData)
                    "Grup Oluşturucu" -> com.example.ui.dashboard.tabs.GroupCreatorTab(userData = userData)
                    "Yıldızlar Sınıfı" -> com.example.ui.dashboard.tabs.StarsClassTab(userData = userData)
                    "Şanslı Öğrenci" -> com.example.ui.dashboard.tabs.LuckyStudentTab(userData = userData)
                    "Zamanlayıcı" -> com.example.ui.dashboard.tabs.TimerTab(userData = userData)
                    else -> Text("$selectedRoute Yapım Aşamasında...", modifier = Modifier.padding(16.dp))
                }
            }
        }
    }
}

@Composable
fun TeacherDrawerContent(
    selectedRoute: String,
    onRouteSelected: (String) -> Unit,
    onSignOut: () -> Unit,
    updateViewModel: UpdateViewModel
) {
    val updateAvailable by updateViewModel.updateAvailable.collectAsState()
    val isLoading by updateViewModel.isLoading.collectAsState()
    val context = LocalContext.current

    LazyColumn(modifier = Modifier.padding(horizontal = 12.dp)) {
        item {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 20.dp, bottom = 8.dp, start = 12.dp, end = 12.dp),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    androidx.compose.foundation.Image(
                        painter = androidx.compose.ui.res.painterResource(id = com.example.R.drawable.logo),
                        contentDescription = "Logo",
                        modifier = Modifier
                            .size(72.dp)
                            .clip(RoundedCornerShape(16.dp))
                    )
                    Spacer(modifier = Modifier.height(10.dp))
                    Text(
                        text = "Sınıf Yönetimi",
                        fontWeight = FontWeight.Bold,
                        style = MaterialTheme.typography.titleMedium,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    Text(
                        text = "Eğitim Yönetim Portalı",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }

        // --- UPDATE SECTION (Minnak yazılarla sürüm bilgisi ve güncelleştirme butonu) ---
        item {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 4.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    text = "Sürüm: ${com.example.BuildConfig.VERSION_NAME}",
                    fontSize = 11.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                
                if (isLoading) {
                    CircularProgressIndicator(modifier = Modifier.size(16.dp), strokeWidth = 2.dp)
                } else {
                    Row(
                        modifier = Modifier
                            .clip(CircleShape)
                            .clickable {
                                if (updateAvailable) {
                                    updateViewModel.startDownload(context)
                                } else {
                                    updateViewModel.checkForUpdates(silentCheckOnStartup = false)
                                }
                            }
                            .padding(horizontal = 8.dp, vertical = 4.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        if (updateAvailable) {
                            Text(
                                "Güncelle",
                                fontSize = 11.sp,
                                color = MaterialTheme.colorScheme.primary,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(end = 4.dp)
                            )
                            Box {
                                Icon(
                                    Icons.Default.Refresh,
                                    contentDescription = "Güncelle",
                                    modifier = Modifier.size(18.dp),
                                    tint = MaterialTheme.colorScheme.primary
                                )
                                Icon(
                                    Icons.Default.Star,
                                    contentDescription = null,
                                    modifier = Modifier.size(8.dp).align(Alignment.TopEnd),
                                    tint = Color.Yellow
                                )
                            }
                        } else {
                            Text(
                                "Kontrol Et",
                                fontSize = 11.sp,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.padding(end = 4.dp)
                            )
                            Icon(
                                Icons.Default.Refresh,
                                contentDescription = "Güncellemeleri Kontrol Et",
                                modifier = Modifier.size(18.dp),
                                tint = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                }
            }
            Divider(modifier = Modifier.padding(bottom = 8.dp))
        }

        item {
            NavigationDrawerItem(
                icon = { Icon(Icons.Default.Home, contentDescription = null) },
                label = { Text("Anasayfa") },
                selected = selectedRoute == "Anasayfa",
                onClick = { onRouteSelected("Anasayfa") }
            )
            Divider(modifier = Modifier.padding(vertical = 8.dp))
        }

        // Sınıf Yönetimi Bölümü
        item {
            Text(
                "Sınıf Yönetimi",
                modifier = Modifier.padding(start = 16.dp, top = 8.dp, bottom = 4.dp),
                style = MaterialTheme.typography.titleSmall,
                color = MaterialTheme.colorScheme.primary
            )
        }
        val classMenuItems = listOf(
            "Sınıf Listesi" to Icons.Default.Groups,
            "Ders Programı" to Icons.Default.CalendarMonth,
            "Oturma Planı" to Icons.Default.GridOn,
            "Grup Oluşturucu" to Icons.Default.GroupAdd,
            "Yıldızlar Sınıfı" to Icons.Default.Star,
            "Şanslı Öğrenci" to Icons.Default.AutoAwesome,
            "Zamanlayıcı" to Icons.Default.Timer,
            "Duyurular" to Icons.Default.Campaign
        )
        items(classMenuItems.size) { index ->
            val item = classMenuItems[index]
            NavigationDrawerItem(
                icon = { Icon(item.second, contentDescription = null) },
                label = { Text(item.first) },
                selected = selectedRoute == item.first,
                onClick = { onRouteSelected(item.first) }
            )
        }

        // Ders Yönetimi Bölümü
        item {
            Divider(modifier = Modifier.padding(vertical = 8.dp))
            Text(
                "Ders Yönetimi",
                modifier = Modifier.padding(start = 16.dp, top = 8.dp, bottom = 4.dp),
                style = MaterialTheme.typography.titleSmall,
                color = MaterialTheme.colorScheme.primary
            )
        }
        val lessonMenuItems = listOf(
            "Fen Bilimleri", "Hayat Bilgisi", "İngilizce", "Matematik", "Türkçe"
        )
        items(lessonMenuItems.size) { index ->
            val item = lessonMenuItems[index]
            NavigationDrawerItem(
                icon = { Icon(Icons.AutoMirrored.Filled.MenuBook, contentDescription = null) },
                label = { Text(item) },
                selected = selectedRoute == item,
                onClick = { onRouteSelected(item) }
            )
        }

        // Kitaplık Yönetimi Bölümü
        item {
            Divider(modifier = Modifier.padding(vertical = 8.dp))
            Text(
                "Kitaplık Yönetimi",
                modifier = Modifier.padding(start = 16.dp, top = 8.dp, bottom = 4.dp),
                style = MaterialTheme.typography.titleSmall,
                color = MaterialTheme.colorScheme.primary
            )
        }
        val libraryMenuItems = listOf(
            "Yeni Kitap Ekle" to Icons.Default.Add,
            "Kitaplık Listesi" to Icons.Default.LibraryBooks,
            "Okuma Kayıtları" to Icons.Default.History,
            "Okuma Değerlendirme" to Icons.Default.CheckCircle
        )
        items(libraryMenuItems.size) { index ->
            val item = libraryMenuItems[index]
            NavigationDrawerItem(
                icon = { Icon(item.second, contentDescription = null) },
                label = { Text(item.first) },
                selected = selectedRoute == item.first,
                onClick = { onRouteSelected(item.first) }
            )
        }

        // Turnuva Yönetimi
        item {
            Divider(modifier = Modifier.padding(vertical = 8.dp))
            Text(
                "Turnuva Yönetimi",
                modifier = Modifier.padding(start = 16.dp, top = 8.dp, bottom = 4.dp),
                style = MaterialTheme.typography.titleSmall,
                color = MaterialTheme.colorScheme.primary
            )
        }
        val tournamentMenuItems = listOf(
            "Yeni Turnuva Oluştur" to Icons.Default.EmojiEvents,
            "Turnuvalarım" to Icons.Default.EmojiEvents
        )
        items(tournamentMenuItems.size) { index ->
            val item = tournamentMenuItems[index]
            NavigationDrawerItem(
                icon = { Icon(item.second, contentDescription = null) },
                label = { Text(item.first) },
                selected = selectedRoute == item.first,
                onClick = { onRouteSelected(item.first) }
            )
        }
        
        // Profil İşlemleri
        item {
            Divider(modifier = Modifier.padding(vertical = 8.dp))
            Text(
                "Profil",
                modifier = Modifier.padding(start = 16.dp, top = 8.dp, bottom = 4.dp),
                style = MaterialTheme.typography.titleSmall,
                color = MaterialTheme.colorScheme.primary
            )
            NavigationDrawerItem(
                icon = { Icon(Icons.Default.Logout, contentDescription = null) },
                label = { Text("Çıkış Yap") },
                selected = false,
                onClick = onSignOut
            )
            Spacer(modifier = Modifier.height(32.dp))
        }
    }
}
