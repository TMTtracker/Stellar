-- STELLAR: XP boost consumable
-- Run this in Supabase Dashboard > SQL Editor AFTER 001-014
--
-- The Shop's "XP boost (2x, 1 hour)" item and the Dashboard's Inventory
-- "Use" button were both pure UI mockups - buying it spent coins and
-- granted nothing, and the "x3" count and "Use" button did nothing at all.
-- This wires up a real consumable: buying it grants a charge
-- (xp_boost_charges), using a charge (activate_xp_boost) starts a 1-hour
-- window (xp_boost_until) during which award_lesson_complete's caller
-- (see src/services/wallet.js) doubles the lesson's XP reward.

alter table public.profiles add column if not exists xp_boost_charges int not null default 0 check (xp_boost_charges >= 0);
alter table public.profiles add column if not exists xp_boost_until timestamptz;

-- Redefine buy_shop_item so the xp-boost item actually grants a charge
-- instead of silently doing nothing (everything else here is unchanged
-- from 006_shop_items.sql).
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

-- Spend one charge to start (or restart) a 1-hour 2x XP window.
create or replace function public.activate_xp_boost()
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_charges int;
  v_until timestamptz;
begin
  if v_user is null then raise exception 'Not authenticated'; end if;

  insert into public.profiles (user_id) values (v_user) on conflict (user_id) do nothing;

  select xp_boost_charges into v_charges from public.profiles where user_id = v_user for update;
  if coalesce(v_charges, 0) < 1 then
    return jsonb_build_object('ok', false, 'error', 'no_charges');
  end if;

  v_until := now() + interval '1 hour';
  update public.profiles
  set xp_boost_charges = xp_boost_charges - 1,
      xp_boost_until = v_until
  where user_id = v_user;

  return jsonb_build_object('ok', true, 'xp_boost_until', v_until, 'charges', v_charges - 1);
end;
$$;

grant execute on function public.buy_shop_item(text) to authenticated;
grant execute on function public.activate_xp_boost() to authenticated;
