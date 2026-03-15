/* ============================================================
   Configurations — Device configuration profiles with
   creation wizard, cards/table toggle, assign & delete
   ============================================================ */

const Configurations = {

  // Local view state
  viewMode: 'grid', // 'grid' | 'table'

  // Wizard state — reset each time the wizard opens
  wizardState: {
    step: 1,
    platform: '',
    profileType: '',
    settings: {},
    name: '',
    description: '',
    assignGroups: []
  },

  /* ----------------------------------------------------------
     Platform & type metadata
     ---------------------------------------------------------- */

  platforms: [
    { id: 'windows10', label: 'Windows 10/11', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="8" height="8"/><rect x="13" y="3" width="8" height="8"/><rect x="3" y="13" width="8" height="8"/><rect x="13" y="13" width="8" height="8"/></svg>' },
    { id: 'ios', label: 'iOS / iPadOS', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>' },
    { id: 'macOS', label: 'macOS', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>' },
    { id: 'android', label: 'Android', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>' }
  ],

  profileTypes: [
    { id: 'deviceRestrictions', label: 'Device Restrictions', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>' },
    { id: 'wifi', label: 'Wi-Fi Configuration', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>' },
    { id: 'vpn', label: 'VPN Configuration', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>' },
    { id: 'email', label: 'Email Configuration', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>' },
    { id: 'custom', label: 'Custom (OMA-URI)', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>', windowsOnly: true },
    { id: 'endpointProtection', label: 'Endpoint Protection', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>' },
    { id: 'windowsHello', label: 'Windows Hello for Business', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>', windowsOnly: true },
    { id: 'kioskMode', label: 'Kiosk Mode', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>', windowsOnly: true },
    { id: 'editionUpgrade', label: 'Edition Upgrade', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14"/></svg>', windowsOnly: true },
  ],

  /* ----------------------------------------------------------
     Helpers
     ---------------------------------------------------------- */

  getPlatform(profile) {
    const type = profile['@odata.type'] || '';
    if (type.includes('windows')) return 'Windows';
    if (type.includes('ios') || type.includes('iOS')) return 'iOS';
    if (type.includes('macOS')) return 'macOS';
    if (type.includes('android')) return 'Android';
    return 'All';
  },

  getPlatformBadgeClass(platform) {
    const map = { Windows: 'badge-info', iOS: 'badge-warning', macOS: 'badge-default', Android: 'badge-success' };
    return map[platform] || 'badge-default';
  },

  getProfileType(profile) {
    const type = profile['@odata.type'] || '';
    if (type.includes('CustomConfiguration')) return 'Custom';
    if (type.includes('GeneralDeviceConfiguration') || type.includes('General')) return 'Device Restrictions';
    if (type.includes('EndpointProtection')) return 'Endpoint Protection';
    if (type.includes('WiFi') || type.includes('Wifi')) return 'Wi-Fi';
    if (type.includes('Vpn') || type.includes('VPN')) return 'VPN';
    if (type.includes('Email') || type.includes('email')) return 'Email';
    if (type.includes('Update')) return 'Update Ring';
    if (type.includes('IdentityProtection') || type.includes('Hello')) return 'Windows Hello';
    if (type.includes('editionUpgrade') || type.includes('EditionUpgrade')) return 'Edition Upgrade';
    return 'Configuration';
  },

  getTypeBadgeClass(profileType) {
    const map = {
      'Device Restrictions': 'badge-warning',
      'Wi-Fi': 'badge-info',
      VPN: 'badge-success',
      Email: 'badge-default',
      Custom: 'badge-danger',
      'Endpoint Protection': 'badge-danger',
      'Update Ring': 'badge-info',
      'Windows Hello': 'badge-success',
      'Edition Upgrade': 'badge-warning'
    };
    return map[profileType] || 'badge-default';
  },

  /* ----------------------------------------------------------
     Main render
     ---------------------------------------------------------- */

  render() {
    const main = document.getElementById('mainContent');
    const profiles = AppState.getForContext('configProfiles');
    const isAll = AppState.get('activeTenant') === 'all';

    main.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h1 class="page-title">Configuration Profiles</h1>
          <p class="page-subtitle">${profiles.length} configuration profile${profiles.length !== 1 ? 's' : ''} ${isAll ? 'across all tenants' : ''}</p>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-primary" onclick="Configurations.openWizard()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Create Profile
          </button>
        </div>
      </div>

      ${profiles.length === 0 ? this._renderEmpty() : this._renderProfiles(profiles, isAll)}
    `;
  },

  /* ---------- Empty state ---------- */

  _renderEmpty() {
    return `
      <div class="card">
        <div class="empty-state">
          <div class="empty-state-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/></svg>
          </div>
          <h3 class="empty-state-title">No Configuration Profiles</h3>
          <p class="empty-state-text">Connect a tenant to view and manage device configuration profiles.</p>
        </div>
      </div>`;
  },

  /* ---------- Toolbar + profiles (both views) ---------- */

  _renderProfiles(profiles, isAll) {
    return `
      <div class="table-wrapper animate-fade">
        <div class="table-toolbar">
          <div class="table-toolbar-left">
            <div class="table-search">
              <span class="table-search-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              </span>
              <input type="text" placeholder="Search profiles..." oninput="Configurations.filterProfiles(this.value)">
            </div>
          </div>
          <div class="table-toolbar-right" style="display:flex;gap:4px;">
            <button class="btn btn-ghost btn-icon ${this.viewMode === 'grid' ? 'active' : ''}" title="Grid view" onclick="Configurations.setViewMode('grid')">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
            </button>
            <button class="btn btn-ghost btn-icon ${this.viewMode === 'table' ? 'active' : ''}" title="Table view" onclick="Configurations.setViewMode('table')">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
            </button>
          </div>
        </div>

        <div id="configProfilesContainer">
          ${this.viewMode === 'grid'
            ? this._renderGrid(profiles, isAll)
            : this._renderTable(profiles, isAll)}
        </div>
      </div>`;
  },

  /* ---------- Grid (cards) view ---------- */

  _renderGrid(profiles, isAll) {
    return `
      <div class="grid grid-3 gap-4 stagger" id="configGrid" style="padding:var(--space-4)">
        ${profiles.map(p => {
          const platform = this.getPlatform(p);
          const pType = this.getProfileType(p);
          return `
            <div class="card animate-fade-up config-card" data-search="${(p.displayName || '').toLowerCase()} ${(p.description || '').toLowerCase()}">
              <div style="padding:var(--space-4)">
                <div class="flex items-center gap-2 mb-2">
                  <span class="badge ${this.getPlatformBadgeClass(platform)}">${platform}</span>
                  <span class="badge ${this.getTypeBadgeClass(pType)}">${pType}</span>
                  ${isAll ? `<span class="chip" style="margin-left:auto">${AppState.getTenantName(p._tenantId)}</span>` : ''}
                </div>
                <h3 class="fw-500 mb-1" style="font-size:0.95rem;line-height:1.3">${p.displayName || 'Unnamed Profile'}</h3>
                <p class="text-xs text-muted mb-3" style="min-height:2.4em;line-height:1.2em">${p.description || 'No description'}</p>
                <div class="text-xs text-muted mb-3">Last modified ${Devices.formatDate(p.lastModifiedDateTime)}</div>
                <div class="flex gap-2" style="border-top:1px solid var(--border);padding-top:var(--space-3)">
                  <button class="btn btn-ghost btn-sm" onclick="Configurations.viewSettings('${p._tenantId}','${p.id}')">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    View
                  </button>
                  <button class="btn btn-ghost btn-sm" onclick="Configurations.showAssign('${p._tenantId}','${p.id}','${(p.displayName || '').replace(/'/g, '\\&#39;')}')">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
                    Assign
                  </button>
                  <button class="btn btn-ghost btn-sm text-danger" style="margin-left:auto" onclick="Configurations.confirmDelete('${p._tenantId}','${p.id}','${(p.displayName || '').replace(/'/g, '\\&#39;')}')">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
                  </button>
                </div>
              </div>
            </div>`;
        }).join('')}
      </div>`;
  },

  /* ---------- Table view ---------- */

  _renderTable(profiles, isAll) {
    return `
      <table class="table" id="configTable">
        <thead>
          <tr>
            <th>Profile Name</th>
            ${isAll ? '<th>Tenant</th>' : ''}
            <th>Platform</th>
            <th>Type</th>
            <th>Created</th>
            <th>Last Modified</th>
            <th style="width:120px"></th>
          </tr>
        </thead>
        <tbody>
          ${profiles.map(p => {
            const platform = this.getPlatform(p);
            const pType = this.getProfileType(p);
            return `
              <tr data-search="${(p.displayName || '').toLowerCase()} ${(p.description || '').toLowerCase()}">
                <td>
                  <div class="fw-500">${p.displayName || 'Unnamed Profile'}</div>
                  <div class="text-xs text-muted">${p.description || ''}</div>
                </td>
                ${isAll ? `<td><span class="chip">${AppState.getTenantName(p._tenantId)}</span></td>` : ''}
                <td><span class="badge ${this.getPlatformBadgeClass(platform)}">${platform}</span></td>
                <td><span class="badge ${this.getTypeBadgeClass(pType)}">${pType}</span></td>
                <td class="text-sm">${Devices.formatDate(p.createdDateTime)}</td>
                <td class="text-sm">${Devices.formatDate(p.lastModifiedDateTime)}</td>
                <td>
                  <div class="flex gap-1">
                    <button class="btn btn-ghost btn-icon" title="View settings" onclick="Configurations.viewSettings('${p._tenantId}','${p.id}')">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    </button>
                    <button class="btn btn-ghost btn-icon" title="Assign" onclick="Configurations.showAssign('${p._tenantId}','${p.id}','${(p.displayName || '').replace(/'/g, '\\&#39;')}')">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                    </button>
                    <button class="btn btn-ghost btn-icon text-danger" title="Delete" onclick="Configurations.confirmDelete('${p._tenantId}','${p.id}','${(p.displayName || '').replace(/'/g, '\\&#39;')}')">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
                    </button>
                  </div>
                </td>
              </tr>`;
          }).join('')}
        </tbody>
      </table>`;
  },

  /* ----------------------------------------------------------
     View toggle & search
     ---------------------------------------------------------- */

  setViewMode(mode) {
    this.viewMode = mode;
    this.render();
  },

  filterProfiles(term) {
    const lower = term.toLowerCase();
    if (this.viewMode === 'grid') {
      document.querySelectorAll('#configGrid .config-card').forEach(card => {
        card.style.display = card.dataset.search.includes(lower) ? '' : 'none';
      });
    } else {
      document.querySelectorAll('#configTable tbody tr').forEach(row => {
        row.style.display = (row.dataset.search || row.textContent.toLowerCase()).includes(lower) ? '' : 'none';
      });
    }
  },

  // Back-compat alias
  filterTable(term) { this.filterProfiles(term); },

  /* ----------------------------------------------------------
     View settings (detail panel)
     ---------------------------------------------------------- */

  viewSettings(tenantId, profileId) {
    const profiles = AppState.getForContext('configProfiles');
    const p = profiles.find(x => x.id === profileId && x._tenantId === tenantId);
    if (!p) return Toast.show('Profile not found', 'error');

    const platform = this.getPlatform(p);
    const pType = this.getProfileType(p);

    // Build a readable settings list from known keys
    const ignoreKeys = new Set(['id', '@odata.type', 'displayName', 'description', 'version',
      'createdDateTime', 'lastModifiedDateTime', '_tenantId', 'roleScopeTagIds',
      'supportsScopeTags', 'deviceManagementApplicabilityRuleOsEdition',
      'deviceManagementApplicabilityRuleOsVersion', 'deviceManagementApplicabilityRuleDeviceMode']);

    const settings = Object.entries(p)
      .filter(([k]) => !ignoreKeys.has(k) && !k.startsWith('@'))
      .map(([k, v]) => {
        const label = k.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
        let val = v;
        if (typeof v === 'boolean') val = v ? 'Yes' : 'No';
        else if (v === null || v === undefined) val = '-';
        else if (Array.isArray(v)) val = v.length ? v.map(i => typeof i === 'object' ? JSON.stringify(i) : i).join(', ') : '-';
        else if (typeof v === 'object') val = JSON.stringify(v);
        return `<tr><td class="fw-500 text-sm" style="white-space:nowrap;padding-right:var(--space-4)">${label}</td><td class="text-sm" style="word-break:break-all">${val}</td></tr>`;
      }).join('');

    const modal = document.createElement('div');
    modal.className = 'modal-overlay active';
    modal.id = 'configViewModal';
    modal.innerHTML = `
      <div class="modal" style="max-width:640px">
        <div class="modal-header">
          <h2 class="modal-title">${p.displayName || 'Unnamed Profile'}</h2>
          <button class="btn btn-ghost btn-icon" onclick="document.getElementById('configViewModal').remove()">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="modal-body" style="max-height:60vh;overflow-y:auto">
          <div class="flex gap-2 mb-4">
            <span class="badge ${this.getPlatformBadgeClass(platform)}">${platform}</span>
            <span class="badge ${this.getTypeBadgeClass(pType)}">${pType}</span>
          </div>
          ${p.description ? `<p class="text-sm text-muted mb-4">${p.description}</p>` : ''}
          <table class="table" style="font-size:0.85rem">
            <tbody>${settings || '<tr><td class="text-muted">No configurable settings found.</td></tr>'}</tbody>
          </table>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" onclick="document.getElementById('configViewModal').remove()">Close</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
  },

  /* ----------------------------------------------------------
     Assign modal
     ---------------------------------------------------------- */

  showAssign(tenantId, profileId, profileName) {
    const groups = AppState.getForContext('groups').filter(g => g._tenantId === tenantId || !g._tenantId);

    const modal = document.createElement('div');
    modal.className = 'modal-overlay active';
    modal.id = 'configAssignModal';
    modal.innerHTML = `
      <div class="modal" style="max-width:500px">
        <div class="modal-header">
          <h2 class="modal-title">Assign Profile</h2>
          <button class="btn btn-ghost btn-icon" onclick="document.getElementById('configAssignModal').remove()">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="modal-body">
          <p class="text-sm mb-4">Assign <strong>${profileName}</strong> to groups:</p>
          <div style="max-height:300px;overflow-y:auto;border:1px solid var(--border);border-radius:var(--radius);padding:var(--space-2)">
            ${groups.length === 0
              ? '<p class="text-sm text-muted" style="padding:var(--space-3)">No groups available. Load groups from a connected tenant first.</p>'
              : groups.map(g => `
                <label class="flex items-center gap-2" style="padding:var(--space-2);cursor:pointer">
                  <input type="checkbox" class="assign-group-cb" value="${g.id}">
                  <span class="text-sm">${g.displayName}</span>
                </label>`).join('')}
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" onclick="document.getElementById('configAssignModal').remove()">Cancel</button>
          <button class="btn btn-primary" onclick="Configurations.doAssign('${tenantId}','${profileId}')">Assign</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
  },

  async doAssign(tenantId, profileId) {
    const checked = document.querySelectorAll('#configAssignModal .assign-group-cb:checked');
    const groupIds = Array.from(checked).map(cb => cb.value);
    if (groupIds.length === 0) return Toast.show('Select at least one group', 'warning');

    try {
      await Graph.assignPolicy(tenantId, profileId, 'configuration', groupIds);
      Toast.show('Profile assigned successfully', 'success');
      document.getElementById('configAssignModal').remove();
    } catch (err) {
      Toast.show('Assign failed: ' + err.message, 'error');
    }
  },

  /* ----------------------------------------------------------
     Delete confirmation
     ---------------------------------------------------------- */

  confirmDelete(tenantId, profileId, profileName) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay active';
    modal.id = 'configDeleteModal';
    modal.innerHTML = `
      <div class="modal" style="max-width:440px">
        <div class="modal-header">
          <h2 class="modal-title">Delete Profile</h2>
          <button class="btn btn-ghost btn-icon" onclick="document.getElementById('configDeleteModal').remove()">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="modal-body">
          <p class="text-sm">Are you sure you want to delete <strong>${profileName}</strong>? This action cannot be undone.</p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" onclick="document.getElementById('configDeleteModal').remove()">Cancel</button>
          <button class="btn btn-danger" onclick="Configurations.doDelete('${tenantId}','${profileId}')">Delete</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
  },

  async doDelete(tenantId, profileId) {
    try {
      await Graph.deletePolicy(tenantId, profileId, 'configuration');
      Toast.show('Profile deleted', 'success');
      document.getElementById('configDeleteModal').remove();
      // Refresh data
      await Graph.loadConfigProfiles(tenantId);
      this.render();
    } catch (err) {
      Toast.show('Delete failed: ' + err.message, 'error');
    }
  },

  /* ==========================================================
     CREATION WIZARD
     ========================================================== */

  openWizard() {
    const tenantId = AppState.get('activeTenant');
    if (!tenantId || tenantId === 'all') {
      return Toast.show('Select a single tenant before creating a profile', 'warning');
    }

    // Reset wizard state
    this.wizardState = {
      step: 1,
      platform: '',
      profileType: '',
      settings: {},
      name: '',
      description: '',
      assignGroups: []
    };

    this._renderWizardModal();
  },

  _renderWizardModal() {
    // Remove existing modal if any
    const existing = document.getElementById('configWizardModal');
    if (existing) existing.remove();

    const s = this.wizardState;
    const stepTitles = ['Platform & Type', 'Settings', 'Name & Assign', 'Review & Create'];

    const modal = document.createElement('div');
    modal.className = 'modal-overlay active';
    modal.id = 'configWizardModal';
    modal.innerHTML = `
      <div class="modal" style="max-width:680px">
        <div class="modal-header">
          <h2 class="modal-title">Create Configuration Profile</h2>
          <button class="btn btn-ghost btn-icon" onclick="document.getElementById('configWizardModal').remove()">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <!-- Step indicator -->
        <div style="display:flex;gap:0;border-bottom:1px solid var(--border)">
          ${stepTitles.map((t, i) => `
            <div style="flex:1;text-align:center;padding:var(--space-3);font-size:0.8rem;font-weight:500;
              ${i + 1 === s.step ? 'color:var(--primary);border-bottom:2px solid var(--primary);' : 'color:var(--text-muted);'}
              ${i + 1 < s.step ? 'color:var(--success);' : ''}">
              ${i + 1}. ${t}
            </div>`).join('')}
        </div>

        <div class="modal-body" style="min-height:320px;max-height:60vh;overflow-y:auto" id="wizardBody">
          ${this._renderWizardStep()}
        </div>

        <div class="modal-footer">
          ${s.step > 1 ? '<button class="btn btn-ghost" onclick="Configurations.wizardBack()">Back</button>' : '<span></span>'}
          ${s.step < 4
            ? `<button class="btn btn-primary" onclick="Configurations.wizardNext()">Next</button>`
            : `<button class="btn btn-primary" id="wizardCreateBtn" onclick="Configurations.wizardCreate()">Create Profile</button>`}
        </div>
      </div>`;
    document.body.appendChild(modal);
  },

  _renderWizardStep() {
    switch (this.wizardState.step) {
      case 1: return this._wizardStep1();
      case 2: return this._wizardStep2();
      case 3: return this._wizardStep3();
      case 4: return this._wizardStep4();
    }
  },

  /* ---------- Step 1: Platform & Type ---------- */

  _wizardStep1() {
    const s = this.wizardState;
    return `
      <div class="mb-4">
        <label class="text-sm fw-500 mb-2" style="display:block">Platform</label>
        <div class="grid grid-2 gap-3">
          ${this.platforms.map(p => `
            <div class="card" style="cursor:pointer;padding:var(--space-3);border:2px solid ${s.platform === p.id ? 'var(--primary)' : 'var(--border)'};transition:border-color .15s"
              onclick="Configurations.wizardSelectPlatform('${p.id}')">
              <div class="flex items-center gap-2">
                ${p.icon}
                <span class="text-sm fw-500">${p.label}</span>
              </div>
            </div>`).join('')}
        </div>
      </div>
      <div>
        <label class="text-sm fw-500 mb-2" style="display:block">Profile Type</label>
        <div class="grid grid-1 gap-2">
          ${this.profileTypes
            .filter(t => !t.windowsOnly || s.platform === 'windows10')
            .map(t => `
            <div class="card" style="cursor:pointer;padding:var(--space-3);border:2px solid ${s.profileType === t.id ? 'var(--primary)' : 'var(--border)'};transition:border-color .15s"
              onclick="Configurations.wizardSelectType('${t.id}')">
              <div class="flex items-center gap-2">
                ${t.icon}
                <span class="text-sm fw-500">${t.label}</span>
              </div>
            </div>`).join('')}
        </div>
      </div>`;
  },

  wizardSelectPlatform(id) {
    this.wizardState.platform = id;
    // If current type is custom but platform isn't windows, reset type
    if (this.wizardState.profileType === 'custom' && id !== 'windows10') {
      this.wizardState.profileType = '';
    }
    this._refreshWizardBody();
  },

  wizardSelectType(id) {
    this.wizardState.profileType = id;
    // Reset settings when type changes
    this.wizardState.settings = {};
    this._refreshWizardBody();
  },

  /* ---------- Step 2: Settings ---------- */

  _wizardStep2() {
    const s = this.wizardState;
    switch (s.profileType) {
      case 'deviceRestrictions': return this._settingsDeviceRestrictions();
      case 'wifi':              return this._settingsWifi();
      case 'vpn':               return this._settingsVpn();
      case 'email':             return this._settingsEmail();
      case 'custom':            return this._settingsCustom();
      case 'endpointProtection': return this._settingsEndpointProtection();
      case 'windowsHello':       return this._settingsWindowsHello();
      case 'kioskMode':          return this._settingsKiosk();
      case 'editionUpgrade':     return this._settingsEditionUpgrade();
      default:                  return '<p class="text-muted">Select a profile type first.</p>';
    }
  },

  _settingsDeviceRestrictions() {
    const cfg = this.wizardState.settings;
    const toggleRow = (key, label, desc) => {
      const checked = cfg[key] === false ? '' : 'checked'; // default allowed
      return `
        <label class="flex items-center gap-3" style="padding:var(--space-3) 0;border-bottom:1px solid var(--border)">
          <input type="checkbox" data-key="${key}" ${checked} onchange="Configurations.wizardToggle('${key}', this.checked)">
          <div>
            <div class="text-sm fw-500">${label}</div>
            <div class="text-xs text-muted">${desc}</div>
          </div>
        </label>`;
    };

    return `
      <h3 class="text-sm fw-500 mb-3">Device Restrictions</h3>
      <p class="text-xs text-muted mb-3">Toggle features on or off. Checked = allowed.</p>
      ${toggleRow('cameraBlocked', 'Camera', 'Allow use of the device camera')}
      ${toggleRow('screenCaptureBlocked', 'Screen Capture', 'Allow screenshots and screen recording')}
      ${toggleRow('bluetoothBlocked', 'Bluetooth', 'Allow Bluetooth connections')}
      ${toggleRow('usbBlocked', 'USB Storage', 'Allow USB removable storage access')}
      ${toggleRow('appStoreBlocked', 'App Store', 'Allow access to the app store')}
      ${toggleRow('iCloudBlockBackup', 'Cloud Backup', 'Allow cloud backup of device data')}`;
  },

  _settingsWifi() {
    const cfg = this.wizardState.settings;
    return `
      <h3 class="text-sm fw-500 mb-3">Wi-Fi Configuration</h3>
      <div class="mb-3">
        <label class="text-sm fw-500 mb-1" style="display:block">SSID (Network Name)</label>
        <input class="form-input" type="text" value="${cfg.ssid || ''}" onchange="Configurations.wizardSet('ssid', this.value)">
      </div>
      <div class="mb-3">
        <label class="text-sm fw-500 mb-1" style="display:block">Security Type</label>
        <select class="form-input" onchange="Configurations.wizardSet('wifiSecurityType', this.value)">
          <option value="open" ${cfg.wifiSecurityType === 'open' ? 'selected' : ''}>Open (No Authentication)</option>
          <option value="wpaPersonal" ${cfg.wifiSecurityType === 'wpaPersonal' ? 'selected' : ''}>WPA/WPA2 - Personal</option>
          <option value="wpaEnterprise" ${cfg.wifiSecurityType === 'wpaEnterprise' ? 'selected' : ''}>WPA/WPA2 - Enterprise</option>
        </select>
      </div>
      <div class="mb-3">
        <label class="text-sm fw-500 mb-1" style="display:block">Pre-Shared Key (Password)</label>
        <input class="form-input" type="password" value="${cfg.preSharedKey || ''}" onchange="Configurations.wizardSet('preSharedKey', this.value)">
      </div>
      <label class="flex items-center gap-2 mb-2">
        <input type="checkbox" ${cfg.connectAutomatically !== false ? 'checked' : ''} onchange="Configurations.wizardToggle('connectAutomatically', this.checked)">
        <span class="text-sm">Connect automatically when in range</span>
      </label>
      <label class="flex items-center gap-2">
        <input type="checkbox" ${cfg.connectWhenNetworkNameIsHidden ? 'checked' : ''} onchange="Configurations.wizardToggle('connectWhenNetworkNameIsHidden', this.checked)">
        <span class="text-sm">Connect even when SSID is hidden</span>
      </label>`;
  },

  _settingsVpn() {
    const cfg = this.wizardState.settings;
    return `
      <h3 class="text-sm fw-500 mb-3">VPN Configuration</h3>
      <div class="mb-3">
        <label class="text-sm fw-500 mb-1" style="display:block">Connection Name</label>
        <input class="form-input" type="text" value="${cfg.connectionName || ''}" onchange="Configurations.wizardSet('connectionName', this.value)">
      </div>
      <div class="mb-3">
        <label class="text-sm fw-500 mb-1" style="display:block">Server Address</label>
        <input class="form-input" type="text" placeholder="vpn.example.com" value="${cfg.server || ''}" onchange="Configurations.wizardSet('server', this.value)">
      </div>
      <div class="mb-3">
        <label class="text-sm fw-500 mb-1" style="display:block">Connection Type</label>
        <select class="form-input" onchange="Configurations.wizardSet('connectionType', this.value)">
          <option value="ikEv2" ${cfg.connectionType === 'ikEv2' ? 'selected' : ''}>IKEv2</option>
          <option value="l2tp" ${cfg.connectionType === 'l2tp' ? 'selected' : ''}>L2TP</option>
          <option value="pptp" ${cfg.connectionType === 'pptp' ? 'selected' : ''}>PPTP</option>
        </select>
      </div>
      <div class="mb-3">
        <label class="text-sm fw-500 mb-1" style="display:block">Authentication Method</label>
        <select class="form-input" onchange="Configurations.wizardSet('authenticationMethod', this.value)">
          <option value="usernameAndPassword" ${cfg.authenticationMethod === 'usernameAndPassword' ? 'selected' : ''}>Username and Password</option>
          <option value="certificate" ${cfg.authenticationMethod === 'certificate' ? 'selected' : ''}>Certificate</option>
          <option value="derivedCredential" ${cfg.authenticationMethod === 'derivedCredential' ? 'selected' : ''}>Derived Credential</option>
        </select>
      </div>`;
  },

  _settingsEmail() {
    const cfg = this.wizardState.settings;
    return `
      <h3 class="text-sm fw-500 mb-3">Email Configuration</h3>
      <div class="mb-3">
        <label class="text-sm fw-500 mb-1" style="display:block">Email Client</label>
        <select class="form-input" onchange="Configurations.wizardSet('emailClient', this.value)">
          <option value="nativeApp" ${cfg.emailClient === 'nativeApp' ? 'selected' : ''}>Native Mail App</option>
          <option value="outlookApp" ${cfg.emailClient === 'outlookApp' ? 'selected' : ''}>Microsoft Outlook</option>
        </select>
      </div>
      <div class="mb-3">
        <label class="text-sm fw-500 mb-1" style="display:block">Email Server (Exchange Host)</label>
        <input class="form-input" type="text" placeholder="outlook.office365.com" value="${cfg.hostName || ''}" onchange="Configurations.wizardSet('hostName', this.value)">
      </div>
      <div class="grid grid-2 gap-3 mb-3">
        <div>
          <label class="text-sm fw-500 mb-1" style="display:block">Port</label>
          <input class="form-input" type="number" value="${cfg.port || 443}" onchange="Configurations.wizardSet('port', parseInt(this.value))">
        </div>
        <div>
          <label class="text-sm fw-500 mb-1" style="display:block">Username Format</label>
          <select class="form-input" onchange="Configurations.wizardSet('usernameSource', this.value)">
            <option value="userPrincipalName" ${cfg.usernameSource === 'userPrincipalName' ? 'selected' : ''}>UPN (user@domain.com)</option>
            <option value="primarySmtpAddress" ${cfg.usernameSource === 'primarySmtpAddress' ? 'selected' : ''}>Primary SMTP Address</option>
            <option value="samAccountName" ${cfg.usernameSource === 'samAccountName' ? 'selected' : ''}>SAM Account Name</option>
          </select>
        </div>
      </div>
      <label class="flex items-center gap-2">
        <input type="checkbox" ${cfg.requireSsl !== false ? 'checked' : ''} onchange="Configurations.wizardToggle('requireSsl', this.checked)">
        <span class="text-sm">Require SSL</span>
      </label>`;
  },

  _settingsCustom() {
    const cfg = this.wizardState.settings;
    // Support a list of OMA-URI entries; start with one
    if (!cfg.omaSettings) cfg.omaSettings = [{ omaUri: '', displayName: '', dataType: 'string', value: '' }];
    const entries = cfg.omaSettings;

    return `
      <h3 class="text-sm fw-500 mb-3">Custom OMA-URI Settings</h3>
      <p class="text-xs text-muted mb-3">Define custom OMA-URI settings for Windows devices.</p>
      <div id="omaEntries">
        ${entries.map((e, i) => `
          <div class="card mb-3" style="padding:var(--space-3);border:1px solid var(--border)">
            <div class="flex items-center gap-2 mb-2">
              <span class="text-sm fw-500">Setting ${i + 1}</span>
              ${entries.length > 1 ? `<button class="btn btn-ghost btn-sm text-danger" style="margin-left:auto" onclick="Configurations.removeOma(${i})">Remove</button>` : ''}
            </div>
            <div class="mb-2">
              <label class="text-xs fw-500 mb-1" style="display:block">Name</label>
              <input class="form-input" type="text" value="${e.displayName || ''}" onchange="Configurations.setOma(${i},'displayName',this.value)">
            </div>
            <div class="mb-2">
              <label class="text-xs fw-500 mb-1" style="display:block">OMA-URI</label>
              <input class="form-input" type="text" placeholder="./Device/Vendor/MSFT/..." value="${e.omaUri || ''}" onchange="Configurations.setOma(${i},'omaUri',this.value)">
            </div>
            <div class="grid grid-2 gap-2">
              <div>
                <label class="text-xs fw-500 mb-1" style="display:block">Data Type</label>
                <select class="form-input" onchange="Configurations.setOma(${i},'dataType',this.value)">
                  <option value="string" ${e.dataType === 'string' ? 'selected' : ''}>String</option>
                  <option value="integer" ${e.dataType === 'integer' ? 'selected' : ''}>Integer</option>
                  <option value="boolean" ${e.dataType === 'boolean' ? 'selected' : ''}>Boolean</option>
                  <option value="base64" ${e.dataType === 'base64' ? 'selected' : ''}>Base64</option>
                  <option value="dateTime" ${e.dataType === 'dateTime' ? 'selected' : ''}>Date/Time</option>
                  <option value="floatingPoint" ${e.dataType === 'floatingPoint' ? 'selected' : ''}>Floating Point</option>
                </select>
              </div>
              <div>
                <label class="text-xs fw-500 mb-1" style="display:block">Value</label>
                <input class="form-input" type="text" value="${e.value || ''}" onchange="Configurations.setOma(${i},'value',this.value)">
              </div>
            </div>
          </div>`).join('')}
      </div>
      <button class="btn btn-ghost btn-sm" onclick="Configurations.addOma()">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Add OMA-URI Setting
      </button>`;
  },

  setOma(index, key, value) {
    this.wizardState.settings.omaSettings[index][key] = value;
  },

  addOma() {
    this.wizardState.settings.omaSettings.push({ omaUri: '', displayName: '', dataType: 'string', value: '' });
    this._refreshWizardBody();
  },

  removeOma(index) {
    this.wizardState.settings.omaSettings.splice(index, 1);
    this._refreshWizardBody();
  },

  _settingsEndpointProtection() {
    const cfg = this.wizardState.settings;
    const toggleRow = (key, label, desc) => {
      const checked = cfg[key] !== false;
      return `<label class="flex items-center gap-3" style="padding:var(--space-3) 0;border-bottom:1px solid var(--border)"><input type="checkbox" ${checked ? 'checked' : ''} onchange="Configurations.wizardToggle('${key}', this.checked)"><div><div class="text-sm fw-500">${label}</div><div class="text-xs text-muted">${desc}</div></div></label>`;
    };
    return `
      <h3 class="text-sm fw-500 mb-3">Endpoint Protection</h3>
      <p class="text-xs text-muted mb-3">Configure Windows Defender and endpoint protection.</p>
      ${toggleRow('defenderRealTimeMonitoring', 'Real-Time Monitoring', 'Enable Defender real-time protection')}
      ${toggleRow('defenderCloudProtection', 'Cloud-Delivered Protection', 'Use cloud for advanced threat detection')}
      ${toggleRow('defenderNetworkProtection', 'Network Protection', 'Protect against web-based threats')}
      ${toggleRow('defenderPUAProtection', 'PUA Protection', 'Block potentially unwanted apps')}
      ${toggleRow('firewallEnabled', 'Windows Firewall', 'Enable Windows Defender Firewall')}
      <div class="mb-3 mt-3"><label class="text-sm fw-500 mb-1" style="display:block">Cloud Block Level</label>
        <select class="form-input" onchange="Configurations.wizardSet('defenderCloudBlockLevel', this.value)">
          <option value="notConfigured" ${(cfg.defenderCloudBlockLevel || 'notConfigured') === 'notConfigured' ? 'selected' : ''}>Not Configured</option>
          <option value="high" ${cfg.defenderCloudBlockLevel === 'high' ? 'selected' : ''}>High</option>
          <option value="highPlus" ${cfg.defenderCloudBlockLevel === 'highPlus' ? 'selected' : ''}>High+</option>
          <option value="zeroTolerance" ${cfg.defenderCloudBlockLevel === 'zeroTolerance' ? 'selected' : ''}>Zero Tolerance</option>
        </select></div>`;
  },

  _settingsWindowsHello() {
    const cfg = this.wizardState.settings;
    const toggleRow = (key, label, desc) => {
      const checked = cfg[key] !== false;
      return `<label class="flex items-center gap-3" style="padding:var(--space-3) 0;border-bottom:1px solid var(--border)"><input type="checkbox" ${checked ? 'checked' : ''} onchange="Configurations.wizardToggle('${key}', this.checked)"><div><div class="text-sm fw-500">${label}</div><div class="text-xs text-muted">${desc}</div></div></label>`;
    };
    return `
      <h3 class="text-sm fw-500 mb-3">Windows Hello for Business</h3>
      <p class="text-xs text-muted mb-3">Configure passwordless authentication.</p>
      ${toggleRow('pinRequired', 'Require PIN', 'Users must set up a PIN')}
      ${toggleRow('fingerprintEnabled', 'Fingerprint', 'Allow fingerprint authentication')}
      ${toggleRow('facialFeaturesEnabled', 'Facial Recognition', 'Allow face unlock')}
      ${toggleRow('securityKeyEnabled', 'Security Key', 'Allow FIDO2 security key')}
      <div class="grid grid-2 gap-3 mt-3">
        <div><label class="text-sm fw-500 mb-1" style="display:block">Min PIN Length</label>
          <input class="form-input" type="number" min="4" max="127" value="${cfg.pinMinLength || 6}" onchange="Configurations.wizardSet('pinMinLength', parseInt(this.value))"></div>
        <div><label class="text-sm fw-500 mb-1" style="display:block">Max PIN Length</label>
          <input class="form-input" type="number" min="4" max="127" value="${cfg.pinMaxLength || 127}" onchange="Configurations.wizardSet('pinMaxLength', parseInt(this.value))"></div>
      </div>`;
  },

  _settingsKiosk() {
    const cfg = this.wizardState.settings;
    return `
      <h3 class="text-sm fw-500 mb-3">Kiosk Mode</h3>
      <p class="text-xs text-muted mb-3">Lock the device to run one or more apps.</p>
      <div class="mb-3"><label class="text-sm fw-500 mb-1" style="display:block">Kiosk Type</label>
        <select class="form-input" onchange="Configurations.wizardSet('kioskModeType', this.value)">
          <option value="singleApp" ${(cfg.kioskModeType || 'singleApp') === 'singleApp' ? 'selected' : ''}>Single App</option>
          <option value="multiApp" ${cfg.kioskModeType === 'multiApp' ? 'selected' : ''}>Multi-App</option>
        </select></div>
      <div class="mb-3"><label class="text-sm fw-500 mb-1" style="display:block">App AUMID or Path *</label>
        <input class="form-input" type="text" value="${cfg.kioskAppId || ''}" onchange="Configurations.wizardSet('kioskAppId', this.value)" placeholder="Microsoft.WindowsCalculator_8wekyb3d8bbwe!App">
        <div class="text-xs text-muted mt-1">UWP: Use AUMID. Win32: Use full exe path.</div></div>
      <div class="mb-3"><label class="text-sm fw-500 mb-1" style="display:block">Auto-Logon</label>
        <select class="form-input" onchange="Configurations.wizardSet('kioskAutoLogon', this.value)">
          <option value="enabled" ${(cfg.kioskAutoLogon || 'enabled') === 'enabled' ? 'selected' : ''}>Enabled</option>
          <option value="disabled" ${cfg.kioskAutoLogon === 'disabled' ? 'selected' : ''}>Disabled</option>
        </select></div>`;
  },

  _settingsEditionUpgrade() {
    const cfg = this.wizardState.settings;
    return `
      <h3 class="text-sm fw-500 mb-3">Windows Edition Upgrade</h3>
      <p class="text-xs text-muted mb-3">Upgrade Windows edition using a product key.</p>
      <div class="mb-3"><label class="text-sm fw-500 mb-1" style="display:block">Target Edition</label>
        <select class="form-input" onchange="Configurations.wizardSet('targetEdition', this.value)">
          <option value="windows10Enterprise" ${(cfg.targetEdition || 'windows10Enterprise') === 'windows10Enterprise' ? 'selected' : ''}>Windows 10/11 Enterprise</option>
          <option value="windows10Education" ${cfg.targetEdition === 'windows10Education' ? 'selected' : ''}>Windows 10/11 Education</option>
        </select></div>
      <div class="mb-3"><label class="text-sm fw-500 mb-1" style="display:block">Product Key *</label>
        <input class="form-input" type="text" value="${cfg.productKey || ''}" onchange="Configurations.wizardSet('productKey', this.value)" placeholder="XXXXX-XXXXX-XXXXX-XXXXX-XXXXX"></div>`;
  },

  /* ---------- Step 3: Name & Assign ---------- */

  _wizardStep3() {
    const s = this.wizardState;
    const tenantId = AppState.get('activeTenant');
    const groups = AppState.getForContext('groups').filter(g => g._tenantId === tenantId || !g._tenantId);

    return `
      <div class="mb-4">
        <label class="text-sm fw-500 mb-1" style="display:block">Profile Name</label>
        <input class="form-input" id="wizardProfileName" type="text" value="${s.name}" onchange="Configurations.wizardState.name=this.value" placeholder="e.g. Windows 10 - Device Restrictions">
      </div>
      <div class="mb-4">
        <label class="text-sm fw-500 mb-1" style="display:block">Description</label>
        <textarea class="form-input" id="wizardProfileDesc" rows="3" onchange="Configurations.wizardState.description=this.value" placeholder="Describe the purpose of this profile...">${s.description}</textarea>
      </div>
      <div>
        <label class="text-sm fw-500 mb-2" style="display:block">Assign to Groups (optional)</label>
        <div style="max-height:200px;overflow-y:auto;border:1px solid var(--border);border-radius:var(--radius);padding:var(--space-2)">
          ${groups.length === 0
            ? '<p class="text-sm text-muted" style="padding:var(--space-3)">No groups available.</p>'
            : groups.map(g => `
              <label class="flex items-center gap-2" style="padding:var(--space-2);cursor:pointer">
                <input type="checkbox" class="wizard-group-cb" value="${g.id}" ${s.assignGroups.includes(g.id) ? 'checked' : ''}
                  onchange="Configurations.wizardToggleGroup('${g.id}', this.checked)">
                <span class="text-sm">${g.displayName}</span>
              </label>`).join('')}
        </div>
      </div>`;
  },

  wizardToggleGroup(groupId, checked) {
    const arr = this.wizardState.assignGroups;
    if (checked && !arr.includes(groupId)) arr.push(groupId);
    if (!checked) {
      const idx = arr.indexOf(groupId);
      if (idx > -1) arr.splice(idx, 1);
    }
  },

  /* ---------- Step 4: Review ---------- */

  _wizardStep4() {
    const s = this.wizardState;
    const platformLabel = (this.platforms.find(p => p.id === s.platform) || {}).label || s.platform;
    const typeLabel = (this.profileTypes.find(t => t.id === s.profileType) || {}).label || s.profileType;

    // Build settings summary
    let settingsSummary = '';
    if (s.profileType === 'deviceRestrictions') {
      const labels = {
        cameraBlocked: 'Camera', screenCaptureBlocked: 'Screen Capture', bluetoothBlocked: 'Bluetooth',
        usbBlocked: 'USB Storage', appStoreBlocked: 'App Store', iCloudBlockBackup: 'Cloud Backup'
      };
      settingsSummary = Object.entries(labels).map(([k, l]) =>
        `<div class="flex items-center gap-2 text-sm" style="padding:2px 0"><span class="fw-500" style="width:140px">${l}</span><span>${s.settings[k] === false ? 'Blocked' : 'Allowed'}</span></div>`
      ).join('');
    } else if (s.profileType === 'wifi') {
      settingsSummary = `
        <div class="text-sm"><strong>SSID:</strong> ${s.settings.ssid || '-'}</div>
        <div class="text-sm"><strong>Security:</strong> ${s.settings.wifiSecurityType || 'open'}</div>
        <div class="text-sm"><strong>Auto-connect:</strong> ${s.settings.connectAutomatically !== false ? 'Yes' : 'No'}</div>
        <div class="text-sm"><strong>Hidden network:</strong> ${s.settings.connectWhenNetworkNameIsHidden ? 'Yes' : 'No'}</div>`;
    } else if (s.profileType === 'vpn') {
      settingsSummary = `
        <div class="text-sm"><strong>Connection:</strong> ${s.settings.connectionName || '-'}</div>
        <div class="text-sm"><strong>Server:</strong> ${s.settings.server || '-'}</div>
        <div class="text-sm"><strong>Type:</strong> ${s.settings.connectionType || 'ikEv2'}</div>
        <div class="text-sm"><strong>Auth:</strong> ${s.settings.authenticationMethod || 'usernameAndPassword'}</div>`;
    } else if (s.profileType === 'email') {
      settingsSummary = `
        <div class="text-sm"><strong>Host:</strong> ${s.settings.hostName || '-'}</div>
        <div class="text-sm"><strong>Port:</strong> ${s.settings.port || 443}</div>
        <div class="text-sm"><strong>SSL:</strong> ${s.settings.requireSsl !== false ? 'Yes' : 'No'}</div>
        <div class="text-sm"><strong>Username:</strong> ${s.settings.usernameSource || 'userPrincipalName'}</div>`;
    } else if (s.profileType === 'custom') {
      const oma = s.settings.omaSettings || [];
      settingsSummary = oma.map(e =>
        `<div class="text-sm" style="padding:2px 0"><strong>${e.displayName || 'Unnamed'}:</strong> ${e.omaUri} = ${e.value} (${e.dataType})</div>`
      ).join('');
    } else if (s.profileType === 'endpointProtection') {
      settingsSummary = `
        <div class="text-sm"><strong>Real-Time:</strong> ${s.settings.defenderRealTimeMonitoring !== false ? 'On' : 'Off'}</div>
        <div class="text-sm"><strong>Cloud Protection:</strong> ${s.settings.defenderCloudProtection !== false ? 'On' : 'Off'}</div>
        <div class="text-sm"><strong>Firewall:</strong> ${s.settings.firewallEnabled !== false ? 'On' : 'Off'}</div>
        <div class="text-sm"><strong>Cloud Block Level:</strong> ${s.settings.defenderCloudBlockLevel || 'Not configured'}</div>`;
    } else if (s.profileType === 'windowsHello') {
      settingsSummary = `
        <div class="text-sm"><strong>PIN:</strong> ${s.settings.pinRequired !== false ? 'Required' : 'Optional'} (${s.settings.pinMinLength || 6}-${s.settings.pinMaxLength || 127})</div>
        <div class="text-sm"><strong>Fingerprint:</strong> ${s.settings.fingerprintEnabled !== false ? 'Enabled' : 'Disabled'}</div>
        <div class="text-sm"><strong>Facial Recognition:</strong> ${s.settings.facialFeaturesEnabled !== false ? 'Enabled' : 'Disabled'}</div>`;
    } else if (s.profileType === 'kioskMode') {
      settingsSummary = `
        <div class="text-sm"><strong>Type:</strong> ${s.settings.kioskModeType === 'multiApp' ? 'Multi-App' : 'Single App'}</div>
        <div class="text-sm"><strong>App:</strong> ${s.settings.kioskAppId || '-'}</div>
        <div class="text-sm"><strong>Auto-Logon:</strong> ${(s.settings.kioskAutoLogon || 'enabled') === 'enabled' ? 'Yes' : 'No'}</div>`;
    } else if (s.profileType === 'editionUpgrade') {
      settingsSummary = `
        <div class="text-sm"><strong>Target:</strong> ${s.settings.targetEdition || 'Enterprise'}</div>
        <div class="text-sm"><strong>Product Key:</strong> ${'*'.repeat(20)}</div>`;
    }

    return `
      <h3 class="text-sm fw-500 mb-3">Review your configuration profile</h3>
      <div class="card" style="padding:var(--space-4);border:1px solid var(--border)">
        <div class="mb-3">
          <div class="text-xs text-muted">Profile Name</div>
          <div class="fw-500">${s.name || '<span class="text-danger">Not set</span>'}</div>
        </div>
        ${s.description ? `<div class="mb-3"><div class="text-xs text-muted">Description</div><div class="text-sm">${s.description}</div></div>` : ''}
        <div class="flex gap-2 mb-3">
          <span class="badge badge-info">${platformLabel}</span>
          <span class="badge badge-warning">${typeLabel}</span>
        </div>
        <div class="mb-3">
          <div class="text-xs text-muted mb-1">Settings</div>
          ${settingsSummary || '<div class="text-sm text-muted">Default settings</div>'}
        </div>
        <div>
          <div class="text-xs text-muted">Assignments</div>
          <div class="text-sm">${s.assignGroups.length > 0 ? s.assignGroups.length + ' group(s) selected' : 'None — you can assign later'}</div>
        </div>
      </div>`;
  },

  /* ---------- Wizard navigation ---------- */

  wizardBack() {
    // Save name/description from Step 3 inputs before going back
    if (this.wizardState.step === 3) {
      const nameEl = document.getElementById('wizardProfileName');
      const descEl = document.getElementById('wizardProfileDesc');
      if (nameEl) this.wizardState.name = nameEl.value;
      if (descEl) this.wizardState.description = descEl.value;
    }
    this.wizardState.step--;
    this._renderWizardModal();
  },

  wizardNext() {
    const s = this.wizardState;

    // Validate current step
    if (s.step === 1) {
      if (!s.platform) return Toast.show('Please select a platform', 'warning');
      if (!s.profileType) return Toast.show('Please select a profile type', 'warning');
    }

    if (s.step === 2) {
      // Type-specific validation
      if (s.profileType === 'wifi' && !s.settings.ssid) return Toast.show('SSID is required', 'warning');
      if (s.profileType === 'vpn' && !s.settings.server) return Toast.show('Server address is required', 'warning');
      if (s.profileType === 'email' && !s.settings.hostName) return Toast.show('Email server is required', 'warning');
      if (s.profileType === 'custom') {
        const oma = s.settings.omaSettings || [];
        if (oma.some(e => !e.omaUri)) return Toast.show('All OMA-URI paths are required', 'warning');
      }
      if (s.profileType === 'kioskMode' && !s.settings.kioskAppId) return Toast.show('App ID is required for kiosk mode', 'warning');
      if (s.profileType === 'editionUpgrade' && !s.settings.productKey) return Toast.show('Product key is required', 'warning');
    }

    if (s.step === 3) {
      // Capture current input values
      const nameEl = document.getElementById('wizardProfileName');
      const descEl = document.getElementById('wizardProfileDesc');
      if (nameEl) s.name = nameEl.value;
      if (descEl) s.description = descEl.value;
      if (!s.name.trim()) return Toast.show('Profile name is required', 'warning');
    }

    s.step++;
    this._renderWizardModal();
  },

  wizardSet(key, value) {
    this.wizardState.settings[key] = value;
  },

  wizardToggle(key, checked) {
    // For device restrictions, the Graph property is "blocked" — invert the checkbox
    // But we store the raw checked state and build the payload in _buildPayload
    this.wizardState.settings[key] = checked;
  },

  _refreshWizardBody() {
    const body = document.getElementById('wizardBody');
    if (body) body.innerHTML = this._renderWizardStep();
  },

  /* ---------- Build Graph API payload ---------- */

  _buildPayload() {
    const s = this.wizardState;
    const base = {
      displayName: s.name.trim(),
      description: s.description.trim()
    };

    // Determine @odata.type based on platform + profile type
    const platformPrefix = {
      windows10: 'windows10',
      ios: 'ios',
      macOS: 'macOS',
      android: 'android'
    }[s.platform];

    if (s.profileType === 'deviceRestrictions') {
      const typeMap = {
        windows10: '#microsoft.graph.windows10GeneralConfiguration',
        ios: '#microsoft.graph.iosGeneralDeviceConfiguration',
        macOS: '#microsoft.graph.macOSGeneralDeviceConfiguration',
        android: '#microsoft.graph.androidGeneralDeviceConfiguration'
      };
      base['@odata.type'] = typeMap[s.platform] || typeMap.windows10;

      // Map toggles to Graph properties (checked = allowed, unchecked = blocked)
      base.cameraBlocked = s.settings.cameraBlocked === false;
      base.screenCaptureBlocked = s.settings.screenCaptureBlocked === false;
      base.bluetoothBlocked = s.settings.bluetoothBlocked === false;
      base.storageBlockRemovableStorage = s.settings.usbBlocked === false;
      base.appStoreBlocked = s.settings.appStoreBlocked === false;
      if (s.platform === 'ios' || s.platform === 'macOS') {
        base.iCloudBlockBackup = s.settings.iCloudBlockBackup === false;
      }
    }

    else if (s.profileType === 'wifi') {
      const typeMap = {
        windows10: '#microsoft.graph.windowsWifiConfiguration',
        ios: '#microsoft.graph.iosWiFiConfiguration',
        macOS: '#microsoft.graph.macOSWiFiConfiguration',
        android: '#microsoft.graph.androidWiFiConfiguration'
      };
      base['@odata.type'] = typeMap[s.platform] || typeMap.windows10;
      base.networkName = s.settings.ssid || '';
      base.ssid = s.settings.ssid || '';
      base.wifiSecurityType = s.settings.wifiSecurityType || 'open';
      base.preSharedKey = s.settings.preSharedKey || '';
      base.connectAutomatically = s.settings.connectAutomatically !== false;
      base.connectWhenNetworkNameIsHidden = !!s.settings.connectWhenNetworkNameIsHidden;
    }

    else if (s.profileType === 'vpn') {
      const typeMap = {
        windows10: '#microsoft.graph.windows10VpnConfiguration',
        ios: '#microsoft.graph.iosVpnConfiguration',
        macOS: '#microsoft.graph.macOSVpnConfiguration',
        android: '#microsoft.graph.androidVpnConfiguration'
      };
      base['@odata.type'] = typeMap[s.platform] || typeMap.windows10;
      base.connectionName = s.settings.connectionName || '';
      base.servers = [{ description: s.settings.connectionName || 'VPN Server', address: s.settings.server || '', isDefaultServer: true }];
      base.connectionType = s.settings.connectionType || 'ikEv2';
      base.authenticationMethod = s.settings.authenticationMethod || 'usernameAndPassword';
    }

    else if (s.profileType === 'email') {
      const typeMap = {
        windows10: '#microsoft.graph.windows10EasEmailProfileConfiguration',
        ios: '#microsoft.graph.iosEasEmailProfileConfiguration',
        macOS: '#microsoft.graph.macOSEasEmailProfileConfiguration',
        android: '#microsoft.graph.androidEasEmailProfileConfiguration'
      };
      base['@odata.type'] = typeMap[s.platform] || typeMap.windows10;
      base.hostName = s.settings.hostName || '';
      base.requireSsl = s.settings.requireSsl !== false;
      base.usernameSource = s.settings.usernameSource || 'userPrincipalName';
      base.emailAddressSource = 'userPrincipalName';
      if (s.settings.port) base.port = s.settings.port;
    }

    else if (s.profileType === 'custom') {
      base['@odata.type'] = '#microsoft.graph.windows10CustomConfiguration';
      base.omaSettings = (s.settings.omaSettings || []).map(e => {
        const omaTypeMap = {
          string: '#microsoft.graph.omaSettingStringXml',
          integer: '#microsoft.graph.omaSettingInteger',
          boolean: '#microsoft.graph.omaSettingBoolean',
          base64: '#microsoft.graph.omaSettingBase64',
          dateTime: '#microsoft.graph.omaSettingDateTime',
          floatingPoint: '#microsoft.graph.omaSettingFloatingPoint'
        };
        const entry = {
          '@odata.type': omaTypeMap[e.dataType] || omaTypeMap.string,
          displayName: e.displayName || 'Custom Setting',
          omaUri: e.omaUri,
        };
        // Set value with correct property based on type
        if (e.dataType === 'integer') entry.value = parseInt(e.value) || 0;
        else if (e.dataType === 'boolean') entry.value = e.value === 'true' || e.value === true;
        else if (e.dataType === 'floatingPoint') entry.value = parseFloat(e.value) || 0;
        else entry.value = e.value || '';
        return entry;
      });
    }

    else if (s.profileType === 'endpointProtection') {
      base['@odata.type'] = '#microsoft.graph.windows10EndpointProtectionConfiguration';
      base.firewallEnabled = s.settings.firewallEnabled !== false;
      base.defenderCloudBlockLevelType = s.settings.defenderCloudBlockLevel || 'notConfigured';
    }

    else if (s.profileType === 'windowsHello') {
      base['@odata.type'] = '#microsoft.graph.windowsIdentityProtectionConfiguration';
      base.useSecurityKeyForSignin = s.settings.securityKeyEnabled !== false;
      base.pinMinimumLength = s.settings.pinMinLength || 6;
      base.pinMaximumLength = s.settings.pinMaxLength || 127;
    }

    else if (s.profileType === 'kioskMode') {
      base['@odata.type'] = '#microsoft.graph.windows10GeneralConfiguration';
      base.kioskModeApp = s.settings.kioskAppId || '';
    }

    else if (s.profileType === 'editionUpgrade') {
      base['@odata.type'] = '#microsoft.graph.editionUpgradeConfiguration';
      base.targetEdition = s.settings.targetEdition || 'windows10Enterprise';
      base.licenseType = 'productKey';
      base.productKey = s.settings.productKey || '';
    }

    return base;
  },

  /* ---------- Create profile ---------- */

  async wizardCreate() {
    const btn = document.getElementById('wizardCreateBtn');
    if (btn) { btn.disabled = true; btn.textContent = 'Creating...'; }

    const tenantId = AppState.get('activeTenant');
    const payload = this._buildPayload();

    try {
      const result = await Graph.createConfigProfile(tenantId, payload);

      // Assign to groups if selected
      if (this.wizardState.assignGroups.length > 0 && result && result.id) {
        try {
          await Graph.assignPolicy(tenantId, result.id, 'configuration', this.wizardState.assignGroups);
        } catch (assignErr) {
          Toast.show('Profile created but assignment failed: ' + assignErr.message, 'warning');
        }
      }

      Toast.show('Configuration profile created successfully', 'success');
      document.getElementById('configWizardModal').remove();

      // Refresh data and re-render
      await Graph.loadConfigProfiles(tenantId);
      this.render();
    } catch (err) {
      Toast.show('Failed to create profile: ' + err.message, 'error');
      if (btn) { btn.disabled = false; btn.textContent = 'Create Profile'; }
    }
  },

  // Legacy alias
  showCreate() {
    this.openWizard();
  }
};
