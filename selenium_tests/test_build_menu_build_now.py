"""
Build menu test - builds a structure that already has every required
material, using the "Build now" button directly (no missing-materials
purchase needed).

Opens the Build menu and looks for whichever card is currently showing
"Build now" (i.e. this account already has enough of every material it
needs), clicks it, and confirms the "Crafted!" message appears.

Setup (see selenium_tests/README.md for the full version):
  1. npm run dev            (in the main project - leave it running)
  2. pip install selenium
  3. Set SELENIUM_TEST_EMAIL / SELENIUM_TEST_PASSWORD to a real account.
  4. python selenium_tests/test_build_menu_build_now.py
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

# --- The Build menu panel is open by default (showBuildMenuPanel starts
# true in Dashboard/index.jsx) - only click "Expand build menu" if it's
# actually been minimized.
expand_buttons = driver.find_elements(By.CSS_SELECTOR, "button[aria-label='Expand build menu']")
if expand_buttons:
    expand_buttons[0].click()

# The build menu's cards load asynchronously (a Supabase fetch) - wait for
# them to actually render in some state before checking which one, instead
# of checking immediately and finding nothing yet.
WebDriverWait(driver, 10).until(
    lambda d: d.find_elements(By.XPATH, "//button[normalize-space()='Build now']")
    or d.find_elements(By.XPATH, "//button[contains(., 'Buy missing materials')]")
    or d.find_elements(By.XPATH, "//div[contains(., 'Unlocked')]")
    or d.find_elements(By.XPATH, "//div[contains(., 'Reach level')]")
    or d.find_elements(By.XPATH, "//p[contains(text(), 'No buildings available yet')]")
)

build_now_buttons = driver.find_elements(By.XPATH, "//button[normalize-space()='Build now']")
if not build_now_buttons:
    raise SystemExit(
        "No building in the Build menu currently has every required "
        "material ('Build now' isn't showing on any card) - buy the "
        "missing materials first (see test_build_menu_buy_and_build.py), or "
        "run this again once you've collected more resources."
    )

card = build_now_buttons[0].find_element(By.XPATH, "(ancestor::div[contains(@class,'rounded-xl')])[last()]")
building_name = card.find_element(By.XPATH, ".//div[contains(@class,'font-medium')][1]").text
print(f"Building '{building_name}' (already has all required materials)")

build_now_buttons[0].click()

# A successful build fires RESOURCES_EVENT, which makes the Dashboard
# refetch unlockedIds - once that lands, this card's whole materials/button
# block (including the "Crafted!" message) gets replaced by the "Unlocked"
# banner. That message is therefore a transient state that can get raced out
# before a poll ever sees it - the "Unlocked" banner is the reliable signal
# to wait for instead; the failure message ("don't have enough materials")
# has no such race, since nothing else changes on failure.
WebDriverWait(driver, 10).until(
    lambda d: card.find_elements(By.XPATH, ".//*[contains(text(), 'Unlocked')]")
    or card.find_elements(By.XPATH, ".//p[contains(text(), \"don't have enough\")]")
)

if card.find_elements(By.XPATH, ".//*[contains(text(), 'Unlocked')]"):
    print(f"PASS: built '{building_name}' - now shows as Unlocked in the Build menu")
else:
    fail_text = card.find_element(By.XPATH, ".//p[contains(text(), \"don't have enough\")]").text
    print(f"FAIL: {fail_text}")
