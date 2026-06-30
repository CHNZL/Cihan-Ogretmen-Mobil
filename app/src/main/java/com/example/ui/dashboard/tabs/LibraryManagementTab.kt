package com.example.ui.dashboard.tabs

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.auth.UserData
import com.example.data.Student
import com.google.firebase.FirebaseApp
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.Query
import com.google.firebase.firestore.FieldValue
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

// Local models to match the web structure
data class LibraryBook(
    val id: String = "",
    val registrationNo: Long = 0L,
    val name: String = "",
    val author: String? = null,
    val pageCount: Long? = null,
    val status: String? = null,
    val currentStudentId: String? = null,
    val currentStudentName: String? = null,
    val assignmentDate: Any? = null,
    val isReadByAll: Boolean = false
)

data class LibraryReadingRecord(
    val id: String = "",
    val bookId: String = "",
    val bookName: String = "",
    val studentId: String = "",
    val studentName: String = "",
    val startDate: Any? = null,
    val endDate: Any? = null,
    val teacherUid: String = ""
)

data class LibraryReadingEvaluation(
    val id: String = "",
    val bookId: String = "",
    val bookName: String = "",
    val studentId: String = "",
    val studentName: String = "",
    val readingScore: Double? = null,
    val tellingScore: Double? = null,
    val writingScore: Double? = null,
    val examScore: Double? = null,
    val teacherUid: String = ""
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LibraryManagementTab(
    userData: UserData,
    initialSubTab: Int = 0,
    initialOpenAddDialog: Boolean = false
) {
    var showAddDialog by remember { mutableStateOf(initialOpenAddDialog) }
    val selectedTab = initialSubTab
    
    val db = remember { FirebaseFirestore.getInstance() }
    val teacherUid = userData.teacherUid.takeIf { it.isNotBlank() } ?: userData.userId
    val scope = rememberCoroutineScope()
    
    var currentUserUid by remember { mutableStateOf(com.google.firebase.auth.FirebaseAuth.getInstance().currentUser?.uid) }
    
    androidx.compose.runtime.LaunchedEffect(Unit) {
        com.google.firebase.auth.FirebaseAuth.getInstance().addAuthStateListener { auth ->
            currentUserUid = auth.currentUser?.uid
        }
    }
    val authUid = currentUserUid
    
    var teacherBooks by remember { mutableStateOf<List<LibraryBook>>(emptyList()) }
    var localBooks by remember { mutableStateOf<List<LibraryBook>>(emptyList()) }
    
    var teacherStudents by remember { mutableStateOf<List<Student>>(emptyList()) }
    var localStudents by remember { mutableStateOf<List<Student>>(emptyList()) }
    
    var teacherRecords by remember { mutableStateOf<List<LibraryReadingRecord>>(emptyList()) }
    var localRecords by remember { mutableStateOf<List<LibraryReadingRecord>>(emptyList()) }
    
    var teacherEvaluations by remember { mutableStateOf<List<LibraryReadingEvaluation>>(emptyList()) }
    var localEvaluations by remember { mutableStateOf<List<LibraryReadingEvaluation>>(emptyList()) }

    val books = (teacherBooks + localBooks).distinctBy { it.id }.sortedBy { it.registrationNo }
    val students = (teacherStudents + localStudents).distinctBy { it.id }.sortedBy { it.name }
    val readingRecords = (teacherRecords + localRecords).distinctBy { it.id }
    val readingEvaluations = (teacherEvaluations + localEvaluations).distinctBy { it.id }
    
    var isLoading by remember { mutableStateOf(true) }
    
    val dateFormatter = remember { SimpleDateFormat("dd.MM.yyyy", Locale("tr", "TR")) }

    DisposableEffect(teacherUid, authUid) {
        val booksListener = db.collection("users").document(teacherUid).collection("books")
            .addSnapshotListener { snapshot, _ ->
                if (snapshot != null) {
                    teacherBooks = snapshot.documents.mapNotNull { doc ->
                        doc.toObject(LibraryBook::class.java)?.copy(id = doc.id)
                    }
                }
            }
            
        val localBooksListener = if (authUid != null && authUid != teacherUid) {
            db.collection("users").document(authUid).collection("books")
                .addSnapshotListener { snapshot, _ ->
                    if (snapshot != null) {
                        localBooks = snapshot.documents.mapNotNull { doc ->
                            doc.toObject(LibraryBook::class.java)?.copy(id = doc.id)
                        }
                    }
                }
        } else null
            
        val studentsListener = db.collection("users").document(teacherUid).collection("students")
            .addSnapshotListener { snapshot, _ ->
                if (snapshot != null) {
                    teacherStudents = snapshot.documents.mapNotNull { doc ->
                        doc.toObject(Student::class.java)?.copy(id = doc.id)
                    }
                }
            }
            
        val localStudentsListener = if (authUid != null && authUid != teacherUid) {
            db.collection("users").document(authUid).collection("students")
                .addSnapshotListener { snapshot, _ ->
                    if (snapshot != null) {
                        localStudents = snapshot.documents.mapNotNull { doc ->
                            doc.toObject(Student::class.java)?.copy(id = doc.id)
                        }
                    }
                }
        } else null
            
        val recordsListener = db.collection("users").document(teacherUid).collection("readingRecords")
            .addSnapshotListener { snapshot, _ ->
                if (snapshot != null) {
                    teacherRecords = snapshot.documents.mapNotNull { doc ->
                        doc.toObject(LibraryReadingRecord::class.java)?.copy(id = doc.id)
                    }
                }
            }
            
        val localRecordsListener = if (authUid != null && authUid != teacherUid) {
            db.collection("users").document(authUid).collection("readingRecords")
                .addSnapshotListener { snapshot, _ ->
                    if (snapshot != null) {
                        localRecords = snapshot.documents.mapNotNull { doc ->
                            doc.toObject(LibraryReadingRecord::class.java)?.copy(id = doc.id)
                        }
                    }
                }
        } else null

        val evaluationsListener = db.collection("users").document(teacherUid).collection("readingEvaluations")
            .addSnapshotListener { snapshot, _ ->
                if (snapshot != null) {
                    teacherEvaluations = snapshot.documents.mapNotNull { doc ->
                        doc.toObject(LibraryReadingEvaluation::class.java)?.copy(id = doc.id)
                    }
                    isLoading = false
                }
            }
            
        val localEvaluationsListener = if (authUid != null && authUid != teacherUid) {
            db.collection("users").document(authUid).collection("readingEvaluations")
                .addSnapshotListener { snapshot, _ ->
                    if (snapshot != null) {
                        localEvaluations = snapshot.documents.mapNotNull { doc ->
                            doc.toObject(LibraryReadingEvaluation::class.java)?.copy(id = doc.id)
                        }
                    }
                    isLoading = false
                }
        } else null
            
        onDispose {
            booksListener.remove()
            localBooksListener?.remove()
            studentsListener.remove()
            localStudentsListener?.remove()
            recordsListener.remove()
            localRecordsListener?.remove()
            evaluationsListener.remove()
            localEvaluationsListener?.remove()
        }
    }
    
    if (showAddDialog) {
        AddBookDialog(
            userId = teacherUid,
            books = books,
            students = students,
            readingRecords = readingRecords,
            onDismiss = { showAddDialog = false },
            onAdd = { newBook, assignedStudent ->
                scope.launch {
                    try {
                        val bookRef = db.collection("users").document(teacherUid).collection("books").add(newBook).await()
                        
                        if (assignedStudent != null) {
                            val updates = hashMapOf<String, Any>(
                                "currentStudentId" to assignedStudent.id,
                                "currentStudentName" to assignedStudent.name,
                                "assignmentDate" to FieldValue.serverTimestamp(),
                                "status" to "Okunuyor"
                            )
                            bookRef.update(updates).await()

                            val record = hashMapOf(
                                "bookId" to bookRef.id,
                                "bookName" to newBook.name,
                                "studentId" to assignedStudent.id,
                                "studentNo" to assignedStudent.studentNo,
                                "studentName" to assignedStudent.name,
                                "teacherUid" to teacherUid,
                                "assignedAt" to FieldValue.serverTimestamp(),
                                "returnedAt" to null,
                                "status" to "active"
                            )
                            db.collection("users").document(teacherUid).collection("readingRecords").add(record).await()
                        }
                        showAddDialog = false
                    } catch (e: Exception) {
                        e.printStackTrace()
                    }
                }
            }
        )
    }

    Scaffold(
        floatingActionButton = {
            if (selectedTab == 0) {
                FloatingActionButton(
                    onClick = { showAddDialog = true },
                    containerColor = MaterialTheme.colorScheme.primary
                ) {
                    Icon(Icons.Default.Add, contentDescription = "Kitap Ekle")
                }
            }
        }
    ) { padding ->
        Column(modifier = Modifier.fillMaxSize().padding(padding).background(Color(0xFFF8FAFC))) {
            Box(modifier = Modifier.weight(1f).fillMaxWidth()) {
                if (isLoading) {
                    CircularProgressIndicator(modifier = Modifier.align(Alignment.Center))
                } else {
                    when (selectedTab) {
                        0 -> LibraryListScreen(
                                books = books, 
                                students = students, 
                                readingRecords = readingRecords,
                                teacherUid = teacherUid, 
                                db = db,
                                onEditClicked = { /* TODO implement edit */ },
                                onDeleteClicked = { bookId ->
                                    scope.launch { db.collection("users").document(teacherUid).collection("books").document(bookId).delete().await() }
                                },
                                onMarkAsReadByAll = { book ->
                                    scope.launch {
                                        val updates = hashMapOf<String, Any>(
                                            "isReadByAll" to true,
                                            "currentStudentId" to FieldValue.delete(),
                                            "currentStudentName" to FieldValue.delete(),
                                            "status" to "Rafta",
                                            "assignmentDate" to FieldValue.delete()
                                        )
                                        db.collection("users").document(teacherUid).collection("books").document(book.id).update(updates).await()
                                        
                                        // End any active reading records for this book
                                        val recordsQuery = db.collection("users").document(teacherUid).collection("readingRecords")
                                            .whereEqualTo("bookId", book.id)
                                            .get().await()
                                            
                                        for (doc in recordsQuery.documents) {
                                            if (!doc.contains("endDate") || doc.get("endDate") == null) {
                                                db.collection("users").document(teacherUid).collection("readingRecords")
                                                    .document(doc.id).update("endDate", FieldValue.serverTimestamp()).await()
                                            }
                                        }

                                        // Only assign to students who haven't read it yet!
                                        val readStudentIds = readingRecords.filter { it.bookId == book.id }.map { it.studentId }.toSet()
                                        
                                        val starsToAward = if (book.pageCount != null && book.pageCount > 0) {
                                            kotlin.math.ceil(book.pageCount.toDouble() / 10.0).toInt()
                                        } else 0
                                        
                                        for (student in students) {
                                            if (student.id !in readStudentIds) {
                                                val record = hashMapOf(
                                                    "bookId" to book.id,
                                                    "bookName" to book.name,
                                                    "studentId" to student.id,
                                                    "studentName" to "${student.name} ${student.surname}",
                                                    "teacherUid" to teacherUid,
                                                    "startDate" to FieldValue.serverTimestamp(),
                                                    "endDate" to FieldValue.serverTimestamp(), // Instantly finished since they all read it
                                                    "createdAt" to FieldValue.serverTimestamp()
                                                )
                                                db.collection("users").document(teacherUid).collection("readingRecords").add(record).await()
                                                
                                                // Star logic
                                                if (starsToAward > 0) {
                                                    val newHistoryItem = mapOf(
                                                        "category" to "Kitap Kurdu Yıldızı",
                                                        "description" to "${book.name} (${book.pageCount} Sayfa)",
                                                        "amount" to starsToAward,
                                                        "timestamp" to System.currentTimeMillis()
                                                    )
                                                    db.collection("users").document(teacherUid).collection("students").document(student.id)
                                                        .update(
                                                            "stars", FieldValue.increment(starsToAward.toLong()),
                                                            "starHistory", FieldValue.arrayUnion(newHistoryItem)
                                                        ).await()
                                                }
                                            }
                                        }
                                    }
                                }
                            )
                        1 -> ReadingRecordsScreen(
                                records = readingRecords, 
                                students = students, 
                                dateFormatter = dateFormatter,
                                teacherUid = teacherUid,
                                db = db
                             )
                        2 -> ReadingEvaluationScreen(
                                books = books,
                                students = students,
                                evaluations = readingEvaluations,
                                teacherUid = teacherUid,
                                db = db
                             )
                    }
                }
            }
        }
    }
}

@Composable
fun LibraryListScreen(
    books: List<LibraryBook>,
    students: List<Student>,
    readingRecords: List<LibraryReadingRecord>,
    teacherUid: String,
    db: FirebaseFirestore,
    onEditClicked: (LibraryBook) -> Unit,
    onDeleteClicked: (String) -> Unit,
    onMarkAsReadByAll: (LibraryBook) -> Unit
) {
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    var showAssignDialog by remember { mutableStateOf<LibraryBook?>(null) }
    var bookToDelete by remember { mutableStateOf<LibraryBook?>(null) }
    var bookToMarkByAll by remember { mutableStateOf<LibraryBook?>(null) }

    if (bookToDelete != null) {
        AlertDialog(
            onDismissRequest = { bookToDelete = null },
            title = { Text("Kitabı Sil") },
            text = { Text("Bu kitabı silmek istediğinize emin misiniz?") },
            confirmButton = {
                TextButton(onClick = { onDeleteClicked(bookToDelete!!.id); bookToDelete = null }) { Text("Sil", color = Color.Red) }
            },
            dismissButton = {
                TextButton(onClick = { bookToDelete = null }) { Text("İptal") }
            }
        )
    }

    if (bookToMarkByAll != null) {
        AlertDialog(
            onDismissRequest = { bookToMarkByAll = null },
            title = { Text("Tüm Sınıf Okudu") },
            text = { Text("\"${bookToMarkByAll!!.name}\" kitabını tüm sınıf okudu olarak işaretlemek istediğinize emin misiniz? Sınıftaki tüm öğrenciler için okuma kaydı oluşturulacaktır.") },
            confirmButton = {
                TextButton(onClick = { onMarkAsReadByAll(bookToMarkByAll!!); bookToMarkByAll = null }) { Text("Evet, İşaretle") }
            },
            dismissButton = {
                TextButton(onClick = { bookToMarkByAll = null }) { Text("İptal") }
            }
        )
    }
    
    if (showAssignDialog != null) {
        AssignBookDialog(
            book = showAssignDialog!!,
            students = students,
            onDismiss = { showAssignDialog = null },
            onAssign = { student ->
                // Çift Kitap Engeli
                val alreadyHasBook = books.any { it.currentStudentId == student.id }
                if (alreadyHasBook) {
                    android.widget.Toast.makeText(context, "${student.name} isimli öğrencinin üzerinde zaten bir kitap var!", android.widget.Toast.LENGTH_SHORT).show()
                    return@AssignBookDialog
                }
                
                // Mükerrer Okuma Engeli
                val alreadyRead = readingRecords.any { it.bookId == showAssignDialog!!.id && it.studentId == student.id }
                if (alreadyRead) {
                    android.widget.Toast.makeText(context, "${student.name} bu kitabı zaten okumuş!", android.widget.Toast.LENGTH_SHORT).show()
                    return@AssignBookDialog
                }
                
                scope.launch {
                    val updates = hashMapOf<String, Any>(
                        "currentStudentId" to student.id,
                        "currentStudentName" to "${student.name} ${student.surname}",
                        "status" to "Okunuyor",
                        "assignmentDate" to FieldValue.serverTimestamp()
                    )
                    db.collection("users").document(teacherUid).collection("books").document(showAssignDialog!!.id).update(updates).await()
                    
                    val record = hashMapOf(
                        "bookId" to showAssignDialog!!.id,
                        "bookName" to showAssignDialog!!.name,
                        "studentId" to student.id,
                        "studentName" to "${student.name} ${student.surname}",
                        "teacherUid" to teacherUid,
                        "startDate" to FieldValue.serverTimestamp(),
                        "createdAt" to FieldValue.serverTimestamp()
                    )
                    db.collection("users").document(teacherUid).collection("readingRecords").add(record).await()
                    showAssignDialog = null
                }
            }
        )
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        items(books) { book ->
            Card(
                modifier = Modifier.fillMaxWidth(),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                shape = RoundedCornerShape(16.dp)
            ) {
                var menuExpanded by remember { mutableStateOf(false) }

                Column(modifier = Modifier.padding(16.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "${book.registrationNo}. ${book.name}",
                            fontWeight = FontWeight.Black,
                            fontSize = 18.sp,
                            color = Color(0xFF1E293B)
                        )
                        Box {
                            IconButton(onClick = { menuExpanded = true }, modifier = Modifier.size(32.dp)) {
                                Icon(Icons.Default.MoreVert, contentDescription = "Diğer İşlemler")
                            }
                            DropdownMenu(expanded = menuExpanded, onDismissRequest = { menuExpanded = false }) {
                                DropdownMenuItem(
                                    text = { Text("Tüm Sınıf Okudu") },
                                    onClick = { menuExpanded = false; bookToMarkByAll = book }
                                )
                                DropdownMenuItem(
                                    text = { Text("Sil", color = Color.Red) },
                                    onClick = { menuExpanded = false; bookToDelete = book }
                                )
                            }
                        }
                    }
                    
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "Yazar: ${book.author ?: "Belirtilmedi"} | Sayfa: ${book.pageCount ?: "?"}",
                        style = MaterialTheme.typography.bodyMedium,
                        color = Color(0xFF64748B)
                    )
                    
                    Spacer(modifier = Modifier.height(16.dp))
                    
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        if (book.currentStudentId != null) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Default.Person, contentDescription = null, modifier = Modifier.size(16.dp), tint = Color(0xFFF97316))
                                Spacer(modifier = Modifier.width(6.dp))
                                Text(
                                    text = "Okuyan: ${book.currentStudentName}",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = Color(0xFFF97316),
                                    fontWeight = FontWeight.Bold
                                )
                            }
                            Button(
                                onClick = { 
                                    scope.launch {
                                        val studentId = book.currentStudentId ?: return@launch
                                        val student = students.find { it.id == studentId }
                                        
                                        val updates = hashMapOf<String, Any?>(
                                            "currentStudentId" to null,
                                            "currentStudentName" to null,
                                            "status" to "Rafta",
                                            "assignmentDate" to null
                                        )
                                        db.collection("users").document(teacherUid).collection("books").document(book.id).update(updates).await()
                                        
                                        val recordsQuery = db.collection("users").document(teacherUid).collection("readingRecords")
                                            .whereEqualTo("bookId", book.id)
                                            .whereEqualTo("studentId", studentId)
                                            .get().await()
                                            
                                        for (doc in recordsQuery.documents) {
                                            if (!doc.contains("endDate") || doc.get("endDate") == null) {
                                                db.collection("users").document(teacherUid).collection("readingRecords")
                                                    .document(doc.id).update("endDate", FieldValue.serverTimestamp()).await()
                                            }
                                        }
                                        
                                        // Star logic
                                        if (student != null && book.pageCount != null && book.pageCount > 0) {
                                            val starsToAward = kotlin.math.ceil(book.pageCount.toDouble() / 10.0).toInt()
                                            val newHistoryItem = mapOf(
                                                "category" to "Kitap Kurdu Yıldızı",
                                                "description" to "${book.name} (${book.pageCount} Sayfa)",
                                                "amount" to starsToAward,
                                                "timestamp" to System.currentTimeMillis()
                                            )
                                            db.collection("users").document(teacherUid).collection("students").document(student.id)
                                                .update(
                                                    "stars", FieldValue.increment(starsToAward.toLong()),
                                                    "starHistory", FieldValue.arrayUnion(newHistoryItem)
                                                ).await()
                                        }
                                    }
                                },
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF10B981)),
                                shape = RoundedCornerShape(8.dp),
                                contentPadding = PaddingValues(horizontal = 16.dp, vertical = 6.dp),
                                modifier = Modifier.height(36.dp)
                            ) {
                                Text("İade Al", fontSize = 13.sp, fontWeight = FontWeight.Bold)
                            }
                        } else {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Default.CheckCircle, contentDescription = null, modifier = Modifier.size(16.dp), tint = Color(0xFF10B981))
                                Spacer(modifier = Modifier.width(6.dp))
                                Text(
                                    text = "Rafta",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = Color(0xFF10B981),
                                    fontWeight = FontWeight.Bold
                                )
                            }
                            Button(
                                onClick = { showAssignDialog = book },
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF6366F1)),
                                shape = RoundedCornerShape(8.dp),
                                contentPadding = PaddingValues(horizontal = 16.dp, vertical = 6.dp),
                                modifier = Modifier.height(36.dp)
                            ) {
                                Text("Öğrenciye Ver", fontSize = 13.sp, fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun ReadingRecordsScreen(
    records: List<LibraryReadingRecord>,
    students: List<Student>,
    dateFormatter: SimpleDateFormat,
    teacherUid: String,
    db: FirebaseFirestore
) {
    val scope = rememberCoroutineScope()
    var selectedStudentFilter by remember { mutableStateOf<String>("all") }

    val filteredRecords = records.filter { record ->
        selectedStudentFilter == "all" || record.studentId == selectedStudentFilter
    }.sortedByDescending { 
        val ts = it.startDate as? com.google.firebase.Timestamp
        ts?.seconds ?: 0L
    }
    
    Column(modifier = Modifier.fillMaxSize()) {
        // Simple filter
        ScrollableTabRow(
            selectedTabIndex = if (selectedStudentFilter == "all") 0 else students.indexOfFirst { it.id == selectedStudentFilter } + 1,
            edgePadding = 16.dp,
            containerColor = Color.Transparent,
            divider = {},
            indicator = {},
            modifier = Modifier.padding(vertical = 8.dp)
        ) {
            FilterChip(
                selected = selectedStudentFilter == "all",
                onClick = { selectedStudentFilter = "all" },
                label = { Text("Tüm Sınıf") },
                modifier = Modifier.padding(end = 8.dp)
            )
            students.forEach { student ->
                FilterChip(
                    selected = selectedStudentFilter == student.id,
                    onClick = { selectedStudentFilter = student.id },
                    label = { Text(student.name) },
                    modifier = Modifier.padding(end = 8.dp)
                )
            }
        }

        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            items(filteredRecords) { record ->
                val startTs = record.startDate as? com.google.firebase.Timestamp
                val endTs = record.endDate as? com.google.firebase.Timestamp
                
                val startDateStr = startTs?.let { dateFormatter.format(it.toDate()) } ?: "Bilinmiyor"
                val endDateStr = endTs?.let { dateFormatter.format(it.toDate()) } ?: "Hala Okuyor"
                
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = Color.White),
                    elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                            Text(text = record.bookName, fontWeight = FontWeight.Black, fontSize = 16.sp, color = Color(0xFF1E293B), modifier = Modifier.weight(1f))
                            IconButton(
                                onClick = {
                                    scope.launch {
                                        db.collection("users").document(teacherUid).collection("readingRecords").document(record.id).delete().await()
                                    }
                                },
                                modifier = Modifier.size(24.dp)
                            ) {
                                Icon(Icons.Default.Delete, contentDescription = "Sil", tint = Color(0xFFEF4444), modifier = Modifier.size(18.dp))
                            }
                        }
                        Spacer(modifier = Modifier.height(6.dp))
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Person, contentDescription = null, tint = Color(0xFF64748B), modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(text = record.studentName, style = MaterialTheme.typography.bodyMedium, color = Color(0xFF475569), fontWeight = FontWeight.Medium)
                        }
                        Spacer(modifier = Modifier.height(4.dp))
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.CalendarToday, contentDescription = null, tint = Color(0xFF64748B), modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = if (endTs == null) "$startDateStr'den beri okuyor" else "$startDateStr - $endDateStr", 
                                style = MaterialTheme.typography.bodySmall, 
                                color = if (endTs == null) Color(0xFFF59E0B) else Color(0xFF64748B),
                                fontWeight = if (endTs == null) FontWeight.Bold else FontWeight.Normal
                            )
                        }
                    }
                }
            }
            if (filteredRecords.isEmpty()) {
                item {
                    Text(
                        text = "Kayıt bulunamadı.",
                        color = Color.Gray,
                        modifier = Modifier.fillMaxWidth().padding(32.dp),
                        textAlign = androidx.compose.ui.text.style.TextAlign.Center
                    )
                }
            }
        }
    }
}

@Composable
fun ReadingEvaluationScreen(
    books: List<LibraryBook>,
    students: List<Student>,
    evaluations: List<LibraryReadingEvaluation>,
    teacherUid: String,
    db: FirebaseFirestore
) {
    val scope = rememberCoroutineScope()
    var selectedBookId by remember { mutableStateOf<String?>(null) }
    val booksToEvaluate = books.filter { it.isReadByAll }

    Row(modifier = Modifier.fillMaxSize()) {
        // Books List (Left sidebar on large screens, or just a compact list at top on mobile)
        Column(modifier = Modifier.weight(0.35f).fillMaxHeight().background(Color.White).padding(8.dp)) {
            Text(
                text = "⚠️ Sadece tüm sınıf tarafından okunan books değerlendirilir.",
                fontSize = 11.sp,
                color = Color(0xFFEAB308),
                modifier = Modifier.padding(bottom = 8.dp)
            )
            Text("Kitap Seçin", fontWeight = FontWeight.Bold, color = Color.Gray, modifier = Modifier.padding(8.dp))
            if (booksToEvaluate.isEmpty()) {
                Text("Henüz tüm sınıfın okuduğu bir kitap bulunmuyor.", color = Color.Gray, fontSize = 12.sp, modifier = Modifier.padding(8.dp))
            } else {
                LazyColumn {
                    items(booksToEvaluate) { book ->
                        val isSelected = selectedBookId == book.id
                        Card(
                            onClick = { selectedBookId = book.id },
                            modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                            colors = CardDefaults.cardColors(containerColor = if (isSelected) Color(0xFFE0E7FF) else Color(0xFFF8FAFC)),
                            shape = RoundedCornerShape(8.dp)
                        ) {
                            Text(book.name, modifier = Modifier.padding(12.dp), color = if (isSelected) Color(0xFF4338CA) else Color.DarkGray, fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                        }
                    }
                }
            }
        }

        Divider(modifier = Modifier.width(1.dp).fillMaxHeight(), color = Color(0xFFE2E8F0))

        // Evaluation Area
        Box(modifier = Modifier.weight(0.65f).fillMaxHeight()) {
            if (selectedBookId == null) {
                Text("Değerlendirme yapmak için sol taraftan bir kitap seçin.", color = Color.Gray, modifier = Modifier.align(Alignment.Center).padding(16.dp), textAlign = androidx.compose.ui.text.style.TextAlign.Center)
            } else {
                val selectedBook = books.find { it.id == selectedBookId }
                LazyColumn(modifier = Modifier.fillMaxSize().padding(16.dp)) {
                    item {
                        Text("${selectedBook?.name} - Değerlendirme", fontWeight = FontWeight.Black, fontSize = 18.sp, modifier = Modifier.padding(bottom = 16.dp))
                    }
                    items(students.size) { index ->
                        val student = students[index]
                        val evaluation = evaluations.find { it.bookId == selectedBookId && it.studentId == student.id }
                        
                        Card(
                            modifier = Modifier.fillMaxWidth().padding(bottom = 12.dp),
                            colors = CardDefaults.cardColors(containerColor = Color.White),
                            elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
                        ) {
                            Column(modifier = Modifier.padding(12.dp)) {
                                Text("${index + 1}. ${student.name} ${student.surname}", fontWeight = FontWeight.Bold, fontSize = 15.sp)
                                Spacer(modifier = Modifier.height(12.dp))
                                
                                val scoreOptions = listOf(1, 2, 3, 4)
                                
                                @Composable
                                fun ScoreSelector(label: String, currentValue: Double?, onValueChange: (Double) -> Unit) {
                                    Row(modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween) {
                                        Text(label, fontSize = 13.sp, color = Color.DarkGray, modifier = Modifier.weight(1f))
                                        Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                            scoreOptions.forEach { score ->
                                                val scoreD = score.toDouble()
                                                val isSelected = currentValue == scoreD
                                                Box(
                                                    modifier = Modifier
                                                        .size(28.dp)
                                                        .clip(RoundedCornerShape(6.dp))
                                                        .background(if (isSelected) Color(0xFF6366F1) else Color(0xFFF1F5F9))
                                                        .clickable { onValueChange(scoreD) },
                                                    contentAlignment = Alignment.Center
                                                ) {
                                                    Text(score.toString(), color = if (isSelected) Color.White else Color(0xFF64748B), fontWeight = FontWeight.Bold)
                                                }
                                            }
                                        }
                                    }
                                }

                                val updateScore = { field: String, value: Double ->
                                    scope.launch {
                                        if (evaluation == null) {
                                            // Create new evaluation
                                            val newEval = hashMapOf(
                                                "bookId" to selectedBookId!!,
                                                "bookName" to (selectedBook?.name ?: ""),
                                                "studentId" to student.id,
                                                "studentName" to "${student.name} ${student.surname}",
                                                "teacherUid" to teacherUid,
                                                field to value
                                            )
                                            db.collection("users").document(teacherUid).collection("readingEvaluations").add(newEval).await()
                                        } else {
                                            // Update existing
                                            db.collection("users").document(teacherUid).collection("readingEvaluations").document(evaluation.id).update(field, value).await()
                                        }
                                    }
                                }

                                ScoreSelector("Okuma Puanı", evaluation?.readingScore) { updateScore("readingScore", it) }
                                ScoreSelector("Anlatma Puanı", evaluation?.tellingScore) { updateScore("tellingScore", it) }
                                ScoreSelector("Yazma Puanı", evaluation?.writingScore) { updateScore("writingScore", it) }
                                ScoreSelector("Sınav Puanı", evaluation?.examScore) { updateScore("examScore", it) }
                            }
                        }
                    }
                }
            }
        }
    }
}

fun String.toTitleCase(): String {
    return this.trim().split("\\s+".toRegex()).joinToString(" ") { word ->
        if (word.isNotEmpty()) {
            word.substring(0, 1).uppercase(Locale("tr", "TR")) + word.substring(1).lowercase(Locale("tr", "TR"))
        } else {
            ""
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AddBookDialog(
    userId: String,
    books: List<LibraryBook>,
    students: List<Student>,
    readingRecords: List<LibraryReadingRecord>,
    onDismiss: () -> Unit,
    onAdd: (LibraryBook, Student?) -> Unit
) {
    var name by remember { mutableStateOf("") }
    var author by remember { mutableStateOf("") }
    var pageCount by remember { mutableStateOf("") }
    var selectedStudent by remember { mutableStateOf<Student?>(null) }
    var expanded by remember { mutableStateOf(false) }
    
    val context = LocalContext.current

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Yeni Kitap Ekle", fontWeight = FontWeight.Bold, color = Color(0xFF1E293B)) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = { Text("Kitap Adı") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                )
                OutlinedTextField(
                    value = author,
                    onValueChange = { author = it },
                    label = { Text("Yazar") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                )
                OutlinedTextField(
                    value = pageCount,
                    onValueChange = { pageCount = it },
                    label = { Text("Sayfa Sayısı") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                )

                ExposedDropdownMenuBox(
                    expanded = expanded,
                    onExpandedChange = { expanded = !expanded }
                ) {
                    OutlinedTextField(
                        readOnly = true,
                        value = selectedStudent?.let { "${it.name} ${it.surname}" } ?: "Öğrenciye Ata (İsteğe Bağlı)",
                        onValueChange = { },
                        label = { Text("Öğrenci (Opsiyonel)") },
                        trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded) },
                        modifier = Modifier.menuAnchor().fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp)
                    )
                    ExposedDropdownMenu(
                        expanded = expanded,
                        onDismissRequest = { expanded = false }
                    ) {
                        DropdownMenuItem(
                            text = { Text("Kimseye Atama") },
                            onClick = {
                                selectedStudent = null
                                expanded = false
                            }
                        )
                        students.forEach { student ->
                            DropdownMenuItem(
                                text = { Text("${student.name} ${student.surname}") },
                                onClick = {
                                    selectedStudent = student
                                    expanded = false
                                }
                            )
                        }
                    }
                }
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    if (name.isBlank()) {
                        android.widget.Toast.makeText(context, "Lütfen kitap adını giriniz.", android.widget.Toast.LENGTH_SHORT).show()
                        return@Button
                    }
                    
                    if (selectedStudent != null) {
                        val alreadyHasBook = books.any { it.currentStudentId == selectedStudent!!.id }
                        if (alreadyHasBook) {
                            android.widget.Toast.makeText(context, "${selectedStudent!!.name} zaten bir kitap okuyor. Kitap başarıyla kitaplığa eklendi ancak atama işlemi gerçekleştirilemedi.", android.widget.Toast.LENGTH_LONG).show()
                            selectedStudent = null // We proceed with adding, but cancel assignment
                        }
                    }

                    val formattedName = name.toTitleCase()
                    val formattedAuthor = author.toTitleCase()

                    val isDuplicate = books.any { it.name.equals(formattedName, ignoreCase = true) }
                    if (isDuplicate) {
                        android.widget.Toast.makeText(context, "Bu isimde bir kitap zaten kitaplığınızda mevcut. Lütfen kitap ismini kontrol edin veya farklı bir isim verin.", android.widget.Toast.LENGTH_LONG).show()
                        return@Button
                    }

                    val existingNos = books.map { it.registrationNo }.sorted()
                    var nextNo = 1L
                    for (no in existingNos) {
                        if (no == nextNo) {
                            nextNo++
                        } else if (no > nextNo) {
                            break
                        }
                    }

                    val newBook = LibraryBook(
                        registrationNo = nextNo,
                        name = formattedName,
                        author = formattedAuthor.takeIf { it.isNotBlank() },
                        pageCount = pageCount.toLongOrNull() ?: 0L,
                        status = "Rafta"
                    )
                    onAdd(newBook, selectedStudent)
                },
                shape = RoundedCornerShape(8.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF6366F1))
            ) {
                Text("Ekle", fontWeight = FontWeight.Bold)
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("İptal", color = Color(0xFF64748B))
            }
        },
        containerColor = Color.White
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AssignBookDialog(
    book: LibraryBook,
    students: List<Student>,
    onDismiss: () -> Unit,
    onAssign: (Student) -> Unit
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Sınıftan Öğrenci Seç", fontWeight = FontWeight.Bold) },
        text = {
            Column {
                Text("Kitap: ${book.name}", color = Color(0xFF64748B), modifier = Modifier.padding(bottom = 12.dp))
                LazyColumn(modifier = Modifier.heightIn(max = 300.dp)) {
                    items(students) { student ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { onAssign(student) }
                                .padding(vertical = 12.dp, horizontal = 8.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Box(modifier = Modifier.size(32.dp).clip(RoundedCornerShape(16.dp)).background(Color(0xFFEEF2FF)), contentAlignment = Alignment.Center) {
                                Text(student.name.take(1), color = Color(0xFF6366F1), fontWeight = FontWeight.Bold)
                            }
                            Spacer(modifier = Modifier.width(12.dp))
                            Text(text = "${student.name} ${student.surname}", fontSize = 16.sp, fontWeight = FontWeight.Medium, color = Color(0xFF1E293B))
                        }
                        if (students.last() != student) {
                            Divider(color = Color(0xFFF1F5F9))
                        }
                    }
                }
            }
        },
        confirmButton = { },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("İptal", color = Color(0xFF64748B))
            }
        },
        containerColor = Color.White
    )
}
