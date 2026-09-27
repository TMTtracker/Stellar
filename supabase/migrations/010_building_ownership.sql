-- STELLAR: Split building ownership from placed instances
-- Run this in Supabase Dashboard > SQL Editor AFTER 001-009
--
-- Until now, one user_building_positions row did double duty as both "I
-- own this building type" and "here's where one instance sits on the
-- grid" - which is why removing an instance from the grid destroyed the
-- fact that you'd ever bought it. Per request, those are now two
-- separate things:
--
--   user_unlocked_buildings - one permanent row per (user, build_id).
--     Created once by build_structure() when first unlocked. Never
--     removed - this is what "Your Builds" lists.
--   user_building_positions - one row per PLACED instance. "Use" in
--     "Your Builds" creates a new one each time (via place_new_building),
--     so an unlocked type can be placed as many times as you want.
--     Removing an instance only deletes that row - ownership is
--     untouched, so the type stays available to place again.

create table if not exists public.user_unlocked_buildings (
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  build_id text not null references public.build_menu(id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, build_id)
);

alter table public.user_unlocked_buildings enable row level security;

drop policy if exists "unlocked buildings readable by everyone" on public.user_unlocked_buildings;
create policy "unlocked buildings readable by everyone"
  on public.user_unlocked_buildings for select
  using (true);

-- No insert/update/delete policy for regular clients - like profiles'
-- balances, this only ever changes via the SECURITY DEFINER RPC below,
-- so a player can't grant themselves ownership of a building for free.

-- ============================================================
-- Backfill: preserve ownership for anything already bought or placed
-- during earlier testing, before cleaning up the old unplaced rows.
-- ============================================================
insert into public.user_unlocked_buildings (user_id, build_id)
select distinct user_id, build_id from public.user_building_positions
on conflict (user_id, build_id) do nothing;

-- Old "crafted but not yet placed" rows are superseded by
-- user_unlocked_buildings above - remove the placeholders so they don't
-- render as phantom instances now that placed-filtering goes away.
delete from public.user_building_positions where placed = false;

alter table public.user_building_positions drop column if exists placed;

-- ============================================================
-- build_structure() now unlocks a building TYPE (permanent), instead of
-- crafting a single-use unplaced instance.
-- ============================================================
create or replace function public.build_structure(p_build_id text)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_bricks_req int; v_timber_req int; v_gem_req int;
  v_stone_req int; v_iron_req int; v_glass_req int; v_fabric_req int; v_shard_req int;
  v_res record;
begin
  if v_user is null then raise exception 'Not authenticated'; end if;

  if exists (select 1 from public.user_unlocked_buildings where user_id = v_user and build_id = p_build_id) then
    return jsonb_build_object('ok', false, 'error', 'already_unlocked');
  end if;

  select bricks_required, timber_required, rare_gem_required,
         stone_required, iron_required, glass_required, fabric_required, crystal_shard_required
  into v_bricks_req, v_timber_req, v_gem_req, v_stone_req, v_iron_req, v_glass_req, v_fabric_req, v_shard_req
  from public.build_menu where id = p_build_id;
  if not found then raise exception 'Building not found'; end if;

  insert into public.player_resources (user_id) values (v_user) on conflict (user_id) do nothing;

  select * into v_res from public.player_resources where user_id = v_user for update;

  if v_res.bricks < v_bricks_req or v_res.timber < v_timber_req or v_res.rare_gem < v_gem_req
     or v_res.stone < v_stone_req or v_res.iron < v_iron_req or v_res.glass < v_glass_req
     or v_res.fabric < v_fabric_req or v_res.crystal_shard < v_shard_req then
    return jsonb_build_object('ok', false, 'error', 'insufficient_materials');
  end if;

  update public.player_resources set
    bricks = bricks - v_bricks_req,
    timber = timber - v_timber_req,
    rare_gem = rare_gem - v_gem_req,
    stone = stone - v_stone_req,
    iron = iron - v_iron_req,
    glass = glass - v_glass_req,
    fabric = fabric - v_fabric_req,
    crystal_shard = crystal_shard - v_shard_req
  where user_id = v_user;

  insert into public.user_unlocked_buildings (user_id, build_id)
  values (v_user, p_build_id)
  on conflict (user_id, build_id) do nothing;

  return jsonb_build_object('ok', true);
end;
$$;

-- ============================================================
-- place_new_building() - creates a fresh placed instance of a building
-- type you already unlocked. Verifying ownership server-side matters
-- here: without it, a client could otherwise INSERT a
-- user_building_positions row for any build_id at all (RLS only checks
-- user_id = auth.uid(), it has no idea whether you ever paid for that
-- type) and place buildings they never unlocked.
-- ============================================================
create or replace function public.place_new_building(p_build_id text, p_pos_x int default 0, p_pos_y int default 0, p_rotation int default 0)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_new_id uuid;
begin
  if v_user is null then raise exception 'Not authenticated'; end if;

  if not exists (select 1 from public.user_unlocked_buildings where user_id = v_user and build_id = p_build_id) then
    return jsonb_build_object('ok', false, 'error', 'not_unlocked');
  end if;

  insert into public.user_building_positions (user_id, build_id, pos_x, pos_y, rotation)
  values (v_user, p_build_id, p_pos_x, p_pos_y, p_rotation)
  returning id into v_new_id;

  return jsonb_build_object('ok', true, 'id', v_new_id);
end;
$$;

grant execute on function public.place_new_building(text, int, int, int) to authenticated;
