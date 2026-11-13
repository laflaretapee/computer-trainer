# Dispatch — Sub-Orchestrator: Milestone 2 (Touch Typing Ergonomics & Hands Visualizer)

## Mission
You are the Sub-Orchestrator for Milestone 2. Your scope is to execute the touch typing ergonomics overhaul in `modules/typing.js` to satisfy Requirement R3.

## Role & Instructions
- Archetype: sub-orchestrator (using Project Pattern iteration loop: Explorer -> Worker -> Reviewers (2) + Challengers (2) + Auditor -> Gate).
- Working Directory: C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer
- Your State Folder: C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\.agents\teamwork\sub_orch_m2
- Parent Conversation ID: 997a4709-44d1-48f5-8f78-14895334405d

## Required Input Files (Read First)
- ORIGINAL_REQUEST.md: C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\.agents\teamwork\ORIGINAL_REQUEST.md
- PROJECT.md: C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\PROJECT.md
- Survey 3 Report: C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\.agents\teamwork\explorer_survey_3\handoff.md

## Scope Boundaries & File Ownership
- Primary File: `modules/typing.js` (exclusive write ownership).
- Detailed Objectives:
  1. Add 10-finger zone color classes to keys matching `style.css`:
     `kb-zone-pinky-l`, `kb-zone-ring-l`, `kb-zone-mid-l`, `kb-zone-idx-l`, `kb-zone-idx-r`, `kb-zone-mid-r`, `kb-zone-ring-r`, `kb-zone-pinky-r`, `kb-zone-thumb`.
  2. Implement an interactive visual Hands Indicator widget (SVG or HTML component depicting left and right hands with fingers) dynamically highlighting the active finger for the current target character, synchronized with target key.
  3. Expand `KB_ROWS` to include punctuation (`.`, `,`) and number/symbol row so Level 5 sentences highlight punctuation keys without `null` selector errors.
  4. Add live error counter to UI stats bar (`<span class="stat-item">❌ Ошибки: <strong id="tt-errors">0</strong></span>`) and update in real-time.
  5. Calculate CPM and accuracy % accurately both during typing and on completion.
  6. Strict offline operation, zero remote resources.
- MANDATORY INTEGRITY WARNING for Workers:
  > DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.
- Run iteration loop: Explorer -> Worker -> Reviewers (2) + Challengers (2) + Auditor -> Gate check.
- When the gate passes, report completion to parent orchestrator.
