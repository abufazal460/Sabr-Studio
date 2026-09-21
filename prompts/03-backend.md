# 03-backend.md — Sabr Studio Backend Implementation

Companion to `00-master-context.md` (full source hierarchy, conflict-resolution table) and `01-setup.md` (repo shape, env/secret boundary, approved dependency lists, external-service prerequisites — already satisfied before this file applies). This is the complete, standalone implementation prompt for the **backend only**. Nothing below invents an endpoint, field, model, library, or pattern not already specified in `00-master-context.md`.

---

## 1. Role & Objective

You are implementing the Node.js + Express backend of Sabr Studio: the REST API serving the public site (Projects, Retail, Enquiries, Checkout) and the admin panel (auth, full CRUD on Projects/Retail, Enquiry and Order management), plus the production static-file/SPA-serving role described in Master Context §6.11. Before writing any code: inspect the existing repo state, confirm what `01-setup.md`'s scaffold already produced, check whether the file/route/model already exists, and re-read Master Context §4 (conflicts) if the task touches a flagged area.

---

## 2. Source of Truth & Backend-Relevant Conflicts

Hierarchy: `PRD.md` → `TRD.md` → `ARCHITECTURE.md` → `DATABASE.md` → `API.md` → `SECURITY.md` → `DEPLOYMENT.md` → `CODING-RULES.md`/`AI-RULES.md` → existing repo → current task (Master Context §3). Full detail: `00-master-context.md` §3–§4.

**Conflicts that affect backend code specifically — do not silently resolve these differently:**

| # | Conflict | Binding resolution for backend code |
|---|---|---|
| C1 | `/shop` vs `/retail` route naming | API mounts under `/api/retail`, `/api/retail/:slug`, `/api/admin/retail*`. Never `/api/shop*`. |
| C4 | Enquiry `email` required (PRD) vs optional (UI-UX) | `express-validator` treats `email` as **required** on `POST /api/enquiries` — this is authoritative regardless of what any frontend copy shows. |
| C5 | Enquiry "Project Type" field (UI-UX) not in PRD/`DATABASE.md`'s Enquiry schema | Do not add a `projectType` field to the Enquiry model, validator, or controller. If a request body includes it, it is ignored/stripped, not persisted — flag the discrepancy in your task report rather than silently adding schema support. |
| C6 | Admin panel visual spec out of scope in UI-UX | Not a backend concern — but confirms admin **routes/CRUD behavior** are fully specified (PRD §5/§7, TRD §6/§8) even though the admin UI's look is defined elsewhere. Do not withhold or simplify an admin endpoint because its UI spec is thin. |
| C7 | "Wishlist" terminology | No backend impact — Cart/checkout is the only purchase path; do not build a separate save-for-later resource or endpoint. |

---

## 3. Technology Stack (backend — exact, no substitutions)

Per `01-setup.md` §7.3 / Master Context §6.1: `express`, `mongoose`, `bcrypt`, `jsonwebtoken`, `cookie-parser`, `express-validator`, `multer`, `cloudinary`, `razorpay`, `cors`, `helmet`, `express-rate-limit`, `dotenv`, `nodemon` (dev only). `compression` is the one pre-approved exception if the hosting platform doesn't already handle response compression.

Never add a package outside this list without a named PRD/TRD requirement nothing above satisfies — no ORM beyond Mongoose, no second validation library, no session-store package (JWT is stateless, cookie-carried), no GraphQL, no Redis.

---

## 4. Backend Project Structure & File Placement

Strict one-directional layering (Master Context §6.2): **Routes → Controllers → Services → Models.** Routes carry no business logic. Controllers never run a Mongoose query directly. `services/` owns business rules and all external-service orchestration (Cloudinary, Razorpay, EmailJS).

```text
backend/
├── server.js                       # entry point: connects DB, starts the single Express process
├── app.js                          # middleware order, route mounting, SPA catch-all (last)
├── config/
│   ├── db.js                       # Mongoose → MongoDB Atlas connection
│   └── cloudinary.js               # Cloudinary SDK config from env
├── routes/
│   ├── auth.routes.js              # /api/auth/*
│   ├── projects.routes.js          # public /api/projects*
│   ├── retail.routes.js            # public /api/retail*
│   ├── enquiries.routes.js         # public POST /api/enquiries
│   ├── checkout.routes.js          # /api/checkout, /api/checkout/verify
│   └── admin/
│       ├── projects.routes.js      # /api/admin/projects*
│       ├── retail.routes.js        # /api/admin/retail*
│       ├── enquiries.routes.js     # /api/admin/enquiries*
│       └── orders.routes.js        # /api/admin/orders*
├── controllers/                    # one file per resource; public + admin methods together
│   ├── auth.controller.js
│   ├── projects.controller.js
│   ├── retail.controller.js
│   ├── enquiries.controller.js
│   ├── checkout.controller.js
│   └── orders.controller.js
├── services/
│   ├── auth.service.js
│   ├── projects.service.js
│   ├── retail.service.js
│   ├── enquiries.service.js
│   ├── checkout.service.js         # ⚠ extra-caution file — price + signature verification
│   ├── orders.service.js
│   ├── cloudinary.service.js       # upload/destroy orchestration
│   └── email.service.js            # EmailJS orchestration, independent of the Mongo write
├── models/
│   ├── project.model.js
│   ├── retail.model.js
│   ├── enquiry.model.js
│   ├── order.model.js              # ⚠ extra-caution file — embedded-snapshot design
│   └── admin.model.js
├── middleware/
│   ├── auth.middleware.js          # ⚠ extra-caution file — `protect`
│   ├── error.middleware.js         # centralized error handler
│   ├── rateLimit.middleware.js
│   └── upload.middleware.js        # multer, memory storage
├── validators/
│   ├── auth.validators.js
│   ├── projects.validators.js
│   ├── retail.validators.js
│   ├── enquiries.validators.js
│   ├── checkout.validators.js
│   └── orders.validators.js
├── public/                         # frontend/dist copied here at build time — .gitignored, never hand-edited
├── package.json
└── .env.example
```

Naming (exact, Master Context §6.2): `resource.controller.js` / `.routes.js` / `.model.js` / `.service.js` / `.middleware.js` / `.validators.js`. If `FOLDER-STRUCTURES.md` exists in the repo with a different definitive tree, that file governs — inspect it before creating any new top-level structure; the tree above is the layering-consistent minimum, not a substitute for it.

---

## 5. Express App Setup (`app.js` / `server.js`)

- `server.js`: load env, connect to MongoDB Atlas (`config/db.js`), then start the app — fail fast and log clearly if the DB connection fails at boot.
- `app.js` middleware order (fixed, security-relevant — do not reorder casually): `helmet()` → `cors()` (configured allow-list, not `*`, per §9) → body parser (JSON) → `cookie-parser()` → `compression()` if used → route mounting (`/api/auth`, `/api/projects`, `/api/retail`, `/api/enquiries`, `/api/checkout`, `/api/admin/*`) → static file serving of `public/` → SPA catch-all (any non-`/api/*` GET → `index.html`, enabling deep-link/refresh support) → centralized error-handling middleware **last**.
- The SPA catch-all must never precede the `/api/*` routes or static middleware, or API calls will be swallowed by it.
- Single Node process serves both the API and the built frontend (Master Context §6.11) — never scaffold this as two processes/ports in production.

---

## 6. Routing & API Contract (`00-master-context.md` §6.3 — exact, do not add/rename/restructure)

| Resource | Endpoints |
|---|---|
| Auth | `POST /api/auth/login` (public, rate-limited) · `GET /api/auth/me` · `POST /api/auth/logout` |
| Projects | `GET /api/projects` (public, published-only) · `GET /api/projects/:slug` (public) · `GET/POST/PUT/DELETE /api/admin/projects[...]` (admin) |
| Retail | `GET /api/retail` (public, published+available) · `GET /api/retail/:slug` (public) · `GET/POST/PUT/DELETE /api/admin/retail[...]` (admin) |
| Cart/Checkout | `POST /api/checkout` (public, rate-limited; re-validates + computes amount server-side; rejects empty cart) · `POST /api/checkout/verify` (public, rate-limited; verifies Razorpay signature) |
| Orders | `GET /api/admin/orders[...]` · `PATCH /api/admin/orders/:id/status` (order status only — **never** payment status) |
| Enquiries | `POST /api/enquiries` (public, rate-limited) · `GET/PATCH/DELETE /api/admin/enquiries[...]` (admin-only, never public) |

No registration/signup endpoint exists — a single admin account is provisioned outside the API (out of scope for this file); do not invent `POST /api/auth/register`.

Uniform response envelope: `{ success: true, data }` / `{ success: false, message, errors? }`. Status codes: 400 validation, 401 unauthenticated, 403 unauthorized, 404 not found, 409 conflict, 500 server error. Every controller returns this shape — no ad hoc response formats.

---

## 7. Models (5 Mongoose collections — Master Context §6.4)

Projects, Retail, Enquiries, Orders, Admin. Non-negotiables:

- Slugs (Projects/Retail): **server-generated**, unique, lowercase, never trusted from client input, effectively immutable once published.
- `Order` line items are **embedded snapshots** — never a live `ref`/populate. This protects historical orders from later product edits/deletion (ADR-05). Never "simplify" this into a reference.
- `Order.amount` is computed **server-side only**, inside `checkout.service.js` — never accepted from client input at any layer.
- `Order.paymentStatus` and `Order.orderStatus` are separate enum fields set through different paths only: payment status via verified Razorpay signature; order status via the admin `PATCH` endpoint. Never conflate or let one endpoint set both.
- `Enquiry.phone` is always `String`, never `Number`. `Enquiry` is never exposed via any public `GET` endpoint.
- `Admin.password` is `select: false` by default; the hash is never returned in any response, ever.
- Required indexes: unique `slug` (Projects/Retail); `{published, category}` / `{published, availability}`; `{status, createdAt: -1}` (Enquiries); `{paymentStatus, orderStatus}` + Razorpay ID lookups (Orders); unique `email` (Admin).

---

## 8. Middleware & Validation

- `auth.middleware.js` (`protect`): verifies the JWT from the `httpOnly` cookie, attaches the admin identity to `req`, and rejects with 401 on missing/invalid/expired tokens. Applied to every `/api/admin/*` route — no exceptions, no route that "trusts" a prior check.
- `error.middleware.js`: single centralized handler at the end of the middleware chain; normalizes every thrown/passed error into the uniform envelope (§6) and correct status code; never leaks a raw stack trace or internal error message to the client in production.
- `rateLimit.middleware.js`: applied to `POST /api/auth/login`, `POST /api/enquiries`, `POST /api/checkout`, `POST /api/checkout/verify` (Master Context §6.3 marks these rate-limited). Exact numeric thresholds are `TBD` in the source docs — define them once as named constants when this task requires it; do not treat an invented number as a specification, and do not leave the endpoints unlimited in the meantime.
- `upload.middleware.js`: Multer configured for **in-memory storage only** — never written to local disk in production — before forwarding to Cloudinary (§11).
- Validation: every resource has its own `validators.js` using `express-validator`. Client-side validation (frontend) is UX-only; this layer is authoritative and independently enforced regardless of what the client already checked. A route never skips its validator chain because "the frontend already validates this."

---

## 9. Authentication (Master Context §6.5)

- Admin-only auth — no visitor/customer accounts exist anywhere in this system (see Master Context C2, a frontend-facing conflict with no backend equivalent to build).
- Passwords hashed with `bcrypt`. JWT signed with admin ID + role only — no extra PII in the payload.
- JWT is set as an `httpOnly`, `Secure` (production), `SameSite` cookie — **never** returned in the JSON response body, **never** expected in a client-sent `Authorization` header.
- Invalid credentials on login return one generic error message — never reveal whether the email exists.
- No token-refresh mechanism exists — do not build one; a 401 from any `/api/admin/*` call means re-authenticate via `/api/auth/login`.

---

## 10. Authorization

- Every `/api/admin/*` route is independently protected by `auth.middleware.js` regardless of frontend route-guarding state — a direct API call with no valid cookie is rejected at the backend exactly the same as a UI-blocked attempt.
- Single `admin` role is sufficient at current scope (Master Context §6.5) — do not add a role/permission system that isn't requested.
- `PATCH /api/admin/orders/:id/status` updates `orderStatus` only — the handler must not accept or mutate `paymentStatus` under any request body shape.

---

## 11. CORS & Security

- `cors()` configured with an explicit allow-list (the deployed frontend origin(s)), not a wildcard — credentials (`withCredentials`) require a specific origin, not `*`.
- `helmet()` applied globally for standard security headers; CSP source list specifics are `TBD` in source docs — define once as a named constant set when needed, do not skip CSP entirely while leaving it unresolved indefinitely.
- No secret (JWT signing key, DB credentials, Razorpay secret, Cloudinary secret, EmailJS private credential) is ever exposed to the frontend or logged in plaintext.
- `middleware/auth.middleware.js`, `services/checkout.service.js`, any `.env` naming, and the `Order` schema's embedded-snapshot design are extra-caution files (Master Context §7) — inspect existing logic carefully before modifying any of them, and never "simplify" them as a side effect of an unrelated task.
- Payments are the highest-risk area (Master Context §6.6): never trust a client-supplied amount; the backend re-validates item existence/availability/price and computes the payable amount server-side on every checkout. A payment is successful **only** after backend verification of Razorpay's signed response — a client-side success callback is never sufficient on its own. Failed/cancelled payments never produce a successful order. Admins cannot manually mark a payment successful — only `orderStatus` is admin-editable. Empty carts are rejected server-side regardless of client-sent state.

---

## 12. Uploads / Cloudinary (Master Context §6.8)

- Multer validates file type/size/count **in memory** (never written to local disk in production) before the buffer is forwarded to Cloudinary via `cloudinary.service.js`.
- MongoDB stores only `{ url, publicId }` per image — never binary image data in any collection.
- Deleting a Project/Retail item flags its associated Cloudinary asset(s) for `destroy` via the stored `publicId` — do not leave orphaned Cloudinary assets on delete, and do not delete the Mongo document before the Cloudinary cleanup step is at least attempted/queued.

---

## 13. Enquiries (Master Context §6.7, with C4/C5 applied)

- `POST /api/enquiries`: persist to MongoDB **first**. The EmailJS notification is a subsequent, independently try/caught step — an EmailJS failure must never cause a successfully-stored enquiry to be reported as a failure to the caller (FR-I4).
- `email` is required server-side (C4) regardless of any looser frontend copy.
- No `projectType` field is accepted into the persisted document (C5) — if present in the request body, it is not written to the Enquiry model; flag the discrepancy rather than silently supporting it.
- `Enquiry` is never exposed via a public `GET` — only `GET/PATCH/DELETE /api/admin/enquiries[...]`, behind `auth.middleware.js`.

---

## 14. CRUD (Projects, Retail, Enquiries, Orders — admin)

- Projects/Retail admin CRUD (`POST/PUT/DELETE /api/admin/projects*` and `/api/admin/retail*`): server generates/re-generates the slug on create (and controls whether it can change on update, per `DATABASE.md`'s immutability rule) — never accept a client-supplied slug as authoritative.
- A new field on any of these resources touches its model, validator, controller/service, and any admin-facing consumer together — never add a field to only one layer (Master Context §9.3 "required supporting changes" rule).
- Orders: `GET /api/admin/orders[...]` supports admin listing/detail; `PATCH /api/admin/orders/:id/status` is the only mutation path, `orderStatus`-only (§10, §11).
- Enquiries admin CRUD: `GET` (list/detail), `PATCH` (status update, per whatever enum `DATABASE.md` defines — do not invent enum values), `DELETE`. No `POST` for enquiries under `/api/admin` — enquiry creation is public-only (§6).
- Do not add pagination, filtering, or sorting parameters beyond what `API.md` documents for a given list endpoint — if a task needs one not yet specified, flag it rather than inventing a query-param contract.

---

## 15. Error Handling

- Every controller path resolves through `error.middleware.js` — no controller sends a raw `try/catch`-swallowed 200 on failure, and no controller hand-rolls its own error response shape.
- Mongoose validation errors, cast errors (bad ObjectId), duplicate-key errors (e.g., unique `slug`/`email` conflicts → 409), and thrown application errors are all normalized to the envelope in §6 with the correct status code.
- Unhandled promise rejections and uncaught exceptions are caught at the process level and logged — the process should not crash silently or expose a stack trace to the client.

---

## 16. Production Requirements

- Single Hostinger Node.js process serves both `/api/*` and the built frontend from `backend/public/` — never split into two hosted services (Master Context §6.11).
- Build/deploy order (already scaffolded per `01-setup.md` §8): install + `vite build` frontend → copy `dist/` into `backend/public/` → install backend production dependencies → `node server.js`. Full checklist: `DEPLOYMENT.md` §11.
- `NODE_ENV=production` gates `Secure` cookies, suppresses verbose error output, and enables any environment-specific hardening named in `SECURITY.md`/`DEPLOYMENT.md`.
- No dev-only dependency (`nodemon`) runs in the production process.
- `backend/public/` remains generated-only, `.gitignore`d, never hand-edited (already established in `01-setup.md`).

---

## 17. Constraints (restated, concrete)

- Do not invent an endpoint, field, model, enum value, query parameter, or environment variable not named in `00-master-context.md`/`01-setup.md` or the documents they index — if a task needs one, flag it rather than deciding silently.
- Do not bypass `express-validator` under any circumstance, regardless of what the frontend already validated.
- Do not allow an unauthenticated or unauthorized admin operation via any path, including a direct API call bypassing the UI.
- Do not trust a client-supplied payment amount or a client-side payment success callback as authoritative.
- Do not expose a secret to the frontend or logs — never give a secret a `VITE_` prefix, never log a JWT or password hash.
- Do not perform a repo-wide refactor, rename, or dependency bump as a side effect of a focused task — split into Requested / Required supporting changes / Optional improvements, and never implement the "optional" bucket silently.
- Do not silently resolve C1, C4, C5, C6, or C7 differently from §2's stated resolution — surface it explicitly if a task touches one.
- Treat `middleware/auth.middleware.js`, `services/checkout.service.js`, any `.env` naming, and the `Order` schema's embedded-snapshot design with extra caution before any change (§11).

---

## 18. Verification

Before considering any backend task complete, verify (report as **Verified / Not Verified / Unable to Verify**):

1. Every affected endpoint returns the uniform envelope (§6) with the correct status code on success, validation failure, auth failure, and not-found.
2. `express-validator` runs on every endpoint that accepts input, independent of frontend validation — spot-check by sending an invalid payload directly.
3. Every `/api/admin/*` route rejects a request with no/invalid JWT cookie, tested directly (not just via the UI).
4. No JWT, password hash, or other secret appears in any response body or log output.
5. `POST /api/checkout` rejects a client-supplied amount and an empty cart; `POST /api/checkout/verify` only marks an order successful after signature verification.
6. `PATCH /api/admin/orders/:id/status` cannot alter `paymentStatus` under any payload shape.
7. `POST /api/enquiries` persists to MongoDB even when the EmailJS call is forced to fail, and does not persist or return a `projectType` field.
8. Multer accepts only validated file types/sizes into memory; Cloudinary stores the asset; MongoDB holds only `{url, publicId}`; deleting the parent document triggers the Cloudinary `destroy` flag.
9. `package.json` contains no dependency outside §3's approved list without a cited justification.
10. Layering is intact: no controller contains a direct Mongoose query, no route file contains business logic.
11. Any conflict from §2 touched by this change was flagged, not silently resolved.

A backend task is complete only when it satisfies the specific requirement it was scoped against, using only the approved stack and the layering/naming conventions above, with validation, authentication, authorization, and payment-verification rules independently enforced and unaffected by unrelated changes, and with nothing invented beyond what `00-master-context.md`/`01-setup.md` (and the documents they index) already specify.
