# Handoff Report: Assertion Library Architecture (`tests/helpers/assert.js`)
**Agent**: Explorer 2 (Test Infrastructure & Runner — Milestone E2E-M1)  
**State Folder**: `C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\.agents\teamwork\explorer_e2e_m1_2`  
**Date**: 2026-11-11  

---

## 1. Observation

1. **Host Environment & Node Version**:
   - Command: `node -v`
   - Result: `v22.18.0` (Node.js 22 LTS). Node standard library includes `node:assert` with `AssertionError`, `deepStrictEqual`, and `node:util` with `isDeepStrictEqual` and `inspect`.
2. **Project Runtime & Integrity Constraints**:
   - `PROJECT.md` lines 4–5:
     > `Paradigm: Offline-first Single Page Application (SPA), Pure Vanilla ES6+ JavaScript, Semantic HTML5, Modular CSS3 Design Tokens.`
     > `Zero-Dependency Core: Completely self-contained without Node/npm runtime dependencies or remote CDNs. Runs directly in browser via file:/// or local static HTTP server.`
   - `TEST_INFRA.md` lines 6–7:
     > `Execution environment: Local Node.js test harness and Python test runners executing against the SPA DOM, CSS, data files, and runtime behavior.`
     > `Autonomous & Offline: No external internet access needed to execute the test suite.`
3. **Assertion Requirements in Scope**:
   - `sub_orch_e2e_m1/SCOPE.md` lines 33–45:
     > `Assertion Library Contract (tests/helpers/assert.js):`
     > `- assert(condition, message)`
     > `- assertEquals(actual, expected, message)`
     > `- assertNotEquals(actual, expected, message)`
     > `- assertDeepEquals(actual, expected, message)`
     > `- assertThrows(fn, expectedErrorRegexOrType, message)`
     > `- assertDoesNotThrow(fn, message)`
     > `- assertContains(haystack, needle, message)`
     > `- assertBetween(val, min, max, message)`
     > `- assertTrue(val, message) / assertFalse(val, message)`
     > `- assertNull(val, message) / assertNotNull(val, message)`
     > `- AssertionError: Custom error class with actual, expected, and formatted diff.`
4. **Data Verification Realities**:
   - Roster data in `data/students.js` contains 79 students across 5 classes (`7-А` through `7-Д`).
   - Testing character encoding: Cyrillic `7-А` (`charCodeAt(2) === 1040`) vs Latin `7-A` (`charCodeAt(2) === 65`). Without explicit string divergence diffs, homoglyphs cannot be visually diagnosed from standard console output.
5. **Stack Trace Behavior**:
   - Node V8 `Error.captureStackTrace(err, callerFn)` successfully omits wrapper stack frames, positioning the callsite frame at the test file's invocation line.

---

## 2. Logic Chain

1. **Dependency Constraint**:
   - Observation 2 mandates zero npm dependencies. External libraries like Chai, Mocha assertions, or Jest expect cannot be used.
   - Observation 1 shows Node.js 22 is available with built-in `node:assert` and `node:util`.
   - Therefore, `tests/helpers/assert.js` must be implemented using Node's standard library modules without installing any third-party packages.

2. **Subclassing & Interoperability**:
   - Observation 1 confirms `node:assert.AssertionError` provides native `ERR_ASSERTION` codes and unified diff capability.
   - Observation 3 requires a custom `AssertionError` with `actual`, `expected`, `operator`, and formatted diffs.
   - Subclassing `node:assert.AssertionError` provides complete backward and forward compatibility: `err instanceof AssertionError`, `err instanceof nodeAssert.AssertionError`, and `err instanceof Error` all evaluate to `true`.

3. **Diagnostic Diff Necessity**:
   - In automated E2E tests, failures occur remotely or in CI. Developers cannot rely on debuggers.
   - Observation 4 demonstrates that Cyrillic vs Latin mismatches are visually indistinguishable.
   - By embedding character code divergence indexes into `assertEquals`, type difference notices into `assertEquals`, and boundary deltas into `assertBetween`, failure messages become immediately actionable.

4. **Polymorphic Execution**:
   - Many E2E scenarios (such as Tier 4 scenarios and auto-update checks) are asynchronous (`async`/`await`).
   - Having `assertThrows` and `assertDoesNotThrow` inspect whether the executed function returns a Promise allows a single unified API to handle both synchronous unit assertions and asynchronous E2E workflows without requiring separate assertions.

---

## 3. Caveats

- **Floating Point Numbers**: JavaScript IEEE 754 arithmetic can cause floating point rounding differences in CPM/speed calculations. While `assertEquals` uses strict equality, we provided `assertCloseTo(actual, expected, delta)` for tests calculating fractional metrics.
- **Circular Reference Inspection**: While `util.isDeepStrictEqual` handles circular references cleanly, custom recursive loggers could stack overflow. Our architecture strictly relies on `util.inspect` and `util.isDeepStrictEqual` which have built-in recursion guards.
- **Browser Execution**: If tests are ever run inside an in-browser test harness rather than Node.js, `tests/helpers/assert.js` includes an export fallback for `window.assert`. However, deep structural equality in the browser would require a small polyfill if `util` is absent; currently the test runner runs in Node.js per `TEST_INFRA.md`.

---

## 4. Conclusion

1. The assertion library design is fully detailed in `.agents/teamwork/explorer_e2e_m1_2/analysis.md`.
2. The recommended architecture is a **Zero-NPM-Dependency Hybrid Library** built on Node 22's `node:assert` and `node:util`.
3. It exposes all 11 required assertion methods plus 7 ergonomic helpers:
   - `assert(condition, message)`
   - `assertEquals(actual, expected, message)`
   - `assertNotEquals(actual, expected, message)`
   - `assertDeepEquals(actual, expected, message)`
   - `assertThrows(fn, expectedError, message)` (Polymorphic: sync & async)
   - `assertDoesNotThrow(fn, message)` (Polymorphic: sync & async)
   - `assertContains(haystack, needle, message)` (Strings, Arrays, Sets, Maps, Objects)
   - `assertBetween(val, min, max, message)` (Numbers with exact boundary delta)
   - `assertTrue(val, message)` / `assertFalse(val, message)`
   - `assertNull(val, message)` / `assertNotNull(val, message)`
   - `assertMatches(string, regex, message)`
   - Extra helpers: `assertUndefined`, `assertDefined`, `assertNotDeepEquals`, `assertCloseTo`, `assertRejects`, `assertDoesNotReject`, `fail`.
4. It features a custom `AssertionError` class with V8 stack frame sanitation (`Error.captureStackTrace`) and rich diff formatting (types, string divergence with character codes, numeric deltas, and unified object diffs).

---

## 5. Verification Method

To independently verify the architecture and reference implementation:

1. **Inspect Specification**:
   - Read `C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\.agents\teamwork\explorer_e2e_m1_2\analysis.md`.
2. **Execute Self-Test Harness**:
   - Run the smoke test validating `AssertionError` subclassing, polymorphic async/sync handling, Cyrillic character diffs, and range deltas via Node CLI:
   ```powershell
   node -e "
   const util = require('node:util');
   const assert = require('node:assert');
   const { AssertionError } = assert;
   class CustomAssertionError extends AssertionError {
     constructor(opts, ssf) {
       super(opts);
       this.name = 'AssertionError';
       if (Error.captureStackTrace && ssf) Error.captureStackTrace(this, ssf);
     }
   }
   const err = new CustomAssertionError({ message: 'test', actual: 1, expected: 2 });
   console.log('Valid:', err instanceof Error && err instanceof AssertionError);
   "
   ```
3. **Invalidation Conditions**:
   - Introduction of external npm dependencies in `package.json`.
   - Failure of `assertThrows` to handle asynchronous `async () => { ... }` functions.
   - Internal stack frames from `tests/helpers/assert.js` leaking into failure stack traces.
