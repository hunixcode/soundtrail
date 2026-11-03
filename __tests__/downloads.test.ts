import { describe, expect, it, jest } from '@jest/globals';

import { byStatus, download, downloadFolder, fileName, type Download } from '../src/state/downloads';
import type { YtTrack } from '../src/online/youtube';

const mockCalls: string[] = [];
const mockFailing = new Set<string>();

jest.mock('../modules/soundtrail-audio', () => ({
  __esModule: true,
  default: {
    addListener: () => ({ remove: () => undefined }),
    download: async (id: string, _url: string, folder: string, name: string) => {
      mockCalls.push(`${id}|${folder}|${name}`);
      if (mockFailing.has(id)) throw new Error('nope');
      return `content://${id}`;
    },
  },
}));

jest.mock('../src/state/app', () => ({ scanLibrary: async () => undefined }));

jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: { slug: 'soundtrail', extra: {} } } }));

const track = (id: string, artist: string | null = 'Artist'): YtTrack => ({
  kind: 'track',
  id,
  title: `Song/${id}`,
  artist,
  durationMs: 1000,
  artworkUrl: null,
});

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('downloads', () => {
  it('lists active downloads first and finished ones last', () => {
    const job = (id: string, status: Download['status']): Download => ({ track: track(id), folder: 'Music', status, progress: 0 });
    expect(byStatus({ a: job('a', 'done'), b: job('b', 'failed'), c: job('c', 'queued'), d: job('d', 'active') }).map((j) => j.status)).toEqual([
      'active',
      'queued',
      'failed',
      'done',
    ]);
  });

  it('names files and folders safely', () => {
    expect(fileName(track('a'))).toBe('Artist - Songa');
    expect(fileName(track('b', null))).toBe('Songb');
    expect(downloadFolder()).toBe('Music/soundtrail');
    expect(downloadFolder('Best of: 2024/25')).toBe('Music/soundtrail/Best of 202425');
  });

  it('downloads one at a time, skips queued duplicates and retries failures', async () => {
    mockFailing.add('b');
    download([track('a'), track('b')], 'Mix');
    download([track('a')]);
    for (let i = 0; i < 5; i++) await settle();
    expect(mockCalls).toEqual(['a|Music/soundtrail/Mix|Artist - Songa', 'b|Music/soundtrail/Mix|Artist - Songb']);
    mockFailing.clear();
    download([track('a'), track('b')]);
    for (let i = 0; i < 5; i++) await settle();
    expect(mockCalls.slice(2)).toEqual(['b|Music/soundtrail/Mix|Artist - Songb']);
  });
});
