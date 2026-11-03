package expo.modules.soundtrailaudio

import android.content.ContentValues
import android.content.Context
import android.os.Build
import android.provider.MediaStore
import androidx.annotation.RequiresApi
import com.yausername.ffmpeg.FFmpeg
import com.yausername.youtubedl_android.YoutubeDL
import com.yausername.youtubedl_android.YoutubeDLRequest
import java.io.File
import java.io.IOException

object Downloader {
  private var ready = false

  @Synchronized
  private fun prepare(context: Context) {
    if (ready) return
    YoutubeDL.getInstance().init(context)
    FFmpeg.getInstance().init(context)
    runCatching { YoutubeDL.getInstance().updateYoutubeDL(context, YoutubeDL.UpdateChannel.STABLE) }
    ready = true
  }

  @RequiresApi(Build.VERSION_CODES.Q)
  fun fetch(context: Context, id: String, url: String, path: String, name: String, onProgress: (Int) -> Unit): String {
    prepare(context)
    val dir = File(context.cacheDir, "downloads/$id")
    dir.deleteRecursively()
    dir.mkdirs()
    try {
      val request = YoutubeDLRequest(url)
        .addOption("-f", "140/bestaudio")
        .addOption("-x")
        .addOption("--audio-format", "m4a")
        .addOption("--embed-metadata")
        .addOption("--embed-thumbnail")
        .addOption("--convert-thumbnails", "jpg")
        .addOption("--no-playlist")
        .addOption("-o", File(dir, "track.%(ext)s").absolutePath)
      var last = -1
      YoutubeDL.getInstance().execute(request, id) { progress, _, _ ->
        val percent = progress.toInt().coerceIn(0, 100)
        if (percent != last) {
          last = percent
          onProgress(percent)
        }
      }
      val file = dir.listFiles()?.firstOrNull { it.extension == "m4a" } ?: throw IOException("No audio file was produced")
      return publish(context, file, path, "$name.m4a")
    } finally {
      dir.deleteRecursively()
    }
  }

  @RequiresApi(Build.VERSION_CODES.Q)
  private fun publish(context: Context, file: File, path: String, displayName: String): String {
    val resolver = context.contentResolver
    val values = ContentValues().apply {
      put(MediaStore.MediaColumns.DISPLAY_NAME, displayName)
      put(MediaStore.MediaColumns.MIME_TYPE, "audio/mp4")
      put(MediaStore.MediaColumns.RELATIVE_PATH, path)
      put(MediaStore.MediaColumns.IS_PENDING, 1)
    }
    val uri = resolver.insert(MediaStore.Audio.Media.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY), values)
      ?: throw IOException("Could not create the file")
    try {
      resolver.openOutputStream(uri)?.use { out -> file.inputStream().use { it.copyTo(out) } }
        ?: throw IOException("Could not write the file")
      resolver.update(uri, ContentValues().apply { put(MediaStore.MediaColumns.IS_PENDING, 0) }, null, null)
      return uri.toString()
    } catch (e: Throwable) {
      resolver.delete(uri, null, null)
      throw e
    }
  }
}
