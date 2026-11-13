"""
Audit teacher table and interactive element states using Edge WebDriver.
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
options.add_argument('--window-size=1280,720')
driver = webdriver.Edge(options=options)
driver.get(HTML_PATH)
time.sleep(0.5)

audit_data = driver.execute_script("""
    // 1. Show teacher panel
    App.showScreen('screen-teacher');
    if (window.TeacherPanel && typeof window.TeacherPanel.init === 'function') {
        window.TeacherPanel.init('teacher-container', App.getAllProgress, window.STUDENTS_DATA);
    }
    
    const th = document.querySelector('.teacher-table th');
    const tableResp = document.querySelector('.table-responsive');
    const btnDanger = document.querySelector('#btn-reset-data');
    const formSelect = document.querySelector('#teacher-class-select');
    
    const teacherAudit = {
        th_exists: !!th,
        th_position: th ? window.getComputedStyle(th).position : null,
        th_top: th ? window.getComputedStyle(th).top : null,
        th_bg: th ? window.getComputedStyle(th).backgroundColor : null,
        th_zIndex: th ? window.getComputedStyle(th).zIndex : null,
        
        tableResp_exists: !!tableResp,
        tableResp_overflowX: tableResp ? window.getComputedStyle(tableResp).overflowX : null,
        tableResp_overflowY: tableResp ? window.getComputedStyle(tableResp).overflowY : null,
        tableResp_width: tableResp ? window.getComputedStyle(tableResp).width : null,
        tableResp_borderRadius: tableResp ? window.getComputedStyle(tableResp).borderRadius : null,
        
        btnDanger_exists: !!btnDanger,
        btnDanger_bg: btnDanger ? window.getComputedStyle(btnDanger).backgroundColor : null,
        btnDanger_color: btnDanger ? window.getComputedStyle(btnDanger).color : null,
        btnDanger_border: btnDanger ? window.getComputedStyle(btnDanger).border : null,
        
        formSelect_exists: !!formSelect,
        formSelect_outline: formSelect ? window.getComputedStyle(formSelect).outline : null
    };
    
    // Check focus on interactive elements
    const focusResults = {};
    const testSelectors = [
        '#btn-reset-data',
        '#btn-export-csv',
        '#teacher-class-select',
        '.btn-back'
    ];
    
    testSelectors.forEach(sel => {
        const el = document.querySelector(sel);
        if (el) {
            el.focus();
            const cs = window.getComputedStyle(el);
            focusResults[sel] = {
                outline: cs.outline,
                outlineColor: cs.outlineColor,
                outlineStyle: cs.outlineStyle,
                outlineWidth: cs.outlineWidth,
                outlineOffset: cs.outlineOffset,
                boxShadow: cs.boxShadow
            };
        }
    });

    return { teacherAudit, focusResults };
""")

driver.quit()

print(json.dumps(audit_data, indent=2, ensure_ascii=False))
