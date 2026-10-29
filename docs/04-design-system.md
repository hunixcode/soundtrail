# 04 · Design system

Visual direction: **monochrome, minimal, sleek.** The interface is black, white, and grays. Color is not used for decoration. Album artwork is the only color on screen, and it is shown as is.

## 1. Principles

1. **Monochrome only.** No accent hue. Emphasis comes from weight, size, contrast, and space.
2. **Quiet surfaces, sharp content.** Backgrounds stay flat. Text and controls carry the design.
3. **Motion explains, never decorates.** Every animation shows a change (where something came from, where it went, what state it is in). Nothing loops or bounces for show.
4. **One thumb.** Controls sit in the lower half of the screen, within reach of the navbar.

## 2. Color tokens

Dark is the default theme. Light is supported with the same token names.

| Token | Dark | Light | Use |
|-------|------|-------|-----|
| `bg.base` | `#000000` | `#FFFFFF` | Screen background |
| `bg.raised` | `#111111` | `#F5F5F5` | Navbar pill, mini player, cards |
| `bg.sunken` | `#1A1A1A` | `#EBEBEB` | Slider track, input fields |
| `border.subtle` | `#262626` | `#E0E0E0` | Dividers, list separators |
| `fg.primary` | `#FFFFFF` | `#000000` | Titles, active icons, primary buttons |
| `fg.secondary` | `#A3A3A3` | `#595959` | Artist names, labels, inactive tabs |
| `fg.tertiary` | `#6B6B6B` | `#8C8C8C` | Timestamps, hints |
| `fg.inverse` | `#000000` | `#FFFFFF` | Text on a `fg.primary` button |

Rules:

- No other colors in the UI. The only exceptions are system UI (status bar) and artwork.
- Error state uses `fg.primary` with an icon and text, not red. Keeps the palette strictly monochrome.
- Contrast: all text pairs meet WCAG AA (4.5:1 for body text, 3:1 for large text and icons). Check every pair when a token changes.

## 3. Typography

Three font roles, each a single family from the Archivo superfamily plus one monospace for numbers.

| Role | Font | Used for |
|------|------|----------|
| Display | **Archivo** (variable, expanded width, weight 700–800) | Screen titles, the Speed readout, track title on Player |
| Text | **Archivo** (variable, normal width, weight 400–600) | Body, list rows, labels, buttons |
| Numeric | **Archivo** tabular figures, or a monospace fallback (for example IBM Plex Mono) if Archivo tabular figures are not sufficient for the Speed readout and timers | Timers, progress times, speed values |

Notes:

- Archivo is the first choice because its variable width axis lets one family cover both the wide display style and the normal text style.
- Load only the weights used. Target at most three weights in the app: 400, 600, 800.
- Fonts are bundled with the app (not fetched at runtime), to keep v1 offline (product spec, quality bar).
- Package and loading method (for example `@expo-google-fonts/archivo` with `expo-font`) are checked against the dependency rules in `02-technical-spec.md` at M0.

### Type scale

| Token | Size / line height | Weight | Use |
|-------|--------------------|--------|-----|
| `type.display` | 40 / 44 | 800 expanded | Speed readout |
| `type.title` | 28 / 34 | 700 | Screen titles, Player track title |
| `type.headline` | 20 / 26 | 600 | Section headers, Settings groups |
| `type.body` | 16 / 22 | 400 | List rows, body text |
| `type.label` | 13 / 16 | 600, uppercase, letter-spacing +0.6 | Small labels, tab labels |
| `type.caption` | 12 / 16 | 400 | Timestamps, hints |

Text respects the system font scale, up to 200%. Layouts must not clip at that size.

## 4. Spacing, shape, and surfaces

- **Spacing scale:** 4, 8, 12, 16, 24, 32, 48. Use only these values.
- **Screen gutter:** 16.
- **Corner radius:** 12 for cards and inputs, 999 (pill) for the navbar, buttons, and chips. Artwork uses 8.
- **Elevation:** none. Separation comes from `bg.raised` against `bg.base` and from `border.subtle`. No shadows, except a subtle one on the navbar pill in light theme only.
- **Icons:** a single outline icon set, 1.5 px stroke at 24 px. Filled variant only for the active state of a control (for example the play icon when playing).

## 5. Components

| Component | Spec |
|-----------|------|
| Navbar (dynamic island) | Pill, `bg.raised`, 64 px tall, centered, 16 px from the bottom safe area. Four icon+label items. Active item shows its label and a `bg.sunken` capsule behind it. |
| Mini player | 64 px tall, `bg.raised`, sits 8 px above the navbar. Artwork 40 px, title `type.body`, artist `fg.secondary`. |
| Play button (Player) | 72 px circle, `fg.primary` fill, `fg.inverse` icon. |
| Secondary controls | 44 px touch target, `fg.primary` icons, no background. |
| Slider (Speed, Equalizer) | 2 px track in `bg.sunken`, filled part in `fg.primary`, 24 px thumb (`fg.primary`, no border). |
| Preset chip | Pill, 1 px `border.subtle` outline, `fg.secondary` text. Selected: `fg.primary` fill, `fg.inverse` text. |
| List row | 64 px, artwork 48 px, title `type.body`, subtitle `fg.secondary`. Separator `border.subtle`. |
| Toggle (equalizer on/off) | Pill 51×31, `bg.sunken` off, `fg.primary` on. Thumb slides with the motion rules in section 6. |

## 6. Motion

Goal: **sleek and smooth.** Motion should feel fast at the start and settle softly. Animations run on the UI thread (`react-native-reanimated` worklets) so they do not drop frames while audio or JS work runs.

### 6.1 Timing and easing

| Token | Duration | Easing / spring | Use |
|-------|----------|-----------------|-----|
| `motion.instant` | 0 ms | none | State changes that must feel immediate (play/pause icon swap uses `motion.fast` cross-fade) |
| `motion.fast` | 150 ms | ease-out | Icon swaps, color state changes, press feedback |
| `motion.base` | 250 ms | ease-in-out (cubic, `0.4, 0, 0.2, 1`) | Fades, slide-ins, chip selection |
| `motion.slow` | 400 ms | ease-out-expo-like (`0.16, 1, 0.3, 1`) | Full player open/close, screen transitions |
| `motion.spring` | spring, damping ~ 0.85 ratio, no overshoot | spring | Navbar pill and island morph, toggle thumb, mini-player-to-player expansion |

Rules:

- **No bounce.** No overshoot on any element. Springs settle without passing their target.
- **Press feedback:** pressed controls scale to 0.96 over `motion.fast`, and return over `motion.fast`. Nothing else scales on press.
- **Never animate layout on every frame of a playing track.** Progress updates move the progress bar width or transform only, at most 4 times per second from the native event, and the bar animates between updates over `motion.base`.
- **Animate `transform` and `opacity` where possible.** They stay on the UI thread. Avoid animating width/height of large views.

### 6.2 Signature transitions

1. **Mini player → Player:** the artwork and title scale and move from the mini player into their positions on the Player (shared element style), over `motion.slow`. Remaining controls fade in over `motion.base` with a 100 ms delay. Closing reverses the same path.
2. **Navbar pill:** the active indicator moves to the new tab with `motion.spring`. The label fades in and the previous label fades out over `motion.fast`.
3. **Dynamic-island strip:** the navbar expands in width and height over `motion.spring` to show the now-playing strip; contents cross-fade over `motion.fast`. Collapsing is the same motion in reverse.
4. **Screen change:** tab content cross-fades over `motion.base`. No horizontal slide between tabs.
5. **Speed readout:** the number changes without a flip or roll effect; it fades between values over `motion.fast` only when the value is set by a preset (not while dragging, so the drag feels direct).
6. **Equalizer bands:** the band fill height follows the finger directly while dragging, then springs to the released value with `motion.spring`.
7. **Toggle:** thumb slides with `motion.spring`; track color cross-fades over `motion.fast`.

### 6.3 Reduced motion

- Read the system reduce-motion setting (`AccessibilityInfo.isReduceMotionEnabled` or the Reanimated equivalent).
- When enabled: all durations drop to `motion.fast` or instant, springs become a single `motion.fast` fade, and no transform-based travel is used (no mini-player-to-player movement; a fade instead).

## 7. Theme behavior

- Default follows the system theme (light or dark).
- Settings offers: System, Dark, Light. Default: System. Stored with other settings.
- Theme change cross-fades the screen colors over `motion.base`.

## 8. Iconography and artwork

- Artwork: embedded cover art from the file when present, otherwise a monochrome placeholder: `bg.sunken` square with a single outline music-note icon in `fg.tertiary`.
- No gradients, no tinted overlays on artwork. Artwork is shown unmodified.

## 9. Design acceptance (add to roadmap checklist)

| # | Check | Pass condition |
|---|-------|----------------|
| D-A1 | Monochrome | No color outside tokens in section 2 and artwork; grep for hex values in the UI code finds only the token file. |
| D-A2 | Contrast | Every text/background pair passes the WCAG AA ratios in section 2. |
| D-A3 | Fonts | Only Archivo and the chosen numeric font are used; no more than three weights of Archivo are bundled. |
| D-A4 | Smooth motion | Transitions in section 6.2 run at 60 fps on the two test devices (measured with the Android GPU/profile tools; a dropped-frame count above a few frames per transition fails). |
| D-A5 | Reduced motion | With the system setting on, no transform-based travel occurs and transitions use the fallback. |
| D-A6 | No bounce | No element overshoots its target in any transition. |
