/* ============================================================
   Quick Actions Toolbar — Floating action bar with common tasks
   ============================================================ */

const QuickActions = (() => {
  const STORAGE_KEY = 'quick_actions_visible';
  const CONTAINER_ID = 'quickActionsToolbar';
  const STYLE_ID = 'quickactions-styles';

  let _visible = true;
  let _mobileExpanded = false;
  let _actions = [];
  let _container = null;

  // --- Default actions ---------------------------------------------------
  const _defaultActions = [
    {
      id: 'refresh',
      label: 'Refresh Data',
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>',
      handler() {
        AppState.set('lastRefresh', Date.now());
        if (typeof Toast !== 'undefined') Toast.show('Data refreshed', 'success');
        if (typeof AuditLog !== 'undefined') AuditLog.log('quick_action', { action: 'refresh_data' });
      }
    },
    {
      id: 'search',
      label: 'Quick Search',
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
      handler() {
        const input = document.getElementById('globalSearchInput');
        if (input) { input.focus(); input.select(); }
      }
    },
    {
      id: 'newnote',
      label: 'New Note',
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>',
      handler() {
        if (typeof TechNotes !== 'undefined' && typeof TechNotes.openNew === 'function') {
          TechNotes.openNew();
        } else {
          if (typeof Toast !== 'undefined') Toast.show('Tech Notes not available', 'warning');
        }
      }
    },
    {
      id: 'syncdevices',
      label: 'Sync All Devices',
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6"/><path d="M2.5 22v-6h6"/><path d="M2.5 16s1.5-6 9.5-6 9.5 6 9.5 6"/><path d="M21.5 8s-1.5 6-9.5 6-9.5-6-9.5-6"/></svg>',
      handler() {
        if (typeof GraphAPI !== 'undefined' && typeof GraphAPI.syncAllDevices === 'function') {
          GraphAPI.syncAllDevices();
          if (typeof Toast !== 'undefined') Toast.show('Syncing devices across tenants...', 'info');
        } else {
          AppState.set('lastRefresh', Date.now());
          if (typeof Toast !== 'undefined') Toast.show('Device sync triggered', 'success');
        }
        if (typeof AuditLog !== 'undefined') AuditLog.log('quick_action', { action: 'sync_all_devices' });
      }
    },
    {
      id: 'export',
      label: 'Export Report',
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
      handler() {
        if (typeof Router !== 'undefined') Router.navigate('exportcenter');
      }
    },
    {
      id: 'snapshot',
      label: 'Take Snapshot',
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>',
      handler() {
        if (typeof TrendCharts !== 'undefined' && typeof TrendCharts.takeSnapshot === 'function') {
          TrendCharts.takeSnapshot();
          if (typeof Toast !== 'undefined') Toast.show('Trend snapshot saved', 'success');
        } else {
          if (typeof Toast !== 'undefined') Toast.show('Trend Charts not available', 'warning');
        }
        if (typeof AuditLog !== 'undefined') AuditLog.log('quick_action', { action: 'take_snapshot' });
      }
    },
    {
      id: 'darkmode',
      label: 'Toggle Dark Mode',
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>',
      handler() {
        if (typeof DarkMode !== 'undefined' && typeof DarkMode.toggle === 'function') {
          DarkMode.toggle();
        } else {
          if (typeof Toast !== 'undefined') Toast.show('Dark mode not available', 'warning');
        }
      }
    },
    {
      id: 'help',
      label: 'Help',
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
      handler() {
        if (typeof ShortcutsHelp !== 'undefined' && typeof ShortcutsHelp.show === 'function') {
          ShortcutsHelp.show();
        } else {
          if (typeof Toast !== 'undefined') Toast.show('Help panel not available', 'warning');
        }
      }
    }
  ];

  // --- Inject styles ----------------------------------------------------
  function _injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      /* Quick Actions Toolbar */
      #${CONTAINER_ID} {
        position: fixed;
        bottom: 24px;
        left: 50%;
        transform: translateX(-50%) translateY(100px);
        z-index: 9000;
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 8px 12px;
        background: rgba(255, 255, 255, 0.82);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        border: 1px solid var(--border, #e2e8f0);
        border-radius: 24px;
        box-shadow: var(--shadow-md, 0 4px 24px rgba(0,0,0,.1));
        transition: transform 0.4s cubic-bezier(0.22, 1, 0.36, 1),
                    opacity 0.4s cubic-bezier(0.22, 1, 0.36, 1);
        opacity: 0;
      }

      html.dark #${CONTAINER_ID} {
        background: rgba(30, 41, 59, 0.82);
      }

      #${CONTAINER_ID}.qa-visible {
        transform: translateX(-50%) translateY(0);
        opacity: 1;
      }

      #${CONTAINER_ID}.qa-hidden {
        transform: translateX(-50%) translateY(100px);
        opacity: 0;
        pointer-events: none;
      }

      /* Action button */
      .qa-btn {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 40px;
        height: 40px;
        border: none;
        border-radius: 50%;
        background: transparent;
        color: var(--ink-muted, #64748b);
        cursor: pointer;
        transition: all 0.2s ease;
        flex-shrink: 0;
      }

      .qa-btn:hover {
        background: var(--primary, #2563eb);
        color: #fff;
        transform: scale(1.12);
      }

      .qa-btn:active {
        transform: scale(0.95);
      }

      .qa-btn svg {
        display: block;
      }

      /* Tooltip */
      .qa-tooltip {
        position: absolute;
        bottom: calc(100% + 8px);
        left: 50%;
        transform: translateX(-50%) translateY(4px);
        padding: 4px 10px;
        background: var(--ink, #1e293b);
        color: #fff;
        font-size: 11px;
        font-family: inherit;
        font-weight: 500;
        white-space: nowrap;
        border-radius: 8px;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.15s ease, transform 0.15s ease;
        z-index: 9001;
      }

      html.dark .qa-tooltip {
        background: #f1f5f9;
        color: #0f172a;
      }

      .qa-btn:hover .qa-tooltip {
        opacity: 1;
        transform: translateX(-50%) translateY(0);
      }

      /* Divider (optional between groups) */
      .qa-divider {
        width: 1px;
        height: 24px;
        background: var(--border, #e2e8f0);
        flex-shrink: 0;
        margin: 0 2px;
      }

      /* --- Mobile: collapse to FAB --- */
      @media (max-width: 767px) {
        #${CONTAINER_ID} {
          padding: 0;
          border-radius: 50%;
          width: 52px;
          height: 52px;
          bottom: 20px;
          right: 20px;
          left: auto;
          transform: translateX(0) translateY(100px);
          justify-content: center;
          overflow: hidden;
          gap: 0;
        }

        #${CONTAINER_ID}.qa-visible {
          transform: translateX(0) translateY(0);
        }

        #${CONTAINER_ID}.qa-hidden {
          transform: translateX(0) translateY(100px);
        }

        /* When collapsed, only the FAB trigger is visible */
        #${CONTAINER_ID} .qa-btn {
          display: none;
        }

        #${CONTAINER_ID} .qa-fab-trigger {
          display: flex;
        }

        /* Expanded mobile state */
        #${CONTAINER_ID}.qa-mobile-expanded {
          width: auto;
          height: auto;
          border-radius: 24px;
          padding: 8px 12px;
          right: 12px;
          bottom: 20px;
          flex-wrap: wrap;
          max-width: calc(100vw - 24px);
          justify-content: center;
          gap: 6px;
        }

        #${CONTAINER_ID}.qa-mobile-expanded .qa-btn {
          display: flex;
        }

        #${CONTAINER_ID}.qa-mobile-expanded .qa-fab-trigger svg.qa-icon-open {
          display: none;
        }

        #${CONTAINER_ID}.qa-mobile-expanded .qa-fab-trigger svg.qa-icon-close {
          display: block;
        }
      }

      /* Desktop: hide FAB trigger */
      @media (min-width: 768px) {
        .qa-fab-trigger {
          display: none !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  // --- Build the toolbar DOM -------------------------------------------
  function _build() {
    if (_container) _container.remove();

    _container = document.createElement('div');
    _container.id = CONTAINER_ID;
    _container.setAttribute('role', 'toolbar');
    _container.setAttribute('aria-label', 'Quick Actions');

    // Mobile FAB trigger
    const fab = document.createElement('button');
    fab.className = 'qa-btn qa-fab-trigger';
    fab.setAttribute('aria-label', 'Toggle quick actions');
    fab.innerHTML = `
      <svg class="qa-icon-open" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      <svg class="qa-icon-close" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:none"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    `;
    fab.addEventListener('click', (e) => {
      e.stopPropagation();
      _mobileExpanded = !_mobileExpanded;
      _container.classList.toggle('qa-mobile-expanded', _mobileExpanded);
      const openIcon = fab.querySelector('.qa-icon-open');
      const closeIcon = fab.querySelector('.qa-icon-close');
      if (_mobileExpanded) {
        openIcon.style.display = 'none';
        closeIcon.style.display = 'block';
      } else {
        openIcon.style.display = 'block';
        closeIcon.style.display = 'none';
      }
    });
    _container.appendChild(fab);

    // Action buttons
    const actions = _actions.length ? _actions : _defaultActions;
    actions.forEach((action) => {
      const btn = document.createElement('button');
      btn.className = 'qa-btn';
      btn.setAttribute('aria-label', action.label);
      btn.setAttribute('data-action', action.id);
      btn.innerHTML = `${action.icon}<span class="qa-tooltip">${action.label}</span>`;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (typeof action.handler === 'function') action.handler();
      });
      _container.appendChild(btn);
    });

    document.body.appendChild(_container);
  }

  // --- Determine if on access gate page --------------------------------
  function _isAccessGate() {
    const gate = document.getElementById('accessGate');
    if (!gate) return false;
    return gate.style.display !== 'none' && !gate.classList.contains('hidden');
  }

  // --- Close mobile on outside click -----------------------------------
  function _onDocClick(e) {
    if (_mobileExpanded && _container && !_container.contains(e.target)) {
      _mobileExpanded = false;
      _container.classList.remove('qa-mobile-expanded');
      const fab = _container.querySelector('.qa-fab-trigger');
      if (fab) {
        fab.querySelector('.qa-icon-open').style.display = 'block';
        fab.querySelector('.qa-icon-close').style.display = 'none';
      }
    }
  }

  // --- Public API -------------------------------------------------------
  return {
    init() {
      _injectStyles();

      // Restore preference
      const stored = localStorage.getItem(STORAGE_KEY);
      _visible = stored !== null ? stored === 'true' : true;

      _build();
      document.addEventListener('click', _onDocClick);

      // Show after a short delay for entrance animation
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (_visible && !_isAccessGate()) {
            _container.classList.add('qa-visible');
          } else {
            _container.classList.add('qa-hidden');
          }
        });
      });

      // Re-evaluate visibility on hash change (hide on access gate)
      window.addEventListener('hashchange', () => {
        if (_isAccessGate()) {
          this.hide();
        } else if (_visible) {
          _container.classList.remove('qa-hidden');
          _container.classList.add('qa-visible');
        }
      });

      // Also listen for the gate being dismissed
      const observer = new MutationObserver(() => {
        if (!_isAccessGate() && _visible) {
          _container.classList.remove('qa-hidden');
          _container.classList.add('qa-visible');
        } else if (_isAccessGate()) {
          _container.classList.remove('qa-visible');
          _container.classList.add('qa-hidden');
        }
      });
      const gate = document.getElementById('accessGate');
      if (gate) {
        observer.observe(gate, { attributes: true, attributeFilter: ['class', 'style'] });
      }
    },

    show() {
      _visible = true;
      localStorage.setItem(STORAGE_KEY, 'true');
      if (_container && !_isAccessGate()) {
        _container.classList.remove('qa-hidden');
        _container.classList.add('qa-visible');
      }
    },

    hide() {
      _visible = false;
      localStorage.setItem(STORAGE_KEY, 'false');
      if (_container) {
        _container.classList.remove('qa-visible');
        _container.classList.add('qa-hidden');
      }
    },

    setActions(actions) {
      if (!Array.isArray(actions)) return;
      _actions = actions;
      if (_container) {
        _build();
        if (_visible && !_isAccessGate()) {
          requestAnimationFrame(() => _container.classList.add('qa-visible'));
        } else {
          _container.classList.add('qa-hidden');
        }
      }
    },

    /** Return current visibility state */
    isVisible() {
      return _visible;
    }
  };
})();
