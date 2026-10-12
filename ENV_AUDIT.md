# SabrStudio — Environment Variables & Production Configuration Audit

> Date: 2026-10-12 · Branch: `main` · No real secrets read, printed, or committed.
> Local `.env` files listed by KEY NAME only. Full method + evidence in §1–§9 below.
> Counts: **35** backend keys, **2 real + 1 unused** frontend keys, **0 missing** after fix, **0 leaks**.

## 1. Scope & files inspected

Backend: `app.js`, `server.js`, `dev.js`, `hostinger.cjs`, `apiHandler.js`,
`config/db.js`, `middlewares/*`, `services/{auth,customer,emailjs,razorpay,order,
enquiry,google,otp}.service.js`, `controllers/*`, `utils/{cookieOptions,
fallbackStorage,seedDevelopmentData,logger,envCheck}.js`, `models/*`.
Frontend: `axiosClient.js`, `AuthModal.jsx`, `checkout.api.js`, `Checkout.jsx`,
`vite.config.js`, package scripts. Config: root/backend/frontend `package.json`,
`scripts/*`, `vercel.json`, `api/index.js`, all `.gitignore`, both `.env.example`.
No `.github/workflows` exist (verified absent).

## 2. Inventory (verified)

| Variable | Scope | Required? | Build/Run | Secret? | Prod source |
|---|---|---|---|---|---|
| `NODE_ENV` | backend+host | Required | runtime | config | Hostinger `production`; Vercel auto; local `development` |
| `PORT` | backend+host | Required | runtime | config | Hostinger injects — never hardcode (default 3000) |
| `BACKEND_PORT`/`HOST` | backend | optional | runtime | config | local overrides; HOST unset = all interfaces |
| `SERVE_FRONTEND` | backend+host | Required (Hostinger) | runtime | config | Hostinger `true`; Vercel forced false |
| `MONGODB_URI` | backend | Required (prod) | runtime | **secret** | Atlas → Connect → Node URI |
| `JWT_SECRET` | backend | Required (prod) | runtime | **secret** | `openssl rand -base64 48` → Hostinger+Vercel |
| `JWT_EXPIRES_IN` | backend | optional | runtime | config | e.g. `24h` (admin `24h` / customer `30d` defaults) |
| `ADMIN_PASSWORD` | backend | Required (prod first-run) | runtime | **secret** | operator secret → Hostinger only |
| `ADMIN_EMAIL`/`ADMIN_NAME` | backend | optional | runtime | config | bootstrap identity (were undocumented — now added) |
| `COOKIE_SECURE`/`COOKIE_SAME_SITE` | backend | optional | runtime | config | `true`/`lax` on Hostinger (auto-secure in prod) |
| `CORS_ORIGIN` | backend | Required (prod) | runtime | config | `https://sabrstudio.in` (+ previews, comma-separated) |
| `APP_URL`/`EMAILJS_ORIGIN` | backend | Required (Hostinger) | runtime | public URL | `https://sabrstudio.in` (were undocumented — now added) |
| `RAZORPAY_KEY_ID` (+`_SECRET`, `RAZORPAY_WEBHOOK_SECRET`) | backend | conditional (checkout) | runtime | id public / secrets secret | Razorpay Dashboard → API Keys / Webhooks |
| `GOOGLE_CLIENT_ID` | backend | conditional (Google login) | runtime | public id, server-held | Google Cloud Console OAuth client |
| `TWILIO_ACCOUNT_SID`/`_AUTH_TOKEN`/`_FROM_NUMBER` | backend | conditional (OTP) | runtime | secrets | Twilio Console |
| `CLOUDINARY_CLOUD_NAME`/`_API_KEY`/`_API_SECRET` | backend | conditional (uploads) | runtime | secret(s) | Cloudinary Dashboard |
| `EMAILJS_SERVICE_ID`/`_TEMPLATE_ID`/`_PUBLIC_KEY`/`_PRIVATE_KEY` | backend | conditional (mail) | runtime | secrets | EmailJS Dashboard |
| `FALLBACK_DIR` | backend | optional/dev | runtime | config | local override (`/tmp` on serverless) |
| `VERCEL`/`VERCEL_URL`/`AWS_LAMBDA_FUNCTION_NAME` | hosting | hosting-set | runtime | config | auto-set by platforms |
| `VITE_API_BASE_URL` | frontend | Required | **build** | **public** | keep `/api` (same-domain) |
| `VITE_GOOGLE_CLIENT_ID` | frontend | conditional | **build** | **public** | same value as backend (empty hides button) |
| `VITE_RAZORPAY_KEY_ID` | frontend example | **unused** (nothing reads it) | n/a | public | leave empty; server returns `keyId` per checkout |

Startup chain verified: `hostinger.cjs` → `server.js` (dotenv, NODE_ENV default,

## 3. Exact counts (computed, not estimated)

- Backend `process.env.*` keys in code: **35** (incl. auto `npm_package_version`).
- Frontend `VITE_*` read by source: **2 real** + **1 documented-but-unread**.
- Missing from `backend/.env.example` before fix: **4** (`ADMIN_EMAIL`,
  `ADMIN_NAME`, `APP_URL`, `EMAILJS_ORIGIN`) → now **0 missing (31/31 present)**.
- Missing from `frontend/.env.example`: **0** (`VITE_GOOGLE_CLIENT_ID` already present).
- Documented but unused: **1** (`VITE_RAZORPAY_KEY_ID`, now annotated).
- Duplicated/invalid names: **0** (`CORS_ORIGIN` singular everywhere; plural only in prose docs).
- Secrets in tracked files: **0 hits**. Real `.env` files tracked: **0** (both ignored).

## 4. Example-file changes

- `backend/.env.example`: +`ADMIN_EMAIL`/`ADMIN_NAME` (commented bootstrap-only),
  +`APP_URL`/`EMAILJS_ORIGIN` section (Hostinger Origin fix). 31/31 keys covered.
- `frontend/.env.example`: `VITE_RAZORPAY_KEY_ID` annotated verified-unused
  (server returns `keyId` per checkout; Checkout.jsx never reads the env var).

## 5. Runtime defects fixed (verified in code)

1. **EmailJS `EMAILJS_INVALID_SERVICE_OR_TEMPLATE`** — key NAMES (service/template
   IDs), not payload: params `{name, phone, email, projectType, message, subject,
   reply_to}` already match; record is saved BEFORE send, failure preserves it
   (`emailStatus:'failed'`) + throws → 502/503, never false success.
2. **Hostinger EmailJS 403 risk** — Origin chain ended at hardcoded Vercel URL;
   `APP_URL` (`https://sabrstudio.in`) added to chain; warn when both blank.
3. **Prod boot without JWT_SECRET** — threw only on first login; now `envCheck()`
   fails fast at boot (prod only, names keys, rejects placeholders, never prints values).

## 6. Validation added

- `backend/utils/envCheck.js` (new) + `checkEnv()` in `server.js` pre-listen.
  Prod: fatal on `JWT_SECRET`; warn on `MONGODB_URI`/`CORS_ORIGIN`/
  `ADMIN_PASSWORD`/`APP_URL`+`EMAILJS_ORIGIN`/bad durations+URLs/partial groups.
  Dev never fails. `scripts/check-env-leaks.mjs` (new): tracked-file scan,
  file:line only, exit 1 on hit.

## 7. Verification (actual runs 2026-10-12)

| Check | Result |
|---|---|
| `node --check` envCheck.js + server.js | PASS |
| backend example 31/31 | ALL-PRESENT |
| leak scan full repo | PASS, 0 hits |
| envCheck prod w/o JWT_SECRET | EXPECTED-FAIL (key named, value hidden) |
| envCheck dev w/o everything | DEV-PASS-OK |
| Hostinger smoke 7/7 | PASS (`/`+`/admin/login`=HTML, `/api/health`=`{status:ok}`, `/health`=JSON, `/assets/*.js`=200) |
| Enquiry POST w/o EmailJS (dev, no DB) | 503 `DB_UNAVAILABLE` (fail-safe precedes email gate — correct) |
| `npm run test:routes` / `vite build` / live EmailJS-Razorpay-Twilio-Cloudinary-Google | NOT RUN — need live servers/creds (not claimed) |

## 8. Manual actions (dashboards)

Hostinger env: `NODE_ENV=production`, `SERVE_FRONTEND=true`,
`MONGODB_URI=<atlas-uri>`, `JWT_SECRET=<rand-base64-48>`,
`CORS_ORIGIN=https://sabrstudio.in`, `APP_URL=https://sabrstudio.in`,
`ADMIN_PASSWORD=<secret>` (first deploy), `COOKIE_SECURE=true`. Per feature:
Razorpay pair+webhook secret, EmailJS four, Cloudinary three, Twilio three,
`GOOGLE_CLIENT_ID`. Build env: `VITE_API_BASE_URL=/api`,
`VITE_GOOGLE_CLIENT_ID=<same>` (omit hides button). Vercel: mirror keys (it sets
`VERCEL*` itself). Unverifiable w/o dashboards: EmailJS IDs/key (the INVALID
error), Razorpay live keys, Cloudinary/Twilio/Google creds, Atlas URI/IP-allowlist.

## 9. Limitations

Route suite needs live dev servers + seeded DB; frontend build untouched
(`dist` present, smoke serves it); third-party delivery unverified w/o creds;
dev-permissive paths (mock orders, simulated signatures, in-memory) remain by
design and fail closed in prod.

`checkEnv()`, `connectDB()`, `listen(PORT)`) → `app.js` (SPA → `/health` →
`/api` fail-safe → apiHandler → SPA fallback → 404). Axios `baseURL =
VITE_API_BASE_URL || '/api'`, `withCredentials:true`.
