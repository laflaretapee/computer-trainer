# Handoff Report — Explorer M2.R2.2: Timer Reset & DOM State Cleanup Analysis

**Date**: 2026-11-12T17:07:00Z  
**Agent**: Explorer M2.R2.2 (`explorer_m2_r2_2`)  
**Role**: Teamwork Explorer (Investigation, Root Cause Tracing, Concrete Fix Specification)  
**Milestone**: Milestone 2 — Touch Typing Ergonomics & Hands Visualizer (Iteration 2)  
**Target Recipient**: Sub-Orchestrator M2 (`sub_orch_m2`) (`20cfc342-6de1-46c2-b368-f4546fe8dfe0`) / Worker M2.2  

---

## 1. Observation

### 1.1 Direct Code Observations in `modules/typing.js`
- **Initial Template Markup**:
  - `modules/typing.js:558-563`:
    ```html
    <div class="typing-stats" id="tt-stats">
      <span class="stat-item">⚡ Скорость: <strong id="tt-speed">0</strong> сим/мин</span>
      <span class="stat-item">🎯 Точность: <strong id="tt-accuracy">100</strong>%</span>
      <span class="stat-item">❌ Ошибки: <strong id="tt-errors">0</strong></span>
      <span class="stat-item">⏱ Время: <strong id="tt-time">0:00</strong></span>
    </div>
    ```
    The initial HTML rendered by `renderUI()` displays `'0:00'` for `#tt-time`.

- **Level Initialization (`startLevel`)**:
  - `modules/typing.js:643-682`:
    ```javascript
    function startLevel(levelId) {
      destroyTimers();

      _currentLevel = LEVELS.find(l => l.id === levelId) || LEVELS[0];
      _currentText  = pickRandom(_currentLevel.texts);
      _currentPos   = 0;
      _correctChars = 0;
      _errors       = 0;
      _totalKeystrokes = 0;
      _textStarted  = false;
      _startTime    = null;

      if (_keyElementsMap.size === 0) {
        buildKeyMap();
      }

      // Скрываем результат
      const resultCard = qs('tt-result');
      if (resultCard) resultCard.style.display = 'none';

      // Заголовок уровня
      const title = qs('tt-level-title');
      if (title) title.textContent = `Уровень ${_currentLevel.id}: ${_currentLevel.name}`;

      // Активная кнопка уровня
      if (_container) {
        _container.querySelectorAll('.level-btn').forEach(btn => {
          btn.classList.toggle('active', parseInt(btn.dataset.level, 10) === levelId);
        });
      }

      // Рендерим текст и обновляем интерфейс
      renderText();
      updateStats();
      highlightNextKey();

      // Фокус на поле ввода
      const input = qs('tt-input');
      if (input) { input.value = ''; input.focus(); }
    }
    ```
    `startLevel` halts intervals via `destroyTimers()`, sets `_startTime = null`, resets internal metrics to 0, hides `#tt-result`, updates `#tt-level-title`, renders text, and calls `updateStats()`. Crucially, neither `startLevel` nor `destroyTimers` modifies `qs('tt-time').textContent`.

- **Live Stats Updates (`updateStats`)**:
  - `modules/typing.js:844-866`:
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
      ...
    ```
    `updateStats` queries only `qs('tt-speed')`, `qs('tt-accuracy')`, and `qs('tt-errors')`. It sets `speedEl` to `'0'`, `accuracyEl` to `'100'`, and `errorsEl` to `String(_errors)` (`'0'`). It completely ignores `qs('tt-time')`.

- **Timer Updating Mechanism (`updateTimerDisplay`)**:
  - `modules/typing.js:713-717` (`onKeyDown`):
    ```javascript
    if (!_textStarted) {
      _textStarted = true;
      _startTime = Date.now();
      _timerInterval = setInterval(updateTimerDisplay, 1000);
    }
    ```
  - `modules/typing.js:868-874`:
    ```javascript
    function updateTimerDisplay() {
      if (!_startTime) return;
      const elapsed = Math.round((Date.now() - _startTime) / 1000);
      const timeEl = qs('tt-time');
      if (timeEl) timeEl.textContent = formatTime(elapsed);
      updateStats();
    }
    ```
    The timer display is ONLY updated by `updateTimerDisplay()` on a 1000ms recurring interval, and upon session termination in `finishSession()` (`modules/typing.js:906`: `timeEl.textContent = formatTime(elapsedSeconds);`).

- **Teardown & Cleanup (`destroy`)**:
  - `modules/typing.js:960-971`:
    ```javascript
    function destroy() {
      destroyTimers();
      _currentLevel = null;
      _textStarted  = false;
      updateHandsHighlight(null);
      const kb = qs('tt-keyboard');
      if (kb) {
        kb.querySelectorAll('.key-next, .key-active, .active').forEach(k => {
          k.classList.remove('key-next', 'key-active', 'active');
        });
      }
    }
    ```
    `destroy()` does not clear `#tt-time`, nor does it null out `_startTime`.

### 1.2 Test Harness Observation in `tests/tier2_boundaries/test_typing_metrics_boundaries.test.js`
- Lines 553–573:
  ```javascript
  test('Timer display state on level restart: verify whether #tt-time resets to 0:00', () => {
    const { window, document } = env;

    window.TypingTrainer.init('screen-typing');
    window.TypingTrainer.start(1);

    const timeEl = document.querySelector('#tt-time');
    // Simulate completing after some time
    timeEl.textContent = '0:45';

    // Now restart level
    window.TypingTrainer.start(1);

    const timeOnRestart = timeEl.textContent;
    // Empirical verification:
    // startLevel does not reset timeEl.textContent to '0:00', retaining '0:45'
    console.log(`[Diagnostic] #tt-time on restart: '${timeOnRestart}'`);
    const retainsPreviousTime = (timeOnRestart === '0:45');
    assertTrue(retainsPreviousTime, 'Empirically confirms #tt-time is not reset to 0:00 in startLevel');
  });
  ```
- Command: `node tests/runner.js -t 2`
  Output:
  ```
  [Diagnostic] #tt-time on restart: '0:45'
  ✔ Timer display state on level restart: verify whether #tt-time resets to 0:00 (15ms)
  ```
  This empirically demonstrates that restarting a level retains `'0:45'`.

---

## 2. Logic Chain

1. **State Mutation Without DOM Synchronization**:
   When an exercise finishes, `finishSession()` sets `#tt-time` to the total elapsed duration (e.g., `'0:45'`). When the student clicks "🔄 Попробовать снова" (retry) or picks another level button, `startLevel()` sets `_startTime = null`, `_textStarted = false`, and invokes `updateStats()`. While `updateStats()` resets `#tt-speed` to `'0'`, `#tt-accuracy` to `'100'`, and `#tt-errors` to `'0'`, `#tt-time` is never touched, remaining frozen at `'0:45'`.

2. **First-Second Display Lag**:
   When the student types the first character of the new exercise, `_timerInterval = setInterval(updateTimerDisplay, 1000)` registers an interval scheduled to execute 1000ms into the future.
   Between $t = 0\text{s}$ (the first keystroke) and $t = 1\text{s}$ (the first interval tick):
   - The student has started typing.
   - Live speed is clamped to 0 CPM (via the spike guard).
   - `#tt-time` still reads `'0:45'` from the prior session.
   - At $t = 1\text{s}$, `updateTimerDisplay()` abruptly jumps the display from `'0:45'` to `'0:01'`.
   This confuses 7th-grade students and gives the false impression that time from the previous run is still counting against them.

3. **Complete Stats Bar Lifecycle Invariant**:
   In `modules/typing.js`, the live stats bar comprises four metrics: Speed, Accuracy, Errors, Time (`#tt-speed`, `#tt-accuracy`, `#tt-errors`, `#tt-time`).
   - Speed, Accuracy, and Errors are managed centrally inside `updateStats()`.
   - Time is managed asynchronously in `updateTimerDisplay()` and finalized in `finishSession()`.
   - By omitting Time from the initial reset phase in `startLevel()` and `updateStats()`, the stats bar invariant is broken.

4. **DOM Audit Across Stats Bar and Result Card**:
   - `#tt-speed`: Initial `'0'`, on restart `'0'`, live clamped to 0 under 1.0s. Correct.
   - `#tt-accuracy`: Initial `'100'`, on restart `'100'`, live recalculated. Correct.
   - `#tt-errors`: Initial `'0'`, on restart `'0'`, live incremented. Correct.
   - `#tt-time`: Initial `'0:00'`, on restart **STALE** (retains old duration). **Defect**.
   - `#tt-result`: Initial `display: none`, on restart `display: none`. Correct.
   - `#tt-keyboard`: `highlightNextKey()` clears `.key-next, .active`, but if a `flashKey` timer was pending when restart occurred, clearing the timer via `destroyTimers()` could theoretically leave a key with `.key-active`. Clearing `.key-active` in `startLevel()` provides defensive stability.

---

## 3. Caveats

1. **Test Suite Assertion Direction**:
   In `tests/tier2_boundaries/test_typing_metrics_boundaries.test.js` (lines 570–571), Challenger 2 wrote `assertTrue(retainsPreviousTime)` to prove the vulnerability exists. When Worker M2.2 implements the fix in `modules/typing.js`, that specific test assertion will naturally fail unless updated to `assertEquals(timeOnRestart, '0:00')`.
2. **Post-Completion Keystroke Defect Scope**:
   This report specifically focuses on the `#tt-time` timer reset defect and DOM cleanup. Post-completion input blocking (`_isFinished` flag) is being concurrently detailed by Explorer M2.R2.1. Both fixes are mutually orthogonal and complementary.

---

## 4. Conclusion & Concrete Fix Strategy

The `#tt-time` defect is caused by an omission in `startLevel()`, `updateStats()`, and `destroy()`, where `#tt-time` textContent is not reset to `'0:00'`.

### Concrete Drop-In Changes for Worker M2.2

#### Change 1: In `startLevel()` (`modules/typing.js:659-663`)
Explicitly reset `#tt-time` to `'0:00'` during level initialization:
```javascript
// BEFORE (line 659):
    // Скрываем результат
    const resultCard = qs('tt-result');
    if (resultCard) resultCard.style.display = 'none';

// AFTER:
    // Скрываем результат
    const resultCard = qs('tt-result');
    if (resultCard) resultCard.style.display = 'none';

    // Сброс таймера отображения
    const timeEl = qs('tt-time');
    if (timeEl) timeEl.textContent = '0:00';
```

#### Change 2: In `updateStats()` (`modules/typing.js:844-856`)
Ensure `updateStats()` treats the stats bar as an atomic unit, resetting `#tt-time` whenever the exercise is in an unstarted or reset state:
```javascript
// BEFORE (line 844):
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

// AFTER:
  function updateStats() {
    const speedEl    = qs('tt-speed');
    const accuracyEl = qs('tt-accuracy');
    const errorsEl   = qs('tt-errors');
    const timeEl     = qs('tt-time');

    if (errorsEl) errorsEl.textContent = String(_errors);

    if (!_startTime || !_textStarted) {
      if (speedEl) speedEl.textContent = '0';
      if (accuracyEl) accuracyEl.textContent = '100';
      if (timeEl) timeEl.textContent = '0:00';
      return;
    }
```

#### Change 3: In `destroy()` (`modules/typing.js:960-971`)
Ensure full DOM cleanup when unmounting/leaving the screen:
```javascript
// BEFORE (line 960):
  function destroy() {
    destroyTimers();
    _currentLevel = null;
    _textStarted  = false;
    updateHandsHighlight(null);
    const kb = qs('tt-keyboard');
    if (kb) {
      kb.querySelectorAll('.key-next, .key-active, .active').forEach(k => {
        k.classList.remove('key-next', 'key-active', 'active');
      });
    }
  }

// AFTER:
  function destroy() {
    destroyTimers();
    _currentLevel = null;
    _textStarted  = false;
    _startTime    = null;
    const timeEl = qs('tt-time');
    if (timeEl) timeEl.textContent = '0:00';
    updateHandsHighlight(null);
    const kb = qs('tt-keyboard');
    if (kb) {
      kb.querySelectorAll('.key-next, .key-active, .active').forEach(k => {
        k.classList.remove('key-next', 'key-active', 'active');
      });
    }
  }
```

#### Change 4: Test Assertion Update in `tests/tier2_boundaries/test_typing_metrics_boundaries.test.js`
In `test_typing_metrics_boundaries.test.js:567-571`:
```javascript
// BEFORE:
      console.log(`[Diagnostic] #tt-time on restart: '${timeOnRestart}'`);
      const retainsPreviousTime = (timeOnRestart === '0:45');
      assertTrue(retainsPreviousTime, 'Empirically confirms #tt-time is not reset to 0:00 in startLevel');

// AFTER:
      assertEquals(timeOnRestart, '0:00', '#tt-time must be reset to 0:00 on level restart');
```

---

## 5. Verification Method

1. **Verify State Reset via Dedicated Command**:
   ```powershell
   cd C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer
   node tests/runner.js -t 2
   ```
   *Expected Result*: All 16 tests in Tier 2 pass, asserting that `#tt-time` resets to `'0:00'` cleanly.

2. **Verify Adversarial Stress Suite**:
   ```powershell
   cd C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer
   node tests/tier5_adversarial/test_typing_adversarial.test.js
   ```
   *Expected Result*: All 14 tests across Suites 1–5 pass with zero failures.

3. **Verify DOM Invariants**:
   Inspect `#tt-time` in the browser or headless DOM across 3 lifecycle points:
   - Immediately after `startLevel(1)`: textContent === `'0:00'`.
   - After setting `#tt-time` to `'0:45'` and calling `startLevel(1)` or clicking `#tt-btn-retry`: textContent === `'0:00'`.
   - Immediately after `window.TypingTrainer.destroy()`: textContent === `'0:00'`.
