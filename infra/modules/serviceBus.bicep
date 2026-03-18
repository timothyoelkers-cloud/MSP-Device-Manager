// MSP Device Manager — Azure Service Bus
// Message queue for background job processing (device sync, bulk operations, reports)

@description('Azure region')
param location string

@description('Resource naming prefix')
param resourcePrefix string

@description('Service Bus SKU')
@allowed(['Basic', 'Standard', 'Premium'])
param skuName string = 'Standard'

@description('Subnet ID for private endpoint (optional)')
param privateEndpointSubnetId string = ''

@description('Private DNS Zone ID for Service Bus (optional)')
param serviceBusDnsZoneId string = ''

// ── Service Bus Namespace ───────────────────────────────────────────────────

resource serviceBus 'Microsoft.ServiceBus/namespaces@2022-10-01-preview' = {
  name: '${resourcePrefix}-sb'
  location: location
  sku: {
    name: skuName
    tier: skuName
  }
  properties: {
    minimumTlsVersion: '1.2'
    publicNetworkAccess: privateEndpointSubnetId != '' ? 'Disabled' : 'Enabled'
  }
}

// ── Queues ──────────────────────────────────────────────────────────────────

resource deviceSyncQueue 'Microsoft.ServiceBus/namespaces/queues@2022-10-01-preview' = {
  parent: serviceBus
  name: 'device-sync'
  properties: {
    maxDeliveryCount: 5
    defaultMessageTimeToLive: 'P1D'
    lockDuration: 'PT5M'
    deadLetteringOnMessageExpiration: true
    enablePartitioning: false
  }
}

resource bulkOperationsQueue 'Microsoft.ServiceBus/namespaces/queues@2022-10-01-preview' = {
  parent: serviceBus
  name: 'bulk-operations'
  properties: {
    maxDeliveryCount: 3
    defaultMessageTimeToLive: 'P1D'
    lockDuration: 'PT10M'
    deadLetteringOnMessageExpiration: true
    enablePartitioning: false
  }
}

resource reportGenerationQueue 'Microsoft.ServiceBus/namespaces/queues@2022-10-01-preview' = {
  parent: serviceBus
  name: 'report-generation'
  properties: {
    maxDeliveryCount: 3
    defaultMessageTimeToLive: 'P7D'
    lockDuration: 'PT10M'
    deadLetteringOnMessageExpiration: true
    enablePartitioning: false
  }
}

resource alertsQueue 'Microsoft.ServiceBus/namespaces/queues@2022-10-01-preview' = {
  parent: serviceBus
  name: 'alerts'
  properties: {
    maxDeliveryCount: 5
    defaultMessageTimeToLive: 'P3D'
    lockDuration: 'PT2M'
    deadLetteringOnMessageExpiration: true
    enablePartitioning: false
  }
}

// ── Topics (for pub/sub patterns) ───────────────────────────────────────────

resource tenantEventsTopic 'Microsoft.ServiceBus/namespaces/topics@2022-10-01-preview' = {
  parent: serviceBus
  name: 'tenant-events'
  properties: {
    defaultMessageTimeToLive: 'P1D'
    enablePartitioning: false
  }
}

resource complianceChangeSub 'Microsoft.ServiceBus/namespaces/topics/subscriptions@2022-10-01-preview' = {
  parent: tenantEventsTopic
  name: 'compliance-changes'
  properties: {
    maxDeliveryCount: 5
    lockDuration: 'PT2M'
    deadLetteringOnMessageExpiration: true
  }
}

resource auditLogSub 'Microsoft.ServiceBus/namespaces/topics/subscriptions@2022-10-01-preview' = {
  parent: tenantEventsTopic
  name: 'audit-log'
  properties: {
    maxDeliveryCount: 5
    lockDuration: 'PT2M'
    deadLetteringOnMessageExpiration: true
  }
}

// ── Private Endpoint (conditional) ──────────────────────────────────────────

resource privateEndpoint 'Microsoft.Network/privateEndpoints@2023-11-01' = if (privateEndpointSubnetId != '') {
  name: '${resourcePrefix}-sb-pe'
  location: location
  properties: {
    subnet: {
      id: privateEndpointSubnetId
    }
    privateLinkServiceConnections: [
      {
        name: '${resourcePrefix}-sb-plsc'
        properties: {
          privateLinkServiceId: serviceBus.id
          groupIds: ['namespace']
        }
      }
    ]
  }
}

resource privateDnsZoneGroup 'Microsoft.Network/privateEndpoints/privateDnsZoneGroups@2023-11-01' = if (privateEndpointSubnetId != '' && serviceBusDnsZoneId != '') {
  parent: privateEndpoint
  name: 'default'
  properties: {
    privateDnsZoneConfigs: [
      {
        name: 'servicebus'
        properties: {
          privateDnsZoneId: serviceBusDnsZoneId
        }
      }
    ]
  }
}

// ── Outputs ─────────────────────────────────────────────────────────────────

output serviceBusNamespace string = serviceBus.name
output serviceBusEndpoint string = serviceBus.properties.serviceBusEndpoint
output serviceBusConnectionString string = listKeys('${serviceBus.id}/AuthorizationRules/RootManageSharedAccessKey', serviceBus.apiVersion).primaryConnectionString
output serviceBusId string = serviceBus.id
