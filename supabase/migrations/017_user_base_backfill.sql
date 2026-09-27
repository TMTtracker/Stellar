-- STELLAR: fix "can't move the camp" - user_base rows only ever got created
-- inside upgrade_base(), so any level-1 player who has never upgraded yet
-- has no row at all. moveBase()/rotateBase() are plain client updates
-- (see src/services/base.js), and an UPDATE against a row that doesn't
-- exist silently affects zero rows - no error, just nothing happens.
--
-- Run this in Supabase Dashboard > SQL Editor AFTER 016.

-- 1. Backfill: every existing player gets a level-1 base row now.
insert into public.user_base (user_id)
select user_id from public.profiles
on conflict (user_id) do nothing;

-- 2. Every new signup gets one too, so this can never recur.
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

  insert into public.player_resources (user_id, bricks, timber, stone)
  values (new.id, 11, 14, 6)
  on conflict (user_id) do nothing;

  insert into public.user_base (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

-- 3. Since every row is now guaranteed to exist by signup time (or by this
-- backfill for existing players), the client never actually needs to
-- INSERT into user_base itself - only UPDATE its own pos_x/pos_y/rotation
-- (already column-restricted in 016) and upgrade_base() still creates a row
-- defensively as SECURITY DEFINER, unaffected by this. Removing the client
-- INSERT grant closes what would otherwise be a way to insert an arbitrary
-- base_level directly (RLS's `with check` only verifies ownership, not the
-- column values).
drop policy if exists "users insert own base" on public.user_base;
revoke insert on public.user_base from authenticated;
