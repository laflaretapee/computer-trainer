# Dispatch — Sub-Orchestrator: Milestone 4 (Gamification, Auto-Update, Data Integrity, Telemetry Sync & FocusGuard Anti-Cheat)

## Mission
You are the Sub-Orchestrator for Milestone 4. Your scope is to implement and verify the comprehensive gamification system, student/content data preservation, teacher panel upgrade with multi-PC sync, network-aware auto-update, offline-first telemetry progress sync, and FocusGuard anti-cheat protection.

## Role & Instructions
- Archetype: sub-orchestrator (using Project Pattern iteration loop: Explorer -> Worker -> Reviewers (2) + Challengers (2) + Auditor -> Gate).
- Working Directory: C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer
- Your State Folder: C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\.agents\teamwork\sub_orch_m4
- Parent Conversation ID: 997a4709-44d1-48f5-8f78-14895334405d

## Required Input Files (Read First)
- ORIGINAL_REQUEST.md: C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\.agents\teamwork\ORIGINAL_REQUEST.md
- PROJECT.md: C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\PROJECT.md
- TEST_INFRA.md: C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\TEST_INFRA.md

## Scope Boundaries & File Ownership
- Primary Files: `app.js`, `modules/teacher.js`, `version.json`, and supporting UI containers in `index.html`.
- Detailed Deliverables:
  1. **Gamification (F14 / R5)**:
     - XP points calculation across typing, mouse, and theory tests.
     - 5 Levels: "Новичок", "Пользователь ПК", "Опытный практик", "Мастер мыши и клавиатуры", "Гуру информатики".
     - Level badges and XP progress bar in student menu (`#screen-menu`) and results.
     - 5 core achievement badges with visual toast unlock notification.
  2. **Data Integrity (F15 / R5)**:
     - 100% preservation of 79 students across 5 classes (7А–7Д) in `data/students.*`.
     - 100% preservation of lessons 7-2-2 to 7-2-6 with 175 slides in `data/content.*`.
     - Additive non-destructive schema in `localStorage['trainer_progress']`.
  3. **Teacher Dashboard & Multi-PC Aggregation (F16 / R5 & Follow-up 2)**:
     - Sticky table header, student filtering, stats overview.
     - Display typing, mouse, test results, total XP, level, and focus violations count.
     - Safe UTF-8 BOM CSV export.
     - Multi-PC offline JSON bundle export and import/merge functionality in teacher panel.
  4. **Auto-Update Mechanism (F17 / Follow-up 1)**:
     - Check network connectivity (`navigator.onLine`, `online`/`offline` listeners).
     - Fetch `version.json` with 2500ms `AbortController` timeout only when online via HTTP/S.
     - 100% fail-safe: zero errors and zero blocking when offline or run via `file://`.
     - UI status indicator and manual "Проверить обновление" button in teacher panel.
  5. **Offline-First Telemetry & Sync (F20 / Follow-up 2)**:
     - Local `sync_queue` in `localStorage` for offline results.
     - Auto-POST on internet connection or manual sync button in teacher panel.
     - Configurable sync URL in teacher panel with pending queue count and last sync timestamp.
     - Silent fail-safe offline handling.
  6. **FocusGuard Anti-Cheat (F21 / Follow-up 3)**:
     - Monitor window focus and visibility (`visibilitychange`, `blur`) during active exercises (`typing`, `mouse`, `tests`).
     - Pre-start warning screen before active exercises.
     - Immediate session halt, timer stop, and 0 XP/score voiding on focus loss.
     - Log violations in `trainer_progress[studentId].focusViolations` and display count to teacher.
     - Show in-app void notification modal; NO native `alert`/`confirm`.
- MANDATORY INTEGRITY WARNING for Workers:
  > DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.
- Run iteration loop: Explorer -> Worker -> Reviewers (2) + Challengers (2) + Auditor -> Gate check.
- When the gate passes, report completion to parent orchestrator.


## 2026-11-13T05:15:00Z - Parent Orchestrator Scope Refinement Notice
Parent forwarded M4_TASK_UPDATE.md:
- Key modules to produce/integrate:
  1. `modules/gamification.js`, `levels.json`, `badges.json`
  2. `modules/autoupdate.js`
  3. `modules/telemetry.js`
  4. `modules/focusguard.js`
  5. `style.css` updates (<=1024px, pulse animations, micro-tooltips)
  6. Fix Ex 3 context menu step 4 target in `modules/mouse.js` / adversarial test
  7. Test suites: `tests/gamification.test.js`, `tests/autoupdate.test.js`, `tests/telemetry.test.js`, `tests/focusguard.test.js`
