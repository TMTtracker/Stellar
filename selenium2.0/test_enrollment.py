"""
Enrollment test - logs in, opens a course that isn't enrolled yet, enrolls in
it, and confirms enrollment actually took effect (the "Enroll in course"
button disappears and its first lesson becomes openable).

Setup (see selenium_tests/README.md for the full version):
  1. npm run dev            (in the main project - leave it running)
  2. pip install selenium
  3. Set SELENIUM_TEST_EMAIL / SELENIUM_TEST_PASSWORD to a real account.
  4. python selenium_tests/test_enrollment.py
"""

import time

from selenium.webdriver.common.by import By

from quiz_common import get_test_credentials, start_browser, log_in, open_first_course, enroll_if_needed

email, password = get_test_credentials()
driver = start_browser()

log_in(driver, email, password)
open_first_course(driver)

just_enrolled = enroll_if_needed(driver)
print("Enrolled just now" if just_enrolled else "Was already enrolled (no unenrolled course left to test with)")

time.sleep(1)

still_shows_enroll_button = bool(driver.find_elements(By.XPATH, "//button[contains(., 'Enroll in course')]"))
has_openable_lesson = bool(driver.find_elements(By.XPATH, "//a[contains(@href, '/lessons/')]"))

if not still_shows_enroll_button and has_openable_lesson:
    print("PASS: course now shows as enrolled and its first lesson is unlocked")
else:
    print("FAIL: course does not show as enrolled (Enroll button still present or no lesson unlocked)")
