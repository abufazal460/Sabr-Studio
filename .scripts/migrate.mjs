// Safe migration: test -> sabrstudio.
// Rules: idempotent (skip existing _id), BSON-preserving, batch 100,
// per-collection map honours the EIGHT destination spellings as created,
// never renames, never drops, never deletes source. No values printed.
import { MongoClient } from "../backend/node_modules/mongodb/lib/index.js";

const rawUri = process.env.MONGODB_URI;
if (!rawUri) { console.error("ERROR: MONGODB_URI is not set"); process.exit(1); }
const dryRun = process.env.DRY_RUN === "1";

const MAP = {
  admins: "admins",
  customers: "customers",
  // NOTE: source spelling enquiries -> destination spelling enquires (manually created)
  enquiries: "enquires",
  orders: "orders",
  otpcodes: "otpcodes",
  projects: "projects",
  retailcategories: "retailcategories",
  // NOTE: source spelling retails -> destination spelling reatils (manually created)
  retails: "reatils",
};

async function getDb(name) {
  const client = new MongoClient(rawUri + "/" + name, {
    serverSelectionTimeoutMS: 4000, connectTimeoutMS: 4000,
    socketTimeoutMS: 15000, tls: true,
  });
  await client.connect();
  return client;
}

const results = {};
for (const [srcName, dstName] of Object.entries(MAP)) {
  const r = { src: srcName, dst: dstName, source: 0, inserted: 0, skipped: 0, failed: 0 };
  results[srcName] = r;
  let srcClient = null, dstClient = null;
  try {
    srcClient = await getDb("test");
    dstClient = await getDb("sabrstudio");
    const src = srcClient.db("test").collection(srcName);
    const dst = dstClient.db("sabrstudio").collection(dstName);
    const destCount0 = await dst.countDocuments();
    const docs = await src.find({}).toArray();
    r.source = docs.length;
    if (docs.length === 0) { console.log(`${srcName} -> ${dstName}: source empty, nothing to do`); continue; }
    console.log(`${srcName} -> ${dstName}: migrating ${docs.length} docs (dest had ${destCount0})${dryRun ? " [DRY-RUN]" : ""}`);
    const BATCH = 100;
    for (let i = 0; i < docs.length; i += BATCH) {
      const batch = docs.slice(i, i + BATCH);
      for (const doc of batch) {
        try {
          const exists = await dst.findOne({ _id: doc._id }, { projection: { _id: 1 } });
          if (exists) { r.skipped++; continue; }
          if (dryRun) { r.inserted++; continue; }
          await dst.insertOne(doc);
          r.inserted++;
        } catch (e) {
          if (String(e.code) === "11000") { r.skipped++; }
          else { r.failed++; console.log(`  fail _id skipped (code=${e.code || "?"})`); }
        }
      }
    }
    console.log(`  done: inserted=${r.inserted} skipped=${r.skipped} failed=${r.failed}`);
  } catch (e) {
    console.log(`${srcName}: ERROR ${String(e.message).substring(0, 150)}`);
    r.failed = r.source - r.inserted - r.skipped;
  } finally {
    if (srcClient) { try { await srcClient.close(); } catch {} }
    if (dstClient) { try { await dstClient.close(); } catch {} }
  }
}

console.log("\nMIGRATION SUMMARY:");
for (const r of Object.values(results)) {
  console.log(`  ${r.src} -> ${r.dst}: source=${r.source} inserted=${r.inserted} skipped=${r.skipped} failed=${r.failed}`);
}
