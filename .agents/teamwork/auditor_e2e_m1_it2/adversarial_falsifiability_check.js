'use strict';
/**
 * adversarial_falsifiability_check.js
 * Independent Auditor Forensic Falsifiability & Integrity Stress Probe.
 */

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const assert = require('../../../tests/helpers/assert');
const { setupBrowserEnv } = require('../../../tests/helpers/dom_env');
const { runWithTimeout, normalizeError } = require('../../../tests/runner');

let passCount = 0;
let failCount = 0;
const results = [];

function check(name, fn) {
  try {
    fn();
    passCount++;
    results.push({ name, status: 'PASS' });
    console.log(`  [✔ PASS] ${name}`);
  } catch (err) {
    failCount++;
    results.push({ name, status: 'FAIL', error: err.message });
    console.error(`  [✖ FAIL] ${name}: ${err.message}`);
  }
}

async function asyncCheck(name, fn) {
  try {
    await fn();
    passCount++;
    results.push({ name, status: 'PASS' });
    console.log(`  [✔ PASS] ${name}`);
  } catch (err) {
    failCount++;
    results.push({ name, status: 'FAIL', error: err.message });
    console.error(`  [✖ FAIL] ${name}: ${err.message}`);
  }
}

async function runAllChecks() {
  console.log('================================================================');
  console.log('FORENSIC AUDITOR INDEPENDENT FALSIFIABILITY & STRESS PROBE');
  console.log('================================================================\n');

  // ─── 1. Assertions are genuinely falsifiable ────────────────────────────────
  console.log('--- 1. ASSERTION FALSIFIABILITY PROBES ---');

  check('assert() throws AssertionError on false/0/""/null/undefined/NaN', () => {
    let caught = 0;
    const falsyValues = [false, 0, '', null, undefined, NaN];
    for (const val of falsyValues) {
      try {
        assert.assert(val, 'Should fail');
      } catch (e) {
        if (e.name === 'AssertionError') caught++;
      }
    }
    if (caught !== falsyValues.length) {
      throw new Error(`Expected ${falsyValues.length} caught AssertionErrors, got ${caught}`);
    }
  });

  check('assertEquals() detects differences in primitives, types, and strings', () => {
    let caught = 0;
    const testCases = [
      [1, 2],
      ['a', 'b'],
      [true, false],
      [1, '1'],
      [null, undefined],
      ['Тест', 'Tест'], // Cyrillic vs Latin T homoglyph
    ];
    for (const [a, b] of testCases) {
      try {
        assert.assertEquals(a, b);
      } catch (e) {
        if (e.name === 'AssertionError') caught++;
      }
    }
    if (caught !== testCases.length) {
      throw new Error(`Expected ${testCases.length} caught AssertionErrors, got ${caught}`);
    }
  });

  check('assertDeepEquals() throws on mismatched objects and arrays', () => {
    let caught = 0;
    const pairs = [
      [{ a: 1 }, { a: 2 }],
      [{ a: [1, 2] }, { a: [1, 3] }],
      [[1, 2, 3], [1, 2]],
      [{ a: 1, b: 2 }, { a: 1 }],
    ];
    for (const [a, b] of pairs) {
      try {
        assert.assertDeepEquals(a, b);
      } catch (e) {
        if (e.name === 'AssertionError') caught++;
      }
    }
    if (caught !== pairs.length) {
      throw new Error(`Expected ${pairs.length} caught AssertionErrors, got ${caught}`);
    }
  });

  check('assertThrows() fails if function does not throw', () => {
    let caught = false;
    try {
      assert.assertThrows(() => { /* does not throw */ });
    } catch (e) {
      if (e.name === 'AssertionError') caught = true;
    }
    if (!caught) throw new Error('assertThrows failed to throw when function did not throw');
  });

  // ─── 2. DOM Event Propagation & StopPropagation / StopImmediate ─────────────
  console.log('\n--- 2. DOM EVENT PROPAGATION W3C CONFORMANCE PROBES ---');

  check('stopPropagation allows subsequent listeners on SAME node, halts parent', () => {
    const env = setupBrowserEnv();
    const parent = env.document.createElement('div');
    const child = env.document.createElement('button');
    parent.appendChild(child);

    const log = [];
    child.addEventListener('click', (e) => {
      log.push('child_l1');
      e.stopPropagation();
    });
    child.addEventListener('click', (e) => {
      log.push('child_l2');
    });
    parent.addEventListener('click', () => {
      log.push('parent');
    });

    env.dispatchClick(child);
    env.teardown();

    if (log.join(',') !== 'child_l1,child_l2') {
      throw new Error(`Expected child_l1,child_l2 but got ${log.join(',')}`);
    }
  });

  check('stopImmediatePropagation halts subsequent listeners on SAME node AND parent', () => {
    const env = setupBrowserEnv();
    const parent = env.document.createElement('div');
    const child = env.document.createElement('button');
    parent.appendChild(child);

    const log = [];
    child.addEventListener('click', (e) => {
      log.push('child_l1');
      e.stopImmediatePropagation();
    });
    child.addEventListener('click', (e) => {
      log.push('child_l2');
    });
    parent.addEventListener('click', () => {
      log.push('parent');
    });

    env.dispatchClick(child);
    env.teardown();

    if (log.join(',') !== 'child_l1') {
      throw new Error(`Expected child_l1 but got ${log.join(',')}`);
    }
  });

  // ─── 3. CSS Selector Engine :not(...) Inversion & Pseudo-classes ─────────────
  console.log('\n--- 3. CSS SELECTOR :not(...) & PSEUDO-CLASS PROBES ---');

  check(':not(...) selector inverts conditions accurately on multi-element collections', () => {
    const env = setupBrowserEnv();
    const container = env.document.createElement('div');
    container.innerHTML = `
      <button id="btn1" class="btn primary active">B1</button>
      <button id="btn2" class="btn primary disabled" disabled>B2</button>
      <button id="btn3" class="btn secondary">B3</button>
      <a id="link1" class="btn primary">L1</a>
    `;

    const nonDisabled = container.querySelectorAll('button:not(.disabled)');
    const nonDisabledIds = nonDisabled.map(el => el.id).sort();
    if (nonDisabledIds.join(',') !== 'btn1,btn3') {
      throw new Error(`Expected btn1,btn3 for button:not(.disabled) but got ${nonDisabledIds.join(',')}`);
    }

    const nonPrimary = container.querySelectorAll('.btn:not(.primary)');
    const nonPrimaryIds = nonPrimary.map(el => el.id);
    if (nonPrimaryIds.join(',') !== 'btn3') {
      throw new Error(`Expected btn3 for .btn:not(.primary) but got ${nonPrimaryIds.join(',')}`);
    }

    const enabledButtons = container.querySelectorAll('button:enabled');
    const enabledIds = enabledButtons.map(el => el.id).sort();
    if (enabledIds.join(',') !== 'btn1,btn3') {
      throw new Error(`Expected btn1,btn3 for button:enabled but got ${enabledIds.join(',')}`);
    }

    const disabledButtons = container.querySelectorAll('button:disabled');
    const disabledIds = disabledButtons.map(el => el.id);
    if (disabledIds.join(',') !== 'btn2') {
      throw new Error(`Expected btn2 for button:disabled but got ${disabledIds.join(',')}`);
    }

    env.teardown();
  });

  // ─── 4. Dataset Proxy Isolation ─────────────────────────────────────────────
  console.log('\n--- 4. DATASET PROXY ISOLATION PROBES ---');

  check('Object.keys(element.dataset) exposes ONLY camelCased data attributes', () => {
    const env = setupBrowserEnv();
    const el = env.document.createElement('div');
    el.id = 'test-id';
    el.className = 'class1 class2';
    el.setAttribute('title', 'sample title');
    el.setAttribute('tabindex', '0');
    el.setAttribute('data-target-module', 'typing');
    el.setAttribute('data-user-level', '5');
    el.setAttribute('data-has-passed', 'true');

    const keys = Object.keys(el.dataset);
    env.teardown();

    // Check for leak of non-data attributes
    for (const nonData of ['id', 'className', 'class', 'title', 'tabindex']) {
      if (keys.includes(nonData)) {
        throw new Error(`Dataset leaked non-data property "${nonData}"`);
      }
    }

    // Check camelCased data keys
    const expected = ['targetModule', 'userLevel', 'hasPassed'];
    for (const exp of expected) {
      if (!keys.includes(exp)) {
        throw new Error(`Dataset missing expected key "${exp}"`);
      }
    }
    if (keys.length !== 3) {
      throw new Error(`Expected exactly 3 keys in dataset, got ${keys.length}: ${JSON.stringify(keys)}`);
    }
  });

  // ─── 5. Storage Proxy Built-in Guarding ──────────────────────────────────────
  console.log('\n--- 5. STORAGE PROXY BUILT-IN GUARDING PROBES ---');

  check('localStorage built-in methods remain callable after direct assignments', () => {
    const env = setupBrowserEnv();
    const ls = env.localStorage;

    // Overwrite attempts
    ls['clear'] = 'fakeClear';
    ls['getItem'] = 'fakeGetItem';
    ls['setItem'] = 'fakeSetItem';
    ls['removeItem'] = 'fakeRemoveItem';
    ls['length'] = '999';

    if (typeof ls.clear !== 'function') throw new Error('localStorage.clear was overwritten!');
    if (typeof ls.getItem !== 'function') throw new Error('localStorage.getItem was overwritten!');
    if (typeof ls.setItem !== 'function') throw new Error('localStorage.setItem was overwritten!');
    if (typeof ls.removeItem !== 'function') throw new Error('localStorage.removeItem was overwritten!');

    // Test values stored inside
    if (ls.getItem('clear') !== 'fakeClear') throw new Error('Failed to retrieve clear key');
    if (ls.getItem('getItem') !== 'fakeGetItem') throw new Error('Failed to retrieve getItem key');

    // Test clear works
    ls.clear();
    if (ls.length !== 0) throw new Error(`localStorage.length not 0 after clear: ${ls.length}`);
    if (ls.getItem('clear') !== null) throw new Error('clear key still present after clear()');

    env.teardown();
  });

  // ─── 6. Error Normalization & Watchdog Timeout ──────────────────────────────
  console.log('\n--- 6. ERROR NORMALIZATION & WATCHDOG PROBES ---');

  check('normalizeError converts primitives into safe Error objects', () => {
    const errNull = normalizeError(null);
    if (errNull.name !== 'Error' || errNull.message !== 'null') throw new Error('null normalization failed');

    const errUndef = normalizeError(undefined);
    if (errUndef.name !== 'Error' || errUndef.message !== 'undefined') throw new Error('undefined normalization failed');

    const errStr = normalizeError('custom error msg');
    if (errStr.name !== 'Error' || errStr.message !== 'custom error msg') throw new Error('string normalization failed');

    const errNum = normalizeError(500);
    if (errNum.name !== 'Error' || errNum.message !== '500') throw new Error('number normalization failed');

    const realErr = new RangeError('out of bounds');
    const normReal = normalizeError(realErr);
    if (normReal !== realErr) throw new Error('real error should be returned intact');
  });

  await asyncCheck('runWithTimeout rejects hung async functions', async () => {
    let rejected = false;
    try {
      await runWithTimeout(() => new Promise(() => {}), 40);
    } catch (e) {
      rejected = true;
      if (!e.message.includes('Test timed out after 40ms')) {
        throw new Error(`Unexpected error message: ${e.message}`);
      }
    }
    if (!rejected) throw new Error('runWithTimeout failed to reject hanging promise');
  });

  // ─── 7. Runner Process Exit Codes Verification ──────────────────────────────
  console.log('\n--- 7. RUNNER CLI PROCESS EXIT CODE PROBES ---');

  check('Runner exits with code 0 on passing test file', () => {
    const res = spawnSync(process.execPath, ['tests/runner.js', 'tests/test_infra.test.js'], {
      cwd: path.resolve(__dirname, '../../../'),
      encoding: 'utf8',
    });
    if (res.status !== 0) {
      throw new Error(`Expected exit code 0, got ${res.status}. Output: ${res.stdout}\n${res.stderr}`);
    }
  });

  check('Runner exits with code 1 on non-existent file', () => {
    const res = spawnSync(process.execPath, ['tests/runner.js', 'tests/non_existent.test.js'], {
      cwd: path.resolve(__dirname, '../../../'),
      encoding: 'utf8',
    });
    if (res.status !== 1) {
      throw new Error(`Expected exit code 1, got ${res.status}`);
    }
  });

  check('Runner exits with code 1 on invalid tier', () => {
    const res = spawnSync(process.execPath, ['tests/runner.js', '--tier', 'invalid_tier_xyz'], {
      cwd: path.resolve(__dirname, '../../../'),
      encoding: 'utf8',
    });
    if (res.status !== 1) {
      throw new Error(`Expected exit code 1, got ${res.status}`);
    }
  });

  // Test failure detection with a temporary failing fixture
  check('Runner detects failing test and strictly exits with code 1', () => {
    const tempFixturePath = path.resolve(__dirname, 'temp_failing_fixture.test.js');
    fs.writeFileSync(tempFixturePath, `
      describe('Temp Failing Suite', () => {
        test('failing test assertion', () => {
          const assert = require('../../../tests/helpers/assert');
          assert.assertEquals(1, 2, 'Deliberate failure for auditor verification');
        });
      });
    `);

    try {
      const res = spawnSync(process.execPath, ['tests/runner.js', tempFixturePath], {
        cwd: path.resolve(__dirname, '../../../'),
        encoding: 'utf8',
      });
      if (res.status !== 1) {
        throw new Error(`Expected exit code 1 on failing assertion, got ${res.status}`);
      }
      if (!res.stdout.includes('FAILURES SUMMARY') || !res.stdout.includes('Deliberate failure for auditor verification')) {
        throw new Error(`Runner failed to print failure summary for deliberate failure. Output: ${res.stdout}`);
      }
    } finally {
      if (fs.existsSync(tempFixturePath)) {
        fs.unlinkSync(tempFixturePath);
      }
    }
  });

  // Test hanging async test in separate process
  check('Runner process aborts hanging test and strictly exits with code 1', () => {
    const tempHangPath = path.resolve(__dirname, 'temp_hang_fixture.test.js');
    fs.writeFileSync(tempHangPath, `
      describe('Temp Hanging Suite', () => {
        test('hanging test', async () => {
          return new Promise(() => {});
        });
      });
    `);

    try {
      const start = Date.now();
      const res = spawnSync(process.execPath, ['tests/runner.js', '--timeout', '200', tempHangPath], {
        cwd: path.resolve(__dirname, '../../../'),
        encoding: 'utf8',
      });
      const dur = Date.now() - start;
      if (res.status !== 1) {
        throw new Error(`Expected exit code 1 on hanging test, got ${res.status}`);
      }
      if (dur > 2000) {
        throw new Error(`Hanging test took too long (${dur}ms), timeout watchdog failed`);
      }
    } finally {
      if (fs.existsSync(tempHangPath)) {
        fs.unlinkSync(tempHangPath);
      }
    }
  });

  console.log('\n================================================================');
  console.log(`TOTAL CHECKS: ${passCount + failCount}`);
  console.log(`PASSED:       ${passCount}`);
  console.log(`FAILED:       ${failCount}`);
  console.log('================================================================');

  if (failCount > 0) {
    process.exit(1);
  }
}

runAllChecks().catch(err => {
  console.error('Fatal probe execution error:', err);
  process.exit(1);
});
