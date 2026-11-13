# Scope: Milestone 4 (Gamification, Auto-Update, Data Integrity, Telemetry Sync & FocusGuard Anti-Cheat)

## Architecture
- **Target Components**:
  - `app.js`: Gamification logic (XP, level calculation, badge toasts, progress bar), auto-update network listener & manifest fetcher (`version.json`), offline-first sync queue manager, FocusGuard anti-cheat event handlers (`visibilitychange`, `blur`), pre-start warning modal, void notification modal.
  - `modules/teacher.js`: Teacher dashboard enhancements (sticky header, class filtering, student summary with mouse/typing/tests/XP/level/focusViolations), safe UTF-8 BOM CSV export with expanded columns, multi-PC JSON bundle export and import/merge modal, telemetry sync URL configuration, pending sync queue indicator, manual sync trigger.
  - `index.html`: UI containers and modal templates for gamification display, level badge, XP bar, achievement toasts, update status indicator, teacher panel sync controls, FocusGuard warning & void modals.
  - `version.json`: Local version manifest file (`version`, `buildDate`, `features`).
  - `data/students.*` & `data/content.*`: 100% data preservation of 79 students across 7-А..7-Д and 5 lessons (7-2-2..7-2-6) with 175 local slide images.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| F14 | Gamification System | XP calculation for typing, mouse, and test activities; 5 progressive levels ("Новичок", "Пользователь ПК", "Опытный практик", "Мастер мыши и клавиатуры", "Гуру информатики"); 5 core achievement badges with visual toast; XP progress bar in menu & result screens | M4 | ORIGINAL_REQUEST §R5 |
| F15 | Student & Content Data Preservation | 100% preservation of 79 students (classes 7А–7Д) in `data/students.*` and lessons 7-2-2 to 7-2-6 (175 slides) in `data/content.*`; non-destructive additive `localStorage['trainer_progress']` schema | M4 | ORIGINAL_REQUEST §R5 |
| F16 | Teacher Dashboard Enhancement | Sticky header, student filtering, stats overview; display typing, mouse, test results, total XP, level, and focus violations count; safe UTF-8 BOM CSV export | M4 | ORIGINAL_REQUEST §R5 & Follow-up 2 |
| F17 | Network-Aware Auto-Update | Check connectivity (`navigator.onLine`); fetch `version.json` with 2500ms `AbortController` timeout only when online via HTTP/S; 100% fail-safe offline/`file://` behavior; UI status indicator & manual check button | M4 | ORIGINAL_REQUEST §Follow-up 1 |
| F20 | Offline-First Telemetry & Progress Sync | Local `sync_queue` in `localStorage`; auto-POST on internet connection or manual trigger; teacher panel sync settings (URL, queue count, last sync); multi-PC JSON bundle export & import/merge; zero errors/blocking when offline | M4 | ORIGINAL_REQUEST §Follow-up 2 |
| F21 | FocusGuard Anti-Cheat Protection | Window focus & visibility monitoring (`visibilitychange`, `blur`) during active exercises (`typing`, `mouse`, `tests`); pre-start warning screen; immediate session halt, timer stop, and 0 XP/score voiding on focus loss; violation logging in `trainer_progress[studentId].focusViolations`; in-app void modal (no native `alert`/`confirm`) | M4 | ORIGINAL_REQUEST §Follow-up 3 |

## Interface Contracts & Data Schemas
### Gamification & Progress Schema (`localStorage['trainer_progress']`)
```javascript
{
  "studentId": {
    "name": "Иванов Иван",
    "class": "7-А",
    "typing": { "sessions": [...], "bestCpm": 120, "bestAccuracy": 98 },
    "mouse": { "sessions": [...], "completedTasks": ["click", "dblclick", "context", "drag", "hover"] },
    "tests": { "7-2-2": { "score": 5, "total": 5, "passed": true } },
    "gamification": {
      "xp": 450,
      "level": 2,
      "levelTitle": "Пользователь ПК",
      "achievements": ["first_typing", "mouse_master", "quick_fingers"]
    },
    "focusViolations": 0
  }
}
```

### Levels Definition (5 Progressive Levels)
1. Level 1: "Новичок" (0 - 99 XP)
2. Level 2: "Пользователь ПК" (100 - 299 XP)
3. Level 3: "Опытный практик" (300 - 599 XP)
4. Level 4: "Мастер мыши и клавиатуры" (600 - 999 XP)
5. Level 5: "Гуру информатики" (1000+ XP)

### Core Achievements (5 Badges)
1. `first_step`: Завершить первое любое упражнение (печать, мышь или тест).
2. `typing_pro`: Достичь скорости печати более 100 зн/мин с точностью не менее 90%.
3. `mouse_master`: Пройти все 5 заданий тренажера мыши на 3 звезды.
4. `theory_expert`: Сдать тест по теории на 100% правильных ответов.
5. `persistent_student`: Заработать более 500 XP.

### FocusGuard Contract
- Enabled only during active exercise session (`typing`, `mouse`, `tests`).
- Active session tracks state `isSessionActive = true`.
- On `visibilitychange` (state === 'hidden') or `window.blur` (verifying document.activeElement isn't internal input/iframe):
  - Stop timers and invoke session cancellation (`destroy()` / `abort()`).
  - Score / XP set to 0 (no rewards recorded).
  - Increment `focusViolations` for student.
  - Display `#focusguard-void-modal`.
- Pre-start warning displayed prior to commencing exercise with confirmation button.

### Multi-PC Export/Import Schema
- Export: JSON bundle `{ exportDate: ISOString, sourcePC: string, progress: { ... } }`.
- Import: Non-destructive deep merge into existing `localStorage['trainer_progress']`, combining session arrays and keeping max XP / best scores.

## Pass/Fail Gate Criteria
1. Full preservation of 79 students and lessons 7-2-2..7-2-6.
2. Gamification logic fully functional: XP calculation, 5 levels, 5 achievements, visual progress bar, unlock notifications.
3. Teacher panel enhanced: sticky header, student filtering, stats overview, focus violations display, safe UTF-8 BOM CSV export with all metrics, multi-PC JSON bundle export/import.
4. Network-aware auto-update: non-blocking manifest fetch with 2500ms timeout when online, graceful silent fallback when offline or on `file://`.
5. Offline-first telemetry sync: sync queue, manual and auto sync, configurable endpoint, offline robustness.
6. FocusGuard anti-cheat: pre-start warning, window/tab blur detection during active tasks, immediate session voiding and 0 XP, violation counter, in-app notification without native alerts.
7. Reviewers (2) APPROVE.
8. Challengers (2) APPROVE.
9. Forensic Auditor reports CLEAN (Zero tolerance for hardcoding or facades).
