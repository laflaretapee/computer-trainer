# Headless DOM and Browser Environment Mock (`tests/helpers/dom_env.js`)
## Architecture & Technical Design Specification

### 1. Executive Summary

This document specifies the technical design and reference architecture for `tests/helpers/dom_env.js`, the headless DOM and browser environment mock for the 7th-Grade Computer Trainer SPA test suite.

The test infrastructure has a strict constraint: **zero external npm runtime dependencies**. It must execute directly on standard Node.js (v22.18.0+) without requiring `npm install` or third-party packages like `jsdom` or `happy-dom`.

To validate feasibility, a prototype implementation of the proposed DOM engine was built and verified directly against the production codebase (`index.html`, `data/students.js`, `data/content.js`, and `app.js`). The prototype successfully initialized the SPA, evaluated screen state, simulated button clicks, navigated through role selection, rendered classes (7-А to 7-Д), populated student lists (15 students for 7-А), and switched to the student menu without a single error.

---

### 2. Comprehensive Catalog of Browser & DOM APIs

An exhaustive audit of the codebase (`index.html`, `app.js`, `modules/typing.js`, `modules/teacher.js`, `data/students.js`, `data/content.js`) and requirements for upcoming modules (`modules/mouse.js` in M3, Auto-Update in M4) reveals the following required APIs:

#### 2.1. DOM Traversal & Querying
| API | Files | Exact Use Case |
|---|---|---|
| `document.getElementById(id)` | `app.js`, `typing.js`, `teacher.js` | Locating screen containers (`screen-login`, `screen-student`), buttons (`btn-student`), inputs (`teacher-password`), titles |
| `element.getElementById(id)` | Document / Element | Fast lookup by ID |
| `document.querySelector(sel)` / `element.querySelector(sel)` | `app.js`, `typing.js` | Finding target elements (`#app-modal .modal-body`, `[data-key="..."]`, `[data-idx="..."]`, `span`) |
| `document.querySelectorAll(sel)` / `element.querySelectorAll(sel)` | `app.js`, `typing.js`, `teacher.js` | Querying collections: `.btn-module`, `[data-back]`, `.btn-open-slides`, `.answer-btn`, `.level-btn`, `.key-active`, `.key-next`, `.btn-clear-student` |
| `element.closest(sel)` | `app.js:693` | Locating ancestor container (`btn.closest('#screen-typing')`) |
| `element.matches(sel)` | Internal & tests | Validating element against CSS selector |
| `element.getElementsByTagName(tag)` | Standard DOM | Tag lookup |
| `element.getElementsByClassName(cls)` | Standard DOM | Class lookup |

#### 2.2. DOM Tree Structure & Manipulation
| API | Files | Exact Use Case |
|---|---|---|
| `document.createElement(tagName)` | `app.js`, `teacher.js` | Creating buttons (`button`), download link (`a`), cards |
| `document.createTextNode(text)` | Core DOM | Text node creation |
| `element.appendChild(child)` | `app.js`, `teacher.js` | Appending student buttons, modal elements, download links to `document.body` |
| `element.removeChild(child)` | `teacher.js:207` | Removing temporary download link from `document.body` |
| `element.replaceChild(newChild, oldChild)` | `app.js:224` | Replacing cloned search input `searchInput.parentNode.replaceChild(newSearch, searchInput)` |
| `element.insertBefore(newChild, refNode)` | Core DOM | Dynamic insertion |
| `element.cloneNode(deep)` | `app.js:223` | Cloning search input to remove existing event listeners (`searchInput.cloneNode(true)`) |
| `element.remove()` | Standard DOM | Self-removal from tree |
| `element.parentNode` / `element.parentElement` | `app.js:224` | Parent traversal |
| `element.children` | Core DOM | Array / HTMLCollection of child elements |
| `element.childNodes` | Core DOM | Array of all child nodes (elements + text nodes) |
| `element.firstChild` / `element.lastChild` | Core DOM | Edge child node pointers |
| `element.nextSibling` / `element.previousSibling` | Core DOM | Sibling traversal |

#### 2.3. Attributes, Dataset, Style & Content
| API | Files | Exact Use Case |
|---|---|---|
| `element.innerHTML` (getter/setter) | `app.js`, `typing.js`, `teacher.js` | Setting rich markup for class lists, tests, keyboards, tables, modals; clearing containers via `innerHTML = ''` |
| `element.outerHTML` (getter) | Core DOM | String representation of element |
| `element.textContent` (getter/setter) | `app.js`, `typing.js` | Reading/writing text for stats, titles, timer labels |
| `element.className` (getter/setter) | `app.js`, `typing.js` | Direct class string assignment |
| `element.classList.add(...)` | `app.js`, `typing.js` | Adding classes: `active`, `fade-in`, `answer-correct`, `key-active`, `key-next` |
| `element.classList.remove(...)` | `app.js`, `typing.js` | Removing classes: `active`, `char-current`, `key-active` |
| `element.classList.toggle(cls, force)` | `typing.js:222` | Toggling level button active state |
| `element.classList.contains(cls)` | Test suites | Asserting element state |
| `element.setAttribute(name, val)` | `app.js`, `teacher.js` | `data-student-id`, `href`, `download`, `data-topic`, `data-test-id` |
| `element.getAttribute(name)` | `app.js`, `teacher.js` | Reading attributes: `data-topic`, `data-test-id`, `data-idx`, `data-back`, `data-id` |
| `element.removeAttribute(name)` | Core DOM | Attribute deletion |
| `element.hasAttribute(name)` | Core DOM | Checking attribute existence |
| `element.dataset` (camelCase <-> kebab-case) | `typing.js:169, 222` | Reading `btn.dataset.level` mapped to `data-level` |
| `element.style[prop]` | `app.js`, `typing.js` | Modifying `style.display` (`'none'`, `'flex'`, `''`), `style.width` |
| `element.value` | `app.js`, `teacher.js` | Reading/setting text input values, select dropdown values |
| `element.disabled` | `app.js:311, 431` | Disabling navigation buttons and test answer buttons |
| `element.selected` | `teacher.js:60` | Dropdown option selection |
| `element.focus()` / `element.blur()` | `app.js:226, 649` | Focusing password field, search field, hidden typing input |
| `element.click()` | `teacher.js:206` | Programmatic clicking (e.g. CSV download link trigger) |
| `element.scrollIntoView(...)` | `typing.js:399` | Smooth scroll to results |
| `void target.offsetWidth` | `app.js:49` | Reflow trigger for CSS animations |

#### 2.4. Event System
| Event / Method | Files | Exact Use Case |
|---|---|---|
| `element.addEventListener(type, fn)` | `app.js`, `typing.js`, `teacher.js` | Attaching handlers for `click`, `keydown`, `input`, `change`, `DOMContentLoaded` |
| `element.removeEventListener(type, fn)` | Core DOM | Detaching handlers |
| `element.dispatchEvent(event)` | Core DOM & Tests | Dispatching synthetic events for automated testing |
| Inline handlers: `onclick`, `onkeydown` | `app.js:327, 335, 622` | Slide navigation `prev.onclick`, modal dismiss `modal.onclick` |
| `event.preventDefault()` | `typing.js:259`, M3 contextmenu | Preventing default keyboard actions, preventing native browser context menu |
| `event.stopPropagation()` | Standard DOM | Stopping event bubbling |
| `event.bubbles`, `event.cancelable` | Standard DOM | Event propagation parameters |
| `event.target`, `event.currentTarget` | `app.js:225, 623` | Event target resolution (`e.target === modal`, `e.target.value`) |
| `Event`, `CustomEvent` | Standard DOM | Decoupled notification events |
| `MouseEvent` | App & M3 | `click`, `dblclick` (folder open), `contextmenu` (OS menu), with `clientX`, `clientY`, `button` |
| `KeyboardEvent` | `typing.js:250-270` | Touch typing: `e.key`, `e.code`, `e.ctrlKey`, `e.altKey`, `e.metaKey`, `e.shiftKey` |
| `DragEvent` | M3 (Mouse Trainer) | File sorting: `dragstart`, `dragover`, `drop`, `dragend`, with `dataTransfer.setData`, `getData`, `clearData` |

#### 2.5. Browser Globals & Stubs
| Global | Files | Implementation Strategy |
|---|---|---|
| `window` | All | Root global object; references itself (`window.window = window`); host for data and module exports |
| `document` | All | Instance of `Document`; contains `documentElement`, `head`, `body`, `createElement`, `getElementById` |
| `localStorage` | `app.js`, `teacher.js` | In-memory `Storage` mock: `getItem`, `setItem`, `removeItem`, `clear`, `length`, `key(i)`, plus proxy property access (`localStorage['trainer_progress']`) |
| `sessionStorage` | App | Secondary in-memory `Storage` instance |
| `navigator.onLine` | `app.js` (M4), Auto-Update | Mutable boolean; paired with `setOnline(bool)` helper that fires `online`/`offline` window events |
| `navigator.userAgent` | Browser | String `'Mozilla/5.0 (Windows NT 10.0; Win64; x64) HeadlessTest/1.0'` |
| `AudioContext` / `webkitAudioContext` | `modules/mouse.js` (M3) | Non-throwing Web Audio stub with `createOscillator()`, `createGain()`, `destination`, and call spy history |
| `setTimeout`, `clearTimeout` | `app.js`, `typing.js` | Native Node.js timer integration |
| `setInterval`, `clearInterval` | `typing.js` | Native Node.js interval integration |
| `requestAnimationFrame`, `cancelAnimationFrame` | Browser | Mapped to `setTimeout(cb, 16)` / `clearTimeout(id)` |
| `alert(msg)` | `app.js:129` | Mock recorder; captures messages to `window.__alertLog` |
| `confirm(msg)` | `teacher.js:160, 171` | Mock recorder; returns configurable `window.__confirmReturnValue` (default `true`) |
| `prompt(msg, default)` | Standard dialog | Returns configurable `window.__promptReturnValue` |
| `Blob`, `URL` | `teacher.js:200, 201` | Built-in in Node 22 (`new Blob()`, `URL.createObjectURL()`, `URL.revokeObjectURL()`) |
| `fetch`, `AbortController` | `app.js` (M4 Auto-update) | Built-in in Node 22; mockable for `version.json` intercept |

---

### 3. Architecture Specification for `tests/helpers/dom_env.js`

`tests/helpers/dom_env.js` must be structured into modular, self-contained components:

```
tests/helpers/dom_env.js
├── DOMTokenList (classList implementation)
├── Node (base tree node: childNodes, appendChild, removeChild, etc.)
├── TextNode (nodeType 3)
├── CommentNode (nodeType 8)
├── Element (nodeType 1: tag, attrs, classList, dataset, style, innerHTML, events, querySelector)
├── Document (nodeType 9: documentElement, head, body, createElement, getElementById)
├── HTMLParser (zero-dependency regex tokenizer: tags, void elements, attributes, entities)
├── CSSSelectorMatcher (supports tags, #ids, .classes, [attrs], combinators, comma-lists, closest)
├── EventHierarchy (Event, CustomEvent, MouseEvent, KeyboardEvent, DragEvent with DataTransfer)
├── MockStorage (localStorage/sessionStorage with Proxy property access)
├── WebAudioMock (AudioContext, OscillatorNode, GainNode, destination, call spy logger)
├── EnvironmentManager (setupDom, teardownDom, loadScript, evaluateScript, simulation helpers)
└── Exports (createTestEnv, setupBrowserEnv, teardownTestEnv, domEnv)
```

#### 3.1. Class Hierarchy Design

```javascript
// Base Node
class Node {
  constructor(nodeType, nodeName) {
    this.nodeType = nodeType; // 1=Element, 3=Text, 8=Comment, 9=Document
    this.nodeName = nodeName;
    this.parentNode = null;
    this.childNodes = [];
  }
  get firstChild() { return this.childNodes[0] || null; }
  get lastChild() { return this.childNodes[this.childNodes.length - 1] || null; }
  get nextSibling() { ... }
  get previousSibling() { ... }
  appendChild(child) { ... }
  removeChild(child) { ... }
  replaceChild(newChild, oldChild) { ... }
  insertBefore(newChild, refChild) { ... }
  cloneNode(deep = false) { ... }
  contains(otherNode) { ... }
  remove() { ... }
}

// Element Node
class Element extends Node {
  constructor(tagName, ownerDocument) {
    super(1, tagName.toUpperCase());
    this.tagName = tagName.toUpperCase();
    this.ownerDocument = ownerDocument;
    this.attributes = {};
    this.classList = new DOMTokenList(this);
    this.listeners = {};
    this._styleObj = {};
    this.value = '';
    this.disabled = false;
    this.checked = false;
    this.selected = false;

    this.style = new Proxy(this._styleObj, {
      get: (target, prop) => target[prop] || '',
      set: (target, prop, val) => { target[prop] = String(val); return true; }
    });

    this.dataset = new Proxy(this.attributes, {
      get: (target, prop) => {
        const kebab = 'data-' + prop.replace(/([A-Z])/g, '-$1').toLowerCase();
        return target[kebab];
      },
      set: (target, prop, val) => {
        const kebab = 'data-' + prop.replace(/([A-Z])/g, '-$1').toLowerCase();
        target[kebab] = String(val);
        return true;
      }
    });
  }

  // Id, className, parentElement, children
  get id() { return this.getAttribute('id') || ''; }
  set id(v) { this.setAttribute('id', v); }
  get className() { return this.getAttribute('class') || ''; }
  set className(v) { this.setAttribute('class', v); }
  get children() { return this.childNodes.filter(n => n.nodeType === 1); }
  get parentElement() { return (this.parentNode && this.parentNode.nodeType === 1) ? this.parentNode : null; }

  // Attributes
  getAttribute(name) { ... }
  setAttribute(name, val) { ... }
  removeAttribute(name) { ... }
  hasAttribute(name) { ... }

  // Content
  get textContent() { ... }
  set textContent(val) { ... }
  get innerHTML() { ... }
  set innerHTML(htmlStr) { ... }
  get outerHTML() { ... }

  // Querying & Traversal
  closest(selector) { ... }
  matches(selector) { ... }
  querySelector(selector) { ... }
  querySelectorAll(selector) { ... }
  getElementsByClassName(cls) { ... }
  getElementsByTagName(tag) { ... }

  // Events & Dispatch
  addEventListener(type, handler) { ... }
  removeEventListener(type, handler) { ... }
  dispatchEvent(event) { ... }
  click() { ... }
  focus() { ... }
  blur() { ... }

  // Layout Stubs
  get offsetWidth() { return this.style.display === 'none' ? 0 : 100; }
  get offsetHeight() { return this.style.display === 'none' ? 0 : 40; }
  get clientWidth() { return this.offsetWidth; }
  get clientHeight() { return this.offsetHeight; }
  getBoundingClientRect() {
    return { top: 0, left: 0, bottom: 40, right: 100, width: 100, height: 40, x: 0, y: 0 };
  }
}
```

#### 3.2. HTML Parser Specification

The HTML parser converts HTML strings into a DOM tree without external parsers. It supports:
1. **Void Tags**: Elements that do not require closing tags (`<input>`, `<img>`, `<meta>`, `<link>`, `<br>`, `<hr>`).
2. **Self-Closing Tags**: `<div />`, `<span />`.
3. **Attribute Parsing**: `key="value"`, `key='value'`, `key=unquoted`, and boolean attributes (`disabled`, `selected`).
4. **Entity Decoding**: `&nbsp;` -> `' '`, `&amp;` -> `'&'`, `&lt;` -> `'<'`, `&gt;` -> `'>'`, `&quot;` -> `'"'`.
5. **Raw Content Handling**: For `<script>` and `<style>`, contents are preserved verbatim.

Tokenizer Regular Expression:
```javascript
const TAG_REGEX = /<!--[\s\S]*?-->|<!DOCTYPE[^>]*>|<\/([a-zA-Z0-9\-]+)\s*>|<([a-zA-Z0-9\-]+)((?:\s+[^=>\s\/]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^>\s]+))?)*)\s*(\/?)>|([^<]+)/gi;
```

#### 3.3. CSS Selector Engine Specification

The selector engine evaluates selectors through recursive tree walking:
1. **Comma-separated selectors**: `selector1, selector2` (evaluates any branch).
2. **Descendant combinator**: `ancestor descendant` (e.g. `#app-modal .modal-body`).
3. **Child combinator**: `parent > child`.
4. **Single-token matching**:
   - ID: `#id`
   - Class: `.className` (supports chained `.class1.class2`)
   - Tag: `div`, `button`, `span` (or `*` for all)
   - Attribute exact: `[attr="value"]` or `[attr='value']`
   - Attribute existence: `[attr]` (e.g. `[data-back]`)
5. **`element.closest(selector)`**:
   Traverses upward from `element` checking `curr.matches(selector)`. Returns first matching ancestor or `null`.

#### 3.4. Event System & Event Classes

Events in `dom_env.js` emulate browser dispatch with bubbling:

```javascript
class MockEvent {
  constructor(type, options = {}) {
    this.type = type;
    this.bubbles = options.bubbles !== undefined ? options.bubbles : true;
    this.cancelable = options.cancelable !== undefined ? options.cancelable : true;
    this.defaultPrevented = false;
    this.target = null;
    this.currentTarget = null;
    this.timeStamp = Date.now();
    this._propagationStopped = false;
    Object.assign(this, options);
  }
  preventDefault() {
    if (this.cancelable) this.defaultPrevented = true;
  }
  stopPropagation() {
    this._propagationStopped = true;
  }
}

class MockCustomEvent extends MockEvent {
  constructor(type, options = {}) {
    super(type, options);
    this.detail = options.detail !== undefined ? options.detail : null;
  }
}

class MockMouseEvent extends MockEvent {
  constructor(type, options = {}) {
    super(type, options);
    this.clientX = options.clientX || 0;
    this.clientY = options.clientY || 0;
    this.button = options.button !== undefined ? options.button : 0; // 0=left, 1=middle, 2=right
    this.buttons = options.buttons !== undefined ? options.buttons : (this.button === 0 ? 1 : 0);
    this.ctrlKey = Boolean(options.ctrlKey);
    this.altKey = Boolean(options.altKey);
    this.shiftKey = Boolean(options.shiftKey);
    this.metaKey = Boolean(options.metaKey);
  }
}

class MockKeyboardEvent extends MockEvent {
  constructor(type, options = {}) {
    super(type, options);
    this.key = options.key || '';
    this.code = options.code || '';
    this.ctrlKey = Boolean(options.ctrlKey);
    this.altKey = Boolean(options.altKey);
    this.shiftKey = Boolean(options.shiftKey);
    this.metaKey = Boolean(options.metaKey);
    this.repeat = Boolean(options.repeat);
  }
}

class MockDragEvent extends MockMouseEvent {
  constructor(type, options = {}) {
    super(type, options);
    this.dataTransfer = options.dataTransfer || new MockDataTransfer();
  }
}

class MockDataTransfer {
  constructor() {
    this._data = {};
    this.dropEffect = 'none';
    this.effectAllowed = 'all';
    this.types = [];
  }
  setData(format, data) {
    const key = format.toLowerCase();
    this._data[key] = String(data);
    if (!this.types.includes(key)) this.types.push(key);
  }
  getData(format) {
    return this._data[format.toLowerCase()] || '';
  }
  clearData(format) {
    if (format) {
      delete this._data[format.toLowerCase()];
      this.types = this.types.filter(t => t !== format.toLowerCase());
    } else {
      this._data = {};
      this.types = [];
    }
  }
}
```

**Dispatch Logic with Bubbling:**
1. When `element.dispatchEvent(event)` is called:
2. Sets `event.target = element`.
3. Collects the ancestor path: `[element, element.parentNode, ..., document, window]`.
4. Traverses the path. At each node:
   - Sets `event.currentTarget = node`.
   - Invokes all listeners registered via `node.addEventListener(event.type, fn)`.
   - Invokes inline handler if present: `if (typeof node['on' + event.type] === 'function') node['on' + event.type](event)`.
   - If `event._propagationStopped` is true, terminates bubbling immediately.
5. Returns `!event.defaultPrevented`.

#### 3.5. Web Storage API (`localStorage` & `sessionStorage`)

To support both method access (`localStorage.getItem('trainer_progress')`) and direct property indexing (`localStorage['trainer_progress']` or `delete localStorage['trainer_progress']`), `MockStorage` is wrapped in a Proxy:

```javascript
class MockStorageImpl {
  constructor() {
    this._store = {};
  }
  getItem(key) {
    return Object.prototype.hasOwnProperty.call(this._store, key) ? this._store[key] : null;
  }
  setItem(key, val) {
    this._store[key] = String(val);
  }
  removeItem(key) {
    delete this._store[key];
  }
  clear() {
    this._store = {};
  }
  get length() {
    return Object.keys(this._store).length;
  }
  key(index) {
    return Object.keys(this._store)[index] || null;
  }
}

function createStorage() {
  const impl = new MockStorageImpl();
  return new Proxy(impl, {
    get: (target, prop) => {
      if (typeof prop === 'string' && prop in target) {
        const val = target[prop];
        return typeof val === 'function' ? val.bind(target) : val;
      }
      return target.getItem(prop);
    },
    set: (target, prop, val) => {
      if (prop in target) {
        target[prop] = val;
      } else {
        target.setItem(prop, val);
      }
      return true;
    },
    deleteProperty: (target, prop) => {
      target.removeItem(prop);
      return true;
    }
  });
}
```

#### 3.6. Web Audio API Mock (`AudioContext`)

M3 uses synthesized Web Audio chimes for mouse clicks and drag-drop events. The mock provides a non-throwing stub that records all audio events for assertion:

```javascript
class MockAudioContext {
  constructor() {
    this.state = 'running';
    this.currentTime = 0;
    this.destination = { __type: 'AudioDestinationNode' };
    this.__calls = []; // History of sound synthesis calls
  }

  createOscillator() {
    const osc = {
      type: 'sine',
      frequency: {
        value: 440,
        setValueAtTime: (val, t) => { osc.frequency.value = val; }
      },
      connect: (dest) => osc,
      disconnect: () => {},
      start: (t) => {
        this.__calls.push({ action: 'startOscillator', type: osc.type, freq: osc.frequency.value, time: t });
      },
      stop: (t) => {
        this.__calls.push({ action: 'stopOscillator', time: t });
      }
    };
    return osc;
  }

  createGain() {
    const gain = {
      gain: {
        value: 1,
        setValueAtTime: (val, t) => { gain.gain.value = val; },
        exponentialRampToValueAtTime: (val, t) => { gain.gain.value = val; },
        linearRampToValueAtTime: (val, t) => { gain.gain.value = val; }
      },
      connect: (dest) => gain,
      disconnect: () => {}
    };
    return gain;
  }

  close() {
    this.state = 'closed';
    return Promise.resolve();
  }
  resume() {
    this.state = 'running';
    return Promise.resolve();
  }
  suspend() {
    this.state = 'suspended';
    return Promise.resolve();
  }
}
```

---

### 4. Setup, Teardown & Test Isolation Mechanics

#### 4.1. The Contamination Problem
In Node.js, multiple test files running in the same process can pollute the `global` object. If Test A registers `global.window`, modifies `localStorage['trainer_progress']`, or leaves timers running, Test B will observe stale state, resulting in flaky tests.

#### 4.2. Clean Environment Lifecycle
`tests/helpers/dom_env.js` manages state through `setupBrowserEnv(options)` and `teardownBrowserEnv()`:

```javascript
let _originalGlobals = null;
let _activeTimers = new Set();
let _activeIntervals = new Set();

function setupBrowserEnv(options = {}) {
  // 1. Snapshot original global keys if not already saved
  if (!_originalGlobals) {
    _originalGlobals = {
      window: global.window,
      document: global.document,
      localStorage: global.localStorage,
      sessionStorage: global.sessionStorage,
      navigator: global.navigator,
      location: global.location,
      AudioContext: global.AudioContext,
      webkitAudioContext: global.webkitAudioContext,
      Event: global.Event,
      CustomEvent: global.CustomEvent,
      MouseEvent: global.MouseEvent,
      KeyboardEvent: global.KeyboardEvent,
      DragEvent: global.DragEvent,
      alert: global.alert,
      confirm: global.confirm,
      prompt: global.prompt,
      requestAnimationFrame: global.requestAnimationFrame,
      cancelAnimationFrame: global.cancelAnimationFrame,
      STUDENTS_DATA: global.STUDENTS_DATA,
      CONTENT_DATA: global.CONTENT_DATA,
      App: global.App,
      TypingTrainer: global.TypingTrainer,
      TeacherPanel: global.TeacherPanel,
      MouseTrainer: global.MouseTrainer,
    };
  }

  // 2. Instantiate isolated DOM and document
  const doc = new Document();
  const htmlContent = options.html || readProjectIndexHtml();
  const nodes = parseHTMLToNodes(htmlContent, doc);
  for (const n of nodes) doc.appendChild(n);

  doc.documentElement = doc.querySelector('html');
  doc.head = doc.querySelector('head');
  doc.body = doc.querySelector('body');

  // 3. Instantiate mocks
  const storage = createStorage();
  const sessionStore = createStorage();
  const audioCtx = new MockAudioContext();

  const mockWindow = {
    document: doc,
    localStorage: storage,
    sessionStorage: sessionStore,
    navigator: {
      onLine: options.online !== undefined ? options.online : true,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) HeadlessTest/1.0'
    },
    location: {
      href: 'http://localhost/index.html',
      origin: 'http://localhost',
      protocol: 'http:',
      pathname: '/index.html',
      reload: () => {}
    },
    AudioContext: MockAudioContext,
    webkitAudioContext: MockAudioContext,
    Event: MockEvent,
    CustomEvent: MockCustomEvent,
    MouseEvent: MockMouseEvent,
    KeyboardEvent: MockKeyboardEvent,
    DragEvent: MockDragEvent,
    alert: (msg) => { mockWindow.__alertLog.push(msg); },
    confirm: (msg) => {
      mockWindow.__confirmLog.push(msg);
      return mockWindow.__confirmReturnValue !== undefined ? mockWindow.__confirmReturnValue : true;
    },
    prompt: (msg, def) => {
      mockWindow.__promptLog.push(msg);
      return mockWindow.__promptReturnValue !== undefined ? mockWindow.__promptReturnValue : def;
    },
    setTimeout: (fn, ms, ...args) => {
      const id = setTimeout(fn, ms, ...args);
      _activeTimers.add(id);
      return id;
    },
    clearTimeout: (id) => {
      _activeTimers.delete(id);
      clearTimeout(id);
    },
    setInterval: (fn, ms, ...args) => {
      const id = setInterval(fn, ms, ...args);
      _activeIntervals.add(id);
      return id;
    },
    clearInterval: (id) => {
      _activeIntervals.delete(id);
      clearInterval(id);
    },
    requestAnimationFrame: (cb) => {
      const id = setTimeout(() => cb(Date.now()), 16);
      _activeTimers.add(id);
      return id;
    },
    cancelAnimationFrame: (id) => {
      _activeTimers.delete(id);
      clearTimeout(id);
    },
    addEventListener: (type, fn) => doc.addEventListener(type, fn),
    removeEventListener: (type, fn) => doc.removeEventListener(type, fn),
    dispatchEvent: (ev) => doc.dispatchEvent(ev),
    __alertLog: [],
    __confirmLog: [],
    __promptLog: [],
    __confirmReturnValue: true,
  };
  mockWindow.window = mockWindow;

  // 4. Attach to Node global
  Object.assign(global, {
    window: mockWindow,
    document: doc,
    localStorage: storage,
    sessionStorage: sessionStore,
    navigator: mockWindow.navigator,
    location: mockWindow.location,
    AudioContext: MockAudioContext,
    webkitAudioContext: MockAudioContext,
    Event: MockEvent,
    CustomEvent: MockCustomEvent,
    MouseEvent: MockMouseEvent,
    KeyboardEvent: MockKeyboardEvent,
    DragEvent: MockDragEvent,
    alert: mockWindow.alert,
    confirm: mockWindow.confirm,
    prompt: mockWindow.prompt,
    requestAnimationFrame: mockWindow.requestAnimationFrame,
    cancelAnimationFrame: mockWindow.cancelAnimationFrame,
  });

  return {
    window: mockWindow,
    document: doc,
    localStorage: storage,
    navigator: mockWindow.navigator,
    audioContext: audioCtx,
    loadScript: (relPath) => loadScriptInEnv(relPath),
    loadAppStack: () => loadFullAppStack(),
    setOnline: (online) => setNetworkOnline(online, mockWindow),
    teardown: () => teardownBrowserEnv(),
  };
}

function teardownBrowserEnv() {
  // Clear all pending timers
  for (const id of _activeTimers) clearTimeout(id);
  _activeTimers.clear();
  for (const id of _activeIntervals) clearInterval(id);
  _activeIntervals.clear();

  // Restore original globals
  if (_originalGlobals) {
    for (const [key, val] of Object.entries(_originalGlobals)) {
      if (val === undefined) {
        delete global[key];
      } else {
        global[key] = val;
      }
    }
  }
}
```

#### 4.3. Script Loader Mechanics (`loadAppStack()`)
The SPA relies on browser script inclusion order:
1. `data/students.js` (populates `window.STUDENTS_DATA`)
2. `data/content.js` (populates `window.CONTENT_DATA`)
3. `app.js` (declares `App`, attaches `DOMContentLoaded`)
4. `modules/typing.js` (populates `window.TypingTrainer`)
5. `modules/teacher.js` (populates `window.TeacherPanel`)
6. `modules/mouse.js` (populates `window.MouseTrainer` when present)

The helper `env.loadAppStack()` executes this sequence in order using Node's `vm.runInThisContext(code)` or standard `require`:
```javascript
function loadFullAppStack() {
  const root = getProjectRoot();
  require(path.join(root, 'data/students.js'));
  require(path.join(root, 'data/content.js'));
  
  const appCode = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  vm.runInThisContext(appCode);

  require(path.join(root, 'modules/typing.js'));
  require(path.join(root, 'modules/teacher.js'));

  const mousePath = path.join(root, 'modules/mouse.js');
  if (fs.existsSync(mousePath)) {
    require(mousePath);
  }

  // Dispatch DOMContentLoaded to trigger App.init()
  document.dispatchEvent(new MockEvent('DOMContentLoaded'));
}
```

---

### 5. Interaction Simulation Helpers for Test Authors

To keep test code concise and declarative across Tiers 1–5, `dom_env.js` exposes interaction dispatch utilities:

1. **`dispatchClick(targetOrSelector)`**:
   Resolves element, creates `MouseEvent('click')`, and calls `dispatchEvent(ev)`.
2. **`dispatchDblClick(targetOrSelector)`**:
   Dispatches `MouseEvent('dblclick')`.
3. **`dispatchContextMenu(targetOrSelector)`**:
   Dispatches `MouseEvent('contextmenu', { button: 2, cancelable: true })`. Allows asserting `event.defaultPrevented === true`.
4. **`dispatchKey(targetOrSelector, key, options = {})`**:
   Dispatches `KeyboardEvent('keydown', { key, ...options })`.
5. **`dispatchInput(targetOrSelector, value)`**:
   Sets `element.value = value` and dispatches `Event('input', { bubbles: true })`.
6. **`dispatchDragDrop(sourceTarget, destTarget, data = {})`**:
   Simulates full drag-and-drop cycle:
   - Creates shared `MockDataTransfer`.
   - Dispatches `dragstart` on source.
   - Dispatches `dragover` on destination.
   - Dispatches `drop` on destination with the transfer data.
   - Dispatches `dragend` on source.
7. **`setOnline(isOnline)`**:
   Updates `navigator.onLine = isOnline` and dispatches `Event(isOnline ? 'online' : 'offline')` on `window`.

---

### 6. Architectural Recommendations for Builder Agent

1. **Single-File Module**: Keep `tests/helpers/dom_env.js` as a unified, cohesive module with zero external imports (only Node.js built-ins: `fs`, `path`, `vm`).
2. **Self-Contained Exports**: Export both individual factory functions (`setupBrowserEnv`, `teardownBrowserEnv`) and shorthand shortcuts (`createTestEnv`, `setupDom`).
3. **Smoke Test Alignment**: Ensure `tests/test_infra.test.js` tests all mock capabilities:
   - DOM node creation, innerHTML rendering, querying by id/class/attribute/descendant.
   - Event bubbling and listener execution for `click`, `keydown`, `contextmenu`, and `dragstart/drop`.
   - `localStorage` persistence, string coercion, and proxy property access.
   - `navigator.onLine` toggling and `online`/`offline` window events.
   - `AudioContext` oscillator and gain stub call recording.
   - Clean teardown with zero leaking variables.
