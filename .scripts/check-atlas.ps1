# Check Atlas API reachability
Invoke-WebRequest -Uri "https://cluster0.rqc0zd9.mongodb.net" -UseBasicParsing -TimeoutSec 5 -ErrorAction SilentlyContinue | Select-Object -First 5
if ($LASTEXITCODE -ne 0) {
  Write-Host "Connection to Atlas API failed or timed out"
}
