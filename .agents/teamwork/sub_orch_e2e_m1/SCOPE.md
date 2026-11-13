# Scope: Milestone E2E-M1 (Test Infrastructure & Runner)

## Architecture
- **Purpose**: Provide a fast, robust, zero-external-dependency Node.js test runner and DOM testing environment for the 7th-Grade Computer Trainer SPA.
- **Components**:
  - `tests/runner.js`: Master test runner supporting `--tier <tier>`, `--filter <pattern>`, `--verbose`, colored terminal output, timing, and error reporting. Returns exit code 0 on all tests passing, exit code 1 on failure.
  - `tests/helpers/assert.js`: Assertion library providing descriptive error messages for equality, truthiness, deep object comparison, throws, regex matching, numeric bounds, and array/string inclusion.
  - `tests/helpers/dom_env.js`: Lightweight DOM and browser global stubs for headless Node.js testing of the SPA without requiring npm packages. Supports DOM tree creation, querySelector/querySelectorAll, classList, addEventListener/dispatchEvent, MouseEvent (click, dblclick, contextmenu), DragEvent (dragstart, dragover, drop), KeyboardEvent (keydown, keyup), CustomEvent, localStorage mock (including `sync_queue`), navigator.onLine mock, fetch mock / network interceptor for F20 telemetry sync testing, and Web Audio API mock.
  - `tests/test_infra.test.js`: Smoke test suite verifying test runner execution, assertion failures/passes, and DOM mocking functionality.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| E2E-M1-F1 | Master Test Runner | CLI runner with tier filtering, suite discovery, exit codes, and summary tables | E2E-M1 | SCOPE.md / TEST_INFRA.md |
| E2E-M1-F2 | Assertion Utilities | Full assertion toolkit with detailed diffs/messages for tests | E2E-M1 | SCOPE.md / TEST_INFRA.md |
| E2E-M1-F3 | Headless DOM & Browser Environment | Zero-dependency DOM, localStorage, navigator, Web Audio, and event dispatch stub | E2E-M1 | SCOPE.md / TEST_INFRA.md |
| E2E-M1-F4 | Infrastructure Smoke Suite | Self-test verifying assertions, environment stubs, and runner integration | E2E-M1 | SCOPE.md / TEST_INFRA.md |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | E2E-M1 | Test Infrastructure & Runner (`tests/runner.js`, `tests/helpers/assert.js`, `tests/helpers/dom_env.js`, `tests/test_infra.test.js`) | none | DONE (45/45 smoke tests pass, zero npm dependencies, verified by 2 Challengers, 2 Reviewers, and Forensic Auditor) |

## Interface Contracts
### Runner Contract (`node tests/runner.js`)
- Arguments:
  - `--tier <1|2|3|4|5|all>` (default: all)
  - `--filter <regex>` (optional test name or file filter)
  - `--verbose` (prints individual test assertions)
- Output: Color-coded console summary table (Passed, Failed, Total, Duration).
- Exit Code: `0` if all run tests pass, `1` if any test fails or error occurs during discovery/execution.

### Assertion Library Contract (`tests/helpers/assert.js`)
- `assert(condition, message)`
- `assertEquals(actual, expected, message)`
- `assertNotEquals(actual, expected, message)`
- `assertDeepEquals(actual, expected, message)`
- `assertThrows(fn, expectedErrorRegexOrType, message)`
- `assertDoesNotThrow(fn, message)`
- `assertContains(haystack, needle, message)`
- `assertBetween(val, min, max, message)`
- `assertTrue(val, message)` / `assertFalse(val, message)`
- `assertNull(val, message)` / `assertNotNull(val, message)`
- `AssertionError`: Custom error class with `actual`, `expected`, and formatted diff.

### DOM Environment Contract (`tests/helpers/dom_env.js`)
- `createTestEnv(htmlContent)` or `setupBrowserEnv(htmlPathOrString)`
- Injects or exposes `window`, `document`, `localStorage`, `navigator`, `AudioContext`, `CustomEvent`, `MouseEvent`, `KeyboardEvent`, `fetch` (with configurable mock responses and call tracking).
- Event dispatching simulates browser behavior for typing and mouse interactions.
- `teardownTestEnv()` for clean teardown between tests.
