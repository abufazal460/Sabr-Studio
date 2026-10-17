# Read MongoDB package.json to find main entry point
$json = Get-Content "C:\Users\fazal\OneDrive\Desktop\SabrStudio\backend\node_modules\mongodb\package.json" -Raw | ConvertFrom-Json
Write-Host "Main entry: $($json.main)"
Write-Host "Type: $($json.type)"
Write-Host "---"
# List lib folder
Get-ChildItem "C:\Users\fazal\OneDrive\Desktop\SabrStudio\backend\node_modules\mongodb\lib" -Name -Recurse | Select-Object -First 20