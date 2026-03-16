/* ============================================================
   Dashboard Customizer — Drag-and-drop widget layout manager
   Allows users to toggle, resize, and reorder dashboard widgets.
   Persists layout to localStorage.
   ============================================================ */

const DashboardCustomizer = {

  STORAGE_KEY: 'dashboard_widget_layout',

  /* ---- Default widget definitions ---- */
  _defaults: [
    { id: 'device-overview',    title: 'Device Overview',    size: 'medium', visible: true, order: 0 },
    { id: 'compliance-status',  title: 'Compliance Status',  size: 'medium', visible: true, order: 1 },
    { id: 'recent-alerts',      title: 'Recent Alerts',      size: 'medium', visible: true, order: 2 },
    { id: 'sync-health',        title: 'Sync Health',        size: 'medium', visible: true, order: 3 },
    { id: 'license-usage',      title: 'License Usage',      size: 'small',  visible: true, order: 4 },
    { id: 'security-score',     title: 'Security Score',     size: 'small',  visible: true, order: 5 },
    { id: 'os-distribution',    title: 'OS Distribution',    size: 'small',  visible: true, order: 6 },
    { id: 'top-apps',           title: 'Top Apps',           size: 'small',  visible: true, order: 7 }
  ],

  /* ---- Internal state ---- */
  _layout: null,
  _dragSrcIndex: null,

  /* ---- Initialise / load layout ---- */
  _ensureLoaded() {
    if (this._layout) return;
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Merge with defaults in case new widgets were added
          const knownIds = new Set(parsed.map(w => w.id));
          const merged = parsed.map(w => {
            const def = this._defaults.find(d => d.id === w.id);
            return def ? { ...def, ...w } : w;
          });
          // Append any new defaults not yet in saved layout
          this._defaults.forEach(d => {
            if (!knownIds.has(d.id)) {
              merged.push({ ...d, order: merged.length });
            }
          });
          this._layout = merged.sort((a, b) => a.order - b.order);
          return;
        }
      }
    } catch (e) {
      // Ignore corrupt data
    }
    this._layout = this._defaults.map(w => ({ ...w }));
  },

  /* ---- Public API ---- */

  /** Returns a sorted copy of the current widget layout array. */
  getLayout() {
    this._ensureLoaded();
    return this._layout
      .slice()
      .sort((a, b) => a.order - b.order)
      .map(w => ({ ...w }));
  },

  /**
   * Rearrange child elements inside a container to match the saved layout.
   * Expects the container to have children whose `data-widget-id` attribute
   * matches a widget id in the layout.  Hidden widgets get `display:none`.
   * Size is applied via data-widget-size and a grid-column span class.
   */
  applyLayout(containerId) {
    this._ensureLoaded();
    const container = document.getElementById(containerId);
    if (!container) return;

    const layout = this.getLayout();
    const sizeMap = { small: '1', medium: '2', large: 'full' };

    // Collect existing widget elements by id
    const elementMap = {};
    Array.from(container.children).forEach(el => {
      const wid = el.getAttribute('data-widget-id');
      if (wid) elementMap[wid] = el;
    });

    // Re-append in layout order and apply visibility + sizing
    layout.forEach(w => {
      const el = elementMap[w.id];
      if (!el) return;

      el.style.display = w.visible ? '' : 'none';
      el.setAttribute('data-widget-size', w.size);

      // Apply grid column span
      if (w.size === 'large') {
        el.style.gridColumn = '1 / -1';
      } else if (w.size === 'medium') {
        el.style.gridColumn = 'span 2';
      } else {
        el.style.gridColumn = 'span 1';
      }

      container.appendChild(el); // moves existing element to end
    });
  },

  /* ---- Persist to localStorage ---- */
  _save() {
    this._layout.forEach((w, i) => { w.order = i; });
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this._layout));
    if (typeof AppState !== 'undefined') {
      AppState.set('dashboard_widget_layout', this._layout.map(w => ({ ...w })));
    }
  },

  /* ---- Reset to factory defaults ---- */
  _resetDefaults() {
    this._layout = this._defaults.map(w => ({ ...w }));
    this._save();
  },

  /* ============================================================
     Customizer Modal — UI for editing layout
     ============================================================ */

  renderCustomizer() {
    this._ensureLoaded();

    // Remove existing overlay if present
    const existing = document.getElementById('dc-overlay');
    if (existing) existing.remove();

    // Build overlay
    const overlay = document.createElement('div');
    overlay.id = 'dc-overlay';
    Object.assign(overlay.style, {
      position: 'fixed',
      inset: '0',
      background: 'rgba(15, 23, 42, 0.45)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 'var(--z-modal, 400)',
      animation: 'dc-fadeIn 200ms ease'
    });

    // Inject keyframes once
    if (!document.getElementById('dc-keyframes')) {
      const style = document.createElement('style');
      style.id = 'dc-keyframes';
      style.textContent = `
        @keyframes dc-fadeIn { from { opacity:0 } to { opacity:1 } }
        @keyframes dc-slideUp { from { opacity:0; transform:translateY(24px) } to { opacity:1; transform:translateY(0) } }
      `;
      document.head.appendChild(style);
    }

    // Modal panel
    const modal = document.createElement('div');
    Object.assign(modal.style, {
      background: 'var(--surface, #fff)',
      borderRadius: 'var(--radius-lg, 14px)',
      boxShadow: 'var(--shadow-xl)',
      width: '560px',
      maxWidth: '94vw',
      maxHeight: '88vh',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      animation: 'dc-slideUp 250ms ease'
    });

    // --- Header ---
    const header = document.createElement('div');
    Object.assign(header.style, {
      padding: 'var(--sp-5, 1.25rem) var(--sp-6, 1.5rem)',
      borderBottom: '1px solid var(--border, #e2e8f0)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexShrink: '0'
    });

    const headerLeft = document.createElement('div');
    const title = document.createElement('h3');
    title.textContent = 'Customize Dashboard';
    Object.assign(title.style, {
      margin: '0',
      fontSize: 'var(--text-lg, 1.0625rem)',
      fontWeight: '600',
      color: 'var(--ink, #0f172a)'
    });
    const subtitle = document.createElement('p');
    subtitle.textContent = 'Drag to reorder, toggle visibility, and resize widgets.';
    Object.assign(subtitle.style, {
      margin: 'var(--sp-1, 0.25rem) 0 0',
      fontSize: 'var(--text-sm, 0.8125rem)',
      color: 'var(--ink-tertiary, #94a3b8)'
    });
    headerLeft.appendChild(title);
    headerLeft.appendChild(subtitle);

    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '&times;';
    Object.assign(closeBtn.style, {
      background: 'none',
      border: 'none',
      fontSize: '1.5rem',
      color: 'var(--ink-tertiary, #94a3b8)',
      cursor: 'pointer',
      padding: 'var(--sp-1, 0.25rem)',
      lineHeight: '1',
      borderRadius: 'var(--radius-sm, 6px)',
      transition: 'color var(--duration, 200ms) var(--ease)'
    });
    closeBtn.addEventListener('mouseenter', () => { closeBtn.style.color = 'var(--ink, #0f172a)'; });
    closeBtn.addEventListener('mouseleave', () => { closeBtn.style.color = 'var(--ink-tertiary, #94a3b8)'; });
    closeBtn.addEventListener('click', () => overlay.remove());

    header.appendChild(headerLeft);
    header.appendChild(closeBtn);

    // --- Widget list (scrollable body) ---
    const body = document.createElement('div');
    Object.assign(body.style, {
      padding: 'var(--sp-4, 1rem) var(--sp-6, 1.5rem)',
      overflowY: 'auto',
      flex: '1'
    });

    // Working copy of layout for editing
    const workingLayout = this._layout.map(w => ({ ...w }));

    const listContainer = document.createElement('div');
    listContainer.style.display = 'flex';
    listContainer.style.flexDirection = 'column';
    listContainer.style.gap = 'var(--sp-2, 0.5rem)';

    const self = this;

    function buildWidgetRow(widget, index) {
      const row = document.createElement('div');
      row.setAttribute('draggable', 'true');
      row.setAttribute('data-dc-index', index);
      Object.assign(row.style, {
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--sp-3, 0.75rem)',
        padding: 'var(--sp-3, 0.75rem) var(--sp-4, 1rem)',
        background: 'var(--gray-50, #f9fafb)',
        borderRadius: 'var(--radius-md, 10px)',
        border: '1px solid var(--border, #e2e8f0)',
        cursor: 'grab',
        transition: 'box-shadow var(--duration, 200ms) var(--ease), border-color var(--duration, 200ms) var(--ease)',
        userSelect: 'none'
      });

      // Drag handle
      const handle = document.createElement('span');
      handle.innerHTML = '&#9776;';
      Object.assign(handle.style, {
        fontSize: 'var(--text-base, 0.875rem)',
        color: 'var(--ink-tertiary, #94a3b8)',
        flexShrink: '0'
      });

      // Visibility checkbox
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = widget.visible;
      checkbox.title = 'Toggle visibility';
      Object.assign(checkbox.style, {
        width: '16px',
        height: '16px',
        accentColor: 'var(--primary, #2563eb)',
        cursor: 'pointer',
        flexShrink: '0'
      });
      checkbox.addEventListener('change', () => {
        widget.visible = checkbox.checked;
        label.style.opacity = widget.visible ? '1' : '0.5';
      });

      // Widget title
      const label = document.createElement('span');
      label.textContent = widget.title;
      Object.assign(label.style, {
        flex: '1',
        fontSize: 'var(--text-base, 0.875rem)',
        fontWeight: '500',
        color: 'var(--ink, #0f172a)',
        opacity: widget.visible ? '1' : '0.5',
        transition: 'opacity var(--duration, 200ms) var(--ease)'
      });

      // Size selector
      const sizeSelect = document.createElement('select');
      ['small', 'medium', 'large'].forEach(s => {
        const opt = document.createElement('option');
        opt.value = s;
        opt.textContent = s === 'small' ? 'Small (1 col)' : s === 'medium' ? 'Medium (2 col)' : 'Large (full)';
        if (s === widget.size) opt.selected = true;
        sizeSelect.appendChild(opt);
      });
      Object.assign(sizeSelect.style, {
        padding: 'var(--sp-1, 0.25rem) var(--sp-2, 0.5rem)',
        fontSize: 'var(--text-xs, 0.75rem)',
        borderRadius: 'var(--radius-sm, 6px)',
        border: '1px solid var(--border, #e2e8f0)',
        background: 'var(--surface, #fff)',
        color: 'var(--ink, #0f172a)',
        cursor: 'pointer',
        flexShrink: '0'
      });
      sizeSelect.addEventListener('change', () => {
        widget.size = sizeSelect.value;
      });

      row.appendChild(handle);
      row.appendChild(checkbox);
      row.appendChild(label);
      row.appendChild(sizeSelect);

      // --- Drag-and-drop events ---
      row.addEventListener('dragstart', (e) => {
        self._dragSrcIndex = index;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', index);
        row.style.opacity = '0.5';
      });

      row.addEventListener('dragend', () => {
        row.style.opacity = '1';
        // Clear any lingering drop highlights
        listContainer.querySelectorAll('[data-dc-index]').forEach(el => {
          el.style.borderColor = 'var(--border, #e2e8f0)';
        });
      });

      row.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        row.style.borderColor = 'var(--primary, #2563eb)';
      });

      row.addEventListener('dragleave', () => {
        row.style.borderColor = 'var(--border, #e2e8f0)';
      });

      row.addEventListener('drop', (e) => {
        e.preventDefault();
        row.style.borderColor = 'var(--border, #e2e8f0)';
        const fromIndex = self._dragSrcIndex;
        const toIndex = index;
        if (fromIndex === null || fromIndex === toIndex) return;

        // Reorder working layout
        const [moved] = workingLayout.splice(fromIndex, 1);
        workingLayout.splice(toIndex, 0, moved);

        // Re-render list
        renderList();
      });

      // Hover effect
      row.addEventListener('mouseenter', () => {
        row.style.boxShadow = 'var(--shadow-sm)';
      });
      row.addEventListener('mouseleave', () => {
        row.style.boxShadow = 'none';
      });

      return row;
    }

    function renderList() {
      listContainer.innerHTML = '';
      workingLayout.forEach((w, i) => {
        listContainer.appendChild(buildWidgetRow(w, i));
      });
    }

    renderList();
    body.appendChild(listContainer);

    // --- Footer ---
    const footer = document.createElement('div');
    Object.assign(footer.style, {
      padding: 'var(--sp-4, 1rem) var(--sp-6, 1.5rem)',
      borderTop: '1px solid var(--border, #e2e8f0)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexShrink: '0'
    });

    // Reset button
    const resetBtn = document.createElement('button');
    resetBtn.textContent = 'Reset to Defaults';
    resetBtn.className = 'btn btn-sm';
    Object.assign(resetBtn.style, {
      padding: 'var(--sp-2, 0.5rem) var(--sp-4, 1rem)',
      fontSize: 'var(--text-sm, 0.8125rem)',
      borderRadius: 'var(--radius-sm, 6px)',
      border: '1px solid var(--border, #e2e8f0)',
      background: 'var(--surface, #fff)',
      color: 'var(--ink-secondary, #475569)',
      cursor: 'pointer',
      fontWeight: '500',
      transition: 'all var(--duration, 200ms) var(--ease)'
    });
    resetBtn.addEventListener('mouseenter', () => {
      resetBtn.style.background = 'var(--gray-50, #f9fafb)';
    });
    resetBtn.addEventListener('mouseleave', () => {
      resetBtn.style.background = 'var(--surface, #fff)';
    });
    resetBtn.addEventListener('click', () => {
      workingLayout.length = 0;
      self._defaults.forEach(w => workingLayout.push({ ...w }));
      renderList();
      if (typeof Toast !== 'undefined') {
        Toast.show('Layout reset to defaults', 'info');
      }
    });

    // Right-side button group
    const btnGroup = document.createElement('div');
    btnGroup.style.display = 'flex';
    btnGroup.style.gap = 'var(--sp-2, 0.5rem)';

    // Cancel button
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.className = 'btn btn-sm';
    Object.assign(cancelBtn.style, {
      padding: 'var(--sp-2, 0.5rem) var(--sp-4, 1rem)',
      fontSize: 'var(--text-sm, 0.8125rem)',
      borderRadius: 'var(--radius-sm, 6px)',
      border: '1px solid var(--border, #e2e8f0)',
      background: 'var(--surface, #fff)',
      color: 'var(--ink-secondary, #475569)',
      cursor: 'pointer',
      fontWeight: '500',
      transition: 'all var(--duration, 200ms) var(--ease)'
    });
    cancelBtn.addEventListener('click', () => overlay.remove());

    // Save button
    const saveBtn = document.createElement('button');
    saveBtn.textContent = 'Save Layout';
    saveBtn.className = 'btn btn-primary btn-sm';
    Object.assign(saveBtn.style, {
      padding: 'var(--sp-2, 0.5rem) var(--sp-5, 1.25rem)',
      fontSize: 'var(--text-sm, 0.8125rem)',
      borderRadius: 'var(--radius-sm, 6px)',
      border: 'none',
      background: 'var(--primary, #2563eb)',
      color: 'var(--ink-inverse, #fff)',
      cursor: 'pointer',
      fontWeight: '600',
      transition: 'all var(--duration, 200ms) var(--ease)'
    });
    saveBtn.addEventListener('mouseenter', () => {
      saveBtn.style.background = 'var(--primary-dark, #1d4ed8)';
    });
    saveBtn.addEventListener('mouseleave', () => {
      saveBtn.style.background = 'var(--primary, #2563eb)';
    });
    saveBtn.addEventListener('click', () => {
      // Commit working layout
      self._layout = workingLayout.map((w, i) => ({ ...w, order: i }));
      self._save();

      if (typeof Toast !== 'undefined') {
        Toast.show('Dashboard layout saved', 'success');
      }
      if (typeof AuditLog !== 'undefined') {
        AuditLog.log('dashboard_layout_updated', {
          widgets: self._layout.map(w => ({ id: w.id, visible: w.visible, size: w.size }))
        });
      }

      overlay.remove();
    });

    btnGroup.appendChild(cancelBtn);
    btnGroup.appendChild(saveBtn);
    footer.appendChild(resetBtn);
    footer.appendChild(btnGroup);

    // Close on backdrop click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });

    // Close on Escape key
    const escHandler = (e) => {
      if (e.key === 'Escape') {
        overlay.remove();
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);

    // Assemble
    modal.appendChild(header);
    modal.appendChild(body);
    modal.appendChild(footer);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
  }
};
