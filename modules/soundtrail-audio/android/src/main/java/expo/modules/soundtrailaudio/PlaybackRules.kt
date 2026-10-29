package expo.modules.soundtrailaudio

import androidx.media3.common.PlaybackException
import androidx.media3.common.Player

object PlaybackRules {
  const val MIN_SPEED = 0.5f
  const val MAX_SPEED = 2.0f

  fun clampSpeed(speed: Double): Float =
    if (speed.isNaN()) 1f else speed.toFloat().coerceIn(MIN_SPEED, MAX_SPEED)

  fun toMillibels(db: Double, minMb: Int, maxMb: Int): Int =
    if (db.isNaN()) 0.coerceIn(minMb, maxMb) else Math.round(db * 100).toInt().coerceIn(minMb, maxMb)

  fun errorCode(code: Int): String = when (code) {
    PlaybackException.ERROR_CODE_DECODING_FORMAT_UNSUPPORTED,
    PlaybackException.ERROR_CODE_DECODING_FORMAT_EXCEEDS_CAPABILITIES,
    PlaybackException.ERROR_CODE_PARSING_CONTAINER_UNSUPPORTED,
    PlaybackException.ERROR_CODE_PARSING_MANIFEST_UNSUPPORTED -> "UNSUPPORTED_FORMAT"
    PlaybackException.ERROR_CODE_PARSING_CONTAINER_MALFORMED,
    PlaybackException.ERROR_CODE_PARSING_MANIFEST_MALFORMED,
    PlaybackException.ERROR_CODE_DECODING_FAILED -> "CORRUPT_FILE"
    in 2000..2999 -> "IO_ERROR"
    else -> "PLAYBACK_ERROR"
  }

  fun repeatName(mode: Int): String = when (mode) {
    Player.REPEAT_MODE_ALL -> "all"
    Player.REPEAT_MODE_ONE -> "one"
    else -> "off"
  }

  fun repeatMode(name: String): Int = when (name) {
    "all" -> Player.REPEAT_MODE_ALL
    "one" -> Player.REPEAT_MODE_ONE
    else -> Player.REPEAT_MODE_OFF
  }
}
