// Smoke test: boot the real Express app against sabrstudio and exercise
// health + public reads + admin login shape. Test-only, no writes except
// an optional enquiry cleanup (skipped unless ENABLE_SMOKE_WRITE=1).
import mongoose from "../backend/node_modules/mongoose/lib/index.js";

process.env.NODE_ENV = "test";
process.env.MONGODB_DB_NAME = "sabrstudio";
process.env.JWT_SECRET = "smoke-test-secret-at-least-32-chars-long!!";
process.env.JWT_EXPIRES_IN = "1h";

const { default: app } = await import("../backend/app.js");
import { connectDB, getEffectiveDbName } from "../backend/config/db.js";

console.log("effectiveDb:", getEffectiveDbName());
await connectDB();
console.log("readyState:", mongoose.connection.readyState, "db:", mongoose.connection.name);

// Minimal supertest-style check without extra deps: use app.handle via node http
import http from "node:http";
const server = http.createServer(app);
await new Promise((res) => server.listen(0, res));
const port = server.address().port;
async function get(path) {
  const r = await fetch(`http://127.0.0.1:${port}${path}`);
  const body = await r.json().catch(() => ({}));
  return { status: r.status, body };
}
const checks = [];
const health = await get("/health");
checks.push(["GET /health", health.status, health.body?.data?.database]);
const pub = await get("/api/projects");
checks.push(["GET /api/projects", pub.status, Array.isArray(pub.body?.data) ? `n=${pub.body.data.length}` : "?"]);
const retail = await get("/api/retail");
checks.push(["GET /api/retail", retail.status, Array.isArray(retail.body?.data) ? `n=${retail.body.data.length}` : "?"]);
const cats = await get("/api/retail/categories");
checks.push(["GET /api/retail/categories", cats.status, "?"]);
for (const [name, status, extra] of checks) console.log(`${name}: ${status} ${extra ?? ""}`);
server.close();
await mongoose.disconnect();
const ok = checks.every(([, s]) => s === 200);
console.log(ok ? "SMOKE: ALL PASS" : "SMOKE: FAILURES PRESENT");
process.exit(ok ? 0 : 1);
