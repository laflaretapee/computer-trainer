# Scope: Milestone E2E-M2 — Tier 1 Feature Coverage Suite

## Architecture
- **Purpose**: Comprehensive requirement-driven, opaque-box Tier 1 test coverage suite (>=100 tests, >=5 tests per feature for F1-F20) residing in `tests/tier1_features/`.
- **Target Files**:
  1. `tests/tier1_features/f01_ui_theme.test.js`: F1 Modern UI/UX tokens, typography, colors, card layouts (>=5 tests).
  2. `tests/tier1_features/f02_responsive.test.js`: F2 Responsive layouts across 1280x720, 1366x768, 1920x1080, overflow & modal sizing (>=5 tests).
  3. `tests/tier1_features/f03_interactive_states.test.js`: F3 Interactive states (:hover, :active, :focus-visible) on buttons, inputs, cards (>=5 tests).
  4. `tests/tier1_features/f04_offline_assets.test.js`: F4 100% offline autonomy, no external CDNs/fonts/scripts, file:/// and local HTTP safety (>=5 tests).
  5. `tests/tier1_features/f05_f06_f07_typing.test.js`: F5 (10-finger zone colors), F6 (visual hands & key highlight), F7 (live CPM, accuracy %, live error count, punctuation) (>=15 tests).
  6. `tests/tier1_features/f08_f13_mouse.test.js`: F8 (single click), F9 (double click <450ms), F10 (contextmenu preventDefault), F11 (drag-and-drop file sorting), F12 (hover tooltips), F13 (offline Web Audio feedback) (>=30 tests).
  7. `tests/tier1_features/f14_gamification.test.js`: F14 Gamification XP points, 5 progressive levels, 5 achievement badges, progress bar (>=5 tests).
  8. `tests/tier1_features/f15_f16_data_teacher.test.js`: F15 (79 students 7A-7D, lessons 7-2-2..7-2-6 integrity), F16 (teacher dashboard, table, stats, UTF-8 BOM CSV export) (>=10 tests).
  9. `tests/tier1_features/f17_auto_update.test.js`: F17 Network-aware auto-update check, version.json manifest, silent offline fallback, UI button/indicator (>=5 tests).
  10. `tests/tier1_features/f20_telemetry_sync.test.js`: F20 Offline sync queue, auto/manual POST on network online, teacher sync panel, multi-PC JSON bundle export/merge (>=5 tests).
- **Test Infrastructure Integration**:
  - Leverages `tests/runner.js` runner harness (`describe`, `test`, `beforeEach`, etc.).
  - Uses `tests/helpers/assert.js` assertion library (`assert`, `assertEquals`, `assertContains`, `assertThrows`, etc.).
  - Uses `tests/helpers/dom_env.js` lightweight headless browser mock (`setupBrowserEnv`, `teardownBrowserEnv`, `MockMouseEvent`, `MockKeyboardEvent`, `MockDragEvent`, etc.).
  - Invocation: `node tests/runner.js --tier 1` executes all tests and exits with code 0 on complete pass.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| F1 | Modern UI/UX Design System | Color tokens, typography, card styling, 7th-grade friendly aesthetic | E2E-M2 | ORIGINAL_REQUEST §R1 |
| F2 | Responsive Multi-Resolution Layout | Elimination of visual overlaps on 1280x720, 1366x768, 1920x1080 | E2E-M2 | ORIGINAL_REQUEST §R1 |
| F3 | Accessible Interactive States | Comprehensive `:hover`, `:active`, and `:focus-visible` states | E2E-M2 | ORIGINAL_REQUEST §R1 |
| F4 | 100% Strict Offline Operation | Zero CDN links, zero remote fonts/styles/scripts, local assets only | E2E-M2 | ORIGINAL_REQUEST §R2 |
| F5 | 10-Finger Zone Color Coding | Visual keyboard keys colored by 10 anatomical finger zones | E2E-M2 | ORIGINAL_REQUEST §R3 |
| F6 | Visual Hands & Key Highlight | Dynamic hands visualizer component highlighting finger and target key | E2E-M2 | ORIGINAL_REQUEST §R3 |
| F7 | Real-Time Typing Metrics & Punctuation | Live CPM, accuracy %, live error counter, punctuation (`.`, `,`) support | E2E-M2 | ORIGINAL_REQUEST §R3 |
| F8 | Mouse Trainer: Single Click | Precision target clicking, accuracy tracking, missed click penalty | E2E-M2 | ORIGINAL_REQUEST §R4 |
| F9 | Mouse Trainer: Double Click | OS-style folder/app launching with standard interval (<450ms) detection | E2E-M2 | ORIGINAL_REQUEST §R4 |
| F10 | Mouse Trainer: Right Click Context Menu | Custom OS context menu with `preventDefault()`, action selection | E2E-M2 | ORIGINAL_REQUEST §R4 |
| F11 | Mouse Trainer: Drag-and-Drop | File sorting into destination folders (Docs, Images, Music, Trash) | E2E-M2 | ORIGINAL_REQUEST §R4 |
| F12 | Mouse Trainer: Hover & Tooltips | Hover inspection, tooltip display, boundary coordination | E2E-M2 | ORIGINAL_REQUEST §R4 |
| F13 | Offline Web Audio Feedback | Synthesized audio chimes and error sounds without external audio files | E2E-M2 | ORIGINAL_REQUEST §R4 |
| F14 | Gamification System | XP points, 5 progressive levels, 5 achievement badges, visual progress bar | E2E-M2 | ORIGINAL_REQUEST §R5 |
| F15 | Student & Content Data Preservation | Complete integrity of 79 students (7A-7D) and lessons 7-2-2 to 7-2-6 | E2E-M2 | ORIGINAL_REQUEST §R5 |
| F16 | Teacher Dashboard Enhancement | Sticky header, mouse progress & XP display, backward-compatible CSV export | E2E-M2 | ORIGINAL_REQUEST §R5 |
| F17 | Network-Aware Auto-Update | `navigator.onLine` check, `version.json` manifest comparison, silent offline fallback | E2E-M2 | ORIGINAL_REQUEST §Follow-up 1 |
| F20 | Offline-First Telemetry & Sync | Local sync queue, auto/manual POST on connect, teacher panel sync controls, multi-PC JSON bundle merge | E2E-M2 | ORIGINAL_REQUEST §Follow-up 2 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Exploration & Architecture Analysis | 3 Explorers map feature contracts, DOM environment capabilities, and test structure | none | IN_PROGRESS |
| 2 | Tier 1 Test Suite Implementation | 1 Worker implements `tests/tier1_features/*.test.js` (≥100 tests, ≥5 per feature) | 1 | PLANNED |
| 3 | Independent Dual Review | 2 Reviewers independently verify test adequacy, contract matching, and quality | 2 | PLANNED |
| 4 | Adversarial Mutation/Fault Verification | 2 Challengers verify tests fail when defects are introduced | 2 | PLANNED |
| 5 | Forensic Audit | 1 Auditor verifies no fake assertions, dummy passes, or integrity violations | 2, 3, 4 | PLANNED |
| 6 | Gate Verdict & Reporting | Evaluate gate in GATE_STATUS.md and deliver handoff to parent | 5 | PLANNED |

## Interface Contracts
- Tests must be executable with `node tests/runner.js --tier 1` and return exit code 0.
- Each test file exports/registers tests using global/runner BDD primitives (`describe`, `test`).
- Assertions strictly use `tests/helpers/assert.js`.
- DOM environment uses `tests/helpers/dom_env.js` with proper `setupBrowserEnv()` and `teardownBrowserEnv()`.
- Opaque-box contract: Tests verify user requirements, interfaces, state changes, and DOM elements according to `PROJECT.md` and `ORIGINAL_REQUEST.md`.
