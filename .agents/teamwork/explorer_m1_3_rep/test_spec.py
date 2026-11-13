import os
import json
import time
from selenium import webdriver
from selenium.webdriver.edge.options import Options
from selenium.webdriver.common.by import By

HTML_PATH = "file:///" + os.path.abspath(r"C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\index.html").replace("\\", "/")

PROPOSED_CSS = """
/* === PROPOSED SPECIFICATION FOR MILESTONE 1 === */

button:focus-visible,
input:not(.tt-hidden-input):focus-visible,
select:focus-visible,
.btn:focus-visible,
.btn-class:focus-visible,
.student-card:focus-visible,
.btn-module:focus-visible,
.answer-btn:focus-visible,
.level-btn:focus-visible,
.kb-key:focus-visible,
.modal-close:focus-visible,
.btn-sm:focus-visible {
  outline: 3px solid var(--color-primary) !important;
  outline-offset: 2px !important;
}

button:focus:not(:focus-visible),
input:focus:not(:focus-visible),
select:focus:not(:focus-visible),
.btn:focus:not(:focus-visible) {
  outline: none !important;
}
"""

options = Options()
options.add_argument('--headless=new')
options.add_argument('--disable-gpu')
options.add_argument('--no-sandbox')
options.add_argument('--window-size=1366,768')
driver = webdriver.Edge(options=options)

try:
    driver.get(HTML_PATH)
    time.sleep(0.5)

    # Inject proposed CSS
    driver.execute_script("""
        const style = document.createElement('style');
        style.id = 'injected-spec-css';
        style.textContent = arguments[0];
        document.head.appendChild(style);
    """, PROPOSED_CSS)

    # Click on btn-teacher with mouse
    btn_teacher = driver.find_element(By.ID, "btn-teacher")
    btn_teacher.click()
    time.sleep(0.2)

    click_focus_info = driver.execute_script("""
        const btn = document.getElementById('btn-teacher');
        const cs = window.getComputedStyle(btn);
        return {
            tagName: btn.tagName,
            id: btn.id,
            matchesFocus: btn.matches(':focus'),
            matchesFocusVisible: btn.matches(':focus-visible'),
            outlineStyle: cs.outlineStyle,
            outlineWidth: cs.outlineWidth
        };
    """)

    print("Mouse click focus info:")
    print(json.dumps(click_focus_info, indent=2))

finally:
    driver.quit()
