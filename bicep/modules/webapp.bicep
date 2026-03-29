param name string
param location string
param appServicePlanName string
param appInsightsConnectionString string
param azureAIFoundryEndpoint string
param azureAIFoundryDeployment string
param azureAIFoundryDalleDeployment string
param azureAIFoundryTenantId string
param sqlConnectionString string
param skuName string = 'S1'
param skuTier string = 'Standard'
param linuxFxVersion string = 'DOTNETCORE|9.0'

resource appServicePlan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: appServicePlanName
  location: location
  kind: 'linux'
  sku: {
    name: skuName
    tier: skuTier
  }
  properties: {
    reserved: true
  }
}

resource webApp 'Microsoft.Web/sites@2023-12-01' = {
  name: name
  location: location
  kind: 'app,linux'
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    serverFarmId: appServicePlan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: linuxFxVersion
      appCommandLine: 'dotnet api.dll'
      minTlsVersion: '1.2'
      cors: {
        allowedOrigins: ['*']
      }
      appSettings: [
        {
          name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
          value: appInsightsConnectionString
        }
        {
          name: 'ApplicationInsightsAgent_EXTENSION_VERSION'
          value: '~3'
        }
        {
          name: 'AzureAIFoundry__Endpoint'
          value: azureAIFoundryEndpoint
        }
        {
          name: 'AzureAIFoundry__Deployment'
          value: azureAIFoundryDeployment
        }
        {
          name: 'AzureAIFoundry__DalleDeployment'
          value: azureAIFoundryDalleDeployment
        }
        {
          name: 'AzureAIFoundry__TenantId'
          value: azureAIFoundryTenantId
        }
        {
          name: 'ConnectionStrings__DefaultConnection'
          value: sqlConnectionString
        }
      ]
    }
  }
}

output id string = webApp.id
output name string = webApp.name
output defaultHostName string = webApp.properties.defaultHostName
output principalId string = webApp.identity.principalId
