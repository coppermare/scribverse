type Bucket = { count: number; resetAt: number };

const globalForLimit = globalThis as typeof globalThis & {
  transcribeRateLimit?: Map<string, Bucket>;
};

function getStore(): Map<string, Bucket> {
  if (!globalForLimit.transcribeRateLimit) {
    globalForLimit.transcribeRateLimit = new Map();
  }
  return globalForLimit.transcribeRateLimit;
}

export function getClientIpFromHeaders(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() ?? 'unknown';
  }
  return headers.get('x-real-ip') ?? 'unknown';
}

/**
 * Best effort per IP limit. In serverless, instances do not share memory; still limits bursts per isolate.
 */
export function checkTranscribeRateLimit(
  ip: string
): { ok: true } | { ok: false; retryAfterSec: number } {
  const max = Math.max(1, Number(process.env.TRANSCRIBE_RATE_LIMIT_MAX ?? 30));
  const windowMs = Math.max(
    60_000,
    Number(process.env.TRANSCRIBE_RATE_LIMIT_WINDOW_MS ?? 60 * 60 * 1000)
  );

  const store = getStore();
  const now = Date.now();
  let bucket = store.get(ip);

  if (!bucket || now > bucket.resetAt) {
    bucket = { count: 0, resetAt: now + windowMs };
    store.set(ip, bucket);
  }

  if (bucket.count >= max) {
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)) };
  }

  const next = { count: bucket.count + 1, resetAt: bucket.resetAt };
  store.set(ip, next);
  return { ok: true };
}
