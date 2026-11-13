# Scope: Milestone E2E-M3 — Tier 2 Boundary & Corner Cases Suite

## Architecture
- **Objective**: Implement comprehensive, requirement-driven, opaque-box Tier 2 boundary and corner case test suites in `tests/tier2_boundaries/` covering F1-F20 with >=100 tests (>=5 tests per feature).
- **Harness Integration**: Executes seamlessly under `node tests/runner.js --tier 2` using `tests/helpers/assert.js` and `tests/helpers/dom_env.js`.
- **Zero Remote Dependencies**: Self-contained Node.js execution with mocked DOM, Web Audio, localStorage, and network APIs.

## Feature Inventory & Test Mapping
| # | Feature | Scope / Edge Cases Covered | Assigned File | Target Count |
|---|---------|----------------------------|---------------|--------------|
| F1 | Modern UI/UX Design System | Extreme window bounds, contrast tokens, zero overflow | `b01_layout_boundaries.test.js` | ≥5 |
| F2 | Responsive Multi-Resolution Layout | Rapid resize events, 1280x720, 1366x768, 1920x1080 bounds, modal clipping | `b01_layout_boundaries.test.js` | ≥5 |
| F3 | Accessible Interactive States | Focus trapping, non-interactive focus rejection, rapid state toggling | `b01_layout_boundaries.test.js` | ≥5 |
| F4 | 100% Strict Offline Operation | Zero external network requests under simulated offline, missing asset fallback | `b02_offline_resilience.test.js` | ≥5 |
| F5 | 10-Finger Zone Color Coding | Key mapping edge cases, unmapped keys, non-standard key layouts | `b03_typing_edge_cases.test.js` | ≥5 |
| F6 | Visual Hands & Key Highlight | Rapid key spam, rapid alternate finger transitions, boundary characters | `b03_typing_edge_cases.test.js` | ≥5 |
| F7 | Real-Time Typing Metrics & Punctuation | 0% accuracy, 100% errors, backspace spam, CPM bounds, punctuation (`.`, `,`) | `b03_typing_edge_cases.test.js` | ≥5 |
| F8 | Mouse Trainer: Single Click | Sub-pixel targets, missed clicks outside bounds, rapid clicks | `b04_mouse_boundaries.test.js` | ≥5 |
| F9 | Mouse Trainer: Double Click | Sub-threshold (>450ms) rejection, ultra-fast (<20ms) double clicks, triple click | `b04_mouse_boundaries.test.js` | ≥5 |
| F10 | Mouse Trainer: Right Click Context Menu | Right click outside target area, `preventDefault` cancel, escape key close | `b04_mouse_boundaries.test.js` | ≥5 |
| F11 | Mouse Trainer: Drag-and-Drop | Invalid drop zones, boundary drag abort, dragging outside viewport | `b05_drag_audio_boundaries.test.js` | ≥5 |
| F12 | Mouse Trainer: Hover & Tooltips | Rapid hover entry/exit, tooltip bounds clipping, hovering disabled items | `b05_drag_audio_boundaries.test.js` | ≥5 |
| F13 | Offline Web Audio Feedback | AudioContext suspended state, audio error fallback, rapid concurrent sound triggers | `b05_drag_audio_boundaries.test.js` | ≥5 |
| F14 | Gamification System | 0 XP boundary, Level 5 max boundary overflow, duplicate badge prevention, negative XP prevention | `b06_gamification_boundaries.test.js` | ≥5 |
| F15 | Student & Content Data Preservation | Missing student list, corrupted student JSON schema, duplicate student IDs | `b07_data_storage_boundaries.test.js` | ≥5 |
| F16 | Teacher Dashboard Enhancement | Corrupted localStorage JSON, safe data reset confirmation, CSV export with quotes/commas/Cyrillic | `b07_data_storage_boundaries.test.js` | ≥5 |
| F17 | Network-Aware Auto-Update | Rapid online/offline flapping, 2500ms abort timeout, 404/500/corrupt JSON response | `b08_autoupdate_network_flaps.test.js` | ≥5 |
| F20 | Offline-First Telemetry & Sync | Empty sync queue, server 500 error retry without data loss, corrupted bundle import, duplicate session merge conflict | `b09_telemetry_sync_boundaries.test.js` | ≥5 |

## Interface Contracts
- All test files reside in `tests/tier2_boundaries/` matching naming pattern `b01_*.test.js` through `b09_*.test.js`.
- Tests must be executable via `node tests/runner.js --tier 2` and return exit code 0.
- Total test count across Tier 2 must be >= 100 tests.
