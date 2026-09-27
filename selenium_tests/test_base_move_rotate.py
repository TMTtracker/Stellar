"""
Base move/rotate test - logs in as a student, clicks the base/camp in the 3D
scene to select it, then exercises the move toolbar in all 4 directions and
rotates it 4 times (a full turn).

There's no DOM-readable transform for a 3D object, so movement is verified
indirectly through the minimap (a plain SVG that plots the base's real
pos_x/pos_y - see MiniMap.jsx): the base's marker should shift after each
move. Rotation has no visible DOM signal at all, so that part is a
functional smoke test - each of the 4 clicks should round-trip (the toolbar
briefly disables itself while busy, per GameWorld.jsx) without getting stuck
or erroring.

Moving front+back and left+right each cancel out (see the toolbar's
handleMove(0,-1)/handleMove(0,1)/handleMove(-1,0)/handleMove(1,0) calls in
GameWorld.jsx), so running this test leaves the base's saved position
unchanged overall, even though it does perform 4 real position updates and
4 real rotation updates along the way.

Setup (see selenium_tests/README.md for the full version):
  1. npm run dev            (in the main project - leave it running)
  2. pip install selenium
  3. Set SELENIUM_TEST_EMAIL / SELENIUM_TEST_PASSWORD to a real account.
  4. python selenium_tests/test_base_move_rotate.py
"""

import os
import time

from selenium import webdriver
from selenium.webdriver.edge.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.common.action_chains import ActionChains
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


def base_marker_position(driver):
    marker = driver.find_element(By.CSS_SELECTOR, "svg rect[fill='#D9605B']")
    return marker.get_attribute("x"), marker.get_attribute("y")


def wait_until_not_busy(driver, button, timeout=10):
    WebDriverWait(driver, timeout).until(lambda d: button.get_attribute("disabled") is None)


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

# The Build menu panel is open by default (showBuildMenuPanel starts true in
# Dashboard/index.jsx) and covers a large part of the bottom-right of the
# screen - minimize it so it can't obstruct the toolbar or canvas clicks.
minimize_buttons = driver.find_elements(By.CSS_SELECTOR, "button[aria-label='Minimize build menu']")
if minimize_buttons:
    minimize_buttons[0].click()

# --- Select the base by clicking the middle of the 3D scene ---
# The camera always starts centered on the world origin, which is exactly
# where the base/camp lives (BASE_ORIGIN in GameWorld.jsx) - so the canvas's
# visible center reliably lands on it, without needing to compute any
# 3D-to-screen projection ourselves.
canvas = WebDriverWait(driver, 15).until(lambda d: d.find_element(By.TAG_NAME, "canvas"))
time.sleep(2)  # let the scene/model finish loading before clicking it
ActionChains(driver).move_to_element(canvas).click().perform()

WebDriverWait(driver, 5).until(lambda d: d.find_element(By.CSS_SELECTOR, "button[aria-label='Move front']"))

# --- Exercise all 4 move directions ---
directions = ["Move front", "Move back", "Move left", "Move right"]
all_moves_passed = True
for direction in directions:
    before = base_marker_position(driver)
    button = driver.find_element(By.CSS_SELECTOR, f"button[aria-label='{direction}']")
    button.click()
    wait_until_not_busy(driver, button)
    time.sleep(0.5)  # BASE_EVENT -> minimap re-render
    after = base_marker_position(driver)
    if after != before:
        print(f"PASS: '{direction}' moved the base marker {before} -> {after}")
    else:
        all_moves_passed = False
        print(f"FAIL: '{direction}' did not move the base marker (stayed at {before})")

# --- Rotate 4 times (a full turn) ---
rotate_button = driver.find_element(By.CSS_SELECTOR, "button[aria-label='Rotate 90 degrees']")
all_rotates_passed = True
for i in range(4):
    try:
        rotate_button.click()
        wait_until_not_busy(driver, rotate_button)
        print(f"PASS: rotate {i + 1}/4 completed")
    except Exception as e:
        all_rotates_passed = False
        print(f"FAIL: rotate {i + 1}/4 did not complete - {e}")
    time.sleep(0.3)

if all_moves_passed and all_rotates_passed:
    print("PASS: base move (all 4 directions) and rotate (4x) all completed successfully")
else:
    print("FAIL: see individual results above")
