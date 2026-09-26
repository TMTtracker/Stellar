"""
Instructor login test - logs in with a dedicated instructor account and
confirms it lands on /instructor, not /dashboard.

Every login in this app is sent to /dashboard first (see AuthModal.jsx) -
for an instructor account, RequireAuth then notices the role mismatch there
and redirects it on to /instructor (see RequireAuth.jsx). This test logs in
and gives that redirect a moment to happen before checking where it actually
ended up.

Account role ("student" vs "instructor") is picked once at signup time via
the "Sign up as Instructor" option and can't be changed afterward - if you
don't have a dedicated instructor test account yet, create one through the
app's own Sign Up form first.

Setup (see selenium_tests/README.md for the full version):
  1. npm run dev            (in the main project - leave it running)
  2. pip install selenium
  3. Set SELENIUM_INSTRUCTOR_EMAIL / SELENIUM_INSTRUCTOR_PASSWORD to a real
     account that was signed up as an instructor.
  4. python selenium_tests/test_instructor_login.py
"""

import os
import time

from selenium import webdriver
from selenium.webdriver.edge.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait

APP_URL = "http://localhost:5173"

TEST_EMAIL = os.environ.get("SELENIUM_INSTRUCTOR_EMAIL")
TEST_PASSWORD = os.environ.get("SELENIUM_INSTRUCTOR_PASSWORD")

if not TEST_EMAIL or not TEST_PASSWORD:
    raise SystemExit(
        "Set the SELENIUM_INSTRUCTOR_EMAIL and SELENIUM_INSTRUCTOR_PASSWORD "
        "environment variables to a real instructor account before running "
        "this test - see selenium_tests/README.md."
    )

service_obj = Service()

# Keep the browser window open after the script finishes, so the result is
# visible instead of the window closing immediately.
options = webdriver.EdgeOptions()
options.add_experimental_option("detach", True)

driver = webdriver.Edge(options=options, service=service_obj)
driver.maximize_window()

driver.get(APP_URL)

driver.find_element(By.XPATH, "//button[normalize-space()='Log In']").click()
time.sleep(1)  # let the modal's open animation finish

driver.find_element(By.CSS_SELECTOR, "input[type='email']").send_keys(TEST_EMAIL)
driver.find_element(By.CSS_SELECTOR, "input[type='password']").send_keys(TEST_PASSWORD)
driver.find_element(By.CLASS_NAME, "authmodal-submit").click()

# Every successful login is sent to /dashboard first - wait for that much to
# happen before deciding anything.
WebDriverWait(driver, 10).until(
    lambda d: "/dashboard" in d.current_url or "/instructor" in d.current_url
)

# If this account really is an instructor, RequireAuth redirects it on to
# /instructor almost immediately - give that a moment rather than judging
# the URL the instant /dashboard first appears.
if "/dashboard" in driver.current_url:
    time.sleep(2)

if "/instructor" in driver.current_url:
    print(f"PASS: instructor account logged in and landed on {driver.current_url}")
elif "/dashboard" in driver.current_url:
    print("FAIL: landed on /dashboard and stayed there - this account is not registered as an instructor")
else:
    print(f"FAIL: unexpected URL after login - {driver.current_url}")
