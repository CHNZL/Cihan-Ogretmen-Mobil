package com.example.ui.dashboard.tabs

import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.auth.UserData
import com.example.utils.SoundHelper
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

@Composable
fun TimerTab(userData: UserData) {
    var isCountdownMode by remember { mutableStateOf(true) }
    var soundEnabled by remember { mutableStateOf(true) }

    // Countdown State
    var countdownDurationTotalSeconds by remember { mutableStateOf(300L) } // Default 5 mins (300s)
    var countdownRemainingSeconds by remember { mutableStateOf(300L) }
    var isCountdownRunning by remember { mutableStateOf(false) }

    // Stopwatch State
    var stopwatchElapsedSeconds by remember { mutableStateOf(0L) }
    var isStopwatchRunning by remember { mutableStateOf(false) }

    // Dialog state for custom duration
    var showSettingsDialog by remember { mutableStateOf(false) }

    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val firestoreRepository = remember { com.example.data.FirestoreRepository() }
    val configuration = LocalConfiguration.current
    val isLandscape = configuration.orientation == android.content.res.Configuration.ORIENTATION_LANDSCAPE

    val baseColors = listOf(
        Color(0xFFFFFFFF), // 0: Default white when not running or 0 mins
        Color(0xFFF0FDF4), // 1: Greenish
        Color(0xFFFEFCE8), // 2: Yellowish
        Color(0xFFFFF1F2), // 3: Reddish
        Color(0xFFF5F3FF), // 4: Purpleish
        Color(0xFFF0F9FF), // 5: Blueish
        Color(0xFFFFF7ED)  // 6: Orangeish
    )
    
    val currentMinute = (countdownRemainingSeconds / 60).toInt()
    val targetColor = if (isCountdownMode) {
        if (countdownRemainingSeconds > 0) baseColors[(currentMinute % (baseColors.size - 1)) + 1] else baseColors[0]
    } else {
        baseColors[0]
    }
    
    val animatedBgColor by animateColorAsState(
        targetValue = targetColor,
        animationSpec = tween(1500)
    )

    // Initialize sound if needed
    LaunchedEffect(Unit) {
        SoundHelper.init(context)
    }

    // Timer Ticker
    LaunchedEffect(isCountdownRunning, isCountdownMode) {
        if (isCountdownRunning && isCountdownMode) {
            while (countdownRemainingSeconds > 0 && isCountdownRunning) {
                delay(1000L)
                if (isCountdownRunning) {
                    countdownRemainingSeconds--
                    if (soundEnabled && countdownRemainingSeconds > 0) {
                        SoundHelper.playTick()
                    }
                    if (countdownRemainingSeconds == 0L) {
                        isCountdownRunning = false
                        // Play happy finish alarm
                        scope.launch {
                            repeat(3) {
                                SoundHelper.playSuccess()
                                delay(600)
                            }
                        }
                    }
                }
            }
        }
    }

    // Stopwatch Ticker
    LaunchedEffect(isStopwatchRunning, isCountdownMode) {
        if (isStopwatchRunning && !isCountdownMode) {
            while (isStopwatchRunning) {
                delay(1000L)
                if (isStopwatchRunning) {
                    stopwatchElapsedSeconds++
                    if (soundEnabled) {
                        SoundHelper.playTick()
                    }
                }
            }
        }
    }

    // Helper functions to format time (MM:SS)
    fun formatTime(seconds: Long): String {
        val mins = seconds / 60
        val secs = seconds % 60
        return String.format("%02d:%02d", mins, secs)
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(
                    colors = listOf(
                        Color(0xFFF8FAFC),
                        Color(0xFFF1F5F9)
                    )
                )
            )
            .padding(24.dp),
        contentAlignment = Alignment.Center
    ) {
        Column(
            modifier = Modifier
                .widthIn(max = 640.dp)
                .fillMaxHeight(),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(20.dp)
        ) {
            // -- MAIN WORKSPACE --
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f),
                shape = RoundedCornerShape(32.dp),
                colors = CardDefaults.cardColors(containerColor = animatedBgColor),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
            ) {
                if (isLandscape) {
                    // LANDSCAPE MODE: Left side (Time & Mode), Right side (Controls)
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceEvenly
                    ) {
                        // Left side
                        Column(
                            modifier = Modifier.weight(1f),
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.spacedBy(16.dp)
                        ) {
                            // Selector
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth(0.9f)
                                    .clip(RoundedCornerShape(20.dp))
                                    .background(Color(0xFFF8FAFC))
                                    .border(1.dp, Color(0xFFE2E8F0), RoundedCornerShape(20.dp))
                                    .padding(4.dp),
                                horizontalArrangement = Arrangement.SpaceEvenly
                            ) {
                                Box(
                                    modifier = Modifier
                                        .weight(1f)
                                        .clip(RoundedCornerShape(16.dp))
                                        .background(if (isCountdownMode) Color.White else Color.Transparent)
                                        .clickable {
                                            isCountdownMode = true
                                            if (soundEnabled) SoundHelper.playTick()
                                            // ... repo call ...
                                        }
                                        .padding(vertical = 8.dp)
                                        .then(if (isCountdownMode) Modifier.shadow(2.dp, RoundedCornerShape(16.dp), clip = false) else Modifier),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Text("GERİ SAYIM", fontWeight = FontWeight.Bold, fontSize = 11.sp, color = if (isCountdownMode) Color(0xFF1E293B) else Color(0xFF64748B))
                                }
                                Box(
                                    modifier = Modifier
                                        .weight(1f)
                                        .clip(RoundedCornerShape(16.dp))
                                        .background(if (!isCountdownMode) Color.White else Color.Transparent)
                                        .clickable {
                                            isCountdownMode = false
                                            if (soundEnabled) SoundHelper.playTick()
                                            // ... repo call ...
                                        }
                                        .padding(vertical = 8.dp)
                                        .then(if (!isCountdownMode) Modifier.shadow(2.dp, RoundedCornerShape(16.dp), clip = false) else Modifier),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Text("KRONOMETRE", fontWeight = FontWeight.Bold, fontSize = 11.sp, color = if (!isCountdownMode) Color(0xFF1E293B) else Color(0xFF64748B))
                                }
                            }

                            // Time Display
                            val activeTimeText = if (isCountdownMode) formatTime(countdownRemainingSeconds) else formatTime(stopwatchElapsedSeconds)
                            Text(
                                text = activeTimeText,
                                fontSize = 60.sp,
                                fontWeight = FontWeight.Black,
                                color = if (isCountdownMode && countdownRemainingSeconds < 10 && countdownRemainingSeconds > 0) Color(0xFFEF4444) else Color(0xFF0F172A)
                            )
                        }

                        // Right side
                        Column(
                            modifier = Modifier.weight(1f),
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.spacedBy(16.dp)
                        ) {
                            // Sound Button
                            IconButton(onClick = { soundEnabled = !soundEnabled }, modifier = Modifier.background(if (soundEnabled) Color(0xFFEEF2FF) else Color(0xFFF1F5F9), CircleShape).size(48.dp)) {
                                Icon(if (soundEnabled) Icons.Default.VolumeUp else Icons.Default.VolumeOff, contentDescription = null, tint = if (soundEnabled) Color(0xFF6366F1) else Color(0xFF94A3B8))
                            }
                            
                            // Play/Pause & Reset
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceAround,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                // Reset
                                IconButton(
                                    onClick = {
                                        if (soundEnabled) SoundHelper.playBoing()
                                        if (isCountdownMode) {
                                            isCountdownRunning = false
                                            countdownRemainingSeconds = countdownDurationTotalSeconds
                                        } else {
                                            isStopwatchRunning = false
                                            stopwatchElapsedSeconds = 0
                                        }
                                    },
                                    modifier = Modifier.shadow(2.dp, CircleShape).background(Color.White, CircleShape).size(48.dp)
                                ) {
                                    Icon(Icons.Default.Refresh, contentDescription = null, tint = Color(0xFF475569))
                                }

                                // Play
                                val isCurrentRunning = if (isCountdownMode) isCountdownRunning else isStopwatchRunning
                                val mainColor = if (isCurrentRunning) Color(0xFFEF4444) else Color(0xFF8B5CF6)
                                Box(
                                    modifier = Modifier.shadow(6.dp, CircleShape).size(64.dp).background(mainColor, CircleShape).clickable {
                                        if (soundEnabled) SoundHelper.playTick()
                                        if (isCountdownMode) {
                                            if (countdownRemainingSeconds == 0L) countdownRemainingSeconds = countdownDurationTotalSeconds
                                            isCountdownRunning = !isCountdownRunning
                                        } else {
                                            isStopwatchRunning = !isStopwatchRunning
                                        }
                                    },
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(if (isCurrentRunning) Icons.Default.Pause else Icons.Default.PlayArrow, contentDescription = null, tint = Color.White, modifier = Modifier.size(32.dp))
                                }

                                // Settings (Only in countdown mode)
                                if (isCountdownMode && !isCountdownRunning) {
                                    IconButton(
                                        onClick = { showSettingsDialog = true },
                                        modifier = Modifier.shadow(2.dp, CircleShape).background(Color.White, CircleShape).size(48.dp)
                                    ) {
                                        Icon(Icons.Default.Settings, contentDescription = null, tint = Color(0xFF475569))
                                    }
                                } else {
                                    Spacer(modifier = Modifier.size(48.dp))
                                }
                            }
                        }
                    }
                } else {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(24.dp)
                            .fillMaxHeight(),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.SpaceBetween
                    ) {
                    // 1. Selector Tab Bar (GERI SAYIM vs KRONOMETRE) and volume control
                    Row(
                        modifier = Modifier
                            .fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(
                            modifier = Modifier
                                .weight(1f)
                                .clip(RoundedCornerShape(20.dp))
                                .background(Color(0xFFF8FAFC))
                                .border(1.dp, Color(0xFFE2E8F0), RoundedCornerShape(20.dp))
                                .padding(4.dp),
                            horizontalArrangement = Arrangement.SpaceEvenly
                        ) {
                            Box(
                                modifier = Modifier
                                    .weight(1f)
                                    .clip(RoundedCornerShape(16.dp))
                                    .background(if (isCountdownMode) Color.White else Color.Transparent)
                                    .clickable {
                                        isCountdownMode = true
                                        if (soundEnabled) SoundHelper.playTick()
                                        firestoreRepository.updateRemoteControlState(
                                            teacherUid = userData.userId,
                                            activeTab = "timer",
                                            timerCommand = "TOGGLE_MODE",
                                            timerMode = "countdown",
                                            duration = countdownDurationTotalSeconds,
                                            remaining = countdownRemainingSeconds
                                        )
                                    }
                                    .padding(vertical = 12.dp)
                                    .then(if (isCountdownMode) Modifier.shadow(2.dp, RoundedCornerShape(16.dp), clip = false) else Modifier),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    text = "GERİ SAYIM",
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 13.sp,
                                    color = if (isCountdownMode) Color(0xFF1E293B) else Color(0xFF64748B)
                                )
                            }
    
                            Box(
                                modifier = Modifier
                                    .weight(1f)
                                    .clip(RoundedCornerShape(16.dp))
                                    .background(if (!isCountdownMode) Color.White else Color.Transparent)
                                    .clickable {
                                        isCountdownMode = false
                                        if (soundEnabled) SoundHelper.playTick()
                                        firestoreRepository.updateRemoteControlState(
                                            teacherUid = userData.userId,
                                            activeTab = "timer",
                                            timerCommand = "TOGGLE_MODE",
                                            timerMode = "stopwatch",
                                            duration = 0L,
                                            remaining = stopwatchElapsedSeconds
                                        )
                                    }
                                    .padding(vertical = 12.dp)
                                    .then(if (!isCountdownMode) Modifier.shadow(2.dp, RoundedCornerShape(16.dp), clip = false) else Modifier),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    text = "KRONOMETRE",
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 13.sp,
                                    color = if (!isCountdownMode) Color(0xFF1E293B) else Color(0xFF64748B)
                                )
                            }
                        }
                        
                        Spacer(modifier = Modifier.width(16.dp))
                        
                        IconButton(
                            onClick = {
                                soundEnabled = !soundEnabled
                                SoundHelper.playTick()
                            },
                            modifier = Modifier
                                .background(
                                    if (soundEnabled) Color(0xFFEEF2FF) else Color(0xFFF1F5F9),
                                    CircleShape
                                )
                                .size(48.dp)
                        ) {
                            Icon(
                                imageVector = if (soundEnabled) Icons.Default.VolumeUp else Icons.Default.VolumeOff,
                                contentDescription = "Ses Aç/Kapat",
                                tint = if (soundEnabled) Color(0xFF6366F1) else Color(0xFF94A3B8),
                                modifier = Modifier.size(24.dp)
                            )
                        }
                    }

                    // 2. Large Time Display with dynamic progress animation
                    Box(
                        modifier = Modifier
                            .then(if (isLandscape) Modifier.heightIn(min = 150.dp) else Modifier.weight(1f))
                            .padding(vertical = if (isLandscape) 4.dp else 16.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        // Large Display Text
                        val activeTimeText = if (isCountdownMode) {
                            formatTime(countdownRemainingSeconds)
                        } else {
                            formatTime(stopwatchElapsedSeconds)
                        }

                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Text(
                                text = activeTimeText,
                                fontSize = 68.sp,
                                fontWeight = FontWeight.Black,
                                fontFamily = FontFamily.SansSerif,
                                color = if (isCountdownMode && countdownRemainingSeconds < 10 && countdownRemainingSeconds > 0) {
                                    Color(0xFFEF4444) // warning red under 10 seconds
                                } else {
                                    Color(0xFF0F172A)
                                },
                                letterSpacing = (-1).sp
                            )
                            if (isCountdownMode && countdownRemainingSeconds == 0L) {
                                Text(
                                    text = "SÜRE BİTTİ! 🚀",
                                    fontSize = 14.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color(0xFF10B981)
                                )
                            }
                        }
                    }

                    // 3. Central Circular Action Controls (Reset, Play/Pause, Settings)
                    Row(
                        modifier = Modifier.fillMaxWidth(0.85f),
                        horizontalArrangement = Arrangement.SpaceAround,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        // RESET BUTTON (Left)
                        IconButton(
                            onClick = {
                                if (soundEnabled) SoundHelper.playBoing()
                                if (isCountdownMode) {
                                    isCountdownRunning = false
                                    countdownRemainingSeconds = countdownDurationTotalSeconds
                                    firestoreRepository.updateRemoteControlState(
                                        teacherUid = userData.userId,
                                        activeTab = "timer",
                                        timerCommand = "RESET",
                                        duration = countdownDurationTotalSeconds,
                                        remaining = countdownDurationTotalSeconds
                                    )
                                } else {
                                    isStopwatchRunning = false
                                    stopwatchElapsedSeconds = 0
                                    firestoreRepository.updateRemoteControlState(
                                        teacherUid = userData.userId,
                                        activeTab = "timer",
                                        timerCommand = "RESET",
                                        duration = 0L,
                                        remaining = 0L
                                    )
                                }
                            },
                            modifier = Modifier
                                .shadow(2.dp, CircleShape)
                                .background(Color.White, CircleShape)
                                .size(56.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.Refresh,
                                contentDescription = "Sıfırla",
                                tint = Color(0xFF475569),
                                modifier = Modifier.size(26.dp)
                            )
                        }

                        // PLAY/PAUSE BIG BUTTON (Center)
                        val isCurrentRunning = if (isCountdownMode) isCountdownRunning else isStopwatchRunning
                        val mainColor = if (isCurrentRunning) Color(0xFFEF4444) else Color(0xFF8B5CF6)
                        
                        Box(
                            modifier = Modifier
                                .shadow(8.dp, CircleShape)
                                .size(84.dp)
                                .background(mainColor, CircleShape)
                                .clickable {
                                    if (soundEnabled) SoundHelper.playTick()
                                    if (isCountdownMode) {
                                        if (countdownRemainingSeconds == 0L) {
                                            countdownRemainingSeconds = countdownDurationTotalSeconds
                                        }
                                        val newState = !isCountdownRunning
                                        isCountdownRunning = newState
                                        firestoreRepository.updateRemoteControlState(
                                            teacherUid = userData.userId,
                                            activeTab = "timer",
                                            timerCommand = if (newState) "START" else "PAUSE",
                                            duration = countdownDurationTotalSeconds,
                                            remaining = countdownRemainingSeconds
                                        )
                                    } else {
                                        val newState = !isStopwatchRunning
                                        isStopwatchRunning = newState
                                        firestoreRepository.updateRemoteControlState(
                                            teacherUid = userData.userId,
                                            activeTab = "timer",
                                            timerCommand = if (newState) "START" else "PAUSE",
                                            duration = 0L,
                                            remaining = stopwatchElapsedSeconds
                                        )
                                    }
                                },
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = if (isCurrentRunning) Icons.Default.Pause else Icons.Default.PlayArrow,
                                contentDescription = if (isCurrentRunning) "Durdur" else "Başlat",
                                tint = Color.White,
                                modifier = Modifier.size(40.dp)
                            )
                        }

                        // SETTINGS BUTTON (Right)
                        IconButton(
                            onClick = {
                                if (soundEnabled) SoundHelper.playTick()
                                if (isCountdownMode) {
                                    showSettingsDialog = true
                                } else {
                                    // settings option for countdown only
                                }
                            },
                            enabled = isCountdownMode,
                            modifier = Modifier
                                .shadow(2.dp, CircleShape)
                                .background(if (isCountdownMode) Color.White else Color(0xFFF1F5F9), CircleShape)
                                .size(56.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.Settings,
                                contentDescription = "Ayarlar",
                                tint = if (isCountdownMode) Color(0xFF475569) else Color(0xFFCBD5E1),
                                modifier = Modifier.size(26.dp)
                            )
                        }
                    }

                    // 4. Quick Selection Pills (Only visible and enabled on Countdown Mode)
                    AnimatedVisibility(
                        visible = isCountdownMode,
                        enter = fadeIn() + expandVertically(),
                        exit = fadeOut() + shrinkVertically()
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                                val intervals = listOf(
                                    "1 dk" to 60L,
                                    "2 dk" to 120L,
                                    "3 dk" to 180L,
                                    "5 dk" to 300L,
                                    "10 dk" to 600L
                                )

                                intervals.forEach { pair ->
                                    Box(
                                        modifier = Modifier
                                            .weight(1f)
                                            .clip(RoundedCornerShape(12.dp))
                                            .background(Color(0xFFEEF2FF))
                                            .clickable {
                                                if (soundEnabled) SoundHelper.playCoin()
                                                isCountdownRunning = false
                                                countdownDurationTotalSeconds = pair.second
                                                countdownRemainingSeconds = pair.second
                                                firestoreRepository.updateRemoteControlState(
                                                    teacherUid = userData.userId,
                                                    activeTab = "timer",
                                                    timerCommand = "SET_TIME",
                                                    duration = countdownDurationTotalSeconds,
                                                    remaining = countdownRemainingSeconds
                                                )
                                            }
                                            .padding(vertical = 12.dp),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Text(
                                            text = pair.first,
                                            fontSize = 13.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = Color(0xFF4F46E5)
                                        )
                                    }
                                }
                        }
                    }
                } // End of Column
                } // End of else
            }
        }
    }

    // Modal Settings Dialog (To change duration manually)
    if (showSettingsDialog) {
        var inputMins by remember { mutableStateOf((countdownDurationTotalSeconds / 60).toString()) }
        var inputSecs by remember { mutableStateOf((countdownDurationTotalSeconds % 60).toString()) }

        AlertDialog(
            onDismissRequest = { showSettingsDialog = false },
            title = {
                Text(
                    text = "Süreyi Özelleştir",
                    fontWeight = FontWeight.Bold,
                    fontSize = 18.sp,
                    color = Color(0xFF1E293B)
                )
            },
            text = {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 8.dp),
                    horizontalArrangement = Arrangement.spacedBy(16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    OutlinedTextField(
                        value = inputMins,
                        onValueChange = { inputMins = it.filter { char -> char.isDigit() } },
                        label = { Text("Dakika") },
                        modifier = Modifier.weight(1f),
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number)
                    )

                    Text(
                        text = ":",
                        fontSize = 24.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF64748B)
                    )

                    OutlinedTextField(
                        value = inputSecs,
                        onValueChange = { inputSecs = it.filter { char -> char.isDigit() } },
                        label = { Text("Saniye") },
                        modifier = Modifier.weight(1f),
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number)
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (soundEnabled) SoundHelper.playSuccess()
                        val m = inputMins.toLongOrNull() ?: 0L
                        val s = inputSecs.toLongOrNull() ?: 0L
                        val total = (m * 60) + s
                        if (total > 0) {
                            countdownDurationTotalSeconds = total
                            countdownRemainingSeconds = total
                            isCountdownRunning = false
                            firestoreRepository.updateRemoteControlState(
                                teacherUid = userData.userId,
                                activeTab = "timer",
                                timerCommand = "SET_TIME",
                                duration = total,
                                remaining = total
                            )
                        }
                        showSettingsDialog = false
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF8B5CF6))
                ) {
                    Text("Kaydet", color = Color.White)
                }
            },
            dismissButton = {
                TextButton(
                    onClick = { showSettingsDialog = false }
                ) {
                    Text("İptal", color = Color(0xFF64748B))
                }
            }
        )
    }
}
