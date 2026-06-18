package com.example.ui.dashboard.tabs

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.auth.UserData
import com.example.data.FirestoreRepository
import com.example.data.Student
import com.example.utils.SoundHelper
import kotlinx.coroutines.launch
import kotlinx.coroutines.delay
import android.content.Context
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import kotlin.math.cos
import kotlin.math.sin
import kotlinx.coroutines.tasks.await
import androidx.compose.ui.draw.scale
import androidx.compose.foundation.Canvas
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.drawscope.drawIntoCanvas
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.graphics.nativeCanvas

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LuckyStudentTab(userData: UserData) {
    var students by remember { mutableStateOf<List<Student>>(emptyList()) }
    var teacherCity by remember { mutableStateOf("Sivas") }
    var isLoading by remember { mutableStateOf(true) }
    val scope = rememberCoroutineScope()
    val context = androidx.compose.ui.platform.LocalContext.current
    
    // Gün Boyu modu
    var isAllDayMode by remember { mutableStateOf(false) }
    val selectedStudentIds = remember { mutableStateListOf<String>() }
    
    val db = com.google.firebase.firestore.FirebaseFirestore.getInstance()
    
    // View state
    var selectedGame by remember { mutableStateOf<String?>(null) }
    
    fun saveConfig(persist: Boolean, ids: List<String>) {
        val data = mapOf(
            "isPersistent" to persist,
            "selectedStudentIds" to ids,
            "updatedAt" to SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.getDefault()).format(Date())
        )
        db.collection("users").document(userData.userId).collection("settings").document("luckyStudent")
            .set(data, com.google.firebase.firestore.SetOptions.merge())
    }
    
    DisposableEffect(Unit) {
        // Initialize Sound and Speech Engine for the Lucky Student Games!
        SoundHelper.init(context)
        
        var listener: com.google.firebase.firestore.ListenerRegistration? = null
        scope.launch {
            val repo = FirestoreRepository()
            
            // Try to load the profile city
            val userDoc = repo.getUserDocument(userData.userId)
            if (userDoc != null && userDoc.city.isNotBlank()) {
                teacherCity = userDoc.city
            }
            
            val allStudents = repo.getStudents(userData.userId).sortedBy { it.studentNo.toIntOrNull() ?: 9999 }
            students = allStudents
            
            var isFirstLoad = true
            listener = db.collection("users").document(userData.userId).collection("settings").document("luckyStudent")
                .addSnapshotListener { snapshot, e ->
                    if (e != null) {
                        isLoading = false
                        return@addSnapshotListener
                    }
                    
                    if (snapshot != null && snapshot.exists()) {
                        val remoteAllDayMode = snapshot.getBoolean("isPersistent") ?: false
                        val savedSelected = snapshot.get("selectedStudentIds") as? List<String> ?: emptyList()
                        
                        val currentList = selectedStudentIds.toList()
                        
                        if (isFirstLoad) {
                            isAllDayMode = remoteAllDayMode
                            selectedStudentIds.clear()
                            if (remoteAllDayMode) {
                                if (savedSelected.isEmpty()) {
                                    selectedStudentIds.addAll(allStudents.map { it.id })
                                } else {
                                    val validIds = savedSelected.filter { id -> allStudents.any { s -> s.id == id } }
                                    selectedStudentIds.addAll(validIds)
                                }
                            } else {
                                selectedStudentIds.addAll(allStudents.map { it.id })
                            }
                            isLoading = false
                            isFirstLoad = false
                        } else {
                            if (remoteAllDayMode) {
                                val validIds = savedSelected.filter { id -> allStudents.any { s -> s.id == id } }
                                if (remoteAllDayMode != isAllDayMode || validIds.toSet() != selectedStudentIds.toSet()) {
                                    isAllDayMode = true
                                    selectedStudentIds.clear()
                                    selectedStudentIds.addAll(validIds)
                                }
                            } else {
                                if (remoteAllDayMode != isAllDayMode) {
                                    isAllDayMode = false
                                }
                            }
                        }
                    } else if (isFirstLoad) {
                        selectedStudentIds.clear()
                        selectedStudentIds.addAll(allStudents.map { it.id })
                        isLoading = false
                        isFirstLoad = false
                    }
                }
        }
        
        onDispose {
            listener?.remove()
            SoundHelper.shutdown()
        }
    }
    
    if (isLoading) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            CircularProgressIndicator()
        }
        return
    }

    val configuration = androidx.compose.ui.platform.LocalConfiguration.current
    val isCompact = configuration.screenWidthDp < 800
    var showParticipantsMobile by remember { mutableStateOf(false) }

    val participantsContent: @Composable () -> Unit = {
        Column(modifier = Modifier.padding(16.dp).fillMaxHeight()) {
            Text("KATILIMCILAR (${selectedStudentIds.size})", fontWeight = FontWeight.Black, fontSize = 14.sp, color = Color(0xFF0F172A))
            Text("Oyunda yer alacak öğrencileri seçin.", fontSize = 12.sp, color = Color(0xFF64748B))
            
            Spacer(modifier = Modifier.height(16.dp))
            
            var searchQuery by remember { mutableStateOf("") }
            
            OutlinedTextField(
                value = searchQuery,
                onValueChange = { searchQuery = it },
                placeholder = { Text("Öğrenci ara...", fontSize = 12.sp) },
                leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, modifier = Modifier.size(16.dp)) },
                modifier = Modifier.fillMaxWidth().height(50.dp),
                shape = RoundedCornerShape(8.dp),
                colors = OutlinedTextFieldDefaults.colors(
                    unfocusedBorderColor = Color(0xFFE2E8F0),
                    focusedBorderColor = Color(0xFF6366F1)
                )
            )
            
            Spacer(modifier = Modifier.height(16.dp))
            
            val filteredStudents = students.filter { 
                it.name.contains(searchQuery, ignoreCase = true) || 
                it.surname.contains(searchQuery, ignoreCase = true) ||
                it.studentNo.contains(searchQuery)
            }
            
            Row(verticalAlignment = Alignment.CenterVertically) {
                Checkbox(
                    checked = selectedStudentIds.size == students.size && students.isNotEmpty(),
                    onCheckedChange = { chk ->
                        val tempIds = if (chk) students.map { it.id } else emptyList()
                        selectedStudentIds.clear()
                        selectedStudentIds.addAll(tempIds)
                        saveConfig(isAllDayMode, selectedStudentIds.toList())
                    }
                )
                Text("Tümünü Seç", fontSize = 12.sp, color = Color(0xFF475569))
            }
            
            LazyColumn(modifier = Modifier.fillMaxWidth().weight(1f)) {
                items(filteredStudents) { st ->
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 4.dp)
                            .background(if (selectedStudentIds.contains(st.id)) Color(0xFFEEF2FF) else Color.Transparent, RoundedCornerShape(8.dp))
                            .border(1.dp, if (selectedStudentIds.contains(st.id)) Color(0xFFC7D2FE) else Color.Transparent, RoundedCornerShape(8.dp))
                            .clickable {
                                if (selectedStudentIds.contains(st.id)) {
                                    selectedStudentIds.remove(st.id)
                                } else {
                                    selectedStudentIds.add(st.id)
                                }
                                saveConfig(isAllDayMode, selectedStudentIds.toList())
                            }
                            .padding(horizontal = 8.dp, vertical = 4.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Checkbox(
                            checked = selectedStudentIds.contains(st.id),
                            onCheckedChange = { chk ->
                                if (chk) selectedStudentIds.add(st.id)
                                else selectedStudentIds.remove(st.id)
                                saveConfig(isAllDayMode, selectedStudentIds.toList())
                            },
                            modifier = Modifier.scale(0.8f)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("(${st.studentNo})", fontSize = 10.sp, color = Color(0xFF64748B), fontWeight = FontWeight.Bold)
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("${st.name} ${st.surname}".uppercase(), fontSize = 12.sp, color = if (selectedStudentIds.contains(st.id)) Color(0xFF3730A3) else Color(0xFF475569), fontWeight = FontWeight.SemiBold)
                    }
                }
            }
        }
    }

    if (showParticipantsMobile && isCompact) {
        ModalBottomSheet(onDismissRequest = { showParticipantsMobile = false }) {
            Box(modifier = Modifier.fillMaxHeight(0.8f)) {
                participantsContent()
            }
        }
    }

    Row(modifier = Modifier.fillMaxSize().background(Color(0xFFF1F5F9))) {
        // Main Content Area
        Column(
            modifier = Modifier.weight(1f).fillMaxHeight().padding(16.dp)
        ) {
            // Top Bar
            Row(
                modifier = Modifier.fillMaxWidth().background(Color.White, RoundedCornerShape(12.dp)).padding(if (isCompact) 12.dp else 16.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                if (selectedGame != null) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        IconButton(onClick = { selectedGame = null }, modifier = Modifier.size(36.dp)) {
                            Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Geri", tint = Color(0xFF64748B))
                        }
                        Spacer(modifier = Modifier.width(8.dp))
                        Column {
                            Text(selectedGame?.uppercase() ?: "", fontWeight = FontWeight.Black, fontSize = 16.sp, color = Color(0xFF0F172A))
                            if (!isCompact) {
                                Text("Derse katılımı artırmak için eğlenceli bir yöntem", fontSize = 12.sp, color = Color(0xFF94A3B8))
                            }
                        }
                    }
                } else {
                    // Empty space or a simple subtitle on the left, but for a balanced look, we can just show the Participants count nicely if on mobile.
                    if (isCompact) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier
                                .background(Color(0xFFEEF2FF), RoundedCornerShape(12.dp))
                                .clickable { showParticipantsMobile = true }
                                .padding(horizontal = 16.dp, vertical = 10.dp)
                        ) {
                            Icon(Icons.Default.Group, contentDescription = "Katılımcılar", tint = Color(0xFF6366F1), modifier = Modifier.size(20.dp))
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("${selectedStudentIds.size} Katılımcı", fontWeight = FontWeight.Bold, fontSize = 14.sp, color = Color(0xFF6366F1))
                        }
                    } else {
                        Text("Eğlenceli bir yöntem seçin", fontSize = 14.sp, fontWeight = FontWeight.Medium, color = Color(0xFF64748B))
                    }
                }
                
                Row(verticalAlignment = Alignment.CenterVertically) {
                    if (isCompact && selectedGame != null) {
                        // If we are in a game on mobile, show a small participants button on the right
                        IconButton(onClick = { showParticipantsMobile = true }, modifier = Modifier.background(Color(0xFFEEF2FF), CircleShape).size(36.dp)) {
                            Icon(Icons.Default.Group, contentDescription = "Katılımcılar", tint = Color(0xFF6366F1), modifier = Modifier.size(18.dp))
                        }
                        Spacer(modifier = Modifier.width(8.dp))
                    }

                    Row(
                        modifier = Modifier
                            .background(Color(0xFFFFFBEB), RoundedCornerShape(24.dp))
                            .border(1.dp, Color(0xFFFEF3C7), RoundedCornerShape(24.dp))
                            .padding(end = 6.dp), // padding adjusted for the switch
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(Icons.Default.AccessTime, contentDescription = null, tint = Color(0xFFD97706), modifier = Modifier.size(if (isCompact) 16.dp else 20.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(if (isCompact) "G. BOYU" else "GÜN BOYU", fontWeight = FontWeight.Bold, fontSize = if (isCompact) 11.sp else 13.sp, color = Color(0xFFD97706))
                        }
                        Switch(
                            checked = isAllDayMode,
                            onCheckedChange = { 
                                isAllDayMode = it
                                if (!it) {
                                    selectedStudentIds.clear()
                                    selectedStudentIds.addAll(students.map { s -> s.id })
                                }
                                saveConfig(isAllDayMode, selectedStudentIds.toList())
                            },
                            modifier = Modifier.height(24.dp)
                        )
                    }
                    if (!isCompact) {
                        Spacer(modifier = Modifier.width(16.dp))
                        IconButton(onClick = {}, modifier = Modifier.background(Color(0xFFF1F5F9), CircleShape).size(40.dp)) {
                            Icon(Icons.Default.VolumeUp, contentDescription = "Ses", tint = Color(0xFF64748B), modifier = Modifier.size(20.dp))
                        }
                    }
                }
            }
            
            Spacer(modifier = Modifier.height(16.dp))
            
            // Content
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Color.Transparent)
            ) {
                if (selectedGame == null) {
                    // Games Grid
                    val games = listOf(
                        Triple("ÇARKIFELEK", "Hemen başla!", Icons.Default.RadioButtonChecked to Color(0xFF6366F1)),
                        Triple("ŞANSLI KUTU", "Hemen başla!", Icons.Default.Redeem to Color(0xFFF43F5E)),
                        Triple("BALON PATLATMA", "Hemen başla!", Icons.Default.FilterVintage to Color(0xFF0EA5E9)),
                        Triple("KURA ÇEKİMİ", "Hemen başla!", Icons.Default.ConfirmationNumber to Color(0xFFEAB308)),
                        Triple("YARIŞ PİSTİ", "Hemen başla!", Icons.Default.Flag to Color(0xFF10B981)),
                        Triple("ÇİÇEK BAHÇESİ", "Hemen başla!", Icons.Default.LocalFlorist to Color(0xFFEC4899)),
                        Triple("UZAY YOLCULUĞU", "Hemen başla!", Icons.Default.RocketLaunch to Color(0xFF8B5CF6)),
                        Triple("HAZİNE AVI", "Hemen başla!", Icons.Default.Diamond to Color(0xFFF97316)),
                        Triple("KAHRAMAN SİNYALİ", "Hemen başla!", Icons.Default.Bolt to Color(0xFFEAB308))
                    )
                    
                    LazyVerticalGrid(
                        columns = if (isCompact) GridCells.Fixed(1) else GridCells.Adaptive(minSize = 240.dp),
                        horizontalArrangement = Arrangement.spacedBy(16.dp),
                        verticalArrangement = Arrangement.spacedBy(16.dp),
                        modifier = Modifier.padding(vertical = 8.dp)
                    ) {
                        items(games) { game ->
                            Card(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clip(RoundedCornerShape(20.dp))
                                    .clickable { selectedGame = game.first },
                                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                                shape = RoundedCornerShape(20.dp),
                                colors = CardDefaults.cardColors(containerColor = Color.White)
                            ) {
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(16.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Box(
                                        modifier = Modifier
                                            .size(if (isCompact) 48.dp else 56.dp)
                                            .background(game.third.second.copy(alpha = 0.15f), CircleShape),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Icon(game.third.first, contentDescription = null, tint = game.third.second, modifier = Modifier.size(if (isCompact) 24.dp else 28.dp))
                                    }
                                    Spacer(modifier = Modifier.width(16.dp))
                                    Column {
                                        Text(game.first, fontWeight = FontWeight.Black, fontSize = if (isCompact) 14.sp else 16.sp, color = Color(0xFF1E293B), maxLines = 1)
                                        Spacer(modifier = Modifier.height(2.dp))
                                        Text(game.second, fontSize = if (isCompact) 12.sp else 14.sp, color = Color(0xFF64748B))
                                    }
                                }
                            }
                        }
                    }
                } else if (selectedGame == "ÇARKIFELEK") {
                    WheelOfFortuneView(
                        students = students.filter { selectedStudentIds.contains(it.id) },
                        onWinnerSelected = { winner ->
                            // Otomatik olarak listeden işareti kaldır
                            selectedStudentIds.remove(winner.id)
                            saveConfig(isAllDayMode, selectedStudentIds.toList())
                        }
                    )
                } else if (selectedGame == "ŞANSLI KUTU") {
                    LuckyBoxGame(
                        students = students.filter { selectedStudentIds.contains(it.id) },
                        onWinnerSelected = { winner ->
                            selectedStudentIds.remove(winner.id)
                            saveConfig(isAllDayMode, selectedStudentIds.toList())
                        }
                    )
                } else if (selectedGame == "BALON PATLATMA") {
                    BalloonGameView(
                        students = students.filter { selectedStudentIds.contains(it.id) },
                        onWinnerSelected = { winner ->
                            selectedStudentIds.remove(winner.id)
                            saveConfig(isAllDayMode, selectedStudentIds.toList())
                        }
                    )
                } else if (selectedGame == "KURA ÇEKİMİ") {
                    DrawGameView(
                        students = students.filter { selectedStudentIds.contains(it.id) },
                        onWinnerSelected = { winner ->
                            selectedStudentIds.remove(winner.id)
                            saveConfig(isAllDayMode, selectedStudentIds.toList())
                        }
                    )
                } else if (selectedGame == "YARIŞ PİSTİ") {
                    RaceTrackGameView(
                        students = students.filter { selectedStudentIds.contains(it.id) },
                        onWinnerSelected = { winner ->
                            selectedStudentIds.remove(winner.id)
                            saveConfig(isAllDayMode, selectedStudentIds.toList())
                        }
                    )
                } else if (selectedGame == "UZAY YOLCULUĞU") {
                    SpaceJourneyGameView(
                        students = students.filter { selectedStudentIds.contains(it.id) },
                        onWinnerSelected = { winner ->
                            selectedStudentIds.remove(winner.id)
                            saveConfig(isAllDayMode, selectedStudentIds.toList())
                        }
                    )
                } else if (selectedGame == "ÇİÇEK BAHÇESİ") {
                    FlowerGardenGameView(
                        students = students.filter { selectedStudentIds.contains(it.id) },
                        onWinnerSelected = { winner ->
                            selectedStudentIds.remove(winner.id)
                            saveConfig(isAllDayMode, selectedStudentIds.toList())
                        }
                    )
                } else if (selectedGame == "HAZİNE AVI") {
                    TreasureHuntGameView(
                        students = students.filter { selectedStudentIds.contains(it.id) },
                        onWinnerSelected = { winner ->
                            selectedStudentIds.remove(winner.id)
                            saveConfig(isAllDayMode, selectedStudentIds.toList())
                        }
                    )
                } else if (selectedGame == "KAHRAMAN SİNYALİ") {
                    HeroSignalGameView(
                        students = students.filter { selectedStudentIds.contains(it.id) },
                        teacherCity = teacherCity,
                        onWinnerSelected = { winner ->
                            selectedStudentIds.remove(winner.id)
                            saveConfig(isAllDayMode, selectedStudentIds.toList())
                        }
                    )
                } else {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Text("$selectedGame çok yakında!", fontWeight = FontWeight.Bold, color = Color(0xFF64748B))
                    }
                }
            }
        }
        
        // Participants Sidebar
        if (!isCompact) {
            Column(
                modifier = Modifier
                    .width(300.dp)
                    .fillMaxHeight()
                    .padding(top = 16.dp, bottom = 16.dp, end = 16.dp)
                    .background(Color.White, RoundedCornerShape(12.dp))
            ) {
                participantsContent()
            }
        }
    }
}

@Composable
fun WheelOfFortuneView(students: List<Student>, onWinnerSelected: (Student) -> Unit) {
    if (students.isEmpty()) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Text("Çarkı çevirmek için en az 1 öğrenci seçmelisiniz.", color = Color(0xFF64748B))
        }
        return
    }

    var rotationDegree by remember { mutableFloatStateOf(0f) }
    var isSpinning by remember { mutableStateOf(false) }
    var winner by remember { mutableStateOf<Student?>(null) }
    val scope = rememberCoroutineScope()
    
    val colors = listOf(
        Color(0xFF6366F1), Color(0xFFEC4899), Color(0xFF10B981), Color(0xFFF59E0B),
        Color(0xFF8B5CF6), Color(0xFF0EA5E9), Color(0xFFF43F5E), Color(0xFF3B82F6)
    )

    if (winner != null) {
        // Winner Screen (Like "TEBRİKLER! DEFNE BERRA")
        Box(modifier = Modifier.fillMaxSize().background(Color(0xFF6366F1), RoundedCornerShape(12.dp)), contentAlignment = Alignment.Center) {
            Card(
                shape = RoundedCornerShape(24.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                modifier = Modifier.width(320.dp).padding(16.dp),
                elevation = CardDefaults.cardElevation(8.dp)
            ) {
                Column(
                    modifier = Modifier.padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Box(
                        modifier = Modifier.offset(y = (-40).dp).size(80.dp).background(Color(0xFFEAB308), CircleShape),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(Icons.Default.EmojiEvents, contentDescription = null, tint = Color.White, modifier = Modifier.size(48.dp))
                    }
                    Spacer(modifier = Modifier.height(16.dp))
                    Text("TEBRİKLER!", fontWeight = FontWeight.Black, fontSize = 24.sp, color = Color(0xFF0F172A))
                    Text("ŞANSLI ÖĞRENCİ", fontSize = 12.sp, color = Color(0xFF64748B), fontWeight = FontWeight.Bold)
                    Spacer(modifier = Modifier.height(8.dp))
                    Text("${winner!!.name} ${winner!!.surname}".uppercase(), fontWeight = FontWeight.Black, fontSize = 28.sp, color = Color(0xFF6366F1), textAlign = TextAlign.Center)
                    Text("No: ${winner!!.studentNo}", fontSize = 14.sp, color = Color(0xFF94A3B8))
                    
                    Spacer(modifier = Modifier.height(32.dp))
                    
                    Button(
                        onClick = { 
                            onWinnerSelected(winner!!)
                            winner = null
                            rotationDegree = 0f
                        },
                        modifier = Modifier.fillMaxWidth().height(50.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF6366F1)),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Icon(Icons.Default.Refresh, contentDescription = null, modifier = Modifier.size(20.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("YENİDEN DENE")
                    }
                }
            }
        }
    } else {
        BoxWithConstraints(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            val wheelSize = minOf(maxWidth - 32.dp, 400.dp)
            // Shadow behind wheel
            Box(modifier = Modifier.size(wheelSize + 20.dp).background(Color.Black.copy(alpha = 0.05f), CircleShape))
            
            // Wheel
            Canvas(modifier = Modifier.size(wheelSize)) {
                val sweepAngle = 360f / students.size.coerceAtLeast(1)
                
                drawIntoCanvas { canvas ->
                    for (i in students.indices) {
                        val color = colors[i % colors.size]
                        val startAngle = i * sweepAngle + rotationDegree - 90f // Start from top
                        
                        // Draw segment pie
                        drawArc(
                            color = color,
                            startAngle = startAngle,
                            sweepAngle = sweepAngle,
                            useCenter = true,
                            size = Size(width = size.width, height = size.height)
                        )
                        
                        // Draw text
                        val textRadius = size.width / 2 * 0.65f
                        val middleAngle = Math.toRadians((startAngle + sweepAngle / 2).toDouble())
                        val x = size.width / 2 + textRadius * cos(middleAngle).toFloat()
                        val y = size.height / 2 + textRadius * sin(middleAngle).toFloat()
                        
                        canvas.nativeCanvas.save()
                        canvas.nativeCanvas.translate(x, y)
                        // Rotate text so it faces outwards from center
                        canvas.nativeCanvas.rotate((startAngle + sweepAngle / 2 + 180f))
                        val paint = android.graphics.Paint().apply {
                            this.color = android.graphics.Color.WHITE
                            this.textSize = 30f
                            this.isFakeBoldText = true
                            this.textAlign = android.graphics.Paint.Align.LEFT
                        }
                        canvas.nativeCanvas.drawText(students[i].name.uppercase(), 0f, 0f, paint)
                        canvas.nativeCanvas.restore()
                    }
                }
            }
            
            // Center spinner circle
            Box(
                modifier = Modifier
                    .size(80.dp)
                    .background(Color.White, CircleShape)
                    .border(2.dp, Color(0xFFE2E8F0), CircleShape)
                    .clickable(enabled = !isSpinning) {
                        isSpinning = true
                        scope.launch {
                            val extraSpins = 360f * 5 // 5 full rotations min
                            val randomOffset = (Math.random() * 360).toFloat()
                            val targetRotation = rotationDegree + extraSpins + randomOffset
                            
                            // Simple ease-out animation
                            val duration = 4000L
                            val steps = 60
                            val delayMs = duration / steps
                            val startRot = rotationDegree
                            val distance = targetRotation - startRot
                            
                            for (i in 1..steps) {
                                val t = i.toFloat() / steps
                                // Ease-out cubic: 1 - (1 - t)^3
                                val easeOut = 1f - Math.pow((1f - t).toDouble(), 3.0).toFloat()
                                rotationDegree = startRot + distance * easeOut
                                if (i % 5 == 0 || i == steps) {
                                    SoundHelper.playTick()
                                }
                                delay(delayMs)
                            }
                            
                            // Determine winner
                            val finalAngle = rotationDegree % 360f
                            // The pointer is at the TOP (0 degrees).
                            // Start angle was offset by -90 for drawing, so TOP is visually 0.
                            // The segment that is currently at the TOP pointer...
                            // If rotation = finalAngle, the segment 0 has moved by finalAngle clockwise.
                            // So the segment at the top is (360 - finalAngle) / sweepAngle
                            val sweepAngle = 360f / students.size.coerceAtLeast(1)
                            val normalizedAngle = (360f - finalAngle) % 360f
                            val winnerIndex = (normalizedAngle / sweepAngle).toInt() % students.size
                            
                            delay(500)
                            val selectedWinner = students[winnerIndex]
                            winner = selectedWinner
                            isSpinning = false
                            
                            // Announce winner
                            SoundHelper.playSuccess()
                        }
                    },
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(Icons.Default.PlayArrow, contentDescription = null, tint = Color(0xFF6366F1), modifier = Modifier.size(32.dp))
                    Text("DÖNDÜR", fontSize = 10.sp, fontWeight = FontWeight.Black, color = Color(0xFF6366F1))
                }
            }
            
            // Pointer at top
            Icon(
                Icons.Default.LocationOn,
                contentDescription = null,
                tint = Color(0xFFF43F5E),
                modifier = Modifier
                    .offset(y = (-200).dp - 10.dp)
                    .size(48.dp)
            )
        }
    }
}

@Composable
fun LuckyBoxGame(students: List<Student>, onWinnerSelected: (Student) -> Unit) {
    if (students.isEmpty()) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Text("Kutu oyunu için en az 1 öğrenci seçmelisiniz.", color = Color(0xFF64748B))
        }
        return
    }

    var winner by remember { mutableStateOf<Student?>(null) }
    
    // Create boxes
    val shuffledStudents = remember(students) { students.shuffled() }
    val openedBoxes = remember(students) { mutableStateListOf<Boolean>().apply { addAll(List(students.size) { false }) } }
    
    val colors = listOf(
        Color(0xFFE11D48), // Rose
        Color(0xFF0284C7), // Sky
        Color(0xFF059669), // Emerald
        Color(0xFFD97706), // Amber
        Color(0xFF4F46E5), // Indigo
        Color(0xFF7C3AED), // Violet
        Color(0xFFDB2777), // Fuchsia
        Color(0xFF0891B2)  // Cyan
    )

    if (winner != null) {
        // Winner Screen
        Box(modifier = Modifier.fillMaxSize().background(Color(0xFFE11D48), RoundedCornerShape(12.dp)), contentAlignment = Alignment.Center) {
            androidx.compose.material3.Card(
                shape = RoundedCornerShape(24.dp),
                colors = androidx.compose.material3.CardDefaults.cardColors(containerColor = Color.White),
                modifier = Modifier.width(320.dp).padding(16.dp),
                elevation = androidx.compose.material3.CardDefaults.cardElevation(8.dp)
            ) {
                Column(
                    modifier = Modifier.padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Box(
                        modifier = Modifier.offset(y = (-40).dp).size(80.dp).background(Color(0xFFEAB308), CircleShape),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(Icons.Default.CardGiftcard, contentDescription = null, tint = Color.White, modifier = Modifier.size(48.dp))
                    }
                    Spacer(modifier = Modifier.height(16.dp))
                    Text("TEBRİKLER!", fontWeight = FontWeight.Black, fontSize = 24.sp, color = Color(0xFF0F172A))
                    Text("ŞANSLI ÖĞRENCİ", fontSize = 12.sp, color = Color(0xFF64748B), fontWeight = FontWeight.Bold)
                    Spacer(modifier = Modifier.height(8.dp))
                    Text("${winner!!.name} ${winner!!.surname}".uppercase(), fontWeight = FontWeight.Black, fontSize = 28.sp, color = Color(0xFFE11D48), textAlign = TextAlign.Center)
                    Text("No: ${winner!!.studentNo}", fontSize = 14.sp, color = Color(0xFF94A3B8))
                    
                    Spacer(modifier = Modifier.height(32.dp))
                    
                    Button(
                        onClick = { 
                            onWinnerSelected(winner!!)
                            winner = null
                        },
                        modifier = Modifier.fillMaxWidth().height(50.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFE11D48)),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Icon(Icons.Default.Refresh, contentDescription = null, modifier = Modifier.size(20.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("DEVAM ET")
                    }
                }
            }
        }
    } else {
        val scope = rememberCoroutineScope()
        LazyVerticalGrid(
            columns = GridCells.Adaptive(minSize = 100.dp),
            contentPadding = PaddingValues(16.dp),
            horizontalArrangement = Arrangement.spacedBy(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
            modifier = Modifier.fillMaxSize()
        ) {
            items(shuffledStudents.size) { index ->
                val boxColor = colors[index % colors.size]
                val isOpened = openedBoxes[index]
                val student = shuffledStudents[index]
                
                androidx.compose.material3.Card(
                    shape = RoundedCornerShape(20.dp),
                    colors = androidx.compose.material3.CardDefaults.cardColors(containerColor = if (isOpened) Color.White else boxColor),
                    elevation = androidx.compose.material3.CardDefaults.cardElevation(defaultElevation = if (isOpened) 2.dp else 4.dp),
                    modifier = Modifier.aspectRatio(1f).clickable(enabled = !isOpened) {
                        openedBoxes[index] = true
                        SoundHelper.playBoing()
                        scope.launch {
                            kotlinx.coroutines.delay(800) // Show it for short
                            winner = student
                            SoundHelper.playSuccess()
                        }
                    }
                ) {
                    Box(modifier = Modifier.fillMaxSize()) {
                        if (isOpened) {
                            Column(
                                modifier = Modifier.fillMaxSize().padding(8.dp),
                                horizontalAlignment = Alignment.CenterHorizontally,
                                verticalArrangement = Arrangement.Center
                            ) {
                                Icon(Icons.Default.Star, contentDescription = null, tint = Color(0xFFF59E0B), modifier = Modifier.size(28.dp))
                                Spacer(modifier = Modifier.height(8.dp))
                                Text(
                                    text = "${student.name} ${student.surname}".uppercase(),
                                    fontWeight = FontWeight.Black,
                                    fontSize = 11.sp,
                                    textAlign = TextAlign.Center,
                                    color = Color(0xFF0F172A),
                                    lineHeight = 13.sp
                                )
                            }
                        } else {
                            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                                Text((index + 1).toString(), fontWeight = FontWeight.Black, fontSize = 20.sp, color = Color.White.copy(alpha = 0.3f), modifier = Modifier.align(Alignment.TopStart).padding(12.dp))
                                Icon(Icons.Default.CardGiftcard, contentDescription = null, tint = Color.White, modifier = Modifier.size(48.dp))
                            }
                        }
                    }
                }
            }
        }
    }
}