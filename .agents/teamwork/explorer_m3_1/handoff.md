# Handoff Report: Mouse Trainer Architecture & Exercise Engine Specification

**State Folder**: `C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\.agents\teamwork\explorer_m3_1`  
**Milestone**: Milestone 3 — Interactive Mouse Trainer & Informatics Tasks  
**Author**: Explorer 1 (`explorer_m3_1`)  
**Target Recipient**: Sub-orchestrator M3 (`d063fc93-1f0b-4efb-8a65-441b7294bfd3`) / Worker M3  

---

## 1. Observation

Direct observations from examining the codebase, runtime environment, test framework, and architectural contracts:

1. **Absence of Mouse Trainer Implementation**:
   - Command: `Test-Path "C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\modules\mouse.js"` returned `False`.
   - Command: `Select-String -Path "C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\style.css" -Pattern "mouse"` returned 0 matches.
   - `modules/mouse.js` is currently completely absent. This is a clean-slate greenfield implementation.

2. **Reference Module Pattern in `modules/typing.js`**:
   - `modules/typing.js:6-8`: Uses an IIFE wrapper `(function () { 'use strict'; ... })();`.
   - `modules/typing.js:41-51`: Encapsulates module-scoped state (`_container`, `_currentLevel`, `_startTime`, `_timerInterval`).
   - `modules/typing.js:69-144`: Provides `renderUI(containerId)` with template literals rendering level selector, title, workspace, HUD statistics, and a hidden `.result-card` with retry, next, and menu buttons.
   - `modules/typing.js:409-418`: Integrates with `App.saveProgress` checking `typeof App !== 'undefined' && App.saveProgress && App.state && App.state.currentStudent`.
   - `modules/typing.js:430-458`: Exposes public API on `window.TypingTrainer = { init(containerId), start(level), destroy() }`.

3. **Application Routing & Progress Storage in `app.js`**:
   - `app.js:19-30`: `SCREENS` array holds all screen IDs (`screen-login`, `screen-class`, `screen-student`, `screen-teacher-login`, `screen-menu`, `screen-typing`, `screen-materials`, `screen-tests`, `screen-results`, `screen-teacher`). Currently, `screen-mouse` is absent.
   - `app.js:71-105`: `saveProgress(studentId, module, data)` manages `trainer_progress` in `localStorage`. Currently handles `typing` and `tests`.
   - `app.js:668-687`: Menu button binding handles `data-module="typing"`, `theory`, `test`, `stats`. `data-module="mouse"` needs to be wired to `showScreen('screen-mouse')` and `MouseTrainer.init('mouse-container')`.
   - `app.js:690-701`: Back button handler calls module `destroy()` when navigating back from an active exercise.

4. **Document Layout in `index.html`**:
   - `index.html:107-128`: `.module-grid` inside `#screen-menu` currently has 4 cards (`typing`, `theory`, `test`, `stats`). Needs 5th card: `<button class="btn btn-module" data-module="mouse">`.
   - `index.html:135-145`: Reference container pattern for screens:
     ```html
     <div id="screen-mouse" class="screen">
       <div class="screen-header">
         <button class="btn btn-back" data-back="screen-menu">← В меню</button>
         <h2 class="screen-title">Тренажёр мыши</h2>
       </div>
       <div class="screen-body">
         <div id="mouse-container" class="module-container"></div>
       </div>
     </div>
     ```
   - `index.html:211-216`: Scripts included at bottom:
     `data/students.js`, `data/content.js`, `app.js`, `modules/typing.js`, `modules/teacher.js`.
     Script `<script src="modules/mouse.js"></script>` must be included before `modules/teacher.js`.

5. **Interface Contract Specifications (`PROJECT.md` & `SCOPE.md`)**:
   - `PROJECT.md:76-80` & `SCOPE.md:4, 10-12`:
     Module must expose: `window.MouseTrainer = { init, start, destroy, finishSession, selectExercise }`.
     `MouseTrainer.finishSession()` must emit:
     `{ taskId: string, taskName: string, score: number, time: number, stars: number, date: string, accuracy: number }`
     Stored in `trainer_progress[studentId].mouse.sessions` and `trainer_progress[studentId].mouse.completedTasks`.

6. **Test Environment Capabilities (`tests/runner.js` & `tests/test_infra.test.js`)**:
   - Ran `node tests/runner.js`: 45/45 infra tests passing in 0.31s.
   - In `tests/helpers/dom_env.js`:
     - `contextmenu` event and `e.preventDefault()` are fully supported (`test_infra.test.js:624-640`).
     - `DragEvent` and `MockDataTransfer` (`setData`, `getData`) are fully supported (`test_infra.test.js:658-683`).
     - Web Audio `AudioContext` stub is implemented recording oscillators and gains (`test_infra.test.js:751-760`).
     - `localStorage` proxy supports `trainer_progress` and `sync_queue`.

---

## 2. Logic Chain

1. **Encapsulation & Consistency (from Obs 2, 5)**:
   - To maintain zero runtime external dependencies and identical architectural style with `modules/typing.js`, `modules/mouse.js` must be implemented as an IIFE exporting `window.MouseTrainer`.
   - The contract mandates 5 methods on `window.MouseTrainer`:
     - `init(containerId)`: Injects base UI skeleton, binds persistent UI events, sets up AudioContext.
     - `selectExercise(exerciseId)`: Switches active exercise view, resets stats, updates instructions.
     - `start(exerciseId)`: Starts timer, begins exercise gameplay loop.
     - `finishSession(resultData)`: Halts timers, computes stars, updates UI results card, calls `App.saveProgress`.
     - `destroy()`: Cleans up all running interval/timeout timers, global event listeners (e.g. document drag listeners, contextmenu interceptors), resets internal state.

2. **Web Audio Sound Effects Synthesizer (from Obs 1, 6 & PROJECT.md F13)**:
   - R2 and F13 require 100% offline operation without audio file assets.
   - The Web Audio API (`window.AudioContext || window.webkitAudioContext`) must be used with an audio graph consisting of `OscillatorNode` -> `GainNode` -> `destination`.
   - Web Audio policy requires user interaction before playing sound. The module must lazily initialize or call `ctx.resume()` upon the first pointer interaction (click/mousedown).
   - Audio synthesized types:
     - `playSuccess()`: Ascending two-tone chime (sine wave, 587Hz -> 880Hz, 180ms duration, exponential gain ramp down).
     - `playBullseye()`: Sparkling high triad (sine wave, 880Hz -> 1320Hz -> 1760Hz, 250ms).
     - `playError()`: Low warning buzz (sawtooth or triangle wave, 180Hz -> 120Hz, 180ms).
     - `playClick()`: Subtle crisp tick (bandpass/sine, 1200Hz, 20ms).
     - `playComplete()`: Celebration arpeggio (C5 -> E5 -> G5 -> C6, 500ms).
   - Sound toggle button (`🔊 / 🔇`) in the trainer header persisted to `localStorage['trainer_sound_enabled']`.

3. **Exercise 1: Снайпер клика (Single Click Precision)**:
   - **Curriculum Context**: 7th grade basic input device ergonomics — cursor aiming and single left-click without cursor jitter.
   - **Target Spawning Algorithm**:
     - Session consists of 15 sequential targets.
     - Playground container bounds: `areaWidth` and `areaHeight`.
     - Target size scales with level progression: Targets 1-5 (diameter 60px), Targets 6-10 (diameter 46px), Targets 11-15 (diameter 34px).
     - Target coordinates:
       `x = Math.round(padding + Math.random() * (areaWidth - targetSize - 2 * padding))`
       `y = Math.round(padding + Math.random() * (areaHeight - targetSize - 2 * padding))`
       `padding = 24px`.
     - Lifetime countdown: Target shrinks or stays active for `duration` (2500ms for targets 1-5, 2000ms for 6-10, 1600ms for 11-15).
     - If timer expires before click: target despawns, counts as `misses++`, streak resets to 0, timeout sound plays, next target spawns.
   - **Precision Hit Detection**:
     - Visual target consists of concentric circles: Outer ring (regular hit), Inner center (bullseye 🎯, radius = 40% of total radius).
     - Click coordinate evaluation:
       `const rect = targetEl.getBoundingClientRect();`
       `const centerX = rect.left + rect.width / 2;`
       `const centerY = rect.top + rect.height / 2;`
       `const dist = Math.hypot(e.clientX - centerX, e.clientY - centerY);`
       `const radius = rect.width / 2;`
     - Condition 1: `dist <= radius * 0.4` -> Bullseye (+100 pts, combo streak increment, sparkles animation, bullseye chime).
     - Condition 2: `radius * 0.4 < dist <= radius` -> Hit (+50 pts, combo streak increment, standard chime).
   - **Miss Penalty & Scoring**:
     - Clicking anywhere on playground canvas outside active target:
       - Penalty: `misses++`, streak reset, score deduction (`-15 pts`, clamped to min 0), error buzz audio.
       - Visual ripple at click coordinate (`.click-ripple-miss`).
     - Accuracy formula:
       `accuracy = Math.round((totalHits / (totalHits + misses + expired)) * 100)`
     - Final score: `(bullseyeCount * 100) + (outerCount * 50) - (misses * 15) + (timeBonus)`.

4. **Exercise 2: Быстрый даблклик (Double Click)**:
   - **Curriculum Context**: GUI object activation (Topic 7-2-2). Students often struggle with double-click interval (clicking too slowly) or dragging during click.
   - **Desktop Environment**:
     - Renders a simulated OS desktop grid with 8 authentic icons:
       1. 💻 `Мой компьютер`
       2. 📁 `Проекты 7-А`
       3. 📄 `Учебник_Информатика.pdf`
       4. 🎨 `Графический редактор Paint`
       5. 📝 `Блокнот`
       6. 🌐 `Браузер`
       7. 🧮 `Калькулятор`
       8. 🗑️ `Корзина`
   - **Double-Click Detection & Coaching Engine**:
     - Threshold: Interval `< 450ms` between clicks on the same item.
     - Drift tolerance: Cursor movement between clicks must be `< 8px` (`Math.hypot(x2 - x1, y2 - y1) < 8`).
     - Tracking state: `_lastClick = { targetId, timestamp, x, y }`.
     - Event processing:
       - On single click: item gets selected visual state (`.desktop-icon.selected`), plays light click tick.
       - If second click occurs on same item within `dt = (now - _lastClick.timestamp)`:
         - If `dt < 450ms` and `drift <= 8px`: **Double Click Success!**
         - If `450ms <= dt <= 1000ms`: **Slow Click Detected**. Display coaching toast: *"Слишком медленно! Интервал: ${Math.round(dt)}мс. Двойной щелчок должен выполняться быстро без паузы!"*.
         - If `dt < 450ms` but `drift > 8px`: **Mouse Drift Detected**. Display coaching toast: *"Мышь сдвинулась во время щелчка! Зафиксируйте руку при двойном клике."*.
   - **Task Loop & Window Simulation**:
     - Session presents 5 consecutive activation quests (e.g., *"Запустите 'Графический редактор'"*, *"Откройте папку 'Проекты 7-А'"*).
     - Upon valid double-click: Target launches a simulated OS window with animated zoom-in, header with title and close [X] button, window body showing app UI, fanfare sound, +100 pts.
     - Student clicks [X] to close or window auto-closes after 2s, proceeding to the next quest.

5. **Exercise 3: Контекстное меню (Right Click)**:
   - **Curriculum Context**: Desktop and file context operations (Topic 7-2-2 & 7-2-3).
   - **Event Interception & Native Suppression**:
     - Global `contextmenu` listener on the game playground:
       `e.preventDefault(); e.stopPropagation();`
       This completely suppresses browser context menus and allows full programmatic control.
   - **Positioning & Boundary Collision Avoidance**:
     - Menu position calculated relative to playground bounding client rect:
       ```javascript
       const areaRect = playArea.getBoundingClientRect();
       let left = e.clientX - areaRect.left;
       let top = e.clientY - areaRect.top;
       const menuW = 190, menuH = 170;
       if (left + menuW > areaRect.width) left = areaRect.width - menuW - 6;
       if (top + menuH > areaRect.height) top = areaRect.height - menuH - 6;
       menu.style.left = `${Math.max(6, left)}px`;
       menu.style.top = `${Math.max(6, top)}px`;
       menu.style.display = 'block';
       ```
   - **Dismissal Semantics**:
     - Left-click or right-click anywhere outside the open menu dismisses the menu cleanly.
     - Pressing `Escape` dismisses the menu.
   - **Quests & Error Feedback**:
     - 5 sequential curriculum tasks:
       1. Кликните ПКМ по файлу `"Реферат.docx"` и выберите `"Переименовать"`.
       2. Кликните ПКМ по пустому месту рабочего стола и выберите `"Создать папку"`.
       3. Кликните ПКМ по подозрительному файлу `"virus_trojan.tmp"` и выберите `"Удалить"`.
       4. Кликните ПКМ по папке `"Мои рисунки"` и выберите `"Свойства"`.
       5. Кликните ПКМ по файлу `"Песня.mp3"` и выберите `"Копировать"`.
     - If student left-clicks the target instead of right-clicking: displays helper badge: *"Нажмите ПРАВУЮ кнопку мыши (ПКМ)!"*.
     - If student chooses wrong action in context menu: error sound, -20 pts penalty, instruction repeat.
     - Correct action: success chime, item updates (e.g. file is deleted or renamed), +100 pts.

6. **Exercise 4: Файловый архитектор (Drag-and-Drop)**:
   - **Curriculum Context**: Topic 7-2-3 "Файлы и файловые структуры. Типы файлов и расширения".
   - **Classification Rules & Content**:
     - 4 Destination Folders (Drop Zones):
       - 📁 **Документы**: `.docx`, `.txt`, `.pdf`, `.odt`, `.xlsx`
       - 🖼️ **Изображения**: `.jpg`, `.png`, `.gif`, `.bmp`, `.svg`
       - 🎵 **Музыка**: `.mp3`, `.wav`, `.ogg`, `.flac`
       - 🗑️ **Корзина**: `.tmp`, `.bak`, `.log`, `.old`
     - 12 Unsorted Files Pool:
       - `реферат_история.docx` (Документы)
       - `фото_природы.jpg` (Изображения)
       - `гимн_школы.mp3` (Музыка)
       - `temp_cache.tmp` (Корзина)
       - `таблица_оценок.xlsx` (Документы)
       - `схема_компьютера.png` (Изображения)
       - `мелодия_звонка.wav` (Музыка)
       - `старый_бэкап.bak` (Корзина)
       - `учебник_информатика.pdf` (Документы)
       - `анимация_кота.gif` (Изображения)
       - `подкаст_урок.ogg` (Музыка)
       - `ошибка_системы.log` (Корзина)
   - **Dual-Mode Drag-and-Drop Implementation**:
     - Mode A: Native HTML5 Drag and Drop (`draggable="true"`, `dragstart`, `dragover`, `dragleave`, `drop`, `dragend`). Sets `e.dataTransfer.setData('text/plain', JSON.stringify({ id, ext, category }))`.
     - Mode B: Mouse / Pointer Fallback (`mousedown`, `mousemove`, `mouseup`). Creates a floating clone (`.dragged-file-avatar`) attached to cursor during drag.
     - Why Dual-Mode? Guarantees flawless operation under Node.js test runner mock environments (which mock `dragstart`/`drop` via custom dispatchers) and browser environments where touch or sandbox policies restrict native drag-and-drop.
   - **Drop Target States & Validation**:
     - When drag hovers over target folder: folder receives `.drop-target-active`, folder icon changes from closed 📁 to open 📂.
     - Validation:
       - If file's category matches folder's category:
         - Success sound chime.
         - File element animates shrinking into folder (`transform: scale(0); opacity: 0;`).
         - Folder badge counter increments (`"Документы (3)"`).
         - +50 pts.
       - If mismatched:
         - Error buzz sound.
         - Folder shakes horizontally (`animation: shake 0.3s ease`).
         - File snaps back to source pool.
         - Toast explanation: *"Файл с расширением .${ext} относится к категории '${fileCategory}', а не '${folderCategory}'!"*.
         - -15 pts penalty.
     - Exercise completes when all 12 files are sorted into appropriate folders.

7. **Exercise 5: Системный навигатор (Hover & Tooltips)**:
   - **Curriculum Context**: Understanding GUI status indicators, tooltips, and steady pointer holding without shaking.
   - **UI Environment**:
     - Simulated desktop taskbar, system status tray, and notification center with interactive widgets:
       1. 📶 **Сеть Wi-Fi**: Tooltip `"Подключено к: School_Informatics_5G | Сигнал: 95% | IP: 192.168.1.45"`
       2. 🔋 **Батарея**: Tooltip `"Заряд: 88% (питание от сети) | Оставшееся время: 4 ч 15 мин"`
       3. 💾 **USB-накопитель**: Tooltip `"Флеш-карта (E:) | Свободно: 14.8 ГБ из 32.0 ГБ"`
       4. 🔊 **Громкость**: Tooltip `"Динамики (Realtek Audio): 70%"`
       5. 🛡️ **Антивирус**: Tooltip `"Защита активна | Базы обновлены сегодня"`
       6. ⚙️ **Параметры**: Tooltip `"Параметры системы и оборудования"`
       7. 🕒 **Часы и календарь**: Tooltip `"Четверг, 12 ноября 2026 г."`
       8. 🗕 **Кнопка 'Свернуть'**: Tooltip `"Свернуть окно"`
       9. 🗖 **Кнопка 'Развернуть'**: Tooltip `"Развернуть на весь экран"`
       10. ✕ **Кнопка 'Закрыть'**: Tooltip `"Закрыть программу"`
   - **Hover Timing & Precision Engine**:
     - Threshold: Cursor must remain within target bounds steadily for `>= 500ms` for tooltip to activate.
     - Circular Progress Indicator: While hovering, a small radial timer / fill ring animates around or inside the icon over 500ms. If cursor leaves earlier (`mouseleave`), timer is cancelled and progress resets.
     - Tooltip Collision Detection:
       - Computes tooltip bounding rect vs playground boundaries.
       - If tooltip overflows right boundary: shifts alignment to the left.
       - If tooltip overflows top: renders below the widget.
   - **Quests & Verification**:
     - 5 sequential inspection quests:
       1. *"Найдите значок USB-накопителя (флешки) и задержите курсор, чтобы узнать свободное место."*
       2. *"Наведите курсор на значок Сети и выясните имя подключённой сети Wi-Fi."*
       3. *"Осмотрите значок батареи и определите процент заряда."*
       4. *"Найдите кнопку 'Свернуть' в окне с помощью всплывающей подсказки."*
       5. *"Наведите курсор на значок Антивируса и проверьте статус защиты."*
     - When correct widget is held for tooltip activation and inspected for >= 1.2s: success chime, quest checkbox marks complete, +100 pts.
     - Total score = 500 pts maximum.

8. **Result Presentation & Interface Contract (Obs 2, 5)**:
   - When any exercise finishes:
     - Clear running timers.
     - Calculate stars:
       - 3 Stars: Accuracy >= 90% and completed within target time.
       - 2 Stars: Accuracy >= 75%.
       - 1 Star: Completed.
     - Call `finishSession(resultData)`:
       ```javascript
       const sessionSummary = {
         taskId: `mouse_${_currentExercise.id}`,
         taskName: _currentExercise.title,
         score: Math.max(0, _state.score),
         time: elapsedSeconds,
         stars: computedStars,
         accuracy: computedAccuracy,
         date: new Date().toLocaleDateString('ru-RU')
       };
       if (typeof App !== 'undefined' && App.saveProgress && App.state && App.state.currentStudent) {
         App.saveProgress(App.state.currentStudent.id, 'mouse', sessionSummary);
       }
       ```
     - Displays `.result-card` showing:
       - Score (Очки)
       - Accuracy (Точность %)
       - Time (Время в сек)
       - Stars (⭐ ⭐ ⭐)
       - Buttons: "🔄 Попробовать снова", "➡️ Следующее упражнение", "🏠 В меню".

---

## 3. Caveats

1. **Touch / Mobile Emulation**:
   - The trainer is strictly designed for 7th-grade computer science lab desktop computers (monitors 1280x720, 1366x768, 1920x1080) with a physical hardware mouse. Right-click context menus and hover tooltips do not have standard equivalents on touchscreens. Touch support is out of scope for Milestone 3, as specified in the project requirements.
2. **Audio Autoplay Restrictions**:
   - Browsers (Chromium, Firefox) block audio until the first user gesture. The Web Audio synthesizer must initialize or resume its `AudioContext` inside a user click/mousedown handler, not on page load.
3. **Double Click OS Variance**:
   - OS settings for double-click intervals vary between 300ms and 700ms. Standardizing at 450ms with custom distance tracking (<8px) provides the optimal educational standard for 7th graders.

---

## 4. Conclusion & Complete Architectural Specification

### 4.1 Module API Specification (`modules/mouse.js`)

```javascript
window.MouseTrainer = {
  /**
   * Initializes the Mouse Trainer inside the specified DOM container.
   * Renders the master UI shell, binds global controls and sound engine.
   * @param {string} containerId - Element ID (e.g. 'mouse-container')
   */
  init(containerId): void,

  /**
   * Selects an exercise by ID (1 to 5) and resets the playground.
   * @param {number|string} exerciseId - Exercise ID (1: Sniper, 2: DblClick, 3: ContextMenu, 4: DragDrop, 5: Hover)
   */
  selectExercise(exerciseId): void,

  /**
   * Starts or restarts the active exercise gameplay loop and timers.
   * @param {number|string} [exerciseId] - Optional exercise ID to switch and start
   */
  start(exerciseId): void,

  /**
   * Concludes the current exercise session, calculates score/stars,
   * updates the results card UI, and saves progress to localStorage via App.saveProgress.
   * @param {Object} [customData] - Optional override parameters for session data
   */
  finishSession(customData): Object,

  /**
   * Complete lifecycle teardown: halts all interval/timeout timers,
   * removes window/document event listeners, suspends AudioContext.
   */
  destroy(): void
};
```

### 4.2 Data Structures & Exercise Registry

```javascript
const EXERCISES = [
  {
    id: 1,
    key: 'sniper',
    taskId: 'mouse_ex1_sniper',
    title: 'Снайпер клика',
    subtitle: 'Отработка меткости и одиночного клика левой кнопкой мыши',
    icon: '🎯',
    totalTargets: 15
  },
  {
    id: 2,
    key: 'dblclick',
    taskId: 'mouse_ex2_dblclick',
    title: 'Быстрый даблклик',
    subtitle: 'Отработка ритма двойного клика для запуска программ и папок',
    icon: '⚡',
    thresholdMs: 450,
    maxDriftPx: 8,
    totalQuests: 5
  },
  {
    id: 3,
    key: 'contextmenu',
    taskId: 'mouse_ex3_contextmenu',
    title: 'Контекстное меню',
    subtitle: 'Использование правой кнопки мыши (ПКМ) и выбор команд',
    icon: '🖱️',
    totalQuests: 5
  },
  {
    id: 4,
    key: 'dragdrop',
    taskId: 'mouse_ex4_dragdrop',
    title: 'Файловый архитектор',
    subtitle: 'Перетаскивание файлов (Drag-and-Drop) и сортировка по расширениям',
    icon: '📁',
    totalFiles: 12
  },
  {
    id: 5,
    key: 'hover',
    taskId: 'mouse_ex5_hover',
    title: 'Системный навигатор',
    subtitle: 'Наведение курсора, удержание и чтение всплывающих подсказок',
    icon: '🔍',
    hoverDelayMs: 500,
    totalQuests: 5
  }
];
```

### 4.3 Web Audio Engine Specification

```javascript
const SoundFX = (() => {
  let ctx = null;
  let soundEnabled = true;

  function getContext() {
    if (!ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) ctx = new AudioCtx();
    }
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    return ctx;
  }

  function playTone(freq, type, duration, startGain = 0.2, endGain = 0.001) {
    if (!soundEnabled) return;
    const ac = getContext();
    if (!ac) return;
    try {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ac.currentTime);
      gain.gain.setValueAtTime(startGain, ac.currentTime);
      gain.gain.exponentialRampToValueAtTime(endGain, ac.currentTime + duration);
      osc.connect(gain);
      gain.connect(ac.destination);
      osc.start();
      osc.stop(ac.currentTime + duration);
    } catch (_) {}
  }

  return {
    toggle() {
      soundEnabled = !soundEnabled;
      return soundEnabled;
    },
    isEnabled() { return soundEnabled; },
    success() {
      playTone(587.33, 'triangle', 0.1, 0.25);
      setTimeout(() => playTone(880.00, 'triangle', 0.15, 0.25), 90);
    },
    bullseye() {
      playTone(880, 'sine', 0.08, 0.3);
      setTimeout(() => playTone(1318.51, 'sine', 0.1, 0.3), 70);
      setTimeout(() => playTone(1760.00, 'sine', 0.2, 0.3), 150);
    },
    error() {
      playTone(180, 'sawtooth', 0.12, 0.3);
      setTimeout(() => playTone(130, 'sawtooth', 0.16, 0.3), 80);
    },
    click() {
      playTone(1200, 'sine', 0.02, 0.15);
    },
    complete() {
      const notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, idx) => {
        setTimeout(() => playTone(freq, 'triangle', 0.2, 0.3), idx * 110);
      });
    }
  };
})();
```

### 4.4 DOM Container Structure for `index.html`

```html
<!-- Inside #screen-menu .module-grid: Add 5th Card -->
<button class="btn btn-module" data-module="mouse">
  <span class="module-icon">🖱️</span>
  <span class="module-name">Тренажёр мыши</span>
  <span class="module-desc">Клики, даблклик, контекстное меню, drag-and-drop и наведение</span>
</button>

<!-- New Screen Container in index.html -->
<div id="screen-mouse" class="screen">
  <div class="screen-header">
    <button class="btn btn-back" data-back="screen-menu">← В меню</button>
    <h2 class="screen-title">Тренажёр управления мышью</h2>
    <div class="screen-header-actions">
      <button class="btn btn-icon" id="mouse-sound-toggle" title="Включить/выключить звук">🔊</button>
    </div>
  </div>
  <div class="screen-body">
    <div id="mouse-container" class="module-container mouse-trainer-container">
      <!-- Populated dynamically by MouseTrainer.init() -->
    </div>
  </div>
</div>
```

### 4.5 Internal Shell Generated by `MouseTrainer.renderUI()`

```html
<div class="mouse-trainer">
  <!-- Tabs / Exercise Selector -->
  <div class="mouse-nav-bar">
    <div class="exercise-selector">
      <button class="exercise-tab active" data-exercise="1">
        <span class="tab-icon">🎯</span> 1. Снайпер клика
      </button>
      <button class="exercise-tab" data-exercise="2">
        <span class="tab-icon">⚡</span> 2. Быстрый даблклик
      </button>
      <button class="exercise-tab" data-exercise="3">
        <span class="tab-icon">🖱️</span> 3. Контекстное меню
      </button>
      <button class="exercise-tab" data-exercise="4">
        <span class="tab-icon">📁</span> 4. Файловый архитектор
      </button>
      <button class="exercise-tab" data-exercise="5">
        <span class="tab-icon">🔍</span> 5. Системный навигатор
      </button>
    </div>
  </div>

  <!-- Exercise Instruction Banner -->
  <div class="mouse-instruction-card">
    <div class="instruction-main">
      <span class="instruction-badge" id="mouse-ex-badge">Упражнение 1</span>
      <h3 class="instruction-title" id="mouse-ex-title">Снайпер клика</h3>
      <p class="instruction-desc" id="mouse-ex-desc">
        Нажимайте точно в центр появляющихся мишеней. Избегайте промахов!
      </p>
    </div>
    <div class="instruction-task" id="mouse-task-prompt">
      🎯 Цель: Поразите 15 мишеней с максимальной точностью
    </div>
  </div>

  <!-- Live HUD Bar -->
  <div class="mouse-hud-bar">
    <div class="hud-item">⭐ Счёт: <strong id="mouse-hud-score">0</strong></div>
    <div class="hud-item">🎯 Точность: <strong id="mouse-hud-accuracy">100%</strong></div>
    <div class="hud-item">📊 Прогресс: <strong id="mouse-hud-progress">0 / 15</strong></div>
    <div class="hud-item">⏱ Время: <strong id="mouse-hud-time">0:00</strong></div>
    <div class="hud-item" id="mouse-hud-streak-box">🔥 Серия: <strong id="mouse-hud-streak">0</strong></div>
  </div>

  <!-- Interactive Playground Viewport -->
  <div class="mouse-play-area" id="mouse-play-area">
    <!-- Active exercise DOM dynamically injected here -->
  </div>

  <!-- Results Card (Hidden during gameplay) -->
  <div class="result-card mouse-result-card" id="mouse-result-card" style="display: none;">
    <h2 class="result-title">🎉 Упражнение успешно завершено!</h2>
    <div class="result-stars" id="mouse-res-stars">⭐⭐⭐</div>
    <div class="result-stats">
      <div class="result-stat">
        <span class="result-stat-label">Набранные очки</span>
        <span class="result-stat-value" id="mouse-res-score">0</span>
        <span class="result-stat-unit">баллов</span>
      </div>
      <div class="result-stat">
        <span class="result-stat-label">Точность кликов</span>
        <span class="result-stat-value" id="mouse-res-accuracy">100</span>
        <span class="result-stat-unit">%</span>
      </div>
      <div class="result-stat">
        <span class="result-stat-label">Время выполнения</span>
        <span class="result-stat-value" id="mouse-res-time">0</span>
        <span class="result-stat-unit">сек</span>
      </div>
    </div>
    <div class="result-actions">
      <button class="btn btn-secondary" id="mouse-btn-retry">🔄 Повторить</button>
      <button class="btn btn-primary" id="mouse-btn-next">➡️ Следующее упражнение</button>
      <button class="btn btn-outline" id="mouse-btn-menu">🏠 В меню</button>
    </div>
  </div>
</div>
```

### 4.6 Concrete Implementation Specifications for Exercises 1-5

#### Exercise 1: Снайпер клика (Single Click)
- Target count: 15.
- Diameter: 64px (1-5), 48px (6-10), 34px (11-15).
- Structure:
  `<div class="sniper-target" style="left: ${x}px; top: ${y}px; width: ${size}px; height: ${size}px;">`  
    `<div class="target-ring-outer"></div>`  
    `<div class="target-ring-bullseye"></div>`  
  `</div>`
- Click handler evaluates euclidean distance to center:
  - `dist <= radius * 0.4`: Bullseye (+100 pts, SoundFX.bullseye(), spawn floating "+100" text).
  - `dist <= radius`: Outer Hit (+50 pts, SoundFX.success(), spawn floating "+50" text).
- Click on `.mouse-play-area` outside target: Miss (-15 pts, SoundFX.error(), spawn ripple `.click-ripple-miss`).
- Target timeout: Despawns after `duration` (2.2s -> 1.5s), counts as miss, SoundFX.error().
- Session finishes when 15 targets have spawned and resolved.

#### Exercise 2: Быстрый даблклик (Double Click)
- Desktop Icons Grid: 8 icons (`Мой компьютер`, `Проекты 7-А`, `Учебник.pdf`, `Графический редактор`, `Блокнот`, `Браузер`, `Калькулятор`, `Корзина`).
- Click tracking:
  ```javascript
  let lastClickTarget = null;
  let lastClickTime = 0;
  let lastClickX = 0, lastClickY = 0;

  function handleIconClick(icon, e) {
    const now = Date.now();
    const dt = now - lastClickTime;
    const drift = Math.hypot(e.clientX - lastClickX, e.clientY - lastClickY);

    if (lastClickTarget === icon && dt < 450 && drift <= 8) {
      // SUCCESSFUL DOUBLE CLICK
      triggerAppOpen(icon.dataset.appId);
      lastClickTarget = null;
    } else if (lastClickTarget === icon && dt >= 450 && dt <= 1000) {
      // SLOW DOUBLE CLICK COACHING
      showCoachingToast(`Слишком медленно (${Math.round(dt)} мс). Даблклик выполняется двумя быстрыми нажатиями!`);
      lastClickTime = now;
      lastClickX = e.clientX;
      lastClickY = e.clientY;
    } else if (lastClickTarget === icon && dt < 450 && drift > 8) {
      // CURSOR DRIFT COACHING
      showCoachingToast(`Курсор сдвинулся во время клика! Держите мышь неподвижно.`);
      lastClickTime = now;
      lastClickX = e.clientX;
      lastClickY = e.clientY;
    } else {
      // SINGLE CLICK SELECTION
      selectIcon(icon);
      lastClickTarget = icon;
      lastClickTime = now;
      lastClickX = e.clientX;
      lastClickY = e.clientY;
    }
  }
  ```
- Window Launch: Creates `.sim-window` with title bar, close button, and simulated window contents. Closes on [X] click or 2s delay.
- 5 quest apps in sequence. Completing all 5 finishes exercise.

#### Exercise 3: Контекстное меню (Right Click)
- Intercepts `contextmenu` on `.mouse-play-area`:
  `e.preventDefault(); e.stopPropagation();`
- Context Menu DOM:
  `<div class="custom-context-menu" style="left: ${clampedX}px; top: ${clampedY}px;">`  
    `<div class="menu-item" data-action="open">📂 Открыть</div>`  
    `<div class="menu-item" data-action="rename">✏️ Переименовать</div>`  
    `<div class="menu-item" data-action="copy">📋 Копировать</div>`  
    `<div class="menu-item" data-action="delete">🗑️ Удалить</div>`  
    `<div class="menu-separator"></div>`  
    `<div class="menu-item" data-action="props">ℹ️ Свойства</div>`  
  `</div>`
- Outside click or Escape dismisses menu.
- 5 scenario tasks. Right click opens menu, clicking correct action solves task (+100 pts, SoundFX.success()). Left clicking target displays coaching prompt: "Используйте ПРАВУЮ кнопку мыши!".

#### Exercise 4: Файловый архитектор (Drag-and-Drop)
- Folders:
  - `docs`: Документы (`.docx`, `.txt`, `.pdf`, `.xlsx`)
  - `images`: Изображения (`.jpg`, `.png`, `.gif`)
  - `audio`: Музыка (`.mp3`, `.wav`, `.ogg`)
  - `trash`: Корзина (`.tmp`, `.bak`, `.log`)
- Dual-Mode:
  - Both native HTML5 DnD (`dragstart`, `dragover`, `drop`) and pointer fallback (`mousedown` + `mousemove` + `mouseup` with moving clone avatar).
- On drop:
  - Match: File shrinks into folder (`transform: scale(0)`), folder counter increments, SoundFX.success(), +50 pts.
  - Mismatch: Folder shakes (`.folder-shake`), file bounces back, SoundFX.error(), explanation toast, -15 pts.
- All 12 files sorted completes exercise.

#### Exercise 5: Системный навигатор (Hover & Tooltips)
- Taskbar with 10 interactive widgets: Network, Battery, Flash Drive, Sound, Antivirus, Settings, Clock, Minimize, Maximize, Close.
- Hover detection:
  - `mouseenter` starts 500ms timer.
  - Progress ring animates inside widget over 500ms.
  - If held for 500ms, tooltip fades in with boundary collision clamping:
    `if (left + tooltipW > areaW) left = areaW - tooltipW - 8;`
    `if (top - tooltipH < 0) top = widgetBottom + 8;`
- Quests: 5 specific inspection tasks. Holding hover on correct target for >=1.2s marks quest done (+100 pts, SoundFX.success()).

---

## 5. Verification Method

To verify the architecture and specifications independently:

1. **Test Runner Health Check**:
   ```powershell
   cd C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer
   node tests/runner.js
   ```
   *Expected*: All 45 standalone/infra tests pass without errors.

2. **Interface Contract Inspection**:
   - Inspect `modules/typing.js:409-458` to confirm exact alignment with `MouseTrainer` methods (`init`, `start`, `destroy`, `finishSession`, `selectExercise`).
   - Inspect `PROJECT.md:76-80` to verify session summary payload schema.

3. **Subagent Notification**:
   - Deliver this report path to parent orchestrator `d063fc93-1f0b-4efb-8a65-441b7294bfd3`.
