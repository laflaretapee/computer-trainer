"""
Empirical Verification Script for Explorer M1 Iteration 2
Simulates proposed CSS specification on top of index.html using Selenium and Edge headless.
Executes the exact checks from test_m1_adversarial_challenger.py across all 9 viewports.
"""

import os
import sys
import time
import json
from selenium import webdriver
from selenium.webdriver.edge.options import Options
from selenium.webdriver.common.by import By

PROJECT_ROOT = r"C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer"
INDEX_HTML_PATH = os.path.join(PROJECT_ROOT, "index.html")
HTML_URL = "file:///" + INDEX_HTML_PATH.replace("\\", "/")

# Exact CSS to be proposed
PROPOSED_CSS = """
/* 1. Global Reset: Remove rigid min-width: 1024px */
html, body {
  min-width: 0 !important;
  width: 100% !important;
  overflow-x: hidden !important;
}

/* 2. Containers and screen bodies constraint */
.screen,
.screen-body,
.module-container,
#typing-container,
#teacher-container,
.table-responsive {
  min-width: 0 !important;
  max-width: 100% !important;
}

/* 3. Screen Typing containment */
#screen-typing {
  height: 100vh !important;
  max-height: 100vh !important;
  overflow: hidden !important;
}

#screen-typing .screen-body {
  overflow-y: hidden !important;
}

/* 4. Fluid student grid */
.student-grid {
  grid-template-columns: repeat(auto-fill, minmax(clamp(220px, 24vw, 280px), 1fr)) !important;
}

/* 5. Compact layout for short heights (<= 620px) */
@media (max-height: 620px) {
  .screen-header {
    padding: 6px clamp(12px, 2vw, 20px) !important;
    gap: 8px !important;
  }
  .screen-title {
    font-size: 1.05rem !important;
  }
  .btn-back {
    padding: 4px 10px !important;
    font-size: 0.82rem !important;
  }
  #screen-typing .screen-body {
    padding: 6px clamp(12px, 2vw, 20px) !important;
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
    font-size: 0.78rem !important;
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
    font-size: 1.15rem !important;
    line-height: 1.35 !important;
  }
  .keyboard-wrap {
    gap: 4px !important;
  }
  .keyboard {
    padding: 6px 8px !important;
    gap: 3px !important;
  }
  .kb-row, .keyboard-row {
    gap: 3px !important;
  }
  .kb-key, .key {
    height: 28px !important;
    min-width: 26px !important;
    font-size: 0.75rem !important;
    padding: 0 3px !important;
  }
  .kb-space, .key-space {
    min-width: 160px !important;
  }
  .typing-stats {
    padding: 2px 0 !important;
    font-size: 0.82rem !important;
  }

  /* Compact slide modal */
  .modal-box {
    max-height: calc(100vh - 20px) !important;
    padding: 10px 14px !important;
  }
  .slide-image {
    max-height: clamp(100px, 26vh, 200px) !important;
  }
  .slide-notes {
    max-height: clamp(40px, 12vh, 75px) !important;
    padding: 6px 10px !important;
    font-size: 0.85rem !important;
  }
  .slide-nav-bar {
    padding: 6px 0 !important;
    margin-bottom: 6px !important;
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

def inject_override(driver):
    driver.execute_script("""
        let style = document.getElementById('proposed-override-style');
        if (!style) {
            style = document.createElement('style');
            style.id = 'proposed-override-style';
            document.head.appendChild(style);
        }
        style.textContent = arguments[0];
    """, PROPOSED_CSS)

def run_tests():
    failures = []
    print("Testing Proposed CSS Overrides across 9 viewports...")

    for vp in VIEWPORTS:
        vp_name = vp["name"]
        w = vp["width"]
        h = vp["height"]
        s = vp["scale"]
        driver = create_driver(vp)
        try:
            driver.get(HTML_URL)
            inject_override(driver)
            time.sleep(0.3)

            # CHECK 1: Student Grid
            driver.find_element(By.ID, "btn-student").click()
            time.sleep(0.2)
            driver.find_element(By.CLASS_NAME, "btn-class").click()
            time.sleep(0.3)
            inject_override(driver)

            grid_metrics = driver.execute_script("""
                const grid = document.querySelector('.student-grid, #student-list');
                const cards = Array.from(document.querySelectorAll('.student-card'));
                const winW = window.innerWidth;
                const winH = window.innerHeight;
                const docScrollW = document.documentElement.scrollWidth;

                if (!grid || cards.length === 0) return { error: 'No grid' };

                const cardWidths = cards.map(c => c.getBoundingClientRect().width);
                const anyOverflowX = cards.some(c => {
                    const r = c.getBoundingClientRect();
                    return r.right > winW + 2 || r.left < -2;
                });

                return {
                    winW, winH, docScrollW,
                    hasHorizontalScroll: docScrollW > winW + 1,
                    cardsCount: cards.length,
                    minWidth: Math.min(...cardWidths),
                    maxWidth: Math.max(...cardWidths),
                    anyCardOverflowX: anyOverflowX
                };
            """)

            if grid_metrics.get('hasHorizontalScroll'):
                failures.append(f"{vp_name}: Horizontal scroll on student screen (scrollW={grid_metrics['docScrollW']}, winW={grid_metrics['winW']})")
            if grid_metrics.get('anyCardOverflowX'):
                failures.append(f"{vp_name}: Student card overflows screen boundary")
            if grid_metrics.get('maxWidth', 0) > 420:
                failures.append(f"{vp_name}: Student card width too stretched ({grid_metrics['maxWidth']} > 420)")
            if grid_metrics.get('minWidth', 999) < 180:
                failures.append(f"{vp_name}: Student card width too squished ({grid_metrics['minWidth']} < 180)")

            print(f"[{vp_name}] Grid: cards={grid_metrics['cardsCount']}, minW={grid_metrics['minWidth']:.1f}, maxW={grid_metrics['maxWidth']:.1f}, hScroll={grid_metrics['hasHorizontalScroll']}")

            # CHECK 2: Typing Screen
            cards = driver.find_elements(By.CLASS_NAME, "student-card")
            cards[0].click()
            time.sleep(0.2)
            driver.find_element(By.CSS_SELECTOR, '[data-module="typing"]').click()
            time.sleep(0.3)
            inject_override(driver)

            typing_metrics = driver.execute_script("""
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
                    kbHeight: kbRect ? kbRect.height : 0,
                    kbBottom: kbRect ? kbRect.bottom : 0,
                    kbVisibleInWin: kbRect ? (kbRect.bottom <= winH + 2 && kbRect.top >= 0) : false
                };
            """)

            print(f"[{vp_name}] Typing: docH={typing_metrics['docScrollH']} vs winH={typing_metrics['winH']}, kbH={typing_metrics['kbHeight']:.1f}, kbVis={typing_metrics['kbVisibleInWin']}, docVScroll={typing_metrics['hasDocVScroll']}")

            if typing_metrics['hasDocVScroll']:
                failures.append(f"{vp_name}: Window vertical scroll on typing (docScrollH={typing_metrics['docScrollH']} > winH={typing_metrics['winH']})")
            if typing_metrics['hasDocHScroll']:
                failures.append(f"{vp_name}: Horizontal scroll on typing (docScrollW={typing_metrics['docScrollW']} > winW={typing_metrics['winW']})")
            if not typing_metrics['kbVisibleInWin']:
                failures.append(f"{vp_name}: Keyboard clipped below fold (kbBottom={typing_metrics['kbBottom']}, winH={typing_metrics['winH']})")

            # CHECK 3: Modal
            driver.find_element(By.CSS_SELECTOR, '#screen-typing .btn-back').click()
            time.sleep(0.2)
            driver.find_element(By.CSS_SELECTOR, '[data-module="theory"]').click()
            time.sleep(0.3)
            driver.find_element(By.CLASS_NAME, "btn-open-slides").click()
            time.sleep(0.4)
            inject_override(driver)

            modal_metrics = driver.execute_script("""
                const winH = window.innerHeight;
                const modal = document.querySelector('.modal-box');
                const nextBtn = document.getElementById('btn-slide-next');
                const prevBtn = document.getElementById('btn-slide-prev');
                const navBar = document.querySelector('.slide-nav-bar');
                const mRect = modal.getBoundingClientRect();
                const nr = nextBtn ? nextBtn.getBoundingClientRect() : null;
                const pr = prevBtn ? prevBtn.getBoundingClientRect() : null;

                const navButtonsVisible = nr && pr && (nr.bottom <= winH) && (nr.top >= 0) && (pr.bottom <= winH) && (pr.top >= 0);
                const modalWithinWindow = (mRect.top >= 0) && (mRect.bottom <= winH + 1);

                return {
                    winH, modalH: mRect.height, modalTop: mRect.top, modalBottom: mRect.bottom,
                    modalWithinWindow, navButtonsVisible,
                    navBarSticky: navBar ? window.getComputedStyle(navBar).position === 'sticky' : false
                };
            """)

            if not modal_metrics['modalWithinWindow']:
                failures.append(f"{vp_name}: Modal clipped outside window")
            if not modal_metrics['navButtonsVisible']:
                failures.append(f"{vp_name}: Nav buttons clipped")
            if not modal_metrics['navBarSticky']:
                failures.append(f"{vp_name}: Nav bar not sticky")

            # Slide 3
            driver.execute_script("const btn = document.getElementById('btn-slide-next'); if (btn) btn.click();")
            time.sleep(0.2)
            driver.execute_script("const btn = document.getElementById('btn-slide-next'); if (btn) btn.click();")
            time.sleep(0.2)

            slide3_metrics = driver.execute_script("""
                const winH = window.innerHeight;
                const nextBtn = document.getElementById('btn-slide-next');
                const prevBtn = document.getElementById('btn-slide-prev');
                const nr = nextBtn ? nextBtn.getBoundingClientRect() : null;
                const pr = prevBtn ? prevBtn.getBoundingClientRect() : null;
                const notes = document.querySelector('.slide-notes');
                const ntr = notes ? notes.getBoundingClientRect() : null;

                return {
                    nextVisible: nr ? (nr.bottom <= winH && nr.top >= 0) : false,
                    prevVisible: pr ? (pr.bottom <= winH && pr.top >= 0) : false,
                    notesVisible: ntr ? (ntr.bottom <= winH && ntr.top >= 0) : true
                };
            """)

            print(f"[{vp_name}] Modal: inWin={modal_metrics['modalWithinWindow']}, navVis={modal_metrics['navButtonsVisible']}, slide3NotesVis={slide3_metrics['notesVisible']}")

            if not slide3_metrics['nextVisible'] or not slide3_metrics['prevVisible']:
                failures.append(f"{vp_name}: Slide nav buttons unviewable on slide 3")

            # Stress test long notes
            adv_notes = driver.execute_script("""
                const winH = window.innerHeight;
                let notes = document.querySelector('.slide-notes');
                if (!notes) {
                    notes = document.createElement('div');
                    notes.className = 'slide-notes';
                    document.querySelector('.slide-viewer').appendChild(notes);
                }
                notes.innerHTML = '<strong>АДВЕРСАРИАЛЬНЫЙ ТЕСТ:</strong><p>' + 'Длинный текст конспекта. '.repeat(60) + '</p>';
                const modal = document.querySelector('.modal-box');
                const nextBtn = document.getElementById('btn-slide-next');
                const mRect = modal.getBoundingClientRect();
                const nRect = nextBtn ? nextBtn.getBoundingClientRect() : null;

                return {
                    modalWithinWindow: (mRect.top >= 0) && (mRect.bottom <= winH + 1),
                    navBtnVisible: nRect ? ((nRect.top >= 0) && (nRect.bottom <= winH)) : false
                };
            """)

            if not adv_notes['modalWithinWindow']:
                failures.append(f"{vp_name}: Modal pushed outside window under long notes stress")
            if not adv_notes['navBtnVisible']:
                failures.append(f"{vp_name}: Nav buttons clipped under long notes stress")

            driver.find_element(By.ID, "modal-close-btn").click()
            time.sleep(0.2)

            # CHECK 4: Teacher Table
            driver.find_element(By.CSS_SELECTOR, '#screen-materials .btn-back').click()
            time.sleep(0.2)
            driver.find_element(By.ID, "btn-logout").click()
            time.sleep(0.2)
            driver.find_element(By.ID, "btn-teacher").click()
            time.sleep(0.2)
            driver.find_element(By.ID, "teacher-password").send_keys("teacher123")
            driver.find_element(By.ID, "btn-teacher-enter").click()
            time.sleep(0.4)
            inject_override(driver)

            sticky_res = driver.execute_script("""
                const wrap = document.querySelector('.table-responsive');
                const th = document.querySelector('.teacher-table th');
                if (!wrap || !th) return { error: 'Table or header not found' };

                const testOffsets = [0, 150, 400, 800, wrap.scrollHeight];
                const measurements = [];
                for (const offset of testOffsets) {
                    wrap.scrollTop = offset;
                    const wrapRect = wrap.getBoundingClientRect();
                    const thRect = th.getBoundingClientRect();
                    const deltaY = Math.abs(thRect.top - wrapRect.top);
                    measurements.push({
                        scrollTop: wrap.scrollTop,
                        isFirmlySticky: deltaY <= 2
                    });
                }
                const pageW = document.documentElement.scrollWidth;
                const winW = window.innerWidth;
                return {
                    measurements,
                    pageNoBlowout: pageW <= winW + 1,
                    pageW, winW
                };
            """)

            all_sticky = all(m['isFirmlySticky'] for m in sticky_res['measurements'])
            print(f"[{vp_name}] Teacher: allSticky={all_sticky}, pageNoBlowout={sticky_res['pageNoBlowout']} (pageW={sticky_res['pageW']}, winW={sticky_res['winW']})")

            if not all_sticky:
                failures.append(f"{vp_name}: Teacher table header lost stickiness")
            if not sticky_res['pageNoBlowout']:
                failures.append(f"{vp_name}: Teacher table caused whole-page horizontal blowout (pageW={sticky_res['pageW']}, winW={sticky_res['winW']})")

        except Exception as e:
            failures.append(f"{vp_name}: Exception - {str(e)}")
            print(f"[{vp_name}] ERROR: {str(e)}")
        finally:
            driver.quit()

    print("\n" + "=" * 60)
    print(f"TOTAL FAILURES WITH PROPOSED CSS: {len(failures)}")
    for f in failures:
        print(f" - {f}")
    print("=" * 60)
    return len(failures) == 0

if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)
