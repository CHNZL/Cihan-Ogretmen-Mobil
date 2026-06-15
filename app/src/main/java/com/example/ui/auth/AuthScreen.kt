package com.example.ui.auth

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.School
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@Composable
fun AuthScreen(
    onSignInClick: () -> Unit,
    isLoading: Boolean,
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background),
        contentAlignment = Alignment.Center
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth(0.9f)
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            // App Identity Logo
            Box(
                modifier = Modifier
                    .size(112.dp)
                    .clip(RoundedCornerShape(24.dp))
                    .background(Color.White)
                    .padding(8.dp),
                contentAlignment = Alignment.Center
            ) {
                androidx.compose.foundation.Image(
                    painter = androidx.compose.ui.res.painterResource(id = com.example.R.drawable.logo),
                    contentDescription = "Logo",
                    modifier = Modifier
                        .fillMaxSize()
                        .clip(RoundedCornerShape(18.dp))
                )
            }

            Spacer(modifier = Modifier.height(24.dp))

            Text(
                text = "Eğitim Yönetim Sistemi",
                style = MaterialTheme.typography.headlineLarge,
                fontWeight = FontWeight.Bold,
                textAlign = TextAlign.Center,
                color = MaterialTheme.colorScheme.onBackground
            )

            Spacer(modifier = Modifier.height(8.dp))

            Text(
                text = "Yıldız, Davranış Takip ve Sınıf Yönetim Portalı",
                style = MaterialTheme.typography.bodyLarge,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(horizontal = 16.dp)
            )

            Spacer(modifier = Modifier.height(56.dp))

            if (isLoading) {
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    CircularProgressIndicator(
                        color = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(44.dp)
                    )
                    Text(
                        text = "Google ile oturum açılıyor...",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.primary,
                        fontWeight = FontWeight.Medium
                    )
                }
            } else {
                // Official, authentic Google Sign-In Button
                Card(
                    onClick = onSignInClick,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(56.dp)
                        .padding(horizontal = 16.dp),
                    shape = RoundedCornerShape(28.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = Color.White
                    ),
                    elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                    border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFDADCE0))
                ) {
                    Row(
                        modifier = Modifier.fillMaxSize(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.Center
                    ) {
                        GoogleGLogo(modifier = Modifier.size(24.dp))
                        Spacer(modifier = Modifier.width(14.dp))
                        Text(
                            text = "Google ile Giriş Yap",
                            color = Color(0xFF3C4043),
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Medium,
                            letterSpacing = 0.25.sp
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(56.dp))

            Text(
                text = "Uygulamada güvenli kimlik doğrulama için resmi Google altyapısı tercih edilmiştir.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.8f),
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(horizontal = 24.dp)
            )
        }
    }
}

// Custom canvas colored Google "G" logo
@Composable
fun GoogleGLogo(modifier: Modifier = Modifier) {
    Canvas(modifier = modifier) {
        val width = size.width
        val height = size.height
        
        // Google Red segment
        val redPath = Path().apply {
            moveTo(width * 0.5f, height * 0.5f)
            lineTo(width * 0.92f, height * 0.3f)
            cubicTo(width * 0.85f, height * 0.12f, width * 0.69f, height * 0.04f, width * 0.5f, height * 0.04f)
            cubicTo(width * 0.31f, height * 0.04f, width * 0.15f, height * 0.14f, width * 0.08f, height * 0.3f)
            lineTo(width * 0.28f, height * 0.45f)
            cubicTo(width * 0.32f, height * 0.38f, width * 0.4f, height * 0.33f, width * 0.5f, height * 0.33f)
            close()
        }
        drawPath(redPath, Color(0xFFEA4335)) // Red

        // Google Yellow segment
        val yellowPath = Path().apply {
            moveTo(width * 0.5f, height * 0.5f)
            lineTo(width * 0.28f, height * 0.45f)
            cubicTo(width * 0.24f, height * 0.53f, width * 0.24f, height * 0.63f, width * 0.28f, height * 0.71f)
            lineTo(width * 0.08f, height * 0.86f)
            cubicTo(width * 0.02f, height * 0.75f, 0f, height * 0.63f, 0f, height * 0.5f)
            cubicTo(0f, height * 0.43f, width * 0.03f, height * 0.36f, width * 0.08f, height * 0.3f)
            close()
        }
        drawPath(yellowPath, Color(0xFFFBBC05)) // Yellow

        // Google Green segment
        val greenPath = Path().apply {
            moveTo(width * 0.5f, height * 0.5f)
            lineTo(width * 0.08f, height * 0.86f)
            cubicTo(width * 0.16f, height * 1.02f, width * 0.32f, height * 1.08f, width * 0.5f, height * 1.08f)
            cubicTo(width * 0.68f, height * 1.08f, width * 0.83f, height * 1.01f, width * 0.91f, height * 0.86f)
            lineTo(width * 0.73f, height * 0.71f)
            cubicTo(width * 0.68f, height * 0.79f, width * 0.6f, height * 0.83f, width * 0.5f, height * 0.83f)
            cubicTo(width * 0.4f, height * 0.83f, width * 0.32f, height * 0.78f, width * 0.28f, height * 0.71f)
            close()
        }
        drawPath(greenPath, Color(0xFF34A853)) // Green

        // Google Blue segment
        val blueFull = Path().apply {
            moveTo(width * 0.5f, height * 0.33f)
            lineTo(width * 0.95f, height * 0.33f)
            lineTo(width * 0.95f, height * 0.52f)
            cubicTo(width * 0.950f, height * 0.66f, width * 0.89f, height * 0.78f, width * 0.73f, height * 0.86f)
            lineTo(width * 0.52f, height * 0.68f)
            cubicTo(width * 0.59f, height * 0.65f, width * 0.65f, height * 0.59f, width * 0.65f, height * 0.52f)
            lineTo(width * 0.5f, height * 0.52f)
            close()
        }
        drawPath(blueFull, Color(0xFF4285F4)) // Blue
    }
}
