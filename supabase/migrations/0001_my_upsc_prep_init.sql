-- ============================================================================
-- My UPSC Prep — initial schema (users, tables, indexes, RLS)
-- Generated from the application's existing localStorage data model
-- (src/types.ts → MupDatabase). Static syllabus content stays bundled with
-- the app and is intentionally NOT duplicated as per-user rows.
--
-- Apply via: Supabase Dashboard → SQL Editor → paste & run
--       or:  supabase link --project-ref <ref> && supabase db push
-- ============================================================================

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- profiles: user settings / preferences (app's `settings` object)
-- One row per user, PK = user id.
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id                     uuid primary key references auth.users (id) on delete cascade,
  target_exam_year       int  not null default 2027,
  optional               text not null default 'Geography',
  theme                  text not null default 'dark'
                           check (theme in ('dark', 'light')),
  daily_target_minutes   int  not null default 480,
  auto_revision_schedule boolean not null default true,
  default_paper_filter   text,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- syllabus_progress: per syllabus-item status / notes / R1–R5 metadata
-- (app's `progress` map, keyed by bundled syllabus item id)
-- ----------------------------------------------------------------------------
create table if not exists public.syllabus_progress (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  item_id         text not null,
  item_type       text not null
                    check (item_type in ('paper', 'subject', 'chapter', 'topic', 'subtopic')),
  status          text not null default 'not_started'
                    check (status in ('not_started', 'in_progress', 'completed')),
  revision_count  int  not null default 0
                    check (revision_count between 0 and 5),
  confidence      int  not null default 0
                    check (confidence between 0 and 3),
  last_revised_at timestamptz,
  next_revision_at timestamptz,
  notes           text not null default '',
  tags            text[] not null default '{}',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (user_id, item_id)
);
create index if not exists idx_syllabus_progress_user_next
  on public.syllabus_progress (user_id, next_revision_at);
create index if not exists idx_syllabus_progress_user_type
  on public.syllabus_progress (user_id, item_type);

-- ----------------------------------------------------------------------------
-- revision_logs: full history of every R1–R5 pass (app's `revisionLogs`)
-- ----------------------------------------------------------------------------
create table if not exists public.revision_logs (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  item_id         text not null,
  item_type       text not null,
  revision_number int  not null,
  confidence      int  not null,
  revised_at      timestamptz not null default now(),
  notes           text not null default '',
  created_at      timestamptz not null default now()
);
create index if not exists idx_revision_logs_user_time
  on public.revision_logs (user_id, revised_at desc);

-- ----------------------------------------------------------------------------
-- tasks: daily planner tasks & calendar events (app's `tasks`)
-- ----------------------------------------------------------------------------
create table if not exists public.tasks (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users (id) on delete cascade,
  name             text not null,
  subject_mapping  text not null default '',
  syllabus_context text,
  study_stage      text not null default 'R0',
  source           text,
  priority         text not null default 'normal'
                     check (priority in ('low', 'normal', 'high', 'critical')),
  priority_bucket  text,
  deadline         date not null,
  completed_at     timestamptz,
  status           text not null default 'upcoming'
                     check (status in ('upcoming', 'in_progress', 'completed')),
  start_time       text,
  end_time         text,
  estimate_min     int,
  linked_topic_id  text,
  linked_subtopic_id text,
  notes            text not null default '',
  is_event         boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists idx_tasks_user_deadline on public.tasks (user_id, deadline);
create index if not exists idx_tasks_user_status   on public.tasks (user_id, status);

-- ----------------------------------------------------------------------------
-- pyqs: previous-year question bank (app's `pyqs`)
-- ----------------------------------------------------------------------------
create table if not exists public.pyqs (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  exam         text not null,
  year         int  not null,
  paper        text not null default '',
  question     text not null,
  result       text not null default 'not_attempted'
                 check (result in ('not_attempted', 'attempted', 'mastered')),
  topic_id     text,
  notes        text not null default '',
  attempted_at timestamptz,
  created_at   timestamptz not null default now()
);
create index if not exists idx_pyqs_user_exam_year on public.pyqs (user_id, exam, year desc);

-- ----------------------------------------------------------------------------
-- prelims_tests: prelims mock/PYQ test records (app's `prelimsTests`)
-- Analytics (score %, accuracy, attempt rate) are derived on the client —
-- no separate analytics table is needed.
-- ----------------------------------------------------------------------------
create table if not exists public.prelims_tests (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users (id) on delete cascade,
  test_name          text not null,
  test_date          date not null,
  total_questions    int  not null default 100,
  attempted          int  not null default 0,
  correct            int  not null default 0,
  incorrect          int  not null default 0,
  score              numeric not null default 0,
  max_score          numeric not null default 200,
  time_taken_minutes int,
  test_type          text not null default 'Full Mock',
  notes              text not null default '',
  created_at         timestamptz not null default now()
);
create index if not exists idx_prelims_tests_user_date on public.prelims_tests (user_id, test_date desc);

-- ----------------------------------------------------------------------------
-- mains_tests: mains tests / answer evaluations (app's `mainsTests`)
-- ----------------------------------------------------------------------------
create table if not exists public.mains_tests (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users (id) on delete cascade,
  test_name          text not null,
  test_date          date not null,
  paper              text not null default 'GS1',
  question_number    text,
  marks_obtained     numeric not null default 0,
  max_marks          numeric not null default 250,
  time_taken_minutes int,
  word_count         int,
  test_type          text not null default 'Sectional',
  notes              text not null default '',
  created_at         timestamptz not null default now()
);
create index if not exists idx_mains_tests_user_date on public.mains_tests (user_id, test_date desc);

-- ----------------------------------------------------------------------------
-- focus_sessions: study-timer sessions (app's `focusSessions`)
-- "Study hours" dashboards are derived from these rows.
-- ----------------------------------------------------------------------------
create table if not exists public.focus_sessions (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users (id) on delete cascade,
  started_at       timestamptz not null,
  duration_minutes numeric not null check (duration_minutes >= 0),
  task_name        text not null default 'Focus study',
  session_type     text not null default 'focus'
                     check (session_type in ('focus', 'break')),
  completed        boolean not null default true,
  created_at       timestamptz not null default now()
);
create index if not exists idx_focus_sessions_user_started
  on public.focus_sessions (user_id, started_at desc);

-- ----------------------------------------------------------------------------
-- habits + habit_completions (app's `habits` / `habitCompletions`)
-- ----------------------------------------------------------------------------
create table if not exists public.habits (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  name       text not null,
  color      text not null default '#6d8cff',
  archived   boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_habits_user on public.habits (user_id);

create table if not exists public.habit_completions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  habit_id   uuid not null references public.habits (id) on delete cascade,
  date       date not null,
  created_at timestamptz not null default now(),
  unique (habit_id, date)
);
create index if not exists idx_habit_completions_user_date
  on public.habit_completions (user_id, date);

-- ----------------------------------------------------------------------------
-- lectures: Geography Optional lecture tracker (app's `lectures`)
-- ----------------------------------------------------------------------------
create table if not exists public.lectures (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users (id) on delete cascade,
  title            text not null,
  subject          text not null,
  chapter          text not null default '',
  lecture_no       int  not null default 1,
  total_lectures   int  not null default 1,
  source           text not null default '',
  pdf_followed     text not null default '',
  short_notes_made boolean not null default false,
  notes_link       text not null default '',
  revised          boolean not null default false,
  revision_count   int  not null default 0,
  pyqs_attempted   int  not null default 0,
  status           text not null default 'not_started'
                     check (status in ('not_started', 'in_progress', 'completed')),
  last_watched_at  timestamptz,
  completed_at     timestamptz,
  notes            text not null default '',
  created_at       timestamptz not null default now()
);
create index if not exists idx_lectures_user_subject on public.lectures (user_id, subject);

-- ----------------------------------------------------------------------------
-- current_affairs: daily CA capture (app's `currentAffairs`)
-- ----------------------------------------------------------------------------
create table if not exists public.current_affairs (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  date           date not null,
  source         text not null default '',
  category       text not null default 'Other',
  title          text not null,
  summary        text not null default '',
  relevance      text not null default 'both'
                   check (relevance in ('prelims', 'mains', 'both', 'none')),
  revised        boolean not null default false,
  revision_count int  not null default 0,
  topic_id       text,
  notes          text not null default '',
  created_at     timestamptz not null default now()
);
create index if not exists idx_current_affairs_user_date
  on public.current_affairs (user_id, date desc);

-- ----------------------------------------------------------------------------
-- answers: answer-writing practice log (app's `answers`)
-- ----------------------------------------------------------------------------
create table if not exists public.answers (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users (id) on delete cascade,
  date               date not null,
  question           text not null,
  paper              text not null default 'GS1',
  word_count         int,
  marks_obtained     numeric,
  max_marks          numeric,
  time_taken_minutes int,
  strengths          text[] not null default '{}',
  improvements       text[] not null default '{}',
  notes              text not null default '',
  created_at         timestamptz not null default now()
);
create index if not exists idx_answers_user_date on public.answers (user_id, date desc);

-- ============================================================================
-- ROW LEVEL SECURITY — every user-owned table.
-- Policies are scoped with auth.uid() so an authenticated user can only
-- touch their own rows. No public/anon policies by design.
-- Note: (select auth.uid()) wraps the call so the planner initialises it once.
-- ============================================================================

alter table public.profiles           enable row level security;
alter table public.syllabus_progress  enable row level security;
alter table public.revision_logs      enable row level security;
alter table public.tasks              enable row level security;
alter table public.pyqs               enable row level security;
alter table public.prelims_tests      enable row level security;
alter table public.mains_tests        enable row level security;
alter table public.focus_sessions     enable row level security;
alter table public.habits             enable row level security;
alter table public.habit_completions  enable row level security;
alter table public.lectures           enable row level security;
alter table public.current_affairs    enable row level security;
alter table public.answers            enable row level security;

-- Privileges (Supabase grants these implicitly; be explicit & idempotent) -----
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant usage on schema public to anon;

-- profiles -------------------------------------------------------------------
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated with check (id = (select auth.uid()));
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated using (id = (select auth.uid()))
  with check (id = (select auth.uid()));
drop policy if exists "profiles_delete_own" on public.profiles;
create policy "profiles_delete_own" on public.profiles
  for delete to authenticated using (id = (select auth.uid()));

-- Generic owner-scoped CRUD for all data tables -------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'syllabus_progress', 'revision_logs', 'tasks', 'pyqs',
    'prelims_tests', 'mains_tests', 'focus_sessions',
    'habits', 'habit_completions', 'lectures', 'current_affairs', 'answers'
  ] loop
    execute format('drop policy if exists %I_select on public.%I', t, t);
    execute format($f$
      create policy %I_select on public.%I
        for select to authenticated using (user_id = (select auth.uid()));
    $f$, t, t);
    execute format('drop policy if exists %I_insert on public.%I', t, t);
    execute format($f$
      create policy %I_insert on public.%I
        for insert to authenticated with check (user_id = (select auth.uid()));
    $f$, t, t);
    execute format('drop policy if exists %I_update on public.%I', t, t);
    execute format($f$
      create policy %I_update on public.%I
        for update to authenticated using (user_id = (select auth.uid()))
        with check (user_id = (select auth.uid()));
    $f$, t, t);
    execute format('drop policy if exists %I_delete on public.%I', t, t);
    execute format($f$
      create policy %I_delete on public.%I
        for delete to authenticated using (user_id = (select auth.uid()));
    $f$, t, t);
  end loop;
end $$;
