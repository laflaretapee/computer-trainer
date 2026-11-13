/**
 * tests_adversarial_assert.js
 * Adversarial stress tests for tests/helpers/assert.js
 * Authored by Challenger 2 (E2E-M1)
 */

'use strict';

const path = require('node:path');
const assertHelper = require(path.resolve(__dirname, '../../../tests/helpers/assert.js'));

const {
  assert,
  assertEquals,
  assertNotEquals,
  assertDeepEquals,
  assertNotDeepEquals,
  assertThrows,
  assertDoesNotThrow,
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
} = assertHelper;

const results = [];

function recordTest(name, fn) {
  return async () => {
    const start = Date.now();
    try {
      await fn();
      results.push({ name, passed: true, duration: Date.now() - start });
      console.log(`  [PASS] ${name} (${Date.now() - start}ms)`);
    } catch (err) {
      results.push({ name, passed: false, duration: Date.now() - start, error: err });
      console.error(`  [FAIL] ${name}: ${err.message}`);
    }
  };
}

async function runAll() {
  console.log('=== Starting Adversarial Stress Tests: assert.js ===\n');

  const suite = [
    // ── 1. assertDeepEquals Edge Cases ──────────────────────────────────────────
    recordTest('assertDeepEquals: Circular references in equal objects', () => {
      const a = { name: 'Alice' };
      a.self = a;
      const b = { name: 'Alice' };
      b.self = b;
      assertDeepEquals(a, b);
    }),

    recordTest('assertDeepEquals: Circular references in unequal objects throws AssertionError with diff', () => {
      const a = { name: 'Alice' };
      a.self = a;
      const b = { name: 'Bob' };
      b.self = b;
      let caught = false;
      try {
        assertDeepEquals(a, b);
      } catch (err) {
        caught = true;
        if (!(err instanceof AssertionError)) throw new Error('Expected AssertionError');
        if (!err.message.includes('Expected deep strict equality')) throw new Error('Missing diff heading');
      }
      if (!caught) throw new Error('Did not throw on unequal circular objects');
    }),

    recordTest('assertDeepEquals: Deep nested arrays (100 levels)', () => {
      let a = [1];
      let b = [1];
      for (let i = 0; i < 100; i++) {
        a = [a];
        b = [b];
      }
      assertDeepEquals(a, b);
    }),

    recordTest('assertDeepEquals: Deep nested arrays with difference at leaf throws', () => {
      let a = [1];
      let b = [2];
      for (let i = 0; i < 50; i++) {
        a = [a];
        b = [b];
      }
      let caught = false;
      try {
        assertDeepEquals(a, b);
      } catch (err) {
        caught = true;
        if (!(err instanceof AssertionError)) throw new Error('Expected AssertionError');
      }
      if (!caught) throw new Error('Failed to detect difference in 50-deep array');
    }),

    recordTest('assertDeepEquals: NaN in nested structures', () => {
      assertDeepEquals({ val: NaN, list: [1, NaN, 3] }, { val: NaN, list: [1, NaN, 3] });
    }),

    recordTest('assertDeepEquals: Symbol properties on objects', () => {
      const s1 = Symbol('symKey');
      const obj1 = { [s1]: 'val1', normal: 123 };
      const obj2 = { [s1]: 'val1', normal: 123 };
      assertDeepEquals(obj1, obj2);
    }),

    recordTest('assertDeepEquals: Distinct symbols with same description throw', () => {
      const s1 = Symbol('desc');
      const s2 = Symbol('desc');
      let caught = false;
      try {
        assertDeepEquals({ [s1]: 'test' }, { [s2]: 'test' });
      } catch (err) {
        caught = true;
        if (!(err instanceof AssertionError)) throw new Error('Expected AssertionError');
      }
      if (!caught) throw new Error('Failed to differentiate distinct Symbol properties');
    }),

    recordTest('assertDeepEquals: Date instances equality and inequality', () => {
      const d1 = new Date('2026-11-11T10:00:00Z');
      const d2 = new Date('2026-11-11T10:00:00Z');
      const d3 = new Date('2026-11-11T10:00:01Z');
      assertDeepEquals(d1, d2);
      let caught = false;
      try {
        assertDeepEquals(d1, d3);
      } catch {
        caught = true;
      }
      if (!caught) throw new Error('Failed to throw on differing Date instances');
    }),

    recordTest('assertDeepEquals: RegExp instances equality and inequality', () => {
      assertDeepEquals(/abc/gi, /abc/gi);
      let caught = false;
      try {
        assertDeepEquals(/abc/gi, /abc/g);
      } catch {
        caught = true;
      }
      if (!caught) throw new Error('Failed to throw on differing RegExp flags');
    }),

    recordTest('assertDeepEquals: Maps with complex keys and values', () => {
      const m1 = new Map([[ { k: 1 }, [10, 20] ]]);
      const m2 = new Map([[ { k: 1 }, [10, 20] ]]);
      assertDeepEquals(m1, m2);
    }),

    recordTest('assertDeepEquals: Sets with nested objects', () => {
      const s1 = new Set([{ id: 1 }, { id: 2 }]);
      const s2 = new Set([{ id: 1 }, { id: 2 }]);
      assertDeepEquals(s1, s2);
      const s3 = new Set([{ id: 1 }, { id: 3 }]);
      let caught = false;
      try {
        assertDeepEquals(s1, s3);
      } catch {
        caught = true;
      }
      if (!caught) throw new Error('Failed to throw on differing Sets');
    }),

    // ── 2. assertThrows Edge Cases ──────────────────────────────────────────────
    recordTest('assertThrows: Async function throwing after delay (awaiting)', async () => {
      const p = assertThrows(async () => {
        await new Promise(resolve => setTimeout(resolve, 15));
        throw new RangeError('Index out of range: 42');
      }, RangeError);
      const caughtErr = await p;
      if (!(caughtErr instanceof RangeError)) throw new Error('Returned error was not RangeError');
      if (!caughtErr.message.includes('Index out of range')) throw new Error('Wrong message in caught error');
    }),

    recordTest('assertThrows: Rejected Promise with string primitive (no Error instance)', async () => {
      const rejectedPromise = Promise.reject('NETWORK_DISCONNECTED_ERR');
      const err = await assertThrows(rejectedPromise, 'NETWORK_DISCONNECTED');
      if (err !== 'NETWORK_DISCONNECTED_ERR') throw new Error(`Unexpected caught value: ${err}`);
    }),

    recordTest('assertThrows: Rejected Promise with non-Error object', async () => {
      const nonErrorPayload = { code: 503, reason: 'Service Unavailable' };
      const p = Promise.reject(nonErrorPayload);
      const caught = await assertThrows(p, (e) => e.code === 503);
      if (caught.reason !== 'Service Unavailable') throw new Error('Custom predicate check failed');
    }),

    recordTest('assertThrows: Synchronous function returning non-Promise throws AssertionError', () => {
      let caught = false;
      try {
        assertThrows(() => 12345, Error);
      } catch (err) {
        caught = true;
        if (!(err instanceof AssertionError)) throw new Error('Expected AssertionError');
        if (!err.message.includes('Expected function to throw')) throw new Error('Unexpected message');
      }
      if (!caught) throw new Error('assertThrows did not throw when sync function returned a number');
    }),

    recordTest('assertThrows: Async function resolving instead of rejecting throws AssertionError', async () => {
      let caught = false;
      try {
        await assertThrows(async () => 'success_payload', Error);
      } catch (err) {
        caught = true;
        if (!(err instanceof AssertionError)) throw new Error('Expected AssertionError');
        if (!err.message.includes('Expected async function to reject')) throw new Error('Unexpected message');
      }
      if (!caught) throw new Error('assertThrows did not throw when async function resolved');
    }),

    recordTest('assertThrows: Throws when unexpected error type is thrown', () => {
      let caughtAssertion = false;
      try {
        assertThrows(() => {
          throw new TypeError('bad type');
        }, RangeError);
      } catch (err) {
        caughtAssertion = true;
        if (!(err instanceof AssertionError)) throw new Error('Expected AssertionError when unexpected error thrown');
        if (!err.message.includes('threw unexpected error')) throw new Error('Unexpected message');
      }
      if (!caughtAssertion) throw new Error('Failed to catch unexpected error mismatch');
    }),

    // ── 3. Cyrillic vs Latin Homoglyphs in assertEquals ─────────────────────────
    recordTest('assertEquals: Cyrillic Смирнов vs Latin Cмирнов divergence diff', () => {
      const cyrillicSmirnov = '\u0421\u043C\u0438\u0440\u043D\u043E\u0432'; // Смирнов (Cyrillic С = 1041 / U+0421)
      const latinSmirnov = 'C\u043C\u0438\u0440\u043D\u043E\u0432';          // Cмирнов (Latin C = 67 / U+0043)

      let caught = false;
      try {
        assertEquals(cyrillicSmirnov, latinSmirnov);
      } catch (err) {
        caught = true;
        if (!(err instanceof AssertionError)) throw new Error('Expected AssertionError');
        if (!err.diff) throw new Error('AssertionError missing diff field');
        if (!err.diff.includes('Character divergence at index 0:')) {
          throw new Error(`Diff did not specify index 0 divergence: ${err.diff}`);
        }
        if (!err.diff.includes('U+0421') || !err.diff.includes('U+0043')) {
          throw new Error(`Diff did not include expected hex Unicode codes: ${err.diff}`);
        }
      }
      if (!caught) throw new Error('Homoglyph strings wrongly evaluated as equal');
    }),

    recordTest('assertEquals: Embedded middle Cyrillic vs Latin char divergence (e.g. Иванов vs Иванoв with Latin o)', () => {
      const cyrillicIvanov = 'Иванов'; // all Cyrillic
      const mixedIvanov = 'Иван\u006Fв'; // Latin 'o' at index 4

      let caught = false;
      try {
        assertEquals(cyrillicIvanov, mixedIvanov);
      } catch (err) {
        caught = true;
        if (!err.diff.includes('Character divergence at index 4:')) {
          throw new Error(`Expected divergence at index 4, got: ${err.diff}`);
        }
        if (!err.diff.includes('U+043E') || !err.diff.includes('U+006F')) {
          throw new Error(`Expected U+043E and U+006F in diff, got: ${err.diff}`);
        }
      }
      if (!caught) throw new Error('Middle homoglyph divergence not detected');
    }),

    // ── 4. assertBetween Extreme Values ─────────────────────────────────────────
    recordTest('assertBetween: Valid boundaries with Number.MAX_SAFE_INTEGER', () => {
      assertBetween(Number.MAX_SAFE_INTEGER, 0, Number.MAX_SAFE_INTEGER);
      assertBetween(Number.MAX_SAFE_INTEGER - 1, 0, Number.MAX_SAFE_INTEGER);
    }),

    recordTest('assertBetween: Exceeding Number.MAX_SAFE_INTEGER throws AssertionError', () => {
      let caught = false;
      try {
        assertBetween(Number.MAX_SAFE_INTEGER, 0, Number.MAX_SAFE_INTEGER - 10);
      } catch (err) {
        caught = true;
        if (!(err instanceof AssertionError)) throw new Error('Expected AssertionError');
        if (!err.diff || !err.diff.includes('exceeds maximum')) {
          throw new Error(`Diff does not detail bounds violation: ${err.diff}`);
        }
      }
      if (!caught) throw new Error('Failed to throw when exceeding MAX_SAFE_INTEGER boundary');
    }),

    recordTest('assertBetween: Infinity as val throws AssertionError (requires finite numbers)', () => {
      let caught = false;
      try {
        assertBetween(Infinity, 0, 100);
      } catch (err) {
        caught = true;
        if (!(err instanceof AssertionError)) throw new Error('Expected AssertionError');
        if (!err.message.includes('assertBetween requires finite numbers')) {
          throw new Error(`Unexpected error message: ${err.message}`);
        }
      }
      if (!caught) throw new Error('Did not throw on Infinity value');
    }),

    recordTest('assertBetween: -Infinity as min throws AssertionError', () => {
      let caught = false;
      try {
        assertBetween(50, -Infinity, 100);
      } catch (err) {
        caught = true;
        if (!(err instanceof AssertionError)) throw new Error('Expected AssertionError');
        if (!err.message.includes('assertBetween requires finite numbers')) {
          throw new Error(`Unexpected error message: ${err.message}`);
        }
      }
      if (!caught) throw new Error('Did not throw on -Infinity boundary');
    }),

    recordTest('assertBetween: NaN as val throws AssertionError', () => {
      let caught = false;
      try {
        assertBetween(NaN, 0, 100);
      } catch (err) {
        caught = true;
        if (!(err instanceof AssertionError)) throw new Error('Expected AssertionError');
        if (!err.message.includes('assertBetween requires finite numbers')) {
          throw new Error(`Unexpected error message: ${err.message}`);
        }
      }
      if (!caught) throw new Error('Did not throw on NaN value');
    }),

    // ── 5. assertContains & assertMatches Edge Cases ────────────────────────────
    recordTest('assertContains: Empty string in empty string and needle check', () => {
      assertContains('hello world', '');
      assertContains('hello world', 'world');
      assertContains([1, 2, 3], 2);
      assertContains(new Set(['a', 'b']), 'a');
      assertContains(new Map([['key1', 'val1']]), 'key1');
      assertContains({ a: 1, b: 2 }, 'b');
    }),

    recordTest('assertMatches: Regex matching with flags and multiline', () => {
      assertMatches('FooBarBaz', /bar/i);
      assertMatches('line1\nline2', /^line2$/m);
      assertDoesNotMatch('FooBarBaz', /qux/);
    }),

    recordTest('assertCloseTo: Precision boundary near delta', () => {
      assertCloseTo(0.1 + 0.2, 0.3, 0.00000001);
      let caught = false;
      try {
        assertCloseTo(0.1 + 0.2, 0.35, 0.001);
      } catch {
        caught = true;
      }
      if (!caught) throw new Error('assertCloseTo did not fail when delta exceeded');
    }),
  ];

  for (const testCase of suite) {
    await testCase();
  }

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  console.log(`\n=== Assert Stress Results: ${passed} passed, ${failed} failed (${results.length} total) ===\n`);

  if (failed > 0) {
    process.exitCode = 1;
  }
  return { passed, failed, total: results.length, results };
}

if (require.main === module) {
  runAll().catch(err => {
    console.error('Fatal runner error:', err);
    process.exit(1);
  });
}

module.exports = { runAll };
