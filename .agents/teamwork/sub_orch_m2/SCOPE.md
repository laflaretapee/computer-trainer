# Scope: Milestone 2 — Touch Typing Ergonomics & Hands Visualizer

## Architecture
- Module: `modules/typing.js`
- Screen: `#screen-typing` in `index.html`
- Styles: `style.css` (tokens, finger zone classes `.kb-zone-*`) and scoped component styles in `typing.js`
- Data Flow:
  - User selects level (1 to 5) in typing screen.
  - Sentence / exercise loaded.
  - Active character tracked by index `_currentPos`.
  - Next expected key is highlighted on screen keyboard (`.kb-key.key-next`).
  - Active finger is highlighted on visual Hands Indicator (`.finger-active`, corresponding hand & finger, both thumbs for Spacebar).
  - Key press event listener checks match:
    - Match: marks character green, advances index, updates speed and accuracy.
    - Mismatch: marks character red, increments errors count, updates live `#tt-errors`, recalculates accuracy.
  - Exercise completion: computes final CPM, accuracy, errors, duration.
  - Calls `TypingTrainer.finishSession()` emitting `{ speed, accuracy, errors, level, duration, date }` adhering to M2 ↔ M4 contract.

## Feature Inventory
| # | Feature | Description | Milestone | Source | Status |
|---|---------|-------------|-----------|--------|--------|
| F5 | 10-Finger Zone Color Coding | Visual keyboard keys colored by 10 anatomical finger zones matching style.css | M2 | Survey / R3 | DONE |
| F6 | Visual Hands & Key Highlight | Dynamic hands visualizer component highlighting current finger and target key | M2 | Survey / R3 | DONE |
| F7 | Real-Time Typing Metrics & Punctuation | Live CPM, accuracy %, live error counter, punctuation (`.`, `,`) support | M2 | Survey / R3 | DONE |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 2.1 | Exploration & Architecture | Investigate current typing.js, style.css, and devise concrete implementation specs | none | DONE |
| 2.2 | Implementation in modules/typing.js | Implement zones, hands visualizer, punctuation, error counter, metrics | 2.1 | DONE |
| 2.3 | Verification & Auditing | Reviewers, Challengers, Forensic Auditor across Iterations 1 & 2 | 2.2 | DONE |
| 2.4 | Gate & Reporting | Evaluate gate, record verdicts, report completion to parent | 2.3 | DONE (Gate PASS) |

## Interface Contracts
### M1 ↔ M2 (CSS Design System Contract)
- Finger zone classes: `.kb-zone-pinky-l`, `.kb-zone-ring-l`, `.kb-zone-mid-l`, `.kb-zone-idx-l`, `.kb-zone-idx-r`, `.kb-zone-mid-r`, `.kb-zone-ring-r`, `.kb-zone-pinky-r`, `.kb-zone-thumb`.
- CSS tokens: `--color-primary`, `--color-accent`, `--color-warn`, `--color-error`, `--shadow-key`, `--radius-md`.
- Active states: `.key-next`, `.active` for current target key, `.finger-active` for active finger on visual hands.

### M2 ↔ M4 (Typing Progress Contract)
- `TypingTrainer.finishSession()` emits session summary:
  `{ speed: number, accuracy: number, errors: number, level: number, duration: number, date: string }`.
- Persisted into `trainer_progress[studentId].typing.sessions` via `App.saveProgress`.
