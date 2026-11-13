# Handoff Report — Explorer M2.1: Touch Typing Ergonomics, Keyboard Layout, Punctuation & Zone Mapping

**Date**: 2026-11-12  
**Milestone**: M2 (Touch Typing Ergonomics & Hands Visualizer)  
**Author**: Explorer M2.1 (`explorer_m2_1`)  
**Target Recipient**: Worker M2.2 (`worker_m2_2`) / Sub-Orchestrator M2 (`sub_orch_m2`)

---

## 1. Observation

Direct code examination of `modules/typing.js`, `style.css`, `index.html`, and existing test suites reveals the following exact facts:

### 1.1 Existing Keyboard Layout & Key Generation in `modules/typing.js`
- **Lines 34–38**:
  ```javascript
  const KB_ROWS = [
    ['й','ц','у','к','е','н','г','ш','щ','з','х','ъ'],
    ['ф','ы','в','а','п','р','о','л','д','ж','э'],
    ['я','ч','с','м','и','т','ь','б','ю']
  ];
  ```
  - Row 1: 12 keys (`й` to `ъ`).
  - Row 2: 11 keys (`ф` to `э`).
  - Row 3: 9 keys (`я` to `ю`). Punctuation keys (`.` and `,`) are **completely missing**.
  - No number row (digits 0–9) exists.
- **Lines 146–161 (`renderKeyboard`)**:
  ```javascript
  function renderKeyboard() {
    let html = '';
    KB_ROWS.forEach((row, rowIndex) => {
      const offsetClass = rowIndex === 1 ? 'kb-row-offset-1' : rowIndex === 2 ? 'kb-row-offset-2' : '';
      html += `<div class="kb-row ${offsetClass}">`;
      row.forEach(key => {
        html += `<div class="kb-key" data-key="${key}">${key.toUpperCase()}</div>`;
      });
      html += `</div>`;
    });
    // Пробел
    html += `<div class="kb-row kb-row-space">
      <div class="kb-key kb-space" data-key=" ">Пробел</div>
    </div>`;
    return html;
  }
  ```
  - **No `.kb-zone-*` finger zone classes are assigned to keys.** All keys render as uncolored `.kb-key`.
  - The spacebar renders as `<div class="kb-key kb-space" data-key=" ">` without finger zone class.
- **Lines 321–333 (`highlightNextKey`) and Lines 304–319 (`flashKey`)**:
  ```javascript
  function highlightNextKey() {
    const kb = qs('tt-keyboard');
    if (!kb) return;
    kb.querySelectorAll('.key-next').forEach(k => k.classList.remove('key-next'));
    if (_currentPos >= _currentText.length) return;
    const nextChar = _currentText[_currentPos].toLowerCase();
    const keyEl = kb.querySelector(`[data-key="${nextChar}"]`);
    if (keyEl) keyEl.classList.add('key-next');
  }
  ```
  - Relies on direct query selector concatenation: `kb.querySelector('[data-key="' + nextChar + '"]')`.
  - When `nextChar` is `.` (present in Level 5 sentences), `keyEl` is `null` because `.` is absent from `KB_ROWS`.
  - When `nextChar` is `,`, `keyEl` is `null`.
  - If a selector contains special characters or unescaped characters, `querySelector` fails or throws.

### 1.2 Finger Zone Palette and CSS Classes in `style.css`
- **Lines 30–78**: The 10-finger color palette is already declared with WCAG AA contrast tokens:
  ```css
  /* Левая рука */
  --zone-pinky-l:        #f43f5e; /* Левый мизинец (1, ё, й, ф, я) */
  --zone-ring-l:         #f97316; /* Левый безымянный (2, ц, ы, ч) */
  --zone-mid-l:          #eab308; /* Левый средний (3, у, в, с) */
  --zone-idx-l:          #10b981; /* Левый указательный (4, 5, к, е, а, п, м, и) */

  /* Правая рука */
  --zone-idx-r:          #06b6d4; /* Правый указательный (6, 7, н, г, р, о, т, ь) */
  --zone-mid-r:          #6366f1; /* Правый средний (8, ш, л, б) */
  --zone-ring-r:         #a855f7; /* Правый безымянный (9, щ, д, ю) */
  --zone-pinky-r:        #ec4899; /* Правый мизинец (0, -, =, з, х, ъ, ж, э, .) */

  /* Большие пальцы */
  --zone-thumb:          #64748b; /* Большие пальцы обеих рук (Пробел) */
  ```
- **Lines 899–943**: CSS rules for `.kb-zone-*` are fully defined:
  `.kb-zone-pinky-l`, `.kb-zone-ring-l`, `.kb-zone-mid-l`, `.kb-zone-idx-l`,
  `.kb-zone-idx-r`, `.kb-zone-mid-r`, `.kb-zone-ring-r`, `.kb-zone-pinky-r`, `.kb-zone-thumb`.
- **Lines 946–967**: Key highlight states defined:
  - `.kb-key.key-next, .key.key-next`: Amber pulsing target key (`animation: keyPulse 1s ease-in-out infinite`).
  - `.kb-key.key-active, .key.key-active`: Blue pressed key feedback.
- **Lines 978–985**: Reserved hands container:
  ```css
  .hands-visualizer {
    max-height: clamp(65px, 12vh, 110px);
    width: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    flex-shrink: 1;
  }
  ```
  *(Note: Specific finger styling `.finger-active` is not yet defined in `style.css`.)*
- **Viewport Constraints (`tests/test_m1_design_system.py:177-178`)**:
  - `typing_measurements['hasDocScroll'] == False` (zero scrollbars on 1280x720, 1366x768, 1920x1080).
  - `typing_measurements['kbHeight'] < 300px`.

### 1.3 Character Audit across all 5 Levels in `typing.js`
The full character inventory from `LEVELS` in `modules/typing.js:10-31` is:
- Level 1 (`keys: 'ФЫВАПРОЛДЖ'`): `а`, `в`, `д`, `ж`, `л`, `о`, `п`, `р`, `ф`, `ы`, ` ` (space)
- Level 2 (`keys: 'ЙЦУКЕНГШЩЗХ'`): `г`, `е`, `з`, `й`, `к`, `н`, `у`, `х`, `ц`, `ш`, `щ`, ` ` (space)
- Level 3 (`keys: 'ЯЧСМИТЬБЮ'`): `б`, `и`, `м`, `с`, `т`, `ч`, `ь`, `ю`, `я`, ` ` (space)
- Level 4 (`Слова`): All lowercase Russian letters above + ` ` (space)
- Level 5 (`Предложения`):
  - `'Мама мыла раму.'`
  - `'Кот сидит на диване.'`
  - `'Я учусь в седьмом классе.'`
  - Characters: Letters, space, **capital letters (`М`, `К`, `Я`)**, and **period (`.`)**.
  - **Comma (`,`) is not present in existing Level 5 texts**, despite Requirement F7 demanding punctuation support for both `.` and `,`.

### 1.4 Real-Time Metrics & Contract State
- In `modules/typing.js:106-110`: `#tt-stats` contains `#tt-speed`, `#tt-accuracy`, and `#tt-time`. **`#tt-errors` does not exist.**
- In `modules/typing.js:409-418`: `finishExercise()` sends `{ speed, accuracy, level, duration, date }` to `App.saveProgress()`. The `errors` count is missing from the payload.
- In `PROJECT.md:72-74` and `SCOPE.md:41-43`: Contract requires `TypingTrainer.finishSession()` emitting:
  `{ speed: number, accuracy: number, errors: number, level: number, duration: number, date: string }`.

---

## 2. Logic Chain

1. **Zone Mapping Alignment**:
   `style.css` lines 32–78 explicitly bind each Russian letter and symbol to an anatomical finger zone.
   - `pinky-l`: `й`, `ф`, `я`
   - `ring-l`: `ц`, `ы`, `ч`
   - `mid-l`: `у`, `в`, `с`
   - `idx-l`: `к`, `е`, `а`, `п`, `м`, `и`
   - `idx-r`: `н`, `г`, `р`, `о`, `т`, `ь`
   - `mid-r`: `ш`, `л`, `б`
   - `ring-r`: `щ`, `д`, `ю`
   - `pinky-r`: `з`, `х`, `ъ`, `ж`, `э`, `.` (and `,`)
   - `thumb`: space bar (` `)
   Attaching `.kb-zone-*` to every key element in DOM will instantly activate the WCAG AA color scheme without altering layout.

2. **Vertical Budget & Keyboard Rows**:
   Adding a number row (digits 0–9) would increase keyboard rows from 4 to 5. `test_m1_design_system.py` mandates `kbHeight < 300px` and no scrollbars on 1280x720. A 3-letter-row layout with spacebar occupies ~210px, leaving ample headroom for `.hands-visualizer` (65–110px) and `.typing-stats`. Thus, keeping 3 letter rows + 1 space row preserves responsive compliance.

3. **Punctuation Key Placement (`.` and `,`)**:
   In the standard Russian PC keyboard layout, the key to the right of `ю` in the bottom row produces `.` (unshifted) and `,` (with Shift).
   Adding `.` as the 10th key of Row 3 (`['я','ч','с','м','и','т','ь','б','ю','.']`) mirrors real keyboards and balances row lengths:
   - Row 1: 12 keys
   - Row 2: 11 keys
   - Row 3: 10 keys
   - Row 4: Space bar
   Since this key is operated by the right pinky, it receives `.kb-zone-pinky-r`, matching `style.css:68`.

4. **Comma (`,`) Character Resolution**:
   When Level 5 text requires `,`, the physical key to press is the `.` key (with Shift).
   Mapping `,` to the `.` key via an alias map `CHAR_TO_KEY = { ',': '.' }` ensures:
   - `getKeyElement(',')` returns the `.` DOM element.
   - `highlightNextKey()` highlights the `.` key without returning `null`.
   - `flashKey(',')` flashes the `.` key upon keydown.

5. **Eliminating `querySelector` DOM Exceptions**:
   Naive query selector concatenation `[data-key="${nextChar}"]` fails when `nextChar` is unescaped or absent.
   The robust solution is a 2-tier lookup:
   - Tier 1: In-memory `Map` (`_keyElementsMap`) built once during `renderKeyboard()`, mapping lowercase chars, uppercase chars, punctuation, and aliases directly to their DOM elements.
   - Tier 2: Safe selector helper with `CSS.escape()` and null checking: `kb.querySelector('[data-key="' + CSS.escape(char) + '"]')`.
   This guarantees zero runtime exceptions.

6. **Error Tracking & Live Counter**:
   Adding `<span class="stat-item">⚠️ Ошибки: <strong id="tt-errors">0</strong></span>` to `#tt-stats` and tracking `_errorCount` fulfills Requirement F7.
   Exporting `errors: _errorCount` in `TypingTrainer.finishSession()` satisfies the M2 ↔ M4 contract.

---

## 3. Caveats

1. **Shift Key Indication**:
   For uppercase letters (`'М'`, `'К'`, `'Я'`) and `,`, the student presses Shift on their physical keyboard. The trainer highlights the primary character key (`.` for comma, `м` for `М`). The hands visualizer can either highlight the primary typing finger, or both the primary finger and the opposite Shift pinky. Highlighting the primary finger is recommended as the baseline.
2. **Missing Comma Texts in Level 5**:
   Existing `LEVELS[4].texts` only contains periods (`.`). To exercise `,`, Level 5 texts should include sample sentences with commas (e.g. `'Быстро, чётко и без ошибок.'`, `'Ученик учится, а учитель учит.'`).
3. **Hands Visualizer CSS**:
   `.hands-visualizer` container exists in `style.css`, but `.finger-active` and internal finger SVG/DOM styling must be included in `style.css` or embedded in `typing.js` SVG markup.

---

## 4. Conclusion & Concrete Implementation Specifications

Worker M2.2 should implement the following concrete specifications in `modules/typing.js` and `style.css`:

### 4.1 Definitive 34-Key Layout & Zone Mapping Table

```javascript
const KB_LAYOUT = [
  // Ряд 1: Верхний ряд (12 клавиш)
  [
    { key: 'й', label: 'Й', zone: 'pinky-l' },
    { key: 'ц', label: 'Ц', zone: 'ring-l' },
    { key: 'у', label: 'У', zone: 'mid-l' },
    { key: 'к', label: 'К', zone: 'idx-l' },
    { key: 'е', label: 'Е', zone: 'idx-l' },
    { key: 'н', label: 'Н', zone: 'idx-r' },
    { key: 'г', label: 'Г', zone: 'idx-r' },
    { key: 'ш', label: 'Ш', zone: 'mid-r' },
    { key: 'щ', label: 'Щ', zone: 'ring-r' },
    { key: 'з', label: 'З', zone: 'pinky-r' },
    { key: 'х', label: 'Х', zone: 'pinky-r' },
    { key: 'ъ', label: 'Ъ', zone: 'pinky-r' }
  ],
  // Ряд 2: Главный / Домашний ряд (11 клавиш)
  [
    { key: 'ф', label: 'Ф', zone: 'pinky-l' },
    { key: 'ы', label: 'Ы', zone: 'ring-l' },
    { key: 'в', label: 'В', zone: 'mid-l' },
    { key: 'а', label: 'А', zone: 'idx-l', isHome: true }, // тактильная засечка
    { key: 'п', label: 'П', zone: 'idx-l' },
    { key: 'р', label: 'Р', zone: 'idx-r' },
    { key: 'о', label: 'О', zone: 'idx-r', isHome: true }, // тактильная засечка
    { key: 'л', label: 'Л', zone: 'mid-r' },
    { key: 'д', label: 'Д', zone: 'ring-r' },
    { key: 'ж', label: 'Ж', zone: 'pinky-r' },
    { key: 'э', label: 'Э', zone: 'pinky-r' }
  ],
  // Ряд 3: Нижний ряд (10 клавиш, включая . и ,)
  [
    { key: 'я', label: 'Я', zone: 'pinky-l' },
    { key: 'ч', label: 'Ч', zone: 'ring-l' },
    { key: 'с', label: 'С', zone: 'mid-l' },
    { key: 'м', label: 'М', zone: 'idx-l' },
    { key: 'и', label: 'И', zone: 'idx-l' },
    { key: 'т', label: 'Т', zone: 'idx-r' },
    { key: 'ь', label: 'Ь', zone: 'idx-r' },
    { key: 'б', label: 'Б', zone: 'mid-r' },
    { key: 'ю', label: 'Ю', zone: 'ring-r' },
    { key: '.', label: '. ,', alt: ',', zone: 'pinky-r' }
  ]
];

// Ряд 4: Пробел
const KB_SPACE = { key: ' ', label: 'Пробел', zone: 'thumb' };

// Маппинг символов на базовые клавиши
const CHAR_TO_KEY_MAP = {
  ',': '.',
  '—': '-',
  '–': '-'
};
```

### 4.2 DOM Markup Specification for Keys
Each key element rendered in `renderKeyboard()`:
```html
<!-- Обычная клавиша -->
<div class="kb-key kb-zone-idx-l"
     data-key="а"
     data-key-char="а"
     data-finger-zone="idx-l">А</div>

<!-- Клавиша с тактильной засечкой (Home Key) -->
<div class="kb-key kb-zone-idx-l kb-home-key"
     data-key="а"
     data-key-char="а"
     data-finger-zone="idx-l"
     title="Опорная клавиша (левый указательный палец)">А</div>

<!-- Клавиша пунктуации (. и ,) -->
<div class="kb-key kb-zone-pinky-r"
     data-key="."
     data-key-char="."
     data-alt=","
     data-finger-zone="pinky-r"
     title="Точка / Запятая (Shift)">. ,</div>

<!-- Пробел -->
<div class="kb-key kb-space kb-zone-thumb"
     data-key=" "
     data-key-char=" "
     data-finger-zone="thumb">Пробел</div>
```

### 4.3 Safe Key Lookup Architecture
```javascript
let _keyElementsMap = new Map();

function buildKeyMap(container) {
  _keyElementsMap.clear();
  container.querySelectorAll('.kb-key').forEach(el => {
    const k = el.dataset.key;
    if (k) {
      _keyElementsMap.set(k, el);
      _keyElementsMap.set(k.toUpperCase(), el);
    }
    const alt = el.dataset.alt;
    if (alt) {
      _keyElementsMap.set(alt, el);
    }
  });
}

function getKeyElement(char) {
  if (!char) return null;
  // 1. Direct map lookup
  if (_keyElementsMap.has(char)) return _keyElementsMap.get(char);
  // 2. Lowercase lookup
  const lower = char.toLowerCase();
  if (_keyElementsMap.has(lower)) return _keyElementsMap.get(lower);
  // 3. Alias map lookup (e.g. ',' -> '.')
  const mapped = CHAR_TO_KEY_MAP[char] || CHAR_TO_KEY_MAP[lower];
  if (mapped && _keyElementsMap.has(mapped)) return _keyElementsMap.get(mapped);
  // 4. Safe DOM query fallback
  const kb = qs('tt-keyboard');
  if (!kb) return null;
  try {
    return kb.querySelector(`[data-key="${CSS.escape(char)}"], [data-key="${CSS.escape(lower)}"], [data-alt="${CSS.escape(char)}"]`);
  } catch {
    return null;
  }
}
```

### 4.4 Hands Visualizer Markup & Integration
Inside `<div class="keyboard-wrap">` (or adjacent to it):
```html
<div class="hands-visualizer" id="tt-hands" aria-hidden="true">
  <!-- Левая рука -->
  <div class="hand hand-left">
    <div class="finger finger-pinky-l kb-zone-pinky-l" data-finger="pinky-l" title="Левый мизинец"></div>
    <div class="finger finger-ring-l kb-zone-ring-l" data-finger="ring-l" title="Левый безымянный"></div>
    <div class="finger finger-mid-l kb-zone-mid-l" data-finger="mid-l" title="Левый средний"></div>
    <div class="finger finger-idx-l kb-zone-idx-l" data-finger="idx-l" title="Левый указательный"></div>
    <div class="finger finger-thumb-l kb-zone-thumb" data-finger="thumb" title="Левый большой"></div>
  </div>
  <!-- Правая рука -->
  <div class="hand hand-right">
    <div class="finger finger-thumb-r kb-zone-thumb" data-finger="thumb" title="Правый большой"></div>
    <div class="finger finger-idx-r kb-zone-idx-r" data-finger="idx-r" title="Правый указательный"></div>
    <div class="finger finger-mid-r kb-zone-mid-r" data-finger="mid-r" title="Правый средний"></div>
    <div class="finger finger-ring-r kb-zone-ring-r" data-finger="ring-r" title="Правый безымянный"></div>
    <div class="finger finger-pinky-r kb-zone-pinky-r" data-finger="pinky-r" title="Правый мизинец"></div>
  </div>
</div>
```
When `highlightNextKey()` activates:
```javascript
// 1. Убираем прошлые подсветки
kb.querySelectorAll('.key-next, .active').forEach(k => k.classList.remove('key-next', 'active'));
const hands = qs('tt-hands');
if (hands) hands.querySelectorAll('.finger-active').forEach(f => f.classList.remove('finger-active'));

// 2. Находим текущую клавишу и палец
const keyEl = getKeyElement(nextChar);
if (keyEl) {
  keyEl.classList.add('key-next', 'active');
  const zone = keyEl.dataset.fingerZone;
  if (hands && zone) {
    const fingerEls = hands.querySelectorAll(`[data-finger="${zone}"]`);
    fingerEls.forEach(f => f.classList.add('finger-active'));
  }
}
```

### 4.5 Finger Active Styling for `style.css`
```css
/* Подсветка активного пальца на визуализаторе рук */
.finger-active {
  box-shadow: 0 0 0 3px var(--color-warn), 0 0 10px rgba(249, 115, 22, 0.6) !important;
  transform: translateY(-3px) scale(1.08);
  filter: brightness(1.15);
  transition: all 0.12s ease;
  z-index: 5;
}
```

### 4.6 Metrics, Error Tracking & M2 ↔ M4 Contract
1. **Stats Bar**: Add `#tt-errors` counter:
   ```html
   <div class="typing-stats" id="tt-stats">
     <span class="stat-item">⚡ Скорость: <strong id="tt-speed">0</strong> сим/мин</span>
     <span class="stat-item">🎯 Точность: <strong id="tt-accuracy">100</strong>%</span>
     <span class="stat-item">⚠️ Ошибки: <strong id="tt-errors">0</strong></span>
     <span class="stat-item">⏱ Время: <strong id="tt-time">0:00</strong></span>
   </div>
   ```
2. **Result Card**: Add `#tt-res-errors`.
3. **Session Completion**:
   ```javascript
   function finishSession() {
     const elapsedSeconds = _startTime ? Math.round((Date.now() - _startTime) / 1000) : 0;
     const minutes = elapsedSeconds / 60;
     const speed = minutes > 0 ? Math.round(_correctChars / minutes) : 0;
     const accuracy = _totalKeystrokes > 0 ? Math.round(_correctChars / _totalKeystrokes * 100) : 100;

     const result = {
       speed: speed,
       accuracy: accuracy,
       errors: _errorCount,
       level: _currentLevel ? _currentLevel.id : 1,
       duration: elapsedSeconds,
       date: new Date().toLocaleDateString('ru-RU')
     };

     if (typeof App !== 'undefined' && App.saveProgress && App.state && App.state.currentStudent) {
       App.saveProgress(App.state.currentStudent.id, 'typing', result);
     }
     return result;
   }
   ```
4. Expose `finishSession` on `window.TypingTrainer`.

---

## 5. Verification Method

To independently verify these findings and specifications:

1. **Verify Existing Infra Test Suite**:
   Execute the standalone infrastructure test runner:
   ```powershell
   node tests/runner.js
   ```
   *Expected result*: 45 tests pass cleanly in ~0.28s.
2. **Verify CSS Classes in `style.css`**:
   Check definitions for zone classes and containers:
   ```powershell
   Select-String -Path "style.css" -Pattern "\.kb-zone-|\.hands-visualizer|\.key-next"
   ```
   *Expected result*: All 9 zone classes, `.hands-visualizer`, and `.key-next` exist.
3. **Verify Character Coverage**:
   Run node snippet to confirm character inventory:
   ```powershell
   node -e "const t = ['Мама мыла раму.', 'Кот сидит на диване.', 'Я учусь в седьмом классе.']; console.log(new Set(t.join('')));"
   ```
   *Expected result*: Contains `.` and uppercase Cyrillic letters.
4. **Invalidation Conditions**:
   - If adding `.kb-zone-*` classes expands keyboard dimensions causing vertical scrollbars on 1280x720 (`typing_measurements['hasDocScroll'] == true`), the layout must be adjusted using smaller padding/clamp tokens.
   - If `getKeyElement('.')` returns `null`, the key DOM rendering is invalid.
