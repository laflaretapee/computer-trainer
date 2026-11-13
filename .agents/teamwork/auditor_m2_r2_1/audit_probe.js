/**
 * audit_probe.js
 * Independent Forensic Auditor Probe for Milestone 2 Remediation Fixes
 * Verifies:
 * 1. Post-completion keystroke resistance (50 keys) & App.saveProgress call count (strictly 1).
 * 2. Real-time HUD #tt-errors and result card #tt-res-errors stability.
 * 3. Timer reset on both startLevel and destroy.
 * 4. Standalone modifier keys (Control, Alt, Meta, Shift, etc.) non-mutation.
 * 5. Container click focus guard (focus during active, blur during finished).
 * 6. Dynamic state machine resumption on level restart and level change.
 */

'use strict';

const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../..');
const assert = require('node:assert');

const domEnv = require(path.join(projectRoot, 'tests/helpers/dom_env'));
const { setupBrowserEnv, MockKeyboardEvent } = domEnv;

console.log('=== FORENSIC INTEGRITY AUDIT PROBE (M2.R2.1) ===\n');

const env = setupBrowserEnv();
env.loadAppStack();
const { window, document } = env;

// Probe 1: Post-completion keystroke resistance & App.saveProgress idempotency
console.log('[Probe 1] Testing Post-Completion Idempotency & App.saveProgress Call Count');
let saveCount = 0;
let lastSaveData = null;
window.App = window.App || {};
window.App.state = { currentStudent: { id: 'test_student_1' } };
window.App.saveProgress = function(studentId, module, summary) {
  saveCount++;
  lastSaveData = summary;
};

window.TypingTrainer.init('screen-typing');
window.TypingTrainer.start(1);

const input = document.querySelector('#tt-input');
const spans = document.querySelectorAll('#tt-text span');
const textLen = spans.length;

for (let i = 0; i < textLen; i++) {
  const ch = spans[i].textContent === '\u00A0' ? ' ' : spans[i].textContent;
  input.dispatchEvent(new MockKeyboardEvent('keydown', { key: ch }));
}

assert.strictEqual(saveCount, 1, 'App.saveProgress must be called exactly once upon initial completion');
assert.strictEqual(lastSaveData.errors, 0, 'Initial session summary errors must be 0');
assert.strictEqual(lastSaveData.accuracy, 100, 'Initial session summary accuracy must be 100%');

// Probe 2: Dispatch 50 post-completion keystrokes
console.log('[Probe 2] Injecting 50 post-completion keystrokes...');
for (let i = 0; i < 50; i++) {
  input.dispatchEvent(new MockKeyboardEvent('keydown', { key: 'a' }));
}

assert.strictEqual(saveCount, 1, 'App.saveProgress must NOT be called again after completion');
assert.strictEqual(document.querySelector('#tt-res-errors').textContent, '0', 'Result card errors must remain 0');
assert.strictEqual(document.querySelector('#tt-errors').textContent, '0', 'HUD live errors must remain 0');
assert.strictEqual(document.querySelector('#tt-res-accuracy').textContent, '100', 'Result card accuracy must remain 100%');
console.log('  ✔ Probe 1 & 2 PASS: 0 side effects after 50 post-completion keys, exactly 1 persistence call');

// Probe 3: Timer display reset on restart and destroy
console.log('\n[Probe 3] Testing #tt-time display reset');
const timeEl = document.querySelector('#tt-time');
timeEl.textContent = '05:45';
window.TypingTrainer.start(1);
assert.strictEqual(timeEl.textContent, '0:00', '#tt-time must be reset to 0:00 immediately upon startLevel');
timeEl.textContent = '02:30';
window.TypingTrainer.destroy();
assert.strictEqual(timeEl.textContent, '0:00', '#tt-time must be reset to 0:00 immediately upon destroy');
console.log('  ✔ Probe 3 PASS: #tt-time resets to 0:00 on both startLevel and destroy');

// Probe 4: Modifier keys immunity
console.log('\n[Probe 4] Testing solo modifier and navigation keys immunity');
window.TypingTrainer.init('screen-typing');
window.TypingTrainer.start(1);
const input2 = document.querySelector('#tt-input');
const modifierKeys = ['Control', 'Alt', 'Meta', 'Shift', 'CapsLock', 'Tab', 'Escape', 'F1', 'F5', 'Insert', 'Delete', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Backspace', 'Enter'];
modifierKeys.forEach(key => {
  input2.dispatchEvent(new MockKeyboardEvent('keydown', { key }));
});
assert.strictEqual(document.querySelector('#tt-errors').textContent, '0', 'Modifiers must never increment errors');
assert.strictEqual(document.querySelector('#tt-speed').textContent, '0', 'Modifiers must never start exercise timer');
console.log('  ✔ Probe 4 PASS: 17 modifier/utility keys safely ignored with zero state changes');

// Probe 5: Container click focus guard
console.log('\n[Probe 5] Testing container click focus guard');
const container = document.getElementById('screen-typing');
let focusCount = 0;
let blurCount = 0;
input2.focus = () => { focusCount++; };
input2.blur = () => { blurCount++; };

// During active exercise, clicking container should focus input
container.dispatchEvent(new env.window.Event('click'));
assert.strictEqual(focusCount, 1, 'Container click during active exercise must focus input');

// Finish exercise
window.TypingTrainer.finishSession();
assert.strictEqual(blurCount, 1, 'finishSession must blur input');

// After exercise is finished, clicking container must NOT focus input
container.dispatchEvent(new env.window.Event('click'));
assert.strictEqual(focusCount, 1, 'Container click after completion must NOT refocus input');
console.log('  ✔ Probe 5 PASS: Input focus guard correctly reflects active vs finished state');

// Probe 6: Resumption on next level
console.log('\n[Probe 6] Testing level resumption and state re-activation');
window.TypingTrainer.start(2);
const spansLevel2 = document.querySelectorAll('#tt-text span');
const chFirst = spansLevel2[0].textContent === '\u00A0' ? ' ' : spansLevel2[0].textContent;
input2.dispatchEvent(new MockKeyboardEvent('keydown', { key: chFirst }));
assert.strictEqual(document.querySelector('#tt-errors').textContent, '0', 'Typing on new level registers properly');
assert.strictEqual(spansLevel2[0].classList.contains('char-correct'), true, 'Character highlighted green on match');
console.log('  ✔ Probe 6 PASS: Exercise resumed cleanly on Level 2 with active state machine');

console.log('\n=================================================');
console.log('ALL 6 FORENSIC PROBES COMPLETED: 6 passed, 0 failed');
console.log('VERDICT: CLEAN (Authentic Implementation)');
console.log('=================================================');

window.TypingTrainer.destroy();
process.exit(0);

