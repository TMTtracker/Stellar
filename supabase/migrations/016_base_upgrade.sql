-- STELLAR: Home base upgrades (Level 1 camp -> Level 2-6)
-- Run this in Supabase Dashboard > SQL Editor AFTER 001-015
--
-- Level 1 is the starting camp - free, always owned, never a "level" a
-- player builds toward. Levels 2-6 are real upgrades: each needs the
-- player's own account level (derived from XP, same curve as
-- src/lib/economy.js) plus a set of build materials. Only level 2 is
-- configured for now (the SM_house.glb model) - levels 3-6 stay in the
-- schema for later but simply won't be offered until a catalog row exists
-- for them (see base_levels below).

-- Mirrors levelForXp() in src/lib/economy.js exactly - kept in one place so
-- the server can verify a player's account level itself instead of trusting
-- whatever the client claims.
create or replace function public.level_for_xp(p_xp int)
returns int
language sql
immutable
as $$
  select greatest(1, floor((1 + sqrt(1 + (8.0 * greatest(0, p_xp)) / 100)) / 2))::int;
$$;

-- Catalog: what each base level costs. Public read, same posture as
-- build_menu (a recipe list isn't sensitive).
create table if not exists public.base_levels (
  level int primary key check (level between 2 and 6),
  name text not null,
  model_key text not null,
  unlock_level int not null default 1,
  bricks_required int not null default 0,
  timber_required int not null default 0,
  rare_gem_required int not null default 0,
  stone_required int not null default 0,
  iron_required int not null default 0,
  glass_required int not null default 0,
  crystal_shard_required int not null default 0,
  fabric_required int not null default 0
);

alter table public.base_levels enable row level security;
drop policy if exists "base levels readable by everyone" on public.base_levels;
create policy "base levels readable by everyone" on public.base_levels for select using (true);

insert into public.base_levels (level, name, model_key, unlock_level, bricks_required, timber_required)
values (2, 'Level 2 Base', 'house', 2, 10, 10)
on conflict (level) do update set
  name = excluded.name,
  model_key = excluded.model_key,
  unlock_level = excluded.unlock_level,
  bricks_required = excluded.bricks_required,
  timber_required = excluded.timber_required;

-- One row per player: their current base level and where it sits/faces on
-- the world grid (same grid units as user_building_positions), so it can be
-- moved/rotated with the exact same tool as any other building.
create table if not exists public.user_base (
  user_id uuid primary key references public.profiles(user_id) on delete cascade,
  base_level int not null default 1 check (base_level between 1 and 6),
  pos_x int not null default 0,
  pos_y int not null default 0,
  rotation int not null default 0,
  updated_at timestamptz not null default now()
);

drop trigger if exists user_base_updated_at on public.user_base;
create trigger user_base_updated_at before update on public.user_base
  for each row execute function public.handle_updated_at();

alter table public.user_base enable row level security;

-- Public read (world-map content, matches user_building_positions).
drop policy if exists "base readable by everyone" on public.user_base;
create policy "base readable by everyone" on public.user_base for select using (true);

-- Owner can move/rotate their own base directly (same posture as an
-- already-placed building) - but NOT its base_level column, see the
-- column-level grant below. RLS policies can't restrict by column, so the
-- restriction is enforced at the privilege level instead.
drop policy if exists "users move own base" on public.user_base;
create policy "users move own base" on public.user_base for update to authenticated using (user_id = auth.uid());
drop policy if exists "users insert own base" on public.user_base;
create policy "users insert own base" on public.user_base for insert to authenticated with check (user_id = auth.uid());

revoke update on public.user_base from authenticated;
grant select, insert on public.user_base to authenticated;
grant update (pos_x, pos_y, rotation) on public.user_base to authenticated;

-- Upgrading the base level is RPC-only (spends materials + checks account
-- level), matching build_structure's pattern.
create or replace function public.upgrade_base()
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_xp int;
  v_account_level int;
  v_base record;
  v_next_level int;
  v_req record;
  v_res record;
begin
  if v_user is null then raise exception 'Not authenticated'; end if;

  insert into public.user_base (user_id) values (v_user) on conflict (user_id) do nothing;
  insert into public.player_resources (user_id) values (v_user) on conflict (user_id) do nothing;

  select xp_total into v_xp from public.profiles where user_id = v_user;
  v_account_level := public.level_for_xp(coalesce(v_xp, 0));

  select * into v_base from public.user_base where user_id = v_user for update;
  v_next_level := v_base.base_level + 1;

  if v_next_level > 6 then
    return jsonb_build_object('ok', false, 'error', 'max_level');
  end if;

  select * into v_req from public.base_levels where level = v_next_level;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_configured');
  end if;

  if v_account_level < v_req.unlock_level then
    return jsonb_build_object('ok', false, 'error', 'level_too_low', 'requiredLevel', v_req.unlock_level, 'accountLevel', v_account_level);
  end if;

  select * into v_res from public.player_resources where user_id = v_user for update;

  if v_res.bricks < v_req.bricks_required or v_res.timber < v_req.timber_required
     or v_res.rare_gem < v_req.rare_gem_required or v_res.stone < v_req.stone_required
     or v_res.iron < v_req.iron_required or v_res.glass < v_req.glass_required
     or v_res.crystal_shard < v_req.crystal_shard_required or v_res.fabric < v_req.fabric_required then
    return jsonb_build_object('ok', false, 'error', 'insufficient_materials');
  end if;

  update public.player_resources set
    bricks = bricks - v_req.bricks_required,
    timber = timber - v_req.timber_required,
    rare_gem = rare_gem - v_req.rare_gem_required,
    stone = stone - v_req.stone_required,
    iron = iron - v_req.iron_required,
    glass = glass - v_req.glass_required,
    crystal_shard = crystal_shard - v_req.crystal_shard_required,
    fabric = fabric - v_req.fabric_required
  where user_id = v_user;

  update public.user_base set base_level = v_next_level where user_id = v_user;

  return jsonb_build_object('ok', true, 'base_level', v_next_level);
end;
$$;

grant execute on function public.upgrade_base() to authenticated;
