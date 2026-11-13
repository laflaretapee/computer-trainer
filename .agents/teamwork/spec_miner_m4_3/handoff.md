# FocusGuard Anti-Cheat Specification (Feature F21) & Cross-Module Interface Contracts
**Milestone 4 — Specification Mining and Architectural Blueprint**
*Author: spec_miner_m4_3*  
*Date: 2026-11-13*  
*Target Codebase: 7th-Grade Computer Trainer SPA (`typing.js`, `mouse.js`, `app.js`, `teacher.js`, `index.html`)*

---

## 1. Executive Summary & Authoritative Directives

Per `ORIGINAL_REQUEST.md` (Follow-up 3 — 2026-11-12T17:10:42Z), `PROJECT.md`, and `SCOPE.md`, the primary objective of Feature F21 (**FocusGuard Anti-Cheat Protection**) is to ensure integrity in the classroom environment for 7th-grade students who tend to switch tabs to play online games or look up answers during computer training exercises.

### Core Behavioral Requirements:
1. **Universal Coverage**: FocusGuard controls all three interactive evaluation modules:
   - Touch Typing Trainer (`modules/typing.js`)
   - Interactive Mouse Trainer (`modules/mouse.js`)
   - Theory Knowledge Mini-Tests (`app.js` test runner)
2. **Pre-Start Warning Screen**: Displayed before any evaluated session commences:
   > «⚠️ Внимание! Выход с вкладки или переключение в другое окно/игру немедленно аннулирует результат!»
   Includes a confirmation button («Я готов, начать») and an optional/recommended button for Fullscreen mode (`requestFullscreen()`).
3. **Window Focus & Visibility Monitoring**: Active **strictly and exclusively** during ongoing exercise execution. FocusGuard must remain **completely inactive** when navigating menus, class lists, slide viewer, teacher panel, or viewing completed score cards.
4. **Instant Voiding on Violation**:
   - Immediate session interruption and cancellation (`destroy()` / `abort()`).
   - All timers stopped immediately.
   - **0 XP / 0 Stars / 0 Score**: Current attempt is completely discarded; no positive progress or metrics are saved to `localStorage['trainer_progress']`.
   - Logging: Increment `trainer_progress[studentId].focusViolations` and push violation telemetry to `sync_queue`.
5. **In-App Void Notification**:
   > «🚫 Попытка аннулирована: зафиксирован выход из окна/вкладки»
   Custom within-page modal with buttons to retry or return to menu.
   **Strict Prohibition**: Never use native `alert()` or `confirm()` as they trigger false-positive blur events in browser engines.

---

## 2. Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | FocusGuard | Pre-Start Warning Modal | Modal overlay presenting anti-cheat rules before exercise start | `moduleId`, `task/levelId` | DOM modal `#focusguard-warning-modal` with Confirm / Cancel / Fullscreen buttons | User cancel returns safely to previous view without penalty | `ORIGINAL_REQUEST.md` §Follow-up 3 |
| 2 | FocusGuard | Active Session Guard | Event monitoring on `visibilitychange` & `window.blur` during exercise | Window blur, document visibility state changes | Guard state `isGuarded: true/false` | Distinguishes internal DOM focus from genuine OS window switch | `ORIGINAL_REQUEST.md` §Follow-up 3, W3C Page Visibility API |
| 3 | FocusGuard | Immediate Session Abortion & Timers Teardown | Instantly terminates active module timers, audio synthesis, and DOM listeners | Confirmed violation event | Invocations of `TypingTrainer.destroy()`, `MouseTrainer.destroy()`, `App.abortTest()` | Ensures no dangling intervals or detached animation loops | `modules/typing.js:966`, `modules/mouse.js:1724` |
| 4 | FocusGuard | 0 XP / Score Voiding | Enforces zero reward and prevents saving current attempt to storage | Violation trigger | Current session metrics discarded; no session appended to `sessions` array | Preserves historical bests, only current attempt is voided | `SCOPE.md` §FocusGuard Contract |
| 5 | FocusGuard | Telemetry & Violation Logging | Records violation in student progress and telemetry sync queue | `studentId`, `timestamp`, `module`, `reason` | Increments `trainer_progress[studentId].focusViolations`, queues sync payload | Fallback to 0 if property absent in older records | `ORIGINAL_REQUEST.md` §Follow-ups 2 & 3 |
| 6 | FocusGuard | In-App Void Notification Modal | Informs student that attempt is cancelled due to tab/window switch | Triggered by violation | DOM modal `#focusguard-void-modal` with «Начать заново» and «В меню» buttons | Modal cannot be dismissed by backdrop click or Escape | `ORIGINAL_REQUEST.md` §Follow-up 3 |
| 7 | Cross-Module | Typing Session Lifecycle Hooks | Standby -> Pre-start Warning -> Active Typing -> Normal Finish OR Void | Level selection click | `isGuarded` lifecycle transitions | Handles edge cases where user clicks another level during run | `modules/typing.js` lines 610-689 |
| 8 | Cross-Module | Mouse Session Lifecycle Hooks | Tab selection -> Pre-start Warning -> Active Arena -> Normal Finish OR Void | Exercise selection click | `_isSessionActive` and `isGuarded` coordination | Currently `renderUI` auto-starts; requires pre-start gating | `modules/mouse.js` lines 558, 652 |
| 9 | Cross-Module | Mini-Tests Lifecycle Hooks | Test card click -> Pre-start Warning -> Question Runner -> Finish OR Void | Test card click | `state.activeTest` lifecycle management | Halts question progression and answer timers on void | `app.js` lines 426-533 |
| 10 | Cross-Module | Teacher Dashboard Audit & CSV | Visual badge for student violations and CSV export column | `trainer_progress` read | Column «Срывов фокуса», warning badge `⚠️ X` in teacher table, and CSV column | Displays 0 if clean | `modules/teacher.js` lines 80, 186 |

---

## 3. Edge Cases & False-Positive Prevention Analysis

| # | Feature | Input / Trigger | Observed / Expected Behavior | Architectural Mitigation |
|---|---------|-----------------|------------------------------|--------------------------|
| 1 | FocusGuard (`blur`) | Student clicks inside `#tt-input` or text area | Browser triggers `blur` on previous element or body | **ActiveElement Verification**: Check `document.hasFocus()` and ensure `document.activeElement` is within `document`. Filter out internal focus transitions. |
| 2 | FocusGuard (`blur`) | Student clicks mouse trainer target or drag item | Focus moves between DOM nodes | **Microtask/Timeout Debounce**: Debounce blur handler by 60ms; if `document.hasFocus() === true`, ignore event. |
| 3 | FocusGuard (`blur`) | In-app modal opens (slide viewer, help, pre-start) | In-app modal is a DOM element inside `#app-modal` | Does not blur browser window; `document.hasFocus()` remains `true`. Pre-start modal operates with guard disabled. |
| 4 | FocusGuard (`blur`) | Browser native `alert()` or `confirm()` called | Native dialog suspends execution and blurs page | **Strict Prohibition**: Completely eliminate `window.alert()` and `window.confirm()` from the application; replace with in-app HTML modals. |
| 5 | FocusGuard (`visibilitychange`) | Student switches browser tab or minimizes window | `document.visibilityState === 'hidden'` | **Authoritative Signal**: W3C Visibility API gives zero false positives. If `hidden` while `isGuarded === true`, trigger violation immediately. |
| 6 | FocusGuard (Lifecycle) | Student completes last key/target/question | Exercise finishes normally | **Synchronous Guard Teardown**: Call `FocusGuard.endSession()` synchronously *before* rendering result card or playing fanfare to prevent post-completion voiding. |
| 7 | FocusGuard (Navigation) | Student clicks «← В меню» button during exercise | User navigates away via internal UI | Internal navigation cleanly calls `FocusGuard.endSession()` and `module.destroy()` without incrementing violation counter. |
| 8 | FocusGuard (Fullscreen) | Student clicks Fullscreen button (`requestFullscreen`) | Browser transitions to fullscreen | Fullscreen transition may fire transient focus events; 60ms debounce and `document.fullscreenElement` check prevents false triggers. |
| 9 | FocusGuard (Re-entrancy) | Student gets voided, clicks «Начать заново» | Re-starting exercise | Clean teardown of previous event listeners and fresh guard registration; no duplicate event handlers. |
| 10 | FocusGuard (Historical Data) | Student has existing progress in `localStorage` | Schema migration | Default `focusViolations: 0` if field undefined in legacy records; non-destructive schema update. |

---

## 4. Current Codebase Inspection & Gap Analysis

### 4.1. Touch Typing Trainer (`modules/typing.js`)
- **Current Lifecycle**:
  - `renderUI()` binds `.level-btn` click -> calls `startLevel(lvlId)`.
  - `startLevel()` immediately sets up text, highlights, and focuses `#tt-input`.
  - Timer starts upon first keystroke (`_textStarted = false` -> `true`).
  - `finishSession()` stops timers, sets `_isFinished = true`, computes metrics, displays `#tt-result`, and calls `App.saveProgress()`.
  - `destroy()` resets internal variables and clears timers.
- **Identified Gaps for FocusGuard**:
  1. No pre-start warning gate: selecting a level immediately begins the exercise.
  2. No external query to check if a session is currently running (`isSessionActive`).
  3. No explicit `voidSession()` method to cancel without saving.
  4. If user clicks a level button while already typing, it restarts without warning.

### 4.2. Interactive Mouse Trainer (`modules/mouse.js`)
- **Current Lifecycle**:
  - `renderUI()` immediately executes line 558: `startExercise(_activeExerciseId)`.
  - `startExercise()` sets `_isSessionActive = true; _startTime = Date.now();` and starts 1-second interval timer immediately.
  - Tab buttons `.btn-exercise` call `selectExercise(id)` -> immediately calls `startExercise()`.
  - `finishSession()` sets `_isSessionActive = false`, calculates stars, displays `#mouse-result-card`, and calls `App.saveProgress()`.
  - `destroy()` sets `_isSessionActive = false`, clears timers, cancels drag, and empties arena.
- **Identified Gaps for FocusGuard**:
  1. `renderUI()` auto-starts exercise without any pre-start warning screen.
  2. `_isSessionActive` is a private variable inside the IIFE and is not exported on `window.MouseTrainer`.
  3. No explicit `voidSession()` method.

### 4.3. Theory Knowledge Mini-Tests (`app.js`)
- **Current Lifecycle**:
  - `_renderTests()` creates test cards with `.btn-start-test`.
  - Clicking `.btn-start-test` immediately calls `_runTest(testId)`.
  - `_runTest()` initializes `currentQ = 0; correct = 0;` and immediately renders the first question.
  - Answering the last question calls `finishTest()`, which calls `saveProgress(student.id, 'tests', result)`.
- **Identified Gaps for FocusGuard**:
  1. No pre-start warning screen.
  2. No active test session state variable in `App.state` (`isTestActive`).
  3. No `abortTest()` method to cancel without recording progress.

### 4.4. Teacher Panel (`modules/teacher.js`)
- **Current State**:
  - Table columns: `№`, `Класс`, `ФИО Ученика`, `Печать (лучшая)`, `Точность`, `Сессий печати`, `Тесты (сдано)`, `Действия`.
  - CSV export columns: `Класс`, `Ученик`, `ID`, `Сессий печати`, `Лучшая скорость`, `Точность (%)`, `Пройдено тестов`.
  - Uses native `confirm()` in reset buttons (lines 160, 171).
- **Identified Gaps for FocusGuard**:
  1. No column for `focusViolations`.
  2. No visual warning badge for students with violations.
  3. CSV export missing `focusViolations`.
  4. Use of native `confirm()` should be replaced or guarded so it never triggers during active sessions.

---

## 5. Architectural Specification & Cross-Module Interface Contracts

### 5.1. FocusGuard Core Architecture (`FocusGuard` Module)

FocusGuard shall be implemented as a dedicated controller in `app.js` (or `modules/focusguard.js` loaded before trainers) and exposed as `window.FocusGuard` and `App.FocusGuard`.

```
┌─────────────────────────────────────────────────────────────┐
│                      FocusGuard Core                        │
│                                                             │
│  State:                                                     │
│    _isGuarded: boolean                                      │
│    _activeModule: 'typing' | 'mouse' | 'tests' | null       │
│    _onVoidCallback: Function | null                         │
│    _blurTimer: number | null                                │
│                                                             │
│  Public API:                                                │
│    showWarningModal(options)                                │
│    startSession(module, onVoidCallback)                     │
│    endSession()                                             │
│    triggerViolation(reason)                                 │
│    isGuarded()                                              │
└──────────────▲──────────────────────────────▲───────────────┘
               │                              │
       DOM Listeners                  Module Coordination
  ┌────────────┴─────────────┐   ┌────────────┴─────────────┐
  │ document:visibilitychange│   │ TypingTrainer.destroy()  │
  │ window:blur (with filter)│   │ MouseTrainer.destroy()   │
  │                          │   │ App.abortTest()          │
  └──────────────────────────┘   └──────────────────────────┘
```

#### Exact API Signature Specification:

```javascript
window.FocusGuard = {
  /**
   * Initializes FocusGuard and ensures modal containers exist in the DOM.
   */
  init: function() {},

  /**
   * Checks whether FocusGuard is currently guarding an active exercise.
   * @returns {boolean}
   */
  isGuarded: function() {},

  /**
   * Displays the pre-start warning modal for an exercise.
   * @param {Object} options
   * @param {string} options.module - 'typing' | 'mouse' | 'tests'
   * @param {string|number} options.title - Name of exercise or level
   * @param {Function} options.onConfirm - Invoked when student clicks «Я готов, начать»
   * @param {Function} [options.onCancel] - Invoked if student backs out
   */
  showWarningModal: function(options) {},

  /**
   * Activates window focus and document visibility monitoring for an exercise.
   * Attaches window 'blur' and document 'visibilitychange' listeners.
   * @param {string} module - 'typing' | 'mouse' | 'tests'
   * @param {Function} onVoid - Callback executed when violation is confirmed
   */
  startSession: function(module, onVoid) {},

  /**
   * Deactivates monitoring cleanly upon legitimate exercise completion or exit.
   * Synchronously removes event listeners.
   */
  endSession: function() {},

  /**
   * Confirms a violation, executes immediate teardown, logs violation, and displays void modal.
   * @param {string} reason - 'window_blur' | 'tab_hidden'
   */
  triggerViolation: function(reason) {},

  /**
   * Displays the void notification modal with retry/menu buttons.
   * @param {Object} options
   * @param {string} options.module
   * @param {Function} options.onRetry
   * @param {Function} options.onMenu
   */
  showVoidModal: function(options) {}
};
```

---

### 5.2. Detailed Lifecycle Protocol

#### Step 1: Pre-Start Warning
1. When user requests to start an exercise (clicks a typing level, clicks a mouse exercise, or clicks «Начать тестирование»):
2. Instead of starting timers immediately, `FocusGuard.showWarningModal` is invoked.
3. DOM Modal `#focusguard-warning-modal` is displayed:
   - Header: `⚠️ Внимание! Контроль фокуса окна`
   - Body: `Выход с вкладки, сворачивание браузера или переключение в другое окно/игру немедленно аннулирует результат текущей попытки (0 XP)! Не открывайте другие программы до окончания упражнения.`
   - Optional Button: `⛶ Во весь экран` (calls `document.documentElement.requestFullscreen()`).
   - Action Button: `▶ Я готов, начать упражнение` (primary CTA).
   - Cancel Button: `Отмена` (returns to previous menu/list).
4. Guard state remains `_isGuarded = false` while in this modal.

#### Step 2: Session Commencement & Guard Activation
1. When the student clicks `▶ Я готов, начать упражнение`:
2. The warning modal closes.
3. `FocusGuard.startSession(module, onVoid)` is executed:
   - Sets `_isGuarded = true`.
   - Sets `_activeModule = module`.
   - Attaches `document.addEventListener('visibilitychange', _handleVisibilityChange)`.
   - Attaches `window.addEventListener('blur', _handleWindowBlur)`.
4. The target module starts its active exercise:
   - In Typing: `TypingTrainer.start(level)` starts, input focused.
   - In Mouse: `MouseTrainer.start(exerciseId)` starts, arena populated, timers running.
   - In Tests: `_runTest(testId)` renders question 1, test timer running.

#### Step 3: Clean Completion Path
1. Student successfully completes the exercise.
2. In the module's completion handler (`TypingTrainer.finishSession`, `MouseTrainer.finishSession`, `finishTest`):
   - **FIRST ACTION**: Call `FocusGuard.endSession()` synchronously.
   - Event listeners (`blur`, `visibilitychange`) are detached immediately.
   - `_isGuarded = false`.
3. Metrics are computed and `App.saveProgress()` persists the positive result.
4. Result card is rendered. Any subsequent window blur by the student is benign and ignored.

#### Step 4: Violation Path (Cheat Detected)
1. Event fires (`document.visibilityState === 'hidden'` OR genuine `window.blur` confirmed after 60ms debounce and `!document.hasFocus()`).
2. `FocusGuard.triggerViolation(reason)` is invoked:
   - **Teardown**: Immediately detach event listeners, set `_isGuarded = false`.
   - **Abort**: Execute registered `onVoid` callback:
     * In Typing: `TypingTrainer.destroy()`. Text cleared, timers killed, keyboard unhighlighted.
     * In Mouse: `MouseTrainer.destroy()`. Arena cleared, drag canceled, timers killed.
     * In Tests: `App.abortTest()`. Questions cleared, timers killed.
   - **Zero Rewards**: Absolutely NO call to `App.saveProgress(..., 'typing'|'mouse'|'tests')`. No XP, no stars, no speeds recorded.
   - **Violation Logging**:
     ```javascript
     const studentId = App.state.currentStudent ? App.state.currentStudent.id : null;
     if (studentId) {
       const all = App.getAllProgress();
       if (!all[studentId]) {
         all[studentId] = { studentId, focusViolations: 0, /* ... */ };
       }
       all[studentId].focusViolations = (all[studentId].focusViolations || 0) + 1;
       
       // Record in telemetry sync queue
       App.enqueueSyncPayload({
         type: 'focus_violation',
         studentId: studentId,
         timestamp: new Date().toISOString(),
         module: _activeModule,
         reason: reason
       });
       
       localStorage.setItem('trainer_progress', JSON.stringify(all));
     }
     ```
   - **Void Modal Rendered**: Show `#focusguard-void-modal`:
     * Header: `🚫 Попытка аннулирована!`
     * Body: `Зафиксирован выход из окна или переключение вкладки! По правилам урока во время выполнения задания запрещено переключаться на другие программы или игры. Результат текущей попытки обнулён (0 XP).`
     * Violation Badge: `⚠️ Нарушений на этом ПК: ${violationsCount}`
     * Button 1: `🔄 Начать заново` (re-triggers pre-start modal or restarts task).
     * Button 2: `🏠 В главное меню` (navigates to `#screen-menu`).

---

### 5.3. Cross-Module Signatures & DOM Element IDs

#### Required DOM Structure in `index.html`:
```html
<!-- Pre-Start Warning Modal -->
<div id="focusguard-warning-modal" class="modal-overlay focusguard-modal" style="display:none;" role="dialog" aria-modal="true" aria-labelledby="fg-warn-title">
  <div class="modal-box fg-modal-box">
    <div class="modal-header fg-warn-header">
      <h2 id="fg-warn-title">⚠️ Внимание! Контроль фокуса</h2>
    </div>
    <div class="modal-body fg-modal-body">
      <div class="fg-icon-wrap">🛡️</div>
      <p class="fg-warn-text">
        Выход с вкладки, сворачивание окна или переключение в другую программу/игру 
        <strong>немедленно аннулирует результат</strong> текущей попытки (0 XP)!
      </p>
      <p class="fg-warn-subtext">Выполняйте задание непрерывно до появления экрана с результатами.</p>
      <div class="fg-fullscreen-row">
        <button id="fg-btn-fullscreen" class="btn btn-secondary btn-sm" type="button">⛶ Во весь экран</button>
      </div>
    </div>
    <div class="modal-actions fg-modal-actions">
      <button id="fg-btn-start" class="btn btn-primary btn-lg" type="button">▶ Я готов, начать</button>
      <button id="fg-btn-cancel" class="btn btn-outline" type="button">Отмена</button>
    </div>
  </div>
</div>

<!-- Voided Attempt Modal -->
<div id="focusguard-void-modal" class="modal-overlay focusguard-modal" style="display:none;" role="dialog" aria-modal="true" aria-labelledby="fg-void-title">
  <div class="modal-box fg-modal-box fg-void-box">
    <div class="modal-header fg-void-header">
      <h2 id="fg-void-title">🚫 Попытка аннулирована!</h2>
    </div>
    <div class="modal-body fg-modal-body">
      <div class="fg-icon-wrap fg-void-icon">⚠️</div>
      <p class="fg-void-main">Зафиксирован выход из окна или переключение вкладки.</p>
      <p class="fg-void-desc">
        По правилам дисциплины результат текущей попытки полностью аннулирован (начислено 0 XP).
        Факт нарушения зафиксирован в журнале учителя.
      </p>
      <div class="fg-violation-stat">
        <span>Всего нарушений фокуса:</span>
        <strong id="fg-violation-count">1</strong>
      </div>
    </div>
    <div class="modal-actions fg-modal-actions">
      <button id="fg-btn-retry" class="btn btn-primary" type="button">🔄 Начать заново</button>
      <button id="fg-btn-menu" class="btn btn-secondary" type="button">🏠 В главное меню</button>
    </div>
  </div>
</div>
```

#### Module Interface Contract Matrix:

| Module | Method / Property | Contract Description |
|--------|-------------------|----------------------|
| `TypingTrainer` | `TypingTrainer.start(level)` | Starts typing session; invoked ONLY after FocusGuard warning confirmation. |
| `TypingTrainer` | `TypingTrainer.finishSession()` | Calls `FocusGuard.endSession()` before computing/persisting metrics. |
| `TypingTrainer` | `TypingTrainer.destroy()` | Clears `_timerInterval`, `_activeKeyTimer`, un-highlights keyboard, blurs input. Called on void. |
| `TypingTrainer` | `TypingTrainer.isSessionActive()` | Returns boolean whether text is started and not finished. |
| `MouseTrainer` | `MouseTrainer.start(exerciseId)` | Starts mouse exercise; invoked ONLY after FocusGuard warning confirmation. |
| `MouseTrainer` | `MouseTrainer.finishSession(customData)` | Calls `FocusGuard.endSession()` before computing/persisting metrics. |
| `MouseTrainer` | `MouseTrainer.destroy()` | Clears `_activeTimers`, `cancelActiveDrag()`, removes global listeners, empties arena. Called on void. |
| `MouseTrainer` | `MouseTrainer.isSessionActive()` | Returns boolean `_isSessionActive`. |
| `App` | `App.runTest(testId)` | Displays pre-start warning, then runs question runner with FocusGuard active. |
| `App` | `App.abortTest()` | Halts question progression and cleans test runner container. Called on void. |
| `App` | `App.saveProgress(studentId, module, data)` | Unchanged; must NOT be called when session is voided. |
| `TeacherPanel` | `TeacherPanel.renderTableRows()` | Renders `focusViolations` column with warning badge if count > 0. |
| `TeacherPanel` | `TeacherPanel.exportCSV()` | Appends `focusViolations` to CSV row format. |

---

## 6. Comprehensive Test Specifications (Tiers 1–5)

To guarantee opaque-box testability without external dependencies, all FocusGuard behaviors must be validated across the test runner tiers:

### Tier 1: Feature Isolation Tests (`tests/tier1_features/test_focusguard.test.js`)
1. **FG-T1-01: Default Inactive State**:
   Verify `FocusGuard.isGuarded() === false` on application boot, login screen, class picker, student list, menu, slide viewer, and teacher panel.
2. **FG-T1-02: Pre-Start Modal Rendering**:
   Verify that clicking a typing level or mouse task opens `#focusguard-warning-modal` and does NOT start exercise timers until confirmed.
3. **FG-T1-03: Pre-Start Cancel Safe Exit**:
   Verify clicking «Отмена» in `#focusguard-warning-modal` closes modal, leaves `isGuarded() === false`, and increments 0 violations.
4. **FG-T1-04: Guard Activation on Confirmation**:
   Verify clicking «▶ Я готов, начать» closes warning modal, sets `FocusGuard.isGuarded() === true`, and starts exercise.
5. **FG-T1-05: Tab Switch (`visibilitychange`) Detection in Typing**:
   Simulate `document.visibilityState = 'hidden'` + dispatch `visibilitychange` event during active typing. Assert:
   - `TypingTrainer.destroy()` is invoked (timers cleared).
   - `FocusGuard.isGuarded()` transitions to `false`.
   - 0 XP and no typing session saved in `trainer_progress[studentId]`.
   - `trainer_progress[studentId].focusViolations === 1`.
   - `#focusguard-void-modal` is visible.
6. **FG-T1-06: Window Blur (`blur`) Detection in Mouse Trainer**:
   Simulate `window.blur` while `document.hasFocus() === false` during mouse exercise. Assert:
   - `MouseTrainer.destroy()` invoked, arena cleared, drag canceled.
   - 0 stars and no mouse session saved in `trainer_progress[studentId]`.
   - `trainer_progress[studentId].focusViolations === 1`.
   - `#focusguard-void-modal` is visible.
7. **FG-T1-07: Focus Loss in Theory Mini-Tests**:
   Trigger `visibilitychange` during `_runTest`. Assert:
   - Test aborted, questions removed.
   - No entry in `tests.sessions`.
   - Violation recorded in storage.
8. **FG-T1-08: Normal Completion Clears Guard**:
   Complete typing exercise normally. Assert:
   - `finishSession()` succeeds and stores speed/accuracy.
   - `FocusGuard.isGuarded() === false`.
   - Subsequent `window.blur` or `visibilitychange` does NOT trigger void modal or increment violation counter.

### Tier 2: Boundary & Edge Case Tests (`tests/tier2_boundaries/test_focusguard_boundaries.test.js`)
1. **FG-T2-01: False-Positive Blur Rejection**:
   Dispatch `blur` on window while `document.hasFocus() === true` (simulating internal element click). Assert:
   - Session remains active (`isGuarded() === true`).
   - Timers continue running; no void modal shown.
2. **FG-T2-02: Menu & Out-of-Session Blur Immunity**:
   Trigger `window.blur` and `visibilitychange` while in `#screen-menu`, `#screen-materials`, or `#screen-teacher`. Assert:
   - Zero violations recorded (`focusViolations` remains 0).
3. **FG-T2-03: Rapid Duplicate Violation Suppression**:
   Simulate simultaneous `window.blur` and `visibilitychange` within 10ms. Assert:
   - Idempotent violation execution: `focusViolations` increments by exactly 1, not 2.
4. **FG-T2-04: Non-Destructive Storage Migration**:
   Load a student record without `focusViolations` property. Trigger a violation. Assert:
   - `focusViolations` initialized to 1; existing typing/mouse/tests records completely preserved.
5. **FG-T2-05: Cumulative Violations Tracking**:
   Trigger 3 successive voided sessions on the same student. Assert:
   - `trainer_progress[studentId].focusViolations === 3`.

### Tier 3: Pairwise & Cross-Module Integration Tests (`tests/tier3_pairwise/test_focusguard_pairwise.test.js`)
1. **FG-T3-01: FocusGuard + Gamification XP**:
   Verify that a voided session yields exactly 0 XP, does not increment total XP in `gamification.xp`, does not advance progress bar, and unlocks no achievements.
2. **FG-T3-02: FocusGuard + Teacher Panel Display**:
   Verify that `TeacherPanel.renderTableRows()` displays the student's `focusViolations` count with a warning badge (`⚠️ 2`) and updates dynamically.
3. **FG-T3-03: FocusGuard + CSV Export BOM**:
   Verify that exported CSV includes the column `Срывов фокуса` with UTF-8 BOM encoding intact.
4. **FG-T3-04: FocusGuard + Telemetry Sync Queue**:
   Verify that every focus violation generates a telemetry payload in `localStorage['sync_queue']` with `type: 'focus_violation'`.

### Tier 4: Real-World Scenarios (`tests/tier4_scenarios/test_focusguard_scenarios.test.js`)
1. **FG-T4-01: Complete Student Cheating Scenario**:
   Student logs in, chooses 7-A, opens typing level 3, starts exercise after warning modal, types 5 correct characters, switches window to browser tab -> void modal triggers, student clicks «В меню», checks «Мои результаты» (0 sessions recorded), teacher panel shows 1 violation.
2. **FG-T4-02: Honest Student Workflow**:
   Student logs in, completes touch typing level 1, mouse exercise 1, and test 1 without switching windows. Assert:
   - 3 successful sessions recorded.
   - `focusViolations === 0`.
   - Teacher panel shows 0 violations.

---

## 7. Five-Component Handoff Report

### 1. Observation
- Verified `ORIGINAL_REQUEST.md` lines 78–99: Explicit user mandate for Feature F21 (FocusGuard Anti-Cheat) with mandatory pre-start warning, instant voiding of XP/scores on window blur or tab hidden during active exercises, logging in `trainer_progress[studentId].focusViolations`, in-app void modal, and strict prohibition of native alerts.
- Verified `modules/typing.js`: `startLevel` is called on `.level-btn` click without a pre-start warning gate; `finishSession` saves progress directly via `App.saveProgress`; `destroy` clears timers.
- Verified `modules/mouse.js`: Line 558 in `renderUI` auto-starts `startExercise(_activeExerciseId)` immediately on screen load without pre-start gating. Private `_isSessionActive` is not exposed externally.
- Verified `app.js`: `_runTest(testId)` renders questions directly without a pre-start warning screen; no `abortTest` method exists to cancel in-flight tests.
- Verified `modules/teacher.js`: Teacher table displays 8 columns; does not display focus violations; uses native `confirm()` in reset buttons.
- Verified `tests/helpers/dom_env.js`: Zero-dependency mock DOM environment supports event dispatching, local storage, and timers, but requires `document.visibilityState` and `document.hasFocus()` simulation for automated headless anti-cheat testing.

### 2. Logic Chain
1. *Premise*: Students switch tabs or windows to search for answers or play games during evaluated exercises (`typing`, `mouse`, `tests`).
2. *Technical Mechanism*: JS cannot physically disable OS Alt+Tab, but can authoritatively detect tab switching via `document.visibilitychange` (`hidden`) and window defocusing via `window.blur`.
3. *False-Positive Risk*: Naive `window.blur` listeners trigger whenever internal inputs (`#tt-input`) or DOM buttons are clicked or when native `alert()` is called.
4. *Mitigation*: Restrict guarding to active sessions only (`isGuarded = true`); filter `blur` using `document.hasFocus()` and active element inspection with a 60ms debounce; completely forbid native browser dialogs.
5. *Enforcement*: Immediate cancellation of active module (`destroy()`), discarding in-flight scores (0 XP), updating storage with `focusViolations++`, and presenting an unclosable in-app void modal.
6. *Visibility*: Surfacing `focusViolations` in the teacher dashboard and CSV export ensures accountability.

### 3. Caveats
- Browser sandbox limits: JS cannot prevent operating system-level window switches or key combinations (e.g. Win+D, Alt+Tab), only detect and penalize them.
- Multi-monitor setups: If a browser window remains visible on Monitor 1 while a student clicks a window on Monitor 2, `window.blur` will fire even though `visibilityState` remains `'visible'`. The `window.blur` handler covers this case.
- `dom_env.js` headless testing: In Node.js testing environments, `document.visibilityState` and `document.hasFocus` are not native and must be simulated as specified in Section 6.

### 4. Conclusion
Feature F21 (FocusGuard Anti-Cheat) is fully specified with clear lifecycle hooks, exact method signatures, DOM element templates, storage schemas, edge-case mitigation rules, and an exhaustive 4-tier testing specification. Implementation requires:
1. Creating `FocusGuard` controller module with pre-start warning and void modals.
2. Integrating pre-start gating and synchronous completion hooks in `typing.js`, `mouse.js`, and `app.js`.
3. Upgrading `modules/teacher.js` table and CSV export to display `focusViolations`.
4. Extending `tests/helpers/dom_env.js` with visibility state mocking and implementing test suites.

### 5. Verification Method
- **Static Contract Verification**:
  Inspect `PROJECT.md`, `SCOPE.md`, `modules/typing.js`, `modules/mouse.js`, `app.js`, and `modules/teacher.js` against the signatures defined in Section 5.
- **Automated Test Execution**:
  Run the master test runner to verify existing and new test suites:
  ```powershell
  node tests/runner.js --tier 1
  node tests/runner.js --tier infra
  ```
- **Manual Verification Protocol**:
  1. Launch `index.html` in browser.
  2. Select Student -> Open Typing -> Verify pre-start warning modal appears.
  3. Confirm warning -> Switch to another browser tab -> Return to tab.
  4. Verify `#focusguard-void-modal` is displayed and 0 XP is awarded.
  5. Open Teacher Panel -> Verify student has 1 violation recorded.
