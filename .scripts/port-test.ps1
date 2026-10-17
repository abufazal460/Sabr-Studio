# Quick IP connectivity test for Atlas port 27017
$hostname = "145.79.209.35"
$port = 27017

Write-Host "Testing TCP connection to " + $hostname + ":" + $port + " ..."
try {
    $socket = New-Object System.Net.Sockets.TcpClient
    $connect = $socket.BeginConnect($hostname, $port, $null, $null)
    $wait = $connect.AsyncWaitHandle.WaitOne(8000, $false)
    if ($wait) {
        $socket.EndConnect($connect)
        Write-Host "Connection SUCCESS: Port 27017 is open on " + $hostname
    } else {
        Write-Host "Connection TIMEOUT: couldn't connect in 8 seconds"
    }
} catch {
    Write-Host "Connection failed: " + $_
} finally {
    try { $socket.Close() } catch {}
}
