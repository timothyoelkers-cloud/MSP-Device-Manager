/* ============================================================
   Audit Log — Local action history tracking
   ============================================================ */

const AuditLog = {
  searchTerm: '',
  filter: 'all', // all, action, navigation, error
  page: 1,
  perPage: 50,

  render() {
    const main = document.getElementById('mainContent');
    const entries = this._getEntries();
    const filtered = this._filter(entries);
    const totalPages = Math.ceil(filtered.length / this.perPage);
    const paged = filtered.slice((this.page - 1) * this.perPage, this.page * this.perPage);

    // Stats
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
          <p class="page-subtitle">${entries.length} entries recorded locally</p>
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
                ${entries.length === 0 ? 'No audit log entries yet. Actions will be recorded as you use the app.' : 'No entries match your filter.'}
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
            <button class="table-pagination-btn" ${this.page <= 1 ? 'disabled' : ''} onclick="AuditLog.page--; AuditLog.render();">‹</button>
            <button class="table-pagination-btn" ${this.page >= totalPages ? 'disabled' : ''} onclick="AuditLog.page++; AuditLog.render();">›</button>
          </div>
        </div>
      ` : ''}
    `;
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
    // Keep max 1000 entries
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
    if (!confirm('Clear all audit log entries? This cannot be undone.')) return;
    localStorage.removeItem('msp_audit_log');
    Toast.show('Audit log cleared', 'info');
    this.render();
  },

  exportCSV() {
    const entries = this._getEntries();
    let csv = 'Timestamp,Type,Action,Details,Tenant\n';
    entries.forEach(e => {
      csv += [e.timestamp, e.type, e.action, e.details, e.tenant].map(v => `"${String(v || '').replace(/"/g, '""')}"`).join(',') + '\n';
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `audit_log_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
  }
};
