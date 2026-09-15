-- STELLAR Community interactions: likes + comments (run after 003_community_posts.sql)

-- Likes: one row per (user, post) to prevent double likes
create table if not exists public.post_likes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.user_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (post_id, user_id)
);
create index if not exists post_likes_post_idx on public.post_likes(post_id);
create index if not exists post_likes_user_idx on public.post_likes(user_id);

-- Comments
create table if not exists public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.user_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index if not exists post_comments_post_idx on public.post_comments(post_id, created_at desc);
create index if not exists post_comments_user_idx on public.post_comments(user_id);

-- Keep counters in sync via triggers
create or replace function public.sync_post_likes_count() returns trigger language plpgsql as $$
begin
  if (TG_OP = 'INSERT') then
    update public.user_posts set post_likes = post_likes + 1 where id = NEW.post_id;
    return NEW;
  elsif (TG_OP = 'DELETE') then
    update public.user_posts set post_likes = greatest(0, post_likes - 1) where id = OLD.post_id;
    return OLD;
  end if;
  return null;
end $$;

drop trigger if exists post_likes_count_sync on public.post_likes;
create trigger post_likes_count_sync after insert or delete on public.post_likes
for each row execute function public.sync_post_likes_count();

create or replace function public.sync_post_comments_count() returns trigger language plpgsql as $$
begin
  if (TG_OP = 'INSERT') then
    update public.user_posts set post_comments = post_comments + 1 where id = NEW.post_id;
    return NEW;
  elsif (TG_OP = 'DELETE') then
    update public.user_posts set post_comments = greatest(0, post_comments - 1) where id = OLD.post_id;
    return OLD;
  end if;
  return null;
end $$;

drop trigger if exists post_comments_count_sync on public.post_comments;
create trigger post_comments_count_sync after insert or delete on public.post_comments
for each row execute function public.sync_post_comments_count();

-- RLS
alter table public.post_likes enable row level security;
alter table public.post_comments enable row level security;

grant select, insert, delete on public.post_likes to authenticated;
grant select, insert, delete on public.post_comments to authenticated;

drop policy if exists "likes readable by everyone" on public.post_likes;
create policy "likes readable by everyone" on public.post_likes for select using (true);
drop policy if exists "users manage own likes" on public.post_likes;
create policy "users manage own likes" on public.post_likes for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "users delete own likes" on public.post_likes;
create policy "users delete own likes" on public.post_likes for delete to authenticated using (user_id = auth.uid());

drop policy if exists "comments readable by everyone" on public.post_comments;
create policy "comments readable by everyone" on public.post_comments for select using (true);
drop policy if exists "users create comments" on public.post_comments;
create policy "users create comments" on public.post_comments for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "users delete own comments" on public.post_comments;
create policy "users delete own comments" on public.post_comments for delete to authenticated using (user_id = auth.uid());
