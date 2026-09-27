-- STELLAR: Daily login streak with XP + rare-gem milestone bonuses
-- Run this in Supabase Dashboard > SQL Editor AFTER 001-013
--
-- Rules (server-authoritative - streak_count and last_login_date live only
-- on this table and are only ever changed by process_login_streak(), a
-- SECURITY DEFINER function; the client never writes them directly, so a
-- user can't just fast-forward their own streak or backdate a login):
--   - Logging in on a new calendar day (server's current_date) bumps the
--     streak by 1 and awards streak_count * 10 XP for that day.
--   - Logging in again the same day is a no-op (already counted).
--   - Missing up to 4 days in a row still just bumps the streak by 1 on
--     return - only a 5+ day gap resets the streak back to 1.
--   - Every 10th day (10, 20, 30, ...) also grants 5 rare gems.

create table if not exists public.user_streaks (
  user_id uuid primary key references public.profiles(user_id) on delete cascade,
  streak_count int not null default 0 check (streak_count >= 0),
  last_login_date date,
  updated_at timestamptz not null default now()
);

drop trigger if exists user_streaks_updated_at on public.user_streaks;
create trigger user_streaks_updated_at before update on public.user_streaks
  for each row execute function public.handle_updated_at();

-- RLS enabled with NO policies: nobody can read or write this table
-- directly through PostgREST. process_login_streak() (below) is the only
-- way in or out - it runs as SECURITY DEFINER, which bypasses RLS.
alter table public.user_streaks enable row level security;

-- login_streak joins the existing lesson_complete/quiz_pass/spend kinds so
-- streak bonuses show up in the same "Recent XP history" the other rewards
-- already use.
alter table public.xp_ledger drop constraint if exists xp_ledger_kind_check;
alter table public.xp_ledger add constraint xp_ledger_kind_check
  check (kind in ('lesson_complete', 'quiz_pass', 'spend', 'login_streak'));

create or replace function public.process_login_streak()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_row public.user_streaks%rowtype;
  v_today date := current_date;
  v_days_since int;
  v_new_streak int;
  v_xp int;
  v_gems int := 0;
  v_is_milestone boolean := false;
begin
  if v_user is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select * into v_row from public.user_streaks where user_id = v_user for update;

  if not found then
    insert into public.user_streaks (user_id, streak_count, last_login_date)
    values (v_user, 1, v_today);
    v_new_streak := 1;
  else
    if v_row.last_login_date = v_today then
      return jsonb_build_object(
        'ok', true, 'alreadyCounted', true,
        'streak', v_row.streak_count, 'xpAwarded', 0, 'gemsAwarded', 0
      );
    end if;

    v_days_since := v_today - v_row.last_login_date;
    v_new_streak := case when v_days_since >= 5 then 1 else v_row.streak_count + 1 end;

    update public.user_streaks
    set streak_count = v_new_streak, last_login_date = v_today
    where user_id = v_user;
  end if;

  v_xp := v_new_streak * 10;
  if v_new_streak % 10 = 0 then
    v_gems := 5;
    v_is_milestone := true;
  end if;

  update public.profiles set xp_total = xp_total + v_xp, updated_at = now() where user_id = v_user;

  insert into public.xp_ledger (user_id, kind, xp, coins, note)
  values (
    v_user, 'login_streak', v_xp, 0,
    case when v_is_milestone
      then format('Day %s login streak - +5 rare gems', v_new_streak)
      else format('Day %s login streak', v_new_streak)
    end
  );

  if v_gems > 0 then
    insert into public.player_resources (user_id, rare_gem)
    values (v_user, v_gems)
    on conflict (user_id) do update set rare_gem = public.player_resources.rare_gem + v_gems;
  end if;

  return jsonb_build_object(
    'ok', true, 'alreadyCounted', false,
    'streak', v_new_streak, 'xpAwarded', v_xp, 'gemsAwarded', v_gems, 'isMilestone', v_is_milestone
  );
end;
$$;

grant execute on function public.process_login_streak() to authenticated;
