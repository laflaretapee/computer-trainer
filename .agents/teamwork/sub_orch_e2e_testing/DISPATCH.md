# Dispatch — E2E Testing Track Orchestrator

## Mission
You are the Sub-Orchestrator for the E2E Testing Track. Your scope is to design, implement, and verify the requirement-driven, opaque-box E2E test suite covering Tiers 1-4 based on ORIGINAL_REQUEST.md and TEST_INFRA.md, and publish TEST_READY.md when complete.

## Role & Instructions
- Archetype: sub-orchestrator (using Project Pattern / Dual Track).
- Working Directory: C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer
- Your State Folder: C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\.agents\teamwork\sub_orch_e2e_testing
- Parent Conversation ID: 997a4709-44d1-48f5-8f78-14895334405d

## Required Input Files (Read First)
- ORIGINAL_REQUEST.md: C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\.agents\teamwork\ORIGINAL_REQUEST.md
- PROJECT.md: C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\PROJECT.md
- TEST_INFRA.md: C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\TEST_INFRA.md

## Scope & Deliverables
1. Build test runner `tests/runner.js` and test infrastructure.
2. Build Tier 1 test suite (Feature Coverage, >=5 tests per feature).
3. Build Tier 2 test suite (Boundaries & Edge Cases, >=5 tests per feature).
4. Build Tier 3 test suite (Pairwise Combinations, >=20 tests).
5. Build Tier 4 test suite (Real-World Application Scenarios, >=10 tests).
6. Verify all test cases pass or correctly execute against the system.
7. Publish `TEST_READY.md` at project root `C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\TEST_READY.md` with test runner command and coverage summary.
8. Delegate implementation tasks to `teamwork_test_writer` or `teamwork_worker` and verify with `teamwork_reviewer` / `teamwork_challenger` / `teamwork_auditor`. Do not write code directly.


## 2026-11-11T10:23:29Z
You are the Sub-Orchestrator for the E2E Testing Track.
Read C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\.agents\teamwork\ORIGINAL_REQUEST.md, C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\PROJECT.md, C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\TEST_INFRA.md, and C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\.agents\teamwork\sub_orch_e2e_testing\DISPATCH.md.
Working Directory: C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer.
Your State Folder: C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\.agents\teamwork\sub_orch_e2e_testing.
Parent Conversation ID: 997a4709-44d1-48f5-8f78-14895334405d.
Follow the Project Pattern procedure: decompose or execute test suite creation for Tiers 1-4.
When complete, publish C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\TEST_READY.md and report completion to your parent.


## 2026-11-11T10:31:55Z
**Context**: New follow-up requirement F20 added to PROJECT.md and TEST_INFRA.md
**Content**: User has added an Offline-First Telemetry / Sync requirement:
1. Student results queue in localStorage (`sync_queue` / `trainer_progress`).
2. When online (or manual trigger), auto-POST progress data to teacher's configured sync URL endpoint with zero console errors if offline or no URL set.
3. Teacher panel sync controls: URL input, pending queue count, last sync timestamp, "Sync now" button.
4. Offline multi-PC JSON bundle export/import merging across class computers.
Please ensure test coverage across Tiers 1-4 includes this functionality.
**Action**: Incorporate into test suite planning.
