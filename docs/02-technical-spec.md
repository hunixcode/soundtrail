# 02 · Technical spec

## 1. Stack

| Layer | Choice | Why |
|-------|--------|-----|
| App framework | React Native with Expo (managed workflow, latest stable SDK at project start) | Fast Android delivery, a standard Expo toolchain, and OTA-free simplicity for v1. |
| Language | TypeScript (strict mode) | Catches mistakes before they reach the phone. |
| Navigation | `expo-router` | File-based routing that ships with Expo. |
| UI | React Native core components plus a small in-house style layer; no UI kit in v1 | Keeps dependencies low. |
| Local storage (settings, presets) | Android `SharedPreferences`, exposed by the audio module (`getPrefs` / `setPrefs`), validated in `src/state/prefs.ts` | No extra dependency; the native module already exists. |
| Media file access | `expo-document-picker` (pick an audio file) and a MediaStore query in the audio module (scan device audio) | The scan needs only a few columns; doing it natively avoids another dependency. |
| Playback and audio effects | **Custom Expo Module** (`modules/soundtrail-audio`) wrapping AndroidX Media3 (ExoPlayer) and the Android audio effects API | Only native code can give us a real equalizer and speed control on the audio output. See section 3. |
| Testing | Jest with `jest-expo` for JS logic; the native module has unit tests in Kotlin (JUnit) | Matches the Expo defaults. |
| Build | EAS Build (Android APK/AAB) | Standard Expo build pipeline. |

Do not use `expo-av` for new code. Expo has deprecated it in favor of `expo-audio`, and `expo-audio` does not provide an equalizer, so the custom module is needed either way.

## 2. Architecture

```
┌──────────────────────────────────────────────┐
│ React Native UI (expo-router screens)        │
│   Library · Now playing · Equalizer · Settings│
└───────────────┬──────────────────────────────┘
                │ typed calls + events
┌───────────────▼──────────────────────────────┐
│ App state (React context + reducer)          │
│   queue, current item, eq, speed, presets    │
└───────────────┬──────────────────────────────┘
                │
┌───────────────▼──────────────────────────────┐
│ Storage service  (settings, presets)         │
└───────────────┬──────────────────────────────┘
                │
┌───────────────▼──────────────────────────────┐
│ modules/soundtrail-audio  (Expo Module)      │
│   Kotlin: Media3 ExoPlayer                   │
│           + Android Equalizer effect         │
│           + playback speed (PlaybackParameters)│
│           + MediaSession (notification/lock) │
└──────────────────────────────────────────────┘
```

Rules:

- The UI never talks to Media3 or Android APIs directly. It calls the TypeScript wrapper around the native module.
- The native module is the only owner of the player. The JS side holds a copy of the state for display.
- Settings are written to storage whenever they change, and read once at launch.

### 2.1 Navigation and shell

- Routing with `expo-router` (routes live in `src/app/`). The four main sections are the tabs of one layout built with `expo-router/ui`: `src/app/(tabs)/index` (Library), `player`, `speed`, `equalizer`. Settings is a stack screen (`src/app/settings`) pushed from the Library header.
- The Player is a tab. The island's now-playing row and the Player tab read one store (`src/state/app.ts`), so they never disagree.
- The bottom navbar is a **custom tab bar** passed to the tabs layout, not the default Expo tab bar. It is built with `react-native-reanimated` for the pill and island animations, installed through `npx expo install` (rule 1 of section 4) and checked with the dependency rules.
- The navbar's compact now-playing strip reads from the same now-playing state. It is hidden on the Player tab.
- The mini player is the island's expanded state (see product spec section 5.2).
- Gestures (sliders, island swipe) use `react-native-gesture-handler` v3 hooks; their callbacks run as worklets on the UI thread.

## 3. The audio engine (native module)

### 3.1 Responsibilities

| Feature | Implementation |
|---------|----------------|
| Play a local audio file | Media3 `ExoPlayer` with a `MediaItem` built from the file URI. |
| Speed with pitch following | `player.setPlaybackParameters(PlaybackParameters(speed, speed))`. ExoPlayer resamples the audio, like a record played faster or slower. |
| Equalizer | `android.media.audiofx.Equalizer` attached to the player's `audioSessionId`. |
| Background playback and notification | Media3 `MediaSessionService` with a foreground notification. |
| Position, duration, state events | ExoPlayer listeners forwarded to JS as Expo Module events, at most 4 per second for progress. |

### 3.2 Module API (TypeScript view)

```ts
type EqBand = { index: number; centerHz: number; minDb: number; maxDb: number; gainDb: number };

interface SoundtrailAudio {
  load(uri: string): Promise<{ durationMs: number; hasAudio: boolean }>;
  play(): void;
  pause(): void;
  seekTo(ms: number): void;
  setSpeed(speed: number): void;        // 0.5 – 2.0, pitch follows speed
  setEqEnabled(on: boolean): void;
  getEqBands(): EqBand[];               // from the device, may be empty
  setEqBandGain(index: number, db: number): void;
  release(): void;
  // events: onState, onProgress, onError, onEnded
}
```

Error contract: every native failure becomes a rejected promise or an `onError` event with a short code (`UNSUPPORTED_FORMAT`, `NO_AUDIO_TRACK`, `IO_ERROR`, `EQ_UNAVAILABLE`). The UI maps codes to messages.

### 3.3 Equalizer details

- The band list comes from the device at runtime. Do not hard-code frequencies.
- If `getEqBands()` returns an empty list or the effect cannot be created, the Equalizer screen shows "Equalizer not available on this device" and speed/playback still work.
- The effect is released and recreated when the player's audio session changes.
- Presets are stored as a list of band gains. If a device has a different band count, map presets by nearest center frequency.

### 3.4 Known risks to check on real hardware

- Equalizer behavior varies by manufacturer (band count, gain range, sometimes no effect at all). Test on at least two Android devices of different brands before v1.
- Some phones apply their own system sound effects on top of the app effect. Document this for the user; do not try to disable system effects.
- Speed above 1.0x on very low-end devices can stutter if decoding is slow. Measure before optimizing.

## 4. Dependency rules

These rules apply to every package and native library added to the project.

1. **Install through Expo.** Use `npx expo install <pkg>` for anything Expo supports, so the version matches the SDK.
2. **Verify before adding.** Check the package's npm page and GitHub repository: active maintenance (a release in the last 12 months), a clear license (MIT, Apache-2.0, BSD, or similar), and no deprecation notice.
3. **Run an audit on every change.** `npm audit --omit=dev` must report no high or critical issues. Fix or justify any other finding in the PR description.
4. **Check the lockfile.** Commit `package-lock.json` (or the lockfile of the package manager chosen at setup). Do not upgrade packages in the same commit as a feature.
5. **Native dependencies** (AndroidX Media3, Gradle plugins) must come from Google Maven or Maven Central, use a version from the official release notes, and be included in the audit step (for example, through GitHub Dependabot alerts or OWASP Dependency-Check).
6. **Keep dependencies few.** Add a package only when the platform or Expo does not already cover the job.
7. **Turn on automated alerts.** GitHub Dependabot security updates for npm and Gradle.
8. **No abandoned packages.** If a package has no release in 12 months and is needed, record it in `03-roadmap.md` under open decisions.
9. **Record decisions.** Any new runtime dependency gets one line in the PR description: what it does, why it is needed, and what was checked.

Versions are not written in these docs on purpose. The version in use is whatever the lockfile says, and it is checked against rule 3 each time it changes.

## 5. Permissions (Android)

| Permission | Why | When requested |
|------------|-----|----------------|
| `READ_MEDIA_AUDIO` (Android 13+) / `READ_EXTERNAL_STORAGE` (older) | Scan music files | On first open of the Library screen. |
| `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_MEDIA_PLAYBACK`, `POST_NOTIFICATIONS` | Background playback and its notification | When the first track starts playing. |

`INTERNET` is used only for lyrics and online music. Do not request location, contacts, microphone, camera, or network-state permissions.

## 6. Security and privacy

- No analytics, crash reporting, or ad SDKs in v1.
- No user files leave the device. Lyrics lookups send the track title, artist and duration to LRCLIB; online searches send the search text to Audius. Nothing else is sent.
- API endpoints live in `app.json` under `expo.extra` (`lyricsApi`, `streamApi`) and are read through `expo-constants`; none are in source. Both services are free and need no key. Requests time out after 10 s and retry twice on server errors.
- File access uses URIs granted by the system picker or the media scan. The app does not walk the file system beyond what the media scan returns.
- Validate every URI and file type on the native side before handing it to ExoPlayer.
- Store only settings and preset names on device. No file contents.
- Release builds turn off debug logging of file paths.

## 7. Project layout (target)

```
soundtrail/
├── src/
│   ├── app/                   # expo-router screens
│   ├── components/            # dynamic-island navbar, sliders, track rows
│   ├── audio/                 # TypeScript wrapper around the native module
│   ├── state/                 # store, actions, prefs parsing
│   ├── theme/                 # tokens and theme hooks
│   ├── library/               # scan and file-picking helpers
│   └── online/                # lyrics (LRCLIB) and streaming (Audius) clients
├── modules/
│   └── soundtrail-audio/      # Expo Module: Kotlin + TypeScript bindings
├── docs/                      # this folder
├── __tests__/                 # Jest tests
├── app.json
├── package.json
└── package-lock.json
```

## 8. Testing expectations

- Unit tests (Jest) for: state reducer, preset mapping (band count changes), speed clamping (0.5–2.0), settings storage round-trip.
- Kotlin unit tests for: error code mapping, band gain clamping, speed clamping.
- Manual device checklist for: playing each supported format, a picked file, a file without audio, a corrupt file, equalizer change during playback, speed change during playback, background playback with screen off, lock-screen controls, permission denied flow.
