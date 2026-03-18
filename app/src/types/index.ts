// === Auth & User ===
export interface User {
  id: string;
  name: string;
  displayName?: string;
  email: string;
  organization: string;
  azureAdOid: string;
  plan: 'free' | 'pro' | 'enterprise';
  role?: string;
  settings: UserSettings;
  createdAt: string;
}

export interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  language: 'en' | 'de' | 'fr' | 'es';
  dashboardLayout: string[];
  notificationsEnabled: boolean;
}

export interface Session {
  token: string;
  userId: string;
  expiresAt: string;
  createdAt: string;
}

// === Tenants ===
export interface Tenant {
  id: string;
  tenantId: string;
  customerId: string;
  displayName: string;
  domain: string;
  status: 'active' | 'disconnected' | 'error';
  isActive?: boolean;
  lastSync: string | null;
  deviceCount: number;
  userCount?: number;
  complianceRate: number;
  createdAt: string;
}

export interface TenantHealth {
  tenantId: string;
  displayName: string;
  status: 'healthy' | 'warning' | 'critical';
  deviceCount: number;
  compliantDevices: number;
  nonCompliantDevices: number;
  staleDevices: number;
  lastSync: string;
}

// === Devices ===
export interface Device {
  id: string;
  deviceName: string;
  managementState: string;
  managementAgent?: string;
  operatingSystem: string;
  osVersion: string;
  complianceState: 'compliant' | 'noncompliant' | 'unknown' | 'notApplicable';
  userDisplayName: string;
  userPrincipalName: string;
  lastSyncDateTime: string;
  enrolledDateTime: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  totalStorageSpaceInBytes: number;
  freeStorageSpaceInBytes: number;
  managedDeviceOwnerType: 'company' | 'personal';
  tenantId: string;
  tenantName: string;
  [key: string]: unknown;
}

export type DeviceActionType = 'syncDevice' | 'rebootNow' | 'wipe' | 'retire' | 'delete' | 'resetPasscode' | 'remoteLock';

export interface DeviceFilter {
  search: string;
  tenantId: string;
  complianceState: string;
  operatingSystem: string;
  managementState: string;
}

// === Compliance ===
export interface CompliancePolicy {
  id: string;
  displayName: string;
  description: string;
  platform: string;
  tenantId: string;
  assignedCount: number;
  compliantCount: number;
  nonCompliantCount: number;
}

// === Users (Graph) ===
export interface GraphUser {
  id: string;
  displayName: string;
  userPrincipalName: string;
  mail: string;
  department: string;
  jobTitle: string;
  accountEnabled: boolean;
  assignedLicenses: GraphLicense[];
  tenantId: string;
  [key: string]: unknown;
}

export interface GraphLicense {
  skuId: string;
  skuPartNumber: string;
  friendlyName?: string;
}

// === Groups ===
export interface Group {
  id: string;
  displayName: string;
  description: string;
  memberCount: number;
  groupTypes: string[];
  membershipRule?: string;
  tenantId: string;
  [key: string]: unknown;
}

// === Audit & Security ===
export interface AuditEntry {
  id: string;
  customerId: string;
  userId: string;
  userPrincipalName?: string;
  action: string;
  activityType?: string;
  activityDateTime: string;
  activityResult?: string;
  details: string;
  tenantId?: string;
  ipAddress: string;
  timestamp: string;
  [key: string]: unknown;
}

export interface SecurityAlert {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  status: 'open' | 'acknowledged' | 'resolved';
  createdAt: string;
}

// === Licensing / Billing ===
export interface PricingTier {
  id: 'free' | 'pro' | 'enterprise';
  name: string;
  pricePerTenant: number;
  currency: 'GBP';
  features: string[];
  maxTenants: number | null;
  supportLevel: string;
}

// === Dashboard ===
export interface DashboardStats {
  totalDevices: number;
  compliantDevices: number;
  nonCompliantDevices: number;
  totalTenants: number;
  totalUsers: number;
  staleDevices: number;
  complianceRate: number;
  syncHealth: number;
}

export interface TrendDataPoint {
  date: string;
  value: number;
  label?: string;
}

// === API Response Types ===
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface GraphResponse<T> {
  value: T[];
  '@odata.count'?: number;
  '@odata.nextLink'?: string;
}

// === GDPR ===
export interface ConsentRecord {
  categories: string[];
  version: string;
  timestamp: string;
}

export interface GdprExport {
  exportDate: string;
  dataSubject: User;
  connectedTenants: Tenant[];
  activeSessions: Session[];
  auditLog: AuditEntry[];
  consentRecords: ConsentRecord[];
}

// === Notifications ===
export interface AppNotification {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

export interface Toast {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  message: string;
  duration?: number;
}

// === SLA ===
export interface SlaDefinition {
  tenantId: string;
  complianceTarget: number;
  syncFrequencyHours: number;
  maxStaleDeviceDays: number;
}
