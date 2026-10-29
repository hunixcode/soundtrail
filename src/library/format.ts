import type { LibraryItem } from '../../modules/soundtrail-audio';

export function formatTime(ms: number): string {
  const total = Math.max(0, Math.floor((Number.isFinite(ms) ? ms : 0) / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = String(total % 60).padStart(2, '0');
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, '0')}:${seconds}` : `${minutes}:${seconds}`;
}

export function subtitle(item: Pick<LibraryItem, 'artist' | 'album'>): string {
  return [item.artist, item.album].filter(Boolean).join(' · ') || 'Unknown artist';
}

export function filterLibrary(items: LibraryItem[], query: string): LibraryItem[] {
  const needle = query.trim().toLocaleLowerCase();
  if (!needle) return items;
  return items.filter((item) =>
    [item.title, item.artist, item.album].some((field) => field?.toLocaleLowerCase().includes(needle)),
  );
}

export function cleanFileName(name: string): string {
  return name.replace(/\s+/g, ' ').replace(/[\\/:*?"<>|\u0000-\u001f]/g, '').trim().slice(0, 120);
}
