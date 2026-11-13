# Dispatch — Sub-Orchestrator E2E-M1 (Test Infrastructure & Runner)

## Mission
Design, implement, and verify Milestone E2E-M1: Test Infrastructure & Runner for the 7th-Grade Computer Trainer SPA.

## Role & Instructions
- Archetype: sub-orchestrator (Project Pattern 2B Iteration Loop).
- Working Directory: C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer
- Your State Folder: C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\.agents\teamwork\sub_orch_e2e_m1
- Parent Conversation ID: 3355e548-4532-4469-9c89-4d0a0ba82f16

## Required Input Files (Read First)
- ORIGINAL_REQUEST.md: C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\.agents\teamwork\ORIGINAL_REQUEST.md
- PROJECT.md: C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\PROJECT.md
- TEST_INFRA.md: C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\TEST_INFRA.md
- SCOPE.md: C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\.agents\teamwork\sub_orch_e2e_testing\SCOPE.md

## Scope & Deliverables
1. `tests/runner.js`: Master test runner supporting `--tier 1|2|3|4|5|all`, test suite discovery, colored console output, formatted summary table, error stacks, and exit codes (0 for pass, 1 for failure).
2. `tests/helpers/assert.js`: Assertion utilities (`assert`, `assertEquals`, `assertDeepEquals`, `assertThrows`, `assertContains`, `assertBetween`, etc.) with informative failure messages.
3. `tests/helpers/dom_env.js` (or equivalent): Lightweight DOM / browser environment stub for Node.js (or JSDOM integration) that supports `window`, `document`, `localStorage`, `navigator.onLine`, `AudioContext`, and DOM event dispatching (`click`, `dblclick`, `contextmenu`, `dragstart`, `dragover`, `drop`, `keydown`), allowing opaque-box E2E tests to execute completely offline without external browser dependencies.
4. Smoke test in `tests/test_infra.test.js` verifying runner and assertion engine.

## 2B Iteration Loop Requirements
- Spawn 3 Explorers (`teamwork_explorer`) to analyze the requirements, environment, and design of the test infrastructure.
- Spawn 1 Worker (`teamwork_worker` or `teamwork_test_writer`) to implement `tests/runner.js` and `tests/helpers/`.
- Mandatory integrity warning in Worker dispatch.
- Spawn 2 Reviewers (`teamwork_reviewer`) to verify functionality and code quality.
- Spawn 2 Challengers (`teamwork_challenger`) to stress-test the runner and helpers.
- Spawn 1 Forensic Auditor (`teamwork_auditor`) to verify zero cheating / genuine assertions.
- Evaluate gate in `GATE_STATUS.md`. On PASS, deliver handoff.md and report to parent.


## 2026-11-11T10:25:48Z
You are the Sub-Orchestrator for Milestone E2E-M1: Test Infrastructure & Runner.
Read C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\.agents\teamwork\ORIGINAL_REQUEST.md, C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\PROJECT.md, C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\TEST_INFRA.md, C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\.agents\teamwork\sub_orch_e2e_testing\SCOPE.md, and C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\.agents\teamwork\sub_orch_e2e_m1\DISPATCH.md.
Working Directory: C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer.
Your State Folder: C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\.agents\teamwork\sub_orch_e2e_m1.
Parent Conversation ID: 3355e548-4532-4469-9c89-4d0a0ba82f16.
Scope: Design, build, and verify the test runner `tests/runner.js` and assertion/environment helpers in `tests/helpers/`.
Follow the Project Pattern 2B Iteration Loop:
1. Spawn 3 Explorers (teamwork_explorer) to examine Node.js test execution setup, assert utilities, and DOM mock/harness needs.
2. Spawn 1 Worker (teamwork_worker or teamwork_test_writer) with mandatory integrity warning to implement `tests/runner.js` and `tests/helpers/assert.js`, `tests/helpers/dom_env.js`.
3. Spawn 2 Reviewers (teamwork_reviewer) to inspect code and verify test execution.
4. Spawn 2 Challengers (teamwork_challenger) to stress test runner CLI options, suite handling, and error reporting.
5. Spawn 1 Forensic Auditor (teamwork_auditor) for integrity verification.
6. Evaluate gate in GATE_STATUS.md.
When the gate passes, deliver handoff.md and send_message to your parent (Recipient: 3355e548-4532-4469-9c89-4d0a0ba82f16).


## 2026-11-11T10:32:30Z
**Context**: Requirement update F20 (Offline-First Telemetry & Sync)
**Content**: Requirement F20 has been added to PROJECT.md and TEST_INFRA.md: local progress queue, offline-safe POST sync on network connectivity, teacher sync settings, and multi-PC JSON bundle merging. Please ensure the test infrastructure and mock environment (`tests/helpers/dom_env.js`) include lightweight support for stubbing `fetch` / network POST and `localStorage['sync_queue']` alongside `navigator.onLine`.
**Action**: Note in infrastructure design.
