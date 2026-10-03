# CONNECTIVITY_AUDIT.md — Sabr Studio frontend ↔ backend route & connectivity audit

Scope: frontend `http://localhost:5173` (Vite) + backend `http://localhost:3000`
(Express), kept as **separate applications**. Backend is API-only (serves no frontend
files, no SPA fallback). Frontend reaches the backend through the Vite dev proxy
(`/api`, `/health` → `:3000`). No secret values are recorded anywhere in this file.

Branch: `fazal`. Entry points inspected: `backend/app.js`, `backend/dev.js`,
`backend/apiHandler.js` (the hand-written dispatcher — the authoritative router),
`backend/controllers/*`, `backend/services/*`, `backend/models/*`, `backend/validators/*`,
`backend/middlewares/protect.middleware.js`, `backend/config/db.js`,
`backend/utils/seedDevelopmentData.js`, `frontend/src/shared/api/axiosClient.js`,
`frontend/vite.config.js`, `frontend/.env`, `scripts/test-all-routes.mjs`.

Env var NAMES present (values redacted, never printed):
- `frontend/.env`: `VITE_API_BASE_URL` (= `/api`, relative → Vite proxy), `VITE_RAZORPAY_KEY_ID`.
- `backend/.env`: `NODE_ENV`, `PORT`, `MONGODB_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN`,
  `ADMIN_PASSWORD`, `COOKIE_SECURE`, `COOKIE_SAME_SITE`, `CORS_ORIGIN`,
  `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`,
  `CLOUDINARY_API_SECRET`, `EMAILJS_*`.

---

## 1. Overall status

- **Route inventory: 34 distinct method+path registrations** (the provided 41-line listing
  double-counts the checkout/verify aliases and header groups). **0 missing.**
- **33 / 34 fully implemented and verified end-to-end.** The 34th (`POST /api/admin/uploads`)
  is a registered **stub** (returns a static URL; no Multer/Cloudinary) and has **no frontend caller**.
- **Automated contract harness `npm run test:routes` → 46 / 46 PASS (100%)**, including the
  5173→3000 proxy section (FE-1..FE-5) and authenticated login/me. Fresh run this session.
- **MongoDB connected and seeded** (real ObjectIds returned, e.g. `6ac1119f…`); projects/retail
  return real documents, not empty arrays.
- Backend remains **API-only** — no static/SPA serving; unknown routes return JSON 404.
- **Two code fixes** applied: (F1) `frontend/vite.config.js` dual-stack host binding, and
  (F6 — the real user-facing bug) `frontend/src/shared/api/axiosClient.js` removed a request
  interceptor that created a circular config reference and crashed axios before the XHR was sent.
- **Browser-verified working** after the F6 fix: Projects, Retail, and Admin login + protected
  dashboard all render real DB-backed data with no "Unable to connect to backend server" error.

---

## 2. Verified route inventory (34 distinct method+path pairs)

Status key: IMPLEMENTED = registered in `apiHandler.js` + traced to a real handler/service;
STUB = registered but does not meet the documented contract; caller column = frontend usage.

| # | Method | Path | Handler / service | Frontend caller | Status |
|---|--------|------|-------------------|-----------------|--------|
| 1 | GET | `/` | app.js inline API marker | manual | IMPLEMENTED |
| 2 | GET | `/health` | app.js detailed JSON (incl. `mongoose.connection.readyState`) | proxy | IMPLEMENTED |
| 3 | GET | `/api/health` | apiHandler `{status:ok}` | proxy | IMPLEMENTED |
| 4 | POST | `/api/auth/login` | authController.login → authService.loginAdmin (Mongo→in-memory, bcrypt, sets `token` cookie) | auth.api, AuthContext.login | IMPLEMENTED |
| 5 | GET | `/api/auth/me` | authController.getMe (via `protect`) | getCurrentAdmin, AuthContext.checkAuth | IMPLEMENTED |
| 6 | POST | `/api/auth/logout` | authController.logout (clears cookie) | logoutAdmin, AuthContext.logout | IMPLEMENTED |
| 7 | GET | `/api/projects` | projectController.getPublicProjects (published; `?category=`) | projects.api getProjects | IMPLEMENTED |
| 8 | GET | `/api/projects/:slug` | getPublicProjectBySlug (published-only) | getProjectBySlug | IMPLEMENTED |
| 9 | GET | `/api/retail` | retailController.getPublicRetail (published+available; `?category=`) | retail.api getRetailProducts | IMPLEMENTED |
| 10 | GET | `/api/retail/:slug` | getPublicRetailBySlug | getRetailProductBySlug | IMPLEMENTED |
| 11 | POST | `/api/enquiries` | enquiryController.createEnquiry (+ validators; Mongo else JSON fallback) | enquiries.api, EnquiryForm | IMPLEMENTED |
| 12 | POST | `/api/checkout` | orderController.checkout (alias of #13) | none (FE uses #13) | IMPLEMENTED |
| 13 | POST | `/api/orders/checkout` | orderController.checkout → createCheckoutSession (server re-validates cart) | cart checkout.api | IMPLEMENTED |
| 14 | POST | `/api/checkout/verify` | orderController.verifyPayment (alias of #15) | none (FE uses #15) | IMPLEMENTED |
| 15 | POST | `/api/orders/verify` | orderController.verifyPayment (HMAC when secret set) | checkout.api verifyPayment | IMPLEMENTED |
| 16 | GET | `/api/admin/stats` | inline aggregation + revenue (protect + adminLimiter) | dashboard getDashboardStats | IMPLEMENTED |
| 17 | GET | `/api/admin/projects` | getAdminProjects | admin getProjects | IMPLEMENTED |
| 18 | POST | `/api/admin/projects` | createProject (+ createProjectValidator) | createProject | IMPLEMENTED |
| 19 | GET | `/api/admin/projects/:id` | getAdminProjectById | none (list-only UI) | IMPLEMENTED |
| 20 | PUT | `/api/admin/projects/:id` | updateProject (+ updateProjectValidator) | updateProject | IMPLEMENTED |
| 21 | DELETE | `/api/admin/projects/:id` | deleteProject | deleteProject | IMPLEMENTED |
| 22 | GET | `/api/admin/retail` | getAdminRetail | getRetailItems | IMPLEMENTED |
| 23 | POST | `/api/admin/retail` | createRetailItem (+ createRetailValidator) | createRetailItem | IMPLEMENTED |
| 24 | GET | `/api/admin/retail/:id` | getAdminRetailById | none | IMPLEMENTED |
| 25 | PUT | `/api/admin/retail/:id` | updateRetailItem (+ updateRetailValidator) | updateRetailItem | IMPLEMENTED |
| 26 | DELETE | `/api/admin/retail/:id` | deleteRetailItem | deleteRetailItem | IMPLEMENTED |
| 27 | GET | `/api/admin/enquiries` | getAdminEnquiries | getEnquiries | IMPLEMENTED |
| 28 | GET | `/api/admin/enquiries/:id` | getAdminEnquiryById | none | IMPLEMENTED |
| 29 | PATCH | `/api/admin/enquiries/:id/status` | updateEnquiryStatus (new/in-progress/resolved) — matched before bare-`:id` | updateEnquiryStatus | IMPLEMENTED |
| 30 | DELETE | `/api/admin/enquiries/:id` | deleteEnquiry | admin pages | IMPLEMENTED |
| 31 | GET | `/api/admin/orders` | getAdminOrders | getOrders | IMPLEMENTED |
| 32 | GET | `/api/admin/orders/:id` | getAdminOrderById | none | IMPLEMENTED |
| 33 | PATCH | `/api/admin/orders/:id/status` | updateOrderStatus (validator rejects `paymentStatus`/`amount`) | updateOrderStatus | IMPLEMENTED |
| 34 | POST | `/api/admin/uploads` | **STUB**: inline static URL, no Multer/Cloudinary | none | STUB (blocked on creds) |

Dispatch-order check: the `/status` PATCH branches (enquiries #29, orders #33) are matched
BEFORE the bare-`:id` GET branches, so they are not swallowed. No `DELETE /api/admin/orders/:id`
exists — this matches the provided listing and is not a gap.

---

## 3. Findings

**F1 — Vite bound IPv4-only; `localhost` → `::1` refused (High). FIXED.**
Windows resolves `localhost` to `::1` (IPv6) first. `frontend/vite.config.js` had
`server.host:'0.0.0.0'` / `preview.host:'0.0.0.0'` (IPv4-only), so a browser hitting
`http://localhost:5173` over `::1` got `ERR_CONNECTION_REFUSED` before any API call.
Fix: `host: true` on both `server` and `preview` (dual-stack: binds `::` and `0.0.0.0`).
Verified: `[::]:5173` now listening; `[::1]:5173/api/projects` → 200 with real data.

**F2 — `autoStartBackendPlugin` EADDRINUSE risk (Low, not fixed; by design guardrail exists).**
`vite.config.js` auto-spawns `node backend/dev.js` if `:3000/api/health` is unreachable.
If a backend is already bound but slow to answer health, the spawn can hit EADDRINUSE.
`backend/dev.js` already logs and `process.exit(1)` on EADDRINUSE, so it degrades safely.
Left as-is (no evidence of user impact; changing it is out of scope).

**F3 — `POST /api/admin/uploads` is a stub (Medium, blocked on owner credentials).**
Returns a static URL; no Multer/Cloudinary wiring. No frontend caller exists. Real upload
requires `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` + a
multipart UI. Not implemented — would be an unrelated feature and needs owner direction.

**F4 — Payment verify is permissive in dev (Medium, by design; not production-proof).**
`order.service.js verifyPayment` accepts `signature==='simulated'`, `NODE_ENV==='test'`, or
any `paymentId` when `RAZORPAY_KEY_SECRET` is unset. Real HMAC-SHA256 runs only when the
secret + all Razorpay fields are present. The harness passes with FAKE signatures by design;
this is NOT proof of live Razorpay verification.

**F5 — `Idempotency-Key` unused server-side (Low).**
The header is sent by the frontend and allowed by CORS, but `apiHandler.js` never reads it
(`utils/idempotency.js` is not wired). Only guard is the client-side submit-lock.

**F6 — axios request interceptor created a circular config reference → `RangeError` before the XHR was sent (CRITICAL, real user-facing bug). FIXED.**
`frontend/src/shared/api/axiosClient.js` had a request interceptor:
```js
axiosClient.interceptors.request.use((config) => { config.__originalRequest = config; return config; }, ...);
```
`config.__originalRequest = config` makes the config object reference **itself**. Axios 1.20.0
deep-clones/merges the request config (`isPlainObject` → `assignValue` → `forEach`), which recurses
infinitely on that cycle and throws **`RangeError: Maximum call stack size exceeded`** synchronously
— *before* the XHR adapter runs. Consequences that matched every observed symptom:
- No `/api/projects` (or `/api/retail`) request ever appears in the Network panel (fails pre-flight).
- The thrown `RangeError` has **no `error.response`**, so the response interceptor's `!error.response`
  branch fires → `code: ERR_NETWORK` → message "Unable to connect to backend server…".
- Raw `fetch()`/`XMLHttpRequest`/bare `axios.request()` to the same URL return **200** (they don't run
  this interceptor) — which is why the backend/proxy looked fine while the app failed.
- Systemic across Projects AND Retail (both import the same shared `axiosClient`).

Isolation proof (in-page, same origin): a fresh `axios.create()` with **no** interceptor → 200; with the
**request-only** circular interceptor → `Maximum call stack size exceeded`; with the response
interceptors only → 200. `__originalRequest` was written but **never read anywhere** in the frontend
(dead + harmful). Fix: removed the request interceptor entirely. The `arms-rum-browser.js`
console attribution seen earlier was incidental (it wraps `console.*`); the crash was in app code, and
it reproduces in a clean isolated context with no RUM — so the earlier "environment artifact"
conclusion was WRONG and is corrected here.

---

## 4. Phase-2/Phase-4 test evidence

### 4a. Automated harness (fresh run this session) — 46 / 46 PASS
`node scripts/test-all-routes.mjs` against backend `:3000` and via proxy `:5173`.
Highlights: public GETs 200 with real DB docs; `:slug` 200; invalid slug 404; enquiry
invalid 400 / valid 201; checkout + both aliases 200; verify + both aliases 200 (fake sigs,
per F4); admin unauth 401; full admin CRUD 200/201; uploads 201 (stub, per F3); logout 200
then me 401; **proxy FE-1..FE-5 (health/projects/retail/login/me) all 200 through :5173.**

### 4b. In-browser network truth (automation browser, origin `http://localhost:5173`)
Direct probes executed in the page, through the Vite proxy:
- `GET /api/projects` → **200**, `{success:true,data:[4 projects]}` (real ObjectIds).
- `GET /api/retail` → **200**, `{success:true,data:[…]}` (real ObjectIds).
- Both `fetch()` AND raw `XMLHttpRequest` (the same adapter axios uses) succeed with 200.

---

## 5. Wiring verified (no mismatch)

- axios `baseURL = import.meta.env.VITE_API_BASE_URL || '/api'` (relative → same-origin → proxy); `withCredentials:true`; timeout 15s.
- Vite proxy forwards `/api` and `/health` to `http://127.0.0.1:3000` (`changeOrigin:true`).
- Backend CORS: allow-list incl. localhost any-port + cloud preview domains, `credentials:true`,
  methods GET/HEAD/PUT/PATCH/POST/DELETE/OPTIONS, headers incl. `Idempotency-Key`, preflight 204.
- Auth: JWT in httpOnly cookie `token` (SameSite lax, Secure false in dev); `protect` accepts cookie aliases or Bearer.
- `getProjects` calls `axiosClient.get('/projects')` → `/api/projects` (relative, same-origin). No hardcoded absolute URL. No frontend URL bug.

---

## 6. Changed files (exact paths)

1. `frontend/vite.config.js` — `server.host` and `preview.host`: `'0.0.0.0'` → `true`
   (dual-stack bind; fixes F1 `::1`/ERR_CONNECTION_REFUSED).
2. `frontend/src/shared/api/axiosClient.js` — **removed the request interceptor** that set
   `config.__originalRequest = config` (circular self-reference). This was the real user-facing
   bug (F6): axios 1.20 deep-clone hit `RangeError: Maximum call stack size exceeded` before the
   XHR was sent, which the response error interceptor misreported as "Unable to connect to backend
   server". `__originalRequest` was never read anywhere, so removal is safe and minimal. The
   response interceptor (envelope unwrap + retry + normalization) is unchanged.

No backend files were changed — routing, proxy, CORS, cookie, and DB wiring were already correct
(proven by the 46/46 harness). No unrelated refactors. Frontend and backend remain independently
startable from their own directories.

---

## 7. Browser verification after the F6 fix (real UI, origin `http://localhost:5173`)

Acceptance test performed in the live browser after removing the circular-config interceptor:

| Flow | Network | Rendered result | Verdict |
|------|---------|-----------------|---------|
| Projects (`/projects`) | `GET /api/projects` → **200 xhr** (visible in Network, real request) | 3 project cards render — "Aura Wellness Haven", "The Vasant Vihar Residence", "Studio Pavilion & Creative Workspace" + images | PASS |
| Retail (`/retail`) | `GET /api/retail` → **200** | 6 products render — "Wabi Daybed", "Nami Ceramic Vessel", "Mori Sculptural Credenza", "Zenith Linen Pendant", "Sora Oak Coffee Table", "Komorebi Lounge Chair" + 6 images | PASS |
| Admin Login (`/admin/login`) | `POST /api/auth/login` → 200 (cookie set); `GET /api/admin/stats` → 200 | Redirects to `/admin` dashboard: Projects 4, Retail 6, Enquiries 2, Orders 12 | PASS |

- No `[API] No response from backend` and no "Unable to connect to backend server" after the fix.
- The only remaining console entries are the **expected** pre-login `401 /api/auth/me` (session probe
  before sign-in — correct behavior) and a cosmetic React "unique key prop" warning in
  `AdminDashboardPage.jsx` (a `map` over rows without `key`); neither affects connectivity. The key
  warning is a pre-existing UI nit, out of scope for this connectivity task.
- Scenario classification (per the investigation brief): this was **Scenario A** — no axios request
  appeared in Network — because the crash happened during request construction, before the XHR. Root
  cause was in the shared API layer (interceptor), not the backend, proxy, response shape, or state.

---

## 8. Passed / Failed / Blocked (clearly separated)

- **PASSED (verified):** 33 / 34 routes end-to-end (harness 46/46); proxy 5173→3000; CORS +
  preflight; cookie auth login/me/logout; admin CRUD; checkout + verify (simulated, see F4);
  DB connected + seeded; backend API-only isolation; F1 dual-stack fix; **F6 axios fix — Projects,
  Retail, and Admin login/dashboard render real data in the live browser (§7).**
- **FAILED:** none.
- **BLOCKED / UNVERIFIED:**
  - `POST /api/admin/uploads` real media upload (stub; needs Cloudinary creds + multipart UI) — F3.
  - Live Razorpay signature verification (dev path is permissive/simulated) — F4.

---

## 9. Exact owner actions still required

1. **Uploads:** set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` and
   approve implementing `POST /api/admin/uploads` (Multer memory → Cloudinary, `multipart/form-data`,
   real `images[]`) plus an upload UI, before uploads can be claimed working.
2. **Payments:** provide Razorpay sandbox `RAZORPAY_KEY_ID` + `RAZORPAY_KEY_SECRET` and a sandbox
   order to prove real HMAC signature verification (current dev path accepts simulated signatures).
3. **Cosmetic (optional):** `frontend/src/features/admin-dashboard/pages/AdminDashboardPage.jsx`
   renders a list without a React `key` prop (console warning only; no functional impact).

---

## 10. Complete problem-by-problem log (every issue, nothing omitted)

Format per item: **Where → Symptom → Root cause → How solved → Verification.**
Group A = real code bugs fixed. Group B = investigation/process problems hit and resolved.
Group C = things checked and found already-correct (no change needed). Group D = still open /
blocked (honestly not "solved").

### Group A — Code bugs found and FIXED

**A1. axios circular-config crash — THE primary user-facing bug.**
- **Where:** `frontend/src/shared/api/axiosClient.js`, the request interceptor
  (`axiosClient.interceptors.request.use(...)`).
- **Symptom:** Projects and Retail pages show "Unable to load…" and the app logs
  `[API] No response from backend` + "Unable to connect to backend server. Please ensure the
  backend is running at http://127.0.0.1:3000." — even though the backend, proxy, and DB are all
  healthy. No `/api/*` request appears in the browser Network panel at all.
- **Root cause:** The interceptor did `config.__originalRequest = config;` — assigning the config
  object onto **itself** (circular reference). Axios **1.20.0** deep-clones/merges the request
  config before dispatch (`isPlainObject` → `assignValue` → `forEach` in `axios.js`), which recurses
  infinitely on the cycle and throws **`RangeError: Maximum call stack size exceeded`** synchronously,
  *before the XHR adapter ever runs*. Because it is a thrown JS error (not an HTTP response),
  `error.response` is `undefined`, so the response interceptor's `!error.response` branch fired and
  **mislabelled a code crash as a network/backend-down error**. That misleading message is why the
  bug looked like a connectivity problem.
- **How solved:** Removed the request interceptor entirely. `__originalRequest` was written but
  **never read anywhere** in the frontend (grep-confirmed: only 1 hit = the assignment itself), so it
  was dead + harmful. The response interceptor (envelope unwrap `response.data`, GET retry, error
  normalization) is untouched.
- **Verification:** (a) In-page isolation matrix: fresh `axios.create()` with no interceptor → 200;
  with the request-only circular interceptor → `Maximum call stack size exceeded`; with response
  interceptors only → 200. (b) After the fix, the live UI renders real data — see A2/§7:
  Projects 3 cards, Retail 6 products, Admin dashboard stats. (c) Network panel now shows
  `GET /api/projects [200] xhr` (the request finally reaches the wire).

**A2. Vite bound IPv4-only — `localhost` → `::1` connection refused.**
- **Where:** `frontend/vite.config.js` — `server.host` and `preview.host`.
- **Symptom:** Opening `http://localhost:5173` could fail with `ERR_CONNECTION_REFUSED` before any
  API call, on machines where `localhost` resolves to IPv6 `::1` first (common on Windows).
- **Root cause:** `host: '0.0.0.0'` binds IPv4 only; the IPv6 loopback `::1` had nothing listening.
- **How solved:** Set `host: true` for both `server` and `preview` (dual-stack: binds `::` and
  `0.0.0.0`), with an explanatory comment.
- **Verification:** `[::]:5173` now listening; `[::1]:5173/api/projects` → 200 with real data.

### Group B — Investigation / process problems hit, and how each was resolved

**B1. First conclusion was WRONG (blamed the automation browser).**
- **Where:** My earlier Phase-4 analysis.
- **Symptom:** Because raw `fetch`/`XHR` returned 200 and every `console.error` was attributed to
  the injected `arms-rum-browser.js`, I concluded the failure was an automation-browser artifact and
  that "no code change is warranted." The user rejected this — they still saw the error in their
  normal browser.
- **Root cause of the misdiagnosis:** I compared raw fetch/XHR (which bypass the app's interceptors)
  against the app, and mistook "the network path works" for "the app works." I did not initially test
  the app's **own axios client** in isolation.
- **How solved:** Ran the decisive probe — `import('/src/shared/api/axiosClient.js')` in the page and
  call `client.get('/projects')`. It failed with `ERR_NETWORK` **even in a clean isolated context
  with no RUM**, proving an app bug. Then rebuilt `axios.create()` adding interceptors one at a time
  to pinpoint the request interceptor (A1). Corrected §3/§7 of this file.
- **Verification:** A1 isolation matrix + post-fix UI. Lesson saved to project memory so this
  misdiagnosis is not repeated.

**B2. The audit file itself was corrupted.**
- **Where:** repo-root `CONNECTIVITY_AUDIT.md`.
- **Symptom:** It contained **two different documents merged** with a literal `=======` git-conflict
  marker (line 168), plus stale/contradictory claims (e.g. "DB has 0 projects, `data:[]`" in the top
  half vs "4 projects / 6 retail" in the bottom half) and unverified assertions.
- **Root cause:** A prior unresolved merge/paste left both versions concatenated.
- **How solved:** Rewrote the file as one clean, accurate document from actually-verified evidence
  (fresh harness run + live browser), discarding the fabricated/stale halves.
- **Verification:** Current file has no `=======` marker; counts match the live harness (46/46) and
  browser results.

**B3. browser-use `evaluate_script` runs in an ISOLATED world.**
- **Where:** browser debugging tooling.
- **Symptom:** Monkey-patching `XMLHttpRequest`/`fetch` inside `evaluate_script` captured nothing
  (`window.__reqs: []`) because the app's axios runs in the page's main world.
- **Root cause:** Isolated-world JS does not share globals/prototypes with the main world.
- **How solved:** Used CDP-level `list_network_requests` to see the app's real requests, and used
  `import()` of the app's module (which executes the real client code) to capture the actual error.
- **Verification:** This is exactly how A1 was proven.

**B4. Tool-schema friction during browser testing.**
- **Where:** browser-use `click`.
- **Symptom:** `click` rejected extra params ("must NOT have additional properties") and "No snapshot
  found."
- **How solved:** Called `take_snapshot` first and used the `uid` schema; where needed, clicked
  programmatically via `evaluate_script`.
- **Verification:** Admin login form was filled + submitted successfully this way (§7).

### Group C — Checked and confirmed ALREADY CORRECT (no change made)

**C1. Backend routing** — all 34 distinct method+path routes registered in `apiHandler.js` and traced
to real handlers/services; 0 missing; unknown routes return JSON 404 (never HTML). Verified by read +
harness 46/46.

**C2. Vite proxy 5173 → 3000** — `/api` and `/health` forward correctly (`changeOrigin:true`).
Verified: proxy section FE-1..FE-5 all 200; in-page fetch/XHR through the proxy 200.

**C3. CORS + cookies + auth** — allow-list covers localhost any-port + preview domains,
`credentials:true`, correct methods/headers, preflight 204; JWT httpOnly `token` cookie; `protect`
accepts cookie/Bearer. Verified: login 200 + Set-Cookie, `me` 200 with session, 401 without.

**C4. Response shape / envelope** — backend returns `{success,data}`; frontend reads `res.data`
correctly (interceptor unwraps `response.data`). Not a data-shape problem. Verified: Projects/Retail
render real records after A1 fix.

**C5. Database** — MongoDB connected and seeded (real ObjectIds). The earlier "empty `[]`" was a
stale baseline state, not a bug. Verified: `/health` readyState 1 + real docs returned.

**C6. Frontend API URLs** — `getProjects` → `axiosClient.get('/projects')` with `baseURL:'/api'`
= `/api/projects` (relative, same-origin). No `/api/api/...` doubling, no hardcoded absolute URL, no
env-var mismatch (`VITE_API_BASE_URL=/api` at runtime). Verified by reading runtime `client.defaults`.

### Group D — Still OPEN / BLOCKED (not solved; stated honestly)

**D1. `POST /api/admin/uploads` is a stub (F3).** Returns a static URL; no Multer/Cloudinary; no
frontend caller. **Blocked** on owner Cloudinary credentials + a multipart UI. Not fixed (would be an
unrelated feature and needs owner direction).

**D2. Razorpay verification is permissive in dev (F4).** Accepts `simulated`/secret-less payments by
design; real HMAC runs only when `RAZORPAY_KEY_SECRET` + all fields are present. **Blocked** on owner
sandbox keys + a sandbox order to prove live signature verification.

**D3. `Idempotency-Key` unused server-side (F5).** Sent by the frontend and allowed by CORS, but
`apiHandler.js` never reads it (`utils/idempotency.js` not wired). Only the client submit-lock guards
duplicates. **Not fixed** (no evidence of user impact; changing it is out of scope).

**D4. `autoStartBackendPlugin` EADDRINUSE risk (F2).** Vite auto-spawns the backend if health is
unreachable; a slow-but-bound backend could cause EADDRINUSE. `dev.js` already logs + exits safely.
**Left as-is** (guardrail exists, no observed impact).

**D5. React "unique key prop" warning (cosmetic).** `AdminDashboardPage.jsx` maps rows without a
`key`. Console warning only; **no connectivity/functional impact**. Out of scope for this task.

### One-line summary
The single real defect breaking frontend↔backend communication was **A1** (axios circular-config
`RangeError`, misreported as "backend down"); **A2** removed an IPv6 edge-case; everything else in the
request path (C1–C6) was already correct; **D1–D5** remain open/blocked and are documented above.
