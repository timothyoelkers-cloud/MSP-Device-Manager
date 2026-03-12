/* ============================================================
   Groups — Device group management
   ============================================================ */

const Groups = {
  render() {
    const main = document.getElementById('mainContent');
    const groups = AppState.getForContext('groups');
    const isAll = AppState.get('activeTenant') === 'all';

    const dynamicGroups = groups.filter(g => g.groupTypes?.includes('DynamicMembership'));
    const staticGroups = groups.filter(g => !g.groupTypes?.includes('DynamicMembership'));

    main.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h1 class="page-title">Device Groups</h1>
          <p class="page-subtitle">${groups.length} groups ${isAll ? 'across all tenants' : ''}</p>
        </div>
      </div>

      <!-- Tabs -->
      <div class="tabs">
        <div class="tab active" onclick="Groups.showTab(this, 'all')">All Groups (${groups.length})</div>
        <div class="tab" onclick="Groups.showTab(this, 'dynamic')">Dynamic (${dynamicGroups.length})</div>
        <div class="tab" onclick="Groups.showTab(this, 'static')">Assigned (${staticGroups.length})</div>
      </div>

      ${groups.length === 0 ? `
        <div class="card">
          <div class="empty-state">
            <div class="empty-state-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
            </div>
            <h3 class="empty-state-title">No Groups Found</h3>
            <p class="empty-state-text">Connect a tenant to view and manage device groups.</p>
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
                <input type="text" placeholder="Search groups..." oninput="Groups.filterTable(this.value)">
              </div>
            </div>
          </div>
          <table class="table" id="groupsTable">
            <thead>
              <tr>
                <th>Group Name</th>
                ${isAll ? '<th>Tenant</th>' : ''}
                <th>Type</th>
                <th>Membership Rule</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              ${groups.map(g => {
                const isDynamic = g.groupTypes?.includes('DynamicMembership');
                return `
                <tr data-type="${isDynamic ? 'dynamic' : 'static'}">
                  <td>
                    <div class="flex items-center gap-3">
                      <div class="table-device-icon" style="background: ${isDynamic ? 'var(--secondary-pale)' : 'var(--gray-100)'}; color: ${isDynamic ? 'var(--secondary)' : 'var(--ink-tertiary)'};">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                      </div>
                      <div>
                        <div class="fw-500">${g.displayName || 'Unnamed Group'}</div>
                        <div class="text-xs text-muted">${g.description || ''}</div>
                      </div>
                    </div>
                  </td>
                  ${isAll ? `<td><span class="chip">${AppState.getTenantName(g._tenantId)}</span></td>` : ''}
                  <td><span class="badge ${isDynamic ? 'badge-primary' : 'badge-default'}">${isDynamic ? 'Dynamic' : 'Assigned'}</span></td>
                  <td><span class="text-xs text-mono" style="max-width:250px;display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${g.membershipRule || '-'}</span></td>
                  <td class="text-sm">${Devices.formatDate(g.createdDateTime)}</td>
                </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      `}
    `;
  },

  showTab(el, type) {
    document.querySelectorAll('.tabs .tab').forEach(t => t.classList.remove('active'));
    el.classList.add('active');
    document.querySelectorAll('#groupsTable tbody tr').forEach(row => {
      row.style.display = (type === 'all' || row.dataset.type === type) ? '' : 'none';
    });
  },

  filterTable(term) {
    const rows = document.querySelectorAll('#groupsTable tbody tr');
    rows.forEach(row => {
      row.style.display = row.textContent.toLowerCase().includes(term.toLowerCase()) ? '' : 'none';
    });
  }
};
