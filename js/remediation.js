/* ============================================================
   Remediation — Automated compliance remediation actions
   ============================================================ */

const Remediation = {

  render() {
    const main = document.getElementById('mainContent');
    const allDevices = AppState.getDevicesForContext();
    const nonCompliant = allDevices.filter(d => d.complianceState === 'noncompliant');
    const stale = allDevices.filter(d => {
      if (!d.lastSyncDateTime) return true;
      return (Date.now() - new Date(d.lastSyncDateTime).getTime()) > 7 * 86400000;
    });
    const unencrypted = allDevices.filter(d => !d.isEncrypted);

    main.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h1 class="page-title">Compliance Remediation</h1>
          <p class="page-subtitle">Identify and fix non-compliant devices with one-click actions</p>
        </div>
      </div>

      <!-- Summary Cards -->
      <div class="grid grid-3 gap-4 mb-6">
        <div class="card">
          <div class="card-body" style="text-align:center;padding:20px;">
            <div style="font-size:32px;font-weight:700;color:var(--danger);">${nonCompliant.length}</div>
            <div class="text-sm fw-500">Non-Compliant Devices</div>
            <div class="text-xs text-muted">Require policy remediation</div>
          </div>
        </div>
        <div class="card">
          <div class="card-body" style="text-align:center;padding:20px;">
            <div style="font-size:32px;font-weight:700;color:var(--warning);">${stale.length}</div>
            <div class="text-sm fw-500">Stale Devices</div>
            <div class="text-xs text-muted">Not synced in 7+ days</div>
          </div>
        </div>
        <div class="card">
          <div class="card-body" style="text-align:center;padding:20px;">
            <div style="font-size:32px;font-weight:700;color:var(--warning);">${unencrypted.length}</div>
            <div class="text-sm fw-500">Unencrypted Devices</div>
            <div class="text-xs text-muted">Missing disk encryption</div>
          </div>
        </div>
      </div>

      <!-- Non-Compliant Devices -->
      <div class="card mb-6">
        <div class="card-header">
          <div class="card-header-title">Non-Compliant Devices (${nonCompliant.length})</div>
          ${nonCompliant.length > 0 ? `
            <button class="btn btn-primary btn-sm" onclick="Remediation._bulkSync(${JSON.stringify(nonCompliant.map(d => ({id: d.id, tid: d._tenantId})))})">
              Sync All Non-Compliant
            </button>
          ` : ''}
        </div>
        <div class="card-body" style="padding:0;">
          ${nonCompliant.length === 0 ? '<div class="text-sm text-muted p-4">All devices are compliant!</div>' : `
            <div class="table-wrapper">
              <table class="table">
                <thead><tr><th>Device</th><th>OS</th><th>User</th><th>Last Sync</th><th>Tenant</th><th>Actions</th></tr></thead>
                <tbody>
                  ${nonCompliant.slice(0, 50).map(d => `
                    <tr>
                      <td class="fw-500">${d.deviceName || '-'}</td>
                      <td class="text-sm">${d.operatingSystem || ''} ${d.osVersion || ''}</td>
                      <td class="text-sm">${d.userPrincipalName || '-'}</td>
                      <td class="text-sm">${d.lastSyncDateTime ? new Date(d.lastSyncDateTime).toLocaleString() : 'Never'}</td>
                      <td class="text-sm">${AppState.getTenantName(d._tenantId)}</td>
                      <td>
                        <div class="flex gap-1">
                          <button class="btn btn-ghost btn-sm" onclick="Remediation._syncDevice('${d._tenantId}','${d.id}','${(d.deviceName||'').replace(/'/g,'')}')">Sync</button>
                          <button class="btn btn-ghost btn-sm" onclick="Remediation._restartDevice('${d._tenantId}','${d.id}','${(d.deviceName||'').replace(/'/g,'')}')">Restart</button>
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

      <!-- Stale Devices -->
      <div class="card mb-6">
        <div class="card-header">
          <div class="card-header-title">Stale Devices — 7+ Days Since Sync (${stale.length})</div>
          ${stale.length > 0 ? `
            <button class="btn btn-secondary btn-sm" onclick="Remediation._bulkSync(${JSON.stringify(stale.map(d => ({id: d.id, tid: d._tenantId})))})">
              Force Sync All
            </button>
          ` : ''}
        </div>
        <div class="card-body" style="padding:0;">
          ${stale.length === 0 ? '<div class="text-sm text-muted p-4">All devices synced recently.</div>' : `
            <div class="table-wrapper">
              <table class="table">
                <thead><tr><th>Device</th><th>OS</th><th>Last Sync</th><th>Days Stale</th><th>Tenant</th><th>Actions</th></tr></thead>
                <tbody>
                  ${stale.slice(0, 50).map(d => {
                    const days = d.lastSyncDateTime ? Math.floor((Date.now() - new Date(d.lastSyncDateTime).getTime()) / 86400000) : '?';
                    return `
                    <tr>
                      <td class="fw-500">${d.deviceName || '-'}</td>
                      <td class="text-sm">${d.operatingSystem || ''}</td>
                      <td class="text-sm">${d.lastSyncDateTime ? new Date(d.lastSyncDateTime).toLocaleString() : 'Never'}</td>
                      <td><span class="badge badge-${days > 30 ? 'danger' : 'warning'}">${days}d</span></td>
                      <td class="text-sm">${AppState.getTenantName(d._tenantId)}</td>
                      <td>
                        <button class="btn btn-ghost btn-sm" onclick="Remediation._syncDevice('${d._tenantId}','${d.id}','${(d.deviceName||'').replace(/'/g,'')}')">Sync</button>
                      </td>
                    </tr>
                  `}).join('')}
                </tbody>
              </table>
            </div>
          `}
        </div>
      </div>

      <!-- Unencrypted Devices -->
      <div class="card">
        <div class="card-header">
          <div class="card-header-title">Unencrypted Devices (${unencrypted.length})</div>
        </div>
        <div class="card-body" style="padding:0;">
          ${unencrypted.length === 0 ? '<div class="text-sm text-muted p-4">All devices are encrypted.</div>' : `
            <div class="table-wrapper">
              <table class="table">
                <thead><tr><th>Device</th><th>OS</th><th>User</th><th>Compliance</th><th>Tenant</th><th>Actions</th></tr></thead>
                <tbody>
                  ${unencrypted.slice(0, 50).map(d => `
                    <tr>
                      <td class="fw-500">${d.deviceName || '-'}</td>
                      <td class="text-sm">${d.operatingSystem || ''}</td>
                      <td class="text-sm">${d.userPrincipalName || '-'}</td>
                      <td><span class="badge badge-${d.complianceState === 'compliant' ? 'success' : 'danger'}">${d.complianceState || 'unknown'}</span></td>
                      <td class="text-sm">${AppState.getTenantName(d._tenantId)}</td>
                      <td>
                        <button class="btn btn-ghost btn-sm" onclick="Remediation._rotateBitlocker('${d._tenantId}','${d.id}','${(d.deviceName||'').replace(/'/g,'')}')">Rotate Keys</button>
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

  async _syncDevice(tenantId, deviceId, name) {
    try {
      Toast.show(`Syncing ${name}...`, 'info');
      await Graph.syncDevice(tenantId, deviceId);
      Toast.show(`Sync initiated for ${name}`, 'success');
      if (typeof AuditLog !== 'undefined') AuditLog.log('remediation_sync', `Force synced device: ${name}`);
    } catch (e) {
      Toast.show(`Failed to sync ${name}: ${e.message}`, 'error');
    }
  },

  async _restartDevice(tenantId, deviceId, name) {
    if (!confirm(`Restart device "${name}"? The user may lose unsaved work.`)) return;
    try {
      Toast.show(`Restarting ${name}...`, 'info');
      await Graph.restartDevice(tenantId, deviceId);
      Toast.show(`Restart initiated for ${name}`, 'success');
      if (typeof AuditLog !== 'undefined') AuditLog.log('remediation_restart', `Restarted device: ${name}`);
    } catch (e) {
      Toast.show(`Failed to restart ${name}: ${e.message}`, 'error');
    }
  },

  async _rotateBitlocker(tenantId, deviceId, name) {
    try {
      Toast.show(`Rotating BitLocker keys for ${name}...`, 'info');
      await Graph.rotateBitLockerKeys(tenantId, deviceId);
      Toast.show(`BitLocker key rotation initiated for ${name}`, 'success');
      if (typeof AuditLog !== 'undefined') AuditLog.log('remediation_bitlocker', `Rotated BitLocker keys: ${name}`);
    } catch (e) {
      Toast.show(`Failed: ${e.message}`, 'error');
    }
  },

  async _bulkSync(deviceList) {
    if (!confirm(`Sync ${deviceList.length} device(s)? This will trigger a policy check-in on each.`)) return;
    Toast.show(`Syncing ${deviceList.length} devices...`, 'info');
    let ok = 0, fail = 0;
    for (const d of deviceList) {
      try {
        await Graph.syncDevice(d.tid, d.id);
        ok++;
      } catch { fail++; }
    }
    Toast.show(`Sync complete: ${ok} success, ${fail} failed`, ok === deviceList.length ? 'success' : 'warning');
    if (typeof AuditLog !== 'undefined') AuditLog.log('remediation_bulk_sync', `Bulk synced ${ok}/${deviceList.length} devices`);
  }
};
