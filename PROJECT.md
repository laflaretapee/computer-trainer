# Project: 7th-Grade Computer Trainer SPA (Offline Educational Product)

## Architecture
- **Paradigm**: Offline-first Single Page Application (SPA), Pure Vanilla ES6+ JavaScript, Semantic HTML5, Modular CSS3 Design Tokens.
- **Zero-Dependency Core**: Completely self-contained without Node/npm runtime dependencies or remote CDNs. Runs directly in browser via `file:///` or local static HTTP server.
- **Data Flow**:
  - `data/students.js` & `data/students.json`: Authoritative student rosters (79 students across 7-А, 7-Б, 7-В, 7-Г, 7-Д).
  - `data/content.js` & `data/content.json`: Lessons 7-2-2 to 7-2-6 with 175 local slide images in `indexed/` and 5 knowledge tests.
  - `localStorage['trainer_progress']`: Student activity sessions, additive schema supporting typing, mouse exercises, tests, and gamification points/badges.
  - `modules/typing.js`: Touch typing engine with 10-finger zone mapping, hands visualizer, and real-time metrics.
  - `modules/mouse.js`: 5-level mouse trainer covering single/double/right click, drag-and-drop, and hover with Web Audio synthesis.
  - `modules/teacher.js`: Dashboard, student filtering, stats aggregation, CSV export, and safe data management.
  - `app.js`: Application controller, screen router, modal manager, gamification engine, and network-aware auto-update checker.
- **Auto-Update Architecture**:
  - Network listener (`navigator.onLine`, `online`/`offline` events).
  - Non-blocking manifest fetch (`version.json`) with `AbortController` timeout (2500ms) only when connected.
  - Strict offline fail-safe: Zero blocking, zero errors, silent offline mode.
  - UI indicator and manual check button in teacher panel/header.

## Code Layout
- `index.html`: Main SPA document and screen containers (`#screen-class`, `#screen-student`, `#screen-menu`, `#screen-typing`, `#screen-mouse`, `#screen-theory`, `#screen-test`, `#screen-stats`, `#screen-teacher`).
- `style.css`: Unified design system, CSS custom properties, responsive media queries (1280x720, 1366x768, 1920x1080), animations, interactive states (`:hover`, `:active`, `:focus-visible`).
- `app.js`: Core controller, screen switching, session management, gamification, and auto-update logic.
- `modules/typing.js`: Visual keyboard, touch typing engine, hands indicator, CPM/accuracy/error tracking.
- `modules/mouse.js`: Mouse interaction exercises, drag-and-drop mechanics, synthesized Web Audio sound effects.
- `modules/teacher.js`: Teacher dashboard, sticky table, student progress review, UTF-8 BOM CSV export.
- `version.json`: Local application version manifest for auto-update comparison.
- `tests/`: E2E test runner, test cases (Tiers 1-5), and verification harnesses.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| F1 | Modern UI/UX Design System | Color tokens, modern typography, card styling, 7th-grade friendly aesthetic | M1 | Survey / R1 |
| F2 | Responsive Multi-Resolution Layout | Elimination of visual overlaps, modal overflow fixes on 1280x720, 1366x768, 1920x1080 | M1 | Survey / R1 |
| F3 | Accessible Interactive States | Comprehensive `:hover`, `:active`, and `:focus-visible` states on all controls | M1 | Survey / R1 |
| F4 | 100% Strict Offline Operation | Zero CDN links, zero remote fonts/styles/scripts, local assets only | M1, M4 | Survey / R2 |
| F5 | 10-Finger Zone Color Coding | Visual keyboard keys colored by 10 anatomical finger zones | M2 | Survey / R3 |
| F6 | Visual Hands & Key Highlight | Dynamic hands visualizer component highlighting current finger and target key | M2 | Survey / R3 |
| F7 | Real-Time Typing Metrics & Punctuation | Live CPM, accuracy %, live error counter, punctuation (`.`, `,`) support | M2 | Survey / R3 |
| F8 | Mouse Trainer: Single Click | Precision target clicking, accuracy tracking, missed click penalty | M3 | Survey / R4 |
| F9 | Mouse Trainer: Double Click | OS-style folder/app launching with standard interval (<450ms) detection | M3 | Survey / R4 |
| F10 | Mouse Trainer: Right Click Context Menu | Custom OS context menu with `preventDefault()`, action selection | M3 | Survey / R4 |
| F11 | Mouse Trainer: Drag-and-Drop | File sorting into destination folders (Docs, Images, Music, Trash) | M3 | Survey / R4 |
| F12 | Mouse Trainer: Hover & Tooltips | Hover inspection, tooltip display, boundary coordination | M3 | Survey / R4 |
| F13 | Offline Web Audio Feedback | Synthesized audio chimes and error sounds without external audio files | M3 | Survey / R4 |
| F14 | Gamification System | XP points, 5 progressive levels, 5 achievement badges, visual progress bar | M4 | Survey / R5 |
| F15 | Student & Content Data Preservation | Complete integrity of 79 students (7A-7D) and lessons 7-2-2 to 7-2-6 | M4 | Survey / R5 |
| F16 | Teacher Dashboard Enhancement | Sticky header, mouse progress & XP display, backward-compatible CSV export | M4 | Survey / R5 |
| F17 | Network-Aware Auto-Update | `navigator.onLine` check, `version.json` manifest comparison, silent offline fallback, UI status | M4 | Follow-up 1 |
| F20 | Offline-First Telemetry & Progress Sync | Local sync queue, auto/manual POST on internet connect, teacher panel sync settings, multi-PC JSON bundle import/merge | M4 | Follow-up 2 |
| F21 | FocusGuard Anti-Cheat Protection | Window focus & visibility monitoring in typing, mouse & tests; pre-start warning; instant session voiding & violation logging | M4 | Follow-up 3 |
| F18 | Full E2E Test Suite Pass | 100% pass on requirement-driven test cases across Tiers 1-4 | M5 | Dual Track |
| F19 | Adversarial Coverage Hardening | Tier 5 adversarial stress testing and edge-case boundary verification | M5 | Final Phase |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | UI/UX Design System & Responsive Layout | CSS token architecture, 37 missing class fixes, 1280x720/1366x768/1920x1080 media queries, hover/active/focus-visible states | none | DONE (worker_m1_2 verified, 0 failures across 9 viewports, all regression suites pass) |
| M2 | Touch Typing Ergonomics & Hands Visualizer | 10-finger color zones, visual hands indicator, full ЙЦУКЕН punctuation support, live error counter, CPM/accuracy engine | M1 | DONE (sub_orch_m2 Gate 2 PASS: 47/47 typing tests pass, Auditor CLEAN) |
| M3 | Interactive Mouse Trainer & Informatics Tasks | `modules/mouse.js` 5 levels (click, dblclick, right click, drag-drop, hover), Web Audio synthesis, screen integration | M1 | DONE (sub_orch_m3 Gate PASS: 135/135 master tests pass, Auditor CLEAN) |
| M4 | Gamification, Auto-Update, Data Integrity, Telemetry Sync & FocusGuard | XP/levels/badges, 79-student & 5-lesson data preservation, teacher panel upgrade, auto-update mechanism, offline-first progress sync queue, multi-PC JSON bundle merging & FocusGuard anti-cheat | M1, M2, M3 | IN_PROGRESS |
| M5 | Final E2E Suite Pass & Adversarial Hardening | 100% pass on E2E test suite (Tiers 1-4) and Tier 5 adversarial testing | M4, TEST_READY | PLANNED |

## Interface Contracts

### M1 ↔ M2 / M3 / M4 (CSS Design System Contract)
- Finger zone classes: `.kb-zone-pinky-l`, `.kb-zone-ring-l`, `.kb-zone-mid-l`, `.kb-zone-idx-l`, `.kb-zone-idx-r`, `.kb-zone-mid-r`, `.kb-zone-ring-r`, `.kb-zone-pinky-r`, `.kb-zone-thumb`.
- Interactive state tokens: `--color-primary`, `--color-accent`, `--color-warn`, `--color-error`, `--shadow-key`, `--radius-md`.
- Layout wrappers: `.screen-body` (fluid clamp), `.table-responsive`, `.modal-box`, `.result-stats`, `.result-stat`, `.btn-danger`.
- Focus ring: All interactive elements support `:focus-visible` with 3px primary outline.

### M2 ↔ M4 (Typing Progress Contract)
- `TypingTrainer.finishSession()` emits session summary:
  `{ speed: number, accuracy: number, errors: number, level: number, duration: number, date: string }`.
- Persisted into `trainer_progress[studentId].typing.sessions`.

### M3 ↔ M4 (Mouse Progress Contract)
- `MouseTrainer.finishSession()` emits session summary:
  `{ taskId: string, taskName: string, score: number, time: number, stars: number, date: string }`.
- Persisted into `trainer_progress[studentId].mouse.sessions` and `completedTasks`.

### M4 ↔ Teacher Dashboard & Storage Contract
- Additive schema preserves existing keys: `studentId`, `name`, `class`, `typing`, `tests`.
- Adds `mouse` and `gamification` (`points`, `level`, `levelTitle`, `achievements`).
- CSV export preserves UTF-8 BOM and initial columns, appending mouse and gamification columns.
- `version.json` schema: `{ "version": "1.1.0", "buildDate": "2026-11-11", "features": [...] }`.
