import { MongoClient } from "../backend/node_modules/mongodb/lib/index.js";

console.log("MongoDB driver import: OK");
console.log("Node.js version:", process.version);

const rawUri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "test";
console.log("Original URI:", rawUri ? "SET" : "NOT SET");
console.log("Target DB:", dbName);

if (!rawUri) {
  console.error("ERROR: MONGODB_URI is not set");
  process.exit(1);
}

const uri = rawUri + "/" + dbName;
console.log(`Connecting: ${uri.substring(0, 55)}...`);

let client = null;
try {
  client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 4000,
    connectTimeoutMS: 4000,
    socketTimeoutMS: 8000,
    tls: true,
    retryWrites: true,
    w: "majority",
  });
  await client.connect();
  console.log("CONNECTED");

  const db = client.db(dbName);
  const collections = await db.listCollections().toArray();
  console.log(`Collections (${collections.length}):`);
  for (const c of collections) {
    const count = await db.collection(c.name).countDocuments();
    console.log(`  ${c.name}: ${count}`);
  }

  const serverInfo = await client.db("admin").command({ buildInfo: 1 });
  console.log("MongoDB version:", serverInfo.version);
  await client.close();
  console.log("DONE");
} catch (err) {
  console.log("FAILED:", (err && err.message ? err.message : String(err)).substring(0, 200));
  if (client) { try { await client.close(); } catch {} }
  process.exit(1);
}



