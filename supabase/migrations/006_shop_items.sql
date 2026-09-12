-- STELLAR Shop Items
-- Run this in Supabase Dashboard > SQL Editor AFTER 001-005
--
-- Fixes a real bug: the Shop page ("Bundle of Bricks x5" etc.) was calling
-- the generic spend_coins() RPC, which only ever touched profiles.coins -
-- it predates player_resources and has no idea a "bricks" bundle should
-- grant materials. Coins were correctly deducted; nothing ever granted the
-- bricks/timber. buy_shop_item() replaces that call with one atomic RPC
-- that both spends the coins and grants the matching material, using the
-- same non-throwing { ok, ... } shape as spend_coins/buy_missing_materials.
--
-- The 3 items/prices here mirror the `items` array already hardcoded in
-- src/Pages/Shop/index.jsx (there's no shop_items table - just 3 fixed
-- items, so a small server-side case matches the existing scale rather
-- than introducing a whole catalog table for it).

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
