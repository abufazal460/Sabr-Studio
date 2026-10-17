# Inspect destination sabrstudio database (no credentials needed in output)
$env:MONGODB_DB = "sabrstudio"
node .scripts/inspect-source.mjs