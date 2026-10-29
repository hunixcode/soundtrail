# 02 · Technical spec

## 1. Stack

| Layer | Choice | Why |
|-------|--------|-----|
| App framework | React Native with Expo (managed workflow, latest stable SDK at project start) | Fast Android delivery, a standard Expo toolchain, and OTA-free simplicity for v1. |
| Language | TypeScript (strict mode) | Catches mistakes before they reach the phone. |
| Navigation | `expo-router` | File-based routing that ships with Expo. |
| UI | React Native core components plus a small in-house style layer; no UI kit in v1 | Keeps dependencies low. |
| Local storage (settings, presets) | `expo-sqlite` or `@react-native-async-storage/async-storage` (pick one at setup; prefer the one Expo ships for the chosen SDK) | Persists EQ and speed settings and presets. |
| Media file access | `expo-document-picker` (pick video/audio files) and `expo-media-library` (scan device audio/video) | Official Expo modules for file and media access. |
| Playback and audio effects | **Custom Expo Module** (`modules/soundtrail-audio`) wrapping AndroidX Media3 (ExoPlayer) and the Android audio effects API | Only native code can give us a real equalizer and pitch-preserving speed. See section 3. |
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

- Routing with `expo-router`. The four main sections are the tabs of one layout: `app/(tabs)/library`, `app/(tabs)/player`, `app/(tabs)/speed`, `app/(tabs)/equalizer`. Settings is a stack screen (`app/settings`) pushed from the Library header.
- The Player is a tab. The mini player and the Player tab share one "now playing" state, so they never disagree.
- The bottom navbar is a **custom tab bar** passed to the tabs layout, not the default Expo tab bar. It is built with `react-native-reanimated` for the pill and island animations, installed through `npx expo install` (rule 1 of section 4) and checked with the dependency rules.
- The navbar's compact now-playing strip reads from the same now-playing state. It is hidden on the Player tab.
- The mini player is a component rendered above the navbar. It is hidden when the navbar strip is visible (see product spec section 5.2).
- Gesture handling for the mini player swipe uses `react-native-gesture-handler` (installed through `npx expo install`).

## 3. The audio engine (native module)

### 3.1 Responsibilities

| Feature | Implementation |
|---------|----------------|
| Play a local audio or video file | Media3 `ExoPlayer` with a `MediaItem` built from the file URI. |
| Audio from video | ExoPlayer selects the audio track automatically; no re-encoding. |
| Speed without pitch change | `player.setPlaybackParameters(PlaybackParameters(speed, 1.0f))`. ExoPlayer time-stretches the audio. |
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
  setSpeed(speed: number): void;        // 0.5 – 2.0, pitch kept at 1.0
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
| `READ_MEDIA_VIDEO` (Android 13+) | Scan and pick video files | When the user taps "Add video" or the library scan needs video. |
| `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_MEDIA_PLAYBACK`, `POST_NOTIFICATIONS` | Background playback and its notification | When the first track starts playing. |

Do not request location, contacts, microphone, camera, or network-state permissions for v1. Network is not used.

## 6. Security and privacy

- No analytics, crash reporting, or ad SDKs in v1.
- No user files leave the device.
- File access uses URIs granted by the system picker or the media scan. The app does not walk the file system beyond what the media scan returns.
- Validate every URI and file type on the native side before handing it to ExoPlayer.
- Store only settings and preset names on device. No file contents.
- Release builds turn off debug logging of file paths.

## 7. Project layout (target)

```
soundtrail/
├── app/                       # expo-router screens
├── src/
│   ├── components/            # dynamic-island navbar, mini player, track rows
│   ├── audio/                 # TypeScript wrapper around the native module
│   ├── state/                 # reducer, context, selectors
│   ├── storage/               # settings and presets
│   └── library/               # scan and file-picking helpers
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
- Manual device checklist for: playing each supported format, a video with audio, a video without audio, a corrupt file, equalizer change during playback, speed change during playback, background playback with screen off, lock-screen controls, permission denied flow.
