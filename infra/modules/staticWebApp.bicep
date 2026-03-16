// MSP Device Manager — Azure Static Web Apps Module
// Deploys a Free-tier Static Web App for the SPA frontend

// ── Parameters ──────────────────────────────────────────────────────────────

@description('Azure region')
param location string

@description('Resource naming prefix')
param resourcePrefix string

@description('Optional custom domain')
param customDomain string = ''

// ── Variables ───────────────────────────────────────────────────────────────

var staticWebAppName = '${resourcePrefix}-swa'

// ── Resources ───────────────────────────────────────────────────────────────

resource staticWebApp 'Microsoft.Web/staticSites@2022-09-01' = {
  name: staticWebAppName
  location: location
  sku: {
    name: 'Free'
    tier: 'Free'
  }
  properties: {
    buildProperties: {
      appLocation: '/'
      apiLocation: 'api'
      outputLocation: '/'
    }
  }
  tags: {
    environment: resourcePrefix
    app: 'msp-device-manager'
  }
}

// Optional custom domain
resource customDomainResource 'Microsoft.Web/staticSites/customDomains@2022-09-01' = if (!empty(customDomain)) {
  parent: staticWebApp
  name: !empty(customDomain) ? customDomain : 'placeholder'
  properties: {}
}

// ── Outputs ─────────────────────────────────────────────────────────────────

output staticWebAppUrl string = 'https://${staticWebApp.properties.defaultHostname}'
output staticWebAppId string = staticWebApp.id
output staticWebAppName string = staticWebApp.name
