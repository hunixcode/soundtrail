package expo.modules.soundtrailaudio

import android.media.audiofx.Equalizer

class EqualizerController {
  private var equalizer: Equalizer? = null
  private var enabled = false
  private val gains = mutableMapOf<Int, Int>()

  val available: Boolean
    get() = equalizer != null

  val isEnabled: Boolean
    get() = enabled

  @Synchronized
  fun attach(sessionId: Int) {
    release()
    val eq = try {
      Equalizer(0, sessionId)
    } catch (e: Throwable) {
      null
    } ?: return
    equalizer = eq
    gains.forEach { (band, mb) -> runCatching { eq.setBandLevel(band.toShort(), mb.toShort()) } }
    runCatching { eq.setEnabled(enabled) }
  }

  @Synchronized
  fun bands(): List<Map<String, Any>> {
    val eq = equalizer ?: return emptyList()
    return runCatching {
      val range = eq.bandLevelRange
      (0 until eq.numberOfBands.toInt()).map { i ->
        val band = i.toShort()
        mapOf(
          "index" to i,
          "centerHz" to eq.getCenterFreq(band) / 1000.0,
          "minDb" to range[0] / 100.0,
          "maxDb" to range[1] / 100.0,
          "gainDb" to eq.getBandLevel(band) / 100.0
        )
      }
    }.getOrDefault(emptyList())
  }

  @Synchronized
  fun setEnabled(on: Boolean) {
    enabled = on
    equalizer?.let { runCatching { it.setEnabled(on) } }
  }

  @Synchronized
  fun setGain(index: Int, db: Double) {
    val eq = equalizer ?: return
    runCatching {
      val range = eq.bandLevelRange
      val mb = PlaybackRules.toMillibels(db, range[0].toInt(), range[1].toInt())
      gains[index] = mb
      eq.setBandLevel(index.toShort(), mb.toShort())
    }
  }

  @Synchronized
  fun release() {
    equalizer?.let { runCatching { it.release() } }
    equalizer = null
  }
}
