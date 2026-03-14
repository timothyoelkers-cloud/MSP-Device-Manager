/* ============================================================
   NotifPrefs — Notification preferences & daily digest
   ============================================================ */

const NotifPrefs = {
  _storageKey: 'msp_notif_prefs',
  _digestKey: 'msp_notif_digest',

  _defaultPrefs: {
    compliance: true,
    staleDevices: true,
    offboardingDue: true,
    warrantyExpiring: true,
    licenseOverAlloc: true,
    newDeviceEnroll: false,
    syncFailures: true,
    securityAlerts: true,
    digestEnabled: true,
    digestFrequency: 'daily', // daily | weekly
  },

  render() {
    const main = document.getElementById('mainContent');
    const prefs = this._getPrefs();
    const digest = this._getDigest();

    const categories = [
      { id: 'compliance', label: 'Compliance Violations', desc: 'Alert when devices become non-compliant', icon: '&#128737;' },
      { id: 'staleDevices', label: 'Stale Devices', desc: 'Devices not synced in 7+ days', icon: '&#9888;' },
      { id: 'offboardingDue', label: 'Offboarding Due', desc: 'Scheduled offboardings reaching their date', icon: '&#128100;' },
      { id: 'warrantyExpiring', label: 'Warranty Expiring', desc: 'Devices with warranty expiring in 90 days', icon: '&#128197;' },
      { id: 'licenseOverAlloc', label: 'License Over-Allocation', desc: 'License SKUs exceeding purchased count', icon: '&#128196;' },
      { id: 'newDeviceEnroll', label: 'New Device Enrollments', desc: 'When new devices enroll in Intune', icon: '&#128187;' },
      { id: 'syncFailures', label: 'Sync Failures', desc: 'Device sync failures and errors', icon: '&#10060;' },
      { id: 'securityAlerts', label: 'Security Alerts', desc: 'Security baseline violations and threats', icon: '&#128274;' },
    ];

    main.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h1 class="page-title">Notification Preferences</h1>
          <p class="page-subtitle">Configure which alerts matter to you and view your activity digest</p>
        </div>
      </div>

      <div class="grid grid-2 gap-6">
        <!-- Preferences -->
        <div class="card">
          <div class="card-header"><div class="card-header-title">Alert Categories</div></div>
          <div class="card-body" style="padding:0;">
            ${categories.map(c => `
              <label style="display:flex;align-items:center;gap:12px;padding:12px 20px;border-bottom:1px solid var(--border-light);cursor:pointer;"
                onmouseover="this.style.background='var(--gray-50)'" onmouseout="this.style.background=''">
                <span style="font-size:20px;flex-shrink:0;">${c.icon}</span>
                <div style="flex:1;">
                  <div class="text-sm fw-500">${c.label}</div>
                  <div class="text-xs text-muted">${c.desc}</div>
                </div>
                <label class="toggle-switch">
                  <input type="checkbox" ${prefs[c.id] ? 'checked' : ''}
                    onchange="NotifPrefs._toggle('${c.id}', this.checked)">
                  <span class="toggle-slider"></span>
                </label>
              </label>
            `).join('')}
          </div>
        </div>

        <!-- Digest Settings & Preview -->
        <div>
          <div class="card mb-4">
            <div class="card-header"><div class="card-header-title">Digest Settings</div></div>
            <div class="card-body">
              <label style="display:flex;align-items:center;gap:12px;margin-bottom:16px;cursor:pointer;">
                <div style="flex:1;">
                  <div class="text-sm fw-500">Enable Activity Digest</div>
                  <div class="text-xs text-muted">Summary of all notifications since last check</div>
                </div>
                <label class="toggle-switch">
                  <input type="checkbox" ${prefs.digestEnabled ? 'checked' : ''}
                    onchange="NotifPrefs._toggle('digestEnabled', this.checked)">
                  <span class="toggle-slider"></span>
                </label>
              </label>
              <button class="btn btn-primary btn-sm w-full" onclick="NotifPrefs._generateDigest()">Generate Digest Now</button>
            </div>
          </div>

          <!-- Latest Digest -->
          <div class="card">
            <div class="card-header">
              <div class="card-header-title">Latest Digest</div>
              ${digest.length > 0 ? `<button class="btn btn-ghost btn-sm" onclick="NotifPrefs._clearDigest()">Clear</button>` : ''}
            </div>
            <div class="card-body" style="max-height:400px;overflow-y:auto;">
              ${digest.length === 0 ? '<div class="text-sm text-muted">No digest generated yet. Click "Generate Digest Now" above.</div>' : `
                ${digest.map(d => `
                  <div style="display:flex;gap:8px;padding:8px 0;border-bottom:1px solid var(--border-light);">
                    <span style="font-size:14px;flex-shrink:0;">${d.icon}</span>
                    <div>
                      <div class="text-sm fw-500">${d.title}</div>
                      <div class="text-xs text-muted">${d.detail}</div>
                    </div>
                  </div>
                `).join('')}
              `}
            </div>
          </div>
        </div>
      </div>
    `;
  },

  _getPrefs() {
    try {
      return { ...this._defaultPrefs, ...JSON.parse(localStorage.getItem(this._storageKey) || '{}') };
    } catch { return { ...this._defaultPrefs }; }
  },

  _toggle(key, val) {
    const prefs = this._getPrefs();
    prefs[key] = val;
    localStorage.setItem(this._storageKey, JSON.stringify(prefs));
  },

  _getDigest() {
    try { return JSON.parse(localStorage.getItem(this._digestKey) || '[]'); } catch { return []; }
  },

  _clearDigest() {
    localStorage.removeItem(this._digestKey);
    Toast.show('Digest cleared', 'success');
    this.render();
  },

  _generateDigest() {
    const prefs = this._getPrefs();
    const tenants = AppState.get('tenants');
    const digest = [];

    tenants.forEach(t => {
      const devices = AppState.get('devices')[t.id] || [];
      const users = AppState.get('users')[t.id] || [];

      if (prefs.compliance) {
        const nc = devices.filter(d => d.complianceState === 'noncompliant').length;
        if (nc > 0) digest.push({ icon: '&#128737;', title: `${nc} non-compliant device(s)`, detail: t.displayName });
      }

      if (prefs.staleDevices) {
        const stale = devices.filter(d => {
          if (!d.lastSyncDateTime) return true;
          return (Date.now() - new Date(d.lastSyncDateTime).getTime()) > 7 * 86400000;
        }).length;
        if (stale > 0) digest.push({ icon: '&#9888;', title: `${stale} stale device(s)`, detail: `${t.displayName} — not synced in 7+ days` });
      }

      if (prefs.offboardingDue && typeof Offboarding !== 'undefined') {
        const pending = (JSON.parse(localStorage.getItem('msp_offboard_queue') || '[]'))
          .filter(o => o.tenantId === t.id && new Date(o.scheduledDate) <= new Date()).length;
        if (pending > 0) digest.push({ icon: '&#128100;', title: `${pending} offboarding(s) due`, detail: t.displayName });
      }

      if (prefs.warrantyExpiring) {
        try {
          const meta = JSON.parse(localStorage.getItem('msp_asset_metadata') || '{}');
          const expiring = devices.filter(d => {
            const w = meta[d.id]?.warrantyEnd;
            if (!w) return false;
            const days = (new Date(w) - Date.now()) / 86400000;
            return days > 0 && days <= 90;
          }).length;
          if (expiring > 0) digest.push({ icon: '&#128197;', title: `${expiring} warranty(ies) expiring soon`, detail: t.displayName });
        } catch {}
      }

      if (prefs.licenseOverAlloc) {
        ((AppState.get('subscribedSkus') || {})[t.id] || []).forEach(s => {
          const purchased = s.prepaidUnits?.enabled || 0;
          if (purchased > 0 && (s.consumedUnits || 0) > purchased) {
            const name = typeof Licenses !== 'undefined' ? Licenses.getSkuName(s.skuId) : s.skuPartNumber || s.skuId;
            digest.push({ icon: '&#128196;', title: `License over-allocated: ${name}`, detail: `${t.displayName} — ${s.consumedUnits}/${purchased}` });
          }
        });
      }

      if (prefs.securityAlerts) {
        const unencrypted = devices.filter(d => !d.isEncrypted).length;
        if (unencrypted > 0) digest.push({ icon: '&#128274;', title: `${unencrypted} unencrypted device(s)`, detail: t.displayName });
      }
    });

    localStorage.setItem(this._digestKey, JSON.stringify(digest));
    Toast.show(`Digest generated: ${digest.length} item(s)`, 'success');
    this.render();
  },

  // Check if any notifications should be shown (called from Notifications.poll)
  getActiveAlerts() {
    const prefs = this._getPrefs();
    const alerts = [];
    const tenants = AppState.get('tenants');

    tenants.forEach(t => {
      const devices = AppState.get('devices')[t.id] || [];
      if (prefs.compliance) {
        const nc = devices.filter(d => d.complianceState === 'noncompliant').length;
        if (nc > 0) alerts.push({ type: 'compliance', count: nc, tenant: t.displayName });
      }
      if (prefs.staleDevices) {
        const stale = devices.filter(d => !d.lastSyncDateTime || (Date.now() - new Date(d.lastSyncDateTime).getTime()) > 7 * 86400000).length;
        if (stale > 0) alerts.push({ type: 'stale', count: stale, tenant: t.displayName });
      }
    });

    return alerts;
  }
};
