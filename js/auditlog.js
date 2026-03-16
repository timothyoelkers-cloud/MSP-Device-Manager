/* ============================================================
   Audit Log — Local + Graph API audit and sign-in logs
   ============================================================ */

const AuditLog = {
  searchTerm: '',
  filter: 'all',
  page: 1,
  perPage: 50,
  _tab: 'local',
  _graphAuditLogs: [],
  _graphSignInLogs: [],

  render() {
    const main = document.getElementById('mainContent');
    const entries = this._getEntries();
    const filtered = this._filter(entries);
    const totalPages = Math.ceil(filtered.length / this.perPage);
    const paged = filtered.slice((this.page - 1) * this.perPage, this.page * this.perPage);

    const actions = entries.filter(e => e.type === 'action').length;
    const errors = entries.filter(e => e.type === 'error').length;
    const today = entries.filter(e => {
      const d = new Date(e.timestamp);
      const now = new Date();
      return d.toDateString() === now.toDateString();
    }).length;

    main.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h1 class="page-title">Audit Log</h1>
          <p class="page-subtitle">${entries.length} local entries recorded</p>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-secondary btn-sm" onclick="AuditLog.exportCSV()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Export
          </button>
          <button class="btn btn-ghost btn-sm text-danger" onclick="AuditLog.clearLog()">Clear Log</button>
        </div>
      </div>

      <!-- Stats -->
      <div class="grid grid-4 gap-4 mb-4">
        <div class="stat-card"><div class="stat-card-value">${entries.length}</div><div class="stat-card-label">Total Entries</div></div>
        <div class="stat-card"><div class="stat-card-value text-primary">${actions}</div><div class="stat-card-label">Actions</div></div>
        <div class="stat-card"><div class="stat-card-value text-danger">${errors}</div><div class="stat-card-label">Errors</div></div>
        <div class="stat-card"><div class="stat-card-value text-success">${today}</div><div class="stat-card-label">Today</div></div>
      </div>

      <!-- Tabs -->
      <div class="tabs" style="margin-bottom:16px;">
        <div class="tab ${this._tab === 'local' ? 'active' : ''}" onclick="AuditLog._tab='local'; AuditLog.render();">Local Activity</div>
        <div class="tab ${this._tab === 'directory' ? 'active' : ''}" onclick="AuditLog._tab='directory'; AuditLog._loadDirectoryAudits();">Directory Audits</div>
        <div class="tab ${this._tab === 'signins' ? 'active' : ''}" onclick="AuditLog._tab='signins'; AuditLog._loadSignInLogs();">Sign-In Logs</div>
      </div>

      <div id="auditLogContent"></div>
    `;

    if (this._tab === 'local') {
      this._renderLocalLog(filtered, paged, totalPages);
    }
  },

  _renderLocalLog(filtered, paged, totalPages) {
    const container = document.getElementById('auditLogContent');
    if (!container) return;

    container.innerHTML = `
      <!-- Toolbar -->
      <div class="table-toolbar">
        <div class="table-toolbar-left">
          <div class="table-search">
            <svg class="table-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" placeholder="Search log entries..." value="${this.searchTerm}" oninput="AuditLog.searchTerm=this.value; AuditLog.page=1; AuditLog.render();">
          </div>
        </div>
        <div class="table-toolbar-right">
          <div class="flex gap-2">
            ${['all','action','error'].map(f => `
              <button class="chip ${this.filter === f ? 'chip-active' : ''}" onclick="AuditLog.filter='${f}'; AuditLog.page=1; AuditLog.render();">${f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}</button>
            `).join('')}
          </div>
        </div>
      </div>

      <!-- Table -->
      <div class="table-wrapper">
        <table class="table">
          <thead><tr>
            <th>Timestamp</th>
            <th>Type</th>
            <th>Action</th>
            <th>Details</th>
            <th>Tenant</th>
          </tr></thead>
          <tbody>
            ${paged.length === 0 ? `
              <tr><td colspan="5" class="text-center text-muted" style="padding:3rem;">
                ${this._getEntries().length === 0 ? 'No audit log entries yet. Actions will be recorded as you use the app.' : 'No entries match your filter.'}
              </td></tr>
            ` : paged.map(e => `
              <tr>
                <td class="text-sm text-muted" style="white-space:nowrap;">${new Date(e.timestamp).toLocaleString()}</td>
                <td><span class="badge ${e.type === 'error' ? 'badge-danger' : e.type === 'action' ? 'badge-blue' : 'badge-default'}">${e.type}</span></td>
                <td class="fw-500 text-sm">${e.action || '-'}</td>
                <td class="text-sm text-muted" style="max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${e.details || '-'}</td>
                <td class="text-sm">${e.tenant ? `<span class="chip">${e.tenant}</span>` : '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      ${totalPages > 1 ? `
        <div class="table-pagination">
          <span class="text-sm text-muted">Showing ${(this.page-1)*this.perPage+1}–${Math.min(this.page*this.perPage, filtered.length)} of ${filtered.length}</span>
          <div class="table-pagination-pages">
            <button class="table-pagination-btn" ${this.page <= 1 ? 'disabled' : ''} onclick="AuditLog.page--; AuditLog.render();">&#8249;</button>
            <button class="table-pagination-btn" ${this.page >= totalPages ? 'disabled' : ''} onclick="AuditLog.page++; AuditLog.render();">&#8250;</button>
          </div>
        </div>
      ` : ''}
    `;
  },

  // --- Directory Audit Logs (Graph API) ---
  async _loadDirectoryAudits() {
    const container = document.getElementById('auditLogContent');
    if (!container) return;

    const tenant = AppState.get('activeTenant');
    if (tenant === 'all') {
      container.innerHTML = '<div class="text-center text-muted" style="padding:3rem;">Select a specific tenant to view directory audit logs.</div>';
      return;
    }

    container.innerHTML = '<div class="text-center text-muted" style="padding:3rem;">Loading directory audit logs...</div>';

    try {
      const result = await Graph.getDirectoryAuditLogs(tenant, 100);
      this._graphAuditLogs = result?.value || [];
      this._renderDirectoryAudits();
    } catch (err) {
      container.innerHTML = `<div class="text-center" style="padding:3rem;">
        <div class="text-danger fw-500">Failed to load directory audit logs</div>
        <div class="text-sm text-muted" style="margin-top:8px;">${err.message}</div>
        <div class="text-xs text-muted" style="margin-top:4px;">Requires AuditLog.Read.All permission in your App Registration.</div>
      </div>`;
    }
  },

  _renderDirectoryAudits() {
    const container = document.getElementById('auditLogContent');
    if (!container) return;
    const logs = this._graphAuditLogs;

    container.innerHTML = `
      <div class="table-toolbar">
        <div class="table-toolbar-left">
          <div class="table-search">
            <svg class="table-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" placeholder="Search directory audits..." oninput="AuditLog._filterDirectoryTable(this.value)">
          </div>
        </div>
        <div class="table-toolbar-right">
          <span class="text-sm text-muted">${logs.length} entries from Azure AD</span>
        </div>
      </div>
      <div class="table-wrapper">
        <table class="table" id="directoryAuditTable">
          <thead><tr>
            <th>Timestamp</th>
            <th>Activity</th>
            <th>Category</th>
            <th>Initiated By</th>
            <th>Target</th>
            <th>Result</th>
          </tr></thead>
          <tbody>
            ${logs.length === 0 ? `
              <tr><td colspan="6" class="text-center text-muted" style="padding:3rem;">No directory audit logs found.</td></tr>
            ` : logs.map(l => {
              const initiator = l.initiatedBy?.user?.displayName || l.initiatedBy?.app?.displayName || 'System';
              const target = l.targetResources?.[0]?.displayName || l.targetResources?.[0]?.userPrincipalName || '-';
              const isSuccess = l.result === 'success';
              return `
              <tr>
                <td class="text-sm text-muted" style="white-space:nowrap;">${new Date(l.activityDateTime).toLocaleString()}</td>
                <td class="fw-500 text-sm">${l.activityDisplayName || '-'}</td>
                <td><span class="badge badge-default">${l.category || '-'}</span></td>
                <td class="text-sm">${initiator}</td>
                <td class="text-sm text-muted" style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${target}</td>
                <td><span class="badge ${isSuccess ? 'badge-success' : 'badge-danger'}">${l.result || '-'}</span></td>
              </tr>
            `}).join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  _filterDirectoryTable(term) {
    const rows = document.querySelectorAll('#directoryAuditTable tbody tr');
    rows.forEach(row => {
      row.style.display = row.textContent.toLowerCase().includes(term.toLowerCase()) ? '' : 'none';
    });
  },

  // --- Sign-In Logs (Graph API) ---
  async _loadSignInLogs() {
    const container = document.getElementById('auditLogContent');
    if (!container) return;

    const tenant = AppState.get('activeTenant');
    if (tenant === 'all') {
      container.innerHTML = '<div class="text-center text-muted" style="padding:3rem;">Select a specific tenant to view sign-in logs.</div>';
      return;
    }

    container.innerHTML = '<div class="text-center text-muted" style="padding:3rem;">Loading sign-in logs...</div>';

    try {
      const result = await Graph.getSignInLogs(tenant, 100);
      this._graphSignInLogs = result?.value || [];
      this._renderSignInLogs();
    } catch (err) {
      container.innerHTML = `<div class="text-center" style="padding:3rem;">
        <div class="text-danger fw-500">Failed to load sign-in logs</div>
        <div class="text-sm text-muted" style="margin-top:8px;">${err.message}</div>
        <div class="text-xs text-muted" style="margin-top:4px;">Requires AuditLog.Read.All and Directory.Read.All permissions. Sign-in logs require Azure AD Premium P1.</div>
      </div>`;
    }
  },

  _renderSignInLogs() {
    const container = document.getElementById('auditLogContent');
    if (!container) return;
    const logs = this._graphSignInLogs;

    // Compute stats
    const successCount = logs.filter(l => l.status?.errorCode === 0).length;
    const failCount = logs.filter(l => l.status?.errorCode !== 0).length;
    const mfaCount = logs.filter(l => l.mfaDetail?.authMethod).length;

    container.innerHTML = `
      <!-- Sign-in stats -->
      <div class="grid grid-3 gap-4 mb-4">
        <div class="stat-card">
          <div class="stat-card-value text-success">${successCount}</div>
          <div class="stat-card-label">Successful Sign-Ins</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-value text-danger">${failCount}</div>
          <div class="stat-card-label">Failed Sign-Ins</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-value text-primary">${mfaCount}</div>
          <div class="stat-card-label">MFA Authenticated</div>
        </div>
      </div>

      <div class="table-toolbar">
        <div class="table-toolbar-left">
          <div class="table-search">
            <svg class="table-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" placeholder="Search sign-in logs..." oninput="AuditLog._filterSignInTable(this.value)">
          </div>
        </div>
        <div class="table-toolbar-right">
          <span class="text-sm text-muted">${logs.length} sign-in events</span>
        </div>
      </div>
      <div class="table-wrapper">
        <table class="table" id="signInTable">
          <thead><tr>
            <th>Timestamp</th>
            <th>User</th>
            <th>Application</th>
            <th>IP Address</th>
            <th>Location</th>
            <th>Status</th>
            <th>MFA</th>
          </tr></thead>
          <tbody>
            ${logs.length === 0 ? `
              <tr><td colspan="7" class="text-center text-muted" style="padding:3rem;">No sign-in logs found.</td></tr>
            ` : logs.map(l => {
              const isSuccess = l.status?.errorCode === 0;
              const location = l.location ? [l.location.city, l.location.state, l.location.countryOrRegion].filter(Boolean).join(', ') : '-';
              const hasMFA = l.mfaDetail?.authMethod || (l.authenticationDetails || []).some(a => a.authenticationMethod && a.authenticationMethod !== 'Password');
              return `
              <tr>
                <td class="text-sm text-muted" style="white-space:nowrap;">${new Date(l.createdDateTime).toLocaleString()}</td>
                <td>
                  <div class="fw-500 text-sm">${l.userDisplayName || '-'}</div>
                  <div class="text-xs text-muted">${l.userPrincipalName || ''}</div>
                </td>
                <td class="text-sm">${l.appDisplayName || l.resourceDisplayName || '-'}</td>
                <td class="text-mono text-sm">${l.ipAddress || '-'}</td>
                <td class="text-sm text-muted">${location}</td>
                <td><span class="badge ${isSuccess ? 'badge-success' : 'badge-danger'}">${isSuccess ? 'Success' : (l.status?.failureReason || 'Failed')}</span></td>
                <td>${hasMFA
                  ? '<span class="badge badge-primary">MFA</span>'
                  : '<span class="badge badge-default">No MFA</span>'
                }</td>
              </tr>
            `}).join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  _filterSignInTable(term) {
    const rows = document.querySelectorAll('#signInTable tbody tr');
    rows.forEach(row => {
      row.style.display = row.textContent.toLowerCase().includes(term.toLowerCase()) ? '' : 'none';
    });
  },

  _filter(entries) {
    let result = entries;
    if (this.filter !== 'all') result = result.filter(e => e.type === this.filter);
    if (this.searchTerm) {
      const s = this.searchTerm.toLowerCase();
      result = result.filter(e =>
        (e.action || '').toLowerCase().includes(s) ||
        (e.details || '').toLowerCase().includes(s) ||
        (e.tenant || '').toLowerCase().includes(s)
      );
    }
    return result;
  },

  // Public API: log an entry
  log(action, details, tenant, type) {
    const entries = this._getEntries();
    entries.unshift({
      timestamp: new Date().toISOString(),
      type: type || 'action',
      action,
      details: details || '',
      tenant: tenant || ''
    });
    if (entries.length > 1000) entries.length = 1000;
    localStorage.setItem('msp_audit_log', JSON.stringify(entries));
  },

  logError(action, error, tenant) {
    this.log(action, typeof error === 'string' ? error : (error?.message || 'Unknown error'), tenant, 'error');
  },

  _getEntries() {
    try { return JSON.parse(localStorage.getItem('msp_audit_log') || '[]'); } catch { return []; }
  },

  clearLog() {
    if (!confirm('Clear all local audit log entries? This cannot be undone.')) return;
    localStorage.removeItem('msp_audit_log');
    Toast.show('Audit log cleared', 'info');
    this.render();
  },

  exportCSV() {
    let entries;
    if (this._tab === 'directory') {
      entries = this._graphAuditLogs.map(l => ({
        timestamp: l.activityDateTime,
        type: 'directory',
        action: l.activityDisplayName,
        details: l.targetResources?.[0]?.displayName || '',
        tenant: l.initiatedBy?.user?.displayName || ''
      }));
    } else if (this._tab === 'signins') {
      entries = this._graphSignInLogs.map(l => ({
        timestamp: l.createdDateTime,
        type: 'signin',
        action: `${l.userDisplayName} -> ${l.appDisplayName}`,
        details: l.status?.errorCode === 0 ? 'Success' : (l.status?.failureReason || 'Failed'),
        tenant: l.ipAddress || ''
      }));
    } else {
      entries = this._getEntries();
    }

    let csv = 'Timestamp,Type,Action,Details,Tenant\n';
    entries.forEach(e => {
      csv += [e.timestamp, e.type, e.action, e.details, e.tenant].map(v => `"${String(v || '').replace(/"/g, '""')}"`).join(',') + '\n';
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `audit_log_${this._tab}_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    Toast.show('Audit log exported', 'success');
  }
};
