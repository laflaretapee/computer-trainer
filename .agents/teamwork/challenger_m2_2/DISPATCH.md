# Dispatch — Challenger M2.2: Empirical Metrics, Error Tracking & Contract Boundary Stress Test

## Mission
Empirically stress-test the real-time metrics calculation, error counting, CPM spike guard, and M2 ↔ M4 session contract in `modules/typing.js`.

## Required Input Files (Read First)
1. ORIGINAL_REQUEST.md: C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\.agents\teamwork\ORIGINAL_REQUEST.md
2. PROJECT.md: C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\PROJECT.md
3. SCOPE.md: C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\.agents\teamwork\sub_orch_m2\SCOPE.md
4. Worker M2.1 Handoff: C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\.agents\teamwork\worker_m2_1\handoff.md

## State Folder & Scope
- Working Directory: C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer
- Your State Folder: C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\.agents\teamwork\challenger_m2_2
- Target Codebase: `modules/typing.js`

## Challenge Objectives
1. Write and execute an adversarial script to test extreme mathematical boundaries:
   - Initial state (0 keystrokes): verify speed === 0, accuracy === 100, errors === 0.
   - First keystroke speed spike test: simulate keydown at t=0ms, t=100ms, t=999ms, and t=1000ms. Verify speed NEVER shows erratic spikes like 60,000 CPM.
   - 100% error rate test: simulate 20 wrong keystrokes. Verify accuracy drops cleanly without NaN or negative numbers, and `#tt-errors` strictly equals 20.
   - Interleaved errors: simulate 10 correct, 5 wrong keystrokes. Verify accuracy = `Math.round(10/15 * 100) = 67%`.
   - Contract test: call `finishSession()` and verify returned object schema, types, and persistence to `App.saveProgress`.
2. Deliver verdict: APPROVE (all stress tests pass cleanly) or REQUEST_CHANGES (document specific failures).

## Output Requirements
Write your stress test report to `C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\.agents\teamwork\challenger_m2_2\handoff.md` following the Handoff Protocol.

## 2026-11-12T16:46:35Z
You are Challenger M2.2 for Milestone 2 (Touch Typing Ergonomics & Hands Visualizer).
Read your dispatch instructions at C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\.agents\teamwork\challenger_m2_2\DISPATCH.md.
Also read C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\.agents\teamwork\ORIGINAL_REQUEST.md, C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\PROJECT.md, C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\.agents\teamwork\sub_orch_m2\SCOPE.md, and Worker M2.1 handoff at C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\.agents\teamwork\worker_m2_1\handoff.md.
Your state folder is C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\.agents\teamwork\challenger_m2_2.
Empirically stress-test the real-time metrics calculations, extreme mathematical boundaries (0 keystrokes, 1st keystroke spike guard, 100% error rate, interleaved errors), and M2 <-> M4 finishSession contract in modules/typing.js.
Write an empirical stress test harness to verify correctness.
Write your challenge report and verdict (APPROVE or REQUEST_CHANGES) to C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\.agents\teamwork\challenger_m2_2\handoff.md.
When finished, notify me via send_message.

