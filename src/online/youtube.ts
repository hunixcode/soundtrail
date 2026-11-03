import { endpoints, musicClient, postJson } from './http';

export type YtTrack = {
  kind: 'track';
  id: string;
  title: string;
  artist: string | null;
  durationMs: number;
  artworkUrl: string | null;
};

export type YtList = { kind: 'list'; id: string; title: string; subtitle: string; artworkUrl: string | null };

export type YtResult = YtTrack | YtList;

export type SearchFilter = 'songs' | 'videos' | 'playlists' | 'albums';

type Runs = { runs?: { text?: string }[] };
type Column = { text?: Runs };

export type ListItem = {
  flexColumns?: { musicResponsiveListItemFlexColumnRenderer?: Column }[];
  fixedColumns?: { musicResponsiveListItemFixedColumnRenderer?: Column }[];
  playlistItemData?: { videoId?: string };
  navigationEndpoint?: { browseEndpoint?: { browseId?: string } };
  thumbnail?: { musicThumbnailRenderer?: { thumbnail?: { thumbnails?: { url?: string }[] } } };
};

type Continuation = { continuationEndpoint?: { continuationCommand?: { token?: string } } };

const FILTER_PARAMS: Record<SearchFilter, string> = {
  songs: 'EgWKAQIIAWoKEAkQBRAKEAMQBA==',
  videos: 'EgWKAQIQAWoKEAkQChAFEAMQBA==',
  playlists: 'EgeKAQQoAEABagoQAxAEEAoQCRAF',
  albums: 'EgWKAQIYAWoKEAkQAxAEEAkQBQ==',
};

const MAX_PAGES = 20;

export function collect<T>(node: unknown, key: string, out: T[] = []): T[] {
  if (Array.isArray(node)) {
    for (const child of node) collect(child, key, out);
  } else if (node !== null && typeof node === 'object') {
    for (const [name, value] of Object.entries(node)) {
      if (name === key) out.push(value as T);
      else collect(value, key, out);
    }
  }
  return out;
}

const text = (value?: Runs) => (value?.runs ?? []).map((run) => run.text ?? '').join('').trim();

export function parseDuration(value: string): number {
  if (!/^\d+(:\d\d)+$/.test(value)) return 0;
  return value.split(':').reduce((total, part) => total * 60 + Number(part), 0) * 1000;
}

export function toResult(item: ListItem): YtResult | null {
  const [title, details = ''] = (item.flexColumns ?? []).map((c) => text(c.musicResponsiveListItemFlexColumnRenderer?.text));
  if (!title) return null;
  const meta = details.split(' • ').map((part) => part.trim()).filter(Boolean);
  const thumbnails = item.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails ?? [];
  const artworkUrl = thumbnails[thumbnails.length - 1]?.url ?? null;
  const videoId = item.playlistItemData?.videoId;
  if (videoId) {
    const fixed = text(item.fixedColumns?.[0]?.musicResponsiveListItemFixedColumnRenderer?.text);
    const artist = meta[0] && !parseDuration(meta[0]) ? meta[0] : null;
    const durationMs = parseDuration(fixed) || parseDuration(meta[meta.length - 1] ?? '');
    return { kind: 'track', id: videoId, title, artist, durationMs, artworkUrl };
  }
  const browseId = item.navigationEndpoint?.browseEndpoint?.browseId;
  return browseId ? { kind: 'list', id: browseId, title, subtitle: meta.join(' · '), artworkUrl } : null;
}

export function results(data: unknown): YtResult[] {
  return collect<ListItem>(data, 'musicResponsiveListItemRenderer')
    .map(toResult)
    .filter((result): result is YtResult => result !== null);
}

export function nextPage(data: unknown): string | null {
  return collect<Continuation>(data, 'continuationItemRenderer')[0]?.continuationEndpoint?.continuationCommand?.token ?? null;
}

export function playlistFromLink(value: string): string | null {
  const match = /youtu(?:be\.com|\.be)\/\S*[?&]list=([\w-]+)/.exec(value);
  if (!match) return null;
  return match[1].startsWith('VL') ? match[1] : `VL${match[1]}`;
}

export const watchUrl = (id: string) => `${endpoints.music}/watch?v=${encodeURIComponent(id)}`;

const api = (path: string) => `${endpoints.music}/youtubei/v1/${path}?prettyPrint=false`;

export async function searchMusic(term: string, filter: SearchFilter): Promise<YtResult[]> {
  return results(await postJson<unknown>(api('search'), { context: { client: musicClient }, query: term, params: FILTER_PARAMS[filter] }));
}

export async function loadList(browseId: string): Promise<{ title: string; tracks: YtTrack[] }> {
  let data = await postJson<unknown>(api('browse'), { context: { client: musicClient }, browseId });
  const title = text(collect<{ title?: Runs }>(data, 'musicResponsiveHeaderRenderer')[0]?.title);
  const tracks = new Map<string, YtTrack>();
  for (let page = 0; page < MAX_PAGES; page++) {
    for (const result of results(data)) if (result.kind === 'track' && !tracks.has(result.id)) tracks.set(result.id, result);
    const token = nextPage(data);
    if (!token) break;
    data = await postJson<unknown>(api('browse'), { context: { client: musicClient }, continuation: token });
  }
  return { title, tracks: [...tracks.values()] };
}
