"""
Edit + unpublish test - logs in as an instructor, opens a published course
from "My courses", clicks Unpublish, and confirms it now shows as a draft
both in the editor and back on "My courses".

Setup (see selenium_tests/README.md for the full version):
  1. npm run dev            (in the main project - leave it running)
  2. pip install selenium
  3. Set SELENIUM_INSTRUCTOR_EMAIL / SELENIUM_INSTRUCTOR_PASSWORD to a real
     instructor account that owns at least one published course (run
     test_create_course.py first if it doesn't have one yet).
  4. python selenium_tests/test_edit_and_unpublish_course.py
"""

import os
import time

from selenium import webdriver
from selenium.webdriver.edge.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait

APP_URL = "http://localhost:5173"

TEST_EMAIL = os.environ.get("SELENIUM_INSTRUCTOR_EMAIL")
TEST_PASSWORD = os.environ.get("SELENIUM_INSTRUCTOR_PASSWORD")

if not TEST_EMAIL or not TEST_PASSWORD:
    raise SystemExit(
        "Set the SELENIUM_INSTRUCTOR_EMAIL and SELENIUM_INSTRUCTOR_PASSWORD "
        "environment variables to a real instructor account before running "
        "this test - see selenium_tests/README.md."
    )

service_obj = Service()

# Keep the browser window open after the script finishes, so the result is
# visible instead of the window closing immediately.
options = webdriver.EdgeOptions()
options.add_experimental_option("detach", True)

driver = webdriver.Edge(options=options, service=service_obj)
driver.maximize_window()

# --- Log in as the instructor ---
driver.get(APP_URL)
driver.find_element(By.XPATH, "//button[normalize-space()='Log In']").click()
time.sleep(1)  # let the modal's open animation finish

driver.find_element(By.CSS_SELECTOR, "input[type='email']").send_keys(TEST_EMAIL)
driver.find_element(By.CSS_SELECTOR, "input[type='password']").send_keys(TEST_PASSWORD)
driver.find_element(By.CLASS_NAME, "authmodal-submit").click()

WebDriverWait(driver, 10).until(
    lambda d: "/dashboard" in d.current_url or "/instructor" in d.current_url
)
if "/dashboard" in driver.current_url:
    time.sleep(2)  # give RequireAuth's role-based redirect to /instructor a moment
if "/instructor" not in driver.current_url:
    raise SystemExit(f"Login didn't reach the instructor area - current URL is {driver.current_url}.")

# --- Open a published course from "My courses" ---
# Login's redirect already lands here - no need for a hard reload, which
# would force a slower cold reload of the lazy-loaded instructor chunk.
WebDriverWait(driver, 15).until(
    lambda d: d.find_elements(By.XPATH, "//span[normalize-space()='PUBLISHED']")
    or d.find_elements(By.XPATH, "//p[contains(text(),'No courses yet')]")
)

published_tags = driver.find_elements(By.XPATH, "//span[normalize-space()='PUBLISHED']")
if not published_tags:
    raise SystemExit(
        "This instructor account has no published course to unpublish - "
        "run test_create_course.py first, or publish one manually."
    )

titles = driver.find_elements(By.XPATH, "(//span[normalize-space()='PUBLISHED'])[1]/following::h3[1]")
print(f"Editing '{titles[0].text}'" if titles else "Editing the first published course")

# The Edit link that comes right after this specific PUBLISHED tag in the
# page - i.e. that same course card's own link, not some other course's.
driver.find_element(
    By.XPATH, "(//span[normalize-space()='PUBLISHED'])[1]/following::a[contains(@href,'/edit')][1]"
).click()

WebDriverWait(driver, 10).until(lambda d: d.find_elements(By.ID, "course-title"))
course_id = driver.current_url.rstrip("/").split("/")[-2]  # .../courses/<id>/edit

# --- Unpublish it ---
driver.find_element(By.XPATH, "//button[contains(., 'Unpublish')]").click()

WebDriverWait(driver, 10).until(lambda d: d.find_elements(By.XPATH, "//span[normalize-space()='DRAFT']"))

editor_shows_draft = bool(driver.find_elements(By.XPATH, "//span[normalize-space()='DRAFT']"))
button_now_says_publish = bool(driver.find_elements(By.XPATH, "//button[normalize-space()='Publish']"))

# --- Go back to "My courses" and confirm the draft tag shows there too ---
driver.find_element(By.XPATH, "//a[contains(., 'My courses')]").click()

WebDriverWait(driver, 10).until(lambda d: d.find_elements(By.XPATH, f"//a[contains(@href, '{course_id}')]"))

card = driver.find_element(
    By.XPATH, f"(//a[contains(@href, '{course_id}')]/ancestor::div[contains(@class,'rounded-2xl')])[last()]"
)
tag_text = card.find_element(By.XPATH, ".//span[normalize-space()='DRAFT' or normalize-space()='PUBLISHED']").text
list_shows_draft = tag_text == "DRAFT"

if editor_shows_draft and button_now_says_publish and list_shows_draft:
    print("PASS: course unpublished - shows as DRAFT in the editor and on My courses")
else:
    print(
        f"FAIL: editor_shows_draft={editor_shows_draft}, "
        f"button_now_says_publish={button_now_says_publish}, "
        f"my_courses_tag='{tag_text}'"
    )
