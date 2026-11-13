# Reviewer 2 & Adversarial Critic Report: Milestone 3 (Mouse Trainer & Informatics Tasks)

**Author**: Reviewer 2 (`reviewer_m3_2`)  
**Roles**: Reviewer, Adversarial Critic  
**Date**: 2026-11-12T22:02:00Z  
**Target Milestone**: Milestone 3 (`modules/mouse.js`, `index.html`, `style.css`, `app.js`, `tests/`)  
**Parent Orchestrator ID**: `d063fc93-1f0b-4efb-8a65-441b7294bfd3`  
**State Folder**: `C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\.agents\teamwork\reviewer_m3_2`  

---

## Review Summary

**Verdict**: **REQUEST_CHANGES**

While the pedagogical concept, Web Audio API synthesis engine, responsive 100vh layout, design token integration, and data schema are exceptionally well-engineered and 100% offline-compliant, the pull request cannot be approved in its current state due to **two re-entrancy edge-case vulnerabilities in `modules/mouse.js`** and **an asynchronous timer race condition in `tests/tier1_features/test_mouse_trainer.test.js`** that causes the master test runner (`node tests/runner.js`) to crash with exit code 1.

---

## 1. Observation

Direct observations with verbatim tool outputs, commands, file paths, and line numbers:

### Observation 1: Master Test Runner Process Crash via Unhandled Timer
- **Command executed**:
  ```powershell
  cd C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer
  node tests/runner.js
  ```
- **Result**: Command exited with code 1.
- **Verbatim Error Output**:
  ```
  AssertionError: Tooltip must appear after 500ms dwell time
  Expected not null, but got null
      at Timeout._onTimeout (C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\tests\tier1_features\test_mouse_trainer.test.js:345:9)
      at listOnTimeout (node:internal/timers:588:17)
      at process.processTimers (node:internal/timers:523:7) {
    generatedMessage: false,
    code: 'ERR_ASSERTION',
    actual: null,
    expected: '(not null)',
    operator: 'assertNotNull',
    diff: null
  }
  Node.js v22.18.0
  ```
- **Code Inspection**:
  - `tests/tier1_features/test_mouse_trainer.test.js` lines 323–356:
    ```javascript
    test('Hover dwell activates tooltip and completes inspection quest', (done) => {
      ...
      setTimeout(() => {
        const tt = usbWidget.querySelector('.mouse-tooltip');
        assertNotNull(tt, 'Tooltip must appear after 500ms dwell time'); // Line 345
        ...
        done();
      }, 550);
    });
    ```
  - `tests/runner.js` lines 349–353:
    ```javascript
    const execPromise = Promise.resolve().then(() => fn());
    await Promise.race([execPromise, timeoutPromise]);
    ```
  - `runner.js` does NOT supply a `done` callback to `fn`. It expects asynchronous tests to return a `Promise` (`async () => { ... }`). Consequently, `t.fn` returns `undefined` immediately, `runner.js` considers the test passed in 12ms, and immediately invokes `afterEach` (`MouseTrainer.destroy()` and `env.teardown()`). When the orphan `setTimeout` fires 550ms later, the mock DOM is already destroyed, throwing an uncaught exception out of band in the Node.js event loop during subsequent suite execution.

### Observation 2: Exercise 1 Target Click Re-entrancy / Score Spamming
- **Command executed**:
  ```powershell
  node tests/runner.js tests/tier5_adversarial/test_mouse_adversarial.test.js
  ```
- **Result**:
  ```
  ✖ Rapid clicking & spamming on active target: checks re-entry / duplicate hit vulnerability (46ms)
  AssertionError: Target click handler must be guarded against duplicate hit spamming (expected 100 pts, got 300)
  Expected strictly equal values:
    actual:   300
    expected: 100
  Numeric delta: +200
  ```
- **Code Inspection**:
  - `modules/mouse.js` lines 755–800:
    ```javascript
    target.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!_isSessionActive) return;
      ...
      _hits++;
      _score += points;
      target.classList.add('target-hit');
      ...
      safeSetTimeout(() => {
        if (target.parentNode) target.parentNode.removeChild(target);
        spawnNextTarget();
      }, 180);
    });
    ```
  - During the 180ms delay before `spawnNextTarget()`, no boolean latch or `{ once: true }` prevents multiple clicks from re-executing the click listener. Rapid successive clicks (spamming) award duplicate points (e.g., 300 instead of 100).

### Observation 3: Exercise 2 Window Launch Re-entrancy / Score Duplication
- **Command executed**:
  ```powershell
  node tests/runner.js tests/tier5_adversarial/test_mouse_adversarial.test.js
  ```
- **Result**:
  ```
  ✖ Duplicate double-click during simulated window delay: verifies re-entry safety (12ms)
  AssertionError: Duplicate double-click during simulated window transition must be blocked (expected 100 pts, got 200)
  Expected strictly equal values:
    actual:   '200'
    expected: '100'
  ```
- **Code Inspection**:
  - `modules/mouse.js` lines 933–961:
    ```javascript
    function handleSuccessfulDoubleClick(item) {
      const q = QUESTS[currentQuestIdx];
      if (!q) return;

      if (item.id === q.targetId) {
        _hits++;
        _score += 100;
        _progressCount = currentQuestIdx + 1;
        SoundSystem.playDoubleClick();
        updateHUD();

        launchSimulatedWindow(item);

        safeSetTimeout(() => {
          closeSimulatedWindow();
          currentQuestIdx++;
          ...
        }, 1600);
      }
    ```
  - During the 1600ms while the simulated OS window is displayed, `currentQuestIdx` has not yet incremented. If the target icon is double-clicked again during this window, `handleSuccessfulDoubleClick` fires again and increments `_score` by an extra 100 points.

### Observation 4: Verified Core Strengths & Compliances
- **Strict Offline Compliance**:
  - `python tests/test_adversarial_m1.py`: PASS (0 external network requests, 0 CDNs).
  - Headless Edge runtime network audit: 100% of network requests are `file:///` URLs.
- **Responsive Layout & 100vh Containment**:
  - Tested across **1280x720**, **1366x768**, and **1920x1080** for all 5 exercises via `tests/test_m3_reviewer_independent.py`:
    - `document.documentElement.scrollHeight <= window.innerHeight` (no vertical scrollbar).
    - `document.documentElement.scrollWidth <= window.innerWidth` (no horizontal scrollbar).
    - `#screen-mouse` has `height: 100vh; max-height: 100vh; overflow: hidden;`.
    - `#mouse-arena` maintains flexible height (>150px on 720p, >500px on 1080p).
- **M1 Design Token Compliance**:
  - `--color-primary`: `#2563eb` (PASS).
  - `--color-accent`: `#16a34a` (PASS).
  - `--radius-md`: `12px` (PASS).
  - Focus Ring: `button:focus-visible` and `.mouse-arena:focus-visible` render `3px solid var(--color-primary)` with `2px outline-offset`.
  - Mouse click suppression: `button:focus:not(:focus-visible)` suppresses focus outline cleanly.
- **Web Audio API (`SoundSystem`)**:
  - 100% mathematical synthesis using `OscillatorNode` (sine, triangle, sawtooth) and `GainNode` envelope decay.
  - Autoplay gesture unlock registered for `pointerdown`, `mousedown`, and `keydown`.
  - Mute persistence verified in `localStorage['trainer_sound_muted']`.
  - Blocking, null, or suspended `AudioContext` degrades gracefully without throwing errors.
- **Student and Content Data Preservation**:
  - `python check_students.py`: Exactly 79 students across 7-А, 7-Б, 7-В, 7-Г, 7-Д intact.
  - `python preview_content.py`: Exactly 175 slides across lessons 7-2-2 to 7-2-6 intact.
  - `app.js:saveProgress` stores mouse progress in `record.mouse` additively, preserves typing and test records, and recomputes unique star/score maximums in `completedTasks`.

---

## 2. Logic Chain

1. **Test Suite Stability & Build Integrity**:
   - The primary verification command required by the project specification is `node tests/runner.js`.
   - Running `node tests/runner.js` currently fails (Observation 1) because `tests/tier1_features/test_mouse_trainer.test.js` uses legacy `(done)` callback syntax that `runner.js` does not wait for.
   - When run alongside other suites, the orphan 550ms `setTimeout` executes against a torn-down DOM and throws an unhandled `AssertionError`, terminating the Node process with code 1.
   - Because CI/CD and verification commands must pass with code 0, this test race condition blocks release.

2. **Game Mechanics Integrity & Adversarial Robustness**:
   - In 7th-grade educational software, students frequently double-click rapidly or mash buttons.
   - Observation 2 demonstrates that clicking a target repeatedly in Exercise 1 awards multiple hits and hundreds of points before the 180ms despawn animation completes.
   - Observation 3 demonstrates that double-clicking an icon during the 1600ms simulated window popup in Exercise 2 awards duplicate completion points and increments progress prematurely.
   - Both vulnerabilities allow trivial score manipulation and invalidate accurate metrics.

3. **Synthesis & Conclusion**:
   - The architecture, layout, design tokens, audio synthesis, and curriculum exercises are sound.
   - However, because automated tests fail on `node tests/runner.js` and input spamming breaks metric integrity, changes must be requested to harden the handlers and fix the test harness.

---

## 3. Findings

### [Major] Finding 1: Unhandled Async Timer in `test_mouse_trainer.test.js` Crashes Test Runner
- **Location**: `tests/tier1_features/test_mouse_trainer.test.js`, lines 323–356
- **What**: Test `Hover dwell activates tooltip and completes inspection quest` declares `(done)` parameter, but `runner.js` only awaits Promises.
- **Why**: The test resolves immediately as synchronous, `afterEach` tears down the DOM, and 550ms later the orphan timer throws an unhandled assertion error that terminates the Node.js runner with exit code 1.
- **Suggestion**: Refactor test to be `async () => { ... }` using `await waitMs(550)` and `await waitMs(800)` (matching the pattern in `tests/tier5_adversarial/test_mouse_adversarial_challenger2.test.js`).

### [Major] Finding 2: Exercise 1 Single Click Target Re-entrancy / Score Spamming
- **Location**: `modules/mouse.js`, lines 755–800
- **What**: `target.addEventListener('click', ...)` allows multiple clicks to be processed during the 180ms despawn animation.
- **Why**: Rapid clicking awards up to 300+ points instead of 100 points for a single target.
- **Suggestion**: Add a local boolean latch `let isHit = false;` in `spawnNextTarget()`, and check `if (isHit) return; isHit = true;` at the start of the click handler, or specify `{ once: true }` in `addEventListener`.

### [Major] Finding 3: Exercise 2 Double Click Re-entrancy During Window Popup
- **Location**: `modules/mouse.js`, lines 933–961
- **What**: `handleSuccessfulDoubleClick(item)` lacks a lock while the simulated window is open (1600ms).
- **Why**: Double-clicking the icon while the simulated window is displayed awards an extra 100 points and increments progress prematurely.
- **Suggestion**: Add a module-level lock `let isWindowOpen = false;` in Exercise 2, checking `if (isWindowOpen) return; isWindowOpen = true;` inside `handleSuccessfulDoubleClick`, and resetting `isWindowOpen = false;` when `closeSimulatedWindow()` is executed.

---

## 4. Caveats

- **Operating System Environment**: Testing was performed on Windows 11 with Headless Microsoft Edge (Chromium engine) and Node.js v22.18.0.
- **Audio Output**: Physical speakers were muted during headless testing; audio synthesis was verified via Web Audio API node inspection, parameter validation, and audio call tracing.

---

## 5. Conclusion

**Verdict: REQUEST_CHANGES**

Milestone 3 is 95% complete with excellent UI/UX quality, pixel-perfect 100vh responsive containment, elegant mathematical audio synthesis, and strict offline operation. To reach 100% production readiness, the worker must:
1. Fix the async test in `tests/tier1_features/test_mouse_trainer.test.js:323` to use `async/await` instead of `(done)` so `node tests/runner.js` completes cleanly with 0 unhandled errors.
2. Add a one-time click guard (`isHit` latch) in `modules/mouse.js:755` (Exercise 1).
3. Add a transition lock (`isWindowOpen` guard) in `modules/mouse.js:933` (Exercise 2).

Once these three fixes are implemented, all Tier 1 and Tier 5 test suites will pass cleanly.

---

## 6. Verification Method

To independently verify the fixes:

1. **Execute Full Test Runner**:
   ```powershell
   cd C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer
   node tests/runner.js
   ```
   *Expected*: All test suites pass cleanly with exit code 0.

2. **Execute Tier 5 Adversarial Suite**:
   ```powershell
   node tests/runner.js tests/tier5_adversarial/test_mouse_adversarial.test.js
   ```
   *Expected*: All 15 tests pass (0 failures).

3. **Execute Independent Reviewer Suite**:
   ```powershell
   python tests/test_m3_reviewer_independent.py
   ```
   *Expected*: `ALL INDEPENDENT REVIEWER 2 VERIFICATION CHECKS PASSED!` across all viewports and exercises.

4. **Verify Accessibility and Design System**:
   ```powershell
   python tests/test_focus_a11y.py
   python tests/test_m1_design_system.py
   ```
   *Expected*: Both pass with 0 errors.
