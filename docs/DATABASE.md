# DATABASE.md — Sabr Studio

Reference docs: `PRD.md` §8 (Content & Data), `TRD.md` §7 (Database Requirements), §11 (Validation), §12 (Security). No `DATABASE.md`/codebase existed prior to this document — schema below is derived strictly from those sections; nothing is invented beyond what they specify.

---

## 1. Database Stack

- **MongoDB Atlas** — sole datastore for all application data. Frontend never connects directly (`FR-P1`); only the backend, via **Mongoose**, communicates with MongoDB.
- **Responsibility**: persist Projects, Retail items, Enquiries, Orders, Admin accounts. All other state (cart, sessions) lives outside MongoDB (cart = client Context; sessions = signed JWT cookie, not server-stored).
- **Dev/prod separation**: separate clusters or, at minimum, separate databases within one cluster. Separate `MONGODB_URI` values per environment (dev `.env`, production Hostinger env panel). Never point local/preview work at the production database.
- Single shared connection pool established once at server start (`config/db.js` → `connectDB()`); never reconnect per-request. `mongoose.set('strictQuery', true)` set explicitly.

---

## 2. Schema Design

Five collections. Embedding vs. referencing is decided per relationship below — the driving rule is **Order line items are embedded snapshots, never live references**, so historical orders survive later edits/deletion of the source Project/Retail document.

### 2.1 Projects

| Field | Type | Required | Default | Nullable | Immutable | Notes |
|---|---|---|---|---|---|---|
| `_id` | ObjectId | auto | — | no | yes | Mongo-generated |
| `title` | String | yes | — | no | no | |
| `slug` | String | yes | — | no | **effectively yes post-publish** | Unique, lowercase, trimmed, server-generated at creation (`slugify`-style, `SEO-03`). Changing a published slug breaks canonical URLs/sitemap entries — treat as immutable once published; only edit deliberately with SEO impact understood. |
| `category` | String | conditional | — | no | no | Required where categories apply; validated against a shared constant list referenced by both `express-validator` and a Mongoose `enum` (`TRD §11`). Exact category values are admin/business-managed data, not specified in source docs — do not hardcode invented values here. |
| `location` | String | no | `null` | yes | no | |
| `year` | Number | no | `null` | yes | no | 4-digit year |
| `description` | String | yes | — | no | no | |
| `images` | Array<`{url: String, publicId: String}`> | conditional | `[]` | no | no | Required (≥1) when `published: true`. `publicId` is stored (not derived) so Cloudinary `destroy` needs no extra lookup on delete (`TRD §17`). |
| `projectDetails` | Object | no | `null` | yes | no | Structured extra info (e.g., area, style, scope). Exact sub-fields are project-specific business data not defined in source docs — define explicitly and validate each sub-field when implemented; do not leave as an unvalidated free-form object. |
| `price` | Number | conditional | `null` | yes | no | Required only when the project is marked purchasable (custom Mongoose validator). `min: 0`. |
| `published` | Boolean | yes | `false` | no | no | Independent visibility toggle (`FR-L3`) |
| `createdAt` / `updatedAt` | Date | auto | — | no | yes | Mongoose `{timestamps: true}`, backend-controlled |

**Relationships**: referenced by Orders when purchased — snapshotted at purchase time, never live-populated.

### 2.2 Retail

| Field | Type | Required | Default | Nullable | Immutable | Notes |
|---|---|---|---|---|---|---|
| `_id` | ObjectId | auto | — | no | yes | |
| `title` | String | yes | — | no | no | |
| `slug` | String | yes | — | no | effectively yes post-publish | Same discipline as Projects |
| `category` | String | conditional | — | no | no | Optional/required per catalog needs; enum-validated against a shared constant list, same mechanism as Projects |
| `description` | String | yes | — | no | no | |
| `images` | Array<`{url: String, publicId: String}`> | conditional | `[]` | no | no | Required (≥1) when `published: true` |
| `price` | Number | yes | — | no | no | `min: 0` — non-negative enforced at schema level |
| `availability` | Boolean | yes | `true` | no | no | Independent of `published` (`FR-M3`) |
| `published` | Boolean | yes | `false` | no | no | Independent of `availability` |
| `createdAt` / `updatedAt` | Date | auto | — | no | yes | |

**Relationships**: referenced by Orders when purchased — snapshotted, never live-populated. Deleting a Retail item must never corrupt an existing Order (`FR-M4`) — guaranteed by the snapshot design.

### 2.3 Enquiries

| Field | Type | Required | Default | Nullable | Immutable | Notes |
|---|---|---|---|---|---|---|
| `_id` | ObjectId | auto | — | no | yes | |
| `name` | String | yes | — | no | no | |
| `email` | String | **yes** (PRD) | — | no | no | ⚠ **Documented conflict**: `PRD.md` §8 marks email required with valid-format validation; `UI-UX.md` §75's `InquiryForm` spec marks email optional (validated only if filled). PRD outranks UI-UX in the source hierarchy — schema and backend validation enforce **required**. Flag to the client/design team before the form ships, since the UI copy currently implies otherwise. |
| `phone` | String | yes | — | no | no | Always `String` — never `Number` (preserves leading zeros/formatting) |
| `message` | String | yes | — | no | no | Length-capped (max length defined at validation layer) |
| `source` | String | no | `null` | yes | yes | Origin route (e.g., `/contact`, `/projects/:slug`), set at creation, never edited after |
| `status` | String (enum) | yes | `'new'` | no | no | `['new', 'in-progress', 'resolved']` |
| `createdAt` | Date | auto | — | no | yes | Serves as "submission date" |
| `updatedAt` | Date | auto | — | no | yes | |

**Visibility**: never exposed through any public endpoint (`FR-N4`).

### 2.4 Orders

| Field | Type | Required | Default | Nullable | Immutable | Notes |
|---|---|---|---|---|---|---|
| `_id` | ObjectId | auto | — | no | yes | Serves as the order identifier |
| `customer` | Object `{name, email, phone, ...}` | yes | — | no | yes (post-creation) | Collected at checkout |
| `items` | Array of embedded subdocuments | yes | — | no | yes (post-creation) | **Not** a live `ref`/populate. Each item: `{ itemId: ObjectId, itemType: 'project' \| 'retail', name: String, quantity: Number, unitPrice: Number, lineTotal: Number }` — `name`/`unitPrice` are point-in-time snapshots (`FR-H2`) |
| `amount` | Number | yes | — | no | yes (post-creation) | Computed **server-side only**, in the checkout service; never accepted from client input at any layer (`FR-G3`) |
| `payment` | Object | yes | — | no | see below | `{ razorpayOrderId: String, razorpayPaymentId: String, verified: Boolean }` |
| `paymentStatus` | String (enum) | yes | `'pending'` | no | write-once except via verification service | `['pending', 'paid', 'failed', 'cancelled']` — set only by the backend's Razorpay signature-verification step; never client- or admin-settable (`FR-O3`, `SEC-14`) |
| `orderStatus` | String (enum) | yes | `'pending'` | no | admin-editable | `['pending', 'confirmed', 'completed', 'cancelled']` — the only field the admin order-status endpoint may change |
| `createdAt` / `updatedAt` | Date | auto | — | no | yes | |

`paymentStatus` and `orderStatus` are **separate fields, tracked independently** (`FR-H4`) — never conflate or derive one from the other.

### 2.5 Admin

| Field | Type | Required | Default | Nullable | Immutable | Notes |
|---|---|---|---|---|---|---|
| `_id` | ObjectId | auto | — | no | yes | |
| `name` | String | yes | — | no | no | |
| `email` | String | yes | — | no | no | Unique |
| `password` | String (bcrypt hash) | yes | — | no | no | `select: false` by default — excluded from every query result unless explicitly `.select('+password')`-ed inside the login service; never included in any response payload |
| `role` | String (enum) | yes | `'admin'` | no | no | Single role sufficient at current scope — do not add a role system that isn't requested |
| `status` | String (enum) | yes | `'active'` | no | no | `['active', 'disabled']` — checked by `protect` middleware alongside token validity |
| `createdAt` / `updatedAt` | Date | auto | — | no | yes | |
| `lastLoginAt` | Date | no | `null` | yes | no | Updated on successful login |

---

## 3. Data Type Stability

- One type per field, enforced at three layers simultaneously: Mongoose schema type → `express-validator` chain → frontend form/type expectation. All three must agree; a mismatch is a bug, not a "convert on the way in."
- **Never store the same logical field as two types.** Concretely: `phone` is always `String` end-to-end (never cast to `Number` anywhere, including in the frontend form state or a future CSV export) — leading zeros and `+country` formats would silently corrupt under numeric storage.
- **Never silently coerce incompatible input.** If a field expects `Number` and receives a non-numeric string, `express-validator` rejects the request (400) before it reaches Mongoose — the model layer is not the place invalid types get "fixed."
- Money fields (`price`, `amount`, `unitPrice`, `lineTotal`) are `Number`; no third-party decimal library is introduced at this scope, but values are validated `min: 0` everywhere they appear.
- **Safe migration rule for a genuine type change**: (1) add the new field alongside the old one, (2) backfill via a one-off migration script that reads the old type and writes the new one explicitly (never an implicit cast), (3) update all three layers (schema, validator, frontend) together in the same deploy, (4) remove the old field only after confirming no code path reads it. Never rename/retype a field in place against production data without this sequence.

---

## 4. Validation

| Layer | Mechanism | Scope |
|---|---|---|
| Frontend | Shared `validators.js` utils | UX feedback only, never authoritative |
| Backend (authoritative) | `express-validator` chains + `handleValidationErrors` middleware | Every mutating endpoint, before any service/DB call |
| Database (defense in depth) | Mongoose schema validators | Required fields, `enum`, `min`, custom validators (conditional `required`, e.g. Project `price`) |

Rules enforced across Projects/Retail/Enquiries/Orders/Admin:
- **String**: `trim`, required-non-empty where specified, max length where a limit is documented (`message`, `description`).
- **Number**: `min: 0` on all price/amount fields; `year` constrained to a 4-digit numeric range.
- **Boolean**: `published`, `availability` — no truthy-string coercion; must be actual booleans at the request boundary.
- **Date**: `createdAt`/`updatedAt`/`lastLoginAt` are backend/Mongoose-controlled only — never accepted from client input.
- **ObjectId**: route params referencing `:id` are validated as syntactically valid Mongoose ObjectIds before query execution; an invalid format maps to 404/400, not an uncaught cast error.
- **Enum**: `Enquiry.status`, `Order.paymentStatus`, `Order.orderStatus`, `Admin.role`, `Admin.status`, `Project.category`/`Retail.category` (against the shared constant list) — rejected at both `express-validator` and Mongoose layers if the value isn't in the set.
- **Format**: `email` (Enquiry, Admin) validated against a standard email pattern at both layers; `slug` validated for URL-safety at creation.
- **Unique constraints**: `Project.slug`, `Retail.slug`, `Admin.email` — enforced via unique indexes (§6), with the resulting duplicate-key error mapped to a clean 409, not a raw Mongo error surfaced to the client.
- **Sanitization**: free-text fields (`message`, `description`) are trimmed and length-capped; none of this content is currently rendered as raw HTML anywhere in the app, but the rule stands defensively.
- Any request failing validation is rejected with field-level detail in the standard error envelope — no partial writes.

---

## 5. Security

- **Atlas auth**: SCRAM database users, no anonymous access.
- **Least privilege**: the application's DB user has `readWrite` scoped to this project's database only — never an Atlas admin/global user.
- **Strong credentials**: generated, not chosen; rotated immediately if ever exposed (e.g., accidental commit, log leak).
- **Network access**: Atlas IP allowlist scoped to the backend's outbound IP(s); no `0.0.0.0/0` unless the hosting plan genuinely provides no stable IP, in which case strong credentials + TLS are the compensating control.
- **TLS**: enforced by Atlas by default for all connections; no plaintext connection path exists.
- **Environment variables**: `MONGODB_URI` and all other secrets live only in `.env` (gitignored) locally and the hosting platform's environment panel in production — never in source, never committed.
- **No credentials in source**: enforced by `.gitignore` covering `.env*` (except `.env.example`, which holds names only).
- **NoSQL injection prevention**: never pass a raw `req.query`/`req.body` object directly into a Mongoose filter — only explicitly whitelisted, validated fields are used to build query filters, preventing operator injection (`$gt`, `$where`, etc. supplied by an attacker).
- **Unauthorized access prevention**: only the backend process holds DB credentials; all admin-mutating routes sit behind `protect` middleware re-verified server-side on every request (`FR-J5`), independent of frontend route guarding.
- **Sensitive-field protection**: `Admin.password` is `select: false` by default; Enquiry/Order data is never returned by any public endpoint; no response ever includes password hashes, Razorpay/Cloudinary secrets, or the raw `MONGODB_URI` (`SEC-12`).
- **Password hashing**: `bcrypt`, industry-standard cost factor; plaintext never stored, logged, or returned.
- **Access control**: single `admin` role at current scope; `Admin.status` (`active`/`disabled`) checked alongside token validity on every protected request.
- **Safe error messages**: database/validation errors are logged with full context server-side only; the client receives a generic message in production, never a raw Mongo/Mongoose error, stack trace, or connection string fragment.
- **Production practice summary**: dedicated production database, rotated credentials, allowlisted network access, backups enabled (§13), no direct external client access to Atlas ever.

---

## 6. Indexes

| Collection | Index | Type | Purpose |
|---|---|---|---|
| Projects | `slug` | unique | Slug resolution, prevents duplicates |
| Projects | `{published, category}` | compound | Public listing/filter queries |
| Retail | `slug` | unique | Slug resolution |
| Retail | `{published, availability}` | compound | Public listing queries |
| Enquiries | `{status, createdAt: -1}` | compound | Admin listing/sort/filter |
| Orders | `{paymentStatus, orderStatus}` | compound | Admin filtering |
| Orders | `razorpayOrderId`, `razorpayPaymentId` | single (or compound if always queried together) | Fast lookup during payment verification |
| Admin | `email` | unique | Login lookup, prevents duplicate accounts |

- **Naming**: descriptive, purpose-revealing names (e.g., `slug_unique`, `published_category_idx`) rather than Mongo's positional auto-names, so `db.collection.getIndexes()` output is self-explanatory in ops review.
- **No unnecessary indexes**: no text/full-text index is created — no search feature is defined in `PRD.md`; no index on `title`, `description`, or other non-filtered fields.
- **Maintenance**: review Atlas's index-usage stats periodically; drop any index with zero reads once a feature that relied on it is removed. Every new query pattern added to the codebase is checked against existing indexes before shipping — don't ship a new admin filter that forces a collection scan.

---

## 7. CRUD & Query Rules

| Operation | Rule |
|---|---|
| **Create** | Always through the service layer after `express-validator` passes; controllers never call `Model.create()` directly |
| **Read (public)** | Always filtered — `.find({ published: true })` for listings, `.findOne({ slug, published: true })` for detail. Public reads use `.select()` to return only listing-relevant fields; full detail fetched only on the detail view (`PERF-05`) |
| **Read (admin)** | No `published` filter — admin sees all statuses. Enquiries/Orders are admin-only reads, never exposed on a public route |
| **Update** | Field-scoped — e.g., the order-status endpoint updates `orderStatus` only, never touches `paymentStatus` or `amount`; publish/availability toggles are independent single-field updates |
| **Delete** | Hard delete for Projects/Retail (immediate public removal, `FR-L4`/`FR-M4`) and Enquiries (`FR-N3`) — no soft-delete layer is defined by `PRD.md`/`TRD.md`; do not add one without an explicit requirement, since "immediately removed" already covers the visibility need and Order snapshots already cover the integrity need |
| **Filtering** | Public: `published` (+`availability` for Retail, +`category`). Admin: `status` (Enquiries), `paymentStatus`/`orderStatus` (Orders) — all via indexed fields (§6) |
| **Sorting** | Enquiries: `createdAt: -1` (supported by its compound index). Orders/admin listings: `createdAt: -1` by default |
| **Pagination** | `.limit()`/`.skip()` on admin listing endpoints (Orders, Enquiries) once volume makes an unbounded list impractical (`PERF-08`); public Projects/Retail listings use the "Load More"/"View All" UI pattern backed by the same limit/skip approach, not a separate full-catalog fetch |
| **Projection** | Listing queries `.select()` only display fields (title, image, price, category); never return `password`, internal Razorpay/Cloudinary identifiers, or full `customer` object on a listing |
| **Search** | Not required by `PRD.md` at this scope — no text index or search endpoint is introduced |
| **Aggregation** | Admin dashboard overview counts (`FR-K2`) are satisfied with `countDocuments()` per collection — no aggregation pipeline is required at current scope; introduce one only if a future requirement needs cross-collection rollups |
| **Efficiency** | Every listing/filter query path must be covered by an index in §6 before shipping; avoid `$or` across unindexed fields on high-traffic public routes |

---

## 8. Data Integrity

- **Referential consistency**: Orders never live-reference Project/Retail — the embedded snapshot (§2.4) is what allows a Project/Retail document to be edited or deleted without corrupting historical Orders (`FR-M4`).
- **Duplicate prevention**: unique indexes on `Project.slug`, `Retail.slug`, `Admin.email` reject duplicates at the database layer even if application logic has a bug.
- **Atomic operations**: single-document updates (publish toggle, status change) are naturally atomic via Mongoose's single-document write. No multi-document transaction is required at current scope, since Order creation writes one Order document and does not need to atomically modify Project/Retail stock (no stock-quantity field is defined — `availability` is a simple boolean, not a counter). If a future requirement introduces multi-document atomicity (e.g., decrementing stock), use a Mongo session/transaction rather than sequential unguarded writes.
- **Race-condition protection**: checkout re-validates price/availability server-side at order-creation time (`FR-F6`), and the resulting price is snapshotted into the Order immediately — a subsequent product price change never affects an already-created Order. Payment verification only checks the Razorpay signature; it does not re-check price, so the snapshot-at-creation step is the sole point where price races are closed.
- **Update restrictions**: `paymentStatus` is settable only by the verification service, never by any admin-facing or client-facing update path (`FR-O3`). `Order.amount` and `Order.items` are immutable after creation. `Admin.password` is never updatable through the general profile-update path — only through a dedicated, re-authenticated change-password flow if one is added.
- **Delete dependencies**: deleting a Project/Retail document triggers a Cloudinary cleanup call (using the stored `publicId`, §2.1/2.2) but has zero effect on existing Orders. Deleting an Enquiry is a true hard delete with no dependents.

---

## 9. API ↔ Database Mapping

- Field names match 1:1 between the API request/response envelope and the Mongoose schema (`camelCase` throughout: `unitPrice`, `paymentStatus`, `createdAt`) — no silent renaming between layers (e.g., no `payment_status` in one layer and `paymentStatus` in another).
- Response envelope is uniform: `{ success: true, data }` / `{ success: false, message, errors? }` — `data` mirrors the Mongoose document shape (minus any `select: false` fields) rather than a bespoke per-endpoint shape.
- **Transformation is applied only where necessary**:
  - `password` is stripped before any Admin document ever reaches a response (enforced by `select: false`, not a manual delete — reduces the chance of a forgotten strip).
  - Cloudinary `images` are transformed into optimized delivery URLs (`f_auto`/`q_auto` params appended) at render time on the frontend, not stored pre-transformed — the DB always holds the canonical `{url, publicId}`.
  - Currency/price values are plain `Number` end-to-end; no string-formatted currency is ever stored (formatting for display, e.g. `₹`, happens only in the frontend).
- **Type consistency**: if the frontend form treats a field as a string (e.g., `phone`), the API validator and the Mongoose schema must both type it as `String` — a mismatch at any one layer is a bug to fix, not a conversion to add.

---

## 10. Timestamps & Lifecycle

- `createdAt`/`updatedAt` via Mongoose's built-in `{ timestamps: true }` on every collection — backend-controlled, never client-settable, stored as UTC `Date`/ISODate (Mongo's native format). Timezone conversion for display is a frontend concern (`Intl.DateTimeFormat`), not a stored field.
- `Admin.lastLoginAt` updates on each successful login — the one lifecycle field beyond the standard pair.
- **Lifecycle/status fields**: `Project.published`, `Retail.published`/`availability`, `Enquiry.status`, `Order.paymentStatus`/`orderStatus` are the system's only state-machine-like fields; each has a fixed enum/boolean domain (§2, §4) and no field outside these represents record lifecycle.
- **No soft delete** is defined anywhere in the schema (see §7 Delete) — a record either exists or has been hard-deleted; do not add a `deletedAt`/`isDeleted` pattern without an explicit product requirement, as none currently exists.

---

## 11. File & Media Data

- MongoDB stores **metadata only**: `{ url, publicId }` per image, on `Project.images`/`Retail.images`. No binary image data is ever stored in a document.
- Cloudinary is the sole store for binaries; the `publicId` is what makes deletion cleanup (§2.1/2.2, `FR-L4`) a direct API call with no extra lookup.
- Multer handles the upload in-memory only (never written to local disk) before forwarding to Cloudinary — the database is never in the upload path itself, only in the post-upload metadata write.
- No other file type (documents, video) is defined in scope — do not add a media schema beyond images.

---

## 12. Performance & Scalability

- Query efficiency and indexing are covered in §6/§7 — every shipped query path must hit an index.
- **Document size control**: Projects/Retail keep `images` as a small array of `{url, publicId}` pairs (not embedded binary or large arrays of unbounded metadata); `projectDetails` is a bounded, explicitly-defined object, not an open-ended free-form blob.
- **Pagination**: admin listings (Orders, Enquiries) paginate once volume warrants it (`PERF-08`); public listings use "Load More"/"View All" backed by `limit`/`skip`.
- **Connection management**: one pooled connection established at server startup, reused across all requests — never opened per-request.
- **Avoid unnecessary requests**: listing views fetch summary fields only; detail views fetch full documents only when the user actually navigates to them — no prefetch-everything pattern.
- **Future growth**: the `{published, category}` / `{published, availability}` compound indexes are the ones to revisit first if listing queries slow down as catalog size grows; the `Order` collection is the fastest-growing collection over time and its `{paymentStatus, orderStatus}` index is the one to monitor for selectivity as volume increases.

---

## 13. Backup & Recovery

- Enable Atlas's automated Cloud Backup (snapshot frequency per the cluster tier) on the production cluster; verify point-in-time restore actually works before relying on it in an incident.
- **Restore process**: restore the affected collection(s) from the nearest pre-incident snapshot into a scratch database first, verify integrity, then cut over — never restore directly on top of the live production database without a verified copy.
- **Data-loss prevention**: no destructive operation (bulk delete, schema drop) runs against production without a recent verified backup and a second person's confirmation.
- **Recovery considerations**: cross-check restored data against `Order`/`Enquiry` timestamps to identify what, if anything, was lost between the snapshot and the incident, since Orders/Enquiries are the collections with real business/financial consequence if lost.

---

## 14. Migration & Versioning

- **Schema-change procedure**: (1) write the migration/backfill script, (2) test it against a copy of production data, (3) deploy the code that can read *both* old and new shapes, (4) run the migration, (5) deploy the code that requires the new shape only, (6) remove backward-compatibility code once confirmed stable. Never skip straight to step 5.
- **Backward compatibility**: a schema change ships in a way that doesn't break currently-deployed frontend code during the deploy window (e.g., adding a new required field needs a default/backfill before making it required in validation).
- **Safe deployment order**: database migration → backend deploy → frontend deploy, when a change flows in that direction; reverse the order if the frontend can tolerate the old API shape but the backend cannot start without the new schema.
- **Never modify production data blindly**: every migration script is dry-run (report-only mode) against production data before it's allowed to write.

---

## 15. Monitoring & Maintenance

- **Monitoring**: Atlas's built-in metrics (connections, query performance, storage) reviewed regularly; slow-query threshold alerts configured so an unindexed query pattern is caught before it degrades production.
- **Slow queries**: any query flagged by Atlas's profiler is checked against §6's index list — either an existing index isn't being used (query needs reshaping) or a new index is genuinely justified.
- **Storage usage**: tracked against the Atlas tier's limits, with `Order`/`Enquiry` growth as the primary long-term driver (§12).
- **Connection issues**: connection failures at `connectDB()` fail loudly (logged, process does not silently start half-broken) — see `TRD.md` LOG-04.
- **Index review**: revisited whenever a new admin filter/sort is added, and periodically for unused indexes (§6).
- **Security review**: periodic check that the DB user's permissions are still least-privilege, Atlas network access list is still current, and no secret has drifted into source control.
- **Regular maintenance**: dependency (`mongoose`) version currency, backup-restore drills (§13), and a periodic pass through this document to confirm it still matches the live schema.

---

## 16. Production Rules

- **Isolation**: production and development/preview never share a database or DB user.
- **Minimum permissions**: the production DB user has exactly `readWrite` on the app's own database — nothing broader.
- **Secure connection**: `MONGODB_URI` (with credentials) only in Hostinger's environment panel, TLS enforced by Atlas, IP access restricted to the backend's outbound address(es).
- **No manual production changes without verification**: any direct `mongosh`/Atlas-UI edit to production data is dry-run/verified against a copy first, and logged/communicated — never an unreviewed one-off "quick fix."
- **No destructive operation without backup/recovery consideration**: §13's backup must be current and restorable before any bulk delete, index drop, or schema-altering migration runs against production.

---

## 17. Database Reference Tables

**Collections**

| Collection | Purpose | Public-readable |
|---|---|---|
| Projects | Portfolio showcase | Yes (published only) |
| Retail | Shop catalog | Yes (published + available only) |
| Enquiries | Lead capture | No — admin-only |
| Orders | Purchase/payment records | No — admin-only |
| Admin | Studio staff auth | No — never exposed |

**Sensitive fields** (never returned by any API response)

| Collection | Field | Protection |
|---|---|---|
| Admin | `password` | `select: false`, `bcrypt` hash only |
| Orders | `payment.razorpayOrderId` / `razorpayPaymentId` | Admin-only visibility; never on any public route |
| Enquiries | entire document | Admin-only (`FR-N4`) |

**Relationships**

| From | To | Type | Mechanism |
|---|---|---|---|
| Orders.items | Projects / Retail | Snapshot (not live ref) | `itemId` stored for traceability; `name`/`unitPrice` frozen at purchase time |

See §2 for the full per-collection field/type/required/validation tables and §6 for the full index table.

---

## 18. Final Database Checklist

- [ ] Separate MongoDB Atlas database/cluster for development vs. production, with distinct `MONGODB_URI` values
- [ ] All five collections (Projects, Retail, Enquiries, Orders, Admin) implement the exact field set, types, and required/optional status in §2
- [ ] Every field has one stable type enforced identically in the Mongoose schema, the `express-validator` chain, and the frontend form/type
- [ ] Unique indexes exist on `Project.slug`, `Retail.slug`, `Admin.email`
- [ ] Compound indexes exist on `{Project.published, category}`, `{Retail.published, availability}`, `{Enquiry.status, createdAt}`, `{Order.paymentStatus, orderStatus}`
- [ ] `Admin.password` is `select: false` and never appears in any response payload
- [ ] `Order.amount`, `paymentStatus` are never accepted from client input at any layer
- [ ] Order line items are embedded snapshots, not live `ref`/populate
- [ ] Enquiries are never returned by any public endpoint
- [ ] Production DB user has least-privilege (`readWrite`, single database) credentials, distinct from any dev/preview user
- [ ] Atlas network access list is scoped to the backend's outbound IP(s), not `0.0.0.0/0` unless unavoidable
- [ ] TLS is enforced on all Atlas connections
- [ ] `MONGODB_URI` and all secrets live only in environment variables, never in source
- [ ] Atlas automated backups are enabled and a restore has been test-verified
- [ ] No query path exists that isn't covered by an index in §6
- [ ] No soft-delete, search, or aggregation feature exists beyond what §7/§10 define, unless a new requirement has been documented first
- [ ] The `Enquiry.email` required/optional conflict (§2.3) has been resolved with the client and this document updated to match

---

## 19. Additional Performance, Concurrency & Access-Control Requirements

Extends §6/§7 (indexing, queries) and §12 (Performance & Scalability) with items not previously called out explicitly.

- **N+1 prevention**: No query path issues a per-item follow-up query in a loop (e.g., fetching an Order list and then querying each item's current Project/Retail document individually) — Order line items are self-contained snapshots (§2.4) specifically so no such join/lookup is ever needed at read time. Any future feature that appears to need a per-document follow-up query must instead use Mongoose `.populate()` in a single batched call, or be redesigned to avoid the pattern.
- **Query limits**: Every listing endpoint enforces a server-side maximum `limit`, independent of any value the client requests (`PERF-08`, `API.md` §16/§23) — a client cannot force an unbounded fetch by passing a very large `limit`. Exact maximum value is `TBD`.
- **Large dataset handling**: As Projects/Retail/Enquiries/Orders volume grows, listing queries continue to rely on the indexes in §6 rather than in-application filtering/sorting of a fully-fetched collection; no endpoint ever loads a full collection into memory to filter/sort it in Node.
- **High-concurrency considerations**: Mongoose's built-in connection pool (§1) serves concurrent requests without per-request reconnection; write paths with real concurrency risk (checkout/order creation) are covered by the race-condition protection already defined in §8, not by ad hoc locking. Pool size is left at the Mongoose/driver default unless a measured need justifies tuning it; a specific pool-size value is `TBD` if ever changed from default.
- **Database access control (cross-reference)**: Least-privilege DB user, network allowlisting, and TLS are already defined in §5/§16 — restated here only to confirm no additional access-control mechanism (e.g., row-level security, a second DB user tier) is introduced at this scope.
- **Sensitive data protection (cross-reference)**: Field-level protections (`Admin.password` `select: false`, Enquiry/Order admin-only visibility) are defined in §5/§17; no change to those mechanisms is introduced here.
