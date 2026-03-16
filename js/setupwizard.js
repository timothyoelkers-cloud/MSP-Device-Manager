/* ============================================================
   Setup Wizard — Guided first-run experience
   ============================================================ */

const SetupWizard = {
  _overlay: null,
  _currentStep: 0,
  _totalSteps: 5,
  _stepData: {},

  // ---- Public API ----

  shouldShow() {
    return localStorage.getItem('setup_wizard_completed') !== 'true';
  },

  show() {
    this._currentStep = 0;
    this._stepData = this._loadStepData();
    this._createOverlay();
    this._render();
  },

  reset() {
    localStorage.removeItem('setup_wizard_completed');
    localStorage.removeItem('setup_wizard_data');
    Toast.show('Setup wizard has been reset. It will appear on next page load.', 'info');
  },

  // ---- Internal: Data Persistence ----

  _loadStepData() {
    try {
      const saved = localStorage.getItem('setup_wizard_data');
      return saved ? JSON.parse(saved) : this._defaults();
    } catch (e) {
      return this._defaults();
    }
  },

  _defaults() {
    return {
      complianceThreshold: 80,
      staleDeviceDays: 30,
      theme: 'light',
      language: 'en',
      displayName: ''
    };
  },

  _saveStepData() {
    try {
      localStorage.setItem('setup_wizard_data', JSON.stringify(this._stepData));
    } catch (e) { /* ignore */ }
  },

  _applySettings() {
    // Push relevant settings into AppState / localStorage
    if (this._stepData.complianceThreshold != null) {
      AppState.set('complianceThreshold', this._stepData.complianceThreshold);
      localStorage.setItem('msp_complianceThreshold', this._stepData.complianceThreshold);
    }
    if (this._stepData.staleDeviceDays != null) {
      AppState.set('staleDeviceDays', this._stepData.staleDeviceDays);
      localStorage.setItem('msp_staleDeviceDays', this._stepData.staleDeviceDays);
    }
    if (this._stepData.theme) {
      AppState.set('theme', this._stepData.theme);
      localStorage.setItem('msp_theme', this._stepData.theme);
      document.documentElement.setAttribute('data-theme', this._stepData.theme);
    }
    if (this._stepData.language) {
      AppState.set('language', this._stepData.language);
      localStorage.setItem('msp_language', this._stepData.language);
    }
    if (this._stepData.displayName) {
      AppState.set('displayName', this._stepData.displayName);
      localStorage.setItem('msp_displayName', this._stepData.displayName);
    }
  },

  // ---- Internal: Overlay / DOM ----

  _createOverlay() {
    // Remove existing if present
    if (this._overlay) this._overlay.remove();

    const overlay = document.createElement('div');
    overlay.id = 'setupWizardOverlay';
    overlay.innerHTML = `
      <style>
        #setupWizardOverlay {
          position: fixed;
          inset: 0;
          z-index: 10000;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(15, 23, 42, 0.55);
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
          animation: swOverlayIn 0.3s ease;
        }
        @keyframes swOverlayIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        .sw-card {
          background: var(--white, #fff);
          border-radius: var(--radius-lg, 14px);
          box-shadow: var(--shadow-xl);
          width: 100%;
          max-width: 600px;
          margin: 16px;
          overflow: hidden;
          animation: swCardIn 0.35s ease;
          display: flex;
          flex-direction: column;
          max-height: 90vh;
        }
        @keyframes swCardIn {
          from { opacity: 0; transform: translateY(24px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .sw-header {
          padding: 28px 32px 0;
          text-align: center;
        }
        .sw-body {
          padding: 20px 32px 28px;
          overflow-y: auto;
          flex: 1;
        }
        .sw-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 32px;
          border-top: 1px solid var(--border, #e2e8f0);
          background: var(--gray-50, #f9fafb);
        }

        /* Step indicator */
        .sw-steps {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-bottom: 24px;
        }
        .sw-step-dot {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          font-weight: 600;
          transition: all 0.25s ease;
          border: 2px solid var(--gray-200, #e5e7eb);
          background: var(--white, #fff);
          color: var(--gray-400, #9ca3af);
        }
        .sw-step-dot.active {
          border-color: var(--primary, #2563eb);
          background: var(--primary, #2563eb);
          color: #fff;
          box-shadow: 0 0 0 4px var(--primary-pale, #dbeafe);
        }
        .sw-step-dot.completed {
          border-color: var(--success, #059669);
          background: var(--success, #059669);
          color: #fff;
        }
        .sw-step-line {
          width: 28px;
          height: 2px;
          background: var(--gray-200, #e5e7eb);
          border-radius: 1px;
          transition: background 0.25s ease;
        }
        .sw-step-line.completed {
          background: var(--success, #059669);
        }

        /* Content transition */
        .sw-content {
          animation: swStepIn 0.3s ease;
        }
        @keyframes swStepIn {
          from { opacity: 0; transform: translateX(16px); }
          to   { opacity: 1; transform: translateX(0); }
        }

        /* Typography within wizard */
        .sw-title {
          font-size: var(--text-2xl, 1.5rem);
          font-weight: 700;
          color: var(--ink, #0f172a);
          margin: 0 0 6px;
        }
        .sw-subtitle {
          font-size: var(--text-base, 0.875rem);
          color: var(--ink-secondary, #475569);
          margin: 0 0 20px;
          line-height: 1.6;
        }

        /* Feature list on welcome */
        .sw-features {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-top: 16px;
        }
        .sw-feature {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 12px;
          border-radius: var(--radius-md, 10px);
          background: var(--gray-50, #f9fafb);
          border: 1px solid var(--border, #e2e8f0);
        }
        .sw-feature-icon {
          flex-shrink: 0;
          width: 32px;
          height: 32px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
        }
        .sw-feature-text {
          font-size: var(--text-sm, 0.8125rem);
          font-weight: 500;
          color: var(--ink, #0f172a);
          line-height: 1.4;
        }
        .sw-feature-desc {
          font-size: 11px;
          color: var(--ink-tertiary, #94a3b8);
          margin-top: 2px;
        }

        /* Form styling inside wizard */
        .sw-form-group {
          margin-bottom: 16px;
        }
        .sw-form-group label {
          display: block;
          font-size: var(--text-sm, 0.8125rem);
          font-weight: 600;
          color: var(--ink, #0f172a);
          margin-bottom: 6px;
        }
        .sw-form-group input,
        .sw-form-group select {
          width: 100%;
          padding: 9px 12px;
          border: 1px solid var(--border, #e2e8f0);
          border-radius: var(--radius-md, 10px);
          font-size: var(--text-base, 0.875rem);
          font-family: var(--font-sans, 'Inter', sans-serif);
          background: var(--white, #fff);
          color: var(--ink, #0f172a);
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
          box-sizing: border-box;
        }
        .sw-form-group input:focus,
        .sw-form-group select:focus {
          outline: none;
          border-color: var(--primary, #2563eb);
          box-shadow: 0 0 0 3px var(--primary-pale, #dbeafe);
        }
        .sw-form-hint {
          font-size: 11px;
          color: var(--ink-tertiary, #94a3b8);
          margin-top: 4px;
        }

        /* Range slider */
        .sw-range-row {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .sw-range-row input[type="range"] {
          flex: 1;
          padding: 0;
          border: none;
          box-shadow: none;
        }
        .sw-range-value {
          min-width: 44px;
          text-align: center;
          font-weight: 600;
          font-size: var(--text-base, 0.875rem);
          color: var(--primary, #2563eb);
        }

        /* Theme cards */
        .sw-theme-options {
          display: flex;
          gap: 12px;
        }
        .sw-theme-card {
          flex: 1;
          padding: 16px;
          border-radius: var(--radius-md, 10px);
          border: 2px solid var(--border, #e2e8f0);
          cursor: pointer;
          text-align: center;
          transition: all 0.2s ease;
        }
        .sw-theme-card:hover {
          border-color: var(--primary-light, #3b82f6);
        }
        .sw-theme-card.selected {
          border-color: var(--primary, #2563eb);
          background: var(--primary-bg, #eff6ff);
        }
        .sw-theme-card .sw-theme-preview {
          width: 48px;
          height: 48px;
          border-radius: 10px;
          margin: 0 auto 8px;
          border: 1px solid var(--border, #e2e8f0);
        }
        .sw-theme-card .sw-theme-label {
          font-size: var(--text-sm, 0.8125rem);
          font-weight: 600;
          color: var(--ink, #0f172a);
        }

        /* Quick links grid */
        .sw-quicklinks {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 10px;
          margin-top: 16px;
        }
        .sw-quicklink {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          padding: 16px 10px;
          border-radius: var(--radius-md, 10px);
          background: var(--gray-50, #f9fafb);
          border: 1px solid var(--border, #e2e8f0);
          cursor: pointer;
          transition: all 0.2s ease;
          text-decoration: none;
        }
        .sw-quicklink:hover {
          border-color: var(--primary-light, #3b82f6);
          background: var(--primary-bg, #eff6ff);
        }
        .sw-quicklink-icon {
          font-size: 22px;
        }
        .sw-quicklink-text {
          font-size: var(--text-sm, 0.8125rem);
          font-weight: 500;
          color: var(--ink, #0f172a);
        }

        /* Summary checklist */
        .sw-checklist {
          list-style: none;
          padding: 0;
          margin: 12px 0 0;
        }
        .sw-checklist li {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 0;
          font-size: var(--text-sm, 0.8125rem);
          color: var(--ink-secondary, #475569);
          border-bottom: 1px solid var(--border-light, #f1f5f9);
        }
        .sw-checklist li:last-child { border-bottom: none; }
        .sw-check-icon {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          flex-shrink: 0;
        }
        .sw-check-icon.done {
          background: var(--success-pale, #d1fae5);
          color: var(--success, #059669);
        }
        .sw-check-icon.pending {
          background: var(--gray-100, #f3f4f6);
          color: var(--gray-400, #9ca3af);
        }

        /* Buttons */
        .sw-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 9px 20px;
          border-radius: var(--radius-md, 10px);
          font-size: var(--text-sm, 0.8125rem);
          font-weight: 600;
          font-family: var(--font-sans, 'Inter', sans-serif);
          cursor: pointer;
          border: none;
          transition: all 0.2s ease;
        }
        .sw-btn-primary {
          background: var(--primary, #2563eb);
          color: #fff;
        }
        .sw-btn-primary:hover {
          background: var(--primary-dark, #1d4ed8);
        }
        .sw-btn-ghost {
          background: transparent;
          color: var(--ink-secondary, #475569);
        }
        .sw-btn-ghost:hover {
          background: var(--gray-100, #f3f4f6);
        }
        .sw-skip-link {
          font-size: 12px;
          color: var(--ink-tertiary, #94a3b8);
          cursor: pointer;
          text-decoration: underline;
          background: none;
          border: none;
          font-family: var(--font-sans, 'Inter', sans-serif);
        }
        .sw-skip-link:hover {
          color: var(--ink-secondary, #475569);
        }

        /* Info callout */
        .sw-callout {
          display: flex;
          gap: 10px;
          padding: 12px 14px;
          border-radius: var(--radius-md, 10px);
          background: var(--primary-bg, #eff6ff);
          border: 1px solid var(--primary-pale, #dbeafe);
          font-size: var(--text-sm, 0.8125rem);
          color: var(--ink-secondary, #475569);
          line-height: 1.5;
          margin-top: 12px;
        }
        .sw-callout-icon {
          flex-shrink: 0;
          font-size: 16px;
        }
      </style>
      <div class="sw-card">
        <div class="sw-header" id="swHeader"></div>
        <div class="sw-body" id="swBody"></div>
        <div class="sw-footer" id="swFooter"></div>
      </div>
    `;
    document.body.appendChild(overlay);
    this._overlay = overlay;
  },

  _close() {
    if (this._overlay) {
      this._overlay.style.opacity = '0';
      this._overlay.style.transition = 'opacity 0.25s ease';
      setTimeout(() => {
        if (this._overlay) this._overlay.remove();
        this._overlay = null;
      }, 250);
    }
  },

  _complete() {
    localStorage.setItem('setup_wizard_completed', 'true');
    this._saveStepData();
    this._applySettings();
    this._close();
    Toast.show('Setup complete! Welcome to MSP Device Manager.', 'success');
  },

  _skip() {
    localStorage.setItem('setup_wizard_completed', 'true');
    this._close();
    Toast.show('Setup skipped. You can re-run it from Settings.', 'info');
  },

  // ---- Internal: Rendering ----

  _render() {
    this._renderStepIndicator();
    this._renderStepContent();
    this._renderFooter();
  },

  _renderStepIndicator() {
    const header = document.getElementById('swHeader');
    let html = '<div class="sw-steps">';
    for (let i = 0; i < this._totalSteps; i++) {
      if (i > 0) {
        const lineClass = i <= this._currentStep ? 'completed' : '';
        html += `<div class="sw-step-line ${lineClass}"></div>`;
      }
      let dotClass = '';
      let content = i + 1;
      if (i < this._currentStep) {
        dotClass = 'completed';
        content = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>';
      } else if (i === this._currentStep) {
        dotClass = 'active';
      }
      html += `<div class="sw-step-dot ${dotClass}">${content}</div>`;
    }
    html += '</div>';
    header.innerHTML = html;
  },

  _renderStepContent() {
    const body = document.getElementById('swBody');
    const steps = [
      this._stepWelcome,
      this._stepTenants,
      this._stepAlerts,
      this._stepPersonalize,
      this._stepComplete
    ];
    body.innerHTML = '<div class="sw-content">' + steps[this._currentStep].call(this) + '</div>';
    this._bindStepEvents();
  },

  _renderFooter() {
    const footer = document.getElementById('swFooter');
    const isFirst = this._currentStep === 0;
    const isLast = this._currentStep === this._totalSteps - 1;

    let left = '';
    if (isFirst) {
      left = `<button class="sw-skip-link" id="swSkip">Skip Setup</button>`;
    } else {
      left = `<button class="sw-btn sw-btn-ghost" id="swBack">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
        Back
      </button>`;
    }

    let right = '';
    if (isLast) {
      right = `<button class="sw-btn sw-btn-primary" id="swFinish">
        Go to Dashboard
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
      </button>`;
    } else {
      right = `<button class="sw-btn sw-btn-primary" id="swNext">
        ${isFirst ? 'Get Started' : 'Next'}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
      </button>`;
    }

    footer.innerHTML = `<div>${left}</div><div>${right}</div>`;

    // Bind footer events
    const skip = document.getElementById('swSkip');
    const back = document.getElementById('swBack');
    const next = document.getElementById('swNext');
    const finish = document.getElementById('swFinish');

    if (skip) skip.addEventListener('click', () => this._skip());
    if (back) back.addEventListener('click', () => { this._currentStep--; this._render(); });
    if (next) next.addEventListener('click', () => { this._collectStepData(); this._currentStep++; this._render(); });
    if (finish) finish.addEventListener('click', () => { this._complete(); if (typeof Router !== 'undefined') Router.navigate('dashboard'); });
  },

  // ---- Internal: Step HTML ----

  _stepWelcome() {
    return `
      <h2 class="sw-title">Welcome to MSP Device Manager</h2>
      <p class="sw-subtitle">
        Your centralized hub for managing Microsoft 365 devices across all your tenants.
        Let's get you set up in just a few steps.
      </p>
      <div class="sw-features">
        <div class="sw-feature">
          <div class="sw-feature-icon" style="background:var(--primary-pale);color:var(--primary);">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
          </div>
          <div>
            <div class="sw-feature-text">Device Management</div>
            <div class="sw-feature-desc">Monitor and manage all Intune devices</div>
          </div>
        </div>
        <div class="sw-feature">
          <div class="sw-feature-icon" style="background:var(--success-pale);color:var(--success);">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
          <div>
            <div class="sw-feature-text">Compliance Tracking</div>
            <div class="sw-feature-desc">Real-time compliance status across tenants</div>
          </div>
        </div>
        <div class="sw-feature">
          <div class="sw-feature-icon" style="background:var(--warning-pale);color:var(--warning);">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
          </div>
          <div>
            <div class="sw-feature-text">Multi-Tenant GDAP</div>
            <div class="sw-feature-desc">Manage clients via Partner Center</div>
          </div>
        </div>
        <div class="sw-feature">
          <div class="sw-feature-icon" style="background:var(--secondary-pale);color:var(--secondary);">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          </div>
          <div>
            <div class="sw-feature-text">Reports & Export</div>
            <div class="sw-feature-desc">Generate and export device reports</div>
          </div>
        </div>
      </div>
    `;
  },

  _stepTenants() {
    return `
      <h2 class="sw-title">Connect Your Tenants</h2>
      <p class="sw-subtitle">
        MSP Device Manager uses Azure AD App Registration and GDAP to securely
        access your clients' Microsoft 365 environments.
      </p>
      <div style="display:flex;flex-direction:column;gap:12px;">
        <div class="sw-feature" style="grid-column:span 2;">
          <div class="sw-feature-icon" style="background:var(--primary-pale);color:var(--primary);">
            <strong>1</strong>
          </div>
          <div>
            <div class="sw-feature-text">Create an Azure AD App Registration</div>
            <div class="sw-feature-desc">Register a multi-tenant app with the required Microsoft Graph permissions.</div>
          </div>
        </div>
        <div class="sw-feature" style="grid-column:span 2;">
          <div class="sw-feature-icon" style="background:var(--primary-pale);color:var(--primary);">
            <strong>2</strong>
          </div>
          <div>
            <div class="sw-feature-text">Configure GDAP Relationships</div>
            <div class="sw-feature-desc">Set up Granular Delegated Admin Privileges in Partner Center for each client.</div>
          </div>
        </div>
        <div class="sw-feature" style="grid-column:span 2;">
          <div class="sw-feature-icon" style="background:var(--primary-pale);color:var(--primary);">
            <strong>3</strong>
          </div>
          <div>
            <div class="sw-feature-text">Add Tenants in the App</div>
            <div class="sw-feature-desc">Go to Tenant Management to connect and verify your client tenants.</div>
          </div>
        </div>
      </div>
      <div class="sw-callout">
        <span class="sw-callout-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
        </span>
        <span>You can skip this step now and set up tenants later from the <strong>Tenant Management</strong> page.</span>
      </div>
    `;
  },

  _stepAlerts() {
    const d = this._stepData;
    return `
      <h2 class="sw-title">Configure Alerts</h2>
      <p class="sw-subtitle">
        Set up notification thresholds so you're alerted when devices fall out of compliance
        or become stale. You can adjust these anytime in Settings.
      </p>
      <div class="sw-form-group">
        <label>Compliance Threshold</label>
        <div class="sw-range-row">
          <input type="range" id="swComplianceRange" min="50" max="100" step="5" value="${d.complianceThreshold}">
          <span class="sw-range-value" id="swComplianceValue">${d.complianceThreshold}%</span>
        </div>
        <div class="sw-form-hint">Alert when overall compliance drops below this percentage. Recommended: 80%</div>
      </div>
      <div class="sw-form-group">
        <label>Stale Device Threshold (days)</label>
        <div class="sw-range-row">
          <input type="range" id="swStaleRange" min="7" max="90" step="1" value="${d.staleDeviceDays}">
          <span class="sw-range-value" id="swStaleValue">${d.staleDeviceDays}d</span>
        </div>
        <div class="sw-form-hint">Flag devices that haven't checked in for this many days. Recommended: 30 days</div>
      </div>
      <div class="sw-callout">
        <span class="sw-callout-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
        </span>
        <span>These are recommended defaults. You can fine-tune them later from <strong>Settings &gt; Alerts</strong>.</span>
      </div>
    `;
  },

  _stepPersonalize() {
    const d = this._stepData;
    const hasI18n = typeof I18n !== 'undefined';
    return `
      <h2 class="sw-title">Personalize Your Experience</h2>
      <p class="sw-subtitle">
        Make the app feel like yours. Choose a theme and set your display name.
      </p>
      <div class="sw-form-group">
        <label>Theme</label>
        <div class="sw-theme-options">
          <div class="sw-theme-card ${d.theme === 'light' ? 'selected' : ''}" data-theme="light">
            <div class="sw-theme-preview" style="background:linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);"></div>
            <div class="sw-theme-label">Light</div>
          </div>
          <div class="sw-theme-card ${d.theme === 'dark' ? 'selected' : ''}" data-theme="dark">
            <div class="sw-theme-preview" style="background:linear-gradient(135deg, #1e293b 0%, #0f172a 100%);"></div>
            <div class="sw-theme-label">Dark</div>
          </div>
        </div>
      </div>
      ${hasI18n ? `
      <div class="sw-form-group">
        <label>Language</label>
        <select id="swLanguage">
          <option value="en" ${d.language === 'en' ? 'selected' : ''}>English</option>
          <option value="de" ${d.language === 'de' ? 'selected' : ''}>Deutsch</option>
          <option value="fr" ${d.language === 'fr' ? 'selected' : ''}>Fran\u00e7ais</option>
          <option value="es" ${d.language === 'es' ? 'selected' : ''}>Espa\u00f1ol</option>
          <option value="nl" ${d.language === 'nl' ? 'selected' : ''}>Nederlands</option>
        </select>
      </div>
      ` : ''}
      <div class="sw-form-group">
        <label>Display Name</label>
        <input type="text" id="swDisplayName" placeholder="e.g. Tim from Contoso IT" value="${d.displayName || ''}">
        <div class="sw-form-hint">This name appears in the sidebar and reports.</div>
      </div>
    `;
  },

  _stepComplete() {
    const d = this._stepData;
    const items = [
      { label: 'App introduction', done: true },
      { label: 'Tenant connection guidance', done: true },
      { label: `Compliance threshold: ${d.complianceThreshold}%`, done: d.complianceThreshold != null },
      { label: `Stale device alert: ${d.staleDeviceDays} days`, done: d.staleDeviceDays != null },
      { label: `Theme: ${d.theme || 'Light'}`, done: !!d.theme },
      { label: d.displayName ? `Display name: ${d.displayName}` : 'Display name: not set', done: !!d.displayName }
    ];

    let listHtml = '<ul class="sw-checklist">';
    items.forEach(item => {
      const icon = item.done
        ? '<span class="sw-check-icon done"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg></span>'
        : '<span class="sw-check-icon pending">&mdash;</span>';
      listHtml += `<li>${icon} ${item.label}</li>`;
    });
    listHtml += '</ul>';

    return `
      <div style="text-align:center;margin-bottom:8px;">
        <div style="width:56px;height:56px;border-radius:50%;background:var(--success-pale);color:var(--success);display:inline-flex;align-items:center;justify-content:center;margin-bottom:12px;">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        </div>
        <h2 class="sw-title">You're All Set!</h2>
        <p class="sw-subtitle" style="margin-bottom:8px;">
          Here's a summary of your setup. You can change anything later in Settings.
        </p>
      </div>
      ${listHtml}
      <div class="sw-quicklinks">
        <div class="sw-quicklink" data-nav="dashboard">
          <span class="sw-quicklink-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
          </span>
          <span class="sw-quicklink-text">Dashboard</span>
        </div>
        <div class="sw-quicklink" data-nav="devices">
          <span class="sw-quicklink-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
          </span>
          <span class="sw-quicklink-text">Devices</span>
        </div>
        <div class="sw-quicklink" data-nav="reports">
          <span class="sw-quicklink-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
          </span>
          <span class="sw-quicklink-text">Reports</span>
        </div>
      </div>
    `;
  },

  // ---- Internal: Event Binding ----

  _bindStepEvents() {
    // Step 2 (Alerts) — range sliders
    const compRange = document.getElementById('swComplianceRange');
    const compValue = document.getElementById('swComplianceValue');
    if (compRange && compValue) {
      compRange.addEventListener('input', () => {
        compValue.textContent = compRange.value + '%';
      });
    }

    const staleRange = document.getElementById('swStaleRange');
    const staleValue = document.getElementById('swStaleValue');
    if (staleRange && staleValue) {
      staleRange.addEventListener('input', () => {
        staleValue.textContent = staleRange.value + 'd';
      });
    }

    // Step 3 (Personalize) — theme cards
    document.querySelectorAll('.sw-theme-card').forEach(card => {
      card.addEventListener('click', () => {
        document.querySelectorAll('.sw-theme-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        this._stepData.theme = card.dataset.theme;
      });
    });

    // Step 4 (Complete) — quick links
    document.querySelectorAll('.sw-quicklink[data-nav]').forEach(link => {
      link.addEventListener('click', () => {
        const page = link.dataset.nav;
        this._complete();
        if (typeof Router !== 'undefined') Router.navigate(page);
      });
    });
  },

  _collectStepData() {
    // Collect data from the current step's form elements before advancing
    const compRange = document.getElementById('swComplianceRange');
    if (compRange) this._stepData.complianceThreshold = parseInt(compRange.value, 10);

    const staleRange = document.getElementById('swStaleRange');
    if (staleRange) this._stepData.staleDeviceDays = parseInt(staleRange.value, 10);

    const langSelect = document.getElementById('swLanguage');
    if (langSelect) this._stepData.language = langSelect.value;

    const nameInput = document.getElementById('swDisplayName');
    if (nameInput) this._stepData.displayName = nameInput.value.trim();

    this._saveStepData();
  }
};
