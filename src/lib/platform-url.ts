/**
 * Multi-platform video URL detection.
 * Supports YouTube, TikTok, Instagram, X (Twitter), and Facebook.
 */

export type SupportedPlatform = 'youtube' | 'tiktok' | 'instagram' | 'twitter' | 'facebook';

const platformPatterns: { pattern: RegExp; platform: SupportedPlatform }[] = [
  { pattern: /(?:www\.|vm\.|m\.)?tiktok\.com/i, platform: 'tiktok' },
  { pattern: /(?:www\.)?instagram\.com/i, platform: 'instagram' },
  { pattern: /(?:www\.)?(?:twitter|x)\.com/i, platform: 'twitter' },
  { pattern: /(?:www\.|m\.)?facebook\.com/i, platform: 'facebook' },
  { pattern: /(?:www\.)?youtube\.com|youtu\.be|music\.youtube\.com/i, platform: 'youtube' },
];

export function detectPlatform(url: string): SupportedPlatform | null {
  const s = url.trim();
  if (!s) return null;
  for (const { pattern, platform } of platformPatterns) {
    if (pattern.test(s)) return platform;
  }
  return null;
}

/** Extract and normalise the first supported video URL from arbitrary text (e.g. a paste). */
export function extractFirstSupportedVideoUrl(text: string): string | null {
  const urls = text.match(/https?:\/\/[^\s<>"']+/gi) ?? [];
  for (let chunk of urls) {
    chunk = chunk.replace(/[.,;:!?)]+$/, '');
    if (detectPlatform(chunk)) return chunk;
  }
  return null;
}

export const PLATFORM_LABELS: Record<SupportedPlatform, string> = {
  youtube: 'YouTube',
  tiktok: 'TikTok',
  instagram: 'Instagram',
  twitter: 'X',
  facebook: 'Facebook',
};

export const SUPPORTED_PLATFORMS_DISPLAY = 'YouTube, TikTok, Instagram, X, or Facebook';

/** Prepend https:// when the user omits the scheme (e.g. instagram.com/...). */
export function normalizeVideoUrlInput(raw: string): string {
  const t = raw.trim();
  if (!t) return t;
  if (/^https?:\/\//i.test(t)) return t;
  if (/^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}/i.test(t)) return `https://${t}`;
  return t;
}
