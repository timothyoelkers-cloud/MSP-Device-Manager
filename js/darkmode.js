/* ============================================================
   Dark Mode — Toggle between light, dark, and system themes
   ============================================================ */

const DarkMode = (() => {
  const STORAGE_KEY = 'dark_mode';
  const STYLE_ID = 'darkmode-styles';
  let _mediaQuery = null;
  let _mediaListener = null;

  // --- Inject dark mode CSS overrides ---
  function _injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      /* Smooth theme transition */
      html.dark-transition,
      html.dark-transition *,
      html.dark-transition *::before,
      html.dark-transition *::after {
        transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease,
                    box-shadow 0.3s ease, fill 0.3s ease, stroke 0.3s ease !important;
        transition-delay: 0s !important;
      }

      /* Dark mode CSS variable overrides */
      html.dark {
        --bg:             #0f172a;
        --surface:        #1e293b;
        --surface-raised: #263548;
        --surface-overlay: rgba(30, 41, 59, 0.95);
        --border:         #334155;
        --border-light:   #1e293b;

        --gray-25:        #0f172a;
        --gray-50:        #1e293b;
        --gray-100:       #334155;
        --gray-200:       #475569;
        --gray-300:       #64748b;
        --gray-400:       #94a3b8;
        --gray-500:       #cbd5e1;
        --gray-600:       #e2e8f0;
        --gray-700:       #f1f5f9;
        --gray-800:       #f8fafc;
        --gray-900:       #ffffff;

        --ink:            #f1f5f9;
        --ink-secondary:  #cbd5e1;
        --ink-tertiary:   #94a3b8;
        --ink-light:      #cbd5e1;
        --ink-muted:      #94a3b8;
        --ink-inverse:    #0f172a;

        --primary-light:  #1e3a5f;
        --primary-lighter: #60a5fa;
        --primary-pale:   #1e3a5f;
        --primary-bg:     #172554;

        --secondary:      #22d3ee;
        --secondary-light:#67e8f9;
        --secondary-pale: #164e63;

        --success:        #10b981;
        --success-light:  #34d399;
        --success-pale:   #064e3b;
        --success-bg:     #022c22;
        --warning:        #f59e0b;
        --warning-light:  #fbbf24;
        --warning-pale:   #78350f;
        --warning-bg:     #451a03;
        --danger:         #ef4444;
        --danger-light:   #f87171;
        --danger-pale:    #7f1d1d;
        --danger-bg:      #450a0a;
        --info:           #3b82f6;
        --info-pale:      #1e3a5f;

        --shadow-xs:      0 1px 2px rgba(0, 0, 0, 0.3);
        --shadow-sm:      0 1px 3px rgba(0, 0, 0, 0.4), 0 1px 2px rgba(0, 0, 0, 0.3);
        --shadow-md:      0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -2px rgba(0, 0, 0, 0.3);
        --shadow-lg:      0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -4px rgba(0, 0, 0, 0.3);
        --shadow-xl:      0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.3);
        --shadow-card:    0 1px 3px rgba(0, 0, 0, 0.3), 0 1px 2px rgba(0, 0, 0, 0.2);
        --shadow-card-hover: 0 8px 25px rgba(0, 0, 0, 0.4), 0 2px 6px rgba(0, 0, 0, 0.3);

        color-scheme: dark;
      }

      /* Component-level dark overrides */
      html.dark .card,
      html.dark .stat-card,
      html.dark .detail-panel {
        background: var(--surface);
        border-color: var(--border);
      }

      html.dark .sidebar {
        background: #0f172a;
        border-color: var(--border);
      }

      html.dark .sidebar .nav-link:hover,
      html.dark .sidebar .nav-link.active {
        background: rgba(59, 130, 246, 0.1);
      }

      html.dark .topbar {
        background: rgba(15, 23, 42, 0.85);
        border-color: var(--border);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
      }

      html.dark .gate-overlay {
        background: radial-gradient(ellipse at 30% 20%, #1e293b 0%, #0f172a 70%);
      }

      html.dark .gate-card {
        background: var(--surface);
        border-color: var(--border);
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
      }

      html.dark input,
      html.dark select,
      html.dark textarea {
        background: #0f172a;
        border-color: var(--border);
        color: var(--ink);
      }

      html.dark input::placeholder,
      html.dark textarea::placeholder {
        color: var(--ink-tertiary);
      }

      html.dark input:focus,
      html.dark select:focus,
      html.dark textarea:focus {
        border-color: var(--primary);
        box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.2);
      }

      html.dark table thead th {
        background: #0f172a;
        border-color: var(--border);
        color: var(--ink-secondary);
      }

      html.dark table tbody tr {
        border-color: var(--border);
      }

      html.dark table tbody tr:hover {
        background: rgba(59, 130, 246, 0.05);
      }

      html.dark .modal-overlay {
        background: rgba(0, 0, 0, 0.6);
      }

      html.dark .modal-content,
      html.dark .modal-card {
        background: var(--surface);
        border-color: var(--border);
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
      }

      html.dark .badge {
        border-color: var(--border);
      }

      html.dark .toast {
        background: var(--surface);
        border-color: var(--border);
        box-shadow: var(--shadow-lg);
      }

      html.dark .dropdown-menu {
        background: var(--surface);
        border-color: var(--border);
        box-shadow: var(--shadow-xl);
      }

      html.dark .dropdown-item:hover {
        background: rgba(59, 130, 246, 0.1);
      }

      html.dark .skeleton {
        background: linear-gradient(90deg, #1e293b 25%, #334155 50%, #1e293b 75%);
        background-size: 200% 100%;
      }

      html.dark ::-webkit-scrollbar-thumb {
        background: #475569;
      }

      html.dark ::-webkit-scrollbar-thumb:hover {
        background: #64748b;
      }

      html.dark ::selection {
        background: rgba(59, 130, 246, 0.3);
        color: #f1f5f9;
      }

      html.dark kbd {
        background: #0f172a;
        border-color: var(--border);
        color: var(--ink-tertiary);
      }

      html.dark hr {
        border-color: var(--border);
      }

      /* Dark mode toggle button styling */
      .darkmode-toggle {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 34px;
        height: 34px;
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        background: var(--gray-50);
        color: var(--ink-secondary);
        cursor: pointer;
        transition: all 0.2s ease;
        position: relative;
      }

      .darkmode-toggle:hover {
        background: var(--primary-pale);
        border-color: var(--primary);
        color: var(--primary);
      }

      .darkmode-toggle svg {
        width: 16px;
        height: 16px;
        transition: transform 0.3s ease, opacity 0.3s ease;
      }

      .darkmode-toggle[title="System"] svg {
        width: 15px;
        height: 15px;
      }
    `;
    document.head.appendChild(style);
  }

  // --- SVG Icons ---
  const icons = {
    sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>',
    moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>',
    auto: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2v20"/><path d="M12 2a10 10 0 010 20" fill="currentColor" opacity="0.15"/></svg>'
  };

  // --- Read stored preference ---
  function _getPreference() {
    try {
      const val = localStorage.getItem(STORAGE_KEY);
      if (val === 'light' || val === 'dark' || val === 'system') return val;
    } catch (e) {}
    return 'light';
  }

  // --- Save preference ---
  function _setPreference(mode) {
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch (e) {}
    // Also keep AppState in sync if available
    if (typeof AppState !== 'undefined') {
      try { AppState.set('darkMode', mode); } catch (e) {}
    }
  }

  // --- Determine if dark should be active ---
  function _shouldBeDark(mode) {
    if (mode === 'dark') return true;
    if (mode === 'light') return false;
    // system
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  // --- Apply the theme ---
  function _apply(mode) {
    const dark = _shouldBeDark(mode);
    const root = document.documentElement;

    // Add transition class for smooth change
    root.classList.add('dark-transition');

    if (dark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // Remove transition class after animation completes
    setTimeout(() => {
      root.classList.remove('dark-transition');
    }, 350);

    // Update toggle button if it exists
    _updateToggleButton(mode);
  }

  // --- Update toggle button appearance ---
  function _updateToggleButton(mode) {
    const btn = document.getElementById('darkmodeToggleBtn');
    if (!btn) return;

    const labels = { light: 'Light', dark: 'Dark', system: 'System' };
    btn.title = labels[mode] || 'Light';
    btn.innerHTML = mode === 'dark' ? icons.moon : mode === 'system' ? icons.auto : icons.sun;
  }

  // --- Setup system preference listener ---
  function _setupMediaListener() {
    // Clean up previous listener
    if (_mediaQuery && _mediaListener) {
      _mediaQuery.removeEventListener('change', _mediaListener);
    }

    _mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    _mediaListener = () => {
      const mode = _getPreference();
      if (mode === 'system') {
        _apply('system');
      }
    };
    _mediaQuery.addEventListener('change', _mediaListener);
  }

  // --- Public API ---
  return {
    /**
     * Initialize dark mode. Call on app load.
     */
    init() {
      _injectStyles();
      _setupMediaListener();
      const mode = _getPreference();
      // Apply immediately without transition on first load
      const dark = _shouldBeDark(mode);
      if (dark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      _updateToggleButton(mode);
    },

    /**
     * Cycle through modes: light -> dark -> system -> light
     */
    toggle() {
      const current = _getPreference();
      const next = current === 'light' ? 'dark' : current === 'dark' ? 'system' : 'light';
      this.setMode(next);
    },

    /**
     * Set a specific mode: 'light', 'dark', or 'system'
     */
    setMode(mode) {
      if (mode !== 'light' && mode !== 'dark' && mode !== 'system') {
        mode = 'light';
      }
      _setPreference(mode);
      _apply(mode);

      // Show toast feedback if Toast is available
      if (typeof Toast !== 'undefined') {
        const labels = { light: 'Light mode', dark: 'Dark mode', system: 'System preference' };
        Toast.show(labels[mode] + ' activated', 'info');
      }
    },

    /**
     * Returns true if the dark theme is currently active.
     */
    isDark() {
      return document.documentElement.classList.contains('dark');
    },

    /**
     * Returns an HTML string for a toggle button to place in the topbar.
     */
    renderToggle() {
      const mode = _getPreference();
      const labels = { light: 'Light', dark: 'Dark', system: 'System' };
      const icon = mode === 'dark' ? icons.moon : mode === 'system' ? icons.auto : icons.sun;
      return `<button class="darkmode-toggle" id="darkmodeToggleBtn" onclick="DarkMode.toggle()" title="${labels[mode] || 'Light'}" aria-label="Toggle dark mode">${icon}</button>`;
    }
  };
})();
