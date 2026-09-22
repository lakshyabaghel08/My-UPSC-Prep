# PREPTRACK

A personal preparation tracker for **UPSC CSE 2027** with **Geography Optional**.

Works offline first — data is cached in your browser with one-click JSON backup/restore — and
syncs privately through **Supabase + Row Level Security** when you sign in, so the same
preparation follows you across devices and stays visible only to you.

![stack](https://img.shields.io/badge/stack-React%2018%20%2B%20Vite%20%2B%20TS-blue) ![offline](https://img.shields.io/badge/offline-first-teal) ![free](https://img.shields.io/badge/100%25-free-no%20premium-green)

## Modules

| Module | What it does |
| --- | --- |
| **Dashboard** | Action-first command centre with today's plan, Geography Optional position, study graphs and analytics |
| **Operational Syllabus** | Paper → Subject → Chapter → Topic → Subtopic tree (9 papers, 42 subjects, 103 chapters, 287 topics, **1085 subtopics**) with cascading completion, short notes, revision logging and task planning |
| **Daily Planner** | Time blocks, multiline quick-add + templates, overdue carry-forward, week strip, syllabus-linked tasks |
| **Calendar** | Month grid of tasks, events, revision dues and tests |
| **Geography Lecture Tracker** | Inclusive lecture ranges with expandable one-click completion and preserved series progress |
| **Revision R1–R5** | Spaced repetition (3d → 7d → 21d → 45d × confidence 0.5/1/1.5), overdue/today/upcoming queue, full log |
| **Test Tracker & Analytics** | Prelims mocks (UPSC negative marking) + Mains tests with score/accuracy/attempt-rate trends |
| **Answer Writing** | Daily answer log with marks, word counts and strength/improvement tags |
| **Current Affairs** | Daily capture with subject categories, Prelims/Mains relevance and revision flags |
| **Focus Workspace** | Flip Clock Pomodoro + stopwatch, atmospheric themes, breaks, soundscapes, mindfulness bell, distraction-free fullscreen, manual study logging and mini player; sessions feed Study Hours |
| **Study Hours** | Focus-session consistency heatmap, streaks and weekly trend |
| **Prep Analytics** | Official 2027 countdown, completion velocity, weakest areas, revision health, test performance |
| **Settings** | Theme, daily target, backup/restore, reset and full wipe (local + cloud) |

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

The application day rolls over at **4:00 AM local time** across planning, focus totals, streaks and analytics.

Tests (no browser needed):

```bash
npm test           # logic tests (data layer, revision engine) + jsdom smoke test of all 14 routes
node scripts/auth-gate-test.mjs   # build first — asserts the auth gate hides data pre-sign-in
node scripts/verify-migration.mjs # embedded Postgres: applies the SQL migration, 27 RLS/schema checks
```

Live cloud suite (36 checks: auth incl. remember-me session semantics, CRUD, RLS isolation
between two real users, bulk migration):

```bash
node scripts/e2e-cloud-test.mjs    # or just run it via Actions → "Supabase operations" → e2e-tests
```

Install it as an app from Chrome/Edge ("Install app") or Android ("Add to Home screen") — the
service worker makes it fully offline afterwards.

## Cloud sync (optional, private)

Built on **Supabase** (Postgres + Auth + Row Level Security). Behavior:

- **No env config?** The app is a fully functional local-mode build — identical to always. No
  Supabase code paths activate, no network calls are made.
- **Sign-in gate** — private data is never rendered before authentication. A "Continue on this
  device" escape hatch keeps local-only use one click away.
- **Remember me** — sign-in offers a "Remember me" checkbox (checked by default). Checked, the
  session is stored in that browser and survives restarts. Unchecked, the session is held in
  memory only: it lasts for the current browser session, nothing is written to the device, and
  the app signs back out on its own after a reload. The choice is per browser — it never affects
  other devices or anything server-side.
- **Local-first, optimistic** — every mutation saves locally *instantly*, then pushes to the cloud
  in the background. Offline or on failure, changes queue and retry (on reconnect + every 60 s);
  nothing is silently lost. A header chip shows live sync state.
- **First sign-in migration** — the app offers a one-time import of existing local data (never
  deletes it; safe to re-run; per-user completion flag).
- **Multi-device** — on sign-in the cloud is pulled and merged (union by id; local wins on
  conflicts; remote adopted when strictly further along).
- **Isolation** — every table is `user_id`-scoped with RLS policies (`auth.uid()` only). Verified
  live: zero cross-user leaks on read/insert/update/delete.

### Supabase setup (already done for this deployment)

1. Project `preptrack` (region `ap-south-1`) — created and migrated via
   **Actions → "Supabase operations" → bootstrap** (idempotent; reuses by name; runs
   `supabase/migrations/*.sql`, live-verifies RLS, prints the URL + publishable key).
2. Publishable config is committed at `.env.production` — **by design contains only**
   `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY` (both ship in the browser bundle anyway;
   a guardrail in the bootstrap script refuses to write anything else to that file).
3. GitHub Pages builds inject the same values from repo secrets
   (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`) — secrets take precedence.
4. Re-run any time: **Actions → "Supabase operations"** (`bootstrap` re-verifies; `e2e-tests`
   runs the live suite below). Requires the `SUPABASE_ACCESS_TOKEN` secret (remove it after
   provisioning if you prefer — the app itself never needs it).

**Never** put the Supabase `service_role`/`secret` key or the database password in the frontend,
`.env.production`, or commits. RLS — not key secrecy — is what protects per-user data; still, only
the publishable key belongs outside Supabase.

### Local development with sync

```bash
cp .env.example .env.local   # fill in your project URL + publishable key
npm run dev
```

## Data & privacy

- All data persists in `localStorage` (`mup.db.v1`), debounced writes, migration-safe.
- **Backup**: Settings → *Download backup* produces a portable JSON with everything.
- **Restore**: Settings → *Restore from file* replaces local data with the backup.
- **Local mode**: nothing ever leaves the device — no analytics, no tracking, no network calls.
- **Cloud mode**: data goes only to your own Supabase project, scoped by `auth.uid()` and enforced
  by RLS. No third parties, no analytics, no payments — the app remains 100% free.

## Syllabus data pipeline

The operational syllabus seed is generated from the downloaded reference assets
(`reference/` — untouched) plus an authored Geography Optional expansion:

```bash
npm run generate:syllabus   # regenerates src/data/syllabus.json
```

- `scripts/extract-reference-syllabus.mjs` — reads the reference bundles, extracts the
  Prelims (GS1 + CSAT) and Mains (Essay, GS1–GS4) hierarchies with weightages, merges the
  authored Geography Optional operational syllabus (`scripts/data/geographyOptional.mjs`)
  and the authored mains subject updates (`scripts/data/syllabusUpdates.mjs` — GS1
  Geography, GS2 Social Justice, GS3 Internal Security), then rebalances weightages so
  children sum exactly to their parent at every level.
- Re-runnable and deterministic; the output is committed at `src/data/syllabus.json`.

## Architecture

```
src/
  data/syllabus.ts        # syllabus index: id maps, hierarchy paths, lookups
  data/repository.ts      # THE cloud I/O layer: all 13 tables, snake_case mapping, bulk migration
  lib/                    # date utils, R1–R5 revision engine, ids, supabase client singleton
  store/db.ts             # localStorage persistence, migration, backup/restore
  store/store.tsx         # React context store — mutations, optimistic cloud queue, auth flows
  store/selectors.ts      # derived analytics (tree stats, queues, trends)
  ui/                     # shell, router, toasts, charts (pure SVG), components
  pages/                  # one module per page (14 pages)
supabase/
  migrations/             # idempotent schema + RLS (13 tables, verified on PG 18 pre-apply)
scripts/
  bootstrap-supabase.mjs  # provisioning: create/reuse project, migrate, verify RLS, export config
  e2e-cloud-test.mjs      # live 35-check suite (auth/CRUD/RLS isolation)
  verify-migration.mjs    # offline migration verifier (embedded Postgres)
  extract-reference-syllabus.mjs
  data/geographyOptional.mjs
  data/syllabusUpdates.mjs
  syllabus-consistency-test.mjs
  logic-test.mjs / smoke-test.mjs / test-entry.ts
public/                   # PWA: manifest, icons, service worker
reference/                # original downloaded assets (read-only, never modified)
```

Design system: hand-rolled CSS (dark/light themes via CSS variables), zero UI dependencies —
fast, dependency-light, fully themeable.
