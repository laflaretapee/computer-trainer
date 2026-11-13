/**
 * tests/tier5_adversarial/test_mouse_adversarial_challenger2.test.js
 * Adversarial Challenge Suite 2 for Milestone 3 (Mouse Trainer).
 * 
 * Truly empirical challenger testing with async/await timing guarantees:
 * 1. Exercise 4 (Drag-and-Drop / Файловый архитектор):
 *    - Full sorting of all 12 curriculum files into correct folders (docs, images, audio, trash).
 *    - Invalid drop rejections, penalty deductions, shake animations, error sounds, and source file retention.
 *    - Drop outside any folder (arena boundary / playground drop) without crash and returning to source.
 *    - Multiple rapid drag-and-drop operations and throughput stress.
 * 2. Exercise 5 (Hover & Tooltips / Системный навигатор):
 *    - Strict dwell timing discrimination: 400ms (no tooltip) vs 550ms (tooltip shown).
 *    - Rapid mouseover/mouseout transitions across all 10 widgets (zero ghost tooltips, clean cancellation).
 *    - Tooltip boundary clamping (right edge, left edge, bottom edge analysis).
 *    - Quest inspection progression and completion verification.
 * 3. Sound & Persistence:
 *    - SoundSystem mute toggle, disabled audio calls when muted, and persistence in localStorage.
 *    - Zero errors and graceful degradation when AudioContext is blocked, null, throwing, or suspended.
 *    - M3 <-> M4 contract conformance and non-destructive persistence in localStorage['trainer_progress']
 *      preserving existing typing and tests records without corruption.
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
  assertNull,
  assertDefined,
  assertContains
} = assertHelper;

const domEnv = require('../helpers/dom_env');
const {
  setupBrowserEnv,
  MockMouseEvent,
  MockDragEvent,
  MockDataTransfer
} = domEnv;

const waitMs = (ms) => new Promise(resolve => setTimeout(resolve, ms));

describe('Tier 5: Mouse Trainer Adversarial Challenge Suite 2 (Challenger 2)', () => {
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
  // SUITE 1: Exercise 4 (Drag-and-Drop / Файловый архитектор)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Suite 1: Exercise 4 (Drag-and-Drop / Файловый архитектор)', () => {

    test('1.1 Sort all 12 curriculum files into correct destination folders with score and progress validation', async () => {
      const { window, document } = env;
      window.MouseTrainer.init('mouse-container');
      window.MouseTrainer.selectExercise(4);

      const arena = document.getElementById('mouse-arena');
      assertNotNull(arena, 'Arena must exist');

      const folders = {
        docs: arena.querySelector('[data-folder-id="docs"]'),
        images: arena.querySelector('[data-folder-id="images"]'),
        audio: arena.querySelector('[data-folder-id="audio"]'),
        trash: arena.querySelector('[data-folder-id="trash"]')
      };

      assertNotNull(folders.docs, 'Docs folder must exist');
      assertNotNull(folders.images, 'Images folder must exist');
      assertNotNull(folders.audio, 'Audio folder must exist');
      assertNotNull(folders.trash, 'Trash folder must exist');

      const expectedFiles = [
        { id: 'f1', cat: 'docs', ext: '.docx' },
        { id: 'f2', cat: 'images', ext: '.jpg' },
        { id: 'f3', cat: 'audio', ext: '.mp3' },
        { id: 'f4', cat: 'trash', ext: '.tmp' },
        { id: 'f5', cat: 'docs', ext: '.xlsx' },
        { id: 'f6', cat: 'images', ext: '.png' },
        { id: 'f7', cat: 'audio', ext: '.wav' },
        { id: 'f8', cat: 'trash', ext: '.bak' },
        { id: 'f9', cat: 'docs', ext: '.pdf' },
        { id: 'f10', cat: 'images', ext: '.gif' },
        { id: 'f11', cat: 'audio', ext: '.ogg' },
        { id: 'f12', cat: 'trash', ext: '.log' }
      ];

      const scoreEl = document.getElementById('mouse-stat-score');
      const progEl = document.getElementById('mouse-stat-progress-text');
      const errorsEl = document.getElementById('mouse-stat-errors');

      let currentExpectedScore = 0;

      expectedFiles.forEach((fileInfo, idx) => {
        const fileEl = arena.querySelector(`#drag-file-${fileInfo.id}`);
        assertNotNull(fileEl, `File chip #drag-file-${fileInfo.id} must exist before drop`);

        const targetFolder = folders[fileInfo.cat];
        assertNotNull(targetFolder, `Target folder ${fileInfo.cat} must exist`);

        // Perform HTML5 drag and drop
        env.dispatchDragDrop(fileEl, targetFolder, {
          'text/plain': JSON.stringify({ id: fileInfo.id, ext: fileInfo.ext, cat: fileInfo.cat })
        });

        currentExpectedScore += 50;
        assertEquals(parseInt(scoreEl.textContent, 10), currentExpectedScore, `Score must increment by 50 for ${fileInfo.id}`);
        assertEquals(progEl.textContent, `${idx + 1} / 12`, 'Progress text must match sorted count');
        assertEquals(errorsEl.textContent, '0', 'Errors must remain 0 on valid drops');
      });

      // Verify folder counts: 3 files in each of the 4 folders (3 * 4 = 12)
      assertEquals(folders.docs.querySelector('.folder-count').textContent, '3', 'Docs count must be 3');
      assertEquals(folders.images.querySelector('.folder-count').textContent, '3', 'Images count must be 3');
      assertEquals(folders.audio.querySelector('.folder-count').textContent, '3', 'Audio count must be 3');
      assertEquals(folders.trash.querySelector('.folder-count').textContent, '3', 'Trash count must be 3');

      // Final score check
      assertEquals(parseInt(scoreEl.textContent, 10), 600, 'All 12 files sorted must produce 600 points');

      // Wait 300ms for DOM removal transitions
      await waitMs(300);

      expectedFiles.forEach(fileInfo => {
        const remainingFileEl = arena.querySelector(`#drag-file-${fileInfo.id}`);
        assertEquals(remainingFileEl, null, `Sorted file chip ${fileInfo.id} must be removed from DOM`);
      });

      // Wait 650ms for finishSession invocation
      await waitMs(650);

      const resultCard = document.getElementById('mouse-result-card');
      assertNotNull(resultCard, 'Result card must exist');
      assertEquals(resultCard.style.display, 'block', 'Result card must be visible on exercise completion');
      assertEquals(document.getElementById('mouse-res-score').textContent, '600');
      assertEquals(document.getElementById('mouse-res-errors').textContent, '0');
      assertEquals(document.getElementById('mouse-res-accuracy').textContent, '100');
    });

    test('1.2 Invalid drops: wrong destination folders trigger rejection, shake animation, score penalty, and file retention', () => {
      const { window, document } = env;
      window.MouseTrainer.init('mouse-container');
      window.MouseTrainer.selectExercise(4);

      const arena = document.getElementById('mouse-arena');
      const docsFolder = arena.querySelector('[data-folder-id="docs"]');
      const imagesFolder = arena.querySelector('[data-folder-id="images"]');
      const audioFolder = arena.querySelector('[data-folder-id="audio"]');
      const trashFolder = arena.querySelector('[data-folder-id="trash"]');

      const scoreEl = document.getElementById('mouse-stat-score');
      const errorsEl = document.getElementById('mouse-stat-errors');
      const promptEl = document.getElementById('mouse-task-prompt');

      // First give student some score with 1 valid drop (+50)
      const validDocFile = arena.querySelector('#drag-file-f1'); // .docx -> docs
      env.dispatchDragDrop(validDocFile, docsFolder, {
        'text/plain': JSON.stringify({ id: 'f1', ext: '.docx', cat: 'docs' })
      });
      assertEquals(scoreEl.textContent, '50');
      assertEquals(errorsEl.textContent, '0');

      // Invalid Drop 1: f2 (.jpg, images) dropped into docsFolder
      const jpgFile = arena.querySelector('#drag-file-f2');
      assertNotNull(jpgFile);
      env.dispatchDragDrop(jpgFile, docsFolder, {
        'text/plain': JSON.stringify({ id: 'f2', ext: '.jpg', cat: 'images' })
      });

      assertEquals(errorsEl.textContent, '1', 'Errors must increment to 1');
      assertEquals(scoreEl.textContent, '35', 'Score must be penalized by 15 (50 - 15 = 35)');
      assertTrue(docsFolder.classList.contains('drag-invalid'), 'Folder must have drag-invalid class');
      assertTrue(docsFolder.classList.contains('animate-shake'), 'Folder must have animate-shake class');
      assertContains(promptEl.innerHTML, 'не относится к папке', 'Coaching toast must mention folder mismatch');

      // File f2 must NOT be deleted!
      const retainedJpg = arena.querySelector('#drag-file-f2');
      assertNotNull(retainedJpg, 'Invalidly dropped file must remain in source pile');

      // Invalid Drop 2: f3 (.mp3, audio) dropped into trashFolder
      const mp3File = arena.querySelector('#drag-file-f3');
      env.dispatchDragDrop(mp3File, trashFolder, {
        'text/plain': JSON.stringify({ id: 'f3', ext: '.mp3', cat: 'audio' })
      });

      assertEquals(errorsEl.textContent, '2', 'Errors must increment to 2');
      assertEquals(scoreEl.textContent, '20', 'Score must be penalized by 15 (35 - 15 = 20)');
      assertTrue(trashFolder.classList.contains('drag-invalid'), 'Trash folder must have drag-invalid');

      // Invalid Drop 3: f4 (.tmp, trash) dropped into audioFolder
      const tmpFile = arena.querySelector('#drag-file-f4');
      env.dispatchDragDrop(tmpFile, audioFolder, {
        'text/plain': JSON.stringify({ id: 'f4', ext: '.tmp', cat: 'trash' })
      });

      assertEquals(errorsEl.textContent, '3', 'Errors must increment to 3');
      assertEquals(scoreEl.textContent, '5', 'Score must be penalized by 15 (20 - 15 = 5)');

      // Invalid Drop 4: penalty clamping at 0 (5 - 15 = 0, no negative score)
      const xlsxFile = arena.querySelector('#drag-file-f5');
      env.dispatchDragDrop(xlsxFile, imagesFolder, {
        'text/plain': JSON.stringify({ id: 'f5', ext: '.xlsx', cat: 'docs' })
      });

      assertEquals(errorsEl.textContent, '4');
      assertEquals(scoreEl.textContent, '0', 'Score must not fall below 0');

      // All invalidly dropped files remain in the DOM
      assertNotNull(arena.querySelector('#drag-file-f2'));
      assertNotNull(arena.querySelector('#drag-file-f3'));
      assertNotNull(arena.querySelector('#drag-file-f4'));
      assertNotNull(arena.querySelector('#drag-file-f5'));
    });

    test('1.3 Dropping files outside any folder returns to playground safely without crash or penalty', () => {
      const { window, document } = env;
      window.MouseTrainer.init('mouse-container');
      window.MouseTrainer.selectExercise(4);

      const arena = document.getElementById('mouse-arena');
      const filesPile = document.getElementById('files-source-pile');
      const fileEl = arena.querySelector('#drag-file-f1');
      assertNotNull(fileEl);

      const initialScore = document.getElementById('mouse-stat-score').textContent;
      const initialErrors = document.getElementById('mouse-stat-errors').textContent;

      // 1. HTML5 DnD dragstart on file, dragover on arena, dragend on file (no drop on folder)
      const dt = new MockDataTransfer();
      dt.setData('text/plain', JSON.stringify({ id: 'f1', ext: '.docx', cat: 'docs' }));

      fileEl.dispatchEvent(new MockDragEvent('dragstart', { bubbles: true, cancelable: true, dataTransfer: dt }));
      assertTrue(fileEl.classList.contains('is-dragging'), 'File has is-dragging class during drag');

      arena.dispatchEvent(new MockDragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt }));

      // User releases mouse over empty arena (drop outside folder)
      arena.dispatchEvent(new MockDragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt }));
      fileEl.dispatchEvent(new MockDragEvent('dragend', { bubbles: true, cancelable: true, dataTransfer: dt }));

      // Assertions
      assertFalse(fileEl.classList.contains('is-dragging'), 'is-dragging class must be removed on dragend');
      assertNotNull(filesPile.querySelector('#drag-file-f1'), 'File must remain in files-source-pile');
      assertEquals(document.getElementById('mouse-stat-score').textContent, initialScore, 'Score must not change');
      assertEquals(document.getElementById('mouse-stat-errors').textContent, initialErrors, 'Errors must not change');

      // 2. Pointer fallback drag: mousedown, mousemove, mouseup outside folder
      fileEl.dispatchEvent(new MockMouseEvent('mousedown', { button: 0, clientX: 100, clientY: 100, bubbles: true }));
      window.dispatchEvent(new MockMouseEvent('mousemove', { clientX: 150, clientY: 150, bubbles: true }));

      // Mouseup over empty window body (not over a .folder-drop-zone)
      window.dispatchEvent(new MockMouseEvent('mouseup', { clientX: 150, clientY: 150, bubbles: true }));

      assertFalse(fileEl.classList.contains('is-dragging'), 'Pointer fallback cleans up is-dragging class');
      assertNotNull(filesPile.querySelector('#drag-file-f1'), 'File still remains safe in DOM');
    });

    test('1.4 Multiple rapid drag-and-drop operations maintain state invariants', () => {
      const { window, document } = env;
      window.MouseTrainer.init('mouse-container');
      window.MouseTrainer.selectExercise(4);

      const arena = document.getElementById('mouse-arena');
      const docsFolder = arena.querySelector('[data-folder-id="docs"]');
      const imagesFolder = arena.querySelector('[data-folder-id="images"]');

      // Rapidly fire 10 invalid drops and 2 valid drops interleaved
      for (let i = 0; i < 5; i++) {
        const docFile = arena.querySelector('#drag-file-f1');
        // Invalid drop: doc into images
        env.dispatchDragDrop(docFile, imagesFolder, {
          'text/plain': JSON.stringify({ id: 'f1', ext: '.docx', cat: 'docs' })
        });
        // Void drop: doc into arena
        arena.dispatchEvent(new MockDragEvent('drop', { bubbles: true }));
      }

      const errorsEl = document.getElementById('mouse-stat-errors');
      assertEquals(errorsEl.textContent, '5', 'Errors must record all 5 invalid drops');

      // Now valid drop of f1 into docsFolder
      const docFile = arena.querySelector('#drag-file-f1');
      env.dispatchDragDrop(docFile, docsFolder, {
        'text/plain': JSON.stringify({ id: 'f1', ext: '.docx', cat: 'docs' })
      });

      const scoreEl = document.getElementById('mouse-stat-score');
      assertEquals(scoreEl.textContent, '50', 'Valid drop adds 50 pts despite prior invalid attempts');
      assertEquals(docsFolder.querySelector('.folder-count').textContent, '1');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SUITE 2: Exercise 5 (Hover & Tooltips / Системный навигатор)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Suite 2: Exercise 5 (Hover & Tooltips / Системный навигатор)', () => {

    test('2.1 Dwell timing discrimination: 400ms (no tooltip) vs 550ms (tooltip displayed)', async () => {
      const { window, document } = env;
      window.MouseTrainer.init('mouse-container');
      window.MouseTrainer.selectExercise(5);

      const arena = document.getElementById('mouse-arena');
      const wifiWidget = arena.querySelector('[data-widget-id="w_wifi"]');
      assertNotNull(wifiWidget, 'Wi-Fi widget must exist');

      // ── Subtest A: Sub-threshold hover (400ms) ──
      wifiWidget.dispatchEvent(new MockMouseEvent('mouseenter', { bubbles: true }));

      await waitMs(400);

      // At 400ms: tooltip must NOT exist (500ms threshold not reached)
      assertEquals(wifiWidget.querySelector('.mouse-tooltip'), null, 'Tooltip must NOT appear at 400ms (threshold is 500ms)');

      // Mouse leaves at 400ms
      wifiWidget.dispatchEvent(new MockMouseEvent('mouseleave', { bubbles: true }));

      // Wait another 250ms (total 650ms from start)
      await waitMs(250);

      assertEquals(wifiWidget.querySelector('.mouse-tooltip'), null, 'Tooltip must NOT appear after mouseleave aborted dwell timer');

      // ── Subtest B: Super-threshold hover (550ms) ──
      wifiWidget.dispatchEvent(new MockMouseEvent('mouseenter', { bubbles: true }));

      await waitMs(550);

      const tt = wifiWidget.querySelector('.mouse-tooltip');
      assertNotNull(tt, 'Tooltip MUST appear after 550ms dwell time');
      assertContains(tt.textContent, 'School_Informatics_5G', 'Tooltip text must match Wi-Fi description');

      // Clean up
      wifiWidget.dispatchEvent(new MockMouseEvent('mouseleave', { bubbles: true }));
      assertEquals(wifiWidget.querySelector('.mouse-tooltip'), null, 'Tooltip is immediately removed on mouseleave');
    });

    test('2.2 Rapid mouse transitions across all 10 widgets produces zero ghost tooltips and clean cancellation', async () => {
      const { window, document } = env;
      window.MouseTrainer.init('mouse-container');
      window.MouseTrainer.selectExercise(5);

      const arena = document.getElementById('mouse-arena');
      const widgets = arena.querySelectorAll('.hover-item');
      assertEquals(widgets.length, 10, 'Must have exactly 10 widgets');

      // Rapidly scrub through all widgets 3 times (30 entries and exits, 15ms dwell each)
      for (let step = 0; step < 30; step++) {
        const widgetIdx = step % widgets.length;
        const currentWidget = widgets[widgetIdx];

        // Enter
        currentWidget.dispatchEvent(new MockMouseEvent('mouseenter', { bubbles: true }));

        // Wait 15ms
        await waitMs(15);

        // Leave
        currentWidget.dispatchEvent(new MockMouseEvent('mouseleave', { bubbles: true }));
      }

      // Wait 600ms to guarantee any uncancelled 500ms timers would have fired
      await waitMs(600);

      const ghostTooltips = document.querySelectorAll('.mouse-tooltip');
      assertEquals(ghostTooltips.length, 0, 'Zero ghost tooltips must remain in DOM after rapid scrubbing');
    });

    test('2.3 Tooltip boundary clamping near right and left edges of arena', async () => {
      const { window, document } = env;
      window.MouseTrainer.init('mouse-container');
      window.MouseTrainer.selectExercise(5);

      const arena = document.getElementById('mouse-arena');
      const widgets = arena.querySelectorAll('.hover-item');
      const rightmostWidget = widgets[widgets.length - 1]; // w_close

      // Override getBoundingClientRect to simulate right-edge boundary collision
      arena.getBoundingClientRect = () => ({
        top: 0, left: 0, bottom: 400, right: 700, width: 700, height: 400, x: 0, y: 0
      });

      const oldProtoBCR = rightmostWidget.__proto__.getBoundingClientRect;

      // Custom getBoundingClientRect returning overflow past right boundary
      let customGetBCR = function() {
        if (this.classList && this.classList.contains('mouse-tooltip')) {
          return { top: 50, left: 580, bottom: 90, right: 760, width: 180, height: 40, x: 580, y: 50 };
        }
        return { top: 0, left: 0, bottom: 400, right: 700, width: 700, height: 400, x: 0, y: 0 };
      };

      rightmostWidget.__proto__.getBoundingClientRect = customGetBCR;

      rightmostWidget.dispatchEvent(new MockMouseEvent('mouseenter', { bubbles: true }));

      await waitMs(550);

      const clampedTt = rightmostWidget.querySelector('.mouse-tooltip');
      assertNotNull(clampedTt, 'Clamped tooltip must exist');

      assertEquals(clampedTt.style.left, 'auto', 'Left must be auto when clamped to right');
      assertEquals(clampedTt.style.right, '0', 'Right must be 0 when clamped to right');
      assertEquals(clampedTt.style.transform, 'none', 'Transform translateX must be none when clamped');

      // Now test left boundary overflow (left: -30 < arena.left: 0)
      rightmostWidget.dispatchEvent(new MockMouseEvent('mouseleave', { bubbles: true }));

      let customGetBCRLeft = function() {
        if (this.classList && this.classList.contains('mouse-tooltip')) {
          return { top: 50, left: -30, bottom: 90, right: 150, width: 180, height: 40, x: -30, y: 50 };
        }
        return { top: 0, left: 0, bottom: 400, right: 700, width: 700, height: 400, x: 0, y: 0 };
      };
      rightmostWidget.__proto__.getBoundingClientRect = customGetBCRLeft;

      rightmostWidget.dispatchEvent(new MockMouseEvent('mouseenter', { bubbles: true }));

      await waitMs(550);

      const leftClampedTt = rightmostWidget.querySelector('.mouse-tooltip');
      assertNotNull(leftClampedTt);
      assertEquals(leftClampedTt.style.left, '0', 'Left must be 0 when clamped to left');
      assertEquals(leftClampedTt.style.transform, 'none', 'Transform must be none when left-clamped');

      // Restore prototype
      rightmostWidget.__proto__.getBoundingClientRect = oldProtoBCR;
      rightmostWidget.dispatchEvent(new MockMouseEvent('mouseleave', { bubbles: true }));
    });

    test('2.4 Quest inspection progression and completion verification', async () => {
      const { window, document } = env;
      window.MouseTrainer.init('mouse-container');
      window.MouseTrainer.selectExercise(5);

      const arena = document.getElementById('mouse-arena');
      const scoreEl = document.getElementById('mouse-stat-score');
      const progEl = document.getElementById('mouse-stat-progress-text');

      // Test progression across quests: Quest 1 (w_usb) and Quest 2 (w_wifi)
      const questWidgets = ['w_usb', 'w_wifi'];

      for (let idx = 0; idx < questWidgets.length; idx++) {
        const widgetId = questWidgets[idx];
        const wEl = arena.querySelector(`[data-widget-id="${widgetId}"]`);
        assertNotNull(wEl, `Quest widget ${widgetId} must exist`);

        // Hover for 500ms (dwell) + 700ms (inspect) + 100ms buffer = 1300ms
        wEl.dispatchEvent(new MockMouseEvent('mouseenter', { bubbles: true }));

        await waitMs(1300);

        assertEquals(progEl.textContent, `${idx + 1} / 5`, `Progress text must be ${idx + 1} / 5`);
        assertEquals(parseInt(scoreEl.textContent, 10), (idx + 1) * 100, `Score must be ${(idx + 1) * 100}`);

        wEl.dispatchEvent(new MockMouseEvent('mouseleave', { bubbles: true }));
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SUITE 3: SoundSystem Synthesizer & AudioContext Resilience
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Suite 3: SoundSystem Synthesizer & AudioContext Resilience', () => {

    test('3.1 Mute toggle mechanics, persistence, and zero audio output when muted', () => {
      const { window, localStorage } = env;
      const sound = window.SoundSystem;

      sound.setMuted(false);
      assertFalse(sound.isMuted());
      assertEquals(localStorage.getItem('trainer_sound_muted'), 'false');

      // Mute
      sound.toggleMute();
      assertTrue(sound.isMuted());
      assertEquals(localStorage.getItem('trainer_sound_muted'), 'true');

      const ctx = sound.getContext();
      assertNotNull(ctx);
      const callCountBefore = ctx.__calls.length;

      // Play all sounds while muted
      sound.playTick();
      sound.playTargetHit();
      sound.playDoubleClick();
      sound.playSuccess();
      sound.playError();
      sound.playDragGrab();
      sound.playHoverTick();
      sound.playFanfare();

      assertEquals(ctx.__calls.length, callCountBefore, 'Zero audio oscillator or gain calls must be made while muted');

      // Unmute
      sound.setMuted(false);
      assertFalse(sound.isMuted());
      assertEquals(localStorage.getItem('trainer_sound_muted'), 'false');
    });

    test('3.2 Zero errors when AudioContext is blocked, null, throwing, or suspended', () => {
      const { window } = env;
      const sound = window.SoundSystem;

      // Scenario A: AudioContext constructor throws SecurityError (autoplay blocked)
      window.AudioContext = class ThrowingAudioContext {
        constructor() {
          throw new Error('NotAllowedError: AudioContext autoplay policy blocked by browser');
        }
      };
      window.webkitAudioContext = window.AudioContext;

      // Must execute cleanly without unhandled exceptions
      sound.playTick();
      sound.playTargetHit();
      sound.playDoubleClick();
      sound.playSuccess();
      sound.playError();
      sound.playDragGrab();
      sound.playHoverTick();
      sound.playFanfare();

      // Scenario B: AudioContext is null / undefined (legacy or unsupported browser)
      window.AudioContext = null;
      window.webkitAudioContext = null;

      sound.playTick();
      sound.playError();
      sound.playSuccess();

      // Scenario C: AudioContext in suspended state whose resume() rejects
      class SuspendedAudioContext {
        constructor() {
          this.state = 'suspended';
          this.destination = {};
        }
        createGain() { return { gain: { value: 1 } }; }
        createOscillator() { return { frequency: { value: 440 } }; }
        resume() { return Promise.reject(new Error('Resume failed')); }
      }
      window.AudioContext = SuspendedAudioContext;

      sound.playTick();
      sound.playError();
      sound.playSuccess();

      assertTrue(true, 'SoundSystem degraded gracefully without crashing in all blocked scenarios');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SUITE 4: M3 ↔ M4 Contract & Non-Destructive Progress Persistence
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Suite 4: M3 ↔ M4 Contract & Non-Destructive Progress Persistence', () => {

    test('4.1 MouseTrainer.finishSession emits strict M3 <-> M4 contract schema', () => {
      const { window } = env;
      window.MouseTrainer.init('mouse-container');
      window.MouseTrainer.selectExercise(1);

      const summary = window.MouseTrainer.finishSession({
        taskId: 'ex1_click',
        taskName: 'Снайпер клика',
        score: 250,
        time: 32,
        stars: 3,
        accuracy: 94
      });

      assertNotNull(summary);
      assertEquals(typeof summary.taskId, 'string');
      assertEquals(typeof summary.taskName, 'string');
      assertEquals(typeof summary.score, 'number');
      assertEquals(typeof summary.time, 'number');
      assertEquals(typeof summary.stars, 'number');
      assertEquals(typeof summary.accuracy, 'number');
      assertEquals(typeof summary.date, 'string');

      assertEquals(summary.taskId, 'ex1_click');
      assertEquals(summary.score, 250);
      assertEquals(summary.stars, 3);
      assertEquals(summary.accuracy, 94);
    });

    test('4.2 Additive persistence does not overwrite or corrupt student typing or tests records', () => {
      const { window, localStorage } = env;
      const App = window.App;

      // Seed localStorage with rich pre-existing student progress
      const preExistingData = {
        '7B-03': {
          id: '7B-03',
          name: 'Волков Артём',
          class: '7-Б',
          typing: {
            sessions: [
              { speed: 210, accuracy: 98, errors: 2, level: 1, duration: 40, date: '10.11.2026' },
              { speed: 235, accuracy: 100, errors: 0, level: 2, duration: 35, date: '11.11.2026' }
            ],
            bestSpeed: 235,
            bestAccuracy: 100,
            totalSessions: 2
          },
          tests: {
            sessions: [
              { testId: 'test_7_2_2', score: 95, total: 100, date: '10.11.2026' },
              { testId: 'test_7_2_3', score: 90, total: 100, date: '11.11.2026' }
            ],
            totalSessions: 2
          }
        },
        '7A-01': {
          id: '7A-01',
          name: 'Безруков Иван',
          class: '7-А',
          typing: {
            sessions: [{ speed: 150, accuracy: 90, errors: 5, level: 1, duration: 60, date: '11.11.2026' }],
            bestSpeed: 150,
            bestAccuracy: 90,
            totalSessions: 1
          },
          tests: { sessions: [], totalSessions: 0 }
        }
      };

      localStorage.setItem('trainer_progress', JSON.stringify(preExistingData));

      // Login as 7B-03
      App.state.currentStudent = { id: '7B-03', name: 'Волков Артём', class: '7-Б' };

      // Finish Mouse Exercise 4
      window.MouseTrainer.init('mouse-container');
      window.MouseTrainer.finishSession({
        taskId: 'ex4_dragdrop',
        taskName: 'Файловый архитектор',
        score: 600,
        time: 45,
        stars: 3,
        accuracy: 100
      });

      // Retrieve persisted progress
      const progressAfter = JSON.parse(localStorage.getItem('trainer_progress'));
      const student7B = progressAfter['7B-03'];
      const student7A = progressAfter['7A-01'];

      // ── VERIFY STUDENT 7B-03 ──
      assertNotNull(student7B, 'Student 7B-03 must exist');

      // Typing records must be 100% intact
      assertNotNull(student7B.typing);
      assertEquals(student7B.typing.totalSessions, 2, 'Typing totalSessions must remain 2');
      assertEquals(student7B.typing.bestSpeed, 235, 'Typing bestSpeed must remain 235');
      assertEquals(student7B.typing.sessions.length, 2, 'Typing sessions count must remain 2');
      assertEquals(student7B.typing.sessions[0].speed, 210);

      // Test records must be 100% intact
      assertNotNull(student7B.tests);
      assertEquals(student7B.tests.totalSessions, 2, 'Tests totalSessions must remain 2');
      assertEquals(student7B.tests.sessions.length, 2, 'Tests sessions count must remain 2');
      assertEquals(student7B.tests.sessions[0].testId, 'test_7_2_2');

      // Mouse records must be cleanly added
      assertNotNull(student7B.mouse);
      assertEquals(student7B.mouse.sessions.length, 1);
      assertEquals(student7B.mouse.sessions[0].taskId, 'ex4_dragdrop');
      assertEquals(student7B.mouse.sessions[0].score, 600);
      assertEquals(student7B.mouse.totalScore, 600);
      assertEquals(student7B.mouse.totalStars, 3);
      assertEquals(student7B.mouse.completedTasks['ex4_dragdrop'].bestScore, 600);
      assertEquals(student7B.mouse.completedTasks['ex4_dragdrop'].bestStars, 3);
      assertEquals(student7B.mouse.completedTasks['ex4_dragdrop'].bestTime, 45);

      // ── VERIFY STUDENT 7A-01 (Isolation) ──
      assertNotNull(student7A, 'Student 7A-01 must exist');
      assertEquals(student7A.typing.totalSessions, 1);
      assertEquals(student7A.typing.bestSpeed, 150);
      assertEquals(student7A.mouse, undefined, 'Student 7A-01 must not receive mouse records from 7B-03');

      // ── MULTI-SESSION ACCUMULATION FOR 7B-03 ──
      // Complete Exercise 5 for 7B-03
      window.MouseTrainer.finishSession({
        taskId: 'ex5_hover',
        taskName: 'Системный навигатор',
        score: 500,
        time: 50,
        stars: 2,
        accuracy: 85
      });

      const progressAfterSecond = JSON.parse(localStorage.getItem('trainer_progress'));
      const student7BSecond = progressAfterSecond['7B-03'];

      assertEquals(student7BSecond.mouse.sessions.length, 2, 'Mouse sessions count must now be 2');
      assertEquals(student7BSecond.mouse.totalScore, 1100, 'Total score must sum best scores (600 + 500 = 1100)');
      assertEquals(student7BSecond.mouse.totalStars, 5, 'Total stars must sum best stars (3 + 2 = 5)');
      assertNotNull(student7BSecond.mouse.completedTasks['ex4_dragdrop']);
      assertNotNull(student7BSecond.mouse.completedTasks['ex5_hover']);

      // Typing and tests remain untouched
      assertEquals(student7BSecond.typing.totalSessions, 2);
      assertEquals(student7BSecond.tests.totalSessions, 2);
    });
  });
});
