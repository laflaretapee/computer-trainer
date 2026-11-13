'use strict';
const { setupBrowserEnv } = require('../../../tests/helpers/dom_env');

const env = setupBrowserEnv();
const { document } = env;

const root = document.createElement('div');
root.innerHTML = `
  <section id="s1" class="panel active">
    <button id="b1" class="btn primary" data-tier="1">B1</button>
    <button id="b2" class="btn primary disabled" data-tier="2" disabled>B2</button>
    <button id="b3" class="btn secondary" data-tier="1">B3</button>
    <input id="i1" type="checkbox" />
    <input id="i2" type="checkbox" />
  </section>
  <section id="s2" class="panel">
    <button id="b4" class="btn secondary" data-tier="3">B4</button>
  </section>
`;
root.querySelector('#i1').checked = true;

let passed = true;

function assertMatch(selector, expectedIds) {
  const matched = root.querySelectorAll(selector).map(el => el.id).sort();
  const exp = expectedIds.slice().sort();
  if (matched.join(',') !== exp.join(',')) {
    console.error(`[FAIL] selector "${selector}": expected [${exp}], got [${matched}]`);
    passed = false;
  } else {
    console.log(`[PASS] selector "${selector}": matched [${matched}]`);
  }
}

assertMatch('button:not(.disabled)', ['b1', 'b3', 'b4']);
assertMatch('button:not([disabled])', ['b1', 'b3', 'b4']);
assertMatch('button.primary:not(.disabled)', ['b1']);
assertMatch('section:not(.active) button', ['b4']);
assertMatch('section.active button:not(.primary)', ['b3']);
assertMatch('input:checked', ['i1']);
assertMatch('button:disabled', ['b2']);
assertMatch('button:enabled', ['b1', 'b3', 'b4']);

env.teardown();

if (!passed) process.exit(1);
console.log('ALL SELECTOR CHECKS PASSED!');
