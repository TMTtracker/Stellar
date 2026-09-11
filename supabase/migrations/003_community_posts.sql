-- STELLAR Community Posts
-- Run this in Supabase Dashboard > SQL Editor AFTER 001_course_system.sql and 002_economy.sql
-- (user_id references public.profiles, so 002 must already exist)

create table if not exists public.user_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  post_title text not null,
  post_body text not null default '',
  post_tag text not null default 'Study Help' check (post_tag in ('Study Help', 'Milestone', 'Event', 'Questions')),
  post_likes int not null default 0,
  post_comments int not null default 0,
  post_time timestamptz not null default now()
);

create index if not exists user_posts_user_idx on public.user_posts (user_id);
create index if not exists user_posts_time_idx on public.user_posts (post_time desc);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.user_posts enable row level security;

-- Anyone can read the community feed (matches courses/lessons "readable by everyone")
drop policy if exists "posts readable by everyone" on public.user_posts;
create policy "posts readable by everyone"
  on public.user_posts for select
  using (true);

drop policy if exists "users create own posts" on public.user_posts;
create policy "users create own posts"
  on public.user_posts for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "users update own posts" on public.user_posts;
create policy "users update own posts"
  on public.user_posts for update
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "users delete own posts" on public.user_posts;
create policy "users delete own posts"
  on public.user_posts for delete
  to authenticated
  using (user_id = auth.uid());
