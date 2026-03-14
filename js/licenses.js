/* ============================================================
   Licenses — M365 License Management Dashboard
   ============================================================ */

const Licenses = {
  _skuNames: {
    '05e9a617-0261-4cee-bb36-b42e66d6e21b': 'Microsoft 365 E5',
    '06ebc4ee-1bb5-47dd-8120-11324bc54e06': 'Microsoft 365 E3',
    '4b585984-651b-4235-8c83-7a0b3fbc42c6': 'Microsoft 365 E1',
    'c5928f49-12ba-48f7-ada3-0d743a3601d5': 'Microsoft 365 A5 for Faculty',
    '18181a46-0d4e-45cd-891e-60aabd171b4e': 'Office 365 E1',
    '6fd2c87f-b296-42f0-b197-1e91e994b900': 'Office 365 E3',
    'c7df2760-2c81-4ef7-b578-5b5392b571df': 'Office 365 E5',
    'f245ecc8-75af-4f8e-b61f-27d8114de5f3': 'Microsoft 365 Business Standard',
    'cbdc14ab-d96c-4c30-b9f4-6ada7cdc1d46': 'Microsoft 365 Business Premium',
    '3b555118-da6a-4418-894f-7df1e2096870': 'Microsoft 365 Business Basic',
    'a403ebcc-fae0-4ca2-8c8c-7a907fd6c235': 'Power BI Pro',
    'f8a1db68-be16-40ed-86d5-cb42ce701560': 'Power BI Premium Per User',
    '1f2f344a-700d-42c9-9427-5901005d0129': 'Microsoft Stream',
    '710779e8-3d4a-4c88-adb9-386c958d1fdf': 'Microsoft Teams Exploratory',
    'e43b5b99-8dfb-405f-9987-dc307f34bcbd': 'Microsoft Defender for Office 365 P1',
    '26124093-3d78-432b-b5dc-48bf992543d5': 'Microsoft Defender for Office 365 P2',
    '4ef96642-f517-4cd5-838a-2f3a3e2e358d': 'Microsoft Defender for Endpoint P2',
    'e52ea934-0e28-4599-88c5-46a0ccbb7541': 'Microsoft Intune Plan 1',
    'dcb1a3ae-b7d7-4e51-b7d5-4aab2c10e3ea': 'Windows 10/11 Enterprise E3',
    '6470687e-a428-4b7a-bef2-8a291ad947c9': 'Windows 10/11 Enterprise E5',
    'efccb6f7-5641-4e0e-bd10-b4976e1bf68e': 'Enterprise Mobility + Security E3',
    'b05e124f-c7cc-45a0-a6aa-8cf78c946968': 'Enterprise Mobility + Security E5',
    '078d2b04-f1bd-4111-bbd4-b4b1b354cef4': 'Azure AD Premium P1',
    '84a661c4-e949-4bd2-a560-ed7766fcaf2b': 'Azure AD Premium P2',
    'c42b9cae-ea4f-4ab7-9717-81576235ccac': 'Microsoft Copilot for Microsoft 365',
    '61902246-d7cb-453e-85cd-53ee28eec138': 'Microsoft Entra ID P1',
    '1ca3c076-0ecd-4aea-9bfe-01cfd8e0e5a3': 'Microsoft Entra ID P2',
  },

  getSkuName(skuId) {
    return this._skuNames[skuId] || skuId;
  },

  render() {
    const main = document.getElementById('mainContent');
    const tenants = AppState.get('tenants');
    const isAll = AppState.get('activeTenant') === 'all';
    const licenseData = AppState.get('subscribedSkus') || {};

    // Aggregate all license data
    let allSkus = [];
    const tenantsToShow = isAll ? tenants : tenants.filter(t => t.id === AppState.get('activeTenant'));
    tenantsToShow.forEach(t => {
      const skus = licenseData[t.id] || [];
      skus.forEach(sku => {
        allSkus.push({ ...sku, _tenantId: t.id, _tenantName: t.displayName });
      });
    });

    // Compute totals
    let totalPurchased = 0, totalConsumed = 0, totalAvailable = 0;
    allSkus.forEach(s => {
      const purchased = s.prepaidUnits?.enabled || 0;
      const consumed = s.consumedUnits || 0;
      totalPurchased += purchased;
      totalConsumed += consumed;
      totalAvailable += Math.max(0, purchased - consumed);
    });

    const utilization = totalPurchased > 0 ? Math.round((totalConsumed / totalPurchased) * 100) : 0;
    const unusedSkus = allSkus.filter(s => {
      const purchased = s.prepaidUnits?.enabled || 0;
      const consumed = s.consumedUnits || 0;
      return purchased > 0 && consumed === 0;
    });
    const overAllocated = allSkus.filter(s => {
      const purchased = s.prepaidUnits?.enabled || 0;
      return s.consumedUnits > purchased;
    });

    main.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h1 class="page-title">License Management</h1>
          <p class="page-subtitle">M365 license utilization across ${tenantsToShow.length} tenant(s)</p>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-ghost btn-sm" onclick="Licenses.reload()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>
            Reload
          </button>
          <button class="btn btn-secondary btn-sm" onclick="Licenses.exportCSV()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Export CSV
          </button>
        </div>
      </div>

      <!-- KPI Stats -->
      <div class="grid grid-4 gap-4 mb-4">
        <div class="stat-card"><div class="stat-card-value">${totalPurchased.toLocaleString()}</div><div class="stat-card-label">Total Licenses</div></div>
        <div class="stat-card"><div class="stat-card-value text-primary">${totalConsumed.toLocaleString()}</div><div class="stat-card-label">Assigned</div></div>
        <div class="stat-card"><div class="stat-card-value text-success">${totalAvailable.toLocaleString()}</div><div class="stat-card-label">Available</div></div>
        <div class="stat-card"><div class="stat-card-value ${utilization > 90 ? 'text-danger' : utilization > 75 ? 'text-warning' : 'text-success'}">${utilization}%</div><div class="stat-card-label">Utilization</div></div>
      </div>

      ${overAllocated.length > 0 ? `
        <div style="background:var(--danger-pale, #fee2e2);border:1px solid var(--danger);border-radius:var(--radius-lg);padding:12px 16px;margin-bottom:16px;">
          <div class="fw-600 text-sm">&#9888; ${overAllocated.length} over-allocated license(s)</div>
          <div class="text-xs text-muted mt-1">More licenses assigned than purchased. Review and reclaim unused assignments.</div>
        </div>
      ` : ''}

      ${unusedSkus.length > 0 ? `
        <div style="background:var(--warning-pale, #fef3c7);border:1px solid var(--warning);border-radius:var(--radius-lg);padding:12px 16px;margin-bottom:16px;">
          <div class="fw-600 text-sm">&#128161; ${unusedSkus.length} unused license SKU(s)</div>
          <div class="text-xs text-muted mt-1">These licenses are purchased but have zero assignments. Consider removing to save costs.</div>
        </div>
      ` : ''}

      <!-- License Table -->
      <div class="card">
        <div class="card-header">
          <div class="card-header-title">License Inventory</div>
        </div>
        <div class="card-body" style="padding:0;">
          ${allSkus.length === 0 ? `
            <div class="empty-state" style="padding:3rem;">
              <p class="text-sm text-muted">No license data loaded. Connect a tenant and reload.</p>
              <button class="btn btn-primary btn-sm mt-2" onclick="Licenses.reload()">Load License Data</button>
            </div>
          ` : `
            <div class="table-wrapper">
              <table class="table">
                <thead><tr>
                  ${isAll ? '<th>Tenant</th>' : ''}
                  <th>License</th>
                  <th>Purchased</th>
                  <th>Assigned</th>
                  <th>Available</th>
                  <th>Utilization</th>
                  <th>Status</th>
                </tr></thead>
                <tbody>
                  ${allSkus.map(s => {
                    const purchased = s.prepaidUnits?.enabled || 0;
                    const consumed = s.consumedUnits || 0;
                    const available = Math.max(0, purchased - consumed);
                    const pct = purchased > 0 ? Math.round((consumed / purchased) * 100) : 0;
                    const status = consumed > purchased ? 'danger' : pct > 90 ? 'warning' : pct === 0 && purchased > 0 ? 'default' : 'success';
                    const statusLabel = consumed > purchased ? 'Over-allocated' : pct > 90 ? 'Low' : pct === 0 && purchased > 0 ? 'Unused' : 'Healthy';
                    return `
                      <tr>
                        ${isAll ? `<td><span class="chip">${s._tenantName || AppState.getTenantName(s._tenantId)}</span></td>` : ''}
                        <td>
                          <div class="fw-500">${this.getSkuName(s.skuId)}</div>
                          <div class="text-xs text-muted text-mono">${s.skuPartNumber || ''}</div>
                        </td>
                        <td class="fw-500">${purchased}</td>
                        <td>${consumed}</td>
                        <td>${available}</td>
                        <td>
                          <div style="display:flex;align-items:center;gap:8px;">
                            <div style="flex:1;height:6px;background:var(--gray-100);border-radius:3px;overflow:hidden;">
                              <div style="height:100%;width:${Math.min(pct, 100)}%;background:var(--${status === 'danger' ? 'danger' : status === 'warning' ? 'warning' : 'success'});border-radius:3px;"></div>
                            </div>
                            <span class="text-xs fw-500">${pct}%</span>
                          </div>
                        </td>
                        <td><span class="badge badge-${status}">${statusLabel}</span></td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          `}
        </div>
      </div>

      <!-- Recommendations -->
      <div class="card mt-6">
        <div class="card-header">
          <div class="card-header-title">&#128161; Optimization Recommendations</div>
        </div>
        <div class="card-body">
          ${this._getRecommendations(allSkus).length === 0 ? '<div class="text-sm text-muted">No recommendations at this time.</div>' :
            this._getRecommendations(allSkus).map(r => `
              <div style="display:flex;gap:12px;padding:10px 0;border-bottom:1px solid var(--border-light);">
                <div style="font-size:20px;">${r.icon}</div>
                <div>
                  <div class="fw-500 text-sm">${r.title}</div>
                  <div class="text-xs text-muted">${r.desc}</div>
                </div>
              </div>
            `).join('')}
        </div>
      </div>
    `;
  },

  _getRecommendations(allSkus) {
    const recs = [];
    const unused = allSkus.filter(s => (s.prepaidUnits?.enabled || 0) > 0 && s.consumedUnits === 0);
    if (unused.length > 0) {
      recs.push({ icon: '&#128176;', title: `Remove ${unused.length} unused license SKU(s)`, desc: `${unused.map(s => this.getSkuName(s.skuId)).join(', ')} have zero assignments. Cancel to reduce costs.` });
    }
    const over = allSkus.filter(s => s.consumedUnits > (s.prepaidUnits?.enabled || 0));
    if (over.length > 0) {
      recs.push({ icon: '&#9888;', title: `${over.length} SKU(s) over-allocated`, desc: 'More licenses assigned than purchased. Purchase additional seats or reclaim assignments.' });
    }
    const low = allSkus.filter(s => {
      const p = s.prepaidUnits?.enabled || 0;
      return p > 0 && (s.consumedUnits / p) > 0.9 && s.consumedUnits <= p;
    });
    if (low.length > 0) {
      recs.push({ icon: '&#128200;', title: `${low.length} SKU(s) above 90% utilization`, desc: 'Consider purchasing additional seats before running out.' });
    }
    const highAvail = allSkus.filter(s => {
      const p = s.prepaidUnits?.enabled || 0;
      return p > 10 && ((p - s.consumedUnits) / p) > 0.5;
    });
    if (highAvail.length > 0) {
      recs.push({ icon: '&#128203;', title: `${highAvail.length} SKU(s) with >50% available`, desc: 'Consider reducing seat count to optimize spend.' });
    }
    return recs;
  },

  async reload() {
    const tenants = AppState.get('tenants');
    Toast.show('Loading license data...', 'info');
    for (const t of tenants) {
      try {
        await Graph.loadSubscribedSkus(t.id);
      } catch (e) {
        console.warn(`Failed to load licenses for ${t.id}:`, e);
      }
    }
    Toast.show('License data loaded', 'success');
    this.render();
  },

  exportCSV() {
    const licenseData = AppState.get('subscribedSkus') || {};
    const isAll = AppState.get('activeTenant') === 'all';
    let csv = isAll
      ? 'Tenant,License,SKU,Purchased,Assigned,Available,Utilization\n'
      : 'License,SKU,Purchased,Assigned,Available,Utilization\n';

    const tenants = AppState.get('tenants');
    const tenantsToShow = isAll ? tenants : tenants.filter(t => t.id === AppState.get('activeTenant'));
    tenantsToShow.forEach(t => {
      (licenseData[t.id] || []).forEach(s => {
        const p = s.prepaidUnits?.enabled || 0;
        const c = s.consumedUnits || 0;
        const row = [
          ...(isAll ? [t.displayName] : []),
          this.getSkuName(s.skuId), s.skuPartNumber || '', p, c, Math.max(0, p - c),
          p > 0 ? Math.round((c / p) * 100) + '%' : '0%'
        ];
        csv += row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',') + '\n';
      });
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `licenses_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }
};
