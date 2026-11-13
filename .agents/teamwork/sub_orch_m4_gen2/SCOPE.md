# Scope: Milestone 4 (Gamification, Auto-Update, Data Integrity, Telemetry Sync & FocusGuard Anti-Cheat)

## Architecture
- **Target Components**:
  - `modules/gamification.js` & `levels.json`, `badges.json`: Gamification logic (XP, level calculation, badge toasts, progress bar), `addXP(sessionResult)`, `getUserStats(userId)`, `awardBadge()`.
  - `modules/autoupdate.js`: Network listener (`navigator.onLine`, `online` event), non-blocking manifest fetcher (`version.json`, 2500ms timeout), update notification modal, safe asset reload, offline stability.
  - `modules/telemetry.js`: Offline-first sync queue (`syncQueue` in `localStorage`), auto-POST on `online`, 30s retry loop, manual sync trigger, multi-PC JSON export/merge.
  - `modules/focusguard.js`: FocusGuard + TabGuard anti-cheat event handlers (`visibilitychange`, `blur`), multi-tab heartbeat check (1s interval), pre-start warning modal, void notification modal, 0 XP voiding, teacher TabGuard toggle.
  - `modules/teacher.js`: Teacher dashboard enhancements (sticky header, class filtering, student summary with mouse/typing/tests/XP/level/focusViolations), "Геймификация" tab, telemetry sync endpoint & status UI, safe UTF-8 BOM CSV export with expanded columns, multi-PC JSON bundle export and import/merge modal.
  - `index.html`: UI containers and modal templates for gamification display, level badge, XP bar, achievement toasts, update status indicator, teacher panel sync controls, FocusGuard warning & void modals.
  - `style.css`: <=1024px and <=768px responsive styles, start button pulse animations, micro-tooltips.
  - `version.json`: Local version manifest file (`version`, `buildDate`, `features`, `assets`).
  - `data/students.*` & `data/content.*`: 100% data preservation of 79 students across 7-А..7-Д and 5 lessons (7-2-2..7-2-6) with 175 local slide images.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| F14 | Gamification System | XP calculation for typing, mouse, and test activities; 5 progressive levels ("Новичок", "Пользователь ПК", "Опытный практик", "Мастер мыши и клавиатуры", "Гуру информатики"); 5 core achievement badges with visual toast; XP progress bar in menu & result screens | M4 | ORIGINAL_REQUEST §R5 |
| F15 | Student & Content Data Preservation | 100% preservation of 79 students (classes 7А–7Д) in `data/students.*` and lessons 7-2-2 to 7-2-6 (175 slides) in `data/content.*`; non-destructive additive `localStorage['trainer_progress']` schema | M4 | ORIGINAL_REQUEST §R5 |
| F16 | Teacher Dashboard Enhancement | Sticky header, student filtering, stats overview; display typing, mouse, test results, total XP, level, and focus violations count; safe UTF-8 BOM CSV export; "Геймификация" tab; multi-PC JSON bundle export/merge | M4 | ORIGINAL_REQUEST §R5 & Follow-up 2 |
| F17 | Network-Aware Auto-Update | Check connectivity (`navigator.onLine`); fetch `version.json` with 2500ms `AbortController` timeout only when online via HTTP/S; 100% fail-safe offline/`file://` behavior; UI status indicator & manual check button | M4 | ORIGINAL_REQUEST §Follow-up 1 |
| F20 | Offline-First Telemetry & Progress Sync | Local `sync_queue` in `localStorage`; auto-POST on internet connection or manual trigger; teacher panel sync settings (URL, queue count, last sync); multi-PC JSON bundle export & import/merge; zero errors/blocking when offline | M4 | ORIGINAL_REQUEST §Follow-up 2 |
| F21 | FocusGuard Anti-Cheat Protection | Window focus & visibility monitoring (`visibilitychange`, `blur`) during active exercises (`typing`, `mouse`, `tests`); TabGuard heartbeat multi-tab guard; pre-start warning screen; immediate session halt, timer stop, and 0 XP/score voiding on focus loss; violation logging in `trainer_progress[studentId].focusViolations`; in-app void modal (no native `alert`/`confirm`) | M4 | ORIGINAL_REQUEST §Follow-up 3 |

## Interface Contracts & Data Schemas
### Gamification & Progress Schema (`localStorage['trainer_progress']`)
```javascript
{
  "studentId": {
    "name": "Иванов Иван",
    "class": "7-А",
    "typing": { "sessions": [...], "bestCpm": 120, "bestAccuracy": 98, "totalSessions": 5 },
    "mouse": { "sessions": [...], "completedTasks": ["click", "dblclick", "context", "drag", "hover"], "totalScore": 450, "totalStars": 15 },
    "tests": { "7-2-2": { "score": 5, "total": 5, "passed": true } },
    "gamification": {
      "xp": 450,
      "level": 2,
      "levelTitle": "Пользователь ПК",
      "achievements": ["first_step", "mouse_master", "quick_fingers"]
    },
    "focusViolations": 0,
    "violationsLog": []
  }
}
```

## Pass/Fail Gate Criteria
1. Full preservation of 79 students and lessons 7-2-2..7-2-6.
2. Gamification logic fully functional: XP calculation, 5 levels, 5 achievements, visual progress bar, unlock notifications.
3. Teacher panel enhanced: sticky header, student filtering, stats overview, focus violations display, safe UTF-8 BOM CSV export with all metrics, multi-PC JSON bundle export/import, "Геймификация" tab.
4. Network-aware auto-update: non-blocking manifest fetch with 2500ms timeout when online, graceful silent fallback when offline or on `file://`.
5. Offline-first telemetry sync: sync queue, manual and auto sync, configurable endpoint, offline robustness.
6. FocusGuard + TabGuard anti-cheat: pre-start warning, window/tab blur detection during active tasks, heartbeat multi-tab guard, immediate session voiding and 0 XP, violation counter, in-app notification without native alerts, teacher toggle.
7. Ex 3 context menu step 4 target query in `tests/helpers/dom_env.js` / test flow resolved, master test runner passes 100%.
8. Reviewers (2) APPROVE.
9. Challengers (2) APPROVE.
10. Forensic Auditor reports CLEAN.
