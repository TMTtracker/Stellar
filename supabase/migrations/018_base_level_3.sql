-- STELLAR: configure base Level 3 (SM_House_level_3.glb)
-- Run this in Supabase Dashboard > SQL Editor AFTER 001-017
--
-- Requirements: account level 3, plus glass/timber("wood")/stone - amounts
-- follow the same order of magnitude as level 2's 10 bricks/10 timber; easy
-- to retune later by re-running this insert with different numbers.

insert into public.base_levels (level, name, model_key, unlock_level, glass_required, timber_required, stone_required)
values (3, 'Level 3 Base', 'house_level_3', 3, 10, 10, 10)
on conflict (level) do update set
  name = excluded.name,
  model_key = excluded.model_key,
  unlock_level = excluded.unlock_level,
  glass_required = excluded.glass_required,
  timber_required = excluded.timber_required,
  stone_required = excluded.stone_required;
