# 03 · Roadmap, acceptance, and open decisions

## 1. Milestones

Each milestone ends with something that runs on a real Android device.

### M0 · Project setup
- Expo project created with the latest stable SDK and TypeScript strict mode.
- `expo-router` working with the four screens as placeholders.
- Lint, Jest, and `npm audit --omit=dev` run in CI.
- Dependabot enabled.
- **Done when:** the app launches on a device and CI is green.

### M1 · Music player (no effects yet)
- Dynamic-island navbar with Library, Player, Speed, and Equalizer tabs (Equalizer can be a placeholder screen until M4).
- Library scan with permission flow.
- Player tab (Spotify-like full view) and the island's now-playing row, with swipe next/previous.
- Compact now-playing strip in the navbar when a track plays on another tab.
- Play, pause, seek, next, previous, shuffle, repeat, and a queue list.
- Background playback with notification and lock-screen controls.
- **Done when:** a local MP3 and a FLAC play in the background with the screen off, and the island's now-playing row shows correct state on every tab.

### M2 · Speed changer
- `setSpeed` in the native module, with the pitch following the speed.
- Speed page (readout, slider, stepper, reset, quick presets), persisted, working with no track loaded.
- Small speed label on the Player that opens the Speed page.
- **Done when:** 0.5x and 2.0x are audibly correct and the pitch moves with the speed on a test tone (440 Hz at 1.5x sounds as 660 Hz), and the Speed page value survives an app restart.

### M3 · Open a file
- File picker for audio files.
- Picked files play through the same pipeline.
- Clear messages for "no audio track" and "unsupported format".
- **Done when:** a picked MP3 plays, and a file with no audio shows the no-audio message.

### M4 · Equalizer
- Band list from the device, sliders, on/off switch.
- Presets (built-in and user-saved), persisted.
- Equalizer changes apply during playback.
- Fallback message on devices without a working effect.
- **Done when:** changing a band during playback is audible, and presets survive an app restart.

### M5 · Polish and release candidate
- Permission-denied flows, error messages for every error code.
- Settings screen (reset EQ, reset speed).
- Device test matrix (see acceptance) completed.
- EAS Build produces an installable APK.
- **Done when:** the acceptance checklist passes with no open high-severity bugs.

## 2. Acceptance checklist (v1)

| # | Check | Pass condition |
|---|-------|----------------|
| A1 | Library scan finds audio files | Count matches the device's media store. |
| A2 | Playback in background with screen off | Audio continues for at least 10 minutes. |
| A3 | Lock-screen and notification controls | Play, pause, next, previous work. |
| A4 | Speed 0.5x–2.0x | Audible change; a 440 Hz test tone plays at 440 Hz times the speed. |
| A5 | Speed is saved | Value is the same after app restart. |
| A6 | Picked file plays | An audio file opened from the picker plays. |
| A7 | File with no audio | Shows "no audio track" and does not crash. |
| A8 | Corrupt file | Shows an error and the app keeps running. |
| A9 | Equalizer on/off and bands | Changes are audible during playback. |
| A10 | Equalizer fallback | On a device without an effect, the screen says so and playback still works. |
| A11 | Presets | Built-in presets apply; user preset saves and survives restart. |
| A12 | Permission denied | App explains the need and does not crash. |
| A13 | Offline | Every feature except lyrics and online music works with airplane mode on; those two say they are unavailable. |
| A14 | Dependency audit | `npm audit --omit=dev` shows no high or critical findings. |
| A15 | Test devices | Checklist passes on at least two Android devices from different brands. |
| A16 | Navbar | Four tabs switch correctly; active pill animates; list content is not hidden under the navbar. |
| A17 | Navbar now-playing strip | Shows while a track plays on another tab; tapping it opens Player; hidden on Player. |
| A18 | Mini player | Island row shows on Library, Speed, Equalizer while a track is loaded; tap opens Player; swipe changes track; collapses on Player. |
| A19 | Speed page | Slider, stepper, reset, and quick presets all set the same value; value persists and applies with no track loaded. |
| A20 | Design system | Design acceptance D-A1 to D-A6 in `04-design-system.md` all pass. |
| A21 | Lyrics | Synced lyrics follow playback and a tapped line seeks; tracks with no match say so. |
| A22 | Online music | Trending shows with no search, a search returns tracks, and a streamed track plays with EQ and speed. |

## 3. Definition of done (every PR)

- Matches the product spec. Anything outside it is a separate issue.
- Tests added for new logic that has a branch, a loop, or a parser.
- `npm audit --omit=dev` clean, or each finding justified in the PR.
- New dependencies listed in the PR description, with what was checked.
- Documents updated if behavior changed.

## 4. Open decisions

These need an answer before the milestone that depends on them. Each one has a recommended default so work can start.

| # | Decision | Recommended default | Needed by |
|---|----------|---------------------|-----------|
| D1 | Package manager | npm (`package-lock.json`) | M0 |
| D2 | Settings storage | **Decided:** SharedPreferences through the audio module | M0 |
| D3 | Equalizer engine | Android `Equalizer` effect on the Media3 audio session; check band support on test devices first | M4 |
| D4 | Whether video files are supported | **Decided:** no. Video support was dropped; the app scans and plays audio only | M3 |
| D5 | Minimum Android version | The lowest the chosen Expo SDK supports, and not below what Media3 requires | M0 |
| D6 | Package name and app name | Decide before M0 is done, since it changes native config | M0 |
| D7 | Whether to add pitch shifting later | Out of scope for v1; revisit after M5 | After M5 |
| D8 | Dynamic-island navbar implementation | Custom tab bar built with `react-native-reanimated` (no third-party navbar package) | M1 |
| D9 | Player tab vs. full-screen modal | Player is a tab, so the navbar stays visible; a modal would hide it | M1 |

## 5. After v1 (ideas, not commitments)

- Pitch shifting independent of speed.
- Export a changed audio file.
- Playlists saved to disk.
- Google Play release.
