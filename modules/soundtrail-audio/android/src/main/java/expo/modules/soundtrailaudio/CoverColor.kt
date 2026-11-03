package expo.modules.soundtrailaudio

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import java.io.File
import java.net.HttpURLConnection
import java.net.URL

object CoverColor {
  private const val SIDE = 24

  fun pick(pixels: IntArray): String? {
    if (pixels.isEmpty()) return null
    var r = 0.0
    var g = 0.0
    var b = 0.0
    var total = 0.0
    for (p in pixels) {
      val pr = (p shr 16) and 0xFF
      val pg = (p shr 8) and 0xFF
      val pb = p and 0xFF
      val max = maxOf(pr, pg, pb)
      val weight = (max - minOf(pr, pg, pb)) / 255.0 * (max / 255.0) + 0.01
      r += pr * weight
      g += pg * weight
      b += pb * weight
      total += weight
    }
    return "#%02X%02X%02X".format((r / total).toInt(), (g / total).toInt(), (b / total).toInt())
  }

  fun load(context: Context, source: String): String? {
    val bytes = when {
      source.startsWith("file://") -> {
        val file = File(Uri.parse(source).path ?: return null).canonicalFile
        if (!file.path.startsWith(context.cacheDir.canonicalPath)) return null
        file.readBytes()
      }
      source.startsWith("https://") -> (URL(source).openConnection() as HttpURLConnection).run {
        connectTimeout = 8000
        readTimeout = 8000
        try {
          inputStream.use { it.readBytes() }
        } finally {
          disconnect()
        }
      }
      else -> return null
    }
    val bitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.size, BitmapFactory.Options().apply { inSampleSize = 4 }) ?: return null
    val small = Bitmap.createScaledBitmap(bitmap, SIDE, SIDE, true)
    val pixels = IntArray(SIDE * SIDE)
    small.getPixels(pixels, 0, SIDE, 0, 0, SIDE, SIDE)
    if (small !== bitmap) small.recycle()
    bitmap.recycle()
    return pick(pixels)
  }
}
