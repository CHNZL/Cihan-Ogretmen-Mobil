package com.example.data

import com.google.firebase.firestore.DocumentId

data class StarHistoryItem(
    val category: String = "",
    val description: String = "",
    val amount: Int = 0,
    val timestamp: Long = 0L
)

data class Student(
    @DocumentId val id: String = "",
    val name: String = "",
    val surname: String = "",
    val studentNo: String = "",
    val gender: String = "",
    val birthDate: String = "",
    val parentEmail: String = "",
    val parentEmail2: String = "",
    val teacherUid: String = "",
    val stars: Int = 0,
    val starHistory: List<StarHistoryItem> = emptyList()
)

data class ExamResult(
    @DocumentId val id: String = "",
    val date: Long = 0L,
    val examName: String = "",
    val score: Double = 0.0,
    val missingOutcomes: List<String> = emptyList()
)

data class ReadingRecord(
    @DocumentId val id: String = "",
    val point: Int = 0,
    val bookName: String = ""
)

data class ChildInfo(
    val studentId: String = "",
    val studentNo: String = "",
    val studentName: String = "",
    val school: String = "",
    val grade: String = "",
    val section: String = "",
    val teacherUid: String = ""
)

data class UserDocument(
    val email: String = "",
    val profileType: String = "",
    val city: String = "",
    val district: String = "",
    val schoolName: String = "",
    val gradeLevel: String = "",
    val section: String = "",
    val isProfileComplete: Boolean = false,
    val children: List<ChildInfo> = emptyList()
)

data class SeatingConfig(
    val groupCount: Int = 3,
    val peoplePerRow: Int = 2,
    val rowsPerGroup: List<Int> = listOf(5, 5, 5)
)

data class SeatingPlanData(
    val plan: Map<String, String> = emptyMap()
)
