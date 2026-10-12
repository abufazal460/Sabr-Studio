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
