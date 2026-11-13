/**
 * Deep Adversarial Verification of 5 Focal Areas in dom_env.js
 * Challenger 2 (Milestone E2E-M1 Iteration 2)
 */

const path = require('path');
const rootDir = path.resolve(__dirname, '../../..');
const { setupBrowserEnv, teardownTestEnv, MockEvent, MockMouseEvent } = require(path.join(rootDir, 'tests/helpers/dom_env'));
const assert = require(path.join(rootDir, 'tests/helpers/assert'));

let passed = 0;
let failed = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`  [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`  [FAIL] ${name}: ${err.message}`);
    if (err.stack) {
      console.error(err.stack.split('\n').slice(1, 4).join('\n'));
    }
    failed++;
  }
}

console.log('================================================================');
console.log('CHALLENGER 2: DEEP ADVERSARIAL FOCAL AREAS VERIFICATION');
console.log('================================================================\n');

// ─── 1. Inverted :not(...) CSS selector behavior ─────────────────────────────
console.log('--- 1. Inverted :not(...) CSS Selector Behavior ---');

runTest(':not(.disabled) correctly filters out disabled buttons and retains active', () => {
  const env = setupBrowserEnv({
    html: `
      <div id="container">
        <button id="b1" class="btn active">Btn 1</button>
        <button id="b2" class="btn disabled">Btn 2</button>
        <button id="b3" class="btn">Btn 3</button>
        <button id="b4" class="btn disabled special">Btn 4</button>
      </div>
    `
  });

  const activeButtons = env.document.querySelectorAll('#container button:not(.disabled)');
  assert.assertEquals(activeButtons.length, 2, 'Should match exactly 2 non-disabled buttons');
  assert.assertEquals(activeButtons[0].id, 'b1');
  assert.assertEquals(activeButtons[1].id, 'b3');
  teardownTestEnv();
});

runTest(':not(:disabled) pseudo-class correctly filters out elements with disabled attribute', () => {
  const env = setupBrowserEnv({
    html: `
      <div id="form">
        <input id="i1" type="text" value="editable" />
        <input id="i2" type="text" disabled value="locked" />
        <button id="btn-submit">Submit</button>
        <button id="btn-cancel" disabled>Cancel</button>
      </div>
    `
  });

  const enabledInputs = env.document.querySelectorAll('input:not(:disabled)');
  assert.assertEquals(enabledInputs.length, 1);
  assert.assertEquals(enabledInputs[0].id, 'i1');

  const enabledButtons = env.document.querySelectorAll('button:not(:disabled)');
  assert.assertEquals(enabledButtons.length, 1);
  assert.assertEquals(enabledButtons[0].id, 'btn-submit');
  teardownTestEnv();
});

runTest('Chained :not selectors: button:not(.hidden):not(.disabled)', () => {
  const env = setupBrowserEnv({
    html: `
      <div id="menu">
        <button id="b-ok" class="btn">OK</button>
        <button id="b-hid" class="btn hidden">Hidden</button>
        <button id="b-dis" class="btn disabled">Disabled</button>
        <button id="b-both" class="btn hidden disabled">Both</button>
      </div>
    `
  });

  const matched = env.document.querySelectorAll('button:not(.hidden):not(.disabled)');
  assert.assertEquals(matched.length, 1);
  assert.assertEquals(matched[0].id, 'b-ok');
  teardownTestEnv();
});

runTest(':not with attribute selector: input:not([type="checkbox"])', () => {
  const env = setupBrowserEnv({
    html: `
      <div id="inputs">
        <input id="text1" type="text" />
        <input id="cb1" type="checkbox" />
        <input id="text2" type="password" />
      </div>
    `
  });

  const notCheckboxes = env.document.querySelectorAll('input:not([type="checkbox"])');
  assert.assertEquals(notCheckboxes.length, 2);
  assert.assertEquals(notCheckboxes[0].id, 'text1');
  assert.assertEquals(notCheckboxes[1].id, 'text2');
  teardownTestEnv();
});

// ─── 2. Sibling listeners execution when stopPropagation() is called ─────────
console.log('\n--- 2. Sibling Listeners Execution with stopPropagation() ---');

runTest('stopPropagation() executes all sibling listeners on target but halts parent propagation', () => {
  const env = setupBrowserEnv({
    html: `
      <div id="parent">
        <button id="child">Click Me</button>
      </div>
    `
  });

  const child = env.document.getElementById('child');
  const parent = env.document.getElementById('parent');

  const executionLog = [];

  child.addEventListener('click', (e) => {
    executionLog.push('child-L1');
  });

  child.addEventListener('click', (e) => {
    executionLog.push('child-L2-stops');
    e.stopPropagation();
  });

  child.addEventListener('click', (e) => {
    executionLog.push('child-L3-sibling');
  });

  parent.addEventListener('click', (e) => {
    executionLog.push('parent-L1');
  });

  child.dispatchEvent(new MockMouseEvent('click', { bubbles: true }));

  assert.assertDeepEquals(executionLog, ['child-L1', 'child-L2-stops', 'child-L3-sibling'],
    'All sibling listeners on the target element MUST execute even after stopPropagation()');
  teardownTestEnv();
});

runTest('stopPropagation() in inline onclick still allows subsequent listeners and stops parent', () => {
  const env = setupBrowserEnv({
    html: `
      <div id="grandparent">
        <div id="parent">
          <button id="child">Click</button>
        </div>
      </div>
    `
  });

  const child = env.document.getElementById('child');
  const parent = env.document.getElementById('parent');
  const grandparent = env.document.getElementById('grandparent');

  const log = [];

  child.addEventListener('click', () => log.push('child-listener-1'));
  child.onclick = (e) => {
    log.push('child-inline');
    e.stopPropagation();
  };
  parent.addEventListener('click', () => log.push('parent-listener'));
  grandparent.addEventListener('click', () => log.push('grandparent-listener'));

  child.dispatchEvent(new MockMouseEvent('click', { bubbles: true }));

  assert.assertDeepEquals(log, ['child-listener-1', 'child-inline']);
  teardownTestEnv();
});

// ─── 3. MockEvent.stopImmediatePropagation() ─────────────────────────────────
console.log('\n--- 3. MockEvent.stopImmediatePropagation() Execution ---');

runTest('stopImmediatePropagation() halts subsequent listeners on current node and parent propagation', () => {
  const env = setupBrowserEnv({
    html: `
      <div id="parent">
        <button id="btn">Click</button>
      </div>
    `
  });

  const btn = env.document.getElementById('btn');
  const parent = env.document.getElementById('parent');

  const log = [];

  btn.addEventListener('click', (e) => {
    log.push('btn-L1');
    assert.assertEquals(typeof e.stopImmediatePropagation, 'function', 'MockEvent must have stopImmediatePropagation');
    e.stopImmediatePropagation();
  });

  btn.addEventListener('click', (e) => {
    log.push('btn-L2-should-not-run');
  });

  btn.onclick = () => {
    log.push('btn-inline-should-not-run');
  };

  parent.addEventListener('click', () => {
    log.push('parent-should-not-run');
  });

  btn.dispatchEvent(new MockMouseEvent('click', { bubbles: true }));

  assert.assertDeepEquals(log, ['btn-L1'], 'Only L1 should have run before stopImmediatePropagation');
  teardownTestEnv();
});

runTest('stopImmediatePropagation() called on intermediate bubbling node halts further listeners and ancestors', () => {
  const env = setupBrowserEnv({
    html: `
      <div id="ancestor">
        <div id="parent">
          <button id="leaf">Leaf</button>
        </div>
      </div>
    `
  });

  const leaf = env.document.getElementById('leaf');
  const parent = env.document.getElementById('parent');
  const ancestor = env.document.getElementById('ancestor');

  const log = [];

  leaf.addEventListener('custom', () => log.push('leaf-1'));
  leaf.addEventListener('custom', () => log.push('leaf-2'));

  parent.addEventListener('custom', (e) => {
    log.push('parent-1-stops-immediate');
    e.stopImmediatePropagation();
  });
  parent.addEventListener('custom', () => log.push('parent-2-should-not-run'));
  ancestor.addEventListener('custom', () => log.push('ancestor-should-not-run'));

  leaf.dispatchEvent(new MockEvent('custom', { bubbles: true }));

  assert.assertDeepEquals(log, ['leaf-1', 'leaf-2', 'parent-1-stops-immediate']);
  teardownTestEnv();
});

// ─── 4. Object.keys(element.dataset) isolation and camelCasing ───────────────
console.log('\n--- 4. Object.keys(element.dataset) Isolation & camelCasing ---');

runTest('Object.keys(element.dataset) yields only camelCased data attributes without leaking id or class', () => {
  const env = setupBrowserEnv({
    html: `
      <div id="test-node"
           class="card primary featured"
           title="Card Title"
           tabindex="0"
           data-student-id="7A-01"
           data-lesson-num="2"
           data-accuracy-target="95.5"
           data-is-active="true"
           data-single="ok">
      </div>
    `
  });

  const el = env.document.getElementById('test-node');
  const keys = Object.keys(el.dataset);

  assert.assertEquals(keys.length, 5, 'Must have exactly 5 keys');
  assert.assertContains(keys, 'studentId');
  assert.assertContains(keys, 'lessonNum');
  assert.assertContains(keys, 'accuracyTarget');
  assert.assertContains(keys, 'isActive');
  assert.assertContains(keys, 'single');

  // Verify non-data attributes do NOT leak
  assert.assertFalse(keys.includes('id'), 'Must not leak id attribute');
  assert.assertFalse(keys.includes('class'), 'Must not leak class attribute');
  assert.assertFalse(keys.includes('title'), 'Must not leak title attribute');
  assert.assertFalse(keys.includes('tabindex'), 'Must not leak tabindex attribute');

  // Verify values via dataset
  assert.assertEquals(el.dataset.studentId, '7A-01');
  assert.assertEquals(el.dataset.lessonNum, '2');
  assert.assertEquals(el.dataset.accuracyTarget, '95.5');
  assert.assertEquals(el.dataset.isActive, 'true');
  assert.assertEquals(el.dataset.single, 'ok');

  // Verify \`in\` operator
  assert.assertTrue('studentId' in el.dataset);
  assert.assertFalse('id' in el.dataset);
  assert.assertFalse('class' in el.dataset);

  teardownTestEnv();
});

runTest('dataset mutation via Proxy updates attributes and reflection via Object.keys()', () => {
  const env = setupBrowserEnv({ html: '<div id="box" data-init="1"></div>' });
  const el = env.document.getElementById('box');

  assert.assertDeepEquals(Object.keys(el.dataset), ['init']);

  // Add new property via dataset
  el.dataset.newProperty = 'helloWorld';
  assert.assertEquals(el.getAttribute('data-new-property'), 'helloWorld');
  assert.assertContains(Object.keys(el.dataset), 'newProperty');

  // Delete property via dataset
  delete el.dataset.init;
  assert.assertFalse(el.hasAttribute('data-init'));
  assert.assertFalse('init' in el.dataset);
  assert.assertDeepEquals(Object.keys(el.dataset), ['newProperty']);

  teardownTestEnv();
});

// ─── 5. localStorage Method Names Assignment Protection ─────────────────────
console.log('\n--- 5. localStorage Method Names Assignment Protection ---');

runTest('Assigning method names to localStorage does not overwrite prototype methods and stores values', () => {
  const env = setupBrowserEnv({ html: '<div></div>' });
  const storage = env.localStorage;

  // Clear before starting
  storage.clear();
  assert.assertEquals(storage.length, 0);

  // Assign to method names via index syntax
  storage['clear'] = 'clear_value';
  storage['getItem'] = 'getItem_value';
  storage['setItem'] = 'setItem_value';
  storage['removeItem'] = 'removeItem_value';
  storage['length'] = 'length_value';
  storage['key'] = 'key_value';

  // 1. Prototype methods must remain intact and callable
  assert.assertEquals(typeof storage.clear, 'function', 'storage.clear must remain a function');
  assert.assertEquals(typeof storage.getItem, 'function', 'storage.getItem must remain a function');
  assert.assertEquals(typeof storage.setItem, 'function', 'storage.setItem must remain a function');
  assert.assertEquals(typeof storage.removeItem, 'function', 'storage.removeItem must remain a function');
  assert.assertEquals(typeof storage.key, 'function', 'storage.key must remain a function');
  assert.assertEquals(typeof storage.length, 'number', 'storage.length must remain a number');

  // 2. Values stored under those keys must be retrievable via getItem()
  assert.assertEquals(storage.getItem('clear'), 'clear_value');
  assert.assertEquals(storage.getItem('getItem'), 'getItem_value');
  assert.assertEquals(storage.getItem('setItem'), 'setItem_value');
  assert.assertEquals(storage.getItem('removeItem'), 'removeItem_value');
  assert.assertEquals(storage.getItem('length'), 'length_value');
  assert.assertEquals(storage.getItem('key'), 'key_value');

  // 3. Length must reflect the number of stored keys
  assert.assertEquals(storage.length, 6, 'Storage length should be 6');

  // 4. Calling storage.clear() must function properly without TypeError
  assert.assertDoesNotThrow(() => {
    storage.clear();
  }, 'storage.clear() must execute cleanly without error');

  // 5. After clear(), storage is empty
  assert.assertEquals(storage.length, 0);
  assert.assertNull(storage.getItem('clear'));
  assert.assertNull(storage.getItem('getItem'));

  // 6. Normal setItem and getItem still work seamlessly
  storage.setItem('user', 'Alice');
  assert.assertEquals(storage.getItem('user'), 'Alice');
  storage.removeItem('user');
  assert.assertNull(storage.getItem('user'));

  teardownTestEnv();
});

console.log('\n================================================================');
console.log(`TOTAL DEEP VERIFICATION TESTS: ${passed + failed}`);
console.log(`PASSED: ${passed}`);
console.log(`FAILED: ${failed}`);
console.log('================================================================');

if (failed > 0) {
  process.exit(1);
}
