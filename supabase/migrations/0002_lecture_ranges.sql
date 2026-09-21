-- Additive, data-preserving support for inclusive lecture ranges and
-- one-click completion of individual lectures within an existing series.
-- Existing series progress is translated from lecture_no/status; no rows or
-- legacy metadata are removed.

alter table public.lectures
  add column if not exists range_start int,
  add column if not exists range_end int,
  add column if not exists completed_lectures int[] not null default '{}';

update public.lectures
set
  range_start = coalesce(range_start, 1),
  range_end = coalesce(range_end, greatest(1, total_lectures)),
  completed_lectures = case
    when cardinality(completed_lectures) > 0 then completed_lectures
    when status = 'completed' then array(
      select generate_series(1, greatest(1, total_lectures))
    )
    when status = 'in_progress' and lecture_no > 1 then array(
      select generate_series(1, least(greatest(1, total_lectures), lecture_no - 1))
    )
    else '{}'
  end
where range_start is null
   or range_end is null
   or cardinality(completed_lectures) = 0;

alter table public.lectures
  alter column range_start set default 1,
  alter column range_start set not null,
  alter column range_end set default 1,
  alter column range_end set not null;

alter table public.lectures
  drop constraint if exists lectures_range_valid;
alter table public.lectures
  add constraint lectures_range_valid check (range_start >= 0 and range_end >= range_start);
