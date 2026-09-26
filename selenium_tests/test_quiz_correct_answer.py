"""
Correct-answer quiz test - logs in, enrolls in a course that isn't enrolled
yet, then works through its lessons one by one (answering every quiz
correctly, marking quiz-less lessons complete) until the whole course is
finished.

Setup (see selenium_tests/README.md for the full version):
  1. npm run dev            (in the main project - leave it running)
  2. pip install selenium
  3. Set SELENIUM_TEST_EMAIL / SELENIUM_TEST_PASSWORD to a real account.
  4. python selenium_tests/test_quiz_correct_answer.py
"""

from quiz_common import (
    get_test_credentials,
    start_browser,
    log_in,
    open_first_course,
    enroll_if_needed,
    open_first_lesson,
    complete_course_correctly,
)

email, password = get_test_credentials()
driver = start_browser()

log_in(driver, email, password)
open_first_course(driver)
enroll_if_needed(driver)
open_first_lesson(driver)

completed = complete_course_correctly(driver)

print(f"PASS: completed {completed} lesson(s) in the course, answering every quiz correctly")
