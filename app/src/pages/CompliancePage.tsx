import { useMemo } from 'react';
import { useTenants } from '@/hooks/useTenants';
import { useDevices, useDeviceStats } from '@/hooks/useDevices';
import { useAppStore } from '@/stores/appStore';
import {
  Shield, CheckCircle, XCircle, AlertTriangle, Monitor,
} from 'lucide-react';
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from 'recharts';

const COLORS = { compliant: '#22c55e', noncompliant: '#ef4444', unknown: '#f59e0b' };

export function CompliancePage() {
  const { data: tenants = [] } = useTenants();
  const selectedTenantId = useAppStore((s) => s.selectedTenantId);
  const tenantIds = useMemo(() => selectedTenantId ? [selectedTenantId] : tenants.map((t) => t.id), [tenants, selectedTenantId]);
  const { data: devices = [], isLoading } = useDevices(tenantIds);
  const stats = useDeviceStats(devices);

  const pieData = [
    { name: 'Compliant', value: stats.compliant, fill: COLORS.compliant },
    { name: 'Non-Compliant', value: stats.nonCompliant, fill: COLORS.noncompliant },
    { name: 'Unknown', value: stats.total - stats.compliant - stats.nonCompliant, fill: COLORS.unknown },
  ].filter((d) => d.value > 0);

  const osCounts = useMemo(() => {
    const map: Record<string, { compliant: number; noncompliant: number }> = {};
    devices.forEach((d) => {
      const os = d.operatingSystem || 'Unknown';
      if (!map[os]) map[os] = { compliant: 0, noncompliant: 0 };
      if (d.complianceState === 'compliant') map[os].compliant++;
      else map[os].noncompliant++;
    });
    return Object.entries(map).map(([os, c]) => ({ os, ...c })).sort((a, b) => (b.compliant + b.noncompliant) - (a.compliant + a.noncompliant));
  }, [devices]);

  const nonCompliant = useMemo(() => devices.filter((d) => d.complianceState === 'noncompliant'), [devices]);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="skeleton" style={{ height: 32, width: 200, borderRadius: 6 }} />
        <div className="skeleton" style={{ height: 300, borderRadius: 8 }} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Shield size={22} /> Compliance
        </h1>
        <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0', fontSize: 13 }}>
          Device compliance overview across {tenantIds.length} tenant{tenantIds.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="kpi-grid">
        {[
          { icon: Monitor, label: 'Total Devices', value: stats.total, color: 'var(--primary)' },
          { icon: CheckCircle, label: 'Compliant', value: stats.compliant, color: 'var(--success)' },
          { icon: XCircle, label: 'Non-Compliant', value: stats.nonCompliant, color: 'var(--danger)' },
          { icon: Shield, label: 'Compliance Rate', value: `${stats.complianceRate}%`, color: stats.complianceRate >= 90 ? 'var(--success)' : 'var(--warning)' },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="kpi-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Icon size={18} style={{ color }} />
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{label}</span>
            </div>
            <div style={{ fontSize: 28, fontWeight: 700 }}>{value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 20 }}>
        <div className="card">
          <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600 }}>Overall Compliance</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" paddingAngle={3}>
                  {pieData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>No data</div>
          )}
        </div>

        <div className="card">
          <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600 }}>Compliance by OS</h3>
          {osCounts.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={osCounts}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="os" fontSize={11} tick={{ fill: 'var(--text-secondary)' }} />
                <YAxis fontSize={11} tick={{ fill: 'var(--text-secondary)' }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="compliant" fill={COLORS.compliant} name="Compliant" radius={[4, 4, 0, 0]} />
                <Bar dataKey="noncompliant" fill={COLORS.noncompliant} name="Non-Compliant" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>No data</div>
          )}
        </div>
      </div>

      {nonCompliant.length > 0 && (
        <div className="card">
          <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600 }}>
            <AlertTriangle size={16} style={{ color: 'var(--danger)', marginRight: 6 }} />
            Non-Compliant Devices ({nonCompliant.length})
          </h3>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Device</th>
                  <th>User</th>
                  <th>OS</th>
                  <th>Last Sync</th>
                </tr>
              </thead>
              <tbody>
                {nonCompliant.slice(0, 20).map((d) => (
                  <tr key={d.id}>
                    <td style={{ fontWeight: 500 }}>{d.deviceName}</td>
                    <td>{d.userPrincipalName || 'Unassigned'}</td>
                    <td>{d.operatingSystem}</td>
                    <td>{d.lastSyncDateTime ? new Date(d.lastSyncDateTime).toLocaleDateString() : 'Never'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {nonCompliant.length > 20 && (
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, margin: '12px 0 0' }}>
                Showing 20 of {nonCompliant.length} non-compliant devices
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
