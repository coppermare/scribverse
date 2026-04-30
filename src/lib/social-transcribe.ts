import {
  type SupportedPlatform,
  PLATFORM_LABELS,
} from '@/lib/platform-url';
import { slugify, type YoutubeTranscribeError } from '@/lib/youtube-transcribe';
import type { YoutubeTranscribeData } from '@/types/youtube-transcribe';
import { fetchSupadataMetadata } from '@/lib/supadata-metadata';
import { fetchTranscriptViaSupadata } from '@/lib/supadata-transcript';

export async function fetchSocialTranscribeFromUrl(
  url: string,
  platform: SupportedPlatform
): Promise<{ ok: true; data: YoutubeTranscribeData } | { ok: false; error: YoutubeTranscribeError }> {
  const trimmed = url.trim();
  if (!process.env.SUPADATA_API_KEY?.trim()) {
    return {
      ok: false,
      error: {
        status: 503,
        message: `${PLATFORM_LABELS[platform]} transcripts require Supadata. Add SUPADATA_API_KEY to the server environment.`,
      },
    };
  }

  const [meta, transcriptResult] = await Promise.all([
    fetchSupadataMetadata(trimmed),
    fetchTranscriptViaSupadata(trimmed, 'auto'),
  ]);

  const transcript = transcriptResult?.text?.trim() ?? '';
  const transcriptCues = transcriptResult?.cues;
  if (!transcript && (!transcriptCues || transcriptCues.length === 0)) {
    return {
      ok: false,
      error: {
        status: 502,
        message:
          'Could not get a transcript for this link. It may be private, age-restricted, or missing audio.',
      },
    };
  }

  const id = meta?.id ?? platform;
  const title =
    meta?.title?.trim() ||
    `${PLATFORM_LABELS[platform]} video`;
  const channelTitle =
    meta?.author?.displayName?.trim() ||
    meta?.author?.username?.trim() ||
    '';
  const coverUrl =
    (meta?.media && typeof meta.media.thumbnailUrl === 'string' ? meta.media.thumbnailUrl : '') ||
    '';
  const durationSec =
    meta?.media && typeof meta.media.duration === 'number' ? meta.media.duration : 0;
  const durationMinutes = Math.max(0, Math.round(durationSec / 60));

  const data: YoutubeTranscribeData = {
    videoId: id,
    title,
    slug: slugify(title),
    coverUrl,
    durationMinutes,
    platform,
    mediaType: 'video',
    description: (meta?.description ?? '').trim(),
    transcript,
    ...(transcriptCues && transcriptCues.length > 0 ? { transcriptCues } : {}),
    url: meta?.url ?? trimmed,
    channelTitle,
  };

  return { ok: true, data };
}
