/* ============================================================
   BulkProgress — Progress tracker for bulk device operations
   ============================================================ */

const BulkProgress = {
  _visible: false,
  _items: [],      // { id, label, status: 'pending'|'running'|'success'|'error', message }
  _title: '',
  _onComplete: null,

  /**
   * Start a bulk operation with progress tracking.
   * @param {string} title   - Operation title
   * @param {Array}  items   - [{id, label}] items to process
   * @param {Function} fn    - async (item, updateStatus) => {} processing function
   * @param {Function} onComplete - Called when all items are done
   */
  async run(title, items, fn, onComplete = null) {
    this._title = title;
    this._items = items.map(item => ({ ...item, status: 'pending', message: '' }));
    this._onComplete = onComplete;
    this._visible = true;
    this._render();

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < this._items.length; i++) {
      this._items[i].status = 'running';
      this._render();

      try {
        const result = await fn(this._items[i], (msg) => {
          this._items[i].message = msg;
          this._render();
        });
        this._items[i].status = 'success';
        this._items[i].message = result || 'Done';
        successCount++;
      } catch (err) {
        this._items[i].status = 'error';
        this._items[i].message = err.message || 'Failed';
        errorCount++;
      }
      this._render();
    }

    // Summary
    const summary = `${successCount} succeeded, ${errorCount} failed`;
    Toast.show(`${title}: ${summary}`, errorCount > 0 ? 'warning' : 'success');

    if (this._onComplete) this._onComplete(successCount, errorCount);
    if (typeof AuditLog !== 'undefined') {
      AuditLog.log('bulk_action', `${title}: ${summary}`);
    }
  },

  _render() {
    let panel = document.getElementById('bulkProgressPanel');

    if (!this._visible) {
      if (panel) panel.remove();
      return;
    }

    const total = this._items.length;
    const done = this._items.filter(i => i.status === 'success' || i.status === 'error').length;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    const isComplete = done === total;

    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'bulkProgressPanel';
      panel.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:9998;width:380px;max-height:60vh;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);box-shadow:var(--shadow-xl);overflow:hidden;animation:slideUp 0.3s ease;display:flex;flex-direction:column;';
      document.body.appendChild(panel);
    }

    panel.innerHTML = `
      <div style="padding:12px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;">
        <div>
          <div style="font-weight:600;font-size:var(--text-sm);color:var(--ink);">${this._title}</div>
          <div style="font-size:11px;color:var(--ink-muted);">${done}/${total} — ${pct}%</div>
        </div>
        ${isComplete ? `<button class="btn btn-ghost btn-sm" onclick="BulkProgress.dismiss()">Dismiss</button>` : `
          <div style="width:18px;height:18px;border:2px solid var(--border);border-top-color:var(--primary);border-radius:50%;animation:spin 0.8s linear infinite;"></div>
        `}
      </div>
      <div style="height:3px;background:var(--gray-100);">
        <div style="height:100%;width:${pct}%;background:var(--primary);transition:width 0.3s ease;border-radius:0 2px 2px 0;"></div>
      </div>
      <div style="overflow-y:auto;max-height:300px;padding:4px 0;">
        ${this._items.map(item => {
          const statusIcon = {
            pending: '<span style="color:var(--ink-muted);">&#9675;</span>',
            running: '<span style="color:var(--primary);animation:pulse 1s infinite;">&#9679;</span>',
            success: '<span style="color:var(--success);">&#10004;</span>',
            error: '<span style="color:var(--danger);">&#10008;</span>'
          }[item.status];
          return `
            <div style="display:flex;align-items:center;gap:8px;padding:6px 16px;font-size:var(--text-xs);${item.status === 'running' ? 'background:var(--primary-bg);' : ''}">
              <span style="flex-shrink:0;">${statusIcon}</span>
              <span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--ink);">${item.label}</span>
              <span style="flex-shrink:0;color:${item.status === 'error' ? 'var(--danger)' : 'var(--ink-muted)'};max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${item.message}</span>
            </div>
          `;
        }).join('')}
      </div>
    `;
  },

  dismiss() {
    this._visible = false;
    const panel = document.getElementById('bulkProgressPanel');
    if (panel) {
      panel.style.opacity = '0';
      panel.style.transform = 'translateY(10px)';
      panel.style.transition = 'all 0.2s ease';
      setTimeout(() => panel.remove(), 200);
    }
  }
};
