import { useMemo } from 'react';
import { useTenants } from '@/hooks/useTenants';
import { useAllUsers } from '@/hooks/useUsers';
import { useAppStore } from '@/stores/appStore';
import { DataTable, type Column } from '@/components/ui/DataTable';
import type { GraphUser } from '@/types';
import { Users, CheckCircle, XCircle, Mail } from 'lucide-react';

export function UsersPage() {
  const { data: tenants = [] } = useTenants();
  const selectedTenantId = useAppStore((s) => s.selectedTenantId);

  const tenantIds = useMemo(() => {
    if (selectedTenantId) return [selectedTenantId];
    return tenants.map((t) => t.id);
  }, [tenants, selectedTenantId]);

  const { data: users = [], isLoading } = useAllUsers(tenantIds);

  const columns: Column<GraphUser>[] = [
    {
      key: 'displayName', header: 'Name', sortable: true,
      render: (u) => <span style={{ fontWeight: 500 }}>{u.displayName}</span>,
    },
    {
      key: 'userPrincipalName', header: 'Email', sortable: true,
      render: (u) => (
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Mail size={13} style={{ color: 'var(--text-muted)' }} /> {u.userPrincipalName}
        </span>
      ),
    },
    { key: 'jobTitle', header: 'Job Title', sortable: true },
    { key: 'department', header: 'Department', sortable: true },
    {
      key: 'accountEnabled', header: 'Status', sortable: true,
      render: (u) => u.accountEnabled !== false
        ? <span className="badge badge-success"><CheckCircle size={10} /> Enabled</span>
        : <span className="badge badge-danger"><XCircle size={10} /> Disabled</span>,
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Users size={22} /> Users
        </h1>
        <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0', fontSize: 13 }}>
          {users.length} users across {tenantIds.length} tenant{tenantIds.length !== 1 ? 's' : ''}
        </p>
      </div>

      <DataTable<GraphUser>
        data={users}
        columns={columns}
        keyField="id"
        searchable
        searchPlaceholder="Search users..."
        loading={isLoading}
        emptyMessage="No users found"
      />
    </div>
  );
}
