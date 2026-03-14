/* ============================================================
   HealthChecks — Automated tenant security/config audit
   ============================================================ */

const HealthChecks = {

  render() {
    const main = document.getElementById('mainContent');
    const tenants = AppState.get('tenants');
    const isAll = AppState.get('activeTenant') === 'all';
    const tenantsToCheck = isAll ? tenants : tenants.filter(t => t.id === AppState.get('activeTenant'));

    if (tenantsToCheck.length === 0) {
      main.innerHTML = `
        <div class="page-header"><div class="page-header-left">
          <h1 class="page-title">Tenant Health Checks</h1>
          <p class="page-subtitle">Connect tenants to run health checks</p>
        </div></div>
        <div class="empty-state"><p class="text-muted">No tenants connected.</p></div>`;
      return;
    }

    const results = tenantsToCheck.map(t => this._runChecks(t));
    const totalIssues = results.reduce((s, r) => s + r.issues.length, 0);
    const totalPassed = results.reduce((s, r) => s + r.passed.length, 0);

    main.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h1 class="page-title">Tenant Health Checks</h1>
          <p class="page-subtitle">Automated security and configuration audit across ${tenantsToCheck.length} tenant(s)</p>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-primary btn-sm" onclick="HealthChecks.render()">Re-Run Checks</button>
        </div>
      </div>

      <!-- Overall Summary -->
      <div class="grid grid-3 gap-4 mb-6">
        <div class="card"><div class="card-body" style="text-align:center;padding:20px;">
          <div style="font-size:32px;font-weight:700;color:var(--success);">${totalPassed}</div>
          <div class="text-sm fw-500">Checks Passed</div>
        </div></div>
        <div class="card"><div class="card-body" style="text-align:center;padding:20px;">
          <div style="font-size:32px;font-weight:700;color:var(--danger);">${totalIssues}</div>
          <div class="text-sm fw-500">Issues Found</div>
        </div></div>
        <div class="card"><div class="card-body" style="text-align:center;padding:20px;">
          ${typeof Charts !== 'undefined' ? Charts.gauge(
            totalPassed + totalIssues > 0 ? Math.round((totalPassed / (totalPassed + totalIssues)) * 100) : 100,
            { size: 100, label: 'Health Score' }
          ) : `
            <div style="font-size:32px;font-weight:700;color:var(--primary);">
              ${totalPassed + totalIssues > 0 ? Math.round((totalPassed / (totalPassed + totalIssues)) * 100) : 100}%
            </div>
            <div class="text-sm fw-500">Health Score</div>
          `}
        </div></div>
      </div>

      <!-- Per-Tenant Results -->
      ${results.map(r => `
        <div class="card mb-4">
          <div class="card-header">
            <div>
              <div class="card-header-title">${r.tenantName}</div>
              <div class="card-header-subtitle">${r.passed.length} passed, ${r.issues.length} issues</div>
            </div>
            <span class="badge badge-${r.issues.length === 0 ? 'success' : r.issues.length <= 3 ? 'warning' : 'danger'}">
              ${r.issues.length === 0 ? 'Healthy' : `${r.issues.length} Issue(s)`}
            </span>
          </div>
          <div class="card-body" style="padding:0;">
            ${r.issues.length > 0 ? `
              <div style="padding:12px 20px;background:var(--danger-bg);border-bottom:1px solid var(--border-light);">
                <div class="text-xs fw-600 text-danger mb-2">ISSUES</div>
                ${r.issues.map(i => `
                  <div style="display:flex;gap:8px;align-items:start;padding:6px 0;">
                    <span style="color:var(--danger);flex-shrink:0;">&#10060;</span>
                    <div>
                      <div class="text-sm fw-500">${i.title}</div>
                      <div class="text-xs text-muted">${i.detail}</div>
                      ${i.remediation ? `<div class="text-xs" style="color:var(--primary);margin-top:2px;">Remediation: ${i.remediation}</div>` : ''}
                    </div>
                    <span class="badge badge-${i.severity === 'critical' ? 'danger' : i.severity === 'warning' ? 'warning' : 'info'}" style="margin-left:auto;flex-shrink:0;">${i.severity}</span>
                  </div>
                `).join('')}
              </div>
            ` : ''}
            <div style="padding:12px 20px;">
              <div class="text-xs fw-600 text-success mb-2">PASSED</div>
              ${r.passed.map(p => `
                <div style="display:flex;gap:8px;align-items:center;padding:4px 0;">
                  <span style="color:var(--success);">&#10004;</span>
                  <span class="text-sm">${p}</span>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      `).join('')}
    `;
  },

  _runChecks(tenant) {
    const tid = tenant.id;
    const devices = AppState.get('devices')[tid] || [];
    const users = AppState.get('users')[tid] || [];
    const caPolicies = AppState.get('caPolicies')[tid] || [];
    const compPolicies = AppState.get('compliancePolicies')[tid] || [];
    const configProfiles = AppState.get('configProfiles')[tid] || [];
    const skus = (AppState.get('subscribedSkus') || {})[tid] || [];

    const issues = [];
    const passed = [];

    // 1. No Conditional Access policies
    if (caPolicies.length === 0) {
      issues.push({ title: 'No Conditional Access Policies', detail: 'No CA policies configured. This leaves the tenant without access controls.', severity: 'critical', remediation: 'Create at least one CA policy requiring MFA for all users.' });
    } else {
      const enabled = caPolicies.filter(p => p.state === 'enabled').length;
      if (enabled === 0) {
        issues.push({ title: 'All CA Policies Disabled', detail: `${caPolicies.length} CA policies exist but none are enabled.`, severity: 'critical', remediation: 'Enable at least one CA policy.' });
      } else {
        passed.push(`${enabled} Conditional Access policy(ies) enabled`);
      }
      // MFA check
      const mfaPolicy = caPolicies.find(p => p.state === 'enabled' && (p.grantControls?.builtInControls || []).includes('mfa'));
      if (!mfaPolicy) {
        issues.push({ title: 'No MFA Enforcement', detail: 'No active CA policy requiring MFA.', severity: 'critical', remediation: 'Add MFA requirement to a CA policy.' });
      } else {
        passed.push('MFA enforced via Conditional Access');
      }
    }

    // 2. No compliance policies
    if (compPolicies.length === 0) {
      issues.push({ title: 'No Compliance Policies', detail: 'Devices have no compliance policies assigned.', severity: 'warning', remediation: 'Create compliance policies for each OS platform.' });
    } else {
      passed.push(`${compPolicies.length} compliance policy(ies) configured`);
    }

    // 3. No configuration profiles
    if (configProfiles.length === 0) {
      issues.push({ title: 'No Configuration Profiles', detail: 'No device configuration profiles deployed.', severity: 'warning', remediation: 'Deploy configuration profiles for security settings.' });
    } else {
      passed.push(`${configProfiles.length} configuration profile(s) deployed`);
    }

    // 4. Non-compliant devices
    const ncDevices = devices.filter(d => d.complianceState === 'noncompliant').length;
    if (ncDevices > 0) {
      const pct = Math.round((ncDevices / devices.length) * 100);
      issues.push({ title: `${ncDevices} Non-Compliant Device(s) (${pct}%)`, detail: 'Devices are failing compliance policy checks.', severity: pct > 25 ? 'critical' : 'warning', remediation: 'Review device compliance status and remediate.' });
    } else if (devices.length > 0) {
      passed.push('All devices compliant');
    }

    // 5. Unencrypted devices
    const unenc = devices.filter(d => !d.isEncrypted).length;
    if (unenc > 0 && devices.length > 0) {
      issues.push({ title: `${unenc} Unencrypted Device(s)`, detail: `${Math.round((unenc / devices.length) * 100)}% of devices lack disk encryption.`, severity: unenc > devices.length / 2 ? 'critical' : 'warning', remediation: 'Deploy BitLocker/FileVault encryption profiles.' });
    } else if (devices.length > 0) {
      passed.push('All devices encrypted');
    }

    // 6. Stale devices (>14 days)
    const stale = devices.filter(d => {
      if (!d.lastSyncDateTime) return true;
      return (Date.now() - new Date(d.lastSyncDateTime).getTime()) > 14 * 86400000;
    }).length;
    if (stale > 0) {
      issues.push({ title: `${stale} Stale Device(s)`, detail: 'Devices not synced in 14+ days may be lost or decommissioned.', severity: 'warning', remediation: 'Investigate and retire or force sync stale devices.' });
    } else if (devices.length > 0) {
      passed.push('All devices synced within 14 days');
    }

    // 7. Disabled accounts with licenses
    const disabledWithLicenses = users.filter(u => !u.accountEnabled && u.assignedLicenses?.length > 0).length;
    if (disabledWithLicenses > 0) {
      issues.push({ title: `${disabledWithLicenses} Disabled Account(s) with Licenses`, detail: 'Licenses assigned to disabled accounts are wasted.', severity: 'warning', remediation: 'Remove licenses from disabled accounts to save costs.' });
    } else {
      passed.push('No wasted licenses on disabled accounts');
    }

    // 8. License over-allocation
    const overAlloc = skus.filter(s => {
      const purchased = s.prepaidUnits?.enabled || 0;
      return purchased > 0 && (s.consumedUnits || 0) > purchased;
    });
    if (overAlloc.length > 0) {
      issues.push({ title: `${overAlloc.length} Over-Allocated License SKU(s)`, detail: 'More licenses consumed than purchased.', severity: 'critical', remediation: 'Purchase additional licenses or remove assignments.' });
    } else if (skus.length > 0) {
      passed.push('All license SKUs within allocation');
    }

    // 9. Large number of guest accounts
    const guests = users.filter(u => (u.userPrincipalName || '').includes('#EXT#')).length;
    if (guests > users.length * 0.3 && guests > 5) {
      issues.push({ title: `High Guest Account Count (${guests})`, detail: `${Math.round((guests / users.length) * 100)}% of accounts are guests.`, severity: 'info', remediation: 'Review and clean up external guest accounts.' });
    } else {
      passed.push('Guest account ratio is healthy');
    }

    return { tenantName: tenant.displayName, tenantId: tid, issues, passed };
  }
};
