package com.example.ui.dashboard.tabs

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.example.auth.UserData

@Composable
fun TeacherHomeContent(
    userData: UserData,
    onRouteSelected: (String) -> Unit
) {
    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Welcome Header
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(text = "GENEL BAKIŞ", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.primary)
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = "Merhaba, ${userData.username?.split(" ")?.firstOrNull() ?: "Öğretmen"} \uD83D\uDC4B",
                        style = MaterialTheme.typography.headlineMedium,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "Bugün 10 Haziran Çarşamba.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                    @OptIn(ExperimentalLayoutApi::class)
                    FlowRow(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        InfoChip(icon = Icons.Default.School, text = "SÜLEYMAN SAMİ KEPENEK İLKOKULU")
                        InfoChip(icon = Icons.Default.Groups, text = "3. Sınıf / D Şubesi")
                    }
                }
            }
        }

        // Stats Grid
        item {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    StatCard(modifier = Modifier.weight(1f), icon = Icons.Default.Groups, value = "25", label = "TOPLAM ÖĞRENCİ", iconTint = Color(0xFF00BFA5))
                    StatCard(modifier = Modifier.weight(1f), icon = Icons.Default.Person, value = "12", label = "ERKEK", iconTint = Color(0xFF2962FF))
                }
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    StatCard(modifier = Modifier.weight(1f), icon = Icons.Default.Person, value = "13", label = "KIZ", iconTint = Color(0xFFC51162))
                    StatCard(modifier = Modifier.weight(1f), icon = Icons.Default.Cake, value = "1", label = "DOĞUM GÜNÜ", iconTint = Color(0xFFFFAB00))
                }
            }
        }

        // Quick Actions & Today's Schedule
        item {
            Text(
                text = "HIZLI İŞLEMLER",
                style = MaterialTheme.typography.titleSmall,
                color = MaterialTheme.colorScheme.primary,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(top = 8.dp)
            )
        }

        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    QuickActionCard(
                        icon = Icons.Default.Star,
                        title = "ŞANSLI ÖĞRENCİ",
                        subtitle = "Seçim oyunları",
                        iconBackground = Color(0xFFFFD54F),
                        iconTint = Color(0xFFFF8F00),
                        onClick = { onRouteSelected("Şanslı Öğrenci") }
                    )
                    QuickActionCard(
                        icon = Icons.Default.FormatListBulleted,
                        title = "SINIF LİSTESİ",
                        subtitle = "Verileri yönet",
                        iconBackground = Color(0xFFA5D6A7),
                        iconTint = Color(0xFF2E7D32),
                        onClick = { onRouteSelected("Sınıf Listesi") }
                    )
                    QuickActionCard(
                        icon = Icons.Default.Timer,
                        title = "ZAMANLAYICI",
                        subtitle = "Ders & etkinlik sayacı",
                        iconBackground = Color(0xFFC7D2FE),
                        iconTint = Color(0xFF4F46E5),
                        onClick = { onRouteSelected("Zamanlayıcı") }
                    )
                }
                Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    QuickActionCard(
                        icon = Icons.Default.GroupAdd,
                        title = "GRUP OLUŞTUR",
                        subtitle = "Hızlı gruplama",
                        iconBackground = Color(0xFF9FA8DA),
                        iconTint = Color(0xFF283593),
                        onClick = { onRouteSelected("Grup Oluşturucu") }
                    )
                    QuickActionCard(
                        icon = Icons.Default.CalendarToday,
                        title = "DERS PROGRAMI",
                        subtitle = "Haftalık plan",
                        iconBackground = Color(0xFFEF9A9A),
                        iconTint = Color(0xFFC62828),
                        onClick = { onRouteSelected("Ders Programı") }
                    )
                    QuickActionCard(
                        icon = Icons.Default.AutoAwesome,
                        title = "YILDIZLAR SINIFI",
                        subtitle = "Öğrenci puan durumu",
                        iconBackground = Color(0xFFFDE047),
                        iconTint = Color(0xFFA16207),
                        onClick = { onRouteSelected("Yıldızlar Sınıfı") }
                    )
                }
            }
        }
        
        item {
            Text(
                text = "BUGÜN",
                style = MaterialTheme.typography.titleSmall,
                color = MaterialTheme.colorScheme.primary,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(top = 16.dp, bottom = 8.dp)
            )
            
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                ScheduleItem("1", "HAYAT BİLGİSİ", Color(0xFF00BFA5))
                ScheduleItem("2", "FEN BİLİMLERİ", Color(0xFFFFB300))
                ScheduleItem("3", "MATEMATİK", Color(0xFF2962FF))
            }
        }
    }
}

@Composable
fun InfoChip(icon: ImageVector, text: String) {
    Surface(
        color = MaterialTheme.colorScheme.surface,
        shape = RoundedCornerShape(16.dp)
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(icon, contentDescription = null, modifier = Modifier.size(16.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
            Spacer(modifier = Modifier.width(4.dp))
            Text(
                text = text, 
                style = MaterialTheme.typography.bodySmall, 
                color = MaterialTheme.colorScheme.onSurface,
                maxLines = 1,
                overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis
            )
        }
    }
}

@Composable
fun StatCard(modifier: Modifier = Modifier, icon: ImageVector, value: String, label: String, iconTint: Color) {
    Card(
        modifier = modifier.height(90.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Column(
            modifier = Modifier.fillMaxSize().padding(horizontal = 4.dp, vertical = 8.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Icon(icon, contentDescription = null, tint = iconTint, modifier = Modifier.size(24.dp))
            Spacer(modifier = Modifier.height(4.dp))
            Text(text = value, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
            Text(
                text = label, 
                style = MaterialTheme.typography.labelSmall, 
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 1,
                overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis
            )
        }
    }
}

@Composable
fun QuickActionCard(
    icon: ImageVector,
    title: String,
    subtitle: String,
    iconBackground: Color,
    iconTint: Color,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth().clickable { onClick() },
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Row(
            modifier = Modifier.padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(40.dp)
                    .clip(CircleShape)
                    .background(iconBackground),
                contentAlignment = Alignment.Center
            ) {
                Icon(icon, contentDescription = null, tint = iconTint)
            }
            Spacer(modifier = Modifier.width(12.dp))
            Column {
                Text(
                    text = title, 
                    style = MaterialTheme.typography.titleSmall, 
                    fontWeight = FontWeight.Bold,
                    maxLines = 1,
                    overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis
                )
                Text(
                    text = subtitle, 
                    style = MaterialTheme.typography.bodySmall, 
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 1,
                    overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis
                )
            }
        }
    }
}

@Composable
fun ScheduleItem(index: String, name: String, color: Color) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(text = index, style = MaterialTheme.typography.titleMedium, modifier = Modifier.width(24.dp))
            Box(modifier = Modifier.width(4.dp).height(24.dp).background(color, RoundedCornerShape(2.dp)))
            Spacer(modifier = Modifier.width(12.dp))
            Text(text = name, style = MaterialTheme.typography.titleMedium, color = color, fontWeight = FontWeight.Bold)
        }
    }
}
