package com.example.ui.dashboard.tabs

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp

@OptIn(ExperimentalMaterial3Api::class)
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

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(categoryTitle, fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Geri")
                    }
                }
            )
        }
    ) { paddingValues ->
        LazyVerticalGrid(
            columns = GridCells.Fixed(2),
            contentPadding = PaddingValues(16.dp),
            horizontalArrangement = Arrangement.spacedBy(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            items(options) { (title, icon) ->
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(100.dp)
                        .clickable { onRouteSelected(title) },
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
                    shape = RoundedCornerShape(16.dp)
                ) {
                    Column(
                        modifier = Modifier.fillMaxSize().padding(12.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center
                    ) {
                        Icon(
                            imageVector = icon,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.size(32.dp)
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = title,
                            style = MaterialTheme.typography.bodyMedium,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onSurface,
                            textAlign = androidx.compose.ui.text.style.TextAlign.Center
                        )
                    }
                }
            }
        }
    }
}
