import { describe, expect, it } from '@jest/globals';
import { nextPage, parseDuration, playlistFromLink, results, type ListItem } from '../src/online/youtube';

const runs = (...texts: string[]) => ({ runs: texts.map((text) => ({ text })) });
const column = (...texts: string[]) => ({ musicResponsiveListItemFlexColumnRenderer: { text: runs(...texts) } });
const thumbs = (url: string) => ({ musicThumbnailRenderer: { thumbnail: { thumbnails: [{ url: `${url}-small` }, { url }] } } });

const song: ListItem = {
  flexColumns: [column('Instant Crush'), column('Daft Punk', ' & ', 'Julian Casablancas', ' • ', 'Random Access Memories', ' • ', '5:38')],
  playlistItemData: { videoId: 'khnokW3Mw24' },
  thumbnail: thumbs('https://img/song'),
};

const playlistTrack: ListItem = {
  flexColumns: [column('Die With A Smile'), column('Lady Gaga', ' & ', 'Bruno Mars'), column()],
  fixedColumns: [{ musicResponsiveListItemFixedColumnRenderer: { text: runs('4:13') } }],
  playlistItemData: { videoId: 'kPa7bsKwL-c' },
};

const album: ListItem = {
  flexColumns: [column('Random Access Memories'), column('Album', ' • ', 'Daft Punk', ' • ', '2013')],
  navigationEndpoint: { browseEndpoint: { browseId: 'MPREb_K8qWMWVqXGi' } },
  thumbnail: thumbs('https://img/album'),
};

describe('youtube music', () => {
  it('reads songs, playlist rows and albums wherever they sit in a response', () => {
    const response = {
      contents: { shelf: [{ musicResponsiveListItemRenderer: song }, { musicResponsiveListItemRenderer: album }] },
      more: { musicResponsiveListItemRenderer: playlistTrack },
      broken: { musicResponsiveListItemRenderer: { flexColumns: [column('Gone')] } },
    };
    expect(results(response)).toEqual([
      {
        kind: 'track',
        id: 'khnokW3Mw24',
        title: 'Instant Crush',
        artist: 'Daft Punk & Julian Casablancas',
        durationMs: 338000,
        artworkUrl: 'https://img/song',
      },
      { kind: 'list', id: 'MPREb_K8qWMWVqXGi', title: 'Random Access Memories', subtitle: 'Album · Daft Punk · 2013', artworkUrl: 'https://img/album' },
      { kind: 'track', id: 'kPa7bsKwL-c', title: 'Die With A Smile', artist: 'Lady Gaga & Bruno Mars', durationMs: 253000, artworkUrl: null },
    ]);
  });

  it('does not take a duration for the artist', () => {
    const [track] = results({ musicResponsiveListItemRenderer: { ...song, flexColumns: [column('Intro'), column('1:02:03')] } });
    expect(track).toMatchObject({ artist: null, durationMs: 3723000 });
  });

  it('parses durations strictly', () => {
    expect(parseDuration('3:27')).toBe(207000);
    expect(parseDuration('35M views')).toBe(0);
    expect(parseDuration('2013')).toBe(0);
  });

  it('finds the playlist continuation token', () => {
    const page = { items: [{ continuationItemRenderer: { continuationEndpoint: { continuationCommand: { token: 'abc' } } } }] };
    expect(nextPage(page)).toBe('abc');
    expect(nextPage({})).toBeNull();
  });

  it('reads playlist ids from youtube and youtube music links', () => {
    expect(playlistFromLink('https://music.youtube.com/playlist?list=OLAK5uy_abc-1&si=x')).toBe('VLOLAK5uy_abc-1');
    expect(playlistFromLink('https://www.youtube.com/watch?v=kPa7bsKwL-c&list=PLMC9KNk')).toBe('VLPLMC9KNk');
    expect(playlistFromLink('https://youtu.be/kPa7bsKwL-c?list=VLPL1')).toBe('VLPL1');
    expect(playlistFromLink('https://www.youtube.com/watch?v=kPa7bsKwL-c')).toBeNull();
    expect(playlistFromLink('daft punk list=PL1')).toBeNull();
  });
});
