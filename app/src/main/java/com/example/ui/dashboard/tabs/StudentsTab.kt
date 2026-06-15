package com.example.ui.dashboard.tabs

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import com.example.auth.UserData
import com.example.data.FirestoreRepository
import com.example.data.Student
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun StudentsTab(
    userData: UserData,
    paddingValues: PaddingValues
) {
    val coroutineScope = rememberCoroutineScope()
    val firestoreRepository = remember { FirestoreRepository() }
    
    var students by remember { mutableStateOf<List<Student>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var searchQuery by remember { mutableStateOf("") }
    
    var showAddDialog by remember { mutableStateOf(false) }
    var studentToEdit by remember { mutableStateOf<Student?>(null) }

    fun refreshData() {
        coroutineScope.launch {
            isLoading = true
            students = firestoreRepository.getStudents(userData.teacherUid)
            isLoading = false
        }
    }

    LaunchedEffect(userData.teacherUid) {
        refreshData()
    }

    val filteredStudents = students.filter {
        it.name.contains(searchQuery, ignoreCase = true) || 
        it.surname.contains(searchQuery, ignoreCase = true) ||
        it.studentNo.contains(searchQuery, ignoreCase = true)
    }.sortedBy { it.studentNo.toIntOrNull() ?: Int.MAX_VALUE }

    val totalCount = students.size
    val maleCount = students.count { it.gender.equals("Erkek", ignoreCase = true) }
    val femaleCount = students.count { it.gender.equals("Kız", ignoreCase = true) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(paddingValues)
    ) {
        // Build Top Bar manually without Scaffold
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(Icons.Default.List, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
            Spacer(modifier = Modifier.width(8.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text("Sınıf Listesi", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                Text("Öğrenci listenizi buradan yönetebilirsiniz", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            Button(onClick = { showAddDialog = true }) {
                Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(18.dp))
                Spacer(modifier = Modifier.width(4.dp))
                Text("Öğrenci Ekle")
            }
        }
        
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp),
            horizontalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Text("$totalCount Toplam Öğrenci", color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Bold)
            Text("$maleCount Erkek", color = Color.Gray)
            Text("$femaleCount Kız", color = Color.Gray)
        }
        
        Spacer(modifier = Modifier.height(16.dp))
        
        OutlinedTextField(
            value = searchQuery,
            onValueChange = { searchQuery = it },
            placeholder = { Text("Öğrenci ara...") },
            leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp),
            singleLine = true,
            shape = CircleShape,
            colors = OutlinedTextFieldDefaults.colors(
                unfocusedBorderColor = MaterialTheme.colorScheme.surfaceVariant,
                unfocusedContainerColor = MaterialTheme.colorScheme.surface,
                focusedContainerColor = MaterialTheme.colorScheme.surface
            )
        )
        
        Spacer(modifier = Modifier.height(16.dp))

        if (isLoading) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
        } else if (students.isEmpty()) {
            var isCreatingDemo by remember { mutableStateOf(false) }
            val localScope = rememberCoroutineScope()
            
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(horizontal = 16.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                item {
                    Spacer(modifier = Modifier.height(24.dp))
                    Box(
                        modifier = Modifier
                            .size(72.dp)
                            .background(MaterialTheme.colorScheme.errorContainer, CircleShape),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.CloudSync,
                            contentDescription = null,
                            modifier = Modifier.size(40.dp),
                            tint = MaterialTheme.colorScheme.onErrorContainer
                        )
                    }
                }
                
                item {
                    Text(
                        text = "Sınıf Bilgileriniz Bulunamadı",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.error
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "Hesabınıza bağlı sınıf listesi Firestore üzerinde bulunamadı veya erişilemedi.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                        modifier = Modifier.padding(horizontal = 16.dp)
                    )
                }
                
                // Diagnostic Box
                item {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Text(
                                "BAĞLANTI DETAYLARI & REHBER",
                                style = MaterialTheme.typography.labelMedium,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.primary
                            )
                            Spacer(modifier = Modifier.height(12.dp))
                            
                            DiagnosticRow(label = "Giriş Yapan E-posta:", value = userData.email ?: "-")
                            DiagnosticRow(label = "Öğretmen Kimliği (UID):", value = userData.teacherUid)
                            DiagnosticRow(label = "Bağlı Proje (Firebase ID):", value = "gen-lang-client-0847504321")
                            
                            Spacer(modifier = Modifier.height(12.dp))
                            Divider()
                            Spacer(modifier = Modifier.height(12.dp))
                            
                            Text(
                                text = "💡 Neden Sınıf Listesi Boş?\n\n" +
                                        "Mobil uygulama şu an Google AI Studio'nun test ortamında çalışıyor. Bu ortam, web sitenizin gerçek verilerini barındıran asıl Firebase projeniz yerine, sıfır verili boş bir test projesine bağlanmaktadır.\n\n" +
                                        "Nasıl Çözülür?\n" +
                                        "1. Gerçek site verilerinizi çekmek için web projenizin 'google-services.json' dosyasını bu mobil projenin 'app' klasörüne yükleyip uygulamayı yeniden derlemelisiniz.\n" +
                                        "2. Bu test ortamında kendi sınıfınızı anında görmek için aşağıdaki butona dokunarak Sivas Süleyman Sami Kepenek İlkokulu 3/D sınıfındaki tüm 25 öğrencinizi anında bu test veritabanına aktarabilirsiniz!",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                }
                
                // Action Button
                item {
                    if (isCreatingDemo) {
                        Row(
                            horizontalArrangement = Arrangement.Center,
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.padding(16.dp)
                        ) {
                            CircularProgressIndicator(modifier = Modifier.size(24.dp))
                            Spacer(modifier = Modifier.width(12.dp))
                            Text("Sınıf Hazırlanıyor...", style = MaterialTheme.typography.bodyMedium)
                        }
                    } else {
                        Button(
                            onClick = {
                                isCreatingDemo = true
                                localScope.launch {
                                    try {
                                        if (userData.email?.trim()?.lowercase() == "cihan.ozel10@gmail.com") {
                                            firestoreRepository.setupRealClassroomForCihan(userData.teacherUid)
                                        } else {
                                            firestoreRepository.setupDemoClassForTeacher(userData.teacherUid, userData.email ?: "")
                                        }
                                        refreshData()
                                    } catch (e: Exception) {
                                        android.util.Log.e("StudentsTab", "Setup demo fails", e)
                                    } finally {
                                        isCreatingDemo = false
                                    }
                                }
                            },
                            modifier = Modifier.fillMaxWidth().height(50.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
                        ) {
                            Icon(Icons.Default.CloudSync, contentDescription = null)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = if (userData.email?.trim()?.lowercase() == "cihan.ozel10@gmail.com")
                                    "Gerçek Sınıfımı (25 Öğrenci) Yükle"
                                    else "Sınıfımı Kurtar / Örnek Sınıf Oluştur",
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                    Spacer(modifier = Modifier.height(32.dp))
                }
            }
        } else if (filteredStudents.isEmpty()) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text("Aramanızla eşleşen öğrenci bulunamadı.", color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        } else {
            LazyColumn(
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                items(filteredStudents) { student ->
                    StudentItem(
                        student = student,
                        onClick = { studentToEdit = student }
                    )
                }
            }
        }
    }

    if (showAddDialog) {
        StudentDialog(
            student = null,
            onDismiss = { showAddDialog = false },
            onSave = { newStudent ->
                coroutineScope.launch {
                    val studentWithTeacher = newStudent.copy(teacherUid = userData.teacherUid)
                    firestoreRepository.addStudent(userData.teacherUid, studentWithTeacher)
                    showAddDialog = false
                    refreshData()
                }
            }
        )
    }

    if (studentToEdit != null) {
        StudentDialog(
            student = studentToEdit,
            onDismiss = { studentToEdit = null },
            onSave = { updatedStudent ->
                coroutineScope.launch {
                    val studentWithTeacher = updatedStudent.copy(teacherUid = userData.teacherUid)
                    firestoreRepository.updateStudent(userData.teacherUid, studentWithTeacher)
                    studentToEdit = null
                    refreshData()
                }
            },
            onDelete = { studentId ->
                coroutineScope.launch {
                    firestoreRepository.deleteStudent(userData.teacherUid, studentId)
                    studentToEdit = null
                    refreshData()
                }
            }
        )
    }
}

@Composable
fun StudentItem(student: Student, onClick: () -> Unit) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() },
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = student.studentNo,
                    style = MaterialTheme.typography.titleMedium,
                    modifier = Modifier.width(40.dp)
                )
                
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = "${student.name} ${student.surname}".uppercase(),
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(modifier = Modifier.height(2.dp))
                    Text(
                        text = student.gender.ifEmpty { "-" },
                        style = MaterialTheme.typography.bodySmall,
                        color = if (student.gender.equals("Kız", true)) Color(0xFFC51162) else Color(0xFF2962FF)
                    )
                }
                
                Icon(
                    imageVector = Icons.Default.ChevronRight,
                    contentDescription = "Düzenle",
                    tint = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            
            Divider(modifier = Modifier.padding(vertical = 12.dp))
            
            Row(modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.weight(1f)) {
                    Text("Doğum Tarihi", style = MaterialTheme.typography.labelSmall, color = Color.Gray)
                    Text(student.birthDate.ifEmpty { "-" }, style = MaterialTheme.typography.bodyMedium)
                }
                Column(modifier = Modifier.weight(1.5f)) {
                    Text("Veli E-postası", style = MaterialTheme.typography.labelSmall, color = Color.Gray)
                    Text(student.parentEmail.ifEmpty { "-" }, style = MaterialTheme.typography.bodyMedium)
                }
            }
            if (student.parentEmail2.isNotEmpty()) {
                Spacer(modifier = Modifier.height(8.dp))
                Column(modifier = Modifier.fillMaxWidth()) {
                    Text("Veli E-postası 2", style = MaterialTheme.typography.labelSmall, color = Color.Gray)
                    Text(student.parentEmail2, style = MaterialTheme.typography.bodyMedium)
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun StudentDialog(
    student: Student?,
    onDismiss: () -> Unit,
    onSave: (Student) -> Unit,
    onDelete: ((String) -> Unit)? = null
) {
    var studentNo by remember { mutableStateOf(student?.studentNo ?: "") }
    var gender by remember { mutableStateOf(student?.gender ?: "Erkek") }
    var name by remember { mutableStateOf(student?.name ?: "") }
    var surname by remember { mutableStateOf(student?.surname ?: "") }
    var birthDate by remember { mutableStateOf(student?.birthDate ?: "") }
    var parentEmail by remember { mutableStateOf(student?.parentEmail ?: "") }
    var parentEmail2 by remember { mutableStateOf(student?.parentEmail2 ?: "") }

    val isEditMode = student != null

    Dialog(onDismissRequest = onDismiss) {
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            shape = MaterialTheme.shapes.large,
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
        ) {
            LazyColumn(
                modifier = Modifier.padding(24.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                item {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = if (isEditMode) "Öğrenci Bilgilerini Güncelle" else "Yeni Öğrenci Ekle",
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.Bold
                        )
                        IconButton(onClick = onDismiss, modifier = Modifier.size(24.dp)) {
                            Icon(Icons.Default.Close, contentDescription = "Kapat")
                        }
                    }
                }

                item {
                    Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                        OutlinedTextField(
                            value = studentNo,
                            onValueChange = { studentNo = it },
                            label = { Text("Öğrenci No") },
                            modifier = Modifier.weight(1f),
                            singleLine = true
                        )
                        
                        // Simple dropdown surrogate for Gender using exposed dropdown menu if possible, or simple segmented button
                        Column(modifier = Modifier.weight(1f)) {
                            Text("Cinsiyet", style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(start = 4.dp, bottom = 4.dp))
                            Row(
                                modifier = Modifier.fillMaxWidth().height(56.dp).background(MaterialTheme.colorScheme.surfaceVariant, MaterialTheme.shapes.small),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Row(
                                    modifier = Modifier.weight(1f).fillMaxHeight().clickable { gender = "Erkek" }.background(if (gender == "Erkek") MaterialTheme.colorScheme.primaryContainer else Color.Transparent),
                                    horizontalArrangement = Arrangement.Center,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text("Erkek", color = if (gender == "Erkek") MaterialTheme.colorScheme.onPrimaryContainer else MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                                Row(
                                    modifier = Modifier.weight(1f).fillMaxHeight().clickable { gender = "Kız" }.background(if (gender == "Kız") MaterialTheme.colorScheme.primaryContainer else Color.Transparent),
                                    horizontalArrangement = Arrangement.Center,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text("Kız", color = if (gender == "Kız") MaterialTheme.colorScheme.onPrimaryContainer else MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                            }
                        }
                    }
                }

                item {
                    Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                        OutlinedTextField(
                            value = name,
                            onValueChange = { name = it },
                            label = { Text("Adı") },
                            modifier = Modifier.weight(1f),
                            singleLine = true
                        )
                        OutlinedTextField(
                            value = surname,
                            onValueChange = { surname = it },
                            label = { Text("Soyadı") },
                            modifier = Modifier.weight(1f),
                            singleLine = true
                        )
                    }
                }

                item {
                    OutlinedTextField(
                        value = birthDate,
                        onValueChange = { birthDate = it },
                        label = { Text("Doğum Tarihi") },
                        placeholder = { Text("gg ----- yyyy") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                        trailingIcon = { Icon(Icons.Default.CalendarToday, contentDescription = null) }
                    )
                }

                item {
                    OutlinedTextField(
                        value = parentEmail,
                        onValueChange = { parentEmail = it },
                        label = { Text("Veli E-postası") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true
                    )
                }

                item {
                    OutlinedTextField(
                        value = parentEmail2,
                        onValueChange = { parentEmail2 = it },
                        label = { Text("Veli E-postası 2 (İsteğe Bağlı)") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true
                    )
                }

                item {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(16.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        if (isEditMode && onDelete != null) {
                            TextButton(
                                onClick = { onDelete(student!!.id) },
                                colors = ButtonDefaults.textButtonColors(contentColor = MaterialTheme.colorScheme.error)
                            ) {
                                Icon(Icons.Default.Delete, contentDescription = null, modifier = Modifier.size(18.dp))
                                Spacer(modifier = Modifier.width(4.dp))
                                Text("Öğrenciyi Sil")
                            }
                        }
                        
                        Spacer(modifier = Modifier.weight(1f))
                        
                        TextButton(onClick = onDismiss) {
                            Text("İptal")
                        }
                        Button(
                            onClick = {
                                val s = student?.copy(
                                    studentNo = studentNo,
                                    gender = gender,
                                    name = name,
                                    surname = surname,
                                    birthDate = birthDate,
                                    parentEmail = parentEmail,
                                    parentEmail2 = parentEmail2
                                ) ?: Student(
                                    studentNo = studentNo,
                                    gender = gender,
                                    name = name,
                                    surname = surname,
                                    birthDate = birthDate,
                                    parentEmail = parentEmail,
                                    parentEmail2 = parentEmail2
                                )
                                onSave(s)
                            }
                        ) {
                            Text(if (isEditMode) "Güncelle" else "Kaydet")
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun DiagnosticRow(label: String, value: String) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Text(
            text = value,
            style = MaterialTheme.typography.bodyMedium,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onSurface,
            maxLines = 1,
            overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis,
            modifier = Modifier.padding(start = 8.dp)
        )
    }
}

