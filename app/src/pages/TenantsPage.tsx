import { useState } from 'react';
import { useTenants, useConnectTenant, useDisconnectTenant } from '@/hooks/useTenants';
import { useAppStore } from '@/stores/appStore';
import { Modal } from '@/components/ui/Modal';
import {
  Building2, Plus, Trash2, CheckCircle, XCircle,
  ExternalLink, Shield, Monitor, Users,
} from 'lucide-react';

export function TenantsPage() {
  const { data: tenants = [], isLoading } = useTenants();
  const connect = useConnectTenant();
  const disconnect = useDisconnectTenant();
  const addToast = useAppStore((s) => s.addToast);
  const [connectOpen, setConnectOpen] = useState(false);
  const [disconnectId, setDisconnectId] = useState<string | null>(null);

  const handleConnect = () => {
    connect.mutate({ tenantId: '', displayName: '', domain: '' }, {
      onSuccess: () => { addToast({ type: 'success', message: 'Tenant connected' }); setConnectOpen(false); },
      onError: () => addToast({ type: 'error', message: 'Failed to connect tenant' }),
    });
  };

  const handleDisconnect = () => {
    if (!disconnectId) return;
    disconnect.mutate(disconnectId, {
      onSuccess: () => { addToast({ type: 'success', message: 'Tenant disconnected' }); setDisconnectId(null); },
      onError: () => addToast({ type: 'error', message: 'Failed to disconnect tenant' }),
    });
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="skeleton" style={{ height: 32, width: 200, borderRadius: 6 }} />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton" style={{ height: 100, borderRadius: 8 }} />
        ))}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Building2 size={22} /> Tenants
          </h1>
          <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0', fontSize: 13 }}>
            {tenants.length} connected tenant{tenants.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setConnectOpen(true)}>
          <Plus size={16} /> Connect Tenant
        </button>
      </div>

      {tenants.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 60 }}>
          <Building2 size={40} style={{ color: 'var(--text-muted)', marginBottom: 12 }} />
          <h3 style={{ margin: '0 0 8px' }}>No tenants connected</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>Connect your first customer tenant to get started.</p>
          <button className="btn btn-primary" onClick={() => setConnectOpen(true)}>
            <Plus size={16} /> Connect Tenant
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
          {tenants.map((tenant) => (
            <div key={tenant.id} className="card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>{tenant.displayName}</h3>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>{tenant.id}</p>
                </div>
                {tenant.isActive !== false ? (
                  <span className="badge badge-success"><CheckCircle size={10} /> Active</span>
                ) : (
                  <span className="badge badge-danger"><XCircle size={10} /> Inactive</span>
                )}
              </div>
              <div style={{ display: 'flex', gap: 16, marginBottom: 12, fontSize: 13 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-secondary)' }}>
                  <Monitor size={13} /> {tenant.deviceCount ?? '—'} devices
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-secondary)' }}>
                  <Users size={13} /> {tenant.userCount ?? '—'} users
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-secondary)' }}>
                  <Shield size={13} /> GDAP
                </span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <a
                  href={`https://portal.azure.com/${tenant.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-sm btn-ghost"
                >
                  <ExternalLink size={13} /> Azure Portal
                </a>
                <button
                  className="btn btn-sm btn-ghost"
                  style={{ color: 'var(--danger)', marginLeft: 'auto' }}
                  onClick={() => setDisconnectId(tenant.id)}
                >
                  <Trash2 size={13} /> Disconnect
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={connectOpen} onClose={() => setConnectOpen(false)} title="Connect Tenant">
        <p style={{ marginBottom: 16 }}>This will initiate a GDAP consent flow to connect a new customer tenant.</p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn" onClick={() => setConnectOpen(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleConnect} disabled={connect.isPending}>
            {connect.isPending ? 'Connecting...' : 'Start GDAP Consent'}
          </button>
        </div>
      </Modal>

      <Modal open={!!disconnectId} onClose={() => setDisconnectId(null)} title="Disconnect Tenant">
        <p>Are you sure you want to disconnect this tenant? You will lose access to their devices and users.</p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
          <button className="btn" onClick={() => setDisconnectId(null)}>Cancel</button>
          <button className="btn btn-danger" onClick={handleDisconnect} disabled={disconnect.isPending}>
            {disconnect.isPending ? 'Disconnecting...' : 'Disconnect'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
