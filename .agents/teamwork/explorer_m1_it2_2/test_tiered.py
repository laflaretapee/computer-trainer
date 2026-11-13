import os
import sys
import time
import json
from selenium import webdriver
from selenium.webdriver.edge.options import Options
from selenium.webdriver.common.by import By

PROJECT_ROOT = os.path.abspath(r"C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer")
INDEX_HTML = os.path.join(PROJECT_ROOT, "index.html")
URL = "file:///" + INDEX_HTML.replace("\\", "/")

FLUID_CSS = """
/* 1. Body & HTML min-width fix */
html, body {
  min-width: 0 !important;
  width: 100% !important;
  overflow-x: hidden !important;
}

/* 2. Student Grid elastic wrapping */
.student-grid {
  grid-template-columns: repeat(auto-fill, minmax(clamp(220px, 24vw, 280px), 1fr)) !important;
}

/* 3. Typing container min-height override */
#screen-typing .module-container {
  min-height: 0 !important;
  height: 100% !important;
}

/* 4. Tiered low-height media queries */
@media (max-height: 620px) {
  .screen-header {
    padding: 6px 16px !important;
  }
  .screen-header .btn-back {
    padding: 6px 14px !important;
    font-size: 0.85rem !important;
  }
  .screen-title {
    font-size: 1.15rem !important;
  }
  #screen-typing .screen-body {
    padding: 6px 16px !important;
    gap: 4px !important;
  }
  .typing-trainer {
    gap: 4px !important;
  }
  .level-selector {
    gap: 4px !important;
  }
  .level-btn, .btn-level {
    padding: 3px 8px !important;
    font-size: 0.76rem !important;
  }
  .level-title {
    padding: 4px 10px !important;
    font-size: 0.85rem !important;
  }
  .typing-text-wrap {
    margin: 1px 0 !important;
  }
  .typing-text {
    min-height: 44px !important;
    padding: 6px 12px !important;
    font-size: 1.1rem !important;
    line-height: 1.35 !important;
  }
  .keyboard-wrap {
    gap: 4px !important;
  }
  .keyboard {
    padding: 6px 10px !important;
    gap: 3px !important;
  }
  .kb-key, .key {
    height: 32px !important;
    min-width: 28px !important;
    font-size: 0.8rem !important;
    padding: 0 4px !important;
  }
  .kb-space, .key-space {
    min-width: 170px !important;
  }
  .typing-stats {
    gap: 12px !important;
    font-size: 0.82rem !important;
  }
  .stat-item {
    font-size: 0.82rem !important;
  }
  .stat-item strong {
    font-size: 0.95rem !important;
  }

  /* Slide Modal */
  .modal-box {
    max-height: calc(100vh - 20px) !important;
    padding: 10px 14px !important;
    gap: 6px !important;
  }
  .modal-header {
    padding-bottom: 4px !important;
  }
  .modal-header h2 {
    font-size: 1.05rem !important;
  }
  .modal-body {
    gap: 8px !important;
  }
  .slide-viewer {
    gap: 6px !important;
  }
  .slide-nav-bar {
    padding-bottom: 4px !important;
  }
  .slide-nav-btns .btn {
    padding: 6px 14px !important;
    font-size: 0.85rem !important;
  }
  .slide-image {
    max-height: clamp(120px, 30vh, 220px) !important;
  }
  .slide-notes {
    max-height: clamp(45px, 12vh, 80px) !important;
    padding: 6px 10px !important;
    font-size: 0.8rem !important;
    line-height: 1.35 !important;
  }
}

/* 5. Extreme low-height boundary query (<= 500px, e.g. 1024x550 netbooks, window innerHeight ~ 407px) */
@media (max-height: 500px) {
  .screen-header {
    padding: 4px 14px !important;
  }
  .screen-header .btn-back {
    padding: 4px 10px !important;
    font-size: 0.8rem !important;
  }
  .screen-title {
    font-size: 1.05rem !important;
  }
  #screen-typing .screen-body {
    padding: 4px 14px !important;
    gap: 3px !important;
  }
  .typing-trainer {
    gap: 3px !important;
  }
  .level-btn, .btn-level {
    padding: 2px 6px !important;
    font-size: 0.72rem !important;
  }
  .level-title {
    padding: 3px 8px !important;
    font-size: 0.8rem !important;
  }
  .typing-text {
    min-height: 40px !important;
    padding: 4px 10px !important;
    font-size: 1.02rem !important;
  }
  .keyboard {
    padding: 4px 8px !important;
    gap: 2px !important;
  }
  .kb-key, .key {
    height: 29px !important;
    min-width: 26px !important;
    font-size: 0.76rem !important;
  }
  .kb-space, .key-space {
    min-width: 150px !important;
  }
  .slide-image {
    max-height: clamp(90px, 26vh, 160px) !important;
  }
  .slide-notes {
    max-height: clamp(38px, 10vh, 65px) !important;
    padding: 4px 8px !important;
    font-size: 0.74rem !important;
  }
}
"""

TEST_VIEWPORTS = [
    ("Extreme 1024x550 (winH=407)", 1024, 550, 1.0),
    ("Ultra Extreme 1024x480 (winH=337)", 1024, 480, 1.0),
    ("1366x768 @ 150% (winH=512)", 911, 512, 1.5),
    ("1366x768 @ 125% (winH=614)", 1093, 614, 1.25),
    ("720p Laptop (winH=577)", 1280, 720, 1.0),
    ("Full HD 1080p (winH=937)", 1920, 1080, 1.0),
]

def run():
    options = Options()
    options.add_argument('--headless=new')
    options.add_argument('--disable-gpu')
    options.add_argument('--no-sandbox')

    for name, w, h, s in TEST_VIEWPORTS:
        driver = webdriver.Edge(options=options)
        driver.set_window_size(w, h)
        if s != 1.0:
            driver.execute_cdp_cmd("Emulation.setDeviceMetricsOverride", {
                "width": w, "height": h, "deviceScaleFactor": s, "mobile": False
            })
        try:
            driver.get(URL)
            time.sleep(0.3)
            driver.execute_script(f"""
                const style = document.createElement('style');
                style.textContent = `{FLUID_CSS}`;
                document.head.appendChild(style);
            """)
            time.sleep(0.1)

            # Go to typing
            driver.find_element(By.ID, "btn-student").click()
            time.sleep(0.1)
            driver.find_element(By.CLASS_NAME, "btn-class").click()
            time.sleep(0.1)
            driver.find_elements(By.CLASS_NAME, "student-card")[0].click()
            time.sleep(0.1)
            driver.find_element(By.CSS_SELECTOR, '[data-module="typing"]').click()
            time.sleep(0.2)

            t_info = driver.execute_script("""
                const winH = window.innerHeight;
                const docH = document.documentElement.scrollHeight;
                const kb = document.querySelector('.keyboard');
                const kbRect = kb ? kb.getBoundingClientRect() : null;
                return {
                    winH, docH,
                    vScroll: docH > winH + 1,
                    kbH: kbRect ? kbRect.height : 0,
                    kbBottom: kbRect ? kbRect.bottom : 0,
                    kbInWin: kbRect ? (kbRect.bottom <= winH + 2 && kbRect.top >= 0) : false
                };
            """)

            # Modal
            driver.find_element(By.CSS_SELECTOR, '#screen-typing .btn-back').click()
            time.sleep(0.1)
            driver.find_element(By.CSS_SELECTOR, '[data-module="theory"]').click()
            time.sleep(0.1)
            driver.find_element(By.CLASS_NAME, "btn-open-slides").click()
            time.sleep(0.2)

            m_info = driver.execute_script("""
                const winH = window.innerHeight;
                const modal = document.querySelector('.modal-box');
                const notes = document.querySelector('.slide-notes');
                const nextBtn = document.getElementById('btn-slide-next');
                const mRect = modal ? modal.getBoundingClientRect() : null;
                const nRect = notes ? notes.getBoundingClientRect() : null;
                const bRect = nextBtn ? nextBtn.getBoundingClientRect() : null;
                return {
                    mInWin: mRect ? (mRect.top >= 0 && mRect.bottom <= winH + 1) : false,
                    btnVis: bRect ? (bRect.top >= 0 && bRect.bottom <= winH) : false,
                    notesVis: nRect ? (nRect.top >= 0 && nRect.bottom <= winH + 1) : false,
                    mH: mRect ? mRect.height : 0,
                    notesBottom: nRect ? nRect.bottom : 0
                };
            """)

            print(f"{name}:")
            print(f"  Typing: winH={t_info['winH']}, docH={t_info['docH']}, vScroll={t_info['vScroll']}, kbH={t_info['kbH']:.1f}px, kbInWin={t_info['kbInWin']}")
            print(f"  Modal:  mInWin={m_info['mInWin']}, btnVis={m_info['btnVis']}, notesVis={m_info['notesVis']}, mH={m_info['mH']:.1f}px, notesBottom={m_info['notesBottom']:.1f}px")

        finally:
            driver.quit()

if __name__ == "__main__":
    run()
