# Handoff Report — Challenger M2.2: Empirical Metrics & Boundary Stress Test

**Date**: 2026-11-12T16:58:00Z  
**Agent**: Challenger M2.2 (`challenger_m2_2`)  
**Role**: Adversarial Challenger & Specialist (Testing Automation / Empirical Challenge)  
**Milestone**: Milestone 2 — Touch Typing Ergonomics & Hands Visualizer  
**Target Recipient**: Sub-Orchestrator M2 (`sub_orch_m2`) / Parent Orchestrator  
**Verdict**: **REQUEST_CHANGES** (Mathematical boundary calculations pass, but empirical stress testing uncovered 1 high-severity state corruption bug and 1 UI timer reset defect)

---

## 1. Observation

### 1.1 Direct Observations in `modules/typing.js`
- **Initial State & Boundaries**:
  - `startLevel(levelId)` (`modules/typing.js:643-682`) initializes `_currentPos = 0`, `_correctChars = 0`, `_errors = 0`, `_totalKeystrokes = 0`, `_textStarted = false`, `_startTime = null`.
  - `updateStats()` (`modules/typing.js:844-866`) sets speed to `'0'` and accuracy to `'100'` when `!_startTime || !_textStarted`.
- **First Keystroke Speed Spike Guard**:
  - `modules/typing.js:859`:
    ```javascript
    const speed = elapsedSeconds >= 1.0 ? Math.round((_correctChars / elapsedSeconds) * 60) : 0;
    ```
    Clamps live speed to 0 until elapsed time reaches at least 1.0 second, eliminating the division-by-millisecond spike (e.g. 60,000 CPM).
  - In `finishSession()` (`modules/typing.js:882-883`):
    ```javascript
    const elapsedSeconds = Math.max(1, Math.round(rawElapsed));
    const speed = Math.round((_correctChars / elapsedSeconds) * 60);
    ```
    Clamps duration to a minimum of 1 second, preventing division by zero or sub-second spikes upon early exercise completion.
- **100% Error Rate and Accuracy Formula**:
  - `modules/typing.js:861-862`:
    ```javascript
    const total = _correctChars + _errors;
    const accuracy = total > 0 ? Math.max(0, Math.min(100, Math.round((_correctChars / total) * 100))) : 100;
    ```
    Guards against zero division; handles 0 correct characters and 20 errors cleanly yielding `0%`, with no `NaN` or negative values.
- **Interleaved Errors & Rounding**:
  - 10 correct and 5 wrong keystrokes calculate: `Math.round((10 / 15) * 100) = Math.round(66.6666...) = 67`.
- **M2 ↔ M4 Session Contract**:
  - `window.TypingTrainer.finishSession()` (`modules/typing.js:878-947`) returns:
    `{ speed, accuracy, errors, level, duration, date }` adhering strictly to contract specifications and invoking `App.saveProgress(studentId, 'typing', sessionSummary)`.

### 1.2 Identified Vulnerabilities (Direct Code & Execution Observations)
1. **High Severity Vulnerability — Post-Completion Input & Storage Corruption**:
   - In `modules/typing.js:698-753`, `onKeyDown(e)` does not verify if the exercise has already ended (`_currentPos >= _currentText.length` or a completion flag).
   - In `finishSession()` (`modules/typing.js:878-947`), `_currentLevel` is not set to `null`, no `_isFinished` flag is set, and `#tt-input` is not disabled.
   - When keystrokes occur after completion:
     * `_currentPos` is beyond text length, so `expectedChar = _currentText[_currentPos]` evaluates to `undefined`.
     * Any subsequent keystroke results in `isCorrect = false`.
     * `_errors` increments repeatedly (e.g., from 0 to 1, 2, 3, 4, 5...).
     * `_currentPos < _currentText.length` evaluates to false, causing `finishSession()` to be called again on every post-finish keystroke.
     * `App.saveProgress()` is invoked repeatedly, pushing degraded sessions into `localStorage['trainer_progress']` and corrupting the student's result card in the DOM.
   - Test observation from `tests/tier2_boundaries/test_typing_metrics_boundaries.test.js`:
     `[Diagnostic] Errors after post-completion typing: before=0, after=5`
2. **Low Severity Vulnerability — `#tt-time` Retained on Level Restart**:
   - `startLevel()` (`modules/typing.js:643`) clears timers but never resets `document.querySelector('#tt-time').textContent = '0:00'`.
   - `updateStats()` only updates speed, accuracy, and errors.
   - If an exercise was finished in 45 seconds (`#tt-time` shows `'0:45'`) and the student clicks "Попробовать снова" (retry), `#tt-time` continues displaying `'0:45'` until the student starts typing and 1 second passes.
   - Test observation from `tests/tier2_boundaries/test_typing_metrics_boundaries.test.js`:
     `[Diagnostic] #tt-time on restart: '0:45'`

### 1.3 Execution Command & Output
- Command: `node tests/runner.js`
- Test Output:
  ```
  Running 3 test suites...
  [Standalone / Infra] tests/test_infra.test.js: 45 passed (0.20s)
  [Tier 1: Features] tests/tier1_features/test_mouse_trainer.test.js: 15 passed (0.21s)
  [Tier 2: Boundaries] tests/tier2_boundaries/test_typing_metrics_boundaries.test.js: 16 passed (0.33s)
  
  TEST EXECUTION SUMMARY BY TIER:
  ┌────────────────────────────────┬──────────┬──────────┬───────────┬──────────┬────────────┐
  │ Tier / Suite                   │   Passed │   Failed │   Skipped │    Total │   Duration │
  ├────────────────────────────────┼──────────┼──────────┼───────────┼──────────┼────────────┤
  │ Standalone / Infra             │       45 │        0 │         0 │       45 │      0.20s │
  │ Tier 1: Features               │       15 │        0 │         0 │       15 │      0.21s │
  │ Tier 2: Boundaries             │       16 │        0 │         0 │       16 │      0.33s │
  ├────────────────────────────────┼──────────┼──────────┼───────────┼──────────┼────────────┤
  │ TOTALS                         │       76 │        0 │         0 │       76 │      0.73s │
  └────────────────────────────────┴──────────┴──────────┴───────────┴──────────┴────────────┘
  ✔ ALL TESTS PASSED (76 passed in 0.73s)
  ```

---

## 2. Logic Chain

1. **Spike Guard Correctness**:
   Under worker M2.1's fix, when `elapsedSeconds < 1.0`, `updateStats()` explicitly assigns `0` to speed. In empirical test `tests/tier2_boundaries/test_typing_metrics_boundaries.test.js`, testing timestamps at $t = 0\text{ms}$, $t = 100\text{ms}$, and $t = 999\text{ms}$ consistently yields speed $= 0$. At $t = 1000\text{ms}$, speed evaluates to $\frac{4}{1.0} \times 60 = 240\text{ CPM}$. In `finishSession()`, `elapsedSeconds` is clamped with `Math.max(1, Math.round(rawElapsed))`, preventing near-zero division and ensuring speed never spikes to $60,000\text{ CPM}$.
2. **Mathematical Boundary & Rounding**:
   - Initial state ($0$ keystrokes): `total = 0`, accuracy defaults cleanly to $100\%$, errors $= 0$, speed $= 0$.
   - $100\%$ error rate ($20$ wrong keystrokes): `_correctChars = 0`, `_errors = 20`, $\text{accuracy} = \text{Math.round}(0 / 20 \times 100) = 0\%$, avoiding `NaN` or negative values.
   - Interleaved error rate ($10$ correct, $5$ wrong): total $= 15$, $\frac{10}{15} \times 100 = 66.666\dots\%$, `Math.round()` produces $67\%$, matching exact requirements.
3. **Post-Completion Defect Mechanism**:
   Because `modules/typing.js` lacks an `_isFinished` boolean flag and does not disable `#tt-input` upon completion:
   - The keydown event listener on `#tt-input` remains active.
   - If a student presses any key while the result card is visible, `onKeyDown()` continues execution.
   - Because `_currentPos >= _currentText.length`, `_currentText[_currentPos]` is `undefined`.
   - The keystroke is flagged as an error, increments `_errors`, and immediately enters the completion branch (`_currentPos < _currentText.length` is false).
   - `finishSession()` is invoked anew, calling `App.saveProgress()` and polluting student progress records with duplicate, degraded scores.
4. **Timer Display Reset Mechanism**:
   `startLevel()` resets internal `_startTime = null` and halts the interval timer via `destroyTimers()`. However, the DOM node `#tt-time` is never updated to `'0:00'`. `updateStats()` does not update `#tt-time`, leaving the old elapsed duration rendered on screen until the student types a character and the first $1000\text{ms}$ interval tick fires.

---

## 3. Caveats

1. The core mathematical formulas implemented by Worker M2.1 are mathematically sound and meet the explicit acceptance criteria.
2. In typical automated end-to-end tests where keystrokes stop exactly at the last character of the exercise, the post-completion bug does not trigger. However, in real-world classroom usage with 7th-grade students, extra keystrokes after finishing an exercise are routine.
3. In strict compliance with the **Review-Only Key Constraint**, Challenger M2.2 has not directly modified `modules/typing.js`, instead writing the adversarial test suite and filing this change request with concrete code remedies.

---

## 4. Conclusion & Verdict

**Verdict**: **REQUEST_CHANGES**

Worker M2.1 should make the following targeted modifications in `modules/typing.js`:

1. **Fix Post-Completion Input & Storage Corruption**:
   - Add state flag: `let _isFinished = false;` (in state variables around line 180).
   - In `startLevel(levelId)`: set `_isFinished = false;`.
   - In `onKeyDown(e)`: add early return: `if (!_currentLevel || _isFinished) return;`.
   - In `finishSession()`: set `_isFinished = true;`.
2. **Fix Timer Reset on Restart**:
   - In `startLevel(levelId)`: add `const timeEl = qs('tt-time'); if (timeEl) timeEl.textContent = '0:00';`.

Once Worker M2.1 implements these two concise fixes, Milestone 2 will achieve complete mathematical and state-machine robustness.

---

## 5. Verification Method

To independently verify these findings:

1. **Run Master Test Suite**:
   ```powershell
   cd C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer
   node tests/runner.js
   ```
   *Result*: 76 tests across Standalone/Infra, Tier 1, and Tier 2 boundaries pass in ~0.73s.

2. **Run Dedicated Tier 2 Boundaries Suite**:
   ```powershell
   cd C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer
   node tests/runner.js -t 2
   ```
   *Expected*: 16/16 tests pass, including tests demonstrating:
   - Initial 0-keystroke state: speed=0, accuracy=100, errors=0.
   - First keystroke spike guard: speed=0 at 0ms, 100ms, 999ms; 240 CPM at 1000ms.
   - 100% error rate: accuracy cleanly drops to 0%, errors=20.
   - Interleaved errors: 10 correct, 5 wrong -> 67% accuracy, 5 errors.
   - Post-completion keystroke diagnostic proving errors increase post-finish.
   - Timer reset diagnostic showing `#tt-time` retains previous time on restart.
