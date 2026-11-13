# E2E Test Infra: 7th-Grade Computer Trainer SPA

## Test Philosophy
- Opaque-box, requirement-driven. Derives test cases directly from user requirements and acceptance criteria in `ORIGINAL_REQUEST.md`.
- Methodology: Category-Partition + Boundary Value Analysis (BVA) + Pairwise Combinatorial Testing + Real-World Workload Testing.
- Execution environment: Local Node.js test harness and Python test runners executing against the SPA DOM, CSS, data files, and runtime behavior.
- Autonomous & Offline: No external internet access needed to execute the test suite.

## Feature Inventory
| # | Feature | Source (requirement) | Tier 1 | Tier 2 | Tier 3 |
|---|---------|---------------------|:------:|:------:|:------:|
| F1 | UI/UX Design System | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ |
| F2 | Multi-Resolution Layout (1280x720, 1366x768, 1920x1080) | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ |
| F3 | Interactive States (Hover/Active/Focus) | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ |
| F4 | Strict Offline Autonomy (No Remote CDNs/Assets) | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ |
| F5 | 10-Finger Zone Color Coding | ORIGINAL_REQUEST §R3 | 5 | 5 | ✓ |
| F6 | Hands Visualizer & Key Highlight | ORIGINAL_REQUEST §R3 | 5 | 5 | ✓ |
| F7 | Live Metrics (CPM, Accuracy %, Live Errors, Punctuation) | ORIGINAL_REQUEST §R3 | 5 | 5 | ✓ |
| F8 | Mouse: Single Click Precision | ORIGINAL_REQUEST §R4 | 5 | 5 | ✓ |
| F9 | Mouse: Double Click Detection (<450ms) | ORIGINAL_REQUEST §R4 | 5 | 5 | ✓ |
| F10 | Mouse: Right Click Context Menu (`preventDefault`) | ORIGINAL_REQUEST §R4 | 5 | 5 | ✓ |
| F11 | Mouse: Drag-and-Drop File Sorting | ORIGINAL_REQUEST §R4 | 5 | 5 | ✓ |
| F12 | Mouse: Hover Tooltips & Coordination | ORIGINAL_REQUEST §R4 | 5 | 5 | ✓ |
| F13 | Offline Web Audio Feedback | ORIGINAL_REQUEST §R4 | 5 | 5 | ✓ |
| F14 | Gamification (XP, 5 Levels, 5 Badges, Progress Bar) | ORIGINAL_REQUEST §R5 | 5 | 5 | ✓ |
| F15 | 79 Students (7A-7D) & Lessons 7-2-2..7-2-6 Preservation | ORIGINAL_REQUEST §R5 | 5 | 5 | ✓ |
| F16 | Teacher Dashboard & CSV Export | ORIGINAL_REQUEST §R5 | 5 | 5 | ✓ |
| F17 | Network-Aware Auto-Update & Silent Offline Fallback | ORIGINAL_REQUEST §Follow-up 1 | 5 | 5 | ✓ |
| F20 | Offline-First Telemetry, Auto-POST & Multi-PC Sync | ORIGINAL_REQUEST §Follow-up 2 | 5 | 5 | ✓ |
| F21 | FocusGuard Anti-Cheat Protection & Tab Loss Voiding | ORIGINAL_REQUEST §Follow-up 3 | 5 | 5 | ✓ |
| F18 | Comprehensive E2E Workflow Integration | Acceptance Criteria | 5 | 5 | ✓ |
| F19 | Stress & Edge-Case Robustness | Acceptance Criteria | 5 | 5 | ✓ |

## Test Architecture
- **Directory Layout**:
  - `tests/runner.js`: Master test runner executing all suites.
  - `tests/tier1_features/`: Feature isolation test cases (>=95 tests).
  - `tests/tier2_boundaries/`: Boundary value and edge cases (>=95 tests).
  - `tests/tier3_pairwise/`: Cross-feature interaction tests (>=20 tests).
  - `tests/tier4_scenarios/`: Real-world 7th-grade student and teacher application scenarios (>=10 tests).
  - `tests/tier5_adversarial/`: White-box coverage and stress test suite.
- **Pass/Fail Semantics**: All suites return exit code 0 when all assertions pass, non-zero on any assertion failure.
- **Output Artifact**: Test track publishes `TEST_READY.md` upon completion of Tiers 1-4.

## Real-World Application Scenarios (Tier 4)
| # | Scenario | Features Exercised | Complexity |
|---|----------|--------------------|------------|
| 1 | Full Student Login, Class Selection & Lesson Inspection | F1, F2, F4, F15 | Medium |
| 2 | Complete Touch Typing Session (Level 1..5) with Live CPM and Accuracy | F5, F6, F7, F14 | High |
| 3 | Complete Mouse Training Curriculum (Click -> Dblclick -> Context -> Drag-Drop -> Hover) | F8, F9, F10, F11, F12, F13 | High |
| 4 | Student Gamification Progression from "Новичок" to Level Up with Badges | F14, F15 | Medium |
| 5 | Teacher Panel Audit: Review 79 students, Filter Class, Export CSV, Safe Reset | F15, F16, F2 | Medium |
| 6 | Network Connectivity Simulation: Offline boot -> Network Online -> Manifest Check -> Network Disconnect | F4, F17 | High |
| 7 | Multi-Resolution Layout Verification on 1280x720, 1366x768, 1920x1080 | F1, F2, F3 | High |
| 8 | Concurrent Progress Storage: Multiple Students Progress Tracking without Collision | F14, F15, F16 | Medium |
| 9 | Rapid Typing with Errors and Punctuation Handling | F6, F7, F13 | Medium |
| 10 | Complete Student End-to-End Lesson & Practical Session | F1..F16 | Complex |

## Coverage Thresholds
- Tier 1: ≥5 per feature (≥95 tests)
- Tier 2: ≥5 per feature (≥95 tests)
- Tier 3: Pairwise combinations across major features (≥20 tests)
- Tier 4: ≥10 realistic application scenarios
- Tier 5: Adversarial edge cases and coverage hardening
