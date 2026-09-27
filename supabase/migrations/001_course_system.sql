-- STELLAR course system (run first)
create extension if not exists "pgcrypto";

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subject text not null default 'General',
  description text default '',
  color text not null default '#A9D8AE',
  icon text not null default 'BookOpen',
  estimated_hours numeric not null default 0,
  is_published boolean not null default true,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
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
create index if not exists lessons_course_idx on public.lessons (course_id);

create table if not exists public.lesson_resources (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  kind text not null default 'link' check (kind in ('link', 'video', 'image', 'file')),
  title text not null,
  url text not null,
  position int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists lesson_resources_lesson_idx on public.lesson_resources (lesson_id);

create table if not exists public.enrollments (
  user_id uuid not null references auth.users (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, course_id)
);

create table if not exists public.lesson_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  status text not null default 'completed' check (status in ('completed')),
  completed_at timestamptz not null default now(),
  unique (user_id, lesson_id)
);
create index if not exists lesson_progress_user_course_idx on public.lesson_progress (user_id, course_id);

create table if not exists public.quizzes (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  title text not null default 'Quiz',
  passing_score int not null default 70,
  xp_reward int not null default 20,
  coins_reward int not null default 10,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists quizzes_lesson_idx on public.quizzes (lesson_id);

create table if not exists public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes (id) on delete cascade,
  question text not null,
  explanation text default '',
  position int not null default 0,
  points int not null default 1,
  created_at timestamptz not null default now(),
  unique (quiz_id, position)
);

create table if not exists public.quiz_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.quiz_questions (id) on delete cascade,
  option_text text not null,
  is_correct boolean not null default false,
  position int not null default 0,
  unique (question_id, position)
);

create table if not exists public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  quiz_id uuid not null references public.quizzes (id) on delete cascade,
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  score int not null default 0,
  passed boolean not null default false,
  answers jsonb not null default '{}'::jsonb,
  completed_at timestamptz not null default now()
);
create index if not exists quiz_attempts_user_quiz_idx on public.quiz_attempts (user_id, quiz_id);

-- Backfill for DBs created with an older 001: ensure status column exists.
alter table public.lesson_progress
  add column if not exists status text not null default 'completed'
  check (status in ('completed'));

-- RLS: public read for catalog, owner-only for user data.
alter table public.courses enable row level security;
alter table public.lessons enable row level security;
alter table public.lesson_resources enable row level security;
alter table public.quizzes enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.quiz_options enable row level security;
alter table public.enrollments enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.quiz_attempts enable row level security;

-- Catalog is readable by all; writes stay service-role only.
drop policy if exists "catalog_read" on public.courses;
create policy "catalog_read" on public.courses for select using (true);
drop policy if exists "catalog_read" on public.lessons;
create policy "catalog_read" on public.lessons for select using (true);
drop policy if exists "catalog_read" on public.lesson_resources;
create policy "catalog_read" on public.lesson_resources for select using (true);
drop policy if exists "catalog_read" on public.quizzes;
create policy "catalog_read" on public.quizzes for select using (true);
drop policy if exists "catalog_read" on public.quiz_questions;
create policy "catalog_read" on public.quiz_questions for select using (true);
drop policy if exists "catalog_read" on public.quiz_options;
create policy "catalog_read" on public.quiz_options for select using (true);

-- Owner-only access for user tables in this file.
drop policy if exists "own_rows" on public.enrollments;
create policy "own_rows" on public.enrollments for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own_rows" on public.lesson_progress;
create policy "own_rows" on public.lesson_progress for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own_rows" on public.quiz_attempts;
create policy "own_rows" on public.quiz_attempts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
