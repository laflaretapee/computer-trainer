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

# Candidate CSS to test
CANDIDATE_CSS = """
/* Fix min-width */
html, body {
  min-width: 0 !important;
  width: 100% !important;
  overflow-x: hidden !important;
}

/* Fix module-container min-height in typing screen */
#screen-typing .module-container {
  min-height: 0 !important;
  height: 100% !important;
}

/* Compact layout for screens with max-height <= 620px */
@media (max-height: 620px) {
  .screen-header {
    padding: 6px 16px !important;
  }
  .screen-header .btn-back {
    padding: 6px 12px !important;
    font-size: 0.85rem !important;
  }
  .screen-title {
    font-size: 1.1rem !important;
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
    font-size: 0.75rem !important;
  }
  .level-title {
    padding: 4px 10px !important;
    font-size: 0.82rem !important;
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
    padding: 6px !important;
    gap: 3px !important;
  }
  .kb-key, .key {
    height: 30px !important;
    min-width: 28px !important;
    font-size: 0.78rem !important;
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
    max-height: clamp(100px, 28vh, 200px) !important;
  }
  .slide-notes {
    max-height: clamp(40px, 11vh, 75px) !important;
    padding: 6px 10px !important;
    font-size: 0.78rem !important;
    line-height: 1.35 !important;
  }
}

/* Elastic grid */
.student-grid {
  grid-template-columns: repeat(auto-fill, minmax(clamp(220px, 24vw, 280px), 1fr)) !important;
}
"""

def test_viewport(w, h, scale=1.0):
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
        time.sleep(0.3)

        # Inject Candidate CSS
        driver.execute_script(f"""
            const style = document.createElement('style');
            style.id = 'candidate-test-style';
            style.textContent = `{CANDIDATE_CSS}`;
            document.head.appendChild(style);
        """)
        time.sleep(0.1)

        # 1. Check Student Grid
        driver.find_element(By.ID, "btn-student").click()
        time.sleep(0.15)
        driver.find_element(By.CLASS_NAME, "btn-class").click()
        time.sleep(0.2)

        grid_res = driver.execute_script("""
            const winW = window.innerWidth;
            const docScrollW = document.documentElement.scrollWidth;
            const cards = Array.from(document.querySelectorAll('.student-card'));
            const anyCardOverflow = cards.some(c => {
                const r = c.getBoundingClientRect();
                return r.right > winW + 2 || r.left < -2;
            });
            const cardWidths = cards.map(c => c.getBoundingClientRect().width);
            return {
                winW, docScrollW,
                hasHScroll: docScrollW > winW + 1,
                anyCardOverflow,
                minCardW: Math.min(...cardWidths),
                maxCardW: Math.max(...cardWidths)
            };
        """)

        # 2. Check Typing Screen
        cards = driver.find_elements(By.CLASS_NAME, "student-card")
        cards[0].click()
        time.sleep(0.15)
        driver.find_element(By.CSS_SELECTOR, '[data-module="typing"]').click()
        time.sleep(0.2)

        typing_res = driver.execute_script("""
            const winH = window.innerHeight;
            const winW = window.innerWidth;
            const docScrollH = document.documentElement.scrollHeight;
            const docScrollW = document.documentElement.scrollWidth;
            const kb = document.querySelector('.keyboard');
            const kbRect = kb ? kb.getBoundingClientRect() : null;
            const screen = document.getElementById('screen-typing');
            const trainer = document.querySelector('.typing-trainer');

            return {
                winH, winW, docScrollH, docScrollW,
                hasDocVScroll: docScrollH > winH + 1,
                hasDocHScroll: docScrollW > winW + 1,
                kbVisible: kbRect ? (kbRect.bottom <= winH + 2 && kbRect.top >= 0) : false,
                kbHeight: kbRect ? kbRect.height : 0,
                kbBottom: kbRect ? kbRect.bottom : 0,
                trainerHeight: trainer ? trainer.getBoundingClientRect().height : 0
            };
        """)

        # 3. Check Modal
        driver.find_element(By.CSS_SELECTOR, '#screen-typing .btn-back').click()
        time.sleep(0.15)
        driver.find_element(By.CSS_SELECTOR, '[data-module="theory"]').click()
        time.sleep(0.2)
        driver.find_element(By.CLASS_NAME, "btn-open-slides").click()
        time.sleep(0.3)

        modal_res = driver.execute_script("""
            const winH = window.innerHeight;
            const winW = window.innerWidth;
            const modal = document.querySelector('.modal-box');
            const nextBtn = document.getElementById('btn-slide-next');
            const prevBtn = document.getElementById('btn-slide-prev');
            const notes = document.querySelector('.slide-notes');
            const img = document.querySelector('.slide-image');

            const mRect = modal ? modal.getBoundingClientRect() : null;
            const nextRect = nextBtn ? nextBtn.getBoundingClientRect() : null;
            const prevRect = prevBtn ? prevBtn.getBoundingClientRect() : null;
            const notesRect = notes ? notes.getBoundingClientRect() : null;
            const imgRect = img ? img.getBoundingClientRect() : null;

            return {
                modalWithinWindow: mRect ? (mRect.top >= 0 && mRect.bottom <= winH + 1) : false,
                modalH: mRect ? mRect.height : 0,
                modalBottom: mRect ? mRect.bottom : 0,
                navButtonsVisible: nextRect && prevRect && (nextRect.bottom <= winH) && (nextRect.top >= 0) && (prevRect.bottom <= winH) && (prevRect.top >= 0),
                notesVisible: notesRect ? (notesRect.bottom <= winH + 1 && notesRect.top >= 0) : true,
                notesRect: notesRect ? { top: notesRect.top, bottom: notesRect.bottom, height: notesRect.height } : null,
                imgRect: imgRect ? { height: imgRect.height } : null
            };
        """)

        return {
            "grid": grid_res,
            "typing": typing_res,
            "modal": modal_res
        }
    finally:
        driver.quit()

if __name__ == "__main__":
    viewports = [
        ("1024x550", 1024, 550, 1.0),
        ("1366x768 @ 150%", 911, 512, 1.5),
        ("1280x720", 1280, 720, 1.0),
        ("1366x768", 1366, 768, 1.0),
        ("1920x1080", 1920, 1080, 1.0),
    ]
    for name, w, h, scale in viewports:
        print(f"=== Testing {name} ===")
        res = test_viewport(w, h, scale)
        print(json.dumps(res, indent=2))
