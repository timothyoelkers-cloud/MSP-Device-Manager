/* ============================================================
   Reports — Multi-tenant consolidated reporting & export
   ============================================================ */

const Reports = {
  selectedReport: 'compliance-summary',

  reportTypes: [
    { id: 'compliance-summary', name: 'Compliance Summary', icon: '🛡', desc: 'Compliance status across all tenants' },
    { id: 'device-inventory', name: 'Device Inventory', icon: '💻', desc: 'Full device inventory with hardware details' },
    { id: 'os-distribution', name: 'OS Distribution', icon: '📊', desc: 'Operating system breakdown by tenant' },
    { id: 'stale-devices', name: 'Stale Devices', icon: '⏰', desc: 'Devices not synced in 7+ days' },
    { id: 'encryption-status', name: 'Encryption Status', icon: '🔒', desc: 'BitLocker/FileVault encryption coverage' },
    { id: 'app-deployment', name: 'App Deployment', icon: '📦', desc: 'Application inventory across tenants' },
    { id: 'update-compliance', name: 'Update Compliance', icon: '🔄', desc: 'Windows update version analysis' },
    { id: 'user-license', name: 'User & License', icon: '👤', desc: 'User accounts and license assignments' },
  ],

  render() {
    const main = document.getElementById('mainContent');
    main.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h1 class="page-title">Reports</h1>
          <p class="page-subtitle">Generate consolidated reports across all connected tenants</p>
        </div>
      </div>

      <div style="display:grid; grid-template-columns: 280px 1fr; gap:var(--sp-5); min-height: 500px;">
        <!-- Report List -->
        <div class="card" style="overflow:hidden;">
          <div class="card-header"><div class="card-header-title">Report Type</div></div>
          <div style="padding:0;">
            ${this.reportTypes.map(r => `
              <div class="report-list-item ${this.selectedReport === r.id ? 'active' : ''}"
                   onclick="Reports.selectedReport='${r.id}'; Reports.render();"
                   style="padding:12px 16px; cursor:pointer; display:flex; gap:10px; align-items:center;
                          border-bottom:1px solid var(--border-light);
                          ${this.selectedReport === r.id ? 'background:var(--primary-pale); border-left:3px solid var(--primary);' : 'border-left:3px solid transparent;'}">
                <span style="font-size:18px;">${r.icon}</span>
                <div style="min-width:0;">
                  <div class="fw-500 text-sm">${r.name}</div>
                  <div class="text-xs text-muted">${r.desc}</div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Report Content -->
        <div class="card">
          <div class="card-header">
            <div class="card-header-title">${this.reportTypes.find(r => r.id === this.selectedReport)?.name || 'Report'}</div>
            <div class="flex gap-2">
              <button class="btn btn-ghost btn-sm" onclick="Reports.showScheduleModal()" data-tooltip="Schedule Report">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                Schedule
              </button>
              <button class="btn btn-secondary btn-sm" onclick="Reports.exportCSV()">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Export CSV
              </button>
              <button class="btn btn-secondary btn-sm" onclick="Reports.exportPDF()">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                Export PDF
              </button>
              <button class="btn btn-primary btn-sm" onclick="Reports.printReport()">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                Print
              </button>
            </div>
          </div>
          <div class="card-body" id="reportContent" style="overflow-y:auto; max-height:600px;">
            ${this._generateReport()}
          </div>
        </div>
      </div>
    `;
  },

  _generateReport() {
    const tenants = AppState.get('tenants');
    if (tenants.length === 0) return '<div class="empty-state"><p class="text-muted">Connect a tenant to generate reports.</p></div>';

    switch (this.selectedReport) {
      case 'compliance-summary': return this._complianceReport();
      case 'device-inventory': return this._deviceInventoryReport();
      case 'os-distribution': return this._osDistributionReport();
      case 'stale-devices': return this._staleDevicesReport();
      case 'encryption-status': return this._encryptionReport();
      case 'app-deployment': return this._appReport();
      case 'update-compliance': return this._updateReport();
      case 'user-license': return this._userLicenseReport();
      default: return '<div class="text-muted">Select a report type.</div>';
    }
  },

  _complianceReport() {
    const tenants = AppState.get('tenants');
    let rows = '';
    let totalDevices = 0, totalCompliant = 0, totalNonCompliant = 0;

    tenants.forEach(t => {
      const devices = AppState.get('devices')[t.id] || [];
      const compliant = devices.filter(d => d.complianceState === 'compliant').length;
      const nonCompliant = devices.filter(d => d.complianceState === 'noncompliant').length;
      const unknown = devices.length - compliant - nonCompliant;
      const pct = devices.length ? Math.round((compliant / devices.length) * 100) : 0;
      totalDevices += devices.length; totalCompliant += compliant; totalNonCompliant += nonCompliant;

      rows += `<tr>
        <td class="fw-500">${t.displayName}</td>
        <td>${devices.length}</td>
        <td class="text-success">${compliant}</td>
        <td class="text-danger">${nonCompliant}</td>
        <td>${unknown}</td>
        <td>
          <div class="flex items-center gap-2">
            <div style="flex:1;height:6px;background:var(--gray-100);border-radius:3px;overflow:hidden;">
              <div style="width:${pct}%;height:100%;background:${pct >= 80 ? 'var(--success)' : pct >= 50 ? 'var(--warning)' : 'var(--danger)'};border-radius:3px;"></div>
            </div>
            <span class="text-sm fw-500">${pct}%</span>
          </div>
        </td>
      </tr>`;
    });

    const totalPct = totalDevices ? Math.round((totalCompliant / totalDevices) * 100) : 0;
    return `
      <div class="grid grid-3 gap-4 mb-4">
        <div class="stat-card"><div class="stat-card-value">${totalDevices}</div><div class="stat-card-label">Total Devices</div></div>
        <div class="stat-card"><div class="stat-card-value text-success">${totalCompliant}</div><div class="stat-card-label">Compliant</div></div>
        <div class="stat-card"><div class="stat-card-value text-danger">${totalNonCompliant}</div><div class="stat-card-label">Non-Compliant</div></div>
      </div>
      <table class="table"><thead><tr><th>Tenant</th><th>Devices</th><th>Compliant</th><th>Non-Compliant</th><th>Unknown</th><th>Compliance %</th></tr></thead>
      <tbody>${rows}</tbody>
      <tfoot><tr style="font-weight:600;border-top:2px solid var(--border);"><td>Total</td><td>${totalDevices}</td><td>${totalCompliant}</td><td>${totalNonCompliant}</td><td>${totalDevices - totalCompliant - totalNonCompliant}</td><td>${totalPct}%</td></tr></tfoot></table>
      <p class="text-xs text-muted" style="margin-top:12px;">Report generated: ${new Date().toLocaleString()}</p>
    `;
  },

  _deviceInventoryReport() {
    const devices = AppState.getForContext('devices') || [];
    if (!devices.length) return '<div class="text-muted">No device data available.</div>';
    return `
      <p class="text-sm mb-3">${devices.length} devices total</p>
      <table class="table"><thead><tr><th>Device</th><th>OS</th><th>Version</th><th>Compliance</th><th>Encryption</th><th>Last Sync</th><th>Tenant</th></tr></thead>
      <tbody>${devices.slice(0, 200).map(d => `<tr>
        <td class="fw-500">${d.deviceName || '-'}</td>
        <td>${d.operatingSystem || '-'}</td>
        <td class="text-mono text-xs">${d.osVersion || '-'}</td>
        <td>${d.complianceState === 'compliant' ? '<span class="badge badge-success">Compliant</span>' : '<span class="badge badge-danger">Non-Compliant</span>'}</td>
        <td>${d.isEncrypted ? '<span class="badge badge-success">Yes</span>' : '<span class="badge badge-warning">No</span>'}</td>
        <td class="text-xs">${d.lastSyncDateTime ? new Date(d.lastSyncDateTime).toLocaleDateString() : '-'}</td>
        <td><span class="chip">${AppState.getTenantName(d._tenantId)}</span></td>
      </tr>`).join('')}</tbody></table>
      ${devices.length > 200 ? '<p class="text-xs text-muted mt-2">Showing first 200 devices. Export CSV for complete list.</p>' : ''}
    `;
  },

  _osDistributionReport() {
    const tenants = AppState.get('tenants');
    let html = '<div style="display:flex;flex-direction:column;gap:24px;">';
    tenants.forEach(t => {
      const devices = AppState.get('devices')[t.id] || [];
      const osCounts = {};
      devices.forEach(d => { const os = d.operatingSystem || 'Unknown'; osCounts[os] = (osCounts[os] || 0) + 1; });
      const colors = { Windows: '#0078d4', macOS: '#555', iOS: '#007aff', Android: '#3ddc84', Linux: '#f5a623', Unknown: '#999' };

      html += `<div>
        <div class="fw-500 mb-2">${t.displayName} <span class="text-muted">(${devices.length} devices)</span></div>
        <div style="display:flex;height:24px;border-radius:6px;overflow:hidden;background:var(--gray-100);">
          ${Object.entries(osCounts).map(([os, count]) => `
            <div style="width:${(count/devices.length)*100}%;background:${colors[os]||'#999'};min-width:2px;" data-tooltip="${os}: ${count}"></div>
          `).join('')}
        </div>
        <div class="flex gap-4 mt-1">${Object.entries(osCounts).map(([os, count]) => `
          <span class="text-xs"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${colors[os]||'#999'};margin-right:4px;"></span>${os}: ${count}</span>
        `).join('')}</div>
      </div>`;
    });
    html += '</div>';
    return html;
  },

  _staleDevicesReport() {
    const devices = AppState.getForContext('devices') || [];
    const stale = devices.filter(d => {
      if (!d.lastSyncDateTime) return true;
      return (Date.now() - new Date(d.lastSyncDateTime).getTime()) > 7 * 24 * 60 * 60 * 1000;
    }).sort((a, b) => new Date(a.lastSyncDateTime || 0) - new Date(b.lastSyncDateTime || 0));

    if (!stale.length) return '<div class="empty-state"><div class="text-success fw-500">All devices synced within the last 7 days!</div></div>';
    return `
      <p class="text-sm mb-3 text-danger fw-500">${stale.length} stale device(s) found</p>
      <table class="table"><thead><tr><th>Device</th><th>OS</th><th>Last Sync</th><th>Days Stale</th><th>Tenant</th></tr></thead>
      <tbody>${stale.map(d => {
        const days = d.lastSyncDateTime ? Math.floor((Date.now() - new Date(d.lastSyncDateTime).getTime()) / 86400000) : '∞';
        return `<tr>
          <td class="fw-500">${d.deviceName || '-'}</td>
          <td>${d.operatingSystem || '-'}</td>
          <td class="text-xs">${d.lastSyncDateTime ? new Date(d.lastSyncDateTime).toLocaleDateString() : 'Never'}</td>
          <td><span class="badge ${days > 30 ? 'badge-danger' : 'badge-warning'}">${days} days</span></td>
          <td><span class="chip">${AppState.getTenantName(d._tenantId)}</span></td>
        </tr>`;
      }).join('')}</tbody></table>
    `;
  },

  _encryptionReport() {
    const tenants = AppState.get('tenants');
    let rows = '';
    tenants.forEach(t => {
      const devices = AppState.get('devices')[t.id] || [];
      const encrypted = devices.filter(d => d.isEncrypted).length;
      const pct = devices.length ? Math.round((encrypted / devices.length) * 100) : 0;
      rows += `<tr>
        <td class="fw-500">${t.displayName}</td>
        <td>${devices.length}</td>
        <td class="text-success">${encrypted}</td>
        <td class="text-danger">${devices.length - encrypted}</td>
        <td>
          <div class="flex items-center gap-2">
            <div style="flex:1;height:6px;background:var(--gray-100);border-radius:3px;overflow:hidden;">
              <div style="width:${pct}%;height:100%;background:${pct >= 90 ? 'var(--success)' : pct >= 60 ? 'var(--warning)' : 'var(--danger)'};border-radius:3px;"></div>
            </div>
            <span class="text-sm fw-500">${pct}%</span>
          </div>
        </td>
      </tr>`;
    });
    return `<table class="table"><thead><tr><th>Tenant</th><th>Devices</th><th>Encrypted</th><th>Not Encrypted</th><th>Coverage</th></tr></thead><tbody>${rows}</tbody></table>`;
  },

  _appReport() {
    const apps = AppState.getForContext('apps') || [];
    if (!apps.length) return '<div class="text-muted">No app data available.</div>';
    const typeCounts = {};
    apps.forEach(a => { const t = Reports._appType(a); typeCounts[t] = (typeCounts[t] || 0) + 1; });
    return `
      <div class="flex gap-4 mb-4">${Object.entries(typeCounts).map(([t, c]) => `<div class="stat-card" style="flex:1;"><div class="stat-card-value">${c}</div><div class="stat-card-label">${t}</div></div>`).join('')}</div>
      <table class="table"><thead><tr><th>App Name</th><th>Type</th><th>Publisher</th><th>State</th><th>Tenant</th></tr></thead>
      <tbody>${apps.slice(0, 100).map(a => `<tr>
        <td class="fw-500">${a.displayName || '-'}</td>
        <td><span class="badge badge-default">${Reports._appType(a)}</span></td>
        <td class="text-sm">${a.publisher || '-'}</td>
        <td>${a.publishingState === 'published' ? '<span class="badge badge-success">Published</span>' : '<span class="badge badge-warning">' + (a.publishingState || 'Draft') + '</span>'}</td>
        <td><span class="chip">${AppState.getTenantName(a._tenantId)}</span></td>
      </tr>`).join('')}</tbody></table>
    `;
  },

  _updateReport() {
    const devices = AppState.getForContext('devices') || [];
    const winDevices = devices.filter(d => (d.operatingSystem || '').toLowerCase().includes('windows'));
    const versionMap = {};
    winDevices.forEach(d => { const v = d.osVersion || 'Unknown'; versionMap[v] = (versionMap[v] || 0) + 1; });
    const sorted = Object.entries(versionMap).sort((a, b) => b[1] - a[1]);
    return `
      <p class="text-sm mb-3">${winDevices.length} Windows devices</p>
      <table class="table"><thead><tr><th>OS Version</th><th>Devices</th><th>Distribution</th></tr></thead>
      <tbody>${sorted.map(([v, c]) => `<tr>
        <td class="text-mono">${v}</td><td>${c}</td>
        <td><div style="width:${(c/winDevices.length)*100}%;height:8px;background:var(--primary);border-radius:4px;min-width:4px;"></div></td>
      </tr>`).join('')}</tbody></table>
    `;
  },

  _userLicenseReport() {
    const users = AppState.getForContext('users') || [];
    if (!users.length) return '<div class="text-muted">No user data available. Load users first from the Users page.</div>';
    const enabled = users.filter(u => u.accountEnabled).length;
    const licensed = users.filter(u => u.assignedLicenses?.length > 0).length;
    return `
      <div class="grid grid-3 gap-4 mb-4">
        <div class="stat-card"><div class="stat-card-value">${users.length}</div><div class="stat-card-label">Total Users</div></div>
        <div class="stat-card"><div class="stat-card-value text-success">${enabled}</div><div class="stat-card-label">Enabled</div></div>
        <div class="stat-card"><div class="stat-card-value text-primary">${licensed}</div><div class="stat-card-label">Licensed</div></div>
      </div>
      <table class="table"><thead><tr><th>User</th><th>Status</th><th>Licenses</th><th>Tenant</th></tr></thead>
      <tbody>${users.slice(0, 100).map(u => `<tr>
        <td><div class="fw-500">${u.displayName || '-'}</div><div class="text-xs text-muted">${u.userPrincipalName || ''}</div></td>
        <td>${u.accountEnabled ? '<span class="badge badge-success">Enabled</span>' : '<span class="badge badge-default">Disabled</span>'}</td>
        <td>${u.assignedLicenses?.length || 0}</td>
        <td><span class="chip">${AppState.getTenantName(u._tenantId)}</span></td>
      </tr>`).join('')}</tbody></table>
    `;
  },

  _appType(a) {
    const t = (a['@odata.type'] || '').toLowerCase();
    if (t.includes('win32')) return 'Win32';
    if (t.includes('msi')) return 'MSI';
    if (t.includes('webapp')) return 'Web App';
    if (t.includes('ios')) return 'iOS';
    if (t.includes('android')) return 'Android';
    if (t.includes('office')) return 'Office';
    return 'Other';
  },

  exportCSV() {
    const content = document.getElementById('reportContent');
    if (!content) return;
    // Extract table data
    const table = content.querySelector('table');
    if (!table) { Toast.show('No table data to export', 'warning'); return; }
    let csv = '';
    table.querySelectorAll('tr').forEach(row => {
      const cells = [];
      row.querySelectorAll('th, td').forEach(cell => cells.push(`"${cell.textContent.trim().replace(/"/g, '""')}"`));
      csv += cells.join(',') + '\n';
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `report_${this.selectedReport}_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    Toast.show('Report exported', 'success');
  },

  _getReportHTML(forPDF) {
    const content = document.getElementById('reportContent');
    if (!content) return null;
    const reportName = this.reportTypes.find(r => r.id === this.selectedReport)?.name || this.selectedReport;
    const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const tenant = AppState.get('activeTenant') === 'all' ? 'All Tenants' : AppState.getTenantName(AppState.get('activeTenant'));

    return `<html><head><title>MSP Report — ${reportName}</title>
      <style>
        body { font-family: Inter, -apple-system, sans-serif; padding: 40px; color: #1a1a2e; max-width: 1100px; margin: 0 auto; }
        .report-header { border-bottom: 3px solid #2563eb; padding-bottom: 16px; margin-bottom: 24px; }
        .report-header h1 { margin: 0 0 4px; font-size: 22px; color: #2563eb; }
        .report-meta { color: #666; font-size: 12px; display: flex; gap: 20px; }
        table { width: 100%; border-collapse: collapse; margin: 16px 0; }
        th, td { padding: 8px 12px; border: 1px solid #e2e8f0; text-align: left; font-size: 12px; }
        th { background: #f8fafc; font-weight: 600; color: #475569; }
        tr:nth-child(even) { background: #fafbfc; }
        .badge { padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 600; }
        .stat-card { display: inline-block; padding: 12px 20px; margin: 4px; border: 1px solid #e2e8f0; border-radius: 8px; }
        .stat-card-value { font-size: 24px; font-weight: 700; color: #2563eb; }
        .stat-card-label { font-size: 11px; color: #64748b; }
        ${forPDF ? '@media print { body { padding: 20px; } }' : ''}
        @page { margin: 1cm; size: A4 landscape; }
      </style>
    </head><body>
      <div class="report-header">
        <h1>MSP Device Manager</h1>
        <div style="font-size:16px;font-weight:600;margin:4px 0;">${reportName}</div>
        <div class="report-meta">
          <span>Generated: ${date}</span>
          <span>Tenant: ${tenant}</span>
        </div>
      </div>
      ${content.innerHTML}
    </body></html>`;
  },

  printReport() {
    const html = this._getReportHTML(false);
    if (!html) return;
    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
    win.print();
  },

  exportPDF() {
    const html = this._getReportHTML(true);
    if (!html) return;
    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
    // Auto-trigger print dialog for Save as PDF
    win.onload = () => win.print();
    Toast.show('Use "Save as PDF" in the print dialog to export', 'info');
    AuditLog.log('Export PDF', `Exported "${this.selectedReport}" report as PDF`);
  },

  /* ---- Scheduled Reports ---- */
  _scheduleStorageKey: 'msp_scheduled_reports',

  getSchedules() {
    try { return JSON.parse(localStorage.getItem(this._scheduleStorageKey) || '[]'); } catch (e) { return []; }
  },

  saveSchedules(schedules) {
    localStorage.setItem(this._scheduleStorageKey, JSON.stringify(schedules));
  },

  showScheduleModal() {
    const existing = document.getElementById('scheduleReportModal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'scheduleReportModal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h3 class="modal-title">Schedule Report</h3>
          <button class="modal-close" onclick="document.getElementById('scheduleReportModal').remove()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="modal-body">
          <div class="form-group mb-4">
            <label class="form-label">Report Type</label>
            <select class="form-select" id="schedReportType">
              ${this.reportTypes.map(r => `<option value="${r.id}" ${r.id === this.selectedReport ? 'selected' : ''}>${r.name}</option>`).join('')}
            </select>
          </div>
          <div class="form-group mb-4">
            <label class="form-label">Frequency</label>
            <select class="form-select" id="schedFrequency">
              <option value="daily">Daily</option>
              <option value="weekly" selected>Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          <div class="form-group mb-4">
            <label class="form-label">Day / Time</label>
            <div style="display:flex;gap:8px;">
              <select class="form-select" id="schedDay" style="flex:1;">
                <option value="monday">Monday</option>
                <option value="tuesday">Tuesday</option>
                <option value="wednesday">Wednesday</option>
                <option value="thursday">Thursday</option>
                <option value="friday" selected>Friday</option>
              </select>
              <input type="time" class="form-input" id="schedTime" value="09:00" style="flex:1;">
            </div>
            <span class="form-hint">Reports auto-export CSV at the scheduled time (when the app is open).</span>
          </div>
          <div class="form-group mb-4">
            <label class="form-label">Label (optional)</label>
            <input type="text" class="form-input" id="schedLabel" placeholder="e.g., Weekly Compliance Check">
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="document.getElementById('scheduleReportModal').remove()">Cancel</button>
          <button class="btn btn-primary" onclick="Reports._addSchedule()">Create Schedule</button>
        </div>
      </div>
    `;
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
    document.body.appendChild(modal);
  },

  _addSchedule() {
    const schedules = this.getSchedules();
    schedules.push({
      id: Date.now().toString(36),
      reportType: document.getElementById('schedReportType')?.value,
      frequency: document.getElementById('schedFrequency')?.value,
      day: document.getElementById('schedDay')?.value,
      time: document.getElementById('schedTime')?.value || '09:00',
      label: document.getElementById('schedLabel')?.value || '',
      enabled: true,
      created: new Date().toISOString(),
      lastRun: null
    });
    this.saveSchedules(schedules);
    document.getElementById('scheduleReportModal')?.remove();
    Toast.show('Report schedule created', 'success');
    this.render();
  },

  deleteSchedule(id) {
    this.saveSchedules(this.getSchedules().filter(s => s.id !== id));
    this.render();
  },

  toggleSchedule(id) {
    const schedules = this.getSchedules();
    const s = schedules.find(x => x.id === id);
    if (s) s.enabled = !s.enabled;
    this.saveSchedules(schedules);
    this.render();
  }
};
