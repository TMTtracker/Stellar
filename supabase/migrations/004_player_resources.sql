-- STELLAR Player Resources + Buildings
-- Run this in Supabase Dashboard > SQL Editor AFTER 001_course_system.sql and 002_economy.sql
-- (user_id columns reference public.profiles, so 002 must already exist)

-- ============================================================
-- PLAYER RESOURCES (build-material inventory, one row per user)
-- Earned by completing lessons (see lessons.material_name/material_qty
-- in 001), spent on buildings (see build_menu below). Granting/spending
-- isn't wired up yet - this migration is schema only. Like profiles'
-- xp_total/coins, there is no direct client UPDATE policy - balances are
-- meant to change only via a future SECURITY DEFINER RPC (same shape as
-- award_lesson_complete in 002), so a player can't edit their own count.
-- ============================================================
create table if not exists public.player_resources (
  user_id uuid primary key references public.profiles(user_id) on delete cascade,
  bricks int not null default 0 check (bricks >= 0),
  timber int not null default 0 check (timber >= 0),
  rare_gem int not null default 0 check (rare_gem >= 0),
  stone int not null default 0 check (stone >= 0),
  iron int not null default 0 check (iron >= 0),
  glass int not null default 0 check (glass >= 0),
  crystal_shard int not null default 0 check (crystal_shard >= 0),
  fabric int not null default 0 check (fabric >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists player_resources_updated_at on public.player_resources;
create trigger player_resources_updated_at before update on public.player_resources
  for each row execute function public.handle_updated_at();

alter table public.player_resources enable row level security;

-- Public read (same as profiles' xp_total/coins), self-insert only, no
-- update/delete - matches the "balances change only via RPC" security
-- posture already used for profiles/xp_ledger.
drop policy if exists "resources readable by everyone" on public.player_resources;
create policy "resources readable by everyone"
  on public.player_resources for select
  using (true);

drop policy if exists "users create own resources" on public.player_resources;
create policy "users create own resources"
  on public.player_resources for insert
  to authenticated
  with check (user_id = auth.uid());

-- Auto-provision a starter resources row alongside the profile row on
-- signup, same as profiles itself. Redefines handle_new_user() from 002
-- (adds one insert; the display_name logic is untouched) - safe since
-- the on_auth_user_created trigger from 002 already calls this function.
-- Bricks/timber/stone start with a small welcome amount; every other
-- material (rare_gem, iron, glass, crystal_shard, fabric) stays at its
-- column default of 0 - earned only by completing lessons later.
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

-- ============================================================
-- BUILD MENU (building catalog: what can be built, at what cost)
-- Resource requirements are placeholder test-phase values and
-- unlock_level is pinned at 1 for every building for now, per request -
-- tune these later once the real economy/leveling balance is decided.
-- rare_gem_required is capped at 0-3 (gems are meant to be rare); the
-- other materials are 0-10. All 4 buildings below only actually need
-- bricks/timber/rare_gem - stone/iron/glass/fabric/crystal_shard are
-- zeroed out for now, ready for future buildings that do need them.
-- ============================================================
create table if not exists public.build_menu (
  id text primary key,
  name text not null,
  unlock_level int not null default 1,
  bricks_required int not null default 0 check (bricks_required >= 0),
  timber_required int not null default 0 check (timber_required >= 0),
  rare_gem_required int not null default 0,
  stone_required int not null default 0 check (stone_required >= 0),
  iron_required int not null default 0 check (iron_required >= 0),
  glass_required int not null default 0 check (glass_required >= 0),
  fabric_required int not null default 0 check (fabric_required >= 0),
  crystal_shard_required int not null default 0 check (crystal_shard_required >= 0),
  coin_cost int not null default 0 check (coin_cost >= 0)
);

-- Idempotent for anyone who already ran the original version of this
-- migration (before these columns existed) - adding them again is a
-- no-op if they're already there.
alter table public.build_menu add column if not exists stone_required int not null default 0 check (stone_required >= 0);
alter table public.build_menu add column if not exists iron_required int not null default 0 check (iron_required >= 0);
alter table public.build_menu add column if not exists glass_required int not null default 0 check (glass_required >= 0);
alter table public.build_menu add column if not exists fabric_required int not null default 0 check (fabric_required >= 0);
alter table public.build_menu add column if not exists crystal_shard_required int not null default 0 check (crystal_shard_required >= 0);

-- Named so it can be safely redefined (rare_gem_required had no upper
-- bound in the original version of this migration).
alter table public.build_menu drop constraint if exists build_menu_rare_gem_required_range;
alter table public.build_menu add constraint build_menu_rare_gem_required_range check (rare_gem_required between 0 and 3);

insert into public.build_menu (
  id, name, unlock_level,
  bricks_required, timber_required, rare_gem_required,
  stone_required, iron_required, glass_required, fabric_required, crystal_shard_required,
  coin_cost
)
values
  ('data_structures_hall', 'Data_structures_hall', 1, 6, 4, 0, 0, 0, 0, 0, 0, 60),
  ('algorithms_tower', 'Algorithms_tower', 1, 0, 7, 3, 0, 0, 0, 0, 0, 80),
  ('interview_prep_dojo', 'Interview_prep_dojo', 1, 5, 0, 2, 0, 0, 0, 0, 0, 70),
  ('coding_coliseum', 'Coding_coliseum', 20, 8, 6, 3, 0, 0, 0, 0, 0, 150)
on conflict (id) do update set
  name = excluded.name,
  unlock_level = excluded.unlock_level,
  bricks_required = excluded.bricks_required,
  timber_required = excluded.timber_required,
  rare_gem_required = excluded.rare_gem_required,
  stone_required = excluded.stone_required,
  iron_required = excluded.iron_required,
  glass_required = excluded.glass_required,
  fabric_required = excluded.fabric_required,
  crystal_shard_required = excluded.crystal_shard_required,
  coin_cost = excluded.coin_cost;

alter table public.build_menu enable row level security;

-- MVP: readable by everyone, manageable by any authenticated user - same
-- looseness as courses/lessons in 001 ("locked down later by role").
drop policy if exists "build menu readable by everyone" on public.build_menu;
create policy "build menu readable by everyone"
  on public.build_menu for select
  using (true);

drop policy if exists "authenticated can manage build menu" on public.build_menu;
create policy "authenticated can manage build menu"
  on public.build_menu for insert
  to authenticated
  with check (true);

drop policy if exists "authenticated can update build menu" on public.build_menu;
create policy "authenticated can update build menu"
  on public.build_menu for update
  to authenticated
  using (true);

-- ============================================================
-- USER BUILDING POSITIONS (placed buildings - one row per building a
-- user has placed on their world map; drives the map/grid rendering)
-- ============================================================
create table if not exists public.user_building_positions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  build_id text not null references public.build_menu(id) on delete cascade,
  pos_x int not null,
  pos_y int not null,
  rotation int not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, pos_x, pos_y)
);

create index if not exists user_building_positions_user_idx on public.user_building_positions (user_id);
create index if not exists user_building_positions_build_idx on public.user_building_positions (build_id);

alter table public.user_building_positions enable row level security;

-- Public read (it's world-map content, not sensitive - matches the
-- profiles/courses/build_menu "readable by everyone" pattern); writes
-- scoped to your own placements only.
drop policy if exists "building positions readable by everyone" on public.user_building_positions;
create policy "building positions readable by everyone"
  on public.user_building_positions for select
  using (true);

drop policy if exists "users place own buildings" on public.user_building_positions;
create policy "users place own buildings"
  on public.user_building_positions for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "users move own buildings" on public.user_building_positions;
create policy "users move own buildings"
  on public.user_building_positions for update
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "users remove own buildings" on public.user_building_positions;
create policy "users remove own buildings"
  on public.user_building_positions for delete
  to authenticated
  using (user_id = auth.uid());
