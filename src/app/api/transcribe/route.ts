import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  checkTranscribeRateLimit,
  getClientIpFromHeaders,
} from '@/lib/transcribe-rate-limit';
import { detectPlatform } from '@/lib/platform-url';
import { fetchSocialTranscribeFromUrl } from '@/lib/social-transcribe';
import { fetchYoutubeTranscribeFromUrl } from '@/lib/youtube-transcribe';

export const maxDuration = 60;

const bodySchema = z.object({
  url: z.string().min(1).max(2048),
});

export async function POST(request: Request) {
  const ip = getClientIpFromHeaders(request.headers);
  const limited = checkTranscribeRateLimit(ip);
  if (!limited.ok) {
    return NextResponse.json(
      { error: 'Too many requests. Try again later.' },
      {
        status: 429,
        headers: { 'Retry-After': String(limited.retryAfterSec) },
      }
    );
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'A valid url field is required.' }, { status: 400 });
  }

  const platform = detectPlatform(parsed.data.url);
  if (!platform) {
    return NextResponse.json(
      {
        error:
          'Unsupported link. Use a public video URL from YouTube, TikTok, Instagram, X, or Facebook.',
      },
      { status: 400 }
    );
  }

  const result =
    platform === 'youtube'
      ? await fetchYoutubeTranscribeFromUrl(parsed.data.url)
      : await fetchSocialTranscribeFromUrl(parsed.data.url, platform);
  if (!result.ok) {
    return NextResponse.json({ error: result.error.message }, { status: result.error.status });
  }

  const d = result.data;
  return NextResponse.json({
    videoId: d.videoId,
    title: d.title,
    slug: d.slug,
    coverUrl: d.coverUrl,
    durationMinutes: d.durationMinutes,
    platform: d.platform,
    mediaType: d.mediaType,
    description: d.description,
    transcript: d.transcript,
    ...(d.transcriptCues && d.transcriptCues.length > 0 ? { transcriptCues: d.transcriptCues } : {}),
    url: d.url,
    channelTitle: d.channelTitle,
  });
}
