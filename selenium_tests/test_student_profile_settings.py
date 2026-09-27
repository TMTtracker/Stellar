"""
Student profile settings test - logs in, opens Profile from the Dashboard's
bottom nav, confirms it shows the logged-in account's own email (not some
other account's - a real concern this project hit before), then edits the
display name through the Edit profile modal and confirms the save succeeds.

Setup (see selenium_tests/README.md for the full version):
  1. npm run dev            (in the main project - leave it running)
  2. pip install selenium
  3. Set SELENIUM_TEST_EMAIL / SELENIUM_TEST_PASSWORD to a real account.
  4. python selenium_tests/test_student_profile_settings.py
"""

import os
import time

from selenium import webdriver
from selenium.webdriver.edge.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait

APP_URL = "http://localhost:5173"

TEST_EMAIL = os.environ.get("SELENIUM_TEST_EMAIL")
TEST_PASSWORD = os.environ.get("SELENIUM_TEST_PASSWORD")

if not TEST_EMAIL or not TEST_PASSWORD:
    raise SystemExit(
        "Set the SELENIUM_TEST_EMAIL and SELENIUM_TEST_PASSWORD environment "
        "variables to a real Stellar account before running this test - see "
        "selenium_tests/README.md."
    )

service_obj = Service()

# Keep the browser window open after the script finishes, so the result is
# visible instead of the window closing immediately.
options = webdriver.EdgeOptions()
options.add_experimental_option("detach", True)

driver = webdriver.Edge(options=options, service=service_obj)
driver.maximize_window()

# --- Log in ---
driver.get(APP_URL)
driver.find_element(By.XPATH, "//button[normalize-space()='Log In']").click()
time.sleep(1)  # let the modal's open animation finish

driver.find_element(By.CSS_SELECTOR, "input[type='email']").send_keys(TEST_EMAIL)
driver.find_element(By.CSS_SELECTOR, "input[type='password']").send_keys(TEST_PASSWORD)
driver.find_element(By.CLASS_NAME, "authmodal-submit").click()

WebDriverWait(driver, 10).until(lambda d: "/dashboard" in d.current_url)

# --- Go to Profile via the bottom nav ---
WebDriverWait(driver, 15).until(
    lambda d: d.find_element(By.XPATH, "//span[normalize-space()='Profile']")
).click()

WebDriverWait(driver, 10).until(lambda d: "/profile" in d.current_url)

# --- Confirm it's showing THIS account's own data, not someone else's ---
shown_email = WebDriverWait(driver, 10).until(
    lambda d: d.find_element(By.CSS_SELECTOR, ".profile-hero-email")
).text

if shown_email.strip().lower() == TEST_EMAIL.strip().lower():
    print(f"PASS: Profile page shows the logged-in account's own email ({shown_email})")
else:
    raise SystemExit(f"FAIL: Profile page shows '{shown_email}', expected '{TEST_EMAIL}' - possible cross-account data leak.")

# --- Edit the display name and save ---
new_name = f"Selenium Tester {int(time.time()) % 10000}"

driver.find_element(By.CSS_SELECTOR, "button.profile-avatar-edit").click()
name_field = WebDriverWait(driver, 5).until(
    lambda d: d.find_element(By.CSS_SELECTOR, ".profile-edit-modal input[type='text']")
)
name_field.clear()
name_field.send_keys(new_name)

driver.find_element(By.CSS_SELECTOR, "button.profile-save-btn").click()

try:
    WebDriverWait(driver, 10).until(lambda d: d.find_elements(By.CSS_SELECTOR, ".profile-message"))
except Exception:
    raise SystemExit("FAIL: no success or error message appeared after saving.")

message_el = driver.find_element(By.CSS_SELECTOR, ".profile-message")
if "success" in message_el.get_attribute("class"):
    print(f"PASS: display name saved as '{new_name}' - {message_el.text}")
else:
    print(f"FAIL: save was rejected - {message_el.text}")
