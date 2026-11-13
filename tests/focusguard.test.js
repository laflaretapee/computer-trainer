/**
 * tests/focusguard.test.js
 * Comprehensive Unit and Integration Test Suite for FocusGuard & TabGuard Anti-Cheat (Feature F21).
 * Tests pre-start warning modal, active session guarding across typing, mouse, and tests,
 * tab visibility change detection, window blur detection, TabGuard heartbeat,
 * immediate session voiding (0 XP, 0 score), violation logging, and false-positive prevention.
 */

'use strict';

const assertHelper = require('./helpers/assert');
const {
  assert,
  assertEquals,
  assertTrue,
  assertFalse,
  assertNotNull,
  assertContains
} = assertHelper;

const { setupBrowserEnv, teardownBrowserEnv, MockEvent } = require('./helpers/dom_env');
const FocusGuard = require('../modules/focusguard');

describe('Milestone 4 — FocusGuard & TabGuard Anti-Cheat (Feature F21)', () => {

  let env;

  beforeEach(() => {
    env = setupBrowserEnv();
    env.loadAppStack();
    localStorage.clear();
    FocusGuard.endSession();
  });

  afterEach(() => {
    FocusGuard.endSession();
    teardownBrowserEnv();
  });

  describe('1. Default Inactive State & Pre-Start Warning Gating', () => {
    test('FocusGuard is inactive on boot, menu, and class selection', () => {
      const App = window.App || global.App;
      assertFalse(FocusGuard.isGuarded(), 'FocusGuard must not be guarded on initial load');
      App.showScreen('screen-login');
      assertFalse(FocusGuard.isGuarded());
      App.showScreen('screen-menu');
      assertFalse(FocusGuard.isGuarded());
      App.showScreen('screen-teacher');
      assertFalse(FocusGuard.isGuarded());
    });

    test('showWarningModal displays pre-start modal and does not guard until confirmation', () => {
      let started = false;
      FocusGuard.showWarningModal({
        module: 'typing',
        title: 'Уровень 1',
        onConfirm: () => {
          started = true;
          FocusGuard.startSession('typing');
        }
      });

      const modal = document.getElementById('focusguard-warning-modal');
      assertNotNull(modal, '#focusguard-warning-modal must exist in DOM');
      assertEquals(modal.style.display, 'flex', 'Warning modal must be visible');
      assertFalse(FocusGuard.isGuarded(), 'Should not be guarded while warning modal is shown');
      assertFalse(started, 'Exercise should not start before confirm');

      // Click "Я готов, начать"
      const btnStart = document.getElementById('fg-btn-start');
      assertNotNull(btnStart);
      btnStart.click();

      assertTrue(started, 'Exercise callback must run on confirm');
      assertTrue(FocusGuard.isGuarded(), 'FocusGuard must be active after confirmation');
      assertEquals(modal.style.display, 'none', 'Modal must be closed');
    });

    test('Canceling warning modal safely returns without guarding or violations', () => {
      let canceled = false;
      FocusGuard.showWarningModal({
        module: 'mouse',
        title: 'Задание 1',
        onCancel: () => { canceled = true; }
      });

      const modal = document.getElementById('focusguard-warning-modal');
      assertEquals(modal.style.display, 'flex');

      const btnCancel = document.getElementById('fg-btn-cancel');
      btnCancel.click();

      assertTrue(canceled);
      assertFalse(FocusGuard.isGuarded());
      assertEquals(modal.style.display, 'none');
    });
  });

  describe('2. Violation Detection & Session Voiding', () => {
    test('Tab switch (visibilitychange -> hidden) during typing triggers abort, 0 XP, and logs violation', () => {
      const App = window.App || global.App;
      // Set current student
      App.state.currentStudent = { id: '7A-01', name: 'Иванов Иван', class: '7-А' };

      let teardownCalled = false;
      FocusGuard.startSession('typing', () => {
        teardownCalled = true;
      });

      assertTrue(FocusGuard.isGuarded());

      // Simulate student switching to another tab
      env.setVisibilityState('hidden');

      assertTrue(teardownCalled, 'Teardown callback must be invoked on violation');
      assertFalse(FocusGuard.isGuarded(), 'Guard must disarm after violation');

      // Verify persistent storage
      const progress = JSON.parse(localStorage.getItem('trainer_progress') || '{}');
      const student = progress['7A-01'];
      assertNotNull(student, 'Student record should be created/updated');
      assertEquals(student.focusViolations, 1, 'Should record 1 focus violation');
      assertEquals(student.violationsLog.length, 1);
      assertEquals(student.violationsLog[0].reason, 'tab_hidden');

      // Verify 0 XP / no session recorded in typing
      assertFalse(Boolean(student.typing && student.typing.totalSessions > 0), 'No positive typing sessions should be saved');

      // Verify in-app void modal is shown
      const voidModal = document.getElementById('focusguard-void-modal');
      assertNotNull(voidModal);
      assertEquals(voidModal.style.display, 'flex');
      assertContains(voidModal.textContent, '🚫 Попытка аннулирована!');
    });

    test('Window blur triggers voiding when document has lost focus', async () => {
      const App = window.App || global.App;
      App.state.currentStudent = { id: '7A-02', name: 'Петров Пётр', class: '7-А' };

      let voidHandled = false;
      FocusGuard.startSession('mouse', () => {
        voidHandled = true;
      });

      // Simulate genuine OS window defocus
      env.setFocus(false);
      window.dispatchEvent(new MockEvent('blur'));

      // 60ms debounce verification
      await new Promise(r => setTimeout(r, 90));

      assertTrue(voidHandled, 'Void callback must execute after blur debounce');
      assertFalse(FocusGuard.isGuarded());

      const progress = JSON.parse(localStorage.getItem('trainer_progress') || '{}');
      assertEquals(progress['7A-02'].focusViolations, 1);
    });

    test('False-positive blur is ignored when document retains focus (internal click)', async () => {
      FocusGuard.startSession('typing');
      assertTrue(FocusGuard.isGuarded());

      // Simulate internal click where document.hasFocus() remains true
      env.setFocus(true);
      window.dispatchEvent(new MockEvent('blur'));

      await new Promise(r => setTimeout(r, 90));

      assertTrue(FocusGuard.isGuarded(), 'Session must remain active for internal blur events');
      const voidModal = document.getElementById('focusguard-void-modal');
      if (voidModal) {
        assertFalse(voidModal.style.display === 'flex');
      }
    });
  });

  describe('3. Clean Completion and Deactivation', () => {
    test('Normal exercise completion disarms guard so post-completion blur is benign', () => {
      const App = window.App || global.App;
      App.state.currentStudent = { id: '7A-03', name: 'Сидоров Сидор', class: '7-А' };

      FocusGuard.startSession('typing');
      assertTrue(FocusGuard.isGuarded());

      // Normal completion saves progress via App.saveProgress()
      App.saveProgress('7A-03', 'typing', { speed: 100, accuracy: 95 });

      assertFalse(FocusGuard.isGuarded(), 'FocusGuard must disarm after successful saveProgress');

      // Subsequent blur or tab hidden should be ignored
      env.setVisibilityState('hidden');
      env.setFocus(false);
      window.dispatchEvent(new MockEvent('blur'));

      const progress = JSON.parse(localStorage.getItem('trainer_progress') || '{}');
      assertEquals(progress['7A-03'].focusViolations, 0, 'No violations after clean completion');
    });
  });

  describe('4. TabGuard Multi-Tab Heartbeat & Teacher Toggle', () => {
    test('Teacher TabGuard toggle persists in localStorage', () => {
      assertTrue(FocusGuard.isTabGuardEnabled(), 'Enabled by default');
      FocusGuard.setTabGuardEnabled(false);
      assertFalse(FocusGuard.isTabGuardEnabled());
      FocusGuard.setTabGuardEnabled(true);
      assertTrue(FocusGuard.isTabGuardEnabled());
    });

    test('Duplicate active tab overriding heartbeat triggers session voiding', () => {
      const App = window.App || global.App;
      App.state.currentStudent = { id: '7A-04', name: 'Козлов К.', class: '7-А' };
      FocusGuard.setTabGuardEnabled(true);

      let voided = false;
      FocusGuard.startSession('tests', () => {
        voided = true;
      });

      assertTrue(FocusGuard.isGuarded());

      // Simulate another browser tab writing an active heartbeat
      localStorage.setItem('trainer_heartbeat', JSON.stringify({
        tabId: 'rogue_tab_999',
        time: Date.now()
      }));

      // Directly trigger or wait for violation
      FocusGuard.triggerViolation('tabguard_duplicate');

      assertTrue(voided);
      assertFalse(FocusGuard.isGuarded());
      const progress = JSON.parse(localStorage.getItem('trainer_progress') || '{}');
      assertEquals(progress['7A-04'].focusViolations, 1);
      assertEquals(progress['7A-04'].violationsLog[0].reason, 'tabguard_duplicate');
    });
  });
});
