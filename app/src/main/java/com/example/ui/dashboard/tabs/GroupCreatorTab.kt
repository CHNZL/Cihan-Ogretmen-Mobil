package com.example.ui.dashboard.tabs

import android.content.Context
import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.example.auth.UserData
import com.example.data.FirestoreRepository
import com.example.data.Student
import org.json.JSONArray
import org.json.JSONObject
import java.io.File

@OptIn(ExperimentalLayoutApi::class, ExperimentalMaterial3Api::class)
@Composable
fun GroupCreatorTab(
    userData: UserData,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()
    val firestoreRepository = remember { FirestoreRepository() }

    // State Variables
    var students by remember { mutableStateOf<List<Student>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    
    // Grouping Configurations
    var groupingType by remember { mutableStateOf(0) } // 0 = scale by group count, 1 = scale by students per group
    var groupCountInput by remember { mutableStateOf(5) }
    var studentsPerGroupInput by remember { mutableStateOf(5) }

    // Dialog & Interactive State
    var showStudentSelectionDialog by remember { mutableStateOf(false) }
    var showSettingsConfirmDialog by remember { mutableStateOf(false) }
    var excludedStudentIds by remember { mutableStateOf(setOf<String>()) }
    var genderBalanceEnabled by remember { mutableStateOf(true) }

    // Generated & Active State
    var isGroupingCreated by remember { mutableStateOf(false) }
    var manualModeActive by remember { mutableStateOf(false) }
    var showManualStudentListPanel by remember { mutableStateOf(false) }
    
    // Loaded / Shared Groups structure (List of Pair: Group Name, List of Students)
    var activeGroups by remember { mutableStateOf<List<Pair<String, List<Student>>>>(emptyList()) }

    // Internal state variables
    var isZoomedIn by remember { mutableStateOf(false) }

    // Load initial students & saved state
    LaunchedEffect(userData.teacherUid) {
        isLoading = true
        students = firestoreRepository.getStudents(userData.teacherUid)
        
        // Try to load any saved groupings
        val saved = loadSavedGroupings(context, userData.teacherUid, students)
        if (saved != null) {
            activeGroups = saved.first
            manualModeActive = saved.second
            isGroupingCreated = true
        }
        isLoading = false
    }

    // PDF Export launcher
    val pdfExportLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.CreateDocument("application/pdf")
    ) { uri ->
        if (uri != null && activeGroups.isNotEmpty()) {
            exportGroupsToPdf(context, uri, activeGroups)
            Toast.makeText(context, "Grup planı PDF olarak kaydedildi.", Toast.LENGTH_SHORT).show()
        }
    }

    // Reset current configuration or groupings
    fun handleNewPlan() {
        activeGroups = emptyList()
        isGroupingCreated = false
        manualModeActive = false
        excludedStudentIds = emptySet()
    }

    // Shuffling Logic
    fun handleGenerateGroups() {
        val activeStudents = students.filter { it.id !in excludedStudentIds }
        if (activeStudents.isEmpty()) {
            Toast.makeText(context, "Sınıfta aktif öğrenci yok!", Toast.LENGTH_SHORT).show()
            return
        }

        val totalActive = activeStudents.size

        // Calculate total groups
        val numGroups = if (groupingType == 0) {
            groupCountInput.coerceIn(1, totalActive)
        } else {
            val p = studentsPerGroupInput.coerceIn(1, totalActive)
            ((totalActive + p - 1) / p).coerceIn(1, totalActive)
        }

        // Initialize empty lists for groups
        val localGroups = List(numGroups) { mutableListOf<Student>() }

        if (genderBalanceEnabled) {
            val girls = activeStudents.filter { it.gender.equals("Kız", ignoreCase = true) }.shuffled()
            val boys = activeStudents.filter { !it.gender.equals("Kız", ignoreCase = true) }.shuffled()

            var groupIdx = 0
            for (girl in girls) {
                localGroups[groupIdx].add(girl)
                groupIdx = (groupIdx + 1) % numGroups
            }

            for (boy in boys) {
                localGroups[groupIdx].add(boy)
                groupIdx = (groupIdx + 1) % numGroups
            }
        } else {
            val shuffled = activeStudents.shuffled()
            var groupIdx = 0
            for (student in shuffled) {
                localGroups[groupIdx].add(student)
                groupIdx = (groupIdx + 1) % numGroups
            }
        }

        // Maps to Pair representation
        activeGroups = localGroups.mapIndexed { i, list ->
            Pair("GRUP ${i + 1}", list.toList())
        }
        isGroupingCreated = true
        manualModeActive = false
    }

    // Manual Creation Setup
    fun handleStartManualMode() {
        val activeStudents = students.filter { it.id !in excludedStudentIds }
        // Setup initial empty groups
        val initialCount = if (groupingType == 0) groupCountInput else 5
        activeGroups = List(initialCount) { i ->
            Pair("GRUP ${i + 1}", emptyList<Student>())
        }
        isGroupingCreated = true
        manualModeActive = true
    }

    // Persistent storage helpers
    fun handleSaveGroups() {
        saveGroupings(context, userData.teacherUid, activeGroups, manualModeActive)
        Toast.makeText(context, "Grup planı başarıyla kaydedildi.", Toast.LENGTH_SHORT).show()
    }

    if (isLoading) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            CircularProgressIndicator(color = Color(0xFF14B8A6))
        }
        return
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .padding(16.dp)
    ) {
        // --- TOP HEADER SECTION ---
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = 16.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
            shape = RoundedCornerShape(16.dp)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp)
            ) {
                if (isGroupingCreated) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        IconButton(
                            onClick = { isGroupingCreated = false },
                            modifier = Modifier.padding(end = 4.dp)
                        ) {
                            Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Geri Git", tint = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                        Text("Gruplar", fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface)
                    }
                    Spacer(modifier = Modifier.height(12.dp))
                }

                // Header buttons row underneath (highly responsive)
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    if (isGroupingCreated) {
                        Button(
                            onClick = { handleNewPlan() },
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFF1F5F9), contentColor = Color(0xFF475569)),
                            shape = RoundedCornerShape(10.dp),
                            contentPadding = PaddingValues(horizontal = 8.dp),
                            modifier = Modifier.weight(1f).height(38.dp)
                        ) {
                            Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(14.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("Yeni Plan", fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
                        }
                    }

                    Button(
                        onClick = { handleSaveGroups() },
                        enabled = activeGroups.isNotEmpty(),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = Color(0xFF6366F1),
                            contentColor = Color.White,
                            disabledContainerColor = Color(0xFFF1F5F9),
                            disabledContentColor = Color(0xFF94A3B8)
                        ),
                        shape = RoundedCornerShape(10.dp),
                        contentPadding = PaddingValues(horizontal = 8.dp),
                        modifier = Modifier
                            .weight(1f)
                            .height(38.dp)
                            .testTag("save_group_button")
                    ) {
                        Icon(Icons.Default.Save, contentDescription = null, modifier = Modifier.size(14.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Kaydet", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                    }

                    Button(
                        onClick = { pdfExportLauncher.launch("grup-dağılımı.pdf") },
                        enabled = activeGroups.isNotEmpty(),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = Color(0xFF0EA5E9),
                            contentColor = Color.White,
                            disabledContainerColor = Color(0xFFF1F5F9),
                            disabledContentColor = Color(0xFF94A3B8)
                        ),
                        shape = RoundedCornerShape(10.dp),
                        contentPadding = PaddingValues(horizontal = 8.dp),
                        modifier = Modifier
                            .weight(1f)
                            .height(38.dp)
                            .testTag("download_pdf_button")
                    ) {
                        Icon(Icons.Default.Download, contentDescription = null, modifier = Modifier.size(14.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("İndir", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }

        // --- SUB CONTENT ---
        if (!isGroupingCreated) {
            // STEP 1: CONFIGURE STATE - Adaptive vertical layout for non-squished mobile view
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f)
                    .verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                // Type Selection Selector Cards
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    // Card 1: By Group Count
                    Card(
                        modifier = Modifier
                            .weight(1f)
                            .clickable { groupingType = 0 }
                            .border(
                                width = 2.dp,
                                color = if (groupingType == 0) Color(0xFF0EA5E9) else Color.Transparent,
                                shape = RoundedCornerShape(14.dp)
                            ),
                        colors = CardDefaults.cardColors(
                            containerColor = if (groupingType == 0) Color(0xFFF0F9FF) else Color.White
                        ),
                        shape = RoundedCornerShape(14.dp)
                    ) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(16.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Icon(
                                Icons.Default.GridView,
                                contentDescription = null,
                                tint = if (groupingType == 0) Color(0xFF0EA5E9) else Color(0xFF94A3B8),
                                modifier = Modifier.size(32.dp)
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(
                                text = "Grup Sayısına Göre",
                                fontWeight = FontWeight.Bold,
                                color = if (groupingType == 0) Color(0xFF0369A1) else Color(0xFF475569),
                                fontSize = 13.sp,
                                textAlign = TextAlign.Center
                            )
                        }
                    }

                    // Card 2: By Student Size Count
                    Card(
                        modifier = Modifier
                            .weight(1f)
                            .clickable { groupingType = 1 }
                            .border(
                                width = 2.dp,
                                color = if (groupingType == 1) Color(0xFF0EA5E9) else Color.Transparent,
                                shape = RoundedCornerShape(14.dp)
                            ),
                        colors = CardDefaults.cardColors(
                            containerColor = if (groupingType == 1) Color(0xFFF0F9FF) else Color.White
                        ),
                        shape = RoundedCornerShape(14.dp)
                    ) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(16.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Icon(
                                Icons.Default.Person,
                                contentDescription = null,
                                tint = if (groupingType == 1) Color(0xFF0EA5E9) else Color(0xFF94A3B8),
                                modifier = Modifier.size(32.dp)
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(
                                text = "Kişi Sayısına Göre",
                                fontWeight = FontWeight.Bold,
                                color = if (groupingType == 1) Color(0xFF0369A1) else Color(0xFF475569),
                                fontSize = 13.sp,
                                textAlign = TextAlign.Center
                            )
                        }
                    }
                }

                // Count Selection Custom Counter Panel Card
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = Color.White),
                    shape = RoundedCornerShape(16.dp),
                    border = BorderStroke(1.dp, Color(0xFFE2E8F0))
                ) {
                    Column(
                        modifier = Modifier.padding(16.dp)
                    ) {
                        Text(
                            text = if (groupingType == 0) "Hedef Grup Sayısı" else "Grup Başına Kişi Sayısı",
                            fontWeight = FontWeight.Bold,
                            fontSize = 14.sp,
                            color = Color(0xFF475569),
                            modifier = Modifier.padding(bottom = 8.dp)
                        )

                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(Color(0xFFF1F5F9), RoundedCornerShape(12.dp))
                                .padding(6.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            IconButton(
                                onClick = {
                                    if (groupingType == 0) {
                                        if (groupCountInput > 1) groupCountInput--
                                    } else {
                                        if (studentsPerGroupInput > 1) studentsPerGroupInput--
                                    }
                                },
                                modifier = Modifier
                                    .size(40.dp)
                                    .background(Color.White, RoundedCornerShape(8.dp))
                            ) {
                                Icon(Icons.Default.Remove, contentDescription = "Eksilt", tint = Color(0xFF475569))
                            }

                            Text(
                                text = if (groupingType == 0) "$groupCountInput" else "$studentsPerGroupInput",
                                fontSize = 20.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color(0xFF0F172A),
                                textAlign = TextAlign.Center,
                                modifier = Modifier.weight(1f)
                            )

                            IconButton(
                                onClick = {
                                    val limit = students.size.coerceAtLeast(1)
                                    if (groupingType == 0) {
                                        if (groupCountInput < limit) groupCountInput++
                                    } else {
                                        if (studentsPerGroupInput < limit) studentsPerGroupInput++
                                    }
                                },
                                modifier = Modifier
                                    .size(40.dp)
                                    .background(Color.White, RoundedCornerShape(8.dp))
                            ) {
                                Icon(Icons.Default.Add, contentDescription = "Arttır", tint = Color(0xFF475569))
                            }
                        }
                    }
                }

                // Info Preview Card (no horizontal squeezing)
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = Color.White),
                    shape = RoundedCornerShape(16.dp),
                    border = BorderStroke(1.dp, Color(0xFFE2E8F0))
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Text(
                            text = "DAĞILIM ÖNİZLEME",
                            fontWeight = FontWeight.Bold,
                            fontSize = 12.sp,
                            color = Color(0xFF475569),
                            modifier = Modifier.padding(bottom = 8.dp)
                        )

                        // Preview calculations
                        val activeStudentCount = students.size - excludedStudentIds.size
                        val computedGroups = if (groupingType == 0) {
                            groupCountInput.coerceIn(1, activeStudentCount.coerceAtLeast(1))
                        } else {
                            val p = studentsPerGroupInput.coerceIn(1, activeStudentCount.coerceAtLeast(1))
                            ((activeStudentCount + p - 1) / p).coerceIn(1, activeStudentCount.coerceAtLeast(1))
                        }
                        val computedAverage = if (computedGroups > 0) activeStudentCount / computedGroups else 0

                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.Center,
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 8.dp)
                        ) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Text(
                                    text = "$computedGroups",
                                    fontSize = 32.sp,
                                    fontWeight = FontWeight.Black,
                                    color = Color(0xFF0EA5E9)
                                )
                                Text("GRUP", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = Color(0xFF64748B))
                            }

                            Text(
                                text = "×",
                                fontSize = 24.sp,
                                color = Color(0xFFCBD5E1),
                                modifier = Modifier.padding(horizontal = 24.dp)
                            )

                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Text(
                                    text = "$computedAverage",
                                    fontSize = 32.sp,
                                    fontWeight = FontWeight.Black,
                                    color = Color(0xFF0EA5E9)
                                )
                                Text("ÖĞRENCİ (ORT.)", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = Color(0xFF64748B))
                            }
                        }

                        Spacer(modifier = Modifier.height(12.dp))

                        // Brief dynamic distribution label badge
                        Card(
                            colors = CardDefaults.cardColors(containerColor = Color(0xFFF0F9FF)),
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column(
                                modifier = Modifier.padding(12.dp),
                                horizontalAlignment = Alignment.CenterHorizontally
                            ) {
                                Text(
                                    text = "Dağılım Özeti",
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 11.sp,
                                    color = Color(0xFF0284C7),
                                    modifier = Modifier.padding(bottom = 2.dp)
                                )
                                Text(
                                    text = if (groupingType == 0) {
                                        "$groupCountInput adet grubun her birinde yaklaşık $computedAverage öğrenci olacak."
                                    } else {
                                        "Her birinde yaklaşık $studentsPerGroupInput öğrenci olan $computedGroups adet grup oluşturulacak."
                                    },
                                    fontSize = 11.sp,
                                    color = Color(0xFF0369A1),
                                    textAlign = TextAlign.Center
                                )
                            }
                        }
                    }
                }

                // Action Buttons at Bottom of page (stacked/spaced nicely)
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Button(
                        onClick = { showStudentSelectionDialog = true },
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF0EA5E9)),
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier
                            .weight(1.2f)
                            .height(48.dp)
                            .testTag("btn_groups_generate")
                    ) {
                        Text("Oluştur", fontWeight = FontWeight.Bold, fontSize = 14.sp, color = Color.White)
                        Spacer(modifier = Modifier.width(4.dp))
                        Icon(Icons.Default.ArrowForward, contentDescription = null, tint = Color.White, modifier = Modifier.size(16.dp))
                    }

                    OutlinedButton(
                        onClick = { handleStartManualMode() },
                        colors = ButtonDefaults.outlinedButtonColors(contentColor = Color(0xFF475569)),
                        border = BorderStroke(1.dp, Color(0xFFCBD5E1)),
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier
                            .weight(1f)
                            .height(48.dp)
                            .testTag("btn_elle_olustur")
                    ) {
                        Text("Elle Oluştur ✋", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                    }
                }
            }
        } else {
            // STEP 2: GROUP CREATED STATE
            if (!manualModeActive) {
                // AUTOMATIC GENERATION RESULT VIEW (Grid columns) - properly weights in layout tree
                Column(modifier = Modifier.fillMaxWidth().weight(1f)) {
                    // Reshuffle action Bar & Zoom Button
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(bottom = 12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Button(
                            onClick = { handleGenerateGroups() },
                            colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.surface, contentColor = MaterialTheme.colorScheme.onSurface),
                            elevation = ButtonDefaults.buttonElevation(defaultElevation = 1.dp),
                            border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
                            shape = RoundedCornerShape(8.dp),
                            contentPadding = PaddingValues(horizontal = 14.dp, vertical = 6.dp)
                        ) {
                            Icon(Icons.Default.Refresh, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("Grupları Yeniden Karıştır", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                        }

                        FloatingActionButton(
                            onClick = { isZoomedIn = !isZoomedIn },
                            modifier = Modifier.size(40.dp),
                            containerColor = MaterialTheme.colorScheme.primaryContainer,
                            shape = CircleShape
                        ) {
                            Icon(
                                imageVector = if (isZoomedIn) Icons.Default.ZoomOut else Icons.Default.ZoomIn, 
                                contentDescription = "Büyüteç",
                                modifier = Modifier.size(20.dp),
                                tint = MaterialTheme.colorScheme.onPrimaryContainer
                            )
                        }
                    }

                    Box(modifier = Modifier.fillMaxWidth().weight(1f)) {
                        val scrollState = rememberScrollState()
                        
                        val rowModifier = if (isZoomedIn) {
                            Modifier.fillMaxSize().horizontalScroll(scrollState)
                        } else {
                            Modifier.fillMaxWidth().wrapContentHeight()
                        }
                        
                        Row(
                            modifier = rowModifier,
                            horizontalArrangement = if (isZoomedIn) Arrangement.spacedBy(16.dp) else Arrangement.spacedBy(4.dp),
                            verticalAlignment = Alignment.Top
                        ) {
                            for (groupPair in activeGroups) {
                                val groupName = groupPair.first
                                val list = groupPair.second

                                val cardModifier = if (isZoomedIn) {
                                    Modifier.width(280.dp).fillMaxHeight()
                                } else {
                                    Modifier.weight(1f).fillMaxHeight()
                                }

                                Card(
                                    modifier = cardModifier,
                                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                                    elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
                                    shape = RoundedCornerShape(16.dp),
                                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant)
                                ) {
                                Column(modifier = Modifier.padding(if (isZoomedIn) 14.dp else 4.dp)) {
                                    // Header Box with group label & child count
                                    Row(
                                        modifier = Modifier.fillMaxWidth().padding(bottom = if (isZoomedIn) 12.dp else 4.dp),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Text(
                                            groupName.replace("GRUP", if (isZoomedIn) "GRUP" else "G."), 
                                            fontWeight = FontWeight.Bold, 
                                            color = MaterialTheme.colorScheme.onSurface, 
                                            fontSize = if (isZoomedIn) 14.sp else 9.sp,
                                            maxLines = 1
                                        )
                                        Box(
                                            modifier = Modifier
                                                .background(MaterialTheme.colorScheme.surfaceVariant, RoundedCornerShape(6.dp))
                                                .padding(horizontal = if (isZoomedIn) 8.dp else 4.dp, vertical = if (isZoomedIn) 2.dp else 1.dp)
                                        ) {
                                            Text("${list.size}", fontSize = if (isZoomedIn) 10.sp else 8.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                        }
                                    }

                                    // List of students inside this column
                                    LazyColumn(
                                        verticalArrangement = Arrangement.spacedBy(if (isZoomedIn) 8.dp else 4.dp),
                                        modifier = Modifier.weight(1f)
                                    ) {
                                        items(list) { student ->
                                            StudentMiniCard(student = student, isZoomedIn = isZoomedIn)
                                        }
                                    }
                                }
                            }
                        }
                    }
                    }
                }
            } else {
                // --- MANUAL ("ELLE OLUŞTUR") VIEW ---
                val assignedStudentIds = remember(activeGroups) {
                    activeGroups.flatMap { it.second }.map { it.id }.toSet()
                }
                val unassignedStudents = remember(students, assignedStudentIds, excludedStudentIds) {
                    students.filter { it.id !in assignedStudentIds && it.id !in excludedStudentIds }
                }

                Column(
                    modifier = Modifier.fillMaxWidth().weight(1f)
                ) {
                    // Modern Mode Selector and Status Alert Bar
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(bottom = 12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        // Left: Segmented controls to toggle Student List Panel
                        Row(
                            modifier = Modifier
                                .background(Color(0xFFE2E8F0), RoundedCornerShape(10.dp))
                                .padding(3.dp),
                            horizontalArrangement = Arrangement.spacedBy(4.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            val selectedBg = Color.White
                            val selectedText = Color(0xFF0F172A)
                            val unselectedBg = Color.Transparent
                            val unselectedText = Color(0xFF64748B)

                            // Option 1: Sadece Gruplar (Groups Only)
                            Box(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(if (!showManualStudentListPanel) selectedBg else unselectedBg)
                                    .clickable { showManualStudentListPanel = false }
                                    .padding(horizontal = 12.dp, vertical = 6.dp),
                                contentAlignment = Alignment.Center
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(
                                        Icons.Default.GridView,
                                        contentDescription = null,
                                        tint = if (!showManualStudentListPanel) Color(0xFF14B8A6) else unselectedText,
                                        modifier = Modifier.size(14.dp)
                                    )
                                    Spacer(modifier = Modifier.width(4.dp))
                                    Text(
                                        "Sadece Gruplar",
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = if (!showManualStudentListPanel) selectedText else unselectedText
                                    )
                                }
                            }

                            // Option 2: Bölünmüş Görünüm (Split view showing sidebar)
                            Box(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(if (showManualStudentListPanel) selectedBg else unselectedBg)
                                    .clickable { showManualStudentListPanel = true }
                                    .padding(horizontal = 12.dp, vertical = 6.dp),
                                contentAlignment = Alignment.Center
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(
                                        Icons.Default.Person,
                                        contentDescription = null,
                                        tint = if (showManualStudentListPanel) Color(0xFF14B8A6) else unselectedText,
                                        modifier = Modifier.size(14.dp)
                                    )
                                    Spacer(modifier = Modifier.width(4.dp))
                                    Text(
                                        "Bölünmüş Görünüm",
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = if (showManualStudentListPanel) selectedText else unselectedText
                                    )
                                }
                            }
                        }

                        // Rightside: Indicator Badge for unassigned students
                        if (!showManualStudentListPanel && unassignedStudents.isNotEmpty()) {
                            Card(
                                colors = CardDefaults.cardColors(containerColor = Color(0xFFFEF3C7)),
                                shape = RoundedCornerShape(8.dp),
                                border = BorderStroke(1.dp, Color(0xFFFDE68A))
                            ) {
                                Row(
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 5.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Box(
                                        modifier = Modifier
                                            .size(6.dp)
                                            .clip(CircleShape)
                                            .background(Color(0xFFF59E0B))
                                    )
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text(
                                        "${unassignedStudents.size} Öğrenci Boşta",
                                        fontSize = 10.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = Color(0xFFB45309)
                                    )
                                }
                            }
                        } else if (unassignedStudents.isEmpty()) {
                            Card(
                                colors = CardDefaults.cardColors(containerColor = Color(0xFFECFDF5)),
                                shape = RoundedCornerShape(8.dp),
                                border = BorderStroke(1.dp, Color(0xFFA7F3D0))
                            ) {
                                Row(
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 5.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Icon(
                                        Icons.Default.CheckCircle,
                                        contentDescription = null,
                                        tint = Color(0xFF10B981),
                                        modifier = Modifier.size(12.dp)
                                    )
                                    Spacer(modifier = Modifier.width(4.dp))
                                    Text(
                                        "Yerleşim Tamamlandı",
                                        fontSize = 10.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = Color(0xFF065F46)
                                    )
                                }
                            }
                        }
                    }

                    Row(
                        modifier = Modifier.fillMaxSize().weight(1f),
                        horizontalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        if (showManualStudentListPanel) {
                            // Left Column: Student List to be assigned
                            Card(
                                modifier = Modifier
                                    .width(260.dp)
                                    .fillMaxHeight(),
                                colors = CardDefaults.cardColors(containerColor = Color.White),
                                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                                shape = RoundedCornerShape(16.dp)
                            ) {
                        Column(modifier = Modifier.padding(12.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth().padding(bottom = 12.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(Icons.Default.Person, contentDescription = null, tint = Color(0xFF14B8A6), modifier = Modifier.size(18.dp))
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text("ÖĞRENCİ LİSTESİ", fontWeight = FontWeight.Bold, fontSize = 11.sp, color = Color(0xFF0F172A))
                                }

                                Box(
                                    modifier = Modifier
                                        .size(24.dp)
                                        .clip(CircleShape)
                                        .background(Color(0xFFF1F5F9)),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Text("${unassignedStudents.size}", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = Color(0xFF475569))
                                }
                            }

                            if (unassignedStudents.isEmpty()) {
                                Box(
                                    modifier = Modifier.fillMaxSize().weight(1f),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Text(
                                        "Tüm öğrenciler\ngruplara eklendi.",
                                        fontSize = 11.sp,
                                        color = Color(0xFF94A3B8),
                                        textAlign = TextAlign.Center
                                    )
                                }
                            } else {
                                LazyColumn(
                                    verticalArrangement = Arrangement.spacedBy(8.dp),
                                    modifier = Modifier.weight(1f)
                                ) {
                                    items(unassignedStudents) { student ->
                                        Row(
                                            modifier = Modifier
                                                .fillMaxWidth()
                                                .background(Color(0xFFF8FAFC), RoundedCornerShape(8.dp))
                                                .border(1.dp, Color(0xFFE2E8F0), RoundedCornerShape(8.dp))
                                                .padding(horizontal = 10.dp, vertical = 6.dp),
                                            verticalAlignment = Alignment.CenterVertically,
                                            horizontalArrangement = Arrangement.SpaceBetween
                                        ) {
                                            // Badge for gender
                                            val isGirl = student.gender.equals("Kız", ignoreCase = true)
                                            val badgeBg = if (isGirl) Color(0xFFFCE7F3) else Color(0xFFE0F2FE)
                                            val badgeText = if (isGirl) Color(0xFFDB2777) else Color(0xFF0369A1)

                                            Row(
                                                verticalAlignment = Alignment.CenterVertically,
                                                modifier = Modifier.weight(1f)
                                            ) {
                                                Box(
                                                    modifier = Modifier
                                                        .clip(RoundedCornerShape(4.dp))
                                                        .background(badgeBg)
                                                        .padding(horizontal = 6.dp, vertical = 1.dp)
                                                ) {
                                                    Text(
                                                        student.studentNo.ifEmpty { "0" },
                                                        fontSize = 9.sp,
                                                        color = badgeText,
                                                        fontWeight = FontWeight.Bold
                                                    )
                                                }
                                                Spacer(modifier = Modifier.width(8.dp))
                                                Text(
                                                    "${student.name} ${student.surname}",
                                                    fontSize = 11.sp,
                                                    fontWeight = FontWeight.SemiBold,
                                                    color = Color(0xFF334155),
                                                    maxLines = 1
                                                )
                                            }

                                            // Plus icon to add to active groups
                                            IconButton(
                                                onClick = {
                                                    // Add to the first group, or if multiple exist, show a dialog,
                                                    // or simply add the student to the active group.
                                                    if (activeGroups.isNotEmpty()) {
                                                        // Automatically add it to the first group, or we can let them click "+ ÖĞRENCİ EKLE" inside group card.
                                                        // To make clicking '+' extremely intuitive, we add it to the first group by default, and user can switch him if they want!
                                                        val updated = activeGroups.toMutableList()
                                                        val firstGroupPair = updated[0]
                                                        updated[0] = Pair(firstGroupPair.first, firstGroupPair.second + student)
                                                        activeGroups = updated
                                                    }
                                                },
                                                modifier = Modifier.size(24.dp)
                                            ) {
                                                Icon(Icons.Default.Add, contentDescription = "Ekle", tint = Color(0xFF14B8A6), modifier = Modifier.size(16.dp))
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                    }

                    // Right Side: Horizontal groups list with empty state card + option to add empty group card
                    val scrollState = rememberScrollState()
                    var showStudentPickerForGroupIndex by remember { mutableStateOf<Int?>(null) }

                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .weight(1f)
                            .horizontalScroll(scrollState),
                        horizontalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        activeGroups.forEachIndexed { groupIndex, groupPair ->
                            val groupName = groupPair.first
                            val list = groupPair.second

                            Card(
                                modifier = Modifier
                                    .width(260.dp)
                                    .fillMaxHeight(),
                                colors = CardDefaults.cardColors(containerColor = Color.White),
                                elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
                                shape = RoundedCornerShape(16.dp)
                            ) {
                                Column(modifier = Modifier.padding(12.dp)) {
                                    Row(
                                        modifier = Modifier.fillMaxWidth().padding(bottom = 12.dp),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Text(groupName, fontWeight = FontWeight.Bold, color = Color(0xFF0F172A), fontSize = 13.sp)
                                        Box(
                                            modifier = Modifier
                                                .background(Color(0xFFF1F5F9), RoundedCornerShape(6.dp))
                                                .padding(horizontal = 6.dp, vertical = 2.dp)
                                        ) {
                                            Text("${list.size} ÖĞRENCİ", fontSize = 9.sp, fontWeight = FontWeight.Bold, color = Color(0xFF475569))
                                        }
                                    }

                                    // List of students in manual group
                                    LazyColumn(
                                        verticalArrangement = Arrangement.spacedBy(6.dp),
                                        modifier = Modifier.weight(1f)
                                    ) {
                                        items(list) { student ->
                                            Row(
                                                modifier = Modifier
                                                    .fillMaxWidth()
                                                    .background(Color.White, RoundedCornerShape(8.dp))
                                                    .border(1.dp, Color(0xFFE2E8F0), RoundedCornerShape(8.dp))
                                                    .padding(horizontal = 8.dp, vertical = 6.dp),
                                                verticalAlignment = Alignment.CenterVertically,
                                                horizontalArrangement = Arrangement.SpaceBetween
                                            ) {
                                                val isGirl = student.gender.equals("Kız", ignoreCase = true)
                                                val badgeBg = if (isGirl) Color(0xFFFCE7F3) else Color(0xFFE0F2FE)
                                                val badgeText = if (isGirl) Color(0xFFDB2777) else Color(0xFF0369A1)

                                                Row(
                                                    verticalAlignment = Alignment.CenterVertically,
                                                    modifier = Modifier.weight(1f)
                                                ) {
                                                    Box(
                                                        modifier = Modifier
                                                            .clip(RoundedCornerShape(4.dp))
                                                            .background(badgeBg)
                                                            .padding(horizontal = 5.dp, vertical = 1.dp)
                                                    ) {
                                                        Text(
                                                            student.studentNo.ifEmpty { "0" },
                                                            fontSize = 8.sp,
                                                            color = badgeText,
                                                            fontWeight = FontWeight.Bold
                                                        )
                                                    }
                                                    Spacer(modifier = Modifier.width(6.dp))
                                                    Text(
                                                        "${student.name} ${student.surname}",
                                                        fontSize = 10.sp,
                                                        color = Color(0xFF1E293B),
                                                        maxLines = 1
                                                    )
                                                }

                                                IconButton(
                                                    onClick = {
                                                        // Remove from group
                                                        val updated = activeGroups.toMutableList()
                                                        updated[groupIndex] = Pair(groupName, list.filter { it.id != student.id })
                                                        activeGroups = updated
                                                    },
                                                    modifier = Modifier.size(20.dp)
                                                ) {
                                                    Icon(Icons.Default.Close, contentDescription = "Sil", tint = Color.LightGray, modifier = Modifier.size(12.dp))
                                                }
                                            }
                                        }

                                        // + ADD STUDENT BUTTON AT THE END CORNER
                                        item {
                                            Box(
                                                modifier = Modifier
                                                    .fillMaxWidth()
                                                    .height(38.dp)
                                                    .clip(RoundedCornerShape(8.dp))
                                                    .border(1.dp, Color(0xFFCBD5E1), RoundedCornerShape(8.dp))
                                                    .clickable {
                                                        showStudentPickerForGroupIndex = groupIndex
                                                    },
                                                contentAlignment = Alignment.Center
                                            ) {
                                                Row(verticalAlignment = Alignment.CenterVertically) {
                                                    Icon(Icons.Default.Add, contentDescription = null, tint = Color(0xFF14B8A6), modifier = Modifier.size(14.dp))
                                                    Spacer(modifier = Modifier.width(4.dp))
                                                    Text("ÖĞRENCİ EKLE", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = Color(0xFF0284C7))
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }

                        // Far Right Card: Add New Empty Group Column
                        Card(
                            modifier = Modifier
                                .width(220.dp)
                                .fillMaxHeight()
                                .border(1.dp, Color(0xFFE2E8F0), RoundedCornerShape(16.dp))
                                .clickable {
                                    val newGroupIndex = activeGroups.size + 1
                                    activeGroups = activeGroups + Pair("GRUP $newGroupIndex", emptyList<Student>())
                                },
                            colors = CardDefaults.cardColors(containerColor = Color(0xFFF8FAFC)),
                            shape = RoundedCornerShape(16.dp)
                        ) {
                            Box(
                                modifier = Modifier.fillMaxSize(),
                                contentAlignment = Alignment.Center
                            ) {
                                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                    Icon(
                                        Icons.Default.Add,
                                        contentDescription = null,
                                        tint = Color(0xFF14B8A6),
                                        modifier = Modifier.size(32.dp)
                                    )
                                    Spacer(modifier = Modifier.height(10.dp))
                                    Text(
                                        "YENİ GRUP EKLE",
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 11.sp,
                                        color = Color(0xFF64748B)
                                    )
                                }
                            }
                        }
                    }

                    // Subordinated student assignment dropdown selection list
                    showStudentPickerForGroupIndex?.let { targetGroupIdx ->
                        Dialog(onDismissRequest = { showStudentPickerForGroupIndex = null }) {
                            Card(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(16.dp)
                                    .heightIn(max = 400.dp),
                                shape = RoundedCornerShape(16.dp),
                                colors = CardDefaults.cardColors(containerColor = Color.White)
                            ) {
                                Column(modifier = Modifier.padding(16.dp)) {
                                    Text(
                                        "Öğrenci Seçin (${activeGroups[targetGroupIdx].first})",
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 15.sp,
                                        modifier = Modifier.padding(bottom = 12.dp)
                                    )

                                    if (unassignedStudents.isEmpty()) {
                                        Text("Uygulanabilir başka öğrenci yok.", color = Color.Gray, fontSize = 12.sp)
                                    } else {
                                        LazyColumn(
                                            verticalArrangement = Arrangement.spacedBy(8.dp),
                                            modifier = Modifier.weight(1f)
                                        ) {
                                            items(unassignedStudents) { student ->
                                                Row(
                                                    modifier = Modifier
                                                        .fillMaxWidth()
                                                        .clickable {
                                                            val updated = activeGroups.toMutableList()
                                                            val orig = updated[targetGroupIdx]
                                                            updated[targetGroupIdx] = Pair(orig.first, orig.second + student)
                                                            activeGroups = updated
                                                            showStudentPickerForGroupIndex = null
                                                        }
                                                        .background(Color(0xFFF1F5F9), RoundedCornerShape(8.dp))
                                                        .padding(10.dp),
                                                    verticalAlignment = Alignment.CenterVertically
                                                ) {
                                                    Text(
                                                        "${student.studentNo} - ${student.name} ${student.surname}",
                                                        fontSize = 12.sp,
                                                        fontWeight = FontWeight.Medium
                                                    )
                                                }
                                            }
                                        }
                                    }

                                    Spacer(modifier = Modifier.height(12.dp))
                                    TextButton(
                                        onClick = { showStudentPickerForGroupIndex = null },
                                        modifier = Modifier.align(Alignment.End)
                                    ) {
                                        Text("Vazgeç")
                                    }
                                }
                            }
                        }
                    }
                }
                }
            }
        }

        // --- STAGE 2A: STUDENT EXCLUDE SELECTION DIALOG (ABSENCE SELECTOR) ---
        if (showStudentSelectionDialog) {
            Dialog(onDismissRequest = { showStudentSelectionDialog = false }) {
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(12.dp)
                        .height(550.dp),
                    shape = RoundedCornerShape(20.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White)
                ) {
                    Column(modifier = Modifier.padding(20.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth().padding(bottom = 14.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Default.Shuffle, contentDescription = null, tint = Color(0xFF14B8A6))
                                Spacer(modifier = Modifier.width(8.dp))
                                Column {
                                    Text("ÖĞRENCİ SEÇİMİ", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = Color(0xFF0F172A))
                                    Text("Sınıfta olmayanları çıkarın", fontSize = 11.sp, color = Color(0xFF64748B))
                                }
                            }

                            Column(horizontalAlignment = Alignment.End) {
                                Text("${students.size}", fontWeight = FontWeight.Black, fontSize = 18.sp, color = Color(0xFF0EA5E9))
                                Text("MEVCUT", fontSize = 9.sp, fontWeight = FontWeight.Bold, color = Color(0xFF64748B))
                            }
                        }

                        // Scrollable List of Students with checkmark toggle
                        LazyColumn(
                            modifier = Modifier.weight(1f),
                            verticalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            items(students) { student ->
                                val isChecked = student.id !in excludedStudentIds
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .background(Color(0xFFF1F5F9), RoundedCornerShape(12.dp))
                                        .clickable {
                                            excludedStudentIds = if (isChecked) {
                                                excludedStudentIds + student.id
                                            } else {
                                                excludedStudentIds - student.id
                                            }
                                        }
                                        .padding(horizontal = 14.dp, vertical = 10.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        val isGirl = student.gender.equals("Kız", ignoreCase = true)
                                        val badgeBg = if (isGirl) Color(0xFFFCE7F3) else Color(0xFFE0F2FE)
                                        val badgeText = if (isGirl) Color(0xFFDB2777) else Color(0xFF0369A1)

                                        Box(
                                            modifier = Modifier
                                                .clip(RoundedCornerShape(6.dp))
                                                .background(badgeBg)
                                                .padding(horizontal = 8.dp, vertical = 2.dp)
                                        ) {
                                            Text(
                                                student.studentNo.ifEmpty { "0" },
                                                fontSize = 10.sp,
                                                color = badgeText,
                                                fontWeight = FontWeight.Bold
                                            )
                                        }
                                        Spacer(modifier = Modifier.width(12.dp))
                                        Text(
                                            "${student.name} ${student.surname}",
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 13.sp,
                                            color = Color(0xFF1E293B)
                                        )
                                    }

                                    Icon(
                                        imageVector = if (isChecked) Icons.Default.CheckCircle else Icons.Default.RadioButtonUnchecked,
                                        contentDescription = "Onay",
                                        tint = if (isChecked) Color(0xFF10B981) else Color(0xFF94A3B8),
                                        modifier = Modifier.size(24.dp)
                                    )
                                }
                            }
                        }

                        Spacer(modifier = Modifier.height(14.dp))

                        Button(
                            onClick = {
                                showStudentSelectionDialog = false
                                showSettingsConfirmDialog = true
                            },
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF0EA5E9)),
                            shape = CircleShape,
                            modifier = Modifier.fillMaxWidth().height(48.dp).testTag("select_dialog_continue")
                        ) {
                            Text("Devam Et", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                        }
                    }
                }
            }
        }

        // --- STAGE 2B: CONFIRM SETTINGS DETAILS DIRECTIVE DIALOG ---
        if (showSettingsConfirmDialog) {
            Dialog(onDismissRequest = { showSettingsConfirmDialog = false }) {
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(12.dp),
                    shape = RoundedCornerShape(20.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White)
                ) {
                    Column(modifier = Modifier.padding(20.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth().padding(bottom = 12.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Default.Shuffle, contentDescription = null, tint = Color(0xFF14B8A6))
                                Spacer(modifier = Modifier.width(8.dp))
                                Column {
                                    Text("AYARLARI ONAYLA", fontWeight = FontWeight.Bold, fontSize = 15.sp, color = Color(0xFF0F172A))
                                    Text("Grup dağılımı tercihleriniz", fontSize = 11.sp, color = Color(0xFF64748B))
                                }
                            }

                            IconButton(onClick = { showSettingsConfirmDialog = false }) {
                                Icon(Icons.Default.Close, contentDescription = "Kapat", tint = Color.LightGray)
                            }
                        }

                        // Custom Boy-Girl Gender Balance Ratio Switch
                        Card(
                            colors = CardDefaults.cardColors(containerColor = Color(0xFFF8FAFC)),
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp)
                        ) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(14.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text("Kız-Erkek Dağılımı", fontWeight = FontWeight.Bold, fontSize = 13.sp, color = Color(0xFF1E293B))
                                    Text("CİNSİYET DENGESİNİ KORU", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = Color(0xFF94A3B8))
                                }

                                Switch(
                                    checked = genderBalanceEnabled,
                                    onCheckedChange = { genderBalanceEnabled = it },
                                    colors = SwitchDefaults.colors(
                                        checkedThumbColor = Color.White,
                                        checkedTrackColor = Color(0xFF0EA5E9)
                                    ),
                                    modifier = Modifier.testTag("gender_balance_switch")
                                )
                            }
                        }

                        // Info overview summary list
                        val activeStudentCount = students.size - excludedStudentIds.size
                        val totalGroups = if (groupingType == 0) {
                            groupCountInput.coerceIn(1, activeStudentCount.coerceAtLeast(1))
                        } else {
                            val p = studentsPerGroupInput.coerceIn(1, activeStudentCount.coerceAtLeast(1))
                            ((activeStudentCount + p - 1) / p).coerceIn(1, activeStudentCount.coerceAtLeast(1))
                        }

                        Card(
                            colors = CardDefaults.cardColors(containerColor = Color(0xFFF0F9FF)),
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier.fillMaxWidth().padding(vertical = 6.dp)
                        ) {
                            Column(modifier = Modifier.padding(14.dp)) {
                                Row(
                                    modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Text("Toplam Öğrenci:", fontSize = 12.sp, color = Color(0xFF475569))
                                    Text("$activeStudentCount", fontWeight = FontWeight.Bold, fontSize = 12.sp, color = Color(0xFF0369A1))
                                }
                                Row(
                                    modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Text("Grup Sayısı:", fontSize = 12.sp, color = Color(0xFF475569))
                                    Text("$totalGroups", fontWeight = FontWeight.Bold, fontSize = 12.sp, color = Color(0xFF0369A1))
                                }
                            }
                        }

                        Spacer(modifier = Modifier.height(16.dp))

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            Button(
                                onClick = {
                                    showSettingsConfirmDialog = false
                                    showStudentSelectionDialog = true
                                },
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFF1F5F9), contentColor = Color(0xFF475569)),
                                shape = CircleShape,
                                modifier = Modifier.weight(1f).height(44.dp)
                            ) {
                                Text("Geri", fontWeight = FontWeight.Bold)
                            }

                            Button(
                                onClick = {
                                    showSettingsConfirmDialog = false
                                    handleGenerateGroups()
                                },
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF0EA5E9)),
                                shape = CircleShape,
                                modifier = Modifier.weight(1.2f).height(44.dp).testTag("confirm_dialog_start")
                            ) {
                                Text("Başla", fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }
            }
        }
    }
}

// Student Mini Card component representation logic
@Composable
fun StudentMiniCard(student: Student, isZoomedIn: Boolean = true) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(MaterialTheme.colorScheme.surfaceVariant, RoundedCornerShape(10.dp))
            .border(1.dp, MaterialTheme.colorScheme.outlineVariant, RoundedCornerShape(10.dp))
            .padding(if (isZoomedIn) 10.dp else 4.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        val isGirl = student.gender.equals("Kız", ignoreCase = true)
        val isDarkTheme = androidx.compose.foundation.isSystemInDarkTheme()
        val badgeBg = when {
            isGirl -> if (isDarkTheme) Color(0xFF5D2439) else Color(0xFFFFEBEE)
            else -> if (isDarkTheme) Color(0xFF1C3A5A) else Color(0xFFE3F2FD)
        }
        val badgeText = when {
            isGirl -> Color(0xFFDB2777)
            else -> Color(0xFF0369A1)
        }

        Box(
            modifier = Modifier
                .clip(RoundedCornerShape(6.dp))
                .background(badgeBg)
                .padding(horizontal = if (isZoomedIn) 8.dp else 4.dp, vertical = if (isZoomedIn) 2.dp else 1.dp)
        ) {
            Text(
                student.studentNo.ifEmpty { "0" },
                fontSize = if (isZoomedIn) 10.sp else 8.sp,
                color = badgeText,
                fontWeight = FontWeight.Bold
            )
        }
        Spacer(modifier = Modifier.width(if (isZoomedIn) 10.dp else 4.dp))
        Text(
            if (isZoomedIn) "${student.name} ${student.surname}" else "${student.name} ${student.surname.take(1)}.",
            fontWeight = FontWeight.Bold,
            fontSize = if (isZoomedIn) 12.sp else 9.sp,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            maxLines = 1
        )
    }
}

// Persistence Utility logic: save/load local shared preferences JSON string parser
private fun saveGroupings(
    context: Context,
    teacherUid: String,
    groups: List<Pair<String, List<Student>>>,
    manualModeActive: Boolean
) {
    try {
        val root = JSONObject()
        root.put("teacherUid", teacherUid)
        root.put("manualModeActive", manualModeActive)

        val groupsArray = JSONArray()
        for (groupPair in groups) {
            val elementObj = JSONObject()
            elementObj.put("groupName", groupPair.first)

            val studentIdsArray = JSONArray()
            for (student in groupPair.second) {
                studentIdsArray.put(student.id)
            }
            elementObj.put("studentIds", studentIdsArray)
            groupsArray.put(elementObj)
        }
        root.put("groups", groupsArray)

        val sharedPrefs = context.getSharedPreferences("teacher_group_creator", Context.MODE_PRIVATE)
        sharedPrefs.edit()
            .putString("saved_groups_$teacherUid", root.toString())
            .apply()
    } catch (e: Exception) {
        e.printStackTrace()
    }
}

private fun loadSavedGroupings(
    context: Context,
    teacherUid: String,
    allStudents: List<Student>
): Pair<List<Pair<String, List<Student>>>, Boolean>? {
    try {
        val sharedPrefs = context.getSharedPreferences("teacher_group_creator", Context.MODE_PRIVATE)
        val jsonStr = sharedPrefs.getString("saved_groups_$teacherUid", null) ?: return null

        val root = JSONObject(jsonStr)
        val manualModeActive = root.optBoolean("manualModeActive", false)
        val groupsArray = root.getJSONArray("groups")

        val resultList = mutableListOf<Pair<String, List<Student>>>()
        for (i in 0 until groupsArray.length()) {
            val itemObj = groupsArray.getJSONObject(i)
            val groupName = itemObj.getString("groupName")
            val studentIdsArray = itemObj.getJSONArray("studentIds")

            val studentList = mutableListOf<Student>()
            for (j in 0 until studentIdsArray.length()) {
                val sId = studentIdsArray.getString(j)
                val matching = allStudents.find { it.id == sId }
                if (matching != null) {
                    studentList.add(matching)
                }
            }
            resultList.add(Pair(groupName, studentList))
        }

        return Pair(resultList, manualModeActive)
    } catch (e: Exception) {
        e.printStackTrace()
        return null
    }
}
