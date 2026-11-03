import Audio from '../../modules/soundtrail-audio';
import { cleanFileName } from '../library/format';
import { appName } from '../online/http';
import { watchUrl, type YtTrack } from '../online/youtube';
import { scanLibrary } from './app';
import { createStore, useStore } from './createStore';

export type DownloadStatus = 'queued' | 'active' | 'done' | 'failed';

export type Download = { track: YtTrack; folder: string; status: DownloadStatus; progress: number };

const store = createStore<{ jobs: Record<string, Download> }>({ jobs: {} });

export const useDownload = (id: string) => useStore(store, (s) => s.jobs[id]);

export const downloadFolder = (list?: string) => {
  const root = `Music/${cleanFileName(appName) || 'Downloads'}`;
  const sub = list ? cleanFileName(list) : '';
  return sub ? `${root}/${sub}` : root;
};

export const fileName = (track: YtTrack) => cleanFileName(track.artist ? `${track.artist} - ${track.title}` : track.title) || track.id;

function patch(id: string, change: Partial<Download>) {
  store.set((s) => (s.jobs[id] ? { jobs: { ...s.jobs, [id]: { ...s.jobs[id], ...change } } } : {}));
}

let listening = false;
let running = false;

export function download(tracks: YtTrack[], list?: string) {
  if (!listening) {
    listening = true;
    Audio.addListener('onDownload', ({ id, progress }) => patch(id, { progress }));
  }
  const folder = downloadFolder(list);
  store.set((s) => {
    const jobs = { ...s.jobs };
    for (const track of tracks) {
      const status = jobs[track.id]?.status;
      if (!status || status === 'failed') jobs[track.id] = { track, folder, status: 'queued', progress: 0 };
    }
    return { jobs };
  });
  void pump();
}

async function pump() {
  if (running) return;
  running = true;
  try {
    for (let job = nextJob(); job; job = nextJob()) {
      const { track, folder } = job;
      patch(track.id, { status: 'active', progress: 0 });
      try {
        await Audio.download(track.id, watchUrl(track.id), folder, fileName(track));
        patch(track.id, { status: 'done', progress: 100 });
        await scanLibrary(false);
      } catch {
        patch(track.id, { status: 'failed' });
      }
    }
  } finally {
    running = false;
  }
}

const nextJob = () => Object.values(store.get().jobs).find((job) => job.status === 'queued');
