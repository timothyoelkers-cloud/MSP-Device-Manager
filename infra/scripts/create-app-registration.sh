#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# MSP Device Manager — Azure AD App Registration Script
# Creates a multi-tenant app registration with required Graph API permissions
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

# ── Configuration ────────────────────────────────────────────────────────────

APP_NAME="${APP_NAME:-MSP Device Manager}"
PRODUCTION_URL="${PRODUCTION_URL:-https://timothyoelkers-cloud.github.io/MSP-Device-Manager}"

# Microsoft Graph API well-known App ID
GRAPH_API_ID="00000003-0000-0000-c000-000000000000"

# Required Graph API permission IDs (Application permissions)
# DeviceManagementManagedDevices.ReadWrite.All
PERM_DEVICE_MGMT_DEVICES="243333ab-4d21-40cb-a475-36241daa0842"
# DeviceManagementConfiguration.ReadWrite.All
PERM_DEVICE_MGMT_CONFIG="9241abd9-d0e6-425a-bd4f-47ba86d767a4"
# User.Read.All
PERM_USER_READ="df021288-bdef-4463-88db-98f22de89214"
# Directory.Read.All
PERM_DIRECTORY_READ="7ab1d382-f21e-4acd-a863-ba3e13f7da61"
# AuditLog.Read.All
PERM_AUDIT_LOG="b0afded3-3588-46d8-8b3d-9842eff778da"

# ── Functions ────────────────────────────────────────────────────────────────

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

error() {
    echo "[ERROR] $1" >&2
    exit 1
}

# ── Pre-flight Checks ───────────────────────────────────────────────────────

log "Checking Azure CLI authentication..."
az account show > /dev/null 2>&1 || error "Not logged in to Azure CLI. Run 'az login' first."

TENANT_ID=$(az account show --query tenantId -o tsv)
log "Using tenant: $TENANT_ID"

# ── Create App Registration ─────────────────────────────────────────────────

log "Creating multi-tenant app registration: $APP_NAME"

APP_ID=$(az ad app create \
    --display-name "$APP_NAME" \
    --sign-in-audience "AzureADMultipleOrgs" \
    --web-redirect-uris \
        "http://localhost:4280/auth/callback" \
        "http://localhost:3000/auth/callback" \
        "${PRODUCTION_URL}/auth/callback" \
    --query appId -o tsv)

if [ -z "$APP_ID" ]; then
    error "Failed to create app registration"
fi

log "App Registration created. Client ID: $APP_ID"

# ── Get the Object ID ───────────────────────────────────────────────────────

APP_OBJECT_ID=$(az ad app show --id "$APP_ID" --query id -o tsv)
log "App Object ID: $APP_OBJECT_ID"

# ── Add Required API Permissions ─────────────────────────────────────────────

log "Adding Microsoft Graph API permissions..."

az ad app permission add \
    --id "$APP_ID" \
    --api "$GRAPH_API_ID" \
    --api-permissions \
        "${PERM_DEVICE_MGMT_DEVICES}=Role" \
        "${PERM_DEVICE_MGMT_CONFIG}=Role" \
        "${PERM_USER_READ}=Role" \
        "${PERM_DIRECTORY_READ}=Role" \
        "${PERM_AUDIT_LOG}=Role"

log "API permissions added."

# ── Create Client Secret ────────────────────────────────────────────────────

log "Creating client secret (valid for 2 years)..."

CLIENT_SECRET=$(az ad app credential reset \
    --id "$APP_ID" \
    --display-name "msp-dm-infra-secret" \
    --years 2 \
    --query password -o tsv)

if [ -z "$CLIENT_SECRET" ]; then
    error "Failed to create client secret"
fi

log "Client secret created."

# ── Grant Admin Consent ──────────────────────────────────────────────────────

log "Granting admin consent for API permissions..."
log "Note: This may take a few seconds to propagate."

# Create service principal first (required for consent)
az ad sp create --id "$APP_ID" > /dev/null 2>&1 || true

sleep 5

az ad app permission admin-consent --id "$APP_ID" || {
    log "WARNING: Admin consent could not be granted automatically."
    log "Please grant consent manually in the Azure Portal:"
    log "  Azure AD > App registrations > $APP_NAME > API permissions > Grant admin consent"
}

# ── Output ───────────────────────────────────────────────────────────────────

echo ""
echo "════════════════════════════════════════════════════════════════════════"
echo "  MSP Device Manager — App Registration Complete"
echo "════════════════════════════════════════════════════════════════════════"
echo ""
echo "  Client ID:     $APP_ID"
echo "  Client Secret: $CLIENT_SECRET"
echo "  Tenant ID:     $TENANT_ID"
echo ""
echo "  IMPORTANT: Save the client secret now — it cannot be retrieved later."
echo ""
echo "  Required API Permissions (Application):"
echo "    - DeviceManagementManagedDevices.ReadWrite.All"
echo "    - DeviceManagementConfiguration.ReadWrite.All"
echo "    - User.Read.All"
echo "    - Directory.Read.All"
echo "    - AuditLog.Read.All"
echo ""
echo "  Redirect URIs:"
echo "    - http://localhost:4280/auth/callback  (dev)"
echo "    - http://localhost:3000/auth/callback  (dev)"
echo "    - ${PRODUCTION_URL}/auth/callback      (prod)"
echo ""
echo "  Next Steps:"
echo "    1. Store the client secret in Azure Key Vault"
echo "    2. Update deploy.sh with the Client ID"
echo "    3. Run deploy.sh to deploy infrastructure"
echo ""
echo "════════════════════════════════════════════════════════════════════════"
