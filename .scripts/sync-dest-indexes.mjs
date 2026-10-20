// Sync schema indexes onto sabrstudio destination (additive only).
// Imports models so their index definitions register, then calls syncIndexes
// per model. Never drops data; syncIndexes only reconciles indexes.
import mongoose from "../backend/node_modules/mongoose/lib/index.js";

const rawUri = process.env.MONGODB_URI;
if (!rawUri) { console.error("ERROR: MONGODB_URI is not set"); process.exit(1); }

// Collection pins must be registered before sync (same as models).
await import("../backend/models/admin.model.js");
await import("../backend/models/customer.model.js");
await import("../backend/models/order.model.js");
await import("../backend/models/project.model.js");
await import("../backend/models/retail.model.js");
await import("../backend/models/enquiry.model.js");

await mongoose.connect(rawUri + "/sabrstudio", { autoIndex: false });
console.log("CONNECTED to sabrstudio");
for (const name of mongoose.modelNames()) {
  const Model = mongoose.model(name);
  try {
    await Model.syncIndexes();
    const indexes = await Model.listIndexes();
    console.log(`${name} -> ${Model.collection.name}: ${indexes.length} indexes OK`);
    for (const ix of indexes) console.log(`    key=${JSON.stringify(ix.key)}`);
  } catch (e) {
    console.log(`${name}: FAILED ${e.message}`);
  }
}
await mongoose.disconnect();
console.log("DONE");
