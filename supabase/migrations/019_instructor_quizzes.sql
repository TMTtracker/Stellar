-- STELLAR: instructor-authored lesson quizzes.
--
-- Run this in Supabase Dashboard > SQL Editor AFTER 018.
--
-- 1. Instructors can write quizzes / questions / options for lessons in
--    courses they own (RLS).
-- 2. instructor_save_course() (from 018) now also saves each lesson's quiz:
--      lesson JSON without a "quiz" key -> quiz left untouched (keeps its id,
--                                          so students' attempts survive)
--      "quiz": null                     -> quiz removed
--      "quiz": { ... }                  -> quiz replaced
-- Safe to re-run.

-- ---------- 1. RLS ----------
drop policy if exists "instructor_write" on public.quizzes;
create policy "instructor_write" on public.quizzes for all
  using (exists (
    select 1 from public.lessons l
    join public.courses c on c.id = l.course_id
    where l.id = lesson_id and c.created_by = auth.uid()
  ))
  with check (public.is_instructor() and exists (
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
  with check (public.is_instructor() and exists (
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
  with check (public.is_instructor() and exists (
    select 1 from public.quiz_questions qq
    join public.quizzes q on q.id = qq.quiz_id
    join public.lessons l on l.id = q.lesson_id
    join public.courses c on c.id = l.course_id
    where qq.id = question_id and c.created_by = auth.uid()
  ));

-- ---------- 2. Replace one lesson's quiz ----------
-- p_quiz: { title?, passing_score?, questions: [
--           { question, explanation?, options: [{ text, is_correct }] } ] }
-- null removes the quiz. Runs as the caller, so RLS applies.
create or replace function public.instructor_save_lesson_quiz(p_lesson_id uuid, p_lesson_title text, p_quiz jsonb)
returns void
language plpgsql
security invoker set search_path = public
as $$
declare
  v_quiz_id uuid;
  v_question_id uuid;
  v_q jsonb;
  v_o jsonb;
  v_qpos int := 0;
  v_opos int;
  v_nq int;
  v_no int;
  v_correct int;
begin
  delete from public.quizzes where lesson_id = p_lesson_id;

  if p_quiz is null or jsonb_typeof(p_quiz) = 'null' then
    return;
  end if;

  v_nq := jsonb_array_length(coalesce(p_quiz -> 'questions', '[]'::jsonb));
  if v_nq < 1 or v_nq > 15 then
    raise exception 'Quiz for "%" needs between 1 and 15 questions', p_lesson_title;
  end if;

  insert into public.quizzes (lesson_id, title, passing_score, is_published)
  values (
    p_lesson_id,
    coalesce(nullif(trim(p_quiz ->> 'title'), ''), 'Quiz: ' || p_lesson_title),
    least(greatest(coalesce((p_quiz ->> 'passing_score')::int, 70), 50), 100),
    true
  )
  returning id into v_quiz_id;

  for v_q in select * from jsonb_array_elements(p_quiz -> 'questions') loop
    v_qpos := v_qpos + 1;
    if coalesce(trim(v_q ->> 'question'), '') = '' then
      raise exception 'Question % in the quiz for "%" is empty', v_qpos, p_lesson_title;
    end if;

    v_no := jsonb_array_length(coalesce(v_q -> 'options', '[]'::jsonb));
    select count(*) into v_correct
    from jsonb_array_elements(coalesce(v_q -> 'options', '[]'::jsonb)) o
    where coalesce((o ->> 'is_correct')::boolean, false);
    if v_no < 2 or v_no > 6 then
      raise exception 'Question % in the quiz for "%" needs 2 to 6 answers', v_qpos, p_lesson_title;
    end if;
    if v_correct <> 1 then
      raise exception 'Question % in the quiz for "%" needs exactly one correct answer', v_qpos, p_lesson_title;
    end if;

    insert into public.quiz_questions (quiz_id, question, explanation, position, points)
    values (v_quiz_id, trim(v_q ->> 'question'), coalesce(trim(v_q ->> 'explanation'), ''), v_qpos, 1)
    returning id into v_question_id;

    v_opos := 0;
    for v_o in select * from jsonb_array_elements(v_q -> 'options') loop
      v_opos := v_opos + 1;
      if coalesce(trim(v_o ->> 'text'), '') = '' then
        raise exception 'Question % in the quiz for "%" has an empty answer', v_qpos, p_lesson_title;
      end if;
      insert into public.quiz_options (question_id, option_text, is_correct, position)
      values (v_question_id, trim(v_o ->> 'text'), coalesce((v_o ->> 'is_correct')::boolean, false), v_opos);
    end loop;
  end loop;
end;
$$;

-- ---------- 3. Course save (supersedes 018) ----------
create or replace function public.instructor_save_course(p_course jsonb, p_lessons jsonb)
returns uuid
language plpgsql
security invoker set search_path = public
as $$
declare
  v_course_id uuid := nullif(p_course ->> 'id', '')::uuid;
  v_keep uuid[];
  v_lesson jsonb;
  v_lesson_id uuid;
  v_title text;
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
    v_title := coalesce(nullif(trim(v_lesson ->> 'title'), ''), 'Untitled lesson');
    v_lesson_id := null;

    if nullif(v_lesson ->> 'id', '') is null then
      insert into public.lessons (course_id, title, summary, content, content_format, duration_min, difficulty, position, is_published)
      values (
        v_course_id,
        v_title,
        coalesce(v_lesson ->> 'summary', ''),
        coalesce(v_lesson ->> 'content', ''),
        'html',
        greatest(coalesce((v_lesson ->> 'duration_min')::int, 10), 1),
        coalesce(nullif(v_lesson ->> 'difficulty', ''), 'Easy'),
        v_pos,
        true
      )
      returning id into v_lesson_id;
    else
      update public.lessons set
        title = v_title,
        summary = coalesce(v_lesson ->> 'summary', ''),
        content = coalesce(v_lesson ->> 'content', ''),
        content_format = 'html',
        duration_min = greatest(coalesce((v_lesson ->> 'duration_min')::int, 10), 1),
        difficulty = coalesce(nullif(v_lesson ->> 'difficulty', ''), 'Easy'),
        position = v_pos,
        updated_at = now()
      where id = (v_lesson ->> 'id')::uuid and course_id = v_course_id
      returning id into v_lesson_id;
    end if;

    if v_lesson_id is not null and v_lesson ? 'quiz' then
      perform public.instructor_save_lesson_quiz(v_lesson_id, v_title, v_lesson -> 'quiz');
    end if;
  end loop;

  return v_course_id;
end;
$$;

grant execute on function public.instructor_save_lesson_quiz(uuid, text, jsonb) to authenticated;
grant execute on function public.instructor_save_course(jsonb, jsonb) to authenticated;
