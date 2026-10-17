# TLS handshake test using openssl
$hostname = "cluster0.rqc0zd9.mongodb.net"
$port = 27017

Write-Host "=== TLS Handshake Test ===" -ForegroundColor Cyan
Write-Host "Testing: " + $hostname + ":" + $port -ForegroundColor Yellow

$process = Start-Process powershell -ArgumentList "-Command",
    ("echo | openssl s_client -connect " + $hostname + ":" + $port + " -servername " + $hostname + " 2>&1 | Select-Object -First 50"),
    -NoNewWindow -PassThru

# Wait for process to complete
Start-Sleep -Seconds 15

if ($process.HasExited) {
    $output = $process.StandardOutput.ReadToEnd()
    $error = $process.StandardError.ReadToEnd()
    Write-Host "=== STDOUT ===" -ForegroundColor Green
    Write-Host $output
    if ($error) {
        Write-Host "=== STDERR ===" -ForegroundColor Red
        Write-Host $error
    }
} else {
    Write-Host "Process still running..."
    $process.Kill()
}

Write-Host "`n=== Result Summary ===" -ForegroundColor Cyan
Write-Host "1. Check for 'Verified' - indicates TLS cert is valid and chain is complete"
Write-Host "2. Check for 'subject=' - indicates which certificate the server sent"
Write-Host "3. Check for 'SSL handshake has read' - indicates handshake completed"
Write-Host "4. Check for alert errors - indicates TLS failure"
Write-Host "5. Atlas clusters use TLS 1.2+ and specific cipher suites"
Write-Host "6. If handshake fails, the server may require a specific client cert or cipher"
