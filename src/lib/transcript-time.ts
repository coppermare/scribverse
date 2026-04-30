import type { TranscriptCue } from '@/types/transcript-cue';

/** Format milliseconds as `m:ss` or `h:mm:ss` (hours only when needed). */
export function formatTimestampMs(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) ms = 0;
  const totalS = Math.floor(ms / 1000);
  const h = Math.floor(totalS / 3600);
  const m = Math.floor((totalS % 3600) / 60);
  const s = totalS % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function cuesToPlainText(cues: TranscriptCue[]): string {
  return cues
    .map((c) => c.text.trim())
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * youtube-transcript uses integer ms for srv3 `<p t d>` and seconds (float or int) for classic `<text>`.
 */
export function cueFromYoutubeTranscriptSegment(seg: {
  text: string;
  offset: number;
  duration: number;
}): TranscriptCue {
  const { text, offset, duration } = seg;
  let startMs: number;
  let durMs: number;
  if (!Number.isInteger(offset) || !Number.isInteger(duration)) {
    startMs = Math.round(offset * 1000);
    durMs = Math.round(duration * 1000);
  } else {
    const asMs = duration >= 250 || offset >= 500;
    startMs = asMs ? Math.round(offset) : Math.round(offset * 1000);
    durMs = asMs ? Math.round(duration) : Math.round(duration * 1000);
  }
  const safeDur = Math.max(0, durMs);
  return {
    text: text.trim(),
    startMs,
    endMs: startMs + safeDur,
  };
}
