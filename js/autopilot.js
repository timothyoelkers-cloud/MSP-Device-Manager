/* ============================================================
   Autopilot — Windows Autopilot devices and profiles
   ============================================================ */

const Autopilot = {
  render() {
    const main = document.getElementById('mainContent');
    const devices = AppState.getForContext('autopilotDevices');
    const isAll = AppState.get('activeTenant') === 'all';

    main.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h1 class="page-title">Windows Autopilot</h1>
          <p class="page-subtitle">${devices.length} Autopilot devices ${isAll ? 'across all tenants' : ''}</p>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-secondary" onclick="Autopilot.exportHashes()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Export Hashes
          </button>
        </div>
      </div>

      <!-- Stats -->
      <div class="grid grid-3 gap-4 mb-6 stagger">
        <div class="stat-card animate-fade-up">
          <div class="stat-card-icon teal">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
          </div>
          <div class="stat-card-value">${devices.length}</div>
          <div class="stat-card-label">Total Autopilot Devices</div>
        </div>
        <div class="stat-card animate-fade-up">
          <div class="stat-card-icon green">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          </div>
          <div class="stat-card-value">${devices.filter(d => d.deploymentProfileAssignmentStatus === 'assigned').length}</div>
          <div class="stat-card-label">Profile Assigned</div>
        </div>
        <div class="stat-card animate-fade-up">
          <div class="stat-card-icon orange">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          </div>
          <div class="stat-card-value">${devices.filter(d => d.deploymentProfileAssignmentStatus !== 'assigned').length}</div>
          <div class="stat-card-label">Pending Assignment</div>
        </div>
      </div>

      <!-- Devices Table -->
      <div class="table-wrapper animate-fade">
        <div class="table-toolbar">
          <div class="table-toolbar-left">
            <div class="table-search">
              <span class="table-search-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              </span>
              <input type="text" placeholder="Search Autopilot devices..." oninput="Autopilot.filterTable(this.value)">
            </div>
          </div>
        </div>
        <table class="table" id="autopilotTable">
          <thead>
            <tr>
              <th>Serial Number</th>
              ${isAll ? '<th>Tenant</th>' : ''}
              <th>Model</th>
              <th>Manufacturer</th>
              <th>Group Tag</th>
              <th>Profile Status</th>
              <th>Enrollment State</th>
            </tr>
          </thead>
          <tbody>
            ${devices.length === 0 ? `
              <tr><td colspan="${isAll ? 7 : 6}" class="text-center text-muted" style="padding:3rem;">No Autopilot devices found.</td></tr>
            ` : devices.map(d => `
              <tr>
                <td class="text-mono fw-500">${d.serialNumber || '-'}</td>
                ${isAll ? `<td><span class="chip">${AppState.getTenantName(d._tenantId)}</span></td>` : ''}
                <td>${d.model || '-'}</td>
                <td>${d.manufacturer || '-'}</td>
                <td>${d.groupTag || '<span class="text-muted">-</span>'}</td>
                <td>${d.deploymentProfileAssignmentStatus === 'assigned' ?
                  '<span class="badge badge-success">Assigned</span>' :
                  '<span class="badge badge-warning">' + (d.deploymentProfileAssignmentStatus || 'Not Assigned') + '</span>'
                }</td>
                <td>${d.enrollmentState || '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  filterTable(term) {
    const rows = document.querySelectorAll('#autopilotTable tbody tr');
    rows.forEach(row => {
      row.style.display = row.textContent.toLowerCase().includes(term.toLowerCase()) ? '' : 'none';
    });
  },

  exportHashes() {
    const devices = AppState.getForContext('autopilotDevices');
    if (!devices.length) { Toast.show('No Autopilot devices to export', 'warning'); return; }

    const headers = ['Serial Number','Manufacturer','Model','Group Tag','Hardware Hash','Tenant'];
    const rows = devices.map(d => [
      d.serialNumber, d.manufacturer, d.model, d.groupTag,
      d.hardwareIdentifier || '', AppState.getTenantName(d._tenantId)
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${(c||'').toString().replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `autopilot-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click(); URL.revokeObjectURL(url);
    Toast.show('Autopilot data exported', 'success');
  }
};
