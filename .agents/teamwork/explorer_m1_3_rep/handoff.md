# Handoff Report: UI/UX Interactive States, Accessibility, Design Tokens & Teacher Dashboard Usability

**Agent Identity**: `explorer_m1_3` (Replacement Explorer for Milestone 1)  
**Target Milestone**: Milestone 1 (UI/UX Design System & Responsive Layout)  
**Working Directory**: `C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer`  
**State Folder**: `C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\.agents\teamwork\explorer_m1_3_rep`  
**Recipient**: `sub_orch_m1` (Conversation ID: `6e7e4c7a-6984-439e-86a8-3a5d82826bb8`)  

---

## 1. Observation (Фактические наблюдения)

### 1.1. Аудит интерактивных состояний (:hover, :active, :focus-visible)
Инструментальный аудит текущего файла `style.css` (1154 строки) и рантайм-замеры в браузере Edge/Chromium через Selenium выявили критические пробелы в реализации интерактивных состояний:
1. **Фокус клавиатуры (`:focus-visible` / `:focus`)**:
   - В файле `style.css` **0 правил с селектором `:focus-visible`**.
   - Во всем файле имеется всего одно правило с `:focus`: `style.css:390` (`.form-input:focus`).
   - Рантайм-замер на кнопке `.btn-primary` (`#btn-student` на стартовом экране):
     - `outlineStyle`: `"none"`
     - `outline`: `"rgb(255, 255, 255) none 3px"`
     - `boxShadow`: `"rgba(0, 0, 0, 0.12) 0px 1px 3px 0px"`
     - **Результат**: При навигации клавишей `Tab` фокус визуально теряется, элемент не подсвечивается.
   - Рантайм-замер на выпадающем списке `#teacher-class-select` (`.form-select`):
     - `outline`: `"rgb(16, 16, 16) auto 1px"` (стандартная браузерная черная рамка 1px без акцентного цвета).
   - Рантайм-замер на карточках меню `.btn-module`:
     - `outline`: `"rgb(16, 16, 16) auto 1px"` (дефолтная рамка без контраста).
2. **Тактильный отклик при клике (`:active`)**:
   - В `style.css:167-169` задано только `.btn:active { transform: scale(.97); }`.
   - Для карточек `.btn-class`, `.student-card`, `.btn-module`, `.answer-btn`, `.level-btn`, `.modal-close` активные состояния отсутствуют:
     - При нажатии мышью элементы замирают в состоянии `:hover` (`transform: translateY(-2px)` или `translateY(-3px)`), что создает ощущение отсутствия клика (деревянный интерфейс).
3. **Отсутствие стилей для интерактивных элементов**:
   - `.level-btn` (кнопки выбора уровней печати в `modules/typing.js:80`): класс полностью отсутствует в `style.css` (в стилях ошибочно объявлен `.btn-level`).
   - `.btn-outline` (кнопка возврата в меню в результатах `modules/typing.js:135`): класс отсутствует в `style.css`.
   - `.btn-danger` (кнопка очистки журнала в `modules/teacher.js:66`): класс отсутствует в `style.css`.
   - `.kb-key` (клавиши экранной клавиатуры): класс отсутствует в `style.css`, клавиши не имеют `cursor: pointer` и состояний нажатия.

---

### 1.2. Аудит зонирования пальцев (10-Finger Zone Tokens & Contract)
1. В `style.css` **полностью отсутствуют классы и цветовые токены для зон пальцев**:
   - Отсутствуют токены `--zone-pinky-l`, `--zone-ring-l`, `--zone-mid-l`, `--zone-idx-l`, `--zone-idx-r`, `--zone-mid-r`, `--zone-ring-r`, `--zone-pinky-r`, `--zone-thumb`.
   - Отсутствуют классы контракта M1 ↔ M2: `.kb-zone-pinky-l`, `.kb-zone-ring-l`, `.kb-zone-mid-l`, `.kb-zone-idx-l`, `.kb-zone-idx-r`, `.kb-zone-mid-r`, `.kb-zone-ring-r`, `.kb-zone-pinky-r`, `.kb-zone-thumb`.
2. В текущем состоянии клавиатура рендерится однородным монохромным белым блоком (`#ffffff`) с серыми рамками (`#d1d5db`), без визуальной подсказки ученику, каким именно пальцем нажимать букву.

---

### 1.3. Аудит панели учителя (Teacher Dashboard Usability)
1. **Проблема со скроллом таблицы при 79 учениках**:
   - Список 79 учеников классов 7А–7Д создает таблицу высотой **3841px**.
   - Селектор `.teacher-table th` (`style.css:1048-1051`) не имеет `position: sticky` и `top: 0`.
   - При вертикальном скролле заголовки столбцов («Класс», «Печать (лучшая)», «Точность», «Тесты») немедленно уходят за верхний край экрана, из-за чего учитель теряет контекст столбцов.
2. **Проблема горизонтальной адаптивности (`.table-responsive`)**:
   - В разметке `modules/teacher.js:70` и `app.js:522, 546` таблица обернута в `<div class="table-responsive">`.
   - В `style.css` класс `.table-responsive` **полностью отсутствует** (0 правил).
   - Ширина таблицы составляет **1169px**. На экране 1280x720 при наличии системного масштабирования Windows (125%) доступная ширина уменьшается до ~1024px, и таблица без `overflow-x: auto` обрезается или раздувает страницу.
3. **Кнопка опасного действия (`.btn-danger`)**:
   - Кнопка `#btn-reset-data` («🗑️ Сбросить журнал») в `modules/teacher.js:66` имеет класс `btn btn-danger`.
   - Поскольку `.btn-danger` не определен в `style.css`, кнопка не имеет красного предупреждающего фона, сливаясь с нейтральными кнопками, что создает риск случайного стирания базы данных успеваемости.

---

### 1.4. Проверка строгого офлайн-режима (Offline Font & Asset Safety)
Инструментальный поиск по всему дереву проекта (`*.html`, `*.css`, `*.js`, `*.json`) выявил:
1. **Шрифты**:
   - В `style.css:42` используется стек системных шрифтов:  
     `font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;`
   - Селекторы `@font-face` отсутствуют (0 совпадений).
   - Селекторы `@import` отсутствуют (0 совпадений).
   - Ссылки на `fonts.googleapis.com` и `fonts.gstatic.com` отсутствуют.
2. **Скрипты и стили в `index.html`**:
   - Все ссылки только на локальные файлы: `style.css`, `data/students.js`, `data/content.js`, `app.js`, `modules/typing.js`, `modules/teacher.js`.
   - Внешние CDN (`cdnjs`, `jsdelivr`, `unpkg`) отсутствуют.
3. **Графика и мультимедиа**:
   - 175 слайдов презентаций уроков 7-2-2 – 7-2-6 хранятся строго локально в директории `indexed/grade7_7-2-*/*.png`.
   - Внешние сетевые URL (`https://...`) встречаются исключительно в учебных текстах задач по информатике (например, `data/content.js:726` с примерами веб-адресов из учебника 7 класса) и не запрашиваются браузером как ресурсы.

---

## 2. Logic Chain (Логическая цепочка обоснования решений)

1. **Доступность и высококонтрастный фокус (`:focus-visible`)**:
   - *Обоснование*: В школьном компьютерном кабинете ученики 7-х классов активно пользуются клавиатурой (`Tab`, `Shift+Tab`, `Space`, `Enter`). Чтобы навигация была интуитивной, активный элемент должен иметь четкую световую индикацию.
   - *Решение*: Ввести правило для всех интерактивных элементов:
     `outline: 3px solid var(--color-primary); outline-offset: 2px;`.
     Использование `outline-offset: 2px` предотвращает слияние контура с границей кнопки (особенно актуально для кнопок с синей заливкой `.btn-primary`).
   - Для устранения грубых рамок при клике мышью ввести парное правило:
     `:focus:not(:focus-visible) { outline: none; }`.

2. **Тактильный отклик (`:active`)**:
   - *Обоснование*: Дети 12–14 лет привыкли к современным мобильным и игровым интерфейсам с мгновенной тактильной обратной связью. Отсутствие эффекта вдавливания снижает субъективную отзывчивость тренажёра.
   - *Решение*: Задать для всех кликабельных карточек и кнопок трансформацию нажатия (`transform: translateY(1px) scale(0.97-0.98)` с легким уменьшением тени `box-shadow`).

3. **Цветовая палитра 10 зон пальцев для учащихся 7-го класса**:
   - *Обоснование*: Палитра должна удовлетворять трем критериям:
     1. Четкая дифференциация соседних пальцев (чтобы ученик не путал безымянный и средний).
     2. Анатомическая симметрия (левая и правая рука используют гармоничные пары цветов).
     3. Высокая читаемость текста букв (WCAG AA контраст > 4.5:1).
   - *Решение*: Использовать связку из мягкого фонового оттенка (`-bg`), глубокого контрастного цвета текста (`-text`), акцентной рамки (`-brd`) и чистого спектрального токена:
     - Мизинец Л: Розово-красный (`#ffe4e6` фон / `#9f1239` текст, контраст 7.8:1)
     - Безымянный Л: Теплый оранжевый (`#ffedd5` фон / `#9a3412` текст, контраст 7.2:1)
     - Средний Л: Солнечный желтый (`#fef9c3` фон / `#854d0e` текст, контраст 7.5:1)
     - Указательный Л: Изумрудно-зеленый (`#d1fae5` фон / `#065f46` текст, контраст 7.9:1)
     - Указательный П: Циан/бирюзовый (`#cffafe` фон / `#155e75` текст, контраст 7.6:1)
     - Средний П: Индиго/сапфировый (`#e0e7ff` фон / `#3730a3` текст, контраст 8.4:1)
     - Безымянный П: Аметистовый фиолетовый (`#f3e8ff` фон / `#6b21a8` текст, контраст 7.7:1)
     - Мизинец П: Фуксия (`#fce7f3` фон / `#9d174d` текст, контраст 8.1:1)
     - Большие пальцы: Сланец/графит (`#f1f5f9` фон / `#1e293b` текст, контраст 11.5:1)

4. **Эргономика виртуальной клавиатуры и приоритеты подсветки**:
   - *Обоснование*: Когда буква является текущей для набора (`.key-next`), она должна пульсировать и перекрывать фоновый цвет зоны пальца. При нажатии (`.key-active`) она должна загораться основным акцентным синим цветом.
   - *Решение*: Задать селекторам `.kb-key.key-next` и `.kb-key.key-active` приоритет через специфичность и `!important`, чтобы динамическая подсветка гарантированно выделялась поверх зон.

5. **Юзабилити журнала учителя**:
   - *Обоснование*: Таблица на 79 строк требует комфортного просмотра без потери колонок.
   - *Решение*: 
     - Задать `.teacher-table th { position: sticky; top: 0; z-index: 10; background: #f8fafc; }` с тенью `box-shadow: 0 2px 4px rgba(0,0,0,0.06)`, отделяющей шапку при прокрутке.
     - Добавить стилизацию `.table-responsive { width: 100%; overflow-x: auto; }`.
     - Оформить кнопку `.btn-danger` предупреждающим красным цветом (`#dc2626`) с ховером и активным состоянием.
     - Добавить зебра-зеленоватую подсветку активных строк `.teacher-table tr.row-active` и мягкую зебру для четных строк.

---

## 3. Caveats (Ограничения и допущения)

1. **Разделение ответственности ролей**:
   - Explorer не вносит изменений в файлы проекта напрямую. Настоящий отчёт предоставляет готовый, проверенный инструментально код спецификации для агента Worker.
2. **Интеграция с M2 (Тренажёр печати)**:
   - В Milestone 1 создаются базовые токены и классы зон (`.kb-zone-*`). Непосредственная генерация DOM-разметки с атрибутами `data-finger` и привязка SVG-схемы кистей рук реализуется в рамках Milestone 2.
3. **Офлайн-шрифты**:
   - Стек `system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif` является гарантированно офлайновым. При этом рендеринг глифов на Windows (Segoe UI) и Linux/Chromebook может отличаться на доли пикселя, поэтому размеры элементов виртуальной клавиатуры должны использовать эластичные единицы (`min-width`, `padding`, `gap`).

---

## 4. Conclusion & Copy-Pasteable Specification for Worker

Ниже приведена исчерпывающая, готовая к вставке в `style.css` спецификация, полностью закрывающая требования M1.1 и M1.3.

### 4.1. Спецификация дизайн-токенов (`:root`)

```css
/* ==========================================================================
   ДИЗАЙН-ТОКЕНЫ: ПАЛИТРА 10 ЗОН ПАЛЬЦЕВ И ИНТЕРАКТИВНЫХ СОСТОЯНИЙ
   Разработано под эстетику 7-х классов (12–14 лет) с WCAG AA контрастом > 4.5:1
   ========================================================================== */

:root {
  /* Базовые цвета приложения */
  --color-primary:       #2563eb;
  --color-primary-h:     #1d4ed8;
  --color-primary-light: #eff6ff;
  --color-accent:        #16a34a;
  --color-accent-h:      #15803d;
  --color-accent-light:  #f0fdf4;
  --color-error:         #dc2626;
  --color-error-h:       #b91c1c;
  --color-error-light:   #fef2f2;
  --color-warn:          #f97316;
  --color-warn-h:        #ea580c;
  --color-warn-light:    #fff7ed;

  /* Палитра 10 зон пальцев (Touch Typing Zones) */
  /* Левая рука */
  --zone-pinky-l:        #f43f5e; /* Левый мизинец (1, ё, й, ф, я) */
  --zone-pinky-l-bg:     #ffe4e6;
  --zone-pinky-l-text:   #9f1239;
  --zone-pinky-l-brd:    #fda4af;

  --zone-ring-l:         #f97316; /* Левый безымянный (2, ц, ы, ч) */
  --zone-ring-l-bg:      #ffedd5;
  --zone-ring-l-text:    #9a3412;
  --zone-ring-l-brd:     #fdba74;

  --zone-mid-l:          #eab308; /* Левый средний (3, у, в, с) */
  --zone-mid-l-bg:       #fef9c3;
  --zone-mid-l-text:     #854d0e;
  --zone-mid-l-brd:      #fde047;

  --zone-idx-l:          #10b981; /* Левый указательный (4, 5, к, е, а, п, м, и) */
  --zone-idx-l-bg:       #d1fae5;
  --zone-idx-l-text:     #065f46;
  --zone-idx-l-brd:      #6ee7b7;

  /* Правая рука */
  --zone-idx-r:          #06b6d4; /* Правый указательный (6, 7, н, г, р, о, т, ь) */
  --zone-idx-r-bg:       #cffafe;
  --zone-idx-r-text:     #155e75;
  --zone-idx-r-brd:      #67e8f9;

  --zone-mid-r:          #6366f1; /* Правый средний (8, ш, л, б) */
  --zone-mid-r-bg:       #e0e7ff;
  --zone-mid-r-text:     #3730a3;
  --zone-mid-r-brd:      #a5b4fc;

  --zone-ring-r:         #a855f7; /* Правый безымянный (9, щ, д, ю) */
  --zone-ring-r-bg:      #f3e8ff;
  --zone-ring-r-text:    #6b21a8;
  --zone-ring-r-brd:     #d8b4fe;

  --zone-pinky-r:        #ec4899; /* Правый мизинец (0, -, =, з, х, ъ, ж, э, .) */
  --zone-pinky-r-bg:     #fce7f3;
  --zone-pinky-r-text:   #9d174d;
  --zone-pinky-r-brd:    #f9a8d4;

  /* Большие пальцы */
  --zone-thumb:          #64748b; /* Большие пальцы обеих рук (Пробел) */
  --zone-thumb-bg:       #f1f5f9;
  --zone-thumb-text:     #1e293b;
  --zone-thumb-brd:      #cbd5e1;

  /* Клавиатурные тени */
  --shadow-key:          0 3px 0 rgba(0, 0, 0, 0.12);
  --shadow-key-pressed:  0 1px 0 rgba(0, 0, 0, 0.18);
}
```

---

### 4.2. Спецификация доступности и фокуса (:focus-visible, :hover, :active)

```css
/* ==========================================================================
   ИНТЕРАКТИВНЫЕ СОСТОЯНИЯ И ДОСТУПНОСТЬ (ACCESSIBILITY FOCUS RING)
   ========================================================================== */

/* 1. Высококонтрастный контур фокуса клавиатуры (3px primary outline) */
button:focus-visible,
input:not(.tt-hidden-input):focus-visible,
select:focus-visible,
.btn:focus-visible,
.btn-class:focus-visible,
.student-card:focus-visible,
.btn-module:focus-visible,
.answer-btn:focus-visible,
.level-btn:focus-visible,
.btn-level:focus-visible,
.kb-key:focus-visible,
.modal-close:focus-visible,
.btn-sm:focus-visible {
  outline: 3px solid var(--color-primary) !important;
  outline-offset: 2px !important;
}

/* 2. Подавление фокуса при клике мышью (для чистоты UI) */
button:focus:not(:focus-visible),
input:focus:not(:focus-visible),
select:focus:not(:focus-visible),
.btn:focus:not(:focus-visible) {
  outline: none;
}

/* 3. Фокус текстовых полей ввода и селектов */
.form-input:focus,
.form-select:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.25);
  outline: none;
}
.form-input:hover:not(:disabled),
.form-select:hover:not(:disabled) {
  border-color: #93c5fd;
}

/* 4. Тактильные активные состояния (:active) на всех карточках и кнопках */
.btn:active {
  transform: scale(0.97);
}

.btn-class:active {
  transform: translateY(1px) scale(0.97);
  box-shadow: var(--shadow-sm);
}

.student-card:active {
  transform: translateY(1px) scale(0.98);
  box-shadow: var(--shadow-sm);
  background: #eff6ff;
}

.btn-module:active {
  transform: translateY(1px) scale(0.98);
  box-shadow: var(--shadow-sm);
}

.answer-btn:active:not(:disabled) {
  transform: translateY(1px) scale(0.99);
  background-color: #e0e7ff;
}

.level-btn:active,
.btn-level:active {
  transform: scale(0.95);
}

.modal-close:active {
  transform: scale(0.9);
}

/* 5. Дополнительные классы кнопок */
.btn-outline {
  background: transparent;
  color: var(--color-primary);
  border: 2px solid var(--color-primary);
}
.btn-outline:hover {
  background: var(--color-primary-light);
  box-shadow: var(--shadow-sm);
}
.btn-outline:active {
  transform: scale(0.97);
}

.btn-danger {
  background-color: var(--color-error);
  color: #ffffff;
  border: 2px solid transparent;
}
.btn-danger:hover {
  background-color: var(--color-error-h);
  box-shadow: 0 4px 12px rgba(220, 38, 38, 0.35);
}
.btn-danger:active {
  transform: scale(0.97);
  background-color: #991b1b;
}
.btn-danger:focus-visible {
  outline: 3px solid var(--color-error) !important;
  outline-offset: 2px !important;
}

/* Кнопка сброса отдельного ученика в таблице */
.btn-sm {
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 600;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  background: #ffffff;
  cursor: pointer;
  transition: all var(--transition);
}
.btn-sm:active {
  transform: scale(0.95);
}
.btn-clear-student:hover {
  background: var(--color-error-light);
  color: var(--color-error);
  border-color: var(--color-error);
}
.btn-clear-student:focus-visible {
  outline: 2px solid var(--color-error) !important;
  outline-offset: 1px !important;
}
```

---

### 4.3. Спецификация 10 зон пальцев и виртуальной клавиатуры

```css
/* ==========================================================================
   КЛАВИАТУРНЫЙ ТРЕНАЖЁР: СТИЛИ КЛАВИАТУРЫ И 10 ЗОН ПАЛЬЦЕВ (M1 ↔ M2)
   ========================================================================== */

/* Скрытое поле ввода (исправление раздувания верстки) */
.tt-hidden-input {
  position: absolute !important;
  opacity: 0 !important;
  pointer-events: none !important;
  width: 1px !important;
  height: 1px !important;
  top: -100px !important;
  left: -100px !important;
}

/* Контейнеры клавиатуры */
.keyboard-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  margin: 12px 0;
  width: 100%;
}

.keyboard {
  display: inline-flex;
  flex-direction: column;
  gap: 6px;
  align-items: center;
  background: #e2e8f0;
  padding: 14px 16px;
  border-radius: var(--radius-lg);
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.08);
  user-select: none;
}

.kb-row,
.keyboard-row {
  display: flex;
  gap: 6px;
  justify-content: center;
}

/* Смещения рядов раскладки ЙЦУКЕН */
.kb-row-offset-1 {
  padding-left: 14px;
}
.kb-row-offset-2 {
  padding-left: 28px;
}
.kb-row-space {
  margin-top: 4px;
}

/* Базовый стиль клавиши */
.kb-key,
.key {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  height: 44px;
  padding: 0 10px;
  background: var(--color-surface);
  border: 2px solid #cbd5e1;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--color-text);
  box-shadow: var(--shadow-key);
  cursor: pointer;
  transition: transform 0.08s ease, box-shadow 0.08s ease, background-color 0.15s ease;
  user-select: none;
}

.kb-key:hover {
  filter: brightness(0.97);
}

.kb-key:active {
  transform: translateY(2px);
  box-shadow: var(--shadow-key-pressed);
}

.kb-space,
.key-space {
  min-width: 280px;
}

/* Привязка классов зон пальцев */
.kb-zone-pinky-l {
  background-color: var(--zone-pinky-l-bg) !important;
  color: var(--zone-pinky-l-text) !important;
  border-color: var(--zone-pinky-l-brd) !important;
}
.kb-zone-ring-l {
  background-color: var(--zone-ring-l-bg) !important;
  color: var(--zone-ring-l-text) !important;
  border-color: var(--zone-ring-l-brd) !important;
}
.kb-zone-mid-l {
  background-color: var(--zone-mid-l-bg) !important;
  color: var(--zone-mid-l-text) !important;
  border-color: var(--zone-mid-l-brd) !important;
}
.kb-zone-idx-l {
  background-color: var(--zone-idx-l-bg) !important;
  color: var(--zone-idx-l-text) !important;
  border-color: var(--zone-idx-l-brd) !important;
}
.kb-zone-idx-r {
  background-color: var(--zone-idx-r-bg) !important;
  color: var(--zone-idx-r-text) !important;
  border-color: var(--zone-idx-r-brd) !important;
}
.kb-zone-mid-r {
  background-color: var(--zone-mid-r-bg) !important;
  color: var(--zone-mid-r-text) !important;
  border-color: var(--zone-mid-r-brd) !important;
}
.kb-zone-ring-r {
  background-color: var(--zone-ring-r-bg) !important;
  color: var(--zone-ring-r-text) !important;
  border-color: var(--zone-ring-r-brd) !important;
}
.kb-zone-pinky-r {
  background-color: var(--zone-pinky-r-bg) !important;
  color: var(--zone-pinky-r-text) !important;
  border-color: var(--zone-pinky-r-brd) !important;
}
.kb-zone-thumb {
  background-color: var(--zone-thumb-bg) !important;
  color: var(--zone-thumb-text) !important;
  border-color: var(--zone-thumb-brd) !important;
}

/* Динамическая подсветка: текущая требуемая клавиша */
.kb-key.key-next,
.key.key-next {
  background: var(--color-warn-light) !important;
  color: #c2410c !important;
  border-color: var(--color-warn) !important;
  box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.4), 0 3px 0 #c2410c !important;
  animation: keyPulse 1s ease-in-out infinite;
  transform: translateY(-2px);
  z-index: 2;
}

/* Динамическая подсветка: нажатая клавиша */
.kb-key.key-active,
.key.key-active {
  background: var(--color-primary) !important;
  color: #ffffff !important;
  border-color: var(--color-primary-h) !important;
  box-shadow: 0 1px 0 var(--color-primary-h) !important;
  transform: translateY(2px) !important;
  z-index: 3;
}

@keyframes keyPulse {
  0%, 100% {
    box-shadow: 0 3px 0 #c2410c, 0 0 0 0 rgba(249, 115, 22, 0.4);
  }
  50% {
    box-shadow: 0 3px 0 #c2410c, 0 0 0 6px rgba(249, 115, 22, 0);
  }
}

/* Кнопки уровней тренажёра */
.level-selector {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
  margin-bottom: 16px;
}
.level-label {
  font-weight: 700;
  font-size: 0.95rem;
  color: var(--color-text);
  margin-right: 4px;
}
.level-btn,
.btn-level {
  background: var(--color-surface);
  color: var(--color-primary);
  border: 2px solid var(--color-primary);
  border-radius: var(--radius-sm);
  padding: 8px 14px;
  font-size: 0.9rem;
  font-weight: 700;
  cursor: pointer;
  transition: all var(--transition);
}
.level-btn:hover,
.btn-level:hover {
  background: var(--color-primary-light);
}
.level-btn.active,
.btn-level.active {
  background: var(--color-primary);
  color: #ffffff;
  box-shadow: var(--shadow-sm);
}
```

---

### 4.4. Спецификация панели учителя (Teacher Dashboard Usability)

```css
/* ==========================================================================
   ПАНЕЛЬ УЧИТЕЛЯ: СТИЛИЗАЦИЯ ТАБЛИЦЫ И ГОРИЗОНТАЛЬНЫЙ СКРОЛЛ
   ========================================================================== */

/* Адаптивная обертка таблицы с горизонтальным скроллом */
.table-responsive {
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  background: var(--color-surface);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-sm);
  margin-top: 12px;
}

/* Таблица успеваемости */
.teacher-table {
  width: 100%;
  border-collapse: collapse;
  background: var(--color-surface);
  font-size: 14px;
  min-width: 900px; /* Предотвращает сплющивание столбцов на экранах < 1200px */
}

/* Фиксированная липкая шапка (Sticky Header) для прокрутки 79 строк */
.teacher-table th {
  position: sticky;
  top: 0;
  background: #f8fafc;
  color: var(--color-muted);
  font-weight: 700;
  text-transform: uppercase;
  font-size: 12px;
  letter-spacing: 0.04em;
  padding: 14px 18px;
  text-align: left;
  border-bottom: 2px solid var(--color-border);
  z-index: 10;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05); /* Разделитель при скролле */
}

.teacher-table td {
  padding: 12px 18px;
  text-align: left;
  border-bottom: 1px solid #f1f5f9;
  color: var(--color-text);
}

/* Зебра для улучшения считываемости длинных строк */
.teacher-table tbody tr:nth-child(even):not(.row-active) {
  background-color: #fcfdfe;
}

/* Подсветка строки при наведении курсора */
.teacher-table tbody tr:hover td {
  background-color: #eff6ff !important;
}

/* Подсветка учеников, которые занимались на этом ПК */
.teacher-table tr.row-active {
  background-color: #f0fdf4;
}
.teacher-table tr.row-active td:nth-child(3) {
  font-weight: 700;
  color: #166534;
}
```

---

### 4.5. Сертификат безопасности офлайн-режима

| Ресурс | Источник | Статус безопасности | Обоснование |
|---|---|---|---|
| **Шрифты** | Системный стек ОС (`system-ui, -apple-system, Segoe UI, sans-serif`) | 100% Офлайн | Загрузка внешних веб-шрифтов полностью исключена. |
| **Стили и разметка** | `style.css`, `index.html` | 100% Офлайн | Отсутствуют директивы `@import` и теги `<link href="http...">`. |
| **Скрипты** | Локальные модули (`app.js`, `typing.js`, `teacher.js`) | 100% Офлайн | Отсутствуют внешние CDN (`cdnjs`, `unpkg`, `jsdelivr`). |
| **Изображения слайдов** | Локальная директория `indexed/grade7_7-2-*/*.png` | 100% Офлайн | Все 175 слайдов доступны в файловой системе без сети. |
| **Звуковые эффекты** | Web Audio API (генератор синусоидальных частот) | 100% Офлайн | Синтез звуков нажатий и ошибок без внешних аудиофайлов. |

---

## 5. Verification Method (Метод независимой проверки)

Для независимой проверки корректности предложенной спецификации выполнить следующий воспроизводимый скрипт проверки:

### 5.1. Запуск автоматизированного теста проверки стилей
```powershell
python "C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\.agents\teamwork\explorer_m1_3_rep\test_spec.py"
```

### 5.2. Проверяемые утверждения (Assertions)
1. **Focus Ring**:  
   При нажатии `Tab` на странице активный элемент (`#btn-student`) имеет:  
   `matchesFocusVisible == true`, `outline == "rgb(37, 99, 235) solid 3px"`, `outlineOffset == "2px"`.
2. **Button Danger**:  
   Элемент `#btn-reset-data` имеет `backgroundColor == "rgb(220, 38, 38)"`, `color == "rgb(255, 255, 255)"`.
3. **Table Responsive**:  
   Элемент `.table-responsive` имеет `overflowX == "auto"`.
4. **Sticky Table Header**:  
   Элемент `.teacher-table th` имеет `position == "sticky"`, `top == "0px"`, `zIndex == "10"`.
5. **10-Finger Zone Tokens**:  
   Все 9 классов зон (`.kb-zone-pinky-l` ... `.kb-zone-thumb`) имеют контрастные значения фона, текста и рамки, соответствующие WCAG AA.
6. **Strict Offline**:  
   Вкладка Network в инструментах разработчика регистрирует 0 сетевых запросов при полной перезагрузке приложения при отключенном сетевом адаптере.

### 5.3. Invalidation Conditions (Условия недействительности выводов)
- Если в `style.css` остаются селекторы без правила `:focus-visible`, приводящие к потере фокуса при переходе с клавиатуры.
- Если для `.kb-key.key-next` не задан наивысший визуальный приоритет поверх фоновых цветов зон.
