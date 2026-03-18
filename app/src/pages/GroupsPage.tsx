import { useMemo } from 'react';
import { useTenants } from '@/hooks/useTenants';
import { useAllGroups } from '@/hooks/useGroups';
import { useAppStore } from '@/stores/appStore';
import { DataTable, type Column } from '@/components/ui/DataTable';
import type { Group } from '@/types';
import { FolderTree, Users, Shield, Lock } from 'lucide-react';

export function GroupsPage() {
  const { data: tenants = [] } = useTenants();
  const selectedTenantId = useAppStore((s) => s.selectedTenantId);

  const tenantIds = useMemo(() => {
    if (selectedTenantId) return [selectedTenantId];
    return tenants.map((t) => t.id);
  }, [tenants, selectedTenantId]);

  const { data: groups = [], isLoading } = useAllGroups(tenantIds);

  const columns: Column<Group>[] = [
    {
      key: 'displayName', header: 'Group Name', sortable: true,
      render: (g) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <FolderTree size={14} style={{ color: 'var(--primary)' }} />
          <span style={{ fontWeight: 500 }}>{g.displayName}</span>
        </div>
      ),
    },
    { key: 'description', header: 'Description', sortable: true },
    {
      key: 'groupTypes', header: 'Type', sortable: true,
      render: (g) => {
        const types = g.groupTypes || [];
        if (types.includes('DynamicMembership')) return <span className="badge"><Shield size={10} /> Dynamic</span>;
        if (types.includes('Unified')) return <span className="badge badge-info"><Users size={10} /> M365</span>;
        return <span className="badge"><Lock size={10} /> Security</span>;
      },
    },
    {
      key: 'membershipRule', header: 'Membership', sortable: false,
      render: (g) => g.membershipRule
        ? <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{g.membershipRule.slice(0, 50)}{g.membershipRule.length > 50 ? '...' : ''}</span>
        : <span style={{ color: 'var(--text-muted)' }}>Assigned</span>,
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <FolderTree size={22} /> Groups
        </h1>
        <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0', fontSize: 13 }}>
          {groups.length} groups across {tenantIds.length} tenant{tenantIds.length !== 1 ? 's' : ''}
        </p>
      </div>

      <DataTable<Group>
        data={groups}
        columns={columns}
        keyField="id"
        searchable
        searchPlaceholder="Search groups..."
        loading={isLoading}
        emptyMessage="No groups found"
      />
    </div>
  );
}
