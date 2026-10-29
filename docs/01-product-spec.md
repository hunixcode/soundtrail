# 01 · Product spec

## 1. Purpose

Let a user listen to their own audio files with control over sound quality (equalizer) and tempo (speed), on an Android phone, without a streaming service.

## 2. Target user

- A person who keeps music files on their phone and wants better sound or slower/faster playback (for example, to learn a song, practice an instrument, or follow a lecture).
- No account, no cloud, no ads in v1.

## 3. Scope (v1)

### 3.1 Music player

- Scan the device for audio files and show them as a library (title, artist when the file has tags, duration).
- Play, pause, next, previous, seek.
- Basic queue: play a list in order, optionally repeat the list or a single track.
- Background playback with a media notification and lock-screen controls.
- Supported audio formats: those supported by the platform media engine (Media3/ExoPlayer), at minimum MP3, AAC/M4A, OGG/Vorbis, OPUS, FLAC, and WAV.

### 3.2 Open a file

- Besides the scan, the user can open any audio file from device storage with the system file picker.
- The equalizer and speed changer apply to it exactly as they do to the library.
- A file with no audio track shows a clear message instead of failing silently.
- Video files are not supported.

### 3.3 Equalizer

- On/off switch for the equalizer.
- Band sliders for the device's supported bands (the number of bands and their frequencies come from the device, not hard-coded).
- Presets: Flat, Bass Boost, Treble Boost, Vocal, Rock, Pop, Classical. Users can save their own preset by name.
- Changes apply during playback without restarting the track.
- Settings persist between app launches.

### 3.4 Speed changer

- Playback speed control from 0.5x to 2.0x, in steps of 0.01x, with a reset to 1.0x.
- Pitch follows the speed, like a record played faster or slower: 1.25x sounds higher, 0.75x sounds lower.
- Speed setting applies during playback and persists between launches.
- Speed has its own **Speed page** (section 5, screen 3). It is the main place to change speed. The Now playing page shows the current speed as a small badge. Tapping it opens a small slider right there for fine changes between 0.90x and 1.10x, in 0.01x steps; tapping it again closes the slider.

### 3.5 Online extras

- **Lyrics**: the Player shows the lyrics of the current track, fetched from LRCLIB (free, no account, no key). Synced lyrics highlight the current line and scroll with playback; tapping a line seeks to it. Plain lyrics show as text. If nothing matches, the page says so.
- **Online music**: an "Online" filter in the Library searches free tracks on Audius (free, no account, no key) and shows trending tracks when the search is empty. Online tracks stream and get the same equalizer, speed and queue as local files.
- Both need a connection. Without one, the rest of the app works as before and these views say they are unavailable.

### 3.6 Shared behavior

- The equalizer and speed settings are global. They apply to every track.
- Playing a new file keeps the current equalizer and speed settings.

## 4. User stories

| ID | As a user, I want to... | So that... |
|----|-------------------------|------------|
| US-1 | scan my phone for audio files | I can see my music in one list |
| US-2 | play, pause, skip, and seek | I can control playback |
| US-3 | keep music playing when the screen is off | I can listen while using other apps |
| US-4 | open an audio file that is not in the scan | I can play any file I have |
| US-5 | turn the equalizer on and move band sliders | I can shape the sound |
| US-6 | choose and save equalizer presets | I can switch sound profiles quickly |
| US-7 | speed a track up or slow it down, with the pitch following | I get sped-up or slowed versions of my music |
| US-8 | have my equalizer and speed settings remembered | I do not set them again every time |
| US-9 | open a dedicated Speed page and set the tempo there | I can work on speed without the rest of the player in the way |
| US-10 | see a Spotify-like player: a mini bar that opens into a full now-playing view | I can follow what is playing from any screen |
| US-11 | switch between sections with a floating dynamic-island navbar at the bottom | I can reach every section with one thumb |

## 5. Screens

### 5.1 Navigation shell

A **floating dynamic-island navbar** sits at the bottom of every main screen. It is a rounded pill, centered, with four tab items:

| Tab | Icon label | Screen |
|-----|-----------|--------|
| 1 | Library | Library (screen 1) |
| 2 | Player | Now playing (screen 2) |
| 3 | Speed | Speed (screen 3) |
| 4 | Equalizer | Equalizer (screen 4) |

Behavior:

- The active tab is shown as a wider pill with its label. Inactive tabs show icons only.
- The island animates its active indicator when the tab changes (a short, smooth spring; no bounce that moves the content).
- While a track is playing and the user is on any tab other than Player, the island grows a compact now-playing strip (small artwork, title, play/pause). Tapping the strip opens Player. This is the "dynamic island" behavior.
- The navbar does not cover list content: the Library list and other scrollable content have bottom padding equal to the navbar height plus safe-area inset.
- Settings is not a tab. It is opened from a gear icon in the Library header.

### 5.2 Mini player (Spotify-like)

The mini player is the navbar's expanded "island" state, not a separate bar:

- While a track is loaded and the user is on Library, Speed, or Equalizer, the island grows a now-playing row above the tabs. It shows artwork, title, artist, play/pause, and next.
- Tapping the row (not its buttons) opens the full Player screen.
- Swiping the row left/right goes to the next/previous track.
- On the Player tab the island collapses back to tabs only.

### 5.3 Screens

1. **Library**: list of audio files, scanned again each time the tab opens so new and deleted files show up, search box, tap to play. Filters: On device, Online (section 3.5). A header button switches between a list and a grid of square artwork tiles; the choice is saved. Button to open an audio file. Gear icon opens Settings.
2. **Player** (Spotify-like full now-playing): large square artwork (placeholder when none), title and artist, progress bar with elapsed and remaining time, play/pause (large), previous, next, shuffle and repeat toggles, a lyrics button that swaps the artwork for the lyrics (section 3.5), and a queue button that shows the upcoming tracks as a list. A chevron at the top closes it back to the previous tab. No speed or equalizer controls here, except the small speed label described in section 3.4.
3. **Speed**: its own page. Large readout of the current speed (for example "1.25x"), a slider from 0.5x to 2.0x in 0.01x steps, a stepper (minus/plus buttons, same step), a reset-to-1.0x button, and quick presets (0.75x, 1.0x, 1.25x, 1.5x). A note under the readout says the pitch follows the speed. Works with no track loaded: the value is saved and applies to the next track.
4. **Equalizer**: on/off switch, preset picker, band sliders, save-preset button.
5. **Settings** (opened from the Library gear icon): reset equalizer, reset speed, clear library cache, app version. Nothing else in v1.

Layout rules: Android phone portrait first. Touch targets at least 48 dp. Text readable with the system font-size setting. The navbar respects the bottom safe-area inset. On wide screens (tablets) content is centered with a maximum width.

## 6. Non-goals (v1)

- No iOS build.
- No paid streaming services, accounts, cloud sync, or ads. Only the free, keyless sources in section 3.5.
- No pitch shifting independent of speed (a "key change" feature), and no time-stretching that keeps the pitch.
- No video files of any kind (dropped, see D4).
- No exporting or re-encoding audio files.
- No tag editing.
- No playlists saved to disk beyond the current queue.
- No Google Play release work in v1 (signing and store listing come later).

## 7. Quality bar

- Playback starts within about 1 second for a local file on a mid-range phone.
- Changing an equalizer band or the speed is audible within about 200 ms.
- No crash when a file is corrupt or unsupported; the user sees an error message and the app keeps running.
- Works offline, except lyrics and online music (section 3.5).
- Respects storage and media permissions: asks only for what it needs, explains why, and works with a denial (shows a message, does not crash).
