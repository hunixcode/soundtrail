import { NativeModule, requireNativeModule } from 'expo';

export type LibraryItem = {
  id: string;
  uri: string;
  title: string;
  artist: string | null;
  album: string | null;
  durationMs: number;
};

export type FileDescription = {
  title: string;
  artist: string | null;
  durationMs: number;
  hasAudio: boolean;
};

export type RepeatMode = 'off' | 'all' | 'one';

export type PlaybackStatus = {
  isPlaying: boolean;
  playWhenReady: boolean;
  isBuffering: boolean;
  isEnded: boolean;
  positionMs: number;
  durationMs: number;
  index: number;
  mediaId: string | null;
  speed: number;
  shuffle: boolean;
  repeat: RepeatMode;
};

export type PlaybackErrorCode =
  | 'UNSUPPORTED_FORMAT'
  | 'CORRUPT_FILE'
  | 'NO_AUDIO_TRACK'
  | 'IO_ERROR'
  | 'PLAYBACK_ERROR';

export type PlaybackError = {
  code: PlaybackErrorCode;
  message: string;
};

export type EqBand = {
  index: number;
  centerHz: number;
  minDb: number;
  maxDb: number;
  gainDb: number;
};

export type EqualizerState = {
  available: boolean;
  enabled: boolean;
  bands: EqBand[];
};

export type QueueItem = {
  id: string;
  uri: string;
  title: string;
  artist?: string | null;
  artworkUri?: string | null;
};

type Events = {
  onStatus: (status: PlaybackStatus) => void;
  onError: (error: PlaybackError) => void;
};

declare class SoundtrailAudioModule extends NativeModule<Events> {
  scanLibrary(): Promise<LibraryItem[]>;
  describe(uri: string): Promise<FileDescription>;
  getArtwork(uri: string): Promise<string | null>;
  clearArtworkCache(): Promise<void>;
  getPrefs(): Promise<string | null>;
  setPrefs(json: string): Promise<void>;
  getStatus(): Promise<PlaybackStatus>;
  setQueue(items: QueueItem[], startIndex: number, playWhenReady: boolean): Promise<void>;
  play(): Promise<void>;
  pause(): Promise<void>;
  next(): Promise<void>;
  previous(): Promise<void>;
  skipTo(index: number): Promise<void>;
  seekTo(positionMs: number): Promise<void>;
  setSpeed(speed: number): Promise<void>;
  setShuffle(enabled: boolean): Promise<void>;
  setRepeat(mode: RepeatMode): Promise<void>;
  getEqualizer(): Promise<EqualizerState>;
  setEqEnabled(enabled: boolean): Promise<void>;
  setEqGains(gains: number[]): Promise<void>;
  setEqBandGain(index: number, db: number): Promise<void>;
}

export default requireNativeModule<SoundtrailAudioModule>('SoundtrailAudio');
