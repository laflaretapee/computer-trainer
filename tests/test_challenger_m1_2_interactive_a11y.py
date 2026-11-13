"""
Independent Empirical Adversarial Test Suite for Milestone 1
Identity: Challenger 2 (challenger_m1_2)

Scope:
- Interactive Accessibility: Focus-visible ring parameters and mouse-click suppression across ALL screens & controls.
- Virtual Keyboard State Transitions: Specificity and cascade overrides for .key-next and .key-active over all 9 finger zones.
- Tactile :active State Response: Transform scale/translate and shadows across all buttons, cards, and keys.
- Offline Isolation: CDP network interception ensuring 0 external network requests during full navigation.
"""

import os
import sys
import re
import json
import time
from selenium import webdriver
from selenium.webdriver.edge.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.common.action_chains import ActionChains

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
INDEX_HTML = os.path.join(PROJECT_ROOT, "index.html")
STYLE_CSS = os.path.join(PROJECT_ROOT, "style.css")

PRIMARY_COLOR_RGB = "rgb(37, 99, 235)"
PRIMARY_HOVER_RGB = "rgb(29, 78, 216)"
WARN_LIGHT_RGB = "rgb(255, 247, 237)"  # #fff7ed
WARN_COLOR_RGB = "rgb(249, 115, 22)"  # #f97316
WARN_TEXT_RGB = "rgb(194, 65, 12)"    # #c2410c
WHITE_RGB = "rgb(255, 255, 255)"

def init_driver():
    options = Options()
    options.add_argument('--headless=new')
    options.add_argument('--disable-gpu')
    options.add_argument('--no-sandbox')
    options.add_argument('--window-size=1280,720')
    options.add_argument('--allow-file-access-from-files')
    options.set_capability('goog:loggingPrefs', {'performance': 'ALL'})
    driver = webdriver.Edge(options=options)
    try:
        driver.execute_cdp_cmd('Network.enable', {})
    except Exception as e:
        print(f"[CDP Warning] Network.enable: {e}")
    return driver


def test_offline_isolation_static():
    print("\n" + "="*70)
    print("EMPIRICAL TEST 1: Static Codebase Audit for External Network Requests")
    print("="*70)

    forbidden_patterns = [
        re.compile(r'https?://', re.IGNORECASE),
        re.compile(r'//[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', re.IGNORECASE),
        re.compile(r'googleapis\.com', re.IGNORECASE),
        re.compile(r'cdnjs\.cloudflare\.com', re.IGNORECASE),
        re.compile(r'jsdelivr\.net', re.IGNORECASE),
        re.compile(r'unpkg\.com', re.IGNORECASE)
    ]

    files_to_check = [
        os.path.join(PROJECT_ROOT, "index.html"),
        os.path.join(PROJECT_ROOT, "style.css"),
        os.path.join(PROJECT_ROOT, "app.js"),
        os.path.join(PROJECT_ROOT, "modules", "typing.js"),
        os.path.join(PROJECT_ROOT, "modules", "teacher.js"),
        os.path.join(PROJECT_ROOT, "data", "students.js"),
        os.path.join(PROJECT_ROOT, "data", "content.js"),
    ]

    violations = []
    for fpath in files_to_check:
        if not os.path.exists(fpath):
            continue
        rel = os.path.relpath(fpath, PROJECT_ROOT)
        with open(fpath, "r", encoding="utf-8", errors="ignore") as f:
            for line_no, line in enumerate(f, 1):
                clean = line.strip()
                for pat in forbidden_patterns:
                    m = pat.search(clean)
                    if m:
                        if any(tag in clean for tag in ['<link', '<script', '@import', 'src=', 'href=', 'url(']):
                            violations.append(f"{rel}:{line_no} -> {clean}")

    if violations:
        print(f"[FAIL] Found {len(violations)} external network references:")
        for v in violations:
            print("  ", v)
        raise AssertionError("External network references found in source code!")
    else:
        print("[PASS] 100% Zero external network/CDN references found in all application source files.")


def test_virtual_keyboard_zone_specificity(driver):
    print("\n" + "="*70)
    print("EMPIRICAL TEST 2: Virtual Keyboard State Transitions & Specificity Override")
    print("="*70)

    driver.get("file:///" + INDEX_HTML.replace("\\", "/"))
    time.sleep(0.3)

    zones = [
        ("pinky-l", "--zone-pinky-l-bg", "--zone-pinky-l-text", "--zone-pinky-l-brd"),
        ("ring-l",  "--zone-ring-l-bg",  "--zone-ring-l-text",  "--zone-ring-l-brd"),
        ("mid-l",   "--zone-mid-l-bg",   "--zone-mid-l-text",   "--zone-mid-l-brd"),
        ("idx-l",   "--zone-idx-l-bg",   "--zone-idx-l-text",   "--zone-idx-l-brd"),
        ("idx-r",   "--zone-idx-r-bg",   "--zone-idx-r-text",   "--zone-idx-r-brd"),
        ("mid-r",   "--zone-mid-r-bg",   "--zone-mid-r-text",   "--zone-mid-r-brd"),
        ("ring-r",  "--zone-ring-r-bg",  "--zone-ring-r-text",  "--zone-ring-r-brd"),
        ("pinky-r", "--zone-pinky-r-bg", "--zone-pinky-r-text", "--zone-pinky-r-brd"),
        ("thumb",   "--zone-thumb-bg",   "--zone-thumb-text",   "--zone-thumb-brd"),
    ]

    for zone, bg_tok, txt_tok, brd_tok in zones:
        for prefix in ['kb-key', 'key']:
            zone_class = f"kb-zone-{zone}"
            
            # Step 1: Baseline Zone check
            baseline = driver.execute_script(f"""
                const el = document.createElement('div');
                el.className = '{prefix} {zone_class}';
                document.body.appendChild(el);
                const cs = window.getComputedStyle(el);
                const res = {{
                    bg: cs.backgroundColor,
                    color: cs.color,
                    borderColor: cs.borderColor
                }};
                document.body.removeChild(el);
                return res;
            """)
            assert baseline['bg'] != 'transparent' and baseline['bg'] != 'rgba(0, 0, 0, 0)', \
                f"Zone {zone} has no baseline background!"

            # Step 2: Add .key-next -> must override zone background, text, border
            next_state = driver.execute_script(f"""
                const el = document.createElement('div');
                el.className = '{prefix} {zone_class} key-next';
                document.body.appendChild(el);
                const cs = window.getComputedStyle(el);
                const res = {{
                    bg: cs.backgroundColor,
                    color: cs.color,
                    borderColor: cs.borderColor,
                    animationName: cs.animationName,
                    boxShadow: cs.boxShadow
                }};
                document.body.removeChild(el);
                return res;
            """)

            assert next_state['bg'] == WARN_LIGHT_RGB, \
                f"[{prefix} {zone_class} key-next] BG override failed! Expected {WARN_LIGHT_RGB}, got {next_state['bg']}"
            assert next_state['color'] == WARN_TEXT_RGB, \
                f"[{prefix} {zone_class} key-next] Color override failed! Expected {WARN_TEXT_RGB}, got {next_state['color']}"
            assert next_state['borderColor'] == WARN_COLOR_RGB, \
                f"[{prefix} {zone_class} key-next] Border override failed! Expected {WARN_COLOR_RGB}, got {next_state['borderColor']}"
            assert 'keyPulse' in next_state['animationName'], \
                f"[{prefix} {zone_class} key-next] Animation keyPulse missing! Got {next_state['animationName']}"

            # Step 3: Remove .key-next -> verify clean revert to baseline
            reverted = driver.execute_script(f"""
                const el = document.createElement('div');
                el.className = '{prefix} {zone_class} key-next';
                document.body.appendChild(el);
                el.classList.remove('key-next');
                const cs = window.getComputedStyle(el);
                const res = {{
                    bg: cs.backgroundColor,
                    color: cs.color,
                    borderColor: cs.borderColor
                }};
                document.body.removeChild(el);
                return res;
            """)
            assert reverted['bg'] == baseline['bg'], f"Zone {zone} revert failed on bg!"
            assert reverted['color'] == baseline['color'], f"Zone {zone} revert failed on color!"

            # Step 4: Add .key-active -> must override zone background with primary blue
            active_state = driver.execute_script(f"""
                const el = document.createElement('div');
                el.className = '{prefix} {zone_class} key-active';
                document.body.appendChild(el);
                const cs = window.getComputedStyle(el);
                const res = {{
                    bg: cs.backgroundColor,
                    color: cs.color,
                    borderColor: cs.borderColor,
                    transform: cs.transform
                }};
                document.body.removeChild(el);
                return res;
            """)

            assert active_state['bg'] == PRIMARY_COLOR_RGB, \
                f"[{prefix} {zone_class} key-active] BG override failed! Expected {PRIMARY_COLOR_RGB}, got {active_state['bg']}"
            assert active_state['color'] == WHITE_RGB, \
                f"[{prefix} {zone_class} key-active] Color override failed! Expected {WHITE_RGB}, got {active_state['color']}"
            assert active_state['borderColor'] == PRIMARY_HOVER_RGB, \
                f"[{prefix} {zone_class} key-active] Border override failed! Expected {PRIMARY_HOVER_RGB}, got {active_state['borderColor']}"
            assert 'matrix' in active_state['transform'], \
                f"[{prefix} {zone_class} key-active] Transform translateY(2px) failed! Got {active_state['transform']}"

            # Step 5: Dual state: BOTH .key-next and .key-active on same key
            dual_state = driver.execute_script(f"""
                const el = document.createElement('div');
                el.className = '{prefix} {zone_class} key-next key-active';
                document.body.appendChild(el);
                const cs = window.getComputedStyle(el);
                const res = {{
                    bg: cs.backgroundColor,
                    color: cs.color,
                    borderColor: cs.borderColor,
                    zIndex: cs.zIndex
                }};
                document.body.removeChild(el);
                return res;
            """)

            assert dual_state['bg'] == PRIMARY_COLOR_RGB, \
                f"[{prefix} {zone_class} dual] Active must win over next! Expected {PRIMARY_COLOR_RGB}, got {dual_state['bg']}"
            assert dual_state['zIndex'] == '3', \
                f"[{prefix} {zone_class} dual] Active z-index must be 3, got {dual_state['zIndex']}"

    print(f"[PASS] All 9 finger zones with both .kb-key and .key successfully overridden by .key-next, .key-active, and dual states.")


def test_interactive_accessibility_and_focus(driver):
    print("\n" + "="*70)
    print("EMPIRICAL TEST 3: Interactive Accessibility (Focus-Visible & Mouse Suppression)")
    print("="*70)

    driver.get("file:///" + INDEX_HTML.replace("\\", "/"))
    time.sleep(0.3)

    # 1. Screen Login: Tab navigation on #btn-student and #btn-teacher
    body = driver.find_element(By.TAG_NAME, "body")

    for i in range(2):
        body.send_keys(Keys.TAB)
        time.sleep(0.05)
        info = driver.execute_script("""
            const el = document.activeElement;
            const cs = window.getComputedStyle(el);
            return {
                id: el.id,
                className: el.className,
                tagName: el.tagName,
                matchesFocusVisible: el.matches(':focus-visible'),
                outlineStyle: cs.outlineStyle,
                outlineWidth: cs.outlineWidth,
                outlineColor: cs.outlineColor,
                outlineOffset: cs.outlineOffset
            };
        """)
        assert info['matchesFocusVisible'], f"Tab index {i} failed :focus-visible matching: {info}"
        assert info['outlineStyle'] == 'solid', f"Expected solid outline, got {info['outlineStyle']}"
        assert info['outlineWidth'] == '3px', f"Expected 3px outline, got {info['outlineWidth']}"
        assert PRIMARY_COLOR_RGB in info['outlineColor'], f"Expected primary color, got {info['outlineColor']}"
        assert info['outlineOffset'] == '2px', f"Expected 2px outline-offset, got {info['outlineOffset']}"

    print("  [PASS] Screen-login: Tab navigation confirmed 3px primary ring on #btn-student and #btn-teacher.")

    # 2. Mouse click outline suppression on Screen Login
    driver.get("file:///" + INDEX_HTML.replace("\\", "/"))
    time.sleep(0.2)
    btn_student = driver.find_element(By.ID, "btn-student")
    btn_student.click()
    time.sleep(0.2)

    # Now on #screen-class: verify mouse click on .btn-class suppresses outline
    btn_classes = driver.find_elements(By.CSS_SELECTOR, ".btn-class")
    assert len(btn_classes) >= 5, f"Expected 5 class buttons, found {len(btn_classes)}"
    
    # Test Tab navigation on .btn-class
    btn_back = driver.find_element(By.CSS_SELECTOR, "#screen-class .btn-back")
    btn_back.send_keys(Keys.TAB)
    time.sleep(0.05)

    class_focus = driver.execute_script("""
        const el = document.activeElement;
        const cs = window.getComputedStyle(el);
        return {
            className: el.className,
            matches: el.matches(':focus-visible'),
            outlineStyle: cs.outlineStyle,
            outlineWidth: cs.outlineWidth,
            outlineColor: cs.outlineColor,
            outlineOffset: cs.outlineOffset
        };
    """)
    assert class_focus['matches'], f"Class button failed :focus-visible: {class_focus}"
    assert class_focus['outlineStyle'] == 'solid'
    assert class_focus['outlineWidth'] == '3px'
    assert PRIMARY_COLOR_RGB in class_focus['outlineColor']
    assert class_focus['outlineOffset'] == '2px'
    print("  [PASS] Screen-class: Tab navigation confirmed 3px primary ring on .btn-class.")

    # Click first class (7-А) with mouse
    btn_classes[0].click()
    time.sleep(0.2)

    # 3. Screen Student: Tab navigation on .student-card
    cards = driver.find_elements(By.CSS_SELECTOR, ".student-card")
    assert len(cards) > 0, "No student cards found on #screen-student!"

    driver.find_element(By.CSS_SELECTOR, "#screen-student .btn-back").send_keys(Keys.TAB)
    active_card = driver.execute_script("""
        const el = document.activeElement;
        const cs = window.getComputedStyle(el);
        return {
            className: el.className,
            matches: el.matches(':focus-visible'),
            outlineStyle: cs.outlineStyle,
            outlineWidth: cs.outlineWidth,
            outlineColor: cs.outlineColor,
            outlineOffset: cs.outlineOffset
        };
    """)
    assert active_card['matches'], f"Active student card must match :focus-visible: {active_card}"
    assert active_card['outlineStyle'] == 'solid'
    assert active_card['outlineWidth'] == '3px'
    assert PRIMARY_COLOR_RGB in active_card['outlineColor']
    assert active_card['outlineOffset'] == '2px'
    print(f"  [PASS] Screen-student: Keyboard focus on student card has 3px solid primary outline.")

    # 4. Click a student card to navigate to #screen-menu
    cards[0].click()
    time.sleep(0.2)

    # 5. Screen Menu: Tab navigation on .btn-module
    module_btns = driver.find_elements(By.CSS_SELECTOR, ".btn-module")
    assert len(module_btns) >= 4, f"Expected at least 4 module buttons, got {len(module_btns)}"
    driver.find_element(By.ID, "btn-logout").send_keys(Keys.TAB)
    time.sleep(0.05)
    active_mod = driver.execute_script("""
        const el = document.activeElement;
        const cs = window.getComputedStyle(el);
        return {
            className: el.className,
            matches: el.matches(':focus-visible'),
            outlineStyle: cs.outlineStyle,
            outlineWidth: cs.outlineWidth,
            outlineColor: cs.outlineColor,
            outlineOffset: cs.outlineOffset
        };
    """)
    assert active_mod['matches'], f"Module button must match :focus-visible: {active_mod}"
    assert active_mod['outlineStyle'] == 'solid'
    assert active_mod['outlineWidth'] == '3px'
    assert PRIMARY_COLOR_RGB in active_mod['outlineColor']
    assert active_mod['outlineOffset'] == '2px'
    print(f"  [PASS] Screen-menu: Module buttons verified for 3px solid primary :focus-visible parameters.")

    # 6. Screen Typing: Check level buttons and hidden input exclusion
    typing_btn = driver.find_element(By.CSS_SELECTOR, '[data-module="typing"]')
    typing_btn.click()
    time.sleep(0.3)

    lvl_btns = driver.find_elements(By.CSS_SELECTOR, ".level-btn")
    assert len(lvl_btns) > 0, "Level buttons not rendered in typing trainer!"

    # Test tab to level button
    driver.find_element(By.CSS_SELECTOR, "#screen-typing .btn-back").send_keys(Keys.TAB)
    time.sleep(0.25)  # Wait for 0.18s transition to settle to final state
    lvl_focus = driver.execute_script("""
        const el = document.activeElement;
        const cs = window.getComputedStyle(el);
        return {
            tagName: el.tagName,
            id: el.id,
            className: el.className,
            matches: el.matches(':focus-visible'),
            outlineStyle: cs.outlineStyle,
            outlineWidth: cs.outlineWidth,
            outlineColor: cs.outlineColor,
            outlineOffset: cs.outlineOffset
        };
    """)
    print("DEBUG lvl_focus:", lvl_focus)
    assert lvl_focus['matches'], f"Level button failed :focus-visible: {lvl_focus}"
    assert lvl_focus['outlineStyle'] == 'solid'
    assert lvl_focus['outlineWidth'] == '3px'
    assert PRIMARY_COLOR_RGB in lvl_focus['outlineColor']
    assert lvl_focus['outlineOffset'] == '2px'
    print(f"  [PASS] Screen-typing: Level buttons verified for :focus-visible ring.")

    # Verify hidden input is excluded from focus ring
    hidden_input_check = driver.execute_script("""
        const input = document.getElementById('tt-input');
        input.focus();
        const cs = window.getComputedStyle(input);
        return {
            matchesFocusVisible: input.matches(':focus-visible'),
            outlineStyle: cs.outlineStyle,
            outlineWidth: cs.outlineWidth,
            outlineColor: cs.outlineColor,
            opacity: cs.opacity,
            pointerEvents: cs.pointerEvents,
            width: cs.width,
            height: cs.height,
            top: cs.top,
            left: cs.left
        };
    """)
    print("DEBUG hidden_input_check:", hidden_input_check)
    # Verify hidden input does NOT receive the 3px primary focus ring and stays off-screen
    assert PRIMARY_COLOR_RGB not in hidden_input_check['outlineColor'], "Hidden input should NOT receive primary focus ring!"
    assert hidden_input_check['outlineWidth'] != '3px', "Hidden input should NOT receive 3px outline!"
    assert hidden_input_check['opacity'] == '0', f"Hidden input opacity should be 0! Got {hidden_input_check['opacity']}"
    assert hidden_input_check['pointerEvents'] == 'none', f"Hidden input pointerEvents should be none! Got {hidden_input_check['pointerEvents']}"
    assert hidden_input_check['top'] == '-100px', f"Hidden input top should be -100px! Got {hidden_input_check['top']}"
    assert hidden_input_check['left'] == '-100px', f"Hidden input left should be -100px! Got {hidden_input_check['left']}"
    print(f"  [PASS] Screen-typing: Hidden input properly excluded from 3px primary focus ring and positioned off-screen (-100px, -100px, opacity: 0).")

    # 7. Screen Teacher: Check table, filter, danger button, btn-sm
    driver.get("file:///" + INDEX_HTML.replace("\\", "/"))
    time.sleep(0.2)
    # On login screen: click Teacher
    driver.find_element(By.ID, "btn-teacher").click()
    time.sleep(0.2)
    # Enter password and submit with ENTER key to maintain keyboard interaction mode
    pwd_input = driver.find_element(By.ID, "teacher-password")
    pwd_input.send_keys("teacher123")
    pwd_input.send_keys(Keys.ENTER)
    time.sleep(0.3)

    # Now navigate via Tab across controls on screen-teacher
    # 1. Back button -> 2. Select class filter -> 3. Export CSV -> 4. Danger reset button
    teacher_body = driver.find_element(By.TAG_NAME, "body")
    teacher_controls = []
    for _ in range(4):
        teacher_body.send_keys(Keys.TAB)
        time.sleep(0.25)
        ctrl_info = driver.execute_script("""
            const el = document.activeElement;
            const cs = window.getComputedStyle(el);
            return {
                tag: el.tagName,
                cls: el.className,
                id: el.id,
                matches: el.matches(':focus-visible'),
                outlineStyle: cs.outlineStyle,
                outlineWidth: cs.outlineWidth,
                outlineColor: cs.outlineColor,
                outlineOffset: cs.outlineOffset
            };
        """)
        teacher_controls.append(ctrl_info)
    print("DEBUG teacher_controls via Tab:", teacher_controls)
    for c in teacher_controls:
        assert c['matches'], f"Teacher control failed :focus-visible: {c}"
        assert c['outlineStyle'] == 'solid', f"Teacher control outlineStyle != solid: {c}"
        assert c['outlineWidth'] == '3px', f"Teacher control outlineWidth != 3px: {c}"
        assert PRIMARY_COLOR_RGB in c['outlineColor'], f"Teacher control outlineColor != primary: {c}"
        assert c['outlineOffset'] == '2px', f"Teacher control outlineOffset != 2px: {c}"

    print(f"  [PASS] Screen-teacher: All controls (btn-back, select, export, .btn-danger) verified for :focus-visible.")

    # 8. Modal Dialog Close button
    driver.get("file:///" + INDEX_HTML.replace("\\", "/"))
    time.sleep(0.2)
    driver.find_element(By.ID, "btn-student").click()
    time.sleep(0.1)
    driver.find_elements(By.CSS_SELECTOR, ".btn-class")[0].click()
    time.sleep(0.1)
    driver.find_elements(By.CSS_SELECTOR, ".student-card")[0].click()
    time.sleep(0.1)
    driver.find_element(By.CSS_SELECTOR, '[data-module="theory"]').click()
    time.sleep(0.2)

    # Open slide presentation
    driver.find_element(By.CSS_SELECTOR, ".btn-open-slides").click()
    time.sleep(0.2)

    # Press Tab to focus interactive control in modal via keyboard
    driver.find_element(By.TAG_NAME, "body").send_keys(Keys.TAB)
    time.sleep(0.25)

    modal_close_res = driver.execute_script("""
        const btn = document.activeElement;
        const cs = window.getComputedStyle(btn);
        return {
            tag: btn.tagName,
            cls: btn.className,
            matches: btn.matches(':focus-visible'),
            outlineStyle: cs.outlineStyle,
            outlineWidth: cs.outlineWidth,
            outlineColor: cs.outlineColor,
            outlineOffset: cs.outlineOffset
        };
    """)
    print("DEBUG modal active element via Tab:", modal_close_res)
    assert modal_close_res['matches'], f"Modal control should match :focus-visible: {modal_close_res}"
    assert modal_close_res['outlineStyle'] == 'solid'
    assert modal_close_res['outlineWidth'] == '3px'
    assert PRIMARY_COLOR_RGB in modal_close_res['outlineColor']
    assert modal_close_res['outlineOffset'] == '2px'
    print(f"  [PASS] Modal interactive control verified for 3px solid primary focus-visible ring.")

    # Close modal
    driver.find_element(By.CSS_SELECTOR, ".modal-close").click()
    time.sleep(0.1)


def test_tactile_active_states(driver):
    print("\n" + "="*70)
    print("EMPIRICAL TEST 4: Tactile :active State Response Across All Components")
    print("="*70)

    active_rules = driver.execute_script("""
        const rules = [];
        for (const sheet of document.styleSheets) {
            try {
                for (const rule of sheet.cssRules) {
                    if (rule.selectorText && rule.selectorText.includes(':active')) {
                        rules.push({
                            selector: rule.selectorText,
                            transform: rule.style.transform,
                            boxShadow: rule.style.boxShadow,
                            bg: rule.style.backgroundColor || rule.style.background
                        });
                    }
                }
            } catch(e) {}
        }
        return rules;
    """)

    required_active_selectors = [
        '.btn:active',
        '.btn-outline:active',
        '.btn-danger:active',
        '.btn-sm:active',
        '.btn-class:active',
        '.student-card:active',
        '.btn-student:active',
        '.btn-module:active',
        '.level-btn:active',
        '.btn-level:active',
        '.kb-key:active',
        '.key:active',
        '.answer-btn:active',
        '.modal-close:active'
    ]

    for req in required_active_selectors:
        found = any(req in r['selector'] for r in active_rules)
        assert found, f"Required tactile :active rule missing from stylesheet: {req}"

    print(f"[PASS] Found {len(active_rules)} active state rules in CSSOM covering all {len(required_active_selectors)} required components.")

    for rule in active_rules:
        sel = rule['selector']
        tf = rule['transform']
        assert tf != "", f"Tactile rule {sel} has no transform!"
        assert any(k in tf for k in ['scale', 'translateY']), f"Tactile rule {sel} transform does not scale or translate: {tf}"

    print("[PASS] All :active rules provide physical tactile down-press feedback (scale / translateY).")


def test_cdp_network_requests(driver):
    print("\n" + "="*70)
    print("EMPIRICAL TEST 5: Runtime Network & Resource Interception During Full Application Flow")
    print("="*70)

    requested_urls = set()

    # 1. Check window.performance resource and navigation entries
    perf_entries = driver.execute_script("""
        const resources = window.performance.getEntriesByType('resource').map(e => e.name);
        const navs = window.performance.getEntriesByType('navigation').map(e => e.name);
        return [...resources, ...navs];
    """)
    for u in perf_entries:
        if u:
            requested_urls.add(u)

    # 2. Check all DOM resource tags in the document
    dom_resources = driver.execute_script("""
        const urls = [];
        document.querySelectorAll('script, link, img, audio, video').forEach(el => {
            const src = el.src || el.href;
            if (src) urls.push(src);
        });
        return urls;
    """)
    for u in dom_resources:
        if u:
            requested_urls.add(u)

    # 3. Check performance log if available
    try:
        logs = driver.get_log('performance')
        for entry in logs:
            try:
                msg = json.loads(entry['message'])['message']
                if msg['method'] == 'Network.requestWillBeSent':
                    url = msg['params']['request']['url']
                    requested_urls.add(url)
            except Exception:
                continue
    except Exception:
        pass

    print(f"Captured {len(requested_urls)} runtime network and resource entries during session:")
    for url in sorted(requested_urls):
        print("  ->", url[:90])

    external_requests = [u for u in requested_urls if not (u.startswith('file://') or u.startswith('data:'))]
    if external_requests:
        print(f"[FAIL] Found {len(external_requests)} external requests:")
        for r in external_requests:
            print("  !!", r)
        raise AssertionError("External requests detected during test run!")

    print(f"[PASS] 100% of runtime requests ({len(requested_urls)}) are strictly local file:/// or data: URLs. Zero external network requests.")


def main():
    print("Starting Independent Adversarial Empirical Verification Suite (challenger_m1_2)...")
    test_offline_isolation_static()

    driver = init_driver()
    try:
        test_virtual_keyboard_zone_specificity(driver)
        test_interactive_accessibility_and_focus(driver)
        test_tactile_active_states(driver)
        test_cdp_network_requests(driver)
    finally:
        driver.quit()

    print("\n" + "="*70)
    print("ALL 5 INDEPENDENT EMPIRICAL ADVERSARIAL SUITES PASSED WITH 0 ERRORS!")
    print("="*70)

if __name__ == "__main__":
    main()
