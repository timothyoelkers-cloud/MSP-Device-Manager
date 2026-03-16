/* ============================================================
   GlobalSearch — Topbar search across all entities
   ============================================================ */

const GlobalSearch = {
  _timeout: null,
  _results: [],
  _selectedIdx: -1,

  search(term) {
    clearTimeout(this._timeout);
    if (!term || term.length < 2) {
      this.hideResults();
      return;
    }
    this._timeout = setTimeout(() => this._doSearch(term), 150);
  },

  _doSearch(term) {
    const q = term.toLowerCase();
    const results = [];
    const limit = 6; // per category

    // Search devices
    const allDevices = AppState.getForContext('devices');
    const matchedDevices = allDevices.filter(d =>
      (d.deviceName || '').toLowerCase().includes(q) ||
      (d.serialNumber || '').toLowerCase().includes(q) ||
      (d.userPrincipalName || '').toLowerCase().includes(q)
    ).slice(0, limit);
    matchedDevices.forEach(d => results.push({
      type: 'Device',
      icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>',
      title: d.deviceName || 'Unknown Device',
      subtitle: [d.operatingSystem, d.userPrincipalName].filter(Boolean).join(' — '),
      badge: d.complianceState === 'compliant' ? 'badge-success' : d.complianceState === 'noncompliant' ? 'badge-danger' : 'badge-default',
      badgeText: d.complianceState || 'Unknown',
      action: () => { Router.navigate('devices'); setTimeout(() => Devices.showDetail(d, d._tenantId), 100); }
    }));

    // Search users
    const allUsers = AppState.getForContext('users');
    const matchedUsers = allUsers.filter(u =>
      (u.displayName || '').toLowerCase().includes(q) ||
      (u.userPrincipalName || '').toLowerCase().includes(q) ||
      (u.mail || '').toLowerCase().includes(q)
    ).slice(0, limit);
    matchedUsers.forEach(u => results.push({
      type: 'User',
      icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
      title: u.displayName || 'Unknown User',
      subtitle: u.userPrincipalName || u.mail || '',
      badge: u.accountEnabled ? 'badge-success' : 'badge-default',
      badgeText: u.accountEnabled ? 'Active' : 'Disabled',
      action: () => Router.navigate('users')
    }));

    // Search groups
    const allGroups = AppState.getForContext('groups');
    const matchedGroups = allGroups.filter(g =>
      (g.displayName || '').toLowerCase().includes(q) ||
      (g.description || '').toLowerCase().includes(q)
    ).slice(0, limit);
    matchedGroups.forEach(g => {
      const isDynamic = g.groupTypes?.includes('DynamicMembership');
      results.push({
        type: 'Group',
        icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>',
        title: g.displayName || 'Unnamed Group',
        subtitle: g.description || (isDynamic ? 'Dynamic group' : 'Assigned group'),
        badge: isDynamic ? 'badge-primary' : 'badge-default',
        badgeText: isDynamic ? 'Dynamic' : 'Assigned',
        action: () => Router.navigate('groups')
      });
    });

    // Search compliance policies
    const allPolicies = AppState.getForContext('compliancePolicies');
    const matchedPolicies = allPolicies.filter(p =>
      (p.displayName || '').toLowerCase().includes(q)
    ).slice(0, limit);
    matchedPolicies.forEach(p => results.push({
      type: 'Policy',
      icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
      title: p.displayName || 'Unnamed Policy',
      subtitle: 'Compliance Policy',
      badge: 'badge-blue',
      badgeText: 'Compliance',
      action: () => Router.navigate('compliance')
    }));

    // Search config profiles
    const allConfigs = AppState.getForContext('configurationProfiles');
    const matchedConfigs = allConfigs.filter(c =>
      (c.displayName || '').toLowerCase().includes(q)
    ).slice(0, limit);
    matchedConfigs.forEach(c => results.push({
      type: 'Config',
      icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33"/></svg>',
      title: c.displayName || 'Unnamed Profile',
      subtitle: 'Configuration Profile',
      badge: 'badge-default',
      badgeText: 'Config',
      action: () => Router.navigate('configurations')
    }));

    // Search apps
    const allApps = AppState.getForContext('apps');
    const matchedApps = allApps.filter(a =>
      (a.displayName || '').toLowerCase().includes(q)
    ).slice(0, limit);
    matchedApps.forEach(a => results.push({
      type: 'App',
      icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>',
      title: a.displayName || 'Unknown App',
      subtitle: a.publisher || '',
      badge: 'badge-default',
      badgeText: 'App',
      action: () => Router.navigate('apps')
    }));

    this._results = results;
    this._selectedIdx = -1;
    this._renderResults(term);
  },

  _renderResults(term) {
    const container = document.getElementById('globalSearchResults');
    if (!container) return;

    if (this._results.length === 0) {
      container.style.display = 'block';
      container.innerHTML = `
        <div style="padding:24px;text-align:center;color:var(--ink-tertiary);font-size:13px;">
          No results found for "<strong>${term}</strong>"
        </div>
      `;
      return;
    }

    // Group by type
    const grouped = {};
    this._results.forEach(r => {
      if (!grouped[r.type]) grouped[r.type] = [];
      grouped[r.type].push(r);
    });

    let idx = 0;
    let html = '';
    for (const [type, items] of Object.entries(grouped)) {
      html += `<div style="padding:6px 14px 2px;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:var(--ink-tertiary);">${type}s</div>`;
      items.forEach(item => {
        html += `
          <div class="global-search-item" data-idx="${idx}" onclick="GlobalSearch.select(${idx})"
               onmouseover="GlobalSearch._selectedIdx=${idx};GlobalSearch._highlightItem()"
               style="display:flex;align-items:center;gap:10px;padding:8px 14px;cursor:pointer;transition:background 0.1s;">
            <div style="color:var(--ink-tertiary);flex-shrink:0;">${item.icon}</div>
            <div style="flex:1;min-width:0;">
              <div style="font-size:13px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${item.title}</div>
              <div style="font-size:11px;color:var(--ink-tertiary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${item.subtitle}</div>
            </div>
            <span class="badge ${item.badge}" style="flex-shrink:0;font-size:10px;">${item.badgeText}</span>
          </div>
        `;
        idx++;
      });
    }

    html += `<div style="padding:8px 14px;border-top:1px solid var(--border);font-size:11px;color:var(--ink-tertiary);display:flex;justify-content:space-between;">
      <span>${this._results.length} result${this._results.length !== 1 ? 's' : ''}</span>
      <span>&#8593;&#8595; navigate &middot; &#9166; select &middot; esc close</span>
    </div>`;

    container.style.display = 'block';
    container.innerHTML = html;
  },

  _highlightItem() {
    const items = document.querySelectorAll('.global-search-item');
    items.forEach((item, i) => {
      item.style.background = i === this._selectedIdx ? 'var(--gray-50)' : '';
    });
  },

  handleKey(e) {
    if (e.key === 'Escape') {
      this.hideResults();
      document.getElementById('globalSearchInput')?.blur();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      this._selectedIdx = Math.min(this._selectedIdx + 1, this._results.length - 1);
      this._highlightItem();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      this._selectedIdx = Math.max(this._selectedIdx - 1, 0);
      this._highlightItem();
    } else if (e.key === 'Enter' && this._selectedIdx >= 0) {
      e.preventDefault();
      this.select(this._selectedIdx);
    }
  },

  select(idx) {
    const item = this._results[idx];
    if (!item) return;
    this.hideResults();
    document.getElementById('globalSearchInput').value = '';
    item.action();
  },

  hideResults() {
    const container = document.getElementById('globalSearchResults');
    if (container) container.style.display = 'none';
  }
};
