import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Settings, User, Palette, Bell, Shield, Globe } from 'lucide-react';

export function SettingsPage() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 720 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Settings size={22} /> Settings
        </h1>
        <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0', fontSize: 13 }}>
          Manage your account and application preferences
        </p>
      </div>

      <div className="card">
        <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
          <User size={16} /> Profile
        </h3>
        <div style={{ display: 'grid', gap: 12 }}>
          {[
            { label: 'Name', value: user?.displayName || 'Not set' },
            { label: 'Email', value: user?.email || 'Not set' },
            { label: 'Role', value: user?.role || 'Admin' },
          ].map(({ label, value }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{label}</span>
              <span style={{ fontSize: 14, fontWeight: 500 }}>{value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Palette size={16} /> Appearance
        </h3>
        <div style={{ display: 'flex', gap: 12 }}>
          {(['light', 'dark', 'system'] as const).map((t) => (
            <button
              key={t}
              className={`btn ${theme === t ? 'btn-primary' : ''}`}
              onClick={() => setTheme(t)}
              style={{ textTransform: 'capitalize', flex: 1 }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Bell size={16} /> Notifications
        </h3>
        <div style={{ display: 'grid', gap: 12 }}>
          {[
            { label: 'Device compliance alerts', desc: 'Get notified when devices fall out of compliance' },
            { label: 'Tenant health warnings', desc: 'Alerts when tenant health scores drop' },
            { label: 'Security incidents', desc: 'Immediate notification for security events' },
          ].map(({ label, desc }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{label}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{desc}</div>
              </div>
              <input type="checkbox" defaultChecked />
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Shield size={16} /> Security
        </h3>
        <div style={{ display: 'grid', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>Session Timeout</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Automatically sign out after inactivity</div>
            </div>
            <select className="input" style={{ width: 120 }} defaultValue="30">
              <option value="15">15 minutes</option>
              <option value="30">30 minutes</option>
              <option value="60">1 hour</option>
              <option value="120">2 hours</option>
            </select>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Globe size={16} /> Data & Privacy
        </h3>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
          Manage your data in compliance with GDPR regulations.
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-sm">Export My Data</button>
          <button className="btn btn-sm" style={{ color: 'var(--danger)' }}>Delete My Data</button>
        </div>
      </div>
    </div>
  );
}
