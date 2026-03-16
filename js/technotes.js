/* ============================================================
   Technician Notes — Per-entity notes with priority, tags, pinning
   ============================================================ */

const TechNotes = {
  STORAGE_KEY: 'tech_notes',
  AUTHOR_KEY: 'tech_notes_author',

  // Filter state
  searchTerm: '',
  entityTypeFilter: 'all',
  priorityFilter: 'all',
  tagFilter: 'all',
  expandedNoteId: null,
  currentPage: 1,
  pageSize: 20,

  // Priority config
  priorityColors: {
    low: '#6b7280',
    normal: '#2563eb',
    high: '#f59e0b',
    critical: '#dc2626'
  },

  priorityLabels: {
    low: 'Low',
    normal: 'Normal',
    high: 'High',
    critical: 'Critical'
  },

  // ---- Storage ----

  _getNotes() {
    try {
      return JSON.parse(localStorage.getItem(this.STORAGE_KEY)) || [];
    } catch (e) {
      return [];
    }
  },

  _saveNotes(notes) {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(notes));
    } catch (e) {
      Toast.show('Failed to save notes — storage may be full.', 'error');
    }
  },

  _generateId() {
    return 'tn_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 8);
  },

  _getSavedAuthor() {
    return localStorage.getItem(this.AUTHOR_KEY) || '';
  },

  _saveAuthor(name) {
    localStorage.setItem(this.AUTHOR_KEY, name);
  },

  // ---- CRUD ----

  addNote(note) {
    const notes = this._getNotes();
    const now = new Date().toISOString();
    const newNote = {
      id: this._generateId(),
      entityType: note.entityType,
      entityId: note.entityId,
      entityName: note.entityName || '',
      tenantId: note.tenantId || '',
      tenantName: note.tenantName || '',
      content: (note.content || '').trim(),
      author: (note.author || '').trim(),
      priority: note.priority || 'normal',
      tags: (note.tags || []).map(t => t.trim()).filter(Boolean),
      createdAt: now,
      updatedAt: now,
      pinned: !!note.pinned
    };
    notes.unshift(newNote);
    this._saveNotes(notes);
    if (newNote.author) this._saveAuthor(newNote.author);
    if (typeof AuditLog !== 'undefined') {
      AuditLog.log('note_created', `Note added for ${newNote.entityType} "${newNote.entityName}" [${newNote.priority}]`);
    }
    Toast.show('Note created successfully.', 'success');
    return newNote;
  },

  updateNote(id, updates) {
    const notes = this._getNotes();
    const idx = notes.findIndex(n => n.id === id);
    if (idx === -1) { Toast.show('Note not found.', 'error'); return null; }
    const updated = {
      ...notes[idx],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    if (updates.tags) updated.tags = updates.tags.map(t => t.trim()).filter(Boolean);
    if (updates.content !== undefined) updated.content = updates.content.trim();
    if (updates.author !== undefined) {
      updated.author = updates.author.trim();
      if (updated.author) this._saveAuthor(updated.author);
    }
    notes[idx] = updated;
    this._saveNotes(notes);
    if (typeof AuditLog !== 'undefined') {
      AuditLog.log('note_updated', `Note updated for ${updated.entityType} "${updated.entityName}"`);
    }
    Toast.show('Note updated.', 'success');
    return updated;
  },

  deleteNote(id) {
    const notes = this._getNotes();
    const note = notes.find(n => n.id === id);
    if (!note) return;
    if (!confirm('Delete this note? This cannot be undone.')) return;
    this._saveNotes(notes.filter(n => n.id !== id));
    if (typeof AuditLog !== 'undefined') {
      AuditLog.log('note_deleted', `Note deleted for ${note.entityType} "${note.entityName}"`);
    }
    Toast.show('Note deleted.', 'info');
    this.expandedNoteId = null;
    this.render();
  },

  togglePin(id) {
    const notes = this._getNotes();
    const note = notes.find(n => n.id === id);
    if (!note) return;
    note.pinned = !note.pinned;
    note.updatedAt = new Date().toISOString();
    this._saveNotes(notes);
    Toast.show(note.pinned ? 'Note pinned.' : 'Note unpinned.', 'info');
    this.render();
  },

  // ---- Queries ----

  getNotesFor(entityType, entityId) {
    return this._getNotes().filter(n => n.entityType === entityType && n.entityId === entityId);
  },

  getNoteCount(entityType, entityId) {
    return this.getNotesFor(entityType, entityId).length;
  },

  searchNotes(query) {
    if (!query) return this._getNotes();
    const q = query.toLowerCase();
    return this._getNotes().filter(n =>
      n.content.toLowerCase().includes(q) ||
      n.entityName.toLowerCase().includes(q) ||
      n.author.toLowerCase().includes(q) ||
      n.tags.some(t => t.toLowerCase().includes(q))
    );
  },

  _getAllTags() {
    const tagSet = new Set();
    this._getNotes().forEach(n => n.tags.forEach(t => tagSet.add(t)));
    return Array.from(tagSet).sort();
  },

  _applyFilters(notes) {
    let filtered = notes;
    if (this.entityTypeFilter !== 'all') {
      filtered = filtered.filter(n => n.entityType === this.entityTypeFilter);
    }
    if (this.priorityFilter !== 'all') {
      filtered = filtered.filter(n => n.priority === this.priorityFilter);
    }
    if (this.tagFilter !== 'all') {
      filtered = filtered.filter(n => n.tags.includes(this.tagFilter));
    }
    if (this.searchTerm) {
      const q = this.searchTerm.toLowerCase();
      filtered = filtered.filter(n =>
        n.content.toLowerCase().includes(q) ||
        n.entityName.toLowerCase().includes(q) ||
        n.author.toLowerCase().includes(q) ||
        n.tags.some(t => t.toLowerCase().includes(q))
      );
    }
    // Pinned first, then by updatedAt descending
    filtered.sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return new Date(b.updatedAt) - new Date(a.updatedAt);
    });
    return filtered;
  },

  // ---- Export ----

  exportNotes() {
    const notes = this._applyFilters(this._getNotes());
    if (!notes.length) {
      Toast.show('No notes to export.', 'warning');
      return;
    }
    const headers = ['ID', 'Entity Type', 'Entity ID', 'Entity Name', 'Tenant ID', 'Tenant Name', 'Content', 'Author', 'Priority', 'Tags', 'Pinned', 'Created At', 'Updated At'];
    const escCSV = (v) => '"' + String(v || '').replace(/"/g, '""') + '"';
    const rows = notes.map(n => [
      n.id, n.entityType, n.entityId, n.entityName, n.tenantId, n.tenantName,
      n.content, n.author, n.priority, n.tags.join('; '),
      n.pinned ? 'Yes' : 'No', n.createdAt, n.updatedAt
    ].map(escCSV).join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'technician_notes_' + new Date().toISOString().slice(0, 10) + '.csv';
    a.click();
    URL.revokeObjectURL(url);
    Toast.show('Notes exported.', 'success');
    if (typeof AuditLog !== 'undefined') {
      AuditLog.log('notes_exported', `Exported ${notes.length} notes to CSV`);
    }
  },

  // ---- Helpers ----

  _formatDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    const now = new Date();
    const diff = now - d;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
    if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
    if (diff < 604800000) return Math.floor(diff / 86400000) + 'd ago';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  },

  _truncate(str, len) {
    if (!str) return '';
    return str.length > len ? str.substring(0, len) + '...' : str;
  },

  _entityIcon(type) {
    const icons = {
      device: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>',
      user: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
      tenant: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>'
    };
    return icons[type] || icons.device;
  },

  _priorityBadge(priority) {
    const color = this.priorityColors[priority] || this.priorityColors.normal;
    const label = this.priorityLabels[priority] || 'Normal';
    return `<span class="badge" style="background:${color}15;color:${color};border:1px solid ${color}30;font-size:11px;padding:2px 8px;">${label}</span>`;
  },

  _tagBadges(tags) {
    if (!tags || !tags.length) return '';
    return tags.map(t => `<span class="badge" style="background:var(--bg-secondary);color:var(--text-secondary);font-size:11px;padding:2px 6px;">${this._escHtml(t)}</span>`).join(' ');
  },

  _escHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  // ---- Main Page Render ----

  render() {
    const main = document.getElementById('mainContent');
    if (!main) return;

    const allNotes = this._getNotes();
    const filtered = this._applyFilters(allNotes);
    const totalPages = Math.ceil(filtered.length / this.pageSize);
    if (this.currentPage > totalPages && totalPages > 0) this.currentPage = totalPages;
    const paged = filtered.slice((this.currentPage - 1) * this.pageSize, this.currentPage * this.pageSize);
    const allTags = this._getAllTags();

    // Stats
    const pinnedCount = allNotes.filter(n => n.pinned).length;
    const highCritCount = allNotes.filter(n => n.priority === 'high' || n.priority === 'critical').length;

    main.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h1 class="page-title">Technician Notes</h1>
          <p class="page-subtitle">Manage notes across devices, users, and tenants</p>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-secondary" onclick="TechNotes.exportNotes()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Export CSV
          </button>
          <button class="btn btn-primary" onclick="TechNotes.showNoteModal()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            New Note
          </button>
        </div>
      </div>

      <!-- Stats Bar -->
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px;margin-bottom:20px;" class="animate-fade">
        <div class="card" style="padding:16px;text-align:center;">
          <div style="font-size:24px;font-weight:700;color:var(--primary);">${allNotes.length}</div>
          <div style="font-size:12px;color:var(--text-muted);">Total Notes</div>
        </div>
        <div class="card" style="padding:16px;text-align:center;">
          <div style="font-size:24px;font-weight:700;color:#f59e0b;">${pinnedCount}</div>
          <div style="font-size:12px;color:var(--text-muted);">Pinned</div>
        </div>
        <div class="card" style="padding:16px;text-align:center;">
          <div style="font-size:24px;font-weight:700;color:#dc2626;">${highCritCount}</div>
          <div style="font-size:12px;color:var(--text-muted);">High / Critical</div>
        </div>
        <div class="card" style="padding:16px;text-align:center;">
          <div style="font-size:24px;font-weight:700;color:var(--text-secondary);">${allTags.length}</div>
          <div style="font-size:12px;color:var(--text-muted);">Unique Tags</div>
        </div>
      </div>

      <!-- Filter Bar -->
      <div class="card animate-fade" style="margin-bottom:20px;">
        <div style="padding:12px 16px;display:flex;flex-wrap:wrap;gap:10px;align-items:center;">
          <div style="flex:1;min-width:200px;">
            <input type="text" class="form-input" placeholder="Search notes..." value="${this._escHtml(this.searchTerm)}"
              oninput="TechNotes.searchTerm=this.value;TechNotes.currentPage=1;TechNotes.render();"
              style="width:100%;height:36px;">
          </div>
          <select class="form-select" style="width:auto;min-width:140px;height:36px;"
            onchange="TechNotes.entityTypeFilter=this.value;TechNotes.currentPage=1;TechNotes.render();">
            <option value="all" ${this.entityTypeFilter === 'all' ? 'selected' : ''}>All Types</option>
            <option value="device" ${this.entityTypeFilter === 'device' ? 'selected' : ''}>Devices</option>
            <option value="user" ${this.entityTypeFilter === 'user' ? 'selected' : ''}>Users</option>
            <option value="tenant" ${this.entityTypeFilter === 'tenant' ? 'selected' : ''}>Tenants</option>
          </select>
          <select class="form-select" style="width:auto;min-width:130px;height:36px;"
            onchange="TechNotes.priorityFilter=this.value;TechNotes.currentPage=1;TechNotes.render();">
            <option value="all" ${this.priorityFilter === 'all' ? 'selected' : ''}>All Priorities</option>
            <option value="low" ${this.priorityFilter === 'low' ? 'selected' : ''}>Low</option>
            <option value="normal" ${this.priorityFilter === 'normal' ? 'selected' : ''}>Normal</option>
            <option value="high" ${this.priorityFilter === 'high' ? 'selected' : ''}>High</option>
            <option value="critical" ${this.priorityFilter === 'critical' ? 'selected' : ''}>Critical</option>
          </select>
          <select class="form-select" style="width:auto;min-width:130px;height:36px;"
            onchange="TechNotes.tagFilter=this.value;TechNotes.currentPage=1;TechNotes.render();">
            <option value="all" ${this.tagFilter === 'all' ? 'selected' : ''}>All Tags</option>
            ${allTags.map(t => `<option value="${this._escHtml(t)}" ${this.tagFilter === t ? 'selected' : ''}>${this._escHtml(t)}</option>`).join('')}
          </select>
          ${(this.searchTerm || this.entityTypeFilter !== 'all' || this.priorityFilter !== 'all' || this.tagFilter !== 'all') ? `
            <button class="btn btn-ghost btn-sm" onclick="TechNotes.searchTerm='';TechNotes.entityTypeFilter='all';TechNotes.priorityFilter='all';TechNotes.tagFilter='all';TechNotes.currentPage=1;TechNotes.render();">
              Clear Filters
            </button>
          ` : ''}
        </div>
      </div>

      <!-- Notes List -->
      <div class="animate-fade">
        ${filtered.length === 0 ? `
          <div class="card" style="padding:48px;text-align:center;">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="1.5" style="margin:0 auto 12px;">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
            </svg>
            <div style="font-weight:600;color:var(--text-primary);margin-bottom:4px;">No notes found</div>
            <div style="color:var(--text-muted);font-size:13px;margin-bottom:16px;">
              ${allNotes.length === 0 ? 'Create your first technician note to get started.' : 'Try adjusting your filters.'}
            </div>
            <button class="btn btn-primary btn-sm" onclick="TechNotes.showNoteModal()">Create Note</button>
          </div>
        ` : `
          <div style="display:flex;flex-direction:column;gap:10px;">
            ${paged.map(note => this._renderNoteCard(note)).join('')}
          </div>
          ${totalPages > 1 ? `
            <div style="display:flex;justify-content:space-between;align-items:center;margin-top:16px;padding:8px 0;">
              <span style="font-size:13px;color:var(--text-muted);">Showing ${(this.currentPage - 1) * this.pageSize + 1}-${Math.min(this.currentPage * this.pageSize, filtered.length)} of ${filtered.length} notes</span>
              <div style="display:flex;gap:4px;">
                <button class="btn btn-ghost btn-sm" ${this.currentPage <= 1 ? 'disabled' : ''} onclick="TechNotes.currentPage--;TechNotes.render();">Prev</button>
                <button class="btn btn-ghost btn-sm" ${this.currentPage >= totalPages ? 'disabled' : ''} onclick="TechNotes.currentPage++;TechNotes.render();">Next</button>
              </div>
            </div>
          ` : ''}
        `}
      </div>
    `;
  },

  _renderNoteCard(note) {
    const isExpanded = this.expandedNoteId === note.id;
    const pinIcon = note.pinned
      ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2"><path d="M12 2l2.09 6.26L21 9.27l-5 4.87L17.18 21 12 17.27 6.82 21 8 14.14l-5-4.87 6.91-1.01z"/></svg>'
      : '';

    return `
      <div class="card" style="overflow:hidden;border-left:3px solid ${this.priorityColors[note.priority] || this.priorityColors.normal};${note.pinned ? 'background:var(--bg-secondary);' : ''}">
        <div style="padding:14px 16px;cursor:pointer;" onclick="TechNotes.expandedNoteId=TechNotes.expandedNoteId==='${note.id}'?null:'${note.id}';TechNotes.render();">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap;">
            <span style="color:var(--text-muted);">${this._entityIcon(note.entityType)}</span>
            <span style="font-weight:600;font-size:14px;color:var(--text-primary);">${this._escHtml(note.entityName || note.entityId)}</span>
            <span class="badge" style="font-size:10px;padding:1px 6px;background:var(--bg-secondary);color:var(--text-muted);text-transform:capitalize;">${note.entityType}</span>
            ${this._priorityBadge(note.priority)}
            ${note.pinned ? `<span style="color:#f59e0b;" title="Pinned">${pinIcon}</span>` : ''}
            <span style="margin-left:auto;font-size:12px;color:var(--text-muted);">${this._formatDate(note.updatedAt)}</span>
          </div>
          <div style="font-size:13px;color:var(--text-secondary);line-height:1.5;">${isExpanded ? '' : this._escHtml(this._truncate(note.content, 150))}</div>
          ${!isExpanded && note.tags.length ? `<div style="margin-top:6px;display:flex;gap:4px;flex-wrap:wrap;">${this._tagBadges(note.tags)}</div>` : ''}
        </div>
        ${isExpanded ? `
          <div style="padding:0 16px 14px;border-top:1px solid var(--border);">
            <div style="padding-top:12px;font-size:13px;color:var(--text-primary);white-space:pre-wrap;line-height:1.6;margin-bottom:12px;">${this._escHtml(note.content)}</div>
            ${note.tags.length ? `<div style="margin-bottom:10px;display:flex;gap:4px;flex-wrap:wrap;">${this._tagBadges(note.tags)}</div>` : ''}
            <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;font-size:12px;color:var(--text-muted);margin-bottom:12px;">
              ${note.author ? `<span>By: <strong>${this._escHtml(note.author)}</strong></span><span>|</span>` : ''}
              ${note.tenantName ? `<span>Tenant: ${this._escHtml(note.tenantName)}</span><span>|</span>` : ''}
              <span>Created: ${this._formatDate(note.createdAt)}</span>
              ${note.updatedAt !== note.createdAt ? `<span>|</span><span>Updated: ${this._formatDate(note.updatedAt)}</span>` : ''}
            </div>
            <div style="display:flex;gap:8px;">
              <button class="btn btn-sm btn-ghost" onclick="event.stopPropagation();TechNotes.togglePin('${note.id}');">
                ${note.pinned ? 'Unpin' : 'Pin'}
              </button>
              <button class="btn btn-sm btn-primary" onclick="event.stopPropagation();TechNotes.showNoteModal('${note.entityType}','${note.entityId}','${this._escHtml(note.entityName)}','${note.tenantId}','${this._escHtml(note.tenantName)}','${note.id}');">
                Edit
              </button>
              <button class="btn btn-sm btn-danger" onclick="event.stopPropagation();TechNotes.deleteNote('${note.id}');">
                Delete
              </button>
            </div>
          </div>
        ` : ''}
      </div>
    `;
  },

  // ---- Note Modal ----

  showNoteModal(entityType, entityId, entityName, tenantId, tenantName, editNoteId) {
    let existing = null;
    if (editNoteId) {
      existing = this._getNotes().find(n => n.id === editNoteId);
    }

    // Default values
    const et = existing ? existing.entityType : (entityType || 'device');
    const eid = existing ? existing.entityId : (entityId || '');
    const ename = existing ? existing.entityName : (entityName || '');
    const tid = existing ? existing.tenantId : (tenantId || '');
    const tname = existing ? existing.tenantName : (tenantName || '');
    const content = existing ? existing.content : '';
    const priority = existing ? existing.priority : 'normal';
    const tags = existing ? existing.tags.join(', ') : '';
    const pinned = existing ? existing.pinned : false;
    const author = existing ? existing.author : this._getSavedAuthor();

    // Remove existing modal if present
    const old = document.getElementById('techNoteModal');
    if (old) old.remove();

    const modal = document.createElement('div');
    modal.id = 'techNoteModal';
    modal.className = 'modal-overlay';
    modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:1000;padding:20px;';
    modal.innerHTML = `
      <div class="modal" style="max-width:560px;width:100%;max-height:90vh;overflow-y:auto;border-radius:12px;background:var(--bg-primary);box-shadow:0 20px 60px rgba(0,0,0,0.2);">
        <div class="modal-header" style="padding:16px 20px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;">
          <h3 class="modal-title" style="margin:0;font-size:16px;">${existing ? 'Edit Note' : 'New Technician Note'}</h3>
          <button class="modal-close" onclick="document.getElementById('techNoteModal').remove();" style="background:none;border:none;cursor:pointer;padding:4px;color:var(--text-muted);">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div style="padding:20px;display:flex;flex-direction:column;gap:14px;">
          ${!entityId && !existing ? `
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
              <div>
                <label class="form-label">Entity Type</label>
                <select id="tnEntityType" class="form-select" style="width:100%;">
                  <option value="device" ${et === 'device' ? 'selected' : ''}>Device</option>
                  <option value="user" ${et === 'user' ? 'selected' : ''}>User</option>
                  <option value="tenant" ${et === 'tenant' ? 'selected' : ''}>Tenant</option>
                </select>
              </div>
              <div>
                <label class="form-label">Entity Name</label>
                <input type="text" id="tnEntityName" class="form-input" placeholder="e.g. DESKTOP-ABC123" value="${this._escHtml(ename)}" style="width:100%;">
              </div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
              <div>
                <label class="form-label">Entity ID</label>
                <input type="text" id="tnEntityId" class="form-input" placeholder="ID (optional)" value="${this._escHtml(eid)}" style="width:100%;">
              </div>
              <div>
                <label class="form-label">Tenant Name</label>
                <input type="text" id="tnTenantName" class="form-input" placeholder="Tenant (optional)" value="${this._escHtml(tname)}" style="width:100%;">
              </div>
            </div>
          ` : `
            <div style="padding:10px 12px;background:var(--bg-secondary);border-radius:8px;font-size:13px;">
              <span style="color:var(--text-muted);">${et.charAt(0).toUpperCase() + et.slice(1)}:</span>
              <strong>${this._escHtml(ename || eid)}</strong>
              ${tname ? `<span style="color:var(--text-muted);margin-left:8px;">in ${this._escHtml(tname)}</span>` : ''}
            </div>
          `}
          <div>
            <label class="form-label">Note Content</label>
            <textarea id="tnContent" class="form-input" rows="5" placeholder="Enter your technician note..." style="width:100%;resize:vertical;min-height:100px;font-family:inherit;">${this._escHtml(content)}</textarea>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
            <div>
              <label class="form-label">Priority</label>
              <div id="tnPriorityGroup" style="display:flex;gap:4px;">
                ${['low', 'normal', 'high', 'critical'].map(p => `
                  <button type="button" class="btn btn-sm" data-priority="${p}"
                    style="flex:1;font-size:11px;border:2px solid ${priority === p ? this.priorityColors[p] : 'var(--border)'};color:${priority === p ? '#fff' : this.priorityColors[p]};background:${priority === p ? this.priorityColors[p] : 'transparent'};"
                    onclick="TechNotes._selectPriority(this, '${p}')">
                    ${this.priorityLabels[p]}
                  </button>
                `).join('')}
              </div>
            </div>
            <div>
              <label class="form-label">Author</label>
              <input type="text" id="tnAuthor" class="form-input" placeholder="Your name" value="${this._escHtml(author)}" style="width:100%;">
            </div>
          </div>
          <div>
            <label class="form-label">Tags <span style="color:var(--text-muted);font-weight:400;">(comma-separated)</span></label>
            <input type="text" id="tnTags" class="form-input" placeholder="e.g. hardware, urgent, follow-up" value="${this._escHtml(tags)}" style="width:100%;">
          </div>
          <div style="display:flex;align-items:center;gap:8px;">
            <input type="checkbox" id="tnPinned" ${pinned ? 'checked' : ''} style="width:16px;height:16px;">
            <label for="tnPinned" class="form-label" style="margin:0;cursor:pointer;">Pin this note</label>
          </div>
        </div>
        <div style="padding:14px 20px;border-top:1px solid var(--border);display:flex;justify-content:flex-end;gap:8px;">
          <button class="btn btn-secondary" onclick="document.getElementById('techNoteModal').remove();">Cancel</button>
          <button class="btn btn-primary" onclick="TechNotes._saveFromModal('${editNoteId || ''}', '${this._escHtml(et)}', '${this._escHtml(eid)}', '${this._escHtml(tid)}');">
            ${existing ? 'Save Changes' : 'Create Note'}
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    // Close on backdrop click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });

    // Focus content area
    setTimeout(() => {
      const ta = document.getElementById('tnContent');
      if (ta) ta.focus();
    }, 100);
  },

  _selectPriority(btn, priority) {
    const group = document.getElementById('tnPriorityGroup');
    if (!group) return;
    group.querySelectorAll('button').forEach(b => {
      const p = b.dataset.priority;
      b.style.border = '2px solid var(--border)';
      b.style.color = TechNotes.priorityColors[p];
      b.style.background = 'transparent';
    });
    btn.style.border = '2px solid ' + this.priorityColors[priority];
    btn.style.color = '#fff';
    btn.style.background = this.priorityColors[priority];
  },

  _getSelectedPriority() {
    const group = document.getElementById('tnPriorityGroup');
    if (!group) return 'normal';
    const active = group.querySelector('button[style*="background: rgb"], button[style*="background:#"], button[style*="background: #"]');
    // Fallback: check which button has white text
    const btns = group.querySelectorAll('button');
    for (const b of btns) {
      if (b.style.color === 'rgb(255, 255, 255)' || b.style.color === '#fff') {
        return b.dataset.priority;
      }
    }
    return 'normal';
  },

  _saveFromModal(editId, fallbackType, fallbackId, fallbackTenantId) {
    const content = (document.getElementById('tnContent')?.value || '').trim();
    if (!content) {
      Toast.show('Note content is required.', 'warning');
      return;
    }

    const entityType = document.getElementById('tnEntityType')?.value || fallbackType;
    const entityId = document.getElementById('tnEntityId')?.value || fallbackId;
    const entityName = document.getElementById('tnEntityName')?.value || document.querySelector('#techNoteModal .modal strong')?.textContent || '';
    const tenantName = document.getElementById('tnTenantName')?.value || '';
    const author = (document.getElementById('tnAuthor')?.value || '').trim();
    const tagsRaw = document.getElementById('tnTags')?.value || '';
    const tags = tagsRaw.split(',').map(t => t.trim()).filter(Boolean);
    const pinned = document.getElementById('tnPinned')?.checked || false;
    const priority = this._getSelectedPriority();

    if (editId) {
      this.updateNote(editId, { content, author, priority, tags, pinned });
    } else {
      this.addNote({
        entityType,
        entityId: entityId || entityName,
        entityName,
        tenantId: fallbackTenantId || '',
        tenantName,
        content,
        author,
        priority,
        tags,
        pinned
      });
    }

    document.getElementById('techNoteModal')?.remove();
    this.render();
  },

  // ---- Inline Notes (for embedding in detail panels) ----

  renderInlineNotes(entityType, entityId, entityName, tenantId, tenantName) {
    const notes = this.getNotesFor(entityType, entityId);

    let html = `<div class="technotes-inline" style="margin-top:12px;">`;
    html += `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">`;
    html += `<span style="font-weight:600;font-size:13px;color:var(--text-primary);">Technician Notes ${notes.length ? `<span class="badge" style="font-size:10px;padding:1px 6px;background:var(--primary);color:#fff;margin-left:4px;">${notes.length}</span>` : ''}</span>`;
    html += `<button class="btn btn-sm btn-primary" onclick="TechNotes.showNoteModal('${entityType}','${entityId}','${this._escHtml(entityName || '')}','${tenantId || ''}','${this._escHtml(tenantName || '')}')">Add Note</button>`;
    html += `</div>`;

    if (notes.length === 0) {
      html += `<div style="padding:16px;text-align:center;color:var(--text-muted);font-size:13px;background:var(--bg-secondary);border-radius:8px;">No notes yet.</div>`;
    } else {
      // Sort: pinned first, then by date
      notes.sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        return new Date(b.updatedAt) - new Date(a.updatedAt);
      });
      notes.forEach(note => {
        html += `
          <div style="padding:10px 12px;margin-bottom:6px;border-radius:8px;background:var(--bg-secondary);border-left:3px solid ${this.priorityColors[note.priority]};">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
              <div style="display:flex;gap:6px;align-items:center;">
                ${this._priorityBadge(note.priority)}
                ${note.pinned ? '<span style="color:#f59e0b;" title="Pinned"><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2"><path d="M12 2l2.09 6.26L21 9.27l-5 4.87L17.18 21 12 17.27 6.82 21 8 14.14l-5-4.87 6.91-1.01z"/></svg></span>' : ''}
                ${note.author ? `<span style="font-size:11px;color:var(--text-muted);">by ${this._escHtml(note.author)}</span>` : ''}
              </div>
              <span style="font-size:11px;color:var(--text-muted);">${this._formatDate(note.updatedAt)}</span>
            </div>
            <div style="font-size:13px;color:var(--text-primary);white-space:pre-wrap;line-height:1.5;">${this._escHtml(note.content)}</div>
            ${note.tags.length ? `<div style="margin-top:6px;display:flex;gap:4px;flex-wrap:wrap;">${this._tagBadges(note.tags)}</div>` : ''}
            <div style="margin-top:6px;display:flex;gap:6px;">
              <button class="btn btn-sm btn-ghost" style="font-size:11px;padding:2px 8px;" onclick="TechNotes.togglePin('${note.id}');">${note.pinned ? 'Unpin' : 'Pin'}</button>
              <button class="btn btn-sm btn-ghost" style="font-size:11px;padding:2px 8px;" onclick="TechNotes.showNoteModal('${entityType}','${entityId}','${this._escHtml(entityName || '')}','${tenantId || ''}','${this._escHtml(tenantName || '')}','${note.id}');">Edit</button>
              <button class="btn btn-sm btn-ghost" style="font-size:11px;padding:2px 8px;color:var(--danger);" onclick="TechNotes.deleteNote('${note.id}');">Delete</button>
            </div>
          </div>
        `;
      });
    }

    html += `</div>`;
    return html;
  }
};
