/* ============================================================
   Tenant Comparison — Side-by-side tenant analysis
   ============================================================ */

const Comparison = {
  selectedTenants: [],

  render() {
    const main = document.getElementById('mainContent');
    const tenants = AppState.get('tenants');

    main.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h1 class="page-title">Tenant Comparison</h1>
          <p class="page-subtitle">Compare configuration and compliance across tenants</p>
        </div>
      </div>

      <!-- Tenant Selector -->
      <div class="card mb-4">
        <div style="padding:16px;">
          <div class="form-label mb-2">Select tenants to compare (2+):</div>
          <div class="flex flex-wrap gap-2 mb-3">
            ${tenants.map(t => `
              <label class="flex items-center gap-2" style="cursor:pointer;padding:6px 12px;border-radius:8px;background:${this.selectedTenants.includes(t.id) ? 'var(--primary-light)' : 'var(--gray-50)'};border:1px solid ${this.selectedTenants.includes(t.id) ? 'var(--primary)' : 'var(--gray-200)'};">
                <input type="checkbox" ${this.selectedTenants.includes(t.id) ? 'checked' : ''} onchange="Comparison.toggleTenant('${t.id}')">
                <span class="text-sm fw-500">${t.displayName}</span>
              </label>
            `).join('')}
          </div>
          ${tenants.length < 2 ? '<p class="text-muted text-sm">Connect at least 2 tenants to use comparison.</p>' : ''}
        </div>
      </div>

      <div id="comparisonContent">
        ${this.selectedTenants.length < 2
          ? '<div class="card"><div class="empty-state" style="padding:3rem;"><h3 class="empty-state-title">Select Tenants</h3><p class="empty-state-text">Select at least 2 tenants above to see a comparison.</p></div></div>'
          : this._renderComparison(tenants)}
      </div>
    `;
  },

  toggleTenant(tenantId) {
    const idx = this.selectedTenants.indexOf(tenantId);
    if (idx >= 0) this.selectedTenants.splice(idx, 1);
    else this.selectedTenants.push(tenantId);
    this.render();
  },

  _renderComparison(tenants) {
    const selected = tenants.filter(t => this.selectedTenants.includes(t.id));
    return `
      ${this._renderDeviceComparison(selected)}
      ${this._renderComplianceComparison(selected)}
      ${this._renderPolicyComparison(selected)}
      ${this._renderAppComparison(selected)}
      ${this._renderUserComparison(selected)}
    `;
  },

  _renderDeviceComparison(tenants) {
    return `
      <div class="card mb-4">
        <div class="card-header"><div class="card-header-title">Device Overview</div></div>
        <div class="card-body" style="overflow-x:auto;">
          <table class="table">
            <thead><tr>
              <th>Metric</th>
              ${tenants.map(t => `<th>${t.displayName}</th>`).join('')}
            </tr></thead>
            <tbody>
              ${this._compRow('Total Devices', tenants, t => {
                const devices = AppState.get('devices')[t.id] || [];
                return devices.length;
              })}
              ${this._compRow('Windows', tenants, t => {
                const devices = AppState.get('devices')[t.id] || [];
                return devices.filter(d => (d.operatingSystem || '').toLowerCase().includes('windows')).length;
              })}
              ${this._compRow('iOS/iPadOS', tenants, t => {
                const devices = AppState.get('devices')[t.id] || [];
                return devices.filter(d => (d.operatingSystem || '').toLowerCase().includes('ios')).length;
              })}
              ${this._compRow('Android', tenants, t => {
                const devices = AppState.get('devices')[t.id] || [];
                return devices.filter(d => (d.operatingSystem || '').toLowerCase().includes('android')).length;
              })}
              ${this._compRow('macOS', tenants, t => {
                const devices = AppState.get('devices')[t.id] || [];
                return devices.filter(d => (d.operatingSystem || '').toLowerCase().includes('macos')).length;
              })}
              ${this._compRow('Encrypted', tenants, t => {
                const devices = AppState.get('devices')[t.id] || [];
                const enc = devices.filter(d => d.isEncrypted).length;
                return devices.length ? Math.round(enc / devices.length * 100) + '%' : '-';
              })}
            </tbody>
          </table>
        </div>
      </div>`;
  },

  _renderComplianceComparison(tenants) {
    return `
      <div class="card mb-4">
        <div class="card-header"><div class="card-header-title">Compliance Status</div></div>
        <div class="card-body" style="overflow-x:auto;">
          <table class="table">
            <thead><tr>
              <th>Status</th>
              ${tenants.map(t => `<th>${t.displayName}</th>`).join('')}
            </tr></thead>
            <tbody>
              ${['compliant', 'noncompliant', 'unknown', 'notApplicable'].map(state => `
                ${this._compRow(state.charAt(0).toUpperCase() + state.slice(1), tenants, t => {
                  const devices = AppState.get('devices')[t.id] || [];
                  return devices.filter(d => d.complianceState === state).length;
                })}
              `).join('')}
              ${this._compRow('Compliance Rate', tenants, t => {
                const devices = AppState.get('devices')[t.id] || [];
                if (!devices.length) return '-';
                const c = devices.filter(d => d.complianceState === 'compliant').length;
                return Math.round(c / devices.length * 100) + '%';
              })}
            </tbody>
          </table>
        </div>
      </div>`;
  },

  _renderPolicyComparison(tenants) {
    return `
      <div class="card mb-4">
        <div class="card-header"><div class="card-header-title">Policies & Configuration</div></div>
        <div class="card-body" style="overflow-x:auto;">
          <table class="table">
            <thead><tr>
              <th>Category</th>
              ${tenants.map(t => `<th>${t.displayName}</th>`).join('')}
            </tr></thead>
            <tbody>
              ${this._compRow('Compliance Policies', tenants, t => (AppState.get('compliancePolicies')[t.id] || []).length)}
              ${this._compRow('Config Profiles', tenants, t => (AppState.get('configProfiles')[t.id] || []).length)}
              ${this._compRow('CA Policies', tenants, t => (AppState.get('caPolicies')[t.id] || []).length)}
              ${this._compRow('App Protection', tenants, t => (AppState.get('appProtectionPolicies')[t.id] || []).length)}
              ${this._compRow('Security Baselines', tenants, t => (AppState.get('securityBaselines')[t.id] || []).length)}
            </tbody>
          </table>
        </div>
      </div>`;
  },

  _renderAppComparison(tenants) {
    return `
      <div class="card mb-4">
        <div class="card-header"><div class="card-header-title">Applications</div></div>
        <div class="card-body" style="overflow-x:auto;">
          <table class="table">
            <thead><tr>
              <th>Metric</th>
              ${tenants.map(t => `<th>${t.displayName}</th>`).join('')}
            </tr></thead>
            <tbody>
              ${this._compRow('Total Apps', tenants, t => (AppState.get('apps')[t.id] || []).length)}
              ${this._compRow('Required', tenants, t => (AppState.get('apps')[t.id] || []).filter(a => (a.installSummary?.installedDeviceCount || 0) > 0).length)}
            </tbody>
          </table>
        </div>
      </div>`;
  },

  _renderUserComparison(tenants) {
    return `
      <div class="card mb-4">
        <div class="card-header"><div class="card-header-title">Users</div></div>
        <div class="card-body" style="overflow-x:auto;">
          <table class="table">
            <thead><tr>
              <th>Metric</th>
              ${tenants.map(t => `<th>${t.displayName}</th>`).join('')}
            </tr></thead>
            <tbody>
              ${this._compRow('Total Users', tenants, t => (AppState.get('users')[t.id] || []).length)}
              ${this._compRow('Enabled', tenants, t => (AppState.get('users')[t.id] || []).filter(u => u.accountEnabled).length)}
              ${this._compRow('Licensed', tenants, t => (AppState.get('users')[t.id] || []).filter(u => u.assignedLicenses?.length > 0).length)}
            </tbody>
          </table>
        </div>
      </div>`;
  },

  _compRow(label, tenants, valueFn) {
    return `<tr>
      <td class="fw-500">${label}</td>
      ${tenants.map(t => `<td>${valueFn(t)}</td>`).join('')}
    </tr>`;
  }
};
