# Dispatch — Worker M2.1: Touch Typing Ergonomics & Hands Visualizer

## Mission
Implement Milestone 2: Touch Typing Ergonomics & Hands Visualizer in `modules/typing.js` according to the synthesized specifications from Explorers M2.1, M2.2, and M2.3.

## MANDATORY INTEGRITY WARNING
> DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Input Files (Read First)
1. ORIGINAL_REQUEST.md: C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\.agents\teamwork\ORIGINAL_REQUEST.md
2. PROJECT.md: C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\PROJECT.md
3. SCOPE.md: C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\.agents\teamwork\sub_orch_m2\SCOPE.md
4. Explorer M2.1 Report: C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\.agents\teamwork\explorer_m2_1\handoff.md
5. Explorer M2.2 Report: C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\.agents\teamwork\explorer_m2_2\handoff.md
6. Explorer M2.3 Report: C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\.agents\teamwork\explorer_m2_3\handoff.md

## Working Directory & State Folder
- Working Directory: C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer
- Your State Folder: C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\.agents\teamwork\worker_m2_1
- Exclusive Write Ownership: `modules/typing.js` (Do not modify files owned by other milestones).

## Detailed Implementation Tasks

### 1. Complete Russian ЙЦУКЕН Layout & 10-Finger Zone Classes
- Define 34 keys in `modules/typing.js`:
  - Row 1 (12 keys): `й`, `ц`, `у`, `к`, `е`, `н`, `г`, `ш`, `щ`, `з`, `х`, `ъ`
  - Row 2 (11 keys): `ф`, `ы`, `в`, `а` (home), `п`, `р`, `о` (home), `л`, `д`, `ж`, `э`
  - Row 3 (10 keys): `я`, `ч`, `с`, `м`, `и`, `т`, `ь`, `б`, `ю`, `.` (with alt `,`)
  - Row 4 (1 key): Space (` `)
- Assign exact `.kb-zone-*` classes matching `style.css`:
  - `kb-zone-pinky-l`: `й`, `ф`, `я`
  - `kb-zone-ring-l`: `ц`, `ы`, `ч`
  - `kb-zone-mid-l`: `у`, `в`, `с`
  - `kb-zone-idx-l`: `к`, `е`, `а`, `п`, `м`, `и`
  - `kb-zone-thumb`: ` ` (Space)
  - `kb-zone-idx-r`: `н`, `г`, `р`, `о`, `т`, `ь`
  - `kb-zone-mid-r`: `ш`, `л`, `б`
  - `kb-zone-ring-r`: `щ`, `д`, `ю`
  - `kb-zone-pinky-r`: `з`, `х`, `ъ`, `ж`, `э`, `.`
- Implement safe key lookup with `_keyElementsMap` and alias resolution (e.g. `,` -> `.`, uppercase letters -> lowercase key) so `highlightNextKey()` and `flashKey()` never throw or produce `null` reference errors.

### 2. Interactive Hands Visualizer Widget
- Add the Hands Visualizer component directly below the keyboard inside `#tt-keyboard` / `.typing-trainer`.
- Render Left Hand (5 fingers: pinky-l, ring-l, mid-l, idx-l, thumb-l), Central Cue Badge (`#tt-hands-cue`, `#tt-cue-hand`, `#tt-cue-finger`, `#tt-cue-key`), and Right Hand (5 fingers: thumb-r, idx-r, mid-r, ring-r, pinky-r).
- Add self-contained component styling (or `<style id="tt-hands-styles">`) including `.finger-active` animation and responsive styles as specified in Explorer M2.2's report.
- Implement `updateHandsHighlight(char)`:
  - Synchronously updates when target char changes.
  - Adds `.finger-active` to active finger element (or both thumbs for spacebar).
  - Updates `#tt-cue-hand`, `#tt-cue-finger`, and `#tt-cue-key` with Russian text (e.g. `🖐️ Левая рука: Указательный палец`).
  - Clears highlights on completion or destroy.

### 3. Real-Time Metrics & Error Counter
- Add `<span class="stat-item">❌ Ошибки: <strong id="tt-errors">0</strong></span>` into `#tt-stats`.
- Add `<div class="result-stat"><span class="result-stat-label">Ошибки</span><span class="result-stat-value" id="tt-res-errors">0</span><span class="result-stat-unit">шт</span></div>` into `#tt-result` `.result-stats`.
- Maintain `_errors` in internal state, incremented on every mismatched keystroke (`typedChar !== expectedChar`).
- Update `updateStats()` in real-time:
  - Guard CPM against first-keystroke spike (`elapsedSeconds >= 1.0 ? Math.round((_correctChars / elapsedSeconds) * 60) : 0`).
  - Calculate accuracy with divide-by-zero protection: `total > 0 ? Math.max(0, Math.min(100, Math.round((_correctChars / total) * 100))) : 100`.
  - Update `#tt-errors` in real-time.

### 4. M2 ↔ M4 Session Completion Contract
- Implement `finishSession()`:
  - Computes final metrics: `speed`, `accuracy`, `errors`, `level`, `duration`, `date`.
  - Returns the session summary object `{ speed, accuracy, errors, level, duration, date }`.
  - Persists to `App.saveProgress(studentId, 'typing', sessionSummary)` when App is present.
  - Updates `#tt-result` and displays result card.
- Expose `window.TypingTrainer.finishSession()` on the public API alongside `init`, `start`, `destroy`.

### 5. Verification
- Run tests: `node tests/runner.js`.
- Ensure all tests pass.
- Write a detailed completion report to `C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\.agents\teamwork\worker_m2_1\handoff.md`.
- Notify sub-orchestrator via `send_message`.


## 2026-11-12T16:34:06Z
[Message] timestamp=2026-11-12T16:34:06Z sender=20cfc342-6de1-46c2-b368-f4546fe8dfe0 priority=MESSAGE_PRIORITY_HIGH content=You are Worker M2.1 for Milestone 2 (Touch Typing Ergonomics & Hands Visualizer).
Read your dispatch instructions at C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\.agents\teamwork\worker_m2_1\DISPATCH.md.
Also read C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\.agents\teamwork\ORIGINAL_REQUEST.md, C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\PROJECT.md, C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\.agents\teamwork\sub_orch_m2\SCOPE.md, and the three explorer reports in explorer_m2_1, explorer_m2_2, explorer_m2_3.
Your state folder is C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\.agents\teamwork\worker_m2_1.
Your exclusive file to modify is modules/typing.js.
MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Implement all 5 tasks from DISPATCH.md:
1. 34-key Russian ЙЦУКЕН layout with .kb-zone-* classes.
2. Interactive Hands Visualizer widget with 10 fingers, cue badge, and dynamic .finger-active highlight.
3. Real-time metrics with live #tt-errors, live accuracy %, and first-keystroke CPM spike guard.
4. M2 <-> M4 session contract (finishSession method, error count included in payload).
5. Run tests via `node tests/runner.js`, verify everything passes, and write your handoff report to C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\.agents\teamwork\worker_m2_1\handoff.md.
When finished, notify me via send_message.
