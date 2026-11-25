param(
  [int]$Port = 8765,
  [string]$Root = $PSScriptRoot,
  [switch]$BindAny
)

$ErrorActionPreference = "Stop"

$mimeTypes = @{
  ".html"        = "text/html; charset=utf-8"
  ".css"         = "text/css; charset=utf-8"
  ".js"          = "application/javascript; charset=utf-8"
  ".json"        = "application/json; charset=utf-8"
  ".webmanifest" = "application/manifest+json; charset=utf-8"
  ".png"         = "image/png"
  ".svg"         = "image/svg+xml"
  ".ico"         = "image/x-icon"
}

$bindAddr = if ($BindAny) { [System.Net.IPAddress]::Any } else { [System.Net.IPAddress]::Loopback }
$listener = New-Object System.Net.Sockets.TcpListener($bindAddr, $Port)
$listener.Start()
if ($BindAny) {
  $ips = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue | Where-Object { $_.IPAddress -ne "127.0.0.1" -and $_.IPAddress -notlike "169.254.*" } | Select-Object -ExpandProperty IPAddress
  Write-Host "Kharboosh server running on LAN! Open on mobile: http://$($ips | Select-Object -First 1):$Port/"
}
Write-Host "Kharboosh server running at http://localhost:$Port/ (Root: $Root)"

try {
  while ($true) {
    $client = $listener.AcceptTcpClient()
    try {
      $stream = $client.GetStream()
      $reader = New-Object System.IO.StreamReader($stream, [System.Text.Encoding]::ASCII, $false, 1024, $true)
      $requestLine = $reader.ReadLine()
      if ([string]::IsNullOrWhiteSpace($requestLine)) {
        $client.Close()
        continue
      }
      while ($true) {
        $hdr = $reader.ReadLine()
        if ([string]::IsNullOrEmpty($hdr)) { break }
      }

      $parts = $requestLine.Split(" ")
      $rawPath = if ($parts.Length -ge 2) { $parts[1] } else { "/" }
      $cleanPath = ($rawPath -split "\?")[0]
      if ($cleanPath -eq "/") { $cleanPath = "/index.html" }

      $relPath = $cleanPath.TrimStart("/").Replace("/", "\")
      $fullPath = [System.IO.Path]::GetFullPath((Join-Path $Root $relPath))

      if (-not $fullPath.StartsWith([System.IO.Path]::GetFullPath($Root), [System.StringComparison]::OrdinalIgnoreCase)) {
        $body = [System.Text.Encoding]::UTF8.GetBytes("403 Forbidden")
        $header = "HTTP/1.1 403 Forbidden`r`nContent-Type: text/plain; charset=utf-8`r`nContent-Length: $($body.Length)`r`nConnection: close`r`n`r`n"
        $hdrBytes = [System.Text.Encoding]::ASCII.GetBytes($header)
        $stream.Write($hdrBytes, 0, $hdrBytes.Length)
        $stream.Write($body, 0, $body.Length)
      }
      elseif (Test-Path $fullPath -PathType Leaf) {
        $ext = [System.IO.Path]::GetExtension($fullPath).ToLowerInvariant()
        $mime = if ($mimeTypes.ContainsKey($ext)) { $mimeTypes[$ext] } else { "application/octet-stream" }
        $body = [System.IO.File]::ReadAllBytes($fullPath)
        $header = "HTTP/1.1 200 OK`r`nContent-Type: $mime`r`nCache-Control: no-store`r`nContent-Length: $($body.Length)`r`nConnection: close`r`n`r`n"
        $hdrBytes = [System.Text.Encoding]::ASCII.GetBytes($header)
        $stream.Write($hdrBytes, 0, $hdrBytes.Length)
        $stream.Write($body, 0, $body.Length)
      }
      else {
        $body = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found")
        $header = "HTTP/1.1 404 Not Found`r`nContent-Type: text/plain; charset=utf-8`r`nContent-Length: $($body.Length)`r`nConnection: close`r`n`r`n"
        $hdrBytes = [System.Text.Encoding]::ASCII.GetBytes($header)
        $stream.Write($hdrBytes, 0, $hdrBytes.Length)
        $stream.Write($body, 0, $body.Length)
      }
    }
    catch {
      # Ignore transient client socket resets so the server keeps running
    }
    finally {
      $client.Close()
    }
  }
}
finally {
  $listener.Stop()
}
