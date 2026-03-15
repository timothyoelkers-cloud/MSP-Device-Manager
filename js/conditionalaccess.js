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
          <button class="btn btn-primary btn-sm" onclick="ConditionalAccess.showCreateWizard()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Create Policy
          </button>
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
  },

  /* ==========================================================
     CONDITIONAL ACCESS POLICY CREATOR WIZARD
     ========================================================== */

  _wizardState: {
    step: 1,
    name: '',
    state: 'enabledForReportingButNotEnforced',
    usersInclude: 'all',
    usersIncludeGroups: '',
    usersExcludeGroups: '',
    appsInclude: 'all',
    appsIncludeIds: '',
    platforms: [],
    clientAppTypes: ['browser', 'mobileAppsAndDesktopClients'],
    signInRiskLevels: [],
    userRiskLevels: [],
    grantOperator: 'OR',
    grantControls: ['mfa'],
    blockAccess: false,
  },

  showCreateWizard() {
    const tenantId = AppState.get('activeTenant');
    if (!tenantId || tenantId === 'all') {
      return Toast.show('Select a single tenant before creating a policy', 'warning');
    }
    this._wizardState = {
      step: 1, name: '', state: 'enabledForReportingButNotEnforced',
      usersInclude: 'all', usersIncludeGroups: '', usersExcludeGroups: '',
      appsInclude: 'all', appsIncludeIds: '',
      platforms: [], clientAppTypes: ['browser', 'mobileAppsAndDesktopClients'],
      signInRiskLevels: [], userRiskLevels: [],
      grantOperator: 'OR', grantControls: ['mfa'], blockAccess: false,
    };
    this._renderCreateWizard();
  },

  _renderCreateWizard() {
    document.getElementById('caCreateWizard')?.remove();
    const s = this._wizardState;
    const steps = ['Name & State', 'Conditions', 'Grant Controls', 'Review'];

    const modal = document.createElement('div');
    modal.id = 'caCreateWizard';
    modal.className = 'modal-overlay';
    modal.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.4);';
    modal.innerHTML = `
      <div class="modal" style="max-width:640px;width:95%;">
        <div class="modal-header">
          <h3 class="modal-title">Create Conditional Access Policy</h3>
          <button class="modal-close" onclick="document.getElementById('caCreateWizard').remove()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div style="display:flex;gap:0;border-bottom:1px solid var(--border);">
          ${steps.map((t, i) => `
            <div style="flex:1;text-align:center;padding:10px;font-size:12px;font-weight:500;
              ${i + 1 === s.step ? 'color:var(--primary);border-bottom:2px solid var(--primary);' : 'color:var(--ink-muted);'}
              ${i + 1 < s.step ? 'color:var(--success);' : ''}">
              ${i + 1}. ${t}
            </div>`).join('')}
        </div>
        <div class="modal-body" style="min-height:300px;max-height:60vh;overflow-y:auto;" id="caWizardBody">
          ${this._caWizardStep()}
        </div>
        <div class="modal-footer">
          ${s.step > 1 ? '<button class="btn btn-ghost" onclick="ConditionalAccess._caWizardBack()">Back</button>' : '<span></span>'}
          ${s.step < 4
            ? '<button class="btn btn-primary" onclick="ConditionalAccess._caWizardNext()">Next</button>'
            : '<button class="btn btn-primary" id="caCreateBtn" onclick="ConditionalAccess._caWizardCreate()">Create Policy</button>'}
        </div>
      </div>
    `;
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
    document.body.appendChild(modal);
  },

  _caWizardStep() {
    switch (this._wizardState.step) {
      case 1: return this._caStep1();
      case 2: return this._caStep2();
      case 3: return this._caStep3();
      case 4: return this._caStep4();
    }
  },

  _caStep1() {
    const s = this._wizardState;
    return `
      <p class="text-sm text-muted mb-3">Define the policy name and initial state.</p>
      <div class="mb-3">
        <label class="form-label">Policy Name *</label>
        <input class="form-input" id="caName" type="text" value="${s.name}" placeholder="e.g. Require MFA for All Users">
      </div>
      <div class="mb-3">
        <label class="form-label">Policy State</label>
        <select class="form-input" id="caState">
          <option value="enabledForReportingButNotEnforced" ${s.state === 'enabledForReportingButNotEnforced' ? 'selected' : ''}>Report-Only (recommended for testing)</option>
          <option value="enabled" ${s.state === 'enabled' ? 'selected' : ''}>Enabled (enforced immediately)</option>
          <option value="disabled" ${s.state === 'disabled' ? 'selected' : ''}>Disabled</option>
        </select>
        <div class="text-xs text-muted mt-1">Start in report-only mode to test impact before enforcing.</div>
      </div>`;
  },

  _caStep2() {
    const s = this._wizardState;
    const chk = (arr, val) => arr.includes(val) ? 'checked' : '';
    return `
      <p class="text-sm fw-500 mb-2">Users</p>
      <div class="mb-3" style="padding-left:8px;">
        <label class="flex items-center gap-2 mb-2">
          <input type="radio" name="caUsersInclude" value="all" ${s.usersInclude === 'all' ? 'checked' : ''} onchange="ConditionalAccess._wizardState.usersInclude='all'">
          <span class="text-sm">All users</span>
        </label>
        <label class="flex items-center gap-2 mb-2">
          <input type="radio" name="caUsersInclude" value="groups" ${s.usersInclude === 'groups' ? 'checked' : ''} onchange="ConditionalAccess._wizardState.usersInclude='groups'">
          <span class="text-sm">Select groups</span>
        </label>
        ${s.usersInclude === 'groups' ? `
          <input class="form-input mt-1" id="caUsersIncludeGroups" type="text" value="${s.usersIncludeGroups}" placeholder="Group IDs (comma-separated)" style="font-size:12px;">
        ` : ''}
        <div class="mt-2">
          <label class="form-label text-xs">Exclude Groups (optional)</label>
          <input class="form-input" id="caUsersExcludeGroups" type="text" value="${s.usersExcludeGroups}" placeholder="Group IDs to exclude (comma-separated)" style="font-size:12px;">
        </div>
      </div>

      <p class="text-sm fw-500 mb-2 mt-3">Cloud Apps</p>
      <div class="mb-3" style="padding-left:8px;">
        <label class="flex items-center gap-2 mb-1">
          <input type="radio" name="caAppsInclude" value="all" ${s.appsInclude === 'all' ? 'checked' : ''} onchange="ConditionalAccess._wizardState.appsInclude='all'">
          <span class="text-sm">All cloud apps</span>
        </label>
        <label class="flex items-center gap-2 mb-1">
          <input type="radio" name="caAppsInclude" value="office365" ${s.appsInclude === 'office365' ? 'checked' : ''} onchange="ConditionalAccess._wizardState.appsInclude='office365'">
          <span class="text-sm">Office 365</span>
        </label>
        <label class="flex items-center gap-2 mb-1">
          <input type="radio" name="caAppsInclude" value="select" ${s.appsInclude === 'select' ? 'checked' : ''} onchange="ConditionalAccess._wizardState.appsInclude='select'">
          <span class="text-sm">Select apps</span>
        </label>
        ${s.appsInclude === 'select' ? `
          <input class="form-input mt-1" id="caAppsIncludeIds" type="text" value="${s.appsIncludeIds}" placeholder="App IDs (comma-separated)" style="font-size:12px;">
        ` : ''}
      </div>

      <p class="text-sm fw-500 mb-2 mt-3">Platforms</p>
      <div class="flex flex-wrap gap-2 mb-3" style="padding-left:8px;">
        ${['android','iOS','windows','macOS','linux'].map(p => `
          <label class="flex items-center gap-1"><input type="checkbox" class="caPlatformCb" value="${p}" ${chk(s.platforms, p)}><span class="text-xs">${p}</span></label>
        `).join('')}
      </div>

      <p class="text-sm fw-500 mb-2 mt-3">Client App Types</p>
      <div class="flex flex-wrap gap-2 mb-3" style="padding-left:8px;">
        ${[{v:'browser',l:'Browser'},{v:'mobileAppsAndDesktopClients',l:'Mobile & Desktop'}].map(c => `
          <label class="flex items-center gap-1"><input type="checkbox" class="caClientCb" value="${c.v}" ${chk(s.clientAppTypes, c.v)}><span class="text-xs">${c.l}</span></label>
        `).join('')}
      </div>

      <p class="text-sm fw-500 mb-2 mt-3">Sign-in Risk</p>
      <div class="flex flex-wrap gap-2 mb-3" style="padding-left:8px;">
        ${['high','medium','low','none'].map(r => `
          <label class="flex items-center gap-1"><input type="checkbox" class="caSignInRiskCb" value="${r}" ${chk(s.signInRiskLevels, r)}><span class="text-xs">${r}</span></label>
        `).join('')}
      </div>

      <p class="text-sm fw-500 mb-2 mt-3">User Risk</p>
      <div class="flex flex-wrap gap-2" style="padding-left:8px;">
        ${['high','medium','low'].map(r => `
          <label class="flex items-center gap-1"><input type="checkbox" class="caUserRiskCb" value="${r}" ${chk(s.userRiskLevels, r)}><span class="text-xs">${r}</span></label>
        `).join('')}
      </div>`;
  },

  _caStep3() {
    const s = this._wizardState;
    const chk = (arr, val) => arr.includes(val) ? 'checked' : '';
    return `
      <p class="text-sm text-muted mb-3">Define what happens when conditions are met.</p>

      <div class="mb-4">
        <label class="flex items-center gap-2 mb-3" style="padding:10px;background:var(--danger-pale, #fef2f2);border-radius:8px;border:1px solid var(--danger, #ef4444);">
          <input type="checkbox" id="caBlockAccess" ${s.blockAccess ? 'checked' : ''}
            onchange="ConditionalAccess._wizardState.blockAccess=this.checked; document.getElementById('caWizardBody').innerHTML=ConditionalAccess._caStep3();">
          <div>
            <div class="text-sm fw-500" style="color:var(--danger);">Block Access</div>
            <div class="text-xs text-muted">Completely block access when conditions match</div>
          </div>
        </label>
      </div>

      ${!s.blockAccess ? `
        <p class="text-sm fw-500 mb-2">Grant Controls</p>
        <div class="mb-3">
          <label class="form-label text-xs">Operator</label>
          <div class="flex gap-3">
            <label class="flex items-center gap-1"><input type="radio" name="caGrantOp" value="OR" ${s.grantOperator === 'OR' ? 'checked' : ''} onchange="ConditionalAccess._wizardState.grantOperator='OR'"><span class="text-sm">Require ONE of the controls (OR)</span></label>
            <label class="flex items-center gap-1"><input type="radio" name="caGrantOp" value="AND" ${s.grantOperator === 'AND' ? 'checked' : ''} onchange="ConditionalAccess._wizardState.grantOperator='AND'"><span class="text-sm">Require ALL controls (AND)</span></label>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px;">
          ${[
            {v:'mfa', l:'Require Multi-Factor Authentication', d:'Users must complete MFA challenge'},
            {v:'compliantDevice', l:'Require Compliant Device', d:'Device must be marked compliant in Intune'},
            {v:'domainJoinedDevice', l:'Require Hybrid Azure AD Joined Device', d:'Device must be domain-joined'},
            {v:'approvedApplication', l:'Require Approved Client App', d:'Only Microsoft-approved apps allowed'},
            {v:'compliantApplication', l:'Require App Protection Policy', d:'App must have Intune protection policy'},
            {v:'passwordChange', l:'Require Password Change', d:'User must change password'},
          ].map(c => `
            <label class="flex items-center gap-3" style="padding:8px;border:1px solid var(--border);border-radius:8px;cursor:pointer;">
              <input type="checkbox" class="caGrantCb" value="${c.v}" ${chk(s.grantControls, c.v)}>
              <div>
                <div class="text-sm fw-500">${c.l}</div>
                <div class="text-xs text-muted">${c.d}</div>
              </div>
            </label>
          `).join('')}
        </div>
      ` : '<p class="text-sm text-muted">Access will be blocked. No grant controls needed.</p>'}`;
  },

  _caStep4() {
    const s = this._wizardState;
    const payload = this._buildCAPayload();
    return `
      <h3 class="text-sm fw-500 mb-3">Review Policy</h3>
      <div class="card" style="padding:16px;border:1px solid var(--border);">
        <div class="mb-3"><div class="text-xs text-muted">Policy Name</div><div class="fw-500">${s.name || '<span class="text-danger">Not set</span>'}</div></div>
        <div class="mb-3"><div class="text-xs text-muted">State</div><div class="text-sm">${this._stateLabel(s.state)}</div></div>
        <div class="mb-3"><div class="text-xs text-muted">Users</div><div class="text-sm">${s.usersInclude === 'all' ? 'All users' : 'Selected groups: ' + (s.usersIncludeGroups || 'none')}</div></div>
        ${s.usersExcludeGroups ? `<div class="mb-3"><div class="text-xs text-muted">Exclude Groups</div><div class="text-sm">${s.usersExcludeGroups}</div></div>` : ''}
        <div class="mb-3"><div class="text-xs text-muted">Applications</div><div class="text-sm">${s.appsInclude === 'all' ? 'All cloud apps' : s.appsInclude === 'office365' ? 'Office 365' : s.appsIncludeIds || 'none'}</div></div>
        ${s.platforms.length ? `<div class="mb-3"><div class="text-xs text-muted">Platforms</div><div class="text-sm">${s.platforms.join(', ')}</div></div>` : ''}
        ${s.signInRiskLevels.length ? `<div class="mb-3"><div class="text-xs text-muted">Sign-in Risk</div><div class="text-sm">${s.signInRiskLevels.join(', ')}</div></div>` : ''}
        <div class="mb-3"><div class="text-xs text-muted">Grant Controls</div><div class="text-sm">${s.blockAccess ? '<span class="badge badge-danger">Block Access</span>' : s.grantControls.join(' ' + s.grantOperator + ' ') || 'None'}</div></div>
      </div>
      <details class="mt-3">
        <summary class="text-xs text-muted" style="cursor:pointer;">View JSON payload</summary>
        <pre style="background:var(--gray-50);padding:12px;border-radius:8px;font-size:11px;overflow-x:auto;max-height:300px;margin-top:8px;">${JSON.stringify(payload, null, 2)}</pre>
      </details>`;
  },

  _captureCAStep(step) {
    const s = this._wizardState;
    if (step === 1) {
      s.name = document.getElementById('caName')?.value || '';
      s.state = document.getElementById('caState')?.value || 'enabledForReportingButNotEnforced';
    }
    if (step === 2) {
      s.usersIncludeGroups = document.getElementById('caUsersIncludeGroups')?.value || '';
      s.usersExcludeGroups = document.getElementById('caUsersExcludeGroups')?.value || '';
      s.appsIncludeIds = document.getElementById('caAppsIncludeIds')?.value || '';
      s.platforms = Array.from(document.querySelectorAll('.caPlatformCb:checked')).map(cb => cb.value);
      s.clientAppTypes = Array.from(document.querySelectorAll('.caClientCb:checked')).map(cb => cb.value);
      s.signInRiskLevels = Array.from(document.querySelectorAll('.caSignInRiskCb:checked')).map(cb => cb.value);
      s.userRiskLevels = Array.from(document.querySelectorAll('.caUserRiskCb:checked')).map(cb => cb.value);
    }
    if (step === 3) {
      s.blockAccess = document.getElementById('caBlockAccess')?.checked || false;
      if (!s.blockAccess) {
        s.grantControls = Array.from(document.querySelectorAll('.caGrantCb:checked')).map(cb => cb.value);
      }
    }
  },

  _caWizardBack() {
    this._captureCAStep(this._wizardState.step);
    this._wizardState.step--;
    this._renderCreateWizard();
  },

  _caWizardNext() {
    const s = this._wizardState;
    this._captureCAStep(s.step);
    if (s.step === 1 && !s.name.trim()) return Toast.show('Policy name is required', 'warning');
    if (s.step === 2 && s.usersInclude === 'groups' && !s.usersIncludeGroups.trim()) return Toast.show('Enter at least one group ID', 'warning');
    if (s.step === 3 && !s.blockAccess && s.grantControls.length === 0) return Toast.show('Select at least one grant control or block access', 'warning');
    s.step++;
    this._renderCreateWizard();
  },

  _buildCAPayload() {
    const s = this._wizardState;
    const parseIds = str => str.split(',').map(s => s.trim()).filter(Boolean);

    const payload = {
      displayName: s.name.trim(),
      state: s.state,
      conditions: {
        users: {
          includeUsers: s.usersInclude === 'all' ? ['All'] : [],
          includeGroups: s.usersInclude === 'groups' ? parseIds(s.usersIncludeGroups) : [],
          excludeGroups: s.usersExcludeGroups ? parseIds(s.usersExcludeGroups) : []
        },
        applications: {
          includeApplications: s.appsInclude === 'all' ? ['All'] : s.appsInclude === 'office365' ? ['Office365'] : parseIds(s.appsIncludeIds)
        },
        clientAppTypes: s.clientAppTypes.length > 0 ? s.clientAppTypes : ['all'],
      },
      grantControls: s.blockAccess
        ? { operator: 'OR', builtInControls: ['block'] }
        : { operator: s.grantOperator, builtInControls: s.grantControls }
    };

    if (s.platforms.length > 0) {
      payload.conditions.platforms = { includePlatforms: s.platforms };
    }
    if (s.signInRiskLevels.length > 0) {
      payload.conditions.signInRiskLevels = s.signInRiskLevels;
    }
    if (s.userRiskLevels.length > 0) {
      payload.conditions.userRiskLevels = s.userRiskLevels;
    }

    return payload;
  },

  async _caWizardCreate() {
    const btn = document.getElementById('caCreateBtn');
    if (btn) { btn.disabled = true; btn.textContent = 'Creating...'; }

    const tenantId = AppState.get('activeTenant');
    const payload = this._buildCAPayload();

    try {
      await Graph.call(tenantId, '/identity/conditionalAccess/policies', { method: 'POST', body: payload });
      Toast.show('Conditional access policy created successfully', 'success');
      document.getElementById('caCreateWizard')?.remove();
      await Graph.loadCAPolicies(tenantId).catch(() => {});
      this.render();
    } catch (err) {
      Toast.show('Failed to create policy: ' + err.message, 'error');
      if (btn) { btn.disabled = false; btn.textContent = 'Create Policy'; }
    }
  }
};
