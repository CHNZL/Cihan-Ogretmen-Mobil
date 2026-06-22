package com.example.ui.dashboard.tabs

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.rememberScrollState
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
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.launch
import com.example.data.FirestoreRepository
import com.example.data.Student
import kotlinx.coroutines.delay

data class StarCategory(
    val title: String,
    val icon: ImageVector,
    val tint: Color
)

val starCategoriesDetail = listOf(
    StarCategory("HAYAT BİLGİSİ YILDIZI", Icons.Default.Favorite, Color(0xFF10B981)),
    StarCategory("SOSYAL BİLGİLER YILDIZI", Icons.Default.Lens, Color(0xFFF97316)),
    StarCategory("FEN BİLİMLERİ YILDIZI", Icons.Default.Science, Color(0xFF3B82F6)),
    StarCategory("MATEMATİK YILDIZI", Icons.Default.Calculate, Color(0xFF8B5CF6)),
    StarCategory("TÜRKÇE YILDIZI", Icons.Default.SortByAlpha, Color(0xFFF43F5E)),
    StarCategory("İNGİLİZCE YILDIZI", Icons.Default.Translate, Color(0xFFD946EF)),
    StarCategory("GÖRSEL SANATLAR YILDIZI", Icons.Default.Palette, Color(0xFFEC4899)),
    StarCategory("MÜZİK YILDIZI", Icons.Default.MusicNote, Color(0xFF8B5CF6)),
    StarCategory("BEDEN EĞİTİMİ YILDIZI", Icons.Default.EmojiEvents, Color(0xFF14B8A6)),
    StarCategory("KİTAP KURDU YILDIZI", Icons.Default.AutoStories, Color(0xFFF59E0B)),
    StarCategory("SORUMLULUK SAHİBİ ÖĞRENCİ YILDIZI", Icons.Default.Shield, Color(0xFF3B82F6)),
    StarCategory("YARDIMSEVER ÖĞRENCİ YILDIZI", Icons.Default.Favorite, Color(0xFF10B981)),
    StarCategory("TEMİZ VE DÜZENLİ ÖĞRENCİ YILDIZI", Icons.Default.CleaningServices, Color(0xFF06B6D4)),
    StarCategory("NAZİK ÖĞRENCİ YILDIZI", Icons.Default.Circle, Color(0xFFD946EF)),
    StarCategory("AZİMLİ ÖĞRENCİ YILDIZI", Icons.Default.Landscape, Color(0xFF8B5CF6)),
    StarCategory("İŞBİRLİKÇİ ÖĞRENCİ YILDIZI", Icons.Default.Group, Color(0xFF22C55E)),
    StarCategory("ÖĞRETMEN ÖZEL ÖDÜLÜ YILDIZI", Icons.Default.Stars, Color(0xFFE11D48))
)

@OptIn(ExperimentalLayoutApi::class, ExperimentalMaterial3Api::class)
@Composable
fun StarsClassTab(userData: com.example.auth.UserData) {
    var sortByStars by remember { mutableStateOf(false) }
    var searchQuery by remember { mutableStateOf("") }
    
    // Students Data
    var students by remember { mutableStateOf<List<Student>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }

    LaunchedEffect(userData.userId) {
        val repo = FirestoreRepository()
        students = repo.getStudents(userData.userId)
        isLoading = false
    }

    val filteredList = students.filter { 
        it.name.contains(searchQuery, true) || 
        it.surname.contains(searchQuery, true) || 
        it.studentNo.contains(searchQuery, true) 
    }.let { list ->
        if (sortByStars) {
            list.sortedByDescending { it.stars }
        } else {
            list.sortedBy { it.studentNo.toIntOrNull() ?: 9999 }
        }
    }
    
    // Complex Modals State
    var showStarHistoryFor: Student? by remember { mutableStateOf(null) }
    var showGiveStarFor: Student? by remember { mutableStateOf(null) }
    var showDeleteAllPrompt by remember { mutableStateOf(false) }
    
    // Activity Star Flow State
    var showActivityStarStep1 by remember { mutableStateOf(false) }
    var showActivityStarStep2 by remember { mutableStateOf(false) }
    var showLuckyStudentPrompt by remember { mutableStateOf(false) }
    var showLuckyStudentResult by remember { mutableStateOf(false) }
    var chosenLuckyStudent by remember { mutableStateOf<Student?>(null) }
    
    var actDescription by remember { mutableStateOf("") }
    var actStarsCount by remember { mutableIntStateOf(1) }
    var actTimeSeconds by remember { mutableIntStateOf(0) }
    var actCurrentTimer by remember { mutableIntStateOf(0) }
    var actStudentTarget by remember { mutableIntStateOf(0) }
    var actCategory by remember { mutableStateOf<StarCategory?>(null) }
    
    val selectedStudentNames = remember { mutableStateListOf<String>() }
    val scope = androidx.compose.runtime.rememberCoroutineScope()
    val context = androidx.compose.ui.platform.LocalContext.current

    val createDocumentLauncher = androidx.activity.compose.rememberLauncherForActivityResult(
        contract = androidx.activity.result.contract.ActivityResultContracts.CreateDocument("application/vnd.ms-excel")
    ) { uri ->
        if (uri != null) {
            scope.launch {
                try {
                    context.contentResolver.openOutputStream(uri)?.use { outputStream ->
                        java.io.OutputStreamWriter(outputStream, "UTF-8").use { writer ->
                            writer.write("Öğrenci No\tÖğrenci Adı Soyadı\tTarih\tKategori\tKaç Yıldız Aldığı\tAçıklama\n")
                            val sdf = java.text.SimpleDateFormat("dd.MM.yyyy HH:mm", java.util.Locale.getDefault())
                            students.sortedBy { it.studentNo.toIntOrNull() ?: 9999 }.forEach { s ->
                                if (s.starHistory.isEmpty()) {
                                    writer.write("${s.studentNo}\t${s.name} ${s.surname}\t-\t-\t-\t-\n")
                                } else {
                                    s.starHistory.forEach { h ->
                                        writer.write("${s.studentNo}\t${s.name} ${s.surname}\t${sdf.format(java.util.Date(h.timestamp))}\t${h.category}\t${h.amount}\t${h.description.replace("\n", " ").replace("\t", " ")}\n")
                                    }
                                }
                            }
                        }
                    }
                    android.widget.Toast.makeText(context, "Sınıf listesi başarıyla indirildi.", android.widget.Toast.LENGTH_SHORT).show()
                } catch (e: Exception) {
                    android.widget.Toast.makeText(context, "İndirme başarısız: ${e.message}", android.widget.Toast.LENGTH_SHORT).show()
                }
            }
        }
    }

    val openDocumentLauncher = androidx.activity.compose.rememberLauncherForActivityResult(
        contract = androidx.activity.result.contract.ActivityResultContracts.OpenDocument()
    ) { uri ->
        if (uri != null) {
            scope.launch {
                isLoading = true
                try {
                    val newHistoryMap = mutableMapOf<String, MutableList<com.example.data.StarHistoryItem>>()
                    context.contentResolver.openInputStream(uri)?.use { inputStream ->
                        java.io.InputStreamReader(inputStream, "UTF-8").use { reader ->
                            java.io.BufferedReader(reader).use { bufferedReader ->
                                var lineCount = 0
                                bufferedReader.forEachLine { line ->
                                    if (lineCount > 0 && line.isNotBlank()) {
                                        val parts = line.split("\t")
                                        if (parts.size >= 6) {
                                            val no = parts[0]
                                            val dateStr = parts[2]
                                            if (dateStr != "-") {
                                                val cat = parts[3]
                                                val amt = parts[4].toIntOrNull() ?: 0
                                                val desc = parts[5]
                                                val sdf = java.text.SimpleDateFormat("dd.MM.yyyy HH:mm", java.util.Locale.getDefault())
                                                val time = try { sdf.parse(dateStr)?.time ?: System.currentTimeMillis() } catch (e: Exception) { System.currentTimeMillis() }
                                                
                                                val item = com.example.data.StarHistoryItem(
                                                    category = cat,
                                                    description = desc,
                                                    amount = amt,
                                                    timestamp = time
                                                )
                                                if (!newHistoryMap.containsKey(no)) {
                                                    newHistoryMap[no] = mutableListOf()
                                                }
                                                newHistoryMap[no]?.add(item)
                                            } else {
                                                if (!newHistoryMap.containsKey(no)) {
                                                    newHistoryMap[no] = mutableListOf()
                                                }
                                            }
                                        }
                                    }
                                    lineCount++
                                }
                            }
                        }
                    }
                    val repo = FirestoreRepository()
                    for (s in students) {
                        val importedHistory = newHistoryMap[s.studentNo] ?: continue
                        val newStars = importedHistory.sumOf { it.amount }
                        val updated = s.copy(
                            stars = newStars,
                            starHistory = importedHistory
                        )
                        repo.updateStudent(userData.userId, updated)
                    }
                    students = repo.getStudents(userData.userId)
                    android.widget.Toast.makeText(context, "Sınıf listesi başarıyla yüklendi.", android.widget.Toast.LENGTH_SHORT).show()
                } catch (e: Exception) {
                    android.widget.Toast.makeText(context, "Yükleme başarısız: ${e.message}", android.widget.Toast.LENGTH_SHORT).show()
                } finally {
                    isLoading = false
                }
            }
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFFF8FAFC))
            .padding(16.dp)
    ) {
        val configuration = androidx.compose.ui.platform.LocalConfiguration.current
        val isLandscape = configuration.orientation == android.content.res.Configuration.ORIENTATION_LANDSCAPE
        
        // Actions Header
        Row(
            modifier = Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Button(
                onClick = {
                    actDescription = ""
                    actStarsCount = 1
                    actTimeSeconds = 0
                    actCurrentTimer = 0
                    actStudentTarget = 0
                    actCategory = null
                    selectedStudentNames.clear()
                    showActivityStarStep1 = true
                    scope.launch {
                        val repo = com.example.data.FirestoreRepository()
                        repo.updateRemoteControlState(
                            teacherUid = userData.userId, 
                            activeTab = "stars-badges", 
                            timerCommand = "open_bulk_star"
                        )
                    }
                },
                modifier = Modifier.height(48.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF6366F1)),
                shape = RoundedCornerShape(12.dp)
            ) {
                Icon(Icons.Default.AutoAwesome, contentDescription = null, modifier = Modifier.size(20.dp))
                if (!isLandscape) {
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("ETKİNLİKLİ YILDIZ VER", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                }
            }
            
            Spacer(modifier = Modifier.width(16.dp))

            // Action Icons
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                IconButton(onClick = { 
                    createDocumentLauncher.launch("yildizlar_sinif_listesi.xls")
                }, modifier = Modifier.background(Color.White, RoundedCornerShape(12.dp)).border(1.dp, Color(0xFFE2E8F0), RoundedCornerShape(12.dp)).size(48.dp)) {
                    Icon(Icons.Default.Download, contentDescription = "İndir", tint = Color(0xFF64748B), modifier = Modifier.size(24.dp))
                }
                IconButton(onClick = { 
                    openDocumentLauncher.launch(arrayOf("application/vnd.ms-excel", "text/tab-separated-values", "text/plain", "*/*"))
                }, modifier = Modifier.background(Color.White, RoundedCornerShape(12.dp)).border(1.dp, Color(0xFFE2E8F0), RoundedCornerShape(12.dp)).size(48.dp)) {
                    Icon(Icons.Default.Upload, contentDescription = "Yükle", tint = Color(0xFF64748B), modifier = Modifier.size(24.dp))
                }
                IconButton(onClick = { showDeleteAllPrompt = true }, modifier = Modifier.background(Color(0xFFFEF2F2), RoundedCornerShape(12.dp)).border(1.dp, Color(0xFFFECACA), RoundedCornerShape(12.dp)).size(48.dp)) {
                    Icon(Icons.Default.Delete, contentDescription = "Sıfırla", tint = Color(0xFFEF4444), modifier = Modifier.size(24.dp))
                }
            }
        }
        
        Spacer(modifier = Modifier.height(if (isLandscape) 8.dp else 16.dp))
        
        // Search and Sort Bar
        Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            OutlinedTextField(
                value = searchQuery,
                onValueChange = { searchQuery = it },
                modifier = Modifier.weight(1f).background(Color.White, RoundedCornerShape(8.dp)),
                placeholder = { Text("Öğrenci ara...", color = Color(0xFF94A3B8)) },
                leadingIcon = { Icon(Icons.Default.Search, contentDescription = "Search", tint = Color(0xFF94A3B8)) },
                shape = RoundedCornerShape(8.dp),
                colors = OutlinedTextFieldDefaults.colors(
                    unfocusedBorderColor = Color(0xFFE2E8F0),
                    focusedBorderColor = Color(0xFF6366F1)
                ),
                singleLine = true
            )
            
            Spacer(modifier = Modifier.width(16.dp))
            
            IconButton(
                onClick = { sortByStars = !sortByStars },
                modifier = Modifier.background(if (sortByStars) Color(0xFFEEF2FF) else Color.White, RoundedCornerShape(12.dp)).border(1.dp, if (sortByStars) Color(0xFFC7D2FE) else Color(0xFFE2E8F0), RoundedCornerShape(12.dp)).size(52.dp)
            ) {
                Icon(
                    imageVector = if (sortByStars) Icons.Default.Star else Icons.Default.SortByAlpha,
                    contentDescription = "Sırala",
                    tint = if (sortByStars) Color(0xFF6366F1) else Color(0xFF64748B)
                )
            }
        }
        
        Spacer(modifier = Modifier.height(if (isLandscape) 8.dp else 16.dp))
        
        // Grid
        if (isLoading) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = Color(0xFF6366F1))
            }
        } else if (filteredList.isEmpty()) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text("Öğrenci bulunamadı", color = Color.Gray)
            }
        } else {
            LazyVerticalGrid(
                columns = GridCells.Adaptive(minSize = 250.dp),
                horizontalArrangement = Arrangement.spacedBy(16.dp),
                verticalArrangement = Arrangement.spacedBy(4.dp),
                modifier = Modifier.fillMaxSize()
            ) {
                items(filteredList, key = { it.id }) { s ->
                    StudentStarCard(
                        number = s.studentNo,
                        name = "${s.name} ${s.surname}",
                        stars = s.stars,
                        onHistoryClick = { showStarHistoryFor = s },
                        onAddStarClick = { showGiveStarFor = s }
                    )
                }
            }
        }
    }

    if (showDeleteAllPrompt) {
        AlertDialog(
            onDismissRequest = { showDeleteAllPrompt = false },
            title = { Text("Tüm Yıldızları Sıfırla", fontWeight = FontWeight.Bold, color = Color.Red) },
            text = { Text("Sınıftaki tüm öğrencilerin mevcut yıldızları ve yıldız geçmişleri sıfırlanacaktır. Bu işlem geri alınamaz. Emin misiniz?") },
            confirmButton = {
                Button(
                    onClick = {
                        scope.launch {
                            val repo = FirestoreRepository()
                            students.forEach { s ->
                                repo.updateStudent(userData.userId, s.copy(stars = 0, starHistory = emptyList()))
                            }
                            students = repo.getStudents(userData.userId).sortedBy { it.studentNo.toIntOrNull() ?: 9999 }
                        }
                        showDeleteAllPrompt = false
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Color.Red)
                ) { Text("EVET, SIFIRLA") }
            },
            dismissButton = {
                TextButton(onClick = { showDeleteAllPrompt = false }) { Text("İPTAL", color = Color.Gray) }
            },
            containerColor = Color.White
        )
    }

    if (showActivityStarStep1) {
        AlertDialog(
            onDismissRequest = { showActivityStarStep1 = false },
            title = {
                Column {
                    Text("ETKİNLİKLİ YILDIZ VER (ADIM 1/2)", fontWeight = FontWeight.Black, fontSize = 20.sp)
                    Text("Bir açıklama girin ve verilecek ödül kategorisini seçin.", fontSize = 14.sp, color = Color(0xFF64748B))
                }
            },
            text = {
                Column(modifier = Modifier.width(600.dp)) {
                    Text("ETKİNLİK AÇIKLAMASI", fontWeight = FontWeight.Bold, fontSize = 12.sp, color = Color.Gray)
                    Spacer(modifier = Modifier.height(4.dp))
                    OutlinedTextField(
                        value = actDescription,
                        onValueChange = { actDescription = it },
                        modifier = Modifier.fillMaxWidth().height(100.dp),
                        placeholder = { Text("Örn: Ders içi başarılı sunum, grup çalışmasına katkı...") },
                        shape = RoundedCornerShape(12.dp)
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                    
                    // Scrollable config row to prevent overflow layout mismatch
                    Row(
                        modifier = Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
                        horizontalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        Column {
                            Text("ÖDÜL MİKTARI", fontWeight = FontWeight.Bold, fontSize = 12.sp, color = Color.Gray)
                            Spacer(modifier = Modifier.height(4.dp))
                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                IconButton(onClick = { if (actStarsCount > 1) actStarsCount -= 1 }, modifier = Modifier.background(Color.White, CircleShape).border(1.dp, Color(0xFFF1F5F9), CircleShape)) { Text("-1") }
                                Text(actStarsCount.toString(), fontSize = 24.sp, color = Color(0xFFF59E0B), fontWeight = FontWeight.Bold)
                                IconButton(onClick = { actStarsCount += 1 }, modifier = Modifier.background(Color.White, CircleShape).border(1.dp, Color(0xFFF1F5F9), CircleShape)) { Text("+1") }
                            }
                        }
                        Column {
                            Text("SÜRE AYARI (SANİYE)", fontWeight = FontWeight.Bold, fontSize = 12.sp, color = Color.Gray)
                            Spacer(modifier = Modifier.height(4.dp))
                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                IconButton(onClick = { if(actTimeSeconds>=10) actTimeSeconds -= 10 }, modifier = Modifier.background(Color.White, CircleShape).border(1.dp, Color(0xFFF1F5F9), CircleShape)) { Text("-10") }
                                Text(actTimeSeconds.toString(), fontSize = 24.sp, color = Color(0xFF6366F1), fontWeight = FontWeight.Bold)
                                IconButton(onClick = { actTimeSeconds += 10 }, modifier = Modifier.background(Color.White, CircleShape).border(1.dp, Color(0xFFF1F5F9), CircleShape)) { Text("+10") }
                            }
                        }
                        Column {
                            Text("KİŞİ AYARI (ÖĞRENCİ SAYISI)", fontWeight = FontWeight.Bold, fontSize = 12.sp, color = Color.Gray)
                            Spacer(modifier = Modifier.height(4.dp))
                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                IconButton(onClick = { if(actStudentTarget>0) actStudentTarget -= 1 }, modifier = Modifier.background(Color.White, CircleShape).border(1.dp, Color(0xFFF1F5F9), CircleShape)) { Text("-1") }
                                Text(actStudentTarget.toString(), fontSize = 24.sp, color = Color(0xFF6366F1), fontWeight = FontWeight.Bold)
                                IconButton(onClick = { actStudentTarget += 1 }, modifier = Modifier.background(Color.White, CircleShape).border(1.dp, Color(0xFFF1F5F9), CircleShape)) { Text("+1") }
                            }
                        }
                    }
                    Spacer(modifier = Modifier.height(16.dp))
                    Text("ÖDÜL KATEGORİSİ", fontWeight = FontWeight.Bold, fontSize = 12.sp, color = Color.Gray)
                    Spacer(modifier = Modifier.height(4.dp))
                    LazyVerticalGrid(
                        columns = GridCells.Fixed(4),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                        modifier = Modifier.heightIn(max = 250.dp)
                    ) {
                        items(starCategoriesDetail) { cat ->
                            val isSelected = actCategory == cat
                            Card(
                                modifier = Modifier.height(100.dp).clickable { actCategory = cat },
                                colors = CardDefaults.cardColors(containerColor = if (isSelected) Color(0xFFFEF08A) else Color.White),
                                border = BorderStroke(1.dp, if (isSelected) Color(0xFFF59E0B) else Color(0xFFF1F5F9)),
                                shape = RoundedCornerShape(12.dp)
                            ) {
                                Column(
                                    modifier = Modifier.fillMaxSize().padding(4.dp),
                                    horizontalAlignment = Alignment.CenterHorizontally,
                                    verticalArrangement = Arrangement.Center
                                ) {
                                    Box(
                                        modifier = Modifier.size(36.dp).clip(CircleShape).background(cat.tint.copy(alpha = 0.1f)),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Icon(cat.icon, contentDescription = null, tint = cat.tint, modifier = Modifier.size(18.dp))
                                    }
                                    Spacer(modifier = Modifier.height(8.dp))
                                    Text(
                                        cat.title, fontSize = 9.sp, fontWeight = FontWeight.Bold, textAlign = TextAlign.Center, lineHeight = 11.sp, color = Color(0xFF334155)
                                    )
                                }
                            }
                        }
                    }
                }
            },
            confirmButton = {
                val nextEnabled = actDescription.isNotBlank() && actCategory != null
                Button(
                    onClick = {
                        if (nextEnabled) {
                            actCurrentTimer = actTimeSeconds
                            showActivityStarStep1 = false
                            showActivityStarStep2 = true
                        }
                    },
                    colors = ButtonDefaults.buttonColors(
                        containerColor = if (nextEnabled) Color(0xFF8B5CF6) else Color(0xFFE2E8F0),
                        contentColor = if (nextEnabled) Color.White else Color(0xFF94A3B8)
                    ),
                    shape = RoundedCornerShape(8.dp),
                    enabled = nextEnabled
                ) {
                    Text("İLERİ >")
                }
            },
            dismissButton = {
                TextButton(onClick = { showActivityStarStep1 = false }) { Text("İPTAL", color = Color(0xFF94A3B8)) }
            },
            containerColor = Color.White
        )
    }

    if (showActivityStarStep2) {
        val selectedCat = actCategory ?: starCategoriesDetail.first()
        
        val performStarSave = {
            scope.launch {
                val repo = FirestoreRepository()
                val newItem = com.example.data.StarHistoryItem(
                    category = selectedCat.title,
                    description = actDescription,
                    amount = actStarsCount,
                    timestamp = System.currentTimeMillis()
                )
                val targetStudents = students.filter { selectedStudentNames.contains("${it.name} ${it.surname}") }
                if (targetStudents.isNotEmpty()) {
                    for (s in targetStudents) {
                        val updated = s.copy(
                            stars = s.stars + actStarsCount,
                            starHistory = s.starHistory + newItem
                        )
                        repo.updateStudent(userData.userId, updated)
                    }
                    students = repo.getStudents(userData.userId).sortedBy { it.studentNo.toIntOrNull() ?: 9999 }
                }
            }
            showActivityStarStep2 = false
            showLuckyStudentPrompt = true
        }

        LaunchedEffect(actCurrentTimer) {
            if (actCurrentTimer > 0) {
                delay(1000L)
                actCurrentTimer -= 1
                if (actCurrentTimer == 0) {
                    performStarSave()
                }
            }
        }

        AlertDialog(
            onDismissRequest = { showActivityStarStep2 = false },
            title = {
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Column {
                        Text("ETKİNLİKLİ YILDIZ VER (ADIM 2/2)", fontWeight = FontWeight.Black, fontSize = 20.sp)
                        Text("Yıldız verilecek öğrencileri seçin.", fontSize = 14.sp, color = Color(0xFF64748B))
                    }
                    IconButton(onClick = { showActivityStarStep2 = false }) { Icon(Icons.Default.Close, contentDescription = "Kapat") }
                }
            },
            text = {
                Column(modifier = Modifier.width(600.dp)) {
                    // Category Info Box
                    Row(
                        modifier = Modifier.fillMaxWidth().background(Color(0xFFEEF2FF), RoundedCornerShape(12.dp)).padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(modifier = Modifier.size(40.dp).clip(RoundedCornerShape(8.dp)).background(Color.White), contentAlignment = Alignment.Center) {
                                Icon(selectedCat.icon, contentDescription = null, tint = selectedCat.tint)
                            }
                            Spacer(modifier = Modifier.width(12.dp))
                            Column {
                                Text(selectedCat.title, fontWeight = FontWeight.Black, fontSize = 12.sp, color = Color(0xFF1E293B))
                                Text("$actStarsCount Yıldız Ödülü", fontSize = 12.sp, color = selectedCat.tint, fontWeight = FontWeight.Medium)
                            }
                        }
                        
                        // Action Info (Kalan Süre, Hedef Kişi)
                        Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                            if (actTimeSeconds > 0) {
                                Column(horizontalAlignment = Alignment.End) {
                                    Text("KALAN SÜRE", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = Color.Red)
                                    Text("${actCurrentTimer}s", fontSize = 18.sp, fontWeight = FontWeight.Black, color = Color.Red)
                                }
                            }
                            Column(horizontalAlignment = Alignment.End) {
                                val targetText = if (actStudentTarget > 0) "HEDEF KİŞİ" else "SEÇİLEN"
                                val countText = if (actStudentTarget > 0) "${selectedStudentNames.size}/$actStudentTarget" else "${selectedStudentNames.size}"
                                Text(targetText, fontSize = 10.sp, fontWeight = FontWeight.Bold, color = Color(0xFF6366F1))
                                Text(countText, fontSize = 18.sp, fontWeight = FontWeight.Black, color = Color(0xFF6366F1))
                            }
                        }
                    }
                    
                    Spacer(modifier = Modifier.height(16.dp))
                    
                    LazyVerticalGrid(
                        columns = GridCells.Fixed(5),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                        modifier = Modifier.heightIn(max = 250.dp)
                    ) {
                        items(students, key = { it.id }) { s ->
                            val sName = "${s.name} ${s.surname}"
                            val isSel = selectedStudentNames.contains(sName)
                            Box(
                                modifier = Modifier
                                    .height(48.dp)
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(if (isSel) Color(0xFFEEF2FF) else Color.White)
                                    .border(1.dp, if (isSel) Color(0xFF6366F1) else Color(0xFFF1F5F9), RoundedCornerShape(8.dp))
                                    .clickable {
                                        if (isSel) {
                                            selectedStudentNames.remove(sName)
                                        } else {
                                            selectedStudentNames.add(sName)
                                            if (actStudentTarget > 0 && selectedStudentNames.size >= actStudentTarget) {
                                                performStarSave()
                                            }
                                        }
                                    },
                                contentAlignment = Alignment.Center
                            ) {
                                Text(s.name, fontSize = 10.sp, fontWeight = FontWeight.Black, color = if(isSel) Color(0xFF6366F1) else Color(0xFF475569), maxLines = 1)
                            }
                        }
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        performStarSave()
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF8B5CF6)),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Icon(Icons.Default.AutoAwesome, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("KAYDET VE YILDIZLARI VER")
                }
            },
            dismissButton = {
                TextButton(onClick = { 
                    showActivityStarStep2 = false
                    showActivityStarStep1 = true
                }) { Text("GERİ", color = Color(0xFF475569)) }
            },
            containerColor = Color.White
        )
    }

    if (showLuckyStudentPrompt) {
        AlertDialog(
            onDismissRequest = { showLuckyStudentPrompt = false },
            title = {},
            text = {
                Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth().padding(top = 16.dp)) {
                    Box(modifier = Modifier.size(64.dp).background(Color(0xFFEEF2FF), RoundedCornerShape(16.dp)), contentAlignment = Alignment.Center) {
                        Icon(Icons.Default.AutoAwesome, contentDescription = null, tint = Color(0xFF6366F1), modifier = Modifier.size(32.dp))
                    }
                    Spacer(modifier = Modifier.height(16.dp))
                    Text("ŞANSLI ÖĞRENCİ?", fontWeight = FontWeight.Black, fontSize = 20.sp, color = Color(0xFF0F172A))
                    Text("Etkinliği tamamlamak için rastgele bir öğrenci seçilsin mi?", fontSize = 12.sp, color = Color(0xFF64748B), textAlign = TextAlign.Center)
                    Spacer(modifier = Modifier.height(24.dp))
                    Button(
                        onClick = {
                            showLuckyStudentPrompt = false
                            chosenLuckyStudent = students.randomOrNull()
                            if (chosenLuckyStudent != null) {
                                showLuckyStudentResult = true
                            }
                        },
                        modifier = Modifier.fillMaxWidth(),
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF4F46E5)),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Text("EVET, SEÇ")
                    }
                    Spacer(modifier = Modifier.height(8.dp))
                    TextButton(
                        onClick = { showLuckyStudentPrompt = false },
                        modifier = Modifier.fillMaxWidth().background(Color(0xFFF8FAFC), RoundedCornerShape(12.dp))
                    ) {
                        Text("HAYIR, BİTİR", color = Color(0xFF475569), fontWeight = FontWeight.Bold)
                    }
                }
            },
            confirmButton = {},
            containerColor = Color.White
        )
    }

    if (showLuckyStudentResult && chosenLuckyStudent != null) {
        val st = chosenLuckyStudent!!
        AlertDialog(
            onDismissRequest = { showLuckyStudentResult = false },
            title = {},
            text = {
                Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth().padding(top = 16.dp)) {
                    Box(modifier = Modifier.size(80.dp).background(Color(0xFFFBBF24), CircleShape), contentAlignment = Alignment.Center) {
                        Icon(Icons.Default.Star, contentDescription = null, tint = Color.White, modifier = Modifier.size(48.dp))
                    }
                    Spacer(modifier = Modifier.height(16.dp))
                    Text("ŞANSLI ÖĞRENCİ SEÇİLDİ!", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = Color(0xFFD97706))
                    Text("${st.name} ${st.surname}", fontWeight = FontWeight.Black, fontSize = 28.sp, color = Color(0xFF0F172A))
                    Text("Okul No: ${st.studentNo}", fontSize = 12.sp, color = Color(0xFF94A3B8))
                    Spacer(modifier = Modifier.height(32.dp))
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                        Button(
                            onClick = { 
                                scope.launch {
                                    val repo = FirestoreRepository()
                                    // Fetch the latest student data to avoid overwriting the previous star if this student was also in the selected target group
                                    val freshStudents = repo.getStudents(userData.userId)
                                    val latestStudent = freshStudents.find { it.id == st.id } ?: st
                                    
                                    val newItem = com.example.data.StarHistoryItem(
                                        category = actCategory?.title ?: starCategoriesDetail.first().title,
                                        description = if (actDescription.isNotBlank()) "$actDescription (Şanslı Öğrenci)" else "Şanslı Öğrenci",
                                        amount = actStarsCount,
                                        timestamp = System.currentTimeMillis()
                                    )
                                    val updated = latestStudent.copy(
                                        stars = latestStudent.stars + actStarsCount,
                                        starHistory = latestStudent.starHistory + newItem
                                    )
                                    repo.updateStudent(userData.userId, updated)
                                    students = repo.getStudents(userData.userId).sortedBy { it.studentNo.toIntOrNull() ?: 9999 }
                                }
                                showLuckyStudentResult = false 
                            },
                            modifier = Modifier.weight(1f).height(80.dp),
                            shape = RoundedCornerShape(16.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFECFDF5))
                        ) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Icon(Icons.Default.CheckCircle, contentDescription = null, tint = Color(0xFF10B981), modifier = Modifier.size(24.dp))
                                Spacer(modifier = Modifier.height(4.dp))
                                Text("DOĞRU CEVAP", color = Color(0xFF065F46), fontWeight = FontWeight.Bold, fontSize = 10.sp)
                            }
                        }
                        Button(
                            onClick = { showLuckyStudentResult = false },
                            modifier = Modifier.weight(1f).height(80.dp),
                            shape = RoundedCornerShape(16.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFFEF2F2))
                        ) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Icon(Icons.Default.Cancel, contentDescription = null, tint = Color(0xFFEF4444), modifier = Modifier.size(24.dp))
                                Spacer(modifier = Modifier.height(4.dp))
                                Text("YANLIŞ CEVAP", color = Color(0xFF991B1B), fontWeight = FontWeight.Bold, fontSize = 10.sp)
                            }
                        }
                    }
                }
            },
            confirmButton = {},
            containerColor = Color.White
        )
    }

    if (showGiveStarFor != null) {
        val st = showGiveStarFor!!
        AlertDialog(
            onDismissRequest = { showGiveStarFor = null },
            title = {
                Column {
                    Text("YILDIZ VER", fontWeight = FontWeight.Black, fontSize = 20.sp)
                    Text("${st.name} ${st.surname} için başarı kategorisi seçin.", fontSize = 14.sp, color = Color(0xFF64748B))
                }
            },
            text = {
                LazyVerticalGrid(
                    columns = GridCells.Fixed(4),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                    modifier = Modifier.heightIn(max = 400.dp).width(500.dp)
                ) {
                    items(starCategoriesDetail) { cat ->
                        Card(
                            modifier = Modifier.height(100.dp).clickable { 
                                scope.launch {
                                    val repo = FirestoreRepository()
                                    val newItem = com.example.data.StarHistoryItem(
                                        category = cat.title,
                                        description = "Hızlı Ödül",
                                        amount = 1,
                                        timestamp = System.currentTimeMillis()
                                    )
                                    val updatedStudent = st.copy(
                                        stars = st.stars + 1,
                                        starHistory = st.starHistory + newItem
                                    )
                                    repo.updateStudent(userData.userId, updatedStudent)
                                    students = repo.getStudents(userData.userId).sortedBy { it.studentNo.toIntOrNull() ?: 9999 }
                                }
                                showGiveStarFor = null 
                            },
                            colors = CardDefaults.cardColors(containerColor = Color.White),
                            border = BorderStroke(1.dp, Color(0xFFF1F5F9)),
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Column(
                                modifier = Modifier.fillMaxSize().padding(4.dp),
                                horizontalAlignment = Alignment.CenterHorizontally,
                                verticalArrangement = Arrangement.Center
                            ) {
                                Box(
                                    modifier = Modifier.size(36.dp).clip(CircleShape).background(cat.tint.copy(alpha = 0.1f)),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(cat.icon, contentDescription = null, tint = cat.tint, modifier = Modifier.size(18.dp))
                                }
                                Spacer(modifier = Modifier.height(8.dp))
                                Text(
                                    cat.title, 
                                    fontSize = 9.sp, 
                                    fontWeight = FontWeight.Bold, 
                                    textAlign = TextAlign.Center,
                                    lineHeight = 11.sp,
                                    color = Color(0xFF334155)
                                )
                            }
                        }
                    }
                }
            },
            confirmButton = {},
            dismissButton = {
                TextButton(onClick = { showGiveStarFor = null }) { Text("İPTAL", color = Color(0xFF94A3B8)) }
            },
            containerColor = Color(0xFFF8FAFC)
        )
    }

    if (showStarHistoryFor != null) {
        val st = showStarHistoryFor!!
        AlertDialog(
            onDismissRequest = { showStarHistoryFor = null },
            title = {
                Column {
                    Text("YILDIZ GEÇMİŞİ", fontWeight = FontWeight.Black, fontSize = 20.sp)
                    Text("${st.name} ${st.surname}", fontSize = 14.sp, color = Color(0xFF64748B))
                }
            },
            text = {
                if (st.starHistory.isEmpty()) {
                    Box(modifier = Modifier.fillMaxWidth().height(100.dp), contentAlignment = Alignment.Center) {
                        Text("Henüz yıldız verilmemiş.", color = Color.Gray, fontStyle = androidx.compose.ui.text.font.FontStyle.Italic)
                    }
                } else {
                    LazyColumn(
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                        modifier = Modifier.fillMaxWidth().heightIn(max = 400.dp)
                    ) {
                        items(st.starHistory.size) { idx ->
                            val item = st.starHistory[st.starHistory.size - 1 - idx] // Reverse order showing newest first
                            Card(
                                modifier = Modifier.fillMaxWidth(),
                                colors = CardDefaults.cardColors(containerColor = Color.White),
                                shape = RoundedCornerShape(12.dp),
                                border = BorderStroke(1.dp, Color(0xFFF1F5F9))
                            ) {
                                Row(modifier = Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                                    Box(modifier = Modifier.size(40.dp).clip(RoundedCornerShape(8.dp)).background(Color(0xFFFEF3C7)), contentAlignment = Alignment.Center) {
                                        Icon(Icons.Default.Star, contentDescription = null, tint = Color(0xFFD97706), modifier = Modifier.size(24.dp))
                                    }
                                    Spacer(modifier = Modifier.width(12.dp))
                                    Column {
                                        Row(verticalAlignment = Alignment.CenterVertically) {
                                            Text(item.category.uppercase(), fontWeight = FontWeight.Black, fontSize = 12.sp)
                                            Spacer(modifier = Modifier.width(4.dp))
                                            Text("+${item.amount}", fontWeight = FontWeight.Black, fontSize = 12.sp, color = Color(0xFFD97706))
                                        }
                                        Text(item.description, fontSize = 12.sp, color = Color(0xFF64748B), fontStyle = androidx.compose.ui.text.font.FontStyle.Italic)
                                        val sdf = java.text.SimpleDateFormat("dd.MM.yyyy HH:mm", java.util.Locale.getDefault())
                                        Text(sdf.format(java.util.Date(item.timestamp)), fontSize = 10.sp, color = Color(0xFF94A3B8))
                                    }
                                }
                            }
                        }
                    }
                }
            },
            confirmButton = {},
            dismissButton = {
                TextButton(onClick = { showStarHistoryFor = null }) { Text("KAPAT", color = Color(0xFF94A3B8)) }
            },
            containerColor = Color(0xFFF8FAFC)
        )
    }
}

@Composable
fun StudentStarCard(
    number: String,
    name: String,
    stars: Int,
    onHistoryClick: () -> Unit,
    onAddStarClick: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth().height(64.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
        border = BorderStroke(1.dp, Color(0xFFF1F5F9)),
        shape = RoundedCornerShape(12.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxSize().padding(horizontal = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.weight(1f)
            ) {
                Text(
                    text = number,
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp,
                    color = Color(0xFF0F172A),
                    modifier = Modifier.widthIn(min = 24.dp)
                )
                Spacer(modifier = Modifier.width(6.dp))
                Text(
                    text = name,
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp,
                    color = Color(0xFF0F172A),
                    maxLines = 1,
                    overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis
                )
            }
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier
                        .background(Color(0xFFFEF3C7), RoundedCornerShape(12.dp))
                        .padding(horizontal = 8.dp, vertical = 4.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(text = "$stars", fontWeight = FontWeight.Black, fontSize = 14.sp, color = Color(0xFFD97706))
                        Spacer(modifier = Modifier.width(4.dp))
                        Icon(Icons.Default.Star, contentDescription = null, tint = Color(0xFFF59E0B), modifier = Modifier.size(16.dp))
                    }
                }
                
                Spacer(modifier = Modifier.width(8.dp))
                
                IconButton(onClick = onHistoryClick, modifier = Modifier.size(32.dp)) {
                    Icon(Icons.Default.History, contentDescription = "History", tint = Color(0xFF94A3B8), modifier = Modifier.size(20.dp))
                }
                
                Spacer(modifier = Modifier.width(4.dp))
                
                Box(
                    modifier = Modifier
                        .size(36.dp)
                        .clip(RoundedCornerShape(8.dp))
                        .background(Color(0xFFFBBF24))
                        .clickable { onAddStarClick() },
                    contentAlignment = Alignment.Center
                ) {
                    Icon(Icons.Default.Star, contentDescription = "Add Star", tint = Color.White, modifier = Modifier.size(20.dp))
                    Box(modifier = Modifier.align(Alignment.TopEnd).padding(2.dp)) {
                        Icon(Icons.Default.Add, contentDescription = null, tint = Color.White, modifier = Modifier.size(10.dp))
                    }
                }
            }
        }
    }
}

@Composable
fun LeaderboardView(students: List<Student>) {
    Column(
        modifier = Modifier.fillMaxWidth().padding(horizontal = 32.dp, vertical = 16.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Box(modifier = Modifier.size(64.dp), contentAlignment = Alignment.Center) {
            Icon(Icons.Default.EmojiEvents, contentDescription = null, tint = Color(0xFFFBBF24), modifier = Modifier.size(48.dp))
        }
        Spacer(modifier = Modifier.height(8.dp))
        Text("SINIFIN YILDIZLARI", fontWeight = FontWeight.Black, fontSize = 24.sp, color = Color(0xFF0F172A))
        Text("En çok yıldız toplayan öğrencilerimiz.", fontSize = 12.sp, color = Color(0xFF64748B))
        Spacer(modifier = Modifier.height(24.dp))
        
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
            Box(modifier = Modifier.border(1.dp, Color(0xFFE2E8F0), RoundedCornerShape(8.dp)).padding(horizontal = 12.dp, vertical = 8.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("İlk 5 Öğrenci", fontSize = 12.sp, color = Color(0xFF334155))
                    Spacer(modifier = Modifier.width(16.dp))
                    Icon(Icons.Default.ArrowDropDown, contentDescription = null, modifier = Modifier.size(16.dp))
                }
            }
        }
        
        Spacer(modifier = Modifier.height(16.dp))
        
        val leaderboardData = students.sortedByDescending { it.stars }.take(5)
        
        LazyColumn(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            items(leaderboardData.size) { i ->
                val d = leaderboardData[i]
                val isFirst = i == 0
                Card(
                    modifier = Modifier.fillMaxWidth().height(64.dp),
                    colors = CardDefaults.cardColors(containerColor = if (isFirst) Color(0xFFFEF3C7) else Color.White),
                    border = BorderStroke(1.dp, if (isFirst) Color(0xFFFDE047) else Color(0xFFF1F5F9)),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxSize().padding(horizontal = 16.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(
                                modifier = Modifier.size(36.dp).clip(CircleShape).background(if(isFirst) Color(0xFFF59E0B) else Color(0xFFE2E8F0)),
                                contentAlignment = Alignment.Center
                            ) {
                                Text("${i + 1}", fontWeight = FontWeight.Black, color = if(isFirst) Color.White else Color(0xFF475569))
                            }
                            Spacer(modifier = Modifier.width(16.dp))
                            Column {
                                Text("${d.name} ${d.surname}", fontWeight = FontWeight.Black, fontSize = 14.sp, color = Color(0xFF0F172A))
                                Text("Okul No: ${d.studentNo}", fontSize = 11.sp, color = Color(0xFF64748B))
                            }
                        }
                        
                        Column(horizontalAlignment = Alignment.End) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text(d.stars.toString(), fontWeight = FontWeight.Black, fontSize = 18.sp, color = if(isFirst) Color(0xFFD97706) else Color(0xFFE11D48))
                                if (isFirst) {
                                    Spacer(modifier = Modifier.width(4.dp))
                                    Icon(Icons.Default.AutoAwesome, contentDescription = null, tint = Color(0xFFD97706), modifier = Modifier.size(16.dp))
                                }
                            }
                            Text("YILDIZ", fontSize = 9.sp, fontWeight = FontWeight.Bold, color = Color(0xFF94A3B8))
                        }
                    }
                }
            }
        }
    }
}
