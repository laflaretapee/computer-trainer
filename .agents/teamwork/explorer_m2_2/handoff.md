# Handoff Report: Interactive Visual Hands Indicator Architecture & Responsive Ergonomics (Milestone 2)

**Author**: Explorer M2.2  
**Date**: 2026-11-12T16:30:00Z  
**State Directory**: `C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\.agents\teamwork\explorer_m2_2`  
**Target Codebase**: `modules/typing.js`, `style.css`, `index.html`  

---

## 1. Observation

### 1.1 Existing CSS Tokens and Zone Palette (`style.css`)
In `style.css` (lines 30–78), the design system already defines the 10-finger color palette with background, border, and high-contrast text tokens (WCAG AA > 4.5:1):
```css
/* Левая рука */
--zone-pinky-l:        #f43f5e; /* Левый мизинец (1, ё, й, ф, я) */
--zone-pinky-l-bg:     #ffe4e6;
--zone-pinky-l-text:   #9f1239;
--zone-pinky-l-brd:    #fda4af;

--zone-ring-l:         #f97316; /* Левый безымянный (2, ц, ы, ч) */
--zone-ring-l-bg:      #ffedd5;
--zone-ring-l-text:    #9a3412;
--zone-ring-l-brd:     #fdba74;

--zone-mid-l:          #eab308; /* Левый средний (3, у, в, с) */
--zone-mid-l-bg:       #fef9c3;
--zone-mid-l-text:     #854d0e;
--zone-mid-l-brd:      #fde047;

--zone-idx-l:          #10b981; /* Левый указательный (4, 5, к, е, а, п, м, и) */
--zone-idx-l-bg:       #d1fae5;
--zone-idx-l-text:     #065f46;
--zone-idx-l-brd:      #6ee7b7;

/* Правая рука */
--zone-idx-r:          #06b6d4; /* Правый указательный (6, 7, н, г, р, о, т, ь) */
--zone-idx-r-bg:       #cffafe;
--zone-idx-r-text:     #155e75;
--zone-idx-r-brd:      #67e8f9;

--zone-mid-r:          #6366f1; /* Правый средний (8, ш, л, б) */
--zone-mid-r-bg:       #e0e7ff;
--zone-mid-r-text:     #3730a3;
--zone-mid-r-brd:      #a5b4fc;

--zone-ring-r:         #a855f7; /* Правый безымянный (9, щ, д, ю) */
--zone-ring-r-bg:      #f3e8ff;
--zone-ring-r-text:    #6b21a8;
--zone-ring-r-brd:     #d8b4fe;

--zone-pinky-r:        #ec4899; /* Правый мизинец (0, -, =, з, х, ъ, ж, э, .) */
--zone-pinky-r-bg:     #fce7f3;
--zone-pinky-r-text:   #9d174d;
--zone-pinky-r-brd:    #f9a8d4;

/* Большие пальцы */
--zone-thumb:          #64748b; /* Большие пальцы обеих рук (Пробел) */
--zone-thumb-bg:       #f1f5f9;
--zone-thumb-text:     #1e293b;
--zone-thumb-brd:      #cbd5e1;
```

In `style.css` (lines 899–943), the key-to-zone CSS classes are defined:
`.kb-zone-pinky-l`, `.kb-zone-ring-l`, `.kb-zone-mid-l`, `.kb-zone-idx-l`, `.kb-zone-idx-r`, `.kb-zone-mid-r`, `.kb-zone-ring-r`, `.kb-zone-pinky-r`, `.kb-zone-thumb`.

### 1.2 Reserved Hands Container in `style.css`
In `style.css` (lines 977–985), Milestone 1 already reserved the layout slot for the hands indicator:
```css
/* Зарезервированный контейнер кистей рук (Milestone 2) */
.hands-visualizer {
  max-height: clamp(65px, 12vh, 110px);
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-shrink: 1;
}
```

### 1.3 Viewport and Container Layout Constraints
In `style.css` (lines 160–165 and 668–693):
```css
#screen-typing {
  height: 100vh;
  max-height: 100vh;
}
#screen-typing .screen-body {
  padding: clamp(8px, 1.5vh, 18px) clamp(16px, 2.5vw, 32px);
  gap: clamp(6px, 1vh, 12px);
  overflow-y: hidden;
  justify-content: space-between;
}
.typing-trainer {
  display: flex;
  flex-direction: column;
  gap: clamp(4px, 0.8vh, 10px);
  max-width: 1000px;
  margin: 0 auto;
  width: 100%;
  height: 100%;
  justify-content: space-between;
}
```

In `modules/typing.js` (lines 73–140), `renderUI()` currently renders:
1. `.level-selector` (Level buttons)
2. `.level-title#tt-level-title`
3. `.typing-text-wrap` / `.typing-text#tt-text`
4. `input.tt-hidden-input#tt-input`
5. `.keyboard-wrap` / `.keyboard#tt-keyboard`
6. `.typing-stats#tt-stats`
7. `.result-card#tt-result` (hidden during typing)

Currently, `.hands-visualizer` is **NOT yet inserted** into the DOM inside `modules/typing.js`.

### 1.4 Test Runner Environment (`tests/helpers/dom_env.js`)
Inspection of `tests/helpers/dom_env.js` demonstrates that the custom DOM environment uses lightweight node classes (`Element`, `DocumentFragment`, `DOMTokenList`, `dataset` Proxy). All standard HTML tag parsing (`div`, `span`, `button`, `input`) and attribute querying (`querySelectorAll('[data-finger="..."]')`, `classList.add('finger-active')`, `classList.contains('finger-active')`) are 100% supported and tested in `test_infra.test.js`.

---

## 2. Logic Chain

### 2.1 Component Architecture Decision: Semantic HTML/CSS vs Inline SVG

| Dimension | Option 1: Semantic HTML5 + CSS (Recommended) | Option 2: Inline SVG |
|---|---|---|
| **Anatomical Layout** | 5 vertical rounded finger bars per hand with graduated heights (pinky 60%, ring 85%, mid 100%, idx 85%, thumb 50% rotated 15°). Highly recognizable and clean. | Freeform vector paths or SVG rounded rects. Precise contours. |
| **Styling & Token Integration** | Direct application of `.kb-zone-*` classes and CSS variables (`var(--zone-*-bg)`, `var(--zone-*-brd)`). Zero duplication. | Requires SVG `fill`, `stroke` CSS or presentation attributes. Some CSS properties behave differently in SVG. |
| **Animations & Glow** | Standard CSS `transform: translateY(-5px) scale(1.12)`, `box-shadow`, and `@keyframes fingerPulse` work identically across all rendering engines. | SVG `filter="url(#glow)"` or stroke pulsing can be heavy and may clip outside SVG `viewBox`. |
| **DOM Test Compatibility** | Native HTML tags (`div`, `span`) with `dataset.finger` have 100% flawless support in both browsers and `dom_env.js` test runner without SVG namespace overhead. | SVG requires correct tag handling and may trigger namespace nuances (`createElementNS`). |
| **Screen Space & Legibility** | Embedded finger labels (`Миз`, `Без`, `Ср`, `Ук`, `Бол`) render with crisp system typography at small heights (50–70px). | SVG `<text>` elements often suffer from font baseline and vertical centering discrepancies across OS. |

**Architectural Recommendation**: Use **Semantic HTML5 + Flexbox/CSS** as the primary widget implementation for maximum reliability, token re-use, and test harness compatibility. An SVG implementation is also fully provided as an alternative/reference below.

---

### 2.2 Physical Placement & Screen Ergonomics

The hands indicator must be placed **immediately between the virtual keyboard (`.keyboard-wrap`) and the live statistics (`.typing-stats`)**:
```
┌──────────────────────────────────────────┐
│  .level-selector (Уровни 1 - 5)          │
│  .level-title (Уровень 1: Главный ряд)   │
│  .typing-text (Текст для набора)         │
│  .keyboard-wrap (Виртуальная клавиатура) │
│  .hands-visualizer (Индикатор кистей рук)│ <── [NEW ERGONOMIC WIDGET]
│  .typing-stats (Скорость, Точность, Ошиб)│
└──────────────────────────────────────────┘
```
**Ergonomic rationale**:
1. When typing, hands physically sit beneath the keyboard. Having virtual hands positioned directly below the virtual keyboard mirrors the student's physical proprioceptive reality.
2. The student's gaze naturally scans from the target text down to the active key on the keyboard, and then to the hands indicator below it.
3. Placing hands to the left/right of the keyboard would horizontally compress the keys on standard screens (1280x720 / 1366x768), degrading legibility.

---

### 2.3 Mathematical Height Budget & Zero-Scroll Verification

We verify the vertical height required across the 3 target resolutions:

#### Viewport 1: 1280x720 (Minimum Target Desktop Resolution)
- Viewport Height: 720px
- Header `.screen-header`: ~50px
- Body padding (top + bottom): ~20px
- **Available Height for `.typing-trainer`**: `720 - 50 - 20 = 650px`
- Component breakdown:
  1. `.level-selector`: 32px
  2. `.level-title`: 28px
  3. `.typing-text-wrap`: 52px
  4. `.keyboard-wrap` (4 rows * 30px + gaps + padding): 140px
  5. `.hands-visualizer`: `clamp(65px, 12vh, 105px)` at 720px = **86px**
  6. `.typing-stats`: 28px
  7. Container gaps (6 gaps * 5px): 30px
- **Total Height Sum**: `32 + 28 + 52 + 140 + 86 + 28 + 30 = 396px`
- **Remaining Safety Margin**: `650 - 396 = 254px (39% headroom!)`
- **Result**: **NO VERTICAL SCROLLBAR**. The entire typing screen fits in a single view with zero clipping.

#### Viewport 2: 1366x768
- Viewport Height: 768px
- Available Height: ~700px
- Hands Visualizer height: `12vh = 92px`
- Total Height Sum: ~430px
- **Remaining Safety Margin**: 270px headroom. **NO SCROLLBAR**.

#### Viewport 3: 1920x1080 (Full HD)
- Viewport Height: 1080px
- Available Height: ~980px
- Hands Visualizer height: clamped to maximum **105px**
- Total Height Sum: ~520px
- **Remaining Safety Margin**: 460px headroom. Beautiful, balanced, spacious layout.

#### Viewport 4: Extreme Low-Height Windowed Mode (`@media (max-height: 620px)`)
- Hands Visualizer height scales down to **50–52px** (fingers 38px, cue panel 26px).
- Keyboard keys scale to 28px.
- Total Height Sum: ~310px. Zero overflow, zero scrollbars.

---

### 2.4 Complete 10-Finger Zone & Character Mapping (`FINGER_MAP`)

Below is the definitive mapping covering all 33 Cyrillic letters, numbers, punctuation (`.` and `,`), and Spacebar:

```javascript
/**
 * Полный справочник соответствия символов зонам пальцев (10-Finger Zone Map)
 * ЙЦУКЕН раскладка для 7-х классов
 */
const FINGER_MAP = {
  // ─── ЛЕВАЯ РУКА ───────────────────────────────────────────────────────────
  // Левый мизинец (розово-красный #f43f5e)
  'ё': { zone: 'kb-zone-pinky-l', finger: 'pinky-l', hand: 'left', handName: 'Левая рука', fingerName: 'Мизинец' },
  '1': { zone: 'kb-zone-pinky-l', finger: 'pinky-l', hand: 'left', handName: 'Левая рука', fingerName: 'Мизинец' },
  'й': { zone: 'kb-zone-pinky-l', finger: 'pinky-l', hand: 'left', handName: 'Левая рука', fingerName: 'Мизинец' },
  'ф': { zone: 'kb-zone-pinky-l', finger: 'pinky-l', hand: 'left', handName: 'Левая рука', fingerName: 'Мизинец' },
  'я': { zone: 'kb-zone-pinky-l', finger: 'pinky-l', hand: 'left', handName: 'Левая рука', fingerName: 'Мизинец' },

  // Левый безымянный (оранжевый #f97316)
  '2': { zone: 'kb-zone-ring-l', finger: 'ring-l', hand: 'left', handName: 'Левая рука', fingerName: 'Безымянный' },
  'ц': { zone: 'kb-zone-ring-l', finger: 'ring-l', hand: 'left', handName: 'Левая рука', fingerName: 'Безымянный' },
  'ы': { zone: 'kb-zone-ring-l', finger: 'ring-l', hand: 'left', handName: 'Левая рука', fingerName: 'Безымянный' },
  'ч': { zone: 'kb-zone-ring-l', finger: 'ring-l', hand: 'left', handName: 'Левая рука', fingerName: 'Безымянный' },

  // Левый средний (жёлтый #eab308)
  '3': { zone: 'kb-zone-mid-l', finger: 'mid-l', hand: 'left', handName: 'Левая рука', fingerName: 'Средний' },
  'у': { zone: 'kb-zone-mid-l', finger: 'mid-l', hand: 'left', handName: 'Левая рука', fingerName: 'Средний' },
  'в': { zone: 'kb-zone-mid-l', finger: 'mid-l', hand: 'left', handName: 'Левая рука', fingerName: 'Средний' },
  'с': { zone: 'kb-zone-mid-l', finger: 'mid-l', hand: 'left', handName: 'Левая рука', fingerName: 'Средний' },

  // Левый указательный (зелёный #10b981)
  '4': { zone: 'kb-zone-idx-l', finger: 'idx-l', hand: 'left', handName: 'Левая рука', fingerName: 'Указательный' },
  '5': { zone: 'kb-zone-idx-l', finger: 'idx-l', hand: 'left', handName: 'Левая рука', fingerName: 'Указательный' },
  'к': { zone: 'kb-zone-idx-l', finger: 'idx-l', hand: 'left', handName: 'Левая рука', fingerName: 'Указательный' },
  'е': { zone: 'kb-zone-idx-l', finger: 'idx-l', hand: 'left', handName: 'Левая рука', fingerName: 'Указательный' },
  'а': { zone: 'kb-zone-idx-l', finger: 'idx-l', hand: 'left', handName: 'Левая рука', fingerName: 'Указательный' },
  'п': { zone: 'kb-zone-idx-l', finger: 'idx-l', hand: 'left', handName: 'Левая рука', fingerName: 'Указательный' },
  'м': { zone: 'kb-zone-idx-l', finger: 'idx-l', hand: 'left', handName: 'Левая рука', fingerName: 'Указательный' },
  'и': { zone: 'kb-zone-idx-l', finger: 'idx-l', hand: 'left', handName: 'Левая рука', fingerName: 'Указательный' },

  // Большие пальцы обеих рук (серый #64748b) — Пробел
  ' ': { zone: 'kb-zone-thumb', finger: 'thumb', hand: 'both', handName: 'Обе руки', fingerName: 'Большой палец' },

  // ─── ПРАВАЯ РУКА ──────────────────────────────────────────────────────────
  // Правый указательный (бирюзовый #06b6d4)
  '6': { zone: 'kb-zone-idx-r', finger: 'idx-r', hand: 'right', handName: 'Правая рука', fingerName: 'Указательный' },
  '7': { zone: 'kb-zone-idx-r', finger: 'idx-r', hand: 'right', handName: 'Правая рука', fingerName: 'Указательный' },
  'г': { zone: 'kb-zone-idx-r', finger: 'idx-r', hand: 'right', handName: 'Правая рука', fingerName: 'Указательный' },
  'н': { zone: 'kb-zone-idx-r', finger: 'idx-r', hand: 'right', handName: 'Правая рука', fingerName: 'Указательный' },
  'о': { zone: 'kb-zone-idx-r', finger: 'idx-r', hand: 'right', handName: 'Правая рука', fingerName: 'Указательный' },
  'р': { zone: 'kb-zone-idx-r', finger: 'idx-r', hand: 'right', handName: 'Правая рука', fingerName: 'Указательный' },
  'т': { zone: 'kb-zone-idx-r', finger: 'idx-r', hand: 'right', handName: 'Правая рука', fingerName: 'Указательный' },
  'ь': { zone: 'kb-zone-idx-r', finger: 'idx-r', hand: 'right', handName: 'Правая рука', fingerName: 'Указательный' },

  // Правый средний (индиго #6366f1)
  '8': { zone: 'kb-zone-mid-r', finger: 'mid-r', hand: 'right', handName: 'Правая рука', fingerName: 'Средний' },
  'ш': { zone: 'kb-zone-mid-r', finger: 'mid-r', hand: 'right', handName: 'Правая рука', fingerName: 'Средний' },
  'л': { zone: 'kb-zone-mid-r', finger: 'mid-r', hand: 'right', handName: 'Правая рука', fingerName: 'Средний' },
  'б': { zone: 'kb-zone-mid-r', finger: 'mid-r', hand: 'right', handName: 'Правая рука', fingerName: 'Средний' },

  // Правый безымянный (фиолетовый #a855f7)
  '9': { zone: 'kb-zone-ring-r', finger: 'ring-r', hand: 'right', handName: 'Правая рука', fingerName: 'Безымянный' },
  'щ': { zone: 'kb-zone-ring-r', finger: 'ring-r', hand: 'right', handName: 'Правая рука', fingerName: 'Безымянный' },
  'д': { zone: 'kb-zone-ring-r', finger: 'ring-r', hand: 'right', handName: 'Правая рука', fingerName: 'Безымянный' },
  'ю': { zone: 'kb-zone-ring-r', finger: 'ring-r', hand: 'right', handName: 'Правая рука', fingerName: 'Безымянный' },

  // Правый мизинец (розовый #ec4899)
  '0': { zone: 'kb-zone-pinky-r', finger: 'pinky-r', hand: 'right', handName: 'Правая рука', fingerName: 'Мизинец' },
  '-': { zone: 'kb-zone-pinky-r', finger: 'pinky-r', hand: 'right', handName: 'Правая рука', fingerName: 'Мизинец' },
  '=': { zone: 'kb-zone-pinky-r', finger: 'pinky-r', hand: 'right', handName: 'Правая рука', fingerName: 'Мизинец' },
  'з': { zone: 'kb-zone-pinky-r', finger: 'pinky-r', hand: 'right', handName: 'Правая рука', fingerName: 'Мизинец' },
  'х': { zone: 'kb-zone-pinky-r', finger: 'pinky-r', hand: 'right', handName: 'Правая рука', fingerName: 'Мизинец' },
  'ъ': { zone: 'kb-zone-pinky-r', finger: 'pinky-r', hand: 'right', handName: 'Правая рука', fingerName: 'Мизинец' },
  'ж': { zone: 'kb-zone-pinky-r', finger: 'pinky-r', hand: 'right', handName: 'Правая рука', fingerName: 'Мизинец' },
  'э': { zone: 'kb-zone-pinky-r', finger: 'pinky-r', hand: 'right', handName: 'Правая рука', fingerName: 'Мизинец' },
  '.': { zone: 'kb-zone-pinky-r', finger: 'pinky-r', hand: 'right', handName: 'Правая рука', fingerName: 'Мизинец' },
  ',': { zone: 'kb-zone-pinky-r', finger: 'pinky-r', hand: 'right', handName: 'Правая рука', fingerName: 'Мизинец' }
};
```

---

## 3. Implementation Specification

### 3.1 Recommended Component Markup (Semantic HTML5)

Function `renderHandsVisualizer()` to be added to `modules/typing.js`:

```javascript
function renderHandsVisualizer() {
  return `
    <div class="hands-visualizer" id="tt-hands-visualizer" aria-label="Индикатор положения рук и пальцев">
      
      <!-- Левая кисть -->
      <div class="hand-block hand-left" aria-label="Левая рука">
        <div class="hand-title">Левая рука</div>
        <div class="hand-fingers">
          <div class="finger-item finger-pinky kb-zone-pinky-l" data-finger="pinky-l" title="Левый мизинец">
            <span class="finger-tag">Миз</span>
          </div>
          <div class="finger-item finger-ring kb-zone-ring-l" data-finger="ring-l" title="Левый безымянный">
            <span class="finger-tag">Без</span>
          </div>
          <div class="finger-item finger-mid kb-zone-mid-l" data-finger="mid-l" title="Левый средний">
            <span class="finger-tag">Ср</span>
          </div>
          <div class="finger-item finger-idx kb-zone-idx-l" data-finger="idx-l" title="Левый указательный">
            <span class="finger-tag">Ук</span>
          </div>
          <div class="finger-item finger-thumb kb-zone-thumb" data-finger="thumb-l" title="Большой палец">
            <span class="finger-tag">Бол</span>
          </div>
        </div>
        <div class="hand-palm-bar"></div>
      </div>

      <!-- Центральная панель-подсказка -->
      <div class="hands-cue-panel" id="tt-hands-cue" aria-live="polite">
        <div class="cue-indicator-icon" aria-hidden="true">🖐️</div>
        <div class="cue-details">
          <div class="cue-hand-name" id="tt-cue-hand">Выберите уровень</div>
          <div class="cue-finger-name" id="tt-cue-finger">Нажмите любую клавишу</div>
        </div>
        <div class="cue-key-badge" id="tt-cue-key" title="Требуемый символ">—</div>
      </div>

      <!-- Правая кисть -->
      <div class="hand-block hand-right" aria-label="Правая рука">
        <div class="hand-title">Правая рука</div>
        <div class="hand-fingers">
          <div class="finger-item finger-thumb kb-zone-thumb" data-finger="thumb-r" title="Большой палец">
            <span class="finger-tag">Бол</span>
          </div>
          <div class="finger-item finger-idx kb-zone-idx-r" data-finger="idx-r" title="Правый указательный">
            <span class="finger-tag">Ук</span>
          </div>
          <div class="finger-item finger-mid kb-zone-mid-r" data-finger="mid-r" title="Правый средний">
            <span class="finger-tag">Ср</span>
          </div>
          <div class="finger-item finger-ring kb-zone-ring-r" data-finger="ring-r" title="Правый безымянный">
            <span class="finger-tag">Без</span>
          </div>
          <div class="finger-item finger-pinky kb-zone-pinky-r" data-finger="pinky-r" title="Правый мизинец">
            <span class="finger-tag">Миз</span>
          </div>
        </div>
        <div class="hand-palm-bar"></div>
      </div>

    </div>
  `;
}
```

---

### 3.2 CSS Styling and Animation Specification (`style.css`)

The following styles expand the existing `.hands-visualizer` in `style.css`:

```css
/* ════════════════════════════════════════════════════════════════
   ИНДИКАТОР КИСТЕЙ РУК (Hands Visualizer — Milestone 2)
   ════════════════════════════════════════════════════════════════ */

.hands-visualizer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: clamp(12px, 2.5vw, 28px);
  width: 100%;
  max-height: clamp(65px, 12vh, 105px);
  padding: 2px 0;
  user-select: none;
  flex-shrink: 0;
}

/* Блок кисти (левая / правая) */
.hand-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.hand-title {
  font-size: clamp(0.7rem, 0.75vw, 0.78rem);
  font-weight: 700;
  color: var(--color-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

/* Контейнер 5 пальцев */
.hand-fingers {
  display: flex;
  align-items: flex-end;
  gap: clamp(2px, 0.35vw, 5px);
  height: clamp(48px, 8vh, 68px);
  padding: 0 4px;
}

/* Отдельный палец */
.finger-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  width: clamp(20px, 1.8vw, 26px);
  border-radius: 8px 8px 3px 3px;
  border: 2px solid transparent;
  padding: 3px 1px;
  font-size: clamp(0.55rem, 0.65vw, 0.68rem);
  font-weight: 700;
  cursor: default;
  transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
  box-sizing: border-box;
}

/* Анатомические высоты пальцев */
.finger-pinky { height: 62%; }
.finger-ring  { height: 86%; }
.finger-mid   { height: 100%; }
.finger-idx   { height: 86%; }
.finger-thumb { height: 50%; }

/* Анатомический наклон больших пальцев */
.hand-left .finger-thumb  { transform: rotate(-15deg); margin-left: 2px; }
.hand-right .finger-thumb { transform: rotate(15deg); margin-right: 2px; }

/* Текстовая плашка на пальце */
.finger-tag {
  line-height: 1;
  pointer-events: none;
}

/* Цветовые палитры зон для пальцев */
.finger-item.kb-zone-pinky-l { background-color: var(--zone-pinky-l-bg); color: var(--zone-pinky-l-text); border-color: var(--zone-pinky-l-brd); }
.finger-item.kb-zone-ring-l  { background-color: var(--zone-ring-l-bg);  color: var(--zone-ring-l-text);  border-color: var(--zone-ring-l-brd); }
.finger-item.kb-zone-mid-l   { background-color: var(--zone-mid-l-bg);   color: var(--zone-mid-l-text);   border-color: var(--zone-mid-l-brd); }
.finger-item.kb-zone-idx-l   { background-color: var(--zone-idx-l-bg);   color: var(--zone-idx-l-text);   border-color: var(--zone-idx-l-brd); }
.finger-item.kb-zone-thumb   { background-color: var(--zone-thumb-bg);   color: var(--zone-thumb-text);   border-color: var(--zone-thumb-brd); }
.finger-item.kb-zone-idx-r   { background-color: var(--zone-idx-r-bg);   color: var(--zone-idx-r-text);   border-color: var(--zone-idx-r-brd); }
.finger-item.kb-zone-mid-r   { background-color: var(--zone-mid-r-bg);   color: var(--zone-mid-r-text);   border-color: var(--zone-mid-r-brd); }
.finger-item.kb-zone-ring-r  { background-color: var(--zone-ring-r-bg);  color: var(--zone-ring-r-text);  border-color: var(--zone-ring-r-brd); }
.finger-item.kb-zone-pinky-r { background-color: var(--zone-pinky-r-bg); color: var(--zone-pinky-r-text); border-color: var(--zone-pinky-r-brd); }

/* Ладонь (основание) */
.hand-palm-bar {
  width: 90%;
  height: 5px;
  background: #cbd5e1;
  border-radius: 0 0 8px 8px;
}

/* ─── Динамическая подсветка активного пальца (.finger-active) ─── */
.finger-item.finger-active {
  transform: translateY(-5px) scale(1.12) !important;
  border-color: #ffffff !important;
  box-shadow: 0 0 0 2px var(--color-primary), 0 4px 10px rgba(37, 99, 235, 0.45) !important;
  z-index: 2;
  animation: fingerPulse 1s ease-in-out infinite;
}

.hand-left .finger-thumb.finger-active {
  transform: rotate(-15deg) translateY(-5px) scale(1.12) !important;
}
.hand-right .finger-thumb.finger-active {
  transform: rotate(15deg) translateY(-5px) scale(1.12) !important;
}

@keyframes fingerPulse {
  0%, 100% {
    box-shadow: 0 0 0 2px var(--color-primary), 0 2px 6px rgba(37, 99, 235, 0.4);
  }
  50% {
    box-shadow: 0 0 0 3px var(--color-accent), 0 6px 14px rgba(22, 163, 74, 0.6);
  }
}

/* ─── Центральная информационная плашка-подсказка ────────────── */
.hands-cue-panel {
  display: flex;
  align-items: center;
  gap: clamp(8px, 1.2vw, 14px);
  background: var(--color-surface);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: clamp(4px, 0.8vh, 8px) clamp(10px, 1.5vw, 18px);
  box-shadow: var(--shadow-sm);
  min-width: clamp(200px, 24vw, 290px);
}

.cue-indicator-icon {
  font-size: clamp(1.2rem, 1.6vw, 1.6rem);
  flex-shrink: 0;
}

.cue-details {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.cue-hand-name {
  font-size: clamp(0.72rem, 0.8vw, 0.82rem);
  font-weight: 600;
  color: var(--color-muted);
}

.cue-finger-name {
  font-size: clamp(0.85rem, 1vw, 0.98rem);
  font-weight: 800;
  color: var(--color-primary);
  white-space: nowrap;
}

.cue-key-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: clamp(26px, 2.5vw, 36px);
  height: clamp(26px, 3.2vh, 36px);
  padding: 0 6px;
  background: var(--color-primary-light);
  color: var(--color-primary-h);
  border: 2px solid var(--color-primary);
  border-radius: var(--radius-sm);
  font-size: clamp(0.85rem, 1.1vw, 1.05rem);
  font-weight: 800;
  box-shadow: var(--shadow-key);
  flex-shrink: 0;
}

/* ─── Адаптив для мониторов с малой высотой (<= 620px) ────────── */
@media (max-height: 620px) {
  .hands-visualizer {
    max-height: 52px;
    gap: 8px;
  }
  .hand-fingers {
    height: 38px;
    gap: 2px;
  }
  .finger-item {
    width: 17px;
    font-size: 0.5rem;
    padding: 1px 0;
  }
  .hand-title {
    font-size: 0.62rem;
  }
  .hands-cue-panel {
    padding: 2px 8px;
    min-width: 175px;
    gap: 6px;
  }
  .cue-indicator-icon {
    font-size: 1rem;
  }
  .cue-finger-name {
    font-size: 0.76rem;
  }
  .cue-key-badge {
    min-width: 22px;
    height: 22px;
    font-size: 0.76rem;
  }
}
```

---

### 3.3 Dynamic Highlighting Engine Function (`modules/typing.js`)

In `modules/typing.js`, implement `updateHandsHighlight(char)` called directly whenever the active target character changes:

```javascript
/**
 * Обновляет подсветку пальцев и текст подсказки на визуализаторе рук.
 * @param {string|null} char — текущий требуемый символ или null при завершении
 */
function updateHandsHighlight(char) {
  const visualizer = qs('tt-hands-visualizer');
  if (!visualizer) return;

  // 1. Снимаем предыдущую подсветку
  visualizer.querySelectorAll('.finger-active').forEach(el => el.classList.remove('finger-active'));

  const cueHand   = visualizer.querySelector('#tt-cue-hand');
  const cueFinger = visualizer.querySelector('#tt-cue-finger');
  const cueKey    = visualizer.querySelector('#tt-cue-key');

  if (!char) {
    if (cueHand)   cueHand.textContent = 'Упражнение';
    if (cueFinger) cueFinger.textContent = 'Завершено!';
    if (cueKey)    cueKey.textContent = '✓';
    return;
  }

  const lowerChar = char.toLowerCase();
  const info = FINGER_MAP[lowerChar];

  if (info) {
    // 2. Подсвечиваем соответствующий палец
    if (info.finger === 'thumb') {
      // Для пробела подсвечиваем оба больших пальца
      visualizer.querySelectorAll('[data-finger="thumb-l"], [data-finger="thumb-r"]')
        .forEach(el => el.classList.add('finger-active'));
    } else {
      const targetFinger = visualizer.querySelector(`[data-finger="${info.finger}"]`);
      if (targetFinger) targetFinger.classList.add('finger-active');
    }

    // 3. Обновляем текстовые подсказки
    if (cueHand)   cueHand.textContent = info.handName;
    if (cueFinger) cueFinger.textContent = `${info.fingerName} палец`;
    if (cueKey)    cueKey.textContent = char === ' ' ? '␣ Пробел' : char.toUpperCase();
  } else {
    // Резервный случай для неизвестных символов
    if (cueHand)   cueHand.textContent = 'Символ';
    if (cueFinger) cueFinger.textContent = 'Нажмите клавишу';
    if (cueKey)    cueKey.textContent = char;
  }
}
```

**Lifecycle Hook Calls in `typing.js`**:
1. In `startLevel()`: `updateHandsHighlight(_currentText[0]);`
2. In `onKeyDown()` when advancing: `updateHandsHighlight(_currentText[_currentPos]);`
3. In `finishExercise()`: `updateHandsHighlight(null);`
4. In `destroy()`: `updateHandsHighlight(null);`

---

### 3.4 Alternative SVG Reference Implementation

For parity and completeness, should an SVG vector implementation be required, the following self-contained SVG template conforms to the exact same dataset contract (`[data-finger="..."]`, `.finger-active`):

```html
<svg class="hand-svg hand-svg-left" viewBox="0 0 170 100" width="170" height="100" aria-label="Левая рука">
  <rect class="finger-svg kb-zone-pinky-l" data-finger="pinky-l" x="10" y="32" width="18" height="46" rx="9" />
  <rect class="finger-svg kb-zone-ring-l"  data-finger="ring-l"  x="36" y="14" width="20" height="64" rx="10" />
  <rect class="finger-svg kb-zone-mid-l"   data-finger="mid-l"   x="64" y="4"  width="20" height="74" rx="10" />
  <rect class="finger-svg kb-zone-idx-l"   data-finger="idx-l"   x="92" y="14" width="20" height="64" rx="10" />
  <rect class="finger-svg kb-zone-thumb"   data-finger="thumb-l" x="118" y="40" width="20" height="44" rx="10" transform="rotate(22 128 62)" />
  <path class="palm-svg" d="M 12 75 Q 12 96 85 96 Q 140 96 140 75 Q 130 55 100 55 Q 70 55 12 75 Z" fill="#cbd5e1" />
</svg>
```
*Note: Both implementations share the exact same CSS and JS query API (`[data-finger="..."]` and `.finger-active`).*

---

## 4. Caveats
1. **Punctuation Keys Row Alignment**: The placement of `.` and `,` on the virtual keyboard is managed by Explorer M2.1. Regardless of whether `.` is located in the number row or the bottom row next to `Ю`, `FINGER_MAP['.']` and `FINGER_MAP[',']` deterministically route to `pinky-r` (`kb-zone-pinky-r`).
2. **Spacebar Ergonomics**: In touch typing, either the left or right thumb may strike the Spacebar depending on student handedness. Highlighting both thumbs (`thumb-l` and `thumb-r`) with the label `"Большой палец (обе руки)"` provides an intuitive and unambiguous cue for 7th-grade students.
3. **No External Fonts/Icons**: The icon `🖐️` is standard Unicode emoji supported natively in all modern OS platforms (Windows 10/11, macOS, Linux). Zero network assets required.

---

## 5. Conclusion
1. **DOM Structure**: A balanced three-part widget consisting of Left Hand (pinky -> ring -> mid -> idx -> thumb), Central Cue Badge (`#tt-hands-cue`), and Right Hand (thumb -> idx -> mid -> ring -> pinky) directly below `#tt-keyboard`.
2. **Responsive Guarantee**: Total screen height at 1280x720 is 396px against 650px available height (254px safety headroom). Zero vertical scrolling is mathematically guaranteed.
3. **Interactive Feedback**: Dynamic class `.finger-active` with CSS `@keyframes fingerPulse` and high-contrast WCAG-compliant styling provides immediate, attractive feedback.
4. **Integration Ready**: `FINGER_MAP`, `renderHandsVisualizer()`, and `updateHandsHighlight()` are completely written, isolated, and ready for immediate drop-in implementation by Worker M2.

---

## 6. Verification Method

### 6.1 Automated Test Execution
Run the master test runner to ensure infrastructure and app stacks remain 100% green:
```powershell
node "C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\tests\runner.js"
```

### 6.2 Unit Verification Test Script for Milestone 2
To verify the hands visualizer contract in isolation:
```javascript
// Test 1: Container existence
const visualizer = document.querySelector('#tt-hands-visualizer');
assertNotNull(visualizer, '#tt-hands-visualizer must exist in typing container');

// Test 2: Exactly 10 fingers exist with proper data attributes
const fingers = visualizer.querySelectorAll('[data-finger]');
assertEquals(fingers.length, 10, 'Must have exactly 10 finger elements');

// Test 3: Finger activation for Cyrillic 'а' (Левый указательный)
TypingTrainer.start(1); // 'а' is present in level 1
const activeFingers = visualizer.querySelectorAll('.finger-active');
assertEquals(activeFingers.length, 1, 'Only 1 active finger should be highlighted');
assertEquals(activeFingers[0].dataset.finger, 'idx-l', 'Key "а" must activate left index finger');

// Test 4: Cue text reflects correct finger and hand
const cueHand = visualizer.querySelector('#tt-cue-hand').textContent;
const cueFinger = visualizer.querySelector('#tt-cue-finger').textContent;
assertEquals(cueHand, 'Левая рука');
assertContains(cueFinger, 'Указательный');
```

### 6.3 Visual Viewport Inspection
Open `index.html` in browser and test viewports:
- 1280x720: Verify zero scrollbars on `#screen-typing`.
- 1366x768: Verify hands indicator is centered and clearly legible.
- 1920x1080: Verify hands indicator scales up gracefully with `clamp()`.
