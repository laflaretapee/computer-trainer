# Handoff Report: Curriculum Alignment, Screen Lifecycle Integration, Data Persistence Contract & Automated Verification for Milestone 3 (Mouse Trainer)

**Author**: Explorer 3 (`explorer_m3_3`)  
**Date**: 2026-11-12T16:33:00Z  
**Target Milestone**: Milestone 3 (Interactive Mouse Trainer & Informatics Tasks)  
**State Folder**: `C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\.agents\teamwork\explorer_m3_3`  
**Recipient**: Sub-Orchestrator M3 (`d063fc93-1f0b-4efb-8a65-441b7294bfd3`) / Worker M3  

---

## 1. Observation

Direct observations from examining the codebase, educational curriculum files, runtime architecture, and testing infrastructure:

### 1.1. Curriculum Content in `data/content.json`
- **Topic 7-2-4 ("Пользовательский интерфейс", lines 395-568)**:
  - **Slide 10 (Line 448)** defines the verbatim set of mouse techniques taught in the 7th-grade curriculum:
    > "ПРИЁМЫ УПРАВЛЕНИЯ  
    > Основным элементом аппаратного управления компьютером в пользовательском интерфейсе является мышь, отображаемая на экране в виде указателя мыши – небольшого графического объекта, который перемещается по экрану при движении мыши.  
    > **Основные приёмы управления с помощью мыши:**  
    > 1. **Щелчок**  
    > 2. **Двойной щелчок**  
    > 3. **Щелчок правой кнопкой**  
    > 4. **Перетаскивание**  
    > 5. **Наведение указателя мыши**"
  - **Slide 6 (Line 428)** defines the object-oriented GUI model:
    > "- все объекты представляются в виде значков;  
    > - оперирование объектами осуществляется в окнах;  
    > - основным элементом программного управления является меню;  
    > - основным элементом аппаратного управления являются различные манипуляторы."
  - **Slide 12 (Line 458)** defines GUI elements:
    > "Окно (Рабочий стол, Окно папок, Диалоговое окно, Окно приложения, Окно документа), Меню (Главное меню, Контекстное меню)."

- **Topic 7-2-3 ("Файлы и каталоги", lines 181-394)**:
  - **Slide 9 (Line 228)**: "Имя файла состоит из двух частей, разделённых точкой: собственно имени файла и расширения."
  - **Slide 13 (Line 248) & Slide 27 (Line 318)**: File extensions cited in textbook examples:
    - Documents: `.txt` (буква.txt, цифры.txt), `.doc` / `.docx` (Онегин.doc, Пушкин.doc), `.rtf`.
    - Images: `.jpeg` / `.jpg` (Бия.jpeg, Катунь.jpeg), `.bmp` (аквариум.bmp), `.png`.
    - Audio/Multimedia: `.mp3` (мелодия.mp3), `.avi` (видеозапись.avi).
    - Temporary / system: `.tmp`, `.exe` (отсылка к вирусам из 7-2-2).
  - **Slide 11 (Line 238)**: Catalogs (корневой каталог, подкаталоги, иерархическое дерево).
  - **Slide 19 (Line 278)**: File operations:
    > "Основные операции с файлами:  
    > - копирование (создаётся копия файла в другом каталоге или на другом носителе);  
    > - перемещение (производится перенос файла в другой каталог или на другой носитель, исходный файл уничтожается);  
    > - переименование (производится переименование собственно имени файла);  
    > - удаление (в исходном каталоге объект уничтожается)."
  - The "Корзина" (Trash Bin) represents the standard GUI metaphor for file deletion (перемещение в корзину).

### 1.2. Application Routing & Screen Lifecycle in `app.js` and `index.html`
- **`app.js:19-30`**: The `SCREENS` array currently contains:
  ```javascript
  const SCREENS = [
    'screen-login', 'screen-class', 'screen-student', 'screen-teacher-login',
    'screen-menu', 'screen-typing', 'screen-materials', 'screen-tests',
    'screen-results', 'screen-teacher'
  ];
  ```
  `'screen-mouse'` is **missing**. Without adding `'screen-mouse'` to `SCREENS`, `showScreen()` cannot hide other screens or properly hide `screen-mouse` upon navigation away.
- **`app.js:668-687`**: `_bindNavigation()` iterates over `.btn-module` buttons but only handles `typing`, `theory`, `test`, and `stats`. It lacks a handler for `data-module="mouse"`.
- **`app.js:690-701`**: The back-button click listener handles `TypingTrainer.destroy()`, but does not invoke `MouseTrainer.destroy()`.
- **`app.js:141-148`**: The `logout()` function destroys `TypingTrainer`, but does not destroy `MouseTrainer`.
- **`index.html:107-128`**: `#screen-menu` contains `<div class="module-grid">` with only 4 cards.
- **`style.css:1830-1850`**: Milestone 1 already defined CSS styles for 5 modules in the menu:
  ```css
  @media (min-width: 1400px) {
    .module-grid.has-5-modules {
      grid-template-columns: repeat(5, 1fr);
      max-width: 1350px;
    }
  }
  @media (max-width: 1399px) and (min-width: 850px) {
    .module-grid.has-5-modules {
      display: flex; flex-wrap: wrap; justify-content: center; max-width: 1020px;
    }
    .module-grid.has-5-modules .btn-module {
      flex: 0 1 calc(33.333% - 24px); min-width: 250px; max-width: 320px;
    }
  }
  ```
- **`index.html:211-216`**: Script inclusions currently include `data/students.js`, `data/content.js`, `app.js`, `modules/typing.js`, `modules/teacher.js`. `<script src="modules/mouse.js"></script>` is missing.

### 1.3. Data Storage Contract in `app.js` and `PROJECT.md`
- **`PROJECT.md:76-80`**: Interface Contract specifies:
  - `MouseTrainer.finishSession()` emits session summary:  
    `{ taskId: string, taskName: string, score: number, time: number, stars: number, date: string, accuracy?: number }`.
  - Persisted into `trainer_progress[studentId].mouse.sessions` and `completedTasks`.
- **`app.js:71-106`**: `saveProgress(studentId, module, data)` currently only checks `if (module === 'typing')` and `else if (module === 'tests')`. It requires a branch for `else if (module === 'mouse')` and defensive initialization of `record.mouse` to ensure existing student progress is never overwritten or corrupted.
- **`app.js:500-569`**: `_renderResults()` only displays typing statistics and completed tests. It must render completed mouse tasks and earned stars.

### 1.4. Test Harness Capabilities in `tests/`
- Command: `powershell -Command "cd 'C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer'; node tests/runner.js tests/test_infra.test.js"` executed with exit code 0, passing all 45 test assertions in 0.20s.
- `tests/helpers/dom_env.js` already provides complete mocks for:
  - `MockMouseEvent` (with `click`, `dblclick`, `contextmenu` and `button: 2`).
  - `MockDragEvent` and `MockDataTransfer` (with `dispatchDragDrop()`).
  - `MockAudioContext` (tracking `createOscillator()`, `createGain()`, frequency values, `connect()`, and destination).
  - `localStorage` proxy.

---

## 2. Logic Chain

From these observations, we derive concrete specifications across the 4 key architecture domains:

### 2.1. Domain 1: Curriculum Alignment & Pedagogical Framing

Every exercise in Milestone 3 must directly teach, practice, and evaluate the exact mouse techniques specified in 7th-grade Informatics Lesson 7-2-4 Slide 10 and Lesson 7-2-3 Slides 8-19.

| # | Exercise Name & ID | Curriculum Technique (7-2-4 / 7-2-3) | Pedagogical Objective & Real-World Metaphor | Concrete Mechanics & Parameters | Error Coaching / Feedback |
|---|--------------------|--------------------------------------|---------------------------------------------|---------------------------------|---------------------------|
| **Ex 1** | **Снайпер клика** (`ex1_click`) | **Щелчок** (Lesson 7-2-4 Slide 10) | Точность наведения курсора и левого щелчка по мелким объектам интерфейса (иконки, кнопки закрытия, чекбоксы). | 15 целей, уменьшающихся в размерах: 60px (уровень 1), 46px (уровень 2), 34px (уровень 3). Координаты внутри игрового поля с паддингом 24px. Таймер цели: 2.5с -> 2.0с -> 1.6с. | При промахе: красный круговой импульс, штраф -5% к точности. Подсказка: *"Старайся кликать точно в центр значка, не двигая мышь в момент нажатия!"* |
| **Ex 2** | **Быстрый даблклик** (`ex2_dblclick`) | **Двойной щелчок** (7-2-4 Slide 10 & Slide 6 "Оперирование объектами в окнах") | Отработка ритма и скорости двойного клика для запуска программ и открытия папок на рабочем столе. | Имитация рабочего стола ОС. 5 объектов (папки "Мои документы", "Презентации", программы "Блокнот.exe", "Paint.exe", "Калькулятор.exe"). Порог между кликами: `Δt <= 450ms` по одному объекту (`Δx, Δy < 8px`). | Если `Δt > 450ms`: анимация тряски, подсказка *"Слишком медленно! Компьютер воспринял это как два отдельных клика. Сделай два быстрых щелчка подряд!"* Если клик по разным значкам: *"Кликай дважды по одной и той же иконке!"* |
| **Ex 3** | **Контекстное меню** (`ex3_context`) | **Щелчок правой кнопкой** (7-2-4 Slide 10 & Slide 12 "Контекстное меню", 7-2-3 Slide 19 "Операции с файлами") | Вызов контекстного меню правой кнопкой, блокировка системного меню браузера, выбор файловых команд. | Перехват события `contextmenu` с `e.preventDefault()`. Позиционирование кастомного меню с защитой от вылета за экран (`Math.min(x, maxX)`). 4 задания: "Создать папку", "Переименовать файл Реферат.docx", "Удалить в корзину", "Посмотреть свойства". | При обычном левом клике: подсказка *"Нажми ПРАВУЮ кнопку мыши на файле!"* Меню скрывается при клике вне его или по клавише Escape. |
| **Ex 4** | **Файловый архитектор** (`ex4_dragdrop`) | **Перетаскивание** (7-2-4 Slide 10 & 7-2-3 Slides 8-13 "Файлы и расширения", Slide 19 "Перемещение и удаление") | Сортировка файлов по типам расширений в соответствующие каталоги и очистка мусора в Корзину. | 10 файлов на рабочем столе: `Онегин.doc`, `Пушкин.docx`, `буква.txt` -> папка **"Документы"**; `Бия.jpeg`, `Катунь.jpeg`, `аквариум.bmp` -> папка **"Изображения"**; `мелодия.mp3`, `гимн.wav` -> папка **"Музыка"**; `кэш.tmp`, `вирус_троян.exe` -> **"Корзина"**. | При переносе не в ту папку: файл пружинит назад, звучит мягкий сигнал ошибки, появляется подсказка: *"Файл .mp3 — это звуковой файл! Перенеси его в папку 'Музыка'."* |
| **Ex 5** | **Системный навигатор** (`ex5_hover`) | **Наведение указателя мыши** (7-2-4 Slide 10 & Slide 7 "Свойства объектов", Slide 11 "Дружественный интерфейс") | Удержание курсора для вызова всплывающих подсказок (tooltips) и чтения свойств компьютерных объектов (размер, дата, тип). | 6 значков в панели задач и на рабочем столе. Таймер задержки наведения: 350 мс стабильного удержания курсора (`pointerenter`). Вопросы-квесты: "Найди файл размером 45 МБ", "Узнай, когда был создан документ", "Найди индикатор сети". | При быстром срыве курсора (<300 мс) подсказка не открывается. Подсказка: *"Задержи указатель мыши над значком на полсекунды, не двигая рукой."* |

---

### 2.2. Domain 2: Screen & Router Integration in `index.html` & `app.js`

#### 2.2.1. Changes in `index.html`:
1. **Menu Card in `#screen-menu` (lines 107-128)**:
   Add class `has-5-modules` to container and append the 5th module card:
   ```html
   <div class="module-grid has-5-modules">
     <button class="btn btn-module" data-module="typing">
       <span class="module-icon">⌨️</span>
       <span class="module-name">Слепая печать</span>
       <span class="module-desc">Клавиатурный тренажёр: ряды, слова и предложения</span>
     </button>
     <button class="btn btn-module" data-module="mouse" id="btn-module-mouse">
       <span class="module-icon">🖱️</span>
       <span class="module-name">Тренажёр мыши</span>
       <span class="module-desc">Клик, даблклик, контекстное меню, drag-and-drop и наведение</span>
     </button>
     <button class="btn btn-module" data-module="theory">
       <span class="module-icon">📚</span>
       <span class="module-name">Материалы уроков</span>
       <span class="module-desc">Слайды и темы презентаций учебной программы</span>
     </button>
     <button class="btn btn-module" data-module="test">
       <span class="module-icon">✅</span>
       <span class="module-name">Мини-тесты</span>
       <span class="module-desc">Проверка теоретических знаний по информатике</span>
     </button>
     <button class="btn btn-module" data-module="stats">
       <span class="module-icon">📊</span>
       <span class="module-name">Мои результаты</span>
       <span class="module-desc">Подробная статистика скорости, точности и тестов</span>
     </button>
   </div>
   ```

2. **Screen Container `#screen-mouse`**:
   Insert immediately following `#screen-typing` (after line 145):
   ```html
   <!-- ══════════════════════════════════════════
        #screen-mouse — Тренажёр мыши
   ══════════════════════════════════════════ -->
   <div id="screen-mouse" class="screen">
     <div class="screen-header">
       <button class="btn btn-back" data-back="screen-menu">← В меню</button>
       <h2 class="screen-title">Интерактивный тренажёр мыши</h2>
     </div>
     <div class="screen-body">
       <div id="mouse-container" class="module-container">
         <!-- Заполняется modules/mouse.js -->
       </div>
     </div>
   </div>
   ```

3. **Script Inclusion (lines 211-216)**:
   Add `modules/mouse.js` before `modules/teacher.js`:
   ```html
   <script src="data/students.js"></script>
   <script src="data/content.js"></script>
   <script src="app.js"></script>
   <script src="modules/typing.js"></script>
   <script src="modules/mouse.js"></script>
   <script src="modules/teacher.js"></script>
   ```

#### 2.2.2. Changes in `app.js`:
1. **Screen Registry (line 19)**:
   ```javascript
   const SCREENS = [
     'screen-login',
     'screen-class',
     'screen-student',
     'screen-teacher-login',
     'screen-menu',
     'screen-typing',
     'screen-mouse',       // <-- Inserted
     'screen-materials',
     'screen-tests',
     'screen-results',
     'screen-teacher',
   ];
   ```

2. **Navigation Wiring in `_bindNavigation()` (lines 668-701)**:
   ```javascript
   // Модули из главного меню
   document.querySelectorAll('.btn-module').forEach(btn => {
     btn.addEventListener('click', () => {
       const mod = btn.getAttribute('data-module');
       if (mod === 'typing') {
         showScreen('screen-typing');
         if (window.TypingTrainer && typeof window.TypingTrainer.init === 'function') {
           window.TypingTrainer.init('typing-container');
         }
       } else if (mod === 'mouse') {       // <-- Inserted
         showScreen('screen-mouse');
         if (window.MouseTrainer && typeof window.MouseTrainer.init === 'function') {
           window.MouseTrainer.init('mouse-container');
         }
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
       if (btn.closest('#screen-typing') && window.TypingTrainer && typeof window.TypingTrainer.destroy === 'function') {
         window.TypingTrainer.destroy();
       }
       if (btn.closest('#screen-mouse') && window.MouseTrainer && typeof window.MouseTrainer.destroy === 'function') {
         window.MouseTrainer.destroy();    // <-- Inserted
       }
       if (target === 'screen-menu') {
         _renderMenu();
       }
       showScreen(target);
     });
   });
   ```

3. **Student Logout Cleanup in `logout()` (lines 141-148)**:
   ```javascript
   function logout() {
     state.currentStudent = null;
     state.currentClass = null;
     if (window.TypingTrainer && typeof window.TypingTrainer.destroy === 'function') {
       window.TypingTrainer.destroy();
     }
     if (window.MouseTrainer && typeof window.MouseTrainer.destroy === 'function') {
       window.MouseTrainer.destroy();      // <-- Inserted
     }
     showScreen('screen-login');
   }
   ```

---

### 2.3. Domain 3: M3 ↔ M4 Interface Contract & Backward-Compatible Persistence

#### 2.3.1. Emitted Session Payload: `MouseTrainer.finishSession(sessionData)`
When an exercise completes, `MouseTrainer` constructs the session summary object matching the exact specification from `PROJECT.md:78`:
```typescript
interface MouseSessionResult {
  taskId: string;       // e.g. "ex1_click", "ex2_dblclick", "ex3_context", "ex4_dragdrop", "ex5_hover"
  taskName: string;     // e.g. "Снайпер клика", "Быстрый даблклик", "Контекстное меню", "Файловый архитектор", "Системный навигатор"
  score: number;        // integer, 0 - 100+ points
  time: number;         // duration in elapsed seconds (integer)
  stars: number;        // 1, 2, or 3 (calculated from score/accuracy thresholds)
  date: string;         // formatted date, e.g. "12.11.2026" or new Date().toLocaleDateString('ru-RU')
  accuracy?: number;    // optional percentage (e.g. 94)
  mistakes?: number;    // optional count of errors
}
```

Star Calculation Formula:
- **3 Stars (⭐⭐⭐)**: Accuracy >= 90% AND time within target benchmark (e.g. <= 30s).
- **2 Stars (⭐⭐)**: Accuracy >= 70% OR completed with <= 2 mistakes.
- **1 Star (⭐)**: Exercise completed successfully with > 2 mistakes.

#### 2.3.2. Persistence Schema in `localStorage['trainer_progress']`
The storage schema is strictly **additive** and preserves existing records.

```json
{
  "7A-01": {
    "studentId": "7A-01",
    "name": "Безруков Иван",
    "class": "7-А",
    "typing": {
      "sessions": [
        { "date": "11.11.2026", "speed": 115, "accuracy": 96, "level": 1, "duration": 40 }
      ],
      "bestSpeed": 115,
      "bestAccuracy": 96,
      "totalSessions": 1
    },
    "tests": {
      "sessions": [],
      "totalSessions": 0
    },
    "mouse": {
      "sessions": [
        {
          "taskId": "ex1_click",
          "taskName": "Снайпер клика",
          "score": 100,
          "time": 22,
          "stars": 3,
          "accuracy": 100,
          "date": "12.11.2026"
        }
      ],
      "completedTasks": {
        "ex1_click": {
          "taskId": "ex1_click",
          "taskName": "Снайпер клика",
          "bestScore": 100,
          "bestStars": 3,
          "bestTime": 22,
          "lastCompleted": "12.11.2026"
        }
      },
      "totalScore": 100,
      "totalStars": 3,
      "totalSessions": 1
    }
  }
}
```

#### 2.3.3. Update in `app.js:saveProgress()`:
```javascript
function saveProgress(studentId, module, data) {
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
    };
  }

  const record = all[studentId];

  // Defensive migration: ensure mouse structure exists for pre-existing records
  if (!record.mouse) {
    record.mouse = { sessions: [], completedTasks: {}, totalScore: 0, totalStars: 0, totalSessions: 0 };
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
  } else if (module === 'mouse') {       // <-- Inserted
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
}
```

#### 2.3.4. Results Screen Presentation in `app.js:_renderResults()`:
In `_renderResults()` (after typing and tests blocks), append:
```javascript
if (prog.mouse && prog.mouse.sessions && prog.mouse.sessions.length > 0) {
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
```

---

### 2.4. Domain 4: Automated Verification Strategy

To guarantee that Milestone 3 functions with 100% test pass rates without human intervention, we specify a two-tier automated testing architecture:

```
┌────────────────────────────────────────────────────────────────────────┐
│                   Automated Verification Architecture                   │
├──────────────────────────────────┬─────────────────────────────────────┤
│   Tier 1: Feature Unit Tests     │   Tier 4: Browser E2E Tests         │
│   (Node.js runner + dom_env.js)  │   (Python Selenium Edge Headless)   │
├──────────────────────────────────┼─────────────────────────────────────┤
│ - Zero external npm dependencies │ - Real Chromium/Edge browser engine │
│ - Microsecond execution (<0.5s)  │ - Actual pointer ActionChains       │
│ - MockAudioContext verification  │ - Full SPA navigation & modals      │
│ - DOM event dispatch (DnD, RClick│ - CSS rendering and layout tests    │
│ - LocalStorage persistence tests │ - Multi-screen lifecycle tests      │
└──────────────────────────────────┴─────────────────────────────────────┘
```

#### 2.4.1. Tier 1 Headless DOM Unit Test Plan (`tests/tier1_features/test_mouse_trainer.test.js`)
Executed via: `node tests/runner.js tests/tier1_features/test_mouse_trainer.test.js`

1. **Suite 1: Module Export & Initialization Contract**:
   - Verify `window.MouseTrainer` is defined with methods: `init`, `start`, `destroy`, `finishSession`, `selectExercise`.
   - Verify `MouseTrainer.init('mouse-container')` constructs DOM layout:
     - Header with title, exercise selector tabs (5 buttons with `data-exercise="ex1_click"` through `ex5_hover`).
     - Status bar HUD (score, time, accuracy, sound toggle button).
     - Exercise playground area `#mouse-playground`.
     - Hidden completion modal/card `#mouse-result-card`.
   - Verify `destroy()` cancels all intervals, timeouts, and removes listeners.
   - Verify calling `init()` multiple times does not duplicate event listeners or DOM elements.

2. **Suite 2: Web Audio API Synthesis & Autoplay Compliance**:
   - Verify `MockAudioContext` creates oscillators with appropriate waveform types (`sine`, `triangle`, `sawtooth`).
   - Verify `playClickSound()` triggers oscillator with frequency ~800-1200Hz.
   - Verify `playSuccessSound()` triggers chord/frequencies (e.g. 587Hz -> 880Hz).
   - Verify `playErrorSound()` triggers low-frequency buzzer (~150-180Hz) with sawtooth wave.
   - Verify Autoplay resume: if audio context starts in `'suspended'`, first pointer event invokes `audioCtx.resume()`.
   - Verify Mute persistence: clicking mute toggle button writes `localStorage.getItem('trainer_sound_muted') === 'true'`, and sound methods return immediately without creating audio nodes.

3. **Suite 3: Exercise 1 (Single Click / Снайпер клика)**:
   - Select `ex1_click`, start exercise.
   - Assert target `.mouse-target` appears within `#mouse-playground`.
   - Dispatch `click` on `.mouse-target`:
     - Assert hit registered: score increases by 10 points, audio success plays, target moves/respawns.
   - Dispatch `click` on `#mouse-playground` (miss):
     - Assert miss registered: miss count increments, accuracy drops below 100%, audio error buzz plays.
   - Dispatch 15 hits:
     - Assert exercise finishes, `#mouse-result-card` displays, stars calculated (1-3 ⭐).

4. **Suite 4: Exercise 2 (Double Click / Быстрый даблклик)**:
   - Select `ex2_dblclick`.
   - Dispatch 2 clicks within 250ms on same folder element:
     - Assert folder opens (class `.folder-open` or open window appears), success chime plays.
   - Dispatch 2 clicks separated by 600ms (>450ms):
     - Assert folder does NOT open, shake animation class added, coaching prompt appears (*"Слишком медленно..."*).
   - Dispatch click on Folder A then immediately on Folder B:
     - Assert double click does NOT trigger.

5. **Suite 5: Exercise 3 (Right Click Context Menu)**:
   - Select `ex3_context`.
   - Target desktop file element is clicked with `contextmenu` event (`button: 2`).
   - Assert `e.defaultPrevented === true`.
   - Assert `#mouse-context-menu` is visible, positioned at `clientX`/`clientY` coordinates.
   - Click context menu item `[data-action="rename"]`:
     - Assert action executed, menu disappears, success registered.
   - Click outside menu on playground:
     - Assert menu closes.

6. **Suite 6: Exercise 4 (Drag-and-Drop File Sorting)**:
   - Select `ex4_dragdrop`.
   - Using `domEnv.dispatchDragDrop(sourceFile, targetFolder)`:
     - Drag `Онегин.doc` into folder `Документы`: assert accepted, file removed from playground, folder count badge = 1.
     - Drag `мелодия.mp3` into folder `Изображения`: assert rejected, file bounces back, folder count remains 0, error sound plays.
     - Drag `кэш.tmp` into `Корзина`: assert accepted, trash bin icon updates to full.
   - Sort all 10 files: assert exercise finishes with 3 stars.

7. **Suite 7: Exercise 5 (Pointer Hover & Tooltips)**:
   - Select `ex5_hover`.
   - Dispatch `pointerenter` on file icon.
   - Check DOM at t=100ms: tooltip is NOT visible.
   - Advance clock to t=400ms: tooltip element is visible with text containing file size/properties.
   - Dispatch `pointerleave`: tooltip is immediately hidden.

8. **Suite 8: Data Persistence & Router Contract**:
   - Set active student in `App.state.currentStudent = { id: '7A-01', name: 'Безруков Иван' }`.
   - Trigger `MouseTrainer.finishSession({ taskId: 'ex1_click', taskName: 'Снайпер клика', score: 100, time: 20, stars: 3, date: '12.11.2026' })`.
   - Read `localStorage.getItem('trainer_progress')`:
     - Assert `progress['7A-01'].mouse.sessions` length is 1.
     - Assert `progress['7A-01'].mouse.completedTasks['ex1_click'].bestStars === 3`.
     - Assert `progress['7A-01'].typing` was NOT modified.

#### 2.4.2. Tier 4 Browser E2E Automated Test (`tests/test_mouse_trainer_e2e.py`)
Executed via: `python tests/test_mouse_trainer_e2e.py`

Using Selenium WebDriver with Edge in headless mode:
```python
# Core Verification Scenario
1. Open index.html via file:/// protocol.
2. Click button "#btn-student" -> screen changes to "#screen-class".
3. Select class "7-А" -> screen changes to "#screen-student".
4. Click student card "Безруков Иван" -> screen changes to "#screen-menu".
5. Assert "#btn-module-mouse" exists and is visible.
6. Click "#btn-module-mouse":
   - Assert "#screen-mouse" has class "active" and style "display: flex".
   - Assert "#screen-menu" is hidden ("display: none").
   - Assert window scrollbars are absent (no overflow scroll).
7. Execute Selenium ActionChains:
   - ActionChains(driver).click(target).perform() -> verify hit sound & score update.
   - ActionChains(driver).double_click(folder).perform() -> verify window opens.
   - ActionChains(driver).context_click(file_icon).perform() -> verify custom context menu renders and native browser menu is suppressed.
   - ActionChains(driver).drag_and_drop(source_file, target_folder).perform() -> verify file sorts into folder.
   - ActionChains(driver).move_to_element(status_icon).pause(0.5).perform() -> verify tooltip displays.
8. Click back button 'button[data-back="screen-menu"]':
   - Assert "#screen-mouse" is hidden.
   - Assert "#screen-menu" is visible.
   - Assert MouseTrainer timers are halted.
9. Click "#screen-menu button[data-module='stats']":
   - Assert "#screen-results" displays "🖱️ Тренажёр работы с мышью" with earned stars and completed exercise rows.
```

---

## 3. Caveats

1. **Browser Autoplay Restrictions**:
   Modern Chromium browsers block Web Audio playback if initialized prior to user interaction. `MouseTrainer` must lazily instantiate `AudioContext` or resume suspended contexts during the first `click` or `pointerdown` event.
2. **Drag-and-Drop Cross-Platform Behavior**:
   Native HTML5 Drag and Drop (`dragstart`, `dragover`, `drop`) behaves inconsistently across touch screens or older emulated environments. `MouseTrainer` should implement dual-support: native HTML5 Drag and Drop events backed by standard pointer/mouse event tracking (`pointerdown`, `pointermove`, `pointerup`) with `elementFromPoint(x, y)` to ensure 100% reliability in both headless test runners and real browsers.
3. **Screen Resolution & Layout Bounds**:
   Target spawning and drag drop zones must use container-relative percentage or clamped coordinates (`clientX - rect.left`) rather than viewport coordinates (`pageX, pageY`) so that target detection remains pixel-perfect across 1280x720, 1366x768, and 1920x1080 resolutions.

---

## 4. Conclusion

1. **Curriculum Alignment**: All 5 exercises directly map 1-to-1 to the 7th-grade Informatics textbook:
   - Lesson 7-2-4 Slide 10 defines the exact mouse techniques: Щелчок (`ex1_click`), Двойной щелчок (`ex2_dblclick`), Щелчок правой кнопкой (`ex3_context`), Перетаскивание (`ex4_dragdrop`), Наведение указателя мыши (`ex5_hover`).
   - Lesson 7-2-3 Slides 8-19 supplies the file extensions (`.txt`, `.doc`/`.docx`, `.rtf`, `.jpg`/`.jpeg`, `.bmp`, `.mp3`, `.tmp`, `.exe`), folder organization, and deletion into the trash bin.
2. **Screen Integration**:
   - `index.html` requires adding class `has-5-modules` and the 5th module button in `#screen-menu`, adding container `#screen-mouse`, and including `<script src="modules/mouse.js"></script>`.
   - `app.js` requires adding `'screen-mouse'` to `SCREENS`, wiring the menu click handler, and invoking `MouseTrainer.destroy()` upon navigation back and logout.
3. **Persistence Contract**:
   - `MouseTrainer.finishSession()` emits `{ taskId, taskName, score, time, stars, date, accuracy }`.
   - `saveProgress(studentId, 'mouse', data)` stores sessions in `record.mouse.sessions`, updates `record.mouse.completedTasks`, and recalculates `totalStars` and `totalScore` while strictly preserving `typing` and `tests` progress.
   - Results screen `#screen-results` displays earned stars, total score, and completed mouse sessions table.
4. **Automated Verification**:
   - Tier 1 feature unit tests in `tests/tier1_features/test_mouse_trainer.test.js` using Node.js master runner `tests/runner.js` and `tests/helpers/dom_env.js` verify all 5 exercises, sound synthesis, and localStorage persistence in <0.5s with zero external npm dependencies.
   - Tier 4 E2E browser tests in `tests/test_mouse_trainer_e2e.py` using Selenium Edge headless verify actual mouse interactions, double-click timing, context menu suppression, drag-and-drop, and tooltip display.

---

## 5. Verification Method

To verify these specifications independently:

1. **Infra Test Suite Verification**:
   Execute:
   ```powershell
   powershell -Command "cd 'C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer'; node tests/runner.js tests/test_infra.test.js"
   ```
   *Expected result*: 45/45 tests pass in <0.3s.

2. **Curriculum Alignment Check**:
   Inspect `data/content.json` at lines 181-280 (7-2-3) and 440-460 (7-2-4):
   ```powershell
   powershell -Command "Select-String -Path 'C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\data\content.json' -Pattern 'Щелчок', 'Двойной щелчок', 'Щелчок правой кнопкой', 'Перетаскивание', 'Наведение указателя мыши'"
   ```
   *Expected result*: Slide 10 of topic 7-2-4 matches the 5 exercises verbatim.

3. **Menu CSS Grid Verification**:
   Inspect `style.css` lines 1830-1850:
   ```powershell
   powershell -Command "Select-String -Path 'C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\style.css' -Pattern 'has-5-modules' -Context 5"
   ```
   *Expected result*: Confirms that M1 already created responsive rules for `.module-grid.has-5-modules`.

4. **Tier 1 Unit Test Implementation & Verification (Post-Implementation)**:
   Once `modules/mouse.js` is created by Worker M3, run:
   ```powershell
   powershell -Command "cd 'C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer'; node tests/runner.js tests/tier1_features/test_mouse_trainer.test.js"
   ```
   *Expected result*: All 8 test suites pass with 0 failures.
