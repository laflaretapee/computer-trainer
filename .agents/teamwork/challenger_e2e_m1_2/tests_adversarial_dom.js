/**
 * tests_adversarial_dom.js
 * Adversarial stress tests for tests/helpers/dom_env.js
 * Authored by Challenger 2 (E2E-M1)
 */

'use strict';

const path = require('node:path');
const domHelper = require(path.resolve(__dirname, '../../../tests/helpers/dom_env.js'));

const {
  setupBrowserEnv,
  teardownBrowserEnv,
  Node,
  Element,
  Document,
  TextNode,
  DOMTokenList,
  MockEvent,
  MockMouseEvent,
  MockKeyboardEvent,
  MockDragEvent,
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
  console.log('=== Starting Adversarial Stress Tests: dom_env.js ===\n');

  const suite = [
    // ── 1. Nested Event Propagation & Stop Propagation ──────────────────────────
    recordTest('Event Bubbling: 4-level nested hierarchy propagates child -> parent -> doc -> window', () => {
      const env = setupBrowserEnv({ html: '<div id="grandparent"><div id="parent"><button id="child">Click</button></div></div>' });
      try {
        const order = [];
        const btn = env.document.getElementById('child');
        const parent = env.document.getElementById('parent');
        const grandparent = env.document.getElementById('grandparent');
        const doc = env.document;
        const win = env.window;

        btn.addEventListener('click', () => order.push('btn'));
        parent.addEventListener('click', () => order.push('parent'));
        grandparent.addEventListener('click', () => order.push('grandparent'));
        doc.addEventListener('click', () => order.push('doc'));
        win.addEventListener('click', () => order.push('win'));

        env.dispatchClick(btn);

        const expected = ['btn', 'parent', 'grandparent', 'doc', 'win'];
        if (order.join(',') !== expected.join(',')) {
          throw new Error(`Expected propagation order ${expected.join(',')}, got: ${order.join(',')}`);
        }
      } finally {
        env.teardown();
      }
    }),

    recordTest('Event Bubbling: stopPropagation() halts bubbling to ancestors', () => {
      const env = setupBrowserEnv({ html: '<div id="parent"><button id="child">Click</button></div>' });
      try {
        const order = [];
        const btn = env.document.getElementById('child');
        const parent = env.document.getElementById('parent');

        btn.addEventListener('click', (e) => {
          order.push('btn');
          e.stopPropagation();
        });
        parent.addEventListener('click', () => order.push('parent'));

        env.dispatchClick(btn);

        if (order.length !== 1 || order[0] !== 'btn') {
          throw new Error(`Bubbling was not stopped: ${order.join(',')}`);
        }
      } finally {
        env.teardown();
      }
    }),

    recordTest('Adversarial Event: Multiple listeners on same node when stopPropagation() called', () => {
      const env = setupBrowserEnv({ html: '<button id="btn">Click</button>' });
      try {
        const order = [];
        const btn = env.document.getElementById('btn');

        btn.addEventListener('click', (e) => {
          order.push('listener-1');
          e.stopPropagation(); // Standard W3C DOM: stopPropagation stops bubbling to parent, NOT other listeners on SAME element!
        });

        btn.addEventListener('click', () => {
          order.push('listener-2');
        });

        env.dispatchClick(btn);

        // Standard W3C behavior: listener-2 SHOULD execute.
        // If dom_env stops on _propagationStopped within the same element's listeners loop, listener-2 is missed.
        if (!order.includes('listener-2')) {
          throw new Error(`W3C Inconformance: stopPropagation() suppressed subsequent listener on same element. Order was: [${order.join(', ')}]`);
        }
      } finally {
        env.teardown();
      }
    }),

    recordTest('Adversarial Event: stopImmediatePropagation() method presence and execution', () => {
      const env = setupBrowserEnv({ html: '<button id="btn">Click</button>' });
      try {
        const order = [];
        const btn = env.document.getElementById('btn');

        btn.addEventListener('click', (e) => {
          order.push('l1');
          if (typeof e.stopImmediatePropagation !== 'function') {
            throw new Error('stopImmediatePropagation is missing on MockEvent');
          }
          e.stopImmediatePropagation();
        });

        btn.addEventListener('click', () => {
          order.push('l2');
        });

        env.dispatchClick(btn);

        if (order.length !== 1 || order[0] !== 'l1') {
          throw new Error(`stopImmediatePropagation failed to halt subsequent listener: [${order.join(', ')}]`);
        }
      } finally {
        env.teardown();
      }
    }),

    // ── 2. Complex CSS Selectors ────────────────────────────────────────────────
    recordTest('CSS Selectors: Direct child combinator with attributes (div.card > span[data-role="btn"])', () => {
      const html = `
        <div class="card">
          <span data-role="btn" id="target">Button 1</span>
          <div>
            <span data-role="btn" id="nested">Button Nested</span>
          </div>
        </div>
      `;
      const env = setupBrowserEnv({ html });
      try {
        const target = env.document.querySelector('div.card > span[data-role="btn"]');
        if (!target || target.getAttribute('id') !== 'target') {
          throw new Error(`Expected #target, got: ${target ? target.outerHTML : 'null'}`);
        }

        const all = env.document.querySelectorAll('div.card > span[data-role="btn"]');
        if (all.length !== 1) {
          throw new Error(`Expected exactly 1 direct child, got ${all.length}`);
        }
      } finally {
        env.teardown();
      }
    }),

    recordTest('CSS Selectors: Comma list with different combinators', () => {
      const html = `
        <div class="container">
          <button class="btn-primary" id="b1">1</button>
          <a class="nav-link" id="a1">2</a>
          <span class="badge" id="s1">3</span>
        </div>
      `;
      const env = setupBrowserEnv({ html });
      try {
        const items = env.document.querySelectorAll('button.btn-primary, span.badge');
        if (items.length !== 2) {
          throw new Error(`Expected 2 items from comma selector, got ${items.length}`);
        }
        const ids = items.map(el => el.getAttribute('id')).sort();
        if (ids[0] !== 'b1' || ids[1] !== 's1') {
          throw new Error(`Unexpected matched elements: ${ids.join(',')}`);
        }
      } finally {
        env.teardown();
      }
    }),

    recordTest('CSS Selectors: Deep descendant queries (div main section article p.lead span)', () => {
      const html = `
        <div>
          <main>
            <section>
              <article>
                <p class="lead"><span id="deep-leaf">Deep</span></p>
              </article>
            </section>
          </main>
        </div>
      `;
      const env = setupBrowserEnv({ html });
      try {
        const el = env.document.querySelector('div main section article p.lead span');
        if (!el || el.getAttribute('id') !== 'deep-leaf') {
          throw new Error(`Failed to find deep leaf element`);
        }
      } finally {
        env.teardown();
      }
    }),

    recordTest('CSS Selectors: Pseudo-class :not(...) support check', () => {
      const html = `
        <div id="wrapper">
          <button class="action-btn" id="b1">Active</button>
          <button class="action-btn disabled" id="b2">Disabled</button>
        </div>
      `;
      const env = setupBrowserEnv({ html });
      try {
        const match = env.document.querySelectorAll('button:not(.disabled)');
        const matchedIds = match.map(el => el.getAttribute('id'));
        if (match.length !== 1 || match[0].getAttribute('id') !== 'b1') {
          throw new Error(`Inverted/unsupported :not selector: matched ${JSON.stringify(matchedIds)} instead of ["b1"]`);
        }
      } finally {
        env.teardown();
      }
    }),

    // ── 3. Dataset Conversion with Multiple Hyphens ─────────────────────────────
    recordTest('Dataset: Multi-hyphen attribute data-student-first-name -> dataset.studentFirstName', () => {
      const html = '<div id="item" data-student-first-name="Александр" data-test-max-score="100"></div>';
      const env = setupBrowserEnv({ html });
      try {
        const item = env.document.getElementById('item');
        if (item.dataset.studentFirstName !== 'Александр') {
          throw new Error(`dataset.studentFirstName was: "${item.dataset.studentFirstName}"`);
        }
        if (item.dataset.testMaxScore !== '100') {
          throw new Error(`dataset.testMaxScore was: "${item.dataset.testMaxScore}"`);
        }

        // Mutation via dataset setter
        item.dataset.studentFirstName = 'Михаил';
        if (item.getAttribute('data-student-first-name') !== 'Михаил') {
          throw new Error(`getAttribute after dataset setter was: "${item.getAttribute('data-student-first-name')}"`);
        }

        // Delete property via dataset
        delete item.dataset.studentFirstName;
        if (item.hasAttribute('data-student-first-name')) {
          throw new Error('Attribute data-student-first-name was not deleted via delete dataset.studentFirstName');
        }
      } finally {
        env.teardown();
      }
    }),

    recordTest('Dataset: Object.keys(element.dataset) enumeration', () => {
      const html = '<div id="item" class="card" data-lesson-id="7-2-2" data-module-name="typing"></div>';
      const env = setupBrowserEnv({ html });
      try {
        const item = env.document.getElementById('item');
        const keys = Object.keys(item.dataset);
        // Standard DOM behavior: Object.keys(dataset) should return ['lessonId', 'moduleName']
        // It must NOT contain 'class' or raw 'data-*' strings!
        if (keys.includes('class')) {
          throw new Error(`dataset leaked non-data attribute "class": keys=${JSON.stringify(keys)}`);
        }
        if (!keys.includes('lessonId') || !keys.includes('moduleName')) {
          throw new Error(`dataset keys missing camelCase names: keys=${JSON.stringify(keys)}`);
        }
      } finally {
        env.teardown();
      }
    }),

    // ── 4. localStorage Proxy Edge Cases ────────────────────────────────────────
    recordTest('localStorage: JSON array serialization (sync_queue), iteration, and removal', () => {
      const env = setupBrowserEnv();
      try {
        const queue = [
          { studentId: '7a-01', task: 'typing', score: 98, timestamp: 1710000000 },
          { studentId: '7a-02', task: 'mouse', score: 100, timestamp: 1710000050 },
        ];

        // Direct property indexing write (Requirement F20)
        env.localStorage['sync_queue'] = JSON.stringify(queue);
        if (!('sync_queue' in env.localStorage)) {
          throw new Error('"sync_queue" not detected with "in" operator');
        }

        // Method call read
        const readItem = env.localStorage.getItem('sync_queue');
        const parsed = JSON.parse(readItem);
        if (parsed.length !== 2 || parsed[0].studentId !== '7a-01') {
          throw new Error('Corrupted JSON data in getItem');
        }

        // Property indexing read
        const readProp = JSON.parse(env.localStorage.sync_queue);
        if (readProp[1].score !== 100) {
          throw new Error('Corrupted JSON data in direct property access');
        }

        // Object.keys iteration
        env.localStorage.setItem('another_key', 'val');
        const keys = Object.keys(env.localStorage);
        if (!keys.includes('sync_queue') || !keys.includes('another_key')) {
          throw new Error(`Object.keys(localStorage) missing expected keys: ${JSON.stringify(keys)}`);
        }

        // Delete operator
        delete env.localStorage['sync_queue'];
        if (env.localStorage.getItem('sync_queue') !== null) {
          throw new Error('delete localStorage[key] failed to remove item');
        }

        // Clear
        env.localStorage.clear();
        if (env.localStorage.length !== 0) {
          throw new Error(`localStorage.clear() did not empty store (length=${env.localStorage.length})`);
        }
      } finally {
        env.teardown();
      }
    }),

    recordTest('localStorage: Collision with built-in Storage method names', () => {
      const env = setupBrowserEnv();
      try {
        // Setting key "clear" or "getItem" via property access
        env.localStorage['clear'] = 'clearValue';
        // Can clear still be called as a function?
        if (typeof env.localStorage.clear !== 'function') {
          throw new Error(`Collision! localStorage['clear'] overwrote method with: ${typeof env.localStorage.clear}`);
        }
      } finally {
        env.teardown();
      }
    }),

    // ── 5. Rapid setOnline(false) / setOnline(true) Concurrency ─────────────────
    recordTest('Online / Fetch Concurrency: Rapid toggles and 50 parallel fetches', async () => {
      const env = setupBrowserEnv({ online: true });
      try {
        let onlineEvents = 0;
        let offlineEvents = 0;
        env.window.addEventListener('online', () => onlineEvents++);
        env.window.addEventListener('offline', () => offlineEvents++);

        const fetchPromises = [];
        for (let i = 0; i < 50; i++) {
          if (i % 5 === 0) {
            env.setOnline(false);
          } else if (i % 5 === 2) {
            env.setOnline(true);
          }

          const p = env.window.fetch(`/api/sync/${i}`, {
            method: 'POST',
            body: JSON.stringify({ index: i }),
          }).then(
            res => ({ index: i, success: true, status: res.status }),
            err => ({ index: i, success: false, error: err.message })
          );
          fetchPromises.push(p);
        }

        const results = await Promise.all(fetchPromises);
        if (results.length !== 50) {
          throw new Error(`Expected 50 results, got ${results.length}`);
        }

        if (env.window.__fetchCalls.length !== 50) {
          throw new Error(`Expected 50 __fetchCalls recorded, got ${env.window.__fetchCalls.length}`);
        }

        const failedFetches = results.filter(r => !r.success);
        const passedFetches = results.filter(r => r.success);

        if (failedFetches.length === 0 || passedFetches.length === 0) {
          throw new Error(`Expected mixed results from online/offline flipping, got passed=${passedFetches.length}, failed=${failedFetches.length}`);
        }

        for (const ff of failedFetches) {
          if (!ff.error.includes('Network is offline')) {
            throw new Error(`Unexpected fetch error message: ${ff.error}`);
          }
        }
      } finally {
        env.teardown();
      }
    }),
  ];

  for (const testCase of suite) {
    await testCase();
  }

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  console.log(`\n=== DOM Stress Results: ${passed} passed, ${failed} failed (${results.length} total) ===\n`);

  return { passed, failed, total: results.length, results };
}

if (require.main === module) {
  runAll().catch(err => {
    console.error('Fatal runner error:', err);
    process.exit(1);
  });
}

module.exports = { runAll };
