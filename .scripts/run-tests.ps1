# Run repo backend tests (DB-free: tests set MONGODB_URI='')
Set-Location backend
node --test test/app.test.js
