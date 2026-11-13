"""
Focus and Keyboard Navigation A11y Verification Script
"""
import os
import time
from selenium import webdriver
from selenium.webdriver.edge.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
INDEX_HTML_PATH = os.path.join(PROJECT_ROOT, "index.html")

options = Options()
options.add_argument('--headless=new')
options.add_argument('--disable-gpu')
options.add_argument('--no-sandbox')
options.add_argument('--window-size=1280,720')
driver = webdriver.Edge(options=options)

try:
    driver.get("file:///" + INDEX_HTML_PATH.replace("\\", "/"))
    time.sleep(0.3)

    # 1. Mouse Click focus suppression test
    btn_teacher = driver.find_element(By.ID, "btn-teacher")
    btn_teacher.click()
    time.sleep(0.1)

    mouse_focus = driver.execute_script("""
        const el = document.getElementById('btn-teacher');
        const cs = window.getComputedStyle(el);
        return {
            matchesFocusVisible: el.matches(':focus-visible'),
            outlineStyle: cs.outlineStyle
        };
    """)
    print("Mouse focus suppression:", mouse_focus)
    assert not mouse_focus['matchesFocusVisible'], "Mouse click should not trigger :focus-visible"
    assert mouse_focus['outlineStyle'] == 'none', "Mouse click should have outlineStyle 'none'"

    # 2. Keyboard Tab navigation focus-visible test
    driver.get("file:///" + INDEX_HTML_PATH.replace("\\", "/"))
    time.sleep(0.3)
    
    body = driver.find_element(By.TAG_NAME, "body")
    body.send_keys(Keys.TAB)
    time.sleep(0.1)

    kb_focus = driver.execute_script("""
        const el = document.activeElement;
        const cs = window.getComputedStyle(el);
        return {
            tagName: el.tagName,
            id: el.id,
            matchesFocusVisible: el.matches(':focus-visible'),
            outlineStyle: cs.outlineStyle,
            outlineWidth: cs.outlineWidth,
            outlineColor: cs.outlineColor,
            outlineOffset: cs.outlineOffset
        };
    """)
    print("Keyboard Tab focus-visible ring:", kb_focus)
    assert kb_focus['matchesFocusVisible'], "Tab navigation must match :focus-visible"
    assert kb_focus['outlineStyle'] == 'solid', f"Expected solid outline, got {kb_focus['outlineStyle']}"
    assert kb_focus['outlineWidth'] == '3px', f"Expected 3px outline, got {kb_focus['outlineWidth']}"
    assert '37, 99, 235' in kb_focus['outlineColor'], f"Expected primary color outline, got {kb_focus['outlineColor']}"
    assert kb_focus['outlineOffset'] == '2px', f"Expected 2px outline-offset, got {kb_focus['outlineOffset']}"

    print("ALL ACCESSIBILITY AND FOCUS TESTS PASSED!")

finally:
    driver.quit()
