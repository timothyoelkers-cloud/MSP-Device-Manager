/* ============================================================
   DeviceTags — Bulk device tagging and categorization
   ============================================================ */

const DeviceTags = {
  _storageKey: 'msp_device_tags',
  _filterTag: 'all',
  _search: '',

  // Preset tag categories with colors
  _presets: [
    { name: 'VIP', color: '#8b5cf6' },
    { name: 'Shared', color: '#0891b2' },
    { name: 'Kiosk', color: '#d97706' },
    { name: 'Remote', color: '#059669' },
    { name: 'Executive', color: '#dc2626' },
    { name: 'Lab', color: '#6366f1' },
    { name: 'Conference Room', color: '#0d9488' },
    { name: 'Loaner', color: '#ea580c' },
  ],

  render() {
    const main = document.getElementById('mainContent');
    const allDevices = AppState.getDevicesForContext();
    const tagMap = this._getTagMap();
    const allTags = this._getAllTags(tagMap);

    // Apply filters
    let filtered = allDevices;
    if (this._filterTag !== 'all') {
      filtered = filtered.filter(d => (tagMap[d.id] || []).includes(this._filterTag));
    }
    if (this._search) {
      filtered = filtered.filter(d =>
        (d.deviceName || '').toLowerCase().includes(this._search) ||
        (d.userPrincipalName || '').toLowerCase().includes(this._search));
    }

    // Tag stats
    const tagStats = {};
    Object.values(tagMap).forEach(tags => {
      tags.forEach(tag => { tagStats[tag] = (tagStats[tag] || 0) + 1; });
    });

    main.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h1 class="page-title">Device Tags</h1>
          <p class="page-subtitle">Categorize and organize devices with custom tags</p>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-primary btn-sm" onclick="DeviceTags._showBulkTag()">Bulk Tag</button>
          <button class="btn btn-secondary btn-sm" onclick="DeviceTags._showCreateTag()">New Tag</button>
        </div>
      </div>

      <!-- Tag Filter Bar -->
      <div class="flex flex-wrap gap-2 mb-4">
        <button class="chip ${this._filterTag === 'all' ? 'chip-active' : ''}" onclick="DeviceTags._filterTag='all'; DeviceTags.render();">
          All (${allDevices.length})
        </button>
        ${allTags.map(tag => {
          const preset = this._presets.find(p => p.name === tag);
          const color = preset ? preset.color : 'var(--primary)';
          return `<button class="chip ${this._filterTag === tag ? 'chip-active' : ''}"
            onclick="DeviceTags._filterTag='${tag.replace(/'/g, "\\'")}'; DeviceTags.render();"
            style="${this._filterTag === tag ? `background:${color};color:white;border-color:${color};` : ''}">
            <span style="width:6px;height:6px;border-radius:50%;background:${color};display:inline-block;"></span>
            ${tag} (${tagStats[tag] || 0})
          </button>`;
        }).join('')}
        <button class="chip" onclick="DeviceTags._filterTag='untagged'; DeviceTags.render();"
          style="${this._filterTag === 'untagged' ? 'background:var(--gray-600);color:white;' : ''}">
          Untagged (${allDevices.filter(d => !(tagMap[d.id] || []).length).length})
        </button>
      </div>

      <!-- Search -->
      <div class="flex gap-3 mb-4">
        <input type="text" class="form-input" placeholder="Search devices..."
          value="${this._search}" oninput="DeviceTags._search=this.value.toLowerCase(); DeviceTags.render();" style="max-width:400px;">
      </div>

      <!-- Device Table -->
      <div class="card">
        <div class="card-header"><div class="card-header-title">Devices (${filtered.length})</div></div>
        <div class="card-body" style="padding:0;">
          <div class="table-wrapper">
            <table class="table">
              <thead><tr><th style="width:30px;"><input type="checkbox" id="dtSelectAll" onchange="DeviceTags._toggleSelectAll(this.checked)"></th><th>Device</th><th>OS</th><th>User</th><th>Tags</th><th></th></tr></thead>
              <tbody>
                ${(this._filterTag === 'untagged'
                  ? filtered.filter(d => !(tagMap[d.id] || []).length)
                  : filtered
                ).slice(0, 100).map(d => {
                  const tags = tagMap[d.id] || [];
                  return `
                    <tr>
                      <td><input type="checkbox" class="dt-device-cb" value="${d.id}"></td>
                      <td class="fw-500">${d.deviceName || '-'}</td>
                      <td class="text-sm">${d.operatingSystem || ''}</td>
                      <td class="text-sm">${d.userPrincipalName || '-'}</td>
                      <td>
                        <div class="flex flex-wrap gap-1">
                          ${tags.map(tag => {
                            const preset = this._presets.find(p => p.name === tag);
                            const color = preset ? preset.color : 'var(--primary)';
                            return `<span class="badge" style="background:${color}20;color:${color};border:1px solid ${color}40;font-size:10px;">
                              ${tag}
                              <span style="cursor:pointer;margin-left:2px;" onclick="event.stopPropagation(); DeviceTags._removeTag('${d.id}','${tag.replace(/'/g, "\\'")}')">&#10005;</span>
                            </span>`;
                          }).join('')}
                          ${tags.length === 0 ? '<span class="text-xs text-muted">No tags</span>' : ''}
                        </div>
                      </td>
                      <td>
                        <button class="btn btn-ghost btn-sm" onclick="DeviceTags._showTagDevice('${d.id}','${(d.deviceName||'').replace(/'/g, "\\'")}')">Tag</button>
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

  _getTagMap() {
    try { return JSON.parse(localStorage.getItem(this._storageKey) || '{}'); } catch { return {}; }
  },

  _saveTagMap(map) {
    localStorage.setItem(this._storageKey, JSON.stringify(map));
  },

  _getAllTags(tagMap) {
    const set = new Set();
    this._presets.forEach(p => set.add(p.name));
    Object.values(tagMap || {}).forEach(tags => tags.forEach(t => set.add(t)));
    return Array.from(set).sort();
  },

  _addTag(deviceId, tag) {
    const map = this._getTagMap();
    if (!map[deviceId]) map[deviceId] = [];
    if (!map[deviceId].includes(tag)) map[deviceId].push(tag);
    this._saveTagMap(map);
  },

  _removeTag(deviceId, tag) {
    const map = this._getTagMap();
    if (map[deviceId]) {
      map[deviceId] = map[deviceId].filter(t => t !== tag);
      if (map[deviceId].length === 0) delete map[deviceId];
    }
    this._saveTagMap(map);
    this.render();
  },

  _showTagDevice(deviceId, deviceName) {
    const tagMap = this._getTagMap();
    const allTags = this._getAllTags(tagMap);
    const currentTags = tagMap[deviceId] || [];

    document.getElementById('dtTagModal')?.remove();
    const modal = document.createElement('div');
    modal.id = 'dtTagModal';
    modal.className = 'modal-overlay';
    modal.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.4);';
    modal.innerHTML = `
      <div class="modal" style="max-width:400px;width:95%;">
        <div class="modal-header">
          <h3 class="modal-title">Tag: ${deviceName}</h3>
          <button class="modal-close" onclick="document.getElementById('dtTagModal').remove()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="modal-body">
          <div class="flex flex-wrap gap-2 mb-3">
            ${allTags.map(tag => {
              const preset = this._presets.find(p => p.name === tag);
              const color = preset ? preset.color : 'var(--primary)';
              const active = currentTags.includes(tag);
              return `<button class="chip ${active ? 'chip-active' : ''}" style="${active ? `background:${color};color:white;border-color:${color};` : ''}"
                onclick="DeviceTags._toggleTag('${deviceId}','${tag.replace(/'/g, "\\'")}'); document.getElementById('dtTagModal').remove(); DeviceTags._showTagDevice('${deviceId}','${deviceName.replace(/'/g, "\\'")}');">
                ${tag}
              </button>`;
            }).join('')}
          </div>
          <div class="form-group">
            <input type="text" class="form-input" id="dtNewTag" placeholder="New custom tag..." onkeydown="if(event.key==='Enter'){DeviceTags._addCustomTag('${deviceId}'); document.getElementById('dtTagModal').remove(); DeviceTags.render();}">
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="document.getElementById('dtTagModal').remove(); DeviceTags.render();">Done</button>
        </div>
      </div>
    `;
    modal.addEventListener('click', (e) => { if (e.target === modal) { modal.remove(); this.render(); } });
    document.body.appendChild(modal);
  },

  _toggleTag(deviceId, tag) {
    const map = this._getTagMap();
    if (!map[deviceId]) map[deviceId] = [];
    if (map[deviceId].includes(tag)) {
      map[deviceId] = map[deviceId].filter(t => t !== tag);
    } else {
      map[deviceId].push(tag);
    }
    if (map[deviceId].length === 0) delete map[deviceId];
    this._saveTagMap(map);
  },

  _addCustomTag(deviceId) {
    const input = document.getElementById('dtNewTag');
    const tag = input?.value?.trim();
    if (!tag) return;
    this._addTag(deviceId, tag);
  },

  _toggleSelectAll(checked) {
    document.querySelectorAll('.dt-device-cb').forEach(cb => cb.checked = checked);
  },

  _showBulkTag() {
    const selected = Array.from(document.querySelectorAll('.dt-device-cb:checked')).map(cb => cb.value);
    if (selected.length === 0) { Toast.show('Select devices first', 'warning'); return; }

    const tagMap = this._getTagMap();
    const allTags = this._getAllTags(tagMap);

    document.getElementById('dtBulkModal')?.remove();
    const modal = document.createElement('div');
    modal.id = 'dtBulkModal';
    modal.className = 'modal-overlay';
    modal.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.4);';
    modal.innerHTML = `
      <div class="modal" style="max-width:400px;width:95%;">
        <div class="modal-header">
          <h3 class="modal-title">Bulk Tag ${selected.length} Device(s)</h3>
          <button class="modal-close" onclick="document.getElementById('dtBulkModal').remove()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="modal-body">
          <p class="text-sm text-muted mb-3">Select tags to apply to all ${selected.length} selected device(s):</p>
          <div class="flex flex-wrap gap-2 mb-3">
            ${allTags.map(tag => {
              const preset = this._presets.find(p => p.name === tag);
              const color = preset ? preset.color : 'var(--primary)';
              return `<button class="chip dt-bulk-tag-btn" data-tag="${tag}"
                onclick="this.classList.toggle('chip-active'); if(this.classList.contains('chip-active')){this.style.background='${color}';this.style.color='white';this.style.borderColor='${color}'}else{this.style.background='';this.style.color='';this.style.borderColor='';}">
                ${tag}
              </button>`;
            }).join('')}
          </div>
          <div class="form-group">
            <input type="text" class="form-input" id="dtBulkNewTag" placeholder="Or enter a new tag...">
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="document.getElementById('dtBulkModal').remove()">Cancel</button>
          <button class="btn btn-primary" onclick="DeviceTags._applyBulkTags(${JSON.stringify(selected)})">Apply Tags</button>
        </div>
      </div>
    `;
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
    document.body.appendChild(modal);
  },

  _applyBulkTags(deviceIds) {
    const selectedTags = Array.from(document.querySelectorAll('.dt-bulk-tag-btn.chip-active')).map(btn => btn.dataset.tag);
    const newTag = document.getElementById('dtBulkNewTag')?.value?.trim();
    if (newTag) selectedTags.push(newTag);

    if (selectedTags.length === 0) { Toast.show('Select at least one tag', 'warning'); return; }

    const map = this._getTagMap();
    deviceIds.forEach(id => {
      if (!map[id]) map[id] = [];
      selectedTags.forEach(tag => {
        if (!map[id].includes(tag)) map[id].push(tag);
      });
    });
    this._saveTagMap(map);
    document.getElementById('dtBulkModal')?.remove();
    Toast.show(`Applied ${selectedTags.length} tag(s) to ${deviceIds.length} device(s)`, 'success');
    if (typeof AuditLog !== 'undefined') AuditLog.log('bulk_tag', `Tagged ${deviceIds.length} devices with: ${selectedTags.join(', ')}`);
    this.render();
  },

  _showCreateTag() {
    const name = prompt('Enter new tag name:');
    if (!name?.trim()) return;
    // Just add it to presets list visually by re-rendering — it'll show up from _getAllTags
    Toast.show(`Tag "${name.trim()}" created. Select devices to apply it.`, 'success');
    this.render();
  }
};
