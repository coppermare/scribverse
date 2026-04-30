# Contributing

Thanks for helping improve scribverse.

1. Read **`AGENTS.md`** before you change code. It defines scope and boundaries (no auth, no DB for transcripts, no generative AI without maintainer approval).
2. Open an **issue** first for non trivial changes, or a **PR** with a clear description for small fixes.
3. Run **`npm run lint`**, **`npx tsc --noEmit`**, and **`npm run build`** locally. CI runs lint and typecheck.
4. Do not commit **`.env.local`** or real **API keys**. Use **`.env.example`** as the template only.

See **`SECURITY.md`** for vulnerability reports.
