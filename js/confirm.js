/* ============================================================
   Confirm — Reusable confirmation dialog for destructive actions
   ============================================================ */

const Confirm = {
  /**
   * Show a confirmation dialog and return a Promise<boolean>.
   * @param {object} opts
   * @param {string} opts.title       - Dialog title
   * @param {string} opts.message     - Description / warning text
   * @param {string} opts.confirmText - Confirm button label (default: 'Confirm')
   * @param {string} opts.cancelText  - Cancel button label (default: 'Cancel')
   * @param {string} opts.type        - 'danger' | 'warning' | 'info' (default: 'danger')
   */
  show({ title = 'Are you sure?', message = '', confirmText = 'Confirm', cancelText = 'Cancel', type = 'danger' } = {}) {
    return new Promise(resolve => {
      // Remove existing
      document.getElementById('confirmDialog')?.remove();

      const icons = {
        danger: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
        warning: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--warning)" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
        info: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
      };

      const btnClass = type === 'danger' ? 'btn-danger' : type === 'warning' ? 'btn-primary' : 'btn-primary';
      const btnStyle = type === 'danger' ? 'background:var(--danger);color:white;border-color:var(--danger);' : '';

      const overlay = document.createElement('div');
      overlay.id = 'confirmDialog';
      overlay.className = 'modal-overlay';
      overlay.style.cssText = 'position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.5);animation:fadeIn 0.15s ease;';
      overlay.innerHTML = `
        <div class="modal" style="max-width:420px;width:92%;animation:slideUp 0.2s ease;">
          <div class="modal-body" style="padding:24px;text-align:center;">
            <div style="margin-bottom:16px;">${icons[type] || icons.info}</div>
            <h3 style="margin:0 0 8px;font-size:var(--text-lg);font-weight:600;color:var(--ink);">${title}</h3>
            ${message ? `<p style="margin:0 0 20px;color:var(--ink-secondary);font-size:var(--text-sm);line-height:1.5;">${message}</p>` : '<div style="margin-bottom:20px;"></div>'}
            <div style="display:flex;gap:10px;justify-content:center;">
              <button class="btn btn-secondary" id="confirmDialogCancel">${cancelText}</button>
              <button class="btn ${btnClass}" id="confirmDialogOk" style="${btnStyle}">${confirmText}</button>
            </div>
          </div>
        </div>
      `;

      const close = (result) => {
        overlay.style.opacity = '0';
        overlay.style.transition = 'opacity 0.15s ease';
        setTimeout(() => overlay.remove(), 150);
        resolve(result);
      };

      overlay.querySelector('#confirmDialogCancel').onclick = () => close(false);
      overlay.querySelector('#confirmDialogOk').onclick = () => close(true);
      overlay.addEventListener('click', e => { if (e.target === overlay) close(false); });
      overlay.addEventListener('keydown', e => {
        if (e.key === 'Escape') close(false);
        if (e.key === 'Enter') close(true);
      });

      document.body.appendChild(overlay);
      overlay.querySelector('#confirmDialogOk').focus();
    });
  }
};
