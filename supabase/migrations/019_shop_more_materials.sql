-- STELLAR: Shop - add Stone/Iron/Glass/Fabric/Crystal shard bundles
-- Run this in Supabase Dashboard > SQL Editor AFTER 001-018
--
-- Same buy_shop_item() as before (015_xp_boost.sql), just with 5 more item
-- ids matching the new cards in src/Pages/Shop/index.jsx. The material-grant
-- switch below it already handles every material name - only the price
-- list needed the new entries.

create or replace function public.buy_shop_item(p_item_id text)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_price int;
  v_material_name text;
  v_material_qty int;
  v_balance int;
begin
  if v_user is null then raise exception 'Not authenticated'; end if;

  case p_item_id
    when 'bricks-5' then v_price := 50; v_material_name := 'Bricks'; v_material_qty := 5;
    when 'timber-5' then v_price := 90; v_material_name := 'Timber'; v_material_qty := 5;
    when 'stone-10' then v_price := 40; v_material_name := 'Stone'; v_material_qty := 10;
    when 'iron-10' then v_price := 50; v_material_name := 'Iron'; v_material_qty := 10;
    when 'glass-10' then v_price := 20; v_material_name := 'Glass'; v_material_qty := 10;
    when 'fabric-10' then v_price := 20; v_material_name := 'Fabric'; v_material_qty := 10;
    when 'crystal-shard-10' then v_price := 40; v_material_name := 'Crystal shard'; v_material_qty := 10;
    when 'xp-boost' then v_price := 120; v_material_name := null; v_material_qty := null;
    else raise exception 'Unknown shop item: %', p_item_id;
  end case;

  insert into public.profiles (user_id) values (v_user) on conflict (user_id) do nothing;
  insert into public.player_resources (user_id) values (v_user) on conflict (user_id) do nothing;

  select coins into v_balance from public.profiles where user_id = v_user for update;
  if v_balance < v_price then
    return jsonb_build_object('ok', false, 'error', 'insufficient_funds', 'coins', v_balance);
  end if;

  update public.profiles set coins = coins - v_price where user_id = v_user;

  if p_item_id = 'xp-boost' then
    update public.profiles set xp_boost_charges = xp_boost_charges + 1 where user_id = v_user;
  end if;

  if v_material_name is not null and v_material_qty > 0 then
    case v_material_name
      when 'Bricks' then update public.player_resources set bricks = bricks + v_material_qty where user_id = v_user;
      when 'Timber' then update public.player_resources set timber = timber + v_material_qty where user_id = v_user;
      when 'Rare gem' then update public.player_resources set rare_gem = rare_gem + v_material_qty where user_id = v_user;
      when 'Stone' then update public.player_resources set stone = stone + v_material_qty where user_id = v_user;
      when 'Iron' then update public.player_resources set iron = iron + v_material_qty where user_id = v_user;
      when 'Glass' then update public.player_resources set glass = glass + v_material_qty where user_id = v_user;
      when 'Crystal shard' then update public.player_resources set crystal_shard = crystal_shard + v_material_qty where user_id = v_user;
      when 'Fabric' then update public.player_resources set fabric = fabric + v_material_qty where user_id = v_user;
      else null;
    end case;
  end if;

  insert into public.xp_ledger (user_id, kind, xp, coins, note)
  values (v_user, 'spend', 0, -v_price, 'shop:' || p_item_id);

  return jsonb_build_object('ok', true, 'coins', v_balance - v_price);
end;
$$;

grant execute on function public.buy_shop_item(text) to authenticated;
