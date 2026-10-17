# Set environment variables (do not print values)
$env:MONGODB_URI = "mongodb+srv://sabrstudiodesign_db_user:jwEa0930UMas9eLd@cluster0.rqc0zd9.mongodb.net"
$env:MONGODB_DB = "test"

# Run the inspection script
node .scripts/inspect-source.mjs
