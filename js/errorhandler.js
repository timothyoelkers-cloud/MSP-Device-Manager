/* ============================================================
   Error Handler — Global error boundary & diagnostics panel
   ============================================================ */

const ErrorHandler = {
  _errors: [],
  _maxMemory: 50,
  _maxStorage: 200,
  _toastTimestamps: [],
  _toastRateLimit: 3,
  _toastRateWindow: 10000, // 10 seconds
  _originalConsoleError: null,
  _panelOpen: false,
  _initialized: false,

  /* ----------------------------------------------------------
     init() — Register global error handlers
     ---------------------------------------------------------- */
  init() {
    if (this._initialized) return;
    this._initialized = true;

    // Load persisted errors
    this._loadFromStorage();

    // 1. window.onerror — uncaught synchronous errors
    window.onerror = (message, source, lineno, colno, error) => {
      this._captureError({
        message: typeof message === 'string' ? message : String(message),
        stack: error && error.stack ? error.stack : `${source}:${lineno}:${colno}`,
        severity: 'error',
        source: 'uncaught'
      });
      // Prevent default browser error logging
      return true;
    };

    // 2. window.onunhandledrejection — unhandled promise rejections
    window.onunhandledrejection = (event) => {
      const reason = event.reason;
      let message = 'Unhandled Promise Rejection';
      let stack = '';

      if (reason instanceof Error) {
        message = reason.message || message;
        stack = reason.stack || '';
      } else if (typeof reason === 'string') {
        message = reason;
      } else if (reason) {
        try { message = JSON.stringify(reason); } catch (e) { message = String(reason); }
      }

      this._captureError({
        message,
        stack,
        severity: 'error',
        source: 'unhandledrejection'
      });

      event.preventDefault();
    };

    // 3. Wrap console.error to also capture logged errors
    this._originalConsoleError = console.error.bind(console);
    console.error = (...args) => {
      // Call original first
      this._originalConsoleError(...args);

      // Build message from args
      const message = args.map(a => {
        if (a instanceof Error) return a.message;
        if (typeof a === 'string') return a;
        try { return JSON.stringify(a); } catch (e) { return String(a); }
      }).join(' ');

      const stack = args.find(a => a instanceof Error)?.stack || '';

      this._captureError({
        message,
        stack,
        severity: 'warning',
        source: 'console.error'
      });
    };
  },

  /* ----------------------------------------------------------
     _captureError(opts) — Central error intake
     ---------------------------------------------------------- */
  _captureError({ message, stack, severity, source }) {
    const entry = {
      id: Date.now() + '-' + Math.random().toString(36).slice(2, 8),
      timestamp: new Date().toISOString(),
      message: message || 'Unknown error',
      stack: stack || '',
      page: (typeof AppState !== 'undefined' && AppState.get)
        ? AppState.get('currentPage') || window.location.hash
        : window.location.hash,
      severity: severity || 'error',
      source: source || 'unknown'
    };

    // Add to in-memory store (cap at _maxMemory)
    this._errors.unshift(entry);
    if (this._errors.length > this._maxMemory) {
      this._errors = this._errors.slice(0, this._maxMemory);
    }

    // Persist to localStorage (cap at _maxStorage)
    this._saveToStorage(entry);

    // Log to AuditLog if available
    if (typeof AuditLog !== 'undefined' && AuditLog.log) {
      try {
        AuditLog.log('error_captured', `[${severity}] ${message}`, null, 'error');
      } catch (e) { /* prevent recursion */ }
    }

    // Show rate-limited toast
    this._showErrorToast(entry);

    // Update badge if panel is rendered
    this._updateBadge();
  },

  /* ----------------------------------------------------------
     Rate-limited toast notifications
     ---------------------------------------------------------- */
  _showErrorToast(entry) {
    const now = Date.now();

    // Prune old timestamps outside the rate window
    this._toastTimestamps = this._toastTimestamps.filter(
      t => now - t < this._toastRateWindow
    );

    // Check rate limit
    if (this._toastTimestamps.length >= this._toastRateLimit) return;
    this._toastTimestamps.push(now);

    if (typeof Toast !== 'undefined' && Toast.show) {
      const viewLink = '<a href="javascript:void(0)" onclick="ErrorHandler.showErrorPanel()" style="color:var(--primary);text-decoration:underline;margin-left:4px;">View Details</a>';
      Toast.show(
        `Something went wrong.${viewLink}`,
        'error',
        null,
        6000
      );
    }
  },

  /* ----------------------------------------------------------
     Storage helpers
     ---------------------------------------------------------- */
  _loadFromStorage() {
    try {
      const raw = localStorage.getItem('error_log');
      if (raw) {
        const stored = JSON.parse(raw);
        if (Array.isArray(stored)) {
          // Merge stored into memory (memory takes priority for recent)
          this._errors = stored.slice(0, this._maxMemory);
        }
      }
    } catch (e) { /* corrupted storage — ignore */ }
  },

  _saveToStorage(entry) {
    try {
      let stored = [];
      const raw = localStorage.getItem('error_log');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) stored = parsed;
      }
      stored.unshift(entry);
      if (stored.length > this._maxStorage) {
        stored = stored.slice(0, this._maxStorage);
      }
      localStorage.setItem('error_log', JSON.stringify(stored));
    } catch (e) { /* storage full or unavailable */ }
  },

  /* ----------------------------------------------------------
     getErrorCount() — Count since last clear
     ---------------------------------------------------------- */
  getErrorCount() {
    return this._errors.length;
  },

  /* ----------------------------------------------------------
     clearErrors() — Wipe error log
     ---------------------------------------------------------- */
  clearErrors() {
    this._errors = [];
    try { localStorage.removeItem('error_log'); } catch (e) {}
    this._updateBadge();

    if (this._panelOpen) this.showErrorPanel();

    if (typeof Toast !== 'undefined' && Toast.show) {
      Toast.show('Error log cleared', 'success');
    }
  },

  /* ----------------------------------------------------------
     renderErrorBadge() — Small badge HTML for topbar
     ---------------------------------------------------------- */
  renderErrorBadge() {
    const count = this.getErrorCount();
    if (count === 0) return '';
    const display = count > 99 ? '99+' : count;
    return `<span id="errorBadge" class="error-handler-badge" onclick="ErrorHandler.showErrorPanel()" title="${count} error(s)">${display}</span>`;
  },

  /* ----------------------------------------------------------
     _updateBadge() — Refresh the badge in the DOM if present
     ---------------------------------------------------------- */
  _updateBadge() {
    const existing = document.getElementById('errorBadge');
    if (existing) {
      const count = this.getErrorCount();
      if (count === 0) {
        existing.remove();
      } else {
        existing.textContent = count > 99 ? '99+' : count;
      }
    }
  },

  /* ----------------------------------------------------------
     wrapAsync(fn) — Returns wrapped async function with error reporting
     ---------------------------------------------------------- */
  wrapAsync(fn) {
    const self = this;
    return async function (...args) {
      try {
        return await fn.apply(this, args);
      } catch (error) {
        self._captureError({
          message: error.message || String(error),
          stack: error.stack || '',
          severity: 'error',
          source: 'wrapAsync'
        });
        throw error; // Re-throw so callers can still catch if needed
      }
    };
  },

  /* ----------------------------------------------------------
     showFallback(container, error) — Friendly fallback for failed page renders
     ---------------------------------------------------------- */
  showFallback(container, error) {
    const target = typeof container === 'string'
      ? document.getElementById(container)
      : container;

    if (!target) return;

    const errorMsg = error instanceof Error ? error.message : String(error || 'Unknown error');
    const errorStack = error instanceof Error ? (error.stack || '') : '';

    target.innerHTML = `
      <div class="error-fallback">
        <div class="error-fallback-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
        <h2 class="error-fallback-title">This page encountered an error</h2>
        <p class="error-fallback-message">Something unexpected happened while loading this page. You can try again or navigate to the dashboard.</p>
        <div class="error-fallback-actions">
          <button class="btn btn-primary" onclick="location.reload()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>
            Retry
          </button>
          <button class="btn btn-secondary" onclick="typeof Router !== 'undefined' ? Router.navigate('dashboard') : (location.hash = '#/dashboard')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            Go to Dashboard
          </button>
        </div>
        <details class="error-fallback-details">
          <summary>Error details</summary>
          <div class="error-fallback-detail-content">
            <strong>Message:</strong> ${this._escapeHtml(errorMsg)}<br>
            ${errorStack ? `<strong>Stack:</strong><pre>${this._escapeHtml(errorStack)}</pre>` : ''}
          </div>
        </details>
      </div>
    `;

    // Also capture the error
    this._captureError({
      message: errorMsg,
      stack: errorStack,
      severity: 'error',
      source: 'page_render'
    });
  },

  /* ----------------------------------------------------------
     showErrorPanel() — Slide-in diagnostics panel
     ---------------------------------------------------------- */
  showErrorPanel() {
    // Remove existing panel if open
    const existing = document.getElementById('errorHandlerPanel');
    if (existing) existing.remove();

    this._panelOpen = true;

    // Get all errors (combine memory + storage for full view)
    let allErrors = [];
    try {
      const raw = localStorage.getItem('error_log');
      if (raw) allErrors = JSON.parse(raw);
    } catch (e) {}
    if (!Array.isArray(allErrors) || allErrors.length === 0) {
      allErrors = [...this._errors];
    }

    const severityBadge = (sev) => {
      const colors = {
        error: { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' },
        warning: { bg: '#fffbeb', color: '#d97706', border: '#fde68a' },
        info: { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' }
      };
      const c = colors[sev] || colors.info;
      return `<span style="display:inline-block;font-size:11px;font-weight:600;padding:2px 8px;border-radius:9999px;background:${c.bg};color:${c.color};border:1px solid ${c.border};text-transform:uppercase;letter-spacing:0.3px;">${sev}</span>`;
    };

    const errorRows = allErrors.length === 0
      ? '<div style="padding:40px 20px;text-align:center;color:var(--ink-muted);"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom:8px;opacity:0.4;"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg><p style="margin:0;font-size:14px;">No errors recorded</p></div>'
      : allErrors.map((e, i) => `
        <div class="error-panel-entry" style="padding:12px 16px;border-bottom:1px solid var(--border);${i === 0 ? 'background:var(--gray-50);' : ''}">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
            ${severityBadge(e.severity || 'error')}
            <span style="font-size:11px;color:var(--ink-muted);font-family:monospace;">${this._formatTimestamp(e.timestamp)}</span>
            <span style="font-size:11px;color:var(--ink-muted);margin-left:auto;background:var(--gray-50);padding:1px 6px;border-radius:4px;">${this._escapeHtml(e.page || '—')}</span>
          </div>
          <div style="font-size:13px;font-weight:500;color:var(--ink);margin-bottom:4px;word-break:break-word;">${this._escapeHtml(e.message || 'Unknown error')}</div>
          ${e.stack ? `
            <details style="margin-top:4px;">
              <summary style="font-size:11px;color:var(--ink-muted);cursor:pointer;user-select:none;">Stack trace</summary>
              <pre style="font-size:11px;color:var(--ink-muted);margin:6px 0 0;padding:8px;background:var(--gray-50);border-radius:6px;overflow-x:auto;white-space:pre-wrap;word-break:break-all;max-height:150px;overflow-y:auto;">${this._escapeHtml(e.stack)}</pre>
            </details>
          ` : ''}
        </div>
      `).join('');

    // Build overlay + panel
    const overlay = document.createElement('div');
    overlay.id = 'errorHandlerOverlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.25);z-index:99998;opacity:0;transition:opacity 0.2s;';
    overlay.onclick = () => this.closeErrorPanel();

    const panel = document.createElement('div');
    panel.id = 'errorHandlerPanel';
    panel.style.cssText = `
      position:fixed;top:0;right:0;bottom:0;width:480px;max-width:100vw;
      background:var(--surface, #fff);z-index:99999;
      box-shadow:var(--shadow-xl, -8px 0 30px rgba(0,0,0,0.12));
      display:flex;flex-direction:column;
      transform:translateX(100%);transition:transform 0.25s cubic-bezier(0.4,0,0.2,1);
    `;

    panel.innerHTML = `
      <!-- Header -->
      <div style="display:flex;align-items:center;gap:10px;padding:16px 20px;border-bottom:1px solid var(--border);flex-shrink:0;">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--danger, #dc2626)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        <h3 style="margin:0;font-size:16px;font-weight:600;color:var(--ink);">Error Log</h3>
        <span style="font-size:12px;font-weight:600;padding:2px 8px;border-radius:9999px;background:#fef2f2;color:#dc2626;border:1px solid #fecaca;">${allErrors.length}</span>
        <div style="margin-left:auto;display:flex;gap:6px;">
          <button onclick="ErrorHandler._copyErrorLog()" style="display:inline-flex;align-items:center;gap:4px;padding:6px 12px;font-size:12px;font-weight:500;border:1px solid var(--border);border-radius:var(--radius-md, 8px);background:var(--surface, #fff);color:var(--ink);cursor:pointer;transition:all 0.15s;" onmouseover="this.style.background='var(--gray-50)'" onmouseout="this.style.background='var(--surface, #fff)'">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
            Copy Log
          </button>
          <button onclick="ErrorHandler.clearErrors()" style="display:inline-flex;align-items:center;gap:4px;padding:6px 12px;font-size:12px;font-weight:500;border:1px solid #fecaca;border-radius:var(--radius-md, 8px);background:#fef2f2;color:#dc2626;cursor:pointer;transition:all 0.15s;" onmouseover="this.style.background='#fee2e2'" onmouseout="this.style.background='#fef2f2'">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
            Clear All
          </button>
          <button onclick="ErrorHandler.closeErrorPanel()" style="display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;border:1px solid var(--border);border-radius:var(--radius-md, 8px);background:var(--surface, #fff);color:var(--ink);cursor:pointer;transition:all 0.15s;" onmouseover="this.style.background='var(--gray-50)'" onmouseout="this.style.background='var(--surface, #fff)'" title="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </div>

      <!-- Error list -->
      <div style="flex:1;overflow-y:auto;">
        ${errorRows}
      </div>

      <!-- Footer -->
      <div style="padding:10px 20px;border-top:1px solid var(--border);font-size:11px;color:var(--ink-muted);text-align:center;flex-shrink:0;">
        Showing ${allErrors.length} error${allErrors.length !== 1 ? 's' : ''} &middot; In-memory: ${this._errors.length}/${this._maxMemory} &middot; Storage: max ${this._maxStorage}
      </div>
    `;

    document.body.appendChild(overlay);
    document.body.appendChild(panel);

    // Animate in
    requestAnimationFrame(() => {
      overlay.style.opacity = '1';
      panel.style.transform = 'translateX(0)';
    });

    // Close on Escape
    this._panelEscHandler = (e) => {
      if (e.key === 'Escape') this.closeErrorPanel();
    };
    document.addEventListener('keydown', this._panelEscHandler);
  },

  /* ----------------------------------------------------------
     closeErrorPanel()
     ---------------------------------------------------------- */
  closeErrorPanel() {
    this._panelOpen = false;
    const panel = document.getElementById('errorHandlerPanel');
    const overlay = document.getElementById('errorHandlerOverlay');

    if (panel) {
      panel.style.transform = 'translateX(100%)';
      setTimeout(() => panel.remove(), 260);
    }
    if (overlay) {
      overlay.style.opacity = '0';
      setTimeout(() => overlay.remove(), 260);
    }
    if (this._panelEscHandler) {
      document.removeEventListener('keydown', this._panelEscHandler);
      this._panelEscHandler = null;
    }
  },

  /* ----------------------------------------------------------
     _copyErrorLog() — Copy JSON error log to clipboard
     ---------------------------------------------------------- */
  _copyErrorLog() {
    let allErrors = [];
    try {
      const raw = localStorage.getItem('error_log');
      if (raw) allErrors = JSON.parse(raw);
    } catch (e) {}
    if (!Array.isArray(allErrors) || allErrors.length === 0) {
      allErrors = [...this._errors];
    }

    const json = JSON.stringify(allErrors, null, 2);

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(json).then(() => {
        if (typeof Toast !== 'undefined' && Toast.show) {
          Toast.show('Error log copied to clipboard', 'success');
        }
      }).catch(() => {
        this._fallbackCopy(json);
      });
    } else {
      this._fallbackCopy(json);
    }
  },

  _fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;opacity:0;';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      if (typeof Toast !== 'undefined' && Toast.show) {
        Toast.show('Error log copied to clipboard', 'success');
      }
    } catch (e) {
      if (typeof Toast !== 'undefined' && Toast.show) {
        Toast.show('Failed to copy error log', 'error');
      }
    }
    document.body.removeChild(ta);
  },

  /* ----------------------------------------------------------
     Utility helpers
     ---------------------------------------------------------- */
  _escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
  },

  _formatTimestamp(iso) {
    if (!iso) return '—';
    try {
      const d = new Date(iso);
      const pad = (n) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    } catch (e) {
      return iso;
    }
  }
};
