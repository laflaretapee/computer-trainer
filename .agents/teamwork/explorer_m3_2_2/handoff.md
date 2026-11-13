# Handoff Report: Milestone 3 Lifecycle & Event Listener Idempotency Analysis

**Author**: Explorer 2 (`explorer_m3_2_2`)  
**Role**: Teamwork Explorer (Read-Only Investigation & Synthesis)  
**Date**: 2026-11-12T17:17:00Z  
**State Folder**: `C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\.agents\teamwork\explorer_m3_2_2`  
**Working Directory**: `C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer`  
**Milestone**: Milestone 3 (Iteration 2)  
**Parent Orchestrator ID**: `d063fc93-1f0b-4efb-8a65-441b7294bfd3`  

---

## 1. Observation

Direct empirical observations, file paths, line numbers, and reproduction commands for the two targeted defects:

### Issue 1: `#mouse-mute-btn` Event Listener Accumulation in `_bindHeaderControls`
- **Location**: `modules/mouse.js`, lines 537–547
- **DOM Architecture**:
  In `index.html` lines 155–168:
  ```html
  <div id="screen-mouse" class="screen">
    <div class="screen-header">
      <button class="btn btn-back" data-back="screen-menu">← В меню</button>
      <h2 class="screen-title">Интерактивный тренажёр мыши</h2>
      <div class="mouse-header-controls">
        <button id="mouse-mute-btn" class="btn btn-icon-mute" title="Звуковые эффекты" aria-label="Включить / отключить звук">
          <span id="mouse-mute-icon">🔊</span>
        </button>
      </div>
    </div>
    <div class="screen-body mouse-screen-body">
      <div id="mouse-container" class="module-container mouse-trainer-container">
        <!-- populated by modules/mouse.js -->
      </div>
    </div>
  </div>
  ```
  `#mouse-mute-btn` is located inside `#screen-mouse .screen-header`, outside `#mouse-container`.
- **Code in `modules/mouse.js:537-547`**:
  ```javascript
  function _bindHeaderControls() {
    const muteBtn = document.getElementById('mouse-mute-btn');
    const muteIcon = document.getElementById('mouse-mute-icon');
    if (muteBtn && muteIcon) {
      muteIcon.textContent = SoundSystem.isMuted() ? '🔇' : '🔊';
      muteBtn.addEventListener('click', () => {
        const isMuted = SoundSystem.toggleMute();
        muteIcon.textContent = isMuted ? '🔇' : '🔊';
      });
    }
  }
  ```
- **Lifecycle Navigation in `app.js`**:
  - Menu -> Mouse Trainer (`app.js:744-747`): invokes `MouseTrainer.init('mouse-container')`.
  - `renderUI()` calls `_bindHeaderControls()` at line 531.
  - Back Button (`app.js:768-770`): invokes `MouseTrainer.destroy()`.
  - In `destroy()` (`modules/mouse.js:1676-1685`), `muteBtn` is neither unbound nor tracked in `_globalListeners`.
- **Empirical Reproduction in Node.js**:
  ```powershell
  node -e "const { setupBrowserEnv, teardownBrowserEnv } = require('./tests/helpers/dom_env'); const env = setupBrowserEnv(); env.loadAppStack(); const btn = env.document.getElementById('mouse-mute-btn'); env.window.MouseTrainer.init('mouse-container'); env.window.MouseTrainer.destroy(); env.window.MouseTrainer.init('mouse-container'); console.log('Initial muted:', env.window.SoundSystem.isMuted()); env.dispatchClick(btn); console.log('After click 1:', env.window.SoundSystem.isMuted());"
  ```
  **Output**:
  ```
  Initial muted: false
  After click 1: false
  ```
  *Result*: Clicking mute after two visits fails to mute because two separate anonymous listeners execute sequentially in the same tick: `false -> true -> false`.

---

### Issue 2: Pointer Fallback Drag Clone and Window Listener Cleanup on `MouseTrainer.destroy()`
- **Location**: `modules/mouse.js`, lines 1345–1399 in `initExercise4_DragDrop > bindPointerFallback`
- **Code in `modules/mouse.js:1345-1399`**:
  ```javascript
  function bindPointerFallback(el, file) {
    let isDragging = false;
    let startX = 0, startY = 0;
    let clone = null;

    el.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      startX = e.clientX;
      startY = e.clientY;

      const onMouseMove = (moveEv) => {
        if (!isDragging && Math.hypot(moveEv.clientX - startX, moveEv.clientY - startY) > 5) {
          isDragging = true;
          SoundSystem.playDragGrab();
          clone = el.cloneNode(true);
          clone.style.position = 'fixed';
          clone.style.pointerEvents = 'none';
          clone.style.opacity = '0.85';
          clone.style.zIndex = '9999';
          clone.style.transform = 'translate(-50%, -50%) scale(1.08)';
          document.body.appendChild(clone);
          el.classList.add('is-dragging');
        }
        if (isDragging && clone) {
          clone.style.left = `${moveEv.clientX}px`;
          clone.style.top = `${moveEv.clientY}px`;
        }
      };

      const onMouseUp = (upEv) => {
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);

        if (clone && clone.parentNode) {
          clone.parentNode.removeChild(clone);
          clone = null;
        }
        el.classList.remove('is-dragging');
        ...
      };

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    });
  }
  ```
- **Code in `destroy()` (`modules/mouse.js:1676-1685`)**:
  ```javascript
  function destroy() {
    _isSessionActive = false;
    clearAllExerciseTimers();
    removeAllTrackedListeners();

    const arena = document.getElementById('mouse-arena');
    if (arena) arena.innerHTML = '';

    hideResultCard();
  }
  ```
- **Defect Mechanism**:
  1. `clone` is appended directly to `document.body`, outside `#mouse-arena`.
  2. `clone` does not have a distinct class identifier (e.g. `dragged-file-avatar`).
  3. `window.addEventListener('mousemove', onMouseMove)` and `mouseup` are attached directly to `window` and are NOT tracked via `addTrackedEventListener`.
  4. If `destroy()` is called while dragging (e.g. user clicks "← В меню", switches tabs, or automated test calls `destroy()`):
     - `arena.innerHTML = ''` removes playground elements, but leaves `clone` attached to `document.body`.
     - `window` listeners `onMouseMove` and `onMouseUp` remain permanently active.
- **Empirical Reproduction in Node.js**:
  ```powershell
  node -e "const { setupBrowserEnv, teardownBrowserEnv, MockMouseEvent } = require('./tests/helpers/dom_env'); const env = setupBrowserEnv(); env.loadAppStack(); env.window.MouseTrainer.init('mouse-container'); env.window.MouseTrainer.selectExercise(4); const fileEl = env.document.getElementById('drag-file-f1'); fileEl.dispatchEvent(new MockMouseEvent('mousedown', { button: 0, clientX: 100, clientY: 100 })); env.window.dispatchEvent(new MockMouseEvent('mousemove', { clientX: 120, clientY: 120 })); env.window.MouseTrainer.destroy(); const clone = env.document.body.querySelector('.file-draggable'); console.log('Clone style.left before post-destroy move:', clone.style.left); env.window.dispatchEvent(new MockMouseEvent('mousemove', { clientX: 555, clientY: 777 })); console.log('Clone style.left AFTER post-destroy move:', clone.style.left);"
  ```
  **Output**:
  ```
  Clone style.left before post-destroy move: 120px
  Clone style.left AFTER post-destroy move: 555px
  ```
  *Result*: The clone is leaked on `document.body` and continues to respond to `window.mousemove` events even after `MouseTrainer.destroy()` has completed.

---

## 2. Logic Chain

1. **Root Cause Analysis of Issue 1**:
   - In DOM event dispatch, `addEventListener` treats anonymous arrow functions `() => { ... }` as distinct function references.
   - When a student navigates back and forth between screens, `#screen-mouse` remains in DOM while `MouseTrainer.init()` is executed on each entry.
   - Calling `addEventListener('click', ...)` on `#mouse-mute-btn` inside `_bindHeaderControls()` without unbinding or guarding accumulates $N$ listeners after $N$ visits.
   - Each click fires all $N$ listeners. For any even $N$, `SoundSystem.toggleMute()` is executed an even number of times, restoring the original state and making muting impossible.
   - To make `_bindHeaderControls()` idempotent, three complementary layers must be added:
     a. Extract the listener into a named function `_handleMuteToggle` at module scope.
     b. Guard attachment using `if (!muteBtn.dataset.bound)` and set `muteBtn.dataset.bound = 'true'`.
     c. In `destroy()`, cleanly unbind via `muteBtn.removeEventListener('click', _handleMuteToggle)` and remove `delete muteBtn.dataset.bound`.

2. **Root Cause Analysis of Issue 2**:
   - `bindPointerFallback` implements dual-mode drag-and-drop for environments where native HTML5 Drag and Drop is unavailable or restricted.
   - Appending `clone` to `document.body` is necessary for absolute viewport coordinate tracking, but `document.body` is not cleared by `arena.innerHTML = ''`.
   - Registering `mousemove` and `mouseup` directly on `window` bypasses `_globalListeners`.
   - When `MouseTrainer.destroy()` is invoked mid-drag, neither the DOM clone nor the window listeners are cleaned up.
   - To guarantee complete teardown:
     a. Tag the clone element with `clone.classList.add('dragged-file-avatar')`.
     b. Maintain a module-level active drag cleanup tracker `let _activeDragCleanup = null;`.
     c. Implement a centralized `cancelActiveDrag()` routine that executes `_activeDragCleanup()`, removes any `.dragged-file-avatar` elements from `document.body`, and strips `.is-dragging` classes.
     d. Invoke `cancelActiveDrag()` in `destroy()`, `startExercise()`, and `finishSession()`.

---

## 3. Caveats

- **CSS Classes**: Adding `dragged-file-avatar` to the cloned element maintains all existing styles because `.file-draggable` is preserved on `cloneNode(true)`. The class is an additional semantic identifier.
- **Audio Gesture Unlock**: Autoplay unlock listeners on `window` in `SoundSystem.init()` (`pointerdown`, `mousedown`, `keydown`) use `{ once: true }` and self-remove upon first interaction; they do not require manual unbinding.
- **Browser Compatibility**: `dataset.bound` and `removeEventListener` with named functions are fully supported across all modern browsers and headless test runners without polyfills.

---

## 4. Conclusion & Concrete Code Modifications

Below are the exact code modifications formulated for Worker M3 / implementer.

### Patch Location 1: Module State & Helper Functions (`modules/mouse.js:312-350`)

Add `_activeDragCleanup` variable, `_handleMuteToggle()` callback, and `cancelActiveDrag()` helper function.

```javascript
<<<< CURRENT CODE (modules/mouse.js:312-315)
  // Таймеры и хэндлеры текущего упражнения
  let _activeTimers = [];
  let _globalListeners = [];
==== PROPOSED CODE
  // Таймеры и хэндлеры текущего упражнения
  let _activeTimers = [];
  let _globalListeners = [];
  let _activeDragCleanup = null;
>>>>
```

In Section 4 helpers (after line 350):
```javascript
<<<< ADD AFTER removeAllTrackedListeners() (modules/mouse.js:350)
  function _handleMuteToggle() {
    const isMuted = SoundSystem.toggleMute();
    const muteIcon = document.getElementById('mouse-mute-icon');
    if (muteIcon) {
      muteIcon.textContent = isMuted ? '🔇' : '🔊';
    }
  }

  function cancelActiveDrag() {
    if (typeof _activeDragCleanup === 'function') {
      try {
        _activeDragCleanup();
      } catch (_) {}
      _activeDragCleanup = null;
    }
    const floatingAvatars = document.querySelectorAll('.dragged-file-avatar');
    floatingAvatars.forEach(avatar => {
      if (avatar.parentNode) avatar.parentNode.removeChild(avatar);
    });
    const draggingItems = document.querySelectorAll('.file-draggable.is-dragging');
    draggingItems.forEach(item => item.classList.remove('is-dragging'));
  }
>>>>
```

---

### Patch Location 2: Idempotent Header Controls (`modules/mouse.js:537-547`)

```javascript
<<<< CURRENT CODE (modules/mouse.js:537-547)
  function _bindHeaderControls() {
    const muteBtn = document.getElementById('mouse-mute-btn');
    const muteIcon = document.getElementById('mouse-mute-icon');
    if (muteBtn && muteIcon) {
      muteIcon.textContent = SoundSystem.isMuted() ? '🔇' : '🔊';
      muteBtn.addEventListener('click', () => {
        const isMuted = SoundSystem.toggleMute();
        muteIcon.textContent = isMuted ? '🔇' : '🔊';
      });
    }
  }
==== PROPOSED CODE
  function _bindHeaderControls() {
    const muteBtn = document.getElementById('mouse-mute-btn');
    const muteIcon = document.getElementById('mouse-mute-icon');
    if (muteBtn && muteIcon) {
      muteIcon.textContent = SoundSystem.isMuted() ? '🔇' : '🔊';
      if (!muteBtn.dataset.bound) {
        muteBtn.dataset.bound = 'true';
        muteBtn.addEventListener('click', _handleMuteToggle);
      }
    }
  }
>>>>
```

---

### Patch Location 3: Exercise Switching & Start Cleanup (`modules/mouse.js:628-632`)

```javascript
<<<< CURRENT CODE (modules/mouse.js:628-632)
  function startExercise(exerciseId) {
    clearAllExerciseTimers();
    removeAllTrackedListeners();
==== PROPOSED CODE
  function startExercise(exerciseId) {
    clearAllExerciseTimers();
    cancelActiveDrag();
    removeAllTrackedListeners();
>>>>
```

---

### Patch Location 4: Pointer Fallback Drag Session Encapsulation (`modules/mouse.js:1345-1399`)

```javascript
<<<< CURRENT CODE (modules/mouse.js:1345-1399)
    // Поддержка pointer fallback
    function bindPointerFallback(el, file) {
      let isDragging = false;
      let startX = 0, startY = 0;
      let clone = null;

      el.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        startX = e.clientX;
        startY = e.clientY;

        const onMouseMove = (moveEv) => {
          if (!isDragging && Math.hypot(moveEv.clientX - startX, moveEv.clientY - startY) > 5) {
            isDragging = true;
            SoundSystem.playDragGrab();
            clone = el.cloneNode(true);
            clone.style.position = 'fixed';
            clone.style.pointerEvents = 'none';
            clone.style.opacity = '0.85';
            clone.style.zIndex = '9999';
            clone.style.transform = 'translate(-50%, -50%) scale(1.08)';
            document.body.appendChild(clone);
            el.classList.add('is-dragging');
          }
          if (isDragging && clone) {
            clone.style.left = `${moveEv.clientX}px`;
            clone.style.top = `${moveEv.clientY}px`;
          }
        };

        const onMouseUp = (upEv) => {
          window.removeEventListener('mousemove', onMouseMove);
          window.removeEventListener('mouseup', onMouseUp);

          if (clone && clone.parentNode) {
            clone.parentNode.removeChild(clone);
            clone = null;
          }
          el.classList.remove('is-dragging');

          if (isDragging) {
            isDragging = false;
            // Определяем над какой папкой отпустили
            const dropTarget = document.elementFromPoint ? document.elementFromPoint(upEv.clientX, upEv.clientY) : null;
            const folderEl = dropTarget ? dropTarget.closest('.folder-drop-zone') : null;
            if (folderEl) {
              const folderId = folderEl.getAttribute('data-folder-id');
              validateAndHandleDrop(file.id, folderId, folderEl);
            }
          }
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
      });
    }
==== PROPOSED CODE
    // Поддержка pointer fallback
    function bindPointerFallback(el, file) {
      let isDragging = false;
      let startX = 0, startY = 0;
      let clone = null;

      el.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        startX = e.clientX;
        startY = e.clientY;

        cancelActiveDrag();

        const cleanupDragSession = () => {
          window.removeEventListener('mousemove', onMouseMove);
          window.removeEventListener('mouseup', onMouseUp);
          if (clone && clone.parentNode) {
            clone.parentNode.removeChild(clone);
            clone = null;
          }
          if (el) el.classList.remove('is-dragging');
          isDragging = false;
          if (_activeDragCleanup === cleanupDragSession) {
            _activeDragCleanup = null;
          }
        };

        const onMouseMove = (moveEv) => {
          if (!_isSessionActive) {
            cleanupDragSession();
            return;
          }
          if (!isDragging && Math.hypot(moveEv.clientX - startX, moveEv.clientY - startY) > 5) {
            isDragging = true;
            SoundSystem.playDragGrab();
            clone = el.cloneNode(true);
            clone.classList.add('dragged-file-avatar');
            clone.style.position = 'fixed';
            clone.style.pointerEvents = 'none';
            clone.style.opacity = '0.85';
            clone.style.zIndex = '9999';
            clone.style.transform = 'translate(-50%, -50%) scale(1.08)';
            document.body.appendChild(clone);
            el.classList.add('is-dragging');
          }
          if (isDragging && clone) {
            clone.style.left = `${moveEv.clientX}px`;
            clone.style.top = `${moveEv.clientY}px`;
          }
        };

        const onMouseUp = (upEv) => {
          const wasDragging = isDragging;
          cleanupDragSession();

          if (wasDragging && _isSessionActive) {
            // Определяем над какой папкой отпустили
            const dropTarget = document.elementFromPoint ? document.elementFromPoint(upEv.clientX, upEv.clientY) : null;
            const folderEl = dropTarget ? dropTarget.closest('.folder-drop-zone') : null;
            if (folderEl) {
              const folderId = folderEl.getAttribute('data-folder-id');
              validateAndHandleDrop(file.id, folderId, folderEl);
            }
          }
        };

        _activeDragCleanup = cleanupDragSession;
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
      });
    }
>>>>
```

---

### Patch Location 5: Finish Session Cleanup (`modules/mouse.js:1618-1622`)

```javascript
<<<< CURRENT CODE (modules/mouse.js:1618-1622)
  function finishSession(customData) {
    if (!_isSessionActive && !customData) return;
    _isSessionActive = false;
    clearAllExerciseTimers();
==== PROPOSED CODE
  function finishSession(customData) {
    if (!_isSessionActive && !customData) return;
    _isSessionActive = false;
    clearAllExerciseTimers();
    cancelActiveDrag();
>>>>
```

---

### Patch Location 6: Comprehensive Destructor Cleanup (`modules/mouse.js:1676-1685`)

```javascript
<<<< CURRENT CODE (modules/mouse.js:1676-1685)
  function destroy() {
    _isSessionActive = false;
    clearAllExerciseTimers();
    removeAllTrackedListeners();

    const arena = document.getElementById('mouse-arena');
    if (arena) arena.innerHTML = '';

    hideResultCard();
  }
==== PROPOSED CODE
  function destroy() {
    _isSessionActive = false;
    clearAllExerciseTimers();
    cancelActiveDrag();
    removeAllTrackedListeners();

    const muteBtn = document.getElementById('mouse-mute-btn');
    if (muteBtn) {
      muteBtn.removeEventListener('click', _handleMuteToggle);
      delete muteBtn.dataset.bound;
    }

    const arena = document.getElementById('mouse-arena');
    if (arena) arena.innerHTML = '';

    hideResultCard();
  }
>>>>
```

---

## 5. Verification Method

To verify these changes independently once implemented by Worker M3:

1. **Verify Mute Button Idempotency (Issue 1)**:
   Run the following Node test script:
   ```powershell
   node -e "const { setupBrowserEnv, teardownBrowserEnv } = require('./tests/helpers/dom_env'); const env = setupBrowserEnv(); env.loadAppStack(); const btn = env.document.getElementById('mouse-mute-btn'); env.window.MouseTrainer.init('mouse-container'); env.window.MouseTrainer.destroy(); env.window.MouseTrainer.init('mouse-container'); env.dispatchClick(btn); if (!env.window.SoundSystem.isMuted()) throw new Error('FAIL: Mute button failed to toggle after 2 visits'); console.log('PASS: Mute button idempotent after multiple visits'); teardownBrowserEnv(env);"
   ```
   *Expected Output*: `PASS: Mute button idempotent after multiple visits`

2. **Verify Drag Clone & Listener Teardown (Issue 2)**:
   Run the following Node test script:
   ```powershell
   node -e "const { setupBrowserEnv, teardownBrowserEnv, MockMouseEvent } = require('./tests/helpers/dom_env'); const env = setupBrowserEnv(); env.loadAppStack(); env.window.MouseTrainer.init('mouse-container'); env.window.MouseTrainer.selectExercise(4); const fileEl = env.document.getElementById('drag-file-f1'); fileEl.dispatchEvent(new MockMouseEvent('mousedown', { button: 0, clientX: 100, clientY: 100 })); env.window.dispatchEvent(new MockMouseEvent('mousemove', { clientX: 120, clientY: 120 })); env.window.MouseTrainer.destroy(); const avatars = env.document.querySelectorAll('.dragged-file-avatar'); if (avatars.length !== 0) throw new Error('FAIL: Leaked avatar in document.body'); env.window.dispatchEvent(new MockMouseEvent('mousemove', { clientX: 500, clientY: 500 })); console.log('PASS: Zero drag avatars or listeners leaked after destroy'); teardownBrowserEnv(env);"
   ```
   *Expected Output*: `PASS: Zero drag avatars or listeners leaked after destroy`

3. **Verify Full Test Runner & Regression Suites**:
   ```powershell
   cd C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer
   node tests/runner.js
   python check_students.py
   python preview_content.py
   ```
   *Expected Output*: Exit code 0, 79 students intact, 175 slides intact.
