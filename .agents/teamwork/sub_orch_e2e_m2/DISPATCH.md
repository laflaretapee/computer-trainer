# Dispatch — Sub-Orchestrator E2E-M2 (Tier 1 Feature Coverage Suite)

## Mission
Design, implement, and verify Milestone E2E-M2: Tier 1 Feature Coverage Suite (≥100 tests, ≥5 per feature for F1..F20) in `tests/tier1_features/`.

## Role & Instructions
- Archetype: sub-orchestrator (Project Pattern 2B Iteration Loop).
- Working Directory: C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer
- Your State Folder: C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\.agents\teamwork\sub_orch_e2e_m2
- Parent Conversation ID: 3355e548-4532-4469-9c89-4d0a0ba82f16

## Required Input Files (Read First)
- ORIGINAL_REQUEST.md: C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\.agents\teamwork\ORIGINAL_REQUEST.md
- PROJECT.md: C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\PROJECT.md
- TEST_INFRA.md: C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\TEST_INFRA.md
- SCOPE.md: C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\.agents\teamwork\sub_orch_e2e_testing\SCOPE.md
- Master Test Runner: `tests/runner.js`
- Test Assertions: `tests/helpers/assert.js`
- Test DOM Environment: `tests/helpers/dom_env.js`

## Scope & Deliverables
Create comprehensive, requirement-driven, opaque-box Tier 1 test suites in `tests/tier1_features/` covering every feature with at least 5 tests per feature (total ≥100 tests):
1. `tests/tier1_features/f01_ui_theme.test.js` (F1: modern tokens, styling, typography, card layout)
2. `tests/tier1_features/f02_responsive.test.js` (F2: multi-resolution 1280x720, 1366x768, 1920x1080 layout & modal sizing)
3. `tests/tier1_features/f03_interactive_states.test.js` (F3: hover, active, focus-visible states)
4. `tests/tier1_features/f04_offline_assets.test.js` (F4: strict offline autonomy, no external CDNs/fonts/scripts)
5. `tests/tier1_features/f05_f06_f07_typing.test.js` (F5, F6, F7: 10-finger zones, visual hands & key highlight, CPM, accuracy %, live errors, punctuation)
6. `tests/tier1_features/f08_f13_mouse.test.js` (F8, F9, F10, F11, F12, F13: single click, double click, right click context menu, drag-and-drop, hover, Web Audio)
7. `tests/tier1_features/f14_gamification.test.js` (F14: XP, 5 levels, 5 badges, progress bar)
8. `tests/tier1_features/f15_f16_data_teacher.test.js` (F15, F16: 79 students, lessons 7-2-2..7-2-6, teacher dashboard, CSV export)
9. `tests/tier1_features/f17_auto_update.test.js` (F17: network-aware auto-update, version.json manifest, silent offline fallback)
10. `tests/tier1_features/f20_telemetry_sync.test.js` (F20: sync queue, auto/manual POST on connect, teacher panel sync controls, multi-PC JSON bundle merge)

Run with: `node tests/runner.js --tier 1`. All tests must execute cleanly and return exit code 0.

## 2B Iteration Loop Requirements
- Spawn 3 Explorers (`teamwork_explorer`) to analyze the test requirements and files to test.
- Spawn 1 Worker (`teamwork_test_writer` or `teamwork_worker`) with mandatory integrity warning to implement the test files.
- Spawn 2 Reviewers (`teamwork_reviewer`) to verify test completeness, requirement fidelity, and code quality.
- Spawn 2 Challengers (`teamwork_challenger`) to stress-test the test suite and verify tests correctly fail if faults are injected.
- Spawn 1 Forensic Auditor (`teamwork_auditor`) to verify zero cheating / genuine assertions.
- Evaluate gate in `GATE_STATUS.md`. On PASS, deliver handoff.md and report to parent.
