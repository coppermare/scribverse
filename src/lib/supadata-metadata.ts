/**
 * Supadata media metadata API.
 * Returns a unified schema for YouTube, TikTok, Instagram, X (Twitter), and Facebook.
 * @see https://supadata.ai/documentation/get-metadata
 */

const SUPADATA_BASE = 'https://api.supadata.ai/v1';

type SupadataAuthor = {
  username?: string;
  displayName?: string;
  avatarUrl?: string;
  verified?: boolean;
};

export type SupadataMetadata = {
  platform: string;
  type: string;
  id: string;
  url: string;
  title: string | null;
  description: string | null;
  author: SupadataAuthor | null;
  /** Discriminated by `type`; video content has `duration` (seconds) and `thumbnailUrl`. */
  media: {
    type?: string;
    duration?: number;
    thumbnailUrl?: string;
    [key: string]: unknown;
  } | null;
};

export async function fetchSupadataMetadata(videoUrl: string): Promise<SupadataMetadata | null> {
  const apiKey = process.env.SUPADATA_API_KEY?.trim();
  if (!apiKey) return null;

  const endpoint = new URL(`${SUPADATA_BASE}/metadata`);
  endpoint.searchParams.set('url', videoUrl);

  let res: Response;
  try {
    res = await fetch(endpoint, {
      headers: { 'x-api-key': apiKey },
      cache: 'no-store',
    });
  } catch {
    return null;
  }

  if (!res.ok) return null;

  try {
    return (await res.json()) as SupadataMetadata;
  } catch {
    return null;
  }
}
