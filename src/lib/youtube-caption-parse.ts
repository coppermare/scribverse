/**
 * Parse YouTube timedtext payloads (srv3 XML, classic XML, json3, WebVTT).
 */

import type { TranscriptCue } from '@/types/transcript-cue';

const CLASSIC_TEXT_RE = /<text start="([^"]*)" dur="([^"]*)">([^<]*)<\/text>/g;

function decodeTranscriptEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, num) => String.fromCodePoint(parseInt(num, 10)));
}

function parseSrv3OrClassicXml(xml: string): string {
  const pieces: string[] = [];
  const srv3p = /<p\s+t="(\d+)"\s+d="(\d+)"[^>]*>([\s\S]*?)<\/p>/g;
  const srv3s = /<s[^>]*>([^<]*)<\/s>/g;
  let m: RegExpExecArray | null;
  while ((m = srv3p.exec(xml)) !== null) {
    const inner = m[3];
    let line = '';
    srv3s.lastIndex = 0;
    let s: RegExpExecArray | null;
    while ((s = srv3s.exec(inner)) !== null) {
      line += s[1];
    }
    if (!line) line = inner.replace(/<[^>]+>/g, '');
    const decoded = decodeTranscriptEntities(line).trim();
    if (decoded) pieces.push(decoded);
  }
  if (pieces.length > 0) {
    return pieces.join(' ');
  }
  const classic = new RegExp(CLASSIC_TEXT_RE.source, 'g');
  while ((m = classic.exec(xml)) !== null) {
    const decoded = decodeTranscriptEntities(m[3]).trim();
    if (decoded) pieces.push(decoded);
  }
  return pieces.join(' ');
}

function parseJson3Captions(jsonStr: string): string {
  try {
    const j = JSON.parse(jsonStr) as {
      events?: Array<{ segs?: Array<{ utf8?: string }> }>;
    };
    const parts: string[] = [];
    for (const ev of j.events ?? []) {
      for (const seg of ev.segs ?? []) {
        const u = seg.utf8;
        if (u) parts.push(u);
      }
    }
    return parts.join(' ').replace(/\s+/g, ' ').trim();
  } catch {
    return '';
  }
}

function parseWebVtt(vtt: string): string {
  const lines = vtt.split(/\r?\n/);
  const out: string[] = [];
  const cueLine = /^\d{2}:\d{2}:\d{2}\.\d{3}\s+-->\s+/;
  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;
    if (t === 'WEBVTT') continue;
    if (t.startsWith('NOTE')) continue;
    if (t.startsWith('STYLE') || t.startsWith('REGION')) continue;
    if (/^Kind:\s|^Language:\s/i.test(t)) continue;
    if (cueLine.test(t)) continue;
    if (/^\d+$/.test(t)) continue;
    out.push(t);
  }
  return out.join(' ').replace(/\s+/g, ' ').trim();
}

function webVttTimeToMs(token: string): number {
  const s = token.replace(',', '.').trim();
  const parts = s.split(':');
  let sec = 0;
  if (parts.length === 3) {
    sec = Number(parts[0]) * 3600 + Number(parts[1]) * 60 + Number(parts[2]);
  } else if (parts.length === 2) {
    sec = Number(parts[0]) * 60 + Number(parts[1]);
  } else if (parts.length === 1) {
    sec = Number(parts[0]);
  }
  if (!Number.isFinite(sec)) return 0;
  return Math.round(sec * 1000);
}

function parseWebVttSegments(vtt: string): TranscriptCue[] {
  const lines = vtt.split(/\r?\n/);
  const cues: TranscriptCue[] = [];
  const skipLine = (t: string) =>
    !t ||
    t === 'WEBVTT' ||
    t.startsWith('NOTE') ||
    t.startsWith('STYLE') ||
    t.startsWith('REGION') ||
    /^Kind:\s|^Language:\s/i.test(t) ||
    /^\d+$/.test(t);

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i] ?? '';
    const t = raw.trim();
    if (skipLine(t)) continue;
    const arrow = t.indexOf('-->');
    if (arrow === -1) continue;
    const left = t.slice(0, arrow).trim();
    const afterArrow = t.slice(arrow + 3).trim();
    const endToken = afterArrow.split(/\s+/)[0] ?? '';
    if (!left || !endToken) continue;
    const startMs = webVttTimeToMs(left);
    const endMs = webVttTimeToMs(endToken);
    const textLines: string[] = [];
    for (i++; i < lines.length; i++) {
      const L = (lines[i] ?? '').trim();
      if (!L) break;
      if (skipLine(L)) continue;
      if (L.includes('-->')) {
        i--;
        break;
      }
      textLines.push(L);
    }
    const text = textLines.join(' ').replace(/\s+/g, ' ').trim();
    if (!text) continue;
    cues.push({
      startMs,
      endMs: Math.max(endMs, startMs),
      text,
    });
  }
  return cues;
}

function parseJson3CaptionsSegments(jsonStr: string): TranscriptCue[] {
  try {
    const j = JSON.parse(jsonStr) as {
      events?: Array<{
        segs?: Array<{ utf8?: string }>;
        tStartMs?: number;
        dDurationMs?: number;
      }>;
    };
    const cues: TranscriptCue[] = [];
    for (const ev of j.events ?? []) {
      const parts: string[] = [];
      for (const seg of ev.segs ?? []) {
        const u = seg.utf8;
        if (u) parts.push(u);
      }
      const text = parts.join('').replace(/\s+/g, ' ').trim();
      if (!text) continue;
      const startMs = Math.max(0, Math.round(Number(ev.tStartMs ?? 0)));
      const dur = Math.max(0, Math.round(Number(ev.dDurationMs ?? 0)));
      cues.push({
        startMs,
        endMs: startMs + dur,
        text,
      });
    }
    return cues;
  } catch {
    return [];
  }
}

function parseSrv3OrClassicXmlSegments(xml: string): TranscriptCue[] {
  const cues: TranscriptCue[] = [];
  const srv3p = /<p\s+t="(\d+)"\s+d="(\d+)"[^>]*>([\s\S]*?)<\/p>/g;
  const srv3s = /<s[^>]*>([^<]*)<\/s>/g;
  let m: RegExpExecArray | null;
  while ((m = srv3p.exec(xml)) !== null) {
    const startMs = parseInt(m[1], 10);
    const durMs = parseInt(m[2], 10);
    const inner = m[3];
    let line = '';
    srv3s.lastIndex = 0;
    let s: RegExpExecArray | null;
    while ((s = srv3s.exec(inner)) !== null) {
      line += s[1];
    }
    if (!line) line = inner.replace(/<[^>]+>/g, '');
    const decoded = decodeTranscriptEntities(line).trim();
    if (!decoded) continue;
    cues.push({
      startMs,
      endMs: startMs + Math.max(0, durMs),
      text: decoded,
    });
  }
  if (cues.length > 0) return cues;

  const classic = new RegExp(CLASSIC_TEXT_RE.source, 'g');
  while ((m = classic.exec(xml)) !== null) {
    const startSec = parseFloat(m[1]);
    const durSec = parseFloat(m[2]);
    if (!Number.isFinite(startSec) || !Number.isFinite(durSec)) continue;
    const startMs = Math.round(startSec * 1000);
    const durMs = Math.round(durSec * 1000);
    const decoded = decodeTranscriptEntities(m[3]).trim();
    if (!decoded) continue;
    cues.push({
      startMs,
      endMs: startMs + Math.max(0, durMs),
      text: decoded,
    });
  }
  return cues;
}

export function isProbablyHtmlShell(raw: string): boolean {
  const head = raw.slice(0, 800).toLowerCase();
  if (head.includes('<!doctype') || head.includes('<html')) return true;
  if (head.includes('before you continue') || head.includes('consent.youtube')) return true;
  return false;
}

export function parseCaptionPayload(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';

  if (trimmed.startsWith('{')) {
    const j = parseJson3Captions(trimmed);
    if (j) return j;
  }

  if (trimmed.includes('WEBVTT') || trimmed.includes('-->')) {
    const v = parseWebVtt(trimmed);
    if (v) return v;
  }

  const xml = parseSrv3OrClassicXml(trimmed);
  if (xml.trim()) return xml.trim();

  return '';
}

/** Timed cues when the payload includes timing (same detection order as {@link parseCaptionPayload}). */
export function parseCaptionPayloadSegments(raw: string): TranscriptCue[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];

  if (trimmed.startsWith('{')) {
    const j = parseJson3CaptionsSegments(trimmed);
    if (j.length > 0) return j;
  }

  if (trimmed.includes('WEBVTT') || trimmed.includes('-->')) {
    const v = parseWebVttSegments(trimmed);
    if (v.length > 0) return v;
  }

  const xml = parseSrv3OrClassicXmlSegments(trimmed);
  if (xml.length > 0) return xml;

  return [];
}

export function parseLangCodesFromListXml(xml: string): string[] {
  const codes: string[] = [];
  const re = /lang_code="([^"]+)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    codes.push(m[1]);
  }
  return [...new Set(codes)];
}

function langSortKey(code: string): number {
  if (code === 'en') return 0;
  if (code.startsWith('en')) return 1;
  if (code === 'a.en' || code.startsWith('a.')) return 2;
  return 3;
}

export function sortLangCodes(codes: string[]): string[] {
  return [...codes].sort((a, b) => {
    const d = langSortKey(a) - langSortKey(b);
    if (d !== 0) return d;
    return a.localeCompare(b);
  });
}

export const FALLBACK_LANGS = [
  'en',
  'en-US',
  'en-GB',
  'a.en',
  'es',
  'fr',
  'de',
  'pt',
  'ja',
  'ko',
  'zh-Hans',
  'zh-Hant',
];
