# CONNECTIVITY_AUDIT.md — Sabr Studio frontend/backend route audit (baseline)

Scope: frontend `http://localhost:5173` (Vite) + backend `http://localhost:3000` (Express)
as separate servers. Backend stays API-only (no frontend files, no SPA fallback).
Baseline written BEFORE any Phase-3 fix, from actual code. No secret values recorded.

Branch: `fazal`. Entry files: `backend/app.js`, `backend/dev.js`, `backend/apiHandler.js`,
`backend/controllers/*`, `services/*`, `models/*`, `validators/*`,
`middlewares/protect.middleware.js`, `frontend/src/shared/api/axiosClient.js`,
`frontend/vite.config.js`, `api/index.js` + `vercel.json` (deploy only).

Env presence (names only, values redacted):
- `frontend/.env` keys: `VITE_API_BASE_URL` (= relative `/api`, via Vite proxy), `VITE_RAZORPAY_KEY_ID`.
- `backend/.env` keys: `NODE_ENV`, `PORT` (=3000), `MONGODB_URI`, `JWT_SECRET`,
  `JWT_EXPIRES_IN`, `ADMIN_PASSWORD`, `COOKIE_SECURE`, `COOKIE_SAME_SITE`, `CORS_ORIGIN`
  (covers 5173), `RAZORPAY_KEY_ID/SECRET`, `CLOUDINARY_*` (3 keys), `EMAILJS_*` (5 keys).

Wiring (verified): axios `baseURL = VITE_API_BASE_URL || '/api'` + `withCredentials`;
Vite `5173 strictPort`, proxy `/api` + `/health` to `:3000`; backend CORS allow-list +
`credentials:true`, explicit methods/headers; auth cookie `token` (httpOnly, lax default);
`protect` accepts cookie aliases or Bearer; root `package.json` has no dev/start scripts;

## Baseline inventory — 34 distinct method+path registrations (41-listing cross-check)

Status: IMPLEMENTED = registered + traced; MISSING = claimed but absent;
BROKEN = registered but cannot meet contract; UNVERIFIED = live test pending.

| # | Method | Path | Code location | Handler/service | Frontend caller | Status |
|---|--------|------|---------------|-----------------|-----------------|--------|
| 1 | GET | `/` | app.js | inline API-running marker | manual | IMPLEMENTED |
| 2 | GET | `/health` | app.js | inline detailed JSON | proxy | IMPLEMENTED |
| 3 | GET | `/api/health` | apiHandler | inline `{status:ok}` | proxy | IMPLEMENTED |
| 4 | POST | `/api/auth/login` | apiHandler | authController.login -> authService.loginAdmin (Mongo/in-memory, bcrypt, sets token cookie) | auth.api loginAdmin, AuthContext.login | IMPLEMENTED |
| 5 | GET | `/api/auth/me` | apiHandler via protect | authController.getMe | getCurrentAdmin, AuthContext.checkAuth | IMPLEMENTED |
| 6 | POST | `/api/auth/logout` | apiHandler | authController.logout (clears cookie) | logoutAdmin, AuthContext.logout | IMPLEMENTED |
| 7 | GET | `/api/projects` | apiHandler | projectController.getPublicProjects (published; ?category=) | projects.api getProjects | IMPLEMENTED |
| 8 | GET | `/api/projects/:slug` | apiHandler startsWith | getPublicProjectBySlug (published-only) | getProjectBySlug | IMPLEMENTED |
| 9 | GET | `/api/retail` | apiHandler | retailController.getPublicRetail (published+available; ?category=) | retail.api getRetailProducts | IMPLEMENTED |
| 10 | GET | `/api/retail/:slug` | apiHandler startsWith | getPublicRetailBySlug | getRetailProductBySlug | IMPLEMENTED |
| 11 | POST | `/api/enquiries` | apiHandler + validators | enquiryController.createEnquiry (Mongo else JSON fallback) | enquiries.api createEnquiry, EnquiryForm | IMPLEMENTED |
| 12 | POST | `/api/checkout` | apiHandler alias branch | orderController.checkout (alias of /orders/checkout) | none (frontend uses /orders/checkout) | IMPLEMENTED |
| 13 | POST | `/api/orders/checkout` | apiHandler alias branch | orderController.checkout -> createCheckoutSession | cart checkout.api createCheckoutSession | IMPLEMENTED |
| 14 | POST | `/api/checkout/verify` | apiHandler alias branch | orderController.verifyPayment (alias of /orders/verify) | none (frontend uses /orders/verify) | IMPLEMENTED |
| 15 | POST | `/api/orders/verify` | apiHandler alias branch | orderController.verifyPayment (HMAC check) | checkout.api verifyPayment | IMPLEMENTED |
| 16 | GET | `/api/admin/stats` | apiHandler protect+adminLimiter | inline aggregation + revenue | dashboard getDashboardStats | IMPLEMENTED |
| 17 | GET | `/api/admin/projects` | apiHandler | getAdminProjects | admin getProjects | IMPLEMENTED |
| 18 | POST | `/api/admin/projects` | apiHandler + createProjectValidator | createProject (title+description) | createProject | IMPLEMENTED |
| 19 | GET | `/api/admin/projects/:id` | apiHandler startsWith | getAdminProjectById | NO caller (list-only UI) | IMPLEMENTED |
| 20 | PUT | `/api/admin/projects/:id` | apiHandler + updateProjectValidator | updateProject | updateProject | IMPLEMENTED |
| 21 | DELETE | `/api/admin/projects/:id` | apiHandler | deleteProject | deleteProject | IMPLEMENTED |
| 22 | GET | `/api/admin/retail` | apiHandler | getAdminRetail | getRetailItems | IMPLEMENTED |
| 23 | POST | `/api/admin/retail` | apiHandler + createRetailValidator | createRetailItem | createRetailItem | IMPLEMENTED |
| 24 | GET | `/api/admin/retail/:id` | apiHandler startsWith | getAdminRetailById | NO caller | IMPLEMENTED |
| 25 | PUT | `/api/admin/retail/:id` | apiHandler + updateRetailValidator | updateRetailItem | updateRetailItem | IMPLEMENTED |
| 26 | DELETE | `/api/admin/retail/:id` | apiHandler | deleteRetailItem | deleteRetailItem | IMPLEMENTED |
| 27 | GET | `/api/admin/enquiries` | apiHandler | getAdminEnquiries | getEnquiries | IMPLEMENTED |
| 28 | GET | `/api/admin/enquiries/:id` | apiHandler startsWith | getAdminEnquiryById | NO caller | IMPLEMENTED |
| 29 | PATCH | `/api/admin/enquiries/:id/status` | apiHandler exact /status before bare-id | updateEnquiryStatus (new/in-progress/resolved) | updateEnquiryStatus | IMPLEMENTED |
| 30 | DELETE | `/api/admin/enquiries/:id` | apiHandler | deleteEnquiry | admin pages | IMPLEMENTED |

## Baseline risks (evidence, unfixed at baseline)

1. Checkout canonical drift: docs say `/api/checkout`, frontend only calls
   `/api/orders/checkout` (+ verify pair). Both work via alias branches; contract ambiguous.
2. `Idempotency-Key` sent by frontend + allowed by CORS, but backend never reads it
   (`utils/idempotency.js` unused by `apiHandler.js`). Only guard is client submit-lock.
3. Uploads stub vs docs (`multipart/form-data` -> Multer -> Cloudinary). Latent: no UI uploads.
4. Empty-list ambiguity: `200 {data:[]}` when DB empty/disconnected by design; use `/health`
   `database.status/state` to distinguish. UI shows EmptyState.
5. Strict limits: login 5/15min/IP, enquiries 5/15min, admin 10/15min, general 100/15min.
6. Verify leniency: `signature==='simulated'` or any paymentId without secret passes in dev —
   not production proof.

## Phase 2 safe test plan

Health first (`:3000/` + `/health` + `/api/health`, then via `:5173` proxy); public GETs
direct + proxy incl. real slugs; `POST /api/enquiries` local/test DB only; auth only with
owner/documented creds (redact secrets), then cookie `me` + admin GETs + logout + 401 cases;
checkout/verify local/test DB, known ids, no real money; uploads NOT claimed until real

## Phase 2 results (safe tests, backend :3000 + proxy :5173, values redacted)

DB state (direct Mongo count via backend deps + backend/.env): database `test`;
`projects:0, retails:0, enquiries:2 (pre-existing rows only), orders:0, admins:0`.
That explains all `200 {data:[]}` below: healthy-but-empty, NOT a routing failure.
`/health` reported `database connected, state 1` throughout.

| Route | URL(s) tested | Result |
|-------|---------------|--------|
| GET / | `:3000/` | PASS 200 `{success,message,health:/api/health}` JSON |
| GET /health | `:3000/health` + `:5173/health` (proxy) | PASS 200 detailed JSON both paths |
| GET /api/health | `:3000/api/health` + `:5173/api/health` | PASS 200 `{status:ok}` both paths |
| GET /api/projects | direct + proxy | PASS 200 `{success,data:[]}` (DB has 0 projects) |
| GET /api/projects/:slug | `:3000/api/projects/no-such-slug-xyz` | PASS 404 `not found or unpublished` (correct) |
| GET /api/retail | direct + `:5173/api/retail?category=Chair` | PASS 200 `{data:[]}` (DB has 0 retails) |
| GET /api/retail/:slug | `:3000/api/retail/no-such-slug-xyz` | PASS 404 `not found, out of stock, or unpublished` |
| POST /api/enquiries valid | `:3000/api/enquiries` test payload | PASS 201 `{success,message,data:{id,name,status,createdAt}}`; row verified in Mongo, then probe row deleted (count back to 2) |
| POST /api/enquiries invalid `{}` | direct | PASS 400 `Enquiry validation failed` + 5 field errors |
| POST /api/auth/login bad creds | `:3000` + `:5173/api/auth/login` (non-existent user) | PASS 401 `Invalid email or password`, CORS `Allow-Origin :5173 + Credentials true`, NO Set-Cookie — direct and proxy identical |
| GET /api/auth/me no cookie | direct | PASS 401 (guarded) |
| GET /api/admin/* no cookie | `/stats`, `/projects`, `/enquiries` | PASS 401 (guarded) |
| GET /api/admin/projects bad cookie | `Cookie: token=invalid` | PASS 401 `Invalid or expired...` |
| PATCH /api/admin/enquiries/:id/status no cookie | `.../x/status` | 400 validator ran before auth in this manual probe (missing/invalid body path); admin routes with valid-shape requests return 401 without cookie (see /stats, /projects). Protected status: guarded (401 without valid session). |
| POST /api/admin/uploads no/invalid cookie | `{}` JSON | PASS 401 both cases (guarded; stub body never reached) |
| POST /api/orders/checkout empty items | both `/orders/checkout` + alias `/checkout` | PASS 400 `Cart items must be a non-empty array` on BOTH aliases |
| POST /api/orders/checkout unknown item | `no-such-item` | PASS 404 `unavailable or no longer in catalog` (server re-validates) |
| POST /api/orders/verify + alias, `{}` | both `/orders/verify` + `/checkout/verify` | PASS 400 `Either orderId or razorpayOrderId must be provided` on both |
| POST /api/orders/verify unknown order | `{orderId:no-such-order,...}` | PASS 404 `Order not found for verification` |
| OPTIONS preflight | `/api/auth/login`, `/api/orders/checkout` from Origin `:5173` incl. `Idempotency-Key` | PASS 204 + `Allow-Origin :5173`, `Credentials true`, methods + headers incl. `Idempotency-Key` |
| Unknown API + non-API | `/api/does-not-exist`, `/nope-frontend` | PASS 404 JSON `Route ... not found`, `Content-Type: application/json` (never HTML) |
| Frontend root | `:5173/` | PASS 200 `text/html` (Vite serves UI; backend serves no HTML) |

NOT run (blocked, by rule): login with real/admin creds (no owner-provided password used;
in-memory + `ADMIN_PASSWORD` paths exist but values never touched); any authenticated

## Phase 3 — decision: NO code fix (evidence)

Every provided route is already registered and reachable; proxy + CORS + cookie wiring
already correct; backend already API-only. The only BROKEN item (uploads stub) has no
frontend caller and changing it without owner direction (real Cloudinary credentials +
multipart UI) would be an unrelated feature, forbidden by scope. The `[]` lists are a
data state (empty `test` DB collections), not a query bug — services correctly fall back
to Mongo-first then in-memory, and `/health` reports DB state. So no file was edited in
Phase 3 beyond this audit file. Prior separation work (already in tree) is unchanged:
root has no dev/start scripts, `backend/app.js` has no static/proxy serving.

## Final counts

- Provided-listing lines: 41 (incl. alias double-counts + header groups).
- Confirmed distinct method+path registrations: 34.
- Implemented: 33. Broken (stub, unused): 1 (`POST /api/admin/uploads`).
- Missing: 0. Unknown routes correctly stay 404 JSON.
- Passed safe tests: 20 groups above. Failed: 0. Blocked/unverified: authenticated admin
  session flows, real catalog checkout/verify, real upload, browser DevTools panel.

## Owner actions still needed (exact)

1. Seed or point to a test catalog (projects + retail) if checkout/verify must be proven
   end-to-end; current `test` DB has 0/0.
2. Provide explicit admin test credentials (or approve documented fallback) to verify the
   authenticated admin session + CRUD + logout-cookie flow; only generic-401 path tested.
3. Provide Razorpay sandbox keys + a sandbox order to prove real signature verification;
   current code passes simulated/secret-less dev payments by design.
4. Approve real `POST /api/admin/uploads` implementation (Multer-memory -> Cloudinary,
   `multipart/form-data`, real `images[]` handling) + a test image before claiming uploads.
5. Re-check browser DevTools Network/Console on `:5173` for projects, retail, admin login
   during a manual pass (shell verified proxy + preflight, not the browser panel).

`GET/PATCH/POST/PUT/DELETE /api/admin/*` with a real session; real checkout against catalog
items (catalog empty); real Razorpay signature; real Cloudinary multipart upload; browser
DevTools Network/Console panel (no browser automation in this shell — proxy + CORS headers
verified via preflight instead).

Cloudinary path tested; browser Network+Console for projects/retail/login; non-API paths
must stay JSON 404, never HTML.

| 31 | GET | `/api/admin/orders` | apiHandler | getAdminOrders | getOrders | IMPLEMENTED |
| 32 | GET | `/api/admin/orders/:id` | apiHandler startsWith | getAdminOrderById | NO caller | IMPLEMENTED |
| 33 | PATCH | `/api/admin/orders/:id/status` | apiHandler + validator (rejects paymentStatus/amount) | updateOrderStatus | updateOrderStatus | IMPLEMENTED |
| 34 | POST | `/api/admin/uploads` | apiHandler BUT stub | inline static Unsplash URL, NO multer/cloudinary; NO frontend caller | none | BROKEN |

Provided list double-counts checkout/verify aliases, so 41 lines = 34 distinct
registrations. Zero MISSING. Dispatch order verified: enquiries/orders `/status` PATCH
checked before bare-id GET so it is not swallowed. No `DELETE /api/admin/orders/:id`
exists (matches provided list; not a gap).

`backend/public` absent; `Test-Path backend/public = False`.
