// MSP Device Manager — Azure Key Vault Module
// Deploys a Key Vault with access policies for the Function App

// ── Parameters ──────────────────────────────────────────────────────────────

@description('Azure region')
param location string

@description('Resource naming prefix')
param resourcePrefix string

@description('Function App managed identity principal ID')
param functionAppPrincipalId string

// ── Variables ───────────────────────────────────────────────────────────────

var vaultName = replace('${resourcePrefix}-kv', '--', '-')

// ── Key Vault ───────────────────────────────────────────────────────────────

resource keyVault 'Microsoft.KeyVault/vaults@2023-02-01' = {
  name: length(vaultName) > 24 ? substring(vaultName, 0, 24) : vaultName
  location: location
  properties: {
    sku: {
      family: 'A'
      name: 'standard'
    }
    tenantId: subscription().tenantId
    enableSoftDelete: true
    softDeleteRetentionInDays: 90
    enablePurgeProtection: true
    enableRbacAuthorization: false
    accessPolicies: [
      {
        tenantId: subscription().tenantId
        objectId: functionAppPrincipalId
        permissions: {
          secrets: [
            'get'
            'set'
            'delete'
            'list'
          ]
        }
      }
    ]
    networkAcls: {
      defaultAction: 'Allow'
      bypass: 'AzureServices'
    }
  }
  tags: {
    environment: resourcePrefix
    app: 'msp-device-manager'
  }
}

// ── Outputs ─────────────────────────────────────────────────────────────────

output vaultUri string = keyVault.properties.vaultUri
output vaultName string = keyVault.name
output vaultId string = keyVault.id
