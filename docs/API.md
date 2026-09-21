# API.md — Sabr Studio

Reference docs: `PRD.md`, `TRD.md`, `UI-UX.md`, `DATABASE.md`, `AI-RULES.md`. No codebase exists yet — every endpoint, field, and rule below is derived strictly from those documents (primarily `AI-RULES.md` §9–§14 and `DATABASE.md`). Nothing is invented beyond what they specify; where a detail is genuinely undefined, it is flagged rather than guessed.

---

## 0. Core Stack

- **REST API** over **HTTP/HTTPS** — no GraphQL, tRPC, or WebSockets.
- **Axios** — single centralized instance on the frontend.
- **Express.js** — Routes → Controllers → Services → Models (one-directional layering).
- **MongoDB Atlas** via **Mongoose** — sole datastore, backend-only access.
- **JSON** request/response bodies throughout.
- **JWT in an `httpOnly` cookie** — admin authentication only (no visitor accounts; see §9).
- **Single Node.js process** (Hostinger) serves `/api/*` and the built frontend from the same origin in production (`TRD.md` §20, `AI-RULES.md` §21).

---

## 1. API Architecture

### 1.1 Layers

| Layer | Responsibility |
|---|---|
| Frontend API layer | One shared `axiosClient` (`src/shared/api/axiosClient.js` or equivalent) — no component calls `axios`/`fetch` directly |
| Axios configuration | Base URL, credentials, headers, interceptors (see §6) |
| Backend server | Express app — `helmet`, `cors`, `cookie-parser`, JSON body parsing, route registration |
| Routes | `resource.routes.js` — path + method + middleware chain only, no business logic |
| Middleware | `protect` (auth), `express-validator` chains, `handleValidationErrors`, `express-rate-limit` (scoped routes) |
| Controllers | `resource.controller.js` — parse request, call service, shape response. Never call Mongoose directly |
| Services | `resource.service.js` — business logic, price/amount computation, Razorpay/Cloudinary/EmailJS calls, the only layer that talks to Models |
| Validation | `express-validator` chains on every mutating route — authoritative regardless of frontend validation |
| Authentication | JWT verification in `protect` middleware, reading the `httpOnly` cookie |
| Authorization | `protect` + account-`status` check (`active`/`disabled`); single `admin` role at current scope |
| Database layer | Mongoose models (`resource.model.js`) — schema-level validation as defense in depth (§4) |
| Response handling | Uniform envelope (§5) built in the controller from the service's return value |
| Error handling | Centralized Express error-handling middleware — maps errors to the envelope + correct status code, never leaks internals (§13) |

### 1.2 Request Lifecycle

```
Frontend (component)
  → axiosClient (interceptors attach nothing sensitive; cookie sent automatically via withCredentials)
    → REST Endpoint (Express route match)
      → Global middleware (helmet, cors, cookie-parser, json body parser)
        → Route-specific middleware (express-rate-limit where scoped, protect where admin-only)
          → express-validator chain → handleValidationErrors
            → Controller (parses req, calls service)
              → Service (business logic, calls Model)
                → Database (MongoDB Atlas via Mongoose)
```

### 1.3 Response Lifecycle

```
Database (Mongoose document / result)
  → Service (shapes result, strips select:false fields, computes derived values)
    → Controller (builds { success, data } or { success: false, message, errors })
      → REST Response (JSON body + HTTP status code)
        → Axios (response interceptor normalizes errors)
          → Frontend (component updates UI state: loading → success/error)
```

---

## 2. API Inventory

Base path for every endpoint below: `/api`. Full path = base path + endpoint column.

**Legend** — Auth: 🔓 public · 🔒 admin session required (`protect`). Method column shows correct verb per §3.

### 2.1 Auth

| Method | Endpoint | Purpose | Auth | Request Body | Response | Status Codes |
|---|---|---|---|---|---|---|
| POST | `/auth/login` | Admin login | 🔓 (rate-limited) | `{ email, password }` | `{ success: true, data: { admin: { id, name, email, role } } }` + sets `httpOnly` JWT cookie | 200, 400, 401, 429, 500 |
| GET | `/auth/me` | Session check (bootstraps `AuthContext`) | 🔒 | — | `{ success: true, data: { admin: { id, name, email, role, status } } }` | 200, 401, 500 |
| POST | `/auth/logout` | Invalidate session | 🔒 | — | `{ success: true, data: null }`, clears the cookie | 200, 401, 500 |

### 2.2 Projects

| Method | Endpoint | Purpose | Auth | Request Body | Response | Status Codes |
|---|---|---|---|---|---|---|
| GET | `/projects` | Public listing (published only) | 🔓 | — (query params: see §16) | `{ success: true, data: { items: [...], total } }` | 200, 500 |
| GET | `/projects/:slug` | Public detail | 🔓 | — | `{ success: true, data: { project } }` | 200, 404, 500 |
| GET | `/admin/projects` | Admin listing (all statuses) | 🔒 | — (query params: see §16) | `{ success: true, data: { items: [...], total } }` | 200, 401, 500 |
| GET | `/admin/projects/:id` | Admin detail by ID | 🔒 | — | `{ success: true, data: { project } }` | 200, 401, 404, 500 |
| POST | `/admin/projects` | Create project | 🔒 | See §2.2.1 | `{ success: true, data: { project } }` | 201, 400, 401, 409, 500 |
| PUT | `/admin/projects/:id` | Update project (full or field-scoped, incl. `published` toggle) | 🔒 | Any subset of §2.2.1 fields | `{ success: true, data: { project } }` | 200, 400, 401, 404, 409, 500 |
| DELETE | `/admin/projects/:id` | Delete project (immediate public removal + Cloudinary cleanup) | 🔒 | — | `{ success: true, data: null }` | 200, 401, 404, 500 |

**2.2.1 Project fields** (`DATABASE.md` §2.1): `title` (String, required), `category` (String, conditional — from the admin-managed category list), `location` (String, optional), `year` (Number, optional, 4-digit), `description` (String, required), `images` (Array of `{url, publicId}`, required ≥1 when `published: true` — populated via the upload flow in §17, not sent as raw files on this endpoint), `projectDetails` (Object, optional, explicitly-defined sub-fields), `price` (Number, required only if purchasable, `min: 0`), `published` (Boolean). `slug` is **server-generated** at creation from `title`, never accepted from the client, and is treated as immutable once `published: true`.

### 2.3 Retail

| Method | Endpoint | Purpose | Auth | Request Body | Response | Status Codes |
|---|---|---|---|---|---|---|
| GET | `/retail` | Public listing (published + available) | 🔓 | — (query params: see §16) | `{ success: true, data: { items: [...], total } }` | 200, 500 |
| GET | `/retail/:slug` | Public detail | 🔓 | — | `{ success: true, data: { item } }` | 200, 404, 500 |
| GET | `/admin/retail` | Admin listing (all statuses) | 🔒 | — (query params: see §16) | `{ success: true, data: { items: [...], total } }` | 200, 401, 500 |
| GET | `/admin/retail/:id` | Admin detail by ID | 🔒 | — | `{ success: true, data: { item } }` | 200, 401, 404, 500 |
| POST | `/admin/retail` | Create retail item | 🔒 | See §2.3.1 | `{ success: true, data: { item } }` | 201, 400, 401, 409, 500 |
| PUT | `/admin/retail/:id` | Update retail item (full or field-scoped, incl. `published`/`availability` toggles) | 🔒 | Any subset of §2.3.1 fields | `{ success: true, data: { item } }` | 200, 400, 401, 404, 409, 500 |
| DELETE | `/admin/retail/:id` | Delete retail item (immediate public removal + Cloudinary cleanup; existing orders unaffected) | 🔒 | — | `{ success: true, data: null }` | 200, 401, 404, 500 |

**2.3.1 Retail fields** (`DATABASE.md` §2.2): `title` (String, required), `category` (String, conditional), `description` (String, required), `images` (Array of `{url, publicId}`, required ≥1 when `published: true`), `price` (Number, required, `min: 0`), `availability` (Boolean, independent of `published`), `published` (Boolean).

### 2.4 Image Upload (supports Projects & Retail)

| Method | Endpoint | Purpose | Auth | Request Body | Response | Status Codes |
|---|---|---|---|---|---|---|
| POST | `/admin/uploads` | Upload image(s) to Cloudinary (in-memory via Multer, then forwarded) | 🔒 | `multipart/form-data`, field `images` (1..N files) | `{ success: true, data: { images: [{ url, publicId }] } }` | 201, 400, 401, 413, 500 |

See §17 for validation rules. The exact mount point (standalone endpoint vs. embedded in the project/retail create-update flow) is an implementation detail not fixed by source docs — either is acceptable as long as the resulting `{url, publicId}` pairs are what `POST/PUT /admin/projects` and `/admin/retail` persist to `images`.

### 2.5 Cart / Checkout

| Method | Endpoint | Purpose | Auth | Request Body | Response | Status Codes |
|---|---|---|---|---|---|---|
| POST | `/checkout` | Re-validate cart server-side, compute amount, create Razorpay order + a `pending` `Order` record | 🔓 (rate-limited) | `{ customer: { name, email, phone, ... }, items: [{ itemId, itemType, quantity }] }` | `{ success: true, data: { orderId, razorpayOrderId, amount, currency, razorpayKeyId } }` | 201, 400, 404, 409, 422, 429, 500 |
| POST | `/checkout/verify` | Verify Razorpay signature, finalize payment status | 🔓 (rate-limited) | `{ orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature }` | `{ success: true, data: { order } }` (paymentStatus `paid`) or `{ success: false, message }` (paymentStatus `failed`) | 200, 400, 404, 422, 429, 500 |

Note: cart contents themselves are **not** a backend resource — the cart lives in frontend `CartContext` (`AI-RULES.md` §6) and is sent wholesale to `/checkout` for server-side re-validation. There is no `GET /api/cart` endpoint.

### 2.6 Orders (Admin)

| Method | Endpoint | Purpose | Auth | Request Body | Response | Status Codes |
|---|---|---|---|---|---|---|
| GET | `/admin/orders` | List orders | 🔒 | — (query params: see §16) | `{ success: true, data: { items: [...], total } }` | 200, 401, 500 |
| GET | `/admin/orders/:id` | Order detail | 🔒 | — | `{ success: true, data: { order } }` | 200, 401, 404, 500 |
| PATCH | `/admin/orders/:id/status` | Update `orderStatus` only — **never** `paymentStatus` or `amount` | 🔒 | `{ orderStatus }` (one of `pending`/`confirmed`/`completed`/`cancelled`) | `{ success: true, data: { order } }` | 200, 400, 401, 404, 500 |

### 2.7 Enquiries

| Method | Endpoint | Purpose | Auth | Request Body | Response | Status Codes |
|---|---|---|---|---|---|---|
| POST | `/enquiries` | Submit enquiry | 🔓 (rate-limited) | `{ name, email, phone, message, source }` | `{ success: true, data: { enquiry } }` | 201, 400, 429, 500 |
| GET | `/admin/enquiries` | List enquiries — **never** exposed publicly | 🔒 | — (query params: see §16) | `{ success: true, data: { items: [...], total } }` | 200, 401, 500 |
| GET | `/admin/enquiries/:id` | Enquiry detail | 🔒 | — | `{ success: true, data: { enquiry } }` | 200, 401, 404, 500 |
| PATCH | `/admin/enquiries/:id/status` | Update `status` only | 🔒 | `{ status }` (one of `new`/`in-progress`/`resolved`) | `{ success: true, data: { enquiry } }` | 200, 400, 401, 404, 500 |
| DELETE | `/admin/enquiries/:id` | Hard delete | 🔒 | — | `{ success: true, data: null }` | 200, 401, 404, 500 |

No endpoint beyond the table above exists. Do not add, rename, or restructure an endpoint without updating this document and `AI-RULES.md` §9 together, and searching every frontend consumer first.

---

## 3. HTTP Methods

| Method | Use for | Rules |
|---|---|---|
| **GET** | Reading a resource or a collection. Never mutates state. | Safe and idempotent. Query params only — never a body. Public listing/detail routes are always GET. |
| **POST** | Creating a new resource, or a non-idempotent action that doesn't fit CRUD (`login`, `checkout`, `checkout/verify`). | Not idempotent — the client must not assume retrying a `POST` is safe without an idempotency mechanism (see §22). |
| **PUT** | Full or field-scoped replacement of an existing resource, identified by `:id`. Used here for Project/Retail updates, including single-field toggles (`published`, `availability`). | Idempotent — sending the same body twice produces the same end state. |
| **PATCH** | Used only where this project narrows an update to one specific field with its own business rule (`orderStatus`, enquiry `status`) — kept as a distinct, restricted-body endpoint rather than a general partial-update verb. | Never used as a general "send whatever changed" endpoint — every `PATCH` route here accepts exactly one field. |
| **DELETE** | Hard-deleting a resource by `:id` (Project, Retail, Enquiry). No soft-delete pattern exists (`DATABASE.md` §7/§10). | Idempotent in intent — deleting an already-deleted `:id` returns 404, not a silent success, so the client always knows the true end state. |

**Incorrect usage to prevent**: never use GET for anything that mutates data (no "GET to delete" convenience links); never use POST where PUT/PATCH/DELETE apply; never accept a request body on GET/DELETE; never overload one endpoint to mean different things based on body shape.

---

## 4. Request Structure

### 4.1 URL Structure

- All API routes are mounted under `/api`.
- Resource-oriented, plural nouns: `/api/projects`, `/api/retail`, `/api/admin/orders`.
- Admin-only resources are namespaced under `/api/admin/*` — this namespace itself is a routing convention, **not** a security boundary; every `/api/admin/*` route still runs `protect` middleware independently (`AI-RULES.md` §11, `FR-J5`).

### 4.2 Path Parameters

- `:slug` — used on public detail routes (`/projects/:slug`, `/retail/:slug`). URL-safe, lowercase, server-generated at creation (§2.2.1/§2.3.1).
- `:id` — used on admin detail/update/delete routes. Must be a syntactically valid Mongo `ObjectId`; validated by the `express-validator` chain **before** the query executes — an invalid format returns 400, a well-formed but non-existent ID returns 404 (never an uncaught Mongoose `CastError`, per `DATABASE.md` §4).

### 4.3 Query Parameters

See §16 for the full pagination/filter/search/sort parameter set used on listing endpoints.

### 4.4 Request Body

- JSON only (`Content-Type: application/json`), except the upload endpoint (`multipart/form-data`, §2.4).
- Field names are `camelCase` end-to-end, matching the Mongoose schema exactly (`DATABASE.md` §9) — no snake_case anywhere in the API surface.
- Unexpected fields in the body are rejected or stripped by the `express-validator` chain (whitelist-based), never silently persisted (`DATABASE.md` §5, NoSQL-injection prevention).

### 4.5 Headers

| Header | Direction | Notes |
|---|---|---|
| `Content-Type: application/json` | Request | Every JSON-body request |
| `Content-Type: multipart/form-data` | Request | Upload endpoint only |
| `Cookie` (JWT, `httpOnly`) | Request | Attached automatically by the browser when `axiosClient` uses `withCredentials: true` — never set manually, never an `Authorization: Bearer` header (no token is ever handled in JS) |
| `Content-Type: application/json` | Response | Every response |
| `Set-Cookie` | Response | `POST /auth/login` (sets), `POST /auth/logout` (clears) |

### 4.6 Data Types, Required/Optional, Allowed Values

Defined per-resource in `DATABASE.md` §2 and mirrored in §2.2.1/§2.3.1 above. Universal rules (`DATABASE.md` §3–§4):

- One type per field, identical across frontend form state, `express-validator` chain, and Mongoose schema.
- `phone` is always `String` (never cast to `Number` — leading zeros/`+country` format must survive).
- Money fields (`price`, `amount`, `unitPrice`, `lineTotal`) are `Number`, `min: 0`.
- Booleans (`published`, `availability`) must be actual JSON booleans — no `"true"`/`"false"` string coercion accepted.
- Enum fields (`Enquiry.status`, `Order.paymentStatus`/`orderStatus`, `Admin.role`/`status`, `Project`/`Retail.category`) are rejected if the value isn't in the defined set.
- `createdAt`/`updatedAt`/`lastLoginAt` are never accepted from the client on any endpoint — backend/Mongoose-controlled only.
- **Size limits**: message/description-style free-text fields are length-capped at the validation layer (exact limits are a project-specific constant not fixed by source docs — define once in a shared validation-constants file and reuse across `express-validator` and any frontend char-counter, rather than duplicating a magic number). The Express JSON body parser itself should carry an explicit size limit so an oversized payload is rejected before it reaches any handler.

---

## 5. Response Structure

Single envelope shape for **every** endpoint, success or failure (`DATABASE.md` §9, `AI-RULES.md` §9):

**Success**
```json
{
  "success": true,
  "data": { }
}
```

**Failure**
```json
{
  "success": false,
  "message": "Human-readable, safe-to-display message",
  "errors": [
    { "field": "email", "message": "Must be a valid email address" }
  ]
}
```

`errors` is present only for validation failures (400) with field-level detail; omitted otherwise.

| Situation | `success` | HTTP status | Notes |
|---|---|---|---|
| Successful request | `true` | 200 (read/update), 201 (create) | `data` shaped per endpoint |
| Validation failure | `false` | 400 | `errors` array present |
| Authentication failure | `false` | 401 | Generic message; never reveals whether an account exists |
| Authorization failure | `false` | 403 | Authenticated but not permitted (e.g., disabled admin account) |
| Not found | `false` | 404 | Invalid `:id`/`:slug`, or a valid ID for a deleted/never-existing resource |
| Conflict | `false` | 409 | Duplicate `slug`/`email` (unique-index violation), mapped from the raw Mongo duplicate-key error |
| Server error | `false` | 500 | Generic message only — see §13 |

**Never included in any response, on any endpoint, in any environment**: raw database error text, stack traces, the `MONGODB_URI` or any fragment of it, JWT signing secret, Razorpay/Cloudinary secrets, `Admin.password` (hashed or not), full Enquiry/Order documents on a public route.

---

## 6. Axios Configuration

One instance, one file (`AI-RULES.md` §6, `FE-10`):

```js
// src/shared/api/axiosClient.js
import axios from 'axios';

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL, // relative '/api' in production (same-origin), full dev URL locally
  withCredentials: true,                       // sends/receives the httpOnly JWT cookie
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});
```

- **Base URL**: environment-driven via `VITE_API_BASE_URL`. Production: relative `/api` (same origin, per the single-process deploy in §21). Development: explicit local backend URL (e.g., the local Express port).
- **No token handling in JS**: because auth is an `httpOnly` cookie, there is no `Authorization: Bearer` header to attach and no token to read/store — `localStorage`/`sessionStorage` are never used for auth state (`AI-RULES.md` §11).
- **Request interceptor**: attaches no sensitive data (cookie is automatic); may attach a request-scoped abort/cancel token where a component needs request cancellation (§23).
- **Response interceptor**: normalizes every failure into one shape the UI layer consumes consistently — unwraps the `{ success, message, errors }` envelope on failure, and separately normalizes network/timeout errors (which never reach the envelope, since they never got a response) into the same shape the UI expects, e.g. `{ success: false, message: 'Network error, please try again.' }`.
- **401 handling**: on a 401 from any admin-namespaced call, the response interceptor clears `AuthContext` state and the app redirects to `/admin/login` — it does not attempt a token refresh (no refresh-token mechanism is defined by source docs).
- **Timeout**: a sane fixed timeout (e.g., 15s) so a hung request doesn't leave the UI stuck; timeout errors are normalized the same way as network errors.
- **No duplicate Axios instances**: every feature imports the same `axiosClient` — no per-feature or per-page instance.

---

## 7. Frontend ↔ Backend Communication

### 7.1 Flow

1. Component triggers a request (user action or mount-time fetch).
2. `axiosClient` builds the request against a known, single base URL — no hand-typed URLs scattered across components.
3. Express matches the route; global middleware runs (`helmet`, `cors`, `cookie-parser`, JSON parsing).
4. Route-specific middleware runs: `express-rate-limit` where scoped (§11 of `AI-RULES.md`: login, enquiry, checkout), `protect` where admin-only.
5. `express-validator` chain runs; `handleValidationErrors` short-circuits to a 400 on failure.
6. Controller → Service → Model → MongoDB.
7. Service returns a plain result; Controller wraps it in the envelope and sends the response with the correct status code.
8. Axios resolves/rejects; the response interceptor normalizes failures.
9. Component updates state: `loading → success` (render data) or `loading → error` (render error state), never left stuck (§14).

### 7.2 Preventing Common Failure Modes

| Failure | Prevention |
|---|---|
| Wrong endpoint / typo'd path | Every endpoint called through one `axiosClient`, ideally via small named request functions per feature (`getProjects()`, `createEnquiry()`) rather than inline path strings repeated across components |
| Wrong HTTP method | Method fixed by §3 rules and the inventory in §2 — request functions encode the correct verb once, not per call-site |
| Wrong payload / wrong field name / wrong data type | §4.6/§18 field-name and type contract shared between frontend form state and backend validator; a shape mismatch is treated as a bug to fix at the source, not a conversion to paper over |
| Missing headers | Handled centrally by `axiosClient` defaults — individual call sites never need to set `Content-Type` manually (except the multipart upload call) |
| Incorrect API URL | Single `VITE_API_BASE_URL` per environment — never hardcoded absolute URLs in components |
| CORS errors | Backend `cors` config allows exactly the known frontend origin per environment (§20); in production, frontend and backend are same-origin, so CORS is primarily a development-environment concern |
| Request timeout | Fixed Axios timeout + normalized error message + retry affordance where sensible (§14) |
| Request failure (network/5xx) | Response interceptor normalizes to the same `{ success:false, message }` shape the UI already handles for validation errors |
| Response parsing errors | Envelope shape is uniform (§5) — components never need endpoint-specific parsing logic |
| Duplicate requests | Form submit-lock (`isSubmitting` state) on every mutating form (`FR-I5`); no button remains clickable mid-request |
| Stale data | After a mutating request succeeds, the triggering component re-fetches or optimistically updates only the fields the response confirms changed — never assumes success before the response arrives (§15) |

---

## 8. Backend ↔ Database Communication

- **Connection**: `config/db.js` → `connectDB()` establishes one pooled Mongoose connection at server start; never reconnected per-request. A connection failure logs clearly and the server does not begin accepting traffic in a half-broken state (`DATABASE.md` §1, `AI-RULES.md` §10).
- **Models/schemas**: one Mongoose model per collection (`resource.model.js`), field set exactly as `DATABASE.md` §2 defines, with schema-level validators (`required`, `enum`, `min`, custom conditional-required validators) as defense in depth behind `express-validator`.
- **CRUD**: Controllers never call `Model.create()`/`.find()`/etc. directly — always through the Service layer (`DATABASE.md` §7, `AI-RULES.md` §5).
- **Query handling**: public reads always filtered (`published: true`, `+available` for Retail); admin reads unfiltered by status but still scoped to the resource; listing queries `.select()` only display fields, never `password` or internal payment identifiers.
- **ObjectId handling**: `:id` route params validated as syntactically valid ObjectIds before any query runs (§4.2).
- **Data type consistency**: enforced identically at Mongoose schema, validator, and frontend layers (§4.6, §18).
- **Error handling**: a Mongo/Mongoose error (validation, duplicate key, cast error, connection error) is caught at the service or centralized error-handling middleware, mapped to the correct status/envelope (§13), and logged with full detail server-side only.
- **Transactions**: not required at current scope — no multi-document atomic operation exists in this schema (`DATABASE.md` §8). If a future requirement introduces one (e.g., a stock counter), it must use a Mongo session/transaction rather than sequential unguarded writes — not a default to reach for now.
- **Safe updates**: field-scoped — the order-status endpoint touches `orderStatus` only, never `paymentStatus`/`amount`; publish/availability toggles are independent single-field updates through the general `PUT` endpoint.
- **Safe deletion**: hard delete for Project/Retail/Enquiry, with Project/Retail deletion also triggering a Cloudinary cleanup call using the stored `publicId`. Order records are never deleted through any documented endpoint.
- **Duplicate prevention**: unique indexes on `Project.slug`, `Retail.slug`, `Admin.email` reject duplicates at the database layer even if application logic has a bug; the resulting duplicate-key error is mapped to a clean 409.

---

## 9. Admin Authentication

There is **no visitor authentication or account system** — this is explicitly out of scope (`PRD.md` §2; `AI-RULES.md` §1.1 documents and resolves a conflict with `UI-UX.md`'s navbar "Login" button in favor of the PRD). The flow below applies to admin/studio staff only.

### 9.1 Flow

```
Admin enters credentials
  → Frontend (login form, client-side format check only)
    → Axios POST /api/auth/login
      → express-rate-limit (brute-force throttle on this route)
        → express-validator (email format, password presence)
          → Controller
            → AuthService: find Admin by email (password field explicitly .select('+password')'d only here)
              → bcrypt.compare(submitted, stored hash)
                → MongoDB
              ← match/no-match
            ← on match: sign JWT (admin id + role only — never the password hash)
          ← Controller sets httpOnly/Secure(prod)/SameSite cookie, returns { success:true, data:{ admin } } (no token in body)
        ← on no-match or missing admin: generic 401, same message either way (FR-J2)
      ← Axios resolves/rejects
    ← Frontend updates AuthContext, redirects to /admin dashboard
```

### 9.2 Rules

- **Password hashing**: `bcrypt`, never reversible encryption; plaintext is never stored, logged, or returned in any response.
- **Session mechanism**: signed JWT, stored as an `httpOnly`, `Secure` (production), `SameSite` cookie — never in the JSON response body, never in `localStorage`/`sessionStorage` (`AI-RULES.md` §11).
- **Auth middleware (`protect`)**: reads the cookie via `cookie-parser`, verifies the JWT, loads the Admin, and checks `status === 'active'` — re-run on **every** `/api/admin/*` request, independent of what the frontend already checked (`FR-J5`).
- **Logout**: `POST /api/auth/logout` clears the cookie server-side; there is no server-side session store to invalidate beyond the cookie itself (JWT is stateless), so logout is effectively "stop sending/accepting this cookie."
- **Session bootstrap**: `GET /api/auth/me` is called once on app load to hydrate `AuthContext` from the cookie, without requiring the admin to re-enter credentials on refresh.
- **Expiration**: JWT expiry duration is controlled by `JWT_EXPIRES_IN` (env var, §20) — a specific value is not fixed by source docs; pick a reasonable default (e.g., matching a typical admin work session) and state it explicitly in the implementation, since it doesn't change security posture enough to require sign-off, per `AI-RULES.md` §3's default-value rule.
- **Invalid credentials**: one generic error message, identical whether the email doesn't exist or the password is wrong (`FR-J2`) — never "email not found" vs. "wrong password."
- **Expired/invalid token**: `protect` returns 401; the frontend clears `AuthContext` and redirects to `/admin/login` (no silent refresh).
- **Unauthorized (disabled account)**: a structurally valid, unexpired token for an account with `status: 'disabled'` is rejected — 403, not 401, since authentication succeeded but authorization did not.

---

## 10. Authorization

Authentication (who you are) and authorization (what you're allowed to do) are handled as separate checks, even though this project has only one role:

- **Public endpoints**: every `GET` under `/projects`, `/retail` (published/available only), plus `POST /enquiries` and the two `/checkout*` endpoints. No auth required.
- **Protected (admin) endpoints**: every route under `/admin/*`, without exception. `protect` middleware runs before the controller on every one of them.
- **Admin-only vs. role/permission checks**: current scope has a single `admin` role (`DATABASE.md` §2.5) — there is no per-resource permission matrix beyond "authenticated + active admin." Do not build a multi-role system that isn't requested (`AI-RULES.md` §25).
- **Resource ownership checks**: not applicable at this scope — there is no concept of "my project" vs. "someone else's project"; all admins have equal access to all admin resources.
- **Backend is the sole authority**: `ProtectedRoute` on the frontend is a UX convenience only — it prevents an unauthenticated user from seeing an admin screen flash, but it enforces nothing. A direct API call to any `/api/admin/*` route, bypassing the UI entirely, must be rejected by `protect` exactly as if it came through the UI (`FR-J5`, `AI-RULES.md` §11).
- **Payment authorization boundary**: no admin action, authenticated or not, can set `paymentStatus` to `paid` — that field is write-once by the verification service only (`FR-O3`). This is enforced by never exposing a route or field path that accepts `paymentStatus` from any client, admin or public.

---

## 11. Security

| Area | Implementation |
|---|---|
| HTTPS | Enforced end-to-end in production (Hostinger + Atlas TLS) |
| Password hashing | `bcrypt`, industry-standard cost factor |
| Secure cookies | JWT cookie: `httpOnly`, `Secure` in production, `SameSite` set explicitly (`COOKIE_SECURE`, `COOKIE_SAME_SITE` env vars) |
| Token protection | Never in response body, never in browser storage, never sent as a header the frontend constructs |
| CORS | `cors` package restricted to the known frontend origin per environment (`CORS_ORIGIN`), `credentials: true` to allow the cookie cross-origin in development |
| CSRF considerations | Because auth is cookie-based, CSRF is a real consideration for state-changing routes; `SameSite` cookie attribute is the primary mitigation at this scope — no separate CSRF-token mechanism is defined by source docs, so `SameSite=Strict`/`Lax` plus `admin/*` requiring the cookie is the documented compensating control |
| NoSQL injection prevention | Never pass raw `req.query`/`req.body` into a Mongoose filter — only explicitly whitelisted, validated fields build query filters (`DATABASE.md` §5) |
| Input validation | `express-validator` chain on every mutating endpoint, authoritative regardless of client-side validation |
| Input sanitization | Free-text fields trimmed and length-capped |
| Rate limiting | `express-rate-limit`, scoped to `/auth/login`, `/enquiries`, `/checkout` (`AI-RULES.md` §19) |
| Brute-force protection (admin login) | Same rate limiter on `/auth/login`, plus the generic-error rule (§9.2) so failed attempts don't leak account existence |
| Request size limits | Explicit JSON body-parser size limit; Multer enforces file size/count limits (§17) |
| Secure headers | `helmet`, configured globally before route registration |
| Secret management | All secrets in environment variables only, never in source, never committed (`.env` gitignored, `.env.example` holds names only) |
| Database access restrictions | Atlas IP allowlist scoped to the backend's outbound IP(s); TLS enforced |
| Least-privilege access | Production DB user has `readWrite` on this project's database only — never an Atlas admin/global user |
| Sensitive-data filtering | `Admin.password` is `select: false` by default; Enquiry/Order data never returned by any public endpoint |
| Safe error responses | Generic message to the client in production; full detail logged server-side only (§13) |
| Authorization checks | `protect` re-verified on every `/admin/*` request, independent of frontend state |
| File/upload validation | MIME type, size, and count validated server-side before forwarding to Cloudinary (§17) |

**Never placed in frontend code or committed source, under any circumstance**: `MONGODB_URI`, `JWT_SECRET`, `RAZORPAY_KEY_SECRET`, `CLOUDINARY_API_SECRET`, `Admin.password` (hashed or not), any EmailJS private/server-side credential. See §20 for the full env-var split.

---

## 12. Validation

Three-layer discipline (`DATABASE.md` §4), backend layer is authoritative:

| Layer | Mechanism | Authority |
|---|---|---|
| Frontend | Shared `validators.js` utils | UX feedback only |
| Backend | `express-validator` chains + `handleValidationErrors` middleware | **Authoritative** — runs before any service/DB call |
| Database | Mongoose schema validators | Defense in depth |

Covered per field type, applied wherever relevant across the inventory in §2:

- **Required fields**: rejected with field-level detail if missing.
- **Data types**: string/number/boolean/date checked and never silently coerced (a non-numeric string sent for a `Number` field is a 400, not an auto-convert).
- **String length**: max length enforced on `description`/`message`-style fields.
- **Number limits**: `min: 0` on every money field; `year` constrained to a 4-digit range.
- **Enum values**: `Enquiry.status`, `Order.paymentStatus`/`orderStatus`, `Admin.role`/`status`, `Project`/`Retail.category` — rejected if outside the defined set.
- **Email format**: standard pattern on `Enquiry.email` and `Admin.email`.
- **IDs**: `:id` params validated as syntactically valid ObjectIds before query execution.
- **Dates**: never accepted from the client (`createdAt`/`updatedAt`/`lastLoginAt` are backend-only).
- **Arrays**: `checkout` items array validated for shape (`itemId`, `itemType`, `quantity`) and non-empty (empty cart rejected server-side regardless of client state, `FR-F5`).
- **Objects**: `projectDetails`, `customer` validated against their explicitly-defined sub-fields — never accepted as an open free-form blob.
- **File metadata**: never trusted from the client — see §17.
- **Unexpected fields**: stripped/rejected by the whitelist-based validator chain, not silently persisted.
- **Malformed requests**: invalid JSON body is rejected at the body-parser level with a 400 before reaching any route logic.

---

## 13. Error Handling

Centralized Express error-handling middleware maps every thrown/passed error to the envelope in §5 and the correct status code:

| Status | Trigger | Frontend behavior |
|---|---|---|
| Network error (no response) | Connectivity lost, DNS failure, CORS block | Normalized message: "Network error, please try again." Retry affordance shown. |
| Timeout | Axios timeout exceeded | Normalized message: "Request timed out." Retry affordance shown. |
| 400 | `express-validator` failure, malformed JSON, invalid ObjectId format | Inline field errors from `errors[]` shown on the form; non-form 400s show a generic banner |
| 401 | Missing/invalid/expired JWT cookie on a protected route | Redirect to `/admin/login`; `AuthContext` cleared |
| 403 | Valid session but disabled account / disallowed action | "You don't have permission to do this" — no redirect loop |
| 404 | Invalid `:id`/`:slug`, or a well-formed ID that doesn't exist | Public: not-found page/state (`FR-C4`, `FR-E3`). Admin: "not found" message, no crash |
| 409 | Duplicate `slug`/`email` (unique-index violation) | Inline "already exists" message on the offending field |
| 422 | Not used in this API — semantically-invalid-but-well-formed input is folded into 400 alongside structural validation, to keep the client's error-handling branch count small; documented here explicitly so it isn't assumed to exist elsewhere in the codebase |
| 429 | Rate limit exceeded on `login`/`enquiries`/`checkout` | "Too many attempts, please try again shortly" |
| 500 | Unhandled server/database error | Generic "Something went wrong" — full detail logged server-side only, never surfaced to the client |
| Database failure (connection lost mid-request) | Atlas connectivity issue | Mapped to 500 with the generic message; server logs the real cause |
| External-service failure (Razorpay/Cloudinary/EmailJS) | Third-party API error | Mapped to a safe, generic response — the specific provider error text/code is never forwarded to the client verbatim; EmailJS failure specifically must never surface as an enquiry-submission failure (`FR-I4`, §13.1) |

**13.1 EmailJS is a special case**: enquiry storage and email delivery are decoupled. MongoDB write happens first and is what determines the response's success/failure; the EmailJS call is wrapped in its own try/catch afterward, logged on failure, and never changes the response already being sent for a successfully stored enquiry.

**General rule**: no response, in any environment, ever includes a stack trace, a raw Mongo/Mongoose error message, a database connection string fragment, or any secret. Full error context is logged server-side only.

---

## 14. Loading & Failure States

Every data-dependent frontend view implements all of (`FR-P3`, `AI-RULES.md` §6):

| State | Meaning | UI |
|---|---|---|
| Idle | No request in flight yet | Nothing fetched, or previous data still shown |
| Loading | Request in flight | Skeleton/spinner — never a blank flash |
| Success | Response received, `success: true` | Data rendered |
| Empty | Response received, `success: true`, but `data.items` (or equivalent) is empty | Explicit empty state — no fabricated content, no broken cards |
| Error | Response received (or network/timeout) with `success: false` | Non-crashing error state; retry affordance where the failure is plausibly transient (network/timeout/500) — not where it's a genuine 404/validation issue |
| Retry | User-triggered re-attempt | Re-enters Loading; does not stack duplicate in-flight requests |

**No view is left permanently spinning on failure** — every loading state has a corresponding error/timeout path that resolves it.

---

## 15. CRUD Operations

For each feature, the frontend never assumes success before the backend confirms it — optimistic UI updates, where used at all, are reconciled against the actual response, not assumed.

### 15.1 Projects / Retail (parallel structure)

| Step | Detail |
|---|---|
| Create | `POST /admin/projects` or `/admin/retail` → validated → service generates `slug` server-side → Mongoose insert → 201 with the created document |
| Read | `GET /projects`/`GET /retail` (public, filtered) or `GET /admin/projects`/`GET /admin/retail` (admin, unfiltered) for listings; `GET /projects/:slug`/`GET /retail/:slug` (public) or `GET /admin/.../:id` (admin) for detail |
| Update | `PUT /admin/projects/:id` or `/admin/retail/:id` → validated → field-scoped Mongoose update (including the `published`/`availability` toggle case) → 200 with the updated document |
| Delete | `DELETE /admin/.../:id` → Mongoose delete + Cloudinary cleanup of referenced images → 200, `data: null`. Public listings/detail reflect the removal immediately; any existing Order referencing the item is untouched (embedded snapshot) |

### 15.2 Enquiries

| Step | Detail |
|---|---|
| Create | `POST /enquiries` (public) → validated → Mongoose insert → EmailJS notification attempted (decoupled, §13.1) → 201 |
| Read | `GET /admin/enquiries` (list) / `GET /admin/enquiries/:id` (detail) — admin only, never public |
| Update | `PATCH /admin/enquiries/:id/status` → status-only update → 200 |
| Delete | `DELETE /admin/enquiries/:id` → hard delete, no dependents → 200, `data: null` |

### 15.3 Orders (read + status update only — no create/delete endpoint)

| Step | Detail |
|---|---|
| Create | Not a direct admin action — an Order is created as a side effect of `POST /checkout` (pending) and finalized by `POST /checkout/verify` |
| Read | `GET /admin/orders` (list) / `GET /admin/orders/:id` (detail) — admin only |
| Update | `PATCH /admin/orders/:id/status` — `orderStatus` only, never `paymentStatus`/`amount`/`items` |
| Delete | No delete endpoint exists for Orders — financial/audit records are not documented as deletable |

---

## 16. Pagination, Filtering & Search

Applied to every listing endpoint in §2 (Projects, Retail, Orders, Enquiries — admin and public alike):

| Param | Applies to | Notes |
|---|---|---|
| `page` / `skip` | All listings | `.skip()`-backed; admin listings paginate once volume warrants it, public listings back the "Load More"/"View All" UI pattern with the same mechanism (`DATABASE.md` §7) |
| `limit` | All listings | A server-enforced **maximum** exists regardless of what the client requests, to prevent an unbounded query — the exact ceiling is an implementation constant, not fixed by source docs, but it must exist |
| `category` | `/projects`, `/retail`, admin equivalents | Validated against the shared category enum list |
| `published` | Admin listings only | Public listings hardcode `published: true` (and `availability: true` for Retail) server-side — never accept this as a client-controlled filter on a public route |
| `availability` | `/retail`, `/admin/retail` | Retail-specific |
| `status` | `/admin/enquiries` | One of `new`/`in-progress`/`resolved` |
| `paymentStatus` / `orderStatus` | `/admin/orders` | One of each enum's defined values |
| `sort` | Admin listings | Default `createdAt: -1`; Enquiries and Orders sort this way by default per their compound indexes (`DATABASE.md` §6/§7) |
| `search` | **Not implemented** | No search feature or text index is defined by `PRD.md`/`TRD.md`/`DATABASE.md` — do not add a `search` param or endpoint without a new documented requirement |

**Response shape** for every listing: `{ success: true, data: { items: [...], total, page, limit } }` (field names illustrative of intent; keep consistent with §5's envelope and §18's naming rule). `total` is the full matching count (for pagination UI), independent of `limit`.

**Preventing unrestricted queries**: every filter param is validated against a whitelist before being used to build the Mongoose query (never spread `req.query` into a filter object directly, per §11's NoSQL-injection rule); every listing query path is covered by an index (`DATABASE.md` §6).

---

## 17. File & Media APIs

Applies to the upload endpoint (§2.4) and, indirectly, to how `images` fields are set on Projects/Retail.

- **Upload endpoint**: `POST /admin/uploads` (or embedded in the project/retail create/update controller — see §2.4 note), admin-only.
- **File type validation**: Multer restricts to image MIME types only (server-side check, never trusting the client-declared `Content-Type` or file extension alone).
- **File size limits**: enforced by Multer at the multipart-parsing layer before the file reaches any handler — a specific byte ceiling is a project constant not fixed by source docs; define once and enforce consistently.
- **File count limits**: Multer enforces a maximum number of files per request.
- **Authentication/authorization**: `protect` middleware — no upload endpoint is reachable without an active admin session.
- **Storage location**: Cloudinary is the sole binary store; Multer holds the file **in-memory only** — never written to local disk, since the hosting filesystem isn't durable at this scope (`DATABASE.md` §11, `AI-RULES.md` §14).
- **Database metadata**: MongoDB stores only `{ url, publicId }` per image — never binary data.
- **URL/reference handling**: the Cloudinary `secure_url` is stored as `url`; `publicId` is stored specifically so deletion needs no extra lookup.
- **Delete behavior**: deleting a Project/Retail document (or removing an individual image from one during an update) triggers a Cloudinary `destroy` call keyed on the stored `publicId`.
- **Invalid-file handling**: a file failing type/size/count validation is rejected with a 400 before any Cloudinary call is made — never a partial upload.
- **Never trust client-provided file metadata** (claimed MIME type, claimed size) — always verify server-side.

---

## 18. API & Database Data Consistency

`Frontend type = API request type = Backend validation type = Database type`, enforced as a standing rule rather than a one-time check (`DATABASE.md` §3/§9, `AI-RULES.md` §10):

- **Field naming**: `camelCase` identically across the API envelope, `express-validator` chain, and Mongoose schema — no per-layer renaming (no `payment_status` anywhere).
- **Numeric values**: `price`, `amount`, `unitPrice`, `lineTotal`, `year` are `Number` end-to-end; no string-formatted currency stored or transmitted (currency symbol formatting is a frontend display concern only).
- **Boolean values**: `published`, `availability` are real JSON booleans at every layer.
- **Dates**: ISO 8601 / native `Date` (UTC) in transit and storage; timezone conversion for display is frontend-only.
- **IDs**: MongoDB `ObjectId`, serialized as a string in JSON responses; validated as such on every `:id` path param.
- **Arrays**: `images`, `checkout.items`, `Order.items` — fixed sub-shape per field, validated element-by-element, never an open array of arbitrary shape.
- **Objects**: `projectDetails`, `customer`, `payment` — explicitly-defined sub-fields only.
- **Optional fields**: absent vs. `null` is used consistently per field (per `DATABASE.md` §2's Nullable column) — a field documented as nullable may be `null`; a field not documented as such is either present with a valid value or omitted, never silently `null` as a stand-in for "not required."
- **No layer silently changes a value's type** — a mismatch anywhere in the chain is a bug to fix at its source, not a conversion to add downstream (this is the same rule stated in `DATABASE.md` §3, restated here as it applies to the API boundary specifically).

---

## 19. API Versioning

**Not used.** No version segment (`/api/v1/...`) exists in the base path — `PRD.md`/`TRD.md` do not require API versioning at this project's scope, and introducing one would add complexity with no current justification (`TRD.md` TECH-14 discipline extends to this decision). If a genuine breaking-change need arises later, that is a new requirement to document and sign off on — not something to pre-build for speculatively.

---

## 20. CORS

| Environment | Allowed origin | Notes |
|---|---|---|
| Local development | The local Vite dev server origin (e.g., `http://localhost:5173`) | Frontend and backend run as separate processes in dev, so CORS is actually exercised here |
| Production | The single production domain, same-origin | Frontend is served by the same Express process as `/api/*` (§21), so cross-origin requests aren't expected in normal operation — `CORS_ORIGIN` is still set explicitly rather than left wide open, as a defense-in-depth measure |

- **Allowed methods**: `GET, POST, PUT, PATCH, DELETE, OPTIONS`.
- **Allowed headers**: `Content-Type` (and any header Axios sets by default) — no custom `Authorization` header is needed since auth is cookie-based.
- **Credentials**: `credentials: true` on the `cors` config, matching `withCredentials: true` on `axiosClient` — required for the `httpOnly` cookie to be sent/received cross-origin in development.
- **Preflight requests**: handled automatically by the `cors` package for non-simple requests (e.g., `PUT`/`PATCH`/`DELETE`, or requests carrying credentials).
- **Never unrestricted (`*`) in production** — `CORS_ORIGIN` is always an explicit, environment-specific value, never a wildcard, especially since credentials are involved (wildcard origin + credentials is disallowed by the CORS spec itself and misconfigured by browsers regardless).

---

## 21. Environment Configuration

### 21.1 Frontend (`VITE_`-prefixed — bundled and client-visible; only genuinely public values)

| Variable | Purpose |
|---|---|
| `VITE_API_BASE_URL` | `/api` in production (relative, same-origin); full local URL in development |
| `VITE_RAZORPAY_KEY_ID` | Public Razorpay key for the client-side checkout widget (never the secret) |
| EmailJS public identifier(s) | Whichever ID(s) EmailJS's own docs classify as public-facing |

### 21.2 Backend (server-only, never bundled, never committed)

| Variable | Purpose |
|---|---|
| `MONGODB_URI` | Atlas connection string — distinct per environment (dev vs. production, never shared) |
| `JWT_SECRET` | JWT signing key |
| `JWT_EXPIRES_IN` | Token lifetime |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | Razorpay server-side credentials — the secret never leaves the backend |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | Cloudinary SDK credentials |
| EmailJS server-side credential(s) | Only if the chosen EmailJS integration requires any server-side secret |
| `CORS_ORIGIN` | Allowed frontend origin, per environment |
| `COOKIE_SECURE` / `COOKIE_SAME_SITE` | JWT cookie flags, environment-tunable |
| `PORT` | Express listen port |
| `NODE_ENV` | `development` / `production` — gates the static-serving/SPA-fallback block (§21 of `AI-RULES.md`) and error-response verbosity (§13) |

### 21.3 Per-Environment Notes

- **Local development**: backend and frontend run as separate processes (Vite dev server + `nodemon`); `MONGODB_URI` points at a development database/cluster, never production.
- **Preview/staging** (if used): its own database and its own `CORS_ORIGIN`, never pointed at the production Atlas cluster.
- **Production**: single Node process serves both `/api/*` and the built frontend (§21 below); `MONGODB_URI` points at the production Atlas database with a least-privilege DB user; `COOKIE_SECURE=true`.
- **Rule stated plainly**: anything `VITE_`-prefixed is readable in the browser, full stop — a secret never gets that prefix and never lives in a frontend `.env` file. `.env` files are gitignored; only `.env.example` (names, no values) is committed.

---

## 22. Reliability

- **Idempotency**: `PUT`/`DELETE` are naturally idempotent by design (§3). `POST /checkout` is **not** idempotent by default — a duplicate submission (e.g., a double-click before the submit-lock engages, or a network retry) must not create two Orders or two Razorpay orders for the same cart. The frontend's `isSubmitting` lock is the primary guard; the backend should treat a checkout request as tied to the specific cart/session state it validated, and `POST /checkout/verify` is naturally idempotent in effect since a given `razorpayPaymentId` only verifies successfully once against its matching Order.
- **Never blindly retry a mutating request that could create duplicate data** — automatic retry (if implemented at all in the Axios layer) is restricted to safe, idempotent requests (`GET`) or to network/timeout failures on `PUT`/`DELETE`, never to `POST /checkout` or `POST /enquiries` without an idempotency safeguard.
- **Duplicate submission prevention**: `isSubmitting` state lock on every mutating form (enquiry, checkout, all admin CRUD) — not just a disabled button style (`FR-I5`).
- **Race conditions**: checkout re-validates price/availability server-side at order-creation time and snapshots the result immediately into the `pending` Order — a subsequent product price change never affects an already-created Order (`DATABASE.md` §8).
- **Unhandled promises**: every service/controller async function is wrapped so a rejected promise reaches the centralized error handler, never crashes the process or hangs the response.
- **Unexpected responses**: the frontend's response interceptor and per-request error handling assume a request *can* fail in a shape it doesn't expect (e.g., a proxy error page instead of JSON) and fall back to a generic normalized error rather than throwing an unhandled parse exception.
- **Database connection failures**: fail loudly at startup (§8); mid-request connection loss maps to a 500 with the generic message, logged server-side with full detail.
- **Timeout/retry**: fixed Axios timeout (§6); retry, where offered to the user at all, is a manual "Retry" affordance (§14) rather than silent automatic retry of a mutating request.

---

## 23. Performance

- **Efficient queries**: every listing/filter query path is covered by an index (`DATABASE.md` §6) before it ships; no `$or` across unindexed fields on high-traffic public routes.
- **Pagination**: enforced server-side maximum `limit` on every listing endpoint (§16) — no endpoint returns an entire collection unbounded.
- **Response size**: listing endpoints `.select()` only display-relevant fields (title, image, price, category); full documents are fetched only on detail views, never over-fetched on a listing (`PERF-05`).
- **Required indexes**: per `DATABASE.md` §6 — unique on `Project.slug`, `Retail.slug`, `Admin.email`; compound on `{published, category}` (Projects), `{published, availability}` (Retail), `{status, createdAt}` (Enquiries), `{paymentStatus, orderStatus}` (Orders); single/compound on `razorpayOrderId`/`razorpayPaymentId` (Orders, for fast lookup during verification).
- **Avoiding unnecessary requests**: no prefetch-everything pattern — detail data is fetched only when a user actually navigates to a detail view.
- **Axios request reuse**: single shared instance (§6) — no per-component client instantiation.
- **Request cancellation**: used where a component can unmount or a query can change mid-flight (e.g., a filtered admin listing) so a stale response doesn't overwrite newer UI state — implemented via `AbortController`/Axios cancellation, not left as a dangling promise.
- **Caching**: not introduced by default — no caching layer (Redis, HTTP cache headers beyond defaults) is defined by source docs; add one only against a real, measured need, not preemptively (`AI-RULES.md` §2 explicitly excludes Redis at this scope).
- **Avoiding duplicate API calls**: components fetch once per mount/dependency-change, not on every render; list re-fetches happen only after a mutation that's known to affect that list.

---

## 24. API Documentation Standards

This document follows one consistent format per endpoint (method, path, purpose, auth, request, response, status codes — §2). Below are worked examples for the highest-risk/most representative endpoints, using safe placeholder values only.

### 24.1 `POST /api/enquiries`

**Request**
```json
{
  "name": "Asha Verma",
  "email": "asha@example.com",
  "phone": "9876543210",
  "message": "Interested in a residential consultation.",
  "source": "/contact"
}
```

**Response — 201**
```json
{
  "success": true,
  "data": {
    "enquiry": {
      "id": "665f1a2b3c4d5e6f7a8b9c0d",
      "name": "Asha Verma",
      "status": "new",
      "createdAt": "2026-01-15T10:22:00.000Z"
    }
  }
}
```

**Response — 400 (validation)**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    { "field": "phone", "message": "Phone number is required" }
  ]
}
```

### 24.2 `POST /api/checkout`

**Request**
```json
{
  "customer": { "name": "Rohan Mehta", "email": "rohan@example.com", "phone": "9123456780" },
  "items": [
    { "itemId": "665f1a2b3c4d5e6f7a8b9c10", "itemType": "retail", "quantity": 2 }
  ]
}
```

**Response — 201**
```json
{
  "success": true,
  "data": {
    "orderId": "665f1b2c3d4e5f6a7b8c9d10",
    "razorpayOrderId": "order_ExamplePlaceholder123",
    "amount": 499800,
    "currency": "INR",
    "razorpayKeyId": "rzp_test_ExamplePlaceholder"
  }
}
```

**Response — 409 (item unavailable at checkout time)**
```json
{
  "success": false,
  "message": "One or more items in your cart are no longer available."
}
```

### 24.3 `POST /api/auth/login`

**Request**
```json
{ "email": "admin@sabrstudio.example", "password": "••••••••" }
```

**Response — 401 (invalid credentials, generic)**
```json
{ "success": false, "message": "Invalid email or password." }
```

---

## 25. Testing Requirements

Every endpoint in §2 must be exercised for:

- **Valid requests** — happy-path success for each method/endpoint pairing.
- **Invalid requests** — malformed JSON, wrong data types, out-of-range enum values.
- **Missing required fields** — every field marked required in §2.2.1/§2.3.1 and `DATABASE.md` §2, individually omitted.
- **Wrong data types** — e.g., `price` as a string, `published` as `"true"` instead of boolean.
- **Unauthorized access** — every `/admin/*` route called with no cookie at all → 401.
- **Forbidden access** — every `/admin/*` route called with a valid token for a `disabled` account → 403.
- **Missing resources** — valid-format but non-existent `:id`/`:slug` → 404.
- **Duplicate data** — creating a Project/Retail with a `slug` collision, or an Admin with a duplicate `email` → 409.
- **Database failures** — simulated connection loss → 500, generic message, no leak.
- **Network failures** — simulated on the frontend side → normalized error state, no crash.
- **Authentication expiration** — an expired JWT cookie → 401, frontend redirect.
- **CRUD operations** — full create/read/update/delete cycle per resource, including verifying a delete actually removes the item from subsequent reads.
- **Admin operations** — every admin-only mutation verified to be rejected without a valid session, then verified to succeed with one.
- **Edge cases**: empty cart at checkout (`FR-F5`), price/availability changing between cart and checkout, a cancelled Razorpay payment, deleting a Project/Retail item that has existing Orders referencing it (Order must remain intact and correct).

**Verify the complete chain** for at least one representative flow per resource: `Frontend → Backend → Database → Backend → Frontend` — e.g., submit an enquiry through the actual form, confirm it's queryable via `GET /admin/enquiries`, confirm the EmailJS side-effect fired (or failed gracefully without affecting the stored result).

---

## 26. Production Verification

Before any production deployment, confirm:

- [ ] `VITE_API_BASE_URL` resolves correctly to the production `/api` path (relative, same-origin)
- [ ] `CORS_ORIGIN` is set to the exact production domain, not a wildcard
- [ ] HTTPS is enforced end-to-end (frontend, `/api/*`, Atlas connection)
- [ ] Admin login succeeds with real hashed credentials and sets a `Secure`, `httpOnly` cookie
- [ ] Every `/admin/*` route rejects requests without a valid session, including via direct API calls
- [ ] `MONGODB_URI` points at the production Atlas database, with a least-privilege, production-only DB user
- [ ] All required environment variables (§21) are set in the Hostinger environment panel — none missing, none using development values
- [ ] Request/response formats match §5's envelope on a live spot-check of at least one endpoint per resource
- [ ] Error responses in production show only generic messages — no stack traces or internals, verified by deliberately triggering a 500 in a safe way
- [ ] Every documented admin endpoint (§2.6/§2.7 plus Projects/Retail admin routes) is reachable and correctly protected
- [ ] Every documented public endpoint is reachable and returns only public-safe data
- [ ] A full CRUD cycle (create → read → update → delete) succeeds against production for at least Projects or Retail
- [ ] A full checkout cycle succeeds against Razorpay in live mode (not test keys) before go-live, and a failed/cancelled payment is confirmed to never produce a successful Order
- [ ] Production domain serves both the frontend and `/api/*` from the same origin, with the SPA fallback correctly resolving a deep route on direct navigation/refresh

---

## 27. API Checklist

**Routes**
- [ ] Every endpoint in §2 exists at the exact method + path documented, no more, no fewer
- [ ] No endpoint accepts an HTTP method other than the one documented for it
- [ ] Route files contain no business logic — only path, middleware, and controller wiring

**Axios**
- [ ] Exactly one `axiosClient` instance exists and is imported everywhere an API call is made
- [ ] `withCredentials: true` set globally, not per-call
- [ ] Base URL is environment-driven, never hardcoded per component
- [ ] Response interceptor normalizes both envelope failures and network/timeout failures into one shape

**Requests**
- [ ] Every mutating request sends `camelCase` field names matching the Mongoose schema exactly
- [ ] No request sends a field the backend doesn't expect (or the backend safely ignores/rejects it)
- [ ] File uploads use `multipart/form-data`; every other request uses `application/json`

**Responses**
- [ ] Every response, success or failure, uses the `{ success, data }` / `{ success, message, errors? }` envelope
- [ ] No response ever includes a password hash, JWT secret, DB credential, Razorpay/Cloudinary secret, or raw internal error

**Validation**
- [ ] Every mutating endpoint runs an `express-validator` chain before touching the service/database layer
- [ ] Every field's type/required/enum rule matches §4.6/§12 exactly across frontend, validator, and schema

**Authentication**
- [ ] JWT is issued only on successful login, stored only as an `httpOnly` cookie
- [ ] `GET /api/auth/me` correctly bootstraps `AuthContext` from the cookie
- [ ] Logout clears the cookie and the frontend's auth state together

**Authorization**
- [ ] Every `/api/admin/*` route runs `protect` independently of any frontend route guard
- [ ] Disabled admin accounts are rejected with 403 even with a structurally valid token
- [ ] No route or field path anywhere allows a client to set `paymentStatus` to `paid`

**Security**
- [ ] `helmet`, `cors` (origin-restricted), `express-rate-limit` (login/enquiry/checkout) are registered before route handling
- [ ] No secret exists in frontend source, a `VITE_`-prefixed variable, or committed source control
- [ ] NoSQL query filters are built only from whitelisted, validated fields — never raw `req.query`/`req.body`

**Database communication**
- [ ] One pooled Mongoose connection established at startup, never per-request
- [ ] Every query path used by a shipped endpoint is covered by an index in `DATABASE.md` §6
- [ ] Order line items are embedded snapshots, never live `ref`/populate

**CORS**
- [ ] Allowed origin is explicit per environment, never `*`, especially with `credentials: true`
- [ ] Preflight (`OPTIONS`) requests succeed for every mutating endpoint from the allowed origin

**Errors**
- [ ] Every status code in §13's table is reachable and returns the documented envelope shape
- [ ] A deliberately triggered 500 in production shows only the generic message, with full detail in server logs

**Production configuration**
- [ ] Every env var in §21 is present and environment-appropriate (no dev values in production, no production secrets in dev)
- [ ] `NODE_ENV=production` correctly gates the static-serving/SPA-fallback block

**End-to-end data flow**
- [ ] At least one full `Frontend → Backend → Database → Backend → Frontend` cycle is verified per resource (Projects, Retail, Enquiries, Orders, Auth, Checkout) before release

---

## 28. Endpoint-Level Rate Limit & Cache Policy Matrix

Restates and consolidates rate limiting (`TRD.md` §25) and caching (`TRD.md` §26) at the endpoint level, in the format: Endpoint → Authentication → Authorization → Rate limit → Cache policy → Validation → Error behavior. Request/response shapes and standard status codes remain exactly as defined in §2; this section adds only the rate-limit/cache dimension.

| Endpoint group | Authentication | Authorization | Rate limit | Cache policy | Validation | Error behavior |
|---|---|---|---|---|---|---|
| `GET /projects`, `GET /projects/:slug`, `GET /retail`, `GET /retail/:slug` | 🔓 none | Public (published-only filter, §7 `DATABASE.md`) | General baseline limit (`RATE-01`, `TRD.md` §25) | `Cache-Control: public, max-age=<TBD>` (`CACHE-03`) | Query-param validation only (pagination/filter, §16) | 404 on invalid/unpublished slug; 500 generic on failure |
| `POST /auth/login` | 🔓 none | N/A | Strict (`RATE-02`) | `no-store` (`CACHE-04`) | `express-validator` (email/password presence) | 401 generic on invalid credentials; 429 on limit exceeded |
| `GET /auth/me`, `POST /auth/logout` | 🔒 session | Authenticated admin, active status | General baseline limit | `no-store` | N/A (no body) | 401 if session invalid/expired |
| `GET/POST/PUT/DELETE /admin/projects*`, `/admin/retail*` | 🔒 session | Authenticated admin, active status (`protect`) | Admin-scoped limit, stricter than public baseline (`RATE-03`) | `no-store` (`CACHE-04`) | Full `express-validator` chain per §2.2.1/§2.3.1 | 401/403 on auth/authorization failure; 400 on validation failure; 404 on invalid id |
| `POST /checkout`, `POST /checkout/verify` | 🔓 none (payment-sensitive) | N/A — server re-validates cart/price itself | Payment-specific limit (`RATE-04`) | `no-store` (`CACHE-04`) — never cached | Full re-validation of items/availability/price server-side (§7) | 422/409 on invalid cart state; 429 on limit exceeded; failed/cancelled payment never produces a successful order (SEC-14) |
| `POST /enquiries` | 🔓 none | N/A | Form-abuse limit (`RATE-05`) | `no-store` | Full `express-validator` chain | 400 on invalid fields; 429 on limit exceeded |
| `GET/PUT/DELETE /admin/enquiries*`, `/admin/orders*` | 🔒 session | Authenticated admin, active status | Admin-scoped limit (`RATE-03`) | `no-store` | Field-scoped validation per update (e.g., `orderStatus` only) | 401/403 on auth failure; 400 on invalid status value |
| `POST /admin/uploads` | 🔒 session | Authenticated admin, active status | Admin-scoped limit (`RATE-03`); additionally bounded by Multer's file size/count limits (§17) | `no-store` | File type/size/count validation (§17) | 413 on oversized upload; 401/403 on auth failure |

**Request size limits**: the global JSON body-parser size limit (already referenced at §12 "Request size limits") applies to every non-multipart endpoint above; `/admin/uploads` is governed instead by Multer's own file size/count limits. Exact byte limits are `TBD`.

---

## 29. Webhook Verification & Admin Endpoint Protection (Additions)

- **Webhooks — current state**: This system's payment flow uses the client-driven `POST /checkout/verify` pattern (§2.5), verified server-side via Razorpay's signature-verification method (SEC-14) — no separate Razorpay webhook endpoint is currently defined by source docs. If a Razorpay webhook endpoint is added later (e.g., for asynchronous payment-status updates), it must independently verify the webhook signature using Razorpay's webhook secret (distinct from the checkout key secret) before trusting any payload, must be idempotent (a redelivered webhook event must not create a duplicate order-state change), and must never be the only path that can mark a payment verified if `POST /checkout/verify` already covers it — this is a forward-looking requirement, not a current implementation.
- **Admin endpoint protection (restated)**: Every `/api/admin/*` route independently runs `protect` (JWT + account-status check) regardless of the rate limit/cache policy above — the rate-limit and cache additions in §28 are additive to, and never a substitute for, the authentication/authorization already required by §10–§11.
- **HTTP 5xx behavior**: An unhandled server error on any endpoint returns the generic 500 envelope (§13) with no internal detail; this holds even for the newly-documented payment/admin endpoints in §28 — no endpoint gets a special exception to the error-handling contract already defined in §13.
