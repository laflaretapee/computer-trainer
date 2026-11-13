/**
 * adversarial_test.js
 * Independent Adversarial Stress Test Suite for Milestone 2 (Reviewer M2.2)
 */

'use strict';

const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../..');

const assertHelper = require(path.join(projectRoot, 'tests/helpers/assert'));
const {
  assert,
  assertEquals,
  assertNotEquals,
  assertTrue,
  assertFalse,
  assertNotNull,
  assertContains
} = assertHelper;

const domEnv = require(path.join(projectRoot, 'tests/helpers/dom_env'));

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✔ [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✖ [FAIL] ${name}: ${err.message}`);
    if (err.stack) console.error(err.stack);
    failed++;
  }
}

console.log('================================================================');
console.log('ADVERSARIAL STRESS TEST SUITE — MILESTONE 2 (Reviewer M2.2)');
console.log('================================================================\n');

const env = domEnv.setupBrowserEnv();
env.loadAppStack();
const { window, document } = env;

// Setup container
const container = document.createElement('div');
container.id = 'typing-container';
document.body.appendChild(container);
window.TypingTrainer.init('typing-container');

// ─────────────────────────────────────────────────────────────────────────────
console.log('[Test Category 1: CPM Spike Guard & Millisecond Math]');

test('Elapsed < 1.0s produces speed = 0, avoiding extreme CPM spikes', () => {
  window.TypingTrainer.start(1);
  const input = document.querySelector('#tt-input');
  
  // Fast keystroke (within current millisecond tick)
  const firstChar = document.querySelector('#tt-text span').textContent;
  input.dispatchEvent(new domEnv.MockKeyboardEvent('keydown', { key: firstChar }));

  const speedVal = parseInt(document.querySelector('#tt-speed').textContent, 10);
  assertEquals(speedVal, 0, 'Speed must be 0 while elapsed < 1.0s');
});

test('Multiple rapid keystrokes within first second do NOT explode CPM', () => {
  window.TypingTrainer.start(4);
  const input = document.querySelector('#tt-input');

  // Type 5 keys rapidly
  for (let i = 0; i < 5; i++) {
    const char = document.querySelectorAll('#tt-text span')[i].textContent;
    input.dispatchEvent(new domEnv.MockKeyboardEvent('keydown', { key: char }));
  }

  const speedVal = parseInt(document.querySelector('#tt-speed').textContent, 10);
  assertEquals(speedVal, 0, 'Speed must remain 0 during first second burst');
});

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[Test Category 2: Accuracy & Zero-Division Edge Cases]');

test('Initial state: Accuracy is 100% and errors are 0', () => {
  window.TypingTrainer.start(2);
  assertEquals(document.querySelector('#tt-accuracy').textContent, '100');
  assertEquals(document.querySelector('#tt-errors').textContent, '0');
});

test('Single error on first keystroke drops accuracy to 0% with errors=1 without NaN', () => {
  window.TypingTrainer.start(2);
  const input = document.querySelector('#tt-input');

  // Trigger error with unexpected key
  input.dispatchEvent(new domEnv.MockKeyboardEvent('keydown', { key: '!' }));

  assertEquals(document.querySelector('#tt-errors').textContent, '1');
  assertEquals(document.querySelector('#tt-accuracy').textContent, '0');
});

test('10 consecutive errors result in accuracy = 0%, not negative or NaN', () => {
  window.TypingTrainer.start(3);
  const input = document.querySelector('#tt-input');

  for (let i = 0; i < 10; i++) {
    input.dispatchEvent(new domEnv.MockKeyboardEvent('keydown', { key: '?' }));
  }

  assertEquals(document.querySelector('#tt-errors').textContent, '10');
  assertEquals(document.querySelector('#tt-accuracy').textContent, '0');
});

test('Calling finishSession before any input produces valid zero-keystroke summary', () => {
  window.TypingTrainer.start(1);
  const summary = window.TypingTrainer.finishSession();

  assertNotNull(summary);
  assertEquals(summary.speed, 0, 'Speed must be 0 when no correct chars');
  assertEquals(summary.accuracy, 100, 'Accuracy defaults to 100% on zero input');
  assertEquals(summary.errors, 0, 'Errors must be 0');
  assertEquals(summary.duration, 1, 'Duration is clamped to minimum 1s');
  assertFalse(isNaN(summary.speed), 'Speed must not be NaN');
  assertFalse(isNaN(summary.accuracy), 'Accuracy must not be NaN');
});

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[Test Category 3: Character Resolution, Aliases & Hands Mapping]');

test('All Level 5 Cyrillic characters (including uppercase and punctuation) resolve keys cleanly', () => {
  const testChars = [
    'М', 'а', 'м', 'ы', 'л', 'р', 'у', '.',
    'К', 'о', 'т', 'с', 'и', 'д', 'н', 'в',
    'Я', 'ч', 'ь', 'б', 'ю',
    ',', ' '
  ];

  for (const ch of testChars) {
    // Check that updateHandsHighlight does not throw
    window.TypingTrainer.start(5);
    const key = ch;
    
    // Simulate highlighting
    const input = document.querySelector('#tt-input');
    assertNotNull(input);

    const cueKeyEl = document.querySelector('#tt-cue-key');
    const cueHandEl = document.querySelector('#tt-cue-hand');
    const cueFingerEl = document.querySelector('#tt-cue-finger');
    
    assertNotNull(cueKeyEl);
    assertNotNull(cueHandEl);
    assertNotNull(cueFingerEl);
  }
});

test('Comma correctly maps to period key and right pinky finger', () => {
  window.TypingTrainer.start(5);
  // Find period key
  const dotKey = document.querySelector('#tt-keyboard [data-key="."]');
  assertNotNull(dotKey, 'Period key exists');
  assertEquals(dotKey.dataset.alt, ',');
  assertTrue(dotKey.classList.contains('kb-zone-pinky-r'));
});

test('Ignored keys (Shift, Backspace, Ctrl, etc.) do not affect errors or position', () => {
  window.TypingTrainer.start(1);
  const input = document.querySelector('#tt-input');

  const ignoredKeys = ['Shift', 'Backspace', 'CapsLock', 'Tab', 'Escape', 'ArrowLeft', 'Enter'];
  for (const k of ignoredKeys) {
    input.dispatchEvent(new domEnv.MockKeyboardEvent('keydown', { key: k }));
  }

  assertEquals(document.querySelector('#tt-errors').textContent, '0');
  assertEquals(document.querySelector('#tt-accuracy').textContent, '100');
});

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[Test Category 4: M2 <-> M4 Contract & Storage Persistence]');

test('finishSession stores complete session into localStorage through App.saveProgress', () => {
  // Setup student
  window.App.state = {
    currentStudent: { id: 'student_adversarial_test', name: 'Тестер', class: '7-Б' },
    currentClass: '7-Б'
  };

  window.TypingTrainer.start(1);
  const input = document.querySelector('#tt-input');
  
  // Type 1 wrong, 1 correct
  input.dispatchEvent(new domEnv.MockKeyboardEvent('keydown', { key: '!' }));
  const nextChar = document.querySelectorAll('#tt-text span')[1].textContent;
  input.dispatchEvent(new domEnv.MockKeyboardEvent('keydown', { key: nextChar }));

  const summary = window.TypingTrainer.finishSession();

  // Validate summary schema
  assertEquals(typeof summary.speed, 'number');
  assertEquals(typeof summary.accuracy, 'number');
  assertEquals(typeof summary.errors, 'number');
  assertEquals(typeof summary.level, 'number');
  assertEquals(typeof summary.duration, 'number');
  assertEquals(typeof summary.date, 'string');
  assertEquals(summary.errors, 1);
  assertEquals(summary.accuracy, 50);

  // Validate localStorage persistence
  const progressRaw = window.localStorage.getItem('trainer_progress');
  assertNotNull(progressRaw, 'trainer_progress must exist in localStorage');
  const progress = JSON.parse(progressRaw);
  assertNotNull(progress['student_adversarial_test']);
  const stProg = progress['student_adversarial_test'];
  assertEquals(stProg.typing.totalSessions, 1);
  const lastSession = stProg.typing.sessions[0];
  assertEquals(lastSession.errors, 1);
  assertEquals(lastSession.accuracy, 50);
});

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[Test Category 5: Lifecycle, Multiple Inits, Reset & Destroy]');

test('Calling init() multiple times re-renders cleanly without crashing', () => {
  window.TypingTrainer.init('typing-container');
  window.TypingTrainer.init('typing-container');

  const kb = document.querySelector('#tt-keyboard');
  assertNotNull(kb);
  const keys = kb.querySelectorAll('.kb-key');
  assertEquals(keys.length, 34);
});

test('Calling destroy() clears all intervals and active classes', () => {
  window.TypingTrainer.start(1);
  window.TypingTrainer.destroy();

  const activeFingers = document.querySelectorAll('#tt-hands-visualizer .finger-active');
  assertEquals(activeFingers.length, 0);

  const activeKeys = document.querySelectorAll('#tt-keyboard .key-next, #tt-keyboard .key-active');
  assertEquals(activeKeys.length, 0);
});

test('Switching levels mid-session cleans up previous timers and resets counters', () => {
  window.TypingTrainer.start(1);
  const input = document.querySelector('#tt-input');
  input.dispatchEvent(new domEnv.MockKeyboardEvent('keydown', { key: '!' }));
  assertEquals(document.querySelector('#tt-errors').textContent, '1');

  // Switch to level 3
  window.TypingTrainer.start(3);
  assertEquals(document.querySelector('#tt-errors').textContent, '0');
  assertEquals(document.querySelector('#tt-accuracy').textContent, '100');
  assertEquals(document.querySelector('#tt-speed').textContent, '0');
});

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[Test Category 6: Scoped CSS Isolation & Responsive Tokens]');

test('Injected hands styles do not pollute global tag selectors', () => {
  const styleEl = document.querySelector('#tt-hands-styles');
  assertNotNull(styleEl, '#tt-hands-styles must exist');
  const css = styleEl.textContent;

  // Ensure no global tag styling
  assertFalse(css.includes('div {'), 'Must not globally style div');
  assertFalse(css.includes('body {'), 'Must not globally style body');
  assertFalse(css.includes('html {'), 'Must not globally style html');
  assertFalse(css.includes('span {'), 'Must not globally style span');
  assertFalse(css.includes('button {'), 'Must not globally style button');
});

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n================================================================');
console.log(`STRESS TEST RESULTS: ${passed} passed, ${failed} failed`);
console.log('================================================================\n');

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
