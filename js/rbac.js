/* ============================================================
   RBAC — Role-Based Access Control views
   ============================================================ */

const RBAC = {
  _storageKey: 'msp_rbac_config',
  _currentRole: null,

  roles: {
    admin: {
      name: 'Administrator',
      description: 'Full access to all features and settings',
      permissions: ['*'],
      pages: ['*']
    },
    operator: {
      name: 'Operator',
      description: 'Can view and manage devices, run actions, but cannot change settings',
      permissions: ['view', 'sync', 'restart', 'lock'],
      pages: ['dashboard', 'tenants', 'devices', 'compliance', 'configurations', 'security', 'apps', 'autopilot', 'updates', 'groups', 'users', 'reports', 'alerts']
    },
    viewer: {
      name: 'Viewer',
      description: 'Read-only access to dashboards and reports',
      permissions: ['view'],
      pages: ['dashboard', 'tenants', 'devices', 'compliance', 'reports', 'comparison']
    },
    helpdesk: {
      name: 'Help Desk',
      description: 'Can view devices and perform basic actions (sync, restart)',
      permissions: ['view', 'sync', 'restart'],
      pages: ['dashboard', 'devices', 'users']
    }
  },

  init() {
    try {
      const saved = localStorage.getItem(this._storageKey);
      if (saved) {
        const config = JSON.parse(saved);
        this._currentRole = config.role || null;
      }
    } catch (e) {}

    // Check for Azure AD group claims
    const account = AppState.get('account');
    if (account?.idTokenClaims?.groups) {
      this._resolveRoleFromGroups(account.idTokenClaims.groups);
    }
  },

  getCurrentRole() {
    return this._currentRole || 'admin'; // Default to admin
  },

  getRoleConfig() {
    return this.roles[this.getCurrentRole()] || this.roles.admin;
  },

  hasPermission(permission) {
    const role = this.getRoleConfig();
    return role.permissions.includes('*') || role.permissions.includes(permission);
  },

  canAccessPage(page) {
    const role = this.getRoleConfig();
    return role.pages.includes('*') || role.pages.includes(page);
  },

  setRole(role) {
    this._currentRole = role;
    localStorage.setItem(this._storageKey, JSON.stringify({ role }));
    Toast.show(`Switched to ${this.roles[role]?.name || role} role`, 'success');
    Router.render(AppState.get('currentPage'));
  },

  _resolveRoleFromGroups(groups) {
    // Map Azure AD group IDs to roles
    const groupMap = this.getConfig().groupMappings || {};
    for (const [groupId, role] of Object.entries(groupMap)) {
      if (groups.includes(groupId)) {
        this._currentRole = role;
        return;
      }
    }
  },

  getConfig() {
    try {
      return JSON.parse(localStorage.getItem(this._storageKey) || '{}');
    } catch (e) { return {}; }
  },

  render() {
    const main = document.getElementById('mainContent');
    const currentRole = this.getCurrentRole();
    const config = this.getConfig();

    main.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h1 class="page-title">Access Control</h1>
          <p class="page-subtitle">Configure role-based access and permissions</p>
        </div>
      </div>

      <div class="grid grid-2 gap-6 mb-6">
        <!-- Current Role -->
        <div class="card">
          <div class="card-header">
            <div class="card-header-title">Current Role</div>
          </div>
          <div class="card-body">
            <div class="flex items-center gap-3 mb-4">
              <div class="stat-card-icon blue" style="width:48px;height:48px;">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              </div>
              <div>
                <div class="text-lg fw-600">${this.roles[currentRole]?.name || 'Unknown'}</div>
                <div class="text-sm text-muted">${this.roles[currentRole]?.description || ''}</div>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Switch Role (Preview)</label>
              <select class="form-select" onchange="RBAC.setRole(this.value)">
                ${Object.entries(this.roles).map(([key, role]) => `
                  <option value="${key}" ${key === currentRole ? 'selected' : ''}>${role.name}</option>
                `).join('')}
              </select>
              <span class="form-hint">In production, roles are assigned via Azure AD group membership.</span>
            </div>
          </div>
        </div>

        <!-- Azure AD Group Mappings -->
        <div class="card">
          <div class="card-header">
            <div class="card-header-title">Azure AD Group Mappings</div>
          </div>
          <div class="card-body">
            <p class="text-sm text-muted mb-4">Map Azure AD security groups to application roles.</p>
            ${Object.entries(this.roles).map(([key, role]) => `
              <div class="form-group mb-3">
                <label class="form-label">${role.name} Group ID</label>
                <input type="text" class="form-input" id="rbacGroup_${key}"
                  value="${(config.groupMappings || {})[key] || ''}"
                  placeholder="Azure AD Group Object ID">
              </div>
            `).join('')}
            <button class="btn btn-primary btn-sm" onclick="RBAC._saveGroupMappings()">Save Mappings</button>
          </div>
        </div>
      </div>

      <!-- Role Comparison -->
      <div class="card">
        <div class="card-header">
          <div class="card-header-title">Role Permissions Matrix</div>
        </div>
        <div class="table-wrapper">
          <table class="table">
            <thead>
              <tr>
                <th>Permission</th>
                ${Object.entries(this.roles).map(([_, r]) => `<th style="text-align:center;">${r.name}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${['view', 'sync', 'restart', 'lock', 'wipe', 'retire', 'delete', 'deploy', 'settings'].map(perm => `
                <tr>
                  <td class="fw-500">${perm.charAt(0).toUpperCase() + perm.slice(1)}</td>
                  ${Object.entries(this.roles).map(([_, r]) => `
                    <td style="text-align:center;">${r.permissions.includes('*') || r.permissions.includes(perm)
                      ? '<span style="color:var(--success);">&#10003;</span>'
                      : '<span style="color:var(--gray-300);">&#10007;</span>'
                    }</td>
                  `).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  _saveGroupMappings() {
    const config = this.getConfig();
    config.groupMappings = {};
    Object.keys(this.roles).forEach(key => {
      const val = document.getElementById(`rbacGroup_${key}`)?.value?.trim();
      if (val) config.groupMappings[key] = val;
    });
    localStorage.setItem(this._storageKey, JSON.stringify(config));
    Toast.show('Group mappings saved', 'success');
  },

  // Render a role-gated action button
  actionButton(html, permission) {
    if (this.hasPermission(permission)) return html;
    return `<span data-tooltip="Requires ${permission} permission" style="opacity:0.4;cursor:not-allowed;">${html}</span>`;
  }
};

RBAC.init();
