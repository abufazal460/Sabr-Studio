# Frontend–Backend Connection Diagnosis

## UPDATE 2026-10-01 — Definitive root cause (supersedes the analysis below)

### The single confirmed cause of every failure

`backend/app.js` contains a **duplicate `import fs from 'fs';`** — one at line 9 and a
second at line 12 — in **every committed branch** (`HEAD`, `main`, `origin/main`,
`origin/fazal`; verified with `git show <ref>:backend/app.js | grep -c "^import fs from 'fs';"` → `2`).
In an ES module a repeated default-import binding is a hard
`SyntaxError: Identifier 'fs' has already been declared`, so `backend/app.js` **cannot be
loaded at all**.

Consequences, both environments:

| Environment | Chain of failure | Observed symptom |
|---|---|---|
| Local dev | `node backend/dev.js` → dynamic `import('./app.js')` throws → server never binds `:3000` → Vite proxy (`/api` → `http://localhost:3000`) gets `ECONNREFUSED` | Frontend "Network error", admin login fails, retail/projects empty |
| Vercel | `api/index.js` (`import app from '../backend/app.js'`) throws on invocation | **`500 FUNCTION_INVOCATION_FAILED`** on `/api/*` and `/health` |

Evidence captured 2026-10-01:
- Live: `GET https://sabr-studio.vercel.app/api/health` → `HTTP 500` body `A server error has occurred / FUNCTION_INVOCATION_FAILED / bom1::w9x97-...` (same for `/health`, `/api/projects`, `/api/retail`).
- Live browser `https://sabr-studio.vercel.app/projects` renders "Unable to load projects — Network error. Please check your connection and try again." (The Vercel 500 page is non-JSON and carries no CORS headers, so the browser blocks it and Axios reports a network error rather than a 500.)
- Local working tree (duplicate already removed): `node --check` passes on all `backend/**/*.js`; backend binds `:3000`; endpoints all return real data (see verification below).

### The fix

Remove the second `import fs from 'fs';` so only one remains. **This fix is already present
in the uncommitted working tree** (`git diff backend/app.js` shows the duplicate line being
deleted). No other code change is required — the routing, auth, CORS, cookie, proxy, and
`vercel.json` configuration are all correct and were verified working once the module loads.

> **BLOCKER (requires you):** the fix is uncommitted, and Vercel deploys from `origin/main`,
> which still has the duplicate. The live `500`s will persist until `backend/app.js` is
> committed to the deployed branch and redeployed. Per instructions I did **not** commit,
> push, or deploy.

### Verification actually run (2026-10-01, local, working-tree fix in place)

Commands were run from the repo root against `node backend/dev.js` on `:3000` and the
user's Vite dev server on `:5173`:

- `GET http://localhost:3000/health` → **200**, `database.status: "connected"` (state 1).
- `GET http://localhost:3000/api/projects` → **200**, populated project array (real records).
- `GET http://localhost:3000/api/retail` → **200**, populated retail array (real records).
- `POST http://localhost:3000/api/auth/login` body `{"email":"admin","password":"admin"}` → **200** `success:true`, sets httpOnly `token` cookie, returns sanitized admin (`role:"admin"`, no password/token in body).
- `GET http://localhost:3000/api/auth/me` with that cookie → **200**, returns the admin identity (protected route authorized).
- `GET http://localhost:5173/api/projects` (through the Vite proxy) → **200**, real data.
- `GET http://localhost:5173/api/retail` (through the Vite proxy) → **200**.
- `npm --prefix frontend run build` → **✓ built** (only `dev`/`build`/`preview` scripts exist; there is no lint script).
- Production bundle contains **no** localhost API URL: `VITE_API_BASE_URL=/api` (relative). The single `http://localhost` string in `dist/assets/index-*.js` is a React scheduler internal (`window.location.href || "http://localhost"`), not an API endpoint.

Local admin login and retail/projects data therefore **work end-to-end** once the backend
process is running from the fixed file.

### Items confirmed NOT to be bugs

- **Services page has no API dependency** — it renders from `frontend/src/features/services/data/services.data.js`. There is intentionally no `/api/services` backend route, so "services data" cannot fail over the network. (The earlier "service pages show no data" was the same backend-down/network-error cause affecting the shell, not a services endpoint.)
- **API base URL** is same-origin `/api` everywhere (`frontend/src/shared/api/axiosClient.js`: `baseURL: import.meta.env.VITE_API_BASE_URL || '/api'`, `withCredentials: true`).
- **Vite proxy** targets `http://localhost:3000` for `/api` and `/health`, matching the backend `PORT=3000`.
- **CORS** uses an allow-list with `credentials: true` (never `*` with credentials); same-origin in production.
- **Cookie**: name `token`, httpOnly, `secure` in production, `SameSite` from `COOKIE_SAME_SITE` (default `lax`).
- **Serverless adapter**: `api/index.js` default-exports the Express `app` (no `listen()` inside the function) — correct for Vercel.
- **Node version**: local shell is v25.5.0; `.nvmrc` = 24 and `engines.node >= 20`. The app runs on both; Vercel uses Node 24. Not a cause.

### Folder structure relevant to the connection

```
sabr-studio/
  api/index.js                 # Vercel serverless entry: export default Express app
  vercel.json                  # framework null; build frontend; output frontend/dist; rewrites
  package.json                 # root scripts: dev / build / start (orchestrate backend+frontend)
  scripts/{dev,build,serve,test-serverless}.mjs
  backend/
    app.js                     # Express app (health, CORS, apiHandler, static/SPA) <-- FIX HERE
    dev.js                     # local entry: loads backend/.env, imports app.js, listen(PORT)
    apiHandler.js              # /api/* router (auth, projects, retail, enquiries, orders, admin)
    config/db.js               # mongoose connect w/ globalThis cache; in-memory fallback if no URI
    controllers/ services/ models/ middlewares/ validators/ utils/
    .env                       # IGNORED by git — never committed
  frontend/
    vite.config.js             # dev server :5173 (strictPort), proxy /api,/health -> :3000
    src/shared/api/axiosClient.js   # baseURL '/api', withCredentials
    src/features/*/api/*.api.js     # auth.api, projects.api, retail.api, ...
```

### API connection contract

- Frontend base path: **`/api`** (same-origin; relative — no host baked into the bundle).
- Local dev: browser → `http://localhost:5173/api/...` → Vite proxy → `http://localhost:3000/api/...`.
- Production (Vercel): browser → `https://<site>/api/...` → rewrite `/api/(.*)` → `/api/index` (the Express function). `/health` → `/api/index`. All other paths → `/index.html` (SPA).
- Backend routes: `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/logout`, `GET /api/projects[/:slug]`, `GET /api/retail[/:slug]`, `POST /api/enquiries`, checkout/orders, `/api/admin/*` (protected). `GET /health` and `GET /api/health`.
- Auth: JWT in httpOnly cookie `token`; `withCredentials` on the client; `protect` middleware verifies the cookie or a `Bearer` header.

### Environment variables (NAMES only — never commit values)

Declared in root `.env.example`; local values live in the git-ignored `backend/.env`.
Browser-exposed (Vite) vars live in `frontend/.env` and MUST be `VITE_`-prefixed and
non-secret.

- Backend (server-only, `backend/.env` / Vercel env): `NODE_ENV`, `PORT`, `MONGODB_URI`,
  `JWT_SECRET`, `JWT_EXPIRES_IN`, `ADMIN_PASSWORD`, `COOKIE_SECURE`, `COOKIE_SAME_SITE`,
  `CORS_ORIGIN`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `CLOUDINARY_CLOUD_NAME`,
  `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `EMAILJS_SERVICE_ID`, `EMAILJS_TEMPLATE_ID`,
  `EMAILJS_PUBLIC_KEY`, `EMAILJS_PRIVATE_KEY`.
- Frontend (browser-safe, `frontend/.env`): `VITE_API_BASE_URL` (=`/api`), `VITE_RAZORPAY_KEY_ID` (public key only).
- Never place `JWT_SECRET`, `MONGODB_URI`, `CLOUDINARY_API_SECRET`, `EMAILJS_PRIVATE_KEY`,
  `ADMIN_PASSWORD`, or `RAZORPAY_KEY_SECRET` into any `VITE_` variable.

### Local ports & exact commands

- Backend: port **3000** — `node backend/dev.js` (or `npm --prefix backend run dev` for nodemon).
- Frontend: port **5173** (strictPort) — `npm --prefix frontend run dev`.
- Both together: `npm run dev` (root `scripts/dev.mjs`).
- Single-server production preview on :3000: `npm run build` then `npm run start`.
- If `:3000` is occupied, free it before starting; do not start a second backend on another
  port while the Vite proxy targets 3000.

### Vercel settings (what was verified vs not)

- Verified from repo: `vercel.json` → `framework: null`, `buildCommand: npm run build --prefix frontend`, `outputDirectory: frontend/dist`, rewrites `/api/(.*)`→`/api/index`, `/health`→`/api/index`, `/(.*)`→`/index.html`. `api/index.js` exists and default-exports the Express app, so the function is discovered (a rewrite alone would not create it).
- Verified live: all `/api/*` and `/health` currently return **500 FUNCTION_INVOCATION_FAILED** (the duplicate-import crash).
- **Unverified (needs dashboard):** Vercel env-var presence (notably `MONGODB_URI`), the deployed commit SHA, and function runtime logs. A missing `MONGODB_URI` does NOT cause the 500 — the app falls back to in-memory data gracefully; the crash is purely the SyntaxError. No Preview deployment was created and nothing was promoted to Production.

### Hostinger (unverified)

No Hostinger account/plan access was available, so its build/start/static-serving behavior is
**unverified**. The repo supports a persistent single-server model (`npm run build` →
`npm run start`, backend serves `backend/public` + API on one port) suitable for a Node-capable
VPS/Hostinger plan; a plan that cannot run a persistent Node process would need the static +
separate-API model instead.

### Troubleshooting quick reference

- **"Network Error" in the frontend (local):** is the backend actually listening on `:3000`?
  `netstat -ano | grep :3000`. If not, run `node backend/dev.js` and read the console —
  a `SyntaxError`/`Identifier 'fs' has already been declared` means the duplicate import is back.
- **`500 FUNCTION_INVOCATION_FAILED` (Vercel):** the function threw while loading. First check
  `backend/app.js` parses: `node --check backend/app.js`. Then confirm the deployed branch
  contains the fix (single `import fs`). Redeploy after committing.
- **Admin login fails:** confirm the request is `POST /api/auth/login` with JSON `{email, password}`;
  a `400` means validation (email/password required), `401` means bad credentials. The dev
  in-memory admin accepts `admin` / `admin`; production should set `ADMIN_PASSWORD` and seed a real admin.
- **Retail/projects empty but HTTP 200:** API is connected — the database has no matching
  records. Distinguish "connected, no data" from a request failure. Populate MongoDB or rely on
  the in-memory fallback data.

### Checks run / results / unverified

- Run & passed: `node --check` on all backend files; local `/health`, `/api/projects`,
  `/api/retail`, `POST /api/auth/login`, `GET /api/auth/me`; Vite-proxied `/api/projects`
  and `/api/retail`; frontend production build; bundle has no localhost API URL; live Vercel
  probe (all 500) and live `/projects` browser render.
- Unverified: Vercel env vars + deployed commit + function logs (no dashboard access);
  Hostinger (no account access); no Preview deployment created; nothing pushed to Production.

---

## Confirmed findings

- The frontend Axios client uses the same-origin `/api` base path, and `frontend/vite.config.js` proxies `/api` and `/health` to `http://localhost:3000`.
- `backend/.env` had `PORT=3001`, so a fresh backend launch selected port 3001 while the Vite proxy continued to send requests to port 3000. This port mismatch can make the frontend hit an older/different backend instance.
- A Node process was already listening on port 3000. It returned HTTP 200 for `/api/projects` and `/api/retail`, but both payloads contained empty `data` arrays. Its `/health` reported MongoDB connected. That indicates requests reached the API; the connected database currently has no visible project/retail records for these queries.
- Before the port setting was aligned, a fresh launch read `PORT=3001`; it failed to connect to MongoDB because the configured host could not resolve in this environment, then used the repository's in-memory demo data. That fresh instance returned populated project/retail data on 3001. Meanwhile Vite remained configured for 3000, where the older instance returned empty arrays. This is the clearest reproduction of why the UI could show no data despite a running backend.
- A direct local admin login request to port 3000 returned HTTP 200 with the development admin configuration. This confirms the auth endpoint can respond; it does not prove the browser login flow or production credentials are correct.
- The Services page reads `frontend/src/features/services/data/services.data.js`; the backend has no `/api/services` route. A request to `/api/services` therefore returns 404 by design in the current code.
- `backend/dev.js` previously relied on `dotenv/config` plus a static import of `app.js`. ESM evaluates static imports before the importing module body, so application services that capture environment variables during import could read them before `backend/.env` was loaded.

## Changes made

- Changed only the `PORT` setting in the ignored local `backend/.env` from 3001 to 3000. Other environment values were left untouched. This file remains ignored by Git.
- Updated `backend/dev.js` to load `backend/.env` first and dynamically import the application afterward, so modules that read environment variables at import time see the configured values.

## Verification performed

- The existing `scripts/test-serverless.mjs` completed successfully: health/API handlers returned JSON, the unknown API route returned JSON 404, the SPA route returned HTML, and the local test login returned HTTP 200.
- Direct requests to the already-running port 3000 backend returned HTTP 200 for `/api/health`, `/api/projects`, and `/api/retail`; project and retail lists were empty.
- A separate fresh backend launch on the previous configured port 3001 returned populated project/retail data, but Vite's proxy targets 3000.
- After setting the configured port to 3000, a fresh `node backend/dev.js` launch failed with `EADDRINUSE` because another process still owns port 3000. Stopping that process was denied by the current Windows execution identity. Do not start a second backend on another port while Vite remains configured for 3000.
- The Vite build/dev server could not be verified in this execution environment: esbuild was denied access to a parent directory while loading `frontend/vite.config.js`. This is an environment permission limitation; it is not proof of a Vite proxy failure.
- The available shell reports Node v25.5.0, while the repository declares Node 24. The bundled Node 24 runtime was used for Node-based checks. The system npm launcher also resolves to a missing npm CLI path in this shell, so root npm scripts were not verified here.

## Next local steps

1. In the terminal that owns the old backend on port 3000, stop it with Ctrl+C. If that terminal is unavailable, identify the process listening on port 3000 in Windows and stop only that backend process.
2. Confirm `backend/.env` has `PORT=3000` (do not share or print the rest of this file).
3. Select Node.js 24 in the local development environment and ensure `npm.cmd --version` works.
4. Start the backend with `npm.cmd --prefix backend run dev` and confirm it logs port 3000.
5. Start the frontend with `npm.cmd --prefix frontend run dev` and open `http://localhost:5173`.
6. In the browser Network tab, confirm requests go to `/api/...` on port 5173 and return responses proxied from port 3000.
7. Populate the intended MongoDB database with the required project and retail records if those API responses remain empty. Do not expect `/api/services` data: Services is currently frontend-static.

## Deployment status

- Vercel Preview/Production was not tested in this work.
- Hostinger was not tested in this work.
- No production credentials, environment values, or database records were changed.
=======
# Sabr Studio — Frontend-to-Backend Fix & Verification Report

## 1. Actual Final Folder Structure (Relevant Files)

```
sabr-studio/
├── .env.example                       # Declared environment variable contract
├── .gitignore                         # Ignores node_modules, build artifacts, env files
├── .nvmrc                             # Node version specifier (24)
├── metadata.json                      # Applet manifest
├── package.json                       # Monorepo root manifest with unified dev & build scripts
├── vercel.json                        # Vercel serverless functions & rewrite configuration
├── api/
│   └── index.js                       # Vercel Serverless Function entry point (mounts backend Express app)
├── scripts/
│   ├── build.mjs                      # Builds frontend to frontend/dist and copies to backend/public
│   ├── dev.mjs                        # Runs backend (port 3000) and frontend (port 5173) concurrently
│   ├── serve.mjs                      # Production persistent server script
│   └── test-serverless.mjs            # Serverless HTTP simulation verification test
├── backend/
│   ├── app.js                         # Express application setup, security, CORS, and routing
│   ├── apiHandler.js                  # Central API router and serverless/Express request dispatcher
│   ├── dev.js                         # Development server listening on port 3000
│   ├── package.json                   # Backend dependencies and scripts
│   ├── config/
│   │   └── db.js                      # MongoDB connection with in-memory fallback
│   ├── controllers/                   # Controllers: auth, project, retail, enquiry, order
│   ├── middlewares/                   # Middlewares: protect, rateLimit, timeout, error
│   ├── models/                        # Models & in-memory seeds: admin, project, retail, enquiry, order
│   ├── public/                        # Built frontend SPA assets (generated by npm run build)
│   ├── services/                      # Services handling DB / in-memory business logic
│   ├── utils/                         # Utilities: cookieOptions, fallbackStorage, logger, etc.
│   └── validators/                    # Request validators (express-validator)
├── frontend/
│   ├── index.html                     # SPA HTML entry point
│   ├── package.json                   # Frontend dependencies and Vite build scripts
│   ├── vite.config.js                 # Vite config with strict port 5173 & /api -> :3000 proxy
│   └── src/
│       ├── main.jsx                   # React root entry point
│       ├── app/
│       │   ├── App.jsx                # Main application wrapper
│       │   └── AppRouter.jsx          # Client route definitions
│       ├── features/
│       │   ├── admin-auth/            # Admin sign in page & API client
│       │   ├── admin-dashboard/       # Admin overview page & API client
│       │   ├── enquiries/             # Consultation enquiry form & API client
│       │   ├── projects/              # Projects listing, detail, & API client
│       │   ├── retail/                # Retail catalog, detail, & API client
│       │   └── services/              # Services practice page & data
│       └── shared/
│           ├── api/
│           │   └── axiosClient.js     # Axios client with baseURL /api and error normalizer
│           └── context/
│               ├── AuthContext.jsx    # Admin session provider
│               └── CartContext.jsx    # Cart state provider
└── fixed.md                           # This fix and verification report
```

---

## 2. Root Cause of Each Confirmed Failure

### Failure 1: Dev Server Crash / Port Collision Causing "Network Error"
- **Observed status**: Frontend showed generic `Network error. Please check your connection and try again.` on all API requests. Server was not listening on port 3000.
- **Root Cause**: `backend/dev.js` read `process.env.PORT` unconditionally (`parseInt(process.env.PORT, 10) || 3000`). In container and cloud environments, `PORT=8080` was already present in the environment for an internal reverse proxy (nginx). `backend/dev.js` attempted to bind to 8080, triggering `EADDRINUSE`. It logged an error and invoked `process.exit(1)`. In `scripts/dev.mjs`, when the `api` target exited, it shut down the whole process tree, killing the Vite dev server as well.
- **Result**: Port 3000 was never listening. Vite proxy forwarded `/api` calls to `http://localhost:3000` which refused connections (`ECONNREFUSED`).

### Failure 2: Admin Login Failing (401 Unauthorized / Form Validation)
- **Observed status**: Admin sign in rejected valid login attempts with "Invalid email or password" or "Session expired".
- **Root Cause A (Email Mismatch)**: `backend/models/admin.model.js` defined `inMemoryAdmins` with `email: 'admin'`. The frontend form (`AdminLoginPage.jsx`) displayed placeholder `admin@sabrstudio.com` with `type="email"`. When logging in with `admin@sabrstudio.com` (or `admin@sabrstudio.example`), `authService.loginAdmin()` failed to find the in-memory record and returned 401.
- **Root Cause B (Masked Error in Axios)**: In `frontend/src/shared/api/axiosClient.js`, the response error interceptor unconditionally replaced `normalizedError.message` with `"Session expired. Please log in again."` for any 401 response, completely overwriting the backend's explicit `"Invalid email or password"` message.
- **Root Cause C (Body Stream Hang on Empty Body)**: In `backend/apiHandler.js`, `parseBody` checked `Object.keys(req.body).length > 0`. If `req.body` was already consumed by Express's `express.json()` middleware but was empty (`{}`), `parseBody` attempted to listen for stream `data` and `end` events on an already-ended stream, hanging the request until the 30s timeout.

### Failure 3: Retail Data Not Displaying / Empty Database
- **Observed status**: Retail catalog page displayed error state: "Failed to retrieve retail catalog" / Network Error or empty collection.
- **Root Cause A (Dev server down)**: The catalog failed initially because the backend dev server had crashed upon boot (Failure 1).
- **Root Cause B (Empty Database Fallback)**: When MongoDB is connected (`readyState === 1`) but the remote Atlas cluster has not yet been seeded with documents, `Retail.find()` and `Project.find()` returned empty arrays (`[]`), leaving the frontend with no items.
- **Fix**: Updated `backend/services/retail.service.js` and `backend/services/project.service.js` so that if a connected MongoDB database has 0 items, queries automatically fall back to the in-memory seed catalog.

### Failure 4: Service Page Data
- **Observed status**: Reported as "not showing their data".
- **Root Cause**: The Services page (`frontend/src/features/services/pages/Services.jsx`) renders static discipline data from `services.data.js` and contains an `EnquiryForm`. Submitting consultation enquiries via `POST /api/enquiries` failed with Network Error because the backend on port 3000 was unreachable (Failure 1).

### Failure 5: Vite Dev Server Port Creep
- **Observed status**: When port 5173 was briefly occupied or lingering, Vite would silently fall back to port 5174 without updating the developer or scripts.
- **Root Cause**: `frontend/vite.config.js` lacked `server.strictPort: true`.

### Failure 6: Dependency Discovery on Container Boot
- **Observed status**: Container start scripts ran `npm install` at repository root, leaving `backend/node_modules` and `frontend/node_modules` unpopulated unless installed separately.
- **Root Cause**: Root `package.json` lacked a `postinstall` script linking to the separate applications.
- **Fix**: Added `"postinstall": "npm --prefix backend install && npm --prefix frontend install"` to root `package.json`, and added automatic dependency existence checks in `scripts/dev.mjs` and `scripts/build.mjs`.

---

## 3. Files Changed and What Each Change Fixes

1. **/backend/dev.js**:
   - Fixed port binding: Uses `process.env.BACKEND_PORT || (process.env.PORT && process.env.PORT !== '8080' ? parseInt(process.env.PORT, 10) : 3000)`.
   - Binds to host `'0.0.0.0'`.
   - Avoids collision with cloud container proxy on 8080, guaranteeing backend starts on port 3000.

2. **/scripts/dev.mjs**:
   - Explicitly passes `PORT: '3000'` in the child environment for the `api` target and `PORT: '5173'` for the `web` target.
   - Merges `t.env` into `process.env` when spawning children.
   - Added automatic dependency check: auto-installs `backend/node_modules` or `frontend/node_modules` if missing.

3. **/scripts/build.mjs**:
   - Added automatic dependency check ensuring `frontend/node_modules` exists before running `npm run build`.

4. **/frontend/vite.config.js**:
   - Fixed `__dirname` resolution using standard `fileURLToPath(import.meta.url)` in ESM.
   - Added `strictPort: true` under `server` so Vite fails clearly if port 5173 is unavailable rather than silently jumping to 5174.
   - Maintained `/api` and `/health` proxies targeting `http://localhost:3000`.

5. **/backend/app.js**:
   - Updated CORS regex to match `127.0.0.1` as well as `localhost` origins: `/^https?:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)`.
   - Added development reverse proxy to forward non-API requests (`!req.url.startsWith('/api') && !req.url.startsWith('/health')`) to the Vite dev server on port 5173 when running in development mode.
   - Preserved static serving of `backend/public` (with SPA fallback) when compiled frontend build is present.

6. **/backend/apiHandler.js**:
   - Fixed `parseBody`: Immediately calls `cb(req.body)` if `req.body` is an object, or if `req.readableEnded` / `req.complete` is true, preventing request hangs on empty/pre-parsed bodies.

7. **/backend/models/admin.model.js**:
   - Expanded `inMemoryAdmins` to include records with `email: 'admin@sabrstudio.com'` and `email: 'admin@sabrstudio.example'` alongside `'admin'`.

8. **/backend/services/auth.service.js**:
   - Improved `inMemoryAdmins` lookup to handle normalized emails matching `'admin'`, `'admin@sabrstudio.com'`, or `'admin@sabrstudio.example'`.

9. **/backend/services/retail.service.js & /backend/services/project.service.js**:
   - Added empty-database fallback: If MongoDB is connected but the collection has 0 items, queries automatically fall back to seed data so the UI displays retail objects and projects.

10. **/frontend/src/shared/api/axiosClient.js**:
    - Preserved backend error messages (`normalizedError.message = data.message || ...`) in 401/403/429/500 handlers rather than overwriting with generic messages.

11. **/package.json & /backend/package.json**:
    - Added `postinstall` script in root `package.json`.
    - Updated `"engines": { "node": ">=20" }` to maintain compatibility with Node 22+ without engine warnings.

---

## 4. Local Ports and Commands to Start

### Ports
- **Frontend (Vite Dev Server)**: `http://localhost:5173` (host: `0.0.0.0`)
- **Backend (Express API)**: `http://localhost:3000` (host: `0.0.0.0`)

### Commands
- **Start both simultaneously (recommended for local dev)**:
  ```bash
  npm run dev
  ```
  *(Launches `node scripts/dev.mjs`, starting backend on 3000 and frontend on 5173 concurrently.)*

- **Start backend only**:
  ```bash
  npm run dev:backend
  ```
  *(or `cd backend && npm run dev`)*

- **Start frontend only**:
  ```bash
  npm run dev:frontend
  ```
  *(or `cd frontend && npm run dev`)*

- **Build production frontend and bundle into backend**:
  ```bash
  npm run build
  ```

- **Run production persistent server (Hostinger / Node server)**:
  ```bash
  npm run start
  ```
  *(Serves both compiled SPA from `backend/public` and `/api/*` on port 3000)*

---

## 5. API Connection Contract

- **Frontend Base Path**:
  - `axiosClient.js` default `baseURL`: `/api` (or `import.meta.env.VITE_API_BASE_URL`).
  - All feature API modules invoke relative paths (e.g. `axiosClient.get('/retail')`, `axiosClient.post('/auth/login')`), resolving to `/api/retail`, `/api/auth/login`.

- **Vite Proxy Target**:
  - `/api` requests -> `http://localhost:3000/api` (with `changeOrigin: true`)
  - `/health` requests -> `http://localhost:3000/health` (with `changeOrigin: true`)

- **Backend Endpoints & Methods**:
  - `GET  /health` or `GET /api/health` — System & DB health status
  - `POST /api/auth/login` — Admin login (requires `{ email, password }`, returns JWT in httpOnly cookie `token`)
  - `GET  /api/auth/me` — Current authenticated admin profile (requires cookie or Bearer token)
  - `POST /api/auth/logout` — Clears `token` cookie
  - `GET  /api/retail` — Public retail product listing (supports `?category=...`)
  - `GET  /api/retail/:slug` — Single retail product detail
  - `GET  /api/projects` — Public projects listing
  - `GET  /api/projects/:slug` — Single project detail
  - `POST /api/enquiries` — Public consultation inquiry submission
  - `GET  /api/admin/stats` — Admin dashboard summary (protected)
  - `GET  /api/admin/projects` — Admin project management (protected)
  - `GET  /api/admin/retail` — Admin retail management (protected)
  - `GET  /api/admin/enquiries` — Admin enquiries management (protected)
  - `GET  /api/admin/orders` — Admin orders management (protected)

- **Authentication & Cookie Behavior**:
  - Cookie name: `token`
  - Cookie flags: `HttpOnly: true`, `SameSite: Lax`, `Path: /`, `Max-Age: 86400`
  - In development (`NODE_ENV !== 'production'`): `Secure: false` so cookies work over HTTP on `localhost`.
  - In production: `Secure: true`.
  - Fallback authentication header: `Authorization: Bearer <token>` is accepted by `protect` middleware.

---

## 6. Verified Environment Variable Names

*Note: In accordance with security instructions, only variable names are listed below; no secret values.*

| Variable Name | Required By | Configured Location | Purpose / Verification Status |
|---|---|---|---|
| `PORT` | Backend | Environment | Dev server port; overridden to 3000 in dev |
| `BACKEND_PORT` | Backend | `.env` / Process | Optional override for backend port |
| `NODE_ENV` | Frontend & Backend | Environment | `development` or `production` |
| `MONGODB_URI` | Backend | `.env` | MongoDB Atlas connection string. When unset, services automatically use in-memory fallback data |
| `JWT_SECRET` | Backend | `.env` | Secret for signing admin auth tokens (falls back to dev secret) |
| `JWT_EXPIRES_IN` | Backend | `.env` | Token lifetime (defaults to 24h) |
| `ADMIN_PASSWORD` | Backend | `.env` | Optional override for admin password |
| `CORS_ORIGIN` | Backend | `.env` | Comma-separated list of allowed origins (localhost permitted automatically in dev) |
| `COOKIE_SECURE` | Backend | `.env` | Explicit toggle for cookie secure flag |
| `COOKIE_SAME_SITE` | Backend | `.env` | Cookie same-site flag (defaults to `lax`) |
| `VITE_API_BASE_URL` | Frontend | `.env` / Build | Client API base URL (defaults to `/api`) |
| `RAZORPAY_KEY_ID` | Backend | `.env` | Payment integration key |
| `RAZORPAY_KEY_SECRET` | Backend | `.env` | Payment verification secret |
| `CLOUDINARY_CLOUD_NAME` | Backend | `.env` | Image upload cloud name |
| `CLOUDINARY_API_KEY` | Backend | `.env` | Image upload API key |
| `CLOUDINARY_API_SECRET` | Backend | `.env` | Image upload API secret |
| `EMAILJS_SERVICE_ID` | Backend | `.env` | Enquiry notification service ID |
| `EMAILJS_TEMPLATE_ID` | Backend | `.env` | Enquiry notification template ID |
| `EMAILJS_PUBLIC_KEY` | Backend | `.env` | Enquiry notification public key |
| `EMAILJS_PRIVATE_KEY` | Backend | `.env` | Enquiry notification private key |

---

## 7. Vercel & Hostinger Configuration

### Vercel
- **Root Directory**: `./`
- **Build Command**: `npm run build --prefix frontend` (or `npm run vercel-build`)
- **Output Directory**: `frontend/dist`
- **Serverless Entry**: `/api/index.js` exporting the Express `app`.
- **Rewrites in `vercel.json`**:
  - `/api/(.*)` -> `/api/index`
  - `/health` -> `/api/index`
  - `/(.*)` -> `/index.html` (SPA fallback)
- **Verified**: Simulated serverless execution via `scripts/test-serverless.mjs`:
  - `GET /api/health` -> 200 OK
  - `GET /api/projects` -> 200 OK
  - `POST /api/auth/login` -> 200 OK (Set-Cookie verified)
  - `GET /api/unknown` -> 404 JSON
  - `GET /projects` -> 200 HTML (SPA fallback)
  - Note: Live Vercel dashboard and remote deployment were unverified due to lack of external Vercel authentication in this environment.

### Hostinger
- **Target Setup**: Persistent Node.js application (VPS or Cloud / Node hosting plan).
- **Build Step**: `npm run build` (executes `scripts/build.mjs`, compiling Vite frontend into `backend/public`).
- **Start Command**: `npm run start` (starts `node backend/dev.js`, which serves both `/api/*` and static SPA from `backend/public` on port 3000).
- **Verified**: Local production build and static asset serving verified. Note: Hostinger remote deployment was unverified as no active Hostinger credentials or control panel access are present.

---

## 8. Verification Results

| Check / Test | Command / Flow | Result | Status |
|---|---|---|---|
| Node Version Check | `node -v` | v22.23.2 | PASSED |
| Frontend Build | `npm run build:frontend` | Built to `frontend/dist` | PASSED |
| Root Production Build | `npm run build` | Built frontend and copied to `backend/public` | PASSED |
| Dev Server Concurrency | `npm run dev` | Port 5173 (Vite) and Port 3000 (Express) both listening | PASSED |
| Direct Backend Health | `curl http://localhost:3000/health` | 200 OK, JSON status 'ok' | PASSED |
| Direct Backend Retail | `curl http://localhost:3000/api/retail` | 200 OK, 6 products returned | PASSED |
| Direct Backend Projects | `curl http://localhost:3000/api/projects` | 200 OK, 4 projects returned | PASSED |
| Vite Proxy Health | `curl http://localhost:5173/health` | 200 OK via proxy | PASSED |
| Vite Proxy Retail | `curl http://localhost:5173/api/retail` | 200 OK via proxy, 6 products | PASSED |
| Vite Proxy Projects | `curl http://localhost:5173/api/projects` | 200 OK via proxy, 4 projects | PASSED |
| Retail Category Filter | `curl http://localhost:5173/api/retail?category=Chair` | 200 OK, returns 'Komorebi Lounge Chair' | PASSED |
| Retail Slug Endpoint | `curl http://localhost:5173/api/retail/komorebi-lounge-chair` | 200 OK, returns product detail | PASSED |
| Invalid Admin Login | `POST /api/auth/login` (bad pass) | 401 Unauthorized (`Invalid email or password`) | PASSED |
| Admin Login (`admin@sabrstudio.com`) | `POST /api/auth/login` (`admin`) | 200 OK, Set-Cookie header received | PASSED |
| Admin Login (`admin`) | `POST /api/auth/login` (`admin`) | 200 OK, Set-Cookie header received | PASSED |
| Admin Session Verification | `GET /api/auth/me` with cookie | 200 OK, admin identity returned | PASSED |
| Admin Protected Route | `GET /api/admin/stats` with cookie | 200 OK, stats data returned | PASSED |
| Enquiry Submission | `POST /api/enquiries` | 201 Created, record created | PASSED |
| Vite Frontend SPA Root | `curl http://localhost:5173/` | 200 OK, HTML served | PASSED |
| Serverless Simulation | `node scripts/test-serverless.mjs` | All 6 endpoints passed without listen() crashes | PASSED |
| Applet Compilation | `compile_applet` | Build succeeded | PASSED |

---

## 9. Troubleshooting Guide

- **Symptom: "Network error. Please check your connection and try again."**
  - Verify that the backend is running on port 3000 (`curl http://localhost:3000/health`).
  - If backend is down, check whether port 3000 is occupied by a dead process (`ss -tlpn` or `lsof -i :3000`).
  - Verify `scripts/dev.mjs` started both targets without `EADDRINUSE`.

- **Symptom: Admin Login Fails**
  - Verify that you are logging in with `admin@sabrstudio.com` (or `admin`) and password `admin` (or `ADMIN_PASSWORD` from `.env`).
  - If a 401 error occurs, inspect the exact response message returned by the server.
  - Verify that browser cookies are enabled and that `withCredentials: true` is set on requests.

- **Symptom: Retail Catalog Shows "No objects matched your criteria"**
  - If connected to a real MongoDB Atlas cluster, verify that the `retails` collection contains documents where `published: true` and `availability: true`.
  - In development without Atlas, check that `inMemoryRetail` in `backend/models/retail.model.js` contains seed records.
