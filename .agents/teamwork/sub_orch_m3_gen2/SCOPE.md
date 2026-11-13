# Scope: Milestone 3 (Interactive Mouse Trainer & Informatics Tasks)

## Architecture
- Module: `modules/mouse.js` exposing `window.MouseTrainer = { init, start, destroy, finishSession, selectExercise }`.
- Integration:
  - Screen container `#screen-mouse` in `index.html`.
  - Menu navigation button in `#screen-menu`.
  - Script inclusion `<script src="modules/mouse.js"></script>` in `index.html`.
  - Offline synthesized audio feedback using browser Web Audio API (`AudioContext`) with user gesture handling.
  - Session progress format conforming to M3 ↔ M4 interface contract:
    `MouseTrainer.finishSession()` emits `{ taskId: string, taskName: string, score: number, time: number, stars: number, date: string }`
    stored in `trainer_progress[studentId].mouse.sessions` and `completedTasks`.

## Feature Inventory (Milestone 3 Scope)
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| F8 | Mouse Trainer: Single Click | Precision target clicking, accuracy tracking, missed click penalty (7th-grade topic: precision pointer control) | M3 | Survey / R4 |
| F9 | Mouse Trainer: Double Click | OS-style folder/app launching with standard interval (<450ms) detection (7th-grade topic: GUI control actions) | M3 | Survey / R4 |
| F10 | Mouse Trainer: Right Click Context Menu | Custom OS context menu with `preventDefault()`, action selection (7th-grade topic: file/desktop operations) | M3 | Survey / R4 |
| F11 | Mouse Trainer: Drag-and-Drop | File sorting into destination folders (Docs, Images, Music, Trash) based on file extensions (7th-grade topic: 7-2-3 Files and catalogs) | M3 | Survey / R4 |
| F12 | Mouse Trainer: Hover & Tooltips | Hover inspection, tooltip display, boundary coordination (7th-grade topic: user interface elements) | M3 | Survey / R4 |
| F13 | Offline Web Audio Feedback | Synthesized audio chimes and error sounds without external audio files | M3 | Survey / R4 |

## Milestones / Iteration Items
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M3-1 | Iteration 1: Full Implementation & Verification | Complete mouse module, 5 exercises, audio synthesis, HTML/CSS integration, E2E & unit tests | M1 | DONE |
| M3-2 | Iteration 2: Remediation & Final Verification | Concurrency latches, lifecycle idempotency, test runner crash fix, full gate verification | M3-1 | IN_PROGRESS |

## Code Layout
- `modules/mouse.js`: Primary implementation of MouseTrainer engine, exercises, and Web Audio synthesis.
- `index.html`: `#screen-mouse` container, menu button in `#screen-menu`, script tag for `modules/mouse.js`.
- `style.css`: CSS styling for mouse trainer exercises, targets, desktop icons, context menu, drag-and-drop zones, tooltips.
- `tests/tier1_features/test_mouse_trainer.test.js`: Feature verification test suite.
- `tests/tier5_adversarial/test_mouse_adversarial.test.js`: Adversarial suite 1.
- `tests/tier5_adversarial/test_mouse_adversarial_challenger2.test.js`: Adversarial suite 2.
