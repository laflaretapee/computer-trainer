# Milestone 4 Task Update & Scope Refinement

**Timestamp**: 2026-11-13T05:15:00Z  
**Source**: Project Sentinel & User Request Refinement (`plan_computer_trainer.md`)  
**Target Sub-Orchestrator**: `sub_orch_m4` (`361a00d6-3cac-49e3-804b-f5c8db4be5a0`)

---

## 1. Executive Summary

Milestone 4 scope has been refined based on user review and Section 4 of `plan_computer_trainer.md`. Sub-orchestrator `sub_orch_m4` must incorporate these requirements into its execution loop, worker assignments, and verification gates.

In addition, an existing adversarial test failure in `tests/tier5_adversarial/test_mouse_ex123_stress.test.js` (Ex 3 context menu step 4 target) must be resolved by the worker.

---

## 2. Refined Milestone 4 Specifications

### 2.1 Gamification (XP, Levels, Badges)
- **Module**: `modules/gamification.js`, with configurations in `levels.json` and `badges.json` (or integrated data structures).
- **XP Calculation**: Calculate XP for all completed modules (Typing CPM/accuracy, Mouse stars/scores, Theory test scores).
- **Levels**: 5 progressive levels defined in `levels.json` (e.g., Level 1 "Новичок", Level 2 "Ученик", Level 3 "Практик", Level 4 "Специалист", Level 5 "Мастер").
- **Badges**: Predefined achievements in `badges.json` (e.g., "1000 символов", "Без ошибок", "Быстрый клик", "Снайпер мыши", "Знаток теории").
- **Core APIs**:
  - `addXP(sessionResult)`: computes XP and updates student progress.
  - `getUserStats(userId)`: returns level, XP, badge array, rank.
  - `awardBadge(userId, badgeId)`: unlocks badge if criteria met, emits achievement toast.
- **UI Elements**:
  - Student progress bar and level badge in student header/HUD.
  - Achievement toast notification popup when a badge is unlocked.
  - Teacher panel tab *"Геймификация"*: table of students with XP, level, unlocked badges, and class leaderboard.

### 2.2 Auto-Update
- **Module**: `modules/autoupdate.js`.
- **Online Detection**: Check `navigator.onLine` and listen to `window.addEventListener('online', ...)`.
- **Version Check**: Non-blocking `fetch('version.json', { cache: 'no-store', signal: AbortSignal.timeout(2500) })`.
- **Version Comparison**: Compare `manifest.version` with `APP_VERSION`.
- **Update Notification**: If newer version is available, show modal: *"Доступно обновление. Обновить сейчас?"* with "Обновить" and "Позже" buttons.
- **Asset Replacement / Reload**: Load updated assets or trigger clean reload.
- **Settings**: Store `autoUpdateEnabled` flag in `localStorage` (default `true`).
- **UI**: Indicator in top-right corner ("Версия vX.Y.Z"), with clickable *"Проверить сейчас"* link.
- **Offline Reliability**: 100% silent, error-free operation when offline or when served via `file://`.

### 2.3 Telemetry Sync (Progress Sync)
- **Module**: `modules/telemetry.js`.
- **Queue**: `syncQueue` in `localStorage` (`[{ sessionId, data, timestamp }]`).
- **Enqueue**: Call `enqueueProgress(data)` at the completion of any exercise session.
- **Auto-Sync**: On `online` event (or when network is active), execute `processQueue()` -> HTTP POST payload to configured endpoint.
- **Retry Mechanism**: If POST fails or network is lost, retain objects in queue and retry every 30 seconds while online.
- **Teacher Panel UI**:
  - Configurable input: *"Endpoint для телеметрии"* (saved in localStorage).
  - Manual action button: *"Синхронизировать сейчас"*.
  - Status display: (✔️ Синхронизировано / ⏳ В очереди: N / ❌ Ошибка подключения), last sync timestamp.
  - Multi-PC Offline Aggregation: *"Экспортировать данные"* (downloads JSON bundle of all student progress) and *"Импортировать данные"* (merges student progress non-destructively).

### 2.4 FocusGuard & TabGuard Anti-Cheat
- **Module**: `modules/focusguard.js` (unifying FocusGuard and TabGuard).
- **Pre-Start Warning**: Pre-exercise warning modal/screen across all modules (Typing, Mouse, Theory tests):
  *"⚠️ Внимание! Выход с вкладки или переключение в другое окно/игру немедленно аннулирует результат!"*.
- **Focus Monitoring**: Listen to `document.visibilitychange` (`document.visibilityState === 'hidden'`) and `window.blur` (filtered for internal focus shifts) during active sessions.
- **TabGuard Multi-Tab Heartbeat**:
  - At exercise start, write `localStorage['trainer_heartbeat'] = Date.now()`.
  - Update heartbeat on 1-second interval.
  - If heartbeat is missing for >2 seconds or overridden by another active tab, trigger abort.
- **Session Abort Actions**:
  1. Immediately stop exercise timers and session listeners (`destroy()` / abort).
  2. Void session result completely (0 XP, 0 score, no stars awarded).
  3. Increment `studentProgress.focusViolations` and append entry to `studentProgress.violationsLog` with timestamp and reason.
  4. Display modal dialog: *"Сессия отменена – переключение вкладок запрещено"*, with option to restart or return to menu.
- **Teacher Controls**: Checkbox in teacher panel: *"Включить TabGuard"*.
- **No Native Dialogs**: Zero `alert()` or `confirm()` calls — use styled in-app modal dialogs.

### 2.5 UI & Ergonomic Polish
- **CSS Improvements (`style.css`)**:
  - Media queries for <=1024px and <=768px screens.
  - Pulse animation (`@keyframes pulse`) on module start buttons ("Начать", "Старт").
  - Micro-tooltips on action buttons using CSS and `title` attributes.
  - Teacher panel layout for "Геймификация" tab and Telemetry controls.

---

## 3. Adversarial Test Fix Notice

**Test Failure**:
`Tier 5 Adversarial: Deep Stress & Invariant Verification (Exercises 1, 2, 3) > Ex 3: Full 5-task context menu flow with exact action verification`
AssertionError: Target for step 4 must exist at `tests/tier5_adversarial/test_mouse_ex123_stress.test.js:336:7`.

**Action for Worker**:
Investigate Exercise 3 context menu target elements in `modules/mouse.js` and `test_mouse_ex123_stress.test.js`. Ensure that all 5 target elements (`[data-target-name="Реферат_История.docx"]`, desktop arena, `[data-target-name="virus_trojan.tmp"]`, `[data-target-name="Мои рисунки"]`, `[data-target-name="Гимн_Школы.mp3"]`) remain queryable in `mouse-arena` or are handled cleanly across the multi-step test flow so that master test runner reports 0 failures.

---

## 4. Subagent Assignment Guidance (Per Section 4.6)

When dispatching the Worker(s) and Test Writers:
1. **Gamification & Data Integrity**: `modules/gamification.js`, `levels.json`, `badges.json`, data preservation for 79 students and 175 slides.
2. **Network & Sync**: `modules/autoupdate.js`, `modules/telemetry.js`, teacher panel sync & version UI.
3. **Anti-Cheat**: `modules/focusguard.js`, pre-start warnings, abort handling, teacher toggle.
4. **UI Styling**: `style.css` responsive updates, pulse animations, micro-tooltips.
5. **Testing**: `tests/gamification.test.js`, `tests/autoupdate.test.js`, `tests/telemetry.test.js`, `tests/focusguard.test.js`.
