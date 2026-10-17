// Print exact installed driver versions (no credentials)
import mongoose from "../backend/node_modules/mongoose/lib/index.js";
import { MongoClient } from "../backend/node_modules/mongodb/lib/index.js";

console.log("node:", process.version);
console.log("os:", process.platform, process.arch);
console.log("mongoose:", mongoose.version);
const mongoPkg = await import("../backend/node_modules/mongodb/package.json", { with: { type: "json" } });
console.log("mongodb-native:", mongoPkg.default.version);
console.log("tls-default-min:", (process.binding && process.binding("tls_wrap")) ? "n/a-check-below" : "n/a");
import { getCiphers } from "node:crypto";
console.log("tls-ciphers-sample:", getCiphers().slice(0, 5).join(","));
