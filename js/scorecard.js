/* ============================================================
   Scorecard — Tenant Security & Compliance Scorecard
   ============================================================ */

const Scorecard = {
  _storageKey: 'msp_scorecard_history',

  render() {
    const main = document.getElementById('mainContent');
    const tenants = AppState.get('tenants');

    if (tenants.length === 0) {
      main.innerHTML = `
        <div class="page-header"><div class="page-header-left">
          <h1 class="page-title">Tenant Security Scorecard</h1>
          <p class="page-subtitle">Connect tenants to generate security scores</p>
        </div></div>
        <div class="empty-state"><p class="text-muted">No tenants connected.</p></div>`;
      return;
    }

    const scores = tenants.map(t => this._computeScore(t.id));
    const avgScore = Math.round(scores.reduce((s, sc) => s + sc.total, 0) / scores.length);

    main.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h1 class="page-title">Tenant Security Scorecard</h1>
          <p class="page-subtitle">Aggregate security and compliance posture across ${tenants.length} tenant(s)</p>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-secondary btn-sm" onclick="Scorecard._saveSnapshot()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/></svg>
            Save Snapshot
          </button>
        </div>
      </div>

      <!-- Overall Score -->
      <div class="card mb-6">
        <div class="card-body" style="text-align:center;padding:32px;">
          <div style="display:inline-flex;align-items:center;justify-content:center;width:120px;height:120px;border-radius:50%;border:6px solid var(--${this._gradeColor(avgScore)});margin-bottom:12px;">
            <div>
              <div style="font-size:36px;font-weight:700;color:var(--${this._gradeColor(avgScore)});">${this._gradeLabel(avgScore)}</div>
              <div class="text-xs text-muted">${avgScore}/100</div>
            </div>
          </div>
          <div class="fw-600" style="font-size:var(--text-lg);">Overall Security Score</div>
          <div class="text-sm text-muted">Average across all connected tenants</div>
        </div>
      </div>

      <!-- Per-Tenant Scores -->
      <div class="grid grid-${Math.min(tenants.length, 3)} gap-4 mb-6">
        ${tenants.map((t, i) => {
          const sc = scores[i];
          return `
            <div class="card">
              <div class="card-body" style="text-align:center;padding:20px;">
                <div style="display:inline-flex;align-items:center;justify-content:center;width:64px;height:64px;border-radius:50%;border:4px solid var(--${this._gradeColor(sc.total)});margin-bottom:8px;">
                  <span style="font-size:20px;font-weight:700;color:var(--${this._gradeColor(sc.total)});">${this._gradeLabel(sc.total)}</span>
                </div>
                <div class="fw-600 text-sm">${t.displayName}</div>
                <div class="text-xs text-muted mb-3">${sc.total}/100</div>
                ${sc.categories.map(c => `
                  <div style="display:flex;align-items:center;gap:8px;margin:4px 0;">
                    <span class="text-xs" style="width:100px;text-align:left;">${c.name}</span>
                    <div style="flex:1;height:4px;background:var(--gray-100);border-radius:2px;overflow:hidden;">
                      <div style="height:100%;width:${c.score}%;background:var(--${this._gradeColor(c.score)});border-radius:2px;"></div>
                    </div>
                    <span class="text-xs fw-500" style="width:28px;text-align:right;">${c.score}</span>
                  </div>
                `).join('')}
              </div>
            </div>
          `;
        }).join('')}
      </div>

      <!-- Detailed Breakdown -->
      <div class="card mb-6">
        <div class="card-header"><div class="card-header-title">Score Breakdown</div></div>
        <div class="card-body" style="padding:0;">
          <div class="table-wrapper">
            <table class="table">
              <thead><tr>
                <th>Tenant</th>
                <th>Compliance</th>
                <th>Encryption</th>
                <th>Sync Health</th>
                <th>CA Policies</th>
                <th>User Security</th>
                <th>Overall</th>
                <th>Grade</th>
              </tr></thead>
              <tbody>
                ${tenants.map((t, i) => {
                  const sc = scores[i];
                  const cats = sc.categories;
                  return `
                    <tr>
                      <td class="fw-500">${t.displayName}</td>
                      ${cats.map(c => `<td><span class="${c.score >= 80 ? 'text-success' : c.score >= 60 ? 'text-warning' : 'text-danger'} fw-500">${c.score}</span></td>`).join('')}
                      <td class="fw-600">${sc.total}</td>
                      <td><span class="badge badge-${this._gradeColor(sc.total)}">${this._gradeLabel(sc.total)}</span></td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Trend History -->
      <div class="card">
        <div class="card-header"><div class="card-header-title">Score History</div></div>
        <div class="card-body">
          ${this._renderHistory()}
        </div>
      </div>
    `;
  },

  _computeScore(tenantId) {
    const devices = AppState.get('devices')[tenantId] || [];
    const caPolicies = AppState.get('caPolicies')[tenantId] || [];
    const users = AppState.get('users')[tenantId] || [];

    const categories = [];

    // 1. Compliance (0-100)
    if (devices.length > 0) {
      const compliant = devices.filter(d => d.complianceState === 'compliant').length;
      categories.push({ name: 'Compliance', score: Math.round((compliant / devices.length) * 100) });
    } else {
      categories.push({ name: 'Compliance', score: 50 });
    }

    // 2. Encryption (0-100)
    if (devices.length > 0) {
      const encrypted = devices.filter(d => d.isEncrypted).length;
      categories.push({ name: 'Encryption', score: Math.round((encrypted / devices.length) * 100) });
    } else {
      categories.push({ name: 'Encryption', score: 50 });
    }

    // 3. Sync Health (0-100)
    if (devices.length > 0) {
      const now = Date.now();
      const synced = devices.filter(d => {
        if (!d.lastSyncDateTime) return false;
        return (now - new Date(d.lastSyncDateTime).getTime()) < 7 * 86400000;
      }).length;
      categories.push({ name: 'Sync Health', score: Math.round((synced / devices.length) * 100) });
    } else {
      categories.push({ name: 'Sync Health', score: 50 });
    }

    // 4. Conditional Access (0-100)
    const enabledCA = caPolicies.filter(p => p.state === 'enabled' || p.state === 'enabledForReportingButNotEnforced').length;
    const caScore = Math.min(100, enabledCA * 20); // 5 policies = 100
    categories.push({ name: 'CA Policies', score: caScore });

    // 5. User Security (0-100)
    if (users.length > 0) {
      const enabled = users.filter(u => u.accountEnabled).length;
      const licensed = users.filter(u => u.assignedLicenses?.length > 0).length;
      const disabledRatio = (users.length - enabled) / users.length;
      // Penalize if many disabled accounts exist (should be cleaned up)
      const cleanupScore = disabledRatio > 0.3 ? 60 : disabledRatio > 0.1 ? 80 : 100;
      const licensedScore = users.length > 0 ? Math.round((licensed / enabled) * 100) : 50;
      categories.push({ name: 'User Security', score: Math.round((cleanupScore + Math.min(licensedScore, 100)) / 2) });
    } else {
      categories.push({ name: 'User Security', score: 50 });
    }

    const total = Math.round(categories.reduce((s, c) => s + c.score, 0) / categories.length);
    return { total, categories };
  },

  _gradeLabel(score) {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  },

  _gradeColor(score) {
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    return 'danger';
  },

  _saveSnapshot() {
    const history = this._getHistory();
    const tenants = AppState.get('tenants');
    const snapshot = {
      date: new Date().toISOString().slice(0, 10),
      scores: tenants.map(t => ({
        tenantId: t.id,
        tenantName: t.displayName,
        ...this._computeScore(t.id)
      }))
    };
    history.push(snapshot);
    if (history.length > 52) history.shift(); // Keep ~1 year of weekly snapshots
    localStorage.setItem(this._storageKey, JSON.stringify(history));
    Toast.show('Scorecard snapshot saved', 'success');
    this.render();
  },

  _getHistory() {
    try { return JSON.parse(localStorage.getItem(this._storageKey) || '[]'); } catch { return []; }
  },

  _renderHistory() {
    const history = this._getHistory();
    if (history.length === 0) {
      return '<div class="text-sm text-muted">No snapshots saved yet. Click "Save Snapshot" to track trends over time.</div>';
    }
    return `
      <div class="table-wrapper">
        <table class="table">
          <thead><tr><th>Date</th><th>Tenants</th><th>Avg Score</th><th>Grade</th></tr></thead>
          <tbody>
            ${history.slice().reverse().slice(0, 20).map(h => {
              const avg = Math.round(h.scores.reduce((s, sc) => s + sc.total, 0) / h.scores.length);
              return `
                <tr>
                  <td class="text-sm">${h.date}</td>
                  <td class="text-sm">${h.scores.length} tenant(s)</td>
                  <td class="fw-500">${avg}/100</td>
                  <td><span class="badge badge-${this._gradeColor(avg)}">${this._gradeLabel(avg)}</span></td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  }
};
