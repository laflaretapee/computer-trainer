/**
 * tests/helpers/dom_env.js
 * Zero-dependency headless DOM and browser environment mock for Node.js.
 * Provides DOM tree hierarchy, CSS selectors, event propagation, storage,
 * Web Audio, Fetch/Sync mocks, and full SPA lifecycle management.
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// ─── 1. DOM Token List (classList) ──────────────────────────────────────────

class DOMTokenList {
  constructor(element) {
    this._element = element;
    this._tokens = [];
    this._syncFromAttribute();
  }

  _syncFromAttribute() {
    const classAttr = this._element.getAttribute('class') || '';
    this._tokens = classAttr.trim() ? classAttr.trim().split(/\s+/) : [];
  }

  _syncToAttribute() {
    const classStr = this._tokens.join(' ');
    if (classStr) {
      this._element.setAttribute('class', classStr);
    } else {
      this._element.removeAttribute('class');
    }
  }

  add(...tokens) {
    let modified = false;
    for (const token of tokens) {
      if (!token) continue;
      if (!this._tokens.includes(token)) {
        this._tokens.push(token);
        modified = true;
      }
    }
    if (modified) this._syncToAttribute();
  }

  remove(...tokens) {
    const initialLen = this._tokens.length;
    this._tokens = this._tokens.filter(t => !tokens.includes(t));
    if (this._tokens.length !== initialLen) {
      this._syncToAttribute();
    }
  }

  toggle(token, force) {
    if (typeof force === 'boolean') {
      if (force) {
        this.add(token);
        return true;
      } else {
        this.remove(token);
        return false;
      }
    }

    if (this.contains(token)) {
      this.remove(token);
      return false;
    } else {
      this.add(token);
      return true;
    }
  }

  contains(token) {
    return this._tokens.includes(token);
  }

  replace(oldToken, newToken) {
    const idx = this._tokens.indexOf(oldToken);
    if (idx !== -1) {
      this._tokens[idx] = newToken;
      this._syncToAttribute();
      return true;
    }
    return false;
  }

  item(index) {
    return this._tokens[index] || null;
  }

  get length() {
    return this._tokens.length;
  }

  get value() {
    return this._tokens.join(' ');
  }

  toString() {
    return this.value;
  }
}

// ─── 2. DOM Node Base Hierarchy ─────────────────────────────────────────────

class Node {
  constructor(nodeType, nodeName) {
    this.nodeType = nodeType; // 1=Element, 3=Text, 8=Comment, 9=Document, 11=DocumentFragment
    this.nodeName = nodeName.toUpperCase();
    this.parentNode = null;
    this.childNodes = [];
    this.ownerDocument = null;
    this._eventListeners = {};
  }

  get firstChild() {
    return this.childNodes[0] || null;
  }

  get lastChild() {
    return this.childNodes[this.childNodes.length - 1] || null;
  }

  get nextSibling() {
    if (!this.parentNode) return null;
    const siblings = this.parentNode.childNodes;
    const idx = siblings.indexOf(this);
    return idx !== -1 && idx + 1 < siblings.length ? siblings[idx + 1] : null;
  }

  get previousSibling() {
    if (!this.parentNode) return null;
    const siblings = this.parentNode.childNodes;
    const idx = siblings.indexOf(this);
    return idx > 0 ? siblings[idx - 1] : null;
  }

  appendChild(child) {
    if (!child) return child;

    // Handle DocumentFragment
    if (child.nodeType === 11) {
      const fragmentChildren = [...child.childNodes];
      for (const fc of fragmentChildren) {
        this.appendChild(fc);
      }
      return child;
    }

    if (child.parentNode) {
      child.parentNode.removeChild(child);
    }
    child.parentNode = this;
    child.ownerDocument = this.ownerDocument || this;
    this.childNodes.push(child);
    return child;
  }

  removeChild(child) {
    const idx = this.childNodes.indexOf(child);
    if (idx === -1) {
      throw new Error('NotFoundError: Node to be removed is not a child of this node');
    }
    this.childNodes.splice(idx, 1);
    child.parentNode = null;
    return child;
  }

  replaceChild(newChild, oldChild) {
    const idx = this.childNodes.indexOf(oldChild);
    if (idx === -1) {
      throw new Error('NotFoundError: Node to be replaced is not a child of this node');
    }
    if (newChild.parentNode) {
      newChild.parentNode.removeChild(newChild);
    }
    newChild.parentNode = this;
    newChild.ownerDocument = this.ownerDocument || this;
    this.childNodes[idx] = newChild;
    oldChild.parentNode = null;
    return oldChild;
  }

  insertBefore(newChild, refChild) {
    if (!refChild) return this.appendChild(newChild);
    const idx = this.childNodes.indexOf(refChild);
    if (idx === -1) {
      throw new Error('NotFoundError: Reference child not found in insertBefore');
    }
    if (newChild.parentNode) {
      newChild.parentNode.removeChild(newChild);
    }
    newChild.parentNode = this;
    newChild.ownerDocument = this.ownerDocument || this;
    this.childNodes.splice(idx, 0, newChild);
    return newChild;
  }

  remove() {
    if (this.parentNode) {
      this.parentNode.removeChild(this);
    }
  }

  contains(otherNode) {
    if (!otherNode) return false;
    let curr = otherNode;
    while (curr) {
      if (curr === this) return true;
      curr = curr.parentNode;
    }
    return false;
  }

  // ─── Event Target Methods ──────────────────────────────────────────────────

  addEventListener(type, handler, options = {}) {
    if (!this._eventListeners[type]) {
      this._eventListeners[type] = [];
    }
    this._eventListeners[type].push({ handler, options });
  }

  removeEventListener(type, handler) {
    if (!this._eventListeners[type]) return;
    this._eventListeners[type] = this._eventListeners[type].filter(l => l.handler !== handler);
  }

  dispatchEvent(event) {
    if (!event) return true;
    if (!event.target) event.target = this;

    // Collect propagation path for bubbling
    const path = [];
    let curr = this;
    while (curr) {
      path.push(curr);
      curr = curr.parentNode;
    }

    // Include document and window if available
    if (this.ownerDocument && !path.includes(this.ownerDocument)) {
      path.push(this.ownerDocument);
    }
    if (this.ownerDocument && this.ownerDocument.defaultView && !path.includes(this.ownerDocument.defaultView)) {
      path.push(this.ownerDocument.defaultView);
    }

    for (let i = 0; i < path.length; i++) {
      const node = path[i];
      if (i > 0 && !event.bubbles) break; // Don't bubble if event does not bubble
      if (event._propagationStopped) break;

      event.currentTarget = node;

      // Execute registered listeners
      const listeners = (node._eventListeners && node._eventListeners[event.type])
        ? [...node._eventListeners[event.type]]
        : [];
      for (const item of listeners) {
        if (event._immediatePropagationStopped) break;
        try {
          item.handler.call(node, event);
        } catch (err) {
          console.error(`Error in ${event.type} event listener:`, err);
        }
      }

      // Execute inline 'on<type>' handler
      const inlineHandlerName = 'on' + event.type.toLowerCase();
      if (typeof node[inlineHandlerName] === 'function' && !event._immediatePropagationStopped) {
        try {
          node[inlineHandlerName].call(node, event);
        } catch (err) {
          console.error(`Error in inline ${inlineHandlerName} handler:`, err);
        }
      }
    }

    return !event.defaultPrevented;
  }
}

// ─── 3. TextNode & CommentNode ──────────────────────────────────────────────

class TextNode extends Node {
  constructor(text) {
    super(3, '#text');
    this._text = String(text !== undefined ? text : '');
  }

  get textContent() {
    return this._text;
  }

  set textContent(val) {
    this._text = String(val !== undefined ? val : '');
  }

  get nodeValue() {
    return this._text;
  }

  set nodeValue(val) {
    this._text = String(val !== undefined ? val : '');
  }

  get data() {
    return this._text;
  }

  set data(val) {
    this._text = String(val !== undefined ? val : '');
  }

  cloneNode() {
    return new TextNode(this._text);
  }
}

class CommentNode extends Node {
  constructor(data) {
    super(8, '#comment');
    this.data = String(data || '');
  }

  get textContent() {
    return this.data;
  }

  set textContent(val) {
    this.data = String(val || '');
  }

  cloneNode() {
    return new CommentNode(this.data);
  }
}

class DocumentFragment extends Node {
  constructor(ownerDocument) {
    super(11, '#document-fragment');
    this.ownerDocument = ownerDocument;
  }
}

// ─── 4. Element Node ────────────────────────────────────────────────────────

const VOID_TAGS = new Set([
  'AREA', 'BASE', 'BR', 'COL', 'EMBED', 'HR', 'IMG', 'INPUT',
  'LINK', 'META', 'PARAM', 'SOURCE', 'TRACK', 'WBR'
]);

class Element extends Node {
  constructor(tagName, ownerDocument) {
    super(1, tagName);
    this.tagName = tagName.toUpperCase();
    this.ownerDocument = ownerDocument;
    this.attributes = {};
    this.classList = new DOMTokenList(this);
    this._styleObj = {};
    this.value = '';
    this.disabled = false;
    this.checked = false;
    this.selected = false;

    // Style proxy
    this.style = new Proxy(this._styleObj, {
      get: (target, prop) => {
        if (prop === 'cssText') {
          return Object.entries(target)
            .map(([k, v]) => `${k.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${v}`)
            .join('; ');
        }
        return target[prop] || '';
      },
      set: (target, prop, val) => {
        if (prop === 'cssText') {
          // Parse cssText
          for (const key of Object.keys(target)) delete target[key];
          const rules = String(val).split(';');
          for (const rule of rules) {
            const [k, v] = rule.split(':').map(s => s && s.trim());
            if (k && v) {
              const camel = k.replace(/-([a-z])/g, (_, g) => g.toUpperCase());
              target[camel] = v;
            }
          }
          return true;
        }
        target[prop] = String(val);
        return true;
      }
    });

    // Dataset proxy
    const kebabToCamel = (attr) => attr.slice(5).replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());
    const camelToKebab = (prop) => 'data-' + prop.replace(/([A-Z])/g, '-$1').toLowerCase();

    this.dataset = new Proxy(this.attributes, {
      get: (target, prop) => {
        if (typeof prop !== 'string') return undefined;
        const kebab = camelToKebab(prop);
        return target[kebab];
      },
      set: (target, prop, val) => {
        if (typeof prop === 'string') {
          const kebab = camelToKebab(prop);
          target[kebab] = String(val);
        }
        return true;
      },
      has: (target, prop) => {
        if (typeof prop !== 'string') return false;
        const kebab = camelToKebab(prop);
        return kebab in target;
      },
      deleteProperty: (target, prop) => {
        if (typeof prop === 'string') {
          const kebab = camelToKebab(prop);
          delete target[kebab];
        }
        return true;
      },
      ownKeys: (target) => {
        return Object.keys(target)
          .filter(k => k.startsWith('data-') && k.length > 5)
          .map(kebabToCamel);
      },
      getOwnPropertyDescriptor: (target, prop) => {
        if (typeof prop === 'string') {
          const kebab = camelToKebab(prop);
          if (kebab in target) {
            return {
              value: target[kebab],
              writable: true,
              enumerable: true,
              configurable: true,
            };
          }
        }
        return undefined;
      }
    });
  }

  get id() {
    return this.getAttribute('id') || '';
  }

  set id(v) {
    this.setAttribute('id', v);
  }

  get className() {
    return this.getAttribute('class') || '';
  }

  set className(v) {
    this.setAttribute('class', v);
    this.classList._syncFromAttribute();
  }

  get children() {
    return this.childNodes.filter(n => n.nodeType === 1);
  }

  get parentElement() {
    return (this.parentNode && this.parentNode.nodeType === 1) ? this.parentNode : null;
  }

  // ─── Attribute Management ──────────────────────────────────────────────────

  getAttribute(name) {
    const key = name.toLowerCase();
    if (Object.prototype.hasOwnProperty.call(this.attributes, key)) {
      return this.attributes[key];
    }
    return null;
  }

  setAttribute(name, val) {
    const key = name.toLowerCase();
    this.attributes[key] = String(val);
    if (key === 'class') {
      this.classList._syncFromAttribute();
    }
  }

  removeAttribute(name) {
    const key = name.toLowerCase();
    delete this.attributes[key];
    if (key === 'class') {
      this.classList._syncFromAttribute();
    }
  }

  hasAttribute(name) {
    return Object.prototype.hasOwnProperty.call(this.attributes, name.toLowerCase());
  }

  // ─── Content Management ────────────────────────────────────────────────────

  get textContent() {
    let text = '';
    for (const child of this.childNodes) {
      text += child.textContent;
    }
    return text;
  }

  set textContent(val) {
    this.childNodes = [];
    if (val !== undefined && val !== null && val !== '') {
      this.appendChild(new TextNode(val));
    }
  }

  get innerHTML() {
    return serializeNodesToHTML(this.childNodes);
  }

  set innerHTML(htmlStr) {
    this.childNodes = [];
    if (htmlStr) {
      const nodes = parseHTMLToNodes(String(htmlStr), this.ownerDocument);
      for (const n of nodes) {
        this.appendChild(n);
      }
    }
  }

  get outerHTML() {
    const tag = this.tagName.toLowerCase();
    let attrs = '';
    for (const [k, v] of Object.entries(this.attributes)) {
      attrs += ` ${k}="${escapeHTML(v)}"`;
    }
    if (VOID_TAGS.has(this.tagName)) {
      return `<${tag}${attrs} />`;
    }
    return `<${tag}${attrs}>${this.innerHTML}</${tag}>`;
  }

  // ─── Layout & Visual Geometry Stubs ────────────────────────────────────────

  get offsetWidth() {
    return this.style.display === 'none' ? 0 : 100;
  }

  get offsetHeight() {
    return this.style.display === 'none' ? 0 : 40;
  }

  get clientWidth() {
    return this.offsetWidth;
  }

  get clientHeight() {
    return this.offsetHeight;
  }

  getBoundingClientRect() {
    const isHidden = this.style.display === 'none';
    const w = isHidden ? 0 : 100;
    const h = isHidden ? 0 : 40;
    return {
      top: 0,
      left: 0,
      bottom: h,
      right: w,
      width: w,
      height: h,
      x: 0,
      y: 0,
    };
  }

  scrollIntoView() {}

  focus() {
    if (this.ownerDocument) {
      this.ownerDocument.activeElement = this;
    }
  }

  blur() {
    if (this.ownerDocument && this.ownerDocument.activeElement === this) {
      this.ownerDocument.activeElement = null;
    }
  }

  click() {
    const event = new MockMouseEvent('click', { bubbles: true, cancelable: true });
    this.dispatchEvent(event);
  }

  // ─── Cloning ───────────────────────────────────────────────────────────────

  cloneNode(deep = false) {
    const clone = new Element(this.tagName, this.ownerDocument);
    for (const [k, v] of Object.entries(this.attributes)) {
      clone.setAttribute(k, v);
    }
    for (const [k, v] of Object.entries(this._styleObj)) {
      clone.style[k] = v;
    }
    clone.value = this.value;
    clone.disabled = this.disabled;
    clone.checked = this.checked;
    clone.selected = this.selected;

    if (deep) {
      for (const child of this.childNodes) {
        clone.appendChild(child.cloneNode(true));
      }
    }
    return clone;
  }

  // ─── Querying ──────────────────────────────────────────────────────────────

  matches(selector) {
    return matchesSelector(this, selector);
  }

  closest(selector) {
    let curr = this;
    while (curr && curr.nodeType === 1) {
      if (curr.matches(selector)) return curr;
      curr = curr.parentElement;
    }
    return null;
  }

  querySelector(selector) {
    return querySelector(this, selector);
  }

  querySelectorAll(selector) {
    return querySelectorAll(this, selector);
  }

  getElementById(id) {
    return findElementById(this, id);
  }

  getElementsByTagName(tagName) {
    const tag = tagName.toUpperCase();
    const result = [];
    walkTree(this, (node) => {
      if (node !== this && node.nodeType === 1) {
        if (tag === '*' || node.tagName === tag) {
          result.push(node);
        }
      }
    });
    return result;
  }

  getElementsByClassName(className) {
    const classes = className.trim().split(/\s+/);
    const result = [];
    walkTree(this, (node) => {
      if (node !== this && node.nodeType === 1) {
        if (classes.every(c => node.classList.contains(c))) {
          result.push(node);
        }
      }
    });
    return result;
  }
}

// ─── 5. Document Node ───────────────────────────────────────────────────────

class Document extends Node {
  constructor() {
    super(9, '#document');
    this.ownerDocument = this;
    this.defaultView = null;
    this.activeElement = null;
    this.documentElement = null;
    this.head = null;
    this.body = null;
  }

  createElement(tagName) {
    return new Element(tagName, this);
  }

  createTextNode(text) {
    const t = new TextNode(text);
    t.ownerDocument = this;
    return t;
  }

  createComment(data) {
    const c = new CommentNode(data);
    c.ownerDocument = this;
    return c;
  }

  createDocumentFragment() {
    return new DocumentFragment(this);
  }

  getElementById(id) {
    return findElementById(this, id);
  }

  querySelector(selector) {
    return querySelector(this, selector);
  }

  querySelectorAll(selector) {
    return querySelectorAll(this, selector);
  }

  getElementsByTagName(tagName) {
    const tag = tagName.toUpperCase();
    const result = [];
    walkTree(this, (node) => {
      if (node.nodeType === 1) {
        if (tag === '*' || node.tagName === tag) {
          result.push(node);
        }
      }
    });
    return result;
  }

  getElementsByClassName(className) {
    const classes = className.trim().split(/\s+/);
    const result = [];
    walkTree(this, (node) => {
      if (node.nodeType === 1) {
        if (classes.every(c => node.classList.contains(c))) {
          result.push(node);
        }
      }
    });
    return result;
  }

  get visibilityState() {
    return this._visibilityState || 'visible';
  }

  set visibilityState(val) {
    this._visibilityState = String(val);
  }

  get hidden() {
    return this.visibilityState === 'hidden';
  }

  hasFocus() {
    return this._hasFocus !== undefined ? Boolean(this._hasFocus) : true;
  }
}

// ─── 6. HTML Parser & Serializer ────────────────────────────────────────────

function decodeHTMLEntities(text) {
  if (!text) return '';
  return text
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&amp;/g, '&');
}

function escapeHTML(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function serializeNodesToHTML(nodes) {
  let html = '';
  for (const node of nodes) {
    if (node.nodeType === 1) {
      html += node.outerHTML;
    } else if (node.nodeType === 3) {
      html += escapeHTML(node.textContent);
    } else if (node.nodeType === 8) {
      html += `<!--${node.data}-->`;
    }
  }
  return html;
}

function parseHTMLToNodes(html, ownerDoc) {
  const root = new DocumentFragment(ownerDoc);
  const stack = [root];

  const tagRegex = /<!--([\s\S]*?)-->|<!DOCTYPE[^>]*>|<\/([a-zA-Z0-9\-]+)\s*>|<([a-zA-Z0-9\-]+)((?:\s+[^=>\s\/]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^>\s]+))?)*)\s*(\/?)>|([^<]+)/gi;

  let match;
  while ((match = tagRegex.exec(html)) !== null) {
    const [fullMatch, commentText, closeTag, openTag, attrsRaw, selfClose, textContent] = match;

    if (commentText !== undefined) {
      const commentNode = ownerDoc ? ownerDoc.createComment(commentText) : new CommentNode(commentText);
      stack[stack.length - 1].appendChild(commentNode);
    } else if (closeTag !== undefined) {
      const tagUpper = closeTag.toUpperCase();
      // Find matching tag in stack
      for (let i = stack.length - 1; i > 0; i--) {
        if (stack[i].tagName === tagUpper) {
          stack.splice(i);
          break;
        }
      }
    } else if (openTag !== undefined) {
      const tagUpper = openTag.toUpperCase();
      const el = ownerDoc ? ownerDoc.createElement(tagUpper) : new Element(tagUpper, ownerDoc);

      // Parse attributes
      if (attrsRaw) {
        const attrRegex = /([^\s=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
        let attrMatch;
        while ((attrMatch = attrRegex.exec(attrsRaw)) !== null) {
          const attrName = attrMatch[1];
          const attrVal = attrMatch[2] !== undefined ? attrMatch[2]
            : attrMatch[3] !== undefined ? attrMatch[3]
            : attrMatch[4] !== undefined ? attrMatch[4]
            : '';
          el.setAttribute(attrName, decodeHTMLEntities(attrVal));
        }
      }

      // Check if tag is inside <script> or <style>
      const currentParent = stack[stack.length - 1];
      currentParent.appendChild(el);

      const isVoid = VOID_TAGS.has(tagUpper) || selfClose === '/';
      if (!isVoid) {
        if (tagUpper === 'SCRIPT' || tagUpper === 'STYLE') {
          // Read raw content until closing script/style
          const closePattern = new RegExp(`</${tagUpper}\\s*>`, 'i');
          const remainder = html.slice(tagRegex.lastIndex);
          const closeMatch = remainder.match(closePattern);
          if (closeMatch) {
            const rawContent = remainder.slice(0, closeMatch.index);
            el.appendChild(ownerDoc ? ownerDoc.createTextNode(rawContent) : new TextNode(rawContent));
            tagRegex.lastIndex += closeMatch.index + closeMatch[0].length;
          }
        } else {
          stack.push(el);
        }
      }
    } else if (textContent !== undefined) {
      if (textContent.length > 0) {
        const decoded = decodeHTMLEntities(textContent);
        const textNode = ownerDoc ? ownerDoc.createTextNode(decoded) : new TextNode(decoded);
        stack[stack.length - 1].appendChild(textNode);
      }
    }
  }

  return [...root.childNodes];
}

// ─── 7. CSS Selector Engine ─────────────────────────────────────────────────

function walkTree(node, cb) {
  if (!node) return;
  cb(node);
  if (node.childNodes) {
    for (const child of node.childNodes) {
      walkTree(child, cb);
    }
  }
}

function findElementById(root, id) {
  let found = null;
  walkTree(root, (node) => {
    if (!found && node.nodeType === 1 && node.getAttribute('id') === id) {
      found = node;
    }
  });
  return found;
}

/**
 * Matches a single simple element token without combinators.
 * E.g. "button.btn.btn-primary#btn-student[data-role='user']"
 */
function matchesSimpleSelector(el, sel) {
  if (!el || el.nodeType !== 1) return false;
  if (sel === '*') return true;

  // Split selector into parts: tag, #id, .class, [attrs], :not(...), and pseudo-classes
  const tokenRegex = /(^[a-zA-Z0-9\-]+)|(#([a-zA-Z0-9\-_]+))|(\.([a-zA-Z0-9\-_]+))|(\[([a-zA-Z0-9\-_]+)(?:([~|^$*]?=)(?:"([^"]*)"|'([^']*)'|([^[\]]*)))?\])|(:not\(([^)]+)\))|(:([a-zA-Z\-]+))/g;

  let match;
  let hasRules = false;

  while ((match = tokenRegex.exec(sel)) !== null) {
    hasRules = true;
    const [, tagName, , idVal, , classVal, , attrName, attrOp, attrQ1, attrQ2, attrRaw, , notInner, , pseudoName] = match;

    if (tagName) {
      if (el.tagName !== tagName.toUpperCase()) return false;
    } else if (idVal) {
      if (el.getAttribute('id') !== idVal) return false;
    } else if (classVal) {
      if (!el.classList.contains(classVal)) return false;
    } else if (attrName) {
      if (!el.hasAttribute(attrName)) return false;
      const expectedVal = attrQ1 !== undefined ? attrQ1 : attrQ2 !== undefined ? attrQ2 : attrRaw;
      if (attrOp && expectedVal !== undefined) {
        const actualVal = el.getAttribute(attrName);
        if (attrOp === '=') {
          if (actualVal !== expectedVal) return false;
        } else if (attrOp === '^=') {
          if (!actualVal.startsWith(expectedVal)) return false;
        } else if (attrOp === '$=') {
          if (!actualVal.endsWith(expectedVal)) return false;
        } else if (attrOp === '*=') {
          if (!actualVal.includes(expectedVal)) return false;
        }
      }
    } else if (notInner) {
      if (matchesSelector(el, notInner.trim())) return false;
    } else if (pseudoName) {
      if (pseudoName === 'disabled') {
        if (!el.disabled && !el.hasAttribute('disabled')) return false;
      } else if (pseudoName === 'enabled') {
        if (el.disabled || el.hasAttribute('disabled')) return false;
      } else if (pseudoName === 'checked') {
        if (!el.checked) return false;
      }
    }
  }

  return hasRules;
}

/**
 * Tests if an element matches a complex selector (supporting ' ', '>', and ',').
 */
function matchesSelector(el, selector) {
  if (!el || el.nodeType !== 1 || !selector) return false;

  // Handle comma-separated selectors
  const alternatives = selector.split(',').map(s => s.trim());
  for (const alt of alternatives) {
    if (matchesSingleCompoundSelector(el, alt)) {
      return true;
    }
  }
  return false;
}

function matchesSingleCompoundSelector(el, selector) {
  // Parse combinators: ' ' and '>'
  // Normalize combinator spacing while preserving spaces inside brackets/quotes
  const parts = [];
  let current = '';
  let inBracket = false;
  let inQuote = null;
  const s = selector.replace(/\s*>\s*/g, ' > ').trim();
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if ((ch === '"' || ch === "'") && inBracket) {
      inQuote = inQuote === ch ? null : (inQuote || ch);
      current += ch;
    } else if (ch === '[' && !inQuote) {
      inBracket = true;
      current += ch;
    } else if (ch === ']' && !inQuote) {
      inBracket = false;
      current += ch;
    } else if (/\s/.test(ch) && !inBracket && !inQuote) {
      if (current.length > 0) {
        parts.push(current);
        current = '';
      }
    } else {
      current += ch;
    }
  }
  if (current.length > 0) {
    parts.push(current);
  }

  if (parts.length === 1) {
    return matchesSimpleSelector(el, parts[0]);
  }

  // Right-to-left matching
  let currEl = el;
  let partIdx = parts.length - 1;

  if (!matchesSimpleSelector(currEl, parts[partIdx])) {
    return false;
  }

  partIdx--;

  while (partIdx >= 0) {
    const combinatorOrSelector = parts[partIdx];

    if (combinatorOrSelector === '>') {
      // Child combinator
      partIdx--;
      const parentSelector = parts[partIdx];
      currEl = currEl.parentElement;
      if (!currEl || !matchesSimpleSelector(currEl, parentSelector)) {
        return false;
      }
      partIdx--;
    } else {
      // Descendant combinator
      const ancestorSelector = combinatorOrSelector;
      let matchedAncestor = false;
      let p = currEl.parentElement;
      while (p) {
        if (matchesSimpleSelector(p, ancestorSelector)) {
          currEl = p;
          matchedAncestor = true;
          break;
        }
        p = p.parentElement;
      }
      if (!matchedAncestor) return false;
      partIdx--;
    }
  }

  return true;
}

function querySelectorAll(root, selector) {
  const result = [];
  walkTree(root, (node) => {
    if (node !== root && node.nodeType === 1) {
      if (matchesSelector(node, selector)) {
        result.push(node);
      }
    }
  });
  return result;
}

function querySelector(root, selector) {
  let found = null;
  walkTree(root, (node) => {
    if (!found && node !== root && node.nodeType === 1) {
      if (matchesSelector(node, selector)) {
        found = node;
      }
    }
  });
  return found;
}

// ─── 8. Event Classes ───────────────────────────────────────────────────────

class MockEvent {
  constructor(type, options = {}) {
    this.type = type;
    this.bubbles = options.bubbles !== undefined ? Boolean(options.bubbles) : true;
    this.cancelable = options.cancelable !== undefined ? Boolean(options.cancelable) : true;
    this.defaultPrevented = false;
    this.target = null;
    this.currentTarget = null;
    this.timeStamp = Date.now();
    this._propagationStopped = false;
    this._immediatePropagationStopped = false;
    Object.assign(this, options);
  }

  preventDefault() {
    if (this.cancelable) {
      this.defaultPrevented = true;
    }
  }

  stopPropagation() {
    this._propagationStopped = true;
  }

  stopImmediatePropagation() {
    this._propagationStopped = true;
    this._immediatePropagationStopped = true;
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

class MockDragEvent extends MockMouseEvent {
  constructor(type, options = {}) {
    super(type, options);
    this.dataTransfer = options.dataTransfer || new MockDataTransfer();
  }
}

// ─── 9. Web Storage API Mock (localStorage & sessionStorage) ─────────────────

class StorageImpl {
  constructor() {
    this._store = {};
  }

  getItem(key) {
    const strKey = String(key);
    return Object.prototype.hasOwnProperty.call(this._store, strKey) ? this._store[strKey] : null;
  }

  setItem(key, val) {
    this._store[String(key)] = String(val);
  }

  removeItem(key) {
    delete this._store[String(key)];
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
  const impl = new StorageImpl();
  return new Proxy(impl, {
    get: (target, prop) => {
      if (typeof prop === 'string' && prop in target) {
        const val = target[prop];
        return typeof val === 'function' ? val.bind(target) : val;
      }
      return target.getItem(prop);
    },
    set: (target, prop, val) => {
      // Guard built-in Storage methods so property assignments write to the store
      // without overwriting built-in methods (clear, getItem, setItem, removeItem, length)
      target.setItem(prop, val);
      return true;
    },
    deleteProperty: (target, prop) => {
      target.removeItem(prop);
      return true;
    },
    has: (target, prop) => {
      return (prop in target) || (target.getItem(prop) !== null);
    },
    ownKeys: (target) => {
      return Object.keys(target._store);
    },
    getOwnPropertyDescriptor: (target, prop) => {
      if (Object.prototype.hasOwnProperty.call(target._store, prop)) {
        return {
          value: target._store[prop],
          writable: true,
          enumerable: true,
          configurable: true,
        };
      }
      return undefined;
    }
  });
}

// ─── 10. Web Audio API Mock ─────────────────────────────────────────────────

class MockAudioContext {
  constructor() {
    this.state = 'running';
    this.currentTime = 0;
    this.destination = { __type: 'AudioDestinationNode' };
    this.__calls = [];
  }

  createOscillator() {
    const ctx = this;
    const osc = {
      type: 'sine',
      frequency: {
        value: 440,
        setValueAtTime: (val, t) => {
          osc.frequency.value = val;
          ctx.__calls.push({ action: 'frequency.setValueAtTime', value: val, time: t });
        }
      },
      connect: (dest) => {
        ctx.__calls.push({ action: 'oscillator.connect', dest });
        return osc;
      },
      disconnect: () => {
        ctx.__calls.push({ action: 'oscillator.disconnect' });
      },
      start: (t = 0) => {
        ctx.__calls.push({ action: 'oscillator.start', type: osc.type, freq: osc.frequency.value, time: t });
      },
      stop: (t = 0) => {
        ctx.__calls.push({ action: 'oscillator.stop', time: t });
      }
    };
    return osc;
  }

  createGain() {
    const ctx = this;
    const gain = {
      gain: {
        value: 1,
        setValueAtTime: (val, t) => {
          gain.gain.value = val;
          ctx.__calls.push({ action: 'gain.setValueAtTime', value: val, time: t });
        },
        exponentialRampToValueAtTime: (val, t) => {
          gain.gain.value = val;
          ctx.__calls.push({ action: 'gain.exponentialRampToValueAtTime', value: val, time: t });
        },
        linearRampToValueAtTime: (val, t) => {
          gain.gain.value = val;
          ctx.__calls.push({ action: 'gain.linearRampToValueAtTime', value: val, time: t });
        }
      },
      connect: (dest) => {
        ctx.__calls.push({ action: 'gain.connect', dest });
        return gain;
      },
      disconnect: () => {
        ctx.__calls.push({ action: 'gain.disconnect' });
      }
    };
    return gain;
  }

  close() {
    this.state = 'closed';
    this.__calls.push({ action: 'close' });
    return Promise.resolve();
  }

  resume() {
    this.state = 'running';
    this.__calls.push({ action: 'resume' });
    return Promise.resolve();
  }

  suspend() {
    this.state = 'suspended';
    this.__calls.push({ action: 'suspend' });
    return Promise.resolve();
  }
}

// ─── 11. Blob & URL Stubs ───────────────────────────────────────────────────

let _blobCounter = 0;
const _blobUrlMap = new Map();

const MockURL = {
  createObjectURL: (blob) => {
    const url = `blob:nock-dom-uuid-${++_blobCounter}`;
    _blobUrlMap.set(url, blob);
    return url;
  },
  revokeObjectURL: (url) => {
    _blobUrlMap.delete(url);
  }
};

// ─── 12. Environment Lifecycle & Management ─────────────────────────────────

const GLOBAL_KEYS = [
  'window', 'document', 'localStorage', 'sessionStorage',
  'navigator', 'location', 'AudioContext', 'webkitAudioContext',
  'Event', 'CustomEvent', 'MouseEvent', 'KeyboardEvent', 'DragEvent',
  'alert', 'confirm', 'prompt',
  'requestAnimationFrame', 'cancelAnimationFrame',
  'fetch', 'Blob', 'URL',
  'STUDENTS_DATA', 'CONTENT_DATA',
  'App', 'TypingTrainer', 'TeacherPanel', 'MouseTrainer'
];

let _originalDescriptors = null;
const _activeTimers = new Set();
const _activeIntervals = new Set();

function getProjectRoot() {
  return path.resolve(__dirname, '../..');
}

function readProjectIndexHtml() {
  const indexPath = path.join(getProjectRoot(), 'index.html');
  if (fs.existsSync(indexPath)) {
    return fs.readFileSync(indexPath, 'utf8');
  }
  return '<!DOCTYPE html><html><head></head><body></body></html>';
}

function attachGlobal(key, value) {
  Object.defineProperty(global, key, {
    value,
    writable: true,
    configurable: true,
    enumerable: true,
  });
}

function setupBrowserEnv(options = {}) {
  // Snapshot original global descriptors once
  if (!_originalDescriptors) {
    _originalDescriptors = new Map();
    for (const key of GLOBAL_KEYS) {
      const desc = Object.getOwnPropertyDescriptor(global, key);
      _originalDescriptors.set(key, desc);
    }
  }

  // Create isolated DOM
  const doc = new Document();
  const htmlContent = options.html !== undefined ? options.html : readProjectIndexHtml();
  const nodes = parseHTMLToNodes(htmlContent, doc);
  for (const n of nodes) {
    doc.appendChild(n);
  }

  doc.documentElement = doc.querySelector('html');
  doc.head = doc.querySelector('head');
  doc.body = doc.querySelector('body');

  // Create mocks
  const storage = createStorage();
  const sessionStore = createStorage();
  const audioCtx = new MockAudioContext();

  const mockNavigator = {
    onLine: options.online !== undefined ? Boolean(options.online) : true,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) HeadlessDOM/1.0',
  };

  const mockWindow = {
    document: doc,
    localStorage: storage,
    sessionStorage: sessionStore,
    navigator: mockNavigator,
    location: {
      href: 'http://localhost/index.html',
      origin: 'http://localhost',
      protocol: 'http:',
      pathname: '/index.html',
      reload: () => {},
    },
    AudioContext: MockAudioContext,
    webkitAudioContext: MockAudioContext,
    Event: MockEvent,
    CustomEvent: MockCustomEvent,
    MouseEvent: MockMouseEvent,
    KeyboardEvent: MockKeyboardEvent,
    DragEvent: MockDragEvent,
    Blob: global.Blob || class MockBlob { constructor(parts, opts = {}) { this.parts = parts; this.type = opts.type || ''; } },
    URL: MockURL,
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
    _eventListeners: {},
    addEventListener: (type, handler, options = {}) => {
      if (!mockWindow._eventListeners[type]) {
        mockWindow._eventListeners[type] = [];
      }
      mockWindow._eventListeners[type].push({ handler, options });
    },
    removeEventListener: (type, handler) => {
      if (!mockWindow._eventListeners[type]) return;
      mockWindow._eventListeners[type] = mockWindow._eventListeners[type].filter(l => l.handler !== handler);
    },
    dispatchEvent: (ev) => {
      if (!ev) return true;
      if (!ev.target) ev.target = mockWindow;
      ev.currentTarget = mockWindow;
      const listeners = (mockWindow._eventListeners && mockWindow._eventListeners[ev.type])
        ? [...mockWindow._eventListeners[ev.type]]
        : [];
      for (const item of listeners) {
        if (ev._propagationStopped) break;
        try {
          item.handler.call(mockWindow, ev);
        } catch (err) {
          console.error(`Error in window ${ev.type} listener:`, err);
        }
      }
      const inlineHandler = 'on' + ev.type.toLowerCase();
      if (typeof mockWindow[inlineHandler] === 'function' && !ev._propagationStopped) {
        try {
          mockWindow[inlineHandler].call(mockWindow, ev);
        } catch (err) {
          console.error(`Error in window inline ${inlineHandler}:`, err);
        }
      }
      return !ev.defaultPrevented;
    },
    __alertLog: [],
    __confirmLog: [],
    __promptLog: [],
    __confirmReturnValue: true,
    __fetchCalls: [],
    __fetchMockHandler: options.fetchMock || null,
  };

  mockWindow.window = mockWindow;
  doc.defaultView = mockWindow;

  // Fetch mock supporting F17 / F20
  mockWindow.fetch = (url, fetchOpts = {}) => {
    const callRecord = {
      url: String(url),
      options: fetchOpts,
      method: (fetchOpts.method || 'GET').toUpperCase(),
      body: fetchOpts.body || null,
      timestamp: Date.now(),
    };
    mockWindow.__fetchCalls.push(callRecord);

    if (!mockWindow.navigator.onLine) {
      return Promise.reject(new TypeError('Failed to fetch: Network is offline'));
    }

    if (typeof mockWindow.__fetchMockHandler === 'function') {
      return Promise.resolve(mockWindow.__fetchMockHandler(url, fetchOpts));
    }

    // Default successful JSON response
    return Promise.resolve({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: new Map([['content-type', 'application/json']]),
      json: async () => ({ status: 'ok', version: '1.0.1', timestamp: Date.now() }),
      text: async () => '{"status":"ok"}',
    });
  };

  // Attach globals via configurable defineProperty
  attachGlobal('window', mockWindow);
  attachGlobal('document', doc);
  attachGlobal('localStorage', storage);
  attachGlobal('sessionStorage', sessionStore);
  attachGlobal('navigator', mockNavigator);
  attachGlobal('location', mockWindow.location);
  attachGlobal('AudioContext', MockAudioContext);
  attachGlobal('webkitAudioContext', MockAudioContext);
  attachGlobal('Event', MockEvent);
  attachGlobal('CustomEvent', MockCustomEvent);
  attachGlobal('MouseEvent', MockMouseEvent);
  attachGlobal('KeyboardEvent', MockKeyboardEvent);
  attachGlobal('DragEvent', MockDragEvent);
  attachGlobal('alert', mockWindow.alert);
  attachGlobal('confirm', mockWindow.confirm);
  attachGlobal('prompt', mockWindow.prompt);
  attachGlobal('requestAnimationFrame', mockWindow.requestAnimationFrame);
  attachGlobal('cancelAnimationFrame', mockWindow.cancelAnimationFrame);
  attachGlobal('fetch', mockWindow.fetch);
  attachGlobal('URL', MockURL);

  function setOnline(online) {
    mockWindow.navigator.onLine = Boolean(online);
    global.navigator.onLine = Boolean(online);
    const eventType = online ? 'online' : 'offline';
    mockWindow.dispatchEvent(new MockEvent(eventType, { bubbles: true }));
    doc.dispatchEvent(new MockEvent(eventType, { bubbles: true }));
  }

  function setVisibilityState(state) {
    doc.visibilityState = state;
    doc.dispatchEvent(new MockEvent('visibilitychange', { bubbles: true }));
  }

  function setFocus(hasF) {
    doc._hasFocus = Boolean(hasF);
  }

  function setFetchMock(handler) {
    mockWindow.__fetchMockHandler = handler;
  }

  function loadScript(relativePath) {
    const fullPath = path.isAbsolute(relativePath) ? relativePath : path.join(getProjectRoot(), relativePath);
    const code = fs.readFileSync(fullPath, 'utf8');
    vm.runInThisContext(code, { filename: fullPath });
  }

  function loadAppStack() {
    const root = getProjectRoot();

    // 1. Data files
    const studentsPath = path.join(root, 'data/students.js');
    if (fs.existsSync(studentsPath)) {
      loadScript(studentsPath);
    }

    const contentPath = path.join(root, 'data/content.js');
    if (fs.existsSync(contentPath)) {
      loadScript(contentPath);
    }

    // 2. M4 Foundation modules (Gamification, AutoUpdate, Telemetry, FocusGuard)
    const gamificationPath = path.join(root, 'modules/gamification.js');
    if (fs.existsSync(gamificationPath)) {
      const g = require(gamificationPath);
      mockWindow.Gamification = g;
      global.Gamification = g;
    }

    const autoUpdatePath = path.join(root, 'modules/autoupdate.js');
    if (fs.existsSync(autoUpdatePath)) {
      const au = require(autoUpdatePath);
      mockWindow.AutoUpdate = au;
      global.AutoUpdate = au;
    }

    const telemetryPath = path.join(root, 'modules/telemetry.js');
    if (fs.existsSync(telemetryPath)) {
      const tel = require(telemetryPath);
      mockWindow.Telemetry = tel;
      global.Telemetry = tel;
    }

    const focusGuardPath = path.join(root, 'modules/focusguard.js');
    if (fs.existsSync(focusGuardPath)) {
      const fg = require(focusGuardPath);
      mockWindow.FocusGuard = fg;
      global.FocusGuard = fg;
    }

    // 3. Main app module
    const appPath = path.join(root, 'app.js');
    if (fs.existsSync(appPath)) {
      let appCode = fs.readFileSync(appPath, 'utf8');
      // Replace top-level const App with var App to allow re-execution across test runs
      appCode = appCode.replace(/\bconst App\s*=/, 'var App =');
      vm.runInThisContext(appCode + '\nif (typeof App !== "undefined") { global.App = App; window.App = App; }', { filename: appPath });
    }

    // 4. Sub-modules
    const typingPath = path.join(root, 'modules/typing.js');
    if (fs.existsSync(typingPath)) {
      loadScript(typingPath);
    }

    const teacherPath = path.join(root, 'modules/teacher.js');
    if (fs.existsSync(teacherPath)) {
      loadScript(teacherPath);
    }

    const mousePath = path.join(root, 'modules/mouse.js');
    if (fs.existsSync(mousePath)) {
      loadScript(mousePath);
    }

    // 5. Dispatch DOMContentLoaded to trigger App.init()
    doc.dispatchEvent(new MockEvent('DOMContentLoaded'));
  }

  // ─── Simulation Helpers ──────────────────────────────────────────────────

  function resolveTarget(targetOrSelector) {
    if (typeof targetOrSelector === 'string') {
      const found = doc.querySelector(targetOrSelector);
      if (!found) {
        throw new Error(`Target element not found for selector: "${targetOrSelector}"`);
      }
      return found;
    }
    return targetOrSelector;
  }

  function dispatchClick(targetOrSelector, options = {}) {
    const target = resolveTarget(targetOrSelector);
    const ev = new MockMouseEvent('click', { bubbles: true, cancelable: true, ...options });
    target.dispatchEvent(ev);
    return ev;
  }

  function dispatchDblClick(targetOrSelector, options = {}) {
    const target = resolveTarget(targetOrSelector);
    const ev = new MockMouseEvent('dblclick', { bubbles: true, cancelable: true, ...options });
    target.dispatchEvent(ev);
    return ev;
  }

  function dispatchContextMenu(targetOrSelector, options = {}) {
    const target = resolveTarget(targetOrSelector);
    const ev = new MockMouseEvent('contextmenu', { button: 2, bubbles: true, cancelable: true, ...options });
    target.dispatchEvent(ev);
    return ev;
  }

  function dispatchKey(targetOrSelector, key, options = {}) {
    const target = resolveTarget(targetOrSelector);
    const ev = new MockKeyboardEvent('keydown', { key, code: options.code || key, bubbles: true, cancelable: true, ...options });
    target.dispatchEvent(ev);
    return ev;
  }

  function dispatchInput(targetOrSelector, value) {
    const target = resolveTarget(targetOrSelector);
    target.value = value;
    const ev = new MockEvent('input', { bubbles: true, cancelable: false });
    target.dispatchEvent(ev);
    return ev;
  }

  function dispatchDragDrop(sourceOrSelector, destOrSelector, data = {}) {
    const source = resolveTarget(sourceOrSelector);
    const dest = resolveTarget(destOrSelector);
    const dt = new MockDataTransfer();

    for (const [k, v] of Object.entries(data)) {
      dt.setData(k, v);
    }

    const dragStartEv = new MockDragEvent('dragstart', { bubbles: true, cancelable: true, dataTransfer: dt });
    source.dispatchEvent(dragStartEv);

    const dragOverEv = new MockDragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt });
    dest.dispatchEvent(dragOverEv);

    const dropEv = new MockDragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt });
    dest.dispatchEvent(dropEv);

    const dragEndEv = new MockDragEvent('dragend', { bubbles: true, cancelable: true, dataTransfer: dt });
    source.dispatchEvent(dragEndEv);

    return { dragStartEv, dragOverEv, dropEv, dragEndEv };
  }

  const envInstance = {
    window: mockWindow,
    document: doc,
    localStorage: storage,
    sessionStorage: sessionStore,
    navigator: mockNavigator,
    audioContext: audioCtx,
    setOnline,
    setVisibilityState,
    setFocus,
    setFetchMock,
    loadScript,
    loadAppStack,
    dispatchClick,
    dispatchDblClick,
    dispatchContextMenu,
    dispatchKey,
    dispatchInput,
    dispatchDragDrop,
    teardown: () => teardownBrowserEnv(),
  };

  return envInstance;
}

function teardownBrowserEnv() {
  // Clear all pending timers and intervals
  for (const id of _activeTimers) clearTimeout(id);
  _activeTimers.clear();
  for (const id of _activeIntervals) clearInterval(id);
  _activeIntervals.clear();

  // Restore globals
  if (_originalDescriptors) {
    for (const [key, desc] of _originalDescriptors) {
      if (desc !== undefined) {
        try {
          Object.defineProperty(global, key, desc);
        } catch {
          global[key] = desc.value;
        }
      } else {
        try {
          delete global[key];
        } catch {
          global[key] = undefined;
        }
      }
    }
  }
}

// ─── Module Exports ─────────────────────────────────────────────────────────

module.exports = {
  // Primary lifecycle
  setupBrowserEnv,
  teardownBrowserEnv,

  // Aliases for convenience
  createTestEnv: setupBrowserEnv,
  setupDom: setupBrowserEnv,
  teardownTestEnv: teardownBrowserEnv,
  teardownDom: teardownBrowserEnv,

  // Classes for direct access
  Node,
  Element,
  Document,
  TextNode,
  CommentNode,
  DOMTokenList,
  MockEvent,
  MockCustomEvent,
  MockMouseEvent,
  MockKeyboardEvent,
  MockDragEvent,
  MockDataTransfer,
  MockAudioContext,
};
