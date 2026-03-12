/* ============================================================
   Updates — Windows Update Rings management
   ============================================================ */

const Updates = {
  render() {
    const main = document.getElementById('mainContent');
    const rings = AppState.getForContext('updateRings');
    const isAll = AppState.get('activeTenant') === 'all';

    main.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h1 class="page-title">Windows Updates</h1>
          <p class="page-subtitle">Manage Windows Update for Business rings ${isAll ? 'across all tenants' : ''}</p>
        </div>
      </div>

      ${rings.length === 0 ? `
        <div class="card">
          <div class="empty-state">
            <div class="empty-state-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg>
            </div>
            <h3 class="empty-state-title">No Update Rings</h3>
            <p class="empty-state-text">Connect a tenant to view Windows Update for Business configuration rings.</p>
          </div>
        </div>
      ` : `
        <div class="grid grid-auto gap-4 stagger">
          ${rings.map((r, i) => `
            <div class="card animate-fade-up" style="animation-delay: ${i * 60}ms;">
              <div class="card-body-compact">
                <div class="flex items-center gap-3 mb-3">
                  <div class="stat-card-icon blue" style="width:36px;height:36px;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg>
                  </div>
                  <div style="flex:1;min-width:0;">
                    <div class="fw-600 truncate">${r.displayName || 'Update Ring'}</div>
                    <div class="text-xs text-muted">${r.description || 'Windows Update for Business'}</div>
                  </div>
                </div>
                ${isAll ? `<div class="chip mb-2">${AppState.getTenantName(r._tenantId)}</div>` : ''}
                <div class="grid grid-2 gap-2 mt-3">
                  <div>
                    <div class="text-xs text-muted">Feature Update Deferral</div>
                    <div class="text-sm fw-500">${r.featureUpdatesDeferralPeriodInDays || 0} days</div>
                  </div>
                  <div>
                    <div class="text-xs text-muted">Quality Update Deferral</div>
                    <div class="text-sm fw-500">${r.qualityUpdatesDeferralPeriodInDays || 0} days</div>
                  </div>
                  <div>
                    <div class="text-xs text-muted">Auto Restart</div>
                    <div class="text-sm fw-500">${r.automaticUpdateMode || 'Not configured'}</div>
                  </div>
                  <div>
                    <div class="text-xs text-muted">Last Modified</div>
                    <div class="text-sm fw-500">${Devices.formatDate(r.lastModifiedDateTime)}</div>
                  </div>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      `}
    `;
  }
};
