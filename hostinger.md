# Sabr Studio — Hostinger Deployment & Production Audit

> Evidence-based document. Every claim below was verified by reading the actual
> repository files on branch `fazal` (commit `890289e`). Items that depend on the
> specific Hostinger plan/dashboard are explicitly marked
> **`VERIFY IN HOSTINGER DASHBOARD`**. No secrets are printed; unknown values use
> placeholders like `<YOUR_MONGODB_ATLAS_URI>`.
>
> Companion fix already applied in this repo for the Hostinger build error:
> `frontend/.npmrc` (new) + `scripts/build.mjs` (Vite presence guard). See §5.

---

## 1. Project overview and verified architecture

Sabr Studio is a **monorepo** with two independently-run parts:

| Part | Stack | Role | Runtime model |
|------|-------|------|---------------|
| `frontend/` | React 18 + Vite 5 SPA | Public site + admin dashboard | Built to static files in `frontend/dist` |
| `backend/` | Node 20 + Express 4 (ESM) | JSON API only (never serves the SPA) | Persistent Node process (Hostinger) **or** serverless function (Vercel) |

Verified request/response flow:

```
Frontend UI (React Router)
  → axiosClient (baseURL = VITE_API_BASE_URL || '/api', withCredentials:true)
    → HTTP GET/POST /api/*  (same-origin relative path)
      → Vercel rewrite  → api/index.js → backend/app.js (serverless)
        OR  Hostinger    → Node app (backend/dev.js) → backend/app.js (persistent)
          → express middleware: helmet, cors, json/urlencoded, cookieParser,
            compression, request-timeout(30s)
            → apiHandler (router): rate-limit → validator → controller
              → protect / protectCustomer (JWT from cookie or Bearer)
                → service → Mongoose (Atlas) OR in-memory fallback
                  → JSON envelope { success, data | message } → back to UI
```

Key verified facts:

- **Backend is API-only.** `backend/app.js` has NO static-file serving and NO SPA
  fallback; unknown non-`/api` paths return a JSON `404`. (`app.js` lines ~152-165.)
- **Single router works two ways.** `backend/apiHandler.js` exports both
  `apiHandler` (Express middleware; calls `next()` for non-API paths) and a
  default `handleApiRequest` (standalone serverless handler). Vercel's
  `api/index.js` imports the Express `app`; the router supports both.
- **Frontend talks same-origin by default.** `frontend/src/shared/api/axiosClient.js`
  uses `baseURL = import.meta.env.VITE_API_BASE_URL || '/api'` → a relative
  `/api`, so on a same-origin deployment no CORS/cookie-site issues arise.
- **The Vite `/api` → `127.0.0.1:3000` proxy in `frontend/vite.config.js` is
  dev/preview only.** It does not exist in the production `frontend/dist` bundle.
  Production API calls therefore resolve against the site's own origin.

---

## 2. Repository structure and important files

```
sabr-studio/
├─ package.json               # orchestrator scripts (dev, build, postinstall)
├─ scripts/
│  ├─ build.mjs               # root build → runs frontend `vite build` → frontend/dist
│  ├─ dev.mjs                 # local dev: backend :3000 + frontend :5173
│  └─ test-all-routes.mjs     # route smoke tests (npm test)
├─ vercel.json                # Vercel rewrites (see §3) — DO NOT EDIT
├─ api/index.js               # Vercel serverless entry → backend/app.js
├─ frontend/
│  ├─ package.json            # vite in devDependencies
│  ├─ .npmrc                  # include=dev  (Hostinger build fix — see §5)
│  ├─ vite.config.js          # build outDir=frontend/dist; dev proxy (dev only)
│  └─ src/...                 # React app; axiosClient, admin dashboard, checkout
└─ backend/
   ├─ package.json            # "start": "node dev.js"; engines node >=20
   ├─ dev.js                  # SERVER ENTRY: loads .env, app.listen(PORT), graceful shutdown
   ├─ app.js                  # Express app, CORS, helmet, /health, apiHandler, 404, connectDB
   ├─ apiHandler.js           # the router (all /api routes)
   ├─ config/db.js            # Mongoose connect (cached on globalThis) + no-DB fallback
   ├─ middlewares/            # protect, protectCustomer, rateLimit, timeout, error
   ├─ services/               # auth, project, retail, order, enquiry, razorpay, emailjs
   ├─ models/                 # Mongoose schemas + in-memory fallback stores
   ├─ utils/                  # fallbackStorage, cookieOptions, logger, seedDevelopmentData
   └─ .env.example            # template (only env file tracked in git)
```

---

## 3. Current deployment architecture and Vercel compatibility (unchanged)

`vercel.json` (verified, must NOT be changed):
- `/api/(.*)` → `/api/index`
- `/health`   → `/api/index`
- `/(.*)`      → `/index.html`  (SPA client-routing fallback)

`api/index.js` imports `backend/app.js` and exports it as the serverless handler.
On Vercel: install `npm install --prefix backend && npm install --prefix frontend`,
build `npm run build --prefix frontend` (`vercel-build` script), output
`frontend/dist`. The backend runs as a **stateless function per request**; Mongoose
connection is cached on `globalThis`.

**Hostinger differs fundamentally:** it runs a **persistent** Node.js application
behind an Nginx reverse proxy, not per-request functions. Vercel's serverless
model and rewrites do **not** transfer directly. See §11 for the recommended
Hostinger routing.

<!-- APPEND-MARKER -->

