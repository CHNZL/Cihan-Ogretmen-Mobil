package com.example.ui.dashboard.tabs

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.example.auth.UserData
import com.example.data.ExamResult
import com.example.ui.dashboard.Notification
import com.example.ui.dashboard.components.SharedTopAppBar
import com.patrykandpatrick.vico.compose.chart.Chart
import com.patrykandpatrick.vico.compose.chart.line.lineChart
import com.patrykandpatrick.vico.compose.axis.horizontal.rememberBottomAxis
import com.patrykandpatrick.vico.compose.axis.vertical.rememberStartAxis
import com.patrykandpatrick.vico.core.entry.entryModelOf
import com.patrykandpatrick.vico.core.entry.ChartEntryModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ParentDashboardTab(
    userData: UserData,
    onSignOut: () -> Unit,
    paddingValues: PaddingValues
) {
    var chartModel: ChartEntryModel? by remember { mutableStateOf(null) }
    var hasData by remember { mutableStateOf(false) }

    var notifications by remember {
        mutableStateOf(
            emptyList<Notification>()
        )
    }

    // Fake data for presentation
    val fakeExamResults = listOf(
        ExamResult(score = 65.0, examName = "Deneme 1"),
        ExamResult(score = 72.5, examName = "Deneme 2"),
        ExamResult(score = 85.0, examName = "Deneme 3")
    )

    LaunchedEffect(Unit) {
        chartModel = entryModelOf(*fakeExamResults.map { it.score }.toTypedArray())
        hasData = true
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(paddingValues)
    ) {
        SharedTopAppBar(
            title = "Veli Paneli",
            userData = userData,
            onBackClick = null,
            onSignOut = onSignOut,
            onProfileSettingsClick = {},
            notifications = notifications,
            onNotificationsChanged = { notifications = it }
        )
        
        Column(modifier = Modifier.padding(16.dp)) {
            Text(
                text = "Çocuğunuzun Gelişim Analizi",
                style = MaterialTheme.typography.titleLarge,
                modifier = Modifier.padding(bottom = 16.dp)
            )

            if (hasData && chartModel != null) {
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(250.dp)
                ) {
                    Chart(
                        chart = lineChart(),
                        model = chartModel!!,
                        startAxis = rememberStartAxis(),
                        bottomAxis = rememberBottomAxis(),
                        modifier = Modifier.padding(16.dp)
                    )
                }
            } else {
                CircularProgressIndicator(modifier = Modifier.align(Alignment.CenterHorizontally))
            }
            
            Spacer(modifier = Modifier.height(24.dp))
            
            Text(
                text = "Zayıf / Başarılı Kazanımlar",
                style = MaterialTheme.typography.titleMedium,
                modifier = Modifier.padding(bottom = 8.dp)
            )
            
            Card(modifier = Modifier.fillMaxWidth()) {
                Text(
                    text = "Kazanım bazlı radar/bar grafikleri burada gösterilecek.",
                    modifier = Modifier.padding(16.dp),
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
    }
}
