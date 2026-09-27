"""
Community create-post test - logs in, opens Community, creates a new post
with a unique title/body, and confirms it appears in the feed.

Setup (see selenium_tests/README.md for the full version):
  1. npm run dev            (in the main project - leave it running)
  2. pip install selenium
  3. Set SELENIUM_TEST_EMAIL / SELENIUM_TEST_PASSWORD to a real account.
  4. python selenium_tests/test_community_create_post.py
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

# --- Go to Community ---
WebDriverWait(driver, 10).until(
    lambda d: d.find_element(By.XPATH, "//span[normalize-space()='Community']")
).click()
WebDriverWait(driver, 10).until(lambda d: "/communities" in d.current_url)

# --- Create a post with a unique title ---
post_title = f"Selenium test post {int(time.time())}"
post_body = "Created automatically by test_community_create_post.py."

driver.find_element(By.XPATH, "//button[contains(., 'New Post')]").click()

title_field = WebDriverWait(driver, 5).until(
    lambda d: d.find_element(By.CSS_SELECTOR, "input[placeholder='Give your post a title...']")
)
title_field.send_keys(post_title)
driver.find_element(By.CSS_SELECTOR, "textarea[placeholder='Share more details...']").send_keys(post_body)

driver.find_element(By.XPATH, "//button[normalize-space()='Post']").click()

try:
    WebDriverWait(driver, 10).until(
        lambda d: d.find_elements(By.XPATH, f"//h2[normalize-space()='{post_title}']")
    )
    print(f"PASS: post '{post_title}' was created and appears in the feed")
except Exception:
    raise SystemExit(f"FAIL: post '{post_title}' never appeared in the feed after posting.")
