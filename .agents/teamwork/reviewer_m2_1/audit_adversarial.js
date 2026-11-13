/**
 * audit_adversarial.js
 * Adversarial stress tests and boundary condition verification for Milestone 2.
 * Run by Reviewer M2.1.
 */

'use strict';

const path = require('node:path');
const fs = require('node:fs');
const projectRoot = path.resolve(__dirname, '../../..');

const domEnv = require(path.join(projectRoot, 'tests/helpers/dom_env'));
const { setupBrowserEnv } = domEnv;

let passed = 0;
let failed = 0;
const findings = [];

function check(name, fn) {
  try {
    fn();
    console.log(`  PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`  FAIL: ${name}`);
    console.error(`        Error: ${err.message}`);
    findings.push({ name, error: err.message, stack: err.stack });
    failed++;
  }
}

console.log('\n=== ADVERSARIAL STRESS TEST & AUDIT SUITE (REVIEWER M2.1) ===\n');

const env = setupBrowserEnv();
env.loadAppStack();
const { window, document } = env;

// ─── 1. INTEGRITY AUDIT ───────────────────────────────────────────────────────
console.log('[Section 1: Code Integrity & Anti-Cheat Audit]');

check('Source code contains no hardcoded test credentials or test-specific skips', () => {
  const code = fs.readFileSync(path.join(projectRoot, 'modules/typing.js'), 'utf8');
  if (code.includes('test_student_1') || code.includes('verify_m2') || code.includes('runner.js')) {
    throw new Error('Integrity violation: test-specific identifiers embedded in typing.js');
  }
  if (code.includes('__MOCK__') || code.includes('process.env.NODE_ENV === "test"')) {
    throw new Error('Integrity violation: test-environment bypass branch found');
  }
});

check('finishSession() generates dynamic calculations, not static facades', () => {
  window.TypingTrainer.init('typing-container');
  window.TypingTrainer.start(1);

  const input = document.querySelector('#tt-input');
  // Type 3 wrong characters
  input.dispatchEvent(new domEnv.MockKeyboardEvent('keydown', { key: '!' }));
  input.dispatchEvent(new domEnv.MockKeyboardEvent('keydown', { key: '?' }));
  input.dispatchEvent(new domEnv.MockKeyboardEvent('keydown', { key: '%' }));

  const summary = window.TypingTrainer.finishSession();
  if (summary.errors !== 3) {
    throw new Error(`Expected summary.errors to be 3, got ${summary.errors}`);
  }
  if (summary.accuracy !== 0) {
    throw new Error(`Expected accuracy 0% with 3 errors and 0 correct, got ${summary.accuracy}%`);
  }
});

// ─── 2. KEYBOARD LAYOUT & HOMOGLYPHS AUDIT ──────────────────────────────────
console.log('\n[Section 2: Keyboard Layout & 10-Finger Zone Audit]');

check('Keyboard has exactly 34 physical keys and complete zone assignment', () => {
  window.TypingTrainer.init('typing-container');
  const kb = document.querySelector('#tt-keyboard');
  const keys = Array.from(kb.querySelectorAll('.kb-key'));
  if (keys.length !== 34) {
    throw new Error(`Expected 34 keys, found ${keys.length}`);
  }

  const expectedZones = [
    'kb-zone-pinky-l', 'kb-zone-ring-l', 'kb-zone-mid-l', 'kb-zone-idx-l',
    'kb-zone-idx-r', 'kb-zone-mid-r', 'kb-zone-ring-r', 'kb-zone-pinky-r', 'kb-zone-thumb'
  ];

  for (const k of keys) {
    const hasValidZone = expectedZones.some(z => k.classList.contains(z));
    if (!hasValidZone) {
      throw new Error(`Key '${k.textContent}' (${k.dataset.key}) has no valid zone class: ${k.className}`);
    }
  }
});

check('Tactile home markers exist strictly on "а" and "о"', () => {
  const homeKeys = Array.from(document.querySelectorAll('#tt-keyboard .kb-home-key'));
  if (homeKeys.length !== 2) {
    throw new Error(`Expected exactly 2 home keys, found ${homeKeys.length}`);
  }
  const homeKeyChars = homeKeys.map(k => k.dataset.key).sort();
  if (homeKeyChars[0] !== 'а' || homeKeyChars[1] !== 'о') {
    throw new Error(`Expected home keys 'а' and 'о', got ${homeKeyChars.join(', ')}`);
  }
});

check('Punctuation key correctly maps dot and comma without selector syntax errors', () => {
  const dotKey = document.querySelector('#tt-keyboard [data-key="."]');
  if (!dotKey) throw new Error('Key [data-key="."] not found');
  if (dotKey.dataset.alt !== ',') throw new Error(`Key '.' alt attribute is not ',', got '${dotKey.dataset.alt}'`);
  if (!dotKey.classList.contains('kb-zone-pinky-r')) throw new Error('Key . must belong to kb-zone-pinky-r');
});

// ─── 3. HANDS VISUALIZER 10-FINGER AUDIT ─────────────────────────────────────
console.log('\n[Section 3: Hands Visualizer 10-Finger Highlighting Audit]');

check('All 10 fingers are uniquely identifiable and correctly structured', () => {
  const visualizer = document.querySelector('#tt-hands-visualizer');
  if (!visualizer) throw new Error('#tt-hands-visualizer not found');

  const fingers = Array.from(visualizer.querySelectorAll('[data-finger]'));
  if (fingers.length !== 10) throw new Error(`Expected 10 fingers, got ${fingers.length}`);

  const expectedFingerIds = [
    'pinky-l', 'ring-l', 'mid-l', 'idx-l', 'thumb-l',
    'thumb-r', 'idx-r', 'mid-r', 'ring-r', 'pinky-r'
  ];

  for (const fid of expectedFingerIds) {
    const el = visualizer.querySelector(`[data-finger="${fid}"]`);
    if (!el) throw new Error(`Finger [data-finger="${fid}"] missing from visualizer`);
  }
});

check('Spacebar activates BOTH thumbs and shows dual-hand cue', () => {
  window.TypingTrainer.start(1);
  // Find cue badge and simulate space character
  // We can test updateHandsHighlight indirectly or through typing
  const kb = document.querySelector('#tt-keyboard');
  const spaceKey = kb.querySelector('.kb-space');
  if (!spaceKey) throw new Error('.kb-space missing');

  // Let's test typing space by dispatching key
  // First clear any active finger
  const visualizer = document.querySelector('#tt-hands-visualizer');
  visualizer.querySelectorAll('.finger-active').forEach(f => f.classList.remove('finger-active'));

  // Test by manually checking FINGER_MAP mapping for ' '
  // Or by starting Level 5 where space occurs
  window.TypingTrainer.start(5);
  // In Level 5, sentence has spaces. Let's type until space is current:
  const textEl = document.querySelector('#tt-text');
  const input = document.querySelector('#tt-input');
  let currentKey = document.querySelector('#tt-keyboard .key-next');
  let safety = 0;
  while (currentKey && currentKey.dataset.key !== ' ' && safety < 100) {
    input.dispatchEvent(new domEnv.MockKeyboardEvent('keydown', { key: currentKey.dataset.key }));
    currentKey = document.querySelector('#tt-keyboard .key-next');
    safety++;
  }

  if (currentKey && currentKey.dataset.key === ' ') {
    const activeFingers = visualizer.querySelectorAll('.finger-active');
    if (activeFingers.length !== 2) {
      throw new Error(`Space key should activate 2 thumbs, got ${activeFingers.length} active fingers`);
    }
    const thumbL = visualizer.querySelector('[data-finger="thumb-l"].finger-active');
    const thumbR = visualizer.querySelector('[data-finger="thumb-r"].finger-active');
    if (!thumbL || !thumbR) {
      throw new Error('Both thumb-l and thumb-r must have .finger-active on space');
    }
    const cueHand = document.querySelector('#tt-cue-hand').textContent;
    const cueKey = document.querySelector('#tt-cue-key').textContent;
    if (!cueHand.includes('Обе руки')) {
      throw new Error(`Expected cue hand 'Обе руки', got '${cueHand}'`);
    }
    if (!cueKey.includes('Пробел')) {
      throw new Error(`Expected cue key 'Пробел', got '${cueKey}'`);
    }
  }
});

// ─── 4. ADVERSARIAL STRESS: POST-COMPLETION KEYSTROKES ─────────────────────────
console.log('\n[Section 4: Adversarial Stress — Post-Completion & Edge Cases]');

check('Extra keystrokes after exercise completion do not corrupt errors or double-invoke', () => {
  window.TypingTrainer.start(1);
  const textEl = document.querySelector('#tt-text');
  const input = document.querySelector('#tt-input');
  const spans = textEl.querySelectorAll('span');
  const text = Array.from(spans).map(s => s.textContent === '\u00a0' ? ' ' : s.textContent).join('');

  for (let i = 0; i < text.length; i++) {
    input.dispatchEvent(new domEnv.MockKeyboardEvent('keydown', { key: text[i] }));
  }

  const errorsImmediately = parseInt(document.querySelector('#tt-errors').textContent, 10);
  const resErrorsImmediately = parseInt(document.querySelector('#tt-res-errors').textContent, 10);

  // Now press 3 more keystrokes after completion!
  input.dispatchEvent(new domEnv.MockKeyboardEvent('keydown', { key: 'а' }));
  input.dispatchEvent(new domEnv.MockKeyboardEvent('keydown', { key: 'б' }));
  input.dispatchEvent(new domEnv.MockKeyboardEvent('keydown', { key: 'в' }));

  const errorsAfter = parseInt(document.querySelector('#tt-errors').textContent, 10);
  const resErrorsAfter = parseInt(document.querySelector('#tt-res-errors').textContent, 10);

  console.log(`      [Adversarial Probe] Errors before extra keys: ${errorsImmediately}, after: ${errorsAfter}`);
  if (errorsAfter !== errorsImmediately || resErrorsAfter !== resErrorsImmediately) {
    // Note: this is a potential bug or nuance to investigate
    throw new Error(`Post-completion keystrokes altered error count: was ${errorsImmediately}, became ${errorsAfter}`);
  }
});

check('Safe key lookup withstands bizarre/adversarial input without throwing', () => {
  const input = document.querySelector('#tt-input');
  window.TypingTrainer.start(1);

  // Send weird unicode, control characters, CSS injection payloads
  const adversarialKeys = [
    '§', '¶', '€', '™', '\u0000', '\uFFFF', '"><script>', '[data-key="',
    '\\', '"', '\'', 'undefined', 'null', '123'
  ];

  for (const k of adversarialKeys) {
    try {
      input.dispatchEvent(new domEnv.MockKeyboardEvent('keydown', { key: k }));
    } catch (e) {
      throw new Error(`Crashed on adversarial key '${k}': ${e.message}`);
    }
  }
});

check('Negative or out-of-range start() levels are safely clamped', () => {
  window.TypingTrainer.start(-1);
  if (!document.querySelector('#tt-level-title').textContent.includes('Уровень 1')) {
    throw new Error('Level -1 was not clamped to Level 1');
  }

  window.TypingTrainer.start(999);
  if (!document.querySelector('#tt-level-title').textContent.includes('Уровень 5')) {
    throw new Error('Level 999 was not clamped to Level 5');
  }

  window.TypingTrainer.start('invalid');
  if (!document.querySelector('#tt-level-title').textContent.includes('Уровень 1')) {
    throw new Error('NaN level was not defaulted to Level 1');
  }
});

// ─── 5. SUMMARY ──────────────────────────────────────────────────────────────
console.log('\n=================================================');
console.log(`ADVERSARIAL AUDIT COMPLETE: ${passed} passed, ${failed} failed`);
console.log('=================================================\n');

if (findings.length > 0) {
  console.log('Findings:');
  findings.forEach((f, idx) => {
    console.log(`[Finding ${idx + 1}] ${f.name}: ${f.error}`);
  });
}
