import { describe, expect, it, jest } from '@jest/globals';

import type { LibraryItem } from '../modules/soundtrail-audio';
import { finalize, folderPath, parsePlan, planOrganize, prompt } from '../src/online/organize';

const mockReplies: string[] = [];
const mockPrompts: string[] = [];

jest.mock('../src/online/http', () => {
  const actual = jest.requireActual<typeof import('../src/online/http')>('../src/online/http');
  return {
    ...actual,
    endpoints: { ...actual.endpoints, ai: 'https://ai.test/v1' },
    postJson: async (_url: string, body: { messages: { content: string }[] }) => {
      mockPrompts.push(body.messages[1].content);
      return { choices: [{ message: { content: mockReplies.shift() ?? '' } }] };
    },
  };
});

const item = (id: string, fileName: string, folder: string, artist: string | null = null): LibraryItem => ({
  id,
  uri: `content://media/${id}`,
  title: fileName.replace(/\.[^.]+$/, ''),
  artist,
  album: null,
  durationMs: 1000,
  fileName,
  folder,
});

describe('organize', () => {
  it('keeps every folder inside Music without escaping it', () => {
    expect(folderPath('Daft Punk/Discovery')).toBe('Music/Daft Punk/Discovery');
    expect(folderPath('/music/../A:B/./C/D/E/')).toBe('Music/AB/C/D');
    expect(folderPath(42)).toBe('Music');
  });

  it('reads a reply, ignoring unknown ids, repeats and extensions', () => {
    const items = [item('a', 'one.mp3', 'Download/'), item('b', 'two.mp3', 'Music/')];
    const moves = parsePlan('Sure! {"m":[[0,"X","Artist - One.mp3"],[0,"Y","again"],[7,"Z","nope"],["1","Y",""]]}', items);
    expect(moves.map((m) => [m.item.id, m.folder, m.name])).toEqual([
      ['a', 'Music/X', 'Artist - One'],
      ['b', 'Music/Y', 'two'],
    ]);
    expect(() => parsePlan('no json here', items)).toThrow();
  });

  it('drops unchanged files and numbers clashing names', () => {
    const a = item('a', 'Song.mp3', 'Music/X/');
    const b = item('b', 'song.m4a', 'Download/');
    const c = item('c', 'c.mp3', 'Download/');
    expect(
      finalize([
        { item: a, folder: 'Music/X', name: 'Song' },
        { item: b, folder: 'Music/X', name: 'song' },
        { item: c, folder: 'Music/X', name: 'Song' },
      ]).map((m) => [m.item.id, m.name]),
    ).toEqual([
      ['b', 'song (2)'],
      ['c', 'Song (3)'],
    ]);
  });

  it('describes tracks and known folders in the prompt', () => {
    const text = prompt([item('a', 'one.mp3', 'Download/', 'Air')], '', ['Music/Air', 'Music']);
    expect(text).toContain('Folders already used: ["Air"]');
    expect(text).toContain('[0,"one.mp3","Download/","one","Air",null]');
  });

  it('splits a chunk in half when the reply cannot be read', async () => {
    const items = Array.from({ length: 12 }, (_, i) => item(`t${i}`, `t${i}.mp3`, 'Download/', 'Air'));
    mockReplies.push('{"m":[[0,"Air', '{"m":[[0,"Air",""],[1,"Air",""]]}', '{"m":[[0,"Air",""]]}');
    const progress: number[] = [];
    const moves = await planOrganize(items, 'by artist', (done) => progress.push(done));
    expect(mockPrompts).toHaveLength(3);
    expect(mockPrompts[2]).toContain('Folders already used: ["Air"]');
    expect(moves.map((m) => m.item.id)).toEqual(['t0', 't1', 't4']);
    expect(progress).toEqual([0, 1]);
  });
});
