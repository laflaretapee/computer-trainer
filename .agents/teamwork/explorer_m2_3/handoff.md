# Handoff Report — Explorer M2.3: Real-Time Typing Metrics Engine & Session Contract

## Executive Summary
This report provides a forensic analysis of the real-time typing metrics calculation (CPM, live accuracy %, live error counter `#tt-errors`), first-keystroke speed spike anomalies, and the M2 ↔ M4 session completion contract in `modules/typing.js` and `app.js`. Concrete, drop-in mathematical specifications and code snippets are provided for Worker M2.

---

## 1. Observation

### 1.1. Absence of Live Error Counter (`#tt-errors`) in UI and State
- **File**: `modules/typing.js`, lines 106–110:
  ```html
  <!-- Статистика -->
  <div class="typing-stats" id="tt-stats">
    <span class="stat-item">⚡ Скорость: <strong id="tt-speed">0</strong> сим/мин</span>
    <span class="stat-item">🎯 Точность: <strong id="tt-accuracy">100</strong>%</span>
    <span class="stat-item">⏱ Время: <strong id="tt-time">0:00</strong></span>
  </div>
  ```
  *Finding*: There is no `#tt-errors` DOM element in `modules/typing.js`. Requirement R3 and SCOPE.md item 4 specifically require `<span class="stat-item">❌ Ошибки: <strong id="tt-errors">0</strong></span>`.
- **File**: `modules/typing.js`, lines 40–51:
  ```javascript
  // ─── Внутреннее состояние ─────────────────────────────────────────────────
  let _container = null;
  let _currentLevel = null;
  let _currentText = '';
  let _currentPos = 0;
  let _correctChars = 0;
  let _totalKeystrokes = 0;
  let _startTime = null;
  let _timerInterval = null;
  let _activeKeyTimer = null;
  let _textStarted = false;
  ```
  *Finding*: No `_errors` counter exists in module state.

### 1.2. Keystroke Handler & Error Handling
- **File**: `modules/typing.js`, lines 270–288:
  ```javascript
  const typedChar = e.key;
  const expectedChar = _currentText[_currentPos];
  const isCorrect = typedChar === expectedChar;

  _totalKeystrokes++;
  if (isCorrect) _correctChars++;

  // Обновляем span текущего символа
  const spans = qs('tt-text') ? qs('tt-text').querySelectorAll('span') : [];
  if (spans[_currentPos]) {
    spans[_currentPos].classList.remove('char-current');
    spans[_currentPos].classList.add(isCorrect ? 'char-correct' : 'char-wrong');
  }

  // Подсветка нажатой клавиши
  flashKey(typedChar.toLowerCase());

  _currentPos++;
  ```
  *Finding*: When `isCorrect === false`, no error count is updated, no DOM element `#tt-errors` is refreshed.

### 1.3. Real-Time CPM Calculation Glitch (First-Keystroke Spike)
- **File**: `modules/typing.js`, lines 337–354:
  ```javascript
  function updateStats() {
    const speedEl    = qs('tt-speed');
    const accuracyEl = qs('tt-accuracy');

    if (!_startTime || !_textStarted) {
      if (speedEl) speedEl.textContent = '0';
      if (accuracyEl) accuracyEl.textContent = '100';
      return;
    }

    const elapsed = (Date.now() - _startTime) / 1000; // секунды
    const minutes = elapsed / 60;
    const speed = minutes > 0 ? Math.round(_correctChars / minutes) : 0;
    const accuracy = _totalKeystrokes > 0 ? Math.round(_correctChars / _totalKeystrokes * 100) : 100;

    if (speedEl) speedEl.textContent = speed;
    if (accuracyEl) accuracyEl.textContent = accuracy;
  }
  ```
  *Finding*: On the very first keystroke, `_startTime` is set (`_startTime = Date.now()`). `onKeyDown()` then calls `updateStats()` synchronously within 0–1 ms.
  If `Date.now() - _startTime === 1` ms:
  `elapsed = 0.001` sec, `minutes = 0.000016667` min, `_correctChars = 1`.
  `speed = Math.round(1 / 0.000016667) = 60,000` CPM!
  The UI momentarily displays **60,000 сим/мин**, which is an extreme numerical spike.

### 1.4. M2 ↔ M4 Contract Non-Compliance
- **Specification**: `PROJECT.md` lines 71–74 & `SCOPE.md` lines 40–43:
  > `TypingTrainer.finishSession()` emits session summary:
  > `{ speed: number, accuracy: number, errors: number, level: number, duration: number, date: string }`.
  > Persisted into `trainer_progress[studentId].typing.sessions`.
- **Actual Code**: `modules/typing.js`, lines 408–418:
  ```javascript
  if (typeof App !== 'undefined' && App.saveProgress && App.state && App.state.currentStudent) {
    const result = {
      date: new Date().toLocaleDateString('ru-RU'),
      speed: speed,
      accuracy: accuracy,
      level: _currentLevel.id,
      duration: elapsedSeconds
    };
    App.saveProgress(App.state.currentStudent.id, 'typing', result);
  }
  ```
  *Finding*:
  1. `errors` property is missing from the payload.
  2. `window.TypingTrainer.finishSession()` is not exposed on `window.TypingTrainer` (only `init`, `start`, `destroy` are exposed at lines 430–457).

### 1.5. Missing Error Display on Result Card
- **File**: `modules/typing.js`, lines 112–131:
  ```html
  <div class="result-card" id="tt-result" style="display:none;">
    <h2 class="result-title">🎉 Упражнение завершено!</h2>
    <div class="result-stats">
      <div class="result-stat">
        <span class="result-stat-label">Скорость</span>
        <span class="result-stat-value" id="tt-res-speed">—</span>
        <span class="result-stat-unit">сим/мин</span>
      </div>
      <div class="result-stat">
        <span class="result-stat-label">Точность</span>
        <span class="result-stat-value" id="tt-res-accuracy">—</span>
        <span class="result-stat-unit">%</span>
      </div>
      <div class="result-stat">
        <span class="result-stat-label">Время</span>
        <span class="result-stat-value" id="tt-res-time">—</span>
        <span class="result-stat-unit">сек</span>
      </div>
    </div>
  ```
  *Finding*: The result card only has boxes for Speed, Accuracy, and Time. There is no `#tt-res-errors` box for errors count.

---

## 2. Logic Chain

1. **Live Error Metric (R3 / SCOPE.md)**:
   - A student needs real-time visual feedback on typing errors to adjust finger placement.
   - Adding `<span class="stat-item">❌ Ошибки: <strong id="tt-errors">0</strong></span>` directly into `.typing-stats` matches existing `.stat-item` CSS styling (`style.css:1005–1016`).
   - Maintaining `_errors` in internal state incremented on each mismatch (`typedChar !== expectedChar`) keeps error counts synchronized.

2. **CPM Calculation Stability**:
   - `elapsedSeconds = (Date.now() - _startTime) / 1000`.
   - When `elapsedSeconds < 1.0`, calculating `(_correctChars / elapsedSeconds) * 60` produces wild spikes up to 60,000 CPM.
   - Applying a guard `elapsedSeconds >= 1.0` ensures the speed display remains `0` for the first second and only displays meaningful rates thereafter.
   - Final completion speed calculation must guard against 0-duration completion via `Math.max(1, Math.round(rawElapsed))`.

3. **Accuracy Stability and Mathematical Precision**:
   - Total keystrokes is `_correctChars + _errors`.
   - Before typing starts (`total === 0`), accuracy is defined as `100%`.
   - Once typing commences, `accuracy = Math.max(0, Math.min(100, Math.round((_correctChars / total) * 100)))`.
   - This eliminates all `0 / 0 = NaN` or `Infinity` edge cases.

4. **Session Completion Contract (`TypingTrainer.finishSession`)**:
   - `PROJECT.md` and `SCOPE.md` define an explicit contract for M2 ↔ M4:
     `{ speed, accuracy, errors, level, duration, date }`.
   - Making `TypingTrainer.finishSession()` a public method allows:
     a) Internal completion (`finishExercise()` delegates to `finishSession()`).
     b) External calls by the application router or automated test runner.
     c) Returning the standardized payload directly.
   - In `app.js:87-95`, `record.typing.sessions.push(data)` persists the full object to `localStorage['trainer_progress']`. Adding `errors` directly enables M4 gamification and telemetry sync without breaking backward compatibility.

5. **Completion Modal Presentation**:
   - The result card `.result-stats` has `display: flex; flex-wrap: wrap; justify-content: center;`.
   - Adding a 4th metric box `#tt-res-errors` (min-width: 90px) neatly fits within the 600px container (`style.css:1044`) across all tested resolutions (1280x720, 1366x768, 1920x1080).

---

## 3. Caveats

1. **Keystroke Cursor Advancement**:
   - In the existing codebase, pressing an incorrect key advances `_currentPos++` and flags the span as `.char-wrong`.
   - If the implementation shifts to blocking on error (cursor stays until correct key is typed), the formulas `accuracy = Math.round((_correctChars / (_correctChars + _errors)) * 100)` and `speed = Math.round((_correctChars / duration) * 60)` remain mathematically identical and invariant.
2. **Keyboard Layout & Hands Indicator**:
   - Detailed mapping of all ЙЦУКЕН keys, punctuation (.,), and hands SVG are investigated by peer explorers M2.1 and M2.2. The metrics engine is decoupled from layout rendering.
3. **Timer Precision**:
   - Browser background throttling can slightly alter `setInterval(1000)`. Because duration and CPM are calculated using `Date.now() - _startTime`, metrics remain accurate even if timer ticks are jittered.

---

## 4. Conclusion & Engine Specifications

### 4.1. Concrete Implementation Specification for `modules/typing.js`

#### A. Internal State
```javascript
let _errors = 0;
```
Reset inside `startLevel(levelId)`:
```javascript
_errors = 0;
_correctChars = 0;
_totalKeystrokes = 0;
_startTime = null;
_textStarted = false;

const errEl = qs('tt-errors');
if (errEl) errEl.textContent = '0';
```

#### B. UI Markup Updates in `renderUI()`
In `.typing-stats`:
```html
<div class="typing-stats" id="tt-stats">
  <span class="stat-item">⚡ Скорость: <strong id="tt-speed">0</strong> сим/мин</span>
  <span class="stat-item">🎯 Точность: <strong id="tt-accuracy">100</strong>%</span>
  <span class="stat-item">❌ Ошибки: <strong id="tt-errors">0</strong></span>
  <span class="stat-item">⏱ Время: <strong id="tt-time">0:00</strong></span>
</div>
```
In `.result-card` (`.result-stats`):
```html
<div class="result-stats">
  <div class="result-stat">
    <span class="result-stat-label">Скорость</span>
    <span class="result-stat-value" id="tt-res-speed">—</span>
    <span class="result-stat-unit">сим/мин</span>
  </div>
  <div class="result-stat">
    <span class="result-stat-label">Точность</span>
    <span class="result-stat-value" id="tt-res-accuracy">—</span>
    <span class="result-stat-unit">%</span>
  </div>
  <div class="result-stat">
    <span class="result-stat-label">Ошибки</span>
    <span class="result-stat-value" id="tt-res-errors">0</span>
    <span class="result-stat-unit">шт</span>
  </div>
  <div class="result-stat">
    <span class="result-stat-label">Время</span>
    <span class="result-stat-value" id="tt-res-time">—</span>
    <span class="result-stat-unit">сек</span>
  </div>
</div>
```

#### C. Real-Time Metrics Calculation (`updateStats()`)
```javascript
function updateStats() {
  const speedEl    = qs('tt-speed');
  const accuracyEl = qs('tt-accuracy');
  const errorsEl   = qs('tt-errors');

  if (errorsEl) errorsEl.textContent = String(_errors);

  if (!_startTime || !_textStarted) {
    if (speedEl) speedEl.textContent = '0';
    if (accuracyEl) accuracyEl.textContent = '100';
    return;
  }

  const elapsedSeconds = (Date.now() - _startTime) / 1000;
  // Guard against initial millisecond spike
  const speed = elapsedSeconds >= 1.0 ? Math.round((_correctChars / elapsedSeconds) * 60) : 0;

  const total = _correctChars + _errors;
  const accuracy = total > 0 ? Math.max(0, Math.min(100, Math.round((_correctChars / total) * 100))) : 100;

  if (speedEl) speedEl.textContent = String(speed);
  if (accuracyEl) accuracyEl.textContent = String(accuracy);
}
```

#### D. Keystroke Handler (`onKeyDown()`)
```javascript
const typedChar = e.key;
const expectedChar = _currentText[_currentPos];
const isCorrect = typedChar === expectedChar;

_totalKeystrokes++;
if (isCorrect) {
  _correctChars++;
} else {
  _errors++;
}

// Update DOM span
const spans = qs('tt-text') ? qs('tt-text').querySelectorAll('span') : [];
if (spans[_currentPos]) {
  spans[_currentPos].classList.remove('char-current');
  spans[_currentPos].classList.add(isCorrect ? 'char-correct' : 'char-wrong');
}

flashKey(typedChar.toLowerCase());

_currentPos++;

if (_currentPos < _currentText.length) {
  if (spans[_currentPos]) spans[_currentPos].classList.add('char-current');
  highlightNextKey();
} else {
  finishSession();
  return;
}

updateStats();
```

#### E. M2 ↔ M4 Contract Implementation (`finishSession()`)
```javascript
function finishSession() {
  destroyTimers();

  const rawElapsed = _startTime ? (Date.now() - _startTime) / 1000 : 0;
  const elapsedSeconds = Math.max(1, Math.round(rawElapsed));
  const speed = Math.round((_correctChars / elapsedSeconds) * 60);
  const total = _correctChars + _errors;
  const accuracy = total > 0 ? Math.max(0, Math.min(100, Math.round((_correctChars / total) * 100))) : 100;
  const level = _currentLevel ? _currentLevel.id : 1;
  const date = new Date().toLocaleDateString('ru-RU');

  const sessionSummary = {
    speed,
    accuracy,
    errors: _errors,
    level,
    duration: elapsedSeconds,
    date
  };

  // Final stats update
  const speedEl    = qs('tt-speed');
  const accuracyEl = qs('tt-accuracy');
  const errorsEl   = qs('tt-errors');
  const timeEl     = qs('tt-time');
  if (speedEl) speedEl.textContent = String(speed);
  if (accuracyEl) accuracyEl.textContent = String(accuracy);
  if (errorsEl) errorsEl.textContent = String(_errors);
  if (timeEl) timeEl.textContent = formatTime(elapsedSeconds);

  // Update Result Card
  const resultCard = qs('tt-result');
  if (resultCard) {
    resultCard.style.display = '';

    const resSpeed    = qs('tt-res-speed');
    const resAccuracy = qs('tt-res-accuracy');
    const resErrors   = qs('tt-res-errors');
    const resTime     = qs('tt-res-time');

    if (resSpeed) resSpeed.textContent = String(speed);
    if (resAccuracy) resAccuracy.textContent = String(accuracy);
    if (resErrors) resErrors.textContent = String(_errors);
    if (resTime) resTime.textContent = String(elapsedSeconds);

    const btnNext = qs('tt-btn-next');
    if (btnNext) btnNext.style.display = level >= LEVELS.length ? 'none' : '';

    resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // Clear keyboard highlights
  const kb = qs('tt-keyboard');
  if (kb) kb.querySelectorAll('.key-next, .key-active, .active').forEach(k => {
    k.classList.remove('key-next', 'key-active', 'active');
  });

  // Persist via App.saveProgress adhering to contract
  if (typeof App !== 'undefined' && App.saveProgress && App.state && App.state.currentStudent) {
    App.saveProgress(App.state.currentStudent.id, 'typing', sessionSummary);
  }

  return sessionSummary;
}
```

#### F. Public API Exposure
```javascript
window.TypingTrainer = {
  init(containerId) {
    renderUI(containerId);
  },
  start(level) {
    const lvlId = Number(level) || 1;
    startLevel(Math.max(1, Math.min(lvlId, LEVELS.length)));
  },
  finishSession() {
    return finishSession();
  },
  destroy() {
    destroyTimers();
    _currentLevel = null;
    _textStarted  = false;
  }
};
```

---

## 5. Verification Method

### 5.1. Automated Test Script
Execute test validation using the test suite runner:
```powershell
Set-Location "C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer"
node tests/runner.js
```

### 5.2. Synthetic Unit Test Verification Specification
A test suite (or assertion block) can verify the engine as follows:
```javascript
test('TypingTrainer metrics engine and finishSession contract', () => {
  env.loadAppStack();
  const { window, document } = env;

  // 1. Initialize container
  window.TypingTrainer.init('typing-container');
  window.TypingTrainer.start(1);

  // 2. Verify #tt-errors exists and is 0
  const errorsEl = document.querySelector('#tt-errors');
  assertNotNull(errorsEl, '#tt-errors must exist in DOM');
  assertEquals(errorsEl.textContent, '0', 'Initial errors must be 0');

  // 3. Verify initial CPM and accuracy
  assertEquals(document.querySelector('#tt-speed').textContent, '0', 'Initial CPM is 0');
  assertEquals(document.querySelector('#tt-accuracy').textContent, '100', 'Initial accuracy is 100%');

  // 4. Verify finishSession exists on public API
  assertTrue(typeof window.TypingTrainer.finishSession === 'function', 'finishSession must be a function on TypingTrainer');

  // 5. Verify finishSession returns expected schema
  const summary = window.TypingTrainer.finishSession();
  assertNotNull(summary);
  assertEquals(typeof summary.speed, 'number');
  assertEquals(typeof summary.accuracy, 'number');
  assertEquals(typeof summary.errors, 'number');
  assertEquals(typeof summary.level, 'number');
  assertEquals(typeof summary.duration, 'number');
  assertEquals(typeof summary.date, 'string');

  // 6. Verify result card displays all 4 metrics
  assertEquals(document.querySelector('#tt-res-errors').textContent, String(summary.errors));
});
```

### 5.3. Invalidation Conditions
- If `#tt-errors` is missing from `#tt-stats`, this finding is verified as an active defect.
- If `window.TypingTrainer.finishSession` returns undefined or is missing from `window.TypingTrainer`, contract violation is verified.
- If `App.saveProgress` is called without the `errors` attribute, contract M2 ↔ M4 is violated.
- If speed displays > 5000 CPM on first keystroke, spike bug is reproduced.
