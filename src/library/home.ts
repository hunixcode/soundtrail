import type { LibraryItem } from '../../modules/soundtrail-audio';

export type Group = { key: string; title: string; subtitle: string; items: LibraryItem[] };

const SHELF_SIZE = 20;

const count = (items: LibraryItem[]) => (items.length === 1 ? '1 track' : `${items.length} tracks`);

function groups(items: LibraryItem[], name: (item: LibraryItem) => string | null | undefined, describe: (items: LibraryItem[]) => string) {
  const found = new Map<string, LibraryItem[]>();
  for (const item of items) {
    const label = name(item)?.trim();
    if (!label) continue;
    const key = label.toLocaleLowerCase();
    found.set(key, [...(found.get(key) ?? []), item]);
  }
  return [...found.entries()]
    .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]))
    .slice(0, SHELF_SIZE)
    .map(([key, list]): Group => ({ key, title: name(list[0])!.trim(), subtitle: describe(list), items: list }));
}

const lastSegment = (folder: string | null | undefined) => folder?.replace(/\/+$/, '').split('/').pop()?.toLocaleLowerCase();

export const realAlbum = (item: LibraryItem) =>
  item.album && item.album.trim().toLocaleLowerCase() !== lastSegment(item.folder) ? item.album : null;

export function buildHome(items: LibraryItem[], played: string[] = []) {
  const byId = new Map(items.map((item) => [item.id, item]));
  return {
    played: played.flatMap((id) => byId.get(id) ?? []).slice(0, SHELF_SIZE),
    recent: items
      .filter((item) => item.addedAt)
      .sort((a, b) => (b.addedAt ?? 0) - (a.addedAt ?? 0))
      .slice(0, SHELF_SIZE),
    genres: groups(items, (item) => item.genre, count),
    artists: groups(items, (item) => item.artist, count),
    albums: groups(items, realAlbum, (list) => list[0].artist ?? count(list)),
  };
}

export function greeting(hour: number): string {
  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 18) return 'Good afternoon';
  return 'Good evening';
}
