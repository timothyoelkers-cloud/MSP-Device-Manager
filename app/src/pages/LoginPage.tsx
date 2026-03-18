import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Shield, Monitor, Building2, Zap } from 'lucide-react';

export function LoginPage() {
  const { isAuthenticated, isLoading, login } = useAuth();

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-secondary)', padding: 24 }}>
      <div style={{ maxWidth: 440, width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <Shield size={32} style={{ color: 'var(--primary)' }} />
            <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>MSP Device Manager</h1>
          </div>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Multi-tenant M365 device management for MSPs</p>
        </div>

        <div className="card" style={{ padding: 32 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 24, textAlign: 'center' }}>Sign in to continue</h2>

          <button
            className="btn btn-primary"
            style={{ width: '100%', padding: '12px 20px', fontSize: 15 }}
            onClick={login}
            disabled={isLoading}
          >
            {isLoading ? 'Signing in...' : 'Sign in with Microsoft'}
          </button>

          <div style={{ marginTop: 32, display: 'grid', gap: 16 }}>
            {[
              { icon: Monitor, title: 'Device Management', desc: 'Manage Intune devices across all tenants' },
              { icon: Building2, title: 'Multi-Tenant', desc: 'GDAP-based access to customer environments' },
              { icon: Zap, title: 'Fast & Efficient', desc: 'No rate limiting — instant operations' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <Icon size={18} style={{ color: 'var(--primary)', marginTop: 2, flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: 500, fontSize: 13 }}>{title}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', marginTop: 16 }}>
          Protected by Azure AD &middot; Enterprise SSO
        </p>
      </div>
    </div>
  );
}
