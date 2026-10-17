# Sync indexes onto sabrstudio (additive, no data writes)
$env:MONGODB_URI = "mongodb+srv://sabrstudiodesign_db_user:jwEa0930UMas9eLd@cluster0.rqc0zd9.mongodb.net"
node .scripts/sync-dest-indexes.mjs
