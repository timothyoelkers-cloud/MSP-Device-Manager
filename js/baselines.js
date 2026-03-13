/* ============================================================
   Security Baselines — Baseline templates & assignments viewer
   ============================================================ */

const Baselines = {
  searchTerm: '',

  render() {
    const main = document.getElementById('mainContent');
    const baselines = AppState.getForContext('securityBaselines');
    const isAll = AppState.get('activeTenant') === 'all';
    const filtered = this._filter(baselines);

    if (AppState.isLoading('securityBaselines') && baselines.length === 0) {
      main.innerHTML = `
        <div class="page-header"><div class="page-header-left">
          <h1 class="page-title">Security Baselines</h1><p class="page-subtitle">Loading baselines...</p>
        </div></div>${Skeleton.table(8, 5)}`;
      return;
    }

    main.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h1 class="page-title">Security Baselines</h1>
          <p class="page-subtitle">${baselines.length} baseline${baselines.length !== 1 ? 's' : ''} ${isAll ? 'across all tenants' : ''}</p>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-ghost btn-sm" onclick="Baselines.reload()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>
            Reload
          </button>
        </div>
      </div>

      <!-- Stats -->
      <div class="grid grid-3 gap-4 mb-4">
        <div class="stat-card"><div class="stat-card-value">${baselines.length}</div><div class="stat-card-label">Total Baselines</div></div>
        <div class="stat-card"><div class="stat-card-value">${baselines.filter(b => b.templateType === 'securityBaseline').length}</div><div class="stat-card-label">Security</div></div>
        <div class="stat-card"><div class="stat-card-value">${baselines.filter(b => b.templateType !== 'securityBaseline').length}</div><div class="stat-card-label">Other</div></div>
      </div>

      <!-- Toolbar -->
      <div class="table-toolbar">
        <div class="table-toolbar-left">
          <div class="table-search">
            <svg class="table-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" placeholder="Search baselines..." value="${this.searchTerm}" oninput="Baselines.searchTerm=this.value; Baselines.render();">
          </div>
        </div>
      </div>

      <!-- Grid -->
      <div class="grid grid-auto gap-4">
        ${filtered.length === 0 ? `
          <div class="card"><div class="empty-state" style="padding:3rem;">
            <h3 class="empty-state-title">No Security Baselines</h3>
            <p class="empty-state-text">No security baseline templates found. These are configured in Intune > Endpoint Security > Security Baselines.</p>
            <button class="btn btn-primary btn-sm" onclick="Baselines.reload()">Reload</button>
          </div></div>
        ` : filtered.map(b => `
          <div class="card" style="cursor:pointer;" onclick="Baselines.showDetail('${b._tenantId}','${b.id}')">
            <div style="padding:16px;">
              <div class="flex items-center justify-between mb-2">
                <span class="badge ${b.templateType === 'securityBaseline' ? 'badge-blue' : 'badge-default'}">${b.templateType || 'Baseline'}</span>
                ${isAll ? `<span class="chip">${AppState.getTenantName(b._tenantId)}</span>` : ''}
              </div>
              <div class="fw-500 mb-1">${b.displayName || 'Unnamed'}</div>
              <div class="text-xs text-muted mb-2">${b.description || 'No description'}</div>
              <div class="text-xs text-muted">
                ${b.publishedDateTime ? 'Published: ' + new Date(b.publishedDateTime).toLocaleDateString() : ''}
                ${b.versionInfo ? ' · v' + b.versionInfo : ''}
              </div>
            </div>
          </div>
        `).join('')}
      </div>

      <!-- Detail Panel -->
      <div class="detail-panel" id="baselineDetailPanel">
        <div class="detail-panel-header">
          <h3 class="detail-panel-title" id="baselineDetailTitle">Baseline Details</h3>
          <button class="detail-panel-close" onclick="Baselines.closeDetail()">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="detail-panel-body" id="baselineDetailBody"></div>
      </div>
    `;
  },

  _filter(baselines) {
    if (!this.searchTerm) return baselines;
    const s = this.searchTerm.toLowerCase();
    return baselines.filter(b =>
      (b.displayName || '').toLowerCase().includes(s) ||
      (b.description || '').toLowerCase().includes(s)
    );
  },

  showDetail(tenantId, baselineId) {
    const baselines = AppState.getForContext('securityBaselines');
    const b = baselines.find(bl => bl.id === baselineId && bl._tenantId === tenantId);
    if (!b) return;

    document.getElementById('baselineDetailTitle').textContent = b.displayName || 'Baseline Details';
    document.getElementById('baselineDetailBody').innerHTML = `
      <div class="detail-section">
        <div class="detail-section-title">Overview</div>
        <div class="detail-row"><span class="detail-label">Name</span><span class="detail-value">${b.displayName || '-'}</span></div>
        <div class="detail-row"><span class="detail-label">Description</span><span class="detail-value">${b.description || '-'}</span></div>
        <div class="detail-row"><span class="detail-label">Type</span><span class="detail-value">${b.templateType || '-'}</span></div>
        <div class="detail-row"><span class="detail-label">Version</span><span class="detail-value">${b.versionInfo || '-'}</span></div>
        <div class="detail-row"><span class="detail-label">Published</span><span class="detail-value">${b.publishedDateTime ? new Date(b.publishedDateTime).toLocaleString() : '-'}</span></div>
        <div class="detail-row"><span class="detail-label">Intent Count</span><span class="detail-value">${b.intentCount || 0}</span></div>
        <div class="detail-row"><span class="detail-label">Is Deprecated</span><span class="detail-value">${b.isDeprecated ? '<span class="badge badge-warning">Deprecated</span>' : '<span class="badge badge-success">Current</span>'}</span></div>
      </div>

      <div class="detail-section">
        <div class="detail-section-title">Platform & Categories</div>
        <div class="detail-row"><span class="detail-label">Platform Type</span><span class="detail-value">${b.platformType || '-'}</span></div>
        ${(b.templateSubtype || []).length > 0 ? `<div class="detail-row"><span class="detail-label">Subtypes</span><span class="detail-value">${b.templateSubtype}</span></div>` : ''}
      </div>

      <div class="detail-section">
        <div class="detail-section-title">Raw JSON</div>
        <pre style="background:var(--gray-50);padding:12px;border-radius:8px;font-size:11px;overflow-x:auto;max-height:400px;">${JSON.stringify(b, null, 2)}</pre>
      </div>
    `;
    document.getElementById('baselineDetailPanel').classList.add('open');
  },

  closeDetail() {
    document.getElementById('baselineDetailPanel')?.classList.remove('open');
  },

  async reload() {
    const tenants = AppState.get('tenants');
    Auth._isUserInitiated = true;
    for (const t of tenants) {
      await Graph.loadSecurityBaselines(t.id).catch(() => {});
    }
    Auth._isUserInitiated = false;
    this.render();
  }
};
