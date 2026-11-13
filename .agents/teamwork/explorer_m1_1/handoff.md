# Аналитический отчёт и спецификация CSS (Explorer M1.1)

**Дата проведения**: 2026-11-11  
**Субагент**: `explorer_m1_1` (UI/UX Explorer)  
**Целевой проект**: `C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer`  
**Фокус**: Детальное исследование всех расхождений CSS-классов между JS-разметкой (`index.html`, `app.js`, `modules/typing.js`, `modules/teacher.js`) и таблицей стилей `style.css`, картирование устаревших селекторов, устранение раздувания клавиатуры и дефектов вьюпорта, а также готовая спецификация CSS для рабочего агента (Worker).

---

## 1. Observation (Фактические наблюдения)

### 1.1. Инвентаризация расхождений классов между кодом и `style.css`

При сканировании кодовой базы (`index.html`, `app.js`, `modules/typing.js`, `modules/teacher.js`) и стилей `style.css` выявлены следующие критические нестыковки:

#### Группа A: Модуль слепой печати (`modules/typing.js`)
1. `modules/typing.js:74`: `<div class="typing-trainer">` — класс `.typing-trainer` **отсутствует в `style.css`**. В результате у контейнера тренажёра нет ограничений по максимальной ширине и центровки.
2. `modules/typing.js:78`: `<span class="level-label">Уровень:</span>` — класс `.level-label` **отсутствует в `style.css`**.
3. `modules/typing.js:80`: `<button class="level-btn" data-level="${l.id}">` — класс `.level-btn` **отсутствует в `style.css`** (в `style.css:665` объявлен устаревший неиспользуемый селектор `.btn-level`). Кнопки выбора уровней рендерятся как стандартные кнопки без стилей состояний.
4. `modules/typing.js:86`: `<div class="level-title" id="tt-level-title">` — класс `.level-title` **отсутствует в `style.css`**.
5. `modules/typing.js:89`: `<div class="typing-text-wrap">` — класс `.typing-text-wrap` **отсутствует в `style.css`**.
6. `modules/typing.js:94`: `<input type="text" id="tt-input" class="tt-hidden-input" ...>` — класс `.tt-hidden-input` **отсутствует в `style.css`**. Поле ввода отображается на экране как серый инпут размером 173x19px по координатам `x=32, y=303`.
7. `modules/typing.js:99`: `<div class="keyboard-wrap">` — класс `.keyboard-wrap` **отсутствует в `style.css`**.
8. `modules/typing.js:150`: `<div class="kb-row ${offsetClass}">` — класс `.kb-row` **отсутствует в `style.css`** (в `style.css:456` объявлен селектор `.keyboard-row`).
9. `modules/typing.js:149`: `offsetClass = rowIndex === 1 ? 'kb-row-offset-1' : rowIndex === 2 ? 'kb-row-offset-2' : ''` — классы `.kb-row-offset-1` и `.kb-row-offset-2` **отсутствуют в `style.css`**, из-за чего ряды клавиш не имеют физического смещения (ступенчатости) стандартной раскладки.
10. `modules/typing.js:152`: `<div class="kb-key" data-key="${key}">` — класс `.kb-key` **отсутствует в `style.css`** (в `style.css:460` объявлен селектор `.key`). В computed styles браузера `.kb-key` получает `display: block; width: 15.6875px; height: 21px; border: 0px none; box-shadow: none;`. Клавиши вытягиваются вертикально одна под другой, раздувая высоту контейнера клавиатуры `#tt-keyboard` до **711px**, а страницы — до **1119px**.
11. `modules/typing.js:157`: `<div class="kb-row kb-row-space">` — класс `.kb-row-space` **отсутствует в `style.css`**.
12. `modules/typing.js:158`: `<div class="kb-key kb-space" data-key=" ">Пробел</div>` — класс `.kb-space` **отсутствует в `style.css`** (в `style.css:477` объявлен `.key-space`).
13. `modules/typing.js:107-109`: `<span class="stat-item">...</span>` — класс `.stat-item` **отсутствует в `style.css`**.
14. `modules/typing.js:135`: `<button class="btn btn-outline" id="tt-btn-menu">🏠 В меню</button>` — класс `.btn-outline` **отсутствует в `style.css`**.

#### Группа B: Карточка результатов тестирования и упражнений (`app.js` и `modules/typing.js`)
15. `app.js:469` и `modules/typing.js:114`: `<h2 class="result-title">` — класс `.result-title` **отсутствует в `style.css`** (в `style.css:559` объявлен `.result-card h3`, не захватывающий `h2.result-title`).
16. `app.js:470` и `modules/typing.js:115`: `<div class="result-stats">` — класс `.result-stats` **отсутствует в `style.css`** (в `style.css:565` объявлен `.result-metrics`).
17. `app.js:471` и `modules/typing.js:116`: `<div class="result-stat">` — класс `.result-stat` **отсутствует в `style.css`** (в `style.css:571` объявлен `.result-metric`).
18. `app.js:472` и `modules/typing.js:117`: `<span class="result-stat-label">` — класс `.result-stat-label` **отсутствует в `style.css`** (в `style.css:582` объявлен `.metric-label`).
19. `app.js:473` и `modules/typing.js:118`: `<span class="result-stat-value">` — класс `.result-stat-value` **отсутствует в `style.css`** (в `style.css:577` объявлен `.metric-value`).
20. `modules/typing.js:119, 124, 129`: `<span class="result-stat-unit">` — класс `.result-stat-unit` **отсутствует в `style.css`**.

#### Группа C: Панель учителя (`modules/teacher.js` и `app.js`)
21. `modules/teacher.js:66`: `<button id="btn-reset-data" class="btn btn-danger">🗑️ Сбросить журнал</button>` — класс `.btn-danger` **отсутствует в `style.css`**. Опасное действие сброса выглядит как стандартная блеклая кнопка без предупреждающего акцента.
22. `modules/teacher.js:70`, `app.js:522`, `app.js:546`: `<div class="table-responsive">` — класс `.table-responsive` **полностью отсутствует в `style.css`**. Таблица на 79 учеников не изолирована по скроллу.
23. `style.css:1047`: `.teacher-table th` не имеет `position: sticky; top: 0;`, из-за чего при прокрутке 79 строк шапка улетает за пределы видимости.

#### Группа D: Утилиты, модальные окна и экраны (`app.js`)
24. `app.js:50`: `target.classList.add('fade-in');` — класс `.fade-in` **отсутствует в `style.css`**.
25. `app.js:196, 260, 360, 507`: `<p class="no-results">` — класс `.no-results` **отсутствует в `style.css`** в 4 экранах (список учеников, материалы, тесты, личная статистика).
26. `app.js:304`: `<div class="slide-no-img">` — класс `.slide-no-img` **отсутствует в `style.css`**.
27. `app.js:615`: `<div class="modal-body">${htmlContent}</div>` — класс `.modal-body` **отсутствует в `style.css`**.
28. `app.js:274`: `<div class="mat-actions">` — класс `.mat-actions` **отсутствует в `style.css`**.
29. `app.js:275`: `<button class="btn btn-primary btn-open-slides">` — класс `.btn-open-slides` **отсутствует в `style.css`**.
30. `app.js:373`: `<button class="btn btn-primary btn-start-test">` — класс `.btn-start-test` **отсутствует в `style.css`**.
31. `app.js:421`: `<span class="ans-text">${opt}</span>` — класс `.ans-text` **отсутствует в `style.css`** (в CSS оформлен только маркер `.ans-letter`).
32. `app.js:211`: `<span class="st-name">${student.name}</span>` — класс `.st-name` **отсутствует в `style.css`**.

#### Группа E: Зонирование 10 пальцев (Контракт M1 ↔ M2 из PROJECT.md)
33–41. Классы `.kb-zone-pinky-l`, `.kb-zone-ring-l`, `.kb-zone-mid-l`, `.kb-zone-idx-l`, `.kb-zone-idx-r`, `.kb-zone-mid-r`, `.kb-zone-ring-r`, `.kb-zone-pinky-r`, `.kb-zone-thumb` — **отсутствуют в `style.css`**.

---

### 1.2. Анализ устаревших и неиспользуемых селекторов в `style.css`

В `style.css` обнаружены следующие блоки мертвого/несовпадающего кода, который необходимо связать с рабочими классами или заменить:

| Селектор в `style.css` | Строка | Реальный селектор в коде JS/HTML | Статус и действие |
|---|---|---|---|
| `.keyboard-row` | line 456 | `.kb-row` | Объединить: `.kb-row, .keyboard-row` |
| `.key` | line 460 | `.kb-key` | Объединить: `.kb-key, .key` |
| `.key-space` | line 477 | `.kb-space` | Объединить: `.kb-space, .key-space` |
| `.btn-level` | line 665 | `.level-btn` | Объединить: `.level-btn, .btn-level` |
| `.result-card h3` | line 559 | `.result-title` | Заменить/дополнить: `.result-title, .result-card h3` |
| `.result-metrics` | line 565 | `.result-stats` | Объединить: `.result-stats, .result-metrics` |
| `.result-metric` | line 571 | `.result-stat` | Объединить: `.result-stat, .result-metric` |
| `.metric-value` | line 577 | `.result-stat-value` | Объединить: `.result-stat-value, .metric-value` |
| `.metric-label` | line 582 | `.result-stat-label` | Объединить: `.result-stat-label, .metric-label` |
| `.btn-student`, `.student-num` | line 292, 313 | `.student-card`, `.student-badge`, `.st-name` | Устаревший прототип (удалить или замапить на `.student-card`) |
| `.teacher-panel`, `.teacher-sidebar`, `.teacher-content`, `.teacher-nav-btn`, `.stats-table` | line 597–655 | `.teacher-dashboard`, `.teacher-stats-bar`, `.teacher-toolbar`, `.teacher-table` | Устаревший двухколоночный прототип панели учителя, полностью дублирующий реальные стили со строки 976 |

---

## 2. Logic Chain (Логическая цепочка обоснования)

1. **Причина разрушения клавиатурного тренажёра**:
   - `modules/typing.js` рендерит клавиатуру с тегами `<div class="kb-key">`.
   - В `style.css:460` стили привязаны к селектору `.key`.
   - Браузер применяет к `.kb-key` дефолтные правила `display: block; width: auto; height: auto;`.
   - Все 33 клавиши выстраиваются вертикальным списком. Высота блока клавиатуры возрастает до **711px**, вызывая гигантский скролл на ноутбуках (1119px высота документа при высоте окна 577px на 1280x720).
   - *Решение*: Ввести селектор `.kb-key, .key` с `display: inline-flex; align-items: center; justify-content: center; min-width: 44px; height: 44px;` и задать `.keyboard-wrap` и `.kb-row`.

2. **Причина видимости скрытого инпута `#tt-input`**:
   - `modules/typing.js:94` использует `<input class="tt-hidden-input">`.
   - В `style.css` класс `.tt-hidden-input` отсутствует.
   - Браузер отображает стандартный текстовый инпут 173x19px по координатам `x=32, y=303`.
   - *Решение*: Добавить `.tt-hidden-input { position: absolute; opacity: 0; pointer-events: none; width: 1px; height: 1px; top: -100px; left: -100px; }`.

3. **Причина деформации результатов тестирования и печати**:
   - Модули генерируют `.result-stats > .result-stat > .result-stat-value + .result-stat-label + .result-stat-unit`.
   - В `style.css` прописаны `.result-metrics > .result-metric > .metric-value + .metric-label`.
   - Селекторы не совпадают, вёрстка карточки результатов ломается в однострочный сплошной текст.
   - *Решение*: Объединить селекторы через запятую в `style.css` и добавить оформление `.result-stat-unit`.

4. **Причина переполнения слайдера на 1280x720 и 1366x768**:
   - `.modal-box` имеет жесткое ограничение `max-height: 90vh`, а картинка слайда `.slide-image` имеет `max-height: 520px`.
   - На высоте экрана 720px (viewport ~577px) модальное окно требует 786px, что превышает 519px доступного места (`scrollHeight: 786 > clientHeight: 519`). Возникает внутренний скроллбар, скрывающий кнопки переключения слайдов.
   - *Решение*: Применить эластичный `clamp`: `.slide-image { max-height: clamp(240px, 46vh, 480px); object-fit: contain; }` и сделать панель навигации `.slide-nav-bar` липкой (`position: sticky; top: 0; background: #fff; z-index: 5;`).

5. **Причина растягивания карточек учеников на 1920x1080**:
   - В `style.css:288` задано `grid-template-columns: repeat(2, 1fr)`.
   - На Full HD карточка растягивается до ширины **905px** (800px пустоты между фамилией и бейджем).
   - *Решение*: Заменить на адаптивную автосетку: `grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));`.

6. **Причина смещения 5-го класса в `screen-class`**:
   - На 1280px и 1366px кнопки 7А–7Г занимают 4 места, а 7Д сиротливо падает во 2-й ряд по центру.
   - *Решение*: `justify-content: center; gap: 16px; flex-wrap: wrap;` или авто-fit с центровкой.

7. **Причина отсутствия наглядности и доступности**:
   - Во всем `style.css` ровно 0 селекторов `:focus-visible`.
   - *Решение*: Добавить универсальный акцентный контур `outline: 3px solid var(--color-primary); outline-offset: 2px;` на `:focus-visible` для всех интерактивных элементов (`button`, `input`, `select`, `.btn`, `.student-card`, `.answer-btn`, `.level-btn`, `.kb-key`).

---

## 3. Caveats (Ограничения и допущения)

1. **Разрешения и масштабирование ОС**:
   - На школьных мониторах 1366x768 часто выставлен системный масштаб Windows 125%, что дает эффективную высоту вьюпорта ~550px. Все правила клавиатуры и модалок спроектированы так, чтобы гарантированно помещаться без скролла при высоте от 540px.
2. **Обратная совместимость (Zero-Regressions)**:
   - Чтобы не сломать никакие будущие или существующие зависимости, устаревшие имена классов (`.key`, `.keyboard-row`, `.key-space`, `.btn-level`, `.result-metrics`, `.result-metric`) не удаляются, а объявляются как алиасы через запятую (например, `.kb-key, .key { ... }`).
3. **Автономность (Strict Offline)**:
   - В спецификации используются исключительно локальные CSS Custom Properties, системные шрифты и CSS3/SVG эффекты. Запрещены любые URL-импорты (`@import url(...)`) и внешние ресурсы.

---

## 4. Conclusion & Concrete CSS Recommendation (Спецификация для Worker)

Ниже представлена готовая спецификация CSS для рабочего агента (`worker_m1`), разделенная на функциональные модули.

### Спецификация 1: Дизайн-токены и переменные 10 зон пальцев (`:root`)

```css
/* ─── Дизайн-токены (расширение :root) ───────────────────────── */
:root {
  /* Базовая цветовая гамма */
  --color-primary:   #2563eb;
  --color-primary-h: #1d4ed8;
  --color-accent:    #16a34a;
  --color-accent-h:  #15803d;
  --color-error:     #dc2626;
  --color-error-h:   #b91c1c;
  --color-warn:      #f97316;
  --color-warn-h:    #ea580c;

  --color-bg:        #f0f4ff;
  --color-surface:   #ffffff;
  --color-border:    #d1d5db;
  --color-text:      #1e293b;
  --color-muted:     #64748b;

  /* Палитра 10 зон ответственности пальцев (ЙЦУКЕН) */
  --zone-pinky-l:        #e11d48; /* Левый мизинец: 1, ё, й, ф, я */
  --zone-pinky-l-bg:     #ffe4e6;
  --zone-pinky-l-border: #fecdd3;

  --zone-ring-l:         #ea580c; /* Левый безымянный: 2, ц, ы, ч */
  --zone-ring-l-bg:      #ffedd5;
  --zone-ring-l-border:  #fed7aa;

  --zone-mid-l:          #ca8a04; /* Левый средний: 3, у, в, с */
  --zone-mid-l-bg:       #fef9c3;
  --zone-mid-l-border:   #fef08a;

  --zone-idx-l:          #16a34a; /* Левый указательный: 4, 5, к, е, а, п, м, и */
  --zone-idx-l-bg:       #dcfce7;
  --zone-idx-l-border:   #bbf7d0;

  --zone-idx-r:          #0891b2; /* Правый указательный: 6, 7, н, г, р, о, т, ь */
  --zone-idx-r-bg:       #cffafe;
  --zone-idx-r-border:   #bae6fd;

  --zone-mid-r:          #4f46e5; /* Правый средний: 8, ш, л, б */
  --zone-mid-r-bg:       #e0e7ff;
  --zone-mid-r-border:   #c7d2fe;

  --zone-ring-r:         #9333ea; /* Правый безымянный: 9, щ, д, ю */
  --zone-ring-r-bg:      #f3e8ff;
  --zone-ring-r-border:  #ddd6fe;

  --zone-pinky-r:        #db2777; /* Правый мизинец: 0, -, =, з, х, ъ, ж, э */
  --zone-pinky-r-bg:     #fce7f3;
  --zone-pinky-r-border: #fbcfe8;

  --zone-thumb:          #475569; /* Большие пальцы: пробел */
  --zone-thumb-bg:       #f1f5f9;
  --zone-thumb-border:   #cbd5e1;

  /* Радиусы и тени для клавиш */
  --radius-sm:  8px;
  --radius-md:  12px;
  --radius-lg:  20px;
  --shadow-key: 0 3px 0 rgba(0, 0, 0, 0.14);
  --shadow-key-pressed: 0 1px 0 rgba(0, 0, 0, 0.18);
  --transition: 0.18s ease;
}
```

### Спецификация 2: Клавиатурный тренажёр и схема клавиш (`modules/typing.js`)

```css
/* ─── Контейнер тренажёра слепой печати ─────────────────────── */
.typing-trainer {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 920px;
  margin: 0 auto;
  gap: 12px;
}

/* Выбор уровня */
.level-selector {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
  margin-bottom: 4px;
}
.level-label {
  font-weight: 700;
  color: var(--color-muted);
  font-size: 0.95rem;
  margin-right: 4px;
}
.level-btn,
.btn-level {
  background: var(--color-surface);
  color: var(--color-primary);
  border: 2px solid var(--color-primary);
  border-radius: var(--radius-sm);
  padding: 8px 16px;
  font-size: 0.9rem;
  font-weight: 700;
  cursor: pointer;
  transition: all var(--transition);
  user-select: none;
}
.level-btn:hover,
.btn-level:hover,
.level-btn.active,
.btn-level.active {
  background: var(--color-primary);
  color: #fff;
  transform: translateY(-1px);
  box-shadow: var(--shadow-sm);
}
.level-btn:active,
.btn-level:active {
  transform: translateY(1px);
}

/* Заголовок текущего уровня */
.level-title {
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--color-text);
  padding: 8px 14px;
  background: #e0e7ff;
  border-radius: var(--radius-sm);
  border-left: 4px solid var(--color-primary);
  text-align: left;
}

/* Обёртка текста для набора */
.typing-text-wrap {
  width: 100%;
  margin: 4px 0;
}
.typing-text {
  font-size: 1.45rem;
  font-family: 'Courier New', Courier, monospace;
  background: var(--color-surface);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 16px 20px;
  line-height: 2.0;
  letter-spacing: 0.06em;
  word-break: break-all;
  min-height: 72px;
}

/* Скрытое поле ввода */
.tt-hidden-input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
  width: 1px;
  height: 1px;
  top: -100px;
  left: -100px;
}

/* Обёртка и схема клавиатуры */
.keyboard-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  margin: 6px 0;
}
.keyboard {
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: center;
  background: #e2e8f0;
  padding: 12px 14px;
  border-radius: var(--radius-lg);
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.06);
  width: 100%;
  max-width: 800px;
  user-select: none;
}
.kb-row,
.keyboard-row {
  display: flex;
  gap: 5px;
  justify-content: center;
  width: 100%;
}
.kb-row.kb-row-offset-1 {
  padding-left: 14px;
}
.kb-row.kb-row-offset-2 {
  padding-left: 28px;
}
.kb-row.kb-row-space {
  margin-top: 2px;
}

/* Оформление клавиши */
.kb-key,
.key {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  height: 44px;
  padding: 0 8px;
  background: var(--color-surface);
  border: 2px solid var(--color-border);
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--color-text);
  box-shadow: var(--shadow-key);
  transition: transform 0.08s ease, box-shadow 0.08s ease, background 0.12s ease;
  cursor: pointer;
  user-select: none;
  box-sizing: border-box;
}
.kb-key:active,
.key:active {
  transform: translateY(2px);
  box-shadow: var(--shadow-key-pressed);
}
.kb-space,
.key-space {
  min-width: 280px;
  font-size: 0.85rem;
  color: var(--color-muted);
}

/* Классы подсветки клавиш */
.kb-key.key-active,
.key.key-active {
  background: var(--color-primary) !important;
  border-color: var(--color-primary-h) !important;
  color: #fff !important;
  box-shadow: 0 1px 0 var(--color-primary-h) !important;
  transform: translateY(2px) !important;
}
.kb-key.key-next,
.key.key-next {
  border-color: var(--color-warn) !important;
  box-shadow: 0 2px 0 #c2410c, 0 0 0 3px rgba(249, 115, 22, 0.35) !important;
  animation: keyPulse 1s ease-in-out infinite;
}

/* Цветовые зоны 10 пальцев для клавиш */
.kb-zone-pinky-l { background: var(--zone-pinky-l-bg); color: var(--zone-pinky-l); border-color: var(--zone-pinky-l-border); }
.kb-zone-ring-l  { background: var(--zone-ring-l-bg);  color: var(--zone-ring-l);  border-color: var(--zone-ring-l-border); }
.kb-zone-mid-l   { background: var(--zone-mid-l-bg);   color: var(--zone-mid-l);   border-color: var(--zone-mid-l-border); }
.kb-zone-idx-l   { background: var(--zone-idx-l-bg);   color: var(--zone-idx-l);   border-color: var(--zone-idx-l-border); }
.kb-zone-idx-r   { background: var(--zone-idx-r-bg);   color: var(--zone-idx-r);   border-color: var(--zone-idx-r-border); }
.kb-zone-mid-r   { background: var(--zone-mid-r-bg);   color: var(--zone-mid-r);   border-color: var(--zone-mid-r-border); }
.kb-zone-ring-r  { background: var(--zone-ring-r-bg);  color: var(--zone-ring-r);  border-color: var(--zone-ring-r-border); }
.kb-zone-pinky-r { background: var(--zone-pinky-r-bg); color: var(--zone-pinky-r); border-color: var(--zone-pinky-r-border); }
.kb-zone-thumb   { background: var(--zone-thumb-bg);   color: var(--zone-thumb);   border-color: var(--zone-thumb-border); }

/* Статистика в реальном времени */
.typing-stats {
  display: flex;
  justify-content: center;
  gap: 24px;
  padding: 10px 18px;
  background: var(--color-surface);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-sm);
  margin-top: 6px;
  flex-wrap: wrap;
}
.stat-item {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--color-text);
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.stat-item strong {
  color: var(--color-primary);
  font-size: 1.15rem;
}
```

### Спецификация 3: Карточки результатов (`app.js` и `typing.js`)

```css
/* ─── Карточка результатов тестирования и упражнений ────────── */
.result-card {
  background: var(--color-surface);
  border: 2px solid var(--color-accent);
  border-radius: var(--radius-lg);
  padding: 28px 32px;
  text-align: center;
  box-shadow: var(--shadow-md);
  animation: fadeIn 0.3s ease both;
  max-width: 600px;
  margin: 0 auto;
}
.result-title,
.result-card h3 {
  font-size: 1.45rem;
  font-weight: 800;
  color: var(--color-accent);
  margin-bottom: 20px;
}
.result-stats,
.result-metrics {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}
.result-stat,
.result-metric {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  min-width: 90px;
  background: #f8fafc;
  padding: 12px 16px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
}
.result-stat-label,
.metric-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.result-stat-value,
.metric-value {
  font-size: 2.2rem;
  font-weight: 800;
  color: var(--color-primary);
  line-height: 1.1;
}
.result-stat-unit {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-muted);
}
.btn-outline {
  background: transparent;
  color: var(--color-muted);
  border: 2px solid var(--color-border);
  padding: 12px 22px;
  font-size: 1rem;
  font-weight: 600;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition);
}
.btn-outline:hover {
  background: var(--color-surface);
  color: var(--color-text);
  border-color: var(--color-muted);
}
```

### Спецификация 4: Панель учителя и адаптивные таблицы (`modules/teacher.js`)

```css
/* ─── Панель учителя и адаптивная таблица ────────────────────── */
.table-responsive {
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-sm);
  background: #ffffff;
}
.teacher-table {
  width: 100%;
  border-collapse: collapse;
}
.teacher-table th {
  position: sticky;
  top: 0;
  background: #f8fafc;
  color: var(--color-muted);
  font-weight: 700;
  z-index: 2;
  box-shadow: 0 1px 0 var(--color-border);
}
.btn-danger {
  background: var(--color-error);
  color: #ffffff;
  border: 2px solid transparent;
  padding: 10px 18px;
  font-size: 0.95rem;
  font-weight: 600;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all var(--transition);
}
.btn-danger:hover {
  background: var(--color-error-h);
  box-shadow: 0 4px 12px rgba(220, 38, 38, 0.25);
  transform: translateY(-1px);
}
.btn-danger:active {
  transform: translateY(1px) scale(0.98);
}
```

### Спецификация 5: Утилиты, модальные окна и экраны (`app.js`)

```css
/* ─── Утилиты и компоненты экранов ─────────────────────────── */
.fade-in {
  animation: fadeIn 0.25s ease both;
}
.no-results {
  text-align: center;
  color: var(--color-muted);
  font-size: 1.05rem;
  padding: 40px 20px;
  background: #ffffff;
  border-radius: var(--radius-md);
  border: 2px dashed var(--color-border);
  width: 100%;
  grid-column: 1 / -1;
  margin: 12px 0;
}
.slide-no-img {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 260px;
  width: 100%;
  color: #94a3b8;
  font-size: 1.1rem;
  font-weight: 500;
  background: #1e293b;
  border-radius: var(--radius-md);
  text-align: center;
  padding: 30px 20px;
}
.modal-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
  flex: 1;
  min-height: 0;
}
.mat-actions {
  display: flex;
  margin-top: auto;
  width: 100%;
}
.btn-open-slides {
  width: 100%;
  justify-content: center;
}
.btn-start-test {
  width: 100%;
  justify-content: center;
  margin-top: auto;
}
.ans-text {
  flex: 1;
  line-height: 1.4;
  color: var(--color-text);
  text-align: left;
}
.st-name {
  font-weight: 600;
  color: var(--color-text);
  font-size: 1rem;
}
```

### Спецификация 6: Глобальные интерактивные состояния и доступность (`:focus-visible`, `:active`)

```css
/* ─── Интерактивные состояния и контуры доступности ────────── */
button:focus-visible,
input:focus-visible,
select:focus-visible,
.btn:focus-visible,
.student-card:focus-visible,
.btn-module:focus-visible,
.btn-class:focus-visible,
.answer-btn:focus-visible,
.level-btn:focus-visible,
.kb-key:focus-visible,
.btn-back:focus-visible,
.modal-close:focus-visible {
  outline: 3px solid var(--color-primary);
  outline-offset: 2px;
}

.student-card:active,
.btn-module:active,
.btn-class:active,
.answer-btn:active,
.level-btn:active {
  transform: translateY(1px) scale(0.98);
}
```

### Спецификация 7: Адаптивные медиа-запросы под разрешения (1280x720, 1366x768, 1920x1080)

```css
/* ─── Адаптивная верстка (Multi-Resolution Queries) ─────────── */

/* Эластичные отступы на контейнерах экранов */
.screen-body {
  padding: clamp(16px, 2.5vw, 32px);
}

/* Список классов: центровка и гармоничное распределение */
.class-grid {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 16px;
}

/* Список учеников: автосетка вместо жестких 2 колонок */
.student-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 12px;
}

/* Главное меню: отцентрированная автосетка */
.module-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  max-width: 1100px;
  margin: 0 auto;
  gap: 20px;
}

/* Ноутбуки и компактные экраны (до 1366px и высота до 768px) */
@media (max-width: 1366px), (max-height: 768px) {
  .modal-box {
    max-height: calc(100vh - 36px);
    padding: 16px;
  }
  .slide-image {
    max-height: clamp(220px, 44vh, 420px);
    object-fit: contain;
  }
  .slide-nav-bar {
    position: sticky;
    top: 0;
    background: var(--color-surface);
    z-index: 5;
    padding-bottom: 8px;
  }
  .kb-key,
  .key {
    min-width: 40px;
    height: 40px;
    font-size: 0.9rem;
    padding: 0 6px;
  }
  .kb-space,
  .key-space {
    min-width: 240px;
  }
  .typing-text {
    font-size: 1.3rem;
    padding: 12px 16px;
    line-height: 1.8;
  }
}

/* Большие мониторы Full HD (1920x1080+) */
@media (min-width: 1600px) {
  .student-grid {
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    max-width: 1400px;
    margin: 0 auto;
  }
  .module-grid {
    max-width: 1240px;
    gap: 24px;
  }
}
```

---

## 5. Verification Method (Метод проверки)

Для независимой валидации отчёта и тестирования предложенной спецификации:

1. **Запуск скрипта проверки покрытия классов**:
   ```powershell
   python "C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\.agents\teamwork\explorer_m1_1\test_coverage.py"
   ```
   *Ожидаемый результат*: Скрипт подтверждает, что все обнаруженные отсутствующие классы полностью покрыты спецификацией (`Uncovered missing classes: set()`).

2. **Проверка вёрстки на целевых разрешениях в Playwright/Chromium**:
   - 1280x720: высота клавиатуры `< 300px`, модалка презентации помещается без вертикального переполнения окна (`modal_scrollHeight <= modal_clientHeight`).
   - 1366x768: шапка таблицы учителя фиксируется при вертикальной прокрутке (`position: sticky; top: 0`).
   - 1920x1080: карточки учеников имеют ширину `<= 340px` (нет растягивания до 905px).

3. **Условия признания выводов недействительными (Invalidation Conditions)**:
   - Если в `style.css` после внедрения спецификации останется хотя бы один непокрытый селектор из списка 37 классов.
   - Если при высоте вьюпорта 577px (окно 1280x720) клавиатура тренажёра вызывает принудительный скролл более 100px.
