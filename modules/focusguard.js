/**
 * modules/focusguard.js
 * FocusGuard & TabGuard Anti-Cheat Protection (Feature F21) for 7th-Grade Computer Trainer SPA.
 * Monitors window blur and page visibility during active exercises across typing, mouse, and tests.
 * Maintains 1s heartbeat to prevent multi-tab abuse, enforces pre-start warning,
 * voids session results (0 XP, 0 score), and logs violations for teacher auditing.
 */

'use strict';

(function () {

  const HEARTBEAT_KEY = 'trainer_heartbeat';
  const TABGUARD_SETTING_KEY = 'trainer_tabguard_enabled';
  const STORAGE_KEY = 'trainer_progress';

  let _isGuarded = false;
  let _activeModule = null; // 'typing' | 'mouse' | 'tests' | null
  let _onVoidCallback = null;
  let _onRetryCallback = null;
  let _blurTimer = null;
  let _heartbeatInterval = null;
  const _tabId = `tab_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

  function init() {
    _ensureModals();
    _bindGlobalModals();
  }

  function isGuarded() {
    return _isGuarded;
  }

  function getActiveModule() {
    return _activeModule;
  }

  function isTabGuardEnabled() {
    try {
      return localStorage.getItem(TABGUARD_SETTING_KEY) !== 'false';
    } catch (_) {
      return true;
    }
  }

  function setTabGuardEnabled(enabled) {
    try {
      localStorage.setItem(TABGUARD_SETTING_KEY, enabled ? 'true' : 'false');
    } catch (_) {}
  }

  /**
   * Displays the pre-start warning modal for an exercise.
   * @param {Object} options
   * @param {string} options.module - 'typing' | 'mouse' | 'tests'
   * @param {string} [options.title] - Name of exercise or level
   * @param {Function} options.onConfirm - Invoked when student clicks «Я готов, начать»
   * @param {Function} [options.onCancel] - Invoked if student cancels
   */
  function showWarningModal(options) {
    _ensureModals();
    const modal = document.getElementById('focusguard-warning-modal');
    if (!modal) {
      if (options && typeof options.onConfirm === 'function') options.onConfirm();
      return;
    }

    const titleEl = document.getElementById('fg-warn-module-title');
    if (titleEl && options && options.title) {
      titleEl.textContent = options.title;
    }

    modal.style.display = 'flex';

    const btnStart = document.getElementById('fg-btn-start');
    const btnCancel = document.getElementById('fg-btn-cancel');
    const btnFullscreen = document.getElementById('fg-btn-fullscreen');

    const cleanStart = () => {
      modal.style.display = 'none';
      if (btnStart) btnStart.removeEventListener('click', onStartClick);
      if (btnCancel) btnCancel.removeEventListener('click', onCancelClick);
      if (options && typeof options.onConfirm === 'function') {
        options.onConfirm();
      }
    };

    const cleanCancel = () => {
      modal.style.display = 'none';
      if (btnStart) btnStart.removeEventListener('click', onStartClick);
      if (btnCancel) btnCancel.removeEventListener('click', onCancelClick);
      if (options && typeof options.onCancel === 'function') {
        options.onCancel();
      }
    };

    function onStartClick() { cleanStart(); }
    function onCancelClick() { cleanCancel(); }

    if (btnStart) {
      btnStart.onclick = onStartClick;
    }
    if (btnCancel) {
      btnCancel.onclick = onCancelClick;
    }
    if (btnFullscreen) {
      btnFullscreen.onclick = () => {
        try {
          if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen().catch(() => {});
          }
        } catch (_) {}
      };
    }
  }

  /**
   * Activates window focus and document visibility monitoring for an exercise session.
   * @param {string} moduleName - 'typing' | 'mouse' | 'tests'
   * @param {Function} onVoid - Callback executed when violation is confirmed
   * @param {Function} [onRetry] - Callback to restart the activity
   */
  function startSession(moduleName, onVoid, onRetry) {
    if (_isGuarded) {
      endSession();
    }

    _isGuarded = true;
    _activeModule = moduleName || 'general';
    _onVoidCallback = typeof onVoid === 'function' ? onVoid : null;
    _onRetryCallback = typeof onRetry === 'function' ? onRetry : null;

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', _handleVisibilityChange);
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('blur', _handleWindowBlur);
    }

    if (isTabGuardEnabled()) {
      _startHeartbeat();
    }
  }

  /**
   * Cleanly ends the guarded session upon legitimate exercise completion or deliberate exit.
   */
  function endSession() {
    _isGuarded = false;
    _activeModule = null;
    _onVoidCallback = null;

    if (_blurTimer) {
      clearTimeout(_blurTimer);
      _blurTimer = null;
    }

    _stopHeartbeat();

    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', _handleVisibilityChange);
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('blur', _handleWindowBlur);
    }
  }

  /**
   * Triggers anti-cheat violation, voids session metrics, logs violation, and presents void modal.
   * @param {string} reason - 'window_blur' | 'tab_hidden' | 'tabguard_duplicate'
   */
  function triggerViolation(reason = 'window_blur') {
    if (!_isGuarded) return;

    const voidedModule = _activeModule;
    const voidCallback = _onVoidCallback;
    const retryCallback = _onRetryCallback;

    // Immediately teardown guard to prevent recursive events
    endSession();

    // 1. Terminate module timers and clear DOM/audio
    if (typeof voidCallback === 'function') {
      try {
        voidCallback();
      } catch (err) {
        console.error('Ошибка при аварийном завершении модуля:', err);
      }
    }

    // 2. Increment student violation count in persistent storage
    let violationsCount = 1;
    let studentId = null;

    try {
      if (typeof window !== 'undefined' && window.App && window.App.state && window.App.state.currentStudent) {
        studentId = window.App.state.currentStudent.id;
      }
    } catch (_) {}

    if (studentId) {
      let all = {};
      try {
        all = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      } catch (_) {}

      if (!all[studentId]) {
        all[studentId] = { studentId, focusViolations: 0, violationsLog: [] };
      }

      const rec = all[studentId];
      rec.focusViolations = (rec.focusViolations || 0) + 1;
      violationsCount = rec.focusViolations;
      rec.violationsLog = rec.violationsLog || [];
      rec.violationsLog.push({
        timestamp: new Date().toISOString(),
        module: voidedModule,
        reason: reason
      });

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
      } catch (_) {}

      // Push telemetry event
      try {
        if (typeof window !== 'undefined' && window.Telemetry && typeof window.Telemetry.enqueueProgress === 'function') {
          window.Telemetry.enqueueProgress(studentId, 'focus_violation', {
            reason,
            module: voidedModule,
            timestamp: new Date().toISOString()
          }, { focusViolations: violationsCount });
        }
      } catch (_) {}
    }

    // 3. Render In-App Void Notification Modal
    showVoidModal({
      module: voidedModule,
      reason,
      violationsCount,
      onRetry: retryCallback,
      onMenu: () => {
        if (typeof window !== 'undefined' && window.App && typeof window.App.showScreen === 'function') {
          window.App.showScreen('screen-menu');
        }
      }
    });
  }

  function _handleVisibilityChange() {
    if (!_isGuarded) return;
    if (typeof document !== 'undefined' && (document.hidden || document.visibilityState === 'hidden')) {
      triggerViolation('tab_hidden');
    }
  }

  function _handleWindowBlur() {
    if (!_isGuarded) return;

    if (_blurTimer) clearTimeout(_blurTimer);
    // 60ms debounce: check if page still has focus (avoids false-positive on clicking internal inputs/iframes)
    _blurTimer = setTimeout(() => {
      if (!_isGuarded) return;

      let hasFocus = false;
      try {
        if (typeof document !== 'undefined' && typeof document.hasFocus === 'function') {
          hasFocus = document.hasFocus();
        }
      } catch (_) {}

      if (!hasFocus) {
        triggerViolation('window_blur');
      }
    }, 60);
  }

  // ─── TABGUARD HEARTBEAT (MULTI-TAB GUARD) ─────────────────────────────────

  function _startHeartbeat() {
    _stopHeartbeat();
    _writeHeartbeat();

    _heartbeatInterval = setInterval(() => {
      if (!_isGuarded) {
        _stopHeartbeat();
        return;
      }

      const current = _readHeartbeat();
      if (current && current.tabId && current.tabId !== _tabId && (Date.now() - (current.time || 0)) < 3000) {
        // Another active tab has usurped the active exercise
        triggerViolation('tabguard_duplicate');
      } else {
        _writeHeartbeat();
      }
    }, 1000);
  }

  function _stopHeartbeat() {
    if (_heartbeatInterval) {
      clearInterval(_heartbeatInterval);
      _heartbeatInterval = null;
    }
  }

  function _writeHeartbeat() {
    try {
      localStorage.setItem(HEARTBEAT_KEY, JSON.stringify({ tabId: _tabId, time: Date.now() }));
    } catch (_) {}
  }

  function _readHeartbeat() {
    try {
      return JSON.parse(localStorage.getItem(HEARTBEAT_KEY) || 'null');
    } catch (_) {
      return null;
    }
  }

  // ─── DOM MODAL MANAGEMENT ────────────────────────────────────────────────

  function _ensureModals() {
    if (typeof document === 'undefined') return;

    // 1. Warning Modal
    let warnModal = document.getElementById('focusguard-warning-modal');
    if (!warnModal) {
      warnModal = document.createElement('div');
      warnModal.id = 'focusguard-warning-modal';
      warnModal.className = 'modal-overlay focusguard-modal';
      warnModal.style.display = 'none';
      warnModal.setAttribute('role', 'dialog');
      warnModal.setAttribute('aria-modal', 'true');
      warnModal.setAttribute('aria-labelledby', 'fg-warn-title');

      warnModal.innerHTML = `
        <div class="modal-box fg-modal-box">
          <div class="modal-header fg-warn-header">
            <h2 id="fg-warn-title">⚠️ Внимание! Контроль фокуса</h2>
          </div>
          <div class="modal-body fg-modal-body">
            <div class="fg-icon-wrap">🛡️</div>
            <p class="fg-warn-text">
              Выход с вкладки, сворачивание окна или переключение в другую программу/игру 
              <strong>немедленно аннулирует результат</strong> текущей попытки (0 XP)!
            </p>
            <p class="fg-warn-subtext" id="fg-warn-module-title">Выполняйте задание непрерывно до появления экрана с результатами.</p>
            <div class="fg-fullscreen-row">
              <button id="fg-btn-fullscreen" class="btn btn-secondary btn-sm" type="button">⛶ Во весь экран</button>
            </div>
          </div>
          <div class="modal-actions fg-modal-actions">
            <button id="fg-btn-start" class="btn btn-primary btn-lg" type="button">▶ Я готов, начать</button>
            <button id="fg-btn-cancel" class="btn btn-outline" type="button">Отмена</button>
          </div>
        </div>
      `;
      document.body.appendChild(warnModal);
    }

    // 2. Void Modal
    let voidModal = document.getElementById('focusguard-void-modal');
    if (!voidModal) {
      voidModal = document.createElement('div');
      voidModal.id = 'focusguard-void-modal';
      voidModal.className = 'modal-overlay focusguard-modal';
      voidModal.style.display = 'none';
      voidModal.setAttribute('role', 'dialog');
      voidModal.setAttribute('aria-modal', 'true');
      voidModal.setAttribute('aria-labelledby', 'fg-void-title');

      voidModal.innerHTML = `
        <div class="modal-box fg-modal-box fg-void-box">
          <div class="modal-header fg-void-header">
            <h2 id="fg-void-title">🚫 Попытка аннулирована!</h2>
          </div>
          <div class="modal-body fg-modal-body">
            <div class="fg-icon-wrap fg-void-icon">⚠️</div>
            <p class="fg-void-main">Зафиксирован выход из окна или переключение вкладки.</p>
            <p class="fg-void-desc">
              По правилам дисциплины результат текущей попытки полностью аннулирован (начислено 0 XP).
              Факт нарушения зафиксирован в журнале учителя.
            </p>
            <div class="fg-violation-stat">
              <span>Всего нарушений фокуса на этом ПК:</span>
              <strong id="fg-violation-count">1</strong>
            </div>
          </div>
          <div class="modal-actions fg-modal-actions">
            <button id="fg-btn-retry" class="btn btn-primary" type="button">🔄 Начать заново</button>
            <button id="fg-btn-menu" class="btn btn-secondary" type="button">🏠 В главное меню</button>
          </div>
        </div>
      `;
      document.body.appendChild(voidModal);
    }
  }

  function _bindGlobalModals() {
    _ensureModals();
  }

  function showVoidModal(options) {
    _ensureModals();
    const modal = document.getElementById('focusguard-void-modal');
    if (!modal) return;

    const countEl = document.getElementById('fg-violation-count');
    if (countEl && options && options.violationsCount !== undefined) {
      countEl.textContent = String(options.violationsCount);
    }

    modal.style.display = 'flex';

    const btnRetry = document.getElementById('fg-btn-retry');
    const btnMenu = document.getElementById('fg-btn-menu');

    if (btnRetry) {
      btnRetry.onclick = () => {
        modal.style.display = 'none';
        if (options && typeof options.onRetry === 'function') {
          options.onRetry();
        }
      };
    }

    if (btnMenu) {
      btnMenu.onclick = () => {
        modal.style.display = 'none';
        if (options && typeof options.onMenu === 'function') {
          options.onMenu();
        }
      };
    }
  }

  const FocusGuard = {
    init,
    isGuarded,
    getActiveModule,
    isTabGuardEnabled,
    setTabGuardEnabled,
    showWarningModal,
    showVoidModal,
    startSession,
    endSession,
    triggerViolation
  };

  if (typeof window !== 'undefined') {
    window.FocusGuard = FocusGuard;
  }
  if (typeof globalThis !== 'undefined') {
    globalThis.FocusGuard = FocusGuard;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = FocusGuard;
  }

})();
