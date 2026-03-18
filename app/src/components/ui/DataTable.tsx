import { useState, useMemo, type ReactNode } from 'react';
import { Search, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

export interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => ReactNode;
  sortable?: boolean;
  width?: string;
}

interface Props<T> {
  data: T[];
  columns: Column<T>[];
  keyField?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  selectable?: boolean;
  onSelectionChange?: (selected: T[]) => void;
  onRowClick?: (item: T) => void;
  pageSize?: number;
  loading?: boolean;
  emptyMessage?: string;
  actions?: ReactNode;
}

export function DataTable<T extends Record<string, unknown>>({
  data, columns, keyField = 'id', searchable, searchPlaceholder = 'Search...',
  selectable, onSelectionChange, onRowClick, pageSize = 25,
  loading, emptyMessage = 'No data found', actions,
}: Props<T>) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    let items = data;
    if (search) {
      const q = search.toLowerCase();
      items = items.filter((item) =>
        columns.some((col) => String(item[col.key] ?? '').toLowerCase().includes(q))
      );
    }
    if (sortKey) {
      items = [...items].sort((a, b) => {
        const av = String(a[sortKey] ?? '');
        const bv = String(b[sortKey] ?? '');
        return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      });
    }
    return items;
  }, [data, search, sortKey, sortDir, columns]);

  const paged = filtered.slice(page * pageSize, (page + 1) * pageSize);
  const totalPages = Math.ceil(filtered.length / pageSize);

  const toggleSort = (key: string) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
    onSelectionChange?.(data.filter((d) => next.has(String(d[keyField]))));
  };

  const toggleAll = () => {
    if (selected.size === paged.length) {
      setSelected(new Set());
      onSelectionChange?.([]);
    } else {
      const next = new Set(paged.map((d) => String(d[keyField])));
      setSelected(next);
      onSelectionChange?.(paged);
    }
  };

  if (loading) {
    return (
      <div className="card">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="skeleton" style={{ height: 40, marginBottom: 8, borderRadius: 6 }} />
        ))}
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      {(searchable || actions) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
          {searchable && (
            <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input className="input" style={{ paddingLeft: 32 }} placeholder={searchPlaceholder} value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} />
            </div>
          )}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>{actions}</div>
        </div>
      )}

      <div style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              {selectable && (
                <th style={{ width: 40 }}>
                  <input type="checkbox" checked={selected.size === paged.length && paged.length > 0} onChange={toggleAll} />
                </th>
              )}
              {columns.map((col) => (
                <th key={col.key} style={{ width: col.width, cursor: col.sortable ? 'pointer' : undefined }} onClick={() => col.sortable && toggleSort(col.key)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    {col.header}
                    {col.sortable && sortKey === col.key && (sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <tr><td colSpan={columns.length + (selectable ? 1 : 0)} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>{emptyMessage}</td></tr>
            ) : (
              paged.map((item) => {
                const id = String(item[keyField]);
                return (
                  <tr key={id} className={selected.has(id) ? 'selected' : ''} onClick={() => onRowClick?.(item)} style={{ cursor: onRowClick ? 'pointer' : undefined }}>
                    {selectable && (
                      <td onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox" checked={selected.has(id)} onChange={() => toggleSelect(id)} />
                      </td>
                    )}
                    {columns.map((col) => (
                      <td key={col.key}>{col.render ? col.render(item) : String(item[col.key] ?? '')}</td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderTop: '1px solid var(--border)', fontSize: 13, color: 'var(--text-secondary)' }}>
          <span>{filtered.length} results</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button className="btn btn-ghost btn-sm" disabled={page === 0} onClick={() => setPage(page - 1)}><ChevronLeft size={14} /></button>
            <span>Page {page + 1} of {totalPages}</span>
            <button className="btn btn-ghost btn-sm" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}><ChevronRight size={14} /></button>
          </div>
        </div>
      )}
    </div>
  );
}
