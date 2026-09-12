-- STELLAR Build Actions
-- Run this in Supabase Dashboard > SQL Editor AFTER 001-004
--
-- Adds the missing "make it functional" half of 004_player_resources.sql:
--   1. award_lesson_complete() is redefined to also grant the lesson's
--      material reward (lessons.material_name/material_qty) into
--      player_resources, once-ever, in the same breath as XP/coins - and
--      to return the granted material in its response so the UI can show
--      "+2 Bricks" the same way it already shows "+40 XP".
--   2. build_structure(p_build_id) - checks the caller has every required
--      material for that building, deducts them atomically, and places it
--      (auto-assigning a grid slot - there's no placement UI yet).
--   3. buy_missing_materials(p_build_id) - spends build_menu.coin_cost to
--      top every required material up to its requirement (never lowers a
--      material the player already has enough of).
-- Both RPCs return { ok, ... } and never throw for "not enough X" (same
-- non-throwing shape as spend_coins), so the client can branch on res.ok
-- exactly like the Shop page already does.

-- ============================================================
-- 1. award_lesson_complete() - now also grants the lesson's material
-- ============================================================
create or replace function public.award_lesson_complete(p_lesson_id uuid)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_xp int;
  v_coins int;
  v_material_name text;
  v_material_qty int;
  v_inserted int;
  v_xp_total int;
  v_coins_total int;
begin
  if v_user is null then raise exception 'Not authenticated'; end if;

  select xp_reward, coins_reward, material_name, material_qty
  into v_xp, v_coins, v_material_name, v_material_qty
  from public.lessons where id = p_lesson_id;
  if not found then raise exception 'Lesson not found'; end if;

  insert into public.profiles (user_id) values (v_user) on conflict (user_id) do nothing;
  insert into public.player_resources (user_id) values (v_user) on conflict (user_id) do nothing;

  insert into public.xp_ledger (user_id, kind, ref_lesson_id, xp, coins)
  values (v_user, 'lesson_complete', p_lesson_id, v_xp, v_coins)
  on conflict do nothing;
  get diagnostics v_inserted = row_count;

  if v_inserted = 1 then
    update public.profiles
    set xp_total = xp_total + v_xp,
        coins = coins + v_coins
    where user_id = v_user;

    -- Grant the material reward too, gated by the same once-ever insert
    -- above so re-completing a lesson can't re-grant it.
    if v_material_name is not null and v_material_qty is not null and v_material_qty > 0 then
      case v_material_name
        when 'Bricks' then update public.player_resources set bricks = bricks + v_material_qty where user_id = v_user;
        when 'Timber' then update public.player_resources set timber = timber + v_material_qty where user_id = v_user;
        when 'Rare gem' then update public.player_resources set rare_gem = rare_gem + v_material_qty where user_id = v_user;
        when 'Stone' then update public.player_resources set stone = stone + v_material_qty where user_id = v_user;
        when 'Iron' then update public.player_resources set iron = iron + v_material_qty where user_id = v_user;
        when 'Glass' then update public.player_resources set glass = glass + v_material_qty where user_id = v_user;
        when 'Crystal shard' then update public.player_resources set crystal_shard = crystal_shard + v_material_qty where user_id = v_user;
        when 'Fabric' then update public.player_resources set fabric = fabric + v_material_qty where user_id = v_user;
        else null; -- unrecognized material name - skip rather than error
      end case;
    end if;
  end if;

  select xp_total, coins into v_xp_total, v_coins_total
  from public.profiles where user_id = v_user;

  return jsonb_build_object(
    'awarded', v_inserted = 1,
    'xp', v_xp,
    'coins', v_coins,
    'xp_total', v_xp_total,
    'coins_total', v_coins_total,
    'material_name', case when v_inserted = 1 then v_material_name else null end,
    'material_qty', case when v_inserted = 1 then v_material_qty else null end
  );
end;
$$;

-- ============================================================
-- 2. build_structure(p_build_id) - place a building if the player has
-- every required material. No placement UI exists yet, so the grid slot
-- is auto-assigned server-side (a simple 5-wide row-filling pattern) -
-- purely to satisfy user_building_positions' unique(user_id,pos_x,pos_y).
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
  v_next_slot int;
  v_pos_x int;
  v_pos_y int;
begin
  if v_user is null then raise exception 'Not authenticated'; end if;

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

  select count(*) into v_next_slot from public.user_building_positions where user_id = v_user;
  v_pos_x := v_next_slot % 5;
  v_pos_y := v_next_slot / 5;

  insert into public.user_building_positions (user_id, build_id, pos_x, pos_y)
  values (v_user, p_build_id, v_pos_x, v_pos_y);

  return jsonb_build_object('ok', true, 'pos_x', v_pos_x, 'pos_y', v_pos_y);
end;
$$;

-- ============================================================
-- 3. buy_missing_materials(p_build_id) - spend coin_cost to top every
-- required material up to its requirement (greatest() never lowers one
-- the player already has enough of).
-- ============================================================
create or replace function public.buy_missing_materials(p_build_id text)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_cost int;
  v_bricks_req int; v_timber_req int; v_gem_req int;
  v_stone_req int; v_iron_req int; v_glass_req int; v_fabric_req int; v_shard_req int;
  v_balance int;
begin
  if v_user is null then raise exception 'Not authenticated'; end if;

  select coin_cost, bricks_required, timber_required, rare_gem_required,
         stone_required, iron_required, glass_required, fabric_required, crystal_shard_required
  into v_cost, v_bricks_req, v_timber_req, v_gem_req, v_stone_req, v_iron_req, v_glass_req, v_fabric_req, v_shard_req
  from public.build_menu where id = p_build_id;
  if not found then raise exception 'Building not found'; end if;

  insert into public.profiles (user_id) values (v_user) on conflict (user_id) do nothing;
  insert into public.player_resources (user_id) values (v_user) on conflict (user_id) do nothing;

  select coins into v_balance from public.profiles where user_id = v_user for update;
  if v_balance < v_cost then
    return jsonb_build_object('ok', false, 'error', 'insufficient_funds', 'coins', v_balance);
  end if;

  update public.profiles set coins = coins - v_cost where user_id = v_user;

  update public.player_resources set
    bricks = greatest(bricks, v_bricks_req),
    timber = greatest(timber, v_timber_req),
    rare_gem = greatest(rare_gem, v_gem_req),
    stone = greatest(stone, v_stone_req),
    iron = greatest(iron, v_iron_req),
    glass = greatest(glass, v_glass_req),
    fabric = greatest(fabric, v_fabric_req),
    crystal_shard = greatest(crystal_shard, v_shard_req)
  where user_id = v_user;

  insert into public.xp_ledger (user_id, kind, xp, coins, note)
  values (v_user, 'spend', 0, -v_cost, 'buy_missing_materials:' || p_build_id);

  return jsonb_build_object('ok', true, 'coins', v_balance - v_cost);
end;
$$;

grant execute on function public.build_structure(text) to authenticated;
grant execute on function public.buy_missing_materials(text) to authenticated;
