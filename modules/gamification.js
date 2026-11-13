/**
 * modules/gamification.js
 * Gamification Engine (Feature F14) for 7th-Grade Computer Trainer SPA.
 * Handles XP calculation, 5 progressive levels, 5 core achievement badges,
 * unlock toast notifications, and leaderboard / user statistics.
 */

'use strict';

(function () {

  const DEFAULT_LEVELS = [
    { level: 1, title: 'Новичок', minXp: 0, maxXp: 99, nextXp: 100 },
    { level: 2, title: 'Пользователь ПК', minXp: 100, maxXp: 299, nextXp: 300 },
    { level: 3, title: 'Опытный практик', minXp: 300, maxXp: 599, nextXp: 600 },
    { level: 4, title: 'Мастер мыши и клавиатуры', minXp: 600, maxXp: 999, nextXp: 1000 },
    { level: 5, title: 'Гуру информатики', minXp: 1000, maxXp: null, nextXp: null }
  ];

  const DEFAULT_BADGES = [
    {
      id: 'first_step',
      title: 'Первый шаг',
      icon: '🚀',
      description: 'Завершить первое любое упражнение (печать, мышь или тест)',
      bonusXp: 50,
      check: (r) => (r.typing?.totalSessions > 0) || (r.mouse?.totalSessions > 0) || (r.tests?.totalSessions > 0)
    },
    {
      id: 'quick_fingers',
      title: 'Быстрые пальцы',
      icon: '⚡',
      description: 'Достичь скорости печати более 100 зн/мин с точностью не менее 90%',
      bonusXp: 50,
      check: (r) => (r.typing?.sessions || []).some(s => (s.speed || s.cpm || 0) > 100 && (s.accuracy || 0) >= 90)
    },
    {
      id: 'mouse_master',
      title: 'Мастер мыши',
      icon: '🖱️',
      description: 'Пройти все 5 заданий тренажера мыши на 3 звезды',
      bonusXp: 50,
      check: (r) => {
        const tasks = Object.values(r.mouse?.completedTasks || {});
        return tasks.length >= 5 && tasks.every(t => (t.bestStars || 0) === 3);
      }
    },
    {
      id: 'theory_expert',
      title: 'Знаток теории',
      icon: '🧠',
      description: 'Сдать тест по теории на 100% правильных ответов',
      bonusXp: 50,
      check: (r) => (r.tests?.sessions || []).some(s => s.score > 0 && s.score === s.total)
    },
    {
      id: 'speed_demon',
      title: 'Гуру практики',
      icon: '🏆',
      description: 'Заработать 500 или более очков опыта (XP)',
      bonusXp: 50,
      check: (r) => (r.gamification?.xp || 0) >= 500
    }
  ];

  const STORAGE_KEY = 'trainer_progress';

  let _levels = DEFAULT_LEVELS;
  let _badges = DEFAULT_BADGES;

  function init() {
    _ensureToastContainer();
  }

  function getLevels() {
    return _levels;
  }

  function getBadges() {
    return _badges;
  }

  /**
   * Calculates XP awarded for completing an activity.
   */
  function calculateActivityXp(module, data) {
    if (!data) return 0;

    if (module === 'typing') {
      const speed = data.speed || data.cpm || 0;
      const accuracy = data.accuracy || 0;
      const base = 15;
      const speedBonus = Math.min(50, Math.round(speed * 0.3));
      const accuracyBonus = accuracy === 100 ? 20 : accuracy >= 95 ? 10 : accuracy >= 90 ? 5 : 0;
      return base + speedBonus + accuracyBonus;
    }

    if (module === 'mouse') {
      const stars = data.stars || 0;
      const score = data.score || 0;
      const base = 15;
      const starsBonus = stars * 10;
      const scoreBonus = Math.min(30, Math.round(score * 0.1));
      return base + starsBonus + scoreBonus;
    }

    if (module === 'tests') {
      const score = data.score || 0;
      const total = data.total || 1;
      const base = 10;
      const ratioBonus = Math.round((score / total) * 50);
      const perfectBonus = (score === total && total > 0) ? 15 : 0;
      return base + ratioBonus + perfectBonus;
    }

    return 10;
  }

  /**
   * Calculates current level, title, progress percent, and remaining XP based on total XP.
   */
  function calculateLevel(xp) {
    const totalXp = Math.max(0, parseInt(xp, 10) || 0);

    for (let i = _levels.length - 1; i >= 0; i--) {
      const lvl = _levels[i];
      if (totalXp >= lvl.minXp) {
        if (!lvl.nextXp) {
          // Max level reached
          return {
            level: lvl.level,
            title: lvl.title,
            minXp: lvl.minXp,
            nextXp: null,
            progressPercent: 100,
            xpRemaining: 0
          };
        }
        const range = lvl.nextXp - lvl.minXp;
        const currentInRange = totalXp - lvl.minXp;
        const pct = Math.min(100, Math.max(0, Math.round((currentInRange / range) * 100)));
        return {
          level: lvl.level,
          title: lvl.title,
          minXp: lvl.minXp,
          nextXp: lvl.nextXp,
          progressPercent: pct,
          xpRemaining: Math.max(0, lvl.nextXp - totalXp)
        };
      }
    }

    // Fallback to level 1
    const lvl1 = _levels[0];
    return {
      level: lvl1.level,
      title: lvl1.title,
      minXp: 0,
      nextXp: lvl1.nextXp,
      progressPercent: 0,
      xpRemaining: lvl1.nextXp
    };
  }

  /**
   * Evaluates student record against achievement conditions.
   * Returns array of newly unlocked badge objects.
   */
  function checkAchievements(record, currentModule, currentData) {
    if (!record) return [];
    record.gamification = record.gamification || { xp: 0, level: 1, levelTitle: 'Новичок', achievements: [] };
    const unlocked = new Set(record.gamification.achievements || []);
    const newlyUnlocked = [];

    _badges.forEach(b => {
      if (!unlocked.has(b.id)) {
        let earned = false;
        if (typeof b.check === 'function' && b.check(record)) {
          earned = true;
        } else if (currentModule && currentData) {
          if (b.id === 'first_step') {
            earned = true;
          } else if (b.id === 'quick_fingers' && currentModule === 'typing') {
            const spd = currentData.speed || currentData.cpm || 0;
            const acc = currentData.accuracy || 0;
            if (spd > 100 && acc >= 90) earned = true;
          } else if (b.id === 'theory_expert' && currentModule === 'tests') {
            if (currentData.score > 0 && currentData.score === currentData.total) earned = true;
          }
        }
        if (earned) {
          newlyUnlocked.push(b);
        }
      }
    });

    return newlyUnlocked;
  }

  /**
   * Retrieves user statistics and gamification profile.
   */
  function getUserStats(userId) {
    let all = {};
    try {
      all = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    } catch (_) {
      all = {};
    }

    const record = all[userId] || null;
    const xp = (record && record.gamification && record.gamification.xp) || 0;
    const lvlInfo = calculateLevel(xp);
    const achievements = (record && record.gamification && record.gamification.achievements) || [];

    const badgesSummary = _badges.map(b => ({
      ...b,
      unlocked: achievements.includes(b.id)
    }));

    return {
      userId,
      xp,
      level: lvlInfo.level,
      levelTitle: lvlInfo.title,
      minXp: lvlInfo.minXp,
      nextXp: lvlInfo.nextXp,
      progressPercent: lvlInfo.progressPercent,
      xpRemaining: lvlInfo.xpRemaining,
      achievements,
      badges: badgesSummary
    };
  }

  /**
   * Manually awards a badge to a student.
   */
  function awardBadge(userId, badgeId) {
    let all = {};
    try {
      all = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    } catch (_) {
      all = {};
    }

    if (!all[userId]) {
      all[userId] = {
        studentId: userId,
        gamification: { xp: 0, level: 1, levelTitle: 'Новичок', achievements: [] }
      };
    }

    const record = all[userId];
    record.gamification = record.gamification || { xp: 0, level: 1, levelTitle: 'Новичок', achievements: [] };
    record.gamification.achievements = record.gamification.achievements || [];

    if (!record.gamification.achievements.includes(badgeId)) {
      record.gamification.achievements.push(badgeId);
      const badge = _badges.find(b => b.id === badgeId) || { id: badgeId, title: badgeId, icon: '🏅', bonusXp: 50 };
      const bonus = badge.bonusXp || 50;
      record.gamification.xp = (record.gamification.xp || 0) + bonus;

      const lvlInfo = calculateLevel(record.gamification.xp);
      record.gamification.level = lvlInfo.level;
      record.gamification.levelTitle = lvlInfo.title;

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
      } catch (_) {}

      showToast(badge);
      return { success: true, badge, newXp: record.gamification.xp, level: lvlInfo.level };
    }

    return { success: false, reason: 'already_awarded' };
  }

  /**
   * Adds XP from an activity session and checks for level transitions and badges.
   * Can accept either an object: addXP({ studentId, module, data })
   * or positional arguments: addXP(studentId, module, data)
   */
  function addXP(arg1, arg2, arg3) {
    let studentId, moduleName, data;
    if (typeof arg1 === 'object' && arg1 !== null && arg1.studentId) {
      studentId = arg1.studentId;
      moduleName = arg1.module;
      data = arg1.data;
    } else {
      studentId = arg1;
      moduleName = arg2;
      data = arg3;
    }

    if (!studentId) return { earnedXp: 0, totalXp: 0, level: 1, levelTitle: 'Новичок', newBadges: [] };

    let all = {};
    try {
      all = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    } catch (_) {
      all = {};
    }

    if (!all[studentId]) {
      all[studentId] = {
        studentId,
        gamification: { xp: 0, level: 1, levelTitle: 'Новичок', achievements: [] }
      };
    }

    const record = all[studentId];
    record.gamification = record.gamification || { xp: 0, level: 1, levelTitle: 'Новичок', achievements: [] };
    record.gamification.achievements = record.gamification.achievements || [];

    const earnedXp = calculateActivityXp(moduleName, data);
    record.gamification.xp = (record.gamification.xp || 0) + earnedXp;

    // Check newly unlocked achievements
    const newBadges = checkAchievements(record, moduleName, data);
    newBadges.forEach(b => {
      record.gamification.achievements.push(b.id);
      record.gamification.xp += (b.bonusXp || 50);
      showToast(b);
    });

    // Recompute level
    const lvlInfo = calculateLevel(record.gamification.xp);
    record.gamification.level = lvlInfo.level;
    record.gamification.levelTitle = lvlInfo.title;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    } catch (e) {
      console.error('Не удалось сохранить gamification XP:', e);
    }

    return {
      earnedXp,
      totalXp: record.gamification.xp,
      level: lvlInfo.level,
      levelTitle: lvlInfo.title,
      progressPercent: lvlInfo.progressPercent,
      newBadges
    };
  }

  // ─── UI TOASTS & AUDIO ───────────────────────────────────────────────────

  function _ensureToastContainer() {
    if (typeof document === 'undefined') return null;
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      container.setAttribute('aria-live', 'polite');
      document.body.appendChild(container);
    }
    return container;
  }

  function showToast(badge) {
    if (!badge || typeof document === 'undefined') return;

    const container = _ensureToastContainer();
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'achievement-toast animate-slide-in';
    toast.innerHTML = `
      <div class="toast-icon">${badge.icon || '🏆'}</div>
      <div class="toast-content">
        <div class="toast-header">
          <span class="toast-tag">Достижение разблокировано!</span>
          <span class="toast-bonus">+${badge.bonusXp || 50} XP</span>
        </div>
        <h4 class="toast-title">${badge.title || 'Новое достижение'}</h4>
        <p class="toast-desc">${badge.description || ''}</p>
      </div>
    `;

    container.appendChild(toast);
    _playFanfare();

    const safeSetTimeout = (typeof window !== 'undefined' && typeof window.setTimeout === 'function')
      ? window.setTimeout
      : setTimeout;

    safeSetTimeout(() => {
      toast.classList.remove('animate-slide-in');
      toast.classList.add('animate-fade-out');
      safeSetTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 500);
    }, 4000);
  }

  function _playFanfare() {
    try {
      // In Node.js testing environment, avoid scheduling dangling oscillator timers
      if (typeof process !== 'undefined' && process.versions && process.versions.node) {
        return;
      }
      if (typeof window !== 'undefined' && window.SoundSystem && typeof window.SoundSystem.playFanfare === 'function') {
        window.SoundSystem.playFanfare();
      }
    } catch (_) {}
  }

  const Gamification = {
    init,
    getLevels,
    getBadges,
    calculateActivityXp,
    calculateLevel,
    checkAchievements,
    getUserStats,
    awardBadge,
    addXP,
    showToast
  };

  if (typeof window !== 'undefined') {
    window.Gamification = Gamification;
  }
  if (typeof globalThis !== 'undefined') {
    globalThis.Gamification = Gamification;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Gamification;
  }

})();
