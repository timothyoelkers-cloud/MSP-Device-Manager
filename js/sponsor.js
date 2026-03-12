/* ============================================================
   Sponsor — GitHub Sponsors integration + sponsor banners
   ============================================================ */

const Sponsor = {
  githubSponsorUrl: 'https://github.com/sponsors/timothyoelkers-cloud',

  // Sponsor tiers for the banner rotation
  sponsorTiers: [
    {
      name: 'Community Supporter',
      amount: '$5/month',
      perks: 'Name in sponsors list, early access to features'
    },
    {
      name: 'MSP Partner',
      amount: '$25/month',
      perks: 'Priority support, Pro license key, feature requests'
    },
    {
      name: 'Enterprise Sponsor',
      amount: '$100/month',
      perks: 'Logo on site, dedicated support, custom features'
    }
  ],

  // Current sponsors (loaded or hardcoded)
  currentSponsors: [],

  // Render sponsor banner on dashboard
  renderDashboardBanner() {
    const tier = AppState.get('licenseTier');
    if (tier === 'pro') return ''; // Don't show to Pro users

    const randomTier = this.sponsorTiers[Math.floor(Math.random() * this.sponsorTiers.length)];

    return `
      <div class="sponsor-banner animate-fade">
        <span class="sponsor-banner-icon">&#9829;</span>
        <div class="sponsor-banner-content">
          <div class="sponsor-banner-title">Support MSP Device Manager</div>
          <div class="sponsor-banner-text">
            Become a <strong>${randomTier.name}</strong> (${randomTier.amount}) — ${randomTier.perks}.
          </div>
        </div>
        <a href="${this.githubSponsorUrl}" target="_blank" class="btn btn-primary btn-sm" style="flex-shrink:0;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
          Sponsor
        </a>
      </div>
    `;
  },

  // Render powered-by sponsor area (for enterprise sponsors)
  renderPoweredBy() {
    if (this.currentSponsors.length === 0) {
      return `
        <div class="card" style="text-align:center; padding: 1.5rem;">
          <div class="text-xs text-muted mb-2">Sponsor Showcase</div>
          <p class="text-sm text-secondary mb-3">Your logo could appear here. Enterprise sponsors get prominent placement.</p>
          <a href="${this.githubSponsorUrl}" target="_blank" class="btn btn-secondary btn-sm">Become a Sponsor</a>
        </div>
      `;
    }

    return `
      <div class="card" style="padding: 1.5rem;">
        <div class="text-xs text-muted mb-3 text-center">Powered by our Sponsors</div>
        <div class="flex flex-wrap justify-center gap-4">
          ${this.currentSponsors.map(s => `
            <a href="${s.url}" target="_blank" class="flex items-center gap-2" style="text-decoration:none;">
              ${s.logo ? `<img src="${s.logo}" alt="${s.name}" style="height:28px;">` : ''}
              <span class="text-sm fw-500" style="color:var(--ink);">${s.name}</span>
            </a>
          `).join('')}
        </div>
      </div>
    `;
  },

  // Render sponsorship page/section for settings
  renderSponsorSection() {
    return `
      <div class="card">
        <div class="card-header">
          <div class="card-header-title">Sponsorship Tiers</div>
        </div>
        <div class="card-body">
          <div class="grid grid-3 gap-4">
            ${this.sponsorTiers.map((tier, i) => `
              <div class="card" style="border: ${i === 1 ? '2px solid var(--primary)' : '1px solid var(--border)'};">
                <div class="card-body-compact text-center">
                  ${i === 1 ? '<span class="badge badge-primary mb-2">Most Popular</span>' : ''}
                  <h4 class="mb-1">${tier.name}</h4>
                  <div class="text-2xl fw-700 mb-2" style="color:var(--primary);">${tier.amount}</div>
                  <p class="text-sm text-muted mb-3">${tier.perks}</p>
                  <a href="${this.githubSponsorUrl}" target="_blank" class="btn ${i === 1 ? 'btn-primary' : 'btn-secondary'} btn-sm w-full">
                    Choose ${tier.name}
                  </a>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }
};
