import os
import json
import time
from selenium import webdriver
from selenium.webdriver.edge.options import Options
from selenium.webdriver.common.by import By

HTML_PATH = "file:///" + os.path.abspath(r"C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\index.html").replace("\\", "/")

options = Options()
options.add_argument('--headless=new')
options.add_argument('--disable-gpu')
options.add_argument('--no-sandbox')
options.add_argument('--window-size=1366,768')
driver = webdriver.Edge(options=options)
driver.get(HTML_PATH)
time.sleep(0.5)

focus_report = driver.execute_script("""
    const selectors = [
        '.btn-primary',
        '.btn-secondary',
        '.btn-back',
        '.btn-class',
        '.student-card',
        '.btn-module',
        '.form-input',
        '.form-select',
        '.modal-close'
    ];
    
    // First make all screens active or sample elements
    App.showScreen('screen-teacher');
    App.teacherLogin('teacher123');
    
    const results = {};
    
    // Test focus on button
    const btn = document.querySelector('.btn-primary');
    if (btn) {
        btn.focus();
        const cs = window.getComputedStyle(btn);
        results['btn-primary:focus'] = {
            outline: cs.outline,
            outlineColor: cs.outlineColor,
            outlineStyle: cs.outlineStyle,
            outlineWidth: cs.outlineWidth,
            boxShadow: cs.boxShadow
        };
    }
    
    const sel = document.getElementById('teacher-class-select');
    if (sel) {
        sel.focus();
        const cs = window.getComputedStyle(sel);
        results['form-select:focus'] = {
            outline: cs.outline,
            outlineColor: cs.outlineColor,
            outlineStyle: cs.outlineStyle,
            boxShadow: cs.boxShadow,
            borderColor: cs.borderColor
        };
    }
    
    App.showScreen('screen-menu');
    const modBtn = document.querySelector('.btn-module');
    if (modBtn) {
        modBtn.focus();
        const cs = window.getComputedStyle(modBtn);
        results['btn-module:focus'] = {
            outline: cs.outline,
            outlineColor: cs.outlineColor,
            outlineStyle: cs.outlineStyle,
            boxShadow: cs.boxShadow,
            borderColor: cs.borderColor
        };
    }

    return results;
""")

print("Focus styles audit:")
print(json.dumps(focus_report, indent=2))
driver.quit()
