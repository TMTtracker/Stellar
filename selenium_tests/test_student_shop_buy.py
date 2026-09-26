"""
Shop test - logs in as a student, records how much Glass is in the
Dashboard's Inventory panel, buys a Bundle of Glass x10 from the Shop, then
goes back and confirms the inventory count actually went up by 10.

Glass is used because it's one of the cheapest items (20 coins), maximizing
the chance the test account can already afford it without needing to
complete lessons first.

Setup (see selenium_tests/README.md for the full version):
  1. npm run dev            (in the main project - leave it running)
  2. pip install selenium
  3. Set SELENIUM_TEST_EMAIL / SELENIUM_TEST_PASSWORD to a real account.
  4. python selenium_tests/test_student_shop_buy.py
"""

import os
import time

from selenium import webdriver
from selenium.webdriver.edge.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait

APP_URL = "http://localhost:5173"
GLASS_QTY = 10  # matches the 'glass-10' item in src/Pages/Shop/index.jsx

TEST_EMAIL = os.environ.get("SELENIUM_TEST_EMAIL")
TEST_PASSWORD = os.environ.get("SELENIUM_TEST_PASSWORD")

if not TEST_EMAIL or not TEST_PASSWORD:
    raise SystemExit(
        "Set the SELENIUM_TEST_EMAIL and SELENIUM_TEST_PASSWORD environment "
        "variables to a real Stellar account before running this test - see "
        "selenium_tests/README.md."
    )


def read_glass_count(driver):
    """Opens the Dashboard's Inventory panel, reads the Glass tile's count,
    then closes the panel again."""
    inventory_button = WebDriverWait(driver, 10).until(
        lambda d: d.find_element(By.XPATH, "//button[.//svg[contains(@class,'lucide-backpack')]]")
    )
    inventory_button.click()

    count_text = WebDriverWait(driver, 5).until(
        lambda d: d.find_element(By.XPATH, "//span[normalize-space()='Glass']/preceding-sibling::span[1]")
    ).text

    driver.find_element(By.CSS_SELECTOR, "button[aria-label='Close inventory']").click()
    time.sleep(0.3)
    return int(count_text)


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

# --- Record the Glass count before buying ---
glass_before = read_glass_count(driver)
print(f"Glass before purchase: {glass_before}")

# --- Go to the Shop and buy a bundle of Glass ---
WebDriverWait(driver, 10).until(
    lambda d: d.find_element(By.XPATH, "//span[normalize-space()='Shop']")
).click()
WebDriverWait(driver, 10).until(lambda d: "/shop" in d.current_url)

glass_card = WebDriverWait(driver, 10).until(
    lambda d: d.find_element(By.XPATH, "//h3[contains(text(), 'Glass')]/ancestor::div[contains(@class,'rounded-2xl')][1]")
)
glass_card.find_element(By.TAG_NAME, "button").click()

message = WebDriverWait(driver, 10).until(
    lambda d: d.find_element(By.XPATH, "//p[contains(text(), 'Bought') or contains(text(), 'Not enough coins')]")
).text
print(f"Shop message: {message}")

if "Not enough coins" in message:
    raise SystemExit("Can't verify the purchase - this account doesn't have enough coins for the Glass bundle.")

# --- Go back to the Dashboard and confirm the inventory updated ---
driver.find_element(By.CSS_SELECTOR, "button[aria-label='Dashboard']").click()
WebDriverWait(driver, 10).until(lambda d: "/dashboard" in d.current_url)

glass_after = read_glass_count(driver)
print(f"Glass after purchase: {glass_after}")

if glass_after == glass_before + GLASS_QTY:
    print(f"PASS: Glass inventory increased by {GLASS_QTY} ({glass_before} -> {glass_after})")
else:
    print(f"FAIL: expected {glass_before + GLASS_QTY}, but inventory shows {glass_after}")
