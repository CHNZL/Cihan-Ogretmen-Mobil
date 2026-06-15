package com.example.utils

import android.content.Context
import android.media.AudioFormat
import android.media.AudioManager
import android.media.AudioTrack
import android.speech.tts.TextToSpeech
import java.util.Locale

object SoundHelper {
    private var tts: TextToSpeech? = null
    var isTtsReady = false
        private set

    fun init(context: Context) {
        if (tts == null) {
            tts = TextToSpeech(context.applicationContext) { status ->
                if (status == TextToSpeech.SUCCESS) {
                    tts?.apply {
                        language = Locale("tr", "TR")
                        setPitch(1.05f) 
                        setSpeechRate(0.95f)
                        isTtsReady = true
                    }
                }
            }
        }
    }

    // Modern clean thread-safe PCM synthesizer with smooth curves & clamping to prevent clipping/clicks
    private fun playDigital(durationMs: Int, generator: (t: Float, progress: Float, sampleRate: Int) -> Float) {
        Thread {
            try {
                val sampleRate = 22050
                val numSamples = (durationMs * sampleRate / 1000)
                val buffer = ShortArray(numSamples)
                
                for (i in 0 until numSamples) {
                    val t = i.toFloat() / sampleRate
                    val progress = i.toFloat() / numSamples
                    val sampleValue = generator(t, progress, sampleRate)
                    
                    // Prevent overflows & clipping harshness
                    val clamped = sampleValue.coerceIn(-1.0f, 1.0f)
                    
                    // Exponential or linear fade out to prevent speaker clicks
                    val fadeFactor = if (progress > 0.9f) (1.0f - progress) / 0.1f else 1.0f
                    buffer[i] = (clamped * 11000 * fadeFactor).toInt().toShort()
                }

                val track = AudioTrack(
                    AudioManager.STREAM_MUSIC,
                    sampleRate,
                    AudioFormat.CHANNEL_OUT_MONO,
                    AudioFormat.ENCODING_PCM_16BIT,
                    numSamples * 2,
                    AudioTrack.MODE_STATIC
                )
                track.write(buffer, 0, numSamples)
                track.play()
                Thread.sleep(durationMs.toLong() + 20)
                track.release()
            } catch (e: Exception) {
                // Ignore
            }
        }.start()
    }

    // 1. Warm Woody Click for general dials/ticks (Soft & premium, no clicks)
    fun playTick() {
        playDigital(15) { t, progress, _ ->
            val freq = 180f - 120f * progress
            val angle = 2.0 * Math.PI * freq * t
            val env = Math.exp(-progress * 6.5).toFloat()
            Math.sin(angle).toFloat() * env
        }
    }

    // 2. Realistic rubber Balloon popping ("PAT!")
    fun playBalloonPop() {
        val random = java.util.Random()
        playDigital(110) { t, progress, _ ->
            val noise = random.nextFloat() * 2f - 1f
            val freq = 220f - 180f * progress
            val thump = Math.sin(2.0 * Math.PI * freq * t).toFloat()
            
            val noiseEnv = Math.exp(-progress * 28.0).toFloat()
            val thumpEnv = Math.exp(-progress * 7.0).toFloat()
            
            (noise * noiseEnv * 0.75f + thump * thumpEnv * 0.45f)
        }
    }

    // 3. Card flip rustling sound
    fun playCardFlip() {
        val random = java.util.Random()
        playDigital(55) { _, progress, _ ->
            val noise = random.nextFloat() * 2f - 1f
            val snapFreq = 500f - 300f * progress
            val snap = Math.sin(2.0 * Math.PI * snapFreq * (progress * 0.05)).toFloat()
            
            val env = Math.sin(progress * Math.PI).toFloat() 
            val noiseEnv = Math.exp(-progress * 16.0).toFloat()
            
            (noise * noiseEnv * 0.18f + snap * env * 0.12f)
        }
    }

    // 4. Formula 1 count-down lights warning chirp
    fun playF1Beep() {
        playDigital(120) { t, progress, _ ->
            val angle = 2.0 * Math.PI * 520.0 * t
            val env = if (progress < 0.12f) progress / 0.12f else if (progress > 0.85f) (1f - progress) / 0.15f else 1.0f
            Math.sin(angle).toFloat() * env * 0.55f
        }
    }

    // 5. Formula 1 launch start signal (green light)
    fun playF1Go() {
        playDigital(380) { t, progress, _ ->
            val angle = 2.0 * Math.PI * 920.0 * t
            val env = if (progress < 0.06f) progress / 0.06f else if (progress > 0.75f) (1f - progress) / 0.25f else 1.0f
            Math.sin(angle).toFloat() * env * 0.65f
        }
    }

    // 6. Roaring turbo speed zoom (for race updates / boosts)
    fun playEngineTurbo() {
        playDigital(550) { t, progress, _ ->
            val freq = 90f + 480f * progress * progress
            val angle = 2.0 * Math.PI * freq * t
            val saw = (2.0f * (t * freq - Math.floor((t * freq).toDouble() + 0.5).toFloat()))
            
            val subFreq = freq / 2f
            val subSaw = (2.0f * (t * subFreq - Math.floor((t * subFreq).toDouble() + 0.5).toFloat()))
            
            val env = Math.sin(progress * Math.PI).toFloat()
            (saw * 0.35f + subSaw * 0.25f) * env
        }
    }

    // 7. Screeching rubber tire skid sound
    fun playCarSkid() {
        val random = java.util.Random()
        playDigital(320) { t, progress, _ ->
            val freq = 1050f - 180f * progress + (random.nextFloat() * 140f - 70f)
            val angle = 2.0 * Math.PI * freq * t
            val sine = Math.sin(angle).toFloat()
            val noise = random.nextFloat() * 2f - 1f
            val env = Math.sin(progress * Math.PI).toFloat()
            
            (sine * 0.38f + noise * 0.18f) * env
        }
    }

    // 8. Flappy hovering honeybee buzz
    fun playBeeBuzz() {
        playDigital(220) { t, progress, _ ->
            val wingFreq = 145f
            val vibrato = 18f * Math.sin(2.0 * Math.PI * 28.0 * t).toFloat()
            val freq = wingFreq + vibrato
            val angle = 2.0 * Math.PI * freq * t
            val saw = (2.0f * (t * freq - Math.floor((t * freq).toDouble() + 0.5).toFloat()))
            
            val tremolo = 0.75f + 0.25f * Math.sin(2.0 * Math.PI * 9.0 * t).toFloat()
            val env = Math.sin(progress * Math.PI).toFloat()
            
            saw * env * tremolo * 0.32f
        }
    }

    // 9. High-resonance cosmic space echo
    fun playSpaceBeep() {
        playDigital(180) { t, progress, _ ->
            val freq = 1400f - 350f * progress
            val angle = 2.0 * Math.PI * freq * t
            val env = Math.exp(-progress * 5.5).toFloat()
            Math.sin(angle).toFloat() * env * 0.38f
        }
    }

    // 10. Spaceship continuous rumbling rocket blastoff
    fun playRocketLaunch() {
        val random = java.util.Random()
        playDigital(750) { t, progress, _ ->
            val noise = random.nextFloat() * 2f - 1f
            val rumbleFreq = 48f + 55f * progress
            val rumble = Math.sin(2.0 * Math.PI * rumbleFreq * t).toFloat()
            
            val env = Math.sin(progress * Math.PI).toFloat()
            val noiseEnv = 0.35f + 0.35f * progress
            
            (rumble * 0.45f + noise * noiseEnv * 0.28f) * env * 0.65f
        }
    }

    // 11. Sci-fi resonant hyperwarp vector sweep
    fun playSpaceTurbo() {
        playDigital(550) { t, progress, _ ->
            val freq = 280f + 1500f * progress * progress
            val angle = 2.0 * Math.PI * freq * t
            val fm = Math.sin(2.0 * Math.PI * 40.0 * t).toFloat() * 120f
            val sweepSignal = Math.sin(angle + fm).toFloat()
            
            val env = Math.sin(progress * Math.PI).toFloat()
            sweepSignal * env * 0.35f
        }
    }

    // 12. Deep space asteroid crunch explosion
    fun playAsteroidHit() {
        val random = java.util.Random()
        playDigital(450) { t, progress, _ ->
            val noise = random.nextFloat() * 2f - 1f
            val freq = 170f - 130f * progress
            val thump = Math.sin(2.0 * Math.PI * freq * t).toFloat()
            
            val env = Math.exp(-progress * 4.8).toFloat()
            (thump * 0.45f + noise * env * 0.45f) * env
        }
    }

    // 13. Triumphant major-pentatonic chime (very sweet and melodic)
    fun playSuccess() {
        playDigital(480) { t, progress, _ ->
            val noteStep = (progress * 6).toInt()
            val freq = when (noteStep) {
                0 -> 329.63f // E4
                1 -> 392.00f // G4
                2 -> 440.00f // A4
                3 -> 523.25f // C5
                4 -> 587.33f // D5
                else -> 659.25f // E5
            }
            val angle = 2.0 * Math.PI * freq * t
            val env = Math.sin(progress * Math.PI).toFloat()
            Math.sin(angle).toFloat() * env * 0.4f
        }
    }

    // 14. Sweet high-contrast clean gold coin
    fun playCoin() {
        playDigital(180) { t, progress, _ ->
            val freq = if (progress < 0.4f) 659.25f else 1046.50f
            val angle = 2.0 * Math.PI * freq * t
            val env = Math.exp(-progress * 4.5).toFloat()
            Math.sin(angle).toFloat() * env * 0.45f
        }
    }

    // 15. Sweet organic spring boing (soft elastic bounce)
    fun playBoing() {
        playDigital(220) { t, progress, _ ->
            val modulation = Math.sin(2.0 * Math.PI * 13.0 * t).toFloat()
            val freq = 190f + 160f * progress + modulation * 35f
            val angle = 2.0 * Math.PI * freq * t
            val env = Math.sin(progress * Math.PI).toFloat()
            Math.sin(angle).toFloat() * env * 0.42f
        }
    }

    fun speak(text: String) {
        if (isTtsReady) {
            tts?.speak(text, TextToSpeech.QUEUE_FLUSH, null, "LuckyStudentTTS")
        }
    }

    fun shutdown() {
        try {
            tts?.stop()
            tts?.shutdown()
            tts = null
            isTtsReady = false
        } catch (e: Exception) {
            // Ignore
        }
    }
}
