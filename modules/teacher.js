/**
 * modules/teacher.js — Панель учителя (Teacher Dashboard)
 * Feature F16: Sticky header, student filtering, stats overview, mouse/typing/tests metrics,
 * gamification level & XP, focus violations display, safe UTF-8 BOM CSV export,
 * multi-PC JSON bundle export/merge, and telemetry sync controls.
 */

'use strict';

window.TeacherPanel = (function () {
  let _container = null;
  let _getAllProgress = null;
  let _studentsData = null;
  let _selectedClass = 'all';
  let _activeTab = 'students'; // 'students' | 'gamification' | 'sync'

  function init(containerId, getAllProgressFn, studentsData) {
    _container = document.getElementById(containerId);
    _getAllProgress = getAllProgressFn;
    _studentsData = studentsData;
    render();
  }

  function render() {
    if (!_container) return;

    const progress = (_getAllProgress ? _getAllProgress() : {}) || {};
    const classes = (_studentsData && _studentsData.classes) ? _studentsData.classes : [];

    let totalStudents = 0;
    classes.forEach(c => totalStudents += (c.students || []).length);

    let activeStudentsCount = 0;
    Object.keys(progress).forEach(k => {
      const p = progress[k];
      if (
        (p.typing && p.typing.totalSessions > 0) ||
        (p.tests && p.tests.totalSessions > 0) ||
        (p.mouse && p.mouse.totalSessions > 0) ||
        (p.gamification && p.gamification.xp > 0) ||
        (p.focusViolations && p.focusViolations > 0)
      ) {
        activeStudentsCount++;
      }
    });

    _container.innerHTML = `
      <div class="teacher-dashboard">
        <!-- Верхняя статистика -->
        <div class="teacher-stats-bar">
          <div class="t-stat-card">
            <span class="t-stat-num">${classes.length}</span>
            <span class="t-stat-label">Классов (7-е)</span>
          </div>
          <div class="t-stat-card">
            <span class="t-stat-num">${totalStudents}</span>
            <span class="t-stat-label">Всего учеников</span>
          </div>
          <div class="t-stat-card highlight">
            <span class="t-stat-num">${activeStudentsCount}</span>
            <span class="t-stat-label">Занимались на этом ПК</span>
          </div>
        </div>

        <!-- Навигационные вкладки панели учителя -->
        <div class="teacher-tabs-nav">
          <button class="t-tab-btn ${_activeTab === 'students' ? 'active' : ''}" data-tab="students">
            📋 Журнал успеваемости
          </button>
          <button class="t-tab-btn ${_activeTab === 'gamification' ? 'active' : ''}" data-tab="gamification">
            🏆 Геймификация и рейтинг
          </button>
          <button class="t-tab-btn ${_activeTab === 'sync' ? 'active' : ''}" data-tab="sync">
            🔄 Синхронизация и ПК
          </button>
        </div>

        <!-- Содержимое активной вкладки -->
        <div class="teacher-tab-content">
          ${_renderActiveTab(classes, progress)}
        </div>
      </div>
    `;

    bindEvents();
  }

  function _renderActiveTab(classes, progress) {
    if (_activeTab === 'gamification') {
      return _renderGamificationTab(classes, progress);
    }
    if (_activeTab === 'sync') {
      return _renderSyncTab(classes, progress);
    }
    return _renderStudentsTab(classes, progress);
  }

  // ─── ВКЛАДКА 1: ЖУРНАЛ УСПЕВАЕМОСТИ ─────────────────────────────────────

  function _renderStudentsTab(classes, progress) {
    return `
      <div class="teacher-toolbar">
        <div class="teacher-filter-group">
          <label for="teacher-class-select"><strong>Класс:</strong></label>
          <select id="teacher-class-select" class="form-select">
            <option value="all">Все классы</option>
            ${classes.map(c => `<option value="${c.id}" ${_selectedClass === c.id ? 'selected' : ''}>${c.name} (${c.subject || ''})</option>`).join('')}
          </select>
        </div>

        <div class="teacher-actions">
          <button id="btn-export-csv" class="btn btn-secondary">📥 Скачать CSV (Excel)</button>
          <button id="btn-export-bundle" class="btn btn-outline">📦 Экспорт JSON</button>
          <button id="btn-import-bundle" class="btn btn-outline">📥 Импорт JSON</button>
          <input type="file" id="input-import-file" accept=".json" style="display:none;" />
          <button id="btn-reset-data" class="btn btn-danger">🗑️ Сбросить журнал</button>
        </div>
      </div>

      <div class="table-responsive">
        <table class="teacher-table">
          <thead>
            <tr>
              <th>№</th>
              <th>Класс</th>
              <th>ФИО Ученика</th>
              <th>Печать (лучшая)</th>
              <th>Точность</th>
              <th>Сессий печати</th>
              <th>Тесты (сдано)</th>
              <th>Мышь (очки / звёзды)</th>
              <th>Уровень / XP</th>
              <th>Нарушений фокуса</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            ${renderTableRows(classes, progress)}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderTableRows(classes, progress) {
    let rowsHtml = '';
    let rowIdx = 1;

    const filteredClasses = _selectedClass === 'all'
      ? classes
      : classes.filter(c => c.id === _selectedClass);

    filteredClasses.forEach(cls => {
      (cls.students || []).forEach(st => {
        const p = progress[st.id] || null;
        const typingBest = p && p.typing && p.typing.bestSpeed ? `${p.typing.bestSpeed} сим/мин` : '<span class="text-muted">—</span>';
        const typingAcc = p && p.typing && p.typing.bestAccuracy ? `${p.typing.bestAccuracy}%` : '<span class="text-muted">—</span>';
        const typingSessions = p && p.typing ? p.typing.totalSessions : 0;

        let testsInfo = '<span class="text-muted">—</span>';
        if (p && p.tests && p.tests.sessions && p.tests.sessions.length > 0) {
          const lastTest = p.tests.sessions[p.tests.sessions.length - 1];
          const pct = Math.round((lastTest.score / lastTest.total) * 100);
          testsInfo = `${lastTest.score}/${lastTest.total} (${pct}%) [Всего: ${p.tests.totalSessions}]`;
        }

        // Мышь
        let mouseInfo = '<span class="text-muted">—</span>';
        if (p && p.mouse && (p.mouse.totalSessions > 0 || (p.mouse.completedTasks && Object.keys(p.mouse.completedTasks).length > 0))) {
          const stars = p.mouse.totalStars || 0;
          const score = p.mouse.totalScore || 0;
          const tasksCount = Object.keys(p.mouse.completedTasks || {}).length;
          mouseInfo = `⭐ ${stars}/15 (${score} очк, ${tasksCount}/5)`;
        }

        // Геймификация (Уровень / XP)
        let gamificationInfo = '<span class="text-muted">1 ур (0 XP)</span>';
        if (p && p.gamification) {
          const lvl = p.gamification.level || 1;
          const xp = p.gamification.xp || 0;
          const title = p.gamification.levelTitle || 'Новичок';
          gamificationInfo = `<strong>${lvl} ур</strong>: ${title} (${xp} XP)`;
        }

        // Нарушения фокуса
        const violations = (p && p.focusViolations) || 0;
        const violationsHtml = violations > 0
          ? `<span class="badge-violation" title="Срывов фокуса / переключений окон">⚠️ ${violations}</span>`
          : `<span class="text-muted">0</span>`;

        const hasData = Boolean(p && (
          (p.typing && p.typing.totalSessions > 0) ||
          (p.tests && p.tests.totalSessions > 0) ||
          (p.mouse && p.mouse.totalSessions > 0) ||
          (p.gamification && p.gamification.xp > 0) ||
          (p.focusViolations && p.focusViolations > 0)
        ));

        rowsHtml += `
          <tr class="${hasData ? 'row-active' : ''}">
            <td>${rowIdx++}</td>
            <td><strong>${cls.name}</strong></td>
            <td>${st.name}</td>
            <td>${typingBest}</td>
            <td>${typingAcc}</td>
            <td>${typingSessions > 0 ? `<strong>${typingSessions}</strong>` : '0'}</td>
            <td>${testsInfo}</td>
            <td>${mouseInfo}</td>
            <td>${gamificationInfo}</td>
            <td>${violationsHtml}</td>
            <td>
              ${hasData ? `<button class="btn-sm btn-clear-student" data-id="${st.id}" title="Сбросить результат">Сброс</button>` : ''}
            </td>
          </tr>
        `;
      });
    });

    if (rowsHtml === '') {
      return `<tr><td colspan="11" class="text-center">В выбранном классе нет учеников</td></tr>`;
    }

    return rowsHtml;
  }

  // ─── ВКЛАДКА 2: ГЕЙМИФИКАЦИЯ И РЕЙТИНГ ─────────────────────────────────

  function _renderGamificationTab(classes, progress) {
    // Собираем всех учеников с их XP
    const studentsList = [];
    classes.forEach(cls => {
      (cls.students || []).forEach(st => {
        const p = progress[st.id] || null;
        const xp = (p && p.gamification && p.gamification.xp) || 0;
        const level = (p && p.gamification && p.gamification.level) || 1;
        const levelTitle = (p && p.gamification && p.gamification.levelTitle) || 'Новичок';
        const achievements = (p && p.gamification && p.gamification.achievements) || [];
        studentsList.push({
          id: st.id,
          name: st.name,
          class: cls.name,
          xp,
          level,
          levelTitle,
          achievements
        });
      });
    });

    // Сортировка по убыванию XP
    studentsList.sort((a, b) => b.xp - a.xp);

    let rank = 1;
    const rows = studentsList.map(st => {
      const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}`;
      const achIcons = (st.achievements || []).map(a => {
        if (a === 'first_step') return '<span title="Первый шаг">🚀</span>';
        if (a === 'quick_fingers') return '<span title="Быстрые пальцы">⚡</span>';
        if (a === 'mouse_master') return '<span title="Мастер мыши">🖱️</span>';
        if (a === 'theory_expert') return '<span title="Знаток теории">🧠</span>';
        if (a === 'speed_demon') return '<span title="Гуру практики">🏆</span>';
        return '🏅';
      }).join(' ');

      return `
        <tr class="${st.xp > 0 ? 'row-active' : ''}">
          <td class="text-center" style="font-weight:700; font-size:1.1rem;">${medal}</td>
          <td><strong>${st.class}</strong></td>
          <td>${st.name}</td>
          <td><strong style="color:var(--color-accent); font-size:1.1rem;">⭐ ${st.xp} XP</strong></td>
          <td>Уровень ${st.level}: ${st.levelTitle}</td>
          <td>${achIcons || '<span class="text-muted">—</span>'}</td>
        </tr>
      `;
    }).join('');

    return `
      <div class="leaderboard-container">
        <div class="leaderboard-header">
          <h3>🏆 Рейтинг учеников по набранному опыту (XP)</h3>
          <p class="text-muted">Опыт начисляется за слепую печать, упражнения мыши и теоретические тесты.</p>
        </div>

        <div class="table-responsive">
          <table class="teacher-table leaderboard-table">
            <thead>
              <tr>
                <th style="width:70px;" class="text-center">Место</th>
                <th>Класс</th>
                <th>ФИО Ученика</th>
                <th>Всего опыта (XP)</th>
                <th>Уровень и звание</th>
                <th>Достижения</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // ─── ВКЛАДКА 3: СИНХРОНИЗАЦИЯ И РАБОТА С ПК ──────────────────────────────

  function _renderSyncTab(classes, progress) {
    const syncUrl = (typeof window !== 'undefined' && window.Telemetry && window.Telemetry.getEndpoint()) || '';
    const queueLen = (typeof window !== 'undefined' && window.Telemetry && window.Telemetry.getQueueLength()) || 0;
    const lastSync = (typeof window !== 'undefined' && window.Telemetry && window.Telemetry.getLastSyncTime()) || 'Никогда';
    const isOnline = (typeof window !== 'undefined' && window.Telemetry && window.Telemetry.isOnline()) || false;
    const isTabGuard = (typeof window !== 'undefined' && window.FocusGuard && window.FocusGuard.isTabGuardEnabled()) !== false;
    const currentVersion = (typeof window !== 'undefined' && window.AutoUpdate && window.AutoUpdate.getCurrentVersion()) || '1.1.0';

    return `
      <div class="sync-settings-grid">
        <!-- Карточка синхронизации телеметрии -->
        <div class="sync-card">
          <div class="sync-card-header">
            <h3>🌐 Синхронизация успеваемости (Offline-First Telemetry)</h3>
            <span class="status-pill ${isOnline ? 'online' : 'offline'}">
              ${isOnline ? '🟢 Сеть онлайн' : '🔴 Офлайн-режим'}
            </span>
          </div>
          <p class="text-muted">
            Данные накапливаются в локальной очереди и автоматически отправляются при подключении ПК к интернету.
          </p>

          <div class="form-group" style="margin-top:16px;">
            <label for="teacher-sync-url"><strong>URL-приёмник телеметрии (сервер / Google Apps Script / webhook):</strong></label>
            <div style="display:flex; gap:8px;">
              <input type="url" id="teacher-sync-url" class="form-input" style="flex:1;"
                     placeholder="https://myschool.ru/api/trainer-sync" value="${syncUrl}" />
              <button id="btn-save-sync-url" class="btn btn-secondary">Сохранить URL</button>
            </div>
          </div>

          <div class="sync-stats-row" style="margin-top:16px;">
            <div class="stat-pill">⏳ В очереди отправки: <strong id="teacher-sync-queue-count">${queueLen}</strong></div>
            <div class="stat-pill">🕒 Последняя синхронизация: <strong id="teacher-last-sync-time">${lastSync}</strong></div>
          </div>

          <div style="margin-top:20px; display:flex; gap:12px;">
            <button id="btn-sync-now" class="btn btn-primary" ${!isOnline ? 'disabled' : ''}>
              🔄 Синхронизировать сейчас
            </button>
          </div>
        </div>

        <!-- Карточка резервного объединения (Мульти-ПК) -->
        <div class="sync-card">
          <div class="sync-card-header">
            <h3>📦 Резервное копирование и объединение данных с других ПК</h3>
          </div>
          <p class="text-muted">
            Если в компьютерном классе нет локальной сети, соберите JSON-файлы с ученических компьютеров на флешку и объедините их на этом ПК без потери данных.
          </p>

          <div style="margin-top:20px; display:flex; gap:12px; flex-wrap:wrap;">
            <button id="btn-export-bundle-tab" class="btn btn-secondary">
              📦 Скачать JSON со всеми учениками
            </button>
            <button id="btn-import-bundle-tab" class="btn btn-primary">
              📥 Объединить JSON с других ПК
            </button>
            <input type="file" id="input-import-file-tab" accept=".json" style="display:none;" />
          </div>
        </div>

        <!-- Карточка настроек анти-чита и обновлений -->
        <div class="sync-card">
          <div class="sync-card-header">
            <h3>🛡️ Дисциплина и обновления</h3>
          </div>

          <div style="margin-top:16px;">
            <label style="display:flex; align-items:center; gap:10px; font-weight:600; cursor:pointer;">
              <input type="checkbox" id="teacher-tabguard-toggle" ${isTabGuard ? 'checked' : ''} style="width:20px; height:20px;" />
              <span>Включить защиту TabGuard (контроль вкладок и прерывание сессий при выходе)</span>
            </label>
            <p class="text-muted" style="margin-left:30px; font-size:0.9rem;">
              Аннулирует текущую попытку при переключении вкладки, сворачивании браузера или запуске параллельной вкладки.
            </p>
          </div>

          <div style="margin-top:20px; border-top:1px solid #e2e8f0; padding-top:16px; display:flex; align-items:center; justify-content:space-between;">
            <div>
              <strong>Текущая версия ПО: v${currentVersion}</strong>
              <div class="text-muted" style="font-size:0.85rem;">Автообновление манифеста при появлении сети.</div>
            </div>
            <button id="btn-check-update-teacher" class="btn btn-outline">
              🚀 Проверить обновление
            </button>
          </div>
        </div>
      </div>
    `;
  }

  function bindEvents() {
    // Вкладки
    document.querySelectorAll('.t-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        _activeTab = btn.getAttribute('data-tab');
        render();
      });
    });

    const classSelect = document.getElementById('teacher-class-select');
    if (classSelect) {
      classSelect.addEventListener('change', (e) => {
        _selectedClass = e.target.value;
        render();
      });
    }

    const exportBtn = document.getElementById('btn-export-csv');
    if (exportBtn) {
      exportBtn.addEventListener('click', exportCSV);
    }

    // Экспорт / Импорт JSON бандла
    const exportBundleBtn = document.getElementById('btn-export-bundle') || document.getElementById('btn-export-bundle-tab');
    if (exportBundleBtn) {
      exportBundleBtn.addEventListener('click', () => {
        if (typeof window !== 'undefined' && window.Telemetry && typeof window.Telemetry.exportBundle === 'function') {
          window.Telemetry.exportBundle();
        }
      });
    }

    const importBundleBtn = document.getElementById('btn-import-bundle') || document.getElementById('btn-import-bundle-tab');
    const fileInput = document.getElementById('input-import-file') || document.getElementById('input-import-file-tab');

    if (importBundleBtn && fileInput) {
      importBundleBtn.addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (evt) => {
            try {
              if (typeof window !== 'undefined' && window.Telemetry && typeof window.Telemetry.importBundle === 'function') {
                const res = window.Telemetry.importBundle(evt.target.result);
                alert(`Данные успешно объединены!\nДобавлено новых учеников: ${res.addedCount}\nОбновлено записей: ${res.updatedCount}`);
                render();
              }
            } catch (err) {
              alert('Ошибка при импорте файла: ' + err.message);
            }
          };
          reader.readAsText(file);
        }
      });
    }

    // Сохранение Sync URL
    const btnSaveUrl = document.getElementById('btn-save-sync-url');
    const inputUrl = document.getElementById('teacher-sync-url');
    if (btnSaveUrl && inputUrl) {
      btnSaveUrl.addEventListener('click', () => {
        const url = inputUrl.value.trim();
        if (typeof window !== 'undefined' && window.Telemetry && typeof window.Telemetry.setEndpoint === 'function') {
          window.Telemetry.setEndpoint(url);
          alert('URL-приёмник сохранён!');
          render();
        }
      });
    }

    // Синхронизация сейчас
    const btnSyncNow = document.getElementById('btn-sync-now');
    if (btnSyncNow) {
      btnSyncNow.addEventListener('click', async () => {
        btnSyncNow.disabled = true;
        btnSyncNow.textContent = '⏳ Синхронизация...';
        if (typeof window !== 'undefined' && window.Telemetry && typeof window.Telemetry.processQueue === 'function') {
          const res = await window.Telemetry.processQueue(true);
          if (res.success) {
            alert(`Успешно отправлено событий: ${res.sentCount || 0}`);
          } else {
            alert(`Синхронизация не выполнена: ${res.error || res.reason || 'Ошибка сети'}`);
          }
          render();
        }
      });
    }

    // Проверка обновлений
    const btnCheckUpdate = document.getElementById('btn-check-update-teacher');
    if (btnCheckUpdate) {
      btnCheckUpdate.addEventListener('click', () => {
        if (typeof window !== 'undefined' && window.AutoUpdate && typeof window.AutoUpdate.checkForUpdates === 'function') {
          window.AutoUpdate.checkForUpdates(true);
        }
      });
    }

    // Переключатель TabGuard
    const tabguardToggle = document.getElementById('teacher-tabguard-toggle');
    if (tabguardToggle) {
      tabguardToggle.addEventListener('change', (e) => {
        if (typeof window !== 'undefined' && window.FocusGuard && typeof window.FocusGuard.setTabGuardEnabled === 'function') {
          window.FocusGuard.setTabGuardEnabled(e.target.checked);
        }
      });
    }

    const resetBtn = document.getElementById('btn-reset-data');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (confirm('Вы уверены, что хотите полностью стереть историю всех учеников на этом ПК?')) {
          localStorage.removeItem('trainer_progress');
          render();
        }
      });
    }

    const clearButtons = document.querySelectorAll('.btn-clear-student');
    clearButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const stId = btn.getAttribute('data-id');
        if (confirm('Сбросить прогресс данного ученика?')) {
          const all = _getAllProgress ? _getAllProgress() : {};
          delete all[stId];
          localStorage.setItem('trainer_progress', JSON.stringify(all));
          render();
        }
      });
    });
  }

  /**
   * Safe CSV Export with UTF-8 BOM.
   * Keeps initial 7 columns intact, appends Mouse, Gamification, and Focus Violations columns.
   */
  function exportCSV() {
    const progress = (_getAllProgress ? _getAllProgress() : {}) || {};
    const classes = (_studentsData && _studentsData.classes) ? _studentsData.classes : [];

    let csvContent = '\uFEFF'; // BOM для корректного открытия в Excel на русском
    // Initial 7 columns + 8 new columns
    csvContent += 'Класс;Ученик;ID;Сессий печати;Лучшая скорость (сим/мин);Точность (%);Пройдено тестов;Сессий мыши;Очки мыши;Звёзды мыши;Заданий мыши;Уровень;Звание;Всего XP;Нарушений фокуса\n';

    classes.forEach(cls => {
      (cls.students || []).forEach(st => {
        const p = progress[st.id] || {};
        const typingSessions = (p.typing && p.typing.totalSessions) || 0;
        const typingSpeed = (p.typing && p.typing.bestSpeed) || 0;
        const typingAcc = (p.typing && p.typing.bestAccuracy) || 0;
        const testsCount = (p.tests && p.tests.totalSessions) || 0;

        // Mouse stats
        const mouseSessions = (p.mouse && p.mouse.totalSessions) || 0;
        const mouseScore = (p.mouse && p.mouse.totalScore) || 0;
        const mouseStars = (p.mouse && p.mouse.totalStars) || 0;
        const mouseTasks = (p.mouse && p.mouse.completedTasks) ? Object.keys(p.mouse.completedTasks).length : 0;

        // Gamification stats
        const level = (p.gamification && p.gamification.level) || 1;
        const levelTitle = (p.gamification && p.gamification.levelTitle) || 'Новичок';
        const xp = (p.gamification && p.gamification.xp) || 0;

        // Focus Violations
        const focusViolations = p.focusViolations || 0;

        csvContent += `"${cls.name}";"${st.name}";"${st.id}";${typingSessions};${typingSpeed};${typingAcc};${testsCount};${mouseSessions};${mouseScore};${mouseStars};${mouseTasks};${level};"${levelTitle}";${xp};${focusViolations}\n`;
      });
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Результаты_7класс_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return {
    init,
    render,
    renderTableRows,
    exportCSV
  };
})();
