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
    val query = db.collection("kullanicilar").whereEqualTo("email", "cihan.ozel10@gmail.com").get().await()
    for (doc in query.documents) {
        val email = doc.getString("email")
        println("User Document: ID=${doc.id}, Email=$email")
        
        val ayarlarRef = db.collection("kullanicilar").document(doc.id).collection("ayarlar").get().await()
        println("  Ayarlar count: ${ayarlarRef.size()}")
        for (ayar in ayarlarRef.documents) {
            println("    Ayar: id=${ayar.id} data=${ayar.data}")
        }
    }
    
    // Also try checking old users and config if empty
    val queryOld = db.collection("users").whereEqualTo("email", "cihan.ozel10@gmail.com").get().await()
    for (doc in queryOld.documents) {
        val email = doc.getString("email")
        println("OLD User Document: ID=${doc.id}, Email=$email")
        
        val ayarlarRef = db.collection("users").document(doc.id).collection("config").get().await()
        println("  Config count: ${ayarlarRef.size()}")
        for (ayar in ayarlarRef.documents) {
            println("    Config: id=${ayar.id} data=${ayar.data}")
        }
    }
    println("--- END DEBUG ---")
  }
}
