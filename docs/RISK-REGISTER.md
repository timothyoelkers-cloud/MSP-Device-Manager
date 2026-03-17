# Risk Register & Threat Model

> MSP Device Manager — Security Risk Assessment
> Document Version: 1.0 | Last Updated: 2026-03-17 | Classification: Confidential
> Aligned with: ISO 27001 Clause 6.1, SOC 2 CC3, NIST RA Family

---

## Table of Contents

### Part 1: Threat Model
1. [System Context](#11-system-context)
2. [Trust Boundaries](#12-trust-boundaries)
3. [STRIDE Analysis](#13-stride-analysis)
4. [Attack Surface Analysis](#14-attack-surface-analysis)

### Part 2: Risk Register
5. [Risk Scoring Methodology](#21-risk-scoring-methodology)
6. [Risk Register](#22-risk-register)
7. [Risk Treatment Plans](#23-risk-treatment-plans)
8. [Security Recommendations](#24-security-recommendations)

---

# Part 1: Threat Model (STRIDE)

## 1.1 System Context

**Application**: MSP Device Manager — Multi-tenant SaaS platform for Managed Service Providers to manage Microsoft 365 devices across customer tenants via GDAP delegation.

**Data Sensitivity**:
- Authentication credentials (HIGH)
- Customer tenant data mappings (MEDIUM)
- Device management data (MEDIUM — pass-through, not stored)
- Audit logs with IP addresses (MEDIUM)
- UI preferences (LOW)

**Threat Actors**:
| Actor | Motivation | Capability | Likelihood |
|-------|-----------|-----------|-----------|
| External attacker | Data theft, ransomware | Medium-High | Medium |
| Compromised customer account | Lateral movement | Medium | Medium |
| Malicious insider | Data exfiltration | High (authorized access) | Low |
| Automated bot | Credential stuffing, DDoS | Low-Medium | High |
| Supply chain attacker | Backdoor installation | High | Low |
| Competitor | Business intelligence | Low-Medium | Low |

---

## 1.2 Trust Boundaries

```
                         TRUST BOUNDARY 1 (Public Internet)
                         ═══════════════════════════════════
                                      │
                         ┌────────────▼────────────┐
                         │  Azure Static Web App   │
                         │  (Frontend SPA)          │
                         └────────────┬────────────┘
                                      │
                         TRUST BOUNDARY 2 (Azure Backbone)
                         ═══════════════════════════════════
                                      │
                         ┌────────────▼────────────┐
                         │  Azure Functions API     │
                         └──┬────────┬────────┬────┘
                            │        │        │
              ══════════════╪════════╪════════╪═══════════
              TRUST BOUNDARY 3      TB 4     TB 5
              (DB Connection)    (Managed    (External
                                Identity)    API)
                            │        │        │
                         ┌──▼──┐  ┌──▼──┐  ┌──▼──────────┐
                         │Cosmo│  │Key  │  │Microsoft     │
                         │s DB │  │Vault│  │Graph + Azure │
                         └─────┘  └─────┘  │AD            │
                                           └──────────────┘
```

| Boundary | From | To | Transport | Authentication |
|----------|------|-----|-----------|---------------|
| **TB1** | User browser | Azure Static Web App | HTTPS (TLS 1.2+) | None (public) |
| **TB2** | Static Web App | Azure Functions | HTTPS (Azure backbone) | Bearer JWT |
| **TB3** | Azure Functions | Cosmos DB | HTTPS (connection string) | Connection string |
| **TB4** | Azure Functions | Key Vault | HTTPS (Azure backbone) | Managed identity |
| **TB5** | Azure Functions | Graph API / Azure AD | HTTPS | OAuth Bearer token |

---

## 1.3 STRIDE Analysis

### Trust Boundary 1: Browser ↔ Frontend (Public Internet)

| Threat | Category | Description | Current Mitigation | Residual Risk |
|--------|----------|-------------|-------------------|---------------|
| T1.1 | **Spoofing** | Attacker creates phishing site mimicking login | Azure AD handles auth (redirect to microsoft.com) | Low |
| T1.2 | **Tampering** | Man-in-the-middle modifies JavaScript | TLS 1.2+, HSTS, CSP | Low |
| T1.3 | **Repudiation** | User denies actions performed via SPA | Server-side audit logging with IP/UA | Low |
| T1.4 | **Information Disclosure** | Sensitive data in browser storage | Only UI preferences in localStorage; tokens server-side | Low |
| T1.5 | **Denial of Service** | DDoS against Static Web App | Azure CDN, no WAF yet | Medium |
| T1.6 | **Elevation of Privilege** | XSS to steal session token | Sanitizer.js, CSP, no inline token storage | Low |

### Trust Boundary 2: Frontend ↔ Azure Functions API

| Threat | Category | Description | Current Mitigation | Residual Risk |
|--------|----------|-------------|-------------------|---------------|
| T2.1 | **Spoofing** | Attacker forges API requests with stolen token | JWT RS256 validation via JWKS, session binding | Low |
| T2.2 | **Tampering** | Modified request parameters | Input validation, Graph path allowlist, body sanitization | Low |
| T2.3 | **Repudiation** | API calls without attribution | Audit log on all Graph calls and auth events | Low |
| T2.4 | **Information Disclosure** | Error responses leak internals | Error handler strips stack traces, generic messages | Low |
| T2.5 | **Denial of Service** | API flood attacks | Rate limiting (10/60/100 per min), CORS | Medium |
| T2.6 | **Elevation of Privilege** | Access another customer's tenants | Tenant ownership validation per request | Low |

### Trust Boundary 3: Azure Functions ↔ Cosmos DB

| Threat | Category | Description | Current Mitigation | Residual Risk |
|--------|----------|-------------|-------------------|---------------|
| T3.1 | **Spoofing** | Unauthorized database access | Connection string auth, Azure backbone | Low |
| T3.2 | **Tampering** | Data modification by unauthorized party | Connection string scoped to app, partition isolation | Low |
| T3.3 | **Information Disclosure** | Cross-tenant query returns wrong data | Cosmos DB partitioned by customerId, queries filtered | Low |
| T3.4 | **Denial of Service** | RU exhaustion from expensive queries | Retry logic, serverless auto-scaling | Low |

### Trust Boundary 4: Azure Functions ↔ Key Vault

| Threat | Category | Description | Current Mitigation | Residual Risk |
|--------|----------|-------------|-------------------|---------------|
| T4.1 | **Spoofing** | Unauthorized secret access | Managed identity (no stored credentials), access policies | Low |
| T4.2 | **Information Disclosure** | Refresh token exposure | Key Vault encryption, soft delete, purge protection | Low |
| T4.3 | **Tampering** | Token replacement/modification | Key Vault audit logging, access policies | Low |

### Trust Boundary 5: Azure Functions ↔ Graph API / Azure AD

| Threat | Category | Description | Current Mitigation | Residual Risk |
|--------|----------|-------------|-------------------|---------------|
| T5.1 | **Spoofing** | Impersonate Graph API response | TLS + certificate validation (built into Azure SDK) | Low |
| T5.2 | **Tampering** | Modified Graph API request path | Path allowlisting (17 regex patterns) | Low |
| T5.3 | **Information Disclosure** | Over-broad Graph permissions | GDAP scoping, least-privilege Graph scopes | Low-Medium |
| T5.4 | **Elevation of Privilege** | Use Graph proxy for unauthorized data | Tenant access validation, path allowlist | Low |

---

## 1.4 Attack Surface Analysis

### Attack Surface 1: Authentication Endpoints

| Endpoint | Exposure | Attack Vectors | Mitigations |
|----------|---------|----------------|-------------|
| `GET /auth/login` | Public | Redirect manipulation, SSRF | State parameter, Azure AD validates redirect URIs |
| `POST /auth/callback` | Public | Auth code interception, replay | One-time auth codes, PKCE, rate limiting (10/min) |
| `POST /auth/logout` | Authenticated | Session fixation | Deletes ALL user sessions, not just current |

### Attack Surface 2: Graph API Proxy

| Endpoint | Exposure | Attack Vectors | Mitigations |
|----------|---------|----------------|-------------|
| `GET/POST /graph/{tenantId}/*` | Authenticated | Path traversal, unauthorized Graph calls, data exfiltration | Path allowlist (17 patterns), tenant ownership check, OData param validation, rate limiting (60/min) |

**Key risk**: The Graph proxy is the most powerful endpoint — it can read/modify Intune devices across tenants. Path allowlisting is the critical control.

### Attack Surface 3: GDPR Endpoints

| Endpoint | Exposure | Attack Vectors | Mitigations |
|----------|---------|----------------|-------------|
| `GET /gdpr/export` | Authenticated | Data harvesting via export | Rate limiting, audit logging, session auth |
| `DELETE /gdpr/delete` | Authenticated | Malicious account deletion | 30-day grace period, audit logging |
| `GET /gdpr/policy` | Public | Information gathering | Low risk (public policy is expected) |

### Attack Surface 4: Frontend SPA

| Vector | Exposure | Attack | Mitigations |
|--------|---------|--------|-------------|
| innerHTML injection | Any dynamic content | XSS (script execution) | Sanitizer.js (DOMParser-based), CSP |
| CDN compromise | MSAL.js, Chart.js | Malicious code injection | CSP script-src, Service Worker cache |
| Service Worker | Cache storage | Cache poisoning | Cache versioning, integrity checks |
| localStorage | Browser access | Data theft (if device compromised) | Only UI preferences stored, no secrets |

---

# Part 2: Risk Register

## 2.1 Risk Scoring Methodology

### Likelihood Scale

| Score | Level | Definition |
|-------|-------|-----------|
| 1 | Rare | May occur only in exceptional circumstances (<1% annually) |
| 2 | Unlikely | Could occur but not expected (1–10% annually) |
| 3 | Possible | Might occur at some time (10–50% annually) |
| 4 | Likely | Will probably occur (50–90% annually) |
| 5 | Almost Certain | Expected to occur (>90% annually) |

### Impact Scale

| Score | Level | Definition |
|-------|-------|-----------|
| 1 | Negligible | No data exposure, no downtime, no compliance impact |
| 2 | Minor | Brief disruption, no data exposure, minor compliance finding |
| 3 | Moderate | Service degradation, limited data exposure, compliance violation |
| 4 | Major | Extended outage, significant data breach, regulatory action |
| 5 | Severe | Complete compromise, mass data breach, legal proceedings |

### Risk Matrix

| | Negligible (1) | Minor (2) | Moderate (3) | Major (4) | Severe (5) |
|---|---|---|---|---|---|
| **Almost Certain (5)** | 5 🟡 | 10 🟠 | 15 🔴 | 20 🔴 | 25 🔴 |
| **Likely (4)** | 4 🟢 | 8 🟡 | 12 🟠 | 16 🔴 | 20 🔴 |
| **Possible (3)** | 3 🟢 | 6 🟡 | 9 🟡 | 12 🟠 | 15 🔴 |
| **Unlikely (2)** | 2 🟢 | 4 🟢 | 6 🟡 | 8 🟡 | 10 🟠 |
| **Rare (1)** | 1 🟢 | 2 🟢 | 3 🟢 | 4 🟢 | 5 🟡 |

**Risk appetite**: Scores of 12+ require a documented treatment plan.

---

## 2.2 Risk Register

### Authentication & Access Risks

| ID | Risk | Threat | L | I | Score | Controls | Residual |
|----|------|--------|---|---|-------|----------|----------|
| **R001** | Credential theft via phishing | Attacker steals user's Azure AD credentials | 3 | 4 | **12** 🟠 | Azure AD SSO (MFA depends on customer), rate limiting on auth | **8** 🟡 |
| **R002** | Session hijacking | Attacker steals session token from network | 2 | 4 | **8** 🟡 | TLS 1.2+, server-side sessions, IP/UA binding, 24h TTL | **4** 🟢 |
| **R003** | Brute force on auth endpoints | Automated credential stuffing | 4 | 3 | **12** 🟠 | Rate limiting (10/min on auth), Azure AD lockout policies | **6** 🟡 |
| **R004** | Cross-tenant privilege escalation | User accesses another customer's tenants | 2 | 5 | **10** 🟠 | Tenant-to-customer mapping validated per request, Cosmos DB partitioning | **4** 🟢 |
| **R005** | Stale session exploitation | Stolen session token used after user thinks they're logged out | 2 | 3 | **6** 🟡 | 30-min idle timeout, max 3 concurrent, logout purges all sessions | **3** 🟢 |

### Data Security Risks

| ID | Risk | Threat | L | I | Score | Controls | Residual |
|----|------|--------|---|---|-------|----------|----------|
| **R006** | Cross-tenant data leakage | Bug in query logic returns another customer's data | 2 | 5 | **10** 🟠 | Cosmos DB partition keys, customerId filter on all queries | **4** 🟢 |
| **R007** | Personal data breach (GDPR) | Unauthorized access to customer identity data | 2 | 5 | **10** 🟠 | Encryption (rest + transit), access controls, audit logging | **6** 🟡 |
| **R008** | Unauthorized data export via GDPR endpoint | Attacker uses export endpoint to harvest data | 2 | 4 | **8** 🟡 | Authentication required, rate limiting, audit logging | **4** 🟢 |
| **R009** | Key Vault compromise (refresh tokens exposed) | Attacker gains access to stored refresh tokens | 1 | 5 | **5** 🟡 | Managed identity access only, soft delete, purge protection, access policies | **3** 🟢 |
| **R010** | Cosmos DB connection string exposure | Connection string leaked in logs or config | 2 | 5 | **10** 🟠 | Environment variables (not in code), .gitignore, TruffleHog scanning | **4** 🟢 |

### Application Security Risks

| ID | Risk | Threat | L | I | Score | Controls | Residual |
|----|------|--------|---|---|-------|----------|----------|
| **R011** | Cross-site scripting (XSS) | Attacker injects malicious script via user input | 3 | 4 | **12** 🟠 | Sanitizer.js (DOMParser), CSP, input encoding | **4** 🟢 |
| **R012** | Graph API path traversal | Attacker bypasses allowlist to access unauthorized Graph endpoints | 2 | 5 | **10** 🟠 | 17 regex patterns, OData param validation, strict path matching | **4** 🟢 |
| **R013** | Prototype pollution via request body | Attacker sends __proto__ keys to manipulate server behavior | 2 | 4 | **8** 🟡 | Body sanitization strips __proto__, constructor, prototype keys | **2** 🟢 |
| **R014** | Content Security Policy bypass | Attacker finds CSP bypass to execute arbitrary scripts | 2 | 4 | **8** 🟡 | CSP meta tag, frame-src: none, strict connect-src | **4** 🟢 |
| **R015** | Service Worker cache poisoning | Attacker poisons cached responses | 1 | 3 | **3** 🟢 | Cache versioning, network-first for API calls, HTTPS | **2** 🟢 |

### Infrastructure Risks

| ID | Risk | Threat | L | I | Score | Controls | Residual |
|----|------|--------|---|---|-------|----------|----------|
| **R016** | Azure region outage | Regional failure takes down all services | 2 | 4 | **8** 🟡 | Bicep IaC for redeployment, Cosmos DB backup, Service Worker offline mode | **6** 🟡 |
| **R017** | Cosmos DB throttling under load | High RU consumption degrades performance | 3 | 2 | **6** 🟡 | Retry logic with backoff, serverless auto-scaling | **3** 🟢 |
| **R018** | Function App cold start latency | First request after idle has high latency | 4 | 1 | **4** 🟢 | Consumption plan auto-scaling, frontend retry logic | **3** 🟢 |
| **R019** | Infrastructure misconfiguration (Bicep drift) | Manual changes diverge from IaC | 3 | 3 | **9** 🟡 | Bicep templates in Git, CI/CD deployment | **6** 🟡 |

### Supply Chain Risks

| ID | Risk | Threat | L | I | Score | Controls | Residual |
|----|------|--------|---|---|-------|----------|----------|
| **R020** | Compromised npm dependency | Malicious code in production dependency | 2 | 5 | **10** 🟠 | Dependabot, npm audit, CodeQL, all deps from Microsoft/Auth0 | **4** 🟢 |
| **R021** | CDN dependency compromise | Malicious MSAL.js or Chart.js via jsDelivr | 1 | 5 | **5** 🟡 | CSP, Service Worker cache, version pinning | **4** 🟢 |
| **R022** | GitHub Actions workflow injection | Attacker modifies CI pipeline | 1 | 4 | **4** 🟢 | Branch protection, PR reviews, no secrets in workflow files | **2** 🟢 |

### Compliance Risks

| ID | Risk | Threat | L | I | Score | Controls | Residual |
|----|------|--------|---|---|-------|----------|----------|
| **R023** | GDPR breach notification failure | Fail to notify within 72 hours | 2 | 4 | **8** 🟡 | Incident response plan, breach notification template, DPO role defined | **4** 🟢 |
| **R024** | Insufficient audit trail retention | Audit data lost before investigation | 2 | 3 | **6** 🟡 | 90-day TTL on audit log, 180-day on security alerts | **4** 🟢 |
| **R025** | Consent record inadequacy | Cannot demonstrate valid consent for data processing | 2 | 4 | **8** 🟡 | Consent API with categories, version, timestamp, IP, UA | **3** 🟢 |

---

## 2.3 Risk Treatment Plans

Risks scoring 12+ (inherent) require documented treatment plans:

### R001: Credential Theft via Phishing (Score: 12)

| Attribute | Detail |
|-----------|--------|
| **Treatment** | Mitigate |
| **Current Controls** | Azure AD SSO, rate limiting (10/min auth) |
| **Planned Controls** | 1. Enforce MFA at application level (verify `amr` claim includes `mfa`) 2. Add Conditional Access policy recommendation for customers 3. Implement login anomaly detection (unusual IP/geo) |
| **Target Residual Risk** | 4 (Unlikely × Minor) |
| **Timeline** | Q2 2026 |
| **Owner** | Security Lead |

### R003: Brute Force on Auth Endpoints (Score: 12)

| Attribute | Detail |
|-----------|--------|
| **Treatment** | Mitigate |
| **Current Controls** | Rate limiting (10/min), Azure AD lockout |
| **Planned Controls** | 1. Deploy Azure Front Door + WAF with bot protection 2. Add progressive delay on repeated failures 3. Implement IP reputation checking 4. Add CAPTCHA after 3 failed attempts |
| **Target Residual Risk** | 3 (Rare × Moderate) |
| **Timeline** | Q2 2026 |
| **Owner** | Engineering Lead |

### R011: Cross-Site Scripting (Score: 12)

| Attribute | Detail |
|-----------|--------|
| **Treatment** | Mitigate |
| **Current Controls** | Sanitizer.js, CSP meta tag, input encoding |
| **Planned Controls** | 1. Eliminate remaining `unsafe-inline` and `unsafe-eval` in CSP (requires MSAL update) 2. Add SRI hashes to CDN scripts 3. Engage external penetration testing for XSS focus 4. Implement automated XSS testing in CI |
| **Target Residual Risk** | 2 (Unlikely × Negligible) |
| **Timeline** | Q2-Q3 2026 |
| **Owner** | Engineering Lead |

---

## 2.4 Security Recommendations Priority Matrix

| Priority | Recommendation | Risks Addressed | Effort | Impact | Target |
|----------|---------------|----------------|--------|--------|--------|
| **P0** | Add SRI hashes to CDN `<script>` tags | R021 | Low (2h) | High | Q2 2026 |
| **P0** | Verify MFA via `amr` claim in JWT | R001 | Low (4h) | High | Q2 2026 |
| **P1** | Deploy Azure Front Door + WAF | R003, R005, T1.5, T2.5 | Medium (1w) | High | Q2 2026 |
| **P1** | Engage external penetration testing | All | Medium ($) | High | Q2 2026 |
| **P1** | Move Cosmos DB connection string to Key Vault reference | R010 | Low (4h) | Medium | Q2 2026 |
| **P2** | Enable Cosmos DB customer-managed keys (CMK) | R006, R007 | Medium (1d) | Medium | Q3 2026 |
| **P2** | Implement multi-region deployment | R016 | High (2w) | High | Q4 2026 |
| **P2** | Add Cosmos DB VNet integration | R010, T3.1 | Medium (1w) | Medium | Q3 2026 |
| **P3** | Implement SIEM export (Azure Sentinel) | R024 | Medium (1w) | Medium | Q3 2026 |
| **P3** | Formal change approval workflow (branch protection) | R019 | Low (2h) | Medium | Q2 2026 |
| **P3** | Self-host Google Fonts (privacy) | Privacy | Low (2h) | Low | Q2 2026 |
| **P4** | Generate SBOM (CycloneDX) in CI | R020 | Low (4h) | Low | Q3 2026 |
| **P4** | Implement login anomaly detection | R001 | Medium (1w) | Medium | Q3 2026 |

### Risk Heat Map Summary

```
                     IMPACT
         1      2      3      4      5
    ┌──────┬──────┬──────┬──────┬──────┐
  5 │      │      │      │      │      │
    ├──────┼──────┼──────┼──────┼──────┤
  4 │ R018 │      │ R003 │      │      │
L   ├──────┼──────┼──────┼──────┼──────┤
  3 │      │ R017 │R011  │ R001 │      │
    │      │      │ R019 │      │      │
I   ├──────┼──────┼──────┼──────┼──────┤
  2 │      │      │R005  │R002  │R004  │
K   │      │      │R024  │R008  │R006  │
    │      │      │      │R014  │R007  │
E   │      │      │      │R023  │R010  │
    │      │      │      │R025  │R012  │
L   │      │      │      │R013  │R020  │
    ├──────┼──────┼──────┼──────┼──────┤
I   │      │      │ R015 │ R022 │R009  │
  1 │      │      │      │      │R021  │
H   └──────┴──────┴──────┴──────┴──────┘
O
O
D
```

---

### Risk Register Review Schedule

| Activity | Frequency | Responsible |
|----------|-----------|-------------|
| Full risk register review | Quarterly | Security Lead + Engineering Lead |
| Risk treatment progress check | Monthly | Risk owners |
| New risk identification | Per change (architecture, features, incidents) | Engineering team |
| Post-incident risk update | After every P1/P2 incident | Incident Commander |
| Annual risk assessment | Annually | Full team + external review |

---

*Document maintained by: MSP Device Manager Engineering Team*
*Risk register owner: Security Lead*
*Review cycle: Quarterly*
*Next review: Q3 2026*
