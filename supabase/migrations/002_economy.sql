-- STELLAR economy: profiles + append-only reward ledger (run after 001)

create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default 'Stellar Cadet',
  xp_total int not null default 0 check (xp_total >= 0),
  coins int not null default 0 check (coins >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.xp_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('lesson_complete', 'quiz_pass', 'spend')),
  ref_lesson_id uuid references public.lessons (id) on delete set null,
  ref_quiz_id uuid references public.quizzes (id) on delete set null,
  ref_attempt_id uuid references public.quiz_attempts (id) on delete set null,
  xp int not null default 0,
  coins int not null default 0,
  note text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists xp_ledger_user_idx on public.xp_ledger (user_id, created_at desc);
create unique index if not exists xp_ledger_once_lesson on public.xp_ledger (user_id, ref_lesson_id)
  where kind = 'lesson_complete' and ref_lesson_id is not null;
create unique index if not exists xp_ledger_once_quiz on public.xp_ledger (user_id, ref_quiz_id)
  where kind = 'quiz_pass' and ref_quiz_id is not null;

alter table public.profiles enable row level security;
alter table public.xp_ledger enable row level security;

drop policy if exists "own_rows" on public.xp_ledger;
create policy "own_rows" on public.xp_ledger for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Profiles: readable by all for leaderboard, writable by owner only.
drop policy if exists "profiles_read" on public.profiles;
create policy "profiles_read" on public.profiles for select using (true);
drop policy if exists "profiles_write_own" on public.profiles;
create policy "profiles_write_own" on public.profiles for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
