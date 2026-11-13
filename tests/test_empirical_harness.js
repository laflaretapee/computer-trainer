/**
 * tests/test_empirical_harness.js
 * Deep adversarial probing harness for Mouse Trainer Ex 4, Ex 5, Sound, Persistence.
 */

'use strict';

const { setupBrowserEnv } = require('./helpers/dom_env');

async function runEmpiricalHarness() {
  console.log('=== EMPIRICAL ADVERSARIAL STRESS HARNESS ===');

  const env = setupBrowserEnv();
  env.loadAppStack();
  const { window, document } = env;

  // ── TEST 1: Double Drop Vulnerability Probe ──
  console.log('\n[Probe 1] Double Drop Vulnerability in Exercise 4:');
  window.MouseTrainer.init('mouse-container');
  window.MouseTrainer.selectExercise(4);

  const arena = document.getElementById('mouse-arena');
  const docsFolder = arena.querySelector('[data-folder-id="docs"]');
  const docFile = arena.querySelector('#drag-file-f1');

  env.dispatchDragDrop(docFile, docsFolder, { 'text/plain': JSON.stringify({ id: 'f1', ext: '.docx', cat: 'docs' }) });
  let score1 = document.getElementById('mouse-stat-score').textContent;
  let prog1 = document.getElementById('mouse-stat-progress-text').textContent;
  console.log('  1st drop f1 -> score:', score1, 'progress:', prog1);

  // Dispatch duplicate drop on f1
  env.dispatchDragDrop(docFile, docsFolder, { 'text/plain': JSON.stringify({ id: 'f1', ext: '.docx', cat: 'docs' }) });
  let score2 = document.getElementById('mouse-stat-score').textContent;
  let prog2 = document.getElementById('mouse-stat-progress-text').textContent;
  console.log('  2nd (duplicate) drop f1 -> score:', score2, 'progress:', prog2);

  if (score2 !== score1) {
    console.log('  OBSERVATION: Duplicate drop is permitted by validateAndHandleDrop (score increased from', score1, 'to', score2, ')');
  } else {
    console.log('  OBSERVATION: Duplicate drop was prevented.');
  }

  // ── TEST 2: Tooltip Bottom Clamping Probe ──
  console.log('\n[Probe 2] Tooltip Bottom Clamping in Exercise 5:');
  window.MouseTrainer.selectExercise(5);
  const wEl = arena.querySelector('[data-widget-id="w_wifi"]');

  // Check showTooltip clamping code
  // If tooltip overflows bottom edge:
  let bottomClampingObserved = false;
  arena.getBoundingClientRect = () => ({ top: 0, left: 0, bottom: 200, right: 800, width: 800, height: 200 });
  
  wEl.dispatchEvent(new env.window.MouseEvent('mouseenter', { bubbles: true }));
  await new Promise(r => setTimeout(r, 550));
  const tt = wEl.querySelector('.mouse-tooltip');
  if (tt) {
    console.log('  Tooltip rendered. Styles: top =', tt.style.top, 'bottom =', tt.style.bottom, 'left =', tt.style.left, 'right =', tt.style.right);
  }

  // ── TEST 3: Corrupted LocalStorage Handling ──
  console.log('\n[Probe 3] Corrupted / Non-JSON trainer_progress Persistence:');
  env.localStorage.setItem('trainer_progress', 'INVALID_JSON_CORRUPTED{{{');
  try {
    window.App.state.currentStudent = { id: '7A-01', name: 'Безруков Иван', class: '7-А' };
    window.MouseTrainer.finishSession({ taskId: 'ex1_click', score: 100 });
    console.log('  Persistence with corrupted JSON completed without unhandled crash.');
  } catch (err) {
    console.log('  Persistence with corrupted JSON threw error:', err.message);
  }

  // ── TEST 4: Extreme AudioContext Stress ──
  console.log('\n[Probe 4] Extreme SoundSystem AudioContext Stress:');
  const sound = window.SoundSystem;
  sound.setMuted(false);
  // Break context by making createGain throw
  const brokenCtx = {
    currentTime: 10,
    state: 'running',
    createGain: () => { throw new Error('Out of audio memory'); },
    createOscillator: () => { throw new Error('Out of audio hardware'); },
    destination: {}
  };
  window.AudioContext = function() { return brokenCtx; };
  try {
    sound.playSuccess();
    sound.playError();
    sound.playFanfare();
    console.log('  SoundSystem handles broken context cleanly without throwing.');
  } catch (err) {
    console.log('  SoundSystem threw on broken context:', err.message);
  }

  env.teardown();
  console.log('\n=== EMPIRICAL PROBING COMPLETE ===');
}

runEmpiricalHarness();
