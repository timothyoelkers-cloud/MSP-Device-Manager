/* ============================================================
   Compliance — Compliance policies view/assign
   ============================================================ */

const Compliance = {
  render() {
    const main = document.getElementById('mainContent');
    const policies = AppState.getForContext('compliancePolicies');
    const isAll = AppState.get('activeTenant') === 'all';

    main.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h1 class="page-title">Compliance Policies</h1>
          <p class="page-subtitle">${policies.length} compliance policies ${isAll ? 'across all tenants' : ''}</p>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-primary" onclick="Compliance.showCreate()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Create Policy
          </button>
        </div>
      </div>

      <!-- Stats -->
      <div class="grid grid-3 gap-4 mb-6 stagger">
        <div class="stat-card animate-fade-up">
          <div class="stat-card-icon blue">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
          <div class="stat-card-value">${policies.length}</div>
          <div class="stat-card-label">Total Policies</div>
        </div>
        <div class="stat-card animate-fade-up">
          <div class="stat-card-icon green">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          </div>
          <div class="stat-card-value">${this.getDeviceCompliance().compliant}</div>
          <div class="stat-card-label">Compliant Devices</div>
        </div>
        <div class="stat-card animate-fade-up">
          <div class="stat-card-icon red">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
          </div>
          <div class="stat-card-value">${this.getDeviceCompliance().nonCompliant}</div>
          <div class="stat-card-label">Non-Compliant Devices</div>
        </div>
      </div>

      <!-- Policies Table -->
      <div class="table-wrapper animate-fade">
        <div class="table-toolbar">
          <div class="table-toolbar-left">
            <div class="table-search">
              <span class="table-search-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              </span>
              <input type="text" placeholder="Search policies..." oninput="Compliance.filterTable(this.value)">
            </div>
          </div>
        </div>
        <table class="table" id="complianceTable">
          <thead>
            <tr>
              <th>Policy Name</th>
              ${isAll ? '<th>Tenant</th>' : ''}
              <th>Platform</th>
              <th>Created</th>
              <th>Last Modified</th>
              <th style="width:40px;"></th>
            </tr>
          </thead>
          <tbody>
            ${policies.length === 0 ? `
              <tr><td colspan="${isAll ? 6 : 5}" class="text-center text-muted" style="padding:3rem;">No compliance policies found. Connect a tenant to view policies.</td></tr>
            ` : policies.map(p => `
              <tr>
                <td>
                  <div class="flex items-center gap-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                    <div>
                      <div class="fw-500">${p.displayName || 'Unnamed Policy'}</div>
                      <div class="text-xs text-muted">${p.description || ''}</div>
                    </div>
                  </div>
                </td>
                ${isAll ? `<td><span class="chip">${AppState.getTenantName(p._tenantId)}</span></td>` : ''}
                <td><span class="badge badge-default">${this.getPlatform(p)}</span></td>
                <td class="text-sm">${Devices.formatDate(p.createdDateTime)}</td>
                <td class="text-sm">${Devices.formatDate(p.lastModifiedDateTime)}</td>
                <td>
                  <button class="btn btn-ghost btn-icon" onclick="Compliance.viewPolicy('${p._tenantId}','${p.id}')">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  getPlatform(policy) {
    const type = policy['@odata.type'] || '';
    if (type.includes('windows')) return 'Windows';
    if (type.includes('ios')) return 'iOS';
    if (type.includes('macOS') || type.includes('macos')) return 'macOS';
    if (type.includes('android')) return 'Android';
    return 'All';
  },

  getDeviceCompliance() {
    const devices = AppState.getDevicesForContext();
    return {
      compliant: devices.filter(d => d.complianceState === 'compliant').length,
      nonCompliant: devices.filter(d => d.complianceState === 'noncompliant').length
    };
  },

  filterTable(term) {
    const rows = document.querySelectorAll('#complianceTable tbody tr');
    rows.forEach(row => {
      row.style.display = row.textContent.toLowerCase().includes(term.toLowerCase()) ? '' : 'none';
    });
  },

  viewPolicy(tenantId, policyId) {
    Toast.show('Policy details panel coming soon', 'info');
  },

  showCreate() {
    Toast.show('Policy creation wizard coming in next release', 'info');
  }
};
