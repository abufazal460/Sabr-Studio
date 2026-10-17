# Comprehensive DNS + Network diagnostics
Write-Host "=== DNS Resolution Test ==="
$hostname = "cluster0.rqc0zd9.mongodb.net"
Write-Host "Testing DNS for: $hostname"
try {
    $result = nslookup $hostname
    Write-Host ($result | Out-String)
} catch {
    Write-Host "DNS lookup FAILED: $_"
}

Write-Host "`n=== Network Connectivity Test ==="
$ips = @("3.135.107.228", "3.135.106.216", "3.135.96.5")
foreach ($ip in $ips) {
    Write-Host "Pinging $ip ..."
    try {
        $ping = Test-Connection -ComputerName $ip -Count 1 -ErrorAction SilentlyContinue
        if ($ping) {
            Write-Host ("  " + $ip + ": REACHABLE")
        } else {
            Write-Host ("  " + $ip + ": REACHABLE but no response")
        }
    } catch {
        Write-Host ("  " + $ip + ": NOT REACHABLE - " + $_)
    }
}

Write-Host "`n=== Local Hostname Check ==="
Write-Host "Computer name: $env:COMPUTERNAME"
Write-Host "DNS Suffix:   $env:USERDNSDOMAIN"
$localDNS = Resolve-DnsName -Name $env:COMPUTERNAME -ErrorAction SilentlyContinue
if ($localDNS) { Write-Host "Local DNS: $($localDNS.IPAddress)" }

Write-Host "`n=== Public DNS Resolution ==="
# Test external DNS (Google's public DNS)
try {
    Write-Host "Resolving 'cluster0.rqc0zd9.mongodb.net' via system DNS..."
    $res = Resolve-DnsName -Name $hostname -Server 8.8.8.8 -ErrorAction SilentlyContinue
    if ($res) {
        Write-Host ($res | Out-String)
    } else {
        Write-Host "No resolution via 8.8.8.8"
    }
} catch {
    Write-Host "Error: $_"
}

