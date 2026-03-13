/* ============================================================
   Enrollment — Enrollment configurations & restrictions viewer
   ============================================================ */

const Enrollment = {
  searchTerm: '',

  render() {
    const main = document.getElementById('mainContent');
    const configs = AppState.getForContext('enrollmentConfigs');
    const isAll = AppState.get('activeTenant') === 'all';
    const filtered = this._filter(configs);

    if (AppState.isLoading('enrollmentConfigs') && configs.length === 0) {
      main.innerHTML = `
        <div class="page-header"><div class="page-header-left">
          <h1 class="page-title">Enrollment</h1><p class="page-subtitle">Loading configurations...</p>
        </div></div>${Skeleton.table(8, 5)}`;
      return;
    }

    // Stats
    const limits = configs.filter(c => (c['@odata.type'] || '').includes('Limit')).length;
    const restrictions = configs.filter(c => (c['@odata.type'] || '').includes('Restriction')).length;
    const esp = configs.filter(c => (c['@odata.type'] || '').includes('StatusPage') || (c['@odata.type'] || '').includes('windowsHelloForBusiness')).length;

    main.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h1 class="page-title">Enrollment</h1>
          <p class="page-subtitle">${configs.length} configuration${configs.length !== 1 ? 's' : ''} ${isAll ? 'across all tenants' : ''}</p>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-ghost btn-sm" onclick="Enrollment.reload()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>
            Reload
          </button>
        </div>
      </div>

      <!-- Stats -->
      <div class="grid grid-4 gap-4 mb-4">
        <div class="stat-card"><div class="stat-card-value">${configs.length}</div><div class="stat-card-label">Total Configs</div></div>
        <div class="stat-card"><div class="stat-card-value">${limits}</div><div class="stat-card-label">Device Limits</div></div>
        <div class="stat-card"><div class="stat-card-value">${restrictions}</div><div class="stat-card-label">Platform Restrictions</div></div>
        <div class="stat-card"><div class="stat-card-value">${esp}</div><div class="stat-card-label">ESP / WHfB</div></div>
      </div>

      <!-- Toolbar -->
      <div class="table-toolbar">
        <div class="table-toolbar-left">
          <div class="table-search">
            <svg class="table-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" placeholder="Search configurations..." value="${this.searchTerm}" oninput="Enrollment.searchTerm=this.value; Enrollment.render();">
          </div>
        </div>
      </div>

      <!-- Table -->
      <div class="table-wrapper">
        <table class="table">
          <thead><tr>
            <th>Configuration Name</th>
            ${isAll ? '<th>Tenant</th>' : ''}
            <th>Type</th>
            <th>Priority</th>
            <th>Created</th>
            <th>Modified</th>
            <th></th>
          </tr></thead>
          <tbody>
            ${filtered.length === 0 ? `
              <tr><td colspan="${isAll ? 7 : 6}" class="text-center text-muted" style="padding:3rem;">
                ${configs.length === 0 ? '<div class="retry-state"><p>No enrollment configurations found.</p><button class="btn btn-primary btn-sm" onclick="Enrollment.reload()">Reload</button></div>' : 'No configurations match your search.'}
              </td></tr>
            ` : filtered.map(c => `
              <tr style="cursor:pointer;" onclick="Enrollment.showDetail('${c._tenantId}','${c.id}')">
                <td class="fw-500">${c.displayName || 'Unnamed'}</td>
                ${isAll ? `<td><span class="chip">${AppState.getTenantName(c._tenantId)}</span></td>` : ''}
                <td><span class="badge badge-default">${this._getType(c)}</span></td>
                <td class="text-sm">${c.priority !== undefined ? c.priority : '-'}</td>
                <td class="text-sm text-muted">${c.createdDateTime ? new Date(c.createdDateTime).toLocaleDateString() : '-'}</td>
                <td class="text-sm text-muted">${c.lastModifiedDateTime ? new Date(c.lastModifiedDateTime).toLocaleDateString() : '-'}</td>
                <td>
                  <button class="btn btn-sm btn-secondary" onclick="event.stopPropagation(); Enrollment.showDetail('${c._tenantId}','${c.id}')">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <!-- Detail Panel -->
      <div class="detail-panel" id="enrollDetailPanel">
        <div class="detail-panel-header">
          <h3 class="detail-panel-title" id="enrollDetailTitle">Configuration Details</h3>
          <button class="detail-panel-close" onclick="Enrollment.closeDetail()">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="detail-panel-body" id="enrollDetailBody"></div>
      </div>
    `;
  },

  _filter(configs) {
    if (!this.searchTerm) return configs;
    const s = this.searchTerm.toLowerCase();
    return configs.filter(c => (c.displayName || '').toLowerCase().includes(s));
  },

  _getType(c) {
    const t = (c['@odata.type'] || '').toLowerCase();
    if (t.includes('limit')) return 'Device Limit';
    if (t.includes('platformrestriction')) return 'Platform Restriction';
    if (t.includes('statuspage') || t.includes('enrollmentstatuspage')) return 'ESP';
    if (t.includes('helloforbusiness') || t.includes('windowshello')) return 'WHfB';
    if (t.includes('singlesignon') || t.includes('sso')) return 'SSO';
    return 'Configuration';
  },

  showDetail(tenantId, configId) {
    const configs = AppState.getForContext('enrollmentConfigs');
    const c = configs.find(cfg => cfg.id === configId && cfg._tenantId === tenantId);
    if (!c) return;

    document.getElementById('enrollDetailTitle').textContent = c.displayName || 'Configuration Details';
    document.getElementById('enrollDetailBody').innerHTML = `
      <div class="detail-section">
        <div class="detail-section-title">Overview</div>
        <div class="detail-row"><span class="detail-label">Name</span><span class="detail-value">${c.displayName || '-'}</span></div>
        <div class="detail-row"><span class="detail-label">Description</span><span class="detail-value">${c.description || '-'}</span></div>
        <div class="detail-row"><span class="detail-label">Type</span><span class="detail-value">${this._getType(c)}</span></div>
        <div class="detail-row"><span class="detail-label">Priority</span><span class="detail-value">${c.priority !== undefined ? c.priority : '-'}</span></div>
        <div class="detail-row"><span class="detail-label">Created</span><span class="detail-value">${c.createdDateTime ? new Date(c.createdDateTime).toLocaleString() : '-'}</span></div>
        <div class="detail-row"><span class="detail-label">Modified</span><span class="detail-value">${c.lastModifiedDateTime ? new Date(c.lastModifiedDateTime).toLocaleString() : '-'}</span></div>
      </div>

      ${this._renderTypeSpecific(c)}

      <div class="detail-section">
        <div class="detail-section-title">Raw JSON</div>
        <pre style="background:var(--gray-50);padding:12px;border-radius:8px;font-size:11px;overflow-x:auto;max-height:400px;">${JSON.stringify(c, null, 2)}</pre>
      </div>
    `;
    document.getElementById('enrollDetailPanel').classList.add('open');
  },

  _renderTypeSpecific(c) {
    const t = (c['@odata.type'] || '').toLowerCase();

    if (t.includes('limit')) {
      return `<div class="detail-section">
        <div class="detail-section-title">Device Limit</div>
        <div class="detail-row"><span class="detail-label">Limit</span><span class="detail-value">${c.limit || '-'}</span></div>
      </div>`;
    }

    if (t.includes('platformrestriction')) {
      const platforms = ['androidForWorkRestriction', 'androidRestriction', 'iosRestriction', 'macOSRestriction', 'windowsRestriction', 'windowsMobileRestriction'];
      return `<div class="detail-section">
        <div class="detail-section-title">Platform Restrictions</div>
        ${platforms.map(p => {
          const r = c[p];
          if (!r) return '';
          const name = p.replace('Restriction', '').replace(/([A-Z])/g, ' $1').trim();
          return `<div class="detail-row"><span class="detail-label">${name}</span><span class="detail-value">${r.platformBlocked ? '<span class="badge badge-danger">Blocked</span>' : '<span class="badge badge-success">Allowed</span>'} ${r.personalDeviceEnrollmentBlocked ? '(Personal blocked)' : ''}</span></div>`;
        }).join('')}
      </div>`;
    }

    return '';
  },

  closeDetail() {
    document.getElementById('enrollDetailPanel')?.classList.remove('open');
  },

  async reload() {
    const tenants = AppState.get('tenants');
    Auth._isUserInitiated = true;
    for (const t of tenants) {
      await Graph.loadEnrollmentConfigs(t.id).catch(() => {});
    }
    Auth._isUserInitiated = false;
    this.render();
  }
};
