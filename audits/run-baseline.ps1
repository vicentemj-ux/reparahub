# ReparaHub QA & Performance Audit Script
# Usage: .\run-baseline.ps1

param(
    [string]$Url = "http://localhost:3000",
    [string]$OutputDir = "./audits"
)

$ErrorActionPreference = "Stop"

# Create output directory if not exists
if (!(Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir | Out-Null
}

Write-Host "=== ReparaHub QA Baseline Audit ===" -ForegroundColor Cyan
Write-Host "Target: $Url"
Write-Host "Output: $OutputDir"
Write-Host ""

# Check if server is running
Write-Host "[1/3] Checking server..." -ForegroundColor Yellow
try {
    $Response = Invoke-WebRequest -Uri $Url -Method HEAD -TimeoutSec 5 -ErrorAction Stop
    Write-Host "  Server is UP ($($Response.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "  Server is DOWN. Starting dev server..." -ForegroundColor Red
    Write-Host "  Please manually run: npx pnpm dev"
    exit 1
}

# Lighthouse Audit
Write-Host "[2/3] Running Lighthouse audit..." -ForegroundColor Yellow
$LHReport = "$OutputDir/lighthouse-report.html"
lighthouse $Url --output html --output-path $LHReport --preset desktop --only-categories performance,accessibility --quiet

if (Test-Path $LHReport) {
    Write-Host "  Lighthouse report saved: $LHReport" -ForegroundColor Green
} else {
    Write-Host "  Lighthouse failed to generate report" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== Audit Complete ===" -ForegroundColor Cyan
Write-Host "Reports location: $OutputDir"