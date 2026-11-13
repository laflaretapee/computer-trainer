/**
 * tests/tier5_adversarial/test_typing_adversarial.test.js
 * Comprehensive Adversarial & Empirical Stress Test Harness for Milestone 2:
 * Touch Typing Ergonomics, Hands Visualizer, Russian ЙЦУКЕН Punctuation & Metrics.
 * 
 * Verifies:
 * - Keystroke handling across all 5 levels (letters, spaces, capitals, periods '.', commas ',')
 * - getKeyElement robustness under adversarial, malicious, and invalid selectors
 * - Rapid keystroke bursts (50-100 keystrokes) and concurrency state synchronization
 * - Visual hands indicator (.finger-active) synchronization without ghosting or stuck fingers
 * - Dynamic level transitions (1 -> 5 -> 2 -> 4 -> 1) and state machine resets
 * - CPM spike guard, zero-division protection, and M2 <-> M4 persistence contract
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

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
  MockKeyboardEvent
} = domEnv;

// Support both runner.js global lifecycle and standalone execution
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

testSuite('Tier 5: Adversarial Keystroke, Punctuation & Hands Stress Test (typing.js)', () => {
  let env = null;

  registerBeforeEach(() => {
    env = setupBrowserEnv();
    env.loadAppStack();
    env.window.TypingTrainer.init('typing-container');
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
  // SUITE 1: Comprehensive Character Coverage & getKeyElement Stress Testing
  // ═══════════════════════════════════════════════════════════════════════════

  testSuite('Suite 1: Character Coverage & getKeyElement Robustness', () => {
    testCase('All unique characters in all 5 exercise levels have valid keyboard keys', () => {
      const { document } = env;
      const kb = document.querySelector('#tt-keyboard');
      assertNotNull(kb, '#tt-keyboard must be rendered');

      // Extract all texts from typing.js LEVELS
      const typingCode = fs.readFileSync(path.join(projectRoot, 'modules/typing.js'), 'utf8');
      const levelsMatch = typingCode.match(/const LEVELS = (\[[\s\S]*?\]);/);
      assertNotNull(levelsMatch, 'LEVELS definition must exist in modules/typing.js');
      const levels = eval(levelsMatch[1]);

      const uniqueChars = new Set();
      levels.forEach(lvl => {
        lvl.texts.forEach(text => {
          for (const ch of text) {
            uniqueChars.add(ch);
          }
        });
      });

      // Verify each character resolves to a key element in keyboard
      const allKeys = Array.from(kb.querySelectorAll('.kb-key'));
      for (const ch of uniqueChars) {
        let keyEl = null;
        if (ch === ' ') {
          keyEl = kb.querySelector('.kb-space') || allKeys.find(k => k.dataset.key === ' ');
        } else if (ch === ',' || ch === '.') {
          keyEl = allKeys.find(k => k.dataset.key === '.' || k.dataset.alt === ',');
        } else {
          const lower = ch.toLowerCase();
          keyEl = allKeys.find(k => k.dataset.key === ch || k.dataset.key === lower);
        }
        assertNotNull(keyEl, `Character "${ch}" (from level text) must map to a physical keyboard element`);
        assertTrue(keyEl.classList.contains('kb-key'), `Found element for "${ch}" must have .kb-key class`);
      }
    });

    testCase('Punctuation keys (. and ,) resolve safely without selector syntax errors', () => {
      const { document } = env;
      const kb = document.querySelector('#tt-keyboard');
      const allKeys = Array.from(kb.querySelectorAll('.kb-key'));
      
      const dotKey = allKeys.find(k => k.dataset.key === '.');
      assertNotNull(dotKey, 'Period key [data-key="."] must exist');
      assertEquals(dotKey.dataset.alt, ',', 'Period key must have data-alt=","');
      assertTrue(dotKey.classList.contains('kb-zone-pinky-r'), 'Period key must be mapped to kb-zone-pinky-r');

      // Test comma resolution via data-alt
      const commaKey = allKeys.find(k => k.dataset.alt === ',');
      assertNotNull(commaKey, 'Comma key [data-alt=","] must exist');
      assertEquals(commaKey, dotKey, 'Comma and period must be physically co-located on the same key');
    });

    testCase('Adversarial inputs to getKeyElement never throw selector syntax errors', () => {
      // Create isolated VM context with typing.js internal functions
      const typingCode = fs.readFileSync(path.join(projectRoot, 'modules/typing.js'), 'utf8');
      const instrumentedCode = typingCode.replace(
        'window.TypingTrainer = {',
        'window.__test_getKeyElement = getKeyElement;\nwindow.TypingTrainer = {'
      );

      const vmEnv = setupBrowserEnv();
      vmEnv.loadAppStack();
      // Re-evaluate instrumented code in window context
      const vmScript = new vm.Script(instrumentedCode, { filename: 'modules/typing.js' });
      vmScript.runInNewContext(vmEnv.window);
      vmEnv.window.TypingTrainer.init('typing-container');

      const getKeyElement = vmEnv.window.__test_getKeyElement;
      assertNotNull(getKeyElement, 'Internal getKeyElement function must be accessible for auditing');

      // Array of hostile and adversarial inputs
      const hostileInputs = [
        // Malicious CSS injection strings
        '"]',
        '"',
        "'",
        '\\',
        '[data-key="foo"]',
        'div > span:first-child',
        ';alert(1)',
        '/*comment*/',
        'null',
        'undefined',
        // Control & whitespace chars
        '\0',
        '\n',
        '\r',
        '\t',
        '\u00A0', // Non-breaking space
        // Homoglyphs and Latin characters
        'a', 'b', 'c', 'd', 'e', 'f', 'o', 'p', 'x', 'y',
        'A', 'B', 'C', 'D', 'E', 'O', 'P', 'X',
        // Non-alphanumeric symbols
        '@', '#', '$', '%', '^', '&', '*', '(', ')', '_', '+', '=',
        '{', '}', '|', ':', '"', '<', '>', '?', '~', '`',
        // Cyrillic uppercase letters
        'М', 'К', 'Я', 'Б', 'У', 'Ф', 'Ы', 'В', 'А', 'П', 'Р', 'О', 'Л', 'Д', 'Ж', 'Э',
        // Punctuation and aliases
        '.', ',', 'ё', 'Ё', '—', '–'
      ];

      for (const input of hostileInputs) {
        let result = null;
        let didThrow = false;
        try {
          result = getKeyElement(input);
        } catch (err) {
          didThrow = true;
          throw new Error(`getKeyElement threw on adversarial input "${input}": ${err.message}`);
        }
        assertFalse(didThrow, `getKeyElement must never throw on input "${input}"`);

        // Cyrillic capitals and punctuation must resolve to valid elements
        if (['М', 'К', 'Я', 'Б', 'У', '.', ',', 'ё', 'Ё'].includes(input)) {
          assertNotNull(result, `Valid Cyrillic character/punctuation "${input}" must resolve to a valid element`);
          assertTrue(result.classList.contains('kb-key'), `Resolved element for "${input}" must have .kb-key class`);
        }
      }

      // Null, undefined, empty string must return null safely
      assertEquals(getKeyElement(null), null, 'null input must return null');
      assertEquals(getKeyElement(undefined), null, 'undefined input must return null');
      assertEquals(getKeyElement(''), null, 'empty string must return null');

      vmEnv.teardown();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SUITE 2: Hands Visualizer Synchronization & Anti-Ghosting Verification
  // ═══════════════════════════════════════════════════════════════════════════

  testSuite('Suite 2: Hands Visualizer & Finger Synchronization', () => {
    testCase('Hands visualizer contains exactly 10 fingers, 2 hands, and cue elements', () => {
      const { document } = env;
      const visualizer = document.querySelector('#tt-hands-visualizer');
      assertNotNull(visualizer, '#tt-hands-visualizer must be present in DOM');

      const fingers = visualizer.querySelectorAll('[data-finger]');
      assertEquals(fingers.length, 10, 'Hands visualizer must have exactly 10 finger elements');

      const leftFingers = visualizer.querySelectorAll('.hand-left [data-finger]');
      assertEquals(leftFingers.length, 5, 'Left hand must have 5 fingers');

      const rightFingers = visualizer.querySelectorAll('.hand-right [data-finger]');
      assertEquals(rightFingers.length, 5, 'Right hand must have 5 fingers');

      assertNotNull(visualizer.querySelector('#tt-cue-hand'), 'Cue hand element must exist');
      assertNotNull(visualizer.querySelector('#tt-cue-finger'), 'Cue finger element must exist');
      assertNotNull(visualizer.querySelector('#tt-cue-key'), 'Cue key element must exist');
    });

    testCase('Finger highlighting is strictly exclusive with zero ghost classes', () => {
      const { window, document } = env;
      const visualizer = document.querySelector('#tt-hands-visualizer');

      // Start Level 1
      window.TypingTrainer.start(1);

      // Sequence of test characters across different hands and fingers
      const testSequence = [
        { char: 'ф', expectedFinger: 'pinky-l', expectedHand: 'Левая рука' },
        { char: 'ы', expectedFinger: 'ring-l',  expectedHand: 'Левая рука' },
        { char: 'в', expectedFinger: 'mid-l',   expectedHand: 'Левая рука' },
        { char: 'а', expectedFinger: 'idx-l',   expectedHand: 'Левая рука' },
        { char: ' ', expectedFinger: 'thumb',   expectedHand: 'Обе руки' },
        { char: 'р', expectedFinger: 'idx-r',   expectedHand: 'Правая рука' },
        { char: 'о', expectedFinger: 'idx-r',   expectedHand: 'Правая рука' },
        { char: 'л', expectedFinger: 'mid-r',   expectedHand: 'Правая рука' },
        { char: 'д', expectedFinger: 'ring-r',  expectedHand: 'Правая рука' },
        { char: 'ж', expectedFinger: 'pinky-r', expectedHand: 'Правая рука' },
        { char: '.', expectedFinger: 'pinky-r', expectedHand: 'Правая рука' },
        { char: ',', expectedFinger: 'pinky-r', expectedHand: 'Правая рука' },
        { char: 'М', expectedFinger: 'idx-l',   expectedHand: 'Левая рука' },
        { char: 'Б', expectedFinger: 'mid-r',   expectedHand: 'Правая рука' }
      ];

      // Test helper: trigger highlightNextKey by setting current text & pos
      const typingCode = fs.readFileSync(path.join(projectRoot, 'modules/typing.js'), 'utf8');
      const instrumentedCode = typingCode.replace(
        'window.TypingTrainer = {',
        'window.__test_updateHandsHighlight = updateHandsHighlight;\nwindow.TypingTrainer = {'
      );
      const vmEnv = setupBrowserEnv();
      vmEnv.loadAppStack();
      new vm.Script(instrumentedCode, { filename: 'modules/typing.js' }).runInNewContext(vmEnv.window);
      vmEnv.window.TypingTrainer.init('typing-container');

      const updateHighlight = vmEnv.window.__test_updateHandsHighlight;
      const vmVis = vmEnv.document.querySelector('#tt-hands-visualizer');

      for (let i = 0; i < testSequence.length; i++) {
        const item = testSequence[i];
        updateHighlight(item.char);

        const activeFingers = vmVis.querySelectorAll('.finger-active');

        if (item.char === ' ') {
          // Spacebar highlights both thumbs
          assertEquals(activeFingers.length, 2, `Spacebar must highlight exactly 2 thumbs, got ${activeFingers.length}`);
          const thumbs = Array.from(activeFingers).map(el => el.dataset.finger).sort();
          assertTrue(thumbs.includes('thumb-l') && thumbs.includes('thumb-r'), 'Both thumbs must be active for spacebar');
        } else {
          // All other characters must have exactly ONE active finger
          assertEquals(
            activeFingers.length,
            1,
            `Char "${item.char}" must activate exactly 1 finger, got ${activeFingers.length} active fingers`
          );
          assertEquals(
            activeFingers[0].dataset.finger,
            item.expectedFinger,
            `Char "${item.char}" must highlight "${item.expectedFinger}", got "${activeFingers[0].dataset.finger}"`
          );
        }

        // Verify cue panel text
        const cueHand = vmVis.querySelector('#tt-cue-hand').textContent;
        const cueKey = vmVis.querySelector('#tt-cue-key').textContent;
        assertEquals(cueHand, item.expectedHand, `Cue hand for "${item.char}" must match expected hand`);
        assertTrue(cueKey.length > 0, `Cue key for "${item.char}" must not be empty`);
      }

      // Verify null clears all active fingers
      updateHighlight(null);
      const remainingActive = vmVis.querySelectorAll('.finger-active');
      assertEquals(remainingActive.length, 0, 'updateHandsHighlight(null) must clear all active finger classes');
      assertEquals(vmVis.querySelector('#tt-cue-key').textContent, '✓', 'Cue key badge must display checkmark on completion');

      vmEnv.teardown();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SUITE 3: Rapid Keystroke Bursts & Concurrency State Resiliency
  // ═══════════════════════════════════════════════════════════════════════════

  testSuite('Suite 3: Rapid Keystroke Bursts & Concurrency Resilience', () => {
    testCase('Rapid burst of 100 consecutive keystrokes maintains strict state invariants', () => {
      const { window, document } = env;
      window.TypingTrainer.start(1);

      const input = document.querySelector('#tt-input');
      assertNotNull(input, '#tt-input must exist');

      const spans = document.querySelectorAll('#tt-text span');
      const textLen = spans.length;
      assertTrue(textLen > 0, 'Exercise text must not be empty');

      // Dispatch 100 keystrokes rapidly (alternating between expected chars and intentional mismatches)
      let expectedCorrect = 0;
      let expectedErrors = 0;

      for (let i = 0; i < 100; i++) {
        // If exercise completed, start next level to continue stress burst
        const resCard = document.querySelector('#tt-result');
        if (resCard && resCard.style.display !== 'none') {
          window.TypingTrainer.start((i % 5) + 1);
          expectedCorrect = 0;
          expectedErrors = 0;
        }

        const currentSpan = document.querySelector('#tt-text span.char-current');
        if (!currentSpan) break;
        const expectedChar = currentSpan.textContent === '\u00A0' ? ' ' : currentSpan.textContent;

        // Even index: type correct key. Odd index: type intentional wrong key 'ъ' or 'z'
        const isOdd = i % 2 === 1;
        const keyToSend = isOdd ? 'z' : expectedChar;

        if (keyToSend === expectedChar) {
          expectedCorrect++;
        } else {
          expectedErrors++;
        }

        input.dispatchEvent(new MockKeyboardEvent('keydown', { key: keyToSend }));

        // Real-time error counter in DOM must stay strictly in sync
        const errorsEl = document.querySelector('#tt-errors');
        assertEquals(
          parseInt(errorsEl.textContent, 10),
          expectedErrors,
          `DOM errors count must strictly match expected errors after keystroke ${i + 1}`
        );

        // Accuracy in DOM must be a valid integer between 0 and 100
        const accEl = document.querySelector('#tt-accuracy');
        const accVal = parseInt(accEl.textContent, 10);
        assertFalse(isNaN(accVal), 'Accuracy must never be NaN');
        assertBetween(accVal, 0, 100, 'Accuracy must remain between 0 and 100%');
      }
    });

    testCase('Rapid storm of 50 non-character and modifier keys is safely ignored', () => {
      const { window, document } = env;
      window.TypingTrainer.start(1);

      const input = document.querySelector('#tt-input');
      const errorsEl = document.querySelector('#tt-errors');
      const accEl = document.querySelector('#tt-accuracy');
      const speedEl = document.querySelector('#tt-speed');

      assertEquals(errorsEl.textContent, '0', 'Initial errors must be 0');
      assertEquals(accEl.textContent, '100', 'Initial accuracy must be 100');

      const ignoredKeys = [
        'Shift', 'Shift', 'CapsLock', 'Tab', 'Escape',
        'F1', 'F2', 'F5', 'F12',
        'Insert', 'Delete', 'Home', 'End', 'PageUp', 'PageDown',
        'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
        'Backspace', 'Enter'
      ];

      // Dispatch 50 non-character keys rapidly
      for (let i = 0; i < 50; i++) {
        const key = ignoredKeys[i % ignoredKeys.length];
        input.dispatchEvent(new MockKeyboardEvent('keydown', { key }));
      }

      // Assert zero penalties or position shifts occurred
      assertEquals(errorsEl.textContent, '0', 'Non-character keys must never increment errors counter');
      assertEquals(accEl.textContent, '100', 'Non-character keys must not affect accuracy');
      assertEquals(speedEl.textContent, '0', 'Non-character keys must not start typing speed calculation');

      // The first character span must still have .char-current
      const firstSpan = document.querySelector('#tt-text span');
      assertTrue(firstSpan.classList.contains('char-current'), 'First character must still be active and waiting');
    });

    testCase('Keyboard flash key timer does not accumulate memory leaks during rapid typing', () => {
      const { window, document } = env;
      window.TypingTrainer.start(1);

      const input = document.querySelector('#tt-input');
      const kb = document.querySelector('#tt-keyboard');

      // Fire 40 rapid keystrokes within simulated rapid milliseconds
      for (let i = 0; i < 40; i++) {
        input.dispatchEvent(new MockKeyboardEvent('keydown', { key: 'а' }));
      }

      // At most one key should have .key-active at any single moment
      const activeKeys = kb.querySelectorAll('.key-active');
      assertTrue(activeKeys.length <= 1, `At most 1 key can have .key-active, found ${activeKeys.length}`);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SUITE 4: Level Transitions & State Machine Resets (1 -> 5 -> 2 -> 4 -> 1)
  // ═══════════════════════════════════════════════════════════════════════════

  testSuite('Suite 4: Level Transitions & State Resets', () => {
    testCase('Switching level midway (1 -> 5 -> 2 -> 1) resets state, timers, and DOM completely', () => {
      const { window, document } = env;

      // 1. Start Level 1 and type 3 characters with 1 error
      window.TypingTrainer.start(1);
      const input = document.querySelector('#tt-input');
      const errorsEl = document.querySelector('#tt-errors');
      const titleEl = document.querySelector('#tt-level-title');

      assertTrue(titleEl.textContent.includes('Уровень 1'), 'Title must display Level 1');
      input.dispatchEvent(new MockKeyboardEvent('keydown', { key: 'z' })); // Error 1
      assertEquals(errorsEl.textContent, '1', 'Errors must be 1 after intentional mismatch');

      // 2. Switch to Level 5 without finishing Level 1
      window.TypingTrainer.start(5);

      assertTrue(titleEl.textContent.includes('Уровень 5'), 'Title must update to Level 5');
      assertEquals(errorsEl.textContent, '0', 'Errors must reset to 0 on level switch');
      assertEquals(document.querySelector('#tt-speed').textContent, '0', 'Speed must reset to 0');
      assertEquals(document.querySelector('#tt-accuracy').textContent, '100', 'Accuracy must reset to 100');
      assertEquals(document.querySelector('#tt-time').textContent, '0:00', 'Time must reset to 0:00');
      assertEquals(document.querySelector('#tt-result').style.display, 'none', 'Result card must be hidden');

      // Check active level button in DOM
      const btnLvl5 = document.querySelector('.level-btn[data-level="5"]');
      const btnLvl1 = document.querySelector('.level-btn[data-level="1"]');
      assertTrue(btnLvl5.classList.contains('active'), 'Level 5 button must have .active');
      assertFalse(btnLvl1.classList.contains('active'), 'Level 1 button must not have .active');

      // Type 2 keys in Level 5
      input.dispatchEvent(new MockKeyboardEvent('keydown', { key: 'z' })); // Error in Level 5
      assertEquals(errorsEl.textContent, '1', 'Errors must be 1 in Level 5');

      // 3. Switch to Level 2
      window.TypingTrainer.start(2);
      assertTrue(titleEl.textContent.includes('Уровень 2'), 'Title must update to Level 2');
      assertEquals(errorsEl.textContent, '0', 'Errors must cleanly reset to 0 on Level 2 start');

      // 4. Switch back to Level 1
      window.TypingTrainer.start(1);
      assertTrue(titleEl.textContent.includes('Уровень 1'), 'Title must update back to Level 1');
      assertEquals(errorsEl.textContent, '0', 'Errors must reset back to 0 on Level 1 start');
    });

    testCase('Complete full typing flow across all 5 levels without runtime failures', () => {
      const { window, document } = env;

      for (let levelId = 1; levelId <= 5; levelId++) {
        window.TypingTrainer.start(levelId);

        const input = document.querySelector('#tt-input');
        assertNotNull(input);

        // Read all spans
        const spans = document.querySelectorAll('#tt-text span');
        const chars = Array.from(spans).map(s => s.textContent === '\u00A0' ? ' ' : s.textContent);
        assertTrue(chars.length > 0, `Level ${levelId} text must contain characters`);

        // Type all characters correctly to complete exercise
        for (let i = 0; i < chars.length; i++) {
          const ch = chars[i];
          input.dispatchEvent(new MockKeyboardEvent('keydown', { key: ch }));
        }

        // Exercise must be completed
        const resCard = document.querySelector('#tt-result');
        assertNotNull(resCard, `Level ${levelId} result card must exist`);
        assertEquals(resCard.style.display, '', `Level ${levelId} result card must be visible`);

        // Check metrics in result card
        const resAcc = parseInt(document.querySelector('#tt-res-accuracy').textContent, 10);
        assertEquals(resAcc, 100, `Level ${levelId} accuracy must be 100%`);

        const resErrors = parseInt(document.querySelector('#tt-res-errors').textContent, 10);
        assertEquals(resErrors, 0, `Level ${levelId} errors must be 0`);

        const resSpeed = parseInt(document.querySelector('#tt-res-speed').textContent, 10);
        assertFalse(isNaN(resSpeed), `Level ${levelId} speed must be a valid number`);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SUITE 5: Boundary Values, Spike Guard & M2 <-> M4 Contract
  // ═══════════════════════════════════════════════════════════════════════════

  testSuite('Suite 5: Boundary Values, Spike Guard & Contract Conformance', () => {
    testCase('Zero-keystroke immediate finishSession returns valid schema without NaN', () => {
      const { window } = env;
      window.TypingTrainer.start(1);

      // Finish immediately with 0 keystrokes
      const summary = window.TypingTrainer.finishSession();

      assertNotNull(summary, 'finishSession must return summary');
      assertEquals(summary.speed, 0, 'Zero keystroke speed must be 0');
      assertEquals(summary.accuracy, 100, 'Zero keystroke accuracy must default to 100%');
      assertEquals(summary.errors, 0, 'Zero keystroke errors must be 0');
      assertEquals(summary.level, 1, 'Level must be 1');
      assertTrue(summary.duration >= 1, 'Duration must be at least 1 second');
      assertTrue(typeof summary.date === 'string' && summary.date.length > 0, 'Date must be a non-empty string');
    });

    testCase('First keystroke within < 1.0s does not produce extreme speed spike', () => {
      const { window, document } = env;
      window.TypingTrainer.start(1);

      const input = document.querySelector('#tt-input');
      const currentSpan = document.querySelector('#tt-text span.char-current');
      const expectedChar = currentSpan.textContent === '\u00A0' ? ' ' : currentSpan.textContent;

      // First keystroke
      input.dispatchEvent(new MockKeyboardEvent('keydown', { key: expectedChar }));

      const speedEl = document.querySelector('#tt-speed');
      const speedVal = parseInt(speedEl.textContent, 10);
      assertEquals(speedVal, 0, 'Speed must remain 0 during the first second to guard against millisecond spikes');
    });

    testCase('100% error typing boundary yields 0% accuracy and precise error count', () => {
      const { window, document } = env;
      window.TypingTrainer.start(1);

      const input = document.querySelector('#tt-input');
      const spans = document.querySelectorAll('#tt-text span');
      const textLen = spans.length;

      // Type an erroneous character for every single position in the text
      for (let i = 0; i < textLen; i++) {
        input.dispatchEvent(new MockKeyboardEvent('keydown', { key: '@' }));
      }

      // Verify completion
      const resCard = document.querySelector('#tt-result');
      assertEquals(resCard.style.display, '', 'Result card must display after typing all characters');

      const resAcc = parseInt(document.querySelector('#tt-res-accuracy').textContent, 10);
      assertEquals(resAcc, 0, '100% wrong typing must yield 0% accuracy');

      const resErrors = parseInt(document.querySelector('#tt-res-errors').textContent, 10);
      assertEquals(resErrors, textLen, 'Errors count must equal text length');
    });

    testCase('M2 <-> M4 Contract: Typing session persists to App.saveProgress with studentId and errors', () => {
      const { window } = env;

      // Mock student session in App.state
      window.App.state = {
        currentStudent: { id: 'student_challenger_test', name: 'Алиса Тестова', class: '7-Б' },
        currentClass: '7-Б'
      };

      let capturedCall = null;
      const originalSaveProgress = window.App.saveProgress;
      window.App.saveProgress = function(studentId, moduleName, data) {
        capturedCall = { studentId, moduleName, data };
        return originalSaveProgress.call(window.App, studentId, moduleName, data);
      };

      window.TypingTrainer.start(2);
      const summary = window.TypingTrainer.finishSession();

      assertNotNull(capturedCall, 'App.saveProgress must be called upon finishSession()');
      assertEquals(capturedCall.studentId, 'student_challenger_test', 'studentId must match currentStudent.id');
      assertEquals(capturedCall.moduleName, 'typing', 'moduleName must be "typing"');
      assertEquals(capturedCall.data.errors, summary.errors, 'errors field must be present in saved progress payload');
      assertEquals(capturedCall.data.speed, summary.speed, 'speed field must match');
      assertEquals(capturedCall.data.accuracy, summary.accuracy, 'accuracy field must match');
      assertEquals(capturedCall.data.level, 2, 'level field must match');

      // Restore
      window.App.saveProgress = originalSaveProgress;
    });

    testCase('TypingTrainer.destroy completely unmounts, clears intervals, and clears highlights', () => {
      const { window, document } = env;
      window.TypingTrainer.start(1);

      window.TypingTrainer.destroy();

      const activeKeys = document.querySelectorAll('#tt-keyboard .key-next, #tt-keyboard .key-active, #tt-keyboard .active');
      assertEquals(activeKeys.length, 0, 'All key highlight classes must be removed on destroy()');

      const activeFingers = document.querySelectorAll('#tt-hands-visualizer .finger-active');
      assertEquals(activeFingers.length, 0, 'All finger highlight classes must be removed on destroy()');
    });
  });
});

// Standalone execution support
if (!hasDescribe) {
  console.log('\n✔ ALL STANDALONE ADVERSARIAL STRESS TESTS COMPLETED SUCCESSFULLY.');
}
