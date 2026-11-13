# Dispatch — Sub-Orchestrator: Milestone 3 (Interactive Mouse Trainer & Informatics Tasks)

## Mission
You are the Sub-Orchestrator for Milestone 3. Your scope is to design, implement, and verify the interactive Mouse Trainer module to satisfy Requirement R4.

## Role & Instructions
- Archetype: sub-orchestrator (using Project Pattern iteration loop: Explorer -> Worker -> Reviewers (2) + Challengers (2) + Auditor -> Gate).
- Working Directory: C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer
- Your State Folder: C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\.agents\teamwork\sub_orch_m3_gen2
- Parent Conversation ID: 997a4709-44d1-48f5-8f78-14895334405d

## Required Input Files (Read First)
- ORIGINAL_REQUEST.md: C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\.agents\teamwork\ORIGINAL_REQUEST.md
- PROJECT.md: C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\PROJECT.md
- Survey 3 Report: C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\.agents\teamwork\explorer_survey_3\handoff.md
- Predecessor Soft Handoff: C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\.agents\teamwork\sub_orch_m3\handoff.md
- Worker M3_2 Handoff: C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\.agents\teamwork\worker_m3_2\handoff.md
- Challenger 2 Handoff: C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\.agents\teamwork\challenger_m3_2_2\handoff.md

## Scope Boundaries & File Ownership
- Primary Files: `modules/mouse.js` (new file), mouse screen/menu additions in `index.html`.
- Detailed Objectives:
  1. Build `modules/mouse.js` exposing `window.MouseTrainer = { init, start, destroy }`.
  2. Implement 5 interactive exercises aligned with 7th-grade informatics topics:
     - Level 1: Снайпер клика (Single Click) — Precision targets, hit detection, penalty for misses.
     - Level 2: Быстрый даблклик (Double Click) — Launching folders/apps with <450ms timing detection.
     - Level 3: Контекстное меню (Right Click) — Custom in-game context menu with `e.preventDefault()`, action selection.
     - Level 4: Файловый архитектор (Drag-and-Drop) — Dragging files (`.docx`, `.jpg`, `.mp3`, `.tmp`) to folders (`Документы`, `Изображения`, `Музыка`, `Корзина`).
     - Level 5: Системный навигатор (Hover & Tooltips) — Hover inspection without leaving boundaries.
  3. Synthesize instant visual and audio feedback via offline Web Audio API (`AudioContext`).
  4. Register `#screen-mouse` in `index.html`, add mouse button in `#screen-menu`, and include `<script src="modules/mouse.js"></script>`.
  5. Strict offline operation, zero remote dependencies.
- MANDATORY INTEGRITY WARNING for Workers:
  > DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.
- Run iteration loop: Explorer -> Worker -> Reviewers (2) + Challengers (2) + Auditor -> Gate check.
- When the gate passes, report completion to parent orchestrator.


## 2026-11-13T05:08:02Z
Resume work at C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer. State folder: C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\.agents\teamwork\sub_orch_m3_gen2 (keep copied DISPATCH.md/prior entries; read/update copied state/scope/partition/ledger/registry/skill_* files there; create BRIEFING.md from C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\.agents\teamwork\sub_orch_m3\BRIEFING.md's 🔒 sections — updating State folder + predecessor Scope document paths to C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\.agents\teamwork\sub_orch_m3_gen2 — + progress.md, not fresh). Read C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\.agents\teamwork\sub_orch_m3 (read-only: handoff.md/BRIEFING.md/BRIEFING_ARCHIVE.md/progress.md) + C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\.agents\teamwork\ORIGINAL_REQUEST.md (ORIGINAL_REQUEST.md). Your parent is 997a4709-44d1-48f5-8f78-14895334405d (send_message escalation/reporting).
