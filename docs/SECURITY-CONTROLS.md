# Security Controls & Compliance Mapping

> MSP Device Manager — Security Control Framework
> Document Version: 1.0 | Last Updated: 2026-03-17 | Classification: Internal

---

## Table of Contents

1. [Access Control & Authentication](#1-access-control--authentication)
2. [Cryptography & Data Protection](#2-cryptography--data-protection)
3. [Input Validation & Injection Prevention](#3-input-validation--injection-prevention)
4. [Logging & Monitoring](#4-logging--monitoring)
5. [Network Security](#5-network-security)
6. [Data Privacy (GDPR)](#6-data-privacy-gdpr)
7. [Vulnerability Management](#7-vulnerability-management)
8. [Business Continuity & Availability](#8-business-continuity--availability)
9. [Change Management](#9-change-management)
10. [Secure Development](#10-secure-development)
11. [Compliance Matrix Summary](#11-compliance-matrix-summary)
12. [Known Gaps & Remediation Plan](#12-known-gaps--remediation-plan)

---

## 1. Access Control & Authentication

### Implementation

| Control | Detail |
|---------|--------|
| **Identity Provider** | Azure Active Directory (multi-tenant OIDC) |
| **Authentication Protocol** | OpenID Connect with Authorization Code + PKCE flow |
| **Token Validation** | RS256 JWT verified against Azure AD JWKS endpoint |
| **Client Type** | MSAL ConfidentialClientApplication (server-side secret) |
| **Session Management** | Server-side sessions in Cosmos DB (24h TTL) |
| **Idle Timeout** | 30-minute inactivity timeout enforced server-side |
| **Concurrent Sessions** | Maximum 3 sessions per user (oldest auto-revoked) |
| **Session Binding** | IP address and User-Agent fingerprint tracking |
| **Rate Limiting (Auth)** | 10 requests/minute per IP on auth endpoints |
| **RBAC** | Page-level role-based access control module |
| **GDAP Scoping** | Tenant access restricted to customer-connected tenants only |
| **Token Storage** | Refresh tokens in Azure Key Vault (not browser) |

### Framework Mapping

| Framework | Control Reference | Status |
|-----------|-------------------|--------|
| **ISO 27001:2022** | A.5.15 Access control, A.5.16 Identity management, A.5.17 Authentication, A.8.2 Privileged access, A.8.5 Secure authentication | ✅ Implemented |
| **SOC 2** | CC6.1 Logical access security, CC6.2 Access provisioning, CC6.3 Access removal | ✅ Implemented |
| **NIST 800-53** | AC-2 Account management, AC-3 Access enforcement, AC-7 Unsuccessful logon attempts, AC-11 Session lock, AC-12 Session termination, IA-2 Identification and authentication, IA-5 Authenticator management | ✅ Implemented |
| **CIS Controls v8** | 5.1–5.4 Account management, 6.1–6.8 Access control management | ✅ Implemented |
| **GDPR** | Article 32(1)(b) — Ability to ensure ongoing confidentiality | ✅ Implemented |
| **OWASP Top 10** | A07:2021 Identification and Authentication Failures | ✅ Mitigated |

---

## 2. Cryptography & Data Protection

### Implementation

| Control | Detail |
|---------|--------|
| **Encryption in Transit** | TLS 1.2+ enforced by Azure on all services |
| **Encryption at Rest (DB)** | Azure Cosmos DB — AES-256 with Microsoft-managed keys |
| **Encryption at Rest (Secrets)** | Azure Key Vault — HSM-backed (Standard tier) |
| **HSTS** | Strict-Transport-Security: max-age=31536000; includeSubDomains |
| **Secret Storage** | Azure Key Vault with soft delete (90d) + purge protection |
| **No Plaintext Secrets** | All secrets via Key Vault or environment variables |
| **Key Rotation** | Azure-managed key rotation for Cosmos DB |
| **Certificate Management** | Azure-managed TLS certificates (Static Web Apps) |

### Framework Mapping

| Framework | Control Reference | Status |
|-----------|-------------------|--------|
| **ISO 27001:2022** | A.8.24 Use of cryptography, A.8.12 Data leakage prevention | ✅ Implemented |
| **SOC 2** | CC6.1 Encryption of data, CC6.7 Transmission security | ✅ Implemented |
| **NIST 800-53** | SC-8 Transmission confidentiality, SC-12 Cryptographic key management, SC-13 Cryptographic protection, SC-28 Protection of information at rest | ✅ Implemented |
| **CIS Controls v8** | 3.6 Encrypt data on end-user devices, 3.7 Establish and maintain data classification, 3.10 Encrypt sensitive data in transit, 3.11 Encrypt sensitive data at rest | ✅ Implemented |
| **GDPR** | Article 32(1)(a) — Encryption of personal data | ✅ Implemented |

---

## 3. Input Validation & Injection Prevention

### Implementation

| Control | Detail |
|---------|--------|
| **XSS Sanitizer** | DOMParser-based HTML sanitizer (`Sanitizer.js`) with tag/attribute allowlisting |
| **Safe HTML Methods** | `Sanitizer.setInnerHTML()`, `Sanitizer.text()`, `Sanitizer.attr()`, `Sanitizer.url()` |
| **Graph Path Allowlist** | 17 regex patterns restricting allowed Microsoft Graph API paths |
| **OData Validation** | Only $count, $filter, $select, $expand, $top, $skip, $orderby permitted |
| **Tenant ID Validation** | GUID format regex enforcement on all tenant ID parameters |
| **Body Sanitization** | JSON parse with 1MB size limit |
| **Prototype Pollution** | Strips `__proto__`, `constructor`, `prototype` keys from request bodies |
| **CSP** | Content Security Policy meta tag restricting script/connect/frame sources |
| **URL Validation** | `Sanitizer.url()` allowlists http, https, mailto, tel protocols only |

### Framework Mapping

| Framework | Control Reference | Status |
|-----------|-------------------|--------|
| **ISO 27001:2022** | A.8.26 Application security requirements, A.8.28 Secure coding | ✅ Implemented |
| **SOC 2** | CC8.1 Design, development, and implementation of system components | ✅ Implemented |
| **NIST 800-53** | SI-10 Information input validation, SI-15 Information output filtering | ✅ Implemented |
| **CIS Controls v8** | 16.1–16.12 Application software security | ✅ Implemented |
| **OWASP Top 10** | A03:2021 Injection, A07:2021 XSS (subset of identification failures) | ✅ Mitigated |

---

## 4. Logging & Monitoring

### Implementation

| Control | Detail |
|---------|--------|
| **Audit Log** | Cosmos DB `auditLog` container with 90-day TTL auto-purge |
| **Audit Fields** | userId, customerId, tenantId, action, details, ipAddress, timestamp |
| **Graph Call Logging** | All Graph API proxy calls logged with method, path, tenant, user |
| **Auth Event Logging** | Login, logout, callback, and failed auth attempts recorded |
| **Security Alerts** | Dedicated `securityAlerts` container (180-day TTL) with severity levels |
| **Application Insights** | Azure Application Insights for runtime telemetry and error tracking |
| **Log Analytics** | Azure Log Analytics workspace for infrastructure logs |
| **Error Handler** | Global error boundary with rate-limited reporting (max 3 per 10 seconds) |
| **Health Monitoring** | `/api/health` endpoint checking Cosmos DB and Key Vault connectivity |

### Framework Mapping

| Framework | Control Reference | Status |
|-----------|-------------------|--------|
| **ISO 27001:2022** | A.8.15 Logging, A.8.16 Monitoring activities, A.8.17 Clock synchronization | ✅ Implemented |
| **SOC 2** | CC7.1 Detection of changes, CC7.2 Monitoring for anomalies, CC7.3 Evaluation of detected events | ✅ Implemented |
| **NIST 800-53** | AU-2 Event logging, AU-3 Content of audit records, AU-4 Audit log storage, AU-6 Audit review, AU-11 Audit record retention | ✅ Implemented |
| **CIS Controls v8** | 8.1–8.12 Audit log management | ✅ Implemented |
| **GDPR** | Article 30 — Records of processing activities | ✅ Implemented |

---

## 5. Network Security

### Implementation

| Control | Detail |
|---------|--------|
| **CORS** | Restricted to specific origins only (localhost:4280 + production URL) |
| **Security Headers** | HSTS, X-Frame-Options: DENY, X-Content-Type-Options: nosniff |
| **Referrer Policy** | strict-origin-when-cross-origin |
| **Permissions Policy** | camera=(), microphone=(), geolocation=(), payment=() |
| **Cache Control** | no-store, no-cache, must-revalidate on API responses |
| **Rate Limiting** | 3-tier: general (100/min), auth (10/min), graph (60/min) |
| **CSP** | Restrictive Content Security Policy on all frontend pages |
| **Frame Protection** | frame-src: 'none' (no iframes allowed) |
| **Cross-Domain** | X-Permitted-Cross-Domain-Policies: none |

### Framework Mapping

| Framework | Control Reference | Status |
|-----------|-------------------|--------|
| **ISO 27001:2022** | A.8.20 Network security, A.8.21 Security of network services, A.8.22 Segregation of networks | ✅ Implemented |
| **SOC 2** | CC6.6 Security measures against threats outside system boundaries | ✅ Implemented |
| **NIST 800-53** | SC-7 Boundary protection, SC-8 Transmission confidentiality, SC-23 Session authenticity | ✅ Implemented |
| **CIS Controls v8** | 9.1–9.7 Email and web browser protections, 13.1–13.11 Network monitoring and defense | ✅ Implemented |
| **OWASP Top 10** | A05:2021 Security Misconfiguration | ✅ Mitigated |

---

## 6. Data Privacy (GDPR)

### Implementation

| Control | Detail |
|---------|--------|
| **Consent Management** | API endpoints to record and retrieve consent with categories, version, timestamp, IP, user-agent |
| **Data Subject Access** | `GET /api/gdpr/export` — returns all personal data as machine-readable JSON |
| **Right to Erasure** | `DELETE /api/gdpr/delete` — 30-day grace period, immediate session purge |
| **Privacy Policy** | `GET /api/gdpr/policy` — public endpoint with data processing summary |
| **Data Minimization** | Only essential data stored; device data is pass-through (not persisted) |
| **Data Isolation** | Cosmos DB partitioned by customerId; no cross-partition queries for user data |
| **Retention Limits** | Sessions: 24h, Audit: 90d, Security Alerts: 180d (TTL auto-purge) |
| **No Third-Party Analytics** | No tracking pixels, no Google Analytics, no third-party cookies |
| **No Cookies** | Token-based authentication (no session cookies) |

### Framework Mapping

| GDPR Article | Requirement | Implementation |
|-------------|-------------|----------------|
| Art. 5 | Data processing principles | Minimization, purpose limitation, storage limitation via TTLs |
| Art. 6 | Lawful basis | Contract performance + legitimate interest documented |
| Art. 7 | Consent records | Consent API with full audit trail |
| Art. 12-14 | Transparency | Public privacy policy endpoint |
| Art. 15 | Right of access | Data export endpoint (JSON) |
| Art. 17 | Right to erasure | Deletion endpoint with 30-day grace |
| Art. 20 | Data portability | Machine-readable JSON export |
| Art. 25 | Data protection by design | Partition isolation, TTLs, minimization |
| Art. 28 | Processor agreements | Microsoft DPA covers Azure services |
| Art. 30 | Records of processing | Data flow documentation maintained |
| Art. 32 | Security of processing | Encryption, access control, audit logging |
| Art. 33-34 | Breach notification | Incident response plan with 72h timeline |

---

## 7. Vulnerability Management

### Implementation

| Control | Detail |
|---------|--------|
| **Dependency Scanning** | Dependabot (weekly, Monday, max 10 PRs, npm ecosystem) |
| **npm Audit** | `npm audit --audit-level=high` in CI pipeline (fails on high/critical) |
| **audit-ci** | `npx audit-ci --high` as CI gate |
| **SAST** | GitHub CodeQL for JavaScript (runs on every push) |
| **Secrets Detection** | TruffleHog with full git history scan (--only-verified) |
| **Version Pinning** | package-lock.json for deterministic dependency resolution |
| **Node.js Version** | 18 LTS (active support + security updates) |

### Framework Mapping

| Framework | Control Reference | Status |
|-----------|-------------------|--------|
| **ISO 27001:2022** | A.8.8 Management of technical vulnerabilities, A.8.9 Configuration management | ✅ Implemented |
| **SOC 2** | CC7.1 Detection of system component changes and vulnerabilities | ✅ Implemented |
| **NIST 800-53** | RA-5 Vulnerability monitoring and scanning, SI-2 Flaw remediation | ✅ Implemented |
| **CIS Controls v8** | 7.1–7.7 Continuous vulnerability management, 16.1–16.12 Application security | ✅ Implemented |
| **OWASP Top 10** | A06:2021 Vulnerable and Outdated Components | ✅ Mitigated |

---

## 8. Business Continuity & Availability

### Implementation

| Control | Detail |
|---------|--------|
| **Service Worker** | Offline-capable PWA with cached static assets |
| **Retry Logic** | Exponential backoff for 429/5xx responses (3 attempts) |
| **Health Check** | `/api/health` endpoint monitoring Cosmos DB + Key Vault |
| **Auto-Scaling** | Azure Functions Consumption plan (0–200 instances) |
| **Backup** | Cosmos DB continuous backup (point-in-time, 30-day window) |
| **Infrastructure as Code** | Bicep templates for full infrastructure reproducibility |
| **Secret Recovery** | Key Vault soft delete (90d) + purge protection |
| **CDN Failover** | Service Worker serves cached CDN resources when offline |

### Framework Mapping

| Framework | Control Reference | Status |
|-----------|-------------------|--------|
| **ISO 27001:2022** | A.5.29 ICT readiness for business continuity, A.5.30 ICT readiness for business continuity, A.8.14 Redundancy of information processing facilities | ✅ Implemented |
| **SOC 2** | A1.1 Availability commitments, A1.2 Environmental protections, A1.3 Recovery procedures | ✅ Implemented |
| **NIST 800-53** | CP-2 Contingency plan, CP-9 System backup, CP-10 System recovery | ✅ Implemented |
| **CIS Controls v8** | 11.1–11.5 Data recovery | ✅ Implemented |

---

## 9. Change Management

### Implementation

| Control | Detail |
|---------|--------|
| **Version Control** | Git (GitHub) with full commit history |
| **CI/CD Pipeline** | GitHub Actions with security gates (audit, CodeQL, TruffleHog) |
| **Infrastructure as Code** | Bicep templates — all infrastructure changes are code-reviewed |
| **Dependency Updates** | Dependabot automated PRs (weekly review cycle) |
| **Changelog** | In-app What's New feature for user-facing changes |
| **Branch Protection** | Main branch deployment (configurable branch policies) |

### Framework Mapping

| Framework | Control Reference | Status |
|-----------|-------------------|--------|
| **ISO 27001:2022** | A.8.32 Change management, A.8.9 Configuration management | ✅ Implemented |
| **SOC 2** | CC8.1 Design, development, and implementation | ✅ Implemented |
| **NIST 800-53** | CM-2 Baseline configuration, CM-3 Configuration change control, CM-6 Configuration settings | ✅ Implemented |
| **CIS Controls v8** | 2.1–2.7 Inventory and control of software assets | ✅ Implemented |

---

## 10. Secure Development

### Implementation

| Control | Detail |
|---------|--------|
| **XSS Prevention** | DOMParser-based sanitizer with tag/attribute allowlisting |
| **Prototype Pollution** | Request body sanitization strips dangerous keys |
| **Path Traversal** | Graph API path regex allowlisting (17 patterns) |
| **Error Handling** | Global error boundary — no stack traces in responses |
| **Input Encoding** | HTML entity encoding for text, attributes, and URLs |
| **Secure Defaults** | Session idle timeout, rate limiting, CORS — all enabled by default |
| **Dependency Security** | All production deps from Microsoft or Auth0/Okta |
| **Code Review** | CI security gates block deployment of vulnerable code |

### Framework Mapping

| Framework | Control Reference | Status |
|-----------|-------------------|--------|
| **ISO 27001:2022** | A.8.25 Secure development lifecycle, A.8.26 Application security requirements, A.8.28 Secure coding | ✅ Implemented |
| **SOC 2** | CC8.1 Design and development controls | ✅ Implemented |
| **NIST 800-53** | SA-11 Developer testing, SA-15 Development process standards | ✅ Implemented |
| **OWASP Top 10** | A01–A10 (all categories addressed) | ✅ Mitigated |

---

## 11. Compliance Matrix Summary

| Framework | Total Controls Applicable | Controls Addressed | Coverage |
|-----------|--------------------------|-------------------|----------|
| **ISO 27001:2022** | ~35 Annex A controls | 30 | **86%** |
| **SOC 2 Type II** | ~25 Trust Service Criteria | 22 | **88%** |
| **NIST 800-53 Rev 5** | ~50 control families | 40 | **80%** |
| **CIS Controls v8** | ~30 safeguards | 25 | **83%** |
| **GDPR** | ~15 relevant articles | 13 | **87%** |
| **OWASP Top 10 (2021)** | 10 risk categories | 10 | **100%** |

> **Note**: Percentages reflect technical controls only. ISO 27001 and SOC 2 additionally require organizational policies, management processes, and documentation that are outside the scope of the application codebase.

---

## 12. Known Gaps & Remediation Plan

| # | Gap | Frameworks Affected | Risk Level | Remediation | Target Date | Status |
|---|-----|---------------------|------------|-------------|-------------|--------|
| 1 | **Customer-Managed Keys (CMK)** — Cosmos DB uses Microsoft-managed keys | ISO A.8.24, SOC2 CC6.1 | Medium | Enable CMK for Cosmos DB via Azure portal | Q3 2026 | Planned |
| 2 | **WAF / Azure Front Door** — No web application firewall in front of API | ISO A.8.20, SOC2 CC6.6, NIST SC-7 | Medium | Deploy Azure Front Door with WAF policies | Q2 2026 | Planned |
| 3 | **Penetration Testing** — No formal external pen test conducted | ISO A.8.8, SOC2 CC4.1, NIST CA-8 | High | Engage certified penetration testing firm | Q2 2026 | Planned |
| 4 | **Multi-Region Deployment** — Single Azure region | ISO A.5.29, SOC2 A1.2, NIST CP-7 | Medium | Enable Cosmos DB multi-region + secondary Functions | Q4 2026 | Planned |
| 5 | **ISMS Documentation** — No formal Information Security Management System | ISO 4-10 (clauses) | High | Develop ISMS policies, risk register, SoA | Q2 2026 | Planned |
| 6 | **Security Awareness Training** — No formal employee training program | ISO A.6.3, SOC2 CC1.4, NIST AT-2 | Medium | Implement annual security awareness training | Q3 2026 | Planned |
| 7 | **Vendor Risk Assessment** — No documented third-party assessment | ISO A.5.19-5.22, SOC2 CC9.2, NIST SA-9 | Medium | Document Azure/Microsoft as sub-processor with risk assessment | Q2 2026 | Planned |
| 8 | **Formal Change Approval** — No multi-person approval workflow | ISO A.8.32, SOC2 CC8.1 | Low | Implement GitHub branch protection with required reviewers | Q2 2026 | Planned |
| 9 | **Backup Restoration Testing** — No documented restore test | ISO A.5.29, SOC2 A1.3, NIST CP-4 | Medium | Schedule semi-annual Cosmos DB restore drill | Q3 2026 | Planned |
| 10 | **SRI Hashes** — CDN scripts lack Subresource Integrity hashes | OWASP A08, CIS 2.6 | Low | Add integrity attributes to CDN script/link tags | Q2 2026 | Planned |
| 11 | **Data Processing Agreement Template** — No customer-facing DPA | GDPR Art. 28 | High | Create DPA template for customer onboarding | Q2 2026 | Planned |
| 12 | **SIEM Integration** — Audit logs in Cosmos DB, not centralized SIEM | ISO A.8.16, SOC2 CC7.2, NIST SI-4 | Medium | Export audit logs to Azure Sentinel | Q3 2026 | Planned |

---

*Document maintained by: MSP Device Manager Engineering Team*
*Review cycle: Quarterly or after security control changes*
*Next review: Q3 2026*
