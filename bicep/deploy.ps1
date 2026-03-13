<#
.SYNOPSIS
    Deploys the ai-hack-hs-2026 Azure infrastructure using Bicep.

.DESCRIPTION
    This script deploys the full infrastructure stack including:
      - Key Vault
      - Storage Account
      - Application Insights (with Log Analytics Workspace)
      - Azure Web App (App Service)
      - Azure Static Web App

    All resources are deployed to East US 2.

.PARAMETER ResourceGroupName
    Name of the Azure resource group. Created if it does not exist.

.PARAMETER BaseName
    Base name used to derive all resource names. Defaults to 'aihack2026'.

.PARAMETER Environment
    Deployment environment: dev, staging, or prod. Defaults to 'dev'.

.PARAMETER Location
    Azure region. Defaults to 'eastus2'.

.EXAMPLE
    .\deploy.ps1 -ResourceGroupName "rg-aihack2026-dev"

.EXAMPLE
    .\deploy.ps1 -ResourceGroupName "rg-aihack2026-prod" -BaseName "aihack2026" -Environment "prod"
#>

[CmdletBinding()]
param (
    [Parameter(Mandatory = $true)]
    [string] $ResourceGroupName,

    [Parameter(Mandatory = $false)]
    [string] $BaseName = 'aihack2026',

    [Parameter(Mandatory = $false)]
    [ValidateSet('dev', 'staging', 'prod')]
    [string] $Environment = 'dev',

    [Parameter(Mandatory = $false)]
    [string] $Location = 'eastus2'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$BicepFile = Join-Path $ScriptDir 'main.bicep'

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " ai-hack-hs-2026 Infrastructure Deploy " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Resource Group : $ResourceGroupName"
Write-Host "Base Name      : $BaseName"
Write-Host "Environment    : $Environment"
Write-Host "Location       : $Location"
Write-Host ""

# Verify Azure CLI is available
if (-not (Get-Command az -ErrorAction SilentlyContinue)) {
    Write-Error "Azure CLI (az) is not installed or not in PATH. Please install it from https://aka.ms/installazurecli"
}

# Verify Bicep is available
$bicepCheck = az bicep version 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Bicep CLI not found. Installing via Azure CLI..." -ForegroundColor Yellow
    az bicep install
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to install Bicep CLI."
    }
}

# Ensure logged in
$accountJson = az account show 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Not logged in to Azure. Running 'az login'..." -ForegroundColor Yellow
    az login
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Azure login failed."
    }
}

$account = $accountJson | ConvertFrom-Json
Write-Host "Logged in as : $($account.user.name)" -ForegroundColor Green
Write-Host "Subscription : $($account.name) ($($account.id))" -ForegroundColor Green
Write-Host ""

# Create resource group if it doesn't exist
Write-Host "Ensuring resource group '$ResourceGroupName' exists in '$Location'..." -ForegroundColor Yellow
az group create `
    --name $ResourceGroupName `
    --location $Location `
    --output none

if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to create or verify resource group '$ResourceGroupName'."
}
Write-Host "Resource group ready." -ForegroundColor Green
Write-Host ""

# Deploy Bicep template
$DeploymentName = "aihack-deploy-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
Write-Host "Starting deployment '$DeploymentName'..." -ForegroundColor Yellow

$output = az deployment group create `
    --name $DeploymentName `
    --resource-group $ResourceGroupName `
    --template-file $BicepFile `
    --parameters baseName=$BaseName environment=$Environment location=$Location `
    --output json

if ($LASTEXITCODE -ne 0) {
    Write-Error "Deployment '$DeploymentName' failed."
}

$result = $output | ConvertFrom-Json
$outputs = $result.properties.outputs

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host " Deployment Succeeded                   " -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Deployed Resources:" -ForegroundColor Cyan
Write-Host "  Key Vault          : $($outputs.keyVaultName.value)"
Write-Host "  Key Vault URI      : $($outputs.keyVaultUri.value)"
Write-Host "  Storage Account    : $($outputs.storageAccountName.value)"
Write-Host "  App Insights       : $($outputs.appInsightsName.value)"
Write-Host "  Web App            : $($outputs.webAppName.value)"
Write-Host "  Web App URL        : https://$($outputs.webAppHostName.value)"
Write-Host "  Static Web App     : $($outputs.staticWebAppName.value)"
Write-Host "  Static Web App URL : https://$($outputs.staticWebAppHostName.value)"
Write-Host ""
