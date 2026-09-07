-- STELLAR XP + Coins economy
-- Run this in Supabase Dashboard > SQL Editor AFTER 001_course_system.sql
-- https://supabase.com/dashboard/project/ejvasbinuprpapnhgoxp/sql
--
-- Design:
--   profiles   — one row per user: lifetime xp_total + spendable coins balance.
--                Level is DERIVED in the app (see src/lib/economy.js), not stored,
--                so the level formula can change without a data migration.
--   xp_ledger  — append-only history of every grant/spend. Partial unique indexes
--                make lesson/quiz rewards once-ever per user (no double-award,
--                even on re-complete or re-pass).
--   RPCs       — award_lesson_complete / award_quiz_pass / spend_coins run as
--                SECURITY DEFINER so reward amounts come from the lesson/quiz rows
--                server-side (clients can't forge XP) and ledger+balance update
--                atomically. Direct writes to balances are blocked by RLS.

-- ============================================================
-- PROFILES
-- ============================================================
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Stellar Cadet',
  xp_total int not null default 0 check (xp_total >= 0),
  coins int not null default 0 check (coins >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- XP / COINS LEDGER (append-only)
-- kinds: lesson_complete | quiz_pass | spend | grant
-- ============================================================
create table if not exists public.xp_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('lesson_complete', 'quiz_pass', 'spend', 'grant')),
  ref_lesson_id uuid references public.lessons(id) on delete cascade,
  ref_quiz_id uuid references public.quizzes(id) on delete cascade,
  ref_attempt_id uuid references public.quiz_attempts(id) on delete set null,
  xp int not null default 0,
  coins int not null default 0,
  note text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists xp_ledger_user_idx on public.xp_ledger (user_id);
create index if not exists xp_ledger_user_created_idx on public.xp_ledger (user_id, created_at desc);

-- Once-ever rewards: a user can earn lesson_complete for a lesson once,
-- and quiz_pass for a quiz once (first pass). Re-completing / re-passing
-- inserts nothing thanks to these indexes + ON CONFLICT DO NOTHING.
create unique index if not exists xp_ledger_lesson_once
  on public.xp_ledger (user_id, ref_lesson_id) where kind = 'lesson_complete';
create unique index if not exists xp_ledger_quiz_once
  on public.xp_ledger (user_id, ref_quiz_id) where kind = 'quiz_pass';

-- ============================================================
-- updated_at trigger (reuses the helper from 001 if present)
-- ============================================================
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.handle_updated_at();

-- ============================================================
-- Auto-create profile on signup
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (user_id, display_name)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      split_part(coalesce(new.email, 'cadet'), '@', 1)
    )
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- AWARD RPCs (atomic ledger + balance, amounts read server-side)
-- ============================================================

-- Award lesson XP/coins once per (user, lesson). Returns:
-- { awarded, xp, coins, xp_total, coins_total }
create or replace function public.award_lesson_complete(p_lesson_id uuid)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_xp int;
  v_coins int;
  v_inserted int;
  v_xp_total int;
  v_coins_total int;
begin
  if v_user is null then raise exception 'Not authenticated'; end if;

  select xp_reward, coins_reward into v_xp, v_coins
  from public.lessons where id = p_lesson_id;
  if not found then raise exception 'Lesson not found'; end if;

  insert into public.profiles (user_id) values (v_user)
  on conflict (user_id) do nothing;

  insert into public.xp_ledger (user_id, kind, ref_lesson_id, xp, coins)
  values (v_user, 'lesson_complete', p_lesson_id, v_xp, v_coins)
  on conflict do nothing;
  get diagnostics v_inserted = row_count;

  if v_inserted = 1 then
    update public.profiles
    set xp_total = xp_total + v_xp,
        coins = coins + v_coins
    where user_id = v_user;
  end if;

  select xp_total, coins into v_xp_total, v_coins_total
  from public.profiles where user_id = v_user;

  return jsonb_build_object(
    'awarded', v_inserted = 1,
    'xp', v_xp,
    'coins', v_coins,
    'xp_total', v_xp_total,
    'coins_total', v_coins_total
  );
end;
$$;

-- Award quiz XP/coins once per (user, quiz) — on the FIRST pass only.
-- p_attempt_id records which attempt earned it. Returns same shape as above.
create or replace function public.award_quiz_pass(p_quiz_id uuid, p_attempt_id uuid default null)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_lesson_id uuid;
  v_xp int;
  v_coins int;
  v_inserted int;
  v_xp_total int;
  v_coins_total int;
begin
  if v_user is null then raise exception 'Not authenticated'; end if;

  select lesson_id, xp_reward, coins_reward into v_lesson_id, v_xp, v_coins
  from public.quizzes where id = p_quiz_id;
  if not found then raise exception 'Quiz not found'; end if;

  insert into public.profiles (user_id) values (v_user)
  on conflict (user_id) do nothing;

  insert into public.xp_ledger (user_id, kind, ref_quiz_id, ref_attempt_id, ref_lesson_id, xp, coins)
  values (v_user, 'quiz_pass', p_quiz_id, p_attempt_id, v_lesson_id, v_xp, v_coins)
  on conflict do nothing;
  get diagnostics v_inserted = row_count;

  if v_inserted = 1 then
    update public.profiles
    set xp_total = xp_total + v_xp,
        coins = coins + v_coins
    where user_id = v_user;
  end if;

  select xp_total, coins into v_xp_total, v_coins_total
  from public.profiles where user_id = v_user;

  return jsonb_build_object(
    'awarded', v_inserted = 1,
    'xp', v_xp,
    'coins', v_coins,
    'xp_total', v_xp_total,
    'coins_total', v_coins_total
  );
end;
$$;

-- Spend coins (shop purchases, building costs, ...). Fails safely on
-- insufficient funds instead of going negative. Returns:
-- { ok, coins } — coins is the balance after the spend.
create or replace function public.spend_coins(p_amount int, p_note text default '')
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_balance int;
begin
  if v_user is null then raise exception 'Not authenticated'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Invalid amount'; end if;

  insert into public.profiles (user_id) values (v_user)
  on conflict (user_id) do nothing;

  select coins into v_balance from public.profiles
  where user_id = v_user for update;

  if v_balance < p_amount then
    return jsonb_build_object('ok', false, 'error', 'insufficient_funds', 'coins', v_balance);
  end if;

  update public.profiles
  set coins = coins - p_amount
  where user_id = v_user;

  insert into public.xp_ledger (user_id, kind, xp, coins, note)
  values (v_user, 'spend', 0, -p_amount, coalesce(p_note, ''));

  return jsonb_build_object('ok', true, 'coins', v_balance - p_amount);
end;
$$;

-- Update own display name (direct profile UPDATEs are blocked by RLS,
-- so names go through this RPC).
create or replace function public.set_display_name(p_name text)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'Not authenticated'; end if;
  if p_name is null or length(trim(p_name)) = 0 then raise exception 'Invalid name'; end if;
  insert into public.profiles (user_id, display_name)
  values (v_user, trim(p_name))
  on conflict (user_id) do update set display_name = excluded.display_name;
end;
$$;

-- ============================================================
-- Backfill: grant rewards for progress earned before this migration.
-- Idempotent (unique indexes + ON CONFLICT DO NOTHING), safe to re-run.
-- Totals are recomputed authoritatively from the ledger.
-- ============================================================
create or replace function public.backfill_economy()
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (user_id)
  select distinct user_id from public.lesson_progress
  on conflict (user_id) do nothing;

  insert into public.profiles (user_id)
  select distinct user_id from public.quiz_attempts where passed = true
  on conflict (user_id) do nothing;

  insert into public.xp_ledger (user_id, kind, ref_lesson_id, xp, coins)
  select lp.user_id, 'lesson_complete', lp.lesson_id, l.xp_reward, l.coins_reward
  from public.lesson_progress lp
  join public.lessons l on l.id = lp.lesson_id
  on conflict do nothing;

  insert into public.xp_ledger (user_id, kind, ref_quiz_id, ref_attempt_id, ref_lesson_id, xp, coins)
  select distinct on (a.user_id, a.quiz_id)
    a.user_id, 'quiz_pass', a.quiz_id, a.id, a.lesson_id, q.xp_reward, q.coins_reward
  from public.quiz_attempts a
  join public.quizzes q on q.id = a.quiz_id
  where a.passed = true
  order by a.user_id, a.quiz_id, a.completed_at asc
  on conflict do nothing;

  update public.profiles p
  set xp_total = coalesce((select sum(xp) from public.xp_ledger x where x.user_id = p.user_id), 0),
      coins = greatest(0, coalesce((select sum(coins) from public.xp_ledger x where x.user_id = p.user_id), 0)),
      updated_at = now();
end;
$$;

-- ============================================================
-- ROW LEVEL SECURITY
-- Balances can ONLY change via the RPCs above (SECURITY DEFINER
-- bypasses RLS). No direct insert/update/delete policies on the ledger,
-- no direct update/delete on profiles — clients cannot forge currency.
-- ============================================================
alter table public.profiles enable row level security;
alter table public.xp_ledger enable row level security;

drop policy if exists "profiles readable by everyone" on public.profiles;
create policy "profiles readable by everyone"
  on public.profiles for select
  using (true);

drop policy if exists "users create own profile" on public.profiles;
create policy "users create own profile"
  on public.profiles for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "users read own ledger" on public.xp_ledger;
create policy "users read own ledger"
  on public.xp_ledger for select
  to authenticated
  using (user_id = auth.uid());

-- RPC execution rights
grant execute on function public.award_lesson_complete(uuid) to authenticated;
grant execute on function public.award_quiz_pass(uuid, uuid) to authenticated;
grant execute on function public.spend_coins(int, text) to authenticated;
grant execute on function public.set_display_name(text) to authenticated;

-- Grant retroactive rewards for any progress earned so far
select public.backfill_economy();
