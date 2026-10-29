import { PermissionsAndroid, Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';

import Audio, {
  type EqualizerState,
  type LibraryItem,
  type PlaybackError,
  type PlaybackErrorCode,
  type PlaybackStatus,
  type RepeatMode,
} from '../../modules/soundtrail-audio';
import { BUILT_IN_PRESETS, clampGain, curveFromBands, gainsForBands, type Preset } from '../audio/presets';
import { clampSpeed } from '../audio/speed';
import { createStore, useStore } from './createStore';
import { DEFAULT_PREFS, parsePrefs, type Prefs, type ThemePreference } from './prefs';

export type LibraryStatus = 'idle' | 'loading' | 'ready' | 'denied' | 'error';

export type AppState = {
  ready: boolean;
  library: LibraryItem[];
  picked: LibraryItem[];
  libraryStatus: LibraryStatus;
  queue: LibraryItem[];
  status: PlaybackStatus;
  error: PlaybackError | null;
  equalizer: EqualizerState;
  artwork: Record<string, string | null>;
  prefs: Prefs;
};

const IDLE_STATUS: PlaybackStatus = {
  isPlaying: false,
  playWhenReady: false,
  isBuffering: false,
  isEnded: false,
  positionMs: 0,
  durationMs: 0,
  index: -1,
  mediaId: null,
  speed: 1,
  shuffle: false,
  repeat: 'off',
};

export const ERROR_MESSAGES: Record<PlaybackErrorCode | 'EQ_UNAVAILABLE' | 'PICK_FAILED', string> = {
  UNSUPPORTED_FORMAT: 'This file format is not supported.',
  CORRUPT_FILE: 'This file looks damaged and cannot be played.',
  NO_AUDIO_TRACK: 'This file has no audio track.',
  IO_ERROR: 'This could not be read. The file may have moved, or the connection dropped.',
  PLAYBACK_ERROR: 'Playback stopped because of an error.',
  EQ_UNAVAILABLE: 'Equalizer not available on this device.',
  PICK_FAILED: 'That file could not be opened.',
};

export const store = createStore<AppState>({
  ready: false,
  library: [],
  picked: [],
  libraryStatus: 'idle',
  queue: [],
  status: IDLE_STATUS,
  error: null,
  equalizer: { available: false, enabled: false, bands: [] },
  artwork: {},
  prefs: DEFAULT_PREFS,
});

export const useApp = <S>(selector: (state: AppState) => S) => useStore(store, selector);

let saveTimer: ReturnType<typeof setTimeout> | null = null;

function updatePrefs(patch: Partial<Prefs>) {
  store.set((s) => ({ prefs: { ...s.prefs, ...patch } }));
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    Audio.setPrefs(JSON.stringify(store.get().prefs)).catch(() => undefined);
  }, 300);
}

function reportError(code: keyof typeof ERROR_MESSAGES, message = '') {
  store.set({ error: { code: code as PlaybackErrorCode, message } });
}

export function dismissError() {
  store.set({ error: null });
}

let started = false;

export async function start() {
  if (started) return;
  started = true;
  Audio.addListener('onStatus', (status) => store.set({ status }));
  Audio.addListener('onError', (error) => store.set({ error }));
  const prefs = parsePrefs(await Audio.getPrefs().catch(() => null));
  store.set({ prefs });
  await Promise.all([
    Audio.setSpeed(prefs.speed),
    Audio.setShuffle(prefs.shuffle),
    Audio.setRepeat(prefs.repeat),
  ]).catch(() => undefined);
  await restoreEqualizer(prefs);
  const status = await Audio.getStatus().catch(() => IDLE_STATUS);
  store.set({ status, ready: true });
}

async function restoreEqualizer(prefs: Prefs) {
  const eq = await Audio.getEqualizer().catch(() => null);
  if (!eq || !eq.available) {
    store.set({ equalizer: { available: false, enabled: false, bands: [] } });
    return;
  }
  const gains =
    prefs.eqGains.length === eq.bands.length
      ? eq.bands.map((band, i) => clampGain(band, prefs.eqGains[i]))
      : eq.bands.map(() => 0);
  await Audio.setEqGains(gains);
  await Audio.setEqEnabled(prefs.eqEnabled);
  store.set({
    equalizer: {
      available: true,
      enabled: prefs.eqEnabled,
      bands: eq.bands.map((band, i) => ({ ...band, gainDb: gains[i] })),
    },
  });
}

async function hasPermission(permission: string): Promise<boolean> {
  return PermissionsAndroid.check(permission as never);
}

export async function scanLibrary(ask = true) {
  if (Platform.OS !== 'android') return;
  store.set({ libraryStatus: 'loading' });
  const modern = Number(Platform.Version) >= 33;
  const P = PermissionsAndroid.PERMISSIONS;
  const required = modern ? P.READ_MEDIA_AUDIO : P.READ_EXTERNAL_STORAGE;
  try {
    if (!(await hasPermission(required))) {
      if (!ask) {
        store.set({ libraryStatus: 'denied' });
        return;
      }
      const result = await PermissionsAndroid.request(required);
      if (result !== PermissionsAndroid.RESULTS.GRANTED) {
        store.set({ libraryStatus: 'denied' });
        return;
      }
    }
    const library = await Audio.scanLibrary();
    store.set({ library, libraryStatus: 'ready' });
  } catch {
    store.set({ libraryStatus: 'error' });
  }
}

async function ensureNotificationPermission() {
  if (Platform.OS !== 'android' || Number(Platform.Version) < 33) return;
  const permission = PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS;
  if (await hasPermission(permission)) return;
  await PermissionsAndroid.request(permission).catch(() => undefined);
}

export async function playList(items: LibraryItem[], index: number) {
  if (items.length === 0) return;
  dismissError();
  store.set({ queue: items });
  await ensureNotificationPermission();
  const artwork = store.get().artwork;
  await Audio.setQueue(
    items.map((item) => ({
      id: item.id,
      uri: item.uri,
      title: item.title,
      artist: item.artist,
      artworkUri: artwork[item.uri] ?? null,
    })),
    index,
    true,
  );
}

export function togglePlay() {
  const { status } = store.get();
  if (status.index < 0) return;
  return status.playWhenReady ? Audio.pause() : Audio.play();
}

export const next = () => Audio.next();
export const previous = () => Audio.previous();
export const seekTo = (ms: number) => Audio.seekTo(ms);
export const skipTo = (index: number) => Audio.skipTo(index);

export function setSpeed(value: number) {
  const speed = clampSpeed(value);
  updatePrefs({ speed });
  return Audio.setSpeed(speed);
}

export function toggleShuffle() {
  const shuffle = !store.get().prefs.shuffle;
  updatePrefs({ shuffle });
  return Audio.setShuffle(shuffle);
}

const REPEAT_CYCLE: Record<RepeatMode, RepeatMode> = { off: 'all', all: 'one', one: 'off' };

export function cycleRepeat() {
  const repeat = REPEAT_CYCLE[store.get().prefs.repeat];
  updatePrefs({ repeat });
  return Audio.setRepeat(repeat);
}

export function setEqEnabled(enabled: boolean) {
  store.set((s) => ({ equalizer: { ...s.equalizer, enabled } }));
  updatePrefs({ eqEnabled: enabled });
  return Audio.setEqEnabled(enabled);
}

function applyGains(gains: number[], activePresetId: string | null) {
  store.set((s) => ({
    equalizer: { ...s.equalizer, bands: s.equalizer.bands.map((band, i) => ({ ...band, gainDb: gains[i] ?? 0 })) },
  }));
  updatePrefs({ eqGains: gains, activePresetId });
  return Audio.setEqGains(gains);
}

export function previewBandGain(index: number, db: number) {
  const band = store.get().equalizer.bands[index];
  if (!band) return;
  return Audio.setEqBandGain(index, clampGain(band, db));
}

export function setBandGain(index: number, db: number) {
  const { bands } = store.get().equalizer;
  const band = bands[index];
  if (!band) return;
  const gains = bands.map((b, i) => (i === index ? clampGain(band, db) : b.gainDb));
  return applyGains(gains, null);
}

export function allPresets(userPresets: Preset[]): Preset[] {
  return [...BUILT_IN_PRESETS, ...userPresets];
}

export function applyPreset(preset: Preset) {
  return applyGains(gainsForBands(preset.curve, store.get().equalizer.bands), preset.id);
}

export function savePreset(name: string): Preset | null {
  const trimmed = name.trim().slice(0, 40);
  const { equalizer, prefs } = store.get();
  if (!trimmed || equalizer.bands.length === 0) return null;
  const preset: Preset = {
    id: `user:${Date.now().toString(36)}`,
    name: trimmed,
    builtIn: false,
    curve: curveFromBands(
      equalizer.bands,
      equalizer.bands.map((b) => b.gainDb),
    ),
  };
  updatePrefs({ userPresets: [...prefs.userPresets, preset], activePresetId: preset.id });
  return preset;
}

export function deletePreset(id: string) {
  const { prefs } = store.get();
  updatePrefs({
    userPresets: prefs.userPresets.filter((p) => p.id !== id),
    activePresetId: prefs.activePresetId === id ? null : prefs.activePresetId,
  });
}

export function resetEqualizer() {
  const flat = BUILT_IN_PRESETS[0];
  setEqEnabled(false);
  return applyPreset(flat);
}

export const resetSpeed = () => setSpeed(1);

export function setTheme(theme: ThemePreference) {
  updatePrefs({ theme });
}

export async function clearLibraryCache() {
  await Audio.clearArtworkCache();
  store.set({ artwork: {} });
  await scanLibrary(false);
}

export function rememberArtwork(entries: Record<string, string | null>) {
  store.set((s) => ({ artwork: { ...entries, ...s.artwork } }));
}

const pendingArtwork = new Set<string>();

export async function loadArtwork(uri: string) {
  if (uri in store.get().artwork || pendingArtwork.has(uri)) return;
  pendingArtwork.add(uri);
  const result = await Audio.getArtwork(uri).catch(() => null);
  pendingArtwork.delete(uri);
  store.set((s) => ({ artwork: { ...s.artwork, [uri]: result } }));
}

export async function pickFile() {
  const result = await DocumentPicker.getDocumentAsync({
    type: 'audio/*',
    copyToCacheDirectory: false,
  });
  if (result.canceled || !result.assets[0]) return;
  const asset = result.assets[0];
  try {
    const info = await Audio.describe(asset.uri);
    if (!info.hasAudio) {
      reportError('NO_AUDIO_TRACK');
      return;
    }
    const item: LibraryItem = {
      id: `picked:${asset.uri}`,
      uri: asset.uri,
      title: info.title || asset.name,
      artist: info.artist,
      album: null,
      durationMs: info.durationMs,
    };
    store.set((s) => ({ picked: [item, ...s.picked.filter((p) => p.uri !== item.uri)] }));
    await playList([item], 0);
  } catch {
    reportError('PICK_FAILED');
  }
}

export function currentItem(state: AppState): LibraryItem | null {
  const { queue, status, library, picked } = state;
  if (status.mediaId) {
    const match =
      queue.find((item) => item.id === status.mediaId) ??
      library.find((item) => item.id === status.mediaId) ??
      picked.find((item) => item.id === status.mediaId);
    if (match) return match;
  }
  return queue[status.index] ?? null;
}
