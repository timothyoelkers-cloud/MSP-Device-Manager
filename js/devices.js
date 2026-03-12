/* ============================================================
   Devices — Device inventory, details, and bulk actions
   ============================================================ */

const Devices = {
  searchTerm: '',
  osFilter: 'all',
  complianceFilter: 'all',
  currentPage: 1,
  pageSize: 25,
  sortField: 'deviceName',
  sortDir: 'asc',

  render() {
    const main = document.getElementById('mainContent');
    const allDevices = AppState.getDevicesForContext();
    const filtered = this.filterDevices(allDevices);
    const sorted = this.sortDevices(filtered);
    const totalPages = Math.ceil(sorted.length / this.pageSize);
    const paged = sorted.slice((this.currentPage - 1) * this.pageSize, this.currentPage * this.pageSize);
    const selected = AppState.get('selectedDevices');
    const isAllTenants = AppState.get('activeTenant') === 'all';

    main.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h1 class="page-title">All Devices</h1>
          <p class="page-subtitle">${allDevices.length} managed devices ${isAllTenants ? 'across all tenants' : 'in ' + AppState.getTenantName(AppState.get('activeTenant'))}</p>
        </div>
        <div class="page-header-actions">
          ${selected.length > 0 ? `
            <span class="badge badge-primary">${selected.length} selected</span>
            <div class="dropdown">
              <button class="btn btn-secondary" onclick="this.nextElementSibling.classList.toggle('hidden')">
                Bulk Actions &#9662;
              </button>
              <div class="dropdown-menu hidden">
                <div class="dropdown-item" onclick="Devices.bulkAction('sync')">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg>
                  Sync Devices
                </div>
                <div class="dropdown-item" onclick="Devices.bulkAction('restart')">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>
                  Restart Devices
                </div>
                <div class="dropdown-item" onclick="Devices.bulkAction('lock')">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                  Lock Devices
                </div>
                <div class="dropdown-divider"></div>
                <div class="dropdown-item danger" onclick="Devices.bulkAction('retire')">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                  Retire Devices
                </div>
              </div>
            </div>
          ` : ''}
          <button class="btn btn-secondary" onclick="Devices.exportCSV()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Export
          </button>
        </div>
      </div>

      <!-- Device Table -->
      <div class="table-wrapper animate-fade">
        <div class="table-toolbar">
          <div class="table-toolbar-left">
            <div class="table-search">
              <span class="table-search-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              </span>
              <input type="text" placeholder="Search devices..." value="${this.searchTerm}" oninput="Devices.search(this.value)">
            </div>
            <select class="form-select" style="width:auto;" onchange="Devices.filterOS(this.value)">
              <option value="all" ${this.osFilter==='all'?'selected':''}>All OS</option>
              <option value="windows" ${this.osFilter==='windows'?'selected':''}>Windows</option>
              <option value="macOS" ${this.osFilter==='macOS'?'selected':''}>macOS</option>
              <option value="iOS" ${this.osFilter==='iOS'?'selected':''}>iOS</option>
              <option value="android" ${this.osFilter==='android'?'selected':''}>Android</option>
              <option value="linux" ${this.osFilter==='linux'?'selected':''}>Linux</option>
            </select>
            <select class="form-select" style="width:auto;" onchange="Devices.filterCompliance(this.value)">
              <option value="all" ${this.complianceFilter==='all'?'selected':''}>All Status</option>
              <option value="compliant" ${this.complianceFilter==='compliant'?'selected':''}>Compliant</option>
              <option value="noncompliant" ${this.complianceFilter==='noncompliant'?'selected':''}>Non-Compliant</option>
              <option value="unknown" ${this.complianceFilter==='unknown'?'selected':''}>Unknown</option>
            </select>
          </div>
          <div class="table-toolbar-right">
            <span class="text-xs text-muted">${filtered.length} results</span>
          </div>
        </div>

        <table class="table">
          <thead>
            <tr>
              <th style="width:40px;">
                <input type="checkbox" class="table-checkbox" onchange="Devices.selectAll(this.checked)" ${selected.length === paged.length && paged.length > 0 ? 'checked' : ''}>
              </th>
              <th onclick="Devices.sort('deviceName')" style="cursor:pointer;">Device Name ${this.sortIcon('deviceName')}</th>
              ${isAllTenants ? '<th>Tenant</th>' : ''}
              <th onclick="Devices.sort('operatingSystem')" style="cursor:pointer;">OS ${this.sortIcon('operatingSystem')}</th>
              <th>OS Version</th>
              <th onclick="Devices.sort('complianceState')" style="cursor:pointer;">Compliance ${this.sortIcon('complianceState')}</th>
              <th>Primary User</th>
              <th onclick="Devices.sort('lastSyncDateTime')" style="cursor:pointer;">Last Sync ${this.sortIcon('lastSyncDateTime')}</th>
              <th>Encryption</th>
              <th style="width:40px;"></th>
            </tr>
          </thead>
          <tbody>
            ${paged.length === 0 ? `
              <tr><td colspan="${isAllTenants ? 10 : 9}" class="text-center text-muted" style="padding:3rem;">
                ${allDevices.length === 0 ? 'No devices found. Connect a tenant to load devices.' : 'No devices match your filters.'}
              </td></tr>
            ` : paged.map(d => this.renderDeviceRow(d, isAllTenants)).join('')}
          </tbody>
        </table>

        ${totalPages > 1 ? `
          <div class="table-pagination">
            <span>Showing ${(this.currentPage-1)*this.pageSize+1}–${Math.min(this.currentPage*this.pageSize, filtered.length)} of ${filtered.length}</span>
            <div class="table-pagination-pages">
              <button class="table-pagination-btn" onclick="Devices.goPage(${this.currentPage-1})" ${this.currentPage===1?'disabled':''}>&lsaquo;</button>
              ${this.renderPagination(totalPages)}
              <button class="table-pagination-btn" onclick="Devices.goPage(${this.currentPage+1})" ${this.currentPage===totalPages?'disabled':''}>&rsaquo;</button>
            </div>
          </div>
        ` : ''}
      </div>
    `;
  },

  renderDeviceRow(device, showTenant) {
    const selected = AppState.get('selectedDevices');
    const isSelected = selected.includes(device.id);
    const osIcon = this.getOSIcon(device.operatingSystem);
    const complianceBadge = this.getComplianceBadge(device.complianceState);

    return `
      <tr class="${isSelected ? 'selected' : ''}" onclick="Devices.showDetail('${device._tenantId}', '${device.id}')" style="cursor:pointer;">
        <td onclick="event.stopPropagation()">
          <input type="checkbox" class="table-checkbox" ${isSelected ? 'checked' : ''}
                 onchange="Devices.toggleSelect('${device.id}', this.checked)">
        </td>
        <td>
          <div class="table-device-name">
            <div class="table-device-icon">${osIcon}</div>
            <div class="table-device-info">
              <span class="table-device-primary">${device.deviceName || 'Unknown'}</span>
              <span class="table-device-secondary">${device.serialNumber || device.id?.substring(0,12) || ''}</span>
            </div>
          </div>
        </td>
        ${showTenant ? `<td><span class="chip">${AppState.getTenantName(device._tenantId)}</span></td>` : ''}
        <td>${device.operatingSystem || '-'}</td>
        <td class="text-mono text-xs">${device.osVersion || '-'}</td>
        <td>${complianceBadge}</td>
        <td class="text-sm">${device.userPrincipalName || device.emailAddress || '-'}</td>
        <td class="text-sm">${this.formatDate(device.lastSyncDateTime)}</td>
        <td>${device.isEncrypted ? '<span class="badge badge-success">Yes</span>' : '<span class="badge badge-default">No</span>'}</td>
        <td onclick="event.stopPropagation()">
          <div class="dropdown">
            <button class="btn btn-ghost btn-icon" onclick="this.nextElementSibling.classList.toggle('hidden')">&#8942;</button>
            <div class="dropdown-menu hidden">
              <div class="dropdown-item" onclick="Devices.action('sync','${device._tenantId}','${device.id}')">Sync</div>
              <div class="dropdown-item" onclick="Devices.action('restart','${device._tenantId}','${device.id}')">Restart</div>
              <div class="dropdown-item" onclick="Devices.action('lock','${device._tenantId}','${device.id}')">Lock</div>
              <div class="dropdown-item" onclick="Devices.action('rename','${device._tenantId}','${device.id}')">Rename</div>
              <div class="dropdown-item" onclick="Devices.action('bitlocker','${device._tenantId}','${device.id}')">BitLocker Keys</div>
              <div class="dropdown-divider"></div>
              <div class="dropdown-item danger" onclick="Devices.action('retire','${device._tenantId}','${device.id}')">Retire</div>
              <div class="dropdown-item danger" onclick="Devices.action('wipe','${device._tenantId}','${device.id}')">Wipe</div>
            </div>
          </div>
        </td>
      </tr>
    `;
  },

  // Detail panel
  async showDetail(tenantId, deviceId) {
    const devices = AppState.get('devices')[tenantId] || [];
    const device = devices.find(d => d.id === deviceId);
    if (!device) return;

    const panel = document.getElementById('deviceDetailPanel');
    const body = document.getElementById('detailPanelBody');
    const actions = document.getElementById('detailPanelActions');
    document.getElementById('detailDeviceName').textContent = device.deviceName || 'Device Details';

    body.innerHTML = `
      <div class="detail-section">
        <div class="detail-section-title">Device Information</div>
        <div class="detail-row"><span class="detail-label">Device Name</span><span class="detail-value">${device.deviceName || '-'}</span></div>
        <div class="detail-row"><span class="detail-label">Manufacturer</span><span class="detail-value">${device.manufacturer || '-'}</span></div>
        <div class="detail-row"><span class="detail-label">Model</span><span class="detail-value">${device.model || '-'}</span></div>
        <div class="detail-row"><span class="detail-label">Serial Number</span><span class="detail-value text-mono">${device.serialNumber || '-'}</span></div>
        <div class="detail-row"><span class="detail-label">Enrolled</span><span class="detail-value">${this.formatDate(device.enrolledDateTime)}</span></div>
        <div class="detail-row"><span class="detail-label">Last Sync</span><span class="detail-value">${this.formatDate(device.lastSyncDateTime)}</span></div>
        <div class="detail-row"><span class="detail-label">Tenant</span><span class="detail-value">${AppState.getTenantName(tenantId)}</span></div>
      </div>

      <div class="detail-section">
        <div class="detail-section-title">Operating System</div>
        <div class="detail-row"><span class="detail-label">OS</span><span class="detail-value">${device.operatingSystem || '-'}</span></div>
        <div class="detail-row"><span class="detail-label">Version</span><span class="detail-value text-mono">${device.osVersion || '-'}</span></div>
        <div class="detail-row"><span class="detail-label">Architecture</span><span class="detail-value">${device.operatingSystemEdition || '-'}</span></div>
      </div>

      <div class="detail-section">
        <div class="detail-section-title">Security & Compliance</div>
        <div class="detail-row"><span class="detail-label">Compliance</span><span class="detail-value">${this.getComplianceBadge(device.complianceState)}</span></div>
        <div class="detail-row"><span class="detail-label">Encrypted</span><span class="detail-value">${device.isEncrypted ? '<span class="badge badge-success">Yes</span>' : '<span class="badge badge-danger">No</span>'}</span></div>
        <div class="detail-row"><span class="detail-label">Supervised</span><span class="detail-value">${device.isSupervised ? 'Yes' : 'No'}</span></div>
        <div class="detail-row"><span class="detail-label">Jailbroken</span><span class="detail-value">${device.jailBroken === 'True' ? '<span class="badge badge-danger">Yes</span>' : 'No'}</span></div>
      </div>

      <div class="detail-section">
        <div class="detail-section-title">User & Storage</div>
        <div class="detail-row"><span class="detail-label">Primary User</span><span class="detail-value">${device.userPrincipalName || '-'}</span></div>
        <div class="detail-row"><span class="detail-label">Email</span><span class="detail-value">${device.emailAddress || '-'}</span></div>
        <div class="detail-row"><span class="detail-label">Total Storage</span><span class="detail-value">${device.totalStorageSpaceInBytes ? Math.round(device.totalStorageSpaceInBytes / 1073741824) + ' GB' : '-'}</span></div>
        <div class="detail-row"><span class="detail-label">Free Storage</span><span class="detail-value">${device.freeStorageSpaceInBytes ? Math.round(device.freeStorageSpaceInBytes / 1073741824) + ' GB' : '-'}</span></div>
      </div>

      <div class="detail-section">
        <div class="detail-section-title">Network</div>
        <div class="detail-row"><span class="detail-label">Wi-Fi MAC</span><span class="detail-value text-mono">${device.wiFiMacAddress || '-'}</span></div>
        <div class="detail-row"><span class="detail-label">Ethernet MAC</span><span class="detail-value text-mono">${device.ethernetMacAddress || '-'}</span></div>
        <div class="detail-row"><span class="detail-label">IMEI</span><span class="detail-value text-mono">${device.imei || '-'}</span></div>
      </div>
    `;

    actions.innerHTML = `
      <button class="btn btn-secondary btn-sm" onclick="Devices.action('sync','${tenantId}','${deviceId}')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg>
        Sync
      </button>
      <button class="btn btn-secondary btn-sm" onclick="Devices.action('restart','${tenantId}','${deviceId}')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>
        Restart
      </button>
      <button class="btn btn-secondary btn-sm" onclick="Devices.action('lock','${tenantId}','${deviceId}')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
        Lock
      </button>
      <button class="btn btn-danger btn-sm" onclick="Devices.action('retire','${tenantId}','${deviceId}')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
        Retire
      </button>
    `;

    panel.classList.add('open');
  },

  closeDetail() {
    document.getElementById('deviceDetailPanel')?.classList.remove('open');
  },

  // Actions
  async action(type, tenantId, deviceId) {
    const device = (AppState.get('devices')[tenantId] || []).find(d => d.id === deviceId);
    const name = device?.deviceName || 'this device';

    try {
      switch (type) {
        case 'sync':
          await Graph.syncDevice(tenantId, deviceId);
          Toast.show(`Sync initiated for ${name}`, 'success');
          break;
        case 'restart':
          if (!confirm(`Restart ${name}?`)) return;
          await Graph.restartDevice(tenantId, deviceId);
          Toast.show(`Restart command sent to ${name}`, 'success');
          break;
        case 'lock':
          if (!confirm(`Lock ${name}?`)) return;
          await Graph.lockDevice(tenantId, deviceId);
          Toast.show(`Lock command sent to ${name}`, 'success');
          break;
        case 'retire':
          if (!confirm(`Retire ${name}? This will remove company data.`)) return;
          await Graph.retireDevice(tenantId, deviceId);
          Toast.show(`Retire command sent to ${name}`, 'warning');
          break;
        case 'wipe':
          if (!confirm(`WIPE ${name}? This will factory reset the device. This cannot be undone!`)) return;
          await Graph.wipeDevice(tenantId, deviceId);
          Toast.show(`Wipe command sent to ${name}`, 'warning');
          break;
        case 'rename':
          const newName = prompt(`Rename device (current: ${name}):`, name);
          if (!newName || newName === name) return;
          await Graph.renameDevice(tenantId, deviceId, newName);
          Toast.show(`Device renamed to ${newName}`, 'success');
          break;
        case 'bitlocker':
          const keys = await Graph.getBitLockerKeys(tenantId, deviceId);
          if (keys?.value?.length) {
            alert(`BitLocker Recovery Keys:\n\n${keys.value.map(k => k.id + ': ' + k.key).join('\n')}`);
          } else {
            Toast.show('No BitLocker keys found for this device', 'info');
          }
          break;
      }
    } catch (error) {
      Toast.show(error.message, 'error', 'Action Failed');
    }
  },

  async bulkAction(type) {
    const selected = AppState.get('selectedDevices');
    if (!selected.length) return;
    if (!confirm(`${type.charAt(0).toUpperCase() + type.slice(1)} ${selected.length} device(s)?`)) return;

    const allDevices = AppState.getDevicesForContext();
    let success = 0, fail = 0;

    for (const deviceId of selected) {
      const device = allDevices.find(d => d.id === deviceId);
      if (!device) continue;
      try {
        await this.action(type, device._tenantId, device.id);
        success++;
      } catch {
        fail++;
      }
    }

    AppState.set('selectedDevices', []);
    Toast.show(`${success} succeeded, ${fail} failed`, success > 0 ? 'success' : 'error', 'Bulk Action Complete');
    this.render();
  },

  // Filtering & sorting
  filterDevices(devices) {
    return devices.filter(d => {
      if (this.searchTerm) {
        const s = this.searchTerm.toLowerCase();
        const match = (d.deviceName || '').toLowerCase().includes(s) ||
          (d.userPrincipalName || '').toLowerCase().includes(s) ||
          (d.serialNumber || '').toLowerCase().includes(s) ||
          (d.model || '').toLowerCase().includes(s);
        if (!match) return false;
      }
      if (this.osFilter !== 'all' && (d.operatingSystem || '').toLowerCase() !== this.osFilter.toLowerCase()) return false;
      if (this.complianceFilter !== 'all' && d.complianceState !== this.complianceFilter) return false;
      return true;
    });
  },

  sortDevices(devices) {
    return [...devices].sort((a, b) => {
      let va = a[this.sortField] || '';
      let vb = b[this.sortField] || '';
      if (this.sortField === 'lastSyncDateTime') {
        va = new Date(va || 0).getTime();
        vb = new Date(vb || 0).getTime();
      }
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      if (va < vb) return this.sortDir === 'asc' ? -1 : 1;
      if (va > vb) return this.sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  },

  search(term) { this.searchTerm = term; this.currentPage = 1; this.render(); },
  filterOS(val) { this.osFilter = val; this.currentPage = 1; this.render(); },
  filterCompliance(val) { this.complianceFilter = val; this.currentPage = 1; this.render(); },
  sort(field) {
    if (this.sortField === field) this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    else { this.sortField = field; this.sortDir = 'asc'; }
    this.render();
  },
  goPage(n) { this.currentPage = Math.max(1, n); this.render(); },

  toggleSelect(id, checked) {
    const sel = [...AppState.get('selectedDevices')];
    if (checked && !sel.includes(id)) sel.push(id);
    if (!checked) { const idx = sel.indexOf(id); if (idx >= 0) sel.splice(idx, 1); }
    AppState.set('selectedDevices', sel);
    this.render();
  },

  selectAll(checked) {
    const allDevices = AppState.getDevicesForContext();
    const filtered = this.filterDevices(allDevices);
    const sorted = this.sortDevices(filtered);
    const paged = sorted.slice((this.currentPage - 1) * this.pageSize, this.currentPage * this.pageSize);
    AppState.set('selectedDevices', checked ? paged.map(d => d.id) : []);
    this.render();
  },

  // Export CSV
  exportCSV() {
    const allDevices = AppState.getDevicesForContext();
    const filtered = this.filterDevices(allDevices);
    const headers = ['Device Name','Tenant','OS','OS Version','Compliance','User','Serial','Last Sync','Encrypted'];
    const rows = filtered.map(d => [
      d.deviceName, AppState.getTenantName(d._tenantId), d.operatingSystem, d.osVersion,
      d.complianceState, d.userPrincipalName, d.serialNumber,
      d.lastSyncDateTime, d.isEncrypted ? 'Yes' : 'No'
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${(c||'').toString().replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `devices-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click(); URL.revokeObjectURL(url);
    Toast.show('Device list exported', 'success');
  },

  // Helpers
  getOSIcon(os) {
    const osLower = (os || '').toLowerCase();
    if (osLower.includes('windows')) return '<svg width="16" height="16" viewBox="0 0 24 24" fill="var(--primary)"><path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801"/></svg>';
    if (osLower.includes('macos') || osLower.includes('mac os')) return '<svg width="16" height="16" viewBox="0 0 24 24" fill="#555"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>';
    if (osLower.includes('ios')) return '<svg width="16" height="16" viewBox="0 0 24 24" fill="#555"><rect x="5" y="1" width="14" height="22" rx="3" stroke="#555" fill="none" stroke-width="1.5"/><circle cx="12" cy="19" r="1" fill="#555"/></svg>';
    if (osLower.includes('android')) return '<svg width="16" height="16" viewBox="0 0 24 24" fill="#3DDC84"><path d="M6 18c0 .55.45 1 1 1h1v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h2v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h1c.55 0 1-.45 1-1V8H6v10zM3.5 8C2.67 8 2 8.67 2 9.5v7c0 .83.67 1.5 1.5 1.5S5 17.33 5 16.5v-7C5 8.67 4.33 8 3.5 8zm17 0c-.83 0-1.5.67-1.5 1.5v7c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5v-7c0-.83-.67-1.5-1.5-1.5zm-4.97-5.84l1.3-1.3c.2-.2.2-.51 0-.71-.2-.2-.51-.2-.71 0l-1.48 1.48A5.84 5.84 0 0012 1c-.96 0-1.86.23-2.66.63L7.85.15c-.2-.2-.51-.2-.71 0-.2.2-.2.51 0 .71l1.31 1.31A5.983 5.983 0 006 7h12c0-1.99-.97-3.75-2.47-4.84zM10 5H9V4h1v1zm5 0h-1V4h1v1z"/></svg>';
    return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ink-tertiary)" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>';
  },

  getComplianceBadge(state) {
    switch (state) {
      case 'compliant': return '<span class="status-badge compliant">Compliant</span>';
      case 'noncompliant': return '<span class="status-badge non-compliant">Non-Compliant</span>';
      case 'inGracePeriod': return '<span class="status-badge pending">Grace Period</span>';
      default: return '<span class="status-badge inactive">Unknown</span>';
    }
  },

  formatDate(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d)) return '-';
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' +
           d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  },

  sortIcon(field) {
    if (this.sortField !== field) return '';
    return this.sortDir === 'asc' ? ' &#9650;' : ' &#9660;';
  },

  renderPagination(total) {
    let html = '';
    const cur = this.currentPage;
    const pages = [];
    if (total <= 7) {
      for (let i = 1; i <= total; i++) pages.push(i);
    } else {
      pages.push(1);
      if (cur > 3) pages.push('...');
      for (let i = Math.max(2, cur-1); i <= Math.min(total-1, cur+1); i++) pages.push(i);
      if (cur < total-2) pages.push('...');
      pages.push(total);
    }
    for (const p of pages) {
      if (p === '...') { html += '<span style="padding:0 4px;">...</span>'; continue; }
      html += `<button class="table-pagination-btn ${p===cur?'active':''}" onclick="Devices.goPage(${p})">${p}</button>`;
    }
    return html;
  }
};
