-- STELLAR: Merge the two material stockpiles into one
-- Run this in Supabase Dashboard > SQL Editor AFTER 001-010
--
-- Until now materials lived in TWO tables: `inventories` (lesson/quiz
-- rewards via the client, Profile grid) and `player_resources` (shop/RPC
-- grants, Dashboard build panel). Neither UI saw the other's grants.
-- Canonical table from here on is `player_resources` (it already backs
-- the build RPCs and Dashboard). This migration sums any `inventories`
-- rows into it, drops it, opens owner UPDATE (client grants go through
-- the same direct writes as XP/coins — consistent with profiles), and
-- refreshes the signup trigger accordingly. Safe to re-run.

-- 1. Backfill: sum legacy inventories rows into player_resources.
do $$
begin
  if to_regclass('public.inventories') is not null then
    insert into public.player_resources
      (user_id, bricks, timber, rare_gem, stone, iron, glass, crystal_shard, fabric)
    select user_id, bricks, timber, rare_gems, stone, iron, glass, crystal_shard, fabric
    from public.inventories
    on conflict (user_id) do update set
      bricks = public.player_resources.bricks + excluded.bricks,
      timber = public.player_resources.timber + excluded.timber,
      rare_gem = public.player_resources.rare_gem + excluded.rare_gem,
      stone = public.player_resources.stone + excluded.stone,
      iron = public.player_resources.iron + excluded.iron,
      glass = public.player_resources.glass + excluded.glass,
      crystal_shard = public.player_resources.crystal_shard + excluded.crystal_shard,
      fabric = public.player_resources.fabric + excluded.fabric;

    drop table public.inventories;
  end if;
end $$;

-- 2. Privileges + policies for client-side grants (same posture as
-- profiles/xp_ledger: owner-only writes, no separate UPDATE policy
-- existed before because balances were RPC-only).
grant select, insert, update on public.player_resources to authenticated;

drop policy if exists "users update own resources" on public.player_resources;
create policy "users update own resources"
  on public.player_resources for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- 3. Signup trigger without the dropped inventories insert.
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

  return new;
end;
$$;
