# Architecture & Technology Stack

> MSP Device Manager — Multi-tenant M365 Device Management Platform
> Document Version: 1.0 | Last Updated: 2026-03-17 | Classification: Internal

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Architecture Diagram](#2-architecture-diagram)
3. [Frontend Architecture](#3-frontend-architecture)
4. [Backend Architecture](#4-backend-architecture)
5. [Data Storage](#5-data-storage)
6. [Authentication & Authorization](#6-authentication--authorization)
7. [Network Security](#7-network-security)
8. [External Dependencies](#8-external-dependencies)
9. [CI/CD Pipeline](#9-cicd-pipeline)
10. [Technology Stack Summary](#10-technology-stack-summary)

---

## 1. System Overview

MSP Device Manager is a multi-tenant SaaS platform designed for Managed Service Providers (MSPs) to manage Microsoft 365 devices across multiple customer tenants. The platform leverages Microsoft's Granular Delegated Admin Privileges (GDAP) to provide secure, scoped access to customer Intune environments.

### Key Capabilities

- **Multi-Tenant Device Management** — View, manage, and remediate devices across all customer tenants from a single pane of glass
- **Compliance Monitoring** — Track device compliance status, policy drift, and configuration baselines
- **Automated Actions** — Bulk device operations (sync, restart, wipe, retire) with audit trails
- **Executive Reporting** — KPI dashboards, trend analysis, and exportable client reports
- **GDAP Integration** — Secure partner access via Microsoft's delegated administration model

### Deployment Model

| Component | Hosting | Tier |
|-----------|---------|------|
| Frontend SPA | Azure Static Web Apps | Free |
| Backend API | Azure Functions (Consumption) | Pay-per-execution |
| Database | Azure Cosmos DB (Serverless) | Pay-per-request |
| Secrets | Azure Key Vault (Standard) | Pay-per-operation |
| Monitoring | Application Insights + Log Analytics | Pay-as-you-go |
| CI/CD | GitHub Actions | Free (public repo) |

---

## 2. Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                          USER'S BROWSER                             │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  SPA (index.html + 60+ JS modules + CSS + Service Worker)    │  │
│  │  MSAL.js 2.38.3 │ Sanitizer │ Router │ State Management     │  │
│  └──────────────────────────┬────────────────────────────────────┘  │
│                             │ HTTPS                                  │
└─────────────────────────────┼───────────────────────────────────────┘
                              │
                    ┌─────────▼─────────┐
                    │  Azure Static Web  │
                    │  Apps (CDN + WAF)  │
                    │  ─────────────────  │
                    │  TLS 1.2+ │ HSTS   │
                    └─────────┬─────────┘
                              │
              ┌───────────────▼───────────────┐
              │     Azure Functions v4 API     │
              │  ┌──────────────────────────┐  │
              │  │  Middleware Pipeline      │  │
              │  │  ┌────────────────────┐  │  │
              │  │  │ Security Headers   │  │  │
              │  │  │ CORS Validation    │  │  │
              │  │  │ Rate Limiting      │  │  │
              │  │  │ JWT Authentication │  │  │
              │  │  │ Session Validation │  │  │
              │  │  │ Input Validation   │  │  │
              │  │  └────────────────────┘  │  │
              │  └──────────────────────────┘  │
              │                                │
              │  Routes: auth, tenants, graph,  │
              │  gdpr, security, health         │
              └──┬────────┬────────┬───────────┘
                 │        │        │
       ┌─────────▼──┐ ┌──▼─────┐ ┌▼──────────────┐
       │ Cosmos DB   │ │Key     │ │ Microsoft      │
       │ (Serverless)│ │Vault   │ │ Graph API      │
       │             │ │        │ │                │
       │ customers   │ │Refresh │ │ /deviceMgmt   │
       │ tenants     │ │Tokens  │ │ /users         │
       │ sessions    │ │        │ │ /groups        │
       │ auditLog    │ │Soft    │ │ /policies      │
       │ consents    │ │Delete  │ │                │
       │ secAlerts   │ │Purge   │ │ Per-tenant     │
       │             │ │Protect │ │ GDAP tokens    │
       └─────────────┘ └────────┘ └───────┬────────┘
                                          │
                                ┌─────────▼─────────┐
                                │  Azure Active      │
                                │  Directory          │
                                │  ──────────────────  │
                                │  Multi-tenant OIDC  │
                                │  GDAP Delegation    │
                                │  JWKS Validation    │
                                └─────────────────────┘
```

---

## 3. Frontend Architecture

### Technology

- **Framework**: Vanilla JavaScript (no build system, no bundler)
- **Pattern**: Global object modules (e.g., `Graph`, `AppState`, `Devices`, `Router`)
- **Routing**: Hash-based SPA routing (`/#/dashboard`, `/#/devices`, etc.)
- **Styling**: CSS custom properties design system with 4 stylesheets
- **Authentication**: MSAL.js 2.38.3 (Microsoft Authentication Library for browsers)

### Module Organization (60+ modules)

| Category | Modules | Purpose |
|----------|---------|---------|
| Core | auth, authAdapter, state, graph, router, errorhandler, pwa, sanitizer | Foundation services |
| Device Management | devices, devicecompare, devicetags, autopilot, compliance, configurations | Intune device operations |
| Dashboard | dashboard, dashboardcustomizer, dashboardwidgets, executivedash, syncdash | KPIs and visualizations |
| Tenants | tenants, groups, tenantgroups, comparison | Multi-tenant management |
| Security | auditlog, alerts, healthchecks, incidentresponse, security, sessiontimeout | Monitoring and response |
| Users | users, usercreation, onboarding, offboarding, useronboarding | User lifecycle |
| Policies | policywizard, policydrift, baselines, conditionalaccess, rbac | Policy management |
| Reports | reports, charts, trendcharts, mfareport, clientreports, scorecard | Analytics and exports |
| UI Framework | formvalidation, confirm, bulkprogress, commandpalette, globalsearch, skeletons | Shared components |
| Features | changelog, whatsnew, setupwizard, helptooltips, notificationrules, savedviews | Platform features |
| Integrations | psalinks, webhooks, i18n, licensing, sponsor | External integrations |

### Security Controls (Frontend)

| Control | Implementation |
|---------|---------------|
| XSS Prevention | `Sanitizer.js` — DOMParser-based HTML sanitizer with tag/attribute allowlisting |
| Content Security Policy | Meta tag restricting script-src, connect-src, frame-src |
| Offline Security | Service Worker with cache-first (static) and network-first (API) strategies |
| Input Escaping | `Sanitizer.text()`, `Sanitizer.attr()`, `Sanitizer.url()` utilities |
| Safe HTML Injection | `Sanitizer.setInnerHTML()` wrapper for all dynamic content |

### Content Security Policy

```
default-src 'self';
script-src 'self' 'unsafe-inline' 'unsafe-eval' cdn.jsdelivr.net;
style-src 'self' 'unsafe-inline' fonts.googleapis.com;
font-src 'self' fonts.gstatic.com;
connect-src 'self' graph.microsoft.com login.microsoftonline.com
            *.sharepoint.com *.azurewebsites.net *.azurestaticapps.net;
img-src 'self' data: blob:;
frame-src 'none';
base-uri 'self';
form-action 'self';
upgrade-insecure-requests;
```

> **Note**: `unsafe-inline` and `unsafe-eval` are required for MSAL.js compatibility. MSAL.js uses inline scripts and eval for token processing. This is a known Microsoft requirement documented in the [MSAL.js CSP guide](https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-browser/docs/content-security-policy.md).

---

## 4. Backend Architecture

### Runtime

- **Platform**: Azure Functions v4 (Programming Model v4)
- **Runtime**: Node.js 18 LTS
- **Hosting**: Consumption plan (serverless, auto-scaling 0–200 instances)

### Project Structure

```
api/
├── package.json              # Dependencies and scripts
├── host.json                 # Functions runtime config (CORS, route prefix)
├── local.settings.json       # Local development variables (gitignored)
├── config/
│   └── constants.js          # Graph URLs, scopes, token expiry buffer
└── src/
    ├── index.js              # HTTP trigger registration (entry point)
    ├── middleware/
    │   ├── auth.js           # JWT validation via JWKS (RS256)
    │   ├── rateLimit.js      # Sliding window rate limiter
    │   ├── securityHeaders.js # HSTS, nosniff, DENY, referrer, permissions
    │   ├── session.js        # Idle timeout, concurrent limits, IP binding
    │   └── validation.js     # Graph path allowlist, body sanitization
    ├── models/
    │   ├── auditEntry.js     # Audit log CRUD (90-day TTL)
    │   ├── customer.js       # Customer CRUD + findOrCreate
    │   ├── session.js        # Session CRUD (24h TTL)
    │   └── tenant.js         # Tenant connection CRUD
    ├── routes/
    │   ├── auth.js           # Login, callback, me, logout
    │   ├── gdpr.js           # Consent, export, delete, policy
    │   ├── graph.js          # Graph API proxy with validation
    │   ├── health.js         # Health check (Cosmos + Key Vault)
    │   ├── securityEvents.js # Security event queries and alerts
    │   └── tenants.js        # Tenant connect, list, disconnect
    └── services/
        ├── authService.js    # MSAL ConfidentialClientApplication
        ├── cosmosService.js  # Cosmos DB singleton with retry logic
        └── keyVaultService.js # Key Vault client with 5-min cache
```

### Middleware Pipeline (applied in order)

```
Request → Security Headers → CORS → Rate Limiting → JWT Auth → Session Validation → Input Validation → Route Handler → Response
```

| Middleware | Purpose | Applied To |
|-----------|---------|-----------|
| Security Headers | HSTS, nosniff, DENY, referrer, permissions, no-cache | All responses |
| CORS | Origin allowlisting, credentials, preflight | All requests |
| Rate Limiting | Sliding window per IP | All endpoints (3 tiers) |
| JWT Authentication | Azure AD JWKS validation, RS256 | Protected endpoints |
| Session Validation | TTL, idle timeout, concurrent limits | Protected endpoints |
| Input Validation | Path allowlisting, body sanitization, GUID check | Graph proxy, mutations |

---

## 5. Data Storage

### Azure Cosmos DB (Serverless)

| Container | Partition Key | TTL | Purpose |
|-----------|--------------|-----|---------|
| `customers` | `/id` | None | Customer accounts (MSP users) |
| `tenants` | `/customerId` | None | Connected M365 tenant records |
| `sessions` | `/userId` | 24 hours | Authentication sessions |
| `auditLog` | `/customerId` | 90 days | Action audit trail |
| `consents` | `/customerId` | None | GDPR consent records |
| `securityAlerts` | `/customerId` | 180 days | Security event alerts |

**Configuration:**
- Consistency Level: Session (read-your-writes within session)
- Indexing: Automatic (all properties indexed)
- Encryption at Rest: Azure-managed keys (AES-256)
- Backup: Continuous (point-in-time restore, 30-day window)
- Capacity: Serverless (auto-scales RU/s per request)

### Azure Key Vault (Standard)

- **Purpose**: Secure storage for OAuth refresh tokens
- **Soft Delete**: Enabled (90-day retention)
- **Purge Protection**: Enabled (prevents permanent deletion)
- **Access**: Managed identity only (Function App's system-assigned identity)
- **Operations**: get, set, delete, list (secrets only)
- **Caching**: 5-minute in-memory cache to reduce API calls

### Browser localStorage (Frontend Only)

- UI preferences (theme, language, layout)
- Saved views and filter presets
- Dashboard widget configuration
- Trend chart snapshots (anonymized)
- **No sensitive data stored in localStorage in production**

---

## 6. Authentication & Authorization

### Authentication Flow

```
1. User clicks "Sign In"
2. Frontend redirects to Azure AD (/authorize)
3. User authenticates with their organization's Azure AD
4. Azure AD redirects back with authorization code
5. Backend exchanges code for tokens (MSAL ConfidentialClient)
6. Refresh token stored in Key Vault
7. Session created in Cosmos DB (24h TTL)
8. Session token returned to frontend
9. Subsequent requests include Bearer token
10. Backend validates JWT + session on each request
```

### Authorization Model

| Layer | Mechanism | Scope |
|-------|-----------|-------|
| Identity | Azure AD OIDC (multi-tenant) | User authentication |
| API Access | JWT Bearer token (RS256 via JWKS) | API endpoint access |
| Session | Cosmos DB session with TTL + idle timeout | Active session management |
| Tenant Access | GDAP delegation + customer-tenant mapping | Per-tenant data access |
| Feature Access | RBAC module (page-level permissions) | UI feature gating |
| Data Isolation | Cosmos DB partition key (customerId) | Cross-customer prevention |

### Session Security

| Control | Value | Purpose |
|---------|-------|---------|
| Session TTL | 24 hours | Maximum session lifetime |
| Idle Timeout | 30 minutes | Inactivity-based expiry |
| Concurrent Sessions | Max 3 per user | Limit session sprawl |
| IP Binding | Warning on change | Detect session theft |
| User-Agent Binding | Warning on change | Detect session theft |
| Token Storage | Cosmos DB (server-side) | No tokens in browser |
| Refresh Tokens | Key Vault (encrypted) | Secure long-term storage |

---

## 7. Network Security

### Transport Layer

- **TLS 1.2+** enforced by Azure (all services)
- **HSTS** header: `max-age=31536000; includeSubDomains`
- **CSP** `upgrade-insecure-requests` directive

### Security Headers

| Header | Value | Purpose |
|--------|-------|---------|
| Strict-Transport-Security | max-age=31536000; includeSubDomains | Force HTTPS |
| X-Content-Type-Options | nosniff | Prevent MIME sniffing |
| X-Frame-Options | DENY | Prevent clickjacking |
| Referrer-Policy | strict-origin-when-cross-origin | Limit referrer leakage |
| Permissions-Policy | camera=(), microphone=(), geolocation=(), payment=() | Disable browser features |
| Cache-Control | no-store, no-cache, must-revalidate | Prevent response caching |
| X-Permitted-Cross-Domain-Policies | none | Block cross-domain policies |

### Rate Limiting

| Tier | Limit | Endpoints |
|------|-------|-----------|
| Auth | 10 req/min per IP | /auth/login, /auth/callback, /auth/logout |
| Graph | 60 req/min per IP | /graph/{tenantId}/* |
| General | 100 req/min per IP | All other endpoints |

### CORS Configuration

- **Allowed Origins**: `http://localhost:4280`, `https://{github-pages-url}`
- **Allowed Methods**: GET, POST, PUT, DELETE, OPTIONS
- **Credentials**: true
- **Preflight**: OPTIONS returns 204

---

## 8. External Dependencies

### CDN-Delivered Libraries

| Library | Version | Source | License | Purpose |
|---------|---------|--------|---------|---------|
| MSAL.js Browser | 2.38.3 | cdn.jsdelivr.net | MIT | Azure AD authentication |
| Chart.js | Latest | cdn.jsdelivr.net | MIT | Data visualization |
| Inter Font | Latest | fonts.googleapis.com | OFL 1.1 | UI typography |

### Backend npm Dependencies

| Package | Version | Publisher | License | Purpose |
|---------|---------|-----------|---------|---------|
| @azure/cosmos | ^4.0.0 | Microsoft | MIT | Cosmos DB client |
| @azure/identity | ^4.0.0 | Microsoft | MIT | Azure credential management |
| @azure/keyvault-secrets | ^4.8.0 | Microsoft | MIT | Key Vault secret operations |
| @azure/functions | ^4.5.0 | Microsoft | MIT | Functions runtime |
| @azure/msal-node | ^2.6.0 | Microsoft | MIT | Server-side MSAL |
| jsonwebtoken | ^9.0.0 | Auth0/Okta | MIT | JWT creation/verification |
| jwks-rsa | ^3.1.0 | Auth0/Okta | MIT | JWKS key retrieval |

> All production dependencies are from Microsoft or Auth0/Okta — enterprise-grade publishers with active security response teams. All licenses are MIT (permissive).

---

## 9. CI/CD Pipeline

### GitHub Actions Workflows

**Security Scan** (`.github/workflows/security-scan.yml`):

| Job | Tool | Purpose |
|-----|------|---------|
| security-audit | npm audit + audit-ci | Dependency vulnerability scanning (fails on high/critical) |
| codeql | GitHub CodeQL | Static Application Security Testing (SAST) for JavaScript |
| secrets-scan | TruffleHog | Secret detection in git history |

**Dependabot** (`.github/dependabot.yml`):
- Ecosystem: npm (api/ directory)
- Schedule: Weekly (Monday)
- Max PRs: 10
- Labels: dependencies, security

### Deployment Pipeline

```
git push → GitHub Actions → Security Scan → Azure Static Web Apps Build → Deploy
                                                    │
                                          ┌─────────┴─────────┐
                                          │  Frontend (SPA)    │
                                          │  Backend (api/)    │
                                          └────────────────────┘
```

---

## 10. Technology Stack Summary

| Layer | Technology | Version | Purpose | Publisher |
|-------|-----------|---------|---------|-----------|
| **Frontend** | HTML5/CSS3/ES2020 | — | Single-page application | — |
| **Auth (Browser)** | MSAL.js | 2.38.3 | Azure AD authentication | Microsoft |
| **Charts** | Chart.js | Latest | Data visualization | Open Source |
| **PWA** | Service Worker API | — | Offline support, caching | Web Standard |
| **Backend Runtime** | Node.js | 18 LTS | API server runtime | OpenJS Foundation |
| **Backend Framework** | Azure Functions | v4 | Serverless compute | Microsoft |
| **Auth (Server)** | MSAL Node | ^2.6.0 | OIDC confidential client | Microsoft |
| **JWT** | jsonwebtoken + jwks-rsa | ^9.0.0 / ^3.1.0 | Token validation | Auth0/Okta |
| **Database** | Azure Cosmos DB | Serverless | Document storage | Microsoft |
| **Secrets** | Azure Key Vault | Standard | Token/secret storage | Microsoft |
| **Identity** | Azure Active Directory | — | Multi-tenant OIDC/GDAP | Microsoft |
| **Device API** | Microsoft Graph | v1.0/beta | Intune management | Microsoft |
| **Hosting** | Azure Static Web Apps | Free | Frontend + API hosting | Microsoft |
| **IaC** | Bicep | Latest | Infrastructure as Code | Microsoft |
| **CI/CD** | GitHub Actions | — | Build, test, deploy | GitHub/Microsoft |
| **SAST** | CodeQL | — | Static security analysis | GitHub/Microsoft |
| **SCA** | Dependabot + npm audit | — | Dependency scanning | GitHub/npm |
| **Secrets Scan** | TruffleHog | — | Secret detection | Truffle Security |

---

## Appendix A: Compliance Alignment

| Requirement | Architecture Decision |
|-------------|----------------------|
| Data Residency | Azure region configurable (default: uksouth) |
| Encryption in Transit | TLS 1.2+ (Azure enforced) |
| Encryption at Rest | AES-256 (Azure-managed keys) |
| Data Isolation | Cosmos DB partition keys per customer |
| Audit Trail | 90-day audit log with TTL auto-purge |
| Secret Management | Key Vault with managed identity access |
| Access Control | Azure AD SSO + RBAC + Session management |
| Vulnerability Scanning | CodeQL SAST + npm audit + TruffleHog |
| Infrastructure Reproducibility | Bicep IaC in version control |
| Incident Detection | Security alerts API + Application Insights |

---

*Document maintained by: MSP Device Manager Engineering Team*
*Review cycle: Quarterly or after significant architecture changes*
