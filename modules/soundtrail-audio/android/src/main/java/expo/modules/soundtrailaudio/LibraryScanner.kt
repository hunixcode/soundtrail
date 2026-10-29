package expo.modules.soundtrailaudio

import android.content.ContentUris
import android.content.Context
import android.net.Uri
import android.provider.MediaStore

object LibraryScanner {
  private const val UNKNOWN = "<unknown>"

  fun scan(context: Context): List<Map<String, Any?>> = audio(context)

  private fun audio(context: Context): List<Map<String, Any?>> {
    val base = MediaStore.Audio.Media.EXTERNAL_CONTENT_URI
    val projection = arrayOf(
      MediaStore.Audio.Media._ID,
      MediaStore.Audio.Media.TITLE,
      MediaStore.Audio.Media.DISPLAY_NAME,
      MediaStore.Audio.Media.ARTIST,
      MediaStore.Audio.Media.ALBUM,
      MediaStore.Audio.AudioColumns.DURATION
    )
    val selection = "${MediaStore.Audio.Media.IS_NOTIFICATION} = 0 AND " +
      "${MediaStore.Audio.Media.IS_RINGTONE} = 0 AND " +
      "${MediaStore.Audio.Media.IS_ALARM} = 0 AND " +
      "${MediaStore.Audio.AudioColumns.DURATION} > 0"
    val items = mutableListOf<Map<String, Any?>>()
    context.contentResolver.query(base, projection, selection, null, "${MediaStore.Audio.Media.TITLE} COLLATE NOCASE ASC")?.use { c ->
      val id = c.getColumnIndexOrThrow(MediaStore.Audio.Media._ID)
      val title = c.getColumnIndexOrThrow(MediaStore.Audio.Media.TITLE)
      val name = c.getColumnIndexOrThrow(MediaStore.Audio.Media.DISPLAY_NAME)
      val artist = c.getColumnIndexOrThrow(MediaStore.Audio.Media.ARTIST)
      val album = c.getColumnIndexOrThrow(MediaStore.Audio.Media.ALBUM)
      val duration = c.getColumnIndexOrThrow(MediaStore.Audio.AudioColumns.DURATION)
      while (c.moveToNext()) {
        val rowId = c.getLong(id)
        items.add(
          mapOf(
            "id" to "audio:$rowId",
            "uri" to ContentUris.withAppendedId(base, rowId).toString(),
            "title" to (c.getString(title)?.takeIf { it.isNotBlank() } ?: c.getString(name) ?: ""),
            "artist" to c.getString(artist)?.takeIf { it.isNotBlank() && it != UNKNOWN },
            "album" to c.getString(album)?.takeIf { it.isNotBlank() && it != UNKNOWN },
            "durationMs" to c.getLong(duration).toDouble()
          )
        )
      }
    }
    return items
  }

  fun describe(context: Context, uri: String): Map<String, Any?> {
    val parsed = Uri.parse(uri)
    var name: String? = null
    runCatching {
      context.contentResolver.query(parsed, arrayOf(MediaStore.MediaColumns.DISPLAY_NAME), null, null, null)?.use { c ->
        if (c.moveToFirst()) name = c.getString(0)
      }
    }
    val retriever = android.media.MediaMetadataRetriever()
    return try {
      retriever.setDataSource(context, parsed)
      val title = retriever.extractMetadata(android.media.MediaMetadataRetriever.METADATA_KEY_TITLE)
      val artist = retriever.extractMetadata(android.media.MediaMetadataRetriever.METADATA_KEY_ARTIST)
      val duration = retriever.extractMetadata(android.media.MediaMetadataRetriever.METADATA_KEY_DURATION)?.toDoubleOrNull() ?: 0.0
      val hasAudio = retriever.extractMetadata(android.media.MediaMetadataRetriever.METADATA_KEY_HAS_AUDIO) == "yes"
      mapOf(
        "title" to (title?.takeIf { it.isNotBlank() } ?: name ?: parsed.lastPathSegment ?: ""),
        "artist" to artist?.takeIf { it.isNotBlank() },
        "durationMs" to duration,
        "hasAudio" to hasAudio
      )
    } catch (e: Throwable) {
      mapOf(
        "title" to (name ?: parsed.lastPathSegment ?: ""),
        "artist" to null,
        "durationMs" to 0.0,
        "hasAudio" to false
      )
    } finally {
      runCatching { retriever.release() }
    }
  }
}
