/**
 * tests/test_infra.test.js
 * Comprehensive smoke test suite verifying all assertion methods, diff formatting,
 * headless DOM environment, CSS selectors, event propagation, storage, audio/fetch mocks,
 * and SPA application stack loading.
 */

'use strict';

const assertHelper = require('./helpers/assert');
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
} = assertHelper;

const domEnv = require('./helpers/dom_env');
const {
  setupBrowserEnv,
  teardownBrowserEnv,
  MockEvent,
  MockMouseEvent,
  MockKeyboardEvent,
  MockDragEvent,
  MockDataTransfer,
} = domEnv;

const { runWithTimeout, normalizeError } = require('./runner');

// ─── SUITE 1: Assertion Library ──────────────────────────────────────────────

describe('Smoke: Assertion Suite (assert.js)', () => {

  describe('Core Truthiness & Equality', () => {
    test('assert() verifies truthy values and throws on falsy', () => {
      assert(true);
      assert(1);
      assert('hello');
      assert({});
      assert([]);

      assertThrows(() => assert(false), AssertionError);
      assertThrows(() => assert(0), AssertionError);
      assertThrows(() => assert(''), AssertionError);
      assertThrows(() => assert(null), AssertionError);
      assertThrows(() => assert(undefined), AssertionError);
    });

    test('assertEquals() strictly compares primitives and references', () => {
      assertEquals(42, 42);
      assertEquals('abc', 'abc');
      assertEquals(true, true);
      assertEquals(NaN, NaN); // special NaN handling

      const obj = { id: 1 };
      assertEquals(obj, obj);

      // Mismatches throw AssertionError
      assertThrows(() => assertEquals(1, 2), AssertionError);
      assertThrows(() => assertEquals('a', 'b'), AssertionError);
      assertThrows(() => assertEquals(true, false), AssertionError);
    });

    test('assertEquals() formats type discrepancies clearly', () => {
      let caughtErr = null;
      try {
        assertEquals(42, '42');
      } catch (err) {
        caughtErr = err;
      }
      assertNotNull(caughtErr);
      assertTrue(caughtErr instanceof AssertionError);
      assertContains(caughtErr.message, 'Type mismatch');
    });

    test('assertEquals() detects Cyrillic vs Latin homoglyph character divergence', () => {
      // '7-А' (Cyrillic U+0410, code 1040) vs '7-A' (Latin U+0041, code 65)
      const cyrillicClass = '7-А';
      const latinClass = '7-A';

      let caughtErr = null;
      try {
        assertEquals(cyrillicClass, latinClass);
      } catch (err) {
        caughtErr = err;
      }

      assertNotNull(caughtErr);
      assertTrue(caughtErr instanceof AssertionError);
      assertContains(caughtErr.message, 'Character divergence at index 2');
      assertContains(caughtErr.message, '1040');
      assertContains(caughtErr.message, '65');
    });

    test('assertEquals() formats numeric delta on failure', () => {
      let caughtErr = null;
      try {
        assertEquals(120, 100);
      } catch (err) {
        caughtErr = err;
      }
      assertNotNull(caughtErr);
      assertContains(caughtErr.message, 'Numeric delta: +20');
    });

    test('assertNotEquals() verifies strict inequality', () => {
      assertNotEquals(1, 2);
      assertNotEquals('hello', 'world');
      assertNotEquals(1, '1');
      assertNotEquals({}, {});

      assertThrows(() => assertNotEquals(42, 42), AssertionError);
      assertThrows(() => assertNotEquals('x', 'x'), AssertionError);
    });
  });

  describe('Deep Equality', () => {
    test('assertDeepEquals() handles nested structures, arrays, and primitives', () => {
      assertDeepEquals({ a: 1, b: [2, 3] }, { a: 1, b: [2, 3] });
      assertDeepEquals([1, { x: 'test' }], [1, { x: 'test' }]);

      assertThrows(() => {
        assertDeepEquals({ a: 1, b: [2, 3] }, { a: 1, b: [2, 4] });
      }, AssertionError);
    });

    test('assertNotDeepEquals() verifies differences in deep structures', () => {
      assertNotDeepEquals({ a: 1 }, { a: 2 });
      assertNotDeepEquals([1, 2], [1, 3]);

      assertThrows(() => {
        assertNotDeepEquals({ a: 1 }, { a: 1 });
      }, AssertionError);
    });
  });

  describe('Exceptions & Rejections (Polymorphic)', () => {
    test('assertThrows() handles synchronous functions with constructor or regex', () => {
      assertThrows(() => {
        throw new TypeError('Invalid type provided');
      }, TypeError);

      assertThrows(() => {
        throw new RangeError('Index out of bounds');
      }, /bounds/i);

      assertThrows(() => {
        throw new Error('Something broke');
      }, 'broke');

      // Fails when function doesn't throw
      assertThrows(() => {
        assertThrows(() => { /* does not throw */ });
      }, AssertionError);
    });

    test('assertThrows() handles asynchronous functions and Promise rejections', async () => {
      await assertThrows(async () => {
        throw new Error('Async network failure');
      }, /network/i);

      await assertThrows(
        Promise.reject(new RangeError('Async range violation')),
        RangeError
      );
    });

    test('assertDoesNotThrow() verifies functions execute cleanly', async () => {
      const syncResult = assertDoesNotThrow(() => 42);
      assertEquals(syncResult, 42);

      const asyncResult = await assertDoesNotThrow(async () => 'async success');
      assertEquals(asyncResult, 'async success');

      // Fails when function throws
      assertThrows(() => {
        assertDoesNotThrow(() => {
          throw new Error('Unexpected blowup');
        });
      }, AssertionError);
    });
  });

  describe('Collection Inclusions & Ranges', () => {
    test('assertContains() checks strings, arrays, Sets, Maps, and Objects', () => {
      // String
      assertContains('Информатика 7 класс', '7 класс');
      assertContains('Информатика 7 класс', /информатика/i);

      // Array
      assertContains(['7-А', '7-Б', '7-В'], '7-Б');
      assertContains([{ id: 1 }], { id: 1 }); // deep equality inside array

      // Set & Map
      const s = new Set(['cat', 'dog']);
      assertContains(s, 'cat');

      const m = new Map([['key1', 'val1']]);
      assertContains(m, 'key1');

      // Object
      assertContains({ speed: 120, accuracy: 98 }, 'speed');

      // Missing needle throws
      assertThrows(() => assertContains('hello', 'world'), AssertionError);
      assertThrows(() => assertContains([1, 2], 3), AssertionError);
    });

    test('assertNotContains() validates absence', () => {
      assertNotContains('hello world', 'goodbye');
      assertNotContains([1, 2, 3], 4);
      assertThrows(() => assertNotContains('hello world', 'world'), AssertionError);
    });

    test('assertBetween() checks inclusive numeric boundaries and deltas', () => {
      assertBetween(50, 0, 100);
      assertBetween(0, 0, 100);   // inclusive min
      assertBetween(100, 0, 100); // inclusive max

      assertThrows(() => assertBetween(-5, 0, 100), AssertionError);
      assertThrows(() => assertBetween(105, 0, 100), AssertionError);
    });
  });

  describe('Type-Specific Assertions', () => {
    test('assertTrue() and assertFalse() require strict booleans', () => {
      assertTrue(true);
      assertFalse(false);

      assertThrows(() => assertTrue(1), AssertionError);
      assertThrows(() => assertTrue('true'), AssertionError);
      assertThrows(() => assertFalse(0), AssertionError);
      assertThrows(() => assertFalse(null), AssertionError);
    });

    test('assertNull() and assertNotNull() differentiate null from undefined', () => {
      assertNull(null);
      assertNotNull(undefined);
      assertNotNull(0);
      assertNotNull('');

      assertThrows(() => assertNull(undefined), AssertionError);
      assertThrows(() => assertNotNull(null), AssertionError);
    });

    test('assertUndefined() and assertDefined() check undefined', () => {
      assertUndefined(undefined);
      assertDefined(null);
      assertDefined(0);
      assertDefined('');

      assertThrows(() => assertUndefined(null), AssertionError);
      assertThrows(() => assertDefined(undefined), AssertionError);
    });

    test('assertMatches() and assertDoesNotMatch() check regexes', () => {
      assertMatches('7-А класс', /^7-[А-Д]/);
      assertDoesNotMatch('8-А класс', /^7-[А-Д]/);

      assertThrows(() => assertMatches('invalid', /^[0-9]+$/), AssertionError);
    });

    test('assertCloseTo() handles floating-point math', () => {
      assertCloseTo(0.1 + 0.2, 0.3, 0.0001);
      assertThrows(() => assertCloseTo(0.1, 0.5, 0.01), AssertionError);
    });

    test('fail() unconditionally throws AssertionError', () => {
      assertThrows(() => fail('Intentional test failure'), AssertionError);
    });

    test('AssertionError stack trace omits internal frames', () => {
      let caught = null;
      try {
        assertEquals('expected', 'actual');
      } catch (e) {
        caught = e;
      }
      assertNotNull(caught);
      // The top frame of stack trace should reference this test file, not assert.js internals
      const stackFrames = caught.stack.split('\n').filter(line => line.trim().startsWith('at '));
      const topStackFrame = stackFrames[0] || '';
      assertContains(topStackFrame, 'test_infra.test.js');
      assertNotContains(topStackFrame, 'assert.js');
    });
  });
});

// ─── SUITE 2: Headless DOM Environment ───────────────────────────────────────

describe('Smoke: DOM Environment (dom_env.js)', () => {
  let env = null;

  beforeEach(() => {
    env = setupBrowserEnv();
  });

  afterEach(() => {
    if (env) {
      env.teardown();
      env = null;
    }
  });

  describe('Node Hierarchy & Document API', () => {
    test('creates elements, text nodes, and appends to tree', () => {
      const { document } = env;
      const div = document.createElement('div');
      div.setAttribute('id', 'test-container');
      div.className = 'container box';

      const p = document.createElement('p');
      p.textContent = 'Hello, Trainer!';
      div.appendChild(p);

      document.body.appendChild(div);

      const found = document.getElementById('test-container');
      assertNotNull(found);
      assertEquals(found.tagName, 'DIV');
      assertEquals(found.children.length, 1);
      assertEquals(found.firstElementChild || found.children[0], p);
      assertEquals(p.textContent, 'Hello, Trainer!');
      assertEquals(p.parentNode, div);

      // Removal
      div.removeChild(p);
      assertEquals(div.children.length, 0);
      assertNull(p.parentNode);
    });

    test('innerHTML getter and setter serialize and parse correctly', () => {
      const { document } = env;
      const card = document.createElement('div');
      card.innerHTML = '<span class="label">Очки:</span><strong id="score">150</strong>';

      assertEquals(card.children.length, 2);
      const span = card.querySelector('.label');
      const strong = card.querySelector('#score');

      assertNotNull(span);
      assertNotNull(strong);
      assertEquals(span.textContent, 'Очки:');
      assertEquals(strong.textContent, '150');

      // outerHTML includes tag and attributes
      assertContains(span.outerHTML, 'class="label"');
      assertContains(span.outerHTML, 'Очки:');
    });

    test('classList provides add, remove, toggle, contains and stays synced', () => {
      const { document } = env;
      const btn = document.createElement('button');
      btn.className = 'btn btn-primary';

      assertTrue(btn.classList.contains('btn'));
      assertTrue(btn.classList.contains('btn-primary'));

      btn.classList.add('active', 'fade-in');
      assertTrue(btn.classList.contains('active'));
      assertTrue(btn.classList.contains('fade-in'));
      assertEquals(btn.className, 'btn btn-primary active fade-in');

      btn.classList.remove('btn-primary');
      assertFalse(btn.classList.contains('btn-primary'));

      const toggledOn = btn.classList.toggle('selected');
      assertTrue(toggledOn);
      assertTrue(btn.classList.contains('selected'));

      const toggledOff = btn.classList.toggle('selected');
      assertFalse(toggledOff);
      assertFalse(btn.classList.contains('selected'));
    });

    test('dataset proxy maps camelCase properties to data-* attributes', () => {
      const { document } = env;
      const keyEl = document.createElement('div');
      keyEl.dataset.keyChar = 'ф';
      keyEl.dataset.fingerZone = 'pinky-l';

      assertEquals(keyEl.getAttribute('data-key-char'), 'ф');
      assertEquals(keyEl.getAttribute('data-finger-zone'), 'pinky-l');
      assertEquals(keyEl.dataset.keyChar, 'ф');
      assertEquals(keyEl.dataset.fingerZone, 'pinky-l');

      delete keyEl.dataset.fingerZone;
      assertFalse(keyEl.hasAttribute('data-finger-zone'));
      assertUndefined(keyEl.dataset.fingerZone);
    });

    test('dataset proxy enumerates only camelCase data attributes via Object.keys() without leaking class or id', () => {
      const { document } = env;
      const el = document.createElement('div');
      el.setAttribute('id', 'item');
      el.setAttribute('class', 'card main-card');
      el.setAttribute('data-lesson-id', '7-2-2');
      el.setAttribute('data-module-name', 'typing');
      el.setAttribute('data-student-first-name', 'Александр');

      const keys = Object.keys(el.dataset);
      assertFalse(keys.includes('id'), 'dataset keys must not leak id');
      assertFalse(keys.includes('class'), 'dataset keys must not leak class');
      assertFalse(keys.includes('data-lesson-id'), 'dataset keys must not contain raw data- prefixes');
      assertTrue(keys.includes('lessonId'), 'dataset keys must include lessonId');
      assertTrue(keys.includes('moduleName'), 'dataset keys must include moduleName');
      assertTrue(keys.includes('studentFirstName'), 'dataset keys must include studentFirstName');

      assertEquals(el.dataset.lessonId, '7-2-2');
      assertEquals(el.dataset.moduleName, 'typing');
      assertEquals(el.dataset.studentFirstName, 'Александр');
      assertTrue('lessonId' in el.dataset);
      assertFalse('class' in el.dataset);
    });

    test('style proxy tracks CSS rules and affects offset dimensions', () => {
      const { document } = env;
      const el = document.createElement('div');

      assertEquals(el.offsetWidth, 100);
      assertEquals(el.offsetHeight, 40);

      el.style.display = 'none';
      assertEquals(el.offsetWidth, 0);
      assertEquals(el.offsetHeight, 0);

      el.style.display = 'flex';
      assertEquals(el.offsetWidth, 100);
      assertEquals(el.offsetHeight, 40);

      const rect = el.getBoundingClientRect();
      assertEquals(rect.width, 100);
      assertEquals(rect.height, 40);
    });
  });

  describe('CSS Query Selector Engine', () => {
    test('queries by tag, #id, .class, attributes, and combinations', () => {
      const { document } = env;
      const root = document.createElement('div');
      root.innerHTML = `
        <div class="panel" id="main-panel">
          <button class="btn btn-action" data-action="save">Сохранить</button>
          <button class="btn btn-danger" data-action="delete">Удалить</button>
          <ul class="list">
            <li class="item active" data-id="101">Пункт 1</li>
            <li class="item" data-id="102">Пункт 2</li>
          </ul>
        </div>
      `;

      // Single queries
      assertNotNull(root.querySelector('#main-panel'));
      assertNotNull(root.querySelector('.btn-action'));
      assertNotNull(root.querySelector('[data-action="save"]'));
      assertNotNull(root.querySelector('li.item.active'));

      // Descendant queries
      const activeItem = root.querySelector('#main-panel .list .active');
      assertNotNull(activeItem);
      assertEquals(activeItem.textContent, 'Пункт 1');

      // querySelectorAll
      const allBtns = root.querySelectorAll('button');
      assertEquals(allBtns.length, 2);

      const allItems = root.querySelectorAll('.item');
      assertEquals(allItems.length, 2);

      // closest
      assertEquals(activeItem.closest('.list').tagName, 'UL');
      assertEquals(activeItem.closest('#main-panel').id, 'main-panel');
      assertNull(activeItem.closest('.nonexistent'));
    });

    test('pseudo-class :not(...) correctly filters elements by inverting condition', () => {
      const { document } = env;
      const root = document.createElement('div');
      root.innerHTML = `
        <button class="action-btn" id="b1">Active</button>
        <button class="action-btn disabled" id="b2" disabled>Disabled</button>
        <button class="action-btn" id="b3">Secondary</button>
      `;

      const notDisabledClass = root.querySelectorAll('button:not(.disabled)');
      assertEquals(notDisabledClass.length, 2);
      assertEquals(notDisabledClass[0].getAttribute('id'), 'b1');
      assertEquals(notDisabledClass[1].getAttribute('id'), 'b3');

      const notDisabledAttr = root.querySelectorAll('button:not([disabled])');
      assertEquals(notDisabledAttr.length, 2);
      assertEquals(notDisabledAttr[0].getAttribute('id'), 'b1');
      assertEquals(notDisabledAttr[1].getAttribute('id'), 'b3');
    });
  });

  describe('Event System & Event Propagation', () => {
    test('event bubbles through DOM hierarchy to document and window', () => {
      const { document, window } = env;
      const parent = document.createElement('div');
      const child = document.createElement('button');
      parent.appendChild(child);
      document.body.appendChild(parent);

      const eventLog = [];

      child.addEventListener('click', (e) => {
        eventLog.push({ target: 'child', currentTarget: e.currentTarget.tagName });
      });
      parent.addEventListener('click', (e) => {
        eventLog.push({ target: 'parent', currentTarget: e.currentTarget.tagName });
      });
      document.addEventListener('click', (e) => {
        eventLog.push({ target: 'document', currentTarget: 'DOCUMENT' });
      });
      window.addEventListener('click', (e) => {
        eventLog.push({ target: 'window', currentTarget: 'WINDOW' });
      });

      env.dispatchClick(child);

      assertEquals(eventLog.length, 4);
      assertEquals(eventLog[0].target, 'child');
      assertEquals(eventLog[1].target, 'parent');
      assertEquals(eventLog[2].target, 'document');
      assertEquals(eventLog[3].target, 'window');
    });

    test('stopPropagation halts event bubbling', () => {
      const { document } = env;
      const parent = document.createElement('div');
      const child = document.createElement('button');
      parent.appendChild(child);

      let parentCalled = false;
      let childCalled = false;

      child.addEventListener('click', (e) => {
        childCalled = true;
        e.stopPropagation();
      });
      parent.addEventListener('click', () => {
        parentCalled = true;
      });

      env.dispatchClick(child);
      assertTrue(childCalled);
      assertFalse(parentCalled);
    });

    test('stopPropagation allows sibling listeners on same element but halts bubbling to parent', () => {
      const { document } = env;
      const parent = document.createElement('div');
      const child = document.createElement('button');
      parent.appendChild(child);

      const executionOrder = [];

      child.addEventListener('click', (e) => {
        executionOrder.push('child-1');
        e.stopPropagation();
      });
      child.addEventListener('click', () => {
        executionOrder.push('child-2');
      });
      parent.addEventListener('click', () => {
        executionOrder.push('parent');
      });

      env.dispatchClick(child);

      assertEquals(executionOrder.length, 2);
      assertEquals(executionOrder[0], 'child-1');
      assertEquals(executionOrder[1], 'child-2');
      assertFalse(executionOrder.includes('parent'));
    });

    test('MockEvent implements stopImmediatePropagation() halting sibling listeners on same node', () => {
      const { document } = env;
      const parent = document.createElement('div');
      const child = document.createElement('button');
      parent.appendChild(child);

      const executionOrder = [];

      child.addEventListener('click', (e) => {
        executionOrder.push('child-1');
        assertTrue(typeof e.stopImmediatePropagation === 'function', 'stopImmediatePropagation must be a function');
        e.stopImmediatePropagation();
      });
      child.addEventListener('click', () => {
        executionOrder.push('child-2');
      });
      parent.addEventListener('click', () => {
        executionOrder.push('parent');
      });

      env.dispatchClick(child);

      assertEquals(executionOrder.length, 1);
      assertEquals(executionOrder[0], 'child-1');
      assertFalse(executionOrder.includes('child-2'));
      assertFalse(executionOrder.includes('parent'));
    });

    test('contextmenu event and preventDefault() support for right clicks', () => {
      const { document } = env;
      const target = document.createElement('div');
      let defaultPrevented = false;
      let buttonCode = null;

      target.addEventListener('contextmenu', (e) => {
        buttonCode = e.button;
        e.preventDefault();
        defaultPrevented = e.defaultPrevented;
      });

      const ev = env.dispatchContextMenu(target);
      assertEquals(buttonCode, 2);
      assertTrue(defaultPrevented);
      assertTrue(ev.defaultPrevented);
    });

    test('KeyboardEvent simulates typing interactions', () => {
      const { document } = env;
      const input = document.createElement('input');
      let recordedKey = '';
      let recordedCode = '';

      input.addEventListener('keydown', (e) => {
        recordedKey = e.key;
        recordedCode = e.code;
      });

      env.dispatchKey(input, 'ф', { code: 'KeyA' });
      assertEquals(recordedKey, 'ф');
      assertEquals(recordedCode, 'KeyA');
    });

    test('DragEvent and MockDataTransfer simulate drag and drop cycle', () => {
      const { document } = env;
      const source = document.createElement('div');
      source.id = 'file-doc-1';
      const dest = document.createElement('div');
      dest.id = 'folder-target';

      let dragStarted = false;
      let droppedData = null;

      source.addEventListener('dragstart', (e) => {
        dragStarted = true;
        assertEquals(e.dataTransfer.getData('fileid'), '101');
      });

      dest.addEventListener('drop', (e) => {
        droppedData = e.dataTransfer.getData('fileid');
      });

      const result = env.dispatchDragDrop(source, dest, { fileId: '101' });

      assertTrue(dragStarted);
      assertEquals(droppedData, '101');
      assertNotNull(result.dragStartEv);
      assertNotNull(result.dropEv);
    });
  });

  describe('Storage, Web Audio & Network Mocks', () => {
    test('localStorage handles method calls and proxy property indexing (including sync_queue)', () => {
      const { localStorage } = env;

      // Method access
      localStorage.setItem('user', 'Ivan');
      assertEquals(localStorage.getItem('user'), 'Ivan');

      // Direct property access
      localStorage['trainer_progress'] = JSON.stringify({ score: 500 });
      assertEquals(JSON.parse(localStorage['trainer_progress']).score, 500);

      // F20 sync queue support
      localStorage['sync_queue'] = JSON.stringify([{ action: 'test_passed', studentId: '7A-01' }]);
      assertContains(localStorage.getItem('sync_queue'), '7A-01');

      // Deletion
      delete localStorage['user'];
      assertNull(localStorage.getItem('user'));

      localStorage.clear();
      assertEquals(localStorage.length, 0);
    });

    test('localStorage proxy assignment does not overwrite built-in methods (clear, getItem, setItem)', () => {
      const { localStorage } = env;

      // Assignment to built-in method name
      localStorage['clear'] = 'clearValue';
      localStorage['getItem'] = 'getItemValue';
      localStorage['length'] = '100';

      // Verify methods remain functions
      assertTrue(typeof localStorage.clear === 'function', 'localStorage.clear must remain a function');
      assertTrue(typeof localStorage.getItem === 'function', 'localStorage.getItem must remain a function');

      // Verify values stored in key-value store
      assertEquals(localStorage.getItem('clear'), 'clearValue');
      assertEquals(localStorage.getItem('getItem'), 'getItemValue');

      // Verify clear() executes successfully
      localStorage.clear();
      assertEquals(localStorage.length, 0);
      assertNull(localStorage.getItem('clear'));
    });

    test('navigator.onLine toggles and dispatches online/offline window events', () => {
      const { navigator, window } = env;
      assertTrue(navigator.onLine);

      let offlineFired = false;
      let onlineFired = false;

      window.addEventListener('offline', () => { offlineFired = true; });
      window.addEventListener('online', () => { onlineFired = true; });

      env.setOnline(false);
      assertFalse(navigator.onLine);
      assertTrue(offlineFired);

      env.setOnline(true);
      assertTrue(navigator.onLine);
      assertTrue(onlineFired);
    });

    test('Web Audio AudioContext stub records oscillator and gain calls', () => {
      const { audioContext } = env;
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(880, 0);
      osc.connect(gain);
      gain.connect(audioContext.destination);

      osc.start(0);
      gain.gain.setValueAtTime(0.5, 0);
      osc.stop(0.15);

      const calls = audioContext.__calls;
      assertTrue(calls.length >= 4);
      assertContains(calls.map(c => c.action), 'oscillator.start');
      assertContains(calls.map(c => c.action), 'oscillator.stop');
      assertContains(calls.map(c => c.action), 'gain.setValueAtTime');
    });

    test('fetch mock records calls and rejects when network is offline', async () => {
      const { window } = env;

      // Online fetch succeeds
      const res = await window.fetch('http://localhost/version.json');
      assertTrue(res.ok);
      assertEquals(res.status, 200);
      const data = await res.json();
      assertEquals(data.status, 'ok');

      assertEquals(window.__fetchCalls.length, 1);
      assertEquals(window.__fetchCalls[0].url, 'http://localhost/version.json');

      // Offline fetch rejects
      env.setOnline(false);
      await assertThrows(async () => {
        await window.fetch('http://localhost/api/sync');
      }, /offline/i);

      assertEquals(window.__fetchCalls.length, 2);
    });
  });
});

// ─── SUITE 3: SPA Application Stack Loading ─────────────────────────────────

describe('Smoke: SPA Application Stack (loadAppStack)', () => {
  let env = null;

  beforeEach(() => {
    env = setupBrowserEnv();
  });

  afterEach(() => {
    if (env) {
      env.teardown();
      env = null;
    }
  });

  test('loads students, content, app controller, typing, and teacher panel cleanly', () => {
    env.loadAppStack();

    const { window, document } = env;

    // Check data integrity
    assertNotNull(window.STUDENTS_DATA, 'STUDENTS_DATA must be populated');
    assertEquals(window.STUDENTS_DATA.classes.length, 5, 'Must contain 5 classes (7-А to 7-Д)');

    let totalStudents = 0;
    for (const cls of window.STUDENTS_DATA.classes) {
      totalStudents += cls.students.length;
    }
    assertEquals(totalStudents, 79, 'Must contain exactly 79 students');

    // Check content data integrity
    assertNotNull(window.CONTENT_DATA, 'CONTENT_DATA must be populated');
    assertTrue(window.CONTENT_DATA.topics.length >= 5, 'Must contain lessons 7-2-2 to 7-2-6');

    // Check modules
    assertNotNull(window.TypingTrainer, 'TypingTrainer must be defined');
    assertNotNull(window.TeacherPanel, 'TeacherPanel must be defined');

    // Check active screen after App.init()
    const activeScreen = document.querySelector('.screen.active');
    assertNotNull(activeScreen);
    assertEquals(activeScreen.id, 'screen-login');
  });

  test('navigates from login screen to class selection upon student role button click', () => {
    env.loadAppStack();
    const { document } = env;

    // Click "Я ученик"
    env.dispatchClick('#btn-student');

    // Screen switches to screen-class
    const activeScreen = document.querySelector('.screen.active');
    assertNotNull(activeScreen);
    assertEquals(activeScreen.id, 'screen-class');

    // Classes are rendered
    const classBtns = document.querySelectorAll('#class-list button');
    assertEquals(classBtns.length, 5);
  });
});

// ─── SUITE 4: Test Runner Reliability & Error Normalization ─────────────────

describe('Smoke: Test Runner Reliability & Error Normalization (runner.js)', () => {
  test('normalizeError() formats null, primitives, and Error instances safely without crashes', () => {
    // null primitive
    const errNull = normalizeError(null);
    assertEquals(errNull.name, 'Error');
    assertEquals(errNull.message, 'null');

    // undefined primitive
    const errUndef = normalizeError(undefined);
    assertEquals(errUndef.name, 'Error');
    assertEquals(errUndef.message, 'undefined');

    // string primitive
    const errStr = normalizeError('something broke');
    assertEquals(errStr.name, 'Error');
    assertEquals(errStr.message, 'something broke');

    // number primitive
    const errNum = normalizeError(404);
    assertEquals(errNum.name, 'Error');
    assertEquals(errNum.message, '404');

    // native Error instance
    const nativeErr = new TypeError('invalid type argument');
    const normNative = normalizeError(nativeErr);
    assertEquals(normNative.name, 'TypeError');
    assertEquals(normNative.message, 'invalid type argument');

    // object without name or message
    const customObj = { custom: 123 };
    const normCustom = normalizeError(customObj);
    assertEquals(normCustom.name, 'Error');
    assertContains(normCustom.message, '[object Object]');
  });

  test('runWithTimeout() watchdog rejects and fails on hanging asynchronous promises', async () => {
    let errorThrown = null;
    const timeoutMs = 60;
    const startTime = Date.now();

    try {
      await runWithTimeout(() => new Promise(() => {}), timeoutMs);
    } catch (err) {
      errorThrown = err;
    }

    const elapsed = Date.now() - startTime;
    assertNotNull(errorThrown, 'runWithTimeout must reject when task never settles');
    assertContains(errorThrown.message, `Test timed out after ${timeoutMs}ms`);
    assertTrue(elapsed >= 50, `Elapsed ${elapsed}ms should be >= configured timeout`);
  });
});
