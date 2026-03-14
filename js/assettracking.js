/* ============================================================
   AssetTracking — Warranty & asset lifecycle management
   ============================================================ */

const AssetTracking = {
  _storageKey: 'msp_asset_metadata',
  _search: '',

  render() {
    const main = document.getElementById('mainContent');
    const allDevices = AppState.getDevicesForContext();
    const metadata = this._getMetadata();

    // Enrich devices with asset metadata
    const enriched = allDevices.map(d => ({
      ...d,
      asset: metadata[d.id] || {}
    }));

    const filtered = this._search
      ? enriched.filter(d =>
          (d.deviceName || '').toLowerCase().includes(this._search) ||
          (d.serialNumber || '').toLowerCase().includes(this._search) ||
          (d.asset.assetTag || '').toLowerCase().includes(this._search))
      : enriched;

    // Stats
    const withWarranty = enriched.filter(d => d.asset.warrantyEnd).length;
    const expiringSoon = enriched.filter(d => {
      if (!d.asset.warrantyEnd) return false;
      const days = (new Date(d.asset.warrantyEnd) - Date.now()) / 86400000;
      return days > 0 && days <= 90;
    }).length;
    const expired = enriched.filter(d => {
      if (!d.asset.warrantyEnd) return false;
      return new Date(d.asset.warrantyEnd) < new Date();
    }).length;

    main.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h1 class="page-title">Asset & Warranty Tracking</h1>
          <p class="page-subtitle">Track warranty status, purchase dates, and asset tags for ${allDevices.length} devices</p>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-secondary btn-sm" onclick="AssetTracking._importCSV()">Import CSV</button>
          <button class="btn btn-secondary btn-sm" onclick="AssetTracking._exportCSV()">Export CSV</button>
        </div>
      </div>

      <!-- Summary -->
      <div class="grid grid-4 gap-4 mb-6">
        <div class="card"><div class="card-body" style="text-align:center;padding:16px;">
          <div style="font-size:28px;font-weight:700;color:var(--primary);">${allDevices.length}</div>
          <div class="text-sm fw-500">Total Devices</div>
        </div></div>
        <div class="card"><div class="card-body" style="text-align:center;padding:16px;">
          <div style="font-size:28px;font-weight:700;color:var(--success);">${withWarranty}</div>
          <div class="text-sm fw-500">Warranty Tracked</div>
        </div></div>
        <div class="card"><div class="card-body" style="text-align:center;padding:16px;">
          <div style="font-size:28px;font-weight:700;color:var(--warning);">${expiringSoon}</div>
          <div class="text-sm fw-500">Expiring in 90d</div>
        </div></div>
        <div class="card"><div class="card-body" style="text-align:center;padding:16px;">
          <div style="font-size:28px;font-weight:700;color:var(--danger);">${expired}</div>
          <div class="text-sm fw-500">Warranty Expired</div>
        </div></div>
      </div>

      <!-- Search -->
      <div class="flex gap-3 mb-4">
        <input type="text" class="form-input" placeholder="Search by device, serial, or asset tag..."
          value="${this._search}" oninput="AssetTracking._search=this.value.toLowerCase(); AssetTracking.render();" style="max-width:400px;">
      </div>

      <!-- Device Asset Table -->
      <div class="card">
        <div class="card-header"><div class="card-header-title">Device Assets (${filtered.length})</div></div>
        <div class="card-body" style="padding:0;">
          <div class="table-wrapper">
            <table class="table">
              <thead><tr>
                <th>Device</th><th>Serial</th><th>Asset Tag</th><th>Purchase Date</th>
                <th>Warranty End</th><th>Status</th><th>Notes</th><th></th>
              </tr></thead>
              <tbody>
                ${filtered.slice(0, 100).map(d => {
                  const a = d.asset;
                  let wStatus = '-';
                  let wBadge = 'default';
                  if (a.warrantyEnd) {
                    const daysLeft = Math.ceil((new Date(a.warrantyEnd) - Date.now()) / 86400000);
                    if (daysLeft < 0) { wStatus = 'Expired'; wBadge = 'danger'; }
                    else if (daysLeft <= 90) { wStatus = `${daysLeft}d left`; wBadge = 'warning'; }
                    else { wStatus = `${daysLeft}d left`; wBadge = 'success'; }
                  }
                  return `
                    <tr>
                      <td class="fw-500">${d.deviceName || '-'}</td>
                      <td class="text-sm text-mono">${d.serialNumber || '-'}</td>
                      <td class="text-sm">${a.assetTag || '<span class="text-muted">-</span>'}</td>
                      <td class="text-sm">${a.purchaseDate || '-'}</td>
                      <td class="text-sm">${a.warrantyEnd || '-'}</td>
                      <td><span class="badge badge-${wBadge}">${wStatus}</span></td>
                      <td class="text-sm truncate" style="max-width:150px;" title="${a.notes || ''}">${a.notes || '-'}</td>
                      <td>
                        <button class="btn btn-ghost btn-sm" onclick="AssetTracking._editAsset('${d.id}','${(d.deviceName||'').replace(/'/g,'')}')">Edit</button>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  },

  _editAsset(deviceId, deviceName) {
    const metadata = this._getMetadata();
    const a = metadata[deviceId] || {};

    document.getElementById('assetEditModal')?.remove();
    const modal = document.createElement('div');
    modal.id = 'assetEditModal';
    modal.className = 'modal-overlay';
    modal.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.4);';
    modal.innerHTML = `
      <div class="modal" style="max-width:480px;width:95%;">
        <div class="modal-header">
          <h3 class="modal-title">Edit Asset: ${deviceName}</h3>
          <button class="modal-close" onclick="document.getElementById('assetEditModal').remove()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="modal-body">
          <div class="form-group mb-3">
            <label class="form-label">Asset Tag</label>
            <input type="text" class="form-input" id="atAssetTag" value="${a.assetTag || ''}" placeholder="e.g. ASSET-0042">
          </div>
          <div class="grid grid-2 gap-3 mb-3">
            <div class="form-group">
              <label class="form-label">Purchase Date</label>
              <input type="date" class="form-input" id="atPurchaseDate" value="${a.purchaseDate || ''}">
            </div>
            <div class="form-group">
              <label class="form-label">Warranty End</label>
              <input type="date" class="form-input" id="atWarrantyEnd" value="${a.warrantyEnd || ''}">
            </div>
          </div>
          <div class="form-group mb-3">
            <label class="form-label">Cost</label>
            <input type="text" class="form-input" id="atCost" value="${a.cost || ''}" placeholder="e.g. $1,200">
          </div>
          <div class="form-group">
            <label class="form-label">Notes</label>
            <textarea class="form-textarea" id="atNotes" rows="3" placeholder="Any notes about this asset...">${a.notes || ''}</textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="document.getElementById('assetEditModal').remove()">Cancel</button>
          <button class="btn btn-primary" onclick="AssetTracking._saveAsset('${deviceId}')">Save</button>
        </div>
      </div>
    `;
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
    document.body.appendChild(modal);
  },

  _saveAsset(deviceId) {
    const metadata = this._getMetadata();
    metadata[deviceId] = {
      assetTag: document.getElementById('atAssetTag')?.value || '',
      purchaseDate: document.getElementById('atPurchaseDate')?.value || '',
      warrantyEnd: document.getElementById('atWarrantyEnd')?.value || '',
      cost: document.getElementById('atCost')?.value || '',
      notes: document.getElementById('atNotes')?.value || '',
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem(this._storageKey, JSON.stringify(metadata));
    document.getElementById('assetEditModal')?.remove();
    Toast.show('Asset metadata saved', 'success');
    this.render();
  },

  _getMetadata() {
    try { return JSON.parse(localStorage.getItem(this._storageKey) || '{}'); } catch { return {}; }
  },

  _exportCSV() {
    const allDevices = AppState.getDevicesForContext();
    const metadata = this._getMetadata();
    const rows = allDevices.map(d => {
      const a = metadata[d.id] || {};
      return {
        DeviceName: d.deviceName || '',
        SerialNumber: d.serialNumber || '',
        Manufacturer: d.manufacturer || '',
        Model: d.model || '',
        OS: d.operatingSystem || '',
        Tenant: AppState.getTenantName(d._tenantId),
        AssetTag: a.assetTag || '',
        PurchaseDate: a.purchaseDate || '',
        WarrantyEnd: a.warrantyEnd || '',
        Cost: a.cost || '',
        Notes: a.notes || '',
        DeviceId: d.id
      };
    });
    if (rows.length === 0) { Toast.show('No data', 'warning'); return; }
    const headers = Object.keys(rows[0]);
    let csv = headers.join(',') + '\n';
    rows.forEach(r => { csv += headers.map(h => `"${String(r[h] ?? '').replace(/"/g, '""')}"`).join(',') + '\n'; });
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `asset_inventory_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    Toast.show('Asset inventory exported', 'success');
  },

  _importCSV() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const lines = ev.target.result.split('\n').filter(l => l.trim());
        if (lines.length < 2) { Toast.show('CSV must have a header row and at least one data row', 'warning'); return; }
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        const deviceIdIdx = headers.findIndex(h => h.toLowerCase() === 'deviceid');
        const assetTagIdx = headers.findIndex(h => h.toLowerCase() === 'assettag');
        const purchIdx = headers.findIndex(h => h.toLowerCase() === 'purchasedate');
        const warrantyIdx = headers.findIndex(h => h.toLowerCase() === 'warrantyend');
        const costIdx = headers.findIndex(h => h.toLowerCase() === 'cost');
        const notesIdx = headers.findIndex(h => h.toLowerCase() === 'notes');

        if (deviceIdIdx < 0) { Toast.show('CSV must have a DeviceId column', 'error'); return; }

        const metadata = this._getMetadata();
        let imported = 0;
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
          const deviceId = cols[deviceIdIdx];
          if (!deviceId) continue;
          metadata[deviceId] = {
            assetTag: assetTagIdx >= 0 ? cols[assetTagIdx] : '',
            purchaseDate: purchIdx >= 0 ? cols[purchIdx] : '',
            warrantyEnd: warrantyIdx >= 0 ? cols[warrantyIdx] : '',
            cost: costIdx >= 0 ? cols[costIdx] : '',
            notes: notesIdx >= 0 ? cols[notesIdx] : '',
            updatedAt: new Date().toISOString()
          };
          imported++;
        }
        localStorage.setItem(this._storageKey, JSON.stringify(metadata));
        Toast.show(`Imported asset data for ${imported} device(s)`, 'success');
        this.render();
      };
      reader.readAsText(file);
    };
    input.click();
  }
};
