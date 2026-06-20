package com.example.ui.update

import android.app.DownloadManager
import android.content.Context
import android.net.Uri
import android.os.Environment
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.BuildConfig
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONObject

// LÜTFEN KENDİ GITHUB REPO ADINIZI BURAYA GİRİN: (örnek: "cihanogretmen/sinifyonetimi")
const val GITHUB_REPO = "CHNZL/Cihan-Ogretmen-Mobil"

class UpdateViewModel : ViewModel() {
    private val client = OkHttpClient()

    private val _updateAvailable = MutableStateFlow(false)
    val updateAvailable = _updateAvailable.asStateFlow()

    private val _latestVersion = MutableStateFlow<String?>(null)
    val latestVersion = _latestVersion.asStateFlow()

    private val _apkUrl = MutableStateFlow<String?>(null)
    val apkUrl = _apkUrl.asStateFlow()

    private val _isLoading = MutableStateFlow(false)
    val isLoading = _isLoading.asStateFlow()

    private val _message = MutableStateFlow<String?>(null)
    val message = _message.asStateFlow()

    // Flag to handle startup notification
    private val _showStartupDialog = MutableStateFlow(false)
    val showStartupDialog = _showStartupDialog.asStateFlow()

    init {
        checkForUpdates(silentCheckOnStartup = true)
    }

    fun checkForUpdates(silentCheckOnStartup: Boolean = false) {
        viewModelScope.launch {
            _isLoading.value = true
            if (!silentCheckOnStartup) _message.value = null
            
            try {
                withContext(Dispatchers.IO) {
                    val request = Request.Builder()
                        .url("https://api.github.com/repos/$GITHUB_REPO/releases/latest")
                        .header("Accept", "application/vnd.github.v3+json")
                        .build()

                    client.newCall(request).execute().use { response ->
                        if (response.isSuccessful) {
                            val responseBody = response.body?.string() ?: ""
                            val json = JSONObject(responseBody)
                            val tagName = json.optString("tag_name", "")
                            
                            val assets = json.optJSONArray("assets")
                            var foundApkUrl: String? = null
                            if (assets != null) {
                                for (i in 0 until assets.length()) {
                                    val asset = assets.getJSONObject(i)
                                    val name = asset.optString("name", "")
                                    if (name.endsWith(".apk")) {
                                        foundApkUrl = asset.optString("browser_download_url")
                                        break
                                    }
                                }
                            }

                            val currentVersion = BuildConfig.VERSION_NAME
                            val cleanTag = tagName.removePrefix("v")
                            
                            withContext(Dispatchers.Main) {
                                _latestVersion.value = cleanTag
                                if (cleanTag.isNotEmpty() && cleanTag != currentVersion) {
                                    _updateAvailable.value = true
                                    _apkUrl.value = foundApkUrl
                                    if (!silentCheckOnStartup) {
                                        _message.value = "Yeni sürüm bulundu ($cleanTag)!"
                                    } else {
                                        _showStartupDialog.value = true
                                    }
                                } else {
                                    _updateAvailable.value = false
                                    if (!silentCheckOnStartup) {
                                        _message.value = "Uygulamanız günceldir. (Sürüm $currentVersion)"
                                    }
                                }
                            }
                        } else if (response.code == 404) {
                            withContext(Dispatchers.Main) {
                                if (!silentCheckOnStartup) {
                                    _message.value = "Henüz yayınlanmış bir güncelleme (sürüm) bulunmuyor."
                                }
                            }
                        } else {
                            withContext(Dispatchers.Main) {
                                if (!silentCheckOnStartup) {
                                    _message.value = "Sürüm denetlenemedi: ${response.code}"
                                }
                            }
                        }
                    }
                }
            } catch (e: Exception) {
                if (!silentCheckOnStartup) {
                    _message.value = "Ağ hatası oluştu."
                }
                e.printStackTrace()
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun dismissStartupDialog() {
        _showStartupDialog.value = false
    }

    fun clearMessage() {
        _message.value = null
    }

    fun startDownload(context: Context) {
        val url = _apkUrl.value ?: run {
            _message.value = "İndirme linki bulunamadı. Lütfen GitHub Releases alanına .apk yüklediğinizden emin olun."
            return
        }
        
        // Clean up old APKs to prevent accumulation
        try {
            val dir = context.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS)
            dir?.listFiles()?.forEach { file ->
                if (file.name.endsWith(".apk")) {
                    file.delete()
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }

        try {
            val request = DownloadManager.Request(Uri.parse(url))
            request.setTitle("Uygulama Güncellemesi")
            request.setDescription("Yeni sürüm indiriliyor. Tamamlandığında bildirimden yükleyebilirsiniz.")
            request.setMimeType("application/vnd.android.package-archive")
            // Use the app's external files directory to keep things private and avoid polluting 
            // the main Downloads folder. We use the same generic name to overwrite it each time.
            request.setDestinationInExternalFilesDir(context, Environment.DIRECTORY_DOWNLOADS, "update.apk")
            request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
            
            val downloadManager = context.getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
            downloadManager.enqueue(request)
            
            _message.value = "İndirme başlatıldı. Lütfen tamamlandığında bildirim çubuğundan dokunup kurunuz."
            dismissStartupDialog()
        } catch (e: Exception) {
            e.printStackTrace()
            _message.value = "İndirme başlatılamadı."
        }
    }
}
