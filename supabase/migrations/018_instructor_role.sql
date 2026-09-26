-- STELLAR: instructor accounts + instructor-authored courses.
--
-- Run this in Supabase Dashboard > SQL Editor AFTER 017.
--
-- 1. profiles.role ('student' | 'instructor'), chosen once at signup via
--    auth metadata { role: 'instructor' } and locked afterwards.
-- 2. The first instructor to sign up "adopts" every course that has no
--    owner yet (the seeded catalog), so they see it on their dashboard.
-- 3. Instructors can create / edit / delete their own courses and lessons
--    (RLS), and see enrollments for their own courses.
-- 4. Lessons get a content_format so rich-text (HTML) lessons written in
--    the instructor editor render alongside the seeded markdown lessons.
-- 5. Lesson rewards are derived from difficulty for client writes, so an
--    instructor can't mint a 1,000,000 XP lesson.
-- Safe to re-run.

-- ---------- 1. Role ----------
alter table public.profiles
  add column if not exists role text not null default 'student';

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check check (role in ('student', 'instructor'));

-- profiles is owner-writable (display name etc.), so block role changes
-- made directly by clients (the 'authenticated' / 'anon' DB roles).
-- handle_new_user() runs as the function owner, and the SQL Editor can
-- still promote someone manually:
--   update public.profiles set role = 'instructor' where user_id = '...';
create or replace function public.lock_profile_role()
returns trigger
language plpgsql
as $$
begin
  if current_user in ('authenticated', 'anon') then
    if tg_op = 'INSERT' then
      new.role := 'student';
    elsif new.role is distinct from old.role then
      raise exception 'Account role cannot be changed';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_lock_role on public.profiles;
create trigger profiles_lock_role before insert or update on public.profiles
  for each row execute function public.lock_profile_role();

create or replace function public.is_instructor()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where user_id = auth.uid() and role = 'instructor'
  );
$$;

-- ---------- 2. Signup trigger (supersedes 017) ----------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_role text := case
    when new.raw_user_meta_data ->> 'role' = 'instructor' then 'instructor'
    else 'student'
  end;
begin
  insert into public.profiles (user_id, display_name, role)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      split_part(coalesce(new.email, 'cadet'), '@', 1)
    ),
    v_role
  )
  on conflict (user_id) do nothing;

  insert into public.player_resources (user_id, bricks, timber, stone)
  values (new.id, 11, 14, 6)
  on conflict (user_id) do nothing;

  insert into public.user_base (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  -- Temporary: hand the unowned (seeded) catalog to the first instructor.
  if v_role = 'instructor' then
    update public.courses set created_by = new.id where created_by is null;
  end if;

  return new;
end;
$$;

-- Backfill for instructors promoted before this ran.
update public.courses
set created_by = (
  select user_id from public.profiles
  where role = 'instructor'
  order by created_at
  limit 1
)
where created_by is null
  and exists (select 1 from public.profiles where role = 'instructor');

-- ---------- 3. RLS for instructor writes ----------
drop policy if exists "instructor_insert" on public.courses;
create policy "instructor_insert" on public.courses for insert
  with check (created_by = auth.uid() and public.is_instructor());
drop policy if exists "instructor_update" on public.courses;
create policy "instructor_update" on public.courses for update
  using (created_by = auth.uid())
  with check (created_by = auth.uid() and public.is_instructor());
drop policy if exists "instructor_delete" on public.courses;
create policy "instructor_delete" on public.courses for delete
  using (created_by = auth.uid());

drop policy if exists "instructor_write" on public.lessons;
create policy "instructor_write" on public.lessons for all
  using (exists (
    select 1 from public.courses c
    where c.id = course_id and c.created_by = auth.uid()
  ))
  with check (public.is_instructor() and exists (
    select 1 from public.courses c
    where c.id = course_id and c.created_by = auth.uid()
  ));

drop policy if exists "instructor_read_enrollments" on public.enrollments;
create policy "instructor_read_enrollments" on public.enrollments for select
  using (exists (
    select 1 from public.courses c
    where c.id = course_id and c.created_by = auth.uid()
  ));

-- ---------- 4. Rich-text lessons ----------
alter table public.lessons
  add column if not exists content_format text not null default 'markdown';
alter table public.lessons drop constraint if exists lessons_content_format_check;
alter table public.lessons
  add constraint lessons_content_format_check check (content_format in ('markdown', 'html'));

-- ---------- 5. Rewards follow difficulty (same tiers as seed.sql) ----------
create or replace function public.normalize_lesson_rewards()
returns trigger
language plpgsql
as $$
begin
  -- Only client writes; SQL Editor seeds keep their explicit values.
  if current_user in ('authenticated', 'anon') then
    case new.difficulty
      when 'Hard' then
        new.xp_reward := 90; new.coins_reward := 30; new.material_name := 'Rare gem'; new.material_qty := 1;
      when 'Medium' then
        new.xp_reward := 60; new.coins_reward := 20; new.material_name := 'Timber'; new.material_qty := 3;
      else
        new.xp_reward := 40; new.coins_reward := 15; new.material_name := 'Bricks'; new.material_qty := 2;
    end case;
  end if;
  return new;
end;
$$;

drop trigger if exists lessons_normalize_rewards on public.lessons;
create trigger lessons_normalize_rewards before insert or update on public.lessons
  for each row execute function public.normalize_lesson_rewards();

-- ---------- Save a course + its ordered lessons atomically ----------
-- p_course:  { id?, title, subject, description, color, icon,
--              estimated_hours, is_published }
-- p_lessons: [{ id?, title, summary, content, duration_min, difficulty }]
--            in display order. Lessons of this course missing from the
--            array are deleted. Runs as the caller, so RLS applies.
create or replace function public.instructor_save_course(p_course jsonb, p_lessons jsonb)
returns uuid
language plpgsql
security invoker set search_path = public
as $$
declare
  v_course_id uuid := nullif(p_course ->> 'id', '')::uuid;
  v_keep uuid[];
  v_lesson jsonb;
  v_pos int := 0;
  v_published boolean := coalesce((p_course ->> 'is_published')::boolean, false);
begin
  if not public.is_instructor() then
    raise exception 'Only instructors can save courses';
  end if;
  if coalesce(trim(p_course ->> 'title'), '') = '' then
    raise exception 'Course title is required';
  end if;

  if v_course_id is null then
    insert into public.courses (title, subject, description, color, icon, estimated_hours, is_published, created_by)
    values (
      trim(p_course ->> 'title'),
      coalesce(nullif(trim(p_course ->> 'subject'), ''), 'General'),
      coalesce(p_course ->> 'description', ''),
      coalesce(nullif(p_course ->> 'color', ''), '#A9D8AE'),
      coalesce(nullif(p_course ->> 'icon', ''), 'BookOpen'),
      coalesce((p_course ->> 'estimated_hours')::numeric, 0),
      v_published,
      auth.uid()
    )
    returning id into v_course_id;
  else
    update public.courses set
      title = trim(p_course ->> 'title'),
      subject = coalesce(nullif(trim(p_course ->> 'subject'), ''), 'General'),
      description = coalesce(p_course ->> 'description', ''),
      color = coalesce(nullif(p_course ->> 'color', ''), color),
      icon = coalesce(nullif(p_course ->> 'icon', ''), icon),
      estimated_hours = coalesce((p_course ->> 'estimated_hours')::numeric, estimated_hours),
      is_published = v_published,
      updated_at = now()
    where id = v_course_id and created_by = auth.uid();
    if not found then
      raise exception 'Course not found, or you are not its instructor';
    end if;
  end if;

  select coalesce(array_agg((x ->> 'id')::uuid), '{}')
  into v_keep
  from jsonb_array_elements(coalesce(p_lessons, '[]'::jsonb)) x
  where nullif(x ->> 'id', '') is not null;

  delete from public.lessons
  where course_id = v_course_id and not (id = any (v_keep));

  -- Park current positions in negative space so re-ordering can't trip
  -- the unique (course_id, position) constraint mid-save.
  update public.lessons set position = -position - 1 where course_id = v_course_id;

  for v_lesson in select * from jsonb_array_elements(coalesce(p_lessons, '[]'::jsonb)) loop
    v_pos := v_pos + 1;
    if nullif(v_lesson ->> 'id', '') is null then
      insert into public.lessons (course_id, title, summary, content, content_format, duration_min, difficulty, position, is_published)
      values (
        v_course_id,
        coalesce(nullif(trim(v_lesson ->> 'title'), ''), 'Untitled lesson'),
        coalesce(v_lesson ->> 'summary', ''),
        coalesce(v_lesson ->> 'content', ''),
        'html',
        greatest(coalesce((v_lesson ->> 'duration_min')::int, 10), 1),
        coalesce(nullif(v_lesson ->> 'difficulty', ''), 'Easy'),
        v_pos,
        true
      );
    else
      update public.lessons set
        title = coalesce(nullif(trim(v_lesson ->> 'title'), ''), 'Untitled lesson'),
        summary = coalesce(v_lesson ->> 'summary', ''),
        content = coalesce(v_lesson ->> 'content', ''),
        content_format = 'html',
        duration_min = greatest(coalesce((v_lesson ->> 'duration_min')::int, 10), 1),
        difficulty = coalesce(nullif(v_lesson ->> 'difficulty', ''), 'Easy'),
        position = v_pos,
        updated_at = now()
      where id = (v_lesson ->> 'id')::uuid and course_id = v_course_id;
    end if;
  end loop;

  return v_course_id;
end;
$$;

grant execute on function public.instructor_save_course(jsonb, jsonb) to authenticated;
grant execute on function public.is_instructor() to authenticated;
