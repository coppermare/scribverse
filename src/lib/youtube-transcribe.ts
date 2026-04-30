import { YoutubeTranscript } from 'youtube-transcript';
import { fetchYoutubeCaptionsWithRawOnServer } from '@/lib/youtube-caption-fetch-server';
import { parseCaptionPayloadSegments } from '@/lib/youtube-caption-parse';
import { fetchTranscriptViaSupadataNative } from '@/lib/supadata-transcript';
import { cueFromYoutubeTranscriptSegment, cuesToPlainText } from '@/lib/transcript-time';
import type { TranscriptCue } from '@/types/transcript-cue';
import type { YoutubeTranscribeData } from '@/types/youtube-transcribe';
import { extractYouTubeId } from '@/lib/youtube-url';

export type { YoutubeTranscribeData };

export function parseDurationToMinutes(iso: string): number {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = parseInt(match[1] ?? '0', 10);
  const minutes = parseInt(match[2] ?? '0', 10);
  return hours * 60 + minutes;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

async function fetchTranscriptCuesWithNode(videoId: string): Promise<TranscriptCue[]> {
  try {
    const segments = await YoutubeTranscript.fetchTranscript(videoId);
    return segments.map(cueFromYoutubeTranscriptSegment).filter((c) => c.text);
  } catch {
    return [];
  }
}

export type YoutubeTranscribeError = { status: number; message: string };

export async function fetchYoutubeTranscribeFromUrl(
  url: string
): Promise<{ ok: true; data: YoutubeTranscribeData } | { ok: false; error: YoutubeTranscribeError }> {
  const trimmed = url.trim();
  if (!trimmed) {
    return { ok: false, error: { status: 400, message: 'URL is required.' } };
  }

  const videoId = extractYouTubeId(trimmed);
  if (!videoId) {
    return {
      ok: false,
      error: {
        status: 400,
        message:
          'Not a valid YouTube URL. Use watch, youtu.be, Shorts, embed, or music.youtube.com links.',
      },
    };
  }

  const apiKey = process.env.YOUTUBE_API_KEY?.trim();
  if (!apiKey) {
    return {
      ok: false,
      error: { status: 500, message: 'Transcription service is not configured.' },
    };
  }

  let ytRes: Response;
  try {
    ytRes = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoId}&key=${apiKey}`
    );
  } catch {
    return {
      ok: false,
      error: {
        status: 503,
        message: 'Could not reach YouTube. Check your connection and try again.',
      },
    };
  }

  let ytData: {
    items?: Array<{
      snippet: {
        title: string;
        description: string;
        channelTitle?: string;
        thumbnails: Record<string, { url: string }>;
      };
      contentDetails: { duration: string };
    }>;
    error?: { message?: string };
  };

  try {
    ytData = (await ytRes.json()) as typeof ytData;
  } catch {
    return {
      ok: false,
      error: {
        status: 502,
        message: 'Unexpected response from YouTube. Try again in a moment.',
      },
    };
  }

  if (!ytRes.ok) {
    const msg =
      ytData.error?.message ??
      (ytRes.status >= 500
        ? 'YouTube is temporarily unavailable. Try again later.'
        : 'Video not found, private, or unavailable.');
    const clientStatus =
      ytRes.status === 403 || ytRes.status === 404
        ? ytRes.status
        : ytRes.status >= 500
          ? 503
          : 400;
    return { ok: false, error: { status: clientStatus, message: msg } };
  }

  const video = ytData.items?.[0];
  if (!video) {
    const msg = ytData.error?.message ?? 'Video not found, private, or unavailable.';
    return { ok: false, error: { status: 404, message: msg } };
  }

  const { snippet, contentDetails } = video;
  const title = snippet.title;
  const description = snippet.description;
  const channelTitle = snippet.channelTitle ?? '';
  const coverUrl =
    snippet.thumbnails?.maxres?.url ??
    snippet.thumbnails?.high?.url ??
    snippet.thumbnails?.medium?.url ??
    '';
  const durationMinutes = parseDurationToMinutes(contentDetails.duration);

  let transcript = '';
  let transcriptCues: TranscriptCue[] | undefined;

  const nodeCues = await fetchTranscriptCuesWithNode(videoId);
  if (nodeCues.length > 0) {
    transcriptCues = nodeCues;
    transcript = cuesToPlainText(nodeCues);
  }

  if (!transcript) {
    const { text, raw } = await fetchYoutubeCaptionsWithRawOnServer(videoId);
    transcript = text.trim();
    if (raw && transcript) {
      const fromTimedtext = parseCaptionPayloadSegments(raw);
      if (fromTimedtext.length > 0) transcriptCues = fromTimedtext;
    }
  }

  if (!transcript) {
    const viaSupadata = await fetchTranscriptViaSupadataNative(trimmed);
    if (viaSupadata) {
      transcript = viaSupadata.text.trim();
      if (viaSupadata.cues.length > 0) transcriptCues = viaSupadata.cues;
    }
  }

  return {
    ok: true,
    data: {
      videoId,
      title,
      slug: slugify(title),
      coverUrl,
      durationMinutes,
      platform: 'youtube',
      mediaType: 'video',
      description,
      transcript,
      ...(transcriptCues && transcriptCues.length > 0 ? { transcriptCues } : {}),
      url: trimmed,
      channelTitle,
    },
  };
}
