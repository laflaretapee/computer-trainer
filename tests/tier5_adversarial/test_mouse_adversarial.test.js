/**
 * tests/tier5_adversarial/test_mouse_adversarial.test.js
 * Empirical Adversarial & Boundary Stress Test Suite for Milestone 3 (Mouse Trainer).
 * 
 * Verifies Exercises 1, 2, and 3 under adversarial, stress, and edge-case conditions:
 * - Exercise 1 (Single Click): Rapid clicking/spamming, bullseye precision distance math, accuracy accounting.
 * - Exercise 2 (Double Click): dt timing boundaries (440ms vs 460ms), drift boundaries (7px vs 9px), cross-target rejection.
 * - Exercise 3 (Context Menu): preventDefault interception, viewport boundary clamping, left-click/right-click/Escape dismissal.
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

describe('Tier 5: Adversarial Mouse Trainer Stress Test (Exercises 1, 2, 3)', () => {
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
  // EXERCISE 1: Снайпер клика (Single Click Precision & Spam Stress)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Exercise 1: Single Click Precision & Adversarial Spam Stress', () => {

    test('Rapid clicking & spamming on active target: checks re-entry / duplicate hit vulnerability', async () => {
      const { window, document } = env;
      window.MouseTrainer.init('mouse-container');
      window.MouseTrainer.selectExercise(1);

      const arena = document.getElementById('mouse-arena');
      const target = arena.querySelector('.mouse-target');
      assertNotNull(target, 'Target must spawn in arena');

      const scoreEl = document.getElementById('mouse-stat-score');
      assertEquals(scoreEl.textContent, '0');

      target.getBoundingClientRect = () => ({
        left: 120,
        top: 120,
        width: 60,
        height: 60,
        right: 180,
        bottom: 180
      });

      // Rapidly fire 3 click events on the target in synchronous succession (spam burst)
      for (let i = 0; i < 3; i++) {
        target.dispatchEvent(new MockMouseEvent('click', {
          bubbles: true,
          cancelable: true,
          clientX: 150,
          clientY: 150
        }));
      }

      const scoreAfterBurst = parseInt(scoreEl.textContent, 10);
      const errorsEl = document.getElementById('mouse-stat-errors');

      // ADVERSARIAL ORACLE:
      // A single target must only be scored once (100 pts).
      // If code lacks an isHit guard, 3 clicks on same target grant 300 pts and schedules 3 next targets.
      assertEquals(scoreAfterBurst, 100, `Target click handler must be guarded against duplicate hit spamming (expected 100 pts, got ${scoreAfterBurst})`);
    });

    test('Arena click spamming: scores floor at 0 and error count increments strictly', () => {
      const { window, document } = env;
      window.MouseTrainer.init('mouse-container');
      window.MouseTrainer.selectExercise(1);

      const arena = document.getElementById('mouse-arena');
      const scoreEl = document.getElementById('mouse-stat-score');
      const errorsEl = document.getElementById('mouse-stat-errors');

      assertEquals(scoreEl.textContent, '0');
      assertEquals(errorsEl.textContent, '0');

      // Click arena 10 times in empty space
      for (let i = 0; i < 10; i++) {
        arena.dispatchEvent(new MockMouseEvent('click', {
          bubbles: true,
          cancelable: true,
          clientX: 10,
          clientY: 10
        }));
      }

      // Invariant: score must NEVER go below 0 (Math.max(0, score - 15))
      assertEquals(scoreEl.textContent, '0', 'Score must floor at 0 and never become negative');
      assertEquals(errorsEl.textContent, '10', 'All 10 arena miss clicks must be recorded in errors');

      // Target hit (+100 pts)
      const target = arena.querySelector('.mouse-target');
      if (target) {
        target.getBoundingClientRect = () => ({ left: 100, top: 100, width: 60, height: 60 });
        target.dispatchEvent(new MockMouseEvent('click', {
          bubbles: true,
          cancelable: true,
          clientX: 130,
          clientY: 130
        }));
        assertEquals(scoreEl.textContent, '100', 'Bullseye hit must grant 100 pts');

        // One miss click penalty (-15 pts) -> 85
        arena.dispatchEvent(new MockMouseEvent('click', {
          bubbles: true,
          cancelable: true,
          clientX: 10,
          clientY: 10
        }));
        assertEquals(scoreEl.textContent, '85', 'Miss must deduct exactly 15 points');
        assertEquals(errorsEl.textContent, '11');
      }
    });

    test('Precision distance math: inner 40% bullseye (+100 pts) vs outer (+50 pts) vs boundary', () => {
      const { window, document } = env;
      window.MouseTrainer.init('mouse-container');
      window.MouseTrainer.selectExercise(1);

      const arena = document.getElementById('mouse-arena');
      const scoreEl = document.getElementById('mouse-stat-score');

      // Setup Target 1: size = 60, radius = 30. Bullseye radius = 30 * 0.4 = 12.0px.
      // Target box: left=100, top=100, width=60, height=60 -> center = (130, 130).
      let target = arena.querySelector('.mouse-target');
      assertNotNull(target);
      target.getBoundingClientRect = () => ({ left: 100, top: 100, width: 60, height: 60 });

      // Case A: Exact center click (dist = 0px <= 12px) -> +100 pts
      target.dispatchEvent(new MockMouseEvent('click', {
        bubbles: true,
        cancelable: true,
        clientX: 130,
        clientY: 130
      }));
      assertEquals(scoreEl.textContent, '100', 'Exact center click must award +100 bullseye points');

      // Reset exercise for next test
      window.MouseTrainer.start(1);
      target = arena.querySelector('.mouse-target');
      target.getBoundingClientRect = () => ({ left: 100, top: 100, width: 60, height: 60 });

      // Case B: Boundary click at dist = 12.0px (exact 40% bullseye boundary) -> +100 pts
      // (130 + 12, 130) -> dist = 12.0 <= 12.0
      target.dispatchEvent(new MockMouseEvent('click', {
        bubbles: true,
        cancelable: true,
        clientX: 142,
        clientY: 130
      }));
      assertEquals(scoreEl.textContent, '100', 'Exact 40% radius boundary (dist=12.0) must award +100 bullseye points');

      // Reset exercise for next test
      window.MouseTrainer.start(1);
      target = arena.querySelector('.mouse-target');
      target.getBoundingClientRect = () => ({ left: 100, top: 100, width: 60, height: 60 });

      // Case C: Just outside bullseye at dist = 12.1px (dist > 12.0) -> +50 pts (outer ring)
      // (130 + 12.1, 130) -> dist = 12.1 > 12.0
      target.dispatchEvent(new MockMouseEvent('click', {
        bubbles: true,
        cancelable: true,
        clientX: 142.1,
        clientY: 130
      }));
      assertEquals(scoreEl.textContent, '50', 'Click just outside bullseye (dist=12.1) must award +50 points');

      // Reset exercise for next test
      window.MouseTrainer.start(1);
      target = arena.querySelector('.mouse-target');
      target.getBoundingClientRect = () => ({ left: 100, top: 100, width: 60, height: 60 });

      // Case D: Outer edge at dist = 29.5px -> +50 pts
      target.dispatchEvent(new MockMouseEvent('click', {
        bubbles: true,
        cancelable: true,
        clientX: 159.5,
        clientY: 130
      }));
      assertEquals(scoreEl.textContent, '50', 'Outer edge click (dist=29.5) must award +50 points');
    });

    test('Accuracy calculation when mixing hits, misses, and target timeouts', () => {
      const { window, document } = env;
      window.MouseTrainer.init('mouse-container');
      window.MouseTrainer.selectExercise(1);

      const arena = document.getElementById('mouse-arena');
      const accEl = document.getElementById('mouse-stat-accuracy');
      const errorsEl = document.getElementById('mouse-stat-errors');

      // 1. Initial invariant: 0 hits, 0 misses -> accuracy must be 100%, not NaN
      assertEquals(accEl.textContent, '100%', 'Initial accuracy must be 100% (zero actions)');
      assertEquals(errorsEl.textContent, '0');

      // 2. Perform 3 bullseye hits:
      for (let i = 0; i < 3; i++) {
        let t = arena.querySelector('.mouse-target');
        if (!t) break;
        t.getBoundingClientRect = () => ({ left: 100, top: 100, width: 60, height: 60 });
        t.dispatchEvent(new MockMouseEvent('click', { bubbles: true, cancelable: true, clientX: 130, clientY: 130 }));
      }

      // 3. Perform 1 arena miss click:
      arena.dispatchEvent(new MockMouseEvent('click', { bubbles: true, cancelable: true, clientX: 10, clientY: 10 }));

      // Hits = 3, Misses = 1 -> Total = 4. Accuracy = (3 / 4) * 100 = 75%
      assertEquals(accEl.textContent, '75%', 'Accuracy must be exactly 75% for 3 hits and 1 miss');
      assertEquals(errorsEl.textContent, '1');

      // 4. Perform 2 more misses:
      arena.dispatchEvent(new MockMouseEvent('click', { bubbles: true, cancelable: true, clientX: 10, clientY: 10 }));
      arena.dispatchEvent(new MockMouseEvent('click', { bubbles: true, cancelable: true, clientX: 10, clientY: 10 }));

      // Hits = 3, Misses = 3 -> Total = 6. Accuracy = 50%
      assertEquals(accEl.textContent, '50%', 'Accuracy must be exactly 50% for 3 hits and 3 misses');
      assertEquals(errorsEl.textContent, '3');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // EXERCISE 2: Быстрый даблклик (Double Click Timing & Drift Boundaries)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Exercise 2: Double Click Timing & Drift Boundaries', () => {

    test('Timing boundary test: dt = 440ms (PASS) vs dt = 460ms (SLOW COACHING)', () => {
      const { window, document } = env;
      window.MouseTrainer.init('mouse-container');
      window.MouseTrainer.selectExercise(2);

      const arena = document.getElementById('mouse-arena');
      const paintIcon = arena.querySelector('[data-app-id="app_paint"]');
      assertNotNull(paintIcon, 'Paint icon must exist as target quest 1');

      const scoreEl = document.getElementById('mouse-stat-score');
      const errorsEl = document.getElementById('mouse-stat-errors');
      assertEquals(scoreEl.textContent, '0');
      assertEquals(errorsEl.textContent, '0');

      // ── Subtest A: dt = 460ms (Exceeds 450ms threshold -> triggers slow coaching) ──
      const originalDateNow = Date.now;
      let fakeTime = 10000;
      Date.now = () => fakeTime;

      try {
        // Click 1 at fakeTime = 10000
        paintIcon.dispatchEvent(new MockMouseEvent('click', { bubbles: true, cancelable: true, clientX: 100, clientY: 100 }));

        // Click 2 at fakeTime = 10460 (dt = 460ms > 450ms)
        fakeTime = 10460;
        paintIcon.dispatchEvent(new MockMouseEvent('click', { bubbles: true, cancelable: true, clientX: 100, clientY: 100 }));

        // Invariant: dt = 460ms must be treated as too slow, incrementing errors and not launching window
        assertEquals(errorsEl.textContent, '1', 'dt = 460ms must register as slow double-click error');
        assertEquals(scoreEl.textContent, '0', 'dt = 460ms must NOT award points');
        const winSlow = arena.querySelector('.simulated-window');
        assertNull(winSlow, 'Simulated window must NOT launch when dt = 460ms');

        // Check coaching message in prompt
        const promptEl = document.getElementById('mouse-task-prompt');
        assertNotNull(promptEl);
        assertTrue(promptEl.innerHTML.includes('Слишком медленно') || promptEl.textContent.includes('Слишком медленно'),
          'Coaching toast must indicate slow click');

        // ── Subtest B: dt = 440ms (Within 450ms threshold -> PASS) ──
        // Click 1 at fakeTime = 20000
        fakeTime = 20000;
        paintIcon.dispatchEvent(new MockMouseEvent('click', { bubbles: true, cancelable: true, clientX: 100, clientY: 100 }));

        // Click 2 at fakeTime = 20440 (dt = 440ms <= 450ms)
        fakeTime = 20440;
        paintIcon.dispatchEvent(new MockMouseEvent('click', { bubbles: true, cancelable: true, clientX: 100, clientY: 100 }));

        assertEquals(scoreEl.textContent, '100', 'dt = 440ms must trigger successful double click (+100 pts)');
        const winPass = arena.querySelector('.simulated-window');
        assertNotNull(winPass, 'Simulated window must launch on valid double click dt = 440ms');
      } finally {
        Date.now = originalDateNow;
      }
    });

    test('Exact timing boundary: dt = 450ms (PASS) vs dt = 451ms (SLOW COACHING)', () => {
      const { window, document } = env;
      window.MouseTrainer.init('mouse-container');
      window.MouseTrainer.selectExercise(2);

      const arena = document.getElementById('mouse-arena');
      const paintIcon = arena.querySelector('[data-app-id="app_paint"]');

      const originalDateNow = Date.now;
      let fakeTime = 10000;
      Date.now = () => fakeTime;

      try {
        // Test dt = 451ms (dt > 450) -> FAIL
        paintIcon.dispatchEvent(new MockMouseEvent('click', { bubbles: true, cancelable: true, clientX: 100, clientY: 100 }));
        fakeTime = 10451;
        paintIcon.dispatchEvent(new MockMouseEvent('click', { bubbles: true, cancelable: true, clientX: 100, clientY: 100 }));

        const errorsEl = document.getElementById('mouse-stat-errors');
        assertEquals(errorsEl.textContent, '1', 'dt = 451ms must be rejected as slow');

        // Test dt = 450ms (dt <= 450) -> PASS
        fakeTime = 20000;
        paintIcon.dispatchEvent(new MockMouseEvent('click', { bubbles: true, cancelable: true, clientX: 100, clientY: 100 }));
        fakeTime = 20450;
        paintIcon.dispatchEvent(new MockMouseEvent('click', { bubbles: true, cancelable: true, clientX: 100, clientY: 100 }));

        const scoreEl = document.getElementById('mouse-stat-score');
        assertEquals(scoreEl.textContent, '100', 'dt = 450ms exact boundary must pass');
      } finally {
        Date.now = originalDateNow;
      }
    });

    test('Drift boundary test: drift = 7px (PASS) vs drift = 9px (DRIFT COACHING)', () => {
      const { window, document } = env;
      window.MouseTrainer.init('mouse-container');
      window.MouseTrainer.selectExercise(2);

      const arena = document.getElementById('mouse-arena');
      const paintIcon = arena.querySelector('[data-app-id="app_paint"]');

      const scoreEl = document.getElementById('mouse-stat-score');
      const errorsEl = document.getElementById('mouse-stat-errors');

      const originalDateNow = Date.now;
      let fakeTime = 10000;
      Date.now = () => fakeTime;

      try {
        // ── Subtest A: drift = 9px (> 8px) with fast dt = 200ms -> triggers drift coaching ──
        paintIcon.dispatchEvent(new MockMouseEvent('click', { bubbles: true, cancelable: true, clientX: 100, clientY: 100 }));
        fakeTime = 10200;
        // Move 9px to the right: (109, 100) -> drift = 9px
        paintIcon.dispatchEvent(new MockMouseEvent('click', { bubbles: true, cancelable: true, clientX: 109, clientY: 100 }));

        assertEquals(errorsEl.textContent, '1', 'drift = 9px must trigger drift coaching error');
        assertEquals(scoreEl.textContent, '0', 'drift = 9px must NOT award points');
        const promptEl = document.getElementById('mouse-task-prompt');
        assertTrue(promptEl.innerHTML.includes('сдвинулась') || promptEl.textContent.includes('сдвинулась'),
          'Coaching toast must alert about mouse drift');

        // ── Subtest B: drift = 7px (<= 8px) with fast dt = 200ms -> PASS ──
        fakeTime = 20000;
        paintIcon.dispatchEvent(new MockMouseEvent('click', { bubbles: true, cancelable: true, clientX: 100, clientY: 100 }));
        fakeTime = 20200;
        // Move 7px to the right: (107, 100) -> drift = 7px
        paintIcon.dispatchEvent(new MockMouseEvent('click', { bubbles: true, cancelable: true, clientX: 107, clientY: 100 }));

        assertEquals(scoreEl.textContent, '100', 'drift = 7px within 8px tolerance must pass (+100 pts)');
      } finally {
        Date.now = originalDateNow;
      }
    });

    test('Exact drift boundary: drift = 8.0px (PASS) vs drift = 8.5px (DRIFT COACHING)', () => {
      const { window, document } = env;
      window.MouseTrainer.init('mouse-container');
      window.MouseTrainer.selectExercise(2);

      const arena = document.getElementById('mouse-arena');
      const paintIcon = arena.querySelector('[data-app-id="app_paint"]');

      const originalDateNow = Date.now;
      let fakeTime = 10000;
      Date.now = () => fakeTime;

      try {
        // Drift = 8.5px (> 8.0) -> FAIL
        paintIcon.dispatchEvent(new MockMouseEvent('click', { bubbles: true, cancelable: true, clientX: 100, clientY: 100 }));
        fakeTime = 10200;
        paintIcon.dispatchEvent(new MockMouseEvent('click', { bubbles: true, cancelable: true, clientX: 108.5, clientY: 100 }));

        const errorsEl = document.getElementById('mouse-stat-errors');
        assertEquals(errorsEl.textContent, '1', 'drift = 8.5px must trigger drift error');

        // Drift = 8.0px (<= 8.0) -> PASS
        fakeTime = 20000;
        paintIcon.dispatchEvent(new MockMouseEvent('click', { bubbles: true, cancelable: true, clientX: 100, clientY: 100 }));
        fakeTime = 20200;
        paintIcon.dispatchEvent(new MockMouseEvent('click', { bubbles: true, cancelable: true, clientX: 108.0, clientY: 100 }));

        const scoreEl = document.getElementById('mouse-stat-score');
        assertEquals(scoreEl.textContent, '100', 'Exact drift = 8.0px must pass');
      } finally {
        Date.now = originalDateNow;
      }
    });

    test('Cross-target click test: alternating between different icons does NOT trigger double click', () => {
      const { window, document } = env;
      window.MouseTrainer.init('mouse-container');
      window.MouseTrainer.selectExercise(2);

      const arena = document.getElementById('mouse-arena');
      const paintIcon = arena.querySelector('[data-app-id="app_paint"]');
      const calcIcon = arena.querySelector('[data-app-id="app_calc"]');
      assertNotNull(paintIcon);
      assertNotNull(calcIcon);

      const originalDateNow = Date.now;
      let fakeTime = 10000;
      Date.now = () => fakeTime;

      try {
        // Click Paint at t=10000
        paintIcon.dispatchEvent(new MockMouseEvent('click', { bubbles: true, cancelable: true, clientX: 100, clientY: 100 }));
        assertTrue(paintIcon.classList.contains('selected'), 'Paint must be selected');

        // Click Calc at t=10200 (dt = 200ms, fast enough for dblclick, but on DIFFERENT icon)
        fakeTime = 10200;
        calcIcon.dispatchEvent(new MockMouseEvent('click', { bubbles: true, cancelable: true, clientX: 100, clientY: 100 }));

        // Invariant: double click MUST NOT trigger across different icons!
        const win = arena.querySelector('.simulated-window');
        assertNull(win, 'Double click must NOT trigger across different icons');
        assertTrue(calcIcon.classList.contains('selected'), 'Selection must shift to Calc');
        assertFalse(paintIcon.classList.contains('selected'), 'Paint must lose selection');

        const scoreEl = document.getElementById('mouse-stat-score');
        assertEquals(scoreEl.textContent, '0', 'Score must remain 0');

        const errorsEl = document.getElementById('mouse-stat-errors');
        assertEquals(errorsEl.textContent, '0', 'Alternating single clicks must not count as errors');
      } finally {
        Date.now = originalDateNow;
      }
    });

    test('Duplicate double-click during simulated window delay: verifies re-entry safety', () => {
      const { window, document } = env;
      window.MouseTrainer.init('mouse-container');
      window.MouseTrainer.selectExercise(2);

      const arena = document.getElementById('mouse-arena');
      const paintIcon = arena.querySelector('[data-app-id="app_paint"]');

      const originalDateNow = Date.now;
      let fakeTime = 10000;
      Date.now = () => fakeTime;

      try {
        // Double-click Paint at t=10000 -> succeeds (+100 pts)
        paintIcon.dispatchEvent(new MockMouseEvent('click', { bubbles: true, cancelable: true, clientX: 100, clientY: 100 }));
        fakeTime = 10200;
        paintIcon.dispatchEvent(new MockMouseEvent('click', { bubbles: true, cancelable: true, clientX: 100, clientY: 100 }));

        const scoreEl = document.getElementById('mouse-stat-score');
        assertEquals(scoreEl.textContent, '100');

        // Immediately double-click Paint AGAIN at t=10500 while simulated window is open
        fakeTime = 10500;
        paintIcon.dispatchEvent(new MockMouseEvent('click', { bubbles: true, cancelable: true, clientX: 100, clientY: 100 }));
        fakeTime = 10600;
        paintIcon.dispatchEvent(new MockMouseEvent('click', { bubbles: true, cancelable: true, clientX: 100, clientY: 100 }));

        console.log(`[EMPIRICAL] Ex 2: Score after second double click during window display: ${scoreEl.textContent}`);
        assertEquals(scoreEl.textContent, '100', `Duplicate double-click during simulated window transition must be blocked (expected 100 pts, got ${scoreEl.textContent})`);
      } finally {
        Date.now = originalDateNow;
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // EXERCISE 3: Контекстное меню (Right Click Interception & Clamping)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Exercise 3: Context Menu Interception, Clamping & Dismissal', () => {

    test('Interception test: verify e.preventDefault() prevents native context menu', () => {
      const { window, document } = env;
      window.MouseTrainer.init('mouse-container');
      window.MouseTrainer.selectExercise(3);

      const arena = document.getElementById('mouse-arena');
      const fileTarget = arena.querySelector('[data-target-name="Реферат_История.docx"]');
      assertNotNull(fileTarget, 'Target file must exist');

      // Right-click on file icon
      const ev = new MockMouseEvent('contextmenu', {
        button: 2,
        bubbles: true,
        cancelable: true,
        clientX: 120,
        clientY: 120
      });
      fileTarget.dispatchEvent(ev);

      assertTrue(ev.defaultPrevented, 'e.preventDefault() must be invoked on file contextmenu');
      assertTrue(ev._propagationStopped, 'e.stopPropagation() must be invoked on file contextmenu');

      const menu = arena.querySelector('.mouse-context-menu');
      assertNotNull(menu, 'Custom context menu element must be spawned');
    });

    test('Interception test on desktop workspace: verify e.preventDefault() on empty arena', () => {
      const { window, document } = env;
      window.MouseTrainer.init('mouse-container');
      window.MouseTrainer.selectExercise(3);

      const arena = document.getElementById('mouse-arena');

      // Right-click on arena empty area
      const ev = new MockMouseEvent('contextmenu', {
        button: 2,
        bubbles: true,
        cancelable: true,
        clientX: 300,
        clientY: 300
      });
      arena.dispatchEvent(ev);

      assertTrue(ev.defaultPrevented, 'e.preventDefault() must be invoked on arena contextmenu');

      const menu = arena.querySelector('.mouse-context-menu');
      assertNotNull(menu, 'Desktop context menu must be spawned');
      const newFolderItem = menu.querySelector('[data-action="new_folder"]');
      assertNotNull(newFolderItem, 'Desktop context menu must include "Создать папку"');
    });

    test('Boundary tests: right-click at viewport boundaries remains clamped inside playground', () => {
      const { window, document } = env;
      window.MouseTrainer.init('mouse-container');
      window.MouseTrainer.selectExercise(3);

      const arena = document.getElementById('mouse-arena');
      assertNotNull(arena);

      // Define standard playground geometry: 800x500 at viewport (100, 100)
      arena.getBoundingClientRect = () => ({
        left: 100,
        top: 100,
        width: 800,
        height: 500,
        right: 900,
        bottom: 600
      });
      Object.defineProperty(arena, 'clientWidth', { value: 800, configurable: true });
      Object.defineProperty(arena, 'clientHeight', { value: 500, configurable: true });

      const menuW = 190;
      const menuH = 180;

      // ── Test Point 1: Top-Left boundary (local x=0, y=0 -> clientX=100, clientY=100) ──
      arena.dispatchEvent(new MockMouseEvent('contextmenu', {
        button: 2,
        bubbles: true,
        cancelable: true,
        clientX: 100,
        clientY: 100
      }));

      let menu = arena.querySelector('.mouse-context-menu');
      assertNotNull(menu);
      let left = parseFloat(menu.style.left);
      let top = parseFloat(menu.style.top);

      assertTrue(left >= 0, `Menu left (${left}) must be >= 0`);
      assertTrue(left + menuW <= 800, `Menu right edge (${left + menuW}) must fit within width 800`);
      assertTrue(top >= 0, `Menu top (${top}) must be >= 0`);
      assertTrue(top + menuH <= 500, `Menu bottom edge (${top + menuH}) must fit within height 500`);

      // ── Test Point 2: Bottom-Right boundary (local x=799, y=499 -> clientX=899, clientY=599) ──
      arena.dispatchEvent(new MockMouseEvent('contextmenu', {
        button: 2,
        bubbles: true,
        cancelable: true,
        clientX: 899,
        clientY: 599
      }));

      menu = arena.querySelector('.mouse-context-menu');
      assertNotNull(menu);
      left = parseFloat(menu.style.left);
      top = parseFloat(menu.style.top);

      assertTrue(left >= 0, `Menu left (${left}) must be >= 0`);
      assertTrue(left + menuW <= 800, `Menu right edge (${left + menuW}) must be <= 800`);
      assertTrue(top >= 0, `Menu top (${top}) must be >= 0`);
      assertTrue(top + menuH <= 500, `Menu bottom edge (${top + menuH}) must be <= 500`);

      // ── Test Point 3: Extreme out-of-bounds coordinates (clientX = 5000, clientY = 9999) ──
      arena.dispatchEvent(new MockMouseEvent('contextmenu', {
        button: 2,
        bubbles: true,
        cancelable: true,
        clientX: 5000,
        clientY: 9999
      }));

      menu = arena.querySelector('.mouse-context-menu');
      assertNotNull(menu);
      left = parseFloat(menu.style.left);
      top = parseFloat(menu.style.top);

      assertTrue(left >= 0 && left + menuW <= 800, 'Extreme X must clamp safely within arena width');
      assertTrue(top >= 0 && top + menuH <= 500, 'Extreme Y must clamp safely within arena height');
    });

    test('Boundary test: clientX=0 and clientY=0 viewport boundary clamping', () => {
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
        clientX: 0,
        clientY: 0
      }));

      const menu = arena.querySelector('.mouse-context-menu');
      assertNotNull(menu);
      const left = parseFloat(menu.style.left);
      const top = parseFloat(menu.style.top);

      console.log(`[EMPIRICAL] Context menu clamped at clientX=0, clientY=0: left=${left}px, top=${top}px`);
      assertTrue(left >= 0 && left + 190 <= 800, 'Left must be clamped inside arena');
      assertTrue(top >= 0 && top + 180 <= 500, 'Top must be clamped inside arena');
    });

    test('Dismissal tests: Left-click outside, Right-click outside, and Escape key dismiss menu', () => {
      const { window, document } = env;
      window.MouseTrainer.init('mouse-container');
      window.MouseTrainer.selectExercise(3);

      const arena = document.getElementById('mouse-arena');
      const fileTarget = arena.querySelector('[data-target-name="Реферат_История.docx"]');

      // ── 1. Dismissal via Escape Key ──
      fileTarget.dispatchEvent(new MockMouseEvent('contextmenu', {
        button: 2,
        bubbles: true,
        cancelable: true,
        clientX: 120,
        clientY: 120
      }));
      let menu = arena.querySelector('.mouse-context-menu');
      assertNotNull(menu, 'Menu must be open before Escape');

      window.dispatchEvent(new MockKeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      menu = arena.querySelector('.mouse-context-menu');
      assertNull(menu, 'Escape key must dismiss context menu');

      // ── 2. Dismissal via Left-Click outside ──
      fileTarget.dispatchEvent(new MockMouseEvent('contextmenu', {
        button: 2,
        bubbles: true,
        cancelable: true,
        clientX: 120,
        clientY: 120
      }));
      menu = arena.querySelector('.mouse-context-menu');
      assertNotNull(menu, 'Menu must be open before left click outside');

      // Click on workspace outside the menu
      const workspace = arena.querySelector('[data-target-type="desktop"]');
      assertNotNull(workspace, 'Workspace must exist');
      workspace.dispatchEvent(new MockMouseEvent('click', { bubbles: true, cancelable: true, clientX: 400, clientY: 400 }));

      menu = arena.querySelector('.mouse-context-menu');
      assertNull(menu, 'Left-click outside menu on workspace must dismiss context menu');

      // ── 3. Dismissal via Right-Click outside ──
      fileTarget.dispatchEvent(new MockMouseEvent('contextmenu', {
        button: 2,
        bubbles: true,
        cancelable: true,
        clientX: 120,
        clientY: 120
      }));
      menu = arena.querySelector('.mouse-context-menu');
      assertNotNull(menu);
      // Currently displaying file context menu (has "rename")
      assertNotNull(menu.querySelector('[data-action="rename"]'), 'File menu must have rename action');

      // Right-click on empty arena / workspace
      arena.dispatchEvent(new MockMouseEvent('contextmenu', {
        button: 2,
        bubbles: true,
        cancelable: true,
        clientX: 350,
        clientY: 350
      }));

      menu = arena.querySelector('.mouse-context-menu');
      assertNotNull(menu, 'New context menu opened for workspace');
      // The previous file menu was dismissed and replaced by desktop context menu (has "new_folder", no "rename")
      assertNull(menu.querySelector('[data-action="rename"]'), 'Previous file context menu was dismissed');
      assertNotNull(menu.querySelector('[data-action="new_folder"]'), 'Workspace menu is now active');
    });
  });
});
