# Security Documentation Index

> MSP Device Manager — Master Documentation Register
> Last Updated: 2026-03-17 | Classification: Internal

---

## Document Register

This index lists all security, compliance, and operational documentation for the MSP Device Manager platform. These documents are designed to satisfy audit requirements for ISO 27001, SOC 2 Type II, NIST 800-53, CIS Controls, GDPR, and OWASP Top 10.

---

### Architecture & Design

| Document | File | Description | Audience |
|----------|------|-------------|----------|
| [Architecture & Technology Stack](ARCHITECTURE.md) | `docs/ARCHITECTURE.md` | System architecture, technology decisions, data flow diagrams, component inventory | Auditors, engineers, management |
| [GDAP Setup Guide](GDAP-SETUP.md) | `docs/GDAP-SETUP.md` | Azure AD app registration, GDAP configuration, tenant connection procedures | Engineers, deployment team |

### Security & Compliance

| Document | File | Description | Audience |
|----------|------|-------------|----------|
| [Security Controls & Compliance Mapping](SECURITY-CONTROLS.md) | `docs/SECURITY-CONTROLS.md` | All security controls mapped to ISO 27001, SOC 2, NIST, CIS, GDPR, OWASP with gap analysis | Auditors, CISO, compliance |
| [API Security Reference](API-SECURITY.md) | `docs/API-SECURITY.md` | All API endpoints documented with auth requirements, rate limits, input validation, error handling | Engineers, pen testers, auditors |
| [Risk Register & Threat Model](RISK-REGISTER.md) | `docs/RISK-REGISTER.md` | STRIDE threat analysis, 25 scored risks, treatment plans, priority recommendations | CISO, management, auditors |

### Privacy & Data Protection

| Document | File | Description | Audience |
|----------|------|-------------|----------|
| [Data Flow & Privacy](DATA-FLOW-PRIVACY.md) | `docs/DATA-FLOW-PRIVACY.md` | GDPR Art. 30 records, data inventory, subject rights, processor register, breach procedures | DPO, auditors, regulators |

### Operations

| Document | File | Description | Audience |
|----------|------|-------------|----------|
| [Infrastructure & Deployment Guide](INFRASTRUCTURE.md) | `docs/INFRASTRUCTURE.md` | Azure infrastructure, Bicep IaC, deployment process, DR, scaling, cost estimation, runbooks | Engineers, operations, auditors |
| [Incident Response & BCP](INCIDENT-RESPONSE-BCP.md) | `docs/INCIDENT-RESPONSE-BCP.md` | Incident classification, response phases, GDPR breach notification, DR scenarios, testing schedule | All staff, auditors, DPO |

### Supply Chain

| Document | File | Description | Audience |
|----------|------|-------------|----------|
| [Open Source Dependency Audit](DEPENDENCY-AUDIT.md) | `docs/DEPENDENCY-AUDIT.md` | Every dependency audited — publisher, license, CVEs, risk assessment, supply chain controls | Engineers, auditors, procurement |

---

## Compliance Coverage Map

| Framework | Primary Documents |
|-----------|-------------------|
| **ISO 27001:2022** | Security Controls, Risk Register, Incident Response, Infrastructure |
| **SOC 2 Type II** | Security Controls, API Security, Incident Response, Architecture |
| **NIST 800-53 Rev 5** | Security Controls, Risk Register, Infrastructure, Incident Response |
| **CIS Controls v8** | Security Controls, Dependency Audit, API Security |
| **GDPR** | Data Flow & Privacy, Security Controls, Incident Response |
| **OWASP Top 10** | Security Controls, API Security, Dependency Audit |

---

## Document Lifecycle

| Activity | Frequency | Responsible |
|----------|-----------|-------------|
| Full documentation review | Annually | Engineering Lead + Security Lead |
| Risk register update | Quarterly | Security Lead |
| Incident response testing | Quarterly | All roles |
| Dependency audit refresh | Quarterly | Engineering team |
| Architecture update | After significant changes | Engineering Lead |
| Privacy documentation | Annually or after processing changes | DPO |

---

## Pending Documentation (Planned)

| Document | Target Date | Purpose |
|----------|------------|---------|
| Information Security Policy (ISMS) | Q2 2026 | ISO 27001 clauses 4–10 |
| Data Processing Agreement (DPA) | Q2 2026 | Customer-facing GDPR Art. 28 |
| Acceptable Use Policy | Q2 2026 | Internal staff guidelines |
| Vendor Risk Assessment | Q2 2026 | Microsoft Azure sub-processor assessment |
| Security Awareness Training Plan | Q3 2026 | Staff training program |
| Penetration Test Report | Q2 2026 | External security validation |

---

*Index maintained by: MSP Device Manager Engineering Team*
*Review cycle: Quarterly*
