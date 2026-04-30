# scribverse

Free public utility: paste a supported video link (YouTube, TikTok, Instagram, X, Facebook), get a transcript as Markdown (copy or download). Non-YouTube sources need **`SUPADATA_API_KEY`** (see `.env.example`).

**Live:** [scribverse.xyz](https://scribverse.xyz)

## Tech stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14 (App Router), TypeScript |
| Styling | Tailwind CSS, shadcn/ui (trimmed) |
| Hosting | Vercel |

## Local development

```bash
npm install
cp .env.example .env.local
# Set YOUTUBE_API_KEY and optionally NEXT_PUBLIC_SITE_URL (production: https://scribverse.xyz)

npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

```bash
npm run dev      # Development server
npm run build    # Production build
npm run lint     # ESLint
npm run e2e      # Playwright tests
```

## Environment variables

See `.env.example`. Required for video metadata (title, description, etc.): **`YOUTUBE_API_KEY`**. Optional: rate limit tuning, `NEXT_PUBLIC_SITE_URL` (sitemap and metadata).

**Captions:** `POST /api/transcribe` tries, in order: `youtube-transcript`, server timedtext (`Referer`/`Origin`), then optional **`SUPADATA_API_KEY`** ([Supadata](https://supadata.ai/documentation/get-transcript)) with **`mode=native`** only (existing YouTube captions, not AI audio transcription). On many hosts, YouTube blocks the first two; Supadata is the reliable production path. The homepage still uses `GET /api/youtube-captions` + browser fallbacks when the POST transcript is empty. CSP `connect-src` includes YouTube for browser fallback — see `next.config.mjs`.

## Project layout

```
src/
  app/           # Routes: /, api/transcribe, sitemap, robots
  components/    # TranscriptTool, layout, theme, minimal ui/
  lib/           # youtube-url, youtube-transcribe, youtube-caption-*, transcript-markdown, transcribe-rate-limit, utils
  types/         # youtube-transcribe types
```

Contributor and agent entry point: **AGENTS.md**.

## Contributing

See **CONTRIBUTING.md**. Security reports: **SECURITY.md** (no public issues for vulnerabilities).

## License

MIT. See **LICENSE**.

## Author

Built by [Kristi Kumrija](https://github.com/coppermare)
