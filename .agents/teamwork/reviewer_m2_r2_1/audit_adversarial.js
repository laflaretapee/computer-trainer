/**
 * audit_adversarial.js
 * Independent Adversarial Stress Test & Verification Suite for Milestone 2 Iteration 2.
 * Run by Reviewer M2.R2.1.
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

console.log('\n=== ADVERSARIAL AUDIT & STRESS SUITE (REVIEWER M2.R2.1) ===\n');

const env = setupBrowserEnv();
env.loadAppStack();
const { window, document } = env;

// ─── 1. INTEGRITY AUDIT ───────────────────────────────────────────────────────
console.log('[Section 1: Code Integrity & Anti-Cheat Audit]');

check('Source code contains no hardcoded test credentials or test-specific skips', () => {
  const code = fs.readFileSync(path.join(projectRoot, 'modules/typing.js'), 'utf8');
  const suspicious = [
    'test_student_1', 'verify_m2', 'runner.js', '__MOCK__', 'process.env',
    'MockKeyboardEvent', 'hasPostCompletionVulnerability', 'retainsPreviousTime'
  ];
  for (const s of suspicious) {
    if (code.includes(s)) {
      throw new Error(`Integrity violation: suspicious pattern '${s}' found in modules/typing.js`);
    }
  }
});

check('Boundary test assertions in test_typing_metrics_boundaries.test.js are non-trivial', () => {
  const testCode = fs.readFileSync(
    path.join(projectRoot, 'tests/tier2_boundaries/test_typing_metrics_boundaries.test.js'),
    'utf8'
  );
  if (!testCode.includes("assertEquals(errorsAfter, '0'") ||
      !testCode.includes("assertEquals(liveErrors, '0'") ||
      !testCode.includes("assertEquals(timeOnRestart, '0:00'")) {
    throw new Error('Integrity violation: Expected boundary assertions missing or weakened');
  }
});

// ─── 2. POST-COMPLETION HARDENING ─────────────────────────────────────────────
console.log('\n[Section 2: Post-Completion Keystroke Flood & Focus Isolation]');

check('200 post-completion keystrokes do not corrupt errors, position, or HUD', () => {
  window.TypingTrainer.init('screen-typing');
  window.TypingTrainer.start(1);

  const spans = document.querySelectorAll('#tt-text span');
  const input = document.querySelector('#tt-input');
  const fullText = Array.from(spans).map(s => s.textContent === '\u00A0' ? ' ' : s.textContent).join('');

  // Complete exercise
  for (let i = 0; i < fullText.length; i++) {
    input.dispatchEvent(new domEnv.MockKeyboardEvent('keydown', { key: fullText[i] }));
  }

  const errorsAtFinish = document.querySelector('#tt-errors').textContent;
  const resErrorsAtFinish = document.querySelector('#tt-res-errors').textContent;
  if (errorsAtFinish !== '0' || resErrorsAtFinish !== '0') {
    throw new Error(`Expected 0 errors at finish, got live=${errorsAtFinish}, res=${resErrorsAtFinish}`);
  }

  // Flood 200 random keystrokes
  const adversarialKeys = ['a', 'б', 'в', 'г', ' ', '.', ',', 'Backspace', 'Enter', '1', '2', 'Shift', 'Escape'];
  for (let i = 0; i < 200; i++) {
    const k = adversarialKeys[i % adversarialKeys.length];
    input.dispatchEvent(new domEnv.MockKeyboardEvent('keydown', { key: k }));
  }

  const errorsAfterFlood = document.querySelector('#tt-errors').textContent;
  const resErrorsAfterFlood = document.querySelector('#tt-res-errors').textContent;

  if (errorsAfterFlood !== '0' || resErrorsAfterFlood !== '0') {
    throw new Error(`Post-completion flood corrupted errors: live=${errorsAfterFlood}, res=${resErrorsAfterFlood}`);
  }
});

check('Container click post-completion does NOT restore focus to input', () => {
  window.TypingTrainer.init('screen-typing');
  window.TypingTrainer.start(1);

  const spans = document.querySelectorAll('#tt-text span');
  const input = document.querySelector('#tt-input');
  for (const s of spans) {
    const ch = s.textContent === '\u00A0' ? ' ' : s.textContent;
    input.dispatchEvent(new domEnv.MockKeyboardEvent('keydown', { key: ch }));
  }

  let focused = false;
  input.focus = () => { focused = true; };

  const container = document.querySelector('.typing-trainer');
  container.dispatchEvent(new domEnv.MockMouseEvent('click', { bubbles: true }));

  if (focused) {
    throw new Error('Input was focused on container click even though exercise is finished');
  }
});

check('App.saveProgress is invoked exactly once and never duplicated on post-completion keys', () => {
  let saveCalls = 0;
  const originalSave = window.App ? window.App.saveProgress : null;

  window.App.state.currentStudent = { id: 'student_7a_01', name: 'Иван Иванов', class: '7-А' };
  window.App.saveProgress = () => {
    saveCalls++;
  };

  try {
    window.TypingTrainer.init('screen-typing');
    window.TypingTrainer.start(1);

    const spans = document.querySelectorAll('#tt-text span');
    const input = document.querySelector('#tt-input');
    for (const s of spans) {
      const ch = s.textContent === '\u00A0' ? ' ' : s.textContent;
      input.dispatchEvent(new domEnv.MockKeyboardEvent('keydown', { key: ch }));
    }

    if (saveCalls !== 1) {
      throw new Error(`Expected saveCalls === 1 upon completion, got ${saveCalls}`);
    }

    // Extra keys
    for (let i = 0; i < 50; i++) {
      input.dispatchEvent(new domEnv.MockKeyboardEvent('keydown', { key: 'x' }));
    }

    if (saveCalls !== 1) {
      throw new Error(`saveCalls incremented after completion: now ${saveCalls}`);
    }
  } finally {
    if (originalSave) window.App.saveProgress = originalSave;
  }
});

// ─── 3. TIMER DISPLAY & RESTART INVARIANTS ────────────────────────────────────
console.log('\n[Section 3: Timer Resets & Lifecycle Invariants]');

check('#tt-time resets to "0:00" immediately on startLevel and destroy', () => {
  window.TypingTrainer.init('screen-typing');
  window.TypingTrainer.start(1);

  const timeEl = document.querySelector('#tt-time');
  timeEl.textContent = '1:23'; // Simulate stale running time

  // Restart level
  window.TypingTrainer.start(2);
  if (timeEl.textContent !== '0:00') {
    throw new Error(`Expected #tt-time to reset to '0:00' on start(2), got '${timeEl.textContent}'`);
  }

  timeEl.textContent = '2:45';
  window.TypingTrainer.destroy();
  if (timeEl.textContent !== '0:00') {
    throw new Error(`Expected #tt-time to reset to '0:00' on destroy(), got '${timeEl.textContent}'`);
  }
});

check('Rapid level switching (1 -> 2 -> 3 -> 4 -> 5 x 10) resets state cleanly without timer leaks', () => {
  window.TypingTrainer.init('screen-typing');

  for (let cycle = 0; cycle < 10; cycle++) {
    for (let lvl = 1; lvl <= 5; lvl++) {
      window.TypingTrainer.start(lvl);
    }
  }

  const timeEl = document.querySelector('#tt-time');
  if (timeEl.textContent !== '0:00') {
    throw new Error(`Expected #tt-time '0:00' after churn, got '${timeEl.textContent}'`);
  }

  const levelTitle = document.querySelector('#tt-level-title').textContent;
  if (!levelTitle.includes('Уровень 5')) {
    throw new Error(`Expected Level 5 active after churn, got '${levelTitle}'`);
  }
});

// ─── 4. MODIFIER KEY ISOLATION ────────────────────────────────────────────────
console.log('\n[Section 4: Modifier Key Isolation]');

check('Solo modifiers (Control, Alt, Meta, Shift, CapsLock, Tab) do NOT increment errors or start timer', () => {
  window.TypingTrainer.init('screen-typing');
  window.TypingTrainer.start(1);

  const input = document.querySelector('#tt-input');
  const soloModifiers = [
    'Control', 'Alt', 'Meta', 'Shift', 'CapsLock', 'Tab', 'Escape',
    'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12',
    'Insert', 'Delete', 'Home', 'End', 'PageUp', 'PageDown',
    'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Backspace', 'Enter'
  ];

  for (const mod of soloModifiers) {
    input.dispatchEvent(new domEnv.MockKeyboardEvent('keydown', { key: mod }));
  }

  const errors = document.querySelector('#tt-errors').textContent;
  if (errors !== '0') {
    throw new Error(`Solo modifier caused error increment: errors=${errors}`);
  }

  const timeEl = document.querySelector('#tt-time').textContent;
  if (timeEl !== '0:00') {
    throw new Error(`Solo modifier triggered timer: time=${timeEl}`);
  }
});

check('Modifier combinations (Ctrl+C, Alt+Tab, Meta+R) do NOT register as typing errors', () => {
  window.TypingTrainer.init('screen-typing');
  window.TypingTrainer.start(1);

  const input = document.querySelector('#tt-input');
  input.dispatchEvent(new domEnv.MockKeyboardEvent('keydown', { key: 'c', ctrlKey: true }));
  input.dispatchEvent(new domEnv.MockKeyboardEvent('keydown', { key: 'v', ctrlKey: true }));
  input.dispatchEvent(new domEnv.MockKeyboardEvent('keydown', { key: 'Tab', altKey: true }));
  input.dispatchEvent(new domEnv.MockKeyboardEvent('keydown', { key: 'r', metaKey: true }));

  const errors = document.querySelector('#tt-errors').textContent;
  if (errors !== '0') {
    throw new Error(`Modifier combination registered as typing error: errors=${errors}`);
  }
});

// ─── 5. UI RE-ENGAGEMENT & IDEMPOTENT TERMINATION ────────────────────────────
console.log('\n[Section 5: UI Re-engagement & Idempotent Termination]');

check('Retry button (#tt-btn-retry) resets _isFinished and allows re-typing', () => {
  window.TypingTrainer.init('screen-typing');
  window.TypingTrainer.start(1);

  const input = document.querySelector('#tt-input');
  const spans = document.querySelectorAll('#tt-text span');
  for (const s of spans) {
    const ch = s.textContent === '\u00A0' ? ' ' : s.textContent;
    input.dispatchEvent(new domEnv.MockKeyboardEvent('keydown', { key: ch }));
  }

  // Completed: now click retry
  const retryBtn = document.querySelector('#tt-btn-retry');
  if (!retryBtn) throw new Error('#tt-btn-retry missing');
  retryBtn.dispatchEvent(new domEnv.MockMouseEvent('click', { bubbles: true }));

  const timeEl = document.querySelector('#tt-time');
  if (timeEl.textContent !== '0:00') {
    throw new Error(`Expected #tt-time '0:00' after retry, got '${timeEl.textContent}'`);
  }

  // Type first character of restarted exercise
  const newSpans = document.querySelectorAll('#tt-text span');
  const firstCh = newSpans[0].textContent === '\u00A0' ? ' ' : newSpans[0].textContent;
  input.dispatchEvent(new domEnv.MockKeyboardEvent('keydown', { key: firstCh }));

  if (!newSpans[0].classList.contains('char-correct')) {
    throw new Error('First character was not accepted after retry click');
  }
});

check('Next Level button (#tt-btn-next) advances level, resets timer, and enables typing', () => {
  window.TypingTrainer.init('screen-typing');
  window.TypingTrainer.start(1);

  const input = document.querySelector('#tt-input');
  const spans = document.querySelectorAll('#tt-text span');
  for (const s of spans) {
    const ch = s.textContent === '\u00A0' ? ' ' : s.textContent;
    input.dispatchEvent(new domEnv.MockKeyboardEvent('keydown', { key: ch }));
  }

  const nextBtn = document.querySelector('#tt-btn-next');
  if (!nextBtn) throw new Error('#tt-btn-next missing');
  nextBtn.dispatchEvent(new domEnv.MockMouseEvent('click', { bubbles: true }));

  const title = document.querySelector('#tt-level-title').textContent;
  if (!title.includes('Уровень 2')) {
    throw new Error(`Expected level 2 after next click, got '${title}'`);
  }

  const timeEl = document.querySelector('#tt-time');
  if (timeEl.textContent !== '0:00') {
    throw new Error(`Expected #tt-time '0:00' after next, got '${timeEl.textContent}'`);
  }
});

check('Manual repeated finishSession() calls do not crash or produce invalid schemas', () => {
  window.TypingTrainer.init('screen-typing');
  window.TypingTrainer.start(1);

  const summary1 = window.TypingTrainer.finishSession();
  const summary2 = window.TypingTrainer.finishSession();

  if (typeof summary2.accuracy !== 'number' || isNaN(summary2.accuracy)) {
    throw new Error(`summary2.accuracy invalid: ${summary2.accuracy}`);
  }
  if (typeof summary2.speed !== 'number' || isNaN(summary2.speed)) {
    throw new Error(`summary2.speed invalid: ${summary2.speed}`);
  }
  if (summary2.duration < 1) {
    throw new Error(`summary2.duration must be >= 1s, got: ${summary2.duration}`);
  }
});

// ─── 6. SUMMARY ───────────────────────────────────────────────────────────────
console.log('\n=================================================');
console.log(`ADVERSARIAL AUDIT COMPLETE: ${passed} passed, ${failed} failed`);
console.log('=================================================\n');

if (findings.length > 0) {
  console.log('Findings:');
  findings.forEach((f, idx) => {
    console.log(`[Finding ${idx + 1}] ${f.name}: ${f.error}`);
  });
  process.exit(1);
}
