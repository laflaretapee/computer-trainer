# Adversarial Challenge Report: Test Runner & CLI Architecture (`tests/runner.js`)

**Author**: Challenger 1 (`challenger_e2e_m1_1`)  
**Target Milestone**: E2E-M1 (Test Infrastructure & Runner)  
**Evaluated Artifact**: `tests/runner.js`  
**Date**: 2026-11-11  

---

## Challenge Summary

**Overall Risk Assessment**: **HIGH** (Watchdog timeout bypass causing false-positive exit code 0; Reporter crash on primitive error throws)

Our empirical stress test suite executed **31 adversarial scenarios** covering CLI flag resilience, bail abortion semantics, timeout enforcement, hook failure cleanup, asynchronous error containment, and multi-process concurrency.

While CLI flag handling, `--bail` logic across nested and multi-file suites, and multi-process concurrency proved remarkably solid (26/31 passed), we identified **two critical failure modes** in `tests/runner.js` that invalidate timeout enforcement and crash failure formatting:
1. **Critical Flaw**: Calling `timerId.unref()` on the watchdog timer inside `runWithTimeout()` allows Node's libuv event loop to drain when a test hangs on an unresolved Promise. Node terminates prematurely with **Exit Code 0**, silently masking hanging tests and bypassing all remaining tests and reporters.
2. **Medium Flaw**: Non-object exceptions (`throw null`, `throw "string"`) trigger an unhandled `TypeError: Cannot read properties of null (reading 'name')` inside `printFailures()`, crashing the runner before the summary table can be rendered.

---

## Challenges

### [Critical] Challenge 1: Watchdog Timer `unref()` Causes Premature Node Exit on Hanging Tests with Code 0

- **Assumption Challenged**: The assumption that `runWithTimeout(fn, timeoutMs)` guarantees that hanging asynchronous tests will time out, fail, and yield exit code 1.
- **Attack Scenario**: An asynchronous test returns a pending Promise with no active I/O handles (e.g. `return new Promise(() => {})`, waiting for an event that never fires, or waiting for an offline mock that stalls). In `tests/runner.js` line 327:
  ```javascript
  const timeoutPromise = new Promise((_, reject) => {
    timerId = setTimeout(() => {
      reject(new Error(`Test timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    if (timerId.unref) timerId.unref(); // <--- Root Cause
  });
  ```
  Calling `timerId.unref()` explicitly instructs Node.js not to keep the event loop alive for this watchdog timer. Because the hanging Promise has no active handles, libuv detects an empty event loop and terminates the process immediately.
- **Blast Radius**:
  - The hanging test NEVER times out.
  - The test is NOT marked as failed.
  - The failure summary is NOT displayed.
  - The remaining tests in the suite are NEVER EXECUTED.
  - The runner exits with **Exit Code 0** (Success).
  - In CI/CD pipelines, deadlocked tests appear to pass cleanly in <100ms.
- **Empirical Evidence**:
  - Running `node tests/runner.js --timeout 300 fixtures/timeout_async.fixture.js`:
    - Expected: Runner waits 300ms, prints failure `Test timed out after 300ms`, exits with code 1.
    - Actual: Runner terminates in **62ms**, prints nothing after suite header, exits with **code 0**.
  - Running hanging Promise in `beforeEach` hook:
    - Expected: Runner waits 250ms, aborts test body, runs `afterEach` cleanup, exits with code 1.
    - Actual: Runner terminates in **75ms**, `afterEach` is bypassed, exits with **code 0**.
- **Mitigation**:
  Remove `if (timerId.unref) timerId.unref();` from `tests/runner.js:327`. Because `clearTimeout(timerId)` is already present in the `finally` block (`tests/runner.js:335`), keeping the watchdog timer referenced ensures the event loop stays alive until either `fn()` resolves or `timeoutMs` elapses.

---

### [Medium] Challenge 2: `printFailures()` Crashes Uncaught When Tests Throw Non-Object Values (`null` / Primitives)

- **Assumption Challenged**: The assumption that `f.error` in `printFailures` is always an object with `.name` and `.message` properties.
- **Attack Scenario**: A test or asynchronous promise rejection throws `null`, `undefined`, or a primitive string (`throw null;` or `throw "unexpected failure";`). In `tests/runner.js` lines 453-454:
  ```javascript
  failures.forEach((f, idx) => {
    console.log(`\n${c.bold}${idx + 1}) ${f.fullName}${c.reset}`);
    const err = f.error;
    console.log(`   ${c.red}${err.name || 'Error'}: ${err.message}${c.reset}`);
  ```
  When `err === null`, accessing `err.name` throws `TypeError: Cannot read properties of null (reading 'name')`.
  When `err` is a string (e.g. `'something broke'`), `err.name` is undefined, `err.message` is undefined, and the output prints `Error: undefined`, discarding the actual error message.
- **Blast Radius**:
  - Unhandled fatal crash inside the reporter.
  - ASCII summary table is never printed.
  - Stack trace formatting breaks.
- **Empirical Evidence**:
  - Running `node tests/runner.js fixtures/throw_null.fixture.js`:
    ```text
    FATAL ERROR: TypeError: Cannot read properties of null (reading 'name')
        at tests/runner.js:454:35
    ```
  - Running `node tests/runner.js fixtures/throw_string.fixture.js`:
    ```text
    FAILURES SUMMARY (1 failure):
    1) String Throw Suite > throws raw string
       Error: undefined
    ```
- **Mitigation**:
  Normalize `err` defensively before formatting:
  ```javascript
  const errObj = (err instanceof Error)
    ? err
    : (err !== null && typeof err === 'object')
      ? { name: err.name || 'Error', message: err.message || String(err), stack: err.stack, diff: err.diff }
      : { name: 'Error', message: String(err), stack: '', diff: null };
  ```

---

## Stress Test Results (31 Scenarios)

| # | Category | Scenario | Expected Behavior | Actual Behavior | Result |
|---|----------|----------|-------------------|-----------------|:------:|
| 1 | CLI Flags | `--tier 99` | Exit 1, "Invalid tier" error | Exit 1, error printed | **PASS** |
| 2 | CLI Flags | `--tier invalidTier` | Exit 1, "Invalid tier" error | Exit 1, error printed | **PASS** |
| 3 | CLI Flags | Dangling `--tier` at end of argv | Exit 1 | Exit 1 | **PASS** |
| 4 | CLI Flags | Non-existent file target | Exit 1, "Test file not found" | Exit 1, error printed | **PASS** |
| 5 | CLI Flags | `--tier infra` | Discovers smoke suite, exits 0 | Discovered, exits 0 (141ms) | **PASS** |
| 6 | CLI Flags | `--tier all` | Discovers all suites, exits 0 | Discovered, exits 0 | **PASS** |
| 7 | CLI Flags | Empty tier `--tier 1` | Exit 1, "No test files found" | Exit 1, error printed | **PASS** |
| 8 | CLI Flags | Malformed regex `--filter "[a-"` | Exit 1, "Invalid regular expression" | Exit 1, error printed | **PASS** |
| 9 | CLI Flags | Filter matching 0 tests `-f zzz` | Clean execution, exits 0 | 0 tests run, exits 0 | **PASS** |
| 10 | CLI Flags | Filter matching 1 test `-f homoglyph` | Executes matched test, exits 0 | 1 test run, exits 0 | **PASS** |
| 11 | CLI Flags | Help screens `--help` and `-h` | Prints usage menu, exits 0 | Prints usage, exits 0 | **PASS** |
| 12 | CLI Flags | Verbose flag `-v` | Prints detailed output, exits 0 | Passes cleanly, exits 0 | **PASS** |
| 13 | Bail | Without `--bail` (3 tests: pass, fail, pass) | All 3 tests executed, exit 1 | All 3 executed, exit 1 | **PASS** |
| 14 | Bail | With `--bail` | Test 3 aborted, exit 1 | Test 3 never runs, exit 1 | **PASS** |
| 15 | Bail | With short `-b` flag | Test 3 aborted, exit 1 | Test 3 never runs, exit 1 | **PASS** |
| 16 | Bail | Nested suites with `--bail` | Sibling and child suites aborted | Aborted immediately, exit 1 | **PASS** |
| 17 | Bail | Multi-file with `--bail` | Subsequent file aborted | File 2 never loaded, exit 1 | **PASS** |
| 18 | Timeout | Hanging async test with `--timeout 300` | Aborts at 300ms, exit 1 | Exits in **72ms**, exit **0** | **FAIL** |
| 19 | Timeout | Hanging async test with `--timeout=250` | Aborts at 250ms, exit 1 | Exits in **94ms**, exit **0** | **FAIL** |
| 20 | Timeout | Fast async test with `--timeout 1000` | Passes cleanly in ~50ms, exit 0 | Passes in 152ms, exit 0 | **PASS** |
| 21 | Hook Cleanup | Throw in `beforeEach` hook | Test body skipped, `afterEach` runs, exit 1 | Body skipped, cleanup ran, exit 1 | **PASS** |
| 22 | Hook Cleanup | Hanging Promise in `beforeEach` | Times out, `afterEach` runs, exit 1 | Exits in **94ms**, cleanup skipped, exit **0** | **FAIL** |
| 23 | Hook Cleanup | Error thrown in `afterEach` hook | Caught and logged, runner doesn't crash | Caught and logged, exit 0 | **PASS** |
| 24 | Error Handling| Syntax error in test file | Caught as load error, exits 1 | Load error reported, exit 1 | **PASS** |
| 25 | Error Handling| Detached unhandled Promise rejection | Node unhandledRejection exits 1 | Exited with code 1 | **PASS** |
| 26 | Error Handling| Test throwing `null` | Formatted cleanly, exits 1 | Crash in `printFailures` (`TypeError`) | **FAIL** |
| 27 | Error Handling| Test throwing raw string | String message preserved in report | Displays `Error: undefined` | **FAIL** |
| 28 | Error Handling| Completely empty test file | Runs cleanly with 0 tests, exit 0 | Handled cleanly, exit 0 | **PASS** |
| 29 | Concurrency | 10 parallel runner instances on passing suite | All 10 processes exit 0 | All 10 exited 0 (avg 362ms) | **PASS** |
| 30 | Concurrency | 10 parallel runner instances on failing suite | All 10 processes exit 1 | All 10 exited 1 | **PASS** |
| 31 | Determinism | 5 sequential runs on passing suite | 100% deterministic exit 0 | 5/5 exited 0 | **PASS** |

---

## Unchallenged Areas

- **Browser GUI Interactions & Canvas**: DOM manipulation and events were tested via `tests/test_infra.test.js` against `tests/helpers/dom_env.js`. Real WebGL or hardware-accelerated canvas rendering is out of scope for headless Node.js runner.
- **Tiers 1–5 Test Cases**: The test cases themselves are scheduled for authoring in subsequent milestones; this review strictly stress-tested the runner and execution engine infrastructure.
