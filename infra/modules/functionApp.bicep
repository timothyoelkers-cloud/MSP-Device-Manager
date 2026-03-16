// MSP Device Manager — Azure Functions Module
// Deploys a Consumption-plan Function App with Node.js 18 runtime

// ── Parameters ──────────────────────────────────────────────────────────────

@description('Azure region')
param location string

@description('Resource naming prefix')
param resourcePrefix string

@description('Cosmos DB connection string')
@secure()
param cosmosConnectionString string

@description('Cosmos DB database name')
param cosmosDbName string

@description('Azure AD Client ID')
@secure()
param azureClientId string

@description('Azure AD Client Secret')
@secure()
param azureClientSecret string

@description('Key Vault URL')
param keyVaultUrl string

@description('Frontend URL for CORS')
param frontendUrl string

// ── Variables ───────────────────────────────────────────────────────────────

var functionAppName = '${resourcePrefix}-func'
var hostingPlanName = '${resourcePrefix}-plan'
var storageAccountName = replace('${resourcePrefix}st', '-', '')
var appInsightsName = '${resourcePrefix}-ai'
var logAnalyticsName = '${resourcePrefix}-law'

// ── Storage Account (required by Functions) ─────────────────────────────────

resource storageAccount 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  name: length(storageAccountName) > 24 ? substring(storageAccountName, 0, 24) : storageAccountName
  location: location
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    supportsHttpsTrafficOnly: true
    minimumTlsVersion: 'TLS1_2'
  }
  tags: {
    environment: resourcePrefix
    app: 'msp-device-manager'
  }
}

// ── Log Analytics Workspace ─────────────────────────────────────────────────

resource logAnalyticsWorkspace 'Microsoft.OperationalInsights/workspaces@2022-10-01' = {
  name: logAnalyticsName
  location: location
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
  }
  tags: {
    environment: resourcePrefix
    app: 'msp-device-manager'
  }
}

// ── Application Insights ────────────────────────────────────────────────────

resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: appInsightsName
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: logAnalyticsWorkspace.id
    RetentionInDays: 30
  }
  tags: {
    environment: resourcePrefix
    app: 'msp-device-manager'
  }
}

// ── Consumption Hosting Plan (Dynamic / Y1) ─────────────────────────────────

resource hostingPlan 'Microsoft.Web/serverfarms@2022-09-01' = {
  name: hostingPlanName
  location: location
  sku: {
    name: 'Y1'
    tier: 'Dynamic'
  }
  properties: {
    reserved: false
  }
  tags: {
    environment: resourcePrefix
    app: 'msp-device-manager'
  }
}

// ── Function App ────────────────────────────────────────────────────────────

resource functionApp 'Microsoft.Web/sites@2022-09-01' = {
  name: functionAppName
  location: location
  kind: 'functionapp'
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    serverFarmId: hostingPlan.id
    httpsOnly: true
    siteConfig: {
      nodeVersion: '~18'
      ftpsState: 'Disabled'
      minTlsVersion: '1.2'
      cors: {
        allowedOrigins: [
          frontendUrl
          'http://localhost:4280'
          'http://localhost:3000'
        ]
        supportCredentials: true
      }
      appSettings: [
        {
          name: 'AzureWebJobsStorage'
          value: 'DefaultEndpointsProtocol=https;AccountName=${storageAccount.name};EndpointSuffix=${environment().suffixes.storage};AccountKey=${storageAccount.listKeys().keys[0].value}'
        }
        {
          name: 'WEBSITE_CONTENTAZUREFILECONNECTIONSTRING'
          value: 'DefaultEndpointsProtocol=https;AccountName=${storageAccount.name};EndpointSuffix=${environment().suffixes.storage};AccountKey=${storageAccount.listKeys().keys[0].value}'
        }
        {
          name: 'WEBSITE_CONTENTSHARE'
          value: toLower(functionAppName)
        }
        {
          name: 'FUNCTIONS_EXTENSION_VERSION'
          value: '~4'
        }
        {
          name: 'FUNCTIONS_WORKER_RUNTIME'
          value: 'node'
        }
        {
          name: 'WEBSITE_NODE_DEFAULT_VERSION'
          value: '~18'
        }
        {
          name: 'APPINSIGHTS_INSTRUMENTATIONKEY'
          value: appInsights.properties.InstrumentationKey
        }
        {
          name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
          value: appInsights.properties.ConnectionString
        }
        {
          name: 'COSMOS_CONNECTION_STRING'
          value: cosmosConnectionString
        }
        {
          name: 'COSMOS_DATABASE_NAME'
          value: cosmosDbName
        }
        {
          name: 'AZURE_CLIENT_ID'
          value: azureClientId
        }
        {
          name: 'AZURE_CLIENT_SECRET'
          value: azureClientSecret
        }
        {
          name: 'KEY_VAULT_URL'
          value: keyVaultUrl
        }
        {
          name: 'FRONTEND_URL'
          value: frontendUrl
        }
      ]
    }
  }
  tags: {
    environment: resourcePrefix
    app: 'msp-device-manager'
  }
}

// ── Outputs ─────────────────────────────────────────────────────────────────

output functionAppUrl string = 'https://${functionApp.properties.defaultHostName}'
output functionAppName string = functionApp.name
output principalId string = functionApp.identity.principalId
