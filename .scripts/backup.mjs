// Backup source test + destination sabrstudio to local JSON (BSON-safe via EJSON).
// Never prints document values or credentials. Writes to backend/data/backup-<ts>/.
import { MongoClient } from "../backend/node_modules/mongodb/lib/index.js";
import { EJSON } from "../backend/node_modules/bson/lib/bson.mjs";
import fs from "node:fs";
import path from "node:path";

const rawUri = process.env.MONGODB_URI;
if (!rawUri) { console.error("ERROR: MONGODB_URI is not set"); process.exit(1); }

const ts = new Date().toISOString().replace(/[:.]/g, "-");
const outDir = path.join("backend", "data", `backup-${ts}`);
fs.mkdirSync(outDir, { recursive: true });
console.log(`Backup dir: ${outDir}`);

async function backupDb(dbName) {
  const uri = rawUri + "/" + dbName;
  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 4000, connectTimeoutMS: 4000,
    socketTimeoutMS: 10000, tls: true,
  });
  await client.connect();
  const db = client.db(dbName);
  const collections = await db.listCollections().toArray();
  const summary = { db: dbName, at: new Date().toISOString(), collections: {} };
  for (const c of collections) {
    const docs = await db.collection(c.name).find({}).toArray();
    fs.writeFileSync(path.join(outDir, `${dbName}.${c.name}.ejson`), EJSON.stringify(docs, null, 2));
    summary.collections[c.name] = docs.length;
    console.log(`  backed up ${dbName}.${c.name}: ${docs.length} docs`);
  }
  fs.writeFileSync(path.join(outDir, `${dbName}.summary.json`), JSON.stringify(summary, null, 2));
  await client.close();
  return summary;
}

const src = await backupDb("test");
const dst = await backupDb("sabrstudio");
console.log("BACKUP COMPLETE:", JSON.stringify({ src: src.collections, dst: dst.collections }));
