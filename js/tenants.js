/* ============================================================
   Tenants — Tenant dashboard grid + health overview + detail view
   ============================================================ */

const Tenants = {
  // Track which tenant detail is open (null = grid view)
  detailTenantId: null,

  // Search/filter state for grid view
  searchQuery: '',
  healthFilter: 'all', // 'all' | 'healthy' | 'warning' | 'critical'

  render() {
    if (this.detailTenantId) {
      this.renderDetailView();
    } else {
      this.renderGridView();
    }
  },

  /* ===========================================================
     GRID VIEW
     =========================================================== */
  renderGridView() {
    const main = document.getElementById('mainContent');
    const tenants = AppState.get('tenants');
    const tier = AppState.get('licenseTier');
    const filtered = this.getFilteredTenants(tenants);

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

      <!-- Search / Filter Bar -->
      ${tenants.length > 0 ? `
        <div class="card mb-4" style="padding: 12px 16px;">
          <div class="flex items-center gap-3" style="flex-wrap: wrap;">
            <div style="flex: 1; min-width: 200px;">
              <input type="text" class="form-control" placeholder="Search tenants by name or domain..."
                     value="${this.searchQuery}" oninput="Tenants.onSearch(this.value)"
                     style="width: 100%;">
            </div>
            <div class="flex gap-2">
              <button class="btn ${this.healthFilter === 'all' ? 'btn-primary' : 'btn-secondary'} btn-sm" onclick="Tenants.setHealthFilter('all')">All</button>
              <button class="btn ${this.healthFilter === 'healthy' ? 'btn-primary' : 'btn-secondary'} btn-sm" onclick="Tenants.setHealthFilter('healthy')">
                <span style="color: var(--success);">&#9679;</span> Healthy
              </button>
              <button class="btn ${this.healthFilter === 'warning' ? 'btn-primary' : 'btn-secondary'} btn-sm" onclick="Tenants.setHealthFilter('warning')">
                <span style="color: var(--warning);">&#9679;</span> Warning
              </button>
              <button class="btn ${this.healthFilter === 'critical' ? 'btn-primary' : 'btn-secondary'} btn-sm" onclick="Tenants.setHealthFilter('critical')">
                <span style="color: var(--danger);">&#9679;</span> Critical
              </button>
            </div>
          </div>
        </div>
      ` : ''}

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
      ` : filtered.length === 0 ? `
        <div class="card">
          <div class="empty-state">
            <h3 class="empty-state-title">No Matching Tenants</h3>
            <p class="empty-state-text">No tenants match your current search or filter criteria.</p>
            <button class="btn btn-secondary" onclick="Tenants.clearFilters()">Clear Filters</button>
          </div>
        </div>
      ` : `
        <div class="grid grid-auto gap-4 stagger">
          ${filtered.map((t, i) => this.renderTenantCard(t, i)).join('')}
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
    const healthLabel = compliancePct >= 80 ? 'Good' : compliancePct >= 50 ? 'Warning' : 'Critical';
    const healthColor = compliancePct >= 80 ? 'var(--success)' : compliancePct >= 50 ? 'var(--warning)' : 'var(--danger)';

    // OS breakdown
    const osBreakdown = this.getOSBreakdown(devices);

    // Policy/profile counts
    const policies = (AppState.get('compliancePolicies')[tenant.id] || []).length;
    const profiles = (AppState.get('configProfiles')[tenant.id] || []).length;

    // Last data refresh
    const lastRefresh = this.getLastSync(devices);

    return `
      <div class="tenant-card ${healthClass} animate-fade-up" style="animation-delay: ${index * 60}ms; cursor: pointer; position: relative;">
        <div class="tenant-card-header" onclick="Tenants.openDetail('${tenant.id}')">
          <div>
            <div class="tenant-card-name">${tenant.displayName}</div>
            <div class="tenant-card-id">${tenant.domain || tenant.id.substring(0, 20) + '...'}</div>
          </div>
          <div class="flex items-center gap-2">
            <span class="badge" style="background: ${healthColor}; color: #fff; font-size: 10px;">${healthLabel}</span>
            <span class="badge ${tenant.connectionType === 'gdap' ? 'badge-primary' : 'badge-default'}">
              ${tenant.connectionType === 'gdap' ? 'GDAP' : 'Direct'}
            </span>
          </div>
        </div>

        <div onclick="Tenants.openDetail('${tenant.id}')">
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

          <!-- OS Breakdown -->
          <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px; padding: 0 4px;">
            ${osBreakdown.windows > 0 ? `<span class="text-xs text-muted" title="Windows devices"><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style="vertical-align: -1px;"><path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801"/></svg> ${osBreakdown.windows}</span>` : ''}
            ${osBreakdown.macos > 0 ? `<span class="text-xs text-muted" title="macOS devices"><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style="vertical-align: -1px;"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg> ${osBreakdown.macos}</span>` : ''}
            ${osBreakdown.ios > 0 ? `<span class="text-xs text-muted" title="iOS devices"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: -1px;"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg> ${osBreakdown.ios}</span>` : ''}
            ${osBreakdown.android > 0 ? `<span class="text-xs text-muted" title="Android devices"><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style="vertical-align: -1px;"><path d="M17.6 9.48l1.84-3.18c.16-.31.04-.69-.27-.86s-.69-.04-.86.27l-1.87 3.23C14.98 8.35 13.55 8 12 8s-2.98.35-4.44.94L5.7 5.71c-.17-.31-.55-.43-.86-.27-.31.17-.43.55-.27.86L6.4 9.48C3.81 11.03 2.05 13.36 2 16h20c-.05-2.64-1.81-4.97-4.4-6.52zM7 14c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm10 0c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z"/></svg> ${osBreakdown.android}</span>` : ''}
            ${osBreakdown.other > 0 ? `<span class="text-xs text-muted" title="Other devices"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: -1px;"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg> ${osBreakdown.other}</span>` : ''}
          </div>

          <!-- Policies & Profiles -->
          <div style="display: flex; gap: 12px; margin-top: 6px; padding: 0 4px;">
            <span class="text-xs text-muted" title="Compliance policies">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: -1px;"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              ${policies} policies
            </span>
            <span class="text-xs text-muted" title="Configuration profiles">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: -1px;"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
              ${profiles} profiles
            </span>
          </div>

          <div style="margin-top: 10px;">
            <div class="progress-bar">
              <div class="progress-bar-fill ${compliancePct >= 80 ? 'green' : compliancePct >= 50 ? 'orange' : 'red'}" style="width: ${compliancePct}%"></div>
            </div>
            <div class="flex justify-between mt-1">
              <span class="text-xs text-muted">${compliancePct}% compliant</span>
              <span class="text-xs text-muted">Last sync: ${lastRefresh}</span>
            </div>
          </div>
        </div>

        <!-- Card action buttons -->
        <div style="display: flex; gap: 6px; margin-top: 10px; border-top: 1px solid var(--border); padding-top: 10px;">
          <button class="btn btn-secondary btn-sm" style="flex:1;" onclick="event.stopPropagation(); Tenants.refreshSingle('${tenant.id}');" title="Refresh tenant data">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg>
            Refresh
          </button>
          <button class="btn btn-secondary btn-sm" style="flex:1; color: var(--danger);" onclick="event.stopPropagation(); Tenants.disconnectTenant('${tenant.id}');" title="Disconnect tenant">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            Disconnect
          </button>
        </div>
      </div>
    `;
  },

  /* ===========================================================
     DETAIL VIEW
     =========================================================== */
  renderDetailView() {
    const main = document.getElementById('mainContent');
    const tenantId = this.detailTenantId;
    const tenants = AppState.get('tenants');
    const tenant = tenants.find(t => t.id === tenantId);

    if (!tenant) {
      this.detailTenantId = null;
      this.renderGridView();
      return;
    }

    const devices = AppState.get('devices')[tenantId] || [];
    const policies = AppState.get('compliancePolicies')[tenantId] || [];
    const profiles = AppState.get('configProfiles')[tenantId] || [];
    const apps = AppState.get('apps')[tenantId] || [];
    const groups = AppState.get('groups')[tenantId] || [];

    const compliant = devices.filter(d => d.complianceState === 'compliant').length;
    const total = devices.length;
    const compliancePct = total > 0 ? Math.round((compliant / total) * 100) : 0;
    const healthLabel = compliancePct >= 80 ? 'Good' : compliancePct >= 50 ? 'Warning' : 'Critical';
    const healthColor = compliancePct >= 80 ? 'var(--success)' : compliancePct >= 50 ? 'var(--warning)' : 'var(--danger)';
    const nonCompliant = devices.filter(d => d.complianceState === 'noncompliant').length;

    // Top 10 devices sorted by last sync (most recent first)
    const topDevices = [...devices]
      .sort((a, b) => new Date(b.lastSyncDateTime || 0) - new Date(a.lastSyncDateTime || 0))
      .slice(0, 10);

    main.innerHTML = `
      <!-- Back button -->
      <div style="margin-bottom: 16px;">
        <button class="btn btn-secondary btn-sm" onclick="Tenants.closeDetail()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
          Back to All Tenants
        </button>
      </div>

      <!-- Tenant Header -->
      <div class="card mb-4" style="padding: 20px;">
        <div class="flex items-center justify-between" style="flex-wrap: wrap; gap: 12px;">
          <div>
            <h1 class="page-title" style="margin: 0;">${tenant.displayName}</h1>
            <p class="text-muted" style="margin: 4px 0 0 0;">${tenant.domain || tenant.id}</p>
          </div>
          <div class="flex items-center gap-2">
            <span class="badge" style="background: ${healthColor}; color: #fff; font-size: 12px; padding: 4px 12px;">${healthLabel}</span>
            <span class="badge ${tenant.connectionType === 'gdap' ? 'badge-primary' : 'badge-default'}" style="font-size: 12px; padding: 4px 12px;">
              ${tenant.connectionType === 'gdap' ? 'GDAP' : 'Direct'}
            </span>
          </div>
        </div>
      </div>

      <!-- Stats Row: 6 stat cards -->
      <div class="grid grid-3 gap-4 mb-4 stagger" style="grid-template-columns: repeat(6, 1fr);">
        <div class="stat-card animate-fade-up">
          <div class="stat-card-icon blue">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
          </div>
          <div class="stat-card-value">${total}</div>
          <div class="stat-card-label">Devices</div>
        </div>
        <div class="stat-card animate-fade-up">
          <div class="stat-card-icon ${compliancePct >= 80 ? 'green' : compliancePct >= 50 ? 'orange' : 'red'}">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
          <div class="stat-card-value">${compliancePct}%</div>
          <div class="stat-card-label">Compliance</div>
        </div>
        <div class="stat-card animate-fade-up">
          <div class="stat-card-icon orange">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 12 15 16 10"/></svg>
          </div>
          <div class="stat-card-value">${policies.length}</div>
          <div class="stat-card-label">Policies</div>
        </div>
        <div class="stat-card animate-fade-up">
          <div class="stat-card-icon purple">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
          </div>
          <div class="stat-card-value">${profiles.length}</div>
          <div class="stat-card-label">Profiles</div>
        </div>
        <div class="stat-card animate-fade-up">
          <div class="stat-card-icon green">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg>
          </div>
          <div class="stat-card-value">${apps.length}</div>
          <div class="stat-card-label">Apps</div>
        </div>
        <div class="stat-card animate-fade-up">
          <div class="stat-card-icon blue">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
          </div>
          <div class="stat-card-value">${groups.length}</div>
          <div class="stat-card-label">Groups</div>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="card mb-4" style="padding: 16px;">
        <div class="flex items-center gap-3" style="flex-wrap: wrap;">
          <span class="fw-500" style="margin-right: 8px;">Quick Actions:</span>
          <button class="btn btn-secondary btn-sm" onclick="Tenants.refreshSingle('${tenantId}')">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg>
            Sync All Data
          </button>
          <button class="btn btn-primary btn-sm" onclick="Tenants.viewAllDevices('${tenantId}')">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
            View All Devices
          </button>
          <button class="btn btn-secondary btn-sm" style="color: var(--danger);" onclick="Tenants.disconnectTenant('${tenantId}')">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            Disconnect Tenant
          </button>
        </div>
      </div>

      <div class="grid grid-2 gap-4 mb-4">
        <!-- Device Breakdown Table -->
        <div class="card" style="padding: 0;">
          <div class="card-header" style="padding: 14px 16px; border-bottom: 1px solid var(--border);">
            <h3 class="fw-500" style="margin: 0; font-size: 14px;">Top 10 Devices</h3>
          </div>
          ${topDevices.length === 0 ? `
            <div class="text-muted" style="padding: 24px; text-align: center;">No devices found for this tenant.</div>
          ` : `
            <div style="overflow-x: auto;">
              <table class="table" style="margin: 0;">
                <thead>
                  <tr>
                    <th>Device Name</th>
                    <th>OS</th>
                    <th>Compliance</th>
                    <th>Last Sync</th>
                  </tr>
                </thead>
                <tbody>
                  ${topDevices.map(d => {
                    const state = d.complianceState || 'unknown';
                    const stateColor = state === 'compliant' ? 'var(--success)' : state === 'noncompliant' ? 'var(--danger)' : 'var(--text-muted)';
                    const stateLabel = state === 'compliant' ? 'Compliant' : state === 'noncompliant' ? 'Non-Compliant' : 'Unknown';
                    return `
                      <tr>
                        <td class="fw-500">${d.deviceName || '-'}</td>
                        <td class="text-muted">${d.operatingSystem || '-'}</td>
                        <td><span style="color: ${stateColor}; font-weight: 500;">${stateLabel}</span></td>
                        <td class="text-muted">${this.formatSyncTime(d.lastSyncDateTime)}</td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          `}
        </div>

        <!-- Policy Summary -->
        <div class="card" style="padding: 0;">
          <div class="card-header" style="padding: 14px 16px; border-bottom: 1px solid var(--border);">
            <h3 class="fw-500" style="margin: 0; font-size: 14px;">Policy Summary</h3>
          </div>
          <div style="max-height: 400px; overflow-y: auto;">
            ${policies.length === 0 && profiles.length === 0 ? `
              <div class="text-muted" style="padding: 24px; text-align: center;">No policies or profiles configured.</div>
            ` : `
              ${policies.length > 0 ? `
                <div style="padding: 12px 16px 4px;">
                  <div class="text-xs fw-500 text-muted" style="text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">Compliance Policies (${policies.length})</div>
                  ${policies.map(p => `
                    <div style="padding: 6px 0; border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 8px;">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--success)" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                      <span class="text-sm">${p.displayName || 'Unnamed Policy'}</span>
                    </div>
                  `).join('')}
                </div>
              ` : ''}
              ${profiles.length > 0 ? `
                <div style="padding: 12px 16px 4px;">
                  <div class="text-xs fw-500 text-muted" style="text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">Configuration Profiles (${profiles.length})</div>
                  ${profiles.map(p => `
                    <div style="padding: 6px 0; border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 8px;">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
                      <span class="text-sm">${p.displayName || 'Unnamed Profile'}</span>
                    </div>
                  `).join('')}
                </div>
              ` : ''}
            `}
          </div>
        </div>
      </div>
    `;
  },

  /* ===========================================================
     DETAIL VIEW ACTIONS
     =========================================================== */
  openDetail(tenantId) {
    this.detailTenantId = tenantId;
    this.render();
  },

  closeDetail() {
    this.detailTenantId = null;
    this.render();
  },

  viewAllDevices(tenantId) {
    this.detailTenantId = null;
    AppState.setActiveTenant(tenantId);
    Router.navigate('devices');
  },

  /* ===========================================================
     SEARCH / FILTER
     =========================================================== */
  onSearch(value) {
    this.searchQuery = value;
    this.rerenderGrid();
  },

  setHealthFilter(filter) {
    this.healthFilter = filter;
    this.rerenderGrid();
  },

  clearFilters() {
    this.searchQuery = '';
    this.healthFilter = 'all';
    this.renderGridView();
  },

  rerenderGrid() {
    // Re-render only the grid portion for snappy filtering
    const tenants = AppState.get('tenants');
    const filtered = this.getFilteredTenants(tenants);
    const gridContainer = document.querySelector('.grid.grid-auto');
    const emptyCard = document.querySelector('.empty-state');

    // Full re-render to keep it simple and consistent
    this.renderGridView();
  },

  getFilteredTenants(tenants) {
    let result = tenants;

    // Search filter
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      result = result.filter(t =>
        (t.displayName || '').toLowerCase().includes(q) ||
        (t.domain || '').toLowerCase().includes(q) ||
        (t.id || '').toLowerCase().includes(q)
      );
    }

    // Health status filter
    if (this.healthFilter !== 'all') {
      result = result.filter(t => {
        const health = this.getTenantHealth(t.id);
        return health === this.healthFilter;
      });
    }

    return result;
  },

  getTenantHealth(tenantId) {
    const devices = AppState.get('devices')[tenantId] || [];
    const total = devices.length;
    if (total === 0) return 'healthy';
    const compliant = devices.filter(d => d.complianceState === 'compliant').length;
    const pct = Math.round((compliant / total) * 100);
    if (pct >= 80) return 'healthy';
    if (pct >= 50) return 'warning';
    return 'critical';
  },

  /* ===========================================================
     DISCONNECT TENANT
     =========================================================== */
  disconnectTenant(tenantId) {
    const tenant = AppState.get('tenants').find(t => t.id === tenantId);
    const name = tenant?.displayName || tenantId;

    if (!confirm(`Disconnect "${name}"?\n\nThis will remove the tenant from your list and clear all cached data. You can reconnect later.`)) {
      return;
    }

    // Remove from tenants array
    const tenants = AppState.get('tenants').filter(t => t.id !== tenantId);
    AppState.set('tenants', tenants);

    // Clear cached data for this tenant
    const dataKeys = ['devices', 'compliancePolicies', 'configProfiles', 'securityPolicies', 'apps', 'autopilotDevices', 'updateRings', 'groups'];
    dataKeys.forEach(key => {
      const cache = { ...AppState.get(key) };
      delete cache[tenantId];
      AppState.set(key, cache);
    });

    // Clear access token
    const tokens = { ...AppState.get('accessTokens') };
    delete tokens[tenantId];
    AppState.set('accessTokens', tokens);

    // If we were viewing this tenant's detail, go back to grid
    if (this.detailTenantId === tenantId) {
      this.detailTenantId = null;
    }

    // If active tenant was this one, reset to all
    if (AppState.get('activeTenant') === tenantId) {
      AppState.setActiveTenant('all');
    }

    Toast.show(`"${name}" has been disconnected.`, 'success');
    this.render();
  },

  /* ===========================================================
     REFRESH SINGLE TENANT
     =========================================================== */
  async refreshSingle(tenantId) {
    const tenant = AppState.get('tenants').find(t => t.id === tenantId);
    const name = tenant?.displayName || tenantId;

    Toast.show(`Refreshing data for ${name}...`, 'info');

    try {
      await Graph.loadAllData(tenantId);
      Toast.show(`${name} data refreshed`, 'success');
    } catch (e) {
      console.error(`Failed to refresh ${name}:`, e);
      Toast.show(`Failed to refresh ${name}: ${e.message}`, 'error');
    }

    // Re-render current view (detail or grid)
    this.render();
  },

  /* ===========================================================
     TENANT SELECTOR MODAL (unchanged)
     =========================================================== */
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

  /* ===========================================================
     HELPERS
     =========================================================== */
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

  getOSBreakdown(devices) {
    const result = { windows: 0, macos: 0, ios: 0, android: 0, other: 0 };
    devices.forEach(d => {
      const os = (d.operatingSystem || '').toLowerCase();
      if (os.includes('windows')) result.windows++;
      else if (os.includes('macos') || os.includes('mac os')) result.macos++;
      else if (os.includes('ios')) result.ios++;
      else if (os.includes('android')) result.android++;
      else if (os) result.other++;
    });
    return result;
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
  },

  formatSyncTime(dateStr) {
    if (!dateStr) return 'Never';
    const diff = Date.now() - new Date(dateStr).getTime();
    if (diff < 0) return 'Just now';
    if (diff < 3600000) return Math.round(diff / 60000) + 'm ago';
    if (diff < 86400000) return Math.round(diff / 3600000) + 'h ago';
    return Math.round(diff / 86400000) + 'd ago';
  }
};
