-- STELLAR: Building inventory + placement
-- Run this in Supabase Dashboard > SQL Editor AFTER 001-008
--
-- Changes the "Build now" flow: it used to deduct materials AND
-- immediately auto-place the building on the map in one step. Per
-- request, it now only crafts an unplaced instance (into a "Your Builds"
-- inventory) - placing it on the grid, moving it, rotating it, or
-- removing it are separate actions the player does afterward.
--
-- pos_x/pos_y become nullable (null = sitting unplaced in inventory).
-- The old unique(user_id, pos_x, pos_y) is dropped since manual
-- drag-around placement makes strict grid-cell uniqueness impractical to
-- enforce here, and NULL columns wouldn't have collided anyway.

alter table public.user_building_positions alter column pos_x drop not null;
alter table public.user_building_positions alter column pos_y drop not null;
alter table public.user_building_positions add column if not exists placed boolean not null default false;
alter table public.user_building_positions drop constraint if exists user_building_positions_user_id_pos_x_pos_y_key;

-- build_structure() now only checks/deducts materials and creates an
-- unplaced instance - no more auto-assigned grid slot.
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
  v_new_id uuid;
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

  insert into public.user_building_positions (user_id, build_id, placed)
  values (v_user, p_build_id, false)
  returning id into v_new_id;

  return jsonb_build_object('ok', true, 'id', v_new_id);
end;
$$;
