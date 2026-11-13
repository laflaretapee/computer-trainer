"""
Adversarial Stress Test Suite for Milestone 1
Author: Reviewer & Adversarial Critic (reviewer_m1_2)
"""
import os
import re
import math
import time
from selenium import webdriver
from selenium.webdriver.edge.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
INDEX_HTML_PATH = os.path.join(PROJECT_ROOT, "index.html")
STYLE_CSS_PATH = os.path.join(PROJECT_ROOT, "style.css")

def calculate_luminance(r, g, b):
    def channel(c):
        c = c / 255.0
        return c / 12.92 if c <= 0.03928 else math.pow((c + 0.055) / 1.055, 2.4)
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)

def contrast_ratio(hex1, hex2):
    def hex_to_rgb(h):
        h = h.lstrip('#')
        return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))
    r1, g1, b1 = hex_to_rgb(hex1)
    r2, g2, b2 = hex_to_rgb(hex2)
    l1 = calculate_luminance(r1, g1, b1)
    l2 = calculate_luminance(r2, g2, b2)
    lighter = max(l1, l2)
    darker = min(l1, l2)
    return (lighter + 0.05) / (darker + 0.05)

def test_wcag_contrast_of_finger_zones():
    print("[ADVERSARIAL TEST 1] WCAG AA Contrast Ratios for all 10 Finger Zones...")
    with open(STYLE_CSS_PATH, "r", encoding="utf-8") as f:
        css = f.read()

    zones = [
        ("pinky-l", "--zone-pinky-l-text", "--zone-pinky-l-bg"),
        ("ring-l", "--zone-ring-l-text", "--zone-ring-l-bg"),
        ("mid-l", "--zone-mid-l-text", "--zone-mid-l-bg"),
        ("idx-l", "--zone-idx-l-text", "--zone-idx-l-bg"),
        ("idx-r", "--zone-idx-r-text", "--zone-idx-r-bg"),
        ("mid-r", "--zone-mid-r-text", "--zone-mid-r-bg"),
        ("ring-r", "--zone-ring-r-text", "--zone-ring-r-bg"),
        ("pinky-r", "--zone-pinky-r-text", "--zone-pinky-r-bg"),
        ("thumb", "--zone-thumb-text", "--zone-thumb-bg"),
    ]

    tokens = {}
    for match in re.finditer(r'(--[a-zA-Z0-9-]+)\s*:\s*(#[0-9a-fA-F]{6})', css):
        tokens[match.group(1)] = match.group(2)

    for zone_name, text_token, bg_token in zones:
        assert text_token in tokens, f"Missing token {text_token}"
        assert bg_token in tokens, f"Missing token {bg_token}"
        ratio = contrast_ratio(tokens[text_token], tokens[bg_token])
        print(f"  Zone {zone_name:8s}: {tokens[text_token]} on {tokens[bg_token]} => Contrast Ratio: {ratio:.2f}:1")
        assert ratio >= 4.5, f"WCAG AA violation in zone {zone_name}: {ratio:.2f} < 4.5"
    print("  -> PASS: All finger zones strictly satisfy WCAG AA (> 4.5:1).")

def test_centering_and_adversarial_viewports():
    print("[ADVERSARIAL TEST 2] Centering of Class Buttons & Menu Grid, and Tight Viewports...")
    html_url = "file:///" + INDEX_HTML_PATH.replace("\\", "/")

    # Testing target resolutions specified in requirements
    viewports = [
        (1280, 720),
        (1366, 768),
        (1920, 1080)
    ]

    for w, h in viewports:
        options = Options()
        options.add_argument('--headless=new')
        options.add_argument('--disable-gpu')
        options.add_argument('--no-sandbox')
        options.add_argument(f'--window-size={w},{h}')
        driver = webdriver.Edge(options=options)
        try:
            driver.get(html_url)
            time.sleep(0.3)

            # Check Login Centering
            screen_center = driver.find_element(By.CLASS_NAME, "screen-center")
            login_box = driver.execute_script("""
                const sc = document.querySelector('#screen-login .screen-center');
                const rect = sc.getBoundingClientRect();
                return {
                    left: rect.left,
                    right: window.innerWidth - rect.right,
                    diff: Math.abs(rect.left - (window.innerWidth - rect.right))
                };
            """)
            assert login_box['diff'] < 5, f"Login screen not centered on {w}x{h}: diff={login_box['diff']}"

            # Navigate to class selection
            driver.find_element(By.ID, "btn-student").click()
            time.sleep(0.3)

            # Check Class Grid Centering
            class_centering = driver.execute_script("""
                const grid = document.querySelector('#screen-class .class-grid');
                const rect = grid.getBoundingClientRect();
                const leftMargin = rect.left;
                const rightMargin = window.innerWidth - rect.right;
                return {
                    leftMargin: leftMargin,
                    rightMargin: rightMargin,
                    diff: Math.abs(leftMargin - rightMargin),
                    gridWidth: rect.width
                };
            """)
            print(f"  Viewport {w}x{h}: Class grid left={class_centering['leftMargin']:.1f}px, right={class_centering['rightMargin']:.1f}px, diff={class_centering['diff']:.1f}px")
            assert class_centering['diff'] < 6, f"Class grid not horizontally centered on {w}x{h}: {class_centering}"

            # Navigate to student selection (7-A)
            driver.find_element(By.CLASS_NAME, "btn-class").click()
            time.sleep(0.3)

            # Navigate to student menu
            driver.find_element(By.CLASS_NAME, "student-card").click()
            time.sleep(0.3)

            # Check Module Menu Centering
            menu_centering = driver.execute_script("""
                const grid = document.querySelector('#screen-menu .module-grid');
                const rect = grid.getBoundingClientRect();
                const leftMargin = rect.left;
                const rightMargin = window.innerWidth - rect.right;
                return {
                    leftMargin: leftMargin,
                    rightMargin: rightMargin,
                    diff: Math.abs(leftMargin - rightMargin),
                    gridWidth: rect.width
                };
            """)
            print(f"  Viewport {w}x{h}: Module grid left={menu_centering['leftMargin']:.1f}px, right={menu_centering['rightMargin']:.1f}px, diff={menu_centering['diff']:.1f}px")
            assert menu_centering['diff'] < 6, f"Module grid not horizontally centered on {w}x{h}: {menu_centering}"

            # Navigate to typing trainer
            driver.find_element(By.CSS_SELECTOR, '[data-module="typing"]').click()
            time.sleep(0.3)

            # Check typing trainer containment
            typing_check = driver.execute_script("""
                const body = document.querySelector('#screen-typing .screen-body');
                const docH = document.documentElement.scrollHeight;
                const winH = window.innerHeight;
                return {
                    docH: docH,
                    winH: winH,
                    hasWindowScroll: docH > winH + 10
                };
            """)
            # For 720, 768, 1080 there must be 0 window scroll. For 600, check gracefulness.
            if h >= 720:
                assert not typing_check['hasWindowScroll'], f"Window scroll on {w}x{h} typing screen: {typing_check}"
            print(f"  Viewport {w}x{h}: Typing docH={typing_check['docH']}px, winH={typing_check['winH']}px, hasWindowScroll={typing_check['hasWindowScroll']}")

        finally:
            driver.quit()

    print("  -> PASS: Centering and multi-viewport containment verified.")

def test_teacher_table_sticky_behavior():
    print("[ADVERSARIAL TEST 3] Teacher Table Sticky Header Scroll Dynamics...")
    options = Options()
    options.add_argument('--headless=new')
    options.add_argument('--disable-gpu')
    options.add_argument('--no-sandbox')
    options.add_argument('--window-size=1366,768')
    driver = webdriver.Edge(options=options)
    try:
        driver.get("file:///" + INDEX_HTML_PATH.replace("\\", "/"))
        time.sleep(0.3)

        # Login as teacher
        driver.find_element(By.ID, "btn-teacher").click()
        time.sleep(0.2)
        driver.find_element(By.ID, "teacher-password").send_keys("teacher123")
        driver.find_element(By.ID, "btn-teacher-enter").click()
        time.sleep(0.4)

        # Check initial th position and container
        sticky_initial = driver.execute_script("""
            const container = document.querySelector('.table-responsive');
            const th = document.querySelector('.teacher-table th');
            const initialThRect = th.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();
            return {
                containerTop: containerRect.top,
                containerScrollHeight: container.scrollHeight,
                containerClientHeight: container.clientHeight,
                thInitialTop: initialThRect.top
            };
        """)
        print(f"  Initial table-responsive clientH={sticky_initial['containerClientHeight']}px, scrollH={sticky_initial['containerScrollHeight']}px")
        assert sticky_initial['containerScrollHeight'] > sticky_initial['containerClientHeight'], "Table should be scrollable for 79 students"

        # Scroll .table-responsive down by 300px
        driver.execute_script("document.querySelector('.table-responsive').scrollTop = 300;")
        time.sleep(0.2)

        sticky_scrolled = driver.execute_script("""
            const container = document.querySelector('.table-responsive');
            const th = document.querySelector('.teacher-table th');
            const thRect = th.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();
            return {
                scrollTop: container.scrollTop,
                containerTop: containerRect.top,
                thTop: thRect.top,
                diff: Math.abs(thRect.top - containerRect.top)
            };
        """)
        print(f"  After scrolling 300px: scrollTop={sticky_scrolled['scrollTop']}, thTop={sticky_scrolled['thTop']:.1f}, containerTop={sticky_scrolled['containerTop']:.1f}, diff={sticky_scrolled['diff']:.1f}")
        # The header must remain anchored to the top of .table-responsive (diff <= 2px for border)
        assert sticky_scrolled['diff'] <= 3.0, f"Sticky header drifted away on scroll: diff={sticky_scrolled['diff']}"
        print("  -> PASS: Teacher table sticky header stays anchored to the top during vertical scrolling.")
    finally:
        driver.quit()

def test_dynamic_key_highlight_specificity():
    print("[ADVERSARIAL TEST 4] CSS Specificity: .key-next / .key-active vs .kb-zone-* ...")
    options = Options()
    options.add_argument('--headless=new')
    options.add_argument('--disable-gpu')
    options.add_argument('--no-sandbox')
    options.add_argument('--window-size=1280,720')
    driver = webdriver.Edge(options=options)
    try:
        driver.get("file:///" + INDEX_HTML_PATH.replace("\\", "/"))
        time.sleep(0.3)
        driver.find_element(By.ID, "btn-student").click()
        time.sleep(0.2)
        driver.find_element(By.CLASS_NAME, "btn-class").click()
        time.sleep(0.2)
        driver.find_element(By.CLASS_NAME, "student-card").click()
        time.sleep(0.2)
        driver.find_element(By.CSS_SELECTOR, '[data-module="typing"]').click()
        time.sleep(0.4)

        # Inject simulated .kb-zone-idx-l, .key-next and .key-active on a key and check computed style
        # Note: .kb-key has transition: background-color 0.15s ease, so we allow 0.2s for transition
        driver.execute_script("document.querySelector('.kb-key').classList.add('kb-zone-idx-l');")
        time.sleep(0.2)
        default_bg = driver.execute_script("return window.getComputedStyle(document.querySelector('.kb-key')).backgroundColor;")

        driver.execute_script("document.querySelector('.kb-key').classList.add('key-next');")
        time.sleep(0.2)
        next_bg = driver.execute_script("return window.getComputedStyle(document.querySelector('.kb-key')).backgroundColor;")
        next_border = driver.execute_script("return window.getComputedStyle(document.querySelector('.kb-key')).borderColor;")

        driver.execute_script("document.querySelector('.kb-key').classList.remove('key-next'); document.querySelector('.kb-key').classList.add('key-active');")
        time.sleep(0.2)
        active_bg = driver.execute_script("return window.getComputedStyle(document.querySelector('.kb-key')).backgroundColor;")

        specificity_check = {
            'defaultBg': default_bg,
            'nextBg': next_bg,
            'nextBorder': next_border,
            'activeBg': active_bg
        }
        print(f"  Specificity check: defaultBg={specificity_check['defaultBg']}, nextBg={specificity_check['nextBg']}, activeBg={specificity_check['activeBg']}")
        print(f"  Specificity check: defaultBg={specificity_check['defaultBg']}, nextBg={specificity_check['nextBg']}, activeBg={specificity_check['activeBg']}")
        # Zone idx-l bg is #d1fae5 (rgb(209, 250, 229))
        # key-next bg is --color-warn-light #fff7ed (rgb(255, 247, 237))
        # key-active bg is --color-primary #2563eb (rgb(37, 99, 235))
        assert specificity_check['nextBg'] != specificity_check['defaultBg'], "key-next did not override zone background!"
        assert '255, 247, 237' in specificity_check['nextBg'], f"key-next expected #fff7ed, got {specificity_check['nextBg']}"
        assert '37, 99, 235' in specificity_check['activeBg'], f"key-active expected primary #2563eb, got {specificity_check['activeBg']}"
        print("  -> PASS: Key highlights (.key-next, .key-active) correctly override 10-finger zone colors with priority.")
    finally:
        driver.quit()

if __name__ == "__main__":
    print("=" * 60)
    print("RUNNING ADVERSARIAL STRESS TEST SUITE FOR MILESTONE 1")
    print("=" * 60)
    test_wcag_contrast_of_finger_zones()
    test_centering_and_adversarial_viewports()
    test_teacher_table_sticky_behavior()
    test_dynamic_key_highlight_specificity()
    print("=" * 60)
    print("ALL ADVERSARIAL STRESS TESTS PASSED SUCCESSFULLY!")
    print("=" * 60)
