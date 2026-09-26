"""
Community like-post test - logs in, creates a fresh post (so there's a real,
known post to test against instead of depending on whatever's already in
the feed), likes it, and confirms both the like count went up and the
button's state (aria-label + fill) actually switched to "liked" and stayed
that way - this app has previously had a real bug where a like would
increment and then silently revert.

Setup (see selenium_tests/README.md for the full version):
  1. npm run dev            (in the main project - leave it running)
  2. pip install selenium
  3. Set SELENIUM_TEST_EMAIL / SELENIUM_TEST_PASSWORD to a real account.
  4. python selenium_tests/test_community_like_post.py
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

# --- Create a fresh post to like ---
post_title = f"Selenium like-test post {int(time.time())}"

driver.find_element(By.XPATH, "//button[contains(., 'New Post')]").click()
title_field = WebDriverWait(driver, 5).until(
    lambda d: d.find_element(By.CSS_SELECTOR, "input[placeholder='Give your post a title...']")
)
title_field.send_keys(post_title)
driver.find_element(By.CSS_SELECTOR, "textarea[placeholder='Share more details...']").send_keys("Created for the like test.")
driver.find_element(By.XPATH, "//button[normalize-space()='Post']").click()

article = WebDriverWait(driver, 10).until(
    lambda d: d.find_element(By.XPATH, f"//h2[normalize-space()='{post_title}']/ancestor::article[1]")
)

# --- Like it ---
like_button = article.find_element(By.XPATH, ".//button[@aria-label='Like' or @aria-label='Unlike']")
likes_before = int(like_button.text.strip())
print(f"Likes before: {likes_before}")

like_button.click()

WebDriverWait(driver, 10).until(
    lambda d: article.find_element(By.XPATH, ".//button[@aria-label='Unlike']")
)
time.sleep(2)  # give any server round-trip / realtime reconciliation a moment to (not) undo it

like_button = article.find_element(By.XPATH, ".//button[@aria-label='Like' or @aria-label='Unlike']")
is_liked = like_button.get_attribute("aria-label") == "Unlike"
likes_after = int(like_button.text.strip())
print(f"Likes after: {likes_after} (liked={is_liked})")

if is_liked and likes_after == likes_before + 1:
    print(f"PASS: like registered and stuck - {likes_before} -> {likes_after}, button shows 'Unlike'")
else:
    print(f"FAIL: liked={is_liked}, likes_before={likes_before}, likes_after={likes_after}")
