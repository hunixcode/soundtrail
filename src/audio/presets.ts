import type { EqBand } from '../../modules/soundtrail-audio';

export type CurvePoint = { hz: number; db: number };

export type Preset = { id: string; name: string; curve: CurvePoint[]; builtIn: boolean };

const curve = (pairs: [number, number][]): CurvePoint[] => pairs.map(([hz, db]) => ({ hz, db }));

export const BUILT_IN_PRESETS: Preset[] = [
  { id: 'flat', name: 'Flat', builtIn: true, curve: curve([[60, 0], [16000, 0]]) },
  { id: 'bass', name: 'Bass Boost', builtIn: true, curve: curve([[60, 6], [230, 4], [910, 0], [3600, 0], [14000, 0]]) },
  { id: 'treble', name: 'Treble Boost', builtIn: true, curve: curve([[60, 0], [230, 0], [910, 0], [3600, 4], [14000, 6]]) },
  { id: 'vocal', name: 'Vocal', builtIn: true, curve: curve([[60, -2], [230, -1], [910, 3], [3600, 4], [14000, 1]]) },
  { id: 'rock', name: 'Rock', builtIn: true, curve: curve([[60, 5], [230, 3], [910, -1], [3600, 3], [14000, 5]]) },
  { id: 'pop', name: 'Pop', builtIn: true, curve: curve([[60, -1], [230, 2], [910, 4], [3600, 2], [14000, -1]]) },
  { id: 'classical', name: 'Classical', builtIn: true, curve: curve([[60, 4], [230, 2], [910, -1], [3600, 2], [14000, 4]]) },
];

export function curveAt(points: CurvePoint[], hz: number): number {
  if (points.length === 0) return 0;
  const sorted = [...points].sort((a, b) => a.hz - b.hz);
  if (hz <= sorted[0].hz) return sorted[0].db;
  const last = sorted[sorted.length - 1];
  if (hz >= last.hz) return last.db;
  const upper = sorted.findIndex((p) => p.hz >= hz);
  const a = sorted[upper - 1];
  const b = sorted[upper];
  const t = (Math.log(hz) - Math.log(a.hz)) / (Math.log(b.hz) - Math.log(a.hz));
  return a.db + (b.db - a.db) * t;
}

export function clampGain(band: Pick<EqBand, 'minDb' | 'maxDb'>, db: number): number {
  if (!Number.isFinite(db)) return 0;
  return Math.min(band.maxDb, Math.max(band.minDb, Math.round(db * 10) / 10));
}

export function gainsForBands(points: CurvePoint[], bands: EqBand[]): number[] {
  return bands.map((band) => clampGain(band, curveAt(points, band.centerHz)));
}

export function curveFromBands(bands: EqBand[], gains: number[]): CurvePoint[] {
  return bands.map((band, i) => ({ hz: band.centerHz, db: gains[i] ?? 0 }));
}

export function formatHz(hz: number): string {
  return hz >= 1000 ? `${Number((hz / 1000).toFixed(hz >= 10000 ? 0 : 1))}k` : `${Math.round(hz)}`;
}
