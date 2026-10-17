# DNS SRV Record Check
Write-Host "=== MongoDB Atlas SRV Record Check ==="
$hostname = "cluster0.rqc0zd9.mongodb.net"
$baseDomain = "mongodb.net"

Write-Host "Checking A record for $hostname ..."
try {
    $aRecord = Resolve-DnsName -Name $hostname -Type A -ErrorAction SilentlyContinue
    if ($aRecord) {
        Write-Host ($aRecord | Out-String)
    } else {
        Write-Host "No A record found for $hostname"
    }
} catch {
    Write-Host "A record lookup failed: $_"
}

Write-Host "`nChecking SRV record for $hostname ..."
try {
    $srvRecord = Resolve-DnsName -Name $hostname -Type SRV -ErrorAction SilentlyContinue
    if ($srvRecord) {
        Write-Host ($srvRecord | Out-String)
    } else {
        Write-Host "No SRV record found for $hostname"
    }
} catch {
    Write-Host "SRV record lookup failed: $_"
}

Write-Host "`nChecking TXT record for $hostname (contains authSource, replicaSet info) ..."
try {
    $txtRecord = Resolve-DnsName -Name $hostname -Type TXT -ErrorAction SilentlyContinue
    if ($txtRecord) {
        Write-Host ($txtRecord | Out-String)
    } else {
        Write-Host "No TXT record found for $hostname"
    }
} catch {
    Write-Host "TXT record lookup failed: $_"
}

Write-Host "`nChecking base domain 'mongodb.net' A record ..."
try {
    $baseA = Resolve-DnsName -Name $baseDomain -Type A -ErrorAction SilentlyContinue
    if ($baseA) {
        Write-Host ($baseA | Out-String)
    } else {
        Write-Host "No A record found for $baseDomain"
    }
} catch {
    Write-Host "Base domain A lookup failed: $_"
}

Write-Host "`n=== Result Summary ==="
Write-Host "If SRV record lookup failed, the Atlas cluster hostname may be:"
Write-Host "  1. Incorrectly formatted"
Write-Host "  2. Not yet propagated (reduced latency in DNS propagation)"
Write-Host "  3. Deleted or renamed on MongoDB Atlas"
Write-Host "  4. Using a different cluster identifier"
