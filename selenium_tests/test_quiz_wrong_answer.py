"""
Wrong-answer quiz test - logs in, enrolls in a course that isn't enrolled
yet, opens its first lesson, deliberately answers every question
incorrectly, and confirms the quiz reports a fail (not a Pass).

Setup (see selenium_tests/README.md for the full version):
  1. npm run dev            (in the main project - leave it running)
  2. pip install selenium
  3. Set SELENIUM_TEST_EMAIL / SELENIUM_TEST_PASSWORD to a real account.
  4. python selenium_tests/test_quiz_wrong_answer.py
"""

from quiz_common import (
    get_test_credentials,
    start_browser,
    log_in,
    open_first_course,
    enroll_if_needed,
    open_first_lesson,
    probe_for_answer_key,
    submit_quiz,
)

email, password = get_test_credentials()
driver = start_browser()

log_in(driver, email, password)
open_first_course(driver)
enroll_if_needed(driver)
open_first_lesson(driver)

_correct_buttons, wrong_buttons = probe_for_answer_key(driver)
passed = submit_quiz(driver, wrong_buttons)

if not passed:
    print("PASS: answered every question incorrectly and the quiz was correctly graded as failed")
else:
    print("FAIL: answered options confirmed incorrect, but the quiz still reported Passed")
