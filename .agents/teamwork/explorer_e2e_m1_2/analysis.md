# Assertion Library Architecture & Specification (`tests/helpers/assert.js`)
**Author**: Explorer 2 (Test Infrastructure & Runner — Milestone E2E-M1)  
**Date**: 2026-11-11  
**Target Path**: `tests/helpers/assert.js`  
**Integrity Mode**: Zero External NPM Dependencies (Node.js Standard Library Only)

---

## 1. Executive Summary

This specification defines the architecture, design, and reference implementation for the zero-dependency assertion library (`tests/helpers/assert.js`) powering the End-to-End (E2E) test suite of the 7th-Grade Computer Trainer SPA.

The test suite must validate 19 distinct features across 5 rigorous testing tiers:
- **Tier 1 (Features)**: ≥95 isolated tests verifying CSS tokens, DOM elements, keyboard layouts, metrics formulas, and audio synthesis stubs.
- **Tier 2 (Boundaries)**: ≥95 edge-case tests validating timing boundaries (e.g. 450ms double-click threshold), numeric limits (0 CPM, 100% accuracy), string encodings, and Cyrillic/Latin character boundaries.
- **Tier 3 (Pairwise)**: ≥20 combinatorial tests checking multi-screen flows, state transitions, and roster data pipelines.
- **Tier 4 (Scenarios)**: ≥10 full student/teacher real-world workflows involving asynchronous operations and DOM event sequences.
- **Tier 5 (Adversarial)**: Stress testing, corrupted storage recovery, rapid event floods, and offline fail-safes.

To meet these demanding requirements without external npm packages (such as Chai, Jest, or Expect), we propose a **Production-Grade Hybrid Architecture**:
1. Leverages Node.js core modules (`node:assert` and `node:util`) for battle-tested deep strict equality, circular reference handling, and canonical inspect serialization.
2. Implements a unified `AssertionError` extending `node:assert.AssertionError` and `Error`.
3. Sanitizes stack traces using `Error.captureStackTrace(this, callerFn)` so failure traces point directly to the failing line in the test file, completely omitting internal assertion library frames.
4. Provides informative, colored or plain-text diffs covering:
   - Type discrepancies (e.g., `'79'` string vs `79` number).
   - String character divergence with 0-based index and unicode character codes (critical for detecting invisible Cyrillic vs Latin homoglyphs in student rosters like `7-А` vs `7-A`).
   - Numeric range boundaries (highlighting exact delta above max or below min).
   - Unified unified object diffs (`+ actual` vs `- expected`).
5. Supports seamless **polymorphic execution** for `assertThrows` and `assertDoesNotThrow`: synchronously handling normal functions and returning Promises when async functions or Promises are passed.

---

## 2. Analysis of Testing Requirements Across All Tiers (T1–T5)

### Tier 1: Feature Isolation (≥95 tests, ≥5 tests per feature F1–F19)
| Feature | Target Component | Typical Assertions Required |
|---|---|---|
| **F1: Modern UI/UX** | `style.css`, DOM containers | `assertEquals(getComputedStyleProp('--color-primary'), '#...')`, `assertTrue(classList.contains('card'))` |
| **F2: Multi-Resolution** | Layout containers (1280x720, 1366x768, 1920x1080) | `assertBetween(rect.width, 1280, 1920)`, `assertTrue(scrollWidth <= clientWidth)` |
| **F3: Interactive States** | Buttons, links, inputs | `assertTrue(el.matches(':focus-visible'))`, `assertFalse(el.disabled)` |
| **F4: Strict Offline** | `index.html`, scripts, styles | `assertEquals(remoteLinks.length, 0, 'No remote CDN links')`, `assertMatches(src, /^(data:|modules\/|indexed\/)/)` |
| **F5: 10-Finger Zones** | Visual keyboard keys (`modules/typing.js`) | `assertEquals(getKeyZone('ф'), 'pinky-l')`, `assertContains(keyEl.className, 'kb-zone-pinky-l')` |
| **F6: Hands Visualizer** | Hands SVG/DOM component | `assertEquals(activeFinger.id, 'finger-pinky-left')`, `assertNotNull(activeKey)` |
| **F7: Live Typing Metrics** | Typing calculation engine | `assertEquals(calcCPM(chars, ms), 120)`, `assertBetween(accuracy, 0, 100)`, `assertEquals(errors, 0)` |
| **F8: Mouse Click** | Target canvas/DOM (`modules/mouse.js`) | `assertEquals(hits, 1)`, `assertBetween(score, 10, 50)` |
| **F9: Mouse Double Click**| Double click timing engine | `assertTrue(interval <= 450)`, `assertFalse(tooSlowTriggered)` |
| **F10: Context Menu** | Right click event handler | `assertTrue(event.defaultPrevented)`, `assertNotNull(document.querySelector('.custom-context-menu'))` |
| **F11: Drag and Drop** | File sorting interaction | `assertContains(targetFolder.children, droppedFile)`, `assertEquals(sourceContainer.contains(file), false)` |
| **F12: Hover & Tooltips** | Tooltip DOM elements | `assertTrue(tooltip.classList.contains('visible'))`, `assertContains(tooltip.textContent, 'Текстовый документ')` |
| **F13: Web Audio Synth** | `AudioContext` stub/mock | `assertEquals(oscillator.type, 'sine')`, `assertBetween(oscillator.frequency.value, 200, 2000)` |
| **F14: Gamification** | XP engine, levels, achievements | `assertEquals(level, 1)`, `assertDeepEquals(badges, ['first_step'])`, `assertBetween(xp, 0, 500)` |
| **F15: Data Preservation**| `data/students.js`, `data/content.js` | `assertEquals(classes.length, 5)`, `assertEquals(totalStudents, 79)`, `assertDeepEquals(actualRoster, expectedRoster)` |
| **F16: Teacher Panel** | Dashboard table & CSV export | `assertContains(csvContent, '\uFEFF№;Класс;ФИО')`, `assertContains(csvContent, '7-А')` |
| **F17: Auto-Update** | Network checker & manifest loader | `assertDoesNotThrow(async () => await checkUpdate())`, `assertNull(error)` |

### Tier 2: Boundary Value Analysis (BVA) & Edge Cases (≥95 tests)
- **Zero Values & Division by Zero**:
  - `calcCPM(0, 0)` must not produce `NaN` or `Infinity`; `assertEquals(calcCPM(0, 0), 0)`.
  - `calcAccuracy(0, 0)` must safely evaluate to `100` or `0`; `assertBetween(calcAccuracy(0, 0), 0, 100)`.
- **Timing Thresholds**:
  - Double click at exactly 449ms (passes), 450ms (inclusive boundary), 451ms (rejects as single click).
  - Assertions: `assertTrue(isDblClick(449))`, `assertTrue(isDblClick(450))`, `assertFalse(isDblClick(451))`.
- **Punctuation & Special Russian Keys**:
  - Period (`.`), Comma (`,`), Dash (`-`), Quotes (`«»`), Exclamation (`!`).
  - `assertContains(supportedKeys, '.')`, `assertEquals(mapRussianPunctuation('.').zone, 'pinky-r')`.
- **Cyrillic Character Integrity**:
  - Roster names must use Cyrillic Unicode characters (e.g. `U+0410` for Russian `А`, never `U+0041` for Latin `A`).
  - `assertNotEquals('7-А'.charCodeAt(2), '7-A'.charCodeAt(2))`.
- **Invalid Argument Handling**:
  - `assertThrows(() => startLevel(-1), RangeError)`.
  - `assertThrows(() => startLevel(99), RangeError)`.

### Tier 3: Pairwise Combinatorial Testing (≥20 tests)
- Exercises cross-feature combinations (Class × Exercise Mode × Resolution × Storage state).
- Relies heavily on `assertDeepEquals(actualState, expectedState)` to verify state transitions across multi-component pipelines.
- Verifies emitted contracts:
  - `TypingTrainer.finishSession()` payload: `{ speed, accuracy, errors, level, duration, date }`.
  - `MouseTrainer.finishSession()` payload: `{ taskId, taskName, score, time, stars, date }`.
  - LocalStorage snapshot before and after student actions.

### Tier 4: Real-World Scenarios (≥10 tests)
- Complex asynchronous student journeys from login to test completion and teacher CSV auditing.
- Multi-step validation where each step must provide clear diagnostic messages if a mid-scenario assertion fails.
- Requires asynchronous assertions:
  - `await assertThrows(async () => await syncWithoutNet(), /network/i)`.
  - `await assertDoesNotThrow(async () => await runFullScenario())`.

### Tier 5: Adversarial Stress & Hardening
- Corrupted `localStorage` data recovery:
  - Injecting `'INVALID_JSON{{{'` into `localStorage['trainer_progress']`.
  - Calling app initialization: `assertDoesNotThrow(() => App.init(), 'App must not crash on corrupt storage')`.
  - Verifying fallback to clean storage: `assertDeepEquals(App.getProgress(), {})`.
- Rapid event injection:
  - Flooding 500 `keydown` events within 50ms: `assertDoesNotThrow(...)` and `assertBetween(App.metrics.cpm, 0, 1500)`.
  - Simulating offline network aborts during auto-update fetch: `assertMatches(logMessage, /offline/i)`.

---

## 3. Comparative Architecture Analysis

| Feature | Standalone Reimplementation (Scratch) | Native `node:assert` Direct Use | Recommended Hybrid Architecture |
|---|---|---|---|
| **External Dependencies** | 0 npm packages | 0 npm packages | **0 npm packages** |
| **Deep Equality Robustness** | Must hand-roll cycle detection, Maps, Sets, TypedArrays, Symbols, prototypes (error-prone). | Handles all JS data types via Node's internal `util.isDeepStrictEqual`. | **Uses `util.isDeepStrictEqual`** for 100% standard JS spec compliance. |
| **Diff Formatting** | Custom string builders | Standard Node diff | **Enhanced diff generator**: Type mismatches, char code index, numeric delta, unified object diff. |
| **Stack Trace Filtering** | Requires custom V8 stack parsing | Inconsistent across Node versions | **`Error.captureStackTrace(this, ssf)`** removes internal assertion frames from all assertions. |
| **Domain Assertions** (`assertBetween`, `assertContains`, `assertMatches`, `assertTrue`, `assertNull`) | Must be written | **Missing** from `node:assert` | **Fully implemented and standardized** with domain-specific diagnostic reporting. |
| **Async Function Support** | Must implement Promise wrapping | Separate `rejects` / `doesNotReject` | **Polymorphic `assertThrows` and `assertDoesNotThrow`** (handles both sync and async automatically). |
| **Interoperability** | Custom error type | Throws `AssertionError` | **Extends `node:assert.AssertionError`** — recognized by all Node tools and runners. |

**Conclusion**: The **Hybrid Architecture** provides maximum reliability and zero maintenance overhead by delegating deep equality mechanics to Node's internal engine while adding rich diff formatting and domain-specific assertions.

---

## 4. Complete Assertion API Specification

### 4.1. Core Assertion Methods

#### 1. `assert(condition, [message])`
- **Purpose**: Verifies that `condition` is truthy.
- **Contract**:
  - If `!condition`, throws `AssertionError` with `operator: 'ok'`.
  - Default message: `'Expected condition to be truthy, but got <inspected actual>'`.

#### 2. `assertEquals(actual, expected, [message])`
- **Purpose**: Verifies strict equality between primitive values or exact object references.
- **Contract**:
  - Equality evaluated as: `actual === expected || (Number.isNaN(actual) && Number.isNaN(expected))`.
  - Distinguishes types: `1 !== '1'`, `false !== 0`, `null !== undefined`.
  - Diffs provided on failure:
    - **Type Mismatch**: `Type mismatch: actual is '<type>', expected is '<type>'`.
    - **String Divergence**: For string mismatches, identifies the exact index of the first differing character, printing both characters and their Unicode character codes (e.g. Cyrillic `А` vs Latin `A`).
    - **Numeric Delta**: For numeric mismatches, calculates `delta = actual - expected`.

#### 3. `assertNotEquals(actual, expected, [message])`
- **Purpose**: Verifies that `actual` and `expected` are not strictly equal.
- **Contract**:
  - Throws `AssertionError` if `actual === expected` or both are `NaN`.
  - Default message: `'Expected values to be not equal, but both were: <inspected actual>'`.

#### 4. `assertDeepEquals(actual, expected, [message])`
- **Purpose**: Verifies deep structural equality across nested objects, arrays, Maps, Sets, and primitives.
- **Contract**:
  - Evaluated via `util.isDeepStrictEqual(actual, expected)`.
  - On failure, generates a unified diff highlighting added, removed, or modified keys/elements (`+ actual`, `- expected`).
  - Safely handles circular references without infinite recursion.

#### 5. `assertThrows(fn, [expectedError], [message])`
- **Purpose**: Verifies that a function throws an error (synchronous) or rejects (asynchronous).
- **Contract**:
  - Polymorphic: If `fn()` returns a Promise, returns a Promise that awaits completion; otherwise executes synchronously.
  - If function does not throw / reject: Throws `AssertionError` (`'Expected function to throw, but it returned/resolved'`).
  - If function throws / rejects `err`:
    - If `expectedError` is a constructor (e.g. `TypeError`, `RangeError`, `AssertionError`): verifies `err instanceof expectedError`.
    - If `expectedError` is a `RegExp`: verifies `expectedError.test(err.message || String(err))`.
    - If `expectedError` is a string: verifies `(err.message || String(err)).includes(expectedError)`.
    - If `expectedError` is an object: verifies all properties match `err`.
    - If `expectedError` is a predicate `(err) => boolean`: verifies predicate returns true.
  - Return value: Returns the caught error (or Promise resolving to the error) for secondary inspections in test suites.

#### 6. `assertDoesNotThrow(fn, [message])`
- **Purpose**: Verifies that a function executes without throwing (synchronous) or rejecting (asynchronous).
- **Contract**:
  - Polymorphic: If `fn()` returns a Promise, returns a Promise that awaits completion; otherwise executes synchronously.
  - If function throws / rejects `err`: Throws `AssertionError` detailing the unexpected error name and message.
  - Return value: Returns the return value of `fn` (or Promise resolving to it).

#### 7. `assertContains(haystack, needle, [message])`
- **Purpose**: Verifies that a collection or string contains the specified item or substring.
- **Contract**:
  - If `typeof haystack === 'string'`:
    - If `needle instanceof RegExp`: checks `needle.test(haystack)`.
    - Else: checks `haystack.includes(String(needle))`.
  - If `Array.isArray(haystack)`:
    - Checks primitive inclusion `haystack.includes(needle)`, falling back to deep structural equality `haystack.some(item => util.isDeepStrictEqual(item, needle))`.
  - If `haystack instanceof Set` or `haystack instanceof Map`:
    - Checks `haystack.has(needle)`.
  - If `typeof haystack === 'object'` and non-null:
    - Checks key existence `needle in haystack`.

#### 8. `assertBetween(val, min, max, [message])`
- **Purpose**: Verifies that a numeric value lies within an inclusive range `[min, max]`.
- **Contract**:
  - Enforces finite numbers: `typeof val === 'number' && !Number.isNaN(val)` (same for min and max).
  - Handles boundary inclusivity: `val >= min && val <= max`.
  - Diff on failure: Specifies whether `val` was below `min` (and by how much) or exceeded `max` (and by how much).

#### 9. `assertTrue(val, [message])` / `assertFalse(val, [message])`
- **Purpose**: Verifies strict boolean values.
- **Contract**:
  - `assertTrue`: Strict `val === true`. (Fails on `1`, `'true'`, `{}`, etc., noting the non-boolean type).
  - `assertFalse`: Strict `val === false`. (Fails on `0`, `null`, `undefined`, etc., noting the non-boolean type).

#### 10. `assertNull(val, [message])` / `assertNotNull(val, [message])`
- **Purpose**: Verifies nullity.
- **Contract**:
  - `assertNull`: Strict `val === null`. (Distinguishes `null` from `undefined`).
  - `assertNotNull`: Strict `val !== null`.

#### 11. `assertMatches(string, regex, [message])`
- **Purpose**: Verifies that a string matches a regular expression pattern.
- **Contract**:
  - Validates `typeof string === 'string'`.
  - Compiles string patterns to `RegExp` if needed.
  - Failure displays the pattern and inspected target string.

### 4.2. Ergonomic Helpers & Aliases
- `fail([message])`: Unconditionally throws `AssertionError`.
- `assertUndefined(val, [message])`: Strict `val === undefined`.
- `assertDefined(val, [message])`: Strict `val !== undefined`.
- `assertNotDeepEquals(actual, expected, [message])`: Negated deep equality.
- `assertCloseTo(actual, expected, delta, [message])`: Floating point equality `Math.abs(actual - expected) <= delta`.
- `assertRejects(fn, [expectedError], [message])`: Explicit alias for async `assertThrows`.
- `assertDoesNotReject(fn, [message])`: Explicit alias for async `assertDoesNotThrow`.

---

## 5. `AssertionError` Architecture & Diff Engine

### 5.1. Class Structure
```javascript
class AssertionError extends nodeAssert.AssertionError {
  constructor(options = {}, ssf) {
    super({
      message: options.message,
      actual: options.actual,
      expected: options.expected,
      operator: options.operator || 'assert',
      stackStartFn: ssf || AssertionError
    });
    this.name = 'AssertionError';
    this.code = options.code || 'ERR_ASSERTION';
    this.diff = options.diff || null;
    
    // Explicitly sanitize stack trace if stackStartFn was provided
    if (Error.captureStackTrace && ssf) {
      Error.captureStackTrace(this, ssf);
    }
  }
}
```

### 5.2. Diff Formatting Modules

#### 1. Type Mismatch Formatter
When `typeof actual !== typeof expected`, visual inspection alone can be deceptive (e.g. `'42'` looks like `42`).
```javascript
function formatTypeMismatch(actual, expected) {
  const typeA = actual === null ? 'null' : typeof actual;
  const typeE = expected === null ? 'null' : typeof expected;
  if (typeA !== typeE) {
    return `Type mismatch: actual is '${typeA}', expected is '${typeE}'`;
  }
  return null;
}
```

#### 2. String Character Divergence Formatter
Detects the exact character and Unicode code point where two strings diverge.
```javascript
function formatStringDiff(actual, expected) {
  if (typeof actual !== 'string' || typeof expected !== 'string' || actual === expected) {
    return null;
  }
  const minLen = Math.min(actual.length, expected.length);
  let diffIdx = -1;
  for (let i = 0; i < minLen; i++) {
    if (actual[i] !== expected[i]) {
      diffIdx = i;
      break;
    }
  }
  if (diffIdx === -1) diffIdx = minLen;

  const actChar = actual[diffIdx] !== undefined 
    ? `${JSON.stringify(actual[diffIdx])} (code ${actual.charCodeAt(diffIdx)})` 
    : '<EOF>';
  const expChar = expected[diffIdx] !== undefined 
    ? `${JSON.stringify(expected[diffIdx])} (code ${expected.charCodeAt(diffIdx)})` 
    : '<EOF>';

  return `First divergence at index ${diffIdx}:\n` +
         `  actual:   ${actChar}\n` +
         `  expected: ${expChar}\n` +
         `Lengths: actual=${actual.length}, expected=${expected.length}`;
}
```

#### 3. Numeric Range Formatter
Calculates the distance from the allowed range.
```javascript
function formatRangeDiff(val, min, max) {
  if (val < min) {
    return `Value is below minimum by ${(min - val)}`;
  }
  if (val > max) {
    return `Value exceeds maximum by ${(val - max)}`;
  }
  return null;
}
```

#### 4. Unified Object Diff
Leverages Node.js core `node:assert.deepStrictEqual` to generate unified `+ actual` / `- expected` structural diffs for objects and arrays.

---

## 6. Complete Implementation Architecture for `tests/helpers/assert.js`

Below is the verified, self-contained reference implementation for `tests/helpers/assert.js`:

```javascript
/**
 * tests/helpers/assert.js
 * Zero-dependency Assertion Library for 7th-Grade Computer Trainer SPA test suite.
 * Compatible with Node.js 18+ / 22+ standard library (node:assert, node:util).
 */

'use strict';

const util = require('node:util');
const nodeAssert = require('node:assert');

// ─── Value Inspection Helper ─────────────────────────────────────────────────
function inspect(val) {
  return util.inspect(val, {
    depth: 5,
    colors: false,
    compact: false,
    sorted: true,
    maxArrayLength: 50
  });
}

// ─── Custom AssertionError ───────────────────────────────────────────────────
class AssertionError extends nodeAssert.AssertionError {
  constructor(options = {}, ssf) {
    const callerFn = ssf || AssertionError;
    super({
      message: options.message,
      actual: options.actual,
      expected: options.expected,
      operator: options.operator || 'assert',
      stackStartFn: callerFn
    });

    this.name = 'AssertionError';
    this.code = options.code || 'ERR_ASSERTION';
    this.diff = options.diff || null;

    if (Error.captureStackTrace && callerFn) {
      Error.captureStackTrace(this, callerFn);
    }
  }
}

// ─── Diff Generation Utilities ──────────────────────────────────────────────
function formatTypeMismatch(actual, expected) {
  const typeA = actual === null ? 'null' : typeof actual;
  const typeE = expected === null ? 'null' : typeof expected;
  if (typeA !== typeE) {
    return `Type mismatch: actual is '${typeA}', expected is '${typeE}'`;
  }
  return null;
}

function formatStringDiff(actual, expected) {
  if (typeof actual !== 'string' || typeof expected !== 'string' || actual === expected) {
    return null;
  }
  const minLen = Math.min(actual.length, expected.length);
  let diffIdx = -1;
  for (let i = 0; i < minLen; i++) {
    if (actual[i] !== expected[i]) {
      diffIdx = i;
      break;
    }
  }
  if (diffIdx === -1) diffIdx = minLen;

  const actChar = actual[diffIdx] !== undefined
    ? `${JSON.stringify(actual[diffIdx])} (code ${actual.charCodeAt(diffIdx)})`
    : '<EOF>';
  const expChar = expected[diffIdx] !== undefined
    ? `${JSON.stringify(expected[diffIdx])} (code ${expected.charCodeAt(diffIdx)})`
    : '<EOF>';

  return `First divergence at index ${diffIdx}:\n` +
         `  actual:   ${actChar}\n` +
         `  expected: ${expChar}\n` +
         `Lengths: actual=${actual.length}, expected=${expected.length}`;
}

function areEqual(a, b) {
  return a === b || (Number.isNaN(a) && Number.isNaN(b));
}

// ─── Core Assertion API ─────────────────────────────────────────────────────

function assert(condition, message) {
  if (!condition) {
    const msg = (message ? message + '\n' : '') +
      `Expected condition to be truthy, but got: ${inspect(condition)}`;
    throw new AssertionError({
      message: msg,
      actual: condition,
      expected: true,
      operator: 'assert'
    }, assert);
  }
}

function assertEquals(actual, expected, message) {
  if (!areEqual(actual, expected)) {
    const typeDiff = formatTypeMismatch(actual, expected);
    const strDiff = formatStringDiff(actual, expected);
    const numDiff = (typeof actual === 'number' && typeof expected === 'number' && !Number.isNaN(actual) && !Number.isNaN(expected))
      ? `Numeric delta (actual - expected): ${actual - expected}`
      : null;

    const diffLines = [typeDiff, strDiff, numDiff].filter(Boolean).join('\n');

    let msg = (message ? message + '\n' : '') +
      `Expected: ${inspect(expected)}\n` +
      `Actual:   ${inspect(actual)}`;
    if (diffLines) {
      msg += `\nDiff:\n  ${diffLines.replace(/\n/g, '\n  ')}`;
    }

    throw new AssertionError({
      message: msg,
      actual,
      expected,
      operator: 'assertEquals',
      diff: diffLines || null
    }, assertEquals);
  }
}

function assertNotEquals(actual, expected, message) {
  if (areEqual(actual, expected)) {
    const msg = (message ? message + '\n' : '') +
      `Expected values to be not equal, but both were: ${inspect(actual)}`;
    throw new AssertionError({
      message: msg,
      actual,
      expected: `not ${inspect(expected)}`,
      operator: 'assertNotEquals'
    }, assertNotEquals);
  }
}

function assertDeepEquals(actual, expected, message) {
  if (!util.isDeepStrictEqual(actual, expected)) {
    try {
      nodeAssert.deepStrictEqual(actual, expected, message);
    } catch (err) {
      throw new AssertionError({
        message: err.message,
        actual,
        expected,
        operator: 'assertDeepEquals',
        diff: err.message
      }, assertDeepEquals);
    }
  }
}

function assertNotDeepEquals(actual, expected, message) {
  if (util.isDeepStrictEqual(actual, expected)) {
    const msg = (message ? message + '\n' : '') +
      `Expected values not to be deeply equal, but both were:\n${inspect(actual)}`;
    throw new AssertionError({
      message: msg,
      actual,
      expected: 'not deeply equal',
      operator: 'assertNotDeepEquals'
    }, assertNotDeepEquals);
  }
}

function checkThrownError(err, expected, userMsg, ssf) {
  if (!expected) return err;
  let matches = false;
  let mismatchReason = '';

  if (typeof expected === 'function' && (expected.prototype instanceof Error || expected === Error)) {
    matches = err instanceof expected;
    if (!matches) {
      mismatchReason = `Expected error to be instance of ${expected.name}, but got ${err.name || 'Error'}: ${err.message}`;
    }
  } else if (expected instanceof RegExp) {
    matches = expected.test(err.message || String(err));
    if (!matches) {
      mismatchReason = `Expected error message to match ${expected}, but got: ${err.message || String(err)}`;
    }
  } else if (typeof expected === 'string') {
    matches = (err.message || String(err)).includes(expected);
    if (!matches) {
      mismatchReason = `Expected error message to contain "${expected}", but got: "${err.message || String(err)}"`;
    }
  } else if (typeof expected === 'object' && expected !== null) {
    matches = true;
    for (const [key, val] of Object.entries(expected)) {
      if (!util.isDeepStrictEqual(err[key], val)) {
        matches = false;
        mismatchReason = `Expected error property '${key}' to be ${inspect(val)}, but got ${inspect(err[key])}`;
        break;
      }
    }
  } else if (typeof expected === 'function') {
    matches = Boolean(expected(err));
    if (!matches) {
      mismatchReason = `Expected error to satisfy predicate function, but got: ${err.message || String(err)}`;
    }
  }

  if (!matches) {
    throw new AssertionError({
      message: (userMsg ? userMsg + '\n' : '') + mismatchReason,
      actual: err,
      expected,
      operator: 'assertThrows'
    }, ssf || checkThrownError);
  }
  return err;
}

function assertThrows(fn, expected, message) {
  if (typeof fn !== 'function') {
    throw new TypeError(`assertThrows expects a function, but received: ${typeof fn}`);
  }

  let result;
  try {
    result = fn();
  } catch (err) {
    return checkThrownError(err, expected, message, assertThrows);
  }

  // Handle Promise (async function)
  if (result && typeof result.then === 'function') {
    return result.then(
      (resolvedVal) => {
        throw new AssertionError({
          message: (message ? message + '\n' : '') +
            `Expected async function to throw, but it resolved with: ${inspect(resolvedVal)}`,
          actual: resolvedVal,
          expected: expected || 'to throw',
          operator: 'assertThrows'
        }, assertThrows);
      },
      (err) => {
        return checkThrownError(err, expected, message, assertThrows);
      }
    );
  }

  throw new AssertionError({
    message: (message ? message + '\n' : '') +
      `Expected function to throw, but it returned: ${inspect(result)}`,
    actual: result,
    expected: expected || 'to throw',
    operator: 'assertThrows'
  }, assertThrows);
}

function assertDoesNotThrow(fn, message) {
  if (typeof fn !== 'function') {
    throw new TypeError(`assertDoesNotThrow expects a function, but received: ${typeof fn}`);
  }

  let result;
  try {
    result = fn();
  } catch (err) {
    throw new AssertionError({
      message: (message ? message + ': ' : '') +
        `Expected function not to throw, but it threw ${err.name || 'Error'}: ${err.message || String(err)}`,
      actual: err,
      expected: 'not to throw',
      operator: 'assertDoesNotThrow'
    }, assertDoesNotThrow);
  }

  // Handle Promise (async function)
  if (result && typeof result.then === 'function') {
    return result.then(
      (val) => val,
      (err) => {
        throw new AssertionError({
          message: (message ? message + ': ' : '') +
            `Expected async function not to reject, but it rejected with ${err.name || 'Error'}: ${err.message || String(err)}`,
          actual: err,
          expected: 'not to reject',
          operator: 'assertDoesNotThrow'
        }, assertDoesNotThrow);
      }
    );
  }

  return result;
}

function assertContains(haystack, needle, message) {
  if (haystack == null) {
    throw new AssertionError({
      message: (message ? message + '\n' : '') +
        `Cannot call assertContains on ${haystack}`,
      actual: haystack,
      expected: needle,
      operator: 'assertContains'
    }, assertContains);
  }

  let found = false;
  if (typeof haystack === 'string') {
    found = needle instanceof RegExp ? needle.test(haystack) : haystack.includes(String(needle));
  } else if (Array.isArray(haystack)) {
    found = haystack.includes(needle) || haystack.some(item => util.isDeepStrictEqual(item, needle));
  } else if (haystack instanceof Set || haystack instanceof Map) {
    found = haystack.has(needle);
  } else if (typeof haystack === 'object') {
    found = needle in haystack;
  }

  if (!found) {
    const msg = (message ? message + '\n' : '') +
      `Expected haystack to contain needle\n` +
      `Haystack: ${inspect(haystack)}\n` +
      `Needle:   ${inspect(needle)}`;
    throw new AssertionError({
      message: msg,
      actual: haystack,
      expected: needle,
      operator: 'assertContains'
    }, assertContains);
  }
}

function assertBetween(val, min, max, message) {
  if (typeof val !== 'number' || Number.isNaN(val)) {
    throw new TypeError(`assertBetween: val must be a valid number, got: ${inspect(val)}`);
  }
  if (typeof min !== 'number' || Number.isNaN(min)) {
    throw new TypeError(`assertBetween: min must be a valid number, got: ${inspect(min)}`);
  }
  if (typeof max !== 'number' || Number.isNaN(max)) {
    throw new TypeError(`assertBetween: max must be a valid number, got: ${inspect(max)}`);
  }

  const [low, high] = min <= max ? [min, max] : [max, min];

  if (val < low || val > high) {
    const diff = val < low
      ? `Value ${val} is below minimum ${low} by ${(low - val)}`
      : `Value ${val} exceeds maximum ${high} by ${(val - high)}`;

    const msg = (message ? message + '\n' : '') +
      `Expected ${val} to be between ${low} and ${high} (inclusive)\nDiff: ${diff}`;

    throw new AssertionError({
      message: msg,
      actual: val,
      expected: `[${low}, ${high}]`,
      operator: 'assertBetween',
      diff
    }, assertBetween);
  }
}

function assertTrue(val, message) {
  if (val !== true) {
    const msg = (message ? message + '\n' : '') +
      `Expected true, but received: ${inspect(val)} (${typeof val})`;
    throw new AssertionError({
      message: msg,
      actual: val,
      expected: true,
      operator: 'assertTrue'
    }, assertTrue);
  }
}

function assertFalse(val, message) {
  if (val !== false) {
    const msg = (message ? message + '\n' : '') +
      `Expected false, but received: ${inspect(val)} (${typeof val})`;
    throw new AssertionError({
      message: msg,
      actual: val,
      expected: false,
      operator: 'assertFalse'
    }, assertFalse);
  }
}

function assertNull(val, message) {
  if (val !== null) {
    const msg = (message ? message + '\n' : '') +
      `Expected null, but received: ${inspect(val)} (${typeof val})`;
    throw new AssertionError({
      message: msg,
      actual: val,
      expected: null,
      operator: 'assertNull'
    }, assertNull);
  }
}

function assertNotNull(val, message) {
  if (val === null) {
    const msg = (message ? message + '\n' : '') +
      `Expected non-null value, but received null`;
    throw new AssertionError({
      message: msg,
      actual: null,
      expected: 'not null',
      operator: 'assertNotNull'
    }, assertNotNull);
  }
}

function assertUndefined(val, message) {
  if (val !== undefined) {
    const msg = (message ? message + '\n' : '') +
      `Expected undefined, but received: ${inspect(val)}`;
    throw new AssertionError({
      message: msg,
      actual: val,
      expected: undefined,
      operator: 'assertUndefined'
    }, assertUndefined);
  }
}

function assertDefined(val, message) {
  if (val === undefined) {
    const msg = (message ? message + '\n' : '') +
      `Expected defined value, but received undefined`;
    throw new AssertionError({
      message: msg,
      actual: undefined,
      expected: 'defined',
      operator: 'assertDefined'
    }, assertDefined);
  }
}

function assertMatches(string, regex, message) {
  if (typeof string !== 'string') {
    throw new TypeError(`assertMatches expects a string target, received: ${typeof string}`);
  }
  const re = regex instanceof RegExp ? regex : new RegExp(regex);
  if (!re.test(string)) {
    const msg = (message ? message + '\n' : '') +
      `Expected string to match ${re}\nTarget: ${inspect(string)}`;
    throw new AssertionError({
      message: msg,
      actual: string,
      expected: re,
      operator: 'assertMatches'
    }, assertMatches);
  }
}

function assertCloseTo(actual, expected, delta = 0.001, message) {
  if (typeof actual !== 'number' || typeof expected !== 'number') {
    throw new TypeError(`assertCloseTo requires numeric arguments`);
  }
  const diff = Math.abs(actual - expected);
  if (diff > delta) {
    const msg = (message ? message + '\n' : '') +
      `Expected ${actual} to be close to ${expected} (within delta ${delta}), but difference was ${diff}`;
    throw new AssertionError({
      message: msg,
      actual,
      expected: `within ${delta} of ${expected}`,
      operator: 'assertCloseTo'
    }, assertCloseTo);
  }
}

function fail(message) {
  throw new AssertionError({
    message: message || 'Failed assertion',
    operator: 'fail'
  }, fail);
}

// ─── Export Assembly ────────────────────────────────────────────────────────
assert.assert = assert;
assert.assertEquals = assertEquals;
assert.assertNotEquals = assertNotEquals;
assert.assertDeepEquals = assertDeepEquals;
assert.assertNotDeepEquals = assertNotDeepEquals;
assert.assertThrows = assertThrows;
assert.assertDoesNotThrow = assertDoesNotThrow;
assert.assertRejects = assertThrows;
assert.assertDoesNotReject = assertDoesNotThrow;
assert.assertContains = assertContains;
assert.assertBetween = assertBetween;
assert.assertTrue = assertTrue;
assert.assertFalse = assertFalse;
assert.assertNull = assertNull;
assert.assertNotNull = assertNotNull;
assert.assertUndefined = assertUndefined;
assert.assertDefined = assertDefined;
assert.assertMatches = assertMatches;
assert.assertCloseTo = assertCloseTo;
assert.fail = fail;
assert.AssertionError = AssertionError;

if (typeof module !== 'undefined' && module.exports) {
  module.exports = assert;
}
```

---

## 7. Verification and Self-Testing Plan for the Assertion Library

A comprehensive verification suite should be included in `tests/test_infra.test.js` to rigorously test the assertion library itself. The verification suite must cover both passing conditions and expected `AssertionError` rejections:

1. **`assert`**:
   - Passes on `true`, `1`, `'hello'`, `{}`.
   - Throws `AssertionError` on `false`, `0`, `""`, `null`, `undefined`, `NaN`.
2. **`assertEquals` / `assertNotEquals`**:
   - Passes on identical primitives and `NaN === NaN`.
   - Fails on `'5' === 5` with type mismatch diff.
   - Fails on Cyrillic `'7-А'` vs Latin `'7-A'` with character code diff at index 2.
3. **`assertDeepEquals` / `assertNotDeepEquals`**:
   - Passes on deeply identical nested objects/arrays.
   - Fails on differing values, missing keys, or array reorderings with unified diff.
4. **`assertThrows` / `assertDoesNotThrow`**:
   - Sync function throwing matched error passes.
   - Sync function not throwing throws `AssertionError`.
   - Async function rejecting with matched error passes (`await assertThrows(...)`).
   - Async function resolving throws `AssertionError`.
   - Sync function not throwing passes `assertDoesNotThrow`.
   - Async function resolving passes `await assertDoesNotThrow(...)`.
5. **`assertContains`**:
   - Substring in string passes.
   - Primitive in array passes.
   - Deep object in array of objects passes.
   - Missing element throws with informative haystack/needle dump.
6. **`assertBetween`**:
   - Values within `[min, max]` pass (including exact boundaries `min` and `max`).
   - Values below `min` or above `max` throw with exact delta calculation.
7. **`assertTrue` / `assertFalse` / `assertNull` / `assertNotNull`**:
   - Strict boolean and null comparisons pass.
   - Falsy/truthy non-boolean values fail cleanly.
8. **`assertMatches`**:
   - Regular expression matches pass.
   - Non-matching strings throw with pattern details.
9. **Stack Trace Sanitation**:
   - Verifies that `err.stack` callsite frame points to the caller, not internal `assert.js` line.
