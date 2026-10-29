package expo.modules.soundtrailaudio

import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import org.junit.Assert.assertEquals
import org.junit.Test

class PlaybackRulesTest {
  @Test
  fun clampsSpeedToSupportedRange() {
    assertEquals(0.5f, PlaybackRules.clampSpeed(0.1), 0f)
    assertEquals(2.0f, PlaybackRules.clampSpeed(9.0), 0f)
    assertEquals(1.25f, PlaybackRules.clampSpeed(1.25), 0f)
    assertEquals(1f, PlaybackRules.clampSpeed(Double.NaN), 0f)
  }

  @Test
  fun convertsDecibelsToClampedMillibels() {
    assertEquals(350, PlaybackRules.toMillibels(3.5, -1500, 1500))
    assertEquals(1500, PlaybackRules.toMillibels(40.0, -1500, 1500))
    assertEquals(-1500, PlaybackRules.toMillibels(-40.0, -1500, 1500))
    assertEquals(0, PlaybackRules.toMillibels(Double.NaN, -1500, 1500))
  }

  @Test
  fun mapsPlaybackErrorCodes() {
    assertEquals("UNSUPPORTED_FORMAT", PlaybackRules.errorCode(PlaybackException.ERROR_CODE_DECODING_FORMAT_UNSUPPORTED))
    assertEquals("CORRUPT_FILE", PlaybackRules.errorCode(PlaybackException.ERROR_CODE_PARSING_CONTAINER_MALFORMED))
    assertEquals("IO_ERROR", PlaybackRules.errorCode(PlaybackException.ERROR_CODE_IO_FILE_NOT_FOUND))
    assertEquals("PLAYBACK_ERROR", PlaybackRules.errorCode(PlaybackException.ERROR_CODE_UNSPECIFIED))
  }

  @Test
  fun roundTripsRepeatModes() {
    listOf("off", "all", "one").forEach { assertEquals(it, PlaybackRules.repeatName(PlaybackRules.repeatMode(it))) }
    assertEquals(Player.REPEAT_MODE_OFF, PlaybackRules.repeatMode("unknown"))
  }
}
