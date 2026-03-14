/* ============================================================
   PolicyDrift — Cross-tenant policy drift detection
   ============================================================ */

const PolicyDrift = {
  _selectedBase: null,

  render() {
    const main = document.getElementById('mainContent');
    const tenants = AppState.get('tenants');

    if (tenants.length < 2) {
      main.innerHTML = `
        <div class="page-header"><div class="page-header-left">
          <h1 class="page-title">Policy Drift Detection</h1>
          <p class="page-subtitle">Compare policies across tenants to detect configuration drift</p>
        </div></div>
        <div class="empty-state"><h3 class="empty-state-title">Need 2+ Tenants</h3><p class="empty-state-text">Connect at least 2 tenants to detect policy drift.</p></div>`;
      return;
    }

    // Use first tenant as baseline if not selected
    if (!this._selectedBase) this._selectedBase = tenants[0].id;

    const baseTenant = tenants.find(t => t.id === this._selectedBase);
    const compareTenants = tenants.filter(t => t.id !== this._selectedBase);

    // Run drift analysis
    const driftResults = this._analyzeDrift(this._selectedBase, compareTenants.map(t => t.id));

    const totalDrifts = driftResults.reduce((s, r) => s + r.drifts.length, 0);

    main.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h1 class="page-title">Policy Drift Detection</h1>
          <p class="page-subtitle">Compare configuration against a baseline tenant</p>
        </div>
      </div>

      <!-- Baseline Selector -->
      <div class="card mb-4">
        <div class="card-body">
          <div class="flex items-center gap-3">
            <label class="form-label" style="margin:0;white-space:nowrap;">Baseline Tenant:</label>
            <select class="form-input" style="max-width:300px;" onchange="PolicyDrift._selectedBase=this.value; PolicyDrift.render();">
              ${tenants.map(t => `<option value="${t.id}" ${t.id === this._selectedBase ? 'selected' : ''}>${t.displayName}</option>`).join('')}
            </select>
            <span class="text-sm text-muted">All other tenants will be compared against this baseline.</span>
          </div>
        </div>
      </div>

      <!-- Summary -->
      <div class="grid grid-3 gap-4 mb-6">
        <div class="card"><div class="card-body" style="text-align:center;padding:20px;">
          <div style="font-size:28px;font-weight:700;color:var(--primary);">${compareTenants.length}</div>
          <div class="text-sm fw-500">Tenants Compared</div>
        </div></div>
        <div class="card"><div class="card-body" style="text-align:center;padding:20px;">
          <div style="font-size:28px;font-weight:700;color:var(--${totalDrifts === 0 ? 'success' : totalDrifts <= 5 ? 'warning' : 'danger'});">${totalDrifts}</div>
          <div class="text-sm fw-500">Drift(s) Detected</div>
        </div></div>
        <div class="card"><div class="card-body" style="text-align:center;padding:20px;">
          ${typeof Charts !== 'undefined' ? Charts.gauge(
            totalDrifts === 0 ? 100 : Math.max(0, 100 - totalDrifts * 5),
            { size: 100, label: 'Consistency Score' }
          ) : `<div style="font-size:28px;font-weight:700;color:var(--success);">${totalDrifts === 0 ? 100 : Math.max(0, 100 - totalDrifts * 5)}%</div>
          <div class="text-sm fw-500">Consistency Score</div>`}
        </div></div>
      </div>

      <!-- Drift Results per Tenant -->
      ${driftResults.map(r => `
        <div class="card mb-4">
          <div class="card-header">
            <div>
              <div class="card-header-title">${r.tenantName}</div>
              <div class="card-header-subtitle">Compared to ${baseTenant.displayName}</div>
            </div>
            <span class="badge badge-${r.drifts.length === 0 ? 'success' : 'warning'}">${r.drifts.length === 0 ? 'In Sync' : `${r.drifts.length} Drift(s)`}</span>
          </div>
          <div class="card-body" style="padding:0;">
            ${r.drifts.length === 0 ? `<div class="text-sm text-muted p-4" style="display:flex;align-items:center;gap:8px;"><span style="color:var(--success);">&#10004;</span> All policy categories match the baseline.</div>` : `
              <div class="table-wrapper">
                <table class="table">
                  <thead><tr><th>Category</th><th>Baseline (${baseTenant.displayName})</th><th>${r.tenantName}</th><th>Type</th></tr></thead>
                  <tbody>
                    ${r.drifts.map(d => `
                      <tr style="background:${d.type === 'missing' ? 'var(--danger-bg)' : d.type === 'extra' ? 'var(--warning-bg)' : 'var(--info-pale)'};">
                        <td class="fw-500">${d.category}</td>
                        <td class="text-sm">${d.baseline}</td>
                        <td class="text-sm">${d.compare}</td>
                        <td><span class="badge badge-${d.type === 'missing' ? 'danger' : d.type === 'extra' ? 'warning' : 'info'}">${d.type}</span></td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            `}
          </div>
        </div>
      `).join('')}
    `;
  },

  _analyzeDrift(baseId, compareIds) {
    const tenants = AppState.get('tenants');
    const results = [];

    compareIds.forEach(cid => {
      const tenant = tenants.find(t => t.id === cid);
      const drifts = [];

      // Compare compliance policies
      const baseComp = (AppState.get('compliancePolicies')[baseId] || []).map(p => p.displayName);
      const compComp = (AppState.get('compliancePolicies')[cid] || []).map(p => p.displayName);
      baseComp.forEach(name => {
        if (!compComp.includes(name)) {
          drifts.push({ category: 'Compliance Policy', baseline: name, compare: 'Missing', type: 'missing' });
        }
      });
      compComp.forEach(name => {
        if (!baseComp.includes(name)) {
          drifts.push({ category: 'Compliance Policy', baseline: 'Not present', compare: name, type: 'extra' });
        }
      });

      // Compare config profiles
      const baseConf = (AppState.get('configProfiles')[baseId] || []).map(p => p.displayName);
      const compConf = (AppState.get('configProfiles')[cid] || []).map(p => p.displayName);
      baseConf.forEach(name => {
        if (!compConf.includes(name)) {
          drifts.push({ category: 'Config Profile', baseline: name, compare: 'Missing', type: 'missing' });
        }
      });
      compConf.forEach(name => {
        if (!baseConf.includes(name)) {
          drifts.push({ category: 'Config Profile', baseline: 'Not present', compare: name, type: 'extra' });
        }
      });

      // Compare CA policies
      const baseCA = (AppState.get('caPolicies')[baseId] || []).map(p => ({ name: p.displayName, state: p.state }));
      const compCA = (AppState.get('caPolicies')[cid] || []).map(p => ({ name: p.displayName, state: p.state }));
      baseCA.forEach(bp => {
        const match = compCA.find(cp => cp.name === bp.name);
        if (!match) {
          drifts.push({ category: 'CA Policy', baseline: `${bp.name} (${bp.state})`, compare: 'Missing', type: 'missing' });
        } else if (match.state !== bp.state) {
          drifts.push({ category: 'CA Policy', baseline: `${bp.name}: ${bp.state}`, compare: `${match.name}: ${match.state}`, type: 'different' });
        }
      });
      compCA.forEach(cp => {
        if (!baseCA.find(bp => bp.name === cp.name)) {
          drifts.push({ category: 'CA Policy', baseline: 'Not present', compare: `${cp.name} (${cp.state})`, type: 'extra' });
        }
      });

      // Compare app protection policies
      const baseAP = (AppState.get('appProtectionPolicies')[baseId] || []).map(p => p.displayName);
      const compAP = (AppState.get('appProtectionPolicies')[cid] || []).map(p => p.displayName);
      baseAP.forEach(name => {
        if (!compAP.includes(name)) {
          drifts.push({ category: 'App Protection', baseline: name, compare: 'Missing', type: 'missing' });
        }
      });

      // Compare security baselines
      const baseSB = (AppState.get('securityBaselines')[baseId] || []).map(p => p.displayName);
      const compSB = (AppState.get('securityBaselines')[cid] || []).map(p => p.displayName);
      baseSB.forEach(name => {
        if (!compSB.includes(name)) {
          drifts.push({ category: 'Security Baseline', baseline: name, compare: 'Missing', type: 'missing' });
        }
      });

      results.push({ tenantId: cid, tenantName: tenant?.displayName || cid, drifts });
    });

    return results;
  }
};
