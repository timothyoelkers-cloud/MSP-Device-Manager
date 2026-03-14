/* ============================================================
   Onboarding — First-time guided tour
   ============================================================ */

const Onboarding = {
  _step: 0,
  _overlay: null,
  _storageKey: 'msp_onboarding_complete',

  steps: [
    {
      target: '.topbar-logo',
      title: 'Welcome to MSP Device Manager',
      text: 'Manage all your Microsoft 365 tenants from one dashboard. Let\'s take a quick tour.',
      position: 'bottom'
    },
    {
      target: '#connectBtn',
      title: 'Connect Your Tenants',
      text: 'Click here to connect your first M365 tenant. You can sign in directly or use Partner Center GDAP for all customers.',
      position: 'bottom'
    },
    {
      target: '#sidebarTenantFilter',
      title: 'Filter by Tenant',
      text: 'Use this dropdown to filter all views by a specific tenant, or select "All Tenants" for a cross-tenant overview.',
      position: 'right'
    },
    {
      target: '[data-page="devices"]',
      title: 'Device Management',
      text: 'View all devices across tenants, check compliance, sync devices, and perform bulk actions like restart, wipe, or lock.',
      position: 'right'
    },
    {
      target: '[data-page="compliance"]',
      title: 'Compliance & Security',
      text: 'Monitor compliance policies, configuration profiles, security baselines, and conditional access policies.',
      position: 'right'
    },
    {
      target: '#darkModeToggle',
      title: 'Dark Mode',
      text: 'Toggle between light and dark themes. Your preference is saved automatically.',
      position: 'bottom'
    },
    {
      target: null,
      title: 'You\'re All Set!',
      text: 'Start by connecting a tenant. Press ? anytime to see keyboard shortcuts. Enjoy MSP Device Manager!',
      position: 'center'
    }
  ],

  shouldShow() {
    return !localStorage.getItem(this._storageKey);
  },

  start() {
    this._step = 0;
    this._renderStep();
  },

  skip() {
    localStorage.setItem(this._storageKey, '1');
    this._cleanup();
  },

  next() {
    this._step++;
    if (this._step >= this.steps.length) {
      this.complete();
    } else {
      this._renderStep();
    }
  },

  prev() {
    this._step = Math.max(0, this._step - 1);
    this._renderStep();
  },

  complete() {
    localStorage.setItem(this._storageKey, '1');
    this._cleanup();
    Toast.show('Tour complete! Connect a tenant to get started.', 'success');
  },

  _cleanup() {
    const overlay = document.getElementById('onboardingOverlay');
    if (overlay) overlay.remove();
    const tooltip = document.getElementById('onboardingTooltip');
    if (tooltip) tooltip.remove();
    // Remove any highlights
    document.querySelectorAll('.onboarding-highlight').forEach(el => el.classList.remove('onboarding-highlight'));
  },

  _renderStep() {
    this._cleanup();
    const step = this.steps[this._step];
    if (!step) return;

    // Create overlay
    const overlay = document.createElement('div');
    overlay.id = 'onboardingOverlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9998;';
    document.body.appendChild(overlay);

    // Highlight target element
    let targetRect = null;
    if (step.target) {
      const el = document.querySelector(step.target);
      if (el) {
        el.classList.add('onboarding-highlight');
        targetRect = el.getBoundingClientRect();
        // Cut hole in overlay
        overlay.style.cssText += `clip-path: polygon(
          0 0, 100% 0, 100% 100%, 0 100%,
          0 ${targetRect.top - 4}px,
          ${targetRect.left - 4}px ${targetRect.top - 4}px,
          ${targetRect.left - 4}px ${targetRect.bottom + 4}px,
          ${targetRect.right + 4}px ${targetRect.bottom + 4}px,
          ${targetRect.right + 4}px ${targetRect.top - 4}px,
          0 ${targetRect.top - 4}px
        );`;
      }
    }

    // Create tooltip
    const tooltip = document.createElement('div');
    tooltip.id = 'onboardingTooltip';
    tooltip.style.cssText = 'position:fixed;z-index:9999;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);box-shadow:var(--shadow-xl);padding:20px;width:340px;animation:scaleIn 0.2s var(--ease);';

    // Position tooltip
    if (step.position === 'center' || !targetRect) {
      tooltip.style.top = '50%';
      tooltip.style.left = '50%';
      tooltip.style.transform = 'translate(-50%, -50%)';
    } else if (step.position === 'bottom') {
      tooltip.style.top = (targetRect.bottom + 12) + 'px';
      tooltip.style.left = Math.max(16, Math.min(targetRect.left, window.innerWidth - 360)) + 'px';
    } else if (step.position === 'right') {
      tooltip.style.top = targetRect.top + 'px';
      tooltip.style.left = (targetRect.right + 12) + 'px';
    }

    tooltip.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
        <span class="text-xs text-muted">Step ${this._step + 1} of ${this.steps.length}</span>
        <button class="btn btn-ghost btn-sm" onclick="Onboarding.skip()" style="padding:2px 6px;">Skip Tour</button>
      </div>
      <h4 style="margin-bottom:6px;font-size:var(--text-base);">${step.title}</h4>
      <p class="text-sm text-muted" style="margin-bottom:16px;line-height:1.5;">${step.text}</p>
      <div style="display:flex;justify-content:space-between;">
        ${this._step > 0 ? `<button class="btn btn-secondary btn-sm" onclick="Onboarding.prev()">Back</button>` : '<div></div>'}
        <button class="btn btn-primary btn-sm" onclick="Onboarding.next()">${this._step < this.steps.length - 1 ? 'Next' : 'Get Started'}</button>
      </div>
      <!-- Dots -->
      <div style="display:flex;justify-content:center;gap:4px;margin-top:12px;">
        ${this.steps.map((_, i) => `<div style="width:6px;height:6px;border-radius:50%;background:${i === this._step ? 'var(--primary)' : 'var(--gray-300)'};"></div>`).join('')}
      </div>
    `;

    document.body.appendChild(tooltip);
  }
};
