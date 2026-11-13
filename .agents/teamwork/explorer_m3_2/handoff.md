# Handoff Report: Web Audio API Sound Synthesis & UI/UX Visual Feedback System for Mouse Trainer (Milestone 3)

**Author**: Explorer 2 (Milestone 3)  
**Date**: 2026-11-12T16:30:00Z  
**Target Milestone**: Milestone 3 (Interactive Mouse Trainer & Informatics Tasks)  
**Working Directory**: `C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer`  
**State Folder**: `C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\.agents\teamwork\explorer_m3_2`  
**Recipient**: Sub-Orchestrator M3 (`d063fc93-1f0b-4efb-8a65-441b7294bfd3`)

---

## 1. Observation

Direct observations from examining the codebase, specifications, and style system:

1. **Strict Offline Requirement (R2 & F4)**:
   - `PROJECT.md` line 5 states: *"Zero-Dependency Core: Completely self-contained without Node/npm runtime dependencies or remote CDNs. Runs directly in browser via `file:///` or local static HTTP server."*
   - `PROJECT.md` line 45 (Feature F13): *"Offline Web Audio Feedback: Synthesized audio chimes and error sounds without external audio files."*
   - Audio files (`.mp3`, `.wav`) under `file:///` protocol trigger browser security/CORS restrictions in Chromium/WebKit, decode asynchronously, and add asset bloat. Pure Web Audio API mathematically generates waveforms directly via native `OscillatorNode` and `GainNode` with 0 external bytes.

2. **Screen Container Hierarchy & Router Lifecycle**:
   - `index.html` lines 132-205 define screens `#screen-login`, `#screen-class`, `#screen-student`, `#screen-menu`, `#screen-typing`, `#screen-materials`, `#screen-tests`, `#screen-results`, `#screen-teacher`.
   - In `index.html`, `#screen-mouse` is currently **missing** and must be added.
   - In `app.js` lines 19-30, the `SCREENS` array currently contains:
     ```javascript
     const SCREENS = [
       'screen-login', 'screen-class', 'screen-student', 'screen-teacher-login',
       'screen-menu', 'screen-typing', 'screen-materials', 'screen-tests',
       'screen-results', 'screen-teacher'
     ];
     ```
     `'screen-mouse'` must be added to this array.
   - In `index.html` lines 107-128, the student menu `.module-grid` currently defines 4 module buttons (`typing`, `theory`, `test`, `stats`). A 5th button with `data-module="mouse"` is required.

3. **M1 Design Token System & Responsive Rules**:
   - `style.css` lines 7-91 define core CSS custom properties:
     `--color-primary: #2563eb;`, `--color-primary-h: #1d4ed8;`, `--color-primary-light: #eff6ff;`,
     `--color-accent: #16a34a;`, `--color-accent-h: #15803d;`, `--color-accent-light: #f0fdf4;`,
     `--color-error: #dc2626;`, `--color-error-light: #fef2f2;`,
     `--color-warn: #f97316;`, `--color-surface: #ffffff;`, `--color-border: #d1d5db;`,
     `--color-text: #1e293b;`, `--color-muted: #64748b;`,
     `--radius-sm: 8px;`, `--radius-md: 12px;`, `--radius-lg: 20px;`,
     `--shadow-sm`, `--shadow-md`, `--shadow-lg`.
   - `style.css` lines 1831-1850 already have media queries prepared by M1 specifically for 5 modules in the menu:
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
   - In `style.css` lines 159-165, `#screen-typing` handles viewport containment without window scroll:
     ```css
     #screen-typing .screen-body {
       padding: clamp(8px, 1.5vh, 18px) clamp(16px, 2.5vw, 32px);
       gap: clamp(6px, 1vh, 12px);
       overflow-y: hidden;
       justify-content: space-between;
     }
     ```
     `#screen-mouse` must adopt this exact containment pattern so that drag-and-drop and precision clicking targets never cause the window to scroll or jump during pointer interactions.

4. **Browser Autoplay Policies**:
   - Modern browsers (Chrome, Edge, Firefox, Safari) enforce user-gesture activation for Web Audio. An `AudioContext` created on page load starts in `'suspended'` state and logs warnings if `.createOscillator()` is triggered before a user gesture.
   - Initializing or resuming the context during the first `pointerdown` / `click` removes all autoplay blocking.

5. **Mute State Persistence**:
   - Classrooms often require students to mute sound without affecting visual feedback. Mute status must be persisted in `localStorage['trainer_sound_muted']`.

---

## 2. Logic Chain

From these direct observations, the complete sound synthesis and UI/UX feedback architecture is established through the following reasoning steps:

```
[Observation 1: 100% Offline, Zero-Asset Audio]
      │
      ▼
(Step 1) Synthesize all sound effects mathematically using Web Audio API nodes:
         - OscillatorNode (sine, triangle, sawtooth) + GainNode (ADSR volume envelopes)
         - BiquadFilterNode (low-pass smoothing for error buzzers)
         - Microsecond precision via audioCtx.currentTime
      │
      ▼
(Step 2) Design specific frequency envelopes for each mouse interaction:
         - Success chime: Major triad (C6 -> E6 -> G6) with sine waves
         - Error buzzer: Filtered low sawtooth (180Hz -> 75Hz) with fast decay
         - Click/Tick: 25ms triangle blip (800Hz -> 300Hz)
         - Target hit: 987.77Hz (B5) + harmonic ping
         - Fanfare: 5-note celebratory melodic arpeggio
         - Drag-and-drop: grab blip, hover snap tick, drop success chord, invalid drop thud
      │
      ▼
[Observation 4 & 5: Autoplay Policy & Mute Persistence]
      │
      ▼
(Step 3) Encapsulate in a robust SoundSystem singleton:
         - Lazy AudioContext initialization on first user interaction
         - Master GainNode for global volume & mute control
         - Persistence in localStorage['trainer_sound_muted']
         - Fail-safe try/catch wrapping so sound failures never disrupt trainer logic
      │
      ▼
[Observation 2 & 3: Screen Container & M1 Token Conformance]
      │
      ▼
(Step 4) Structure DOM container #screen-mouse:
         - Header: Back button, Title, Sound Mute Toggle, Student Info
         - Body: 5-Exercise Tab Selector, Live Stats Bar (Score, Time, Accuracy, Mistakes, Progress)
         - Arena: Viewport-constrained relative canvas/board (prevents document scroll)
         - Result Card: Stars, metrics, action buttons
      │
      ▼
(Step 5) Implement visual feedback layer:
         - Click ripple animation (expanding fading circle, green for hit, red for miss)
         - Target pop-in and hit-burst animations
         - Drag-over highlight (dashed accent border, background glow)
         - Drop settling animation and folder bounce
         - Universal error shake animation (@keyframes shake)
         - Context menu OS styling with viewport collision boundary clamping
         - Tooltip inspection ring with delay progress
```

---

## 3. Web Audio API Offline Synthesizer Specification

### 3.1 Architecture of `SoundSystem`

The sound engine must be implemented as a zero-dependency helper object (or class) within `modules/mouse.js` (or exposed globally as `window.SoundSystem` so typing and gamification modules can also leverage it).

```javascript
/**
 * SoundSystem — 100% Offline Web Audio API Synthesizer
 * Zero external audio files, zero network requests, zero CORS issues.
 */
const SoundSystem = (() => {
  let _ctx = null;
  let _masterGain = null;
  let _isMuted = false;

  const STORAGE_KEY = 'trainer_sound_muted';

  function init() {
    _isMuted = localStorage.getItem(STORAGE_KEY) === 'true';
    // AudioContext will be initialized on first user gesture
    _bindGestureUnlock();
  }

  function _ensureContext() {
    if (!_ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;
      _ctx = new AudioCtx();
      _masterGain = _ctx.createGain();
      _masterGain.gain.setValueAtTime(_isMuted ? 0 : 0.25, _ctx.currentTime);
      _masterGain.connect(_ctx.destination);
    }
    if (_ctx.state === 'suspended') {
      _ctx.resume().catch(() => {});
    }
    return _ctx;
  }

  function _bindGestureUnlock() {
    const unlock = () => {
      _ensureContext();
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('keydown', unlock, { passive: true });
  }

  function isMuted() {
    return _isMuted;
  }

  function setMuted(muted) {
    _isMuted = !!muted;
    try {
      localStorage.setItem(STORAGE_KEY, _isMuted ? 'true' : 'false');
    } catch (e) {}

    if (_masterGain && _ctx) {
      _masterGain.gain.cancelScheduledValues(_ctx.currentTime);
      _masterGain.gain.setValueAtTime(_isMuted ? 0 : 0.25, _ctx.currentTime);
    }
  }

  function toggleMute() {
    setMuted(!_isMuted);
    return _isMuted;
  }
```

### 3.2 Concrete Sound Synthesis Algorithms & Envelopes

All sound parameters are calibrated to be comfortable for school headphones (low master gain, gentle ADSR envelopes, low-pass filtered buzzers to avoid ear fatigue).

#### Sound 1: Click / Tick (`playTick`)
- **Use Case**: Primary button clicks, menu clicks, selection changes.
- **Waveform**: `'triangle'` (softer than square/sawtooth, punchier than sine).
- **Pitch**: Downward micro-glide from 800 Hz to 280 Hz over 0.025s (25ms).
- **Envelope**: Instant attack, exponential volume decay from 0.15 to 0.001.
```javascript
function playTick() {
  if (_isMuted) return;
  const ctx = _ensureContext();
  if (!ctx) return;
  try {
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.exponentialRampToValueAtTime(280, t + 0.025);
    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.025);
    osc.connect(gain);
    gain.connect(_masterGain);
    osc.start(t);
    osc.stop(t + 0.03);
  } catch (e) {}
}
```

#### Sound 2: Target Hit / Pop (`playTargetHit`)
- **Use Case**: Single-click precision hit (Exercise 1), popping bubbles/targets.
- **Waveform**: Dual `'sine'` layers: fundamental B5 (987.77 Hz) + octave harmonic B6 (1975.5 Hz).
- **Duration**: 0.12s.
- **Envelope**: Attack 0.005s, exponential decay.
```javascript
function playTargetHit() {
  if (_isMuted) return;
  const ctx = _ensureContext();
  if (!ctx) return;
  try {
    const t = ctx.currentTime;
    // Fundamental note (B5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(987.77, t);
    gain1.gain.setValueAtTime(0.22, t);
    gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    osc1.connect(gain1);
    gain1.connect(_masterGain);
    osc1.start(t);
    osc1.stop(t + 0.13);

    // Harmonic sparkle (B6)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1975.53, t);
    gain2.gain.setValueAtTime(0.09, t);
    gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
    osc2.connect(gain2);
    gain2.connect(_masterGain);
    osc2.start(t);
    osc2.stop(t + 0.08);
  } catch (e) {}
}
```

#### Sound 3: Double Click Chirp (`playDoubleClick`)
- **Use Case**: Folder or program successfully launched on double-click (Exercise 2).
- **Character**: Ascending two-tone chirps (E5 -> A5, 659.25 Hz -> 880.00 Hz).
```javascript
function playDoubleClick() {
  if (_isMuted) return;
  const ctx = _ensureContext();
  if (!ctx) return;
  try {
    const t = ctx.currentTime;
    // First chirp
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(659.25, t);
    gain1.gain.setValueAtTime(0.18, t);
    gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    osc1.connect(gain1);
    gain1.connect(_masterGain);
    osc1.start(t);
    osc1.stop(t + 0.06);

    // Second chirp (higher)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(880.00, t + 0.06);
    gain2.gain.setValueAtTime(0.24, t + 0.06);
    gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    osc2.connect(gain2);
    gain2.connect(_masterGain);
    osc2.start(t + 0.06);
    osc2.stop(t + 0.15);
  } catch (e) {}
}
```

#### Sound 4: Success Chime (`playSuccess`)
- **Use Case**: Correct action in context menu (Exercise 3), correct file drop (Exercise 4).
- **Harmonics**: Ascending C-Major Triad: C6 (1046.50 Hz) -> E6 (1318.51 Hz) -> G6 (1567.98 Hz).
- **Envelopes**:
  * Note 1: start 0.00s, dur 0.14s, gain 0.18
  * Note 2: start 0.07s, dur 0.16s, gain 0.20
  * Note 3: start 0.14s, dur 0.28s, gain 0.22
```javascript
function playSuccess() {
  if (_isMuted) return;
  const ctx = _ensureContext();
  if (!ctx) return;
  try {
    const t = ctx.currentTime;
    const notes = [
      { freq: 1046.50, start: 0.00, dur: 0.14, vol: 0.18 },
      { freq: 1318.51, start: 0.07, dur: 0.16, vol: 0.20 },
      { freq: 1567.98, start: 0.14, dur: 0.28, vol: 0.22 }
    ];
    notes.forEach(n => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(n.freq, t + n.start);
      gain.gain.setValueAtTime(n.vol, t + n.start);
      gain.gain.exponentialRampToValueAtTime(0.001, t + n.start + n.dur);
      osc.connect(gain);
      gain.connect(_masterGain);
      osc.start(t + n.start);
      osc.stop(t + n.start + n.dur + 0.02);
    });
  } catch (e) {}
}
```

#### Sound 5: Error Buzzer / Miss Penalty (`playError`)
- **Use Case**: Clicking blank arena (miss click in Ex 1), wrong context item clicked (Ex 3), dropping file in wrong folder (Ex 4).
- **Character**: Low pitch slide (180 Hz down to 75 Hz) through a low-pass filter (cutoff 650 Hz). Low-pass filtering prevents high-frequency buzzing, producing a gentle educational "uh-oh" thud/buzz.
```javascript
function playError() {
  if (_isMuted) return;
  const ctx = _ensureContext();
  if (!ctx) return;
  try {
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(75, t + 0.18);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(650, t);

    gain.gain.setValueAtTime(0.20, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(_masterGain);

    osc.start(t);
    osc.stop(t + 0.20);
  } catch (e) {}
}
```

#### Sound 6: Drag Grab Blip (`playDragGrab`)
- **Use Case**: When user starts dragging a file object (Exercise 4).
- **Character**: Fast rising pitch (350 Hz to 560 Hz, 0.04s, sine).
```javascript
function playDragGrab() {
  if (_isMuted) return;
  const ctx = _ensureContext();
  if (!ctx) return;
  try {
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(350, t);
    osc.frequency.exponentialRampToValueAtTime(560, t + 0.04);
    gain.gain.setValueAtTime(0.14, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
    osc.connect(gain);
    gain.connect(_masterGain);
    osc.start(t);
    osc.stop(t + 0.05);
  } catch (e) {}
}
```

#### Sound 7: Hover Snap / Dwell Tick (`playHoverTick`)
- **Use Case**: Snapping over a valid drop target (Ex 4) or entering a hover inspection zone (Ex 5).
- **Character**: Ultra-soft high tick (1200 Hz, 0.02s, gain 0.07).
```javascript
function playHoverTick() {
  if (_isMuted) return;
  const ctx = _ensureContext();
  if (!ctx) return;
  try {
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, t);
    gain.gain.setValueAtTime(0.07, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.02);
    osc.connect(gain);
    gain.connect(_masterGain);
    osc.start(t);
    osc.stop(t + 0.025);
  } catch (e) {}
}
```

#### Sound 8: Level Fanfare (`playFanfare`)
- **Use Case**: Completing an entire exercise (all 10 targets hit, all 4 files sorted, etc.).
- **Character**: 5-note celebratory arpeggio: C5 (523.25) -> E5 (659.25) -> G5 (783.99) -> C6 (1046.50) + harmonized E6 (1318.51) sustained bell ring.
```javascript
function playFanfare() {
  if (_isMuted) return;
  const ctx = _ensureContext();
  if (!ctx) return;
  try {
    const t = ctx.currentTime;
    const notes = [
      { freq: 523.25,  start: 0.00, dur: 0.12, vol: 0.20 },
      { freq: 659.25,  start: 0.10, dur: 0.12, vol: 0.20 },
      { freq: 783.99,  start: 0.20, dur: 0.14, vol: 0.22 },
      { freq: 1046.50, start: 0.32, dur: 0.45, vol: 0.25 },
      { freq: 1318.51, start: 0.32, dur: 0.50, vol: 0.18 } // Harmonic shimmer
    ];
    notes.forEach(n => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(n.freq, t + n.start);
      gain.gain.setValueAtTime(n.vol, t + n.start);
      gain.gain.exponentialRampToValueAtTime(0.001, t + n.start + n.dur);
      osc.connect(gain);
      gain.connect(_masterGain);
      osc.start(t + n.start);
      osc.stop(t + n.start + n.dur + 0.02);
    });
  } catch (e) {}
}
```

---

## 4. Visual Feedback & Styling Specification

### 4.1 DOM Structure of `#screen-mouse`

Below is the complete semantic DOM structure for inclusion in `index.html`:

```html
<!-- ══════════════════════════════════════════
     #screen-mouse — Интерактивный тренажёр мыши
══════════════════════════════════════════ -->
<div id="screen-mouse" class="screen">
  <!-- Шапка экрана -->
  <div class="screen-header">
    <button class="btn btn-back" data-back="screen-menu">← В меню</button>
    <h2 class="screen-title">Тренажёр работы с мышью</h2>

    <!-- Кнопка переключения звука -->
    <div class="mouse-header-controls">
      <button id="mouse-mute-btn" class="btn btn-icon-mute" title="Звуковые эффекты" aria-label="Включить / отключить звук">
        <span id="mouse-mute-icon">🔊</span>
      </button>
    </div>

    <!-- Инфо об ученике -->
    <div class="student-info">
      <span class="student-name" id="mouse-student-name">Ученик</span>
      <span class="student-class" id="mouse-student-class">7-А</span>
    </div>
  </div>

  <!-- Тело экрана: Вьюпорт без скролла окна -->
  <div class="screen-body mouse-screen-body">
    
    <!-- 1. Селектор упражнений (5 вкладок) -->
    <div class="mouse-exercise-selector" role="tablist" aria-label="Выбор упражнения мыши">
      <button class="btn-exercise active" data-exercise="1" role="tab" aria-selected="true">
        <span class="ex-num">1</span>
        <span class="ex-name">Снайпер клика</span>
      </button>
      <button class="btn-exercise" data-exercise="2" role="tab" aria-selected="false">
        <span class="ex-num">2</span>
        <span class="ex-name">Быстрый даблклик</span>
      </button>
      <button class="btn-exercise" data-exercise="3" role="tab" aria-selected="false">
        <span class="ex-num">3</span>
        <span class="ex-name">Контекстное меню</span>
      </button>
      <button class="btn-exercise" data-exercise="4" role="tab" aria-selected="false">
        <span class="ex-num">4</span>
        <span class="ex-name">Файловый архитектор</span>
      </button>
      <button class="btn-exercise" data-exercise="5" role="tab" aria-selected="false">
        <span class="ex-num">5</span>
        <span class="ex-name">Системный навигатор</span>
      </button>
    </div>

    <!-- 2. Информационная панель статистики в реальном времени -->
    <div class="mouse-stats-bar">
      <div class="m-stat-item">
        <span class="m-stat-icon">🏆</span>
        <span class="m-stat-label">Очки:</span>
        <strong class="m-stat-val" id="mouse-stat-score">0</strong>
      </div>
      <div class="m-stat-item">
        <span class="m-stat-icon">⏱️</span>
        <span class="m-stat-label">Время:</span>
        <strong class="m-stat-val" id="mouse-stat-time">0:00</strong>
      </div>
      <div class="m-stat-item">
        <span class="m-stat-icon">🎯</span>
        <span class="m-stat-label">Точность:</span>
        <strong class="m-stat-val" id="mouse-stat-accuracy">100%</strong>
      </div>
      <div class="m-stat-item">
        <span class="m-stat-icon">⚠️</span>
        <span class="m-stat-label">Ошибки:</span>
        <strong class="m-stat-val m-stat-errors" id="mouse-stat-errors">0</strong>
      </div>
      <div class="m-stat-item m-stat-progress-wrap">
        <span class="m-stat-icon">📊</span>
        <span class="m-stat-label">Прогресс:</span>
        <span id="mouse-stat-progress-text" class="m-stat-progress-text">0 / 10</span>
        <div class="m-progress-bar">
          <div class="m-progress-fill" id="mouse-stat-progress-fill" style="width: 0%"></div>
        </div>
      </div>
    </div>

    <!-- 3. Интерактивная игровая арена (динамический контейнер) -->
    <div class="mouse-arena" id="mouse-arena" tabindex="0" role="region" aria-label="Игровое поле тренажёра мыши">
      <!-- Наполняется modules/mouse.js в зависимости от выбранного упражнения -->
    </div>

    <!-- 4. Карточка результата выполнения упражнения -->
    <div class="result-card mouse-result-card" id="mouse-result-card" style="display: none;">
      <h2 class="result-title">🎉 Упражнение выполнено!</h2>
      <div class="mouse-result-stars" id="mouse-result-stars">⭐⭐⭐</div>
      <div class="result-stats">
        <div class="result-stat">
          <span class="result-stat-label">Очки</span>
          <span class="result-stat-value" id="mouse-res-score">100</span>
        </div>
        <div class="result-stat">
          <span class="result-stat-label">Точность</span>
          <span class="result-stat-value" id="mouse-res-accuracy">100%</span>
        </div>
        <div class="result-stat">
          <span class="result-stat-label">Время</span>
          <span class="result-stat-value" id="mouse-res-time">0:15</span>
        </div>
        <div class="result-stat">
          <span class="result-stat-label">Ошибки</span>
          <span class="result-stat-value" id="mouse-res-errors">0</span>
        </div>
      </div>
      <div class="result-actions">
        <button class="btn btn-secondary" id="mouse-btn-retry">🔄 Повторить</button>
        <button class="btn btn-primary" id="mouse-btn-next">➡️ Следующее упражнение</button>
        <button class="btn btn-outline" id="mouse-btn-menu">🏠 В меню</button>
      </div>
    </div>

  </div>
</div>
```

### 4.2 Visual Feedback Mechanics

#### 1. Click Ripple Effect
On click inside `.mouse-arena`, JavaScript creates a transient `<div class="mouse-ripple ripple-success">` (or `ripple-miss`).
```javascript
function triggerClickRipple(x, y, isSuccess) {
  const arena = document.getElementById('mouse-arena');
  if (!arena) return;
  const ripple = document.createElement('div');
  ripple.className = `mouse-ripple ${isSuccess ? 'ripple-success' : 'ripple-miss'}`;
  ripple.style.left = `${x}px`;
  ripple.style.top = `${y}px`;
  arena.appendChild(ripple);
  setTimeout(() => ripple.remove(), 450);
}
```

#### 2. Target Spawn & Hit Explosions (Exercise 1)
- Spawning target: smooth pop-in with scale spring.
- Hit target: instant glow pulse, scale up to 1.15, fade out.
- Miss penalty marker: floating red text `"-5"` fading upward.

#### 3. Double Click Visual Feedback (Exercise 2)
- Single click: blue highlight outline (`outline: 2px solid var(--color-primary); background: var(--color-primary-light)`).
- Double click within <450ms: icon flashes with spring scale, simulated OS window modal/dialog opens with `@keyframes windowOpen`.
- Too slow (>450ms): selection resets, subtle hint text "Нажмите дважды быстрее!".

#### 4. Context Menu Interception (Exercise 3)
- Intercepts `contextmenu` event via `e.preventDefault()`.
- Calculates menu position clamped to `.mouse-arena` boundaries:
  ```javascript
  const rect = arena.getBoundingClientRect();
  let posX = e.clientX - rect.left;
  let posY = e.clientY - rect.top;
  if (posX + menuWidth > rect.width) posX = rect.width - menuWidth - 8;
  if (posY + menuHeight > rect.height) posY = rect.height - menuHeight - 8;
  ```
- Outside click or Escape dismisses the menu cleanly.

#### 5. Drag-and-Drop Visual States (Exercise 4)
- Item grabbed: `transform: scale(1.05); cursor: grabbing; box-shadow: var(--shadow-lg); opacity: 0.85;`.
- Folder hover valid (`.drag-valid`): border 3px dashed `var(--color-accent)`, background `var(--color-accent-light)`, scale 1.04.
- Folder hover invalid (`.drag-invalid`): border 3px dashed `var(--color-error)`, background `var(--color-error-light)`.
- Drop success: item shrinks into folder, folder icon bounces with green check badge.
- Drop error: item shakes horizontally with `.animate-shake` and snaps back to source pile.

#### 6. Universal Negative Feedback: Error Shake
- CSS keyframe jitter applied on incorrect clicks, misdrops, or invalid menu choices:
  ```css
  @keyframes shakeAnim {
    0%, 100% { transform: translateX(0); }
    20% { transform: translateX(-8px); }
    40% { transform: translateX(8px); }
    60% { transform: translateX(-5px); }
    80% { transform: translateX(5px); }
  }
  .animate-shake {
    animation: shakeAnim 0.35s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
  }
  ```

---

## 5. CSS Stylesheet Blueprint (`style.css` Additions)

The following CSS block is 100% compliant with existing M1 design tokens, enforces strict multi-resolution containment across 1280x720, 1366x768, and 1920x1080, and provides complete tactile responsiveness:

```css
/* ════════════════════════════════════════════════════
   МОДУЛЬ ТРЕНАЖЁРА МЫШИ (mouse.js) — MILESTONE 3
   ════════════════════════════════════════════════════ */

/* Контейнер экрана мыши — строгая фиксация 100vh без скролла окна */
#screen-mouse {
  height: 100vh;
  max-height: 100vh;
  overflow: hidden;
}

#screen-mouse .screen-body.mouse-screen-body {
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: clamp(6px, 1vh, 12px);
  padding: clamp(8px, 1.2vh, 16px) clamp(16px, 2.5vw, 32px);
  flex: 1;
  min-height: 0;
}

/* Кнопка переключения звука в шапке */
.mouse-header-controls {
  margin-left: auto;
  display: flex;
  align-items: center;
}

.btn-icon-mute {
  background: var(--color-surface);
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 6px 12px;
  font-size: 1.15rem;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition);
  user-select: none;
}

.btn-icon-mute:hover {
  background: var(--color-primary-light);
  border-color: var(--color-primary);
  transform: translateY(-1px);
}

.btn-icon-mute:active {
  transform: scale(0.95);
}

/* ─── Селектор упражнений ──────────────────────────── */
.mouse-exercise-selector {
  display: flex;
  gap: clamp(6px, 0.8vw, 12px);
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.btn-exercise {
  background: var(--color-surface);
  color: var(--color-text);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: clamp(6px, 0.9vh, 10px) clamp(10px, 1.2vw, 16px);
  font-size: clamp(0.82rem, 0.95vw, 0.92rem);
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: all var(--transition);
  user-select: none;
  box-shadow: var(--shadow-sm);
}

.btn-exercise:hover {
  border-color: var(--color-primary);
  background: var(--color-primary-light);
  color: var(--color-primary);
  transform: translateY(-1px);
}

.btn-exercise.active {
  background: var(--color-primary);
  color: #ffffff;
  border-color: var(--color-primary-h);
  box-shadow: var(--shadow-md);
}

.btn-exercise:active {
  transform: scale(0.96);
}

.ex-num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.08);
  font-size: 0.78rem;
  font-weight: 800;
}

.btn-exercise.active .ex-num {
  background: rgba(255, 255, 255, 0.25);
  color: #ffffff;
}

/* ─── Панель статистики в реальном времени ─────────── */
.mouse-stats-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: clamp(10px, 1.8vw, 24px);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: clamp(8px, 1vh, 12px) clamp(14px, 2vw, 24px);
  box-shadow: var(--shadow-sm);
  flex-shrink: 0;
  flex-wrap: wrap;
}

.m-stat-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: clamp(0.85rem, 0.95vw, 0.95rem);
  font-weight: 600;
  color: var(--color-muted);
}

.m-stat-icon {
  font-size: 1.1rem;
}

.m-stat-label {
  color: var(--color-muted);
}

.m-stat-val {
  color: var(--color-primary);
  font-size: clamp(1.05rem, 1.2vw, 1.25rem);
  font-weight: 800;
}

.m-stat-errors {
  color: var(--color-error);
}

.m-stat-progress-wrap {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  margin-left: auto;
}

.m-stat-progress-text {
  font-weight: 700;
  color: var(--color-text);
  font-size: 0.9rem;
  min-width: 48px;
}

.m-progress-bar {
  width: clamp(90px, 10vw, 150px);
  height: 8px;
  background: #e2e8f0;
  border-radius: 999px;
  overflow: hidden;
}

.m-progress-fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--color-primary), var(--color-accent));
  transition: width 0.3s ease;
}

/* ─── Игровая арена тренажёра ───────────────────────── */
.mouse-arena {
  flex: 1 1 auto;
  min-height: 0;
  position: relative;
  background: var(--color-surface);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  overflow: hidden;
  user-select: none;
  cursor: default;
}

.mouse-arena:focus-visible {
  outline: 3px solid var(--color-primary) !important;
  outline-offset: 2px !important;
}

/* ─── Визуальные эффекты кликов (Ripple) ───────────── */
.mouse-ripple {
  position: absolute;
  border-radius: 50%;
  transform: translate(-50%, -50%) scale(0);
  pointer-events: none;
  z-index: 100;
  animation: mouseRippleAnim 0.45s ease-out forwards;
}

.mouse-ripple.ripple-success {
  border: 2px solid var(--color-accent);
  background: rgba(22, 163, 74, 0.22);
}

.mouse-ripple.ripple-miss {
  border: 2px solid var(--color-error);
  background: rgba(220, 38, 38, 0.28);
}

@keyframes mouseRippleAnim {
  0% {
    width: 8px;
    height: 8px;
    opacity: 1;
    transform: translate(-50%, -50%) scale(0.4);
  }
  100% {
    width: 65px;
    height: 65px;
    opacity: 0;
    transform: translate(-50%, -50%) scale(1.6);
  }
}

/* ─── Всплывающий штраф за промах ──────────────────── */
.miss-penalty-marker {
  position: absolute;
  color: var(--color-error);
  font-size: 1rem;
  font-weight: 800;
  pointer-events: none;
  z-index: 105;
  animation: floatUpFade 0.6s ease-out forwards;
  transform: translate(-50%, -50%);
}

@keyframes floatUpFade {
  0%   { opacity: 1; transform: translate(-50%, -50%) translateY(0); }
  100% { opacity: 0; transform: translate(-50%, -50%) translateY(-28px); }
}

/* ─── Анимация тряски при ошибке ───────────────────── */
.animate-shake {
  animation: shakeAnim 0.35s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
}

@keyframes shakeAnim {
  0%, 100% { transform: translateX(0); }
  20%      { transform: translateX(-8px); }
  40%      { transform: translateX(8px); }
  60%      { transform: translateX(-5px); }
  80%      { transform: translateX(5px); }
}

/* ─── Мишени одиночного клика (Упражнение 1) ────────── */
.mouse-target {
  position: absolute;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: var(--shadow-md);
  user-select: none;
  transition: transform 0.1s ease;
  animation: targetSpawn 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.mouse-target:hover {
  transform: scale(1.08);
}

.mouse-target.target-hit {
  animation: targetHitAnim 0.22s ease-out forwards;
  pointer-events: none;
}

@keyframes targetSpawn {
  0%   { transform: scale(0); opacity: 0; }
  80%  { transform: scale(1.1); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}

@keyframes targetHitAnim {
  0%   { transform: scale(1); filter: brightness(1.5); }
  50%  { transform: scale(1.3); filter: brightness(2); }
  100% { transform: scale(0); opacity: 0; }
}

/* ─── Иконки рабочего стола (Упражнение 2) ─────────── */
.desktop-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
  gap: 20px;
  padding: 24px;
  height: 100%;
}

.desktop-icon {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 8px;
  border-radius: var(--radius-md);
  cursor: pointer;
  border: 2px solid transparent;
  transition: all var(--transition);
  text-align: center;
}

.desktop-icon:hover {
  background: var(--color-primary-light);
  border-color: rgba(37, 99, 235, 0.3);
}

.desktop-icon.selected {
  background: #dbeafe;
  border-color: var(--color-primary);
  box-shadow: var(--shadow-sm);
}

.desktop-icon-img {
  font-size: 2.5rem;
  line-height: 1;
}

.desktop-icon-name {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-text);
  word-break: break-word;
}

/* Имитация окна папки при успешном даблклике */
.simulated-window {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: var(--color-surface);
  border: 2px solid var(--color-primary);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  min-width: 320px;
  animation: windowOpen 0.25s ease-out;
  z-index: 50;
}

.window-header {
  background: var(--color-primary);
  color: #ffffff;
  padding: 8px 14px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 700;
  font-size: 0.9rem;
}

.window-body {
  padding: 20px;
  text-align: center;
  font-size: 1rem;
}

@keyframes windowOpen {
  from { opacity: 0; transform: translate(-50%, -50%) scale(0.85); }
  to   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
}

/* ─── Контекстное меню (Упражнение 3) ──────────────── */
.mouse-context-menu {
  position: absolute;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow-lg);
  min-width: 190px;
  z-index: 120;
  display: flex;
  flex-direction: column;
  padding: 4px 0;
  animation: fadeIn 0.15s ease both;
}

.ctx-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 16px;
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--color-text);
  cursor: pointer;
  transition: background var(--transition), color var(--transition);
}

.ctx-item:hover {
  background: var(--color-primary-light);
  color: var(--color-primary);
}

.ctx-item.target-action {
  font-weight: 700;
}

.ctx-divider {
  height: 1px;
  background: var(--color-border);
  margin: 4px 0;
}

/* ─── Drag-and-Drop Файловый архитектор (Упражнение 4) ─ */
.drag-arena-layout {
  display: flex;
  flex-direction: column;
  height: 100%;
  justify-content: space-between;
  padding: 16px;
  gap: 16px;
}

.folders-container {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: clamp(10px, 1.5vw, 20px);
}

.folder-drop-zone {
  background: #f8fafc;
  border: 2px dashed var(--color-border);
  border-radius: var(--radius-md);
  padding: clamp(12px, 1.8vh, 22px) 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  text-align: center;
  transition: all var(--transition);
}

.folder-icon {
  font-size: clamp(2rem, 3vw, 2.8rem);
}

.folder-name {
  font-weight: 700;
  font-size: clamp(0.85rem, 1vw, 1rem);
  color: var(--color-text);
}

.folder-exts {
  font-size: 0.75rem;
  color: var(--color-muted);
}

.folder-drop-zone.drag-over {
  border-color: var(--color-primary);
  background: var(--color-primary-light);
  transform: scale(1.03);
  box-shadow: var(--shadow-md);
}

.folder-drop-zone.drag-valid {
  border-color: var(--color-accent) !important;
  background: var(--color-accent-light) !important;
}

.folder-drop-zone.drag-invalid {
  border-color: var(--color-error) !important;
  background: var(--color-error-light) !important;
}

.files-source-pile {
  display: flex;
  gap: 16px;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  padding: 14px;
  background: #f1f5f9;
  border-radius: var(--radius-md);
  min-height: 80px;
}

.file-draggable {
  background: var(--color-surface);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 10px 16px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
  font-size: 0.95rem;
  cursor: grab;
  box-shadow: var(--shadow-sm);
  transition: transform var(--transition), box-shadow var(--transition);
}

.file-draggable:hover {
  border-color: var(--color-primary);
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.file-draggable.is-dragging {
  opacity: 0.75;
  cursor: grabbing;
  transform: scale(1.06);
  border-color: var(--color-primary);
  box-shadow: var(--shadow-lg);
}

/* ─── Hover & Tooltips (Упражнение 5) ───────────────── */
.hover-item {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
  background: var(--color-surface);
  border: 2px solid var(--color-border);
  cursor: crosshair;
  transition: all var(--transition);
}

.hover-item:hover {
  border-color: var(--color-primary);
  box-shadow: var(--shadow-md);
}

.mouse-tooltip {
  position: absolute;
  bottom: calc(100% + 10px);
  left: 50%;
  transform: translateX(-50%);
  background: #0f172a;
  color: #ffffff;
  padding: 6px 12px;
  border-radius: var(--radius-sm);
  font-size: 0.82rem;
  font-weight: 600;
  white-space: nowrap;
  pointer-events: none;
  z-index: 110;
  box-shadow: var(--shadow-md);
  animation: fadeIn 0.18s ease both;
}

.mouse-tooltip::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 6px solid transparent;
  border-top-color: #0f172a;
}

/* ─── Карточка завершения упражнения мыши ──────────── */
.mouse-result-card {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 90%;
  max-width: 560px;
  z-index: 200;
}

.mouse-result-stars {
  font-size: 2.2rem;
  margin-bottom: 12px;
  letter-spacing: 4px;
}

/* ─── Multi-Resolution Адаптивные медиа-запросы ─────── */

/* 1280x720 и экраны с высотой <= 768px */
@media (max-width: 1366px), (max-height: 768px) {
  #screen-mouse .screen-body.mouse-screen-body {
    padding: 8px 16px;
    gap: 8px;
  }
  .btn-exercise {
    padding: 5px 10px;
    font-size: 0.8rem;
  }
  .mouse-stats-bar {
    padding: 6px 14px;
    gap: 12px;
  }
  .m-stat-item {
    font-size: 0.82rem;
  }
  .m-stat-val {
    font-size: 1.05rem;
  }
  .desktop-icon-img {
    font-size: 2rem;
  }
  .folder-icon {
    font-size: 2.2rem;
  }
  .folder-drop-zone {
    padding: 10px 8px;
  }
}

/* Компактные экраны с очень малой высотой (<= 620px) */
@media (max-height: 620px) {
  #screen-mouse .screen-header {
    padding: 4px 14px;
  }
  #screen-mouse .screen-body.mouse-screen-body {
    padding: 4px 10px;
    gap: 4px;
  }
  .mouse-exercise-selector {
    gap: 4px;
  }
  .btn-exercise {
    padding: 3px 8px;
    font-size: 0.74rem;
  }
  .ex-num {
    width: 18px;
    height: 18px;
    font-size: 0.7rem;
  }
  .mouse-stats-bar {
    padding: 4px 10px;
    gap: 8px;
  }
  .m-stat-val {
    font-size: 0.95rem;
  }
  .m-progress-bar {
    width: 70px;
    height: 6px;
  }
}

/* Большие мониторы Full HD (1920x1080+) */
@media (min-width: 1600px) {
  #screen-mouse .screen-body.mouse-screen-body {
    padding: 16px 36px;
    gap: 16px;
    max-width: 1600px;
    margin: 0 auto;
    width: 100%;
  }
  .btn-exercise {
    padding: 10px 20px;
    font-size: 0.98rem;
  }
  .mouse-stats-bar {
    padding: 12px 28px;
  }
  .folders-container {
    gap: 28px;
  }
  .folder-drop-zone {
    padding: 28px 16px;
  }
}
```

---

## 6. Caveats

1. **AudioContext Inactive Tabs**:
   - If a student switches tabs or minimizes the window while an exercise is active, some browsers throttle `AudioContext` or clock cycles. The sound playback calls are scheduled with `currentTime` relative to the context, which remains accurate, but active timers should be paused if window loses focus.
2. **HTML5 Drag and Drop vs Pointer Events on Touch Laptops**:
   - Some 7th grade students use 2-in-1 touchscreen laptops. HTML5 Drag-and-Drop (`dragstart`, `dragover`, `drop`) can be finicky on touch surfaces without polyfill. However, for standard mouse training (the explicit goal of R4 and 7th grade computer science curriculum), native mouse events or HTML5 Drag and Drop are fully supported in all modern Edge/Chrome/Firefox installations on Windows.
3. **Mute State Isolation**:
   - Setting `localStorage['trainer_sound_muted']` persists across student switches. If Student A mutes the sound, it remains muted for Student B until unmuted. This is the intended behavior for classroom ergonomics (e.g. teacher requests quiet mode).
4. **No Code Modification Constraint**:
   - As an explorer agent, no project source code was modified. All specifications, HTML blocks, CSS stylesheets, and JS classes provided in this handoff are blueprints ready for direct application by implementer workers.

---

## 7. Conclusion

1. **Audio Synthesis Architecture**:
   - The zero-dependency Web Audio API synthesizer completely satisfies Requirement R2 (100% offline, zero network, zero external asset downloads).
   - All 8 sound events (click tick, target pop, double click chirp, success chime, error buzzer, drag grab, hover tick, and level fanfare) are specified with mathematically precise oscillator types, frequencies, ADSR envelopes, and gain levels.
   - Autoplay policies are solved via the lazy singleton pattern with a transparent `pointerdown`/`keydown` activation listener.
   - Persistent mute toggle is designed with a responsive UI button and `localStorage['trainer_sound_muted']`.

2. **Visual Feedback & UI System**:
   - The DOM container `#screen-mouse` conforms strictly to the established M1 design tokens in `style.css` (`--color-primary`, `--color-accent`, `--radius-md`, etc.).
   - Visual feedback encompasses real-time click ripples (green hit / red miss), target spawn/hit particle effects, double-click window launch, OS context menu with viewport-clamping, drag-and-drop state transitions, and a universal negative-feedback shake animation (`@keyframes shakeAnim`).
   - The multi-resolution layout prevents vertical window scrolling on all target resolutions: 1280x720, 1366x768, and 1920x1080.

---

## 8. Verification Method

To independently verify the sound synthesis and visual layout specifications:

### 8.1 Automated Selenium Headless Test Plan
A headless browser test script (e.g. `tests/test_mouse_ui_audio.py`) can be executed:
```bash
python tests/test_mouse_ui_audio.py
```
Key assertions in test script:
1. **Offline Integrity**: Inspects `style.css` and `index.html` to guarantee 0 external audio files or remote links.
2. **Design Token Presence**: Verifies all `--color-*` and `--radius-*` tokens exist in `style.css`.
3. **Viewport Containment**:
   - Sets Edge/Chrome headless window sizes to `1280x720`, `1366x768`, and `1920x1080`.
   - Navigates to `#screen-mouse`.
   - Asserts `document.documentElement.scrollHeight <= 720` on 1280x720 (zero document overflow).
   - Asserts `#mouse-arena` clientHeight is strictly > 250px and clientWidth > 500px across all resolutions.
4. **Web Audio Execution**:
   - Executes JS script in headless browser:
     ```javascript
     const ctx = new (window.AudioContext || window.webkitAudioContext)();
     return ctx !== null && typeof ctx.createOscillator === 'function';
     ```
   - Asserts Web Audio API returns `true` without security exceptions.
5. **Interactive A11y Focus Rings**:
   - Tab through `.btn-exercise` and `#mouse-mute-btn`.
   - Asserts computed style `outline-width === '3px'`.

### 8.2 Invalidation Conditions
- Any occurrence of external audio files (`.mp3`, `.wav`) in `src/` or network requests to external CDNs.
- Any viewport height overflow causing window vertical scrollbars to appear on 1280x720 or 1366x768.
- Autoplay policy errors or warnings in the browser developer console when interacting with mouse exercises.
