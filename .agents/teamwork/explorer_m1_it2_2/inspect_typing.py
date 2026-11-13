import os
import sys
import time
from selenium import webdriver
from selenium.webdriver.edge.options import Options
from selenium.webdriver.common.by import By

PROJECT_ROOT = os.path.abspath(r"C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer")
INDEX_HTML = os.path.join(PROJECT_ROOT, "index.html")
URL = "file:///" + INDEX_HTML.replace("\\", "/")

def inspect_viewport(w, h, scale=1.0):
    options = Options()
    options.add_argument('--headless=new')
    options.add_argument('--disable-gpu')
    options.add_argument('--no-sandbox')
    options.add_argument(f"--window-size={w},{h}")
    driver = webdriver.Edge(options=options)
    if scale != 1.0:
        driver.execute_cdp_cmd("Emulation.setDeviceMetricsOverride", {
            "width": w,
            "height": h,
            "deviceScaleFactor": scale,
            "mobile": False
        })

    try:
        driver.get(URL)
        time.sleep(0.4)

        # Go to student screen
        driver.find_element(By.ID, "btn-student").click()
        time.sleep(0.2)
        driver.find_element(By.CLASS_NAME, "btn-class").click()
        time.sleep(0.2)
        driver.find_elements(By.CLASS_NAME, "student-card")[0].click()
        time.sleep(0.2)

        # Go to typing trainer
        driver.find_element(By.CSS_SELECTOR, '[data-module="typing"]').click()
        time.sleep(0.3)

        info = driver.execute_script("""
            const winH = window.innerHeight;
            const winW = window.innerWidth;
            const docH = document.documentElement.scrollHeight;
            const docW = document.documentElement.scrollWidth;
            const screen = document.getElementById('screen-typing');
            const header = screen.querySelector('.screen-header');
            const body = screen.querySelector('.screen-body');
            const modContainer = document.getElementById('typing-container');
            const trainer = document.querySelector('.typing-trainer');
            const levelSel = document.querySelector('.level-selector');
            const levelTitle = document.getElementById('tt-level-title');
            const textWrap = document.querySelector('.typing-text-wrap');
            const text = document.getElementById('tt-text');
            const kbWrap = document.querySelector('.keyboard-wrap');
            const kb = document.getElementById('tt-keyboard');
            const keys = Array.from(document.querySelectorAll('.kb-key, .key'));
            const stats = document.getElementById('tt-stats');

            function getBox(el) {
                if (!el) return null;
                const r = el.getBoundingClientRect();
                const cs = window.getComputedStyle(el);
                return {
                    height: r.height,
                    top: r.top,
                    bottom: r.bottom,
                    paddingTop: cs.paddingTop,
                    paddingBottom: cs.paddingBottom,
                    marginTop: cs.marginTop,
                    marginBottom: cs.marginBottom,
                    minHeight: cs.minHeight,
                    fontSize: cs.fontSize,
                    gap: cs.gap
                };
            }

            return {
                winH, winW, docH, docW,
                header: getBox(header),
                body: getBox(body),
                modContainer: getBox(modContainer),
                trainer: getBox(trainer),
                levelSel: getBox(levelSel),
                levelTitle: getBox(levelTitle),
                textWrap: getBox(textWrap),
                text: getBox(text),
                kbWrap: getBox(kbWrap),
                kb: getBox(kb),
                keySample: keys.length > 0 ? getBox(keys[0]) : null,
                stats: getBox(stats)
            };
        """)
        return info
    finally:
        driver.quit()

if __name__ == "__main__":
    print("--- 1024x550 ---")
    import json
    data = inspect_viewport(1024, 550, 1.0)
    print(json.dumps(data, indent=2))
