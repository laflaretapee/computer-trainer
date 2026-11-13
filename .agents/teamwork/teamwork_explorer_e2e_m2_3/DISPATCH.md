# Dispatch — Explorer 3 (Gamification, Data/Teacher, Auto-Update, Telemetry Sync)

## Mission
Investigate and map test requirements, existing code structure, and storage/network verification strategies for Tier 1 test suites covering:
- F14: Gamification (XP calculation, 5 progressive levels, 5 achievement badges, progress bar UI) -> `tests/tier1_features/f14_gamification.test.js` (≥5 tests)
- F15, F16: Student/lesson data preservation & Teacher Dashboard (79 students 7A-7D integrity, lessons 7-2-2..7-2-6 integrity, teacher table, filters, CSV export with UTF-8 BOM) -> `tests/tier1_features/f15_f16_data_teacher.test.js` (≥10 tests)
- F17: Network-aware auto-update (navigator.onLine detection, version.json manifest check, silent offline fallback, UI button/indicator) -> `tests/tier1_features/f17_auto_update.test.js` (≥5 tests)
- F20: Offline-first telemetry sync (sync queue in localStorage, auto/manual POST on network online, teacher sync panel settings, multi-PC JSON bundle export/merge) -> `tests/tier1_features/f20_telemetry_sync.test.js` (≥5 tests)

## Required Files to Read
- ORIGINAL_REQUEST.md: C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\.agents\teamwork\ORIGINAL_REQUEST.md
- PROJECT.md: C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\PROJECT.md
- TEST_INFRA.md: C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\TEST_INFRA.md
- SCOPE.md: C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\.agents\teamwork\sub_orch_e2e_m2\SCOPE.md
- data/students.js & data/students.json
- data/content.js & data/content.json
- modules/teacher.js
- app.js
- version.json
- tests/runner.js
- tests/helpers/assert.js
- tests/helpers/dom_env.js
- tests/test_infra.test.js

## Expected Deliverables
Write your comprehensive investigation report to `analysis.md` and `handoff.md` in your state folder (`C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\.agents\teamwork\teamwork_explorer_e2e_m2_3`).
Include:
1. Exact feature specifications and acceptance criteria for F14, F15, F16, F17, F20.
2. Codebase inspection: Inspect students/content structures, teacher dashboard, gamification logic, auto-update mechanism, and sync queue implementation.
3. Test implementation blueprint: At least 5 distinct test cases per feature (>=5 for F14, >=10 for F15/F16, >=5 for F17, >=5 for F20).
4. Storage & Network simulation: How to mock localStorage, fetch/AbortController, online/offline events in `dom_env.js`.


## 2026-11-11T11:31:42Z
You are Explorer 3 for Milestone E2E-M2: Tier 1 Feature Coverage Suite.
Your State Folder: C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\.agents\teamwork\teamwork_explorer_e2e_m2_3
Working Directory: C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer
Orchestrator Conversation ID: 256a4281-8e67-442c-a1bb-5bea0a513c16
