/* ============================================================
   SyncDashboard — Intune device sync health overview
   ============================================================ */

const SyncDashboard = {
  render() {
    const main = document.getElementById('mainContent');
    const devices = AppState.getForContext('devices');
    const isAll = AppState.get('activeTenant') === 'all';
    const now = Date.now();

    // Categorize by sync freshness
    const fresh = devices.filter(d => this._hoursSince(d.lastSyncDateTime) < 24);
    const stale = devices.filter(d => this._hoursSince(d.lastSyncDateTime) >= 24 && this._hoursSince(d.lastSyncDateTime) < 168);
    const critical = devices.filter(d => this._hoursSince(d.lastSyncDateTime) >= 168);
    const never = devices.filter(d => !d.lastSyncDateTime);

    // Per-tenant breakdown
    const tenantSync = {};
    devices.forEach(d => {
      const tid = d._tenantId;
      if (!tenantSync[tid]) tenantSync[tid] = { total: 0, fresh: 0, stale: 0, critical: 0, oldest: null };
      tenantSync[tid].total++;
      const hrs = this._hoursSince(d.lastSyncDateTime);
      if (hrs < 24) tenantSync[tid].fresh++;
      else if (hrs < 168) tenantSync[tid].stale++;
      else tenantSync[tid].critical++;
      if (!tenantSync[tid].oldest || hrs > this._hoursSince(tenantSync[tid].oldest)) {
        tenantSync[tid].oldest = d.lastSyncDateTime;
      }
    });

    main.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h1 class="page-title">Device Sync Health</h1>
          <p class="page-subtitle">${devices.length} devices ${isAll ? 'across all tenants' : ''}</p>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-primary btn-sm" onclick="SyncDashboard.syncAll()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>
            Sync All Devices
          </button>
        </div>
      </div>

      <!-- Health KPIs -->
      <div class="grid grid-4 gap-4 mb-6">
        <div class="stat-card">
          <div class="stat-card-icon green"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></div>
          <div class="stat-card-value text-success">${fresh.length}</div>
          <div class="stat-card-label">Synced &lt; 24h</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-icon orange"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></div>
          <div class="stat-card-value" style="color:var(--warning);">${stale.length}</div>
          <div class="stat-card-label">Stale (1-7 days)</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-icon red"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg></div>
          <div class="stat-card-value text-danger">${critical.length}</div>
          <div class="stat-card-label">Critical (&gt; 7 days)</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-value">${devices.length > 0 ? Math.round((fresh.length / devices.length) * 100) : 0}%</div>
          <div class="stat-card-label">Sync Health Score</div>
          <div style="margin-top:6px;height:4px;background:var(--gray-100);border-radius:2px;overflow:hidden;">
            <div style="height:100%;width:${devices.length > 0 ? (fresh.length / devices.length) * 100 : 0}%;background:${fresh.length / devices.length > 0.8 ? 'var(--success)' : fresh.length / devices.length > 0.5 ? 'var(--warning)' : 'var(--danger)'};border-radius:2px;"></div>
          </div>
        </div>
      </div>

      ${isAll && Object.keys(tenantSync).length > 1 ? `
        <!-- Per-Tenant Sync Health -->
        <div class="card mb-4">
          <div class="card-header"><h3 class="card-header-title">Tenant Sync Health</h3></div>
          <div class="card-body" style="padding:0;">
            <table class="table">
              <thead><tr><th>Tenant</th><th>Devices</th><th>Fresh</th><th>Stale</th><th>Critical</th><th>Health</th><th>Oldest Sync</th></tr></thead>
              <tbody>
                ${Object.entries(tenantSync).map(([tid, s]) => {
                  const pct = s.total > 0 ? Math.round((s.fresh / s.total) * 100) : 0;
                  return `<tr>
                    <td class="fw-500">${AppState.getTenantName(tid)}</td>
                    <td>${s.total}</td>
                    <td class="text-success">${s.fresh}</td>
                    <td style="color:var(--warning);">${s.stale}</td>
                    <td class="text-danger">${s.critical}</td>
                    <td>
                      <div style="display:flex;align-items:center;gap:8px;">
                        <div style="flex:1;height:4px;background:var(--gray-100);border-radius:2px;overflow:hidden;">
                          <div style="height:100%;width:${pct}%;background:${pct > 80 ? 'var(--success)' : pct > 50 ? 'var(--warning)' : 'var(--danger)'};border-radius:2px;"></div>
                        </div>
                        <span class="text-xs fw-500">${pct}%</span>
                      </div>
                    </td>
                    <td class="text-sm text-muted">${s.oldest ? this._timeAgo(s.oldest) : 'N/A'}</td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      ` : ''}

      <!-- Critical Devices List -->
      ${critical.length > 0 ? `
        <div class="card">
          <div class="card-header">
            <h3 class="card-header-title text-danger">Critical Devices (7+ days since sync)</h3>
            <button class="btn btn-ghost btn-sm" onclick="SyncDashboard.syncCritical()">Sync All Critical</button>
          </div>
          <div class="card-body" style="padding:0;max-height:400px;overflow-y:auto;">
            <table class="table">
              <thead><tr><th>Device</th>${isAll ? '<th>Tenant</th>' : ''}<th>OS</th><th>User</th><th>Last Sync</th><th>Action</th></tr></thead>
              <tbody>
                ${critical.slice(0, 50).map(d => `<tr>
                  <td class="fw-500">${d.deviceName || 'Unknown'}</td>
                  ${isAll ? `<td><span class="chip">${AppState.getTenantName(d._tenantId)}</span></td>` : ''}
                  <td class="text-sm">${d.operatingSystem || '-'}</td>
                  <td class="text-sm text-muted">${d.userPrincipalName || '-'}</td>
                  <td class="text-sm text-danger">${d.lastSyncDateTime ? this._timeAgo(d.lastSyncDateTime) : 'Never'}</td>
                  <td><button class="btn btn-ghost btn-xs" onclick="SyncDashboard.syncDevice('${d._tenantId}','${d.id}','${(d.deviceName||'').replace(/'/g,"\\'")}')">Sync</button></td>
                </tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>
      ` : `
        <div class="card"><div class="empty-state" style="padding:3rem;">
          <div class="empty-state-icon" style="color:var(--success);"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></div>
          <h3 class="empty-state-title">All Devices Healthy</h3>
          <p class="empty-state-text">No devices have gone more than 7 days without syncing.</p>
        </div></div>
      `}
    `;
  },

  _hoursSince(dateStr) {
    if (!dateStr) return Infinity;
    return (Date.now() - new Date(dateStr).getTime()) / 3600000;
  },

  _timeAgo(dateStr) {
    const hrs = this._hoursSince(dateStr);
    if (hrs < 1) return 'Just now';
    if (hrs < 24) return `${Math.floor(hrs)}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days}d ago`;
    return `${Math.floor(days / 30)}mo ago`;
  },

  async syncDevice(tenantId, deviceId, name) {
    try {
      await Graph.syncDevice(tenantId, deviceId);
      Toast.show(`Sync initiated for ${name}`, 'success');
      AuditLog.log('Sync Device', `Synced ${name}`, AppState.getTenantName(tenantId));
    } catch (err) {
      Toast.show(`Failed to sync ${name}: ${err.message}`, 'error');
    }
  },

  async syncAll() {
    const devices = AppState.getForContext('devices');
    if (!await Confirm.show({ title: 'Sync All Devices', message: `Send sync command to all ${devices.length} devices?`, confirmText: 'Sync All', type: 'info' })) return;
    Toast.show(`Syncing ${devices.length} devices...`, 'info');
    let success = 0, fail = 0;
    for (const d of devices) {
      try { await Graph.syncDevice(d._tenantId, d.id); success++; } catch { fail++; }
    }
    Toast.show(`Sync complete: ${success} succeeded, ${fail} failed`, success > 0 ? 'success' : 'error');
    AuditLog.log('Bulk Sync', `Synced ${success}/${devices.length} devices`);
  },

  async syncCritical() {
    const devices = AppState.getForContext('devices').filter(d => this._hoursSince(d.lastSyncDateTime) >= 168);
    if (!await Confirm.show({ title: 'Sync Critical Devices', message: `Send sync command to ${devices.length} critical devices?`, confirmText: 'Sync Critical', type: 'warning' })) return;
    Toast.show(`Syncing ${devices.length} critical devices...`, 'info');
    let success = 0;
    for (const d of devices) {
      try { await Graph.syncDevice(d._tenantId, d.id); success++; } catch {}
    }
    Toast.show(`Sync complete: ${success}/${devices.length} succeeded`, 'success');
    AuditLog.log('Sync Critical Devices', `Synced ${success}/${devices.length} critical devices`);
  }
};
