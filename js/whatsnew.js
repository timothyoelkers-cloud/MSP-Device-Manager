/* ============================================================
   What's New — Changelog modal with version tracking
   ============================================================ */

const WhatsNew = {
  // ---- Release history (newest first) ----
  releases: [
    {
      version: '3.0.0',
      date: '2026-03-16',
      title: 'Platform Enhancements',
      items: [
        { type: 'feature',     text: 'Dark mode with automatic system preference detection' },
        { type: 'feature',     text: 'Executive dashboard with high-level KPIs and org-wide summaries' },
        { type: 'feature',     text: 'Trend charts for compliance, enrollment, and security posture' },
        { type: 'feature',     text: 'SLA tracking with configurable thresholds and breach alerts' },
        { type: 'feature',     text: 'PSA integrations — ConnectWise, Autotask, and HaloPSA connectors' },
        { type: 'feature',     text: 'Change log capturing every device and policy modification' },
        { type: 'feature',     text: 'Technician notes on devices and tenants with @mention support' },
        { type: 'improvement', text: 'Fully mobile-responsive layout for on-the-go management' },
        { type: 'feature',     text: 'Setup wizard for first-run onboarding and GDAP configuration' },
        { type: 'feature',     text: 'Quick actions toolbar with one-click sync, restart, and wipe' },
        { type: 'feature',     text: 'Health summary email digest — daily or weekly schedule' },
        { type: 'feature',     text: 'Keyboard shortcuts help panel (press ? anywhere)' }
      ]
    },
    {
      version: '2.0.0',
      date: '2026-03-15',
      title: 'Multi-Tenant Power Tools',
      items: [
        { type: 'feature',     text: 'Sync dashboard showing real-time per-tenant data freshness' },
        { type: 'feature',     text: 'License optimizer recommending SKU right-sizing across tenants' },
        { type: 'feature',     text: 'Incident response playbooks with automated remediation steps' },
        { type: 'feature',     text: 'Tenant comparison scoring for compliance and security posture' },
        { type: 'feature',     text: 'Bulk user operations — password reset, license assign, MFA enforce' },
        { type: 'feature',     text: 'Dashboard customizer with drag-and-drop widget layout' },
        { type: 'feature',     text: 'Saved views for device tables with shareable filter presets' },
        { type: 'feature',     text: 'Notification rules engine for compliance drift and policy changes' },
        { type: 'improvement', text: 'Internationalization support — English, German, French, Spanish' }
      ]
    },
    {
      version: '1.5.0',
      date: '2026-03-14',
      title: 'Core Enhancements',
      items: [
        { type: 'feature',     text: 'Group management — create, update, delete Azure AD groups' },
        { type: 'feature',     text: 'Autopilot profile assignment and hardware hash import' },
        { type: 'feature',     text: 'PDF export for compliance reports and device inventories' },
        { type: 'feature',     text: 'Global search across devices, users, groups, and policies' },
        { type: 'improvement', text: 'Audit log viewer with Microsoft Graph activity integration' }
      ]
    },
    {
      version: '1.0.0',
      date: '2026-03-13',
      title: 'Initial Release',
      items: [
        { type: 'feature', text: 'Multi-tenant device management via GDAP delegated access' },
        { type: 'feature', text: 'Compliance monitoring with policy status and drift detection' },
        { type: 'feature', text: 'Security baselines overview and assignment tracking' },
        { type: 'feature', text: 'Application management — install, uninstall, and assignment status' },
        { type: 'feature', text: 'User management with license and MFA status views' },
        { type: 'feature', text: 'Conditional access policy viewer with what-if analysis' },
        { type: 'feature', text: 'Reports — device inventory CSV export and compliance summaries' }
      ]
    }
  ],

  // ---- Persistence helpers ----
  _storageKey: 'whatsnew_last_seen',

  _getLastSeen() {
    return localStorage.getItem(this._storageKey) || '0.0.0';
  },

  _setLastSeen(version) {
    localStorage.setItem(this._storageKey, version);
  },

  // ---- Semantic version comparison ----
  _compareVersions(a, b) {
    const pa = a.split('.').map(Number);
    const pb = b.split('.').map(Number);
    for (let i = 0; i < 3; i++) {
      if ((pa[i] || 0) > (pb[i] || 0)) return 1;
      if ((pa[i] || 0) < (pb[i] || 0)) return -1;
    }
    return 0;
  },

  // ---- Public API ----

  getLatestVersion() {
    return this.releases.length ? this.releases[0].version : '0.0.0';
  },

  getUnseenCount() {
    const last = this._getLastSeen();
    return this.releases.filter(r => this._compareVersions(r.version, last) > 0).length;
  },

  shouldShow() {
    return this.getUnseenCount() > 0;
  },

  renderBadge() {
    const count = this.getUnseenCount();
    if (count === 0) return '';
    return `<span style="
      display:inline-flex;align-items:center;justify-content:center;
      background:var(--danger);color:#fff;
      font-size:0.65rem;font-weight:700;
      padding:2px 7px;border-radius:999px;
      margin-left:6px;line-height:1;
      animation:whatsnew-pulse 2s ease-in-out infinite;
    ">New</span>`;
  },

  // ---- Modal ----

  show() {
    // Remove any existing modal
    document.getElementById('whatsnew-modal')?.remove();

    const lastSeen = this._getLastSeen();
    const typeConfig = {
      feature:     { label: 'Feature',     bg: 'var(--success-pale,#d1fae5)',  color: 'var(--success,#059669)'  },
      improvement: { label: 'Improvement', bg: 'var(--primary-pale,#dbeafe)',  color: 'var(--primary,#2563eb)'  },
      fix:         { label: 'Fix',         bg: 'var(--warning-pale,#fef3c7)',  color: 'var(--warning,#d97706)'  },
      breaking:    { label: 'Breaking',    bg: 'var(--danger-pale,#fee2e2)',   color: 'var(--danger,#dc2626)'   }
    };

    const versionsHtml = this.releases.map((release, idx) => {
      const isUnseen = this._compareVersions(release.version, lastSeen) > 0;
      const isExpanded = idx === 0;

      const itemsHtml = release.items.map(item => {
        const tc = typeConfig[item.type] || typeConfig.feature;
        return `
          <li style="display:flex;align-items:flex-start;gap:8px;padding:6px 0;">
            <span style="
              flex-shrink:0;
              font-size:0.65rem;font-weight:600;
              padding:2px 8px;border-radius:999px;
              background:${tc.bg};color:${tc.color};
              line-height:1.4;white-space:nowrap;
            ">${tc.label}</span>
            <span style="color:var(--ink,#0f172a);font-size:var(--text-sm,0.8125rem);line-height:1.5;">
              ${this._escapeHtml(item.text)}
            </span>
          </li>`;
      }).join('');

      return `
        <div class="whatsnew-version" style="border:1px solid var(--border,#e2e8f0);border-radius:var(--radius-md,10px);overflow:hidden;${isUnseen ? 'box-shadow:0 0 0 2px var(--primary-pale,#dbeafe);' : ''}">
          <button onclick="WhatsNew._toggleSection(this)" aria-expanded="${isExpanded}" style="
            width:100%;display:flex;align-items:center;gap:10px;
            padding:14px 16px;border:none;background:var(--gray-50,#f9fafb);
            cursor:pointer;text-align:left;font-family:inherit;
            transition:background .15s;
          ">
            <svg class="whatsnew-chevron" style="flex-shrink:0;width:16px;height:16px;transition:transform .2s;${isExpanded ? 'transform:rotate(90deg);' : ''}" viewBox="0 0 16 16" fill="none" stroke="var(--ink-muted,var(--ink-secondary,#475569))" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M6 4l4 4-4 4"/>
            </svg>
            <span style="
              font-size:0.7rem;font-weight:700;
              padding:3px 10px;border-radius:999px;
              background:var(--primary,#2563eb);color:#fff;
              line-height:1;white-space:nowrap;
            ">v${this._escapeHtml(release.version)}</span>
            <span style="font-weight:600;font-size:var(--text-base,0.875rem);color:var(--ink,#0f172a);flex:1;">
              ${this._escapeHtml(release.title)}
            </span>
            <span style="font-size:var(--text-xs,0.75rem);color:var(--ink-muted,var(--ink-tertiary,#94a3b8));white-space:nowrap;">
              ${this._escapeHtml(release.date)}
            </span>
            ${isUnseen ? '<span style="font-size:0.6rem;font-weight:700;padding:2px 7px;border-radius:999px;background:var(--danger,#dc2626);color:#fff;line-height:1;">NEW</span>' : ''}
          </button>
          <div class="whatsnew-items" style="
            ${isExpanded ? '' : 'display:none;'}
            padding:4px 16px 14px 42px;
          ">
            <ul style="list-style:none;margin:0;padding:0;">
              ${itemsHtml}
            </ul>
          </div>
        </div>`;
    }).join('');

    const modal = document.createElement('div');
    modal.id = 'whatsnew-modal';
    modal.style.cssText = `
      position:fixed;inset:0;z-index:10000;
      display:flex;align-items:center;justify-content:center;
      padding:20px;
    `;
    modal.innerHTML = `
      <div onclick="WhatsNew._close()" style="position:absolute;inset:0;background:rgba(0,0,0,0.4);backdrop-filter:blur(4px);"></div>
      <div style="
        position:relative;
        width:100%;max-width:620px;max-height:85vh;
        background:var(--surface,#fff);
        border-radius:var(--radius-lg,14px);
        box-shadow:var(--shadow-xl,0 25px 50px -12px rgba(0,0,0,.25));
        display:flex;flex-direction:column;
        overflow:hidden;
        animation:whatsnew-enter .25s ease-out;
      ">
        <!-- Header -->
        <div style="
          display:flex;align-items:center;gap:12px;
          padding:20px 24px 16px;
          border-bottom:1px solid var(--border,#e2e8f0);
          flex-shrink:0;
        ">
          <svg style="width:24px;height:24px;flex-shrink:0;" viewBox="0 0 24 24" fill="none" stroke="var(--primary,#2563eb)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
          </svg>
          <h2 style="margin:0;font-size:var(--text-xl,1.25rem);font-weight:700;color:var(--ink,#0f172a);flex:1;">
            What's New
          </h2>
          <span style="
            font-size:0.7rem;font-weight:600;
            padding:3px 10px;border-radius:999px;
            background:var(--primary-pale,#dbeafe);color:var(--primary,#2563eb);
          ">v${this._escapeHtml(this.getLatestVersion())}</span>
          <button onclick="WhatsNew._close()" style="
            border:none;background:none;cursor:pointer;padding:4px;
            color:var(--ink-muted,var(--ink-tertiary,#94a3b8));
            border-radius:var(--radius-sm,6px);
            transition:background .15s,color .15s;
          " onmouseover="this.style.background='var(--gray-100,#f3f4f6)';this.style.color='var(--ink,#0f172a)'"
             onmouseout="this.style.background='none';this.style.color='var(--ink-muted,var(--ink-tertiary,#94a3b8))'">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <path d="M5 5l10 10M15 5L5 15"/>
            </svg>
          </button>
        </div>

        <!-- Content -->
        <div style="overflow-y:auto;padding:16px 24px;display:flex;flex-direction:column;gap:12px;">
          ${versionsHtml}
        </div>

        <!-- Footer -->
        <div style="
          padding:14px 24px;
          border-top:1px solid var(--border,#e2e8f0);
          display:flex;align-items:center;justify-content:flex-end;gap:12px;
          flex-shrink:0;
        ">
          <span style="flex:1;font-size:var(--text-xs,0.75rem);color:var(--ink-muted,var(--ink-tertiary,#94a3b8));">
            ${this.releases.length} release${this.releases.length !== 1 ? 's' : ''}
          </span>
          <button onclick="WhatsNew._gotIt()" style="
            padding:8px 24px;border:none;border-radius:var(--radius-md,10px);
            background:var(--primary,#2563eb);color:#fff;
            font-size:var(--text-sm,0.8125rem);font-weight:600;
            cursor:pointer;font-family:inherit;
            transition:background .15s,transform .1s;
          " onmouseover="this.style.background='var(--primary-dark,#1d4ed8)'"
             onmouseout="this.style.background='var(--primary,#2563eb)'"
             onmousedown="this.style.transform='scale(0.97)'"
             onmouseup="this.style.transform='scale(1)'">
            Got it
          </button>
        </div>
      </div>

      <style>
        @keyframes whatsnew-enter {
          from { opacity:0; transform:translateY(16px) scale(0.97); }
          to   { opacity:1; transform:translateY(0) scale(1); }
        }
        @keyframes whatsnew-pulse {
          0%, 100% { opacity:1; }
          50%      { opacity:0.6; }
        }
      </style>
    `;

    document.body.appendChild(modal);

    // Close on Escape key
    this._escHandler = (e) => {
      if (e.key === 'Escape') this._close();
    };
    document.addEventListener('keydown', this._escHandler);
  },

  // ---- Internal helpers ----

  _escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  _toggleSection(btn) {
    const expanded = btn.getAttribute('aria-expanded') === 'true';
    btn.setAttribute('aria-expanded', String(!expanded));
    const chevron = btn.querySelector('.whatsnew-chevron');
    const items = btn.nextElementSibling;
    if (expanded) {
      items.style.display = 'none';
      if (chevron) chevron.style.transform = '';
    } else {
      items.style.display = '';
      if (chevron) chevron.style.transform = 'rotate(90deg)';
    }
  },

  _gotIt() {
    this._setLastSeen(this.getLatestVersion());
    this._close();
    if (typeof Toast !== 'undefined') {
      Toast.show('Changelog marked as read', 'success');
    }
  },

  _close() {
    const modal = document.getElementById('whatsnew-modal');
    if (modal) {
      modal.remove();
    }
    if (this._escHandler) {
      document.removeEventListener('keydown', this._escHandler);
      this._escHandler = null;
    }
  },

  // ---- Auto-show on new version ----

  init() {
    if (this.shouldShow()) {
      // Small delay so the page finishes rendering first
      setTimeout(() => this.show(), 800);
    }
  }
};
