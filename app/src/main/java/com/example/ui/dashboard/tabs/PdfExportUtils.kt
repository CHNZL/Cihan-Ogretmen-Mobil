package com.example.ui.dashboard.tabs

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color as AndroidColor
import android.graphics.Paint
import android.graphics.Typeface
import android.graphics.pdf.PdfDocument
import android.net.Uri
import com.example.data.Student

fun exportScheduleToPdf(
    context: Context,
    uri: Uri,
    scheduleConfig: ScheduleConfig,
    scheduleData: ScheduleData,
    subjects: List<Subject>
) {
    val pdfDocument = PdfDocument()
    // A4 Portrait = 595 x 842. Landscape = 842 x 595.
    val pageInfo = PdfDocument.PageInfo.Builder(842, 595, 1).create()
    val page = pdfDocument.startPage(pageInfo)
    val canvas = page.canvas

    val paint = Paint().apply {
        isAntiAlias = true
    }

    // White Background
    paint.color = AndroidColor.WHITE
    canvas.drawRect(0f, 0f, 842f, 595f, paint)

    // Title
    paint.color = AndroidColor.BLACK
    paint.textSize = 24f
    paint.typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
    val title = "Haftalık Ders Programı"
    paint.textAlign = Paint.Align.CENTER
    canvas.drawText(title, 842f / 2f, 50f, paint)

    // Columns
    val cols = listOf("Saat") + scheduleConfig.days
    val colWidth = (842f - 40f) / cols.size
    var y = 100f
    val rowHeight = 30f

    paint.textSize = 12f
    paint.textAlign = Paint.Align.CENTER

    // Header Row
    var x = 20f
    paint.typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
    for (col in cols) {
        paint.color = AndroidColor.parseColor("#E0E0E0")
        canvas.drawRect(x, y - 20f, x + colWidth, y + 10f, paint)
        paint.color = AndroidColor.BLACK
        paint.style = Paint.Style.STROKE
        canvas.drawRect(x, y - 20f, x + colWidth, y + 10f, paint)
        paint.style = Paint.Style.FILL
        canvas.drawText(col, x + colWidth / 2f, y, paint)
        x += colWidth
    }
    y += rowHeight

    // Data Rows
    paint.typeface = Typeface.create(Typeface.DEFAULT, Typeface.NORMAL)
    val timeSlots = generateTimeSlots(scheduleConfig)

    for (slot in timeSlots) {
        x = 20f
        val timeLabel = "${slot.start} - ${slot.end}"

        // Time Cell
        paint.color = AndroidColor.WHITE
        canvas.drawRect(x, y - 20f, x + colWidth, y + 10f, paint)
        paint.color = AndroidColor.BLACK
        paint.style = Paint.Style.STROKE
        canvas.drawRect(x, y - 20f, x + colWidth, y + 10f, paint)
        paint.style = Paint.Style.FILL
        canvas.drawText(timeLabel, x + colWidth / 2f, y, paint)
        x += colWidth

        if (slot.type == TimeSlotType.Lesson) {
            for (day in scheduleConfig.days) {
                val slotKey = getWebSlotKey(day, slot.number)
                val subjectIdInSlot = scheduleData.slots[slotKey]
                val matchingSubject = subjects.find { it.id == subjectIdInSlot || it.name == subjectIdInSlot }
                val displaySubjectName = matchingSubject?.name ?: subjectIdInSlot ?: ""

                paint.color = AndroidColor.WHITE
                canvas.drawRect(x, y - 20f, x + colWidth, y + 10f, paint)
                paint.color = AndroidColor.BLACK
                paint.style = Paint.Style.STROKE
                canvas.drawRect(x, y - 20f, x + colWidth, y + 10f, paint)
                paint.style = Paint.Style.FILL
                canvas.drawText(displaySubjectName, x + colWidth / 2f, y, paint)
                x += colWidth
            }
        } else {
            // Recess / Lunch
            val rowWidth = colWidth * scheduleConfig.days.size
            paint.color = AndroidColor.parseColor("#F5F5F5")
            canvas.drawRect(x, y - 20f, x + rowWidth, y + 10f, paint)
            paint.color = AndroidColor.BLACK
            paint.style = Paint.Style.STROKE
            canvas.drawRect(x, y - 20f, x + rowWidth, y + 10f, paint)
            paint.style = Paint.Style.FILL

            paint.typeface = Typeface.create(Typeface.DEFAULT, Typeface.ITALIC)
            val label = if (slot.type == TimeSlotType.Lunch) "ÖĞLE ARASI" else "TENEFFÜS"
            canvas.drawText(label, x + rowWidth / 2f, y, paint)
            paint.typeface = Typeface.create(Typeface.DEFAULT, Typeface.NORMAL)
        }
        y += rowHeight
    }

    pdfDocument.finishPage(page)

    try {
        context.contentResolver.openOutputStream(uri)?.use { stream ->
            pdfDocument.writeTo(stream)
        }
    } catch (e: Exception) {
        e.printStackTrace()
    }
    pdfDocument.close()
}

fun exportGroupsToPdf(
    context: Context,
    uri: Uri,
    groups: List<Pair<String, List<Student>>>
) {
    val pdfDocument = PdfDocument()
    // A4 Portrait is 595 x 842
    val pageInfo = PdfDocument.PageInfo.Builder(595, 842, 1).create()
    var page = pdfDocument.startPage(pageInfo)
    var canvas = page.canvas

    val paint = Paint().apply {
        isAntiAlias = true
    }

    fun startNewPage() {
        pdfDocument.finishPage(page)
        val newPageInfo = PdfDocument.PageInfo.Builder(595, 842, 1).create()
        page = pdfDocument.startPage(newPageInfo)
        canvas = page.canvas
        
        // Draw White Background
        paint.color = AndroidColor.WHITE
        paint.style = Paint.Style.FILL
        canvas.drawRect(0f, 0f, 595f, 842f, paint)

        // Draw top cyan band
        paint.color = AndroidColor.parseColor("#14B8A6")
        canvas.drawRect(0f, 0f, 595f, 15f, paint)
    }

    // White Background
    paint.color = AndroidColor.WHITE
    canvas.drawRect(0f, 0f, 595f, 842f, paint)

    // Header Background Accent (Top Header Band)
    paint.color = AndroidColor.parseColor("#14B8A6") // Turquoise accent
    canvas.drawRect(0f, 0f, 595f, 15f, paint)

    // Title
    paint.color = AndroidColor.parseColor("#0F172A") // slate-900
    paint.textSize = 22f
    paint.typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
    paint.textAlign = Paint.Align.CENTER
    val title = "SINIF GRUP LİSTESİ"
    canvas.drawText(title, 595f / 2f, 55f, paint)

    // Subtitle / Date
    paint.color = AndroidColor.parseColor("#475569") // slate-600
    paint.textSize = 10f
    paint.typeface = Typeface.create(Typeface.DEFAULT, Typeface.NORMAL)
    val sdf = java.text.SimpleDateFormat("dd.MM.yyyy", java.util.Locale.getDefault())
    val dateStr = "Oluşturulma Tarihi: " + sdf.format(java.util.Date())
    canvas.drawText(dateStr, 595f / 2f, 75f, paint)

    // Separator Line
    paint.color = AndroidColor.parseColor("#E2E8F0") // slate-200
    paint.style = Paint.Style.STROKE
    paint.strokeWidth = 1f
    canvas.drawLine(40f, 95f, 555f, 95f, paint)

    paint.style = Paint.Style.FILL // reset

    // Grid layout configuration
    val colWidth = 247f
    val spacingX = 21f
    val startX = 40f
    val startY = 120f
    val rowHeight = 22f

    // We keep track of the bottom Y for each of the two columns of the current page.
    var yCol1 = startY
    var yCol2 = startY

    for (index in groups.indices) {
        val group = groups[index]
        val groupName = group.first
        val studentList = group.second

        // Calculate card height dynamically
        val cardHeight = 35f + (studentList.size * rowHeight).coerceAtLeast(rowHeight) + 15f

        // Decide which column has more space / less depth
        val putInCol1 = yCol1 <= yCol2
        var chosenX = if (putInCol1) startX else startX + colWidth + spacingX
        var chosenY = if (putInCol1) yCol1 else yCol2

        // If it exceeds the printable height (e.g., 780f), start a new page
        if (chosenY + cardHeight > 780f) {
            startNewPage()
            yCol1 = 40f // start higher on subsequent pages since we have no header title
            yCol2 = 40f
            
            val putInCol1New = yCol1 <= yCol2
            chosenX = if (putInCol1New) startX else startX + colWidth + spacingX
            chosenY = if (putInCol1New) yCol1 else yCol2
        }

        // Draw Group Card Background (light grey border or solid light tint background)
        paint.style = Paint.Style.FILL
        paint.color = AndroidColor.parseColor("#F8FAFC") // slate-50
        canvas.drawRoundRect(chosenX, chosenY, chosenX + colWidth, chosenY + cardHeight, 10f, 10f, paint)

        paint.color = AndroidColor.parseColor("#E2E8F0") // slate-200
        paint.style = Paint.Style.STROKE
        paint.strokeWidth = 1f
        canvas.drawRoundRect(chosenX, chosenY, chosenX + colWidth, chosenY + cardHeight, 10f, 10f, paint)

        // Draw Card Top Header Band
        paint.style = Paint.Style.FILL
        paint.color = AndroidColor.parseColor("#0F172A") // slate-900 group title text color
        paint.textSize = 11f
        paint.typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
        paint.textAlign = Paint.Align.LEFT
        canvas.drawText(groupName.uppercase(), chosenX + 12f, chosenY + 23f, paint)

        // Count badge
        paint.color = AndroidColor.parseColor("#64748B") // slate-500
        paint.textSize = 8.5f
        paint.typeface = Typeface.create(Typeface.DEFAULT, Typeface.NORMAL)
        paint.textAlign = Paint.Align.RIGHT
        canvas.drawText("${studentList.size} ÖĞRENCİ", chosenX + colWidth - 12f, chosenY + 23f, paint)

        // Divider
        paint.color = AndroidColor.parseColor("#E2E8F0")
        paint.style = Paint.Style.STROKE
        canvas.drawLine(chosenX + 12f, chosenY + 32f, chosenX + colWidth - 12f, chosenY + 32f, paint)

        // Draw Students
        paint.style = Paint.Style.FILL
        var itemY = chosenY + 52f
        for (student in studentList) {
            // Draw small index or number badge
            val isGirl = student.gender.equals("Kız", ignoreCase = true)
            val badgeColor = if (isGirl) "#FCE7F3" else "#E0F2FE" // light pink vs light blue
            val badgeTextColor = if (isGirl) "#DB2777" else "#0369A1" // dark pink vs dark blue

            paint.color = AndroidColor.parseColor(badgeColor)
            canvas.drawRoundRect(chosenX + 12f, itemY - 11f, chosenX + 42f, itemY + 5f, 4f, 4f, paint)

            paint.color = AndroidColor.parseColor(badgeTextColor)
            paint.textSize = 8.5f
            paint.typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
            paint.textAlign = Paint.Align.CENTER
            val no = student.studentNo.ifEmpty { "00" }
            canvas.drawText(no, chosenX + 27f, itemY + 2f, paint)

            // Draw Student Name
            paint.color = AndroidColor.parseColor("#1E293B") // slate-800
            paint.textSize = 9.5f
            paint.typeface = Typeface.create(Typeface.DEFAULT, Typeface.NORMAL)
            paint.textAlign = Paint.Align.LEFT
            val fullName = "${student.name} ${student.surname}".uppercase()
            // Trim name if it overflows card width
            var dispName = fullName
            if (dispName.length > 21) {
                dispName = dispName.take(19) + ".."
            }
            canvas.drawText(dispName, chosenX + 48f, itemY + 2f, paint)

            itemY += rowHeight
        }

        // Update column height tracker
        if (putInCol1) {
            yCol1 = chosenY + cardHeight + 15f
        } else {
            yCol2 = chosenY + cardHeight + 15f
        }
    }

    pdfDocument.finishPage(page)

    try {
        context.contentResolver.openOutputStream(uri)?.use { stream ->
            pdfDocument.writeTo(stream)
        }
    } catch (e: Exception) {
        e.printStackTrace()
    }
    pdfDocument.close()
}
