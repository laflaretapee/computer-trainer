## 2026-11-11T10:36:49Z
You are the Worker for Milestone E2E-M1: Test Infrastructure & Runner.

Working Directory: C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer
State Folder: C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\.agents\teamwork\worker_e2e_m1

Input Files (MUST read first):
- C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\.agents\teamwork\ORIGINAL_REQUEST.md
- C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\PROJECT.md
- C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\TEST_INFRA.md
- C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\.agents\teamwork\sub_orch_e2e_m1\SCOPE.md
- C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\.agents\teamwork\sub_orch_e2e_m1\DISPATCH.md
- Explorer 1 Analysis: C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\.agents\teamwork\explorer_e2e_m1_1\analysis.md
- Explorer 2 Analysis: C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\.agents\teamwork\explorer_e2e_m1_2\analysis.md
- Explorer 3 Analysis: C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\.agents\teamwork\explorer_e2e_m1_3\analysis.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your Task:
Implement the complete, production-grade, zero-external-npm-dependency test infrastructure for the project:
1. `tests/helpers/assert.js`:
   - Full assertion suite using Node standard library (`node:assert`, `node:util`).
   - Custom `AssertionError` subclassing `assert.AssertionError` with `Error.captureStackTrace` to strip internal frames.
   - Rich diff formatting: type discrepancies, character divergence indexes with code points (critical for Cyrillic vs Latin), numeric boundary deltas, object diffs.
   - Methods: `assert`, `assertEquals`, `assertNotEquals`, `assertDeepEquals`, `assertThrows` (polymorphic: sync and async Promises), `assertDoesNotThrow` (polymorphic), `assertContains` (string, array, set, map, object), `assertBetween`, `assertTrue`, `assertFalse`, `assertNull`, `assertNotNull`, `assertMatches`, `assertCloseTo`, `assertUndefined`, `assertDefined`, `fail`.
   - Export for CommonJS and browser fallback if needed.

2. `tests/helpers/dom_env.js`:
   - Zero-dependency headless DOM and browser environment stub for Node.js.
   - Complete DOM node hierarchy: `Document`, `Element`, `TextNode`, `DOMTokenList` (`classList`), `dataset`, `style`, `innerHTML`, `outerHTML`.
   - Selectors: `getElementById`, `querySelector`, `querySelectorAll`, `closest` (IDs, classes, tag names, attributes, child/descendant combinators).
   - Event propagation: `addEventListener`, `removeEventListener`, `dispatchEvent`, event bubbling, `Event`, `CustomEvent`, `MouseEvent` (button, clientX, clientY, preventDefault, stopPropagation), `DragEvent` (dataTransfer), `KeyboardEvent` (key, code).
   - Browser globals: `window`, `document`, `localStorage` (with getItem, setItem, removeItem, clear, and direct property access), `sessionStorage`, `navigator.onLine` (mutable boolean with online/offline event dispatch), Web Audio `AudioContext` stub (logging oscillator and gain calls), `Blob`, `URL.createObjectURL`, `URL.revokeObjectURL`, `requestAnimationFrame`, `setTimeout`/`clearTimeout`.
   - Telemetry/Sync support (Requirement F20): Lightweight `fetch` mock/interceptor (recording call url, method, body, returning mock Response), and `localStorage['sync_queue']` support.
   - Lifecycle management: `setupBrowserEnv(options)` (reading `index.html` or custom HTML, attaching globals), `teardownBrowserEnv()` (restoring globals, clearing timers), `loadAppStack(options)` (loading and executing `data/students.js`, `data/content.js`, `app.js`, `modules/typing.js`, `modules/teacher.js`).
   - Simulation helpers: `dispatchClick`, `dispatchDblClick`, `dispatchContextMenu`, `dispatchKey`, `dispatchDragDrop`, `setOnline`.

3. `tests/runner.js`:
   - Master test runner executable directly via `node tests/runner.js`.
   - CLI flags: `--tier <1|2|3|4|5|all|infra>`, `--filter <pattern>`, `--verbose`, `--bail`, `--timeout <ms>`, `--help`, and positional test file paths.
   - Dynamic discovery of test suites across `tests/tier1_features/`, `tests/tier2_boundaries/`, `tests/tier3_pairwise/`, `tests/tier4_scenarios/`, `tests/tier5_adversarial/`, and standalone tests (e.g. `tests/test_infra.test.js`). Gracefully handles empty or missing tier folders.
   - BDD harness API exposed to tests: `describe`, `test`/`it`, `beforeAll`, `afterAll`, `beforeEach`, `afterEach`, `.skip`, `.only`.
   - Full async/await support with per-test timeouts. Guaranteed cleanup via `finally` blocks for hooks.
   - Beautiful ANSI color output, real-time streaming symbols (✔ / ✖ / -), duration per test and suite, consolidated error details with filtered stack traces, and ASCII tier summary table.
   - Strict exit code semantics: exit code 0 if all tests pass; exit code 1 if any test fails or syntax/runtime error occurs.

4. `tests/test_infra.test.js`:
   - Comprehensive smoke test suite exercising all assertion methods, diff formatting, DOM environment setup, selector queries, classList manipulation, click/dblclick/drag/keyboard events, localStorage persistence, navigator.onLine toggles, Web Audio calls, and fetch stubbing.
   - All tests in `test_infra.test.js` MUST pass.

Verification Commands Worker MUST Run:
- `node tests/runner.js --help` (verify help output and exit code 0)
- `node tests/runner.js tests/test_infra.test.js` (verify all tests pass and exit code 0)
- `node tests/runner.js --tier infra` or `node tests/runner.js --tier all` (verify discovery and exit code 0)
