import { describe, expect, it } from '@jest/globals';
import { toOnlineTrack } from '../src/online/audius';
import { query } from '../src/online/http';
import { activeLine, cleanTitle, parseLrc, pickRecord, toLyrics } from '../src/online/lyrics';

describe('lyrics', () => {
  it('parses lrc stamps, repeated stamps and blank lines in time order', () => {
    const lines = parseLrc('[ar:Someone]\n[00:12.50]Hello\n[01:02]Again[00:05.1]\n[00:20.123]\n');
    expect(lines).toEqual([
      { timeMs: 5100, text: 'Again' },
      { timeMs: 12500, text: 'Hello' },
      { timeMs: 20123, text: '' },
      { timeMs: 62000, text: 'Again' },
    ]);
  });

  it('cleans titles for a loose lyrics search', () => {
    expect(cleanTitle('RAC - Next To You (ft. Emerson Leif) [Official]')).toBe('RAC - Next To You');
    expect(cleanTitle('Song feat. Someone Else')).toBe('Song');
    expect(cleanTitle('my_track_name.mp3')).toBe('my track name');
  });

  it('finds the line playing at a position', () => {
    const lines = parseLrc('[00:01.00]a\n[00:03.00]b\n[00:05.00]c');
    expect(activeLine(lines, 0)).toBe(-1);
    expect(activeLine(lines, 1000)).toBe(0);
    expect(activeLine(lines, 4999)).toBe(1);
    expect(activeLine(lines, 60000)).toBe(2);
  });

  it('prefers synced lyrics whose duration matches the track', () => {
    const records = [
      { duration: 300, instrumental: false, plainLyrics: 'far', syncedLyrics: '[00:01.00]far' },
      { duration: 181, instrumental: false, plainLyrics: 'plain', syncedLyrics: null },
      { duration: 179, instrumental: false, plainLyrics: 'near', syncedLyrics: '[00:01.00]near' },
    ];
    expect(pickRecord(records, 180000)).toBe(records[2]);
    expect(pickRecord(records, 600000)).toBeNull();
    expect(toLyrics(pickRecord(records, 180000))).toEqual({ kind: 'synced', lines: [{ timeMs: 1000, text: 'near' }] });
    expect(toLyrics({ duration: null, instrumental: true, plainLyrics: null, syncedLyrics: null })).toEqual({ kind: 'instrumental' });
    expect(toLyrics(null)).toEqual({ kind: 'none' });
  });
});

describe('online', () => {
  it('builds query strings without empty values', () => {
    expect(query({ q: 'a b&c', empty: '', none: null, n: 3 })).toBe('q=a%20b%26c&n=3');
  });

  it('maps an audius track to a playable item', () => {
    const track = toOnlineTrack({
      id: 'Ab 1',
      title: 'Song',
      duration: 71.4,
      artwork: { '150x150': 'https://img/150.jpg' },
      user: { name: 'Artist' },
    });
    expect(track).toMatchObject({
      id: 'audius:Ab 1',
      title: 'Song',
      artist: 'Artist',
      durationMs: 71400,
      kind: 'audio',
      artworkUrl: 'https://img/150.jpg',
    });
    expect(track.uri).toContain('/tracks/Ab%201/stream?app_name=');
  });
});
