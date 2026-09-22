# DEPLOYMENT.md — Sabr Studio

Reference docs: `PRD.md`, `TRD.md` (Sections 7, 18, 20 are authoritative here). No dedicated `DATABASE.md`/`API.md` exist yet — schema and endpoint details below are sourced from `TRD.md` Sections 6–7.

**Architecture**: one shared codebase, two deployment adapters that expose the **same public URL structure** (`/`, `/projects`, `/projects/:slug`, `/retail`, `/services`, `/about`, `/contact`, `/admin/*`, `/api/*`):

- **Hostinger (persistent Node)** — a single Express process serves `/api/*` *and* the built React (Vite) frontend from `backend/public/`. One domain, one process.
- **Vercel (single project)** — Vercel serves the Vite static build (`frontend/dist`) directly and routes `/api/*` to a Node serverless function (`api/index.js` → the same Express app). One project, one domain. The frontend is **not** served through the Node function.

Source folders stay separate (`frontend/`, `backend/`); they are never merged. The root `package.json` orchestrates dev/build/start.

---

## 0. Quick Reference

### Development (two processes, Vite HMR)
```text
frontend → Vite dev server → http://localhost:5173
backend  → Express API     → http://localhost:3000
Vite proxies /api and /health → http://localhost:3000
```
Run both with one command from the repo root: `npm run dev` (or run `npm run dev` inside each folder).

### Production build (Hostinger / local prod test)
```text
npm run build   # vite build → frontend/dist, then copied into backend/public
npm run start   # node backend/server.js — Express serves /api/* + backend/public
```

### Hostinger
```text
One Node application · one domain · Express serves the frontend build · /api → Express
```

### Vercel
```text
One Vercel project (root) · frontend static build (frontend/dist) · /api → Node function · same domain
```

### Required environment variables (names only)
- **Frontend (browser-safe, `VITE_` only):** `VITE_API_BASE_URL` (`/api` in production), `VITE_RAZORPAY_KEY_ID`
- **Backend (server-only, never `VITE_`-prefixed):** `NODE_ENV`, `PORT`, `MONGODB_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `ADMIN_PASSWORD`, `COOKIE_SECURE`, `COOKIE_SAME_SITE`, `CORS_ORIGIN`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `EMAILJS_SERVICE_ID`, `EMAILJS_TEMPLATE_ID`, `EMAILJS_PUBLIC_KEY`, `EMAILJS_PRIVATE_KEY`

---

## 1. Prerequisites

**Accounts**: Hostinger Business (Node.js-capable) plan · MongoDB Atlas · Razorpay (live + test keys) · Cloudinary · EmailJS · Vercel (preview only) · Git host (GitHub/GitLab, connected to both Hostinger's Git-import and Vercel).

**Local software**: Node.js (version pinned in `backend/package.json` `engines`) · npm · Git.

**Environment variables** (full reference — used in Sections 3, 4, 6):

| Var | Scope | Notes |
|---|---|---|
| `VITE_API_BASE_URL` | Frontend | Relative `/api` in production (same-origin); full local/preview backend URL otherwise |
| `VITE_RAZORPAY_KEY_ID` | Frontend | Public key only |
| `MONGODB_URI` | Backend | Atlas connection string |
| `JWT_SECRET` | Backend | Signing secret |
| `JWT_EXPIRES_IN` | Backend | Token/cookie expiry |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | Backend | Secret never leaves backend |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | Backend | |
| EmailJS server credential(s), if integration pattern requires | Backend | |
| `CORS_ORIGIN` | Backend | Allowed origin per environment |
| `COOKIE_SECURE` / `COOKIE_SAME_SITE` | Backend | Explicit per environment |
| `PORT` | Backend | Hostinger-supplied at runtime; local fallback |
| `NODE_ENV` | Backend | `development` / `production` |

Rule: anything `VITE_`-prefixed is bundled into client JS. Never prefix a secret with `VITE_`. Never commit `.env` — commit `.env.example` (names only) per package.

---

## 2. Local Setup

1. `git clone <repo>` → from the **repository root** run `npm run install:all` (installs both `frontend/` and `backend/` deps).
2. Copy `.env.example` → `.env` in both `frontend/` and `backend/`; fill values from Section 1's table (use test/dev Razorpay keys, a dev Atlas URI or dedicated dev database).
3. Run both apps with one command from the root: `npm run dev` — starts the Express API (`backend/`, port **3000**, nodemon) and the Vite dev server (`frontend/`, port **5173**) together. (You can also run `npm run dev` inside each folder separately.)
4. The Vite dev server proxies `/api` and `/health` to `http://localhost:3000`, so the frontend can call relative `/api/...` in development with no hardcoded backend host and no CORS preflight.
5. `VITE_API_BASE_URL` may be left empty in development (defaults to `/api`, served through the proxy). `backend/.env` `CORS_ORIGIN` should include the Vite origin (`http://localhost:5173`) if you ever call the backend directly instead of through the proxy.
6. Local production rehearsal: `npm run build` (builds + copies the frontend into `backend/public/`), then `npm run start` and browse `http://localhost:3000` — Express serves both the SPA and `/api/*` from one process, exactly like Hostinger.

**Connect to Atlas**: create a free/dev cluster (or use a dedicated dev database within the project's cluster), add your current IP to Atlas Network Access, copy the SRV connection string into `MONGODB_URI`. If `MONGODB_URI` is unset or unreachable, the backend logs a warning and serves seeded in-memory data so local development never hard-fails.

---

## 3. Vercel Deployment (Single Project — Frontend + API)

Vercel deploys the **whole application as one project** from the repository root: the Vite static build is served by Vercel's CDN, and `/api/*` is handled by a Node serverless function that reuses the same Express app (`api/index.js` → `backend/server.js`). One public domain, same URL structure as Hostinger.

The configuration lives in the root `vercel.json` (one coherent rewrites strategy — no deprecated `builds`/`routes`):

```json
{
  "framework": null,
  "installCommand": "npm install --prefix backend && npm install --prefix frontend",
  "buildCommand": "npm run build --prefix frontend",
  "outputDirectory": "frontend/dist",
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/index" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

How routing resolves:
1. `/api/*` → first rewrite → the `api/index.js` Node function (Express). The function only ever sees `/api/*`; it returns JSON 404s for unknown API paths and never serves HTML.
2. Static assets (`/assets/*`, `/favicon.svg`, …) → served directly from `frontend/dist` (Vercel checks the filesystem before rewrites).
3. Everything else (`/projects`, `/admin/login`, …) → second rewrite → `/index.html` → React Router (SPA deep links and refresh work).

Setup steps:
1. Import the repository into Vercel. **Root Directory: leave as the repository root** (do *not* set it to `frontend/`).
2. Vercel reads `vercel.json` for install/build/output and the rewrites above. No further build settings are required.
3. Set the backend environment variables (Section 1 table) in the Vercel project settings — `MONGODB_URI`, `JWT_SECRET`, `COOKIE_SECURE=true`, `COOKIE_SAME_SITE=lax`, `CORS_ORIGIN` (the production domain), Cloudinary/EmailJS/Razorpay as needed. Set the frontend variable `VITE_API_BASE_URL=/api` (same-origin) and `VITE_RAZORPAY_KEY_ID`.
4. Because frontend and API are same-origin, the auth cookie works without cross-origin CORS. `COOKIE_SECURE=true` is required (Vercel is HTTPS).
5. MongoDB Atlas: allow-list Vercel's egress (Atlas `0.0.0.0/0` with strong credentials + TLS is the common compensating control on serverless, since Vercel function IPs are dynamic). The connection is cached on `globalThis` (`backend/config/db.js`) so warm invocations reuse one connection.

> Note: serverless functions are stateless and short-lived. The in-memory fallback stores are per-invocation only — always set `MONGODB_URI` on Vercel so data persists. Permanent media must live in Cloudinary, never on the function's ephemeral filesystem.

---

## 4. Hostinger Production Deployment

1. **Repository shape**: `frontend/` build output must land in `backend/public/` (`.gitignore`d, populated at build time — never hand-edited or committed).
2. **Git import**: In Hostinger's Node.js application panel, connect the Git repository and select the production branch. Every push/manual deploy pulls latest code.
3. **Build step** (run at deploy time from the **repository root**):
   - Install: `npm run install:all` (installs `backend/` and `frontend/` deps; `nodemon` stays a backend devDependency).
   - Build: `npm run build` → runs `vite build` (`frontend/dist/`) and copies that output into `backend/public/` via `scripts/build.mjs` (cross-platform, no manual copying). `backend/public/` is gitignored and populated only at build time.
   - Start: `npm run start` → `node backend/server.js`.
   - Express registers `/api/*` first, then serves `backend/public/` as static files, then a SPA catch-all (registered **after** `/api/*` and static) returns `backend/public/index.html` for any non-API GET.
4. **Hostinger Node application settings**:
   - **Application root:** the repository root (where the root `package.json` lives).
   - **Build command:** `npm run install:all && npm run build`.
   - **Start command:** `npm run start`.
   - **Node version:** match `engines` in `backend/package.json` (Node >= 18).
   - **Port:** Express listens on `process.env.PORT` (Hostinger-supplied) — never hardcoded.
7. **Domain & DNS**: point the Hostinger-issued or connected custom domain at the Node.js application; enable Hostinger's SSL (Let's Encrypt or equivalent) so the entire site (pages + `/api/*`) serves over HTTPS.
8. **Environment variables**: enter all backend variables from Section 1's table into Hostinger's Node.js application environment-variable panel — never hardcoded, never committed. Set `NODE_ENV=production` and `COOKIE_SECURE=true`.
9. **Restarts**: each deploy restarts the single Node process; a brief restart window is expected (no load balancer/multiple instances at this scope) — not a bug.
10. **Rollback**: redeploy a previous commit/branch state; keep the production branch always in a clean, deployable state.
11. **Media**: Cloudinary serves all uploaded images directly in production; `backend/public/` holds only the built frontend app shell, never user media.

---

## 5. MongoDB Atlas

1. Create a production cluster (or a dedicated production database within an existing cluster), separate from any dev/preview database.
2. **Connection string**: SRV-format URI in `MONGODB_URI`; connection established once at server startup (`config/db.js` → `connectDB()`), never reconnected per-request.
3. **Database user**: create a role scoped to this application's database only (readWrite on the app DB), not an Atlas admin/global user. Rotate credentials if ever exposed.
4. **Network access**: allow-list Hostinger's outbound IP (if the plan exposes a stable one) or an appropriately scoped range/`0.0.0.0/0` only if Hostinger provides no stable IP and Atlas-side auth (strong credentials + TLS) is the compensating control — prefer a specific IP allowance whenever available.
5. **Collections** (5, per `TRD.md` §7): Projects, Retail, Enquiries, Orders, Admin. Confirm indexes exist before go-live: unique `slug` (Projects, Retail), compound `{published, category}` (Projects) / `{published, availability}` (Retail), `{status, createdAt: -1}` (Enquiries), `{paymentStatus, orderStatus}` + `razorpayOrderId`/`razorpayPaymentId` (Orders), unique `email` (Admin).
6. **Production security**: TLS enforced (default on Atlas), `password` field `select: false` on the Admin schema, backups enabled (Section 9), least-privilege DB user, no direct client access — only the backend process connects (`FR-P1`).

---

## 6. Build & Configuration

- **Root orchestration**: the root `package.json` drives everything — `npm run dev` (both apps), `npm run build` (frontend build → copied into `backend/public/`), `npm run start` (Express), `npm run vercel-build` (frontend build only, for Vercel), `npm run install:all` (install both packages). Build/dev scripts are Node-based (`scripts/build.mjs`, `scripts/dev.mjs`) so they behave identically on Windows and Linux.
- **Frontend build**: `vite build` inside `frontend/` → `frontend/dist/`. Must complete with zero errors before deploy proceeds (hard gate). For Hostinger, `npm run build` then copies `frontend/dist/` into `backend/public/`.
- **Backend runtime**: Node.js version pinned via `engines` in `backend/package.json` (>= 18); starts with `node backend/server.js`. It connects to Atlas in the background via `config/db.js → connectDB()` (connection cached on `globalThis` for serverless reuse); if `MONGODB_URI` is unset/unreachable it logs a warning and serves seeded in-memory data instead of crashing.
- **API URL config**: `VITE_API_BASE_URL` = relative `/api` in production (same-origin on both Hostinger and Vercel) · in local dev it can stay empty (defaults to `/api`, proxied by Vite to `http://localhost:3000`) — no hardcoded backend host in source.
- **CORS**: `cors` configured with an explicit comma-separated origin allow-list (`CORS_ORIGIN`) — localhost origins are auto-permitted outside production; the production domain is listed in production. Never a wildcard origin with credentials. In production this is a defensive allow-list, not a functional requirement, since frontend and API are same-origin.
- **Security middleware**: `helmet` is active (CSP disabled because the UI renders images from external CDNs and runtime-injected inline styles); `express-rate-limit` guards login, admin, enquiry and general API traffic; `express-validator` validates all mutating endpoints.
- **Frontend–backend connection**: the shared `axiosClient` uses `VITE_API_BASE_URL` with `withCredentials: true` so the httpOnly auth cookie is sent.

---

## 7. SSL & Security

- HTTPS enforced end-to-end in production via Hostinger's SSL on the custom domain; no plain-HTTP fallback for pages or `/api/*`.
- Secrets live only in Hostinger's environment-variable panel and local `.env` (gitignored) — never in source, never `VITE_`-prefixed if they must stay server-only.
- Admin JWT cookie: `httpOnly`, `Secure` in production, explicit `SameSite` — never stored in `localStorage`/`sessionStorage`.
- `helmet` (security headers), `express-rate-limit` (login, enquiry, checkout endpoints), `express-validator` (all mutating endpoints) active in production.
- CORS allow-list matches the production domain exactly; Atlas network access scoped per Section 5.
- `.env`, credentials, and API keys are never committed — verify `.gitignore` covers `.env*` (except `.env.example`) in both packages before every release.

---

## 8. Verification (post-deploy smoke test)

- [ ] Production domain loads over HTTPS with a valid certificate.
- [ ] Direct navigation and hard refresh succeed on a deep route (e.g., `/projects/<slug>`, `/admin/orders`) — SPA fallback resolves, no 404.
- [ ] `GET /api/projects` and `GET /api/retail` return published data only.
- [ ] Enquiry form submits, persists to Atlas, and triggers an EmailJS notification.
- [ ] Retail purchase flow: cart → checkout → Razorpay → backend-verified success updates order/payment status correctly; a cancelled payment does not create a successful order.
- [ ] Admin login succeeds with valid credentials, sets the httpOnly cookie; invalid credentials show a generic error.
- [ ] Admin CRUD (project/retail create/update/delete, image upload to Cloudinary) works end-to-end.
- [ ] Direct calls to `/api/admin/*` without a valid session are rejected.
- [ ] No console errors in the browser and no unhandled request failures in server logs during the above.

---

## 9. Backup & Recovery

- **MongoDB Atlas**: enable Atlas's automated backup (Cloud Backup / continuous snapshots per the cluster tier) on the production cluster; confirm restore-to-point-in-time works before relying on it.
- **Source code**: production branch on the Git host is the source of truth; tag or note the commit hash deployed at each release for fast rollback reference.
- **Recovery — bad deploy**: redeploy the last known-good commit via Hostinger's Git-import (Section 4.10).
- **Recovery — bad data change**: restore the affected collection(s) from the nearest Atlas snapshot prior to the incident; cross-check against Order/Enquiry timestamps to identify data lost between snapshot and incident.
- **Recovery — credential leak**: rotate the affected secret (JWT signing key, Razorpay/Cloudinary/Atlas credentials) immediately in Hostinger's environment panel and redeploy; rotating `JWT_SECRET` invalidates all active admin sessions (expected).

---

## 10. Troubleshooting

| Symptom | Check |
|---|---|
| **Build failure** | Frontend: `vite build` output for the failing file/import. Backend: confirm `npm install` succeeded with the committed `package-lock.json`; confirm Node version matches `engines`. |
| **404 on refresh / deep link** | SPA catch-all route missing or registered before `/api/*`/static middleware; confirm it's registered last and returns `backend/public/index.html`. |
| **API connection failure (frontend can't reach backend)** | Verify `VITE_API_BASE_URL` for the current environment (relative `/api` in prod, full URL locally/preview); confirm backend process is running and bound to `process.env.PORT`. |
| **CORS error** | `CORS_ORIGIN` doesn't include the calling origin; check it matches exactly (scheme + host, no trailing slash mismatch). |
| **MongoDB connection failure** | Check `MONGODB_URI` value, Atlas Network Access allow-list includes the server's outbound IP, and the database user's credentials/permissions haven't rotated. |
| **Environment variable issue** | Confirm the variable is set in Hostinger's panel (not just local `.env`), correctly scoped (`VITE_` only for public values), and the process was restarted after the change. |
| **Domain/SSL problem** | Confirm DNS points at Hostinger's provided target and SSL issuance completed; certificate issuance can lag DNS propagation — recheck after propagation completes. |

---

## 11. Final Production Checklist

- [ ] All backend environment variables set in Hostinger (Section 1 table); none exposed to the frontend bundle
- [ ] `frontend/dist/` correctly copied into `backend/public/` as part of the build step
- [ ] SPA fallback route verified on at least one dynamic route (`/projects/:slug`) and one admin route (`/admin/orders`)
- [ ] Production domain served over HTTPS with valid SSL
- [ ] `CORS_ORIGIN` set to the exact production domain
- [ ] MongoDB Atlas: production cluster/database in use, network access scoped, backups enabled, indexes present (Section 5)
- [ ] Razorpay keys switched to **live** mode (`RAZORPAY_KEY_ID`/`SECRET`, `VITE_RAZORPAY_KEY_ID`)
- [ ] Cloudinary and EmailJS production credentials in place
- [ ] Admin login, CRUD, and logout verified in production
- [ ] Enquiry and retail-purchase flows verified end-to-end in production
- [ ] `robots.txt` and XML sitemap live and correctly scoped (public routes only, `/admin/*` disallowed)
- [ ] No console errors or unhandled request failures during the Section 8 smoke test
- [ ] Deployed commit hash recorded for rollback reference
