/**
 * Supadata transcript API.
 * - mode=native: existing captions only (YouTube fallback; no AI cost)
 * - mode=auto: native first, then AI generation (social platforms)
 * Chunked responses mirror Supadata's `text=false` shape: `{ text, offset, duration }` in ms.
 * @see https://supadata.ai/documentation/get-transcript
 */

import { cuesToPlainText } from '@/lib/transcript-time';
import type { TranscriptCue } from '@/types/transcript-cue';

const SUPADATA_BASE = 'https://api.supadata.ai/v1';

export type SupadataTranscriptMode = 'native' | 'auto' | 'generate';

type SupadataChunk = {
  text?: string;
  offset?: number;
  duration?: number;
  lang?: string;
};

function chunksToCues(chunks: SupadataChunk[]): TranscriptCue[] {
  const cues: TranscriptCue[] = [];
  for (const c of chunks) {
    const t = (c.text ?? '').trim();
    if (!t) continue;
    const startMs = Math.max(0, Math.round(Number(c.offset ?? 0)));
    const durMs = Math.max(0, Math.round(Number(c.duration ?? 0)));
    cues.push({
      text: t,
      startMs,
      endMs: startMs + durMs,
    });
  }
  return cues;
}

function normalizeSupadataContent(content: unknown): { text: string; cues: TranscriptCue[] } | null {
  if (typeof content === 'string') {
    const text = content.trim();
    return text ? { text, cues: [] } : null;
  }
  if (!Array.isArray(content)) return null;
  const cues = chunksToCues(content as SupadataChunk[]);
  if (!cues.length) return null;
  return { cues, text: cuesToPlainText(cues) };
}

async function pollSupadataJob(
  jobId: string,
  apiKey: string,
  maxMs: number
): Promise<{ text: string; cues: TranscriptCue[] } | null> {
  const intervalMs = 1000;
  const deadline = Date.now() + maxMs;

  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, intervalMs));
    let res: Response;
    try {
      res = await fetch(`${SUPADATA_BASE}/transcript/${encodeURIComponent(jobId)}`, {
        headers: { 'x-api-key': apiKey },
        cache: 'no-store',
      });
    } catch {
      return null;
    }
    if (!res.ok) continue;

    let body: { status?: string; content?: unknown };
    try {
      body = (await res.json()) as { status?: string; content?: unknown };
    } catch {
      continue;
    }

    if (body.status === 'failed') return null;
    if (body.status === 'completed') {
      return normalizeSupadataContent(body.content);
    }
  }
  return null;
}

/**
 * Returns plain transcript text plus Supadata-style timed cues when the API returns chunks (`text=false`).
 */
export async function fetchTranscriptViaSupadata(
  videoUrl: string,
  mode: SupadataTranscriptMode
): Promise<{ text: string; cues: TranscriptCue[] } | null> {
  const apiKey = process.env.SUPADATA_API_KEY?.trim();
  if (!apiKey) return null;

  const pollMaxMs =
    mode === 'native'
      ? Math.max(3000, Number(process.env.SUPADATA_JOB_POLL_MAX_MS ?? 15_000))
      : Math.max(10_000, Number(process.env.SUPADATA_JOB_POLL_MAX_MS ?? 60_000));

  const endpoint = new URL(`${SUPADATA_BASE}/transcript`);
  endpoint.searchParams.set('url', videoUrl);
  endpoint.searchParams.set('mode', mode);

  let res: Response;
  try {
    res = await fetch(endpoint, {
      headers: { 'x-api-key': apiKey },
      cache: 'no-store',
    });
  } catch {
    return null;
  }

  if (res.status === 202) {
    let job: { jobId?: string };
    try {
      job = (await res.json()) as { jobId?: string };
    } catch {
      return null;
    }
    if (!job.jobId) return null;
    return pollSupadataJob(job.jobId, apiKey, pollMaxMs);
  }

  if (!res.ok) return null;

  let data: { content?: unknown };
  try {
    data = (await res.json()) as { content?: unknown };
  } catch {
    return null;
  }

  return normalizeSupadataContent(data.content);
}

/** YouTube-only fallback: native captions only (no AI). */
export function fetchTranscriptViaSupadataNative(videoUrl: string) {
  return fetchTranscriptViaSupadata(videoUrl, 'native');
}
