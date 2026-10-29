package expo.modules.soundtrailaudio

import android.content.Context
import android.media.AudioManager
import androidx.annotation.OptIn
import androidx.media3.common.AudioAttributes
import androidx.media3.common.C
import androidx.media3.common.util.UnstableApi
import androidx.media3.exoplayer.ExoPlayer

object PlayerHolder {
  private var instance: ExoPlayer? = null
  val equalizer = EqualizerController()

  @OptIn(UnstableApi::class)
  fun get(context: Context): ExoPlayer {
    instance?.let { return it }
    val app = context.applicationContext
    val attributes = AudioAttributes.Builder()
      .setUsage(C.USAGE_MEDIA)
      .setContentType(C.AUDIO_CONTENT_TYPE_MUSIC)
      .build()
    val player = ExoPlayer.Builder(app)
      .setAudioAttributes(attributes, true)
      .setHandleAudioBecomingNoisy(true)
      .setWakeMode(C.WAKE_MODE_LOCAL)
      .build()
    player.trackSelectionParameters = player.trackSelectionParameters.buildUpon()
      .setTrackTypeDisabled(C.TRACK_TYPE_VIDEO, true)
      .build()
    val audioManager = app.getSystemService(Context.AUDIO_SERVICE) as AudioManager
    val sessionId = audioManager.generateAudioSessionId()
    player.audioSessionId = sessionId
    equalizer.attach(sessionId)
    instance = player
    return player
  }

  fun release() {
    instance?.release()
    instance = null
    equalizer.release()
  }
}
