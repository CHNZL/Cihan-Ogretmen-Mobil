package com.example

import android.content.Context
import androidx.test.core.app.ApplicationProvider
import com.google.firebase.FirebaseApp
import com.google.firebase.FirebaseOptions
import com.google.firebase.firestore.FirebaseFirestore
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.tasks.await
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import java.io.File

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [36])
class ExampleRobolectricTest {

  @Test
  fun testFirestoreDebug() = runBlocking {
    val context = ApplicationProvider.getApplicationContext<Context>()
    
    // Read google-services.json details to construct options or just use simple initialize
    val options = FirebaseOptions.Builder()
        .setApplicationId("1:761526041284:android:f38efa48a9ee046c9e6791")
        .setApiKey("AIzaSyDvNd9PeQuhUFSzXymKYF1RqvebTi_cNmI")
        .setProjectId("gen-lang-client-0847504321")
        .build()
        
    val app = try {
        FirebaseApp.initializeApp(context, options)
    } catch (e: Exception) {
        FirebaseApp.getInstance()
    }
    
    val db = FirebaseFirestore.getInstance(app, "ai-studio-50d2114a-6844-4ea4-a54d-c3de2ef685ab")
    
    println("--- FIRESTORE USERS DEBUG ---")
    val query = db.collection("users").get().await()
    for (doc in query.documents) {
        val email = doc.getString("email")
        val profileType = doc.getString("profileType")
        println("User Document: ID=${doc.id}, Email=$email, Profile=$profileType")
        
        if (email?.contains("cihan", ignoreCase = true) == true) {
            println("Found matching user: docId=${doc.id}")
            // Check subcollections/documents
            val scheduleRef = db.collection("users").document(doc.id).collection("config").document("schedule").get().await()
            println("  Schedule Config exists: ${scheduleRef.exists()} data: ${scheduleRef.data}")
            
            val scheduleDataRef = db.collection("users").document(doc.id).collection("config").document("scheduleData").get().await()
            println("  Schedule Data exists: ${scheduleDataRef.exists()} data: ${scheduleDataRef.data}")
            
            val subjectsRef = db.collection("users").document(doc.id).collection("subjects").get().await()
            println("  Subjects count: ${subjectsRef.size()}")
            for (sub in subjectsRef.documents) {
                println("    Subject: id=${sub.id} name=${sub.getString("name")} color=${sub.getString("color")}")
            }
        }
    }
    println("--- END DEBUG ---")
  }
}
