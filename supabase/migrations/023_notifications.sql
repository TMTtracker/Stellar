-- STELLAR: real student notifications
-- Run this in Supabase Dashboard > SQL Editor AFTER 001-022.
--
-- The bell icon on Dashboard has always been a static, non-functional
-- button. This adds a real notifications table, populated by two SERVER
-- SIDE triggers (so a client can never insert a fake notification for
-- itself or anyone else):
--   1. Someone comments on your post -> post_comments insert trigger.
--   2. You earn a lesson reward (XP/coins/material) -> xp_ledger insert
--      trigger, firing on the 'lesson_complete' kind already written by
--      awardLessonComplete() in src/services/wallet.js.

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('post_comment', 'lesson_reward')),
  title text not null,
  body text not null default '',
  link text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;

drop policy if exists "own notifications" on public.notifications;
create policy "own notifications" on public.notifications for select using (user_id = auth.uid());
drop policy if exists "update own notifications" on public.notifications;
create policy "update own notifications" on public.notifications for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "delete own notifications" on public.notifications;
create policy "delete own notifications" on public.notifications for delete using (user_id = auth.uid());

grant select, update, delete on public.notifications to authenticated;
-- No insert grant/policy for clients - only the SECURITY DEFINER triggers
-- below write to this table, so notifications can't be spoofed.

-- ---------- 1. Someone commented on your post ----------
create or replace function public.notify_post_comment()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_post_owner uuid;
  v_post_title text;
  v_commenter_name text;
begin
  select user_id, post_title into v_post_owner, v_post_title
  from public.user_posts where id = new.post_id;

  -- No post (shouldn't happen, FK guarantees it exists) or commenting on
  -- your own post - don't notify yourself.
  if v_post_owner is null or v_post_owner = new.user_id then
    return new;
  end if;

  select coalesce(display_name, 'Someone') into v_commenter_name
  from public.profiles where user_id = new.user_id;

  insert into public.notifications (user_id, kind, title, body, link)
  values (
    v_post_owner,
    'post_comment',
    coalesce(v_commenter_name, 'Someone') || ' commented on your post',
    left(coalesce(new.body, ''), 140),
    '/communities?post=' || new.post_id::text
  );
  return new;
end;
$$;

drop trigger if exists post_comments_notify on public.post_comments;
create trigger post_comments_notify after insert on public.post_comments
  for each row execute function public.notify_post_comment();

-- ---------- 2. You earned a lesson reward ----------
create or replace function public.notify_lesson_reward()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_lesson record;
  v_body text;
begin
  if new.kind <> 'lesson_complete' or new.ref_lesson_id is null then
    return new;
  end if;

  select title, course_id, material_name, material_qty
  into v_lesson
  from public.lessons where id = new.ref_lesson_id;

  v_body := format('+%s XP, +%s coins', new.xp, new.coins);
  if v_lesson.material_qty is not null and v_lesson.material_qty > 0 then
    v_body := v_body || format(', +%s %s', v_lesson.material_qty, v_lesson.material_name);
  end if;
  v_body := v_body || format(' for completing "%s".', coalesce(v_lesson.title, 'a lesson'));

  insert into public.notifications (user_id, kind, title, body, link)
  values (
    new.user_id,
    'lesson_reward',
    'Lesson reward earned',
    v_body,
    case when v_lesson.course_id is not null
      then '/courses/' || v_lesson.course_id::text || '/lessons/' || new.ref_lesson_id::text
      else null
    end
  );
  return new;
end;
$$;

drop trigger if exists xp_ledger_notify_reward on public.xp_ledger;
create trigger xp_ledger_notify_reward after insert on public.xp_ledger
  for each row execute function public.notify_lesson_reward();
