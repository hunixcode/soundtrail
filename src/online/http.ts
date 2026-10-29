import Constants from 'expo-constants';

type Extra = { lyricsApi?: string; streamApi?: string };

const extra = (Constants.expoConfig?.extra ?? {}) as Extra;

export const endpoints = {
  lyrics: extra.lyricsApi ?? '',
  stream: extra.streamApi ?? '',
};

export const appName = Constants.expoConfig?.slug ?? 'app';
export const appVersion = Constants.expoConfig?.version ?? '0';

export function query(params: Record<string, string | number | null | undefined>): string {
  return Object.entries(params)
    .filter(([, value]) => value !== null && value !== undefined && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&');
}

class HttpError extends Error {
  constructor(readonly status: number) {
    super(`HTTP ${status}`);
  }
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function attempt<T>(url: string, headers: Record<string, string>, timeoutMs: number): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { headers: { Accept: 'application/json', ...headers }, signal: controller.signal });
    if (!response.ok) throw new HttpError(response.status);
    return (await response.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

export async function getJson<T>(url: string, headers: Record<string, string> = {}, timeoutMs = 10000, retries = 2): Promise<T> {
  if (!url.startsWith('https://')) throw new Error('Endpoint not configured');
  for (let i = 0; ; i++) {
    try {
      return await attempt<T>(url, headers, timeoutMs);
    } catch (error) {
      const transient = !(error instanceof HttpError) || error.status === 429 || error.status >= 500;
      if (!transient || i >= retries) throw error;
      await wait(600 * (i + 1));
    }
  }
}
