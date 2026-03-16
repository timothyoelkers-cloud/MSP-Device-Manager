/* ============================================================
   SLA Tracking — Define, monitor, and report on SLA targets
   ============================================================ */

const SLATracking = {
  _editingId: null,

  // ---- Data Access ----

  _getDefinitions() {
    try {
      return JSON.parse(localStorage.getItem('sla_definitions') || '[]');
    } catch (e) { return []; }
  },

  _saveDefinitions(defs) {
    localStorage.setItem('sla_definitions', JSON.stringify(defs));
  },

  _getHistory() {
    try {
      return JSON.parse(localStorage.getItem('sla_history') || '[]');
    } catch (e) { return []; }
  },

  _saveHistory(history) {
    // Cap at 90 days
    const cutoff = Date.now() - (90 * 24 * 60 * 60 * 1000);
    const trimmed = history.filter(h => h.timestamp >= cutoff);
    localStorage.setItem('sla_history', JSON.stringify(trimmed));
  },

  // ---- Metric Calculations ----

  _metricLabels: {
    compliance_rate: 'Compliance Rate',
    encryption_rate: 'Encryption Rate',
    patch_rate: 'Patch Rate',
    uptime: 'Uptime'
  },

  _calculateMetric(metric, tenantId) {
    const devices = AppState.get('devices')?.[tenantId] || [];
    if (devices.length === 0) return 0;

    switch (metric) {
      case 'compliance_rate': {
        const compliant = devices.filter(d =>
          d.complianceState === 'compliant'
        ).length;
        return devices.length > 0 ? Math.round((compliant / devices.length) * 100) : 0;
      }
      case 'encryption_rate': {
        const encrypted = devices.filter(d =>
          d.isEncrypted === true
        ).length;
        return devices.length > 0 ? Math.round((encrypted / devices.length) * 100) : 0;
      }
      case 'patch_rate': {
        // Devices that checked in within last 7 days are considered patched/up-to-date
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const patched = devices.filter(d => {
          const last = d.lastSyncDateTime ? new Date(d.lastSyncDateTime) : null;
          return last && last >= weekAgo;
        }).length;
        return devices.length > 0 ? Math.round((patched / devices.length) * 100) : 0;
      }
      case 'uptime': {
        // Devices seen in last 24h considered "up"
        const dayAgo = new Date();
        dayAgo.setDate(dayAgo.getDate() - 1);
        const up = devices.filter(d => {
          const last = d.lastSyncDateTime ? new Date(d.lastSyncDateTime) : null;
          return last && last >= dayAgo;
        }).length;
        return devices.length > 0 ? Math.round((up / devices.length) * 100) : 0;
      }
      default:
        return 0;
    }
  },

  // ---- Public API ----

  getSLAStatus(slaId) {
    const defs = this._getDefinitions();
    const sla = defs.find(d => d.id === slaId);
    if (!sla) return null;

    const current = this._calculateMetric(sla.metric, sla.tenantId);
    const status = current >= sla.target ? 'met'
      : current >= sla.warning_threshold ? 'warning'
      : 'breached';

    // Trend: compare to 7-day-ago snapshot
    const history = this._getHistory();
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const oldSnapshots = history
      .filter(h => h.slaId === slaId && h.timestamp <= sevenDaysAgo)
      .sort((a, b) => b.timestamp - a.timestamp);
    const oldValue = oldSnapshots.length > 0 ? oldSnapshots[0].value : null;

    let trend = 'flat';
    if (oldValue !== null) {
      if (current > oldValue) trend = 'up';
      else if (current < oldValue) trend = 'down';
    }

    return { current, target: sla.target, status, trend };
  },

  getBreachedCount() {
    const defs = this._getDefinitions();
    let count = 0;
    defs.forEach(sla => {
      const current = this._calculateMetric(sla.metric, sla.tenantId);
      if (current < sla.warning_threshold) count++;
    });
    return count;
  },

  takeSnapshot() {
    const defs = this._getDefinitions();
    if (defs.length === 0) return;

    const history = this._getHistory();
    const now = Date.now();

    defs.forEach(sla => {
      const value = this._calculateMetric(sla.metric, sla.tenantId);
      history.push({
        slaId: sla.id,
        tenantId: sla.tenantId,
        metric: sla.metric,
        value,
        target: sla.target,
        timestamp: now
      });
    });

    this._saveHistory(history);
  },

  // ---- CRUD ----

  _createSLA(data) {
    const defs = this._getDefinitions();
    const sla = {
      id: 'sla_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8),
      tenantId: data.tenantId,
      name: data.name,
      metric: data.metric,
      target: parseInt(data.target, 10),
      warning_threshold: parseInt(data.warning_threshold, 10),
      createdAt: new Date().toISOString()
    };
    defs.push(sla);
    this._saveDefinitions(defs);
    if (typeof AuditLog !== 'undefined') AuditLog.log('sla_create', `Created SLA "${sla.name}" for ${AppState.getTenantName(sla.tenantId)}`);
    Toast.show(`SLA "${sla.name}" created`, 'success');
    return sla;
  },

  _updateSLA(id, data) {
    const defs = this._getDefinitions();
    const idx = defs.findIndex(d => d.id === id);
    if (idx === -1) return;
    defs[idx] = { ...defs[idx], ...data, target: parseInt(data.target, 10), warning_threshold: parseInt(data.warning_threshold, 10) };
    this._saveDefinitions(defs);
    if (typeof AuditLog !== 'undefined') AuditLog.log('sla_update', `Updated SLA "${defs[idx].name}"`);
    Toast.show(`SLA "${defs[idx].name}" updated`, 'success');
  },

  _deleteSLA(id) {
    const defs = this._getDefinitions();
    const sla = defs.find(d => d.id === id);
    const filtered = defs.filter(d => d.id !== id);
    this._saveDefinitions(filtered);
    // Also clean up history
    const history = this._getHistory().filter(h => h.slaId !== id);
    this._saveHistory(history);
    if (sla && typeof AuditLog !== 'undefined') AuditLog.log('sla_delete', `Deleted SLA "${sla.name}"`);
    Toast.show('SLA deleted', 'info');
  },

  // ---- Rendering ----

  render() {
    const main = document.getElementById('mainContent');
    const defs = this._getDefinitions();
    const tenants = AppState.get('tenants') || [];

    // Calculate overview stats
    let metCount = 0, warningCount = 0, breachedCount = 0;
    const slaStatuses = defs.map(sla => {
      const current = this._calculateMetric(sla.metric, sla.tenantId);
      const status = current >= sla.target ? 'met'
        : current >= sla.warning_threshold ? 'warning'
        : 'breached';
      if (status === 'met') metCount++;
      else if (status === 'warning') warningCount++;
      else breachedCount++;

      // Trend
      const history = this._getHistory();
      const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      const oldSnapshots = history
        .filter(h => h.slaId === sla.id && h.timestamp <= sevenDaysAgo)
        .sort((a, b) => b.timestamp - a.timestamp);
      const oldValue = oldSnapshots.length > 0 ? oldSnapshots[0].value : null;
      let trend = 'flat';
      if (oldValue !== null) {
        if (current > oldValue) trend = 'up';
        else if (current < oldValue) trend = 'down';
      }

      return { sla, current, status, trend };
    });

    const trendArrow = (trend) => {
      if (trend === 'up') return '<span style="color:#059669;font-weight:600;" title="Improving">&#9650;</span>';
      if (trend === 'down') return '<span style="color:#dc2626;font-weight:600;" title="Declining">&#9660;</span>';
      return '<span style="color:#6b7280;" title="Stable">&#9644;</span>';
    };

    const statusBadge = (status) => {
      const map = {
        met: '<span class="badge" style="background:#dcfce7;color:#166534;">Met</span>',
        warning: '<span class="badge" style="background:#fef9c3;color:#854d0e;">Warning</span>',
        breached: '<span class="badge" style="background:#fee2e2;color:#991b1b;">Breached</span>'
      };
      return map[status] || '';
    };

    // Group by tenant
    const tenantGroups = {};
    slaStatuses.forEach(s => {
      if (!tenantGroups[s.sla.tenantId]) tenantGroups[s.sla.tenantId] = [];
      tenantGroups[s.sla.tenantId].push(s);
    });

    main.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h1 class="page-title">SLA Tracking</h1>
          <p class="page-subtitle">${defs.length} SLA definition${defs.length !== 1 ? 's' : ''} across ${Object.keys(tenantGroups).length} tenant${Object.keys(tenantGroups).length !== 1 ? 's' : ''}</p>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-secondary btn-sm" onclick="SLATracking.takeSnapshot(); SLATracking.render(); Toast.show('Snapshot recorded', 'success');">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            Take Snapshot
          </button>
          <button class="btn btn-primary btn-sm" onclick="SLATracking._showCreateModal()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Define SLA
          </button>
        </div>
      </div>

      <!-- Overview Cards -->
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:16px;margin-bottom:24px;" class="animate-fade">
        <div class="card" style="padding:20px;">
          <div style="font-size:13px;color:var(--text-secondary);margin-bottom:4px;">Total SLAs</div>
          <div style="font-size:28px;font-weight:700;color:var(--text-primary);">${defs.length}</div>
        </div>
        <div class="card" style="padding:20px;">
          <div style="font-size:13px;color:var(--text-secondary);margin-bottom:4px;">Meeting Target</div>
          <div style="font-size:28px;font-weight:700;color:#059669;">${metCount}</div>
        </div>
        <div class="card" style="padding:20px;">
          <div style="font-size:13px;color:var(--text-secondary);margin-bottom:4px;">At Warning</div>
          <div style="font-size:28px;font-weight:700;color:#d97706;">${warningCount}</div>
        </div>
        <div class="card" style="padding:20px;">
          <div style="font-size:13px;color:var(--text-secondary);margin-bottom:4px;">Breached</div>
          <div style="font-size:28px;font-weight:700;color:#dc2626;">${breachedCount}</div>
        </div>
      </div>

      ${defs.length === 0 ? `
        <div class="card" style="padding:48px;text-align:center;">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="1.5" style="margin:0 auto 16px;">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            <polyline points="9 12 11 14 15 10"/>
          </svg>
          <h3 style="margin-bottom:8px;color:var(--text-primary);">No SLAs Defined</h3>
          <p style="color:var(--text-secondary);margin-bottom:16px;">Define service level agreements to track compliance, encryption, patch rates and uptime across your tenants.</p>
          <button class="btn btn-primary" onclick="SLATracking._showCreateModal()">Define Your First SLA</button>
        </div>
      ` : `
        <!-- Per-Tenant SLA Tables -->
        ${Object.entries(tenantGroups).map(([tenantId, items]) => `
          <div class="card animate-fade" style="margin-bottom:20px;">
            <div class="card-header">
              <h3 class="card-header-title">${AppState.getTenantName(tenantId)}</h3>
            </div>
            <div class="card-body" style="padding:0;">
              <table class="table" style="width:100%;border-collapse:collapse;">
                <thead>
                  <tr>
                    <th style="padding:12px 16px;text-align:left;font-size:12px;font-weight:600;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.05em;">SLA Name</th>
                    <th style="padding:12px 16px;text-align:left;font-size:12px;font-weight:600;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.05em;">Metric</th>
                    <th style="padding:12px 16px;text-align:center;font-size:12px;font-weight:600;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.05em;">Target</th>
                    <th style="padding:12px 16px;text-align:center;font-size:12px;font-weight:600;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.05em;">Current</th>
                    <th style="padding:12px 16px;text-align:center;font-size:12px;font-weight:600;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.05em;">Status</th>
                    <th style="padding:12px 16px;text-align:center;font-size:12px;font-weight:600;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.05em;">Trend</th>
                    <th style="padding:12px 16px;text-align:right;font-size:12px;font-weight:600;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.05em;">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  ${items.map(s => `
                    <tr style="border-top:1px solid var(--border-light);">
                      <td style="padding:12px 16px;font-weight:500;">${this._esc(s.sla.name)}</td>
                      <td style="padding:12px 16px;color:var(--text-secondary);">${this._metricLabels[s.sla.metric] || s.sla.metric}</td>
                      <td style="padding:12px 16px;text-align:center;">${s.sla.target}%</td>
                      <td style="padding:12px 16px;text-align:center;font-weight:600;color:${s.status === 'met' ? '#059669' : s.status === 'warning' ? '#d97706' : '#dc2626'};">${s.current}%</td>
                      <td style="padding:12px 16px;text-align:center;">${statusBadge(s.status)}</td>
                      <td style="padding:12px 16px;text-align:center;">${trendArrow(s.trend)}</td>
                      <td style="padding:12px 16px;text-align:right;">
                        <button class="btn btn-ghost btn-sm" onclick="SLATracking._showEditModal('${s.sla.id}')" title="Edit">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button class="btn btn-ghost btn-sm" onclick="SLATracking._confirmDelete('${s.sla.id}', '${this._esc(s.sla.name)}')" title="Delete" style="color:#dc2626;">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                        </button>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        `).join('')}

        <!-- History / Sparklines Section -->
        <div class="card animate-fade" style="margin-bottom:20px;">
          <div class="card-header">
            <h3 class="card-header-title">SLA History (Last 30 Days)</h3>
          </div>
          <div class="card-body">
            ${this._renderHistorySection(slaStatuses)}
          </div>
        </div>
      `}

      <!-- SLA Modal (injected dynamically) -->
      <div id="slaModal"></div>
    `;
  },

  _renderHistorySection(slaStatuses) {
    const history = this._getHistory();
    if (history.length === 0) {
      return '<p style="color:var(--text-secondary);text-align:center;padding:24px 0;">No history snapshots yet. Click "Take Snapshot" to start recording SLA metrics over time.</p>';
    }

    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const recentHistory = history.filter(h => h.timestamp >= thirtyDaysAgo);

    return slaStatuses.map(s => {
      const slaHistory = recentHistory
        .filter(h => h.slaId === s.sla.id)
        .sort((a, b) => a.timestamp - b.timestamp);

      if (slaHistory.length === 0) return '';

      return `
        <div style="margin-bottom:20px;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
            <span style="font-weight:600;font-size:14px;">${this._esc(s.sla.name)}</span>
            <span style="font-size:12px;color:var(--text-secondary);">${AppState.getTenantName(s.sla.tenantId)} &middot; ${this._metricLabels[s.sla.metric]}</span>
          </div>
          ${this._renderSparkline(slaHistory, s.sla.target, s.sla.warning_threshold)}
        </div>
      `;
    }).join('');
  },

  _renderSparkline(dataPoints, target, warningThreshold) {
    if (dataPoints.length === 0) return '';

    const width = 600;
    const height = 60;
    const padding = 2;
    const barWidth = Math.max(2, Math.min(12, (width - padding * 2) / dataPoints.length - 1));
    const totalBarArea = dataPoints.length * (barWidth + 1);
    const startX = Math.max(padding, (width - totalBarArea) / 2);

    let bars = '';
    dataPoints.forEach((dp, i) => {
      const x = startX + i * (barWidth + 1);
      const barHeight = Math.max(2, (dp.value / 100) * (height - 4));
      const y = height - barHeight - 2;
      let color;
      if (dp.value >= target) color = '#059669';
      else if (dp.value >= warningThreshold) color = '#d97706';
      else color = '#dc2626';

      const date = new Date(dp.timestamp).toLocaleDateString();
      bars += `<rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" rx="1" fill="${color}" opacity="0.85"><title>${date}: ${dp.value}%</title></rect>`;
    });

    // Target line
    const targetY = height - (target / 100) * (height - 4) - 2;

    return `
      <svg width="100%" height="${height}" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" style="border-radius:6px;background:var(--bg-secondary,#f9fafb);">
        <line x1="0" y1="${targetY}" x2="${width}" y2="${targetY}" stroke="#2563eb" stroke-width="1" stroke-dasharray="4,3" opacity="0.5"/>
        ${bars}
      </svg>
      <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-secondary);margin-top:2px;">
        <span>${new Date(dataPoints[0].timestamp).toLocaleDateString()}</span>
        <span style="color:#2563eb;">Target: ${target}%</span>
        <span>${new Date(dataPoints[dataPoints.length - 1].timestamp).toLocaleDateString()}</span>
      </div>
    `;
  },

  // ---- Modals ----

  _showCreateModal() {
    this._editingId = null;
    this._showModal({
      title: 'Define SLA',
      name: '',
      tenantId: '',
      metric: 'compliance_rate',
      target: 95,
      warning_threshold: 85
    });
  },

  _showEditModal(id) {
    const defs = this._getDefinitions();
    const sla = defs.find(d => d.id === id);
    if (!sla) return;
    this._editingId = id;
    this._showModal({
      title: 'Edit SLA',
      name: sla.name,
      tenantId: sla.tenantId,
      metric: sla.metric,
      target: sla.target,
      warning_threshold: sla.warning_threshold
    });
  },

  _showModal(opts) {
    const tenants = AppState.get('tenants') || [];
    const container = document.getElementById('slaModal');
    if (!container) return;

    container.innerHTML = `
      <div class="modal-overlay" id="slaModalOverlay" onclick="if(event.target===this)SLATracking._closeModal()">
        <div class="modal" style="max-width:480px;">
          <div class="modal-header">
            <h3 class="modal-title">${opts.title}</h3>
            <button class="modal-close" onclick="SLATracking._closeModal()">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div class="modal-body">
            <div style="display:flex;flex-direction:column;gap:16px;">
              <div>
                <label class="form-label">SLA Name</label>
                <input type="text" class="form-input" id="slaInputName" value="${this._esc(opts.name)}" placeholder="e.g. Contoso Compliance SLA">
              </div>
              <div>
                <label class="form-label">Tenant</label>
                <select class="form-select" id="slaInputTenant">
                  <option value="">Select tenant...</option>
                  ${tenants.map(t => `<option value="${t.id}" ${t.id === opts.tenantId ? 'selected' : ''}>${this._esc(t.displayName || t.id)}</option>`).join('')}
                </select>
              </div>
              <div>
                <label class="form-label">Metric</label>
                <select class="form-select" id="slaInputMetric">
                  ${Object.entries(this._metricLabels).map(([k, v]) => `<option value="${k}" ${k === opts.metric ? 'selected' : ''}>${v}</option>`).join('')}
                </select>
              </div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                <div>
                  <label class="form-label">Target (%)</label>
                  <input type="number" class="form-input" id="slaInputTarget" min="0" max="100" value="${opts.target}">
                </div>
                <div>
                  <label class="form-label">Warning Threshold (%)</label>
                  <input type="number" class="form-input" id="slaInputWarning" min="0" max="100" value="${opts.warning_threshold}">
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer" style="display:flex;justify-content:flex-end;gap:8px;padding:16px 24px;border-top:1px solid var(--border-light);">
            <button class="btn btn-secondary" onclick="SLATracking._closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="SLATracking._saveFromModal()">
              ${this._editingId ? 'Save Changes' : 'Create SLA'}
            </button>
          </div>
        </div>
      </div>
    `;
  },

  _closeModal() {
    const container = document.getElementById('slaModal');
    if (container) container.innerHTML = '';
    this._editingId = null;
  },

  _saveFromModal() {
    const name = (document.getElementById('slaInputName')?.value || '').trim();
    const tenantId = document.getElementById('slaInputTenant')?.value || '';
    const metric = document.getElementById('slaInputMetric')?.value || '';
    const target = document.getElementById('slaInputTarget')?.value || '';
    const warning_threshold = document.getElementById('slaInputWarning')?.value || '';

    // Validation
    if (!name) { Toast.show('Please enter an SLA name', 'warning'); return; }
    if (!tenantId) { Toast.show('Please select a tenant', 'warning'); return; }
    if (!metric) { Toast.show('Please select a metric', 'warning'); return; }
    const t = parseInt(target, 10);
    const w = parseInt(warning_threshold, 10);
    if (isNaN(t) || t < 0 || t > 100) { Toast.show('Target must be between 0 and 100', 'warning'); return; }
    if (isNaN(w) || w < 0 || w > 100) { Toast.show('Warning threshold must be between 0 and 100', 'warning'); return; }
    if (w >= t) { Toast.show('Warning threshold must be lower than target', 'warning'); return; }

    if (this._editingId) {
      this._updateSLA(this._editingId, { name, tenantId, metric, target: t, warning_threshold: w });
    } else {
      this._createSLA({ name, tenantId, metric, target: t, warning_threshold: w });
    }

    this._closeModal();
    this.render();
  },

  _confirmDelete(id, name) {
    if (typeof Confirm !== 'undefined' && Confirm.show) {
      Confirm.show({
        title: 'Delete SLA',
        message: `Are you sure you want to delete the SLA "${name}"? This will also remove its history data.`,
        confirmText: 'Delete',
        danger: true,
        onConfirm: () => {
          this._deleteSLA(id);
          this.render();
        }
      });
    } else {
      if (confirm(`Delete SLA "${name}"? This will also remove its history data.`)) {
        this._deleteSLA(id);
        this.render();
      }
    }
  },

  // ---- Utilities ----

  _esc(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
};
