/**
 * modules/autoupdate.js
 * Network-Aware Auto-Update Engine (Feature F17) for 7th-Grade Computer Trainer SPA.
 * Non-blocking manifest fetcher with 2500ms timeout, safe offline/file:// fallback,
 * update notification modal, and UI indicator.
 */

'use strict';

(function () {

  const CURRENT_VERSION = '1.1.0';
  const MANIFEST_URL = 'version.json';
  const TIMEOUT_MS = 2500;
  const SETTING_KEY = 'trainer_autoupdate_enabled';

  let _status = 'ready'; // 'ready' | 'checking' | 'update_available' | 'up_to_date' | 'offline'
  let _lastChecked = null;
  let _availableVersion = null;

  function init() {
    _renderIndicator();
    _bindEvents();

    if (isAutoUpdateEnabled() && isOnline()) {
      // Non-blocking background check
      setTimeout(() => {
        checkForUpdates(false).catch(() => {});
      }, 1000);
    }
  }

  function isOnline() {
    if (typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean') {
      return navigator.onLine;
    }
    return false;
  }

  function isAutoUpdateEnabled() {
    try {
      return localStorage.getItem(SETTING_KEY) !== 'false';
    } catch (_) {
      return true;
    }
  }

  function setAutoUpdateEnabled(enabled) {
    try {
      localStorage.setItem(SETTING_KEY, enabled ? 'true' : 'false');
    } catch (_) {}
  }

  function getCurrentVersion() {
    return CURRENT_VERSION;
  }

  function getStatus() {
    return _status;
  }

  function getLastChecked() {
    return _lastChecked;
  }

  /**
   * Compares two semantic version strings (e.g. "1.2.0" > "1.1.0").
   * Returns true if vRemote > vCurrent.
   */
  function isNewerVersion(vRemote, vCurrent) {
    if (!vRemote) return false;
    if (!vCurrent) return true;

    const rParts = String(vRemote).split('.').map(n => parseInt(n, 10) || 0);
    const cParts = String(vCurrent).split('.').map(n => parseInt(n, 10) || 0);

    const maxLen = Math.max(rParts.length, cParts.length);
    for (let i = 0; i < maxLen; i++) {
      const r = rParts[i] || 0;
      const c = cParts[i] || 0;
      if (r > c) return true;
      if (r < c) return false;
    }
    return false;
  }

  /**
   * Checks for software/curriculum updates via version.json manifest.
   * Completely fail-safe for offline and file:// environments.
   * @param {boolean} [manual=false] - True if triggered manually by user.
   */
  async function checkForUpdates(manual = false) {
    if (!isOnline()) {
      _status = 'offline';
      _updateIndicatorUI();
      if (manual) {
        _showNotification('Офлайн-режим. Проверка обновлений недоступна без подключения к интернету.');
      }
      return { status: 'offline', version: CURRENT_VERSION };
    }

    _status = 'checking';
    _updateIndicatorUI();

    let controller = null;
    let timeoutId = null;

    try {
      if (typeof AbortController !== 'undefined') {
        controller = new AbortController();
        timeoutId = setTimeout(() => {
          try { controller.abort(); } catch (_) {}
        }, TIMEOUT_MS);
      }

      const fetchOptions = {
        cache: 'no-store',
        signal: controller ? controller.signal : undefined
      };

      const url = `${MANIFEST_URL}?_t=${Date.now()}`;
      const response = await fetch(url, fetchOptions);

      if (timeoutId) clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const manifest = await response.json();
      _lastChecked = new Date();

      if (manifest && isNewerVersion(manifest.version, CURRENT_VERSION)) {
        _status = 'update_available';
        _availableVersion = manifest.version;
        _updateIndicatorUI();
        _showUpdateModal(manifest);
        return { status: 'update_available', version: manifest.version, manifest };
      } else {
        _status = 'up_to_date';
        _updateIndicatorUI();
        if (manual) {
          _showNotification(`У вас установлена актуальная версия (v${CURRENT_VERSION}).`);
        }
        return { status: 'up_to_date', version: CURRENT_VERSION };
      }
    } catch (err) {
      if (timeoutId) clearTimeout(timeoutId);

      _status = 'offline';
      _updateIndicatorUI();

      if (manual) {
        _showNotification('Не удалось загрузить манифест обновлений. Приложение продолжает работать в офлайн-режиме.');
      }

      return { status: 'offline', error: err.message || 'Network error' };
    }
  }

  // ─── UI & MODAL NOTIFICATIONS ─────────────────────────────────────────────

  function _renderIndicator() {
    if (typeof document === 'undefined') return;

    let el = document.getElementById('update-indicator');
    if (!el) {
      el = document.createElement('div');
      el.id = 'update-indicator';
      el.className = 'update-indicator';
      const header = document.querySelector('.screen-header') || document.body;
      header.appendChild(el);
    }

    _updateIndicatorUI();
  }

  function _updateIndicatorUI() {
    if (typeof document === 'undefined') return;

    const el = document.getElementById('update-indicator');
    if (!el) return;

    let statusText = `v${CURRENT_VERSION}`;
    let badgeClass = 'status-current';

    if (_status === 'checking') {
      statusText = `v${CURRENT_VERSION} ⏳`;
      badgeClass = 'status-checking';
    } else if (_status === 'update_available') {
      statusText = `v${_availableVersion} 🚀 Обновление!`;
      badgeClass = 'status-available';
    } else if (_status === 'offline') {
      statusText = `v${CURRENT_VERSION} (офлайн)`;
      badgeClass = 'status-offline';
    }

    el.innerHTML = `
      <span class="version-badge ${badgeClass}" title="Текущая версия тренажёра: v${CURRENT_VERSION}">${statusText}</span>
      <button id="btn-check-update" class="btn-check-update" type="button" title="Проверить обновления">Проверить сейчас</button>
    `;

    const btn = el.querySelector('#btn-check-update');
    if (btn) {
      btn.addEventListener('click', () => checkForUpdates(true));
    }
  }

  function _showUpdateModal(manifest) {
    if (typeof document === 'undefined') return;

    let modal = document.getElementById('update-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'update-modal';
      modal.className = 'modal-overlay update-modal';
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
      document.body.appendChild(modal);
    }

    const newVer = manifest.version || 'новое';
    const featuresList = (manifest.features || [])
      .map(f => `<li>✓ ${f}</li>`)
      .join('');

    modal.innerHTML = `
      <div class="modal-box update-modal-box">
        <div class="modal-header">
          <h2>🚀 Доступно обновление: v${newVer}</h2>
        </div>
        <div class="modal-body">
          <p>Выпущена новая версия тренажёра по информатике. Хотите обновить приложение прямо сейчас?</p>
          ${featuresList ? `<ul class="update-features-list">${featuresList}</ul>` : ''}
          <p class="text-muted"><small>Все данные учеников и прогресс на этом ПК будут полностью сохранены.</small></p>
        </div>
        <div class="modal-actions">
          <button id="btn-apply-update" class="btn btn-primary btn-lg" type="button">🔄 Обновить сейчас</button>
          <button id="btn-dismiss-update" class="btn btn-secondary" type="button">Позже</button>
        </div>
      </div>
    `;

    modal.style.display = 'flex';

    const btnApply = modal.querySelector('#btn-apply-update');
    const btnDismiss = modal.querySelector('#btn-dismiss-update');

    if (btnApply) {
      btnApply.addEventListener('click', () => {
        modal.style.display = 'none';
        if (typeof window !== 'undefined' && window.location) {
          window.location.reload();
        }
      });
    }

    if (btnDismiss) {
      btnDismiss.addEventListener('click', () => {
        modal.style.display = 'none';
      });
    }
  }

  function _showNotification(msg) {
    if (typeof window !== 'undefined' && window.Gamification && typeof window.Gamification.showToast === 'function') {
      window.Gamification.showToast({
        title: 'Обновление системы',
        icon: 'ℹ️',
        description: msg,
        bonusXp: 0
      });
    } else if (typeof document !== 'undefined') {
      const container = document.getElementById('toast-container');
      if (container) {
        const toast = document.createElement('div');
        toast.className = 'achievement-toast info-toast animate-slide-in';
        toast.innerHTML = `
          <div class="toast-icon">ℹ️</div>
          <div class="toast-content">
            <h4 class="toast-title">Обновление</h4>
            <p class="toast-desc">${msg}</p>
          </div>
        `;
        container.appendChild(toast);
        setTimeout(() => {
          if (toast.parentNode) toast.parentNode.removeChild(toast);
        }, 4000);
      }
    }
  }

  function _bindEvents() {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', () => {
      _updateIndicatorUI();
      if (isAutoUpdateEnabled()) {
        checkForUpdates(false).catch(() => {});
      }
    });

    window.addEventListener('offline', () => {
      _status = 'offline';
      _updateIndicatorUI();
    });
  }

  const AutoUpdate = {
    init,
    isOnline,
    isAutoUpdateEnabled,
    setAutoUpdateEnabled,
    getCurrentVersion,
    getStatus,
    getLastChecked,
    checkForUpdates,
    isNewerVersion
  };

  if (typeof window !== 'undefined') {
    window.AutoUpdate = AutoUpdate;
  }
  if (typeof globalThis !== 'undefined') {
    globalThis.AutoUpdate = AutoUpdate;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = AutoUpdate;
  }

})();
