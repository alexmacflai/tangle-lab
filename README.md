# tangle-lab

This repository contains Tangle exploratory prototypes and supporting data-prep scripts.

The repo is organized as a small npm workspace. Each prototype can have its own app, dependencies, docs, and run command. Shared code lives in `packages/shared` only when more than one prototype actually needs it.

## Structure

- `scripts/prepare-explore-data.mjs`: normalizes the raw dump and generates enriched fields (`genre`, `color`, `cover_seed`).
- `prototypes/tangle-explore/`: standalone React + Vite app shell with routed mini-prototype modules.
- `prototypes/<prototype-name>/`: home for future standalone prototypes.
- `packages/shared/`: small shared package for stable helpers, design tokens, and utilities reused by more than one prototype.
- `AGENTS.md`: working rules for AI agents and future prototype setup.

Every prototype should have a `docs/spec.md` file describing its goal, audience, core flow, design references, known shortcuts, and open questions.

## Prepare Data

```bash
cd /Users/alexcruz/Projects/dev/tangle-lab
node scripts/prepare-explore-data.mjs \
  --input /Users/alexcruz/Projects/dev/tangle-lab/db_dump_2026-03-20T18-15-54-502152Z.json \
  --output /Users/alexcruz/Projects/dev/tangle-lab/prototypes/tangle-explore/public/db_explore.json
```

If you omit `--input`, the script will use the repo-root dump file first, or `TANGLE_DB_DUMP` when that env var is set.

## Run App

```bash
cd /Users/alexcruz/Projects/dev/tangle-lab
npm install
npm run dev:tangle-explore
```

The app routes to `/explore/:ideaId` and includes all planned idea modules as wired stubs.

## Deploy To GitHub Pages

Pushes to `main` can deploy the Vite app in `prototypes/tangle-explore/` to GitHub Pages via Actions.

Before the first deploy, enable Pages in GitHub:

1. Open the repository settings.
2. Go to `Pages`.
3. Set `Build and deployment` to `GitHub Actions`.

The deployed site will be served from the repository Pages URL and use hash-based routes for deep links.
