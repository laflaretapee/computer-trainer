"""
Empirical Adversarial Stress Testing Suite for Milestone 1
Identity: challenger_m1_1
Target: Local Offline 7th-Grade Computer Trainer SPA
Evaluates layout responsiveness, modal containment, scrollbar integrity,
student grid adaptability, and sticky table headers across standard and boundary viewports.
"""

import os
import sys
import time
import json
from selenium import webdriver
from selenium.webdriver.edge.options import Options
from selenium.webdriver.common.by import By

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
INDEX_HTML_PATH = os.path.join(PROJECT_ROOT, "index.html")
HTML_URL = "file:///" + INDEX_HTML_PATH.replace("\\", "/")

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
    
    # Apply CDP deviceScaleFactor emulation if scale != 1.0
    if viewport["scale"] != 1.0:
        driver.execute_cdp_cmd("Emulation.setDeviceMetricsOverride", {
            "width": viewport["width"],
            "height": viewport["height"],
            "deviceScaleFactor": viewport["scale"],
            "mobile": False
        })
    return driver

def run_adversarial_tests():
    results = {
        "viewports_tested": len(VIEWPORTS),
        "details": [],
        "failures": []
    }

    print("=" * 70)
    print("CHALLENGER 1: EMPIRICAL ADVERSARIAL STRESS TESTING (MILESTONE 1)")
    print(f"Index HTML: {HTML_URL}")
    print("=" * 70)

    for vp in VIEWPORTS:
        vp_name = vp["name"]
        w = vp["width"]
        h = vp["height"]
        s = vp["scale"]
        print(f"\n>>> TESTING VIEWPORT: {vp_name} ({w}x{h}, scale={s})")
        vp_res = {"name": vp_name, "viewport": f"{w}x{h}@{s}", "checks": {}}
        driver = create_driver(vp)

        try:
            driver.get(HTML_URL)
            time.sleep(0.4)

            # -------------------------------------------------------------
            # CHECK 1: Student Grid Wrapping & Proportions
            # -------------------------------------------------------------
            btn_student = driver.find_element(By.ID, "btn-student")
            btn_student.click()
            time.sleep(0.2)

            class_btn = driver.find_element(By.CLASS_NAME, "btn-class")
            class_btn.click()
            time.sleep(0.3)

            grid_metrics = driver.execute_script("""
                const grid = document.querySelector('.student-grid, #student-list');
                const cards = Array.from(document.querySelectorAll('.student-card'));
                const winW = window.innerWidth;
                const winH = window.innerHeight;
                const docScrollW = document.documentElement.scrollWidth;

                if (!grid || cards.length === 0) {
                    return { error: 'No grid or cards found' };
                }

                const gridRect = grid.getBoundingClientRect();
                const cardWidths = cards.map(c => c.getBoundingClientRect().width);
                const avgWidth = cardWidths.reduce((a, b) => a + b, 0) / cardWidths.length;
                const minWidth = Math.min(...cardWidths);
                const maxWidth = Math.max(...cardWidths);
                
                // Check if any card overflows window horizontally
                const anyOverflowX = cards.some(c => {
                    const r = c.getBoundingClientRect();
                    return r.right > winW + 2 || r.left < -2;
                });

                // Calculate columns in first row
                const firstRowTop = cards[0].getBoundingClientRect().top;
                const colsInFirstRow = cards.filter(c => Math.abs(c.getBoundingClientRect().top - firstRowTop) < 5).length;

                return {
                    winW: winW,
                    winH: winH,
                    docScrollW: docScrollW,
                    hasHorizontalScroll: docScrollW > winW + 1,
                    cardsCount: cards.length,
                    colsInFirstRow: colsInFirstRow,
                    avgWidth: avgWidth,
                    minWidth: minWidth,
                    maxWidth: maxWidth,
                    anyCardOverflowX: anyOverflowX
                };
            """)

            if "error" in grid_metrics:
                raise RuntimeError(grid_metrics["error"])

            print(f"  [Grid] Cards: {grid_metrics['cardsCount']}, Cols: {grid_metrics['colsInFirstRow']}, Width: min={grid_metrics['minWidth']:.1f}px, max={grid_metrics['maxWidth']:.1f}px, hScroll: {grid_metrics['hasHorizontalScroll']}")
            
            # Assertions for grid
            grid_pass = True
            if grid_metrics['hasHorizontalScroll']:
                results['failures'].append(f"{vp_name}: Horizontal scroll on student screen (scrollW={grid_metrics['docScrollW']}, winW={grid_metrics['winW']})")
                grid_pass = False
            if grid_metrics['anyCardOverflowX']:
                results['failures'].append(f"{vp_name}: Student card overflows horizontal screen boundary")
                grid_pass = False
            if grid_metrics['maxWidth'] > 420:
                results['failures'].append(f"{vp_name}: Student card width too stretched ({grid_metrics['maxWidth']:.1f}px > 420px)")
                grid_pass = False
            if grid_metrics['minWidth'] < 180:
                results['failures'].append(f"{vp_name}: Student card width too squished ({grid_metrics['minWidth']:.1f}px < 180px)")
                grid_pass = False

            vp_res["checks"]["student_grid"] = {
                "pass": grid_pass,
                "metrics": grid_metrics
            }

            # -------------------------------------------------------------
            # CHECK 2: Typing Screen Scrollbar & Viewport Containment
            # -------------------------------------------------------------
            # Pick first student and open typing trainer
            cards = driver.find_elements(By.CLASS_NAME, "student-card")
            cards[0].click()
            time.sleep(0.2)

            typing_mod_btn = driver.find_element(By.CSS_SELECTOR, '[data-module="typing"]')
            typing_mod_btn.click()
            time.sleep(0.3)

            typing_metrics = driver.execute_script("""
                const winH = window.innerHeight;
                const winW = window.innerWidth;
                const docScrollH = document.documentElement.scrollHeight;
                const docScrollW = document.documentElement.scrollWidth;
                const body = document.querySelector('#screen-typing .screen-body');
                const kb = document.querySelector('.keyboard');
                const kbRect = kb ? kb.getBoundingClientRect() : null;
                const bodyStyle = body ? window.getComputedStyle(body) : null;

                return {
                    winH: winH,
                    winW: winW,
                    docScrollH: docScrollH,
                    docScrollW: docScrollW,
                    hasDocVScroll: docScrollH > winH + 1,
                    hasDocHScroll: docScrollW > winW + 1,
                    kbHeight: kbRect ? kbRect.height : 0,
                    kbBottom: kbRect ? kbRect.bottom : 0,
                    kbVisibleInWin: kbRect ? (kbRect.bottom <= winH + 2 && kbRect.top >= 0) : false,
                    bodyOverflowY: bodyStyle ? bodyStyle.overflowY : 'unknown'
                };
            """)

            print(f"  [Typing] docH={typing_metrics['docScrollH']} vs winH={typing_metrics['winH']}, kbH={typing_metrics['kbHeight']:.1f}px, kbVisible={typing_metrics['kbVisibleInWin']}, docVScroll={typing_metrics['hasDocVScroll']}")

            typing_pass = True
            if typing_metrics['hasDocVScroll']:
                results['failures'].append(f"{vp_name}: Unstyled/unwanted window vertical scrollbar on typing screen (docScrollH={typing_metrics['docScrollH']} > winH={typing_metrics['winH']})")
                typing_pass = False
            if typing_metrics['hasDocHScroll']:
                results['failures'].append(f"{vp_name}: Unwanted horizontal scrollbar on typing screen (docScrollW={typing_metrics['docScrollW']} > winW={typing_metrics['winW']})")
                typing_pass = False
            if not typing_metrics['kbVisibleInWin']:
                results['failures'].append(f"{vp_name}: Keyboard element clipped or pushed below fold on typing screen (kbBottom={typing_metrics['kbBottom']}, winH={typing_metrics['winH']})")
                typing_pass = False

            vp_res["checks"]["typing_screen"] = {
                "pass": typing_pass,
                "metrics": typing_metrics
            }

            # -------------------------------------------------------------
            # CHECK 3: Presentation Slide Modal & Navigation Stress Test
            # -------------------------------------------------------------
            # Back to menu, open theory
            back_btn = driver.find_element(By.CSS_SELECTOR, '#screen-typing .btn-back')
            back_btn.click()
            time.sleep(0.2)

            theory_btn = driver.find_element(By.CSS_SELECTOR, '[data-module="theory"]')
            theory_btn.click()
            time.sleep(0.3)

            open_slides_btn = driver.find_element(By.CLASS_NAME, "btn-open-slides")
            open_slides_btn.click()
            time.sleep(0.4)

            modal_metrics = driver.execute_script("""
                const winH = window.innerHeight;
                const winW = window.innerWidth;
                const modal = document.querySelector('.modal-box');
                const overlay = document.querySelector('.modal-overlay');
                const navBar = document.querySelector('.slide-nav-bar');
                const prevBtn = document.getElementById('btn-slide-prev');
                const nextBtn = document.getElementById('btn-slide-next');
                const notes = document.querySelector('.slide-notes');
                const img = document.querySelector('.slide-image');

                if (!modal) return { error: 'Modal not found' };

                const mRect = modal.getBoundingClientRect();
                const nRect = navBar ? navBar.getBoundingClientRect() : null;
                const nextRect = nextBtn ? nextBtn.getBoundingClientRect() : null;
                const prevRect = prevBtn ? prevBtn.getBoundingClientRect() : null;
                const notesRect = notes ? notes.getBoundingClientRect() : null;

                const navButtonsVisible = nextRect && prevRect &&
                    (nextRect.bottom <= winH) && (nextRect.top >= 0) &&
                    (prevRect.bottom <= winH) && (prevRect.top >= 0);

                const modalWithinWindow = (mRect.top >= 0) && (mRect.bottom <= winH + 1);

                return {
                    winH: winH,
                    winW: winW,
                    modalH: mRect.height,
                    modalTop: mRect.top,
                    modalBottom: mRect.bottom,
                    modalWithinWindow: modalWithinWindow,
                    modalScrollH: modal.scrollHeight,
                    modalClientH: modal.clientHeight,
                    isModalBoxOverflowing: modal.scrollHeight > modal.clientHeight + 2,
                    navBarSticky: navBar ? window.getComputedStyle(navBar).position === 'sticky' : false,
                    navButtonsVisible: navButtonsVisible,
                    nextRect: nextRect,
                    notesPresent: !!notes,
                    notesVisible: notesRect ? (notesRect.bottom <= winH && notesRect.top >= 0) : true,
                    notesHeight: notesRect ? notesRect.height : 0
                };
            """)

            print(f"  [Modal Initial] modalH={modal_metrics['modalH']:.1f}px, inWin={modal_metrics['modalWithinWindow']}, navSticky={modal_metrics['navBarSticky']}, navBtnsVis={modal_metrics['navButtonsVisible']}, notesVis={modal_metrics['notesVisible']}")

            modal_pass = True
            if not modal_metrics['modalWithinWindow']:
                results['failures'].append(f"{vp_name}: Modal-box clipped outside window (top={modal_metrics['modalTop']:.1f}, bottom={modal_metrics['modalBottom']:.1f}, winH={modal_metrics['winH']})")
                modal_pass = False
            if not modal_metrics['navButtonsVisible']:
                results['failures'].append(f"{vp_name}: Modal navigation buttons clipped outside viewport")
                modal_pass = False
            if not modal_metrics['navBarSticky']:
                results['failures'].append(f"{vp_name}: Slide nav bar is not sticky")
                modal_pass = False

            # Click next slide twice via JS to avoid stale element references
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
                    prevDisabled: prevBtn ? prevBtn.disabled : true,
                    nextVisible: nr ? (nr.bottom <= winH && nr.top >= 0) : false,
                    prevVisible: pr ? (pr.bottom <= winH && pr.top >= 0) : false,
                    notesVisible: ntr ? (ntr.bottom <= winH && ntr.top >= 0) : true
                };
            """)
            print(f"  [Modal Slide 3] nextVis={slide3_metrics['nextVisible']}, prevVis={slide3_metrics['prevVisible']}, notesVis={slide3_metrics['notesVisible']}, prevDisabled={slide3_metrics['prevDisabled']}")

            if not slide3_metrics['nextVisible'] or not slide3_metrics['prevVisible']:
                results['failures'].append(f"{vp_name}: Slide navigation buttons became unviewable on slide 3")
                modal_pass = False

            # Stress-test: Adversarial Long Notes Injection
            # Inject 1,500 characters of notes text into the active slide
            adversarial_notes_res = driver.execute_script("""
                const winH = window.innerHeight;
                let notes = document.querySelector('.slide-notes');
                if (!notes) {
                    notes = document.createElement('div');
                    notes.className = 'slide-notes';
                    document.querySelector('.slide-viewer').appendChild(notes);
                }
                notes.innerHTML = '<strong>АДВЕРСАРИАЛЬНЫЙ СТРЕСС-ТЕСТ:</strong><p>' + 'Длинный текст конспекта урока. '.repeat(60) + '</p>';

                const modal = document.querySelector('.modal-box');
                const navBar = document.querySelector('.slide-nav-bar');
                const nextBtn = document.getElementById('btn-slide-next');
                const mRect = modal.getBoundingClientRect();
                const nRect = nextBtn ? nextBtn.getBoundingClientRect() : null;

                return {
                    modalWithinWindow: (mRect.top >= 0) && (mRect.bottom <= winH + 1),
                    navBtnVisible: nRect ? ((nRect.top >= 0) && (nRect.bottom <= winH)) : false,
                    notesScrollH: notes.scrollHeight,
                    notesClientH: notes.clientHeight,
                    notesHasInternalScroll: notes.scrollHeight > notes.clientHeight,
                    notesMaxHComputed: window.getComputedStyle(notes).maxHeight
                };
            """)

            print(f"  [Modal Stress Long Notes] modalInWin={adversarial_notes_res['modalWithinWindow']}, navBtnVis={adversarial_notes_res['navBtnVisible']}, notesHasInternalScroll={adversarial_notes_res['notesHasInternalScroll']}, notesMaxH={adversarial_notes_res['notesMaxHComputed']}")

            if not adversarial_notes_res['modalWithinWindow']:
                results['failures'].append(f"{vp_name}: Modal pushed outside window under long notes stress test")
                modal_pass = False
            if not adversarial_notes_res['navBtnVisible']:
                results['failures'].append(f"{vp_name}: Navigation buttons clipped under long notes stress test")
                modal_pass = False

            vp_res["checks"]["modal"] = {
                "pass": modal_pass,
                "initial": modal_metrics,
                "stress": adversarial_notes_res
            }

            # Close modal
            close_btn = driver.find_element(By.ID, "modal-close-btn")
            close_btn.click()
            time.sleep(0.2)

            # -------------------------------------------------------------
            # CHECK 4: Teacher Dashboard Table Sticky Header During Scrolling
            # -------------------------------------------------------------
            # Logout to root
            logout1 = driver.find_element(By.CSS_SELECTOR, '#screen-materials .btn-back')
            logout1.click()
            time.sleep(0.2)
            logout2 = driver.find_element(By.ID, "btn-logout")
            logout2.click()
            time.sleep(0.2)

            # Login to teacher
            t_btn = driver.find_element(By.ID, "btn-teacher")
            t_btn.click()
            time.sleep(0.2)
            pwd = driver.find_element(By.ID, "teacher-password")
            pwd.send_keys("teacher123")
            driver.find_element(By.ID, "btn-teacher-enter").click()
            time.sleep(0.4)

            # Test sticky header at scroll offsets: 0, 150px, 400px, 800px, and bottom
            sticky_scroll_results = driver.execute_script("""
                const wrap = document.querySelector('.table-responsive');
                const th = document.querySelector('.teacher-table th');
                const table = document.querySelector('.teacher-table');

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
                        wrapTop: wrapRect.top,
                        thTop: thRect.top,
                        deltaY: deltaY,
                        isFirmlySticky: deltaY <= 2
                    });
                }

                // Check horizontal table scrolling without page blowout
                const pageW = document.documentElement.scrollWidth;
                const winW = window.innerWidth;

                return {
                    measurements: measurements,
                    pageNoBlowout: pageW <= winW + 1,
                    pageW: pageW,
                    winW: winW
                };
            """)

            sticky_pass = True
            all_offsets_sticky = all(m['isFirmlySticky'] for m in sticky_scroll_results['measurements'])
            print(f"  [Teacher Sticky Header] Tested {len(sticky_scroll_results['measurements'])} scroll offsets. All sticky: {all_offsets_sticky}, pageNoBlowout: {sticky_scroll_results['pageNoBlowout']}")
            
            for m in sticky_scroll_results['measurements']:
                if not m['isFirmlySticky']:
                    results['failures'].append(f"{vp_name}: Teacher table header lost stickiness at scrollTop={m['scrollTop']} (delta={m['deltaY']:.1f}px)")
                    sticky_pass = False

            if not sticky_scroll_results['pageNoBlowout']:
                results['failures'].append(f"{vp_name}: Teacher table caused whole-page horizontal blowout")
                sticky_pass = False

            vp_res["checks"]["teacher_table"] = {
                "pass": sticky_pass,
                "measurements": sticky_scroll_results
            }

        except Exception as e:
            err = f"Unhandled error in {vp_name}: {str(e)}"
            print(f"  [ERROR] {err}")
            results['failures'].append(err)
            vp_res["error"] = err
        finally:
            driver.quit()

        results["details"].append(vp_res)

    print("\n" + "=" * 70)
    print("STRESS TEST SUMMARY:")
    print(f"Total Viewports Tested: {results['viewports_tested']}")
    print(f"Total Failure Points: {len(results['failures'])}")
    if results['failures']:
        print("FAILURES DETECTED:")
        for f in results['failures']:
            print(f" - {f}")
    else:
        print("ALL ADVERSARIAL STRESS TESTS PASSED WITH 0 FAILURES!")
    print("=" * 70)

    out_json_path = os.path.join(PROJECT_ROOT, ".agents", "teamwork", "challenger_m1_1", "empirical_results.json")
    with open(out_json_path, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    print(f"Empirical results saved to: {out_json_path}")

    return len(results['failures']) == 0

if __name__ == "__main__":
    success = run_adversarial_tests()
    sys.exit(0 if success else 1)
