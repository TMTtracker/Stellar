"""
Instructor night mode test - logs in as an instructor, opens the Instructor
Studio's Settings dropdown, toggles Night mode on and confirms it actually
switched (the <html> element gets a "dark" class - see useDarkMode.jsx and
InstructorLayout.jsx), then toggles it back off and confirms that works too.

Night mode is a pure client-side preference stored in the browser's
localStorage, not in Supabase, so this test never touches the database.

Setup (see selenium_tests/README.md for the full version):
  1. npm run dev            (in the main project - leave it running)
  2. pip install selenium
  3. Set SELENIUM_INSTRUCTOR_EMAIL / SELENIUM_INSTRUCTOR_PASSWORD to a real
     instructor account.
  4. python selenium_tests/test_instructor_dark_mode.py
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


def is_dark_mode(driver):
    classes = driver.find_element(By.TAG_NAME, "html").get_attribute("class") or ""
    return "dark" in classes.split()


def check_toggle(driver, night_mode_button, expected_dark, label):
    now_dark = is_dark_mode(driver)
    pressed = night_mode_button.get_attribute("aria-pressed")
    if now_dark == expected_dark and pressed == str(expected_dark).lower():
        print(f"PASS: {label} - <html> class and aria-pressed both show {'dark' if expected_dark else 'light'} mode")
    else:
        print(f"FAIL: {label} - expected dark={expected_dark}, got <html> dark={now_dark}, aria-pressed={pressed}")


service_obj = Service()

# Keep the browser window open after the script finishes, so the result is
# visible instead of the window closing immediately.
options = webdriver.EdgeOptions()
options.add_experimental_option("detach", True)

driver = webdriver.Edge(options=options, service=service_obj)
driver.maximize_window()

# --- Log in as the instructor ---
driver.get(APP_URL)
driver.find_element(By.XPATH, "//button[normalize-space()='Log In']").click()
time.sleep(1)  # let the modal's open animation finish

driver.find_element(By.CSS_SELECTOR, "input[type='email']").send_keys(TEST_EMAIL)
driver.find_element(By.CSS_SELECTOR, "input[type='password']").send_keys(TEST_PASSWORD)
driver.find_element(By.CLASS_NAME, "authmodal-submit").click()

WebDriverWait(driver, 10).until(
    lambda d: "/dashboard" in d.current_url or "/instructor" in d.current_url
)
if "/dashboard" in driver.current_url:
    time.sleep(2)  # give RequireAuth's role-based redirect to /instructor a moment
if "/instructor" not in driver.current_url:
    raise SystemExit(f"Login didn't reach the instructor area - current URL is {driver.current_url}.")

# --- Open Settings and toggle Night mode on ---
settings_button = WebDriverWait(driver, 15).until(
    lambda d: d.find_element(By.CSS_SELECTOR, "button[aria-label='Settings']")
)
was_dark = is_dark_mode(driver)
print(f"Starting in {'dark' if was_dark else 'light'} mode")

settings_button.click()
night_mode_button = WebDriverWait(driver, 5).until(
    lambda d: d.find_element(By.XPATH, "//button[contains(., 'Night mode')]")
)
night_mode_button.click()
time.sleep(1)  # class toggle + CSS transition

check_toggle(driver, night_mode_button, not was_dark, "toggled on")

# --- Toggle back off (clicking Night mode doesn't close the dropdown, so
# the same button reference is still valid and visible) ---
night_mode_button.click()
time.sleep(1)

check_toggle(driver, night_mode_button, was_dark, "toggled back off")
