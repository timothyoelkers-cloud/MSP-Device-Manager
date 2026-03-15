/* ============================================================
   TableHelper — Reusable search, sort, export, pagination
   ============================================================ */

const TableHelper = {

  /**
   * Generate a standard toolbar HTML with search, filter chips, and action buttons.
   * @param {object} opts
   * @param {string} opts.searchValue   - Current search term
   * @param {string} opts.onSearch      - JS expression for oninput (receives `this.value`)
   * @param {string} opts.placeholder   - Search placeholder
   * @param {Array}  opts.filters       - [{key, label, active}]
   * @param {string} opts.onFilter      - JS template with {{key}} placeholder
   * @param {Array}  opts.actions       - [{label, icon, onclick, className}]
   */
  toolbar({ searchValue = '', onSearch = '', placeholder = 'Search...', filters = [], onFilter = '', actions = [] } = {}) {
    const filterHtml = filters.length > 0 ? `
      <div class="flex gap-2">
        ${filters.map(f => `
          <button class="chip ${f.active ? 'chip-active' : ''}" onclick="${onFilter.replace(/\{\{key\}\}/g, f.key)}">${f.label}</button>
        `).join('')}
      </div>
    ` : '';

    const actionHtml = actions.map(a => `
      <button class="btn ${a.className || 'btn-secondary btn-sm'}" onclick="${a.onclick}">
        ${a.icon || ''}${a.label}
      </button>
    `).join('');

    return `
      <div class="table-toolbar">
        <div class="table-toolbar-left">
          <div class="table-search">
            <svg class="table-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" placeholder="${placeholder}" value="${searchValue}" oninput="${onSearch}">
          </div>
          ${filterHtml}
        </div>
        <div class="table-toolbar-right">${actionHtml}</div>
      </div>
    `;
  },

  /**
   * Generate sortable table header.
   * @param {Array} columns - [{key, label, sortable, width}]
   * @param {string} sortKey - Current sort column
   * @param {string} sortDir - 'asc' | 'desc'
   * @param {string} onSort  - JS expression template with {{key}} placeholder
   */
  sortableHeaders(columns, sortKey, sortDir, onSort) {
    return columns.map(col => {
      if (!col.sortable) return `<th${col.width ? ` style="width:${col.width}"` : ''}>${col.label}</th>`;
      const active = sortKey === col.key;
      const arrow = active ? (sortDir === 'asc' ? ' &#9650;' : ' &#9660;') : ' <span style="opacity:0.3;">&#9650;</span>';
      return `<th${col.width ? ` style="width:${col.width}"` : ''} style="cursor:pointer;user-select:none;${col.width ? `width:${col.width};` : ''}" onclick="${onSort.replace(/\{\{key\}\}/g, col.key)}">${col.label}${arrow}</th>`;
    }).join('');
  },

  /**
   * Sort an array by key.
   */
  sort(arr, key, dir = 'asc') {
    if (!key) return arr;
    return [...arr].sort((a, b) => {
      let va = a[key], vb = b[key];
      if (va == null) va = '';
      if (vb == null) vb = '';
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      if (typeof va === 'number' && typeof vb === 'number') return dir === 'asc' ? va - vb : vb - va;
      return dir === 'asc' ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
    });
  },

  /**
   * Generate pagination controls.
   * @param {number} page        - Current page (1-based)
   * @param {number} totalPages  - Total pages
   * @param {number} totalItems  - Total items
   * @param {number} perPage     - Items per page
   * @param {string} onPage      - JS expression template with {{page}} placeholder
   */
  pagination(page, totalPages, totalItems, perPage, onPage) {
    if (totalPages <= 1) return '';
    const start = (page - 1) * perPage + 1;
    const end = Math.min(page * perPage, totalItems);

    let pages = '';
    const maxVisible = 7;
    let startPage = Math.max(1, page - 3);
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);
    if (endPage - startPage < maxVisible - 1) startPage = Math.max(1, endPage - maxVisible + 1);

    for (let p = startPage; p <= endPage; p++) {
      pages += `<button class="table-pagination-btn ${page === p ? 'active' : ''}" onclick="${onPage.replace(/\{\{page\}\}/g, p)}">${p}</button>`;
    }

    return `
      <div class="table-pagination">
        <span class="text-sm text-muted">Showing ${start}–${end} of ${totalItems}</span>
        <div class="table-pagination-pages">
          <button class="table-pagination-btn" ${page <= 1 ? 'disabled' : ''} onclick="${onPage.replace(/\{\{page\}\}/g, page - 1)}">&#8249;</button>
          ${pages}
          <button class="table-pagination-btn" ${page >= totalPages ? 'disabled' : ''} onclick="${onPage.replace(/\{\{page\}\}/g, page + 1)}">&#8250;</button>
        </div>
      </div>
    `;
  },

  /**
   * Generic CSV export utility.
   * @param {Array}  headers  - Column header strings
   * @param {Array}  rows     - Array of arrays
   * @param {string} filename - Download filename
   */
  exportCSV(headers, rows, filename) {
    const csv = [headers, ...rows]
      .map(r => r.map(c => `"${String(c == null ? '' : c).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename || `export_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    Toast.show('CSV exported successfully', 'success');
  }
};
