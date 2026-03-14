/* ============================================================
   ExportCenter — Centralized data export hub
   ============================================================ */

const ExportCenter = {
  _formats: ['CSV', 'JSON'],
  _selectedFormat: 'CSV',

  _dataTypes: [
    { id: 'devices',      name: 'Devices',              icon: '&#128187;', desc: 'All managed devices with compliance, OS, and sync status' },
    { id: 'users',        name: 'Users',                icon: '&#128100;', desc: 'User accounts with licenses, status, and sign-in activity' },
    { id: 'compliance',   name: 'Compliance Policies',  icon: '&#128737;', desc: 'Device compliance policies and their configurations' },
    { id: 'configs',      name: 'Configuration Profiles', icon: '&#9881;', desc: 'Device configuration profiles' },
    { id: 'apps',         name: 'Applications',         icon: '&#128230;', desc: 'Managed applications and deployment status' },
    { id: 'groups',       name: 'Groups',               icon: '&#128101;', desc: 'Security and M365 groups' },
    { id: 'licenses',     name: 'Licenses',             icon: '&#128196;', desc: 'License SKUs with utilization data' },
    { id: 'capolicies',   name: 'Conditional Access',   icon: '&#128274;', desc: 'Conditional Access policies and states' },
    { id: 'auditlog',     name: 'Audit Log',            icon: '&#128221;', desc: 'Local audit log entries' },
    { id: 'scorecard',    name: 'Security Scores',      icon: '&#127919;', desc: 'Tenant security scorecard data' },
  ],

  render() {
    const main = document.getElementById('mainContent');
    const isAll = AppState.get('activeTenant') === 'all';
    const tenants = AppState.get('tenants');

    main.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h1 class="page-title">Data Export Center</h1>
          <p class="page-subtitle">Export any data type in CSV or JSON format</p>
        </div>
      </div>

      <!-- Format selector -->
      <div class="flex gap-2 mb-4">
        ${this._formats.map(f => `
          <button class="chip ${this._selectedFormat === f ? 'chip-active' : ''}" onclick="ExportCenter._selectedFormat='${f}'; ExportCenter.render();">${f}</button>
        `).join('')}
        <span class="text-xs text-muted" style="align-self:center;margin-left:8px;">
          Exporting for: <strong>${isAll ? 'All Tenants' : AppState.getTenantName(AppState.get('activeTenant'))}</strong>
        </span>
      </div>

      <!-- Export Cards -->
      <div class="grid grid-2 gap-4">
        ${this._dataTypes.map(dt => `
          <div class="card card-interactive" style="cursor:pointer;" onclick="ExportCenter._export('${dt.id}')">
            <div class="card-body" style="display:flex;align-items:center;gap:16px;padding:16px 20px;">
              <div style="font-size:28px;flex-shrink:0;">${dt.icon}</div>
              <div style="flex:1;">
                <div class="fw-500">${dt.name}</div>
                <div class="text-xs text-muted">${dt.desc}</div>
              </div>
              <button class="btn btn-primary btn-sm" onclick="event.stopPropagation(); ExportCenter._export('${dt.id}')">
                Export ${this._selectedFormat}
              </button>
            </div>
          </div>
        `).join('')}
      </div>

      <!-- Bulk Export -->
      <div class="card mt-6">
        <div class="card-header">
          <div class="card-header-title">Bulk Export</div>
        </div>
        <div class="card-body">
          <p class="text-sm text-muted mb-3">Export all data types at once as a ZIP-style download (individual files).</p>
          <button class="btn btn-primary" onclick="ExportCenter._exportAll()">Export All Data</button>
        </div>
      </div>
    `;
  },

  _export(dataTypeId) {
    const data = this._getData(dataTypeId);
    if (!data || data.length === 0) {
      Toast.show(`No ${dataTypeId} data available to export`, 'warning');
      return;
    }

    const filename = `${dataTypeId}_${new Date().toISOString().slice(0, 10)}`;

    if (this._selectedFormat === 'JSON') {
      this._downloadJSON(data, filename);
    } else {
      this._downloadCSV(data, filename);
    }

    Toast.show(`Exported ${data.length} ${dataTypeId} records`, 'success');
  },

  _getData(dataTypeId) {
    const isAll = AppState.get('activeTenant') === 'all';
    const tenants = AppState.get('tenants');
    const tenantsToExport = isAll ? tenants : tenants.filter(t => t.id === AppState.get('activeTenant'));

    switch (dataTypeId) {
      case 'devices': {
        const items = [];
        tenantsToExport.forEach(t => {
          (AppState.get('devices')[t.id] || []).forEach(d => {
            items.push({
              Tenant: t.displayName,
              DeviceName: d.deviceName || '',
              OS: d.operatingSystem || '',
              OSVersion: d.osVersion || '',
              Compliance: d.complianceState || '',
              Encrypted: d.isEncrypted ? 'Yes' : 'No',
              Manufacturer: d.manufacturer || '',
              Model: d.model || '',
              SerialNumber: d.serialNumber || '',
              LastSync: d.lastSyncDateTime || '',
              EnrolledDate: d.enrolledDateTime || '',
              UserPrincipalName: d.userPrincipalName || '',
              DeviceId: d.id
            });
          });
        });
        return items;
      }

      case 'users': {
        const items = [];
        tenantsToExport.forEach(t => {
          (AppState.get('users')[t.id] || []).forEach(u => {
            items.push({
              Tenant: t.displayName,
              DisplayName: u.displayName || '',
              UPN: u.userPrincipalName || '',
              Email: u.mail || '',
              JobTitle: u.jobTitle || '',
              Department: u.department || '',
              Status: u.accountEnabled ? 'Enabled' : 'Disabled',
              LicenseCount: u.assignedLicenses?.length || 0,
              CreatedDate: u.createdDateTime || '',
              LastSignIn: u.signInActivity?.lastSignInDateTime || 'Never',
              UserId: u.id
            });
          });
        });
        return items;
      }

      case 'compliance': {
        const items = [];
        tenantsToExport.forEach(t => {
          (AppState.get('compliancePolicies')[t.id] || []).forEach(p => {
            items.push({
              Tenant: t.displayName,
              PolicyName: p.displayName || '',
              Description: p.description || '',
              Created: p.createdDateTime || '',
              Modified: p.lastModifiedDateTime || '',
              PolicyId: p.id
            });
          });
        });
        return items;
      }

      case 'configs': {
        const items = [];
        tenantsToExport.forEach(t => {
          (AppState.get('configProfiles')[t.id] || []).forEach(p => {
            items.push({
              Tenant: t.displayName,
              ProfileName: p.displayName || '',
              Description: p.description || '',
              Created: p.createdDateTime || '',
              Modified: p.lastModifiedDateTime || '',
              ProfileId: p.id
            });
          });
        });
        return items;
      }

      case 'apps': {
        const items = [];
        tenantsToExport.forEach(t => {
          (AppState.get('apps')[t.id] || []).forEach(a => {
            items.push({
              Tenant: t.displayName,
              AppName: a.displayName || '',
              Publisher: a.publisher || '',
              Type: (a['@odata.type'] || '').replace('#microsoft.graph.', ''),
              Created: a.createdDateTime || '',
              AppId: a.id
            });
          });
        });
        return items;
      }

      case 'groups': {
        const items = [];
        tenantsToExport.forEach(t => {
          (AppState.get('groups')[t.id] || []).forEach(g => {
            items.push({
              Tenant: t.displayName,
              GroupName: g.displayName || '',
              Description: g.description || '',
              Type: g.groupTypes?.includes('DynamicMembership') ? 'Dynamic' : 'Assigned',
              MailEnabled: g.mailEnabled ? 'Yes' : 'No',
              SecurityEnabled: g.securityEnabled ? 'Yes' : 'No',
              GroupId: g.id
            });
          });
        });
        return items;
      }

      case 'licenses': {
        const items = [];
        tenantsToExport.forEach(t => {
          ((AppState.get('subscribedSkus') || {})[t.id] || []).forEach(s => {
            const p = s.prepaidUnits?.enabled || 0;
            items.push({
              Tenant: t.displayName,
              License: typeof Licenses !== 'undefined' ? Licenses.getSkuName(s.skuId) : s.skuPartNumber || s.skuId,
              SKU: s.skuPartNumber || '',
              Purchased: p,
              Assigned: s.consumedUnits || 0,
              Available: Math.max(0, p - (s.consumedUnits || 0)),
              UtilizationPct: p > 0 ? Math.round(((s.consumedUnits || 0) / p) * 100) : 0
            });
          });
        });
        return items;
      }

      case 'capolicies': {
        const items = [];
        tenantsToExport.forEach(t => {
          (AppState.get('caPolicies')[t.id] || []).forEach(p => {
            items.push({
              Tenant: t.displayName,
              PolicyName: p.displayName || '',
              State: p.state || '',
              Created: p.createdDateTime || '',
              Modified: p.modifiedDateTime || '',
              PolicyId: p.id
            });
          });
        });
        return items;
      }

      case 'auditlog': {
        if (typeof AuditLog !== 'undefined' && AuditLog.getEntries) {
          return AuditLog.getEntries().map(e => ({
            Action: e.action || '',
            Detail: e.detail || e.message || '',
            User: e.user || '',
            Tenant: e.tenant || '',
            Timestamp: e.timestamp || e.date || ''
          }));
        }
        return [];
      }

      case 'scorecard': {
        if (typeof Scorecard !== 'undefined') {
          return tenantsToExport.map(t => {
            const sc = Scorecard._computeScore(t.id);
            const result = { Tenant: t.displayName, OverallScore: sc.total, Grade: Scorecard._gradeLabel(sc.total) };
            sc.categories.forEach(c => { result[c.name] = c.score; });
            return result;
          });
        }
        return [];
      }

      default:
        return [];
    }
  },

  _downloadCSV(data, filename) {
    if (data.length === 0) return;
    const headers = Object.keys(data[0]);
    let csv = headers.join(',') + '\n';
    data.forEach(row => {
      csv += headers.map(h => `"${String(row[h] ?? '').replace(/"/g, '""')}"`).join(',') + '\n';
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename + '.csv';
    a.click();
  },

  _downloadJSON(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename + '.json';
    a.click();
  },

  _exportAll() {
    let exported = 0;
    this._dataTypes.forEach(dt => {
      const data = this._getData(dt.id);
      if (data && data.length > 0) {
        const filename = `${dt.id}_${new Date().toISOString().slice(0, 10)}`;
        if (this._selectedFormat === 'JSON') {
          this._downloadJSON(data, filename);
        } else {
          this._downloadCSV(data, filename);
        }
        exported++;
      }
    });
    Toast.show(`Exported ${exported} data file(s)`, 'success');
  }
};
