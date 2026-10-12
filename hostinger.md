
# SabrStudio — Hostinger and CI/CD Audit

Last reviewed: 2026-10-12
Repository: https://github.com/abufazal460/Sabr-Studio
Production branch: `main`
Existing Vercel deployment: https://sabr-studio.vercel.app/

## Verified repository facts

- This is a monorepo with a root `package.json`, `frontend/`, `backend/`, `scripts/`, and root `vercel.json`.
- Frontend: React/Vite. `frontend/package.json` has `build: vite build`; Vite outputs to `frontend/dist`.
- Frontend lockfile exists at `frontend/package-lock.json`.
- Backend: Express, ESM. The production start script in `backend/package.json` is `node dev.js`; the entry file is `backend/dev.js`.
- No `backend/package-lock.json` was found on `main` during this review.
- Root `vercel.json` builds `frontend/dist`, rewrites `/api/*` and `/health` to the Vercel serverless function, and sends remaining routes to `/index.html`.
- Vercel serverless entry: `api/index.js`, importing `backend/app.js`.
- `backend/app.js` is explicitly API-only and returns JSON for unmatched routes. It does not currently serve `frontend/dist`.
- The Vite dev server proxies `/api` and `/health` to `http://127.0.0.1:3000`.
- Root test scripts run `scripts/test-all-routes.mjs`. That script starts local services and exercises write endpoints, including enquiry email delivery; it must not be run against production data or in an unconfigured CI job.

## CI workflow

The workflow at `.github/workflows/ci.yml`:
1. Runs on pull requests to `main`, pushes to `main`, and manual dispatch.
2. Uses Node.js 22, which is supported by Hostinger's documented Node.js Web App runtime list and is compatible with the repository's declared `node >=20` engines.
3. Installs frontend dependencies from the committed lockfile and runs the Vite production build.
4. Installs backend dependencies and runs `node --check` against backend JavaScript files.
5. Does **not** run the route integration suite, because that suite performs real HTTP flows and expects successful email delivery. Run it only against an isolated staging database and test email configuration after the test script is made safe for that environment.

The backend currently has no committed `backend/package-lock.json`; add and review one before switching backend CI to `npm ci` for deterministic dependency installation.

## Environment variable names found in backend/.env.example

Configure values in Hostinger's application Environment Variables UI, never in Git:

- `NODE_ENV` — set to `production`.
- `PORT` — do not hardcode unless Hostinger explicitly instructs you to; the managed platform may assign it.
- `MONGODB_URI` — production MongoDB Atlas URI and intended database.
- `JWT_SECRET` — strong, unique production secret.
- `JWT_EXPIRES_IN` — existing default shown in the example is `7d`; keep only if that is the desired policy.
- `ADMIN_PASSWORD` — configure only if the application actually uses it for bootstrap/authentication.
- `COOKIE_SECURE` — `true` for HTTPS production.
- `COOKIE_SAME_SITE` — choose based on whether frontend and API are same-site and whether cross-site cookies are required; do not copy the local `lax` value blindly.
- `CORS_ORIGIN` — comma-separated exact origins allowed by the backend. Include the real Hostinger frontend origin and the existing Vercel origin if the Vercel frontend will call this API. Do not add trailing paths.
- `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` — only if Razorpay is enabled in production.
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` — only if Cloudinary uploads are enabled.
- `EMAILJS_SERVICE_ID`, `EMAILJS_TEMPLATE_ID`, `EMAILJS_PUBLIC_KEY`, `EMAILJS_PRIVATE_KEY` — required by the current backend example for enquiry email delivery.

The checked-in `backend/.env.example` is the source for the variable names above. Audit the code's actual `process.env` references before final deployment and add any additional required variables to this document without including their values.

## Hostinger deployment decision — do not guess these settings

Hostinger's official guide documents GitHub integration with automatic builds/deployments on pushes and Node.js Web App support for Business and Cloud plans. However, the current repository is a monorepo where the frontend is a Vite static build and the backend is a separate Express API-only process.

The repository's current files do **not** prove that one Hostinger managed app can simultaneously:
- build and publish `frontend/dist` as the website,
- start `backend/dev.js` as a long-running Express process, and
- route same-domain `/api/*` requests to that process.

Do not set an arbitrary build command, output directory, or entry file until the actual Hostinger build-settings screen confirms the supported fields and app-root behavior. Do not add a custom GitHub Actions SSH deploy: managed Business/Cloud Node.js hosting is not a VPS, and Hostinger documents native GitHub integration as the deployment mechanism.

### Safe setup sequence

1. In hPanel, create or open the intended Node.js Web App and choose **Import Git Repository**.
2. Select `abufazal460/Sabr-Studio` and verify which branch Hostinger deploys. Keep production deployment on `main`.
3. Inspect the actual build settings: framework, Node.js version, application/root directory, build command, output directory, and entry file.
4. Stop before the first production deploy if the settings cannot express the monorepo's separate frontend and API architecture. Do not point the entry file to `backend/dev.js` while assuming that alone will publish `frontend/dist`.
5. Choose and test one supported architecture in a staging app: either a documented separate frontend/API deployment if the plan supports it, or an explicitly implemented same-process Express configuration that serves the built frontend only when a Hostinger-specific flag is enabled. The latter requires a reviewed code change and must leave the Vercel API-only behavior unchanged.
6. Set production environment variables in hPanel. Never paste secrets into GitHub files, build logs, screenshots, or this document.
7. Verify the live frontend, `/health`, `/api/health`, public Projects/Retail APIs, admin login, enquiry flow, and database status.
8. Keep Vercel configuration and its environment variables unchanged until Hostinger is verified. Vercel and Hostinger deployments are separate; one does not automatically update the other unless both are connected to the repository.

## Release gating and rollback

- Configure a GitHub ruleset/branch protection for `main` and require the CI status checks after the first workflow run. This is a manual repository setting; a YAML file alone cannot enforce it.
- Hostinger's native GitHub integration can deploy on pushes. Do not merge to `main` until CI passes and the Hostinger app configuration has been verified in staging.
- Before a risky release, record the last known-good commit SHA and confirm a recovery method in the Hostinger dashboard.
- If a deployment fails, restore the last known-good deployment/commit using Hostinger's available controls, then re-check health and critical API flows.
- Do not reset, reseed, or drop production MongoDB data as part of deployment or rollback.

## Official references

- Hostinger Node.js Web Apps: https://www.hostinger.com/support/how-to-deploy-a-nodejs-website-in-hostinger/
- GitHub Actions Node.js CI: https://docs.github.com/en/actions/tutorials/build-and-test-code/nodejs
- setup-node: https://github.com/actions/setup-node
=======
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

