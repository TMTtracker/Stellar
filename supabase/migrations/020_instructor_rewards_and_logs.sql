-- STELLAR: random material rewards + a publish/draft activity log
-- Run this in Supabase Dashboard > SQL Editor AFTER 018_instructor_role.sql
-- and 019_instructor_quizzes.sql (this branch's numbering).
--
-- 1. normalize_lesson_rewards() used to grant a single fixed material+qty
--    per difficulty (Hard->1 Rare gem, Medium->3 Timber, Easy->2 Bricks).
--    Now it randomly picks a material from a tier-appropriate pool (rarer
--    materials at higher difficulty, matching the "harder lessons drop
--    rarer materials" copy already on the student Dashboard) and a random
--    quantity in 20-60. XP/coins per tier are unchanged. This grouping is a
--    starting guess - trivial to retune by editing the arrays below.
-- 2. course_publish_log records every time a course's is_published flips
--    (or is set on creation), so an instructor can see their own publish
--    history.

create or replace function public.normalize_lesson_rewards()
returns trigger
language plpgsql
as $$
declare
  v_pool text[];
begin
  if current_user in ('authenticated', 'anon') then
    case new.difficulty
      when 'Hard' then
        new.xp_reward := 90; new.coins_reward := 30;
        v_pool := array['Rare gem', 'Crystal shard', 'Fabric'];
      when 'Medium' then
        new.xp_reward := 60; new.coins_reward := 20;
        v_pool := array['Stone', 'Iron', 'Glass'];
      else
        new.xp_reward := 40; new.coins_reward := 15;
        v_pool := array['Bricks', 'Timber'];
    end case;

    -- Re-roll on insert, or when difficulty actually changed - editing
    -- unrelated fields (title, content, minutes) on an existing lesson
    -- shouldn't reshuffle a reward students may already be expecting.
    -- OLD isn't a valid reference during INSERT, so that branch is checked
    -- first and never touches it.
    if tg_op = 'INSERT' then
      new.material_name := v_pool[1 + floor(random() * array_length(v_pool, 1))::int];
      new.material_qty := 20 + floor(random() * 41)::int; -- 20-60 inclusive
    elsif new.difficulty is distinct from old.difficulty then
      new.material_name := v_pool[1 + floor(random() * array_length(v_pool, 1))::int];
      new.material_qty := 20 + floor(random() * 41)::int;
    end if;
  end if;
  return new;
end;
$$;

-- Trigger already exists from 018_instructor_role.sql and doesn't need
-- redefining - CREATE OR REPLACE FUNCTION above is enough to change its
-- behavior.

create table if not exists public.course_publish_log (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  instructor_id uuid not null references auth.users(id) on delete cascade,
  action text not null check (action in ('published', 'drafted')),
  course_title text not null,
  created_at timestamptz not null default now()
);
create index if not exists course_publish_log_instructor_idx on public.course_publish_log (instructor_id, created_at desc);

alter table public.course_publish_log enable row level security;
drop policy if exists "instructors read their own publish log" on public.course_publish_log;
create policy "instructors read their own publish log" on public.course_publish_log
  for select using (instructor_id = auth.uid());
-- No insert/update/delete policy for clients - only the SECURITY DEFINER
-- triggers below write to this table, so it can't be tampered with or
-- have fake history injected via a direct API call.

create or replace function public.log_course_publish_insert()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.created_by is not null then
    insert into public.course_publish_log (course_id, instructor_id, action, course_title)
    values (new.id, new.created_by, case when new.is_published then 'published' else 'drafted' end, new.title);
  end if;
  return new;
end;
$$;

drop trigger if exists courses_log_publish_insert on public.courses;
create trigger courses_log_publish_insert after insert on public.courses
  for each row execute function public.log_course_publish_insert();

create or replace function public.log_course_publish_change()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if old.is_published is distinct from new.is_published and new.created_by is not null then
    insert into public.course_publish_log (course_id, instructor_id, action, course_title)
    values (new.id, new.created_by, case when new.is_published then 'published' else 'drafted' end, new.title);
  end if;
  return new;
end;
$$;

drop trigger if exists courses_log_publish_change on public.courses;
create trigger courses_log_publish_change after update on public.courses
  for each row execute function public.log_course_publish_change();
