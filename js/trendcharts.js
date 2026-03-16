/* ============================================================
   Trend Charts — Historical trend tracking with SVG charts
   Stores daily snapshots in localStorage (capped at 90 days)
   ============================================================ */

const TrendCharts = {
  _storageKey: 'trend_snapshots',
  _maxDays: 90,
  _selectedTenant: 'all',
  _selectedRange: 30,

  /* ---- Snapshot Management ---- */

  _getSnapshots() {
    try {
      const raw = localStorage.getItem(this._storageKey);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  },

  _saveSnapshots(snapshots) {
    try {
      // Cap at max days
      const capped = snapshots.slice(-this._maxDays);
      localStorage.setItem(this._storageKey, JSON.stringify(capped));
    } catch (e) {
      console.error('TrendCharts: Failed to save snapshots', e);
    }
  },

  _todayStr() {
    const d = new Date();
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  },

  takeSnapshot() {
    const tenants = AppState.get('tenants') || [];
    const devicesMap = AppState.get('devices') || {};
    const usersMap = AppState.get('users') || {};
    const today = this._todayStr();

    const tenantMetrics = {};
    tenants.forEach(t => {
      const devices = devicesMap[t.id] || [];
      const users = usersMap[t.id] || [];

      tenantMetrics[t.id] = {
        totalDevices: devices.length,
        compliant: devices.filter(d => d.complianceState === 'compliant').length,
        noncompliant: devices.filter(d => d.complianceState === 'noncompliant').length,
        encrypted: devices.filter(d => d.isEncrypted).length,
        totalUsers: users.length,
        activeUsers: users.filter(u => u.accountEnabled).length,
        licensedUsers: users.filter(u => u.assignedLicenses?.length > 0).length
      };
    });

    const snapshot = { date: today, tenants: tenantMetrics };
    const snapshots = this._getSnapshots();

    // Deduplicate: replace existing snapshot for today
    const idx = snapshots.findIndex(s => s.date === today);
    if (idx >= 0) {
      snapshots[idx] = snapshot;
    } else {
      snapshots.push(snapshot);
    }

    // Sort by date
    snapshots.sort((a, b) => a.date.localeCompare(b.date));
    this._saveSnapshots(snapshots);

    if (typeof AuditLog !== 'undefined' && AuditLog.log) {
      AuditLog.log('trend_snapshot', { date: today, tenantCount: tenants.length });
    }

    Toast.show('Trend snapshot captured for ' + today, 'success');
    return snapshot;
  },

  init() {
    const snapshots = this._getSnapshots();
    const today = this._todayStr();
    const hasToday = snapshots.some(s => s.date === today);
    if (!hasToday) {
      // Only auto-snapshot if there is data to capture
      const tenants = AppState.get('tenants') || [];
      if (tenants.length > 0) {
        this.takeSnapshot();
      }
    }
  },

  /* ---- Data Aggregation ---- */

  _getFilteredData() {
    const snapshots = this._getSnapshots();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - this._selectedRange);
    const cutoffStr = cutoff.getFullYear() + '-' +
      String(cutoff.getMonth() + 1).padStart(2, '0') + '-' +
      String(cutoff.getDate()).padStart(2, '0');

    return snapshots.filter(s => s.date >= cutoffStr);
  },

  _aggregateSnapshots(snapshots) {
    const tid = this._selectedTenant;
    return snapshots.map(s => {
      let totalDevices = 0, compliant = 0, noncompliant = 0, encrypted = 0;
      let totalUsers = 0, activeUsers = 0, licensedUsers = 0;

      if (tid === 'all') {
        Object.values(s.tenants || {}).forEach(m => {
          totalDevices += m.totalDevices || 0;
          compliant += m.compliant || 0;
          noncompliant += m.noncompliant || 0;
          encrypted += m.encrypted || 0;
          totalUsers += m.totalUsers || 0;
          activeUsers += m.activeUsers || 0;
          licensedUsers += m.licensedUsers || 0;
        });
      } else {
        const m = (s.tenants || {})[tid] || {};
        totalDevices = m.totalDevices || 0;
        compliant = m.compliant || 0;
        noncompliant = m.noncompliant || 0;
        encrypted = m.encrypted || 0;
        totalUsers = m.totalUsers || 0;
        activeUsers = m.activeUsers || 0;
        licensedUsers = m.licensedUsers || 0;
      }

      const complianceRate = totalDevices > 0 ? Math.round((compliant / totalDevices) * 100) : 0;
      const encryptionRate = totalDevices > 0 ? Math.round((encrypted / totalDevices) * 100) : 0;

      return {
        date: s.date,
        totalDevices, compliant, noncompliant, encrypted,
        totalUsers, activeUsers, licensedUsers,
        complianceRate, encryptionRate
      };
    });
  },

  /* ---- SVG Chart Renderers ---- */

  _escHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  },

  _formatDate(dateStr) {
    const parts = dateStr.split('-');
    return parts[1] + '/' + parts[2];
  },

  /**
   * Reusable SVG line/area chart renderer
   * @param {Array} data - Array of { date, value }
   * @param {string} color - Hex color
   * @param {string} label - Chart label
   * @param {boolean} isPercentage - Whether values are percentages (0-100)
   * @param {string} chartType - 'line' | 'area' | 'bar'
   * @returns {string} SVG markup
   */
  _renderLineChart(data, color, label, isPercentage = false, chartType = 'area') {
    if (!data || data.length === 0) {
      return `<div style="text-align:center;padding:40px;color:var(--text-muted);">No data available for this time range</div>`;
    }

    const chartW = 800;
    const chartH = 200;
    const padL = 50;
    const padR = 20;
    const padT = 20;
    const padB = 40;
    const plotW = chartW - padL - padR;
    const plotH = chartH - padT - padB;

    const values = data.map(d => d.value);
    let minVal, maxVal;

    if (isPercentage) {
      minVal = 0;
      maxVal = 100;
    } else {
      minVal = 0;
      maxVal = Math.max(...values, 1);
      // Round max up to a nice number
      const magnitude = Math.pow(10, Math.floor(Math.log10(maxVal || 1)));
      maxVal = Math.ceil(maxVal / magnitude) * magnitude;
      if (maxVal === 0) maxVal = 10;
    }

    const range = maxVal - minVal || 1;

    // Scale functions
    const xScale = (i) => padL + (data.length === 1 ? plotW / 2 : (i / (data.length - 1)) * plotW);
    const yScale = (v) => padT + plotH - ((v - minVal) / range) * plotH;

    // Gridlines (4-5 lines)
    const gridCount = 5;
    let gridLines = '';
    for (let i = 0; i <= gridCount; i++) {
      const val = minVal + (range * i / gridCount);
      const y = yScale(val);
      const displayVal = isPercentage ? Math.round(val) + '%' : Math.round(val);
      gridLines += `<line x1="${padL}" y1="${y}" x2="${chartW - padR}" y2="${y}" stroke="var(--border, #e5e7eb)" stroke-width="1" stroke-dasharray="4,4"/>`;
      gridLines += `<text x="${padL - 8}" y="${y + 4}" text-anchor="end" fill="var(--text-muted, #9ca3af)" font-size="11" font-family="Inter, sans-serif">${displayVal}</text>`;
    }

    // X-axis labels — show every Nth to avoid crowding
    const maxLabels = 10;
    const step = Math.max(1, Math.ceil(data.length / maxLabels));
    let xLabels = '';
    for (let i = 0; i < data.length; i += step) {
      const x = xScale(i);
      xLabels += `<text x="${x}" y="${chartH - 5}" text-anchor="middle" fill="var(--text-muted, #9ca3af)" font-size="10" font-family="Inter, sans-serif">${this._formatDate(data[i].date)}</text>`;
    }
    // Always show last label if not already shown
    if ((data.length - 1) % step !== 0 && data.length > 1) {
      const x = xScale(data.length - 1);
      xLabels += `<text x="${x}" y="${chartH - 5}" text-anchor="middle" fill="var(--text-muted, #9ca3af)" font-size="10" font-family="Inter, sans-serif">${this._formatDate(data[data.length - 1].date)}</text>`;
    }

    let chartContent = '';
    const uid = 'tc_' + label.replace(/\s+/g, '_') + '_' + Date.now();

    if (chartType === 'bar') {
      // Bar chart
      const barWidth = Math.max(4, Math.min(30, plotW / data.length - 4));
      data.forEach((d, i) => {
        const x = xScale(i) - barWidth / 2;
        const y = yScale(d.value);
        const h = yScale(minVal) - y;
        const displayVal = isPercentage ? d.value + '%' : d.value;
        chartContent += `<rect x="${x}" y="${y}" width="${barWidth}" height="${Math.max(0, h)}" fill="${color}" opacity="0.7" rx="2">
          <title>${d.date}: ${displayVal}</title>
        </rect>`;
        chartContent += `<rect x="${x}" y="${y}" width="${barWidth}" height="${Math.max(0, h)}" fill="${color}" opacity="0" rx="2" class="trend-bar-hover" style="cursor:pointer;">
          <title>${d.date}: ${displayVal}</title>
        </rect>`;
      });
    } else {
      // Line / area chart
      if (data.length === 1) {
        // Single point — draw a dot
        const cx = xScale(0);
        const cy = yScale(data[0].value);
        const displayVal = isPercentage ? data[0].value + '%' : data[0].value;
        chartContent += `<circle cx="${cx}" cy="${cy}" r="5" fill="${color}" stroke="white" stroke-width="2">
          <title>${data[0].date}: ${displayVal}</title>
        </circle>`;
      } else {
        // Build polyline points
        const points = data.map((d, i) => `${xScale(i)},${yScale(d.value)}`).join(' ');

        // Filled area beneath
        if (chartType === 'area') {
          const areaPoints = `${xScale(0)},${yScale(minVal)} ` + points + ` ${xScale(data.length - 1)},${yScale(minVal)}`;
          chartContent += `<defs><linearGradient id="${uid}_grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="${color}" stop-opacity="0.3"/>
            <stop offset="100%" stop-color="${color}" stop-opacity="0.02"/>
          </linearGradient></defs>`;
          chartContent += `<polygon points="${areaPoints}" fill="url(#${uid}_grad)"/>`;
        }

        // Line
        chartContent += `<polyline points="${points}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`;

        // Data point dots with hover tooltips
        data.forEach((d, i) => {
          const cx = xScale(i);
          const cy = yScale(d.value);
          const displayVal = isPercentage ? d.value + '%' : d.value;
          chartContent += `<circle cx="${cx}" cy="${cy}" r="3" fill="white" stroke="${color}" stroke-width="2" opacity="0" class="trend-dot" style="cursor:pointer;">
            <title>${d.date}: ${displayVal}</title>
          </circle>`;
        });
      }
    }

    return `<svg viewBox="0 0 ${chartW} ${chartH}" width="100%" height="${chartH}" preserveAspectRatio="xMidYMid meet" style="overflow:visible;" class="trend-chart-svg">
      <!-- Gridlines -->
      ${gridLines}
      <!-- X axis labels -->
      ${xLabels}
      <!-- Chart content -->
      ${chartContent}
    </svg>`;
  },

  /* ---- CSV Export ---- */

  exportCSV() {
    const snapshots = this._getFilteredData();
    const aggregated = this._aggregateSnapshots(snapshots);

    if (aggregated.length === 0) {
      Toast.show('No trend data to export', 'warning');
      return;
    }

    const headers = ['Date', 'Total Devices', 'Compliant', 'Non-Compliant', 'Encrypted', 'Compliance Rate %', 'Encryption Rate %', 'Total Users', 'Active Users', 'Licensed Users'];
    const rows = aggregated.map(d => [
      d.date, d.totalDevices, d.compliant, d.noncompliant, d.encrypted,
      d.complianceRate, d.encryptionRate,
      d.totalUsers, d.activeUsers, d.licensedUsers
    ]);

    let csv = headers.join(',') + '\n';
    rows.forEach(r => { csv += r.join(',') + '\n'; });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const tenantLabel = this._selectedTenant === 'all' ? 'AllTenants' : this._selectedTenant.substring(0, 8);
    a.download = `trend_data_${tenantLabel}_${this._selectedRange}d_${this._todayStr()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    Toast.show('Trend data exported as CSV', 'success');
  },

  /* ---- Last Snapshot Info ---- */

  _getLastSnapshotTime() {
    const snapshots = this._getSnapshots();
    if (snapshots.length === 0) return null;
    return snapshots[snapshots.length - 1].date;
  },

  /* ---- Page Render ---- */

  render() {
    const main = document.getElementById('mainContent');
    const tenants = AppState.get('tenants') || [];
    const snapshots = this._getFilteredData();
    const aggregated = this._aggregateSnapshots(snapshots);
    const lastSnapshot = this._getLastSnapshotTime();

    // Prepare chart data series
    const complianceData = aggregated.map(d => ({ date: d.date, value: d.complianceRate }));
    const deviceData = aggregated.map(d => ({ date: d.date, value: d.totalDevices }));
    const encryptionData = aggregated.map(d => ({ date: d.date, value: d.encryptionRate }));
    const userData = aggregated.map(d => ({ date: d.date, value: d.totalUsers }));

    const tenantLabel = this._selectedTenant === 'all' ? 'All Tenants' :
      (tenants.find(t => t.id === this._selectedTenant)?.displayName || this._selectedTenant);

    main.innerHTML = `
      <style>
        .trend-chart-svg .trend-dot { transition: opacity 0.15s ease; }
        .trend-chart-svg:hover .trend-dot { opacity: 1 !important; }
        .trend-chart-svg .trend-bar-hover:hover { opacity: 0.3 !important; }
        .trend-controls { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
        .trend-range-btn { padding: 4px 12px; border-radius: 6px; border: 1px solid var(--border, #e5e7eb); background: var(--bg, #fff); color: var(--text-secondary, #6b7280); font-size: 13px; cursor: pointer; transition: all 0.15s ease; }
        .trend-range-btn:hover { border-color: var(--primary, #2563eb); color: var(--primary, #2563eb); }
        .trend-range-btn.active { background: var(--primary, #2563eb); color: #fff; border-color: var(--primary, #2563eb); }
        .trend-charts-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(380px, 1fr)); gap: 16px; margin-top: 16px; }
        .trend-chart-card { background: var(--card-bg, #fff); border-radius: 12px; border: 1px solid var(--border, #e5e7eb); overflow: hidden; }
        .trend-chart-title { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600; color: var(--text-primary, #111827); }
        .trend-chart-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
        .trend-snapshot-info { font-size: 12px; color: var(--text-muted, #9ca3af); }
        .trend-empty-state { text-align: center; padding: 60px 20px; color: var(--text-muted, #9ca3af); }
        .trend-empty-state svg { margin-bottom: 16px; opacity: 0.4; }
        .trend-empty-state h3 { color: var(--text-secondary, #6b7280); margin-bottom: 8px; }
      </style>

      <div class="page-header">
        <div class="page-header-left">
          <h1 class="page-title">Trend Charts</h1>
          <p class="page-subtitle">Historical metrics over time ${lastSnapshot ? '&mdash; last snapshot: ' + lastSnapshot : ''}</p>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-primary btn-sm" onclick="TrendCharts.takeSnapshot(); TrendCharts.render();">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            Take Snapshot Now
          </button>
          <button class="btn btn-secondary btn-sm" onclick="TrendCharts.exportCSV();">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Export CSV
          </button>
        </div>
      </div>

      <!-- Controls -->
      <div class="card animate-fade">
        <div class="card-body" style="padding: 12px 16px;">
          <div class="trend-controls">
            <div style="display:flex;align-items:center;gap:8px;">
              <label style="font-size:13px;font-weight:500;color:var(--text-secondary, #6b7280);white-space:nowrap;">Tenant:</label>
              <select class="form-select" style="min-width:200px;" onchange="TrendCharts._selectedTenant = this.value; TrendCharts.render();">
                <option value="all" ${this._selectedTenant === 'all' ? 'selected' : ''}>All Tenants</option>
                ${tenants.map(t => `<option value="${t.id}" ${this._selectedTenant === t.id ? 'selected' : ''}>${this._escHtml(t.displayName || t.id)}</option>`).join('')}
              </select>
            </div>
            <div style="display:flex;align-items:center;gap:6px;">
              <label style="font-size:13px;font-weight:500;color:var(--text-secondary, #6b7280);white-space:nowrap;">Range:</label>
              ${[7, 14, 30, 60, 90].map(d => `<button class="trend-range-btn ${this._selectedRange === d ? 'active' : ''}" onclick="TrendCharts._selectedRange = ${d}; TrendCharts.render();">${d}d</button>`).join('')}
            </div>
            <div class="trend-snapshot-info" style="margin-left:auto;">
              ${aggregated.length} data point${aggregated.length !== 1 ? 's' : ''} in range
            </div>
          </div>
        </div>
      </div>

      ${aggregated.length === 0 ? `
        <div class="trend-empty-state animate-fade">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M3 3v18h18"/><path d="M7 16l4-4 4 4 5-5"/>
          </svg>
          <h3>No trend data yet</h3>
          <p>Snapshots are captured daily when you visit the app.<br>Click "Take Snapshot Now" to capture your first data point.</p>
        </div>
      ` : `
        <!-- Chart Grid -->
        <div class="trend-charts-grid animate-fade">

          <!-- Compliance Trend -->
          <div class="trend-chart-card">
            <div class="card-header">
              <div class="trend-chart-title">
                <span class="trend-chart-dot" style="background:#2563eb;"></span>
                Compliance Trend
              </div>
            </div>
            <div class="card-body" style="padding:12px 16px 16px;">
              ${this._renderLineChart(complianceData, '#2563eb', 'compliance', true, 'area')}
            </div>
          </div>

          <!-- Device Count Trend -->
          <div class="trend-chart-card">
            <div class="card-header">
              <div class="trend-chart-title">
                <span class="trend-chart-dot" style="background:#0891b2;"></span>
                Device Count Trend
              </div>
            </div>
            <div class="card-body" style="padding:12px 16px 16px;">
              ${this._renderLineChart(deviceData, '#0891b2', 'devices', false, 'area')}
            </div>
          </div>

          <!-- Encryption Trend -->
          <div class="trend-chart-card">
            <div class="card-header">
              <div class="trend-chart-title">
                <span class="trend-chart-dot" style="background:#10b981;"></span>
                Encryption Trend
              </div>
            </div>
            <div class="card-body" style="padding:12px 16px 16px;">
              ${this._renderLineChart(encryptionData, '#10b981', 'encryption', true, 'area')}
            </div>
          </div>

          <!-- User Growth -->
          <div class="trend-chart-card">
            <div class="card-header">
              <div class="trend-chart-title">
                <span class="trend-chart-dot" style="background:#8b5cf6;"></span>
                User Growth
              </div>
            </div>
            <div class="card-body" style="padding:12px 16px 16px;">
              ${this._renderLineChart(userData, '#8b5cf6', 'users', false, 'bar')}
            </div>
          </div>

        </div>
      `}
    `;
  }
};
