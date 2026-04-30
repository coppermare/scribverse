import { NextResponse } from 'next/server';
import { fetchYoutubeCaptionsOnServer } from '@/lib/youtube-caption-fetch-server';
import { checkTranscribeRateLimit, getClientIpFromHeaders } from '@/lib/transcribe-rate-limit';

export const dynamic = 'force-dynamic';
/** Allow enough time for several timedtext round-trips on cold starts (Vercel). */
export const maxDuration = 25;

const videoIdRe = /^[a-zA-Z0-9_-]{11}$/;

export async function GET(request: Request) {
  const ip = getClientIpFromHeaders(request.headers);
  const limited = checkTranscribeRateLimit(ip);
  if (!limited.ok) {
    return NextResponse.json(
      { error: 'Too many requests. Try again later.', transcript: '' },
      {
        status: 429,
        headers: { 'Retry-After': String(limited.retryAfterSec) },
      }
    );
  }

  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get('videoId')?.trim() ?? '';
  if (!videoIdRe.test(videoId)) {
    return NextResponse.json({ error: 'Invalid videoId.', transcript: '' }, { status: 400 });
  }

  const transcript = await fetchYoutubeCaptionsOnServer(videoId);
  return NextResponse.json({ transcript });
}
