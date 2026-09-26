"""
Login test - opens Stellar's landing page, logs in with a dedicated test
account, and checks it lands on /dashboard.

Setup (see selenium_tests/README.md for the full version):
  1. npm run dev            (in the main project - leave it running)
  2. pip install selenium
  3. Set SELENIUM_TEST_EMAIL / SELENIUM_TEST_PASSWORD to a real account you
     created once through the app's own Sign Up form.
  4. python selenium_tests/test_login.py
"""

import os
import time

from selenium import webdriver
from selenium.webdriver.edge.service import Service
from selenium.webdriver.common.by import By

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

driver.get(APP_URL)

# The landing page header's "Log In" button opens the AuthModal in login mode.
driver.find_element(By.XPATH, "//button[normalize-space()='Log In']").click()

time.sleep(1)  # let the modal's open animation finish

driver.find_element(By.CSS_SELECTOR, "input[type='email']").send_keys(TEST_EMAIL)
driver.find_element(By.CSS_SELECTOR, "input[type='password']").send_keys(TEST_PASSWORD)

driver.find_element(By.CLASS_NAME, "authmodal-submit").click()

time.sleep(3)  # allow sign-in + the modal's close animation + redirect

if "/dashboard" in driver.current_url:
    print("PASS: logged in successfully, now on", driver.current_url)
else:
    print("FAIL: expected to land on /dashboard, but URL is", driver.current_url)
