# scribverse: Agent Instructions

> This is the single entry point for ALL AI agents working on this project.
> Read this file first, every session, no exceptions.

---

## What This Project Is

**scribverse** is a **free public utility** to turn video links (starting with YouTube) into transcripts: paste a URL, get text, then **copy** or **download** a single structured Markdown file.

**Public URL:** [scribverse.xyz](https://scribverse.xyz)

---

## How to Work on This Project

1. Use **GitHub issues** (or maintainer-agreed specs elsewhere) to track planned work and scope.
2. Build changes in a focused branch or PR.
3. Prefer **one PR per logical change**; pause for review before stacking unrelated follow-ups.

---

## Tech Stack

- **Framework**: Next.js 14 (App Router) with TypeScript
- **Persistence**: None in app code for the transcript flow (session style results only)
- **Styling**: Tailwind CSS v3 + shadcn/ui (Radix primitives)
- **Hosting**: Vercel

## Project Structure

```
src/
  app/              # Pages and API routes (App Router)
  components/       # React components
    ui/             # shadcn/ui primitives (trimmed set)
  lib/              # Utilities (transcribe, markdown, rate limit)
  types/            # TypeScript types
extension/          # Chrome MV3 extension (popup); build → extension/dist
AGENTS.md           # This file (agent entry point)
CLAUDE.md           # Points here (for Claude Code compatibility)
```

## Pages

| Route | Purpose |
|-------|---------|
| `/` | Transcript tool: paste URL, copy and download Markdown |

## Coding Conventions

- Server components by default. Use `"use client"` only when interactivity is required.
- Use shadcn/ui components from `components/ui/`. Do not install new UI libraries without maintainer agreement (issue or PR).
- API routes in `src/app/api/`. Use route handlers (not pages API).
- **Public POST** is allowed for `POST /api/transcribe` with validation and rate limits.
- **Public GET** is allowed for `GET /api/youtube-captions?videoId=` (same rate limit bucket; server proxies YouTube timedtext with proper Referer).

## Running the App

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # Production build
npm run build:extension     # MV3 extension → extension/dist (store manifest; scribverse.xyz API)
npm run build:extension:dev # Extension dev build (localhost API + permission)
npm run pack:extension      # Store zip → extension/scribverse-extension-store.zip
npm run lint       # ESLint
npm run e2e        # Playwright
```

## Environment Variables

See `.env.example`. Never commit `.env.local` or any file containing real API keys. Optional **`SUPADATA_API_KEY`** enables native-caption fetch via Supadata when YouTube blocks serverless timedtext (see README).

## Do NOT

- Add user authentication or account features
- Add **generative AI** features (summaries, chat on transcripts) unless the maintainer explicitly approves
- Add media player functionality
- Add save/library/bookmarking features
- Add comments or social interactions
- Add dependencies without maintainer agreement (issue or PR)
- Create files that aren't directly needed for the current task
- Over-engineer or add abstractions for hypothetical future needs

---

*Last updated: 2026-03-29*
