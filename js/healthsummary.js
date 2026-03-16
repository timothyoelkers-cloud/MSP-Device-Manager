/* ============================================================
   Health Summary — Tenant Health Report email generator
   ============================================================ */

const HealthSummary = {
  selectedTenants: [],
  generatedHTML: '',

  render() {
    const main = document.getElementById('mainContent');
    const tenants = AppState.get('tenants') || [];

    main.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h1 class="page-title">Tenant Health Summary</h1>
          <p class="page-subtitle">Generate a professional HTML email report for selected tenants.</p>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-secondary" onclick="HealthSummary.copyToClipboard()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
            Copy HTML to Clipboard
          </button>
          <button class="btn btn-primary" onclick="HealthSummary.openPreview()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            Open in New Tab
          </button>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:320px 1fr;gap:24px;align-items:start;">
        <!-- Tenant Selector -->
        <div class="card">
          <div class="card-header">
            <span class="card-header-title">Select Tenants</span>
          </div>
          <div class="card-body" style="padding:16px;">
            <label style="display:flex;align-items:center;gap:8px;margin-bottom:12px;font-weight:600;cursor:pointer;">
              <input type="checkbox" id="hsSelectAll" onchange="HealthSummary.toggleSelectAll(this.checked)" ${tenants.length > 0 && this.selectedTenants.length === tenants.length ? 'checked' : ''}>
              Select All (${tenants.length})
            </label>
            <div style="border-top:1px solid var(--border);padding-top:12px;max-height:400px;overflow-y:auto;display:flex;flex-direction:column;gap:8px;">
              ${tenants.length === 0 ? '<div class="text-muted text-sm">No tenants connected.</div>' : tenants.map(t => `
                <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px;">
                  <input type="checkbox" value="${t.id}" class="hs-tenant-cb" onchange="HealthSummary.onTenantToggle()" ${this.selectedTenants.includes(t.id) ? 'checked' : ''}>
                  <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${t.displayName || t.id}">${t.displayName || t.id}</span>
                </label>
              `).join('')}
            </div>
            <div style="margin-top:16px;">
              <button class="btn btn-primary btn-sm" style="width:100%;" onclick="HealthSummary.generate()">
                Generate Report
              </button>
            </div>
          </div>
        </div>

        <!-- Preview Pane -->
        <div class="card">
          <div class="card-header" style="display:flex;justify-content:space-between;align-items:center;">
            <span class="card-header-title">Email Preview</span>
            <span class="text-muted text-sm" id="hsTimestamp"></span>
          </div>
          <div class="card-body" style="padding:0;">
            <div id="hsPreview" style="background:#f1f5f9;min-height:400px;display:flex;align-items:center;justify-content:center;padding:24px;">
              ${this.generatedHTML ? `<div style="width:100%;max-height:700px;overflow:auto;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.08);">${this.generatedHTML}</div>` : `
                <div style="text-align:center;color:var(--text-muted);">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom:12px;opacity:0.4;"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                  <div>Select tenants and click <strong>Generate Report</strong> to preview.</div>
                </div>
              `}
            </div>
          </div>
        </div>
      </div>
    `;
  },

  toggleSelectAll(checked) {
    const tenants = AppState.get('tenants') || [];
    this.selectedTenants = checked ? tenants.map(t => t.id) : [];
    document.querySelectorAll('.hs-tenant-cb').forEach(cb => { cb.checked = checked; });
  },

  onTenantToggle() {
    this.selectedTenants = Array.from(document.querySelectorAll('.hs-tenant-cb:checked')).map(cb => cb.value);
    const tenants = AppState.get('tenants') || [];
    const selectAll = document.getElementById('hsSelectAll');
    if (selectAll) selectAll.checked = this.selectedTenants.length === tenants.length;
  },

  generate() {
    if (this.selectedTenants.length === 0) {
      Toast.show('Please select at least one tenant.', 'warning');
      return;
    }
    this.generatedHTML = this.generateHTML(this.selectedTenants);
    const tsEl = document.getElementById('hsTimestamp');
    if (tsEl) tsEl.textContent = 'Generated: ' + new Date().toLocaleString();
    const preview = document.getElementById('hsPreview');
    if (preview) {
      preview.style.background = '#f1f5f9';
      preview.innerHTML = `<div style="width:100%;max-height:700px;overflow:auto;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.08);">${this.generatedHTML}</div>`;
    }
    if (typeof AuditLog !== 'undefined') {
      AuditLog.log('health_report_generated', { tenants: this.selectedTenants.length });
    }
    Toast.show(`Report generated for ${this.selectedTenants.length} tenant(s).`, 'success');
  },

  /* ---------------------------------------------------------------
     Generate self-contained HTML email string
     --------------------------------------------------------------- */
  generateHTML(tenantIds) {
    const tenants = AppState.get('tenants') || [];
    const allDevices = AppState.get('devices') || {};
    const allUsers = AppState.get('users') || {};
    const allCompliance = AppState.get('compliancePolicies') || {};
    const allConfigProfiles = AppState.get('configProfiles') || {};
    const allCA = AppState.get('caPolicies') || {};
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    // Gather per-tenant stats
    const tenantStats = [];
    let totalDevices = 0;
    let totalCompliant = 0;
    let totalDevicesForCompliance = 0;
    let tenantsNeedingAttention = 0;

    tenantIds.forEach(tid => {
      const tenant = tenants.find(t => t.id === tid);
      if (!tenant) return;
      const devices = allDevices[tid] || [];
      const users = allUsers[tid] || [];
      const compliance = allCompliance[tid] || [];
      const configProfs = allConfigProfiles[tid] || [];
      const ca = allCA[tid] || [];

      const compliant = devices.filter(d => d.complianceState === 'compliant').length;
      const encrypted = devices.filter(d => d.isEncrypted === true).length;
      const complianceRate = devices.length > 0 ? Math.round((compliant / devices.length) * 100) : 0;
      const enabledUsers = users.filter(u => u.accountEnabled !== false).length;
      const licensedUsers = users.filter(u => u.assignedLicenses && u.assignedLicenses.length > 0).length;

      // OS breakdown
      const osMap = {};
      devices.forEach(d => {
        const os = d.operatingSystem || 'Unknown';
        osMap[os] = (osMap[os] || 0) + 1;
      });

      totalDevices += devices.length;
      totalCompliant += compliant;
      totalDevicesForCompliance += devices.length;
      if (complianceRate < 80) tenantsNeedingAttention++;

      tenantStats.push({
        name: tenant.displayName || tid,
        deviceCount: devices.length,
        compliant,
        complianceRate,
        encrypted,
        encryptionRate: devices.length > 0 ? Math.round((encrypted / devices.length) * 100) : 0,
        osBreakdown: osMap,
        userCount: users.length,
        enabledUsers,
        licensedUsers,
        compliancePolicies: compliance.length,
        configProfiles: configProfs.length,
        caPolicies: ca.length
      });
    });

    const avgCompliance = totalDevicesForCompliance > 0 ? Math.round((totalCompliant / totalDevicesForCompliance) * 100) : 0;

    // Health indicator color helper
    function healthColor(rate) {
      if (rate >= 80) return '#059669';
      if (rate >= 50) return '#d97706';
      return '#dc2626';
    }
    function healthLabel(rate) {
      if (rate >= 80) return 'Healthy';
      if (rate >= 50) return 'Warning';
      return 'Critical';
    }

    // Build per-tenant sections
    const tenantSections = tenantStats.map(ts => {
      const osEntries = Object.entries(ts.osBreakdown).map(([os, count]) =>
        `<span style="display:inline-block;background:#f1f5f9;border-radius:4px;padding:2px 8px;font-size:12px;margin:2px 4px 2px 0;color:#334155;">${os}: ${count}</span>`
      ).join('');

      return `
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;">
          <tr>
            <td style="padding:14px 20px;background:#2563eb;border-radius:8px 8px 0 0;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="font-size:16px;font-weight:700;color:#ffffff;font-family:Arial,Helvetica,sans-serif;">${ts.name}</td>
                  <td align="right" style="font-family:Arial,Helvetica,sans-serif;">
                    <span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:${healthColor(ts.complianceRate)};vertical-align:middle;"></span>
                    <span style="color:#ffffff;font-size:13px;margin-left:4px;vertical-align:middle;">${healthLabel(ts.complianceRate)}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px;padding:0;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <!-- Device Stats -->
                <tr>
                  <td style="padding:16px 20px 8px;font-family:Arial,Helvetica,sans-serif;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size:13px;color:#334155;">
                      <tr>
                        <td width="50%" style="padding:4px 0;font-family:Arial,Helvetica,sans-serif;">
                          <strong style="color:#0f172a;">Devices:</strong> ${ts.deviceCount}
                        </td>
                        <td width="50%" style="padding:4px 0;font-family:Arial,Helvetica,sans-serif;">
                          <strong style="color:#0f172a;">Compliance:</strong>
                          <span style="color:${healthColor(ts.complianceRate)};font-weight:600;">${ts.complianceRate}%</span>
                          (${ts.compliant}/${ts.deviceCount})
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:4px 0;font-family:Arial,Helvetica,sans-serif;">
                          <strong style="color:#0f172a;">Encrypted:</strong>
                          <span style="color:${healthColor(ts.encryptionRate)};font-weight:600;">${ts.encryptionRate}%</span>
                          (${ts.encrypted}/${ts.deviceCount})
                        </td>
                        <td style="padding:4px 0;font-family:Arial,Helvetica,sans-serif;">
                          <strong style="color:#0f172a;">OS:</strong> ${osEntries || '<span style="color:#94a3b8;">N/A</span>'}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <!-- User Stats -->
                <tr>
                  <td style="padding:8px 20px;border-top:1px solid #f1f5f9;font-family:Arial,Helvetica,sans-serif;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size:13px;color:#334155;">
                      <tr>
                        <td width="33%" style="padding:4px 0;font-family:Arial,Helvetica,sans-serif;"><strong style="color:#0f172a;">Users:</strong> ${ts.userCount}</td>
                        <td width="33%" style="padding:4px 0;font-family:Arial,Helvetica,sans-serif;"><strong style="color:#0f172a;">Enabled:</strong> ${ts.enabledUsers}</td>
                        <td width="34%" style="padding:4px 0;font-family:Arial,Helvetica,sans-serif;"><strong style="color:#0f172a;">Licensed:</strong> ${ts.licensedUsers}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <!-- Policy Counts -->
                <tr>
                  <td style="padding:8px 20px 16px;border-top:1px solid #f1f5f9;font-family:Arial,Helvetica,sans-serif;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size:13px;color:#334155;">
                      <tr>
                        <td width="33%" style="padding:4px 0;font-family:Arial,Helvetica,sans-serif;"><strong style="color:#0f172a;">Compliance Policies:</strong> ${ts.compliancePolicies}</td>
                        <td width="33%" style="padding:4px 0;font-family:Arial,Helvetica,sans-serif;"><strong style="color:#0f172a;">Config Profiles:</strong> ${ts.configProfiles}</td>
                        <td width="34%" style="padding:4px 0;font-family:Arial,Helvetica,sans-serif;"><strong style="color:#0f172a;">CA Policies:</strong> ${ts.caPolicies}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>`;
    }).join('');

    // Full HTML email
    return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Tenant Health Report</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}
    table,td{mso-table-lspace:0pt;mso-table-rspace:0pt;}
    img{-ms-interpolation-mode:bicubic;}
    body{margin:0;padding:0;width:100%!important;}
  </style>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:Arial,Helvetica,sans-serif;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f1f5f9;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <!-- Container -->
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.06);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#2563eb 0%,#1d4ed8 100%);padding:32px 30px;text-align:center;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="font-family:Arial,Helvetica,sans-serif;">
                    <div style="font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">MSP Device Manager</div>
                    <div style="font-size:14px;color:rgba(255,255,255,0.85);margin-top:6px;">Tenant Health Report</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Report Meta -->
          <tr>
            <td style="padding:24px 30px 16px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f8fafc;border-radius:8px;padding:16px;">
                <tr>
                  <td style="padding:16px;font-family:Arial,Helvetica,sans-serif;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size:13px;color:#475569;">
                      <tr>
                        <td style="font-family:Arial,Helvetica,sans-serif;"><strong style="color:#0f172a;">Report Date:</strong> ${dateStr} at ${timeStr}</td>
                      </tr>
                      <tr>
                        <td style="padding-top:6px;font-family:Arial,Helvetica,sans-serif;"><strong style="color:#0f172a;">Tenants Included:</strong> ${tenantStats.length}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Per-Tenant Sections -->
          <tr>
            <td style="padding:8px 30px 16px;">
              ${tenantSections}
            </td>
          </tr>
          <!-- Summary -->
          <tr>
            <td style="padding:8px 30px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-radius:8px;overflow:hidden;">
                <tr>
                  <td style="background:#0f172a;padding:16px 20px;font-family:Arial,Helvetica,sans-serif;">
                    <div style="font-size:15px;font-weight:700;color:#ffffff;">Summary</div>
                  </td>
                </tr>
                <tr>
                  <td style="background:#1e293b;padding:16px 20px;font-family:Arial,Helvetica,sans-serif;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size:13px;color:#cbd5e1;">
                      <tr>
                        <td width="33%" style="padding:8px 0;text-align:center;font-family:Arial,Helvetica,sans-serif;">
                          <div style="font-size:28px;font-weight:700;color:#ffffff;">${totalDevices}</div>
                          <div style="margin-top:4px;">Total Devices</div>
                        </td>
                        <td width="33%" style="padding:8px 0;text-align:center;font-family:Arial,Helvetica,sans-serif;">
                          <div style="font-size:28px;font-weight:700;color:${healthColor(avgCompliance)};">${avgCompliance}%</div>
                          <div style="margin-top:4px;">Avg Compliance</div>
                        </td>
                        <td width="34%" style="padding:8px 0;text-align:center;font-family:Arial,Helvetica,sans-serif;">
                          <div style="font-size:28px;font-weight:700;color:${tenantsNeedingAttention > 0 ? '#dc2626' : '#059669'};">${tenantsNeedingAttention}</div>
                          <div style="margin-top:4px;">Need Attention</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 30px;background:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;font-family:Arial,Helvetica,sans-serif;">
              <div style="font-size:12px;color:#94a3b8;">Generated by <strong style="color:#64748b;">MSP Device Manager</strong></div>
              <div style="font-size:11px;color:#94a3b8;margin-top:4px;">${dateStr} at ${timeStr}</div>
            </td>
          </tr>
        </table>
        <!-- End Container -->
      </td>
    </tr>
  </table>
</body>
</html>`;
  },

  /* ---------------------------------------------------------------
     Copy HTML to clipboard
     --------------------------------------------------------------- */
  async copyToClipboard() {
    if (!this.generatedHTML) {
      Toast.show('Generate a report first.', 'warning');
      return;
    }
    try {
      await navigator.clipboard.writeText(this.generatedHTML);
      Toast.show('HTML copied to clipboard.', 'success');
      if (typeof AuditLog !== 'undefined') {
        AuditLog.log('health_report_copied', { tenants: this.selectedTenants.length });
      }
    } catch (err) {
      // Fallback for older browsers
      const ta = document.createElement('textarea');
      ta.value = this.generatedHTML;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        Toast.show('HTML copied to clipboard.', 'success');
      } catch (e) {
        Toast.show('Failed to copy. Please try again.', 'error');
      }
      document.body.removeChild(ta);
    }
  },

  /* ---------------------------------------------------------------
     Open report in new browser tab
     --------------------------------------------------------------- */
  openPreview() {
    if (!this.generatedHTML) {
      Toast.show('Generate a report first.', 'warning');
      return;
    }
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(this.generatedHTML);
      win.document.close();
      if (typeof AuditLog !== 'undefined') {
        AuditLog.log('health_report_previewed', { tenants: this.selectedTenants.length });
      }
    } else {
      Toast.show('Pop-up blocked. Please allow pop-ups and try again.', 'error');
    }
  }
};
