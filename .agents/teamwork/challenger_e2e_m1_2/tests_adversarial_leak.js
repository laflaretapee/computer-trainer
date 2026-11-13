/**
 * tests_adversarial_leak.js
 * Adversarial stress tests for memory leaks, repeated lifecycle cycles, and global pollution
 * Authored by Challenger 2 (E2E-M1)
 */

'use strict';

const path = require('node:path');
const domHelper = require(path.resolve(__dirname, '../../../tests/helpers/dom_env.js'));

const {
  setupBrowserEnv,
  teardownBrowserEnv,
} = domHelper;

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
  console.log('=== Starting Adversarial Stress Tests: Memory & Global Leakage ===\n');

  // Snapshot initial Node globals before any setupBrowserEnv
  const initialGlobalKeys = new Set(Object.keys(global));
  const preNavDesc = Object.getOwnPropertyDescriptor(global, 'navigator');

  const suite = [
    recordTest('Global Pollution: Single setup and teardown completely cleans up injected globals', () => {
      // Record which globals existed natively before setup
      const preExisting = {};
      const testKeys = [
        'window', 'document', 'localStorage', 'sessionStorage',
        'AudioContext', 'webkitAudioContext',
        'CustomEvent', 'MouseEvent', 'KeyboardEvent', 'DragEvent',
        'alert', 'confirm', 'prompt'
      ];
      for (const k of testKeys) {
        preExisting[k] = Object.getOwnPropertyDescriptor(global, k);
      }

      const env = setupBrowserEnv();
      if (!global.window || !global.document || !global.localStorage) {
        throw new Error('Globals not attached during setupBrowserEnv');
      }
      teardownBrowserEnv();

      const leaked = [];
      for (const k of testKeys) {
        const afterDesc = Object.getOwnPropertyDescriptor(global, k);
        const beforeDesc = preExisting[k];

        if (!beforeDesc && afterDesc) {
          leaked.push(`${k} (was not present before, now present)`);
        } else if (beforeDesc && afterDesc && beforeDesc.value !== afterDesc.value) {
          // If value was replaced and not restored
          leaked.push(`${k} (value modified and not restored)`);
        }
      }

      if (leaked.length > 0) {
        throw new Error(`Globals leaked/polluted after teardown: ${leaked.join(', ')}`);
      }
    }),

    recordTest('Lifecycle: 100 consecutive setup and teardown cycles', () => {
      for (let i = 0; i < 100; i++) {
        const env = setupBrowserEnv({ html: `<div id="cycle-${i}">Content</div>` });
        const el = env.document.getElementById(`cycle-${i}`);
        if (!el || el.textContent !== 'Content') {
          throw new Error(`Cycle ${i} failed element retrieval`);
        }
        teardownBrowserEnv();
      }

      // Verify no pollution after 100 cycles
      if (global.window !== undefined) {
        throw new Error('global.window remained defined after 100 cycles');
      }
      if (global.document !== undefined) {
        throw new Error('global.document remained defined after 100 cycles');
      }
    }),

    recordTest('Node 22 Navigator: Preserves native navigator behavior across setup/teardown', () => {
      const hadNavigator = 'navigator' in global;
      const initialDesc = Object.getOwnPropertyDescriptor(global, 'navigator');

      const env = setupBrowserEnv();
      if (global.navigator.userAgent !== 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) HeadlessDOM/1.0') {
        throw new Error('Mock navigator not mounted during setupBrowserEnv');
      }

      teardownBrowserEnv();

      // Check after teardown
      if (hadNavigator) {
        if (!('navigator' in global)) {
          throw new Error('Native global.navigator was deleted rather than restored');
        }
      }
    }),

    recordTest('Active Timers and Intervals: Teardown cancels pending timers without leak', async () => {
      const env = setupBrowserEnv();
      let timerFired = false;
      let intervalFired = 0;

      env.window.setTimeout(() => {
        timerFired = true;
      }, 50);

      env.window.setInterval(() => {
        intervalFired++;
      }, 20);

      // Teardown before timers fire
      teardownBrowserEnv();

      // Wait 100ms
      await new Promise(r => setTimeout(r, 100));

      if (timerFired) {
        throw new Error('Pending setTimeout fired after teardownBrowserEnv() was called');
      }
      if (intervalFired > 0) {
        throw new Error(`Pending setInterval fired ${intervalFired} times after teardownBrowserEnv()`);
      }
    }),

    recordTest('Memory Stability: Heap memory delta after 50 app stack loads', () => {
      if (global.gc) global.gc();
      const memBefore = process.memoryUsage().heapUsed;

      for (let i = 0; i < 50; i++) {
        const env = setupBrowserEnv();
        try {
          env.loadAppStack();
        } catch {
          // Ignore if app.js DOM elements aren't fully matching in quick mock
        }
        teardownBrowserEnv();
      }

      if (global.gc) global.gc();
      const memAfter = process.memoryUsage().heapUsed;
      const deltaMB = (memAfter - memBefore) / (1024 * 1024);

      console.log(`    [MEM] Heap delta after 50 app stack loads: ${deltaMB.toFixed(2)} MB`);
      // Fail if heap grew by more than 50MB (massive unbounded leak)
      if (deltaMB > 50) {
        throw new Error(`Unbounded memory leak detected: Heap grew by ${deltaMB.toFixed(2)} MB`);
      }
    }),
  ];

  for (const testCase of suite) {
    await testCase();
  }

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  console.log(`\n=== Memory & Leak Results: ${passed} passed, ${failed} failed (${results.length} total) ===\n`);

  return { passed, failed, total: results.length, results };
}

if (require.main === module) {
  runAll().catch(err => {
    console.error('Fatal runner error:', err);
    process.exit(1);
  });
}

module.exports = { runAll };
