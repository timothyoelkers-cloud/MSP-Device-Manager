# API Security Reference

> MSP Device Manager — API Endpoint Security Documentation
> Document Version: 1.0 | Last Updated: 2026-03-17 | Classification: Internal

---

## Table of Contents

1. [API Overview](#1-api-overview)
2. [Security Layers](#2-security-layers)
3. [Endpoint Reference](#3-endpoint-reference)
4. [Graph API Path Allowlist](#4-graph-api-path-allowlist)
5. [Authentication Flows](#5-authentication-flows)
6. [Error Handling](#6-error-handling)
7. [Security Testing Recommendations](#7-security-testing-recommendations)

---

## 1. API Overview

| Attribute | Detail |
|-----------|--------|
| **Runtime** | Azure Functions v4 (Node.js 18) |
| **Base URL** | `https://{functionapp}.azurewebsites.net/api` |
| **Response Format** | JSON (`application/json`) |
| **Authentication** | Bearer token (JWT from Azure AD) |
| **Rate Limiting** | Per-IP sliding window (3 tiers) |
| **CORS** | Restricted origins only |
| **TLS** | 1.2+ (Azure enforced) |

### Route Registration

All routes are registered in `api/src/index.js` via Azure Functions HTTP triggers:

| Route Group | Prefix | Handler |
|-------------|--------|---------|
| Authentication | `/api/auth/*` | `api/src/routes/auth.js` |
| Tenants | `/api/tenants/*` | `api/src/routes/tenants.js` |
| Graph Proxy | `/api/graph/*` | `api/src/routes/graph.js` |
| GDPR | `/api/gdpr/*` | `api/src/routes/gdpr.js` |
| Security | `/api/security/*` | `api/src/routes/securityEvents.js` |
| Health | `/api/health` | `api/src/routes/health.js` |

---

## 2. Security Layers

Every request passes through up to 7 security layers before reaching the route handler:

```
Request
  │
  ▼
┌─────────────────────────────┐
│ Layer 1: Transport Security │  TLS 1.2+ (Azure-enforced)
└─────────────┬───────────────┘
              ▼
┌─────────────────────────────┐
│ Layer 2: Security Headers   │  HSTS, nosniff, DENY, referrer, permissions, no-cache
└─────────────┬───────────────┘
              ▼
┌─────────────────────────────┐
│ Layer 3: CORS Validation    │  Origin allowlisting, credentials, preflight
└─────────────┬───────────────┘
              ▼
┌─────────────────────────────┐
│ Layer 4: Rate Limiting      │  Sliding window per IP (100/60/10 per min)
└─────────────┬───────────────┘
              ▼
┌─────────────────────────────┐
│ Layer 5: JWT Authentication │  Azure AD JWKS validation, RS256, issuer/audience
└─────────────┬───────────────┘
              ▼
┌─────────────────────────────┐
│ Layer 6: Session Validation │  TTL, idle timeout, concurrent limits, IP binding
└─────────────┬───────────────┘
              ▼
┌─────────────────────────────┐
│ Layer 7: Input Validation   │  Path allowlist, body sanitization, GUID check
└─────────────┬───────────────┘
              ▼
        Route Handler
```

### Layer 1: Transport Security

- TLS 1.2+ enforced at the Azure platform level (cannot be downgraded)
- Azure Functions only accept HTTPS connections
- HTTP requests are automatically redirected to HTTPS
- Certificate management handled by Azure (auto-renewal)

### Layer 2: Security Headers

Applied to **every response** via `securityHeaders.js` middleware:

| Header | Value | Purpose |
|--------|-------|---------|
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | Force HTTPS for 1 year |
| `X-Content-Type-Options` | `nosniff` | Prevent MIME-type sniffing |
| `X-Frame-Options` | `DENY` | Block all framing (clickjacking prevention) |
| `X-XSS-Protection` | `0` | Disable legacy XSS filter (can cause issues) |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Limit referrer information leakage |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), payment=()` | Disable unnecessary browser APIs |
| `Cache-Control` | `no-store, no-cache, must-revalidate` | Prevent response caching |
| `X-Permitted-Cross-Domain-Policies` | `none` | Block Adobe cross-domain policy files |

### Layer 3: CORS Validation

Configured in `securityHeaders.js` middleware:

| Setting | Value |
|---------|-------|
| Allowed Origins | `http://localhost:4280`, `https://{production-url}` |
| Allowed Methods | GET, POST, PUT, DELETE, OPTIONS |
| Allowed Headers | Content-Type, Authorization |
| Credentials | `true` |
| Preflight | OPTIONS → 204 No Content |
| Non-matching Origin | No CORS headers added (browser blocks request) |

**Security note**: Origins are checked against an explicit allowlist. Wildcard (`*`) is never used. Each origin must match exactly.

### Layer 4: Rate Limiting

Implemented in `rateLimit.js` middleware using a sliding window algorithm:

| Tier | Limit | Window | Applied To | Retry-After |
|------|-------|--------|-----------|-------------|
| **Auth** | 10 requests | 60 seconds | `/auth/login`, `/auth/callback`, `/auth/logout` | Yes |
| **Graph** | 60 requests | 60 seconds | `/graph/{tenantId}/*` | Yes |
| **General** | 100 requests | 60 seconds | All other endpoints | Yes |

**Response when exceeded**:
```json
HTTP 429 Too Many Requests
Retry-After: 45
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1711000000000

{
  "error": "Too Many Requests",
  "retryAfter": 45
}
```

**Client identification**: IP extracted from `X-Forwarded-For` (first entry) or `X-Real-IP` header. Falls back to socket remote address.

### Layer 5: JWT Authentication (`requireAuth` middleware)

| Setting | Value |
|---------|-------|
| Algorithm | RS256 (RSA + SHA-256) |
| JWKS Endpoint | `https://login.microsoftonline.com/common/discovery/v2.0/keys` |
| Key Caching | Enabled (jwks-rsa library) |
| Issuer Validation | Verified against Azure AD tenant |
| Audience Validation | Verified against application client ID |
| Clock Tolerance | 30 seconds |
| Token Source | `Authorization: Bearer {token}` header |

**Validation process**:
1. Extract Bearer token from Authorization header
2. Decode JWT header to get `kid` (key ID)
3. Fetch matching public key from Azure AD JWKS endpoint (cached)
4. Verify signature using RS256
5. Validate `iss` (issuer) matches Azure AD
6. Validate `aud` (audience) matches our app client ID
7. Check `exp` (expiry) with 30-second tolerance
8. Extract user claims (`oid`, `name`, `email`, `tid`)

**Failure responses**:
| Scenario | Status | Response |
|----------|--------|----------|
| Missing token | 401 | `{ "error": "Authentication required" }` |
| Invalid/expired token | 401 | `{ "error": "Invalid or expired token" }` |
| Wrong audience | 401 | `{ "error": "Invalid or expired token" }` |

### Layer 6: Session Validation (`requireSession` middleware)

| Setting | Value |
|---------|-------|
| Session Storage | Cosmos DB `sessions` container |
| Session TTL | 24 hours (absolute) |
| Idle Timeout | 30 minutes (configurable) |
| Concurrent Limit | Max 3 sessions per user |
| IP Binding | Warning logged on IP change (non-blocking) |
| User-Agent Binding | Warning logged on UA change (non-blocking) |
| Activity Tracking | `lastActivityAt` updated on each request |

**Session lifecycle**:
1. Created at login with `userId`, `ipAddress`, `userAgent`, `createdAt`, `expiresAt`
2. Each request: validate token exists in Cosmos DB, check expiry, check idle timeout
3. If idle timeout exceeded: session deleted, 401 returned
4. If concurrent limit exceeded: oldest session auto-revoked
5. At logout: all user sessions deleted

### Layer 7: Input Validation (`validation.js` middleware)

| Validation | Implementation |
|-----------|---------------|
| **Graph path allowlist** | 17 regex patterns matching valid Microsoft Graph paths |
| **OData params** | Only `$count`, `$filter`, `$select`, `$expand`, `$top`, `$skip`, `$orderby` |
| **Tenant ID** | GUID format: `/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i` |
| **Body size** | Maximum 1MB JSON payload |
| **Prototype pollution** | Strips `__proto__`, `constructor`, `prototype` keys recursively |
| **Required params** | Per-route required parameter enforcement |

---

## 3. Endpoint Reference

### 3.1 Authentication Endpoints

#### `GET /api/auth/login`

| Attribute | Detail |
|-----------|--------|
| **Authentication** | None (public) |
| **Rate Limiter** | Auth (10/min) |
| **Purpose** | Generate Azure AD authorization URL |
| **Query Params** | `state` (optional, passed through to callback) |
| **Response** | `{ "authUrl": "https://login.microsoftonline.com/..." }` |
| **Audit Logged** | Yes — `AUTH_LOGIN_INITIATED` |

#### `POST /api/auth/callback`

| Attribute | Detail |
|-----------|--------|
| **Authentication** | None (receives auth code from Azure AD) |
| **Rate Limiter** | Auth (10/min) |
| **Purpose** | Exchange authorization code for tokens, create session |
| **Body** | `{ "code": "...", "state": "..." }` |
| **Processing** | 1. Exchange code via MSAL 2. Store refresh token in Key Vault 3. Create/find customer in Cosmos DB 4. Create session (24h TTL, max 3 concurrent) |
| **Response** | `{ "token": "session-token", "user": { name, email, oid } }` |
| **Audit Logged** | Yes — `AUTH_LOGIN_SUCCESS` or `AUTH_LOGIN_FAILED` |

#### `GET /api/auth/me`

| Attribute | Detail |
|-----------|--------|
| **Authentication** | Required (Bearer token) |
| **Rate Limiter** | General (100/min) |
| **Purpose** | Return current user profile |
| **Response** | `{ "user": { id, name, email, organization, plan }, "tenantCount": N }` |
| **Audit Logged** | No |

#### `POST /api/auth/logout`

| Attribute | Detail |
|-----------|--------|
| **Authentication** | Required (Bearer token) |
| **Rate Limiter** | Auth (10/min) |
| **Purpose** | Revoke all user sessions |
| **Processing** | Deletes all sessions for user from Cosmos DB |
| **Response** | `{ "message": "Logged out successfully" }` |
| **Audit Logged** | Yes — `AUTH_LOGOUT` |

---

### 3.2 Tenant Management Endpoints

#### `GET /api/tenants`

| Attribute | Detail |
|-----------|--------|
| **Authentication** | Required |
| **Rate Limiter** | General (100/min) |
| **Purpose** | List all connected tenants for current customer |
| **Response** | `{ "tenants": [{ id, tenantId, displayName, domain, status, lastSync }] }` |
| **Data Isolation** | Query filtered by `customerId` (from session) |
| **Audit Logged** | No |

#### `POST /api/tenants/connect`

| Attribute | Detail |
|-----------|--------|
| **Authentication** | Required |
| **Rate Limiter** | General (100/min) |
| **Input Validation** | Required: `tenantId` (GUID), `displayName`, `domain` |
| **Purpose** | Register a new tenant connection |
| **Processing** | 1. Validate tenant ID format 2. Check for duplicates 3. Create tenant record 4. Generate GDAP admin consent URL |
| **Response** | `{ "tenant": {...}, "consentUrl": "https://..." }` |
| **Audit Logged** | Yes — `TENANT_CONNECTED` |

#### `DELETE /api/tenants/{id}`

| Attribute | Detail |
|-----------|--------|
| **Authentication** | Required |
| **Rate Limiter** | General (100/min) |
| **Input Validation** | Path parameter `id` must be valid |
| **Purpose** | Disconnect a tenant |
| **Processing** | 1. Verify tenant belongs to current customer 2. Delete tenant record 3. Revoke stored tokens |
| **Response** | `{ "message": "Tenant disconnected" }` |
| **Audit Logged** | Yes — `TENANT_DISCONNECTED` |

---

### 3.3 Graph API Proxy Endpoints

#### `GET /api/graph/{tenantId}/*`

| Attribute | Detail |
|-----------|--------|
| **Authentication** | Required |
| **Rate Limiter** | Graph (60/min) |
| **Input Validation** | Tenant ID (GUID), Graph path (allowlist), OData params (allowlist) |
| **Purpose** | Proxy GET requests to Microsoft Graph API |
| **Processing** | 1. Validate tenant ID format 2. Verify tenant belongs to customer 3. Validate Graph path against allowlist 4. Acquire per-tenant token via MSAL 5. Call Graph API 6. Rewrite pagination links 7. Return response |
| **Retry Logic** | 3 attempts, exponential backoff, respects `Retry-After` header |
| **Response** | Proxied Graph API response (JSON) |
| **Audit Logged** | Yes — `GRAPH_API_CALL` with method, path, tenant |

#### `POST /api/graph/{tenantId}/*`

| Attribute | Detail |
|-----------|--------|
| **Authentication** | Required |
| **Rate Limiter** | Graph (60/min) |
| **Input Validation** | Tenant ID, Graph path, body sanitization (1MB max, prototype pollution prevention) |
| **Purpose** | Proxy POST requests to Microsoft Graph API (device actions, policy updates) |
| **Additional Security** | Request body sanitized before forwarding |
| **Response** | Proxied Graph API response (JSON) |
| **Audit Logged** | Yes — `GRAPH_API_CALL` with method, path, tenant, action context |

---

### 3.4 GDPR Endpoints

#### `GET /api/gdpr/consent`

| Attribute | Detail |
|-----------|--------|
| **Authentication** | Required |
| **Rate Limiter** | General (100/min) |
| **Purpose** | Retrieve current consent status |
| **Response** | `{ "consents": [{ categories, version, timestamp }] }` |

#### `POST /api/gdpr/consent`

| Attribute | Detail |
|-----------|--------|
| **Authentication** | Required |
| **Rate Limiter** | General (100/min) |
| **Body** | `{ "categories": [...], "version": "1.0" }` |
| **Purpose** | Record consent with full audit trail |
| **Stored Data** | Categories, version, timestamp, IP address, User-Agent |
| **Audit Logged** | Yes — `GDPR_CONSENT_RECORDED` |

#### `GET /api/gdpr/export`

| Attribute | Detail |
|-----------|--------|
| **Authentication** | Required |
| **Rate Limiter** | General (100/min) |
| **Purpose** | Export all personal data (GDPR Art. 15 / Art. 20) |
| **Response** | Complete JSON bundle of all user data |
| **Audit Logged** | Yes — `GDPR_DATA_EXPORT` |

#### `DELETE /api/gdpr/delete`

| Attribute | Detail |
|-----------|--------|
| **Authentication** | Required |
| **Rate Limiter** | General (100/min) |
| **Purpose** | Request account deletion (GDPR Art. 17) |
| **Processing** | 1. Flag account `deletionRequested: true` 2. Set 30-day grace period 3. Immediately purge all sessions |
| **Response** | `202 Accepted` with deletion date |
| **Audit Logged** | Yes — `GDPR_DELETION_REQUESTED` |

#### `GET /api/gdpr/policy`

| Attribute | Detail |
|-----------|--------|
| **Authentication** | None (public) |
| **Rate Limiter** | General (100/min) |
| **Purpose** | Return data processing summary |
| **Response** | Privacy policy JSON with categories, retention, third parties, rights |

---

### 3.5 Security Event Endpoints

#### `GET /api/security/events`

| Attribute | Detail |
|-----------|--------|
| **Authentication** | Required |
| **Rate Limiter** | General (100/min) |
| **Query Params** | `type` (filter), `page`, `pageSize` (max 100) |
| **Purpose** | Query audit log for security-relevant events |
| **Response** | `{ "events": [...], "total": N, "page": N }` |

#### `POST /api/security/alerts`

| Attribute | Detail |
|-----------|--------|
| **Authentication** | Required |
| **Rate Limiter** | General (100/min) |
| **Body** | `{ "type": "...", "severity": "low|medium|high|critical", "description": "..." }` |
| **Purpose** | Create a security alert |
| **Response** | `{ "alert": { id, type, severity, status, createdAt } }` |

#### `GET /api/security/alerts`

| Attribute | Detail |
|-----------|--------|
| **Authentication** | Required |
| **Rate Limiter** | General (100/min) |
| **Query Params** | `severity`, `status`, `page`, `pageSize` |
| **Purpose** | List security alerts |
| **Response** | `{ "alerts": [...], "total": N }` |

---

### 3.6 Health Endpoint

#### `GET /api/health`

| Attribute | Detail |
|-----------|--------|
| **Authentication** | None (public for monitoring tools) |
| **Rate Limiter** | General (100/min) |
| **Purpose** | System health check |
| **Checks** | Cosmos DB connectivity, Key Vault connectivity |
| **Response (healthy)** | `200 { "status": "healthy", "checks": { "cosmosDb": "ok", "keyVault": "ok" } }` |
| **Response (unhealthy)** | `503 { "status": "unhealthy", "checks": { ... } }` |

---

## 4. Graph API Path Allowlist

The following Microsoft Graph API paths are allowed through the proxy. All other paths are rejected with `400 Bad Request`.

| # | Pattern | Purpose | Example |
|---|---------|---------|---------|
| 1 | `/v1.0/deviceManagement/managedDevices` | List and manage Intune devices | Device inventory |
| 2 | `/v1.0/deviceManagement/managedDevices/{id}` | Single device operations | Device details, sync, wipe |
| 3 | `/v1.0/deviceManagement/deviceCompliancePolicies` | Compliance policy management | View/edit policies |
| 4 | `/v1.0/deviceManagement/deviceConfigurations` | Device configuration profiles | View/edit configurations |
| 5 | `/v1.0/deviceManagement/windowsAutopilotDeviceIdentities` | Autopilot device management | Register/deregister devices |
| 6 | `/v1.0/users` | User directory operations | List users, assignments |
| 7 | `/v1.0/users/{id}` | Single user operations | User details |
| 8 | `/v1.0/groups` | Group management | Security groups, device groups |
| 9 | `/v1.0/groups/{id}` | Single group operations | Group details, members |
| 10 | `/v1.0/devices` | Azure AD device objects | Directory devices |
| 11 | `/v1.0/subscribedSkus` | License subscription info | Available licenses |
| 12 | `/v1.0/organization` | Tenant organization info | Tenant details |
| 13 | `/beta/deviceManagement/managedDevices` | Beta device features | Extended device properties |
| 14 | `/beta/deviceManagement/reports` | Intune reporting | Compliance/config reports |
| 15 | `/v1.0/deviceManagement/deviceComplianceDeviceStatuses` | Compliance status per device | Compliance monitoring |
| 16 | `/v1.0/deviceManagement/deviceManagementScripts` | PowerShell script management | Script deployment |
| 17 | `/v1.0/deviceAppManagement/mobileApps` | App management | App deployment status |

**Why allowlisting matters**: Without path allowlisting, a compromised or malicious client could use the Graph proxy to access arbitrary Microsoft Graph endpoints (e.g., reading emails, accessing SharePoint files). The allowlist restricts proxy access to only Intune/device management endpoints.

---

## 5. Authentication Flows

### 5.1 SSO Login Flow

```
User          Browser           Azure Functions        Azure AD         Key Vault    Cosmos DB
 │               │                    │                    │                │            │
 │  Click Login  │                    │                    │                │            │
 │──────────────►│                    │                    │                │            │
 │               │  GET /auth/login   │                    │                │            │
 │               │───────────────────►│                    │                │            │
 │               │                    │  getAuthUrl()      │                │            │
 │               │                    │───────────────────►│                │            │
 │               │  authUrl           │  Authorization URL │                │            │
 │               │◄───────────────────│◄───────────────────│                │            │
 │               │                    │                    │                │            │
 │  Redirect     │  /authorize        │                    │                │            │
 │──────────────►│───────────────────────────────────────►│                │            │
 │               │                    │                    │                │            │
 │  Authenticate │  (org Azure AD)    │                    │                │            │
 │──────────────►│                    │                    │                │            │
 │               │                    │                    │                │            │
 │               │  Redirect + code   │                    │                │            │
 │               │◄──────────────────────────────────────│                │            │
 │               │                    │                    │                │            │
 │               │  POST /auth/callback│                   │                │            │
 │               │───────────────────►│                    │                │            │
 │               │                    │  Exchange code     │                │            │
 │               │                    │───────────────────►│                │            │
 │               │                    │  Tokens            │                │            │
 │               │                    │◄───────────────────│                │            │
 │               │                    │                    │                │            │
 │               │                    │  Store refresh     │                │            │
 │               │                    │───────────────────────────────────►│            │
 │               │                    │                    │                │            │
 │               │                    │  Create session    │                │            │
 │               │                    │──────────────────────────────────────────────►│
 │               │                    │                    │                │            │
 │               │  Session token     │                    │                │            │
 │               │◄───────────────────│                    │                │            │
 │               │                    │                    │                │            │
 │  Logged in    │                    │                    │                │            │
 │◄──────────────│                    │                    │                │            │
```

### 5.2 GDAP Tenant Access Flow

```
User          Azure Functions       Cosmos DB        Key Vault       Microsoft Graph
 │                  │                    │                │                │
 │  GET /graph/     │                    │                │                │
 │  {tenantId}/...  │                    │                │                │
 │─────────────────►│                    │                │                │
 │                  │                    │                │                │
 │                  │  Validate session  │                │                │
 │                  │───────────────────►│                │                │
 │                  │  Session valid     │                │                │
 │                  │◄───────────────────│                │                │
 │                  │                    │                │                │
 │                  │  Check tenant      │                │                │
 │                  │  belongs to user   │                │                │
 │                  │───────────────────►│                │                │
 │                  │  Tenant verified   │                │                │
 │                  │◄───────────────────│                │                │
 │                  │                    │                │                │
 │                  │  Get refresh token │                │                │
 │                  │───────────────────────────────────►│                │
 │                  │  Refresh token     │                │                │
 │                  │◄───────────────────────────────────│                │
 │                  │                    │                │                │
 │                  │  Acquire tenant    │                │                │
 │                  │  access token      │                │                │
 │                  │  (MSAL OBO/client) │                │                │
 │                  │                    │                │                │
 │                  │  GET /deviceManagement/...          │                │
 │                  │───────────────────────────────────────────────────►│
 │                  │                    │                │                │
 │                  │  Device data       │                │                │
 │                  │◄───────────────────────────────────────────────────│
 │                  │                    │                │                │
 │  Device data     │  Log audit entry   │                │                │
 │◄─────────────────│───────────────────►│                │                │
```

---

## 6. Error Handling

### 6.1 Error Response Format

All error responses follow a consistent JSON structure:

```json
{
  "error": "Human-readable error message",
  "details": "Additional context (optional, non-sensitive)"
}
```

**Security principle**: Error responses never include:
- Stack traces
- Internal file paths
- Database query details
- Token values
- Configuration details

### 6.2 HTTP Status Codes

| Code | Meaning | When Used |
|------|---------|-----------|
| 200 | Success | Successful GET requests |
| 201 | Created | Successful POST that creates a resource |
| 202 | Accepted | Deletion request accepted (async processing) |
| 204 | No Content | OPTIONS preflight, successful DELETE |
| 400 | Bad Request | Invalid input, failed validation |
| 401 | Unauthorized | Missing/invalid/expired token or session |
| 403 | Forbidden | Valid auth but insufficient permissions |
| 404 | Not Found | Resource does not exist |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Unhandled server error |
| 503 | Service Unavailable | Health check failed (degraded state) |

### 6.3 Frontend Error Handling

The frontend `ApiClient` handles error responses:

| Status | Frontend Action |
|--------|----------------|
| 401 | Redirect to login page |
| 403 | Toast notification ("Access denied") |
| 429 | Toast notification with retry suggestion |
| 5xx | Toast notification ("Server error, please try again") |

---

## 7. Security Testing Recommendations

### 7.1 Automated Testing (CI/CD)

| Tool | Type | Coverage |
|------|------|----------|
| npm audit / audit-ci | SCA | Dependency vulnerabilities |
| CodeQL | SAST | JavaScript code patterns |
| TruffleHog | Secrets | Leaked credentials in git |

### 7.2 Manual Testing Checklist

| Test | Tool | Target |
|------|------|--------|
| **Authentication bypass** | Burp Suite | All `/api/*` endpoints — test without token, with expired token, with forged token |
| **Session manipulation** | Burp Suite | Modify session token, test cross-user session access |
| **Rate limit verification** | curl / hey | Send 101+ requests in 60 seconds, verify 429 response |
| **CORS bypass** | curl | Send requests with unauthorized Origin header |
| **JWT manipulation** | jwt.io + Burp | Modify claims, change algorithm to `none`, use wrong key |
| **Graph path traversal** | Burp Suite | Attempt `/api/graph/{tid}/../../me/messages` |
| **Prototype pollution** | Burp Suite | Send `{"__proto__": {"admin": true}}` in request body |
| **Tenant isolation** | Burp Suite | Attempt to access tenant not connected to current user |
| **GDPR export enumeration** | Burp Suite | Attempt to export another user's data |
| **Input injection** | OWASP ZAP | NoSQL injection in Cosmos DB queries |

### 7.3 Penetration Testing Scope

**In-scope**:
- All API endpoints (`/api/*`)
- Authentication and session flows
- Graph API proxy (path traversal, parameter injection)
- GDPR endpoints (data enumeration)
- Rate limiting bypass attempts
- Cross-tenant data access

**Out-of-scope**:
- Azure AD infrastructure (Microsoft's responsibility)
- Microsoft Graph API (Microsoft's responsibility)
- Azure platform services (Cosmos DB, Key Vault, Functions internals)

---

*Document maintained by: MSP Device Manager Engineering Team*
*Review cycle: Quarterly or after API changes*
*Next review: Q3 2026*
