/* ============================================================
   Apps — Application management and deployment status
   ============================================================ */

const Apps = {
  render() {
    const main = document.getElementById('mainContent');
    const apps = AppState.getForContext('apps');
    const isAll = AppState.get('activeTenant') === 'all';

    // Group by type
    const typeMap = { win32: 0, msi: 0, webApp: 0, ios: 0, android: 0, office: 0, other: 0 };
    apps.forEach(a => {
      const t = (a['@odata.type'] || '').toLowerCase();
      if (t.includes('win32')) typeMap.win32++;
      else if (t.includes('msi')) typeMap.msi++;
      else if (t.includes('webapp')) typeMap.webApp++;
      else if (t.includes('ios')) typeMap.ios++;
      else if (t.includes('android')) typeMap.android++;
      else if (t.includes('officeSuite') || t.includes('office')) typeMap.office++;
      else typeMap.other++;
    });

    main.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h1 class="page-title">Applications</h1>
          <p class="page-subtitle">${apps.length} managed applications ${isAll ? 'across all tenants' : ''}</p>
        </div>
      </div>

      <!-- App type stats -->
      <div class="flex flex-wrap gap-3 mb-6">
        ${Object.entries(typeMap).filter(([,v]) => v > 0).map(([type, count]) => `
          <div class="chip">
            <strong>${count}</strong> ${type === 'win32' ? 'Win32' : type === 'msi' ? 'MSI' : type === 'webApp' ? 'Web' : type === 'ios' ? 'iOS' : type === 'android' ? 'Android' : type === 'office' ? 'Office' : 'Other'}
          </div>
        `).join('')}
      </div>

      <!-- Apps Table -->
      <div class="table-wrapper animate-fade">
        <div class="table-toolbar">
          <div class="table-toolbar-left">
            <div class="table-search">
              <span class="table-search-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              </span>
              <input type="text" placeholder="Search applications..." oninput="Apps.filterTable(this.value)">
            </div>
          </div>
        </div>
        <table class="table" id="appsTable">
          <thead>
            <tr>
              <th>Application</th>
              ${isAll ? '<th>Tenant</th>' : ''}
              <th>Type</th>
              <th>Publisher</th>
              <th>Created</th>
              <th>Published</th>
            </tr>
          </thead>
          <tbody>
            ${apps.length === 0 ? `
              <tr><td colspan="${isAll ? 6 : 5}" class="text-center text-muted" style="padding:3rem;">No applications found. Connect a tenant to view managed apps.</td></tr>
            ` : apps.map(a => `
              <tr>
                <td>
                  <div class="flex items-center gap-3">
                    <div class="table-device-icon" style="background:var(--primary-pale);">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/><path d="M3 9h6"/></svg>
                    </div>
                    <div>
                      <div class="fw-500">${a.displayName || 'Unnamed App'}</div>
                      <div class="text-xs text-muted truncate" style="max-width:200px;">${a.description || ''}</div>
                    </div>
                  </div>
                </td>
                ${isAll ? `<td><span class="chip">${AppState.getTenantName(a._tenantId)}</span></td>` : ''}
                <td><span class="badge badge-default">${this.getAppType(a)}</span></td>
                <td class="text-sm">${a.publisher || '-'}</td>
                <td class="text-sm">${Devices.formatDate(a.createdDateTime)}</td>
                <td>${a.publishingState === 'published' ? '<span class="badge badge-success">Published</span>' : '<span class="badge badge-warning">' + (a.publishingState || 'Draft') + '</span>'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  getAppType(app) {
    const t = (app['@odata.type'] || '').toLowerCase();
    if (t.includes('win32')) return 'Win32';
    if (t.includes('msi')) return 'MSI';
    if (t.includes('webapp')) return 'Web App';
    if (t.includes('ios')) return 'iOS';
    if (t.includes('android')) return 'Android';
    if (t.includes('officesuite') || t.includes('office')) return 'Office Suite';
    return 'App';
  },

  filterTable(term) {
    const rows = document.querySelectorAll('#appsTable tbody tr');
    rows.forEach(row => {
      row.style.display = row.textContent.toLowerCase().includes(term.toLowerCase()) ? '' : 'none';
    });
  }
};
