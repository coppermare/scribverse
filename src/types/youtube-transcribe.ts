import type { SupportedPlatform } from '@/lib/platform-url';
import type { TranscriptCue } from '@/types/transcript-cue';

export type YoutubeTranscribeData = {
  videoId: string;
  title: string;
  slug: string;
  coverUrl: string;
  durationMinutes: number;
  platform: SupportedPlatform;
  mediaType: 'video';
  description: string;
  transcript: string;
  /** Present when the source API included per-line timing (Supadata chunks, timedtext, youtube-transcript). */
  transcriptCues?: TranscriptCue[];
  url: string;
  channelTitle: string;
};
