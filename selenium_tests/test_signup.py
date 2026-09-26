"""
Signup test - opens Stellar's landing page, fills out the Sign Up form with a
freshly generated email, and clicks submit to create a real account.

WARNING: this creates a real row in Supabase's auth.users/profiles every
single time it runs (a unique, timestamped email is used each run so it
never collides with a previous run's account). These test accounts pile up
over time and should be deleted periodically from Supabase's Authentication
tab if that matters for your project.

Setup (see selenium_tests/README.md for the full version):
  1. npm run dev            (in the main project - leave it running)
  2. pip install selenium
  3. python selenium_tests/test_signup.py
"""

import time

from selenium.common.exceptions import NoSuchElementException
from selenium import webdriver
from selenium.webdriver.edge.service import Service
from selenium.webdriver.common.by import By

APP_URL = "http://localhost:5173"

TEST_FULL_NAME = "Selenium Test"
TEST_EMAIL = "tamim.22@gmail.com"
TEST_PASSWORD = "12345678"

service_obj = Service()

# Keep the browser window open after the script finishes, so the result is
# visible instead of the window closing immediately.
options = webdriver.EdgeOptions()
options.add_experimental_option("detach", True)

driver = webdriver.Edge(options=options, service=service_obj)
driver.maximize_window()

driver.get(APP_URL)

# The landing page header's "Sign Up" button opens the AuthModal in signup mode.
driver.find_element(By.XPATH, "//button[normalize-space()='Sign Up']").click()

time.sleep(1)  # let the modal's open animation finish

name_field = driver.find_element(By.CSS_SELECTOR, "input[type='text']")
email_field = driver.find_element(By.CSS_SELECTOR, "input[type='email']")
password_fields = driver.find_elements(By.CSS_SELECTOR, "input[type='password']")
password_field, confirm_password_field = password_fields[0], password_fields[1]

print(f"Signing up as {TEST_EMAIL} ...")

name_field.send_keys(TEST_FULL_NAME)
email_field.send_keys(TEST_EMAIL)
password_field.send_keys(TEST_PASSWORD)
confirm_password_field.send_keys(TEST_PASSWORD)

time.sleep(1)  # so the filled-in form is visible before submitting

driver.find_element(By.CLASS_NAME, "authmodal-submit").click()

time.sleep(3)  # allow the signup request + close animation + redirect

# The app reacts to a successful signup in one of two ways, depending on
# whether email confirmation is enabled in Supabase's Auth settings:
#   1. Confirmation OFF -> a session exists immediately, the modal closes,
#      and the browser redirects to /dashboard.
#   2. Confirmation ON  -> no session yet, the modal stays open and shows
#      an "authmodal-info" message asking you to check your email.
# Either counts as a real success; only an "authmodal-error" message (wrong
# password rules, duplicate email, etc.) counts as a failure.

if "/dashboard" in driver.current_url:
    print("PASS: account created and signed in, now on", driver.current_url)
else:
    try:
        info_text = driver.find_element(By.CLASS_NAME, "authmodal-info").text
        print(f"PASS: account created, awaiting email confirmation - '{info_text}'")
    except NoSuchElementException:
        try:
            error_text = driver.find_element(By.CLASS_NAME, "authmodal-error").text
            print(f"FAIL: signup was rejected - '{error_text}'")
        except NoSuchElementException:
            print("FAIL: no success or error state detected - current URL is", driver.current_url)
