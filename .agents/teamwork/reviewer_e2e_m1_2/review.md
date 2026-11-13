# Quality & Adversarial Review Report: Milestone E2E-M1

**Reviewer**: Reviewer 2 (`reviewer_e2e_m1_2`)  
**Roles**: Reviewer, Adversarial Critic  
**Date**: 2026-11-11  
**Target Milestone**: E2E-M1 (Test Infrastructure & Runner)  
**Target Files**:
- `tests/helpers/dom_env.js` (Headless DOM and browser environment)
- `tests/test_infra.test.js` (Smoke test suite)
- Interactions with `tests/runner.js` and `tests/helpers/assert.js`

---

## 1. Executive Summary & Verdict

**Verdict**: **APPROVE**  
**Overall Risk Assessment**: LOW-MEDIUM (Minor/Medium edge cases discovered; core architecture is solid, performant, and zero-npm compliant)

### Integrity Assessment: PASS
- **Hardcoded test cheating**: None detected. Tests exercise genuine DOM parsing, event dispatching, property traps, and module evaluation.
- **Dummy/facade mocks**: None detected. Full DOM tree, `DOMTokenList`, `dataset`, `style`, query selector engine, custom storage proxy, fetch interceptor, and AudioContext mocks are implemented with real operational logic.
- **Shortcuts & external leaks**: Zero external npm dependencies. The entire harness runs on native Node.js built-ins (`node:fs`, `node:path`, `node:vm`, `node:assert`, `node:util`).
- **Attestation & verification reproducibility**: Completely reproduced and verified locally on Node.js v22.18.0. All 38 smoke tests pass in 0.08–0.10s.

---

## 2. Review Findings

### [Major] Finding 1: Off-by-One / Index Invalidation in `insertBefore` and `replaceChild` when Moving Existing Siblings
- **Location**: `tests/helpers/dom_env.js`, lines 188–201 (`insertBefore`) and lines 173–187 (`replaceChild`).
- **Problem**: In `insertBefore(newChild, refChild)`:
  ```javascript
  const idx = this.childNodes.indexOf(refChild);
  if (idx === -1) throw new Error(...);
  if (newChild.parentNode) {
    newChild.parentNode.removeChild(newChild);
  }
  this.childNodes.splice(idx, 0, newChild);
  ```
  `idx` is calculated *before* `removeChild(newChild)` is invoked. If `newChild` was already a child of `this` and was situated before `refChild` in `this.childNodes`, removing `newChild` shifts `refChild` left by 1 position. Splice at the old `idx` inserts `newChild` *after* `refChild` rather than before it.
- **Proof of Failure**:
  ```javascript
  // Parent children: ['A', 'B', 'C']
  parent.insertBefore(a, c);
  // Expected in standard DOM: ['B', 'A', 'C']
  // Actual result in dom_env.js: ['B', 'C', 'A']
  ```
  In `replaceChild(newChild, oldChild)`, moving an earlier sibling causes the replacement to occur at an outdated index, leaving the old child in `childNodes` as an orphaned phantom node.
- **Suggestion**: In `insertBefore` and `replaceChild`, remove `newChild` from its parent *before* calculating `this.childNodes.indexOf(refChild)`. Additionally, handle `newChild === refChild` as a no-op:
  ```javascript
  insertBefore(newChild, refChild) {
    if (!refChild) return this.appendChild(newChild);
    if (newChild === refChild) return newChild;
    if (newChild.parentNode) newChild.parentNode.removeChild(newChild);
    const idx = this.childNodes.indexOf(refChild);
    if (idx === -1) throw new Error('NotFoundError');
    // unpack DocumentFragment if newChild.nodeType === 11 ...
    ...
  }
  ```

### [Medium] Finding 2: Pseudo-Class Tokens (e.g. `:disabled`, `:checked`) are Ignored in `matchesSimpleSelector`
- **Location**: `tests/helpers/dom_env.js`, lines 860–899.
- **Problem**: The selector regex `tokenRegex` matches tags, `#id`, `.class`, and `[attr]`, but does not contain a branch for pseudo-classes like `:disabled` or `:checked`. Consequently, `matchesSimpleSelector(btn, 'button:disabled')` matches `button`, ignores the unparsed `:disabled`, and returns `true` even when `btn.disabled === false`.
- **Proof of Failure**:
  ```javascript
  const btn = doc.createElement('button');
  btn.disabled = false;
  btn.matches('button:disabled'); // Returns true!
  ```
- **Suggestion**: Add pseudo-class evaluation rules in `matchesSimpleSelector`:
  ```javascript
  if (pseudo === ':disabled') { if (!el.disabled && !el.hasAttribute('disabled')) return false; }
  if (pseudo === ':checked') { if (!el.checked && !el.hasAttribute('checked')) return false; }
  ```

### [Medium] Finding 3: Disconnected Elements Bubble Events to `document` and `window`
- **Location**: `tests/helpers/dom_env.js`, lines 246–251.
- **Problem**: During `dispatchEvent()`, the code unconditionally appends `this.ownerDocument` and `defaultView` to the bubble path:
  ```javascript
  if (this.ownerDocument && !path.includes(this.ownerDocument)) {
    path.push(this.ownerDocument);
  }
  ```
  In standard browser DOM, if an element is disconnected from the document tree (e.g. created via `document.createElement` but not appended), events bubble up to the root of the detached fragment and do *not* reach `document` or `window`.
- **Proof of Failure**:
  ```javascript
  const disconnected = env.document.createElement('div');
  env.document.addEventListener('custom-test', () => { fired = true; });
  disconnected.dispatchEvent(new CustomEvent('custom-test', { bubbles: true }));
  // fired becomes true, even though disconnected is detached from document!
  ```
- **Suggestion**: Only append `this.ownerDocument` and `defaultView` to `path` if `path[path.length - 1] === this.ownerDocument` (i.e. the node is attached to the document).

### [Minor] Finding 4: Separate `MockAudioContext` Instances Created by Modules Do Not Aggregate Calls
- **Location**: `tests/helpers/dom_env.js`, lines 1169–1251.
- **Problem**: `setupBrowserEnv` exposes `env.audioContext = new MockAudioContext()`. However, if application code (such as the upcoming M3 `modules/mouse.js`) creates its own context (`new window.AudioContext()`), its oscillator/gain calls are logged in its own instance, not in `env.audioContext.__calls`.
- **Suggestion**: Add a static registry `MockAudioContext.instances = []` and `MockAudioContext.__allCalls = []` to capture audio synthesis telemetry globally across all instances.

### [Minor] Finding 5: `localStorage` Property Proxy Property Access Collides with `StorageImpl.prototype` Getters
- **Location**: `tests/helpers/dom_env.js`, lines 1127–1165.
- **Problem**: Assigning directly to `localStorage['length'] = 5` attempts to assign to the getter-only property on `StorageImpl.prototype`, causing `TypeError: Cannot set property length of #<StorageImpl> which has only a getter` in strict mode. Standard storage keys in this project (`trainer_progress`, `sync_queue`) do not collide, so real-world impact is minimal.
- **Suggestion**: Trap assignments to `'length'` or verify `Object.getOwnPropertyDescriptor(target, prop)?.writable` before direct assignment.

---

## 3. Verified Claims

| Claim from Worker / Scope | Verification Method | Result | Notes |
|---|---|:---:|---|
| Zero-npm runtime dependencies | Inspect imports in `dom_env.js`, `test_infra.test.js`, `runner.js`, `assert.js` | **PASS** | Only native Node.js modules used |
| DOM tree hierarchy (`Document`, `Element`, `TextNode`, `DOMTokenList`, `dataset`, `style`) | Executed `tests/test_infra.test.js` Suite 2 & custom node REPL inspection | **PASS** | Full attribute sync, classList operations, and dataset camelCase mapping |
| Query selectors (`#id`, `.class`, tags, attributes, combinators, `closest`) | Executed smoke tests lines 429–467 | **PASS** | Tag, id, class, attribute (`=`, `^=`, `$=`), child (`>`), descendant (` `), closest verified |
| Event propagation & cancelation | Executed smoke tests lines 469–583 | **PASS** | Bubbling, `stopPropagation()`, `preventDefault()` work as specified |
| Mouse, Keyboard, Drag events | Executed smoke tests lines 523–583 | **PASS** | Button codes, typing keys, and DataTransfer drag-drop cycle verified |
| Web Storage with `sync_queue` (F20) | Executed smoke tests lines 585–607 | **PASS** | Supports both method and proxy property indexing |
| Network toggling & fetch mock (F17/F20) | Executed smoke tests lines 609–670 | **PASS** | Toggles `navigator.onLine`, dispatches online/offline events, rejects fetch when offline |
| Web Audio mock (F13) | Executed smoke tests lines 628–648 | **PASS** | Logs oscillator and gain methods accurately |
| SPA application stack loading (`loadAppStack`) | Executed smoke tests lines 673–734 and 10x repeated cycle stress test | **PASS** | Loads rosters (79 students), content (lessons 7-2-2..7-2-6), boots SPA into `screen-login` |
| Master runner CLI options (`--help`, `--tier`, `--filter`) | Executed `node tests/runner.js` with various CLI flags | **PASS** | Formatted ASCII tables, exit code 0 on pass, exit code 1 on invalid arguments |

---

## 4. Adversarial Stress-Test Scenarios

### Stress-Test 1: Repeated App Stack Re-execution & Memory Isolation
- **Scenario**: Execute 10 consecutive `setupBrowserEnv() -> loadAppStack() -> teardownBrowserEnv()` cycles.
- **Result**: **PASS**. Output confirmed `10 consecutive setup/loadAppStack/teardown cycles passed cleanly!`. Memory and globals reset without collision.

### Stress-Test 2: Global `navigator` Restoration in Node.js 22.18.0
- **Scenario**: Snapshot native `global.navigator` (Node 22 built-in getter), override during test session with mock headless navigator, then teardown.
- **Result**: **PASS**. Initial: `Node.js/22`, during: `Mozilla/5.0 ... HeadlessDOM/1.0`, after teardown: restored cleanly to `Node.js/22`.

### Stress-Test 3: Sibling Node Reordering via `insertBefore`
- **Scenario**: Insert a pre-existing earlier child immediately before a later child.
- **Result**: **FAIL** (Documented in Finding 1). Shifted reference index causes element to be inserted after the target instead of before.

### Stress-Test 4: Pseudo-Class Specificity
- **Scenario**: Check `btn.matches('button:disabled')` when `btn.disabled = false`.
- **Result**: **FAIL** (Documented in Finding 2). Regex ignores unhandled pseudo-classes.

---

## 5. Coverage Analysis

The smoke suite `tests/test_infra.test.js` contains **38 comprehensive tests** divided across 3 suites:
1. **Assertion Suite (assert.js)**: 21 tests covering truthiness, strict equality, type mismatch diffing, Cyrillic/Latin homoglyph divergence, numeric delta, deep equality, synchronous and asynchronous exceptions/rejections, collection containment (strings, arrays, sets, maps, objects), numeric range bounds, type checks, and clean stack traces.
2. **DOM Environment (dom_env.js)**: 15 tests covering tree creation, inner/outerHTML, classList synchronization, dataset proxies, style/geometry stubs, querySelector combinations, event bubbling to window, `stopPropagation()`, context menu `preventDefault()`, keyboard typing, drag & drop data transfer, localStorage proxy & sync queue, network online/offline toggling, audio oscillator/gain tracking, and offline fetch rejection.
3. **SPA Application Stack (loadAppStack)**: 2 tests verifying full data file integrity (79 students across classes 7-А through 7-Д, lessons 7-2-2 to 7-2-6), module binding (`TypingTrainer`, `TeacherPanel`), initial screen boot (`#screen-login`), and interactive navigation transition to class selection (`#btn-student` -> `#screen-class`).

---

## 6. Conclusion & Recommendations

The headless DOM environment and test runner infrastructure delivered in Milestone E2E-M1 represent an exemplary, production-grade achievement. Creating a zero-npm-dependency DOM, selector engine, event dispatcher, storage proxy, and test runner in ~2,700 lines of clean Node.js code that runs in under 100 milliseconds is exceptional.

The discovered findings (Findings 1–5) are non-blocking for Milestone E2E-M1 completion because they represent subtle DOM edge cases that do not impede the current SPA application stack or the 38 smoke tests. They provide high-value guidance for the team as test authoring expands into Tiers 1–5.

Milestone E2E-M1 is **APPROVED**.
