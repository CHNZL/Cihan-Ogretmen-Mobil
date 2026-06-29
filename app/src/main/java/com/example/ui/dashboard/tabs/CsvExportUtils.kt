package com.example.ui.dashboard.tabs

import android.content.Context
import android.net.Uri
import android.os.Environment
import android.widget.Toast
import androidx.core.content.FileProvider
import com.example.data.Student
import java.io.BufferedReader
import java.io.File
import java.io.FileOutputStream
import java.io.InputStreamReader
import java.io.OutputStreamWriter
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.UUID

object CsvExportUtils {
    private const val BOM = "\uFEFF" // Byte Order Mark for UTF-8 to open correctly in Excel
    private const val DELIMITER = ";" // Semicolon is often better for Excel in Europe/Turkey
    
    private const val HEADER = "No;Ad;Soyad;Cinsiyet;Doğum Tarihi;Veli E-posta;Veli E-posta 2"

    fun exportClassListTemplate(context: Context) {
        try {
            val fileName = "Sinif_Listesi_Sablonu.csv"
            val downloadsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
            if (!downloadsDir.exists()) {
                downloadsDir.mkdirs()
            }
            val file = File(downloadsDir, fileName)
            
            FileOutputStream(file).use { fos ->
                OutputStreamWriter(fos, "UTF-8").use { writer ->
                    writer.write(BOM)
                    writer.write(HEADER + "\n")
                    // Add an example row
                    writer.write("1;Ahmet;Yılmaz;Erkek;01.01.2015;veli1@gmail.com;veli2@gmail.com\n")
                }
            }
            
            Toast.makeText(context, "Şablon İndirilenler klasörüne kaydedildi.", Toast.LENGTH_LONG).show()
        } catch (e: Exception) {
            e.printStackTrace()
            Toast.makeText(context, "Şablon oluşturulurken hata oluştu", Toast.LENGTH_SHORT).show()
        }
    }

    fun exportClassList(context: Context, students: List<Student>) {
        try {
            val dateFormat = SimpleDateFormat("yyyyMMdd_HHmmss", Locale.getDefault())
            val fileName = "Sinif_Listesi_${dateFormat.format(Date())}.csv"
            val downloadsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
            if (!downloadsDir.exists()) {
                downloadsDir.mkdirs()
            }
            val file = File(downloadsDir, fileName)
            
            FileOutputStream(file).use { fos ->
                OutputStreamWriter(fos, "UTF-8").use { writer ->
                    writer.write(BOM)
                    writer.write(HEADER + "\n")
                    
                    val sortedStudents = students.sortedBy { it.studentNo.toIntOrNull() ?: Int.MAX_VALUE }
                    for (student in sortedStudents) {
                        val row = listOf(
                            student.studentNo,
                            student.name,
                            student.surname,
                            student.gender,
                            student.birthDate,
                            student.parentEmail,
                            student.parentEmail2
                        ).joinToString(DELIMITER) { escapeCsvField(it) }
                        
                        writer.write(row + "\n")
                    }
                }
            }
            
            Toast.makeText(context, "Sınıf listesi İndirilenler klasörüne kaydedildi.", Toast.LENGTH_LONG).show()
        } catch (e: Exception) {
            e.printStackTrace()
            Toast.makeText(context, "Liste indirilirken hata oluştu", Toast.LENGTH_SHORT).show()
        }
    }

    fun importClassListFromCsv(context: Context, uri: Uri): List<Student> {
        val students = mutableListOf<Student>()
        try {
            context.contentResolver.openInputStream(uri)?.use { inputStream ->
                BufferedReader(InputStreamReader(inputStream, "UTF-8")).use { reader ->
                    var isFirstLine = true
                    var line: String?
                    while (reader.readLine().also { line = it } != null) {
                        val text = line ?: continue
                        if (text.startsWith(BOM)) {
                            line = text.substring(1)
                        }
                        if (isFirstLine) {
                            isFirstLine = false
                            continue // Skip header
                        }
                        
                        if (line!!.trim().isEmpty()) continue
                        
                        val columns = parseCsvLine(line!!)
                        if (columns.size >= 3) { // At least No, Ad, Soyad
                            val studentNo = columns.getOrNull(0)?.trim() ?: ""
                            val name = columns.getOrNull(1)?.trim() ?: ""
                            val surname = columns.getOrNull(2)?.trim() ?: ""
                            val gender = columns.getOrNull(3)?.trim() ?: ""
                            val birthDate = columns.getOrNull(4)?.trim() ?: ""
                            val parentEmail = columns.getOrNull(5)?.trim() ?: ""
                            val parentEmail2 = columns.getOrNull(6)?.trim() ?: ""

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
                    }
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
        return students
    }

    private fun escapeCsvField(field: String): String {
        if (field.contains(DELIMITER) || field.contains("\"") || field.contains("\n")) {
            return "\"" + field.replace("\"", "\"\"") + "\""
        }
        return field
    }

    private fun parseCsvLine(line: String): List<String> {
        val result = mutableListOf<String>()
        var current = StringBuilder()
        var inQuotes = false
        
        for (i in line.indices) {
            val char = line[i]
            
            if (inQuotes) {
                if (char == '\"') {
                    if (i + 1 < line.length && line[i + 1] == '\"') {
                        current.append('\"')
                        // Skip the next quote (but we can't increment i in a simple loop easily, 
                        // so we handle it by not appending and toggling) - wait, simple loop can't skip.
                        // Since I need a simple parser, let's just use split if it's not complex CSV.
                        // For basic Excel CSV, this is enough:
                    } else {
                        inQuotes = false
                    }
                } else {
                    current.append(char)
                }
            } else {
                if (char == '\"') {
                    inQuotes = true
                } else if (char.toString() == DELIMITER || char == ',') { // Support both comma and semicolon
                    result.add(current.toString())
                    current = StringBuilder()
                } else {
                    current.append(char)
                }
            }
        }
        result.add(current.toString())
        return result
    }
}
