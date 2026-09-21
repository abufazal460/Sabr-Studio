# 10-deployment.md — Sabr Studio Production Deployment

Companion to `00-master-context.md` and `01-setup.md` — read both first. This file is the **production deployment execution prompt only**: build/release steps, environment/secret boundary, external-service connectivity, and post-deployment verification. It does not cover feature implementation, schema design, or performance work — those belong to `02-frontend.md`/`03-backend.md`/`04-database.md`/`08-performance-audit.md`.

---

## 1. Role & Objective

You are deploying (or re-deploying) Sabr Studio to production: a **single Hostinger Node.js process** serving both `/api/*` and the built frontend. This is release work only — no new features, routes, or schema changes originate here. Before making any change, **inspect the current deployment configuration** (existing `backend/.env`/`frontend/.env` state, current `backend/public/` contents, server process config, DNS records) — adjust only what's missing or inconsistent with the source documents rather than reconfiguring from scratch.

---

## 2. Source of Truth

Per `00-master-context.md` §3, deployment detail beyond what this file restates lives in `DEPLOYMENT.md` (build/environment/production-topology detail) and, for the build checklist specifically, `DEPLOYMENT.md` §11 — go there for anything this file doesn't cover (exact DNS provider steps, process-manager config, log-retention policy). Do not invent a deployment step not named in `00-master-context.md` §6.11, `01-setup.md`, or `DEPLOYMENT.md`.

---

## 3. Frontend Build

- Build with `vite build` against the approved frontend stack only (`00-master-context.md` §6.1) — no TypeScript artifact, no extra dependency pulled in at build time.
- Output is `frontend/dist/`; it is **copied into `backend/public/`**, never served from a separate host as production (Vercel is preview-only for the frontend, never production — §6.11).
- `frontend/.env` used for the build contains only `VITE_API_BASE_URL` and any other value `TRD.md` explicitly designates public — confirm no secret has been given a `VITE_` prefix before building, since anything with that prefix is baked into the public bundle at build time and cannot be revoked after the fact.

---

## 4. Backend Deployment

- Single Node.js process on the Hostinger server serves both `/api/*` and the static build — never stand up two separately deployed services.
- Install backend production dependencies only from the approved list (`00-master-context.md` §6.1); `nodemon` is dev-only and must not run in production.
- Start command is `node server.js` (or the documented equivalent) after the build order below is complete.
- Build order is fixed (§6.11): install + `vite build` frontend → copy `dist/` into `backend/public/` → install backend production dependencies → `node server.js`. Do not reorder this.

---

## 5. MongoDB Atlas

- Connection is to MongoDB Atlas only — no local Mongo dependency in production (`01-setup.md` §4).
- Confirm the Atlas connection string in `backend/.env` matches the correct cluster/environment (not a dev/staging cluster left over from setup).
- Confirm IP/network access rules on the Atlas cluster permit the production server's egress IP — this is a common silent deployment failure and must be checked, not assumed.

---

## 6. Cloudinary

- Confirm production Cloudinary credentials (not development/sandbox ones, if separate) are in `backend/.env` only.
- Confirm Multer's in-memory-only upload behavior (never local disk) holds in the production environment specifically — some hosts default to writable-but-ephemeral disks that can mask this during testing.

---

## 7. Environment Variables & Secrets

- Two separate env files, one per app, exactly per `01-setup.md` §5 — never a shared root `.env`, never committed.
- `backend/.env`: JWT signing key, MongoDB Atlas URI, Cloudinary secret, Razorpay secret, EmailJS private credential, and any other backend-only value named in `TRD.md`/`SECURITY.md`/`DEPLOYMENT.md`.
- `frontend/.env`: `VITE_API_BASE_URL` and only values `TRD.md` explicitly designates public. **No secret ever gets a `VITE_` prefix.**
- **Never hardcode a secret into source, a config file, a build script, or a deployment platform's UI in plaintext where it would be logged or committed** — secrets are set via the server's environment/secret-management mechanism only.
- **Never expose a private credential** in a response body, log line, error message, client-visible source map, or the frontend bundle. If a build artifact from a prior deployment contains one, treat that as an incident, not a cleanup detail — rotate the credential, don't just remove it going forward.
- Confirm production values differ from any development/example values still sitting in `.env.example` files.

---

## 8. CORS

- Backend CORS configuration permits only the production domain(s) actually serving the frontend — confirm this against whatever `SECURITY.md`/`DEPLOYMENT.md` documents, and do not widen it to `*` "to make testing easier" in production.
- If a Vercel preview URL is used for frontend preview only (§6.11), confirm CORS treats it as a non-production origin per whatever the documented policy is — do not silently grant it the same trust as the production domain without a cited reason.

---

## 9. Domain / DNS

- Confirm the production domain points at the Hostinger server (A/CNAME records as documented), and that no stale record still points at a previous host or the Vercel preview.
- Confirm this is inspected against current DNS state before changing anything — a DNS change is slow to propagate and easy to get wrong twice.

---

## 10. HTTPS

- Confirm the production domain serves over HTTPS with a valid, non-expired certificate — this is a hard prerequisite for `Secure` cookies (§6.5's JWT cookie flag) to function at all.
- Confirm no mixed-content requests (frontend making `http://` calls) remain from a leftover dev config.

---

## 11. SPA Routing

- Confirm the backend's SPA catch-all (serving `index.html` for any non-`/api/*` GET, positioned after all `/api/*` routes and static middleware) is active in production — a missing or misordered catch-all breaks deep-link/refresh support on every non-root public/admin route.
- Confirm `/api/*` routes are never shadowed by the catch-all (route order matters — verify by actually requesting an API path, not by reading the route file alone).

---

## 12. API URLs

- Confirm `frontend/.env`'s `VITE_API_BASE_URL` used in the production build points at the production API origin, not `localhost` or a staging URL.
- Confirm the single `axiosClient` (§6.2) is the only place base-URL configuration lives — no component hardcodes an API origin.

---

## 13. Production Configuration

- Confirm `NODE_ENV` (or the platform's equivalent) is set to production, and that any dev-only behavior (verbose error stacks in responses, `nodemon`, relaxed CORS, disabled rate limiting) is off.
- Confirm `helmet` and `express-rate-limit` are active on the production process, not only in local development.
- Confirm `compression` is used only if the Hostinger platform doesn't already provide response compression (`00-master-context.md` §6.1's pre-approved exception) — check rather than assume either way.
- Confirm `backend/public/` in production actually contains the just-built `frontend/dist/` output and is not stale from a previous deploy.

---

## 14. Logging

- Confirm production logging captures request/error information sufficient to diagnose an incident, without logging secrets, full JWTs, raw payment payloads, or Enquiry personal data (phone/email/message) at a verbosity that turns logs into an unintended second copy of sensitive data.
- Confirm logs are the mechanism used to check for silent failures post-deploy (§16–18 below), not just a passive artifact.

---

## 15. Health Checks & Database Connectivity

- After deployment, actually hit a lightweight endpoint (or `GET /api/auth/me` unauthenticated, expecting a clean 401) to confirm the Node process is up and responding — do not infer health from "the deploy script finished."
- Confirm the backend successfully connects to MongoDB Atlas on production boot by checking startup logs for a real connection confirmation, not just the absence of an immediate crash.

---

## 16. Post-Deployment Functional Verification

These are not optional smoke tests — each must be actually exercised against the live production URL:

- **Admin login**: log in at `/admin/login` with real credentials; confirm the JWT cookie is set `httpOnly`/`Secure`/`SameSite` and that `/api/auth/me` reflects the session; confirm a bad password produces the generic error, not a stack trace.
- **Uploads**: perform one real image upload through the admin Projects or Retail form; confirm the resulting document stores only `{url, publicId}` and the image is reachable at the Cloudinary URL.
- **Enquiries**: submit one real enquiry through `/contact`; confirm it persists to MongoDB and that an EmailJS failure (if simulated) does not block the stored success from being reported to the user; confirm the admin-only enquiry endpoints are unreachable without auth.
- **Public routes**: load `/`, `/projects`, `/projects/:slug`, `/retail`, `/retail/:slug`, `/services`, `/about`, `/contact`, `/cart` directly (not only via in-app navigation) to confirm the SPA catch-all serves each correctly on a hard refresh/deep link.

---

## 17. Rollback

- Before deploying, confirm a rollback path exists: the previous known-good `backend/public/` build and backend release are retrievable (e.g. previous build artifact or git tag/commit), not just "redeploy and hope."
- If any check in §15–16 fails, rollback is the default response — do not attempt a live-patch of a broken production deployment. Roll back, fix in a lower environment, redeploy.
- Confirm rollback itself is verified the same way a forward deploy is (§16) — a rollback that isn't checked is just a second unverified deployment.

---

## 18. Rules

- Follow the documented deployment architecture exactly (§6.11 of `00-master-context.md`, `01-setup.md` §8) — single process, fixed build order, Vercel preview-only. Do not introduce a different topology (e.g. splitting frontend/backend into separate hosted services) to "simplify" deployment.
- **Never hardcode secrets** anywhere in source, build config, or CI/deploy scripts.
- **Never expose private credentials** — in responses, logs, error messages, source maps, or the frontend bundle.
- **Inspect current deployment configuration first** — do not reconfigure environment variables, DNS, or CORS from a blank assumption when an existing production setup already exists.
- **Verify every production dependency after deployment** (Atlas, Cloudinary, Razorpay, EmailJS) — a successful build/deploy script exit code is not verification that any of these actually work in production.
- **Do not declare success without post-deployment checks** (§15–16) actually run and passing.

---

## 19. Deployment Verification Checklist

Report each as **Verified / Not Verified / Unable to Verify**:

1. Frontend built with `vite build`; `dist/` copied into `backend/public/`; build order followed exactly.
2. Backend production dependencies installed from the approved list only; `nodemon` not running in production.
3. MongoDB Atlas: correct production cluster, connection string valid, network access permits the server's IP, startup log confirms connection.
4. Cloudinary: production credentials in place; test upload succeeds; Multer stays in-memory-only.
5. `backend/.env` and `frontend/.env` both correct for production; no secret carries a `VITE_` prefix; no secret hardcoded anywhere.
6. No private credential exposed in responses, logs, error output, source maps, or the frontend bundle.
7. CORS restricted to the actual production domain(s).
8. DNS points at the correct production server; no stale records.
9. HTTPS active with a valid certificate; no mixed-content requests.
10. SPA catch-all correctly serves deep-linked/refreshed routes without shadowing `/api/*`.
11. `VITE_API_BASE_URL` (and the single `axiosClient`) point at the production API origin.
12. `NODE_ENV`/production config confirmed; `helmet`, `express-rate-limit` active; `compression` correctly present/absent per platform behavior.
13. Logging captures diagnosable detail without leaking secrets or Enquiry personal data.
14. Health check and DB-connectivity check both actually hit and confirmed.
15. Admin login, one real upload, one real enquiry submission, and all public routes (via direct/deep link) verified live.
16. A rollback path exists and is confirmed retrievable before declaring the deployment complete.
