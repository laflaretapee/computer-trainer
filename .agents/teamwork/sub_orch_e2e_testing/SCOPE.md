# Scope: E2E Testing Track

## Architecture
- **Philosophy**: Requirement-driven, opaque-box testing derived directly from `ORIGINAL_REQUEST.md` without coupling to internal implementation logic.
- **Directory Structure**:
  - `tests/runner.js`: Master test runner with colorized output, tier execution filters, exit code conventions, and JSON/summary reporting.
  - `tests/helpers/`: Lightweight test assertions and browser environment mocks (DOM, localStorage, Web Audio, navigator.onLine) to run tests under Node.js with zero npm external dependencies.
  - `tests/tier1_features/`: Feature isolation suites for F1-F19 (≥95 tests, ≥5 tests per feature).
  - `tests/tier2_boundaries/`: Boundary value and error case suites for F1-F19 (≥95 tests, ≥5 tests per feature).
  - `tests/tier3_pairwise/`: Cross-feature interaction test suites (≥20 pairwise combination tests).
  - `tests/tier4_scenarios/`: Real-world 7th-grade student and teacher end-to-end scenarios (10 complex multi-feature tests).
  - `TEST_READY.md`: Signal file published at project root upon completion.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| F1 | Modern UI/UX Design System | Color tokens, modern typography, card styling, 7th-grade friendly aesthetic | E2E-M2 | ORIGINAL_REQUEST §R1 |
| F2 | Responsive Multi-Resolution Layout | Elimination of visual overlaps on 1280x720, 1366x768, 1920x1080 | E2E-M2 | ORIGINAL_REQUEST §R1 |
| F3 | Accessible Interactive States | Comprehensive `:hover`, `:active`, and `:focus-visible` states on all controls | E2E-M2 | ORIGINAL_REQUEST §R1 |
| F4 | 100% Strict Offline Operation | Zero CDN links, zero remote fonts/styles/scripts, local assets only | E2E-M2 | ORIGINAL_REQUEST §R2 |
| F5 | 10-Finger Zone Color Coding | Visual keyboard keys colored by 10 anatomical finger zones | E2E-M2 | ORIGINAL_REQUEST §R3 |
| F6 | Visual Hands & Key Highlight | Dynamic hands visualizer component highlighting current finger and target key | E2E-M2 | ORIGINAL_REQUEST §R3 |
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
| F18 | Full E2E Test Suite Pass | 100% pass on requirement-driven test cases across Tiers 1-4 | E2E-M4 | Acceptance Criteria |
| F19 | Stress & Edge-Case Robustness | Tier 2 boundaries and Tier 3 pairwise interactions | E2E-M3 | Acceptance Criteria |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| E2E-M1 | Test Infrastructure & Runner | `tests/runner.js`, `tests/helpers/assert.js`, test execution harness, CLI argument parsing, suite discovery | none | DONE |
| E2E-M2 | Tier 1 Feature Coverage Suite | `tests/tier1_features/`: ≥100 unit/feature tests (≥5 per feature for F1..F20) | E2E-M1 | IN_PROGRESS |
| E2E-M3 | Tier 2 Boundary & Corner Cases Suite | `tests/tier2_boundaries/`: ≥100 boundary/edge tests (≥5 per feature for F1..F20) | E2E-M1 | IN_PROGRESS |
| E2E-M4 | Tier 3 Pairwise & Tier 4 Scenarios Suite | `tests/tier3_pairwise/` (≥20 tests) & `tests/tier4_scenarios/` (10 real-world scenarios) | E2E-M1, E2E-M2, E2E-M3 | PLANNED |
| E2E-M5 | Master Verification & TEST_READY.md | Execute all suites via `node tests/runner.js`, verify 0 exit code, publish `TEST_READY.md` at project root | E2E-M1..E2E-M4 | PLANNED |

## Interface Contracts

### Test Runner Contract (`tests/runner.js`)
- Invocation: `node tests/runner.js [--tier 1|2|3|4|all]`
- Exit code: `0` if all tests in selected tier(s) pass, `1` if any test fails.
- Output: Structured summary to stdout with test names, pass/fail status, total counts, and execution duration.

### Test Case Contract (`tests/tier*/**/*.test.js`)
- Format: CommonJS or ES module executable under Node.js.
- Export: Async or sync run function, or self-registering test definitions.
- Failure mode: Throws `AssertionError` with clear message on failure.
