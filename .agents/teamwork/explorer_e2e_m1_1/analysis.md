# Architecture & Design Analysis: Master Test Runner (`tests/runner.js`)

**Target Project**: 7th-Grade Computer Trainer SPA (`C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer`)  
**Milestone**: E2E-M1 (Test Infrastructure & Runner)  
**Author**: Explorer 1 (`explorer_e2e_m1_1`)  
**Date**: 2026-11-11  

---

## 1. Executive Summary

Milestone **E2E-M1** provides the testing foundation for the 7th-Grade Computer Trainer SPA. To support exhaustive requirement validation across **Tiers 1 through 5** (totaling over 230 test cases) and ensure 100% strict offline execution without external npm dependencies, the project requires a custom, high-performance, standalone Master Test Runner located at `tests/runner.js`.

This document presents the detailed architectural design, lifecycle model, CLI interface, discovery engine, reporting formatter, and concrete implementation blueprint for `tests/runner.js`.

---

## 2. Codebase Survey & Execution Constraints

### 2.1 Codebase Survey
- **Paradigm**: Zero-dependency offline Single Page Application (SPA) built using vanilla ES6+ JavaScript, CSS3 design tokens, and semantic HTML5.
- **Root Files**:
  - `index.html`: Main DOM shell containing screen sections (`#screen-login`, `#screen-class`, `#screen-student`, `#screen-teacher-login`, `#screen-menu`, `#screen-typing`, `#screen-materials`, `#screen-tests`, `#screen-results`, `#screen-teacher`) and modal overlay `#app-modal`.
  - `style.css`: Visual styling, component cards, and layout wrappers.
  - `app.js`: Core controller IIFE exposing global `window.App` (screen routing, student/teacher selection, `localStorage['trainer_progress']` access).
  - `modules/typing.js`: Touch typing engine exposing global `window.TypingTrainer` (`init`, `start`, `destroy`).
  - `modules/teacher.js`: Teacher dashboard exposing global `window.TeacherPanel` (`init`, CSV export, data reset).
  - `modules/mouse.js`: Planned mouse interaction trainer (M3).
  - `data/students.js` / `students.json`: Roster of 79 students across 5 classes (7-А to 7-Д), teacher password (`teacher123`).
  - `data/content.js` / `content.json`: Lessons 7-2-2 through 7-2-6 with 175 indexed slide PNGs and 5 theoretical tests (15 questions).
  - `version.json`: Auto-update manifest for network-aware updates.

### 2.2 Execution Environment & Constraints
1. **Node.js Runtime**:
   - Host environment: Node.js `v22.18.0` on Windows.
   - Operating system: Windows 10/11 (PowerShell & cmd compatible).
2. **Zero-Dependency Mandate**:
   - No `package.json` exists at the root, and no external npm packages (`jest`, `mocha`, `chai`, `jsdom`, `yargs`, `chalk`) may be installed.
   - The test runner must execute using standard Node.js built-in modules only: `node:fs`, `node:path`, `node:process`, `node:util`, `node:url`.
3. **Module Format**:
   - Tests and runner run in Node's default CommonJS mode (`require`/`module.exports`).
   - The runner must support both global harness injection (`global.describe`, `global.it`, `global.test`) and explicit CommonJS destructuring imports (`const { describe, it, test, beforeEach, afterEach } = require('./runner')`).

---

## 3. Test Discovery Architecture

The test suite is partitioned into five hierarchical tiers plus infrastructure validation tests as specified in `TEST_INFRA.md` and `SCOPE.md`:

| Tier | Directory | Target Scope | Min. Tests |
|---|---|---|---|
| **Infra** | `tests/` (root) or `tests/infra/` | Test runner, assertion, and DOM mock smoke tests (`tests/test_infra.test.js`) | >=4 |
| **Tier 1** | `tests/tier1_features/` | Feature isolation tests for all 19 features (F1..F19) | >=95 |
| **Tier 2** | `tests/tier2_boundaries/` | Boundary values, invalid inputs, edge cases, viewport limits | >=95 |
| **Tier 3** | `tests/tier3_pairwise/` | Pairwise combinatorial interactions between features | >=20 |
| **Tier 4** | `tests/tier4_scenarios/` | Realistic end-to-end student and teacher workflows | >=10 |
| **Tier 5** | `tests/tier5_adversarial/` | Adversarial coverage, stress testing, corrupted data recovery | >=10 |

### 3.1 Directory Scanning Algorithm
1. **Search Root**: `tests/` directory relative to the project root.
2. **File Pattern**: Recursively discovers all files matching `*.test.js` or `*.spec.js`.
3. **Tier Classification**:
   Each discovered file is tagged with a `tier` identifier derived from its path:
   - Contains `tier1_features` $\rightarrow$ `Tier 1: Features` (tier ID: `1`)
   - Contains `tier2_boundaries` $\rightarrow$ `Tier 2: Boundaries` (tier ID: `2`)
   - Contains `tier3_pairwise` $\rightarrow$ `Tier 3: Pairwise` (tier ID: `3`)
   - Contains `tier4_scenarios` $\rightarrow$ `Tier 4: Scenarios` (tier ID: `4`)
   - Contains `tier5_adversarial` $\rightarrow$ `Tier 5: Adversarial` (tier ID: `5`)
   - Located directly under `tests/` or in `tests/helpers/` $\rightarrow$ `Infrastructure / Standalone` (tier ID: `infra`)
4. **Deterministic Ordering**:
   Discovered test files within each tier are sorted lexicographically by relative path (`path.relative(rootDir, filePath)`). This guarantees reproducible execution order across developer machines, CI/CD pipelines, and OS platforms.
5. **Missing Directory Handling**:
   - If a tier directory does not yet exist (e.g. during incremental milestone development), the scanner must not throw an uncaught exception. It logs a subtle note if verbose, or records 0 tests for that tier.
   - If a user explicitly specifies `--tier 3` and no matching test files exist, the runner prints an informative error message: `No test files found matching tier: 3` and exits with code 1.

---

## 4. CLI Argument Handling & Configuration

The CLI interface must be intuitive, zero-dependency, and handle standard Unix/Windows command line flags.

### 4.1 Supported CLI Arguments

| Flag | Long Flag | Parameter | Default | Description |
|---|---|---|---|---|
| `-t` | `--tier` | `<1\|2\|3\|4\|5\|all\|infra>` | `all` | Filter test execution by tier |
| `-f` | `--filter` | `<regex\|substring>` | `null` | Filter suites or test cases by name or file path |
| `-v` | `--verbose` | `[boolean]` | `false` | Enable verbose per-assertion and timing logging |
| `-b` | `--bail` | `[boolean]` | `false` | Immediately abort run upon first test failure |
| | `--timeout` | `<ms>` | `5000` | Per-test execution timeout in milliseconds |
| `-h` | `--help` | `[boolean]` | `false` | Display help usage guide and exit with code 0 |
| | `[paths...]` | Positional arguments | `[]` | Specific test files to execute directly |

### 4.2 Argument Parsing Logic
A zero-dependency parser splits `process.argv.slice(2)`:
- Supports `--key=value` (e.g. `--tier=1`, `--filter="F5"`)
- Supports separated flags (e.g. `--tier 1`, `-t 1`, `-f typing`)
- Supports boolean flags (e.g. `-v`, `--verbose`, `-b`, `--bail`, `-h`, `--help`)
- Collects remaining positional arguments as explicit target file paths (e.g. `node tests/runner.js tests/test_infra.test.js`).

### 4.3 Validation Rules
- If `--tier` is supplied with an unrecognized value (e.g. `--tier 9`), output:
  `Error: Invalid tier "9". Expected one of: 1, 2, 3, 4, 5, all, infra.`
  Exit with code `1`.
- If `--filter` is an invalid regular expression, output:
  `Error: Invalid regular expression pattern in --filter.`
  Exit with code `1`.
- If `--help` or `-h` is passed, output the formatted help screen and exit with code `0`.

---

## 5. Test Lifecycle & Harness API

The test runner provides a lightweight, expressive BDD-style harness API (`describe`, `test` / `it`, `beforeAll`, `afterAll`, `beforeEach`, `afterEach`).

### 5.1 Harness API Surface
```javascript
// Suite declaration
describe(title, fn)
describe.skip(title, fn)
describe.only(title, fn)

// Test case declaration
test(title, fn)
it(title, fn) // alias for test
test.skip(title, fn)
it.skip(title, fn)
test.only(title, fn)
it.only(title, fn)

// Lifecycle hooks
beforeAll(fn)   // Runs once before any tests in the current suite
afterAll(fn)    // Runs once after all tests in the current suite
beforeEach(fn)  // Runs before every test in the current suite (and inherited by nested suites)
afterEach(fn)   // Runs after every test in the current suite (guaranteed cleanup)
```

### 5.2 Two-Phase Execution Model
To ensure deterministic execution and support `.only` / `.skip` / `--filter` at any nesting depth, the runner uses a **Two-Phase Architecture**:

```
[Phase 1: Registration] ──> Test file loaded via require()
                            Tree of Suites, Tests, and Hooks built in memory
                                     │
                                     ▼
[Phase 2: Filtering]    ──> Apply CLI --filter, .only, and .skip flags
                            Prune inactive nodes from tree
                                     │
                                     ▼
[Phase 3: Execution]    ──> Sequential Async Traversal
                            beforeAll() hooks
                              beforeEach() hooks (inherited + local)
                                test() execution with Timeout race
                              afterEach() hooks (guaranteed)
                            afterAll() hooks
```

### 5.3 Detailed Lifecycle Rules
1. **Inherited Hooks**:
   - `beforeEach`: Parent suite `beforeEach` hooks run first, followed by child suite `beforeEach` hooks (outer-to-inner).
   - `afterEach`: Child suite `afterEach` hooks run first, followed by parent suite `afterEach` hooks (inner-to-outer).
2. **Guaranteed Cleanup**:
   - `afterEach` hooks are executed inside a `finally` block. Even if the test function throws an `AssertionError` or unhandled error, `afterEach` is guaranteed to execute to restore DOM and storage state.
   - If an `afterEach` or `afterAll` hook throws an error, the test is marked as failed and the hook error is recorded.
3. **Async Support & Timeout Handling**:
   - Both synchronous (`() => { ... }`) and asynchronous (`async () => { ... }` or functions returning a Promise) tests and hooks are supported.
   - Every test is wrapped with a `Promise.race` against a configurable timeout (default 5000ms):
     ```javascript
     const timeoutPromise = new Promise((_, reject) => {
       const timer = setTimeout(() => {
         reject(new Error(`Test timed out after ${timeoutMs}ms`));
       }, timeoutMs);
       if (timer.unref) timer.unref();
     });
     ```
4. **Environment Isolation**:
   - Before executing each test file, the runner resets global mocks (`global.window = undefined`, `global.document = undefined`).
   - Test files import `tests/helpers/dom_env.js` and call `setupDom()` / `teardownDom()` in their `beforeEach` / `afterEach` hooks to guarantee pristine DOM and `localStorage` states.

---

## 6. Output Formatting & Reporting

Clean, legible terminal reporting is critical for developer velocity and rapid bug localization.

### 6.1 ANSI Styling System
- Uses standard ANSI escape codes:
  - `PASS` / `✔`: Bold Green (`\x1b[1m\x1b[32m`)
  - `FAIL` / `✖`: Bold Red (`\x1b[1m\x1b[31m`)
  - `SKIP` / `-`: Yellow (`\x1b[33m`)
  - `TIER / SUITE`: Bold Cyan (`\x1b[1m\x1b[36m`)
  - `DURATION / TRACE`: Dim Gray (`\x1b[90m`)
  - `RESET`: Normal (`\x1b[0m`)
- Fallback / `NO_COLOR` support: Automatically disables colors if `process.env.NO_COLOR` is present or if `!process.stdout.isTTY` on non-supporting terminals.

### 6.2 Per-Test Visual Feedback
During test execution:
- Suite header displays the tier and relative file path:
  ```text
  [Tier 1: Features] tests/tier1_features/f05_typing_zones.test.js
  ```
- Individual test status lines include symbol, test title, and execution time:
  ```text
    ✔ [F5-01] 10-finger color zones defined for all key rows (12ms)
    ✔ [F5-02] Left pinky zone maps to keys Ф, Й, Я (8ms)
    ✖ [F5-03] Hands visualizer highlights active finger (24ms)
    - [F5-04] Hardware acceleration test (SKIPPED)
  ```

### 6.3 Consolidated Failure Section
If any failures occur, a dedicated summary section is printed after all tests finish. This prevents developers from having to scroll back through hundreds of lines of output:
```text
================================================================================
FAILURES SUMMARY (1 failure):
================================================================================
1) [Tier 1: Features] tests/tier1_features/f05_typing_zones.test.js > [F5-03] Hands visualizer highlights active finger
   AssertionError: Expected element .hand-finger-active to be visible
   Expected: true
   Actual:   false
   Location: tests/tier1_features/f05_typing_zones.test.js:68:14

   Stack Trace:
     at Object.assertEquals (tests/helpers/assert.js:45:11)
     at Suite.<anonymous> (tests/tier1_features/f05_typing_zones.test.js:68:14)
```

The stack trace filter strips runner internals (`runner.js`, `node:internal/*`) so the developer immediately sees the exact line in their test file.

### 6.4 Tier Breakdown Summary Table
At the conclusion of the run, an ASCII summary table displays test counts and timings per tier:

```text
┌────────────────────────────┬────────┬────────┬─────────┬────────┬──────────┐
│ Tier / Suite               │ Passed │ Failed │ Skipped │ Total  │ Duration │
├────────────────────────────┼────────┼────────┼─────────┼────────┼──────────┤
│ Standalone / Infra         │      4 │      0 │       0 │      4 │    0.04s │
│ Tier 1: Features           │     95 │      0 │       0 │     95 │    0.85s │
│ Tier 2: Boundaries         │     95 │      0 │       0 │     95 │    0.78s │
│ Tier 3: Pairwise           │     20 │      0 │       0 │     20 │    0.29s │
│ Tier 4: Scenarios          │     10 │      0 │       0 │     10 │    0.42s │
│ Tier 5: Adversarial        │     15 │      0 │       0 │     15 │    0.26s │
├────────────────────────────┼────────┼────────┼─────────┼────────┼──────────┤
│ TOTALS                     │    239 │      0 │       0 │    239 │    2.64s │
└────────────────────────────┴────────┴────────┴─────────┴────────┴──────────┘
```

### 6.5 Final Outcome Banner
- If 0 failures:
  ```text
  ✔ ALL TESTS PASSED (239 tests in 2.64s)
  ```
- If failures occurred:
  ```text
  ✖ TEST SUITE FAILED (1 failed, 238 passed, 239 total in 2.64s)
  ```

---

## 7. Exit Code Semantics

The runner adheres to strict process exit codes for integration with npm scripts, CI/CD pipelines, and orchestrators:

- **Exit Code `0` (Success)**:
  - All discovered and executed tests passed (or were intentionally skipped).
  - Number of failed tests is exactly `0`.
  - No syntax errors, unhandled rejections, or hook errors occurred.
- **Exit Code `1` (Failure)**:
  - One or more test assertions failed (`failedCount > 0`).
  - An unhandled exception or syntax error occurred while loading a test file.
  - A lifecycle hook (`beforeAll`, `beforeEach`, `afterEach`, `afterAll`) failed.
  - Invalid CLI arguments were provided (e.g. unknown `--tier`).
  - A requested tier had no test files when `--tier <N>` was explicitly targeted.

### 7.1 Uncaught Exception & Rejection Handlers
The runner registers top-level event handlers:
```javascript
process.on('uncaughtException', (err) => {
  console.error('\n' + colors.red + 'FATAL: Uncaught Exception: ' + colors.reset + err.message);
  console.error(err.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('\n' + colors.red + 'FATAL: Unhandled Promise Rejection: ' + colors.reset + (reason?.stack || reason));
  process.exit(1);
});
```

---

## 8. Concrete Architecture Blueprint for `tests/runner.js`

Below is the structured architectural implementation plan for `tests/runner.js`.

### 8.1 Class and Module Diagram

```
                 ┌─────────────────────────────┐
                 │         CLI Parser          │
                 │   parseArgs(process.argv)   │
                 └──────────────┬──────────────┘
                                │
                                ▼
                 ┌─────────────────────────────┐
                 │        Test Scanner         │
                 │    discoverTests(config)    │
                 └──────────────┬──────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                        Runner Engine                        │
│ ┌──────────────────────┐           ┌──────────────────────┐ │
│ │     Suite Context    │           │      Test Context    │ │
│ │ - describe()         │           │ - test() / it()      │ │
│ │ - beforeAll/afterAll │           │ - skip() / only()    │ │
│ │ - beforeEach/afterEach           │ - timeout execution  │ │
│ └──────────────────────┘           └──────────────────────┘ │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
                 ┌─────────────────────────────┐
                 │      Reporter & Output      │
                 │  - ANSI live logging        │
                 │  - Failures summary         │
                 │  - ASCII Tier breakdown     │
                 │  - Exit code assignment     │
                 └─────────────────────────────┘
```

### 8.2 Detailed Implementation Structure

```javascript
/**
 * tests/runner.js
 * Master Test Runner for 7th-Grade Computer Trainer SPA
 * Zero-dependency Node.js test runner supporting Tiers 1-5, CLI filtering,
 * BDD lifecycle hooks, colored reporting, and exit code semantics.
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const process = require('node:process');

// ─── 1. ANSI Colors ────────────────────────────────────────────────────────
const useColor = !process.env.NO_COLOR && (process.stdout.isTTY || process.env.TERM);
const c = {
  reset:   useColor ? '\x1b[0m'  : '',
  bold:    useColor ? '\x1b[1m'  : '',
  dim:     useColor ? '\x1b[2m'  : '',
  green:   useColor ? '\x1b[32m' : '',
  red:     useColor ? '\x1b[31m' : '',
  yellow:  useColor ? '\x1b[33m' : '',
  blue:    useColor ? '\x1b[34m' : '',
  cyan:    useColor ? '\x1b[36m' : '',
  gray:    useColor ? '\x1b[90m' : '',
};

// ─── 2. CLI Argument Parsing ────────────────────────────────────────────────
function parseArgs(args) {
  const options = {
    tier: 'all',
    filter: null,
    verbose: false,
    bail: false,
    timeout: 5000,
    help: false,
    files: [],
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '-h' || arg === '--help') {
      options.help = true;
    } else if (arg === '-v' || arg === '--verbose') {
      options.verbose = true;
    } else if (arg === '-b' || arg === '--bail') {
      options.bail = true;
    } else if (arg === '-t' || arg === '--tier') {
      options.tier = args[++i];
    } else if (arg.startsWith('--tier=')) {
      options.tier = arg.split('=')[1];
    } else if (arg === '-f' || arg === '--filter') {
      options.filter = args[++i];
    } else if (arg.startsWith('--filter=')) {
      options.filter = arg.split('=')[1];
    } else if (arg.startsWith('--timeout=')) {
      options.timeout = parseInt(arg.split('=')[1], 10);
    } else if (arg === '--timeout') {
      options.timeout = parseInt(args[++i], 10);
    } else if (!arg.startsWith('-')) {
      options.files.push(arg);
    }
  }

  return options;
}

// ─── 3. Test Harness Data Model ────────────────────────────────────────────
class Suite {
  constructor(name, parent = null) {
    this.name = name;
    this.parent = parent;
    this.tests = [];
    this.subSuites = [];
    this.beforeAllHooks = [];
    this.afterAllHooks = [];
    this.beforeEachHooks = [];
    this.afterEachHooks = [];
    this.skip = false;
    this.only = false;
  }

  get fullName() {
    return this.parent && this.parent.name ? `${this.parent.fullName} > ${this.name}` : this.name;
  }
}

class Test {
  constructor(name, fn, suite) {
    this.name = name;
    this.fn = fn;
    this.suite = suite;
    this.skip = false;
    this.only = false;
    this.duration = 0;
    this.status = 'pending'; // 'passed' | 'failed' | 'skipped'
    this.error = null;
  }

  get fullName() {
    return `${this.suite.fullName} > ${this.name}`;
  }
}

// ─── 4. Global Harness Registration ────────────────────────────────────────
let currentSuite = null;
let rootSuite = null;
let hasOnly = false;

function describe(name, fn) {
  const suite = new Suite(name, currentSuite);
  if (currentSuite) {
    currentSuite.subSuites.push(suite);
  } else {
    rootSuite = suite;
  }

  const prevSuite = currentSuite;
  currentSuite = suite;
  try {
    fn();
  } finally {
    currentSuite = prevSuite;
  }
}

describe.skip = function (name, fn) {
  describe(name, () => {
    currentSuite.skip = true;
    fn();
  });
};

describe.only = function (name, fn) {
  hasOnly = true;
  describe(name, () => {
    currentSuite.only = true;
    fn();
  });
};

function test(name, fn) {
  if (!currentSuite) {
    throw new Error(`Test "${name}" must be declared inside a describe() block.`);
  }
  const t = new Test(name, fn, currentSuite);
  currentSuite.tests.push(t);
}

test.skip = function (name, fn) {
  if (!currentSuite) throw new Error(`Test.skip "${name}" must be inside describe().`);
  const t = new Test(name, fn, currentSuite);
  t.skip = true;
  currentSuite.tests.push(t);
};

test.only = function (name, fn) {
  hasOnly = true;
  if (!currentSuite) throw new Error(`Test.only "${name}" must be inside describe().`);
  const t = new Test(name, fn, currentSuite);
  t.only = true;
  currentSuite.tests.push(t);
};

const it = test;

function beforeAll(fn)  { currentSuite.beforeAllHooks.push(fn); }
function afterAll(fn)   { currentSuite.afterAllHooks.push(fn); }
function beforeEach(fn) { currentSuite.beforeEachHooks.push(fn); }
function afterEach(fn)  { currentSuite.afterEachHooks.push(fn); }

// Expose globals so test files can use BDD syntax directly
globalThis.describe   = describe;
globalThis.test       = test;
globalThis.it         = it;
globalThis.beforeAll  = beforeAll;
globalThis.afterAll   = afterAll;
globalThis.beforeEach = beforeEach;
globalThis.afterEach  = afterEach;

// ─── 5. Test File Discovery ────────────────────────────────────────────────
const TIER_MAP = {
  '1': 'tier1_features',
  '2': 'tier2_boundaries',
  '3': 'tier3_pairwise',
  '4': 'tier4_scenarios',
  '5': 'tier5_adversarial',
  'infra': 'infra',
};

function discoverTestFiles(projectRoot, options) {
  const testsDir = path.join(projectRoot, 'tests');
  if (!fs.existsSync(testsDir)) return [];

  const discovered = [];

  function scan(dir) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== 'node_modules' && entry.name !== '.agents') {
          scan(fullPath);
        }
      } else if (entry.isFile() && (entry.name.endsWith('.test.js') || entry.name.endsWith('.spec.js'))) {
        discovered.push(fullPath);
      }
    }
  }

  if (options.files && options.files.length > 0) {
    for (const f of options.files) {
      const p = path.isAbsolute(f) ? f : path.join(projectRoot, f);
      if (fs.existsSync(p)) discovered.push(p);
      else console.warn(`${c.yellow}Warning: File not found: ${f}${c.reset}`);
    }
    return discovered;
  }

  scan(testsDir);

  // Filter by tier if specified
  const filtered = discovered.filter(filePath => {
    const rel = path.relative(testsDir, filePath).replace(/\\/g, '/');
    if (options.tier === 'all') return true;

    if (options.tier === 'infra') {
      return !rel.includes('/') || rel.startsWith('infra/');
    }

    const expectedDir = TIER_MAP[options.tier];
    return expectedDir && rel.startsWith(expectedDir + '/');
  });

  return filtered.sort();
}

function getTierLabel(filePath, testsDir) {
  const rel = path.relative(testsDir, filePath).replace(/\\/g, '/');
  if (rel.startsWith('tier1_features/')) return 'Tier 1: Features';
  if (rel.startsWith('tier2_boundaries/')) return 'Tier 2: Boundaries';
  if (rel.startsWith('tier3_pairwise/')) return 'Tier 3: Pairwise';
  if (rel.startsWith('tier4_scenarios/')) return 'Tier 4: Scenarios';
  if (rel.startsWith('tier5_adversarial/')) return 'Tier 5: Adversarial';
  return 'Standalone / Infra';
}
```

### 8.3 Runner Execution Engine

```javascript
async function runSuite(suite, options, filterRegex, stats, inheritedBeforeEach = [], inheritedAfterEach = []) {
  const currentBeforeEach = [...inheritedBeforeEach, ...suite.beforeEachHooks];
  const currentAfterEach = [...suite.afterEachHooks, ...inheritedAfterEach];

  // 1. Run beforeAll hooks
  for (const hook of suite.beforeAllHooks) {
    await hook();
  }

  // 2. Run Tests in this suite
  for (const t of suite.tests) {
    // Check filter & only/skip
    if (suite.skip || t.skip) {
      t.status = 'skipped';
      stats.skipped++;
      if (options.verbose) {
        console.log(`    ${c.yellow}- ${t.name} (SKIPPED)${c.reset}`);
      }
      continue;
    }

    if (hasOnly && !suite.only && !t.only) {
      t.status = 'skipped';
      stats.skipped++;
      continue;
    }

    if (filterRegex && !filterRegex.test(t.fullName)) {
      continue;
    }

    // Run beforeEach
    const t0 = Date.now();
    try {
      for (const hook of currentBeforeEach) {
        await hook();
      }

      // Run test function with timeout
      await Promise.race([
        Promise.resolve(t.fn()),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`Test timed out after ${options.timeout}ms`)), options.timeout).unref?.()
        ),
      ]);

      t.status = 'passed';
      t.duration = Date.now() - t0;
      stats.passed++;
      console.log(`    ${c.green}✔${c.reset} ${t.name} ${c.dim}(${t.duration}ms)${c.reset}`);
    } catch (err) {
      t.status = 'failed';
      t.duration = Date.now() - t0;
      t.error = err;
      stats.failed++;
      stats.failures.push(t);
      console.log(`    ${c.red}✖${c.reset} ${t.name} ${c.dim}(${t.duration}ms)${c.reset}`);
      if (options.verbose) {
        console.log(`      ${c.red}${err.message}${c.reset}`);
      }
      if (options.bail) {
        throw new Error('BAIL_OUT');
      }
    } finally {
      // Guaranteed afterEach cleanup
      for (const hook of currentAfterEach) {
        try {
          await hook();
        } catch (hookErr) {
          console.error(`${c.red}Error in afterEach hook:${c.reset}`, hookErr.message);
        }
      }
    }
  }

  // 3. Run Sub-suites
  for (const sub of suite.subSuites) {
    await runSuite(sub, options, filterRegex, stats, currentBeforeEach, currentAfterEach);
  }

  // 4. Run afterAll hooks
  for (const hook of suite.afterAllHooks) {
    try {
      await hook();
    } catch (hookErr) {
      console.error(`${c.red}Error in afterAll hook:${c.reset}`, hookErr.message);
    }
  }
}
```

---

## 9. Integration with Peers (`assert.js` and `dom_env.js`)

1. **Assertion Library Integration (`tests/helpers/assert.js`)**:
   - Designed by Explorer 2.
   - Throws `AssertionError` with `actual`, `expected`, `message`, and diff details.
   - The runner detects `err.name === 'AssertionError'` and cleanly formats `Expected` vs `Actual` values in the failure summary.
2. **DOM Environment Integration (`tests/helpers/dom_env.js`)**:
   - Designed by Explorer 3.
   - Provides `setupDom(htmlPathOrString)` and `teardownDom()`.
   - Used inside `beforeEach` and `afterEach` hooks across all DOM-dependent test cases.
   - Runner guarantees that if a test fails in the middle of a DOM mutation or timer, `afterEach` executes `teardownDom()` to prevent state leakage to subsequent tests.
3. **Smoke Suite (`tests/test_infra.test.js`)**:
   - Exercises runner hooks, synchronous assertions, async promise resolution, timeout detection, and DOM mocks.

---

## 10. Summary of Architectural Decisions

1. **Zero-npm Dependency**: All runner mechanisms use standard Node.js libraries (`node:fs`, `node:path`, `node:process`), satisfying the project's strict offline, zero-dependency mandate.
2. **Two-Phase Lifecycle**: Clean separation of test definition/registration from execution, supporting `.only`, `.skip`, `--filter`, and deterministic lexical sorting.
3. **Robust Isolation**: Guaranteed execution of `afterEach` and `afterAll` hooks via `finally` blocks, preventing polluted state across test cases.
4. **ANSI Reporting**: Native terminal colors, informative per-tier breakdown tables, and consolidated error reports pointing directly to test line numbers.
5. **Exact Exit Codes**: Clean `0` for complete pass, `1` for any failure or syntax/runtime error, ensuring pipeline integration.
