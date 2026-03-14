/* ============================================================
   ActivityFeed — Real-time cross-tenant activity stream
   ============================================================ */

const ActivityFeed = {
  _filter: 'all', // all, signins, devices, policies, admin
  _searchTerm: '',
  _autoRefresh: true,
  _refreshTimer: null,

  render() {
    const main = document.getElementById('mainContent');
    const activities = this._getActivities();
    const filtered = this._applyFilters(activities);

    main.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h1 class="page-title">Activity Feed</h1>
          <p class="page-subtitle">Real-time cross-tenant activity stream</p>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-ghost btn-sm" onclick="ActivityFeed.refresh()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>
            Refresh
          </button>
          <button class="btn btn-${this._autoRefresh ? 'primary' : 'secondary'} btn-sm" onclick="ActivityFeed._toggleAutoRefresh()">
            ${this._autoRefresh ? '&#9679; Live' : '&#9675; Paused'}
          </button>
        </div>
      </div>

      <!-- Filters -->
      <div class="table-toolbar mb-4">
        <div class="table-toolbar-left">
          <div class="table-search">
            <svg class="table-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" placeholder="Search activities..." value="${this._searchTerm}" oninput="ActivityFeed._searchTerm=this.value; ActivityFeed.render();">
          </div>
        </div>
        <div class="table-toolbar-right">
          <div class="flex gap-2">
            ${['all','signins','devices','policies','admin'].map(f => `
              <button class="chip ${this._filter === f ? 'chip-active' : ''}" onclick="ActivityFeed._filter='${f}'; ActivityFeed.render();">${f === 'all' ? 'All' : f === 'signins' ? 'Sign-ins' : f === 'devices' ? 'Devices' : f === 'policies' ? 'Policies' : 'Admin'}</button>
            `).join('')}
          </div>
        </div>
      </div>

      <!-- Stats -->
      <div class="grid grid-4 gap-4 mb-4">
        <div class="stat-card"><div class="stat-card-value">${activities.length}</div><div class="stat-card-label">Total Events</div></div>
        <div class="stat-card"><div class="stat-card-value text-primary">${activities.filter(a => a.category === 'signins').length}</div><div class="stat-card-label">Sign-ins</div></div>
        <div class="stat-card"><div class="stat-card-value text-success">${activities.filter(a => a.category === 'devices').length}</div><div class="stat-card-label">Device Events</div></div>
        <div class="stat-card"><div class="stat-card-value text-warning">${activities.filter(a => a.category === 'admin').length}</div><div class="stat-card-label">Admin Actions</div></div>
      </div>

      <!-- Activity List -->
      <div class="card">
        <div class="card-body" style="padding:0;">
          ${filtered.length === 0 ? `
            <div class="empty-state" style="padding:3rem;">
              <p class="text-sm text-muted">No activities to show. Connect tenants and load data to see activity.</p>
            </div>
          ` : `
            <div style="max-height:600px;overflow-y:auto;">
              ${filtered.slice(0, 100).map(a => `
                <div style="display:flex;gap:12px;padding:12px 16px;border-bottom:1px solid var(--border-light);${a._isNew ? 'background:var(--primary-bg);' : ''}">
                  <div style="flex-shrink:0;margin-top:2px;">${this._icon(a.category)}</div>
                  <div style="flex:1;min-width:0;">
                    <div style="display:flex;justify-content:space-between;align-items:flex-start;">
                      <div>
                        <span class="fw-500 text-sm">${a.title}</span>
                        ${a.tenant ? `<span class="chip" style="margin-left:8px;font-size:10px;">${a.tenant}</span>` : ''}
                      </div>
                      <span class="text-xs text-muted" style="flex-shrink:0;">${this._timeAgo(a.timestamp)}</span>
                    </div>
                    <div class="text-xs text-muted" style="margin-top:2px;">${a.description}</div>
                    ${a.user ? `<div class="text-xs text-muted" style="margin-top:2px;">User: ${a.user}</div>` : ''}
                  </div>
                </div>
              `).join('')}
            </div>
          `}
        </div>
      </div>
    `;

    this._startAutoRefresh();
  },

  _getActivities() {
    const activities = [];
    const tenants = AppState.get('tenants');
    const now = Date.now();

    tenants.forEach(t => {
      // Device events
      const devices = AppState.get('devices')[t.id] || [];
      devices.forEach(d => {
        // Recent enrollments
        if (d.enrolledDateTime) {
          const enrollTime = new Date(d.enrolledDateTime).getTime();
          if (now - enrollTime < 30 * 86400000) { // Last 30 days
            activities.push({
              category: 'devices',
              title: 'Device Enrolled',
              description: `${d.deviceName || 'Unknown'} (${d.operatingSystem || ''}) enrolled in management`,
              tenant: t.displayName,
              timestamp: enrollTime,
              _isNew: now - enrollTime < 86400000
            });
          }
        }
        // Recent syncs
        if (d.lastSyncDateTime) {
          const syncTime = new Date(d.lastSyncDateTime).getTime();
          if (now - syncTime < 3600000) { // Last hour
            activities.push({
              category: 'devices',
              title: 'Device Synced',
              description: `${d.deviceName || 'Unknown'} completed sync`,
              tenant: t.displayName,
              timestamp: syncTime
            });
          }
        }
        // Non-compliance events
        if (d.complianceState === 'noncompliant' && d.complianceGracePeriodExpirationDateTime) {
          activities.push({
            category: 'policies',
            title: 'Compliance Violation',
            description: `${d.deviceName || 'Unknown'} is non-compliant`,
            tenant: t.displayName,
            timestamp: new Date(d.complianceGracePeriodExpirationDateTime).getTime() || now - 3600000
          });
        }
      });

      // User sign-in activity
      const users = AppState.get('users')[t.id] || [];
      users.forEach(u => {
        if (u.signInActivity?.lastSignInDateTime) {
          const signInTime = new Date(u.signInActivity.lastSignInDateTime).getTime();
          if (now - signInTime < 86400000) { // Last 24h
            activities.push({
              category: 'signins',
              title: 'User Sign-In',
              description: `${u.displayName || 'Unknown'} signed in`,
              user: u.userPrincipalName,
              tenant: t.displayName,
              timestamp: signInTime
            });
          }
        }
      });
    });

    // Add audit log entries
    if (typeof AuditLog !== 'undefined') {
      const logs = AuditLog.getEntries ? AuditLog.getEntries() : [];
      logs.slice(0, 50).forEach(l => {
        activities.push({
          category: 'admin',
          title: l.action || 'Admin Action',
          description: l.detail || l.message || '',
          user: l.user || '',
          tenant: l.tenant || '',
          timestamp: new Date(l.timestamp || l.date).getTime() || now
        });
      });
    }

    return activities.sort((a, b) => b.timestamp - a.timestamp);
  },

  _applyFilters(activities) {
    let result = activities;
    if (this._filter !== 'all') {
      result = result.filter(a => a.category === this._filter);
    }
    if (this._searchTerm) {
      const s = this._searchTerm.toLowerCase();
      result = result.filter(a =>
        (a.title || '').toLowerCase().includes(s) ||
        (a.description || '').toLowerCase().includes(s) ||
        (a.user || '').toLowerCase().includes(s) ||
        (a.tenant || '').toLowerCase().includes(s)
      );
    }
    return result;
  },

  _icon(category) {
    const icons = {
      signins: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2"><path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>',
      devices: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--success)" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>',
      policies: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--warning)" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
      admin: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ink-secondary)" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09"/></svg>'
    };
    return icons[category] || icons.admin;
  },

  _timeAgo(ts) {
    const diff = Date.now() - ts;
    const min = Math.floor(diff / 60000);
    if (min < 1) return 'Just now';
    if (min < 60) return `${min}m ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h ago`;
    const d = Math.floor(hr / 24);
    return `${d}d ago`;
  },

  _toggleAutoRefresh() {
    this._autoRefresh = !this._autoRefresh;
    if (!this._autoRefresh && this._refreshTimer) {
      clearInterval(this._refreshTimer);
      this._refreshTimer = null;
    }
    this.render();
  },

  _startAutoRefresh() {
    if (this._refreshTimer) clearInterval(this._refreshTimer);
    if (this._autoRefresh) {
      this._refreshTimer = setInterval(() => {
        if (AppState.get('currentPage') === 'activityfeed') this.render();
        else { clearInterval(this._refreshTimer); this._refreshTimer = null; }
      }, 30000); // 30 seconds
    }
  },

  refresh() {
    this.render();
    Toast.show('Activity feed refreshed', 'success');
  }
};
