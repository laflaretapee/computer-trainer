# Handoff Report: Explorer 2 (Milestone 4 — Features F16, F17, F20)

**Date**: 2026-11-13  
**Agent**: Explorer 2 (`explorer_m4_2`)  
**Target Features**:
- **F16**: Teacher Dashboard Enhancement & Multi-PC Aggregation
- **F17**: Network-Aware Auto-Update & Silent Offline Fallback
- **F20**: Offline-First Telemetry Sync & Progress Queue

---

## 1. Observation

Direct code observations from inspecting the codebase:

### 1.1 Teacher Dashboard (`modules/teacher.js`)
1. **Active Student Count Bug (Line 30–36)**:
   ```javascript
   let activeStudentsCount = 0;
   Object.keys(progress).forEach(k => {
     const p = progress[k];
     if ((p.typing && p.typing.totalSessions > 0) || (p.tests && p.tests.totalSessions > 0)) {
       activeStudentsCount++;
     }
   });
   ```
   *Direct observation*: `activeStudentsCount` only checks `typing` and `tests`. It completely ignores `p.mouse && p.mouse.totalSessions > 0`, `p.gamification && p.gamification.xp > 0`, and `p.focusViolations > 0`. A student who only completed mouse exercises is incorrectly counted as inactive.
2. **Missing Columns in Teacher Table Header (Lines 71–83)**:
   ```html
   <thead>
     <tr>
       <th>№</th>
       <th>Класс</th>
       <th>ФИО Ученика</th>
       <th>Печать (лучшая)</th>
       <th>Точность</th>
       <th>Сессий печати</th>
       <th>Тесты (сдано)</th>
       <th>Действия</th>
     </tr>
   </thead>
   ```
   *Direct observation*: The table has NO column for Mouse trainer results (`p.mouse`), NO column for Gamification level/XP (`p.gamification`), and NO column for FocusGuard anti-cheat violations (`p.focusViolations`).
3. **`hasData` Flag Ignores Mouse & Violations (Line 117)**:
   ```javascript
   const hasData = Boolean(p && ((p.typing && p.typing.totalSessions > 0) || (p.tests && p.tests.totalSessions > 0)));
   ```
   *Direct observation*: Same bug as `activeStudentsCount`: rows for students with only mouse or violation data do not get marked `.row-active` and do not show the reset button.
4. **CSV Export Missing Expanded Columns (Lines 181–208)**:
   ```javascript
   let csvContent = '\uFEFF'; // BOM для корректного открытия в Excel на русском
   csvContent += 'Класс;Ученик;ID;Сессий печати;Лучшая скорость (сим/мин);Точность (%);Пройдено тестов\n';
   // ...
   csvContent += `"${cls.name}";"${st.name}";"${st.id}";${typingSessions};${typingSpeed};${typingAcc};${testsCount}\n`;
   ```
   *Direct observation*: UTF-8 BOM (`\uFEFF`) and semicolon delimiter are present. However, CSV export completely omits mouse statistics (sessions, score, stars, completed tasks), gamification data (level, levelTitle, total XP), and `focusViolations`.
5. **Multi-PC JSON Bundle Export & Import/Merge Missing (Entire file)**:
   *Direct observation*: There are zero functions or UI elements for exporting a multi-PC JSON backup bundle (`{ exportDate, sourcePC, progress }`) or importing and performing a non-destructive deep merge into `localStorage['trainer_progress']`.
6. **Telemetry Sync UI Missing (Entire file)**:
   *Direct observation*: There is no configurable Sync URL field, no pending sync queue count display, no last sync timestamp, and no manual "Синхронизировать сейчас" trigger button.
7. **Sticky Header Support in CSS (`style.css:1499–1514`)**:
   ```css
   .teacher-table th {
     position: sticky;
     top: 0;
     background: #f8fafc;
     color: var(--color-muted);
     /* ... */
     z-index: 10;
     box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
   }
   ```
   *Direct observation*: Sticky header CSS is already implemented on `.teacher-table th` within `.table-responsive` (`max-height: 70vh; overflow-x: auto;`).

### 1.2 Network-Aware Auto-Update (`app.js` & `version.json`)
1. **Manifest File Missing**:
   *Direct observation*: Running `read_file` on `C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\version.json` returned `file does not exist`.
2. **Zero Auto-Update Logic in `app.js`**:
   *Direct observation*: `app.js` lines 1–801 contain zero occurrences of `navigator.onLine`, `addEventListener('online')`, `addEventListener('offline')`, `AbortController`, or `fetch('version.json')`.
3. **Missing UI Indicators in `index.html`**:
   *Direct observation*: Neither `#screen-teacher` nor the app header contains an update status indicator or a "Проверить обновление" button.

### 1.3 Offline-First Telemetry Sync (`app.js` & `localStorage`)
1. **No `sync_queue` in `App.saveProgress` (`app.js:72–140`)**:
   ```javascript
   function saveProgress(studentId, module, data) {
     const all = getAllProgress();
     // ... updates all[studentId] ...
     try {
       localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
     } catch (e) {
       console.error('Не удалось сохранить прогресс:', e);
     }
   }
   ```
   *Direct observation*: `saveProgress` only writes to `localStorage['trainer_progress']`. It never writes to `localStorage['sync_queue']`. No telemetry queue is maintained for offline buffering.
2. **No Automatic or Manual Sync POST**:
   *Direct observation*: No network dispatcher exists in `app.js` to POST queued events or progress snapshots to a configured server endpoint.

### 1.4 Test Infrastructure (`tests/helpers/dom_env.js` & `tests/test_infra.test.js`)
1. *Direct observation*: `tests/helpers/dom_env.js` already provides:
   - `env.setOnline(boolean)`: dispatches `window` and `document` `online`/`offline` events and toggles `navigator.onLine`.
   - `window.fetch` mock: automatically rejects with `TypeError: Failed to fetch: Network is offline` when `!navigator.onLine`, and records all requests in `window.__fetchCalls`.
   - `localStorage` mock supporting `localStorage['sync_queue']` and method access (`getItem`, `setItem`).
2. *Direct observation*: Running `tests/runner.js` executes 145 existing tests with 144 passing (the only failure is an unrelated mouse ex123 stress test).

---

## 2. Logic Chain

1. **Teacher Table & CSV Gaps (F16)**:
   - *Premise*: Milestones 2 and 3 implemented touch typing and interactive mouse training. Milestone 4 adds gamification (F14) and FocusGuard anti-cheat (F21).
   - *Deduction*: A teacher evaluating student performance needs to see:
     1. Touch typing: best CPM, best accuracy, sessions.
     2. Mouse training: total stars (out of 15), total score, completed tasks count.
     3. Gamification: current level (1 to 5) and total XP.
     4. FocusGuard: count of focus violation attempts (`focusViolations`).
   - *Impact*: Because `modules/teacher.js` lacks these columns in both the DOM table and the CSV export, the teacher has no visibility into student mouse skills, gamification progression, or tab-switching violations.
   - *CSV Backward-Compatibility*: In accordance with `PROJECT.md` interface contracts, the initial 7 columns (`Класс;Ученик;ID;Сессий печати;Лучшая скорость (сим/мин);Точность (%);Пройдено тестов`) must remain at indices 0–6, with the new metrics appended at indices 7–14.

2. **Multi-PC Offline Aggregation (F16 & Follow-up 2)**:
   - *Premise*: Computer labs in Russian schools often lack a central LAN database or cloud backend. Students work on independent workstations.
   - *Deduction*: The teacher needs a mechanism to export data from student PCs onto a flash drive and combine them on the teacher's workstation.
   - *Requirements for Merge*: The import cannot be a simple overwrite, because students may have completed typing on PC 1 and mouse training on PC 2. The merge must be a non-destructive deep merge:
     - Combine session arrays without duplicating identical sessions.
     - Keep `Math.max` for best speeds, accuracies, scores, stars, XP, and levels.
     - Take union of unlocked achievement badges.
     - Sum or take `Math.max` of focus violation counts.

3. **Auto-Update Mechanism (F17 & Follow-up 1)**:
   - *Premise*: The trainer must operate 100% offline and under `file://` protocol without network dependencies, but automatically check for updates when connected to the internet.
   - *Deduction*:
     - When `navigator.onLine === false`: zero network calls; status is "Офлайн-режим".
     - When `window.location.protocol === 'file:'`: remote manifest fetching is not applicable; status is "Локальный режим (file://)".
     - When `navigator.onLine === true` and protocol is `http:` / `https:`: fetch `version.json` with an `AbortController` timeout of 2500ms.
     - Any network failure or timeout MUST be silently caught without console errors or UI disruption.
     - If the remote version is greater than the local version, notify the user with an "Обновить" action.

4. **Offline-First Telemetry Sync (F20 & Follow-up 2)**:
   - *Premise*: The user requested: *"при подключению к интернету, я получал из их локал данных всю информацию по успеваемости"*.
   - *Deduction*:
     - Every completed session in typing, mouse, or tests must append a telemetry event to `localStorage['sync_queue']`.
     - When the PC connects to the internet (`window.addEventListener('online')`) or the teacher clicks "Синхронизировать сейчас", the app inspects `localStorage['trainer_sync_url']`.
     - If no URL is set or network is offline: silent no-op.
     - If URL is configured and network is online: POST the queued events along with the full progress snapshot using `fetch()` with a 5000ms timeout.
     - Upon HTTP 200/201/204 response: clear `sync_queue` and record `lastSync` timestamp.
     - On failure: preserve all items in `sync_queue` so zero data is lost.

---

## 3. Caveats

1. **No External Network in Production Environment**: In pure `file://` deployments without a local web server, browser security restrictions prevent `fetch()` from requesting remote webhooks (CORS) or local files without flags. The implementation must treat `file://` and CORS rejections as normal offline states without throwing uncaught errors.
2. **Parallel Milestone 4 Feature Branches**: Feature F14 (Gamification) is being explored by Explorer 1 (`explorer_m4_1`), and Feature F21 (FocusGuard) by Spec Miner (`spec_miner_m4_3`). All data keys (`p.gamification.xp`, `p.gamification.level`, `p.focusViolations`) must be handled defensively with fallback defaults (e.g. `(p.gamification && p.gamification.xp) || 0`, `p.focusViolations || 0`).
3. **Data Preservation**: 100% preservation of 79 students across classes 7-А..7-Д and lessons 7-2-2..7-2-6 must be strictly maintained; no schema modification may delete or rename existing keys in `localStorage['trainer_progress']`.

---

## 4. Conclusion & Concrete Implementation Specifications

### 4.1 Schema Specifications

#### A. `version.json` (At project root)
```json
{
  "version": "1.1.0",
  "buildDate": "2026-11-13",
  "features": [
    "UI/UX Design System (F1, F2, F3)",
    "10-finger typing engine and hands visualizer (F5, F6, F7)",
    "5-level interactive mouse trainer (F8, F9, F10, F11, F12, F13)",
    "Gamification, XP, 5 levels and achievements (F14)",
    "Student and content data preservation (F15)",
    "Teacher dashboard multi-PC aggregate and safe CSV export (F16)",
    "Network-aware auto-update mechanism (F17)",
    "Offline-first telemetry sync (F20)",
    "FocusGuard anti-cheat protection (F21)"
  ]
}
```

#### B. Telemetry Event Schema (`localStorage['sync_queue']`)
`sync_queue` stores a JSON array of events:
```json
[
  {
    "id": "evt_1700000000000_abc123",
    "timestamp": "2026-11-13T10:00:00.000Z",
    "studentId": "7A-01",
    "studentName": "Безруков Иван",
    "studentClass": "7-А",
    "module": "typing",
    "data": { "speed": 120, "accuracy": 98, "errors": 1, "level": 2, "duration": 60, "date": "13.11.2026" },
    "summary": {
      "bestSpeed": 120,
      "bestAccuracy": 98,
      "mouseScore": 450,
      "mouseStars": 12,
      "testsCount": 3,
      "xp": 350,
      "level": 3,
      "focusViolations": 0
    }
  }
]
```

#### C. Multi-PC JSON Export Bundle Schema
```json
{
  "app": "computer-trainer",
  "version": "1.1.0",
  "exportDate": "2026-11-13T10:00:00.000Z",
  "sourcePC": "PC-Workstation-01",
  "totalStudentsWithData": 15,
  "progress": {
    "7A-01": { /* student progress record */ }
  }
}
```

#### D. Non-Destructive Deep Merge Algorithm (`mergeProgress(local, imported)`)
```javascript
function mergeProgress(currentProgress, importedData) {
  const importedProgress = importedData.progress || importedData;
  if (!importedProgress || typeof importedProgress !== 'object') {
    throw new Error('Некорректный формат файла данных');
  }

  const merged = { ...currentProgress };
  let addedCount = 0;
  let updatedCount = 0;

  Object.keys(importedProgress).forEach(stId => {
    const imp = importedProgress[stId];
    if (!imp || typeof imp !== 'object') return;

    if (!merged[stId]) {
      merged[stId] = JSON.parse(JSON.stringify(imp));
      addedCount++;
    } else {
      const loc = merged[stId];
      updatedCount++;

      // Merge Typing
      if (imp.typing) {
        if (!loc.typing) loc.typing = { sessions: [], bestSpeed: 0, bestAccuracy: 0, totalSessions: 0 };
        const combinedTyping = [...(loc.typing.sessions || []), ...(imp.typing.sessions || [])];
        // Deduplicate sessions
        const seen = new Set();
        loc.typing.sessions = combinedTyping.filter(s => {
          const key = `${s.date}_${s.speed}_${s.accuracy}_${s.level}_${s.duration}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        loc.typing.bestSpeed = Math.max(loc.typing.bestSpeed || 0, imp.typing.bestSpeed || 0);
        loc.typing.bestAccuracy = Math.max(loc.typing.bestAccuracy || 0, imp.typing.bestAccuracy || 0);
        loc.typing.totalSessions = loc.typing.sessions.length;
      }

      // Merge Mouse
      if (imp.mouse) {
        if (!loc.mouse) loc.mouse = { sessions: [], completedTasks: {}, totalScore: 0, totalStars: 0, totalSessions: 0 };
        const combinedMouse = [...(loc.mouse.sessions || []), ...(imp.mouse.sessions || [])];
        const seenM = new Set();
        loc.mouse.sessions = combinedMouse.filter(s => {
          const key = `${s.date}_${s.taskId}_${s.score}_${s.stars}_${s.time}`;
          if (seenM.has(key)) return false;
          seenM.add(key);
          return true;
        });
        loc.mouse.totalSessions = loc.mouse.sessions.length;

        loc.mouse.completedTasks = loc.mouse.completedTasks || {};
        if (imp.mouse.completedTasks) {
          Object.keys(imp.mouse.completedTasks).forEach(taskId => {
            const impT = imp.mouse.completedTasks[taskId];
            const locT = loc.mouse.completedTasks[taskId];
            if (!locT) {
              loc.mouse.completedTasks[taskId] = { ...impT };
            } else {
              locT.bestScore = Math.max(locT.bestScore || 0, impT.bestScore || 0);
              locT.bestStars = Math.max(locT.bestStars || 0, impT.bestStars || 0);
              locT.bestTime = Math.min(locT.bestTime || Infinity, impT.bestTime || Infinity);
            }
          });
        }
        let totalStars = 0, totalScore = 0;
        Object.values(loc.mouse.completedTasks).forEach(t => {
          totalStars += (t.bestStars || 0);
          totalScore += (t.bestScore || 0);
        });
        loc.mouse.totalStars = totalStars;
        loc.mouse.totalScore = totalScore;
      }

      // Merge Tests
      if (imp.tests) {
        if (!loc.tests) loc.tests = { sessions: [], totalSessions: 0 };
        const combinedTests = [...(loc.tests.sessions || []), ...(imp.tests.sessions || [])];
        const seenT = new Set();
        loc.tests.sessions = combinedTests.filter(s => {
          const key = `${s.date}_${s.topic}_${s.score}_${s.total}`;
          if (seenT.has(key)) return false;
          seenT.add(key);
          return true;
        });
        loc.tests.totalSessions = loc.tests.sessions.length;
      }

      // Merge Gamification
      if (imp.gamification) {
        if (!loc.gamification) loc.gamification = { xp: 0, level: 1, levelTitle: 'Новичок', achievements: [] };
        loc.gamification.xp = Math.max(loc.gamification.xp || 0, imp.gamification.xp || 0);
        loc.gamification.level = Math.max(loc.gamification.level || 1, imp.gamification.level || 1);
        if (imp.gamification.level > (loc.gamification.level || 1)) {
          loc.gamification.levelTitle = imp.gamification.levelTitle;
        }
        const achUnion = new Set([...(loc.gamification.achievements || []), ...(imp.gamification.achievements || [])]);
        loc.gamification.achievements = Array.from(achUnion);
      }

      // Merge Focus Violations (sum across PCs)
      loc.focusViolations = (loc.focusViolations || 0) + (imp.focusViolations || 0);
    }
  });

  return { merged, addedCount, updatedCount };
}
```

### 4.2 Required Modifications by File

#### 1. `version.json` (New File)
- Create `version.json` with version `1.1.0`, date, and feature list.

#### 2. `modules/teacher.js` (Enhancement)
- **Active count & hasData fixes**: Include `p.mouse && p.mouse.totalSessions > 0`, `p.gamification?.xp > 0`, and `p.focusViolations > 0`.
- **Table header & row expansions**:
  - Add columns: `Уровень / XP`, `Мышь (очки / звёзды)`, `Нарушений фокуса`.
  - Format mouse display: `⭐ ${stars}/15 (${score} очк, ${tasksCount}/5)`.
  - Format focus violations: highlight with `badge-violation` (red) if > 0.
- **CSV export expansion**:
  - Keep initial 7 columns intact:
    `Класс;Ученик;ID;Сессий печати;Лучшая скорость (сим/мин);Точность (%);Пройдено тестов;`
  - Append columns:
    `Сессий мыши;Очки мыши;Звёзды мыши;Заданий мыши;Уровень;Звание;Всего XP;Нарушений фокуса`
  - Maintain UTF-8 BOM `\uFEFF`.
- **Multi-PC JSON Export & Import**:
  - Button "📦 Экспорт JSON (пакет данных)".
  - Button "📥 Объединить JSON с других ПК" triggering file picker.
  - Implement `exportBundle()` and `importBundleFile()`.
- **Telemetry Sync Controls**:
  - URL input `#teacher-sync-url`, button `#btn-save-sync-url`.
  - Status indicators: `#teacher-sync-queue-count` (live count of items in `sync_queue`), `#teacher-last-sync-time`, `#teacher-network-status`.
  - Button `#btn-sync-now` calling `App.syncQueue(true)`.
  - Button `#btn-check-update` calling `App.checkForUpdates(true)`.

#### 3. `app.js` (Enhancement)
- **Queue telemetry in `saveProgress`**:
  - Append event to `localStorage['sync_queue']` whenever a student session is saved.
- **Auto-Update Manager (`App.checkForUpdates(manual)`)**:
  - Network listener for `online` and `offline` events.
  - Check `navigator.onLine` and `window.location.protocol !== 'file:'`.
  - Fetch `version.json` with 2500ms `AbortController` timeout.
  - Silent fail-safe error handling.
- **Telemetry Sync Manager (`App.syncQueue(manual)`)**:
  - Triggered on `online` event and manual button click.
  - POST to `localStorage['trainer_sync_url']` with 5000ms timeout.
  - Silent fail-safe handling (keeps queue intact on failure, clears on 200/201/204).
- **Expose Public Methods on `App`**:
  `App.checkForUpdates`, `App.syncQueue`, `App.getSyncQueueLength`, `App.getSyncConfig`.

#### 4. `index.html` (Markup additions)
- Add `#update-status-indicator` and `#btn-apply-update` in header / teacher screen.
- Verify container `#teacher-container` cleanly renders expanded toolbar and table.

#### 5. `style.css` (Style additions)
- Styles for sync toolbar (`.sync-settings-card`, `.sync-status-row`, `.badge-violation`, `.update-pill`).
- Responsive adjustments for table with min-width ~1100px.

---

## 5. Verification Method

1. **Unit & Integration Tests Execution**:
   Run the master test runner from the workspace root:
   ```powershell
   Set-Location "C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer"
   node tests/runner.js
   ```
2. **Dedicated Test Suites to Create in Milestone 4**:
   - `tests/tier1_features/test_teacher_dashboard.test.js`:
     - Test sticky table headers, class filter dropdown, active student count (including mouse users).
     - Test table rendering of mouse stars/scores, XP/level, and focus violations.
     - Test UTF-8 BOM CSV export and column order (initial 7 columns preserved, new columns appended).
     - Test multi-PC bundle export format.
     - Test non-destructive deep merge (preserves existing data, takes max score/XP, unions achievements, combines sessions).
   - `tests/tier1_features/test_auto_update.test.js`:
     - Test `navigator.onLine === false`: zero fetch calls, status offline.
     - Test `file://` protocol handling: zero fetch calls, silent fallback.
     - Test online fetch of `version.json`: triggers fetch, detects update, timeout abort after 2500ms.
     - Test network error / offline transition: silent fallback, zero console errors.
   - `tests/tier1_features/test_telemetry_sync.test.js`:
     - Test `saveProgress` appends structured events to `localStorage['sync_queue']`.
     - Test `syncQueue` with empty URL: silent no-op.
     - Test `syncQueue` when offline: keeps queue intact, zero fetch calls.
     - Test `syncQueue` when online: POSTs payload to configured URL, clears queue on success, updates last sync time.
     - Test auto-sync trigger on `online` window event.
3. **Manual Browser Verification**:
   - Open `index.html` in browser.
   - Login as teacher with password `teacher123`.
   - Verify table columns, filter dropdown, CSV download, JSON export/import, sync status indicators, and update check button.
