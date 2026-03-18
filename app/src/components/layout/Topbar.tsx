import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useAppStore } from '@/stores/appStore';
import { useTenants } from '@/hooks/useTenants';
import { Menu, Search, Sun, Moon, Bell, LogOut, User, Settings, ChevronDown } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export function Topbar() {
  const { user, logout } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();
  const { selectedTenantId, setSelectedTenant, openCommandPalette } = useAppStore();
  const notifications = useAppStore((s) => s.notifications);
  const unreadCount = notifications.filter((n) => !n.read).length;
  const { data: tenants } = useTenants();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setUserMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        openCommandPalette();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [openCommandPalette]);

  return (
    <header className="app-topbar">
      <button className="btn btn-ghost btn-sm" onClick={() => useAppStore.getState().toggleSidebar()} style={{ display: 'none' }}>
        <Menu size={18} />
      </button>

      {/* Tenant Selector */}
      <select
        className="input select"
        style={{ width: 220 }}
        value={selectedTenantId || ''}
        onChange={(e) => setSelectedTenant(e.target.value || null)}
      >
        <option value="">All Tenants</option>
        {tenants?.map((t) => (
          <option key={t.id} value={t.tenantId}>{t.displayName}</option>
        ))}
      </select>

      {/* Search Trigger */}
      <button className="btn btn-secondary btn-sm" onClick={openCommandPalette} style={{ marginLeft: 'auto', gap: 8 }}>
        <Search size={14} />
        <span>Search</span>
        <kbd style={{ fontSize: 10, opacity: 0.6, padding: '2px 4px', border: '1px solid var(--border)', borderRadius: 3 }}>Ctrl+K</kbd>
      </button>

      {/* Theme Toggle */}
      <button className="btn btn-ghost btn-sm" onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}>
        {resolvedTheme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      {/* Notifications */}
      <button className="btn btn-ghost btn-sm" style={{ position: 'relative' }} onClick={() => navigate('/alerts')}>
        <Bell size={18} />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: 0, right: 0, background: 'var(--danger)',
            color: 'white', borderRadius: 999, fontSize: 10, fontWeight: 700,
            width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* User Menu */}
      <div ref={menuRef} style={{ position: 'relative' }}>
        <button className="btn btn-ghost btn-sm" onClick={() => setUserMenuOpen(!userMenuOpen)} style={{ gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%', background: 'var(--primary)',
            color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 600,
          }}>
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <span className="text-sm">{user?.name || 'User'}</span>
          <ChevronDown size={14} />
        </button>

        {userMenuOpen && (
          <div style={{
            position: 'absolute', right: 0, top: '100%', marginTop: 4, width: 200,
            background: 'var(--bg-primary)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-lg)', padding: 4, zIndex: 50,
          }}>
            <button className="nav-item" style={{ width: '100%' }} onClick={() => { navigate('/settings'); setUserMenuOpen(false); }}>
              <User size={16} /> Profile
            </button>
            <button className="nav-item" style={{ width: '100%' }} onClick={() => { navigate('/settings'); setUserMenuOpen(false); }}>
              <Settings size={16} /> Settings
            </button>
            <div style={{ borderTop: '1px solid var(--border)', margin: '4px 0' }} />
            <button className="nav-item" style={{ width: '100%', color: 'var(--danger)' }} onClick={logout}>
              <LogOut size={16} /> Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
