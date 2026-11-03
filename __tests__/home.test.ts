import { describe, expect, it } from '@jest/globals';

import type { LibraryItem } from '../modules/soundtrail-audio';
import { buildHome, greeting } from '../src/library/home';

const item = (id: string, extra: Partial<LibraryItem>): LibraryItem => ({
  id,
  uri: `content://${id}`,
  title: id,
  artist: null,
  album: null,
  durationMs: 1,
  ...extra,
});

describe('library home', () => {
  const items = [
    item('a', { artist: 'Air', album: 'Moon Safari', genre: 'Electronic', addedAt: 3 }),
    item('b', { artist: 'air', album: 'Moon Safari', genre: 'Electronic', addedAt: 9 }),
    item('c', { artist: 'Björk', album: 'Post', genre: 'Pop', addedAt: 5 }),
    item('d', { artist: '  ', genre: null }),
    item('e', { album: 'Download', folder: 'Download/' }),
    item('f', { album: 'soundtrail', folder: 'Music/soundtrail/' }),
  ];

  it('groups by genre, artist and album, biggest first, ignoring case and blanks', () => {
    const home = buildHome(items);
    expect(home.recent.map((i) => i.id)).toEqual(['b', 'c', 'a']);
    expect(home.played).toEqual([]);
    expect(home.genres.map((g) => [g.title, g.subtitle])).toEqual([
      ['Electronic', '2 tracks'],
      ['Pop', '1 track'],
    ]);
    expect(home.artists.map((g) => g.title)).toEqual(['Air', 'Björk']);
    expect(home.albums.map((g) => [g.title, g.subtitle])).toEqual([
      ['Moon Safari', 'Air'],
      ['Post', 'Björk'],
    ]);
  });

  it('lists recently played tracks in play order, skipping missing ones', () => {
    expect(buildHome(items, ['c', 'gone', 'a']).played.map((i) => i.id)).toEqual(['c', 'a']);
  });

  it('greets by time of day', () => {
    expect(greeting(8)).toBe('Good morning');
    expect(greeting(15)).toBe('Good afternoon');
    expect(greeting(2)).toBe('Good evening');
  });
});
