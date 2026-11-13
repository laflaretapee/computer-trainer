# Отчёт исследования UI/UX архитектуры, CSS и адаптивной верстки (Explorer 2)

**Дата проведения**: 2026-11-11  
**Субагент**: `explorer_survey_2`  
**Целевой проект**: Локальный офлайн-тренажёр по информатике для 7-х классов (`C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer`)  
**Область исследования**: UI/UX структура, CSS-стили, верстка экранов, причины визуальных наложений и коллизий на разрешениях 1280x720, 1366x768, 1920x1080, интерактивные состояния (hover/active/focus), интерфейс панели учителя, эстетические требования для школьников 7-го класса (12–14 лет).

---

## 1. Observation (Фактические наблюдения)

### 1.1. Расхождения между разметкой в JS и селекторами в CSS (37 отсутствующих классов)
Инструментальный аудит разметки (`index.html`, `app.js`, `modules/typing.js`, `modules/teacher.js`) и таблицы стилей `style.css` выявил **37 используемых в коде CSS-классов, которые полностью отсутствуют в `style.css`**:

1. **Модуль клавиатурного тренажёра (`modules/typing.js`)**:
   - `modules/typing.js:149-158`: генерирует разметку:
     ```javascript
     html += `<div class="kb-row ${offsetClass}">`;
     row.forEach(key => {
       html += `<div class="kb-key" data-key="${key}">${key.toUpperCase()}</div>`;
     });
     html += `</div>`;
     // Пробел:
     html += `<div class="kb-row kb-row-space"><div class="kb-key kb-space" data-key=" ">Пробел</div></div>`;
     ```
   - Классы `.kb-row`, `.kb-key`, `.kb-space`, `.kb-row-space`, `.keyboard-wrap`, `.typing-trainer` **отсутствуют в `style.css`**.
   - При этом в `style.css:456-480` объявлены неиспользуемые правила для других селекторов: `.keyboard-row`, `.key`, `.key-space`!
   - В результате в рантайме браузера Edge/Chromium computed styles для `.kb-key` составляют:
     `display: block`, `width: 15.6875px`, `height: 21px`, `border: 0px none`, `border-radius: 0px`, `box-shadow: none` (зафиксировано в `resolution_audit.json`).
   - Клавиши клавиатуры отображаются как голые блочные элементы друг под другом. Высота контейнера клавиатуры `#tt-keyboard` раздувается до **711px**, а общая высота страницы тренажёра достигает **1119px**, что почти вдвое превышает высоту экрана ноутбука (577–625px)!
   - `modules/typing.js:94`: `<input type="text" id="tt-input" class="tt-hidden-input" ... />`.
     Класс `.tt-hidden-input` **отсутствует в `style.css`**. Поле ввода отображается на экране как видимый стандартный белый инпут размером `173x19px` прямо над клавиатурой (`x=32, y=303`).
   - `modules/typing.js:80`: `<button class="level-btn" data-level="${l.id}">`.
     Класс `.level-btn` **отсутствует в `style.css`** (в CSS объявлен несовпадающий селектор `.btn-level`). Кнопки выбора уровней не имеют стилей, ховеров и активных состояний.
   - `modules/typing.js:115-131` и `app.js:470-484`: карточки результатов генерируют разметку:
     `<div class="result-stats"><div class="result-stat"><span class="result-stat-label">...</span><span class="result-stat-value">...</span></div></div>`.
     Классы `.result-stats`, `.result-stat`, `.result-stat-label`, `.result-stat-value`, `.result-stat-unit`, `.result-title` **отсутствуют в `style.css`** (в CSS объявлены `.result-metrics`, `.result-metric`, `.metric-value`, `.metric-label`). В результате блок результатов рендерится неотформатированным.

2. **Панель учителя (`modules/teacher.js`)**:
   - `modules/teacher.js:66`: `<button id="btn-reset-data" class="btn btn-danger">🗑️ Сбросить журнал</button>`.
     Класс `.btn-danger` **отсутствует в `style.css`**. Кнопка опасного сброса данных отображается без красного предупреждающего фона.
   - `modules/teacher.js:70` и `app.js:522, 546`: `<div class="table-responsive"><table ...>`.
     Класс `.table-responsive` **полностью отсутствует в `style.css`** (нет ни `overflow-x: auto`, ни `width: 100%`).

3. **Общие компоненты и экраны (`app.js`)**:
   - `app.js:48, 50`: `target.classList.add('fade-in')`. Класс `.fade-in` **отсутствует в `style.css`** (в CSS задана keyframes-анимация `fadeIn` в `style.css:53` для `.screen`, но вспомогательного utility-класса `.fade-in` нет).
   - `app.js:196, 260, 360, 507`: `<p class="no-results">`. Класс `.no-results` **отсутствует в `style.css`**. Пустые состояния не отцентрированы и не оформлены.
   - `app.js:304`: `<div class="slide-no-img">`. Класс `.slide-no-img` **отсутствует в `style.css`**.

---

### 1.2. Поведение на стандартных разрешениях (1280x720, 1366x768, 1920x1080)
В файле `style.css` **полностью отсутствуют медиа-запросы (`@media`)** (0 совпадений по всему файлу). Вся верстка использует жесткие фиксированные размеры, что вызывает следующие проблемы:

| Экран / Компонент | Разрешение 1280x720 (viewport ~1248x577) | Разрешение 1366x768 (viewport ~1334x625) | Разрешение 1920x1080 (viewport ~1888x937) |
|---|---|---|---|
| **Слепая печать (`#screen-typing`)** | Высота контента **1119px** при высоте окна 577px. Принудительный вертикальный скролл на 542px. Видимый серый `#tt-input`. Клавиатура разорвана на 711px. | Высота контента **1119px** при высоте окна 625px. Принудительный вертикальный скролл на 494px. | Высота контента **1119px** при высоте окна 937px. Вертикальный скролл на 182px. Строка набора растягивается на 1809px (нечитабельно). |
| **Слайдер презентаций (модальное окно)** | `scrollHeight = 786px` при `clientHeight = 519px`. **Вертикальный перелив на 267px**. Внутренний скроллбар модалки отрезает панель навигации и заметки к слайду от самого слайда. | `scrollHeight = 786px` при `clientHeight = 563px`. **Вертикальный перелив на 223px**. Окно обрезает картинку и заметки. | `scrollHeight = 787px` при `clientHeight = 787px`. Вписывается впритирку без запаса под заметки. |
| **Выбор ученика (`#screen-student`)** | Сетка `grid-template-columns: repeat(2, 1fr)`. Карточка шириной 578px. 15 учеников требуют 8 рядов (высота 482px + шапка = **697px**), принудительный скролл. | Карточка шириной 621px. Общая высота **697px**, принудительный скролл окна. | Сетка из 2 колонок растягивает каждую карточку ученика до **905px ширины**! Имя слева, бейдж справа, между ними 800px пустоты. |
| **Главное меню (`#screen-menu`)** | `docH: 659px` при окне 577px. Скролл окна. Сетка зафиксирована на `max-width: 760px`. | `docH: 659px` при окне 625px. Легкий скролл. Сетка зафиксирована на `max-width: 760px`. | Огромное пустое пространство справа (>1100px пустоты), так как `module-grid` жестко ограничен 760px и прижат влево. |
| **Выбор класса (`#screen-class`)** | 4 кнопки в первом ряду, 5-я кнопка переносится в одиночестве на 2-й ряд (`x=483px, y=254px`), создавая визуальную асимметрию. | 4 кнопки в первом ряду, 5-я кнопка сиротливо переносится на 2-й ряд (`x=526px, y=254px`). | 5 кнопок встают в 1 ряд (`height: 100px, y: 134px`). |
| **Панель учителя (`#screen-teacher`)** | Таблица из 8 колонок шириной 1169px. При боковых отступах экрана (32+32=64px) доступно ровно 1184px — нулевой запас. При масштабе Windows 125% таблица вываливается в горизонтальный скролл. 79 строк дают высоту **3841px** без sticky-шапки. | Таблица шириной 1255px. 79 строк дают высоту **3841px**. Шапка таблицы `<thead>` улетает вверх при прокрутке. | Колонки растягиваются на 1809px, строка таблицы становится слишком разреженной для быстрого зрительного восприятия. |

---

### 1.3. Состояния интерактивных элементов (Hover, Active, Focus)
Аудит стилей показал:
1. **Фокус ввода (`:focus` / `:focus-visible`)**:
   - Во всем файле `style.css` (1154 строки) присутствует **ровно 1 селектор `:focus`** — `style.css:390` (`.form-input:focus`).
   - Во всем файле **0 селекторов `:focus-visible`**.
   - На кнопках `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-back`, `.btn-class`, `.btn-module`, `.student-card`, `.answer-btn`, `.level-btn` состояние фокуса либо полностью отсутствует, либо выключено (`outlineStyle: "none"` на `.btn-primary`), что нарушает критерий приемки R1/Acceptance Criteria.
   - Элемент выпадающего списка `.form-select` (фильтр классов в панели учителя) не имеет стилей `:focus`.
2. **Активные состояния (`:active`)**:
   - Правило `.btn:active { transform: scale(.97); }` существует только для базового `.btn`.
   - Для карточек `.student-card`, `.btn-module`, `.btn-class`, `.answer-btn` заданы ховеры со смещением вверх (`translateY(-2px)` / `translateY(-3px)`), но `:active` отсутствует. При нажатии мыши карточка не "прожимается", отсутствует тактильный отклик.
3. **Клавиши клавиатуры**:
   - Отсутствует курсор `pointer` и возможность нажимать клавиши виртуальной клавиатуры мышью (отработка события клика).

---

### 1.4. Готовность под требования 7-го класса и тренажёр мыши (R3, R4, R5)
1. **Зонирование пальцев (R3)**:
   - В текущей верстке и стилях клавиатуры цветовая разметка 10 зон ответственности пальцев **полностью отсутствует** (все клавиши имеют одинаковый нейтральный фон `#ffffff` и серую рамку `#d1d5db`).
   - Отсутствует схема/силуэты кистей рук с индикацией пальцев.
2. **Тренажёр мыши (R4)**:
   - В главном меню (`#screen-menu` в `index.html`) присутствует 4 модуля (`typing`, `theory`, `test`, `stats`). **Кнопка и экран модуля мыши отсутствуют**.
   - Нет компонентов для упражнений: одиночный клик по мишеням, двойной клик по иконкам папок/файлов, правый клик с кастомным контекстным меню, drag-and-drop перетаскивание файлов/устройств, hover-испытания.
3. **Геймификация (R5)**:
   - Отсутствует отображение шкалы опыта (XP), звезд за качество (⭐⭐⭐), уровней мастерства и бейджей достижений на экранах ученика.

---

## 2. Logic Chain (Логическая цепочка обоснования)

1. **Несоответствие имен классов (JS vs CSS)**:
   - *Факт*: `modules/typing.js` генерирует DOM с классами `.kb-key`, `.kb-row`, `.level-btn`, `.tt-hidden-input`, а `style.css` содержит стили для `.key`, `.keyboard-row`, `.btn-level`.
   - *Следствие*: Клавиши рендерятся браузером по дефолтным стилям `<div>` (`display: block`).
   - *Вывод*: Это главная причина гигантского раздувания тренажёра печати до 1119px и разрушения клавиатуры. Для устранения необходимо синхронизировать селекторы и ввести полноценную BEM-модель клавиатуры с классами пальцевых зон (`kb-key--zone-pinky-l`, `kb-key--zone-index-r` и т.д.).

2. **Отсутствие адаптивных медиа-запросов (`@media`)**:
   - *Факт*: Фиксированные паддинги `padding: 32px` на `.screen-body`, фиксированные высоты модальных окон `max-height: 520px` для картинки слайда, фиксированные колонки `repeat(2, 1fr)`.
   - *Следствие*:
     - При высоте 720px слайдер вылезает за пределы `90vh`, заставляя школьника скроллить модалку.
     - При ширине 1920px карточки учеников растягиваются до 905px, выглядя пустыми и диспропорциональными.
     - 5 классов на 1280px и 1366px раскладываются как 4 + 1 сирота.
   - *Вывод*: Необходима модульная сетка с `clamp()`, `minmax()` и медиа-запросами для 3 ключевых диапазонов (до 1366px, 1366–1600px, 1600px+).

3. **Юзабилити панели учителя при 79 учениках**:
   - *Факт*: 79 строк дают высоту 3841px. Шапка `<thead>` не имеет `position: sticky`. Класс `.table-responsive` пуст.
   - *Следствие*: Учитель при прокрутке списка 7А–7Д теряет контекст столбцов (где скорость, где точность, где число тестов). При уменьшении окна таблица может обрезаться.
   - *Вывод*: Необходима фиксация шапки таблицы (`position: sticky; top: 0; background: var(--color-surface); z-index: 5;`), стилизация `.table-responsive` (`overflow-x: auto; -webkit-overflow-scrolling: touch;`), фильтрация по классам на лету и явная стилизация `.btn-danger` для предотвращения случайного сброса данных.

4. **Доступность и интерактивный отклик (Acceptance Criteria)**:
   - *Факт*: В CSS отсутствует псевдокласс `:focus-visible` для всех кнопок и карточек.
   - *Следствие*: Навигация с клавиатуры (клавишами `Tab`, `Enter`, `Space`) в школьном кабинете не дает обратной связи.
   - *Вывод*: Необходима глобальная система фокуса: единый акцентный контур `:focus-visible { outline: 3px solid var(--color-primary); outline-offset: 2px; }` и тактильные состояния `:active { transform: translateY(1px) scale(0.98); }`.

---

## 3. Caveats (Ограничения и допущения)

1. **Разрешения экранов и масштабирование ОС**:
   - Тестирование проводилось при 100% DPI масштабировании (96 DPI). В реальных школьных кабинетах на ноутбуках 1366x768 часто включен системный масштаб Windows 125%, что делает эффективный вьюпорт равным ~1092x614px. Предлагаемая верстка должна проектироваться с запасом под вьюпорт от 1024px ширины и 550px высоты.
2. **Офлайн-шрифты**:
   - В проекте используется системный стек `font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;`. Это гарантирует 100% строгий офлайн-режим без внешних загрузок, но метрики шрифтов на Windows (Segoe UI) и Linux/Chromebook могут отличаться на 1–2px. Все контейнеры должны использовать эластичные единицы (`rem`, `fr`, `%`, `gap`), а не жесткий `px` в разметке текста.
3. **Изображения слайдов**:
   - В индексированных презентациях (`indexed/grade7_7-2-*/*.png`) часть слайдов имеет вертикальные или нестандартные пропорции (от 4:3 до 16:9). CSS модального просмотрщика должен динамически подстраивать `max-height: calc(100vh - 220px)` и `object-fit: contain`.

---

## 4. Conclusion (Архитектурные решения и рекомендации)

### 4.1. Архитектура дизайн-токенов (`:root`)
Необходимо расширить цветовую палитру в `style.css` для эргономики 10 пальцев и современного геймифицированного интерфейса 7-го класса:

```css
:root {
  /* Базовые цвета */
  --color-primary:   #3b82f6; /* Энергичный индиго-синий */
  --color-primary-h: #2563eb;
  --color-primary-light: #eff6ff;
  --color-accent:    #10b981; /* Мятно-зеленый (успех) */
  --color-accent-h:  #059669;
  --color-warn:      #f59e0b; /* Янтарный (внимание) */
  --color-error:     #ef4444; /* Кораллово-красный (ошибка) */
  --color-error-h:   #dc2626;

  /* Палитра 10 зон пальцев (Touch Typing Zones) */
  --zone-pinky-l:   #f43f5e; /* Левый мизинец — розово-красный (1, ё, й, ф, я) */
  --zone-pinky-l-bg:#ffe4e6;
  --zone-ring-l:    #f97316; /* Левый безымянный — оранжевый (2, ц, ы, ч) */
  --zone-ring-l-bg: #ffedd5;
  --zone-mid-l:     #eab308; /* Левый средний — желтый (3, у, в, с) */
  --zone-mid-l-bg:  #fef9c3;
  --zone-idx-l:     #22c55e; /* Левый указательный — зеленый (4, 5, к, е, а, п, м, и) */
  --zone-idx-l-bg:  #dcfce7;
  
  --zone-idx-r:     #06b6d4; /* Правый указательный — циан (6, 7, н, г, р, о, т, ь) */
  --zone-idx-r-bg:  #cffafe;
  --zone-mid-r:     #6366f1; /* Правый средний — индиго (8, ш, л, б) */
  --zone-mid-r-bg:  #e0e7ff;
  --zone-ring-r:    #a855f7; /* Правый безымянный — фиолетовый (9, щ, д, ю) */
  --zone-ring-r-bg: #f3e8ff;
  --zone-pinky-r:   #ec4899; /* Правый мизинец — фуксия (0, -, =, з, х, ъ, ж, э) */
  --zone-pinky-r-bg:#fce7f3;
  --zone-thumb:     #64748b; /* Большие пальцы — сланец (пробел) */
  --zone-thumb-bg:  #f1f5f9;

  /* Тени и скругления под молодежный стиль */
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 18px;
  --radius-xl: 24px;
  --shadow-key: 0 4px 0 rgba(0,0,0,0.12);
  --shadow-key-pressed: 0 1px 0 rgba(0,0,0,0.15);
}
```

### 4.2. Спецификация раскладки клавиатуры и схемы пальцев (R3)
Для устранения раздувания клавиатуры до 711px и обеспечения эргономики:
1. **Скрыть `#tt-input`**:
   ```css
   .tt-hidden-input {
     position: absolute;
     opacity: 0;
     pointer-events: none;
     width: 1px;
     height: 1px;
     top: -100px;
   }
   ```
2. **Стили клавиатуры и клавиш**:
   ```css
   .keyboard-wrap {
     display: flex;
     flex-direction: column;
     align-items: center;
     gap: 12px;
     margin: 12px 0;
     width: 100%;
   }
   .keyboard {
     display: flex;
     flex-direction: column;
     gap: 6px;
     align-items: center;
     background: #e2e8f0;
     padding: 12px;
     border-radius: var(--radius-lg);
     box-shadow: inset 0 2px 4px rgba(0,0,0,0.06);
   }
   .kb-row {
     display: flex;
     gap: 6px;
     justify-content: center;
   }
   .kb-key {
     display: inline-flex;
     align-items: center;
     justify-content: center;
     min-width: 44px;
     height: 44px;
     padding: 0 10px;
     font-size: 0.95rem;
     font-weight: 700;
     border-radius: 8px;
     border: 2px solid transparent;
     box-shadow: var(--shadow-key);
     cursor: pointer;
     transition: transform 0.08s ease, box-shadow 0.08s ease, background 0.15s ease;
     user-select: none;
   }
   .kb-key:active {
     transform: translateY(3px);
     box-shadow: var(--shadow-key-pressed);
   }
   .kb-space {
     min-width: 280px;
   }
   ```
3. **Классы пальцевых зон**:
   Назначаются каждой клавише (`data-finger="L1"..."R5"`):
   - `.kb-zone-pinky-l` { background: var(--zone-pinky-l-bg); color: var(--zone-pinky-l); border-color: #fecdd3; }
   - `.kb-zone-ring-l`  { background: var(--zone-ring-l-bg);  color: var(--zone-ring-l);  border-color: #fed7aa; }
   - `.kb-zone-mid-l`   { background: var(--zone-mid-l-bg);   color: var(--zone-mid-l);   border-color: #fef08a; }
   - `.kb-zone-idx-l`   { background: var(--zone-idx-l-bg);   color: var(--zone-idx-l);   border-color: #bbf7d0; }
   - `.kb-zone-idx-r`   { background: var(--zone-idx-r-bg);   color: var(--zone-idx-r);   border-color: #bae6fd; }
   - `.kb-zone-mid-r`   { background: var(--zone-mid-r-bg);   color: var(--zone-mid-r);   border-color: #c7d2fe; }
   - `.kb-zone-ring-r`  { background: var(--zone-ring-r-bg);  color: var(--zone-ring-r);  border-color: #ddd6fe; }
   - `.kb-zone-pinky-r` { background: var(--zone-pinky-r-bg); color: var(--zone-pinky-r); border-color: #fbcfe8; }
   - `.kb-zone-thumb`   { background: var(--zone-thumb-bg);   color: var(--zone-thumb);   border-color: #cbd5e1; }
4. **Визуализация кистей рук (Hands Guide)**:
   Под клавиатурой размещается легкий SVG-компонент обеих кистей, где 10 пальцев имеют соответствующие цвета зон, а активный палец для текущего символа пульсирует и подсвечивается свечением.

### 4.3. Адаптивные медиа-запросы и исправление коллизий
1. **Модальное окно слайдера (`.modal-box`)**:
   ```css
   .modal-box {
     max-height: calc(100vh - 40px);
     display: flex;
     flex-direction: column;
   }
   .slide-image {
     max-height: clamp(280px, 50vh, 520px);
     object-fit: contain;
   }
   .slide-nav-bar {
     position: sticky;
     top: 0;
     background: var(--color-surface);
     z-index: 5;
   }
   ```
2. **Адаптивные сетки карточек**:
   - Список учеников:
     `grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));` (вместо жесткого `repeat(2, 1fr)`). На 1280px встает 4 колонки, на 1920px — 6 колонок. Никакого растягивания до 905px!
   - Главное меню:
     `grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); max-width: 1100px; margin: 0 auto;` (отцентровано, красиво распределяет 5 модулей: Слепая печать, Тренажёр мыши, Материалы уроков, Мини-тесты, Мои результаты).
   - Кнопки классов:
     `class-grid` с `justify-content: center; gap: 16px;`. Все 5 классов 7А–7Д гармонично выстраиваются в ряд или 3+2 с центровкой.

3. **Панель учителя (`#screen-teacher`)**:
   ```css
   .table-responsive {
     width: 100%;
     overflow-x: auto;
     border-radius: var(--radius-md);
     border: 1px solid var(--color-border);
     box-shadow: var(--shadow-sm);
   }
   .teacher-table th {
     position: sticky;
     top: 0;
     background: #f8fafc;
     z-index: 2;
     box-shadow: 0 1px 0 var(--color-border);
   }
   .btn-danger {
     background: var(--color-error);
     color: #fff;
     border: none;
   }
   .btn-danger:hover {
     background: var(--color-error-h);
     box-shadow: 0 4px 12px rgba(220,38,38,0.25);
   }
   ```

4. **Глобальные фокусы и доступность**:
   ```css
   button:focus-visible,
   input:focus-visible,
   select:focus-visible,
   .btn:focus-visible,
   .student-card:focus-visible,
   .btn-module:focus-visible,
   .answer-btn:focus-visible {
     outline: 3px solid var(--color-primary);
     outline-offset: 2px;
   }
   ```

---

## 5. Verification Method (Метод проверки)

Для независимой проверки выводов отчёта выполнить следующие шаги:

1. **Анализ расхождений классов (37 отсутствующих селекторов)**:
   ```powershell
   python "C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\.agents\teamwork\explorer_survey_2\audit_css.py"
   ```
   *Ожидаемый результат*: скрипт выводит 37 ненайденных классов, включая `.kb-key`, `.kb-row`, `.level-btn`, `.tt-hidden-input`, `.btn-danger`, `.table-responsive`.

2. **Проверка поведения на разрешениях 1280x720, 1366x768, 1920x1080**:
   ```powershell
   python "C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\.agents\teamwork\explorer_survey_2\audit_resolutions.py"
   ```
   *Ожидаемый результат*: скрипт генерирует `resolution_audit.json`, где:
   - `1280x720.typing.kb_rect.height` == 711px, `key_sample_styles.display` == "block".
   - `1280x720.materials.modal_info.is_modal_overflowing` == true (`scrollHeight: 786` > `clientHeight: 519`).
   - `1920x1080.students.first_card_rect.width` == 905px.

3. **Проверка отсутствия стилей фокуса**:
   ```powershell
   python "C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\.agents\teamwork\explorer_survey_2\audit_focus.py"
   ```
   *Ожидаемый результат*: `btn-primary:focus.outlineStyle` == "none", `form-select:focus.boxShadow` == "none".

4. **Условия признания выводов недействительными (Invalidation Conditions)**:
   - Если в `style.css` добавлены селекторы для `.kb-key` с `display: inline-flex` и перелива по высоте клавиатуры более нет.
   - Если в `style.css` добавлены медиа-запросы `@media`, адаптирующие слайдер под высоту вьюпорта 550–600px.
