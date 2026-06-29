package com.example.ui.dashboard.tabs

import android.content.Context
import android.net.Uri
import android.os.Environment
import android.widget.Toast
import com.example.data.Student
import jxl.Workbook
import jxl.write.Label
import jxl.write.WritableWorkbook
import java.io.File
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.UUID

object ExcelExportUtils {
    
    private val HEADERS = arrayOf("No", "Ad", "Soyad", "Cinsiyet", "Doğum Tarihi", "Veli E-posta", "Veli E-posta 2")

    fun exportClassListTemplate(context: Context) {
        try {
            val fileName = "Sinif_Listesi_Sablonu.xls"
            val downloadsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
            if (!downloadsDir.exists()) {
                downloadsDir.mkdirs()
            }
            val file = File(downloadsDir, fileName)
            
            val workbook: WritableWorkbook = Workbook.createWorkbook(file)
            val sheet = workbook.createSheet("Sınıf Listesi", 0)
            
            for (i in HEADERS.indices) {
                sheet.addCell(Label(i, 0, HEADERS[i]))
            }
            
            // Example row
            sheet.addCell(Label(0, 1, "1"))
            sheet.addCell(Label(1, 1, "Ahmet"))
            sheet.addCell(Label(2, 1, "Yılmaz"))
            sheet.addCell(Label(3, 1, "Erkek"))
            sheet.addCell(Label(4, 1, "01.01.2015"))
            sheet.addCell(Label(5, 1, "veli1@gmail.com"))
            sheet.addCell(Label(6, 1, "veli2@gmail.com"))
            
            workbook.write()
            workbook.close()
            
            Toast.makeText(context, "Şablon İndirilenler klasörüne kaydedildi.", Toast.LENGTH_LONG).show()
        } catch (e: Exception) {
            e.printStackTrace()
            Toast.makeText(context, "Şablon oluşturulurken hata oluştu", Toast.LENGTH_SHORT).show()
        }
    }

    fun exportClassList(context: Context, students: List<Student>) {
        try {
            val dateFormat = SimpleDateFormat("yyyyMMdd_HHmmss", Locale.getDefault())
            val fileName = "Sinif_Listesi_${dateFormat.format(Date())}.xls"
            val downloadsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
            if (!downloadsDir.exists()) {
                downloadsDir.mkdirs()
            }
            val file = File(downloadsDir, fileName)
            
            val workbook: WritableWorkbook = Workbook.createWorkbook(file)
            val sheet = workbook.createSheet("Sınıf Listesi", 0)
            
            for (i in HEADERS.indices) {
                sheet.addCell(Label(i, 0, HEADERS[i]))
            }
            
            val sortedStudents = students.sortedBy { it.studentNo.toIntOrNull() ?: Int.MAX_VALUE }
            for (i in sortedStudents.indices) {
                val student = sortedStudents[i]
                val row = i + 1
                sheet.addCell(Label(0, row, student.studentNo))
                sheet.addCell(Label(1, row, student.name))
                sheet.addCell(Label(2, row, student.surname))
                sheet.addCell(Label(3, row, student.gender))
                sheet.addCell(Label(4, row, student.birthDate))
                sheet.addCell(Label(5, row, student.parentEmail))
                sheet.addCell(Label(6, row, student.parentEmail2))
            }
            
            workbook.write()
            workbook.close()
            
            Toast.makeText(context, "Sınıf listesi İndirilenler klasörüne kaydedildi.", Toast.LENGTH_LONG).show()
        } catch (e: Exception) {
            e.printStackTrace()
            Toast.makeText(context, "Liste indirilirken hata oluştu", Toast.LENGTH_SHORT).show()
        }
    }

    fun importClassListFromExcel(context: Context, uri: Uri): List<Student> {
        val students = mutableListOf<Student>()
        try {
            context.contentResolver.openInputStream(uri)?.use { inputStream ->
                val workbook = Workbook.getWorkbook(inputStream)
                val sheet = workbook.getSheet(0)
                
                val rows = sheet.rows
                for (i in 1 until rows) { // Skip header row
                    val cells = sheet.getRow(i)
                    if (cells.isEmpty()) continue
                    
                    val studentNo = if (cells.size > 0) cells[0].contents.trim() else ""
                    val name = if (cells.size > 1) cells[1].contents.trim() else ""
                    val surname = if (cells.size > 2) cells[2].contents.trim() else ""
                    val gender = if (cells.size > 3) cells[3].contents.trim() else ""
                    
                    var birthDate = ""
                    if (cells.size > 4) {
                        val cell = cells[4]
                        if (cell.type == jxl.CellType.DATE) {
                            val dateCell = cell as jxl.DateCell
                            birthDate = SimpleDateFormat("dd.MM.yyyy", Locale.getDefault()).format(dateCell.date)
                        } else {
                            // If it's a string, try to reformat if it matches yyyy-MM-dd
                            val content = cell.contents.trim()
                            if (content.matches(Regex("\\d{4}-\\d{2}-\\d{2}"))) {
                                try {
                                    val date = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).parse(content)
                                    if (date != null) {
                                        birthDate = SimpleDateFormat("dd.MM.yyyy", Locale.getDefault()).format(date)
                                    } else {
                                        birthDate = content
                                    }
                                } catch (e: Exception) {
                                    birthDate = content
                                }
                            } else {
                                birthDate = content
                            }
                        }
                    }
                    
                    val parentEmail = if (cells.size > 5) cells[5].contents.trim() else ""
                    val parentEmail2 = if (cells.size > 6) cells[6].contents.trim() else ""

                    if (name.isNotEmpty() || surname.isNotEmpty()) {
                        students.add(
                            Student(
                                id = UUID.randomUUID().toString(),
                                studentNo = studentNo,
                                name = name,
                                surname = surname,
                                gender = gender,
                                birthDate = birthDate,
                                parentEmail = parentEmail,
                                parentEmail2 = parentEmail2
                            )
                        )
                    }
                }
                workbook.close()
            }
        } catch (e: Exception) {
            e.printStackTrace()
            Toast.makeText(context, "Excel dosyası okunamadı. Lütfen .xls formatında olduğundan emin olun.", Toast.LENGTH_LONG).show()
        }
        return students
    }
}
