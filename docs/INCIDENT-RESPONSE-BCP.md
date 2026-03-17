# Incident Response & Business Continuity Plan

> MSP Device Manager — IR/BCP Documentation
> Document Version: 1.0 | Last Updated: 2026-03-17 | Classification: Confidential
> Aligned with: ISO 27001 A.5.24-5.28, SOC 2 CC7/A1, NIST IR/CP Families, GDPR Art. 33-34

---

## Table of Contents

### Part 1: Incident Response Plan
1. [Purpose & Scope](#11-purpose--scope)
2. [Incident Classification](#12-incident-classification)
3. [Roles & Responsibilities](#13-roles--responsibilities)
4. [Incident Response Phases](#14-incident-response-phases)
5. [GDPR Breach Notification](#15-gdpr-breach-notification)
6. [Communication Plan](#16-communication-plan)
7. [Incident Response Playbooks](#17-incident-response-playbooks)

### Part 2: Business Continuity Plan
8. [Service Dependency Analysis](#21-service-dependency-analysis)
9. [Disaster Recovery Scenarios](#22-disaster-recovery-scenarios)
10. [Backup Strategy](#23-backup-strategy)
11. [Recovery Procedures](#24-recovery-procedures)
12. [Testing Schedule](#25-testing-schedule)

---

# Part 1: Incident Response Plan

## 1.1 Purpose & Scope

This plan defines the procedures for detecting, responding to, and recovering from security incidents affecting the MSP Device Manager platform.

**Scope**: All components of the MSP Device Manager platform:
- Azure Static Web Apps (frontend)
- Azure Functions (backend API)
- Azure Cosmos DB (data storage)
- Azure Key Vault (secrets management)
- Azure Active Directory integration
- Microsoft Graph API proxy
- CI/CD pipeline (GitHub Actions)
- Customer data across all connected tenants

**Out of scope**: Azure platform-level incidents (covered by Microsoft's incident response), customer Azure AD tenant security, Microsoft Graph API availability.

---

## 1.2 Incident Classification

### Severity Levels

| Severity | Classification | Definition | SLA (Response) | SLA (Resolution) |
|----------|---------------|-----------|-----------------|-------------------|
| **P1 — Critical** | Emergency | Active data breach, complete service outage, authentication system compromise, Key Vault exposure | 15 minutes | 4 hours |
| **P2 — High** | Urgent | Partial service degradation, suspected unauthorized access, dependency vulnerability (critical CVE), rate limit bypass | 1 hour | 8 hours |
| **P3 — Medium** | Standard | Minor security finding, auth failure spikes, CSP violation reports, non-critical vulnerability | 4 hours | 48 hours |
| **P4 — Low** | Advisory | Informational alerts, unusual traffic patterns, minor configuration drift, improvement opportunity | Next business day | 5 business days |

### Incident Type Examples

| Type | P1 | P2 | P3 | P4 |
|------|----|----|----|----|
| **Data Breach** | Confirmed unauthorized data access | Suspected data access | Misconfigured permissions | Unnecessary data collection |
| **Authentication** | Auth system compromised, tokens leaked | Brute force attack detected | Failed login spike | Unusual login pattern |
| **Infrastructure** | All services down | Single service degraded | Cold start latency increase | Configuration drift |
| **Supply Chain** | Compromised production dependency | Critical CVE in dependency | High CVE in dependency | Medium/low CVE |
| **Compliance** | GDPR breach, regulatory action | Consent system failure | Audit log gap | Documentation outdated |

---

## 1.3 Roles & Responsibilities

| Role | Responsibility | Backup |
|------|---------------|--------|
| **Incident Commander** | Overall coordination, decision authority, stakeholder updates | Engineering Lead |
| **Security Lead** | Technical investigation, forensics, containment decisions | Senior Engineer |
| **Engineering Lead** | Code-level remediation, deployment, testing | Platform Engineer |
| **Communications Lead** | Customer notification, status page, regulatory communication | Product Manager |
| **Data Protection Officer** | GDPR assessment, supervisory authority notification, data subject communication | Legal Counsel |

### Escalation Matrix

| Severity | Initial Responder | Escalate To | Timeline |
|----------|------------------|-------------|----------|
| P1 | On-call engineer | All roles + management | Immediate |
| P2 | On-call engineer | Security Lead + Engineering Lead | Within 1 hour |
| P3 | Engineering team | Security Lead (if security-related) | Within 4 hours |
| P4 | Engineering team | Logged for next sprint | Next business day |

---

## 1.4 Incident Response Phases

### Phase 1: Detection & Identification

**Automated Detection Sources:**

| Source | Detects | Alert Channel |
|--------|---------|---------------|
| Application Insights | Runtime errors, performance anomalies, request failures | Azure Monitor → Email/Teams |
| Security Alerts API | Custom security rules, suspicious activity patterns | In-app dashboard |
| Audit Log Analysis | Unusual access patterns, failed auth spikes, bulk operations | Periodic review |
| Dependabot | Dependency vulnerabilities (critical/high) | GitHub notification |
| CodeQL | Code-level security findings | GitHub PR check |
| TruffleHog | Leaked secrets in git history | GitHub Actions |
| Azure Service Health | Platform-level issues affecting our services | Azure Portal |

**Manual Detection Sources:**
- Customer reports (support channels)
- Team member observation
- Third-party security researcher disclosure
- Media or social media reports

**Initial Assessment Checklist:**
- [ ] What type of incident is this?
- [ ] What is the severity (P1–P4)?
- [ ] What data/systems are affected?
- [ ] Is the incident ongoing or historical?
- [ ] How many customers/users are potentially affected?
- [ ] Is personal data involved? (→ GDPR assessment)
- [ ] Assign Incident Commander

### Phase 2: Containment

**Immediate Containment (P1/P2):**

| Scenario | Action | Command/Procedure |
|----------|--------|-------------------|
| API compromise | Stop Function App | `az functionapp stop --name {app} --resource-group {rg}` |
| Stolen tokens | Revoke all sessions | Delete all docs in `sessions` container |
| Key Vault breach | Rotate all secrets | See Runbook 9.1 in INFRASTRUCTURE.md |
| Data exfiltration | Block specific IPs | Azure Functions networking → IP restrictions |
| Supply chain | Revert to last known good | `git revert` + redeploy |
| Account takeover | Disable affected accounts | Update customer `isActive: false` in Cosmos DB |

**Evidence Preservation:**
- Export Application Insights logs for affected time period
- Export Cosmos DB audit log entries
- Screenshot Azure Activity Log
- Document timeline of events
- Preserve any modified files (git history)

### Phase 3: Eradication

1. **Root Cause Analysis** — Identify the vulnerability or failure that enabled the incident
2. **Patch Development** — Create and test fix in isolated environment
3. **Secret Rotation** — If credentials involved, rotate ALL potentially affected secrets:
   - Azure AD client secret
   - Cosmos DB primary key
   - Function App session secret
   - Key Vault access policies
4. **Deployment** — Deploy fix through CI/CD pipeline (security gates still apply)
5. **Verification** — Confirm fix addresses root cause without side effects

### Phase 4: Recovery

1. **Service Restoration**
   - Restart Function App: `az functionapp start`
   - Verify health endpoint: `GET /api/health`
   - Monitor error rates for 30 minutes post-restart

2. **Data Integrity**
   - Verify Cosmos DB data consistency
   - Check audit log continuity
   - Validate session store is clean

3. **User Communication**
   - Notify affected users (if P1/P2)
   - Update status page
   - Provide guidance for user-side actions (password reset, etc.)

4. **Enhanced Monitoring Period**
   - 72-hour heightened monitoring after P1/P2
   - Reduced alert thresholds
   - Additional log review

### Phase 5: Post-Incident Review

**Timeline**: Within 5 business days of resolution.

**Post-Incident Report Template:**

```
INCIDENT REPORT

Incident ID: INC-YYYY-NNN
Severity: P1/P2/P3/P4
Duration: Start time → End time (total hours)
Commander: [Name]

1. EXECUTIVE SUMMARY
   [2-3 sentence summary of what happened]

2. TIMELINE
   [Chronological list of events with timestamps]

3. ROOT CAUSE
   [Technical description of the underlying cause]

4. IMPACT
   - Users affected: [number]
   - Data exposed: [description or "none"]
   - Service downtime: [duration]
   - Financial impact: [estimate or "none"]

5. CONTAINMENT & REMEDIATION
   [Actions taken to contain and fix the issue]

6. LESSONS LEARNED
   - What went well
   - What could be improved
   - Action items with owners and deadlines

7. PREVENTION
   [Controls being added to prevent recurrence]
```

---

## 1.5 GDPR Breach Notification

### Assessment Criteria

A personal data breach requires notification when it is **likely to result in a risk to the rights and freedoms of individuals**.

| Data Type Exposed | Risk Level | Notification Required |
|-------------------|-----------|----------------------|
| Names + emails | Medium | Likely — supervisory authority |
| Session tokens | Medium | Likely — supervisory authority |
| Tenant access tokens | High | Yes — supervisory authority + data subjects |
| Audit logs (with IPs) | Low-Medium | Assess case-by-case |
| UI preferences only | Low | Unlikely |
| Device management data | Medium-High | Yes — supervisory authority + data subjects |

### 72-Hour Supervisory Authority Notification (Art. 33)

**Supervisory Authority**: Information Commissioner's Office (ICO) for UK-based operations.

**Notification Template:**

```
PERSONAL DATA BREACH NOTIFICATION TO SUPERVISORY AUTHORITY

Date: [DATE]
Reference: [INCIDENT-ID]

1. CONTROLLER DETAILS
   Organization: [COMPANY NAME]
   DPO: [NAME, EMAIL, PHONE]

2. BREACH DETAILS
   Date discovered: [DATE/TIME]
   Date occurred: [DATE/TIME or "Unknown"]
   Ongoing: [Yes/No]

3. NATURE OF BREACH
   Type: [Confidentiality/Integrity/Availability]
   Description: [CLEAR DESCRIPTION]

4. DATA AND SUBJECTS
   Categories of data: [Identity, authentication, device management, etc.]
   Categories of subjects: [MSP administrators, end-users of managed tenants]
   Approximate number of subjects: [NUMBER]
   Approximate number of records: [NUMBER]

5. CONSEQUENCES
   [Description of likely consequences for data subjects]

6. MEASURES TAKEN
   Containment: [ACTIONS]
   Remediation: [ACTIONS]
   Prevention: [PLANNED ACTIONS]

7. CROSS-BORDER
   Data transferred outside UK/EEA: [Yes/No]
   If yes, safeguards: [SCCs, adequacy decision, etc.]
```

### Data Subject Notification (Art. 34)

Required when breach is likely to result in **high risk** to individuals.

**Template:**

```
Subject: Important Security Notice — MSP Device Manager

Dear [NAME],

We are writing to inform you of a security incident that may affect
your personal data.

WHAT HAPPENED:
[Clear, plain-language description]

WHAT DATA WAS AFFECTED:
[List of data categories]

WHAT WE ARE DOING:
[Remediation measures]

WHAT YOU SHOULD DO:
[Recommended user actions — e.g., change passwords, review access]

CONTACT:
If you have questions, contact our Data Protection Officer:
[DPO NAME] — [DPO EMAIL]

[COMPANY NAME]
[DATE]
```

---

## 1.6 Communication Plan

| Audience | Channel | Timing | Content |
|----------|---------|--------|---------|
| Engineering team | Secure channel (Teams/Slack) | Immediate (P1/P2) | Technical details, actions needed |
| Management | Email + meeting | Within 1 hour (P1) | Impact summary, resource needs |
| Affected customers | Email | Within 24 hours (P1/P2) | What happened, impact, remediation |
| All customers | Status page | As appropriate | Service status updates |
| Supervisory authority | ICO portal | Within 72 hours (if required) | Formal breach notification |
| Data subjects | Email | Without undue delay (if required) | Art. 34 notification |
| Public | Blog/press release | Only if required by scope | Factual statement |

---

## 1.7 Incident Response Playbooks

### Playbook A: Suspected Data Breach

1. **Detect**: Alert from audit log, customer report, or external notification
2. **Assess**: Determine scope — which customers, what data, how long
3. **Contain**: Immediately block the access vector (disable endpoint, revoke tokens, IP block)
4. **Preserve**: Export all logs for the affected time period
5. **Investigate**: Trace the attack vector through audit logs and Application Insights
6. **GDPR Assessment**: Determine if personal data was accessed, assess risk level
7. **Notify**: If GDPR threshold met, prepare 72-hour notification
8. **Remediate**: Fix the vulnerability, rotate credentials
9. **Recover**: Restore service, notify affected users
10. **Review**: Post-incident report within 5 business days

### Playbook B: Critical Dependency Vulnerability

1. **Detect**: Dependabot alert or npm audit finding (severity: critical)
2. **Assess**: Is the vulnerability exploitable in our usage context?
3. **Patch**: Update dependency version, test in isolation
4. **Deploy**: Emergency deployment through CI/CD (security gates still apply)
5. **Verify**: Confirm vulnerability is resolved
6. **Review**: Update dependency audit document

### Playbook C: Complete Service Outage

1. **Detect**: Health endpoint failure, Application Insights alerts, customer reports
2. **Assess**: Identify which component(s) are failing
3. **Triage**: Platform issue (Azure) or application issue?
4. **If Azure**: Monitor Azure Status, prepare for region failover if prolonged
5. **If Application**: Check recent deployments, roll back if needed
6. **Recover**: Restart/redeploy affected components
7. **Verify**: Health check, smoke tests, monitor for 30 minutes
8. **Communicate**: Update status page, notify customers if downtime > 30 minutes

### Playbook D: Compromised Credentials

1. **Detect**: Unusual API activity, failed auth from unknown IPs, alert from monitoring
2. **Contain**: Immediately revoke all user sessions (delete all from sessions container)
3. **Rotate**: Azure AD client secret, Cosmos DB keys, session secret
4. **Update**: Deploy new credentials to Function App
5. **Investigate**: Determine how credentials were compromised
6. **Notify**: Affected users (force re-authentication)
7. **Harden**: Add additional monitoring, consider MFA enforcement
8. **Review**: Update security controls documentation

---

# Part 2: Business Continuity Plan

## 2.1 Service Dependency Analysis

### Internal Dependencies

| Component | Depends On | Impact if Unavailable | Degraded Mode |
|-----------|-----------|----------------------|---------------|
| Frontend SPA | Azure Static Web Apps | No user access | Service Worker serves cached version |
| Backend API | Azure Functions runtime | No API operations | Frontend shows offline message |
| Authentication | Azure AD + MSAL | No login/logout | Existing sessions continue until expiry |
| Data Storage | Cosmos DB | No data read/write | API returns 503 |
| Token Storage | Key Vault | No token refresh | Cached tokens work (5-min cache) |
| Monitoring | Application Insights | No telemetry | Application continues to function |

### External Dependencies

| Dependency | Owner | SLA | Impact if Unavailable | Our Mitigation |
|-----------|-------|-----|----------------------|----------------|
| Azure AD | Microsoft | 99.99% | No authentication | Session cache, graceful error |
| Microsoft Graph | Microsoft | 99.9% | No device management | Retry logic, offline mode |
| jsDelivr CDN | jsDelivr | 99.9% | MSAL.js/Chart.js unavailable | Service Worker cache |
| Google Fonts | Google | 99.9% | Font fallback | System font fallback in CSS |
| GitHub Actions | GitHub | 99.9% | No CI/CD deployments | Manual deployment option |

### Single Points of Failure

| SPOF | Risk | Mitigation | Status |
|------|------|-----------|--------|
| Azure region | Regional outage affects all services | Bicep templates enable rapid redeployment | Documented |
| Cosmos DB (single region) | Data unavailable during outage | Continuous backup + Bicep redeployment | Active |
| Azure AD client secret | Secret expiry = auth failure | Calendar reminder for rotation | Active |
| GitHub repository | CI/CD unavailable | Multiple git clones, manual deploy option | Active |

---

## 2.2 Disaster Recovery Scenarios

### Scenario 1: Single Component Failure

| Component | Auto-Recovery | Manual Recovery | RTO |
|-----------|--------------|-----------------|-----|
| Function App crash | Consumption plan auto-restart | `az functionapp restart` | < 5 min |
| Cosmos DB throttling | Retry logic with backoff | Increase RU capacity | Automatic |
| Key Vault cache miss | Re-fetch from Key Vault | Check access policies | < 1 min |
| Static Web App CDN | Azure auto-heals | Redeploy | < 10 min |

### Scenario 2: Regional Outage

**Detection**: Azure Status page, all services unreachable

**Recovery Steps**:
1. Confirm regional outage (Azure Status, portal)
2. Decide: wait for recovery or failover
3. If failover:
   a. Update Bicep `location` parameter to alternate region
   b. Run `infra/deploy.sh` targeting new region
   c. Restore Cosmos DB from backup to new account
   d. Update DNS for custom domain
   e. Update Azure AD redirect URIs
   f. Verify all services via health endpoint
4. Estimated RTO: 1–2 hours

### Scenario 3: Complete Infrastructure Loss

**Detection**: All Azure resources deleted or inaccessible

**Recovery Steps**:
1. Create new resource group in target region
2. Run `infra/deploy.sh` (deploys all infrastructure)
3. Create new Azure AD client secret
4. Update Function App environment variables
5. Restore Cosmos DB from backup (if available) or start fresh
6. Push to GitHub to trigger Static Web App deployment
7. Verify all services
8. Notify customers of service restoration

**Estimated RTO**: 30–60 minutes (without data restore)

### Scenario 4: Supply Chain Compromise

**Detection**: Dependabot alert, npm audit, external advisory

**Recovery Steps**:
1. Assess: Is the compromised package in production?
2. If in production: immediately deploy with previous version pinned
3. Service Worker serves cached frontend (no CDN dependency)
4. CSP blocks unauthorized script sources
5. Update to patched version when available
6. Audit for any exploitation during exposure window

---

## 2.3 Backup Strategy

| Data | Method | Frequency | Retention | Location |
|------|--------|-----------|-----------|----------|
| Application code | Git (distributed) | Every commit | Indefinite | GitHub + local clones |
| Infrastructure config | Bicep in Git | Every commit | Indefinite | GitHub + local clones |
| Cosmos DB data | Azure continuous backup | Continuous | 30 days (point-in-time) | Azure (same region) |
| Key Vault secrets | Soft delete + purge protection | Automatic | 90 days | Azure |
| Application Insights | Azure retention | Automatic | 90 days (configurable) | Azure |
| Audit logs | Cosmos DB TTL | Automatic | 90 days | Azure |

### Backup Verification

| Test | Frequency | Procedure |
|------|-----------|-----------|
| Code restore | Monthly | Clone from GitHub, verify build |
| Bicep deployment | Quarterly | Deploy to test resource group |
| Cosmos DB restore | Semi-annually | Point-in-time restore to test account |
| Key Vault recovery | Semi-annually | Recover soft-deleted secret |
| Full DR test | Annually | Complete infrastructure rebuild from scratch |

---

## 2.4 Recovery Procedures

### Procedure 1: Rotate All Secrets After Compromise

```bash
# 1. Stop the Function App (prevent further compromise)
az functionapp stop --name ${APP} --resource-group ${RG}

# 2. Generate new Azure AD client secret
NEW_SECRET=$(az ad app credential reset --id ${CLIENT_ID} --query password -o tsv)

# 3. Regenerate Cosmos DB primary key
az cosmosdb keys regenerate --name ${COSMOS} --resource-group ${RG} --key-kind primary
NEW_COSMOS=$(az cosmosdb keys list --name ${COSMOS} --resource-group ${RG} \
  --type connection-strings --query 'connectionStrings[0].connectionString' -o tsv)

# 4. Generate new session secret
NEW_SESSION=$(openssl rand -hex 32)

# 5. Update Function App settings
az functionapp config appsettings set --name ${APP} --resource-group ${RG} \
  --settings \
  "AZURE_CLIENT_SECRET=${NEW_SECRET}" \
  "COSMOS_CONNECTION_STRING=${NEW_COSMOS}" \
  "SESSION_SECRET=${NEW_SESSION}"

# 6. Delete all sessions in Cosmos DB (forces re-auth)
# Use Azure Portal → Data Explorer → sessions container → delete all

# 7. Restart Function App
az functionapp start --name ${APP} --resource-group ${RG}

# 8. Verify health
curl https://${APP}.azurewebsites.net/api/health
```

### Procedure 2: Rebuild Infrastructure from Scratch

```bash
# 1. Create resource group
az group create --name ${RG} --location ${LOCATION}

# 2. Deploy infrastructure
az deployment group create \
  --resource-group ${RG} \
  --template-file infra/main.bicep \
  --parameters environmentName=${ENV} appName=msp-dm \
    frontendUrl=${FRONTEND_URL} \
    azureAdClientId=${CLIENT_ID} \
    azureAdClientSecret=${CLIENT_SECRET} \
    azureAdTenantId=${TENANT_ID}

# 3. Verify deployment
az deployment group show --resource-group ${RG} --name main

# 4. Deploy application code
git push origin main  # Triggers Static Web App deployment

# 5. Verify all services
curl https://${FUNCTION_APP}.azurewebsites.net/api/health
curl https://${STATIC_WEB_APP}.azurestaticapps.net/
```

### Procedure 3: Restore Cosmos DB from Backup

```bash
# 1. Identify restore point (timestamp)
# Use Application Insights to find last known good time

# 2. Initiate restore (Azure Portal)
# Cosmos DB → Restore → Point in Time
# Select timestamp
# Choose target account (new or existing)

# 3. Wait for restore completion (1-4 hours)

# 4. Update Function App connection string to restored account
az functionapp config appsettings set --name ${APP} --resource-group ${RG} \
  --settings "COSMOS_CONNECTION_STRING=${NEW_CONNECTION_STRING}"

# 5. Verify data integrity
curl https://${APP}.azurewebsites.net/api/health
```

### Procedure 4: Emergency Patch Deployment

```bash
# 1. Create hotfix branch
git checkout -b hotfix/security-fix main

# 2. Apply fix
# ... make changes ...

# 3. Commit and push
git add -A
git commit -m "Security hotfix: [description]"
git push origin hotfix/security-fix

# 4. Create PR (CI/CD security gates still run)
gh pr create --title "Security hotfix" --base main

# 5. If CI passes, merge immediately
gh pr merge --merge

# 6. Verify deployment
curl https://${APP}.azurewebsites.net/api/health
```

---

## 2.5 Testing Schedule

| Test | Frequency | Duration | Participants | Success Criteria |
|------|-----------|----------|-------------|-----------------|
| Health endpoint monitoring | Continuous | — | Automated | 200 response |
| Incident response tabletop | Quarterly | 2 hours | All roles | Scenario completed per SLAs |
| Component failover drill | Quarterly | 1 hour | Engineering | Recovery within RTO |
| Cosmos DB backup restore | Semi-annually | 4 hours | Engineering | Data restored, integrity verified |
| Full DR test | Annually | 8 hours | All roles | Complete rebuild, all services operational |
| Communication test | Semi-annually | 1 hour | All roles | Notifications sent within SLAs |
| Secret rotation drill | Quarterly | 30 minutes | Engineering | Secrets rotated, no downtime |

### Test Log Template

```
DR TEST LOG

Date: [DATE]
Test type: [Tabletop/Failover/Full DR/Backup restore]
Participants: [Names]
Scenario: [Description]

Results:
- Recovery achieved: [Yes/No]
- RTO met: [Yes/No] (Target: X, Actual: Y)
- RPO met: [Yes/No] (Target: X, Actual: Y)
- Issues found: [List]

Action items:
1. [Action] — Owner: [Name] — Due: [Date]
```

---

*Document maintained by: MSP Device Manager Engineering Team*
*Document owner: Incident Commander / Security Lead*
*Review cycle: Quarterly or after any P1/P2 incident*
*Next review: Q3 2026*
*Next DR test: Q3 2026*
