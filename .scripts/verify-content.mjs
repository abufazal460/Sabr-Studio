// Deep content verify: compare source vs destination docs by _id + BSON hash.
// Prints counts + mismatches only, never values.
import { MongoClient } from "../backend/node_modules/mongodb/lib/index.js";
import { EJSON } from "../backend/node_modules/bson/lib/bson.mjs";
import crypto from "node:crypto";

const rawUri = process.env.MONGODB_URI;
if (!rawUri) { console.error("ERROR: MONGODB_URI is not set"); process.exit(1); }

const MAP = {
  admins: "admins", customers: "customers", enquiries: "enquires",
  orders: "orders", otpcodes: "otpcodes", projects: "projects",
  retailcategories: "retailcategories", retails: "reatils",
};

function hashDoc(doc) {
  const normalized = EJSON.stringify(doc, { relaxed: false });
  return crypto.createHash("sha256").update(normalized).digest("hex").slice(0, 16);
}

async function openDb(name) {
  const c = new MongoClient(rawUri + "/" + name, {
    serverSelectionTimeoutMS: 4000, connectTimeoutMS: 4000,
    socketTimeoutMS: 15000, tls: true,
  });
  await c.connect();
  return c;
}

const results = [];
for (const [srcName, dstName] of Object.entries(MAP)) {
  let s = null, d = null;
  try {
    s = await openDb("test"); d = await openDb("sabrstudio");
    const sDocs = await s.db("test").collection(srcName).find({}).toArray();
    const dDocs = await d.db("sabrstudio").collection(dstName).find({}).toArray();
    const sMap = new Map(sDocs.map(x => [String(x._id), hashDoc(x)]));
    const dMap = new Map(dDocs.map(x => [String(x._id), hashDoc(x)]));
    let matched = 0, mismatched = 0, missing = 0;
    for (const [id, h] of sMap) {
      if (!dMap.has(id)) missing++;
      else if (dMap.get(id) === h) matched++;
      else mismatched++;
    }
    const extra = [...dMap.keys()].filter(id => !sMap.has(id)).length;
    const pass = missing === 0 && mismatched === 0;
    console.log(`${srcName} -> ${dstName}: src=${sDocs.length} dst=${dDocs.length} matched=${matched} mismatched=${mismatched} missing=${missing} extra=${extra} => ${pass ? "PASS" : "FAIL"}`);
    results.push({ src: srcName, dst: dstName, s: sDocs.length, d: dDocs.length, matched, mismatched, missing, extra, pass });
  } finally {
    if (s) { try { await s.close(); } catch {} }
    if (d) { try { await d.close(); } catch {} }
  }
}
const allPass = results.every(r => r.pass);
console.log(allPass ? "VERIFY: ALL PASS" : "VERIFY: FAILURES PRESENT");
process.exit(allPass ? 0 : 1);
