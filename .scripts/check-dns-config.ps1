# DNS Configuration Check
Write-Host "=== DNS Client Settings ==="
# Use systeminfo to check DNS settings
systeminfo | Select-String -Pattern "DNS" | Format-Table -AutoSize

Write-Host "`n=== Get DNS Client Settings ==="
try {
    $dnsConfig = Get-DnsClient -ErrorAction SilentlyContinue
    if ($dnsConfig) {
        $dnsConfig | Format-Table -AutoSize
    } else {
        Write-Host "No DNS client configuration found"
    }
} catch {
    Write-Host "Get-DnsClient failed: $_"
}

Write-Host "`n=== DNS Resolver Cache ==="
try {
    ipconfig /displaydns 2>$null | Select-String -Pattern "cluster|SRV|mongodb" | Format-Table -AutoSize
} catch {
    Write-Host "Could not display DNS cache"
}

Write-Host "`n=== Network Interfaces ==="
Get-NetIPInterface -ErrorAction SilentlyContinue | Format-Table -AutoSize
