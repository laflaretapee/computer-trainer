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

# Full CSS patch with 2-tier media query
TIERED_PATCH = """
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

/* 4. Tier 1: Compact Viewports (height <= 620px) */
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
    min-height: 0 !important;
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
    max-height: calc(100vh - 24px) !important;
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

/* 5. Tier 2: Ultra-Compact Boundary Viewports (height <= 500px, e.g. 1024x550 / 407px) */
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
    font-size: 0.75rem !important;
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

VIEWPORTS = [
    ("1024x550 (407px)", 1024, 550, 1.0),
    ("1366x768 @ 150% (512px)", 911, 512, 1.5),
    ("1366x768 @ 125% (614px)", 1093, 614, 1.25),
    ("1280x720 (577px)", 1280, 720, 1.0),
    ("1366x768 (625px)", 1366, 768, 1.0),
    ("1440x900 (757px)", 1440, 900, 1.0),
    ("1920x1080 (937px)", 1920, 1080, 1.0),
    ("1920x1080 @ 125% (864px)", 1536, 864, 1.25),
    ("1920x1080 @ 150% (720px)", 1280, 720, 1.5),
]

def check():
    options = Options()
    options.add_argument('--headless=new')
    options.add_argument('--disable-gpu')
    options.add_argument('--no-sandbox')

    results = []
    for name, w, h, s in VIEWPORTS:
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
                const s = document.createElement('style');
                s.textContent = `{TIERED_PATCH}`;
                document.head.appendChild(s);
            """)
            time.sleep(0.1)

            # Navigate to typing via UI clicks
            driver.find_element(By.ID, "btn-student").click()
            time.sleep(0.15)
            driver.find_element(By.CLASS_NAME, "btn-class").click()
            time.sleep(0.15)
            driver.find_elements(By.CLASS_NAME, "student-card")[0].click()
            time.sleep(0.15)
            driver.find_element(By.CSS_SELECTOR, '[data-module="typing"]').click()
            time.sleep(0.2)

            data = driver.execute_script("""
                const winH = window.innerHeight;
                const winW = window.innerWidth;
                const docH = document.documentElement.scrollHeight;
                const docW = document.documentElement.scrollWidth;
                const key = document.querySelector('.kb-key');
                const kb = document.querySelector('.keyboard');
                const keyH = key ? key.getBoundingClientRect().height : 0;
                const kbH = kb ? kb.getBoundingClientRect().height : 0;
                return {
                    winH, winW, docH, docW,
                    vScroll: docH > winH + 1,
                    hScroll: docW > winW + 1,
                    keyH, kbH
                };
            """)
            results.append((name, data))
        finally:
            driver.quit()

    print(f"{'Viewport':<28} | {'winW x winH':<14} | {'docW x docH':<14} | {'V-Scr':<6} | {'H-Scr':<6} | {'KeyH':<6} | {'KbH':<6}")
    print("-" * 88)
    for name, d in results:
        print(f"{name:<28} | {d['winW']}x{d['winH']:<9} | {d['docW']}x{d['docH']:<9} | {str(d['vScroll']):<6} | {str(d['hScroll']):<6} | {d['keyH']:.1f}px | {d['kbH']:.1f}px")

if __name__ == "__main__":
    check()
