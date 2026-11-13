# Handoff Report: Responsive Multi-Resolution Layout & Viewport Specifications (Milestone 1)

**Agent Identity**: `explorer_m1_2`  
**Parent / Sub-Orchestrator**: `sub_orch_m1` (`6e7e4c7a-6984-439e-86a8-3a5d82826bb8`)  
**Target Project**: Local Offline 7th-Grade Computer Trainer SPA (`C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer`)  
**Target Artifacts Analyzed**: `style.css`, `index.html`, `app.js`, `modules/typing.js`, `modules/teacher.js`, `data/students.js`  
**Target Resolutions Tested**: 1280x720 (usable viewport ~1248x577), 1366x768 (usable viewport ~1334x625), 1920x1080 (usable viewport ~1888x937)  
**Date**: 2026-11-11  

---

## 1. Observation (Фактические наблюдения и результаты измерений)

### 1.1. Текущее состояние таблиц стилей и отсутствие адаптивности
- В файле `style.css` (1154 строки) **полностью отсутствуют директивы `@media`** (0 совпадений).
- Все контейнеры экранов имеют жесткие фиксированные внешние отступы:
  - `style.css:71`: `.screen-header { padding: 16px 32px; }` (высота шапки 58px).
  - `style.css:86`: `.screen-body { padding: 32px; gap: 24px; }` (только верхний и нижний паддинги отнимают 64px высоты).
- В разметке `index.html:4` объявлен мета-тег `<meta name="viewport" content="width=device-width, initial-scale=1.0" />`, но в `style.css:46` задано жесткое ограничение `min-width: 1024px;`.

---

### 1.2. Область 1: Модальное окно просмотра презентаций (`.modal-box`, `.slide-image`, `.slide-nav-bar`, `.slide-notes`)
1. **Разметка и стили**:
   - `index.html:208`: `<div id="app-modal" class="modal-overlay" style="display:none;"></div>`.
   - `app.js:606-618`:
     ```javascript
     modal.innerHTML = `
       <div class="modal-box">
         <div class="modal-header">
           <h2>${title}</h2>
           <button class="modal-close" id="modal-close-btn">✕</button>
         </div>
         <div class="modal-body">${htmlContent}</div>
       </div>
     `;
     ```
   - `style.css:1125-1137`:
     ```css
     .modal-box {
       background: #ffffff;
       border-radius: var(--radius-lg);
       width: 100%;
       max-width: 960px;
       max-height: 90vh;
       overflow-y: auto;
       box-shadow: var(--shadow-lg);
       padding: 24px;
       display: flex;
       flex-direction: column;
       gap: 16px;
     }
     ```
   - `style.css:832-837`:
     ```css
     .slide-image {
       max-width: 100%;
       max-height: 520px;
       display: block;
       object-fit: contain;
     }
     ```
   - `style.css:813-819`: `.slide-nav-bar` имеет стандартное позиционирование `display: flex; justify-content: space-between;` без `position: sticky`.
   - Селектор `.modal-body` в `style.css` **полностью отсутствует** (нет ни `flex: 1`, ни `min-height: 0`).
2. **Инструментальные замеры в Microsoft Edge (Selenium Headless)**:
   - **Разрешение 1280x720** (высота окна браузера `innerHeight = 577px`):
     - Доступная высота оверлея (`padding: 20px` сверху и снизу): 537px.
     - `modal-box` имеет `max-height: 90vh` = 519.3px.
     - Фактическая высота содержимого: шапка модалки (45px) + gap (16px) + панель навигации (44px) + gap (16px) + картинка слайда (505px) + gap (16px) + блок заметок (144px) = **786px**.
     - `scrollHeight` (786px) превышает `clientHeight` (519px) на **267px** (`is_modal_overflowing = true`).
     - При прокрутке модального окна вниз блок `.slide-nav-bar` с кнопками переключения уезжает за верхнюю границу, требуя постоянного скроллинга туда-обратно.
   - **Разрешение 1366x768** (`innerHeight = 625px`):
     - `modal-box` `clientHeight = 563px`, `scrollHeight = 786px`. Перелив на **223px** (`is_modal_overflowing = true`).
   - **Разрешение 1920x1080** (`innerHeight = 937px`):
     - `modal-box` `clientHeight = 787px`, `scrollHeight = 787px`. Укладывается впритирку, но картинка фиксированно ограничена 520px и не масштабируется под экран.

---

### 1.3. Область 2: Сетка выбора учеников (`#screen-student`)
1. **Разметка и стили**:
   - `style.css:286-290`:
     ```css
     .student-grid {
       display: grid;
       grid-template-columns: repeat(2, 1fr);
       gap: 14px;
     }
     ```
   - `data/students.js`: В классах числится от 14 до 17 учеников (7-А: 15, 7-Б: 17, 7-В: 17, 7-Г: 16, 7-Д: 14).
2. **Инструментальные замеры**:
   - **Разрешение 1920x1080** (ширина контейнера 1824px):
     - Сетка из 2 колонок `repeat(2, 1fr)` растягивает каждую карточку ученика `.student-card` до ширины **905px** (`first_card_rect.width = 905px`).
     - Имя ученика прижато к левому краю, бейдж скорости — к правому краю, между ними находится более **750px пустого белого пространства**. Карточки выглядят неестественно и разреженно.
   - **Разрешение 1280x720** (ширина контейнера 1184px, ширина карточки 578px):
     - 15 учеников требуют 8 рядов по 2 карточки. Высота сетки составляет **482px**.
     - Вместе с заголовком и строкой поиска высота документа достигает **697px**, что превышает высоту вьюпорта (577px) и вызывает обязательный вертикальный скролл страницы на 120px.

---

### 1.4. Область 3: Сетка выбора класса (`#screen-class`)
1. **Разметка и стили**:
   - `index.html:64`: `<div class="class-grid" id="class-list"></div>`.
   - `style.css:231-250`:
     ```css
     .class-grid {
       display: flex;
       flex-wrap: wrap;
       gap: 20px;
       justify-content: center;
       margin-top: 24px;
     }
     .btn-class {
       min-width: 140px;
       min-height: 100px;
       ...
     }
     ```
   - `app.js:164`: Содержимое кнопки: `<span class="class-title">${cls.name}</span><span class="class-sub">${cls.subject || ''} (${(cls.students || []).length} уч.)</span>`.
   - В данных ровно **5 классов**: 7-А, 7-Б, 7-В, 7-Г, 7-Д.
2. **Инструментальные замеры**:
   - Длинный текст подписи (`class-sub`, например: "Информатика 7-А 2гр (15 уч.)") распирает кнопку `.btn-class` до естественной ширины **273–282px**.
   - **Разрешение 1280x720** (доступная ширина контейнера 1184px):
     - 4 кнопки занимают `4 * 278px + 3 * 20px = 1172px` и полностью заполняют первый ряд.
     - **5-я кнопка (7-Д) сиротливо переносится на 2-й ряд** (`x=483px, y=254px`), образуя несимметричную и визуально несбалансированную раскладку 4 + 1.
   - **Разрешение 1366x768** (доступная ширина 1270px):
     - 5 кнопок требуют `5 * 280px + 4 * 20px = 1480px > 1270px`.
     - Снова в первом ряду встают 4 кнопки, а 5-я кнопка переносится во второй ряд в одиночестве.
   - **Разрешение 1920x1080** (доступная ширина 1824px):
     - Все 5 кнопок встают в 1 ряд (`distribution: [5]`).

---

### 1.5. Область 4: Сетка модулей главного меню (`#screen-menu`)
1. **Разметка и стили**:
   - `style.css:320-325`:
     ```css
     .module-grid {
       display: grid;
       grid-template-columns: repeat(2, 1fr);
       gap: 20px;
       max-width: 760px;
     }
     ```
   - Отсутствует центрирование (`margin: 0 auto;`). Сетка имеет фиксированный `max-width: 760px;` и прижата к левому краю контейнера (`x=32px`).
   - На экранах 1920x1080 справа от меню остается пустое неиспользуемое поле шириной более **1100px**.
   - На экранах 1280x720 и 1366x768 баннер статистики + шапка + сетка высотой 376px дают высоту документа **659px**, вызывая вертикальную полосу прокрутки окна (при высоте вьюпорта 577px и 625px соответственно).
   - В Milestone 3 добавляется 5-й учебный модуль — "Тренажёр мыши" (`mouse`). При жесткой сетке `repeat(2, 1fr)` 5 модулей дали бы 3 ряда с одним сиротливым модулем внизу (2 + 2 + 1).

---

### 1.6. Область 5: Тренажёр слепой печати (`#screen-typing`) и удержание вьюпорта
1. **Инструментальные замеры исходного состояния**:
   - На разрешении 1280x720 высота страницы тренажёра печати составляла **1119px** при высоте окна 577px (скролл на 542px вниз).
   - Причина раздувания до 1119px: отсутствие стилей для классов `.kb-row`, `.kb-key`, `.keyboard-wrap` в `style.css`, из-за чего 33 клавиши рендерились как блочные элементы друг под другом (`height: 711px`).
   - Но даже при исправлении `.kb-key` на `display: inline-flex` сумма высот фиксированных компонентов:
     - Шапка: 58px.
     - Паддинги тела экрана: 64px.
     - Селектор уровней: 60px.
     - Текст для набора (`padding: 20px 24px; line-height: 2.2`): ~100px.
     - Клавиатура (4 ряда букв + пробел по 44px + зазоры 6px + паддинг 24px): 268px.
     - Статистика: 40px.
     - **Итоговая статическая высота: ~590px**, что превышает высоту вьюпорта 577px!
   - В Milestone 2 планируется добавление визуализатора кистей рук (Hands Guide) высотой 90–120px. Без внедрения эластичного fluid clamp тренажёр печати неизбежно вернется к вертикальному скроллу.

---

## 2. Logic Chain (Логическая цепочка обоснования решений)

```
[Наблюдение 1: Модалка имеет scrollHeight=786px при clientHeight=519px на 1280x720 из-за slide-image max-height: 520px и неуправляемых заметок]
    │
    ▼
[Логика 1: Картинка слайда и заметки должны динамически ужиматься пропорционально высоте вьюпорта через clamp(200px, 45vh, 480px). Модальное окно должно быть ограничено max-height: calc(100vh - 40px), а slide-nav-bar должен стать sticky, чтобы никогда не уезжать из видимой зоны при прокрутке длинных заметок]
    │
    ▼
[Результат 1: В тесте simulate_layouts.py на 1280x720 clientH=461px, scrollH=461px, boxOverflow=False, bodyOverflow=False — вертикальный скролл модалки полностью устранен]
```

```
[Наблюдение 2: student-grid с repeat(2, 1fr) дает ширину карточки 905px на 1920px и требует 8 рядов на 1280px, раздувая страницу до 697px]
    │
    ▼
[Логика 2: Применение repeat(auto-fill, minmax(260px, 1fr)) позволяет браузеру автоматически вычислять число колонок исходя из доступной ширины. На 1920px встает 6 колонок (ширина карточки ~290px), на 1280px — 4 колонки (ширина ~285px)]
    │
    ▼
[Результат 2: На 1280x720 высота сетки падает с 482px до 196.9px (4 ряда вместо 8), общая высота страницы 440px < 577px — скролл окна полностью ликвидирован, карточки на 1920px компактны и эргономичны]
```

```
[Наблюдение 3: 5 классов 7А-7Д на 1280px и 1366px раскладываются как 4 в первом ряду + 1 сирота во втором из-за естественной ширины 280px]
    │
    ▼
[Логика 3: Если оптимизировать внутренние отступы кнопок, размер шрифта подписи и применить minmax(200px, 1fr), то 5 кнопок занимают 5 * 206px + 4 * 16px = 1094px < 1184px, свободно умещаясь в 1 ряд на всех целевых экранах от 1200px. Для экранов < 1150px (или масштаба ОС 125%) flex-wrap с justify-content: center раскладывает кнопки как 3 + 2 по центру без одиночных сирот]
    │
    ▼
[Результат 3: В тесте simulate_layouts.py на 1280, 1366 и 1920 зафиксировано ровно [5] кнопок в 1 ряду, ширина 206–209px, отсутствие одиночных сирот]
```

```
[Наблюдение 4: module-grid имеет max-width: 760px без margin: 0 auto, оставляя 1100px пустоты справа на 1920px. 5 модулей при 2 колонках дают сироту в 3-м ряду]
    │
    ▼
[Логика 4: Центрирование через margin: 0 auto, расширение max-width до 1100px (1350px на широких экранах) и применение адаптивной сетки / flexbox центрирует меню на экране. 4 модуля встают в 1 ряд, а при добавлении 5-го модуля в M3 меню гармонично перестраивается в 3 + 2 с центровкой второго ряда]
    │
    ▼
[Результат 4: В тесте test_variants.py menu-grid отцентрирован (isCentered=True), 5 модулей распределяются как [3, 2] с row2Centered=True, страница полностью помещается во вьюпорт без скролла]
```

```
[Наблюдение 5: Экран слепой печати #screen-typing при статических размерах достигает 590-620px высоты, что больше 577px на 1280x720, а в M2 добавится Hands Visualizer]
    │
    ▼
[Логика 5: Все вертикальные размеры экрана печати (отступы screen-body, текст для набора, высота клавиш, паддинг клавиатуры) должны масштабироваться через fluid clamp от высоты вьюпорта (vh), а внешний скролл body должен быть отключен (overflow: hidden)]
    │
    ▼
[Результат 5: В тесте simulate_layouts.py высота клавиатуры составила 153px (вместо 268px), общая высота тренажёра 297px, общая высота экрана с шапкой 383px < 577px. Обеспечен запас в 194px под руки из M2 при 100% удержании экрана вьюпортом]
```

---

## 3. Caveats (Ограничения и допущения)

1. **Системный масштаб Windows (DPI Scaling 125% и 150%)**:
   - В школьных компьютерных классах на ноутбуках с разрешением матрицы 1366x768 часто по умолчанию выставлен системный масштаб Windows 125%. В этом случае эффективный CSS-вьюпорт уменьшается до `1093x614px`.
   - На экранах Full HD 1920x1080 масштаб 125% дает эффективный вьюпорт `1536x864px`, а масштаб 150% — `1280x720px`.
   - Разработанные спецификации протестированы и включают медиа-запрос `@media (max-width: 1150px)`, гарантирующий корректную раскладку 3 + 2 для классов и модулей при включенном масштабировании ОС 125%.
2. **Пропорции слайдов презентаций (Aspect Ratios)**:
   - В папке `indexed/` слайды имеют соотношение сторон от 4:3 до 16:9. Применение `object-fit: contain; width: auto; height: auto; max-height: clamp(200px, 45vh, 480px);` гарантирует, что слайды любого формата не искажаются и не раздувают контейнер модального окна.
3. **Размещение будущего компонента кистей рук (Hands Guide, Milestone 2)**:
   - Текущее исследование рассчитало и зарезервировало в разметке экрана `#screen-typing` вертикальный буфер высотой не менее 90–110px. В спецификацию заложен селектор `.hands-visualizer` с правилом `max-height: clamp(65px, 12vh, 110px); flex-shrink: 1;`.
4. **Отсутствие изменений в исходном коде**:
   - В соответствии с правилами исследователя Explorer, ни один рабочий файл исходного кода (`style.css`, `index.html`, `app.js`) не был изменен. Все тесты проводились через динамическую инъекцию стилей в рантайме браузера Edge.

---

## 4. Conclusion (Архитектурные рекомендации и спецификации для Worker)

Для реализации Worker Milestone 1 рекомендуется включить в `style.css` следующие готовые CSS-блоки.

### 4.1. Глобальная адаптивная основа контейнеров экрана
Заменить правила `.screen-header` и `.screen-body` на адаптивные с использованием `clamp()`:

```css
/* ─── Адаптивные контейнеры экранов ────────────────── */
.screen-header {
  display: flex;
  align-items: center;
  gap: clamp(10px, 1.5vw, 16px);
  padding: clamp(10px, 1.5vh, 16px) clamp(16px, 3vw, 32px);
  background: var(--color-surface);
  border-bottom: 2px solid var(--color-primary);
  box-shadow: var(--shadow-sm);
  flex-shrink: 0;
}

.screen-body {
  flex: 1;
  padding: clamp(12px, 2vh, 28px) clamp(16px, 3vw, 32px);
  display: flex;
  flex-direction: column;
  gap: clamp(10px, 1.8vh, 20px);
  overflow-y: auto;
}
```

---

### 4.2. Спецификация 1: Модальное окно и просмотрщик слайдов (Area 1)
Устраняет перелив модалки на 267px, обеспечивает видимость навигации и заметок без полосы прокрутки модального окна:

```css
/* ─── Модальное окно (полная адаптивность без переливов) ─── */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.65);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  padding: clamp(10px, 2vh, 24px);
}

.modal-box {
  background: #ffffff;
  border-radius: var(--radius-lg);
  width: 100%;
  max-width: clamp(720px, 75vw, 1050px);
  max-height: calc(100vh - 40px);
  padding: clamp(14px, 2vh, 24px);
  display: flex;
  flex-direction: column;
  gap: clamp(8px, 1.2vh, 16px);
  box-shadow: var(--shadow-lg);
  overflow: hidden; /* Контейнер не переливается, скроллится только body при необходимости */
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--color-border);
  padding-bottom: clamp(6px, 1vh, 12px);
  flex-shrink: 0;
}

.modal-header h2 {
  font-size: clamp(1.1rem, 1.5vw, 1.35rem);
  color: var(--color-primary);
  font-weight: 700;
}

.modal-body {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow-y: auto; /* Внутренняя прокрутка только при экстремально длинном тексте заметок */
}

.slide-viewer {
  display: flex;
  flex-direction: column;
  gap: clamp(8px, 1.2vh, 14px);
  height: 100%;
  max-width: 100%;
}

.slide-nav-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: clamp(6px, 1vh, 10px);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
  position: sticky;
  top: 0;
  background: var(--color-surface);
  z-index: 5;
}

.slide-img-box {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  background: #0f172a;
  border-radius: var(--radius-md);
  overflow: hidden;
}

.slide-image {
  max-width: 100%;
  max-height: clamp(200px, 45vh, 480px);
  width: auto;
  height: auto;
  object-fit: contain;
  display: block;
}

.slide-notes {
  flex-shrink: 0;
  max-height: clamp(60px, 14vh, 120px);
  overflow-y: auto;
  padding: clamp(8px, 1.2vh, 14px);
  font-size: clamp(12px, 0.95vw, 14px);
  line-height: 1.45;
  background: #f8fafc;
  border-left: 4px solid var(--color-primary);
  border-radius: var(--radius-sm);
}
```

---

### 4.3. Спецификация 2: Сетка выбора учеников (Area 2)
Заменяет `repeat(2, 1fr)` на `auto-fill`, устраняя растягивание карточек до 905px и вертикальный скролл списка на 1280px:

```css
/* ─── Список учеников (адаптивная модульная сетка) ────────── */
.student-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: clamp(10px, 1.2vw, 16px);
  width: 100%;
}

.student-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--color-surface);
  border: 1.5px solid var(--color-border);
  padding: clamp(10px, 1.2vh, 16px) clamp(12px, 1.2vw, 18px);
  border-radius: var(--radius-md);
  cursor: pointer;
  font-size: clamp(14px, 1vw, 16px);
  font-weight: 600;
  transition: all var(--transition);
  text-align: left;
  min-height: 44px;
}

.student-card:hover {
  border-color: var(--color-primary);
  background: #f8faff;
  transform: translateY(-2px);
  box-shadow: var(--shadow-sm);
}

.student-card:active {
  transform: translateY(1px);
}
```

---

### 4.4. Спецификация 3: Кнопки выбора классов (Area 3)
Обеспечивает гармоничное размещение 5 классов (7-А — 7-Д) в 1 ряд на разрешениях от 1200px и центрированную раскладку 3 + 2 при масштабе 125% / узких экранах:

```css
/* ─── Кнопки выбора класса (7А–7Д) ─────────────────────── */
.class-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: clamp(12px, 1.5vw, 20px);
  max-width: 1200px;
  margin: 16px auto 0;
  width: 100%;
}

.btn-class {
  background: var(--color-surface);
  color: var(--color-primary);
  border: 3px solid var(--color-primary);
  min-width: 180px;
  min-height: clamp(80px, 11vh, 105px);
  padding: clamp(12px, 1.5vh, 18px) clamp(10px, 1.2vw, 16px);
  border-radius: var(--radius-lg);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 4px;
  transition: background var(--transition), box-shadow var(--transition),
              transform var(--transition);
}

.btn-class:hover {
  background: var(--color-primary);
  color: #fff;
  box-shadow: var(--shadow-lg);
  transform: translateY(-3px);
}

.btn-class:active {
  transform: translateY(1px) scale(0.98);
}

.class-title {
  font-size: clamp(1.2rem, 1.6vw, 1.5rem);
  font-weight: 800;
}

.class-sub {
  font-size: clamp(11px, 0.85vw, 13px);
  opacity: 0.85;
  white-space: nowrap;
}

/* Fallback для узких экранов или масштабирования ОС 125% */
@media (max-width: 1150px) {
  .class-grid {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
  }
  .btn-class {
    flex: 0 1 calc(33.333% - 16px);
    min-width: 190px;
    max-width: 250px;
  }
}
```

---

### 4.5. Спецификация 4: Меню модулей ученика (Area 4)
Устраняет смещение влево, центрирует сетку, масштабирует карточки и подготавливает поддержку 5-го модуля (Тренажёр мыши):

```css
/* ─── Меню модулей (центрирование и поддержка 4–5 модулей) ─── */
.stats-overview-banner {
  display: flex;
  gap: clamp(10px, 1.5vw, 18px);
  margin-bottom: clamp(12px, 1.8vh, 22px);
  justify-content: center;
}

.stat-pill {
  background: var(--color-surface);
  padding: clamp(8px, 1.2vh, 12px) clamp(12px, 1.5vw, 20px);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  font-size: clamp(13px, 1vw, 15px);
  box-shadow: var(--shadow-sm);
}

.module-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: clamp(14px, 1.8vw, 24px);
  max-width: 1100px;
  margin: 0 auto;
  width: 100%;
}

.btn-module {
  background: var(--color-surface);
  color: var(--color-text);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: clamp(16px, 2.2vh, 26px) clamp(16px, 1.8vw, 22px);
  font-size: 1rem;
  text-align: left;
  flex-direction: column;
  align-items: flex-start;
  gap: clamp(6px, 1vh, 10px);
  box-shadow: var(--shadow-sm);
  transition: border-color var(--transition), box-shadow var(--transition),
              transform var(--transition);
}

.btn-module:hover {
  border-color: var(--color-primary);
  box-shadow: var(--shadow-lg);
  transform: translateY(-3px);
}

.btn-module:active {
  transform: translateY(1px) scale(0.98);
}

.module-icon {
  font-size: clamp(1.6rem, 2.2vw, 2.2rem);
}

.module-name {
  font-size: clamp(1rem, 1.2vw, 1.2rem);
  font-weight: 700;
  color: var(--color-primary);
}

.module-desc {
  font-size: clamp(0.78rem, 0.9vw, 0.9rem);
  color: var(--color-muted);
  line-height: 1.4;
}

/* При появлении 5-го модуля (Milestone 3) на разрешениях от 1400px: 5 в 1 ряд */
@media (min-width: 1400px) {
  .module-grid.has-5-modules {
    grid-template-columns: repeat(5, 1fr);
    max-width: 1350px;
  }
}

/* На экранах до 1400px при 5 модулях: центрированная раскладка 3 + 2 */
@media (max-width: 1399px) and (min-width: 850px) {
  .module-grid.has-5-modules {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    max-width: 1020px;
  }
  .module-grid.has-5-modules .btn-module {
    flex: 0 1 calc(33.333% - 24px);
    min-width: 250px;
    max-width: 320px;
  }
}
```

---

### 4.6. Спецификация 5: Экран тренажёра слепой печати (`#screen-typing`) (Area 5)
Обеспечивает строгое удержание вьюпорта без полос прокрутки и резервирует место под Hands Guide (Milestone 2):

```css
/* ─── Тренажёр печати: полное удержание вьюпорта (Containment) ─── */
#screen-typing .screen-body {
  padding: clamp(8px, 1.5vh, 20px) clamp(16px, 2.5vw, 32px);
  gap: clamp(6px, 1vh, 14px);
  overflow-y: hidden; /* Запрет вертикального скролла на экране печати */
  justify-content: space-between;
}

.typing-trainer {
  display: flex;
  flex-direction: column;
  gap: clamp(6px, 1vh, 12px);
  max-width: 1000px;
  margin: 0 auto;
  width: 100%;
  height: 100%;
  justify-content: space-between;
}

/* Селектор уровней */
.level-selector {
  display: flex;
  gap: clamp(4px, 0.6vw, 8px);
  flex-wrap: wrap;
  align-items: center;
  margin-bottom: 0;
}

.level-label {
  font-size: clamp(0.8rem, 0.9vw, 0.9rem);
  font-weight: 600;
  color: var(--color-muted);
}

.level-btn {
  padding: clamp(4px, 0.7vh, 7px) clamp(8px, 1vw, 14px);
  font-size: clamp(0.78rem, 0.9vw, 0.88rem);
  font-weight: 600;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-primary);
  cursor: pointer;
  transition: all var(--transition);
}

.level-btn:hover {
  background: var(--color-primary);
  color: #fff;
  border-color: var(--color-primary);
}

.level-btn.active {
  background: var(--color-primary);
  color: #fff;
  border-color: var(--color-primary-h);
  box-shadow: var(--shadow-sm);
}

.level-title {
  font-size: clamp(0.9rem, 1.1vw, 1.05rem);
  font-weight: 700;
  color: var(--color-primary);
}

/* Текст для набора */
.typing-text-wrap {
  width: 100%;
}

.typing-text {
  font-size: clamp(1.1rem, 1.6vw, 1.45rem);
  font-family: 'Courier New', Courier, monospace;
  background: var(--color-surface);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: clamp(8px, 1.2vh, 16px) clamp(14px, 2vw, 20px);
  line-height: 1.55;
  letter-spacing: .06em;
  word-break: break-all;
  margin: 0;
}

/* Скрытый инпут */
.tt-hidden-input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
  width: 1px;
  height: 1px;
  top: -100px;
}

/* Виртуальная клавиатура */
.keyboard-wrap {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: clamp(4px, 0.8vh, 10px);
  margin: 0;
}

.keyboard {
  display: flex;
  flex-direction: column;
  gap: clamp(3px, 0.5vh, 5px);
  align-items: center;
  background: #e2e8f0;
  padding: clamp(8px, 1.2vh, 14px);
  border-radius: var(--radius-md);
  box-shadow: inset 0 2px 4px rgba(0,0,0,0.06);
  user-select: none;
  width: auto;
}

.kb-row {
  display: flex;
  gap: clamp(3px, 0.5vw, 5px);
  justify-content: center;
}

.kb-key {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: clamp(30px, 3.2vw, 42px);
  height: clamp(30px, 4.2vh, 42px);
  padding: 0 clamp(4px, 0.5vw, 8px);
  background: var(--color-surface);
  border: 2px solid var(--color-border);
  border-radius: 6px;
  font-size: clamp(0.75rem, 0.9vw, 0.9rem);
  font-weight: 700;
  color: var(--color-text);
  box-shadow: 0 3px 0 rgba(0,0,0,0.1);
  cursor: pointer;
  transition: transform 0.08s ease, box-shadow 0.08s ease, background 0.15s ease;
  user-select: none;
}

.kb-key:active {
  transform: translateY(2px);
  box-shadow: 0 1px 0 rgba(0,0,0,0.1);
}

.kb-space {
  min-width: clamp(180px, 22vw, 260px);
}

/* Зарезервированный контейнер для кистей рук (Milestone 2) */
.hands-visualizer {
  max-height: clamp(65px, 12vh, 110px);
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-shrink: 1;
}

/* Статистика в реальном времени */
.typing-stats {
  display: flex;
  gap: clamp(14px, 2.5vw, 30px);
  font-size: clamp(0.85rem, 1vw, 0.95rem);
  font-weight: 600;
  color: var(--color-muted);
}

.typing-stats strong {
  color: var(--color-primary);
}
```

---

### 4.7. Спецификация 6: Панель учителя и горизонтальная таблица (Teacher Panel)
Обеспечивает фиксацию шапки таблицы (`position: sticky`) при прокрутке 79 учеников и безопасный горизонтальный скролл на экранах 1280px:

```css
/* ─── Панель учителя: sticky шапка и адаптивность таблицы ─── */
.table-responsive {
  width: 100%;
  overflow-x: auto;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-sm);
  background: var(--color-surface);
  max-height: 70vh; /* Автономная прокрутка строк внутри контейнера */
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
  color: #fff;
  border: none;
}

.btn-danger:hover {
  background: var(--color-error-h);
  box-shadow: 0 4px 12px rgba(220,38,38,0.25);
}
```

---

## 5. Verification Method (Метод проверки и условия инвалидации)

### 5.1. Автоматизированная проверка геометрии экранов
Для проверки разработанного набора правил запустить готовый тестовый сценарий:

```powershell
cd C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer
python .agents\teamwork\explorer_m1_2\simulate_layouts.py
```

**Ожидаемый результат (критерии успеха)**:
1. `Class Screen`: `buttonCount == 5`, `rowDistribution == [5]`, `Vertical scroll: False`.
2. `Student Screen`: `columns == 4` (на 1280x720 и 1366x768), `columns == 6` (на 1920x1080), ширина карточки `<= 310px` (не 905px!), `Vertical scroll: False`.
3. `Menu Screen`: `isCentered == True`, `gridW == 1100px`, `Vertical scroll: False`.
4. `Typing Screen`: `docH == winH` (577px на 720p, 625px на 768p, 937px на 1080p), `Vertical scroll: False`, `Body scroll: False`, `kbH <= 205px`.
5. `Modal Box`: `boxOverflow == False`, `bodyOverflow == False`, `navSticky == True`, модалка полностью вписана в экран без вертикальной полосы прокрутки.

### 5.2. Условия инвалидации отчёта (Invalidation Conditions)
Отчёт подлежит пересмотру в следующих случаях:
- Если в `data/students.js` будет добавлен 6-й класс (например, 7-Е), что изменит расчет распределения кнопок классов.
- Если целевой минимальный поддерживаемый вьюпорт проекта будет уменьшен ниже `1024x550px`.
- Если в компонент кистей рук в Milestone 2 будет заложен фиксированный SVG высотой свыше `160px`.
