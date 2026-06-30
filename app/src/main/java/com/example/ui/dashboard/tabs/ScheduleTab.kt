package com.example.ui.dashboard.tabs

import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.example.auth.UserData
import com.google.firebase.FirebaseApp
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore
import kotlinx.coroutines.tasks.await
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ScheduleTab(
    userData: UserData,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val teacherUid = userData.teacherUid.takeIf { it.isNotBlank() } ?: userData.userId

    val db = remember {
        FirebaseFirestore.getInstance(
            FirebaseApp.getInstance(),
            "ai-studio-50d2114a-6844-4ea4-a54d-c3de2ef685ab"
        )
    }

    // State bindings
    var currentUserUid by remember { mutableStateOf(com.google.firebase.auth.FirebaseAuth.getInstance().currentUser?.uid) }
    
    androidx.compose.runtime.LaunchedEffect(Unit) {
        com.google.firebase.auth.FirebaseAuth.getInstance().addAuthStateListener { auth ->
            currentUserUid = auth.currentUser?.uid
        }
    }
    
    var teacherScheduleConfig by remember { mutableStateOf<ScheduleConfig?>(null) }
    var localScheduleConfig by remember { mutableStateOf<ScheduleConfig?>(null) }
    
    var teacherScheduleData by remember { mutableStateOf(ScheduleData()) }
    var localScheduleData by remember { mutableStateOf<ScheduleData?>(null) }
    
    var teacherSubjects by remember { mutableStateOf(emptyList<Subject>()) }
    var localSubjects by remember { mutableStateOf(emptyList<Subject>()) }

    val scheduleConfig = localScheduleConfig ?: teacherScheduleConfig
    val scheduleData = localScheduleData ?: teacherScheduleData
    val subjects = (teacherSubjects + localSubjects).distinctBy { it.name.trim().lowercase() }

    var isLoading by remember { mutableStateOf(true) }

    // Dialog state
    var isSettingsOpen by remember { mutableStateOf(false) }
    var isSubjectSelectOpen by remember { mutableStateOf(false) }
    var isSubjectEditOpen by remember { mutableStateOf(false) }
    var selectedSlotDay by remember { mutableStateOf("") }
    var selectedSlotLessonNumber by remember { mutableStateOf(0) }

    // Subject Form
    var editingSubject by remember { mutableStateOf<Subject?>(null) }
    var subjectNameInput by remember { mutableStateOf("") }
    var subjectColorInput by remember { mutableStateOf("#3b82f6") }

    var isZoomedIn by remember { mutableStateOf(false) }

    val pdfExportLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.CreateDocument("application/pdf")
    ) { uri ->
        if (uri != null) {
            scheduleConfig?.let { config ->
                exportScheduleToPdf(context, uri, config, scheduleData, subjects)
                Toast.makeText(context, "PDF kaydedildi.", Toast.LENGTH_SHORT).show()
            }
        }
    }

    // 10 Standard subjects to populate
    val defaultSubjects = remember {
        listOf(
            Subject("", "Matematik", "#3b82f6", teacherUid),
            Subject("", "Türkçe", "#ef4444", teacherUid),
            Subject("", "Hayat Bilgisi", "#10b981", teacherUid),
            Subject("", "Fen Bilimleri", "#f59e0b", teacherUid),
            Subject("", "Sosyal Bilgiler", "#8b5cf6", teacherUid),
            Subject("", "İngilizce", "#ec4899", teacherUid),
            Subject("", "Görsel Sanatlar", "#f97316", teacherUid),
            Subject("", "Müzik", "#06b6d4", teacherUid),
            Subject("", "Beden Eğitimi", "#6366f1", teacherUid),
            Subject("", "Serbest Etkinlikler", "#64748b", teacherUid)
        )
    }

    // Load Data using Snapshots
    val authUid = currentUserUid
    DisposableEffect(teacherUid, authUid) {
        val configRef = db.collection("users").document(teacherUid).collection("config").document("schedule")
        val configListener = configRef.addSnapshotListener { snapshot, error ->
            isLoading = false
            if (snapshot != null && snapshot.exists()) {
                try {
                    val daysRaw = snapshot.get("gunler") as? List<*> ?: snapshot.get("days") as? List<*>
                    val days = daysRaw?.map { it.toString() } ?: listOf("Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma")
                    val lessonCount = (snapshot.get("dersSayisi") as? Long ?: snapshot.get("ders_sayisi") as? Long ?: snapshot.get("lessonCount") as? Long)?.toInt() ?: 6
                    val startTime = snapshot.getString("baslangicSaati") ?: snapshot.getString("baslangic_saati") ?: snapshot.getString("startTime") ?: "08:30"
                    val lessonDuration = (snapshot.get("dersSuresi") as? Long ?: snapshot.get("ders_suresi") as? Long ?: snapshot.get("lessonDuration") as? Long)?.toInt() ?: 40
                    val recessDuration = (snapshot.get("teneffusSuresi") as? Long ?: snapshot.get("teneffus_suresi") as? Long ?: snapshot.get("recessDuration") as? Long)?.toInt() ?: 15
                    val lunchBreakDuration = (snapshot.get("ogleArasiSuresi") as? Long ?: snapshot.get("ogle_arasi_suresi") as? Long ?: snapshot.get("lunchBreakDuration") as? Long)?.toInt() ?: 60
                    val lunchBreakAfterLesson = (snapshot.get("ogleArasiKacinciDersten") as? Long ?: snapshot.get("ogle_arasi_kacinci_dersten") as? Long ?: snapshot.get("lunchBreakAfterLesson") as? Long)?.toInt() ?: 4

                    val customRecessRaw = snapshot.get("ozelTeneffusSureleri") as? Map<*, *> ?: snapshot.get("ozel_teneffus_sureleri") as? Map<*, *> ?: snapshot.get("customRecessDurations") as? Map<*, *>
                    val customRecessDurations = customRecessRaw?.entries?.associate { entry ->
                        entry.key.toString() to (entry.value as? Long)?.toInt()!!
                    } ?: emptyMap()

                    teacherScheduleConfig = ScheduleConfig(
                        days = days,
                        lessonCount = lessonCount,
                        startTime = startTime,
                        lessonDuration = lessonDuration,
                        recessDuration = recessDuration,
                        lunchBreakDuration = lunchBreakDuration,
                        lunchBreakAfterLesson = lunchBreakAfterLesson,
                        customRecessDurations = customRecessDurations
                    )
                } catch (e: Exception) {
                    android.util.Log.e("ScheduleTab", "Error parsing schedule config", e)
                }
            } else {
                teacherScheduleConfig = null
            }
        }

        val overrideConfigListener = if (authUid != null && authUid != teacherUid) {
            val overrideRef = db.collection("users").document(authUid).collection("config").document("schedule")
            overrideRef.addSnapshotListener { snapshot, error ->
                if (snapshot != null && snapshot.exists()) {
                    try {
                        val daysRaw = snapshot.get("gunler") as? List<*> ?: snapshot.get("days") as? List<*>
                        val days = daysRaw?.map { it.toString() } ?: listOf("Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma")
                        val lessonCount = (snapshot.get("dersSayisi") as? Long ?: snapshot.get("ders_sayisi") as? Long ?: snapshot.get("lessonCount") as? Long)?.toInt() ?: 6
                        val startTime = snapshot.getString("baslangicSaati") ?: snapshot.getString("baslangic_saati") ?: snapshot.getString("startTime") ?: "08:30"
                        val lessonDuration = (snapshot.get("dersSuresi") as? Long ?: snapshot.get("ders_suresi") as? Long ?: snapshot.get("lessonDuration") as? Long)?.toInt() ?: 40
                        val recessDuration = (snapshot.get("teneffusSuresi") as? Long ?: snapshot.get("teneffus_suresi") as? Long ?: snapshot.get("recessDuration") as? Long)?.toInt() ?: 15
                        val lunchBreakDuration = (snapshot.get("ogleArasiSuresi") as? Long ?: snapshot.get("ogle_arasi_suresi") as? Long ?: snapshot.get("lunchBreakDuration") as? Long)?.toInt() ?: 60
                        val lunchBreakAfterLesson = (snapshot.get("ogleArasiKacinciDersten") as? Long ?: snapshot.get("ogle_arasi_kacinci_dersten") as? Long ?: snapshot.get("lunchBreakAfterLesson") as? Long)?.toInt() ?: 4

                        val customRecessRaw = snapshot.get("ozelTeneffusSureleri") as? Map<*, *> ?: snapshot.get("ozel_teneffus_sureleri") as? Map<*, *> ?: snapshot.get("customRecessDurations") as? Map<*, *>
                        val customRecessDurations = customRecessRaw?.entries?.associate { entry ->
                            entry.key.toString() to (entry.value as? Long)?.toInt()!!
                        } ?: emptyMap()

                        localScheduleConfig = ScheduleConfig(
                            days = days,
                            lessonCount = lessonCount,
                            startTime = startTime,
                            lessonDuration = lessonDuration,
                            recessDuration = recessDuration,
                            lunchBreakDuration = lunchBreakDuration,
                            lunchBreakAfterLesson = lunchBreakAfterLesson,
                            customRecessDurations = customRecessDurations
                        )
                    } catch (e: Exception) {
                        android.util.Log.e("ScheduleTab", "Error parsing local schedule config", e)
                    }
                } else {
                    localScheduleConfig = null
                }
            }
        } else null

        val dataRef = db.collection("users").document(teacherUid).collection("config").document("scheduleData")
        val dataListener = dataRef.addSnapshotListener { snapshot, error ->
            if (snapshot != null && snapshot.exists()) {
                val slotsRaw = snapshot.get("slots") as? Map<*, *>
                val slots = slotsRaw?.entries?.associate { entry ->
                    val value = entry.value
                    val lessonId = if (value is Map<*, *>) {
                        (value["lessonId"] ?: value["subjectId"] ?: value["subject"] ?: value["id"] ?: value["name"])?.toString() ?: ""
                    } else {
                        value?.toString() ?: ""
                    }
                    entry.key.toString() to lessonId
                } ?: emptyMap()
                teacherScheduleData = ScheduleData(slots)
            } else {
                teacherScheduleData = ScheduleData()
            }
        }

        val overrideDataListener = if (authUid != null && authUid != teacherUid) {
            val overrideRef = db.collection("users").document(authUid).collection("config").document("scheduleData")
            overrideRef.addSnapshotListener { snapshot, error ->
                if (snapshot != null && snapshot.exists()) {
                    val slotsRaw = snapshot.get("slots") as? Map<*, *>
                    val slots = slotsRaw?.entries?.associate { entry ->
                        val value = entry.value
                        val lessonId = if (value is Map<*, *>) {
                            (value["lessonId"] ?: value["subjectId"] ?: value["subject"] ?: value["id"] ?: value["name"])?.toString() ?: ""
                        } else {
                            value?.toString() ?: ""
                        }
                        entry.key.toString() to lessonId
                    } ?: emptyMap()
                    localScheduleData = ScheduleData(slots)
                } else {
                    localScheduleData = null
                }
            }
        } else null

        val subjectsRef = db.collection("users").document(teacherUid).collection("subjects")
        val subjectsListener = subjectsRef.addSnapshotListener { snapshot, error ->
            if (snapshot != null) {
                if (snapshot.isEmpty) {
                    // Populate default subjects in a non-blocking background thread
                    val batch = db.batch()
                    for (sub in defaultSubjects) {
                        val newRef = db.collection("users").document(teacherUid).collection("subjects").document()
                        batch.set(newRef, mapOf(
                            "name" to sub.name,
                            "color" to sub.color,
                            "teacherUid" to teacherUid,
                            "createdAt" to FieldValue.serverTimestamp(),
                            "updatedAt" to FieldValue.serverTimestamp()
                        ))
                    }
                    batch.commit().addOnFailureListener {
                        android.util.Log.e("ScheduleTab", "Failed to populate default subjects", it)
                    }
                } else {
                    val subList = snapshot.documents.mapNotNull { doc ->
                        val name = doc.getString("name") ?: ""
                        val color = doc.getString("color") ?: "#3b82f6"
                        Subject(doc.id, name, color, teacherUid)
                    }
                    teacherSubjects = subList
                }
            }
        }

        val overrideSubjectsListener = if (authUid != null && authUid != teacherUid) {
            val overrideRef = db.collection("users").document(authUid).collection("subjects")
            overrideRef.addSnapshotListener { snapshot, error ->
                if (snapshot != null) {
                    val subList = snapshot.documents.mapNotNull { doc ->
                        val name = doc.getString("name") ?: ""
                        val color = doc.getString("color") ?: "#3b82f6"
                        Subject(doc.id, name, color, authUid)
                    }
                    localSubjects = subList
                }
            }
        } else null

        onDispose {
            configListener.remove()
            overrideConfigListener?.remove()
            dataListener.remove()
            overrideDataListener?.remove()
            subjectsListener.remove()
            overrideSubjectsListener?.remove()
        }
    }

    // Calculate active config
    val activeConfig = scheduleConfig ?: ScheduleConfig()

    // Calculated list of units
    val calculatedTimeSlots = remember(activeConfig) {
        generateTimeSlots(activeConfig)
    }

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
    ) {
        val configuration = LocalConfiguration.current
        val isLandscape = configuration.orientation == android.content.res.Configuration.ORIENTATION_LANDSCAPE
        
        // App header with details
        if (!isLandscape) {
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                shape = RoundedCornerShape(24.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = "SÜLEYMAN SAMİ KEPENEK İLKOKULU",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.primary
                            )
                            Text(
                                text = "3. Sınıf / D Şubesi  •  2025-2026 EĞİTİM ÖĞRETİM YILI",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Button(
                                onClick = { isSettingsOpen = true },
                                modifier = Modifier.weight(1f),
                                shape = RoundedCornerShape(12.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.secondaryContainer, contentColor = MaterialTheme.colorScheme.onSecondaryContainer)
                            ) {
                                Icon(Icons.Default.Settings, contentDescription = null, modifier = Modifier.size(16.dp))
                                Spacer(modifier = Modifier.width(6.dp))
                                Text("Ayarları Düzenle", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                            }

                            OutlinedButton(
                                onClick = {
                                    // Reset local schedule custom slots
                                    db.collection("users").document(teacherUid)
                                        .collection("config").document("scheduleData")
                                        .set(mapOf(
                                            "slots" to emptyMap<String, String>(),
                                            "updatedAt" to com.google.firebase.firestore.FieldValue.serverTimestamp()
                                        ))
                                        .addOnSuccessListener {
                                            Toast.makeText(context, "Programı Sıfırlandı", Toast.LENGTH_SHORT).show()
                                        }
                                },
                                modifier = Modifier.weight(1f),
                                shape = RoundedCornerShape(12.dp),
                                colors = ButtonDefaults.outlinedButtonColors(contentColor = MaterialTheme.colorScheme.error),
                                border = BorderStroke(1.dp, MaterialTheme.colorScheme.error.copy(alpha = 0.5f))
                            ) {
                                Icon(Icons.Default.Refresh, contentDescription = null, modifier = Modifier.size(16.dp))
                                Spacer(modifier = Modifier.width(6.dp))
                                Text("Programı Sıfırla", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                            }
                        }
                        Button(
                            onClick = { pdfExportLauncher.launch("Ders_Programi.pdf") },
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(12.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primaryContainer, contentColor = MaterialTheme.colorScheme.onPrimaryContainer)
                        ) {
                            Text("PDF Olarak İndir (A4)", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }

        if (isLoading) {
            Box(modifier = Modifier.weight(1f).fillMaxWidth(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
        } else {
            Box(modifier = Modifier.weight(1f).fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp)) {
                ScheduleTable(
                    activeConfig = activeConfig,
                    calculatedTimeSlots = calculatedTimeSlots,
                    scheduleData = scheduleData,
                    subjects = subjects,
                    isZoomedIn = isZoomedIn,
                    onSlotClick = { day, number ->
                        selectedSlotDay = day
                        selectedSlotLessonNumber = number
                        isSubjectSelectOpen = true
                    }
                )

                FloatingActionButton(
                    onClick = { isZoomedIn = !isZoomedIn },
                    modifier = Modifier.align(Alignment.TopEnd).padding(top = 4.dp, end = 4.dp).size(40.dp),
                    containerColor = MaterialTheme.colorScheme.primaryContainer,
                    shape = CircleShape
                ) {
                    Icon(
                        imageVector = if (isZoomedIn) Icons.Default.ZoomOut else Icons.Default.ZoomIn, 
                        contentDescription = "Zoom",
                        modifier = Modifier.size(20.dp)
                    )
                }
            }
        }
    }

    // MODAL DIALOGS

    // 1. Settings Dialog
    if (isSettingsOpen) {
        val daysOptions = listOf("Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar")
        var formDays by remember { mutableStateOf(activeConfig.days.toList()) }
        var formLessonCount by remember { mutableStateOf(activeConfig.lessonCount.toString()) }
        var formStartTime by remember { mutableStateOf(activeConfig.startTime) }
        var formLessonDuration by remember { mutableStateOf(activeConfig.lessonDuration.toString()) }
        var formRecessDuration by remember { mutableStateOf(activeConfig.recessDuration.toString()) }
        var formLunchDuration by remember { mutableStateOf(activeConfig.lunchBreakDuration.toString()) }
        var formLunchAfter by remember { mutableStateOf(activeConfig.lunchBreakAfterLesson.toString()) }
        
        // Custom Recesses
        val customRecessForm = remember { mutableStateMapOf<String, String>().apply {
            putAll(activeConfig.customRecessDurations.mapValues { it.value.toString() })
        } }

        Dialog(
            onDismissRequest = { isSettingsOpen = false },
            properties = DialogProperties(usePlatformDefaultWidth = false)
        ) {
            Surface(
                modifier = Modifier
                    .fillMaxWidth(0.95f)
                    .fillMaxHeight(0.9f)
                    .padding(vertical = 16.dp),
                shape = RoundedCornerShape(24.dp),
                color = MaterialTheme.colorScheme.surface
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(16.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "Ders Programı Ayarları",
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.Bold
                        )
                        IconButton(onClick = { isSettingsOpen = false }) {
                            Icon(Icons.Default.Close, contentDescription = "Kapat")
                        }
                    }

                    Divider(modifier = Modifier.padding(vertical = 8.dp))

                    Column(
                        modifier = Modifier
                            .weight(1f)
                            .verticalScroll(rememberScrollState()),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        // Days select
                        Text("Ders Olan Günler", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            Box(modifier = Modifier.fillMaxWidth()) {
                                FlowRow(
                                    modifier = Modifier.fillMaxWidth(),
                                    spacing = 6.dp
                                ) {
                                    daysOptions.forEach { dayName ->
                                        val isSelected = formDays.contains(dayName)
                                        FilterChip(
                                            selected = isSelected,
                                            onClick = {
                                                formDays = if (isSelected) {
                                                    formDays.filter { it != dayName }
                                                } else {
                                                    formDays + dayName
                                                }
                                            },
                                            label = { Text(dayName, fontSize = 11.sp) }
                                        )
                                    }
                                }
                            }
                        }

                        // Grid Form inputs
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            OutlinedTextField(
                                value = formLessonCount,
                                onValueChange = { formLessonCount = it },
                                label = { Text("Günlük Ders Sayısı", fontSize = 11.sp) },
                                modifier = Modifier.weight(1f),
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                shape = RoundedCornerShape(12.dp)
                            )
                            OutlinedTextField(
                                value = formStartTime,
                                onValueChange = { formStartTime = it },
                                label = { Text("Ders Başlangıç Saati", fontSize = 11.sp) },
                                modifier = Modifier.weight(1f),
                                placeholder = { Text("Örn: 08:30") },
                                shape = RoundedCornerShape(12.dp)
                            )
                        }

                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            OutlinedTextField(
                                value = formLessonDuration,
                                onValueChange = { formLessonDuration = it },
                                label = { Text("Ders Süresi (Dakika)", fontSize = 11.sp) },
                                modifier = Modifier.weight(1f),
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                shape = RoundedCornerShape(12.dp)
                            )
                            OutlinedTextField(
                                value = formRecessDuration,
                                onValueChange = { formRecessDuration = it },
                                label = { Text("Teneffüs Süresi (Dakika)", fontSize = 11.sp) },
                                modifier = Modifier.weight(1f),
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                shape = RoundedCornerShape(12.dp)
                            )
                        }

                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            OutlinedTextField(
                                value = formLunchDuration,
                                onValueChange = { formLunchDuration = it },
                                label = { Text("Öğle Arası Süresi (Dk)", fontSize = 11.sp) },
                                modifier = Modifier.weight(1f),
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                shape = RoundedCornerShape(12.dp)
                            )
                            OutlinedTextField(
                                value = formLunchAfter,
                                onValueChange = { formLunchAfter = it },
                                label = { Text("Öğle Arası Kaçıncı Dersten?", fontSize = 11.sp) },
                                modifier = Modifier.weight(1f),
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                shape = RoundedCornerShape(12.dp)
                            )
                        }

                        // Custom Recesses
                        val lessonCountInt = formLessonCount.toIntOrNull() ?: 1
                        val lunchAfterInt = formLunchAfter.toIntOrNull() ?: 0
                        
                        if (lessonCountInt > 1) {
                            var isCustomRecessesExpanded by remember { mutableStateOf(false) }
                            
                            Spacer(modifier = Modifier.height(4.dp))
                            
                            Surface(
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(12.dp),
                                color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f),
                                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant)
                            ) {
                                Column(modifier = Modifier.padding(12.dp)) {
                                    Row(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .clickable { isCustomRecessesExpanded = !isCustomRecessesExpanded },
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.SpaceBetween
                                    ) {
                                        Text(
                                            text = "Özel Teneffüs Süreleri (Opsiyonel)",
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 13.sp,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant
                                        )
                                        Icon(
                                            imageVector = if (isCustomRecessesExpanded) Icons.Default.ExpandLess else Icons.Default.ExpandMore,
                                            contentDescription = "Genişlet/Daralt",
                                            tint = MaterialTheme.colorScheme.onSurfaceVariant
                                        )
                                    }
                                    
                                    if (isCustomRecessesExpanded) {
                                        Spacer(modifier = Modifier.height(8.dp))
                                        Box(modifier = Modifier.fillMaxWidth()) {
                                            FlowRow(
                                                modifier = Modifier.fillMaxWidth(),
                                                spacing = 8.dp
                                            ) {
                                                for (i in 1 until lessonCountInt) {
                                                    if (i == lunchAfterInt) continue
                                                    val strKey = i.toString()
                                                    var textValState by remember(strKey) { mutableStateOf(customRecessForm[strKey] ?: "") }
                                                    
                                                    OutlinedTextField(
                                                        value = textValState,
                                                        onValueChange = {
                                                            textValState = it
                                                            if (it.isEmpty()) customRecessForm.remove(strKey) else customRecessForm[strKey] = it
                                                        },
                                                        label = { Text("$i. Teneffüs", fontSize = 10.sp) },
                                                        placeholder = { Text("${formRecessDuration} dk") },
                                                        modifier = Modifier.width(100.dp),
                                                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                                        shape = RoundedCornerShape(10.dp)
                                                    )
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        OutlinedButton(
                            onClick = { isSettingsOpen = false },
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Text("İptal")
                        }

                        Button(
                            onClick = {
                                val intLessonCount = formLessonCount.toIntOrNull() ?: activeConfig.lessonCount
                                val intLessonDuration = formLessonDuration.toIntOrNull() ?: activeConfig.lessonDuration
                                val intRecessDuration = formRecessDuration.toIntOrNull() ?: activeConfig.recessDuration
                                val intLunchDuration = formLunchDuration.toIntOrNull() ?: activeConfig.lunchBreakDuration
                                val intLunchAfter = formLunchAfter.toIntOrNull() ?: activeConfig.lunchBreakAfterLesson

                                val customRecessedParsed = customRecessForm.mapValues { entry ->
                                    entry.value.toIntOrNull() ?: intRecessDuration
                                }

                                val payload = mapOf(
                                    // English fields (legacy)
                                    "days" to formDays,
                                    "lessonCount" to intLessonCount,
                                    "startTime" to formStartTime,
                                    "lessonDuration" to intLessonDuration,
                                    "recessDuration" to intRecessDuration,
                                    "lunchBreakDuration" to intLunchDuration,
                                    "lunchBreakAfterLesson" to intLunchAfter,
                                    "customRecessDurations" to customRecessedParsed,
                                    // Turkish fields (camelCase for web sync)
                                    "gunler" to formDays,
                                    "dersSayisi" to intLessonCount,
                                    "baslangicSaati" to formStartTime,
                                    "dersSuresi" to intLessonDuration,
                                    "teneffusSuresi" to intRecessDuration,
                                    "ogleArasiSuresi" to intLunchDuration,
                                    "ogleArasiKacinciDersten" to intLunchAfter,
                                    "ozelTeneffusSureleri" to customRecessedParsed
                                )

                                val cleanCustomRecess = customRecessedParsed.toMap()
                                val currentAuthUid = com.google.firebase.auth.FirebaseAuth.getInstance().currentUser?.uid
                                val writeUid = if (currentAuthUid != null && currentAuthUid != teacherUid) currentAuthUid else teacherUid
                                db.collection("users").document(writeUid)
                                    .collection("config").document("schedule")
                                    .set(payload)
                                    .addOnSuccessListener {
                                        Toast.makeText(context, "Ayarlar Kaydedildi", Toast.LENGTH_SHORT).show()
                                        isSettingsOpen = false
                                        if (writeUid == currentAuthUid) {
                                            localScheduleConfig = ScheduleConfig(
                                                days = formDays,
                                                lessonCount = intLessonCount,
                                                startTime = formStartTime,
                                                lessonDuration = intLessonDuration,
                                                recessDuration = intRecessDuration,
                                                lunchBreakDuration = intLunchDuration,
                                                lunchBreakAfterLesson = intLunchAfter,
                                                customRecessDurations = cleanCustomRecess
                                            )
                                        }
                                    }
                                    .addOnFailureListener {
                                        Toast.makeText(context, "Hata: ${it.message} (write: $writeUid, auth: ${com.google.firebase.auth.FirebaseAuth.getInstance().currentUser?.uid})", Toast.LENGTH_LONG).show()
                                    }
                            },
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Text("Ayarları Kaydet")
                        }
                    }
                }
            }
        }
    }

    // 2. Subject Selector Modal
    if (isSubjectSelectOpen) {
        Dialog(
            onDismissRequest = { isSubjectSelectOpen = false }
        ) {
            Surface(
                modifier = Modifier
                    .fillMaxWidth()
                    .wrapContentHeight()
                    .padding(8.dp),
                shape = RoundedCornerShape(24.dp),
                color = MaterialTheme.colorScheme.surface
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text(text = "Ders Seç", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                            Text(
                                text = "$selectedSlotDay - $selectedSlotLessonNumber. Ders için bir branş seçin.",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                        IconButton(onClick = { isSubjectSelectOpen = false }) {
                            Icon(Icons.Default.Close, contentDescription = "Kapat")
                        }
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    // Grid lists of subjects
                    Box(modifier = Modifier.heightIn(max = 240.dp)) {
                        LazyVerticalGrid(
                            columns = GridCells.Fixed(2),
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            verticalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            items(subjects.size) { index ->
                                val sub = subjects[index]
                                SubjectButton(
                                    subject = sub,
                                    onClick = {
                                        val slotKey = getWebSlotKey(selectedSlotDay, selectedSlotLessonNumber)
                                        val updatedSlots = scheduleData.slots.toMutableMap().apply {
                                            put(slotKey, sub.id)
                                        }
                                        val currentAuthUid = com.google.firebase.auth.FirebaseAuth.getInstance().currentUser?.uid
                                        val writeUid = if (currentAuthUid != null && currentAuthUid != teacherUid) currentAuthUid else teacherUid
                                        db.collection("users").document(writeUid)
                                            .collection("config").document("scheduleData")
                                            .set(mapOf(
                                                "slots" to updatedSlots,
                                                "updatedAt" to com.google.firebase.firestore.FieldValue.serverTimestamp()
                                            ))
                                            .addOnSuccessListener {
                                                isSubjectSelectOpen = false
                                                if (writeUid == currentAuthUid) {
                                                    localScheduleData = ScheduleData(updatedSlots)
                                                }
                                            }
                                    },
                                    onEditClick = {
                                        editingSubject = sub
                                        subjectNameInput = sub.name
                                        subjectColorInput = sub.color
                                        isSubjectEditOpen = true
                                    }
                                )
                            }
                            
                            // Clear option
                            item {
                                Card(
                                    onClick = {
                                        val slotKey = getWebSlotKey(selectedSlotDay, selectedSlotLessonNumber)
                                        val updatedSlots = scheduleData.slots.toMutableMap().apply {
                                            remove(slotKey)
                                        }
                                        val currentAuthUid = com.google.firebase.auth.FirebaseAuth.getInstance().currentUser?.uid
                                        val writeUid = if (currentAuthUid != null && currentAuthUid != teacherUid) currentAuthUid else teacherUid
                                        db.collection("users").document(writeUid)
                                            .collection("config").document("scheduleData")
                                            .set(mapOf(
                                                "slots" to updatedSlots,
                                                "updatedAt" to com.google.firebase.firestore.FieldValue.serverTimestamp()
                                            ))
                                            .addOnSuccessListener {
                                                isSubjectSelectOpen = false
                                                if (writeUid == currentAuthUid) {
                                                    localScheduleData = ScheduleData(updatedSlots)
                                                }
                                            }
                                    },
                                    modifier = Modifier.fillMaxWidth(),
                                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer.copy(alpha = 0.15f)),
                                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.error.copy(alpha = 0.2f))
                                ) {
                                    Row(
                                        modifier = Modifier.padding(12.dp),
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.Center
                                    ) {
                                        Box(modifier = Modifier.size(10.dp).clip(CircleShape).background(Color.Gray))
                                        Spacer(modifier = Modifier.width(8.dp))
                                        Text("DERSİ SİL", fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.error, fontSize = 12.sp)
                                    }
                                }
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        TextButton(
                            onClick = {
                                editingSubject = null
                                subjectNameInput = ""
                                subjectColorInput = "#3b82f6"
                                isSubjectEditOpen = true
                            }
                        ) {
                            Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("Yeni Ders Tanımla", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                        }

                        TextButton(onClick = { isSubjectSelectOpen = false }) {
                            Text("Kapat")
                        }
                    }
                }
            }
        }
    }

    // 3. Subject Add/Edit Modal overlay
    if (isSubjectEditOpen) {
        val colorPalette = listOf(
            "#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6",
            "#ec4899", "#f97316", "#06b6d4", "#6366f1", "#64748b"
        )
        Dialog(
            onDismissRequest = { isSubjectEditOpen = false }
        ) {
            Surface(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(8.dp),
                shape = RoundedCornerShape(24.dp),
                color = MaterialTheme.colorScheme.surface
            ) {
                Column(modifier = Modifier.padding(20.dp)) {
                    Text(
                        text = if (editingSubject == null) "Yeni Ders Ekle" else "Dersi Düzenle",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold
                    )

                    Spacer(modifier = Modifier.height(16.dp))

                    OutlinedTextField(
                        value = subjectNameInput,
                        onValueChange = { subjectNameInput = it },
                        label = { Text("Ders Adı") },
                        placeholder = { Text("Örn: Robotik Kodlama") },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp)
                    )

                    Spacer(modifier = Modifier.height(16.dp))

                    Text("Renk Seçin", fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                    Spacer(modifier = Modifier.height(8.dp))

                    Box(modifier = Modifier.fillMaxWidth()) {
                        FlowRow(
                            modifier = Modifier.fillMaxWidth(),
                            spacing = 8.dp
                        ) {
                            colorPalette.forEach { hex ->
                                Box(
                                    modifier = Modifier
                                        .size(32.dp)
                                        .clip(CircleShape)
                                        .background(parseHexColor(hex))
                                        .clickable { subjectColorInput = hex }
                                        .border(
                                            width = if (subjectColorInput == hex) 3.dp else 0.dp,
                                            color = if (subjectColorInput == hex) Color.Black else Color.Transparent,
                                            shape = CircleShape
                                        )
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(24.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        if (editingSubject != null) {
                            OutlinedButton(
                                onClick = {
                                    editingSubject?.let { sub ->
                                        val currentAuthUid = com.google.firebase.auth.FirebaseAuth.getInstance().currentUser?.uid
                                        val writeUid = if (currentAuthUid != null && currentAuthUid != teacherUid) currentAuthUid else teacherUid
                                        db.collection("users").document(writeUid)
                                            .collection("subjects").document(sub.id)
                                            .delete()
                                            .addOnSuccessListener {
                                                isSubjectEditOpen = false
                                                editingSubject = null
                                            }
                                    }
                                },
                                modifier = Modifier.weight(1f),
                                shape = RoundedCornerShape(12.dp),
                                colors = ButtonDefaults.outlinedButtonColors(contentColor = MaterialTheme.colorScheme.error),
                                border = BorderStroke(1.dp, MaterialTheme.colorScheme.error)
                            ) {
                                Text("Sil")
                            }
                        }

                        OutlinedButton(
                            onClick = { isSubjectEditOpen = false },
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Text("İptal")
                        }

                        Button(
                            onClick = {
                                if (subjectNameInput.trim().isEmpty()) {
                                    Toast.makeText(context, "Ders adı boş olamaz", Toast.LENGTH_SHORT).show()
                                    return@Button
                                }
                                val currentAuthUid = com.google.firebase.auth.FirebaseAuth.getInstance().currentUser?.uid
                                val writeUid = if (currentAuthUid != null && currentAuthUid != teacherUid) currentAuthUid else teacherUid
                                val model = mapOf(
                                    "name" to subjectNameInput.trim(),
                                    "color" to subjectColorInput,
                                    "teacherUid" to writeUid,
                                    "updatedAt" to FieldValue.serverTimestamp()
                                )

                                val targetDoc = editingSubject?.id ?: db.collection("users").document(writeUid).collection("subjects").document().id
                                db.collection("users").document(writeUid)
                                    .collection("subjects").document(targetDoc)
                                    .set(model)
                                    .addOnSuccessListener {
                                        isSubjectEditOpen = false
                                        editingSubject = null
                                    }
                            },
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Text("Kaydet")
                        }
                    }
                }
            }
        }
    }
}

// ------------------- AUX COMPOSABLES AND UTILS -------------------

@Composable
fun LessonSlotCard(
    number: Int,
    startTime: String,
    endTime: String,
    subjectName: String,
    colorHex: String,
    onClick: () -> Unit
) {
    val baseColor = parseHexColor(colorHex)
    val containerBg = baseColor.copy(alpha = 0.08f)

    Card(
        onClick = onClick,
        modifier = Modifier
            .fillMaxWidth()
            .height(84.dp)
            .border(
                BorderStroke(
                    1.5.dp,
                    if (subjectName.isNotEmpty()) baseColor else MaterialTheme.colorScheme.outline.copy(alpha = 0.2f)
                ),
                shape = RoundedCornerShape(16.dp)
            ),
        colors = CardDefaults.cardColors(
            containerColor = if (subjectName.isNotEmpty()) containerBg else Color.Transparent
        ),
        shape = RoundedCornerShape(16.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 16.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Time interval (LHS)
            Column(
                modifier = Modifier.width(80.dp),
                verticalArrangement = Arrangement.Center
            ) {
                Text(
                    text = "• $number. DERS",
                    style = MaterialTheme.typography.labelSmall,
                    color = if (subjectName.isNotEmpty()) baseColor else MaterialTheme.colorScheme.onSurfaceVariant,
                    fontWeight = FontWeight.Bold
                )
                Spacer(modifier = Modifier.height(2.dp))
                Text(
                    text = "$startTime - $endTime",
                    fontSize = 11.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    fontWeight = FontWeight.SemiBold
                )
            }

            VerticalDivider(
                color = if (subjectName.isNotEmpty()) baseColor.copy(alpha = 0.2f) else MaterialTheme.colorScheme.outline.copy(alpha = 0.1f),
                modifier = Modifier
                    .padding(horizontal = 12.dp)
                    .fillMaxHeight()
                    .width(1.5.dp)
            )

            // Subject label (Center)
            Box(
                modifier = Modifier.weight(1f).fillMaxHeight(),
                contentAlignment = Alignment.Center
            ) {
                if (subjectName.isNotEmpty()) {
                    Text(
                        text = subjectName.uppercase(Locale("tr", "TR")),
                        style = MaterialTheme.typography.titleMedium,
                        color = baseColor,
                        fontWeight = FontWeight.Bold,
                        textAlign = TextAlign.Center
                    )
                } else {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.Center
                    ) {
                        Icon(
                            Icons.Default.Add,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.outline,
                            modifier = Modifier.size(16.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = "DERS SEÇ",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.outline,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun BreakSlotRow(
    title: String,
    startTime: String,
    endTime: String,
    color: Color
) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(34.dp)
            .clip(RoundedCornerShape(8.dp))
            .background(color),
        contentAlignment = Alignment.Center
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.Center
        ) {
            Icon(
                imageVector = if (title.contains("ÖĞLE")) Icons.Default.Restaurant else Icons.Default.Schedule,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f),
                modifier = Modifier.size(12.dp)
            )
            Spacer(modifier = Modifier.width(6.dp))
            Text(
                text = "$startTime - $endTime   $title",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                fontWeight = FontWeight.Bold,
                letterSpacing = 1.sp
            )
        }
    }
}

@Composable
fun SubjectButton(
    subject: Subject,
    onClick: () -> Unit,
    onEditClick: () -> Unit
) {
    val baseColor = parseHexColor(subject.color)
    val bg = baseColor.copy(alpha = 0.08f)

    Card(
        onClick = onClick,
        modifier = Modifier
            .fillMaxWidth()
            .height(56.dp),
        colors = CardDefaults.cardColors(containerColor = bg),
        shape = RoundedCornerShape(16.dp)
    ) {
        Box(modifier = Modifier.fillMaxSize()) {
            Row(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(horizontal = 12.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Box(
                    modifier = Modifier
                        .size(12.dp)
                        .clip(CircleShape)
                        .background(baseColor)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = subject.name.uppercase(Locale("tr", "TR")),
                    fontSize = 11.sp,
                    color = baseColor,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.weight(1f)
                )
            }

            IconButton(
                onClick = onEditClick,
                modifier = Modifier
                    .align(Alignment.CenterEnd)
                    .padding(end = 4.dp)
                    .size(36.dp)
            ) {
                Icon(
                    Icons.Default.Edit,
                    contentDescription = "Düzenle",
                    tint = baseColor.copy(alpha = 0.6f),
                    modifier = Modifier.size(14.dp)
                )
            }
        }
    }
}

// FlowRow wrapper
@Composable
fun FlowRow(
    modifier: Modifier = Modifier,
    spacing: androidx.compose.ui.unit.Dp = 8.dp,
    content: @Composable () -> Unit
) {
    androidx.compose.ui.layout.Layout(
        content = content,
        modifier = modifier
    ) { measurables, constraints ->
        var rowWidth = 0
        var rowHeight = 0
        var totalHeight = 0
        val rows = mutableListOf<List<androidx.compose.ui.layout.Placeable>>()
        var currentInverseRow = mutableListOf<androidx.compose.ui.layout.Placeable>()

        measurables.forEach { measurable ->
            val placeable = measurable.measure(constraints.copy(minWidth = 0))
            val placeableWidth = placeable.width + spacing.roundToPx()
            if (rowWidth + placeableWidth > constraints.maxWidth && currentInverseRow.isNotEmpty()) {
                rows.add(currentInverseRow)
                totalHeight += rowHeight + spacing.roundToPx()
                rowWidth = 0
                rowHeight = 0
                currentInverseRow = mutableListOf()
            }
            rowWidth += placeableWidth
            rowHeight = maxOf(rowHeight, placeable.height)
            currentInverseRow.add(placeable)
        }
        if (currentInverseRow.isNotEmpty()) {
            rows.add(currentInverseRow)
            totalHeight += rowHeight
        }

        layout(constraints.maxWidth, totalHeight) {
            var y = 0
            rows.forEach { rowPlaceables ->
                var x = 0
                var maxH = 0
                rowPlaceables.forEach { placeable ->
                    placeable.placeRelative(x, y)
                    x += placeable.width + spacing.roundToPx()
                    maxH = maxOf(maxH, placeable.height)
                }
                y += maxH + spacing.roundToPx()
            }
        }
    }
}

fun parseHexColor(hex: String): Color {
    val cleanHex = hex.trim().replace("#", "")
    return try {
        if (cleanHex.length == 8) {
            Color(android.graphics.Color.parseColor("#$cleanHex"))
        } else if (cleanHex.length == 6) {
            Color(android.graphics.Color.parseColor("#$cleanHex"))
        } else {
            Color(0xFF3B82F6) // default blue
        }
    } catch (e: Exception) {
        Color(0xFF3B82F6)
    }
}

fun addMinutes(time: String, minutes: Int): String {
    return try {
        val parts = time.split(":")
        val h = parts.getOrNull(0)?.toIntOrNull() ?: 0
        val m = parts.getOrNull(1)?.toIntOrNull() ?: 0
        val totalMinutes = h * 60 + m + minutes
        val newH = (totalMinutes / 60) % 24
        val newM = totalMinutes % 60
        String.format(Locale.getDefault(), "%02d:%02d", newH, newM)
    } catch (e: Exception) {
        time
    }
}

fun generateTimeSlots(config: ScheduleConfig): List<CalculatedTimeSlot> {
    val slots = mutableListOf<CalculatedTimeSlot>()
    var currentTime = config.startTime

    for (i in 1..config.lessonCount) {
        val lessonEnd = addMinutes(currentTime, config.lessonDuration)
        slots.add(
            CalculatedTimeSlot(
                type = TimeSlotType.Lesson,
                number = i,
                start = currentTime,
                end = lessonEnd
            )
        )

        if (i < config.lessonCount) {
            val isLunchBreak = i == config.lunchBreakAfterLesson
            val breakDuration = if (isLunchBreak) {
                config.lunchBreakDuration
            } else {
                config.customRecessDurations[i.toString()] ?: config.recessDuration
            }
            val breakEnd = addMinutes(lessonEnd, breakDuration)
            slots.add(
                CalculatedTimeSlot(
                    type = if (isLunchBreak) TimeSlotType.Lunch else TimeSlotType.Recess,
                    number = i,
                    start = lessonEnd,
                    end = breakEnd
                )
            )
            currentTime = breakEnd
        } else {
            currentTime = lessonEnd
        }
    }
    return slots
}

// ------------------------- DATA STRUCTS -------------------------

data class ScheduleConfig(
    val days: List<String> = listOf("Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma"),
    val lessonCount: Int = 6,
    val startTime: String = "08:30",
    val lessonDuration: Int = 40,
    val recessDuration: Int = 15,
    val lunchBreakDuration: Int = 60,
    val lunchBreakAfterLesson: Int = 4,
    val customRecessDurations: Map<String, Int> = emptyMap()
)

data class Subject(
    val id: String = "",
    val name: String = "",
    val color: String = "#3b82f6",
    val teacherUid: String = ""
)

data class ScheduleData(
    val slots: Map<String, String> = emptyMap()
)

sealed class TimeSlotType {
    object Lesson : TimeSlotType()
    object Recess : TimeSlotType()
    object Lunch : TimeSlotType()
}

data class CalculatedTimeSlot(
    val type: TimeSlotType,
    val number: Int,
    val start: String,
    val end: String
)

fun getWebSlotKey(dayName: String, lessonNumber: Int): String {
    return "${dayName}_$lessonNumber"
}

@Composable
fun ScheduleTable(
    activeConfig: ScheduleConfig,
    calculatedTimeSlots: List<CalculatedTimeSlot>,
    scheduleData: ScheduleData,
    subjects: List<Subject>,
    isZoomedIn: Boolean,
    onSlotClick: (String, Int) -> Unit
) {
    val scrollStateHorizontal = rememberScrollState()
    val scrollStateVertical = rememberScrollState()
    
    val baseModifier = if (isZoomedIn) {
        Modifier
            .fillMaxSize()
            .horizontalScroll(scrollStateHorizontal)
            .verticalScroll(scrollStateVertical)
    } else {
        Modifier.fillMaxSize()
    }
    
    val headerSize = if (isZoomedIn) 12.sp else 8.sp
    val timeSize = if (isZoomedIn) 10.sp else 6.sp
    val contentSize = if (isZoomedIn) 12.sp else 7.sp
    val minColWidth = if (isZoomedIn) 120.dp else 0.dp
    val timeColWidth = if (isZoomedIn) 60.dp else 40.dp
    val slotHeight = if (isZoomedIn) 80.dp else 0.dp
    
    Box(modifier = Modifier.fillMaxSize().clip(RoundedCornerShape(12.dp)).border(1.dp, MaterialTheme.colorScheme.outlineVariant, RoundedCornerShape(12.dp))) {
        Column(
            modifier = baseModifier.background(MaterialTheme.colorScheme.surface)
        ) {
            // Header Row
            Row(
                modifier = Modifier.fillMaxWidth().height(if (isZoomedIn) 40.dp else 0.dp).let { if (!isZoomedIn) it.weight(0.6f) else it }.background(MaterialTheme.colorScheme.surfaceVariant)
            ) {
                Box(
                    modifier = Modifier.width(timeColWidth).fillMaxHeight().border(0.5.dp, MaterialTheme.colorScheme.outlineVariant),
                    contentAlignment = Alignment.Center
                ) {
                    Text(text = "Saat", style = MaterialTheme.typography.labelSmall, fontSize = headerSize, fontWeight = FontWeight.Bold)
                }
                
                activeConfig.days.forEach { day ->
                    val mod = if (isZoomedIn) Modifier.width(minColWidth) else Modifier.weight(1f)
                    Box(
                        modifier = mod.fillMaxHeight().border(0.5.dp, MaterialTheme.colorScheme.outlineVariant),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(text = day.take(3), style = MaterialTheme.typography.labelSmall, fontSize = headerSize, fontWeight = FontWeight.Bold)
                    }
                }
            }
            
            // Slots
            calculatedTimeSlots.forEach { slot ->
                val rowMod = if (isZoomedIn) {
                    if (slot.type == TimeSlotType.Lesson) Modifier.height(slotHeight).fillMaxWidth() 
                    else Modifier.height(30.dp).fillMaxWidth()
                } else {
                    if (slot.type == TimeSlotType.Lesson) Modifier.weight(2f).fillMaxWidth() 
                    else Modifier.weight(0.7f).fillMaxWidth()
                }
                
                Row(modifier = rowMod) {
                    // Time column
                    Box(
                        modifier = Modifier.width(timeColWidth).fillMaxHeight().background(MaterialTheme.colorScheme.surface).border(0.5.dp, MaterialTheme.colorScheme.outlineVariant),
                        contentAlignment = Alignment.Center
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
                            Text(text = slot.start, style = MaterialTheme.typography.labelSmall, fontSize = timeSize, textAlign = TextAlign.Center, lineHeight = timeSize.times(1.2))
                            Text(text = slot.end, style = MaterialTheme.typography.labelSmall, fontSize = timeSize, textAlign = TextAlign.Center, lineHeight = timeSize.times(1.2))
                        }
                    }
                    
                    // Content columns
                    if (slot.type == TimeSlotType.Lesson) {
                        activeConfig.days.forEach { day ->
                            val slotKey = getWebSlotKey(day, slot.number)
                            val subjectIdInSlot = scheduleData.slots[slotKey]
                            val matchingSubject = subjects.find { it.id == subjectIdInSlot || it.name == subjectIdInSlot }
                            val displaySubjectName = matchingSubject?.name ?: subjectIdInSlot ?: ""
                            val subjectColor = matchingSubject?.color ?: "#00000000" // transparent if empty
                            
                            val mod = if (isZoomedIn) Modifier.width(minColWidth) else Modifier.weight(1f)
                            Box(
                                modifier = mod.fillMaxHeight()
                                    .border(0.5.dp, MaterialTheme.colorScheme.outlineVariant)
                                    .let {
                                        if (displaySubjectName.isNotEmpty()) {
                                            it.background(parseHexColor(subjectColor).copy(alpha = 0.2f))
                                        } else {
                                            it.background(MaterialTheme.colorScheme.surface)
                                        }
                                    }
                                    .clickable { onSlotClick(day, slot.number) },
                                contentAlignment = Alignment.Center
                            ) {
                                if (displaySubjectName.isNotEmpty()) {
                                    Text(
                                        text = displaySubjectName, 
                                        style = MaterialTheme.typography.labelSmall, 
                                        fontSize = contentSize, 
                                        fontWeight = FontWeight.Bold,
                                        color = parseHexColor(subjectColor),
                                        textAlign = TextAlign.Center,
                                        maxLines = if (isZoomedIn) 3 else 2,
                                        lineHeight = contentSize.times(1.2),
                                        modifier = Modifier.padding(2.dp)
                                    )
                                }
                            }
                        }
                    } else {
                        // Break or Lunch
                        val mod = if (isZoomedIn) Modifier.width(minColWidth * activeConfig.days.size) else Modifier.weight(activeConfig.days.size.toFloat())
                        Box(
                            modifier = mod.fillMaxHeight()
                                .background(
                                    if (slot.type == TimeSlotType.Lunch) MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.5f) 
                                    else MaterialTheme.colorScheme.outline.copy(alpha = 0.1f)
                                )
                                .border(0.5.dp, MaterialTheme.colorScheme.outlineVariant),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = if (slot.type == TimeSlotType.Lunch) "ÖĞLE ARASI" else "TENEFFÜS", 
                                style = MaterialTheme.typography.labelSmall, 
                                fontSize = timeSize.times(1.2f),
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                letterSpacing = 2.sp,
                                maxLines = 1
                            )
                        }
                    }
                }
            }
        }
    }
}

