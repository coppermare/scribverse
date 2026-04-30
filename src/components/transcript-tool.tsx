'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUp, Check, Copy, Download, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { fetchYoutubeCaptionsFromBrowser } from '@/lib/youtube-caption-client';
import { buildTranscriptMarkdown } from '@/lib/transcript-markdown';
import {
  type SupportedPlatform,
  detectPlatform,
  extractFirstSupportedVideoUrl,
  normalizeVideoUrlInput,
  SUPPORTED_PLATFORMS_DISPLAY,
} from '@/lib/platform-url';
import { extractFirstYoutubeUrlFromText, extractYouTubeId } from '@/lib/youtube-url';
import { formatTimestampMs } from '@/lib/transcript-time';
import type { TranscriptCue } from '@/types/transcript-cue';
import type { YoutubeTranscribeData } from '@/types/youtube-transcribe';

export type TranscribeApiResponse = {
  videoId: string;
  title: string;
  slug: string;
  coverUrl: string;
  durationMinutes: number;
  platform: string;
  mediaType: string;
  description: string;
  transcript: string;
  transcriptCues?: TranscriptCue[];
  url: string;
  channelTitle: string;
};

type TranscribeJob =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | { status: 'done'; result: TranscribeApiResponse };

function formatDuration(minutes: number): string | null {
  if (!minutes) return null;
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m === 0 ? `${h}h` : `${h}h ${m}m`;
  }
  return `${minutes} min`;
}

function toExportData(r: TranscribeApiResponse): YoutubeTranscribeData {
  return {
    videoId: r.videoId,
    title: r.title,
    slug: r.slug,
    coverUrl: r.coverUrl,
    durationMinutes: r.durationMinutes,
    platform: r.platform as SupportedPlatform,
    mediaType: 'video',
    description: r.description,
    transcript: r.transcript,
    ...(r.transcriptCues?.length ? { transcriptCues: r.transcriptCues } : {}),
    url: r.url,
    channelTitle: r.channelTitle,
  };
}

function markdownExportFilename(r: TranscribeApiResponse): string {
  const safe = (r.slug || r.videoId).replace(/[^a-z0-9-]+/gi, '-');
  return `${safe || 'transcript'}.md`;
}

const LOADING_CUE_WIDTHS = ['w-[94%]', 'w-[88%]', 'w-[72%]', 'w-[91%]', 'w-[65%]', 'w-[83%]', 'w-[79%]'];

/** Inline squiggle + CSS in globals (scribverse-scribble-loader*). */
function ScribbleLoaderIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn('scribverse-scribble-loader shrink-0 text-primary', className)}
      viewBox="0 0 52 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        className="scribverse-scribble-loader__path"
        d="M2 12c6-10 14-12 22-6s12 12 20 8 8-10 14-10c4 0 7 4 10 4"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TranscribeLoadingState({ url }: { url: string }) {
  return (
    <div
      className="mx-auto w-full max-w-2xl rounded-2xl bg-card p-3 text-left shadow-sm sm:p-4"
      role="status"
      aria-live="polite"
      aria-busy="true"
      data-testid="transcribe-loading"
    >
      <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start sm:gap-4">
        <Skeleton className="aspect-video w-40 shrink-0 rounded-lg sm:w-44" />
        <div className="flex w-full min-w-0 flex-col items-center gap-2 sm:items-start">
          <Skeleton className="h-5 w-full max-w-md" />
          <Skeleton className="h-4 w-48 max-w-[70%]" />
        </div>
      </div>

      <section className="mt-4 flex max-h-[min(60vh,28rem)] w-full min-h-0 flex-col overflow-hidden rounded-xl border border-neutral-200/90 bg-white dark:border-border dark:bg-background">
        <div className="flex min-w-0 shrink-0 items-center gap-2 border-b border-neutral-200/80 px-3 py-2.5 dark:border-border sm:gap-3 sm:px-4">
          <ScribbleLoaderIcon className="mt-0.5 h-4 w-11" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <p className="text-sm font-medium text-neutral-900 dark:text-foreground">
              Fetching transcript…
            </p>
            <p className="text-xs text-muted-foreground">
              Pulling transcript and metadata. Longer videos may take up to a minute.
            </p>
          </div>
        </div>
        <div
          className="scrollbar-track-transparent min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-3 sm:px-4 sm:py-4"
          aria-hidden
        >
          {LOADING_CUE_WIDTHS.map((w, i) => (
            <div
              key={i}
              className="grid grid-cols-[minmax(3.25rem,auto)_1fr] items-center gap-x-3 sm:grid-cols-[minmax(3.5rem,auto)_1fr] sm:gap-x-4"
            >
              <div
                className="scribverse-scribble-cue h-3.5 w-9 shrink-0 rounded-md"
                style={{ animationDelay: `${i * 90}ms` }}
              />
              <div
                className={cn('scribverse-scribble-cue h-3.5 rounded-md', w)}
                style={{ animationDelay: `${i * 90 + 50}ms` }}
              />
            </div>
          ))}
        </div>
      </section>

      {url ? (
        <p
          className="mt-3 truncate text-center text-xs text-muted-foreground sm:text-left"
          title={url}
        >
          {url}
        </p>
      ) : null}
    </div>
  );
}

function TranscriptResultBlock({
  result,
  primaryE2e,
  onClose,
  clientCaptionLoading,
}: {
  result: TranscribeApiResponse;
  /** Stable test ids for Playwright. */
  primaryE2e?: boolean;
  onClose: () => void;
  /** Server returned no transcript; captions are being fetched in the browser. */
  clientCaptionLoading?: boolean;
}) {
  const [coverFailed, setCoverFailed] = useState(false);
  const [copied, setCopied] = useState(false);
  const copiedResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copiedResetRef.current) clearTimeout(copiedResetRef.current);
    };
  }, []);

  function copyMarkdown() {
    const md = buildTranscriptMarkdown(toExportData(result), new Date().toISOString());
    void (async () => {
      try {
        await navigator.clipboard.writeText(md);
        if (copiedResetRef.current) clearTimeout(copiedResetRef.current);
        setCopied(true);
        copiedResetRef.current = setTimeout(() => {
          setCopied(false);
          copiedResetRef.current = null;
        }, 2000);
        toast.success('Copied full Markdown to clipboard.');
      } catch {
        toast.error('Clipboard permission denied.');
      }
    })();
  }

  function downloadMarkdown() {
    const md = buildTranscriptMarkdown(toExportData(result), new Date().toISOString());
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = markdownExportFilename(result);
    a.click();
    URL.revokeObjectURL(objectUrl);
    toast.success('Download started.');
  }

  const exportFileName = markdownExportFilename(result);
  const showCover = Boolean(result.coverUrl && !coverFailed);
  const cues = result.transcriptCues;
  const showCueList = Boolean(cues && cues.length > 0);
  const plainTranscript = (result.transcript || '').trim();

  return (
    <div className="relative flex w-full flex-col gap-3 rounded-2xl bg-card p-3 text-center shadow-sm sm:gap-4 sm:p-4">
      <Button
        type="button"
        variant="ghost"
        size="icon-lg"
        className="absolute right-3 top-3 z-10 text-muted-foreground transition-[color,background-color,box-shadow] duration-150 hover:bg-muted hover:text-foreground active:bg-muted/80 dark:hover:bg-white/10 dark:active:bg-white/[0.14] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--card)] sm:right-4 sm:top-4"
        onClick={onClose}
        aria-label="Close transcript"
        data-testid="transcribe-close"
      >
        <X className="size-4" aria-hidden />
      </Button>
      <div
        className={
          showCover
            ? 'flex w-full flex-col items-center gap-3 sm:flex-row sm:items-start sm:gap-4 sm:text-left'
            : 'flex w-full flex-col items-center gap-2'
        }
      >
        {showCover ? (
          <div className="shrink-0 overflow-hidden rounded-lg bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={result.coverUrl}
              alt=""
              className="aspect-video w-40 object-cover sm:w-44"
              onError={() => setCoverFailed(true)}
            />
          </div>
        ) : null}
        <div
          className={cn(
            'min-w-0 w-full space-y-1.5 pr-14',
            showCover ? 'sm:flex-1' : null,
          )}
        >
          <a
            href={result.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-balance text-center text-xs font-medium leading-snug tracking-tight text-foreground underline-offset-4 hover:underline sm:text-left sm:text-sm"
            data-testid={primaryE2e ? 'transcribe-result-title' : undefined}
          >
            {result.title}
          </a>
          <p
            className="min-w-0 truncate text-center text-xs text-muted-foreground sm:text-left sm:text-sm"
            title={
              result.channelTitle
                ? `${result.channelTitle} · ${formatDuration(result.durationMinutes) ?? 'Duration unknown'}`
                : (formatDuration(result.durationMinutes) ?? 'Duration unknown')
            }
          >
            {result.channelTitle ? (
              <span className="font-medium text-foreground/85">{result.channelTitle}</span>
            ) : null}
            {result.channelTitle ? (
              <span className="select-none text-border" aria-hidden>
                {' '}
                ·{' '}
              </span>
            ) : null}
            <span>{formatDuration(result.durationMinutes) ?? 'Duration unknown'}</span>
          </p>
        </div>
      </div>

      <section
        className="flex max-h-[min(60vh,28rem)] w-full min-h-0 flex-col overflow-hidden rounded-xl border border-neutral-200/90 bg-white text-neutral-900 dark:border-border dark:bg-background dark:text-foreground"
        aria-label="Transcript"
      >
        <div className="flex min-w-0 shrink-0 items-center gap-2 border-b border-neutral-200/80 px-3 py-2 dark:border-border sm:gap-3 sm:px-4">
          <p
            className="min-w-0 flex-1 truncate text-left text-xs text-muted-foreground sm:text-sm"
            title={exportFileName}
            data-testid={primaryE2e ? 'transcribe-filename' : undefined}
          >
            {exportFileName}
          </p>
          <div className="flex shrink-0 items-center gap-1">
            <Button
              type="button"
              variant="secondary"
              size="icon-sm"
              aria-label={
                copied ? 'Copied to clipboard' : 'Copy Markdown to clipboard'
              }
              title={copied ? 'Copied' : 'Copy Markdown'}
              onClick={copyMarkdown}
              data-testid={primaryE2e ? 'transcribe-copy' : undefined}
            >
              {copied ? (
                <Check className="size-3.5" aria-hidden strokeWidth={2.5} />
              ) : (
                <Copy className="size-3.5" aria-hidden />
              )}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="icon-sm"
              aria-label={`Download ${exportFileName}`}
              title="Download Markdown"
              onClick={downloadMarkdown}
              data-testid={primaryE2e ? 'transcribe-download' : undefined}
            >
              <Download className="size-3.5" aria-hidden />
            </Button>
          </div>
        </div>
        <div className="scrollbar-track-transparent min-h-0 flex-1 overflow-y-auto px-3 py-3 text-left sm:px-4 sm:py-4">
          {clientCaptionLoading ? (
            <div
              className="flex items-start gap-3 text-sm leading-6 text-neutral-900 dark:text-foreground"
              role="status"
              aria-live="polite"
              aria-busy="true"
            >
              <ScribbleLoaderIcon className="mt-0.5 h-4 w-11 shrink-0" />
              <div>
                <p className="font-medium">Loading captions in your browser…</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Using a direct request to YouTube timedtext (your session).
                </p>
              </div>
            </div>
          ) : showCueList && cues ? (
            <div className="flex flex-col gap-0.5" role="list" aria-label="Transcript lines">
              {cues.map((cue, i) => (
                <div
                  key={`${cue.startMs}-${i}`}
                  role="listitem"
                  className="grid grid-cols-[minmax(3.25rem,auto)_1fr] items-baseline gap-x-3 gap-y-0 sm:grid-cols-[minmax(3.5rem,auto)_1fr] sm:gap-x-4"
                >
                  <span className="select-none font-mono text-xs tabular-nums text-muted-foreground sm:text-sm">
                    {formatTimestampMs(cue.startMs)}
                  </span>
                  <p className="min-w-0 text-sm leading-6 text-neutral-900 dark:text-foreground">
                    {cue.text}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <pre className="whitespace-pre-wrap break-words text-sm leading-7 text-neutral-900 dark:text-foreground">
              {plainTranscript ||
                'No transcript text was returned. If this video has captions, try again in a moment or disable extensions that block network requests. The export file can still include metadata and the video description.'}
            </pre>
          )}
        </div>
      </section>
    </div>
  );
}

export default function TranscriptTool() {
  const [input, setInput] = useState('');
  const [job, setJob] = useState<TranscribeJob>({ status: 'idle' });
  const [clientTranscript, setClientTranscript] = useState('');
  const [clientCaptionStatus, setClientCaptionStatus] = useState<
    'idle' | 'loading' | 'done' | 'failed'
  >('idle');
  const transcribeFetchGen = useRef(0);
  const transcribeAbortRef = useRef<AbortController | null>(null);

  const hasResult = job.status === 'done';

  const displayResult: TranscribeApiResponse | null = useMemo(() => {
    if (job.status !== 'done') return null;
    const t = (job.result.transcript || '').trim();
    const c = clientTranscript.trim();
    return {
      ...job.result,
      transcript: t || c || job.result.transcript,
    };
  }, [job, clientTranscript]);

  useEffect(() => {
    if (job.status !== 'done') {
      setClientTranscript('');
      setClientCaptionStatus('idle');
      return;
    }
    if (job.result.platform !== 'youtube') {
      setClientTranscript('');
      setClientCaptionStatus('idle');
      return;
    }
    const { videoId, transcript, title } = job.result;
    if ((transcript || '').trim()) {
      setClientTranscript('');
      setClientCaptionStatus('idle');
      return;
    }

    const ac = new AbortController();
    setClientCaptionStatus('loading');
    setClientTranscript('');

    void fetchYoutubeCaptionsFromBrowser(videoId, ac.signal)
      .then((text) => {
        if (ac.signal.aborted) return;
        const trimmed = text.trim();
        if (trimmed) {
          setClientTranscript(trimmed);
          setClientCaptionStatus('done');
          return;
        }
        setClientCaptionStatus('failed');
        toast.message('No captions found', {
          description: `“${title.slice(0, 60)}${title.length > 60 ? '…' : ''}”. Export can still include metadata.`,
        });
      })
      .catch(() => {
        if (ac.signal.aborted) return;
        setClientCaptionStatus('failed');
        toast.message('No captions found', {
          description: `“${title.slice(0, 60)}${title.length > 60 ? '…' : ''}”. Export can still include metadata.`,
        });
      });

    return () => ac.abort();
  }, [job]);

  function resolveUrlForRequest(raw: string): string | null {
    const t = normalizeVideoUrlInput(raw);
    if (!t) return null;
    if (detectPlatform(t)) return t;
    const fromText =
      extractFirstSupportedVideoUrl(t) ?? extractFirstYoutubeUrlFromText(t);
    if (fromText) return fromText;
    if (extractYouTubeId(t)) return t;
    return null;
  }

  function handlePasteUrls(e: React.ClipboardEvent<HTMLInputElement>) {
    const text = e.clipboardData?.getData('text/plain') ?? '';
    const found =
      extractFirstSupportedVideoUrl(text) ?? extractFirstYoutubeUrlFromText(text);
    if (!found) return;
    if (text.trim() === found.trim()) return;
    e.preventDefault();
    setInput(found);
    const links = text.match(/https?:\/\/[^\s]+/gi) ?? [];
    const videoLinks = links.filter((u) => detectPlatform(u.replace(/[.,;:!?)]+$/, '')));
    if (videoLinks.length > 1) {
      toast.message('One video at a time', {
        description: 'Using the first supported link from your paste.',
      });
    }
  }

  async function runTranscribe() {
    const t = input.trim();
    if (!t) {
      setJob({
        status: 'error',
        error: `Paste a video link from ${SUPPORTED_PLATFORMS_DISPLAY}.`,
      });
      return;
    }
    const url = resolveUrlForRequest(t);
    if (!url) {
      setJob({
        status: 'error',
        error: `Use a public video URL from ${SUPPORTED_PLATFORMS_DISPLAY}.`,
      });
      return;
    }
    if (url !== t) {
      setInput(url);
    }

    transcribeAbortRef.current?.abort();
    transcribeAbortRef.current = new AbortController();
    const { signal } = transcribeAbortRef.current;
    const gen = ++transcribeFetchGen.current;

    setJob({ status: 'loading' });

    try {
      const res = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
        signal,
      });

      const rawText = await res.text();

      if (gen !== transcribeFetchGen.current) return;

      let data: { error?: string } & Partial<TranscribeApiResponse>;
      try {
        data = JSON.parse(rawText) as typeof data;
      } catch {
        if (gen !== transcribeFetchGen.current) return;
        setJob({
          status: 'error',
          error: 'Could not read the server response. Try again.',
        });
        return;
      }

      if (gen !== transcribeFetchGen.current) return;

      if (!res.ok) {
        if (res.status === 429) {
          const retryAfter = res.headers.get('Retry-After');
          const seconds = retryAfter ? parseInt(retryAfter, 10) : null;
          let message = "You've hit the hourly request limit.";
          if (seconds && !isNaN(seconds) && seconds > 0) {
            const m = Math.ceil(seconds / 60);
            if (m >= 60) {
              const h = Math.ceil(m / 60);
              message += ` Try again in ${h}h.`;
            } else {
              message += ` Try again in ${m} min.`;
            }
          }
          setJob({ status: 'error', error: message });
          return;
        }
        setJob({
          status: 'error',
          error: data.error ?? 'Something went wrong.',
        });
        return;
      }

      if (!data.videoId || !data.title) {
        setJob({ status: 'error', error: 'Unexpected response from server.' });
        return;
      }

      const result = data as TranscribeApiResponse;
      setJob({ status: 'done', result });
    } catch (e: unknown) {
      const aborted =
        (e instanceof DOMException && e.name === 'AbortError') ||
        (e instanceof Error && e.name === 'AbortError');
      if (aborted) return;
      if (gen !== transcribeFetchGen.current) return;
      setJob({ status: 'error', error: 'Network error. Try again.' });
    }
  }

  return (
    <div
      className={cn(
        'mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 text-center lg:px-8',
        hasResult
          ? 'justify-start gap-2 pt-4 pb-8 lg:pt-5 lg:pb-10'
          : 'justify-center gap-5 py-10 lg:py-14 -translate-y-3 sm:-translate-y-4',
      )}
    >
      {!hasResult ? (
        <h1 className="mx-auto max-w-2xl text-balance text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Paste a video link, get Markdown.
        </h1>
      ) : null}

      <div className="mx-auto w-full max-w-2xl space-y-4">
        <form
          noValidate
          aria-busy={job.status === 'loading'}
          onSubmit={(e) => {
            e.preventDefault();
            void runTranscribe();
          }}
          className="w-full shrink-0"
        >
          <div className="flex w-full items-center gap-1 rounded-full bg-card p-1.5 pl-3 text-left shadow-sm sm:gap-1.5 sm:pl-4">
            <label htmlFor="transcribe-url-input" className="sr-only">
              Video URL to transcribe
            </label>
            <input
              id="transcribe-url-input"
              name="url"
              type="url"
              inputMode="url"
              autoComplete="off"
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                if (job.status === 'error') setJob({ status: 'idle' });
              }}
              onPaste={handlePasteUrls}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (job.status === 'loading') return;
                  void runTranscribe();
                }
              }}
              placeholder="Paste YouTube, TikTok, Instagram, X, or Facebook…"
              disabled={job.status === 'loading'}
              className="min-h-9 min-w-0 flex-1 rounded-full border-0 bg-transparent px-1 py-2 text-base text-foreground shadow-none outline-none ring-0 ring-offset-0 placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0 disabled:opacity-50 sm:text-sm"
              aria-label="Video URL"
              data-testid="transcribe-url"
            />
            <Button
              type="submit"
              disabled={job.status === 'loading'}
              size="icon"
              className="size-9 shrink-0 rounded-full"
              aria-label={
                job.status === 'loading'
                  ? 'Transcribing, please wait'
                  : 'Run transcription'
              }
              data-testid="transcribe-submit"
            >
              {job.status === 'loading' ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <ArrowUp className="size-4" aria-hidden />
              )}
            </Button>
          </div>
        </form>

        {job.status === 'error' ? (
          <p
            className="text-sm text-destructive"
            role="status"
            aria-live="polite"
            data-testid="transcribe-error"
          >
            {job.error}
          </p>
        ) : null}
      </div>

      {job.status === 'loading' ? <TranscribeLoadingState url={input.trim()} /> : null}

      {job.status === 'done' && displayResult ? (
        <div className="w-full max-w-2xl overflow-x-auto pt-1 pb-4 [scrollbar-gutter:stable] lg:pt-2">
          <TranscriptResultBlock
            result={displayResult}
            primaryE2e
            clientCaptionLoading={
              job.result.platform === 'youtube' &&
              !(job.result.transcript || '').trim() &&
              clientCaptionStatus === 'loading'
            }
            onClose={() => {
              transcribeAbortRef.current?.abort();
              transcribeFetchGen.current += 1;
              setJob({ status: 'idle' });
              setClientTranscript('');
              setClientCaptionStatus('idle');
              setInput('');
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
