/** One timed line of transcript (Supadata-style: start + duration in ms). */
export type TranscriptCue = {
  startMs: number;
  /** Exclusive end; derived from start + duration when not otherwise known. */
  endMs: number;
  text: string;
};
