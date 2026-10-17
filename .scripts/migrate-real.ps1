# REAL migration (dry-run flags off)
$env:MONGODB_URI = "mongodb+srv://sabrstudiodesign_db_user:jwEa0930UMas9eLd@cluster0.rqc0zd9.mongodb.net"
$env:DRY_RUN = "0"
node .scripts/migrate.mjs
