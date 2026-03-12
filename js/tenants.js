/* ============================================================
   Tenants — Tenant dashboard grid + health overview
   ============================================================ */

const Tenants = {
  render() {
    const main = document.getElementById('mainContent');
    const tenants = AppState.get('tenants');
    const tier = AppState.get('licenseTier');

    main.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h1 class="page-title">Tenant Overview</h1>
          <p class="page-subtitle">Manage and monitor all connected customer tenants in one view.</p>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-secondary" onclick="Tenants.refreshAll()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg>
            Refresh All
          </button>
          <button class="btn btn-primary" onclick="Auth.showConnectModal()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Tenant
          </button>
        </div>
      </div>

      ${tier === 'free' ? `
        <div class="tier-banner free mb-4">
          <div class="tier-banner-text">
            <strong>Free Tier:</strong> ${tenants.length} / ${AppState.get('maxTenantsForFree')} tenants used.
            <a href="#" onclick="Licensing.showModal(); return false;">Upgrade to Pro</a> for unlimited tenants.
          </div>
        </div>
      ` : ''}

      <!-- Aggregate Stats -->
      <div class="grid grid-4 gap-4 mb-6 stagger">
        <div class="stat-card animate-fade-up">
          <div class="stat-card-icon blue">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>
          </div>
          <div class="stat-card-value">${tenants.length}</div>
          <div class="stat-card-label">Connected Tenants</div>
        </div>
        <div class="stat-card animate-fade-up">
          <div class="stat-card-icon green">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
          </div>
          <div class="stat-card-value">${this.getTotalDevices()}</div>
          <div class="stat-card-label">Total Devices</div>
        </div>
        <div class="stat-card animate-fade-up">
          <div class="stat-card-icon orange">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
          <div class="stat-card-value">${this.getCompliantPercentage()}%</div>
          <div class="stat-card-label">Overall Compliance</div>
        </div>
        <div class="stat-card animate-fade-up">
          <div class="stat-card-icon red">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          </div>
          <div class="stat-card-value">${this.getNonCompliantCount()}</div>
          <div class="stat-card-label">Non-Compliant Devices</div>
        </div>
      </div>

      <!-- Tenant Grid -->
      ${tenants.length === 0 ? `
        <div class="card">
          <div class="empty-state">
            <div class="empty-state-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>
            </div>
            <h3 class="empty-state-title">No Tenants Connected</h3>
            <p class="empty-state-text">Connect your first tenant using Microsoft sign-in for a single tenant, or Partner Center for all your GDAP customers.</p>
            <button class="btn btn-primary" onclick="Auth.showConnectModal()">Connect Tenant</button>
          </div>
        </div>
      ` : `
        <div class="grid grid-auto gap-4 stagger">
          ${tenants.map((t, i) => this.renderTenantCard(t, i)).join('')}
        </div>
      `}
    `;
  },

  renderTenantCard(tenant, index) {
    const devices = AppState.get('devices')[tenant.id] || [];
    const compliant = devices.filter(d => d.complianceState === 'compliant').length;
    const nonCompliant = devices.filter(d => d.complianceState === 'noncompliant').length;
    const total = devices.length;
    const compliancePct = total > 0 ? Math.round((compliant / total) * 100) : 0;
    const healthClass = compliancePct >= 80 ? '' : compliancePct >= 50 ? 'warning' : 'critical';

    return `
      <div class="tenant-card ${healthClass} animate-fade-up" onclick="Tenants.selectTenant('${tenant.id}')" style="animation-delay: ${index * 60}ms;">
        <div class="tenant-card-header">
          <div>
            <div class="tenant-card-name">${tenant.displayName}</div>
            <div class="tenant-card-id">${tenant.domain || tenant.id.substring(0, 20) + '...'}</div>
          </div>
          <span class="badge ${tenant.connectionType === 'gdap' ? 'badge-primary' : 'badge-default'}">
            ${tenant.connectionType === 'gdap' ? 'GDAP' : 'Direct'}
          </span>
        </div>
        <div class="tenant-card-stats">
          <div class="tenant-card-stat">
            <div class="tenant-card-stat-value">${total}</div>
            <div class="tenant-card-stat-label">Devices</div>
          </div>
          <div class="tenant-card-stat">
            <div class="tenant-card-stat-value" style="color: var(--success)">${compliant}</div>
            <div class="tenant-card-stat-label">Compliant</div>
          </div>
          <div class="tenant-card-stat">
            <div class="tenant-card-stat-value" style="color: var(--danger)">${nonCompliant}</div>
            <div class="tenant-card-stat-label">Non-Compl.</div>
          </div>
        </div>
        <div style="margin-top: 12px;">
          <div class="progress-bar">
            <div class="progress-bar-fill ${compliancePct >= 80 ? 'green' : compliancePct >= 50 ? 'orange' : 'red'}" style="width: ${compliancePct}%"></div>
          </div>
          <div class="flex justify-between mt-1">
            <span class="text-xs text-muted">${compliancePct}% compliant</span>
            <span class="text-xs text-muted">Last sync: ${this.getLastSync(devices)}</span>
          </div>
        </div>
      </div>
    `;
  },

  selectTenant(tenantId) {
    AppState.setActiveTenant(tenantId);
    Router.navigate('devices');
  },

  showSelector() {
    const modal = document.getElementById('tenantSelectorModal');
    const body = document.getElementById('tenantSelectorBody');
    const tenants = AppState.get('tenants');

    body.innerHTML = `
      <div class="flex flex-col gap-2">
        <div class="sidebar-nav-link ${AppState.get('activeTenant') === 'all' ? 'active' : ''}"
             onclick="AppState.setActiveTenant('all'); Tenants.hideSelector();"
             style="padding: 12px 16px; cursor: pointer;">
          <span class="sidebar-nav-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
          </span>
          <div>
            <div class="fw-500">All Tenants</div>
            <div class="text-xs text-muted">${tenants.length} tenant(s) connected</div>
          </div>
        </div>
        ${tenants.map(t => `
          <div class="sidebar-nav-link ${AppState.get('activeTenant') === t.id ? 'active' : ''}"
               onclick="AppState.setActiveTenant('${t.id}'); Tenants.hideSelector();"
               style="padding: 12px 16px; cursor: pointer;">
            <span class="sidebar-nav-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>
            </span>
            <div style="flex:1; min-width:0;">
              <div class="fw-500 truncate">${t.displayName}</div>
              <div class="text-xs text-muted text-mono">${t.domain || t.id.substring(0, 24)}</div>
            </div>
            <span class="badge ${t.connectionType === 'gdap' ? 'badge-primary' : 'badge-default'} text-xs">
              ${t.connectionType === 'gdap' ? 'GDAP' : 'Direct'}
            </span>
          </div>
        `).join('')}
      </div>
    `;

    modal.classList.remove('hidden');
  },

  hideSelector() {
    document.getElementById('tenantSelectorModal')?.classList.add('hidden');
  },

  async refreshAll() {
    const tenants = AppState.get('tenants');
    if (tenants.length === 0) {
      Toast.show('No tenants connected', 'warning');
      return;
    }
    Toast.show('Refreshing all tenant data...', 'info');
    for (const tenant of tenants) {
      await Graph.loadAllData(tenant.id).catch(e => {
        console.warn(`Failed to load data for ${tenant.displayName}:`, e);
      });
    }
    Toast.show('All tenants refreshed', 'success');
  },

  // Helpers
  getTotalDevices() {
    const devices = AppState.get('devices');
    return Object.values(devices).reduce((sum, arr) => sum + (arr?.length || 0), 0);
  },

  getCompliantPercentage() {
    const devices = AppState.get('devices');
    let total = 0, compliant = 0;
    Object.values(devices).forEach(arr => {
      (arr || []).forEach(d => {
        total++;
        if (d.complianceState === 'compliant') compliant++;
      });
    });
    return total > 0 ? Math.round((compliant / total) * 100) : 0;
  },

  getNonCompliantCount() {
    const devices = AppState.get('devices');
    let count = 0;
    Object.values(devices).forEach(arr => {
      (arr || []).forEach(d => {
        if (d.complianceState === 'noncompliant') count++;
      });
    });
    return count;
  },

  getLastSync(devices) {
    if (!devices.length) return 'Never';
    const latest = devices.reduce((max, d) => {
      const t = new Date(d.lastSyncDateTime || 0).getTime();
      return t > max ? t : max;
    }, 0);
    if (!latest) return 'Never';
    const diff = Date.now() - latest;
    if (diff < 3600000) return Math.round(diff / 60000) + 'm ago';
    if (diff < 86400000) return Math.round(diff / 3600000) + 'h ago';
    return Math.round(diff / 86400000) + 'd ago';
  }
};
