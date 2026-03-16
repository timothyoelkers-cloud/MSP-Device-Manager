// MSP Device Manager — Main Infrastructure Template
// Deploys all Azure resources for the backend

targetScope = 'resourceGroup'

// ── Parameters ──────────────────────────────────────────────────────────────

@description('Azure region for all resources')
param location string = 'uksouth'

@description('Environment name (dev, staging, prod)')
@allowed(['dev', 'staging', 'prod'])
param environmentName string = 'prod'

@description('Base application name')
param appName string = 'msp-dm'

@description('Frontend URL for CORS (e.g. https://timothyoelkers-cloud.github.io)')
param frontendUrl string = 'https://timothyoelkers-cloud.github.io'

@description('Azure AD App Registration Client ID')
@secure()
param azureClientId string

@description('Azure AD App Registration Client Secret')
@secure()
param azureClientSecret string

@description('Optional custom domain for Static Web App')
param customDomain string = ''

// ── Variables ───────────────────────────────────────────────────────────────

var resourcePrefix = '${appName}-${environmentName}'
var cosmosDbName = 'mspdevicemanager'
// Pre-compute Key Vault name to break circular dependency
// (Function App needs KV URL; Key Vault needs Function App principal ID)
var kvNameRaw = replace('${resourcePrefix}-kv', '--', '-')
var kvName = length(kvNameRaw) > 24 ? substring(kvNameRaw, 0, 24) : kvNameRaw
var keyVaultUrl = 'https://${kvName}${environment().suffixes.keyvaultDns}/'

// ── Modules ─────────────────────────────────────────────────────────────────

module cosmos 'modules/cosmos.bicep' = {
  name: '${resourcePrefix}-cosmos'
  params: {
    location: location
    resourcePrefix: resourcePrefix
    databaseName: cosmosDbName
  }
}

module staticWebApp 'modules/staticWebApp.bicep' = {
  name: '${resourcePrefix}-swa'
  params: {
    location: location
    resourcePrefix: resourcePrefix
    customDomain: customDomain
  }
}

module functionApp 'modules/functionApp.bicep' = {
  name: '${resourcePrefix}-func'
  params: {
    location: location
    resourcePrefix: resourcePrefix
    cosmosConnectionString: cosmos.outputs.connectionString
    cosmosDbName: cosmosDbName
    azureClientId: azureClientId
    azureClientSecret: azureClientSecret
    frontendUrl: frontendUrl
    keyVaultUrl: keyVaultUrl
  }
}

module keyVault 'modules/keyVault.bicep' = {
  name: '${resourcePrefix}-kv'
  params: {
    location: location
    resourcePrefix: resourcePrefix
    functionAppPrincipalId: functionApp.outputs.principalId
  }
}

// ── Outputs ─────────────────────────────────────────────────────────────────

output functionAppUrl string = functionApp.outputs.functionAppUrl
output staticWebAppUrl string = staticWebApp.outputs.staticWebAppUrl
output cosmosEndpoint string = cosmos.outputs.endpoint
output keyVaultUri string = keyVault.outputs.vaultUri
