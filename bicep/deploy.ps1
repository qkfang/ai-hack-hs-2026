
az group create --name 'rg-ai-hack-2026' --location 'eastus2'

az deployment group create --name 'ai-hack-dev' --resource-group 'rg-ai-hack-2026' --template-file './main.bicep' --parameters './parameters.dev.json'


