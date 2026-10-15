# Sabr Studio — DEPLOY.md

> Production domain: **https://sabrstudio.in**
> Two-command local boot:
> 1. `npm run dev:backend` (Express API on `http://127.0.0.1:3000`)
> 2. `npm run dev:frontend` (Vite on `http://127.0.0.1:5173`, proxies `/api` to the backend)
>
> Only variable **names** are listed here. **No values are ever committed or printed.**

---

## 1. Environment variables

### 1.1 Backend — local development (`backend/.env`)

Copy `backend/.env.example` to `backend/.env` and fill values:

| Section | Variable names |
|---|---|
| Server & Hosting | `PORT`, `NODE_ENV`, `SERVE_FRONTEND` |
| Database & Authentication | `MONGODB_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `ADMIN_PASSWORD`, `ADMIN_EMAIL`, `ADMIN_NAME` |
| Cookies & Domain | `COOKIE_SECURE`, `COOKIE_SAME_SITE`, `CORS_ORIGIN`, `APP_URL`, `EMAILJS_ORIGIN` |
| Cloudinary | `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_SECRET`, `CLOUDINARY_API_KEY` |
| EmailJS | `EMAILJS_SERVICE_ID`, `EMAILJS_TEMPLATE_ID`, `EMAILJS_PUBLIC_KEY`, `EMAILJS_PRIVATE_KEY` |
| Razorpay | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` |
| Google Login | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |
| Twilio OTP | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` |

Local defaults (from `backend/.env.example`): `PORT=3000`, `NODE_ENV=development`,
`SERVE_FRONTEND=true`, `JWT_EXPIRES_IN=7d`, `ADMIN_NAME=sabrstudio`, `COOKIE_SECURE=false`,
`COOKIE_SAME_SITE=lax`, `CORS_ORIGIN=http://localhost:5173`, `APP_URL=http://localhost:5173`,
`EMAILJS_ORIGIN=http://localhost:5173`. Secrets are intentionally blank in the example.

### 1.2 Backend — production (Vercel or Hostinger, set as environment secrets)

Use the **same names** with production values: `NODE_ENV=production`; host-injected `PORT`;
`SERVE_FRONTEND=true` only when the same Node process serves the Vite build; production
`MONGODB_URI`; strong random `JWT_SECRET` (≥ 32 chars); `JWT_EXPIRES_IN=7d`; a unique strong
`ADMIN_PASSWORD` (never the example value); valid `ADMIN_EMAIL`; `ADMIN_NAME=sabrstudio`;
`COOKIE_SECURE=true`; `COOKIE_SAME_SITE=lax`;
`CORS_ORIGIN=https://sabrstudio.in,https://www.sabrstudio.in`; `APP_URL=https://sabrstudio.in`;
`EMAILJS_ORIGIN=https://sabrstudio.in`; actual `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_SECRET`,
`CLOUDINARY_API_KEY`; actual `EMAILJS_SERVICE_ID`, `EMAILJS_TEMPLATE_ID`, `EMAILJS_PUBLIC_KEY`,
`EMAILJS_PRIVATE_KEY`; production `RAZORPAY_KEY_ID` + `RAZORPAY_KEY_SECRET` + actual
`RAZORPAY_WEBHOOK_SECRET`; actual `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET`; actual
`TWILIO_ACCOUNT_SID` + `TWILIO_AUTH_TOKEN` + authorised `TWILIO_FROM_NUMBER`.

### 1.3 Frontend (`frontend/.env`)

Exactly **one** variable (see `frontend/.env.example`): `VITE_API_BASE_URL=/api`.
Do **not** add others — the Razorpay key ID comes from the backend checkout response, Google
login uses the backend flow, and all third-party secrets stay server-side.

### 1.4 Optional observability

`LOG_LEVEL` overrides the pino level (`debug` local, `info` production). `SENTRY_DSN` enables
Sentry error reporting and is **off when unset** (install `@sentry/node` + `@sentry/integrations`
to activate).

---

## 2. Vercel project settings

Framework preset: Other (framework null). Install command:
`npm install --prefix backend && npm install --prefix frontend`. Build command:
`npm run build --prefix frontend`. Output directory: `frontend/dist`. Rewrites (see
`vercel.json`): `/api/(.*)` → `/api/index`, `/health` → `/api/index`, SPA fallback `/(.*)` →
`/index.html`. Static cache (`public, max-age=31536000, immutable`) on `/assets/*`,
`/og-images/*`, `/icons/*`; HTML (`public, max-age=0, must-revalidate`) elsewhere.

Steps by hand: create/import the project from the `fazal` branch; add every production variable
in §1.2 as an Environment Variable (Production scope); attach `sabrstudio.in` (and
`www.sabrstudio.in`) and confirm DNS + TLS; deploy. Pull-request builds run the `SabrStudio CI`
workflow (lint, build, tests, route harness).

---

## 3. MongoDB Atlas — manual steps

Do these by hand in the Atlas dashboard: provision the production cluster; allow the application
egress IPs only in Network Access; create a least-privilege app user and store the password only
as the production `MONGODB_URI` secret; enable automated backups (continuous/cloud snapshots);
confirm the point-in-time restore window (24h+) and note it; run
`node scripts/sync-indexes.mjs` against Atlas after first deploy so the `idempotencyKey` unique
sparse index and order/status composite indexes exist.

### 3.1 Restore drill (perform, then record date + result here)

Restore the latest production snapshot to a **new staging cluster** (never into production).
Point a staging app copy at it and check: admin dashboard loads, one recent order and its line
items render, one product and one project render. Run
`BASE_URL=<staging-url> npm run test:routes` and expect matches. Record:
`restore-drill: <date> — <pass/fail + notes>`.

---

## 4. Rollback on Vercel

Vercel dashboard → project → **Deployments** → last known-good **Production** deployment →
**Promote to Production**. Verify `GET https://sabrstudio.in/api/health` returns `200` with
`success: true`. For data-related incidents, do **not** restore a backup into production without
the §5 checklist and a written reason.

---

## 5. Post-deploy smoke checklist (`BASE_URL=https://sabrstudio.in`)

```bash
BASE_URL=https://sabrstudio.in npm run test:prod
```

Then by hand: `GET /api/health` → `200`, `database: connected`; homepage, one project and one
retail page render with images; admin login works at `/admin` while unauthenticated
`/api/admin/orders` returns `401`; a test customer registers, checks out once, sees the order
under “My orders”, and a second customer cannot open it (`403`); an admin image upload returns
`201` with a real `url` + `publicId` (never a placeholder); a contact enquiry is saved and email
failure keeps the record with `success: false`; forcing one error (e.g. an invalid order ID)
emits **one** structured JSON log line with a `reqId` and **no** secret, password, token, OTP,
card, or full payment payload.
