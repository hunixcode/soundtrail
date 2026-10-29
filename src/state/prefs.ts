import type { RepeatMode } from '../../modules/soundtrail-audio';
import { clampSpeed } from '../audio/speed';
import type { CurvePoint, Preset } from '../audio/presets';

export type ThemePreference = 'system' | 'dark' | 'light';
export type LibraryView = 'list' | 'grid';

export type Prefs = {
  speed: number;
  eqEnabled: boolean;
  eqGains: number[];
  activePresetId: string | null;
  userPresets: Preset[];
  theme: ThemePreference;
  shuffle: boolean;
  repeat: RepeatMode;
  libraryView: LibraryView;
};

export const DEFAULT_PREFS: Prefs = {
  speed: 1,
  eqEnabled: false,
  eqGains: [],
  activePresetId: 'flat',
  userPresets: [],
  theme: 'system',
  shuffle: false,
  repeat: 'off',
  libraryView: 'list',
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

function parseCurve(value: unknown): CurvePoint[] | null {
  if (!Array.isArray(value)) return null;
  const points = value.filter((p): p is CurvePoint => isRecord(p) && finite(p.hz) && p.hz > 0 && finite(p.db));
  return points.length > 0 ? points.map(({ hz, db }) => ({ hz, db })) : null;
}

function parsePresets(value: unknown): Preset[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((p) => {
    if (!isRecord(p) || typeof p.id !== 'string' || typeof p.name !== 'string') return [];
    const name = p.name.trim().slice(0, 40);
    const points = parseCurve(p.curve);
    return name && points ? [{ id: p.id, name, curve: points, builtIn: false }] : [];
  });
}

export function parsePrefs(json: string | null): Prefs {
  if (!json) return DEFAULT_PREFS;
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return DEFAULT_PREFS;
  }
  if (!isRecord(raw)) return DEFAULT_PREFS;
  return {
    speed: finite(raw.speed) ? clampSpeed(raw.speed) : DEFAULT_PREFS.speed,
    eqEnabled: typeof raw.eqEnabled === 'boolean' ? raw.eqEnabled : DEFAULT_PREFS.eqEnabled,
    eqGains: Array.isArray(raw.eqGains) ? raw.eqGains.filter(finite) : DEFAULT_PREFS.eqGains,
    activePresetId:
      typeof raw.activePresetId === 'string' || raw.activePresetId === null
        ? (raw.activePresetId as string | null)
        : DEFAULT_PREFS.activePresetId,
    userPresets: parsePresets(raw.userPresets),
    theme: raw.theme === 'dark' || raw.theme === 'light' || raw.theme === 'system' ? raw.theme : DEFAULT_PREFS.theme,
    shuffle: typeof raw.shuffle === 'boolean' ? raw.shuffle : DEFAULT_PREFS.shuffle,
    repeat: raw.repeat === 'all' || raw.repeat === 'one' || raw.repeat === 'off' ? raw.repeat : DEFAULT_PREFS.repeat,
    libraryView: raw.libraryView === 'grid' || raw.libraryView === 'list' ? raw.libraryView : DEFAULT_PREFS.libraryView,
  };
}
