/* ============================================================
   SessionTimeout — Idle detection and auto-lock
   ============================================================ */

const SessionTimeout = {
  _timeout: 30 * 60 * 1000, // 30 minutes default
  _warningBefore: 2 * 60 * 1000, // 2 minutes warning before lock
  _timer: null,
  _warningTimer: null,
  _lastActivity: Date.now(),
  _events: ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove'],
  _enabled: true,
  _storageKey: 'msp_session_timeout',

  init() {
    // Restore preference
    try {
      const saved = localStorage.getItem(this._storageKey);
      if (saved) {
        const prefs = JSON.parse(saved);
        this._timeout = prefs.timeout || this._timeout;
        this._enabled = prefs.enabled !== false;
      }
    } catch {}

    if (!this._enabled) return;

    this._resetTimers();
    this._events.forEach(evt => {
      document.addEventListener(evt, () => this._onActivity(), { passive: true });
    });
  },

  _onActivity() {
    this._lastActivity = Date.now();
    // Dismiss warning if shown
    const warning = document.getElementById('sessionWarning');
    if (warning) warning.remove();
    this._resetTimers();
  },

  _resetTimers() {
    clearTimeout(this._timer);
    clearTimeout(this._warningTimer);

    if (!this._enabled) return;

    // Warning timer
    this._warningTimer = setTimeout(() => {
      this._showWarning();
    }, this._timeout - this._warningBefore);

    // Lock timer
    this._timer = setTimeout(() => {
      this._lock();
    }, this._timeout);
  },

  _showWarning() {
    if (document.getElementById('sessionWarning')) return;

    const mins = Math.ceil(this._warningBefore / 60000);
    const banner = document.createElement('div');
    banner.id = 'sessionWarning';
    banner.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:10002;background:var(--warning-bg);border:1px solid var(--warning);border-radius:var(--radius-lg);padding:16px 20px;box-shadow:var(--shadow-lg);max-width:380px;animation:slideUp 0.3s ease;';
    banner.innerHTML = `
      <div style="display:flex;align-items:start;gap:12px;">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--warning)" stroke-width="2" style="flex-shrink:0;margin-top:2px;"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        <div>
          <div style="font-weight:600;font-size:var(--text-sm);color:var(--ink);margin-bottom:4px;">Session Expiring</div>
          <div style="font-size:var(--text-xs);color:var(--ink-secondary);margin-bottom:10px;">Your session will lock in ~${mins} minute(s) due to inactivity.</div>
          <div style="display:flex;gap:8px;">
            <button class="btn btn-primary btn-sm" onclick="SessionTimeout._onActivity();">Stay Active</button>
            <button class="btn btn-ghost btn-sm" onclick="SessionTimeout._lock();">Lock Now</button>
          </div>
        </div>
        <button onclick="this.closest('#sessionWarning').remove();" style="background:none;border:none;cursor:pointer;color:var(--ink-muted);font-size:16px;line-height:1;">&#10005;</button>
      </div>
    `;
    document.body.appendChild(banner);
  },

  _lock() {
    document.getElementById('sessionWarning')?.remove();
    clearTimeout(this._timer);
    clearTimeout(this._warningTimer);

    // Clear session and show gate
    sessionStorage.removeItem('msp_gate_passed');
    document.getElementById('app')?.classList.add('hidden');
    const gate = document.getElementById('accessGate');
    if (gate) {
      gate.style.display = '';
      // Clear password field
      const input = document.getElementById('gateCode');
      if (input) { input.value = ''; input.focus(); }
    }
    Toast.show('Session locked due to inactivity', 'info');
  },

  setTimeout(minutes) {
    this._timeout = minutes * 60 * 1000;
    this._save();
    this._resetTimers();
  },

  setEnabled(enabled) {
    this._enabled = enabled;
    this._save();
    if (enabled) {
      this._resetTimers();
    } else {
      clearTimeout(this._timer);
      clearTimeout(this._warningTimer);
    }
  },

  _save() {
    localStorage.setItem(this._storageKey, JSON.stringify({
      timeout: this._timeout,
      enabled: this._enabled
    }));
  },

  getMinutes() {
    return Math.round(this._timeout / 60000);
  },

  isEnabled() {
    return this._enabled;
  }
};
