package com.example.ui.dashboard.tabs

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.itemsIndexed
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@Composable
fun MenuCategoryTab(
    categoryTitle: String,
    onBack: () -> Unit,
    onRouteSelected: (String) -> Unit
) {
    val options = when (categoryTitle) {
        "Sınıf Yönetimi" -> listOf(
            "Sınıf Listesi" to Icons.Default.Groups,
            "Ders Programı" to Icons.Default.CalendarToday,
            "Oturma Planı" to Icons.Default.GridOn,
            "Grup Oluşturucu" to Icons.Default.GroupAdd,
            "Yıldızlar Sınıfı" to Icons.Default.AutoAwesome,
            "Şanslı Öğrenci" to Icons.Default.Star,
            "Zamanlayıcı" to Icons.Default.Timer,
            "Duyurular" to Icons.Default.Campaign
        )
        "Kitaplık Yönetimi" -> listOf(
            "Yeni Kitap Ekle" to Icons.Default.Add,
            "Kitaplık Listesi" to Icons.Default.LibraryBooks,
            "Okuma Kayıtları" to Icons.Default.History,
            "Okuma Değerlendirme" to Icons.Default.CheckCircle
        )
        "Ders Yönetimi" -> listOf(
            "Fen Bilimleri" to Icons.Default.Book,
            "Hayat Bilgisi" to Icons.Default.Book,
            "İngilizce" to Icons.Default.Book,
            "Matematik" to Icons.Default.Book,
            "Türkçe" to Icons.Default.Book,
            "Ders Programı" to Icons.Default.CalendarToday,
            "Zamanlayıcı" to Icons.Default.Timer
        )
        "Turnuva Yönetimi" -> listOf(
            "Yeni Turnuva" to Icons.Default.Add,
            "Turnuvalarım" to Icons.Default.EmojiEvents
        )
        else -> emptyList()
    }

    val gradients = listOf(
        listOf(Color(0xFF667EEA), Color(0xFF764BA2)),
        listOf(Color(0xFFFF758C), Color(0xFFFF7EB3)),
        listOf(Color(0xFF11998E), Color(0xFF38EF7D)),
        listOf(Color(0xFFF2994A), Color(0xFFF2C94C)),
        listOf(Color(0xFF4FACFE), Color(0xFF00F2FE)),
        listOf(Color(0xFFFA709A), Color(0xFFFEE140)),
        listOf(Color(0xFF43E97B), Color(0xFF38F9D7)),
        listOf(Color(0xFFB3FFAB), Color(0xFF12FFF7))
    )

    LazyVerticalGrid(
        columns = GridCells.Fixed(2),
        contentPadding = PaddingValues(20.dp),
        horizontalArrangement = Arrangement.spacedBy(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
        modifier = Modifier.fillMaxSize()
    ) {
        itemsIndexed(options) { index, (title, icon) ->
            val gradient = Brush.linearGradient(gradients[index % gradients.size])

            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .aspectRatio(1f)
                    .clickable { onRouteSelected(title) },
                elevation = CardDefaults.cardElevation(defaultElevation = 8.dp),
                shape = RoundedCornerShape(24.dp)
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(brush = gradient),
                    contentAlignment = Alignment.Center
                ) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center
                    ) {
                        Box(
                            modifier = Modifier
                                .size(56.dp)
                                .background(Color.White.copy(alpha = 0.2f), shape = CircleShape),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = icon,
                                contentDescription = null,
                                tint = Color.White,
                                modifier = Modifier.size(28.dp)
                            )
                        }
                        Spacer(modifier = Modifier.height(16.dp))
                        Text(
                            text = title,
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = Color.White,
                            textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                            modifier = Modifier.padding(horizontal = 8.dp),
                            maxLines = 2,
                            lineHeight = 20.sp,
                            fontSize = 14.sp
                        )
                    }
                }
            }
        }
    }
}
