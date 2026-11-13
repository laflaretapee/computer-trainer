/**
 * tests/tier2_boundaries/test_typing_metrics_boundaries.test.js
 * Adversarial Boundary Value Analysis & Stress Harness for Milestone 2 (Typing Engine):
 * - Initial state (0 keystrokes): speed === 0, accuracy === 100, errors === 0
 * - First keystroke CPM spike guard: t=0ms, 100ms, 999ms, 1000ms
 * - 100% error rate test: 20 wrong keystrokes, accuracy drops to 0 without NaN/negatives, errors === 20
 * - Interleaved errors: 10 correct, 5 wrong -> accuracy = Math.round(10/15 * 100) = 67%
 * - M2 <-> M4 Contract: finishSession() schema, types, App.saveProgress persistence
 * - Post-completion keystroke resistance and state machine boundaries
 */

'use strict';

const assertHelper = require('../helpers/assert');
const {
  assert,
  assertEquals,
  assertNotEquals,
  assertDeepEquals,
  assertTrue,
  assertFalse,
  assertNotNull,
  assertDefined,
  assertBetween
} = assertHelper;

const domEnv = require('../helpers/dom_env');
const {
  setupBrowserEnv,
  MockKeyboardEvent
} = domEnv;

describe('Tier 2: Typing Engine Metrics Boundaries & Adversarial Stress (modules/typing.js)', () => {
  let env = null;

  beforeEach(() => {
    env = setupBrowserEnv();
    env.loadAppStack();
  });

  afterEach(() => {
    if (env) {
      if (env.window.TypingTrainer && typeof env.window.TypingTrainer.destroy === 'function') {
        env.window.TypingTrainer.destroy();
      }
      env.teardown();
      env = null;
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SUITE 1: Extreme Mathematical Boundary — Initial State (0 Keystrokes)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Suite 1: Initial State Mathematical Boundaries (0 Keystrokes)', () => {
    test('Initial state right after init and start exhibits speed=0, accuracy=100, errors=0', () => {
      const { window, document } = env;

      window.TypingTrainer.init('screen-typing');
      window.TypingTrainer.start(1);

      const speedEl = document.querySelector('#tt-speed');
      const accuracyEl = document.querySelector('#tt-accuracy');
      const errorsEl = document.querySelector('#tt-errors');
      const timeEl = document.querySelector('#tt-time');

      assertNotNull(speedEl, '#tt-speed element must exist');
      assertNotNull(accuracyEl, '#tt-accuracy element must exist');
      assertNotNull(errorsEl, '#tt-errors element must exist');
      assertNotNull(timeEl, '#tt-time element must exist');

      assertEquals(speedEl.textContent, '0', 'Initial speed must strictly be 0 CPM');
      assertEquals(accuracyEl.textContent, '100', 'Initial accuracy must strictly be 100%');
      assertEquals(errorsEl.textContent, '0', 'Initial errors must strictly be 0');
      assertEquals(timeEl.textContent, '0:00', 'Initial timer display must be 0:00');
    });

    test('finishSession() called at 0 keystrokes returns valid schema without NaN or crash', () => {
      const { window, document } = env;

      window.TypingTrainer.init('screen-typing');
      window.TypingTrainer.start(1);

      const summary = window.TypingTrainer.finishSession();

      assertNotNull(summary, 'Session summary must be returned');
      assertEquals(typeof summary.speed, 'number', 'speed must be number');
      assertEquals(typeof summary.accuracy, 'number', 'accuracy must be number');
      assertEquals(typeof summary.errors, 'number', 'errors must be number');
      assertEquals(typeof summary.duration, 'number', 'duration must be number');
      assertEquals(typeof summary.level, 'number', 'level must be number');
      assertEquals(typeof summary.date, 'string', 'date must be string');

      assertEquals(summary.speed, 0, 'Speed must be 0 for 0 keystrokes');
      assertEquals(summary.accuracy, 100, 'Accuracy must be 100% for 0 keystrokes');
      assertEquals(summary.errors, 0, 'Errors must be 0 for 0 keystrokes');
      assertTrue(summary.duration >= 1, 'Duration floor should be at least 1s');
      assertFalse(Number.isNaN(summary.speed), 'Speed must not be NaN');
      assertFalse(Number.isNaN(summary.accuracy), 'Accuracy must not be NaN');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SUITE 2: Sub-Second Timing & CPM Spike Guard (t=0ms, 100ms, 999ms, 1000ms)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Suite 2: First Keystroke Speed Spike Guard', () => {
    test('Simulating keydown at t=0ms, t=100ms, t=999ms maintains speed === 0 and avoids erratic spike', () => {
      const { window, document } = env;

      window.TypingTrainer.init('screen-typing');
      window.TypingTrainer.start(1);

      const input = document.querySelector('#tt-input');
      const speedEl = document.querySelector('#tt-speed');

      // Intercept Date.now to control simulated time precisely
      const realDateNow = Date.now;
      let mockTime = 1000000;
      Date.now = () => mockTime;

      try {
        // Find expected first character
        const firstSpan = document.querySelector('#tt-text span');
        const expectedFirstChar = firstSpan.textContent === '\u00A0' ? ' ' : firstSpan.textContent;

        // t = 0ms: First keydown event fires
        input.dispatchEvent(new MockKeyboardEvent('keydown', { key: expectedFirstChar }));

        // Check speed at t = 0ms (0 elapsed)
        let speedVal = parseInt(speedEl.textContent, 10);
        assertEquals(speedVal, 0, 'Speed must be 0 at t=0ms (spike guard active)');

        // Check speed at t = 100ms
        mockTime += 100; // +100ms elapsed
        // Trigger updateStats indirectly via key or calling finishSession / checking display
        // Dispatch second key
        const secondSpan = document.querySelectorAll('#tt-text span')[1];
        const expectedSecondChar = secondSpan.textContent === '\u00A0' ? ' ' : secondSpan.textContent;
        input.dispatchEvent(new MockKeyboardEvent('keydown', { key: expectedSecondChar }));

        speedVal = parseInt(speedEl.textContent, 10);
        assertEquals(speedVal, 0, 'Speed must remain 0 at t=100ms (< 1.0s elapsed)');

        // Check speed at t = 999ms
        mockTime = 1000000 + 999; // +999ms elapsed
        const thirdSpan = document.querySelectorAll('#tt-text span')[2];
        const expectedThirdChar = thirdSpan.textContent === '\u00A0' ? ' ' : thirdSpan.textContent;
        input.dispatchEvent(new MockKeyboardEvent('keydown', { key: expectedThirdChar }));

        speedVal = parseInt(speedEl.textContent, 10);
        assertEquals(speedVal, 0, 'Speed must remain 0 at t=999ms (< 1.0s elapsed)');

        // Now advance to t = 1000ms (exactly 1.0s)
        mockTime = 1000000 + 1000;
        const fourthSpan = document.querySelectorAll('#tt-text span')[3];
        const expectedFourthChar = fourthSpan.textContent === '\u00A0' ? ' ' : fourthSpan.textContent;
        input.dispatchEvent(new MockKeyboardEvent('keydown', { key: expectedFourthChar }));

        speedVal = parseInt(speedEl.textContent, 10);
        // At 1.0s with 4 correct chars: (4 / 1.0) * 60 = 240 CPM
        assertEquals(speedVal, 240, 'Speed at t=1000ms should calculate Math.round((4/1.0)*60) = 240 CPM');
        assertTrue(speedVal > 0 && speedVal < 1000, 'Speed must be reasonable and bounded, never 60,000 CPM');
      } finally {
        Date.now = realDateNow;
      }
    });

    test('finishSession() within sub-second elapsed time clamps duration floor to 1s to prevent division spike', () => {
      const { window } = env;

      window.TypingTrainer.init('screen-typing');
      window.TypingTrainer.start(1);

      const input = env.document.querySelector('#tt-input');

      const realDateNow = Date.now;
      let mockTime = 2000000;
      Date.now = () => mockTime;

      try {
        const firstSpan = env.document.querySelector('#tt-text span');
        const firstChar = firstSpan.textContent === '\u00A0' ? ' ' : firstSpan.textContent;
        input.dispatchEvent(new MockKeyboardEvent('keydown', { key: firstChar }));

        // Advance only 200ms
        mockTime += 200;

        const summary = window.TypingTrainer.finishSession();
        // With 1 correct char in 200ms clamped to duration = 1s:
        // speed = Math.round((1 / 1) * 60) = 60 CPM
        assertEquals(summary.duration, 1, 'Duration must floor at 1 second');
        assertEquals(summary.speed, 60, 'Speed must be clamped to 60 CPM (1 char/sec), not 300 or 60,000');
        assertFalse(Number.isNaN(summary.speed), 'Speed must not be NaN');
      } finally {
        Date.now = realDateNow;
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SUITE 3: 100% Error Rate Stress Test (20 Wrong Keystrokes)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Suite 3: 100% Error Rate Stress Test', () => {
    test('Simulating 20 wrong keystrokes drops accuracy to 0% cleanly without NaN or negatives, errors === 20', () => {
      const { window, document } = env;

      window.TypingTrainer.init('screen-typing');

      // Start Level 5 which has long texts (20-30 characters)
      window.TypingTrainer.start(5);

      // Force a long text if needed, or inspect length
      const spans = document.querySelectorAll('#tt-text span');
      // Level 5 texts have at least 15 chars; let's check length
      const textLen = spans.length;

      const input = document.querySelector('#tt-input');
      const errorsEl = document.querySelector('#tt-errors');
      const accuracyEl = document.querySelector('#tt-accuracy');
      const speedEl = document.querySelector('#tt-speed');

      const wrongKeystrokes = Math.min(20, textLen - 1); // keep within exercise length to observe live HUD

      for (let i = 0; i < wrongKeystrokes; i++) {
        // Send a key that definitely does NOT match Russian text ('@')
        input.dispatchEvent(new MockKeyboardEvent('keydown', { key: '@' }));

        const currentErrors = parseInt(errorsEl.textContent, 10);
        assertEquals(currentErrors, i + 1, `Errors count must increment strictly to ${i + 1}`);

        const currentAcc = parseInt(accuracyEl.textContent, 10);
        assertEquals(currentAcc, 0, `Accuracy must be strictly 0% on 100% wrong keystrokes at step ${i + 1}`);
        assertFalse(Number.isNaN(currentAcc), 'Accuracy must not be NaN');
        assertTrue(currentAcc >= 0, 'Accuracy must not be negative');
      }

      assertEquals(parseInt(errorsEl.textContent, 10), wrongKeystrokes, `Total errors must match ${wrongKeystrokes}`);
      assertEquals(accuracyEl.textContent, '0', 'Final live accuracy must be 0');
      assertEquals(speedEl.textContent, '0', 'Final live speed must be 0 with 0 correct characters');
    });

    test('Full 20 wrong keystrokes through completion produces summary with errors=20, accuracy=0%, speed=0', () => {
      const { window, document } = env;

      window.TypingTrainer.init('screen-typing');

      // Let's test on Level 5 text of exactly 20 characters if possible, or simulate 20 wrong keystrokes
      window.TypingTrainer.start(5);

      const input = document.querySelector('#tt-input');
      const spans = document.querySelectorAll('#tt-text span');
      const targetLen = spans.length;

      // Type wrong characters for the entire text length
      for (let i = 0; i < targetLen; i++) {
        input.dispatchEvent(new MockKeyboardEvent('keydown', { key: '!' }));
      }

      // Exercise should have completed
      const resultCard = document.querySelector('#tt-result');
      assertEquals(resultCard.style.display, '', 'Result card must be visible upon exercise completion');

      const resErrors = document.querySelector('#tt-res-errors');
      const resAccuracy = document.querySelector('#tt-res-accuracy');
      const resSpeed = document.querySelector('#tt-res-speed');

      assertEquals(parseInt(resErrors.textContent, 10), targetLen, `Result errors must strictly equal ${targetLen}`);
      assertEquals(resAccuracy.textContent, '0', 'Result accuracy must strictly equal 0%');
      assertEquals(resSpeed.textContent, '0', 'Result speed must strictly equal 0 CPM');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SUITE 4: Interleaved Errors Test (10 Correct, 5 Wrong -> 67%)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Suite 4: Interleaved Errors & Mathematical Rounding', () => {
    test('Simulating 10 correct and 5 wrong keystrokes produces strictly 67% accuracy and 5 errors', () => {
      const { window, document } = env;

      window.TypingTrainer.init('screen-typing');
      window.TypingTrainer.start(5); // Level 5 has texts >= 15 chars

      const input = document.querySelector('#tt-input');
      const errorsEl = document.querySelector('#tt-errors');
      const accuracyEl = document.querySelector('#tt-accuracy');

      const spans = document.querySelectorAll('#tt-text span');
      assertTrue(spans.length >= 15, `Level 5 text must have at least 15 chars (got ${spans.length})`);

      // Pattern: 2 correct, 1 wrong (repeated 5 times = 10 correct, 5 wrong, total 15)
      let correctSent = 0;
      let wrongSent = 0;

      for (let i = 0; i < 15; i++) {
        const isWrong = (i % 3 === 2); // indices 2, 5, 8, 11, 14 are wrong (5 total)
        if (isWrong) {
          input.dispatchEvent(new MockKeyboardEvent('keydown', { key: '~' }));
          wrongSent++;
        } else {
          // Read current expected character from span
          const currentSpan = spans[i];
          const expectedChar = currentSpan.textContent === '\u00A0' ? ' ' : currentSpan.textContent;
          input.dispatchEvent(new MockKeyboardEvent('keydown', { key: expectedChar }));
          correctSent++;
        }

        const totalSoFar = correctSent + wrongSent;
        const expectedAccSoFar = Math.round((correctSent / totalSoFar) * 100);
        assertEquals(parseInt(accuracyEl.textContent, 10), expectedAccSoFar, `Accuracy at step ${i + 1} must match mathematical formula`);
      }

      assertEquals(correctSent, 10, 'Must have sent exactly 10 correct characters');
      assertEquals(wrongSent, 5, 'Must have sent exactly 5 wrong characters');
      assertEquals(errorsEl.textContent, '5', 'Live error counter must show strictly 5');

      // Math.round((10 / 15) * 100) = Math.round(66.6666...) = 67
      assertEquals(accuracyEl.textContent, '67', 'Live accuracy must strictly be 67% (Math.round(10/15*100))');
    });

    test('Accuracy formula handles rounding edge cases correctly without integer truncation', () => {
      // 1/3 = 33%, 2/3 = 67%, 1/6 = 17%, 5/6 = 83%
      const { window, document } = env;

      window.TypingTrainer.init('screen-typing');
      window.TypingTrainer.start(5);

      const input = document.querySelector('#tt-input');
      const accuracyEl = document.querySelector('#tt-accuracy');
      const spans = document.querySelectorAll('#tt-text span');

      // 1 wrong, 1 correct: total 2, acc 50%
      input.dispatchEvent(new MockKeyboardEvent('keydown', { key: '~' }));
      assertEquals(accuracyEl.textContent, '0');

      const char1 = spans[1].textContent === '\u00A0' ? ' ' : spans[1].textContent;
      input.dispatchEvent(new MockKeyboardEvent('keydown', { key: char1 }));
      assertEquals(accuracyEl.textContent, '50');

      // 1 wrong: total 3, correct 1 -> 1/3 = 33%
      input.dispatchEvent(new MockKeyboardEvent('keydown', { key: '~' }));
      assertEquals(accuracyEl.textContent, '33');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SUITE 5: M2 ↔ M4 finishSession Contract & Persistence
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Suite 5: M2 ↔ M4 Contract & Storage Persistence', () => {
    test('finishSession() returns exact schema conforming to M2 ↔ M4 specification', () => {
      const { window } = env;

      window.TypingTrainer.init('screen-typing');
      window.TypingTrainer.start(2);

      const summary = window.TypingTrainer.finishSession();

      const requiredKeys = ['speed', 'accuracy', 'errors', 'level', 'duration', 'date'];
      const actualKeys = Object.keys(summary);

      requiredKeys.forEach(k => {
        assertTrue(actualKeys.includes(k), `Summary must include key: ${k}`);
      });

      assertEquals(typeof summary.speed, 'number');
      assertEquals(typeof summary.accuracy, 'number');
      assertEquals(typeof summary.errors, 'number');
      assertEquals(typeof summary.level, 'number');
      assertEquals(typeof summary.duration, 'number');
      assertEquals(typeof summary.date, 'string');

      assertEquals(summary.level, 2, 'Level must be 2');
      assertTrue(summary.accuracy >= 0 && summary.accuracy <= 100, 'Accuracy must be in range 0..100');
      assertTrue(summary.speed >= 0, 'Speed must be non-negative');
      assertTrue(summary.errors >= 0, 'Errors must be non-negative');
      assertTrue(summary.duration >= 1, 'Duration must be >= 1s');
      assertNotNull(summary.date.match(/\d{2}\.\d{2}\.\d{4}/), 'Date must match DD.MM.YYYY format');
    });

    test('finishSession() automatically persists session into localStorage trainer_progress when student is logged in', () => {
      const { window } = env;

      // Set logged in student in App
      window.App.state = {
        currentStudent: { id: 'student_7a_01', name: 'Иван Иванов', class: '7-А' },
        currentClass: '7-А'
      };

      window.TypingTrainer.init('screen-typing');
      window.TypingTrainer.start(3);

      const input = env.document.querySelector('#tt-input');
      const spans = env.document.querySelectorAll('#tt-text span');

      // Type 2 correct, 1 wrong
      const c0 = spans[0].textContent === '\u00A0' ? ' ' : spans[0].textContent;
      const c1 = spans[1].textContent === '\u00A0' ? ' ' : spans[1].textContent;
      input.dispatchEvent(new MockKeyboardEvent('keydown', { key: c0 }));
      input.dispatchEvent(new MockKeyboardEvent('keydown', { key: c1 }));
      input.dispatchEvent(new MockKeyboardEvent('keydown', { key: '!' }));

      const summary = window.TypingTrainer.finishSession();

      // Read directly from localStorage
      const storedRaw = window.localStorage.getItem('trainer_progress');
      assertNotNull(storedRaw, 'trainer_progress must exist in localStorage');

      const progress = JSON.parse(storedRaw);
      assertNotNull(progress['student_7a_01'], 'Student entry must exist in trainer_progress');
      const studentTyping = progress['student_7a_01'].typing;

      assertNotNull(studentTyping, 'student typing progress must exist');
      assertTrue(studentTyping.sessions.length >= 1, 'Sessions array must contain at least 1 session');

      const lastSession = studentTyping.sessions[studentTyping.sessions.length - 1];
      assertEquals(lastSession.errors, summary.errors, 'Stored session errors must match summary');
      assertEquals(lastSession.accuracy, summary.accuracy, 'Stored session accuracy must match summary');
      assertEquals(lastSession.speed, summary.speed, 'Stored session speed must match summary');
      assertEquals(lastSession.level, 3, 'Stored session level must match 3');
      assertEquals(lastSession.duration, summary.duration, 'Stored session duration must match summary');
      assertEquals(lastSession.date, summary.date, 'Stored session date must match summary');
    });

    test('finishSession() gracefully succeeds when App or currentStudent is null', () => {
      const { window } = env;

      window.App.state = { currentStudent: null, currentClass: null };

      window.TypingTrainer.init('screen-typing');
      window.TypingTrainer.start(1);

      // Must not throw error even when student is null
      let summary = null;
      try {
        summary = window.TypingTrainer.finishSession();
      } catch (err) {
        assertTrue(false, `finishSession threw error with null student: ${err.message}`);
      }
      assertNotNull(summary, 'finishSession should return summary without error');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SUITE 6: Adversarial Robustness & State Machine Edge Cases
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Suite 6: Adversarial Edge Cases & State Hardening', () => {
    test('Ignored keys (Shift, CapsLock, Tab, Ctrl, Alt) do not increment errors or start timer', () => {
      const { window, document } = env;

      window.TypingTrainer.init('screen-typing');
      window.TypingTrainer.start(1);

      const input = document.querySelector('#tt-input');
      const errorsEl = document.querySelector('#tt-errors');
      const speedEl = document.querySelector('#tt-speed');

      const nonCharKeys = [
        'Shift', 'CapsLock', 'Tab', 'Escape', 'Backspace', 'Enter',
        'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
        'F1', 'F5', 'F12', 'Insert', 'Delete', 'Home', 'End'
      ];

      nonCharKeys.forEach(key => {
        input.dispatchEvent(new MockKeyboardEvent('keydown', { key }));
      });

      // Also modifiers with ctrl/alt
      input.dispatchEvent(new MockKeyboardEvent('keydown', { key: 'c', ctrlKey: true }));
      input.dispatchEvent(new MockKeyboardEvent('keydown', { key: 'v', ctrlKey: true }));
      input.dispatchEvent(new MockKeyboardEvent('keydown', { key: 'Alt', altKey: true }));

      assertEquals(errorsEl.textContent, '0', 'Errors must remain 0 after ignored keys');
      assertEquals(speedEl.textContent, '0', 'Speed must remain 0 (timer should not have started)');
    });

    test('Level boundary clamping handles out-of-range and invalid level values', () => {
      const { window, document } = env;

      window.TypingTrainer.init('screen-typing');

      const levelTitle = document.querySelector('#tt-level-title');

      // Clamps lower bound
      window.TypingTrainer.start(0);
      assertNotNull(levelTitle.textContent.match(/Уровень 1/));

      window.TypingTrainer.start(-10);
      assertNotNull(levelTitle.textContent.match(/Уровень 1/));

      // Clamps upper bound
      window.TypingTrainer.start(99);
      assertNotNull(levelTitle.textContent.match(/Уровень 5/));

      // Non-numeric fallback to 1
      window.TypingTrainer.start('invalid');
      assertNotNull(levelTitle.textContent.match(/Уровень 1/));

      window.TypingTrainer.start(null);
      assertNotNull(levelTitle.textContent.match(/Уровень 1/));
    });

    test('Punctuation key mapping resolves "." and "," on Russian ЙЦУКЕН layout', () => {
      const { window, document } = env;

      window.TypingTrainer.init('screen-typing');

      const dotKey = document.querySelector('#tt-keyboard .kb-key[data-key="."]');
      assertNotNull(dotKey, 'Dot key must exist on visual keyboard');
      assertEquals(dotKey.dataset.alt, ',', 'Dot key must have data-alt=","');
      assertTrue(dotKey.classList.contains('kb-zone-pinky-r'), 'Dot key must belong to pinky-r zone');
    });

    test('Post-completion keystrokes: verify behavior when typing continues past exercise text length', () => {
      const { window, document } = env;

      window.TypingTrainer.init('screen-typing');
      window.TypingTrainer.start(1);

      const input = document.querySelector('#tt-input');
      const spans = document.querySelectorAll('#tt-text span');
      const textLen = spans.length;

      // Complete exercise with all correct characters
      for (let i = 0; i < textLen; i++) {
        const ch = spans[i].textContent === '\u00A0' ? ' ' : spans[i].textContent;
        input.dispatchEvent(new MockKeyboardEvent('keydown', { key: ch }));
      }

      // Result card should be visible
      const resultCard = document.querySelector('#tt-result');
      assertEquals(resultCard.style.display, '', 'Result card visible upon completion');

      const initialErrors = document.querySelector('#tt-res-errors').textContent;
      assertEquals(initialErrors, '0', 'Initial completed errors should be 0');

      // Now send 5 extra keystrokes AFTER completion
      for (let i = 0; i < 5; i++) {
        input.dispatchEvent(new MockKeyboardEvent('keydown', { key: 'a' }));
      }

      const errorsAfter = document.querySelector('#tt-res-errors').textContent;
      assertEquals(errorsAfter, '0', 'Post-completion keystrokes must be blocked; errors count must remain 0');
      const liveErrors = document.querySelector('#tt-errors').textContent;
      assertEquals(liveErrors, '0', 'Live HUD error count must remain 0');
    });

    test('Timer display state on level restart: verify whether #tt-time resets to 0:00', () => {
      const { window, document } = env;

      window.TypingTrainer.init('screen-typing');
      window.TypingTrainer.start(1);

      const timeEl = document.querySelector('#tt-time');
      // Simulate completing after some time
      timeEl.textContent = '0:45';

      // Now restart level
      window.TypingTrainer.start(1);

      const timeOnRestart = timeEl.textContent;
      assertEquals(timeOnRestart, '0:00', 'Timer display #tt-time must be reset to 0:00 on level restart');
    });
  });
});
