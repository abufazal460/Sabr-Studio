# Quick TLS protocol check using OpenSSL (if available)
Write-Host "=== Checking for openssl ==="
try {
    $opensslVersion = openssl version 2>&1
    Write-Host "OpenSSL version: $opensslVersion"
} catch {
    Write-Host "OpenSSL not found in PATH"
}

# Try testing TLS 1.2 connection
Write-Host "`n=== Testing TLS 1.2 handshake ==="
$command = "-Command"
$command += " echo | openssl s_client -connect cluster0.rqc0zd9.mongodb.net:27017 -servername cluster0.rqc0zd9.mongodb.net -tls1_2 2>&1 | Select-Object -First 30"

$process = Start-Process powershell -ArgumentList $command -NoNewWindow -PassThru
Start-Sleep -Seconds 10

if ($process.HasExited) {
    $output = $process.StandardOutput.ReadToEnd() 2>$null
    Write-Host $output
} else {
    $process.Kill()
    Write-Host "Timeout - openssl may not be installed or path issue"
}

Write-Host "`n=== TLS 1.3 check ==="
$process2 = Start-Process powershell -ArgumentList "-Command",
    "echo | openssl s_client -connect cluster0.rqc0zd9.mongodb.net:27017 -servername cluster0.rqc0zd9.mongodb.net -tls1_3 2>&1 | Select-Object -First 30",
    -NoNewWindow -PassThru
Start-Sleep -Seconds 10

if ($process2.HasExited) {
    $output2 = $process2.StandardOutput.ReadToEnd() 2>$null
    Write-Host $output2
} else {
    $process2.Kill()
    Write-Host "Timeout"
}
