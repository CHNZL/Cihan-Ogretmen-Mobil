package com.example.ui.dashboard.tabs

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.ui.draw.alpha
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.GridView
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.PanTool
import androidx.compose.material.icons.filled.Shuffle
import androidx.compose.material.icons.filled.SwapHoriz
import androidx.compose.material.icons.filled.SwapVert
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.example.auth.UserData
import com.example.data.SeatingConfig
import com.example.data.SeatingPlanData
import com.example.data.Student
import com.google.firebase.firestore.FirebaseFirestore
import kotlinx.coroutines.tasks.await
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.material.icons.filled.Upload
import androidx.compose.material.icons.filled.Download
import androidx.compose.material.icons.filled.Print
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.ArrowForward
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.ArrowUpward
import androidx.compose.material.icons.filled.ArrowDownward
import androidx.compose.material.icons.filled.Delete
import android.content.Context
import android.print.PrintAttributes
import android.print.PrintManager
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import org.json.JSONObject
import org.json.JSONArray

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SeatingPlanTab(userData: UserData) {
    val db = FirebaseFirestore.getInstance(
        com.google.firebase.FirebaseApp.getInstance(),
        "ai-studio-50d2114a-6844-4ea4-a54d-c3de2ef685ab"
    )
    val teacherUid = userData.teacherUid.takeIf { it.isNotBlank() } ?: userData.userId

    var students by remember { mutableStateOf<List<Student>>(emptyList()) }
    var seatingConfig by remember { mutableStateOf(SeatingConfig()) }
    var seatingPlan by remember { mutableStateOf<Map<String, String>>(emptyMap()) }
    var isLoading by remember { mutableStateOf(true) }
    
    var isOptionsModalOpen by remember { mutableStateOf(false) }
    var isManualConfigModalOpen by remember { mutableStateOf(false) }
    var isPlacementScreenOpen by remember { mutableStateOf(false) }
    var isUnsavedPlan by remember { mutableStateOf(false) }
    var isYatayKaydirmaOpen by remember { mutableStateOf(false) }
    var isDikeyKaydirmaOpen by remember { mutableStateOf(false) }
    var isRandomPlacementOpen by remember { mutableStateOf(false) }

    val context = androidx.compose.ui.platform.LocalContext.current
    var jsonStringToExport by remember { mutableStateOf("") }

    val exportJsonLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.CreateDocument("application/json")
    ) { uri ->
        if (uri != null) {
            try {
                context.contentResolver.openOutputStream(uri)?.use { out ->
                    out.write(jsonStringToExport.toByteArray(Charsets.UTF_8))
                }
                Toast.makeText(context, "Plan JSON dosyası başarıyla kaydedildi!", Toast.LENGTH_SHORT).show()
            } catch (e: Exception) {
                Toast.makeText(context, "Kaydetme hatası: ${e.message}", Toast.LENGTH_LONG).show()
            }
        }
    }

    val importJsonLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri ->
        if (uri != null) {
            try {
                val jsonStr = context.contentResolver.openInputStream(uri)?.use { stream ->
                    stream.readBytes().toString(Charsets.UTF_8)
                }
                if (!jsonStr.isNullOrBlank()) {
                    val root = org.json.JSONObject(jsonStr)
                    
                    val parsedPlan = mutableMapOf<String, String>()
                    if (root.has("plan")) {
                        val planObj = root.getJSONObject("plan")
                        planObj.keys().forEach { key ->
                            parsedPlan[key] = planObj.getString(key)
                        }
                    } else if (root.has("seatingPlan")) {
                        val planObj = root.getJSONObject("seatingPlan")
                        planObj.keys().forEach { key ->
                            parsedPlan[key] = planObj.getString(key)
                        }
                    } else {
                        root.keys().forEach { key ->
                            parsedPlan[key] = root.getString(key)
                        }
                    }

                    var parsedConfig: SeatingConfig? = null
                    if (root.has("config")) {
                        val configObj = root.getJSONObject("config")
                        val groupCount = configObj.optInt("groupCount", 3)
                        val peoplePerRow = configObj.optInt("peoplePerRow", 2)
                        val rowsArr = configObj.optJSONArray("rowsPerGroup")
                        val rowsPerGroup = mutableListOf<Int>()
                        if (rowsArr != null) {
                            for (i in 0 until rowsArr.length()) {
                                rowsPerGroup.add(rowsArr.getInt(i))
                            }
                        } else {
                            for (i in 0 until groupCount) rowsPerGroup.add(5)
                        }
                        parsedConfig = SeatingConfig(
                            groupCount = groupCount,
                            peoplePerRow = peoplePerRow,
                            rowsPerGroup = rowsPerGroup
                        )
                    }

                    if (parsedPlan.isNotEmpty()) {
                        seatingPlan = parsedPlan
                        if (parsedConfig != null) {
                            seatingConfig = parsedConfig
                        }
                        isUnsavedPlan = true
                        Toast.makeText(context, "Plan başarıyla yüklendi! Kaydetmek için 'KAYDET' butonuna tıklayın.", Toast.LENGTH_LONG).show()
                    } else {
                        Toast.makeText(context, "Geçersiz plan dosyası (boş plan)", Toast.LENGTH_LONG).show()
                    }
                }
            } catch (e: Exception) {
                Toast.makeText(context, "Yükleme hatası: ${e.message}", Toast.LENGTH_LONG).show()
            }
        }
    }

    LaunchedEffect(teacherUid) {
        try {
            // Fetch students using properly structured request from repository to avoid deserialization errors.
            val repo = com.example.data.FirestoreRepository()
            students = repo.getStudents(teacherUid)

            // Fetch seating config
            val configSnapshot = db.collection("users").document(teacherUid).collection("config").document("seating").get().await()
            if (configSnapshot.exists()) {
                seatingConfig = configSnapshot.toObject(SeatingConfig::class.java) ?: SeatingConfig()
            }

            // Fetch seating plan
            val planSnapshot = db.collection("users").document(teacherUid).collection("config").document("seatingPlan").get().await()
            if (planSnapshot.exists()) {
                val planData = planSnapshot.toObject(SeatingPlanData::class.java)
                if (planData != null) {
                    seatingPlan = planData.plan
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
        } finally {
            isLoading = false
        }
    }

    if (isLoading) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            CircularProgressIndicator()
        }
        return
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFFF8FAFC))
            .padding(16.dp)
    ) {
        // Top Bar
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text(
                    "Oturma Planı",
                    fontSize = 24.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color(0xFF1E293B)
                )
            }
            Button(
                onClick = { isOptionsModalOpen = true },
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF4F46E5)),
                shape = RoundedCornerShape(12.dp)
            ) {
                Icon(Icons.Default.GridView, contentDescription = null, modifier = Modifier.size(20.dp))
                Spacer(modifier = Modifier.width(8.dp))
                Text("Oturma Planı Oluştur", fontWeight = FontWeight.Bold)
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        if (isUnsavedPlan) {
            Card(
                colors = CardDefaults.cardColors(containerColor = Color(0xFFFEF2F2)),
                border = BorderStroke(1.dp, Color(0xFFFCA5A5)),
                modifier = Modifier.fillMaxWidth().padding(bottom = 12.dp),
                shape = RoundedCornerShape(12.dp)
            ) {
                Row(
                    modifier = Modifier.padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Default.Warning,
                        contentDescription = "Uyarı",
                        tint = Color(0xFFEF4444),
                        modifier = Modifier.size(20.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        "Yüklenen plan henüz kaydedilmedi! Kapatmadan önce kalıcı olması için lütfen 'KAYDET' butonuna basın.",
                        fontSize = 12.sp,
                        color = Color(0xFF991B1B),
                        modifier = Modifier.weight(1f)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Button(
                        onClick = {
                            isLoading = true
                            db.collection("users").document(teacherUid).collection("config").document("seating")
                                .set(seatingConfig)
                                .addOnSuccessListener {
                                    db.collection("users").document(teacherUid).collection("config").document("seatingPlan")
                                        .set(SeatingPlanData(plan = seatingPlan))
                                        .addOnSuccessListener {
                                            isUnsavedPlan = false
                                            isLoading = false
                                            Toast.makeText(context, "Plan başarıyla kaydedildi!", Toast.LENGTH_SHORT).show()
                                        }
                                        .addOnFailureListener { e ->
                                            isLoading = false
                                            Toast.makeText(context, "Hata: ${e.message}", Toast.LENGTH_SHORT).show()
                                        }
                                }
                                .addOnFailureListener { e ->
                                    isLoading = false
                                    Toast.makeText(context, "Hata: ${e.message}", Toast.LENGTH_SHORT).show()
                                }
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFEF4444)),
                        shape = RoundedCornerShape(8.dp),
                        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp),
                        modifier = Modifier.height(32.dp)
                    ) {
                        Text("KAYDET", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 11.sp)
                    }
                }
            }
        }

        // Action Buttons & Legend Row (Import/Export/PDF)
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // LEDGER (Info indicators)
            Row(
                modifier = Modifier.weight(1f),
                horizontalArrangement = Arrangement.Start,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Box(
                    modifier = Modifier
                        .size(10.dp)
                        .background(Color(0xFFFDF2F8), RoundedCornerShape(3.dp))
                        .border(1.dp, Color(0xFFF472B6), RoundedCornerShape(3.dp))
                )
                Spacer(modifier = Modifier.width(2.dp))
                Text("Kız", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color.Gray)
                
                Spacer(modifier = Modifier.width(6.dp))
                
                Box(
                    modifier = Modifier
                        .size(10.dp)
                        .background(Color(0xFFEFF6FF), RoundedCornerShape(3.dp))
                        .border(1.dp, Color(0xFF60A5FA), RoundedCornerShape(3.dp))
                )
                Spacer(modifier = Modifier.width(2.dp))
                Text("Erkek", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color.Gray)
                
                Spacer(modifier = Modifier.width(6.dp))
                
                Box(
                    modifier = Modifier
                        .size(10.dp)
                        .background(Color(0xFFF1F5F9), RoundedCornerShape(3.dp))
                        .border(1.dp, Color(0xFFCBD5E1), RoundedCornerShape(3.dp))
                )
                Spacer(modifier = Modifier.width(2.dp))
                Text("Boş", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color.Gray)
            }

            // Import Button
            FilledTonalButton(
                onClick = { importJsonLauncher.launch("application/json") },
                colors = ButtonDefaults.filledTonalButtonColors(containerColor = Color(0xFFEFF6FF), contentColor = Color(0xFF2563EB)),
                shape = RoundedCornerShape(10.dp),
                contentPadding = PaddingValues(horizontal = 8.dp, vertical = 4.dp),
                modifier = Modifier.height(32.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.Upload,
                    contentDescription = null,
                    modifier = Modifier.size(14.dp)
                )
                Spacer(modifier = Modifier.width(4.dp))
                Text("Plan Yükle", fontSize = 11.sp, fontWeight = FontWeight.Bold)
            }

            if (seatingPlan.isNotEmpty()) {
                // Export Button
                FilledTonalButton(
                    onClick = {
                        try {
                            val root = JSONObject()
                            val configObj = JSONObject()
                            configObj.put("groupCount", seatingConfig.groupCount)
                            configObj.put("peoplePerRow", seatingConfig.peoplePerRow)
                            val rowsArr = JSONArray()
                            seatingConfig.rowsPerGroup.forEach { rowsArr.put(it) }
                            configObj.put("rowsPerGroup", rowsArr)
                            root.put("config", configObj)
                            
                            val planObj = JSONObject()
                            seatingPlan.forEach { (seatId, studentId) ->
                                planObj.put(seatId, studentId)
                            }
                            root.put("plan", planObj)
                            
                            jsonStringToExport = root.toString(2)
                            exportJsonLauncher.launch("oturma-plani.json")
                        } catch (e: Exception) {
                            Toast.makeText(context, "Hata: ${e.message}", Toast.LENGTH_LONG).show()
                        }
                    },
                    colors = ButtonDefaults.filledTonalButtonColors(containerColor = Color(0xFFF0FDF4), contentColor = Color(0xFF16A34A)),
                    shape = RoundedCornerShape(10.dp),
                    contentPadding = PaddingValues(horizontal = 8.dp, vertical = 4.dp),
                    modifier = Modifier.height(32.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Download,
                        contentDescription = null,
                        modifier = Modifier.size(14.dp)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("İndir", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                }

                // Print PDF Button
                FilledTonalButton(
                    onClick = {
                        printSeatingPlan(context, seatingConfig, seatingPlan, students)
                    },
                    colors = ButtonDefaults.filledTonalButtonColors(containerColor = Color(0xFFFFF7ED), contentColor = Color(0xFFEA580C)),
                    shape = RoundedCornerShape(10.dp),
                    contentPadding = PaddingValues(horizontal = 8.dp, vertical = 4.dp),
                    modifier = Modifier.height(32.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Print,
                        contentDescription = null,
                        modifier = Modifier.size(14.dp)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("PDF / Yazdır", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Seating Grid View
        if (seatingPlan.isEmpty()) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f),
                contentAlignment = Alignment.Center
            ) {
                Text("Henüz oturma planı oluşturulmamış.", color = Color.Gray)
            }
        } else {
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                shape = RoundedCornerShape(24.dp),
                elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
                border = BorderStroke(1.dp, Color(0xFFF1F5F9))
            ) {
                Box(
                    modifier = Modifier.fillMaxSize(),
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
                                                modifier = Modifier.size(width = 100.dp, height = 100.dp),
                                                colors = CardDefaults.cardColors(
                                                    containerColor = cardBgColor
                                                ),
                                                border = BorderStroke(
                                                    width = if (student != null) 2.dp else 1.dp,
                                                    color = cardBorderColor
                                                ),
                                                shape = RoundedCornerShape(16.dp)
                                            ) {
                                                Column(
                                                    modifier = Modifier.fillMaxSize().padding(8.dp),
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
                                                            textAlign = androidx.compose.ui.text.style.TextAlign.Center
                                                        )
                                                    } else {
                                                        Icon(
                                                            Icons.Default.Close,
                                                            contentDescription = "Boş",
                                                            tint = Color(0xFFCBD5E1),
                                                            modifier = Modifier.size(24.dp)
                                                        )
                                                        Text(
                                                            "BOŞ",
                                                            fontSize = 10.sp,
                                                            fontWeight = FontWeight.Bold,
                                                            color = Color(0xFFCBD5E1)
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
        }
    }

    if (isOptionsModalOpen) {
        Dialog(
            onDismissRequest = { isOptionsModalOpen = false },
            properties = DialogProperties(usePlatformDefaultWidth = false)
        ) {
            Surface(
                modifier = Modifier
                    .fillMaxWidth(0.9f)
                    .wrapContentHeight(),
                shape = RoundedCornerShape(24.dp),
                color = Color.White
            ) {
                Column(modifier = Modifier.padding(24.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text(
                                "Oturma Planı Seçenekleri",
                                fontSize = 20.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color(0xFF1E293B)
                            )
                            Text(
                                "Sınıfınız için oturma planını nasıl düzenlemek istediğinizi seçin.",
                                fontSize = 14.sp,
                                color = Color.Gray
                            )
                        }
                        IconButton(onClick = { isOptionsModalOpen = false }) {
                            Icon(Icons.Default.Close, contentDescription = null)
                        }
                    }

                    Spacer(modifier = Modifier.height(24.dp))

                    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                        Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                            OptionCard(
                                title = "Elle Yerleştirme",
                                description = "Öğrencileri sürükle-bırak ile manuel olarak yerleştirin.",
                                icon = Icons.Default.PanTool,
                                onClick = { 
                                    isOptionsModalOpen = false
                                    isManualConfigModalOpen = true
                                },
                                modifier = Modifier.weight(1f)
                            )
                            OptionCard(
                                title = "Rastgele Yerleştirme",
                                description = "Öğrencileri belirli kurallara göre otomatik yerleştirin.",
                                icon = Icons.Default.Shuffle,
                                onClick = {
                                    isOptionsModalOpen = false
                                    isRandomPlacementOpen = true
                                },
                                modifier = Modifier.weight(1f)
                            )
                        }
                        Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                            OptionCard(
                                title = "Yatay (Grup) Kaydırma",
                                description = "Öğrenci gruplarının yerini değiştirin.",
                                icon = Icons.Default.SwapHoriz,
                                onClick = {
                                    isOptionsModalOpen = false
                                    isYatayKaydirmaOpen = true
                                },
                                modifier = Modifier.weight(1f)
                            )
                            OptionCard(
                                title = "Dikey (Sıra) Kaydırma",
                                description = "Sıraların kendi içindeki yerlerini değiştirin.",
                                icon = Icons.Default.SwapVert,
                                onClick = {
                                    isOptionsModalOpen = false
                                    isDikeyKaydirmaOpen = true
                                },
                                modifier = Modifier.weight(1f)
                            )
                        }
                    }
                }
            }
        }
    }

    if (isManualConfigModalOpen) {
        ManualPlacementConfigDialog(
            config = seatingConfig,
            studentCount = students.size,
            onDismiss = { isManualConfigModalOpen = false },
            onOpenPlacement = { newConfig, loadedPlan ->
                seatingConfig = newConfig
                if (loadedPlan != null) {
                    seatingPlan = loadedPlan
                    isUnsavedPlan = true
                }
                isManualConfigModalOpen = false
                isPlacementScreenOpen = true
            }
        )
    }

    if (isPlacementScreenOpen) {
        ManualPlacementScreen(
            students = students,
            seatingConfig = seatingConfig,
            initialPlan = seatingPlan,
            onDismiss = { isPlacementScreenOpen = false },
            onSave = { newPlan ->
                seatingPlan = newPlan
                isPlacementScreenOpen = false
                isUnsavedPlan = true // Mark as unsaved so user knows they must explicitly save
            }
        )
    }

    if (isYatayKaydirmaOpen) {
        HorizontalShiftDialog(
            seatingConfig = seatingConfig,
            seatingPlan = seatingPlan,
            onDismiss = { isYatayKaydirmaOpen = false },
            onApplyShift = { newConfig, newPlan ->
                seatingConfig = newConfig
                seatingPlan = newPlan
                isUnsavedPlan = true
                isYatayKaydirmaOpen = false
                Toast.makeText(context, "Yatay kaydırma uygulandı! Kaydetmeyi unutmayın.", Toast.LENGTH_SHORT).show()
            }
        )
    }

    if (isDikeyKaydirmaOpen) {
        VerticalShiftDialog(
            seatingConfig = seatingConfig,
            seatingPlan = seatingPlan,
            onDismiss = { isDikeyKaydirmaOpen = false },
            onApplyShift = { newConfig, newPlan ->
                seatingConfig = newConfig
                seatingPlan = newPlan
                isUnsavedPlan = true
                isDikeyKaydirmaOpen = false
                Toast.makeText(context, "Dikey kaydırma uygulandı! Kaydetmeyi unutmayın.", Toast.LENGTH_SHORT).show()
            }
        )
    }

    if (isRandomPlacementOpen) {
        RandomPlacementDialog(
            students = students,
            seatingConfig = seatingConfig,
            seatingPlan = seatingPlan,
            onDismiss = { isRandomPlacementOpen = false },
            onApplyRandomPlacement = { newConfig, newPlan ->
                seatingConfig = newConfig
                seatingPlan = newPlan
                isUnsavedPlan = true
                isRandomPlacementOpen = false
                Toast.makeText(context, "Rastgele yerleştirme başarıyla uygulandı! Planı kaydetmeyi unutmayın.", Toast.LENGTH_LONG).show()
            }
        )
    }

}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RandomPlacementDialog(
    students: List<Student>,
    seatingConfig: SeatingConfig,
    seatingPlan: Map<String, String>,
    onDismiss: () -> Unit,
    onApplyRandomPlacement: (SeatingConfig, Map<String, String>) -> Unit
) {
    var currentStep by remember { mutableStateOf(1) }
    
    // Step 1: Optional old reference plan
    var tempPlan by remember { mutableStateOf<Map<String, String>?>(null) }
    var tempConfig by remember { mutableStateOf<SeatingConfig?>(null) }
    val context = androidx.compose.ui.platform.LocalContext.current

    val referenceImportLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri ->
        if (uri != null) {
            try {
                val jsonStr = context.contentResolver.openInputStream(uri)?.use { stream ->
                    stream.readBytes().toString(Charsets.UTF_8)
                }
                if (!jsonStr.isNullOrBlank()) {
                    val root = org.json.JSONObject(jsonStr)
                    val parsedPlan = mutableMapOf<String, String>()
                    if (root.has("plan")) {
                        val planObj = root.getJSONObject("plan")
                        planObj.keys().forEach { key ->
                            parsedPlan[key] = planObj.getString(key)
                        }
                    } else if (root.has("seatingPlan")) {
                        val planObj = root.getJSONObject("seatingPlan")
                        planObj.keys().forEach { key ->
                            parsedPlan[key] = planObj.getString(key)
                        }
                    } else {
                        root.keys().forEach { key ->
                            parsedPlan[key] = root.getString(key)
                        }
                    }

                    var parsedConfig: SeatingConfig? = null
                    if (root.has("config")) {
                        val configObj = root.getJSONObject("config")
                        val groupCount = configObj.optInt("groupCount", 3)
                        val peoplePerRow = configObj.optInt("peoplePerRow", 2)
                        val rowsArr = configObj.optJSONArray("rowsPerGroup")
                        val rowsPerGroup = mutableListOf<Int>()
                        if (rowsArr != null) {
                            for (i in 0 until rowsArr.length()) {
                                rowsPerGroup.add(rowsArr.getInt(i))
                            }
                        } else {
                            for (i in 0 until groupCount) rowsPerGroup.add(5)
                        }
                        parsedConfig = SeatingConfig(
                            groupCount = groupCount,
                            peoplePerRow = peoplePerRow,
                            rowsPerGroup = rowsPerGroup
                        )
                    }

                    if (parsedPlan.isNotEmpty()) {
                        tempPlan = parsedPlan
                        if (parsedConfig != null) {
                            tempConfig = parsedConfig
                        } else {
                            tempConfig = seatingConfig
                        }
                        Toast.makeText(context, "Plan başarıyla yüklendi!", Toast.LENGTH_SHORT).show()
                    } else {
                        Toast.makeText(context, "Geçersiz plan dosyası (boş plan)", Toast.LENGTH_LONG).show()
                    }
                }
            } catch (e: Exception) {
                Toast.makeText(context, "Yükleme hatası: ${e.message}", Toast.LENGTH_LONG).show()
            }
        }
    }

    // Step 2: Classroom dimensions configuration bounds
    var customGroupCountStr by remember { mutableStateOf(seatingConfig.groupCount.toString()) }
    var customPeoplePerRowStr by remember { mutableStateOf(seatingConfig.peoplePerRow.toString()) }
    val customRowsPerGroupMap = remember {
        androidx.compose.runtime.mutableStateMapOf<Int, String>().apply {
            seatingConfig.rowsPerGroup.forEachIndexed { index, value -> put(index, value.toString()) }
        }
    }

    // On loaded config update, set values
    LaunchedEffect(tempConfig) {
        tempConfig?.let {
            customGroupCountStr = it.groupCount.toString()
            customPeoplePerRowStr = it.peoplePerRow.toString()
            customRowsPerGroupMap.clear()
            it.rowsPerGroup.forEachIndexed { index, value ->
                customRowsPerGroupMap[index] = value.toString()
            }
        }
    }

    val currentGroupCount = customGroupCountStr.toIntOrNull() ?: 0
    val currentPeoplePerRow = customPeoplePerRowStr.toIntOrNull() ?: 0
    val currentRowsPerGroup = List(currentGroupCount) { idx ->
        customRowsPerGroupMap[idx]?.toIntOrNull() ?: 5
    }
    val totalCapacity = currentRowsPerGroup.sum() * currentPeoplePerRow

    // Step 3: General and custom placement conditions
    var mixGenders by remember { mutableStateOf(true) }
    var diffGroup by remember { mutableStateOf(false) }
    var diffRow by remember { mutableStateOf(false) }
    var diffPartner by remember { mutableStateOf(false) }

    // Fixed students selection state helper
    data class FixedSelection(
        val studentId: String,
        val nameSurname: String,
        val groupIdx: Int,
        val rowIdx: Int,
        val seatIdx: Int
    )
    val fixedSelections = remember { mutableStateListOf<FixedSelection>() }

    // Dropdown choices states
    var selectedStudentForFixed by remember { mutableStateOf<Student?>(null) }
    var selectedGroupIdxForFixed by remember { mutableStateOf(0) }
    var selectedRowIdxForFixed by remember { mutableStateOf(0) }
    var selectedSeatIdxForFixed by remember { mutableStateOf(0) }

    // Step 4: Priority selection list
    val priorityStudentIds = remember { mutableStateListOf<String>() }

    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        Surface(
            modifier = Modifier
                .fillMaxWidth(0.92f)
                .fillMaxHeight(0.88f),
            shape = RoundedCornerShape(24.dp),
            color = Color.White,
            shadowElevation = 8.dp
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(24.dp)
            ) {
                // Header
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = "Rastgele Yerleştirme Kuralları - Adım $currentStep/5",
                            fontSize = 20.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF1E293B)
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = when (currentStep) {
                                1 -> "Daha önce bir plana göre kurallar uygulamak için bir .json dosyası yükleyin veya bu adımı atlayın."
                                2 -> "Sıra ve grup parametrelerini belirleyerek sınıf yerleşiminizi yapılandırın."
                                3 -> "Öğrencilerin yerleşim kurallarını seçin ve isterseniz bazı öğrencileri sabitleyin."
                                4 -> "Ön sıralara yerleştirmek istediğiniz öncelikli öğrencileri işaretleyin."
                                else -> "Son kuralları gözden geçirip kura çekimini başlatın."
                            },
                            fontSize = 12.sp,
                            color = Color.Gray,
                            lineHeight = 15.sp
                        )
                    }
                    IconButton(onClick = onDismiss) {
                        Icon(Icons.Default.Close, contentDescription = null, tint = Color.Gray)
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                // Scrollable main content panel
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxWidth()
                ) {
                    when (currentStep) {
                        1 -> {
                            // STEP 1: LOAD REF PLAN (OPTIONAL)
                            Column(
                                modifier = Modifier
                                    .fillMaxSize()
                                    .verticalScroll(rememberScrollState()),
                                horizontalAlignment = Alignment.CenterHorizontally,
                                verticalArrangement = Arrangement.Center
                            ) {
                                Text(
                                    text = "Referans Plan Yükleme (İsteğe Bağlı)",
                                    fontSize = 16.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color(0xFF1E293B)
                                )
                                Spacer(modifier = Modifier.height(6.dp))
                                Text(
                                    text = "\"Farklı sırada otursun\" veya \"farklı grupta otursun\" gibi kuralları uygulayabilmek için bir önceki döneme ait (.json) oturma planı dosyanızı yükleyebilirsiniz.",
                                    fontSize = 12.sp,
                                    color = Color.Gray,
                                    textAlign = TextAlign.Center,
                                    modifier = Modifier.padding(horizontal = 16.dp)
                                )

                                Spacer(modifier = Modifier.height(24.dp))

                                Card(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .height(160.dp),
                                    colors = CardDefaults.cardColors(
                                        containerColor = if (tempPlan != null) Color(0xFFECFDF5) else Color(0xFFF8FAFC)
                                    ),
                                    border = BorderStroke(
                                        width = 1.dp,
                                        color = if (tempPlan != null) Color(0xFF10B981) else Color(0xFFE2E8F0)
                                    ),
                                    shape = RoundedCornerShape(16.dp)
                                ) {
                                    Column(
                                        modifier = Modifier
                                            .fillMaxSize()
                                            .padding(16.dp),
                                        horizontalAlignment = Alignment.CenterHorizontally,
                                        verticalArrangement = Arrangement.Center
                                    ) {
                                        Icon(
                                            imageVector = Icons.Default.Upload,
                                            contentDescription = null,
                                            tint = if (tempPlan != null) Color(0xFF059669) else Color(0xFF64748B),
                                            modifier = Modifier.size(36.dp)
                                        )
                                        Spacer(modifier = Modifier.height(10.dp))
                                        Text(
                                            text = if (tempPlan != null) "Referans Plan Yüklendi" else "Referans Plan Yüklü Değil",
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 14.sp,
                                            color = if (tempPlan != null) Color(0xFF047857) else Color(0xFF1E293B)
                                        )
                                        Spacer(modifier = Modifier.height(2.dp))
                                        Text(
                                            text = if (tempPlan != null) {
                                                "Sınıf parametreleri otomatik güncellendi ve önceki plana göre kurallar aktif!"
                                            } else {
                                                "Devam edebilirsiniz, ancak önceki plana ait akıllı yerleştirme kuralları devre dışı kalacaktır."
                                            },
                                            fontSize = 11.sp,
                                            color = Color.Gray,
                                            textAlign = TextAlign.Center,
                                            lineHeight = 14.sp
                                        )
                                    }
                                }

                                Spacer(modifier = Modifier.height(24.dp))

                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                                ) {
                                    Button(
                                        onClick = { referenceImportLauncher.launch("application/json") },
                                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFF97316)),
                                        shape = RoundedCornerShape(12.dp),
                                        modifier = Modifier
                                            .weight(1f)
                                            .height(48.dp)
                                    ) {
                                        Icon(Icons.Default.Upload, contentDescription = null, tint = Color.White)
                                        Spacer(modifier = Modifier.width(8.dp))
                                        Text("Referans Plan Yükle", color = Color.White, fontWeight = FontWeight.Bold)
                                    }
                                    if (tempPlan != null) {
                                        OutlinedButton(
                                            onClick = {
                                                tempPlan = null
                                                tempConfig = null
                                            },
                                            shape = RoundedCornerShape(12.dp),
                                            border = BorderStroke(1.dp, Color.Red),
                                            colors = ButtonDefaults.outlinedButtonColors(contentColor = Color.Red),
                                            modifier = Modifier.height(48.dp)
                                        ) {
                                            Text("Sıfırla", fontWeight = FontWeight.Bold)
                                        }
                                    }
                                }
                            }
                        }
                        2 -> {
                            // STEP 2: CLASSROOM DIMENSIONS PICKER (Steppers + Custom capacities)
                            Column(
                                modifier = Modifier
                                    .fillMaxSize()
                                    .verticalScroll(rememberScrollState()),
                                verticalArrangement = Arrangement.spacedBy(16.dp)
                            ) {
                                Text(
                                    "Sınıf Temel Düzeni",
                                    fontSize = 15.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color(0xFF1E293B)
                                )

                                Row(
                                    horizontalArrangement = Arrangement.spacedBy(16.dp),
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    // Group count stepper
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text("Grup Sayısı", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Color(0xFF1E293B))
                                        Spacer(modifier = Modifier.height(6.dp))
                                        Row(
                                            verticalAlignment = Alignment.CenterVertically,
                                            horizontalArrangement = Arrangement.Center,
                                            modifier = Modifier
                                                .fillMaxWidth()
                                                .background(Color(0xFFF1F5F9), RoundedCornerShape(12.dp))
                                                .padding(4.dp)
                                        ) {
                                            TextButton(
                                                onClick = {
                                                    val count = customGroupCountStr.toIntOrNull() ?: 3
                                                    if (count > 1) {
                                                        customGroupCountStr = (count - 1).toString()
                                                    }
                                                },
                                                modifier = Modifier.size(36.dp),
                                                contentPadding = PaddingValues(0.dp)
                                            ) {
                                                Text("-", fontSize = 18.sp, fontWeight = FontWeight.Black, color = Color(0xFF1E293B))
                                            }
                                            
                                            OutlinedTextField(
                                                value = customGroupCountStr,
                                                onValueChange = { customGroupCountStr = it },
                                                keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = androidx.compose.ui.text.input.KeyboardType.Number),
                                                textStyle = androidx.compose.ui.text.TextStyle(textAlign = androidx.compose.ui.text.style.TextAlign.Center, fontWeight = FontWeight.Bold, fontSize = 14.sp),
                                                modifier = Modifier.width(50.dp).height(44.dp),
                                                singleLine = true,
                                                shape = RoundedCornerShape(8.dp),
                                                colors = OutlinedTextFieldDefaults.colors(
                                                    focusedBorderColor = Color(0xFFCBD5E1),
                                                    unfocusedBorderColor = Color(0xFFE2E8F0),
                                                    focusedContainerColor = Color.White,
                                                    unfocusedContainerColor = Color.White
                                                )
                                            )

                                            TextButton(
                                                onClick = {
                                                    val count = customGroupCountStr.toIntOrNull() ?: 3
                                                    if (count < 12) {
                                                        customGroupCountStr = (count + 1).toString()
                                                    }
                                                },
                                                modifier = Modifier.size(36.dp),
                                                contentPadding = PaddingValues(0.dp)
                                            ) {
                                                Text("+", fontSize = 18.sp, fontWeight = FontWeight.Black, color = Color(0xFF1E293B))
                                            }
                                        }
                                        Text("Sıra gruplarının sayısı.", fontSize = 10.sp, color = Color.Gray, modifier = Modifier.padding(top = 2.dp))
                                    }

                                    // People Per Row Stepper
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text("Sıradaki Kişi Sayısı", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Color(0xFF1E293B))
                                        Spacer(modifier = Modifier.height(6.dp))
                                        Row(
                                            verticalAlignment = Alignment.CenterVertically,
                                            horizontalArrangement = Arrangement.Center,
                                            modifier = Modifier
                                                .fillMaxWidth()
                                                .background(Color(0xFFF1F5F9), RoundedCornerShape(12.dp))
                                                .padding(4.dp)
                                        ) {
                                            TextButton(
                                                onClick = {
                                                    val count = customPeoplePerRowStr.toIntOrNull() ?: 2
                                                    if (count > 1) {
                                                        customPeoplePerRowStr = (count - 1).toString()
                                                    }
                                                },
                                                modifier = Modifier.size(36.dp),
                                                contentPadding = PaddingValues(0.dp)
                                            ) {
                                                Text("-", fontSize = 18.sp, fontWeight = FontWeight.Black, color = Color(0xFF1E293B))
                                            }
                                            
                                            OutlinedTextField(
                                                value = customPeoplePerRowStr,
                                                onValueChange = { customPeoplePerRowStr = it },
                                                keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = androidx.compose.ui.text.input.KeyboardType.Number),
                                                textStyle = androidx.compose.ui.text.TextStyle(textAlign = androidx.compose.ui.text.style.TextAlign.Center, fontWeight = FontWeight.Bold, fontSize = 14.sp),
                                                modifier = Modifier.width(50.dp).height(44.dp),
                                                singleLine = true,
                                                shape = RoundedCornerShape(8.dp),
                                                colors = OutlinedTextFieldDefaults.colors(
                                                    focusedBorderColor = Color(0xFFCBD5E1),
                                                    unfocusedBorderColor = Color(0xFFE2E8F0),
                                                    focusedContainerColor = Color.White,
                                                    unfocusedContainerColor = Color.White
                                                )
                                            )

                                            TextButton(
                                                onClick = {
                                                    val count = customPeoplePerRowStr.toIntOrNull() ?: 2
                                                    if (count < 6) {
                                                        customPeoplePerRowStr = (count + 1).toString()
                                                    }
                                                },
                                                modifier = Modifier.size(36.dp),
                                                contentPadding = PaddingValues(0.dp)
                                            ) {
                                                Text("+", fontSize = 18.sp, fontWeight = FontWeight.Black, color = Color(0xFF1E293B))
                                            }
                                        }
                                        Text("Her sıraya kaç kişi oturacak?", fontSize = 10.sp, color = Color.Gray, modifier = Modifier.padding(top = 2.dp))
                                    }
                                }

                                Text("Gruptaki Sıra Sayısı", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Color(0xFF1E293B))
                                
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .horizontalScroll(rememberScrollState()),
                                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                                ) {
                                    for (idx in 0 until currentGroupCount) {
                                        Column(
                                            horizontalAlignment = Alignment.CenterHorizontally,
                                            modifier = Modifier
                                                .background(Color(0xFFF8FAFC), RoundedCornerShape(12.dp))
                                                .border(1.dp, Color(0xFFE2E8F0), RoundedCornerShape(12.dp))
                                                .padding(vertical = 10.dp, horizontal = 8.dp)
                                                .width(115.dp)
                                        ) {
                                            Text("${idx + 1}. GRUP", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = Color(0xFF64748B))
                                            Spacer(modifier = Modifier.height(6.dp))
                                            
                                            Row(
                                                verticalAlignment = Alignment.CenterVertically,
                                                horizontalArrangement = Arrangement.Center,
                                                modifier = Modifier
                                                    .fillMaxWidth()
                                                    .background(Color(0xFFF1F5F9), RoundedCornerShape(8.dp))
                                                    .padding(2.dp)
                                            ) {
                                                TextButton(
                                                    onClick = {
                                                        val currentValue = (customRowsPerGroupMap[idx] ?: "5").toIntOrNull() ?: 5
                                                        if (currentValue > 1) {
                                                            customRowsPerGroupMap[idx] = (currentValue - 1).toString()
                                                        }
                                                    },
                                                    modifier = Modifier.size(28.dp),
                                                    contentPadding = PaddingValues(0.dp)
                                                ) {
                                                    Text("-", fontSize = 15.sp, fontWeight = FontWeight.Black, color = Color(0xFF1E293B))
                                                }
                                                
                                                OutlinedTextField(
                                                    value = customRowsPerGroupMap[idx] ?: "5",
                                                    onValueChange = { customRowsPerGroupMap[idx] = it },
                                                    keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = androidx.compose.ui.text.input.KeyboardType.Number),
                                                    textStyle = androidx.compose.ui.text.TextStyle(
                                                        textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                                                        fontWeight = FontWeight.Bold,
                                                        fontSize = 13.sp,
                                                        color = Color(0xFF1E293B)
                                                    ),
                                                    modifier = Modifier.width(52.dp).height(44.dp),
                                                    singleLine = true,
                                                    shape = RoundedCornerShape(8.dp),
                                                    colors = OutlinedTextFieldDefaults.colors(
                                                        focusedTextColor = Color(0xFF1E293B),
                                                        unfocusedTextColor = Color(0xFF1E293B),
                                                        focusedBorderColor = Color(0xFFCBD5E1),
                                                        unfocusedBorderColor = Color(0xFFE2E8F0),
                                                        focusedContainerColor = Color.White,
                                                        unfocusedContainerColor = Color.White
                                                    )
                                                )

                                                TextButton(
                                                    onClick = {
                                                        val currentValue = (customRowsPerGroupMap[idx] ?: "5").toIntOrNull() ?: 5
                                                        if (currentValue < 12) {
                                                            customRowsPerGroupMap[idx] = (currentValue + 1).toString()
                                                        }
                                                    },
                                                    modifier = Modifier.size(28.dp),
                                                    contentPadding = PaddingValues(0.dp)
                                                ) {
                                                    Text("+", fontSize = 15.sp, fontWeight = FontWeight.Black, color = Color(0xFF1E293B))
                                                }
                                            }
                                        }
                                    }
                                }

                                Spacer(modifier = Modifier.height(8.dp))

                                // Capacity status card
                                val isCapacitySufficient = totalCapacity >= students.size && currentGroupCount > 0 && currentPeoplePerRow > 0
                                Card(
                                    modifier = Modifier.fillMaxWidth(),
                                    colors = CardDefaults.cardColors(
                                        containerColor = if (isCapacitySufficient) Color(0xFFEFF6FF) else Color(0xFFFEF2F2)
                                    ),
                                    border = BorderStroke(
                                        width = 1.dp,
                                        color = if (isCapacitySufficient) Color(0xFFBFDBFE) else Color(0xFFFCA5A5)
                                    )
                                ) {
                                    Row(
                                        modifier = Modifier.padding(16.dp),
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Icon(
                                            imageVector = Icons.Default.Warning,
                                            contentDescription = null,
                                            tint = if (isCapacitySufficient) Color(0xFF2563EB) else Color(0xFFDC2626)
                                        )
                                        Spacer(modifier = Modifier.width(12.dp))
                                        Column {
                                            Text(
                                                "Kapasite Durumu",
                                                fontWeight = FontWeight.Bold,
                                                fontSize = 13.sp,
                                                color = if (isCapacitySufficient) Color(0xFF1D4ED8) else Color(0xFF991B1B)
                                            )
                                            Text(
                                                "Oluşturulan toplam sıra kapasitesi $totalCapacity kişidir. Sınıf listenizdeki ${students.size} öğrenciden ${kotlin.math.min(students.size, totalCapacity)} tanesi yerleştirilecek.",
                                                fontSize = 11.sp,
                                                color = Color.Gray,
                                                lineHeight = 14.sp
                                            )
                                        }
                                    }
                                }
                            }
                        }
                        3 -> {
                            // STEP 3: CONSTRAINTS & FIXED STUDENTS
                            Column(
                                modifier = Modifier
                                    .fillMaxSize()
                                    .verticalScroll(rememberScrollState()),
                                verticalArrangement = Arrangement.spacedBy(16.dp)
                            ) {
                                // 3.1 GENDER MIX
                                Card(
                                    modifier = Modifier.fillMaxWidth(),
                                    colors = CardDefaults.cardColors(containerColor = Color(0xFFF8FAFC)),
                                    border = BorderStroke(1.dp, Color(0xFFE2E8F0)),
                                    shape = RoundedCornerShape(16.dp)
                                ) {
                                    Column(modifier = Modifier.padding(16.dp)) {
                                        Text("Genel Kurallar", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = Color.Black)
                                        Spacer(modifier = Modifier.height(12.dp))
                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            verticalAlignment = Alignment.CenterVertically,
                                            horizontalArrangement = Arrangement.SpaceBetween
                                        ) {
                                            Column(modifier = Modifier.weight(1f)) {
                                                Text(
                                                    "Kız-Erkek Karışık Otursun",
                                                    fontWeight = FontWeight.Bold,
                                                    fontSize = 13.sp,
                                                    color = Color.Black
                                                )
                                                Text(
                                                    "Etkinse, different cinsiyetteki öğrenciler yan yana getirilmeye çalışılacaktır.",
                                                    fontSize = 11.sp,
                                                    color = Color.Gray,
                                                    lineHeight = 14.sp
                                                )
                                            }
                                            Switch(
                                                checked = mixGenders,
                                                onCheckedChange = { mixGenders = it }
                                            )
                                        }
                                    }
                                }

                                // 3.2 REF PLAN UNIQUE RULES
                                val oldPlanLoaded = tempPlan != null
                                Card(
                                    modifier = Modifier.fillMaxWidth(),
                                    colors = CardDefaults.cardColors(
                                        containerColor = if (oldPlanLoaded) Color(0xFFF8FAFC) else Color(0xFFF1F5F9).copy(alpha = 0.6f)
                                    ),
                                    border = BorderStroke(1.dp, Color(0xFFE2E8F0)),
                                    shape = RoundedCornerShape(16.dp)
                                ) {
                                    Column(
                                        modifier = Modifier
                                            .padding(16.dp)
                                            .alpha(if (oldPlanLoaded) 1f else 0.45f)
                                    ) {
                                        Text("Önceki Yerleştirmeye Göre Kurallar", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = Color.Black)
                                        Spacer(modifier = Modifier.height(4.dp))
                                        if (!oldPlanLoaded) {
                                            Text(
                                                "(Bu kuralların aktif olması için Adım 1'de bir referans plan dosyası yüklenmiş olmalıdır.)",
                                                fontSize = 10.sp,
                                                color = Color.Gray,
                                                fontStyle = androidx.compose.ui.text.font.FontStyle.Italic
                                            )
                                            Spacer(modifier = Modifier.height(8.dp))
                                        } else {
                                            Spacer(modifier = Modifier.height(12.dp))
                                        }

                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            verticalAlignment = Alignment.CenterVertically,
                                            horizontalArrangement = Arrangement.SpaceBetween
                                        ) {
                                            Column(modifier = Modifier.weight(1f)) {
                                                Text("Her öğrenci farklı gruba yerleştirilsin", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Color.Black)
                                                Text("Öğrenci eski planındaki gruptan farklı bir gruba atanır.", fontSize = 11.sp, color = Color.Gray)
                                            }
                                            Switch(
                                                checked = diffGroup && oldPlanLoaded,
                                                onCheckedChange = { if (oldPlanLoaded) diffGroup = it },
                                                enabled = oldPlanLoaded
                                            )
                                        }
                                        Spacer(modifier = Modifier.height(12.dp))
                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            verticalAlignment = Alignment.CenterVertically,
                                            horizontalArrangement = Arrangement.SpaceBetween
                                        ) {
                                            Column(modifier = Modifier.weight(1f)) {
                                                Text("Her öğrenci farklı sırada otursun", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Color.Black)
                                                Text("Öğrencinin eski planındaki sıra index'i değiştirilir.", fontSize = 11.sp, color = Color.Gray)
                                            }
                                            Switch(
                                                checked = diffRow && oldPlanLoaded,
                                                onCheckedChange = { if (oldPlanLoaded) diffRow = it },
                                                enabled = oldPlanLoaded
                                            )
                                        }
                                        Spacer(modifier = Modifier.height(12.dp))
                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            verticalAlignment = Alignment.CenterVertically,
                                            horizontalArrangement = Arrangement.SpaceBetween
                                        ) {
                                            Column(modifier = Modifier.weight(1f)) {
                                                Text("Her öğrenci farklı kişi ile otursun", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Color.Black)
                                                Text("Mümkün mertebe eski partnerinin yanına oturtulmaz.", fontSize = 11.sp, color = Color.Gray)
                                            }
                                            Switch(
                                                checked = diffPartner && oldPlanLoaded,
                                                onCheckedChange = { if (oldPlanLoaded) diffPartner = it },
                                                enabled = oldPlanLoaded
                                            )
                                        }
                                    }
                                }

                                // 3.3 FIXED STUDENTS SECTION
                                Card(
                                    modifier = Modifier.fillMaxWidth(),
                                    colors = CardDefaults.cardColors(containerColor = Color(0xFFF8FAFC)),
                                    border = BorderStroke(1.dp, Color(0xFFE2E8F0)),
                                    shape = RoundedCornerShape(16.dp)
                                ) {
                                    Column(modifier = Modifier.padding(16.dp)) {
                                        Text("Sabit Öğrenciler", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = Color.Black)
                                        Text("Yeri değişmeyecek öğrencileri belirleyin.", fontSize = 11.sp, color = Color.Gray)
                                        Spacer(modifier = Modifier.height(12.dp))

                                        // Form Fields for Locking
                                        var expandedStudent by remember { mutableStateOf(false) }
                                        var expandedGroup by remember { mutableStateOf(false) }
                                        var expandedRow by remember { mutableStateOf(false) }
                                        var expandedSeat by remember { mutableStateOf(false) }

                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                                        ) {
                                            // Select Student Dropdown
                                            Column(modifier = Modifier.weight(1.8f)) {
                                                Text("ÖĞRENCİ", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = Color.Gray)
                                                Box {
                                                    OutlinedButton(
                                                        onClick = { expandedStudent = true },
                                                        shape = RoundedCornerShape(8.dp),
                                                        contentPadding = PaddingValues(horizontal = 8.dp),
                                                        modifier = Modifier.fillMaxWidth().height(42.dp)
                                                    ) {
                                                        Text(
                                                            text = selectedStudentForFixed?.let { "(${it.studentNo}) ${it.name}" } ?: "Seçin...",
                                                            fontSize = 11.sp,
                                                            maxLines = 1,
                                                            overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis
                                                        )
                                                    }
                                                    DropdownMenu(
                                                        expanded = expandedStudent,
                                                        onDismissRequest = { expandedStudent = false },
                                                        modifier = Modifier.width(180.dp).heightIn(max = 240.dp)
                                                    ) {
                                                        students.forEach { s ->
                                                            DropdownMenuItem(
                                                                text = { Text("(${s.studentNo}) ${s.name} ${s.surname}", fontSize = 12.sp) },
                                                                onClick = {
                                                                    selectedStudentForFixed = s
                                                                    expandedStudent = false
                                                                }
                                                            )
                                                        }
                                                    }
                                                }
                                            }

                                            // Select Group Dropdown
                                            Column(modifier = Modifier.weight(1f)) {
                                                Text("GRUP", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = Color.Gray)
                                                Box {
                                                    OutlinedButton(
                                                        onClick = { expandedGroup = true },
                                                        shape = RoundedCornerShape(8.dp),
                                                        contentPadding = PaddingValues(horizontal = 4.dp),
                                                        modifier = Modifier.fillMaxWidth().height(42.dp)
                                                    ) {
                                                        Text("${selectedGroupIdxForFixed + 1}. Grup", fontSize = 10.sp, maxLines = 1)
                                                    }
                                                    DropdownMenu(
                                                        expanded = expandedGroup,
                                                        onDismissRequest = { expandedGroup = false }
                                                    ) {
                                                        for (i in 0 until currentGroupCount) {
                                                            DropdownMenuItem(
                                                                text = { Text("${i + 1}. Grup", fontSize = 12.sp) },
                                                                onClick = {
                                                                    selectedGroupIdxForFixed = i
                                                                    val chosenGroupRows = currentRowsPerGroup.getOrElse(i) { 5 }
                                                                    if (selectedRowIdxForFixed >= chosenGroupRows) {
                                                                        selectedRowIdxForFixed = 0
                                                                    }
                                                                    expandedGroup = false
                                                                }
                                                            )
                                                        }
                                                    }
                                                }
                                            }

                                            // Select Row Dropdown
                                            val rowsInSelectedGroup = currentRowsPerGroup.getOrElse(selectedGroupIdxForFixed) { 5 }
                                            Column(modifier = Modifier.weight(1f)) {
                                                Text("SIRA", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = Color.Gray)
                                                Box {
                                                    OutlinedButton(
                                                        onClick = { expandedRow = true },
                                                        shape = RoundedCornerShape(8.dp),
                                                        contentPadding = PaddingValues(horizontal = 4.dp),
                                                        modifier = Modifier.fillMaxWidth().height(42.dp)
                                                    ) {
                                                        Text("${selectedRowIdxForFixed + 1}. Sıra", fontSize = 10.sp, maxLines = 1)
                                                    }
                                                    DropdownMenu(
                                                        expanded = expandedRow,
                                                        onDismissRequest = { expandedRow = false }
                                                    ) {
                                                        for (r in 0 until rowsInSelectedGroup) {
                                                            DropdownMenuItem(
                                                                text = { Text("${r + 1}. Sıra", fontSize = 12.sp) },
                                                                onClick = {
                                                                    selectedRowIdxForFixed = r
                                                                    expandedRow = false
                                                                }
                                                            )
                                                        }
                                                    }
                                                }
                                            }

                                            // Select Seat Dropdown
                                            Column(modifier = Modifier.weight(1f)) {
                                                Text("KOLTUK", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = Color.Gray)
                                                Box {
                                                    OutlinedButton(
                                                        onClick = { expandedSeat = true },
                                                        shape = RoundedCornerShape(8.dp),
                                                        contentPadding = PaddingValues(horizontal = 4.dp),
                                                        modifier = Modifier.fillMaxWidth().height(42.dp)
                                                    ) {
                                                        Text("${selectedSeatIdxForFixed + 1}. Klt.", fontSize = 10.sp, maxLines = 1)
                                                    }
                                                    DropdownMenu(
                                                        expanded = expandedSeat,
                                                        onDismissRequest = { expandedSeat = false }
                                                    ) {
                                                        for (s in 0 until currentPeoplePerRow) {
                                                            DropdownMenuItem(
                                                                text = { Text("${s + 1}. Koltuk", fontSize = 12.sp) },
                                                                onClick = {
                                                                    selectedSeatIdxForFixed = s
                                                                    expandedSeat = false
                                                                }
                                                            )
                                                        }
                                                    }
                                                }
                                            }
                                        }

                                        Spacer(modifier = Modifier.height(14.dp))

                                        Button(
                                            onClick = {
                                                val s = selectedStudentForFixed
                                                if (s == null) {
                                                    Toast.makeText(context, "Lütfen sabitlemek için bir öğrenci seçin", Toast.LENGTH_SHORT).show()
                                                } else {
                                                    val alreadyFixed = fixedSelections.any { it.studentId == s.id }
                                                    val seatConflicts = fixedSelections.any {
                                                        it.groupIdx == selectedGroupIdxForFixed &&
                                                        it.rowIdx == selectedRowIdxForFixed &&
                                                        it.seatIdx == selectedSeatIdxForFixed
                                                    }
                                                    if (alreadyFixed) {
                                                        Toast.makeText(context, "Seçilen öğrenci zaten başka bir yere sabitlenmiş!", Toast.LENGTH_LONG).show()
                                                    } else if (seatConflicts) {
                                                        Toast.makeText(context, "Seçilen oturma yeri zaten başka bir öğrenci tarafından işgal edilmiş!", Toast.LENGTH_LONG).show()
                                                    } else {
                                                        fixedSelections.add(
                                                            FixedSelection(
                                                                studentId = s.id,
                                                                nameSurname = "${s.name} ${s.surname}",
                                                                groupIdx = selectedGroupIdxForFixed,
                                                                rowIdx = selectedRowIdxForFixed,
                                                                seatIdx = selectedSeatIdxForFixed
                                                            )
                                                        )
                                                        selectedStudentForFixed = null
                                                    }
                                                }
                                            },
                                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF38BDF8)),
                                            shape = RoundedCornerShape(10.dp),
                                            modifier = Modifier.fillMaxWidth().height(40.dp)
                                        ) {
                                            Text("+ Öğrenciyi Sabitle", fontWeight = FontWeight.Bold, color = Color.White, fontSize = 12.sp)
                                        }

                                        Spacer(modifier = Modifier.height(16.dp))

                                        Text(
                                            "SABİTLENMİŞ ÖĞRENCİLER (${fixedSelections.size})",
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 11.sp,
                                            color = Color.Gray
                                        )
                                        Spacer(modifier = Modifier.height(6.dp))

                                        if (fixedSelections.isEmpty()) {
                                            Text(
                                                "Henüz sabitlenmiş öğrenci yok.",
                                                fontSize = 11.sp,
                                                color = Color.Gray,
                                                fontStyle = androidx.compose.ui.text.font.FontStyle.Italic,
                                                modifier = Modifier.padding(vertical = 4.dp)
                                            )
                                        } else {
                                            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                                fixedSelections.forEach { fs ->
                                                    Row(
                                                        modifier = Modifier
                                                            .fillMaxWidth()
                                                            .background(Color.White, RoundedCornerShape(8.dp))
                                                            .border(1.dp, Color(0xFFE2E8F0), RoundedCornerShape(8.dp))
                                                            .padding(horizontal = 12.dp, vertical = 6.dp),
                                                        horizontalArrangement = Arrangement.SpaceBetween,
                                                        verticalAlignment = Alignment.CenterVertically
                                                    ) {
                                                        Text(
                                                            text = "${fs.nameSurname} -> ${fs.groupIdx + 1}. Grup, ${fs.rowIdx + 1}. Sıra, ${fs.seatIdx + 1}. Koltuk",
                                                            fontSize = 11.sp,
                                                            color = Color(0xFF1E293B),
                                                            fontWeight = FontWeight.Medium,
                                                            modifier = Modifier.weight(1f)
                                                        )
                                                        IconButton(
                                                            onClick = { fixedSelections.remove(fs) },
                                                            modifier = Modifier.size(28.dp)
                                                        ) {
                                                            Icon(
                                                                imageVector = Icons.Default.Delete,
                                                                contentDescription = null,
                                                                tint = Color.Red,
                                                                modifier = Modifier.size(16.dp)
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
                        4 -> {
                            // STEP 4: PRIORITY STUDENTS PICKS
                            Column(
                                modifier = Modifier.fillMaxSize()
                            ) {
                                Text(
                                    "Öncelikli Öğrenci Belirleme",
                                    fontSize = 14.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color.Black
                                )
                                Text(
                                    "Ön sıralara yerleştirilmesini istediğiniz öğrencileri seçin. Bu öğrenciler 1. sıralardan başlayarak yatay olarak sırayla yerleştirilecektir.",
                                    fontSize = 11.sp,
                                    color = Color.Gray,
                                    lineHeight = 14.sp
                                )
                                Spacer(modifier = Modifier.height(12.dp))

                                LazyColumn(
                                    modifier = Modifier
                                        .weight(1f)
                                        .fillMaxWidth()
                                        .border(1.dp, Color(0xFFE2E8F0), RoundedCornerShape(12.dp))
                                        .background(Color(0xFFF8FAFC))
                                        .padding(8.dp),
                                    verticalArrangement = Arrangement.spacedBy(8.dp)
                                ) {
                                    items(students) { s ->
                                        val isChecked = priorityStudentIds.contains(s.id)
                                        val genderLabel = if (s.gender.trim().lowercase() == "kız") "👧 Kız" else if (s.gender.trim().lowercase() == "erkek") "👦 Erkek" else ""
                                        
                                        Row(
                                            modifier = Modifier
                                                .fillMaxWidth()
                                                .background(Color.White, RoundedCornerShape(10.dp))
                                                .border(
                                                    width = 1.dp,
                                                    color = if (isChecked) Color(0xFF38BDF8) else Color(0xFFE2E8F0),
                                                    shape = RoundedCornerShape(10.dp)
                                                )
                                                .clickable {
                                                    if (isChecked) {
                                                        priorityStudentIds.remove(s.id)
                                                    } else {
                                                        val isBlockedByFixed = fixedSelections.any { it.studentId == s.id }
                                                        if (isBlockedByFixed) {
                                                            Toast.makeText(context, "Sabitlenmiş öğrenciler öncelikli listesine eklenemez!", Toast.LENGTH_SHORT).show()
                                                        } else {
                                                            priorityStudentIds.add(s.id)
                                                        }
                                                    }
                                                }
                                                .padding(12.dp),
                                            verticalAlignment = Alignment.CenterVertically,
                                            horizontalArrangement = Arrangement.SpaceBetween
                                        ) {
                                            Row(
                                                verticalAlignment = Alignment.CenterVertically,
                                                horizontalArrangement = Arrangement.spacedBy(10.dp)
                                            ) {
                                                Checkbox(
                                                    checked = isChecked,
                                                    onCheckedChange = { checked ->
                                                        if (checked) {
                                                            val isBlockedByFixed = fixedSelections.any { it.studentId == s.id }
                                                            if (isBlockedByFixed) {
                                                                Toast.makeText(context, "Sabitlenmiş öğrenciler öncelikli listesine eklenemez!", Toast.LENGTH_SHORT).show()
                                                            } else {
                                                                priorityStudentIds.add(s.id)
                                                            }
                                                        } else {
                                                            priorityStudentIds.remove(s.id)
                                                        }
                                                    }
                                                )
                                                Column {
                                                    Text(
                                                        "(${s.studentNo}) ${s.name} ${s.surname}",
                                                        fontWeight = FontWeight.Bold,
                                                        fontSize = 13.sp,
                                                        color = Color(0xFF1E293B)
                                                    )
                                                    if (genderLabel.isNotEmpty()) {
                                                        Text(genderLabel, fontSize = 10.sp, color = Color.Gray)
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        else -> {
                            // STEP 5: REVIEW & GENERATE
                            Column(
                                modifier = Modifier
                                    .fillMaxSize()
                                    .verticalScroll(rememberScrollState()),
                                horizontalAlignment = Alignment.CenterHorizontally,
                                verticalArrangement = Arrangement.Center
                            ) {
                                Box(
                                    modifier = Modifier
                                        .size(90.dp)
                                        .background(Color(0xFFE0F2FE), RoundedCornerShape(45.dp)),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.Shuffle,
                                        contentDescription = null,
                                        tint = Color(0xFF0284C7),
                                        modifier = Modifier.size(46.dp)
                                    )
                                }

                                Spacer(modifier = Modifier.height(20.dp))

                                Text(
                                    "Hazır mısınız?",
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 20.sp,
                                    color = Color(0xFF1E293B)
                                )
                                Spacer(modifier = Modifier.height(6.dp))
                                Text(
                                    "Belirlediğiniz tüm yerleşim kuralları şunlardır:",
                                    fontSize = 12.sp,
                                    color = Color.Gray
                                )

                                Spacer(modifier = Modifier.height(20.dp))

                                // Summary Card
                                Card(
                                    modifier = Modifier.fillMaxWidth(0.9f),
                                    colors = CardDefaults.cardColors(containerColor = Color(0xFFF8FAFC)),
                                    border = BorderStroke(1.dp, Color(0xFFE2E8F0)),
                                    shape = RoundedCornerShape(16.dp)
                                ) {
                                    Column(
                                        modifier = Modifier.padding(16.dp),
                                        verticalArrangement = Arrangement.spacedBy(10.dp)
                                    ) {
                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.SpaceBetween
                                        ) {
                                            Text("Sınıf Mevcudu:", fontSize = 12.sp, color = Color.Gray)
                                            Text("${students.size} Öğrenci", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color.Black)
                                        }
                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.SpaceBetween
                                        ) {
                                            Text("Toplam Kapasite:", fontSize = 12.sp, color = Color.Gray)
                                            Text("$totalCapacity Koltuk", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color.Black)
                                        }
                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.SpaceBetween
                                        ) {
                                            Text("Öncelikli Öğrenciler:", fontSize = 12.sp, color = Color.Gray)
                                            Text("${priorityStudentIds.size} Öğrenci (Önden sırayla)", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color.Black)
                                        }
                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.SpaceBetween
                                        ) {
                                            Text("Sabitlenmiş Öğrenciler:", fontSize = 12.sp, color = Color.Gray)
                                            Text("${fixedSelections.size} Öğrenci (Kilitli)", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color.Black)
                                        }
                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.SpaceBetween
                                        ) {
                                            Text("Cinsiyet Karışık:", fontSize = 12.sp, color = Color.Gray)
                                            Text(if (mixGenders) "Evet (Aktif)" else "Hayır", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color.Black)
                                        }
                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.SpaceBetween
                                        ) {
                                            Text("Referans Plan Geçmişi:", fontSize = 12.sp, color = Color.Gray)
                                            Text(if (tempPlan != null) "Yüklendi (Önceki plan kuralları aktif)" else "Yüklenmedi", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color.Black)
                                        }
                                    }
                                }

                                Spacer(modifier = Modifier.height(12.dp))
                                Text(
                                    "Kura çekimi başlatılacaktır. Sıralara yerleşim kurallara en uygun şekilde otomatik atanacaktır.",
                                    fontSize = 11.sp,
                                    color = Color.Gray,
                                    textAlign = TextAlign.Center,
                                    modifier = Modifier.padding(horizontal = 24.dp)
                                )
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                // Footer Actions
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    TextButton(onClick = onDismiss) {
                        Text("İptal", color = Color.Gray, fontWeight = FontWeight.Bold)
                    }

                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        if (currentStep > 1) {
                            TextButton(
                                onClick = { currentStep-- },
                                shape = RoundedCornerShape(12.dp)
                            ) {
                                Icon(Icons.Default.ArrowBack, contentDescription = null, modifier = Modifier.size(16.dp), tint = Color.Gray)
                                Spacer(modifier = Modifier.width(4.dp))
                                Text("Geri", fontWeight = FontWeight.Bold, color = Color.Gray)
                            }
                        }

                        if (currentStep < 5) {
                            Button(
                                onClick = {
                                    if (currentStep == 2 && totalCapacity < students.size) {
                                        Toast.makeText(context, "Mevcut kapasite ($totalCapacity) yetersiz! Öğrenci sayısından (${students.size}) az olamaz.", Toast.LENGTH_LONG).show()
                                    } else {
                                        currentStep++
                                    }
                                },
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF0284C7)),
                                shape = RoundedCornerShape(12.dp)
                            ) {
                                Text(
                                    text = if (currentStep == 1 && tempPlan == null) "Bu Adımı Atla ->" else "İleri ->",
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        } else {
                            // GENERATION ALGORITHMIC TRIGGER
                            Button(
                                onClick = {
                                    val finalConfig = SeatingConfig(
                                        groupCount = currentGroupCount,
                                        peoplePerRow = currentPeoplePerRow,
                                        rowsPerGroup = currentRowsPerGroup
                                    )

                                    val mappedFixed = fixedSelections.map {
                                        FixedStudentSelectionHelper(
                                            studentId = it.studentId,
                                            studentName = it.nameSurname,
                                            groupIdx = it.groupIdx,
                                            rowIdx = it.rowIdx,
                                            seatIdx = it.seatIdx
                                        )
                                    }

                                    val generatedPlan = generateRandomPlacement(
                                        students = students,
                                        config = finalConfig,
                                        fixedStudents = mappedFixed,
                                        priorityStudentIds = priorityStudentIds,
                                        gelismisKurallar = tempPlan != null,
                                        refPlan = tempPlan,
                                        differentGroup = diffGroup,
                                        differentRow = diffRow,
                                        differentPartner = diffPartner,
                                        mixGenders = mixGenders
                                    )

                                    if (generatedPlan != null) {
                                        onApplyRandomPlacement(finalConfig, generatedPlan)
                                    } else {
                                        Toast.makeText(context, "Yerleştirme planlanamadı. Lütfen kuralları kontrol edin.", Toast.LENGTH_LONG).show()
                                    }
                                },
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF0284C7)),
                                shape = RoundedCornerShape(12.dp)
                            ) {
                                Icon(Icons.Default.Check, contentDescription = null, modifier = Modifier.size(16.dp))
                                Spacer(modifier = Modifier.width(4.dp))
                                Text("Planı Oluştur", fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }
            }
        }
    }
}

data class FixedStudentSelectionHelper(
    val studentId: String,
    val studentName: String,
    val groupIdx: Int,
    val rowIdx: Int,
    val seatIdx: Int
)

fun generateRandomPlacement(
    students: List<Student>,
    config: SeatingConfig,
    fixedStudents: List<FixedStudentSelectionHelper>,
    priorityStudentIds: List<String>,
    gelismisKurallar: Boolean,
    refPlan: Map<String, String>?,
    differentGroup: Boolean,
    differentRow: Boolean,
    differentPartner: Boolean,
    mixGenders: Boolean
): Map<String, String>? {
    val groupCount = config.groupCount
    val peoplePerRow = config.peoplePerRow
    
    val allSeats = mutableListOf<Triple<Int, Int, Int>>()
    for (g in 0 until groupCount) {
        val rows = config.rowsPerGroup.getOrElse(g) { 5 }
        for (r in 0 until rows) {
            for (s in 0 until peoplePerRow) {
                allSeats.add(Triple(g, r, s))
            }
        }
    }

    val finalSeatingMap = mutableMapOf<String, String>()
    
    val fixedUserIds = fixedStudents.map { it.studentId }.toSet()
    for (fs in fixedStudents) {
        val seatKey = "g${fs.groupIdx}-r${fs.rowIdx}-s${fs.seatIdx}"
        finalSeatingMap[seatKey] = fs.studentId
    }

    val remainingStudents = students.filter { it.id !in fixedUserIds }.toMutableList()

    val priorityPool = remainingStudents.filter { it.id in priorityStudentIds }.toMutableList()
    val normalPool = remainingStudents.filter { it.id !in priorityStudentIds }.toMutableList()

    val occupiedKeys = finalSeatingMap.keys.toSet()
    val vacantSeats = allSeats.filter { "g${it.first}-r${it.second}-s${it.third}" !in occupiedKeys }

    // Priority students sorted primarily from rowIdx 0, then 1, then 2...
    val prioritySortedSeats = vacantSeats.sortedWith(
        compareBy<Triple<Int, Int, Int>> { it.second } // r
            .thenBy { it.first } // g
            .thenBy { it.third } // s
    )

    var bestMap: Map<String, String>? = null
    var bestScore = -1000000

    for (trial in 1..200) {
        val tempMap = finalSeatingMap.toMutableMap()
        
        val tPriorityPool = priorityPool.shuffled().toMutableList()
        val tNormalPool = normalPool.shuffled().toMutableList()

        val tVacantSeats = prioritySortedSeats.toMutableList()
        val placedStudents = mutableListOf<Pair<Student, Triple<Int, Int, Int>>>()

        for (student in tPriorityPool) {
            if (tVacantSeats.isEmpty()) break
            val seat = tVacantSeats.removeAt(0)
            val key = "g${seat.first}-r${seat.second}-s${seat.third}"
            tempMap[key] = student.id
            placedStudents.add(student to seat)
        }

        for (student in tNormalPool) {
            if (tVacantSeats.isEmpty()) break
            val seat = tVacantSeats.removeAt(0)
            val key = "g${seat.first}-r${seat.second}-s${seat.third}"
            tempMap[key] = student.id
            placedStudents.add(student to seat)
        }

        var score = 0

        if (mixGenders) {
            for (g in 0 until groupCount) {
                val rows = config.rowsPerGroup.getOrElse(g) { 5 }
                for (r in 0 until rows) {
                    for (s in 0 until peoplePerRow - 1) {
                        val id1 = tempMap["g${g}-r${r}-s${s}"]
                        val id2 = tempMap["g${g}-r${r}-s${s+1}"]
                        if (id1 != null && id2 != null) {
                            val st1 = students.find { it.id == id1 }
                            val st2 = students.find { it.id == id2 }
                            val g1 = st1?.gender?.trim()?.lowercase() ?: ""
                            val g2 = st2?.gender?.trim()?.lowercase() ?: ""
                            if (g1.isNotEmpty() && g2.isNotEmpty()) {
                                if (g1 != g2) {
                                    score += 15
                                } else {
                                    score -= 5
                                }
                            }
                        }
                    }
                }
            }
        }

        if (refPlan != null && gelismisKurallar) {
            val historicSeating = mutableMapOf<String, Triple<Int, Int, Int>>()
            for (g in 0 until groupCount) {
                val rows = config.rowsPerGroup.getOrElse(g) { 5 }
                for (r in 0 until rows) {
                    for (s in 0 until peoplePerRow) {
                        val hKey = "g${g}-r${r}-s${s}"
                        val hStudentId = refPlan[hKey]
                        if (!hStudentId.isNullOrBlank()) {
                            historicSeating[hStudentId] = Triple(g, r, s)
                        }
                    }
                }
            }

            for ((student, newSeat) in placedStudents) {
                val oldSeat = historicSeating[student.id]
                if (oldSeat != null) {
                    if (differentGroup) {
                        if (newSeat.first != oldSeat.first) {
                            score += 25
                        } else {
                            score -= 35
                        }
                    }
                    if (differentRow) {
                        if (newSeat.second != oldSeat.second) {
                            score += 25
                        } else {
                            score -= 35
                        }
                    }
                    if (differentPartner) {
                        val adjacentSeats = listOf(newSeat.third - 1, newSeat.third + 1)
                        val oldAdjacentSeats = listOf(oldSeat.third - 1, oldSeat.third + 1)
                        
                        val oldPartners = oldAdjacentSeats.mapNotNull { s -> refPlan["g${oldSeat.first}-r${oldSeat.second}-s$s"] }
                        val newPartners = adjacentSeats.mapNotNull { s -> tempMap["g${newSeat.first}-r${newSeat.second}-s$s"] }

                        val repeatedPartners = oldPartners.intersect(newPartners.toSet())
                        if (repeatedPartners.isNotEmpty()) {
                            score -= 50
                        } else {
                            score += 20
                        }
                    }
                }
            }
        }

        if (score > bestScore) {
            bestScore = score
            bestMap = tempMap
        }
    }

    return bestMap ?: finalSeatingMap
}

@Composable
fun ManualPlacementConfigDialog(
    config: SeatingConfig,
    studentCount: Int,
    onDismiss: () -> Unit,
    onOpenPlacement: (SeatingConfig, Map<String, String>?) -> Unit
) {
    var groupCountStr by remember { mutableStateOf(config.groupCount.toString()) }
    var peoplePerRowStr by remember { mutableStateOf(config.peoplePerRow.toString()) }
    val rowsPerGroupMap = remember { 
        androidx.compose.runtime.mutableStateMapOf<Int, String>().apply {
            config.rowsPerGroup.forEachIndexed { index, value -> put(index, value.toString()) }
        }
    }

    var isUnsavedUploadedPlan by remember { mutableStateOf<Map<String, String>?>(null) }
    val dialogContext = androidx.compose.ui.platform.LocalContext.current

    val dialogImportLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri ->
        if (uri != null) {
            try {
                val jsonStr = dialogContext.contentResolver.openInputStream(uri)?.use { stream ->
                    stream.readBytes().toString(Charsets.UTF_8)
                }
                if (!jsonStr.isNullOrBlank()) {
                    val root = org.json.JSONObject(jsonStr)
                    
                    val parsedPlan = mutableMapOf<String, String>()
                    if (root.has("plan")) {
                        val planObj = root.getJSONObject("plan")
                        planObj.keys().forEach { key ->
                            parsedPlan[key] = planObj.getString(key)
                        }
                    } else if (root.has("seatingPlan")) {
                        val planObj = root.getJSONObject("seatingPlan")
                        planObj.keys().forEach { key ->
                            parsedPlan[key] = planObj.getString(key)
                        }
                    } else {
                        root.keys().forEach { key ->
                            parsedPlan[key] = root.getString(key)
                        }
                    }

                    var parsedConfig: SeatingConfig? = null
                    if (root.has("config")) {
                        val configObj = root.getJSONObject("config")
                        val groupCount = configObj.optInt("groupCount", 3)
                        val peoplePerRow = configObj.optInt("peoplePerRow", 2)
                        val rowsArr = configObj.optJSONArray("rowsPerGroup")
                        val rowsPerGroup = mutableListOf<Int>()
                        if (rowsArr != null) {
                            for (i in 0 until rowsArr.length()) {
                                rowsPerGroup.add(rowsArr.getInt(i))
                            }
                        } else {
                            for (i in 0 until groupCount) rowsPerGroup.add(5)
                        }
                        parsedConfig = SeatingConfig(
                            groupCount = groupCount,
                            peoplePerRow = peoplePerRow,
                            rowsPerGroup = rowsPerGroup
                        )
                    }

                    if (parsedPlan.isNotEmpty()) {
                        isUnsavedUploadedPlan = parsedPlan
                        if (parsedConfig != null) {
                            groupCountStr = parsedConfig.groupCount.toString()
                            peoplePerRowStr = parsedConfig.peoplePerRow.toString()
                            rowsPerGroupMap.clear()
                            parsedConfig.rowsPerGroup.forEachIndexed { index, value ->
                                rowsPerGroupMap[index] = value.toString()
                            }
                        }
                        Toast.makeText(dialogContext, "Plan başarıyla yüklendi! Sınıf düzeni otomatik güncellendi.", Toast.LENGTH_SHORT).show()
                    } else {
                        Toast.makeText(dialogContext, "Geçersiz plan dosyası (boş plan)", Toast.LENGTH_LONG).show()
                    }
                }
            } catch (e: Exception) {
                Toast.makeText(dialogContext, "Yükleme hatası: ${e.message}", Toast.LENGTH_LONG).show()
            }
        }
    }

    val currentGroupCount = groupCountStr.toIntOrNull() ?: 0
    val currentPeoplePerRow = peoplePerRowStr.toIntOrNull() ?: 0
    val currentRowsPerGroup = List(currentGroupCount) { idx ->
        rowsPerGroupMap[idx]?.toIntOrNull() ?: 5
    }

    val totalCapacity = currentRowsPerGroup.sum() * currentPeoplePerRow
    val isCapacitySufficient = totalCapacity >= studentCount && currentGroupCount > 0 && currentPeoplePerRow > 0

    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        Surface(
            modifier = Modifier
                .fillMaxWidth(0.9f)
                .wrapContentHeight(),
            shape = RoundedCornerShape(24.dp),
            color = Color.White,
            shadowElevation = 8.dp
        ) {
            Column(modifier = Modifier.padding(24.dp)) {
                // Header
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            "Elle Yerleştirme İçin Sınıf Düzeni",
                            fontSize = 20.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF1E293B)
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            "Sınıf parametrelerini belirleyin veya düzenleme yapmak için mevcut bir plan yükleyin.",
                            fontSize = 13.sp,
                            color = Color.Gray
                        )
                    }
                    IconButton(onClick = onDismiss) {
                        Icon(Icons.Default.Close, contentDescription = null)
                    }
                }

                Spacer(modifier = Modifier.height(20.dp))

                // Optional Plan Loader Button at the Top (dashed / outlined card layout)
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { dialogImportLauncher.launch("application/json") },
                    colors = CardDefaults.cardColors(
                        containerColor = if (isUnsavedUploadedPlan != null) Color(0xFFECFDF5) else Color(0xFFEFF6FF)
                    ),
                    border = BorderStroke(
                        width = 1.dp,
                        color = if (isUnsavedUploadedPlan != null) Color(0xFF10B981) else Color(0xFFBFDBFE)
                    ),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Row(
                        modifier = Modifier.padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.Upload,
                            contentDescription = null,
                            tint = if (isUnsavedUploadedPlan != null) Color(0xFF059669) else Color(0xFF2563EB),
                            modifier = Modifier.size(18.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = if (isUnsavedUploadedPlan != null) "Mevcut Plan Yüklendi! (Değiştirmek için tıklayın)" else "Mevcut Bir Planı Yükle (İsteğe Bağlı)",
                            fontWeight = FontWeight.Bold,
                            fontSize = 12.sp,
                            color = if (isUnsavedUploadedPlan != null) Color(0xFF047857) else Color(0xFF1D4ED8)
                        )
                    }
                }

                Spacer(modifier = Modifier.height(20.dp))

                // Modernized Steppers Row
                Row(
                    horizontalArrangement = Arrangement.spacedBy(16.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    // Group Count Picker
                    Column(modifier = Modifier.weight(1f)) {
                        Text("Grup Sayısı", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Color(0xFF1E293B))
                        Spacer(modifier = Modifier.height(6.dp))
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.Center,
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(Color(0xFFF1F5F9), RoundedCornerShape(12.dp))
                                .padding(4.dp)
                        ) {
                            TextButton(
                                onClick = {
                                    val count = groupCountStr.toIntOrNull() ?: 3
                                    if (count > 1) {
                                        groupCountStr = (count - 1).toString()
                                    }
                                },
                                modifier = Modifier.size(36.dp),
                                contentPadding = PaddingValues(0.dp)
                            ) {
                                Text("-", fontSize = 18.sp, fontWeight = FontWeight.Black, color = Color(0xFF1E293B))
                            }
                            
                            OutlinedTextField(
                                value = groupCountStr,
                                onValueChange = { groupCountStr = it },
                                keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = androidx.compose.ui.text.input.KeyboardType.Number),
                                textStyle = androidx.compose.ui.text.TextStyle(textAlign = androidx.compose.ui.text.style.TextAlign.Center, fontWeight = FontWeight.Bold, fontSize = 14.sp),
                                modifier = Modifier.width(50.dp).height(44.dp),
                                singleLine = true,
                                shape = RoundedCornerShape(8.dp),
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedBorderColor = Color(0xFFCBD5E1),
                                    unfocusedBorderColor = Color(0xFFE2E8F0),
                                    focusedContainerColor = Color.White,
                                    unfocusedContainerColor = Color.White
                                )
                            )

                            TextButton(
                                onClick = {
                                    val count = groupCountStr.toIntOrNull() ?: 3
                                    if (count < 12) {
                                        groupCountStr = (count + 1).toString()
                                    }
                                },
                                modifier = Modifier.size(36.dp),
                                contentPadding = PaddingValues(0.dp)
                            ) {
                                Text("+", fontSize = 18.sp, fontWeight = FontWeight.Black, color = Color(0xFF1E293B))
                            }
                        }
                    }

                    // People Per Row Picker
                    Column(modifier = Modifier.weight(1f)) {
                        Text("Sıradaki Kişi Sayısı", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Color(0xFF1E293B))
                        Spacer(modifier = Modifier.height(6.dp))
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.Center,
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(Color(0xFFF1F5F9), RoundedCornerShape(12.dp))
                                .padding(4.dp)
                        ) {
                            TextButton(
                                onClick = {
                                    val count = peoplePerRowStr.toIntOrNull() ?: 2
                                    if (count > 1) {
                                        peoplePerRowStr = (count - 1).toString()
                                    }
                                },
                                modifier = Modifier.size(36.dp),
                                contentPadding = PaddingValues(0.dp)
                            ) {
                                Text("-", fontSize = 18.sp, fontWeight = FontWeight.Black, color = Color(0xFF1E293B))
                            }
                            
                            OutlinedTextField(
                                value = peoplePerRowStr,
                                onValueChange = { peoplePerRowStr = it },
                                keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = androidx.compose.ui.text.input.KeyboardType.Number),
                                textStyle = androidx.compose.ui.text.TextStyle(textAlign = androidx.compose.ui.text.style.TextAlign.Center, fontWeight = FontWeight.Bold, fontSize = 14.sp),
                                modifier = Modifier.width(50.dp).height(44.dp),
                                singleLine = true,
                                shape = RoundedCornerShape(8.dp),
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedBorderColor = Color(0xFFCBD5E1),
                                    unfocusedBorderColor = Color(0xFFE2E8F0),
                                    focusedContainerColor = Color.White,
                                    unfocusedContainerColor = Color.White
                                )
                            )

                            TextButton(
                                onClick = {
                                    val count = peoplePerRowStr.toIntOrNull() ?: 2
                                    if (count < 6) {
                                        peoplePerRowStr = (count + 1).toString()
                                    }
                                },
                                modifier = Modifier.size(36.dp),
                                contentPadding = PaddingValues(0.dp)
                            ) {
                                Text("+", fontSize = 18.sp, fontWeight = FontWeight.Black, color = Color(0xFF1E293B))
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(20.dp))

                Text("Gruptaki Sıra Sayısı", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Color(0xFF1E293B))
                Spacer(modifier = Modifier.height(6.dp))
                
                Row(
                    modifier = Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    for (idx in 0 until currentGroupCount) {
                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally,
                            modifier = Modifier
                                .background(Color(0xFFF8FAFC), RoundedCornerShape(12.dp))
                                .border(1.dp, Color(0xFFE2E8F0), RoundedCornerShape(12.dp))
                                .padding(vertical = 8.dp, horizontal = 6.dp)
                                .width(115.dp)
                        ) {
                            Text("${idx + 1}. GRUP", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = Color(0xFF64748B))
                            Spacer(modifier = Modifier.height(6.dp))
                            
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.Center,
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .background(Color(0xFFF1F5F9), RoundedCornerShape(8.dp))
                                    .padding(2.dp)
                            ) {
                                TextButton(
                                    onClick = {
                                        val currentValue = (rowsPerGroupMap[idx] ?: "5").toIntOrNull() ?: 5
                                        if (currentValue > 1) {
                                            rowsPerGroupMap[idx] = (currentValue - 1).toString()
                                        }
                                    },
                                    modifier = Modifier.size(28.dp),
                                    contentPadding = PaddingValues(0.dp)
                                ) {
                                    Text("-", fontSize = 15.sp, fontWeight = FontWeight.Black, color = Color(0xFF1E293B))
                                }
                                
                                OutlinedTextField(
                                    value = rowsPerGroupMap[idx] ?: "5",
                                    onValueChange = { rowsPerGroupMap[idx] = it },
                                    keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = androidx.compose.ui.text.input.KeyboardType.Number),
                                    textStyle = androidx.compose.ui.text.TextStyle(color = Color(0xFF1E293B), textAlign = TextAlign.Center, fontWeight = FontWeight.Bold, fontSize = 12.sp),
                                    modifier = Modifier.width(44.dp).height(44.dp),
                                    singleLine = true,
                                    shape = RoundedCornerShape(6.dp),
                                    colors = OutlinedTextFieldDefaults.colors(
                                        focusedBorderColor = Color(0xFFCBD5E1),
                                        unfocusedBorderColor = Color(0xFFE2E8F0),
                                        focusedContainerColor = Color.White,
                                        unfocusedContainerColor = Color.White,
                                        focusedTextColor = Color(0xFF1E293B),
                                        unfocusedTextColor = Color(0xFF1E293B)
                                    )
                                )

                                TextButton(
                                    onClick = {
                                        val currentValue = (rowsPerGroupMap[idx] ?: "5").toIntOrNull() ?: 5
                                        if (currentValue < 15) {
                                            rowsPerGroupMap[idx] = (currentValue + 1).toString()
                                        }
                                    },
                                    modifier = Modifier.size(28.dp),
                                    contentPadding = PaddingValues(0.dp)
                                ) {
                                    Text("+", fontSize = 15.sp, fontWeight = FontWeight.Black, color = Color(0xFF1E293B))
                                }
                            }
                        }
                    }
                }
                
                Spacer(modifier = Modifier.height(20.dp))

                // Capacity Alert
                Card(
                    colors = CardDefaults.cardColors(
                        containerColor = if (isCapacitySufficient) Color(0xFFF0FDF4) else Color(0xFFFEF2F2)
                    ),
                    border = BorderStroke(1.dp, if (isCapacitySufficient) Color(0xFFBBF7D0) else Color(0xFFFECACA)),
                    shape = RoundedCornerShape(16.dp)
                ) {
                    Row(
                        modifier = Modifier.padding(12.dp),
                        verticalAlignment = Alignment.Top
                    ) {
                        Icon(
                            imageVector = Icons.Default.Warning,
                            contentDescription = null,
                            tint = if (isCapacitySufficient) Color(0xFF16A34A) else Color(0xFFEF4444),
                            modifier = Modifier.size(20.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Column {
                            Text(
                                "Kapasite Durumu",
                                fontWeight = FontWeight.Bold,
                                fontSize = 13.sp,
                                color = if (isCapacitySufficient) Color(0xFF166534) else Color(0xFF991B1B)
                            )
                            Spacer(modifier = Modifier.height(2.dp))
                            Text(
                                "Oluşturulan toplam sıra kapasitesi $totalCapacity kişidir. Sınıf listenizdeki $studentCount öğrenciden ${minOf(studentCount, totalCapacity)} tanesi yerleştirilecek.",
                                fontSize = 11.sp,
                                color = if (isCapacitySufficient) Color(0xFF1E293B) else Color(0xFFB91C1C),
                                lineHeight = 14.sp
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(24.dp))

                // Action Buttons
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.End,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    TextButton(onClick = onDismiss) {
                        Text("İptal", color = Color.Gray, fontWeight = FontWeight.Bold)
                    }
                    Spacer(modifier = Modifier.width(16.dp))
                    Button(
                        onClick = {
                            val finalConfig = config.copy(
                                groupCount = currentGroupCount,
                                peoplePerRow = currentPeoplePerRow,
                                rowsPerGroup = currentRowsPerGroup
                            )
                            onOpenPlacement(finalConfig, isUnsavedUploadedPlan)
                        },
                        enabled = isCapacitySufficient,
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF0284C7)),
                        shape = RoundedCornerShape(12.dp),
                        contentPadding = PaddingValues(horizontal = 24.dp, vertical = 12.dp)
                    ) {
                        Text("Yerleştirme Ekranını Aç", fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OptionCard(title: String, description: String, icon: androidx.compose.ui.graphics.vector.ImageVector, onClick: () -> Unit, modifier: Modifier = Modifier) {
    Card(
        modifier = modifier.height(140.dp),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        border = BorderStroke(1.dp, Color(0xFFE2E8F0)),
        onClick = onClick
    ) {
        Column(
            modifier = Modifier
                .padding(16.dp)
                .fillMaxSize(),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Icon(icon, contentDescription = null, tint = Color.Gray, modifier = Modifier.size(32.dp))
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                title, 
                fontWeight = FontWeight.Bold, 
                fontSize = 14.sp, 
                color = Color.Black,
                textAlign = androidx.compose.ui.text.style.TextAlign.Center
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                description,
                fontSize = 11.sp,
                color = Color.Gray,
                textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                lineHeight = 14.sp
            )
        }
    }
}

fun printSeatingPlan(
    context: android.content.Context,
    seatingConfig: com.example.data.SeatingConfig,
    seatingPlan: Map<String, String>,
    students: List<com.example.data.Student>
) {
    val htmlBuilder = StringBuilder()
    htmlBuilder.append("""
        <!DOCTYPE html>
        <html>
        <head>
        <meta charset="utf-8">
        <style>
            @page {
                size: A4 landscape;
                margin: 10mm;
            }
            body {
                font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
                margin: 0;
                padding: 0;
                background-color: #ffffff;
                color: #333333;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
            .header {
                text-align: center;
                margin-bottom: 20px;
                border-bottom: 2px solid #4F46E5;
                padding-bottom: 10px;
            }
            .header h1 {
                margin: 0;
                color: #1E293B;
                font-size: 24px;
                text-transform: uppercase;
                letter-spacing: 1px;
            }
            .header p {
                margin: 5px 0 0 0;
                color: #64748B;
                font-size: 14px;
            }
            .classroom-direction {
                text-align: center;
                margin: 10px auto 25px auto;
                background-color: #F1F5F9;
                border: 1px solid #CBD5E1;
                padding: 8px;
                border-radius: 6px;
                width: 60%;
                font-weight: bold;
                font-size: 12px;
                color: #475569;
                text-transform: uppercase;
                letter-spacing: 2px;
            }
            .groups-container {
                display: flex;
                justify-content: space-evenly;
                align-items: flex-start;
                gap: 20px;
                flex-wrap: nowrap;
                width: 100%;
            }
            .group {
                flex: 1;
                min-width: 0;
                display: flex;
                flex-direction: column;
                align-items: center;
                border: 1px dashed #CBD5E1;
                border-radius: 8px;
                padding: 10px;
                background-color: #FAFAFA;
            }
            .group-title {
                font-size: 13px;
                font-weight: bold;
                color: #4B5563;
                margin-bottom: 15px;
                text-align: center;
                letter-spacing: 1px;
                border-bottom: 1px solid #E5E7EB;
                width: 100%;
                padding-bottom: 5px;
            }
            .rows-container {
                display: flex;
                flex-direction: column;
                gap: 12px;
                width: 100%;
                align-items: center;
            }
            .row {
                display: flex;
                gap: 10px;
                justify-content: center;
                width: 100%;
            }
            .seat {
                width: 105px;
                height: 80px;
                border-radius: 8px;
                border: 1.5px solid #CBD5E1;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                padding: 6px;
                box-sizing: border-box;
                background-color: #FAFAFA;
            }
            .seat.girl {
                background-color: #FDF2F8 !important;
                border-color: #F472B6 !important;
            }
            .seat.boy {
                background-color: #EFF6FF !important;
                border-color: #60A5FA !important;
            }
            .seat.empty {
                background-color: #F1F5F9 !important;
                border-color: #E2E8F0 !important;
                border-style: dotted;
            }
            .student-no {
                font-size: 14px;
                font-weight: 900;
                margin-bottom: 4px;
            }
            .seat.girl .student-no {
                color: #DB2777;
            }
            .seat.boy .student-no {
                color: #2563EB;
            }
            .seat.empty .student-no {
                color: #94A3B8;
            }
            .student-name {
                font-size: 10px;
                font-weight: bold;
                color: #1F2937;
                text-align: center;
                word-wrap: break-word;
                word-break: break-all;
                max-height: 32px;
                overflow: hidden;
                line-height: 1.2;
            }
            .seat.empty .student-name {
                color: #94A3B8;
                font-size: 9px;
            }
            .legend {
                display: flex;
                justify-content: center;
                gap: 20px;
                margin-top: 30px;
                font-size: 11px;
                color: #4B5563;
                border-top: 1px solid #E5E7EB;
                padding-top: 15px;
            }
            .legend-item {
                display: flex;
                align-items: center;
                gap: 6px;
            }
            .legend-color {
                width: 12px;
                height: 12px;
                border-radius: 3px;
                border: 1px solid #CBD5E1;
            }
            .legend-color.girl {
                background-color: #FDF2F8;
                border-color: #F472B6;
            }
            .legend-color.boy {
                background-color: #EFF6FF;
                border-color: #60A5FA;
            }
            .legend-color.empty {
                background-color: #F1F5F9;
                border-color: #E2E8F0;
                border-style: dotted;
            }
        </style>
        </head>
        <body>
            <div class="header">
                <h1>SINIF OTURMA PLANI</h1>
                <p>Yazdirilma Tarihi: ${android.text.format.DateFormat.format("dd.MM.yyyy", System.currentTimeMillis())}</p>
            </div>
            
            <div class="classroom-direction">Yazi Tahtasi / Ogretmen Masasi Yonu</div>
            
            <div class="groups-container">
    """.trimIndent())

    for (groupIdx in 0 until seatingConfig.groupCount) {
        val rowsInGroup = seatingConfig.rowsPerGroup.getOrElse(groupIdx) { 5 }.coerceAtLeast(1)
        htmlBuilder.append("""
            <div class="group">
                <div class="group-title">${groupIdx + 1}. GRUP</div>
                <div class="rows-container">
        """.trimIndent())

        for (rowIdx in 0 until rowsInGroup) {
            htmlBuilder.append("""<div class="row">""")
            for (seatIdx in 0 until seatingConfig.peoplePerRow) {
                val seatId = "g$groupIdx-r$rowIdx-s$seatIdx"
                val studentId = seatingPlan[seatId]
                val student = students.find { it.id == studentId }

                if (student != null) {
                    val isGirl = student.gender.trim().lowercase() == "kız"
                    val cssClass = if (isGirl) "girl" else "boy"
                    htmlBuilder.append("""
                        <div class="seat ${cssClass}">
                            <div class="student-no">${student.studentNo}</div>
                            <div class="student-name">${student.name} ${student.surname}</div>
                        </div>
                    """.trimIndent())
                } else {
                    htmlBuilder.append("""
                        <div class="seat empty">
                            <div class="student-no">-</div>
                            <div class="student-name">BOŞ</div>
                        </div>
                    """.trimIndent())
                }
            }
            htmlBuilder.append("""</div>""")
        }
        htmlBuilder.append("""
                </div>
            </div>
        """.trimIndent())
    }

    htmlBuilder.append("""
            </div>
            
            <div class="legend">
                <div class="legend-item">
                    <div class="legend-color girl"></div>
                    <div>Kiz Ogrenci</div>
                </div>
                <div class="legend-item">
                    <div class="legend-color boy"></div>
                    <div>Erkek Ogrenci</div>
                </div>
                <div class="legend-item">
                    <div class="legend-color empty"></div>
                    <div>Bos Sira</div>
                </div>
            </div>
        </body>
        </html>
    """.trimIndent())

    val html = htmlBuilder.toString()

    // Trigger Print Dialog
    val webView = WebView(context)
    webView.webViewClient = object : WebViewClient() {
        override fun onPageFinished(view: WebView?, url: String?) {
            val printManager = context.getSystemService(Context.PRINT_SERVICE) as PrintManager
            val jobName = "Sinif_Oturma_Plani"
            val printAdapter = webView.createPrintDocumentAdapter(jobName)
            val printAttributes = PrintAttributes.Builder()
                .setMediaSize(PrintAttributes.MediaSize.ISO_A4.asLandscape())
                .build()
            printManager.print(jobName, printAdapter, printAttributes)
        }
    }
    webView.loadDataWithBaseURL(null, html, "text/html", "UTF-8", null)
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HorizontalShiftDialog(
    seatingConfig: SeatingConfig,
    seatingPlan: Map<String, String>,
    onDismiss: () -> Unit,
    onApplyShift: (SeatingConfig, Map<String, String>) -> Unit
) {
    var currentStep by remember { mutableStateOf(1) }
    var tempPlan by remember { mutableStateOf<Map<String, String>?>(null) }
    var tempConfig by remember { mutableStateOf<SeatingConfig?>(null) }
    
    var isLeftShift by remember { mutableStateOf(false) }
    var isRightShift by remember { mutableStateOf(true) }
    var isShuffleEnabled by remember { mutableStateOf(false) }

    val context = androidx.compose.ui.platform.LocalContext.current

    val shiftImportLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri ->
        if (uri != null) {
            try {
                val jsonStr = context.contentResolver.openInputStream(uri)?.use { stream ->
                    stream.readBytes().toString(Charsets.UTF_8)
                }
                if (!jsonStr.isNullOrBlank()) {
                    val root = org.json.JSONObject(jsonStr)
                    val parsedPlan = mutableMapOf<String, String>()
                    if (root.has("plan")) {
                        val planObj = root.getJSONObject("plan")
                        planObj.keys().forEach { key ->
                            parsedPlan[key] = planObj.getString(key)
                        }
                    } else if (root.has("seatingPlan")) {
                        val planObj = root.getJSONObject("seatingPlan")
                        planObj.keys().forEach { key ->
                            parsedPlan[key] = planObj.getString(key)
                        }
                    } else {
                        root.keys().forEach { key ->
                            parsedPlan[key] = root.getString(key)
                        }
                    }

                    var parsedConfig: SeatingConfig? = null
                    if (root.has("config")) {
                        val configObj = root.getJSONObject("config")
                        val groupCount = configObj.optInt("groupCount", 3)
                        val peoplePerRow = configObj.optInt("peoplePerRow", 2)
                        val rowsArr = configObj.optJSONArray("rowsPerGroup")
                        val rowsPerGroup = mutableListOf<Int>()
                        if (rowsArr != null) {
                            for (i in 0 until rowsArr.length()) {
                                rowsPerGroup.add(rowsArr.getInt(i))
                            }
                        } else {
                            for (i in 0 until groupCount) rowsPerGroup.add(5)
                        }
                        parsedConfig = SeatingConfig(
                            groupCount = groupCount,
                            peoplePerRow = peoplePerRow,
                            rowsPerGroup = rowsPerGroup
                        )
                    }

                    if (parsedPlan.isNotEmpty()) {
                        tempPlan = parsedPlan
                        if (parsedConfig != null) {
                            tempConfig = parsedConfig
                        } else {
                            tempConfig = seatingConfig
                        }
                        Toast.makeText(context, "Plan başarıyla yüklendi!", Toast.LENGTH_SHORT).show()
                    } else {
                        Toast.makeText(context, "Geçersiz plan dosyası (boş plan)", Toast.LENGTH_LONG).show()
                    }
                }
            } catch (e: Exception) {
                Toast.makeText(context, "Yükleme hatası: ${e.message}", Toast.LENGTH_LONG).show()
            }
        }
    }

    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        Surface(
            modifier = Modifier
                .fillMaxWidth(0.9f)
                .wrapContentHeight(),
            shape = RoundedCornerShape(24.dp),
            color = Color.White,
            shadowElevation = 8.dp
        ) {
            Column(modifier = Modifier.padding(24.dp)) {
                // Header
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = if (currentStep == 1) "Yatay Kaydırma" else "Yatay Kaydırma - ${(tempConfig ?: seatingConfig).groupCount} Gruplu Plan",
                            fontSize = 20.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF1E293B)
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = if (currentStep == 1) "Mevcut bir planı yükleyerek gruplar arasında öğrenci rotasyonu yapın." else "Kaydırma seçeneklerini belirleyerek yeni planınızı oluşturun.",
                            fontSize = 13.sp,
                            color = Color.Gray
                        )
                    }
                    IconButton(onClick = onDismiss) {
                        Icon(Icons.Default.Close, contentDescription = null)
                    }
                }

                Spacer(modifier = Modifier.height(20.dp))

                if (currentStep == 1) {
                    // STEP 1: Plan Yükleme / Seçme
                    Column(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Text(
                            "Temel Plan Yükleme",
                            fontSize = 15.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF1E293B)
                        )
                        Spacer(modifier = Modifier.height(2.dp))
                        Text(
                            "Yatay kaydırma işlemi uygulamak için lütfen önce bir oturma planı (.json) dosyası yükleyin.",
                            fontSize = 12.sp,
                            color = Color.Gray,
                            textAlign = TextAlign.Center
                        )
                        
                        Spacer(modifier = Modifier.height(16.dp))
                        
                        Card(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(140.dp),
                            colors = CardDefaults.cardColors(
                                containerColor = if (tempPlan != null) Color(0xFFECFDF5) else Color(0xFFFEF2F2)
                            ),
                            border = BorderStroke(
                                width = 1.dp,
                                color = if (tempPlan != null) Color(0xFF10B981) else Color(0xFFFECACA)
                            ),
                            shape = RoundedCornerShape(16.dp)
                        ) {
                            Column(
                                modifier = Modifier.fillMaxSize().padding(16.dp),
                                horizontalAlignment = Alignment.CenterHorizontally,
                                verticalArrangement = Arrangement.Center
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Upload,
                                    contentDescription = null,
                                    tint = if (tempPlan != null) Color(0xFF059669) else Color(0xFFEF4444),
                                    modifier = Modifier.size(32.dp)
                                )
                                Spacer(modifier = Modifier.height(8.dp))
                                Text(
                                    text = if (tempPlan != null) "Plan Yüklendi" else "Plan Bekleniyor",
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 14.sp,
                                    color = if (tempPlan != null) Color(0xFF047857) else Color(0xFFB91C1C)
                                )
                                Text(
                                    text = if (tempPlan != null) {
                                        "Mevcut sistem planı veya yüklediğiniz plan hazır."
                                    } else {
                                        "Devam etmek için bir plan dosyası yükleyin."
                                    },
                                    fontSize = 11.sp,
                                    color = Color.Gray,
                                    textAlign = TextAlign.Center
                                )
                            }
                        }
                        
                        Spacer(modifier = Modifier.height(16.dp))
                        
                        Button(
                            onClick = { shiftImportLauncher.launch("application/json") },
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFF97316)),
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier.fillMaxWidth().height(48.dp)
                        ) {
                            Icon(Icons.Default.Upload, contentDescription = null, tint = Color.White)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Dosya Seç", fontWeight = FontWeight.Bold, color = Color.White)
                        }

                        Spacer(modifier = Modifier.height(24.dp))

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.End,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            TextButton(onClick = onDismiss) {
                                Text("İptal", color = Color.Gray, fontWeight = FontWeight.Bold)
                            }
                            Spacer(modifier = Modifier.width(16.dp))
                            Button(
                                onClick = { currentStep = 2 },
                                enabled = tempPlan != null,
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF0284C7)),
                                shape = RoundedCornerShape(12.dp)
                            ) {
                                Text("İleri ->", fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                } else {
                    // STEP 2: Kaydırma Yönü & Seçenekler
                    Column(modifier = Modifier.fillMaxWidth()) {
                        Text("Kaydırma Yönü", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = Color.Black)
                        Spacer(modifier = Modifier.height(10.dp))
                        
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            // Sola Kaydır Card
                            Card(
                                modifier = Modifier
                                    .weight(1f)
                                    .height(100.dp)
                                    .clickable {
                                        isLeftShift = true
                                        isRightShift = false
                                    },
                                colors = CardDefaults.cardColors(
                                    containerColor = if (isLeftShift) Color(0xFF3B82F6) else Color.White
                                ),
                                border = BorderStroke(
                                    width = if (isLeftShift) 0.dp else 1.dp,
                                    color = if (isLeftShift) Color.Transparent else Color(0xFFE2E8F0)
                                ),
                                shape = RoundedCornerShape(16.dp)
                            ) {
                                Column(
                                    modifier = Modifier.fillMaxSize(),
                                    horizontalAlignment = Alignment.CenterHorizontally,
                                    verticalArrangement = Arrangement.Center
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.ArrowBack,
                                        contentDescription = null,
                                        tint = if (isLeftShift) Color.White else Color.Black,
                                        modifier = Modifier.size(24.dp)
                                    )
                                    Spacer(modifier = Modifier.height(6.dp))
                                    Text(
                                        "Sola Kaydır",
                                        fontWeight = FontWeight.Bold,
                                        color = if (isLeftShift) Color.White else Color.Black,
                                        fontSize = 14.sp
                                    )
                                }
                            }

                            // Sağa Kaydır Card
                            Card(
                                modifier = Modifier
                                    .weight(1f)
                                    .height(100.dp)
                                    .clickable {
                                        isRightShift = true
                                        isLeftShift = false
                                    },
                                colors = CardDefaults.cardColors(
                                    containerColor = if (isRightShift) Color(0xFF3B82F6) else Color.White
                                ),
                                border = BorderStroke(
                                    width = if (isRightShift) 0.dp else 1.dp,
                                    color = if (isRightShift) Color.Transparent else Color(0xFFE2E8F0)
                                ),
                                shape = RoundedCornerShape(16.dp)
                            ) {
                                Column(
                                    modifier = Modifier.fillMaxSize(),
                                    horizontalAlignment = Alignment.CenterHorizontally,
                                    verticalArrangement = Arrangement.Center
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.ArrowForward,
                                        contentDescription = null,
                                        tint = if (isRightShift) Color.White else Color.Black,
                                        modifier = Modifier.size(24.dp)
                                    )
                                    Spacer(modifier = Modifier.height(6.dp))
                                    Text(
                                        "Sağa Kaydır",
                                        fontWeight = FontWeight.Bold,
                                        color = if (isRightShift) Color.White else Color.Black,
                                        fontSize = 14.sp
                                    )
                                }
                            }
                        }
                        
                        Spacer(modifier = Modifier.height(20.dp))
                        
                        // "Grup İçinde Karıştır" Switch Section
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            colors = CardDefaults.cardColors(containerColor = Color(0xFFF8FAFC)),
                            border = BorderStroke(1.dp, Color(0xFFE2E8F0)),
                            shape = RoundedCornerShape(16.dp)
                        ) {
                            Row(
                                modifier = Modifier.padding(16.dp).fillMaxWidth(),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        "Grup İçinde Karıştır?",
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 14.sp,
                                        color = Color.Black
                                    )
                                    Text(
                                        "Gruplar kaydırıldıktan sonra öğrenciler grup içinde yeniden karıştırılsın mı?",
                                        fontSize = 11.sp,
                                        color = Color.Gray,
                                        lineHeight = 14.sp
                                    )
                                }
                                Spacer(modifier = Modifier.width(12.dp))
                                Switch(
                                    checked = isShuffleEnabled,
                                    onCheckedChange = { isShuffleEnabled = it }
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(24.dp))

                        // Bottom Navigation Buttons
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            TextButton(
                                onClick = { currentStep = 1 },
                                shape = RoundedCornerShape(12.dp)
                            ) {
                                Icon(Icons.Default.ArrowBack, contentDescription = null, modifier = Modifier.size(16.dp), tint = Color.Gray)
                                Spacer(modifier = Modifier.width(4.dp))
                                Text("Geri", fontWeight = FontWeight.Bold, color = Color.Gray)
                            }
                            Button(
                                onClick = {
                                    val originalConfig = tempConfig ?: seatingConfig
                                    val groupCount = originalConfig.groupCount
                                    
                                    val rotatedPlan = mutableMapOf<String, String>()
                                    for (groupIdx in 0 until groupCount) {
                                        val targetGroupIdx = if (isLeftShift) {
                                            (groupIdx - 1 + groupCount) % groupCount
                                        } else {
                                            (groupIdx + 1) % groupCount
                                        }

                                        val groupStudents = mutableListOf<String>()
                                        val origRows = originalConfig.rowsPerGroup.getOrElse(groupIdx) { 5 }
                                        for (r in 0 until origRows) {
                                            for (s in 0 until originalConfig.peoplePerRow) {
                                                val sId = (tempPlan ?: emptyMap())["g$groupIdx-r$r-s$s"]
                                                if (!sId.isNullOrBlank()) {
                                                    groupStudents.add(sId)
                                                }
                                            }
                                        }

                                        if (isShuffleEnabled) {
                                            groupStudents.shuffle()
                                        }

                                        val targetRows = originalConfig.rowsPerGroup.getOrElse(targetGroupIdx) { 5 }
                                        var studentIdx = 0
                                        for (r in 0 until targetRows) {
                                            for (s in 0 until originalConfig.peoplePerRow) {
                                                if (studentIdx < groupStudents.size) {
                                                    rotatedPlan["g$targetGroupIdx-r$r-s$s"] = groupStudents[studentIdx]
                                                    studentIdx++
                                                }
                                            }
                                        }
                                    }

                                    onApplyShift(originalConfig, rotatedPlan)
                                },
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF0284C7)),
                                shape = RoundedCornerShape(12.dp)
                            ) {
                                Icon(Icons.Default.Check, contentDescription = null, modifier = Modifier.size(16.dp))
                                Spacer(modifier = Modifier.width(4.dp))
                                Text("Planı Oluştur", fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun VerticalShiftDialog(
    seatingConfig: SeatingConfig,
    seatingPlan: Map<String, String>,
    onDismiss: () -> Unit,
    onApplyShift: (SeatingConfig, Map<String, String>) -> Unit
) {
    var currentStep by remember { mutableStateOf(1) }
    var tempPlan by remember { mutableStateOf<Map<String, String>?>(null) }
    var tempConfig by remember { mutableStateOf<SeatingConfig?>(null) }
    
    var isForwardShift by remember { mutableStateOf(true) }
    var isShuffleEnabled by remember { mutableStateOf(false) }

    val context = androidx.compose.ui.platform.LocalContext.current

    val shiftImportLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri ->
        if (uri != null) {
            try {
                val jsonStr = context.contentResolver.openInputStream(uri)?.use { stream ->
                    stream.readBytes().toString(Charsets.UTF_8)
                }
                if (!jsonStr.isNullOrBlank()) {
                    val root = org.json.JSONObject(jsonStr)
                    val parsedPlan = mutableMapOf<String, String>()
                    if (root.has("plan")) {
                        val planObj = root.getJSONObject("plan")
                        planObj.keys().forEach { key ->
                            parsedPlan[key] = planObj.getString(key)
                        }
                    } else if (root.has("seatingPlan")) {
                        val planObj = root.getJSONObject("seatingPlan")
                        planObj.keys().forEach { key ->
                            parsedPlan[key] = planObj.getString(key)
                        }
                    } else {
                        root.keys().forEach { key ->
                            parsedPlan[key] = root.getString(key)
                        }
                    }

                    var parsedConfig: SeatingConfig? = null
                    if (root.has("config")) {
                        val configObj = root.getJSONObject("config")
                        val groupCount = configObj.optInt("groupCount", 3)
                        val peoplePerRow = configObj.optInt("peoplePerRow", 2)
                        val rowsArr = configObj.optJSONArray("rowsPerGroup")
                        val rowsPerGroup = mutableListOf<Int>()
                        if (rowsArr != null) {
                            for (i in 0 until rowsArr.length()) {
                                rowsPerGroup.add(rowsArr.getInt(i))
                            }
                        } else {
                            for (i in 0 until groupCount) rowsPerGroup.add(5)
                        }
                        parsedConfig = SeatingConfig(
                            groupCount = groupCount,
                            peoplePerRow = peoplePerRow,
                            rowsPerGroup = rowsPerGroup
                        )
                    }

                    if (parsedPlan.isNotEmpty()) {
                        tempPlan = parsedPlan
                        if (parsedConfig != null) {
                            tempConfig = parsedConfig
                        } else {
                            tempConfig = seatingConfig
                        }
                        Toast.makeText(context, "Plan başarıyla yüklendi!", Toast.LENGTH_SHORT).show()
                    } else {
                        Toast.makeText(context, "Geçersiz plan dosyası (boş plan)", Toast.LENGTH_LONG).show()
                    }
                }
            } catch (e: Exception) {
                Toast.makeText(context, "Yükleme hatası: ${e.message}", Toast.LENGTH_LONG).show()
            }
        }
    }

    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        Surface(
            modifier = Modifier
                .fillMaxWidth(0.9f)
                .wrapContentHeight(),
            shape = RoundedCornerShape(24.dp),
            color = Color.White,
            shadowElevation = 8.dp
        ) {
            Column(modifier = Modifier.padding(24.dp)) {
                // Header
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = if (currentStep == 1) "Dikey Kaydırma" else "Dikey Kaydırma - ${(tempConfig ?: seatingConfig).groupCount} Gruplu Plan",
                            fontSize = 20.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF1E293B)
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                             text = if (currentStep == 1) "Mevcut bir planı yükleyerek sıralar arasında öğrenci rotasyonu yapın." else "Kaydırma seçeneklerini belirleyerek yeni planınızı oluşturun.",
                            fontSize = 13.sp,
                            color = Color.Gray
                        )
                    }
                    IconButton(onClick = onDismiss) {
                        Icon(Icons.Default.Close, contentDescription = null)
                    }
                }

                Spacer(modifier = Modifier.height(20.dp))

                if (currentStep == 1) {
                    // STEP 1: Plan Yükleme / Seçme
                    Column(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Text(
                            "Temel Plan Yükleme",
                            fontSize = 15.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF1E293B)
                        )
                        Spacer(modifier = Modifier.height(2.dp))
                        Text(
                            "Dikey kaydırma işlemi uygulamak için lütfen önce bir oturma planı (.json) dosyası yükleyin.",
                            fontSize = 12.sp,
                            color = Color.Gray,
                            textAlign = TextAlign.Center
                        )
                        
                        Spacer(modifier = Modifier.height(16.dp))
                        
                        Card(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(140.dp),
                            colors = CardDefaults.cardColors(
                                containerColor = if (tempPlan != null) Color(0xFFECFDF5) else Color(0xFFFEF2F2)
                            ),
                            border = BorderStroke(
                                width = 1.dp,
                                color = if (tempPlan != null) Color(0xFF10B981) else Color(0xFFFECACA)
                            ),
                            shape = RoundedCornerShape(16.dp)
                        ) {
                            Column(
                                modifier = Modifier.fillMaxSize().padding(16.dp),
                                horizontalAlignment = Alignment.CenterHorizontally,
                                verticalArrangement = Arrangement.Center
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Upload,
                                    contentDescription = null,
                                    tint = if (tempPlan != null) Color(0xFF059669) else Color(0xFFEF4444),
                                    modifier = Modifier.size(32.dp)
                                )
                                Spacer(modifier = Modifier.height(8.dp))
                                Text(
                                    text = if (tempPlan != null) "Plan Yüklendi" else "Plan Bekleniyor",
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 14.sp,
                                    color = if (tempPlan != null) Color(0xFF047857) else Color(0xFFB91C1C)
                                )
                                Text(
                                    text = if (tempPlan != null) {
                                        "Mevcut sistem planı veya yüklediğiniz plan hazır."
                                    } else {
                                        "Devam etmek için bir plan dosyası yükleyin."
                                    },
                                    fontSize = 11.sp,
                                    color = Color.Gray,
                                    textAlign = TextAlign.Center
                                )
                            }
                        }
                        
                        Spacer(modifier = Modifier.height(16.dp))
                        
                        Button(
                            onClick = { shiftImportLauncher.launch("application/json") },
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFF97316)),
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier.fillMaxWidth().height(48.dp)
                        ) {
                            Icon(Icons.Default.Upload, contentDescription = null, tint = Color.White)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Dosya Seç", fontWeight = FontWeight.Bold, color = Color.White)
                        }

                        Spacer(modifier = Modifier.height(24.dp))

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.End,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            TextButton(onClick = onDismiss) {
                                Text("İptal", color = Color.Gray, fontWeight = FontWeight.Bold)
                            }
                            Spacer(modifier = Modifier.width(16.dp))
                            Button(
                                onClick = { currentStep = 2 },
                                enabled = tempPlan != null,
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF0284C7)),
                                shape = RoundedCornerShape(12.dp)
                            ) {
                                Text("İleri ->", fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                } else {
                    // STEP 2: Kaydırma Yönü & Seçenekler
                    Column(modifier = Modifier.fillMaxWidth()) {
                        Text("Kaydırma Yönü", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = Color.Black)
                        Spacer(modifier = Modifier.height(10.dp))
                        
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            // İleri Kaydır Card
                            Card(
                                modifier = Modifier
                                    .weight(1f)
                                    .height(100.dp)
                                    .clickable {
                                        isForwardShift = true
                                    },
                                colors = CardDefaults.cardColors(
                                    containerColor = if (isForwardShift) Color(0xFF3B82F6) else Color.White
                                ),
                                border = BorderStroke(
                                    width = if (isForwardShift) 0.dp else 1.dp,
                                    color = if (isForwardShift) Color.Transparent else Color(0xFFE2E8F0)
                                ),
                                shape = RoundedCornerShape(16.dp)
                            ) {
                                Column(
                                    modifier = Modifier.fillMaxSize(),
                                    horizontalAlignment = Alignment.CenterHorizontally,
                                    verticalArrangement = Arrangement.Center
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.ArrowUpward,
                                        contentDescription = null,
                                        tint = if (isForwardShift) Color.White else Color.Black,
                                        modifier = Modifier.size(24.dp)
                                    )
                                    Spacer(modifier = Modifier.height(6.dp))
                                    Text(
                                        "İleri Kaydır",
                                        fontWeight = FontWeight.Bold,
                                        color = if (isForwardShift) Color.White else Color.Black,
                                        fontSize = 14.sp
                                    )
                                }
                            }

                            // Geri Kaydır Card
                            Card(
                                modifier = Modifier
                                    .weight(1f)
                                    .height(100.dp)
                                    .clickable {
                                        isForwardShift = false
                                    },
                                colors = CardDefaults.cardColors(
                                    containerColor = if (!isForwardShift) Color(0xFF3B82F6) else Color.White
                                ),
                                border = BorderStroke(
                                    width = if (!isForwardShift) 0.dp else 1.dp,
                                    color = if (!isForwardShift) Color.Transparent else Color(0xFFE2E8F0)
                                ),
                                shape = RoundedCornerShape(16.dp)
                            ) {
                                Column(
                                    modifier = Modifier.fillMaxSize(),
                                    horizontalAlignment = Alignment.CenterHorizontally,
                                    verticalArrangement = Arrangement.Center
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.ArrowDownward,
                                        contentDescription = null,
                                        tint = if (!isForwardShift) Color.White else Color.Black,
                                        modifier = Modifier.size(24.dp)
                                    )
                                    Spacer(modifier = Modifier.height(6.dp))
                                    Text(
                                        "Geri Kaydır",
                                        fontWeight = FontWeight.Bold,
                                        color = if (!isForwardShift) Color.White else Color.Black,
                                        fontSize = 14.sp
                                    )
                                }
                            }
                        }
                        
                        Spacer(modifier = Modifier.height(8.dp))
                        
                        Text(
                            text = "İleri: Arka sıra öne gelir. Geri: Ön sıra arkaya gider.",
                            fontSize = 11.sp,
                            color = Color.Gray,
                            fontStyle = androidx.compose.ui.text.font.FontStyle.Italic,
                            textAlign = TextAlign.Center,
                            modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp)
                        )
                        
                        Spacer(modifier = Modifier.height(16.dp))
                        
                        // "Sıra İçinde Karıştır" Switch Section
                        Card(
                             modifier = Modifier.fillMaxWidth(),
                             colors = CardDefaults.cardColors(containerColor = Color(0xFFF8FAFC)),
                             border = BorderStroke(1.dp, Color(0xFFE2E8F0)),
                             shape = RoundedCornerShape(16.dp)
                         ) {
                             Row(
                                 modifier = Modifier.padding(16.dp).fillMaxWidth(),
                                 verticalAlignment = Alignment.CenterVertically,
                                 horizontalArrangement = Arrangement.SpaceBetween
                             ) {
                                 Column(modifier = Modifier.weight(1f)) {
                                     Text(
                                         "Sıra İçinde Karıştır?",
                                         fontWeight = FontWeight.Bold,
                                         fontSize = 14.sp,
                                         color = Color.Black
                                     )
                                     Text(
                                         "Sıralar kaydırıldıktan sonra öğrenciler sıra içinde yeniden karıştırılsın mı?",
                                         fontSize = 11.sp,
                                         color = Color.Gray,
                                         lineHeight = 14.sp
                                     )
                                 }
                                 Spacer(modifier = Modifier.width(12.dp))
                                 Switch(
                                     checked = isShuffleEnabled,
                                     onCheckedChange = { isShuffleEnabled = it }
                                 )
                             }
                         }

                         Spacer(modifier = Modifier.height(24.dp))

                         // Bottom Navigation Buttons
                         Row(
                             modifier = Modifier.fillMaxWidth(),
                             horizontalArrangement = Arrangement.SpaceBetween,
                             verticalAlignment = Alignment.CenterVertically
                         ) {
                             TextButton(
                                 onClick = { currentStep = 1 },
                                 shape = RoundedCornerShape(12.dp)
                             ) {
                                 Icon(Icons.Default.ArrowBack, contentDescription = null, modifier = Modifier.size(16.dp), tint = Color.Gray)
                                 Spacer(modifier = Modifier.width(4.dp))
                                 Text("Geri", fontWeight = FontWeight.Bold, color = Color.Gray)
                             }
                             Button(
                                 onClick = {
                                     val originalConfig = tempConfig ?: seatingConfig
                                     val groupCount = originalConfig.groupCount
                                     val rotatedPlan = mutableMapOf<String, String>()

                                     for (groupIdx in 0 until groupCount) {
                                         val rows = originalConfig.rowsPerGroup.getOrElse(groupIdx) { 5 }
                                         if (rows <= 0) continue
                                         
                                         // Read the original rows of students
                                         val originalRows = List(rows) { Array(originalConfig.peoplePerRow) { "" } }
                                         for (r in 0 until rows) {
                                             for (s in 0 until originalConfig.peoplePerRow) {
                                                 originalRows[r][s] = (tempPlan ?: emptyMap())["g$groupIdx-r$r-s$s"] ?: ""
                                             }
                                         }
                                         
                                         // Create shifted rows
                                         val rotatedRows = List(rows) { Array(originalConfig.peoplePerRow) { "" } }
                                         for (r in 0 until rows) {
                                             val targetR = if (isForwardShift) {
                                                 (r - 1 + rows) % rows
                                             } else {
                                                 (r + 1) % rows
                                             }

                                             if (isShuffleEnabled) {
                                                 val rowStudents = originalRows[r].filter { it.isNotBlank() }.toMutableList()
                                                 rowStudents.shuffle()
                                                 var writeIdx = 0
                                                 for (s in 0 until originalConfig.peoplePerRow) {
                                                     if (writeIdx < rowStudents.size) {
                                                         rotatedRows[targetR][s] = rowStudents[writeIdx]
                                                         writeIdx++
                                                     } else {
                                                         rotatedRows[targetR][s] = ""
                                                     }
                                                 }
                                             } else {
                                                 for (s in 0 until originalConfig.peoplePerRow) {
                                                     rotatedRows[targetR][s] = originalRows[r][s]
                                                 }
                                             }
                                         }
                                         
                                         // Map back to output plan
                                         for (r in 0 until rows) {
                                             for (s in 0 until originalConfig.peoplePerRow) {
                                                 val studentId = rotatedRows[r][s]
                                                 if (studentId.isNotBlank()) {
                                                     rotatedPlan["g$groupIdx-r$r-s$s"] = studentId
                                                 }
                                             }
                                         }
                                     }

                                     onApplyShift(originalConfig, rotatedPlan)
                                 },
                                 colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF0284C7)),
                                 shape = RoundedCornerShape(12.dp)
                             ) {
                                 Icon(Icons.Default.Check, contentDescription = null, modifier = Modifier.size(16.dp))
                                 Spacer(modifier = Modifier.width(4.dp))
                                 Text("Planı Oluştur", fontWeight = FontWeight.Bold)
                             }
                         }
                     }
                 }
             }
         }
     }
 }
