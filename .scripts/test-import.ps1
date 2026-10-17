# Test MongoDB driver import
node -e "import('./backend/node_modules/mongodb/lib/index.js').then(m => console.log('OK:', Object.keys(m).slice(0,5))).catch(e => console.error('ERR:', e.message));"