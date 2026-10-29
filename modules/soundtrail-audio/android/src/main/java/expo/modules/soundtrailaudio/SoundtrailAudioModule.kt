package expo.modules.soundtrailaudio

import android.app.Activity
import android.app.PendingIntent
import android.app.RecoverableSecurityException
import android.content.ComponentName
import android.content.ContentValues
import android.content.Context
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.provider.MediaStore
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
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.CodedException
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

class FileEditException(message: String) : CodedException("FILE_EDIT_FAILED", message, null)

class SoundtrailAudioModule : Module() {
  private val handler = Handler(Looper.getMainLooper())
  private var consent: ((Boolean) -> Unit)? = null
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

  private fun mediaItem(item: QueueItem): MediaItem {
    val metadata = MediaMetadata.Builder()
      .setTitle(item.title)
      .setArtist(item.artist)
      .apply { item.artworkUri?.let { setArtworkUri(Uri.parse(it)) } }
      .build()
    return MediaItem.Builder().setMediaId(item.id).setUri(item.uri).setMediaMetadata(metadata).build()
  }

  private fun askConsent(request: PendingIntent, then: (Boolean) -> Unit) {
    val activity = appContext.currentActivity ?: return then(false)
    consent?.invoke(false)
    consent = then
    activity.runOnUiThread {
      runCatching { activity.startIntentSenderForResult(request.intentSender, CONSENT_REQUEST, null, 0, 0, 0) }
        .onFailure { consent = null; then(false) }
    }
  }

  private fun update(target: Uri, values: ContentValues, promise: Promise) {
    val apply = {
      runCatching { context.contentResolver.update(target, values, null, null) > 0 }
        .onSuccess { promise.resolve(it) }
        .onFailure { promise.reject(FileEditException(it.message ?: "Update failed")) }
      Unit
    }
    when {
      Build.VERSION.SDK_INT >= Build.VERSION_CODES.R ->
        askConsent(MediaStore.createWriteRequest(context.contentResolver, listOf(target))) { ok ->
          if (ok) apply() else promise.resolve(false)
        }
      else -> try {
        promise.resolve(context.contentResolver.update(target, values, null, null) > 0)
      } catch (e: RecoverableSecurityException) {
        askConsent(e.userAction.actionIntent) { ok -> if (ok) apply() else promise.resolve(false) }
      } catch (e: Throwable) {
        promise.reject(FileEditException(e.message ?: "Update failed"))
      }
    }
  }

  private fun displayName(target: Uri): String? =
    context.contentResolver.query(target, arrayOf(MediaStore.MediaColumns.DISPLAY_NAME), null, null, null)?.use { c ->
      if (c.moveToFirst()) c.getString(0) else null
    }

  override fun definition() = ModuleDefinition {
    Name("SoundtrailAudio")

    Events("onStatus", "onError")

    OnActivityResult { _, payload ->
      if (payload.requestCode == CONSENT_REQUEST) {
        val done = consent
        consent = null
        done?.invoke(payload.resultCode == Activity.RESULT_OK)
      }
    }

    AsyncFunction("renameFile") { uri: String, name: String, promise: Promise ->
      val target = Uri.parse(uri)
      val clean = name.trim()
      if (clean.isEmpty() || clean.contains('/')) return@AsyncFunction promise.reject(FileEditException("Invalid name"))
      val current = displayName(target) ?: return@AsyncFunction promise.reject(FileEditException("File not found"))
      val extension = current.substringAfterLast('.', "").let { if (it.isEmpty() || it == current) "" else ".$it" }
      val values = ContentValues().apply { put(MediaStore.MediaColumns.DISPLAY_NAME, clean + extension) }
      update(target, values, promise)
    }

    AsyncFunction("moveFile") { uri: String, folder: String, promise: Promise ->
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) return@AsyncFunction promise.reject(FileEditException("Moving needs Android 10"))
      val path = folder.trim('/', ' ')
      if (path.isEmpty() || path.split('/').any { it.isBlank() || it == ".." }) {
        return@AsyncFunction promise.reject(FileEditException("Invalid folder"))
      }
      val values = ContentValues().apply { put(MediaStore.MediaColumns.RELATIVE_PATH, "$path/") }
      update(Uri.parse(uri), values, promise)
    }

    AsyncFunction("deleteFile") { uri: String, promise: Promise ->
      val target = Uri.parse(uri)
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
        askConsent(MediaStore.createDeleteRequest(context.contentResolver, listOf(target))) { ok -> promise.resolve(ok) }
        return@AsyncFunction
      }
      try {
        promise.resolve(context.contentResolver.delete(target, null, null) > 0)
      } catch (e: RecoverableSecurityException) {
        askConsent(e.userAction.actionIntent) { ok ->
          if (!ok) promise.resolve(false)
          else runCatching { context.contentResolver.delete(target, null, null) > 0 }
            .onSuccess { promise.resolve(it) }
            .onFailure { promise.reject(FileEditException(it.message ?: "Delete failed")) }
        }
      } catch (e: Throwable) {
        promise.reject(FileEditException(e.message ?: "Delete failed"))
      }
    }

    AsyncFunction("enqueue") { item: QueueItem, next: Boolean ->
      val player = player()
      val media = mediaItem(item)
      if (player.mediaItemCount == 0) {
        player.setMediaItem(media)
        player.prepare()
      } else {
        player.addMediaItem(if (next) player.currentMediaItemIndex + 1 else player.mediaItemCount, media)
      }
    }.runOnQueue(Queues.MAIN)

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
      val media = items.map(::mediaItem)
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

private const val CONSENT_REQUEST = 0x5717
