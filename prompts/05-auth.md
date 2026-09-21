# 05-auth.md — Sabr Studio Admin Authentication

Companion to `00-master-context.md` (full source hierarchy, conflict-resolution table) and `01-setup.md` (repo shape, env/secret boundary, approved dependency lists). This is the complete, standalone implementation prompt for **admin authentication and authorization only**. It does not cover CRUD, uploads, checkout, or general backend layering beyond what auth touches — see the backend implementation prompt for those. Nothing below invents an auth mechanism, endpoint, field, or library not already specified in `00-master-context.md`.

Before writing any code: inspect the existing `auth.middleware.js`, `auth.controller.js`, `auth.service.js`, `auth.routes.js`, and `admin.model.js` if they already exist, and preserve any correct working logic rather than rewriting it wholesale.

---

## 1. Role & Objective

Implement (or verify/correct) the single, documented admin-authentication mechanism: cookie-carried JWT, bcrypt-hashed credentials, one `admin` role, no visitor/customer accounts of any kind. This is the only auth system in the application — there is no second mechanism to build for any other purpose.

---

## 2. Source of Truth & Conflicts

Hierarchy: `PRD.md` → `TRD.md` → `ARCHITECTURE.md` → `SECURITY.md` → `CODING-RULES.md`/`AI-RULES.md` → existing repo → current task (Master Context §3). Auth detail is Master Context §6.5, restated/cross-referenced at §6.3 (API contract), §7 (constraints), and §9.3 (extra-caution files).

Relevant conflict: **C2** — the frontend Navbar "Login" button's wiring/destination is unresolved pending client confirmation. That is a frontend routing question only; it does not change, add to, or simplify the backend auth mechanism defined here. Do not let C2's ambiguity leak into this file as an excuse to build a different or looser auth path.

No other Section 4 conflict touches authentication. If a task here surfaces a new ambiguity, flag it rather than deciding silently.

---

## 3. Auth Architecture (fixed — no substitution)

- Libraries: `bcrypt` (hashing), `jsonwebtoken` (signing/verifying), `cookie-parser` (reading the cookie), `express-validator` (credential shape validation), `express-rate-limit` (login throttling) — all already in the approved backend list (`01-setup.md` §7.3).
- Mechanism: **stateless JWT, transported exclusively via an `httpOnly` cookie.** No session store, no Redis, no server-side session table, no OAuth/social login, no magic link, no 2FA/MFA, no API-key scheme — none of these are documented, so none are built.
- Scope: **admin-only.** There is no visitor/customer registration, login, or account of any kind (PRD explicitly excludes this; see Master Context C2's own note that no visitor auth is ever built). Do not add a "user" role or a public signup path under any framing.
- Single role: `admin`. Do not introduce a role/permission system (e.g., editor, viewer, super-admin) that isn't requested (Master Context §6.5).

---

## 4. Login (`POST /api/auth/login`)

- Public endpoint, **rate-limited** (§9 below) — this is documented explicitly in the API contract (Master Context §6.3).
- Request: email + password. No "remember me," no CAPTCHA, no other field — none are documented.
- Flow: validate input shape (§5) → look up the admin by email (model has `select: false` on `password`, so explicitly `.select('+password')` for this lookup only) → compare with `bcrypt.compare` → on success, sign a JWT (§7) and set it as the auth cookie → respond with the uniform success envelope, admin identity only (never the password hash) in `data`.
- On any failure point in this chain — no matching email, wrong password — the response is identical and generic (§14). Do not let timing or response differences reveal which failure occurred.

---

## 5. Credential Validation

- `auth.validators.js` (`express-validator`): email is present and well-formed; password is present and non-empty. This is shape validation only — it never determines whether the credentials are *correct*, only whether the request is well-formed enough to attempt a lookup.
- Validation runs before any database lookup or bcrypt comparison — a malformed request never reaches the credential-check step.
- This layer is authoritative on the backend regardless of any frontend validation already performed — never skip or weaken it on the assumption the frontend already checked.

---

## 6. Password Hashing

- Passwords are hashed with `bcrypt` before storage — the plaintext password is never persisted, logged, or returned in any response, at any point.
- `Admin.password` is `select: false` by default in the schema (Master Context §6.4) — every query that doesn't explicitly need the hash (e.g., `GET /api/auth/me`, any admin listing) must not accidentally expose it; only the login lookup opts in with an explicit field selection.
- Do not roll a custom hashing scheme, reduce bcrypt's cost factor for convenience, or hash on the frontend before sending — the backend receives and hashes plaintext over an already-secured (HTTPS) transport, per standard bcrypt usage.

---

## 7. Token Generation & Session Handling

- JWT payload contains **admin ID and role only** — no email, name, or other PII in the token payload (Master Context §6.5).
- Token is set as the auth cookie with `httpOnly: true`, `secure: true` in production, and an explicit `SameSite` policy — **never** returned in the JSON response body, **never** expected to be stored or read by frontend JS (`localStorage`/`sessionStorage` are both explicitly disallowed for this).
- Signing secret comes from the backend `.env` only (`01-setup.md` §5) — never hardcoded in source, never given a `VITE_` prefix, never committed.
- `middleware/auth.middleware.js` (the `protect` function) is an extra-caution file (Master Context §7) — inspect its current logic carefully before modifying; do not "simplify" its verification steps as a side effect of an unrelated change.

---

## 8. Token Expiry

- The JWT carries an expiry (`exp`) — an unbounded/non-expiring admin token is not acceptable.
- The exact duration is not fixed by `00-master-context.md`/`01-setup.md` — this is one of the numeric thresholds the source set leaves as `TBD` pending `TRD.md`/`SECURITY.md`'s full detail (Master Context §7). Define it once as a named constant (e.g., an env-configurable value with a sane default) rather than inventing and hardcoding an arbitrary number as if it were a specification, and flag it for confirmation against `SECURITY.md` if that document is available.
- **No refresh-token endpoint or mechanism exists** in the documented API contract (only `login`, `me`, `logout` — Master Context §6.3). Do not add one. An expired token simply requires the admin to log in again; the frontend's own 401 handling (out of scope here) is what redirects them to do so.

---

## 9. Session Check (`GET /api/auth/me`)

- Reads the cookie via `protect`, returns the current admin's identity (id, email, role — never the password hash) if the token is valid.
- Returns 401 if no valid cookie is present — this is the endpoint the frontend uses on app load to determine session state; it must not silently succeed with a null/empty "authenticated" response, and it must not fall back to any other identification method (no query param, no header-based override).

---

## 10. Logout (`POST /api/auth/logout`)

- Clears the auth cookie (matching name/path/domain/`SameSite` attributes used when it was set — a mismatched `clearCookie` call silently fails to remove it).
- No server-side token blacklist/revocation list exists or is required by the documented design — clearing the cookie is the complete logout action. Do not build a token-blacklist store; that would be a session-store mechanism the design doesn't call for.
- Responds with the uniform success envelope; idempotent — calling logout with no active session is not an error.

---

## 11. Protected Routes & Authorization

- Every `/api/admin/*` route — Projects, Retail, Enquiries, Orders admin CRUD, without exception — passes through `protect` before its controller runs. This is enforced at the route/router level, not left to individual controllers to remember.
- Authorization is binary at current scope: a valid admin token grants full admin access; there is no per-resource or per-action permission check beyond "is this an authenticated admin" (single-role design, §3).
- The frontend's own route guard (`ProtectedRoute`, if referenced elsewhere) is a **UX convenience only** — this backend check is the real boundary and must independently reject an unauthenticated direct API call exactly as it would reject a UI-blocked one (Master Context §6.5).
- A request to any `/api/admin/*` endpoint with a missing, malformed, expired, or tampered token returns 401 before any handler logic runs — never partially process the request first.

---

## 12. Brute-Force Protection & Rate Limiting

- The documented brute-force control is **rate limiting on `POST /api/auth/login`** (Master Context §6.3 marks this endpoint rate-limited) — this is the mechanism to implement, via `express-rate-limit` (or the shared `rateLimit.middleware.js` if the backend prompt already established one).
- Do not add a separate account-lockout/failed-attempt-counter mechanism, CAPTCHA, or IP-ban list — none of these are named in the source documents; if genuinely needed, that's a new requirement to flag back, not to build silently.
- Exact request/window thresholds are `TBD` in the source docs (Master Context §7) — define them once as named constants; do not invent a specific number and treat it as settled, and do not leave the endpoint unlimited in the meantime. A sane conservative default is acceptable as a placeholder, clearly named as such.
- Rate-limit responses use status 429 with the standard envelope (§14).

---

## 13. Secure Storage & Sensitive-Data Protection

- The token lives only in the `httpOnly` cookie — never in a JS-readable location, never in a Redux/Context store, never logged.
- No secret (JWT signing key, `.env` values) is ever exposed to the frontend bundle, a response body, or a log line — never a `VITE_`-prefixed variable, never a `console.log` of the token or the password/hash.
- `Admin.password`'s `select: false` default is never overridden except in the single login-lookup query that needs it (§6).
- Error messages, logs, and responses never include the password, the hash, or the JWT signing secret, even in a stack trace shown only server-side in development — treat this as a hard boundary regardless of `NODE_ENV`.

---

## 14. Authentication Errors

- Invalid credentials (wrong email or wrong password) → one generic message (e.g., "Invalid email or password") — never "no account with that email" vs. "wrong password" as distinguishable responses (Master Context §6.5).
- Missing/expired/malformed token on a protected route → 401, generic "not authenticated" message — never a stack trace or JWT-library-specific error text surfaced to the client.
- Rate-limit exceeded → 429, generic "too many attempts, try again shortly."
- All auth errors use the uniform envelope (`{ success: false, message, errors? }`) and the status codes already fixed in the backend API contract — no auth-specific response shape.

---

## 15. Constraints

- Do not invent a second auth mechanism, a new admin-facing endpoint, a role beyond `admin`, or a field on the `Admin` model not already implied by §4–§10 above.
- Do not hardcode the JWT secret, a password, or any credential anywhere in source — it comes from `backend/.env` only, per `01-setup.md` §5.
- Do not take an insecure shortcut for convenience: no cookie without `httpOnly`, no skipping `Secure` in production, no storing the token client-side "just for now," no disabling rate-limiting to make local testing easier and forgetting to re-enable it, no reducing bcrypt's work factor.
- Do not modify `auth.middleware.js`, `.env` variable naming, or any unrelated backend logic as a side effect of an auth-focused task — preserve working code and scope changes to what was requested.
- Do not silently resolve C2 (§2) as if it authorized a change to the actual auth mechanism — it does not.

---

## 16. Security Verification

Before considering this task complete, verify (report as **Verified / Not Verified / Unable to Verify**):

1. A correct login returns a set `httpOnly`, `Secure` (in production), `SameSite` cookie and never returns the token or the password hash in the response body.
2. An incorrect email and an incorrect password both produce the identical generic error message and status code — confirmed by testing both cases directly.
3. `Admin.password` is never present in the response body of `login`, `me`, or any admin listing/detail endpoint.
4. Every `/api/admin/*` route rejects a request with no cookie, an expired token, and a tampered/invalid-signature token — each tested directly against the API, not just through the UI.
5. `POST /api/auth/login` is rate-limited — confirmed by exceeding the threshold and observing a 429.
6. No JWT signing secret, password, or password hash appears in logs, error responses, or the frontend bundle (`VITE_`-prefixed or otherwise).
7. Logout clears the cookie such that a subsequent `GET /api/auth/me` returns 401.
8. bcrypt is used for hashing with no reduced/custom work factor, and no plaintext password is persisted or logged at any point.
9. No refresh-token endpoint, session store, or second auth mechanism was added.
10. Existing unrelated backend functionality (CRUD, checkout, enquiries) is unaffected by this change.

---

## 17. Completion Criteria

This task is complete only when:
1. Login, session check, and logout behave exactly as specified in §4, §9, and §10 — no more, no fewer endpoints.
2. Every `/api/admin/*` route is independently protected, verified by direct API calls bypassing the frontend.
3. Passwords are bcrypt-hashed, never exposed, and credential errors are generic and non-distinguishing.
4. The token is cookie-only, correctly flagged, time-limited via a named (not invented-on-the-fly) expiry constant, and never persisted client-side in JS-readable storage.
5. Brute-force protection exists on the login endpoint via rate limiting, with thresholds defined as named constants.
6. No secret is hardcoded or exposed to the frontend, logs, or responses.
7. All checks in §16 pass, or are explicitly reported as Not Verified / Unable to Verify.
8. No unrelated working code was altered, and no additional auth mechanism, role, or endpoint was introduced beyond what `00-master-context.md`/`01-setup.md` document.
