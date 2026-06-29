package com.example.ui.dashboard.tabs

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.*
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Casino
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clipToBounds
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Fill
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.nativeCanvas
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.Student
import com.example.utils.SoundHelper
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlin.random.Random

// Balon Patlatma
@Composable
fun BalloonGameView(students: List<Student>, onWinnerSelected: (Student) -> Unit) {
    if (students.isEmpty()) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Text("Balon oyunu için en az 1 öğrenci seçmelisiniz.", color = Color(0xFF64748B))
        }
        return
    }

    var winner by remember { mutableStateOf<Student?>(null) }
    
    if (winner != null) {
        // Winner Screen
        Box(modifier = Modifier.fillMaxSize().background(Color(0xFF0EA5E9), RoundedCornerShape(12.dp)), contentAlignment = Alignment.Center) {
            Card(
                shape = RoundedCornerShape(24.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                modifier = Modifier.width(320.dp).padding(16.dp),
                elevation = CardDefaults.cardElevation(8.dp)
            ) {
                Column(
                    modifier = Modifier.padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Box(
                        modifier = Modifier.offset(y = (-40).dp).size(80.dp).background(Color(0xFFEAB308), CircleShape),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(Icons.Default.Star, contentDescription = null, tint = Color.White, modifier = Modifier.size(48.dp))
                    }
                    Spacer(modifier = Modifier.height(16.dp))
                    Text("TEBRİKLER!", fontWeight = FontWeight.Black, fontSize = 24.sp, color = Color(0xFF0F172A))
                    Text("ŞANSLI ÖĞRENCİ", fontSize = 12.sp, color = Color(0xFF64748B), fontWeight = FontWeight.Bold)
                    Spacer(modifier = Modifier.height(8.dp))
                    Text("${winner!!.name} ${winner!!.surname}".uppercase(), fontWeight = FontWeight.Black, fontSize = 28.sp, color = Color(0xFF0EA5E9), textAlign = TextAlign.Center)
                    Text("No: ${winner!!.studentNo}", fontSize = 14.sp, color = Color(0xFF94A3B8))
                    
                    Spacer(modifier = Modifier.height(32.dp))
                    
                    Button(
                        onClick = { 
                            onWinnerSelected(winner!!)
                            winner = null
                        },
                        modifier = Modifier.fillMaxWidth().height(50.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF0EA5E9)),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Icon(Icons.Default.Refresh, contentDescription = null, modifier = Modifier.size(20.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("DEVAM ET")
                    }
                }
            }
        }
    } else {
        BoxWithConstraints(
            modifier = Modifier.fillMaxSize().background(Color(0xFFE0F2FE), RoundedCornerShape(12.dp))
        ) {
            val width = constraints.maxWidth.toFloat()
            val height = constraints.maxHeight.toFloat()
            
            val colors = listOf(Color(0xFFF43F5E), Color(0xFF0EA5E9), Color(0xFFF59E0B), Color(0xFF10B981), Color(0xFF6366F1), Color(0xFFA855F7))
            
            val gameBalloons = remember(students) {
                students.shuffled().take(15).map { student ->
                    BalloonData(
                        student = student,
                        color = colors.random(),
                        startX = Random.nextFloat() * (width - 200f).coerceAtLeast(0f) + 100f,
                        duration = Random.nextLong(4000, 10000),
                        delay = Random.nextLong(0, 3000),
                        size = Random.nextFloat() * 40f + 60f
                    )
                }
            }
            
            gameBalloons.forEach { balloon ->
                val infiniteTransition = rememberInfiniteTransition()
                val yProgress by infiniteTransition.animateFloat(
                    initialValue = 0f,
                    targetValue = 1f,
                    animationSpec = infiniteRepeatable(
                        animation = tween(balloon.duration.toInt(), delayMillis = balloon.delay.toInt(), easing = LinearEasing),
                        repeatMode = RepeatMode.Restart
                    )
                )
                
                val currentY = height + 100f - (height + 200f) * yProgress
                
                var popped by remember { mutableStateOf(false) }
                
                if (!popped) {
                    Box(
                        modifier = Modifier
                            .offset(x = androidx.compose.ui.platform.LocalDensity.current.run { balloon.startX.toDp() - balloon.size.dp / 2 }, 
                                    y = androidx.compose.ui.platform.LocalDensity.current.run { currentY.toDp() })
                            .width(balloon.size.dp).height((balloon.size * 1.3f).dp)
                            .clickable {
                                popped = true
                                SoundHelper.playBalloonPop()
                                SoundHelper.playSuccess()
                                winner = balloon.student
                            }
                    ) {
                        Canvas(modifier = Modifier.fillMaxSize()) {
                            val w = size.width
                            val h = size.height
                            
                            val path = Path().apply {
                                moveTo(w / 2, h)
                                cubicTo(w, h * 0.8f, w, 0f, w / 2, 0f)
                                cubicTo(0f, 0f, 0f, h * 0.8f, w / 2, h)
                            }
                            drawPath(path, color = balloon.color, style = Fill)
                            
                            drawCircle(color = Color.White.copy(alpha = 0.4f), radius = w * 0.15f, center = Offset(w * 0.3f, h * 0.2f))
                        }
                    }
                }
            }
        }
    }
}

// Kura Çekimi
@Composable
fun DrawGameView(students: List<Student>, onWinnerSelected: (Student) -> Unit) {
    if (students.isEmpty()) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Text("Kura oyunu için en az 1 öğrenci seçmelisiniz.", color = Color(0xFF64748B))
        }
        return
    }

    var isDrawing by remember { mutableStateOf(false) }
    var winner by remember { mutableStateOf<Student?>(null) }
    val scope = rememberCoroutineScope()

    Box(modifier = Modifier.fillMaxSize().background(Color(0xFFFFFBEB), RoundedCornerShape(12.dp)), contentAlignment = Alignment.Center) {
        if (!isDrawing && winner == null) {
            // Draw Box View
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Box(
                    modifier = Modifier.size(200.dp, 260.dp).background(Color(0xFFF59E0B), RoundedCornerShape(32.dp)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(Icons.Default.Casino, contentDescription = null, modifier = Modifier.size(100.dp), tint = Color.White.copy(alpha = 0.2f))
                    Text("?", fontWeight = FontWeight.Black, fontSize = 64.sp, color = Color.White.copy(alpha = 0.1f), modifier = Modifier.offset(x = 40.dp, y = 40.dp))
                }
                Spacer(modifier = Modifier.height(48.dp))
                Button(
                    onClick = {
                        if (students.isNotEmpty()) {
                            isDrawing = true
                            SoundHelper.playCardFlip()
                            scope.launch {
                                repeat(10) {
                                    SoundHelper.playCardFlip()
                                    delay(200)
                                }
                                winner = students.random()
                                isDrawing = false
                                SoundHelper.playSuccess()
                            }
                        }
                    },
                    modifier = Modifier.width(200.dp).height(56.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFF59E0B)),
                    shape = RoundedCornerShape(28.dp)
                ) {
                    Text("KURA ÇEK", fontSize = 18.sp, fontWeight = FontWeight.Black, color = Color.White)
                }
            }
        } else if (isDrawing) {
            // Shuffling Cards Animation
            val infiniteTransition = rememberInfiniteTransition()
            val yOffset by infiniteTransition.animateFloat(
                initialValue = -20f,
                targetValue = 20f,
                animationSpec = infiniteRepeatable(
                    animation = tween(300, easing = LinearEasing),
                    repeatMode = RepeatMode.Reverse
                )
            )
            val rotateZ by infiniteTransition.animateFloat(
                initialValue = -15f,
                targetValue = 15f,
                animationSpec = infiniteRepeatable(
                    animation = tween(400, easing = LinearEasing),
                    repeatMode = RepeatMode.Reverse
                )
            )

            Box(
                modifier = Modifier
                    .size(200.dp, 260.dp)
                    .graphicsLayer {
                        translationY = yOffset
                        rotationZ = rotateZ
                    }
                    .background(Color.White, RoundedCornerShape(24.dp))
                    .border(4.dp, Color(0xFFFEF3C7), RoundedCornerShape(24.dp)),
                contentAlignment = Alignment.Center
            ) {
                Icon(Icons.Default.Casino, contentDescription = null, modifier = Modifier.size(64.dp), tint = Color(0xFFFCD34D))
            }
        } else if (winner != null) {
            // Winner Display
            Card(
                shape = RoundedCornerShape(24.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                modifier = Modifier.width(320.dp).padding(16.dp),
                elevation = CardDefaults.cardElevation(8.dp)
            ) {
                Column(
                    modifier = Modifier.padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Box(
                        modifier = Modifier.size(80.dp).background(Color(0xFFF59E0B), CircleShape),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(Icons.Default.Star, contentDescription = null, tint = Color.White, modifier = Modifier.size(48.dp))
                    }
                    Spacer(modifier = Modifier.height(16.dp))
                    Text("ŞANSLI ÖĞRENCİ", fontSize = 12.sp, color = Color(0xFF64748B), fontWeight = FontWeight.Bold)
                    Spacer(modifier = Modifier.height(8.dp))
                    Text("${winner!!.name} ${winner!!.surname}".uppercase(), fontWeight = FontWeight.Black, fontSize = 28.sp, color = Color(0xFFF59E0B), textAlign = TextAlign.Center)
                    Text("No: ${winner!!.studentNo}", fontSize = 14.sp, color = Color(0xFF94A3B8))
                    
                    Spacer(modifier = Modifier.height(32.dp))
                    
                    Button(
                        onClick = { 
                            onWinnerSelected(winner!!)
                            winner = null
                        },
                        modifier = Modifier.fillMaxWidth().height(50.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFF59E0B)),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Text("DEVAM ET", fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}

// Yarış Pisti
class Racer(val student: Student) {
    var progress by mutableFloatStateOf(0f)
    var speed by mutableFloatStateOf(0.1f + Random.nextFloat() * 0.05f)
    var icon by mutableStateOf("🏃")
    var isPaused by mutableStateOf(false)
    var isReverse by mutableStateOf(false)
    
    var reachedBox = false
    var accident1Checked = false
    var accident2Checked = false
    var finished = false
}

@Composable
fun RaceTrackGameView(students: List<Student>, onWinnerSelected: (Student) -> Unit) {
    if (students.isEmpty()) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Text("Yarış pisti için en az 1 öğrenci seçmelisiniz.", color = Color(0xFF64748B))
        }
        return
    }

    var winner by remember { mutableStateOf<Student?>(null) }
    var isRacing by remember { mutableStateOf(false) }
    var countdown by remember { mutableIntStateOf(3) }
    var gameStarted by remember { mutableStateOf(false) }

    val racers = remember(students) {
        val selected = if (students.size > 5) students.shuffled().take(5) else students
        val maleIcons = listOf("👦", "👨", "👱‍♂️", "🧔", "🦸‍♂️", "🥷", "🧙‍♂️", "🧛‍♂️")
        val femaleIcons = listOf("👧", "👩", "👱‍♀️", "👩‍🦰", "🦸‍♀️", "🧝‍♀️", "🧚‍♀️", "🧛‍♀️")

        selected.map {
            val racer = Racer(it)
            val isFemale = it.gender.equals("Kız", ignoreCase = true) || it.gender.equals("Female", ignoreCase = true)
            racer.icon = if (isFemale) femaleIcons.random() else maleIcons.random()
            racer
        }
    }

    if (winner != null) {
        // Winner Screen
        Box(modifier = Modifier.fillMaxSize().background(Color(0xFF10B981), RoundedCornerShape(12.dp)), contentAlignment = Alignment.Center) {
            Card(
                shape = RoundedCornerShape(24.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                modifier = Modifier.width(320.dp).padding(16.dp),
                elevation = CardDefaults.cardElevation(8.dp)
            ) {
                Column(
                    modifier = Modifier.padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Box(
                        modifier = Modifier.offset(y = (-40).dp).size(80.dp).background(Color(0xFFEAB308), CircleShape),
                        contentAlignment = Alignment.Center
                    ) {
                        Text("🏆", fontSize = 40.sp)
                    }
                    Spacer(modifier = Modifier.height(16.dp))
                    Text("BİRİNCİ!", fontWeight = FontWeight.Black, fontSize = 24.sp, color = Color(0xFF0F172A))
                    Text("ŞANSLI ÖĞRENCİ", fontSize = 12.sp, color = Color(0xFF64748B), fontWeight = FontWeight.Bold)
                    Spacer(modifier = Modifier.height(8.dp))
                    Text("${winner!!.name} ${winner!!.surname}".uppercase(), fontWeight = FontWeight.Black, fontSize = 28.sp, color = Color(0xFF10B981), textAlign = TextAlign.Center)
                    Text("No: ${winner!!.studentNo}", fontSize = 14.sp, color = Color(0xFF94A3B8))
                    
                    Spacer(modifier = Modifier.height(32.dp))
                    
                    Button(
                        onClick = { 
                            onWinnerSelected(winner!!)
                            winner = null
                        },
                        modifier = Modifier.fillMaxWidth().height(50.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF10B981)),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Text("DEVAM ET", fontWeight = FontWeight.Bold, color = Color.White)
                    }
                }
            }
        }
    } else {
        LaunchedEffect(gameStarted) {
            if (gameStarted) {
                while (countdown > 0) {
                    SoundHelper.playF1Beep()
                    delay(1000)
                    countdown--
                }
                SoundHelper.playF1Go()
                isRacing = true
            }
        }

        LaunchedEffect(isRacing) {
            val vehicles = listOf(
                Pair("🚀", 0.40f),
                Pair("🏎️", 0.35f),
                Pair("🛸", 0.30f),
                Pair("🚲", 0.20f),
                Pair("🐴", 0.15f),
                Pair("🐢", 0.08f)
            )

            if (isRacing) {
                var lastTime = withFrameMillis { it }
                while (isRacing) {
                    val currentTime = withFrameMillis { it }
                    val delta = (currentTime - lastTime) / 1000f
                    lastTime = currentTime

                    var anyFinished = false
                    for (racer in racers) {
                        if (racer.finished) continue

                        if (!racer.isPaused) {
                            val moveDirection = if (racer.isReverse) -1f else 1f
                            racer.progress += racer.speed * delta * moveDirection
                            racer.progress = racer.progress.coerceIn(0f, 1f)
                        }

                        // Surprise Box
                        if (racer.progress >= 0.2f && !racer.reachedBox && !racer.isReverse) {
                            racer.reachedBox = true
                            SoundHelper.playEngineTurbo()
                            val vehicle = vehicles.random()
                            racer.icon = vehicle.first
                            racer.speed = vehicle.second * (0.8f + Random.nextFloat() * 0.4f)
                        }

                        // Accident 1
                        if (racer.progress >= 0.5f && !racer.accident1Checked && !racer.isReverse) {
                            racer.accident1Checked = true
                            if (Random.nextFloat() < 0.8f) { // 80% chance
                                SoundHelper.playCarSkid()
                                if (Random.nextBoolean()) {
                                    launch {
                                        racer.isPaused = true
                                        delay(2000)
                                        racer.isPaused = false
                                    }
                                } else {
                                    launch {
                                        racer.isReverse = true
                                        delay(1500)
                                        racer.isReverse = false
                                    }
                                }
                            }
                        }

                        // Accident 2
                        if (racer.progress >= 0.8f && !racer.accident2Checked && !racer.isReverse) {
                            racer.accident2Checked = true
                            if (Random.nextFloat() < 0.7f) { // 70% chance
                                SoundHelper.playCarSkid()
                                if (Random.nextBoolean()) {
                                    launch {
                                        racer.isPaused = true
                                        delay(1500)
                                        racer.isPaused = false
                                    }
                                } else {
                                    launch {
                                        racer.isReverse = true
                                        delay(1000)
                                        racer.isReverse = false
                                    }
                                }
                            }
                        }

                        if (racer.progress >= 0.98f) {
                            racer.finished = true
                            if (winner == null) {
                                launch {
                                    delay(1000)
                                    val finalWinner = racer.student
                                    winner = finalWinner
                                    isRacing = false
                                    SoundHelper.playSuccess()
                                }
                            }
                        }
                    }
                }
            }
        }

        Column(modifier = Modifier.fillMaxSize().background(Color(0xFFF8FAFC), RoundedCornerShape(12.dp)).padding(16.dp)) {
            if (!gameStarted) {
                Box(modifier = Modifier.fillMaxWidth().weight(1f), contentAlignment = Alignment.Center) {
                    Button(
                        onClick = { gameStarted = true },
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF10B981)),
                        modifier = Modifier.height(56.dp).width(200.dp),
                        shape = RoundedCornerShape(28.dp)
                    ) {
                        Text("YARIŞI BAŞLAT", fontSize = 18.sp, fontWeight = FontWeight.Black, color = Color.White)
                    }
                }
            } else if (countdown > 0) {
                Box(modifier = Modifier.fillMaxWidth().weight(1f), contentAlignment = Alignment.Center) {
                    Text(countdown.toString(), fontSize = 120.sp, fontWeight = FontWeight.Black, color = Color(0xFF10B981))
                }
            } else {
                Text("YARIŞ BAŞLADI!", fontSize = 24.sp, fontWeight = FontWeight.Black, color = Color(0xFF10B981), modifier = Modifier.align(Alignment.CenterHorizontally))
                Spacer(modifier = Modifier.height(16.dp))
                
                Column(modifier = Modifier.fillMaxWidth().weight(1f), verticalArrangement = Arrangement.SpaceEvenly) {
                    racers.forEachIndexed { index, racer ->
                        Row(modifier = Modifier.fillMaxWidth().height(60.dp), verticalAlignment = Alignment.CenterVertically) {
                            BoxWithConstraints(modifier = Modifier.weight(1f).fillMaxHeight()) {
                                val width = maxWidth
                                
                                // Draw Student Name in Background
                                Text(
                                    text = "${racer.student.name} ${racer.student.surname}".uppercase(),
                                    fontWeight = FontWeight.Black,
                                    fontSize = 28.sp,
                                    color = Color(0xFFE2E8F0).copy(alpha = 0.5f),
                                    maxLines = 1,
                                    modifier = Modifier.align(Alignment.Center)
                                )

                                // Track lines
                                Canvas(modifier = Modifier.fillMaxSize()) {
                                    drawLine(Color(0xFFCBD5E1), Offset(0f, size.height/2), Offset(size.width, size.height/2), strokeWidth = 4f,
                                        pathEffect = androidx.compose.ui.graphics.PathEffect.dashPathEffect(floatArrayOf(20f, 20f), 0f))
                                }
                                
                                // Surprise Box Mark
                                if (!racer.reachedBox) {
                                    Box(modifier = Modifier.offset(x = width * 0.2f).align(Alignment.CenterStart).size(24.dp).background(Color(0xFFF59E0B), RoundedCornerShape(4.dp)), contentAlignment = Alignment.Center) {
                                        Text("?", color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.Black)
                                    }
                                }
                                
                                val currentX = (width * racer.progress) - 24.dp
                                
                                Box(
                                    modifier = Modifier.offset(x = currentX).align(Alignment.CenterStart)
                                        .size(48.dp).background(Color.White, CircleShape)
                                        .border(2.dp, Color(0xFF10B981), CircleShape),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Text(racer.icon, fontSize = 24.sp)
                                    if (racer.isPaused) {
                                        Text("💨", modifier = Modifier.align(Alignment.TopEnd).offset(4.dp, (-4).dp), fontSize = 14.sp)
                                    } else if (racer.isReverse) {
                                        Text("⚠️", modifier = Modifier.align(Alignment.TopEnd).offset(4.dp, (-4).dp), fontSize = 14.sp)
                                    }
                                }
                            }
                            
                            // Finish Line
                            Box(modifier = Modifier.width(20.dp).fillMaxHeight().background(Color(0xFFEF4444)))
                        }
                        if (index < racers.size - 1) {
                            HorizontalDivider(color = Color(0xFFE2E8F0))
                        }
                    }
                }
            }
        }
    }
}

// Çiçek Bahçesi
class FlowerModel(val student: Student) {
    var x by mutableFloatStateOf(0f)
    var y by mutableFloatStateOf(0f)
    var isWinner by mutableStateOf(false)
    val color = listOf(Color(0xFFEC4899), Color(0xFFF59E0B), Color(0xFFEAB308), Color(0xFF3B82F6), Color(0xFFEF4444)).random()
    val icon = listOf("🌸", "🌺", "🌻", "🌼", "🌹", "🌷", "🪷").random()
}

class BeeModel {
    var x by mutableFloatStateOf(0f)
    var y by mutableFloatStateOf(0f)
    var targetX by mutableFloatStateOf(0f)
    var targetY by mutableFloatStateOf(0f)
    var speed = Random.nextFloat() * 200f + 100f
    var phase by mutableIntStateOf(0)
}

@Composable
fun FlowerGardenGameView(students: List<Student>, onWinnerSelected: (Student) -> Unit) {
    if (students.isEmpty()) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Text("Çiçek bahçesi için en az 1 öğrenci seçmelisiniz.", color = Color(0xFF64748B))
        }
        return
    }

    var winner by remember(students) { mutableStateOf<Student?>(null) }
    var winnerIcon by remember(students) { mutableStateOf("🌸") }
    var gatheringPhase by remember(students) { mutableStateOf(false) }
    var isFinished by remember(students) { mutableStateOf(false) }

    val flowers = remember(students) {
        val selected = students.shuffled().take(minOf(students.size, 15))
        selected.map { FlowerModel(it) }
    }

    val bees = remember(students) {
        List(15) { BeeModel() }
    }

    if (isFinished && winner != null) {
        // Winner Screen (from previous implementations)
        Box(modifier = Modifier.fillMaxSize().background(Color(0xFFEC4899), RoundedCornerShape(12.dp)), contentAlignment = Alignment.Center) {
            Card(
                shape = RoundedCornerShape(24.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                modifier = Modifier.width(320.dp).padding(16.dp),
                elevation = CardDefaults.cardElevation(8.dp)
            ) {
                Column(
                    modifier = Modifier.padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Box(
                        modifier = Modifier.offset(y = (-40).dp).size(80.dp).background(Color(0xFFF59E0B), CircleShape),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(winnerIcon, fontSize = 40.sp)
                    }
                    Spacer(modifier = Modifier.height(16.dp))
                    Text("ŞANSLI ÇİÇEK", fontSize = 12.sp, color = Color(0xFF64748B), fontWeight = FontWeight.Bold)
                    Spacer(modifier = Modifier.height(8.dp))
                    Text("${winner!!.name} ${winner!!.surname}".uppercase(), fontWeight = FontWeight.Black, fontSize = 28.sp, color = Color(0xFFEC4899), textAlign = TextAlign.Center)
                    Text("No: ${winner!!.studentNo}", fontSize = 14.sp, color = Color(0xFF94A3B8))
                    
                    Spacer(modifier = Modifier.height(32.dp))
                    
                    Button(
                        onClick = { 
                            onWinnerSelected(winner!!)
                            winner = null
                        },
                        modifier = Modifier.fillMaxWidth().height(50.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFEC4899)),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Text("DEVAM ET", fontWeight = FontWeight.Bold, color = Color.White)
                    }
                }
            }
        }
    } else {
        BoxWithConstraints(modifier = Modifier.fillMaxSize().clipToBounds().background(Color(0xFF86EFAC).copy(alpha = 0.5f), RoundedCornerShape(12.dp))) {
            val width = constraints.maxWidth.toFloat()
            val height = constraints.maxHeight.toFloat()
            val density = androidx.compose.ui.platform.LocalDensity.current
            
            val scale = if (flowers.size <= 4) 1.5f else if (flowers.size <= 9) 1.2f else if (flowers.size <= 16) 1.0f else 0.8f
            val flowerBoxSize = (120 * scale).dp
            val fontSizeNormal = (48 * scale).sp
            val fontSizeWinner = (72 * scale).sp
            val nameFontSize = (12 * scale).sp
            
            LaunchedEffect(students) {
                val flowerBoxSizePx = with(density) { flowerBoxSize.toPx() }
                
                // Initialize positions evenly on a grid
                val cols = kotlin.math.ceil(kotlin.math.sqrt(flowers.size.toDouble())).toInt().coerceAtLeast(1)
                val rows = kotlin.math.ceil(flowers.size.toDouble() / cols).toInt().coerceAtLeast(1)
                
                val padding = flowerBoxSizePx * 0.8f
                val availableWidth = (width - padding * 2).coerceAtLeast(1f)
                val availableHeight = (height - padding * 2).coerceAtLeast(1f)
                
                val cellWidth = availableWidth / cols
                val cellHeight = availableHeight / rows

                flowers.forEachIndexed { index, flower ->
                    val col = index % cols
                    val row = index / cols
                    val offsetX = (Random.nextFloat() * 0.4f - 0.2f) * cellWidth
                    val offsetY = (Random.nextFloat() * 0.4f - 0.2f) * cellHeight
                    flower.x = padding + (col * cellWidth) + (cellWidth / 2f) + offsetX
                    flower.y = padding + (row * cellHeight) + (cellHeight / 2f) + offsetY
                }
                
                bees.forEach {
                    it.x = Random.nextFloat() * width
                    it.y = Random.nextFloat() * height
                    it.targetX = Random.nextFloat() * width
                    it.targetY = Random.nextFloat() * height
                }
                
                // Roam phase
                repeat(4) {
                    SoundHelper.playBeeBuzz()
                    delay(1000)
                }
                
                // Pick winner
                val winnerFlower = flowers.random()
                winnerFlower.isWinner = true
                winner = winnerFlower.student
                winnerIcon = winnerFlower.icon
                gatheringPhase = true
                SoundHelper.playCoin()
                
                delay(3000)
                isFinished = true
                SoundHelper.playSuccess()
            }
            
            LaunchedEffect(students, gatheringPhase) {
                var lastTime = withFrameMillis { it }
                while (!isFinished) {
                    val currentTime = withFrameMillis { it }
                    val delta = (currentTime - lastTime) / 1000f
                    lastTime = currentTime
                    
                    bees.forEach { bee ->
                        if (gatheringPhase && winner != null) {
                            val winFlower = flowers.find { it.isWinner }
                            if (winFlower != null) {
                                bee.targetX = winFlower.x + Random.nextFloat() * 60f - 30f
                                bee.targetY = winFlower.y + Random.nextFloat() * 60f - 30f
                            }
                        } else {
                            // Update random target when reached
                            val dist = kotlin.math.hypot(bee.targetX - bee.x, bee.targetY - bee.y)
                            if (dist < 20f || bee.targetX == 0f) {
                                bee.targetX = Random.nextFloat() * width
                                bee.targetY = Random.nextFloat() * height / 1.5f
                            }
                        }
                        
                        val dx = bee.targetX - bee.x
                        val dy = bee.targetY - bee.y
                        val dist = kotlin.math.hypot(dx, dy)
                        if (dist > 1f) {
                            val moveX = (dx / dist) * bee.speed * delta
                            val moveY = (dy / dist) * bee.speed * delta
                            bee.x += moveX
                            bee.y += moveY
                        }
                    }
                }
            }

            flowers.forEach { flower ->
                val halfBoxSizePx = with(density) { flowerBoxSize.toPx() } / 2f
                Box(
                    modifier = Modifier
                        .offset { androidx.compose.ui.unit.IntOffset((flower.x - halfBoxSizePx).toInt(), (flower.y - halfBoxSizePx).toInt()) }
                        .size(flowerBoxSize),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(flower.icon, fontSize = if (flower.isWinner) fontSizeWinner else fontSizeNormal)
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = "${flower.student.name} ${flower.student.surname}".take(15),
                            fontSize = nameFontSize,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF1E293B),
                            maxLines = 1,
                            modifier = Modifier.background(Color.White.copy(alpha = 0.8f), RoundedCornerShape(4.dp)).padding(horizontal = 4.dp, vertical = 2.dp)
                        )
                    }
                }
            }

            bees.forEach { bee ->
                val isFlipped = bee.targetX < bee.x
                Text(
                    text = "🐝",
                    fontSize = 24.sp,
                    modifier = Modifier
                        .offset { androidx.compose.ui.unit.IntOffset(bee.x.toInt() - 12, bee.y.toInt() - 12) }
                        .graphicsLayer { scaleX = if (isFlipped) -1f else 1f }
                )
            }
            
            if (!gatheringPhase) {
                Text("ARILAR ŞANSLI ÇİÇEĞİ ARIYOR...", fontSize = 24.sp, fontWeight = FontWeight.Black, color = Color.White, modifier = Modifier.align(Alignment.TopCenter).padding(top = 32.dp))
            }
        }
    }
}

data class BalloonData(
    val student: Student,
    val color: Color,
    val startX: Float,
    val duration: Long,
    val delay: Long,
    val size: Float
)

// Uzay Yolculuğu
class SpaceRacer(val student: Student) {
    var progress by mutableFloatStateOf(0f)
    var speed by mutableFloatStateOf(0.1f + Random.nextFloat() * 0.05f)
    var icon by mutableStateOf("🚀")
    var isPaused by mutableStateOf(false)
    var isReverse by mutableStateOf(false)
    var isTurbo by mutableStateOf(false)
    var isShaking by mutableStateOf(false)

    var reachedAsteroid1 = false
    var reachedAsteroid2 = false
    var reachedTurbo = false
    var finished = false
}

@Composable
fun SpaceJourneyGameView(students: List<Student>, onWinnerSelected: (Student) -> Unit) {
    if (students.isEmpty()) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Text("Uzay yolculuğu için en az 1 öğrenci seçmelisiniz.", color = Color(0xFF64748B))
        }
        return
    }

    var winner by remember(students) { mutableStateOf<Student?>(null) }
    var isRacing by remember(students) { mutableStateOf(false) }
    var gameStarted by remember(students) { mutableStateOf(false) }
    var countdown by remember(students) { mutableIntStateOf(3) }

    val racers = remember(students) {
        val selected = if (students.size > 5) students.shuffled().take(5) else students
        val spaceIcons = listOf("🚀", "🛸", "🛰️", "✈️", "🚁", "🛩️", "🎈", "🪁", "🪂")

        selected.map {
            val racer = SpaceRacer(it)
            racer.icon = spaceIcons.random()
            racer
        }
    }

    if (winner != null) {
        // Winner Screen
        Box(modifier = Modifier.fillMaxSize().background(Color(0xFF0F172A), RoundedCornerShape(12.dp)), contentAlignment = Alignment.Center) {
            // Starry background effect
            Canvas(modifier = Modifier.fillMaxSize()) {
                val starCount = 100
                for (i in 0 until starCount) {
                    drawCircle(
                        color = Color.White.copy(alpha = Random.nextFloat() * 0.8f + 0.2f),
                        radius = Random.nextFloat() * 4f,
                        center = Offset(Random.nextFloat() * size.width, Random.nextFloat() * size.height)
                    )
                }
            }

            Card(
                shape = RoundedCornerShape(24.dp),
                colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
                modifier = Modifier.width(320.dp).padding(16.dp),
                elevation = CardDefaults.cardElevation(8.dp)
            ) {
                Column(
                    modifier = Modifier.padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Box(
                        modifier = Modifier.offset(y = (-40).dp).size(80.dp).background(Color(0xFF6366F1), CircleShape).border(4.dp, Color(0xFF38BDF8), CircleShape),
                        contentAlignment = Alignment.Center
                    ) {
                        Text("👨‍🚀", fontSize = 40.sp)
                    }
                    Spacer(modifier = Modifier.height(16.dp))
                    Text("STAR OYUNCU", fontSize = 12.sp, color = Color(0xFF94A3B8), fontWeight = FontWeight.Bold)
                    Spacer(modifier = Modifier.height(8.dp))
                    Text("${winner!!.name} ${winner!!.surname}".uppercase(), fontWeight = FontWeight.Black, fontSize = 28.sp, color = Color.White, textAlign = TextAlign.Center)
                    Text("No: ${winner!!.studentNo}", fontSize = 14.sp, color = Color(0xFF64748B))
                    
                    Spacer(modifier = Modifier.height(32.dp))
                    
                    Button(
                        onClick = { 
                            onWinnerSelected(winner!!)
                            winner = null
                        },
                        modifier = Modifier.fillMaxWidth().height(50.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF6366F1)),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Text("DEVAM ET", fontWeight = FontWeight.Bold, color = Color.White)
                    }
                }
            }
        }
    } else {
        LaunchedEffect(gameStarted) {
            if (gameStarted) {
                while (countdown > 0) {
                    SoundHelper.playSpaceBeep()
                    delay(1000)
                    countdown--
                }
                SoundHelper.playRocketLaunch()
                isRacing = true
            }
        }
        
        LaunchedEffect(isRacing) {
            if (isRacing) {
                var lastTime = withFrameMillis { it }
                while (isRacing) {
                    val currentTime = withFrameMillis { it }
                    val delta = (currentTime - lastTime) / 1000f
                    lastTime = currentTime
                    var anyFinished = false

                    for (racer in racers) {
                        if (racer.finished) continue

                        if (!racer.isPaused && !racer.isShaking) {
                            val moveDirection = if (racer.isReverse) -1f else 1f
                            val currentSpeed = if (racer.isTurbo) racer.speed * 2.5f else racer.speed
                            racer.progress += currentSpeed * delta * moveDirection
                            racer.progress = racer.progress.coerceIn(0f, 1f)
                        }

                        // Event 1: Turbo boost
                        if (racer.progress >= 0.3f && !racer.reachedTurbo && !racer.isReverse) {
                            racer.reachedTurbo = true
                            if (Random.nextFloat() < 0.4f) { // 40% chance
                                SoundHelper.playSpaceTurbo()
                                launch {
                                    racer.isTurbo = true
                                    delay(2000)
                                    racer.isTurbo = false
                                }
                            }
                        }

                        // Event 2: Asteroid shower 1 (Pause or shake)
                        if (racer.progress >= 0.5f && !racer.reachedAsteroid1 && !racer.isReverse) {
                            racer.reachedAsteroid1 = true
                            if (Random.nextFloat() < 0.6f) { // 60% chance
                                SoundHelper.playAsteroidHit()
                                if (Random.nextBoolean()) {
                                    launch {
                                        racer.isPaused = true
                                        delay(1500)
                                        racer.isPaused = false
                                    }
                                } else {
                                    launch {
                                        racer.isShaking = true
                                        delay(1000)
                                        racer.isShaking = false
                                    }
                                }
                            }
                        }

                        // Event 3: Black hole pull (Reverse)
                        if (racer.progress >= 0.75f && !racer.reachedAsteroid2 && !racer.isReverse) {
                            racer.reachedAsteroid2 = true
                            if (Random.nextFloat() < 0.5f) { // 50% chance
                                SoundHelper.playAsteroidHit()
                                launch {
                                    racer.isReverse = true
                                    delay(1200)
                                    racer.isReverse = false
                                }
                            }
                        }

                        if (racer.progress >= 0.98f) {
                            racer.finished = true
                            if (winner == null) {
                                launch {
                                    delay(500)
                                    val finalWinner = racer.student
                                    winner = finalWinner
                                    isRacing = false
                                    SoundHelper.playSuccess()
                                }
                            }
                        }
                    }
                }
            }
        }

        Box(modifier = Modifier.fillMaxSize().background(Color(0xFF0F172A), RoundedCornerShape(12.dp)).padding(16.dp)) {
            // Star background
            Canvas(modifier = Modifier.fillMaxSize()) {
                val starCount = 50
                for (i in 0 until starCount) {
                    drawCircle(
                        color = Color.White.copy(alpha = Random.nextFloat() * 0.5f + 0.1f),
                        radius = Random.nextFloat() * 3f,
                        center = Offset(Random.nextFloat() * size.width, Random.nextFloat() * size.height)
                    )
                }
            }

            if (!gameStarted) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Button(
                        onClick = { gameStarted = true },
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF6366F1)),
                        modifier = Modifier.height(56.dp).width(200.dp),
                        shape = RoundedCornerShape(28.dp)
                    ) {
                        Text("FIRLAT", fontSize = 18.sp, fontWeight = FontWeight.Black, color = Color.White)
                    }
                }
            } else if (countdown > 0) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text("$countdown", fontSize = 120.sp, fontWeight = FontWeight.Black, color = Color(0xFF6366F1))
                }
            } else {
                Row(modifier = Modifier.fillMaxSize(), horizontalArrangement = Arrangement.SpaceEvenly) {
                    racers.forEachIndexed { index, racer ->
                        BoxWithConstraints(modifier = Modifier.weight(1f).fillMaxHeight(), contentAlignment = Alignment.BottomCenter) {
                            val height = maxHeight
                            
                            // Background Lane Name
                            Text(
                                text = "${racer.student.name} ${racer.student.surname}".uppercase(),
                                fontWeight = FontWeight.Black,
                                fontSize = 24.sp,
                                color = Color(0xFF334155).copy(alpha = 0.5f),
                                maxLines = 1,
                                modifier = Modifier
                                    .align(Alignment.Center)
                                    .graphicsLayer { rotationZ = -90f }
                            )

                            // Track Lines
                            Canvas(modifier = Modifier.fillMaxSize()) {
                                drawLine(
                                    color = Color(0xFF334155),
                                    start = Offset(size.width / 2, 0f),
                                    end = Offset(size.width / 2, size.height),
                                    strokeWidth = 4f,
                                    pathEffect = androidx.compose.ui.graphics.PathEffect.dashPathEffect(floatArrayOf(20f, 20f), 0f)
                                )
                            }
                            
                            // Finish Line at top
                            Box(modifier = Modifier.fillMaxWidth().height(20.dp).background(Color(0xFF38BDF8)).align(Alignment.TopCenter))

                            val currentY = (height * racer.progress) - 24.dp
                            
                            Box(
                                modifier = Modifier
                                    .offset(y = -currentY)
                                    .align(Alignment.BottomCenter)
                                    .size(48.dp)
                                    .background(Color(0xFF1E293B), CircleShape)
                                    .border(2.dp, Color(0xFF6366F1), CircleShape),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(racer.icon, fontSize = 24.sp)
                                
                                if (racer.isPaused) {
                                    Text("💥", modifier = Modifier.align(Alignment.TopEnd).offset(4.dp, (-4).dp), fontSize = 16.sp)
                                } else if (racer.isReverse) {
                                    Text("☄️", modifier = Modifier.align(Alignment.TopCenter).offset(0.dp, (-20).dp), fontSize = 24.sp)
                                } else if (racer.isTurbo) {
                                    Text("🔥", modifier = Modifier.align(Alignment.BottomCenter).offset(0.dp, 8.dp), fontSize = 16.sp)
                                } else if (racer.isShaking) {
                                    Text("🪨", modifier = Modifier.align(Alignment.TopEnd).offset(4.dp, (-4).dp), fontSize = 14.sp)
                                }
                            }
                        }
                        
                        if (index < racers.size - 1) {
                            Box(modifier = Modifier.width(2.dp).fillMaxHeight().background(Color(0xFF1E293B)))
                        }
                    }
                }
            }
        }
    }
}

// Treasure Hunt Game support structures and view
enum class TreasureVictoryType {
    JACKPOT,    // Found 1st click: earns all gold, pirates flee empty-handed!
    PARTIAL,    // Found 2nd or 3rd click: earns remaining gold, some pirates fled with gold
    CANDIES     // Found 4th click: all gold taken by pirates, child gets candies!
}

class TreasureChestItem(
    val index: Int,
    val isWinner: Boolean,
    val pirateName: String,
    val pirateEmoji: String,
    isOpenedInitially: Boolean = false,
    isFledInitially: Boolean = false,
    fledWithGoldInitially: Boolean = true
) {
    var isOpened by mutableStateOf(isOpenedInitially)
    var isFled by mutableStateOf(isFledInitially)
    var fledWithGold by mutableStateOf(fledWithGoldInitially)
}

class TreasureParticle(
    var x: Float,
    var y: Float,
    var speedX: Float,
    var speedY: Float,
    var rotation: Float,
    val rotationSpeed: Float,
    val size: Float,
    val character: String
)

@Composable
fun WoodenChestComposable(
    isOpened: Boolean,
    isStudent: Boolean,
    studentName: String,
    pirateEmoji: String,
    pirateName: String,
    fledWithGold: Boolean,
    chestType: TreasureVictoryType?,
    modifier: Modifier = Modifier
) {
    // Dynamic scale bounce when chest opens or remains closed
    val scaleAnim by animateFloatAsState(
        targetValue = if (isOpened) 1.05f else 1.0f,
        animationSpec = spring(
            dampingRatio = Spring.DampingRatioMediumBouncy,
            stiffness = Spring.StiffnessLow
        ),
        label = "scale"
    )

    // A subtle rotation wobble for closed chests to show they have something inside!
    val infiniteTransition = rememberInfiniteTransition(label = "chest_idle_wobble")
    val idleRotation by infiniteTransition.animateFloat(
        initialValue = -2f,
        targetValue = 2f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 1400, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "rotation"
    )

    val currentRotation = if (!isOpened) idleRotation else 0f

    // Spring scaling pop transition of the revealed characters
    val revealScale by animateFloatAsState(
        targetValue = if (isOpened) 1.0f else 0.0f,
        animationSpec = spring(
            dampingRatio = Spring.DampingRatioHighBouncy,
            stiffness = Spring.StiffnessMedium
        ),
        label = "reveal_scale"
    )

    Box(
        modifier = modifier
            .graphicsLayer {
                scaleX = scaleAnim
                scaleY = scaleAnim
                rotationZ = currentRotation
            }
    ) {
        if (!isOpened) {
            // Closed chest
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(
                        brush = androidx.compose.ui.graphics.Brush.verticalGradient(
                            colors = listOf(Color(0xFF8B5A2B), Color(0xFF5C3A21))
                        ),
                        shape = RoundedCornerShape(16.dp)
                    )
                    .border(3.dp, Color(0xFF3B2314), RoundedCornerShape(16.dp)),
                contentAlignment = Alignment.Center
            ) {
                // Horizontal line representing split
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(3.dp)
                        .background(Color(0xFF2B180F))
                        .align(Alignment.Center)
                )

                // Two steel bands
                Row(
                    modifier = Modifier.fillMaxSize(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Box(
                        modifier = Modifier
                            .fillMaxHeight()
                            .width(12.dp)
                            .background(Color(0xFFFABF2C))
                    )
                    Box(
                        modifier = Modifier
                            .fillMaxHeight()
                            .width(12.dp)
                            .background(Color(0xFFFABF2C))
                    )
                }

                // Golden latch
                Box(
                    modifier = Modifier
                        .size(28.dp)
                        .background(Color(0xFFF59E0B), RoundedCornerShape(6.dp))
                        .border(2.dp, Color(0xFFB45309), RoundedCornerShape(6.dp))
                        .align(Alignment.Center),
                    contentAlignment = Alignment.Center
                ) {
                    Box(
                        modifier = Modifier
                            .size(8.dp)
                            .background(Color(0xFF3B2314), CircleShape)
                    )
                }
            }
        } else {
            // Opened chest
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(
                        brush = androidx.compose.ui.graphics.Brush.verticalGradient(
                            colors = listOf(Color(0xFF5C3A21), Color(0xFF3B2314))
                        ),
                        shape = RoundedCornerShape(16.dp)
                    )
                    .border(2.5.dp, Color(0xFF45220A), RoundedCornerShape(16.dp)),
                contentAlignment = Alignment.Center
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .fillMaxHeight(0.5f)
                        .background(Color(0xFF2B180F))
                        .align(Alignment.BottomCenter)
                )

                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center,
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(8.dp)
                        .graphicsLayer {
                            scaleX = revealScale
                            scaleY = revealScale
                        }
                ) {
                    if (isStudent) {
                        val badgeColor = Color(0xFF22C55E)
                        val starSymbol = "✨"
                        
                        Box(contentAlignment = Alignment.Center) {
                            Text("👦", fontSize = 48.sp)
                            Text("👑", fontSize = 24.sp, modifier = Modifier.align(Alignment.TopCenter).offset(y = (-18).dp))
                        }
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = "$starSymbol ${studentName.uppercase()} $starSymbol",
                            fontWeight = FontWeight.Black,
                            fontSize = 11.sp,
                            color = Color.White,
                            textAlign = TextAlign.Center,
                            maxLines = 1,
                            modifier = Modifier
                                .background(badgeColor, RoundedCornerShape(6.dp))
                                .padding(horizontal = 6.dp, vertical = 3.dp)
                        )
                    } else {
                        Box(contentAlignment = Alignment.Center) {
                            Text(pirateEmoji, fontSize = 40.sp)
                        }
                        Spacer(modifier = Modifier.height(2.dp))
                        Text(
                            text = if (fledWithGold) "ALTINLA KAÇTI! 🏃‍♂️💰" else "ELI BOŞ KAÇTI 💨",
                            fontWeight = FontWeight.Black,
                            fontSize = 9.sp,
                            color = if (fledWithGold) Color(0xFFF59E0B) else Color(0xFFEF4444),
                            textAlign = TextAlign.Center,
                            modifier = Modifier
                                .background(Color.Black.copy(alpha = 0.6f), RoundedCornerShape(4.dp))
                                .padding(horizontal = 4.dp, vertical = 2.dp)
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun TreasureHuntGameView(students: List<Student>, onWinnerSelected: (Student) -> Unit) {
    if (students.isEmpty()) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Text("Hazine avı için en az 1 öğrenci seçmelisiniz.", color = Color(0xFF64748B))
        }
        return
    }

    var resetTrigger by remember { mutableIntStateOf(0) }
    
    // Choose lucky student
    val selectedStudent = remember(students, resetTrigger) { students.random() }
    
    var isFinished by remember(students, resetTrigger) { mutableStateOf(false) }
    var victoryType by remember(students, resetTrigger) { mutableStateOf<TreasureVictoryType?>(null) }
    var openedCount by remember(students, resetTrigger) { mutableIntStateOf(0) }
    var scoreValue by remember(students, resetTrigger) { mutableStateOf("") }
    
    val chests = remember(students, resetTrigger) {
        val list = mutableListOf<TreasureChestItem>()
        val winnerIndex = Random.nextInt(4)
        val pirateEmojis = listOf("🏴‍☠️", "⚓", "☠️", "🦜")
        val pirateNames = listOf("Karasakal", "Kızıl Barbar", "Tekgöz", "Gümüş Kanca")
        
        for (i in 0 until 4) {
            val isWinner = i == winnerIndex
            list.add(
                TreasureChestItem(
                    index = i,
                    isWinner = isWinner,
                    pirateName = if (isWinner) "" else pirateNames[i % pirateNames.size],
                    pirateEmoji = if (isWinner) "" else pirateEmojis[i % pirateEmojis.size]
                )
            )
        }
        list
    }

    val particles = remember(students, resetTrigger) { mutableStateListOf<TreasureParticle>() }
    var particleTrigger by remember(students, resetTrigger) { mutableIntStateOf(0) }

    val onChestClicked: (TreasureChestItem) -> Unit = { chest ->
        chest.isOpened = true
        openedCount++
        val currentClick = openedCount
        
        if (chest.isWinner) {
            isFinished = true
            SoundHelper.playSuccess()
            if (currentClick == 1) {
                victoryType = TreasureVictoryType.JACKPOT
                chests.forEach { other ->
                    if (!other.isWinner) {
                        other.isOpened = true
                        other.isFled = true
                        other.fledWithGold = false
                    }
                }
            } else if (currentClick == 4) {
                victoryType = TreasureVictoryType.CANDIES
            } else {
                victoryType = TreasureVictoryType.PARTIAL
            }
        } else {
            chest.isFled = true
            chest.fledWithGold = true
            SoundHelper.playBoing()
        }
    }

    BoxWithConstraints(
        modifier = Modifier
            .fillMaxSize()
            .clipToBounds()
            .background(
                brush = androidx.compose.ui.graphics.Brush.verticalGradient(
                    colors = listOf(Color(0xFF1E110A), Color(0xFF2A1B12))
                ),
                shape = RoundedCornerShape(12.dp)
            )
    ) {
        val width = constraints.maxWidth.toFloat()
        val height = constraints.maxHeight.toFloat()
        val isWide = width > 600f

        // Particles animation loop
        LaunchedEffect(isFinished, victoryType, width, height) {
            if (isFinished && victoryType != null) {
                val emojiPool = if (victoryType == TreasureVictoryType.CANDIES) {
                    listOf("🍬", "🍭", "🍩", "🍫", "🧁", "🍩", "🍬", "🍭")
                } else {
                    listOf("🪙", "💰", "👑", "✨", "🪙", "🪙")
                }
                
                val count = if (victoryType == TreasureVictoryType.JACKPOT) 50 else if (victoryType == TreasureVictoryType.PARTIAL) 30 else 25
                val list = List(count) {
                    TreasureParticle(
                        x = Random.nextFloat() * width,
                        y = -50f - (Random.nextFloat() * 200f),
                        speedX = Random.nextFloat() * 160f - 80f,
                        speedY = Random.nextFloat() * 250f + 150f,
                        rotation = Random.nextFloat() * 360f,
                        rotationSpeed = Random.nextFloat() * 180f - 90f,
                        size = Random.nextFloat() * 20f + 20f,
                        character = emojiPool.random()
                    )
                }
                particles.addAll(list)

                var lastTime = withFrameMillis { it }
                while (true) {
                    val currentTime = withFrameMillis { it }
                    val delta = (currentTime - lastTime) / 1000f
                    lastTime = currentTime

                    particles.forEach { p ->
                        p.y += p.speedY * delta
                        p.x += p.speedX * delta
                        p.rotation += p.rotationSpeed * delta

                        if (p.x < 0f || p.x > width) {
                            p.speedX = -p.speedX
                        }
                        if (p.y > height + 50f) {
                            p.y = -50f
                            p.x = Random.nextFloat() * width
                        }
                    }
                    particleTrigger++
                }
            }
        }

        // Layout
        Column(
            modifier = Modifier.fillMaxSize().padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            // Header Title
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier.padding(top = 8.dp)
            ) {
                Text(
                    text = "BÜYÜK HAZİNENİN SAHİBİNİ BUL!",
                    fontSize = if (isWide) 26.sp else 18.sp,
                    fontWeight = FontWeight.Black,
                    color = Color(0xFFF1F5F9),
                    textAlign = TextAlign.Center
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "Bakalım şanslı öğrencimizin gizlendiği sandığı bulabilecek misiniz?",
                    fontSize = if (isWide) 15.sp else 12.sp,
                    color = Color(0xFFFFC107),
                    textAlign = TextAlign.Center,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.padding(horizontal = 16.dp)
                )
            }

            // Chest Grid / Row
            Box(
                modifier = Modifier.weight(1f).fillMaxWidth(),
                contentAlignment = Alignment.Center
            ) {
                if (isWide) {
                    // Show 4 side-by-side
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
                        horizontalArrangement = Arrangement.spacedBy(16.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        chests.forEach { chest ->
                            Box(
                                modifier = Modifier
                                    .weight(1f)
                                    .aspectRatio(0.8f)
                                    .clickable(enabled = !chest.isOpened && !isFinished) {
                                        onChestClicked(chest)
                                    }
                            ) {
                                WoodenChestComposable(
                                    isOpened = chest.isOpened,
                                    isStudent = chest.isWinner,
                                    studentName = selectedStudent.name,
                                    pirateEmoji = chest.pirateEmoji,
                                    pirateName = chest.pirateName,
                                    fledWithGold = chest.fledWithGold,
                                    chestType = victoryType,
                                    modifier = Modifier.fillMaxSize()
                                )
                            }
                        }
                    }
                } else {
                    // 2x2 Grid for compact/mobile
                    Column(
                        modifier = Modifier.padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(16.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        for (row in 0 until 2) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(16.dp)
                            ) {
                                for (col in 0 until 2) {
                                    val index = row * 2 + col
                                    val chest = chests[index]
                                    Box(
                                        modifier = Modifier
                                            .weight(1f)
                                            .aspectRatio(0.85f)
                                            .clickable(enabled = !chest.isOpened && !isFinished) {
                                                onChestClicked(chest)
                                            }
                                    ) {
                                        WoodenChestComposable(
                                            isOpened = chest.isOpened,
                                            isStudent = chest.isWinner,
                                            studentName = selectedStudent.name,
                                            pirateEmoji = chest.pirateEmoji,
                                            pirateName = chest.pirateName,
                                            fledWithGold = chest.fledWithGold,
                                            chestType = victoryType,
                                            modifier = Modifier.fillMaxSize()
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // Stats info footer
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(Color.Black.copy(alpha = 0.3f), RoundedCornerShape(8.dp))
                    .padding(8.dp),
                horizontalArrangement = Arrangement.SpaceAround,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Açılan Sandık: $openedCount / 4",
                    color = Color(0xFFF1F5F9),
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = "Kaçan Korsan: ${chests.count { it.isOpened && !it.isWinner }}",
                    color = Color(0xFFF1F5F9),
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold
                )
            }
        }

        // Particle layer canvas
        if (particles.isNotEmpty()) {
            // Read particleTrigger to force recomposition
            val trigger = particleTrigger
            Canvas(modifier = Modifier.fillMaxSize()) {
                particles.forEach { p ->
                    drawContext.canvas.save()
                    drawContext.canvas.translate(p.x, p.y)
                    drawContext.canvas.rotate(p.rotation)
                    
                    // Simple text painter for the emoji character
                    val paint = android.graphics.Paint().apply {
                        textSize = p.size
                        textAlign = android.graphics.Paint.Align.CENTER
                    }
                    drawContext.canvas.nativeCanvas.drawText(p.character, 0f, 0f, paint)
                    drawContext.canvas.restore()
                }
            }
        }

        // Final Winner Screen overlays
        if (isFinished && victoryType != null) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Color.Black.copy(alpha = 0.6f)),
                contentAlignment = Alignment.Center
            ) {
                Card(
                    shape = RoundedCornerShape(24.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White),
                    modifier = Modifier
                        .width(340.dp)
                        .padding(16.dp),
                    elevation = CardDefaults.cardElevation(12.dp)
                ) {
                    Column(
                        modifier = Modifier.padding(24.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        // Big shiny gold circle containing student's victory avatar
                        Box(
                            modifier = Modifier
                                .offset(y = (-44).dp)
                                .size(88.dp)
                                .background(
                                    brush = androidx.compose.ui.graphics.Brush.sweepGradient(
                                        colors = listOf(Color(0xFFFFD700), Color(0xFFFFA500), Color(0xFFFFD700))
                                    ),
                                    shape = CircleShape
                                )
                                .border(4.dp, Color.White, CircleShape),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = if (victoryType == TreasureVictoryType.CANDIES) "🍭" else "🏆",
                                fontSize = 48.sp
                            )
                        }

                        Spacer(modifier = Modifier.height(0.dp)) // Offset accounts for size

                        Text(
                            text = if (victoryType == TreasureVictoryType.JACKPOT) "🏆 EFSANEVİ ZAFER! 🏆"
                                   else if (victoryType == TreasureVictoryType.PARTIAL) "🎉 HAZİNE BULUNDU! 🎉"
                                   else "🍬 ŞEKER GEÇİDİ! 🍬",
                            fontWeight = FontWeight.Black,
                            fontSize = 20.sp,
                            color = Color(0xFF1E293B),
                            textAlign = TextAlign.Center
                        )

                        Spacer(modifier = Modifier.height(12.dp))

                        Text(
                            text = "✨ ${selectedStudent.name} ${selectedStudent.surname} ✨".uppercase(),
                            fontWeight = FontWeight.Black,
                            fontSize = 24.sp,
                            color = Color(0xFFD97706),
                            textAlign = TextAlign.Center
                        )
                        Text(
                            text = "No: ${selectedStudent.studentNo}",
                            fontSize = 14.sp,
                            color = Color(0xFF64748B)
                        )

                        Spacer(modifier = Modifier.height(16.dp))

                        // Quick, punchy explanation using the student's name directly!
                        val explanation = remember(selectedStudent.id, victoryType) {
                            when(victoryType) {
                                TreasureVictoryType.JACKPOT -> listOf(
                                    "Efsanevi Önsezi! 👑 İlk denemede ${selectedStudent.name} çıktı! Altınların hepsi ${selectedStudent.name}'in oldu, korsanlar eli boş kaçtı! 🏴‍☠️💨",
                                    "Sıfır hata, tam isabet! 🗺️ Korsanları şaşkına çevirip büyük ödülü ilk denemede kapan usta denizci ${selectedStudent.name} oldu! ⚓",
                                    "Korsanlar daha ne olduğunu anlamadan ${selectedStudent.name} hazineyi buldu bile! 🏴‍☠️ Harika bir sezgi ve muazzam şans! 🪙",
                                    "Altıncı hissi kuvvetli kâşifimiz ${selectedStudent.name}, rotasını doğrudan efsanevi sandığa çevirdi! 🧭 Mükemmel bir keşif! ✨"
                                ).random()
                                TreasureVictoryType.PARTIAL -> listOf(
                                    "Harika! 🪙 Korsanlar biraz altın kaçırsa da büyük hazineye ${selectedStudent.name} ulaştı! 🎉",
                                    "Korsanlarla zorlu bir mücadeleden sonra asıl ganimeti kapan maceracımız ${selectedStudent.name} oldu! ⚔️ Altınlar senin! 💰",
                                    "Birkaç korsan tuzağı onu durduramadı! ⚓ ${selectedStudent.name} azmi sayesinde parlayan sandığı açmayı başardı! 🗺️",
                                    "Biraz sarsıntılı bir yolculuk oldu ama ${selectedStudent.name} pusulasını doğru kullanarak ana hazineyi ele geçirdi! 🧭✨"
                                ).random()
                                TreasureVictoryType.CANDIES -> listOf(
                                    "Korsanlar altınları kapmış... 🏴‍☠️ Ama üzülmek yok, ${selectedStudent.name} nefis lolipoplar ve tatlılar kazandı! 🍬🍭🧁🥰",
                                    "Korsanlar hazineyi almış olabilir ama ${selectedStudent.name} son sandıkta dünyanın en tatlı ödülünü buldu! 🍫🍭 Gerçek zafer bu! 🍬",
                                    "Altınlar korsanların olsun, asıl ödül tatlılardı! 🧁 ${selectedStudent.name} lezzet dolu sandığı bularak günün kazananı oldu! 🍫🎉",
                                    "Korsanlar paranın peşine düşerken, ${selectedStudent.name} akıllıca davranıp şekerleme dolu gizli zulayı keşfetti! 🍬🍭🧁"
                                ).random()
                                else -> ""
                            }
                        }

                        Text(
                            text = explanation,
                            fontSize = 14.sp,
                            color = Color(0xFF334155),
                            textAlign = TextAlign.Center,
                            lineHeight = 19.sp,
                            fontWeight = FontWeight.Medium,
                            modifier = Modifier
                                .background(Color(0xFFF8FAFC), RoundedCornerShape(12.dp))
                                .padding(12.dp)
                        )

                        Spacer(modifier = Modifier.height(24.dp))

                        // Actions row
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            // Tekrar Dene / Tekrar Oyna
                            Button(
                                onClick = {
                                    // Önce kazanan öğrenciyi seçilmiş sayıp listeden kaldırıyoruz
                                    onWinnerSelected(selectedStudent)
                                    resetTrigger++
                                    // Parçacıkları temizliyoruz
                                    particles.clear()
                                },
                                modifier = Modifier
                                    .weight(1f)
                                    .height(48.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFE2E8F0)),
                                shape = RoundedCornerShape(12.dp)
                            ) {
                                Icon(Icons.Default.Refresh, contentDescription = null, tint = Color(0xFF475569))
                                Spacer(modifier = Modifier.width(4.dp))
                                Text("YENİDEN", color = Color(0xFF475569), fontWeight = FontWeight.Bold, fontSize = 12.sp)
                            }

                            // Devam Et -> Calls onWinnerSelected and advances
                            Button(
                                onClick = {
                                    onWinnerSelected(selectedStudent)
                                },
                                modifier = Modifier
                                    .weight(1.2f)
                                    .height(48.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFD97706)),
                                shape = RoundedCornerShape(12.dp)
                            ) {
                                Text("DEVAM ET", fontWeight = FontWeight.Bold, color = Color.White, fontSize = 12.sp)
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun HeroSignalGameView(students: List<Student>, teacherCity: String = "Sivas", onWinnerSelected: (Student) -> Unit) {
    if (students.isEmpty()) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Text("Kahraman Sinyali için en az 1 öğrenci seçmelisiniz.", color = Color(0xFF64748B))
        }
        return
    }

    var resetTrigger by remember { mutableIntStateOf(0) }
    val selectedHero = remember(students, resetTrigger) { students.random() }

    var isSearching by remember(students, resetTrigger) { mutableStateOf(false) }
    var isFinished by remember(students, resetTrigger) { mutableStateOf(false) }
    var searchIndicatorName by remember { mutableStateOf("") }

    val infiniteTransition = rememberInfiniteTransition(label = "searchlight_anim")
    
    // Sweep search angle back and forth
    val sweepAngle by infiniteTransition.animateFloat(
        initialValue = -35f,
        targetValue = 35f,
        animationSpec = infiniteRepeatable(
            animation = tween(2200, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "sweep"
    )

    // Beam pulse brightness
    val beamPulse by infiniteTransition.animateFloat(
        initialValue = 0.5f,
        targetValue = 0.95f,
        animationSpec = infiniteRepeatable(
            animation = tween(400, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "pulse"
    )

    // Stars twinkle alpha
    val starAlpha by infiniteTransition.animateFloat(
        initialValue = 0.2f,
        targetValue = 1.0f,
        animationSpec = infiniteRepeatable(
            animation = tween(1200, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "stars"
    )

    var flashAlpha by remember { mutableStateOf(0f) }

    LaunchedEffect(isSearching) {
        if (isSearching) {
            val searchJob = launch {
                while(true) {
                    searchIndicatorName = students.random().name.uppercase()
                    SoundHelper.playTick()
                    delay(120)
                }
            }
            delay(2800)
            searchJob.cancel()
            flashAlpha = 1.0f
            isSearching = false
            isFinished = true
            SoundHelper.playSuccess()
        }
    }

    LaunchedEffect(flashAlpha) {
        if (flashAlpha > 0f) {
            while (flashAlpha > 0f) {
                delay(20)
                flashAlpha = (flashAlpha - 0.12f).coerceAtLeast(0f)
            }
        }
    }

    BoxWithConstraints(
        modifier = Modifier
            .fillMaxSize()
            .clipToBounds()
            .background(
                brush = androidx.compose.ui.graphics.Brush.verticalGradient(
                    colors = listOf(Color(0xFF030712), Color(0xFF1E1E38))
                ),
                shape = RoundedCornerShape(12.dp)
            )
    ) {
        val width = constraints.maxWidth.toFloat()
        val height = constraints.maxHeight.toFloat()
        val isWide = width > 600f

        // Draw Twinkling Stars
        Canvas(modifier = Modifier.fillMaxSize()) {
            val starPositions = listOf(
                Offset(0.12f, 0.15f), Offset(0.25f, 0.08f), Offset(0.40f, 0.22f), Offset(0.55f, 0.05f),
                Offset(0.70f, 0.18f), Offset(0.85f, 0.10f), Offset(0.92f, 0.25f), Offset(0.05f, 0.35f),
                Offset(0.20f, 0.30f), Offset(0.35f, 0.45f), Offset(0.50f, 0.35f), Offset(0.65f, 0.40f)
            )
            starPositions.forEach { percent ->
                drawCircle(
                    color = Color.White.copy(alpha = starAlpha),
                    radius = 3f + (percent.x * 3f),
                    center = Offset(percent.x * size.width, percent.y * size.height)
                )
            }
        }

        // Draw Searchlight Beam if searching or idle (idle beam is static/gentle)
        if (isSearching || (isFinished && flashAlpha <= 0f)) {
            Canvas(modifier = Modifier.fillMaxSize()) {
                val beamLength = size.height * 0.95f
                val currentAngle = if (isSearching) sweepAngle else 0f
                val rad = Math.toRadians((currentAngle - 90f).toDouble())
                val centerX = size.width / 2f
                val centerY = size.height * 0.95f

                val dirX = Math.cos(rad).toFloat()
                val dirY = Math.sin(rad).toFloat()

                val perpX = -dirY
                val perpY = dirX

                val topCenter = Offset(centerX + dirX * beamLength, centerY + dirY * beamLength)
                val topWidth = size.width * 0.25f

                val point1 = Offset(centerX - perpX * 16f, centerY - perpY * 16f)
                val point2 = Offset(topCenter.x - perpX * topWidth, topCenter.y - perpY * topWidth)
                val point3 = Offset(topCenter.x + perpX * topWidth, topCenter.y + perpY * topWidth)
                val point4 = Offset(centerX + perpX * 16f, centerY + perpY * 16f)

                val beamPath = Path().apply {
                    moveTo(point1.x, point1.y)
                    lineTo(point2.x, point2.y)
                    lineTo(point3.x, point3.y)
                    lineTo(point4.x, point4.y)
                    close()
                }

                drawPath(
                    path = beamPath,
                    brush = androidx.compose.ui.graphics.Brush.radialGradient(
                        colors = listOf(
                            Color(0xFF22D3EE).copy(alpha = beamPulse * 0.45f),
                            Color(0xFF3B82F6).copy(alpha = beamPulse * 0.15f),
                            Color.Transparent
                        ),
                        center = Offset(centerX, centerY),
                        radius = beamLength
                    )
                )

                // Render Glowing Signal Aura high in the clouds
                drawCircle(
                    color = Color(0xFF22D3EE).copy(alpha = beamPulse * 0.3f),
                    radius = topWidth * 1.3f,
                    center = topCenter
                )
                drawCircle(
                    color = Color.White.copy(alpha = beamPulse * 0.55f),
                    radius = topWidth * 0.85f,
                    center = topCenter
                )
            }
        }

        // City skyline at bottom
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .fillMaxHeight(0.35f)
                .align(Alignment.BottomCenter),
            horizontalArrangement = Arrangement.SpaceAround,
            verticalAlignment = Alignment.Bottom
        ) {
            listOf(
                Triple(70.dp, 120.dp, listOf(1, 2)),
                Triple(90.dp, 175.dp, listOf(2, 3, 2)),
                Triple(115.dp, 135.dp, listOf(2, 2)),
                Triple(85.dp, 155.dp, listOf(3, 2)),
                Triple(68.dp, 105.dp, listOf(1, 1))
            ).forEach { (bWidth, bHeight, windowConfig) ->
                Box(
                    modifier = Modifier
                        .width(bWidth)
                        .height(bHeight)
                        .background(Color(0xFF0F172A), RoundedCornerShape(topStart = 8.dp, topEnd = 8.dp))
                        .border(1.dp, Color(0xFF1E293B), RoundedCornerShape(topStart = 8.dp, topEnd = 8.dp))
                        .padding(8.dp)
                ) {
                    Column(
                        verticalArrangement = Arrangement.spacedBy(5.dp),
                        modifier = Modifier.fillMaxSize()
                    ) {
                        windowConfig.forEach { cols ->
                            Row(
                                horizontalArrangement = Arrangement.spacedBy(4.dp),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                repeat(cols) {
                                    Box(
                                        modifier = Modifier
                                            .size(6.dp, 8.dp)
                                            .background(
                                                if (Random.nextFloat() > 0.35f) Color(0xFFFDE047).copy(alpha = 0.85f)
                                                else Color(0xFF334155)
                                            )
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }

        // Projector Light unit sitting in front of city
        Box(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .offset(y = 12.dp)
                .size(100.dp, 60.dp)
                .background(
                    brush = androidx.compose.ui.graphics.Brush.verticalGradient(
                        colors = listOf(Color(0xFF334155), Color(0xFF0F172A))
                    ),
                    shape = RoundedCornerShape(topStart = 50.dp, topEnd = 50.dp)
                )
                .border(2.dp, Color(0xFF64748B), RoundedCornerShape(topStart = 50.dp, topEnd = 50.dp)),
            contentAlignment = Alignment.TopCenter
        ) {
            Box(
                modifier = Modifier
                    .padding(top = 4.dp)
                    .size(60.dp, 14.dp)
                    .background(Color(0xFF22D3EE), RoundedCornerShape(6.dp))
                    .border(2.dp, Color.White, RoundedCornerShape(6.dp))
            )
        }

        // Search Interface Layer
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(16.dp)
        ) {
            if (isSearching) {
                // Circular scanner radar
                Column(
                    modifier = Modifier.align(Alignment.Center),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Box(
                        modifier = Modifier.size(160.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        val searchPulse by infiniteTransition.animateFloat(
                            initialValue = 0.5f,
                            targetValue = 1.6f,
                            animationSpec = infiniteRepeatable(
                                animation = tween(1200, easing = LinearEasing),
                                repeatMode = RepeatMode.Restart
                            ),
                            label = "search_pulse"
                        )
                        Box(
                            modifier = Modifier
                                .size(120.dp)
                                .graphicsLayer {
                                    scaleX = searchPulse
                                    scaleY = searchPulse
                                    alpha = (1.6f - searchPulse).coerceIn(0f, 1f)
                                }
                                .border(3.dp, Color(0xFF22D3EE), CircleShape)
                        )

                        val radarAngle by infiniteTransition.animateFloat(
                            initialValue = 0f,
                            targetValue = 360f,
                            animationSpec = infiniteRepeatable(
                                animation = tween(2000, easing = LinearEasing),
                                repeatMode = RepeatMode.Restart
                            ),
                            label = "radar_angle"
                        )

                        Canvas(modifier = Modifier.fillMaxSize()) {
                            drawCircle(color = Color(0xFF06B6D4).copy(alpha = 0.15f), radius = size.minDimension / 2.3f)
                            val angleRad = Math.toRadians(radarAngle.toDouble())
                            val endX = (size.width / 2) + Math.cos(angleRad).toFloat() * (size.minDimension / 2.3f)
                            val endY = (size.height / 2) + Math.sin(angleRad).toFloat() * (size.minDimension / 2.3f)
                            drawLine(
                                color = Color(0xFF22D3EE),
                                start = Offset(size.width / 2, size.height / 2),
                                end = Offset(endX, endY),
                                strokeWidth = 3f
                            )
                        }

                        Text(
                            text = "🦇",
                            fontSize = 36.sp
                        )
                    }

                    Spacer(modifier = Modifier.height(16.dp))
                    Text(
                        text = "KAHRAMAN ARANIYOR...\n$searchIndicatorName",
                        fontWeight = FontWeight.Black,
                        fontSize = 16.sp,
                        color = Color(0xFFFBBF24),
                        textAlign = TextAlign.Center,
                        modifier = Modifier
                            .background(Color.Black.copy(alpha = 0.65f), RoundedCornerShape(8.dp))
                            .padding(horizontal = 16.dp, vertical = 8.dp)
                    )
                }
            } else if (!isFinished) {
                // Welcome screen controller
                Column(
                    modifier = Modifier.align(Alignment.Center),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(
                        text = "GÖKYÜZÜ KORUYUCUSUZ KALDI!",
                        color = Color.White,
                        fontSize = 20.sp,
                        fontWeight = FontWeight.Black,
                        textAlign = TextAlign.Center
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = "Sinyali gökyüzüne fırlatıp sınıfımızın gizemli kahramanını çağırın!",
                        color = Color(0xFF94A3B8),
                        fontSize = 13.sp,
                        textAlign = TextAlign.Center,
                        modifier = Modifier.padding(horizontal = 24.dp)
                    )
                    Spacer(modifier = Modifier.height(24.dp))

                    Button(
                        onClick = { isSearching = true },
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFEAB308)),
                        shape = RoundedCornerShape(16.dp),
                        modifier = Modifier
                            .height(56.dp)
                            .width(220.dp),
                        elevation = ButtonDefaults.buttonElevation(8.dp)
                    ) {
                        Text("🦇 SİNYALİ ÇALIŞTIR", fontWeight = FontWeight.Black, color = Color.Black, fontSize = 14.sp)
                    }
                }
            }
        }

        // White screen lightning bolt flash overlay
        if (flashAlpha > 0f) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Color.White.copy(alpha = flashAlpha))
            )
        }

        // Success Winner Screen Overlays
        if (isFinished && flashAlpha <= 0f) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Color.Black.copy(alpha = 0.65f)),
                contentAlignment = Alignment.Center
            ) {
                Card(
                    shape = RoundedCornerShape(24.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White),
                    modifier = Modifier
                        .width(340.dp)
                        .padding(16.dp),
                    elevation = CardDefaults.cardElevation(12.dp)
                ) {
                    Column(
                        modifier = Modifier.padding(24.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Box(
                            modifier = Modifier
                                .offset(y = (-44).dp)
                                .size(88.dp)
                                .background(
                                    brush = androidx.compose.ui.graphics.Brush.sweepGradient(
                                        colors = listOf(Color(0xFFEAB308), Color(0xFFF59E0B), Color(0xFFEAB308))
                                    ),
                                    shape = CircleShape
                                )
                                .border(4.dp, Color.White, CircleShape),
                            contentAlignment = Alignment.Center
                        ) {
                            Text("🦸‍♂️", fontSize = 48.sp)
                        }

                        Text(
                            text = "⚡ KAHRAMAN BULUNDU! ⚡",
                            fontWeight = FontWeight.Black,
                            fontSize = 18.sp,
                            color = Color(0xFF1E293B),
                            textAlign = TextAlign.Center
                        )

                        Spacer(modifier = Modifier.height(12.dp))

                        Text(
                            text = "✨ ${selectedHero.name} ${selectedHero.surname} ✨".uppercase(),
                            fontWeight = FontWeight.Black,
                            fontSize = 24.sp,
                            color = Color(0xFFD97706),
                            textAlign = TextAlign.Center
                        )
                        Text(
                            text = "Gecenin Yeni Koruyucusu (Nu: ${selectedHero.studentNo})",
                            fontSize = 13.sp,
                            color = Color(0xFF64748B),
                            fontWeight = FontWeight.Bold
                        )

                        Spacer(modifier = Modifier.height(16.dp))

                        val randomMessages = listOf(
                            "${teacherCity} uykudayken gökyüzünde parlayan muhteşem sinyalimiz ${selectedHero.name}'i çağırdı! ⚡ Gücü, adaleti ve peleriniyle bu gece sınıfımız ona emanet! 🦸‍♂️🦇🌟",
                            "Sinyal göğe yükseldiğinde tüm şehir ${selectedHero.name}'in adını fısıldadı! 🦸 Adaletin yeni temsilcisi göreve hazır! ✨",
                            "Karanlık bulutların arasından süzülen ışık ${selectedHero.name}'i seçti! ⚡ Bu zorlu görevde ${teacherCity} artık çok daha güvende! 🦇",
                            "Kimse beklemiyordu ama sinyal tam da ${selectedHero.name}'i gösterdi! 🌟 Kahramanlık pelerinini dalgalandırma vakti geldi! 🦸‍♂️",
                            "${teacherCity} semalarındaki bu devasa ışık huzmesi gerçek kahramanı buldu: ${selectedHero.name}! 🦇 Sınıfımızın yeni umudu o! ⚡",
                            "Süper güçlere gerek yok, kocaman bir yürek yeter! 🌟 Sinyal ${selectedHero.name}'in cesaretini tüm şehre ilan etti! 🦸",
                            "Gökyüzündeki parlak çağrı cevapsız kalmadı! ⚡ ${selectedHero.name} pelerinini taktı ve adaleti sağlamak için yola çıktı! 🦇"
                        )
                        
                        val displayedMessage = remember(selectedHero.id) { randomMessages.random() }

                        Text(
                            text = displayedMessage,
                            fontSize = 14.sp,
                            color = Color(0xFF334155),
                            textAlign = TextAlign.Center,
                            lineHeight = 19.sp,
                            fontWeight = FontWeight.Medium,
                            modifier = Modifier
                                .background(Color(0xFFF8FAFC), RoundedCornerShape(12.dp))
                                .padding(12.dp)
                        )

                        Spacer(modifier = Modifier.height(24.dp))

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Button(
                                onClick = {
                                    onWinnerSelected(selectedHero)
                                    resetTrigger++
                                },
                                modifier = Modifier
                                    .weight(1f)
                                    .height(48.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFE2E8F0)),
                                shape = RoundedCornerShape(12.dp)
                            ) {
                                Icon(Icons.Default.Refresh, contentDescription = null, tint = Color(0xFF475569))
                                Spacer(modifier = Modifier.width(4.dp))
                                Text("YENİDEN", color = Color(0xFF475569), fontWeight = FontWeight.Bold, fontSize = 12.sp)
                            }

                            Button(
                                onClick = {
                                    onWinnerSelected(selectedHero)
                                },
                                modifier = Modifier
                                    .weight(1.2f)
                                    .height(48.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFD97706)),
                                shape = RoundedCornerShape(12.dp)
                            ) {
                                Text("DEVAM ET", fontWeight = FontWeight.Bold, color = Color.White, fontSize = 12.sp)
                            }
                        }
                    }
                }
            }
        }
    }
}


