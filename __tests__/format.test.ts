import { describe, expect, it } from '@jest/globals';
import type { LibraryItem } from '../modules/soundtrail-audio';
import { filterLibrary, formatTime, subtitle } from '../src/library/format';

const item = (title: string, artist: string | null, album: string | null): LibraryItem => ({
  id: title,
  uri: `content://${title}`,
  title,
  artist,
  album,
  durationMs: 1000,
});

describe('format', () => {
  it('formats times', () => {
    expect(formatTime(0)).toBe('0:00');
    expect(formatTime(61_000)).toBe('1:01');
    expect(formatTime(3_726_000)).toBe('1:02:06');
    expect(formatTime(-5)).toBe('0:00');
    expect(formatTime(Number.NaN)).toBe('0:00');
  });

  it('builds subtitles', () => {
    expect(subtitle(item('a', 'Artist', 'Album'))).toBe('Artist · Album');
    expect(subtitle(item('a', null, null))).toBe('Unknown artist');
  });

  it('filters by title, artist or album, ignoring case', () => {
    const items = [item('Blue', 'Joni', 'Blue'), item('Hey', 'Pixies', 'Doolittle')];
    expect(filterLibrary(items, 'pix')).toHaveLength(1);
    expect(filterLibrary(items, 'DOOL')[0].title).toBe('Hey');
    expect(filterLibrary(items, '  ')).toHaveLength(2);
  });
});
