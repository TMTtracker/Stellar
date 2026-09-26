# Selenium tests (Python)

Automated browser tests for Stellar's login, signup, student course/quiz
flows, and instructor course-creation flows, using Microsoft Edge via
Python's `selenium` package. This folder is entirely separate from the main
app - nothing here is part of the Vite/npm build, and nothing in `src/` had
to change for it to work.

## Setup

1. Start the app's dev server and leave it running in its own terminal:

   ```
   npm run dev
   ```

   It defaults to `http://localhost:5173` (see `APP_URL` near the top of
   each script if yours runs somewhere else).

2. Install the one Python dependency:

   ```
   pip install selenium
   ```

   Selenium 4.6+ auto-downloads the matching Edge WebDriver the first time
   you run a test (via its built-in Selenium Manager), so there's nothing
   else to install.

3. `test_login.py`, `test_enrollment.py`, `test_quiz_correct_answer.py`,
   `test_quiz_wrong_answer.py`, `test_student_dark_mode.py`,
   `test_base_move_rotate.py`, `test_student_profile_settings.py`,
   `test_student_shop_buy.py`, `test_community_create_post.py`,
   `test_community_like_post.py`, `test_community_comment_post.py`,
   `test_build_menu_build_now.py`, `test_build_menu_buy_and_build.py`, and
   `test_your_builds_place_and_delete.py` all need a real account to sign in
   with (they all log in the same way before doing anything else). Create
   one dedicated throwaway account once, through the app's own Sign Up form
   (e.g. `selenium.test@stellar.local`), then set its credentials as
   environment variables before running any of them:

   PowerShell:
   ```
   $env:SELENIUM_TEST_EMAIL = "selenium.test@stellar.local"
   $env:SELENIUM_TEST_PASSWORD = "YourPassword123"
   ```

   cmd.exe:
   ```
   set SELENIUM_TEST_EMAIL=selenium.test@stellar.local
   set SELENIUM_TEST_PASSWORD=YourPassword123
   ```

4. `test_instructor_login.py`, `test_create_course.py`,
   `test_edit_and_unpublish_course.py`, `test_instructor_dark_mode.py`, and
   `test_instructor_profile_settings.py` need a second dedicated account, one
   that was signed up with the "Sign up as Instructor" option (role is
   picked once at signup and can't be changed afterward - a student account
   will never pass these). Create it through the app's own Sign Up form,
   then set:

   PowerShell:
   ```
   $env:SELENIUM_INSTRUCTOR_EMAIL = "selenium.instructor@stellar.local"
   $env:SELENIUM_INSTRUCTOR_PASSWORD = "YourPassword123"
   ```

5. `test_create_course.py` additionally needs the AI lecture generator
   configured - `VITE_OLLAMA_API_KEY` set in the main project's `.env` (and
   the dev server restarted after adding it). It reads
   `SamplePDF/Architecture-1.pdf` from the repo root, so nothing else to set
   up there.

## Running a test

Each test is a standalone script - run whichever one you want directly:

```
python selenium_tests/test_login.py
python selenium_tests/test_instructor_login.py
python selenium_tests/test_signup.py
python selenium_tests/test_enrollment.py
python selenium_tests/test_quiz_correct_answer.py
python selenium_tests/test_quiz_wrong_answer.py
python selenium_tests/test_create_course.py
python selenium_tests/test_edit_and_unpublish_course.py
python selenium_tests/test_student_dark_mode.py
python selenium_tests/test_instructor_dark_mode.py
python selenium_tests/test_base_move_rotate.py
python selenium_tests/test_student_profile_settings.py
python selenium_tests/test_instructor_profile_settings.py
python selenium_tests/test_student_shop_buy.py
python selenium_tests/test_community_create_post.py
python selenium_tests/test_community_like_post.py
python selenium_tests/test_community_comment_post.py
python selenium_tests/test_build_menu_build_now.py
python selenium_tests/test_build_menu_buy_and_build.py
python selenium_tests/test_your_builds_place_and_delete.py
```

`test_your_builds_place_and_delete.py` needs at least one building type
already unlocked in "Your Builds" - run `test_build_menu_build_now.py` or
`test_build_menu_buy_and_build.py` first if you haven't unlocked one yet.

`quiz_common.py` is not a test - it's shared setup code the other three
import (log in, open a course, enroll, open a lesson). Don't run it directly.

`test_enrollment.py` and both quiz tests always pick a course the account
isn't enrolled in yet (its card says "View" rather than "Start"/"Continue" on
the Courses page), so every run exercises a real, fresh enrollment instead of
finding one already done. That means each run works through a different
course than the last, until the dummy account has enrolled in all of them -
seed more courses, or re-run against a fresh account, if you need to test
enrollment repeatedly.

A real Edge window opens for each run and stays open after the script
finishes (`detach=True`) so you can see the result - close it manually when
you're done.

## Does this touch the real database?

Yes, partially - there is no separate/sandboxed test database in this
project. The dev server talks to whichever Supabase project is configured in
the main app's `.env`.

- **`test_login.py`** / **`test_instructor_login.py`** sign in with a real
  account every run. That's safe as long as it's a dedicated dummy account
  used for nothing else - it only ever updates that one account's own data
  (for example, its login-streak counter ticks up each day you run it).
- **`test_signup.py`** fills in the signup form with a freshly generated,
  timestamped email and actually clicks submit, so it creates a **real**
  account in Supabase every time it runs. It never reuses the same email
  twice (so re-running it never fails with "already registered"), but the
  accounts it creates do pile up over time and should be deleted
  periodically from Supabase's Authentication tab if that matters for your
  project.
- **`test_enrollment.py`** enrolls the dummy account in a real course every
  run - a genuine, permanent enrollment row, not a no-op.
- **`test_quiz_correct_answer.py`** enrolls in a course and submits a real,
  passing quiz attempt for every lesson in it (each lesson needs a probe
  attempt first to discover its answer key, since Stellar doesn't show it
  anywhere before you submit, then the real passing attempt). This awards
  real XP/coins/materials to the dummy account and marks the whole course
  complete for it.
- **`test_quiz_wrong_answer.py`** enrolls in a course and submits two real
  quiz attempts on its first lesson only (a probe, then a deliberately
  failing one) - it doesn't award rewards or complete the lesson, but both
  attempts are still saved to that lesson's real attempt history.
- **`test_create_course.py`** is the one with the biggest blast radius here:
  it creates a real course and **publishes** it, making it visible in the
  catalog to every student, not just the instructor account - not scoped to
  "one dummy account's own data" the way the others are. Delete the course
  from "My courses" afterward (or leave it as a harmless real course, if
  that's fine for your project) once you're done testing.
- **`test_edit_and_unpublish_course.py`** flips a real course from published
  back to draft - if you run it right after `test_create_course.py`, it
  undoes that test's publish, which is a reasonable pair to run together.
- **`test_student_dark_mode.py`** / **`test_instructor_dark_mode.py`** don't
  touch the database at all - night mode is a pure client-side preference
  stored in the browser's own localStorage (see `useDarkMode.jsx`), not
  anything saved to the account.
- **`test_base_move_rotate.py`** performs 4 real position updates and 4 real
  rotation updates on the account's base - moving front+back and left+right
  each cancel out, so the base ends up back where it started, but the
  updates themselves are genuine round-trips, not a no-op.
- **`test_student_profile_settings.py`** / **`test_instructor_profile_settings.py`**
  permanently change the account's real `display_name` in `profiles` every
  run (to a new timestamped value) - harmless for a dummy account, but not
  reversible by the script.
- **`test_student_shop_buy.py`** spends 20 real coins on a Glass bundle every
  run - a genuine purchase, not reversible by the script.
- **`test_community_create_post.py`**, **`test_community_like_post.py`**, and
  **`test_community_comment_post.py`** each create one new, real, permanent
  post in the community feed (the like/comment tests need a fresh post of
  their own to act on, so they don't depend on anything already being in the
  feed) - visible to every student, not just the dummy account. These posts
  accumulate over time and have no in-app delete option for the author, so
  clean them up directly in Supabase if that matters for your project.
- **`test_build_menu_build_now.py`** / **`test_build_menu_buy_and_build.py`**
  spend real materials (and, for the "buy" one, real coins) and permanently
  unlock a building type for the account - not reversible by the script.
- **`test_your_builds_place_and_delete.py`** places a real building on the
  map and then deletes that specific placed instance - the underlying
  unlock in "Your Builds" is untouched, so it nets out to no permanent
  change, but it does perform 2 real round-trips (place, then remove) along
  the way. This one also has to guess where the placed building lands on
  screen from the game's camera math (there's no DOM element for a 3D
  object) - see the comment at the top of the file if it ever fails to find
  it.
