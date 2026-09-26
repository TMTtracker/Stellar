-- STELLAR: fix "new row violates row-level security policy" when an
-- instructor sets a course to draft, unpublishes it, or (per the same
-- pattern) edits its lessons/quizzes.
--
-- instructor_save_course() and instructor_save_lesson_quiz() already gate
-- entry with their own explicit `if not public.is_instructor() then raise
-- exception ...` check, run once at the top before touching any table - so
-- by the time execution reaches the actual INSERT/UPDATE, the caller is
-- already confirmed to be an instructor. Re-checking is_instructor() a
-- SECOND time inside each table's own WITH CHECK was redundant, and
-- evidently evaluated inconsistently there (the generic Postgres RLS error,
-- not the function's own friendlier message, is what was actually being
-- hit) - dropping the redundant re-check removes the failure without
-- weakening anything: every policy below still fully requires ownership
-- (created_by = auth.uid(), traced up through the lesson/quiz/question
-- hierarchy), and a row can only ever end up owned by a real instructor in
-- the first place via instructor_insert (still fully gated) or the signup
-- adoption trigger (SECURITY DEFINER, bypasses these policies entirely).
--
-- Run this in Supabase Dashboard > SQL Editor AFTER 020.

drop policy if exists "instructor_update" on public.courses;
create policy "instructor_update" on public.courses for update
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

drop policy if exists "instructor_write" on public.lessons;
create policy "instructor_write" on public.lessons for all
  using (exists (
    select 1 from public.courses c
    where c.id = course_id and c.created_by = auth.uid()
  ))
  with check (exists (
    select 1 from public.courses c
    where c.id = course_id and c.created_by = auth.uid()
  ));

drop policy if exists "instructor_write" on public.quizzes;
create policy "instructor_write" on public.quizzes for all
  using (exists (
    select 1 from public.lessons l
    join public.courses c on c.id = l.course_id
    where l.id = lesson_id and c.created_by = auth.uid()
  ))
  with check (exists (
    select 1 from public.lessons l
    join public.courses c on c.id = l.course_id
    where l.id = lesson_id and c.created_by = auth.uid()
  ));

drop policy if exists "instructor_write" on public.quiz_questions;
create policy "instructor_write" on public.quiz_questions for all
  using (exists (
    select 1 from public.quizzes q
    join public.lessons l on l.id = q.lesson_id
    join public.courses c on c.id = l.course_id
    where q.id = quiz_id and c.created_by = auth.uid()
  ))
  with check (exists (
    select 1 from public.quizzes q
    join public.lessons l on l.id = q.lesson_id
    join public.courses c on c.id = l.course_id
    where q.id = quiz_id and c.created_by = auth.uid()
  ));

drop policy if exists "instructor_write" on public.quiz_options;
create policy "instructor_write" on public.quiz_options for all
  using (exists (
    select 1 from public.quiz_questions qq
    join public.quizzes q on q.id = qq.quiz_id
    join public.lessons l on l.id = q.lesson_id
    join public.courses c on c.id = l.course_id
    where qq.id = question_id and c.created_by = auth.uid()
  ))
  with check (exists (
    select 1 from public.quiz_questions qq
    join public.quizzes q on q.id = qq.quiz_id
    join public.lessons l on l.id = q.lesson_id
    join public.courses c on c.id = l.course_id
    where qq.id = question_id and c.created_by = auth.uid()
  ));
