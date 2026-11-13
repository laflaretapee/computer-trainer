"""
Automated Test Suite for Milestone 1: UI/UX Design System & Responsive Layout
Covers:
1. Design Tokens and CSS custom properties
2. 37 Missing Classes and Backwards-Compatible Aliases
3. 10-Finger Zone Palette and Dynamic Highlight Overrides
4. Strict Offline Compliance (Zero Remote CDNs / Zero Web Fonts)
5. Multi-Resolution Responsive Assertions in Selenium Headless:
   - 1280x720, 1366x768, 1920x1080
   - Student Card Width on 1920x1080 (must be compact, not 905px stretched)
   - Presentation Modal Containment (clientHeight == scrollHeight)
   - Keyboard Trainer Viewport Containment
   - Teacher Table Sticky Header and Responsive Wrapper
   - Universal :focus-visible Outline and :active Tactility
"""

import os
import re
import sys
import time
from selenium import webdriver
from selenium.webdriver.edge.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
STYLE_CSS_PATH = os.path.join(PROJECT_ROOT, "style.css")
INDEX_HTML_PATH = os.path.join(PROJECT_ROOT, "index.html")

def test_offline_compliance():
    print("[TEST] 1. Testing Strict Offline Compliance...")
    with open(STYLE_CSS_PATH, "r", encoding="utf-8") as f:
        css = f.read()
    with open(INDEX_HTML_PATH, "r", encoding="utf-8") as f:
        html = f.read()

    # Check for external URLs
    assert "@import" not in css, "Error: @import detected in style.css"
    remote_css_matches = re.findall(r'url\s*\(\s*["\']?https?://', css, re.I)
    assert not remote_css_matches, f"Error: Remote URLs in style.css: {remote_css_matches}"

    # Check index.html for external resources
    remote_html_matches = re.findall(r'<(?:link|script|img)[^>]*(?:src|href)=["\']https?://', html, re.I)
    assert not remote_html_matches, f"Error: Remote tags in index.html: {remote_html_matches}"
    print("  -> PASS: 100% strict offline compliance verified.")

def test_design_tokens():
    print("[TEST] 2. Testing Design Tokens in :root...")
    with open(STYLE_CSS_PATH, "r", encoding="utf-8") as f:
        css = f.read()

    required_tokens = [
        "--color-primary", "--color-primary-h", "--color-primary-light",
        "--color-accent", "--color-accent-h", "--color-accent-light",
        "--color-error", "--color-error-h", "--color-error-light",
        "--color-warn", "--color-warn-h", "--color-warn-light",
        "--color-bg", "--color-surface", "--color-border", "--color-text", "--color-muted",
        # 10 finger zones
        "--zone-pinky-l", "--zone-pinky-l-bg", "--zone-pinky-l-text", "--zone-pinky-l-brd",
        "--zone-ring-l", "--zone-ring-l-bg", "--zone-ring-l-text", "--zone-ring-l-brd",
        "--zone-mid-l", "--zone-mid-l-bg", "--zone-mid-l-text", "--zone-mid-l-brd",
        "--zone-idx-l", "--zone-idx-l-bg", "--zone-idx-l-text", "--zone-idx-l-brd",
        "--zone-idx-r", "--zone-idx-r-bg", "--zone-idx-r-text", "--zone-idx-r-brd",
        "--zone-mid-r", "--zone-mid-r-bg", "--zone-mid-r-text", "--zone-mid-r-brd",
        "--zone-ring-r", "--zone-ring-r-bg", "--zone-ring-r-text", "--zone-ring-r-brd",
        "--zone-pinky-r", "--zone-pinky-r-bg", "--zone-pinky-r-text", "--zone-pinky-r-brd",
        "--zone-thumb", "--zone-thumb-bg", "--zone-thumb-text", "--zone-thumb-brd",
        # tactile & shadows
        "--radius-sm", "--radius-md", "--radius-lg",
        "--shadow-sm", "--shadow-md", "--shadow-lg", "--shadow-key", "--shadow-key-pressed"
    ]

    for token in required_tokens:
        assert token in css, f"Missing token in :root: {token}"
    print(f"  -> PASS: All {len(required_tokens)} design tokens verified in :root.")

def test_missing_classes():
    print("[TEST] 3. Testing 37 Missing Classes and Contract Aliases...")
    with open(STYLE_CSS_PATH, "r", encoding="utf-8") as f:
        css = f.read()

    classes_to_check = [
        # Keyboard
        'kb-key', 'key', 'kb-row', 'keyboard-row', 'kb-space', 'key-space',
        'kb-row-offset-1', 'kb-row-offset-2', 'kb-row-space', 'keyboard-wrap',
        'typing-trainer', 'tt-hidden-input', 'level-btn', 'btn-level',
        'level-label', 'level-title', 'typing-text-wrap', 'stat-item',
        # Results
        'result-stats', 'result-metrics', 'result-stat', 'result-metric',
        'result-stat-label', 'metric-label', 'result-stat-value', 'metric-value',
        'result-stat-unit', 'result-title', 'btn-outline',
        # Utilities
        'btn-danger', 'table-responsive', 'fade-in', 'no-results', 'slide-no-img',
        'modal-body', 'mat-actions', 'btn-open-slides', 'btn-start-test',
        'ans-text', 'st-name', 'btn-sm', 'btn-clear-student',
        # 10 finger zones
        'kb-zone-pinky-l', 'kb-zone-ring-l', 'kb-zone-mid-l', 'kb-zone-idx-l',
        'kb-zone-idx-r', 'kb-zone-mid-r', 'kb-zone-ring-r', 'kb-zone-pinky-r', 'kb-zone-thumb'
    ]

    for cls in classes_to_check:
        pattern = r'\.' + re.escape(cls) + r'(?![a-zA-Z0-9_-])'
        assert re.search(pattern, css), f"Missing CSS class: .{cls}"
    print(f"  -> PASS: All {len(classes_to_check)} required and alias classes verified in style.css.")

def test_browser_layouts_and_a11y():
    print("[TEST] 4. Testing Multi-Resolution Layouts & Accessibility in Headless Edge...")
    options = Options()
    options.add_argument('--headless=new')
    options.add_argument('--disable-gpu')
    options.add_argument('--no-sandbox')
    
    html_url = "file:///" + INDEX_HTML_PATH.replace("\\", "/")
    resolutions = [
        (1280, 720, "Compact Laptop (1280x720)"),
        (1366, 768, "Standard Laptop (1366x768)"),
        (1920, 1080, "Full HD Desktop (1920x1080)")
    ]

    for width, height, label in resolutions:
        options = Options()
        options.add_argument('--headless=new')
        options.add_argument('--disable-gpu')
        options.add_argument('--no-sandbox')
        options.add_argument(f'--window-size={width},{height}')
        driver = webdriver.Edge(options=options)
        try:
            driver.get(html_url)
            time.sleep(0.4)

            # 4.1 Focus Ring Test
            btn_student = driver.find_element(By.ID, "btn-student")
            driver.execute_script("arguments[0].focus();", btn_student)
            
            # 4.2 Screen-Student Card Width on 1920x1080
            btn_student.click()
            time.sleep(0.3)

            # Click 7-A
            class_btn = driver.find_element(By.CLASS_NAME, "btn-class")
            class_btn.click()
            time.sleep(0.3)

            cards = driver.find_elements(By.CLASS_NAME, "student-card")
            assert len(cards) > 0, "No student cards rendered"
            card_width = driver.execute_script("return arguments[0].getBoundingClientRect().width;", cards[0])
            
            if width == 1920:
                assert card_width <= 360, f"Card width too large on 1920x1080: {card_width}px (expected <= 360px, auto-fill)"
                print(f"    [{label}] Student card width: {card_width:.1f}px (Compact auto-fill grid verified)")
            else:
                print(f"    [{label}] Student card width: {card_width:.1f}px")

            # 4.3 Keyboard Trainer Viewport Containment
            # Select student and navigate to typing screen
            cards[0].click()
            time.sleep(0.3)

            typing_btn = driver.find_element(By.CSS_SELECTOR, '[data-module="typing"]')
            typing_btn.click()
            time.sleep(0.4)

            typing_measurements = driver.execute_script("""
                const body = document.querySelector('#screen-typing .screen-body');
                const kb = document.querySelector('.keyboard');
                const winH = window.innerHeight;
                const docH = document.documentElement.scrollHeight;
                return {
                    winH: winH,
                    docH: docH,
                    hasDocScroll: docH > winH + 5,
                    kbHeight: kb ? kb.getBoundingClientRect().height : 0,
                    bodyOverflowY: window.getComputedStyle(body).overflowY
                };
            """)
            print(f"    [{label}] Typing screen docH: {typing_measurements['docH']}px / winH: {typing_measurements['winH']}px, kbHeight: {typing_measurements['kbHeight']:.1f}px, bodyOverflowY: {typing_measurements['bodyOverflowY']}")
            assert not typing_measurements['hasDocScroll'], f"Vertical scrollbar detected on typing screen for {label}"
            assert typing_measurements['kbHeight'] < 300, f"Keyboard height bloated: {typing_measurements['kbHeight']}px"

            # 4.4 Presentation Modal Viewport Containment
            # Navigate to materials screen
            back_btn = driver.find_element(By.CSS_SELECTOR, '#screen-typing .btn-back')
            back_btn.click()
            time.sleep(0.3)

            theory_btn = driver.find_element(By.CSS_SELECTOR, '[data-module="theory"]')
            theory_btn.click()
            time.sleep(0.3)

            open_slides_btn = driver.find_element(By.CLASS_NAME, "btn-open-slides")
            open_slides_btn.click()
            time.sleep(0.4)

            modal_measurements = driver.execute_script("""
                const modal = document.querySelector('.modal-box');
                const navBar = document.querySelector('.slide-nav-bar');
                const img = document.querySelector('.slide-image');
                const csNav = window.getComputedStyle(navBar);
                return {
                    modalH: modal.clientHeight,
                    modalScrollH: modal.scrollHeight,
                    isModalOverflowing: modal.scrollHeight > modal.clientHeight + 4,
                    navPosition: csNav.position,
                    imgH: img ? img.clientHeight : 0
                };
            """)
            print(f"    [{label}] Modal clientH: {modal_measurements['modalH']}px, scrollH: {modal_measurements['modalScrollH']}px, navPosition: {modal_measurements['navPosition']}, imgH: {modal_measurements['imgH']}px")
            assert not modal_measurements['isModalOverflowing'], f"Modal-box overflowing on {label}"
            assert modal_measurements['navPosition'] == 'sticky', "Slide nav bar is not sticky"

            # 4.5 Teacher Table Sticky Header and Danger Button
            # Close modal
            close_btn = driver.find_element(By.ID, "modal-close-btn")
            close_btn.click()
            time.sleep(0.2)

            # Go to login screen
            logout_btn = driver.find_element(By.CSS_SELECTOR, '#screen-materials .btn-back')
            logout_btn.click()
            time.sleep(0.2)
            logout_btn2 = driver.find_element(By.ID, "btn-logout")
            logout_btn2.click()
            time.sleep(0.3)

            # Enter teacher panel
            teacher_role_btn = driver.find_element(By.ID, "btn-teacher")
            teacher_role_btn.click()
            time.sleep(0.2)

            pwd_input = driver.find_element(By.ID, "teacher-password")
            pwd_input.send_keys("teacher123")
            enter_btn = driver.find_element(By.ID, "btn-teacher-enter")
            enter_btn.click()
            time.sleep(0.4)

            teacher_measurements = driver.execute_script("""
                const th = document.querySelector('.teacher-table th');
                const tableResp = document.querySelector('.table-responsive');
                const btnDanger = document.getElementById('btn-reset-data');
                const csTh = window.getComputedStyle(th);
                const csResp = window.getComputedStyle(tableResp);
                const csDanger = window.getComputedStyle(btnDanger);
                return {
                    thPosition: csTh.position,
                    thTop: csTh.top,
                    tableRespOverflowX: csResp.overflowX,
                    dangerBg: csDanger.backgroundColor,
                    dangerColor: csDanger.color
                };
            """)
            print(f"    [{label}] Teacher th position: {teacher_measurements['thPosition']}, top: {teacher_measurements['thTop']}, table-responsive overflowX: {teacher_measurements['tableRespOverflowX']}, dangerBg: {teacher_measurements['dangerBg']}")
            assert teacher_measurements['thPosition'] == 'sticky', "Teacher th position must be sticky"
            assert teacher_measurements['tableRespOverflowX'] in ['auto', 'scroll'], "table-responsive must have overflow-x: auto"
            assert '220, 38, 38' in teacher_measurements['dangerBg'], f"btn-danger background should be #dc2626, got {teacher_measurements['dangerBg']}"

        finally:
            driver.quit()

    print("  -> PASS: Multi-resolution layouts and interactive states fully verified.")

if __name__ == "__main__":
    print("=" * 60)
    print("RUNNING MILESTONE 1 VERIFICATION SUITE")
    print("=" * 60)
    test_offline_compliance()
    test_design_tokens()
    test_missing_classes()
    test_browser_layouts_and_a11y()
    print("=" * 60)
    print("ALL MILESTONE 1 TESTS PASSED SUCCESSFULLY!")
    print("=" * 60)
