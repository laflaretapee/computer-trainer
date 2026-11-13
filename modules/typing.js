/**
 * typing.js — Модуль тренажёра слепой печати
 * Локальный офлайн-тренажёр для 7-х классов
 * Milestone 2: Эргономика слепой печати, 10-пальцевые цветовые зоны,
 * интерактивный визуализатор рук и метрики в реальном времени.
 */

(function () {
  'use strict';

  // ─── Уровни упражнений ───────────────────────────────────────────────────
  const LEVELS = [
    {
      id: 1, name: 'Главный ряд', keys: 'ФЫВАПРОЛДЖ',
      texts: ['фыва фыва авыф', 'рол ролд дрол', 'фыва рол джа фыва']
    },
    {
      id: 2, name: 'Верхний ряд', keys: 'ЙЦУКЕНГШЩЗХ',
      texts: ['йцук йцук куй', 'енг шщз хщ', 'йцук енг щзх йцук']
    },
    {
      id: 3, name: 'Нижний ряд', keys: 'ЯЧСМИТЬБЮ',
      texts: ['ячс мит ьбю', 'ячсм итьб юяч', 'смит ьбюя чсм']
    },
    {
      id: 4, name: 'Слова', keys: null,
      texts: ['мама папа дом кот', 'школа урок класс доска', 'компьютер мышь клавиатура']
    },
    {
      id: 5, name: 'Предложения', keys: null,
      texts: [
        'Мама мыла раму.',
        'Кот сидит на диване.',
        'Я учусь в седьмом классе.',
        'Быстро, чисто и без ошибок.',
        'Ученик учится, а учитель учит.'
      ]
    }
  ];

  // ─── Раскладка клавиатуры ЙЦУКЕН (34 клавиши) ─────────────────────────────
  const KB_LAYOUT = [
    // Ряд 1: Верхний ряд (12 клавиш)
    [
      { key: 'й', label: 'Й', zone: 'pinky-l' },
      { key: 'ц', label: 'Ц', zone: 'ring-l' },
      { key: 'у', label: 'У', zone: 'mid-l' },
      { key: 'к', label: 'К', zone: 'idx-l' },
      { key: 'е', label: 'Е', zone: 'idx-l' },
      { key: 'н', label: 'Н', zone: 'idx-r' },
      { key: 'г', label: 'Г', zone: 'idx-r' },
      { key: 'ш', label: 'Ш', zone: 'mid-r' },
      { key: 'щ', label: 'Щ', zone: 'ring-r' },
      { key: 'з', label: 'З', zone: 'pinky-r' },
      { key: 'х', label: 'Х', zone: 'pinky-r' },
      { key: 'ъ', label: 'Ъ', zone: 'pinky-r' }
    ],
    // Ряд 2: Главный / Домашний ряд (11 клавиш)
    [
      { key: 'ф', label: 'Ф', zone: 'pinky-l' },
      { key: 'ы', label: 'Ы', zone: 'ring-l' },
      { key: 'в', label: 'В', zone: 'mid-l' },
      { key: 'а', label: 'А', zone: 'idx-l', isHome: true }, // тактильная засечка
      { key: 'п', label: 'П', zone: 'idx-l' },
      { key: 'р', label: 'Р', zone: 'idx-r' },
      { key: 'о', label: 'О', zone: 'idx-r', isHome: true }, // тактильная засечка
      { key: 'л', label: 'Л', zone: 'mid-r' },
      { key: 'д', label: 'Д', zone: 'ring-r' },
      { key: 'ж', label: 'Ж', zone: 'pinky-r' },
      { key: 'э', label: 'Э', zone: 'pinky-r' }
    ],
    // Ряд 3: Нижний ряд (10 клавиш, включая . и ,)
    [
      { key: 'я', label: 'Я', zone: 'pinky-l' },
      { key: 'ч', label: 'Ч', zone: 'ring-l' },
      { key: 'с', label: 'С', zone: 'mid-l' },
      { key: 'м', label: 'М', zone: 'idx-l' },
      { key: 'и', label: 'И', zone: 'idx-l' },
      { key: 'т', label: 'Т', zone: 'idx-r' },
      { key: 'ь', label: 'Ь', zone: 'idx-r' },
      { key: 'б', label: 'Б', zone: 'mid-r' },
      { key: 'ю', label: 'Ю', zone: 'ring-r' },
      { key: '.', label: '. ,', alt: ',', zone: 'pinky-r' }
    ]
  ];

  // Маппинг альтернативных символов на базовые клавиши
  const CHAR_TO_KEY_MAP = {
    ',': '.',
    'ё': 'е',
    'Ё': 'е',
    '—': '-',
    '–': '-'
  };

  // ─── Справочник соответствия символов зонам пальцев (10-Finger Zone Map) ──
  const FINGER_MAP = {
    // ─── ЛЕВАЯ РУКА ─────────────────────────────────────────────────────────
    // Левый мизинец (розово-красный)
    'ё': { zone: 'kb-zone-pinky-l', finger: 'pinky-l', hand: 'left', handName: 'Левая рука', fingerName: 'Мизинец' },
    '1': { zone: 'kb-zone-pinky-l', finger: 'pinky-l', hand: 'left', handName: 'Левая рука', fingerName: 'Мизинец' },
    'й': { zone: 'kb-zone-pinky-l', finger: 'pinky-l', hand: 'left', handName: 'Левая рука', fingerName: 'Мизинец' },
    'ф': { zone: 'kb-zone-pinky-l', finger: 'pinky-l', hand: 'left', handName: 'Левая рука', fingerName: 'Мизинец' },
    'я': { zone: 'kb-zone-pinky-l', finger: 'pinky-l', hand: 'left', handName: 'Левая рука', fingerName: 'Мизинец' },

    // Левый безымянный (оранжевый)
    '2': { zone: 'kb-zone-ring-l', finger: 'ring-l', hand: 'left', handName: 'Левая рука', fingerName: 'Безымянный' },
    'ц': { zone: 'kb-zone-ring-l', finger: 'ring-l', hand: 'left', handName: 'Левая рука', fingerName: 'Безымянный' },
    'ы': { zone: 'kb-zone-ring-l', finger: 'ring-l', hand: 'left', handName: 'Левая рука', fingerName: 'Безымянный' },
    'ч': { zone: 'kb-zone-ring-l', finger: 'ring-l', hand: 'left', handName: 'Левая рука', fingerName: 'Безымянный' },

    // Левый средний (жёлтый)
    '3': { zone: 'kb-zone-mid-l', finger: 'mid-l', hand: 'left', handName: 'Левая рука', fingerName: 'Средний' },
    'у': { zone: 'kb-zone-mid-l', finger: 'mid-l', hand: 'left', handName: 'Левая рука', fingerName: 'Средний' },
    'в': { zone: 'kb-zone-mid-l', finger: 'mid-l', hand: 'left', handName: 'Левая рука', fingerName: 'Средний' },
    'с': { zone: 'kb-zone-mid-l', finger: 'mid-l', hand: 'left', handName: 'Левая рука', fingerName: 'Средний' },

    // Левый указательный (зелёный)
    '4': { zone: 'kb-zone-idx-l', finger: 'idx-l', hand: 'left', handName: 'Левая рука', fingerName: 'Указательный' },
    '5': { zone: 'kb-zone-idx-l', finger: 'idx-l', hand: 'left', handName: 'Левая рука', fingerName: 'Указательный' },
    'к': { zone: 'kb-zone-idx-l', finger: 'idx-l', hand: 'left', handName: 'Левая рука', fingerName: 'Указательный' },
    'е': { zone: 'kb-zone-idx-l', finger: 'idx-l', hand: 'left', handName: 'Левая рука', fingerName: 'Указательный' },
    'а': { zone: 'kb-zone-idx-l', finger: 'idx-l', hand: 'left', handName: 'Левая рука', fingerName: 'Указательный' },
    'п': { zone: 'kb-zone-idx-l', finger: 'idx-l', hand: 'left', handName: 'Левая рука', fingerName: 'Указательный' },
    'м': { zone: 'kb-zone-idx-l', finger: 'idx-l', hand: 'left', handName: 'Левая рука', fingerName: 'Указательный' },
    'и': { zone: 'kb-zone-idx-l', finger: 'idx-l', hand: 'left', handName: 'Левая рука', fingerName: 'Указательный' },

    // Большие пальцы обеих рук (серый) — Пробел
    ' ': { zone: 'kb-zone-thumb', finger: 'thumb', hand: 'both', handName: 'Обе руки', fingerName: 'Большой' },

    // ─── ПРАВАЯ РУКА ────────────────────────────────────────────────────────
    // Правый указательный (бирюзовый)
    '6': { zone: 'kb-zone-idx-r', finger: 'idx-r', hand: 'right', handName: 'Правая рука', fingerName: 'Указательный' },
    '7': { zone: 'kb-zone-idx-r', finger: 'idx-r', hand: 'right', handName: 'Правая рука', fingerName: 'Указательный' },
    'г': { zone: 'kb-zone-idx-r', finger: 'idx-r', hand: 'right', handName: 'Правая рука', fingerName: 'Указательный' },
    'н': { zone: 'kb-zone-idx-r', finger: 'idx-r', hand: 'right', handName: 'Правая рука', fingerName: 'Указательный' },
    'о': { zone: 'kb-zone-idx-r', finger: 'idx-r', hand: 'right', handName: 'Правая рука', fingerName: 'Указательный' },
    'р': { zone: 'kb-zone-idx-r', finger: 'idx-r', hand: 'right', handName: 'Правая рука', fingerName: 'Указательный' },
    'т': { zone: 'kb-zone-idx-r', finger: 'idx-r', hand: 'right', handName: 'Правая рука', fingerName: 'Указательный' },
    'ь': { zone: 'kb-zone-idx-r', finger: 'idx-r', hand: 'right', handName: 'Правая рука', fingerName: 'Указательный' },

    // Правый средний (индиго)
    '8': { zone: 'kb-zone-mid-r', finger: 'mid-r', hand: 'right', handName: 'Правая рука', fingerName: 'Средний' },
    'ш': { zone: 'kb-zone-mid-r', finger: 'mid-r', hand: 'right', handName: 'Правая рука', fingerName: 'Средний' },
    'л': { zone: 'kb-zone-mid-r', finger: 'mid-r', hand: 'right', handName: 'Правая рука', fingerName: 'Средний' },
    'б': { zone: 'kb-zone-mid-r', finger: 'mid-r', hand: 'right', handName: 'Правая рука', fingerName: 'Средний' },

    // Правый безымянный (фиолетовый)
    '9': { zone: 'kb-zone-ring-r', finger: 'ring-r', hand: 'right', handName: 'Правая рука', fingerName: 'Безымянный' },
    'щ': { zone: 'kb-zone-ring-r', finger: 'ring-r', hand: 'right', handName: 'Правая рука', fingerName: 'Безымянный' },
    'д': { zone: 'kb-zone-ring-r', finger: 'ring-r', hand: 'right', handName: 'Правая рука', fingerName: 'Безымянный' },
    'ю': { zone: 'kb-zone-ring-r', finger: 'ring-r', hand: 'right', handName: 'Правая рука', fingerName: 'Безымянный' },

    // Правый мизинец (розовый)
    '0': { zone: 'kb-zone-pinky-r', finger: 'pinky-r', hand: 'right', handName: 'Правая рука', fingerName: 'Мизинец' },
    '-': { zone: 'kb-zone-pinky-r', finger: 'pinky-r', hand: 'right', handName: 'Правая рука', fingerName: 'Мизинец' },
    '=': { zone: 'kb-zone-pinky-r', finger: 'pinky-r', hand: 'right', handName: 'Правая рука', fingerName: 'Мизинец' },
    'з': { zone: 'kb-zone-pinky-r', finger: 'pinky-r', hand: 'right', handName: 'Правая рука', fingerName: 'Мизинец' },
    'х': { zone: 'kb-zone-pinky-r', finger: 'pinky-r', hand: 'right', handName: 'Правая рука', fingerName: 'Мизинец' },
    'ъ': { zone: 'kb-zone-pinky-r', finger: 'pinky-r', hand: 'right', handName: 'Правая рука', fingerName: 'Мизинец' },
    'ж': { zone: 'kb-zone-pinky-r', finger: 'pinky-r', hand: 'right', handName: 'Правая рука', fingerName: 'Мизинец' },
    'э': { zone: 'kb-zone-pinky-r', finger: 'pinky-r', hand: 'right', handName: 'Правая рука', fingerName: 'Мизинец' },
    '.': { zone: 'kb-zone-pinky-r', finger: 'pinky-r', hand: 'right', handName: 'Правая рука', fingerName: 'Мизинец' },
    ',': { zone: 'kb-zone-pinky-r', finger: 'pinky-r', hand: 'right', handName: 'Правая рука', fingerName: 'Мизинец' }
  };

  // ─── Внутреннее состояние ─────────────────────────────────────────────────
  let _container = null;
  let _currentLevel = null;
  let _currentText = '';
  let _currentPos = 0;
  let _correctChars = 0;
  let _errors = 0;
  let _totalKeystrokes = 0;
  let _startTime = null;
  let _timerInterval = null;
  let _activeKeyTimer = null;
  let _textStarted = false;
  let _isFinished = false;
  let _keyElementsMap = new Map();

  // ─── Вспомогательные функции ──────────────────────────────────────────────

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return (ctx || document).querySelectorAll(sel); }

  function qs(id) {
    if (!_container) return null;
    let el = _container.querySelector('#' + id);
    if (!el && id === 'tt-hands') el = _container.querySelector('#tt-hands-visualizer');
    if (!el && id === 'tt-hands-visualizer') el = _container.querySelector('#tt-hands');
    return el;
  }

  function pickRandom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m + ':' + String(s).padStart(2, '0');
  }

  // ─── Индексация и безопасный поиск клавиш ─────────────────────────────────

  function buildKeyMap() {
    _keyElementsMap.clear();
    const kb = qs('tt-keyboard');
    if (!kb) return;

    kb.querySelectorAll('.kb-key').forEach(el => {
      const k = el.dataset.key;
      if (k !== undefined && k !== null) {
        _keyElementsMap.set(k, el);
        _keyElementsMap.set(k.toLowerCase(), el);
        _keyElementsMap.set(k.toUpperCase(), el);
      }
      const alt = el.dataset.alt;
      if (alt !== undefined && alt !== null) {
        _keyElementsMap.set(alt, el);
        _keyElementsMap.set(alt.toLowerCase(), el);
        _keyElementsMap.set(alt.toUpperCase(), el);
      }
    });
  }

  function getKeyElement(char) {
    if (char === null || char === undefined || char === '') return null;

    // 1. Прямой поиск в Map
    if (_keyElementsMap.has(char)) return _keyElementsMap.get(char);
    const lower = char.toLowerCase();
    if (_keyElementsMap.has(lower)) return _keyElementsMap.get(lower);
    const upper = char.toUpperCase();
    if (_keyElementsMap.has(upper)) return _keyElementsMap.get(upper);

    // 2. Поиск по алиасам (например ',' -> '.')
    const mapped = CHAR_TO_KEY_MAP[char] || CHAR_TO_KEY_MAP[lower];
    if (mapped) {
      if (_keyElementsMap.has(mapped)) return _keyElementsMap.get(mapped);
      if (_keyElementsMap.has(mapped.toLowerCase())) return _keyElementsMap.get(mapped.toLowerCase());
    }

    // 3. Безопасный DOM-запрос с экранированием CSS
    const kb = qs('tt-keyboard');
    if (!kb) return null;
    try {
      const esc = (typeof CSS !== 'undefined' && CSS && typeof CSS.escape === 'function') ? CSS.escape(char) : char;
      const escLower = (typeof CSS !== 'undefined' && CSS && typeof CSS.escape === 'function') ? CSS.escape(lower) : lower;
      return kb.querySelector(`[data-key="${esc}"], [data-key="${escLower}"], [data-alt="${esc}"]`);
    } catch {
      return null;
    }
  }

  // ─── Рендер компонентов ───────────────────────────────────────────────────

  function renderHandsVisualizer() {
    return `
      <!-- Индикатор кистей рук (Milestone 2) -->
      <div class="hands-visualizer" id="tt-hands-visualizer" aria-label="Индикатор положения рук и пальцев">

        <!-- Левая кисть -->
        <div class="hand-block hand-left" aria-label="Левая рука">
          <div class="hand-title">Левая рука</div>
          <div class="hand-fingers">
            <div class="finger-item finger-pinky kb-zone-pinky-l" data-finger="pinky-l" title="Левый мизинец">
              <span class="finger-tag">Миз</span>
            </div>
            <div class="finger-item finger-ring kb-zone-ring-l" data-finger="ring-l" title="Левый безымянный">
              <span class="finger-tag">Без</span>
            </div>
            <div class="finger-item finger-mid kb-zone-mid-l" data-finger="mid-l" title="Левый средний">
              <span class="finger-tag">Ср</span>
            </div>
            <div class="finger-item finger-idx kb-zone-idx-l" data-finger="idx-l" title="Левый указательный">
              <span class="finger-tag">Ук</span>
            </div>
            <div class="finger-item finger-thumb kb-zone-thumb" data-finger="thumb-l" title="Большой палец">
              <span class="finger-tag">Бол</span>
            </div>
          </div>
          <div class="hand-palm-bar"></div>
        </div>

        <!-- Центральная панель-подсказка -->
        <div class="hands-cue-panel" id="tt-hands-cue" aria-live="polite">
          <div class="cue-indicator-icon" aria-hidden="true">🖐️</div>
          <div class="cue-details">
            <div class="cue-hand-name" id="tt-cue-hand">Выберите уровень</div>
            <div class="cue-finger-name" id="tt-cue-finger">Нажмите любую клавишу</div>
          </div>
          <div class="cue-key-badge" id="tt-cue-key" title="Требуемый символ">—</div>
        </div>

        <!-- Правая кисть -->
        <div class="hand-block hand-right" aria-label="Правая рука">
          <div class="hand-title">Правая рука</div>
          <div class="hand-fingers">
            <div class="finger-item finger-thumb kb-zone-thumb" data-finger="thumb-r" title="Большой палец">
              <span class="finger-tag">Бол</span>
            </div>
            <div class="finger-item finger-idx kb-zone-idx-r" data-finger="idx-r" title="Правый указательный">
              <span class="finger-tag">Ук</span>
            </div>
            <div class="finger-item finger-mid kb-zone-mid-r" data-finger="mid-r" title="Правый средний">
              <span class="finger-tag">Ср</span>
            </div>
            <div class="finger-item finger-ring kb-zone-ring-r" data-finger="ring-r" title="Правый безымянный">
              <span class="finger-tag">Без</span>
            </div>
            <div class="finger-item finger-pinky kb-zone-pinky-r" data-finger="pinky-r" title="Правый мизинец">
              <span class="finger-tag">Миз</span>
            </div>
          </div>
          <div class="hand-palm-bar"></div>
        </div>

      </div>
    `;
  }

  function renderKeyboard() {
    let html = '';
    KB_LAYOUT.forEach((row, rowIndex) => {
      const offsetClass = rowIndex === 1 ? 'kb-row-offset-1' : rowIndex === 2 ? 'kb-row-offset-2' : '';
      html += `<div class="kb-row ${offsetClass}">`;
      row.forEach(item => {
        const homeClass = item.isHome ? ' kb-home-key' : '';
        const altAttr = item.alt ? ` data-alt="${item.alt}"` : '';
        const zoneClass = `kb-zone-${item.zone}`;
        const titleAttr = item.isHome ? ' title="Опорная клавиша (засечка)"' : item.key === '.' ? ' title="Точка / Запятая (Shift)"' : '';
        html += `<div class="kb-key ${zoneClass}${homeClass}" data-key="${item.key}" data-key-char="${item.key}" data-finger-zone="${item.zone}"${altAttr}${titleAttr}>${item.label}</div>`;
      });
      html += `</div>`;
    });
    // Пробел
    html += `<div class="kb-row kb-row-space">
      <div class="kb-key kb-space kb-zone-thumb" data-key=" " data-key-char=" " data-finger-zone="thumb">Пробел</div>
    </div>`;
    return html;
  }

  // ─── Рендер UI ───────────────────────────────────────────────────────────

  function renderUI(containerId) {
    _container = document.getElementById(containerId);
    if (!_container) { console.error('TypingTrainer: контейнер #' + containerId + ' не найден'); return; }

    _container.innerHTML = `
      <style id="tt-hands-styles">
        /* ════════════════════════════════════════════════════════════════
           ИНДИКАТОР КИСТЕЙ РУК (Hands Visualizer — Milestone 2)
           ════════════════════════════════════════════════════════════════ */
        .hands-visualizer {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: clamp(12px, 2.5vw, 28px);
          width: 100%;
          max-height: clamp(65px, 12vh, 105px);
          padding: 2px 0;
          user-select: none;
          flex-shrink: 0;
        }
        .hand-block {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
        }
        .hand-title {
          font-size: clamp(0.7rem, 0.75vw, 0.78rem);
          font-weight: 700;
          color: var(--color-muted, #64748b);
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .hand-fingers {
          display: flex;
          align-items: flex-end;
          gap: clamp(2px, 0.35vw, 5px);
          height: clamp(48px, 8vh, 68px);
          padding: 0 4px;
        }
        .finger-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-start;
          width: clamp(20px, 1.8vw, 26px);
          border-radius: 8px 8px 3px 3px;
          border: 2px solid transparent;
          padding: 3px 1px;
          font-size: clamp(0.55rem, 0.65vw, 0.68rem);
          font-weight: 700;
          cursor: default;
          transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
          box-sizing: border-box;
        }
        .finger-pinky { height: 62%; }
        .finger-ring  { height: 86%; }
        .finger-mid   { height: 100%; }
        .finger-idx   { height: 86%; }
        .finger-thumb { height: 50%; }
        .hand-left .finger-thumb  { transform: rotate(-15deg); margin-left: 2px; }
        .hand-right .finger-thumb { transform: rotate(15deg); margin-right: 2px; }
        .finger-tag { line-height: 1; pointer-events: none; }

        .finger-item.kb-zone-pinky-l { background-color: var(--zone-pinky-l-bg, #ffe4e6); color: var(--zone-pinky-l-text, #9f1239); border-color: var(--zone-pinky-l-brd, #fda4af); }
        .finger-item.kb-zone-ring-l  { background-color: var(--zone-ring-l-bg, #ffedd5); color: var(--zone-ring-l-text, #9a3412); border-color: var(--zone-ring-l-brd, #fdba74); }
        .finger-item.kb-zone-mid-l   { background-color: var(--zone-mid-l-bg, #fef9c3); color: var(--zone-mid-l-text, #854d0e); border-color: var(--zone-mid-l-brd, #fde047); }
        .finger-item.kb-zone-idx-l   { background-color: var(--zone-idx-l-bg, #d1fae5); color: var(--zone-idx-l-text, #065f46); border-color: var(--zone-idx-l-brd, #6ee7b7); }
        .finger-item.kb-zone-thumb   { background-color: var(--zone-thumb-bg, #f1f5f9); color: var(--zone-thumb-text, #1e293b); border-color: var(--zone-thumb-brd, #cbd5e1); }
        .finger-item.kb-zone-idx-r   { background-color: var(--zone-idx-r-bg, #cffafe); color: var(--zone-idx-r-text, #155e75); border-color: var(--zone-idx-r-brd, #67e8f9); }
        .finger-item.kb-zone-mid-r   { background-color: var(--zone-mid-r-bg, #e0e7ff); color: var(--zone-mid-r-text, #3730a3); border-color: var(--zone-mid-r-brd, #a5b4fc); }
        .finger-item.kb-zone-ring-r  { background-color: var(--zone-ring-r-bg, #f3e8ff); color: var(--zone-ring-r-text, #6b21a8); border-color: var(--zone-ring-r-brd, #d8b4fe); }
        .finger-item.kb-zone-pinky-r { background-color: var(--zone-pinky-r-bg, #fce7f3); color: var(--zone-pinky-r-text, #9d174d); border-color: var(--zone-pinky-r-brd, #f9a8d4); }

        .hand-palm-bar {
          width: 90%;
          height: 5px;
          background: #cbd5e1;
          border-radius: 0 0 8px 8px;
        }

        .finger-item.finger-active {
          transform: translateY(-5px) scale(1.12) !important;
          border-color: #ffffff !important;
          box-shadow: 0 0 0 2px var(--color-primary, #2563eb), 0 4px 10px rgba(37, 99, 235, 0.45) !important;
          z-index: 2;
          animation: fingerPulse 1s ease-in-out infinite;
        }
        .hand-left .finger-thumb.finger-active {
          transform: rotate(-15deg) translateY(-5px) scale(1.12) !important;
        }
        .hand-right .finger-thumb.finger-active {
          transform: rotate(15deg) translateY(-5px) scale(1.12) !important;
        }
        @keyframes fingerPulse {
          0%, 100% {
            box-shadow: 0 0 0 2px var(--color-primary, #2563eb), 0 2px 6px rgba(37, 99, 235, 0.4);
          }
          50% {
            box-shadow: 0 0 0 3px var(--color-accent, #16a34a), 0 6px 14px rgba(22, 163, 74, 0.6);
          }
        }

        .hands-cue-panel {
          display: flex;
          align-items: center;
          gap: clamp(8px, 1.2vw, 14px);
          background: var(--color-surface, #ffffff);
          border: 2px solid var(--color-border, #e2e8f0);
          border-radius: var(--radius-md, 10px);
          padding: clamp(4px, 0.8vh, 8px) clamp(10px, 1.5vw, 18px);
          box-shadow: var(--shadow-sm, 0 1px 2px rgba(0,0,0,0.05));
          min-width: clamp(200px, 24vw, 290px);
        }
        .cue-indicator-icon {
          font-size: clamp(1.2rem, 1.6vw, 1.6rem);
          flex-shrink: 0;
        }
        .cue-details {
          display: flex;
          flex-direction: column;
          flex: 1;
        }
        .cue-hand-name {
          font-size: clamp(0.72rem, 0.8vw, 0.82rem);
          font-weight: 600;
          color: var(--color-muted, #64748b);
        }
        .cue-finger-name {
          font-size: clamp(0.85rem, 1vw, 0.98rem);
          font-weight: 800;
          color: var(--color-primary, #2563eb);
          white-space: nowrap;
        }
        .cue-key-badge {
          display: flex;
          align-items: center;
          justify-content: center;
          min-width: clamp(26px, 2.5vw, 36px);
          height: clamp(26px, 3.2vh, 36px);
          padding: 0 6px;
          background: var(--color-primary-light, #eff6ff);
          color: var(--color-primary-h, #1d4ed8);
          border: 2px solid var(--color-primary, #2563eb);
          border-radius: var(--radius-sm, 6px);
          font-size: clamp(0.85rem, 1.1vw, 1.05rem);
          font-weight: 800;
          box-shadow: var(--shadow-key, 0 2px 0 rgba(0,0,0,0.08));
          flex-shrink: 0;
        }

        .kb-home-key {
          position: relative;
        }
        .kb-home-key::after {
          content: '';
          position: absolute;
          bottom: 3px;
          left: 50%;
          transform: translateX(-50%);
          width: 12px;
          height: 2px;
          background-color: currentColor;
          border-radius: 1px;
          opacity: 0.75;
        }

        @media (max-height: 620px) {
          .hands-visualizer { max-height: 52px; gap: 8px; }
          .hand-fingers { height: 38px; gap: 2px; }
          .finger-item { width: 17px; font-size: 0.5rem; padding: 1px 0; }
          .hand-title { font-size: 0.62rem; }
          .hands-cue-panel { padding: 2px 8px; min-width: 175px; gap: 6px; }
          .cue-indicator-icon { font-size: 1rem; }
          .cue-finger-name { font-size: 0.76rem; }
          .cue-key-badge { min-width: 22px; height: 22px; font-size: 0.76rem; }
        }
      </style>

      <div class="typing-trainer">

        <!-- Выбор уровня -->
        <div class="level-selector">
          <span class="level-label">Уровень:</span>
          ${LEVELS.map(l => `
            <button class="level-btn" data-level="${l.id}" title="${l.name}">
              ${l.id}. ${l.name}
            </button>`).join('')}
        </div>

        <!-- Текущий уровень -->
        <div class="level-title" id="tt-level-title">Выберите уровень для начала</div>

        <!-- Текст для набора -->
        <div class="typing-text-wrap">
          <div class="typing-text" id="tt-text" aria-live="polite"></div>
        </div>

        <!-- Скрытое поле ввода -->
        <input type="text" id="tt-input" class="tt-hidden-input"
               autocomplete="off" autocorrect="off" autocapitalize="off"
               spellcheck="false" aria-label="Поле ввода тренажёра" />

        <!-- Схема клавиатуры -->
        <div class="keyboard-wrap">
          <div class="keyboard" id="tt-keyboard">
            ${renderKeyboard()}
          </div>
        </div>

        <!-- Индикатор положения рук (Hands Visualizer) -->
        ${renderHandsVisualizer()}

        <!-- Статистика в реальном времени -->
        <div class="typing-stats" id="tt-stats">
          <span class="stat-item">⚡ Скорость: <strong id="tt-speed">0</strong> сим/мин</span>
          <span class="stat-item">🎯 Точность: <strong id="tt-accuracy">100</strong>%</span>
          <span class="stat-item">❌ Ошибки: <strong id="tt-errors">0</strong></span>
          <span class="stat-item">⏱ Время: <strong id="tt-time">0:00</strong></span>
        </div>

        <!-- Карточка результата -->
        <div class="result-card" id="tt-result" style="display:none;">
          <h2 class="result-title">🎉 Упражнение завершено!</h2>
          <div class="result-stats">
            <div class="result-stat">
              <span class="result-stat-label">Скорость</span>
              <span class="result-stat-value" id="tt-res-speed">—</span>
              <span class="result-stat-unit">сим/мин</span>
            </div>
            <div class="result-stat">
              <span class="result-stat-label">Точность</span>
              <span class="result-stat-value" id="tt-res-accuracy">—</span>
              <span class="result-stat-unit">%</span>
            </div>
            <div class="result-stat">
              <span class="result-stat-label">Ошибки</span>
              <span class="result-stat-value" id="tt-res-errors">0</span>
              <span class="result-stat-unit">шт</span>
            </div>
            <div class="result-stat">
              <span class="result-stat-label">Время</span>
              <span class="result-stat-value" id="tt-res-time">—</span>
              <span class="result-stat-unit">сек</span>
            </div>
          </div>
          <div class="result-actions">
            <button class="btn btn-secondary" id="tt-btn-retry">🔄 Попробовать снова</button>
            <button class="btn btn-primary" id="tt-btn-next">➡️ Следующий уровень</button>
            <button class="btn btn-outline" id="tt-btn-menu">🏠 В меню</button>
          </div>
        </div>

      </div>
    `;

    // Построение индекса клавиш и привязка событий
    buildKeyMap();
    bindEvents();
  }

  // ─── Привязка событий ─────────────────────────────────────────────────────

  function bindEvents() {
    // Кнопки уровней
    _container.querySelectorAll('.level-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const lvlId = parseInt(btn.dataset.level, 10);
        startLevel(lvlId);
      });
    });

    // Поле ввода — основной обработчик нажатий
    const input = qs('tt-input');
    if (input) {
      input.addEventListener('keydown', onKeyDown);
      // Держим фокус только во время активного упражнения
      _container.addEventListener('click', () => {
        if (_currentLevel && !_isFinished) input.focus();
      });
    }

    // Результат — кнопки
    const btnRetry = qs('tt-btn-retry');
    const btnNext  = qs('tt-btn-next');
    const btnMenu  = qs('tt-btn-menu');

    if (btnRetry) btnRetry.addEventListener('click', () => startLevel(_currentLevel ? _currentLevel.id : 1));
    if (btnNext)  btnNext.addEventListener('click', () => {
      const nextId = Math.min((_currentLevel ? _currentLevel.id : 1) + 1, LEVELS.length);
      startLevel(nextId);
    });
    if (btnMenu) btnMenu.addEventListener('click', () => {
      if (typeof App !== 'undefined' && App.showScreen) App.showScreen('screen-menu');
    });
  }

  // ─── Начало упражнения ────────────────────────────────────────────────────

  function startLevel(levelId) {
    destroyTimers();

    _currentLevel = LEVELS.find(l => l.id === levelId) || LEVELS[0];
    _currentText  = pickRandom(_currentLevel.texts);
    _currentPos   = 0;
    _correctChars = 0;
    _errors       = 0;
    _totalKeystrokes = 0;
    _textStarted  = false;
    _startTime    = null;
    _isFinished   = false;

    // Сброс таймера на табло
    const timeEl = qs('tt-time');
    if (timeEl) timeEl.textContent = '0:00';

    if (_keyElementsMap.size === 0) {
      buildKeyMap();
    }

    // Скрываем результат
    const resultCard = qs('tt-result');
    if (resultCard) resultCard.style.display = 'none';

    // Заголовок уровня
    const title = qs('tt-level-title');
    if (title) title.textContent = `Уровень ${_currentLevel.id}: ${_currentLevel.name}`;

    // Активная кнопка уровня
    if (_container) {
      _container.querySelectorAll('.level-btn').forEach(btn => {
        btn.classList.toggle('active', parseInt(btn.dataset.level, 10) === levelId);
      });
    }

    // Рендерим текст и обновляем интерфейс
    renderText();
    updateStats();
    highlightNextKey();

    // Фокус на поле ввода
    const input = qs('tt-input');
    if (input) { input.value = ''; input.focus(); }
  }

  // ─── Рендер текста ────────────────────────────────────────────────────────

  function renderText() {
    const el = qs('tt-text');
    if (!el) return;
    el.innerHTML = _currentText.split('').map((ch, i) => {
      let cls = 'char';
      if (i < _currentPos) cls += ' char-correct';
      if (i === _currentPos) cls += ' char-current';
      return `<span class="${cls}" data-index="${i}">${ch === ' ' ? '&nbsp;' : ch}</span>`;
    }).join('');
  }

  // ─── Обработчик нажатий ───────────────────────────────────────────────────

  function onKeyDown(e) {
    // Игнорируем служебные клавиши
    if (e.ctrlKey || e.altKey || e.metaKey) return;
    if (['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Tab', 'Escape', 'F1', 'F2', 'F3', 'F4',
         'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12',
         'Insert', 'Delete', 'Home', 'End', 'PageUp', 'PageDown',
         'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
         'Backspace', 'Enter'].includes(e.key)) return;

    e.preventDefault();

    if (!_currentLevel || _isFinished || _currentPos >= _currentText.length) return;

    // Старт таймера при первом нажатии
    if (!_textStarted) {
      _textStarted = true;
      _startTime = Date.now();
      _timerInterval = setInterval(updateTimerDisplay, 1000);
    }

    const typedChar = e.key;
    const expectedChar = _currentText[_currentPos];
    const isCorrect = typedChar === expectedChar;

    _totalKeystrokes++;
    if (isCorrect) {
      _correctChars++;
    } else {
      _errors++;
    }

    // Обновляем span текущего символа
    const spans = qs('tt-text') ? qs('tt-text').querySelectorAll('span') : [];
    if (spans[_currentPos]) {
      spans[_currentPos].classList.remove('char-current');
      spans[_currentPos].classList.add(isCorrect ? 'char-correct' : 'char-wrong');
    }

    // Подсветка нажатой клавиши
    flashKey(typedChar);

    _currentPos++;

    // Следующая позиция или завершение
    if (_currentPos < _currentText.length) {
      if (spans[_currentPos]) spans[_currentPos].classList.add('char-current');
      highlightNextKey();
    } else {
      // Упражнение завершено
      finishSession();
      return;
    }

    updateStats();
  }

  // ─── Подсветка клавиш ────────────────────────────────────────────────────

  function flashKey(keyChar) {
    const kb = qs('tt-keyboard');
    if (!kb) return;

    // Убираем предыдущую активную
    kb.querySelectorAll('.key-active').forEach(k => k.classList.remove('key-active'));

    const keyEl = getKeyElement(keyChar);
    if (keyEl) {
      keyEl.classList.add('key-active');
      if (_activeKeyTimer) clearTimeout(_activeKeyTimer);
      _activeKeyTimer = setTimeout(() => {
        if (keyEl) keyEl.classList.remove('key-active');
      }, 150);
    }
  }

  function highlightNextKey() {
    const kb = qs('tt-keyboard');
    if (!kb) return;

    // Убираем предыдущую «следующую» клавишу
    kb.querySelectorAll('.key-next, .active').forEach(k => k.classList.remove('key-next', 'active'));

    if (_currentPos >= _currentText.length) {
      updateHandsHighlight(null);
      return;
    }

    const nextChar = _currentText[_currentPos];
    const keyEl = getKeyElement(nextChar);
    if (keyEl) {
      keyEl.classList.add('key-next', 'active');
    }

    // Обновляем подсветку на визуализаторе рук
    updateHandsHighlight(nextChar);
  }

  // ─── Интерактивный визуализатор рук ───────────────────────────────────────

  function updateHandsHighlight(char) {
    const visualizer = qs('tt-hands-visualizer');
    if (!visualizer) return;

    // 1. Снимаем предыдущую подсветку со всех пальцев
    visualizer.querySelectorAll('.finger-active').forEach(el => el.classList.remove('finger-active'));

    const cueHand   = visualizer.querySelector('#tt-cue-hand');
    const cueFinger = visualizer.querySelector('#tt-cue-finger');
    const cueKey    = visualizer.querySelector('#tt-cue-key');

    if (char === null || char === undefined || char === '') {
      if (cueHand)   cueHand.textContent = 'Упражнение';
      if (cueFinger) cueFinger.textContent = 'Завершено!';
      if (cueKey)    cueKey.textContent = '✓';
      return;
    }

    const lowerChar = char.toLowerCase();
    const info = FINGER_MAP[char] || FINGER_MAP[lowerChar];

    if (info) {
      // 2. Подсвечиваем соответствующий палец
      if (info.finger === 'thumb') {
        // Для пробела подсвечиваем оба больших пальца
        visualizer.querySelectorAll('[data-finger="thumb"], [data-finger="thumb-l"], [data-finger="thumb-r"]')
          .forEach(el => el.classList.add('finger-active'));
      } else {
        const targetFinger = visualizer.querySelector(`[data-finger="${info.finger}"]`);
        if (targetFinger) targetFinger.classList.add('finger-active');
      }

      // 3. Обновляем текстовые подсказки
      if (cueHand)   cueHand.textContent = info.handName;
      if (cueFinger) cueFinger.textContent = `${info.fingerName} палец`;
      if (cueKey)    cueKey.textContent = char === ' ' ? '␣ Пробел' : char.toUpperCase();
    } else {
      // Резервный случай для неизвестных символов
      if (cueHand)   cueHand.textContent = 'Символ';
      if (cueFinger) cueFinger.textContent = 'Нажмите клавишу';
      if (cueKey)    cueKey.textContent = char;
    }
  }

  // ─── Статистика и расчёт метрик ───────────────────────────────────────────

  function updateStats() {
    const speedEl    = qs('tt-speed');
    const accuracyEl = qs('tt-accuracy');
    const errorsEl   = qs('tt-errors');

    if (errorsEl) errorsEl.textContent = String(_errors);

    if (!_startTime || !_textStarted) {
      if (speedEl) speedEl.textContent = '0';
      if (accuracyEl) accuracyEl.textContent = '100';
      return;
    }

    const elapsedSeconds = (Date.now() - _startTime) / 1000;
    // Защита от первого всплеска (первая секунда)
    const speed = elapsedSeconds >= 1.0 ? Math.round((_correctChars / elapsedSeconds) * 60) : 0;

    const total = _correctChars + _errors;
    const accuracy = total > 0 ? Math.max(0, Math.min(100, Math.round((_correctChars / total) * 100))) : 100;

    if (speedEl) speedEl.textContent = String(speed);
    if (accuracyEl) accuracyEl.textContent = String(accuracy);
  }

  function updateTimerDisplay() {
    if (!_startTime) return;
    const elapsed = Math.round((Date.now() - _startTime) / 1000);
    const timeEl = qs('tt-time');
    if (timeEl) timeEl.textContent = formatTime(elapsed);
    updateStats();
  }

  // ─── Завершение упражнения (Контракт M2 ↔ M4) ─────────────────────────────

  function finishSession() {
    destroyTimers();
    _isFinished = true;

    const rawElapsed = _startTime ? (Date.now() - _startTime) / 1000 : 0;
    const elapsedSeconds = Math.max(1, Math.round(rawElapsed));
    const speed = Math.round((_correctChars / elapsedSeconds) * 60);
    const total = _correctChars + _errors;
    const accuracy = total > 0 ? Math.max(0, Math.min(100, Math.round((_correctChars / total) * 100))) : 100;
    const level = _currentLevel ? _currentLevel.id : 1;
    const date = new Date().toLocaleDateString('ru-RU');

    const sessionSummary = {
      speed,
      accuracy,
      errors: _errors,
      level,
      duration: elapsedSeconds,
      date
    };

    // Финальное обновление статистики
    const speedEl    = qs('tt-speed');
    const accuracyEl = qs('tt-accuracy');
    const errorsEl   = qs('tt-errors');
    const timeEl     = qs('tt-time');
    if (speedEl) speedEl.textContent = String(speed);
    if (accuracyEl) accuracyEl.textContent = String(accuracy);
    if (errorsEl) errorsEl.textContent = String(_errors);
    if (timeEl) timeEl.textContent = formatTime(elapsedSeconds);

    // Карточка результата
    const resultCard = qs('tt-result');
    if (resultCard) {
      resultCard.style.display = '';

      const resSpeed    = qs('tt-res-speed');
      const resAccuracy = qs('tt-res-accuracy');
      const resErrors   = qs('tt-res-errors');
      const resTime     = qs('tt-res-time');

      if (resSpeed) resSpeed.textContent = String(speed);
      if (resAccuracy) resAccuracy.textContent = String(accuracy);
      if (resErrors) resErrors.textContent = String(_errors);
      if (resTime) resTime.textContent = String(elapsedSeconds);

      // Убрать «Следующий уровень» на последнем уровне
      const btnNext = qs('tt-btn-next');
      if (btnNext) btnNext.style.display = level >= LEVELS.length ? 'none' : '';

      if (typeof resultCard.scrollIntoView === 'function') {
        resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }

    // Снимаем подсветку с клавиш и визуализатора рук
    const kb = qs('tt-keyboard');
    if (kb) {
      kb.querySelectorAll('.key-next, .key-active, .active').forEach(k => {
        k.classList.remove('key-next', 'key-active', 'active');
      });
    }
    updateHandsHighlight(null);

    // Снимаем фокус с поля ввода
    const input = qs('tt-input');
    if (input) input.blur();

    // Сохранение прогресса через App.saveProgress (M2 <-> M4)
    if (typeof App !== 'undefined' && App.saveProgress && App.state && App.state.currentStudent) {
      App.saveProgress(App.state.currentStudent.id, 'typing', sessionSummary);
    }

    return sessionSummary;
  }

  function finishExercise() {
    return finishSession();
  }

  // ─── Утилиты очистки ──────────────────────────────────────────────────────

  function destroyTimers() {
    if (_timerInterval) { clearInterval(_timerInterval); _timerInterval = null; }
    if (_activeKeyTimer) { clearTimeout(_activeKeyTimer); _activeKeyTimer = null; }
  }

  function destroy() {
    destroyTimers();
    _currentLevel = null;
    _textStarted  = false;
    _startTime    = null;
    _isFinished   = false;
    const timeEl = qs('tt-time');
    if (timeEl) timeEl.textContent = '0:00';
    updateHandsHighlight(null);
    const kb = qs('tt-keyboard');
    if (kb) {
      kb.querySelectorAll('.key-next, .key-active, .active').forEach(k => {
        k.classList.remove('key-next', 'key-active', 'active');
      });
    }
  }

  // ─── Публичный API ────────────────────────────────────────────────────────

  window.TypingTrainer = {
    /**
     * Рендерит UI тренажёра в контейнер с указанным id.
     * @param {string} containerId — id DOM-элемента
     */
    init(containerId) {
      renderUI(containerId);
    },

    /**
     * Начинает упражнение на указанном уровне (1–5).
     * @param {number} level
     */
    start(level) {
      const lvlId = Number(level) || 1;
      startLevel(Math.max(1, Math.min(lvlId, LEVELS.length)));
    },

    /**
     * Завершает текущую сессию печати и возвращает сводку метрик.
     * Контракт M2 <-> M4: { speed, accuracy, errors, level, duration, date }
     * @returns {Object}
     */
    finishSession() {
      return finishSession();
    },

    /**
     * Останавливает таймеры, очищает состояние и подсветки.
     * Вызывать при уходе со страницы тренажёра.
     */
    destroy() {
      destroy();
    }
  };

})();
