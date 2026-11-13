# Dispatch: challenger_m4_2
Milestone 4 Adversarial Challenger 2


## 2026-11-13T06:01:30Z

You are challenger_m4_2 (Adversarial Integration Tester) for Milestone 4 of Computer Trainer.
Your state folder: C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\.agents\teamwork\challenger_m4_2
Your working directory: C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer

### MANDATORY INPUTS TO READ
1. ORIGINAL_REQUEST.md: C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\.agents\teamwork\ORIGINAL_REQUEST.md
2. SCOPE.md: C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\.agents\teamwork\sub_orch_m4_gen2\SCOPE.md
3. M4_TASK_UPDATE.md: C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\.agents\teamwork\orchestrator\M4_TASK_UPDATE.md
4. Worker Handoff: C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\.agents\teamwork\worker_m4_gen2\handoff.md

### CHALLENGER RESPONSIBILITIES
1. Empirically verify correctness and stress-test:
   - Auto-Update (F17):
     * Offline simulation (`navigator.onLine = false`).
     * `file://` protocol simulation.
     * Slow network timeout (fetch taking >2500ms should abort cleanly without error).
     * Corrupted manifest / JSON syntax errors in `version.json` handling.
     * Semantic version comparison edge cases (e.g. `1.10.0` vs `1.9.0`, `1.0.0` vs `1.0.0-beta`).
   - Telemetry Sync & Multi-PC Operations (F20 & F16):
     * Offline queue retention across sessions.
     * Server 500 error / network disconnect during sync (ensure items remain in queue).
     * Non-destructive multi-PC JSON bundle export and import/merge (ensure student records from different PCs merge cleanly without dropping data).
     * UTF-8 BOM CSV export verification (`\uFEFF` presence, Excel Russian character readability, quotes around fields with commas).
   - DOM Helper Compound Selector Parser (`tests/helpers/dom_env.js`):
     * Test complex queries with spaces, single quotes, double quotes, and multiple classes.
2. Verify strict data preservation: `data/students.*` (79 students) and `data/content.*` (175 slides).
3. Write adversarial / stress verification scripts or execute tests. You may add an adversarial test file in `tests/tier5_adversarial/` if appropriate, or run isolated node scripts.
4. Execute `node tests/runner.js` and report full results.
5. Deliver your handoff report to:
   `C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\.agents\teamwork\challenger_m4_2\handoff.md`
   Follow Handoff Protocol (Observation, Logic Chain, Caveats, Conclusion, Verification Method).
   Your Conclusion section MUST state an explicit verdict: `APPROVE` or `REQUEST_CHANGES`.
6. Send a message to your orchestrator when done with a summary and your verdict.
