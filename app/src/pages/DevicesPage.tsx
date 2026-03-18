import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTenants } from '@/hooks/useTenants';
import { useDevices, useDeviceAction, useDeviceStats } from '@/hooks/useDevices';
import { useAppStore } from '@/stores/appStore';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Modal';
import type { Device, DeviceActionType } from '@/types';
import {
  Monitor, RefreshCw, RotateCcw, Trash2, Lock, Smartphone,
  Laptop, Server, CheckCircle, XCircle, Clock, AlertTriangle,
} from 'lucide-react';

const osIcon = (os: string) => {
  const l = os?.toLowerCase() || '';
  if (l.includes('windows')) return <Laptop size={14} />;
  if (l.includes('ios') || l.includes('android')) return <Smartphone size={14} />;
  if (l.includes('mac')) return <Laptop size={14} />;
  return <Server size={14} />;
};

const complianceBadge = (state: string) => {
  if (state === 'compliant') return <span className="badge badge-success"><CheckCircle size={10} /> Compliant</span>;
  if (state === 'noncompliant') return <span className="badge badge-danger"><XCircle size={10} /> Non-Compliant</span>;
  return <span className="badge badge-warning"><AlertTriangle size={10} /> Unknown</span>;
};

export function DevicesPage() {
  const navigate = useNavigate();
  const { data: tenants = [] } = useTenants();
  const selectedTenantId = useAppStore((s) => s.selectedTenantId);
  const addToast = useAppStore((s) => s.addToast);

  const tenantIds = useMemo(() => {
    if (selectedTenantId) return [selectedTenantId];
    return tenants.map((t) => t.id);
  }, [tenants, selectedTenantId]);

  const { data: devices = [], isLoading } = useDevices(tenantIds);
  const stats = useDeviceStats(devices);
  const action = useDeviceAction();

  const [selectedDevices, setSelectedDevices] = useState<Device[]>([]);
  const [actionModal, setActionModal] = useState<{ type: DeviceActionType; devices: Device[] } | null>(null);

  const executeAction = () => {
    if (!actionModal) return;
    actionModal.devices.forEach((d) => {
      const tid = d.tenantId;
      if (tid && d.id) {
        action.mutate(
          { tenantId: tid, deviceId: d.id, action: actionModal.type },
          {
            onSuccess: () => addToast({ type: 'success', message: `${actionModal.type} sent to ${d.deviceName}` }),
            onError: () => addToast({ type: 'error', message: `Failed to ${actionModal.type} ${d.deviceName}` }),
          }
        );
      }
    });
    setActionModal(null);
    setSelectedDevices([]);
  };

  const columns: Column<Device>[] = [
    {
      key: 'deviceName', header: 'Device', sortable: true, width: '220px',
      render: (d) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {osIcon(d.operatingSystem)} <span style={{ fontWeight: 500 }}>{d.deviceName}</span>
        </div>
      ),
    },
    { key: 'userPrincipalName', header: 'User', sortable: true },
    {
      key: 'operatingSystem', header: 'OS', sortable: true,
      render: (d) => <span>{d.operatingSystem} {d.osVersion}</span>,
    },
    {
      key: 'complianceState', header: 'Compliance', sortable: true,
      render: (d) => complianceBadge(d.complianceState),
    },
    {
      key: 'lastSyncDateTime', header: 'Last Sync', sortable: true,
      render: (d) => {
        if (!d.lastSyncDateTime) return <span style={{ color: 'var(--text-muted)' }}>Never</span>;
        const date = new Date(d.lastSyncDateTime);
        const days = Math.floor((Date.now() - date.getTime()) / 86400000);
        return (
          <span style={{ color: days > 30 ? 'var(--warning)' : undefined }}>
            {days > 30 && <Clock size={12} style={{ marginRight: 4 }} />}
            {date.toLocaleDateString()}
          </span>
        );
      },
    },
  ];

  const bulkActions = selectedDevices.length > 0 ? (
    <div style={{ display: 'flex', gap: 6 }}>
      <button className="btn btn-sm" onClick={() => setActionModal({ type: 'syncDevice', devices: selectedDevices })}>
        <RefreshCw size={13} /> Sync
      </button>
      <button className="btn btn-sm" onClick={() => setActionModal({ type: 'rebootNow', devices: selectedDevices })}>
        <RotateCcw size={13} /> Restart
      </button>
      <button className="btn btn-sm" style={{ color: 'var(--warning)' }} onClick={() => setActionModal({ type: 'remoteLock', devices: selectedDevices })}>
        <Lock size={13} /> Lock
      </button>
      <button className="btn btn-sm" style={{ color: 'var(--danger)' }} onClick={() => setActionModal({ type: 'wipe', devices: selectedDevices })}>
        <Trash2 size={13} /> Wipe
      </button>
    </div>
  ) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Monitor size={22} /> Devices
          </h1>
          <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0', fontSize: 13 }}>
            {stats.total} devices across {tenantIds.length} tenant{tenantIds.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
        {[
          { label: 'Total', value: stats.total, color: 'var(--primary)' },
          { label: 'Compliant', value: stats.compliant, color: 'var(--success)' },
          { label: 'Non-Compliant', value: stats.nonCompliant, color: 'var(--danger)' },
          { label: 'Stale (30d)', value: stats.stale, color: 'var(--warning)' },
          { label: 'Compliance %', value: `${stats.complianceRate}%`, color: stats.complianceRate >= 90 ? 'var(--success)' : 'var(--warning)' },
        ].map(({ label, value, color }) => (
          <div key={label} className="kpi-card" style={{ padding: '12px 16px' }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color }}>{value}</div>
          </div>
        ))}
      </div>

      <DataTable<Device>
        data={devices}
        columns={columns}
        keyField="id"
        searchable
        searchPlaceholder="Search devices, users, OS..."
        selectable
        onSelectionChange={setSelectedDevices}
        onRowClick={(d) => {
          const tid = d.tenantId;
          if (tid) navigate(`/devices/${tid}/${d.id}`);
        }}
        loading={isLoading}
        emptyMessage="No devices found. Connect a tenant to get started."
        actions={bulkActions}
      />

      {actionModal && (
        <Modal
          open
          onClose={() => setActionModal(null)}
          title={`Confirm ${actionModal.type}`}
          footer={
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn" onClick={() => setActionModal(null)}>Cancel</button>
              <button
                className={`btn ${actionModal.type === 'wipe' ? 'btn-danger' : 'btn-primary'}`}
                onClick={executeAction}
              >
                Confirm {actionModal.type} ({actionModal.devices.length} device{actionModal.devices.length !== 1 ? 's' : ''})
              </button>
            </div>
          }
        >
          <p>Are you sure you want to <strong>{actionModal.type}</strong> {actionModal.devices.length} device{actionModal.devices.length !== 1 ? 's' : ''}?</p>
          {actionModal.type === 'wipe' && (
            <div className="badge badge-danger" style={{ padding: '8px 12px', fontSize: 13 }}>
              <AlertTriangle size={14} /> This action will erase all data on the selected devices.
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
