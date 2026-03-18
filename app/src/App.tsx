import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PublicClientApplication } from '@azure/msal-browser';
import { MsalProvider } from '@azure/msal-react';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AuthCallback } from '@/components/auth/AuthCallback';
import { AppLayout } from '@/components/layout/AppLayout';
import { LoginPage } from '@/pages/LoginPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { DevicesPage } from '@/pages/DevicesPage';
import { DeviceDetailPage } from '@/pages/DeviceDetailPage';
import { TenantsPage } from '@/pages/TenantsPage';
import { UsersPage } from '@/pages/UsersPage';
import { GroupsPage } from '@/pages/GroupsPage';
import { CompliancePage } from '@/pages/CompliancePage';
import { SettingsPage } from '@/pages/SettingsPage';
import { PricingPage } from '@/pages/PricingPage';
import { AuditLogPage } from '@/pages/AuditLogPage';
import { PlaceholderPage } from '@/pages/PlaceholderPage';
import {
  Laptop, Settings as SettingsIcon, RefreshCw, BarChart3, TrendingUp,
  Clock, Heart, AlertTriangle, ShieldAlert, Shield, ClipboardList,
  UserCheck, StickyNote, BookmarkCheck, Download, FileCode, Plug,
  Bell, Webhook,
} from 'lucide-react';

const msalConfig = {
  auth: {
    clientId: import.meta.env.VITE_AZURE_CLIENT_ID || '',
    authority: `https://login.microsoftonline.com/${import.meta.env.VITE_AZURE_TENANT_ID || 'common'}`,
    redirectUri: import.meta.env.VITE_REDIRECT_URI || window.location.origin,
    postLogoutRedirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: 'sessionStorage' as const,
    storeAuthStateInCookie: false,
  },
};

const msalInstance = new PublicClientApplication(msalConfig);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000,
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

export function App() {
  return (
    <MsalProvider instance={msalInstance}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/auth/callback" element={<AuthCallback />} />

                <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                  <Route index element={<Navigate to="/dashboard" replace />} />
                  <Route path="dashboard" element={<DashboardPage />} />

                  {/* Device Management */}
                  <Route path="devices" element={<DevicesPage />} />
                  <Route path="devices/:tenantId/:deviceId" element={<DeviceDetailPage />} />
                  <Route path="autopilot" element={<PlaceholderPage title="Autopilot" description="Manage Windows Autopilot device provisioning profiles and deployments." icon={Laptop} />} />
                  <Route path="compliance" element={<CompliancePage />} />
                  <Route path="configurations" element={<PlaceholderPage title="Configurations" description="Manage device configuration profiles across tenants." icon={SettingsIcon} />} />

                  {/* Identity */}
                  <Route path="users" element={<UsersPage />} />
                  <Route path="groups" element={<GroupsPage />} />

                  {/* Multi-Tenant */}
                  <Route path="tenants" element={<TenantsPage />} />
                  <Route path="sync-dashboard" element={<PlaceholderPage title="Sync Dashboard" description="Monitor data synchronisation status across all tenants." icon={RefreshCw} />} />
                  <Route path="executive-dashboard" element={<PlaceholderPage title="Executive Dashboard" description="High-level KPIs and metrics for leadership reporting." icon={BarChart3} />} />
                  <Route path="trend-charts" element={<PlaceholderPage title="Trend Charts" description="Visualise compliance and device health trends over time." icon={TrendingUp} />} />
                  <Route path="sla-tracking" element={<PlaceholderPage title="SLA Tracking" description="Track service level agreement compliance and response times." icon={Clock} />} />
                  <Route path="health-summary" element={<PlaceholderPage title="Health Summary" description="Tenant health scores and recommendations." icon={Heart} />} />

                  {/* Security */}
                  <Route path="audit-log" element={<AuditLogPage />} />
                  <Route path="alerts" element={<PlaceholderPage title="Alerts" description="Security alerts and threat detection across managed tenants." icon={AlertTriangle} />} />
                  <Route path="incident-response" element={<PlaceholderPage title="Incident Response" description="Manage and track security incident response workflows." icon={ShieldAlert} />} />
                  <Route path="security-events" element={<PlaceholderPage title="Security Events" description="View security events and sign-in logs." icon={Shield} />} />

                  {/* Reports */}
                  <Route path="reports" element={<PlaceholderPage title="Reports" description="Generate and schedule compliance and inventory reports." icon={ClipboardList} />} />
                  <Route path="scorecard" element={<PlaceholderPage title="Scorecard" description="Tenant comparison scoring and benchmarking." icon={UserCheck} />} />

                  {/* Tools */}
                  <Route path="technician-notes" element={<PlaceholderPage title="Technician Notes" description="Add and manage technical notes for devices and tenants." icon={StickyNote} />} />
                  <Route path="saved-views" element={<PlaceholderPage title="Saved Views" description="Save and share custom filtered views of your data." icon={BookmarkCheck} />} />
                  <Route path="export-center" element={<PlaceholderPage title="Export Center" description="Export data in CSV, Excel, and PDF formats." icon={Download} />} />
                  <Route path="templates" element={<PlaceholderPage title="Templates" description="Manage configuration templates for rapid deployment." icon={FileCode} />} />

                  {/* Settings */}
                  <Route path="settings" element={<SettingsPage />} />
                  <Route path="pricing" element={<PricingPage />} />
                  <Route path="psa-integrations" element={<PlaceholderPage title="PSA Integrations" description="Connect to ConnectWise, Datto, HaloPSA, and other PSA platforms." icon={Plug} />} />
                  <Route path="notification-rules" element={<PlaceholderPage title="Notification Rules" description="Configure alert rules and notification channels." icon={Bell} />} />
                  <Route path="webhooks" element={<PlaceholderPage title="Webhooks" description="Manage webhook endpoints for event-driven integrations." icon={Webhook} />} />

                  <Route path="*" element={<NotFoundPage />} />
                </Route>
              </Routes>
            </BrowserRouter>
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </MsalProvider>
  );
}
