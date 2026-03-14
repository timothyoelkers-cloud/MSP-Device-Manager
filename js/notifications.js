/* ============================================================
   Notifications — Real-time polling & notification panel
   ============================================================ */

const Notifications = {
  _items: [],
  _pollInterval: null,
  _pollMs: 60000, // 1 minute
  _maxItems: 50,
  _panelOpen: false,

  init() {
    this._restore();
    this._startPolling();
  },

  _restore() {
    try {
      const saved = localStorage.getItem('msp_notifications');
      if (saved) this._items = JSON.parse(saved);
    } catch (e) {}
  },

  _persist() {
    try {
      localStorage.setItem('msp_notifications', JSON.stringify(this._items.slice(0, this._maxItems)));
    } catch (e) {}
  },

  _startPolling() {
    if (this._pollInterval) clearInterval(this._pollInterval);
    this._pollInterval = setInterval(() => this.poll(), this._pollMs);
  },

  stopPolling() {
    if (this._pollInterval) {
      clearInterval(this._pollInterval);
      this._pollInterval = null;
    }
  },

  async poll() {
    if (!AppState.get('isAuthenticated')) return;
    const tenants = AppState.get('tenants');
    if (!tenants.length) return;

    for (const t of tenants) {
      const devices = AppState.get('devices')[t.id] || [];
      const now = Date.now();

      // Check for newly non-compliant devices
      devices.forEach(d => {
        if (d.complianceState === 'noncompliant') {
          const key = `noncompliant_${d.id}`;
          if (!this._items.find(n => n.key === key && (now - n.timestamp) < 3600000)) {
            this.add({
              key,
              type: 'warning',
              title: 'Non-Compliant Device',
              message: `${d.deviceName || 'Unknown'} in ${AppState.getTenantName(t.id)} is non-compliant`,
              tenantId: t.id,
              deviceId: d.id,
              action: 'devices'
            });
          }
        }

        // Stale device check
        if (d.lastSyncDateTime) {
          const age = (now - new Date(d.lastSyncDateTime).getTime()) / 86400000;
          if (age > 7) {
            const key = `stale_${d.id}`;
            if (!this._items.find(n => n.key === key && (now - n.timestamp) < 86400000)) {
              this.add({
                key,
                type: 'info',
                title: 'Stale Device',
                message: `${d.deviceName || 'Unknown'} hasn't synced in ${Math.floor(age)} days`,
                tenantId: t.id,
                deviceId: d.id,
                action: 'devices'
              });
            }
          }
        }
      });
    }

    this._updateBadge();
  },

  add(notification) {
    this._items.unshift({
      id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2),
      ...notification,
      timestamp: Date.now(),
      read: false
    });
    if (this._items.length > this._maxItems) this._items = this._items.slice(0, this._maxItems);
    this._persist();
    this._updateBadge();

    // Browser notification if permitted
    if (Notification.permission === 'granted' && notification.type === 'warning') {
      try {
        new Notification('MSP Device Manager', { body: notification.message, icon: '/favicon.ico' });
      } catch (e) {}
    }
  },

  getUnreadCount() {
    return this._items.filter(n => !n.read).length;
  },

  markAllRead() {
    this._items.forEach(n => n.read = true);
    this._persist();
    this._updateBadge();
    if (this._panelOpen) this.renderPanel();
  },

  markRead(id) {
    const item = this._items.find(n => n.id === id);
    if (item) {
      item.read = true;
      this._persist();
      this._updateBadge();
    }
  },

  clear() {
    this._items = [];
    this._persist();
    this._updateBadge();
    if (this._panelOpen) this.renderPanel();
  },

  _updateBadge() {
    const dot = document.getElementById('notifDot');
    const count = this.getUnreadCount();
    if (dot) dot.style.display = count > 0 ? 'block' : 'none';
  },

  toggle() {
    this._panelOpen = !this._panelOpen;
    if (this._panelOpen) {
      this.renderPanel();
    } else {
      const panel = document.getElementById('notifPanel');
      if (panel) panel.remove();
    }
  },

  renderPanel() {
    let panel = document.getElementById('notifPanel');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'notifPanel';
      panel.style.cssText = 'position:fixed;top:var(--topbar-h);right:16px;width:380px;max-height:500px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);box-shadow:var(--shadow-xl);z-index:900;display:flex;flex-direction:column;animation:scaleIn 0.15s var(--ease);';
      document.body.appendChild(panel);
    }

    const unread = this.getUnreadCount();
    const icons = {
      warning: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--warning)" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
      error: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
      success: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--success)" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
      info: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
    };

    panel.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid var(--border-light);">
        <div style="font-weight:600;font-size:var(--text-sm);">Notifications ${unread > 0 ? `<span class="badge badge-primary" style="margin-left:6px;">${unread}</span>` : ''}</div>
        <div style="display:flex;gap:8px;">
          ${unread > 0 ? `<button class="btn btn-ghost btn-sm" onclick="Notifications.markAllRead()">Mark all read</button>` : ''}
          ${this._items.length > 0 ? `<button class="btn btn-ghost btn-sm" onclick="Notifications.clear()">Clear</button>` : ''}
          <button class="btn btn-ghost btn-sm" onclick="Notifications.toggle()" style="padding:4px;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </div>
      <div style="overflow-y:auto;flex:1;max-height:420px;">
        ${this._items.length === 0 ? `
          <div style="padding:40px 16px;text-align:center;color:var(--ink-tertiary);font-size:var(--text-sm);">No notifications</div>
        ` : this._items.slice(0, 20).map(n => `
          <div style="display:flex;gap:10px;padding:10px 16px;border-bottom:1px solid var(--border-light);cursor:pointer;background:${n.read ? 'transparent' : 'var(--primary-bg)'};"
               onclick="Notifications.markRead('${n.id}'); ${n.action ? `Router.navigate('${n.action}');` : ''} Notifications.toggle();">
            <div style="flex-shrink:0;margin-top:2px;">${icons[n.type] || icons.info}</div>
            <div style="flex:1;min-width:0;">
              <div style="font-size:var(--text-xs);font-weight:600;color:var(--ink);">${n.title}</div>
              <div style="font-size:var(--text-xs);color:var(--ink-secondary);margin-top:1px;">${n.message}</div>
              <div style="font-size:10px;color:var(--ink-tertiary);margin-top:4px;">${this._timeAgo(n.timestamp)}</div>
            </div>
            ${!n.read ? '<div style="width:6px;height:6px;border-radius:50%;background:var(--primary);flex-shrink:0;margin-top:6px;"></div>' : ''}
          </div>
        `).join('')}
      </div>
      ${this._items.length > 0 ? `
        <div style="padding:8px 16px;border-top:1px solid var(--border-light);text-align:center;">
          <button class="btn btn-ghost btn-sm" onclick="Notifications.requestPermission()">Enable browser notifications</button>
        </div>
      ` : ''}
    `;
  },

  _timeAgo(ts) {
    const diff = Date.now() - ts;
    const min = Math.floor(diff / 60000);
    if (min < 1) return 'Just now';
    if (min < 60) return `${min}m ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h ago`;
    return `${Math.floor(hr / 24)}d ago`;
  },

  requestPermission() {
    if ('Notification' in window) {
      Notification.requestPermission().then(p => {
        Toast.show(p === 'granted' ? 'Browser notifications enabled' : 'Notifications blocked', p === 'granted' ? 'success' : 'warning');
      });
    }
  }
};

// Close panel on outside click
document.addEventListener('click', (e) => {
  if (Notifications._panelOpen) {
    const panel = document.getElementById('notifPanel');
    const btn = e.target.closest('[onclick*="toggleNotifications"]');
    if (panel && !panel.contains(e.target) && !btn) {
      Notifications.toggle();
    }
  }
});
