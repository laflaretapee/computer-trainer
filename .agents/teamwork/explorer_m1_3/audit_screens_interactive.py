"""
Audit all screens and interactive elements in Edge:
- screen-class (.btn-class)
- screen-student (.student-card, #student-search)
- screen-menu (.btn-module, #btn-logout)
- screen-typing (.level-btn, .kb-key, #tt-btn-retry)
- screen-tests (.answer-btn, .btn-start-test)
- app-modal (.modal-close, #btn-slide-prev, #btn-slide-next)
"""
import os
import json
import time
from selenium import webdriver
from selenium.webdriver.edge.options import Options

HTML_PATH = "file:///" + os.path.abspath(r"C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\index.html").replace("\\", "/")

options = Options()
options.add_argument('--headless=new')
options.add_argument('--disable-gpu')
options.add_argument('--no-sandbox')
options.add_argument('--window-size=1366,768')
driver = webdriver.Edge(options=options)
driver.get(HTML_PATH)
time.sleep(0.5)

audit_report = driver.execute_script("""
    const results = {};
    
    // 1. Screen class
    App.showScreen('screen-class');
    const classBtn = document.querySelector('.btn-class');
    if (classBtn) {
        classBtn.focus();
        const cs = window.getComputedStyle(classBtn);
        results['.btn-class'] = {
            bg: cs.backgroundColor,
            color: cs.color,
            transform: cs.transform,
            outline: cs.outline,
            outlineOffset: cs.outlineOffset
        };
    }
    
    // 2. Screen student
    App.selectClass('7-A');
    const studentCard = document.querySelector('.student-card');
    if (studentCard) {
        studentCard.focus();
        const cs = window.getComputedStyle(studentCard);
        results['.student-card'] = {
            bg: cs.backgroundColor,
            color: cs.color,
            transform: cs.transform,
            outline: cs.outline,
            outlineOffset: cs.outlineOffset
        };
    }
    
    // 3. Screen menu
    App.selectStudent('7a_01');
    const modBtn = document.querySelector('.btn-module');
    if (modBtn) {
        modBtn.focus();
        const cs = window.getComputedStyle(modBtn);
        results['.btn-module'] = {
            bg: cs.backgroundColor,
            color: cs.color,
            transform: cs.transform,
            outline: cs.outline,
            outlineOffset: cs.outlineOffset
        };
    }
    
    // 4. Screen typing
    App.showScreen('screen-typing');
    if (window.TypingTrainer && typeof window.TypingTrainer.init === 'function') {
        window.TypingTrainer.init('typing-container');
    }
    const levelBtn = document.querySelector('.level-btn');
    if (levelBtn) {
        levelBtn.focus();
        const cs = window.getComputedStyle(levelBtn);
        results['.level-btn'] = {
            bg: cs.backgroundColor,
            color: cs.color,
            transform: cs.transform,
            outline: cs.outline,
            outlineOffset: cs.outlineOffset
        };
    }
    const kbKey = document.querySelector('.kb-key');
    if (kbKey) {
        const cs = window.getComputedStyle(kbKey);
        results['.kb-key'] = {
            display: cs.display,
            width: cs.width,
            height: cs.height,
            bg: cs.backgroundColor,
            cursor: cs.cursor,
            boxShadow: cs.boxShadow,
            transform: cs.transform
        };
    }
    
    // 5. Screen tests
    App.showScreen('screen-tests');
    const startTestBtn = document.querySelector('.btn-start-test');
    if (startTestBtn) {
        startTestBtn.focus();
        const cs = window.getComputedStyle(startTestBtn);
        results['.btn-start-test'] = {
            bg: cs.backgroundColor,
            outline: cs.outline,
            outlineOffset: cs.outlineOffset
        };
    }
    
    return results;
""")

driver.quit()
print(json.dumps(audit_report, indent=2, ensure_ascii=False))
