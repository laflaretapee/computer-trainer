# Adversarial Review Report: Milestone E2E-M1 (Test Infrastructure & Runner)

**Author**: Challenger 2 (`challenger_e2e_m1_2`)  
**Target Deliverables**: `tests/helpers/assert.js`, `tests/helpers/dom_env.js`, `tests/runner.js`  
**Date**: 2026-11-11  

---

## Challenge Summary

**Overall risk assessment**: **HIGH**

While the Assertion Library (`assert.js`) proved exceptionally robust across 27 edge cases (circular references, deep nesting, NaN, Symbols, Dates, Maps, Sets, Cyrillic/Latin homoglyphs, and range boundaries), the DOM Environment (`dom_env.js`) exhibits **5 critical behavioral defects** under adversarial stress. Most notably, the CSS selector engine performs **inverted matching** on `:not(...)` pseudo-classes, the event system suppresses sibling listeners on `stopPropagation()`, `stopImmediatePropagation()` is missing, `dataset` leaks non-data attributes on enumeration, and direct property assignment on `localStorage` destroys built-in methods.

---

## Challenges

### [High] Challenge 1: CSS Selector Engine Performs Inverted Matching on `:not(...)` Pseudo-Classes

- **Assumption challenged**: The selector engine in `dom_env.js` safely queries complex selectors with qualifiers.
- **Attack scenario**: Querying `button:not(.disabled)` in a DOM containing `<button class="action-btn" id="b1">Active</button>` and `<button class="action-btn disabled" id="b2">Disabled</button>`.
- **Blast radius**: The engine strips the `:not(` wrapper and interprets `.disabled` as an affirmative class requirement. As a result, `button:not(.disabled)` matches `["b2"]` (the disabled button) and excludes `["b1"]` (the enabled button). Any test asserting that enabled action buttons are selected or clicked will fail or falsely validate disabled elements.
- **Root cause**: `matchesSimpleSelector` in `tests/helpers/dom_env.js` (lines 865-896) uses `tokenRegex`:
  ```javascript
  const tokenRegex = /(^[a-zA-Z0-9\-]+)|(#([a-zA-Z0-9\-_]+))|(\.([a-zA-Z0-9\-_]+))|(\[([a-zA-Z0-9\-_]+)(?:([~|^$*]?=)(?:"([^"]*)"|'([^']*)'|([^[\]]*)))?\])/g;
  ```
  It ignores `:not(` and `)` tokens, then matches `.disabled` into group 5 (`classVal = 'disabled'`), requiring `el.classList.contains('disabled')`.
- **Mitigation**: Parse and strip `:not\(([^)]+)\)` before token parsing, evaluating the inner selector against the element and negating the outcome:
  ```javascript
  const notMatch = sel.match(/:not\(([^)]+)\)/);
  if (notMatch) {
    const inner = notMatch[1];
    const stripped = sel.replace(notMatch[0], '');
    if (matchesSimpleSelector(el, inner)) return false;
    if (!stripped) return true;
    sel = stripped;
  }
  ```

---

### [High] Challenge 2: `stopPropagation()` Conflated with `stopImmediatePropagation()`

- **Assumption challenged**: Calling `e.stopPropagation()` in an event listener only prevents bubbling to ancestor nodes.
- **Attack scenario**: Registering two independent event listeners on the same element (`btn.addEventListener('click', l1)` and `btn.addEventListener('click', l2)`), where `l1` calls `e.stopPropagation()`.
- **Blast radius**: `dom_env.js` lines 264-271:
  ```javascript
  for (const item of listeners) {
    if (event._propagationStopped) break;
    ...
  ```
  `_propagationStopped` is checked inside the loop iterating over listeners on the *same node*. When `l1` calls `stopPropagation()`, `l2` on that same element is immediately skipped. In standard W3C DOM, `stopPropagation()` only halts bubbling to parent nodes; other listeners on the current target must still fire.
- **Mitigation**: Distinguish `_propagationStopped` (bubbles to next node in path) from `_immediatePropagationStopped` (halts remaining listeners on the same node).

---

### [Medium] Challenge 3: `MockEvent` Missing Standard `stopImmediatePropagation()` Method

- **Assumption challenged**: `MockEvent` implements standard W3C event control methods.
- **Attack scenario**: Calling `e.stopImmediatePropagation()` inside a click, mouse, or keyboard handler.
- **Blast radius**: `MockEvent` in `dom_env.js` (lines 998-1020) defines only `preventDefault()` and `stopPropagation()`. Invoking `stopImmediatePropagation()` throws an unhandled `TypeError: e.stopImmediatePropagation is not a function`.
- **Mitigation**: Add `stopImmediatePropagation()` to `MockEvent`:
  ```javascript
  stopImmediatePropagation() {
    this._propagationStopped = true;
    this._immediatePropagationStopped = true;
  }
  ```

---

### [Medium] Challenge 4: `Object.keys(element.dataset)` Leaks Non-Data Attributes and Un-camelcased Keys

- **Assumption challenged**: `element.dataset` behaves as a compliant `DOMStringMap`.
- **Attack scenario**: Inspecting `Object.keys(item.dataset)` on `<div id="item" class="card" data-lesson-id="7-2-2" data-module-name="typing"></div>`.
- **Blast radius**: The `dataset` proxy in `dom_env.js` (lines 401-421) wraps `this.attributes` without `ownKeys` or `getOwnPropertyDescriptor` traps. `Object.keys(item.dataset)` returns `["id", "class", "data-lesson-id", "data-module-name"]`. In real DOM, it must return `["lessonId", "moduleName"]`. Any code or test iterating over dataset keys will process internal classes and IDs.
- **Mitigation**: Implement `ownKeys` and `getOwnPropertyDescriptor` traps on the `dataset` proxy:
  ```javascript
  ownKeys: (target) => {
    return Object.keys(target)
      .filter(k => k.startsWith('data-'))
      .map(k => k.slice(5).replace(/-([a-z])/g, (_, g) => g.toUpperCase()));
  },
  getOwnPropertyDescriptor: (target, prop) => {
    if (typeof prop === 'string') {
      const kebab = 'data-' + prop.replace(/([A-Z])/g, '-$1').toLowerCase();
      if (kebab in target) {
        return { value: target[kebab], writable: true, enumerable: true, configurable: true };
      }
    }
    return undefined;
  }
  ```

---

### [Medium] Challenge 5: `localStorage` Proxy Overwrites Built-in Prototype Methods on Property Set

- **Assumption challenged**: Direct property indexing on `localStorage` is safe for any key.
- **Attack scenario**: Application code or tests setting `localStorage['clear'] = 'val'` or `localStorage['getItem'] = 'val'`.
- **Blast radius**: In `dom_env.js` line 1136:
  ```javascript
  set: (target, prop, val) => {
    if (prop in target) {
      target[prop] = val; // Overwrites target.clear method with string!
    } ...
  ```
  Because `'clear' in target` is true (defined on `StorageImpl.prototype`), assigning `localStorage['clear']` converts the method to a string. Subsequent calls to `localStorage.clear()` throw `TypeError: env.localStorage.clear is not a function`.
- **Mitigation**: Prevent property setters from overwriting functions on the storage target:
  ```javascript
  set: (target, prop, val) => {
    if (typeof target[prop] === 'function' || prop === 'length') {
      target.setItem(prop, val);
    } else if (prop in target && prop !== '_store') {
      target[prop] = val;
    } else {
      target.setItem(prop, val);
    }
    return true;
  }
  ```

---

## Stress Test Results

Execution log: `C:\Users\dinar\.gemini\antigravity\scratch\computer-trainer\.agents\teamwork\challenger_e2e_m1_2\execution.log`

| # | Suite | Scenario | Expected Behavior | Actual Behavior | Result |
|---|---|---|---|---|:---:|
| 1 | Assert | Circular references in equal objects | Pass equality check | Passed cleanly | **PASS** |
| 2 | Assert | Circular references in unequal objects | Throw AssertionError with diff | Threw AssertionError with diff | **PASS** |
| 3 | Assert | Deep nested arrays (100 levels) | Pass equality check | Passed cleanly | **PASS** |
| 4 | Assert | Deep nested arrays difference at leaf | Throw AssertionError | Threw AssertionError | **PASS** |
| 5 | Assert | NaN in nested structures | Deep equals recognizes NaN === NaN | Passed cleanly | **PASS** |
| 6 | Assert | Symbol properties on objects | Compares symbols accurately | Passed cleanly | **PASS** |
| 7 | Assert | Date and RegExp instances | Compares timestamp and regex flags | Passed cleanly | **PASS** |
| 8 | Assert | Maps & Sets with complex keys/values | Compares nested collections | Passed cleanly | **PASS** |
| 9 | Assert | Async function throwing after delay | Awaits rejection, returns error | Returned RangeError accurately | **PASS** |
| 10 | Assert | Rejected Promise with string primitive | Catches string rejection | Caught 'NETWORK_DISCONNECTED_ERR' | **PASS** |
| 11 | Assert | Sync function returning non-Promise | Throws AssertionError | Threw AssertionError | **PASS** |
| 12 | Assert | Async function resolving unexpectedly | Throws AssertionError | Threw AssertionError | **PASS** |
| 13 | Assert | Cyrillic `Смирнов` vs Latin `Cмирнов` | Format char divergence at index 0 | Diff showed U+0421 vs U+0043 | **PASS** |
| 14 | Assert | Embedded Cyrillic `Иванов` vs Latin `Иванoв` | Format char divergence at index 4 | Diff showed U+043E vs U+006F | **PASS** |
| 15 | Assert | `assertBetween` with `Number.MAX_SAFE_INTEGER` | Passes within boundary | Passed cleanly | **PASS** |
| 16 | Assert | `assertBetween` with `Infinity`, `-Infinity`, `NaN` | Throws finite number error | Threw AssertionError | **PASS** |
| 17 | DOM | 4-level nested event bubbling | Bubbles child -> parent -> doc -> win | Dispatched in correct order | **PASS** |
| 18 | DOM | `stopPropagation()` halts bubbling | Ancestors not notified | Ancestors skipped | **PASS** |
| 19 | DOM | Multiple listeners on node with `stopPropagation()` | Sibling listeners on same node execute | Sibling listener was suppressed | **FAIL** |
| 20 | DOM | `e.stopImmediatePropagation()` existence & call | Method exists and stops sibling listeners | Threw TypeError (method missing) | **FAIL** |
| 21 | DOM | Combinator `div.card > span[data-role="btn"]` | Selects direct child with attribute | Correctly matched target | **PASS** |
| 22 | DOM | Comma selector `button.btn-primary, span.badge` | Selects both elements | Correctly matched both | **PASS** |
| 23 | DOM | Deep descendant query `div main section article p.lead span` | Matches deep leaf | Matched leaf element | **PASS** |
| 24 | DOM | Pseudo-class selector `button:not(.disabled)` | Matches enabled button `#b1` | Matched disabled `#b2` (inverted) | **FAIL** |
| 25 | DOM | Multi-hyphen `data-student-first-name` getter/setter | Converts to/from `studentFirstName` | Converted correctly | **PASS** |
| 26 | DOM | `Object.keys(element.dataset)` enumeration | Returns `["lessonId", "moduleName"]` | Returned `["id", "class", "data-..."]` | **FAIL** |
| 27 | DOM | `localStorage['sync_queue']` JSON array | Serializes, parses, removes, clears | Handled cleanly | **PASS** |
| 28 | DOM | `localStorage['clear'] = 'val'` method collision | Storage method `clear()` remains callable | `clear` overwritten with string | **FAIL** |
| 29 | DOM | Concurrency: rapid `setOnline` + 50 fetches | Offline fetches reject, online resolve | 50 calls tracked, errors correct | **PASS** |
| 30 | Leak | Single setup and teardown global restoration | All injected globals restored/deleted | Restored cleanly | **PASS** |
| 31 | Leak | 100 consecutive setup/teardown cycles | No lingering window/document | 0 leaks detected | **PASS** |
| 32 | Leak | Node 22 native navigator preservation | Restores native getter/descriptor | Restored cleanly | **PASS** |
| 33 | Leak | Active timers & intervals cancellation | Teardown clears pending timers | Timers did not fire | **PASS** |
| 34 | Leak | Memory stability (50 full app stack loads) | Heap growth under 50MB | Heap delta: 14.00 MB | **PASS** |

---

## Unchallenged Areas

- **Full flexbox/grid computed layout reflow**: Headless DOM intentionally models stub dimensions (`offsetWidth = 100`, `offsetHeight = 40`, and `0` when `display: none`), which is appropriate for unit/E2E DOM tests without rendering engines.
- **Web Audio DSP processing**: `MockAudioContext` records oscillator connections and frequencies, but does not perform actual audio synthesis buffers, which is out of scope for Node headless testing.
