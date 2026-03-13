/* ============================================================
   App Protection — MAM policies viewer
   ============================================================ */

const AppProtection = {
  searchTerm: '',

  render() {
    const main = document.getElementById('mainContent');
    const policies = AppState.getForContext('appProtectionPolicies');
    const isAll = AppState.get('activeTenant') === 'all';
    const filtered = this._filter(policies);

    if (AppState.isLoading('appProtectionPolicies') && policies.length === 0) {
      main.innerHTML = `
        <div class="page-header"><div class="page-header-left">
          <h1 class="page-title">App Protection</h1><p class="page-subtitle">Loading policies...</p>
        </div></div>${Skeleton.table(8, 5)}`;
      return;
    }

    // Stats
    const ios = policies.filter(p => (p['@odata.type'] || '').includes('ios') || (p['@odata.type'] || '').includes('Ios')).length;
    const android = policies.filter(p => (p['@odata.type'] || '').includes('android') || (p['@odata.type'] || '').includes('Android')).length;
    const windows = policies.filter(p => (p['@odata.type'] || '').includes('windows') || (p['@odata.type'] || '').includes('Windows')).length;

    main.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h1 class="page-title">App Protection</h1>
          <p class="page-subtitle">${policies.length} MAM polic${policies.length !== 1 ? 'ies' : 'y'} ${isAll ? 'across all tenants' : ''}</p>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-ghost btn-sm" onclick="AppProtection.reload()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>
            Reload
          </button>
        </div>
      </div>

      <!-- Stats -->
      <div class="grid grid-4 gap-4 mb-4">
        <div class="stat-card"><div class="stat-card-value">${policies.length}</div><div class="stat-card-label">Total Policies</div></div>
        <div class="stat-card"><div class="stat-card-value">${ios}</div><div class="stat-card-label">iOS</div></div>
        <div class="stat-card"><div class="stat-card-value">${android}</div><div class="stat-card-label">Android</div></div>
        <div class="stat-card"><div class="stat-card-value">${windows}</div><div class="stat-card-label">Windows</div></div>
      </div>

      <!-- Toolbar -->
      <div class="table-toolbar">
        <div class="table-toolbar-left">
          <div class="table-search">
            <svg class="table-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" placeholder="Search policies..." value="${this.searchTerm}" oninput="AppProtection.searchTerm=this.value; AppProtection.render();">
          </div>
        </div>
      </div>

      <!-- Table -->
      <div class="table-wrapper">
        <table class="table">
          <thead><tr>
            <th>Policy Name</th>
            ${isAll ? '<th>Tenant</th>' : ''}
            <th>Platform</th>
            <th>Type</th>
            <th>Created</th>
            <th>Modified</th>
            <th></th>
          </tr></thead>
          <tbody>
            ${filtered.length === 0 ? `
              <tr><td colspan="${isAll ? 7 : 6}" class="text-center text-muted" style="padding:3rem;">
                ${policies.length === 0 ? '<div class="retry-state"><p>No app protection policies found.</p><button class="btn btn-primary btn-sm" onclick="AppProtection.reload()">Reload</button></div>' : 'No policies match your search.'}
              </td></tr>
            ` : filtered.map(p => `
              <tr style="cursor:pointer;" onclick="AppProtection.showDetail('${p._tenantId}','${p.id}')">
                <td class="fw-500">${p.displayName || 'Unnamed'}</td>
                ${isAll ? `<td><span class="chip">${AppState.getTenantName(p._tenantId)}</span></td>` : ''}
                <td><span class="badge badge-default">${this._getPlatform(p)}</span></td>
                <td class="text-sm">${this._getType(p)}</td>
                <td class="text-sm text-muted">${p.createdDateTime ? new Date(p.createdDateTime).toLocaleDateString() : '-'}</td>
                <td class="text-sm text-muted">${p.lastModifiedDateTime ? new Date(p.lastModifiedDateTime).toLocaleDateString() : '-'}</td>
                <td>
                  <button class="btn btn-sm btn-secondary" onclick="event.stopPropagation(); AppProtection.showDetail('${p._tenantId}','${p.id}')">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <!-- Detail Panel -->
      <div class="detail-panel" id="appProtDetailPanel">
        <div class="detail-panel-header">
          <h3 class="detail-panel-title" id="appProtDetailTitle">Policy Details</h3>
          <button class="detail-panel-close" onclick="AppProtection.closeDetail()">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="detail-panel-body" id="appProtDetailBody"></div>
      </div>
    `;
  },

  _filter(policies) {
    if (!this.searchTerm) return policies;
    const s = this.searchTerm.toLowerCase();
    return policies.filter(p => (p.displayName || '').toLowerCase().includes(s));
  },

  _getPlatform(p) {
    const t = (p['@odata.type'] || '').toLowerCase();
    if (t.includes('ios')) return 'iOS';
    if (t.includes('android')) return 'Android';
    if (t.includes('windows')) return 'Windows';
    return 'Unknown';
  },

  _getType(p) {
    const t = (p['@odata.type'] || '').toLowerCase();
    if (t.includes('managedappprotection')) return 'App Protection';
    if (t.includes('managedappconfiguration')) return 'App Configuration';
    if (t.includes('targetedmanagedapp')) return 'Targeted MAM';
    return 'MAM Policy';
  },

  showDetail(tenantId, policyId) {
    const policies = AppState.getForContext('appProtectionPolicies');
    const p = policies.find(pol => pol.id === policyId && pol._tenantId === tenantId);
    if (!p) return;

    document.getElementById('appProtDetailTitle').textContent = p.displayName || 'Policy Details';
    document.getElementById('appProtDetailBody').innerHTML = `
      <div class="detail-section">
        <div class="detail-section-title">Overview</div>
        <div class="detail-row"><span class="detail-label">Name</span><span class="detail-value">${p.displayName || '-'}</span></div>
        <div class="detail-row"><span class="detail-label">Description</span><span class="detail-value">${p.description || '-'}</span></div>
        <div class="detail-row"><span class="detail-label">Platform</span><span class="detail-value">${this._getPlatform(p)}</span></div>
        <div class="detail-row"><span class="detail-label">Type</span><span class="detail-value">${this._getType(p)}</span></div>
        <div class="detail-row"><span class="detail-label">Created</span><span class="detail-value">${p.createdDateTime ? new Date(p.createdDateTime).toLocaleString() : '-'}</span></div>
        <div class="detail-row"><span class="detail-label">Modified</span><span class="detail-value">${p.lastModifiedDateTime ? new Date(p.lastModifiedDateTime).toLocaleString() : '-'}</span></div>
        <div class="detail-row"><span class="detail-label">Version</span><span class="detail-value">${p.version || '-'}</span></div>
      </div>

      <div class="detail-section">
        <div class="detail-section-title">Data Protection</div>
        <div class="detail-row"><span class="detail-label">Data Backup</span><span class="detail-value">${p.allowedDataStorageLocations?.join(', ') || 'Not configured'}</span></div>
        <div class="detail-row"><span class="detail-label">Cut/Copy/Paste</span><span class="detail-value">${p.allowedOutboundClipboardSharingLevel || 'Not configured'}</span></div>
        <div class="detail-row"><span class="detail-label">Save As</span><span class="detail-value">${p.saveAsBlocked ? 'Blocked' : 'Allowed'}</span></div>
        <div class="detail-row"><span class="detail-label">Org Data Notification</span><span class="detail-value">${p.notificationRestriction || 'Not configured'}</span></div>
      </div>

      <div class="detail-section">
        <div class="detail-section-title">Access Requirements</div>
        <div class="detail-row"><span class="detail-label">PIN Required</span><span class="detail-value">${p.pinRequired ? 'Yes' : 'No'}</span></div>
        <div class="detail-row"><span class="detail-label">Fingerprint</span><span class="detail-value">${p.fingerprintBlocked ? 'Blocked' : 'Allowed'}</span></div>
        <div class="detail-row"><span class="detail-label">Simple PIN</span><span class="detail-value">${p.simplePinBlocked ? 'Blocked' : 'Allowed'}</span></div>
        <div class="detail-row"><span class="detail-label">Min PIN Length</span><span class="detail-value">${p.minimumPinLength || '-'}</span></div>
      </div>

      <div class="detail-section">
        <div class="detail-section-title">Conditional Launch</div>
        <div class="detail-row"><span class="detail-label">Max PIN Retries</span><span class="detail-value">${p.maximumPinRetries || '-'}</span></div>
        <div class="detail-row"><span class="detail-label">Offline Grace</span><span class="detail-value">${p.periodOfflineBeforeAccessCheck || 'Not configured'}</span></div>
        <div class="detail-row"><span class="detail-label">Min OS Version</span><span class="detail-value">${p.minimumRequiredOsVersion || 'Not configured'}</span></div>
        <div class="detail-row"><span class="detail-label">Min App Version</span><span class="detail-value">${p.minimumRequiredAppVersion || 'Not configured'}</span></div>
      </div>

      <div class="detail-section">
        <div class="detail-section-title">Raw JSON</div>
        <pre style="background:var(--gray-50);padding:12px;border-radius:8px;font-size:11px;overflow-x:auto;max-height:400px;">${JSON.stringify(p, null, 2)}</pre>
      </div>
    `;
    document.getElementById('appProtDetailPanel').classList.add('open');
  },

  closeDetail() {
    document.getElementById('appProtDetailPanel')?.classList.remove('open');
  },

  async reload() {
    const tenants = AppState.get('tenants');
    Auth._isUserInitiated = true;
    for (const t of tenants) {
      await Graph.loadAppProtectionPolicies(t.id).catch(() => {});
    }
    Auth._isUserInitiated = false;
    this.render();
  }
};
