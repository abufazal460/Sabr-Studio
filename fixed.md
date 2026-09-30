# Frontend–Backend Connection Diagnosis

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
