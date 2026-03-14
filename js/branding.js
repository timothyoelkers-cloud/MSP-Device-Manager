/* ============================================================
   Branding — White-label & custom branding settings
   ============================================================ */

const Branding = {
  _storageKey: 'msp_branding',
  _defaults: {
    companyName: 'MSP Device Manager',
    logoUrl: '',
    primaryColor: '#2563eb',
    accentColor: '#0891b2',
    faviconUrl: '',
    customCss: ''
  },

  init() {
    this._apply();
  },

  getConfig() {
    try {
      return { ...this._defaults, ...JSON.parse(localStorage.getItem(this._storageKey) || '{}') };
    } catch (e) { return { ...this._defaults }; }
  },

  saveConfig(config) {
    localStorage.setItem(this._storageKey, JSON.stringify(config));
    this._apply();
  },

  _apply() {
    const config = this.getConfig();

    // Apply company name
    const logoText = document.querySelector('.topbar-logo-text');
    if (logoText && config.companyName && config.companyName !== this._defaults.companyName) {
      logoText.innerHTML = config.companyName;
    }

    // Apply custom logo
    const logoIcon = document.querySelector('.topbar-logo-icon');
    if (logoIcon && config.logoUrl) {
      logoIcon.innerHTML = `<img src="${config.logoUrl}" alt="Logo" style="width:24px;height:24px;object-fit:contain;">`;
    }

    // Apply custom colors
    if (config.primaryColor !== this._defaults.primaryColor) {
      document.documentElement.style.setProperty('--primary', config.primaryColor);
      // Generate lighter/darker variants
      const hex = config.primaryColor;
      document.documentElement.style.setProperty('--primary-pale', hex + '15');
      document.documentElement.style.setProperty('--primary-bg', hex + '08');
    }

    if (config.accentColor !== this._defaults.accentColor) {
      document.documentElement.style.setProperty('--secondary', config.accentColor);
    }

    // Apply custom CSS
    let styleEl = document.getElementById('brandingCustomCss');
    if (config.customCss) {
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'brandingCustomCss';
        document.head.appendChild(styleEl);
      }
      styleEl.textContent = config.customCss;
    } else if (styleEl) {
      styleEl.remove();
    }

    // Apply custom favicon
    if (config.faviconUrl) {
      let favicon = document.querySelector('link[rel="icon"]');
      if (favicon) favicon.href = config.faviconUrl;
    }
  },

  reset() {
    localStorage.removeItem(this._storageKey);
    // Remove custom CSS
    const styleEl = document.getElementById('brandingCustomCss');
    if (styleEl) styleEl.remove();
    // Reset CSS variables
    document.documentElement.style.removeProperty('--primary');
    document.documentElement.style.removeProperty('--primary-pale');
    document.documentElement.style.removeProperty('--primary-bg');
    document.documentElement.style.removeProperty('--secondary');
    // Reload to reset everything
    location.reload();
  },

  render() {
    const main = document.getElementById('mainContent');
    const config = this.getConfig();

    main.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h1 class="page-title">Custom Branding</h1>
          <p class="page-subtitle">White-label the application with your company's branding</p>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-secondary" onclick="Branding.reset()">Reset to Defaults</button>
        </div>
      </div>

      <div class="grid grid-2 gap-6">
        <!-- Identity -->
        <div class="card">
          <div class="card-header">
            <div class="card-header-title">Company Identity</div>
          </div>
          <div class="card-body">
            <div class="form-group mb-4">
              <label class="form-label">Company Name</label>
              <input type="text" class="form-input" id="brandCompanyName" value="${config.companyName}"
                placeholder="Your Company Name">
              <span class="form-hint">Displayed in the top navigation bar</span>
            </div>
            <div class="form-group mb-4">
              <label class="form-label">Logo URL</label>
              <input type="url" class="form-input" id="brandLogoUrl" value="${config.logoUrl}"
                placeholder="https://example.com/logo.png">
              <span class="form-hint">Square image, 24x24px recommended (PNG or SVG)</span>
            </div>
            <div class="form-group mb-4">
              <label class="form-label">Favicon URL</label>
              <input type="url" class="form-input" id="brandFaviconUrl" value="${config.faviconUrl}"
                placeholder="https://example.com/favicon.ico">
            </div>
          </div>
        </div>

        <!-- Colors -->
        <div class="card">
          <div class="card-header">
            <div class="card-header-title">Brand Colors</div>
          </div>
          <div class="card-body">
            <div class="form-group mb-4">
              <label class="form-label">Primary Color</label>
              <div style="display:flex;gap:8px;align-items:center;">
                <input type="color" id="brandPrimaryColor" value="${config.primaryColor}"
                  style="width:48px;height:36px;border:1px solid var(--border);border-radius:var(--radius-sm);cursor:pointer;">
                <input type="text" class="form-input" id="brandPrimaryHex" value="${config.primaryColor}"
                  style="flex:1;font-family:var(--font-mono);font-size:var(--text-sm);"
                  oninput="document.getElementById('brandPrimaryColor').value = this.value">
              </div>
              <span class="form-hint">Used for buttons, links, active states</span>
            </div>
            <div class="form-group mb-4">
              <label class="form-label">Accent Color</label>
              <div style="display:flex;gap:8px;align-items:center;">
                <input type="color" id="brandAccentColor" value="${config.accentColor}"
                  style="width:48px;height:36px;border:1px solid var(--border);border-radius:var(--radius-sm);cursor:pointer;">
                <input type="text" class="form-input" id="brandAccentHex" value="${config.accentColor}"
                  style="flex:1;font-family:var(--font-mono);font-size:var(--text-sm);"
                  oninput="document.getElementById('brandAccentColor').value = this.value">
              </div>
              <span class="form-hint">Used for secondary highlights</span>
            </div>

            <!-- Preview -->
            <div class="detail-section-title mt-4">Preview</div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
              <button class="btn btn-primary btn-sm">Primary Button</button>
              <span class="badge badge-primary">Badge</span>
              <span class="chip chip-active">Active Chip</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Custom CSS -->
      <div class="card mt-6">
        <div class="card-header">
          <div class="card-header-title">Custom CSS</div>
        </div>
        <div class="card-body">
          <div class="form-group">
            <label class="form-label">Additional CSS</label>
            <textarea class="form-textarea" id="brandCustomCss" rows="6"
              style="font-family:var(--font-mono);font-size:var(--text-xs);"
              placeholder="/* Add custom CSS overrides here */">${config.customCss || ''}</textarea>
            <span class="form-hint">Advanced: Add custom CSS rules to override default styles</span>
          </div>
        </div>
      </div>

      <div style="display:flex;gap:8px;margin-top:16px;">
        <button class="btn btn-primary" onclick="Branding._save()">Save Branding</button>
        <button class="btn btn-secondary" onclick="Branding._preview()">Preview Changes</button>
      </div>
    `;

    // Sync color pickers with hex inputs
    document.getElementById('brandPrimaryColor')?.addEventListener('input', (e) => {
      document.getElementById('brandPrimaryHex').value = e.target.value;
    });
    document.getElementById('brandAccentColor')?.addEventListener('input', (e) => {
      document.getElementById('brandAccentHex').value = e.target.value;
    });
  },

  _save() {
    const config = {
      companyName: document.getElementById('brandCompanyName')?.value || this._defaults.companyName,
      logoUrl: document.getElementById('brandLogoUrl')?.value || '',
      faviconUrl: document.getElementById('brandFaviconUrl')?.value || '',
      primaryColor: document.getElementById('brandPrimaryHex')?.value || this._defaults.primaryColor,
      accentColor: document.getElementById('brandAccentHex')?.value || this._defaults.accentColor,
      customCss: document.getElementById('brandCustomCss')?.value || ''
    };
    this.saveConfig(config);
    Toast.show('Branding saved and applied', 'success');
  },

  _preview() {
    // Temporarily apply without saving
    const primaryColor = document.getElementById('brandPrimaryHex')?.value;
    if (primaryColor) {
      document.documentElement.style.setProperty('--primary', primaryColor);
    }
    const accentColor = document.getElementById('brandAccentHex')?.value;
    if (accentColor) {
      document.documentElement.style.setProperty('--secondary', accentColor);
    }
    Toast.show('Preview applied (not saved yet)', 'info');
  }
};

Branding.init();
