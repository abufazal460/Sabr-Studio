# Check MongoDB driver structure
Set-Location "C:\Users\fazal\OneDrive\Desktop\SabrStudio\backend\node_modules\mongodb"
Get-ChildItem -Name -Recurse -Directory -ErrorAction SilentlyContinue | Select-Object -First 20
Get-ChildItem -Name -File -ErrorAction SilentlyContinue | Select-Object -First 30