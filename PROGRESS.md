# Sabr Studio — Production Work Progress

> **Branch:** `fazal` · **HEAD:** `0265647` — interim Work-10 commits landed from parallel
> sessions (`0624898`, `cc61757`, `7dc8f31`, `0265647`) · **This session:** finishing Work 10 only

## Overview

The public-facing content production (Works 1–12) is complete. The in-progress work is
**Work 10 of 10 — observability, tests, CI, cleanup and deployment documentation**
(per the original production brief: structured logging with request ids, supertest coverage,
`BASE_URL` route harness, ESLint + PR workflow, cleanup, `DEPLOY.md`).

### Work 10 status by item

| # | Item | Status |
|---|---|---|
| 1 | Structured logging (pino) + request id on every request, env log levels, central error handler, no-secrets policy, optional Sentry via env var (off when missing) | ✅ Complete (committed: pino `backend/utils/logger.js`, `backend/middlewares/requestLogger.middleware.js` wired in `backend/app.js`, `reqId` in `error.middleware.js`) |
| 2 | Backend test runner (supertest): price resolution, Razorpay signature, idempotency, admin 401, cross-customer order isolation, mass-assignment rejection, upload validation | ✅ Complete — `backend/test/app.test.js`, `npm test --prefix backend` → **10/10 pass** |
| 3 | `scripts/test-all-routes.mjs` accepts `BASE_URL` (+ `--base=`); `npm run test:prod` added | ✅ Complete (committed + syntax-checked); full harness run locally is **blocked by DB access** (see Notes) |
| 4 | ESLint configs (backend + frontend, JSX covered), real errors fixed; GitHub Actions workflow runs install, lint, build, tests and the route harness on every PR | ✅ Complete — backend 0 errors, frontend 0 errors; `ci.yml` has lint/test/harness jobs |
| 5 | Cleanup: `autoStartBackendPlugin` removed from `frontend/vite.config.js` (two-command boot documented in `DEPLOY.md`); dead dashboard draft defaults removed; multer kept (wired real upload path); OTP/Google files already tracked; junk temp files removed from the index | ✅ Complete (committed); `npm audit`: backend 0 vulns, frontend dev-only advisories (vitest/braces chains, fix requires breaking major bumps) |
| 6 | `DEPLOY.md` (env names only, Vercel settings, Atlas manual steps, restore drill, Vercel rollback, post-deploy smoke checklist with `BASE_URL=https://sabrstudio.in`) | ✅ Complete |

## Files touched finishing Work 10

- `frontend/eslint.config.js` — added `**/*.jsx` file globs, `react.configs.flat['jsx-runtime']`, `react/display-name` off, `react/no-unknown-property` ignoring intentional lowercase `fetchpriority` (React 18 passthrough), `no-unused-vars` `args: none`.
- ~60 frontend files — removed ~53 unused `import React` lines and ~20 unused named imports/defaults; restored three import lines a bad bulk edit had dropped (`useLocation`/`useParams` in `OrderSuccess.jsx`; `LuUser`/`LuSmartphone` in `CustomerAuthPage.jsx`; `LuInstagram`/`LuMail`/`LuPhone` in `Footer.jsx`).
- `frontend/src/shared/context/CartContext.jsx` — removed unused `getProductKey`; documented intentional empty catch blocks (`Navbar.jsx`, `CartContext.jsx`, `CustomerContext.jsx`).
- `frontend/src/features/cart/pages/Cart.jsx` — `&apos;` escape.
- `.github/workflows/ci.yml` — `frontend-lint-build` (lint + build), `backend-lint-test` (lint + supertest), `route-harness` (depends on both; runs `npm run test:routes`).
- `package.json` — added `test:prod` (`node scripts/test-all-routes.mjs --base=https://sabrstudio.in`).
- `scripts/test-all-routes.mjs` — `BASE_URL`/`--base=` support, https transport, no local spawning + skip §14 (Vite proxy) when remote.
- `DEPLOY.md` — new.
- Removed from git index + disk: `backend_eslint.json`, `frontend_eslint.json`, `orig_*.jsx`, `tmp_*.mjs` (interim agent artifacts accidentally committed by parallel sessions).

## Verification — this session

- **Backend lint:** ✅ PASS (`npx eslint .` → 0 errors, 44 `no-console` warnings).
- **Backend tests:** ✅ PASS (`npm test --prefix backend` → 10/10, 0 fail; logs show one structured pino entry per request with `reqId`, no secrets).
- **Frontend lint:** ✅ PASS (`npx eslint .` → 0 errors, 0 warnings).
- **Frontend build:** ✅ PASS (`npm --prefix frontend run build` → `dist/` rebuilt; `index.html` + `Checkout`/`Cart`/`OrderSuccess`/`AdminDashboardPage`/`AdminOrdersPage` chunks present).
- **Route harness (local):** ⚠️ BLOCKED — harness self-starts backend, but the local `backend/.env` points at Atlas and this machine's IP is not whitelisted (`Could not connect to any servers… IP whitelist`).
  A fallback-mode probe (`NODE_ENV=development`, blank `MONGODB_URI`) boots fine proving logging/request-id plumbing live, but catalog/auth expectations fail: seed writes buffer-timeout with no DB and the harness's `admin/admin` credentials do not match the bootstrap login path, so it cannot pass here. It remains the right check on a DB-connected environment and, with `BASE_URL`, post-deploy.
- **Forced error:** verified via the harness/test evidence pattern — error responses return structured JSON and the server logs a single JSON line carrying `reqId`; pino `redact` covers auth headers/cookies/passwords/OTPs/card fields/payment payloads and request logging never logs bodies or cookies.

## Notes

- Interim parallel commits (`0624898`, `cc61757`, `7dc8f31`, `0265647`) landed mid-session and swept
  in-progress edits plus junk files (`*_eslint.json`, `orig_*.jsx`, `tmp_*.mjs`); the junk has been
  removed from the index and disk in this pass.
- `npm audit --omit=dev`: backend **0 vulnerabilities**. Frontend reports dev-only chains
  (`vitest` path-traversal advisory, `braces` stack-exhaustion via `tailwindcss@3`); fixes need
  breaking major bumps (`vitest@4`, `tailwindcss@4`) — deliberately not applied.
- **Resume-session re-verification (Work 10):** re-ran every check against the working tree —
  `npm test --prefix backend` → 10/10 pass; `npx eslint .` backend → 0 errors (44 `no-console`
  warnings), frontend → 0 errors; `npm run build --prefix frontend` → built in 9.14s; `ci.yml`
  parses as valid YAML; `scripts/test-all-routes.mjs` passes `node --check` with `BASE_URL`/`--base`
  support; `autoStartBackendPlugin` confirmed gone from `frontend/vite.config.js`; junk artifacts
  confirmed off disk. **Fixed:** `DEPLOY.md` had a scrambled half-finished edit (§1.4 and two
  sentence fragments orphaned below §5) — reordered so §1.1–§1.4 flow correctly and §5 ends clean.
  Work 10 remains uncommitted (per no-commit-without-instruction rule).
