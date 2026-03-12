/* ============================================================
   Dashboard — Main dashboard with cross-tenant overview
   ============================================================ */

const Dashboard = {
  render() {
    const main = document.getElementById('mainContent');
    const tenants = AppState.get('tenants');
    const isAuth = AppState.get('isAuthenticated');
    const allDevices = AppState.getDevicesForContext();
    const tier = AppState.get('licenseTier');

    // Device stats
    const total = allDevices.length;
    const compliant = allDevices.filter(d => d.complianceState === 'compliant').length;
    const nonCompliant = allDevices.filter(d => d.complianceState === 'noncompliant').length;
    const windows = allDevices.filter(d => (d.operatingSystem || '').toLowerCase().includes('windows')).length;
    const mac = allDevices.filter(d => (d.operatingSystem || '').toLowerCase().includes('macos')).length;
    const mobile = allDevices.filter(d => {
      const os = (d.operatingSystem || '').toLowerCase();
      return os.includes('ios') || os.includes('android');
    }).length;

    // Compliance percentage
    const compPct = total > 0 ? Math.round((compliant / total) * 100) : 0;

    main.innerHTML = `
      <!-- Sponsor Banner (free tier only) -->
      ${Sponsor.renderDashboardBanner()}

      <div class="page-header">
        <div class="page-header-left">
          <h1 class="page-title">Dashboard</h1>
          <p class="page-subtitle">
            ${tenants.length > 0 ?
              `Monitoring ${total} devices across ${tenants.length} tenant${tenants.length !== 1 ? 's' : ''}` :
              'Connect your first tenant to get started'
            }
          </p>
        </div>
        <div class="page-header-actions">
          ${tenants.length > 0 ? `
            <button class="btn btn-secondary" onclick="Tenants.refreshAll()">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg>
              Refresh Data
            </button>
          ` : ''}
          <button class="btn btn-primary" onclick="Auth.showConnectModal()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            ${tenants.length > 0 ? 'Add Tenant' : 'Connect Tenant'}
          </button>
        </div>
      </div>

      <!-- KPI Cards -->
      <div class="grid grid-4 gap-4 mb-6 stagger">
        <div class="stat-card animate-fade-up">
          <div class="stat-card-icon blue">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
          </div>
          <div class="stat-card-value">${total}</div>
          <div class="stat-card-label">Total Devices</div>
        </div>
        <div class="stat-card animate-fade-up">
          <div class="stat-card-icon green">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          </div>
          <div class="stat-card-value">${compliant}</div>
          <div class="stat-card-label">Compliant</div>
          ${total > 0 ? `<div class="stat-card-trend up">&#9650; ${compPct}%</div>` : ''}
        </div>
        <div class="stat-card animate-fade-up">
          <div class="stat-card-icon red">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
          </div>
          <div class="stat-card-value">${nonCompliant}</div>
          <div class="stat-card-label">Non-Compliant</div>
          ${nonCompliant > 0 ? `<div class="stat-card-trend down">Needs attention</div>` : ''}
        </div>
        <div class="stat-card animate-fade-up">
          <div class="stat-card-icon teal">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>
          </div>
          <div class="stat-card-value">${tenants.length}</div>
          <div class="stat-card-label">Connected Tenants</div>
        </div>
      </div>

      <div class="grid grid-2 gap-6 mb-6">
        <!-- Compliance Overview -->
        <div class="card animate-fade-up">
          <div class="card-header">
            <div class="card-header-title">Compliance Overview</div>
          </div>
          <div class="card-body">
            ${total === 0 ? `
              <div class="text-center text-muted py-3">No device data available</div>
            ` : `
              <div class="flex items-center gap-6 mb-4">
                <div style="position:relative; width:120px; height:120px;">
                  <svg viewBox="0 0 36 36" style="width:120px; height:120px; transform: rotate(-90deg);">
                    <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--gray-100)" stroke-width="3"/>
                    <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--success)" stroke-width="3"
                      stroke-dasharray="${compPct} ${100 - compPct}"
                      stroke-linecap="round" style="transition: stroke-dasharray 0.8s ease;"/>
                  </svg>
                  <div style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center; flex-direction:column;">
                    <span class="text-2xl fw-700">${compPct}%</span>
                    <span class="text-xs text-muted">Compliant</span>
                  </div>
                </div>
                <div class="flex flex-col gap-3" style="flex:1;">
                  <div>
                    <div class="flex justify-between mb-1">
                      <span class="text-sm">Compliant</span>
                      <span class="text-sm fw-600" style="color:var(--success);">${compliant}</span>
                    </div>
                    <div class="progress-bar"><div class="progress-bar-fill green" style="width:${total > 0 ? (compliant/total*100) : 0}%"></div></div>
                  </div>
                  <div>
                    <div class="flex justify-between mb-1">
                      <span class="text-sm">Non-Compliant</span>
                      <span class="text-sm fw-600" style="color:var(--danger);">${nonCompliant}</span>
                    </div>
                    <div class="progress-bar"><div class="progress-bar-fill red" style="width:${total > 0 ? (nonCompliant/total*100) : 0}%"></div></div>
                  </div>
                  <div>
                    <div class="flex justify-between mb-1">
                      <span class="text-sm">Unknown</span>
                      <span class="text-sm fw-600" style="color:var(--ink-tertiary);">${total - compliant - nonCompliant}</span>
                    </div>
                    <div class="progress-bar"><div class="progress-bar-fill" style="width:${total > 0 ? ((total-compliant-nonCompliant)/total*100) : 0}%; background: var(--gray-300);"></div></div>
                  </div>
                </div>
              </div>
            `}
          </div>
        </div>

        <!-- OS Distribution -->
        <div class="card animate-fade-up">
          <div class="card-header">
            <div class="card-header-title">Device Platform Distribution</div>
          </div>
          <div class="card-body">
            ${total === 0 ? `
              <div class="text-center text-muted py-3">No device data available</div>
            ` : `
              <div class="flex flex-col gap-4">
                <div class="flex items-center gap-3">
                  <div class="table-device-icon" style="background: var(--primary-pale);">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="var(--primary)"><path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801"/></svg>
                  </div>
                  <div style="flex:1;">
                    <div class="flex justify-between mb-1">
                      <span class="text-sm fw-500">Windows</span>
                      <span class="text-sm text-muted">${windows}</span>
                    </div>
                    <div class="progress-bar"><div class="progress-bar-fill" style="width:${total > 0 ? (windows/total*100) : 0}%"></div></div>
                  </div>
                </div>
                <div class="flex items-center gap-3">
                  <div class="table-device-icon" style="background: var(--gray-100);">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="#555"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
                  </div>
                  <div style="flex:1;">
                    <div class="flex justify-between mb-1">
                      <span class="text-sm fw-500">macOS</span>
                      <span class="text-sm text-muted">${mac}</span>
                    </div>
                    <div class="progress-bar"><div class="progress-bar-fill" style="width:${total > 0 ? (mac/total*100) : 0}%; background: var(--gray-600);"></div></div>
                  </div>
                </div>
                <div class="flex items-center gap-3">
                  <div class="table-device-icon" style="background: var(--success-pale);">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--success)" stroke-width="2"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
                  </div>
                  <div style="flex:1;">
                    <div class="flex justify-between mb-1">
                      <span class="text-sm fw-500">iOS / Android</span>
                      <span class="text-sm text-muted">${mobile}</span>
                    </div>
                    <div class="progress-bar"><div class="progress-bar-fill green" style="width:${total > 0 ? (mobile/total*100) : 0}%"></div></div>
                  </div>
                </div>
              </div>
            `}
          </div>
        </div>
      </div>

      <!-- Tenant Health Grid (mini cards) -->
      ${tenants.length > 0 ? `
        <div class="card animate-fade-up mb-6">
          <div class="card-header">
            <div class="card-header-title">Tenant Health Overview</div>
            <button class="btn btn-ghost btn-sm" onclick="Router.navigate('tenants')">View All</button>
          </div>
          <div class="card-body">
            <div class="grid grid-auto gap-3 stagger">
              ${tenants.slice(0, 8).map((t, i) => {
                const tDevices = AppState.get('devices')[t.id] || [];
                const tCompliant = tDevices.filter(d => d.complianceState === 'compliant').length;
                const tTotal = tDevices.length;
                const tPct = tTotal > 0 ? Math.round((tCompliant / tTotal) * 100) : 0;
                return `
                  <div class="tenant-card ${tPct >= 80 ? '' : tPct >= 50 ? 'warning' : 'critical'} animate-fade-up"
                       onclick="Tenants.selectTenant('${t.id}')" style="animation-delay: ${i * 50}ms; padding: 12px 16px;">
                    <div class="flex items-center justify-between mb-2">
                      <span class="fw-500 truncate" style="font-size: var(--text-sm);">${t.displayName}</span>
                      <span class="badge ${t.connectionType === 'gdap' ? 'badge-primary' : 'badge-default'}" style="font-size:10px;">${t.connectionType === 'gdap' ? 'GDAP' : 'Direct'}</span>
                    </div>
                    <div class="flex items-center gap-3">
                      <span class="text-xs text-muted">${tTotal} devices</span>
                      <div class="progress-bar" style="flex:1;">
                        <div class="progress-bar-fill ${tPct >= 80 ? 'green' : tPct >= 50 ? 'orange' : 'red'}" style="width:${tPct}%"></div>
                      </div>
                      <span class="text-xs fw-600">${tPct}%</span>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
            ${tenants.length > 8 ? `<div class="text-center mt-3"><button class="btn btn-ghost btn-sm" onclick="Router.navigate('tenants')">+${tenants.length - 8} more tenants</button></div>` : ''}
          </div>
        </div>
      ` : ''}

      <!-- Recently Non-Compliant Devices -->
      ${nonCompliant > 0 ? `
        <div class="card animate-fade-up mb-6">
          <div class="card-header">
            <div>
              <div class="card-header-title">Non-Compliant Devices</div>
              <div class="card-header-subtitle">Devices requiring attention</div>
            </div>
            <button class="btn btn-ghost btn-sm" onclick="Devices.complianceFilter='noncompliant'; Router.navigate('devices');">View All</button>
          </div>
          <table class="table">
            <thead>
              <tr>
                <th>Device</th>
                <th>Tenant</th>
                <th>OS</th>
                <th>User</th>
                <th>Last Sync</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              ${allDevices.filter(d => d.complianceState === 'noncompliant').slice(0, 5).map(d => `
                <tr onclick="Devices.showDetail('${d._tenantId}','${d.id}')" style="cursor:pointer;">
                  <td>
                    <div class="table-device-name">
                      <div class="table-device-icon">${Devices.getOSIcon(d.operatingSystem)}</div>
                      <span class="fw-500">${d.deviceName || 'Unknown'}</span>
                    </div>
                  </td>
                  <td><span class="chip">${AppState.getTenantName(d._tenantId)}</span></td>
                  <td class="text-sm">${d.operatingSystem || '-'}</td>
                  <td class="text-sm">${d.userPrincipalName || '-'}</td>
                  <td class="text-sm">${Devices.formatDate(d.lastSyncDateTime)}</td>
                  <td><button class="btn btn-ghost btn-sm" onclick="event.stopPropagation(); Devices.action('sync','${d._tenantId}','${d.id}')">Sync</button></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : ''}

      <!-- Getting Started (if no tenants) -->
      ${tenants.length === 0 ? `
        <div class="card animate-fade-up">
          <div class="card-body" style="padding: 3rem;">
            <div class="text-center">
              <div class="stat-card-icon blue" style="width:64px; height:64px; margin: 0 auto 1.5rem; font-size:28px;">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
              </div>
              <h2 style="margin-bottom: 0.5rem;">Get Started with MSP Device Manager</h2>
              <p class="text-muted" style="max-width: 500px; margin: 0 auto 2rem;">
                Connect your Microsoft 365 tenants to start managing devices across all your customers from a single dashboard.
              </p>
              <div class="grid grid-3 gap-4" style="max-width: 700px; margin: 0 auto;">
                <div class="card" style="text-align: left;">
                  <div class="card-body-compact">
                    <div class="badge badge-primary mb-2">Step 1</div>
                    <h4 class="mb-1">Register App</h4>
                    <p class="text-xs text-muted">Create an Azure AD App Registration with device management permissions.</p>
                  </div>
                </div>
                <div class="card" style="text-align: left;">
                  <div class="card-body-compact">
                    <div class="badge badge-primary mb-2">Step 2</div>
                    <h4 class="mb-1">Connect Tenants</h4>
                    <p class="text-xs text-muted">Sign in with Microsoft or connect all customers via Partner Center GDAP.</p>
                  </div>
                </div>
                <div class="card" style="text-align: left;">
                  <div class="card-body-compact">
                    <div class="badge badge-primary mb-2">Step 3</div>
                    <h4 class="mb-1">Manage Devices</h4>
                    <p class="text-xs text-muted">View, sync, restart, lock, and manage all devices across all tenants.</p>
                  </div>
                </div>
              </div>
              <button class="btn btn-primary btn-lg mt-6" onclick="Auth.showConnectModal()">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
                Connect Your First Tenant
              </button>
            </div>
          </div>
        </div>
      ` : ''}

      <!-- Sponsor Showcase -->
      <div class="mt-6">
        ${Sponsor.renderPoweredBy()}
      </div>
    `;
  }
};
