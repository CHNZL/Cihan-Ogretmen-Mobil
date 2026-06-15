package com.example.ui.dashboard.tabs

import android.widget.Toast
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.example.data.SeatingConfig
import com.example.data.Student

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ManualPlacementScreen(
    students: List<Student>,
    seatingConfig: SeatingConfig,
    initialPlan: Map<String, String>,
    onDismiss: () -> Unit,
    onSave: (Map<String, String>) -> Unit
) {
    val context = LocalContext.current
    var seatingPlan by remember { mutableStateOf(initialPlan) }
    var selectedSeatId by remember { mutableStateOf<String?>(null) }
    var showStudentSelection by remember { mutableStateOf(false) }

    val unassignedStudents = students.filter { student ->
        seatingPlan.values.none { it == student.id }
    }

    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        Surface(
            modifier = Modifier.fillMaxSize(),
            color = Color(0xFFF8FAFC)
        ) {
            Column(modifier = Modifier.fillMaxSize()) {
                // Top Bar
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(Color.White)
                        .padding(16.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        IconButton(onClick = onDismiss) {
                            Icon(Icons.Default.Close, contentDescription = "Kapat")
                        }
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            "Elle Yerleştirme",
                            fontSize = 20.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF1E293B)
                        )
                    }
                    Button(
                        onClick = {
                            onSave(seatingPlan)
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF0284C7)),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Text("Planı Kaydet", fontWeight = FontWeight.Bold)
                    }
                }

                Divider(color = Color(0xFFE2E8F0))

                // Content
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f),
                    contentAlignment = Alignment.Center
                ) {
                    val defaultScrollState = rememberScrollState()
                    val horizontalScrollState = rememberScrollState()
                    Row(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(24.dp)
                            .verticalScroll(defaultScrollState)
                            .horizontalScroll(horizontalScrollState),
                        horizontalArrangement = Arrangement.spacedBy(24.dp)
                    ) {
                        for (groupIdx in 0 until seatingConfig.groupCount) {
                            val rowsInGroup = seatingConfig.rowsPerGroup.getOrElse(groupIdx) { 5 }.coerceAtLeast(1)
                            
                            Column(
                                horizontalAlignment = Alignment.CenterHorizontally,
                                verticalArrangement = Arrangement.spacedBy(16.dp),
                                modifier = Modifier.wrapContentWidth()
                            ) {
                                Text(
                                    "${groupIdx + 1}. GRUP",
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color.Gray,
                                    letterSpacing = 2.sp
                                )
                                
                                for (rowIdx in 0 until rowsInGroup) {
                                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                        for (seatIdx in 0 until seatingConfig.peoplePerRow) {
                                            val seatId = "g$groupIdx-r$rowIdx-s$seatIdx"
                                            val studentId = seatingPlan[seatId]
                                            val student = students.find { it.id == studentId }

                                            val isGirl = student?.gender?.trim()?.lowercase() == "kız"
                                            val isBoy = student?.gender?.trim()?.lowercase() == "erkek"
                                            
                                            val cardBgColor = when {
                                                isGirl -> Color(0xFFFDF2F8) // pink-50
                                                isBoy -> Color(0xFFEFF6FF)  // blue-50
                                                student != null -> Color.White
                                                else -> Color(0xFFF1F5F9)   // slate-100 for empty
                                            }
                                            
                                            val cardBorderColor = when {
                                                isGirl -> Color(0xFFF472B6) // pink-400
                                                isBoy -> Color(0xFF60A5FA)  // blue-400
                                                student != null -> Color(0xFFCBD5E1)
                                                else -> Color(0xFFE2E8F0)
                                            }
                                            
                                            val textNoColor = when {
                                                isGirl -> Color(0xFFDB2777) // pink-600
                                                isBoy -> Color(0xFF2563EB)  // blue-600
                                                else -> Color(0xFF3B82F6)
                                            }

                                            Card(
                                                modifier = Modifier
                                                    .size(width = 100.dp, height = 100.dp)
                                                    .clickable {
                                                        selectedSeatId = seatId
                                                        showStudentSelection = true
                                                    },
                                                colors = CardDefaults.cardColors(
                                                    containerColor = cardBgColor
                                                ),
                                                border = BorderStroke(
                                                    width = if (student != null) 2.dp else 1.dp,
                                                    color = cardBorderColor
                                                ),
                                                shape = RoundedCornerShape(16.dp),
                                                elevation = CardDefaults.cardElevation(defaultElevation = if (student != null) 4.dp else 0.dp)
                                            ) {
                                                Column(
                                                    modifier = Modifier
                                                        .fillMaxSize()
                                                        .padding(8.dp),
                                                    horizontalAlignment = Alignment.CenterHorizontally,
                                                    verticalArrangement = Arrangement.Center
                                                ) {
                                                    if (student != null) {
                                                        Text(
                                                            student.studentNo,
                                                            fontWeight = FontWeight.Black,
                                                            fontSize = 18.sp,
                                                            color = textNoColor,
                                                        )
                                                        Spacer(modifier = Modifier.height(4.dp))
                                                        Text(
                                                            "${student.name} ${student.surname.take(1)}.",
                                                            fontWeight = FontWeight.Bold,
                                                            fontSize = 12.sp,
                                                            color = Color(0xFF1E293B),
                                                            maxLines = 2,
                                                            lineHeight = 14.sp,
                                                            textAlign = TextAlign.Center
                                                        )
                                                    } else {
                                                        Text(
                                                            "ÖĞRENCİ",
                                                            fontSize = 10.sp,
                                                            fontWeight = FontWeight.Bold,
                                                            color = Color(0xFF94A3B8)
                                                        )
                                                        Text(
                                                            "SEÇ",
                                                            fontSize = 10.sp,
                                                            fontWeight = FontWeight.Bold,
                                                            color = Color(0xFF94A3B8)
                                                        )
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
            
            if (showStudentSelection) {
                ModalBottomSheet(
                    onDismissRequest = { showStudentSelection = false },
                    sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = false),
                    containerColor = Color.White
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp)
                    ) {
                        Text(
                            "Öğrenci Seçin",
                            fontSize = 18.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color.Black
                        )
                        Spacer(modifier = Modifier.height(16.dp))
                        
                        // Option to clear seat
                        val existingStudentId = seatingPlan[selectedSeatId]
                        if (existingStudentId != null) {
                            Button(
                                onClick = {
                                    val newPlan = seatingPlan.toMutableMap()
                                    newPlan.remove(selectedSeatId)
                                    seatingPlan = newPlan
                                    showStudentSelection = false
                                },
                                modifier = Modifier.fillMaxWidth(),
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFFEE2E2), contentColor = Color(0xFFDC2626)),
                                shape = RoundedCornerShape(12.dp)
                            ) {
                                Text("Sırayı Boşalt", fontWeight = FontWeight.Bold)
                            }
                            Spacer(modifier = Modifier.height(8.dp))
                        }

                        val availableStudents = students.filter { it.id != existingStudentId }

                        if (availableStudents.isEmpty()) {
                            Text(
                                "Seçilecek başka öğrenci yok.",
                                fontSize = 14.sp,
                                color = Color.Gray,
                                modifier = Modifier.padding(16.dp)
                            )
                        } else {
                            LazyColumn {
                                items(availableStudents, key = { it.id }) { student ->
                                    val currentAssignedSeat = seatingPlan.entries.find { it.value == student.id }?.key
                                    val isAssigned = currentAssignedSeat != null

                                    Card(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(vertical = 4.dp)
                                            .clickable {
                                                selectedSeatId?.let { seatId ->
                                                    val newPlan = seatingPlan.toMutableMap()
                                                    // Move student from previous seat to this one
                                                    if (currentAssignedSeat != null) {
                                                        newPlan.remove(currentAssignedSeat)
                                                    }
                                                    newPlan[seatId] = student.id
                                                    seatingPlan = newPlan
                                                }
                                                showStudentSelection = false
                                            },
                                        colors = CardDefaults.cardColors(containerColor = if (isAssigned) Color(0xFFF1F5F9) else Color(0xFFF8FAFC)),
                                        shape = RoundedCornerShape(12.dp),
                                    ) {
                                        Row(
                                            modifier = Modifier.padding(16.dp),
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            Box(
                                                modifier = Modifier
                                                    .size(40.dp)
                                                    .background(if (isAssigned) Color(0xFFE2E8F0) else Color(0xFFDBEAFE), RoundedCornerShape(8.dp)),
                                                contentAlignment = Alignment.Center
                                            ) {
                                                Text(
                                                    student.studentNo,
                                                    color = if (isAssigned) Color.Gray else Color(0xFF2563EB),
                                                    fontWeight = FontWeight.Bold
                                                )
                                            }
                                            Spacer(modifier = Modifier.width(16.dp))
                                            Column {
                                                Text(
                                                    "${student.name} ${student.surname}",
                                                    fontWeight = FontWeight.Bold,
                                                    color = if (isAssigned) Color.DarkGray else Color.Black
                                                )
                                                if (isAssigned) {
                                                    Text(
                                                        "Başka bir sırada oturuyor (Seçilirse buraya taşınır)",
                                                        fontSize = 11.sp,
                                                        color = Color.Gray
                                                    )
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        Spacer(modifier = Modifier.height(32.dp))
                    }
                }
            }
        }
    }
}
