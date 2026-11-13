/**
 * tests/helpers/assert.js
 * Production-grade, zero-external-npm-dependency assertion library for the
 * 7th-Grade Computer Trainer SPA test suite.
 * Built on Node.js standard libraries: node:assert, node:util.
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
    maxArrayLength: 50,
    breakLength: 80,
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
      stackStartFn: callerFn,
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

function getType(val) {
  if (val === null) return 'null';
  if (val === undefined) return 'undefined';
  if (Array.isArray(val)) return 'array';
  if (val instanceof RegExp) return 'regexp';
  if (val instanceof Date) return 'date';
  if (val instanceof Set) return 'set';
  if (val instanceof Map) return 'map';
  return typeof val;
}

function formatTypeMismatch(actual, expected) {
  const typeA = getType(actual);
  const typeE = getType(expected);
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

  function charInfo(str, idx) {
    if (idx >= str.length) return '<EOF>';
    const ch = str[idx];
    const code = ch.charCodeAt(0);
    const hex = code.toString(16).toUpperCase().padStart(4, '0');
    return `${JSON.stringify(ch)} (code ${code}, U+${hex})`;
  }

  const actChar = charInfo(actual, diffIdx);
  const expChar = charInfo(expected, diffIdx);

  // Show a snippet of surrounding characters for context
  const startContext = Math.max(0, diffIdx - 10);
  const endContextA = Math.min(actual.length, diffIdx + 10);
  const endContextE = Math.min(expected.length, diffIdx + 10);
  const actSnippet = actual.slice(startContext, endContextA);
  const expSnippet = expected.slice(startContext, endContextE);

  return `Character divergence at index ${diffIdx}:\n` +
         `  actual:   ${actChar} in "${actSnippet}"\n` +
         `  expected: ${expChar} in "${expSnippet}"\n` +
         `  lengths:  actual=${actual.length}, expected=${expected.length}`;
}

function formatNumericDiff(actual, expected) {
  if (typeof actual === 'number' && typeof expected === 'number' && !Number.isNaN(actual) && !Number.isNaN(expected)) {
    const delta = actual - expected;
    const sign = delta > 0 ? '+' : '';
    return `Numeric delta: ${sign}${delta}`;
  }
  return null;
}

function formatRangeDiff(val, min, max) {
  if (typeof val !== 'number' || Number.isNaN(val)) {
    return `Value is not a valid number: ${inspect(val)}`;
  }
  if (val < min) {
    return `Value ${val} is below minimum ${min} by ${min - val}`;
  }
  if (val > max) {
    return `Value ${val} exceeds maximum ${max} by ${val - max}`;
  }
  return null;
}

function formatDeepDiff(actual, expected) {
  try {
    const actLines = inspect(actual).split('\n');
    const expLines = inspect(expected).split('\n');
    const maxLines = Math.max(actLines.length, expLines.length);
    const diffs = [];

    for (let i = 0; i < maxLines; i++) {
      const a = actLines[i];
      const e = expLines[i];
      if (a !== e) {
        if (e !== undefined) diffs.push(`- ${e}`);
        if (a !== undefined) diffs.push(`+ ${a}`);
      }
    }

    if (diffs.length > 0) {
      return diffs.slice(0, 20).join('\n') + (diffs.length > 20 ? '\n... (truncated)' : '');
    }
  } catch {
    // fallback if diffing fails
  }
  return `actual:   ${inspect(actual)}\nexpected: ${inspect(expected)}`;
}

function areEqual(a, b) {
  return a === b || (Number.isNaN(a) && Number.isNaN(b));
}

// ─── Core Assertion API ─────────────────────────────────────────────────────

/**
 * Asserts that a condition is truthy.
 */
function assert(condition, message) {
  if (!condition) {
    const msg = message || `Expected condition to be truthy, got ${inspect(condition)}`;
    throw new AssertionError({
      message: msg,
      actual: condition,
      expected: true,
      operator: 'assert',
    }, assert);
  }
}

/**
 * Asserts strict equality (===) between actual and expected.
 */
function assertEquals(actual, expected, message) {
  if (!areEqual(actual, expected)) {
    const typeDiff = formatTypeMismatch(actual, expected);
    const strDiff = formatStringDiff(actual, expected);
    const numDiff = formatNumericDiff(actual, expected);

    const diffParts = [typeDiff, strDiff, numDiff].filter(Boolean);
    const diff = diffParts.length > 0 ? diffParts.join('\n') : null;

    let defaultMsg = `Expected strictly equal values:\n  actual:   ${inspect(actual)}\n  expected: ${inspect(expected)}`;
    if (diff) {
      defaultMsg += `\n${diff}`;
    }

    throw new AssertionError({
      message: message ? `${message}\n${defaultMsg}` : defaultMsg,
      actual,
      expected,
      operator: 'assertEquals',
      diff,
    }, assertEquals);
  }
}

/**
 * Asserts that actual and expected are not strictly equal (!==).
 */
function assertNotEquals(actual, expected, message) {
  if (areEqual(actual, expected)) {
    const msg = message || `Expected values not to be strictly equal, but both were: ${inspect(actual)}`;
    throw new AssertionError({
      message: msg,
      actual,
      expected: `(not) ${inspect(expected)}`,
      operator: 'assertNotEquals',
    }, assertNotEquals);
  }
}

/**
 * Asserts deep structural equality using util.isDeepStrictEqual.
 */
function assertDeepEquals(actual, expected, message) {
  if (!util.isDeepStrictEqual(actual, expected)) {
    const diff = formatDeepDiff(actual, expected);
    let defaultMsg = `Expected deep strict equality:\n${diff}`;
    throw new AssertionError({
      message: message ? `${message}\n${defaultMsg}` : defaultMsg,
      actual,
      expected,
      operator: 'assertDeepEquals',
      diff,
    }, assertDeepEquals);
  }
}

/**
 * Asserts that actual and expected are not deeply equal.
 */
function assertNotDeepEquals(actual, expected, message) {
  if (util.isDeepStrictEqual(actual, expected)) {
    const msg = message || `Expected objects not to be deeply equal, but both were: ${inspect(actual)}`;
    throw new AssertionError({
      message: msg,
      actual,
      expected: `(not deep equal) ${inspect(expected)}`,
      operator: 'assertNotDeepEquals',
    }, assertNotDeepEquals);
  }
}

/**
 * Validates an error against expected error specifications.
 */
function validateError(err, expectedError) {
  if (!expectedError) return true;

  // Constructor check (e.g. TypeError, RangeError, AssertionError)
  if (typeof expectedError === 'function') {
    // Check if it's an Error constructor or predicate
    if (expectedError.prototype && expectedError.prototype instanceof Error) {
      return err instanceof expectedError || (err && err.name === expectedError.name);
    }
    if (expectedError === Error) {
      return err instanceof Error;
    }
    // Custom predicate function
    return Boolean(expectedError(err));
  }

  // RegExp check
  if (expectedError instanceof RegExp) {
    const text = (err && err.message) ? err.message : String(err);
    return expectedError.test(text);
  }

  // Substring check
  if (typeof expectedError === 'string') {
    const text = (err && err.message) ? err.message : String(err);
    return text.includes(expectedError);
  }

  // Object property check
  if (typeof expectedError === 'object' && expectedError !== null) {
    return Object.keys(expectedError).every(key => err && err[key] === expectedError[key]);
  }

  return false;
}

/**
 * Asserts that a function throws an error or a Promise rejects.
 * Polymorphic: returns a Promise if fn is async or returns a Promise,
 * otherwise executes synchronously and returns the caught error.
 */
function assertThrows(fn, expectedError, message) {
  if (typeof fn !== 'function' && !(fn && typeof fn.then === 'function')) {
    throw new AssertionError({
      message: 'assertThrows expects a function or a Promise as first argument',
      actual: fn,
      expected: 'Function or Promise',
      operator: 'assertThrows',
    }, assertThrows);
  }

  // If a Promise was directly passed
  const isDirectPromise = fn && typeof fn.then === 'function';

  if (isDirectPromise) {
    return fn.then(
      (resolvedVal) => {
        throw new AssertionError({
          message: message || `Expected Promise to reject, but it resolved with: ${inspect(resolvedVal)}`,
          actual: resolvedVal,
          expected: expectedError || 'Rejection',
          operator: 'assertThrows',
        }, assertThrows);
      },
      (rejectedErr) => {
        if (!validateError(rejectedErr, expectedError)) {
          throw new AssertionError({
            message: message || `Promise rejected with unexpected error: ${rejectedErr?.message || inspect(rejectedErr)}`,
            actual: rejectedErr,
            expected: expectedError,
            operator: 'assertThrows',
          }, assertThrows);
        }
        return rejectedErr;
      }
    );
  }

  let result;
  try {
    result = fn();
  } catch (syncErr) {
    if (!validateError(syncErr, expectedError)) {
      throw new AssertionError({
        message: message || `Function threw unexpected error: ${syncErr?.message || inspect(syncErr)}`,
        actual: syncErr,
        expected: expectedError,
        operator: 'assertThrows',
      }, assertThrows);
    }
    return syncErr;
  }

  // If the function returned a Promise
  if (result && typeof result.then === 'function') {
    return result.then(
      (resolvedVal) => {
        throw new AssertionError({
          message: message || `Expected async function to reject, but it resolved with: ${inspect(resolvedVal)}`,
          actual: resolvedVal,
          expected: expectedError || 'Rejection',
          operator: 'assertThrows',
        }, assertThrows);
      },
      (rejectedErr) => {
        if (!validateError(rejectedErr, expectedError)) {
          throw new AssertionError({
            message: message || `Async function rejected with unexpected error: ${rejectedErr?.message || inspect(rejectedErr)}`,
            actual: rejectedErr,
            expected: expectedError,
            operator: 'assertThrows',
          }, assertThrows);
        }
        return rejectedErr;
      }
    );
  }

  // Synchronous function did not throw
  throw new AssertionError({
    message: message || `Expected function to throw, but it returned: ${inspect(result)}`,
    actual: result,
    expected: expectedError || 'Error',
    operator: 'assertThrows',
  }, assertThrows);
}

/**
 * Asserts that a function does NOT throw an error or a Promise does NOT reject.
 * Polymorphic: handles both synchronous and asynchronous functions.
 */
function assertDoesNotThrow(fn, message) {
  if (typeof fn !== 'function' && !(fn && typeof fn.then === 'function')) {
    throw new AssertionError({
      message: 'assertDoesNotThrow expects a function or a Promise as first argument',
      actual: fn,
      expected: 'Function or Promise',
      operator: 'assertDoesNotThrow',
    }, assertDoesNotThrow);
  }

  const isDirectPromise = fn && typeof fn.then === 'function';

  if (isDirectPromise) {
    return fn.then(
      (val) => val,
      (err) => {
        const msg = message ? `${message}\nGot unexpected rejection: ${err?.message || inspect(err)}` : `Expected Promise not to reject, but it rejected with: ${err?.message || inspect(err)}`;
        throw new AssertionError({
          message: msg,
          actual: err,
          expected: 'No rejection',
          operator: 'assertDoesNotThrow',
        }, assertDoesNotThrow);
      }
    );
  }

  let result;
  try {
    result = fn();
  } catch (err) {
    const msg = message ? `${message}\nGot unexpected throw: ${err?.message || inspect(err)}` : `Expected function not to throw, but it threw: ${err?.message || inspect(err)}`;
    throw new AssertionError({
      message: msg,
      actual: err,
      expected: 'No throw',
      operator: 'assertDoesNotThrow',
    }, assertDoesNotThrow);
  }

  if (result && typeof result.then === 'function') {
    return result.then(
      (val) => val,
      (err) => {
        const msg = message ? `${message}\nGot unexpected rejection: ${err?.message || inspect(err)}` : `Expected async function not to reject, but it rejected with: ${err?.message || inspect(err)}`;
        throw new AssertionError({
          message: msg,
          actual: err,
          expected: 'No rejection',
          operator: 'assertDoesNotThrow',
        }, assertDoesNotThrow);
      }
    );
  }

  return result;
}

/**
 * Asserts that haystack contains needle.
 * Supports strings, arrays, Sets, Maps, and plain objects.
 */
function assertContains(haystack, needle, message) {
  let contains = false;

  if (typeof haystack === 'string') {
    if (needle instanceof RegExp) {
      contains = needle.test(haystack);
    } else {
      contains = haystack.includes(String(needle));
    }
  } else if (Array.isArray(haystack)) {
    contains = haystack.includes(needle) || haystack.some(item => util.isDeepStrictEqual(item, needle));
  } else if (haystack instanceof Set || haystack instanceof Map) {
    contains = haystack.has(needle);
  } else if (typeof haystack === 'object' && haystack !== null) {
    contains = Object.prototype.hasOwnProperty.call(haystack, needle) || (needle in haystack);
  }

  if (!contains) {
    const defaultMsg = `Expected collection to contain needle:\n  haystack: ${inspect(haystack)}\n  needle:   ${inspect(needle)}`;
    throw new AssertionError({
      message: message ? `${message}\n${defaultMsg}` : defaultMsg,
      actual: haystack,
      expected: needle,
      operator: 'assertContains',
    }, assertContains);
  }
}

/**
 * Asserts that haystack does NOT contain needle.
 */
function assertNotContains(haystack, needle, message) {
  let contains = false;

  if (typeof haystack === 'string') {
    if (needle instanceof RegExp) {
      contains = needle.test(haystack);
    } else {
      contains = haystack.includes(String(needle));
    }
  } else if (Array.isArray(haystack)) {
    contains = haystack.includes(needle) || haystack.some(item => util.isDeepStrictEqual(item, needle));
  } else if (haystack instanceof Set || haystack instanceof Map) {
    contains = haystack.has(needle);
  } else if (typeof haystack === 'object' && haystack !== null) {
    contains = Object.prototype.hasOwnProperty.call(haystack, needle) || (needle in haystack);
  }

  if (contains) {
    const defaultMsg = `Expected collection not to contain needle, but it did:\n  haystack: ${inspect(haystack)}\n  needle:   ${inspect(needle)}`;
    throw new AssertionError({
      message: message ? `${message}\n${defaultMsg}` : defaultMsg,
      actual: haystack,
      expected: `(not) ${inspect(needle)}`,
      operator: 'assertNotContains',
    }, assertNotContains);
  }
}

/**
 * Asserts that val is within the inclusive range [min, max].
 */
function assertBetween(val, min, max, message) {
  const isFiniteNum = typeof val === 'number' && Number.isFinite(val);
  const isMinFinite = typeof min === 'number' && Number.isFinite(min);
  const isMaxFinite = typeof max === 'number' && Number.isFinite(max);

  if (!isFiniteNum || !isMinFinite || !isMaxFinite) {
    throw new AssertionError({
      message: message || `assertBetween requires finite numbers, got val=${inspect(val)}, min=${inspect(min)}, max=${inspect(max)}`,
      actual: val,
      expected: `[${min}, ${max}]`,
      operator: 'assertBetween',
    }, assertBetween);
  }

  if (val < min || val > max) {
    const diff = formatRangeDiff(val, min, max);
    const defaultMsg = `Expected ${val} to be between ${min} and ${max} (inclusive).\n${diff}`;
    throw new AssertionError({
      message: message ? `${message}\n${defaultMsg}` : defaultMsg,
      actual: val,
      expected: `[${min}, ${max}]`,
      operator: 'assertBetween',
      diff,
    }, assertBetween);
  }
}

/**
 * Asserts strict boolean true (val === true).
 */
function assertTrue(val, message) {
  if (val !== true) {
    const typeDiff = formatTypeMismatch(val, true);
    let defaultMsg = `Expected true, got ${inspect(val)}`;
    if (typeDiff) defaultMsg += ` (${typeDiff})`;
    throw new AssertionError({
      message: message ? `${message}\n${defaultMsg}` : defaultMsg,
      actual: val,
      expected: true,
      operator: 'assertTrue',
      diff: typeDiff,
    }, assertTrue);
  }
}

/**
 * Asserts strict boolean false (val === false).
 */
function assertFalse(val, message) {
  if (val !== false) {
    const typeDiff = formatTypeMismatch(val, false);
    let defaultMsg = `Expected false, got ${inspect(val)}`;
    if (typeDiff) defaultMsg += ` (${typeDiff})`;
    throw new AssertionError({
      message: message ? `${message}\n${defaultMsg}` : defaultMsg,
      actual: val,
      expected: false,
      operator: 'assertFalse',
      diff: typeDiff,
    }, assertFalse);
  }
}

/**
 * Asserts strict null (val === null).
 */
function assertNull(val, message) {
  if (val !== null) {
    const typeDiff = formatTypeMismatch(val, null);
    let defaultMsg = `Expected null, got ${inspect(val)}`;
    if (typeDiff) defaultMsg += ` (${typeDiff})`;
    throw new AssertionError({
      message: message ? `${message}\n${defaultMsg}` : defaultMsg,
      actual: val,
      expected: null,
      operator: 'assertNull',
      diff: typeDiff,
    }, assertNull);
  }
}

/**
 * Asserts non-null (val !== null).
 */
function assertNotNull(val, message) {
  if (val === null) {
    const defaultMsg = `Expected not null, but got null`;
    throw new AssertionError({
      message: message ? `${message}\n${defaultMsg}` : defaultMsg,
      actual: null,
      expected: '(not null)',
      operator: 'assertNotNull',
    }, assertNotNull);
  }
}

/**
 * Asserts undefined (val === undefined).
 */
function assertUndefined(val, message) {
  if (val !== undefined) {
    const defaultMsg = `Expected undefined, got ${inspect(val)}`;
    throw new AssertionError({
      message: message ? `${message}\n${defaultMsg}` : defaultMsg,
      actual: val,
      expected: undefined,
      operator: 'assertUndefined',
    }, assertUndefined);
  }
}

/**
 * Asserts defined (val !== undefined).
 */
function assertDefined(val, message) {
  if (val === undefined) {
    const defaultMsg = `Expected defined value, got undefined`;
    throw new AssertionError({
      message: message ? `${message}\n${defaultMsg}` : defaultMsg,
      actual: undefined,
      expected: '(defined)',
      operator: 'assertDefined',
    }, assertDefined);
  }
}

/**
 * Asserts string matches regular expression.
 */
function assertMatches(string, regex, message) {
  if (typeof string !== 'string') {
    throw new AssertionError({
      message: `assertMatches expects string target, got ${inspect(string)}`,
      actual: string,
      expected: 'string',
      operator: 'assertMatches',
    }, assertMatches);
  }

  const re = typeof regex === 'string' ? new RegExp(regex) : regex;
  if (!re.test(string)) {
    const defaultMsg = `Expected string to match ${re}:\n  target: ${inspect(string)}`;
    throw new AssertionError({
      message: message ? `${message}\n${defaultMsg}` : defaultMsg,
      actual: string,
      expected: re,
      operator: 'assertMatches',
    }, assertMatches);
  }
}

/**
 * Asserts string does NOT match regular expression.
 */
function assertDoesNotMatch(string, regex, message) {
  if (typeof string !== 'string') {
    throw new AssertionError({
      message: `assertDoesNotMatch expects string target, got ${inspect(string)}`,
      actual: string,
      expected: 'string',
      operator: 'assertDoesNotMatch',
    }, assertDoesNotMatch);
  }

  const re = typeof regex === 'string' ? new RegExp(regex) : regex;
  if (re.test(string)) {
    const defaultMsg = `Expected string NOT to match ${re}, but it did:\n  target: ${inspect(string)}`;
    throw new AssertionError({
      message: message ? `${message}\n${defaultMsg}` : defaultMsg,
      actual: string,
      expected: `(not match) ${re}`,
      operator: 'assertDoesNotMatch',
    }, assertDoesNotMatch);
  }
}

/**
 * Asserts floating-point or numeric closeness within delta.
 */
function assertCloseTo(actual, expected, delta = 0.001, message) {
  const diff = Math.abs(actual - expected);
  if (diff > delta) {
    const defaultMsg = `Expected ${actual} to be within ${delta} of ${expected} (difference was ${diff})`;
    throw new AssertionError({
      message: message ? `${message}\n${defaultMsg}` : defaultMsg,
      actual,
      expected,
      operator: 'assertCloseTo',
      diff: `Difference ${diff} exceeds allowed delta ${delta}`,
    }, assertCloseTo);
  }
}

/**
 * Unconditionally throws an AssertionError.
 */
function fail(message = 'Test failed explicitly') {
  throw new AssertionError({
    message,
    actual: false,
    expected: true,
    operator: 'fail',
  }, fail);
}

// ─── Module Exports ─────────────────────────────────────────────────────────

const assertSuite = {
  assert,
  assertEquals,
  assertNotEquals,
  assertDeepEquals,
  assertNotDeepEquals,
  assertThrows,
  assertDoesNotThrow,
  assertRejects: assertThrows,
  assertDoesNotReject: assertDoesNotThrow,
  assertContains,
  assertNotContains,
  assertBetween,
  assertTrue,
  assertFalse,
  assertNull,
  assertNotNull,
  assertUndefined,
  assertDefined,
  assertMatches,
  assertDoesNotMatch,
  assertCloseTo,
  fail,
  AssertionError,
  inspect,
};

// CommonJS export
module.exports = assertSuite;

// Browser fallback
if (typeof window !== 'undefined') {
  window.assert = assertSuite;
}
