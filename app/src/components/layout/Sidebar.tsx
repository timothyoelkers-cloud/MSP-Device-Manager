import { NavLink, useLocation } from 'react-router-dom';
import { useAppStore } from '@/stores/appStore';
import {
  LayoutDashboard, Monitor, Shield, Users, FolderTree, Building2,
  FileText, Settings, Bell, Webhook, BarChart3, TrendingUp,
  Clock, Heart, RefreshCw, AlertTriangle, ShieldAlert, StickyNote,
  BookmarkCheck, Download, FileCode, Plug, ChevronLeft, Laptop,
  UserCheck, CheckSquare, ClipboardList,
} from 'lucide-react';
import clsx from 'clsx';

const navGroups = [
  {
    label: 'Overview',
    items: [
      { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    ],
  },
  {
    label: 'Device Management',
    items: [
      { to: '/devices', icon: Monitor, label: 'Devices' },
      { to: '/autopilot', icon: Laptop, label: 'Autopilot' },
      { to: '/compliance', icon: CheckSquare, label: 'Compliance' },
      { to: '/configurations', icon: Settings, label: 'Configurations' },
    ],
  },
  {
    label: 'Identity',
    items: [
      { to: '/users', icon: Users, label: 'Users' },
      { to: '/groups', icon: FolderTree, label: 'Groups' },
    ],
  },
  {
    label: 'Multi-Tenant',
    items: [
      { to: '/tenants', icon: Building2, label: 'Tenants' },
      { to: '/sync-dashboard', icon: RefreshCw, label: 'Sync Dashboard' },
      { to: '/executive-dashboard', icon: BarChart3, label: 'Executive Dashboard' },
      { to: '/trend-charts', icon: TrendingUp, label: 'Trend Charts' },
      { to: '/sla-tracking', icon: Clock, label: 'SLA Tracking' },
      { to: '/health-summary', icon: Heart, label: 'Health Summary' },
    ],
  },
  {
    label: 'Security',
    items: [
      { to: '/audit-log', icon: FileText, label: 'Audit Log' },
      { to: '/alerts', icon: AlertTriangle, label: 'Alerts' },
      { to: '/incident-response', icon: ShieldAlert, label: 'Incident Response' },
      { to: '/security-events', icon: Shield, label: 'Security Events' },
    ],
  },
  {
    label: 'Reports',
    items: [
      { to: '/reports', icon: ClipboardList, label: 'Reports' },
      { to: '/scorecard', icon: UserCheck, label: 'Scorecard' },
    ],
  },
  {
    label: 'Tools',
    items: [
      { to: '/technician-notes', icon: StickyNote, label: 'Technician Notes' },
      { to: '/saved-views', icon: BookmarkCheck, label: 'Saved Views' },
      { to: '/export-center', icon: Download, label: 'Export Center' },
      { to: '/templates', icon: FileCode, label: 'Templates' },
    ],
  },
  {
    label: 'Settings',
    items: [
      { to: '/settings', icon: Settings, label: 'Settings' },
      { to: '/psa-integrations', icon: Plug, label: 'PSA Integrations' },
      { to: '/notification-rules', icon: Bell, label: 'Notification Rules' },
      { to: '/webhooks', icon: Webhook, label: 'Webhooks' },
    ],
  },
];

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useAppStore();
  const location = useLocation();

  return (
    <aside className={clsx('app-sidebar', sidebarCollapsed && 'collapsed')}>
      <div className="sidebar-logo">
        <div className="logo-icon">M</div>
        {!sidebarCollapsed && <span>MSP Device Manager</span>}
      </div>

      <nav className="sidebar-nav">
        {navGroups.map((group) => (
          <div key={group.label} className="nav-group">
            {!sidebarCollapsed && <div className="nav-group-label">{group.label}</div>}
            {group.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={clsx('nav-item', location.pathname === item.to && 'active')}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <item.icon />
                {!sidebarCollapsed && <span>{item.label}</span>}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <button className="nav-item" onClick={toggleSidebar} style={{ margin: '8px', borderBottom: 'none' }}>
        <ChevronLeft style={{ transform: sidebarCollapsed ? 'rotate(180deg)' : undefined, transition: 'transform 200ms' }} />
        {!sidebarCollapsed && <span>Collapse</span>}
      </button>
    </aside>
  );
}
