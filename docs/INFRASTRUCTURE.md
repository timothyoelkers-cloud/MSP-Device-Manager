# Infrastructure & Deployment Guide

> MSP Device Manager — Azure Infrastructure Documentation
> Document Version: 1.0 | Last Updated: 2026-03-17 | Classification: Internal

---

## Table of Contents

1. [Infrastructure Overview](#1-infrastructure-overview)
2. [Infrastructure as Code (Bicep)](#2-infrastructure-as-code-bicep)
3. [Deployment Process](#3-deployment-process)
4. [Environment Configuration](#4-environment-configuration)
5. [Security Configuration](#5-security-configuration)
6. [Disaster Recovery](#6-disaster-recovery)
7. [Scaling](#7-scaling)
8. [Cost Estimation](#8-cost-estimation)
9. [Operational Runbook](#9-operational-runbook)
10. [Monitoring & Alerting](#10-monitoring--alerting)

---

## 1. Infrastructure Overview

### Azure Services

```
┌─────────────────────────────────────────────────────────┐
│                    Resource Group                        │
│                  (msp-dm-{env}-rg)                      │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Static Web   │  │ Function App │  │ Cosmos DB    │  │
│  │ App (Free)   │  │ (Consumption)│  │ (Serverless) │  │
│  │              │  │              │  │              │  │
│  │ Frontend SPA │  │ Backend API  │  │ 6 containers │  │
│  │ Azure CDN    │  │ Node.js 18   │  │ Auto-index   │  │
│  │ Custom domain│  │ Managed ID   │  │ TTL purge    │  │
│  └──────────────┘  └──────┬───────┘  └──────────────┘  │
│                           │                              │
│  ┌──────────────┐  ┌──────┴───────┐  ┌──────────────┐  │
│  │ Key Vault    │  │ Storage Acct │  │ App Insights │  │
│  │ (Standard)   │  │ (LRS)        │  │ + Log        │  │
│  │              │  │              │  │ Analytics    │  │
│  │ Soft delete  │  │ Functions    │  │              │  │
│  │ Purge protect│  │ runtime      │  │ Telemetry    │  │
│  │ Managed ID   │  │ storage      │  │ Error track  │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Service Summary

| Service | SKU/Tier | Purpose | SLA |
|---------|----------|---------|-----|
| Azure Static Web Apps | Free | Frontend SPA hosting with global CDN | 99.95% |
| Azure Functions | Consumption (Y1) | Serverless backend API | 99.95% |
| Azure Cosmos DB | Serverless | NoSQL document database | 99.99% |
| Azure Key Vault | Standard | Secrets management (refresh tokens) | 99.99% |
| Azure Storage Account | Standard LRS | Functions runtime storage | 99.9% |
| Application Insights | Pay-as-you-go | Application monitoring and telemetry | 99.9% |
| Log Analytics Workspace | Pay-as-you-go | Infrastructure log aggregation | 99.9% |

---

## 2. Infrastructure as Code (Bicep)

### File Structure

```
infra/
├── main.bicep                          # Orchestration template
├── deploy.sh                           # One-command deployment script
├── modules/
│   ├── cosmos.bicep                    # Cosmos DB account + database + containers
│   ├── functionApp.bicep               # Function App + plan + storage + insights
│   ├── keyVault.bicep                  # Key Vault + access policies
│   └── staticWebApp.bicep             # Static Web App + custom domain
└── scripts/
    └── create-app-registration.sh      # Azure AD app registration
```

### Main Template (`main.bicep`)

**Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `location` | string | `uksouth` | Azure region for all resources |
| `environmentName` | string | `dev` | Environment: dev, staging, prod |
| `appName` | string | `msp-dm` | Base name for all resources |
| `frontendUrl` | string | — | Production frontend URL (for CORS) |
| `azureAdClientId` | string | — | Azure AD app registration client ID |
| `azureAdClientSecret` | securestring | — | Azure AD app registration secret |
| `azureAdTenantId` | string | — | Azure AD directory tenant ID |

**Outputs:**

| Output | Description |
|--------|-------------|
| `functionAppUrl` | Backend API base URL |
| `staticWebAppUrl` | Frontend URL |
| `cosmosEndpoint` | Cosmos DB endpoint |
| `keyVaultUri` | Key Vault URI |

### Cosmos DB Module (`cosmos.bicep`)

| Setting | Value | Rationale |
|---------|-------|-----------|
| Capacity Mode | Serverless | Pay-per-request, auto-scaling, cost-effective for variable workloads |
| Consistency | Session | Read-your-writes guarantee within session |
| Encryption | Azure-managed keys (AES-256) | Default encryption at rest |
| Backup | Continuous (30-day retention) | Point-in-time restore capability |

**Containers:**

| Container | Partition Key | TTL | Indexing |
|-----------|--------------|-----|---------|
| `customers` | `/id` | None | Automatic |
| `tenants` | `/customerId` | None | Automatic |
| `sessions` | `/userId` | 86,400s (24h) | Automatic |
| `auditLog` | `/customerId` | 7,776,000s (90d) | Automatic |
| `consents` | `/customerId` | None | Automatic |
| `securityAlerts` | `/customerId` | 15,552,000s (180d) | Automatic |

### Function App Module (`functionApp.bicep`)

| Setting | Value | Rationale |
|---------|-------|-----------|
| Plan | Consumption (Y1) | Auto-scales 0–200 instances, pay per execution |
| Runtime | Node.js 18 | LTS with active security support |
| Identity | System-assigned managed identity | No stored credentials for Azure services |
| CORS | Specific origins only | Restrict cross-origin access |
| HTTPS Only | true | No HTTP connections accepted |

**Managed Identity Permissions:**
- Key Vault: `get`, `set`, `delete`, `list` (secrets only)
- No direct Cosmos DB RBAC (connection string used)

### Key Vault Module (`keyVault.bicep`)

| Setting | Value | Rationale |
|---------|-------|-----------|
| SKU | Standard | HSM-backed, sufficient for secret storage |
| Soft Delete | Enabled (90 days) | Recoverable deletion protection |
| Purge Protection | Enabled | Prevents permanent deletion within retention |
| Access Model | Access policies (not RBAC) | Simpler configuration for single-app access |
| Network | Azure backbone only | No public endpoint needed |

### Static Web App Module (`staticWebApp.bicep`)

| Setting | Value | Rationale |
|---------|-------|-----------|
| SKU | Free | Sufficient for SPA hosting with CDN |
| Build | App location `/`, API location `api`, output `/` | Integrated frontend + API deployment |
| Custom Domain | Optional parameter | Production domain support |

---

## 3. Deployment Process

### Prerequisites

| Requirement | Minimum Version | Purpose |
|-------------|----------------|---------|
| Azure CLI | 2.50+ | Resource management |
| Azure subscription | Contributor role | Resource creation |
| Node.js | 18 LTS | Backend API runtime |
| GitHub account | — | Repository access and CI/CD |
| Azure Functions Core Tools | 4.x | Local development |
| SWA CLI | 1.x | Local full-stack development |

### Step 1: Azure App Registration

Run `infra/scripts/create-app-registration.sh`:

```bash
# Creates multi-tenant app registration with:
# - Redirect URIs for local and production
# - Microsoft Graph API permissions:
#   - DeviceManagementManagedDevices.ReadWrite.All
#   - DeviceManagementConfiguration.ReadWrite.All
#   - DeviceManagementApps.ReadWrite.All
#   - Directory.Read.All
#   - User.Read.All
#   - Group.ReadWrite.All
# - Client secret (12-month expiry)
# Outputs: clientId, clientSecret, tenantId
```

**Security notes:**
- Store client secret securely — it will be placed in Key Vault via Bicep
- Set a calendar reminder for secret rotation (12-month expiry)
- Use least-privilege Graph permissions for your use case

### Step 2: Infrastructure Deployment

Run `infra/deploy.sh`:

```bash
#!/bin/bash
# 1. Creates resource group (msp-dm-{env}-rg)
# 2. Deploys Bicep templates (main.bicep → all modules)
# 3. Configures Function App environment variables
# 4. Outputs all service URLs and connection details

az deployment group create \
  --resource-group "msp-dm-${ENV}-rg" \
  --template-file infra/main.bicep \
  --parameters \
    environmentName="${ENV}" \
    appName="msp-dm" \
    frontendUrl="${FRONTEND_URL}" \
    azureAdClientId="${CLIENT_ID}" \
    azureAdClientSecret="${CLIENT_SECRET}" \
    azureAdTenantId="${TENANT_ID}"
```

### Step 3: Application Deployment

**Option A: GitHub Integration (recommended)**
1. Connect Azure Static Web Apps to GitHub repository
2. Push to `main` branch triggers automatic deployment
3. Frontend and API deploy together

**Option B: Manual deployment**
```bash
# Install dependencies
cd api && npm ci --production

# Deploy via SWA CLI
swa deploy --app-location "/" --api-location "api"
```

### Step 4: Post-Deployment Verification

```bash
# 1. Health check
curl https://{functionapp}.azurewebsites.net/api/health

# 2. CORS verification (should fail)
curl -H "Origin: https://evil.com" \
     https://{functionapp}.azurewebsites.net/api/health

# 3. Rate limiting verification
for i in $(seq 1 12); do
  curl -s -o /dev/null -w "%{http_code}\n" \
    https://{functionapp}.azurewebsites.net/api/auth/login
done
# Should see 429 after 10 requests

# 4. Frontend loads
curl -s -o /dev/null -w "%{http_code}\n" \
  https://{staticwebapp}.azurestaticapps.net
```

---

## 4. Environment Configuration

### Function App Environment Variables

| Variable | Source | Description | Sensitive |
|----------|--------|-------------|-----------|
| `COSMOS_CONNECTION_STRING` | Bicep output | Cosmos DB connection string | Yes |
| `COSMOS_DATABASE_NAME` | Configuration | Database name (`msp-device-manager`) | No |
| `AZURE_CLIENT_ID` | App registration | Azure AD application ID | No |
| `AZURE_CLIENT_SECRET` | App registration | Azure AD client secret | Yes |
| `AZURE_TENANT_ID` | App registration | Azure AD directory ID | No |
| `KEY_VAULT_URI` | Bicep output | Key Vault endpoint URL | No |
| `FRONTEND_URL` | Configuration | Frontend URL for CORS and redirects | No |
| `SESSION_SECRET` | Generated | Session signing key (32+ characters) | Yes |
| `NODE_ENV` | Configuration | `production` or `development` | No |

### Local Development (`local.settings.json`)

```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "COSMOS_CONNECTION_STRING": "<local-cosmos-emulator-or-connection>",
    "COSMOS_DATABASE_NAME": "msp-device-manager",
    "AZURE_CLIENT_ID": "<from-app-registration>",
    "AZURE_CLIENT_SECRET": "<from-app-registration>",
    "AZURE_TENANT_ID": "<from-app-registration>",
    "KEY_VAULT_URI": "https://<vault-name>.vault.azure.net/",
    "FRONTEND_URL": "http://localhost:4280",
    "SESSION_SECRET": "<generated-secret>"
  }
}
```

> **Note**: `local.settings.json` is gitignored and must never be committed.

---

## 5. Security Configuration

### Network Security

| Service | Access Control | Notes |
|---------|---------------|-------|
| Static Web App | Public (CDN) | Frontend is publicly accessible |
| Function App | HTTPS only | No HTTP, CORS restricted |
| Cosmos DB | Connection string auth | Consider Key Vault reference |
| Key Vault | Managed identity only | Access policies restrict to Function App |
| Storage Account | Function App only | Internal runtime storage |

### Identity & Access

| Principal | Service | Permissions | Method |
|-----------|---------|------------|--------|
| Function App (managed identity) | Key Vault | Secret: get, set, delete, list | Access policy |
| Function App (connection string) | Cosmos DB | Full database access | Connection string |
| GitHub Actions | Static Web App | Deployment | Deployment token |
| Engineering team | Azure Portal | Contributor | Azure RBAC |

### Security Hardening Checklist

- [x] HTTPS only on Function App
- [x] Managed identity for Key Vault access
- [x] Soft delete and purge protection on Key Vault
- [x] Cosmos DB encryption at rest
- [x] CORS restricted to specific origins
- [x] Security headers on all API responses
- [x] Rate limiting on all endpoints
- [x] CI/CD security gates (CodeQL, npm audit, TruffleHog)
- [ ] Cosmos DB firewall (restrict to Function App VNet) — Planned
- [ ] Azure Front Door + WAF — Planned
- [ ] Key Vault reference for Cosmos DB connection string — Planned
- [ ] Azure Policy for compliance governance — Planned

---

## 6. Disaster Recovery

### RPO/RTO Targets

| Component | RPO (Data Loss) | RTO (Downtime) | Recovery Method |
|-----------|-----------------|----------------|-----------------|
| Frontend (Static Web App) | 0 (git repo) | 10 minutes | Redeploy from GitHub |
| Backend (Function App) | 0 (git repo) | 15 minutes | Redeploy from GitHub/Bicep |
| Database (Cosmos DB) | ~30 minutes | 1–4 hours | Point-in-time restore |
| Secrets (Key Vault) | 0 (soft delete) | 5 minutes | Recover deleted secrets |
| Infrastructure | 0 (Bicep in git) | 30 minutes | Full Bicep redeployment |

### Recovery Scenarios

**Scenario 1: Function App failure**
- Detection: Health endpoint returns 503, Application Insights alerts
- Recovery: Consumption plan auto-restarts; if persistent, redeploy via `swa deploy`
- RTO: < 5 minutes (auto), < 15 minutes (manual)

**Scenario 2: Cosmos DB data corruption**
- Detection: Application errors, data inconsistency
- Recovery: Point-in-time restore to last known good state
- Steps: Azure Portal → Cosmos DB → Restore → Select timestamp
- RTO: 1–4 hours (depending on data volume)
- RPO: ~30 minutes (continuous backup granularity)

**Scenario 3: Key Vault secret compromise**
- Detection: Unauthorized access alerts, unusual token usage
- Recovery: 1. Rotate all secrets 2. Revoke all sessions 3. Generate new client secret
- Steps: See Runbook section 9.1

**Scenario 4: Complete infrastructure loss**
- Detection: All services unreachable
- Recovery: Full rebuild from git + Bicep
- Steps:
  1. `az group create` (new resource group)
  2. `infra/deploy.sh` (Bicep deployment)
  3. Cosmos DB restore (if data needed)
  4. `git push` to trigger Static Web App deployment
- RTO: ~30 minutes

**Scenario 5: Azure region outage**
- Detection: Azure status page, all services in region unavailable
- Recovery: Redeploy to alternate region
- Steps:
  1. Update `location` parameter in Bicep
  2. Run `infra/deploy.sh` targeting new region
  3. Cosmos DB: manual failover or restore from backup
  4. Update DNS (custom domain) to new Static Web App
- RTO: ~1 hour
- Note: Consider pre-provisioning secondary region for critical workloads

---

## 7. Scaling

### Automatic Scaling

| Service | Scaling Model | Limits | Action Required |
|---------|--------------|--------|-----------------|
| Static Web App | Azure CDN (global) | Unlimited (CDN) | None |
| Function App | Consumption auto-scale | 0–200 instances | None (automatic) |
| Cosmos DB | Serverless auto-scale | Up to 5,000 RU/s burst | None (automatic) |
| Key Vault | Azure managed | 1,000 transactions/10s | None (cached in app) |

### Growth Considerations

| Users | Consideration | Action |
|-------|-------------|--------|
| < 100 | Current architecture sufficient | None |
| 100–500 | Monitor Cosmos DB RU consumption | Consider provisioned throughput |
| 500–1,000 | Monitor Function App cold starts | Consider Premium plan |
| 1,000+ | Multi-region needed | Deploy Cosmos DB multi-region + secondary Functions |

---

## 8. Cost Estimation

### Monthly Cost (Low Usage — < 50 users)

| Service | Tier | Estimated Cost |
|---------|------|---------------|
| Static Web Apps | Free | $0.00 |
| Functions | Consumption (1M executions free) | $0.00 |
| Cosmos DB | Serverless (< 1M RU) | $0.50–$5.00 |
| Key Vault | Standard (< 10K operations) | $0.03–$0.30 |
| Application Insights | Pay-as-you-go (< 5GB) | $0.00 (5GB free) |
| Storage Account | LRS (< 1GB) | $0.02 |
| **Total** | | **~$1–$6/month** |

### Monthly Cost (Medium Usage — 50–500 users)

| Service | Tier | Estimated Cost |
|---------|------|---------------|
| Static Web Apps | Free | $0.00 |
| Functions | Consumption (1–10M executions) | $0.00–$2.00 |
| Cosmos DB | Serverless (1–10M RU) | $5.00–$25.00 |
| Key Vault | Standard | $0.30–$1.00 |
| Application Insights | Pay-as-you-go | $2.00–$10.00 |
| Storage Account | LRS | $0.50 |
| **Total** | | **~$8–$39/month** |

### Monthly Cost (High Usage — 500+ users)

| Service | Tier | Estimated Cost |
|---------|------|---------------|
| Static Web Apps | Standard ($9/month) | $9.00 |
| Functions | Premium (EP1) | $150.00 |
| Cosmos DB | Provisioned (400 RU/s) | $24.00 |
| Key Vault | Standard | $1.00–$3.00 |
| Application Insights | Pay-as-you-go | $10.00–$50.00 |
| Storage Account | LRS | $1.00 |
| Azure Front Door | Standard | $35.00 |
| **Total** | | **~$230–$270/month** |

---

## 9. Operational Runbook

### 9.1 Rotating Azure AD Client Secret

```bash
# 1. Generate new secret in Azure Portal or CLI
az ad app credential reset --id ${CLIENT_ID}

# 2. Update Function App setting
az functionapp config appsettings set \
  --name ${FUNCTION_APP_NAME} \
  --resource-group ${RESOURCE_GROUP} \
  --settings "AZURE_CLIENT_SECRET=<new-secret>"

# 3. Verify API health
curl https://${FUNCTION_APP}.azurewebsites.net/api/health

# 4. Remove old secret from app registration
# (keep for 24h for in-flight requests, then delete)
```

### 9.2 Rotating Cosmos DB Keys

```bash
# 1. Regenerate primary key
az cosmosdb keys regenerate \
  --name ${COSMOS_ACCOUNT} \
  --resource-group ${RESOURCE_GROUP} \
  --key-kind primary

# 2. Get new connection string
az cosmosdb keys list \
  --name ${COSMOS_ACCOUNT} \
  --resource-group ${RESOURCE_GROUP} \
  --type connection-strings

# 3. Update Function App setting
az functionapp config appsettings set \
  --name ${FUNCTION_APP_NAME} \
  --resource-group ${RESOURCE_GROUP} \
  --settings "COSMOS_CONNECTION_STRING=<new-connection-string>"
```

### 9.3 Revoking All User Sessions

```bash
# Via Cosmos DB query (Azure Portal → Data Explorer)
# Delete all documents in 'sessions' container
# This forces all users to re-authenticate

# Or via API (if accessible):
# Each user's logout endpoint deletes their sessions
```

### 9.4 Adding a New CORS Origin

```bash
# Update Function App CORS
az functionapp cors add \
  --name ${FUNCTION_APP_NAME} \
  --resource-group ${RESOURCE_GROUP} \
  --allowed-origins "https://new-domain.com"

# Also update host.json CORS section and redeploy
```

### 9.5 Viewing Application Logs

```bash
# Real-time streaming
az webapp log tail \
  --name ${FUNCTION_APP_NAME} \
  --resource-group ${RESOURCE_GROUP}

# Application Insights query
az monitor app-insights query \
  --app ${APP_INSIGHTS_NAME} \
  --resource-group ${RESOURCE_GROUP} \
  --analytics-query "requests | where success == false | top 20 by timestamp desc"
```

### 9.6 Emergency: Disable API Access

```bash
# Stop Function App (immediate, all endpoints down)
az functionapp stop \
  --name ${FUNCTION_APP_NAME} \
  --resource-group ${RESOURCE_GROUP}

# Restart when ready
az functionapp start \
  --name ${FUNCTION_APP_NAME} \
  --resource-group ${RESOURCE_GROUP}
```

---

## 10. Monitoring & Alerting

### Recommended Azure Monitor Alerts

| Alert | Condition | Severity | Action |
|-------|-----------|----------|--------|
| API errors spike | HTTP 5xx > 10 in 5 minutes | Critical | Page on-call |
| High latency | P95 response time > 5 seconds | Warning | Notify team |
| Auth failures | 401 responses > 50 in 5 minutes | Warning | Investigate |
| Rate limiting triggered | 429 responses > 100 in 5 minutes | Warning | Check for abuse |
| Cosmos DB throttling | 429 from Cosmos > 10 in 5 minutes | Warning | Review RU capacity |
| Health check failure | `/api/health` returns 503 | Critical | Page on-call |
| Function App stopped | Function app state ≠ running | Critical | Auto-restart |
| Key Vault errors | Key Vault operations failing | Critical | Check access policies |

### Application Insights Dashboards

| Dashboard | Metrics |
|-----------|---------|
| API Performance | Request rate, latency (P50/P95/P99), error rate |
| Authentication | Login success/fail rate, session creation rate |
| Graph Proxy | Calls per tenant, Graph API latency, retry rate |
| Security | Failed auth attempts, rate limit triggers, blocked requests |

---

*Document maintained by: MSP Device Manager Engineering Team*
*Review cycle: Quarterly or after infrastructure changes*
*Next review: Q3 2026*
