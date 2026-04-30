import {
  resolveYoutubeCaptions,
  resolveYoutubeCaptionsWithRaw,
  type YoutubeCaptionResolveResult,
} from '@/lib/youtube-caption-resolve';

const CHROME_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

export function youtubeTimedtextServerHeaders(videoId: string): HeadersInit {
  return {
    'User-Agent': CHROME_UA,
    'Accept-Language': 'en-US,en;q=0.9',
    Accept: '*/*',
    Referer: `https://www.youtube.com/watch?v=${videoId}`,
    Origin: 'https://www.youtube.com',
  };
}

async function fetchTimedtextBody(videoId: string, url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: youtubeTimedtextServerHeaders(videoId),
      cache: 'no-store',
    });
    if (!res.ok) return '';
    return await res.text();
  } catch {
    return '';
  }
}

/** Server-side timedtext fetch (Referer / Origin work here; browsers ignore custom Referer on fetch). */
export async function fetchYoutubeCaptionsOnServer(videoId: string): Promise<string> {
  const id = videoId.trim();
  if (!/^[a-zA-Z0-9_-]{11}$/.test(id)) return '';

  return resolveYoutubeCaptions(id, (url) => fetchTimedtextBody(id, url));
}

/** Same captions as {@link fetchYoutubeCaptionsOnServer} plus raw payload for timed cue parsing. */
export async function fetchYoutubeCaptionsWithRawOnServer(
  videoId: string
): Promise<YoutubeCaptionResolveResult> {
  const id = videoId.trim();
  if (!/^[a-zA-Z0-9_-]{11}$/.test(id)) return { text: '', raw: '' };

  return resolveYoutubeCaptionsWithRaw(id, (url) => fetchTimedtextBody(id, url));
}
