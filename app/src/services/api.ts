import type { User, Tenant, ConsentRecord, GdprExport, PaginatedResponse, AuditEntry, SecurityAlert } from '@/types';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

class ApiClient {
  private token: string | null = null;

  setToken(token: string) {
    this.token = token;
  }

  clearToken() {
    this.token = null;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> ?? {}),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
      throw new ApiError('Unauthorized', 401);
    }

    if (response.status === 403) {
      throw new ApiError('Forbidden', 403);
    }

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new ApiError(body.error || `Request failed (${response.status})`, response.status);
    }

    if (response.status === 204) return undefined as T;
    return response.json();
  }

  get<T>(path: string) {
    return this.request<T>(path);
  }

  post<T>(path: string, body?: unknown) {
    return this.request<T>(path, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  put<T>(path: string, body?: unknown) {
    return this.request<T>(path, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  del<T>(path: string) {
    return this.request<T>(path, { method: 'DELETE' });
  }

  // === Auth ===
  auth = {
    login: () => this.get<{ authUrl: string }>('/v1/auth/login'),
    callback: (code: string, state?: string) =>
      this.post<{ token: string; user: User }>('/v1/auth/callback', { code, state }),
    me: () => this.get<{ user: User; tenantCount: number }>('/v1/auth/me'),
    logout: () => this.post<void>('/v1/auth/logout'),
  };

  // === Tenants ===
  tenants = {
    list: () => this.get<{ tenants: Tenant[] }>('/v1/tenants'),
    connect: (data: { tenantId: string; displayName: string; domain: string }) =>
      this.post<{ tenant: Tenant; consentUrl: string }>('/v1/tenants/connect', data),
    disconnect: (id: string) => this.del<void>(`/v1/tenants/${id}`),
  };

  // === Graph Proxy ===
  graph = {
    get: <T>(tenantId: string, path: string) =>
      this.get<T>(`/v1/graph/${tenantId}/${path}`),
    post: <T>(tenantId: string, path: string, body?: unknown) =>
      this.post<T>(`/v1/graph/${tenantId}/${path}`, body),
  };

  // === GDPR ===
  gdpr = {
    getConsent: () => this.get<{ consents: ConsentRecord[] }>('/v1/gdpr/consent'),
    recordConsent: (data: { categories: string[]; version: string }) =>
      this.post<void>('/v1/gdpr/consent', data),
    exportData: () => this.get<GdprExport>('/v1/gdpr/export'),
    requestDeletion: () => this.del<{ deletionDate: string }>('/v1/gdpr/delete'),
    getPolicy: () => this.get<Record<string, unknown>>('/v1/gdpr/policy'),
  };

  // === Security ===
  security = {
    getEvents: (params?: { type?: string; page?: number; pageSize?: number }) => {
      const qs = new URLSearchParams();
      if (params?.type) qs.set('type', params.type);
      if (params?.page) qs.set('page', String(params.page));
      if (params?.pageSize) qs.set('pageSize', String(params.pageSize));
      const query = qs.toString();
      return this.get<PaginatedResponse<AuditEntry>>(`/v1/security/events${query ? `?${query}` : ''}`);
    },
    getAlerts: (params?: { severity?: string; status?: string }) => {
      const qs = new URLSearchParams();
      if (params?.severity) qs.set('severity', params.severity);
      if (params?.status) qs.set('status', params.status);
      const query = qs.toString();
      return this.get<{ alerts: SecurityAlert[] }>(`/v1/security/alerts${query ? `?${query}` : ''}`);
    },
    createAlert: (data: Partial<SecurityAlert>) =>
      this.post<{ alert: SecurityAlert }>('/v1/security/alerts', data),
  };

  // === Health ===
  health = {
    check: () => this.get<{ status: string; checks: Record<string, string> }>('/v1/health'),
  };
}

export const api = new ApiClient();
