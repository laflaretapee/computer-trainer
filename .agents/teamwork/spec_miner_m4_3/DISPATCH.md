## 2026-11-13T05:10:27Z
You are Spec Miner for Milestone 4 (FocusGuard Anti-Cheat Protection F21 and Interface Contracts).
Your task is read-only specification mining and interface design. DO NOT modify any code.

Authoritative Input Documents:
- ORIGINAL_REQUEST.md: C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\.agents\teamwork\ORIGINAL_REQUEST.md (MANDATORY: read this first, especially Follow-up 3 on FocusGuard)
- PROJECT.md: C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\PROJECT.md
- SCOPE.md: C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\.agents\teamwork\sub_orch_m4\SCOPE.md
- TEST_INFRA.md: C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\TEST_INFRA.md

Target Code to Inspect:
- C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\modules\typing.js
- C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\modules\mouse.js
- C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\app.js
- C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\modules\teacher.js
- C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\index.html

Objectives:
1. FocusGuard Anti-Cheat Specification (F21):
   - Analyze how exercise sessions are initiated and concluded in `typing` (`TypingTrainer`), `mouse` (`MouseTrainer`), and `tests` (theory knowledge mini-tests in `app.js`).
   - Define exact lifecycle hooks for FocusGuard:
     * Pre-start warning modal («⚠️ Внимание! Выход с вкладки или переключение в другое окно/игру немедленно аннулирует результат!») before commencing any active exercise session.
     * Activation of window focus monitoring (`visibilitychange` with `document.visibilityState === 'hidden'`, and `window.addEventListener('blur', ...)`) ONLY during active exercise sessions (NOT in menus, class picker, or teacher dashboard).
     * Handling edge cases: internal DOM focus transitions, clicking buttons within the page, modals, etc., to avoid false-positive blur triggers.
     * Immediate session halt, timer cancellation, and 0 XP/score voiding upon confirmed focus loss.
     * Logging violation in `trainer_progress[studentId].focusViolations` (and sync queue).
     * In-app void notification modal («🚫 Попытка аннулирована: зафиксирован выход из окна/вкладки») with a button to restart or return to menu. Strict prohibition of native `alert()`/`confirm()`.
2. Cross-Module Interface Contracts:
   - Ensure clean integration between `app.js`, `modules/typing.js`, `modules/mouse.js`, and `modules/teacher.js`.
   - Provide exact method signatures, state variables, event listener attach/detach patterns, and DOM element IDs for FocusGuard.
3. Formulate comprehensive test specifications for FocusGuard (unit and E2E scenarios).
4. Write your detailed findings into `handoff.md` in your state folder:
   C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\.agents\teamwork\spec_miner_m4_3\handoff.md

Working Directory: C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer
State Folder: C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\.agents\teamwork\spec_miner_m4_3
Send a brief message to caller when complete with path to handoff.md.
