# soundtrail

Open-source Android equalizer, music player and speed changer. It also plays the audio track of video files.

Built with React Native and Expo (SDK 58). Playback, the equalizer and pitch-preserving speed run in a local Expo module (`modules/soundtrail-audio`) on top of AndroidX Media3.

## Requirements

- Node 22 and npm
- JDK 17
- Android SDK with platform 36 and NDK (installed by Android Studio or `sdkmanager`)
- An Android device with USB debugging, or an emulator

## Run on a device

```bash
npm install
npx expo prebuild --platform android
npm run android
```

`npm run android` builds a debug app, installs it and starts Metro.

On machines with 16 GB of RAM or less, the native C++ build can run out of memory. Build with fewer workers instead:

```bash
cd android
taskset -c 0-3 ./gradlew :app:assembleDebug -PreactNativeArchitectures=arm64-v8a \
  --max-workers=2 --no-parallel -Pkotlin.compiler.execution.strategy=in-process
adb install -r app/build/outputs/apk/debug/app-debug.apk
adb reverse tcp:8081 tcp:8081
cd .. && npx expo start
```

## Checks

```bash
npm run typecheck
npm run lint
npm test
npm run audit
cd android && ./gradlew :soundtrail-audio:testDebugUnitTest
```

## Documentation

Specs, design system and conventions live in [`docs/`](docs/README.md).
