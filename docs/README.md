# soundtrail: project documentation

soundtrail is an Android app built with React Native and Expo. It combines three things in one place:

1. An **equalizer** that shapes the sound of whatever is playing.
2. A **music player** for local audio files.
3. A **speed changer** that plays audio faster or slower.

It also reads **video files** and plays their audio track through the same equalizer and speed controls.

## Documents

| File | What it answers |
|------|-----------------|
| [01-product-spec.md](01-product-spec.md) | What the app does, for whom, and what it does not do. |
| [02-technical-spec.md](02-technical-spec.md) | Stack, architecture, the native audio engine, and the dependency rules. |
| [03-roadmap.md](03-roadmap.md) | Milestones, acceptance criteria, and open decisions. |
| [04-design-system.md](04-design-system.md) | Monochrome colors, Archivo typography, spacing, components, and motion rules. |
| [05-conventions.md](05-conventions.md) | Build rules: atomic one-line conventional commits, no hardcoded secrets, no code comments. |

Read them in order. The product spec is the source of truth for scope. When code and these documents disagree, update the documents first, then the code.

## Ground rules

- **Android first.** iOS is out of scope for v1. Do not add iOS-only code paths or config.
- **Expo managed workflow with custom native code only where needed.** The audio engine is a local Expo Module. Everything else stays in JavaScript/TypeScript.
- **Verified, low-vulnerability dependencies only.** See the dependency rules in `02-technical-spec.md`.
- **Lazy by design.** Build the smallest complete version of each feature. No extra formats, settings, or abstractions unless a document asks for them.
