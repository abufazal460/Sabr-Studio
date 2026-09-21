# 07-security-audit.md — Sabr Studio Security Audit

Companion to `00-master-context.md` (full source hierarchy, conflict-resolution table, security-relevant requirements) and `01-setup.md` (repo shape, env/secret boundary, approved dependency lists). This is a **review-and-report prompt, not an implementation prompt**: its job is to find where the existing codebase deviates from the security posture already specified in those two files, and to fix only what's confirmed broken. It does not introduce new security mechanisms beyond what `00-master-context.md` already requires.

---

## 1. Role & Objective

You are conducting a full-codebase security audit of Sabr Studio against the security requirements already documented in `00-master-context.md` and the environment/secret boundary in `01-setup.md`. Inspect the actual repository state before reporting anything — every finding must trace to code you actually read, not to an assumption about what the stack "probably" does.

---

## 2. Source of Truth

`00-master-context.md` §3 hierarchy applies: `PRD.md` → `TRD.md` → `ARCHITECTURE.md` → `DATABASE.md` → `API.md` → `SECURITY.md` → `DEPLOYMENT.md` → `CODING-RULES.md`/`AI-RULES.md` → existing repo → current task. This audit measures the repo against that hierarchy's security-relevant clauses (Master Context §6.4–§6.8, §6.11, §7, §9.3) and `01-setup.md`'s env/secret rules (§5). Where a check needs exact detail neither file restates (precise CSP source list, exact rate-limit numbers, dependency-pinning policy), say so explicitly rather than inventing a threshold to audit against.

---

## 3. Method

1. **Inspect before reporting.** Read the actual route/controller/middleware/model/config files involved before writing a finding — do not infer behavior from file names or from what a well-built app "should" do.
2. **Ground every finding in the source documents.** Cite the Master Context / `01-setup.md` clause a piece of code violates. If something looks risky but isn't actually contradicted by a documented requirement, note it as an observation, not a finding — do not report a plausible-sounding issue that isn't actually supported by what you read.
3. **Fix only confirmed issues**, and only the issue itself — no drive-by refactors, renames, or dependency bumps, and no change to unrelated working behavior (Master Context §7, §9.3).
4. **Never weaken an existing control while investigating it** — e.g., don't temporarily disable rate-limiting or a validator to "see what happens" and leave it disabled.
5. **Extra caution before touching**: `middleware/auth.middleware.js` (`protect`), `services/checkout.service.js`, any `.env` naming, the `Order` schema's embedded-snapshot design (Master Context §7, §9.3) — read twice before editing any of these.

---

## 4. Finding Format (mandatory, one block per finding)

```
Severity: Critical / High / Medium / Low / Informational
Location: <file path + line/function, or endpoint>
Issue: <what's actually wrong, in one or two sentences>
Impact: <what an attacker could actually do with it>
Fix: <the minimal correct change, referencing the governing doc clause>
Verification: <the exact check that confirms the fix — a request you sent, a log you inspected, a test you ran>
```

No finding is reported without all six fields. "Verification" must describe a check actually performed after the fix, not a check that "should" be performed.

---

## 5. Audit Checklist

### 5.1 Authentication & Authorization
- Confirm the **only** auth mechanism present is admin-only, JWT-in-`httpOnly`-cookie, bcrypt-hashed (Master Context §6.5) — flag any second auth path, any visitor/customer login, or any token accepted from a header/body/query param.
- Confirm every `/api/admin/*` route actually passes through the `protect` middleware — check the router files directly, don't assume from naming.
- Confirm invalid-login responses are generic and don't distinguish "no such account" from "wrong password."
- Confirm no role/permission system beyond the single `admin` role exists (§6.5) — flag any unused/half-built role scaffolding as unnecessary attack surface, not just as scope creep.

### 5.2 Admin Access & IDOR
- Confirm no admin endpoint can be reached without the JWT check by testing a direct request with no cookie and with a cookie for a different/invalid subject.
- Confirm admin CRUD/detail endpoints scope correctly to the requested resource ID and don't leak another record via a predictable ID pattern, missing existence check, or an unfiltered query — check `orders`, `enquiries`, `projects`, `retail` detail/update/delete handlers specifically.
- Confirm `PATCH /api/admin/orders/:id/status` cannot be made to alter `paymentStatus` under any payload shape (Master Context §6.4/§6.6).

### 5.3 Passwords
- Confirm bcrypt is used, at a standard (not reduced) cost factor, and plaintext passwords are never logged, cached, or persisted anywhere (Master Context §6.4/§6.5).
- Confirm `Admin.password` has `select: false` and is not accidentally returned by any query that doesn't explicitly opt in for the login lookup.

### 5.4 Sessions & Tokens
- Confirm the JWT payload contains only admin ID + role (§6.5) — flag any additional PII in the payload.
- Confirm token expiry is set (not indefinite) and check what the actual configured value is against whatever `TRD.md`/`SECURITY.md` specifies, where available — flag an unbounded or clearly excessive expiry.
- Confirm no refresh-token endpoint or session-store mechanism exists beyond what's documented (§6.3 lists only login/me/logout).
- Confirm the signing secret is read from `backend/.env` only, never hardcoded (`01-setup.md` §5).

### 5.5 Cookies
- Confirm the auth cookie is set with `httpOnly`, `Secure` in production, and an explicit `SameSite` attribute — flag any cookie missing these, and any secondary cookie that carries sensitive data without the same flags.
- Confirm logout actually clears the cookie with matching name/path/domain/`SameSite` attributes (a mismatched `clearCookie` call is a common false "logout").

### 5.6 CORS
- Confirm `cors()` is configured with an explicit allow-list of the deployed frontend origin(s), not a wildcard, especially given `withCredentials`/cookie-based auth is in use — a wildcard origin combined with credentialed requests is a direct finding.
- Confirm no route bypasses the global CORS config with its own permissive header.

### 5.7 CSRF (where relevant)
- Because auth is cookie-based, confirm state-changing admin endpoints (`POST`/`PUT`/`PATCH`/`DELETE` under `/api/admin/*`, plus `POST /api/checkout`) are protected against cross-site request forgery — via `SameSite` cookie policy being sufficiently strict, and/or any CSRF-token mechanism already present. Do not introduce a new CSRF-token library or flow if none is documented; report the gap as a finding and reference `SECURITY.md` for the intended control rather than inventing one.

### 5.8 XSS
- Confirm no backend response reflects unsanitized user input into an HTML/script context (relevant mainly if any server-rendered content exists beyond the SPA catch-all serving `index.html`).
- Confirm `helmet()`'s protections are active and not disabled anywhere.
- Note: primary XSS surface is frontend rendering, out of scope for this backend-focused audit file — flag it back if found, but the fix belongs to the frontend prompt.

### 5.9 NoSQL Injection & Query Safety
- Confirm all Mongoose queries build filters from validated/typed input, not raw pass-through of `req.query`/`req.body` objects into a `find()`/`findOne()` call — a raw object spread into a Mongo query is a NoSQL-injection vector (`$where`, operator injection via `{ "$ne": null }`-style payloads).
- Confirm `express-validator` runs on every input-accepting endpoint before it reaches a service/model layer (Master Context §6.2, §7).

### 5.10 Validation
- Confirm client-side validation is never treated as sufficient — every endpoint independently re-validates via `express-validator` regardless of frontend checks.
- Confirm the Enquiry endpoint enforces `email` as required (C4) and does not persist a `projectType` field (C5) — both are documented, binding resolutions in Master Context §4.

### 5.11 Uploads & Cloudinary
- Confirm Multer is configured for **in-memory storage**, never disk, in production, and that file type/size/count are validated before any Cloudinary call (Master Context §6.8).
- Confirm MongoDB stores only `{url, publicId}` — flag any path that persists raw binary or an unvalidated URL.
- Confirm deleting a Project/Retail document actually triggers (or reliably queues) the Cloudinary `destroy` call for its `publicId` — flag orphaned-asset risk if delete order allows the Mongo doc to vanish without the Cloudinary cleanup being attempted.
- Confirm Cloudinary credentials are backend-only, never reachable from the frontend bundle.

### 5.12 Rate Limiting & Brute Force
- Confirm `POST /api/auth/login`, `POST /api/enquiries`, `POST /api/checkout`, and `POST /api/checkout/verify` are all rate-limited (Master Context §6.3) — check the actual middleware wiring on each route, not just its presence somewhere in the codebase.
- Confirm no route disables or bypasses rate-limiting for convenience (e.g., a dev-only bypass flag left active).
- Confirm the login endpoint's throttling is the sole documented brute-force control — flag if it's missing or set so loosely it provides no practical protection, without inventing a specific "correct" number the source docs don't specify.

### 5.13 Secrets & Environment Variables
- Confirm no secret (JWT signing key, DB credentials, Razorpay secret, Cloudinary secret, EmailJS private credential) is hardcoded in source, committed in a real `.env` file, or checked into version control (`01-setup.md` §5).
- Confirm no secret-bearing variable uses a `VITE_` prefix or otherwise ends up in the frontend bundle.
- Confirm `.gitignore` actually excludes real `.env` files, `node_modules/`, and `backend/public/` — check the file itself, don't assume.

### 5.14 Security Headers
- Confirm `helmet()` is applied globally and early in the middleware chain, not conditionally skipped on any route.
- Confirm the middleware order doesn't place the SPA catch-all or static serving ahead of security middleware.

### 5.15 Error Leakage
- Confirm the centralized error handler never returns a raw stack trace, a Mongoose/JWT-library-specific error string, or internal file paths to the client — especially check behavior when `NODE_ENV` is not explicitly `production` in the deployed environment.
- Confirm generic messages are used for auth failures (§5.1) and 500-level errors alike.

### 5.16 Sensitive Data Exposure
- Confirm no response body (including admin list/detail endpoints) ever includes a password hash, JWT secret, or other credential.
- Confirm `Enquiry` documents are never reachable via any public `GET` endpoint (Master Context §6.4).
- Confirm logs don't capture tokens, passwords, or full request bodies for sensitive endpoints.

### 5.17 Dependencies
- Confirm every package in `backend/package.json` and `frontend/package.json` is on the approved list (`01-setup.md` §3/Master Context §6.1) — flag anything extra, including transitive risk from an unapproved direct dependency.
- Note any dependency with a known high/critical vulnerability if that information is available to you, but do not fabricate a CVE or version claim you haven't actually verified against the installed version.

### 5.18 Database & API Exposure
- Confirm required indexes exist as documented (unique `slug`, `{published, category}`/`{published, availability}`, `{status, createdAt:-1}`, `{paymentStatus, orderStatus}`, unique `email`) — a missing unique index on `slug`/`email` is itself a data-integrity/security finding, not just a performance one.
- Confirm the MongoDB Atlas connection isn't reachable with overly permissive network access rules, to the extent that's inspectable from the repo/config (connection string, IP allow-list references) rather than requiring live infrastructure access you don't have.
- Confirm no endpoint exists outside the documented API contract (Master Context §6.3) — an undocumented route is itself unaudited surface area.

### 5.19 Production Configuration
- Confirm `NODE_ENV=production` actually gates `Secure` cookies and suppresses verbose errors in the deployed configuration, not just in local reasoning about the code.
- Confirm the single-process topology is intact — no accidental second exposed port/service, no dev-only middleware (`nodemon`, verbose request logging of sensitive routes) active in production.
- Confirm `backend/public/` is genuinely generated-only and not hand-edited with anything that could reintroduce a security gap (e.g., a stale build exposing an old, unpatched frontend).

---

## 6. Constraints

- Every finding must be traceable to actual inspected code and an actual clause in `00-master-context.md`/`01-setup.md` (or an explicitly named gap where those documents defer to `SECURITY.md`/`TRD.md` for exact values).
- Do not report a theoretical or generic "best practice" issue as a vulnerability if it isn't actually contradicted by the documented design — note it as an observation instead, clearly separated from findings.
- Do not weaken, disable, or bypass any existing control while investigating it, even temporarily.
- Do not fix anything beyond the confirmed issue itself — no unrelated refactors, renames, or dependency bumps riding along with a security fix.
- Do not silently resolve a Section 4 conflict differently from its stated resolution while auditing code that touches it (C1, C4, C5 are the ones with backend/API surface).
- Do not invent a specific numeric threshold (rate-limit count, token expiry, cost factor) as "the correct value" where the source docs leave it `TBD` — report the absence of a defined value as a finding in itself, with a recommendation to define one, rather than asserting a fabricated number as the standard.

---

## 7. Reporting & Completion Criteria

Deliver:
1. A finding block (§4 format) for every confirmed issue, grouped by the §5 checklist section it falls under.
2. A short list of Observations (non-findings — plausible-sounding but not actually contradicted by the source docs) kept clearly separate from Findings.
3. For every finding you also fixed: the diff/change made, plus the Verification step actually executed after the fix (not just described).
4. For any check you could not perform (no access to live infra, no ability to run the app, a document you can't inspect), an explicit **Unable to Verify** entry rather than a guessed result.

This audit is complete only when:
- Every checklist item in §5 has been inspected against actual code (not assumed) and resulted in a Finding, an Observation, or an explicit Unable to Verify.
- Every fix applied is minimal, scoped to its finding, and independently re-verified after the change.
- No existing control was weakened and no unrelated functionality was altered.
- No finding rests on an invented threshold, a fabricated CVE, or an assumption not grounded in `00-master-context.md`/`01-setup.md` or code actually read.
