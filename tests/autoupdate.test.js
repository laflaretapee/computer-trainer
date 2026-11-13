/**
 * tests/autoupdate.test.js
 * Comprehensive Unit and Integration Test Suite for Network-Aware Auto-Update (Feature F17).
 * Tests online detection, non-blocking manifest fetch with 2500ms timeout,
 * offline / file:// safety, version comparison, and update modal UI.
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

const { setupBrowserEnv, teardownBrowserEnv } = require('./helpers/dom_env');
const AutoUpdate = require('../modules/autoupdate');

describe('Milestone 4 — Network-Aware Auto-Update (Feature F17)', () => {

  let env;

  beforeEach(() => {
    env = setupBrowserEnv({ loadApp: true });
    localStorage.clear();
  });

  afterEach(() => {
    teardownBrowserEnv();
  });

  describe('1. Version Comparison Logic', () => {
    test('isNewerVersion accurately compares semantic version strings', () => {
      assertTrue(AutoUpdate.isNewerVersion('1.2.0', '1.1.0'), '1.2.0 is newer than 1.1.0');
      assertTrue(AutoUpdate.isNewerVersion('2.0.0', '1.9.9'), '2.0.0 is newer than 1.9.9');
      assertTrue(AutoUpdate.isNewerVersion('1.1.1', '1.1.0'), '1.1.1 is newer than 1.1.0');

      assertFalse(AutoUpdate.isNewerVersion('1.1.0', '1.1.0'), 'Same version is not newer');
      assertFalse(AutoUpdate.isNewerVersion('1.0.9', '1.1.0'), '1.0.9 is older than 1.1.0');
      assertFalse(AutoUpdate.isNewerVersion(null, '1.1.0'), 'Null is not newer');
    });
  });

  describe('2. Offline and Fallback Reliability', () => {
    test('When offline, checkForUpdates executes zero network calls and returns offline status', async () => {
      env.setOnline(false);
      assertFalse(AutoUpdate.isOnline(), 'Should detect offline state');

      const initialFetchCalls = window.__fetchCalls.length;
      const res = await AutoUpdate.checkForUpdates(false);

      assertEquals(res.status, 'offline');
      assertEquals(window.__fetchCalls.length, initialFetchCalls, 'Zero fetch calls when offline');
    });

    test('Network failure during fetch fails silently without throwing uncaught exceptions', async () => {
      env.setOnline(true);
      env.setFetchMock(() => {
        throw new Error('Connection refused / CORS error on file://');
      });

      const res = await AutoUpdate.checkForUpdates(false);
      assertEquals(res.status, 'offline');
    });
  });

  describe('3. Online Update Detection & Modal UI', () => {
    test('Detects newer version and displays update modal with new version details', async () => {
      env.setOnline(true);
      env.setFetchMock((url) => {
        if (url.includes('version.json')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              version: '1.2.0',
              buildDate: '2026-12-01',
              features: ['Новые тесты по сетям', 'Расширенная анимация']
            })
          };
        }
      });

      const res = await AutoUpdate.checkForUpdates(true);
      assertEquals(res.status, 'update_available');
      assertEquals(res.version, '1.2.0');

      const modal = document.getElementById('update-modal');
      assertNotNull(modal, '#update-modal must exist in DOM');
      assertEquals(modal.style.display, 'flex', 'Update modal must be displayed');
      assertContains(modal.textContent, 'v1.2.0');
      assertContains(modal.textContent, 'Новые тесты по сетям');

      const btnApply = modal.querySelector('#btn-apply-update');
      assertNotNull(btnApply, 'Apply update button must exist');
    });

    test('Detects up-to-date version and does not show modal', async () => {
      env.setOnline(true);
      env.setFetchMock((url) => {
        if (url.includes('version.json')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              version: '1.1.0',
              buildDate: '2026-11-13'
            })
          };
        }
      });

      const res = await AutoUpdate.checkForUpdates(false);
      assertEquals(res.status, 'up_to_date');

      const modal = document.getElementById('update-modal');
      if (modal) {
        assertFalse(modal.style.display === 'flex', 'Update modal must not be displayed when up-to-date');
      }
    });
  });

  describe('4. Settings and Indicator Controls', () => {
    test('Auto-update enabled setting toggles and persists in localStorage', () => {
      assertTrue(AutoUpdate.isAutoUpdateEnabled(), 'Enabled by default');
      AutoUpdate.setAutoUpdateEnabled(false);
      assertFalse(AutoUpdate.isAutoUpdateEnabled(), 'Should be disabled');
      AutoUpdate.setAutoUpdateEnabled(true);
      assertTrue(AutoUpdate.isAutoUpdateEnabled(), 'Should be re-enabled');
    });

    test('UI version indicator renders in top header with check button', () => {
      AutoUpdate.init();
      const indicator = document.getElementById('update-indicator');
      assertNotNull(indicator, '#update-indicator must be rendered in DOM');
      assertContains(indicator.textContent, 'v1.1.0');

      const btnCheck = indicator.querySelector('#btn-check-update');
      assertNotNull(btnCheck, 'Check update button must exist');
    });
  });
});
