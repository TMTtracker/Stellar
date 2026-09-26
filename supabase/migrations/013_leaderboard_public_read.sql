-- The leaderboard needs to show every learner's enrolled courses and
-- achievements to every OTHER learner (and to visitors on the public
-- landing page) - not just their own. The existing "own_rows" policies from
-- 001_course_system.sql are `for all` (select/insert/update/delete) scoped
-- to `auth.uid() = user_id`, which silently limits SELECT to each user's own
-- rows too - that's why one account could never see another account's real
-- course progress on the leaderboard, only the level/XP-based fallback.
--
-- Postgres RLS combines multiple permissive policies for the same command
-- with OR, so adding a second, select-only "public_read" policy here widens
-- read access for everyone while leaving insert/update/delete still locked
-- to the row's own user via the original "own_rows" policy.
drop policy if exists "public_read" on public.enrollments;
create policy "public_read" on public.enrollments for select using (true);

drop policy if exists "public_read" on public.lesson_progress;
create policy "public_read" on public.lesson_progress for select using (true);
