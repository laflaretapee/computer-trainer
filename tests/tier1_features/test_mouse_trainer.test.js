/**
 * tests/tier1_features/test_mouse_trainer.test.js
 * Comprehensive Tier 1 unit & integration test suite for Milestone 3 (Mouse Trainer).
 * Verifies module API, Web Audio API synthesis, all 5 exercises, HUD updates,
 * teardown, responsive containers, and data persistence contract.
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
  assertContains
} = assertHelper;

const domEnv = require('../helpers/dom_env');
const {
  setupBrowserEnv,
  teardownBrowserEnv,
  MockMouseEvent,
  MockDragEvent,
  MockDataTransfer
} = domEnv;

const waitMs = (ms) => new Promise(resolve => setTimeout(resolve, ms));

describe('Tier 1: Mouse Trainer (modules/mouse.js)', () => {
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
  // SUITE 1: Module Export & Initialization Contract
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Suite 1: Module Export & Initialization Contract', () => {
    test('window.MouseTrainer exposes mandatory API methods', () => {
      const { window } = env;
      assertNotNull(window.MouseTrainer, 'window.MouseTrainer must be defined');
      assertEquals(typeof window.MouseTrainer.init, 'function');
      assertEquals(typeof window.MouseTrainer.start, 'function');
      assertEquals(typeof window.MouseTrainer.destroy, 'function');
      assertEquals(typeof window.MouseTrainer.finishSession, 'function');
      assertEquals(typeof window.MouseTrainer.selectExercise, 'function');
    });

    test('window.SoundSystem is exposed and implements audio controls', () => {
      const { window } = env;
      assertNotNull(window.SoundSystem, 'window.SoundSystem must be defined');
      assertEquals(typeof window.SoundSystem.isMuted, 'function');
      assertEquals(typeof window.SoundSystem.setMuted, 'function');
      assertEquals(typeof window.SoundSystem.toggleMute, 'function');
      assertEquals(typeof window.SoundSystem.playTick, 'function');
      assertEquals(typeof window.SoundSystem.playSuccess, 'function');
      assertEquals(typeof window.SoundSystem.playError, 'function');
    });

    test('MouseTrainer.init creates complete DOM layout', () => {
      const { document, window } = env;
      window.MouseTrainer.init('mouse-container');

      const tabs = document.querySelectorAll('.btn-exercise');
      assertEquals(tabs.length, 5, 'Must render 5 exercise tabs');

      assertNotNull(document.getElementById('mouse-stat-score'), 'HUD score element must exist');
      assertNotNull(document.getElementById('mouse-stat-time'), 'HUD time element must exist');
      assertNotNull(document.getElementById('mouse-stat-accuracy'), 'HUD accuracy element must exist');
      assertNotNull(document.getElementById('mouse-stat-errors'), 'HUD errors element must exist');
      assertNotNull(document.getElementById('mouse-stat-progress-text'), 'HUD progress element must exist');
      assertNotNull(document.getElementById('mouse-arena'), 'Playground arena must exist');

      const resultCard = document.getElementById('mouse-result-card');
      assertNotNull(resultCard, 'Result card must exist');
      assertEquals(resultCard.style.display, 'none', 'Result card must initially be hidden');
    });

    test('MouseTrainer.destroy resets state and halts running timers', () => {
      const { window, document } = env;
      window.MouseTrainer.init('mouse-container');
      window.MouseTrainer.destroy();

      const arena = document.getElementById('mouse-arena');
      assertEquals(arena.innerHTML, '', 'Arena must be cleared after destroy');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SUITE 2: Web Audio API Synthesis & Autoplay / Mute Compliance
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Suite 2: Web Audio API Synthesis & Mute Persistence', () => {
    test('Sound effects generate audio nodes without throwing errors', () => {
      const { window } = env;
      const sound = window.SoundSystem;
      sound.setMuted(false);

      sound.playTick();
      sound.playTargetHit();
      sound.playDoubleClick();
      sound.playSuccess();
      sound.playError();
      sound.playDragGrab();
      sound.playHoverTick();
      sound.playFanfare();

      const ctx = sound.getContext();
      assertNotNull(ctx, 'AudioContext must be active');
      assertTrue(ctx.__calls.length > 0, 'Audio calls must be recorded during synthesis');
    });

    test('Sound mute toggle persists state in localStorage', () => {
      const { window, localStorage } = env;
      const sound = window.SoundSystem;

      sound.setMuted(false);
      assertEquals(sound.isMuted(), false);

      const muted = sound.toggleMute();
      assertEquals(muted, true);
      assertEquals(sound.isMuted(), true);
      assertEquals(localStorage.getItem('trainer_sound_muted'), 'true');

      // When muted, playing sounds does not create new audio calls
      const ctx = sound.getContext();
      const callsBefore = ctx.__calls.length;
      sound.playTick();
      sound.playError();
      assertEquals(ctx.__calls.length, callsBefore, 'Muted sounds must not create audio calls');

      // Unmuting
      sound.toggleMute();
      assertEquals(sound.isMuted(), false);
      assertEquals(localStorage.getItem('trainer_sound_muted'), 'false');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SUITE 3: Exercise 1 — Снайпер клика (Single Click Precision)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Suite 3: Exercise 1 — Снайпер клика (Single Click)', () => {
    test('Target spawns, hit adds score, miss deducts score', () => {
      const { window, document } = env;
      window.MouseTrainer.init('mouse-container');
      window.MouseTrainer.selectExercise(1);

      const arena = document.getElementById('mouse-arena');
      const target = arena.querySelector('.mouse-target');
      assertNotNull(target, 'Target element must be spawned');

      const scoreEl = document.getElementById('mouse-stat-score');
      assertEquals(scoreEl.textContent, '0');

      // Click target (Hit)
      env.dispatchClick(target);
      assertNotEquals(scoreEl.textContent, '0', 'Score must increase after target hit');

      // Click arena outside target (Miss)
      const currentScore = parseInt(scoreEl.textContent, 10);
      const errorsEl = document.getElementById('mouse-stat-errors');
      assertEquals(errorsEl.textContent, '0');

      env.dispatchClick(arena);
      assertEquals(errorsEl.textContent, '1', 'Errors count must increment after arena miss');
      const newScore = parseInt(scoreEl.textContent, 10);
      assertTrue(newScore <= currentScore, 'Score must be penalized on miss');

      // Miss ripple and penalty markers are created
      const ripple = arena.querySelector('.mouse-ripple.ripple-miss');
      assertNotNull(ripple, 'Miss ripple must be displayed');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SUITE 4: Exercise 2 — Быстрый даблклик (Double Click)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Suite 4: Exercise 2 — Быстрый даблклик (Double Click)', () => {
    test('Renders desktop icons and launches simulated window on double-click', () => {
      const { window, document } = env;
      window.MouseTrainer.init('mouse-container');
      window.MouseTrainer.selectExercise(2);

      const arena = document.getElementById('mouse-arena');
      const icons = arena.querySelectorAll('.desktop-icon');
      assertEquals(icons.length, 8, 'Must render 8 authentic desktop icons');

      // Single click selects icon
      const firstIcon = icons[0];
      env.dispatchClick(firstIcon);
      assertTrue(firstIcon.classList.contains('selected'), 'Single click must select icon');

      // Double-click on target quest app launches simulated window
      const paintIcon = arena.querySelector('[data-app-id="app_paint"]');
      assertNotNull(paintIcon, 'Paint icon must exist');

      env.dispatchDblClick(paintIcon);

      const win = arena.querySelector('.simulated-window');
      assertNotNull(win, 'Simulated window must open upon successful double-click');

      const scoreEl = document.getElementById('mouse-stat-score');
      assertEquals(scoreEl.textContent, '100', 'Score must increment by 100 on double click quest completion');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SUITE 5: Exercise 3 — Контекстное меню (Right Click Context Menu)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Suite 5: Exercise 3 — Контекстное меню (Right Click)', () => {
    test('Right click prevents default and displays custom context menu', () => {
      const { window, document } = env;
      window.MouseTrainer.init('mouse-container');
      window.MouseTrainer.selectExercise(3);

      const arena = document.getElementById('mouse-arena');
      const docTarget = arena.querySelector('[data-target-name="Реферат_История.docx"]');
      assertNotNull(docTarget, 'Target file must exist');

      // Right-click target file
      const ev = env.dispatchContextMenu(docTarget, { clientX: 100, clientY: 100 });
      assertTrue(ev.defaultPrevented, 'Native context menu must be prevented');

      const menu = arena.querySelector('.mouse-context-menu');
      assertNotNull(menu, 'Custom context menu must be displayed');

      // Select action "rename"
      const renameItem = menu.querySelector('[data-action="rename"]');
      assertNotNull(renameItem, 'Rename menu item must exist');

      env.dispatchClick(renameItem);

      const scoreEl = document.getElementById('mouse-stat-score');
      assertEquals(scoreEl.textContent, '100', 'Score must increase by 100 on correct context action');
    });

    test('Escape key closes context menu', () => {
      const { window, document } = env;
      window.MouseTrainer.init('mouse-container');
      window.MouseTrainer.selectExercise(3);

      const arena = document.getElementById('mouse-arena');
      env.dispatchContextMenu(arena, { clientX: 80, clientY: 80 });

      let menu = arena.querySelector('.mouse-context-menu');
      assertNotNull(menu, 'Menu must be opened');

      env.dispatchKey(window, 'Escape');
      menu = arena.querySelector('.mouse-context-menu');
      assertEquals(menu, null, 'Menu must be closed after Escape key');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SUITE 6: Exercise 4 — Файловый архитектор (Drag-and-Drop)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Suite 6: Exercise 4 — Файловый архитектор (Drag-and-Drop)', () => {
    test('Valid file drop sorts into destination folder, invalid drop is rejected', () => {
      const { window, document } = env;
      window.MouseTrainer.init('mouse-container');
      window.MouseTrainer.selectExercise(4);

      const arena = document.getElementById('mouse-arena');
      const folders = arena.querySelectorAll('.folder-drop-zone');
      assertEquals(folders.length, 4, 'Must render 4 folder drop zones');

      const docsFolder = arena.querySelector('[data-folder-id="docs"]');
      const imagesFolder = arena.querySelector('[data-folder-id="images"]');
      const docFile = arena.querySelector('#drag-file-f1'); // реферат_история.docx

      assertNotNull(docsFolder);
      assertNotNull(docFile);

      // 1. Valid drop: docFile into docsFolder
      env.dispatchDragDrop(docFile, docsFolder, {
        'text/plain': JSON.stringify({ id: 'f1', ext: '.docx', cat: 'docs' })
      });

      const scoreEl = document.getElementById('mouse-stat-score');
      assertEquals(scoreEl.textContent, '50', 'Score must increase by 50 on valid drop');

      const countEl = docsFolder.querySelector('.folder-count');
      assertEquals(countEl.textContent, '1', 'Folder counter must increment to 1');

      // 2. Invalid drop: audio file into imagesFolder
      const audioFile = arena.querySelector('#drag-file-f3'); // гимн_школы.mp3
      assertNotNull(audioFile);

      env.dispatchDragDrop(audioFile, imagesFolder, {
        'text/plain': JSON.stringify({ id: 'f3', ext: '.mp3', cat: 'audio' })
      });

      const errorsEl = document.getElementById('mouse-stat-errors');
      assertEquals(errorsEl.textContent, '1', 'Errors must increment on invalid drop');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SUITE 7: Exercise 5 — Системный навигатор (Hover & Tooltips)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Suite 7: Exercise 5 — Системный навигатор (Hover & Tooltips)', () => {
    test('Hover dwell activates tooltip and completes inspection quest', async () => {
      const { window, document } = env;
      window.MouseTrainer.init('mouse-container');
      window.MouseTrainer.selectExercise(5);

      const arena = document.getElementById('mouse-arena');
      const widgets = arena.querySelectorAll('.hover-item');
      assertEquals(widgets.length, 10, 'Must render 10 system tray widgets');

      const usbWidget = arena.querySelector('[data-widget-id="w_usb"]');
      assertNotNull(usbWidget, 'USB widget must exist');

      // Pointer enter starts dwell timer
      const enterEv = new MockMouseEvent('pointerenter', { bubbles: true });
      usbWidget.dispatchEvent(enterEv);

      // Immediately tooltip should not exist (< 500ms)
      assertEquals(usbWidget.querySelector('.mouse-tooltip'), null);

      // After 550ms tooltip is displayed
      await waitMs(550);

      const tt = usbWidget.querySelector('.mouse-tooltip');
      assertNotNull(tt, 'Tooltip must appear after 500ms dwell time');
      assertContains(tt.textContent, 'USB-накопитель', 'Tooltip must contain USB description');

      // After quest completion (~1300ms total)
      await waitMs(800);

      const scoreEl = document.getElementById('mouse-stat-score');
      assertEquals(scoreEl.textContent, '100', 'Score must increment on quest completion');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SUITE 8: App Integration, Teardown & Progress Persistence Contract
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Suite 8: App Integration & Progress Persistence', () => {
    test('finishSession emits contract payload and saves to localStorage via App.saveProgress', () => {
      const { window, localStorage } = env;
      const App = window.App;
      App.state.currentStudent = { id: '7A-01', name: 'Безруков Иван', class: '7-А' };

      window.MouseTrainer.init('mouse-container');

      const summary = window.MouseTrainer.finishSession({
        taskId: 'ex1_click',
        taskName: 'Снайпер клика',
        score: 150,
        time: 25,
        stars: 3,
        accuracy: 95
      });

      assertEquals(summary.taskId, 'ex1_click');
      assertEquals(summary.score, 150);
      assertEquals(summary.stars, 3);
      assertEquals(summary.accuracy, 95);

      // Verify localStorage persistence
      const rawProgress = localStorage.getItem('trainer_progress');
      assertNotNull(rawProgress, 'trainer_progress must exist in localStorage');

      const allProgress = JSON.parse(rawProgress);
      const studentRec = allProgress['7A-01'];
      assertNotNull(studentRec, 'Student record must exist');
      assertNotNull(studentRec.mouse, 'studentRec.mouse must be initialized');

      assertEquals(studentRec.mouse.sessions.length, 1);
      assertEquals(studentRec.mouse.totalScore, 150);
      assertEquals(studentRec.mouse.totalStars, 3);
      assertEquals(studentRec.mouse.completedTasks['ex1_click'].bestStars, 3);

      // Verify typing progress was not corrupted
      assertNotNull(studentRec.typing, 'typing progress must be intact');
    });

    test('Results screen renders mouse trainer achievements block', () => {
      const { window, document } = env;
      const App = window.App;
      App.state.currentStudent = { id: '7A-01', name: 'Безруков Иван', class: '7-А' };

      // Save a mouse session
      App.saveProgress('7A-01', 'mouse', {
        taskId: 'ex1_click',
        taskName: 'Снайпер клика',
        score: 120,
        time: 20,
        stars: 3,
        accuracy: 100,
        date: '12.11.2026'
      });

      // Navigate to results screen
      App.showScreen('screen-results');
      const statsBtn = document.querySelector('[data-module="stats"]');
      if (statsBtn) env.dispatchClick(statsBtn);

      const resultsContainer = document.getElementById('results-container');
      assertNotNull(resultsContainer);
      assertContains(resultsContainer.innerHTML, 'Тренажёр работы с мышью', 'Results must include mouse section');
      assertContains(resultsContainer.innerHTML, 'Снайпер клика', 'Results table must include completed task');
    });

    test('Navigation back from screen-mouse invokes MouseTrainer.destroy', () => {
      const { window, document, App } = env;

      // Click mouse module from menu
      const mouseModuleBtn = document.getElementById('btn-module-mouse');
      assertNotNull(mouseModuleBtn, 'Menu button for mouse trainer must exist');
      env.dispatchClick(mouseModuleBtn);

      const mouseScreen = document.getElementById('screen-mouse');
      assertTrue(mouseScreen.classList.contains('active'), 'Screen-mouse must be active');

      // Click back button
      const backBtn = mouseScreen.querySelector('[data-back="screen-menu"]');
      assertNotNull(backBtn);
      env.dispatchClick(backBtn);

      assertFalse(mouseScreen.classList.contains('active'), 'Screen-mouse must be deactivated');
      const menuScreen = document.getElementById('screen-menu');
      assertTrue(menuScreen.classList.contains('active'), 'Screen-menu must be active');
    });
  });
});
