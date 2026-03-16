/* ============================================================
   ShortcutsHelp — Keyboard Shortcuts Help Panel
   Categorised modal overlay showing all available hotkeys
   ============================================================ */

const ShortcutsHelp = {
  _visible: false,
  _chordKey: null,
  _chordTimer: null,

  /* ---- Shortcut definitions grouped by category ---- */
  _categories: [
    {
      title: 'Navigation',
      shortcuts: [
        { keys: ['Ctrl', 'K'],           alt: ['/',],  desc: 'Global Search' },
        { keys: ['G', 'D'],              chord: true,  desc: 'Go to Dashboard' },
        { keys: ['G', 'V'],              chord: true,  desc: 'Go to Devices' },
        { keys: ['G', 'U'],              chord: true,  desc: 'Go to Users' },
        { keys: ['G', 'R'],              chord: true,  desc: 'Go to Reports' },
        { keys: ['G', 'S'],              chord: true,  desc: 'Go to Settings' },
      ]
    },
    {
      title: 'Actions',
      shortcuts: [
        { keys: ['Ctrl', 'Shift', 'N'],  desc: 'New device sync' },
        { keys: ['Ctrl', 'Shift', 'E'],  desc: 'Export current view' },
        { keys: ['Ctrl', 'Shift', 'R'],  desc: 'Refresh data' },
        { keys: ['Ctrl', 'Shift', 'P'],  desc: 'Command palette' },
      ]
    },
    {
      title: 'Views',
      shortcuts: [
        { keys: ['Ctrl', '1'],           desc: 'Switch to 1st sidebar item' },
        { keys: ['Ctrl', '2'],           desc: 'Switch to 2nd sidebar item' },
        { keys: ['Ctrl', '3'],           desc: 'Switch to 3rd sidebar item' },
        { keys: ['Ctrl', '4'],           desc: 'Switch to 4th sidebar item' },
        { keys: ['Ctrl', '5'],           desc: 'Switch to 5th sidebar item' },
        { keys: ['Escape'],              desc: 'Close modal / panel' },
        { keys: ['?'],                   desc: 'This help panel' },
      ]
    },
    {
      title: 'Device Actions',
      shortcuts: [
        { keys: ['S'],                   desc: 'Sync selected device' },
        { keys: ['W'],                   desc: 'Wipe selected device' },
        { keys: ['R'],                   desc: 'Restart selected device' },
        { keys: ['D'],                   desc: 'Delete / Retire selected device' },
      ]
    }
  ],

  /* ---- Sidebar page order for Ctrl+1..5 ---- */
  _sidebarPages: ['dashboard', 'devices', 'users', 'reports', 'settings'],

  /* ---- Navigation chord targets ---- */
  _navChords: {
    d: 'dashboard',
    v: 'devices',
    u: 'users',
    r: 'reports',
    s: 'settings',
  },

  /* ============================================================
     init() — Register the ? key toggle and all shortcut handlers
     ============================================================ */
  init() {
    window.addEventListener('keydown', (e) => this._handleKey(e));
  },

  /* ---- Detect whether user is focused on a form field ---- */
  _isInput(e) {
    const tag = (e.target.tagName || '').toLowerCase();
    return tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable;
  },

  /* ============================================================
     Key handler — dispatches all registered shortcuts
     ============================================================ */
  _handleKey(e) {
    const key = e.key;

    /* --- Ctrl / Meta combos (work even in input fields) --- */

    // Ctrl+K  or  /  — Global search
    if ((e.ctrlKey || e.metaKey) && key === 'k') {
      e.preventDefault();
      this._focusGlobalSearch();
      return;
    }

    // Ctrl+Shift combos
    if ((e.ctrlKey || e.metaKey) && e.shiftKey) {
      switch (key) {
        case 'N':
          e.preventDefault();
          this._triggerSync();
          return;
        case 'E':
          e.preventDefault();
          this._triggerExport();
          return;
        case 'R':
          e.preventDefault();
          this._triggerRefresh();
          return;
        case 'P':
          e.preventDefault();
          this._triggerCommandPalette();
          return;
      }
    }

    // Ctrl+1..5 — sidebar items
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey) {
      const num = parseInt(key, 10);
      if (num >= 1 && num <= 5) {
        e.preventDefault();
        const page = this._sidebarPages[num - 1];
        if (page && typeof Router !== 'undefined') Router.navigate(page);
        return;
      }
    }

    /* --- Everything below is ignored when typing in fields --- */
    if (this._isInput(e)) return;

    /* --- Two-key G-chord handling --- */
    if (this._chordKey === 'g') {
      clearTimeout(this._chordTimer);
      this._chordKey = null;
      const lk = key.toLowerCase();
      if (this._navChords[lk]) {
        e.preventDefault();
        if (typeof Router !== 'undefined') Router.navigate(this._navChords[lk]);
      }
      return;
    }

    /* --- Single-key shortcuts (no modifiers) --- */
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    switch (key) {
      case '?':
        e.preventDefault();
        this.toggle();
        break;
      case '/':
        e.preventDefault();
        this._focusGlobalSearch();
        break;
      case 'g':
        this._chordKey = 'g';
        this._chordTimer = setTimeout(() => { this._chordKey = null; }, 1000);
        break;
      case 'Escape':
        this._closeAny();
        break;

      /* Device-context shortcuts */
      case 's':
        this._deviceAction('sync');
        break;
      case 'w':
        this._deviceAction('wipe');
        break;
      case 'r':
        this._deviceAction('restart');
        break;
      case 'd':
        this._deviceAction('retire');
        break;
    }
  },

  /* ============================================================
     show() / hide() / toggle()
     ============================================================ */
  show() {
    if (this._visible) return;
    this._visible = true;
    this._renderModal();
  },

  hide() {
    if (!this._visible) return;
    this._visible = false;
    const el = document.getElementById('shortcutsHelpPanel');
    if (el) el.remove();
  },

  toggle() {
    this._visible ? this.hide() : this.show();
  },

  /* ============================================================
     Render the modal overlay
     ============================================================ */
  _renderModal() {
    // Remove stale instance
    const old = document.getElementById('shortcutsHelpPanel');
    if (old) old.remove();

    const backdrop = document.createElement('div');
    backdrop.id = 'shortcutsHelpPanel';
    backdrop.style.cssText = [
      'position:fixed', 'inset:0', 'z-index:10000',
      'display:flex', 'align-items:center', 'justify-content:center',
      'background:rgba(0,0,0,0.45)', 'backdrop-filter:blur(4px)',
      'animation:shFadeIn .15s ease'
    ].join(';');

    backdrop.innerHTML = `
      <style>
        @keyframes shFadeIn  { from { opacity:0 } to { opacity:1 } }
        @keyframes shSlideUp { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:translateY(0) } }

        .sh-card {
          background: var(--surface, #fff);
          border: 1px solid var(--border, #e2e8f0);
          border-radius: var(--radius-md, 12px);
          box-shadow: var(--shadow-xl, 0 20px 60px rgba(0,0,0,.18));
          max-width: 700px;
          width: 92vw;
          max-height: 82vh;
          display: flex;
          flex-direction: column;
          animation: shSlideUp .2s ease;
          overflow: hidden;
        }

        .sh-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 18px 24px 14px;
          border-bottom: 1px solid var(--border, #e2e8f0);
        }
        .sh-header h2 {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
          color: var(--ink, #1e293b);
        }
        .sh-close {
          background: none;
          border: none;
          cursor: pointer;
          padding: 4px;
          border-radius: 6px;
          color: var(--ink-muted, #94a3b8);
          transition: background .15s, color .15s;
        }
        .sh-close:hover {
          background: var(--gray-100, #f3f4f6);
          color: var(--ink, #1e293b);
        }

        .sh-body {
          overflow-y: auto;
          padding: 16px 24px 24px;
        }

        .sh-category {
          margin-bottom: 20px;
        }
        .sh-category:last-child { margin-bottom: 0; }

        .sh-cat-title {
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: var(--ink-muted, #94a3b8);
          margin: 0 0 10px;
        }

        .sh-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 6px 24px;
        }
        @media (max-width: 560px) {
          .sh-grid { grid-template-columns: 1fr; }
        }

        .sh-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 6px 0;
        }

        .sh-desc {
          font-size: 13px;
          color: var(--ink, #1e293b);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin-right: 12px;
        }

        .sh-keys {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          flex-shrink: 0;
        }

        .sh-kbd {
          display: inline-block;
          padding: 2px 7px;
          min-width: 22px;
          text-align: center;
          font-family: 'JetBrains Mono', ui-monospace, monospace;
          font-size: 11px;
          font-weight: 500;
          line-height: 18px;
          color: var(--ink, #1e293b);
          background: var(--gray-50, #f9fafb);
          border: 1px solid var(--border, #e2e8f0);
          border-radius: 5px;
          box-shadow: 0 1px 0 var(--border, #e2e8f0);
        }

        .sh-separator {
          font-size: 10px;
          color: var(--ink-muted, #94a3b8);
          padding: 0 1px;
        }

        .sh-footer {
          padding: 10px 24px 14px;
          border-top: 1px solid var(--border, #e2e8f0);
          text-align: center;
          font-size: 11px;
          color: var(--ink-muted, #94a3b8);
        }
        .sh-footer kbd {
          display: inline-block;
          padding: 1px 6px;
          font-family: 'JetBrains Mono', ui-monospace, monospace;
          font-size: 10px;
          background: var(--gray-50, #f9fafb);
          border: 1px solid var(--border, #e2e8f0);
          border-radius: 4px;
          margin: 0 2px;
        }
      </style>

      <div class="sh-card">
        <div class="sh-header">
          <h2>Keyboard Shortcuts</h2>
          <button class="sh-close" aria-label="Close" id="shCloseBtn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div class="sh-body">
          ${this._renderCategories()}
        </div>
        <div class="sh-footer">
          Press <kbd>?</kbd> or <kbd>Esc</kbd> to close
        </div>
      </div>
    `;

    // Events
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) this.hide();
    });
    backdrop.querySelector('#shCloseBtn').addEventListener('click', () => this.hide());

    document.body.appendChild(backdrop);
  },

  /* ---- Build HTML for all categories ---- */
  _renderCategories() {
    return this._categories.map(cat => {
      const rows = cat.shortcuts.map(s => {
        const keysHtml = this._renderKeys(s);
        return `<div class="sh-row">
          <span class="sh-desc">${s.desc}</span>
          <span class="sh-keys">${keysHtml}</span>
        </div>`;
      }).join('');

      return `<div class="sh-category">
        <p class="sh-cat-title">${cat.title}</p>
        <div class="sh-grid">${rows}</div>
      </div>`;
    }).join('');
  },

  /* ---- Render kbd elements for a shortcut entry ---- */
  _renderKeys(shortcut) {
    let html = '';

    if (shortcut.chord) {
      // Two-key sequence: G then X
      html = `<kbd class="sh-kbd">${shortcut.keys[0]}</kbd>`
           + `<span class="sh-separator">then</span>`
           + `<kbd class="sh-kbd">${shortcut.keys[1]}</kbd>`;
    } else {
      // Modifier combo: Ctrl+Shift+N  ->  separate kbd per key with + between
      html = shortcut.keys.map(k => `<kbd class="sh-kbd">${k}</kbd>`).join('<span class="sh-separator">+</span>');
    }

    // Alternate key display (e.g. Ctrl+K  or  /)
    if (shortcut.alt) {
      const altHtml = shortcut.alt.map(k => `<kbd class="sh-kbd">${k}</kbd>`).join('<span class="sh-separator">+</span>');
      html += `<span class="sh-separator">or</span>${altHtml}`;
    }

    return html;
  },

  /* ============================================================
     Action helpers — dispatch to existing globals when available
     ============================================================ */
  _focusGlobalSearch() {
    const input = document.getElementById('globalSearchInput');
    if (input) { input.focus(); input.select(); return; }
    // Fallback to table search
    const tbl = document.querySelector('.table-search input');
    if (tbl) { tbl.focus(); tbl.select(); }
  },

  _triggerSync() {
    if (typeof Auth !== 'undefined' && Auth.showConnectModal) {
      Auth.showConnectModal();
    } else if (typeof Toast !== 'undefined') {
      Toast.show('Connect a tenant first to sync devices', 'info');
    }
  },

  _triggerExport() {
    if (typeof ExportCenter !== 'undefined' && ExportCenter.show) {
      ExportCenter.show();
    } else if (typeof Toast !== 'undefined') {
      Toast.show('Export triggered for current view', 'info');
    }
  },

  _triggerRefresh() {
    if (typeof Graph !== 'undefined' && Graph.refreshData) {
      Graph.refreshData();
    } else if (typeof Toast !== 'undefined') {
      Toast.show('Data refreshed', 'success');
    }
  },

  _triggerCommandPalette() {
    if (typeof CommandPalette !== 'undefined') {
      CommandPalette.show();
    }
  },

  _deviceAction(action) {
    // Only fire on devices page when a device is selected
    const hash = (window.location.hash || '').replace('#/', '');
    if (hash !== 'devices') return;

    if (typeof Devices !== 'undefined' && typeof Devices.triggerAction === 'function') {
      Devices.triggerAction(action);
    }
  },

  _closeAny() {
    // Close this help panel first
    if (this._visible) { this.hide(); return; }
    // Delegate to existing Shortcuts._closeModals if available
    if (typeof Shortcuts !== 'undefined' && Shortcuts._closeModals) {
      Shortcuts._closeModals();
      return;
    }
    // Fallback: close command palette
    if (typeof CommandPalette !== 'undefined' && CommandPalette._visible) {
      CommandPalette.hide();
      return;
    }
    // Close generic modals
    document.querySelectorAll('.modal-overlay:not(.hidden)').forEach(el => {
      if (el.id === 'accessGate') return;
      el.classList.add('hidden');
    });
    document.querySelectorAll('.detail-panel.open').forEach(el => {
      el.classList.remove('open');
    });
  }
};

// Auto-initialise when the script loads
ShortcutsHelp.init();
