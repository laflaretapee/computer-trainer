# Handoff Report — Explorer M2.R2.1: Post-Completion Keystroke Defect & State Guard Analysis

**Date**: 2026-11-12T17:08:00Z  
**Agent**: Explorer M2.R2.1 (`explorer_m2_r2_1`)  
**Role**: Teamwork Explorer (Investigation & Synthesis)  
**Milestone**: Milestone 2 (Touch Typing Ergonomics & Hands Visualizer) — Round 2  
**Target Recipient**: Sub-Orchestrator M2 (`sub_orch_m2`) & Worker M2.2 (`worker_m2_2`)  

---

## 1. Observation

### 1.1 Direct Observations in `modules/typing.js`
1. **Module State Declarations (`modules/typing.js:170-180`)**:
   ```javascript
   let _currentLevel = null;
   let _currentText = '';
   let _currentPos = 0;
   let _correctChars = 0;
   let _errors = 0;
   let _totalKeystrokes = 0;
   let _startTime = null;
   let _timerInterval = null;
   let _activeKeyTimer = null;
   let _textStarted = false;
   let _keyElementsMap = new Map();
   ```
   *Finding*: There is no state flag tracking completion (such as `_isFinished` or `_completed`).

2. **Input Event Handling (`modules/typing.js:699-753`) in `onKeyDown(e)`**:
   ```javascript
   function onKeyDown(e) {
     // Игнорируем служебные клавиши
     if (e.ctrlKey || e.altKey || e.metaKey) return;
     if (['Shift', 'CapsLock', 'Tab', 'Escape', 'F1', 'F2', 'F3', 'F4',
          'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12',
          'Insert', 'Delete', 'Home', 'End', 'PageUp', 'PageDown',
          'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
          'Backspace', 'Enter'].includes(e.key)) return;

     e.preventDefault();

     if (!_currentLevel) return;

     // Старт таймера при первом нажатии
     if (!_textStarted) {
       _textStarted = true;
       _startTime = Date.now();
       _timerInterval = setInterval(updateTimerDisplay, 1000);
     }

     const typedChar = e.key;
     const expectedChar = _currentText[_currentPos];
     const isCorrect = typedChar === expectedChar;

     _totalKeystrokes++;
     if (isCorrect) {
       _correctChars++;
     } else {
       _errors++;
     }
     ...
     _currentPos++;

     // Следующая позиция или завершение
     if (_currentPos < _currentText.length) {
       if (spans[_currentPos]) spans[_currentPos].classList.add('char-current');
       highlightNextKey();
     } else {
       // Упражнение завершено
       finishSession();
       return;
     }

     updateStats();
   }
   ```
   *Finding*:
   - Line 710 checks only `if (!_currentLevel) return;`. It does NOT check whether `_currentPos >= _currentText.length` or if the session has concluded.
   - When an exercise has already concluded ($`\_currentPos \ge \_currentText.length`$):
     - `expectedChar = _currentText[_currentPos]` evaluates to `undefined`.
     - `isCorrect = typedChar === expectedChar` evaluates to `false` for any character.
     - `_errors` increments ($1, 2, 3\dots$).
     - `_currentPos` increments past text length.
     - `if (_currentPos < _currentText.length)` evaluates to `false`.
     - `finishSession()` is re-invoked on every extra keystroke.

3. **Session Completion (`modules/typing.js:878-947`) in `finishSession()`**:
   ```javascript
   function finishSession() {
     destroyTimers();

     const rawElapsed = _startTime ? (Date.now() - _startTime) / 1000 : 0;
     const elapsedSeconds = Math.max(1, Math.round(rawElapsed));
     const speed = Math.round((_correctChars / elapsedSeconds) * 60);
     const total = _correctChars + _errors;
     const accuracy = total > 0 ? Math.max(0, Math.min(100, Math.round((_correctChars / total) * 100))) : 100;
     ...
     // Сохранение прогресса через App.saveProgress (M2 <-> M4)
     if (typeof App !== 'undefined' && App.saveProgress && App.state && App.state.currentStudent) {
       App.saveProgress(App.state.currentStudent.id, 'typing', sessionSummary);
     }

     return sessionSummary;
   }
   ```
   *Finding*:
   - `finishSession()` does not set a completion flag.
   - It does not blur `#tt-input`.
   - It repeatedly recalculates `accuracy` with inflated `_errors`, and calls `App.saveProgress()` repeatedly, pushing corrupted session summaries to `localStorage['trainer_progress']`.

4. **Container Focus Event Binding (`modules/typing.js:616-624`) in `bindEvents()`**:
   ```javascript
   const input = qs('tt-input');
   if (input) {
     input.addEventListener('keydown', onKeyDown);
     // Держим фокус
     _container.addEventListener('click', () => {
       if (_currentLevel) input.focus();
     });
   }
   ```
   *Finding*: When the exercise ends, clicking anywhere in `_container` (outside buttons) immediately re-focuses `#tt-input` because `_currentLevel` is non-null.

5. **Timer Reset Defect on Level Restart (`modules/typing.js:643-682`) in `startLevel()`**:
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
     ...
     renderText();
     updateStats();
     highlightNextKey();

     const input = qs('tt-input');
     if (input) { input.value = ''; input.focus(); }
   }
   ```
   *Finding*: `startLevel()` resets internal state and calls `updateStats()`. However, `updateStats()` (`lines 844-866`) only updates `#tt-speed`, `#tt-accuracy`, and `#tt-errors`. `#tt-time` is never updated. Consequently, if the previous session finished at `0:45`, clicking "Попробовать снова" (retry) leaves `#tt-time` displaying `0:45` until typing begins and the 1-second interval fires.

### 1.2 Direct Tool Commands & Verifications
1. **Adversarial Audit (`audit_adversarial.js`)**:
   Command: `node .agents/teamwork/reviewer_m2_1/audit_adversarial.js`
   Output:
   ```
   [Section 4: Adversarial Stress — Post-Completion & Edge Cases]
         [Adversarial Probe] Errors before extra keys: 0, after: 3
     FAIL: Extra keystrokes after exercise completion do not corrupt errors or double-invoke
           Error: Post-completion keystrokes altered error count: was 0, became 3
   ```
2. **Boundary Test Suite (`tests/tier2_boundaries/test_typing_metrics_boundaries.test.js`)**:
   Command: `node tests/runner.js -t 2`
   Diagnostic Output:
   ```
   [Diagnostic] #tt-time on restart: '0:45'
   ✔ ALL TESTS PASSED (16 passed in 0.43s)
   ```
   Lines 546-551 of `tests/tier2_boundaries/test_typing_metrics_boundaries.test.js` intentionally probe this defect:
   ```javascript
   const errorsAfter = document.querySelector('#tt-res-errors').textContent;
   const hasPostCompletionVulnerability = (errorsAfter !== '0');
   assertTrue(hasPostCompletionVulnerability, 'Empirically confirms post-completion keystroke vulnerability exists');
   assertEquals(errorsAfter, '5', 'Demonstrates that 5 post-completion keystrokes inflated errors from 0 to 5');
   ```

---

## 2. Logic Chain

1. **Root Cause Analysis of Post-Completion Keystrokes**:
   - In `modules/typing.js`, `_currentPos` indexes into `_currentText`.
   - When all $N$ characters are entered, `_currentPos` reaches $N$. `finishSession()` is executed.
   - However, `#tt-input` remains active in DOM, the keydown handler remains bound, and `_currentLevel` remains truthy.
   - Any follow-up keystroke invokes `onKeyDown()`.
   - Because `_currentLevel` is non-null, the check `if (!_currentLevel) return;` passes.
   - At index $N$, `_currentText[N]` is `undefined`.
   - Because `e.key !== undefined`, `isCorrect` evaluates to `false`.
   - `_errors` increments, `_currentPos` increments to $N+1$, and `finishSession()` is executed again.
   - Inside `finishSession()`, accuracy is recalculated using the inflated error count ($total = _correctChars + _errors$), the UI result card is updated with degraded scores, and `App.saveProgress()` is invoked repeatedly, polluting localStorage with corrupted sessions.

2. **Root Cause Analysis of `#tt-time` Retained on Restart**:
   - `#tt-time` is only set in `updateTimerDisplay()` (line 872) and `finishSession()` (line 906).
   - Neither `startLevel()` nor `updateStats()` writes to `#tt-time`.
   - When restarting via "Попробовать снова", `#tt-time` retains the completed time from the previous run until 1.0 second after the first keypress of the new run.

3. **Analysis of Focus Management**:
   - `_container.addEventListener('click', ...)` forces `input.focus()` whenever `_currentLevel` is set.
   - When finished, clicking the container outside of action buttons refocuses `#tt-input`, making accidental post-completion keystrokes significantly more likely in real classroom usage.

4. **Derivation of Fix Strategy**:
   - A robust state machine requires an explicit boolean flag: `let _isFinished = false;`.
   - **Boundary Guard**: In `onKeyDown`, add:
     ```javascript
     if (!_currentLevel || _isFinished || _currentPos >= _currentText.length) {
       e.preventDefault();
       return;
     }
     ```
   - **State Transition to Finished**: In `finishSession()`, set `_isFinished = true;` and call `input.blur()`.
   - **State Transition to Active**: In `startLevel()`, set `_isFinished = false;` and reset `#tt-time` text content to `'0:00'`.
   - **Container Click Guard**: In `bindEvents()`, change focus trigger to:
     ```javascript
     if (_currentLevel && !_isFinished) input.focus();
     ```
   - **Destruction**: In `destroy()`, set `_isFinished = true;`.

---

## 3. Caveats

1. **Synthetic Headless Events vs. Physical Focus**:
   In headless unit tests (e.g., `audit_adversarial.js` and `test_typing_metrics_boundaries.test.js`), events are dispatched via `input.dispatchEvent(new MockKeyboardEvent(...))`. Synthetic `dispatchEvent` ignores `input.blur()` or `input.disabled = true` in mock DOMs. Therefore, the early return guard inside `onKeyDown` (`if (_isFinished || _currentPos >= _currentText.length) return;`) is the critical, mandatory enforcement mechanism.
2. **Diagnostic Test Inversion in Tier 2**:
   Challenger 2 wrote lines 548-550 and 570-572 of `tests/tier2_boundaries/test_typing_metrics_boundaries.test.js` to assert the *presence* of the defect so tests would pass before fixes. When Worker M2.2 applies the fix to `modules/typing.js`, those two test assertions in Tier 2 must be updated to assert the *absence* of the defect (`assertEquals(errorsAfter, '0')` and `assertEquals(timeOnRestart, '0:00')`).

---

## 4. Conclusion & Concrete Fix Strategy for Worker M2.2

### 4.1 Required Changes in `modules/typing.js`

#### Change 1: State Variable Declaration (around line 179)
```javascript
<<<<
  let _activeKeyTimer = null;
  let _textStarted = false;
  let _keyElementsMap = new Map();
====
  let _activeKeyTimer = null;
  let _textStarted = false;
  let _isFinished = false;
  let _keyElementsMap = new Map();
>>>>
```

#### Change 2: Input & Container Click Guard in `bindEvents()` (around lines 620-624)
```javascript
<<<<
    const input = qs('tt-input');
    if (input) {
      input.addEventListener('keydown', onKeyDown);
      // Держим фокус
      _container.addEventListener('click', () => {
        if (_currentLevel) input.focus();
      });
    }
====
    const input = qs('tt-input');
    if (input) {
      input.addEventListener('keydown', onKeyDown);
      // Держим фокус только во время активного упражнения
      _container.addEventListener('click', () => {
        if (_currentLevel && !_isFinished) input.focus();
      });
    }
>>>>
```

#### Change 3: Reset State and `#tt-time` in `startLevel(levelId)` (around lines 643-682)
```javascript
<<<<
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
====
    _currentLevel = LEVELS.find(l => l.id === levelId) || LEVELS[0];
    _currentText  = pickRandom(_currentLevel.texts);
    _currentPos   = 0;
    _correctChars = 0;
    _errors       = 0;
    _totalKeystrokes = 0;
    _textStarted  = false;
    _startTime    = null;
    _isFinished   = false;

    if (_keyElementsMap.size === 0) {
      buildKeyMap();
    }

    // Сброс таймера на табло
    const timeEl = qs('tt-time');
    if (timeEl) timeEl.textContent = '0:00';
>>>>
```

#### Change 4: Early Guard in `onKeyDown(e)` (around lines 708-712)
```javascript
<<<<
    e.preventDefault();

    if (!_currentLevel) return;
====
    // Защита от ввода после завершения или при отсутствии активного уровня
    if (!_currentLevel || _isFinished || _currentPos >= _currentText.length) {
      e.preventDefault();
      return;
    }

    e.preventDefault();
>>>>
```

#### Change 5: Set `_isFinished = true` and Blur Input in `finishSession()` (around lines 878-941)
```javascript
<<<<
  function finishSession() {
    destroyTimers();

    const rawElapsed = _startTime ? (Date.now() - _startTime) / 1000 : 0;
====
  function finishSession() {
    destroyTimers();
    _isFinished = true;

    const rawElapsed = _startTime ? (Date.now() - _startTime) / 1000 : 0;
>>>>
```
And inside `finishSession()` right after clearing key and hand highlights (around line 940):
```javascript
    updateHandsHighlight(null);

    // Снимаем фокус с поля ввода
    const input = qs('tt-input');
    if (input) {
      input.blur();
    }
```

#### Change 6: Invalidate State in `destroy()` (around line 960)
```javascript
<<<<
  function destroy() {
    destroyTimers();
    _currentLevel = null;
    _textStarted  = false;
====
  function destroy() {
    destroyTimers();
    _currentLevel = null;
    _textStarted  = false;
    _isFinished   = true;
>>>>
```

---

### 4.2 Required Test Assertions Update for `tests/tier2_boundaries/test_typing_metrics_boundaries.test.js`

In `tests/tier2_boundaries/test_typing_metrics_boundaries.test.js`:

1. **Lines 545-551**:
```javascript
<<<<
      const errorsAfter = document.querySelector('#tt-res-errors').textContent;
      // Empirical verification:
      // Current behavior corrupts errors count (increments to '5') because _isFinished is not set.
      const hasPostCompletionVulnerability = (errorsAfter !== '0');
      assertTrue(hasPostCompletionVulnerability, 'Empirically confirms post-completion keystroke vulnerability exists');
      assertEquals(errorsAfter, '5', 'Demonstrates that 5 post-completion keystrokes inflated errors from 0 to 5');
====
      const errorsAfter = document.querySelector('#tt-res-errors').textContent;
      assertEquals(errorsAfter, '0', 'Post-completion keystrokes must be blocked; errors count must remain 0');
      assertEquals(document.querySelector('#tt-errors').textContent, '0', 'Live HUD error count must remain 0');
>>>>
```

2. **Lines 566-572**:
```javascript
<<<<
      const timeOnRestart = timeEl.textContent;
      // Empirical verification:
      // startLevel does not reset timeEl.textContent to '0:00', retaining '0:45'
      console.log(`[Diagnostic] #tt-time on restart: '${timeOnRestart}'`);
      const retainsPreviousTime = (timeOnRestart === '0:45');
      assertTrue(retainsPreviousTime, 'Empirically confirms #tt-time is not reset to 0:00 in startLevel');
====
      const timeOnRestart = timeEl.textContent;
      assertEquals(timeOnRestart, '0:00', 'Timer display #tt-time must be reset to 0:00 on level restart');
>>>>
```

---

## 5. Verification Method

Once Worker M2.2 implements these changes, the fix can be independently verified using:

1. **Adversarial Audit Suite (`audit_adversarial.js`)**:
   ```powershell
   cd C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer
   node .agents/teamwork/reviewer_m2_1/audit_adversarial.js
   ```
   *Expected Output*: `ADVERSARIAL AUDIT COMPLETE: 10 passed, 0 failed` (all 10 checks pass, zero findings).

2. **Tier 2 Boundary Tests**:
   ```powershell
   cd C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer
   node tests/runner.js -t 2
   ```
   *Expected Output*: `16 passed, 0 failed` (Suite 6 now tests that errors remain 0 on extra keys, and `#tt-time` resets to `'0:00'`).

3. **Milestone 2 Dedicated Suite**:
   ```powershell
   cd C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer
   node .agents/teamwork/worker_m2_1/verify_m2.js
   ```
   *Expected Output*: `13 passed, 0 failed`.

4. **Tier 5 Typing Adversarial Suite**:
   ```powershell
   cd C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer
   node tests/runner.js tests/tier5_adversarial/test_typing_adversarial.test.js
   ```
   *Expected Output*: `15 passed, 0 failed`.

### Invalidation Conditions
- If pressing keys after exercise completion causes `_errors` or `_totalKeystrokes` to increment, the guard has failed.
- If restarting an exercise does not display `0:00` immediately on `#tt-time`, the UI timer reset has failed.
- If restarting or switching levels prevents the user from typing new characters, `_isFinished` was not properly reset to `false`.
