/**
 * Load captions for the transcript UI.
 * 1) Same-origin API proxy — server can send YouTube Referer/Origin (browsers ignore custom Referer on fetch).
 * 2) Direct browser timedtext as fallback (cookies / different path).
 */

import { resolveYoutubeCaptions } from '@/lib/youtube-caption-resolve';
import { isProbablyHtmlShell } from '@/lib/youtube-caption-parse';

async function fetchTextBrowser(
  url: string,
  videoId: string,
  signal: AbortSignal | undefined
): Promise<string> {
  const headers: Record<string, string> = {
    Accept: '*/*',
    'Accept-Language': 'en-US,en;q=0.9',
  };

  const tryOnce = async (credentials: RequestCredentials) => {
    const res = await fetch(url, { signal, credentials, headers });
    if (!res.ok) return '';
    return res.text();
  };

  let raw = await tryOnce('omit');
  if (signal?.aborted) return '';
  if (!raw || isProbablyHtmlShell(raw)) {
    raw = await tryOnce('include');
  }
  return raw;
}

async function fetchCaptionsDirectFromBrowser(
  videoId: string,
  signal?: AbortSignal
): Promise<string> {
  return resolveYoutubeCaptions(
    videoId,
    async (url) => {
      const raw = await fetchTextBrowser(url, videoId, signal);
      if (!raw || isProbablyHtmlShell(raw)) return '';
      return raw;
    },
    signal
  );
}

/**
 * Returns plain caption text, or empty string if none could be loaded.
 */
export async function fetchYoutubeCaptionsFromBrowser(
  videoId: string,
  signal?: AbortSignal
): Promise<string> {
  const id = videoId.trim();
  if (!/^[a-zA-Z0-9_-]{11}$/.test(id)) return '';

  try {
    const res = await fetch(`/api/youtube-captions?videoId=${encodeURIComponent(id)}`, {
      signal,
      headers: { Accept: 'application/json' },
    });
    if (res.ok) {
      const data = (await res.json()) as { transcript?: string };
      const t = (data.transcript ?? '').trim();
      if (t) return t;
    }
  } catch {
    /* fall through to direct */
  }

  return fetchCaptionsDirectFromBrowser(id, signal);
}
