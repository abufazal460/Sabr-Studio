# 04-database.md — Sabr Studio Database Layer (MongoDB / Mongoose)

Companion to `00-master-context.md` and `01-setup.md` — read both first. This file is the **Mongoose schema/data-layer execution prompt only**: collections, schema shape, validation, indexes, and data-integrity rules. It does not cover route/controller/service logic (`03-backend.md`) or frontend consumption (`02-frontend.md`) — do not duplicate either here, and do not pull this file's content forward into them.

---

## 1. Role & Objective

You are implementing or modifying Mongoose models for the Sabr Studio backend. This is schema/data-layer work only — no routes, controllers, services, or business logic beyond what a schema itself enforces (validation, defaults, hooks strictly needed for data integrity e.g. slug generation). Before writing or editing any model, **inspect the existing `backend/models/` directory** — if a model already exists, adjust only what's missing or inconsistent with the source documents rather than rewriting it wholesale.

---

## 2. Source of Truth

Per `00-master-context.md` §3, the hierarchy for anything this file touches is: `PRD.md` → `TRD.md` → `ARCHITECTURE.md` → `DATABASE.md` (authoritative for exact field lists, types, and index definitions) → `API.md` → `SECURITY.md` → `CODING-RULES.md`/`AI-RULES.md` → `FOLDER-STRUCTURES.md` → existing repo → current task. This file restates only what `00-master-context.md` §6.4 already makes binding at the index/summary level. **For the exact, complete field list of any schema, go to `DATABASE.md` §2 — do not invent a field, subfield, or collection not named there.** Where this file and `DATABASE.md` appear to disagree, `DATABASE.md` wins and the discrepancy is flagged back, per the Section 4 conflict rule in `00-master-context.md`.

---

## 3. Collections (exactly 5 — `00-master-context.md` §6.4)

| Collection | Model file | Purpose |
|---|---|---|
| Projects | `project.model.js` | Portfolio showcase items, category-based |
| Retail | `retail.model.js` | Purchasable catalog items |
| Enquiries | `enquiry.model.js` | Contact/enquiry form submissions |
| Orders | `order.model.js` | Verified Razorpay purchases (embedded snapshots) |
| Admin | `admin.model.js` | Single-role admin accounts |

No sixth collection is created without a named, otherwise-unsatisfiable requirement cited from `PRD.md`/`TRD.md`/`DATABASE.md`. Do not scaffold a `Category`, `Review`, `Wishlist`, or `Customer` collection — all are explicitly out of scope (`00-master-context.md` §5, C7).

---

## 4. Field Types, Required/Optional, Validation, Defaults, Enums

- Every field's type, required/optional status, and validation rule must match `DATABASE.md` §2 exactly — do not mark a documented-required field optional (or vice versa) and do not add `express-validator`-style constraints at the schema layer beyond what `DATABASE.md` specifies; validation duplication belongs to `03-backend.md`'s validators, not invented Mongoose-level rules.
- `Enquiry.phone` is always `String`, never `Number` (`00-master-context.md` §6.4) — do not coerce it to a numeric type for "convenience."
- `Enquiry.email` is **required**, both client- and server-side — this resolves the PRD/UI-UX conflict C4 in favor of `PRD.md`. Do not mark it optional.
- Do **not** add a `projectType` field to the Enquiry schema (conflict C5) — `PRD.md` §8 and `DATABASE.md` §2.3's canonical schema omit it, and no source document resolves the discrepancy with `FOLDER-STRUCTURES.md`'s database map. If this task touches `enquiry.model.js`, flag the discrepancy explicitly rather than silently adding or omitting it beyond what's already the case.
- Enum fields (e.g. `Order.paymentStatus`, `Order.orderStatus`, any `category`/`availability` field) use the exact value sets `DATABASE.md` §2 defines — do not add, rename, or drop an enum value without a cited requirement.
- Defaults are set only where `DATABASE.md` specifies one (e.g. publication-state defaults, `createdAt`-driven sort defaults) — do not invent a default value for a field the source docs leave unset.

---

## 5. Indexes & Unique Constraints (`00-master-context.md` §6.4 — binding minimum set)

| Collection | Required index(es) |
|---|---|
| Projects | Unique `slug`; `{published, category}` |
| Retail | Unique `slug`; `{published, availability}` |
| Enquiries | `{status, createdAt: -1}` |
| Orders | `{paymentStatus, orderStatus}`; Razorpay ID lookup index(es) |
| Admin | Unique `email` |

This is the non-negotiable minimum — additional indexes are added only if `DATABASE.md` §2 names them for query patterns not covered above. Do not drop or weaken any index in this table when editing an existing model.

---

## 6. Timestamps

- Every schema uses Mongoose's built-in `{ timestamps: true }` (`createdAt`/`updatedAt`) unless `DATABASE.md` explicitly says otherwise for a given collection — do not hand-roll a custom timestamp field where the built-in option applies.
- Sort-by-recency behavior (e.g. Enquiries admin list, Orders admin list) relies on `createdAt` via the index in §5 — do not introduce a separate `sortOrder` or manual date field to achieve the same thing.

---

## 7. References vs. Embedded Snapshots

- **Order line items are embedded snapshots, never a live `ref`/`populate`** — this is ADR-05 (`00-master-context.md` §6.4) and protects historical orders from later Project/Retail edits or deletion. Never "simplify" this into a `ref` to `Retail`/`Project`, even if it looks like duplication.
- `Order.amount` is computed **server-side only** in the checkout service and stored on the document — it is never a field accepted from client input at the schema or any other layer.
- `Order.paymentStatus` and `Order.orderStatus` are **separate** enum fields, updated through different code paths (payment status only via verified Razorpay signature; order status only via the admin PATCH endpoint) — never merge these into one status field or let one path write the other.
- Any other cross-collection reference (e.g. an admin-authored field pointing at another document) uses a standard Mongoose `ObjectId` `ref` only where `DATABASE.md` specifies one — do not add a reference relationship that isn't documented.

---

## 8. Slugs

- Slugs exist on **Projects** and **Retail** only.
- Slugs are **server-generated**, unique, lowercase — never trusted from or accepted as client input, even on create.
- Effectively immutable once a document is published — do not silently regenerate or allow edits to a slug on an already-published item; if a rename is required, treat it as a task needing explicit confirmation, not a default schema behavior.
- Enforce uniqueness via the unique index in §5, not application-only checks.

---

## 9. Image Data

- MongoDB stores only `{ url, publicId }` for any image field (Projects, Retail) — **never binary data, never a raw file buffer** (`00-master-context.md` §6.8).
- Multer/Cloudinary upload logic itself is backend-service work (`03-backend.md`), out of scope here — this file only fixes the shape image subdocuments/arrays must take in the schema.
- Deleting a Project/Retail document is expected to flag its stored `publicId`(s) for Cloudinary `destroy` — that orchestration lives in the service layer, but the schema must retain `publicId` for every stored image so that cleanup is possible; do not drop `publicId` to save space.

---

## 10. Publication State

- Projects and Retail carry a `published` boolean (or the exact field `DATABASE.md` names) gating public visibility — public list/detail endpoints (`00-master-context.md` §6.3) filter on it, so the field and its default must match `DATABASE.md` exactly.
- Retail additionally gates on `availability` per the `{published, availability}` index in §5 — do not conflate `published` and `availability` into a single field.
- Do not add a third publication-state value (e.g. "draft"/"archived") beyond what `DATABASE.md` §2 defines, even if it seems like a natural extension.

---

## 11. Pagination Support

- Any list-returning query (Projects, Retail, Enquiries, Orders admin lists) must be able to paginate against the indexes already required in §5 — `createdAt`-based indexes exist specifically to support cursor/offset pagination on admin lists without a collection scan.
- Do not add a dedicated `page`/`limit` field to any schema — pagination parameters are a query-time/API concern (`03-backend.md`/`API.md`), not a stored field. This file's responsibility ends at making sure the supporting indexes exist.

---

## 12. Data Integrity

- No schema field is added, renamed, or removed without a citation to `DATABASE.md` §2 (or an explicitly flagged, unresolved conflict per Section 4 of `00-master-context.md`).
- Required-field enforcement happens at the schema layer as a last line of defense — it does not replace `express-validator` checks in `03-backend.md`, and the schema must never be weakened to "make a form easier to submit."
- Do not remove or bypass the unique constraints in §5 to work around a duplicate-key error during development — fix the underlying data or logic instead.
- Do not perform a migration, backfill, or destructive schema change as a side effect of an unrelated task — split into Requested / Required supporting changes / Optional improvements, and never implement an optional migration silently (`AI-RULES.md` §4, referenced in `00-master-context.md` §7).

---

## 13. Sensitive-Data Handling

- `Admin.password` is `select: false` by default — the hash is never returned in any query result or API response unless a query explicitly opts in with `.select('+password')` for the login-comparison path only.
- `Enquiry` documents (including `phone`, `email`, and message content) are **never exposed via any public endpoint** — only `GET/PATCH/DELETE /api/admin/enquiries[...]` (admin-only) touch this collection (`00-master-context.md` §6.3).
- No secret (JWT signing key, MongoDB Atlas URI, Cloudinary secret, Razorpay secret, EmailJS private credential) is ever stored as a document field — these remain in `backend/.env` only, per `01-setup.md` §5, and are never referenced from within a schema file.
- `Order` documents never store raw client-supplied payment amounts or unverified payment-success flags — only the server-computed `amount` and the signature-verified `paymentStatus` (§7).

---

## 14. Constraints

- Do not invent a collection, field, subfield, index, or enum value not named in `DATABASE.md`/`PRD.md`/`TRD.md`.
- Do not silently resolve C4 or C5 (Section 4, `00-master-context.md`) differently from their stated resolutions if this task touches the Enquiry schema.
- Do not weaken the embedded-snapshot design on Orders, the `select: false` on `Admin.password`, or any unique/required constraint for convenience.
- Do not add validation logic that duplicates or conflicts with `03-backend.md`'s `express-validator` layer — the schema enforces data integrity, not the full UX validation story.
- Do not touch `middleware/auth.middleware.js`, checkout signature-verification logic, `.env` naming, or the Order schema's embedded-snapshot design without the extra caution `00-master-context.md` §7 calls for on these files.
- Inspect `backend/models/` before writing anything — adjust existing models to close gaps rather than replacing them, and avoid a repo-wide model refactor as a side effect of a focused schema task.

---

## 15. Verification

Before considering database work complete, verify (report as **Verified / Not Verified / Unable to Verify**):

1. Exactly 5 collections exist (Projects, Retail, Enquiries, Orders, Admin) — no extra collection.
2. Every field on every model matches `DATABASE.md` §2's type, required/optional status, validation, default, and enum values.
3. Required indexes from §5 exist on the correct collections, including both unique `slug` indexes and unique `email` on Admin.
4. `{ timestamps: true }` is set on every schema unless `DATABASE.md` says otherwise.
5. `Order` line items are embedded snapshots (no `ref`/`populate`); `Order.amount` has no client-writable path; `paymentStatus`/`orderStatus` are separate fields updated via separate code paths only.
6. Slugs on Projects/Retail are server-generated, unique, lowercase, and not accepted from client input.
7. Image fields store only `{url, publicId}` — no binary data anywhere in the schema.
8. `published` (and, for Retail, `availability`) publication-state fields exist and match `DATABASE.md`'s definition, with no extra state values invented.
9. `Admin.password` has `select: false`; no route/query returns it unintentionally.
10. `Enquiry` collection has no route path that exposes it publicly (cross-check against `03-backend.md`/`API.md`).
11. No secret is stored as a document field anywhere in `backend/models/`.
12. C4 (Enquiry email required) and C5 (no `projectType` field) resolutions are respected, or the discrepancy is explicitly flagged if this task touched them.

---

## 16. Completion Criteria

Database work is complete only when:
1. All 5 collections' schemas match `DATABASE.md` §2 exactly — nothing more, nothing less.
2. All required indexes and unique constraints from §5 are in place and verified.
3. No sensitive field (password hash, secrets, raw payment amounts, unverified payment flags) is exposed through the schema or a default query.
4. No migration or destructive change was made beyond what the task explicitly required.
5. All checks in §15 pass or are explicitly reported as Not Verified / Unable to Verify.
6. Any newly discovered gap or conflict (especially touching C4/C5, or anything `DATABASE.md` doesn't cover) was flagged back explicitly rather than silently decided.
