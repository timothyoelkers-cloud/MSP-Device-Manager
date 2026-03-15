/* ============================================================
   CommandPalette — Ctrl+K quick-jump, search, and actions
   ============================================================ */

const CommandPalette = {
  _visible: false,
  _query: '',
  _selectedIdx: 0,
  _results: [],

  // All navigable pages and actions
  _commands: [
    // Navigation
    { type: 'nav', label: 'Dashboard', page: 'dashboard', section: 'Navigation', icon: '&#9632;' },
    { type: 'nav', label: 'Tenants', page: 'tenants', section: 'Navigation', icon: '&#9632;' },
    { type: 'nav', label: 'All Devices', page: 'devices', section: 'Navigation', icon: '&#9632;' },
    { type: 'nav', label: 'Compliance', page: 'compliance', section: 'Navigation', icon: '&#9632;' },
    { type: 'nav', label: 'Configuration Profiles', page: 'configurations', section: 'Navigation', icon: '&#9632;' },
    { type: 'nav', label: 'Endpoint Security', page: 'security', section: 'Navigation', icon: '&#9632;' },
    { type: 'nav', label: 'Remediation', page: 'remediation', section: 'Navigation', icon: '&#9632;' },
    { type: 'nav', label: 'Device Compare', page: 'devicecompare', section: 'Navigation', icon: '&#9632;' },
    { type: 'nav', label: 'Device Tags', page: 'devicetags', section: 'Navigation', icon: '&#9632;' },
    { type: 'nav', label: 'Asset Tracking', page: 'assettracking', section: 'Navigation', icon: '&#9632;' },
    { type: 'nav', label: 'Applications', page: 'apps', section: 'Navigation', icon: '&#9632;' },
    { type: 'nav', label: 'Autopilot', page: 'autopilot', section: 'Navigation', icon: '&#9632;' },
    { type: 'nav', label: 'Windows Updates', page: 'updates', section: 'Navigation', icon: '&#9632;' },
    { type: 'nav', label: 'Groups', page: 'groups', section: 'Navigation', icon: '&#9632;' },
    { type: 'nav', label: 'Users', page: 'users', section: 'Navigation', icon: '&#9632;' },
    { type: 'nav', label: 'Offboarding', page: 'offboarding', section: 'Navigation', icon: '&#9632;' },
    { type: 'nav', label: 'Conditional Access', page: 'conditionalaccess', section: 'Navigation', icon: '&#9632;' },
    { type: 'nav', label: 'App Protection', page: 'appprotection', section: 'Navigation', icon: '&#9632;' },
    { type: 'nav', label: 'Security Baselines', page: 'baselines', section: 'Navigation', icon: '&#9632;' },
    { type: 'nav', label: 'Enrollment', page: 'enrollment', section: 'Navigation', icon: '&#9632;' },
    { type: 'nav', label: 'Remediations', page: 'scripts', section: 'Navigation', icon: '&#9632;' },
    { type: 'nav', label: 'MFA Report', page: 'mfareport', section: 'Navigation', icon: '&#9632;' },
    { type: 'nav', label: 'Policy Templates', page: 'templates', section: 'Navigation', icon: '&#9632;' },
    { type: 'nav', label: 'Tenant Compare', page: 'comparison', section: 'Navigation', icon: '&#9632;' },
    { type: 'nav', label: 'Alerts', page: 'alerts', section: 'Navigation', icon: '&#9632;' },
    { type: 'nav', label: 'Reports', page: 'reports', section: 'Navigation', icon: '&#9632;' },
    { type: 'nav', label: 'Audit Log', page: 'auditlog', section: 'Navigation', icon: '&#9632;' },
    { type: 'nav', label: 'Licenses', page: 'licenses', section: 'Navigation', icon: '&#9632;' },
    { type: 'nav', label: 'Security Scorecard', page: 'scorecard', section: 'Navigation', icon: '&#9632;' },
    { type: 'nav', label: 'Activity Feed', page: 'activityfeed', section: 'Navigation', icon: '&#9632;' },
    { type: 'nav', label: 'Client Reports', page: 'clientreports', section: 'Navigation', icon: '&#9632;' },
    { type: 'nav', label: 'Health Checks', page: 'healthchecks', section: 'Navigation', icon: '&#9632;' },
    { type: 'nav', label: 'Policy Drift', page: 'policydrift', section: 'Navigation', icon: '&#9632;' },
    { type: 'nav', label: 'Script Runner', page: 'scriptrunner', section: 'Navigation', icon: '&#9632;' },
    { type: 'nav', label: 'Data Export', page: 'exportcenter', section: 'Navigation', icon: '&#9632;' },
    { type: 'nav', label: 'Webhooks', page: 'webhooks', section: 'Navigation', icon: '&#9632;' },
    { type: 'nav', label: 'Access Control', page: 'rbac', section: 'Navigation', icon: '&#9632;' },
    { type: 'nav', label: 'Custom Branding', page: 'branding', section: 'Navigation', icon: '&#9632;' },
    { type: 'nav', label: 'Notification Preferences', page: 'notifprefs', section: 'Navigation', icon: '&#9632;' },
    { type: 'nav', label: 'Settings', page: 'settings', section: 'Navigation', icon: '&#9632;' },
    // Actions
    { type: 'action', label: 'Connect New Tenant', action: () => Auth.showConnectModal(), section: 'Actions', icon: '&#9889;' },
    { type: 'action', label: 'Toggle Dark Mode', action: () => toggleDarkMode(), section: 'Actions', icon: '&#9789;' },
    { type: 'action', label: 'Show Keyboard Shortcuts', action: () => Shortcuts.showHelp(), section: 'Actions', icon: '&#9000;' },
    { type: 'action', label: 'Open Policy Wizard', action: () => PolicyWizard.show(), section: 'Actions', icon: '&#9889;' },
    { type: 'action', label: 'Open User Onboarding', action: () => UserOnboarding.show(), section: 'Actions', icon: '&#9889;' },
    { type: 'action', label: 'Export All Devices CSV', action: () => { if (typeof Devices !== 'undefined') Devices.exportCSV(); }, section: 'Actions', icon: '&#8615;' },
  ],

  show() {
    if (this._visible) { this.hide(); return; }
    this._visible = true;
    this._query = '';
    this._selectedIdx = 0;
    this._results = this._commands.slice(0, 12);

    document.getElementById('cmdPalette')?.remove();

    const overlay = document.createElement('div');
    overlay.id = 'cmdPalette';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:10001;display:flex;align-items:flex-start;justify-content:center;padding-top:min(20vh,120px);background:rgba(0,0,0,0.4);animation:fadeIn 0.12s ease;';
    overlay.innerHTML = `
      <div style="width:560px;max-width:95vw;background:var(--surface);border-radius:var(--radius-lg);box-shadow:var(--shadow-xl);overflow:hidden;border:1px solid var(--border);">
        <div style="display:flex;align-items:center;padding:12px 16px;border-bottom:1px solid var(--border);gap:10px;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--ink-muted)" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" id="cmdPaletteInput" placeholder="Type a command or search..."
            style="flex:1;border:none;outline:none;background:transparent;font-size:var(--text-base);color:var(--ink);font-family:var(--font-sans);"
            autocomplete="off" spellcheck="false">
          <kbd style="padding:2px 6px;font-size:10px;background:var(--gray-100);border:1px solid var(--border);border-radius:4px;color:var(--ink-muted);font-family:var(--font-mono);">ESC</kbd>
        </div>
        <div id="cmdPaletteResults" style="max-height:360px;overflow-y:auto;padding:6px;"></div>
        <div style="padding:8px 16px;border-top:1px solid var(--border);display:flex;gap:16px;justify-content:flex-end;">
          <span style="font-size:10px;color:var(--ink-muted);">&#8593;&#8595; navigate</span>
          <span style="font-size:10px;color:var(--ink-muted);">&#9166; select</span>
          <span style="font-size:10px;color:var(--ink-muted);">esc close</span>
        </div>
      </div>
    `;

    overlay.addEventListener('click', e => { if (e.target === overlay) this.hide(); });
    document.body.appendChild(overlay);

    const input = document.getElementById('cmdPaletteInput');
    input.focus();
    input.addEventListener('input', () => this._onInput(input.value));
    input.addEventListener('keydown', e => this._onKeydown(e));

    this._renderResults();
  },

  hide() {
    this._visible = false;
    const el = document.getElementById('cmdPalette');
    if (el) {
      el.style.opacity = '0';
      el.style.transition = 'opacity 0.1s ease';
      setTimeout(() => el.remove(), 100);
    }
  },

  _onInput(query) {
    this._query = query.toLowerCase().trim();
    this._selectedIdx = 0;

    if (!this._query) {
      this._results = this._commands.slice(0, 12);
    } else {
      // Search commands
      const scored = this._commands.map(cmd => {
        const label = cmd.label.toLowerCase();
        const section = (cmd.section || '').toLowerCase();
        let score = 0;
        if (label === this._query) score = 100;
        else if (label.startsWith(this._query)) score = 80;
        else if (label.includes(this._query)) score = 60;
        else if (section.includes(this._query)) score = 30;
        else {
          // Fuzzy: check if all chars appear in order
          let qi = 0;
          for (let i = 0; i < label.length && qi < this._query.length; i++) {
            if (label[i] === this._query[qi]) qi++;
          }
          if (qi === this._query.length) score = 20;
        }
        return { cmd, score };
      }).filter(s => s.score > 0).sort((a, b) => b.score - a.score);

      this._results = scored.slice(0, 12).map(s => s.cmd);

      // Also search devices if query is 3+ chars
      if (this._query.length >= 3) {
        const devices = AppState.getDevicesForContext();
        const matchedDevices = devices.filter(d =>
          (d.deviceName || '').toLowerCase().includes(this._query) ||
          (d.userPrincipalName || '').toLowerCase().includes(this._query)
        ).slice(0, 5);

        matchedDevices.forEach(d => {
          this._results.push({
            type: 'device',
            label: d.deviceName || 'Unknown',
            sublabel: `${d.operatingSystem || ''} — ${d.userPrincipalName || 'No user'}`,
            section: 'Devices',
            icon: '&#128187;',
            device: d
          });
        });
      }
    }

    this._renderResults();
  },

  _onKeydown(e) {
    if (e.key === 'Escape') { this.hide(); return; }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      this._selectedIdx = Math.min(this._selectedIdx + 1, this._results.length - 1);
      this._renderResults();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      this._selectedIdx = Math.max(this._selectedIdx - 1, 0);
      this._renderResults();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      this._execute(this._results[this._selectedIdx]);
    }
  },

  _execute(item) {
    if (!item) return;
    this.hide();
    if (item.type === 'nav') {
      Router.navigate(item.page);
    } else if (item.type === 'action' && item.action) {
      item.action();
    } else if (item.type === 'device' && item.device) {
      Router.navigate('devices');
      setTimeout(() => {
        if (typeof Devices !== 'undefined') Devices.showDeviceDetail(item.device._tenantId, item.device.id);
      }, 200);
    }
  },

  _renderResults() {
    const container = document.getElementById('cmdPaletteResults');
    if (!container) return;

    if (this._results.length === 0) {
      container.innerHTML = '<div style="padding:24px;text-align:center;color:var(--ink-muted);font-size:var(--text-sm);">No results found</div>';
      return;
    }

    let currentSection = '';
    let html = '';

    this._results.forEach((item, idx) => {
      if (item.section !== currentSection) {
        currentSection = item.section;
        html += `<div style="padding:6px 12px 4px;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:var(--ink-muted);">${currentSection}</div>`;
      }
      const selected = idx === this._selectedIdx;
      html += `
        <div class="cmd-palette-item" style="display:flex;align-items:center;gap:10px;padding:8px 12px;border-radius:var(--radius-sm);cursor:pointer;${selected ? 'background:var(--primary);color:white;' : ''}"
          onmouseenter="CommandPalette._selectedIdx=${idx}; CommandPalette._renderResults();"
          onclick="CommandPalette._execute(CommandPalette._results[${idx}])">
          <span style="width:22px;text-align:center;font-size:13px;flex-shrink:0;${selected ? 'opacity:1;' : 'opacity:0.5;'}">${item.icon || '&#9632;'}</span>
          <div style="flex:1;min-width:0;">
            <div style="font-size:var(--text-sm);font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${item.label}</div>
            ${item.sublabel ? `<div style="font-size:10px;${selected ? 'opacity:0.8;' : 'color:var(--ink-muted);'}overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${item.sublabel}</div>` : ''}
          </div>
          ${item.type === 'nav' ? `<span style="font-size:10px;${selected ? 'opacity:0.7;' : 'color:var(--ink-muted);'}">Go to page</span>` : ''}
          ${item.type === 'action' ? `<span style="font-size:10px;${selected ? 'opacity:0.7;' : 'color:var(--ink-muted);'}">Run</span>` : ''}
        </div>
      `;
    });

    container.innerHTML = html;

    // Scroll selected into view
    const selectedEl = container.children[this._selectedIdx + (this._results.filter((r, i) => i <= this._selectedIdx && (i === 0 || this._results[i].section !== this._results[i-1].section)).length)];
    if (selectedEl) selectedEl.scrollIntoView({ block: 'nearest' });
  }
};
