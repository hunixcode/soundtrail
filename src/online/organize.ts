import type { LibraryItem } from '../../modules/soundtrail-audio';
import { cleanFileName } from '../library/format';
import { HttpError, aiRequest, endpoints, postJson } from './http';

export type Move = { item: LibraryItem; folder: string; name: string };

type Reply = { choices?: { message?: { content?: string | null } }[] };

const ROOT = 'Music';
const CHUNK = 50;
const MIN_CHUNK = 10;
const MAX_DEPTH = 3;
const MAX_KNOWN_FOLDERS = 200;
const RATE_LIMIT_WAIT_MS = 46000;
const RATE_LIMIT_RETRIES = 4;
const AUDIO_EXTENSION = /\.(mp3|m4a|aac|flac|ogg|opus|wav|wma|alac|aiff?)$/i;

const SYSTEM = [
  'You organize a music library on an Android phone.',
  'Each input line is [id, file name, folder, title, artist, album]; null means unknown.',
  'Choose a folder inside Music for every track and fix messy file names.',
  'Reply with JSON only: {"m":[[id,"Folder/Sub","New name"]]}, one entry per track, in input order.',
  'Folder paths have at most 2 levels unless the instruction asks otherwise, and reuse the folders already used.',
  'Take the artist from the tags or from a file name shaped like "Artist - Title", never guess an album, and put tracks whose artist stays unknown in "Unknown artist".',
  'Use "" as the name when the file name is already clean, otherwise a name without extension such as "Artist - Title".',
  'Clean names by dropping track numbers, underscores and tags like (Official Video), (Lyrics) or [HD], and never write "Unknown artist" in a name.',
  'Follow the instruction.',
].join(' ');

const DEFAULT_INSTRUCTION = 'One folder per artist, then one per album when the album is known.';

class PlanError extends Error {}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const baseName = (item: LibraryItem) => (item.fileName ? item.fileName.replace(/\.[^.]+$/, '') : item.title);

const currentFolder = (item: LibraryItem) => (item.folder ?? '').replace(/\/+$/, '');

export function folderPath(value: unknown): string {
  const parts = (typeof value === 'string' ? value : '')
    .split('/')
    .map(cleanFileName)
    .filter((part) => part && !/^\.+$/.test(part));
  if (parts[0]?.toLowerCase() === ROOT.toLowerCase()) parts.shift();
  return [ROOT, ...parts.slice(0, MAX_DEPTH)].join('/');
}

export function parsePlan(content: string, items: LibraryItem[]): Move[] {
  let entries: unknown;
  try {
    entries = (JSON.parse(content.slice(content.indexOf('{'), content.lastIndexOf('}') + 1)) as { m?: unknown }).m;
  } catch {
    throw new PlanError('The AI reply was not valid JSON');
  }
  if (!Array.isArray(entries)) throw new PlanError('The AI reply had no moves');
  const moves = new Map<number, Move>();
  for (const entry of entries) {
    if (!Array.isArray(entry)) continue;
    const index = Number(entry[0]);
    const item = Number.isInteger(index) ? items[index] : undefined;
    if (!item || moves.has(index)) continue;
    const name = typeof entry[2] === 'string' ? cleanFileName(entry[2].replace(AUDIO_EXTENSION, '')) : '';
    moves.set(index, { item, folder: folderPath(entry[1]), name: name || baseName(item) });
  }
  return [...moves.values()];
}

export function finalize(moves: Move[]): Move[] {
  const used = new Set<string>();
  const changed: Move[] = [];
  for (const move of moves) {
    let name = move.name;
    for (let n = 2; used.has(`${move.folder}/${name}`.toLowerCase()); n++) name = `${move.name} (${n})`;
    used.add(`${move.folder}/${name}`.toLowerCase());
    if (move.folder !== currentFolder(move.item) || name !== baseName(move.item)) changed.push({ ...move, name });
  }
  return changed;
}

export function prompt(items: LibraryItem[], instruction: string, folders: string[]): string {
  const known = [...new Set(folders.map((folder) => folder.slice(ROOT.length + 1)).filter(Boolean))].slice(-MAX_KNOWN_FOLDERS);
  return [
    `Instruction: ${instruction.trim() || DEFAULT_INSTRUCTION}`,
    `Folders already used: ${JSON.stringify(known)}`,
    'Tracks:',
    ...items.map((item, i) => JSON.stringify([i, item.fileName ?? null, item.folder ?? null, item.title, item.artist, item.album])),
  ].join('\n');
}

async function ask(user: string): Promise<string> {
  const key = process.env.EXPO_PUBLIC_AI_KEY;
  const body = { ...aiRequest, messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: user }] };
  for (let i = 0; ; i++) {
    try {
      const reply = await postJson<Reply>(endpoints.ai, body, key ? { Authorization: `Bearer ${key}` } : {}, 120000, 1);
      return reply.choices?.[0]?.message?.content ?? '';
    } catch (error) {
      const limited = error instanceof HttpError && (error.status === 402 || error.status === 429);
      if (!limited || i >= RATE_LIMIT_RETRIES) throw error;
      await wait(RATE_LIMIT_WAIT_MS);
    }
  }
}

async function planChunk(items: LibraryItem[], instruction: string, folders: string[]): Promise<Move[]> {
  try {
    return parsePlan(await ask(prompt(items, instruction, folders)), items);
  } catch (error) {
    const tooBig = error instanceof PlanError || (error instanceof HttpError && error.status === 400);
    if (!tooBig || items.length <= MIN_CHUNK) throw error;
    const half = Math.ceil(items.length / 2);
    const first = await planChunk(items.slice(0, half), instruction, folders);
    return [...first, ...(await planChunk(items.slice(half), instruction, [...folders, ...first.map((m) => m.folder)]))];
  }
}

const sortKey = (item: LibraryItem) => [item.artist ?? '', item.album ?? '', item.title].join('\u0000').toLocaleLowerCase();

export async function planOrganize(
  items: LibraryItem[],
  instruction: string,
  onProgress: (done: number, total: number) => void,
): Promise<Move[]> {
  const sorted = [...items].sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
  const total = Math.ceil(sorted.length / CHUNK);
  const moves: Move[] = [];
  for (let i = 0; i < total; i++) {
    onProgress(i, total);
    const folders = [...new Set(moves.map((move) => move.folder))];
    moves.push(...(await planChunk(sorted.slice(i * CHUNK, (i + 1) * CHUNK), instruction, folders)));
  }
  onProgress(total, total);
  return finalize(moves);
}
