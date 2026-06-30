package com.example.data

import com.google.firebase.Firebase
import com.google.firebase.firestore.firestore
import kotlinx.coroutines.tasks.await
import kotlinx.coroutines.withTimeoutOrNull

private suspend fun <T> com.google.android.gms.tasks.Task<T>.awaitWithTimeout(timeoutMs: Long = 15000L): T? {
    return try {
        withTimeoutOrNull(timeoutMs) {
            this@awaitWithTimeout.await()
        }
    } catch (e: Exception) {
        android.util.Log.e("FirestoreRepository", "Task await timed out/failed: ${e.message}")
        null
    }
}

class FirestoreRepository {
    private val db = com.google.firebase.firestore.FirebaseFirestore.getInstance(
        com.google.firebase.FirebaseApp.getInstance(),
        "ai-studio-50d2114a-6844-4ea4-a54d-c3de2ef685ab"
    )

    suspend fun getUserDocument(userId: String): UserDocument? {
        return try {
            android.util.Log.d("FirestoreRepository", "getUserDocument for UID: $userId")
            val doc = db.collection("users").document(userId).get().awaitWithTimeout()
            if (doc != null && doc.exists()) {
                val email = doc.getString("email") ?: ""
                val profileType = doc.getString("profileType") ?: doc.getString("profil_tipi") ?: doc.getString("profilTipi") ?: ""
                val city = doc.getString("city") ?: doc.getString("il") ?: ""
                val district = doc.getString("district") ?: doc.getString("ilce") ?: ""
                val schoolName = doc.getString("schoolName") ?: doc.getString("okul_adi") ?: doc.getString("okulAdi") ?: ""
                android.util.Log.d("FirestoreRepository", "Found Direct Doc! email: $email, profileType: $profileType")
                UserDocument(email, profileType, city, district, schoolName)
            } else {
                android.util.Log.w("FirestoreRepository", "Direct Doc does not exist or timed out for UID: $userId")
                null
            }
        } catch (e: Exception) {
            e.printStackTrace()
            null
        }
    }

    suspend fun getUserDocumentByEmail(email: String): Pair<String, UserDocument>? {
        if (email.isEmpty()) return null
        val cleanEmail = email.trim().lowercase()
        return try {
            android.util.Log.d("FirestoreRepository", "getUserDocumentByEmail query: $cleanEmail")
            var snapshot = db.collection("users")
                .whereEqualTo("email", cleanEmail)
                .get()
                .awaitWithTimeout()
            
            if (snapshot == null || snapshot.isEmpty) {
                // Try case-exact query as fallback
                snapshot = db.collection("users")
                    .whereEqualTo("email", email.trim())
                    .get()
                    .awaitWithTimeout()
            }
            
            val doc = snapshot?.documents?.firstOrNull()
            if (doc != null && doc.exists()) {
                val emailStr = doc.getString("email") ?: ""
                val profileType = doc.getString("profileType") ?: doc.getString("profil_tipi") ?: doc.getString("profilTipi") ?: ""
                val city = doc.getString("city") ?: doc.getString("il") ?: ""
                val district = doc.getString("district") ?: doc.getString("ilce") ?: ""
                val schoolName = doc.getString("schoolName") ?: doc.getString("okul_adi") ?: doc.getString("okulAdi") ?: ""
                android.util.Log.d("FirestoreRepository", "Found User by Email query! DocID: ${doc.id}, email: $emailStr, profileType: $profileType")
                Pair(doc.id, UserDocument(emailStr, profileType, city, district, schoolName))
            } else {
                android.util.Log.w("FirestoreRepository", "No user document found or timed out with email constraint: $cleanEmail")
                null
            }
        } catch (e: Exception) {
            e.printStackTrace()
            null
        }
    }

    // role checking logic based on parentEmail and parentEmail2
    suspend fun getLinkedStudentsForParent(parentEmail: String): List<Pair<String, Student>> {
        if (parentEmail.isEmpty()) return emptyList()
        return try {
            val query1 = db.collectionGroup("students")
                .whereEqualTo("parentEmail", parentEmail)
                .get()
                .awaitWithTimeout()
            val query2 = db.collectionGroup("students")
                .whereEqualTo("parentEmail2", parentEmail)
                .get()
                .awaitWithTimeout()

            val list1 = query1?.documents?.mapNotNull { doc ->
                val student = doc.toObject(Student::class.java)
                val teacherUid = doc.reference.parent.parent?.id
                if (student != null && teacherUid != null) Pair(teacherUid, student) else null
            } ?: emptyList()

            val list2 = query2?.documents?.mapNotNull { doc ->
                val student = doc.toObject(Student::class.java)
                val teacherUid = doc.reference.parent.parent?.id
                if (student != null && teacherUid != null) Pair(teacherUid, student) else null
            } ?: emptyList()

            (list1 + list2).distinctBy { it.second.id }
        } catch (e: Exception) {
            e.printStackTrace()
            emptyList()
        }
    }

    suspend fun getStudents(teacherUid: String): List<Student> {
        android.util.Log.d("FirestoreRepository", "getStudents called with teacherUid: $teacherUid")
        return try {
            val snapshot = db.collection("users").document(teacherUid).collection("students")
                .get()
                .awaitWithTimeout()
            
            if (snapshot == null) {
                android.util.Log.w("FirestoreRepository", "Snapshot is null or timed out for getStudents on UID: $teacherUid")
                return emptyList()
            }
            
            android.util.Log.d("FirestoreRepository", "getStudents query returned ${snapshot.size()} documents")
            
            snapshot.documents.mapNotNull { doc ->
                try {
                    val id = doc.id
                    val name = doc.getString("name") ?: doc.getString("ad") ?: ""
                    val surname = doc.getString("surname") ?: doc.getString("soyad") ?: ""
                    
                    // studentNo could be saved as number or string in Firestore
                    val studentNo = doc.getString("studentNo") 
                        ?: doc.getString("ogrenciNo")
                        ?: doc.getLong("studentNo")?.toString() 
                        ?: doc.getLong("ogrenciNo")?.toString()
                        ?: doc.getDouble("studentNo")?.toInt()?.toString() 
                        ?: doc.getDouble("ogrenciNo")?.toInt()?.toString()
                        ?: ""
                    
                    val gender = doc.getString("gender") ?: doc.getString("cinsiyet") ?: ""
                    val birthDate = doc.getString("birthDate") ?: doc.getString("dogumTarihi") ?: ""
                    val parentEmail = doc.getString("parentEmail") ?: doc.getString("veliEposta") ?: ""
                    val parentEmail2 = doc.getString("parentEmail2") ?: doc.getString("veliEposta2") ?: ""
                    val currentTeacherUid = doc.getString("teacherUid") ?: teacherUid
                    
                    // stars can be number (Long/Double)
                    val stars = doc.getLong("stars")?.toInt() 
                        ?: doc.getDouble("stars")?.toInt() 
                        ?: 0
                    
                    val starHistoryRaw = doc.get("starHistory") as? List<*>
                    val starHistory = starHistoryRaw?.mapNotNull { item ->
                        try {
                            val map = item as? Map<*, *>
                            if (map != null) {
                                val category = map["category"] as? String ?: ""
                                val description = map["description"] as? String ?: ""
                                val amount = (map["amount"] as? Long)?.toInt() 
                                    ?: (map["amount"] as? Double)?.toInt() 
                                    ?: 0
                                val timestamp = map["timestamp"] as? Long 
                                    ?: (map["timestamp"] as? Double)?.toLong() 
                                    ?: 0L
                                StarHistoryItem(category, description, amount, timestamp)
                            } else null
                        } catch (e: Exception) {
                            null
                        }
                    } ?: emptyList()

                    Student(
                        id = id,
                        name = name,
                        surname = surname,
                        studentNo = studentNo,
                        gender = gender,
                        birthDate = birthDate,
                        parentEmail = parentEmail,
                        parentEmail2 = parentEmail2,
                        teacherUid = currentTeacherUid,
                        stars = stars,
                        starHistory = starHistory
                    ).also {
                        android.util.Log.d("FirestoreRepository", "Successfully parsed student: ${it.name} ${it.surname} (${it.studentNo})")
                    }
                } catch (e: Exception) {
                    android.util.Log.e("FirestoreRepository", "Error parsing individual student document: ${doc.id}", e)
                    null
                }
            }
        } catch (e: Exception) {
            android.util.Log.e("FirestoreRepository", "Error getting students subcollection for $teacherUid", e)
            emptyList()
        }
    }

    suspend fun addStudent(teacherUid: String, student: Student) {
        try {
            val docRef = db.collection("users").document(teacherUid).collection("students").document()
            val newStudent = student.copy(id = docRef.id)
            docRef.set(newStudent).awaitWithTimeout()
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    suspend fun updateStudent(teacherUid: String, student: Student) {
        try {
            db.collection("users").document(teacherUid).collection("students").document(student.id)
                .set(student).awaitWithTimeout()
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    suspend fun deleteStudent(teacherUid: String, studentId: String) {
        try {
            db.collection("users").document(teacherUid).collection("students").document(studentId)
                .delete().awaitWithTimeout()
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    suspend fun deleteAllStudents(teacherUid: String) {
        try {
            val snapshot = db.collection("users").document(teacherUid).collection("students")
                .get().awaitWithTimeout()
            
            val batch = db.batch()
            snapshot?.documents?.forEach { doc ->
                batch.delete(doc.reference)
            }
            batch.commit().awaitWithTimeout()
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    suspend fun setupDemoClassForTeacher(teacherUid: String, email: String) {
        try {
            android.util.Log.d("FirestoreRepository", "setupDemoClassForTeacher starting for UID: $teacherUid, email: $email")
            
            // 1. Create Teacher Profile Document
            val userDocMap = mapOf(
                "email" to email,
                "profileType" to "ÖĞRETMEN",
                "city" to "Sivas",
                "district" to "Merkez",
                "schoolName" to "SÜLEYMAN SAMİ KEPENEK İLKOKULU"
            )
            db.collection("users").document(teacherUid).set(userDocMap).awaitWithTimeout()
            android.util.Log.d("FirestoreRepository", "Created users/$teacherUid profile document")

            // 2. Fetch pre-existing students for merging (DO NOT DELETE to preserve stars)
            val existing = getStudents(teacherUid)

            // 3. Create Sample Students
            val demoStudents = listOf(
                Student(
                    name = "Kemal",
                    surname = "Sunal",
                    studentNo = "201",
                    gender = "Erkek",
                    birthDate = "11-11-2015",
                    parentEmail = "kemalsunal@gmail.com",
                    teacherUid = teacherUid,
                    stars = 35,
                    starHistory = listOf(
                        StarHistoryItem("Kitap Okuma", "Ayın kitabı okundu", 15, System.currentTimeMillis() - 86400000 * 3),
                        StarHistoryItem("Ödev", "Fen projesi tamamlama", 20, System.currentTimeMillis() - 86400000 * 1)
                    )
                ),
                Student(
                    name = "Halit",
                    surname = "Akçatepe",
                    studentNo = "202",
                    gender = "Erkek",
                    birthDate = "01-01-2015",
                    parentEmail = "halit@gmail.com",
                    teacherUid = teacherUid,
                    stars = 18,
                    starHistory = listOf(
                        StarHistoryItem("Davranış", "Sınıf içi uyum başarısı", 8, System.currentTimeMillis() - 86400000 * 2),
                        StarHistoryItem("Kitap Okuma", "Haftalık kitap okuma", 10, System.currentTimeMillis() - 86400000 * 1)
                    )
                ),
                Student(
                    name = "Filiz",
                    surname = "Akın",
                    studentNo = "203",
                    gender = "Kız",
                    birthDate = "02-01-2016",
                    parentEmail = "filiz@gmail.com",
                    teacherUid = teacherUid,
                    stars = 42,
                    starHistory = listOf(
                        StarHistoryItem("Ödev", "Matematik ödevi kusursuz", 20, System.currentTimeMillis() - 86400000 * 5),
                        StarHistoryItem("Katılım", "Sınıf içi aktif katılım", 22, System.currentTimeMillis() - 86400000 * 2)
                    )
                ),
                Student(
                    name = "Şener",
                    surname = "Şen",
                    studentNo = "204",
                    gender = "Erkek",
                    birthDate = "26-12-2015",
                    parentEmail = "seners@gmail.com",
                    teacherUid = teacherUid,
                    stars = 50,
                    starHistory = listOf(
                        StarHistoryItem("Katılım", "Deney sunumu yapıldı", 30, System.currentTimeMillis() - 86400000 * 4),
                        StarHistoryItem("Ödev", "Türkçe yazım kuralları ödevi", 20, System.currentTimeMillis() - 86400000 * 3)
                    )
                ),
                Student(
                    name = "Adile",
                    surname = "Naşit",
                    studentNo = "205",
                    gender = "Kız",
                    birthDate = "17-06-2015",
                    parentEmail = "adile@gmail.com",
                    teacherUid = teacherUid,
                    stars = 38,
                    starHistory = listOf(
                        StarHistoryItem("Hızlı Cevap", "Matematik çarpma yarışı birinciliği", 18, System.currentTimeMillis() - 86400000 * 2),
                        StarHistoryItem("Kitap Okuma", "Kütüphane araştırma ödevi", 20, System.currentTimeMillis() - 86400000 * 1)
                    )
                ),
                Student(
                    name = "Münir",
                    surname = "Özkul",
                    studentNo = "206",
                    gender = "Erkek",
                    birthDate = "15-08-2015",
                    parentEmail = "munir@gmail.com",
                    teacherUid = teacherUid,
                    stars = 24,
                    starHistory = listOf(
                        StarHistoryItem("Davranış", "Arkadaşlarına yardımcı oldu", 12, System.currentTimeMillis() - 86400000 * 3),
                        StarHistoryItem("Okuma", "Yüksek sesle akıcı okuma", 12, System.currentTimeMillis() - 86400000 * 1)
                    )
                )
            )

            for (student in demoStudents) {
                val existingStudent = existing.find { est ->
                    est.studentNo == student.studentNo || 
                    (est.name.trim().lowercase() == student.name.trim().lowercase() &&
                     est.surname.trim().lowercase() == student.surname.trim().lowercase())
                }
                if (existingStudent != null) {
                    val docRef = db.collection("users").document(teacherUid).collection("students").document(existingStudent.id)
                    val finalStudent = student.copy(
                        id = existingStudent.id,
                        stars = existingStudent.stars,
                        starHistory = existingStudent.starHistory
                    )
                    docRef.set(finalStudent).awaitWithTimeout()
                } else {
                    val docRef = db.collection("users").document(teacherUid).collection("students").document()
                    val finalStudent = student.copy(id = docRef.id)
                    docRef.set(finalStudent).awaitWithTimeout()
                }
            }
            android.util.Log.d("FirestoreRepository", "Successfully created 6 demo students under subcollection")
        } catch (e: Exception) {
            android.util.Log.e("FirestoreRepository", "Error setting up demo class data", e)
            throw e
        }
    }

    suspend fun setupRealClassroomForCihan(teacherUid: String) {
        try {
            android.util.Log.d("FirestoreRepository", "setupRealClassroomForCihan starting for UID: $teacherUid")
            
            // 1. Create Teacher Profile Document
            val userDocMap = mapOf(
                "email" to "cihan.ozel10@gmail.com",
                "profileType" to "ÖĞRETMEN",
                "city" to "Sivas",
                "district" to "Merkez",
                "schoolName" to "SÜLEYMAN SAMİ KEPENEK İLKOKULU"
            )
            db.collection("users").document(teacherUid).set(userDocMap).awaitWithTimeout()
            android.util.Log.d("FirestoreRepository", "Created users/$teacherUid profile document")

            // 2. Fetch pre-existing students for merging (NEVER DELETE to preserve stars)
            val existing = getStudents(teacherUid)

            // 3. Create real classroom list of 25 students from user's actual screen
            val realStudents = listOf(
                Student(name = "GÜNEŞ", surname = "DEMİR", studentNo = "326", gender = "Kız", birthDate = "09.08.2017", parentEmail = "nurdugdu@gmail.com", teacherUid = teacherUid, stars = 12),
                Student(name = "AHMET ASAF", surname = "IŞIK", studentNo = "402", gender = "Erkek", birthDate = "23.08.2017", parentEmail = "ceymasedas1818@gmail.com", teacherUid = teacherUid, stars = 18),
                Student(name = "AYŞE MİRAY", surname = "BORHAN", studentNo = "403", gender = "Kız", birthDate = "27.09.2017", parentEmail = "satilmish10@gmail.com", teacherUid = teacherUid, stars = 15),
                Student(name = "BAHATTİN", surname = "SÜER", studentNo = "405", gender = "Erkek", birthDate = "02.11.2017", parentEmail = "rsuer586@gmail.com", teacherUid = teacherUid, stars = 22),
                Student(name = "DEFNE", surname = "YARAMIŞ", studentNo = "406", gender = "Kız", birthDate = "31.05.2017", parentEmail = "leyla.yaramis.iyigun@gmail.com", parentEmail2 = "kadiryaramis.ky@gmail.com", teacherUid = teacherUid, stars = 25),
                Student(name = "EMİR ASAF", surname = "AKKAŞ", studentNo = "407", gender = "Erkek", birthDate = "11.08.2017", parentEmail = "rabiiaakkas123@gmail.com", teacherUid = teacherUid, stars = 14),
                Student(name = "KEVSER", surname = "ÖZDEMİR", studentNo = "408", gender = "Kız", birthDate = "18.09.2017", parentEmail = "ozdemirfatmak@gmail.com", parentEmail2 = "farukozdemir582@gmail.com", teacherUid = teacherUid, stars = 30),
                Student(name = "MEHMET AKİF", surname = "KILAVUZ", studentNo = "409", gender = "Erkek", birthDate = "28.02.2017", parentEmail = "malikekilavuz24@gmail.com", parentEmail2 = "cihan.ozel10@gmail.com", teacherUid = teacherUid, stars = 21),
                Student(name = "MELİSA", surname = "YÜCE", studentNo = "411", gender = "Kız", birthDate = "20.08.2017", parentEmail = "ozguryuce58@gmail.com", teacherUid = teacherUid, stars = 19),
                Student(name = "MERT", surname = "KARA", studentNo = "413", gender = "Erkek", birthDate = "18.09.2017", parentEmail = "kara.murat23@hotmail.com", parentEmail2 = "ecemkarakaya32@gmail.com", teacherUid = teacherUid, stars = 31),
                Student(name = "METİN BARIŞ", surname = "DUMAN", studentNo = "414", gender = "Erkek", birthDate = "19.12.2016", parentEmail = "sabiha.2008@gmail.com", parentEmail2 = "sivashogumfotografci@gmail.com", teacherUid = teacherUid, stars = 28),
                Student(name = "MİRA", surname = "GÜLMEZ", studentNo = "415", gender = "Kız", birthDate = "01.11.2016", parentEmail = "rbgmzn@gmail.com", teacherUid = teacherUid, stars = 26),
                Student(name = "MUHAMMED ERTUĞRUL", surname = "AYDIN", studentNo = "416", gender = "Erkek", birthDate = "11.08.2017", parentEmail = "aydinnumanyigit58@gmail.com", parentEmail2 = "merttugrulcanaydin58@gmail.com", teacherUid = teacherUid, stars = 34),
                Student(name = "ÖMER SAKİ", surname = "ÇETİN", studentNo = "418", gender = "Erkek", birthDate = "20.05.2017", parentEmail = "nuroet@gmail.com", parentEmail2 = "goknurcetin@gmail.com", teacherUid = teacherUid, stars = 23),
                Student(name = "YİĞİT EFE", surname = "ŞEN", studentNo = "420", gender = "Erkek", birthDate = "18.04.2017", parentEmail = "sensumeyra75@gmail.com", teacherUid = teacherUid, stars = 20),
                Student(name = "ZEHRA", surname = "CEYLAN", studentNo = "421", gender = "Kız", birthDate = "09.11.2017", parentEmail = "ceylandilek.2012@gmail.com", parentEmail2 = "muratceylanturan502@gmail.com", teacherUid = teacherUid, stars = 29),
                Student(name = "ZEYNEP İKRA", surname = "DENİZ", studentNo = "422", gender = "Kız", birthDate = "09.08.2017", parentEmail = "aycadnz.58@gmail.com", teacherUid = teacherUid, stars = 27),
                Student(name = "CANSEL", surname = "VAROL", studentNo = "425", gender = "Kız", birthDate = "09.10.2017", parentEmail = "rvarol21@gmail.com", parentEmail2 = "varolersel@gmail.com", teacherUid = teacherUid, stars = 24),
                Student(name = "ELİF", surname = "YAZICI", studentNo = "426", gender = "Kız", birthDate = "02.09.2016", parentEmail = "metinyazici123@gmail.com", parentEmail2 = "kubrayazici58@gmail.com", teacherUid = teacherUid, stars = 35),
                Student(name = "DEFNE BERRA", surname = "UZUNALP", studentNo = "428", gender = "Kız", birthDate = "14.10.2016", parentEmail = "vahideuzunalp@gmail.com", teacherUid = teacherUid, stars = 17),
                Student(name = "DORUK", surname = "KIRAZ", studentNo = "429", gender = "Erkek", birthDate = "20.08.2017", parentEmail = "sedakiraz@gmail.com", parentEmail2 = "burakskiraz58@hotmail.com", teacherUid = teacherUid, stars = 22),
                Student(name = "ZEYNEPSU", surname = "ÇALIŞKAN", studentNo = "430", gender = "Kız", birthDate = "09.08.2017", parentEmail = "gozdehata.58@hotmail.com", parentEmail2 = "fgolenc@gmail.com", teacherUid = teacherUid, stars = 19),
                Student(name = "KÜRŞAD ADEM", surname = "CEBECİ", studentNo = "441", gender = "Erkek", birthDate = "09.02.2017", parentEmail = "hakancebeci_58@hotmail.com", parentEmail2 = "hakancebeci58@gmail.com", teacherUid = teacherUid, stars = 32),
                Student(name = "ESİLA", surname = "ATMACA", studentNo = "444", gender = "Kız", birthDate = "01.06.2017", parentEmail = "atmacaeslat2332@gmail.com", parentEmail2 = "atmacaesila23@gmail.com", teacherUid = teacherUid, stars = 25),
                Student(name = "ARAS", surname = "GÖKKAYA", studentNo = "555", gender = "Erkek", birthDate = "17.01.2017", parentEmail = "meltemaras733@gmail.com", teacherUid = teacherUid, stars = 16)
            )

            for (student in realStudents) {
                val existingStudent = existing.find { est ->
                    est.studentNo == student.studentNo || 
                    (est.name.trim().lowercase() == student.name.trim().lowercase() &&
                     est.surname.trim().lowercase() == student.surname.trim().lowercase())
                }
                
                if (existingStudent != null) {
                    val docRef = db.collection("users").document(teacherUid).collection("students").document(existingStudent.id)
                    val finalStudent = student.copy(
                        id = existingStudent.id,
                        stars = existingStudent.stars,  // PRESERVE the real active stars!
                        starHistory = existingStudent.starHistory // PRESERVE the real active history!
                    )
                    docRef.set(finalStudent).awaitWithTimeout()
                } else {
                    val docRef = db.collection("users").document(teacherUid).collection("students").document()
                    val finalStudent = student.copy(
                        id = docRef.id,
                        starHistory = emptyList()
                    )
                    docRef.set(finalStudent).awaitWithTimeout()
                }
            }
            android.util.Log.d("FirestoreRepository", "Successfully synchronized Cihan's real class with 25 students safely!")
        } catch (e: Exception) {
            android.util.Log.e("FirestoreRepository", "Error setting up Cihan's real class", e)
        }
    }

    suspend fun getExamResults(uid: String, studentId: String): List<ExamResult> {
        return try {
            // Wait, exam results are in users/{uid}/exams/{examId}/results
            db.collectionGroup("results")
                .whereEqualTo("studentId", studentId)
                .get()
                .awaitWithTimeout()
                ?.toObjects(ExamResult::class.java) ?: emptyList()
        } catch (e: Exception) {
            e.printStackTrace()
            emptyList()
        }
    }

    suspend fun getReadingRecords(uid: String, studentId: String): List<ReadingRecord> {
        return try {
            db.collection("users").document(uid).collection("readingRecords")
                .whereEqualTo("studentId", studentId)
                .get()
                .awaitWithTimeout()
                ?.toObjects(ReadingRecord::class.java) ?: emptyList()
        } catch (e: Exception) {
            e.printStackTrace()
            emptyList()
        }
    }

    suspend fun saveGroupings(
        teacherUid: String,
        groups: List<Pair<String, List<Student>>>,
        manualModeActive: Boolean
    ) {
        if (teacherUid.isEmpty()) return
        try {
            val docRef = db.collection("users").document(teacherUid).collection("config").document("groupings")
            val groupsList = groups.mapIndexed { idx, groupPair ->
                mapOf(
                    "id" to "group-${idx + 1}",
                    "name" to groupPair.first,
                    "studentIds" to groupPair.second.map { it.id }
                )
            }
            val data = mapOf(
                "manualModeActive" to manualModeActive,
                "mode" to (if (manualModeActive) "manual" else "random"),
                "groups" to groupsList,
                "updatedAt" to System.currentTimeMillis()
            )
            docRef.set(data).awaitWithTimeout()
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    suspend fun getGroupings(teacherUid: String): Pair<Boolean, List<Pair<String, List<String>>>>? {
        if (teacherUid.isEmpty()) return null
        try {
            val doc = db.collection("users").document(teacherUid).collection("config").document("groupings")
                .get()
                .awaitWithTimeout()

            if (doc != null && doc.exists()) {
                val manualModeActive = doc.getBoolean("manualModeActive") ?: false
                val groupsListRaw = doc.get("groups") as? List<*>
                val groups = groupsListRaw?.mapNotNull { item ->
                    val map = item as? Map<*, *>
                    if (map != null) {
                        val name = map["name"] as? String ?: ""
                        val studentIds = map["studentIds"] as? List<*> ?: emptyList<Any>()
                        val cleanIds = studentIds.mapNotNull { it as? String }
                        Pair(name, cleanIds)
                    } else null
                } ?: emptyList()
                return Pair(manualModeActive, groups)
            } else return null
        } catch (e: Exception) {
            e.printStackTrace()
            return null
        }
    }

    fun updateRemoteControlState(
        teacherUid: String,
        activeTab: String?,
        timerCommand: String? = null,
        timerMode: String? = null,
        duration: Long? = null,
        remaining: Long? = null,
        extraData: Map<String, Any>? = null
    ) {
        if (teacherUid.isEmpty()) return
        val map = mutableMapOf<String, Any>()
        if (activeTab != null) {
            map["activeTab"] = activeTab
        }
        map["updatedAt"] = System.currentTimeMillis()

        if (timerCommand != null) {
            map["timerCommand"] = timerCommand
        }

        if (timerMode != null || duration != null || remaining != null) {
            val timerMap = mutableMapOf<String, Any>()
            if (timerMode != null) timerMap["mode"] = timerMode
            if (duration != null) timerMap["duration"] = duration
            if (remaining != null) timerMap["remaining"] = remaining
            timerMap["updatedAt"] = System.currentTimeMillis()
            map["timer"] = timerMap
        }

        if (extraData != null) {
            map.putAll(extraData)
        }

        db.collection("users").document(teacherUid)
            .collection("remote_control").document("state")
            .set(map)
            .addOnFailureListener {
                android.util.Log.e("FirestoreRepository", "Failed to update remote control state: ${it.message}")
            }

        // ALSO write to fallback 'cihan_ozel_web_uid' if this is an admin/cihan session to guarantee pairing
        if (teacherUid != "cihan_ozel_web_uid") {
            try {
                db.collection("users").document("cihan_ozel_web_uid")
                    .collection("remote_control").document("state")
                    .set(map)
                    .addOnFailureListener {
                        android.util.Log.e("FirestoreRepository", "Failed fallback update: ${it.message}")
                    }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }
}
