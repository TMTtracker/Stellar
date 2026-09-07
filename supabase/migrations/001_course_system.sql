-- STELLAR Course System schema
-- Run this in Supabase Dashboard > SQL Editor
-- https://supabase.com/dashboard/project/ejvasbinuprpapnhgoxp/sql

-- Extensions (uuid generation)
create extension if not exists "pgcrypto";

-- ============================================================
-- COURSES
-- ============================================================
create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subject text not null default 'General',
  description text default '',
  color text not null default '#A9D8AE',
  icon text not null default 'BookOpen',
  estimated_hours numeric not null default 0,
  is_published boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- LESSONS (chapters within a course, ordered by position)
-- `content` is the markdown/rich-text body rendered on the lesson
-- show page. Populate it with the actual teaching content (headings,
-- paragraphs, code blocks, images via markdown syntax, etc). This is
-- intentionally kept as a single markdown blob rather than split into
-- a block-based structure, since a course-authoring UI can just be a
-- markdown editor/textarea and the show page can render it with any
-- markdown renderer (e.g. react-markdown).
-- ============================================================
create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  summary text default '',
  content text default '',
  duration_min int not null default 10,
  difficulty text not null default 'Easy' check (difficulty in ('Easy', 'Medium', 'Hard')),
  position int not null default 0,
  xp_reward int not null default 40,
  coins_reward int not null default 15,
  material_name text default 'Bricks',
  material_qty int not null default 1,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (course_id, position)
);
create index if not exists lessons_course_id_idx on public.lessons (course_id);
create index if not exists lessons_course_position_idx on public.lessons (course_id, position);

-- ============================================================
-- LESSON RESOURCES (optional supplementary media/links for the show
-- page — a "further reading" / attachments strip below the main
-- markdown content, kept separate so the main content stays a clean
-- markdown blob instead of a mixed content model)
-- ============================================================
create table if not exists public.lesson_resources (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  kind text not null default 'link' check (kind in ('link', 'video', 'image', 'file')),
  title text not null,
  url text not null,
  position int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists lesson_resources_lesson_idx on public.lesson_resources (lesson_id);

-- ============================================================
-- ENROLLMENTS (which user is taking which course)
-- ============================================================
create table if not exists public.enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  enrolled_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (user_id, course_id)
);
create index if not exists enrollments_user_idx on public.enrollments (user_id);
create index if not exists enrollments_course_idx on public.enrollments (course_id);

-- ============================================================
-- LESSON PROGRESS (per-user per-lesson completion)
-- ============================================================
create table if not exists public.lesson_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  status text not null default 'completed' check (status in ('in_progress', 'completed')),
  completed_at timestamptz not null default now(),
  unique (user_id, lesson_id)
);
create index if not exists lesson_progress_user_course_idx on public.lesson_progress (user_id, course_id);
create index if not exists lesson_progress_lesson_idx on public.lesson_progress (lesson_id);

-- ============================================================
-- QUIZZES (attached to a lesson — the lesson show page can render
-- the markdown content first, then a quiz section at the bottom)
-- ============================================================
create table if not exists public.quizzes (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  title text not null default 'Quiz',
  passing_score int not null default 70, -- percentage required to pass
  xp_reward int not null default 20,
  coins_reward int not null default 10,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists quizzes_lesson_idx on public.quizzes (lesson_id);

-- ============================================================
-- QUIZ QUESTIONS
-- ============================================================
create table if not exists public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  question text not null,
  explanation text default '', -- shown after answering, why it's correct
  position int not null default 0,
  points int not null default 1,
  created_at timestamptz not null default now(),
  unique (quiz_id, position)
);
create index if not exists quiz_questions_quiz_idx on public.quiz_questions (quiz_id);

-- ============================================================
-- QUIZ OPTIONS (multiple choice answers per question)
-- ============================================================
create table if not exists public.quiz_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.quiz_questions(id) on delete cascade,
  option_text text not null,
  is_correct boolean not null default false,
  position int not null default 0,
  unique (question_id, position)
);
create index if not exists quiz_options_question_idx on public.quiz_options (question_id);

-- ============================================================
-- QUIZ ATTEMPTS (one row per user submission; keep every attempt so
-- you can show attempt history / best score, rather than one row
-- overwritten each time)
-- ============================================================
create table if not exists public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  score int not null default 0, -- percentage (0-100)
  passed boolean not null default false,
  answers jsonb not null default '{}'::jsonb, -- { question_id: option_id }
  completed_at timestamptz not null default now()
);
create index if not exists quiz_attempts_user_quiz_idx on public.quiz_attempts (user_id, quiz_id);
create index if not exists quiz_attempts_lesson_idx on public.quiz_attempts (lesson_id);

-- ============================================================
-- updated_at trigger
-- ============================================================
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists courses_updated_at on public.courses;
create trigger courses_updated_at before update on public.courses
  for each row execute function public.handle_updated_at();

drop trigger if exists lessons_updated_at on public.lessons;
create trigger lessons_updated_at before update on public.lessons
  for each row execute function public.handle_updated_at();

drop trigger if exists quizzes_updated_at on public.quizzes;
create trigger quizzes_updated_at before update on public.quizzes
  for each row execute function public.handle_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.courses enable row level security;
alter table public.lessons enable row level security;
alter table public.lesson_resources enable row level security;
alter table public.enrollments enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.quizzes enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.quiz_options enable row level security;
alter table public.quiz_attempts enable row level security;

-- Courses: anyone can read published courses; authenticated can create (MVP, locked down later by role)
drop policy if exists "courses readable by everyone" on public.courses;
create policy "courses readable by everyone"
  on public.courses for select
  using (is_published = true);

drop policy if exists "authenticated can create courses" on public.courses;
create policy "authenticated can create courses"
  on public.courses for insert
  to authenticated
  with check (true);

drop policy if exists "owners can update courses" on public.courses;
create policy "owners can update courses"
  on public.courses for update
  to authenticated
  using (created_by = auth.uid() or created_by is null);

-- Lessons: anyone can read lessons of published courses
drop policy if exists "lessons readable by everyone" on public.lessons;
create policy "lessons readable by everyone"
  on public.lessons for select
  using (is_published = true);

drop policy if exists "authenticated can manage lessons" on public.lessons;
create policy "authenticated can manage lessons"
  on public.lessons for insert
  to authenticated
  with check (true);

drop policy if exists "authenticated can update lessons" on public.lessons;
create policy "authenticated can update lessons"
  on public.lessons for update
  to authenticated
  using (true);

-- Lesson resources: readable if the parent lesson is published
drop policy if exists "lesson resources readable by everyone" on public.lesson_resources;
create policy "lesson resources readable by everyone"
  on public.lesson_resources for select
  using (
    exists (
      select 1 from public.lessons l
      where l.id = lesson_resources.lesson_id and l.is_published = true
    )
  );

drop policy if exists "authenticated can manage lesson resources" on public.lesson_resources;
create policy "authenticated can manage lesson resources"
  on public.lesson_resources for insert
  to authenticated
  with check (true);

drop policy if exists "authenticated can update lesson resources" on public.lesson_resources;
create policy "authenticated can update lesson resources"
  on public.lesson_resources for update
  to authenticated
  using (true);

-- Enrollments: user can read/insert/delete own enrollments
drop policy if exists "users read own enrollments" on public.enrollments;
create policy "users read own enrollments"
  on public.enrollments for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "users create own enrollments" on public.enrollments;
create policy "users create own enrollments"
  on public.enrollments for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "users delete own enrollments" on public.enrollments;
create policy "users delete own enrollments"
  on public.enrollments for delete
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "users update own enrollments" on public.enrollments;
create policy "users update own enrollments"
  on public.enrollments for update
  to authenticated
  using (user_id = auth.uid());

-- Lesson progress: user can fully manage own progress rows
drop policy if exists "users read own progress" on public.lesson_progress;
create policy "users read own progress"
  on public.lesson_progress for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "users upsert own progress" on public.lesson_progress;
create policy "users upsert own progress"
  on public.lesson_progress for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "users update own progress" on public.lesson_progress;
create policy "users update own progress"
  on public.lesson_progress for update
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "users delete own progress" on public.lesson_progress;
create policy "users delete own progress"
  on public.lesson_progress for delete
  to authenticated
  using (user_id = auth.uid());

-- Quizzes / questions / options: readable by everyone if published
-- (the correct-option flag is included in the select, since the client
-- needs it to grade locally in the MVP — lock this down later with a
-- server-side grading function if you don't want answers exposed
-- client-side before submission)
drop policy if exists "quizzes readable by everyone" on public.quizzes;
create policy "quizzes readable by everyone"
  on public.quizzes for select
  using (is_published = true);

drop policy if exists "authenticated can manage quizzes" on public.quizzes;
create policy "authenticated can manage quizzes"
  on public.quizzes for insert
  to authenticated
  with check (true);

drop policy if exists "authenticated can update quizzes" on public.quizzes;
create policy "authenticated can update quizzes"
  on public.quizzes for update
  to authenticated
  using (true);

drop policy if exists "quiz questions readable by everyone" on public.quiz_questions;
create policy "quiz questions readable by everyone"
  on public.quiz_questions for select
  using (
    exists (
      select 1 from public.quizzes q
      where q.id = quiz_questions.quiz_id and q.is_published = true
    )
  );

drop policy if exists "authenticated can manage quiz questions" on public.quiz_questions;
create policy "authenticated can manage quiz questions"
  on public.quiz_questions for insert
  to authenticated
  with check (true);

drop policy if exists "authenticated can update quiz questions" on public.quiz_questions;
create policy "authenticated can update quiz questions"
  on public.quiz_questions for update
  to authenticated
  using (true);

drop policy if exists "quiz options readable by everyone" on public.quiz_options;
create policy "quiz options readable by everyone"
  on public.quiz_options for select
  using (
    exists (
      select 1 from public.quiz_questions qq
      join public.quizzes q on q.id = qq.quiz_id
      where qq.id = quiz_options.question_id and q.is_published = true
    )
  );

drop policy if exists "authenticated can manage quiz options" on public.quiz_options;
create policy "authenticated can manage quiz options"
  on public.quiz_options for insert
  to authenticated
  with check (true);

drop policy if exists "authenticated can update quiz options" on public.quiz_options;
create policy "authenticated can update quiz options"
  on public.quiz_options for update
  to authenticated
  using (true);

-- Quiz attempts: user can fully manage own attempts
drop policy if exists "users read own quiz attempts" on public.quiz_attempts;
create policy "users read own quiz attempts"
  on public.quiz_attempts for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "users create own quiz attempts" on public.quiz_attempts;
create policy "users create own quiz attempts"
  on public.quiz_attempts for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "users update own quiz attempts" on public.quiz_attempts;
create policy "users update own quiz attempts"
  on public.quiz_attempts for update
  to authenticated
  using (user_id = auth.uid());