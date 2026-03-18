import { useState, useMemo } from 'react';
import { DataTable, type Column } from '@/components/ui/DataTable';
import type { AuditEntry } from '@/types';
import { FileText, User, Calendar, Filter } from 'lucide-react';

// Mock data — will be replaced with API calls
const mockAuditData: AuditEntry[] = [];

export function AuditLogPage() {
  const [typeFilter, setTypeFilter] = useState('all');

  const filtered = useMemo(() => {
    if (typeFilter === 'all') return mockAuditData;
    return mockAuditData.filter((e) => e.activityType === typeFilter);
  }, [typeFilter]);

  const columns: Column<AuditEntry>[] = [
    {
      key: 'activityDateTime', header: 'Date', sortable: true, width: '180px',
      render: (e) => (
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Calendar size={13} style={{ color: 'var(--text-muted)' }} />
          {new Date(e.activityDateTime).toLocaleString()}
        </span>
      ),
    },
    {
      key: 'userPrincipalName', header: 'User', sortable: true,
      render: (e) => (
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <User size={13} style={{ color: 'var(--text-muted)' }} />
          {e.userPrincipalName}
        </span>
      ),
    },
    { key: 'activityType', header: 'Action', sortable: true },
    { key: 'activityResult', header: 'Result', sortable: true,
      render: (e) => (
        <span className={`badge ${e.activityResult === 'success' ? 'badge-success' : 'badge-danger'}`}>
          {e.activityResult}
        </span>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <FileText size={22} /> Audit Log
        </h1>
        <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0', fontSize: 13 }}>
          Track all administrative actions and changes
        </p>
      </div>

      <DataTable<AuditEntry>
        data={filtered}
        columns={columns}
        keyField="id"
        searchable
        searchPlaceholder="Search audit entries..."
        emptyMessage="No audit entries found"
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Filter size={14} style={{ color: 'var(--text-muted)' }} />
            <select className="input" style={{ width: 160 }} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="all">All Actions</option>
              <option value="create">Create</option>
              <option value="update">Update</option>
              <option value="delete">Delete</option>
            </select>
          </div>
        }
      />
    </div>
  );
}
