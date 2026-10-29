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
    kind: 'audio',
    artworkUrl: track.artwork?.['480x480'] ?? track.artwork?.['150x150'] ?? null,
  };
}

export async function findTracks(search: string): Promise<OnlineTrack[]> {
  const term = search.trim();
  const path = term ? 'tracks/search' : 'tracks/trending';
  const { data } = await getJson<{ data: AudiusTrack[] }>(
    `${endpoints.stream}/${path}?${query({ query: term, app_name: appName, limit: 40 })}`,
  );
  return data.filter((t) => t.is_streamable !== false && !t.is_stream_gated).map(toOnlineTrack);
}
