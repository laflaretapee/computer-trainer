# Dispatch — Sub-Orchestrator E2E-M3 (Tier 2 Boundary & Corner Cases Suite)

## Mission
Design, implement, and verify Milestone E2E-M3: Tier 2 Boundary & Corner Cases Suite (≥100 tests, ≥5 per feature for F1..F20) in `tests/tier2_boundaries/`.

## Role & Instructions
- Archetype: sub-orchestrator (Project Pattern 2B Iteration Loop).
- Working Directory: C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer
- Your State Folder: C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\.agents\teamwork\sub_orch_e2e_m3
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
Create comprehensive, requirement-driven, opaque-box Tier 2 boundary and corner case test suites in `tests/tier2_boundaries/` covering every feature with at least 5 tests per feature (total ≥100 tests):
1. `tests/tier2_boundaries/b01_layout_boundaries.test.js` (F1, F2, F3: extreme window bounds, rapid resize events, zero content overflow, focus trapping)
2. `tests/tier2_boundaries/b02_offline_resilience.test.js` (F4: missing asset recovery, 0 external network requests under simulated offline network)
3. `tests/tier2_boundaries/b03_typing_edge_cases.test.js` (F5, F6, F7: rapid key spam, zero accuracy, 100% errors, non-Russian keypresses, backspace behavior, boundary punctuation)
4. `tests/tier2_boundaries/b04_mouse_boundaries.test.js` (F8, F9, F10: sub-threshold double clicks (>450ms), missed clicks, right clicks outside target, context menu cancellation)
5. `tests/tier2_boundaries/b05_drag_audio_boundaries.test.js` (F11, F12, F13: invalid drop zones, drag cancellation, hover boundary transitions, AudioContext suspended state)
6. `tests/tier2_boundaries/b06_gamification_boundaries.test.js` (F14: 0 XP, level overflow at max level 5, duplicate achievement prevention, negative score guards)
7. `tests/tier2_boundaries/b07_data_storage_boundaries.test.js` (F15, F16: corrupted localStorage JSON, missing student rosters, CSV export with commas/quotes/Cyrillic characters, safe data resets)
8. `tests/tier2_boundaries/b08_autoupdate_network_flaps.test.js` (F17: rapid online/offline flapping, 2500ms abort timeout, 404/500/invalid JSON manifest handling, zero uncaught errors)
9. `tests/tier2_boundaries/b09_telemetry_sync_boundaries.test.js` (F20: empty sync queue, server 500 error retry without data loss, corrupted JSON bundle import, duplicate session merging conflict resolution)

Run with: `node tests/runner.js --tier 2`. All tests must execute cleanly and return exit code 0.

## 2B Iteration Loop Requirements
- Spawn 3 Explorers (`teamwork_explorer`) to analyze the boundary requirements and target edge cases.
- Spawn 1 Worker (`teamwork_test_writer` or `teamwork_worker`) with mandatory integrity warning to implement the test files.
- Spawn 2 Reviewers (`teamwork_reviewer`) to verify test completeness, requirement fidelity, and code quality.
- Spawn 2 Challengers (`teamwork_challenger`) to stress-test the test suite and verify tests correctly fail if faults are injected.
- Spawn 1 Forensic Auditor (`teamwork_auditor`) to verify zero cheating / genuine assertions.
- Evaluate gate in `GATE_STATUS.md`. On PASS, deliver handoff.md and report to parent.
