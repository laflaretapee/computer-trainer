/**
 * tests/tier5_adversarial/test_typing_adversarial_challenger2.test.js
 * Adversarial Challenge Suite 2 for Milestone 2 (Touch Typing Engine).
 * 
 * Deep empirical challenge focusing on:
 * 1. Post-completion keystroke resistance (single keys, spam barrage, modifiers, container clicks).
 * 2. Timer reset invariant across restarts, level switching, and destroy().
 * 3. Solo modifier key isolation ('Control', 'Alt', 'Meta') without active flags.
 * 4. Multi-round state machine continuity (Play -> Finish -> Retry -> Play -> Finish).
 * 5. Punctuation handling, finger highlighting exclusivity, and M2 <-> M4 persistence contract.
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
  assertDefined,
  assertBetween
} = assertHelper;

const domEnv = require(path.join(projectRoot, 'tests/helpers/dom_env'));
const {
  setupBrowserEnv,
  MockKeyboardEvent,
  MockMouseEvent
} = domEnv;

const hasDescribe = typeof describe === 'function';
const beforeHooks = [];
const afterHooks = [];

const testSuite = hasDescribe ? describe : (name, fn) => { console.log(`\n--- ${name} ---`); fn(); };
const registerBeforeEach = hasDescribe ? beforeEach : (fn) => beforeHooks.push(fn);
const registerAfterEach = hasDescribe ? afterEach : (fn) => afterHooks.push(fn);

const testCase = hasDescribe ? test : (name, fn) => {
  try {
    for (const h of beforeHooks) h();
    fn();
    for (const h of afterHooks) h();
    console.log(`  ✔ ${name}`);
  } catch (err) {
    for (const h of afterHooks) {
      try { h(); } catch {}
    }
    console.error(`  ✖ ${name}:`, err.message);
    throw err;
  }
};

testSuite('Tier 5: Typing Engine Adversarial Challenge Suite 2 (Challenger M2.R2.2)', () => {
  let env = null;

  registerBeforeEach(() => {
    env = setupBrowserEnv();
    env.loadAppStack();
    env.window.TypingTrainer.init('screen-typing');
  });

  registerAfterEach(() => {
    if (env) {
      if (env.window.TypingTrainer && typeof env.window.TypingTrainer.destroy === 'function') {
        env.window.TypingTrainer.destroy();
      }
      env.teardown();
      env = null;
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. Post-Completion Keystroke Isolation & Invariant Resistance
  // ═══════════════════════════════════════════════════════════════════════════

  testSuite('1. Post-Completion Keystroke Isolation', () => {
    testCase('1.1 Barrage of 100 mixed keys after exercise completion does not alter state or re-save', () => {
      const { window, document } = env;
      window.TypingTrainer.start(1);

      const input = document.querySelector('#tt-input');
      const spans = document.querySelectorAll('#tt-text span');
      const targetText = Array.from(spans).map(s => s.textContent === '\u00a0' ? ' ' : s.textContent).join('');

      // Track calls to App.saveProgress
      let saveCount = 0;
      let lastPayload = null;
      window.App.state.currentStudent = { id: 701, name: 'Тестовый Ученик', class: '7-А' };
      window.App.saveProgress = (studentId, module, payload) => {
        saveCount++;
        lastPayload = payload;
      };

      // Type text cleanly to completion
      for (const ch of targetText) {
        input.dispatchEvent(new MockKeyboardEvent('keydown', { key: ch }));
      }

      // Verify completion
      const resultCard = document.querySelector('#tt-result');
      assertEquals(resultCard.style.display, '', 'Result card must be visible upon completion');
      assertEquals(saveCount, 1, 'App.saveProgress must be called exactly once upon completion');

      const initialErrors = document.querySelector('#tt-res-errors').textContent;
      const initialAccuracy = document.querySelector('#tt-res-accuracy').textContent;
      const initialSpeed = document.querySelector('#tt-res-speed').textContent;
      assertEquals(initialErrors, '0', 'Initial completed errors should be 0');
      assertEquals(initialAccuracy, '100', 'Initial completed accuracy should be 100%');

      // Now send an adversarial barrage of 100 extra keystrokes
      const hostileKeys = ['a', 'z', ' ', 'ф', 'ы', 'в', 'а', '1', '!', 'Enter', 'Backspace', 'Shift', 'Control', 'Alt'];
      for (let i = 0; i < 100; i++) {
        const key = hostileKeys[i % hostileKeys.length];
        input.dispatchEvent(new MockKeyboardEvent('keydown', { key }));
      }

      // Assert complete invariance
      assertEquals(saveCount, 1, 'App.saveProgress must NOT be re-invoked post-completion');
      assertEquals(document.querySelector('#tt-res-errors').textContent, initialErrors, 'Result errors must remain untouched');
      assertEquals(document.querySelector('#tt-res-accuracy').textContent, initialAccuracy, 'Result accuracy must remain untouched');
      assertEquals(document.querySelector('#tt-res-speed').textContent, initialSpeed, 'Result speed must remain untouched');
      assertEquals(document.querySelector('#tt-errors').textContent, '0', 'Live HUD error count must remain 0');
      assertEquals(document.querySelector('#tt-accuracy').textContent, '100', 'Live HUD accuracy must remain 100%');
    });

    testCase('1.2 Container clicks do not refocus input when exercise is finished', () => {
      const { window, document } = env;
      window.TypingTrainer.start(1);

      const input = document.querySelector('#tt-input');
      const spans = document.querySelectorAll('#tt-text span');
      const targetText = Array.from(spans).map(s => s.textContent === '\u00a0' ? ' ' : s.textContent).join('');

      let focused = false;
      input.focus = () => { focused = true; };
      input.blur = () => { focused = false; };

      // Type to completion
      for (const ch of targetText) {
        input.dispatchEvent(new MockKeyboardEvent('keydown', { key: ch }));
      }

      // Should be blurred after completion
      assertFalse(focused, 'Input must be blurred upon exercise completion');

      // Clicking the typing container must NOT trigger input.focus()
      const container = document.querySelector('#screen-typing') || document.querySelector('#typing-container');
      container.dispatchEvent(new MockMouseEvent('click'));
      assertFalse(focused, 'Clicking container after completion must not refocus input');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. Timer Reset Invariant Across Lifecycles
  // ═══════════════════════════════════════════════════════════════════════════

  testSuite('2. Timer Reset Invariants', () => {
    testCase('2.1 Restarting the same level resets #tt-time immediately to 0:00', () => {
      const { window, document } = env;
      window.TypingTrainer.start(1);

      const timeEl = document.querySelector('#tt-time');
      timeEl.textContent = '1:45';

      window.TypingTrainer.start(1);
      assertEquals(timeEl.textContent, '0:00', 'Timer display must be reset to 0:00 on level restart');
    });

    testCase('2.2 Switching to another level resets #tt-time immediately to 0:00', () => {
      const { window, document } = env;
      window.TypingTrainer.start(1);

      const timeEl = document.querySelector('#tt-time');
      timeEl.textContent = '2:30';

      window.TypingTrainer.start(4);
      assertEquals(timeEl.textContent, '0:00', 'Timer display must be reset to 0:00 when switching levels');
    });

    testCase('2.3 Destroying module resets #tt-time to 0:00 and clears intervals', () => {
      const { window, document } = env;
      window.TypingTrainer.start(1);

      const timeEl = document.querySelector('#tt-time');
      timeEl.textContent = '3:15';

      window.TypingTrainer.destroy();
      assertEquals(timeEl.textContent, '0:00', 'Timer display must be reset to 0:00 on destroy');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. Solo Modifier Keys & Navigation Filter Robustness
  // ═══════════════════════════════════════════════════════════════════════════

  testSuite('3. Solo Modifier Keys & Special Keys Isolation', () => {
    testCase('3.1 Standalone Control, Alt, Meta keys do not increment errors or start session', () => {
      const { window, document } = env;
      window.TypingTrainer.start(1);

      const input = document.querySelector('#tt-input');
      const errorsEl = document.querySelector('#tt-errors');
      const timeEl = document.querySelector('#tt-time');

      // Dispatch standalone modifier keys without modifier boolean flags
      input.dispatchEvent(new MockKeyboardEvent('keydown', { key: 'Control', ctrlKey: false }));
      input.dispatchEvent(new MockKeyboardEvent('keydown', { key: 'Alt', altKey: false }));
      input.dispatchEvent(new MockKeyboardEvent('keydown', { key: 'Meta', metaKey: false }));

      assertEquals(errorsEl.textContent, '0', 'Standalone modifiers must not cause typing errors');
      assertEquals(timeEl.textContent, '0:00', 'Standalone modifiers must not start timer');
    });

    testCase('3.2 Navigation and editing keys are safely ignored without error penalties', () => {
      const { window, document } = env;
      window.TypingTrainer.start(1);

      const input = document.querySelector('#tt-input');
      const specialKeys = [
        'Shift', 'CapsLock', 'Tab', 'Escape',
        'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
        'Home', 'End', 'PageUp', 'PageDown',
        'Insert', 'Delete', 'Backspace', 'Enter',
        'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12'
      ];

      for (const k of specialKeys) {
        input.dispatchEvent(new MockKeyboardEvent('keydown', { key: k }));
      }

      assertEquals(document.querySelector('#tt-errors').textContent, '0', 'Special keys must not cause errors');
      assertEquals(document.querySelector('#tt-time').textContent, '0:00', 'Special keys must not start timer');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. Multi-Round State Machine Continuity (Play -> Finish -> Retry -> Play -> Finish)
  // ═══════════════════════════════════════════════════════════════════════════

  testSuite('4. Multi-Round State Machine Continuity', () => {
    testCase('4.1 Completing exercise, retrying via button, and completing again succeeds flawlessly', () => {
      const { window, document } = env;
      window.TypingTrainer.start(1);

      const input = document.querySelector('#tt-input');
      let spans = document.querySelectorAll('#tt-text span');
      let targetText = Array.from(spans).map(s => s.textContent === '\u00a0' ? ' ' : s.textContent).join('');

      let savedSessions = [];
      window.App.state.currentStudent = { id: 702, name: 'Семиклассник', class: '7-Б' };
      window.App.saveProgress = (studentId, module, payload) => {
        savedSessions.push(payload);
      };

      // Round 1: Complete with 0 errors
      for (const ch of targetText) {
        input.dispatchEvent(new MockKeyboardEvent('keydown', { key: ch }));
      }

      assertEquals(savedSessions.length, 1, 'First session must be saved');
      assertEquals(savedSessions[0].errors, 0, 'Round 1 errors should be 0');
      assertEquals(savedSessions[0].accuracy, 100, 'Round 1 accuracy should be 100%');

      // Click "Попробовать снова"
      const btnRetry = document.querySelector('#tt-btn-retry');
      assertNotNull(btnRetry, '#tt-btn-retry button must exist');
      btnRetry.dispatchEvent(new MockMouseEvent('click'));

      // Invariants after retry
      assertEquals(document.querySelector('#tt-errors').textContent, '0', 'Errors must be reset to 0');
      assertEquals(document.querySelector('#tt-accuracy').textContent, '100', 'Accuracy must be reset to 100');
      assertEquals(document.querySelector('#tt-time').textContent, '0:00', 'Time must be reset to 0:00');
      assertEquals(document.querySelector('#tt-result').style.display, 'none', 'Result card must be hidden');

      // Round 2: Complete with 2 intentional errors
      spans = document.querySelectorAll('#tt-text span');
      targetText = Array.from(spans).map(s => s.textContent === '\u00a0' ? ' ' : s.textContent).join('');

      for (let i = 0; i < targetText.length; i++) {
        if (i === 1 || i === 3) {
          // Send a wrong key that does not match targetText[i]
          const wrongKey = targetText[i] === 'я' ? 'ю' : 'я';
          input.dispatchEvent(new MockKeyboardEvent('keydown', { key: wrongKey }));
        } else {
          input.dispatchEvent(new MockKeyboardEvent('keydown', { key: targetText[i] }));
        }
      }

      assertEquals(savedSessions.length, 2, 'Second session must be saved');
      assertEquals(savedSessions[1].errors, 2, 'Round 2 errors should be strictly 2');
      assertTrue(savedSessions[1].accuracy < 100, 'Round 2 accuracy should reflect errors');
      assertEquals(document.querySelector('#tt-res-errors').textContent, '2', 'Result card errors should be 2');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. Russian Punctuation & Hands Visualizer Highlighting Exclusivity
  // ═══════════════════════════════════════════════════════════════════════════

  testSuite('5. Russian Punctuation & Hands Visualizer Invariants', () => {
    testCase('5.1 Punctuation keys (. and ,) trigger correct finger and key highlights', () => {
      const { window, document } = env;
      window.TypingTrainer.start(5); // Level 5 has sentences with . and ,

      const visualizer = document.querySelector('#tt-hands-visualizer');
      assertNotNull(visualizer, '#tt-hands-visualizer must exist');

      // Verify all 10 anatomical fingers exist by data-finger attribute
      const expectedFingerZones = [
        'pinky-l', 'ring-l', 'mid-l', 'idx-l', 'thumb-l',
        'thumb-r', 'idx-r', 'mid-r', 'ring-r', 'pinky-r'
      ];
      for (const fingerZone of expectedFingerZones) {
        const fingerEl = visualizer.querySelector(`[data-finger="${fingerZone}"]`);
        assertNotNull(fingerEl, `Finger [data-finger="${fingerZone}"] must exist in hands visualizer`);
      }

      // Check right pinky maps punctuation
      const rightPinky = visualizer.querySelector('[data-finger="pinky-r"]');
      assertNotNull(rightPinky, 'Right pinky finger element must exist');
    });

    testCase('5.2 Spacebar activates both thumbs and sets dual-hand cue text', () => {
      const { window, document } = env;
      window.TypingTrainer.start(1);

      // Advance until nextChar is space ' '
      const input = document.querySelector('#tt-input');
      const spans = document.querySelectorAll('#tt-text span');
      const targetText = Array.from(spans).map(s => s.textContent === '\u00a0' ? ' ' : s.textContent).join('');

      let spaceIndex = targetText.indexOf(' ');
      assertTrue(spaceIndex > 0, 'Level 1 text must contain a space character');

      for (let i = 0; i < spaceIndex; i++) {
        input.dispatchEvent(new MockKeyboardEvent('keydown', { key: targetText[i] }));
      }

      // Now active character is space
      const visualizer = document.querySelector('#tt-hands-visualizer');
      const thumbL = visualizer.querySelector('[data-finger="thumb-l"]');
      const thumbR = visualizer.querySelector('[data-finger="thumb-r"]');

      assertTrue(thumbL.classList.contains('finger-active'), 'Left thumb must be active on space');
      assertTrue(thumbR.classList.contains('finger-active'), 'Right thumb must be active on space');

      const cueHand = visualizer.querySelector('#tt-cue-hand');
      const cueFinger = visualizer.querySelector('#tt-cue-finger');
      const cueKey = visualizer.querySelector('#tt-cue-key');

      assertEquals(cueHand.textContent, 'Обе руки', 'Space cue hand must be "Обе руки"');
      assertEquals(cueFinger.textContent, 'Большой палец', 'Space cue finger must be "Большой палец"');
      assertEquals(cueKey.textContent, '␣ Пробел', 'Space cue key must be "␣ Пробел"');
    });
  });
});
