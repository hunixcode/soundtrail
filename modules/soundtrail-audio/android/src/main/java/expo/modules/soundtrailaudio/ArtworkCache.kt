package expo.modules.soundtrailaudio

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.media.MediaMetadataRetriever
import android.net.Uri
import java.io.File
import java.security.MessageDigest

object ArtworkCache {
  private const val SIZE = 512

  private fun dir(context: Context) = File(context.cacheDir, "artwork").apply { mkdirs() }

  private fun key(uri: String): String =
    MessageDigest.getInstance("SHA-1").digest(uri.toByteArray()).joinToString("") { "%02x".format(it) }

  fun load(context: Context, uri: String): String? {
    val folder = dir(context)
    val name = key(uri)
    val file = File(folder, "$name.jpg")
    if (file.exists()) return Uri.fromFile(file).toString()
    val miss = File(folder, "$name.none")
    if (miss.exists()) return null
    val bitmap = extract(context, uri)
    if (bitmap == null) {
      runCatching { miss.createNewFile() }
      return null
    }
    return runCatching {
      file.outputStream().use { bitmap.compress(Bitmap.CompressFormat.JPEG, 85, it) }
      bitmap.recycle()
      Uri.fromFile(file).toString()
    }.getOrNull()
  }

  fun clear(context: Context) {
    dir(context).listFiles()?.forEach { it.delete() }
  }

  private fun extract(context: Context, uri: String): Bitmap? {
    val retriever = MediaMetadataRetriever()
    return try {
      retriever.setDataSource(context, Uri.parse(uri))
      val picture = retriever.embeddedPicture
      picture?.let { decode(it) }?.let { scale(it) }
    } catch (e: Throwable) {
      null
    } finally {
      runCatching { retriever.release() }
    }
  }

  private fun decode(bytes: ByteArray): Bitmap? {
    val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
    BitmapFactory.decodeByteArray(bytes, 0, bytes.size, bounds)
    var sample = 1
    while (bounds.outWidth / (sample * 2) >= SIZE && bounds.outHeight / (sample * 2) >= SIZE) sample *= 2
    return BitmapFactory.decodeByteArray(bytes, 0, bytes.size, BitmapFactory.Options().apply { inSampleSize = sample })
  }

  private fun scale(source: Bitmap): Bitmap {
    val side = minOf(source.width, source.height)
    val cropped = Bitmap.createBitmap(source, (source.width - side) / 2, (source.height - side) / 2, side, side)
    if (cropped !== source) source.recycle()
    if (side <= SIZE) return cropped
    val scaled = Bitmap.createScaledBitmap(cropped, SIZE, SIZE, true)
    if (scaled !== cropped) cropped.recycle()
    return scaled
  }
}
