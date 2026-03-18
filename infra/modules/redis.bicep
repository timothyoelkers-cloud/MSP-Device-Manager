// MSP Device Manager — Azure Cache for Redis
// High-performance caching layer for Graph API responses and session data

@description('Azure region')
param location string

@description('Resource naming prefix')
param resourcePrefix string

@description('Redis SKU')
@allowed(['Basic', 'Standard', 'Premium'])
param skuName string = 'Standard'

@description('Redis cache size (C0=250MB, C1=1GB, C2=2.5GB)')
@allowed([0, 1, 2, 3])
param capacity int = 1

@description('Subnet ID for private endpoint (optional)')
param privateEndpointSubnetId string = ''

@description('Private DNS Zone ID for Redis (optional)')
param redisDnsZoneId string = ''

// ── Redis Cache ─────────────────────────────────────────────────────────────

resource redis 'Microsoft.Cache/redis@2023-08-01' = {
  name: '${resourcePrefix}-redis'
  location: location
  properties: {
    sku: {
      name: skuName
      family: skuName == 'Premium' ? 'P' : 'C'
      capacity: capacity
    }
    enableNonSslPort: false
    minimumTlsVersion: '1.2'
    publicNetworkAccess: privateEndpointSubnetId != '' ? 'Disabled' : 'Enabled'
    redisConfiguration: {
      'maxmemory-policy': 'allkeys-lru'
      'maxfragmentationmemory-reserved': '50'
      'maxmemory-reserved': '50'
    }
  }
}

// ── Private Endpoint (conditional) ──────────────────────────────────────────

resource privateEndpoint 'Microsoft.Network/privateEndpoints@2023-11-01' = if (privateEndpointSubnetId != '') {
  name: '${resourcePrefix}-redis-pe'
  location: location
  properties: {
    subnet: {
      id: privateEndpointSubnetId
    }
    privateLinkServiceConnections: [
      {
        name: '${resourcePrefix}-redis-plsc'
        properties: {
          privateLinkServiceId: redis.id
          groupIds: ['redisCache']
        }
      }
    ]
  }
}

resource privateDnsZoneGroup 'Microsoft.Network/privateEndpoints/privateDnsZoneGroups@2023-11-01' = if (privateEndpointSubnetId != '' && redisDnsZoneId != '') {
  parent: privateEndpoint
  name: 'default'
  properties: {
    privateDnsZoneConfigs: [
      {
        name: 'redis'
        properties: {
          privateDnsZoneId: redisDnsZoneId
        }
      }
    ]
  }
}

// ── Outputs ─────────────────────────────────────────────────────────────────

output redisHostName string = redis.properties.hostName
output redisSslPort int = redis.properties.sslPort
output redisConnectionString string = '${redis.properties.hostName}:${redis.properties.sslPort},password=${redis.listKeys().primaryKey},ssl=True,abortConnect=False'
output redisId string = redis.id
