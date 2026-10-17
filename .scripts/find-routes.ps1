# Find retail category routes in apiHandler
Select-String -Path "backend/apiHandler.js" -Pattern "categor" | ForEach-Object { $_.LineNumber.ToString() + ": " + $_.Line.Trim() }
