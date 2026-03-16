/* ============================================================
   Sanitizer — Frontend XSS sanitization utility
   ============================================================ */

const Sanitizer = {

  // Tags that are always removed (along with their content)
  _dangerousTags: new Set([
    'script', 'iframe', 'object', 'embed', 'form', 'input', 'textarea',
    'style', 'link', 'base', 'meta', 'applet', 'math', 'layer',
    'xmp', 'xml', 'noscript', 'template', 'frameset', 'frame'
  ]),

  // Attribute prefixes that indicate event handlers
  _eventAttrPattern: /^on/i,

  // Protocols allowed in href / src / action attributes
  _safeProtocols: new Set(['http:', 'https:', 'mailto:', 'tel:']),

  // Attributes that can carry URLs
  _urlAttrs: new Set(['href', 'src', 'action', 'formaction', 'poster', 'cite', 'background']),

  /* ----------------------------------------------------------
     html(untrusted) — DOMParser-based HTML sanitization
     ---------------------------------------------------------- */
  html(untrusted) {
    if (untrusted == null) return '';
    const raw = String(untrusted);
    if (!raw) return '';

    const doc = new DOMParser().parseFromString(raw, 'text/html');
    this._walkNode(doc.body);
    return doc.body.innerHTML;
  },

  /* Recursively walk and sanitize DOM nodes */
  _walkNode(parent) {
    const toRemove = [];

    for (const node of Array.from(parent.childNodes)) {
      if (node.nodeType !== Node.ELEMENT_NODE) continue;

      const tag = node.tagName.toLowerCase();

      // Remove dangerous tags entirely
      if (this._dangerousTags.has(tag)) {
        toRemove.push(node);
        continue;
      }

      // SVG elements with event handlers — remove the whole SVG
      if (tag === 'svg' && this._hasEventAttrs(node)) {
        toRemove.push(node);
        continue;
      }

      // Scrub attributes on surviving elements
      this._sanitizeAttrs(node);

      // Recurse into children
      if (node.childNodes.length) {
        this._walkNode(node);
      }
    }

    toRemove.forEach(n => parent.removeChild(n));
  },

  /* Remove dangerous attributes from a single element */
  _sanitizeAttrs(el) {
    const toRemove = [];

    for (const attr of Array.from(el.attributes)) {
      const name = attr.name.toLowerCase();

      // Event handlers (onclick, onerror, onload, …)
      if (this._eventAttrPattern.test(name)) {
        toRemove.push(attr.name);
        continue;
      }

      // style attribute — can contain expression() / url()
      if (name === 'style') {
        toRemove.push(attr.name);
        continue;
      }

      // URL attributes — block javascript: and data: schemes
      if (this._urlAttrs.has(name)) {
        if (!this._isSafeUrl(attr.value)) {
          toRemove.push(attr.name);
        }
      }
    }

    toRemove.forEach(n => el.removeAttribute(n));
  },

  /* Check whether an element carries any on* attributes */
  _hasEventAttrs(el) {
    for (const attr of Array.from(el.attributes)) {
      if (this._eventAttrPattern.test(attr.name)) return true;
    }
    return false;
  },

  /* Validate a URL string against the safe-protocol allowlist */
  _isSafeUrl(raw) {
    try {
      const url = new URL(raw, 'https://placeholder.invalid');
      return this._safeProtocols.has(url.protocol);
    } catch {
      return false;
    }
  },

  /* ----------------------------------------------------------
     text(untrusted) — Escape all HTML entities
     ---------------------------------------------------------- */
  text(untrusted) {
    if (untrusted == null) return '';
    return String(untrusted)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  },

  /* ----------------------------------------------------------
     attr(untrusted) — Escape for safe use inside HTML attributes
     ---------------------------------------------------------- */
  attr(untrusted) {
    // Same entity escaping as text — safe for quoted attribute values
    return this.text(untrusted);
  },

  /* ----------------------------------------------------------
     url(untrusted) — Validate and return safe URLs only
     ---------------------------------------------------------- */
  url(untrusted) {
    if (untrusted == null) return '';
    const raw = String(untrusted).trim();
    if (!raw) return '';

    try {
      const parsed = new URL(raw);
      if (this._safeProtocols.has(parsed.protocol)) return parsed.href;
    } catch { /* fall through */ }

    // Try as relative URL — resolve against https placeholder
    try {
      const parsed = new URL(raw, 'https://placeholder.invalid');
      if (this._safeProtocols.has(parsed.protocol)) return raw;
    } catch { /* fall through */ }

    return '';
  },

  /* ----------------------------------------------------------
     interpolate(template, values) — Safe template interpolation
     Values are HTML-escaped before insertion.
     Placeholders use {{key}} syntax.
     ---------------------------------------------------------- */
  interpolate(template, values) {
    if (!template) return '';
    if (!values || typeof values !== 'object') return template;

    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return Object.prototype.hasOwnProperty.call(values, key)
        ? this.text(values[key])
        : match;
    });
  },

  /* ----------------------------------------------------------
     setInnerHTML(element, html) — Sanitize then assign innerHTML
     ---------------------------------------------------------- */
  setInnerHTML(element, html) {
    if (!element) return;
    element.innerHTML = this.html(html);
  }
};
