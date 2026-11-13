/**
 * mouse.js — Интерактивный тренажёр работы с мышью (Milestone 3)
 * Локальный офлайн-тренажёр для 7-х классов
 * Содержит 5 практических упражнений согласно программе информатики:
 * 1. Снайпер клика (Одиночный клик, меткость)
 * 2. Быстрый даблклик (Двойной клик, запуск программ и папок)
 * 3. Контекстное меню (Правая кнопка мыши ПКМ, контекстные действия)
 * 4. Файловый архитектор (Drag-and-Drop, сортировка файлов по типам)
 * 5. Системный навигатор (Наведение, задержка курсора и чтение всплывающих подсказок)
 */

(function () {
  'use strict';

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. ЗВУКОВОЙ ДВИЖОК: Web Audio API (100% Offline Synthesizer, 0 External Assets)
  // ═══════════════════════════════════════════════════════════════════════════

  const SoundSystem = (() => {
    let _ctx = null;
    let _masterGain = null;
    let _isMuted = false;
    let _unlocked = false;

    const STORAGE_KEY = 'trainer_sound_muted';

    function init() {
      try {
        _isMuted = localStorage.getItem(STORAGE_KEY) === 'true';
      } catch (_) {
        _isMuted = false;
      }
      _bindUnlockGestures();
    }

    function _getContext() {
      if (!_ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          try {
            _ctx = new AudioCtx();
            _masterGain = _ctx.createGain();
            const initialVol = _isMuted ? 0 : 0.25;
            if (_masterGain.gain.setValueAtTime) {
              _masterGain.gain.setValueAtTime(initialVol, _ctx.currentTime || 0);
            } else {
              _masterGain.gain.value = initialVol;
            }
            if (_ctx.destination) {
              _masterGain.connect(_ctx.destination);
            }
          } catch (_) {
            _ctx = null;
          }
        }
      }
      if (_ctx && _ctx.state === 'suspended' && typeof _ctx.resume === 'function') {
        _ctx.resume().catch(() => {});
      }
      return _ctx;
    }

    function _bindUnlockGestures() {
      if (_unlocked) return;
      const unlock = () => {
        _unlocked = true;
        _getContext();
        window.removeEventListener('pointerdown', unlock);
        window.removeEventListener('mousedown', unlock);
        window.removeEventListener('keydown', unlock);
      };
      window.addEventListener('pointerdown', unlock, { passive: true, once: true });
      window.addEventListener('mousedown', unlock, { passive: true, once: true });
      window.addEventListener('keydown', unlock, { passive: true, once: true });
    }

    function isMuted() {
      return _isMuted;
    }

    function setMuted(muted) {
      _isMuted = Boolean(muted);
      try {
        localStorage.setItem(STORAGE_KEY, _isMuted ? 'true' : 'false');
      } catch (_) {}

      if (_masterGain && _ctx) {
        try {
          const t = _ctx.currentTime || 0;
          if (_masterGain.gain.cancelScheduledValues) {
            _masterGain.gain.cancelScheduledValues(t);
            _masterGain.gain.setValueAtTime(_isMuted ? 0 : 0.25, t);
          } else {
            _masterGain.gain.value = _isMuted ? 0 : 0.25;
          }
        } catch (_) {}
      }
      return _isMuted;
    }

    function toggleMute() {
      return setMuted(!_isMuted);
    }

    function _playTone(freq, type, duration, vol, endFreq) {
      if (_isMuted) return;
      const ctx = _getContext();
      if (!ctx || !_masterGain) return;
      try {
        const t = ctx.currentTime || 0;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = type || 'sine';
        if (osc.frequency.setValueAtTime) {
          osc.frequency.setValueAtTime(freq, t);
          if (endFreq && osc.frequency.exponentialRampToValueAtTime) {
            osc.frequency.exponentialRampToValueAtTime(Math.max(1, endFreq), t + duration);
          }
        } else {
          osc.frequency.value = freq;
        }

        if (gain.gain.setValueAtTime) {
          gain.gain.setValueAtTime(vol || 0.2, t);
          if (gain.gain.exponentialRampToValueAtTime) {
            gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
          }
        } else {
          gain.gain.value = vol || 0.2;
        }

        osc.connect(gain);
        gain.connect(_masterGain);

        osc.start(t);
        osc.stop(t + duration + 0.02);
      } catch (_) {}
    }

    function playTick() {
      _playTone(800, 'triangle', 0.025, 0.15, 280);
    }

    function playTargetHit() {
      _playTone(987.77, 'sine', 0.12, 0.22);
      setTimeout(() => _playTone(1975.53, 'sine', 0.07, 0.09), 30);
    }

    function playDoubleClick() {
      _playTone(659.25, 'triangle', 0.05, 0.18);
      setTimeout(() => _playTone(880.00, 'triangle', 0.08, 0.22), 60);
    }

    function playSuccess() {
      const notes = [
        { freq: 1046.50, delay: 0, dur: 0.12, vol: 0.18 },
        { freq: 1318.51, delay: 70, dur: 0.14, vol: 0.20 },
        { freq: 1567.98, delay: 140, dur: 0.25, vol: 0.22 }
      ];
      notes.forEach(n => {
        setTimeout(() => _playTone(n.freq, 'sine', n.dur, n.vol), n.delay);
      });
    }

    function playError() {
      if (_isMuted) return;
      const ctx = _getContext();
      if (!ctx || !_masterGain) return;
      try {
        const t = ctx.currentTime || 0;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        if (osc.frequency.setValueAtTime) {
          osc.frequency.setValueAtTime(180, t);
          if (osc.frequency.exponentialRampToValueAtTime) {
            osc.frequency.exponentialRampToValueAtTime(75, t + 0.18);
          }
        }
        if (gain.gain.setValueAtTime) {
          gain.gain.setValueAtTime(0.20, t);
          if (gain.gain.exponentialRampToValueAtTime) {
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
          }
        }
        osc.connect(gain);
        gain.connect(_masterGain);
        osc.start(t);
        osc.stop(t + 0.20);
      } catch (_) {}
    }

    function playDragGrab() {
      _playTone(350, 'sine', 0.04, 0.14, 560);
    }

    function playHoverTick() {
      _playTone(1200, 'sine', 0.02, 0.07);
    }

    function playFanfare() {
      const notes = [
        { freq: 523.25, delay: 0, dur: 0.12, vol: 0.20 },
        { freq: 659.25, delay: 100, dur: 0.12, vol: 0.20 },
        { freq: 783.99, delay: 200, dur: 0.14, vol: 0.22 },
        { freq: 1046.50, delay: 320, dur: 0.45, vol: 0.25 },
        { freq: 1318.51, delay: 320, dur: 0.50, vol: 0.18 }
      ];
      notes.forEach(n => {
        setTimeout(() => _playTone(n.freq, 'sine', n.dur, n.vol), n.delay);
      });
    }

    return {
      init,
      getContext: _getContext,
      isMuted,
      setMuted,
      toggleMute,
      playTick,
      playTargetHit,
      playDoubleClick,
      playSuccess,
      playError,
      playDragGrab,
      playHoverTick,
      playFanfare
    };
  })();

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. РЕЕСТР УПРАЖНЕНИЙ (Curriculum Registry — Lessons 7-2-4 & 7-2-3)
  // ═══════════════════════════════════════════════════════════════════════════

  const EXERCISES = [
    {
      id: 1,
      key: 'click',
      taskId: 'ex1_click',
      title: 'Снайпер клика',
      badge: 'Упражнение 1',
      icon: '🎯',
      desc: 'Отработка меткости и одиночного клика левой кнопкой мыши по появляющимся мишеням.',
      prompt: 'Поразите 15 мишеней с максимальной точностью. Клик в центр мишени даёт +100 очков!',
      totalGoals: 15
    },
    {
      id: 2,
      key: 'dblclick',
      taskId: 'ex2_dblclick',
      title: 'Быстрый даблклик',
      badge: 'Упражнение 2',
      icon: '⚡',
      desc: 'Отработка ритма двойного клика для запуска программ и папок на рабочем столе.',
      prompt: 'Выполните быстрый двойной клик (интервал < 450мс) по указанному значку.',
      totalGoals: 5
    },
    {
      id: 3,
      key: 'context',
      taskId: 'ex3_context',
      title: 'Контекстное меню',
      badge: 'Упражнение 3',
      icon: '🖱️',
      desc: 'Использование правой кнопки мыши (ПКМ) и выполнение файловых операций.',
      prompt: 'Кликните правой кнопкой мыши (ПКМ) и выберите нужное действие в меню.',
      totalGoals: 5
    },
    {
      id: 4,
      key: 'dragdrop',
      taskId: 'ex4_dragdrop',
      title: 'Файловый архитектор',
      badge: 'Упражнение 4',
      icon: '📁',
      desc: 'Перетаскивание объектов (Drag-and-Drop) и сортировка файлов по расширениям.',
      prompt: 'Перетащите 12 файлов в правильные каталоги согласно их расширениям.',
      totalGoals: 12
    },
    {
      id: 5,
      key: 'hover',
      taskId: 'ex5_hover',
      title: 'Системный навигатор',
      badge: 'Упражнение 5',
      icon: '🔍',
      desc: 'Наведение курсора, удержание и чтение всплывающих подсказок элементов интерфейса.',
      prompt: 'Наведите курсор на нужный значок и задержите его на 0.5с для чтения подсказки.',
      totalGoals: 5
    }
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. ВНУТРЕННЕЕ СОСТОЯНИЕ МОДУЛЯ
  // ═══════════════════════════════════════════════════════════════════════════

  let _container = null;
  let _currentExercise = EXERCISES[0];
  let _activeExerciseId = 1;
  let _isSessionActive = false;

  let _score = 0;
  let _hits = 0;
  let _misses = 0;
  let _progressCount = 0;
  let _streak = 0;
  let _startTime = null;
  let _timerInterval = null;

  // Таймеры и хэндлеры текущего упражнения
  let _activeTimers = [];
  let _globalListeners = [];
  let _activeDragCleanup = null;

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ УПРАВЛЕНИЯ ТАЙМЕРАМИ И СОБЫТИЯМИ
  // ═══════════════════════════════════════════════════════════════════════════

  function safeSetTimeout(fn, delay) {
    const timerId = setTimeout(() => {
      _activeTimers = _activeTimers.filter(id => id !== timerId);
      fn();
    }, delay);
    _activeTimers.push(timerId);
    return timerId;
  }

  function clearAllExerciseTimers() {
    _activeTimers.forEach(id => clearTimeout(id));
    _activeTimers = [];
    if (_timerInterval) {
      clearInterval(_timerInterval);
      _timerInterval = null;
    }
  }

  function addTrackedEventListener(target, event, handler, options) {
    if (!target) return;
    target.addEventListener(event, handler, options);
    _globalListeners.push({ target, event, handler, options });
  }

  function removeAllTrackedListeners() {
    _globalListeners.forEach(({ target, event, handler, options }) => {
      try {
        target.removeEventListener(event, handler, options);
      } catch (_) {}
    });
    _globalListeners = [];
  }

  function _handleMuteToggle() {
    const isMuted = SoundSystem.toggleMute();
    const muteIcon = document.getElementById('mouse-mute-icon');
    if (muteIcon) {
      muteIcon.textContent = isMuted ? '🔇' : '🔊';
    }
  }

  function cancelActiveDrag() {
    if (typeof _activeDragCleanup === 'function') {
      try {
        _activeDragCleanup();
      } catch (_) {}
      _activeDragCleanup = null;
    }
    const floatingAvatars = document.querySelectorAll('.dragged-file-avatar');
    floatingAvatars.forEach(avatar => {
      if (avatar.parentNode) avatar.parentNode.removeChild(avatar);
    });
    const draggingItems = document.querySelectorAll('.file-draggable.is-dragging');
    draggingItems.forEach(item => item.classList.remove('is-dragging'));
  }

  function formatTime(seconds) {
    const s = Math.max(0, Math.floor(seconds));
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `${m}:${rem < 10 ? '0' : ''}${rem}`;
  }

  function updateHUD() {
    const scoreEl = document.getElementById('mouse-stat-score');
    const timeEl = document.getElementById('mouse-stat-time');
    const accEl = document.getElementById('mouse-stat-accuracy');
    const errEl = document.getElementById('mouse-stat-errors');
    const progTextEl = document.getElementById('mouse-stat-progress-text');
    const progFillEl = document.getElementById('mouse-stat-progress-fill');

    if (scoreEl) scoreEl.textContent = _score;
    if (errEl) errEl.textContent = _misses;

    const totalActions = _hits + _misses;
    const accuracy = totalActions > 0 ? Math.round((_hits / totalActions) * 100) : 100;
    if (accEl) accEl.textContent = `${accuracy}%`;

    const totalGoals = _currentExercise.totalGoals || 10;
    if (progTextEl) progTextEl.textContent = `${_progressCount} / ${totalGoals}`;
    if (progFillEl) {
      const pct = Math.min(100, Math.round((_progressCount / totalGoals) * 100));
      progFillEl.style.width = `${pct}%`;
    }

    if (timeEl && _startTime) {
      const elapsed = Math.floor((Date.now() - _startTime) / 1000);
      timeEl.textContent = formatTime(elapsed);
    }
  }

  function triggerRipple(arena, x, y, isSuccess) {
    if (!arena) return;
    const ripple = document.createElement('div');
    ripple.className = `mouse-ripple ${isSuccess ? 'ripple-success' : 'ripple-miss'}`;
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    arena.appendChild(ripple);
    safeSetTimeout(() => {
      if (ripple.parentNode) ripple.parentNode.removeChild(ripple);
    }, 450);
  }

  function showMissMarker(arena, x, y, text) {
    if (!arena) return;
    const marker = document.createElement('div');
    marker.className = 'miss-penalty-marker';
    marker.textContent = text || '-15';
    marker.style.left = `${x}px`;
    marker.style.top = `${y}px`;
    arena.appendChild(marker);
    safeSetTimeout(() => {
      if (marker.parentNode) marker.parentNode.removeChild(marker);
    }, 600);
  }

  function showCoachingToast(message) {
    const promptEl = document.getElementById('mouse-task-prompt');
    if (!promptEl) return;
    const originalText = promptEl.dataset.originalText || promptEl.textContent;
    promptEl.dataset.originalText = originalText;
    promptEl.innerHTML = `<span style="color:var(--color-error);font-weight:700;">⚠️ ${message}</span>`;
    safeSetTimeout(() => {
      if (promptEl) promptEl.textContent = originalText;
    }, 3000);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. РЕНДЕР КАРКАСА UI ТРЕНАЖЁРА
  // ═══════════════════════════════════════════════════════════════════════════

  function renderUI(containerId) {
    _container = document.getElementById(containerId);
    if (!_container) return;

    SoundSystem.init();

    _container.innerHTML = `
      <div class="mouse-trainer">
        <!-- 1. Селектор упражнений -->
        <div class="mouse-exercise-selector" role="tablist" aria-label="Выбор упражнения тренажёра мыши">
          ${EXERCISES.map(ex => `
            <button class="btn-exercise ${ex.id === _activeExerciseId ? 'active' : ''}"
                    data-exercise="${ex.id}" role="tab" aria-selected="${ex.id === _activeExerciseId}">
              <span class="ex-num">${ex.id}</span>
              <span class="ex-name">${ex.title}</span>
            </button>
          `).join('')}
        </div>

        <!-- 2. Информационная карточка задания -->
        <div class="mouse-instruction-card">
          <div class="instruction-main">
            <span class="instruction-badge" id="mouse-ex-badge">${_currentExercise.badge}</span>
            <h3 class="instruction-title" id="mouse-ex-title">${_currentExercise.title}</h3>
            <p class="instruction-desc" id="mouse-ex-desc">${_currentExercise.desc}</p>
          </div>
          <div class="instruction-task" id="mouse-task-prompt">
            🎯 ${_currentExercise.prompt}
          </div>
        </div>

        <!-- 3. Панель показателей в реальном времени (HUD) -->
        <div class="mouse-stats-bar">
          <div class="m-stat-item">
            <span class="m-stat-icon">🏆</span>
            <span class="m-stat-label">Очки:</span>
            <strong class="m-stat-val" id="mouse-stat-score">0</strong>
          </div>
          <div class="m-stat-item">
            <span class="m-stat-icon">⏱️</span>
            <span class="m-stat-label">Время:</span>
            <strong class="m-stat-val" id="mouse-stat-time">0:00</strong>
          </div>
          <div class="m-stat-item">
            <span class="m-stat-icon">🎯</span>
            <span class="m-stat-label">Точность:</span>
            <strong class="m-stat-val" id="mouse-stat-accuracy">100%</strong>
          </div>
          <div class="m-stat-item">
            <span class="m-stat-icon">⚠️</span>
            <span class="m-stat-label">Ошибки:</span>
            <strong class="m-stat-val m-stat-errors" id="mouse-stat-errors">0</strong>
          </div>
          <div class="m-stat-item m-stat-progress-wrap">
            <span class="m-stat-icon">📊</span>
            <span class="m-stat-label">Прогресс:</span>
            <span id="mouse-stat-progress-text" class="m-stat-progress-text">0 / ${_currentExercise.totalGoals}</span>
            <div class="m-progress-bar">
              <div class="m-progress-fill" id="mouse-stat-progress-fill" style="width: 0%"></div>
            </div>
          </div>
        </div>

        <!-- 4. Интерактивная игровая арена -->
        <div class="mouse-arena" id="mouse-arena" tabindex="0" role="region" aria-label="Игровое поле тренажёра мыши">
          <!-- Наполняется модулями упражнений -->
        </div>

        <!-- 5. Карточка результата выполнения упражнения -->
        <div class="result-card mouse-result-card" id="mouse-result-card" style="display: none;">
          <h2 class="result-title">🎉 Упражнение успешно завершено!</h2>
          <div class="mouse-result-stars" id="mouse-result-stars">⭐⭐⭐</div>
          <div class="result-stats">
            <div class="result-stat">
              <span class="result-stat-label">Набранные очки</span>
              <span class="result-stat-value" id="mouse-res-score">0</span>
              <span class="result-stat-unit">баллов</span>
            </div>
            <div class="result-stat">
              <span class="result-stat-label">Точность кликов</span>
              <span class="result-stat-value" id="mouse-res-accuracy">100</span>
              <span class="result-stat-unit">%</span>
            </div>
            <div class="result-stat">
              <span class="result-stat-label">Время выполнения</span>
              <span class="result-stat-value" id="mouse-res-time">0</span>
              <span class="result-stat-unit">сек</span>
            </div>
            <div class="result-stat">
              <span class="result-stat-label">Ошибки</span>
              <span class="result-stat-value" id="mouse-res-errors">0</span>
              <span class="result-stat-unit">шт</span>
            </div>
          </div>
          <div class="result-actions">
            <button class="btn btn-secondary" id="mouse-btn-retry">🔄 Повторить</button>
            <button class="btn btn-primary" id="mouse-btn-next">➡️ Следующее упражнение</button>
            <button class="btn btn-outline" id="mouse-btn-menu">🏠 В меню</button>
          </div>
        </div>
      </div>
    `;

    hideResultCard();
    _bindHeaderControls();
    _bindTabControls();
    _bindResultButtons();
    startExercise(_activeExerciseId);
  }

  function _bindHeaderControls() {
    const muteBtn = document.getElementById('mouse-mute-btn');
    const muteIcon = document.getElementById('mouse-mute-icon');
    if (muteBtn && muteIcon) {
      muteIcon.textContent = SoundSystem.isMuted() ? '🔇' : '🔊';
      if (!muteBtn.dataset.bound) {
        muteBtn.dataset.bound = 'true';
        muteBtn.addEventListener('click', _handleMuteToggle);
      }
    }
  }

  function _bindTabControls() {
    const tabs = _container.querySelectorAll('.btn-exercise');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const id = parseInt(tab.getAttribute('data-exercise'), 10);
        selectExercise(id);
      });
    });
  }

  function _bindResultButtons() {
    const retryBtn = document.getElementById('mouse-btn-retry');
    const nextBtn = document.getElementById('mouse-btn-next');
    const menuBtn = document.getElementById('mouse-btn-menu');

    if (retryBtn) {
      retryBtn.addEventListener('click', () => {
        hideResultCard();
        startExercise(_activeExerciseId);
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        hideResultCard();
        const nextId = _activeExerciseId >= 5 ? 1 : _activeExerciseId + 1;
        selectExercise(nextId);
      });
    }
    if (menuBtn) {
      menuBtn.addEventListener('click', () => {
        hideResultCard();
        destroy();
        if (typeof App !== 'undefined' && typeof App.showScreen === 'function') {
          App.showScreen('screen-menu');
        }
      });
    }
  }

  function hideResultCard() {
    const card = document.getElementById('mouse-result-card');
    if (card) card.style.display = 'none';
  }

  function selectExercise(exerciseId) {
    const id = parseInt(exerciseId, 10) || 1;
    const found = EXERCISES.find(e => e.id === id) || EXERCISES[0];
    _currentExercise = found;
    _activeExerciseId = found.id;

    // Обновляем состояние вкладок
    if (_container) {
      const tabs = _container.querySelectorAll('.btn-exercise');
      tabs.forEach(tab => {
        const tabId = parseInt(tab.getAttribute('data-exercise'), 10);
        const isActive = tabId === _activeExerciseId;
        tab.classList.toggle('active', isActive);
        tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
      });
    }

    // Обновляем описание
    const badgeEl = document.getElementById('mouse-ex-badge');
    const titleEl = document.getElementById('mouse-ex-title');
    const descEl = document.getElementById('mouse-ex-desc');
    const promptEl = document.getElementById('mouse-task-prompt');

    if (badgeEl) badgeEl.textContent = _currentExercise.badge;
    if (titleEl) titleEl.textContent = _currentExercise.title;
    if (descEl) descEl.textContent = _currentExercise.desc;
    if (promptEl) {
      promptEl.textContent = `🎯 ${_currentExercise.prompt}`;
      promptEl.dataset.originalText = promptEl.textContent;
    }

    hideResultCard();
    startExercise(_activeExerciseId);
  }

  function startExercise(exerciseId) {
    clearAllExerciseTimers();
    cancelActiveDrag();
    removeAllTrackedListeners();

    _score = 0;
    _hits = 0;
    _misses = 0;
    _progressCount = 0;
    _streak = 0;
    _isSessionActive = true;
    _startTime = Date.now();

    updateHUD();

    _timerInterval = setInterval(() => {
      if (_isSessionActive) updateHUD();
    }, 1000);

    const arena = document.getElementById('mouse-arena');
    if (!arena) return;
    arena.innerHTML = '';

    switch (_activeExerciseId) {
      case 1:
        initExercise1_Sniper(arena);
        break;
      case 2:
        initExercise2_DoubleClick(arena);
        break;
      case 3:
        initExercise3_ContextMenu(arena);
        break;
      case 4:
        initExercise4_DragDrop(arena);
        break;
      case 5:
        initExercise5_Hover(arena);
        break;
      default:
        initExercise1_Sniper(arena);
        break;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. УПРАЖНЕНИЕ 1: СНАЙПЕР КЛИКА (Single Click Precision)
  // ═══════════════════════════════════════════════════════════════════════════

  function initExercise1_Sniper(arena) {
    let currentTargetIndex = 0;
    const totalTargets = 15;
    let targetTimer = null;
    let activeTarget = null;

    function handleArenaMissClick(e) {
      if (!_isSessionActive) return;
      if (e.target.closest('.mouse-target')) return; // клик был по мишени

      _misses++;
      _streak = 0;
      _score = Math.max(0, _score - 15);
      SoundSystem.playError();

      const rect = arena.getBoundingClientRect();
      const x = (e.clientX && rect.left) ? (e.clientX - rect.left) : (arena.clientWidth / 2);
      const y = (e.clientY && rect.top) ? (e.clientY - rect.top) : (arena.clientHeight / 2);

      triggerRipple(arena, x, y, false);
      showMissMarker(arena, x, y, '-15');
      updateHUD();
    }

    addTrackedEventListener(arena, 'click', handleArenaMissClick);

    function spawnNextTarget() {
      if (!_isSessionActive) return;
      if (targetTimer) {
        clearTimeout(targetTimer);
        targetTimer = null;
      }
      if (activeTarget && activeTarget.parentNode) {
        activeTarget.parentNode.removeChild(activeTarget);
        activeTarget = null;
      }

      if (currentTargetIndex >= totalTargets) {
        finishSession();
        return;
      }

      currentTargetIndex++;
      _progressCount = currentTargetIndex;
      updateHUD();

      // Масштабирование размера мишени по мере прохождения:
      // 1-5: 60px, 6-10: 46px, 11-15: 34px
      let size = 60;
      let duration = 2500;
      if (currentTargetIndex > 10) {
        size = 34;
        duration = 1600;
      } else if (currentTargetIndex > 5) {
        size = 46;
        duration = 2000;
      }

      const areaW = arena.clientWidth || 700;
      const areaH = arena.clientHeight || 400;
      const pad = 24;
      const maxX = Math.max(pad, areaW - size - pad);
      const maxY = Math.max(pad, areaH - size - pad);

      const x = Math.round(pad + Math.random() * (maxX - pad));
      const y = Math.round(pad + Math.random() * (maxY - pad));

      const target = document.createElement('div');
      target.className = 'mouse-target';
      target.style.width = `${size}px`;
      target.style.height = `${size}px`;
      target.style.left = `${x}px`;
      target.style.top = `${y}px`;
      target.style.background = 'radial-gradient(circle, #ef4444 0%, #ef4444 38%, #ffffff 39%, #ffffff 68%, #3b82f6 69%, #3b82f6 100%)';

      target.innerHTML = `
        <div class="target-center-bullseye" style="width:40%;height:40%;border-radius:50%;background:#ffffff;opacity:0.3;pointer-events:none;"></div>
      `;

      let isTargetHit = false;

      target.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!_isSessionActive || isTargetHit || target.dataset.hit) return;
        isTargetHit = true;
        target.dataset.hit = 'true';
        target.style.pointerEvents = 'none';

        if (targetTimer) {
          clearTimeout(targetTimer);
          targetTimer = null;
        }

        const rect = target.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const dist = Math.hypot(e.clientX - centerX, e.clientY - centerY);
        const radius = rect.width / 2;

        let points = 50;
        let isBullseye = false;

        // Если клик попал в 40% радиуса (яблочко)
        if (dist <= radius * 0.4 || isNaN(dist)) {
          points = 100;
          isBullseye = true;
          _streak++;
          SoundSystem.playTargetHit();
        } else {
          points = 50;
          _streak++;
          SoundSystem.playTick();
        }

        _hits++;
        _score += points;
        target.classList.add('target-hit');

        const arenaRect = arena.getBoundingClientRect();
        const clickX = e.clientX ? (e.clientX - arenaRect.left) : (x + size / 2);
        const clickY = e.clientY ? (e.clientY - arenaRect.top) : (y + size / 2);

        triggerRipple(arena, clickX, clickY, true);
        updateHUD();

        if (target.parentNode) target.parentNode.removeChild(target);
        spawnNextTarget();
      });

      arena.appendChild(target);
      activeTarget = target;

      // Таймер на исчезновение мишени
      targetTimer = safeSetTimeout(() => {
        if (!_isSessionActive || isTargetHit) return;
        _misses++;
        _streak = 0;
        SoundSystem.playError();
        if (target.parentNode) target.parentNode.removeChild(target);
        updateHUD();
        spawnNextTarget();
      }, duration);
    }

    spawnNextTarget();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 7. УПРАЖНЕНИЕ 2: БЫСТРЫЙ ДАБЛКЛИК (Double Click & Coaching)
  // ═══════════════════════════════════════════════════════════════════════════

  function initExercise2_DoubleClick(arena) {
    const DESKTOP_ICONS = [
      { id: 'app_comp', name: 'Мой компьютер', icon: '💻', desc: 'Диски и устройства' },
      { id: 'app_folder', name: 'Проекты 7-А', icon: '📁', desc: 'Учебные материалы' },
      { id: 'app_book', name: 'Учебник.pdf', icon: '📄', desc: 'Информатика 7 класс' },
      { id: 'app_paint', name: 'Paint', icon: '🎨', desc: 'Графический редактор' },
      { id: 'app_notes', name: 'Блокнот', icon: '📝', desc: 'Текстовый редактор' },
      { id: 'app_web', name: 'Браузер', icon: '🌐', desc: 'Сеть Интернет' },
      { id: 'app_calc', name: 'Калькулятор', icon: '🧮', desc: 'Вычисления' },
      { id: 'app_trash', name: 'Корзина', icon: '🗑️', desc: 'Удалённые файлы' }
    ];

    const QUESTS = [
      { targetId: 'app_paint', title: 'Графический редактор Paint' },
      { targetId: 'app_folder', title: 'Папка "Проекты 7-А"' },
      { targetId: 'app_calc', title: 'Калькулятор' },
      { targetId: 'app_book', title: 'Учебник.pdf' },
      { targetId: 'app_comp', title: 'Мой компьютер' }
    ];

    let currentQuestIdx = 0;
    let lastClickTarget = null;
    let lastClickTime = 0;
    let lastClickX = 0;
    let lastClickY = 0;
    let isTransitioning = false;

    function renderQuestPrompt() {
      const q = QUESTS[currentQuestIdx];
      const promptEl = document.getElementById('mouse-task-prompt');
      if (promptEl && q) {
        promptEl.innerHTML = `⚡ <strong>Задание ${currentQuestIdx + 1}/5:</strong> Запустите двойным кликом: <strong>${q.title}</strong>`;
        promptEl.dataset.originalText = promptEl.innerHTML;
      }
    }

    renderQuestPrompt();

    const grid = document.createElement('div');
    grid.className = 'desktop-grid';

    DESKTOP_ICONS.forEach(item => {
      const iconEl = document.createElement('div');
      iconEl.className = 'desktop-icon';
      iconEl.dataset.appId = item.id;
      iconEl.innerHTML = `
        <span class="desktop-icon-img">${item.icon}</span>
        <span class="desktop-icon-name">${item.name}</span>
      `;

      iconEl.addEventListener('click', (e) => {
        if (!_isSessionActive || isTransitioning) return;
        const now = Date.now();
        const dt = now - lastClickTime;
        const clientX = e.clientX || 0;
        const clientY = e.clientY || 0;
        const drift = Math.hypot(clientX - lastClickX, clientY - lastClickY);

        grid.querySelectorAll('.desktop-icon').forEach(i => i.classList.remove('selected'));
        iconEl.classList.add('selected');

        if (lastClickTarget === iconEl && dt <= 450 && drift <= 8) {
          // УСПЕШНЫЙ ДАБЛКЛИК
          lastClickTarget = null;
          handleSuccessfulDoubleClick(item);
        } else if (lastClickTarget === iconEl && dt > 450 && dt <= 1100) {
          // СЛИШКОМ МЕДЛЕННО
          _misses++;
          SoundSystem.playError();
          iconEl.classList.add('animate-shake');
          safeSetTimeout(() => iconEl.classList.remove('animate-shake'), 400);
          showCoachingToast(`Слишком медленно (${Math.round(dt)} мс). Даблклик выполняется двумя быстрыми нажатиями подряд!`);
          updateHUD();
          lastClickTarget = iconEl;
          lastClickTime = now;
          lastClickX = clientX;
          lastClickY = clientY;
        } else if (lastClickTarget === iconEl && dt <= 450 && drift > 8) {
          // СДВИГ МЫШИ ВО ВРЕМЯ КЛИКА
          _misses++;
          SoundSystem.playError();
          iconEl.classList.add('animate-shake');
          safeSetTimeout(() => iconEl.classList.remove('animate-shake'), 400);
          showCoachingToast('Мышь сдвинулась во время щелчка! Зафиксируйте руку на месте при даблклике.');
          updateHUD();
          lastClickTarget = iconEl;
          lastClickTime = now;
          lastClickX = clientX;
          lastClickY = clientY;
        } else {
          // ОДИНОЧНЫЙ КЛИК
          SoundSystem.playTick();
          lastClickTarget = iconEl;
          lastClickTime = now;
          lastClickX = clientX;
          lastClickY = clientY;
        }
      });

      // Также поддерживаем нативный dblclick для надёжности тестов
      iconEl.addEventListener('dblclick', () => {
        if (!_isSessionActive || isTransitioning) return;
        handleSuccessfulDoubleClick(item);
      });

      grid.appendChild(iconEl);
    });

    arena.appendChild(grid);

    function handleSuccessfulDoubleClick(item) {
      if (!_isSessionActive || isTransitioning) return;
      const q = QUESTS[currentQuestIdx];
      if (!q) return;

      if (item.id === q.targetId) {
        isTransitioning = true;
        _hits++;
        _score += 100;
        _progressCount = currentQuestIdx + 1;
        SoundSystem.playDoubleClick();
        updateHUD();

        launchSimulatedWindow(item);

        safeSetTimeout(() => {
          closeSimulatedWindow();
          isTransitioning = false;
          currentQuestIdx++;
          if (currentQuestIdx >= QUESTS.length) {
            finishSession();
          } else {
            renderQuestPrompt();
          }
        }, 1600);
      } else {
        _misses++;
        SoundSystem.playError();
        showCoachingToast(`Вы открыли "${item.name}", а требовалось запустить "${q.title}"!`);
        updateHUD();
      }
    }

    function launchSimulatedWindow(item) {
      closeSimulatedWindow();
      const win = document.createElement('div');
      win.className = 'simulated-window';
      win.id = 'active-sim-window';
      win.innerHTML = `
        <div class="window-header">
          <span>${item.icon} ${item.name}</span>
          <button class="btn btn-icon" id="sim-win-close" style="background:transparent;border:none;color:#ffffff;font-size:1.1rem;cursor:pointer;">✕</button>
        </div>
        <div class="window-body">
          <p style="font-size:1.1rem;font-weight:700;color:var(--color-accent);margin-bottom:8px;">✅ Программа успешно запущена!</p>
          <p style="color:var(--color-muted);">${item.desc}</p>
        </div>
      `;
      arena.appendChild(win);

      const closeBtn = win.querySelector('#sim-win-close');
      if (closeBtn) {
        closeBtn.addEventListener('click', closeSimulatedWindow);
      }
    }

    function closeSimulatedWindow() {
      const w = document.getElementById('active-sim-window');
      if (w && w.parentNode) {
        w.parentNode.removeChild(w);
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 8. УПРАЖНЕНИЕ 3: КОНТЕКСТНОЕ МЕНЮ (Right Click & File Actions)
  // ═══════════════════════════════════════════════════════════════════════════

  function initExercise3_ContextMenu(arena) {
    const TASKS = [
      {
        targetType: 'file',
        targetName: 'Реферат_История.docx',
        targetIcon: '📄',
        requiredAction: 'rename',
        instruction: 'Кликните ПКМ по файлу "Реферат_История.docx" и выберите "Переименовать"',
        actionLabel: 'Переименовать'
      },
      {
        targetType: 'desktop',
        targetName: 'Рабочий стол',
        targetIcon: '🖥️',
        requiredAction: 'new_folder',
        instruction: 'Кликните ПКМ по свободному месту и выберите "Создать папку"',
        actionLabel: 'Создать папку'
      },
      {
        targetType: 'file',
        targetName: 'virus_trojan.tmp',
        targetIcon: '⚠️',
        requiredAction: 'delete',
        instruction: 'Кликните ПКМ по подозрительному файлу "virus_trojan.tmp" и выберите "Удалить"',
        actionLabel: 'Удалить'
      },
      {
        targetType: 'folder',
        targetName: 'Мои рисунки',
        targetIcon: '📁',
        requiredAction: 'props',
        instruction: 'Кликните ПКМ по папке "Мои рисунки" и выберите "Свойства"',
        actionLabel: 'Свойства'
      },
      {
        targetType: 'file',
        targetName: 'Гимн_Школы.mp3',
        targetIcon: '🎵',
        requiredAction: 'copy',
        instruction: 'Кликните ПКМ по файлу "Гимн_Школы.mp3" и выберите "Копировать"',
        actionLabel: 'Копировать'
      }
    ];

    let currentTaskIdx = 0;
    let activeContextMenu = null;

    function renderTaskPrompt() {
      const t = TASKS[currentTaskIdx];
      const promptEl = document.getElementById('mouse-task-prompt');
      if (promptEl && t) {
        promptEl.innerHTML = `🖱️ <strong>Задание ${currentTaskIdx + 1}/5:</strong> ${t.instruction}`;
        promptEl.dataset.originalText = promptEl.innerHTML;
      }
    }

    renderTaskPrompt();

    // Рабочая область с файлами
    const workspace = document.createElement('div');
    workspace.style.width = '100%';
    workspace.style.height = '100%';
    workspace.style.position = 'relative';
    workspace.style.padding = '24px';
    workspace.dataset.targetType = 'desktop';

    // Создаём объекты на рабочем столе
    const desktopObjects = [
      { id: 'f_doc', type: 'file', name: 'Реферат_История.docx', icon: '📄', x: 40, y: 30 },
      { id: 'f_trojan', type: 'file', name: 'virus_trojan.tmp', icon: '⚠️', x: 220, y: 30 },
      { id: 'f_drawings', type: 'folder', name: 'Мои рисунки', icon: '📁', x: 40, y: 150 },
      { id: 'f_music', type: 'file', name: 'Гимн_Школы.mp3', icon: '🎵', x: 220, y: 150 }
    ];

    desktopObjects.forEach(obj => {
      const el = document.createElement('div');
      el.className = 'desktop-icon context-target';
      el.dataset.targetName = obj.name;
      el.dataset.targetType = obj.type;
      el.style.position = 'absolute';
      el.style.left = `${obj.x}px`;
      el.style.top = `${obj.y}px`;
      el.style.width = '130px';
      el.innerHTML = `
        <span class="desktop-icon-img">${obj.icon}</span>
        <span class="desktop-icon-name">${obj.name}</span>
      `;

      // Одиночный левый клик — напоминание о ПКМ
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        closeContextMenu();
        showCoachingToast('Нажмите ПРАВУЮ кнопку мыши (ПКМ) на этом объекте!');
      });

      // Перехват ПКМ
      el.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        openCustomContextMenu(e.clientX, e.clientY, obj.name, obj.type);
      });

      workspace.appendChild(el);
    });

    // ПКМ по пустому месту рабочего стола / арены
    addTrackedEventListener(arena, 'contextmenu', (e) => {
      e.preventDefault();
      openCustomContextMenu(e.clientX, e.clientY, 'Рабочий стол', 'desktop');
    });

    // Левый клик вне меню закрывает его
    workspace.addEventListener('click', () => {
      closeContextMenu();
    });

    // Клавиша Escape закрывает контекстное меню
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        closeContextMenu();
      }
    };
    addTrackedEventListener(window, 'keydown', handleKeyDown);

    arena.appendChild(workspace);

    function openCustomContextMenu(clientX, clientY, targetName, targetType) {
      closeContextMenu();
      SoundSystem.playTick();

      const menu = document.createElement('div');
      menu.className = 'mouse-context-menu';
      menu.id = 'mouse-active-context-menu';

      let itemsHtml = '';
      if (targetType === 'desktop') {
        itemsHtml = `
          <div class="ctx-item" data-action="view">👁️ Вид</div>
          <div class="ctx-item" data-action="sort">🔀 Сортировка</div>
          <div class="ctx-item" data-action="refresh">🔄 Обновить</div>
          <div class="ctx-divider"></div>
          <div class="ctx-item" data-action="new_folder">📁 Создать папку</div>
          <div class="ctx-item" data-action="display">⚙️ Параметры экрана</div>
        `;
      } else {
        itemsHtml = `
          <div class="ctx-item" data-action="open">📂 Открыть</div>
          <div class="ctx-item" data-action="rename">✏️ Переименовать</div>
          <div class="ctx-item" data-action="copy">📋 Копировать</div>
          <div class="ctx-item" data-action="delete">🗑️ Удалить</div>
          <div class="ctx-divider"></div>
          <div class="ctx-item" data-action="props">ℹ️ Свойства</div>
        `;
      }

      menu.innerHTML = itemsHtml;
      arena.appendChild(menu);
      activeContextMenu = menu;

      // Позиционирование с защитой от вылета за границы арены
      const arenaRect = arena.getBoundingClientRect();
      const menuW = 190;
      const menuH = 180;

      let left = (clientX != null && arenaRect) ? (clientX - (arenaRect.left || 0)) : 60;
      let top = (clientY != null && arenaRect) ? (clientY - (arenaRect.top || 0)) : 60;

      if (left + menuW > arena.clientWidth) left = Math.max(6, arena.clientWidth - menuW - 8);
      if (top + menuH > arena.clientHeight) top = Math.max(6, arena.clientHeight - menuH - 8);

      menu.style.left = `${Math.max(6, left)}px`;
      menu.style.top = `${Math.max(6, top)}px`;

      menu.querySelectorAll('.ctx-item').forEach(item => {
        item.addEventListener('click', (e) => {
          e.stopPropagation();
          const action = item.getAttribute('data-action');
          handleMenuAction(action, targetName);
          closeContextMenu();
        });
      });
    }

    function closeContextMenu() {
      if (activeContextMenu && activeContextMenu.parentNode) {
        activeContextMenu.parentNode.removeChild(activeContextMenu);
      }
      activeContextMenu = null;
    }

    function handleMenuAction(action, targetName) {
      const t = TASKS[currentTaskIdx];
      if (!t) return;

      const isTargetMatch = (t.targetType === 'desktop' && targetName === 'Рабочий стол') ||
                            (t.targetName === targetName);

      if (isTargetMatch && action === t.requiredAction) {
        // Успех!
        _hits++;
        _score += 100;
        _progressCount = currentTaskIdx + 1;
        SoundSystem.playSuccess();
        updateHUD();

        // Визуальное отражение действия (например, удаление трояна)
        if (action === 'delete') {
          const el = arena.querySelector('[data-target-name="virus_trojan.tmp"]');
          if (el) el.style.display = 'none';
        }

        currentTaskIdx++;
        if (currentTaskIdx >= TASKS.length) {
          safeSetTimeout(finishSession, 500);
        } else {
          renderTaskPrompt();
        }
      } else {
        _misses++;
        _score = Math.max(0, _score - 20);
        SoundSystem.playError();
        showCoachingToast(`Неверное действие! Требовалось: "${t.instruction}"`);
        updateHUD();
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 9. УПРАЖНЕНИЕ 4: ФАЙЛОВЫЙ АРХИТЕКТОР (Drag-and-Drop File Sorting)
  // ═══════════════════════════════════════════════════════════════════════════

  function initExercise4_DragDrop(arena) {
    const FOLDERS = [
      { id: 'docs', name: 'Документы', icon: '📁', exts: ['.docx', '.txt', '.pdf', '.xlsx'], label: 'Тексты и таблицы' },
      { id: 'images', name: 'Изображения', icon: '🖼️', exts: ['.jpg', '.png', '.gif', '.bmp'], label: 'Графика и фото' },
      { id: 'audio', name: 'Музыка', icon: '🎵', exts: ['.mp3', '.wav', '.ogg', '.flac'], label: 'Звуковые файлы' },
      { id: 'trash', name: 'Корзина', icon: '🗑️', exts: ['.tmp', '.bak', '.log', '.old'], label: 'Мусор и временные' }
    ];

    const CURRICULUM_FILES = [
      { id: 'f1', name: 'реферат_история.docx', ext: '.docx', cat: 'docs', icon: '📝' },
      { id: 'f2', name: 'фото_природы.jpg', ext: '.jpg', cat: 'images', icon: '🌄' },
      { id: 'f3', name: 'гимн_школы.mp3', ext: '.mp3', cat: 'audio', icon: '🎶' },
      { id: 'f4', name: 'temp_cache.tmp', ext: '.tmp', cat: 'trash', icon: '🗑️' },
      { id: 'f5', name: 'таблица_оценок.xlsx', ext: '.xlsx', cat: 'docs', icon: '📊' },
      { id: 'f6', name: 'схема_компьютера.png', ext: '.png', cat: 'images', icon: '🖼️' },
      { id: 'f7', name: 'мелодия_звонка.wav', ext: '.wav', cat: 'audio', icon: '🔔' },
      { id: 'f8', name: 'старый_бэкап.bak', ext: '.bak', cat: 'trash', icon: '📦' },
      { id: 'f9', name: 'учебник_информатика.pdf', ext: '.pdf', cat: 'docs', icon: '📕' },
      { id: 'f10', name: 'анимация_кота.gif', ext: '.gif', cat: 'images', icon: '🐱' },
      { id: 'f11', name: 'подкаст_урок.ogg', ext: '.ogg', cat: 'audio', icon: '🎙️' },
      { id: 'f12', name: 'ошибка_системы.log', ext: '.log', cat: 'trash', icon: '⚙️' }
    ];

    let sortedCount = 0;
    const totalFiles = CURRICULUM_FILES.length;

    const layout = document.createElement('div');
    layout.className = 'drag-arena-layout';

    // 1. Папки-приёмники
    const foldersWrap = document.createElement('div');
    foldersWrap.className = 'folders-container';

    FOLDERS.forEach(folder => {
      const fEl = document.createElement('div');
      fEl.className = 'folder-drop-zone';
      fEl.dataset.folderId = folder.id;
      fEl.dataset.acceptedExts = folder.exts.join(',');
      fEl.innerHTML = `
        <span class="folder-icon">${folder.icon}</span>
        <span class="folder-name">${folder.name} (<span class="folder-count">0</span>)</span>
        <span class="folder-exts">${folder.exts.join(' ')}</span>
      `;

      // HTML5 Drag and Drop события
      fEl.addEventListener('dragover', (e) => {
        e.preventDefault();
        if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
        fEl.classList.add('drag-over');
      });

      fEl.addEventListener('dragleave', () => {
        fEl.classList.remove('drag-over', 'drag-valid', 'drag-invalid');
      });

      fEl.addEventListener('drop', (e) => {
        e.preventDefault();
        fEl.classList.remove('drag-over');
        let fileData = null;
        try {
          const raw = e.dataTransfer.getData('text/plain');
          if (raw) fileData = JSON.parse(raw);
        } catch (_) {}

        if (fileData) {
          validateAndHandleDrop(fileData.id, folder.id, fEl);
        }
      });

      foldersWrap.appendChild(fEl);
    });

    layout.appendChild(foldersWrap);

    // 2. Куча несортированных файлов
    const filesWrap = document.createElement('div');
    filesWrap.className = 'files-source-pile';
    filesWrap.id = 'files-source-pile';

    CURRICULUM_FILES.forEach(file => {
      const fileEl = document.createElement('div');
      fileEl.className = 'file-draggable';
      fileEl.id = `drag-file-${file.id}`;
      fileEl.dataset.fileId = file.id;
      fileEl.dataset.fileExt = file.ext;
      fileEl.dataset.fileCategory = file.cat;
      fileEl.draggable = true;
      fileEl.innerHTML = `<span>${file.icon}</span> <span>${file.name}</span>`;

      // HTML5 DnD dragstart
      fileEl.addEventListener('dragstart', (e) => {
        SoundSystem.playDragGrab();
        fileEl.classList.add('is-dragging');
        if (e.dataTransfer) {
          e.dataTransfer.setData('text/plain', JSON.stringify({
            id: file.id,
            ext: file.ext,
            cat: file.cat
          }));
        }
      });

      fileEl.addEventListener('dragend', () => {
        fileEl.classList.remove('is-dragging');
      });

      // Pointer / Mouse Fallback для перетаскивания (dual-mode)
      bindPointerFallback(fileEl, file);

      filesWrap.appendChild(fileEl);
    });

    layout.appendChild(filesWrap);
    arena.appendChild(layout);

    // Поддержка pointer fallback
    function bindPointerFallback(el, file) {
      let isDragging = false;
      let startX = 0, startY = 0;
      let clone = null;

      el.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        startX = e.clientX;
        startY = e.clientY;

        cancelActiveDrag();

        const cleanupDragSession = () => {
          window.removeEventListener('mousemove', onMouseMove);
          window.removeEventListener('mouseup', onMouseUp);
          if (clone && clone.parentNode) {
            clone.parentNode.removeChild(clone);
            clone = null;
          }
          if (el) el.classList.remove('is-dragging');
          isDragging = false;
          if (_activeDragCleanup === cleanupDragSession) {
            _activeDragCleanup = null;
          }
        };

        const onMouseMove = (moveEv) => {
          if (!_isSessionActive) {
            cleanupDragSession();
            return;
          }
          if (!isDragging && Math.hypot(moveEv.clientX - startX, moveEv.clientY - startY) > 5) {
            isDragging = true;
            SoundSystem.playDragGrab();
            clone = el.cloneNode(true);
            clone.classList.add('dragged-file-avatar');
            clone.style.position = 'fixed';
            clone.style.pointerEvents = 'none';
            clone.style.opacity = '0.85';
            clone.style.zIndex = '9999';
            clone.style.transform = 'translate(-50%, -50%) scale(1.08)';
            document.body.appendChild(clone);
            el.classList.add('is-dragging');
          }
          if (isDragging && clone) {
            clone.style.left = `${moveEv.clientX}px`;
            clone.style.top = `${moveEv.clientY}px`;
          }
        };

        const onMouseUp = (upEv) => {
          const wasDragging = isDragging;
          cleanupDragSession();

          if (wasDragging && _isSessionActive) {
            // Определяем над какой папкой отпустили
            const dropTarget = document.elementFromPoint ? document.elementFromPoint(upEv.clientX, upEv.clientY) : null;
            const folderEl = dropTarget ? dropTarget.closest('.folder-drop-zone') : null;
            if (folderEl) {
              const folderId = folderEl.getAttribute('data-folder-id');
              validateAndHandleDrop(file.id, folderId, folderEl);
            }
          }
        };

        _activeDragCleanup = cleanupDragSession;
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
      });
    }

    function validateAndHandleDrop(fileId, folderId, folderEl) {
      const fileData = CURRICULUM_FILES.find(f => f.id === fileId);
      if (!fileData) return;

      const fileEl = document.getElementById(`drag-file-${fileId}`);

      if (fileData.cat === folderId) {
        // Успешная сортировка
        _hits++;
        _score += 50;
        sortedCount++;
        _progressCount = sortedCount;
        SoundSystem.playSuccess();

        folderEl.classList.add('drag-valid');
        safeSetTimeout(() => folderEl.classList.remove('drag-valid'), 300);

        const countSpan = folderEl.querySelector('.folder-count');
        if (countSpan) {
          const cur = parseInt(countSpan.textContent, 10) || 0;
          countSpan.textContent = cur + 1;
        }

        if (fileEl && fileEl.parentNode) {
          fileEl.style.transition = 'all 0.25s ease';
          fileEl.style.transform = 'scale(0)';
          fileEl.style.opacity = '0';
          safeSetTimeout(() => {
            if (fileEl.parentNode) fileEl.parentNode.removeChild(fileEl);
          }, 260);
        }

        updateHUD();

        if (sortedCount >= totalFiles) {
          safeSetTimeout(finishSession, 600);
        }
      } else {
        // Ошибка сортировки
        _misses++;
        _score = Math.max(0, _score - 15);
        SoundSystem.playError();

        folderEl.classList.add('drag-invalid', 'animate-shake');
        safeSetTimeout(() => {
          folderEl.classList.remove('drag-invalid', 'animate-shake');
        }, 400);

        const folderData = FOLDERS.find(f => f.id === folderId);
        const fName = folderData ? folderData.name : 'эту папку';
        showCoachingToast(`Файл "${fileData.name}" имеет расширение ${fileData.ext} и не относится к папке "${fName}"!`);
        updateHUD();
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 10. УПРАЖНЕНИЕ 5: СИСТЕМНЫЙ НАВИГАТОР (Hover & Tooltips)
  // ═══════════════════════════════════════════════════════════════════════════

  function initExercise5_Hover(arena) {
    const WIDGETS = [
      { id: 'w_wifi', name: 'Сеть Wi-Fi', icon: '📶', tooltip: 'Подключено к: School_Informatics_5G | Сигнал: 95% | Доступ в Интернет есть' },
      { id: 'w_bat', name: 'Батарея', icon: '🔋', tooltip: 'Заряд: 88% (питание от сети) | До полного заряда: 25 мин' },
      { id: 'w_usb', name: 'USB-накопитель', icon: '💾', tooltip: 'USB-накопитель: Флеш-карта (E:) | Свободно: 14.8 ГБ из 32.0 ГБ' },
      { id: 'w_vol', name: 'Громкость', icon: '🔊', tooltip: 'Динамики (Realtek Audio): 70%' },
      { id: 'w_sec', name: 'Антивирус', icon: '🛡️', tooltip: 'Безопасность системы | Защита активна, угроз не обнаружено' },
      { id: 'w_set', name: 'Параметры', icon: '⚙️', tooltip: 'Параметры системы, экрана и устройств' },
      { id: 'w_time', name: 'Часы', icon: '🕒', tooltip: 'Четверг, 12 ноября 2026 г. | 16:30' },
      { id: 'w_min', name: 'Свернуть', icon: '🗕', tooltip: 'Свернуть текущее окно в панель задач' },
      { id: 'w_max', name: 'Развернуть', icon: '🗖', tooltip: 'Развернуть окно на весь рабочий стол' },
      { id: 'w_close', name: 'Закрыть', icon: '✕', tooltip: 'Закрыть программу (Alt + F4)' }
    ];

    const QUESTS = [
      { targetId: 'w_usb', prompt: 'Найдите значок USB-флешки и задержите курсор для чтения подсказки' },
      { targetId: 'w_wifi', prompt: 'Наведите курсор на значок Сети и выясните имя подключения' },
      { targetId: 'w_bat', prompt: 'Осмотрите значок Батареи и удерживайте курсор для проверки заряда' },
      { targetId: 'w_sec', prompt: 'Наведите указатель мыши на значок Антивируса и проверьте защиту' },
      { targetId: 'w_close', prompt: 'Найдите кнопку "Закрыть" и задержите на ней курсор' }
    ];

    let currentQuestIdx = 0;
    let hoverTimer = null;
    let inspectTimer = null;
    let activeTooltip = null;

    function renderQuestPrompt() {
      const q = QUESTS[currentQuestIdx];
      const promptEl = document.getElementById('mouse-task-prompt');
      if (promptEl && q) {
        promptEl.innerHTML = `🔍 <strong>Квест ${currentQuestIdx + 1}/5:</strong> ${q.prompt}`;
        promptEl.dataset.originalText = promptEl.innerHTML;
      }
    }

    renderQuestPrompt();

    const trayWrap = document.createElement('div');
    trayWrap.style.height = '100%';
    trayWrap.style.display = 'flex';
    trayWrap.style.flexDirection = 'column';
    trayWrap.style.justifyContent = 'space-around';
    trayWrap.style.alignItems = 'center';
    trayWrap.style.padding = '30px';

    const widgetsGrid = document.createElement('div');
    widgetsGrid.style.display = 'flex';
    widgetsGrid.style.flexWrap = 'wrap';
    widgetsGrid.style.gap = '20px';
    widgetsGrid.style.justifyContent = 'center';
    widgetsGrid.style.maxWidth = '780px';

    WIDGETS.forEach(widget => {
      const wEl = document.createElement('div');
      wEl.className = 'hover-item';
      wEl.dataset.widgetId = widget.id;
      wEl.style.width = '70px';
      wEl.style.height = '70px';
      wEl.style.fontSize = '2rem';
      wEl.style.display = 'flex';
      wEl.style.alignItems = 'center';
      wEl.style.justifyContent = 'center';
      wEl.style.cursor = 'help';
      wEl.innerHTML = widget.icon;

      // Наведение курсора: отсчёт 500мс
      const startHover = () => {
        if (!_isSessionActive) return;
        SoundSystem.playHoverTick();

        hoverTimer = safeSetTimeout(() => {
          showTooltip(wEl, widget);

          // Если это целевой виджет текущего квеста
          const q = QUESTS[currentQuestIdx];
          if (q && q.targetId === widget.id) {
            inspectTimer = safeSetTimeout(() => {
              handleQuestSuccess();
            }, 700);
          }
        }, 500);
      };

      const endHover = () => {
        if (hoverTimer) {
          clearTimeout(hoverTimer);
          hoverTimer = null;
        }
        if (inspectTimer) {
          clearTimeout(inspectTimer);
          inspectTimer = null;
        }
        removeTooltip();
      };

      wEl.addEventListener('mouseenter', startHover);
      wEl.addEventListener('mouseleave', endHover);
      wEl.addEventListener('pointerenter', startHover);
      wEl.addEventListener('pointerleave', endHover);

      widgetsGrid.appendChild(wEl);
    });

    trayWrap.appendChild(widgetsGrid);
    arena.appendChild(trayWrap);

    function showTooltip(targetEl, widget) {
      removeTooltip();
      const tt = document.createElement('div');
      tt.className = 'mouse-tooltip';
      tt.textContent = widget.tooltip;
      targetEl.appendChild(tt);
      activeTooltip = tt;

      // Защита от вылета подсказки за границы арены
      const arenaRect = arena.getBoundingClientRect();
      const ttRect = tt.getBoundingClientRect();

      if (ttRect.right > arenaRect.right) {
        tt.style.left = 'auto';
        tt.style.right = '0';
        tt.style.transform = 'none';
      }
      if (ttRect.left < arenaRect.left) {
        tt.style.left = '0';
        tt.style.transform = 'none';
      }
    }

    function removeTooltip() {
      if (activeTooltip && activeTooltip.parentNode) {
        activeTooltip.parentNode.removeChild(activeTooltip);
      }
      activeTooltip = null;
    }

    function handleQuestSuccess() {
      _hits++;
      _score += 100;
      _progressCount = currentQuestIdx + 1;
      SoundSystem.playSuccess();
      updateHUD();

      currentQuestIdx++;
      if (currentQuestIdx >= QUESTS.length) {
        safeSetTimeout(finishSession, 500);
      } else {
        renderQuestPrompt();
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 11. ЗАВЕРШЕНИЕ УПРАЖНЕНИЯ И СОХРАНЕНИЕ ПРОГРЕССА (Persistence Contract)
  // ═══════════════════════════════════════════════════════════════════════════

  function finishSession(customData) {
    if (!_isSessionActive && !customData) return;
    _isSessionActive = false;
    clearAllExerciseTimers();
    cancelActiveDrag();

    const elapsedSeconds = _startTime ? Math.max(1, Math.round((Date.now() - _startTime) / 1000)) : 1;
    const totalActions = _hits + _misses;
    const computedAccuracy = totalActions > 0 ? Math.round((_hits / totalActions) * 100) : 100;

    // Расчёт звёзд согласно контракту M3 ↔ M4
    let stars = 1;
    if (computedAccuracy >= 90 && _misses <= 1) {
      stars = 3;
    } else if (computedAccuracy >= 75 || _misses <= 3) {
      stars = 2;
    }

    const sessionSummary = {
      taskId: customData && customData.taskId ? customData.taskId : _currentExercise.taskId,
      taskName: customData && customData.taskName ? customData.taskName : _currentExercise.title,
      score: customData && customData.score !== undefined ? customData.score : Math.max(0, _score),
      time: customData && customData.time !== undefined ? customData.time : elapsedSeconds,
      stars: customData && customData.stars !== undefined ? customData.stars : stars,
      accuracy: customData && customData.accuracy !== undefined ? customData.accuracy : computedAccuracy,
      date: new Date().toLocaleDateString('ru-RU')
    };

    SoundSystem.playFanfare();

    // Показываем карточку результатов
    const card = document.getElementById('mouse-result-card');
    const scoreVal = document.getElementById('mouse-res-score');
    const accVal = document.getElementById('mouse-res-accuracy');
    const timeVal = document.getElementById('mouse-res-time');
    const errVal = document.getElementById('mouse-res-errors');
    const starsVal = document.getElementById('mouse-result-stars');

    if (card) {
      if (scoreVal) scoreVal.textContent = sessionSummary.score;
      if (accVal) accVal.textContent = sessionSummary.accuracy;
      if (timeVal) timeVal.textContent = sessionSummary.time;
      if (errVal) errVal.textContent = _misses;
      if (starsVal) starsVal.textContent = '⭐'.repeat(sessionSummary.stars);
      card.style.display = 'block';
    }

    // Сохранение в App.saveProgress при наличии активного ученика
    if (typeof App !== 'undefined' && typeof App.saveProgress === 'function' && App.state && App.state.currentStudent) {
      App.saveProgress(App.state.currentStudent.id, 'mouse', sessionSummary);
    }

    return sessionSummary;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 12. ДЕСТРУКТОР И ОЧИСТКА РЕСУРСОВ
  // ═══════════════════════════════════════════════════════════════════════════

  function destroy() {
    _isSessionActive = false;
    clearAllExerciseTimers();
    cancelActiveDrag();
    removeAllTrackedListeners();

    const muteBtn = document.getElementById('mouse-mute-btn');
    if (muteBtn) {
      muteBtn.removeEventListener('click', _handleMuteToggle);
      delete muteBtn.dataset.bound;
    }

    const arena = document.getElementById('mouse-arena');
    if (arena) arena.innerHTML = '';

    hideResultCard();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 13. ЭКСПОРТ ПУБЛИЧНОГО ИНТЕРФЕЙСА (Contract: PROJECT.md & SCOPE.md)
  // ═══════════════════════════════════════════════════════════════════════════

  window.SoundSystem = SoundSystem;

  window.MouseTrainer = {
    init(containerId) {
      renderUI(containerId);
    },
    selectExercise(exerciseId) {
      selectExercise(exerciseId);
    },
    start(exerciseId) {
      if (exerciseId !== undefined) {
        selectExercise(exerciseId);
      } else {
        startExercise(_activeExerciseId);
      }
    },
    finishSession(customData) {
      return finishSession(customData);
    },
    destroy() {
      destroy();
    }
  };

})();
