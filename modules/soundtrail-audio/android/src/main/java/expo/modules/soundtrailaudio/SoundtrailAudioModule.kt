package expo.modules.soundtrailaudio

import android.content.ComponentName
import android.content.Context
import android.net.Uri
import android.os.Handler
import android.os.Looper
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.MediaMetadata
import androidx.media3.common.PlaybackException
import androidx.media3.common.PlaybackParameters
import androidx.media3.common.Player
import androidx.media3.common.Tracks
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.session.MediaController
import androidx.media3.session.SessionToken
import com.google.common.util.concurrent.ListenableFuture
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record

class QueueItem : Record {
  @Field
  val id: String = ""

  @Field
  val uri: String = ""

  @Field
  val title: String = ""

  @Field
  val artist: String? = null

  @Field
  val artworkUri: String? = null
}

class SoundtrailAudioModule : Module() {
  private val handler = Handler(Looper.getMainLooper())
  private var controller: ListenableFuture<MediaController>? = null
  private var attached: ExoPlayer? = null

  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  private val prefs
    get() = context.getSharedPreferences("soundtrail", Context.MODE_PRIVATE)

  private val ticker = object : Runnable {
    override fun run() {
      val player = attached ?: return
      emitStatus(player)
      if (player.isPlaying) handler.postDelayed(this, 250)
    }
  }

  private val listener = object : Player.Listener {
    override fun onEvents(player: Player, events: Player.Events) {
      emitStatus(player)
      if (events.contains(Player.EVENT_IS_PLAYING_CHANGED) && player.isPlaying) {
        handler.removeCallbacks(ticker)
        handler.postDelayed(ticker, 250)
      }
    }

    override fun onPlayerError(error: PlaybackException) {
      sendEvent("onError", mapOf("code" to PlaybackRules.errorCode(error.errorCode), "message" to (error.message ?: "")))
    }

    override fun onTracksChanged(tracks: Tracks) {
      if (!tracks.isEmpty && !tracks.containsType(C.TRACK_TYPE_AUDIO)) {
        sendEvent("onError", mapOf("code" to "NO_AUDIO_TRACK", "message" to ""))
        attached?.pause()
      }
    }

    override fun onAudioSessionIdChanged(audioSessionId: Int) {
      if (audioSessionId != C.AUDIO_SESSION_ID_UNSET) PlayerHolder.equalizer.attach(audioSessionId)
    }
  }

  private fun player(): ExoPlayer {
    val player = PlayerHolder.get(context)
    if (attached !== player) {
      attached?.removeListener(listener)
      player.addListener(listener)
      attached = player
    }
    if (controller == null) {
      val token = SessionToken(context, ComponentName(context, PlaybackService::class.java))
      controller = MediaController.Builder(context, token).buildAsync()
    }
    return player
  }

  private fun status(player: Player): Map<String, Any?> = mapOf(
    "isPlaying" to player.isPlaying,
    "playWhenReady" to player.playWhenReady,
    "isBuffering" to (player.playbackState == Player.STATE_BUFFERING),
    "isEnded" to (player.playbackState == Player.STATE_ENDED),
    "positionMs" to player.currentPosition.coerceAtLeast(0).toDouble(),
    "durationMs" to (if (player.duration == C.TIME_UNSET) 0.0 else player.duration.toDouble()),
    "index" to (if (player.mediaItemCount == 0) -1 else player.currentMediaItemIndex),
    "mediaId" to player.currentMediaItem?.mediaId,
    "speed" to player.playbackParameters.speed.toDouble(),
    "shuffle" to player.shuffleModeEnabled,
    "repeat" to PlaybackRules.repeatName(player.repeatMode)
  )

  private fun emitStatus(player: Player) {
    sendEvent("onStatus", status(player))
  }

  private fun equalizerState(): Map<String, Any?> = mapOf(
    "available" to PlayerHolder.equalizer.available,
    "enabled" to PlayerHolder.equalizer.isEnabled,
    "bands" to PlayerHolder.equalizer.bands()
  )

  override fun definition() = ModuleDefinition {
    Name("SoundtrailAudio")

    Events("onStatus", "onError")

    OnDestroy {
      handler.removeCallbacks(ticker)
      handler.post {
        attached?.removeListener(listener)
        attached = null
        controller?.let { MediaController.releaseFuture(it) }
        controller = null
      }
    }

    AsyncFunction("scanLibrary") {
      LibraryScanner.scan(context)
    }

    AsyncFunction("describe") { uri: String ->
      LibraryScanner.describe(context, uri)
    }

    AsyncFunction("getArtwork") { uri: String ->
      ArtworkCache.load(context, uri)
    }

    AsyncFunction("clearArtworkCache") {
      ArtworkCache.clear(context)
    }

    AsyncFunction("getPrefs") {
      prefs.getString("state", null)
    }

    AsyncFunction("setPrefs") { json: String ->
      prefs.edit().putString("state", json).apply()
    }

    AsyncFunction("getStatus") {
      status(player())
    }.runOnQueue(Queues.MAIN)

    AsyncFunction("setQueue") { items: List<QueueItem>, startIndex: Int, playWhenReady: Boolean ->
      val player = player()
      val media = items.map { item ->
        val metadata = MediaMetadata.Builder()
          .setTitle(item.title)
          .setArtist(item.artist)
          .apply { item.artworkUri?.let { setArtworkUri(Uri.parse(it)) } }
          .build()
        MediaItem.Builder().setMediaId(item.id).setUri(item.uri).setMediaMetadata(metadata).build()
      }
      player.setMediaItems(media, startIndex.coerceIn(0, (media.size - 1).coerceAtLeast(0)), 0L)
      player.prepare()
      player.playWhenReady = playWhenReady
    }.runOnQueue(Queues.MAIN)

    AsyncFunction("play") {
      val player = player()
      if (player.playbackState == Player.STATE_IDLE) player.prepare()
      if (player.playbackState == Player.STATE_ENDED) player.seekToDefaultPosition()
      player.play()
    }.runOnQueue(Queues.MAIN)

    AsyncFunction("pause") {
      player().pause()
    }.runOnQueue(Queues.MAIN)

    AsyncFunction("next") {
      player().seekToNextMediaItem()
    }.runOnQueue(Queues.MAIN)

    AsyncFunction("previous") {
      player().seekToPrevious()
    }.runOnQueue(Queues.MAIN)

    AsyncFunction("skipTo") { index: Int ->
      val player = player()
      if (index in 0 until player.mediaItemCount) player.seekToDefaultPosition(index)
    }.runOnQueue(Queues.MAIN)

    AsyncFunction("seekTo") { positionMs: Double ->
      player().seekTo(positionMs.toLong().coerceAtLeast(0L))
    }.runOnQueue(Queues.MAIN)

    AsyncFunction("setSpeed") { speed: Double ->
      val clamped = PlaybackRules.clampSpeed(speed)
      player().playbackParameters = PlaybackParameters(clamped, clamped)
    }.runOnQueue(Queues.MAIN)

    AsyncFunction("setShuffle") { enabled: Boolean ->
      player().shuffleModeEnabled = enabled
    }.runOnQueue(Queues.MAIN)

    AsyncFunction("setRepeat") { mode: String ->
      player().repeatMode = PlaybackRules.repeatMode(mode)
    }.runOnQueue(Queues.MAIN)

    AsyncFunction("getEqualizer") {
      player()
      equalizerState()
    }.runOnQueue(Queues.MAIN)

    AsyncFunction("setEqEnabled") { enabled: Boolean ->
      player()
      PlayerHolder.equalizer.setEnabled(enabled)
    }.runOnQueue(Queues.MAIN)

    AsyncFunction("setEqGains") { gains: List<Double> ->
      player()
      gains.forEachIndexed { index, db -> PlayerHolder.equalizer.setGain(index, db) }
    }.runOnQueue(Queues.MAIN)

    AsyncFunction("setEqBandGain") { index: Int, db: Double ->
      PlayerHolder.equalizer.setGain(index, db)
    }
  }
}
