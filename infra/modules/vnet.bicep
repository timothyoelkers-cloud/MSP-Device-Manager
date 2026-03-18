// MSP Device Manager — Virtual Network with Private Endpoints
// Provides network isolation for Cosmos DB, Key Vault, Redis, Service Bus

@description('Azure region')
param location string

@description('Resource naming prefix')
param resourcePrefix string

// ── Virtual Network ─────────────────────────────────────────────────────────

resource vnet 'Microsoft.Network/virtualNetworks@2023-11-01' = {
  name: '${resourcePrefix}-vnet'
  location: location
  properties: {
    addressSpace: {
      addressPrefixes: ['10.0.0.0/16']
    }
    subnets: [
      {
        name: 'default'
        properties: {
          addressPrefix: '10.0.0.0/24'
        }
      }
      {
        name: 'function-app'
        properties: {
          addressPrefix: '10.0.1.0/24'
          delegations: [
            {
              name: 'Microsoft.Web.serverFarms'
              properties: {
                serviceName: 'Microsoft.Web/serverFarms'
              }
            }
          ]
        }
      }
      {
        name: 'private-endpoints'
        properties: {
          addressPrefix: '10.0.2.0/24'
          privateEndpointNetworkPolicies: 'Disabled'
        }
      }
    ]
  }
}

// ── Private DNS Zones ───────────────────────────────────────────────────────

resource cosmosDnsZone 'Microsoft.Network/privateDnsZones@2020-06-01' = {
  name: 'privatelink.documents.azure.com'
  location: 'global'
}

resource kvDnsZone 'Microsoft.Network/privateDnsZones@2020-06-01' = {
  name: 'privatelink.vaultcore.azure.net'
  location: 'global'
}

resource redisDnsZone 'Microsoft.Network/privateDnsZones@2020-06-01' = {
  name: 'privatelink.redis.cache.windows.net'
  location: 'global'
}

resource serviceBusDnsZone 'Microsoft.Network/privateDnsZones@2020-06-01' = {
  name: 'privatelink.servicebus.windows.net'
  location: 'global'
}

// ── DNS Zone VNet Links ─────────────────────────────────────────────────────

resource cosmosVnetLink 'Microsoft.Network/privateDnsZones/virtualNetworkLinks@2020-06-01' = {
  parent: cosmosDnsZone
  name: '${resourcePrefix}-cosmos-link'
  location: 'global'
  properties: {
    virtualNetwork: { id: vnet.id }
    registrationEnabled: false
  }
}

resource kvVnetLink 'Microsoft.Network/privateDnsZones/virtualNetworkLinks@2020-06-01' = {
  parent: kvDnsZone
  name: '${resourcePrefix}-kv-link'
  location: 'global'
  properties: {
    virtualNetwork: { id: vnet.id }
    registrationEnabled: false
  }
}

resource redisVnetLink 'Microsoft.Network/privateDnsZones/virtualNetworkLinks@2020-06-01' = {
  parent: redisDnsZone
  name: '${resourcePrefix}-redis-link'
  location: 'global'
  properties: {
    virtualNetwork: { id: vnet.id }
    registrationEnabled: false
  }
}

resource serviceBusVnetLink 'Microsoft.Network/privateDnsZones/virtualNetworkLinks@2020-06-01' = {
  parent: serviceBusDnsZone
  name: '${resourcePrefix}-sb-link'
  location: 'global'
  properties: {
    virtualNetwork: { id: vnet.id }
    registrationEnabled: false
  }
}

// ── Outputs ─────────────────────────────────────────────────────────────────

output vnetId string = vnet.id
output functionAppSubnetId string = vnet.properties.subnets[1].id
output privateEndpointSubnetId string = vnet.properties.subnets[2].id
output cosmosDnsZoneId string = cosmosDnsZone.id
output kvDnsZoneId string = kvDnsZone.id
output redisDnsZoneId string = redisDnsZone.id
output serviceBusDnsZoneId string = serviceBusDnsZone.id
