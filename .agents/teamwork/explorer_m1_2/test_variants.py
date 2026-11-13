import sys
import os
import time
import json
from selenium import webdriver
from selenium.webdriver.edge.options import Options

WORKSPACE = r"C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer"
URL = "file:///" + os.path.abspath(os.path.join(WORKSPACE, "index.html")).replace("\\", "/")

RESOLUTIONS = [(1280, 720), (1366, 768), (1920, 1080)]

TEST_CSS = """
/* Test Flexbox for 5 Classes and 5 Modules */
.class-grid {
  display: flex !important;
  flex-wrap: wrap !important;
  justify-content: center !important;
  gap: clamp(12px, 1.5vw, 20px) !important;
  max-width: 1200px !important;
  margin: 16px auto 0 !important;
}
.btn-class {
  flex: 0 1 calc(20% - 20px) !important;
  min-width: 180px !important;
  max-width: 230px !important;
  min-height: clamp(80px, 11vh, 105px) !important;
  padding: clamp(12px, 1.5vh, 18px) clamp(10px, 1.2vw, 16px) !important;
  display: flex !important;
  flex-direction: column !important;
  justify-content: center !important;
  align-items: center !important;
}

/* 5 Modules: 3 on row 1, 2 on row 2 (centered) */
.module-grid {
  display: flex !important;
  flex-wrap: wrap !important;
  justify-content: center !important;
  gap: clamp(14px, 1.8vw, 24px) !important;
  max-width: 1020px !important;
  margin: 0 auto !important;
}
.btn-module {
  flex: 0 1 calc(33.333% - 24px) !important;
  min-width: 260px !important;
  max-width: 320px !important;
  padding: clamp(16px, 2.2vh, 24px) clamp(16px, 1.8vw, 20px) !important;
  gap: clamp(6px, 1vh, 10px) !important;
}

@media (min-width: 1500px) {
  .module-grid.five-modules-wide {
    max-width: 1400px !important;
  }
  .module-grid.five-modules-wide .btn-module {
    flex: 0 1 calc(20% - 20px) !important;
    min-width: 220px !important;
  }
}
"""

def test_variants():
    options = Options()
    options.add_argument('--headless=new')
    options.add_argument('--disable-gpu')
    options.add_argument('--no-sandbox')

    for (target_w, target_h) in RESOLUTIONS:
        res_key = f"{target_w}x{target_h}"
        print(f"\n================ Testing Variant: {res_key} ================")
        options.add_argument(f'--window-size={target_w},{target_h}')
        driver = webdriver.Edge(options=options)
        try:
            driver.get(URL)
            time.sleep(0.3)

            driver.execute_script("""
                const style = document.createElement('style');
                style.textContent = arguments[0];
                document.head.appendChild(style);
            """, TEST_CSS)

            # Classes
            driver.execute_script("App.showScreen('screen-class');")
            driver.execute_script("""
                const container = document.getElementById('class-list');
                container.innerHTML = '';
                window.STUDENTS_DATA.classes.forEach(cls => {
                    const btn = document.createElement('button');
                    btn.className = 'btn btn-class';
                    btn.innerHTML = `<span class="class-title">${cls.name}</span><span class="class-sub">${cls.subject || ''} (${(cls.students || []).length} уч.)</span>`;
                    container.appendChild(btn);
                });
            """)
            cls_res = driver.execute_script("""
                const btns = Array.from(document.querySelectorAll('.btn-class'));
                const btnData = btns.map(b => b.getBoundingClientRect());
                const rows = {};
                btnData.forEach(b => {
                    const yKey = Math.round(b.y / 10) * 10;
                    rows[yKey] = (rows[yKey] || 0) + 1;
                });
                return {
                    distribution: Object.values(rows),
                    widths: btnData.map(b => Math.round(b.width)),
                    scroll: document.documentElement.scrollHeight > window.innerHeight
                };
            """)
            print(f"Classes: distribution={cls_res['distribution']}, widths={cls_res['widths']}, scroll={cls_res['scroll']}")

            # 5 Modules
            driver.execute_script("App.selectStudent('7A-01');")
            driver.execute_script("""
                const grid = document.querySelector('.module-grid');
                if (!grid.querySelector('[data-module=\"mouse\"]')) {
                    const btnMouse = document.createElement('button');
                    btnMouse.className = 'btn btn-module';
                    btnMouse.setAttribute('data-module', 'mouse');
                    btnMouse.innerHTML = `
                        <span class="module-icon">🖱️</span>
                        <span class="module-name">Тренажёр мыши</span>
                        <span class="module-desc">Клик, двойной клик, перетаскивание и контекстное меню</span>
                    `;
                    grid.insertBefore(btnMouse, grid.children[1]);
                }
            """)
            mod_res = driver.execute_script("""
                const grid = document.querySelector('.module-grid');
                const mods = Array.from(grid.querySelectorAll('.btn-module'));
                const modData = mods.map(m => m.getBoundingClientRect());
                const rows = {};
                modData.forEach(m => {
                    const yKey = Math.round(m.y / 10) * 10;
                    rows[yKey] = (rows[yKey] || 0) + 1;
                });
                // Check if row 2 is centered
                const row2 = modData.slice(3);
                let row2Centered = false;
                if (row2.length === 2) {
                    const leftMargin = row2[0].left - grid.getBoundingClientRect().left;
                    const rightMargin = grid.getBoundingClientRect().right - row2[1].right;
                    row2Centered = Math.abs(leftMargin - rightMargin) < 10;
                }
                return {
                    distribution: Object.values(rows),
                    widths: modData.map(m => Math.round(m.width)),
                    row2Centered: row2Centered,
                    scroll: document.documentElement.scrollHeight > window.innerHeight
                };
            """)
            print(f"5 Modules: distribution={mod_res['distribution']}, widths={mod_res['widths']}, row2Centered={mod_res['row2Centered']}, scroll={mod_res['scroll']}")

        finally:
            driver.quit()

if __name__ == "__main__":
    test_variants()
