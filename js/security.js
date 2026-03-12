/* ============================================================
   Security — Endpoint Security policies (antivirus, firewall, etc.)
   ============================================================ */

const Security = {
  render() {
    const main = document.getElementById('mainContent');
    const policies = AppState.getForContext('securityPolicies');
    const isAll = AppState.get('activeTenant') === 'all';

    // Group by type
    const byType = {};
    policies.forEach(p => {
      const type = p._type || 'Other';
      if (!byType[type]) byType[type] = [];
      byType[type].push(p);
    });

    main.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h1 class="page-title">Endpoint Security</h1>
          <p class="page-subtitle">Manage antivirus, firewall, and disk encryption policies ${isAll ? 'across all tenants' : ''}</p>
        </div>
      </div>

      <!-- Tabs for security types -->
      <div class="tabs">
        <div class="tab active" onclick="Security.showTab(this, 'all')">All (${policies.length})</div>
        ${Object.entries(byType).map(([type, items]) =>
          `<div class="tab" onclick="Security.showTab(this, '${type}')">${type} (${items.length})</div>`
        ).join('')}
      </div>

      ${policies.length === 0 ? `
        <div class="card">
          <div class="empty-state">
            <div class="empty-state-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
            </div>
            <h3 class="empty-state-title">No Endpoint Security Policies</h3>
            <p class="empty-state-text">Connect a tenant to view and manage endpoint security policies.</p>
          </div>
        </div>
      ` : `
        <div class="grid grid-auto gap-4 stagger" id="securityGrid">
          ${policies.map((p, i) => `
            <div class="card card-interactive animate-fade-up" data-type="${p._type || 'Other'}" style="animation-delay: ${i * 50}ms;">
              <div class="card-body-compact">
                <div class="flex items-center gap-3 mb-3">
                  <div class="stat-card-icon ${p._type === 'Antivirus' ? 'green' : p._type === 'Firewall' ? 'blue' : 'orange'}" style="width:36px;height:36px;">
                    ${p._type === 'Antivirus' ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>' :
                      p._type === 'Firewall' ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>' :
                      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>'}
                  </div>
                  <div style="flex:1;min-width:0;">
                    <div class="fw-600 truncate">${p.displayName || 'Unnamed Policy'}</div>
                    <div class="text-xs text-muted">${p._type || 'Security Policy'}</div>
                  </div>
                </div>
                ${isAll ? `<div class="chip mb-2">${AppState.getTenantName(p._tenantId)}</div>` : ''}
                <div class="text-xs text-muted">${p.description || 'No description'}</div>
              </div>
            </div>
          `).join('')}
        </div>
      `}
    `;
  },

  showTab(el, type) {
    document.querySelectorAll('.tabs .tab').forEach(t => t.classList.remove('active'));
    el.classList.add('active');
    document.querySelectorAll('#securityGrid .card').forEach(card => {
      card.style.display = (type === 'all' || card.dataset.type === type) ? '' : 'none';
    });
  }
};
