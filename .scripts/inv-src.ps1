# Source inventory (test) - URI redacted, no values printed
$env:MONGODB_URI = "mongodb+srv://sabrstudiodesign_db_user:jwEa0930UMas9eLd@cluster0.rqc0zd9.mongodb.net"
$env:MONGODB_DB = "test"
node .scripts/inventory.mjs
