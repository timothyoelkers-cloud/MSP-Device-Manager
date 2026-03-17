# Data Flow & Privacy Documentation

> MSP Device Manager — GDPR Article 30 Record of Processing Activities
> Document Version: 1.0 | Last Updated: 2026-03-17 | Classification: Internal
> Data Protection Contact: [DPO Contact To Be Assigned]

---

## Table of Contents

1. [Data Flow Diagrams](#1-data-flow-diagrams)
2. [Personal Data Inventory](#2-personal-data-inventory)
3. [Data Processing Activities](#3-data-processing-activities)
4. [Data Protection Measures](#4-data-protection-measures)
5. [Data Subject Rights Implementation](#5-data-subject-rights-implementation)
6. [Third-Party Data Processors](#6-third-party-data-processors)
7. [Data Breach Notification Procedures](#7-data-breach-notification-procedures)
8. [International Data Transfers](#8-international-data-transfers)
9. [Data Protection by Design](#9-data-protection-by-design)
10. [Privacy Impact Assessment](#10-privacy-impact-assessment)
11. [Cookie & Tracking Policy](#11-cookie--tracking-policy)
12. [Data Retention Schedule](#12-data-retention-schedule)

---

## 1. Data Flow Diagrams

### 1.1 Authentication Flow

```
┌──────────┐     1. Click Sign In      ┌─────────────────┐
│          │ ─────────────────────────► │ Azure Static     │
│  User's  │                            │ Web App          │
│ Browser  │     2. Redirect to AAD     │ (Frontend SPA)   │
│          │ ◄───────────────────────── │                  │
└────┬─────┘                            └─────────────────┘
     │
     │ 3. Authenticate with org Azure AD
     ▼
┌──────────────────┐    4. Auth code callback    ┌───────────────────┐
│ Azure Active     │ ──────────────────────────► │ Azure Functions   │
│ Directory        │                              │ API               │
│ (Multi-tenant)   │    5. Token exchange (MSAL)  │                   │
│                  │ ◄────────────────────────── │ POST /auth/callback│
└──────────────────┘                              └───┬────────┬──────┘
                                                      │        │
                                              6. Store │        │ 7. Create
                                              refresh  │        │ session
                                              token    │        │
                                                      ▼        ▼
                                               ┌──────────┐ ┌──────────┐
                                               │ Key Vault│ │Cosmos DB │
                                               │ (Secrets)│ │(Sessions)│
                                               └──────────┘ └──────────┘
                                                      │
                                              8. Return session token
                                              to browser
```

**Data elements in this flow:**
- User's name, email, Azure AD OID (from ID token)
- Authorization code (transient, not stored)
- Access token (transient, used for session creation)
- Refresh token (stored in Key Vault, encrypted)
- Session token (stored in Cosmos DB, 24h TTL)
- IP address, User-Agent (stored with session for binding)

### 1.2 Device Management Flow

```
┌──────────┐  1. Request device list   ┌─────────────────┐
│  User's  │ ────────────────────────► │ Azure Functions  │
│ Browser  │  (Bearer token)           │ API              │
│          │                           │                  │
│          │  6. Device data response  │ GET /graph/      │
│          │ ◄──────────────────────── │  {tenantId}/...  │
└──────────┘                           └────┬────────┬────┘
                                            │        │
                                   2. Validate│      │3. Validate
                                    session  │      │ tenant access
                                            ▼        ▼
                                     ┌──────────┐ ┌──────────┐
                                     │Cosmos DB │ │Cosmos DB │
                                     │(Sessions)│ │(Tenants) │
                                     └──────────┘ └──────────┘
                                            │
                                   4. Get access token for tenant
                                            ▼
                                     ┌──────────┐
                                     │ Key Vault│  5. Call Graph API
                                     │          │─────────────────────►
                                     └──────────┘   Microsoft Graph
                                                    (Intune/Azure AD)
```

**Data elements in this flow:**
- Session token (authentication)
- Tenant ID (authorization scope)
- Graph API request path (validated against allowlist)
- Device data (pass-through — NOT stored in our database)
- Audit log entry (stored: userId, tenantId, action, timestamp, IP)

### 1.3 Data Subject Request Flow

```
┌──────────┐  GET /gdpr/export    ┌─────────────────┐
│  Data    │ ──────────────────► │ Azure Functions  │
│ Subject  │                     │ API              │
│          │  All personal data  │                  │
│          │ ◄────────────────── │ Collects from:   │
└──────────┘  (JSON download)    │ - customers      │
                                 │ - tenants        │
                                 │ - sessions       │
┌──────────┐  DELETE /gdpr/delete│ - auditLog       │
│  Data    │ ──────────────────►│ - consents       │
│ Subject  │                     │                  │
│          │  202 Accepted       │ Marks deletion   │
│          │ ◄────────────────── │ requested (30d)  │
└──────────┘                     │ Purges sessions  │
                                 │ immediately      │
                                 └─────────────────┘
```

---

## 2. Personal Data Inventory (GDPR Article 30)

| # | Data Category | Data Elements | Storage Location | Partition | Retention | Legal Basis | Purpose |
|---|---------------|---------------|------------------|-----------|-----------|-------------|---------|
| 1 | **Identity** | Name, email, organization, Azure AD OID | Cosmos DB (`customers`) | `/id` | Until deletion request | Contract (Art. 6(1)(b)) | Account management, user identification |
| 2 | **Authentication Tokens** | Encrypted refresh tokens | Azure Key Vault | N/A (secret name) | Until revocation or deletion | Contract (Art. 6(1)(b)) | Maintain authenticated session, token refresh |
| 3 | **Session Data** | Session token, userId, IP address, User-Agent, timestamps | Cosmos DB (`sessions`) | `/userId` | 24 hours (auto-purge TTL) | Contract (Art. 6(1)(b)) | Access control, session security |
| 4 | **Tenant Connections** | Tenant ID, display name, domain, GDAP status | Cosmos DB (`tenants`) | `/customerId` | Until disconnection | Contract (Art. 6(1)(b)) | Multi-tenant device management |
| 5 | **Audit Trail** | User actions, IP addresses, timestamps, tenant context | Cosmos DB (`auditLog`) | `/customerId` | 90 days (auto-purge TTL) | Legitimate interest (Art. 6(1)(f)) | Security monitoring, accountability |
| 6 | **Consent Records** | Consent categories, version, timestamp, IP, User-Agent | Cosmos DB (`consents`) | `/customerId` | Indefinite (legal requirement) | Legal obligation (Art. 6(1)(c)) | Consent proof per Art. 7 |
| 7 | **Security Alerts** | Alert type, severity, description, user context | Cosmos DB (`securityAlerts`) | `/customerId` | 180 days (auto-purge TTL) | Legitimate interest (Art. 6(1)(f)) | Threat detection, security monitoring |
| 8 | **Device Data** | Device names, compliance status, OS, assigned users | Microsoft Graph (pass-through) | N/A | **Not stored locally** | Contract (Art. 6(1)(b)) | Device management operations |
| 9 | **UI Preferences** | Theme, language, layout, saved views | Browser localStorage | N/A | Until user clears browser | Consent (Art. 6(1)(a)) | User experience personalization |

### Data Not Collected

The following data is explicitly **NOT** collected or stored:
- Browsing history or page view analytics
- Third-party tracking cookies
- Device fingerprints (beyond session User-Agent)
- Location data (beyond IP address in audit logs)
- Payment or financial information
- Health or biometric data
- Social media profiles
- Marketing preferences or advertising identifiers

---

## 3. Data Processing Activities

### 3.1 User Authentication & Session Management

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Authenticate users via their organization's Azure AD and maintain secure sessions |
| **Legal Basis** | Contract performance (Art. 6(1)(b)) — required to provide the service |
| **Data Subjects** | MSP administrators and technicians |
| **Data Elements** | Name, email, OID, session token, IP address, User-Agent |
| **Processing Operations** | Collection, storage, validation, deletion |
| **Storage Duration** | Sessions: 24 hours; Customer profile: until account deletion |
| **Recipients** | Azure AD (identity verification), Cosmos DB (session storage), Key Vault (token storage) |
| **Minimization** | Only essential identity claims extracted from ID token; sessions auto-expire via TTL |
| **Automated Decision-Making** | None |

### 3.2 Multi-Tenant Device Management

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Enable MSPs to manage M365 devices across customer tenants via GDAP |
| **Legal Basis** | Contract performance (Art. 6(1)(b)) — core service functionality |
| **Data Subjects** | End-users of managed tenants (device assignments, usernames) |
| **Data Elements** | Device data, user assignments, compliance status — all from Microsoft Graph |
| **Processing Operations** | Retrieval (via Graph API), display, action execution |
| **Storage Duration** | **Not stored** — all device data is pass-through from Graph API |
| **Recipients** | Microsoft Graph API (data source), user's browser (display) |
| **Minimization** | No local caching of device data; requests use `$select` to limit fields where possible |
| **Automated Decision-Making** | Compliance scoring is advisory only, no automated enforcement |

### 3.3 Audit Logging & Security Monitoring

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Maintain accountability and detect security threats |
| **Legal Basis** | Legitimate interest (Art. 6(1)(f)) — security of processing per Art. 32 |
| **Data Subjects** | All authenticated users |
| **Data Elements** | User ID, action performed, tenant context, IP address, timestamp |
| **Processing Operations** | Collection, storage, querying, automatic deletion |
| **Storage Duration** | Audit log: 90 days; Security alerts: 180 days (TTL auto-purge) |
| **Recipients** | Authorized administrators (via security events API) |
| **Minimization** | Only security-relevant actions logged; TTLs enforce automatic purge |
| **Legitimate Interest Assessment** | Security monitoring is necessary for data protection (Art. 32) and cannot be achieved through less intrusive means; users are informed via privacy policy |

### 3.4 Consent Management

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Record and manage data subject consent for compliance with Art. 7 |
| **Legal Basis** | Legal obligation (Art. 6(1)(c)) — GDPR requires demonstrable consent |
| **Data Subjects** | All users who provide consent |
| **Data Elements** | Consent categories, version, timestamp, IP address, User-Agent |
| **Processing Operations** | Collection, storage, retrieval |
| **Storage Duration** | Indefinite (required for consent proof) |
| **Recipients** | Authorized administrators, data protection officer |
| **Minimization** | Only consent-relevant metadata stored |

### 3.5 Analytics & Reporting

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Provide dashboards, trend analysis, and executive reports |
| **Legal Basis** | Contract performance (Art. 6(1)(b)) — reporting is a core feature |
| **Data Subjects** | MSP administrators (report viewers) |
| **Data Elements** | Aggregated device counts, compliance percentages, trend snapshots |
| **Processing Operations** | Aggregation, visualization, local storage (browser) |
| **Storage Duration** | Browser localStorage (until cleared by user) |
| **Recipients** | User's browser only — no server-side analytics storage |
| **Minimization** | All analytics are derived from real-time Graph API calls; only anonymized snapshots stored locally |
| **Third-Party Analytics** | **None** — no Google Analytics, no tracking pixels, no third-party analytics services |

---

## 4. Data Protection Measures (GDPR Article 32)

### 4.1 Technical Measures

| Measure | Implementation | Article 32 Reference |
|---------|---------------|---------------------|
| **Encryption in transit** | TLS 1.2+ on all Azure services, HSTS header | Art. 32(1)(a) |
| **Encryption at rest** | AES-256 (Azure-managed keys) for Cosmos DB and Key Vault | Art. 32(1)(a) |
| **Access control** | Azure AD SSO + JWT validation + session management | Art. 32(1)(b) |
| **Data isolation** | Cosmos DB partitioned by customerId — no cross-customer queries | Art. 32(1)(b) |
| **Data minimization** | TTL auto-purge on sessions (24h), audit (90d), alerts (180d) | Art. 5(1)(c) |
| **Pseudonymization** | Azure AD OID used as primary identifier (not directly identifying) | Art. 32(1)(a) |
| **Integrity** | Audit logging of all data modifications and access | Art. 32(1)(b) |
| **Availability** | Service Worker offline support, retry logic, auto-scaling | Art. 32(1)(b) |
| **Resilience** | Cosmos DB continuous backup, Bicep IaC for rapid recovery | Art. 32(1)(b) |
| **Testing** | CI/CD security scanning (CodeQL, npm audit, TruffleHog) | Art. 32(1)(d) |

### 4.2 Organizational Measures

| Measure | Status | Notes |
|---------|--------|-------|
| Data protection policy | Planned Q2 2026 | Public policy available via `/api/gdpr/policy` |
| DPO appointment | Planned Q2 2026 | Required if processing at scale |
| Staff training | Planned Q3 2026 | Annual security awareness |
| Vendor assessments | Planned Q2 2026 | Microsoft DPA covers Azure |
| Regular audits | Planned Q3 2026 | Semi-annual internal audit |

---

## 5. Data Subject Rights Implementation

| Right | GDPR Article | Endpoint | Method | Automation | Response Time |
|-------|-------------|----------|--------|------------|---------------|
| **Right of Access** | Art. 15 | `/api/gdpr/export` | GET | Fully automated | Immediate (JSON download) |
| **Right to Erasure** | Art. 17 | `/api/gdpr/delete` | DELETE | Automated with 30-day grace | Immediate acknowledgment, 30-day completion |
| **Right to Information** | Art. 13-14 | `/api/gdpr/policy` | GET | Fully automated | Immediate |
| **Consent Management** | Art. 7 | `/api/gdpr/consent` | GET/POST | Fully automated | Immediate |
| **Right to Portability** | Art. 20 | `/api/gdpr/export` | GET | Fully automated | Immediate (machine-readable JSON) |
| **Right to Restriction** | Art. 18 | Manual process | — | Manual | Within 30 days |
| **Right to Rectification** | Art. 16 | Azure AD profile update | — | Upstream (Azure AD) | User self-service |
| **Right to Object** | Art. 21 | Manual process | — | Manual | Within 30 days |

### Data Export Format (Art. 15 / Art. 20)

The `/api/gdpr/export` endpoint returns a comprehensive JSON bundle:

```json
{
  "exportDate": "2026-03-17T10:30:00Z",
  "dataSubject": {
    "name": "...",
    "email": "...",
    "organization": "...",
    "azureAdOid": "...",
    "accountCreated": "...",
    "plan": "..."
  },
  "connectedTenants": [...],
  "activeSessions": [...],
  "auditLog": [...],
  "consentRecords": [...],
  "note": "Device data is not stored locally. Access your Microsoft 365 admin center for device records."
}
```

### Deletion Process (Art. 17)

1. User requests deletion via `DELETE /api/gdpr/delete`
2. Account flagged with `deletionRequested: true` and `deletionDate` (30 days out)
3. All active sessions purged **immediately**
4. Audit entry created recording the deletion request
5. After 30-day grace period: all customer data, tenant connections, audit entries, and consents permanently deleted
6. Key Vault secrets (refresh tokens) deleted
7. User can cancel during the 30-day grace period by contacting support

---

## 6. Third-Party Data Processors

### 6.1 Sub-Processor Register

| Processor | Data Shared | Purpose | DPA in Place | Data Location | Art. 28 Compliant |
|-----------|-------------|---------|-------------|---------------|-------------------|
| **Microsoft Azure** (Cosmos DB, Functions, Key Vault, Static Web Apps) | All stored data (customer profiles, sessions, audit logs, tokens) | Cloud infrastructure hosting | Microsoft Online Services DPA | Configurable (default: UK South) | ✅ Yes |
| **Microsoft Graph API** | Delegated access tokens (per-tenant) | Device management operations via Intune | Microsoft Online Services DPA | Customer's M365 tenant region | ✅ Yes |
| **Azure Active Directory** | Authentication tokens, user profile claims | Identity verification and SSO | Microsoft Online Services DPA | Global (Azure AD is a global service) | ✅ Yes |
| **GitHub** (Pages, Actions) | Source code only (no user data) | Code hosting, CI/CD pipeline | GitHub Customer Agreement | United States | ✅ Yes |
| **jsDelivr CDN** | User's IP address (browser request) | JavaScript library delivery | N/A (no user data processed) | Global CDN | N/A |
| **Google Fonts** | User's IP address (browser request) | Font file delivery | Google Privacy Policy | Global CDN | ⚠️ Consider self-hosting |

### 6.2 Sub-Processor Assessment

**Microsoft Azure**: Microsoft is the primary sub-processor for all data storage and processing. Microsoft maintains:
- ISO 27001, ISO 27017, ISO 27018 certifications
- SOC 1, SOC 2, SOC 3 reports
- GDPR compliance with EU Standard Contractual Clauses
- Comprehensive Data Processing Agreement (DPA)
- Data residency controls (Azure regions)

**Recommendation**: Document Microsoft DPA acceptance and maintain current version reference.

---

## 7. Data Breach Notification Procedures

### 7.1 Detection Sources

| Source | Type | Coverage |
|--------|------|----------|
| Application Insights | Automated | Runtime errors, performance anomalies |
| Security Alerts API | Automated | Custom security rules and anomaly detection |
| Audit Log Analysis | Manual/Automated | Unusual access patterns, failed auth spikes |
| Dependabot Alerts | Automated | Dependency vulnerabilities |
| CodeQL Findings | Automated | Code-level security issues |
| User Reports | Manual | Reported by customers or staff |

### 7.2 Supervisory Authority Notification (Art. 33)

**Timeline**: Within 72 hours of becoming aware of the breach.

**Required Information**:
1. Nature of the personal data breach (categories, approximate number of subjects)
2. Name and contact details of the DPO
3. Likely consequences of the breach
4. Measures taken or proposed to address the breach

**Notification Template**:

```
PERSONAL DATA BREACH NOTIFICATION

Date of notification: [DATE]
Date breach identified: [DATE]
Date breach occurred: [DATE] (if different)

1. NATURE OF THE BREACH
   - Description: [DESCRIPTION]
   - Categories of data affected: [identity/session/audit/etc.]
   - Approximate number of data subjects: [NUMBER]
   - Approximate number of records: [NUMBER]

2. DATA PROTECTION OFFICER
   - Name: [DPO NAME]
   - Email: [DPO EMAIL]
   - Phone: [DPO PHONE]

3. LIKELY CONSEQUENCES
   - [DESCRIPTION OF POTENTIAL IMPACT]

4. MEASURES TAKEN
   - Immediate: [CONTAINMENT ACTIONS]
   - Planned: [REMEDIATION ACTIONS]
   - Timeline: [EXPECTED COMPLETION]
```

### 7.3 Data Subject Notification (Art. 34)

**Required when**: Breach is likely to result in a high risk to the rights and freedoms of individuals.

**Method**: Email to affected users using address from customer record.

**Content**: Clear, plain language description of the breach, DPO contact, likely consequences, and remediation measures.

### 7.4 Internal Process

1. **Hour 0**: Breach detected → Incident Commander assigned
2. **Hour 0-4**: Assessment and containment
3. **Hour 4-24**: Root cause analysis and impact assessment
4. **Hour 24-48**: Remediation and data subject impact evaluation
5. **Hour 48-72**: Supervisory authority notification (if required)
6. **Ongoing**: Data subject notification, post-incident review

---

## 8. International Data Transfers

### 8.1 Transfer Mechanisms

| Transfer | Mechanism | Safeguard |
|----------|-----------|-----------|
| User → Azure (hosting) | Azure region selection | Data stays in selected Azure region (default: UK South) |
| Azure Functions → Graph API | API call | Data remains in customer's M365 tenant region |
| Azure Functions → Azure AD | OIDC/OAuth | Azure AD is a global service (EU data residency option available) |
| Browser → jsDelivr CDN | HTTP request | No personal data transferred (only library files) |
| Browser → Google Fonts | HTTP request | IP address sent to Google (consider self-hosting) |
| Source code → GitHub | Git push | No personal data in repository |

### 8.2 EU/UK Adequacy

- **Microsoft Azure**: Covered by EU Standard Contractual Clauses and Microsoft's DPA
- **GitHub**: Covered by GitHub's Data Protection Agreement
- **Google Fonts**: IP address transfer — consider self-hosting to eliminate this transfer
- **jsDelivr**: No personal data transferred

### 8.3 Data Residency Configuration

Azure region is configurable via the Bicep deployment parameter `location`. Default is `uksouth` (UK South). To ensure data residency:

1. Set `location` to a region within the required jurisdiction
2. Cosmos DB data stays within the selected region (single-region mode)
3. Key Vault data stays within the selected region
4. Azure Functions execute within the selected region
5. Static Web App content is distributed via Azure CDN (code only, no user data)

---

## 9. Data Protection by Design (GDPR Article 25)

### 9.1 Architecture Decisions

| Principle | Implementation |
|-----------|---------------|
| **Minimization** | Only essential data stored; device data is pass-through from Graph API |
| **Purpose limitation** | Each Cosmos DB container has a defined purpose and retention period |
| **Storage limitation** | TTL auto-purge: sessions (24h), audit (90d), alerts (180d) |
| **Integrity** | Audit logging on all data operations; Cosmos DB consistency guarantees |
| **Confidentiality** | Encryption at rest and in transit; Key Vault for secrets |
| **Accountability** | Comprehensive audit trail with user, action, timestamp, IP |

### 9.2 Privacy-Enhancing Design Choices

1. **No cookies** — Token-based authentication eliminates cookie consent requirements
2. **No third-party analytics** — No Google Analytics, Mixpanel, or tracking pixels
3. **No advertising** — No ad networks, no behavioral tracking
4. **Partition isolation** — Cosmos DB partition keys prevent cross-customer data access
5. **Pass-through architecture** — Device data is never stored locally; always fetched from Graph API
6. **Automatic purging** — TTLs enforce data retention without manual intervention
7. **Consent-first workflow** — GDPR consent API available before data processing begins
8. **Self-service rights** — Data export and deletion are API-accessible (no manual process needed)

### 9.3 Data Protection by Default (Art. 25(2))

- New accounts start with minimal data collection
- Session TTL is set to shortest practical duration (24h)
- Idle timeout defaults to 30 minutes (most restrictive practical setting)
- UI preferences stored only in browser localStorage (user's device, not server)
- No optional data collection enabled by default

---

## 10. Privacy Impact Assessment

### 10.1 Processing Activity: User Authentication

| Factor | Assessment |
|--------|-----------|
| **Necessity** | Essential — cannot provide service without user identification |
| **Proportionality** | Proportionate — only minimal identity claims collected from Azure AD |
| **Risk to data subjects** | Low — data encrypted, short-lived sessions, standard authentication practice |
| **Mitigation** | Azure AD SSO (delegated authentication), Key Vault token storage, session TTLs |
| **Residual risk** | Low |

### 10.2 Processing Activity: Multi-Tenant Device Management

| Factor | Assessment |
|--------|-----------|
| **Necessity** | Essential — core service functionality |
| **Proportionality** | Proportionate — device data is pass-through, not stored |
| **Risk to data subjects** | Medium — accessing multiple tenant datasets requires robust access controls |
| **Mitigation** | GDAP scoping, tenant access validation, Graph path allowlisting, audit logging |
| **Residual risk** | Low-Medium |

### 10.3 Processing Activity: Audit Logging

| Factor | Assessment |
|--------|-----------|
| **Necessity** | Essential — required for security monitoring (Art. 32) and compliance |
| **Proportionality** | Proportionate — only security-relevant actions logged, 90-day retention |
| **Risk to data subjects** | Low — audit data is access-controlled, auto-purged |
| **Mitigation** | TTL auto-purge, access restricted to authorized administrators |
| **Residual risk** | Low |

### 10.4 Overall Assessment

| Category | Risk Level | Justification |
|----------|-----------|---------------|
| Data collection scope | Low | Minimal data collected; device data not stored |
| Data sensitivity | Medium | Authentication tokens and tenant access are sensitive |
| Data subjects | Medium | Multiple tenants = potentially many data subjects |
| Cross-border transfers | Low | Azure region configurable, Microsoft DPA in place |
| Automated decisions | None | No automated decision-making affecting individuals |
| **Overall** | **Low-Medium** | Appropriate controls in place; device data pass-through significantly reduces risk |

---

## 11. Cookie & Tracking Policy

### 11.1 Cookies

**This application does not use cookies.**

Authentication is token-based (JWT Bearer tokens). Session management is server-side (Cosmos DB). No session cookies, tracking cookies, or third-party cookies are set.

### 11.2 Web Storage

| Storage Type | Data | Purpose | Duration |
|-------------|------|---------|----------|
| **sessionStorage** | Access gate token | Pre-authentication access | Until tab closes |
| **localStorage** | UI preferences | Theme, language, layout | Until manually cleared |
| **localStorage** | Saved views | Filter presets | Until manually cleared |
| **localStorage** | Trend snapshots | Anonymized chart data | Until manually cleared |

### 11.3 Third-Party Tracking

**None.** This application does not use:
- Google Analytics or any analytics service
- Facebook Pixel or any advertising pixel
- Hotjar, FullStory, or any session recording
- Any third-party tracking scripts
- Any fingerprinting techniques

---

## 12. Data Retention Schedule

| Data Type | Container | Retention | Purge Method | Legal Basis |
|-----------|-----------|-----------|-------------|-------------|
| Customer profiles | customers | Until deletion request + 30d grace | GDPR delete endpoint | Contract |
| Tenant connections | tenants | Until disconnection | Manual disconnect | Contract |
| Active sessions | sessions | 24 hours | Cosmos DB TTL auto-purge | Contract |
| Audit log entries | auditLog | 90 days | Cosmos DB TTL auto-purge | Legitimate interest |
| Consent records | consents | Indefinite | Not auto-purged (legal requirement) | Legal obligation |
| Security alerts | securityAlerts | 180 days | Cosmos DB TTL auto-purge | Legitimate interest |
| Key Vault secrets | Key Vault | Until revocation + 90d soft delete | Manual or GDPR deletion | Contract |
| Browser preferences | localStorage | Until user clears | User action | Consent |

---

*Document maintained by: MSP Device Manager Engineering Team*
*Data Protection Officer: [To be appointed]*
*Review cycle: Annually or after significant processing changes*
*Next review: Q1 2027*
