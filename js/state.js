/* ============================================================
   State Management — Reactive global state with persistence
   ============================================================ */

const AppState = {
  _listeners: {},
  _state: {
    // Auth
    isAuthenticated: false,
    authMode: null, // 'single' | 'partner'
    account: null,
    accessTokens: {}, // tenantId -> token

    // Tenants
    tenants: [],
    activeTenant: 'all', // 'all' or tenantId

    // License
    licenseTier: 'free', // 'free' | 'pro'
    licenseKey: null,
    maxTenantsForFree: 3,

    // Data caches (per tenant)
    devices: {},
    compliancePolicies: {},
    configProfiles: {},
    securityPolicies: {},
    apps: {},
    autopilotDevices: {},
    updateRings: {},
    groups: {},

    // UI state
    currentPage: 'dashboard',
    sidebarCollapsed: false,
    selectedDevices: [],
    deviceDetailId: null,
    loading: {}
  },

  get(key) {
    return this._state[key];
  },

  set(key, value) {
    const old = this._state[key];
    this._state[key] = value;
    if (this._listeners[key]) {
      this._listeners[key].forEach(fn => fn(value, old));
    }
    // Persist certain keys
    const persistKeys = ['licenseTier', 'licenseKey', 'tenants', 'activeTenant'];
    if (persistKeys.includes(key)) {
      try { localStorage.setItem('msp_' + key, JSON.stringify(value)); } catch(e) {}
    }
  },

  on(key, fn) {
    if (!this._listeners[key]) this._listeners[key] = [];
    this._listeners[key].push(fn);
    return () => {
      this._listeners[key] = this._listeners[key].filter(f => f !== fn);
    };
  },

  // Convenience: set active tenant and update UI
  setActiveTenant(tenantId) {
    this.set('activeTenant', tenantId);
    const name = tenantId === 'all' ? 'All Tenants' :
      (this._state.tenants.find(t => t.id === tenantId)?.displayName || tenantId);
    document.getElementById('activeTenantName').textContent = name;
    document.getElementById('sidebarTenantFilter').value = tenantId;
    // Re-render current page
    Router.render(this._state.currentPage);
  },

  // Set loading state for a key
  setLoading(key, val) {
    const loading = { ...this._state.loading, [key]: val };
    this.set('loading', loading);
  },

  isLoading(key) {
    return !!this._state.loading[key];
  },

  // Restore persisted state
  restore() {
    ['licenseTier', 'licenseKey', 'activeTenant'].forEach(key => {
      try {
        const v = localStorage.getItem('msp_' + key);
        if (v) this._state[key] = JSON.parse(v);
      } catch(e) {}
    });
    // Restore tenants
    try {
      const t = localStorage.getItem('msp_tenants');
      if (t) this._state.tenants = JSON.parse(t);
    } catch(e) {}
  },

  // Get devices for current tenant context
  getDevicesForContext() {
    const active = this._state.activeTenant;
    if (active === 'all') {
      // Merge all tenant devices
      const all = [];
      Object.entries(this._state.devices).forEach(([tid, devs]) => {
        devs.forEach(d => all.push({ ...d, _tenantId: tid }));
      });
      return all;
    }
    return (this._state.devices[active] || []).map(d => ({ ...d, _tenantId: active }));
  },

  // Get data for context (generic)
  getForContext(dataKey) {
    const active = this._state.activeTenant;
    if (active === 'all') {
      const all = [];
      Object.entries(this._state[dataKey] || {}).forEach(([tid, items]) => {
        (items || []).forEach(item => all.push({ ...item, _tenantId: tid }));
      });
      return all;
    }
    return (this._state[dataKey]?.[active] || []).map(d => ({ ...d, _tenantId: active }));
  },

  getTenantName(tenantId) {
    const t = this._state.tenants.find(t => t.id === tenantId);
    return t?.displayName || tenantId?.substring(0, 8) + '...';
  }
};

// Restore on load
AppState.restore();

/* --- Toast Notifications --- */
const Toast = {
  show(message, type = 'info', title = null, duration = 4000) {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const icons = {
      success: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
      error: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
      warning: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
      info: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
    };

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <span class="toast-icon">${icons[type] || icons.info}</span>
      <div class="toast-content">
        ${title ? `<div class="toast-title">${title}</div>` : ''}
        <div class="toast-message">${message}</div>
      </div>
      <span class="toast-close" onclick="this.closest('.toast').remove()">&#10005;</span>
    `;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(20px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }
};

/* --- Skeleton Loading States --- */
const Skeleton = {
  // Returns HTML for a skeleton card grid (n cards)
  cards(n = 4) {
    let html = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:16px;padding:16px 0;">';
    for (let i = 0; i < n; i++) {
      html += `
        <div class="skeleton skeleton-card" style="padding:20px;height:auto;min-height:120px;display:flex;flex-direction:column;gap:12px;">
          <div class="skeleton skeleton-title" style="width:${50 + Math.random() * 30}%"></div>
          <div class="skeleton skeleton-text"></div>
          <div class="skeleton skeleton-text"></div>
          <div class="skeleton skeleton-text" style="width:60%"></div>
        </div>`;
    }
    html += '</div>';
    return html;
  },

  // Returns HTML for a skeleton table (n rows, cols columns)
  table(n = 5, cols = 6) {
    let html = '<div style="padding:16px 0;"><div class="skeleton skeleton-title" style="margin-bottom:16px;"></div>';
    html += '<div style="display:flex;flex-direction:column;gap:8px;">';
    // Header row
    html += '<div style="display:flex;gap:12px;padding:12px 0;border-bottom:1px solid var(--border);">';
    for (let c = 0; c < cols; c++) {
      html += `<div class="skeleton skeleton-text" style="flex:1;height:16px;width:auto;margin:0;"></div>`;
    }
    html += '</div>';
    // Data rows
    for (let r = 0; r < n; r++) {
      html += '<div style="display:flex;gap:12px;padding:10px 0;border-bottom:1px solid var(--border);">';
      for (let c = 0; c < cols; c++) {
        html += `<div class="skeleton skeleton-text" style="flex:1;height:14px;width:auto;margin:0;"></div>`;
      }
      html += '</div>';
    }
    html += '</div></div>';
    return html;
  },

  // Returns HTML for skeleton stat cards (n cards)
  stats(n = 4) {
    let html = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:16px;padding:16px 0;">';
    for (let i = 0; i < n; i++) {
      html += `
        <div class="skeleton skeleton-card" style="padding:20px;height:auto;min-height:90px;display:flex;flex-direction:column;gap:10px;">
          <div class="skeleton skeleton-text" style="width:50%;height:12px;"></div>
          <div class="skeleton skeleton-title" style="width:35%;height:32px;margin-bottom:0;"></div>
          <div class="skeleton skeleton-text" style="width:70%;height:10px;"></div>
        </div>`;
    }
    html += '</div>';
    return html;
  },

  // Returns HTML for a single skeleton detail section
  detail() {
    return `
      <div style="padding:16px 0;display:flex;flex-direction:column;gap:16px;">
        <div class="skeleton skeleton-title" style="width:60%;"></div>
        <div style="display:flex;gap:12px;align-items:center;">
          <div class="skeleton skeleton-avatar"></div>
          <div style="flex:1;display:flex;flex-direction:column;gap:6px;">
            <div class="skeleton skeleton-text" style="width:40%;"></div>
            <div class="skeleton skeleton-text" style="width:25%;"></div>
          </div>
        </div>
        <div class="skeleton skeleton-card" style="height:80px;"></div>
        <div style="display:flex;flex-direction:column;gap:8px;">
          <div class="skeleton skeleton-text"></div>
          <div class="skeleton skeleton-text"></div>
          <div class="skeleton skeleton-text" style="width:75%;"></div>
          <div class="skeleton skeleton-text" style="width:50%;"></div>
        </div>
        <div class="skeleton skeleton-card" style="height:60px;"></div>
      </div>`;
  }
};
