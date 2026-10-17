# Check DNS resolution for Atlas hostname
$uri = "cluster0.rqc0zd9.mongodb.net"
Write-Host "Checking DNS for: $uri"
try {
  $result = nslookup $uri
  Write-Host ($result | Out-String)
} catch {
  Write-Host "DNS lookup failed: $_"
}
