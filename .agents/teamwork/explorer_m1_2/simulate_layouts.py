import sys
import os
import time
import json
from selenium import webdriver
from selenium.webdriver.edge.options import Options
from selenium.webdriver.common.by import By

WORKSPACE = r"C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer"
URL = "file:///" + os.path.abspath(os.path.join(WORKSPACE, "index.html")).replace("\\", "/")

RESOLUTIONS = [
    (1280, 720),
    (1366, 768),
    (1920, 1080)
]

PROPOSED_CSS = """
/* === INJECTED CANDIDATE RESPONSIVE CSS === */

/* Utility / Container */
.screen-body {
  padding: clamp(12px, 2vh, 28px) clamp(16px, 3vw, 32px);
  gap: clamp(10px, 1.5vh, 20px);
}
.screen-header {
  padding: clamp(10px, 1.5vh, 16px) clamp(16px, 3vw, 32px);
}

/* 1. Modal / Slide Viewer */
.modal-overlay {
  padding: clamp(10px, 2vh, 24px);
}
.modal-box {
  max-height: calc(100vh - 40px);
  max-width: clamp(700px, 75vw, 1050px);
  padding: clamp(14px, 2vh, 24px);
  display: flex;
  flex-direction: column;
  gap: clamp(8px, 1.2vh, 16px);
  overflow: hidden; /* container doesn't overflow */
}
.modal-header {
  padding-bottom: clamp(6px, 1vh, 12px);
  flex-shrink: 0;
}
.modal-body {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow-y: auto; /* internal scroll only if notes are huge */
}
.slide-viewer {
  display: flex;
  flex-direction: column;
  gap: clamp(8px, 1.2vh, 14px);
  height: 100%;
  max-width: 100%;
}
.slide-nav-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: clamp(6px, 1vh, 10px);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
  position: sticky;
  top: 0;
  background: var(--color-surface);
  z-index: 5;
}
.slide-img-box {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  background: #0f172a;
  border-radius: var(--radius-md);
  overflow: hidden;
}
.slide-image {
  max-width: 100%;
  max-height: clamp(200px, 45vh, 480px);
  width: auto;
  height: auto;
  object-fit: contain;
  display: block;
}
.slide-notes {
  flex-shrink: 0;
  max-height: clamp(60px, 14vh, 120px);
  overflow-y: auto;
  padding: clamp(8px, 1.2vh, 14px);
  font-size: clamp(12px, 0.95vw, 14px);
  line-height: 1.45;
  background: #f8fafc;
  border-left: 4px solid var(--color-primary);
  border-radius: var(--radius-sm);
}

/* 2. Student Selection Grid */
.student-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: clamp(10px, 1.2vw, 16px);
  width: 100%;
}
.student-card {
  padding: clamp(10px, 1.2vh, 16px) clamp(12px, 1.2vw, 18px);
  font-size: clamp(14px, 1vw, 16px);
}

/* 3. Class Selection Grid */
.class-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: clamp(12px, 1.5vw, 20px);
  max-width: 1200px;
  margin: 16px auto 0;
  width: 100%;
}
.btn-class {
  min-width: 180px;
  min-height: clamp(80px, 11vh, 105px);
  padding: clamp(12px, 1.5vh, 18px) clamp(10px, 1.2vw, 16px);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}
.class-title {
  font-size: clamp(1.2rem, 1.6vw, 1.5rem);
}
.class-sub {
  font-size: clamp(11px, 0.85vw, 13px);
  white-space: nowrap;
}

/* 4. Menu Module Grid (supporting 4 or 5 modules) */
.module-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: clamp(14px, 1.8vw, 22px);
  max-width: 1100px;
  margin: 0 auto;
  width: 100%;
}
.btn-module {
  padding: clamp(16px, 2.2vh, 26px) clamp(16px, 1.8vw, 22px);
  gap: clamp(6px, 1vh, 10px);
}
.module-icon {
  font-size: clamp(1.6rem, 2.2vw, 2rem);
}
.module-name {
  font-size: clamp(1rem, 1.2vw, 1.15rem);
}
.module-desc {
  font-size: clamp(0.78rem, 0.9vw, 0.88rem);
}

/* 5. Keyboard Trainer Full Viewport Containment */
.typing-trainer {
  display: flex;
  flex-direction: column;
  gap: clamp(6px, 1vh, 14px);
  max-width: 1000px;
  margin: 0 auto;
  width: 100%;
}
.level-selector {
  display: flex;
  gap: clamp(4px, 0.6vw, 8px);
  flex-wrap: wrap;
  align-items: center;
  margin-bottom: 0;
}
.level-btn {
  padding: clamp(4px, 0.8vh, 8px) clamp(8px, 1vw, 14px);
  font-size: clamp(0.8rem, 0.9vw, 0.9rem);
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  cursor: pointer;
}
.level-title {
  font-size: clamp(0.95rem, 1.1vw, 1.1rem);
  font-weight: 700;
  color: var(--color-primary);
}
.typing-text-wrap {
  width: 100%;
}
.typing-text {
  font-size: clamp(1.1rem, 1.6vw, 1.4rem);
  padding: clamp(10px, 1.5vh, 16px) clamp(14px, 2vw, 20px);
  line-height: 1.6;
  margin: 0;
  border-radius: var(--radius-md);
}
.tt-hidden-input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
  width: 1px;
  height: 1px;
  top: -100px;
}
.keyboard-wrap {
  width: 100%;
  display: flex;
  justify-content: center;
  margin: 0;
}
.keyboard {
  display: flex;
  flex-direction: column;
  gap: clamp(3px, 0.5vh, 5px);
  padding: clamp(8px, 1.2vh, 14px);
  background: #e2e8f0;
  border-radius: var(--radius-md);
  box-shadow: inset 0 2px 4px rgba(0,0,0,0.06);
  user-select: none;
  width: auto;
}
.kb-row {
  display: flex;
  gap: clamp(3px, 0.5vw, 5px);
  justify-content: center;
}
.kb-key {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: clamp(32px, 3.4vw, 44px);
  height: clamp(32px, 4.4vh, 42px);
  padding: 0 clamp(4px, 0.6vw, 8px);
  background: var(--color-surface);
  border: 2px solid var(--color-border);
  border-radius: 6px;
  font-size: clamp(0.75rem, 0.95vw, 0.9rem);
  font-weight: 700;
  color: var(--color-text);
  box-shadow: 0 3px 0 rgba(0,0,0,0.1);
  cursor: pointer;
  transition: transform 0.08s ease, box-shadow 0.08s ease;
}
.kb-key:active {
  transform: translateY(2px);
  box-shadow: 0 1px 0 rgba(0,0,0,0.1);
}
.kb-space {
  min-width: clamp(180px, 22vw, 260px);
}
.typing-stats {
  display: flex;
  gap: clamp(14px, 2.5vw, 30px);
  font-size: clamp(0.85rem, 1vw, 0.95rem);
  font-weight: 600;
  color: var(--color-muted);
}
"""

def run_tests():
    options = Options()
    options.add_argument('--headless=new')
    options.add_argument('--disable-gpu')
    options.add_argument('--no-sandbox')

    results = {}

    for (target_w, target_h) in RESOLUTIONS:
        res_key = f"{target_w}x{target_h}"
        print(f"\n================ Testing {res_key} ================")
        options.add_argument(f'--window-size={target_w},{target_h}')
        driver = webdriver.Edge(options=options)
        
        try:
            driver.get(URL)
            time.sleep(0.5)

            # Measure baseline window dimensions
            win_info = driver.execute_script("""
                return {
                    w: window.innerWidth,
                    h: window.innerHeight,
                    screenW: window.screen.width,
                    screenH: window.screen.height
                };
            """)
            print(f"Viewport inner: {win_info['w']}x{win_info['h']}")

            # Inject the proposed CSS into document
            driver.execute_script("""
                const style = document.createElement('style');
                style.id = 'candidate-responsive-style';
                style.textContent = arguments[0];
                document.head.appendChild(style);
            """, PROPOSED_CSS)

            # -------------------------------------------------------------
            # TEST 1: Class Selection Grid (5 classes 7A-7D)
            # -------------------------------------------------------------
            driver.execute_script("App.showScreen('screen-class');")
            time.sleep(0.3)
            # Make sure class list is rendered
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
            class_metrics = driver.execute_script("""
                const grid = document.getElementById('class-list');
                const btns = Array.from(grid.querySelectorAll('.btn-class'));
                const gridRect = grid.getBoundingClientRect();
                const btnData = btns.map(b => {
                    const r = b.getBoundingClientRect();
                    return { x: r.x, y: r.y, w: r.width, h: r.height };
                });
                // Group by row (approx same y, within 5px)
                const rows = {};
                btnData.forEach((b, i) => {
                    const rowKey = Math.round(b.y / 10) * 10;
                    rows[rowKey] = (rows[rowKey] || 0) + 1;
                });
                return {
                    gridWidth: gridRect.width,
                    gridHeight: gridRect.height,
                    gridX: gridRect.x,
                    buttonCount: btns.length,
                    buttons: btnData,
                    rowDistribution: Object.values(rows),
                    docH: document.documentElement.scrollHeight,
                    winH: window.innerHeight,
                    hasVerticalScroll: document.documentElement.scrollHeight > window.innerHeight
                };
            """)
            print(f"Class Screen: {class_metrics['buttonCount']} buttons. Row distribution: {class_metrics['rowDistribution']}, Vertical scroll: {class_metrics['hasVerticalScroll']}")

            # -------------------------------------------------------------
            # TEST 2: Student Selection Grid (15 and 17 students)
            # -------------------------------------------------------------
            driver.execute_script("App.selectClass('7A');")
            time.sleep(0.3)
            student_metrics = driver.execute_script("""
                const grid = document.getElementById('student-list');
                const cards = Array.from(grid.querySelectorAll('.student-card'));
                const gridRect = grid.getBoundingClientRect();
                const cardData = cards.map(c => {
                    const r = c.getBoundingClientRect();
                    return { x: r.x, y: r.y, w: r.width, h: r.height };
                });
                const colCount = new Set(cardData.map(c => Math.round(c.x))).size;
                return {
                    gridWidth: gridRect.width,
                    gridHeight: gridRect.height,
                    cardCount: cards.length,
                    columns: colCount,
                    cardWidth: cardData[0] ? cardData[0].w : 0,
                    cardHeight: cardData[0] ? cardData[0].h : 0,
                    docH: document.documentElement.scrollHeight,
                    winH: window.innerHeight,
                    hasVerticalScroll: document.documentElement.scrollHeight > window.innerHeight
                };
            """)
            print(f"Student Screen (7A, 15 students): {student_metrics['columns']} cols, card width={student_metrics['cardWidth']:.1f}px, card height={student_metrics['cardHeight']:.1f}px, gridHeight={student_metrics['gridHeight']:.1f}px, Vertical scroll: {student_metrics['hasVerticalScroll']}")

            # -------------------------------------------------------------
            # TEST 3: Menu Screen (4 modules AND 5 modules)
            # -------------------------------------------------------------
            driver.execute_script("App.selectStudent('7A-01');")
            time.sleep(0.3)
            menu_4_metrics = driver.execute_script("""
                const grid = document.querySelector('.module-grid');
                const mods = Array.from(grid.querySelectorAll('.btn-module'));
                const gridRect = grid.getBoundingClientRect();
                const modData = mods.map(m => {
                    const r = m.getBoundingClientRect();
                    return { x: r.x, y: r.y, w: r.width, h: r.height };
                });
                const cols = new Set(modData.map(m => Math.round(m.x))).size;
                const rows = new Set(modData.map(m => Math.round(m.y))).size;
                return {
                    gridX: gridRect.x,
                    gridW: gridRect.width,
                    gridH: gridRect.height,
                    isCentered: Math.abs((window.innerWidth - gridRect.width) / 2 - gridRect.x) < 20,
                    cols: cols,
                    rows: rows,
                    modW: modData[0].w,
                    modH: modData[0].h,
                    hasVerticalScroll: document.documentElement.scrollHeight > window.innerHeight
                };
            """)
            print(f"Menu Screen (4 modules): cols={menu_4_metrics['cols']}, rows={menu_4_metrics['rows']}, gridW={menu_4_metrics['gridW']:.1f}px, centered={menu_4_metrics['isCentered']}, modW={menu_4_metrics['modW']:.1f}px, modH={menu_4_metrics['modH']:.1f}px, Vertical scroll={menu_4_metrics['hasVerticalScroll']}")

            # Add 5th module (Mouse Trainer) and test
            menu_5_metrics = driver.execute_script("""
                const grid = document.querySelector('.module-grid');
                const btnMouse = document.createElement('button');
                btnMouse.className = 'btn btn-module';
                btnMouse.setAttribute('data-module', 'mouse');
                btnMouse.innerHTML = `
                    <span class="module-icon">🖱️</span>
                    <span class="module-name">Тренажёр мыши</span>
                    <span class="module-desc">Клик, двойной клик, перетаскивание и контекстное меню</span>
                `;
                // Insert after typing
                grid.insertBefore(btnMouse, grid.children[1]);

                const mods = Array.from(grid.querySelectorAll('.btn-module'));
                const gridRect = grid.getBoundingClientRect();
                const modData = mods.map(m => {
                    const r = m.getBoundingClientRect();
                    return { x: r.x, y: r.y, w: r.width, h: r.height };
                });
                const rowGroups = {};
                modData.forEach(m => {
                    const yKey = Math.round(m.y / 10) * 10;
                    rowGroups[yKey] = (rowGroups[yKey] || 0) + 1;
                });
                return {
                    gridX: gridRect.x,
                    gridW: gridRect.width,
                    gridH: gridRect.height,
                    isCentered: Math.abs((window.innerWidth - gridRect.width) / 2 - gridRect.x) < 20,
                    distribution: Object.values(rowGroups),
                    modW: modData[0].w,
                    modH: modData[0].h,
                    hasVerticalScroll: document.documentElement.scrollHeight > window.innerHeight
                };
            """)
            print(f"Menu Screen (5 modules): distribution={menu_5_metrics['distribution']}, gridW={menu_5_metrics['gridW']:.1f}px, centered={menu_5_metrics['isCentered']}, modW={menu_5_metrics['modW']:.1f}px, modH={menu_5_metrics['modH']:.1f}px, Vertical scroll={menu_5_metrics['hasVerticalScroll']}")

            # -------------------------------------------------------------
            # TEST 4: Typing Trainer Screen (Full Viewport Containment)
            # -------------------------------------------------------------
            driver.execute_script("""
                App.showScreen('screen-typing');
                if (window.TypingTrainer && typeof window.TypingTrainer.init === 'function') {
                    window.TypingTrainer.init('typing-container');
                }
            """)
            time.sleep(0.3)
            typing_metrics = driver.execute_script("""
                const trainer = document.querySelector('.typing-trainer');
                const kb = document.getElementById('tt-keyboard');
                const kbWrap = document.querySelector('.keyboard-wrap');
                const textEl = document.getElementById('tt-text');
                const statsEl = document.getElementById('tt-stats');
                const screenBody = document.querySelector('#screen-typing .screen-body');
                const screenHdr = document.querySelector('#screen-typing .screen-header');

                const kbRect = kb ? kb.getBoundingClientRect() : {};
                const trainerRect = trainer ? trainer.getBoundingClientRect() : {};

                return {
                    docH: document.documentElement.scrollHeight,
                    winH: window.innerHeight,
                    hasVerticalScroll: document.documentElement.scrollHeight > window.innerHeight,
                    bodyScrollH: screenBody.scrollHeight,
                    bodyClientH: screenBody.clientHeight,
                    hasBodyScroll: screenBody.scrollHeight > screenBody.clientHeight,
                    trainerH: trainerRect.height,
                    kbH: kbRect.height,
                    kbW: kbRect.width,
                    headerH: screenHdr.getBoundingClientRect().height
                };
            """)
            print(f"Typing Screen: docH={typing_metrics['docH']} vs winH={typing_metrics['winH']}, Vertical scroll: {typing_metrics['hasVerticalScroll']}, Body scroll: {typing_metrics['hasBodyScroll']}, kbH={typing_metrics['kbH']:.1f}px, trainerH={typing_metrics['trainerH']:.1f}px")

            # -------------------------------------------------------------
            # TEST 5: Presentation Slide Modal Overflow & Sticky Nav
            # -------------------------------------------------------------
            # Click on theory module in menu to open materials screen properly
            driver.execute_script("""
                App.showScreen('screen-menu');
                const theoryBtn = document.querySelector('.btn-module[data-module="theory"]');
                if (theoryBtn) theoryBtn.click();
            """)
            time.sleep(0.3)
            # Now click the open slides button
            driver.execute_script("""
                const btnOpen = document.querySelector('.btn-open-slides');
                if (btnOpen) btnOpen.click();
            """)
            time.sleep(0.3)
            modal_metrics = driver.execute_script("""
                const modal = document.getElementById('app-modal');
                const box = modal.querySelector('.modal-box');
                const body = modal.querySelector('.modal-body');
                const img = modal.querySelector('.slide-image');
                const nav = modal.querySelector('.slide-nav-bar');
                const notes = modal.querySelector('.slide-notes');

                const boxRect = box ? box.getBoundingClientRect() : {};
                const imgRect = img ? img.getBoundingClientRect() : {};
                const navRect = nav ? nav.getBoundingClientRect() : {};
                const notesRect = notes ? notes.getBoundingClientRect() : {};

                return {
                    modalDisplay: modal ? modal.style.display : 'none',
                    boxClientH: box ? box.clientHeight : 0,
                    boxScrollH: box ? box.scrollHeight : 0,
                    boxHasOverflow: box ? (box.scrollHeight > box.clientHeight) : false,
                    bodyClientH: body ? body.clientHeight : 0,
                    bodyScrollH: body ? body.scrollHeight : 0,
                    bodyHasOverflow: body ? (body.scrollHeight > body.clientHeight) : false,
                    imgH: imgRect.height || 0,
                    imgW: imgRect.width || 0,
                    navH: navRect.height || 0,
                    navIsSticky: nav ? (window.getComputedStyle(nav).position === 'sticky') : false,
                    notesH: notesRect.height || 0,
                    winH: window.innerHeight,
                    boxTop: boxRect.top || 0,
                    boxBottom: boxRect.bottom || 0
                };
            """)
            print(f"Modal Box: clientH={modal_metrics['boxClientH']}, scrollH={modal_metrics['boxScrollH']}, boxOverflow={modal_metrics['boxHasOverflow']}, bodyOverflow={modal_metrics['bodyHasOverflow']}, imgH={modal_metrics['imgH']:.1f}px, navSticky={modal_metrics['navIsSticky']}, notesH={modal_metrics['notesH']:.1f}px")

            results[res_key] = {
                "viewport": win_info,
                "classes": class_metrics,
                "students": student_metrics,
                "menu_4": menu_4_metrics,
                "menu_5": menu_5_metrics,
                "typing": typing_metrics,
                "modal": modal_metrics
            }

        finally:
            driver.quit()

    with open(os.path.join(WORKSPACE, ".agents", "teamwork", "explorer_m1_2", "simulation_results.json"), "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    print("\nSimulation complete! Results written to simulation_results.json")

if __name__ == "__main__":
    run_tests()
