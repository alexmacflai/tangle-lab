# tangle-lab

This repository contains the Tangle Explore prototype foundation and supporting data-prep pipeline.

This workspace contains the standalone explore scaffold and data-prep pipeline for graph/visualization mini-prototypes.

## Structure

- `scripts/prepare-explore-data.mjs`: normalizes the raw dump and generates enriched fields (`genre`, `color`, `cover_seed`).
- `tangle-explore/`: standalone React + Vite app shell with routed mini-prototype modules.

## Prepare Data

```bash
cd /Users/alexcruz/Projects/dev/tangle-lab
node scripts/prepare-explore-data.mjs \
  --input /Users/alexcruz/Projects/dev/tangle-lab/db_dump_2026-03-20T18-15-54-502152Z.json \
  --output /Users/alexcruz/Projects/dev/tangle-lab/tangle-explore/public/db_explore.json
```

If you omit `--input`, the script will use the repo-root dump file first, or `TANGLE_DB_DUMP` when that env var is set.

## Run App

```bash
cd /Users/alexcruz/Projects/dev/tangle-lab/tangle-explore
npm install
npm run dev
```

The app routes to `/explore/:ideaId` and includes all planned idea modules as wired stubs.

## Deploy To GitHub Pages

Pushes to `main` can deploy the Vite app in `tangle-explore/` to GitHub Pages via Actions.

Before the first deploy, enable Pages in GitHub:

1. Open the repository settings.
2. Go to `Pages`.
3. Set `Build and deployment` to `GitHub Actions`.

The deployed site will be served from the repository Pages URL and use hash-based routes for deep links.
