// MSP Device Manager — Azure Front Door + WAF
// Global load balancing, TLS termination, DDoS protection, and WAF policy

@description('Azure region')
param location string = 'global'

@description('Resource naming prefix')
param resourcePrefix string

@description('Backend URL for the Function App')
param functionAppHostname string

@description('Backend URL for the Static Web App')
param staticWebAppHostname string

@description('Custom domain (optional)')
param customDomain string = ''

// ── WAF Policy ──────────────────────────────────────────────────────────────
// DDoS protection only — NO rate limiting per user requirement

resource wafPolicy 'Microsoft.Network/FrontDoorWebApplicationFirewallPolicies@2022-05-01' = {
  name: replace('${resourcePrefix}-waf', '-', '')
  location: location
  sku: {
    name: 'Premium_AzureFrontDoor'
  }
  properties: {
    policySettings: {
      enabledState: 'Enabled'
      mode: 'Prevention'
      requestBodyCheck: 'Enabled'
    }
    managedRules: {
      managedRuleSets: [
        {
          ruleSetType: 'Microsoft_DefaultRuleSet'
          ruleSetVersion: '2.1'
          ruleSetAction: 'Block'
        }
        {
          ruleSetType: 'Microsoft_BotManagerRuleSet'
          ruleSetVersion: '1.0'
          ruleSetAction: 'Block'
        }
      ]
    }
    // No custom rate-limit rules — speed and efficiency prioritised
    customRules: {
      rules: []
    }
  }
}

// ── Front Door Profile ──────────────────────────────────────────────────────

resource frontDoor 'Microsoft.Cdn/profiles@2023-05-01' = {
  name: '${resourcePrefix}-fd'
  location: location
  sku: {
    name: 'Premium_AzureFrontDoor'
  }
}

// ── Endpoint ────────────────────────────────────────────────────────────────

resource endpoint 'Microsoft.Cdn/profiles/afdEndpoints@2023-05-01' = {
  parent: frontDoor
  name: '${resourcePrefix}-endpoint'
  location: location
  properties: {
    enabledState: 'Enabled'
  }
}

// ── Origin Groups ───────────────────────────────────────────────────────────

resource apiOriginGroup 'Microsoft.Cdn/profiles/originGroups@2023-05-01' = {
  parent: frontDoor
  name: 'api-origin-group'
  properties: {
    loadBalancingSettings: {
      sampleSize: 4
      successfulSamplesRequired: 3
      additionalLatencyInMilliseconds: 0
    }
    healthProbeSettings: {
      probePath: '/api/health'
      probeRequestType: 'HEAD'
      probeProtocol: 'Https'
      probeIntervalInSeconds: 30
    }
  }
}

resource webOriginGroup 'Microsoft.Cdn/profiles/originGroups@2023-05-01' = {
  parent: frontDoor
  name: 'web-origin-group'
  properties: {
    loadBalancingSettings: {
      sampleSize: 4
      successfulSamplesRequired: 3
      additionalLatencyInMilliseconds: 0
    }
    healthProbeSettings: {
      probePath: '/'
      probeRequestType: 'HEAD'
      probeProtocol: 'Https'
      probeIntervalInSeconds: 60
    }
  }
}

// ── Origins ─────────────────────────────────────────────────────────────────

resource apiOrigin 'Microsoft.Cdn/profiles/originGroups/origins@2023-05-01' = {
  parent: apiOriginGroup
  name: 'api-function-app'
  properties: {
    hostName: functionAppHostname
    httpPort: 80
    httpsPort: 443
    originHostHeader: functionAppHostname
    priority: 1
    weight: 1000
    enabledState: 'Enabled'
  }
}

resource webOrigin 'Microsoft.Cdn/profiles/originGroups/origins@2023-05-01' = {
  parent: webOriginGroup
  name: 'web-static-app'
  properties: {
    hostName: staticWebAppHostname
    httpPort: 80
    httpsPort: 443
    originHostHeader: staticWebAppHostname
    priority: 1
    weight: 1000
    enabledState: 'Enabled'
  }
}

// ── Routes ──────────────────────────────────────────────────────────────────

resource apiRoute 'Microsoft.Cdn/profiles/afdEndpoints/routes@2023-05-01' = {
  parent: endpoint
  name: 'api-route'
  properties: {
    originGroup: { id: apiOriginGroup.id }
    patternsToMatch: ['/api/*']
    supportedProtocols: ['Https']
    httpsRedirect: 'Enabled'
    forwardingProtocol: 'HttpsOnly'
    linkToDefaultDomain: 'Enabled'
    cacheConfiguration: {
      queryStringCachingBehavior: 'IgnoreQueryString'
      compressionSettings: {
        isCompressionEnabled: true
        contentTypesToCompress: [
          'application/json'
          'text/plain'
        ]
      }
    }
  }
  dependsOn: [apiOrigin]
}

resource webRoute 'Microsoft.Cdn/profiles/afdEndpoints/routes@2023-05-01' = {
  parent: endpoint
  name: 'web-route'
  properties: {
    originGroup: { id: webOriginGroup.id }
    patternsToMatch: ['/*']
    supportedProtocols: ['Https']
    httpsRedirect: 'Enabled'
    forwardingProtocol: 'HttpsOnly'
    linkToDefaultDomain: 'Enabled'
    cacheConfiguration: {
      queryStringCachingBehavior: 'IgnoreQueryString'
      compressionSettings: {
        isCompressionEnabled: true
        contentTypesToCompress: [
          'text/html'
          'text/css'
          'application/javascript'
          'application/json'
        ]
      }
    }
  }
  dependsOn: [webOrigin]
}

// ── Security Policy (WAF association) ───────────────────────────────────────

resource securityPolicy 'Microsoft.Cdn/profiles/securityPolicies@2023-05-01' = {
  parent: frontDoor
  name: '${resourcePrefix}-sec-policy'
  properties: {
    parameters: {
      type: 'WebApplicationFirewall'
      wafPolicy: { id: wafPolicy.id }
      associations: [
        {
          domains: [{ id: endpoint.id }]
          patternsToMatch: ['/*']
        }
      ]
    }
  }
}

// ── Outputs ─────────────────────────────────────────────────────────────────

output frontDoorEndpoint string = endpoint.properties.hostName
output frontDoorId string = frontDoor.id
output wafPolicyId string = wafPolicy.id
