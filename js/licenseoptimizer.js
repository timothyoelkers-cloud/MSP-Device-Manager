/* ============================================================
   LicenseOptimizer — License usage analysis and cost savings
   ============================================================ */

const LicenseOptimizer = {
  // Approximate monthly per-user costs (USD) for common SKUs
  _skuCosts: {
    'ENTERPRISEPACK': 36, 'SPE_E3': 36, 'ENTERPRISEPREMIUM': 57, 'SPE_E5': 57,
    'O365_BUSINESS_ESSENTIALS': 6, 'O365_BUSINESS_PREMIUM': 22, 'SMB_BUSINESS_PREMIUM': 22,
    'EXCHANGESTANDARD': 4, 'EXCHANGEENTERPRISE': 8, 'FLOW_FREE': 0, 'POWER_BI_STANDARD': 0,
    'TEAMS_EXPLORATORY': 0, 'AAD_PREMIUM': 6, 'AAD_PREMIUM_P2': 9, 'EMS_E3': 9.90, 'EMSPREMIUM': 16.40,
    'VISIOCLIENT': 15, 'PROJECTPREMIUM': 55, 'PROJECTPROFESSIONAL': 30,
    'MICROSOFT_365_COPILOT': 30, 'DEFENDER_ENDPOINT_P1': 3, 'DEFENDER_ENDPOINT_P2': 5.20,
    'WIN_ENT_E3': 8, 'WIN_ENT_E5': 12, 'INTUNE_A': 8, 'RIGHTSMANAGEMENT': 2,
    'ATP_ENTERPRISE': 2, 'THREAT_INTELLIGENCE': 5, 'POWERAPPS_VIRAL': 0, 'STREAM': 0,
    'M365_F1': 2.25, 'SPE_F1': 2.25, 'O365_BUSINESS': 12.50
  },

  render() {
    const main = document.getElementById('mainContent');
    const users = AppState.getForContext('users');
    const isAll = AppState.get('activeTenant') === 'all';

    // Analyze license usage
    const analysis = this._analyze(users);

    main.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h1 class="page-title">License Optimizer</h1>
          <p class="page-subtitle">Identify unused and underutilized licenses across ${isAll ? 'all tenants' : 'this tenant'}</p>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-secondary btn-sm" onclick="LicenseOptimizer.exportReport()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Export Report
          </button>
        </div>
      </div>

      <!-- Savings Summary -->
      <div class="grid grid-4 gap-4 mb-6">
        <div class="stat-card">
          <div class="stat-card-value text-danger">$${analysis.monthlySavings.toLocaleString()}</div>
          <div class="stat-card-label">Potential Monthly Savings</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-value text-danger">$${(analysis.monthlySavings * 12).toLocaleString()}</div>
          <div class="stat-card-label">Annual Savings Potential</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-value" style="color:var(--warning);">${analysis.inactiveUsers.length}</div>
          <div class="stat-card-label">Inactive Licensed Users</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-value text-primary">${analysis.duplicateLicenses.length}</div>
          <div class="stat-card-label">Potential Downgrades</div>
        </div>
      </div>

      <!-- Inactive Licensed Users -->
      ${analysis.inactiveUsers.length > 0 ? `
        <div class="card mb-4">
          <div class="card-header">
            <h3 class="card-header-title">Inactive Licensed Users (no sign-in in 30+ days)</h3>
            <span class="badge badge-danger">${analysis.inactiveUsers.length} users</span>
          </div>
          <div class="card-body" style="padding:0;max-height:350px;overflow-y:auto;">
            <table class="table">
              <thead><tr><th>User</th>${isAll ? '<th>Tenant</th>' : ''}<th>Last Sign-In</th><th>Licenses</th><th>Est. Monthly Cost</th></tr></thead>
              <tbody>
                ${analysis.inactiveUsers.slice(0, 50).map(u => `<tr>
                  <td>
                    <div class="fw-500">${u.displayName || 'Unknown'}</div>
                    <div class="text-xs text-muted">${u.userPrincipalName || ''}</div>
                  </td>
                  ${isAll ? `<td><span class="chip">${AppState.getTenantName(u._tenantId)}</span></td>` : ''}
                  <td class="text-sm text-danger">${u._lastSignIn || 'Never'}</td>
                  <td class="text-sm">${u._licenseCount} license(s)</td>
                  <td class="text-sm fw-500">$${u._estCost.toFixed(2)}</td>
                </tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>
      ` : ''}

      <!-- License Downgrade Opportunities -->
      ${analysis.duplicateLicenses.length > 0 ? `
        <div class="card mb-4">
          <div class="card-header">
            <h3 class="card-header-title">Downgrade Opportunities</h3>
          </div>
          <div class="card-body" style="padding:0;">
            <table class="table">
              <thead><tr><th>User</th>${isAll ? '<th>Tenant</th>' : ''}<th>Current Licenses</th><th>Recommendation</th><th>Savings</th></tr></thead>
              <tbody>
                ${analysis.duplicateLicenses.slice(0, 30).map(r => `<tr>
                  <td class="fw-500">${r.userName}</td>
                  ${isAll ? `<td><span class="chip">${AppState.getTenantName(r.tenantId)}</span></td>` : ''}
                  <td class="text-sm">${r.current}</td>
                  <td class="text-sm text-primary">${r.recommendation}</td>
                  <td class="text-sm fw-500 text-success">$${r.savings.toFixed(2)}/mo</td>
                </tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>
      ` : ''}

      <!-- License Summary -->
      <div class="card">
        <div class="card-header"><h3 class="card-header-title">License Allocation Summary</h3></div>
        <div class="card-body" style="padding:0;">
          <table class="table">
            <thead><tr><th>SKU</th><th>Assigned Users</th><th>Active Users (30d)</th><th>Utilization</th><th>Est. Monthly Cost</th></tr></thead>
            <tbody>
              ${analysis.skuSummary.map(s => {
                const pct = s.total > 0 ? Math.round((s.active / s.total) * 100) : 0;
                return `<tr>
                  <td class="fw-500">${s.name}</td>
                  <td>${s.total}</td>
                  <td>${s.active}</td>
                  <td>
                    <div style="display:flex;align-items:center;gap:8px;">
                      <div style="flex:1;max-width:100px;height:4px;background:var(--gray-100);border-radius:2px;overflow:hidden;">
                        <div style="height:100%;width:${pct}%;background:${pct > 70 ? 'var(--success)' : pct > 40 ? 'var(--warning)' : 'var(--danger)'};"></div>
                      </div>
                      <span class="text-xs fw-500">${pct}%</span>
                    </div>
                  </td>
                  <td class="text-sm">$${s.cost.toFixed(2)}</td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  _analyze(users) {
    const now = Date.now();
    const thirtyDays = 30 * 86400000;
    const inactiveUsers = [];
    const skuMap = {};
    let monthlySavings = 0;
    const duplicateLicenses = [];

    users.forEach(u => {
      const lastSign = u.signInActivity?.lastSignInDateTime;
      const isInactive = !lastSign || (now - new Date(lastSign).getTime()) > thirtyDays;
      const licenses = u.assignedLicenses || [];
      let userCost = 0;

      licenses.forEach(l => {
        const skuParts = (l.skuPartNumber || l.skuId || '').toUpperCase();
        const cost = this._getSkuCost(skuParts);
        userCost += cost;

        if (!skuMap[skuParts]) skuMap[skuParts] = { name: skuParts, total: 0, active: 0, cost: 0 };
        skuMap[skuParts].total++;
        skuMap[skuParts].cost += cost;
        if (!isInactive) skuMap[skuParts].active++;
      });

      if (isInactive && licenses.length > 0 && userCost > 0) {
        inactiveUsers.push({
          ...u,
          _lastSignIn: lastSign ? `${Math.floor((now - new Date(lastSign).getTime()) / 86400000)}d ago` : 'Never',
          _licenseCount: licenses.length,
          _estCost: userCost
        });
        monthlySavings += userCost;
      }

      // Check for E5 users who could be on E3
      const hasE5 = licenses.some(l => (l.skuPartNumber || '').toUpperCase().includes('E5') || (l.skuPartNumber || '').toUpperCase().includes('ENTERPRISEPREMIUM'));
      const hasE3 = licenses.some(l => (l.skuPartNumber || '').toUpperCase().includes('E3') || (l.skuPartNumber || '').toUpperCase().includes('ENTERPRISEPACK'));
      if (hasE5 && !hasE3 && !isInactive) {
        duplicateLicenses.push({
          userName: u.displayName || u.userPrincipalName,
          tenantId: u._tenantId,
          current: 'Microsoft 365 E5',
          recommendation: 'Consider E3 if advanced security not needed',
          savings: 21
        });
      }
    });

    return {
      inactiveUsers: inactiveUsers.sort((a, b) => b._estCost - a._estCost),
      duplicateLicenses,
      monthlySavings: Math.round(monthlySavings),
      skuSummary: Object.values(skuMap).sort((a, b) => b.cost - a.cost)
    };
  },

  _getSkuCost(sku) {
    for (const [key, cost] of Object.entries(this._skuCosts)) {
      if (sku.includes(key)) return cost;
    }
    return 0;
  },

  exportReport() {
    const users = AppState.getForContext('users');
    const analysis = this._analyze(users);
    let csv = 'Category,User,UPN,Tenant,Last Sign-In,Licenses,Est Monthly Cost,Recommendation\n';
    analysis.inactiveUsers.forEach(u => {
      csv += ['Inactive', u.displayName, u.userPrincipalName, AppState.getTenantName(u._tenantId), u._lastSignIn, u._licenseCount, u._estCost.toFixed(2), 'Remove or reassign licenses'].map(v => `"${String(v||'').replace(/"/g,'""')}"`).join(',') + '\n';
    });
    analysis.duplicateLicenses.forEach(r => {
      csv += ['Downgrade', r.userName, '', AppState.getTenantName(r.tenantId), '', r.current, r.savings.toFixed(2), r.recommendation].map(v => `"${String(v||'').replace(/"/g,'""')}"`).join(',') + '\n';
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = `license_optimization_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    Toast.show('License optimization report exported', 'success');
  }
};
