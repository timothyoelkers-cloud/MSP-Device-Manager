/* ============================================================
   Configurations — Device configuration profiles
   ============================================================ */

const Configurations = {
  render() {
    const main = document.getElementById('mainContent');
    const profiles = AppState.getForContext('configProfiles');
    const isAll = AppState.get('activeTenant') === 'all';

    main.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h1 class="page-title">Configuration Profiles</h1>
          <p class="page-subtitle">${profiles.length} configuration profiles ${isAll ? 'across all tenants' : ''}</p>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-primary" onclick="Configurations.showCreate()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Create Profile
          </button>
        </div>
      </div>

      <!-- Profiles Grid -->
      ${profiles.length === 0 ? `
        <div class="card">
          <div class="empty-state">
            <div class="empty-state-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/></svg>
            </div>
            <h3 class="empty-state-title">No Configuration Profiles</h3>
            <p class="empty-state-text">Connect a tenant to view and manage device configuration profiles.</p>
          </div>
        </div>
      ` : `
        <div class="table-wrapper animate-fade">
          <div class="table-toolbar">
            <div class="table-toolbar-left">
              <div class="table-search">
                <span class="table-search-icon">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                </span>
                <input type="text" placeholder="Search profiles..." oninput="Configurations.filterTable(this.value)">
              </div>
            </div>
          </div>
          <table class="table" id="configTable">
            <thead>
              <tr>
                <th>Profile Name</th>
                ${isAll ? '<th>Tenant</th>' : ''}
                <th>Platform</th>
                <th>Type</th>
                <th>Created</th>
                <th>Last Modified</th>
              </tr>
            </thead>
            <tbody>
              ${profiles.map(p => `
                <tr>
                  <td>
                    <div class="fw-500">${p.displayName || 'Unnamed Profile'}</div>
                    <div class="text-xs text-muted">${p.description || ''}</div>
                  </td>
                  ${isAll ? `<td><span class="chip">${AppState.getTenantName(p._tenantId)}</span></td>` : ''}
                  <td><span class="badge badge-default">${this.getPlatform(p)}</span></td>
                  <td class="text-sm">${this.getProfileType(p)}</td>
                  <td class="text-sm">${Devices.formatDate(p.createdDateTime)}</td>
                  <td class="text-sm">${Devices.formatDate(p.lastModifiedDateTime)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `}
    `;
  },

  getPlatform(profile) {
    const type = profile['@odata.type'] || '';
    if (type.includes('windows')) return 'Windows';
    if (type.includes('ios')) return 'iOS';
    if (type.includes('macOS')) return 'macOS';
    if (type.includes('android')) return 'Android';
    return 'All';
  },

  getProfileType(profile) {
    const type = profile['@odata.type'] || '';
    if (type.includes('CustomConfiguration')) return 'Custom';
    if (type.includes('GeneralDeviceConfiguration')) return 'Device Restrictions';
    if (type.includes('EndpointProtection')) return 'Endpoint Protection';
    if (type.includes('WiFi')) return 'Wi-Fi';
    if (type.includes('Vpn')) return 'VPN';
    if (type.includes('Email')) return 'Email';
    if (type.includes('Update')) return 'Update Ring';
    return 'Configuration';
  },

  filterTable(term) {
    const rows = document.querySelectorAll('#configTable tbody tr');
    rows.forEach(row => {
      row.style.display = row.textContent.toLowerCase().includes(term.toLowerCase()) ? '' : 'none';
    });
  },

  showCreate() {
    Toast.show('Profile creation wizard coming in next release', 'info');
  }
};
