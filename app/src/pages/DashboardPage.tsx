import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTenants } from '@/hooks/useTenants';
import { useDevices, useDeviceStats } from '@/hooks/useDevices';
import { useAllUsers } from '@/hooks/useUsers';
import { useAllGroups } from '@/hooks/useGroups';
import {
  Monitor, Building2, Users, Shield, AlertTriangle,
  CheckCircle, XCircle, Clock,
} from 'lucide-react';
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';

const COLORS = ['#22c55e', '#ef4444', '#f59e0b', '#6366f1'];

export function DashboardPage() {
  const { user } = useAuth();
  const { data: tenants = [], isLoading: tenantsLoading } = useTenants();
  const tenantIds = useMemo(() => tenants.map((t) => t.id), [tenants]);
  const { data: devices = [], isLoading: devicesLoading } = useDevices(tenantIds);
  const { data: users = [] } = useAllUsers(tenantIds);
  const { data: groups = [] } = useAllGroups(tenantIds);
  const stats = useDeviceStats(devices);

  const loading = tenantsLoading || devicesLoading;

  const complianceData = [
    { name: 'Compliant', value: stats.compliant, color: COLORS[0] },
    { name: 'Non-Compliant', value: stats.nonCompliant, color: COLORS[1] },
    { name: 'Stale', value: stats.stale, color: COLORS[2] },
  ].filter((d) => d.value > 0);

  const tenantDeviceCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    devices.forEach((d) => {
      const tid = d.tenantId || 'Unknown';
      counts[tid] = (counts[tid] || 0) + 1;
    });
    return tenants.slice(0, 10).map((t) => ({
      name: t.displayName.length > 15 ? t.displayName.slice(0, 15) + '...' : t.displayName,
      devices: counts[t.id] || 0,
    }));
  }, [devices, tenants]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 600, margin: 0 }}>
          Welcome back{user?.displayName ? `, ${user.displayName.split(' ')[0]}` : ''}
        </h1>
        <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0' }}>
          Here's an overview of your managed environment
        </p>
      </div>

      <div className="kpi-grid">
        {[
          { icon: Building2, label: 'Tenants', value: tenants.length, color: 'var(--primary)' },
          { icon: Monitor, label: 'Devices', value: stats.total, color: 'var(--info)' },
          { icon: Users, label: 'Users', value: users.length, color: 'var(--secondary)' },
          { icon: Shield, label: 'Compliance', value: `${stats.complianceRate}%`, color: stats.complianceRate >= 90 ? 'var(--success)' : 'var(--warning)' },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="kpi-card">
            {loading ? (
              <div className="skeleton" style={{ height: 60, borderRadius: 8 }} />
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <Icon size={18} style={{ color }} />
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{label}</span>
                </div>
                <div style={{ fontSize: 28, fontWeight: 700 }}>{value}</div>
              </>
            )}
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 20 }}>
        <div className="card">
          <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600 }}>Device Compliance</h3>
          {loading ? (
            <div className="skeleton" style={{ height: 200, borderRadius: 8 }} />
          ) : complianceData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={complianceData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3}>
                  {complianceData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              No device data available
            </div>
          )}
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            {[
              { icon: CheckCircle, label: 'Compliant', value: stats.compliant, color: '#22c55e' },
              { icon: XCircle, label: 'Non-Compliant', value: stats.nonCompliant, color: '#ef4444' },
              { icon: Clock, label: 'Stale', value: stats.stale, color: '#f59e0b' },
            ].map(({ icon: Icon, label, value, color }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                <Icon size={14} style={{ color }} />
                <span>{label}: <strong>{value}</strong></span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600 }}>Devices by Tenant</h3>
          {loading ? (
            <div className="skeleton" style={{ height: 260, borderRadius: 8 }} />
          ) : tenantDeviceCounts.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={tenantDeviceCounts}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" fontSize={11} tick={{ fill: 'var(--text-secondary)' }} />
                <YAxis fontSize={11} tick={{ fill: 'var(--text-secondary)' }} />
                <Tooltip />
                <Bar dataKey="devices" fill="var(--primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              No tenant data available
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600 }}>Quick Stats</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16 }}>
          {[
            { icon: AlertTriangle, label: 'Non-Compliant Devices', value: stats.nonCompliant, color: 'var(--danger)' },
            { icon: Clock, label: 'Stale Devices (30d)', value: stats.stale, color: 'var(--warning)' },
            { icon: Shield, label: 'Groups Managed', value: groups.length, color: 'var(--info)' },
            { icon: Building2, label: 'Active Tenants', value: tenants.filter((t) => t.isActive !== false).length, color: 'var(--success)' },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 12, borderRadius: 8, background: 'var(--bg-secondary)' }}>
              <Icon size={18} style={{ color, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 20, fontWeight: 600 }}>{value}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
