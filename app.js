/**
 * app.js — Главный модуль офлайн-тренажёра работы с компьютером (7-е классы)
 * Работает локально через file:// без сервера и интернета.
 */

'use strict';

const App = (() => {
  // ─────────────────────────────────────────────
  // Состояние
  // ─────────────────────────────────────────────
  const state = {
    currentStudent: null, // { id, name, class }
    currentClass: null,   // "7-А"
  };

  const STORAGE_KEY = 'trainer_progress';

  const SCREENS = [
    'screen-login',
    'screen-class',
    'screen-student',
    'screen-teacher-login',
    'screen-menu',
    'screen-typing',
    'screen-mouse',
    'screen-materials',
    'screen-tests',
    'screen-results',
    'screen-teacher',
  ];

  // ─────────────────────────────────────────────
  // Навигация
  // ─────────────────────────────────────────────

  function showScreen(screenId) {
    SCREENS.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.style.display = 'none';
        el.classList.remove('active');
      }
    });
    const target = document.getElementById(screenId);
    if (target) {
      target.style.display = 'flex';
      target.classList.add('active');
      target.classList.remove('fade-in');
      void target.offsetWidth;
      target.classList.add('fade-in');
    }
    if (screenId === 'screen-menu') {
      _renderMenu();
    }
  }

  // ─────────────────────────────────────────────
  // localStorage — прогресс
  // ─────────────────────────────────────────────

  function getAllProgress() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    } catch {
      return {};
    }
  }

  function getProgress(studentId) {
    const all = getAllProgress();
    return all[studentId] || null;
  }

  function saveProgress(studentId, module, data) {
    // Synchronously end FocusGuard session on successful legitimate completion
    const fg = (typeof window !== 'undefined' && window.FocusGuard) || (typeof globalThis !== 'undefined' && globalThis.FocusGuard) || (typeof FocusGuard !== 'undefined' ? FocusGuard : null);
    if (fg && typeof fg.endSession === 'function') {
      fg.endSession();
    }

    const all = getAllProgress();

    if (!all[studentId]) {
      const student = _findStudent(studentId);
      all[studentId] = {
        studentId,
        name: student ? student.name : studentId,
        class: student ? student.class : state.currentClass || '',
        typing: { sessions: [], bestSpeed: 0, bestAccuracy: 0, totalSessions: 0 },
        tests:  { sessions: [], totalSessions: 0 },
        mouse:  { sessions: [], completedTasks: {}, totalScore: 0, totalStars: 0, totalSessions: 0 },
        gamification: { xp: 0, level: 1, levelTitle: 'Новичок', achievements: [] },
        focusViolations: 0,
        violationsLog: []
      };
    }

    const record = all[studentId];

    // Defensive migration: ensure mouse, gamification, and focusViolations exist
    if (!record.mouse) {
      record.mouse = { sessions: [], completedTasks: {}, totalScore: 0, totalStars: 0, totalSessions: 0 };
    }
    if (!record.gamification) {
      record.gamification = { xp: 0, level: 1, levelTitle: 'Новичок', achievements: [] };
    }
    if (record.focusViolations === undefined) {
      record.focusViolations = 0;
    }
    if (!record.violationsLog) {
      record.violationsLog = [];
    }

    if (module === 'typing') {
      record.typing.sessions.push(data);
      record.typing.totalSessions = record.typing.sessions.length;
      if ((data.speed || 0) > (record.typing.bestSpeed || 0)) {
        record.typing.bestSpeed = data.speed;
      }
      if ((data.accuracy || 0) > (record.typing.bestAccuracy || 0)) {
        record.typing.bestAccuracy = data.accuracy;
      }
    } else if (module === 'tests') {
      record.tests.sessions.push(data);
      record.tests.totalSessions = record.tests.sessions.length;
    } else if (module === 'mouse') {
      record.mouse.sessions.push(data);
      record.mouse.totalSessions = record.mouse.sessions.length;

      if (!record.mouse.completedTasks) {
        record.mouse.completedTasks = {};
      }

      const prev = record.mouse.completedTasks[data.taskId] || { bestScore: 0, bestStars: 0, bestTime: Infinity };
      record.mouse.completedTasks[data.taskId] = {
        taskId: data.taskId,
        taskName: data.taskName,
        bestScore: Math.max(prev.bestScore || 0, data.score || 0),
        bestStars: Math.max(prev.bestStars || 0, data.stars || 0),
        bestTime: Math.min(prev.bestTime || Infinity, data.time || Infinity),
        lastCompleted: data.date
      };

      // Recompute totalStars and totalScore
      let totalStars = 0;
      let totalScore = 0;
      Object.values(record.mouse.completedTasks).forEach(t => {
        totalStars += (t.bestStars || 0);
        totalScore += (t.bestScore || 0);
      });
      record.mouse.totalStars = totalStars;
      record.mouse.totalScore = totalScore;
    }

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    } catch (e) {
      console.error('Не удалось сохранить прогресс:', e);
    }

    // Gamification: Add XP and check badge unlocks
    if (typeof Gamification !== 'undefined' && Gamification && typeof Gamification.addXP === 'function') {
      Gamification.addXP(studentId, module, data);
    }

    // Telemetry: Push progress event to sync queue
    if (typeof Telemetry !== 'undefined' && Telemetry && typeof Telemetry.enqueueProgress === 'function') {
      Telemetry.enqueueProgress(studentId, module, data, {
        xp: record.gamification ? record.gamification.xp : 0,
        level: record.gamification ? record.gamification.level : 1,
        focusViolations: record.focusViolations || 0
      });
    }
  }

  // ─────────────────────────────────────────────
  // Вход / Выход
  // ─────────────────────────────────────────────

  function selectClass(classId) {
    state.currentClass = classId;
    _renderStudentList(classId);
    showScreen('screen-student');
  }

  function selectStudent(studentId) {
    const student = _findStudent(studentId);
    if (!student) return;
    state.currentStudent = { id: student.id, name: student.name, class: student.class };
    _renderMenu();
    showScreen('screen-menu');
  }

  function teacherLogin(password) {
    const data = window.STUDENTS_DATA;
    if (!data) {
      alert('Данные не загружены');
      return false;
    }
    if (password === data.teacher_password) {
      showScreen('screen-teacher');
      _renderTeacherPanel();
      return true;
    }
    _showError('teacher-login-error', 'Неверный пароль учителя');
    return false;
  }

  function logout() {
    state.currentStudent = null;
    state.currentClass = null;
    if (window.TypingTrainer && typeof window.TypingTrainer.destroy === 'function') {
      window.TypingTrainer.destroy();
    }
    if (window.MouseTrainer && typeof window.MouseTrainer.destroy === 'function') {
      window.MouseTrainer.destroy();
    }
    showScreen('screen-login');
  }

  // ─────────────────────────────────────────────
  // Рендер: списки и экраны
  // ─────────────────────────────────────────────

  function _renderClassList() {
    const container = document.getElementById('class-list');
    if (!container) return;
    const data = window.STUDENTS_DATA;
    if (!data || !data.classes) return;

    container.innerHTML = '';
    data.classes.forEach(cls => {
      const btn = document.createElement('button');
      btn.className = 'btn btn-class';
      btn.innerHTML = `<span class="class-title">${cls.name}</span><span class="class-sub">${cls.subject || ''} (${(cls.students || []).length} уч.)</span>`;
      btn.addEventListener('click', () => selectClass(cls.id || cls.name));
      container.appendChild(btn);
    });
  }

  function _renderStudentList(classId) {
    const container = document.getElementById('student-list');
    const searchInput = document.getElementById('student-search');
    if (!container) return;

    const data = window.STUDENTS_DATA;
    if (!data || !data.classes) {
      container.innerHTML = '<p>Данные учеников не загружены</p>';
      return;
    }

    const classData = data.classes.find(c => c.id === classId || c.name === classId);
    if (!classData) {
      container.innerHTML = `<p>Класс "${classId}" не найден</p>`;
      return;
    }

    const students = classData.students || [];

    function renderFiltered(filter) {
      const filtered = filter
        ? students.filter(s => s.name.toLowerCase().includes(filter.toLowerCase()))
        : students;

      container.innerHTML = '';
      if (filtered.length === 0) {
        container.innerHTML = '<p class="no-results">Ученики не найдены</p>';
        return;
      }
      filtered.forEach(student => {
        const btn = document.createElement('button');
        btn.className = 'student-card';
        btn.setAttribute('data-student-id', student.id);
        
        const prog = getProgress(student.id);
        let badgeHtml = '';
        if (prog && prog.typing && prog.typing.bestSpeed > 0) {
          badgeHtml = `<span class="student-badge">⌨ ${prog.typing.bestSpeed} сим/мин</span>`;
        }

        btn.innerHTML = `
          <span class="st-name">${student.name}</span>
          ${badgeHtml}
        `;
        btn.addEventListener('click', () => selectStudent(student.id));
        container.appendChild(btn);
      });
    }

    renderFiltered('');

    if (searchInput) {
      searchInput.value = '';
      const newSearch = searchInput.cloneNode(true);
      searchInput.parentNode.replaceChild(newSearch, searchInput);
      newSearch.addEventListener('input', e => renderFiltered(e.target.value));
      newSearch.focus();
    }

    const title = document.getElementById('student-screen-title');
    if (title) title.textContent = `Класс ${classData.name} — выберите себя`;
  }

  function _renderMenu() {
    const student = state.currentStudent;
    if (!student) return;

    const nameEl = document.getElementById('menu-student-name');
    const classEl = document.getElementById('menu-student-class');
    if (nameEl) nameEl.textContent = student.name;
    if (classEl) classEl.textContent = student.class;

    const prog = getProgress(student.id);
    const speedEl = document.getElementById('menu-best-speed');
    const sessionsEl = document.getElementById('menu-sessions-count');

    let totalSessions = 0;
    if (prog) {
      const typingSessions = (prog.typing && prog.typing.totalSessions) || 0;
      const mouseSessions = (prog.mouse && prog.mouse.totalSessions) || 0;
      const testSessions = (prog.tests && prog.tests.totalSessions) || 0;
      totalSessions = typingSessions + mouseSessions + testSessions;
    }

    if (prog && prog.typing) {
      if (speedEl) speedEl.textContent = prog.typing.bestSpeed > 0 ? `${prog.typing.bestSpeed} сим/мин` : '—';
    } else {
      if (speedEl) speedEl.textContent = '—';
    }
    if (sessionsEl) sessionsEl.textContent = totalSessions;

    // Gamification HUD
    const stats = (typeof Gamification !== 'undefined' && Gamification && typeof Gamification.getUserStats === 'function')
      ? Gamification.getUserStats(student.id)
      : null;

    if (stats) {
      const lvlBadge = document.getElementById('menu-level-badge');
      if (lvlBadge) lvlBadge.textContent = `Уровень ${stats.level}: ${stats.levelTitle}`;

      const xpBadge = document.getElementById('menu-xp-badge');
      if (xpBadge) xpBadge.textContent = `⭐ ${stats.xp} XP`;

      const lvlTitleEl = document.getElementById('menu-xp-level-title');
      if (lvlTitleEl) lvlTitleEl.textContent = stats.levelTitle;

      const ratioEl = document.getElementById('menu-xp-ratio');
      if (ratioEl) {
        ratioEl.textContent = stats.nextXp ? `${stats.xp} / ${stats.nextXp} XP` : `${stats.xp} XP (МАКС)`;
      }

      const fillEl = document.getElementById('menu-xp-fill');
      if (fillEl) fillEl.style.width = `${stats.progressPercent}%`;

      const subEl = document.getElementById('menu-xp-sub');
      if (subEl) {
        subEl.textContent = stats.nextXp
          ? `До следующего уровня: ${stats.xpRemaining} XP`
          : 'Достигнут максимальный уровень!';
      }

      const badgesStrip = document.getElementById('menu-badges-strip');
      if (badgesStrip && stats.badges) {
        badgesStrip.innerHTML = stats.badges.map(b => `
          <div class="menu-badge-item ${b.unlocked ? 'unlocked' : 'locked'}" title="${b.title}: ${b.description} (${b.unlocked ? 'Разблокировано' : 'Не получено'})">
            <span class="badge-icon">${b.icon}</span>
            <span class="badge-title-sm">${b.title}</span>
          </div>
        `).join('');
      }
    }
  }

  function _renderMaterials() {
    const container = document.getElementById('materials-container');
    if (!container) return;
    const data = window.CONTENT_DATA;
    if (!data || !data.topics || data.topics.length === 0) {
      container.innerHTML = '<p class="no-results">Материалы презентаций пока не проиндексированы.</p>';
      return;
    }

    let html = '';
    data.topics.forEach(t => {
      html += `
        <div class="material-card">
          <div class="mat-header">
            <span class="mat-badge">Презентация</span>
            <span class="mat-slides-count">📄 ${t.slidesCount} слайдов</span>
          </div>
          <h3 class="mat-title">${t.title}</h3>
          <p class="mat-desc">Конспект темы и просмотр слайдов в высоком разрешении.</p>
          <div class="mat-actions">
            <button class="btn btn-primary btn-open-slides" data-topic="${t.id}">👁️ Смотреть слайды</button>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;

    container.querySelectorAll('.btn-open-slides').forEach(btn => {
      btn.addEventListener('click', () => {
        const tId = btn.getAttribute('data-topic');
        _openSlideViewer(tId);
      });
    });
  }

  function _openSlideViewer(topicId) {
    const data = window.CONTENT_DATA;
    if (!data) return;
    const topic = (data.topics || []).find(t => t.id === topicId);
    if (!topic || !topic.slides || topic.slides.length === 0) return;

    let currentSlide = 0;
    const total = topic.slides.length;

    function getModalHtml() {
      const s = topic.slides[currentSlide];
      const imgTag = s.image
        ? `<div class="slide-img-box"><img src="${s.image}" alt="Слайд ${s.slide}" class="slide-image" /></div>`
        : `<div class="slide-no-img">Изображение формируется</div>`;

      return `
        <div class="slide-viewer">
          <div class="slide-nav-bar">
            <span>Слайд <strong>${currentSlide + 1}</strong> из <strong>${total}</strong></span>
            <div class="slide-nav-btns">
              <button id="btn-slide-prev" class="btn btn-secondary" ${currentSlide === 0 ? 'disabled' : ''}>← Пред.</button>
              <button id="btn-slide-next" class="btn btn-secondary" ${currentSlide === total - 1 ? 'disabled' : ''}>След. →</button>
            </div>
          </div>
          ${imgTag}
          ${s.text ? `<div class="slide-notes"><strong>Текст слайда:</strong><p>${s.text}</p></div>` : ''}
        </div>
      `;
    }

    _showModal(topic.title, getModalHtml());

    function attachNav() {
      const prev = document.getElementById('btn-slide-prev');
      const next = document.getElementById('btn-slide-next');
      if (prev) {
        prev.onclick = () => {
          if (currentSlide > 0) {
            currentSlide--;
            updateContent();
          }
        };
      }
      if (next) {
        next.onclick = () => {
          if (currentSlide < total - 1) {
            currentSlide++;
            updateContent();
          }
        };
      }
    }

    function updateContent() {
      const body = document.querySelector('#app-modal .modal-body');
      if (body) {
        body.innerHTML = getModalHtml();
        attachNav();
      }
    }

    attachNav();
  }

  let _activeTestCancel = null;

  function abortTest() {
    if (typeof _activeTestCancel === 'function') {
      _activeTestCancel();
      _activeTestCancel = null;
    }
  }

  function _startTestWithGuard(testId) {
    const data = window.CONTENT_DATA;
    const test = (data && data.tests || []).find(t => t.id === testId);
    const title = test ? test.title : 'Мини-тест';

    if (window.FocusGuard && typeof window.FocusGuard.showWarningModal === 'function') {
      window.FocusGuard.showWarningModal({
        module: 'tests',
        title: `Тестирование: ${title}`,
        onConfirm: () => {
          _runTest(testId);
          window.FocusGuard.startSession('tests', () => {
            abortTest();
          }, () => _startTestWithGuard(testId));
        }
      });
    } else {
      _runTest(testId);
    }
  }

  function _renderTests() {
    const container = document.getElementById('tests-container');
    if (!container) return;
    const data = window.CONTENT_DATA;
    if (!data || !data.tests || data.tests.length === 0) {
      container.innerHTML = '<p class="no-results">Тесты не найдены.</p>';
      return;
    }

    let html = '<div class="tests-grid">';
    data.tests.forEach(test => {
      html += `
        <div class="test-card">
          <div class="test-header">
            <span class="test-icon">📝</span>
            <span class="test-qcount">${(test.questions || []).length} вопроса</span>
          </div>
          <h3 class="test-title">${test.title}</h3>
          <button class="btn btn-primary btn-start-test" data-test-id="${test.id}">▶ Начать тестирование</button>
        </div>
      `;
    });
    html += '</div>';

    container.innerHTML = html;

    container.querySelectorAll('.btn-start-test').forEach(btn => {
      btn.addEventListener('click', () => {
        const testId = btn.getAttribute('data-test-id');
        _startTestWithGuard(testId);
      });
    });
  }

  function _runTest(testId) {
    const data = window.CONTENT_DATA;
    if (!data) return;
    const test = (data.tests || []).find(t => t.id === testId);
    if (!test) return;

    const container = document.getElementById('tests-container');
    if (!container) return;

    let isAborted = false;
    _activeTestCancel = () => {
      isAborted = true;
      container.innerHTML = '';
    };

    const questions = test.questions || [];
    let currentQ = 0;
    let correct = 0;
    const total = questions.length;

    function renderQuestion() {
      if (isAborted) return;
      const q = questions[currentQ];
      const pct = Math.round((currentQ / total) * 100);

      container.innerHTML = `
        <div class="test-runner">
          <div class="test-progress-bar">
            <div class="test-progress-fill" style="width: ${pct}%"></div>
          </div>
          <div class="test-meta-info">
            <span>Вопрос <strong>${currentQ + 1}</strong> из <strong>${total}</strong></span>
            <span>Тема: ${test.title}</span>
          </div>
          <h3 class="test-q-text">${q.text}</h3>
          <div class="answers-grid">
            ${q.options.map((opt, idx) => `
              <button class="answer-btn" data-idx="${idx}">
                <span class="ans-letter">${String.fromCharCode(65 + idx)}</span>
                <span class="ans-text">${opt}</span>
              </button>
            `).join('')}
          </div>
        </div>
      `;

      container.querySelectorAll('.answer-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const chosen = parseInt(btn.getAttribute('data-idx'));
          container.querySelectorAll('.answer-btn').forEach(b => b.disabled = true);

          if (chosen === q.correct) {
            correct++;
            btn.classList.add('answer-correct');
          } else {
            btn.classList.add('answer-wrong');
            const rightBtn = container.querySelector(`[data-idx="${q.correct}"]`);
            if (rightBtn) rightBtn.classList.add('answer-correct');
          }

          setTimeout(() => {
            if (isAborted) return;
            currentQ++;
            if (currentQ < total) {
              renderQuestion();
            } else {
              finishTest();
            }
          }, 1100);
        });
      });
    }

    function finishTest() {
      if (isAborted) return;
      _activeTestCancel = null;
      if (typeof FocusGuard !== 'undefined' && FocusGuard && typeof FocusGuard.endSession === 'function') {
        FocusGuard.endSession();
      }

      const student = state.currentStudent;
      const pct = Math.round((correct / total) * 100);
      const result = {
        date: new Date().toLocaleDateString('ru-RU'),
        topic: test.title,
        score: correct,
        total,
      };
      if (student) saveProgress(student.id, 'tests', result);

      const earnedXp = (typeof Gamification !== 'undefined' && Gamification && typeof Gamification.calculateActivityXp === 'function')
        ? Gamification.calculateActivityXp('tests', result)
        : 0;

      const mark = pct >= 85 ? '5' : pct >= 70 ? '4' : pct >= 50 ? '3' : '2';

      container.innerHTML = `
        <div class="result-card">
          <h2 class="result-title">🎯 Тестирование завершено!</h2>
          <div class="result-stats">
            <div class="result-stat">
              <span class="result-stat-label">Правильно</span>
              <span class="result-stat-value">${correct} / ${total}</span>
            </div>
            <div class="result-stat">
              <span class="result-stat-label">Процент</span>
              <span class="result-stat-value">${pct}%</span>
            </div>
            <div class="result-stat">
              <span class="result-stat-label">Оценка</span>
              <span class="result-stat-value grade-${mark}">${mark}</span>
            </div>
            <div class="result-stat">
              <span class="result-stat-label">Опыт</span>
              <span class="result-stat-value" style="color:var(--color-accent)">+${earnedXp} XP</span>
            </div>
          </div>
          <div class="result-actions">
            <button id="btn-retry-test" class="btn btn-primary">🔄 Пройти тест снова</button>
            <button id="btn-back-from-test" class="btn btn-secondary">📋 Список тестов</button>
          </div>
        </div>
      `;

      _on('btn-retry-test', 'click', () => _startTestWithGuard(testId));
      _on('btn-back-from-test', 'click', _renderTests);
    }

    renderQuestion();
  }

  function _renderResults() {
    const student = state.currentStudent;
    if (!student) return;

    const container = document.getElementById('results-container');
    if (!container) return;

    const prog = getProgress(student.id);
    const stats = (typeof Gamification !== 'undefined' && Gamification && typeof Gamification.getUserStats === 'function')
      ? Gamification.getUserStats(student.id)
      : null;

    const hasAnyData = Boolean(
      (prog && (
        (prog.typing && prog.typing.totalSessions > 0) ||
        (prog.tests && prog.tests.totalSessions > 0) ||
        (prog.mouse && prog.mouse.totalSessions > 0)
      )) || (stats && stats.xp > 0)
    );

    if (!hasAnyData) {
      container.innerHTML = '<p class="no-results">Пока нет записей. Пройди упражнение на клавиатуре, тренажёре мыши или мини-тест!</p>';
      return;
    }

    let html = '';

    // 1. Блок геймификации: уровень, XP и достижения
    if (stats) {
      const achievementsList = stats.badges || [];
      html += `
        <div class="results-block gamification-results-card">
          <div class="gamification-header-row">
            <div>
              <span class="badge-role">Игровой профиль</span>
              <h2 style="margin:4px 0 0 0;">Уровень ${stats.level}: ${stats.levelTitle}</h2>
            </div>
            <div class="gamification-total-xp">
              ⭐ ${stats.xp} XP
            </div>
          </div>

          <div class="xp-progress-wrapper" style="margin-top:16px;">
            <div class="xp-progress-header">
              <span>Прогресс уровня</span>
              <span>${stats.nextXp ? `${stats.xp} / ${stats.nextXp} XP` : 'МАКСИМАЛЬНЫЙ УРОВЕНЬ'}</span>
            </div>
            <div class="xp-progress-bar">
              <div class="xp-progress-fill" style="width:${stats.progressPercent}%;"></div>
            </div>
            <div class="xp-progress-sub">
              ${stats.nextXp ? `Осталось набрать: ${stats.xpRemaining} XP` : 'Вы достигли вершины мастерства!'}
            </div>
          </div>

          <h3 style="margin-top:20px; font-size:1.05rem;">Достижения (${achievementsList.filter(b => b.unlocked).length} из ${achievementsList.length})</h3>
          <div class="achievements-showcase-grid">
            ${achievementsList.map(b => `
              <div class="achievement-card-full ${b.unlocked ? 'unlocked' : 'locked'}">
                <div class="ach-card-icon">${b.icon}</div>
                <div class="ach-card-body">
                  <div class="ach-card-title">${b.title}</div>
                  <div class="ach-card-desc">${b.description}</div>
                  <div class="ach-card-status">${b.unlocked ? '✅ Получено (+50 XP)' : '🔒 Не разблокировано'}</div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    if (prog && prog.typing && prog.typing.sessions.length > 0) {
      html += `
        <div class="results-block">
          <h3>⌨️ Тренажёр слепой печати</h3>
          <div class="stat-summary-boxes">
            <div class="sum-box">Лучшая скорость: <strong>${prog.typing.bestSpeed || 0} сим/мин</strong></div>
            <div class="sum-box">Лучшая точность: <strong>${prog.typing.bestAccuracy || 0}%</strong></div>
            <div class="sum-box">Всего сессий: <strong>${prog.typing.totalSessions}</strong></div>
          </div>
          <div class="table-responsive">
            <table class="simple-table">
              <thead><tr><th>Дата</th><th>Уровень</th><th>Скорость</th><th>Точность</th><th>Время</th></tr></thead>
              <tbody>
                ${prog.typing.sessions.slice().reverse().map(s => `
                  <tr>
                     <td>${s.date}</td>
                     <td>${s.level}</td>
                     <td><strong>${s.speed}</strong> сим/мин</td>
                     <td>${s.accuracy}%</td>
                     <td>${_formatDuration(s.duration)}</td>
                   </tr>
                 `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
    }

    if (prog && prog.mouse && prog.mouse.sessions && prog.mouse.sessions.length > 0) {
      const tasksCount = Object.keys(prog.mouse.completedTasks || {}).length;
      html += `
        <div class="results-block">
          <h3>🖱️ Тренажёр работы с мышью</h3>
          <div class="stat-summary-boxes">
            <div class="sum-box">Звёзд заработано: <strong>⭐ ${prog.mouse.totalStars || 0} / 15</strong></div>
            <div class="sum-box">Всего очков: <strong>${prog.mouse.totalScore || 0}</strong></div>
            <div class="sum-box">Заданий освоено: <strong>${tasksCount} / 5</strong></div>
          </div>
          <div class="table-responsive">
            <table class="simple-table">
              <thead><tr><th>Дата</th><th>Упражнение</th><th>Очки</th><th>Звёзды</th><th>Время</th></tr></thead>
              <tbody>
                ${prog.mouse.sessions.slice().reverse().map(s => `
                  <tr>
                    <td>${s.date}</td>
                    <td>${s.taskName}</td>
                    <td><strong>${s.score}</strong></td>
                    <td>${'⭐'.repeat(s.stars || 0)}</td>
                    <td>${_formatDuration(s.time)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
    }

    if (prog && prog.tests && prog.tests.sessions.length > 0) {
      html += `
        <div class="results-block">
          <h3>📝 Пройденные мини-тесты</h3>
          <div class="table-responsive">
            <table class="simple-table">
              <thead><tr><th>Дата</th><th>Тема</th><th>Результат</th><th>Процент</th></tr></thead>
              <tbody>
                ${prog.tests.sessions.slice().reverse().map(s => {
                  const pct = Math.round((s.score / s.total) * 100);
                  return `
                    <tr>
                      <td>${s.date}</td>
                      <td>${s.topic}</td>
                      <td><strong>${s.score} из ${s.total}</strong></td>
                      <td>${pct}%</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
    }

    container.innerHTML = html;
  }

  function _renderTeacherPanel() {
    if (window.TeacherPanel && typeof window.TeacherPanel.init === 'function') {
      window.TeacherPanel.init('teacher-container', getAllProgress, window.STUDENTS_DATA);
    }
  }

  // ─────────────────────────────────────────────
  // Вспомогательные функции
  // ─────────────────────────────────────────────

  function _findStudent(studentId) {
    const data = window.STUDENTS_DATA;
    if (!data || !data.classes) return null;
    for (const cls of data.classes) {
      const found = (cls.students || []).find(s => s.id === studentId);
      if (found) return { ...found, class: cls.name };
    }
    return null;
  }

  function _formatDuration(seconds) {
    if (!seconds) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  function _showError(elementId, message) {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.textContent = message;
    el.style.display = 'block';
    setTimeout(() => { el.style.display = 'none'; }, 3000);
  }

  function _showModal(title, htmlContent) {
    const modal = document.getElementById('app-modal');
    if (!modal) return;
    modal.innerHTML = `
      <div class="modal-box">
        <div class="modal-header">
          <h2>${title}</h2>
          <button class="modal-close" id="modal-close-btn">✕</button>
        </div>
        <div class="modal-body">${htmlContent}</div>
      </div>
    `;
    modal.style.display = 'flex';
    document.getElementById('modal-close-btn').addEventListener('click', () => {
      modal.style.display = 'none';
    });
    modal.onclick = (e) => {
      if (e.target === modal) modal.style.display = 'none';
    };
  }

  function _on(id, event, handler) {
    const el = document.getElementById(id);
    if (el) el.addEventListener(event, handler);
  }

  // ─────────────────────────────────────────────
  // Инициализация событий
  // ─────────────────────────────────────────────

  function _startTypingWithGuard(lvlId = 1) {
    showScreen('screen-typing');
    if (window.TypingTrainer && typeof window.TypingTrainer.init === 'function') {
      window.TypingTrainer.init('typing-container');
      window.TypingTrainer.start(lvlId);
    }
  }

  function _startMouseWithGuard(exerciseId = 1) {
    showScreen('screen-mouse');
    if (window.MouseTrainer && typeof window.MouseTrainer.init === 'function') {
      window.MouseTrainer.init('mouse-container');
      window.MouseTrainer.start(exerciseId);
    }
  }

  function _bindNavigation() {
    // Роли
    _on('btn-student', 'click', () => {
      _renderClassList();
      showScreen('screen-class');
    });

    _on('btn-teacher', 'click', () => {
      showScreen('screen-teacher-login');
      const pwd = document.getElementById('teacher-password');
      if (pwd) {
        pwd.value = '';
        pwd.focus();
      }
    });

    // Кнопка входа учителя
    _on('btn-teacher-enter', 'click', () => {
      const pwd = document.getElementById('teacher-password');
      if (pwd) teacherLogin(pwd.value.trim());
    });

    const pwdInput = document.getElementById('teacher-password');
    if (pwdInput) {
      pwdInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') teacherLogin(pwdInput.value.trim());
      });
    }

    _on('btn-logout', 'click', logout);

    // Модули из главного меню
    document.querySelectorAll('.btn-module').forEach(btn => {
      btn.addEventListener('click', () => {
        const mod = btn.getAttribute('data-module');
        if (mod === 'typing') {
          _startTypingWithGuard(1);
        } else if (mod === 'mouse') {
          _startMouseWithGuard(1);
        } else if (mod === 'theory') {
          showScreen('screen-materials');
          _renderMaterials();
        } else if (mod === 'test') {
          showScreen('screen-tests');
          _renderTests();
        } else if (mod === 'stats') {
          showScreen('screen-results');
          _renderResults();
        }
      });
    });

    // Обработка всех data-back кнопок
    document.querySelectorAll('[data-back]').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.getAttribute('data-back');
        if (window.FocusGuard && typeof window.FocusGuard.endSession === 'function') {
          window.FocusGuard.endSession();
        }
        if (btn.closest('#screen-typing') && window.TypingTrainer && typeof window.TypingTrainer.destroy === 'function') {
          window.TypingTrainer.destroy();
        }
        if (btn.closest('#screen-mouse') && window.MouseTrainer && typeof window.MouseTrainer.destroy === 'function') {
          window.MouseTrainer.destroy();
        }
        if (target === 'screen-menu') {
          _renderMenu();
        }
        showScreen(target);
      });
    });
  }

  function init() {
    showScreen('screen-login');
    _bindNavigation();

    if (window.Gamification && typeof window.Gamification.init === 'function') {
      window.Gamification.init();
    }
    if (window.AutoUpdate && typeof window.AutoUpdate.init === 'function') {
      window.AutoUpdate.init();
    }
    if (window.Telemetry && typeof window.Telemetry.init === 'function') {
      window.Telemetry.init();
    }
    if (window.FocusGuard && typeof window.FocusGuard.init === 'function') {
      window.FocusGuard.init();
    }

    console.log('🖥️ Тренажёр успешно запущен локально');
  }

  return {
    state,
    showScreen,
    selectClass,
    selectStudent,
    teacherLogin,
    logout,
    saveProgress,
    getProgress,
    getAllProgress,
    init,
    abortTest,
    runTest: _startTestWithGuard,
    startTyping: _startTypingWithGuard,
    startMouse: _startMouseWithGuard,
    renderMenu: _renderMenu,
  };
})();

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
