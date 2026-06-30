package com.example.ui.dashboard.tabs

import android.widget.Toast
import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
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
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.auth.UserData
import com.example.data.ChildInfo
import com.example.data.FirestoreRepository
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MemberDashboardTab(
    userData: UserData,
    onSignOut: () -> Unit,
    onRefreshSession: () -> Unit,
    paddingValues: PaddingValues
) {
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()
    val firestoreRepository = remember { FirestoreRepository() }

    var selectedProfileType by remember { mutableStateOf<String?>(null) }
    var isSaving by remember { mutableStateOf(false) }

    // Teacher Form States
    var city by remember { mutableStateOf("") }
    var district by remember { mutableStateOf("") }
    var schoolName by remember { mutableStateOf("") }
    var gradeLevel by remember { mutableStateOf("") }
    var section by remember { mutableStateOf("") }

    // Parent Form States
    var studentNo by remember { mutableStateOf("") }
    var studentName by remember { mutableStateOf("") }
    var parentSchoolName by remember { mutableStateOf("") }
    var parentGradeLevel by remember { mutableStateOf("") }
    var parentSection by remember { mutableStateOf("") }
    val addedChildren = remember { mutableStateListOf<ChildInfo>() }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(paddingValues)
            .background(MaterialTheme.colorScheme.background)
    ) {
        // App Bar / Top Header
        TopAppBar(
            title = {
                Text(
                    text = if (selectedProfileType == null) "Profil Kurulumu" else "${if (selectedProfileType == "ÖĞRETMEN") "Öğretmen" else "Veli"} Bilgileri",
                    fontWeight = FontWeight.Bold,
                    fontSize = 20.sp
                )
            },
            navigationIcon = {
                if (selectedProfileType != null) {
                    IconButton(onClick = { selectedProfileType = null }) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "Geri Dön"
                        )
                    }
                }
            },
            actions = {
                IconButton(onClick = onSignOut) {
                    Icon(
                        imageVector = Icons.Default.Logout,
                        contentDescription = "Çıkış Yap",
                        tint = MaterialTheme.colorScheme.error
                    )
                }
            },
            colors = TopAppBarDefaults.topAppBarColors(
                containerColor = MaterialTheme.colorScheme.surface,
                titleContentColor = MaterialTheme.colorScheme.onSurface
            )
        )

        AnimatedContent(
            targetState = selectedProfileType,
            transitionSpec = {
                fadeIn() togetherWith fadeOut()
            },
            label = "ProfileSetupTransition"
        ) { profileType ->
            if (profileType == null) {
                // PHASE 1: Role Selection Screen
                LazyColumn(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    item {
                        Spacer(modifier = Modifier.height(8.dp))
                        Icon(
                            imageVector = Icons.Default.AccountCircle,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.size(72.dp)
                        )
                        Spacer(modifier = Modifier.height(12.dp))
                        Text(
                            text = "Aramıza Hoş Geldiniz! 👋",
                            style = MaterialTheme.typography.headlineMedium,
                            fontWeight = FontWeight.Black,
                            textAlign = TextAlign.Center,
                            color = MaterialTheme.colorScheme.onBackground
                        )
                        Text(
                            text = "Profil kurulumunuzu tamamlamak için lütfen hesabınıza uygun rolü seçiniz.",
                            style = MaterialTheme.typography.bodyMedium,
                            textAlign = TextAlign.Center,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
                        )
                        Spacer(modifier = Modifier.height(16.dp))
                    }

                    // Card 1: Teacher Profile Setup
                    item {
                        Card(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(24.dp))
                                .clickable { selectedProfileType = "ÖĞRETMEN" },
                            colors = CardDefaults.cardColors(
                                containerColor = MaterialTheme.colorScheme.primaryContainer
                            )
                        ) {
                            Row(
                                modifier = Modifier.padding(24.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(16.dp)
                            ) {
                                Box(
                                    modifier = Modifier
                                        .size(56.dp)
                                        .background(
                                            MaterialTheme.colorScheme.primary,
                                            shape = RoundedCornerShape(16.dp)
                                        ),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.School,
                                        contentDescription = null,
                                        tint = Color.White,
                                        modifier = Modifier.size(32.dp)
                                    )
                                }
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        text = "Öğretmen Profili Kur",
                                        style = MaterialTheme.typography.titleLarge,
                                        fontWeight = FontWeight.Bold,
                                        color = MaterialTheme.colorScheme.onPrimaryContainer
                                    )
                                    Spacer(modifier = Modifier.height(4.dp))
                                    Text(
                                        text = "Sınıf oluşturmak, ders programı girmek ve öğrencilerinizi yönetmek için tıklayınız.",
                                        style = MaterialTheme.typography.bodyMedium,
                                        color = MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.8f)
                                    )
                                }
                            }
                        }
                    }

                    // Card 2: Parent Profile Setup
                    item {
                        Card(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(24.dp))
                                .clickable { selectedProfileType = "VELİ" },
                            colors = CardDefaults.cardColors(
                                containerColor = MaterialTheme.colorScheme.secondaryContainer
                            )
                        ) {
                            Row(
                                modifier = Modifier.padding(24.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(16.dp)
                            ) {
                                Box(
                                    modifier = Modifier
                                        .size(56.dp)
                                        .background(
                                            MaterialTheme.colorScheme.secondary,
                                            shape = RoundedCornerShape(16.dp)
                                        ),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.Person,
                                        contentDescription = null,
                                        tint = Color.White,
                                        modifier = Modifier.size(32.dp)
                                    )
                                }
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        text = "Veli Profili Kur",
                                        style = MaterialTheme.typography.titleLarge,
                                        fontWeight = FontWeight.Bold,
                                        color = MaterialTheme.colorScheme.onSecondaryContainer
                                    )
                                    Spacer(modifier = Modifier.height(4.dp))
                                    Text(
                                        text = "Çocuğunuzun derslerini, sınav notlarını, yıldızlarını ve okuma kayıtlarını takip etmek için tıklayınız.",
                                        style = MaterialTheme.typography.bodyMedium,
                                        color = MaterialTheme.colorScheme.onSecondaryContainer.copy(alpha = 0.8f)
                                    )
                                }
                            }
                        }
                    }

                    item {
                        Spacer(modifier = Modifier.height(24.dp))
                        TextButton(onClick = onSignOut) {
                            Icon(Icons.Default.Logout, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Farklı Hesapla Giriş Yap / Çıkış")
                        }
                    }
                }
            } else if (profileType == "ÖĞRETMEN") {
                // PHASE 2: Teacher Setup Form
                LazyColumn(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    item {
                        Card(
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
                        ) {
                            Row(
                                modifier = Modifier.padding(16.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(12.dp)
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Info,
                                    contentDescription = null,
                                    tint = MaterialTheme.colorScheme.primary
                                )
                                Text(
                                    text = "Lütfen görev yaptığınız okul ve sınıf bilgilerini eksiksiz giriniz. Bu bilgiler profilinizde görüntülenecektir.",
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }
                    }

                    item {
                        OutlinedTextField(
                            value = city,
                            onValueChange = { city = it },
                            label = { Text("İl (Şehir)") },
                            placeholder = { Text("Örn: Balıkesir") },
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(12.dp),
                            singleLine = true,
                            leadingIcon = { Icon(Icons.Default.LocationOn, contentDescription = null) }
                        )
                    }

                    item {
                        OutlinedTextField(
                            value = district,
                            onValueChange = { district = it },
                            label = { Text("İlçe") },
                            placeholder = { Text("Örn: Edremit") },
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(12.dp),
                            singleLine = true,
                            leadingIcon = { Icon(Icons.Default.Map, contentDescription = null) }
                        )
                    }

                    item {
                        OutlinedTextField(
                            value = schoolName,
                            onValueChange = { schoolName = it },
                            label = { Text("Okul Adı") },
                            placeholder = { Text("Örn: Cumhuriyet İlkokulu") },
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(12.dp),
                            singleLine = true,
                            leadingIcon = { Icon(Icons.Default.School, contentDescription = null) }
                        )
                    }

                    item {
                        OutlinedTextField(
                            value = gradeLevel,
                            onValueChange = { gradeLevel = it },
                            label = { Text("Sınıf Seviyesi") },
                            placeholder = { Text("Örn: 4. Sınıf") },
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(12.dp),
                            singleLine = true,
                            leadingIcon = { Icon(Icons.Default.Class, contentDescription = null) }
                        )
                    }

                    item {
                        OutlinedTextField(
                            value = section,
                            onValueChange = { section = it },
                            label = { Text("Şube") },
                            placeholder = { Text("Örn: A Şubesi") },
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(12.dp),
                            singleLine = true,
                            leadingIcon = { Icon(Icons.Default.Groups, contentDescription = null) }
                        )
                    }

                    item {
                        Spacer(modifier = Modifier.height(16.dp))
                        Button(
                            onClick = {
                                if (city.isBlank() || district.isBlank() || schoolName.isBlank() || gradeLevel.isBlank() || section.isBlank()) {
                                    Toast.makeText(context, "Lütfen tüm alanları doldurun!", Toast.LENGTH_SHORT).show()
                                    return@Button
                                }
                                isSaving = true
                                coroutineScope.launch {
                                    val success = firestoreRepository.saveTeacherProfile(
                                        userId = userData.userId,
                                        city = city.trim(),
                                        district = district.trim(),
                                        schoolName = schoolName.trim(),
                                        gradeLevel = gradeLevel.trim(),
                                        section = section.trim()
                                    )
                                    isSaving = false
                                    if (success) {
                                        Toast.makeText(context, "Profiliniz başarıyla oluşturuldu!", Toast.LENGTH_SHORT).show()
                                        onRefreshSession()
                                    } else {
                                        Toast.makeText(context, "Hata oluştu! Lütfen tekrar deneyiniz.", Toast.LENGTH_SHORT).show()
                                    }
                                }
                            },
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(56.dp),
                            shape = RoundedCornerShape(16.dp),
                            enabled = !isSaving
                        ) {
                            if (isSaving) {
                                CircularProgressIndicator(color = Color.White, modifier = Modifier.size(24.dp))
                            } else {
                                Icon(Icons.Default.Save, contentDescription = null)
                                Spacer(modifier = Modifier.width(8.dp))
                                Text("Profilimi Kaydet ve Giriş Yap", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                            }
                        }
                    }
                }
            } else if (profileType == "VELİ") {
                // PHASE 2: Parent Setup Form (Add Students & children array)
                LazyColumn(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    item {
                        Card(
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
                        ) {
                            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.Info,
                                        contentDescription = null,
                                        tint = MaterialTheme.colorScheme.secondary
                                    )
                                    Text(
                                        text = "Veli Profil Kurulumu",
                                        style = MaterialTheme.typography.titleMedium,
                                        fontWeight = FontWeight.Bold
                                    )
                                }
                                Text(
                                    text = "Velisi olduğunuz öğrencilerin okul ve numara bilgilerini ekleyerek kaydolun.",
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }
                    }

                    // Form to add student
                    item {
                        Card(
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                            elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                            shape = RoundedCornerShape(16.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                                Text(
                                    text = "Yeni Öğrenci Bilgisi",
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 16.sp,
                                    color = MaterialTheme.colorScheme.secondary
                                )

                                OutlinedTextField(
                                    value = studentNo,
                                    onValueChange = { studentNo = it },
                                    label = { Text("Öğrenci Numarası") },
                                    placeholder = { Text("Örn: 154") },
                                    modifier = Modifier.fillMaxWidth(),
                                    shape = RoundedCornerShape(12.dp),
                                    singleLine = true
                                )

                                OutlinedTextField(
                                    value = studentName,
                                    onValueChange = { studentName = it },
                                    label = { Text("Öğrenci Adı Soyadı") },
                                    placeholder = { Text("Örn: Ahmet Yılmaz") },
                                    modifier = Modifier.fillMaxWidth(),
                                    shape = RoundedCornerShape(12.dp),
                                    singleLine = true
                                )

                                OutlinedTextField(
                                    value = parentSchoolName,
                                    onValueChange = { parentSchoolName = it },
                                    label = { Text("Okul Adı") },
                                    placeholder = { Text("Örn: Cumhuriyet İlkokulu") },
                                    modifier = Modifier.fillMaxWidth(),
                                    shape = RoundedCornerShape(12.dp),
                                    singleLine = true
                                )

                                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                                    OutlinedTextField(
                                        value = parentGradeLevel,
                                        onValueChange = { parentGradeLevel = it },
                                        label = { Text("Sınıf") },
                                        placeholder = { Text("4") },
                                        modifier = Modifier.weight(1f),
                                        shape = RoundedCornerShape(12.dp),
                                        singleLine = true
                                    )
                                    OutlinedTextField(
                                        value = parentSection,
                                        onValueChange = { parentSection = it },
                                        label = { Text("Şube") },
                                        placeholder = { Text("A") },
                                        modifier = Modifier.weight(1f),
                                        shape = RoundedCornerShape(12.dp),
                                        singleLine = true
                                    )
                                }

                                Button(
                                    onClick = {
                                        if (studentNo.isBlank() || studentName.isBlank() || parentSchoolName.isBlank() || parentGradeLevel.isBlank() || parentSection.isBlank()) {
                                            Toast.makeText(context, "Lütfen tüm alanları doldurun!", Toast.LENGTH_SHORT).show()
                                            return@Button
                                        }
                                        val child = ChildInfo(
                                            studentId = "manual_${System.currentTimeMillis()}",
                                            studentNo = studentNo.trim(),
                                            studentName = studentName.trim(),
                                            school = parentSchoolName.trim(),
                                            grade = parentGradeLevel.trim(),
                                            section = parentSection.trim(),
                                            teacherUid = "manual_teacher" // Manual parent-linked children
                                        )
                                        addedChildren.add(child)
                                        // Reset child inputs
                                        studentNo = ""
                                        studentName = ""
                                        parentSchoolName = ""
                                        parentGradeLevel = ""
                                        parentSection = ""
                                        Toast.makeText(context, "Öğrenci listeye eklendi!", Toast.LENGTH_SHORT).show()
                                    },
                                    modifier = Modifier.fillMaxWidth(),
                                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.secondary),
                                    shape = RoundedCornerShape(12.dp)
                                ) {
                                    Icon(Icons.Default.Add, contentDescription = null)
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text("Öğrenciyi Listeye Ekle")
                                }
                            }
                        }
                    }

                    // Added children list
                    item {
                        Text(
                            text = "Eklenen Öğrenciler (${addedChildren.size})",
                            fontWeight = FontWeight.Bold,
                            fontSize = 16.sp,
                            color = MaterialTheme.colorScheme.onBackground
                        )
                    }

                    if (addedChildren.isEmpty()) {
                        item {
                            Card(
                                modifier = Modifier.fillMaxWidth(),
                                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                                shape = RoundedCornerShape(12.dp)
                            ) {
                                Text(
                                    text = "Henüz hiçbir öğrenci eklemediniz. Lütfen en az bir öğrenci ekleyerek kurulumu tamamlayın.",
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    modifier = Modifier.padding(16.dp),
                                    textAlign = TextAlign.Center
                                )
                            }
                        }
                    } else {
                        items(addedChildren) { child ->
                            Card(
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(12.dp),
                                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
                            ) {
                                Row(
                                    modifier = Modifier.padding(12.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Icon(
                                        Icons.Default.School,
                                        contentDescription = null,
                                        tint = MaterialTheme.colorScheme.secondary,
                                        modifier = Modifier.size(24.dp)
                                    )
                                    Spacer(modifier = Modifier.width(12.dp))
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(
                                            text = child.studentName,
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 14.sp
                                        )
                                        Text(
                                            text = "${child.school} - No: ${child.studentNo} - ${child.grade}/${child.section}",
                                            fontSize = 12.sp,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant
                                        )
                                    }
                                    IconButton(onClick = { addedChildren.remove(child) }) {
                                        Icon(
                                            Icons.Default.Delete,
                                            contentDescription = "Sil",
                                            tint = MaterialTheme.colorScheme.error
                                        )
                                    }
                                }
                            }
                        }
                    }

                    // Final Submit button
                    item {
                        Spacer(modifier = Modifier.height(8.dp))
                        Button(
                            onClick = {
                                if (addedChildren.isEmpty()) {
                                    Toast.makeText(context, "Lütfen en az bir öğrenci ekleyin!", Toast.LENGTH_SHORT).show()
                                    return@Button
                                }
                                isSaving = true
                                coroutineScope.launch {
                                    val success = firestoreRepository.saveParentProfile(
                                        userId = userData.userId,
                                        children = addedChildren.toList()
                                    )
                                    isSaving = false
                                    if (success) {
                                        Toast.makeText(context, "Profiliniz başarıyla kaydedildi!", Toast.LENGTH_SHORT).show()
                                        onRefreshSession()
                                    } else {
                                        Toast.makeText(context, "Profil kaydedilirken hata oluştu!", Toast.LENGTH_SHORT).show()
                                    }
                                }
                            },
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(56.dp),
                            shape = RoundedCornerShape(16.dp),
                            enabled = !isSaving && addedChildren.isNotEmpty()
                        ) {
                            if (isSaving) {
                                CircularProgressIndicator(color = Color.White, modifier = Modifier.size(24.dp))
                            } else {
                                Icon(Icons.Default.Check, contentDescription = null)
                                Spacer(modifier = Modifier.width(8.dp))
                                Text("Kurulumu Tamamla ve Giriş Yap", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                            }
                        }
                    }
                }
            }
        }
    }
}
