#!/usr/bin/env node

/**
 * scripts/sync-indexes.mjs
 *
 * One-time script to synchronize Mongoose schema indexes with MongoDB Atlas.
 * Run against your Atlas cluster after deploying model changes:
 *
 *   MONGODB_URI='mongodb+srv://...' node scripts/sync-indexes.mjs
 *
 * This calls Model.syncIndexes() on every model, which:
 *  - Creates indexes defined in the schema that don't exist in Atlas.
 *  - Drops indexes in Atlas that are no longer defined in the schema
 *    (except _id).
 *
 * Safe to run multiple times (idempotent).
 * Never prints connection strings or credentials.
 */

import mongoose from 'mongoose';

// Import all models so their schemas (and index definitions) are registered.
import '../backend/models/order.model.js';
import '../backend/models/enquiry.model.js';
import '../backend/models/retail.model.js';
import '../backend/models/project.model.js';
import '../backend/models/admin.model.js';
import '../backend/models/customer.model.js';
import '../backend/models/otp.model.js';

const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error('❌ MONGODB_URI environment variable is required.');
  console.error('   Usage: MONGODB_URI=<your-atlas-uri> node scripts/sync-indexes.mjs');
  process.exit(1);
}

console.log('Connecting to MongoDB Atlas…');

try {
  await mongoose.connect(uri, { autoIndex: false });
  console.log('✅ Connected.\n');

  const modelNames = mongoose.modelNames();
  console.log(`Found ${modelNames.length} models: ${modelNames.join(', ')}\n`);

  for (const name of modelNames) {
    const Model = mongoose.model(name);
    console.log(`Syncing indexes for "${name}"…`);
    try {
      await Model.syncIndexes();
      const indexes = await Model.listIndexes();
      console.log(`  ✅ ${indexes.length} indexes now in place:`);
      for (const idx of indexes) {
        const unique = idx.unique ? ' (unique)' : '';
        const sparse = idx.sparse ? ' (sparse)' : '';
        const ttl = idx.expireAfterSeconds != null ? ` (TTL: ${idx.expireAfterSeconds}s)` : '';
        console.log(`     ${JSON.stringify(idx.key)}${unique}${sparse}${ttl}`);
      }
    } catch (err) {
      console.error(`  ❌ Failed: ${err.message}`);
    }
    console.log();
  }

  console.log('Done. Disconnecting…');
  await mongoose.disconnect();
  console.log('✅ Disconnected.');
  process.exit(0);
} catch (err) {
  console.error('❌ Connection or sync failed:', err.message);
  process.exit(1);
}
