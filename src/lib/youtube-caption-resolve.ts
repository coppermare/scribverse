import {
  FALLBACK_LANGS,
  isProbablyHtmlShell,
  parseCaptionPayload,
  parseLangCodesFromListXml,
  sortLangCodes,
} from '@/lib/youtube-caption-parse';

/** Cap timedtext attempts so serverless stays within execution limits. */
const MAX_LANGS = 10;

export type YoutubeCaptionResolveResult = {
  text: string;
  /** Raw timedtext body that produced `text`, when any captions were found. */
  raw: string;
};

/**
 * Try timedtext URLs until one parses to non-empty text.
 * `fetchBody` must return the raw response body (or empty string on failure).
 */
async function resolveYoutubeCaptionsInternal(
  videoId: string,
  fetchBody: (url: string) => Promise<string>,
  signal?: AbortSignal
): Promise<YoutubeCaptionResolveResult> {
  const id = videoId.trim();
  if (!/^[a-zA-Z0-9_-]{11}$/.test(id)) return { text: '', raw: '' };

  const base = `https://www.youtube.com/api/timedtext?v=${encodeURIComponent(id)}`;
  const listUrl = `https://www.youtube.com/api/timedtext?type=list&v=${encodeURIComponent(id)}`;

  let listRaw = '';
  try {
    listRaw = await fetchBody(listUrl);
  } catch {
    /* ignore */
  }
  if (signal?.aborted) return { text: '', raw: '' };

  const fromList =
    !listRaw || isProbablyHtmlShell(listRaw) || !listRaw.includes('lang_code=')
      ? []
      : parseLangCodesFromListXml(listRaw);

  const orderedLangs = (
    fromList.length > 0
      ? [...sortLangCodes(fromList), ...FALLBACK_LANGS.filter((l) => !fromList.includes(l))]
      : [...FALLBACK_LANGS]
  ).slice(0, MAX_LANGS);

  const fmts = ['srv3', 'json3', 'vtt'] as const;

  for (const lang of orderedLangs) {
    if (signal?.aborted) return { text: '', raw: '' };
    for (const fmt of fmts) {
      const url = `${base}&lang=${encodeURIComponent(lang)}&fmt=${fmt}`;
      let raw = '';
      try {
        raw = await fetchBody(url);
      } catch {
        /* ignore */
      }
      if (!raw || isProbablyHtmlShell(raw)) continue;
      const text = parseCaptionPayload(raw);
      if (text.trim()) return { text: text.trim(), raw };
    }
  }

  if (signal?.aborted) return { text: '', raw: '' };
  for (const fmt of fmts) {
    const url = `${base}&fmt=${fmt}`;
    let raw = '';
    try {
      raw = await fetchBody(url);
    } catch {
      /* ignore */
    }
    if (!raw || isProbablyHtmlShell(raw)) continue;
    const text = parseCaptionPayload(raw);
    if (text.trim()) return { text: text.trim(), raw };
  }

  return { text: '', raw: '' };
}

export async function resolveYoutubeCaptions(
  videoId: string,
  fetchBody: (url: string) => Promise<string>,
  signal?: AbortSignal
): Promise<string> {
  const r = await resolveYoutubeCaptionsInternal(videoId, fetchBody, signal);
  return r.text;
}

/** Same as {@link resolveYoutubeCaptions} but includes the raw timedtext payload for timed UI / exports. */
export async function resolveYoutubeCaptionsWithRaw(
  videoId: string,
  fetchBody: (url: string) => Promise<string>,
  signal?: AbortSignal
): Promise<YoutubeCaptionResolveResult> {
  return resolveYoutubeCaptionsInternal(videoId, fetchBody, signal);
}
