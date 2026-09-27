"""
Your Builds test - places an unlocked building onto the map from the "Your
Builds" panel, clicks it in the 3D scene to select it, then deletes it with
the toolbar's Remove button.

Unlike the base (which always sits at the world origin - see
test_base_move_rotate.py), a newly placed building always lands at grid
(0, 0) relative to PLACEMENT_ORIGIN = [4, 0, -6] in GameWorld.jsx, not the
world origin itself. There's no DOM element for a 3D object to click, so
this computes where that point should project on screen from the game's
fixed camera (position [18,18,18], looking at the origin, zoom 40 - see the
<Canvas> in GameWorld.jsx) using the same orthographic projection math the
renderer itself uses, then clicks there. A few nearby pixel offsets are
tried as a fallback in case that math is slightly off for your exact canvas
size, before giving up.

Setup (see selenium_tests/README.md for the full version):
  1. npm run dev            (in the main project - leave it running)
  2. pip install selenium
  3. Set SELENIUM_TEST_EMAIL / SELENIUM_TEST_PASSWORD to a real account.
  4. python selenium_tests/test_your_builds_place_and_delete.py
"""

import math
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

# --- Work out where PLACEMENT_ORIGIN = [4, 0, -6] projects on screen,
# relative to the origin (canvas center) - see GameWorld.jsx for both the
# camera setup and PLACEMENT_ORIGIN. Camera looks from (18,18,18) at (0,0,0)
# with world-up (0,1,0); for an orthographic camera this is standard
# lookAt/right/up basis construction, then a world-space delta projects onto
# screen pixels as (delta . right) and (delta . up), scaled by `zoom`
# (R3F's default orthographic camera maps 1 world unit to `zoom` pixels).
ZOOM = 40
EYE = (18, 18, 18)
TARGET = (0, 0, 0)
WORLD_UP = (0, 1, 0)
PLACEMENT_DELTA = (4, 0, -6)  # PLACEMENT_ORIGIN - world origin


def normalize(v):
    n = math.sqrt(sum(c * c for c in v))
    return tuple(c / n for c in v)


def cross(a, b):
    return (a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0])


def dot(a, b):
    return sum(x * y for x, y in zip(a, b))


z_axis = normalize(tuple(e - t for e, t in zip(EYE, TARGET)))
x_axis = normalize(cross(WORLD_UP, z_axis))
y_axis = normalize(cross(z_axis, x_axis))

screen_dx = dot(PLACEMENT_DELTA, x_axis) * ZOOM
screen_dy_dom = -dot(PLACEMENT_DELTA, y_axis) * ZOOM  # DOM y grows downward, "up" is negative DOM y

print(f"Computed placed-building screen offset from canvas center: ({screen_dx:.1f}, {screen_dy_dom:.1f}) px")

# Try the computed point first, then a small grid of nearby points in case
# of any canvas-size/DPI discrepancy this math doesn't account for.
CANDIDATE_OFFSETS = [(0, 0), (40, 0), (-40, 0), (0, 30), (0, -30), (40, 30), (-40, -30), (40, -30), (-40, 30)]


def click_and_check_building_selected(driver, canvas, dx, dy):
    ActionChains(driver).move_to_element(canvas).move_by_offset(dx, dy).click().perform()
    try:
        WebDriverWait(driver, 2).until(
            lambda d: d.find_elements(By.CSS_SELECTOR, "button[aria-label='Remove building']")
        )
        return True
    except Exception:
        return False


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
# screen - right where the placed building's computed click point can land.
# Minimize it first so nothing but the canvas is there to click.
minimize_buttons = driver.find_elements(By.CSS_SELECTOR, "button[aria-label='Minimize build menu']")
if minimize_buttons:
    minimize_buttons[0].click()

# --- Open "Your Builds" and place one on the map ---
WebDriverWait(driver, 15).until(
    lambda d: d.find_element(By.XPATH, "//span[normalize-space()='Your Builds']")
).click()

WebDriverWait(driver, 5).until(
    lambda d: d.find_elements(By.XPATH, "//button[contains(., 'Use') or contains(., 'Placing')]")
    or d.find_elements(By.XPATH, "//p[contains(text(), 'Nothing unlocked yet')]")
)

use_buttons = driver.find_elements(By.XPATH, "//button[contains(., 'Use') or contains(., 'Placing')]")
if not use_buttons:
    raise SystemExit(
        "Nothing unlocked yet in Your Builds - run test_build_menu_build_now.py "
        "or test_build_menu_buy_and_build.py first to unlock a building type."
    )

use_button = use_buttons[0]
use_button.click()
WebDriverWait(driver, 10).until(lambda d: use_button.get_attribute("disabled") is None)
time.sleep(1)  # RESOURCES_EVENT -> GameWorld re-render

driver.find_element(By.XPATH, "//button[@aria-label='Close your builds']").click()
time.sleep(1)

# --- Select the placed building by clicking its computed screen position ---
canvas = WebDriverWait(driver, 10).until(lambda d: d.find_element(By.TAG_NAME, "canvas"))
time.sleep(2)  # let the scene finish rendering the newly placed model

selected = False
for offset_dx, offset_dy in CANDIDATE_OFFSETS:
    if click_and_check_building_selected(driver, canvas, screen_dx + offset_dx, screen_dy_dom + offset_dy):
        selected = True
        print(f"Selected the building at offset ({screen_dx + offset_dx:.1f}, {screen_dy_dom + offset_dy:.1f})")
        break

if not selected:
    raise SystemExit(
        "FAIL: couldn't select the placed building by clicking any of the "
        "candidate screen positions - the computed projection may not match "
        "your canvas size."
    )

# --- Delete it ---
driver.find_element(By.CSS_SELECTOR, "button[aria-label='Remove building']").click()

try:
    WebDriverWait(driver, 10).until(
        lambda d: not d.find_elements(By.CSS_SELECTOR, "button[aria-label='Remove building']")
    )
    print("PASS: placed a building, selected it on the map, and deleted it")
except Exception:
    print("FAIL: the Remove button is still showing after clicking it - deletion may not have completed")
