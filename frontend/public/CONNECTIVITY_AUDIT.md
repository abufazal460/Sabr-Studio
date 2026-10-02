# Sabr Studio — Backend & Frontend Complete Connectivity & API Flow Audit

## 1. Executive Summary & Target Architecture Verification

- **Frontend Server**: Runs independently at `http://localhost:5173` via Vite 5 (`frontend/vite.config.js`).
- **Backend API Server**: Runs independently at `http://localhost:3000` via Express + Node.js 22 (`backend/app.js`).
- **Communication Flow**: Frontend interacts with backend via HTTP API requests. In local development, `frontend/vite.config.js` forwards `/api` and `/health` requests to `http://localhost:3000` (`changeOrigin: true`).
- **Backend Asset Isolation**: Confirmed. Backend serves **zero frontend files or HTML bundles**. All unmatched routes return an explicit JSON `404 Not Found`.
- **Automated Verification Command**: `npm run test:routes` (runs `scripts/test-all-routes.mjs`).

---

## 2. Re-Verification of Existing Audit Findings & Root Cause Analysis

### Investigation of User-Reported Network Errors (`/projects`, `/retail`, `/admin/login`)

1. **Root Cause 1: CORS Origin Rejection in Cloud / Preview Environments**
   - *Evidence*: `backend/app.js` previously only permitted origins matching `/^https?:\/\/(localhost|127\.0\.0\.1):\d+$/`. When accessing the application via cloud preview URLs (such as `*.run.app` or `*.vercel.app`), the browser sent an `Origin` header that failed this regex.
   - *Browser Impact*: The browser blocked the response due to missing `Access-Control-Allow-Origin`, resulting in `error.response === undefined` and Axios throwing a `"Network error. Please check your connection and try again."` message on `/projects`, `/retail`, and `/admin/login`.
   - *Resolution*: Updated `backend/app.js` CORS policy to explicitly allow localhost on any port, `127.0.0.1`, and cloud preview domains (`*.run.app`, `*.vercel.app`, `*.web.app`, etc.) with credentials.

2. **Root Cause 2: Nodemon Process Restarts on File Persistence (ECONNRESET)**
   - *Evidence*: When an inquiry was submitted or an order drafted, `fallbackStorage.js` wrote to local JSON files (`enquiries.json`, `orders.json`). Nodemon watched all files by default and triggered an immediate server restart, terminating in-flight connections with `ECONNRESET` / `socket hang up`.
   - *Resolution*: Configured `backend/nodemon.json` to ignore `data/**`, `../data/**`, and `*.json` files.

3. **Root Cause 3: Premature Rate Limiting Throttling (HTTP 429)**
   - *Evidence*: `adminLimiter` (10 requests / 15 min) and `authLimiter` (5 requests / 15 min) were too restrictive for regular development usage, triggering 429 errors during multi-tab browsing or test suites.
   - *Resolution*: Relaxed development rate limits (`1000` in dev for admin, `100` for auth/enquiries) while maintaining strict production throttling.

4. **Root Cause 4: Order Status Update Omitting Fallback Storage**
   - *Evidence*: `orderService.updateOrderStatus()` checked only MongoDB and static `inMemoryOrders`, but omitted `fallbackOrders`. Admin updates to newly drafted orders resulted in 404 errors.
   - *Resolution*: Added fallback store persistence to `updateOrderStatus()`.

5. **Investigation of Known Upload Stub (`/api/admin/uploads`)**
   - *Investigation*: Inspecting `backend/apiHandler.js` (lines 420-435) confirms this endpoint is currently a **STUB** returning a static Unsplash URL fallback.
   - *Credential Verification*: Environment check confirms that `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` are **NOT configured**.
   - *Classification*: Marked as **BLOCKED / STUB**. The route endpoint responds to authenticated callers, but live cloud storage upload is blocked until the owner supplies Cloudinary credentials.

---

## 3. Status-Code Contract & Verification Rules

Every route is evaluated against its true application contract:
- **System & Status**: Expected `200` when healthy.
- **Successful Reads / Updates / Logins**: Expected `200`.
- **Successful Creation**: Expected `201` for new resources (`POST /api/enquiries`, `POST /api/admin/projects`, `POST /api/admin/retail`, `POST /api/admin/uploads`).
- **Unauthenticated Access to Protected Routes**: Expected `401 Unauthorized` (security boundary enforcement).
- **Invalid Credentials**: Expected `401 Unauthorized` on wrong password.
- **Validation Failures**: Expected `400 Bad Request` on malformed/missing required fields.
- **Non-Existent Resources**: Expected `404 Not Found`.

---

## 4. Full Route Inventory & Verification Table

Total Method + Full-Path Route Registrations Audited: **34**  
Total Automated Contract Tests Executed: **46** (including security negative test cases)  
- **Passed (Fully Verified)**: **33 / 34 routes** (45 / 46 test cases)  
- **Blocked / Stub**: **1 / 34 routes** (`POST /api/admin/uploads` — live cloud upload requires Cloudinary keys)  
- **Failed**: **0**

| # | Group | Method | Path | Auth Required | Expected | Observed | Contract Result | Classification | Redacted Response Summary |
|---|---|---|---|---|---|---|---|---|---|
| **1** | System | `GET` | `/` | Public | **200** | **200** | PASS | **Passed** | `{"success":true,"message":"Sabr Studio API is running"}` |
| **2** | System | `GET` | `/health` | Public | **200** | **200** | PASS | **Passed** | `{"status":"ok","uptime":...}` |
| **3** | System | `GET` | `/api/health` | Public | **200** | **200** | PASS | **Passed** | `{"status":"ok"}` |
| *4-neg* | Auth | `POST` | `/api/auth/login` | Public | **401** | **401** | PASS | **Passed** | `{"success":false,"message":"Invalid credentials"}` |
| **4** | Auth | `POST` | `/api/auth/login` | Public | **200** | **200** | PASS | **Passed** | `{"success":true,"data":{"admin":...}}` (`token` cookie set) |
| *5-neg* | Auth | `GET` | `/api/auth/me` | Unauth | **401** | **401** | PASS | **Passed** | `{"success":false,"message":"Authentication required"}` |
| **5** | Auth | `GET` | `/api/auth/me` | Protected | **200** | **200** | PASS | **Passed** | `{"success":true,"data":{"admin":...}}` |
| **6** | Auth | `POST` | `/api/auth/logout` | Public | **200** | **200** | PASS | **Passed** | `{"success":true,"message":"Logged out successfully"}` |
| *6-post*| Auth | `GET` | `/api/auth/me` | Post-Logout | **401** | **401** | PASS | **Passed** | `{"success":false,"message":"Authentication required"}` |
| **7** | Projects | `GET` | `/api/projects` | Public | **200** | **200** | PASS | **Passed** | `{"success":true,"data":[4 projects]}` |
| **8** | Projects | `GET` | `/api/projects/:slug` | Public | **200** | **200** | PASS | **Passed** | `{"success":true,"data":{"slug":"the-vasant-vihar-residence",...}}` |
| *8-neg* | Projects | `GET` | `/api/projects/:invalid` | Public | **404** | **404** | PASS | **Passed** | `{"success":false,"message":"Project not found"}` |
| **9** | Retail | `GET` | `/api/retail` | Public | **200** | **200** | PASS | **Passed** | `{"success":true,"data":[6 items]}` |
| **10** | Retail | `GET` | `/api/retail/:slug` | Public | **200** | **200** | PASS | **Passed** | `{"success":true,"data":{"slug":"komorebi-lounge-chair",...}}` |
| *10-neg*| Retail | `GET` | `/api/retail/:invalid` | Public | **404** | **404** | PASS | **Passed** | `{"success":false,"message":"Product not found"}` |
| *11-neg*| Enquiries| `POST` | `/api/enquiries` | Public | **400** | **400** | PASS | **Passed** | `{"success":false,"message":"Enquiry validation failed"}` |
| **11** | Enquiries| `POST` | `/api/enquiries` | Public | **201** | **201** | PASS | **Passed** | `{"success":true,"message":"Enquiry submitted successfully"}` |
| **12** | Checkout | `POST` | `/api/checkout` | Public | **200** | **200** | PASS | **Passed** | `{"success":true,"data":{"orderId":...,"razorpayOrderId":...}}` |
| **13** | Checkout | `POST` | `/api/orders/checkout` | Public | **200** | **200** | PASS | **Passed** | `{"success":true,"data":{"orderId":...}}` |
| **14** | Checkout | `POST` | `/api/checkout/verify` | Public | **200** | **200** | PASS | **Passed** | `{"success":true,"message":"Payment verified successfully"}` |
| **15** | Checkout | `POST` | `/api/orders/verify` | Public | **200** | **200** | PASS | **Passed** | `{"success":true,"message":"Payment verified successfully"}` |
| *16-neg*| Admin | `GET` | `/api/admin/stats` | Unauth | **401** | **401** | PASS | **Passed** | `{"success":false,"message":"Authentication required"}` |
| **16** | Admin | `GET` | `/api/admin/stats` | Protected | **200** | **200** | PASS | **Passed** | `{"success":true,"data":{"totalProjects":...,"revenue":...}}` |
| **17** | Admin | `GET` | `/api/admin/projects` | Protected | **200** | **200** | PASS | **Passed** | `{"success":true,"data":[projects list]}` |
| **18** | Admin | `POST` | `/api/admin/projects` | Protected | **201** | **201** | PASS | **Passed** | `{"success":true,"data":{"id":...}}` |
| **19** | Admin | `GET` | `/api/admin/projects/:id` | Protected | **200** | **200** | PASS | **Passed** | `{"success":true,"data":{"title":...}}` |
| **20** | Admin | `PUT` | `/api/admin/projects/:id` | Protected | **200** | **200** | PASS | **Passed** | `{"success":true,"data":{"title":"... (Updated)"}}` |
| **21** | Admin | `DELETE`| `/api/admin/projects/:id`| Protected | **200** | **200** | PASS | **Passed** | `{"success":true,"message":"Project deleted successfully"}` |
| **22** | Admin | `GET` | `/api/admin/retail` | Protected | **200** | **200** | PASS | **Passed** | `{"success":true,"data":[retail list]}` |
| **23** | Admin | `POST` | `/api/admin/retail` | Protected | **201** | **201** | PASS | **Passed** | `{"success":true,"data":{"id":...}}` |
| **24** | Admin | `GET` | `/api/admin/retail/:id` | Protected | **200** | **200** | PASS | **Passed** | `{"success":true,"data":{"title":...}}` |
| **25** | Admin | `PUT` | `/api/admin/retail/:id` | Protected | **200** | **200** | PASS | **Passed** | `{"success":true,"data":{"price":29500}}` |
| **26** | Admin | `DELETE`| `/api/admin/retail/:id` | Protected | **200** | **200** | PASS | **Passed** | `{"success":true,"message":"Retail item deleted successfully"}` |
| **27** | Admin | `GET` | `/api/admin/enquiries` | Protected | **200** | **200** | PASS | **Passed** | `{"success":true,"data":[enquiries list]}` |
| **28** | Admin | `GET` | `/api/admin/enquiries/:id`| Protected| **200** | **200** | PASS | **Passed** | `{"success":true,"data":{"name":...}}` |
| **29** | Admin | `PATCH` | `/api/admin/enquiries/:id/status`| Protected| **200** | **200** | PASS | **Passed** | `{"success":true,"data":{"status":"in-progress"}}` |
| **30** | Admin | `DELETE`| `/api/admin/enquiries/:id`| Protected| **200** | **200** | PASS | **Passed** | `{"success":true,"message":"Enquiry deleted successfully"}` |
| **31** | Admin | `GET` | `/api/admin/orders` | Protected | **200** | **200** | PASS | **Passed** | `{"success":true,"data":[orders list]}` |
| **32** | Admin | `GET` | `/api/admin/orders/:id` | Protected | **200** | **200** | PASS | **Passed** | `{"success":true,"data":{"orderNumber":...}}` |
| **33** | Admin | `PATCH` | `/api/admin/orders/:id/status`| Protected| **200** | **200** | PASS | **Passed** | `{"success":true,"data":{"orderStatus":"confirmed"}}` |
| **34** | Admin | `POST` | `/api/admin/uploads` | Protected | **201** | **201** | PASS | **Blocked/Stub** | Returns static Unsplash URL fallback; live Cloudinary upload blocked (requires credentials) |

---

## 5. Frontend Proxy & Browser Flows Verification

Direct testing through the Vite development proxy (`http://localhost:5173` ⟷ `http://localhost:3000`):

| Test ID | Client Call via Port 5173 | Forwarded Target Port 3000 | Expected | Observed | Cookie / Auth Flow | Result |
|---|---|---|---|---|---|---|
| `FE-1` | `GET /api/health` | `http://localhost:3000/api/health` | **200** | **200** | Proxied cleanly | **PASS** |
| `FE-2` | `GET /api/projects` | `http://localhost:3000/api/projects` | **200** | **200** | JSON projects array returned | **PASS** |
| `FE-3` | `GET /api/retail` | `http://localhost:3000/api/retail` | **200** | **200** | JSON catalog array returned | **PASS** |
| `FE-4` | `POST /api/auth/login` | `http://localhost:3000/api/auth/login` | **200** | **200** | `Set-Cookie: token=...; HttpOnly` received | **PASS** |
| `FE-5` | `GET /api/auth/me` | `http://localhost:3000/api/auth/me` | **200** | **200** | Session cookie forwarded | **PASS** |

---

## 6. Changed Files & Rationales

1. **`backend/app.js`**:
   - Added minimal JSON `GET /` status endpoint.
   - Removed legacy reverse-proxy and static asset handlers to preserve the API-only boundary.
   - Broadened CORS allow-list to support localhost on any port and cloud preview domains (`*.run.app`, `*.vercel.app`).
2. **`backend/apiHandler.js`**:
   - Registered root and health exemptions.
   - Added `GET /api/audit/download` endpoint for direct audit report retrieval.
3. **`backend/middlewares/rateLimit.middleware.js`**:
   - Relaxed rate limiting in development mode (`process.env.NODE_ENV !== 'production'`) to prevent developer lockout.
4. **`backend/services/order.service.js`**:
   - Integrated `fallbackOrders` into `updateOrderStatus` to ensure admin status updates succeed in offline/fallback mode.
   - Extended cart item resolution to accept `product`, `productId`, `itemId`, and `id`.
5. **`backend/nodemon.json`**:
   - Configured nodemon to ignore local fallback JSON files, preventing server resets during write operations.
6. **`package.json`**:
   - Added `"test:routes": "node scripts/test-all-routes.mjs"`.

---

## 7. Remaining External Service Actions Required from Owner

1. **Cloudinary Asset Storage (`/api/admin/uploads`)**:
   - *Status*: Operating in stub/mock fallback mode.
   - *Required Action*: To activate live media uploads, configure in `.env`:
     - `CLOUDINARY_CLOUD_NAME`
     - `CLOUDINARY_API_KEY`
     - `CLOUDINARY_API_SECRET`
2. **MongoDB Atlas Database**:
   - *Status*: Operating cleanly in resilient in-memory & local fallback mode (`data/fallback/`).
   - *Required Action*: To switch to live cloud database persistence, configure `MONGODB_URI` in `.env`.
3. **Razorpay Live Gateway**:
   - *Status*: Payment verification functions in test simulation mode.
   - *Required Action*: To accept real customer payments, configure `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`.
