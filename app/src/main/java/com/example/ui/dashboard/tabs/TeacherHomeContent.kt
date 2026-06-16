package com.example.ui.dashboard.tabs

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
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
import com.example.auth.UserData
import com.example.ui.update.UpdateViewModel
import java.util.Calendar

@Composable
fun TeacherHomeContent(
    userData: UserData,
    updateViewModel: UpdateViewModel,
    onRouteSelected: (String) -> Unit
) {
    val updateAvailable by updateViewModel.updateAvailable.collectAsState()
    val isLoading by updateViewModel.isLoading.collectAsState()
    val context = LocalContext.current

    val calendar = Calendar.getInstance()
    val hourOfDay = calendar.get(Calendar.HOUR_OF_DAY)
    val greeting = when (hourOfDay) {
        in 5..11 -> "Günaydın"
        in 12..17 -> "İyi Günler"
        in 18..22 -> "İyi Akşamlar"
        else -> "İyi Geceler"
    }
    
    val userName = userData.username?.split(" ")?.firstOrNull() ?: "Öğretmen"
    val dateStr = "10 Haziran Çarşamba" // Mocked date for demo

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Welcome Card
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
                shape = RoundedCornerShape(16.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    // Update & Version Info
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(bottom = 8.dp),
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
                                    .padding(horizontal = 8.dp, vertical = 2.dp),
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

                    Text(
                        text = "$greeting, $userName",
                        style = MaterialTheme.typography.headlineMedium,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    Text(
                        text = "Bugün $dateStr",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                    @OptIn(ExperimentalLayoutApi::class)
                    FlowRow(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        InfoChip(icon = Icons.Default.School, text = "SÜLEYMAN SAMİ KEPENEK İLKOKULU")
                        InfoChip(icon = Icons.Default.Groups, text = "3. Sınıf / D Şubesi")
                    }

                    Spacer(modifier = Modifier.height(16.dp))
                    // Daily Schedule Grid (2 rows x 3 columns)
                    val lessons = listOf(
                        "1. Ders" to "Hayat Bilgisi",
                        "2. Ders" to "Hayat Bilgisi",
                        "3. Ders" to "Matematik",
                        "4. Ders" to "Türkçe",
                        "5. Ders" to "Türkçe",
                        "6. Ders" to "S. Etkinlik"
                    )
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                            LessonBox(modifier = Modifier.weight(1f), title = lessons[0].first, lesson = lessons[0].second)
                            LessonBox(modifier = Modifier.weight(1f), title = lessons[1].first, lesson = lessons[1].second)
                            LessonBox(modifier = Modifier.weight(1f), title = lessons[2].first, lesson = lessons[2].second)
                        }
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                            LessonBox(modifier = Modifier.weight(1f), title = lessons[3].first, lesson = lessons[3].second)
                            LessonBox(modifier = Modifier.weight(1f), title = lessons[4].first, lesson = lessons[4].second)
                            LessonBox(modifier = Modifier.weight(1f), title = lessons[5].first, lesson = lessons[5].second)
                        }
                    }
                }
            }
        }

        // Stats Row
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                StatCard(
                    modifier = Modifier.weight(1f),
                    icon = Icons.Default.Groups,
                    value = "25",
                    label = "TOPLAM",
                    iconTint = Color(0xFF00BFA5),
                    onClick = { onRouteSelected("Sınıf Listesi") }
                )
                StatCard(
                    modifier = Modifier.weight(1f),
                    icon = Icons.Default.Person,
                    value = "12",
                    label = "ERKEK",
                    iconTint = Color(0xFF2962FF),
                    onClick = { onRouteSelected("Sınıf Listesi") }
                )
                StatCard(
                    modifier = Modifier.weight(1f),
                    icon = Icons.Default.Person,
                    value = "13",
                    label = "KIZ",
                    iconTint = Color(0xFFC51162),
                    onClick = { onRouteSelected("Sınıf Listesi") } 
                )
                StatCard(
                    modifier = Modifier.weight(1f),
                    icon = Icons.Default.Cake,
                    value = "1",
                    label = "DO. GÜNÜ",
                    iconTint = Color(0xFFFFAB00),
                    onClick = { onRouteSelected("Sınıf Listesi") } 
                )
            }
        }

        // 2-Column Menu Layout
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                // Sütun 1
                Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    MenuCategoryCard(
                        title = "Sınıf Yönetimi",
                        onClick = { onRouteSelected("Sınıf Yönetimi") },
                        quickActions = listOf(
                            "Şanslı Öğrenci" to Icons.Default.Star,
                            "Yıldızlar Sınıfı" to Icons.Default.AutoAwesome
                        ),
                        onQuickActionClick = { actionTitle -> onRouteSelected(actionTitle) }
                    )
                    
                    MenuCategoryCard(
                        title = "Kitaplık Yönetimi",
                        onClick = { onRouteSelected("Kitaplık Yönetimi") },
                        quickActions = listOf(
                            "Kitaplık Listesi" to Icons.Default.LibraryBooks,
                            "Okuma Kayıtları" to Icons.Default.History
                        ),
                        onQuickActionClick = { actionTitle -> onRouteSelected(actionTitle) }
                    )
                }

                // Sütun 2
                Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    MenuCategoryCard(
                        title = "Ders Yönetimi",
                        onClick = { onRouteSelected("Ders Yönetimi") },
                        quickActions = listOf(
                            "Ders Programı" to Icons.Default.CalendarToday,
                            "Zamanlayıcı" to Icons.Default.Timer
                        ),
                        onQuickActionClick = { actionTitle -> onRouteSelected(actionTitle) }
                    )

                    MenuCategoryCard(
                        title = "Turnuva Yönetimi",
                        onClick = { onRouteSelected("Turnuva Yönetimi") },
                        quickActions = listOf(
                            "Turnuvalarım" to Icons.Default.EmojiEvents,
                            "Yeni Turnuva" to Icons.Default.Add
                        ),
                        onQuickActionClick = { actionTitle -> onRouteSelected(actionTitle) }
                    )
                }
            }
        }
        
        item {
            Spacer(modifier = Modifier.height(32.dp))
        }
    }
}

@Composable
fun LessonBox(modifier: Modifier = Modifier, title: String, lesson: String) {
    Column(
        modifier = modifier
            .clip(RoundedCornerShape(8.dp))
            .background(MaterialTheme.colorScheme.surface)
            .padding(8.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(
            text = title, 
            style = MaterialTheme.typography.labelSmall, 
            color = MaterialTheme.colorScheme.primary,
            fontWeight = FontWeight.Bold
        )
        Spacer(modifier = Modifier.height(4.dp))
        Text(
            text = lesson, 
            style = MaterialTheme.typography.bodySmall, 
            color = MaterialTheme.colorScheme.onSurface,
            maxLines = 1,
            fontWeight = FontWeight.Medium
        )
    }
}

@Composable
fun InfoChip(icon: ImageVector, text: String) {
    Row(
        modifier = Modifier
            .clip(RoundedCornerShape(16.dp))
            .background(MaterialTheme.colorScheme.surface)
            .padding(horizontal = 12.dp, vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(icon, contentDescription = null, modifier = Modifier.size(16.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
        Spacer(modifier = Modifier.width(6.dp))
        Text(
            text = text,
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            fontWeight = FontWeight.Bold
        )
    }
}

@Composable
fun StatCard(
    modifier: Modifier = Modifier,
    icon: ImageVector,
    value: String,
    label: String,
    iconTint: Color,
    onClick: () -> Unit
) {
    Card(
        modifier = modifier.clickable { onClick() }.height(90.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(
            modifier = Modifier.fillMaxSize().padding(horizontal = 2.dp, vertical = 8.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Icon(icon, contentDescription = null, tint = iconTint, modifier = Modifier.size(20.dp))
            Spacer(modifier = Modifier.height(4.dp))
            Text(value, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface)
            Spacer(modifier = Modifier.height(2.dp))
            Text(label, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1, fontSize = 9.sp)
        }
    }
}

@Composable
fun MenuCategoryCard(
    title: String,
    onClick: () -> Unit,
    quickActions: List<Pair<String, ImageVector>>,
    onQuickActionClick: (String) -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() },
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Text(
                text = title,
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.primary,
                modifier = Modifier.padding(bottom = 8.dp)
            )
            
            // Alt Menüler / Hızlı İşlemler
            quickActions.forEachIndexed { index, action ->
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(8.dp))
                        .background(MaterialTheme.colorScheme.surface)
                        .clickable { onQuickActionClick(action.first) }
                        .padding(8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        action.second, 
                        contentDescription = null, 
                        modifier = Modifier.size(16.dp), 
                        tint = MaterialTheme.colorScheme.primary
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = action.first,
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.onSurface,
                        maxLines = 1
                    )
                }
                if (index < quickActions.size - 1) {
                    Spacer(modifier = Modifier.height(6.dp))
                }
            }
        }
    }
}
