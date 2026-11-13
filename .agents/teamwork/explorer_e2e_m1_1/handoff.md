# Handoff Report: Master Test Runner Architecture (`tests/runner.js`)

**Agent**: Explorer 1 (`explorer_e2e_m1_1`)  
**Milestone**: E2E-M1 (Test Infrastructure & Runner)  
**Task**: Master Test Runner Investigation and Design  
**Date**: 2026-11-11  

---

## 1. Observation

1. **Codebase Structure & Runtime**:
   - `node -v` output: `v22.18.0`.
   - `python --version` output: `Python 3.13.12`.
   - `Test-Path "package.json"` output: `False`.
   - The application is a client-side SPA with zero external dependencies (`PROJECT.md:4-5`). Scripts are loaded as standard browser tags (`index.html:211-215`):
     ```html
     <script src="data/students.js"></script>
     <script src="data/content.js"></script>
     <script src="app.js"></script>
     <script src="modules/typing.js"></script>
     <script src="modules/teacher.js"></script>
     ```
   - Core modules expose globals in browser window: `window.STUDENTS_DATA` (`data/students.js:2`), `window.CONTENT_DATA` (`data/content.js:2`), `const App` (`app.js:8-722`), `window.TypingTrainer` (`modules/typing.js:430`), `window.TeacherPanel` (`modules/teacher.js:8`).

2. **Test Infrastructure Specification**:
   - `TEST_INFRA.md:32-40` specifies:
     - Master runner at `tests/runner.js`.
     - Feature isolation test cases in `tests/tier1_features/` (>=95 tests).
     - Boundary value and edge cases in `tests/tier2_boundaries/` (>=95 tests).
     - Cross-feature interaction tests in `tests/tier3_pairwise/` (>=20 tests).
     - Application scenarios in `tests/tier4_scenarios/` (>=10 tests).
     - Adversarial coverage and stress tests in `tests/tier5_adversarial/`.
     - All suites return exit code `0` on success and non-zero on any failure.
   - `SCOPE.md:25-31` specifies the CLI contract:
     - `--tier <1|2|3|4|5|all>` (default: all)
     - `--filter <regex>` (optional test name or file filter)
     - `--verbose` (prints individual test assertions)
     - Color-coded console summary table (Passed, Failed, Total, Duration)
     - Exit code `0` on all tests passing, exit code `1` on failure or error.

3. **Peer Explorer Responsibilities**:
   - Explorer 2 (`explorer_e2e_m1_2`): Designing `tests/helpers/assert.js` with `AssertionError`, diffs, and zero-npm assertions.
   - Explorer 3 (`explorer_e2e_m1_3`): Designing `tests/helpers/dom_env.js` with headless DOM, `localStorage`, `navigator`, and Web Audio stubs.

4. **Directory State**:
   - `tests/` directory does not currently exist in the project root (`Get-ChildItem` on `C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer` did not list `tests`).
   - All runner scaffolding must create and discover test suites dynamically and safely without assuming every tier directory exists on day 1.

---

## 2. Logic Chain

1. **Zero-Dependency Mandate $\rightarrow$ Native Node.js CLI & Runner Implementation**:
   - Based on Observation 1 (`package.json` does not exist, zero npm dependencies permitted) and Observation 2 (must run standalone via `node tests/runner.js`), third-party frameworks like Jest, Mocha, or Yargs cannot be used.
   - Therefore, `tests/runner.js` must implement its own argument parser (`parseArgs`), filesystem scanner using `node:fs` and `node:path`, BDD lifecycle engine (`describe`, `test`/`it`, hooks), and ANSI color formatting without any external packages.

2. **Dynamic Tier Discovery $\rightarrow$ Safe Recursive Scanner with Path Mapping**:
   - Based on Observation 2 (Tiers 1-5 across distinct directories) and Observation 4 (`tests/` is being constructed incrementally), the runner cannot use hardcoded static file lists.
   - The runner must recursively traverse `tests/`, match `*.test.js` and `*.spec.js`, map directory names (`tier1_features` $\rightarrow$ Tier 1, etc.) to tiers, sort files alphabetically for deterministic execution, and gracefully handle empty or absent tier directories without crashing.

3. **Lifecycle Management $\rightarrow$ Two-Phase Model with Guaranteed Cleanup**:
   - Browser SPA testing mutates shared globals (`window`, `document`, `localStorage`).
   - If tests fail, uncleaned state can cause cascading false failures across subsequent tests.
   - Therefore, the harness must use a two-phase architecture: Phase 1 registers suites/tests and hooks; Phase 2 executes them sequentially. Crucially, `afterEach` and `afterAll` hooks must be wrapped in `finally` blocks so cleanup (`teardownDom()`, resetting mocks) is 100% guaranteed even if an assertion throws.

4. **Developer Experience & CI/CD $\rightarrow$ Dual Output Format & Strict Exit Codes**:
   - During execution, the runner streams test progress lines (`✔` / `✖` / `-`).
   - After execution, it displays a consolidated failure section with filtered stack traces and an ASCII breakdown table by tier.
   - Based on Observation 2 (`SCOPE.md:31`), the runner must call `process.exit(0)` if `failedCount === 0` and `process.exit(1)` if `failedCount > 0` or any unhandled rejection/syntax error occurs, allowing seamless pipeline verification.

---

## 3. Caveats

1. **Concurrent Test Execution**: The design adopts sequential test suite execution rather than multi-worker parallel execution. This is intentional: since all tests share the Node process globals and headless DOM stubs (`dom_env.js`), running tests sequentially ensures strict isolation and avoids race conditions without complex multi-process IPC.
2. **ES Module Imports**: The design assumes CommonJS (`require`) for test files, aligning with the project's absence of `"type": "module"` in `package.json`. If ES module test files (`import/export`) are needed in the future, dynamic `import()` can be added to the test loader.
3. **No Existing Tests Yet**: Since Milestone E2E-M1 is the initial test infrastructure milestone, no tier tests exist yet. The first test to be executed will be `tests/test_infra.test.js` to validate the infrastructure itself.

---

## 4. Conclusion

The Master Test Runner (`tests/runner.js`) architecture is fully designed and documented in `analysis.md`. It fulfills 100% of the requirements from `SCOPE.md` and `TEST_INFRA.md`:
- Pure Node.js zero-dependency implementation.
- Automatic discovery across `tests/tier1_features/`, `tests/tier2_boundaries/`, `tests/tier3_pairwise/`, `tests/tier4_scenarios/`, `tests/tier5_adversarial/`, and standalone tests (`tests/test_infra.test.js`).
- Complete CLI flag handling: `--tier <1|2|3|4|5|all|infra>`, `--filter <regex>`, `--verbose`, `--bail`, `--timeout <ms>`, `--help`, and positional file paths.
- BDD harness API (`describe`, `test`/`it`, `beforeAll`, `afterAll`, `beforeEach`, `afterEach`, `.skip`, `.only`, async/await, timeout).
- ANSI color formatting, per-test execution timings, consolidated failure details with filtered stack traces, and ASCII tier summary table.
- Strict exit code semantics (`0` for pass, `1` for any failure).

---

## 5. Verification Method

Once implemented by the worker agent in subsequent steps, the Master Test Runner can be independently verified via the following steps:

1. **Syntax and Help Verification**:
   ```powershell
   cd C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer
   node tests/runner.js --help
   ```
   *Expected*: Displays usage instructions, flag descriptions, examples, and exits with code `0`.

2. **Argument Validation**:
   ```powershell
   node tests/runner.js --tier invalid_tier
   ```
   *Expected*: Prints `Error: Invalid tier "invalid_tier"` and exits with code `1` (`$LASTEXITCODE -eq 1`).

3. **Smoke Suite Execution**:
   ```powershell
   node tests/runner.js tests/test_infra.test.js
   ```
   *Expected*: Discovers and executes `test_infra.test.js`, displays green checkmarks, prints summary table, and exits with code `0`.

4. **Tier Filtering Check**:
   ```powershell
   node tests/runner.js --tier 1
   node tests/runner.js --tier all
   ```
   *Expected*: Correctly maps tiers without throwing errors or unhandled rejections.

5. **Failure & Exit Code Semantics Check**:
   - Run a test file with a deliberate assertion failure.
   *Expected*: Displays red `✖`, prints failure details in the summary section, and exits with code `1` (`$LASTEXITCODE -eq 1`).
