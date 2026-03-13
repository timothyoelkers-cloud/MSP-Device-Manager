/* ============================================================
   Conditional Access — Policy viewer & cross-tenant comparison
   ============================================================ */

const ConditionalAccess = {
  searchTerm: '',
  filter: 'all', // all, enabled, disabled, reportOnly

  render() {
    const main = document.getElementById('mainContent');
    const policies = AppState.getForContext('caPolicies');
    const isAll = AppState.get('activeTenant') === 'all';
    const filtered = this._filter(policies);

    // Stats
    const enabled = policies.filter(p => p.state === 'enabled').length;
    const disabled = policies.filter(p => p.state === 'disabled').length;
    const reportOnly = policies.filter(p => p.state === 'enabledForReportingButNotEnforced').length;

    if (AppState.isLoading('caPolicies') && policies.length === 0) {
      main.innerHTML = `
        <div class="page-header"><div class="page-header-left">
          <h1 class="page-title">Conditional Access</h1><p class="page-subtitle">Loading policies...</p>
        </div></div>${Skeleton.table(8, 5)}`;
      return;
    }

    main.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h1 class="page-title">Conditional Access</h1>
          <p class="page-subtitle">${policies.length} polic${policies.length !== 1 ? 'ies' : 'y'} ${isAll ? 'across all tenants' : ''}</p>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-ghost btn-sm" onclick="ConditionalAccess.reload()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>
            Reload
          </button>
        </div>
      </div>

      <!-- Stats -->
      <div class="grid grid-4 gap-4 mb-4">
        <div class="stat-card"><div class="stat-card-value">${policies.length}</div><div class="stat-card-label">Total Policies</div></div>
        <div class="stat-card"><div class="stat-card-value text-success">${enabled}</div><div class="stat-card-label">Enabled</div></div>
        <div class="stat-card"><div class="stat-card-value text-muted">${disabled}</div><div class="stat-card-label">Disabled</div></div>
        <div class="stat-card"><div class="stat-card-value text-primary">${reportOnly}</div><div class="stat-card-label">Report-Only</div></div>
      </div>

      <!-- Toolbar -->
      <div class="table-toolbar">
        <div class="table-toolbar-left">
          <div class="table-search">
            <svg class="table-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" placeholder="Search policies..." value="${this.searchTerm}" oninput="ConditionalAccess.searchTerm=this.value; ConditionalAccess.render();">
          </div>
        </div>
        <div class="table-toolbar-right">
          <div class="flex gap-2">
            ${['all','enabled','disabled','reportOnly'].map(f => `
              <button class="chip ${this.filter === f ? 'chip-active' : ''}" onclick="ConditionalAccess.filter='${f}'; ConditionalAccess.render();">${f === 'all' ? 'All' : f === 'reportOnly' ? 'Report-Only' : f.charAt(0).toUpperCase() + f.slice(1)}</button>
            `).join('')}
          </div>
        </div>
      </div>

      <!-- Table -->
      <div class="table-wrapper">
        <table class="table">
          <thead><tr>
            <th>Policy Name</th>
            ${isAll ? '<th>Tenant</th>' : ''}
            <th>State</th>
            <th>Conditions</th>
            <th>Grant Controls</th>
            <th>Modified</th>
            <th></th>
          </tr></thead>
          <tbody>
            ${filtered.length === 0 ? `
              <tr><td colspan="${isAll ? 7 : 6}" class="text-center text-muted" style="padding:3rem;">
                ${policies.length === 0 ? '<div class="retry-state"><p>No conditional access policies found.</p><button class="btn btn-primary btn-sm" onclick="ConditionalAccess.reload()">Reload</button></div>' : 'No policies match your filter.'}
              </td></tr>
            ` : filtered.map(p => `
              <tr style="cursor:pointer;" onclick="ConditionalAccess.showDetail('${p._tenantId}','${p.id}')">
                <td class="fw-500">${p.displayName || 'Unnamed'}</td>
                ${isAll ? `<td><span class="chip">${AppState.getTenantName(p._tenantId)}</span></td>` : ''}
                <td>${this._stateBadge(p.state)}</td>
                <td class="text-sm">${this._summarizeConditions(p)}</td>
                <td class="text-sm">${this._summarizeGrants(p)}</td>
                <td class="text-sm text-muted">${p.modifiedDateTime ? new Date(p.modifiedDateTime).toLocaleDateString() : '-'}</td>
                <td>
                  <button class="btn btn-sm btn-secondary" onclick="event.stopPropagation(); ConditionalAccess.showDetail('${p._tenantId}','${p.id}')">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <!-- Detail Panel -->
      <div class="detail-panel" id="caDetailPanel">
        <div class="detail-panel-header">
          <h3 class="detail-panel-title" id="caDetailTitle">Policy Details</h3>
          <button class="detail-panel-close" onclick="ConditionalAccess.closeDetail()">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="detail-panel-body" id="caDetailBody"></div>
      </div>
    `;
  },

  _filter(policies) {
    let result = policies;
    if (this.filter === 'enabled') result = result.filter(p => p.state === 'enabled');
    if (this.filter === 'disabled') result = result.filter(p => p.state === 'disabled');
    if (this.filter === 'reportOnly') result = result.filter(p => p.state === 'enabledForReportingButNotEnforced');
    if (this.searchTerm) {
      const s = this.searchTerm.toLowerCase();
      result = result.filter(p => (p.displayName || '').toLowerCase().includes(s));
    }
    return result;
  },

  _stateLabel(state) {
    const labels = { enabled: 'Enabled', disabled: 'Disabled', enabledForReportingButNotEnforced: 'Report-Only' };
    return labels[state] || state;
  },

  _stateBadge(state) {
    const cls = { enabled: 'badge-success', disabled: 'badge-default', enabledForReportingButNotEnforced: 'badge-blue' };
    return `<span class="badge ${cls[state] || 'badge-default'}">${this._stateLabel(state)}</span>`;
  },

  _summarizeConditions(policy) {
    const parts = [];
    const cond = policy.conditions || {};
    if (cond.users?.includeUsers?.length) parts.push(`${cond.users.includeUsers.length === 1 && cond.users.includeUsers[0] === 'All' ? 'All users' : cond.users.includeUsers.length + ' user(s)'}`);
    if (cond.applications?.includeApplications?.length) parts.push(`${cond.applications.includeApplications[0] === 'All' ? 'All apps' : cond.applications.includeApplications.length + ' app(s)'}`);
    if (cond.platforms?.includePlatforms?.length) parts.push(cond.platforms.includePlatforms.join(', '));
    if (cond.locations?.includeLocations?.length) parts.push('Location-based');
    return parts.join(' · ') || 'Not configured';
  },

  _summarizeGrants(policy) {
    const grant = policy.grantControls;
    if (!grant) return 'Not configured';
    const controls = grant.builtInControls || [];
    const labels = { mfa: 'Require MFA', compliantDevice: 'Compliant device', domainJoinedDevice: 'Domain joined', approvedApplication: 'Approved app', passwordChange: 'Password change', block: 'Block' };
    return controls.map(c => labels[c] || c).join(', ') || grant.operator || '-';
  },

  showDetail(tenantId, policyId) {
    const policies = AppState.getForContext('caPolicies');
    const p = policies.find(pol => pol.id === policyId && pol._tenantId === tenantId);
    if (!p) return;

    document.getElementById('caDetailTitle').textContent = p.displayName || 'Policy Details';
    const cond = p.conditions || {};

    document.getElementById('caDetailBody').innerHTML = `
      <div class="detail-section">
        <div class="detail-section-title">General</div>
        <div class="detail-row"><span class="detail-label">Name</span><span class="detail-value">${p.displayName || '-'}</span></div>
        <div class="detail-row"><span class="detail-label">State</span><span class="detail-value">${this._stateBadge(p.state)}</span></div>
        <div class="detail-row"><span class="detail-label">Created</span><span class="detail-value">${p.createdDateTime ? new Date(p.createdDateTime).toLocaleString() : '-'}</span></div>
        <div class="detail-row"><span class="detail-label">Modified</span><span class="detail-value">${p.modifiedDateTime ? new Date(p.modifiedDateTime).toLocaleString() : '-'}</span></div>
      </div>

      <div class="detail-section">
        <div class="detail-section-title">Conditions</div>
        <div class="detail-row"><span class="detail-label">Users Include</span><span class="detail-value text-sm">${(cond.users?.includeUsers || []).join(', ') || 'None'}</span></div>
        <div class="detail-row"><span class="detail-label">Users Exclude</span><span class="detail-value text-sm">${(cond.users?.excludeUsers || []).join(', ') || 'None'}</span></div>
        <div class="detail-row"><span class="detail-label">Apps Include</span><span class="detail-value text-sm">${(cond.applications?.includeApplications || []).join(', ') || 'None'}</span></div>
        <div class="detail-row"><span class="detail-label">Platforms</span><span class="detail-value text-sm">${(cond.platforms?.includePlatforms || []).join(', ') || 'All'}</span></div>
        <div class="detail-row"><span class="detail-label">Locations</span><span class="detail-value text-sm">${(cond.locations?.includeLocations || []).join(', ') || 'All'}</span></div>
        <div class="detail-row"><span class="detail-label">Client Apps</span><span class="detail-value text-sm">${(cond.clientAppTypes || []).join(', ') || 'All'}</span></div>
        <div class="detail-row"><span class="detail-label">Sign-in Risk</span><span class="detail-value text-sm">${(cond.signInRiskLevels || []).join(', ') || 'Not configured'}</span></div>
        <div class="detail-row"><span class="detail-label">User Risk</span><span class="detail-value text-sm">${(cond.userRiskLevels || []).join(', ') || 'Not configured'}</span></div>
      </div>

      <div class="detail-section">
        <div class="detail-section-title">Grant Controls</div>
        <div class="detail-row"><span class="detail-label">Operator</span><span class="detail-value">${p.grantControls?.operator || '-'}</span></div>
        <div class="detail-row"><span class="detail-label">Controls</span><span class="detail-value text-sm">${(p.grantControls?.builtInControls || []).join(', ') || 'None'}</span></div>
      </div>

      <div class="detail-section">
        <div class="detail-section-title">Session Controls</div>
        <div class="detail-row"><span class="detail-label">App Enforced</span><span class="detail-value">${p.sessionControls?.applicationEnforcedRestrictions?.isEnabled ? 'Yes' : 'No'}</span></div>
        <div class="detail-row"><span class="detail-label">MCAS</span><span class="detail-value">${p.sessionControls?.cloudAppSecurity?.isEnabled ? 'Yes' : 'No'}</span></div>
        <div class="detail-row"><span class="detail-label">Sign-in Frequency</span><span class="detail-value">${p.sessionControls?.signInFrequency?.isEnabled ? p.sessionControls.signInFrequency.value + ' ' + (p.sessionControls.signInFrequency.type || '') : 'Not set'}</span></div>
        <div class="detail-row"><span class="detail-label">Persistent Browser</span><span class="detail-value">${p.sessionControls?.persistentBrowser?.isEnabled ? p.sessionControls.persistentBrowser.mode : 'Not set'}</span></div>
      </div>

      <div class="detail-section">
        <div class="detail-section-title">Raw JSON</div>
        <pre style="background:var(--gray-50);padding:12px;border-radius:8px;font-size:11px;overflow-x:auto;max-height:400px;">${JSON.stringify(p, null, 2)}</pre>
      </div>
    `;
    document.getElementById('caDetailPanel').classList.add('open');
  },

  closeDetail() {
    document.getElementById('caDetailPanel')?.classList.remove('open');
  },

  async reload() {
    const tenants = AppState.get('tenants');
    Auth._isUserInitiated = true;
    for (const t of tenants) {
      await Graph.loadCAPolicies(t.id).catch(() => {});
    }
    Auth._isUserInitiated = false;
    this.render();
  }
};
