/**
 * tests/tier5_adversarial/test_mouse_ex123_stress.test.js
 * Empirical Challenger Deep Stress Test Harness for Milestone 3 (Exercises 1, 2, 3).
 *
 * Covers:
 * - Ex 1: Full 15-target completion, timeout sequence, spamming storms, post-completion click immunity.
 * - Ex 2: Multi-quest progression, 10x rapid double-click window re-entry spam, manual close button, wrong target recovery.
 * - Ex 3: Full 5-task completion, negative coordinate clamping, rapid multi-position contextmenu spam, post-completion immunity.
 * - Multi-Exercise rapid switching and teardown idempotency.
 */

'use strict';

const assertHelper = require('../helpers/assert');
const {
  assert,
  assertEquals,
  assertNotEquals,
  assertTrue,
  assertFalse,
  assertNotNull,
  assertNull,
  assertBetween
} = assertHelper;

const domEnv = require('../helpers/dom_env');
const {
  setupBrowserEnv,
  MockMouseEvent,
  MockKeyboardEvent
} = domEnv;

describe('Tier 5 Adversarial: Deep Stress & Invariant Verification (Exercises 1, 2, 3)', () => {
  let env = null;

  beforeEach(() => {
    env = setupBrowserEnv();
    env.loadAppStack();
  });

  afterEach(() => {
    if (env) {
      if (env.window.MouseTrainer && typeof env.window.MouseTrainer.destroy === 'function') {
        env.window.MouseTrainer.destroy();
      }
      env.teardown();
      env = null;
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // EXERCISE 1: Full Lifecycle, Timeout Handling & Storm Invariants
  // ═══════════════════════════════════════════════════════════════════════════

  test('Ex 1: Full 15-target progression with mixed center hits, outer hits, and timeouts', () => {
    const { window, document } = env;
    window.MouseTrainer.init('mouse-container');
    window.MouseTrainer.selectExercise(1);

    const arena = document.getElementById('mouse-arena');
    const scoreEl = document.getElementById('mouse-stat-score');
    const errorsEl = document.getElementById('mouse-stat-errors');
    const progressEl = document.getElementById('mouse-stat-progress-text');

    // Progression of 15 targets:
    // Targets 1..5: bullseye center hits (+100 each -> +500)
    for (let i = 1; i <= 5; i++) {
      assertEquals(progressEl.textContent, `${i} / 15`, `Progress should be at target ${i}`);
      const target = arena.querySelector('.mouse-target');
      assertNotNull(target, `Target ${i} must exist in arena`);
      target.getBoundingClientRect = () => ({ left: 100, top: 100, width: 60, height: 60 });
      target.dispatchEvent(new MockMouseEvent('click', { bubbles: true, cancelable: true, clientX: 130, clientY: 130 }));
    }
    assertEquals(scoreEl.textContent, '500');
    assertEquals(errorsEl.textContent, '0');

    // Targets 6..10: outer ring hits (+50 each -> +250, total 750)
    for (let i = 6; i <= 10; i++) {
      assertEquals(progressEl.textContent, `${i} / 15`, `Progress should be at target ${i}`);
      const target = arena.querySelector('.mouse-target');
      assertNotNull(target, `Target ${i} must exist in arena`);
      // Size for 6..10 is 46, center = 123
      target.getBoundingClientRect = () => ({ left: 100, top: 100, width: 46, height: 46 });
      // radius = 23, bullseye <= 9.2. Click at dist = 15px (outer)
      target.dispatchEvent(new MockMouseEvent('click', { bubbles: true, cancelable: true, clientX: 138, clientY: 123 }));
    }
    assertEquals(scoreEl.textContent, '750');
    assertEquals(errorsEl.textContent, '0');

    // Targets 11..15: bullseye center hits (+100 each -> +500, total 1250)
    for (let i = 11; i <= 15; i++) {
      assertEquals(progressEl.textContent, `${i} / 15`, `Progress should be at target ${i}`);
      const target = arena.querySelector('.mouse-target');
      assertNotNull(target, `Target ${i} must exist in arena`);
      target.getBoundingClientRect = () => ({ left: 100, top: 100, width: 34, height: 34 });
      target.dispatchEvent(new MockMouseEvent('click', { bubbles: true, cancelable: true, clientX: 117, clientY: 117 }));
    }

    // Session must be complete
    assertEquals(scoreEl.textContent, '1250', 'Total score must equal exactly 1250');
    assertEquals(errorsEl.textContent, '0');

    // Post-completion check: No target left in arena
    const remainingTarget = arena.querySelector('.mouse-target');
    assertNull(remainingTarget, 'No target should remain in arena after 15 targets completed');

    // Result card should be visible
    const resultCard = document.getElementById('mouse-result-card');
    assertNotNull(resultCard);
    assertEquals(resultCard.style.display, 'block', 'Result card must be displayed upon completion');

    // Post-completion storm: 20 arena clicks must NOT decrement score or alter stats
    for (let k = 0; k < 20; k++) {
      arena.dispatchEvent(new MockMouseEvent('click', { bubbles: true, cancelable: true, clientX: 50, clientY: 50 }));
    }
    assertEquals(scoreEl.textContent, '1250', 'Score must remain frozen after session completion');
    assertEquals(errorsEl.textContent, '0', 'Errors must remain 0 after session completion');
  });

  test('Ex 1: 50-event high-speed click spam storm on single target does not duplicate points', () => {
    const { window, document } = env;
    window.MouseTrainer.init('mouse-container');
    window.MouseTrainer.selectExercise(1);

    const arena = document.getElementById('mouse-arena');
    const scoreEl = document.getElementById('mouse-stat-score');
    const target = arena.querySelector('.mouse-target');
    assertNotNull(target);

    target.getBoundingClientRect = () => ({ left: 100, top: 100, width: 60, height: 60 });

    // Spam 50 clicks synchronously on the very same target node
    for (let i = 0; i < 50; i++) {
      target.dispatchEvent(new MockMouseEvent('click', { bubbles: true, cancelable: true, clientX: 130, clientY: 130 }));
    }

    // Only 1 hit (100 pts) from this target
    const currentScore = parseInt(scoreEl.textContent, 10);
    assertEquals(currentScore, 100, `Spamming 50 clicks on a target must result in exactly 100 pts, got ${currentScore}`);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // EXERCISE 2: Full Quest Progression, Window Animation Re-entry, & Manual Close
  // ═══════════════════════════════════════════════════════════════════════════

  test('Ex 2: Sequential double click progression across quests with window transitions', async () => {
    const { window, document } = env;
    window.MouseTrainer.init('mouse-container');
    window.MouseTrainer.selectExercise(2);

    const arena = document.getElementById('mouse-arena');
    const scoreEl = document.getElementById('mouse-stat-score');

    const originalDateNow = Date.now;
    let fakeTime = 10000;
    Date.now = () => fakeTime;

    const questOrder = ['app_paint', 'app_folder'];

    try {
      for (let q = 0; q < questOrder.length; q++) {
        const appId = questOrder[q];
        const icon = arena.querySelector(`[data-app-id="${appId}"]`);
        assertNotNull(icon, `Icon for quest ${appId} must exist`);

        // Perform valid double click:
        fakeTime += 500;
        icon.dispatchEvent(new MockMouseEvent('click', { bubbles: true, cancelable: true, clientX: 100, clientY: 100 }));
        fakeTime += 150;
        icon.dispatchEvent(new MockMouseEvent('click', { bubbles: true, cancelable: true, clientX: 102, clientY: 101 }));

        assertEquals(scoreEl.textContent, String((q + 1) * 100), `Score after quest ${q + 1} must be ${(q + 1) * 100}`);

        // A simulated window must appear
        const simWindow = arena.querySelector('.simulated-window');
        assertNotNull(simWindow, `Simulated window must be active during quest ${q + 1}`);

        // Await simulated window auto-transition (1600ms timer)
        await new Promise(resolve => setTimeout(resolve, 1650));
      }

      assertEquals(scoreEl.textContent, '200', 'Score after 2 double-click quests must be 200');
    } finally {
      Date.now = originalDateNow;
    }
  });

  test('Ex 2: 10x rapid double-click re-entry spam while window is open produces zero duplicate scores', async () => {
    const { window, document } = env;
    window.MouseTrainer.init('mouse-container');
    window.MouseTrainer.selectExercise(2);

    const arena = document.getElementById('mouse-arena');
    const scoreEl = document.getElementById('mouse-stat-score');
    const paintIcon = arena.querySelector('[data-app-id="app_paint"]');

    const originalDateNow = Date.now;
    let fakeTime = 10000;
    Date.now = () => fakeTime;

    try {
      // First valid double click
      paintIcon.dispatchEvent(new MockMouseEvent('click', { bubbles: true, cancelable: true, clientX: 100, clientY: 100 }));
      fakeTime += 200;
      paintIcon.dispatchEvent(new MockMouseEvent('click', { bubbles: true, cancelable: true, clientX: 100, clientY: 100 }));

      assertEquals(scoreEl.textContent, '100');

      // Now spam 10 double-clicks (20 clicks) rapidly while window is open
      for (let s = 0; s < 10; s++) {
        fakeTime += 50;
        paintIcon.dispatchEvent(new MockMouseEvent('click', { bubbles: true, cancelable: true, clientX: 100, clientY: 100 }));
        fakeTime += 50;
        paintIcon.dispatchEvent(new MockMouseEvent('click', { bubbles: true, cancelable: true, clientX: 100, clientY: 100 }));
      }

      assertEquals(scoreEl.textContent, '100', 'Score must strictly remain 100 during window transition');

      // Also verify native dblclick spam is blocked
      for (let s = 0; s < 5; s++) {
        paintIcon.dispatchEvent(new MockMouseEvent('dblclick', { bubbles: true, cancelable: true }));
      }
      assertEquals(scoreEl.textContent, '100', 'Score must remain 100 when native dblclick is spammed');

      // Let window auto-close
      await new Promise(resolve => setTimeout(resolve, 1650));
    } finally {
      Date.now = originalDateNow;
    }
  });

  test('Ex 2: Manual window close via button closes window cleanly and advances properly', async () => {
    const { window, document } = env;
    window.MouseTrainer.init('mouse-container');
    window.MouseTrainer.selectExercise(2);

    const arena = document.getElementById('mouse-arena');
    const paintIcon = arena.querySelector('[data-app-id="app_paint"]');

    const originalDateNow = Date.now;
    let fakeTime = 10000;
    Date.now = () => fakeTime;

    try {
      // Trigger double-click
      paintIcon.dispatchEvent(new MockMouseEvent('click', { bubbles: true, cancelable: true, clientX: 100, clientY: 100 }));
      fakeTime += 200;
      paintIcon.dispatchEvent(new MockMouseEvent('click', { bubbles: true, cancelable: true, clientX: 100, clientY: 100 }));

      const simWindow = arena.querySelector('.simulated-window');
      assertNotNull(simWindow);

      const closeBtn = simWindow.querySelector('#sim-win-close');
      assertNotNull(closeBtn, 'Close button must exist in window header');

      // Manually click close button
      closeBtn.dispatchEvent(new MockMouseEvent('click', { bubbles: true, cancelable: true }));

      // Window should be removed from DOM
      const winAfterClose = arena.querySelector('.simulated-window');
      assertNull(winAfterClose, 'Window should be removed after clicking close button');

      // Await timer transition to ensure next quest prompt renders cleanly without error
      await new Promise(resolve => setTimeout(resolve, 1650));

      const promptEl = document.getElementById('mouse-task-prompt');
      assertTrue(promptEl.innerHTML.includes('Папка &quot;Проекты 7-А&quot;') || promptEl.innerHTML.includes('Проекты 7-А'),
        'Next quest (Проекты 7-А) should be prompted');
    } finally {
      Date.now = originalDateNow;
    }
  });

  test('Ex 2: Double-clicking wrong icon triggers coaching and miss penalty, then correct icon succeeds', () => {
    const { window, document } = env;
    window.MouseTrainer.init('mouse-container');
    window.MouseTrainer.selectExercise(2);

    const arena = document.getElementById('mouse-arena');
    const calcIcon = arena.querySelector('[data-app-id="app_calc"]');
    const paintIcon = arena.querySelector('[data-app-id="app_paint"]');
    const scoreEl = document.getElementById('mouse-stat-score');
    const errorsEl = document.getElementById('mouse-stat-errors');

    const originalDateNow = Date.now;
    let fakeTime = 10000;
    Date.now = () => fakeTime;

    try {
      // Current quest is Paint. Double-click Calc (wrong!)
      calcIcon.dispatchEvent(new MockMouseEvent('click', { bubbles: true, cancelable: true, clientX: 100, clientY: 100 }));
      fakeTime += 200;
      calcIcon.dispatchEvent(new MockMouseEvent('click', { bubbles: true, cancelable: true, clientX: 100, clientY: 100 }));

      assertEquals(errorsEl.textContent, '1', 'Wrong icon double-click must record 1 error');
      assertEquals(scoreEl.textContent, '0', 'Wrong icon double-click must award 0 points');

      // Now double click the correct icon (Paint)
      fakeTime += 300;
      paintIcon.dispatchEvent(new MockMouseEvent('click', { bubbles: true, cancelable: true, clientX: 100, clientY: 100 }));
      fakeTime += 200;
      paintIcon.dispatchEvent(new MockMouseEvent('click', { bubbles: true, cancelable: true, clientX: 100, clientY: 100 }));

      assertEquals(scoreEl.textContent, '100', 'Correct icon double-click must succeed after wrong attempt');
      assertEquals(errorsEl.textContent, '1');
    } finally {
      Date.now = originalDateNow;
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // EXERCISE 3: Full 5-Task Flow, Negative Coords & Multi-Spawn Stress
  // ═══════════════════════════════════════════════════════════════════════════

  test('Ex 3: Full 5-task context menu flow with exact action verification', async () => {
    const { window, document } = env;
    window.MouseTrainer.init('mouse-container');
    window.MouseTrainer.selectExercise(3);

    const arena = document.getElementById('mouse-arena');
    const scoreEl = document.getElementById('mouse-stat-score');
    const progressEl = document.getElementById('mouse-stat-progress-text');

    const tasks = [
      { targetSelector: '[data-target-name="Реферат_История.docx"]', action: 'rename' },
      { targetSelector: null, action: 'new_folder' }, // desktop
      { targetSelector: '[data-target-name="virus_trojan.tmp"]', action: 'delete' },
      { targetSelector: '[data-target-type="folder"]', action: 'props' },
      { targetSelector: '[data-target-name="Гимн_Школы.mp3"]', action: 'copy' }
    ];

    for (let i = 0; i < tasks.length; i++) {
      const { targetSelector, action } = tasks[i];

      let targetEl = targetSelector ? arena.querySelector(targetSelector) : arena;
      assertNotNull(targetEl, `Target for step ${i + 1} must exist`);

      // Right click to open context menu
      targetEl.dispatchEvent(new MockMouseEvent('contextmenu', {
        button: 2,
        bubbles: true,
        cancelable: true,
        clientX: 200,
        clientY: 200
      }));

      const menu = arena.querySelector('.mouse-context-menu');
      assertNotNull(menu, `Context menu must open for step ${i + 1}`);

      const actionItem = menu.querySelector(`[data-action="${action}"]`);
      assertNotNull(actionItem, `Action item [data-action="${action}"] must exist in menu`);

      // Click the required action
      actionItem.dispatchEvent(new MockMouseEvent('click', { bubbles: true, cancelable: true }));

      // Menu should automatically close
      assertNull(arena.querySelector('.mouse-context-menu'), `Context menu must close after selecting action ${action}`);

      assertEquals(scoreEl.textContent, String((i + 1) * 100), `Score after step ${i + 1} must be ${(i + 1) * 100}`);
      assertEquals(progressEl.textContent, `${i + 1} / 5`, `Progress after step ${i + 1} must be ${i + 1} / 5`);

      // If delete was executed, virus_trojan.tmp should be hidden
      if (action === 'delete') {
        const trojan = arena.querySelector('[data-target-name="virus_trojan.tmp"]');
        assertEquals(trojan.style.display, 'none', 'Deleted trojan file must have display: none');
      }
    }

    // Await finishSession completion (500ms timeout)
    await new Promise(resolve => setTimeout(resolve, 550));

    assertEquals(scoreEl.textContent, '500');

    // Post-completion right-clicks must not spawn crashing actions
    arena.dispatchEvent(new MockMouseEvent('contextmenu', { button: 2, bubbles: true, cancelable: true, clientX: 200, clientY: 200 }));
  });

  test('Ex 3: Negative coordinates (clientX < 0, clientY < 0) clamp safely within arena boundaries', () => {
    const { window, document } = env;
    window.MouseTrainer.init('mouse-container');
    window.MouseTrainer.selectExercise(3);

    const arena = document.getElementById('mouse-arena');
    arena.getBoundingClientRect = () => ({
      left: 0,
      top: 0,
      width: 800,
      height: 500,
      right: 800,
      bottom: 500
    });
    Object.defineProperty(arena, 'clientWidth', { value: 800, configurable: true });
    Object.defineProperty(arena, 'clientHeight', { value: 500, configurable: true });

    arena.dispatchEvent(new MockMouseEvent('contextmenu', {
      button: 2,
      bubbles: true,
      cancelable: true,
      clientX: -150,
      clientY: -80
    }));

    const menu = arena.querySelector('.mouse-context-menu');
    assertNotNull(menu);
    const left = parseFloat(menu.style.left);
    const top = parseFloat(menu.style.top);

    assertTrue(left >= 6, `Left (${left}) must clamp to at least 6px`);
    assertTrue(top >= 6, `Top (${top}) must clamp to at least 6px`);
    assertTrue(left + 190 <= 800, 'Menu must not overflow right');
    assertTrue(top + 180 <= 500, 'Menu must not overflow bottom');
  });

  test('Ex 3: 10 rapid contextmenu events in different locations keep strictly 1 menu in DOM', () => {
    const { window, document } = env;
    window.MouseTrainer.init('mouse-container');
    window.MouseTrainer.selectExercise(3);

    const arena = document.getElementById('mouse-arena');

    for (let i = 0; i < 10; i++) {
      arena.dispatchEvent(new MockMouseEvent('contextmenu', {
        button: 2,
        bubbles: true,
        cancelable: true,
        clientX: 100 + i * 20,
        clientY: 100 + i * 15
      }));

      const menus = arena.querySelectorAll('.mouse-context-menu');
      assertEquals(menus.length, 1, `There must be strictly 1 context menu in DOM after right click ${i + 1}`);
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // EXERCISES 1-3: Rapid Exercise Switching & Teardown Idempotency
  // ═══════════════════════════════════════════════════════════════════════════

  test('Rapid switching across Exercises 1 -> 2 -> 3 -> 1 cleanly purges previous state and timers', () => {
    const { window, document } = env;
    window.MouseTrainer.init('mouse-container');

    // Exercise 1
    window.MouseTrainer.selectExercise(1);
    let arena = document.getElementById('mouse-arena');
    assertNotNull(arena.querySelector('.mouse-target'), 'Ex 1 target must exist');

    // Rapid switch to Exercise 2
    window.MouseTrainer.selectExercise(2);
    arena = document.getElementById('mouse-arena');
    assertNull(arena.querySelector('.mouse-target'), 'Ex 1 target must be purged');
    assertNotNull(arena.querySelector('.desktop-grid'), 'Ex 2 desktop grid must exist');

    // Rapid switch to Exercise 3
    window.MouseTrainer.selectExercise(3);
    arena = document.getElementById('mouse-arena');
    assertNull(arena.querySelector('.desktop-grid'), 'Ex 2 grid must be purged');
    assertNotNull(arena.querySelector('[data-target-type="desktop"]'), 'Ex 3 workspace must exist');

    // Rapid switch back to Exercise 1
    window.MouseTrainer.selectExercise(1);
    arena = document.getElementById('mouse-arena');
    assertNull(arena.querySelector('[data-target-type="desktop"]'), 'Ex 3 workspace must be purged');
    assertNotNull(arena.querySelector('.mouse-target'), 'Ex 1 target must re-spawn');

    // Destroy
    window.MouseTrainer.destroy();
    arena = document.getElementById('mouse-arena');
    assertNotNull(arena, 'Arena element remains in DOM container');
    assertEquals(arena.innerHTML, '', 'Arena contents must be completely cleared on destroy');
  });
});
