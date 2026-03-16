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
      ${this._renderSecurityPosture(selected)}
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
    const values = tenants.map(t => valueFn(t));
    // Highlight best/worst if numeric
    const nums = values.map(v => parseFloat(v));
    const allNumeric = nums.every(n => !isNaN(n));
    const max = allNumeric ? Math.max(...nums) : null;
    const min = allNumeric ? Math.min(...nums) : null;

    return `<tr>
      <td class="fw-500">${label}</td>
      ${values.map((v, i) => {
        let style = '';
        if (allNumeric && nums.length > 1) {
          if (nums[i] === max && max !== min) style = 'color:var(--success);font-weight:600;';
          if (nums[i] === min && max !== min && label.includes('Rate')) style = 'color:var(--danger);font-weight:600;';
        }
        return `<td style="${style}">${v}</td>`;
      }).join('')}
    </tr>`;
  },

  // --- Security Posture Score ---
  _renderSecurityPosture(tenants) {
    return `
      <div class="card mb-4">
        <div class="card-header"><div class="card-header-title">Security Posture Score</div></div>
        <div class="card-body">
          <div style="display:grid;grid-template-columns:repeat(${Math.min(tenants.length, 4)}, 1fr);gap:16px;">
            ${tenants.map(t => {
              const score = this._calcSecurityScore(t);
              const color = score >= 80 ? 'var(--success)' : score >= 50 ? 'var(--warning)' : 'var(--danger)';
              return `
                <div style="text-align:center;padding:20px;border:1px solid var(--border);border-radius:10px;">
                  <div style="position:relative;width:80px;height:80px;margin:0 auto 12px;">
                    <svg viewBox="0 0 36 36" style="transform:rotate(-90deg);">
                      <path d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none" stroke="var(--gray-100)" stroke-width="3"/>
                      <path d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none" stroke="${color}" stroke-width="3"
                            stroke-dasharray="${score}, 100"/>
                    </svg>
                    <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:700;color:${color};">${score}</div>
                  </div>
                  <div class="fw-500">${t.displayName}</div>
                  <div class="text-xs text-muted">${score >= 80 ? 'Strong' : score >= 50 ? 'Moderate' : 'Needs Attention'}</div>
                </div>`;
            }).join('')}
          </div>
        </div>
      </div>`;
  },

  _calcSecurityScore(tenant) {
    let score = 0, total = 0;
    const devices = AppState.get('devices')[tenant.id] || [];
    const users = AppState.get('users')[tenant.id] || [];
    const caPolicies = AppState.get('caPolicies')[tenant.id] || [];
    const compPolicies = AppState.get('compliancePolicies')[tenant.id] || [];

    // Compliance rate (30 pts)
    total += 30;
    if (devices.length > 0) {
      const compliant = devices.filter(d => d.complianceState === 'compliant').length;
      score += Math.round((compliant / devices.length) * 30);
    }

    // Encryption rate (20 pts)
    total += 20;
    if (devices.length > 0) {
      const encrypted = devices.filter(d => d.isEncrypted).length;
      score += Math.round((encrypted / devices.length) * 20);
    }

    // Has CA policies (15 pts)
    total += 15;
    if (caPolicies.length >= 3) score += 15;
    else if (caPolicies.length >= 1) score += 8;

    // Has compliance policies (15 pts)
    total += 15;
    if (compPolicies.length >= 3) score += 15;
    else if (compPolicies.length >= 1) score += 8;

    // Licensed users ratio (10 pts)
    total += 10;
    if (users.length > 0) {
      const licensed = users.filter(u => u.assignedLicenses?.length > 0).length;
      score += Math.round((licensed / users.length) * 10);
    }

    // Active users ratio (10 pts)
    total += 10;
    if (users.length > 0) {
      const active = users.filter(u => u.accountEnabled).length;
      score += Math.round((active / users.length) * 10);
    }

    return total > 0 ? Math.round((score / total) * 100) : 0;
  }
};
