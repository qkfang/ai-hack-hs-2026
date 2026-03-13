@description('Base name used to derive all resource names')
param baseName string = 'aihack2026'

@description('Azure region for all resources')
param location string = 'eastus2'

@description('Environment suffix (e.g. dev, staging, prod)')
@allowed(['dev', 'staging', 'prod'])
param environment string = 'dev'

var uniqueSuffix = uniqueString(resourceGroup().id)
var keyVaultName = 'kv-${baseName}-${environment}-${take(uniqueSuffix, 6)}'
var storageAccountName = 'st${baseName}${environment}${take(uniqueSuffix, 6)}'
var appInsightsName = 'appi-${baseName}-${environment}'
var logAnalyticsWorkspaceName = 'log-${baseName}-${environment}'
var webAppName = 'app-${baseName}-${environment}'
var appServicePlanName = 'asp-${baseName}-${environment}'
var staticWebAppName = 'swa-${baseName}-${environment}'

module keyVault 'modules/keyvault.bicep' = {
  name: 'keyVaultDeployment'
  params: {
    name: keyVaultName
    location: location
  }
}

module storageAccount 'modules/storage.bicep' = {
  name: 'storageAccountDeployment'
  params: {
    name: storageAccountName
    location: location
  }
}

module appInsights 'modules/appinsights.bicep' = {
  name: 'appInsightsDeployment'
  params: {
    name: appInsightsName
    location: location
    workspaceName: logAnalyticsWorkspaceName
  }
}

module webApp 'modules/webapp.bicep' = {
  name: 'webAppDeployment'
  params: {
    name: webAppName
    location: location
    appServicePlanName: appServicePlanName
    appInsightsConnectionString: appInsights.outputs.connectionString
  }
}

module staticWebApp 'modules/staticwebapp.bicep' = {
  name: 'staticWebAppDeployment'
  params: {
    name: staticWebAppName
    location: location
  }
}

output keyVaultName string = keyVault.outputs.name
output keyVaultUri string = keyVault.outputs.uri
output storageAccountName string = storageAccount.outputs.name
output appInsightsName string = appInsights.outputs.name
output appInsightsConnectionString string = appInsights.outputs.connectionString
output webAppName string = webApp.outputs.name
output webAppHostName string = webApp.outputs.defaultHostName
output staticWebAppName string = staticWebApp.outputs.name
output staticWebAppHostName string = staticWebApp.outputs.defaultHostName
