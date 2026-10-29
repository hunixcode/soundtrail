import type { LibraryItem } from '../../modules/soundtrail-audio';
import { appName, endpoints, getJson, query } from './http';

export type OnlineTrack = LibraryItem & { artworkUrl: string | null };

type AudiusTrack = {
  id: string;
  title: string;
  duration: number;
  is_streamable?: boolean;
  is_stream_gated?: boolean;
  artwork?: Record<string, string> | null;
  user?: { name?: string | null } | null;
};

export const ONLINE_PREFIX = 'audius:';

export function toOnlineTrack(track: AudiusTrack): OnlineTrack {
  return {
    id: `${ONLINE_PREFIX}${track.id}`,
    uri: `${endpoints.stream}/tracks/${encodeURIComponent(track.id)}/stream?${query({ app_name: appName })}`,
    title: track.title,
    artist: track.user?.name ?? null,
    album: null,
    durationMs: Math.round(track.duration * 1000),
    artworkUrl: track.artwork?.['480x480'] ?? track.artwork?.['150x150'] ?? null,
  };
}

export const PAGE_SIZE = 40;

export async function findTracks(search: string, offset = 0): Promise<{ tracks: OnlineTrack[]; count: number }> {
  const term = search.trim();
  const path = term ? 'tracks/search' : 'tracks/trending';
  const { data } = await getJson<{ data: AudiusTrack[] }>(
    `${endpoints.stream}/${path}?${query({ query: term, app_name: appName, limit: PAGE_SIZE, offset })}`,
  );
  const tracks = data.filter((t) => t.is_streamable !== false && !t.is_stream_gated).map(toOnlineTrack);
  return { tracks, count: data.length };
}

export function appendTracks(current: OnlineTrack[], next: OnlineTrack[]): OnlineTrack[] {
  const seen = new Set(current.map((t) => t.id));
  return [...current, ...next.filter((t) => !seen.has(t.id))];
}
