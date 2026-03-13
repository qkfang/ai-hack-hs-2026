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

if (-not (Get-Command az -ErrorAction SilentlyContinue)) {
    Write-Error "Azure CLI (az) is not installed or not in PATH."
}

az bicep version 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    az bicep install
    if ($LASTEXITCODE -ne 0) { Write-Error "Failed to install Bicep CLI." }
}

az account show 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    az login
    if ($LASTEXITCODE -ne 0) { Write-Error "Azure login failed." }
}

az group create --name $ResourceGroupName --location $Location --output none
if ($LASTEXITCODE -ne 0) { Write-Error "Failed to create resource group '$ResourceGroupName'." }

$DeploymentName = "aihack-deploy-$(Get-Date -Format 'yyyyMMdd-HHmmss')"

az deployment group create `
    --name $DeploymentName `
    --resource-group $ResourceGroupName `
    --template-file $BicepFile `
    --parameters baseName=$BaseName environment=$Environment location=$Location `
    --output none

if ($LASTEXITCODE -ne 0) { Write-Error "Deployment '$DeploymentName' failed." }
