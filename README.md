# Tangle Explore Prototype Foundation

This workspace contains the standalone explore scaffold and data-prep pipeline for graph/visualization mini-prototypes.

## Structure

- `scripts/prepare-explore-data.mjs`: normalizes the raw dump and generates enriched fields (`genre`, `color`, `cover_seed`).
- `tangle-explore/`: standalone React + Vite app shell with routed mini-prototype modules.

## Prepare Data

```bash
cd /Users/alexcruz/Projects/dev/tangle-lab
node scripts/prepare-explore-data.mjs \
  --input /Users/alexcruz/Desktop/delete/db_dump_2026-02-22T14-35-09-892006Z.json \
  --output /Users/alexcruz/Projects/dev/tangle-lab/tangle-explore/public/db_explore.json
```

You can also set `TANGLE_DB_DUMP` and omit `--input`.

## Run App

```bash
cd /Users/alexcruz/Projects/dev/tangle-lab/tangle-explore
npm install
npm run dev
```

The app routes to `/explore/:ideaId` and includes all planned idea modules as wired stubs.
