# Handoff Report: Test Runner Crash Analysis & Refactoring Formulation

**Author**: Explorer 3 (`explorer_m3_2_3`)  
**Roles**: Investigation, Synthesis  
**Milestone**: Milestone 3 (Iteration 2)  
**Date**: 2026-11-12T17:15:00Z  
**Parent Orchestrator ID**: `d063fc93-1f0b-4efb-8a65-441b7294bfd3`  
**State Folder**: `C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\.agents\teamwork\explorer_m3_2_3`  

---

## 1. Observation

### Observation 1.1: Verbatim Master Test Runner Crash Output
Executing the project test runner across all suites via PowerShell:
```powershell
cd C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer
node tests/runner.js
```
The command terminates prematurely with exit code 1. Verbatim stack trace:
```
[Tier 1: Features] tests/tier1_features/test_mouse_trainer.test.js
...
    ✔ Hover dwell activates tooltip and completes inspection quest (12ms)
...
[Tier 5: Adversarial] tests/tier5_adversarial/test_mouse_adversarial_challenger2.test.js
🖥️ Тренажёр успешно запущен локально
C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\tests\helpers\assert.js:596
    throw new AssertionError({
    ^

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

### Observation 1.2: Root Cause in `tests/runner.js` Execution Engine
Inspecting `tests/runner.js` lines 339–356:
```javascript
async function runWithTimeout(fn, timeoutMs) {
  if (typeof fn !== 'function') return;

  let timerId;
  const timeoutPromise = new Promise((_, reject) => {
    timerId = setTimeout(() => {
      reject(new Error(`Test timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  const execPromise = Promise.resolve().then(() => fn());

  try {
    await Promise.race([execPromise, timeoutPromise]);
  } finally {
    clearTimeout(timerId);
  }
}
```
`runner.js` invokes `fn()` with zero arguments (`() => fn()`). It expects `fn` to return a `Promise` (e.g. `async () => { ... }`). It does **not** provide or support Mocha/Jest-style `(done)` callback parameters.

### Observation 1.3: Faulty Callback Pattern in `tests/tier1_features/test_mouse_trainer.test.js`
Inspecting lines 322–356 of `tests/tier1_features/test_mouse_trainer.test.js`:
```javascript
  describe('Suite 7: Exercise 5 — Системный навигатор (Hover & Tooltips)', () => {
    test('Hover dwell activates tooltip and completes inspection quest', (done) => {
      const { window, document } = env;
      window.MouseTrainer.init('mouse-container');
      window.MouseTrainer.selectExercise(5);

      const arena = document.getElementById('mouse-arena');
      const widgets = arena.querySelectorAll('.hover-item');
      assertEquals(widgets.length, 10, 'Must render 10 system tray widgets');

      const usbWidget = arena.querySelector('[data-widget-id="w_usb"]');
      assertNotNull(usbWidget, 'USB widget must exist');

      // Pointer enter starts dwell timer
      const enterEv = new MockMouseEvent('pointerenter', { bubbles: true });
      usbWidget.dispatchEvent(enterEv);

      // Immediately tooltip should not exist (< 500ms)
      assertEquals(usbWidget.querySelector('.mouse-tooltip'), null);

      // After 550ms tooltip is displayed
      setTimeout(() => {
        const tt = usbWidget.querySelector('.mouse-tooltip');
        assertNotNull(tt, 'Tooltip must appear after 500ms dwell time');
        assertContains(tt.textContent, 'USB-накопитель', 'Tooltip must contain USB description');

        // After quest completion (~1300ms total)
        setTimeout(() => {
          const scoreEl = document.getElementById('mouse-stat-score');
          assertEquals(scoreEl.textContent, '100', 'Score must increment on quest completion');
          done();
        }, 800);
      }, 550);
    });
  });
```
Because `fn` declares `(done)` but `runner.js` calls `fn()` with no parameters, `done` is `undefined`. `fn()` synchronously schedules a nested `setTimeout(..., 550)` and returns `undefined`. `runner.js` interprets this as instant success in 12ms and immediately invokes `afterEach`:
```javascript
  afterEach(() => {
    if (env) {
      if (env.window.MouseTrainer && typeof env.window.MouseTrainer.destroy === 'function') {
        env.window.MouseTrainer.destroy();
      }
      env.teardown();
      env = null;
    }
  });
```
When the scheduled 550ms timeout fires later in the Node event loop, `env` has been torn down, `usbWidget.querySelector('.mouse-tooltip')` evaluates to `null`, and `assertNotNull(tt, ...)` throws an uncaught `AssertionError`, crashing the entire Node process.

### Observation 1.4: Working Reference Pattern in `tests/tier5_adversarial/test_mouse_adversarial_challenger2.test.js`
Inspecting lines 47, 319–356, and 451–478 of `test_mouse_adversarial_challenger2.test.js`:
- Line 47:
  ```javascript
  const waitMs = (ms) => new Promise(resolve => setTimeout(resolve, ms));
  ```
- Lines 319–356:
  ```javascript
  test('2.1 Dwell timing discrimination: 400ms (no tooltip) vs 550ms (tooltip displayed)', async () => {
    ...
    wifiWidget.dispatchEvent(new MockMouseEvent('mouseenter', { bubbles: true }));
    await waitMs(400);
    assertEquals(wifiWidget.querySelector('.mouse-tooltip'), null);
    ...
    wifiWidget.dispatchEvent(new MockMouseEvent('mouseenter', { bubbles: true }));
    await waitMs(550);
    const tt = wifiWidget.querySelector('.mouse-tooltip');
    assertNotNull(tt);
  });
  ```
- Lines 451–478:
  ```javascript
  test('2.4 Quest inspection progression and completion verification', async () => {
    ...
    wEl.dispatchEvent(new MockMouseEvent('mouseenter', { bubbles: true }));
    await waitMs(1300);
    assertEquals(progEl.textContent, `${idx + 1} / 5`);
    assertEquals(parseInt(scoreEl.textContent, 10), (idx + 1) * 100);
    wEl.dispatchEvent(new MockMouseEvent('mouseleave', { bubbles: true }));
  });
  ```
Executing this suite in isolation (`node tests/runner.js tests/tier5_adversarial/test_mouse_adversarial_challenger2.test.js`) results in **12 passed, 0 failed (7.32s)** with exit code 0.

### Observation 1.5: Project-Wide Scan for Legacy `(done)` & Timers
An exhaustive filesystem search across all test suites in `tests/`:
- Query: `test\s*\([^\)]*done`
  - Output: Exactly **1 occurrence**: `tests/tier1_features/test_mouse_trainer.test.js:323`. No other files use `(done)`.
- Query: `setTimeout` in tests:
  - `tests/test_empirical_harness.js:54`: uses `await new Promise(r => setTimeout(r, 550))`
  - `tests/tier5_adversarial/test_mouse_adversarial_challenger2.test.js:47`: `const waitMs = (ms) => new Promise(...)`
  - `tests/tier1_features/test_mouse_trainer.test.js:343, 349`: nested callback timers (the bug location).

---

## 2. Logic Chain

1. **Test Runner Contract**:
   - `tests/runner.js` relies on `Promise.race([Promise.resolve().then(() => fn()), timeoutPromise])`.
   - Any test function that relies on async delays must return a Promise that remains pending until all assertions are verified.

2. **The Masking Anomaly**:
   - Running `node tests/runner.js tests/tier1_features/test_mouse_trainer.test.js` alone takes 250ms total. Because Node exits cleanly once all synchronous work in the runner completes, the process terminates *before* the 550ms timer ever fires. This masked the bug during isolated single-file testing.
   - When running the full suite (`node tests/runner.js`) or pairing it with other suites (`node tests/runner.js test_mouse_trainer.test.js test_mouse_adversarial_challenger2.test.js`), total runtime exceeds 1000ms. Consequently, the 550ms timer fires during the execution of subsequent suites.

3. **Lifecycle Desynchronization**:
   - Because `(done)` is ignored by `runner.js`, `test_mouse_trainer.test.js` test 12 is marked as passed in 12ms.
   - The runner proceeds to `afterEach`, calling `window.MouseTrainer.destroy()` and `env.teardown()`.
   - At t = 550ms, `setTimeout` fires in Node's event loop. It attempts to query `usbWidget.querySelector('.mouse-tooltip')` on an unmounted element, receives `null`, and throws `AssertionError`.
   - Because this error is thrown outside any active Promise chain in `runner.js`, Node treats it as an uncaught exception and aborts execution with exit code 1.

4. **Remediation Strategy**:
   - Declare `const waitMs = (ms) => new Promise(resolve => setTimeout(resolve, ms));` in `test_mouse_trainer.test.js`.
   - Convert `test('Hover dwell...', (done) => { ... })` to `test('Hover dwell...', async () => { ... })`.
   - Replace nested `setTimeout` calls with sequential `await waitMs(550)` and `await waitMs(800)`.
   - Ensure the test function returns a Promise that holds `runner.js` in place for the full 1350ms duration, guaranteeing `afterEach` runs *only after* all assertions execute and pass.

---

## 3. Caveats

- **Read-Only Investigation Role**: Per team constraints, this explorer did not edit `tests/tier1_features/test_mouse_trainer.test.js` directly. The formulated solution is presented as a ready-to-apply diff patch.
- **Suite Duration Impact**: Converting this test to `async/await` increases its execution time from an artificial 12ms to its true empirical duration (~1350ms). This is well below the `runner.js` 5000ms default test timeout.
- **Unrelated Tier 5 Failures**: Fixing this test runner crash resolves the fatal process termination, enabling `runner.js` to finish all test suites. Note that `tests/tier5_adversarial/test_mouse_adversarial.test.js` currently reports 2 functional failures in `modules/mouse.js` (Exercise 1 target click re-entrancy and Exercise 2 window open re-entrancy), which are being investigated by Explorers 1 and 2.

---

## 4. Conclusion & Drop-In Solution

### 4.1 Exact Unified Diff for `tests/tier1_features/test_mouse_trainer.test.js`

```diff
--- a/tests/tier1_features/test_mouse_trainer.test.js
+++ b/tests/tier1_features/test_mouse_trainer.test.js
@@ -30,6 +30,8 @@ const {
   MockDataTransfer
 } = domEnv;
 
+const waitMs = (ms) => new Promise(resolve => setTimeout(resolve, ms));
+
 describe('Tier 1: Mouse Trainer (modules/mouse.js)', () => {
   let env = null;
 
@@ -320,7 +322,7 @@ describe('Tier 1: Mouse Trainer (modules/mouse.js)', () => {
   // ═══════════════════════════════════════════════════════════════════════════
 
   describe('Suite 7: Exercise 5 — Системный навигатор (Hover & Tooltips)', () => {
-    test('Hover dwell activates tooltip and completes inspection quest', (done) => {
+    test('Hover dwell activates tooltip and completes inspection quest', async () => {
       const { window, document } = env;
       window.MouseTrainer.init('mouse-container');
       window.MouseTrainer.selectExercise(5);
@@ -340,17 +342,15 @@ describe('Tier 1: Mouse Trainer (modules/mouse.js)', () => {
       assertEquals(usbWidget.querySelector('.mouse-tooltip'), null);
 
       // After 550ms tooltip is displayed
-      setTimeout(() => {
-        const tt = usbWidget.querySelector('.mouse-tooltip');
-        assertNotNull(tt, 'Tooltip must appear after 500ms dwell time');
-        assertContains(tt.textContent, 'USB-накопитель', 'Tooltip must contain USB description');
+      await waitMs(550);
 
-        // After quest completion (~1300ms total)
-        setTimeout(() => {
-          const scoreEl = document.getElementById('mouse-stat-score');
-          assertEquals(scoreEl.textContent, '100', 'Score must increment on quest completion');
-          done();
-        }, 800);
-      }, 550);
+      const tt = usbWidget.querySelector('.mouse-tooltip');
+      assertNotNull(tt, 'Tooltip must appear after 500ms dwell time');
+      assertContains(tt.textContent, 'USB-накопитель', 'Tooltip must contain USB description');
+
+      // After quest completion (~1300ms total: 550ms dwell + 700ms inspect + buffer)
+      await waitMs(800);
+      const scoreEl = document.getElementById('mouse-stat-score');
+      assertEquals(scoreEl.textContent, '100', 'Score must increment on quest completion');
     });
   });
```

### 4.2 Complete Replacement Block for Lines 322–356
```javascript
  describe('Suite 7: Exercise 5 — Системный навигатор (Hover & Tooltips)', () => {
    test('Hover dwell activates tooltip and completes inspection quest', async () => {
      const { window, document } = env;
      window.MouseTrainer.init('mouse-container');
      window.MouseTrainer.selectExercise(5);

      const arena = document.getElementById('mouse-arena');
      const widgets = arena.querySelectorAll('.hover-item');
      assertEquals(widgets.length, 10, 'Must render 10 system tray widgets');

      const usbWidget = arena.querySelector('[data-widget-id="w_usb"]');
      assertNotNull(usbWidget, 'USB widget must exist');

      // Pointer enter starts dwell timer
      const enterEv = new MockMouseEvent('pointerenter', { bubbles: true });
      usbWidget.dispatchEvent(enterEv);

      // Immediately tooltip should not exist (< 500ms)
      assertEquals(usbWidget.querySelector('.mouse-tooltip'), null);

      // After 550ms tooltip is displayed
      await waitMs(550);

      const tt = usbWidget.querySelector('.mouse-tooltip');
      assertNotNull(tt, 'Tooltip must appear after 500ms dwell time');
      assertContains(tt.textContent, 'USB-накопитель', 'Tooltip must contain USB description');

      // After quest completion (~1300ms total)
      await waitMs(800);

      const scoreEl = document.getElementById('mouse-stat-score');
      assertEquals(scoreEl.textContent, '100', 'Score must increment on quest completion');
    });
  });
```

### 4.3 (Optional Defense-in-Depth) Runner-Level Callback Support in `tests/runner.js`
While refactoring the test to `async/await` is the idiomatic fix, `tests/runner.js:349` can also be reinforced to support `(done)` callback arity (`fn.length > 0`) so future test suites won't fail if someone writes a callback:
```javascript
  let execPromise;
  if (fn.length > 0) {
    execPromise = new Promise((resolve, reject) => {
      let settled = false;
      const done = (err) => {
        if (settled) return;
        settled = true;
        if (err) reject(err);
        else resolve();
      };
      try {
        const ret = fn(done);
        if (ret && typeof ret.then === 'function') {
          ret.then(() => done(), done);
        }
      } catch (err) {
        done(err);
      }
    });
  } else {
    execPromise = Promise.resolve().then(() => fn());
  }
```

---

## 5. Verification Method

Once the implementer applies the diff in Section 4.1:

1. **Verify Paired Execution with Challenger 2**:
   ```powershell
   cd C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer
   node tests/runner.js tests/tier1_features/test_mouse_trainer.test.js tests/tier5_adversarial/test_mouse_adversarial_challenger2.test.js
   ```
   - **Expected Result**: Both suites execute to 100% completion (27 passed, 0 failed, exit code 0). Zero unhandled timer errors.

2. **Verify Full Test Runner**:
   ```powershell
   node tests/runner.js
   ```
   - **Expected Result**: The runner processes all 6 test files without terminating prematurely from unhandled `Timeout._onTimeout` assertion errors.
