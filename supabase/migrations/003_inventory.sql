-- STELLAR inventory: one wide row per user (run after 002)

create table if not exists public.inventories (
  user_id uuid primary key references auth.users (id) on delete cascade,
  bricks int not null default 0 check (bricks >= 0),
  timber int not null default 0 check (timber >= 0),
  rare_gems int not null default 0 check (rare_gems >= 0),
  stone int not null default 0 check (stone >= 0),
  iron int not null default 0 check (iron >= 0),
  glass int not null default 0 check (glass >= 0),
  crystal_shard int not null default 0 check (crystal_shard >= 0),
  fabric int not null default 0 check (fabric >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Migrate legacy user_materials into inventories, then drop it.
-- Guarded so fresh DBs (where user_materials never existed) don't fail.
do $$
begin
  if to_regclass('public.user_materials') is not null then
    insert into public.inventories (user_id, bricks, timber, rare_gems)
    select user_id,
      sum(case when lower(material_name) = 'bricks' then qty else 0 end),
      sum(case when lower(material_name) in ('timber', 'logs') then qty else 0 end),
      sum(case when lower(material_name) in ('rare gem', 'rare gems') then qty else 0 end)
    from public.user_materials
    group by user_id
    on conflict (user_id) do nothing;

    drop table public.user_materials;
  end if;
end $$;

alter table public.inventories enable row level security;

drop policy if exists "own_rows" on public.inventories;
create policy "own_rows" on public.inventories for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Auto-create profile + inventory on signup (runs last: needs 002 + 003 tables).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (user_id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', 'Stellar Cadet'))
  on conflict (user_id) do nothing;
  insert into public.inventories (user_id) values (new.id)
  on conflict (user_id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users for each row execute function public.handle_new_user();
