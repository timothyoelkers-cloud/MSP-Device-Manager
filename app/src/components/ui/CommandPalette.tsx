import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/stores/appStore';
import {
  LayoutDashboard, Monitor, Building2, Users, FolderTree, Shield,
  Settings, FileText, BarChart3, TrendingUp, Search,
} from 'lucide-react';

const commands = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard', group: 'Navigation' },
  { id: 'devices', label: 'Devices', icon: Monitor, path: '/devices', group: 'Navigation' },
  { id: 'tenants', label: 'Tenants', icon: Building2, path: '/tenants', group: 'Navigation' },
  { id: 'users', label: 'Users', icon: Users, path: '/users', group: 'Navigation' },
  { id: 'groups', label: 'Groups', icon: FolderTree, path: '/groups', group: 'Navigation' },
  { id: 'compliance', label: 'Compliance', icon: Shield, path: '/compliance', group: 'Navigation' },
  { id: 'audit', label: 'Audit Log', icon: FileText, path: '/audit-log', group: 'Navigation' },
  { id: 'exec-dash', label: 'Executive Dashboard', icon: BarChart3, path: '/executive-dashboard', group: 'Navigation' },
  { id: 'trends', label: 'Trend Charts', icon: TrendingUp, path: '/trend-charts', group: 'Navigation' },
  { id: 'settings', label: 'Settings', icon: Settings, path: '/settings', group: 'Navigation' },
  { id: 'pricing', label: 'Pricing & Plans', icon: Settings, path: '/pricing', group: 'Navigation' },
];

export function CommandPalette() {
  const { commandPaletteOpen, closeCommandPalette } = useAppStore();
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const filtered = useMemo(() => {
    if (!query) return commands;
    const q = query.toLowerCase();
    return commands.filter((c) => c.label.toLowerCase().includes(q));
  }, [query]);

  useEffect(() => {
    if (commandPaletteOpen) {
      setQuery('');
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [commandPaletteOpen]);

  const execute = (index: number) => {
    const cmd = filtered[index];
    if (cmd?.path) navigate(cmd.path);
    closeCommandPalette();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex((i) => Math.min(i + 1, filtered.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); execute(activeIndex); }
    else if (e.key === 'Escape') { closeCommandPalette(); }
  };

  if (!commandPaletteOpen) return null;

  return (
    <div className="command-overlay" onClick={closeCommandPalette}>
      <div className="command-dialog" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '0 16px', borderBottom: '1px solid var(--border)' }}>
          <Search size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          <input
            ref={inputRef}
            className="command-input"
            placeholder="Search pages, actions..."
            value={query}
            onChange={(e) => { setQuery(e.target.value); setActiveIndex(0); }}
            onKeyDown={handleKeyDown}
          />
        </div>
        <div className="command-list">
          {filtered.length === 0 && (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>No results found</div>
          )}
          {filtered.map((cmd, i) => (
            <div
              key={cmd.id}
              className={`command-item ${i === activeIndex ? 'active' : ''}`}
              onClick={() => execute(i)}
              onMouseEnter={() => setActiveIndex(i)}
            >
              <cmd.icon size={16} />
              <span>{cmd.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
