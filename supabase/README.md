# Supabase sync (prepared — awaiting project credentials)

The database layer for My UPSC Prep's Supabase integration lives here as a
**reproducible SQL migration**. The app itself is unchanged and continues to
run 100% locally/localStorage until the project credentials below are
available — by design, so nothing half-configured ever ships.

## What's in this folder

| File | Purpose |
| --- | --- |
| `migrations/0001_my_upsc_prep_init.sql` | Complete schema: 13 user-owned tables + `profiles`, indexes, constraints, **Row Level Security with owner-only policies**. Idempotent (safe to re-run). |
| `../scripts/verify-migration.mjs` | Functional verifier — boots a real local Postgres (via npm `embedded-postgres`), emulates Supabase's `auth.uid()`, and proves RLS isolation between two users. |

## Verified behaviour (real Postgres 18, Supabase emulation)

- Migration applies cleanly, re-runnable
- CRUD works for the authenticated owner on all 13 tables
- `revision_count 0–5`, status/priority/result enum checks enforced
- `habit_completions` unique `(habit_id, date)` enforced
- A second authenticated user sees **zero rows** in every table and cannot
  INSERT/UPDATE another user's rows (tested)
- `anon` role sees nothing and cannot insert (no grants by design)

## Applying the migration to your Supabase project

**Option 1 — Dashboard (2 minutes):**
1. Create a project at supabase.com (suggested name: `my-upsc-prep`, region `ap-south-1 (Mumbai)`).
2. SQL Editor → New query → paste the full contents of
   `supabase/migrations/0001_my_upsc_prep_init.sql` → Run.
3. Project Settings → API: copy the **Project URL** and the **anon/public
   publishable key** (browser-safe — never the service_role key).

**Option 2 — Supabase CLI:**
```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

## Environment variables (never committed)

```
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<anon key>
```

- Local dev: put them in `.env.local` (git-ignored).
- GitHub Pages: add them as **Actions secrets** — repo → Settings → Secrets
  and variables → Actions → New repository secret — with those exact names.
  The Pages workflow reads them at build time.

## GitHub Actions secrets to add

| Secret name | Value |
| --- | --- |
| `VITE_SUPABASE_URL` | Project URL from Supabase → Settings → API |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | anon / publishable key (NOT service_role) |

## One-time auth setup in the Supabase dashboard

- Authentication → Providers → **Email**: enabled (default).
- For a quick start you can disable "Confirm email" under Auth settings;
  leave it on if you want verification mails.

## What remains until credentials exist

Auth screens, the Supabase repository layer, first-login localStorage
migration, and workflow changes are **implemented only after** the project
URL + publishable key are available (or a temporary Supabase access token is
provided so the project can be created and configured directly).
