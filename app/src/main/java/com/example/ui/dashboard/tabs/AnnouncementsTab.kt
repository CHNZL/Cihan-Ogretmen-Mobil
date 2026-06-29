package com.example.ui.dashboard.tabs

import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
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
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.auth.UserData
import com.google.firebase.FirebaseApp
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.Query
import kotlinx.coroutines.tasks.await
import kotlinx.coroutines.launch
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import com.example.data.Student
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

data class Announcement(
    val id: String = "",
    val title: String = "",
    val content: String = "",
    val targetAudience: String = "ALL",
    val targetStudentIds: List<String> = emptyList(),
    val hasPoll: Boolean = false,
    val pollOptions: List<String> = emptyList(),
    val readBy: Map<String, Any> = emptyMap(),
    val createdAtMillis: Long = System.currentTimeMillis()
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AnnouncementsTab(userData: UserData) {
    val db = FirebaseFirestore.getInstance(FirebaseApp.getInstance(), "ai-studio-50d2114a-6844-4ea4-a54d-c3de2ef685ab")
    var announcements by remember { mutableStateOf<List<Announcement>>(emptyList()) }
    var students by remember { mutableStateOf<List<Student>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var showAddDialog by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    var activeTab by remember { mutableStateOf("Duyurularım") }

    LaunchedEffect(userData.teacherUid) {
        if (userData.teacherUid.isBlank()) {
            isLoading = false
            return@LaunchedEffect
        }
        
        // Fetch Students
        try {
            val snapshot = db.collection("users").document(userData.teacherUid).collection("students").get().await()
            students = snapshot.documents.mapNotNull { it.toObject(Student::class.java)?.copy(id = it.id) }
        } catch (e: Exception) {
            e.printStackTrace()
        }

        // Fetch Announcements Listener
        db.collection("users").document(userData.teacherUid).collection("announcements")
            .orderBy("createdAt", Query.Direction.DESCENDING)
            .addSnapshotListener { value, error ->
                if (error != null) {
                    error.printStackTrace()
                    isLoading = false
                    return@addSnapshotListener
                }
                
                if (value != null) {
                    val list = value.documents.map { doc ->
                        val data = doc.data ?: emptyMap<String, Any>()
                        val ts = doc.getTimestamp("createdAt")
                        Announcement(
                            id = doc.id,
                            title = data["title"] as? String ?: "",
                            content = data["content"] as? String ?: "",
                            targetAudience = data["targetAudience"] as? String ?: "ALL",
                            targetStudentIds = (data["targetStudentIds"] as? List<*>)?.mapNotNull { it.toString() } ?: emptyList(),
                            hasPoll = data["hasPoll"] as? Boolean ?: false,
                            pollOptions = (data["pollOptions"] as? List<*>)?.mapNotNull { it.toString() } ?: emptyList(),
                            readBy = (data["readBy"] as? Map<String, Any>) ?: emptyMap(),
                            createdAtMillis = ts?.toDate()?.time ?: System.currentTimeMillis()
                        )
                    }
                    announcements = list
                }
                isLoading = false
            }
    }

    Column(modifier = Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
        // Tab Switcher
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
                .background(Color.White, RoundedCornerShape(16.dp))
                .border(1.dp, MaterialTheme.colorScheme.outlineVariant, RoundedCornerShape(16.dp))
                .padding(4.dp),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            listOf("Duyurularım", "Velilerle Sohbet").forEach { tab ->
                val isSelected = activeTab == tab
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .clip(RoundedCornerShape(12.dp))
                        .background(if (isSelected) MaterialTheme.colorScheme.primary else Color.Transparent)
                        .clickable { activeTab = tab }
                        .padding(vertical = 12.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = if (tab == "Duyurularım") Icons.Default.Campaign else Icons.Default.ChatBubbleOutline,
                            contentDescription = null,
                            tint = if (isSelected) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.size(18.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = tab,
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Bold,
                            color = if (isSelected) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }
        }

        if (activeTab == "Velilerle Sohbet") {
            Box(modifier = Modifier.fillMaxSize().padding(32.dp), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(Icons.Default.ChatBubbleOutline, contentDescription = null, modifier = Modifier.size(64.dp), tint = MaterialTheme.colorScheme.primaryContainer)
                    Spacer(modifier = Modifier.height(16.dp))
                    Text("Sohbet Özelliği Yapım Aşamasında", fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface)
                }
            }
            return@Column
        }

        // Action Row
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(modifier = Modifier.size(40.dp).background(MaterialTheme.colorScheme.primaryContainer, RoundedCornerShape(12.dp)), contentAlignment = Alignment.Center) {
                    Icon(Icons.Default.Campaign, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                }
                Spacer(modifier = Modifier.width(12.dp))
                Column {
                    Text("Duyurular", fontWeight = FontWeight.Bold, fontSize = 18.sp, color = MaterialTheme.colorScheme.onBackground)
                    Text("Sınıfınıza veya velilere özel duyurular", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }

            Button(
                onClick = { showAddDialog = true },
                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary),
                shape = RoundedCornerShape(12.dp)
            ) {
                Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(16.dp))
                Spacer(modifier = Modifier.width(4.dp))
                Text("Yeni Duyuru", fontWeight = FontWeight.Bold)
            }
        }

        if (isLoading) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
        } else if (announcements.isEmpty()) {
            Box(modifier = Modifier.fillMaxSize().padding(32.dp), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(Icons.Default.NotificationsOff, contentDescription = null, modifier = Modifier.size(64.dp), tint = MaterialTheme.colorScheme.surfaceVariant)
                    Spacer(modifier = Modifier.height(16.dp))
                    Text("Henüz duyuru oluşturmadınız", fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface)
                }
            }
        } else {
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                items(announcements) { ann ->
                    AnnouncementCard(announcement = ann, students = students) {
                        scope.launch {
                            try {
                                db.collection("users").document(userData.teacherUid).collection("duyurular").document(ann.id).delete().await()
                            } catch (e: Exception) {
                                e.printStackTrace()
                            }
                        }
                    }
                }
            }
        }
    }

    if (showAddDialog) {
        AddAnnouncementDialog(
            students = students,
            onDismiss = { showAddDialog = false },
            onSave = { title, content, targetAudience, targetStudentIds, hasPoll, pollOptions ->
                scope.launch {
                    try {
                        val payload = hashMapOf(
                            "title" to title,
                            "content" to content,
                            "targetAudience" to targetAudience,
                            "targetStudentIds" to targetStudentIds,
                            "hasPoll" to hasPoll,
                            "pollOptions" to pollOptions,
                            "readBy" to emptyMap<String, Any>(),
                            "createdAt" to com.google.firebase.firestore.FieldValue.serverTimestamp()
                        )
                        db.collection("users").document(userData.teacherUid).collection("duyurular").add(payload).await()
                        showAddDialog = false
                    } catch (e: Exception) {
                        e.printStackTrace()
                    }
                }
            }
        )
    }
}

@Composable
fun AnnouncementCard(announcement: Announcement, students: List<Student>, onDelete: () -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.Top) {
                Column {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            text = java.text.SimpleDateFormat("d MMM HH:mm", java.util.Locale("tr")).format(java.util.Date(announcement.createdAtMillis)),
                            fontSize = 11.sp, 
                            fontWeight = FontWeight.Bold, 
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        if (announcement.targetAudience == "ALL") {
                            Badge(containerColor = Color(0xFFD1FAE5), contentColor = Color(0xFF065F46)) { Text("TÜM SINIF", fontSize = 9.sp, fontWeight = FontWeight.Bold) }
                        } else {
                            Badge(containerColor = Color(0xFFE0E7FF), contentColor = Color(0xFF3730A3)) { Text("KİŞİYE ÖZEL (${announcement.targetStudentIds.size})", fontSize = 9.sp, fontWeight = FontWeight.Bold) }
                        }
                        if (announcement.hasPoll) {
                            Spacer(modifier = Modifier.width(8.dp))
                            Badge(containerColor = Color(0xFFFEF3C7), contentColor = Color(0xFF92400E)) { Text("ANKET", fontSize = 9.sp, fontWeight = FontWeight.Bold) }
                        }
                    }
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(text = announcement.title, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                }

                Row(verticalAlignment = Alignment.CenterVertically) {
                    Row(
                        modifier = Modifier.background(MaterialTheme.colorScheme.secondaryContainer, RoundedCornerShape(8.dp)).padding(horizontal = 6.dp, vertical = 2.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(Icons.Default.Visibility, contentDescription = "Okunma", modifier = Modifier.size(12.dp), tint = MaterialTheme.colorScheme.onSecondaryContainer)
                        Spacer(modifier = Modifier.width(4.dp))
                        val totalTarget = if (announcement.targetAudience == "ALL") students.size else announcement.targetStudentIds.size
                        Text("${announcement.readBy.size} / $totalTarget", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSecondaryContainer)
                    }
                    Spacer(modifier = Modifier.width(8.dp))
                    IconButton(onClick = onDelete, modifier = Modifier.size(24.dp)) {
                        Icon(Icons.Default.DeleteOutline, contentDescription = "Sil", tint = MaterialTheme.colorScheme.error)
                    }
                }
            }
            Spacer(modifier = Modifier.height(12.dp))
            Box(modifier = Modifier.background(Color(0xFFF8FAFC), RoundedCornerShape(8.dp)).fillMaxWidth().padding(12.dp)) {
                Text(text = announcement.content, fontSize = 13.sp, color = Color(0xFF334155))
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AddAnnouncementDialog(
    students: List<Student>,
    onDismiss: () -> Unit,
    onSave: (String, String, String, List<String>, Boolean, List<String>) -> Unit
) {
    var targetAudience by remember { mutableStateOf("ALL") }
    var title by remember { mutableStateOf("") }
    var content by remember { mutableStateOf("") }
    var selectedStudentIds by remember { mutableStateOf(setOf<String>()) }
    var hasPoll by remember { mutableStateOf(false) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Yeni Bildirim", fontWeight = FontWeight.Bold) },
        text = {
            LazyColumn(
                verticalArrangement = Arrangement.spacedBy(16.dp),
                modifier = Modifier.fillMaxWidth().heightIn(max = 400.dp)
            ) {
                item {
                    Text("KİME", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        FilterChip(
                            selected = targetAudience == "ALL",
                            onClick = { targetAudience = "ALL" },
                            label = { Text("Tüm Sınıf") },
                            modifier = Modifier.weight(1f)
                        )
                        FilterChip(
                            selected = targetAudience == "SPECIFIC",
                            onClick = { targetAudience = "SPECIFIC" },
                            label = { Text("Kişiye Özel") },
                            modifier = Modifier.weight(1f)
                        )
                    }
                }

                if (targetAudience == "SPECIFIC") {
                    item {
                        Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)) {
                            Column(modifier = Modifier.fillMaxWidth().padding(8.dp).heightIn(max = 120.dp)) {
                                students.forEach { student ->
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        modifier = Modifier.fillMaxWidth().clickable {
                                            selectedStudentIds = if (selectedStudentIds.contains(student.id)) {
                                                selectedStudentIds - student.id
                                            } else {
                                                selectedStudentIds + student.id
                                            }
                                        }.padding(horizontal = 8.dp, vertical = 4.dp)
                                    ) {
                                        Checkbox(
                                            checked = selectedStudentIds.contains(student.id),
                                            onCheckedChange = null,
                                            modifier = Modifier.scale(0.8f)
                                        )
                                        Text(student.name, fontSize = 13.sp)
                                    }
                                }
                            }
                        }
                    }
                }

                item {
                    OutlinedTextField(
                        value = title,
                        onValueChange = { title = it },
                        label = { Text("Bildirim Başlığı") },
                        placeholder = { Text("Örn: Hafta Sonu Ödevleri") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true
                    )
                }

                item {
                    var isGeneratingAi by remember { mutableStateOf(false) }
                    val scope = rememberCoroutineScope()
                    val context = androidx.compose.ui.platform.LocalContext.current

                    Box(modifier = Modifier.fillMaxWidth()) {
                        OutlinedTextField(
                            value = content,
                            onValueChange = { content = it },
                            label = { Text("Bildirim İçeriği") },
                            modifier = Modifier.fillMaxWidth().height(140.dp),
                            maxLines = 6
                        )
                        
                        FilledTonalButton(
                            onClick = { 
                                if (content.isBlank()) {
                                    android.widget.Toast.makeText(context, "Önce içerik için ipucu yazmalısınız", android.widget.Toast.LENGTH_SHORT).show()
                                    return@FilledTonalButton
                                }
                                isGeneratingAi = true
                                scope.launch {
                                    try {
                                        val prefs = context.getSharedPreferences("com.example.app_preferences", android.content.Context.MODE_PRIVATE)
                                        val apiKey = prefs.getString("gemini_api_key", null) ?: com.example.BuildConfig.GEMINI_API_KEY
                                        if (apiKey.isNullOrEmpty() || apiKey.startsWith("ENTER_YOUR")) {
                                            android.widget.Toast.makeText(context, "Lütfen Profil'den Gemini API anahtarı ekleyin", android.widget.Toast.LENGTH_LONG).show()
                                            isGeneratingAi = false
                                            return@launch
                                        }
                                        
                                        val generatedText = withContext(Dispatchers.IO) {
                                            val url = URL("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=$apiKey")
                                            val connection = url.openConnection() as HttpURLConnection
                                            connection.requestMethod = "POST"
                                            connection.setRequestProperty("Content-Type", "application/json")
                                            connection.doOutput = true

                                            val payload = JSONObject().apply {
                                                put("systemInstruction", JSONObject().apply {
                                                    put("parts", org.json.JSONArray().apply {
                                                        put(JSONObject().apply {
                                                            put("text", "Sen ilkokul öğretmeni olan Cihan Öğretmensin. Gelen taslağı Cihan Öğretmen üslubuyla, samimi, net ve enerjik bir mesaja dönüştür. Emojileri makul kullan.")
                                                        })
                                                    })
                                                })
                                                put("contents", org.json.JSONArray().apply {
                                                    put(JSONObject().apply {
                                                        put("parts", org.json.JSONArray().apply {
                                                            put(JSONObject().apply {
                                                                put("text", "Taslak: $content")
                                                            })
                                                        })
                                                    })
                                                })
                                            }

                                            connection.outputStream.use { os ->
                                                val input = payload.toString().toByteArray(Charsets.UTF_8)
                                                os.write(input, 0, input.size)
                                            }

                                            val responseCode = connection.responseCode
                                            if (responseCode == HttpURLConnection.HTTP_OK) {
                                                val responseString = connection.inputStream.bufferedReader().use { it.readText() }
                                                val jsonObj = JSONObject(responseString)
                                                jsonObj.optJSONArray("candidates")
                                                    ?.optJSONObject(0)
                                                    ?.optJSONObject("content")
                                                    ?.optJSONArray("parts")
                                                    ?.optJSONObject(0)
                                                    ?.optString("text")
                                            } else {
                                                throw Exception("HTTP Error $responseCode")
                                            }
                                        }

                                        generatedText?.let { content = it }
                                    } catch (e: Exception) {
                                        e.printStackTrace()
                                        android.widget.Toast.makeText(context, "Akıllı Taslak Hatası: ${e.message}", android.widget.Toast.LENGTH_SHORT).show()
                                    } finally {
                                        isGeneratingAi = false
                                    }
                                }
                            },
                            modifier = Modifier.align(Alignment.BottomEnd).padding(end = 8.dp, bottom = 8.dp).height(32.dp),
                            contentPadding = PaddingValues(horizontal = 8.dp)
                        ) {
                            if (isGeneratingAi) {
                                CircularProgressIndicator(modifier = Modifier.size(14.dp), strokeWidth = 2.dp)
                            } else {
                                Icon(Icons.Default.AutoAwesome, contentDescription = "Akıllı Taslak", modifier = Modifier.size(14.dp))
                                Spacer(modifier = Modifier.width(4.dp))
                                Text("Akıllı Taslak", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }

                item {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(Color(0xFFFFFBEB), RoundedCornerShape(12.dp))
                            .border(1.dp, Color(0xFFFEF3C7), RoundedCornerShape(12.dp))
                            .padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Column {
                            Text("ANKET EKLE", fontWeight = FontWeight.Black, fontSize = 12.sp, color = Color(0xFF92400E))
                            Text("Velilerden fikir veya onay alın.", fontSize = 10.sp, color = Color(0xFFB45309))
                        }
                        Switch(
                            checked = hasPoll,
                            onCheckedChange = { hasPoll = it }
                        )
                    }
                }
                
                if (hasPoll) {
                    item {
                        Text("Anket Seçenekleri", color = MaterialTheme.colorScheme.primary, fontSize = 12.sp, modifier = Modifier.padding(bottom = 8.dp))
                        // Simplified: Provide just two generic options in MVP or a single input
                        Text("Anket seçenekleri özelliği temel sürümde kalıplaşmış 'Evet/Hayır' olarak kaydedilecek. Kapsamlı geliştirme yakında eklenecektir.", fontSize = 10.sp, color = Color.Gray)
                    }
                }
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    onSave(title, content, targetAudience, selectedStudentIds.toList(), hasPoll, if(hasPoll) listOf("Evet", "Hayır") else emptyList())
                },
                enabled = title.isNotBlank() && content.isNotBlank()
            ) {
                Text("Velilere Gönder")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("İptal")
            }
        }
    )
}
