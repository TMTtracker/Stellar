"""
Create-course test - logs in as an instructor, starts a new course, uploads
the sample PDF (SamplePDF/Architecture-1.pdf) to the AI lecture generator,
waits for it to draft lectures and quizzes from it, then publishes the
course.

AI generation genuinely takes a while (drafting each lecture, then a quiz
for each one, one at a time), so this test waits up to 5 minutes for it.

Setup (see selenium_tests/README.md for the full version):
  1. npm run dev            (in the main project - leave it running)
  2. pip install selenium
  3. Set SELENIUM_INSTRUCTOR_EMAIL / SELENIUM_INSTRUCTOR_PASSWORD to a real
     instructor account.
  4. Make sure the AI is configured (VITE_OLLAMA_API_KEY in the main
     project's .env) - this test can't generate lectures without it.
  5. python selenium_tests/test_create_course.py
"""

import os
import time

from selenium import webdriver
from selenium.webdriver.edge.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.common.exceptions import TimeoutException

APP_URL = "http://localhost:5173"
PDF_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "SamplePDF", "Architecture-1.pdf"))

TEST_EMAIL = os.environ.get("SELENIUM_INSTRUCTOR_EMAIL")
TEST_PASSWORD = os.environ.get("SELENIUM_INSTRUCTOR_PASSWORD")

if not TEST_EMAIL or not TEST_PASSWORD:
    raise SystemExit(
        "Set the SELENIUM_INSTRUCTOR_EMAIL and SELENIUM_INSTRUCTOR_PASSWORD "
        "environment variables to a real instructor account before running "
        "this test - see selenium_tests/README.md."
    )

if not os.path.isfile(PDF_PATH):
    raise SystemExit(f"Sample PDF not found at {PDF_PATH}")

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
    raise SystemExit(f"Login didn't reach the instructor area - current URL is {driver.current_url}. Is this account really registered as an instructor?")

# --- Start a new course, with our own title so the AI's draft never overwrites it ---
course_title = f"Selenium Test Course {int(time.time())}"

# Click through in-app rather than driver.get()'ing the URL directly - a
# hard reload here forces a cold reload of a heavy lazy-loaded chunk
# (rich text editor, PDF/AI panel, quiz editor, pdfjs-dist) and re-hydrates
# the auth session from scratch, both of which can be slow enough to time
# out; navigating from the page we're already on avoids both. The
# instructor dashboard is itself a lazy chunk, so wait for its "Create new
# course" link to actually render rather than assuming it's there already.
create_course_link = WebDriverWait(driver, 15).until(
    lambda d: d.find_element(By.XPATH, "//a[contains(., 'Create new course')]")
)
create_course_link.click()

title_field = WebDriverWait(driver, 30).until(lambda d: d.find_element(By.ID, "course-title"))
title_field.send_keys(course_title)

if driver.find_elements(By.XPATH, "//*[contains(text(), \"AI isn't configured yet\")]"):
    raise SystemExit(
        "The AI lecture generator isn't configured (VITE_OLLAMA_API_KEY is "
        "missing from the main project's .env) - this test can't generate "
        "lectures without it."
    )

# --- Upload the sample PDF and generate lectures ---
# The file input is visually hidden (a styled dropzone button sits in front
# of it) but WebDriver can still send a path directly to it, bypassing the
# native file-picker dialog that Selenium can't interact with anyway.
driver.find_element(By.CSS_SELECTOR, "input[type='file']").send_keys(PDF_PATH)
time.sleep(1)  # file picked, the "Generate lectures" button appears

driver.find_element(By.XPATH, "//button[normalize-space()='Generate lectures']").click()
print(f"Generating lectures from {os.path.basename(PDF_PATH)} - this can take a few minutes...")

try:
    WebDriverWait(driver, 300).until(
        lambda d: d.find_elements(By.XPATH, "//span[contains(text(), 'AI drafted')]")
        or d.find_elements(By.XPATH, "//p[contains(@class, 'text-[#C4453A]') and contains(@class, 'bg-[#FDEEEE]')]")
    )
except TimeoutException:
    raise SystemExit("Timed out waiting for the AI to finish generating lectures (5 min).")

generation_error = driver.find_elements(By.XPATH, "//p[contains(@class, 'text-[#C4453A]') and contains(@class, 'bg-[#FDEEEE]')]")
if generation_error:
    raise SystemExit(f"FAIL: lecture generation failed - {generation_error[0].text}")

print(f"Generated: {driver.find_element(By.XPATH, '//span[contains(text(), \"AI drafted\")]').text}")

# --- Publish the course ---
driver.find_element(By.XPATH, "//button[contains(., 'Publish')]").click()

# The page-level notice/error banner uses one of two color combos - green
# for success, red for a validation or save error - regardless of the exact
# wording, so wait for either rather than matching specific message text.
WebDriverWait(driver, 15).until(
    lambda d: d.find_elements(By.XPATH, "//div[contains(@class,'bg-[#FDEEEE]') and contains(@class,'text-[#B03A31]')]")
    or d.find_elements(By.XPATH, "//div[contains(@class,'bg-[#E6F3E3]')]")
)

error_banner = driver.find_elements(By.XPATH, "//div[contains(@class,'bg-[#FDEEEE]') and contains(@class,'text-[#B03A31]')]")
if error_banner:
    print(f"FAIL: publish was rejected - {error_banner[0].text}")
else:
    notice_text = driver.find_element(By.XPATH, "//div[contains(@class,'bg-[#E6F3E3]')]").text
    if "published" in notice_text.lower():
        print(f"PASS: created and published '{course_title}'")
    else:
        print(f"FAIL: unexpected notice after publish - {notice_text}")
