-- STELLAR: clean up leftover/stray RLS policies on courses.
--
-- A live-database introspection (querying pg_policy directly) turned up
-- THREE policies on public.courses that don't exist in any migration file
-- in this repo - leftovers from an earlier, simpler ownership model that
-- were never dropped when 018_instructor_role.sql added the real
-- instructor-scoped policies alongside them:
--
--   "authenticated can create courses"  for insert  with check (true)
--     -> ANY signed-in user (including students) can insert a course row.
--   "owners can update courses"         for update  using (created_by = auth.uid() OR created_by IS NULL)
--     -> no instructor requirement, and unowned rows are updatable by anyone.
--   "courses readable by everyone"      for select  using (is_published = true)
--     -> this quietly replaced the original catalog_read (using (true))
--        policy at some point, which means an instructor currently has NO
--        policy granting them visibility into their OWN draft courses.
--
-- This migration drops all three stray policies by their exact names and
-- replaces the missing piece (owner can read their own drafts) properly.
-- The instructor_insert / instructor_update / instructor_delete policies
-- from 018 (already fixed in 021) are left as-is - they're correct.
--
-- Run this in Supabase Dashboard > SQL Editor AFTER 021.

drop policy if exists "authenticated can create courses" on public.courses;
drop policy if exists "owners can update courses" on public.courses;

-- Keep public read for published courses (rename back for clarity), and add
-- the missing "instructor can read their own courses regardless of publish
-- state" policy so drafts are visible to their own author.
drop policy if exists "courses readable by everyone" on public.courses;
drop policy if exists "catalog_read" on public.courses;
create policy "published courses readable by everyone" on public.courses
  for select using (is_published = true);
create policy "instructor_read_own" on public.courses
  for select using (created_by = auth.uid());
