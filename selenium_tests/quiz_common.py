"""
Shared helpers for the course/quiz tests (test_enrollment.py,
test_quiz_correct_answer.py, test_quiz_wrong_answer.py) - not a test by
itself, just the setup logic those scripts share.

All three tests need to: log in, open a course that isn't enrolled yet, and
enroll in it - picking a not-yet-enrolled course each run (instead of always
the same one) means every run genuinely exercises the enroll action instead
of finding it already done. From there, the quiz tests also need to open a
lesson and interact with its quiz. The one tricky part they share is that
Stellar never reveals which option is correct anywhere in the page until
AFTER you submit an attempt (see QuizTaker.jsx) - so both quiz scripts first
submit a throwaway guess just to reveal the real answer key, click Retry,
and only then submit the answers they actually care about testing.
"""

import os
import time

from selenium import webdriver
from selenium.webdriver.edge.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait

APP_URL = "http://localhost:5173"


def get_test_credentials():
    email = os.environ.get("SELENIUM_TEST_EMAIL")
    password = os.environ.get("SELENIUM_TEST_PASSWORD")
    if not email or not password:
        raise SystemExit(
            "Set the SELENIUM_TEST_EMAIL and SELENIUM_TEST_PASSWORD "
            "environment variables to a real Stellar account before running "
            "this test - see selenium_tests/README.md."
        )
    return email, password


def start_browser():
    service_obj = Service()
    # Keep the browser window open after the script finishes, so the result
    # is visible instead of the window closing immediately.
    options = webdriver.EdgeOptions()
    options.add_experimental_option("detach", True)
    driver = webdriver.Edge(options=options, service=service_obj)
    driver.maximize_window()
    return driver


def log_in(driver, email, password):
    driver.get(APP_URL)
    driver.find_element(By.XPATH, "//button[normalize-space()='Log In']").click()
    time.sleep(1)  # let the modal's open animation finish

    driver.find_element(By.CSS_SELECTOR, "input[type='email']").send_keys(email)
    driver.find_element(By.CSS_SELECTOR, "input[type='password']").send_keys(password)
    driver.find_element(By.CLASS_NAME, "authmodal-submit").click()
    time.sleep(3)  # sign-in + close animation + redirect

    if "/dashboard" not in driver.current_url:
        raise SystemExit(f"Login failed - current URL is {driver.current_url}")


def open_first_course(driver):
    """Goes to Courses and opens the first course that isn't enrolled yet -
    on the course list, a not-yet-enrolled course's action link reads
    exactly 'View' (see Courses/index.jsx), while an already-enrolled one
    reads 'Start'/'Continue'/'Review'. Picking a 'View' one each run means
    the test always exercises a real, fresh enrollment. Falls back to
    whichever course lists first if every course is already enrolled."""
    driver.get(f"{APP_URL}/courses")
    time.sleep(2)  # course list loads asynchronously

    unenrolled_links = driver.find_elements(
        By.XPATH, "//a[contains(@href, '/courses/')][normalize-space()='View']"
    )
    if unenrolled_links:
        unenrolled_links[0].click()
    else:
        driver.find_element(By.XPATH, "(//a[contains(@href, '/courses/')])[1]").click()

    # The course page fetches the course, its lessons, and the enrollment
    # status asynchronously - a fixed sleep here was racing that fetch and
    # sometimes finding neither the Enroll button nor a lesson link yet, so
    # enroll_if_needed() would wrongly conclude nothing needed to be clicked.
    # Wait for whichever one actually shows up instead of guessing a delay.
    WebDriverWait(driver, 10).until(
        lambda d: d.find_elements(By.XPATH, "//button[contains(., 'Enroll in course')]")
        or d.find_elements(By.XPATH, "//a[contains(@href, '/lessons/')]")
    )


def enroll_if_needed(driver):
    """Clicks 'Enroll in course' if it's showing. Returns True if it just
    enrolled, False if the account was already enrolled in this course."""
    enroll_buttons = driver.find_elements(By.XPATH, "//button[contains(., 'Enroll in course')]")
    if enroll_buttons:
        enroll_buttons[0].click()
        time.sleep(1)
        return True
    return False


def wait_for_lesson_page_loaded(driver, timeout=10):
    """The lesson page fetches its content and quiz asynchronously too, same
    as the course page - wait for the quiz questions, the mark-complete
    button, or the 'no quiz yet' notice to actually render before deciding
    whether this lesson has a quiz, instead of guessing a fixed delay."""
    WebDriverWait(driver, timeout).until(
        lambda d: d.find_elements(By.XPATH, "//div[@class='flex flex-col gap-2']")
        or d.find_elements(By.XPATH, "//button[contains(., 'Mark as complete')]")
        or d.find_elements(By.XPATH, "//button[contains(., 'Completed')]")
    )


def open_first_lesson(driver):
    """From the course page, opens its first available (unlocked) lesson."""
    driver.find_element(By.XPATH, "(//a[contains(@href, '/lessons/')])[1]").click()
    wait_for_lesson_page_loaded(driver)


def has_quiz_on_page(driver):
    return bool(driver.find_elements(By.XPATH, "//div[@class='flex flex-col gap-2']"))


def get_question_option_groups(driver):
    """Each quiz question's row of answer-option buttons, in DOM order -
    QuizTaker.jsx gives each one the exact class 'flex flex-col gap-2'."""
    groups = driver.find_elements(By.XPATH, "//div[@class='flex flex-col gap-2']")
    if not groups:
        raise SystemExit("No quiz found on this lesson.")
    return groups


def click_submit(driver):
    driver.find_element(
        By.XPATH, "//button[starts-with(normalize-space(text()), 'Submit answers')]"
    ).click()


def wait_for_quiz_result(driver, timeout=15):
    """Submitting grades the attempt via a real Supabase round-trip, so the
    result banner (and each option's correct/incorrect icon, set by the same
    React state update) doesn't appear immediately - a fixed sleep here was
    racing that request and sometimes reading the page before grading
    finished. Wait for the Retry button, which only renders once results
    are in, instead of guessing how long grading takes."""
    WebDriverWait(driver, timeout).until(
        lambda d: d.find_elements(By.XPATH, "//button[normalize-space()='Retry']")
    )


def probe_for_answer_key(driver):
    """
    Submits a throwaway first guess (the first option for every question)
    purely to reveal the real answer key, then clicks Retry to reset before
    the caller submits the answers it actually cares about testing.

    Returns (correct_buttons, wrong_buttons): one button per question that's
    confirmed correct, and one confirmed incorrect - both remain clickable
    after Retry, since Retry only clears local state, not the page itself.
    """
    for group in get_question_option_groups(driver):
        group.find_elements(By.TAG_NAME, "button")[0].click()

    click_submit(driver)
    wait_for_quiz_result(driver)

    correct_buttons = []
    wrong_buttons = []
    for group in get_question_option_groups(driver):
        options = group.find_elements(By.TAG_NAME, "button")
        # The correct option gets a lucide "check" icon once results are
        # shown, regardless of which option was actually picked.
        correct = next(o for o in options if o.find_elements(By.CSS_SELECTOR, "svg.lucide-check"))
        wrong = next(o for o in options if o != correct)
        correct_buttons.append(correct)
        wrong_buttons.append(wrong)

    driver.find_element(By.XPATH, "//button[normalize-space()='Retry']").click()
    time.sleep(1)  # answers/result state clears

    return correct_buttons, wrong_buttons


def submit_quiz(driver, buttons_to_click):
    """Clicks each given option button (one per question, in order), submits,
    and returns whether the quiz was graded as passed."""
    for btn in buttons_to_click:
        btn.click()
    click_submit(driver)
    wait_for_quiz_result(driver)

    if driver.find_elements(By.XPATH, "//p[contains(text(), 'Passed')]"):
        return True
    if driver.find_elements(By.XPATH, "//p[contains(text(), 'Not quite')]"):
        return False
    raise SystemExit("Could not find a result banner after submitting - something went wrong.")


def click_mark_as_complete(driver):
    """Completes a lesson that has no quiz. Skips lessons already marked
    complete, since clicking the button again would undo it instead."""
    if driver.find_elements(By.XPATH, "//button[contains(., 'Completed')]"):
        return
    driver.find_element(By.XPATH, "//button[contains(., 'Mark as complete')]").click()
    time.sleep(1)


def go_to_next_lesson_if_any(driver):
    """From a lesson page, clicks the footer's 'next lesson' link if one is
    showing (it's the only link on the page with an arrow-right icon)."""
    next_links = driver.find_elements(By.XPATH, "//a[.//svg[contains(@class, 'lucide-arrow-right')]]")
    if not next_links:
        return False
    next_links[0].click()
    wait_for_lesson_page_loaded(driver)
    return True


def complete_course_correctly(driver, max_lessons=50):
    """
    Starting from whichever lesson page is currently open, answers every
    quiz correctly (or marks quiz-less lessons complete) and advances lesson
    by lesson - one at a time, using the lesson page's own 'next lesson'
    link - until there's no next lesson left. Returns how many lessons it
    went through.
    """
    completed = 0
    for _ in range(max_lessons):
        if has_quiz_on_page(driver):
            correct_buttons, _wrong_buttons = probe_for_answer_key(driver)
            passed = submit_quiz(driver, correct_buttons)
            if not passed:
                raise SystemExit(
                    f"Lesson {completed + 1}: submitted the revealed correct "
                    "answers but the quiz still failed."
                )
        else:
            click_mark_as_complete(driver)
        completed += 1

        if not go_to_next_lesson_if_any(driver):
            break
    return completed
