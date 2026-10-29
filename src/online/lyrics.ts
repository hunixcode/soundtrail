import type { LibraryItem } from '../../modules/soundtrail-audio';
import { appName, appVersion, endpoints, getJson, query } from './http';

export type LyricLine = { timeMs: number; text: string };

export type Lyrics =
  | { kind: 'synced'; lines: LyricLine[] }
  | { kind: 'plain'; text: string }
  | { kind: 'instrumental' }
  | { kind: 'none' };

type LrclibRecord = {
  duration: number | null;
  instrumental: boolean;
  plainLyrics: string | null;
  syncedLyrics: string | null;
};

const STAMP = /\[(\d+):(\d{1,2})(?:[.:](\d{1,3}))?\]/g;

export function parseLrc(source: string): LyricLine[] {
  const lines: LyricLine[] = [];
  for (const raw of source.split(/\r?\n/)) {
    const stamps = [...raw.matchAll(STAMP)];
    if (stamps.length === 0) continue;
    const text = raw.replace(STAMP, '').trim();
    for (const [, min, sec, frac = '0'] of stamps) {
      const fracMs = Number(frac.padEnd(3, '0'));
      lines.push({ timeMs: Number(min) * 60000 + Number(sec) * 1000 + fracMs, text });
    }
  }
  return lines.sort((a, b) => a.timeMs - b.timeMs);
}

export function activeLine(lines: LyricLine[], positionMs: number): number {
  let lo = 0;
  let hi = lines.length - 1;
  let found = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (lines[mid].timeMs <= positionMs) {
      found = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return found;
}

export function pickRecord(records: LrclibRecord[], durationMs: number): LrclibRecord | null {
  const seconds = durationMs / 1000;
  const close = (r: LrclibRecord) => durationMs <= 0 || r.duration === null || Math.abs(r.duration - seconds) <= 3;
  const usable = records.filter((r) => r.instrumental || r.syncedLyrics || r.plainLyrics);
  return usable.find((r) => close(r) && r.syncedLyrics) ?? usable.find(close) ?? null;
}

export function toLyrics(record: LrclibRecord | null): Lyrics {
  if (!record) return { kind: 'none' };
  if (record.instrumental) return { kind: 'instrumental' };
  const lines = record.syncedLyrics ? parseLrc(record.syncedLyrics) : [];
  if (lines.length > 0) return { kind: 'synced', lines };
  if (record.plainLyrics?.trim()) return { kind: 'plain', text: record.plainLyrics.trim() };
  return { kind: 'none' };
}

export function cleanTitle(title: string): string {
  return title
    .replace(/\s*[([][^)\]]*[)\]]/g, ' ')
    .replace(/\s+(feat\.?|ft\.?)\s.*$/i, '')
    .replace(/\.[a-z0-9]{2,4}$/i, '')
    .replace(/[_\s]+/g, ' ')
    .trim();
}

const cache = new Map<string, Promise<Lyrics>>();

async function search(params: Record<string, string>, durationMs: number) {
  const records = await getJson<LrclibRecord[]>(`${endpoints.lyrics}/search?${query(params)}`, {
    'Lrclib-Client': `${appName} ${appVersion}`,
  });
  return pickRecord(records, durationMs);
}

export function fetchLyrics(item: Pick<LibraryItem, 'id' | 'title' | 'artist' | 'durationMs'>): Promise<Lyrics> {
  const cached = cache.get(item.id);
  if (cached) return cached;
  const title = cleanTitle(item.title);
  const loose = item.artist && !title.includes(' - ') ? `${item.artist} ${title}` : title;
  const request = (async () => {
    const exact = item.artist ? await search({ track_name: item.title, artist_name: item.artist }, item.durationMs).catch(() => null) : null;
    return toLyrics(exact ?? (loose ? await search({ q: loose }, item.durationMs) : null));
  })();
  cache.set(item.id, request);
  request.catch(() => cache.delete(item.id));
  return request;
}
