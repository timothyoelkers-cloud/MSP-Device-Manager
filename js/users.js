/* ============================================================
   Users — User inventory, device mapping, license & risk view
   ============================================================ */

const Users = {
  searchTerm: '',
  filter: 'all', // all, enabled, disabled, risky
  page: 1,
  perPage: 25,

  render() {
    const main = document.getElementById('mainContent');
    const users = AppState.getForContext('users');
    const isAll = AppState.get('activeTenant') === 'all';
    const filtered = this._filter(users);
    const totalPages = Math.ceil(filtered.length / this.perPage);
    const paged = filtered.slice((this.page - 1) * this.perPage, this.page * this.perPage);

    // Stats
    const enabled = users.filter(u => u.accountEnabled).length;
    const disabled = users.filter(u => !u.accountEnabled).length;
    const licensed = users.filter(u => u.assignedLicenses?.length > 0).length;
    if (AppState.isLoading('users') && users.length === 0) {
      main.innerHTML = `
        <div class="page-header"><div class="page-header-left">
          <h1 class="page-title">Users</h1><p class="page-subtitle">Loading users...</p>
        </div></div>${Skeleton.table(10, 6)}`;
      return;
    }

    main.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h1 class="page-title">Users</h1>
          <p class="page-subtitle">${users.length} user${users.length !== 1 ? 's' : ''} ${isAll ? 'across all tenants' : ''}</p>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-ghost btn-sm" onclick="Users.reload()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>
            Reload
          </button>
          <button class="btn btn-secondary btn-sm" onclick="Users.exportCSV()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Export CSV
          </button>
          <button class="btn btn-primary btn-sm" onclick="UserCreation.showWizard()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
            Create User
          </button>
          <button class="btn btn-secondary btn-sm" onclick="UserCreation.showTemplates()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
            Templates
          </button>
          <button class="btn btn-secondary btn-sm" onclick="Router.navigate('offboarding')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="18" y1="11" x2="23" y2="11"/></svg>
            Offboarding
          </button>
        </div>
      </div>

      <!-- Stats -->
      <div class="grid grid-4 gap-4 mb-4">
        <div class="stat-card"><div class="stat-card-value">${users.length}</div><div class="stat-card-label">Total Users</div></div>
        <div class="stat-card"><div class="stat-card-value text-success">${enabled}</div><div class="stat-card-label">Enabled</div></div>
        <div class="stat-card"><div class="stat-card-value text-muted">${disabled}</div><div class="stat-card-label">Disabled</div></div>
        <div class="stat-card"><div class="stat-card-value text-primary">${licensed}</div><div class="stat-card-label">Licensed</div></div>
      </div>

      <!-- Toolbar -->
      <div class="table-toolbar">
        <div class="table-toolbar-left">
          <div class="table-search">
            <svg class="table-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" placeholder="Search users..." value="${this.searchTerm}" oninput="Users.searchTerm=this.value; Users.page=1; Users.render();">
          </div>
        </div>
        <div class="table-toolbar-right">
          <div class="flex gap-2">
            ${['all','enabled','disabled'].map(f => `
              <button class="chip ${this.filter === f ? 'chip-active' : ''}" onclick="Users.filter='${f}'; Users.page=1; Users.render();">${f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}</button>
            `).join('')}
          </div>
        </div>
      </div>

      <!-- Table -->
      <div class="table-wrapper">
        <table class="table">
          <thead><tr>
            <th>User</th>
            ${isAll ? '<th>Tenant</th>' : ''}
            <th>Status</th>
            <th>Licenses</th>
            <th>Devices</th>
            <th>Last Sign-In</th>
            <th></th>
          </tr></thead>
          <tbody>
            ${paged.length === 0 ? `
              <tr><td colspan="${isAll ? 7 : 6}" class="text-center text-muted" style="padding:3rem;">
                ${users.length === 0 ? '<div class="retry-state"><p>No user data loaded.</p><button class="btn btn-primary btn-sm" onclick="Users.reload()">Reload Users</button></div>' : 'No users match your search.'}
              </td></tr>
            ` : paged.map(u => `
              <tr style="cursor:pointer;" onclick="Users.showDetail('${u._tenantId}','${u.id}')">
                <td>
                  <div class="flex items-center gap-3">
                    <div class="topbar-avatar" style="width:32px;height:32px;font-size:12px;flex-shrink:0;">${(u.displayName || 'U').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}</div>
                    <div style="min-width:0;">
                      <div class="fw-500 truncate">${u.displayName || 'Unknown'}</div>
                      <div class="text-xs text-muted truncate">${u.userPrincipalName || u.mail || ''}</div>
                    </div>
                  </div>
                </td>
                ${isAll ? `<td><span class="chip">${AppState.getTenantName(u._tenantId)}</span></td>` : ''}
                <td>${u.accountEnabled ? '<span class="badge badge-success">Enabled</span>' : '<span class="badge badge-default">Disabled</span>'}</td>
                <td><span class="text-sm">${u.assignedLicenses?.length || 0} license(s)</span></td>
                <td><span class="text-sm">${u._deviceCount || 0} device(s)</span></td>
                <td class="text-sm text-muted">${u.signInActivity?.lastSignInDateTime ? Users._relTime(u.signInActivity.lastSignInDateTime) : 'Never'}</td>
                <td>
                  <button class="btn btn-sm btn-secondary" onclick="event.stopPropagation(); Users.showDetail('${u._tenantId}','${u.id}')">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      ${totalPages > 1 ? `
        <div class="table-pagination">
          <span class="text-sm text-muted">Showing ${(this.page-1)*this.perPage+1}–${Math.min(this.page*this.perPage, filtered.length)} of ${filtered.length}</span>
          <div class="table-pagination-pages">
            <button class="table-pagination-btn" ${this.page <= 1 ? 'disabled' : ''} onclick="Users.page--; Users.render();">‹</button>
            ${Array.from({length: Math.min(totalPages, 7)}, (_, i) => {
              const p = totalPages <= 7 ? i + 1 : (this.page <= 4 ? i + 1 : this.page + i - 3);
              return p > 0 && p <= totalPages ? `<button class="table-pagination-btn ${this.page === p ? 'active' : ''}" onclick="Users.page=${p}; Users.render();">${p}</button>` : '';
            }).join('')}
            <button class="table-pagination-btn" ${this.page >= totalPages ? 'disabled' : ''} onclick="Users.page++; Users.render();">›</button>
          </div>
        </div>
      ` : ''}

      <!-- Detail Panel -->
      <div class="detail-panel" id="userDetailPanel">
        <div class="detail-panel-header">
          <h3 class="detail-panel-title" id="userDetailTitle">User Details</h3>
          <button class="detail-panel-close" onclick="Users.closeDetail()">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="detail-panel-body" id="userDetailBody"></div>
      </div>
    `;
  },

  _filter(users) {
    let result = users;
    if (this.filter === 'enabled') result = result.filter(u => u.accountEnabled);
    if (this.filter === 'disabled') result = result.filter(u => !u.accountEnabled);
    if (this.searchTerm) {
      const s = this.searchTerm.toLowerCase();
      result = result.filter(u =>
        (u.displayName || '').toLowerCase().includes(s) ||
        (u.userPrincipalName || '').toLowerCase().includes(s) ||
        (u.mail || '').toLowerCase().includes(s)
      );
    }
    return result;
  },

  async showDetail(tenantId, userId) {
    const panel = document.getElementById('userDetailPanel');
    const body = document.getElementById('userDetailBody');
    const users = AppState.getForContext('users');
    const user = users.find(u => u.id === userId && u._tenantId === tenantId);
    if (!user) return;

    document.getElementById('userDetailTitle').textContent = user.displayName || 'User Details';
    body.innerHTML = `
      <div class="detail-section">
        <div class="detail-section-title">Identity</div>
        <div class="detail-row"><span class="detail-label">Display Name</span><span class="detail-value">${user.displayName || '-'}</span></div>
        <div class="detail-row"><span class="detail-label">UPN</span><span class="detail-value">${user.userPrincipalName || '-'}</span></div>
        <div class="detail-row"><span class="detail-label">Email</span><span class="detail-value">${user.mail || '-'}</span></div>
        <div class="detail-row"><span class="detail-label">Job Title</span><span class="detail-value">${user.jobTitle || '-'}</span></div>
        <div class="detail-row"><span class="detail-label">Department</span><span class="detail-value">${user.department || '-'}</span></div>
        <div class="detail-row"><span class="detail-label">Status</span><span class="detail-value">${user.accountEnabled ? '<span class="badge badge-success">Enabled</span>' : '<span class="badge badge-default">Disabled</span>'}</span></div>
        <div class="detail-row"><span class="detail-label">Created</span><span class="detail-value">${user.createdDateTime ? new Date(user.createdDateTime).toLocaleDateString() : '-'}</span></div>
        <div class="detail-row"><span class="detail-label">Last Sign-In</span><span class="detail-value">${user.signInActivity?.lastSignInDateTime ? new Date(user.signInActivity.lastSignInDateTime).toLocaleString() : 'Never'}</span></div>
      </div>

      <div class="detail-section">
        <div class="detail-section-title">Licenses (${user.assignedLicenses?.length || 0})</div>
        ${(user.assignedLicenses || []).length === 0 ? '<div class="text-muted text-sm" style="padding:4px 0;">No licenses assigned</div>' :
          (user.assignedLicenses || []).map(l => `<div class="detail-row"><span class="detail-label">SKU</span><span class="detail-value text-mono text-xs">${l.skuId}</span></div>`).join('')}
      </div>

      <div class="detail-section">
        <div class="detail-section-title">Group Membership</div>
        <div id="userGroupsContent"><div class="text-muted text-sm">Loading groups...</div></div>
      </div>

      <div class="detail-section">
        <div class="detail-section-title">Managed Devices</div>
        <div id="userDevicesContent"><div class="text-muted text-sm">Loading devices...</div></div>
      </div>

      <div class="detail-section" style="padding-top:12px;border-top:1px solid var(--border);">
        <button class="btn btn-danger btn-sm w-full" onclick="Offboarding.show('${tenantId}','${userId}')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="18" y1="11" x2="23" y2="11"/></svg>
          Offboard User
        </button>
      </div>
    `;
    panel.classList.add('open');

    // Load user's groups and devices in parallel
    const [groupsResult, devicesResult] = await Promise.allSettled([
      Graph.getUserGroups(tenantId, userId),
      Graph.getUserDevices(tenantId, userId)
    ]);

    // Render groups
    const groupsContainer = document.getElementById('userGroupsContent');
    if (groupsContainer) {
      if (groupsResult.status === 'fulfilled') {
        const groups = (groupsResult.value || []).filter(g => g['@odata.type'] === '#microsoft.graph.group');
        groupsContainer.innerHTML = groups.length === 0
          ? '<div class="text-muted text-sm">No group memberships</div>'
          : groups.map(g => `
            <div class="detail-row">
              <span class="detail-label" style="flex:1;">${g.displayName || 'Unknown'}</span>
              <span class="detail-value"><span class="badge ${g.securityEnabled ? 'badge-primary' : 'badge-default'}">${g.securityEnabled ? 'Security' : 'M365'}</span></span>
            </div>
          `).join('');
      } else {
        groupsContainer.innerHTML = '<div class="text-muted text-sm" style="color:var(--danger);">Failed to load groups</div>';
      }
    }

    // Render devices
    const devicesContainer = document.getElementById('userDevicesContent');
    if (devicesContainer) {
      if (devicesResult.status === 'fulfilled') {
        const devices = devicesResult.value || [];
        devicesContainer.innerHTML = devices.length === 0
          ? '<div class="text-muted text-sm">No managed devices</div>'
          : devices.map(d => `
            <div class="detail-row" style="cursor:pointer;" onclick="Devices.showDeviceDetail('${tenantId}','${d.id}')">
              <span class="detail-label" style="flex:1;">${d.deviceName || 'Unknown'}</span>
              <span class="detail-value"><span class="badge ${d.complianceState === 'compliant' ? 'badge-success' : 'badge-warning'}">${d.operatingSystem || ''}</span></span>
            </div>
          `).join('');
      } else {
        devicesContainer.innerHTML = '<div class="text-muted text-sm" style="color:var(--danger);">Failed to load devices</div>';
      }
    }
  },

  closeDetail() {
    document.getElementById('userDetailPanel')?.classList.remove('open');
  },

  async reload() {
    const tenants = AppState.get('tenants');
    Auth._isUserInitiated = true;
    for (const t of tenants) {
      await Graph.loadUsers(t.id).catch(() => {});
    }
    Auth._isUserInitiated = false;
    this.render();
  },

  exportCSV() {
    const users = AppState.getForContext('users');
    const isAll = AppState.get('activeTenant') === 'all';
    let csv = isAll
      ? 'Tenant,Display Name,UPN,Email,Status,Licenses,Last Sign-In\n'
      : 'Display Name,UPN,Email,Status,Licenses,Last Sign-In\n';
    users.forEach(u => {
      const row = [
        ...(isAll ? [AppState.getTenantName(u._tenantId)] : []),
        u.displayName || '',
        u.userPrincipalName || '',
        u.mail || '',
        u.accountEnabled ? 'Enabled' : 'Disabled',
        u.assignedLicenses?.length || 0,
        u.signInActivity?.lastSignInDateTime || 'Never'
      ];
      csv += row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',') + '\n';
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `users_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
  },

  _relTime(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  }
};
