// MSP Device Manager — Main Infrastructure Template
// Deploys all Azure resources: VNet, Cosmos DB, Key Vault, Redis, Service Bus,
// Function App, Static Web App, Front Door + WAF

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

@description('Enable VNet isolation with private endpoints')
param enableVnet bool = true

@description('Redis SKU')
@allowed(['Basic', 'Standard', 'Premium'])
param redisSku string = 'Standard'

@description('Service Bus SKU')
@allowed(['Basic', 'Standard', 'Premium'])
param serviceBusSku string = 'Standard'

// ── Variables ───────────────────────────────────────────────────────────────

var resourcePrefix = '${appName}-${environmentName}'
var cosmosDbName = 'mspdevicemanager'
var kvNameRaw = replace('${resourcePrefix}-kv', '--', '-')
var kvName = length(kvNameRaw) > 24 ? substring(kvNameRaw, 0, 24) : kvNameRaw
var keyVaultUrl = 'https://${kvName}${environment().suffixes.keyvaultDns}/'

// ── Network ─────────────────────────────────────────────────────────────────

module vnet 'modules/vnet.bicep' = if (enableVnet) {
  name: '${resourcePrefix}-vnet'
  params: {
    location: location
    resourcePrefix: resourcePrefix
  }
}

// ── Data Layer ──────────────────────────────────────────────────────────────

module cosmos 'modules/cosmos.bicep' = {
  name: '${resourcePrefix}-cosmos'
  params: {
    location: location
    resourcePrefix: resourcePrefix
    databaseName: cosmosDbName
  }
}

module redis 'modules/redis.bicep' = {
  name: '${resourcePrefix}-redis'
  params: {
    location: location
    resourcePrefix: resourcePrefix
    skuName: redisSku
    privateEndpointSubnetId: enableVnet ? vnet.outputs.privateEndpointSubnetId : ''
    redisDnsZoneId: enableVnet ? vnet.outputs.redisDnsZoneId : ''
  }
}

// ── Messaging ───────────────────────────────────────────────────────────────

module serviceBus 'modules/serviceBus.bicep' = {
  name: '${resourcePrefix}-sb'
  params: {
    location: location
    resourcePrefix: resourcePrefix
    skuName: serviceBusSku
    privateEndpointSubnetId: enableVnet ? vnet.outputs.privateEndpointSubnetId : ''
    serviceBusDnsZoneId: enableVnet ? vnet.outputs.serviceBusDnsZoneId : ''
  }
}

// ── Frontend ────────────────────────────────────────────────────────────────

module staticWebApp 'modules/staticWebApp.bicep' = {
  name: '${resourcePrefix}-swa'
  params: {
    location: location
    resourcePrefix: resourcePrefix
    customDomain: customDomain
  }
}

// ── Backend ─────────────────────────────────────────────────────────────────

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

// ── Secrets ─────────────────────────────────────────────────────────────────

module keyVault 'modules/keyVault.bicep' = {
  name: '${resourcePrefix}-kv'
  params: {
    location: location
    resourcePrefix: resourcePrefix
    functionAppPrincipalId: functionApp.outputs.principalId
  }
}

// ── Edge / CDN / WAF ────────────────────────────────────────────────────────

module frontDoor 'modules/frontDoor.bicep' = {
  name: '${resourcePrefix}-fd'
  params: {
    resourcePrefix: resourcePrefix
    functionAppHostname: replace(replace(functionApp.outputs.functionAppUrl, 'https://', ''), '/', '')
    staticWebAppHostname: replace(replace(staticWebApp.outputs.staticWebAppUrl, 'https://', ''), '/', '')
    customDomain: customDomain
  }
}

// ── Outputs ─────────────────────────────────────────────────────────────────

output functionAppUrl string = functionApp.outputs.functionAppUrl
output staticWebAppUrl string = staticWebApp.outputs.staticWebAppUrl
output frontDoorEndpoint string = frontDoor.outputs.frontDoorEndpoint
output cosmosEndpoint string = cosmos.outputs.endpoint
output keyVaultUri string = keyVault.outputs.vaultUri
output redisHostName string = redis.outputs.redisHostName
output serviceBusNamespace string = serviceBus.outputs.serviceBusNamespace
output vnetId string = enableVnet ? vnet.outputs.vnetId : 'disabled'
