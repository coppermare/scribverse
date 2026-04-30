/**
 * Shared YouTube URL and video id parsing (client + server).
 * Supports watch, youtu.be, Shorts, embed, /v/, /live/, and music.youtube.com.
 */

const ID = '([a-zA-Z0-9_-]{11})';

function extractIdFromYoutubeString(t: string): string | null {
  const s = t.trim();
  if (!s) return null;

  let m = s.match(new RegExp(`youtu\\.be/${ID}(?:[?#/&]|$)`, 'i'));
  if (m) return m[1]!;

  m = s.match(new RegExp(`youtube\\.com/embed/${ID}(?:[?#/&]|$)`, 'i'));
  if (m) return m[1]!;

  m = s.match(new RegExp(`youtube\\.com/shorts/${ID}(?:[?#/&]|$)`, 'i'));
  if (m) return m[1]!;

  m = s.match(new RegExp(`youtube\\.com/live/${ID}(?:[?#/&]|$)`, 'i'));
  if (m) return m[1]!;

  m = s.match(new RegExp(`youtube\\.com/v/${ID}(?:[?#/&]|$)`, 'i'));
  if (m) return m[1]!;

  if (/youtube\.com|music\.youtube\.com/i.test(s)) {
    m = s.match(new RegExp(`[?&]v=${ID}(?:[&#[/]|$)`, 'i'));
    if (m) return m[1]!;
  }

  return null;
}

export function extractYouTubeId(input: string): string | null {
  return extractIdFromYoutubeString(input);
}

/** First http(s) substring or token that contains a recognizable YouTube video id. */
export function extractFirstYoutubeUrlFromText(text: string): string | null {
  const urls = text.match(/https?:\/\/[^\s<>"']+/gi) ?? [];
  for (let chunk of urls) {
    chunk = chunk.replace(/[.,;:!?)]+$/, '');
    if (extractIdFromYoutubeString(chunk)) return chunk;
  }
  for (const part of text.split(/[\n\r\t,;\s|]+/)) {
    const p = part.replace(/^[([{<"'`]+|[.,;:!?)}\]'"]+$/g, '').trim();
    if (p && extractIdFromYoutubeString(p)) return p;
  }
  return null;
}
