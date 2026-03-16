#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# MSP Device Manager — Infrastructure Deployment Script
# Deploys all Azure resources using Bicep templates
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

# ── Configuration ────────────────────────────────────────────────────────────

LOCATION="${LOCATION:-uksouth}"
ENVIRONMENT="${ENVIRONMENT:-prod}"
APP_NAME="${APP_NAME:-msp-dm}"
RESOURCE_GROUP="${RESOURCE_GROUP:-${APP_NAME}-${ENVIRONMENT}-rg}"
FRONTEND_URL="${FRONTEND_URL:-https://timothyoelkers-cloud.github.io}"

# These must be set before running (or passed as environment variables)
AZURE_CLIENT_ID="${AZURE_CLIENT_ID:-}"
AZURE_CLIENT_SECRET="${AZURE_CLIENT_SECRET:-}"

# ── Functions ────────────────────────────────────────────────────────────────

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

error() {
    echo "[ERROR] $1" >&2
    exit 1
}

# ── Pre-flight Checks ───────────────────────────────────────────────────────

log "Running pre-flight checks..."

# Check Azure CLI
command -v az > /dev/null 2>&1 || error "Azure CLI is not installed. See https://aka.ms/install-azure-cli"

# Check login
az account show > /dev/null 2>&1 || error "Not logged in to Azure CLI. Run 'az login' first."

# Check required parameters
if [ -z "$AZURE_CLIENT_ID" ]; then
    error "AZURE_CLIENT_ID is not set. Run create-app-registration.sh first."
fi

if [ -z "$AZURE_CLIENT_SECRET" ]; then
    error "AZURE_CLIENT_SECRET is not set. Run create-app-registration.sh first."
fi

SUBSCRIPTION_ID=$(az account show --query id -o tsv)
SUBSCRIPTION_NAME=$(az account show --query name -o tsv)

log "Subscription: $SUBSCRIPTION_NAME ($SUBSCRIPTION_ID)"
log "Resource Group: $RESOURCE_GROUP"
log "Location: $LOCATION"
log "Environment: $ENVIRONMENT"

# ── Create Resource Group ────────────────────────────────────────────────────

log "Creating resource group '$RESOURCE_GROUP' in '$LOCATION'..."

az group create \
    --name "$RESOURCE_GROUP" \
    --location "$LOCATION" \
    --tags environment="$ENVIRONMENT" app="msp-device-manager" \
    --output none

log "Resource group ready."

# ── Deploy Bicep Templates ──────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

log "Starting Bicep deployment (this may take several minutes)..."

DEPLOYMENT_OUTPUT=$(az deployment group create \
    --name "msp-dm-deploy-$(date +%Y%m%d%H%M%S)" \
    --resource-group "$RESOURCE_GROUP" \
    --template-file "${SCRIPT_DIR}/main.bicep" \
    --parameters \
        location="$LOCATION" \
        environmentName="$ENVIRONMENT" \
        appName="$APP_NAME" \
        frontendUrl="$FRONTEND_URL" \
        azureClientId="$AZURE_CLIENT_ID" \
        azureClientSecret="$AZURE_CLIENT_SECRET" \
    --query properties.outputs \
    --output json)

if [ $? -ne 0 ]; then
    error "Deployment failed. Check the Azure Portal for details."
fi

log "Deployment completed successfully."

# ── Parse Outputs ────────────────────────────────────────────────────────────

FUNCTION_APP_URL=$(echo "$DEPLOYMENT_OUTPUT" | python3 -c "import sys,json; print(json.load(sys.stdin)['functionAppUrl']['value'])" 2>/dev/null || echo "N/A")
STATIC_WEB_APP_URL=$(echo "$DEPLOYMENT_OUTPUT" | python3 -c "import sys,json; print(json.load(sys.stdin)['staticWebAppUrl']['value'])" 2>/dev/null || echo "N/A")
COSMOS_ENDPOINT=$(echo "$DEPLOYMENT_OUTPUT" | python3 -c "import sys,json; print(json.load(sys.stdin)['cosmosEndpoint']['value'])" 2>/dev/null || echo "N/A")
KEY_VAULT_URI=$(echo "$DEPLOYMENT_OUTPUT" | python3 -c "import sys,json; print(json.load(sys.stdin)['keyVaultUri']['value'])" 2>/dev/null || echo "N/A")

# ── Output Summary ───────────────────────────────────────────────────────────

echo ""
echo "════════════════════════════════════════════════════════════════════════"
echo "  MSP Device Manager — Deployment Complete"
echo "════════════════════════════════════════════════════════════════════════"
echo ""
echo "  Resource Group:     $RESOURCE_GROUP"
echo "  Location:           $LOCATION"
echo "  Environment:        $ENVIRONMENT"
echo ""
echo "  Endpoints:"
echo "    Function App:     $FUNCTION_APP_URL"
echo "    Static Web App:   $STATIC_WEB_APP_URL"
echo "    Cosmos DB:        $COSMOS_ENDPOINT"
echo "    Key Vault:        $KEY_VAULT_URI"
echo ""
echo "  Next Steps:"
echo "    1. Link the Static Web App to your GitHub repository:"
echo "       az staticwebapp create --name ${APP_NAME}-${ENVIRONMENT}-swa \\"
echo "         --resource-group $RESOURCE_GROUP \\"
echo "         --source https://github.com/timothyoelkers-cloud/MSP-Device-Manager \\"
echo "         --branch main --login-with-github"
echo ""
echo "    2. Store secrets in Key Vault:"
echo "       az keyvault secret set --vault-name ${APP_NAME}-${ENVIRONMENT}-kv \\"
echo "         --name 'CosmosConnectionString' --value '<connection-string>'"
echo ""
echo "    3. Update the frontend auth.js with:"
echo "       Client ID: $AZURE_CLIENT_ID"
echo "       API URL:   $FUNCTION_APP_URL"
echo ""
echo "    4. Deploy Function App code:"
echo "       cd api && func azure functionapp publish ${APP_NAME}-${ENVIRONMENT}-func"
echo ""
echo "    5. Verify CORS settings in the Azure Portal if using a custom domain"
echo ""
echo "════════════════════════════════════════════════════════════════════════"
