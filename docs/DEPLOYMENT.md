# DEPLOYMENT.md — Sabr Studio

Reference docs: `PRD.md`, `TRD.md` (Sections 7, 18, 20 are authoritative here). No dedicated `DATABASE.md`/`API.md` exist yet — schema and endpoint details below are sourced from `TRD.md` Sections 6–7.

**Architecture**: single Express process serves `/api/*` and the built React (Vite) frontend from `backend/public/` — one deployable unit. Vercel is a **preview-only** surface for the frontend; it is never production. Production is Hostinger only.

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

1. `git clone <repo>` → `cd frontend && npm install` and `cd backend && npm install`.
2. Copy `.env.example` → `.env` in both `frontend/` and `backend/`; fill values from Section 1's table (use test/dev Razorpay keys, a dev Atlas URI or dedicated dev database).
3. Run backend: `npm run dev` (nodemon, `NODE_ENV=development`) — confirms Atlas connection before accepting traffic.
4. Run frontend: `npm run dev` (Vite dev server, separate port) — `VITE_API_BASE_URL` points at `http://localhost:<backend-port>/api`.
5. Backend `CORS_ORIGIN` must include the Vite dev server's origin in development.

**Connect to Atlas**: create a free/dev cluster (or use a dedicated dev database within the project's cluster), add your current IP to Atlas Network Access, copy the SRV connection string into `MONGODB_URI`.

---

## 3. Vercel Deployment (Preview Only)

Vercel hosts a **frontend-only preview build** for reviewing UI changes on a shareable URL. It is not, and never becomes, the production deployment (production is single-process Hostinger — Section 4).

1. Import the repo into Vercel; set **Root Directory** to `frontend/`.
2. Build settings: **Build Command** `npm run build` (or `vite build`), **Output Directory** `dist`, **Install Command** `npm install`.
3. Environment variables (Vercel project settings, Preview/Production-preview scope): `VITE_API_BASE_URL` pointing at a reachable backend (the Hostinger production API, or a running dev/staging backend — Vercel does not host this project's Express backend), `VITE_RAZORPAY_KEY_ID` (test key for preview).
4. Every push/PR gets its own preview URL for review; no rewrite/SPA config beyond Vercel's default SPA fallback for Vite projects is required since only the frontend is deployed here.
5. Do not point preview builds at production Razorpay/live keys or the production database's write paths without deliberate intent — previews commonly hit a test backend.

---

## 4. Hostinger Production Deployment

1. **Repository shape**: `frontend/` build output must land in `backend/public/` (`.gitignore`d, populated at build time — never hand-edited or committed).
2. **Git import**: In Hostinger's Node.js application panel, connect the Git repository and select the production branch. Every push/manual deploy pulls latest code.
3. **Build step** (single process, run at deploy time):
   - Install frontend deps, run `vite build` → `frontend/dist/`.
   - Copy `frontend/dist/` contents into `backend/public/` (or configure Vite's `build.outDir` to emit there directly).
   - Install backend deps (production only — `nodemon` stays a devDependency).
   - Start: `node server.js` (mapped from `npm start` in `backend/package.json`).
   - Express serves `backend/public/` as static files after all `/api/*` routes are registered.
4. **SPA routing**: a catch-all route, registered **after** `/api/*` routes and static-file middleware, returns `backend/public/index.html` for any non-API GET. This is required for direct URL access/refresh on routes like `/projects/some-slug` or `/admin/orders` — without it they 404.
5. **Node version**: set in Hostinger's application settings to match the version pinned in `backend/package.json`'s `engines` field.
6. **Port**: Express listens on `process.env.PORT` as provided by Hostinger — never a hardcoded port.
7. **Domain & DNS**: point the Hostinger-issued or connected custom domain at the Node.js application; enable Hostinger's SSL (Let's Encrypt or equivalent) so the entire site (pages + `/api/*`) serves over HTTPS.
8. **Environment variables**: enter all backend variables from Section 1's table into Hostinger's Node.js application environment-variable panel — never hardcoded, never committed.
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

- **Frontend build**: `vite build` inside `frontend/` → `dist/`. Must complete with zero errors before deploy proceeds (hard gate).
- **Backend runtime**: Node.js version pinned via `engines` in `backend/package.json`; starts with `node server.js`; does not accept traffic until Atlas connection is confirmed.
- **API URL config**: `VITE_API_BASE_URL` = relative `/api` in production (same-origin, since Express serves both) · full `http://localhost:<port>/api` in local dev · reachable backend URL in Vercel preview.
- **CORS**: `cors` configured with an explicit origin allow-list per environment (`CORS_ORIGIN`) — Vite dev server origin locally, the production domain in production. Never a wildcard origin for credentialed requests. In production this is a defensive allow-list, not a functional requirement, since frontend and API are same-origin.
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
