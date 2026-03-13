/* ============================================================
   Alerts — Compliance drift detection & proactive monitoring
   ============================================================ */

const Alerts = {
  // Configurable thresholds (stored in localStorage)
  _defaults: {
    complianceThreshold: 80,
    staleDaysThreshold: 7,
    encryptionThreshold: 90,
    storageThreshold: 10, // GB free
  },

  render() {
    const main = document.getElementById('mainContent');
    const alerts = this._generateAlerts();
    const thresholds = this._getThresholds();
    const critical = alerts.filter(a => a.severity === 'critical');
    const warning = alerts.filter(a => a.severity === 'warning');
    const info = alerts.filter(a => a.severity === 'info');

    main.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h1 class="page-title">Alerts</h1>
          <p class="page-subtitle">${alerts.length} active alert${alerts.length !== 1 ? 's' : ''} across all tenants</p>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-ghost btn-sm" onclick="Alerts._showThresholds()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
            Thresholds
          </button>
        </div>
      </div>

      <!-- Alert Summary -->
      <div class="grid grid-4 gap-4 mb-4">
        <div class="stat-card"><div class="stat-card-value">${alerts.length}</div><div class="stat-card-label">Total Alerts</div></div>
        <div class="stat-card" style="border-left:3px solid var(--danger);"><div class="stat-card-value text-danger">${critical.length}</div><div class="stat-card-label">Critical</div></div>
        <div class="stat-card" style="border-left:3px solid var(--warning);"><div class="stat-card-value" style="color:var(--warning);">${warning.length}</div><div class="stat-card-label">Warning</div></div>
        <div class="stat-card" style="border-left:3px solid var(--primary);"><div class="stat-card-value text-primary">${info.length}</div><div class="stat-card-label">Info</div></div>
      </div>

      <!-- Alert List -->
      <div class="flex flex-col gap-3">
        ${alerts.length === 0 ? `
          <div class="card"><div class="empty-state" style="padding:3rem;">
            <div style="font-size:48px;margin-bottom:12px;">✅</div>
            <h3 class="empty-state-title">All Clear</h3>
            <p class="empty-state-text">No alerts detected. All tenants are within configured thresholds.</p>
          </div></div>
        ` : alerts.map(a => `
          <div class="card" style="border-left:4px solid ${a.severity === 'critical' ? 'var(--danger)' : a.severity === 'warning' ? 'var(--warning)' : 'var(--primary)'};">
            <div style="padding:16px;display:flex;gap:12px;align-items:flex-start;">
              <div style="font-size:24px;flex-shrink:0;">${a.icon}</div>
              <div style="flex:1;min-width:0;">
                <div class="flex items-center gap-2 mb-1">
                  <span class="badge ${a.severity === 'critical' ? 'badge-danger' : a.severity === 'warning' ? 'badge-warning' : 'badge-blue'}">${a.severity.toUpperCase()}</span>
                  <span class="chip">${a.tenant}</span>
                </div>
                <div class="fw-500" style="margin-bottom:4px;">${a.title}</div>
                <div class="text-sm text-muted">${a.description}</div>
                ${a.action ? `<button class="btn btn-sm btn-secondary mt-2" onclick="${a.action.handler}">${a.action.label}</button>` : ''}
              </div>
              <div class="text-xs text-muted" style="flex-shrink:0;">${a.metric || ''}</div>
            </div>
          </div>
        `).join('')}
      </div>

      <!-- Thresholds Modal -->
      <div class="modal-overlay hidden" id="thresholdsModal">
        <div class="modal">
          <div class="modal-header">
            <h3 class="modal-title">Alert Thresholds</h3>
            <button class="modal-close" onclick="document.getElementById('thresholdsModal').classList.add('hidden')">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div class="modal-body">
            <div class="form-group mb-3">
              <label class="form-label">Compliance threshold (%)</label>
              <input type="number" class="form-input" id="threshCompliance" value="${thresholds.complianceThreshold}" min="0" max="100">
              <span class="form-hint">Alert when tenant compliance drops below this percentage</span>
            </div>
            <div class="form-group mb-3">
              <label class="form-label">Stale device threshold (days)</label>
              <input type="number" class="form-input" id="threshStale" value="${thresholds.staleDaysThreshold}" min="1" max="90">
              <span class="form-hint">Alert when devices haven't synced in this many days</span>
            </div>
            <div class="form-group mb-3">
              <label class="form-label">Encryption coverage threshold (%)</label>
              <input type="number" class="form-input" id="threshEncryption" value="${thresholds.encryptionThreshold}" min="0" max="100">
              <span class="form-hint">Alert when encryption coverage drops below this percentage</span>
            </div>
            <div class="form-group mb-3">
              <label class="form-label">Low storage threshold (GB free)</label>
              <input type="number" class="form-input" id="threshStorage" value="${thresholds.storageThreshold}" min="1" max="100">
              <span class="form-hint">Alert when device free storage is below this amount</span>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" onclick="document.getElementById('thresholdsModal').classList.add('hidden')">Cancel</button>
            <button class="btn btn-primary" onclick="Alerts._saveThresholds()">Save Thresholds</button>
          </div>
        </div>
      </div>
    `;
  },

  _getThresholds() {
    try {
      const stored = localStorage.getItem('msp_alert_thresholds');
      return stored ? { ...this._defaults, ...JSON.parse(stored) } : { ...this._defaults };
    } catch { return { ...this._defaults }; }
  },

  _showThresholds() {
    document.getElementById('thresholdsModal')?.classList.remove('hidden');
  },

  _saveThresholds() {
    const thresholds = {
      complianceThreshold: parseInt(document.getElementById('threshCompliance')?.value) || 80,
      staleDaysThreshold: parseInt(document.getElementById('threshStale')?.value) || 7,
      encryptionThreshold: parseInt(document.getElementById('threshEncryption')?.value) || 90,
      storageThreshold: parseInt(document.getElementById('threshStorage')?.value) || 10,
    };
    localStorage.setItem('msp_alert_thresholds', JSON.stringify(thresholds));
    document.getElementById('thresholdsModal')?.classList.add('hidden');
    Toast.show('Thresholds saved', 'success');
    this.render();
  },

  _generateAlerts() {
    const thresholds = this._getThresholds();
    const tenants = AppState.get('tenants');
    const alerts = [];

    tenants.forEach(t => {
      const devices = AppState.get('devices')[t.id] || [];
      if (devices.length === 0) return;

      // Compliance check
      const compliant = devices.filter(d => d.complianceState === 'compliant').length;
      const compPct = Math.round((compliant / devices.length) * 100);
      if (compPct < thresholds.complianceThreshold) {
        alerts.push({
          severity: compPct < 50 ? 'critical' : 'warning',
          icon: '🛡',
          tenant: t.displayName,
          title: `Compliance below threshold (${compPct}%)`,
          description: `${devices.length - compliant} of ${devices.length} devices are non-compliant. Threshold: ${thresholds.complianceThreshold}%.`,
          metric: `${compPct}%`,
          action: { label: 'View Compliance', handler: "Router.navigate('compliance')" }
        });
      }

      // Stale devices
      const stale = devices.filter(d => {
        if (!d.lastSyncDateTime) return true;
        return (Date.now() - new Date(d.lastSyncDateTime).getTime()) > thresholds.staleDaysThreshold * 86400000;
      });
      if (stale.length > 0) {
        alerts.push({
          severity: stale.length > 10 ? 'critical' : 'warning',
          icon: '⏰',
          tenant: t.displayName,
          title: `${stale.length} stale device(s)`,
          description: `Devices haven't synced in ${thresholds.staleDaysThreshold}+ days. May need attention or cleanup.`,
          metric: `${stale.length} devices`,
          action: { label: 'View Devices', handler: "Router.navigate('devices')" }
        });
      }

      // Encryption check
      const encrypted = devices.filter(d => d.isEncrypted).length;
      const encPct = Math.round((encrypted / devices.length) * 100);
      if (encPct < thresholds.encryptionThreshold) {
        alerts.push({
          severity: encPct < 50 ? 'critical' : 'warning',
          icon: '🔓',
          tenant: t.displayName,
          title: `Encryption coverage low (${encPct}%)`,
          description: `${devices.length - encrypted} device(s) are not encrypted. Threshold: ${thresholds.encryptionThreshold}%.`,
          metric: `${encPct}%`,
        });
      }

      // Low storage
      const lowStorage = devices.filter(d => {
        if (!d.freeStorageSpaceInBytes) return false;
        return (d.freeStorageSpaceInBytes / 1073741824) < thresholds.storageThreshold;
      });
      if (lowStorage.length > 0) {
        alerts.push({
          severity: 'info',
          icon: '💾',
          tenant: t.displayName,
          title: `${lowStorage.length} device(s) with low storage`,
          description: `Devices with less than ${thresholds.storageThreshold}GB free space.`,
          metric: `${lowStorage.length} devices`,
          action: { label: 'View Devices', handler: "Router.navigate('devices')" }
        });
      }

      // Non-compliant spike detection
      const nonCompliant = devices.filter(d => d.complianceState === 'noncompliant').length;
      if (nonCompliant > devices.length * 0.5 && devices.length >= 5) {
        alerts.push({
          severity: 'critical',
          icon: '🚨',
          tenant: t.displayName,
          title: 'Majority of devices non-compliant',
          description: `${nonCompliant} of ${devices.length} devices (${Math.round(nonCompliant/devices.length*100)}%) are non-compliant. Check for policy issues.`,
          metric: `${nonCompliant}/${devices.length}`,
        });
      }
    });

    // Sort: critical first, then warning, then info
    const order = { critical: 0, warning: 1, info: 2 };
    return alerts.sort((a, b) => order[a.severity] - order[b.severity]);
  }
};
