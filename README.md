# My UPSC Prep

A personal, **offline-first** preparation tracker for **UPSC CSE 2027** with **Geography Optional**.
No login, no backend, no cloud — everything lives in your browser's local storage, with one-click
JSON backup/restore.

![stack](https://img.shields.io/badge/stack-React%2018%20%2B%20Vite%20%2B%20TS-blue) ![offline](https://img.shields.io/badge/offline-first-teal) ![free](https://img.shields.io/badge/100%25-free-no%20premium-green)

## Modules

| Module | What it does |
| --- | --- |
| **Dashboard** | Tasks due, syllabus %, revision queue, test avg, streak, 7-day hours, paper progress, trends |
| **Operational Syllabus** | Paper → Subject → Chapter → Topic → Subtopic tree (9 papers, 37 subjects, 88 chapters, 257 topics, **1000 subtopics**) with per-item status, short notes, revision logging and task planning |
| **Daily Planner** | Time blocks, quick-add + templates, overdue carry-forward, week strip, syllabus-linked tasks |
| **Calendar** | Month grid of tasks, events, revision dues and tests |
| **Geography Lecture Tracker** | Series-level tracking: lectures watched/total, PDF followed, short notes made, revised, PYQs attempted |
| **Revision R1–R5** | Spaced repetition (3d → 7d → 21d → 45d × confidence 0.5/1/1.5), overdue/today/upcoming queue, full log |
| **PYQ Tracker** | Previous-year questions tagged to syllabus topics with attempt/master states |
| **Test Tracker & Analytics** | Prelims mocks (UPSC negative marking) + Mains tests with score/accuracy/attempt-rate trends |
| **Answer Writing** | Daily answer log with marks, word counts and strength/improvement tags |
| **Current Affairs** | Daily capture with subject categories, Prelims/Mains relevance and revision flags |
| **Study Timer** | Pomodoro + stopwatch, sessions feed Study Hours |
| **Study Hours** | Consistency heatmap, streaks, weekly trend, daily habits |
| **Prep Analytics** | Countdown, completion velocity, weakest areas, revision health, test performance |
| **Settings** | Theme, daily target, backup/restore, reset tools |

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
```

Production build + preview:

```bash
npm run build
npm run preview    # serves dist/ at http://localhost:4173
```

Tests (no browser needed):

```bash
npm test           # logic tests (data layer, revision engine) + jsdom smoke test of all 14 routes
```

Install it as an app from Chrome/Edge ("Install app") or Android ("Add to Home screen") — the
service worker makes it fully offline afterwards.

## Data & privacy

- All data persists in `localStorage` (`mup.db.v1`), debounced writes, migration-safe.
- **Backup**: Settings → *Download backup* produces a portable JSON with everything.
- **Restore**: Settings → *Restore from file* replaces local data with the backup.
- Nothing ever leaves the device — no analytics, no accounts, no network calls.

## Syllabus data pipeline

The operational syllabus seed is generated from the downloaded reference assets
(`reference/` — untouched) plus an authored Geography Optional expansion:

```bash
npm run generate:syllabus   # regenerates src/data/syllabus.json
```

- `scripts/extract-reference-syllabus.mjs` — reads the reference bundles, extracts the
  Prelims (GS1 + CSAT) and Mains (Essay, GS1–GS4) hierarchies with weightages, and merges the
  authored Geography Optional operational syllabus (`scripts/data/geographyOptional.mjs`).
- Re-runnable and deterministic; the output is committed at `src/data/syllabus.json`.

## Architecture

```
src/
  data/syllabus.ts        # syllabus index: id maps, hierarchy paths, lookups
  lib/                    # date utils, R1–R5 revision engine, ids
  store/db.ts             # localStorage persistence, migration, backup/restore
  store/store.tsx         # React context store — all mutations
  store/selectors.ts      # derived analytics (tree stats, queues, trends)
  ui/                     # shell, router, toasts, charts (pure SVG), components
  pages/                  # one module per page (14 pages)
scripts/
  extract-reference-syllabus.mjs
  data/geographyOptional.mjs
  logic-test.mjs / smoke-test.mjs / test-entry.ts
public/                   # PWA: manifest, icons, service worker
reference/                # original downloaded assets (read-only, never modified)
```

Design system: hand-rolled CSS (dark/light themes via CSS variables), zero UI dependencies —
fast, dependency-light, fully themeable.
