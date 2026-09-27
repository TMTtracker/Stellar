"""
Build menu test - buys the missing materials for a structure, then builds
it.

Opens the Build menu, finds whichever card is currently showing "Buy
missing materials", buys them, then clicks that same card's "Build now"
button (which appears once materials are topped up), confirming the
"Crafted!" message.

Setup (see selenium_tests/README.md for the full version):
  1. npm run dev            (in the main project - leave it running)
  2. pip install selenium
  3. Set SELENIUM_TEST_EMAIL / SELENIUM_TEST_PASSWORD to a real account.
  4. python selenium_tests/test_build_menu_buy_and_build.py
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

buy_buttons = driver.find_elements(By.XPATH, "//button[contains(., 'Buy missing materials')]")
if not buy_buttons:
    raise SystemExit(
        "No building currently needs missing materials bought - every "
        "unlockable building either already has what it needs, or none are "
        "unlockable at this account level yet."
    )

card = buy_buttons[0].find_element(By.XPATH, "(ancestor::div[contains(@class,'rounded-xl')])[last()]")
building_name = card.find_element(By.XPATH, ".//div[contains(@class,'font-medium')][1]").text
print(f"Buying missing materials for '{building_name}'")

buy_buttons[0].click()

WebDriverWait(driver, 10).until(
    lambda d: card.find_elements(By.XPATH, ".//p[contains(text(), 'purchased') or contains(text(), 'Not enough coins')]")
)
buy_message = card.find_element(
    By.XPATH, ".//p[contains(text(), 'purchased') or contains(text(), 'Not enough coins')]"
).text
print(f"Purchase result: {buy_message}")

if "Not enough coins" in buy_message:
    raise SystemExit(f"Can't complete the test - not enough coins to buy materials for '{building_name}'.")

build_button = WebDriverWait(driver, 10).until(
    lambda d: card.find_element(By.XPATH, ".//button[normalize-space()='Build now']")
)
build_button.click()

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
    print(f"PASS: bought missing materials and built '{building_name}' - now shows as Unlocked")
else:
    build_message = card.find_element(By.XPATH, ".//p[contains(text(), \"don't have enough\")]").text
    print(f"FAIL: {build_message}")
    build_message = card.find_element(By.XPATH, ".//p[contains(text(), \"don't have enough\")]").text
    print(f"FAIL: {build_message}")
