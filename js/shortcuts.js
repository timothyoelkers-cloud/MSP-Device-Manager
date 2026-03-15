/* ============================================================
   Keyboard Shortcuts — Global hotkeys for quick navigation
   ============================================================ */

const Shortcuts = {
  _chordKey: null,
  _chordTimer: null,

  // Map of two-key chords (g + second key)
  _chords: {
    d: { page: 'dashboard',        label: 'Dashboard' },
    t: { page: 'tenants',          label: 'Tenants' },
    v: { page: 'devices',          label: 'Devices' },
    c: { page: 'compliance',       label: 'Compliance' },
    p: { page: 'configurations',   label: 'Configuration Profiles' },
    s: { page: 'security',         label: 'Endpoint Security' },
    a: { page: 'apps',             label: 'Applications' },
    u: { page: 'users',            label: 'Users' },
    r: { page: 'reports',          label: 'Reports' },
    l: { page: 'alerts',           label: 'Alerts' },
    o: { page: 'autopilot',        label: 'Autopilot' },
    w: { page: 'updates',          label: 'Windows Updates' },
    b: { page: 'baselines',        label: 'Security Baselines' },
    e: { page: 'enrollment',       label: 'Enrollment' },
    i: { page: 'auditlog',         label: 'Audit Log' },
    m: { page: 'comparison',       label: 'Tenant Compare' },
    x: { page: 'conditionalaccess',label: 'Conditional Access' },
    k: { page: 'scripts',          label: 'Remediations' },
    f: { page: 'offboarding',      label: 'Offboarding' },
    y: { page: 'licenses',         label: 'Licenses' },
    h: { page: 'scorecard',        label: 'Security Scorecard' },
    j: { page: 'activityfeed',     label: 'Activity Feed' },
    q: { page: 'exportcenter',     label: 'Data Export' },
    z: { page: 'devicecompare',    label: 'Device Compare' },
    '1': { page: 'remediation',    label: 'Remediation' },
    '2': { page: 'mfareport',      label: 'MFA Report' },
    '3': { page: 'assettracking',  label: 'Asset Tracking' },
    '4': { page: 'healthchecks',   label: 'Health Checks' },
    '5': { page: 'devicetags',     label: 'Device Tags' },
    '6': { page: 'policydrift',    label: 'Policy Drift' },
    '7': { page: 'tenantgroups',   label: 'Tenant Groups' },
    '8': { page: 'clientreports',  label: 'Client Reports' },
    '9': { page: 'scriptrunner',   label: 'Script Runner' },
  },

  init() {
    window.addEventListener('keydown', (e) => this._handleKey(e));
  },

  _isTyping(e) {
    const tag = (e.target.tagName || '').toLowerCase();
    return tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable;
  },

  _handleKey(e) {
    const key = e.key;

    // Ctrl+K — Command Palette (always, even in input fields)
    if ((e.ctrlKey || e.metaKey) && key === 'k') {
      e.preventDefault();
      if (typeof CommandPalette !== 'undefined') {
        CommandPalette.show();
      } else {
        this._focusSearch();
      }
      return;
    }

    // Never intercept other shortcuts when typing in form fields
    if (this._isTyping(e)) return;

    // Don't process other shortcuts if modifier keys are held
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    // If we are waiting for the second key of a chord
    if (this._chordKey === 'g') {
      clearTimeout(this._chordTimer);
      this._chordKey = null;
      const chord = this._chords[key];
      if (chord) {
        e.preventDefault();
        Router.navigate(chord.page);
      }
      return;
    }

    // Single-key shortcuts
    switch (key) {
      case '?':
        e.preventDefault();
        this.showHelp();
        break;
      case 'g':
        // Start chord sequence — wait up to 1 second for second key
        this._chordKey = 'g';
        this._chordTimer = setTimeout(() => { this._chordKey = null; }, 1000);
        break;
      case '/':
        e.preventDefault();
        this._focusSearch();
        break;
      case 'Escape':
        this._closeModals();
        break;
      case 'n':
        e.preventDefault();
        if (typeof Auth !== 'undefined' && Auth.showConnectModal) {
          Auth.showConnectModal();
        }
        break;
    }
  },

  _focusSearch() {
    const input = document.querySelector('.table-search input');
    if (input) {
      input.focus();
      input.select();
    }
  },

  _closeModals() {
    // Close command palette first
    if (typeof CommandPalette !== 'undefined' && CommandPalette._visible) {
      CommandPalette.hide();
      return;
    }
    // Close any visible modal overlays
    document.querySelectorAll('.modal-overlay:not(.hidden)').forEach(el => {
      if (el.id === 'accessGate') return;
      el.classList.add('hidden');
    });
    // Remove dynamic modals
    ['confirmDialog', 'shortcutsHelpModal', 'cmdPalette', 'widgetCustomizer', 'tgModal', 'dtTagModal', 'dtBulkModal'].forEach(id => {
      document.getElementById(id)?.remove();
    });
    // Close any open detail panels
    document.querySelectorAll('.detail-panel.open').forEach(el => {
      el.classList.remove('open');
    });
  },

  showHelp() {
    // Remove existing if present
    const existing = document.getElementById('shortcutsHelpModal');
    if (existing) { existing.remove(); return; }

    const shortcuts = [
      { keys: '?',           desc: 'Show this help' },
      { keys: 'Ctrl+K',      desc: 'Command palette' },
      { keys: 'g then d',    desc: 'Go to Dashboard' },
      { keys: 'g then t',    desc: 'Go to Tenants' },
      { keys: 'g then v',    desc: 'Go to Devices' },
      { keys: 'g then c',    desc: 'Go to Compliance' },
      { keys: 'g then p',    desc: 'Go to Configuration Profiles' },
      { keys: 'g then s',    desc: 'Go to Endpoint Security' },
      { keys: 'g then a',    desc: 'Go to Applications' },
      { keys: 'g then u',    desc: 'Go to Users' },
      { keys: 'g then r',    desc: 'Go to Reports' },
      { keys: 'g then l',    desc: 'Go to Alerts' },
      { keys: 'g then b',    desc: 'Go to Security Baselines' },
      { keys: 'g then e',    desc: 'Go to Enrollment' },
      { keys: 'g then i',    desc: 'Go to Audit Log' },
      { keys: 'g then m',    desc: 'Go to Tenant Compare' },
      { keys: 'g then x',    desc: 'Go to Conditional Access' },
      { keys: 'g then f',    desc: 'Go to Offboarding' },
      { keys: 'g then y',    desc: 'Go to Licenses' },
      { keys: 'g then h',    desc: 'Go to Security Scorecard' },
      { keys: 'g then j',    desc: 'Go to Activity Feed' },
      { keys: 'g then q',    desc: 'Go to Data Export' },
      { keys: 'g then z',    desc: 'Go to Device Compare' },
      { keys: 'g then 1',    desc: 'Go to Remediation' },
      { keys: 'g then 2',    desc: 'Go to MFA Report' },
      { keys: 'g then 3',    desc: 'Go to Asset Tracking' },
      { keys: 'g then 4',    desc: 'Go to Health Checks' },
      { keys: 'g then 5',    desc: 'Go to Device Tags' },
      { keys: 'g then 6',    desc: 'Go to Policy Drift' },
      { keys: 'g then 7',    desc: 'Go to Tenant Groups' },
      { keys: '/ or Ctrl+K', desc: 'Focus search / command palette' },
      { keys: 'Escape',      desc: 'Close modal / panel' },
      { keys: 'n',           desc: 'Connect new tenant' }
    ];

    const rows = shortcuts.map(s => `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border);">
        <span style="color:var(--ink-secondary);font-size:var(--text-sm);">${s.desc}</span>
        <span style="display:inline-flex;gap:4px;">${s.keys.split(' ').map(k =>
          k === 'then' || k === 'or'
            ? `<span style="color:var(--ink-muted);font-size:var(--text-xs);padding:0 2px;">${k}</span>`
            : `<kbd style="display:inline-block;padding:2px 8px;font-family:var(--font-mono);font-size:var(--text-xs);background:var(--gray-100);border:1px solid var(--border);border-radius:var(--radius-sm);color:var(--ink);min-width:24px;text-align:center;">${k}</kbd>`
        ).join('')}</span>
      </div>
    `).join('');

    const modal = document.createElement('div');
    modal.id = 'shortcutsHelpModal';
    modal.className = 'modal-overlay';
    modal.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.4);';
    modal.innerHTML = `
      <div class="modal" style="max-width:480px;width:90%;max-height:80vh;overflow-y:auto;">
        <div class="modal-header">
          <h3 class="modal-title">Keyboard Shortcuts</h3>
          <button class="modal-close" onclick="document.getElementById('shortcutsHelpModal').remove()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="modal-body" style="padding:12px 20px 20px;">
          ${rows}
        </div>
      </div>
    `;

    // Close on backdrop click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });

    document.body.appendChild(modal);
  }
};

// Initialize on load
Shortcuts.init();
