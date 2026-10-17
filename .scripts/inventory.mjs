// Full inventory: collections, counts, indexes, validators, sample field shapes.
// Never prints credentials or document values. Only names, counts, types.
import { MongoClient } from "../backend/node_modules/mongodb/lib/index.js";

const rawUri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "test";
if (!rawUri) { console.error("ERROR: MONGODB_URI is not set"); process.exit(1); }

const uri = rawUri + "/" + dbName;
console.log(`Inventory for database: ${dbName}`);

let client = null;
try {
  client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 4000,
    connectTimeoutMS: 4000,
    socketTimeoutMS: 10000,
    tls: true,
    retryWrites: true,
    w: "majority",
  });
  await client.connect();
  console.log("CONNECTED");
  const db = client.db(dbName);
  const collections = await db.listCollections().toArray();
  console.log(`Collections (${collections.length}): ${collections.map(c => c.name).join(", ")}`);

  for (const c of collections) {
    const name = c.name;
    const coll = db.collection(name);
    const count = await coll.countDocuments();
    console.log(`\n== ${name}: ${count} docs ==`);
    try {
      const indexes = await coll.indexes();
      console.log(`  indexes (${indexes.length}):`);
      for (const ix of indexes) {
        const flags = [
          ix.unique ? "unique" : null,
          ix.sparse ? "sparse" : null,
          ix.expireAfterSeconds != null ? `ttl=${ix.expireAfterSeconds}` : null,
        ].filter(Boolean).join(",");
        console.log(`    key=${JSON.stringify(ix.key)}${flags ? " [" + flags + "]" : ""}`);
      }
    } catch (e) { console.log(`  indexes: unavailable (${e.message})`); }
    if (count > 0) {
      try {
        const sample = await coll.find({}).limit(3).toArray();
        const fieldTypes = {};
        for (const doc of sample) {
          for (const [k, v] of Object.entries(doc)) {
            const t = v === null ? "null" : Array.isArray(v) ? "array" : typeof v;
            if (!fieldTypes[k]) fieldTypes[k] = new Set();
            fieldTypes[k].add(t);
          }
        }
        console.log(`  fields (shape only, no values):`);
        for (const [k, set] of Object.entries(fieldTypes)) {
          console.log(`    ${k}: ${[...set].join("|")}`);
        }
      } catch (e) { console.log(`  schema sample: unavailable (${e.message})`); }
    }
  }
  await client.close();
  console.log("\nDONE");
} catch (err) {
  console.log("FAILED:", (err && err.message ? err.message : String(err)).substring(0, 250));
  if (client) { try { await client.close(); } catch {} }
  process.exit(1);
}
