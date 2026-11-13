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

# Exact candidate CSS to evaluate
CANDIDATE_CSS = """
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

/* 4. Compact layout for screens with height <= 620px */
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
"""

VIEWPORTS = [
    {"name": "Standard Laptop 720p", "width": 1280, "height": 720, "scale": 1.0},
    {"name": "Standard Laptop 768p", "width": 1366, "height": 768, "scale": 1.0},
    {"name": "Full HD 1080p", "width": 1920, "height": 1080, "scale": 1.0},
    {"name": "16:10 Laptop/Desktop", "width": 1440, "height": 900, "scale": 1.0},
    {"name": "Extreme Boundary Netbook", "width": 1024, "height": 550, "scale": 1.0},
    {"name": "1920x1080 @ 125% Scale", "width": 1536, "height": 864, "scale": 1.25},
    {"name": "1920x1080 @ 150% Scale", "width": 1280, "height": 720, "scale": 1.5},
    {"name": "1366x768 @ 125% Scale", "width": 1093, "height": 614, "scale": 1.25},
    {"name": "1366x768 @ 150% Scale", "width": 911, "height": 512, "scale": 1.5},
]

def create_driver(viewport):
    options = Options()
    options.add_argument('--headless=new')
    options.add_argument('--disable-gpu')
    options.add_argument('--no-sandbox')
    options.add_argument(f"--window-size={viewport['width']},{viewport['height']}")
    driver = webdriver.Edge(options=options)
    if viewport["scale"] != 1.0:
        driver.execute_cdp_cmd("Emulation.setDeviceMetricsOverride", {
            "width": viewport["width"],
            "height": viewport["height"],
            "deviceScaleFactor": viewport["scale"],
            "mobile": False
        })
    return driver

def run_tests():
    failures = []
    print("Running Full Adversarial Suite with Candidate CSS Patch...")

    for vp in VIEWPORTS:
        vp_name = vp["name"]
        driver = create_driver(vp)
        try:
            driver.get(URL)
            time.sleep(0.3)

            # Inject patch
            driver.execute_script(f"""
                const style = document.createElement('style');
                style.id = 'candidate-patch';
                style.textContent = `{CANDIDATE_CSS}`;
                document.head.appendChild(style);
            """)
            time.sleep(0.1)

            # Check 1: Student Grid
            driver.find_element(By.ID, "btn-student").click()
            time.sleep(0.15)
            driver.find_element(By.CLASS_NAME, "btn-class").click()
            time.sleep(0.2)

            grid_m = driver.execute_script("""
                const grid = document.querySelector('.student-grid, #student-list');
                const cards = Array.from(document.querySelectorAll('.student-card'));
                const winW = window.innerWidth;
                const docScrollW = document.documentElement.scrollWidth;
                const cardWidths = cards.map(c => c.getBoundingClientRect().width);
                const anyOverflowX = cards.some(c => {
                    const r = c.getBoundingClientRect();
                    return r.right > winW + 2 || r.left < -2;
                });
                return {
                    docScrollW, winW,
                    hasHScroll: docScrollW > winW + 1,
                    anyOverflowX,
                    minW: Math.min(...cardWidths),
                    maxW: Math.max(...cardWidths)
                };
            """)
            if grid_m["hasHScroll"]:
                failures.append(f"{vp_name}: Horizontal scroll on student screen (scrollW={grid_m['docScrollW']}, winW={grid_m['winW']})")
            if grid_m["anyOverflowX"]:
                failures.append(f"{vp_name}: Student card overflows screen")
            if grid_m["maxW"] > 420:
                failures.append(f"{vp_name}: Card too wide ({grid_m['maxW']}px)")
            if grid_m["minW"] < 180:
                failures.append(f"{vp_name}: Card too narrow ({grid_m['minW']}px)")

            # Check 2: Typing Screen
            cards = driver.find_elements(By.CLASS_NAME, "student-card")
            cards[0].click()
            time.sleep(0.15)
            driver.find_element(By.CSS_SELECTOR, '[data-module="typing"]').click()
            time.sleep(0.2)

            typing_m = driver.execute_script("""
                const winH = window.innerHeight;
                const winW = window.innerWidth;
                const docScrollH = document.documentElement.scrollHeight;
                const docScrollW = document.documentElement.scrollWidth;
                const kb = document.querySelector('.keyboard');
                const kbRect = kb ? kb.getBoundingClientRect() : null;
                return {
                    winH, winW, docScrollH, docScrollW,
                    hasDocVScroll: docScrollH > winH + 1,
                    hasDocHScroll: docScrollW > winW + 1,
                    kbVisible: kbRect ? (kbRect.bottom <= winH + 2 && kbRect.top >= 0) : false,
                    kbBottom: kbRect ? kbRect.bottom : 0
                };
            """)
            if typing_m["hasDocVScroll"]:
                failures.append(f"{vp_name}: Vertical scroll on typing screen (docH={typing_m['docScrollH']} > winH={typing_m['winH']})")
            if typing_m["hasDocHScroll"]:
                failures.append(f"{vp_name}: Horizontal scroll on typing screen (docW={typing_m['docScrollW']} > winW={typing_m['winW']})")
            if not typing_m["kbVisible"]:
                failures.append(f"{vp_name}: Keyboard clipped (bottom={typing_m['kbBottom']}, winH={typing_m['winH']})")

            # Check 3: Slide Modal
            driver.find_element(By.CSS_SELECTOR, '#screen-typing .btn-back').click()
            time.sleep(0.15)
            driver.find_element(By.CSS_SELECTOR, '[data-module="theory"]').click()
            time.sleep(0.2)
            driver.find_element(By.CLASS_NAME, "btn-open-slides").click()
            time.sleep(0.3)

            modal_m = driver.execute_script("""
                const winH = window.innerHeight;
                const modal = document.querySelector('.modal-box');
                const navBar = document.querySelector('.slide-nav-bar');
                const nextBtn = document.getElementById('btn-slide-next');
                const prevBtn = document.getElementById('btn-slide-prev');
                const notes = document.querySelector('.slide-notes');
                const mRect = modal.getBoundingClientRect();
                const nextRect = nextBtn ? nextBtn.getBoundingClientRect() : null;
                const prevRect = prevBtn ? prevBtn.getBoundingClientRect() : null;
                const notesRect = notes ? notes.getBoundingClientRect() : null;
                return {
                    modalInWin: (mRect.top >= 0) && (mRect.bottom <= winH + 1),
                    navBtnsVis: nextRect && prevRect && (nextRect.bottom <= winH) && (nextRect.top >= 0) && (prevRect.bottom <= winH) && (prevRect.top >= 0),
                    navSticky: navBar ? window.getComputedStyle(navBar).position === 'sticky' : false,
                    notesVis: notesRect ? (notesRect.bottom <= winH && notesRect.top >= 0) : true
                };
            """)
            if not modal_m["modalInWin"]:
                failures.append(f"{vp_name}: Modal clipped outside window")
            if not modal_m["navBtnsVis"]:
                failures.append(f"{vp_name}: Slide nav buttons clipped")
            if not modal_m["navSticky"]:
                failures.append(f"{vp_name}: Slide nav bar not sticky")

            # Stress test long notes
            stress_m = driver.execute_script("""
                const winH = window.innerHeight;
                let notes = document.querySelector('.slide-notes');
                if (!notes) {
                    notes = document.createElement('div');
                    notes.className = 'slide-notes';
                    document.querySelector('.slide-viewer').appendChild(notes);
                }
                notes.innerHTML = '<strong>СТРЕСС-ТЕСТ:</strong><p>' + 'Длинный текст. '.repeat(60) + '</p>';
                const modal = document.querySelector('.modal-box');
                const nextBtn = document.getElementById('btn-slide-next');
                const mRect = modal.getBoundingClientRect();
                const nRect = nextBtn ? nextBtn.getBoundingClientRect() : null;
                return {
                    modalInWin: (mRect.top >= 0) && (mRect.bottom <= winH + 1),
                    navBtnVis: nRect ? (nRect.top >= 0 && nRect.bottom <= winH) : false
                };
            """)
            if not stress_m["modalInWin"]:
                failures.append(f"{vp_name}: Modal pushed outside window during long notes stress test")
            if not stress_m["navBtnVis"]:
                failures.append(f"{vp_name}: Nav buttons clipped during long notes stress test")

            # Close modal
            driver.find_element(By.ID, "modal-close-btn").click()
            time.sleep(0.15)

            # Check 4: Teacher Sticky Header
            driver.find_element(By.CSS_SELECTOR, '#screen-materials .btn-back').click()
            time.sleep(0.15)
            driver.find_element(By.ID, "btn-logout").click()
            time.sleep(0.15)
            driver.find_element(By.ID, "btn-teacher").click()
            time.sleep(0.15)
            driver.find_element(By.ID, "teacher-password").send_keys("teacher123")
            driver.find_element(By.ID, "btn-teacher-enter").click()
            time.sleep(0.3)

            teacher_m = driver.execute_script("""
                const wrap = document.querySelector('.table-responsive');
                const th = document.querySelector('.teacher-table th');
                if (!wrap || !th) return { error: true };
                const offsets = [0, 150, 400, 800, wrap.scrollHeight];
                const measurements = [];
                for (const o of offsets) {
                    wrap.scrollTop = o;
                    const wR = wrap.getBoundingClientRect();
                    const tR = th.getBoundingClientRect();
                    measurements.push(Math.abs(tR.top - wR.top) <= 2);
                }
                const pageW = document.documentElement.scrollWidth;
                const winW = window.innerWidth;
                return {
                    allSticky: measurements.every(Boolean),
                    pageNoBlowout: pageW <= winW + 1
                };
            """)
            if not teacher_m.get("allSticky", False):
                failures.append(f"{vp_name}: Teacher table lost stickiness")
            if not teacher_m.get("pageNoBlowout", False):
                failures.append(f"{vp_name}: Teacher table caused page blowout")

            print(f"  [OK] {vp_name}")

        except Exception as e:
            failures.append(f"{vp_name} crashed: {str(e)}")
            print(f"  [FAIL] {vp_name}: {e}")
        finally:
            driver.quit()

    print("\n" + "=" * 50)
    print(f"TOTAL FAILURES: {len(failures)}")
    for f in failures:
        print("  - " + f)
    print("=" * 50)
    return len(failures) == 0

if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)
