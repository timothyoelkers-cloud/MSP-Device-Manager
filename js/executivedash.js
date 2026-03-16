/* ============================================================
   Executive Dashboard — Client-facing presentation view
   High-level KPIs, tenant health, risk summary, recommendations
   ============================================================ */

const ExecutiveDash = {

  /* ---- Main render ---- */
  render() {
    const main = document.getElementById('mainContent');
    const tenants = AppState.get('tenants') || [];
    const allDevices = AppState.get('devices') || {};
    const allUsers = AppState.get('users') || {};
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    // Aggregate metrics
    const totalDevices = this._countAllDevices();
    const totalUsers = this._countAllUsers();
    const complianceRate = this._getOverallComplianceRate();
    const securityScore = this._getOverallScore();
    const risks = this._getRiskItems();
    const recommendations = this._generateRecommendations();
    const complianceColor = complianceRate >= 80 ? 'var(--success)' : complianceRate >= 50 ? 'var(--warning)' : 'var(--danger)';
    const scoreColor = securityScore >= 80 ? 'var(--success)' : securityScore >= 50 ? 'var(--warning)' : 'var(--danger)';

    main.innerHTML = `
      <!-- Print-optimized styles -->
      <style>
        .exec-dash { max-width: 1100px; margin: 0 auto; }
        .exec-banner {
          background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
          color: white; border-radius: 16px; padding: 36px 40px; margin-bottom: 32px;
          display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;
        }
        .exec-banner h1 { font-size: 28px; font-weight: 700; margin: 0 0 6px 0; letter-spacing: -0.5px; }
        .exec-banner-sub { font-size: 14px; opacity: 0.85; }
        .exec-banner-stat { text-align: right; }
        .exec-banner-stat-value { font-size: 42px; font-weight: 800; line-height: 1; }
        .exec-banner-stat-label { font-size: 13px; opacity: 0.8; margin-top: 4px; }

        .exec-kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 32px; }
        .exec-kpi {
          background: var(--surface); border: 1px solid var(--border); border-radius: 14px;
          padding: 28px 24px; text-align: center; position: relative; overflow: hidden;
        }
        .exec-kpi-value { font-size: 44px; font-weight: 800; line-height: 1.1; letter-spacing: -1px; }
        .exec-kpi-label { font-size: 13px; color: var(--ink-secondary); margin-top: 8px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px; }
        .exec-kpi-icon { position: absolute; top: 14px; right: 16px; opacity: 0.15; }

        .exec-gauge {
          width: 80px; height: 40px; margin: 0 auto 8px; position: relative; overflow: hidden;
        }
        .exec-gauge svg { width: 80px; height: 40px; }

        .exec-section-title {
          font-size: 18px; font-weight: 700; color: var(--ink); margin: 0 0 16px 0;
          padding-bottom: 8px; border-bottom: 2px solid var(--primary-pale);
        }

        .exec-tenant-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; margin-bottom: 32px; }
        .exec-tenant-card {
          background: var(--surface); border: 1px solid var(--border); border-radius: 12px;
          padding: 20px; display: flex; flex-direction: column; gap: 12px;
        }
        .exec-tenant-header { display: flex; justify-content: space-between; align-items: center; }
        .exec-tenant-name { font-size: 15px; font-weight: 600; color: var(--ink); }
        .exec-traffic-light {
          width: 14px; height: 14px; border-radius: 50%; display: inline-block; flex-shrink: 0;
        }
        .exec-tenant-metrics { display: flex; gap: 16px; flex-wrap: wrap; }
        .exec-tenant-metric { text-align: center; flex: 1; min-width: 60px; }
        .exec-tenant-metric-value { font-size: 22px; font-weight: 700; line-height: 1.2; }
        .exec-tenant-metric-label { font-size: 11px; color: var(--ink-tertiary); text-transform: uppercase; letter-spacing: 0.3px; }
        .exec-tenant-bar { height: 6px; background: var(--gray-100); border-radius: 3px; overflow: hidden; }
        .exec-tenant-bar-fill { height: 100%; border-radius: 3px; transition: width 0.5s ease; }

        .exec-risk-card {
          background: var(--surface); border: 1px solid var(--border); border-radius: 12px;
          padding: 24px; margin-bottom: 32px;
        }
        .exec-risk-item {
          display: flex; align-items: flex-start; gap: 12px; padding: 14px 0;
          border-bottom: 1px solid var(--border-light);
        }
        .exec-risk-item:last-child { border-bottom: none; padding-bottom: 0; }
        .exec-risk-rank {
          width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center;
          justify-content: center; font-size: 13px; font-weight: 700; color: white; flex-shrink: 0;
        }
        .exec-risk-text { font-size: 14px; color: var(--ink); line-height: 1.5; }
        .exec-risk-severity { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.3px; margin-top: 2px; }

        .exec-rec-card {
          background: var(--surface); border: 1px solid var(--border); border-radius: 12px;
          padding: 24px; margin-bottom: 32px;
        }
        .exec-rec-item {
          display: flex; align-items: flex-start; gap: 14px; padding: 14px 0;
          border-bottom: 1px solid var(--border-light);
        }
        .exec-rec-item:last-child { border-bottom: none; padding-bottom: 0; }
        .exec-rec-priority {
          font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;
          padding: 3px 8px; border-radius: 4px; flex-shrink: 0; margin-top: 2px;
        }
        .exec-rec-priority.high { background: var(--danger-pale); color: var(--danger); }
        .exec-rec-priority.medium { background: var(--warning-pale); color: var(--warning); }
        .exec-rec-priority.low { background: var(--success-pale); color: var(--success); }
        .exec-rec-text { font-size: 14px; color: var(--ink); line-height: 1.5; }
        .exec-rec-impact { font-size: 12px; color: var(--ink-secondary); margin-top: 2px; }

        .exec-footer {
          text-align: center; padding: 24px 0; margin-top: 16px;
          border-top: 1px solid var(--border); color: var(--ink-tertiary); font-size: 12px;
        }

        .exec-actions { display: flex; gap: 10px; flex-wrap: wrap; }

        @media print {
          body * { visibility: hidden; }
          .exec-dash, .exec-dash * { visibility: visible; }
          .exec-dash { position: absolute; left: 0; top: 0; width: 100%; max-width: none; }
          .exec-actions, .sidebar, .topbar, #toastContainer { display: none !important; }
          .exec-banner { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .exec-kpi, .exec-tenant-card, .exec-risk-card, .exec-rec-card {
            break-inside: avoid; page-break-inside: avoid;
          }
          .exec-traffic-light, .exec-risk-rank, .exec-tenant-bar-fill, .exec-rec-priority {
            -webkit-print-color-adjust: exact; print-color-adjust: exact;
          }
        }

        @media (max-width: 768px) {
          .exec-kpi-grid { grid-template-columns: repeat(2, 1fr); }
          .exec-banner { padding: 24px; }
          .exec-banner h1 { font-size: 22px; }
          .exec-banner-stat-value { font-size: 32px; }
          .exec-kpi-value { font-size: 32px; }
        }
      </style>

      <div class="exec-dash">

        <!-- Action Buttons -->
        <div class="exec-actions" style="margin-bottom: 20px;">
          <button class="btn btn-primary" onclick="ExecutiveDash.printReport()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
            Print Report
          </button>
          <button class="btn btn-secondary" onclick="Toast.show('Use your browser\\'s built-in screenshot tool (Win+Shift+S on Windows, Cmd+Shift+4 on Mac) to capture this report as an image.', 'info', 'Screenshot Tip', 8000)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            Copy as Image
          </button>
        </div>

        <!-- Top Banner -->
        <div class="exec-banner">
          <div>
            <h1>Executive Summary</h1>
            <div class="exec-banner-sub">${dateStr}</div>
          </div>
          <div class="exec-banner-stat">
            <div class="exec-banner-stat-value">${tenants.length}</div>
            <div class="exec-banner-stat-label">Tenants Managed</div>
          </div>
        </div>

        <!-- KPI Row -->
        <div class="exec-kpi-grid">
          <!-- Total Devices -->
          <div class="exec-kpi">
            <div class="exec-kpi-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="1.5"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
            </div>
            <div class="exec-kpi-value" style="color: var(--primary);">${totalDevices.toLocaleString()}</div>
            <div class="exec-kpi-label">Total Devices</div>
          </div>

          <!-- Compliance Rate with Gauge -->
          <div class="exec-kpi">
            <div class="exec-kpi-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="${complianceColor}" stroke-width="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </div>
            ${this._renderGauge(complianceRate, complianceColor)}
            <div class="exec-kpi-value" style="color: ${complianceColor};">${complianceRate}%</div>
            <div class="exec-kpi-label">Compliance Rate</div>
          </div>

          <!-- Total Users -->
          <div class="exec-kpi">
            <div class="exec-kpi-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--secondary)" stroke-width="1.5"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
            </div>
            <div class="exec-kpi-value" style="color: var(--secondary);">${totalUsers.toLocaleString()}</div>
            <div class="exec-kpi-label">Total Users</div>
          </div>

          <!-- Security Score -->
          <div class="exec-kpi">
            <div class="exec-kpi-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="${scoreColor}" stroke-width="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 12 15 16 10"/></svg>
            </div>
            ${this._renderGauge(securityScore, scoreColor)}
            <div class="exec-kpi-value" style="color: ${scoreColor};">${securityScore}</div>
            <div class="exec-kpi-label">Security Score</div>
          </div>
        </div>

        <!-- Tenant Health Grid -->
        <h2 class="exec-section-title">Tenant Health Overview</h2>
        ${tenants.length === 0 ? `
          <div class="exec-risk-card" style="text-align: center; color: var(--ink-tertiary); padding: 40px;">
            No tenants connected. Connect tenants to see health data.
          </div>
        ` : `
          <div class="exec-tenant-grid">
            ${tenants.map(t => this._renderTenantCard(t)).join('')}
          </div>
        `}

        <!-- Risk Summary -->
        <h2 class="exec-section-title">Top Risks</h2>
        <div class="exec-risk-card">
          ${risks.length === 0 ? `
            <div style="text-align: center; color: var(--ink-tertiary); padding: 16px;">
              No significant risks identified. All tenants are in good health.
            </div>
          ` : risks.map((r, i) => `
            <div class="exec-risk-item">
              <div class="exec-risk-rank" style="background: ${r.severity === 'high' ? 'var(--danger)' : r.severity === 'medium' ? 'var(--warning)' : 'var(--success)'};">
                ${i + 1}
              </div>
              <div>
                <div class="exec-risk-text">${r.text}</div>
                <div class="exec-risk-severity" style="color: ${r.severity === 'high' ? 'var(--danger)' : r.severity === 'medium' ? 'var(--warning)' : 'var(--success)'};">
                  ${r.severity} risk
                </div>
              </div>
            </div>
          `).join('')}
        </div>

        <!-- Recommendations -->
        <h2 class="exec-section-title">Recommendations</h2>
        <div class="exec-rec-card">
          ${recommendations.length === 0 ? `
            <div style="text-align: center; color: var(--ink-tertiary); padding: 16px;">
              No recommendations at this time. Environment looks healthy.
            </div>
          ` : recommendations.map(r => `
            <div class="exec-rec-item">
              <div class="exec-rec-priority ${r.priority}">${r.priority}</div>
              <div>
                <div class="exec-rec-text">${r.text}</div>
                <div class="exec-rec-impact">${r.impact}</div>
              </div>
            </div>
          `).join('')}
        </div>

        <!-- Footer -->
        <div class="exec-footer">
          <strong>Confidential</strong> &mdash; Prepared by MSP Device Manager
          <br>
          Generated on ${now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} at ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    `;
  },

  /* ---- Gauge SVG (half-circle arc) ---- */
  _renderGauge(value, color) {
    const pct = Math.max(0, Math.min(100, value));
    // Half circle: 180 degrees, radius 34, centered at 40,40
    const r = 34;
    const cx = 40, cy = 40;
    const startAngle = Math.PI;
    const endAngle = Math.PI + (Math.PI * pct / 100);
    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    const largeArc = pct > 50 ? 1 : 0;

    return `
      <div class="exec-gauge">
        <svg viewBox="0 0 80 44" xmlns="http://www.w3.org/2000/svg">
          <path d="M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}"
                fill="none" stroke="var(--gray-200)" stroke-width="6" stroke-linecap="round"/>
          ${pct > 0 ? `
            <path d="M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}"
                  fill="none" stroke="${color}" stroke-width="6" stroke-linecap="round"/>
          ` : ''}
        </svg>
      </div>
    `;
  },

  /* ---- Individual tenant health card ---- */
  _renderTenantCard(tenant) {
    const devices = (AppState.get('devices') || {})[tenant.id] || [];
    const users = (AppState.get('users') || {})[tenant.id] || [];
    const total = devices.length;
    const compliant = devices.filter(d => d.complianceState === 'compliant').length;
    const pct = total > 0 ? Math.round((compliant / total) * 100) : 0;
    const encrypted = devices.filter(d => d.isEncrypted === true).length;
    const encPct = total > 0 ? Math.round((encrypted / total) * 100) : 0;

    // Traffic light
    let lightColor, lightLabel;
    if (total === 0) {
      lightColor = 'var(--gray-300)'; lightLabel = 'No Data';
    } else if (pct >= 80) {
      lightColor = 'var(--success)'; lightLabel = 'Healthy';
    } else if (pct >= 50) {
      lightColor = 'var(--warning)'; lightLabel = 'Needs Attention';
    } else {
      lightColor = 'var(--danger)'; lightLabel = 'Critical';
    }

    const barColor = pct >= 80 ? 'var(--success)' : pct >= 50 ? 'var(--warning)' : 'var(--danger)';

    return `
      <div class="exec-tenant-card">
        <div class="exec-tenant-header">
          <div class="exec-tenant-name">${tenant.displayName || tenant.id}</div>
          <div style="display: flex; align-items: center; gap: 6px;">
            <span class="exec-traffic-light" style="background: ${lightColor};"></span>
            <span style="font-size: 11px; color: var(--ink-secondary); font-weight: 500;">${lightLabel}</span>
          </div>
        </div>
        <div class="exec-tenant-metrics">
          <div class="exec-tenant-metric">
            <div class="exec-tenant-metric-value">${total}</div>
            <div class="exec-tenant-metric-label">Devices</div>
          </div>
          <div class="exec-tenant-metric">
            <div class="exec-tenant-metric-value" style="color: ${barColor};">${pct}%</div>
            <div class="exec-tenant-metric-label">Compliant</div>
          </div>
          <div class="exec-tenant-metric">
            <div class="exec-tenant-metric-value">${users.length}</div>
            <div class="exec-tenant-metric-label">Users</div>
          </div>
          <div class="exec-tenant-metric">
            <div class="exec-tenant-metric-value">${encPct}%</div>
            <div class="exec-tenant-metric-label">Encrypted</div>
          </div>
        </div>
        <div class="exec-tenant-bar">
          <div class="exec-tenant-bar-fill" style="width: ${pct}%; background: ${barColor};"></div>
        </div>
      </div>
    `;
  },

  /* ---- Risk identification ---- */
  _getRiskItems() {
    const tenants = AppState.get('tenants') || [];
    const allDevices = AppState.get('devices') || {};
    const risks = [];

    tenants.forEach(t => {
      const devices = allDevices[t.id] || [];
      const total = devices.length;
      if (total === 0) return;

      const compliant = devices.filter(d => d.complianceState === 'compliant').length;
      const compPct = Math.round((compliant / total) * 100);
      const nonCompliant = total - compliant;

      // Non-compliance risk
      if (compPct < 70) {
        risks.push({
          text: `${t.displayName}: ${100 - compPct}% of devices (${nonCompliant}) are non-compliant`,
          severity: compPct < 50 ? 'high' : 'medium',
          score: 100 - compPct
        });
      }

      // Encryption risk
      const encrypted = devices.filter(d => d.isEncrypted === true).length;
      const unencrypted = total - encrypted;
      const encPct = Math.round((encrypted / total) * 100);
      if (encPct < 80 && unencrypted > 0) {
        risks.push({
          text: `${t.displayName}: ${unencrypted} device${unencrypted !== 1 ? 's' : ''} (${100 - encPct}%) without encryption`,
          severity: encPct < 50 ? 'high' : 'medium',
          score: 100 - encPct
        });
      }

      // Stale devices risk (not synced in 30+ days)
      const staleThreshold = 30 * 24 * 60 * 60 * 1000;
      const stale = devices.filter(d => {
        if (!d.lastSyncDateTime) return true;
        return (Date.now() - new Date(d.lastSyncDateTime).getTime()) > staleThreshold;
      }).length;
      if (stale > 0) {
        risks.push({
          text: `${t.displayName}: ${stale} device${stale !== 1 ? 's' : ''} not synced in 30+ days`,
          severity: stale > 10 ? 'high' : stale > 3 ? 'medium' : 'low',
          score: stale
        });
      }
    });

    // Sort by severity then score, return top 3
    const severityOrder = { high: 0, medium: 1, low: 2 };
    risks.sort((a, b) => {
      if (severityOrder[a.severity] !== severityOrder[b.severity]) {
        return severityOrder[a.severity] - severityOrder[b.severity];
      }
      return b.score - a.score;
    });

    return risks.slice(0, 3);
  },

  /* ---- Recommendation generation ---- */
  _generateRecommendations() {
    const tenants = AppState.get('tenants') || [];
    const allDevices = AppState.get('devices') || {};
    const allPolicies = AppState.get('compliancePolicies') || {};
    const recommendations = [];

    let totalNonCompliant = 0;
    let totalUnencrypted = 0;
    let totalStale = 0;
    let tenantsWithNonCompliant = 0;
    let tenantsWithUnencrypted = 0;
    let tenantsWithStale = 0;
    let tenantsNoPolicies = 0;
    let totalDevices = 0;

    const staleThreshold = 30 * 24 * 60 * 60 * 1000;

    tenants.forEach(t => {
      const devices = allDevices[t.id] || [];
      const policies = allPolicies[t.id] || [];
      totalDevices += devices.length;

      const nc = devices.filter(d => d.complianceState !== 'compliant').length;
      if (nc > 0) { totalNonCompliant += nc; tenantsWithNonCompliant++; }

      const ue = devices.filter(d => d.isEncrypted !== true).length;
      if (ue > 0 && devices.length > 0) { totalUnencrypted += ue; tenantsWithUnencrypted++; }

      const stale = devices.filter(d => {
        if (!d.lastSyncDateTime) return true;
        return (Date.now() - new Date(d.lastSyncDateTime).getTime()) > staleThreshold;
      }).length;
      if (stale > 0) { totalStale += stale; tenantsWithStale++; }

      if (policies.length === 0 && devices.length > 0) { tenantsNoPolicies++; }
    });

    // Generate recommendations based on data
    if (totalUnencrypted > 0) {
      recommendations.push({
        priority: 'high',
        text: `Enable encryption on ${totalUnencrypted} device${totalUnencrypted !== 1 ? 's' : ''} across ${tenantsWithUnencrypted} tenant${tenantsWithUnencrypted !== 1 ? 's' : ''}`,
        impact: `Protects data at rest and reduces breach exposure for ${Math.round(totalUnencrypted / Math.max(totalDevices, 1) * 100)}% of the fleet`
      });
    }

    if (totalStale > 0) {
      recommendations.push({
        priority: 'high',
        text: `Review ${totalStale} stale device${totalStale !== 1 ? 's' : ''} not synced in 30+ days across ${tenantsWithStale} tenant${tenantsWithStale !== 1 ? 's' : ''}`,
        impact: 'Stale devices may be lost, decommissioned, or running outdated policies'
      });
    }

    if (totalNonCompliant > 0) {
      recommendations.push({
        priority: totalNonCompliant > 20 ? 'high' : 'medium',
        text: `Remediate ${totalNonCompliant} non-compliant device${totalNonCompliant !== 1 ? 's' : ''} across ${tenantsWithNonCompliant} tenant${tenantsWithNonCompliant !== 1 ? 's' : ''}`,
        impact: 'Non-compliant devices may lack security baselines, putting tenant environments at risk'
      });
    }

    if (tenantsNoPolicies > 0) {
      recommendations.push({
        priority: 'medium',
        text: `Deploy compliance policies to ${tenantsNoPolicies} tenant${tenantsNoPolicies !== 1 ? 's' : ''} that currently have none configured`,
        impact: 'Without compliance policies, device health cannot be assessed or enforced'
      });
    }

    if (tenants.length > 0 && totalDevices === 0) {
      recommendations.push({
        priority: 'low',
        text: 'Sync device data for connected tenants to populate this report',
        impact: 'Executive metrics require device data to generate meaningful insights'
      });
    }

    if (recommendations.length === 0 && totalDevices > 0) {
      recommendations.push({
        priority: 'low',
        text: 'Continue monitoring environment health and maintain current security posture',
        impact: 'All key metrics are within acceptable thresholds'
      });
    }

    return recommendations.slice(0, 5);
  },

  /* ---- Weighted security score across all tenants ---- */
  _getOverallScore() {
    const tenants = AppState.get('tenants') || [];
    const allDevices = AppState.get('devices') || {};
    let totalWeightedScore = 0;
    let totalWeight = 0;

    tenants.forEach(t => {
      const devices = allDevices[t.id] || [];
      const total = devices.length;
      if (total === 0) return;

      // Compliance component (40% weight)
      const compliant = devices.filter(d => d.complianceState === 'compliant').length;
      const complianceScore = (compliant / total) * 100;

      // Encryption component (30% weight)
      const encrypted = devices.filter(d => d.isEncrypted === true).length;
      const encryptionScore = (encrypted / total) * 100;

      // Freshness component (30% weight) — devices synced within 7 days
      const freshThreshold = 7 * 24 * 60 * 60 * 1000;
      const fresh = devices.filter(d => {
        if (!d.lastSyncDateTime) return false;
        return (Date.now() - new Date(d.lastSyncDateTime).getTime()) < freshThreshold;
      }).length;
      const freshnessScore = (fresh / total) * 100;

      const tenantScore = (complianceScore * 0.4) + (encryptionScore * 0.3) + (freshnessScore * 0.3);
      totalWeightedScore += tenantScore * total;
      totalWeight += total;
    });

    return totalWeight > 0 ? Math.round(totalWeightedScore / totalWeight) : 0;
  },

  /* ---- Helper: overall compliance rate ---- */
  _getOverallComplianceRate() {
    const allDevices = AppState.get('devices') || {};
    let total = 0, compliant = 0;
    Object.values(allDevices).forEach(arr => {
      (arr || []).forEach(d => {
        total++;
        if (d.complianceState === 'compliant') compliant++;
      });
    });
    return total > 0 ? Math.round((compliant / total) * 100) : 0;
  },

  /* ---- Helper: total device count ---- */
  _countAllDevices() {
    const allDevices = AppState.get('devices') || {};
    return Object.values(allDevices).reduce((sum, arr) => sum + (arr?.length || 0), 0);
  },

  /* ---- Helper: total user count ---- */
  _countAllUsers() {
    const allUsers = AppState.get('users') || {};
    return Object.values(allUsers).reduce((sum, arr) => sum + (arr?.length || 0), 0);
  },

  /* ---- Print action ---- */
  printReport() {
    window.print();
  }
};
