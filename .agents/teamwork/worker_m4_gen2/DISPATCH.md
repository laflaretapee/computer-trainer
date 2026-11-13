## 2026-11-13T05:31:54Z
You are worker_m4_gen2 (Full-Stack Implementation Worker) for Milestone 4 of Computer Trainer.
Your state folder: C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\.agents\teamwork\worker_m4_gen2
Your working directory: C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer

### MANDATORY INTEGRITY WARNING
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

### STRICT PROHIBITION
data/students.* (79 students across classes 7А-7Д) and data/content.* (175 slide images for lessons 7-2-2 to 7-2-6) MUST BE 100% PRESERVED. Do NOT modify, delete, truncate, or overwrite these files under any circumstances.

### INPUT SPECIFICATIONS TO READ CAREFULLY
1. ORIGINAL_REQUEST.md: C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\.agents\teamwork\ORIGINAL_REQUEST.md
2. SCOPE.md: C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\.agents\teamwork\sub_orch_m4_gen2\SCOPE.md
3. M4_TASK_UPDATE.md: C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\.agents\teamwork\orchestrator\M4_TASK_UPDATE.md
4. Explorer 1 Handoff (Gamification & Data Integrity): C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\.agents\teamwork\explorer_m4_1\handoff.md
5. Explorer 2 Handoff (Teacher Dashboard, Auto-Update, Telemetry Sync): C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\.agents\teamwork\explorer_m4_2\handoff.md
6. Spec Miner 3 Handoff (FocusGuard & TabGuard Anti-Cheat): C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\.agents\teamwork\spec_miner_m4_3\handoff.md

### EXCLUSIVE WRITE OWNERSHIP
You have exclusive write access to:
- `modules/gamification.js`
- `levels.json`
- `badges.json`
- `version.json`
- `modules/autoupdate.js`
- `modules/telemetry.js`
- `modules/focusguard.js`
- `modules/teacher.js`
- `app.js`
- `index.html`
- `style.css`
- `tests/helpers/dom_env.js` (Fix compound selector parsing in `matchesSingleCompoundSelector` for attribute values containing spaces/quotes, resolving Ex 3 context menu step 4 target query in `tests/tier5_adversarial/test_mouse_ex123_stress.test.js`)
- `tests/gamification.test.js`
- `tests/autoupdate.test.js`
- `tests/telemetry.test.js`
- `tests/focusguard.test.js`
- `tests/runner.js`

### IMPLEMENTATION REQUIREMENTS
1. Gamification (F14):
   - XP calculation: Typing (CPM & accuracy), Mouse (stars & scores), Tests (score/total).
   - 5 Progressive levels: "Новичок", "Пользователь ПК", "Опытный практик", "Мастер мыши и клавиатуры", "Гуру информатики" in `levels.json`.
   - 5 Achievements in `badges.json`: "first_step", "mouse_master", "quick_fingers", "theory_expert", "speed_demon" (or similar).
   - APIs: `addXP(sessionResult)`, `getUserStats(userId)`, `awardBadge(userId, badgeId)`.
   - UI: XP progress bar in header/HUD, level badge, unlock toast notifications.
   - Teacher panel tab "Геймификация": table of students with XP, level, badges, leaderboard.

2. Auto-Update (F17):
   - Online detection (`navigator.onLine`, `online`/`offline` window events).
   - Non-blocking `version.json` fetch (timeout 2500ms via `AbortController`).
   - If newer version exists, show in-app modal ("Доступно обновление. Обновить сейчас?").
   - Offline / `file://` safe: 100% silent fallback without errors or unhandled rejections.
   - UI: Version indicator in top-right with clickable "Проверить сейчас" check button.

3. Telemetry & Progress Sync (F20):
   - Queue: `syncQueue` in `localStorage` (`[{ sessionId, data, timestamp }]`).
   - Auto-sync on `online` event to configured endpoint via HTTP POST.
   - 30s retry loop when online and queue not empty.
   - Teacher panel UI: Sync endpoint input, queue count, "Синхронизировать сейчас" button.
   - Multi-PC bundle export (download all students JSON) and import/merge modal.

4. FocusGuard Anti-Cheat (F21):
   - Track active session states (typing, mouse exercises, theory test).
   - Event listeners for `visibilitychange` (`document.hidden`) and window `blur`.
   - Heartbeat multi-tab guard (TabGuard): 1s heartbeat detecting duplicate tabs.
   - Pre-start warning modal informing students that switching tabs/windows will void the session.
   - Immediate session halt, timer stop, voiding (0 XP, 0 score), incrementing student `focusViolations`.
   - In-app void modal (no native `alert`/`confirm`).
   - Teacher toggle to enable/disable TabGuard.

5. DOM Helper Fix:
   - In `tests/helpers/dom_env.js`: Fix `matchesSingleCompoundSelector` quote/space handling in attribute selectors (`[attr="value with space"]`) so `tests/tier5_adversarial/test_mouse_ex123_stress.test.js` passes.

6. Testing & Verification:
   - Write comprehensive tests: `tests/gamification.test.js`, `tests/autoupdate.test.js`, `tests/telemetry.test.js`, `tests/focusguard.test.js`.
   - Update `tests/runner.js` to run all test suites (unit tests + tier tests + new M4 tests).
   - Run tests: execute `node tests/runner.js` and ensure all tests pass with 0 failures.
   - Verify `data/students.*` (79 students) and `data/content.*` (175 slides) are completely intact.
