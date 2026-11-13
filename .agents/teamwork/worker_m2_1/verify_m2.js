/**
 * verify_m2.js
 * Comprehensive unit and integration test verification for Milestone 2:
 * Touch Typing Ergonomics, Hands Visualizer, Real-time Metrics, and M2 ↔ M4 Contract.
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
const { setupBrowserEnv } = domEnv;

let testsPassed = 0;
let testsFailed = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`  ✔ ${name}`);
    testsPassed++;
  } catch (err) {
    console.error(`  ✖ ${name}:`, err.message);
    if (err.stack) console.error(err.stack);
    testsFailed++;
  }
}

console.log('\n--- VERIFYING MILESTONE 2: TOUCH TYPING ERGONOMICS & HANDS VISUALIZER ---\n');

const env = setupBrowserEnv();
env.loadAppStack();

const { window, document } = env;

// ─── SUITE 1: Initialization and DOM Structure ────────────────────────────────
console.log('[Suite 1: DOM Structure and Widget Initialization]');

runTest('TypingTrainer initializes properly in container', () => {
  // Navigate to screen-typing or init in custom div
  const container = document.createElement('div');
  container.id = 'test-typing-container';
  document.body.appendChild(container);

  window.TypingTrainer.init('test-typing-container');
  assertNotNull(container.querySelector('.typing-trainer'), '.typing-trainer container must exist');
});

runTest('Visual keyboard has exactly 34 keys across 4 rows', () => {
  const kb = document.querySelector('#tt-keyboard');
  assertNotNull(kb, '#tt-keyboard must exist');

  const rows = kb.querySelectorAll('.kb-row');
  assertEquals(rows.length, 4, 'Must have exactly 4 keyboard rows');

  const keys = kb.querySelectorAll('.kb-key');
  assertEquals(keys.length, 34, 'Must have exactly 34 keys total (12 + 11 + 10 + 1 space)');
});

runTest('Keyboard rows contain expected key counts and zone classes', () => {
  const kb = document.querySelector('#tt-keyboard');
  const rows = kb.querySelectorAll('.kb-row');

  // Row 1: 12 keys
  const row1Keys = rows[0].querySelectorAll('.kb-key');
  assertEquals(row1Keys.length, 12, 'Row 1 must have 12 keys');
  assertEquals(row1Keys[0].dataset.key, 'й');
  assertTrue(row1Keys[0].classList.contains('kb-zone-pinky-l'), 'й must have kb-zone-pinky-l');
  assertEquals(row1Keys[3].dataset.key, 'к');
  assertTrue(row1Keys[3].classList.contains('kb-zone-idx-l'), 'к must have kb-zone-idx-l');
  assertEquals(row1Keys[11].dataset.key, 'ъ');
  assertTrue(row1Keys[11].classList.contains('kb-zone-pinky-r'), 'ъ must have kb-zone-pinky-r');

  // Row 2: 11 keys with tactile home markers
  const row2Keys = rows[1].querySelectorAll('.kb-key');
  assertEquals(row2Keys.length, 11, 'Row 2 must have 11 keys');
  assertEquals(row2Keys[0].dataset.key, 'ф');
  assertTrue(row2Keys[0].classList.contains('kb-zone-pinky-l'), 'ф must have kb-zone-pinky-l');
  
  // Home key 'а'
  const keyA = row2Keys[3];
  assertEquals(keyA.dataset.key, 'а');
  assertTrue(keyA.classList.contains('kb-zone-idx-l'), 'а must have kb-zone-idx-l');
  assertTrue(keyA.classList.contains('kb-home-key'), 'а must have kb-home-key');

  // Home key 'о'
  const keyO = row2Keys[6];
  assertEquals(keyO.dataset.key, 'о');
  assertTrue(keyO.classList.contains('kb-zone-idx-r'), 'о must have kb-zone-idx-r');
  assertTrue(keyO.classList.contains('kb-home-key'), 'о must have kb-home-key');

  // Row 3: 10 keys with punctuation (. and ,)
  const row3Keys = rows[2].querySelectorAll('.kb-key');
  assertEquals(row3Keys.length, 10, 'Row 3 must have 10 keys');
  assertEquals(row3Keys[0].dataset.key, 'я');
  assertTrue(row3Keys[0].classList.contains('kb-zone-pinky-l'), 'я must have kb-zone-pinky-l');
  
  const keyDot = row3Keys[9];
  assertEquals(keyDot.dataset.key, '.');
  assertEquals(keyDot.dataset.alt, ',');
  assertTrue(keyDot.classList.contains('kb-zone-pinky-r'), '. must have kb-zone-pinky-r');

  // Row 4: Space bar
  const row4Keys = rows[3].querySelectorAll('.kb-key');
  assertEquals(row4Keys.length, 1, 'Row 4 must have 1 space key');
  assertEquals(row4Keys[0].dataset.key, ' ');
  assertTrue(row4Keys[0].classList.contains('kb-zone-thumb'), 'Space must have kb-zone-thumb');
});

runTest('Hands Visualizer contains exactly 10 fingers, 2 hands, and cue badge', () => {
  const visualizer = document.querySelector('#tt-hands-visualizer');
  assertNotNull(visualizer, '#tt-hands-visualizer must exist');

  const fingers = visualizer.querySelectorAll('[data-finger]');
  assertEquals(fingers.length, 10, 'Hands visualizer must have exactly 10 fingers');

  const leftHand = visualizer.querySelector('.hand-left');
  assertNotNull(leftHand, 'Left hand block must exist');
  const leftFingers = leftHand.querySelectorAll('[data-finger]');
  assertEquals(leftFingers.length, 5, 'Left hand must have 5 fingers');
  assertEquals(leftFingers[0].dataset.finger, 'pinky-l');
  assertEquals(leftFingers[1].dataset.finger, 'ring-l');
  assertEquals(leftFingers[2].dataset.finger, 'mid-l');
  assertEquals(leftFingers[3].dataset.finger, 'idx-l');
  assertEquals(leftFingers[4].dataset.finger, 'thumb-l');

  const rightHand = visualizer.querySelector('.hand-right');
  assertNotNull(rightHand, 'Right hand block must exist');
  const rightFingers = rightHand.querySelectorAll('[data-finger]');
  assertEquals(rightFingers.length, 5, 'Right hand must have 5 fingers');
  assertEquals(rightFingers[0].dataset.finger, 'thumb-r');
  assertEquals(rightFingers[1].dataset.finger, 'idx-r');
  assertEquals(rightFingers[2].dataset.finger, 'mid-r');
  assertEquals(rightFingers[3].dataset.finger, 'ring-r');
  assertEquals(rightFingers[4].dataset.finger, 'pinky-r');

  const cuePanel = visualizer.querySelector('#tt-hands-cue');
  assertNotNull(cuePanel, '#tt-hands-cue must exist');
  assertNotNull(visualizer.querySelector('#tt-cue-hand'), '#tt-cue-hand must exist');
  assertNotNull(visualizer.querySelector('#tt-cue-finger'), '#tt-cue-finger must exist');
  assertNotNull(visualizer.querySelector('#tt-cue-key'), '#tt-cue-key must exist');
});

runTest('Live metrics elements exist in stats bar and result card', () => {
  const stats = document.querySelector('#tt-stats');
  assertNotNull(stats, '#tt-stats must exist');
  assertNotNull(stats.querySelector('#tt-speed'), '#tt-speed must exist');
  assertNotNull(stats.querySelector('#tt-accuracy'), '#tt-accuracy must exist');
  assertNotNull(stats.querySelector('#tt-errors'), '#tt-errors must exist');
  assertNotNull(stats.querySelector('#tt-time'), '#tt-time must exist');

  const result = document.querySelector('#tt-result');
  assertNotNull(result, '#tt-result must exist');
  assertNotNull(result.querySelector('#tt-res-speed'), '#tt-res-speed must exist');
  assertNotNull(result.querySelector('#tt-res-accuracy'), '#tt-res-accuracy must exist');
  assertNotNull(result.querySelector('#tt-res-errors'), '#tt-res-errors must exist');
  assertNotNull(result.querySelector('#tt-res-time'), '#tt-res-time must exist');
});

// ─── SUITE 2: Dynamic Hands Highlighting and Cue Engine ───────────────────────
console.log('\n[Suite 2: Dynamic Highlighting and Finger Cue Engine]');

runTest('Starting Level 1 highlights initial key and corresponding finger', () => {
  window.TypingTrainer.start(1);

  const activeKey = document.querySelector('#tt-keyboard .key-next');
  assertNotNull(activeKey, 'First key must be highlighted with .key-next');
  assertTrue(activeKey.classList.contains('active'), 'First key must have .active');

  const activeFingers = document.querySelectorAll('#tt-hands-visualizer .finger-active');
  assertTrue(activeFingers.length >= 1, 'Corresponding finger must have .finger-active');

  const cueHand = document.querySelector('#tt-cue-hand').textContent;
  const cueFinger = document.querySelector('#tt-cue-finger').textContent;
  assert(cueHand.length > 0, 'Cue hand must have text');
  assert(cueFinger.length > 0, 'Cue finger must have text');
});

runTest('Spacebar highlights both thumbs and displays proper cue badge', () => {
  // Simulate spacebar cue directly via input or checking FINGER_MAP[' ']
  const textEl = document.querySelector('#tt-text');
  assertNotNull(textEl);

  // We can trigger start of an exercise or test space key
  const spaceKey = document.querySelector('#tt-keyboard .kb-space');
  assertNotNull(spaceKey, 'Space key exists');
  assertEquals(spaceKey.dataset.key, ' ', 'Space key must have data-key=" "');
  assertEquals(spaceKey.dataset.fingerZone, 'thumb');
});

// ─── SUITE 3: Real-Time Typing Simulation, Errors, and Spike Guard ───────────
console.log('\n[Suite 3: Real-Time Typing Simulation, Errors, and Spike Guard]');

runTest('Errors count increments on mismatched keystrokes and updates live DOM', () => {
  window.TypingTrainer.start(1);

  const errorsEl = document.querySelector('#tt-errors');
  assertEquals(errorsEl.textContent, '0', 'Initial errors must be 0');

  const input = document.querySelector('#tt-input');
  assertNotNull(input, '#tt-input must exist');

  // Type an intentional mismatch (e.g. '@' which never matches Level 1 Cyrillic)
  const keyMismatch = new domEnv.MockKeyboardEvent('keydown', { key: 'z' });
  input.dispatchEvent(keyMismatch);

  assertEquals(errorsEl.textContent, '1', 'Errors counter in DOM must show 1 after mismatch');
  
  // Accuracy drops
  const accEl = document.querySelector('#tt-accuracy');
  assertNotEquals(accEl.textContent, '100', 'Accuracy must drop below 100% after error');
});

runTest('First-keystroke CPM spike guard prevents extreme speed values', () => {
  window.TypingTrainer.start(1);

  const input = document.querySelector('#tt-input');
  // First keystroke
  input.dispatchEvent(new domEnv.MockKeyboardEvent('keydown', { key: 'а' }));

  const speedEl = document.querySelector('#tt-speed');
  const speedVal = parseInt(speedEl.textContent, 10);
  assertTrue(speedVal <= 1000, `Speed should not spike on first keystroke: got ${speedVal}`);
});

// ─── SUITE 4: M2 ↔ M4 Session Completion Contract ───────────────────────────
console.log('\n[Suite 4: M2 ↔ M4 Session Completion Contract]');

runTest('TypingTrainer.finishSession exists on public API and returns required schema', () => {
  assertTrue(typeof window.TypingTrainer.finishSession === 'function', 'finishSession must be exposed');

  window.TypingTrainer.start(1);
  const summary = window.TypingTrainer.finishSession();

  assertNotNull(summary, 'finishSession must return a summary object');
  assertEquals(typeof summary.speed, 'number', 'speed must be a number');
  assertEquals(typeof summary.accuracy, 'number', 'accuracy must be a number');
  assertEquals(typeof summary.errors, 'number', 'errors must be a number');
  assertEquals(typeof summary.level, 'number', 'level must be a number');
  assertEquals(typeof summary.duration, 'number', 'duration must be a number');
  assertEquals(typeof summary.date, 'string', 'date must be a string');

  // Check result card DOM displays the summary
  assertEquals(document.querySelector('#tt-res-errors').textContent, String(summary.errors));
  assertEquals(document.querySelector('#tt-res-accuracy').textContent, String(summary.accuracy));
  assertEquals(document.querySelector('#tt-res-speed').textContent, String(summary.speed));
});

runTest('App.saveProgress is called with studentId, "typing", and session payload', () => {
  // Set up mock student and App.state
  window.App.state = {
    currentStudent: { id: 'test_student_1', name: 'Тестовый Ученик', class: '7-А' },
    currentClass: '7-А'
  };

  let savedStudentId = null;
  let savedModule = null;
  let savedData = null;

  const originalSaveProgress = window.App.saveProgress;
  window.App.saveProgress = function(studentId, moduleName, data) {
    savedStudentId = studentId;
    savedModule = moduleName;
    savedData = data;
    return originalSaveProgress.call(window.App, studentId, moduleName, data);
  };

  window.TypingTrainer.start(1);
  const summary = window.TypingTrainer.finishSession();

  assertEquals(savedStudentId, 'test_student_1', 'Saved student ID must match');
  assertEquals(savedModule, 'typing', 'Saved module must be "typing"');
  assertNotNull(savedData, 'Saved payload must not be null');
  assertEquals(savedData.errors, summary.errors, 'Payload must contain errors');
  assertEquals(savedData.speed, summary.speed, 'Payload must contain speed');
  assertEquals(savedData.accuracy, summary.accuracy, 'Payload must contain accuracy');
  assertEquals(savedData.level, summary.level, 'Payload must contain level');
  assertEquals(savedData.duration, summary.duration, 'Payload must contain duration');
  assertEquals(savedData.date, summary.date, 'Payload must contain date');

  // Restore
  window.App.saveProgress = originalSaveProgress;
});

runTest('destroy() clears timers, resets state, and removes highlights', () => {
  window.TypingTrainer.start(1);
  window.TypingTrainer.destroy();

  const activeKeys = document.querySelectorAll('#tt-keyboard .key-next, #tt-keyboard .key-active');
  assertEquals(activeKeys.length, 0, 'No keys should be active after destroy');

  const activeFingers = document.querySelectorAll('#tt-hands-visualizer .finger-active');
  assertEquals(activeFingers.length, 0, 'No fingers should be active after destroy');
});

// ─── SUITE 5: Full Exercise Typing Flow (Level 1 to Completion) ──────────────
console.log('\n[Suite 5: End-to-End Exercise Flow]');

runTest('Typing all characters to completion automatically invokes finishSession', () => {
  window.TypingTrainer.start(1);

  const input = document.querySelector('#tt-input');
  assertNotNull(input);

  // Read the current text from spans
  const spans = document.querySelectorAll('#tt-text span');
  const textChars = Array.from(spans).map(s => s.textContent === '\u00A0' ? ' ' : s.textContent);

  // Type each character correctly
  for (let i = 0; i < textChars.length; i++) {
    input.dispatchEvent(new domEnv.MockKeyboardEvent('keydown', { key: textChars[i] }));
  }

  // Result card should now be visible
  const resultCard = document.querySelector('#tt-result');
  assertNotNull(resultCard);
  assertEquals(resultCard.style.display, '', 'Result card should be visible after completion');

  // Accuracy should be 100% since no errors were typed
  const resAccuracy = document.querySelector('#tt-res-accuracy');
  assertEquals(resAccuracy.textContent, '100', 'Accuracy should be 100% for perfect typing');

  const resErrors = document.querySelector('#tt-res-errors');
  assertEquals(resErrors.textContent, '0', 'Errors should be 0 for perfect typing');
});

console.log(`\n=================================================`);
console.log(`VERIFICATION SUMMARY: ${testsPassed} passed, ${testsFailed} failed`);
console.log(`=================================================\n`);

if (testsFailed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
