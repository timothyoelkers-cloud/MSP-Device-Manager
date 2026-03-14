/* ============================================================
   ClientReports — Branded client-facing report generator
   ============================================================ */

const ClientReports = {
  _storageKey: 'msp_client_reports',

  render() {
    const main = document.getElementById('mainContent');
    const tenants = AppState.get('tenants');
    const savedReports = this._getSaved();

    main.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h1 class="page-title">Client Reports</h1>
          <p class="page-subtitle">Generate branded reports for client reviews</p>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-primary btn-sm" onclick="ClientReports._showGenerator()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Generate Report
          </button>
        </div>
      </div>

      <!-- Report Templates -->
      <div class="grid grid-3 gap-4 mb-6">
        ${this._templates.map(t => `
          <div class="card card-interactive" onclick="ClientReports._generate('${t.id}')" style="cursor:pointer;">
            <div class="card-body-compact" style="text-align:center;padding:20px;">
              <div style="font-size:32px;margin-bottom:8px;">${t.icon}</div>
              <div class="fw-500 text-sm">${t.name}</div>
              <div class="text-xs text-muted mt-1">${t.desc}</div>
            </div>
          </div>
        `).join('')}
      </div>

      <!-- Saved Reports -->
      <div class="card">
        <div class="card-header">
          <div class="card-header-title">Generated Reports</div>
        </div>
        <div class="card-body">
          ${savedReports.length === 0 ? '<div class="text-sm text-muted" style="padding:16px 0;">No reports generated yet.</div>' : `
            <div class="table-wrapper">
              <table class="table">
                <thead><tr><th>Report</th><th>Tenant</th><th>Generated</th><th></th></tr></thead>
                <tbody>
                  ${savedReports.slice().reverse().map(r => `
                    <tr>
                      <td class="fw-500">${r.title}</td>
                      <td><span class="chip">${r.tenantName}</span></td>
                      <td class="text-sm text-muted">${new Date(r.generatedAt).toLocaleString()}</td>
                      <td>
                        <div style="display:flex;gap:4px;">
                          <button class="btn btn-primary btn-sm" onclick="ClientReports._view('${r.id}')">View</button>
                          <button class="btn btn-ghost btn-sm" onclick="ClientReports._delete('${r.id}')">Delete</button>
                        </div>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          `}
        </div>
      </div>
    `;
  },

  _templates: [
    { id: 'executive',  name: 'Executive Summary',    desc: 'High-level compliance, device health, and security overview', icon: '&#128202;' },
    { id: 'compliance', name: 'Compliance Report',    desc: 'Detailed compliance policy status and device breakdown', icon: '&#128737;' },
    { id: 'device',     name: 'Device Inventory',     desc: 'Full device inventory with OS, compliance, and sync status', icon: '&#128187;' },
    { id: 'license',    name: 'License Utilization',  desc: 'License allocation, utilization, and optimization', icon: '&#128196;' },
    { id: 'security',   name: 'Security Posture',     desc: 'Security scorecard, CA policies, encryption status', icon: '&#128274;' },
    { id: 'user',       name: 'User Summary',         desc: 'User accounts, license assignments, and activity', icon: '&#128100;' },
  ],

  _showGenerator() {
    const tenants = AppState.get('tenants');
    const isAll = AppState.get('activeTenant') === 'all';
    if (tenants.length === 0) { Toast.show('Connect a tenant first', 'warning'); return; }

    // If a specific tenant is selected, generate for that tenant
    if (!isAll) {
      this._generateModal(AppState.get('activeTenant'));
    } else {
      // Show tenant picker
      const html = tenants.map(t => `
        <button class="btn btn-secondary w-full mb-2" onclick="ClientReports._generateModal('${t.id}'); document.getElementById('crTenantPicker')?.remove();">
          ${t.displayName}
        </button>
      `).join('');

      const modal = document.createElement('div');
      modal.id = 'crTenantPicker';
      modal.className = 'modal-overlay';
      modal.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.4);';
      modal.innerHTML = `
        <div class="modal" style="max-width:400px;">
          <div class="modal-header">
            <h3 class="modal-title">Select Tenant</h3>
            <button class="modal-close" onclick="document.getElementById('crTenantPicker').remove()">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div class="modal-body">${html}</div>
        </div>
      `;
      modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
      document.body.appendChild(modal);
    }
  },

  _generateModal(tenantId) {
    const tenantName = AppState.getTenantName(tenantId);
    const modal = document.createElement('div');
    modal.id = 'crGenModal';
    modal.className = 'modal-overlay';
    modal.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.4);';
    modal.innerHTML = `
      <div class="modal" style="max-width:500px;">
        <div class="modal-header">
          <h3 class="modal-title">Generate Report for ${tenantName}</h3>
          <button class="modal-close" onclick="document.getElementById('crGenModal').remove()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="modal-body">
          <p class="text-sm text-muted mb-4">Select a report type to generate:</p>
          ${this._templates.map(t => `
            <button class="btn btn-secondary w-full mb-2" style="text-align:left;padding:12px 16px;" onclick="ClientReports._generate('${t.id}', '${tenantId}'); document.getElementById('crGenModal').remove();">
              <span style="font-size:18px;margin-right:8px;">${t.icon}</span> ${t.name}
              <div class="text-xs text-muted" style="margin-left:26px;">${t.desc}</div>
            </button>
          `).join('')}
        </div>
      </div>
    `;
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
    document.body.appendChild(modal);
  },

  _generate(templateId, tenantId) {
    if (!tenantId) {
      tenantId = AppState.get('activeTenant');
      if (tenantId === 'all') {
        const tenants = AppState.get('tenants');
        if (tenants.length > 0) tenantId = tenants[0].id;
        else { Toast.show('No tenant available', 'warning'); return; }
      }
    }

    const tenantName = AppState.getTenantName(tenantId);
    const template = this._templates.find(t => t.id === templateId);
    const branding = typeof Branding !== 'undefined' ? Branding.getConfig() : {};
    const companyName = branding.companyName || 'MSP Device Manager';
    const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    const content = this._buildReport(templateId, tenantId, tenantName);

    const report = {
      id: 'rpt_' + Date.now(),
      templateId,
      title: `${template.name} — ${tenantName}`,
      tenantId,
      tenantName,
      generatedAt: new Date().toISOString(),
      html: `
        <div style="font-family:Inter,system-ui,sans-serif;max-width:800px;margin:0 auto;padding:40px;">
          <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #2563eb;padding-bottom:16px;margin-bottom:32px;">
            <div>
              <h1 style="margin:0;font-size:24px;color:#1e293b;">${template.name}</h1>
              <p style="margin:4px 0 0;color:#64748b;font-size:14px;">${tenantName} &mdash; ${date}</p>
            </div>
            <div style="text-align:right;">
              <div style="font-weight:600;color:#1e293b;">${companyName}</div>
              <div style="font-size:12px;color:#64748b;">Generated Report</div>
            </div>
          </div>
          ${content}
          <div style="margin-top:40px;padding-top:16px;border-top:1px solid #e2e8f0;text-align:center;">
            <p style="font-size:11px;color:#94a3b8;">Generated by ${companyName} on ${date}</p>
          </div>
        </div>
      `
    };

    const saved = this._getSaved();
    saved.push(report);
    if (saved.length > 50) saved.shift();
    localStorage.setItem(this._storageKey, JSON.stringify(saved));

    Toast.show(`${template.name} generated`, 'success');
    this._view(report.id);
  },

  _buildReport(templateId, tenantId, tenantName) {
    const devices = AppState.get('devices')[tenantId] || [];
    const users = AppState.get('users')[tenantId] || [];
    const licenseData = (AppState.get('subscribedSkus') || {})[tenantId] || [];
    const caPolicies = AppState.get('caPolicies')[tenantId] || [];

    const compliant = devices.filter(d => d.complianceState === 'compliant').length;
    const encrypted = devices.filter(d => d.isEncrypted).length;
    const stale = devices.filter(d => d.lastSyncDateTime && (Date.now() - new Date(d.lastSyncDateTime).getTime()) > 7 * 86400000).length;

    const section = (title, content) => `<div style="margin-bottom:24px;"><h2 style="font-size:16px;color:#1e293b;border-bottom:1px solid #e2e8f0;padding-bottom:8px;margin-bottom:12px;">${title}</h2>${content}</div>`;
    const stat = (label, value, color) => `<div style="text-align:center;padding:16px;background:#f8fafc;border-radius:8px;"><div style="font-size:24px;font-weight:700;color:${color || '#1e293b'};">${value}</div><div style="font-size:12px;color:#64748b;margin-top:4px;">${label}</div></div>`;
    const row = (label, value) => `<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f1f5f9;"><span style="color:#64748b;font-size:13px;">${label}</span><span style="font-weight:500;font-size:13px;">${value}</span></div>`;

    switch (templateId) {
      case 'executive':
        const score = typeof Scorecard !== 'undefined' ? Scorecard._computeScore(tenantId) : { total: 0 };
        return `
          ${section('Overview', `<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;">${stat('Total Devices', devices.length)}${stat('Compliant', devices.length > 0 ? Math.round(compliant/devices.length*100)+'%' : 'N/A', '#16a34a')}${stat('Users', users.length)}${stat('Security Score', score.total + '/100', score.total >= 80 ? '#16a34a' : '#f59e0b')}</div>`)}
          ${section('Key Metrics', `${row('Compliance Rate', devices.length > 0 ? Math.round(compliant/devices.length*100)+'%' : 'N/A')}${row('Encryption Rate', devices.length > 0 ? Math.round(encrypted/devices.length*100)+'%' : 'N/A')}${row('Stale Devices (7+ days)', stale)}${row('Active CA Policies', caPolicies.filter(p => p.state === 'enabled').length)}${row('Total Licenses', licenseData.reduce((s,l) => s + (l.prepaidUnits?.enabled||0), 0))}${row('Active Users', users.filter(u => u.accountEnabled).length)}`)}
        `;

      case 'compliance':
        return `
          ${section('Compliance Summary', `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;">${stat('Compliant', compliant, '#16a34a')}${stat('Non-Compliant', devices.length - compliant, '#ef4444')}${stat('Rate', devices.length > 0 ? Math.round(compliant/devices.length*100)+'%' : 'N/A')}</div>`)}
          ${section('Non-Compliant Devices', devices.filter(d => d.complianceState !== 'compliant').length === 0 ? '<p style="color:#64748b;font-size:13px;">All devices are compliant.</p>' :
            `<table style="width:100%;border-collapse:collapse;font-size:13px;"><thead><tr style="background:#f8fafc;"><th style="text-align:left;padding:8px;border-bottom:1px solid #e2e8f0;">Device</th><th style="text-align:left;padding:8px;border-bottom:1px solid #e2e8f0;">OS</th><th style="text-align:left;padding:8px;border-bottom:1px solid #e2e8f0;">Status</th></tr></thead><tbody>${devices.filter(d => d.complianceState !== 'compliant').slice(0, 25).map(d => `<tr><td style="padding:6px 8px;border-bottom:1px solid #f1f5f9;">${d.deviceName||'Unknown'}</td><td style="padding:6px 8px;border-bottom:1px solid #f1f5f9;">${d.operatingSystem||''}</td><td style="padding:6px 8px;border-bottom:1px solid #f1f5f9;color:#ef4444;">${d.complianceState||'Unknown'}</td></tr>`).join('')}</tbody></table>`)}
        `;

      case 'device':
        const osCounts = {};
        devices.forEach(d => { const os = d.operatingSystem || 'Unknown'; osCounts[os] = (osCounts[os] || 0) + 1; });
        return `
          ${section('Device Summary', `<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;">${stat('Total', devices.length)}${stat('Compliant', compliant, '#16a34a')}${stat('Encrypted', encrypted, '#2563eb')}${stat('Stale', stale, '#f59e0b')}</div>`)}
          ${section('OS Distribution', Object.entries(osCounts).map(([os, count]) => row(os, count)).join(''))}
          ${section('Device List', `<table style="width:100%;border-collapse:collapse;font-size:12px;"><thead><tr style="background:#f8fafc;"><th style="text-align:left;padding:6px 8px;border-bottom:1px solid #e2e8f0;">Name</th><th style="text-align:left;padding:6px 8px;">OS</th><th style="text-align:left;padding:6px 8px;">Compliance</th><th style="text-align:left;padding:6px 8px;">Last Sync</th></tr></thead><tbody>${devices.slice(0, 50).map(d => `<tr><td style="padding:4px 8px;border-bottom:1px solid #f1f5f9;">${d.deviceName||'Unknown'}</td><td style="padding:4px 8px;border-bottom:1px solid #f1f5f9;">${d.operatingSystem||''}</td><td style="padding:4px 8px;border-bottom:1px solid #f1f5f9;">${d.complianceState||''}</td><td style="padding:4px 8px;border-bottom:1px solid #f1f5f9;">${d.lastSyncDateTime ? new Date(d.lastSyncDateTime).toLocaleDateString() : 'Never'}</td></tr>`).join('')}</tbody></table>${devices.length > 50 ? `<p style="font-size:11px;color:#94a3b8;margin-top:8px;">Showing 50 of ${devices.length} devices</p>` : ''}`)}
        `;

      case 'license':
        return `
          ${section('License Summary', `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;">${stat('Total SKUs', licenseData.length)}${stat('Purchased', licenseData.reduce((s,l)=>s+(l.prepaidUnits?.enabled||0),0))}${stat('Assigned', licenseData.reduce((s,l)=>s+l.consumedUnits,0))}</div>`)}
          ${section('License Details', licenseData.length === 0 ? '<p style="color:#64748b;font-size:13px;">No license data available.</p>' :
            `<table style="width:100%;border-collapse:collapse;font-size:13px;"><thead><tr style="background:#f8fafc;"><th style="text-align:left;padding:8px;border-bottom:1px solid #e2e8f0;">License</th><th style="padding:8px;border-bottom:1px solid #e2e8f0;">Purchased</th><th style="padding:8px;border-bottom:1px solid #e2e8f0;">Assigned</th><th style="padding:8px;border-bottom:1px solid #e2e8f0;">Available</th></tr></thead><tbody>${licenseData.map(l => { const p = l.prepaidUnits?.enabled||0; return `<tr><td style="padding:6px 8px;border-bottom:1px solid #f1f5f9;">${typeof Licenses !== 'undefined' ? Licenses.getSkuName(l.skuId) : l.skuPartNumber || l.skuId}</td><td style="padding:6px 8px;text-align:center;border-bottom:1px solid #f1f5f9;">${p}</td><td style="padding:6px 8px;text-align:center;border-bottom:1px solid #f1f5f9;">${l.consumedUnits}</td><td style="padding:6px 8px;text-align:center;border-bottom:1px solid #f1f5f9;">${Math.max(0,p-l.consumedUnits)}</td></tr>`; }).join('')}</tbody></table>`)}
        `;

      case 'security':
        const secScore = typeof Scorecard !== 'undefined' ? Scorecard._computeScore(tenantId) : { total: 0, categories: [] };
        return `
          ${section('Security Score', `<div style="text-align:center;padding:20px;"><div style="font-size:48px;font-weight:700;color:${secScore.total >= 80 ? '#16a34a' : secScore.total >= 60 ? '#f59e0b' : '#ef4444'};">${secScore.total}/100</div><div style="color:#64748b;">Overall Security Score</div></div>`)}
          ${section('Category Breakdown', secScore.categories.map(c => row(c.name, `${c.score}/100`)).join(''))}
          ${section('Conditional Access', `${row('Total Policies', caPolicies.length)}${row('Enabled', caPolicies.filter(p => p.state === 'enabled').length)}${row('Report-Only', caPolicies.filter(p => p.state === 'enabledForReportingButNotEnforced').length)}${row('Disabled', caPolicies.filter(p => p.state === 'disabled').length)}`)}
          ${section('Encryption', `${row('Encrypted Devices', encrypted)}${row('Unencrypted Devices', devices.length - encrypted)}${row('Encryption Rate', devices.length > 0 ? Math.round(encrypted/devices.length*100)+'%' : 'N/A')}`)}
        `;

      case 'user':
        const enabled = users.filter(u => u.accountEnabled).length;
        const licensed = users.filter(u => u.assignedLicenses?.length > 0).length;
        return `
          ${section('User Summary', `<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;">${stat('Total', users.length)}${stat('Enabled', enabled, '#16a34a')}${stat('Disabled', users.length - enabled, '#94a3b8')}${stat('Licensed', licensed, '#2563eb')}</div>`)}
          ${section('User List', `<table style="width:100%;border-collapse:collapse;font-size:12px;"><thead><tr style="background:#f8fafc;"><th style="text-align:left;padding:6px 8px;border-bottom:1px solid #e2e8f0;">Name</th><th style="text-align:left;padding:6px 8px;">UPN</th><th style="padding:6px 8px;">Status</th><th style="padding:6px 8px;">Licenses</th></tr></thead><tbody>${users.slice(0, 50).map(u => `<tr><td style="padding:4px 8px;border-bottom:1px solid #f1f5f9;">${u.displayName||''}</td><td style="padding:4px 8px;border-bottom:1px solid #f1f5f9;font-size:11px;">${u.userPrincipalName||''}</td><td style="padding:4px 8px;text-align:center;border-bottom:1px solid #f1f5f9;">${u.accountEnabled ? '<span style="color:#16a34a;">Active</span>' : '<span style="color:#94a3b8;">Disabled</span>'}</td><td style="padding:4px 8px;text-align:center;border-bottom:1px solid #f1f5f9;">${u.assignedLicenses?.length||0}</td></tr>`).join('')}</tbody></table>${users.length > 50 ? `<p style="font-size:11px;color:#94a3b8;margin-top:8px;">Showing 50 of ${users.length} users</p>` : ''}`)}
        `;

      default:
        return '<p>Unknown report template.</p>';
    }
  },

  _view(id) {
    const report = this._getSaved().find(r => r.id === id);
    if (!report) return;

    const win = window.open('', '_blank');
    win.document.write(`<!DOCTYPE html><html><head><title>${report.title}</title><style>body{margin:0;padding:20px;background:#fff;}@media print{body{padding:0;}}</style></head><body>${report.html}<script>window.onafterprint=()=>{};<\/script></body></html>`);
    win.document.close();
  },

  _delete(id) {
    const saved = this._getSaved().filter(r => r.id !== id);
    localStorage.setItem(this._storageKey, JSON.stringify(saved));
    Toast.show('Report deleted', 'success');
    this.render();
  },

  _getSaved() {
    try { return JSON.parse(localStorage.getItem(this._storageKey) || '[]'); } catch { return []; }
  }
};
