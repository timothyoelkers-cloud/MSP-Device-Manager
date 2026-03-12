/* ============================================================
   Licensing — Tier system + license key validation
   ============================================================ */

const Licensing = {
  // Pro license key hashes (SHA-256) — add valid keys here
  // These are hashed for security; the actual keys are not stored in code
  validKeyHashes: [
    // Example: hash of "MSP-PRO-2026-DEMO"
    'a1b2c3d4e5f6' // Placeholder — replace with actual SHA-256 hashes
  ],

  features: {
    free: {
      name: 'Free',
      maxTenants: 3,
      bulkActions: false,
      exportCSV: true,
      autopilotExport: false,
      prioritySupport: false,
      customBranding: false,
      apiAccess: false
    },
    pro: {
      name: 'Pro',
      maxTenants: Infinity,
      bulkActions: true,
      exportCSV: true,
      autopilotExport: true,
      prioritySupport: true,
      customBranding: true,
      apiAccess: true
    }
  },

  showModal() {
    document.getElementById('licenseModal')?.classList.remove('hidden');
    document.getElementById('licenseKeyInput')?.focus();
  },

  async validateKey() {
    const input = document.getElementById('licenseKeyInput');
    const key = (input?.value || '').trim().toUpperCase();

    if (!key) {
      Toast.show('Please enter a license key', 'warning');
      return;
    }

    // Hash the key
    const hash = await this.hashKey(key);

    // Check against valid hashes
    // For demo purposes, also accept keys matching pattern MSP-PRO-XXXX-XXXX
    const isValid = this.validKeyHashes.includes(hash) ||
                    /^MSP-PRO-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(key);

    if (isValid) {
      AppState.set('licenseTier', 'pro');
      AppState.set('licenseKey', key);
      document.getElementById('licenseModal')?.classList.add('hidden');
      Toast.show('Pro license activated! All features unlocked.', 'success', 'License Activated');

      // Re-render current page to reflect tier changes
      Router.render(AppState.get('currentPage'));
      Auth.updateTenantSelectors();
    } else {
      Toast.show('Invalid license key. Please check and try again.', 'error', 'Validation Failed');
      input?.classList.add('error');
      setTimeout(() => input?.classList.remove('error'), 500);
    }
  },

  async hashKey(key) {
    const encoded = new TextEncoder().encode(key);
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  },

  // Check if a feature is available in current tier
  canUse(feature) {
    const tier = AppState.get('licenseTier');
    const features = this.features[tier] || this.features.free;
    return !!features[feature];
  },

  // Check tenant limit
  canAddTenant() {
    const tier = AppState.get('licenseTier');
    const features = this.features[tier] || this.features.free;
    const currentCount = AppState.get('tenants').length;
    return currentCount < features.maxTenants;
  },

  // Get tier display for UI
  getTierBadge() {
    const tier = AppState.get('licenseTier');
    if (tier === 'pro') {
      return '<span class="badge badge-primary">Pro</span>';
    }
    return '<span class="badge badge-default">Free</span>';
  },

  // Render upgrade prompt
  renderUpgradePrompt(feature) {
    return `
      <div class="card" style="text-align:center; padding: 2rem;">
        <div class="stat-card-icon blue" style="margin: 0 auto 1rem; width:48px; height:48px;">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
        </div>
        <h3 style="margin-bottom: 0.5rem;">Pro Feature</h3>
        <p class="text-sm text-muted" style="margin-bottom: 1rem;">The "${feature}" feature requires a Pro license.</p>
        <button class="btn btn-primary" onclick="Licensing.showModal()">Upgrade to Pro</button>
      </div>
    `;
  }
};
