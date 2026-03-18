import { useParams, useNavigate } from 'react-router-dom';
import { useDevice, useDeviceAction } from '@/hooks/useDevices';
import { useAppStore } from '@/stores/appStore';
import type { DeviceActionType } from '@/types';
import {
  ArrowLeft, RefreshCw, RotateCcw, Lock, Trash2, Key,
  Monitor, User, Shield, Calendar, Wifi, HardDrive,
} from 'lucide-react';

export function DeviceDetailPage() {
  const { tenantId, deviceId } = useParams<{ tenantId: string; deviceId: string }>();
  const navigate = useNavigate();
  const addToast = useAppStore((s) => s.addToast);
  const { data: device, isLoading } = useDevice(tenantId!, deviceId!);
  const action = useDeviceAction();

  const doAction = (type: DeviceActionType) => {
    if (!tenantId || !deviceId) return;
    action.mutate(
      { tenantId, deviceId, action: type as DeviceActionType },
      {
        onSuccess: () => addToast({ type: 'success', message: `${type} sent successfully` }),
        onError: () => addToast({ type: 'error', message: `Failed to send ${type}` }),
      }
    );
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="skeleton" style={{ height: 32, width: 200, borderRadius: 6 }} />
        <div className="skeleton" style={{ height: 300, borderRadius: 8 }} />
      </div>
    );
  }

  if (!device) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <h2>Device not found</h2>
        <button className="btn btn-primary" onClick={() => navigate('/devices')}>Back to Devices</button>
      </div>
    );
  }

  const info = [
    { icon: Monitor, label: 'Device Name', value: device.deviceName },
    { icon: User, label: 'User', value: device.userPrincipalName || 'Unassigned' },
    { icon: HardDrive, label: 'OS', value: `${device.operatingSystem} ${device.osVersion || ''}` },
    { icon: Shield, label: 'Compliance', value: device.complianceState },
    { icon: Calendar, label: 'Enrolled', value: device.enrolledDateTime ? new Date(device.enrolledDateTime).toLocaleDateString() : 'Unknown' },
    { icon: Wifi, label: 'Last Sync', value: device.lastSyncDateTime ? new Date(device.lastSyncDateTime).toLocaleString() : 'Never' },
    { icon: Monitor, label: 'Model', value: device.model || 'Unknown' },
    { icon: Monitor, label: 'Manufacturer', value: device.manufacturer || 'Unknown' },
    { icon: HardDrive, label: 'Serial', value: device.serialNumber || 'N/A' },
    { icon: Shield, label: 'Management Agent', value: device.managementAgent || 'Unknown' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/devices')}>
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>{device.deviceName}</h1>
          <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: 13 }}>{device.operatingSystem} &middot; {device.userPrincipalName}</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {([
          { type: 'syncDevice' as DeviceActionType, icon: RefreshCw, label: 'Sync', variant: '' },
          { type: 'rebootNow' as DeviceActionType, icon: RotateCcw, label: 'Restart', variant: '' },
          { type: 'remoteLock' as DeviceActionType, icon: Lock, label: 'Lock', variant: '' },
          { type: 'resetPasscode' as DeviceActionType, icon: Key, label: 'Reset Passcode', variant: '' },
          { type: 'retire' as DeviceActionType, icon: Trash2, label: 'Retire', variant: 'color: var(--warning)' },
          { type: 'wipe' as DeviceActionType, icon: Trash2, label: 'Wipe', variant: 'color: var(--danger)' },
        ]).map(({ type, icon: Icon, label, variant }) => (
          <button
            key={type}
            className="btn btn-sm"
            style={variant ? { color: variant.split(': ')[1] } : undefined}
            onClick={() => doAction(type)}
            disabled={action.isPending}
          >
            <Icon size={13} /> {label}
          </button>
        ))}
      </div>

      <div className="card">
        <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600 }}>Device Information</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
          {info.map(({ icon: Icon, label, value }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              <Icon size={15} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{value}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
