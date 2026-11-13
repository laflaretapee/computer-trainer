# Scope: Milestone 1 (UI/UX Design System & Responsive Layout)

## Architecture
- **Target Files**: `style.css` (primary stylesheet), `index.html` (layout containers, modal structure, accessibility tags).
- **Core Goals**: Complete CSS design system overhaul, elimination of all 37 class discrepancies between JS code and CSS, responsive multi-resolution scaling across 1280x720, 1366x768, and 1920x1080, accessible interactive states (`:hover`, `:active`, `:focus-visible`), and teacher panel usability enhancements.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | F1: Modern UI/UX Design System | Color tokens, modern typography, card styling, 7th-grade friendly aesthetic | M1 | Survey / R1 |
| 2 | F2: Responsive Multi-Resolution Layout | Elimination of visual overlaps, modal overflow fixes on 1280x720, 1366x768, 1920x1080 | M1 | Survey / R1 |
| 3 | F3: Accessible Interactive States | Comprehensive `:hover`, `:active`, and `:focus-visible` states on all controls | M1 | Survey / R1 |
| 4 | F4: 100% Strict Offline Operation | Zero CDN links, zero remote fonts/styles/scripts, local assets only | M1 | Survey / R2 |

## Milestones (Scope Sub-Tasks)
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1.1 | 37 Missing Classes & Design Tokens | CSS Custom Properties (:root), 10-finger zone colors, fix all 37 missing classes (.kb-key, .kb-row, .level-btn, .tt-hidden-input, .btn-danger, .table-responsive, .result-stats, etc.) | none | IN_PROGRESS |
| M1.2 | Responsive Layout & Viewport Overhauls | Fluid clamp(), auto-fill/auto-fit grids, modal max-height clamp, eliminate scrollbars/overlaps on 1280x720, 1366x768, 1920x1080 | M1.1 | IN_PROGRESS |
| M1.3 | Interactive States & Teacher Dashboard | :hover, :active, :focus-visible accessibility rings; sticky thead for teacher table, styled .btn-danger | M1.1 | IN_PROGRESS |

## Interface Contracts
### M1 ↔ M2 / M3 / M4 (CSS Design System Contract)
- Finger zone classes: `.kb-zone-pinky-l`, `.kb-zone-ring-l`, `.kb-zone-mid-l`, `.kb-zone-idx-l`, `.kb-zone-idx-r`, `.kb-zone-mid-r`, `.kb-zone-ring-r`, `.kb-zone-pinky-r`, `.kb-zone-thumb`.
- Interactive state tokens: `--color-primary`, `--color-accent`, `--color-warn`, `--color-error`, `--shadow-key`, `--radius-md`.
- Layout wrappers: `.screen-body` (fluid clamp), `.table-responsive`, `.modal-box`, `.result-stats`, `.result-stat`, `.btn-danger`.
- Focus ring: All interactive elements support `:focus-visible` with 3px primary outline.
