/**
 * modules/telemetry.js
 * Offline-First Telemetry & Progress Sync (Feature F20) for 7th-Grade Computer Trainer SPA.
 * Manages local syncQueue, auto-POST on network recovery, 30s retry loop,
 * multi-PC JSON backup bundle export, and non-destructive deep merge.
 */

'use strict';

(function () {

  const QUEUE_STORAGE_KEY = 'sync_queue';
  const URL_STORAGE_KEY = 'trainer_sync_url';
  const LAST_SYNC_KEY = 'trainer_last_sync';
  const RETRY_INTERVAL_MS = 30000;
  const HTTP_TIMEOUT_MS = 5000;

  let _retryTimer = null;
  let _isSyncing = false;

  function init() {
    _startRetryLoop();
    _bindEvents();
  }

  function getSyncQueue() {
    try {
      return JSON.parse(localStorage.getItem(QUEUE_STORAGE_KEY) || '[]');
    } catch (_) {
      return [];
    }
  }

  function _saveSyncQueue(queue) {
    try {
      localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
    } catch (e) {
      console.error('Не удалось сохранить sync_queue:', e);
    }
  }

  function getEndpoint() {
    try {
      return localStorage.getItem(URL_STORAGE_KEY) || '';
    } catch (_) {
      return '';
    }
  }

  function setEndpoint(url) {
    try {
      localStorage.setItem(URL_STORAGE_KEY, String(url || '').trim());
    } catch (_) {}
  }

  function getLastSyncTime() {
    try {
      return localStorage.getItem(LAST_SYNC_KEY) || null;
    } catch (_) {
      return null;
    }
  }

  function _setLastSyncTime(timestamp) {
    try {
      localStorage.setItem(LAST_SYNC_KEY, timestamp || new Date().toISOString());
    } catch (_) {}
  }

  function getQueueLength() {
    return getSyncQueue().length;
  }

  function isOnline() {
    if (typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean') {
      return navigator.onLine;
    }
    return false;
  }

  /**
   * Enqueues a student progress or violation event into sync_queue.
   */
  function enqueueProgress(studentId, moduleName, data, summary = null) {
    if (!studentId) return;

    const queue = getSyncQueue();
    const event = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      timestamp: new Date().toISOString(),
      studentId,
      module: moduleName,
      data: data || {},
      summary: summary || {}
    };

    queue.push(event);
    _saveSyncQueue(queue);

    // If online and URL configured, attempt immediate non-blocking sync
    if (isOnline() && getEndpoint()) {
      setTimeout(() => {
        processQueue(false).catch(() => {});
      }, 500);
    }

    return event;
  }

  /**
   * Processes the sync queue by sending accumulated events and progress snapshot to the server.
   * Keeps queue completely intact on failure.
   * @param {boolean} [manual=false]
   */
  async function processQueue(manual = false) {
    if (_isSyncing) {
      return { success: false, reason: 'already_syncing' };
    }

    const endpoint = getEndpoint();
    if (!endpoint) {
      return { success: false, reason: 'no_endpoint', queueLength: getQueueLength() };
    }

    if (!isOnline()) {
      return { success: false, reason: 'offline', queueLength: getQueueLength() };
    }

    const queue = getSyncQueue();
    if (queue.length === 0 && !manual) {
      return { success: true, count: 0, reason: 'queue_empty' };
    }

    _isSyncing = true;
    let controller = null;
    let timeoutId = null;

    try {
      if (typeof AbortController !== 'undefined') {
        controller = new AbortController();
        timeoutId = setTimeout(() => {
          try { controller.abort(); } catch (_) {}
        }, HTTP_TIMEOUT_MS);
      }

      let allProgress = {};
      try {
        allProgress = JSON.parse(localStorage.getItem('trainer_progress') || '{}');
      } catch (_) {}

      const payload = {
        app: 'computer-trainer',
        version: '1.1.0',
        timestamp: new Date().toISOString(),
        eventsCount: queue.length,
        events: queue,
        allProgress
      };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller ? controller.signal : undefined
      });

      if (timeoutId) clearTimeout(timeoutId);

      if (res.ok || res.status === 200 || res.status === 201 || res.status === 204) {
        // Successful sync: clear sent events from queue
        _saveSyncQueue([]);
        const syncTimestamp = new Date().toISOString();
        _setLastSyncTime(syncTimestamp);
        _isSyncing = false;
        return { success: true, sentCount: queue.length, timestamp: syncTimestamp };
      } else {
        throw new Error(`HTTP ${res.status}`);
      }
    } catch (err) {
      if (timeoutId) clearTimeout(timeoutId);
      _isSyncing = false;
      // Retain all events in queue on failure
      return { success: false, error: err.message || 'Sync failed', queueLength: queue.length };
    }
  }

  function _startRetryLoop() {
    if (_retryTimer) clearInterval(_retryTimer);
    _retryTimer = setInterval(() => {
      if (isOnline() && getEndpoint() && getQueueLength() > 0) {
        processQueue(false).catch(() => {});
      }
    }, RETRY_INTERVAL_MS);
  }

  function _bindEvents() {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', () => {
      if (getEndpoint() && getQueueLength() > 0) {
        processQueue(false).catch(() => {});
      }
    });
  }

  // ─── MULTI-PC JSON BACKUP BUNDLE EXPORT & IMPORT ─────────────────────────

  /**
   * Generates a downloadable JSON backup bundle containing all student progress.
   */
  function exportBundle() {
    let allProgress = {};
    try {
      allProgress = JSON.parse(localStorage.getItem('trainer_progress') || '{}');
    } catch (_) {}

    const studentsWithData = Object.keys(allProgress).filter(k => {
      const p = allProgress[k];
      return p && (
        (p.typing && p.typing.totalSessions > 0) ||
        (p.mouse && p.mouse.totalSessions > 0) ||
        (p.tests && p.tests.totalSessions > 0) ||
        (p.gamification && p.gamification.xp > 0) ||
        (p.focusViolations > 0)
      );
    }).length;

    const bundle = {
      app: 'computer-trainer',
      version: '1.1.0',
      exportDate: new Date().toISOString(),
      totalStudentsWithData: studentsWithData,
      progress: allProgress
    };

    if (typeof document !== 'undefined') {
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(bundle, null, 2));
      const downloadAnchor = document.createElement('a');
      const filename = `computer_trainer_backup_${new Date().toISOString().slice(0, 10)}.json`;
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', filename);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    }

    return bundle;
  }

  /**
   * Non-destructive deep merge algorithm combining existing workstation data with imported JSON.
   */
  function mergeProgress(currentProgress, importedData) {
    const importedProgress = (importedData && importedData.progress) ? importedData.progress : importedData;
    if (!importedProgress || typeof importedProgress !== 'object') {
      throw new Error('Некорректный формат файла данных');
    }

    const merged = { ...currentProgress };
    let addedCount = 0;
    let updatedCount = 0;

    Object.keys(importedProgress).forEach(stId => {
      const imp = importedProgress[stId];
      if (!imp || typeof imp !== 'object') return;

      if (!merged[stId]) {
        merged[stId] = JSON.parse(JSON.stringify(imp));
        addedCount++;
      } else {
        const loc = merged[stId];
        updatedCount++;

        // 1. Merge Typing
        if (imp.typing) {
          if (!loc.typing) loc.typing = { sessions: [], bestSpeed: 0, bestAccuracy: 0, totalSessions: 0 };
          const combinedTyping = [...(loc.typing.sessions || []), ...(imp.typing.sessions || [])];
          const seenT = new Set();
          loc.typing.sessions = combinedTyping.filter(s => {
            const key = `${s.date}_${s.speed || s.cpm}_${s.accuracy}_${s.level}_${s.duration}`;
            if (seenT.has(key)) return false;
            seenT.add(key);
            return true;
          });
          loc.typing.bestSpeed = Math.max(loc.typing.bestSpeed || 0, imp.typing.bestSpeed || 0);
          loc.typing.bestAccuracy = Math.max(loc.typing.bestAccuracy || 0, imp.typing.bestAccuracy || 0);
          loc.typing.totalSessions = loc.typing.sessions.length;
        }

        // 2. Merge Mouse
        if (imp.mouse) {
          if (!loc.mouse) loc.mouse = { sessions: [], completedTasks: {}, totalScore: 0, totalStars: 0, totalSessions: 0 };
          const combinedMouse = [...(loc.mouse.sessions || []), ...(imp.mouse.sessions || [])];
          const seenM = new Set();
          loc.mouse.sessions = combinedMouse.filter(s => {
            const key = `${s.date}_${s.taskId}_${s.score}_${s.stars}_${s.time}`;
            if (seenM.has(key)) return false;
            seenM.add(key);
            return true;
          });
          loc.mouse.totalSessions = loc.mouse.sessions.length;

          loc.mouse.completedTasks = loc.mouse.completedTasks || {};
          if (imp.mouse.completedTasks) {
            Object.keys(imp.mouse.completedTasks).forEach(taskId => {
              const impT = imp.mouse.completedTasks[taskId];
              const locT = loc.mouse.completedTasks[taskId];
              if (!locT) {
                loc.mouse.completedTasks[taskId] = { ...impT };
              } else {
                locT.bestScore = Math.max(locT.bestScore || 0, impT.bestScore || 0);
                locT.bestStars = Math.max(locT.bestStars || 0, impT.bestStars || 0);
                locT.bestTime = Math.min(locT.bestTime || Infinity, impT.bestTime || Infinity);
              }
            });
          }

          let totalStars = 0;
          let totalScore = 0;
          Object.values(loc.mouse.completedTasks).forEach(t => {
            totalStars += (t.bestStars || 0);
            totalScore += (t.bestScore || 0);
          });
          loc.mouse.totalStars = totalStars;
          loc.mouse.totalScore = totalScore;
        }

        // 3. Merge Tests
        if (imp.tests) {
          if (!loc.tests) loc.tests = { sessions: [], totalSessions: 0 };
          const combinedTests = [...(loc.tests.sessions || []), ...(imp.tests.sessions || [])];
          const seenTest = new Set();
          loc.tests.sessions = combinedTests.filter(s => {
            const key = `${s.date}_${s.topic}_${s.score}_${s.total}`;
            if (seenTest.has(key)) return false;
            seenTest.add(key);
            return true;
          });
          loc.tests.totalSessions = loc.tests.sessions.length;
        }

        // 4. Merge Gamification
        if (imp.gamification) {
          if (!loc.gamification) loc.gamification = { xp: 0, level: 1, levelTitle: 'Новичок', achievements: [] };
          loc.gamification.xp = Math.max(loc.gamification.xp || 0, imp.gamification.xp || 0);
          const oldLevel = loc.gamification.level || 1;
          const impLevel = imp.gamification.level || 1;
          loc.gamification.level = Math.max(oldLevel, impLevel);
          if (impLevel >= oldLevel) {
            loc.gamification.levelTitle = imp.gamification.levelTitle;
          }
          const achUnion = new Set([...(loc.gamification.achievements || []), ...(imp.gamification.achievements || [])]);
          loc.gamification.achievements = Array.from(achUnion);
        }

        // 5. Merge Focus Violations
        loc.focusViolations = (loc.focusViolations || 0) + (imp.focusViolations || 0);
        if (imp.violationsLog && Array.isArray(imp.violationsLog)) {
          loc.violationsLog = [...(loc.violationsLog || []), ...imp.violationsLog];
        }
      }
    });

    return { merged, addedCount, updatedCount };
  }

  /**
   * Imports and merges a JSON backup bundle into local progress.
   */
  function importBundle(jsonStringOrObject) {
    let imported = null;
    if (typeof jsonStringOrObject === 'string') {
      imported = JSON.parse(jsonStringOrObject);
    } else {
      imported = jsonStringOrObject;
    }

    let current = {};
    try {
      current = JSON.parse(localStorage.getItem('trainer_progress') || '{}');
    } catch (_) {}

    const result = mergeProgress(current, imported);
    localStorage.setItem('trainer_progress', JSON.stringify(result.merged));

    return result;
  }

  const Telemetry = {
    init,
    getSyncQueue,
    getEndpoint,
    setEndpoint,
    getLastSyncTime,
    getQueueLength,
    isOnline,
    enqueueProgress,
    processQueue,
    exportBundle,
    mergeProgress,
    importBundle
  };

  if (typeof window !== 'undefined') {
    window.Telemetry = Telemetry;
  }
  if (typeof globalThis !== 'undefined') {
    globalThis.Telemetry = Telemetry;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Telemetry;
  }

})();
