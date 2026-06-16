package com.example.ui.dashboard

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.List
import androidx.compose.material.icons.filled.BarChart
import androidx.compose.material.icons.filled.Leaderboard
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.People
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import com.example.auth.UserData
import com.example.auth.UserRole
import com.example.ui.dashboard.tabs.AnalysisTab
import com.example.ui.dashboard.tabs.LeaderboardTab
import com.example.ui.dashboard.tabs.PerformanceTab
import com.example.ui.dashboard.tabs.ProfileTab
import com.example.ui.dashboard.tabs.StudentsTab
import com.example.ui.dashboard.tabs.ParentDashboardTab
import com.example.ui.dashboard.tabs.MemberDashboardTab

@Composable
fun DashboardScreen(
    userData: UserData,
    onSignOut: () -> Unit,
    modifier: Modifier = Modifier
) {
    when (userData.role) {
        UserRole.PARENT -> {
            // Parent view
            Scaffold(
                modifier = modifier,
                bottomBar = {
                    NavigationBar {
                        NavigationBarItem(
                            icon = { Icon(Icons.Default.BarChart, contentDescription = "Pano") },
                            label = { Text("Pano") },
                            selected = true,
                            onClick = {}
                        )
                        NavigationBarItem(
                            icon = { Icon(Icons.Default.Person, contentDescription = "Profil") },
                            label = { Text("Profil") },
                            selected = false,
                            onClick = onSignOut
                        )
                    }
                }
            ) { paddingValues ->
                ParentDashboardTab(userData = userData, onSignOut = onSignOut, paddingValues = paddingValues)
            }
        }
        UserRole.MEMBER -> {
            // Member view
            Scaffold(
                modifier = modifier
            ) { paddingValues ->
                MemberDashboardTab(userData = userData, onSignOut = onSignOut, paddingValues = paddingValues)
            }
        }
        else -> {
            // Teacher/Admin views
            TeacherDashboardScreen(userData = userData, onSignOut = onSignOut, modifier = modifier)
        }
    }
}
