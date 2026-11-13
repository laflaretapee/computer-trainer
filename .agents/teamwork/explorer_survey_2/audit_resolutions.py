import os
import json
import time
from selenium import webdriver
from selenium.webdriver.edge.options import Options
from selenium.webdriver.common.by import By

RESOLUTIONS = [
    (1280, 720, "1280x720"),
    (1366, 768, "1366x768"),
    (1920, 1080, "1920x1080")
]

HTML_PATH = "file:///" + os.path.abspath(r"C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\index.html").replace("\\", "/")

def create_driver(w, h):
    options = Options()
    options.add_argument('--headless=new')
    options.add_argument('--disable-gpu')
    options.add_argument('--no-sandbox')
    options.add_argument(f'--window-size={w},{h}')
    driver = webdriver.Edge(options=options)
    driver.set_window_size(w, h)
    return driver

def inspect_screen(driver, name, setup_code, checks_fn):
    driver.get(HTML_PATH)
    time.sleep(0.4)
    if setup_code:
        driver.execute_script(setup_code)
        time.sleep(0.4)
    return checks_fn(driver)

report = {}

for w, h, res_name in RESOLUTIONS:
    print(f"=== Testing resolution {res_name} ===")
    driver = create_driver(w, h)
    res_data = {}
    
    # Check 1: Login Screen
    def check_login(d):
        login_el = d.find_element(By.ID, "screen-login")
        center = d.find_element(By.CSS_SELECTOR, "#screen-login .screen-center")
        btns = d.find_elements(By.CSS_SELECTOR, ".btn-role")
        return {
            "viewport_inner": d.execute_script("return {w: window.innerWidth, h: window.innerHeight, docH: document.documentElement.scrollHeight, docW: document.documentElement.scrollWidth};"),
            "login_rect": login_el.rect,
            "center_rect": center.rect,
            "role_btns_rect": [b.rect for b in btns],
            "has_horizontal_scroll": d.execute_script("return document.documentElement.scrollWidth > window.innerWidth;"),
            "has_vertical_scroll": d.execute_script("return document.documentElement.scrollHeight > window.innerHeight;")
        }
    res_data["login"] = inspect_screen(driver, "login", None, check_login)
    
    # Check 2: Class Screen
    def check_classes(d):
        grid = d.find_element(By.ID, "class-list")
        btns = d.find_elements(By.CSS_SELECTOR, ".btn-class")
        return {
            "viewport_inner": d.execute_script("return {w: window.innerWidth, h: window.innerHeight, docH: document.documentElement.scrollHeight, docW: document.documentElement.scrollWidth};"),
            "grid_rect": grid.rect,
            "btns_rect": [b.rect for b in btns],
            "has_horizontal_scroll": d.execute_script("return document.documentElement.scrollWidth > window.innerWidth;"),
            "has_vertical_scroll": d.execute_script("return document.documentElement.scrollHeight > window.innerHeight;")
        }
    res_data["classes"] = inspect_screen(driver, "classes", "document.getElementById('btn-student').click();", check_classes)

    # Check 3: Student Screen
    def check_students(d):
        grid = d.find_element(By.ID, "student-list")
        cards = d.find_elements(By.CSS_SELECTOR, ".student-card")
        return {
            "viewport_inner": d.execute_script("return {w: window.innerWidth, h: window.innerHeight, docH: document.documentElement.scrollHeight, docW: document.documentElement.scrollWidth};"),
            "grid_rect": grid.rect,
            "cards_count": len(cards),
            "first_card_rect": cards[0].rect if cards else None,
            "last_card_rect": cards[-1].rect if cards else None,
            "has_horizontal_scroll": d.execute_script("return document.documentElement.scrollWidth > window.innerWidth;"),
            "has_vertical_scroll": d.execute_script("return document.documentElement.scrollHeight > window.innerHeight;")
        }
    res_data["students"] = inspect_screen(driver, "students", "App.selectClass('7A');", check_students)

    # Check 4: Menu Screen
    def check_menu(d):
        grid = d.find_element(By.CSS_SELECTOR, "#screen-menu .module-grid")
        mods = d.find_elements(By.CSS_SELECTOR, ".btn-module")
        banner = d.find_element(By.CSS_SELECTOR, ".stats-overview-banner")
        return {
            "viewport_inner": d.execute_script("return {w: window.innerWidth, h: window.innerHeight, docH: document.documentElement.scrollHeight, docW: document.documentElement.scrollWidth};"),
            "banner_rect": banner.rect,
            "grid_rect": grid.rect,
            "mod_rects": [m.rect for m in mods],
            "has_horizontal_scroll": d.execute_script("return document.documentElement.scrollWidth > window.innerWidth;"),
            "has_vertical_scroll": d.execute_script("return document.documentElement.scrollHeight > window.innerHeight;")
        }
    res_data["menu"] = inspect_screen(driver, "menu", "App.selectClass('7A'); App.selectStudent('7A-01');", check_menu)

    # Check 5: Typing Screen
    def check_typing(d):
        trainer = d.find_element(By.CSS_SELECTOR, ".typing-trainer")
        kb = d.find_element(By.ID, "tt-keyboard")
        keys = d.find_elements(By.CSS_SELECTOR, ".kb-key")
        input_el = d.find_element(By.ID, "tt-input")
        stats = d.find_element(By.ID, "tt-stats")
        text_wrap = d.find_element(By.CSS_SELECTOR, ".typing-text-wrap")
        
        # Check computed styles of keys
        key_sample_styles = d.execute_script("""
            const k = document.querySelector('.kb-key');
            if (!k) return null;
            const cs = window.getComputedStyle(k);
            return {
                display: cs.display,
                width: cs.width,
                height: cs.height,
                border: cs.border,
                borderRadius: cs.borderRadius,
                boxShadow: cs.boxShadow
            };
        """)
        
        input_styles = d.execute_script("""
            const inp = document.getElementById('tt-input');
            const cs = window.getComputedStyle(inp);
            return {
                display: cs.display,
                visibility: cs.visibility,
                opacity: cs.opacity,
                position: cs.position,
                width: cs.width,
                height: cs.height
            };
        """)
        
        return {
            "viewport_inner": d.execute_script("return {w: window.innerWidth, h: window.innerHeight, docH: document.documentElement.scrollHeight, docW: document.documentElement.scrollWidth};"),
            "trainer_rect": trainer.rect,
            "kb_rect": kb.rect,
            "keys_count": len(keys),
            "space_key_rect": d.find_element(By.CSS_SELECTOR, ".kb-space").rect if d.find_elements(By.CSS_SELECTOR, ".kb-space") else None,
            "input_rect": input_el.rect,
            "stats_rect": stats.rect,
            "text_wrap_rect": text_wrap.rect,
            "key_sample_styles": key_sample_styles,
            "input_styles": input_styles,
            "has_horizontal_scroll": d.execute_script("return document.documentElement.scrollWidth > window.innerWidth;"),
            "has_vertical_scroll": d.execute_script("return document.documentElement.scrollHeight > window.innerHeight;")
        }
    res_data["typing"] = inspect_screen(driver, "typing", "App.selectClass('7A'); App.selectStudent('7A-01'); document.querySelector('button[data-module=\"typing\"]').click(); window.TypingTrainer.start(1);", check_typing)

    # Check 6: Materials Screen & Modal
    def check_materials(d):
        grid = d.find_element(By.ID, "materials-container")
        cards = d.find_elements(By.CSS_SELECTOR, ".material-card")
        
        # Open modal
        d.find_element(By.CSS_SELECTOR, ".btn-open-slides").click()
        time.sleep(0.3)
        modal_box = d.find_element(By.CSS_SELECTOR, ".modal-box")
        slide_img = d.find_element(By.CSS_SELECTOR, ".slide-image") if d.find_elements(By.CSS_SELECTOR, ".slide-image") else None
        
        modal_info = {
            "modal_box_rect": modal_box.rect,
            "slide_img_rect": slide_img.rect if slide_img else None,
            "modal_scrollHeight": d.execute_script("return document.querySelector('.modal-box').scrollHeight;"),
            "modal_clientHeight": d.execute_script("return document.querySelector('.modal-box').clientHeight;"),
            "is_modal_overflowing": d.execute_script("return document.querySelector('.modal-box').scrollHeight > document.querySelector('.modal-box').clientHeight;")
        }
        
        return {
            "viewport_inner": d.execute_script("return {w: window.innerWidth, h: window.innerHeight, docH: document.documentElement.scrollHeight, docW: document.documentElement.scrollWidth};"),
            "cards_count": len(cards),
            "modal_info": modal_info,
            "has_horizontal_scroll": d.execute_script("return document.documentElement.scrollWidth > window.innerWidth;"),
            "has_vertical_scroll": d.execute_script("return document.documentElement.scrollHeight > window.innerHeight;")
        }
    res_data["materials"] = inspect_screen(driver, "materials", "App.selectClass('7A'); App.selectStudent('7A-01'); document.querySelector('button[data-module=\"theory\"]').click();", check_materials)

    # Check 7: Teacher Dashboard
    def check_teacher(d):
        stats_bar = d.find_element(By.CSS_SELECTOR, ".teacher-stats-bar")
        toolbar = d.find_element(By.CSS_SELECTOR, ".teacher-toolbar")
        table = d.find_element(By.CSS_SELECTOR, ".teacher-table")
        table_container = d.find_element(By.CSS_SELECTOR, ".table-responsive")
        
        return {
            "viewport_inner": d.execute_script("return {w: window.innerWidth, h: window.innerHeight, docH: document.documentElement.scrollHeight, docW: document.documentElement.scrollWidth};"),
            "stats_bar_rect": stats_bar.rect,
            "toolbar_rect": toolbar.rect,
            "table_rect": table.rect,
            "table_container_rect": table_container.rect,
            "table_scrollWidth": d.execute_script("return document.querySelector('.teacher-table').scrollWidth;"),
            "table_offsetWidth": d.execute_script("return document.querySelector('.teacher-table').offsetWidth;"),
            "has_table_overflow": d.execute_script("return document.querySelector('.teacher-table').scrollWidth > document.querySelector('.teacher-table').parentElement.clientWidth;"),
            "has_horizontal_scroll": d.execute_script("return document.documentElement.scrollWidth > window.innerWidth;"),
            "has_vertical_scroll": d.execute_script("return document.documentElement.scrollHeight > window.innerHeight;")
        }
    res_data["teacher"] = inspect_screen(driver, "teacher", "App.teacherLogin('teacher123');", check_teacher)

    report[res_name] = res_data
    driver.quit()

out_path = r"C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\.agents\teamwork\explorer_survey_2\resolution_audit.json"
with open(out_path, "w", encoding="utf-8") as fp:
    json.dump(report, fp, ensure_ascii=False, indent=2)

print("Resolution audit completed and written to resolution_audit.json!")
