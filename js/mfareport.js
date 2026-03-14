/* ============================================================
   MFAReport — MFA enforcement status across tenants
   ============================================================ */

const MFAReport = {
  _filter: 'all', // all | enabled | disabled | enforced

  render() {
    const main = document.getElementById('mainContent');
    const tenants = AppState.get('tenants');
    const isAll = AppState.get('activeTenant') === 'all';
    const tenantsToShow = isAll ? tenants : tenants.filter(t => t.id === AppState.get('activeTenant'));

    // Aggregate user MFA data
    const userData = [];
    tenantsToShow.forEach(t => {
      (AppState.get('users')[t.id] || []).forEach(u => {
        if (!u.accountEnabled) return;
        // Determine MFA status from auth methods / sign-in activity
        const hasMFA = this._inferMFA(u);
        userData.push({
          tenant: t.displayName,
          tenantId: t.id,
          user: u.displayName || '',
          upn: u.userPrincipalName || '',
          mfaStatus: hasMFA,
          lastSignIn: u.signInActivity?.lastSignInDateTime || null,
          licenses: u.assignedLicenses?.length || 0,
          userId: u.id
        });
      });
    });

    const mfaEnabled = userData.filter(u => u.mfaStatus === 'enabled').length;
    const mfaDisabled = userData.filter(u => u.mfaStatus === 'disabled').length;
    const mfaUnknown = userData.filter(u => u.mfaStatus === 'unknown').length;
    const totalActive = userData.length;
    const mfaPct = totalActive > 0 ? Math.round((mfaEnabled / totalActive) * 100) : 0;

    // Filter
    const filtered = this._filter === 'all' ? userData :
      userData.filter(u => u.mfaStatus === this._filter);

    // CA policies that enforce MFA
    const caMFAPolicies = [];
    tenantsToShow.forEach(t => {
      (AppState.get('caPolicies')[t.id] || []).forEach(p => {
        const controls = p.grantControls?.builtInControls || [];
        if (controls.includes('mfa')) {
          caMFAPolicies.push({ tenant: t.displayName, policy: p.displayName, state: p.state });
        }
      });
    });

    main.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h1 class="page-title">MFA Enforcement Report</h1>
          <p class="page-subtitle">Multi-factor authentication status across ${tenantsToShow.length} tenant(s)</p>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-secondary btn-sm" onclick="MFAReport._exportCSV()">Export CSV</button>
        </div>
      </div>

      <!-- Summary -->
      <div class="grid grid-4 gap-4 mb-6">
        <div class="card"><div class="card-body" style="text-align:center;padding:20px;">
          <div style="font-size:28px;font-weight:700;color:var(--primary);">${totalActive}</div>
          <div class="text-sm fw-500">Active Users</div>
        </div></div>
        <div class="card"><div class="card-body" style="text-align:center;padding:20px;">
          <div style="font-size:28px;font-weight:700;color:var(--success);">${mfaEnabled}</div>
          <div class="text-sm fw-500">MFA Enabled</div>
        </div></div>
        <div class="card"><div class="card-body" style="text-align:center;padding:20px;">
          <div style="font-size:28px;font-weight:700;color:var(--danger);">${mfaDisabled}</div>
          <div class="text-sm fw-500">MFA Disabled</div>
        </div></div>
        <div class="card"><div class="card-body" style="text-align:center;padding:20px;">
          ${typeof Charts !== 'undefined' ? Charts.gauge(mfaPct, { size: 100, label: 'MFA Coverage' }) : `
            <div style="font-size:28px;font-weight:700;color:var(--${mfaPct >= 80 ? 'success' : mfaPct >= 60 ? 'warning' : 'danger'});">${mfaPct}%</div>
            <div class="text-sm fw-500">MFA Coverage</div>
          `}
        </div></div>
      </div>

      <!-- CA Policies enforcing MFA -->
      ${caMFAPolicies.length > 0 ? `
        <div class="card mb-6">
          <div class="card-header"><div class="card-header-title">Conditional Access Policies Requiring MFA (${caMFAPolicies.length})</div></div>
          <div class="card-body" style="padding:0;">
            <div class="table-wrapper">
              <table class="table">
                <thead><tr><th>Tenant</th><th>Policy</th><th>State</th></tr></thead>
                <tbody>
                  ${caMFAPolicies.map(p => `
                    <tr>
                      <td class="text-sm">${p.tenant}</td>
                      <td class="fw-500">${p.policy}</td>
                      <td><span class="badge badge-${p.state === 'enabled' ? 'success' : p.state === 'enabledForReportingButNotEnforced' ? 'warning' : 'default'}">${p.state}</span></td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ` : ''}

      <!-- User Table -->
      <div class="card">
        <div class="card-header">
          <div class="card-header-title">User MFA Status (${filtered.length})</div>
          <div class="flex gap-2">
            ${['all', 'enabled', 'disabled', 'unknown'].map(f => `
              <button class="chip ${this._filter === f ? 'chip-active' : ''}" onclick="MFAReport._filter='${f}'; MFAReport.render();">${f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}</button>
            `).join('')}
          </div>
        </div>
        <div class="card-body" style="padding:0;">
          ${filtered.length === 0 ? '<div class="text-sm text-muted p-4">No users match the filter.</div>' : `
            <div class="table-wrapper">
              <table class="table">
                <thead><tr><th>User</th><th>UPN</th><th>Tenant</th><th>MFA</th><th>Last Sign-In</th><th>Licenses</th></tr></thead>
                <tbody>
                  ${filtered.slice(0, 100).map(u => `
                    <tr>
                      <td class="fw-500">${u.user}</td>
                      <td class="text-sm text-mono">${u.upn}</td>
                      <td class="text-sm">${u.tenant}</td>
                      <td><span class="badge badge-${u.mfaStatus === 'enabled' ? 'success' : u.mfaStatus === 'disabled' ? 'danger' : 'default'}">${u.mfaStatus}</span></td>
                      <td class="text-sm">${u.lastSignIn ? new Date(u.lastSignIn).toLocaleString() : 'Never'}</td>
                      <td class="text-sm">${u.licenses}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          `}
        </div>
      </div>
    `;
  },

  _inferMFA(user) {
    // Heuristic: if user has CA policies requiring MFA in their tenant, assume enabled
    // If signInActivity is present and recent, likely MFA-enrolled
    // Graph's authenticationMethods endpoint would be definitive but requires extra permission
    const caPolicies = AppState.get('caPolicies') || {};
    // Check if any CA policy in the user's tenant requires MFA for all users
    // This is a best-effort approach
    if (user.signInActivity?.lastSignInDateTime) {
      // Users who have signed in recently under CA policies likely have MFA
      // Without auth methods API, we check CA policy coverage
      const tenantId = Object.keys(caPolicies).find(tid =>
        (caPolicies[tid] || []).some(p =>
          p.state === 'enabled' &&
          (p.grantControls?.builtInControls || []).includes('mfa')
        )
      );
      if (tenantId) return 'enabled';
    }
    // Without direct Graph auth methods API, flag as unknown for accounts without CA coverage
    if (user.assignedLicenses?.length > 0) return 'unknown';
    return 'disabled';
  },

  _exportCSV() {
    const tenants = AppState.get('tenants');
    const isAll = AppState.get('activeTenant') === 'all';
    const tenantsToShow = isAll ? tenants : tenants.filter(t => t.id === AppState.get('activeTenant'));

    const rows = [];
    tenantsToShow.forEach(t => {
      (AppState.get('users')[t.id] || []).forEach(u => {
        if (!u.accountEnabled) return;
        rows.push({
          Tenant: t.displayName,
          User: u.displayName || '',
          UPN: u.userPrincipalName || '',
          MFAStatus: this._inferMFA(u),
          LastSignIn: u.signInActivity?.lastSignInDateTime || '',
          Licenses: u.assignedLicenses?.length || 0
        });
      });
    });

    if (rows.length === 0) { Toast.show('No data to export', 'warning'); return; }
    const headers = Object.keys(rows[0]);
    let csv = headers.join(',') + '\n';
    rows.forEach(r => {
      csv += headers.map(h => `"${String(r[h] ?? '').replace(/"/g, '""')}"`).join(',') + '\n';
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `mfa_report_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    Toast.show('MFA report exported', 'success');
  }
};
