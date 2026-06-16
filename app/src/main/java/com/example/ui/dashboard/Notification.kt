package com.example.ui.dashboard

data class Notification(
    val id: String,
    val title: String,
    val message: String,
    val isRead: Boolean = false
)
