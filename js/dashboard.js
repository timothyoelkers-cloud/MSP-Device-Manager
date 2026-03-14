/* ============================================================
   Dashboard — Main dashboard with cross-tenant overview
   Enhanced with activity timeline, health scores, quick actions,
   stale device warnings, and richer visualizations.
   ============================================================ */

const Dashboard = {

  /* ---- Helpers ---- */

  _relativeTime(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d)) return '';
    const now = new Date();
    const diffMs = now - d;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr  = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);
    if (diffMin < 1) return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    if (diffDay < 30) return `${diffDay}d ago`;
    return `${Math.floor(diffDay / 30)}mo ago`;
  },

  _daysSince(dateStr) {
    if (!dateStr) return Infinity;
    const d = new Date(dateStr);
    if (isNaN(d)) return Infinity;
    return (Date.now() - d.getTime()) / 86400000;
  },

  _pct(num, den) {
    return den > 0 ? Math.round((num / den) * 100) : 0;
  },

  /* Mini sparkline SVG — 7 tiny bars representing a trend */
  _sparkline(values, color) {
    if (!values || values.length === 0) return '';
    const max = Math.max(...values, 1);
    const w = 48, h = 20, barW = 5, gap = 2;
    const bars = values.slice(-7).map((v, i) => {
      const bh = Math.max(2, (v / max) * h);
      return `<rect x="${i * (barW + gap)}" y="${h - bh}" width="${barW}" height="${bh}" rx="1" fill="${color}" opacity="${0.4 + 0.6 * (i / 6)}"/>`;
    }).join('');
    return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="display:block;">${bars}</svg>`;
  },

  /* Build a simple 7-slot distribution from dates (last 7 days bucketed) */
  _buildTrendBuckets(devices, dateField) {
    const buckets = [0,0,0,0,0,0,0];
    const now = Date.now();
    devices.forEach(d => {
      const val = d[dateField];
      if (!val) return;
      const age = (now - new Date(val).getTime()) / 86400000;
      if (age < 7) {
        const idx = 6 - Math.min(6, Math.floor(age));
        buckets[idx]++;
      }
    });
    return buckets;
  },

  /* ---- Export CSV of all devices ---- */
  _exportFullReport(allDevices) {
    if (allDevices.length === 0) {
      Toast.show('No devices to export', 'warning');
      return;
    }
    const headers = ['Device Name','OS','OS Version','Compliance','Encrypted','User','Tenant','Last Sync','Enrolled','Total Storage (GB)','Free Storage (GB)'];
    const rows = allDevices.map(d => [
      d.deviceName || '',
      d.operatingSystem || '',
      d.osVersion || '',
      d.complianceState || '',
      d.isEncrypted ? 'Yes' : 'No',
      d.userPrincipalName || '',
      AppState.getTenantName(d._tenantId),
      d.lastSyncDateTime || '',
      d.enrolledDateTime || '',
      d.totalStorageSpaceInBytes ? Math.round(d.totalStorageSpaceInBytes / 1073741824) : '',
      d.freeStorageSpaceInBytes ? Math.round(d.freeStorageSpaceInBytes / 1073741824) : ''
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `device-report-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    Toast.show('Report exported successfully', 'success');
  },

  /* ---- Sync all devices for current context ---- */
  async _syncAllDevices() {
    const tenants = AppState.get('tenants');
    const active = AppState.get('activeTenant');
    const targets = active ? [tenants.find(t => t.id === active)].filter(Boolean) : tenants;
    if (targets.length === 0) { Toast.show('No tenants connected', 'warning'); return; }
    Toast.show(`Syncing devices across ${targets.length} tenant(s)...`, 'info');
    for (const t of targets) {
      const devices = AppState.get('devices')[t.id] || [];
      for (const d of devices) {
        try { await Graph.syncDevice(t.id, d.id); } catch(_) { /* best effort */ }
      }
    }
    Toast.show('Sync requests sent to all devices', 'success');
  },

  /* ---- Build activity timeline events ---- */
  _buildActivityEvents(allDevices) {
    const now = Date.now();
    const sevenDays = 7 * 86400000;
    const events = [];

    allDevices.forEach(d => {
      const tenantName = AppState.getTenantName(d._tenantId);
      // Recently enrolled
      if (d.enrolledDateTime) {
        const age = now - new Date(d.enrolledDateTime).getTime();
        if (age < sevenDays && age > 0) {
          events.push({
            date: new Date(d.enrolledDateTime),
            icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--success)" stroke-width="2"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>`,
            desc: `<span class="fw-500">${d.deviceName || 'Unknown'}</span> enrolled`,
            tenant: tenantName,
            tenantId: d._tenantId,
            type: 'enrolled'
          });
        }
      }
      // Non-compliant
      if (d.complianceState === 'noncompliant') {
        const syncDate = d.lastSyncDateTime ? new Date(d.lastSyncDateTime) : new Date();
        events.push({
          date: syncDate,
          icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
          desc: `<span class="fw-500">${d.deviceName || 'Unknown'}</span> non-compliant`,
          tenant: tenantName,
          tenantId: d._tenantId,
          type: 'noncompliant'
        });
      }
      // Low storage
      if (d.totalStorageSpaceInBytes && d.freeStorageSpaceInBytes) {
        const freePct = (d.freeStorageSpaceInBytes / d.totalStorageSpaceInBytes) * 100;
        if (freePct < 10) {
          events.push({
            date: d.lastSyncDateTime ? new Date(d.lastSyncDateTime) : new Date(),
            icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--warning)" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
            desc: `<span class="fw-500">${d.deviceName || 'Unknown'}</span> low storage (${Math.round(freePct)}% free)`,
            tenant: tenantName,
            tenantId: d._tenantId,
            type: 'lowstorage'
          });
        }
      }
      // Stale
      if (d.lastSyncDateTime) {
        const age = now - new Date(d.lastSyncDateTime).getTime();
        if (age > sevenDays) {
          events.push({
            date: new Date(d.lastSyncDateTime),
            icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ink-tertiary)" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
            desc: `<span class="fw-500">${d.deviceName || 'Unknown'}</span> stale (${Math.floor(age / 86400000)}d since sync)`,
            tenant: tenantName,
            tenantId: d._tenantId,
            type: 'stale'
          });
        }
      }
    });

    events.sort((a, b) => b.date - a.date);
    return events.slice(0, 10);
  },

  /* ---- Health score per tenant ---- */
  _calcHealthScore(tDevices) {
    const total = tDevices.length;
    if (total === 0) return { score: 0, compliancePct: 0, syncPct: 0, encryptPct: 0 };

    const compliant = tDevices.filter(d => d.complianceState === 'compliant').length;
    const now = Date.now();
    const freshSync = tDevices.filter(d => d.lastSyncDateTime && (now - new Date(d.lastSyncDateTime).getTime()) < 7 * 86400000).length;
    const encrypted = tDevices.filter(d => d.isEncrypted).length;

    const compliancePct = (compliant / total) * 100;
    const syncPct = (freshSync / total) * 100;
    const encryptPct = (encrypted / total) * 100;

    const score = Math.round(compliancePct * 0.4 + syncPct * 0.3 + encryptPct * 0.3);
    return { score, compliancePct: Math.round(compliancePct), syncPct: Math.round(syncPct), encryptPct: Math.round(encryptPct) };
  },

  _healthColor(score) {
    if (score >= 80) return 'var(--success)';
    if (score >= 50) return 'var(--warning)';
    return 'var(--danger)';
  },

  _healthClass(score) {
    if (score >= 80) return '';
    if (score >= 50) return 'warning';
    return 'critical';
  },

  /* ============================================================
     Main render
     ============================================================ */
  render() {
    const main = document.getElementById('mainContent');
    const tenants = AppState.get('tenants');
    const isAuth = AppState.get('isAuthenticated');
    const allDevices = AppState.getDevicesForContext();
    const tier = AppState.get('licenseTier');

    // ---- Aggregate stats ----
    const total = allDevices.length;
    const compliant = allDevices.filter(d => d.complianceState === 'compliant').length;
    const nonCompliant = allDevices.filter(d => d.complianceState === 'noncompliant').length;
    const unknown = total - compliant - nonCompliant;
    const compPct = this._pct(compliant, total);
    const nonCompPct = this._pct(nonCompliant, total);
    const unknownPct = this._pct(unknown, total);

    const now = Date.now();
    const sevenDays = 7 * 86400000;
    const staleDevices = allDevices.filter(d => d.lastSyncDateTime && (now - new Date(d.lastSyncDateTime).getTime()) > sevenDays);
    const staleCount = staleDevices.length;

    // OS counts
    const osGroups = {};
    allDevices.forEach(d => {
      const raw = (d.operatingSystem || 'Other').toLowerCase();
      let label = 'Other';
      if (raw.includes('windows')) label = 'Windows';
      else if (raw.includes('macos')) label = 'macOS';
      else if (raw.includes('ios')) label = 'iOS';
      else if (raw.includes('android')) label = 'Android';
      else if (raw.includes('linux')) label = 'Linux';
      osGroups[label] = (osGroups[label] || 0) + 1;
    });

    // Sparkline data
    const enrollTrend = this._buildTrendBuckets(allDevices, 'enrolledDateTime');
    const syncTrend = this._buildTrendBuckets(allDevices, 'lastSyncDateTime');

    // Activity events
    const activityEvents = this._buildActivityEvents(allDevices);

    // Stale top 5
    const staleTop5 = staleDevices
      .sort((a, b) => new Date(a.lastSyncDateTime) - new Date(b.lastSyncDateTime))
      .slice(0, 5);

    // OS bar colors
    const osColors = {
      'Windows': 'var(--primary)',
      'macOS': 'var(--gray-600)',
      'iOS': 'var(--secondary)',
      'Android': 'var(--success)',
      'Linux': 'var(--warning)',
      'Other': 'var(--gray-400)'
    };

    const osEntries = Object.entries(osGroups).sort((a, b) => b[1] - a[1]);

    main.innerHTML = `
      <!-- Sponsor Banner (free tier only) -->
      ${Sponsor.renderDashboardBanner()}

      <div class="page-header">
        <div class="page-header-left">
          <h1 class="page-title">Dashboard</h1>
          <p class="page-subtitle">
            ${tenants.length > 0 ?
              `Monitoring ${total} devices across ${tenants.length} tenant${tenants.length !== 1 ? 's' : ''}` :
              'Connect your first tenant to get started'
            }
          </p>
        </div>
        <div class="page-header-actions">
          ${tenants.length > 0 ? `
            <button class="btn btn-secondary" onclick="Tenants.refreshAll()">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg>
              Refresh Data
            </button>
          ` : ''}
          <button class="btn btn-primary" onclick="Auth.showConnectModal()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            ${tenants.length > 0 ? 'Add Tenant' : 'Connect Tenant'}
          </button>
        </div>
      </div>

      <!-- ======== KPI Cards (5 cards) ======== -->
      <div class="grid grid-5 gap-4 mb-4 stagger">
        <!-- Total Devices -->
        <div class="stat-card animate-fade-up">
          <div class="flex items-center justify-between mb-3">
            <div class="stat-card-icon blue">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
            </div>
            ${total > 0 ? `<div data-tooltip="Enrollments last 7 days">${this._sparkline(enrollTrend, 'var(--primary)')}</div>` : ''}
          </div>
          <div class="stat-card-value">${total}</div>
          <div class="stat-card-label">Total Devices</div>
        </div>

        <!-- Compliant -->
        <div class="stat-card animate-fade-up">
          <div class="flex items-center justify-between mb-3">
            <div class="stat-card-icon green">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            </div>
            ${compliant > 0 ? `<div data-tooltip="Sync activity last 7 days">${this._sparkline(syncTrend, 'var(--success)')}</div>` : ''}
          </div>
          <div class="stat-card-value">${compliant}</div>
          <div class="stat-card-label">Compliant</div>
          ${total > 0 ? `<div class="stat-card-trend up">&#9650; ${compPct}%</div>` : ''}
        </div>

        <!-- Non-Compliant -->
        <div class="stat-card animate-fade-up">
          <div class="flex items-center justify-between mb-3">
            <div class="stat-card-icon red">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
            </div>
          </div>
          <div class="stat-card-value">${nonCompliant}</div>
          <div class="stat-card-label">Non-Compliant</div>
          ${nonCompliant > 0 ? `<div class="stat-card-trend down">Needs attention</div>` : ''}
        </div>

        <!-- Connected Tenants -->
        <div class="stat-card animate-fade-up">
          <div class="flex items-center justify-between mb-3">
            <div class="stat-card-icon teal">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>
            </div>
          </div>
          <div class="stat-card-value">${tenants.length}</div>
          <div class="stat-card-label">Connected Tenants</div>
        </div>

        <!-- Stale Devices -->
        <div class="stat-card animate-fade-up" ${staleCount > 0 ? 'style="border-color: var(--warning-pale);"' : ''}>
          <div class="flex items-center justify-between mb-3">
            <div class="stat-card-icon orange">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            </div>
          </div>
          <div class="stat-card-value">${staleCount}</div>
          <div class="stat-card-label">Stale Devices</div>
          ${staleCount > 0 ? `<div class="stat-card-trend down">7+ days silent</div>` : `<div class="stat-card-trend up">All fresh</div>`}
        </div>
      </div>

      <!-- ======== Quick Actions Row ======== -->
      ${tenants.length > 0 ? `
        <div class="flex items-center gap-3 mb-6 flex-wrap animate-fade-up">
          <button class="btn btn-secondary" onclick="Dashboard._syncAllDevices()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg>
            Sync All Devices
          </button>
          <button class="btn btn-secondary" onclick="Dashboard._exportFullReport(AppState.getDevicesForContext())">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Export Full Report
          </button>
          <button class="btn btn-secondary" onclick="Devices.complianceFilter='noncompliant'; Router.navigate('devices');">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
            View Non-Compliant
          </button>
          <button class="btn btn-primary" onclick="Auth.showConnectModal()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Tenant
          </button>
        </div>
      ` : ''}

      <!-- ======== Stale Devices Warning Card ======== -->
      ${staleCount > 0 ? `
        <div class="card animate-fade-up mb-6" style="border-color: var(--warning-pale); background: var(--warning-bg);">
          <div class="card-header" style="border-bottom-color: var(--warning-pale);">
            <div class="flex items-center gap-3">
              <div class="stat-card-icon orange" style="width:32px; height:32px; margin-bottom:0;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              </div>
              <div>
                <div class="card-header-title">${staleCount} Stale Device${staleCount !== 1 ? 's' : ''} Detected</div>
                <div class="card-header-subtitle">These devices have not synced in over 7 days</div>
              </div>
            </div>
            <button class="btn btn-ghost btn-sm" onclick="Devices.complianceFilter='all'; Router.navigate('devices');">View All</button>
          </div>
          <div class="card-body" style="padding: var(--sp-3) var(--sp-5);">
            <div class="flex flex-col gap-2">
              ${staleTop5.map(d => `
                <div class="flex items-center justify-between py-2" style="border-bottom: 1px solid var(--warning-pale); cursor:pointer;" onclick="Devices.showDetail('${d._tenantId}','${d.id}')">
                  <div class="flex items-center gap-3">
                    <div class="table-device-icon" style="width:28px; height:28px;">${Devices.getOSIcon(d.operatingSystem)}</div>
                    <div>
                      <div class="text-sm fw-500">${d.deviceName || 'Unknown'}</div>
                      <div class="text-xs text-muted">${d.userPrincipalName || '-'}</div>
                    </div>
                  </div>
                  <div class="flex items-center gap-3">
                    <span class="chip">${AppState.getTenantName(d._tenantId)}</span>
                    <span class="text-xs text-muted">Last sync: ${this._relativeTime(d.lastSyncDateTime)}</span>
                  </div>
                </div>
              `).join('')}
            </div>
            ${staleCount > 5 ? `<div class="text-center mt-3"><button class="btn btn-ghost btn-sm" onclick="Devices.complianceFilter='all'; Router.navigate('devices');">+${staleCount - 5} more stale devices</button></div>` : ''}
          </div>
        </div>
      ` : ''}

      <div class="grid grid-2 gap-6 mb-6">
        <!-- ======== Compliance Donut with Legend ======== -->
        <div class="card animate-fade-up">
          <div class="card-header">
            <div class="card-header-title">Compliance Overview</div>
          </div>
          <div class="card-body">
            ${total === 0 ? `
              <div class="text-center text-muted py-3">No device data available</div>
            ` : `
              <div class="flex items-center gap-6 mb-4">
                <div style="position:relative; width:140px; height:140px; flex-shrink:0;">
                  ${(() => {
                    // SVG donut with three segments
                    const r = 15.5, circ = 2 * Math.PI * r;
                    const compLen = (compPct / 100) * circ;
                    const nonCompLen = (nonCompPct / 100) * circ;
                    const unknownLen = (unknownPct / 100) * circ;
                    const compOff = 0;
                    const nonCompOff = compLen;
                    const unknownOff = compLen + nonCompLen;
                    return `
                      <svg viewBox="0 0 36 36" style="width:140px; height:140px; transform: rotate(-90deg);">
                        <circle cx="18" cy="18" r="${r}" fill="none" stroke="var(--gray-100)" stroke-width="3"/>
                        <circle cx="18" cy="18" r="${r}" fill="none" stroke="var(--success)" stroke-width="3"
                          stroke-dasharray="${compLen} ${circ - compLen}" stroke-dashoffset="${-compOff}"
                          stroke-linecap="round" style="transition: stroke-dasharray 0.8s ease;"/>
                        ${nonCompPct > 0 ? `
                          <circle cx="18" cy="18" r="${r}" fill="none" stroke="var(--danger)" stroke-width="3"
                            stroke-dasharray="${nonCompLen} ${circ - nonCompLen}" stroke-dashoffset="${-nonCompOff}"
                            style="transition: stroke-dasharray 0.8s ease;"/>
                        ` : ''}
                        ${unknownPct > 0 ? `
                          <circle cx="18" cy="18" r="${r}" fill="none" stroke="var(--gray-300)" stroke-width="3"
                            stroke-dasharray="${unknownLen} ${circ - unknownLen}" stroke-dashoffset="${-unknownOff}"
                            style="transition: stroke-dasharray 0.8s ease;"/>
                        ` : ''}
                      </svg>
                    `;
                  })()}
                  <div style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center; flex-direction:column;">
                    <span class="text-2xl fw-700">${compPct}%</span>
                    <span class="text-xs text-muted">Compliant</span>
                  </div>
                </div>
                <div class="flex flex-col gap-3" style="flex:1;">
                  <div>
                    <div class="flex justify-between mb-1">
                      <span class="text-sm">Compliant</span>
                      <span class="text-sm fw-600" style="color:var(--success);">${compliant}</span>
                    </div>
                    <div class="progress-bar"><div class="progress-bar-fill green" style="width:${this._pct(compliant, total)}%"></div></div>
                  </div>
                  <div>
                    <div class="flex justify-between mb-1">
                      <span class="text-sm">Non-Compliant</span>
                      <span class="text-sm fw-600" style="color:var(--danger);">${nonCompliant}</span>
                    </div>
                    <div class="progress-bar"><div class="progress-bar-fill red" style="width:${this._pct(nonCompliant, total)}%"></div></div>
                  </div>
                  <div>
                    <div class="flex justify-between mb-1">
                      <span class="text-sm">Unknown</span>
                      <span class="text-sm fw-600" style="color:var(--ink-tertiary);">${unknown}</span>
                    </div>
                    <div class="progress-bar"><div class="progress-bar-fill" style="width:${this._pct(unknown, total)}%; background: var(--gray-300);"></div></div>
                  </div>
                </div>
              </div>
              <!-- Donut Legend -->
              <div class="flex items-center justify-center gap-5" style="border-top: 1px solid var(--border-light); padding-top: var(--sp-3);">
                <div class="flex items-center gap-2">
                  <span style="width:10px; height:10px; border-radius:50%; background:var(--success); display:inline-block;"></span>
                  <span class="text-xs">Compliant (${compPct}%)</span>
                </div>
                <div class="flex items-center gap-2">
                  <span style="width:10px; height:10px; border-radius:50%; background:var(--danger); display:inline-block;"></span>
                  <span class="text-xs">Non-Compliant (${nonCompPct}%)</span>
                </div>
                <div class="flex items-center gap-2">
                  <span style="width:10px; height:10px; border-radius:50%; background:var(--gray-300); display:inline-block;"></span>
                  <span class="text-xs">Unknown (${unknownPct}%)</span>
                </div>
              </div>
            `}
          </div>
        </div>

        <!-- ======== OS Distribution — Stacked Bar ======== -->
        <div class="card animate-fade-up">
          <div class="card-header">
            <div class="card-header-title">Device Platform Distribution</div>
          </div>
          <div class="card-body">
            ${total === 0 ? `
              <div class="text-center text-muted py-3">No device data available</div>
            ` : `
              <!-- Stacked horizontal bar -->
              <div style="height:32px; border-radius:var(--radius-full); overflow:hidden; display:flex; margin-bottom:var(--sp-4);">
                ${osEntries.map(([label, count]) => {
                  const pct = this._pct(count, total);
                  const color = osColors[label] || 'var(--gray-400)';
                  return pct > 0 ? `<div style="width:${pct}%; background:${color}; display:flex; align-items:center; justify-content:center; min-width:${pct > 5 ? '0' : '24px'}; transition: width 0.6s ease;" data-tooltip="${label}: ${count} (${pct}%)">
                    ${pct >= 8 ? `<span class="text-xs fw-600" style="color:#fff; text-shadow:0 1px 2px rgba(0,0,0,0.3);">${pct}%</span>` : ''}
                  </div>` : '';
                }).join('')}
              </div>
              <!-- Legend -->
              <div class="flex flex-wrap gap-4">
                ${osEntries.map(([label, count]) => {
                  const pct = this._pct(count, total);
                  const color = osColors[label] || 'var(--gray-400)';
                  return `
                    <div class="flex items-center gap-2">
                      <span style="width:10px; height:10px; border-radius:3px; background:${color}; display:inline-block;"></span>
                      <span class="text-sm fw-500">${label}</span>
                      <span class="text-xs text-muted">${count} (${pct}%)</span>
                    </div>
                  `;
                }).join('')}
              </div>
            `}
          </div>
        </div>
      </div>

      <!-- ======== Activity Timeline ======== -->
      ${activityEvents.length > 0 ? `
        <div class="card animate-fade-up mb-6">
          <div class="card-header">
            <div>
              <div class="card-header-title">Recent Activity</div>
              <div class="card-header-subtitle">Latest device events from your fleet</div>
            </div>
          </div>
          <div class="card-body" style="padding: 0;">
            <div class="flex flex-col">
              ${activityEvents.map((ev, i) => `
                <div class="flex items-center gap-3 px-4 py-3" style="border-bottom: 1px solid var(--border-light);${i === activityEvents.length - 1 ? ' border-bottom:none;' : ''}">
                  <div class="flex items-center justify-center" style="width:32px; height:32px; border-radius:var(--radius-sm); background:var(--gray-50); flex-shrink:0;">
                    ${ev.icon}
                  </div>
                  <div style="flex:1; min-width:0;">
                    <div class="text-sm">${ev.desc}</div>
                  </div>
                  <span class="chip">${ev.tenant}</span>
                  <span class="text-xs text-muted" style="flex-shrink:0; min-width:56px; text-align:right;">${this._relativeTime(ev.date)}</span>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      ` : ''}

      <!-- ======== Tenant Health Grid ======== -->
      ${tenants.length > 0 ? `
        <div class="card animate-fade-up mb-6">
          <div class="card-header">
            <div class="card-header-title">Tenant Health Overview</div>
            <button class="btn btn-ghost btn-sm" onclick="Router.navigate('tenants')">View All</button>
          </div>
          <div class="card-body">
            <div class="grid grid-auto gap-3 stagger">
              ${tenants.slice(0, 8).map((t, i) => {
                const tDevices = AppState.get('devices')[t.id] || [];
                const health = this._calcHealthScore(tDevices);
                const hColor = this._healthColor(health.score);
                const hClass = this._healthClass(health.score);
                return `
                  <div class="tenant-card ${hClass} animate-fade-up"
                       onclick="Tenants.selectTenant('${t.id}')" style="animation-delay: ${i * 50}ms; padding: 12px 16px;">
                    <div class="flex items-center justify-between mb-2">
                      <span class="fw-500 truncate" style="font-size: var(--text-sm);">${t.displayName}</span>
                      <span class="badge ${t.connectionType === 'gdap' ? 'badge-primary' : 'badge-default'}" style="font-size:10px;">${t.connectionType === 'gdap' ? 'GDAP' : 'Direct'}</span>
                    </div>
                    <div class="flex items-center gap-2 mb-2">
                      <span class="text-2xl fw-700" style="color:${hColor}; line-height:1;">${health.score}</span>
                      <span class="text-xs text-muted">health score</span>
                    </div>
                    <div class="progress-bar mb-2" style="height:4px;">
                      <div class="progress-bar-fill" style="width:${health.score}%; background:${hColor};"></div>
                    </div>
                    <div class="flex items-center justify-between">
                      <span class="text-xs text-muted">${tDevices.length} devices</span>
                      <div class="flex items-center gap-2">
                        <span class="text-xs" data-tooltip="Compliance ${health.compliancePct}%">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--success)" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
                          ${health.compliancePct}%
                        </span>
                        <span class="text-xs" data-tooltip="Sync freshness ${health.syncPct}%">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="3"><polyline points="1 4 1 10 7 10"/></svg>
                          ${health.syncPct}%
                        </span>
                        <span class="text-xs" data-tooltip="Encryption ${health.encryptPct}%">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--secondary)" stroke-width="3"><rect x="3" y="11" width="18" height="11" rx="2"/></svg>
                          ${health.encryptPct}%
                        </span>
                      </div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
            ${tenants.length > 8 ? `<div class="text-center mt-3"><button class="btn btn-ghost btn-sm" onclick="Router.navigate('tenants')">+${tenants.length - 8} more tenants</button></div>` : ''}
          </div>
        </div>
      ` : ''}

      <!-- ======== Non-Compliant Devices Table ======== -->
      ${nonCompliant > 0 ? `
        <div class="card animate-fade-up mb-6">
          <div class="card-header">
            <div>
              <div class="card-header-title">Non-Compliant Devices</div>
              <div class="card-header-subtitle">Devices requiring attention</div>
            </div>
            <button class="btn btn-ghost btn-sm" onclick="Devices.complianceFilter='noncompliant'; Router.navigate('devices');">View All</button>
          </div>
          <table class="table">
            <thead>
              <tr>
                <th>Device</th>
                <th>Tenant</th>
                <th>OS</th>
                <th>User</th>
                <th>Last Sync</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              ${allDevices.filter(d => d.complianceState === 'noncompliant').slice(0, 5).map(d => `
                <tr onclick="Devices.showDetail('${d._tenantId}','${d.id}')" style="cursor:pointer;">
                  <td>
                    <div class="table-device-name">
                      <div class="table-device-icon">${Devices.getOSIcon(d.operatingSystem)}</div>
                      <span class="fw-500">${d.deviceName || 'Unknown'}</span>
                    </div>
                  </td>
                  <td><span class="chip">${AppState.getTenantName(d._tenantId)}</span></td>
                  <td class="text-sm">${d.operatingSystem || '-'}</td>
                  <td class="text-sm">${d.userPrincipalName || '-'}</td>
                  <td class="text-sm">${Devices.formatDate(d.lastSyncDateTime)}</td>
                  <td><button class="btn btn-ghost btn-sm" onclick="event.stopPropagation(); Devices.action('sync','${d._tenantId}','${d.id}')">Sync</button></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : ''}

      <!-- ======== Getting Started (if no tenants) ======== -->
      ${tenants.length === 0 ? `
        <div class="card animate-fade-up">
          <div class="card-body" style="padding: 3rem;">
            <div class="text-center">
              <div class="stat-card-icon blue" style="width:64px; height:64px; margin: 0 auto 1.5rem; font-size:28px;">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
              </div>
              <h2 style="margin-bottom: 0.5rem;">Get Started with MSP Device Manager</h2>
              <p class="text-muted" style="max-width: 500px; margin: 0 auto 2rem;">
                Connect your Microsoft 365 tenants to start managing devices across all your customers from a single dashboard.
              </p>
              <div class="grid grid-3 gap-4" style="max-width: 700px; margin: 0 auto;">
                <div class="card" style="text-align: left;">
                  <div class="card-body-compact">
                    <div class="badge badge-primary mb-2">Step 1</div>
                    <h4 class="mb-1">Register App</h4>
                    <p class="text-xs text-muted">Create an Azure AD App Registration with device management permissions.</p>
                  </div>
                </div>
                <div class="card" style="text-align: left;">
                  <div class="card-body-compact">
                    <div class="badge badge-primary mb-2">Step 2</div>
                    <h4 class="mb-1">Connect Tenants</h4>
                    <p class="text-xs text-muted">Sign in with Microsoft or connect all customers via Partner Center GDAP.</p>
                  </div>
                </div>
                <div class="card" style="text-align: left;">
                  <div class="card-body-compact">
                    <div class="badge badge-primary mb-2">Step 3</div>
                    <h4 class="mb-1">Manage Devices</h4>
                    <p class="text-xs text-muted">View, sync, restart, lock, and manage all devices across all tenants.</p>
                  </div>
                </div>
              </div>
              <button class="btn btn-primary btn-lg mt-6" onclick="Auth.showConnectModal()">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
                Connect Your First Tenant
              </button>
            </div>
          </div>
        </div>
      ` : ''}

      <!-- ======== AI-Powered Recommendations ======== -->
      ${tenants.length > 0 && total > 0 ? `
        <div class="card animate-fade-up mb-6">
          <div class="card-header">
            <div>
              <div class="card-header-title">Recommendations</div>
              <div class="card-header-subtitle">Smart suggestions based on your fleet data</div>
            </div>
            <span class="badge badge-primary">AI</span>
          </div>
          <div class="card-body" style="padding:0;">
            ${this._generateRecommendations(allDevices, tenants).map((rec, i) => `
              <div class="flex items-center gap-3 px-4 py-3" style="border-bottom:1px solid var(--border-light);${i === 0 ? '' : ''}">
                <div style="width:36px;height:36px;border-radius:var(--radius-md);background:${rec.bgColor};display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                  ${rec.icon}
                </div>
                <div style="flex:1;min-width:0;">
                  <div class="text-sm fw-500">${rec.title}</div>
                  <div class="text-xs text-muted" style="margin-top:1px;">${rec.description}</div>
                </div>
                <span class="badge ${rec.severity === 'high' ? 'badge-danger' : rec.severity === 'medium' ? 'badge-warning' : 'badge-info'}">${rec.severity}</span>
                ${rec.action ? `<button class="btn btn-ghost btn-sm" onclick="${rec.action}">Fix</button>` : ''}
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <!-- ======== Visual Analytics (Charts) ======== -->
      ${tenants.length > 0 && total > 0 && typeof Charts !== 'undefined' ? `
        <div class="grid grid-3 gap-4 mb-6">
          <div class="card animate-fade-up">
            <div class="card-header"><div class="card-header-title">Compliance Breakdown</div></div>
            <div class="card-body" style="display:flex;justify-content:center;">
              ${Charts.donut([
                { label: 'Compliant', value: compliant, color: 'var(--success)' },
                { label: 'Non-Compliant', value: nonCompliant, color: 'var(--danger)' },
                { label: 'Unknown', value: unknown, color: 'var(--gray-400)' }
              ], { size: 140, thickness: 24, centerLabel: compPct + '%', centerSub: 'Compliant' })}
            </div>
          </div>
          <div class="card animate-fade-up">
            <div class="card-header"><div class="card-header-title">Platform Mix</div></div>
            <div class="card-body" style="display:flex;justify-content:center;">
              ${Charts.donut(
                osEntries.map(([label, count]) => ({
                  label,
                  value: count,
                  color: osColors[label] || 'var(--gray-400)'
                })),
                { size: 140, thickness: 24, centerLabel: total, centerSub: 'Devices' }
              )}
            </div>
          </div>
          <div class="card animate-fade-up">
            <div class="card-header"><div class="card-header-title">Encryption & Sync</div></div>
            <div class="card-body">
              ${Charts.barH([
                { label: 'Encrypted', value: allDevices.filter(d => d.isEncrypted).length, color: 'var(--success)', maxLabel: allDevices.filter(d => d.isEncrypted).length + '/' + total },
                { label: 'Synced (7d)', value: allDevices.filter(d => d.lastSyncDateTime && (now - new Date(d.lastSyncDateTime).getTime()) < sevenDays).length, color: 'var(--primary)', maxLabel: allDevices.filter(d => d.lastSyncDateTime && (now - new Date(d.lastSyncDateTime).getTime()) < sevenDays).length + '/' + total },
                { label: 'Compliant', value: compliant, color: 'var(--secondary)', maxLabel: compliant + '/' + total },
              ], { max: total })}
            </div>
          </div>
        </div>
      ` : ''}

      <!-- ======== Policy Wizard Quick Launch ======== -->
      ${tenants.length > 0 ? `
        <div class="card animate-fade-up mb-6" style="background:linear-gradient(135deg, var(--primary-bg), var(--secondary-pale));border-color:var(--primary-pale);">
          <div class="card-body" style="display:flex;align-items:center;gap:16px;">
            <div class="stat-card-icon blue" style="width:48px;height:48px;margin-bottom:0;">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
            </div>
            <div style="flex:1;">
              <div class="fw-600">Deploy a Policy</div>
              <div class="text-sm text-muted">Use the guided wizard to deploy compliance, conditional access, or update policies across tenants.</div>
            </div>
            <button class="btn btn-primary" onclick="PolicyWizard.show()">Launch Wizard</button>
          </div>
        </div>
      ` : ''}

      <!-- Sponsor Showcase -->
      <div class="mt-6">
        ${Sponsor.renderPoweredBy()}
      </div>
    `;
  },

  /* ---- AI Recommendations Engine (rule-based) ---- */
  _generateRecommendations(allDevices, tenants) {
    const recs = [];
    const total = allDevices.length;
    if (total === 0) return recs;

    const now = Date.now();
    const compliant = allDevices.filter(d => d.complianceState === 'compliant').length;
    const encrypted = allDevices.filter(d => d.isEncrypted).length;
    const stale = allDevices.filter(d => d.lastSyncDateTime && (now - new Date(d.lastSyncDateTime).getTime()) > 7 * 86400000).length;
    const nonCompliant = allDevices.filter(d => d.complianceState === 'noncompliant').length;
    const compPct = Math.round((compliant / total) * 100);
    const encPct = Math.round((encrypted / total) * 100);

    // Low compliance rate
    if (compPct < 80) {
      recs.push({
        icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
        bgColor: 'var(--danger-pale)',
        title: `Compliance rate is ${compPct}% — below 80% target`,
        description: `${nonCompliant} device(s) are non-compliant. Review compliance policies and remediate affected devices.`,
        severity: 'high',
        action: "Devices.complianceFilter='noncompliant'; Router.navigate('devices');"
      });
    }

    // Low encryption coverage
    if (encPct < 90) {
      recs.push({
        icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--warning)" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>',
        bgColor: 'var(--warning-pale)',
        title: `Only ${encPct}% of devices are encrypted`,
        description: `${total - encrypted} device(s) lack encryption. Deploy BitLocker/FileVault policies for full coverage.`,
        severity: encPct < 70 ? 'high' : 'medium',
        action: "Router.navigate('security');"
      });
    }

    // Stale devices
    if (stale > 0) {
      recs.push({
        icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--warning)" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
        bgColor: 'var(--warning-pale)',
        title: `${stale} stale device(s) detected`,
        description: `These devices haven't synced in 7+ days. They may be offline, decommissioned, or have connectivity issues.`,
        severity: stale > 5 ? 'high' : 'medium',
        action: "Router.navigate('devices');"
      });
    }

    // No conditional access policies
    const caPolicies = AppState.getForContext('caPolicies');
    if (caPolicies.length === 0 && tenants.length > 0) {
      recs.push({
        icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>',
        bgColor: 'var(--primary-pale)',
        title: 'No Conditional Access policies found',
        description: 'Consider deploying MFA and device compliance CA policies to improve security posture.',
        severity: 'medium',
        action: "PolicyWizard.show();"
      });
    }

    // Multi-tenant inconsistency check
    if (tenants.length > 1) {
      const tenantCompliance = tenants.map(t => {
        const devs = AppState.get('devices')[t.id] || [];
        const comp = devs.filter(d => d.complianceState === 'compliant').length;
        return { name: t.displayName, pct: devs.length ? Math.round((comp / devs.length) * 100) : 100 };
      });
      const min = Math.min(...tenantCompliance.map(t => t.pct));
      const max = Math.max(...tenantCompliance.map(t => t.pct));
      if (max - min > 20) {
        const worst = tenantCompliance.find(t => t.pct === min);
        recs.push({
          icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--info)" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>',
          bgColor: 'var(--info-pale)',
          title: 'Cross-tenant compliance variance detected',
          description: `${worst?.name} has ${min}% compliance vs ${max}% in other tenants. Standardize policies across tenants.`,
          severity: 'low',
          action: "Router.navigate('comparison');"
        });
      }
    }

    // All good!
    if (recs.length === 0) {
      recs.push({
        icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--success)" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
        bgColor: 'var(--success-pale)',
        title: 'Fleet health looks great!',
        description: 'All devices are compliant, encrypted, and recently synced. Keep up the good work.',
        severity: 'low',
        action: null
      });
    }

    return recs.slice(0, 5);
  }
};
