/* ============================================================
   DashboardWidgets — Customizable, reorderable dashboard cards
   ============================================================ */

const DashboardWidgets = {
  _storageKey: 'msp_dashboard_widgets',

  // Available widget definitions
  _widgets: {
    kpis:           { id: 'kpis',           label: 'Key Metrics',        icon: '&#128202;', default: true },
    complianceChart:{ id: 'complianceChart', label: 'Compliance Chart',   icon: '&#128200;', default: true },
    platformChart:  { id: 'platformChart',  label: 'Platform Mix',       icon: '&#128187;', default: true },
    encryptionBars: { id: 'encryptionBars', label: 'Encryption & Sync',  icon: '&#128274;', default: true },
    tenantHealth:   { id: 'tenantHealth',   label: 'Tenant Health',      icon: '&#127973;', default: true },
    staleDevices:   { id: 'staleDevices',   label: 'Stale Devices',      icon: '&#9888;',   default: true },
    recentActivity: { id: 'recentActivity', label: 'Recent Activity',    icon: '&#128336;', default: true },
    quickActions:   { id: 'quickActions',    label: 'Quick Actions',      icon: '&#9889;',   default: true },
    policyWizard:   { id: 'policyWizard',   label: 'Policy Wizard',      icon: '&#128296;', default: false },
    healthScore:    { id: 'healthScore',     label: 'Health Score',       icon: '&#128154;', default: false },
  },

  // Get user's widget config (order + visibility)
  getConfig() {
    try {
      const saved = JSON.parse(localStorage.getItem(this._storageKey));
      if (saved && Array.isArray(saved)) return saved;
    } catch {}
    // Default: all default widgets in order
    return Object.values(this._widgets).filter(w => w.default).map(w => ({ id: w.id, visible: true }));
  },

  _save(config) {
    localStorage.setItem(this._storageKey, JSON.stringify(config));
  },

  // Show customization modal
  showCustomizer() {
    const config = this.getConfig();
    const allWidgets = Object.values(this._widgets);

    // Build list of current + available
    const configIds = new Set(config.map(c => c.id));
    const fullList = [
      ...config.map(c => ({ ...c, ...this._widgets[c.id] })),
      ...allWidgets.filter(w => !configIds.has(w.id)).map(w => ({ ...w, visible: false }))
    ];

    document.getElementById('widgetCustomizer')?.remove();
    const modal = document.createElement('div');
    modal.id = 'widgetCustomizer';
    modal.className = 'modal-overlay';
    modal.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.4);';
    modal.innerHTML = `
      <div class="modal" style="max-width:480px;width:95%;">
        <div class="modal-header">
          <h3 class="modal-title">Customize Dashboard</h3>
          <button class="modal-close" onclick="document.getElementById('widgetCustomizer').remove()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="modal-body" style="padding:12px 20px;">
          <p class="text-sm text-muted mb-3">Toggle widgets on/off and drag to reorder. Changes apply immediately.</p>
          <div id="widgetList" style="display:flex;flex-direction:column;gap:4px;">
            ${fullList.map((w, i) => `
              <div class="widget-list-item" draggable="true" data-idx="${i}" data-id="${w.id}"
                style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-sm);cursor:grab;user-select:none;transition:background 0.15s;">
                <span style="cursor:grab;color:var(--ink-muted);font-size:14px;">&#9776;</span>
                <span style="font-size:16px;">${w.icon || '&#9632;'}</span>
                <span style="flex:1;font-size:var(--text-sm);font-weight:500;color:var(--ink);">${w.label}</span>
                <label class="toggle-switch" style="margin:0;">
                  <input type="checkbox" ${w.visible ? 'checked' : ''} onchange="DashboardWidgets._toggleWidget('${w.id}', this.checked)">
                  <span class="toggle-slider"></span>
                </label>
              </div>
            `).join('')}
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost btn-sm" onclick="DashboardWidgets._resetDefaults()">Reset to Defaults</button>
          <button class="btn btn-primary" onclick="document.getElementById('widgetCustomizer').remove(); Dashboard.render();">Done</button>
        </div>
      </div>
    `;
    modal.addEventListener('click', e => { if (e.target === modal) { modal.remove(); Dashboard.render(); } });
    document.body.appendChild(modal);

    // Drag-and-drop reordering
    this._initDragDrop();
  },

  _initDragDrop() {
    const list = document.getElementById('widgetList');
    if (!list) return;
    let dragIdx = null;

    list.querySelectorAll('.widget-list-item').forEach(item => {
      item.addEventListener('dragstart', e => {
        dragIdx = parseInt(e.target.dataset.idx);
        e.target.style.opacity = '0.5';
        e.dataTransfer.effectAllowed = 'move';
      });
      item.addEventListener('dragend', e => {
        e.target.style.opacity = '1';
        dragIdx = null;
      });
      item.addEventListener('dragover', e => {
        e.preventDefault();
        e.target.closest('.widget-list-item').style.borderTopColor = 'var(--primary)';
      });
      item.addEventListener('dragleave', e => {
        e.target.closest('.widget-list-item').style.borderTopColor = '';
      });
      item.addEventListener('drop', e => {
        e.preventDefault();
        const dropIdx = parseInt(e.target.closest('.widget-list-item').dataset.idx);
        e.target.closest('.widget-list-item').style.borderTopColor = '';
        if (dragIdx !== null && dragIdx !== dropIdx) {
          this._reorder(dragIdx, dropIdx);
        }
      });
    });
  },

  _reorder(fromIdx, toIdx) {
    const config = this.getConfig();
    const allWidgets = Object.values(this._widgets);
    const configIds = new Set(config.map(c => c.id));
    const fullList = [
      ...config,
      ...allWidgets.filter(w => !configIds.has(w.id)).map(w => ({ id: w.id, visible: false }))
    ];

    const [moved] = fullList.splice(fromIdx, 1);
    fullList.splice(toIdx, 0, moved);

    this._save(fullList.map(w => ({ id: w.id, visible: w.visible })));
    // Re-render customizer
    this.showCustomizer();
  },

  _toggleWidget(id, visible) {
    const config = this.getConfig();
    const existing = config.find(c => c.id === id);
    if (existing) {
      existing.visible = visible;
    } else {
      config.push({ id, visible });
    }
    this._save(config);
  },

  _resetDefaults() {
    localStorage.removeItem(this._storageKey);
    Toast.show('Dashboard reset to defaults', 'info');
    document.getElementById('widgetCustomizer')?.remove();
    Dashboard.render();
  },

  // Check if a widget is visible
  isVisible(widgetId) {
    const config = this.getConfig();
    const item = config.find(c => c.id === widgetId);
    return item ? item.visible : (this._widgets[widgetId]?.default ?? false);
  },

  // Get ordered list of visible widget IDs
  getVisibleOrder() {
    const config = this.getConfig();
    return config.filter(c => c.visible).map(c => c.id);
  }
};
