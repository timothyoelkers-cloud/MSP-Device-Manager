/* ============================================================
   Webhooks — Browser notifications & webhook URL integration
   ============================================================ */

const Webhooks = {
  _storageKey: 'msp_webhooks',

  getConfig() {
    try {
      return JSON.parse(localStorage.getItem(this._storageKey) || '{}');
    } catch (e) { return {}; }
  },

  saveConfig(config) {
    localStorage.setItem(this._storageKey, JSON.stringify(config));
  },

  render() {
    const main = document.getElementById('mainContent');
    const config = this.getConfig();

    main.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h1 class="page-title">Webhook & Notifications</h1>
          <p class="page-subtitle">Configure alert delivery and browser notification settings</p>
        </div>
      </div>

      <div class="grid grid-2 gap-6">
        <!-- Browser Notifications -->
        <div class="card">
          <div class="card-header">
            <div class="card-header-title">Browser Notifications</div>
          </div>
          <div class="card-body">
            <p class="text-sm text-muted mb-4">Receive desktop notifications when alerts trigger.</p>
            <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 0;border-bottom:1px solid var(--border-light);">
              <div>
                <div class="text-sm fw-500">Desktop Notifications</div>
                <div class="text-xs text-muted">Show browser push notifications for alerts</div>
              </div>
              <input type="checkbox" class="toggle" id="webhookBrowserNotif"
                ${config.browserNotifications ? 'checked' : ''}
                onchange="Webhooks._updateConfig('browserNotifications', this.checked)">
            </div>
            <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 0;border-bottom:1px solid var(--border-light);">
              <div>
                <div class="text-sm fw-500">Non-Compliance Alerts</div>
                <div class="text-xs text-muted">Notify when devices become non-compliant</div>
              </div>
              <input type="checkbox" class="toggle" id="webhookNonCompliance"
                ${config.alertNonCompliance !== false ? 'checked' : ''}
                onchange="Webhooks._updateConfig('alertNonCompliance', this.checked)">
            </div>
            <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 0;border-bottom:1px solid var(--border-light);">
              <div>
                <div class="text-sm fw-500">Stale Device Alerts</div>
                <div class="text-xs text-muted">Notify when devices haven't synced in 7+ days</div>
              </div>
              <input type="checkbox" class="toggle"
                ${config.alertStaleDevices !== false ? 'checked' : ''}
                onchange="Webhooks._updateConfig('alertStaleDevices', this.checked)">
            </div>
            <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 0;">
              <div>
                <div class="text-sm fw-500">Token Expiry Alerts</div>
                <div class="text-xs text-muted">Notify when auth tokens are about to expire</div>
              </div>
              <input type="checkbox" class="toggle"
                ${config.alertTokenExpiry !== false ? 'checked' : ''}
                onchange="Webhooks._updateConfig('alertTokenExpiry', this.checked)">
            </div>
            <button class="btn btn-primary btn-sm mt-4" onclick="Webhooks._testBrowserNotif()">
              Test Browser Notification
            </button>
          </div>
        </div>

        <!-- Webhook URL -->
        <div class="card">
          <div class="card-header">
            <div class="card-header-title">Webhook URL</div>
          </div>
          <div class="card-body">
            <p class="text-sm text-muted mb-4">Send alert payloads to an external webhook URL (e.g., Slack, Teams, Discord).</p>
            <div class="form-group mb-4">
              <label class="form-label">Webhook URL</label>
              <input type="url" class="form-input" id="webhookUrl" value="${config.webhookUrl || ''}"
                placeholder="https://hooks.slack.com/services/...">
              <span class="form-hint">Alerts will POST JSON payloads to this URL.</span>
            </div>
            <div class="form-group mb-4">
              <label class="form-label">Webhook Secret (optional)</label>
              <input type="text" class="form-input" id="webhookSecret" value="${config.webhookSecret || ''}"
                placeholder="Optional shared secret for verification">
            </div>
            <div style="display:flex;gap:8px;">
              <button class="btn btn-primary btn-sm" onclick="Webhooks._saveWebhookUrl()">Save</button>
              <button class="btn btn-secondary btn-sm" onclick="Webhooks._testWebhook()">Test Webhook</button>
            </div>

            <div class="detail-section mt-6">
              <div class="detail-section-title">Payload Format</div>
              <pre style="background:var(--gray-50);padding:12px;border-radius:8px;font-size:11px;overflow-x:auto;max-height:200px;">{
  "type": "alert",
  "severity": "warning",
  "title": "Non-Compliant Device",
  "message": "Device XYZ is non-compliant",
  "tenant": "Contoso",
  "timestamp": "2026-03-13T10:00:00Z"
}</pre>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  _updateConfig(key, value) {
    const config = this.getConfig();
    config[key] = value;
    this.saveConfig(config);

    if (key === 'browserNotifications' && value) {
      Notifications.requestPermission();
    }
  },

  _saveWebhookUrl() {
    const config = this.getConfig();
    config.webhookUrl = document.getElementById('webhookUrl')?.value || '';
    config.webhookSecret = document.getElementById('webhookSecret')?.value || '';
    this.saveConfig(config);
    Toast.show('Webhook settings saved', 'success');
  },

  _testBrowserNotif() {
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification('MSP Device Manager', {
          body: 'This is a test notification. Alerts will appear like this.',
          icon: '/favicon.ico'
        });
        Toast.show('Test notification sent', 'success');
      } else {
        Notification.requestPermission().then(p => {
          if (p === 'granted') {
            new Notification('MSP Device Manager', {
              body: 'Notifications enabled! Alerts will appear like this.',
              icon: '/favicon.ico'
            });
          } else {
            Toast.show('Notification permission denied by browser', 'warning');
          }
        });
      }
    } else {
      Toast.show('Browser notifications not supported', 'warning');
    }
  },

  async _testWebhook() {
    const config = this.getConfig();
    if (!config.webhookUrl) {
      Toast.show('Please enter a webhook URL first', 'warning');
      return;
    }

    const payload = {
      type: 'test',
      severity: 'info',
      title: 'Test Alert',
      message: 'This is a test webhook from MSP Device Manager',
      tenant: 'Test',
      timestamp: new Date().toISOString()
    };

    try {
      const resp = await fetch(config.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        mode: 'no-cors' // Most webhooks won't have CORS
      });
      Toast.show('Test webhook sent (check your endpoint)', 'success');
    } catch (e) {
      Toast.show('Failed to send webhook: ' + e.message, 'error');
    }
  },

  // Called by Notifications/Alerts to fire webhook
  async fire(alert) {
    const config = this.getConfig();
    if (!config.webhookUrl) return;

    try {
      await fetch(config.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...alert,
          timestamp: new Date().toISOString(),
          source: 'MSP Device Manager'
        }),
        mode: 'no-cors'
      });
    } catch (e) {
      console.warn('Webhook fire failed:', e);
    }
  }
};
