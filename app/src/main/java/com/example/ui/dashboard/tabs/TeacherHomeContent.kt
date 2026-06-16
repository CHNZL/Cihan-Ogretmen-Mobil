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

import java.text.SimpleDateFormat
import java.util.Locale

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
    
    val dateFormatter = SimpleDateFormat("dd MMMM EEEE", Locale("tr", "TR"))
    val dateStr = dateFormatter.format(calendar.time)

    val todayFormatter = SimpleDateFormat("EEEE", Locale("tr", "TR"))
    val currentDayName = todayFormatter.format(calendar.time).replaceFirstChar { if (it.isLowerCase()) it.titlecase(Locale("tr", "TR")) else it.toString() }

    val teacherUid = userData.userId
    val db = remember {
        com.google.firebase.firestore.FirebaseFirestore.getInstance(
            com.google.firebase.FirebaseApp.getInstance(),
            "ai-studio-50d2114a-6844-4ea4-a54d-c3de2ef685ab"
        )
    }

    var scheduleData by remember { mutableStateOf(com.example.ui.dashboard.tabs.ScheduleData()) }
    var subjects by remember { mutableStateOf<List<com.example.ui.dashboard.tabs.Subject>>(emptyList()) }
    var lessonCount by remember { mutableStateOf(6) }

    DisposableEffect(teacherUid) {
        val configRef = db.collection("users").document(teacherUid).collection("config").document("schedule")
        val configListener = configRef.addSnapshotListener { snapshot, error ->
            if (snapshot != null && snapshot.exists()) {
                lessonCount = (snapshot.get("lessonCount") as? Long)?.toInt() ?: 6
            }
        }

        val dataRef = db.collection("users").document(teacherUid).collection("config").document("scheduleData")
        val dataListener = dataRef.addSnapshotListener { snapshot, error ->
            if (snapshot != null && snapshot.exists()) {
                val slotsRaw = snapshot.get("slots") as? Map<*, *>
                val slots = slotsRaw?.entries?.associate { entry ->
                    val value = entry.value
                    val lessonId = if (value is Map<*, *>) {
                        value["lessonId"]?.toString() ?: ""
                    } else {
                        value?.toString() ?: ""
                    }
                    entry.key.toString() to lessonId
                } ?: emptyMap()
                scheduleData = com.example.ui.dashboard.tabs.ScheduleData(slots)
            } else {
                scheduleData = com.example.ui.dashboard.tabs.ScheduleData()
            }
        }

        val subjectsRef = db.collection("users").document(teacherUid).collection("subjects")
        val subjectsListener = subjectsRef.addSnapshotListener { snapshot, error ->
            if (snapshot != null) {
                val subList = snapshot.documents.mapNotNull { doc ->
                    val name = doc.getString("name") ?: ""
                    val color = doc.getString("color") ?: "#3b82f6"
                    com.example.ui.dashboard.tabs.Subject(doc.id, name, color, teacherUid)
                }
                subjects = subList
            }
        }

        onDispose {
            configListener.remove()
            dataListener.remove()
            subjectsListener.remove()
        }
    }

    val sinifYonetimiOptions = listOf(
        "Sınıf Listesi" to Icons.Default.Groups,
        "Ders Programı" to Icons.Default.CalendarToday,
        "Oturma Planı" to Icons.Default.GridOn,
        "Grup Oluşturucu" to Icons.Default.GroupAdd,
        "Yıldızlar Sınıfı" to Icons.Default.AutoAwesome,
        "Şanslı Öğrenci" to Icons.Default.Star,
        "Zamanlayıcı" to Icons.Default.Timer,
        "Duyurular" to Icons.Default.Campaign
    )

    val kitaplikYonetimiOptions = listOf(
        "Yeni Kitap Ekle" to Icons.Default.Add,
        "Kitaplık Listesi" to Icons.Default.LibraryBooks,
        "Okuma Kayıtları" to Icons.Default.History,
        "Okuma Değerlendirme" to Icons.Default.CheckCircle
    )

    val dersYonetimiOptions = listOf(
        "Fen Bilimleri" to Icons.Default.Book,
        "Hayat Bilgisi" to Icons.Default.Book,
        "İngilizce" to Icons.Default.Book,
        "Matematik" to Icons.Default.Book,
        "Türkçe" to Icons.Default.Book,
        "Ders Programı" to Icons.Default.CalendarToday,
        "Zamanlayıcı" to Icons.Default.Timer
    )

    val turnuvaYonetimiOptions = listOf(
        "Yeni Turnuva" to Icons.Default.Add,
        "Turnuvalarım" to Icons.Default.EmojiEvents
    )

    var sinifYonetimiActions by remember { mutableStateOf(listOf(sinifYonetimiOptions[5], sinifYonetimiOptions[4])) }
    var kitaplikYonetimiActions by remember { mutableStateOf(listOf(kitaplikYonetimiOptions[1], kitaplikYonetimiOptions[2])) }
    var dersYonetimiActions by remember { mutableStateOf(listOf(dersYonetimiOptions[5], dersYonetimiOptions[6])) }
    var turnuvaYonetimiActions by remember { mutableStateOf(listOf(turnuvaYonetimiOptions[1], turnuvaYonetimiOptions[0])) }

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
                elevation = CardDefaults.cardElevation(defaultElevation = 6.dp),
                shape = RoundedCornerShape(24.dp)
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(
                            brush = androidx.compose.ui.graphics.Brush.linearGradient(
                                colors = listOf(
                                    Color(0xFF3F51B5),
                                    Color(0xFF5C6BC0),
                                    Color(0xFF7986CB)
                                )
                            )
                        )
                ) {
                    Column(modifier = Modifier.padding(20.dp)) {
                        // Update & Version Info
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(bottom = 12.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text(
                                text = "Sürüm: ${com.example.BuildConfig.VERSION_NAME}",
                                fontSize = 11.sp,
                                color = Color.White.copy(alpha = 0.8f)
                            )
                            
                            if (isLoading) {
                                CircularProgressIndicator(modifier = Modifier.size(16.dp), color = Color.White, strokeWidth = 2.dp)
                            } else {
                                Row(
                                    modifier = Modifier
                                        .clip(RoundedCornerShape(12.dp))
                                        .background(Color.White.copy(alpha = 0.2f))
                                        .clickable {
                                            if (updateAvailable) {
                                                updateViewModel.startDownload(context)
                                            } else {
                                                updateViewModel.checkForUpdates(silentCheckOnStartup = false)
                                            }
                                        }
                                        .padding(horizontal = 12.dp, vertical = 6.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    if (updateAvailable) {
                                        Text(
                                            "Güncelle",
                                            fontSize = 11.sp,
                                            color = Color.White,
                                            fontWeight = FontWeight.Bold,
                                            modifier = Modifier.padding(end = 4.dp)
                                        )
                                        Box {
                                            Icon(
                                                Icons.Default.Refresh,
                                                contentDescription = "Güncelle",
                                                modifier = Modifier.size(18.dp),
                                                tint = Color.White
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
                                            "Güncel",
                                            fontSize = 11.sp,
                                            color = Color.White.copy(alpha = 0.9f),
                                            modifier = Modifier.padding(end = 4.dp)
                                        )
                                        Icon(
                                            Icons.Default.CheckCircle,
                                            contentDescription = "Güncellemeleri Kontrol Et",
                                            modifier = Modifier.size(14.dp),
                                            tint = Color.White.copy(alpha = 0.9f)
                                        )
                                    }
                                }
                            }
                        }

                        Text(
                            text = "$greeting, $userName 👋",
                            style = MaterialTheme.typography.headlineMedium,
                            fontWeight = FontWeight.ExtraBold,
                            color = Color.White
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = "Bugün $dateStr",
                            style = MaterialTheme.typography.bodyMedium,
                            color = Color.White.copy(alpha = 0.8f)
                        )
                        Spacer(modifier = Modifier.height(20.dp))
                        
                        @OptIn(ExperimentalLayoutApi::class)
                        FlowRow(
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            verticalArrangement = Arrangement.spacedBy(8.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            InfoChip(icon = Icons.Default.School, text = "SÜLEYMAN SAMİ KEPENEK İLKOKULU")
                            InfoChip(icon = Icons.Default.Groups, text = "3. Sınıf / D Şubesi")
                        }

                        Spacer(modifier = Modifier.height(24.dp))
                        // Daily Schedule Grid
                        val columnCount = 3
                        val lessons = (1..lessonCount).map { lessonIndex ->
                            val slotKey = com.example.ui.dashboard.tabs.getWebSlotKey(currentDayName, lessonIndex)
                            val subjectId = scheduleData.slots[slotKey]
                            val matchingSubject = subjects.find { it.id == subjectId || it.name == subjectId }
                            val displaySubjectName = matchingSubject?.name ?: subjectId ?: "Boş"
                            "$lessonIndex. Ders" to displaySubjectName
                        }
                        
                        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                            for (rowIndex in 0 until (lessons.size + columnCount - 1) / columnCount) {
                                Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                                    for (colIndex in 0 until columnCount) {
                                        val index = rowIndex * columnCount + colIndex
                                        if (index < lessons.size) {
                                            LessonBox(modifier = Modifier.weight(1f), title = lessons[index].first, lesson = lessons[index].second)
                                        } else {
                                            Spacer(modifier = Modifier.weight(1f))
                                        }
                                    }
                                }
                            }
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
                    onClick = { onRouteSelected("Sınıf Listesi_Erkek") }
                )
                StatCard(
                    modifier = Modifier.weight(1f),
                    icon = Icons.Default.Person,
                    value = "13",
                    label = "KIZ",
                    iconTint = Color(0xFFC51162),
                    onClick = { onRouteSelected("Sınıf Listesi_Kız") } 
                )
                StatCard(
                    modifier = Modifier.weight(1f),
                    icon = Icons.Default.Cake,
                    value = "1",
                    label = "DOĞANLAR",
                    iconTint = Color(0xFFFFAB00),
                    onClick = { onRouteSelected("Sınıf Listesi_Doğum Günü") } 
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
                    MenuCategoryGroup(
                        title = "Sınıf Yönetimi",
                        onTitleClick = { onRouteSelected("Sınıf Yönetimi") },
                        quickActions = sinifYonetimiActions,
                        availableOptions = sinifYonetimiOptions,
                        onQuickActionsChanged = { sinifYonetimiActions = it },
                        onQuickActionClick = { onRouteSelected(it) }
                    )
                    
                    MenuCategoryGroup(
                        title = "Kitaplık Yönetimi",
                        onTitleClick = { onRouteSelected("Kitaplık Yönetimi") },
                        quickActions = kitaplikYonetimiActions,
                        availableOptions = kitaplikYonetimiOptions,
                        onQuickActionsChanged = { kitaplikYonetimiActions = it },
                        onQuickActionClick = { onRouteSelected(it) }
                    )
                }

                // Sütun 2
                Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    MenuCategoryGroup(
                        title = "Ders Yönetimi",
                        onTitleClick = { onRouteSelected("Ders Yönetimi") },
                        quickActions = dersYonetimiActions,
                        availableOptions = dersYonetimiOptions,
                        onQuickActionsChanged = { dersYonetimiActions = it },
                        onQuickActionClick = { onRouteSelected(it) }
                    )

                    MenuCategoryGroup(
                        title = "Turnuva Yönetimi",
                        onTitleClick = { onRouteSelected("Turnuva Yönetimi") },
                        quickActions = turnuvaYonetimiActions,
                        availableOptions = turnuvaYonetimiOptions,
                        onQuickActionsChanged = { turnuvaYonetimiActions = it },
                        onQuickActionClick = { onRouteSelected(it) }
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
        modifier = modifier.clickable { onClick() }.height(100.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 4.dp),
        shape = RoundedCornerShape(20.dp)
    ) {
        Column(
            modifier = Modifier.fillMaxSize().padding(horizontal = 4.dp, vertical = 12.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Box(
                modifier = Modifier
                    .size(36.dp)
                    .clip(CircleShape)
                    .background(iconTint.copy(alpha = 0.15f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(icon, contentDescription = null, tint = iconTint, modifier = Modifier.size(20.dp))
            }
            Spacer(modifier = Modifier.height(6.dp))
            Text(value, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.ExtraBold, color = MaterialTheme.colorScheme.onSurface)
            Spacer(modifier = Modifier.height(2.dp))
            Text(label, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1, fontSize = 9.sp, fontWeight = FontWeight.Bold)
        }
    }
}

@Composable
fun MenuCategoryGroup(
    title: String,
    onTitleClick: () -> Unit,
    quickActions: List<Pair<String, ImageVector>>,
    availableOptions: List<Pair<String, ImageVector>>,
    onQuickActionsChanged: (List<Pair<String, ImageVector>>) -> Unit,
    onQuickActionClick: (String) -> Unit
) {
    var editingIndex by remember { mutableStateOf<Int?>(null) }

    if (editingIndex != null) {
        AlertDialog(
            onDismissRequest = { editingIndex = null },
            title = { Text("Hızlı İşlem Seç") },
            text = {
                LazyColumn(modifier = Modifier.fillMaxWidth()) {
                    items(availableOptions.size) { i ->
                        val option = availableOptions[i]
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable {
                                    val newActions = quickActions.toMutableList()
                                    newActions[editingIndex!!] = option
                                    onQuickActionsChanged(newActions)
                                    editingIndex = null
                                }
                                .padding(16.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(option.second, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                            Spacer(modifier = Modifier.width(16.dp))
                            Text(option.first, style = MaterialTheme.typography.bodyLarge)
                        }
                        if (i < availableOptions.size - 1) {
                            HorizontalDivider()
                        }
                    }
                }
            },
            confirmButton = {
                TextButton(onClick = { editingIndex = null }) {
                    Text("İptal")
                }
            }
        )
    }

    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        // Main Category Card
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .height(64.dp)
                .clickable { onTitleClick() },
            shape = RoundedCornerShape(16.dp),
            elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
        ) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(
                        brush = when (title) {
                            "Sınıf Yönetimi" -> androidx.compose.ui.graphics.Brush.linearGradient(listOf(Color(0xFF667EEA), Color(0xFF764BA2)))
                            "Kitaplık Yönetimi" -> androidx.compose.ui.graphics.Brush.linearGradient(listOf(Color(0xFFFF758C), Color(0xFFFF7EB3)))
                            "Ders Yönetimi" -> androidx.compose.ui.graphics.Brush.linearGradient(listOf(Color(0xFF11998E), Color(0xFF38EF7D)))
                            "Turnuva Yönetimi" -> androidx.compose.ui.graphics.Brush.linearGradient(listOf(Color(0xFFF2994A), Color(0xFFF2C94C)))
                            else -> androidx.compose.ui.graphics.Brush.linearGradient(listOf(Color(0xFF3F51B5), Color(0xFF5C6BC0)))
                        }
                    ),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = title,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.ExtraBold,
                    color = Color.White
                )
            }
        }
        
        // Quick Actions
        quickActions.forEachIndexed { index, action ->
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { onQuickActionClick(action.first) },
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                shape = RoundedCornerShape(16.dp),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 12.dp, vertical = 12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(
                        modifier = Modifier
                            .size(32.dp)
                            .clip(androidx.compose.foundation.shape.CircleShape)
                            .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.1f)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            action.second,
                            contentDescription = null,
                            modifier = Modifier.size(16.dp),
                            tint = MaterialTheme.colorScheme.primary
                        )
                    }
                    Spacer(modifier = Modifier.width(10.dp))
                    Text(
                        text = action.first,
                        style = MaterialTheme.typography.labelLarge,
                        fontWeight = FontWeight.Medium,
                        color = MaterialTheme.colorScheme.onSurface,
                        modifier = Modifier.weight(1f),
                        maxLines = 1
                    )
                    IconButton(
                        onClick = { editingIndex = index },
                        modifier = Modifier.size(24.dp)
                    ) {
                        Icon(
                            Icons.Default.Settings,
                            contentDescription = "Düzenle",
                            modifier = Modifier.size(16.dp),
                            tint = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }
        }
    }
}
