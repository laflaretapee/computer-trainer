'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '../../..');
const typingPath = path.join(root, 'modules/typing.js');
let code = fs.readFileSync(typingPath, 'utf8');

// 1. Verify replacements
const p1_before = 'let _textStarted = false;\n  let _keyElementsMap = new Map();';
const p1_after  = 'let _textStarted = false;\n  let _isFinished = false;\n  let _keyElementsMap = new Map();';

const p2_before = "if (_currentLevel) input.focus();";
const p2_after  = "if (_currentLevel && !_isFinished) input.focus();";

const p3_before = "_startTime    = null;\n\n    if (_keyElementsMap.size === 0) {";
const p3_after  = "_startTime    = null;\n    _isFinished   = false;\n\n    const timeEl = qs('tt-time');\n    if (timeEl) timeEl.textContent = '0:00';\n\n    if (_keyElementsMap.size === 0) {";

const p4_before = "if (['Shift', 'CapsLock',";
const p4_after  = "if (['Shift', 'Control', 'Alt', 'Meta', 'CapsLock',";

const p5_before = "e.preventDefault();\n\n    if (!_currentLevel) return;";
const p5_after  = "e.preventDefault();\n\n    if (!_currentLevel || _isFinished || _currentPos >= _currentText.length) return;";

const p6_before = "function finishSession() {\n    destroyTimers();";
const p6_after  = "function finishSession() {\n    destroyTimers();\n    _isFinished = true;";

const p7_before = "function destroy() {\n    destroyTimers();\n    _currentLevel = null;\n    _textStarted  = false;";
const p7_after  = "function destroy() {\n    destroyTimers();\n    _currentLevel = null;\n    _textStarted  = false;\n    _isFinished   = false;";

const checks = [
  [p1_before, p1_after],
  [p2_before, p2_after],
  [p3_before, p3_after],
  [p4_before, p4_after],
  [p5_before, p5_after],
  [p6_before, p6_after],
  [p7_before, p7_after],
];

for (let i = 0; i < checks.length; i++) {
  const [before, after] = checks[i];
  if (!code.includes(before)) {
    throw new Error(`Target ${i + 1} not found in modules/typing.js:\n${before}`);
  }
  code = code.replace(before, after);
}

console.log('✔ All 7 patch targets verified and applied in virtual source.');

// 2. Test behavioral execution in isolated DOM
const domEnv = require(path.join(root, 'tests/helpers/dom_env'));
const env = domEnv.setupBrowserEnv();

// Evaluate student data & content
const studentsSrc = fs.readFileSync(path.join(root, 'data/students.js'), 'utf8');
const contentSrc  = fs.readFileSync(path.join(root, 'data/content.js'), 'utf8');
vm.runInThisContext(studentsSrc);
vm.runInThisContext(contentSrc);

// Evaluate patched typing.js
vm.runInThisContext(code);

// Test 1: Initial state
const { window, document } = env;
window.TypingTrainer.init('screen-typing');
window.TypingTrainer.start(1);

const input = document.querySelector('#tt-input');
const errorsEl = document.querySelector('#tt-errors');
const speedEl = document.querySelector('#tt-speed');
const timeEl = document.querySelector('#tt-time');

if (errorsEl.textContent !== '0') throw new Error('Initial errors should be 0');
if (timeEl.textContent !== '0:00') throw new Error('Initial time should be 0:00');
console.log('✔ Behavioral Test 1: Initial state correct (errors=0, time=0:00)');

// Test 2: Solo modifier keys do NOT trigger errors
input.dispatchEvent(new domEnv.MockKeyboardEvent('keydown', { key: 'Control' }));
input.dispatchEvent(new domEnv.MockKeyboardEvent('keydown', { key: 'Alt' }));
input.dispatchEvent(new domEnv.MockKeyboardEvent('keydown', { key: 'Meta' }));
if (errorsEl.textContent !== '0') throw new Error('Standalone modifiers triggered error!');
console.log('✔ Behavioral Test 2: Standalone Control, Alt, Meta safely ignored (errors=0)');

// Test 3: Type entire exercise to completion
const spans = document.querySelectorAll('#tt-text span');
for (let i = 0; i < spans.length; i++) {
  const ch = spans[i].textContent === '\u00A0' ? ' ' : spans[i].textContent;
  input.dispatchEvent(new domEnv.MockKeyboardEvent('keydown', { key: ch }));
}

const resultCard = document.querySelector('#tt-result');
if (resultCard.style.display !== '') throw new Error('Result card should be visible');
console.log('✔ Behavioral Test 3: Exercise completed cleanly');

// Test 4: Post-completion keystrokes safely blocked
const errorsBefore = errorsEl.textContent;
for (let i = 0; i < 10; i++) {
  input.dispatchEvent(new domEnv.MockKeyboardEvent('keydown', { key: 'а' }));
}
if (errorsEl.textContent !== errorsBefore) {
  throw new Error(`Post-completion keystrokes changed errors from ${errorsBefore} to ${errorsEl.textContent}`);
}
console.log('✔ Behavioral Test 4: Post-completion keystrokes blocked (errors remained ' + errorsBefore + ')');

// Test 5: Timer reset on restart
timeEl.textContent = '0:45';
window.TypingTrainer.start(1);
if (timeEl.textContent !== '0:00') {
  throw new Error(`Timer did not reset on restart, was ${timeEl.textContent}`);
}
console.log('✔ Behavioral Test 5: Timer reset on restart verified (#tt-time resets to 0:00)');

// Test 6: Verify typing can resume after restart
const newSpans = document.querySelectorAll('#tt-text span');
const firstChar = newSpans[0].textContent === '\u00A0' ? ' ' : newSpans[0].textContent;
input.dispatchEvent(new domEnv.MockKeyboardEvent('keydown', { key: firstChar }));
if (newSpans[0].classList.contains('char-correct') !== true) {
  throw new Error('Could not resume typing after startLevel restart');
}
console.log('✔ Behavioral Test 6: Typing resumes cleanly after startLevel restart');

env.teardown();
console.log('\nALL 6 EMPIRICAL BEHAVIORAL CHECKS PASSED ZERO REGRESSIONS!');
process.exit(0);
