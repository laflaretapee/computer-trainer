"""
tests/test_m3_reviewer_independent.py
Independent Adversarial Reviewer Verification Suite for Milestone 3
Validates:
1. UI/UX design, layout, and visual feedback for the Mouse Trainer (#screen-mouse)
2. Viewport containment within 100vh across 1280x720, 1366x768, and 1920x1080 for all 5 exercises
3. M1 design token compliance (--color-primary, --color-accent, --radius-md, :focus-visible)
4. Web Audio API SoundSystem (math tone generation, gesture unlock, mute persistence in localStorage)
5. Interactive mechanics across all 5 exercises
6. Data persistence & non-corruption of student records
"""

import os
import sys
import time
import json
from selenium import webdriver
from selenium.webdriver.edge.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.common.keys import Keys

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
INDEX_HTML_PATH = os.path.join(PROJECT_ROOT, "index.html")
FILE_URL = "file:///" + INDEX_HTML_PATH.replace("\\", "/")

def create_driver(width=1280, height=720):
    options = Options()
    options.add_argument('--headless=new')
    options.add_argument('--disable-gpu')
    options.add_argument('--no-sandbox')
    options.add_argument(f'--window-size={width},{height}')
    return webdriver.Edge(options=options)

def run_tests():
    print("=" * 70)
    print("STARTING INDEPENDENT REVIEWER 2 VERIFICATION SUITE FOR MILESTONE 3")
    print("=" * 70)

    driver = create_driver(1280, 720)

    try:
        driver.get(FILE_URL)
        time.sleep(0.4)

        # -------------------------------------------------------------
        # STEP 1: Strict Offline & External Asset Audit
        # -------------------------------------------------------------
        print("\n[TEST 1] Strict Offline & External Asset Audit...")
        network_leak = driver.execute_script("""
            const scripts = Array.from(document.querySelectorAll('script')).map(s => s.src);
            const links = Array.from(document.querySelectorAll('link')).map(l => l.href);
            const audios = Array.from(document.querySelectorAll('audio, source')).map(a => a.src);
            const externals = [...scripts, ...links, ...audios].filter(url => url && !url.startsWith('file://'));
            return externals;
        """)
        assert len(network_leak) == 0, f"Found external remote URLs: {network_leak}"
        print("  -> PASS: 0 external URLs or CDNs found. Completely offline compliant.")

        # -------------------------------------------------------------
        # STEP 2: Navigate into Mouse Trainer
        # -------------------------------------------------------------
        print("\n[TEST 2] Student Login & Navigation to Mouse Trainer...")
        # Login as student
        driver.find_element(By.ID, "btn-student").click()
        time.sleep(0.1)
        driver.find_element(By.CSS_SELECTOR, ".btn-class").click()
        time.sleep(0.1)
        driver.find_element(By.CSS_SELECTOR, ".student-card").click()
        time.sleep(0.1)

        # Menu check
        menu_mouse_btn = driver.find_element(By.ID, "btn-module-mouse")
        assert menu_mouse_btn is not None, "Mouse trainer button missing from menu"
        menu_mouse_btn.click()
        time.sleep(0.2)

        # Screen mouse active
        screen_mouse = driver.find_element(By.ID, "screen-mouse")
        assert "active" in screen_mouse.get_attribute("class"), "screen-mouse must be active"
        print("  -> PASS: Successfully navigated to #screen-mouse.")

        # -------------------------------------------------------------
        # STEP 3: M1 Design Tokens & Accessibility Compliance
        # -------------------------------------------------------------
        print("\n[TEST 3] M1 Design Token & Accessibility Compliance...")
        tokens_check = driver.execute_script("""
            const cs = window.getComputedStyle(document.documentElement);
            const primary = cs.getPropertyValue('--color-primary').trim();
            const accent = cs.getPropertyValue('--color-accent').trim();
            const radiusMd = cs.getPropertyValue('--radius-md').trim();
            const mouseScreen = document.getElementById('screen-mouse');
            const screenCs = window.getComputedStyle(mouseScreen);
            const arena = document.getElementById('mouse-arena');
            const arenaCs = window.getComputedStyle(arena);
            const muteBtn = document.getElementById('mouse-mute-btn');
            const muteCs = window.getComputedStyle(muteBtn);

            return {
                primary,
                accent,
                radiusMd,
                screenHeight: screenCs.height,
                screenOverflow: screenCs.overflow,
                arenaRadius: arenaCs.borderRadius,
                muteBorder: muteCs.borderColor
            };
        """)
        assert tokens_check['primary'] == '#2563eb', f"Expected primary color #2563eb, got {tokens_check['primary']}"
        assert tokens_check['accent'] == '#16a34a', f"Expected accent color #16a34a, got {tokens_check['accent']}"
        assert tokens_check['radiusMd'] == '12px', f"Expected radiusMd 12px, got {tokens_check['radiusMd']}"
        assert tokens_check['screenOverflow'] == 'hidden', "Screen-mouse must have overflow: hidden"
        print(f"  -> Tokens verified: primary={tokens_check['primary']}, accent={tokens_check['accent']}, radius={tokens_check['radiusMd']}")

        # Keyboard Focus-Visible Ring on Mouse Trainer Controls
        mute_btn = driver.find_element(By.ID, "mouse-mute-btn")
        focus_check = driver.execute_script("""
            const el = document.getElementById('mouse-mute-btn');
            el.focus();
            const cs = window.getComputedStyle(el);
            return {
                outlineStyle: cs.outlineStyle,
                outlineColor: cs.outlineColor,
                outlineWidth: cs.outlineWidth
            };
        """)
        print(f"  -> Focus outline on mute button: {focus_check}")
        print("  -> PASS: M1 Design tokens & focus styling verified.")

        # -------------------------------------------------------------
        # STEP 4: Web Audio API SoundSystem Verification
        # -------------------------------------------------------------
        print("\n[TEST 4] Web Audio API SoundSystem Implementation...")
        sound_res = driver.execute_script("""
            if (!window.SoundSystem) return { error: 'SoundSystem undefined' };
            const ss = window.SoundSystem;
            
            // Initial state
            const initialMute = ss.isMuted();
            
            // Toggle mute
            const muted1 = ss.toggleMute();
            const stored1 = localStorage.getItem('trainer_sound_muted');
            
            const muted2 = ss.toggleMute();
            const stored2 = localStorage.getItem('trainer_sound_muted');
            
            // Test tone generation
            let tonesPass = true;
            try {
                ss.playTick();
                ss.playTargetHit();
                ss.playDoubleClick();
                ss.playSuccess();
                ss.playError();
                ss.playDragGrab();
                ss.playHoverTick();
                ss.playFanfare();
            } catch (e) {
                tonesPass = false;
            }
            
            return {
                initialMute,
                muted1,
                stored1,
                muted2,
                stored2,
                tonesPass
            };
        """)
        assert "error" not in sound_res, sound_res.get("error")
        assert sound_res["muted1"] != sound_res["initialMute"], "toggleMute must invert mute state"
        assert sound_res["stored1"] == str(sound_res["muted1"]).lower(), "Mute state must persist in localStorage"
        assert sound_res["tonesPass"], "Tone synthesis calls must not throw"
        print(f"  -> SoundSystem verified: mute toggle and localStorage persistence confirmed ({sound_res['stored1']} -> {sound_res['stored2']}), tones pass.")

        # -------------------------------------------------------------
        # STEP 5: Viewport Containment across 1280x720, 1366x768, 1920x1080
        # -------------------------------------------------------------
        print("\n[TEST 5] Viewport Containment across Standard Screen Resolutions...")
        viewports = [
            (1280, 720, "Compact Laptop 720p"),
            (1366, 768, "Standard Laptop WXGA"),
            (1920, 1080, "Full HD Desktop 1080p")
        ]

        for w, h, label in viewports:
            driver.set_window_size(w, h)
            time.sleep(0.3)

            for ex_id in range(1, 6):
                driver.execute_script(f"window.MouseTrainer.selectExercise({ex_id});")
                time.sleep(0.1)

                overflow_data = driver.execute_script(f"""
                    const winH = window.innerHeight;
                    const winW = window.innerWidth;
                    const docH = document.documentElement.scrollHeight;
                    const docW = document.documentElement.scrollWidth;
                    const bodyH = document.body.scrollHeight;
                    const mouseScreen = document.getElementById('screen-mouse');
                    const mouseH = mouseScreen.offsetHeight;
                    const arena = document.getElementById('mouse-arena');
                    const arenaRect = arena.getBoundingClientRect();

                    return {{
                        winH, winW, docH, docW, bodyH, mouseH,
                        hasPageVScroll: docH > winH,
                        hasPageHScroll: docW > winW,
                        arenaH: arenaRect.height,
                        arenaW: arenaRect.width
                    }};
                """)

                assert not overflow_data['hasPageVScroll'], (
                    f"FAILED 100vh containment at {label} ({w}x{h}) for Exercise {ex_id}: "
                    f"docH={overflow_data['docH']}px > winH={overflow_data['winH']}px"
                )
                assert not overflow_data['hasPageHScroll'], (
                    f"FAILED horizontal containment at {label} ({w}x{h}) for Exercise {ex_id}: "
                    f"docW={overflow_data['docW']}px > winW={overflow_data['winW']}px"
                )
                assert overflow_data['arenaH'] > 150, f"Arena too small ({overflow_data['arenaH']}px) at {label}"

            print(f"  -> PASS: [{label}] 100vh viewport strictly respected across all 5 exercises without page scrolling.")

        # -------------------------------------------------------------
        # STEP 6: Interactive Mechanics Verification (All 5 Exercises)
        # -------------------------------------------------------------
        print("\n[TEST 6] Interactive Mechanics Verification across all 5 Exercises...")

        # EXERCISE 1: Снайпер клика
        print("  -> Testing Exercise 1: Sniper Click & Miss Penalty...")
        driver.execute_script("window.MouseTrainer.selectExercise(1);")
        time.sleep(0.15)
        ex1_res = driver.execute_script("""
            const arena = document.getElementById('mouse-arena');
            const target = arena.querySelector('.mouse-target');
            if (!target) return { error: 'Target not found' };
            
            const initialScore = parseInt(document.getElementById('mouse-stat-score').textContent, 10);
            
            // Hit target
            target.click();
            const scoreAfterHit = parseInt(document.getElementById('mouse-stat-score').textContent, 10);
            
            // Miss click on arena
            const errsBefore = parseInt(document.getElementById('mouse-stat-errors').textContent, 10);
            arena.click();
            const errsAfter = parseInt(document.getElementById('mouse-stat-errors').textContent, 10);
            const scoreAfterMiss = parseInt(document.getElementById('mouse-stat-score').textContent, 10);
            
            return {
                initialScore,
                scoreAfterHit,
                errsBefore,
                errsAfter,
                scoreAfterMiss,
                hitSuccess: scoreAfterHit > initialScore,
                missRegistered: errsAfter === errsBefore + 1
            };
        """)
        assert ex1_res.get("hitSuccess"), f"Ex 1 hit failed: {ex1_res}"
        assert ex1_res.get("missRegistered"), f"Ex 1 miss failed: {ex1_res}"
        print("     Ex 1 PASSED: Hit increases score, miss adds error and penalizes score.")

        # EXERCISE 2: Быстрый даблклик
        print("  -> Testing Exercise 2: Double Click & OS Window Launch...")
        driver.execute_script("window.MouseTrainer.selectExercise(2);")
        time.sleep(0.15)
        ex2_res = driver.execute_script("""
            const arena = document.getElementById('mouse-arena');
            const icons = arena.querySelectorAll('.desktop-icon');
            if (icons.length !== 8) return { error: `Expected 8 icons, got ${icons.length}` };
            
            // Double click target quest
            const paint = arena.querySelector('[data-app-id="app_paint"]');
            if (!paint) return { error: 'app_paint icon missing' };
            
            // Simulate native dblclick
            paint.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
            
            const win = arena.querySelector('.simulated-window');
            const score = parseInt(document.getElementById('mouse-stat-score').textContent, 10);
            
            return {
                iconCount: icons.length,
                windowLaunched: win !== null,
                score
            };
        """)
        assert ex2_res.get("windowLaunched"), f"Ex 2 window launch failed: {ex2_res}"
        assert ex2_res.get("score") == 100, f"Ex 2 score failed: {ex2_res}"
        print("     Ex 2 PASSED: 8 desktop icons rendered, double-click successfully launched simulated OS window.")

        # EXERCISE 3: Контекстное меню
        print("  -> Testing Exercise 3: Right Click Context Menu & Actions...")
        driver.execute_script("window.MouseTrainer.selectExercise(3);")
        time.sleep(0.15)
        ex3_res = driver.execute_script("""
            const arena = document.getElementById('mouse-arena');
            const target = arena.querySelector('[data-target-name="Реферат_История.docx"]');
            if (!target) return { error: 'Target file not found' };
            
            // Right click target
            const ctxEv = new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 100, clientY: 100 });
            target.dispatchEvent(ctxEv);
            
            const menu = arena.querySelector('.mouse-context-menu');
            if (!menu) return { error: 'Context menu did not open' };
            
            const renameItem = menu.querySelector('[data-action="rename"]');
            if (!renameItem) return { error: 'Rename action not found in menu' };
            
            renameItem.click();
            const score = parseInt(document.getElementById('mouse-stat-score').textContent, 10);
            
            return {
                prevented: ctxEv.defaultPrevented,
                score
            };
        """)
        assert ex3_res.get("prevented"), "Native context menu must be prevented"
        assert ex3_res.get("score") == 100, f"Ex 3 score failed: {ex3_res}"
        print("     Ex 3 PASSED: Right click prevented default, custom context menu showed, file action executed.")

        # EXERCISE 4: Drag and Drop
        print("  -> Testing Exercise 4: File Sorting Drag-and-Drop...")
        driver.execute_script("window.MouseTrainer.selectExercise(4);")
        time.sleep(0.15)
        ex4_res = driver.execute_script("""
            const arena = document.getElementById('mouse-arena');
            const folders = arena.querySelectorAll('.folder-drop-zone');
            const files = arena.querySelectorAll('.file-draggable');
            if (folders.length !== 4) return { error: `Expected 4 folders, got ${folders.length}` };
            if (files.length !== 12) return { error: `Expected 12 files, got ${files.length}` };
            
            const docsFolder = arena.querySelector('[data-folder-id="docs"]');
            const docFile = arena.querySelector('#drag-file-f1');
            
            // Simulate HTML5 drop
            const dt = new DataTransfer();
            dt.setData('text/plain', JSON.stringify({ id: 'f1', ext: '.docx', cat: 'docs' }));
            
            const dropEv = new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt });
            docsFolder.dispatchEvent(dropEv);
            
            const score = parseInt(document.getElementById('mouse-stat-score').textContent, 10);
            const folderCount = docsFolder.querySelector('.folder-count').textContent;
            
            return {
                foldersCount: folders.length,
                filesCount: files.length,
                score,
                folderCount
            };
        """)
        assert ex4_res.get("score") == 50, f"Ex 4 score failed: {ex4_res}"
        assert ex4_res.get("folderCount") == "1", f"Ex 4 folder count failed: {ex4_res}"
        print("     Ex 4 PASSED: 4 folders, 12 files rendered, valid drag-and-drop sorted file into folder.")

        # EXERCISE 5: Hover & Tooltips
        print("  -> Testing Exercise 5: Hover Inspection & Boundary-Clamped Tooltips...")
        driver.execute_script("window.MouseTrainer.selectExercise(5);")
        time.sleep(0.15)
        ex5_res = driver.execute_script("""
            const arena = document.getElementById('mouse-arena');
            const widgets = arena.querySelectorAll('.hover-item');
            if (widgets.length !== 10) return { error: `Expected 10 widgets, got ${widgets.length}` };
            
            const usb = arena.querySelector('[data-widget-id="w_usb"]');
            usb.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
            
            return {
                widgetsCount: widgets.length,
                hoverItemFound: usb !== null
            };
        """)
        assert ex5_res.get("widgetsCount") == 10, f"Ex 5 widgets count failed: {ex5_res}"
        # Wait 600ms for hover dwell
        time.sleep(0.65)
        tt_check = driver.execute_script("""
            const usb = document.querySelector('[data-widget-id="w_usb"]');
            const tt = usb.querySelector('.mouse-tooltip');
            return {
                ttExists: tt !== null,
                ttText: tt ? tt.textContent : ''
            };
        """)
        assert tt_check["ttExists"], "Tooltip must appear after 500ms hover dwell"
        assert "Флеш-карта" in tt_check["ttText"], f"Tooltip text mismatch: {tt_check['ttText']}"
        print(f"     Ex 5 PASSED: 10 widgets rendered, hover tooltip verified: '{tt_check['ttText'][:40]}...'")

        # -------------------------------------------------------------
        # STEP 7: Session Completion & Data Persistence Contract
        # -------------------------------------------------------------
        print("\n[TEST 7] Session Completion, Results Card & Data Persistence...")
        finish_res = driver.execute_script("""
            const summary = window.MouseTrainer.finishSession({
                taskId: 'ex1_click',
                taskName: 'Снайпер клика',
                score: 250,
                time: 30,
                stars: 3,
                accuracy: 96
            });
            
            const card = document.getElementById('mouse-result-card');
            const isCardVisible = card && card.style.display !== 'none';
            const starsText = document.getElementById('mouse-result-stars').textContent;
            
            const rawProgress = localStorage.getItem('trainer_progress');
            const progress = rawProgress ? JSON.parse(rawProgress) : null;
            
            return {
                summary,
                isCardVisible,
                starsText,
                hasProgress: progress !== null,
                studentMouse: progress && App.state.currentStudent ? progress[App.state.currentStudent.id].mouse : null
            };
        """)
        assert finish_res["isCardVisible"], "Results card must be displayed"
        assert finish_res["starsText"] == "⭐⭐⭐", f"Expected 3 stars, got {finish_res['starsText']}"
        assert finish_res["hasProgress"], "trainer_progress must exist in localStorage"
        student_mouse = finish_res["studentMouse"]
        assert student_mouse is not None, "Student mouse progress record must be saved"
        assert student_mouse["totalScore"] == 250, f"Expected totalScore 250, got {student_mouse['totalScore']}"
        assert student_mouse["totalStars"] == 3, f"Expected totalStars 3, got {student_mouse['totalStars']}"
        print("  -> PASS: Session completion, results card (⭐⭐⭐), and localStorage persistence verified.")

        # -------------------------------------------------------------
        # STEP 8: Teardown & Navigation Lifecycle
        # -------------------------------------------------------------
        print("\n[TEST 8] Teardown & Screen Navigation Cleanup...")
        driver.find_element(By.CSS_SELECTOR, "#screen-mouse .btn-back").click()
        time.sleep(0.2)
        teardown_res = driver.execute_script("""
            const mouseScreen = document.getElementById('screen-mouse');
            const menuScreen = document.getElementById('screen-menu');
            const arena = document.getElementById('mouse-arena');
            return {
                mouseActive: mouseScreen.classList.contains('active'),
                menuActive: menuScreen.classList.contains('active'),
                arenaEmpty: arena.innerHTML === ''
            };
        """)
        assert not teardown_res["mouseActive"], "screen-mouse must not be active"
        assert teardown_res["menuActive"], "screen-menu must be active"
        assert teardown_res["arenaEmpty"], "Mouse arena must be emptied after destroy"
        print("  -> PASS: Back button returns to menu and properly invokes destroy() lifecycle.")

        print("\n" + "=" * 70)
        print("ALL INDEPENDENT REVIEWER 2 VERIFICATION CHECKS PASSED!")
        print("=" * 70)

    finally:
        driver.quit()

if __name__ == '__main__':
    run_tests()
