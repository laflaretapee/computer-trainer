/**
 * tests/tier5_adversarial/test_typing_post_completion_challenger.test.js
 * Empirical Challenger M2.R2.1 Stress Probe Harness.
 * 
 * Specifically stress-tests:
 * 1. Post-completion input blocking across 20+ varied character, modifier, and symbol keystrokes.
 * 2. Invariant stability: _errors === 0, accuracy === 100%, and App.saveProgress called strictly once.
 * 3. Immediate HUD timer reset (#tt-time === '0:00') on startLevel() and destroy().
 * 4. Clean resumption of typing progression and error mechanics on subsequent level run.
 * 5. Standalone modifier keys (Control, Alt, Meta) ignoring during active exercises.
 * 6. Post-completion container click focus suppression.
 */

'use strict';

const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../..');
const assertHelper = require(path.join(projectRoot, 'tests/helpers/assert'));
const {
  assert,
  assertEquals,
  assertNotEquals,
  assertTrue,
  assertFalse,
  assertNotNull,
  assertNull,
  assertDefined
} = assertHelper;

const domEnv = require(path.join(projectRoot, 'tests/helpers/dom_env'));
const { setupBrowserEnv, MockKeyboardEvent, MockMouseEvent } = domEnv;

// Support runner.js lifecycle and direct node invocation
const hasDescribe = typeof describe === 'function';
const beforeHooks = [];
const afterHooks = [];

const testSuite = hasDescribe ? describe : (name, fn) => { console.log(`\n=== ${name} ===`); fn(); };
const registerBeforeEach = hasDescribe ? beforeEach : (fn) => beforeHooks.push(fn);
const registerAfterEach = hasDescribe ? afterEach : (fn) => afterHooks.push(fn);

const testCase = hasDescribe ? test : (name, fn) => {
  try {
    for (const h of beforeHooks) h();
    fn();
    for (const h of afterHooks) {
      try { h(); } catch {}
    }
    console.log(`  ✔ PASS: ${name}`);
  } catch (err) {
    for (const h of afterHooks) {
      try { h(); } catch {}
    }
    console.error(`  ✖ FAIL: ${name}`);
    console.error(`         ${err.message}`);
    throw err;
  }
};

testSuite('Challenger M2.R2.1: Post-Completion & Timer Reset Empirical Stress Probe', () => {
  let env = null;
  let saveProgressCalls = [];

  let originalSaveProgress = null;

  registerBeforeEach(() => {
    env = setupBrowserEnv();
    env.loadAppStack();

    saveProgressCalls = [];
    if (!env.window.App.state) {
      env.window.App.state = {};
    }
    env.window.App.state.currentStudent = {
      id: 'challenger_test_student',
      name: 'Тестовый Ученик',
      class: '7-А'
    };

    originalSaveProgress = env.window.App.saveProgress;
    env.window.App.saveProgress = function(studentId, moduleName, payload) {
      saveProgressCalls.push({
        studentId,
        moduleName,
        payload: JSON.parse(JSON.stringify(payload))
      });
      if (typeof originalSaveProgress === 'function') {
        return originalSaveProgress.call(env.window.App, studentId, moduleName, payload);
      }
    };

    env.window.TypingTrainer.init('typing-container');
  });

  registerAfterEach(() => {
    if (env) {
      if (originalSaveProgress && env.window.App) {
        env.window.App.saveProgress = originalSaveProgress;
      }
      if (env.window.TypingTrainer && typeof env.window.TypingTrainer.destroy === 'function') {
        env.window.TypingTrainer.destroy();
      }
      env.teardown();
      env = null;
    }
  });

  // Helper to extract full text of current exercise
  function getCurrentExerciseText(document) {
    const textEl = document.querySelector('#tt-text');
    assertNotNull(textEl, '#tt-text must exist');
    const spans = textEl.querySelectorAll('span');
    return Array.from(spans).map(s => s.textContent === '\u00a0' ? ' ' : s.textContent).join('');
  }

  // Helper to type full text accurately
  function typeExerciseAccurately(document, input) {
    const text = getCurrentExerciseText(document);
    assertTrue(text.length > 0, 'Exercise text must not be empty');
    for (let i = 0; i < text.length; i++) {
      input.dispatchEvent(new MockKeyboardEvent('keydown', { key: text[i] }));
    }
    return text;
  }

  testCase('Scenario 1: Complete exercise with 0 errors, spam 20 random character and modifier keys, verify errors=0, accuracy=100%, and App.saveProgress called strictly once', () => {
    const { document, window } = env;
    window.TypingTrainer.start(1);

    const input = document.querySelector('#tt-input');
    const text = typeExerciseAccurately(document, input);

    // Verify initial completion state
    assertEquals(saveProgressCalls.length, 1, 'App.saveProgress must be called exactly once upon completion');
    assertEquals(document.querySelector('#tt-errors').textContent, '0', 'HUD #tt-errors must be 0');
    assertEquals(document.querySelector('#tt-res-errors').textContent, '0', 'Modal #tt-res-errors must be 0');
    assertEquals(document.querySelector('#tt-accuracy').textContent, '100', 'HUD #tt-accuracy must be 100');
    assertEquals(document.querySelector('#tt-res-accuracy').textContent, '100', 'Modal #tt-res-accuracy must be 100');
    assertEquals(saveProgressCalls[0].payload.errors, 0, 'Saved payload errors must be 0');
    assertEquals(saveProgressCalls[0].payload.accuracy, 100, 'Saved payload accuracy must be 100');

    // 20 diverse post-completion keystrokes: characters, symbols, numbers, solo modifiers, navigation keys
    const postCompletionKeys = [
      'а', 'б', 'в', 'г', 'z',
      'Control', 'Alt', 'Meta', 'Shift', 'CapsLock',
      '1', '9', '!', '?', '.',
      ',', ' ', 'Tab', 'Escape', 'Enter'
    ];
    assertEquals(postCompletionKeys.length, 20, 'Probe must contain exactly 20 keys');

    for (let i = 0; i < postCompletionKeys.length; i++) {
      input.dispatchEvent(new MockKeyboardEvent('keydown', { key: postCompletionKeys[i] }));
    }

    // Invariant assertions post-spam
    assertEquals(saveProgressCalls.length, 1, 'App.saveProgress must NOT be called again by post-completion keystrokes');
    assertEquals(document.querySelector('#tt-errors').textContent, '0', 'HUD #tt-errors must remain strictly 0');
    assertEquals(document.querySelector('#tt-res-errors').textContent, '0', 'Modal #tt-res-errors must remain strictly 0');
    assertEquals(document.querySelector('#tt-accuracy').textContent, '100', 'HUD #tt-accuracy must remain strictly 100');
    assertEquals(document.querySelector('#tt-res-accuracy').textContent, '100', 'Modal #tt-res-accuracy must remain strictly 100');
  });

  testCase('Scenario 2: Level restart via startLevel() immediately resets #tt-time to "0:00", resets HUD metrics, and hides result card', () => {
    const { document, window } = env;
    window.TypingTrainer.start(1);

    const input = document.querySelector('#tt-input');
    typeExerciseAccurately(document, input);

    // Verify result card is visible
    const resultCard = document.querySelector('#tt-result');
    assertNotNull(resultCard);
    assertEquals(resultCard.style.display, '', 'Result card should be visible after completion');

    // Restart level 2
    window.TypingTrainer.start(2);

    // HUD metrics verification immediately upon restart
    const timeEl = document.querySelector('#tt-time');
    const speedEl = document.querySelector('#tt-speed');
    const accuracyEl = document.querySelector('#tt-accuracy');
    const errorsEl = document.querySelector('#tt-errors');

    assertEquals(timeEl.textContent, '0:00', '#tt-time must be "0:00" immediately on restart');
    assertEquals(speedEl.textContent, '0', '#tt-speed must be "0" immediately on restart');
    assertEquals(accuracyEl.textContent, '100', '#tt-accuracy must be "100" immediately on restart');
    assertEquals(errorsEl.textContent, '0', '#tt-errors must be "0" immediately on restart');
    assertEquals(resultCard.style.display, 'none', 'Result card must be hidden on restart');

    // Text spans must be reset
    const spans = document.querySelectorAll('#tt-text span');
    assertTrue(spans.length > 0);
    assertTrue(spans[0].classList.contains('char-current'), 'First character of new exercise must have .char-current');
    assertFalse(spans[0].classList.contains('char-correct'), 'First character must not have .char-correct');
  });

  testCase('Scenario 3: Typing progression cleanly resumes after restart and processes correct/wrong keystrokes normally', () => {
    const { document, window } = env;
    // Complete level 1
    window.TypingTrainer.start(1);
    const input = document.querySelector('#tt-input');
    typeExerciseAccurately(document, input);
    assertEquals(saveProgressCalls.length, 1);

    // Restart level 1 cleanly
    window.TypingTrainer.start(1);
    const newText = getCurrentExerciseText(document);
    assertTrue(newText.length >= 5, 'Exercise must have at least 5 characters');

    // Type 4 correct characters
    for (let i = 0; i < 4; i++) {
      input.dispatchEvent(new MockKeyboardEvent('keydown', { key: newText[i] }));
    }

    const spans = document.querySelectorAll('#tt-text span');
    for (let i = 0; i < 4; i++) {
      assertTrue(spans[i].classList.contains('char-correct'), `Span ${i} should be marked char-correct`);
    }
    assertTrue(spans[4].classList.contains('char-current'), 'Span 4 should now be char-current');
    assertEquals(document.querySelector('#tt-errors').textContent, '0', 'Errors must be 0 after 4 correct keys');
    assertEquals(document.querySelector('#tt-accuracy').textContent, '100', 'Accuracy must be 100 after 4 correct keys');

    // Now type 1 wrong character
    const wrongChar = newText[4] === 'ж' ? 'я' : 'ж';
    input.dispatchEvent(new MockKeyboardEvent('keydown', { key: wrongChar }));

    assertTrue(spans[4].classList.contains('char-wrong'), 'Span 4 should be marked char-wrong on mismatch');
    assertEquals(document.querySelector('#tt-errors').textContent, '1', 'Errors must be 1 after mismatch');
    assertEquals(document.querySelector('#tt-accuracy').textContent, '80', 'Accuracy must be 80% (4 correct out of 5 total)');

    // Now type correct characters for remaining positions (5 .. newText.length - 1) to finish
    for (let i = 5; i < newText.length; i++) {
      input.dispatchEvent(new MockKeyboardEvent('keydown', { key: newText[i] }));
    }

    assertEquals(saveProgressCalls.length, 2, 'Second exercise completion must trigger second App.saveProgress');
    assertEquals(saveProgressCalls[1].payload.errors, 1, 'Second exercise saved errors must be strictly 1');
    const expectedAccuracy = Math.round(((newText.length - 1) / newText.length) * 100);
    assertEquals(saveProgressCalls[1].payload.accuracy, expectedAccuracy, 'Second exercise accuracy calculation matches');
  });

  testCase('Scenario 4: Exercise completed with non-zero errors; 20 post-completion keystrokes do not increment errors beyond initial error count', () => {
    const { document, window } = env;
    window.TypingTrainer.start(1);
    const input = document.querySelector('#tt-input');
    const text = getCurrentExerciseText(document);

    // Type 2 wrong keystrokes initially (at positions 0 and 1)
    input.dispatchEvent(new MockKeyboardEvent('keydown', { key: '!' }));
    input.dispatchEvent(new MockKeyboardEvent('keydown', { key: '?' }));
    assertEquals(document.querySelector('#tt-errors').textContent, '2');

    // Complete the exercise with correct keys from position 2 onwards
    for (let i = 2; i < text.length; i++) {
      input.dispatchEvent(new MockKeyboardEvent('keydown', { key: text[i] }));
    }

    assertEquals(saveProgressCalls.length, 1);
    assertEquals(document.querySelector('#tt-errors').textContent, '2');
    assertEquals(document.querySelector('#tt-res-errors').textContent, '2');

    // Spam 20 post-completion keys
    const extraKeys = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't'];
    for (const k of extraKeys) {
      input.dispatchEvent(new MockKeyboardEvent('keydown', { key: k }));
    }

    assertEquals(saveProgressCalls.length, 1, 'No duplicate saveProgress on post-completion spam');
    assertEquals(document.querySelector('#tt-errors').textContent, '2', 'Errors must remain strictly 2, not 22');
    assertEquals(document.querySelector('#tt-res-errors').textContent, '2', 'Modal errors must remain strictly 2');
  });

  testCase('Scenario 5: Standalone modifier keys (Control, Alt, Meta) during active typing are ignored and do not increment errors', () => {
    const { document, window } = env;
    window.TypingTrainer.start(1);
    const input = document.querySelector('#tt-input');
    const text = getCurrentExerciseText(document);

    // Press solo Control, Alt, Meta before typing
    input.dispatchEvent(new MockKeyboardEvent('keydown', { key: 'Control' }));
    input.dispatchEvent(new MockKeyboardEvent('keydown', { key: 'Alt' }));
    input.dispatchEvent(new MockKeyboardEvent('keydown', { key: 'Meta' }));
    input.dispatchEvent(new MockKeyboardEvent('keydown', { key: 'Shift' }));

    assertEquals(document.querySelector('#tt-errors').textContent, '0', 'Modifiers must not cause errors');
    assertEquals(document.querySelector('#tt-time').textContent, '0:00', 'Modifiers must not start timer');

    // Type first character
    input.dispatchEvent(new MockKeyboardEvent('keydown', { key: text[0] }));
    assertEquals(document.querySelector('#tt-errors').textContent, '0');

    // Press solo Control, Alt, Meta midway through typing
    input.dispatchEvent(new MockKeyboardEvent('keydown', { key: 'Control' }));
    input.dispatchEvent(new MockKeyboardEvent('keydown', { key: 'Alt' }));
    input.dispatchEvent(new MockKeyboardEvent('keydown', { key: 'Meta' }));

    assertEquals(document.querySelector('#tt-errors').textContent, '0', 'Midway modifiers must not count as errors');
    const spans = document.querySelectorAll('#tt-text span');
    assertTrue(spans[0].classList.contains('char-correct'));
    assertTrue(spans[1].classList.contains('char-current'));
  });

  testCase('Scenario 6: TypingTrainer.destroy() immediately resets #tt-time to "0:00" and unmounts cleanly', () => {
    const { document, window } = env;
    window.TypingTrainer.start(1);
    const input = document.querySelector('#tt-input');
    const text = getCurrentExerciseText(document);

    // Start timer by typing first key
    input.dispatchEvent(new MockKeyboardEvent('keydown', { key: text[0] }));

    // Destroy module
    window.TypingTrainer.destroy();

    const timeEl = document.querySelector('#tt-time');
    assertEquals(timeEl.textContent, '0:00', '#tt-time must be "0:00" after destroy()');

    // Keystrokes after destroy must be completely ignored
    input.dispatchEvent(new MockKeyboardEvent('keydown', { key: 'а' }));
    assertEquals(timeEl.textContent, '0:00');
  });

  testCase('Scenario 7: Post-completion container click does not focus input or trap keystrokes', () => {
    const { document, window } = env;
    window.TypingTrainer.start(1);
    const input = document.querySelector('#tt-input');
    typeExerciseAccurately(document, input);

    const container = document.querySelector('#typing-container');
    assertNotNull(container);

    let focused = false;
    input.focus = () => { focused = true; };

    // Click container after finish
    container.dispatchEvent(new MockMouseEvent('click'));

    assertFalse(focused, 'Clicking container after completion must NOT refocus tt-input');
  });
});
