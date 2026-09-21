# SECURITY.md — Sabr Studio

Reference docs: `PRD.md`, `TRD.md` (§12 Security, §25 Rate Limiting, §26 Caching, §27 Compression/Dependency/Monitoring), `DATABASE.md` (§5 Security, §19), `API.md` (§13 Errors, §28–§29), `CODING-RULES.md` (§15 Security, §21A). This document consolidates security controls in one place; it does not redefine mechanisms already specified elsewhere — it cross-references them and adds the controls not yet centralized. Nothing below invents a technology or package beyond `TRD.md` §0/§2's stack. Where a numeric limit or policy value is not yet defined, it is marked `TBD`.

---

## 1. Security Scope & Objectives

- **Security goals**: protect visitor and studio data, prevent unauthorized access to admin functionality, ensure payment integrity, and keep the public site available and trustworthy.
- **Protected assets**: Admin credentials and sessions; Enquiry data (visitor PII); Order/payment data; Project/Retail content and images; Razorpay/Cloudinary/EmailJS/MongoDB credentials; the JWT signing secret; the production database itself.
- **Trust boundaries**: (1) Visitor browser ↔ public API — untrusted input, no session. (2) Admin browser ↔ admin API — authenticated via `httpOnly` JWT cookie, still untrusted at the network edge until `protect` verifies it. (3) Backend ↔ MongoDB Atlas — trusted, credentialed, network-restricted. (4) Backend ↔ Razorpay/Cloudinary/EmailJS — trusted via server-held API secrets, treated as external/untrusted for response validation (§30).
- **Security priorities (highest to lowest)**: admin account compromise prevention → payment integrity → visitor data confidentiality (Enquiries/Orders) → public site availability → general hardening.
- **Access levels**:
  - **Public** — unauthenticated visitors: read-only access to published Projects/Retail, cart (client-side only), enquiry submission, checkout initiation.
  - **Authenticated (admin session)** — a valid, non-expired JWT in an `httpOnly` cookie, re-verified server-side on every request (`protect`).
  - **Admin** — the only authenticated role in this system (`DATABASE.md` §2.5); no tiered roles exist today (§4).
- **Confidentiality**: enforced via authentication/authorization (§3–§4), field-level exclusion (`select: false`, §18), and never exposing secrets/PII on public routes (SEC-12).
- **Integrity**: enforced via server-side validation (§9), server-computed payment amounts (SEC-13), and snapshot-based Order records that can't be altered by later Project/Retail edits (`DATABASE.md` §2.4).
- **Availability**: addressed through rate limiting (§7), resource limits (§24), and graceful-degradation requirements (`TRD.md` SCALE-05) — not guaranteed as zero-downtime (§24).
- **Accountability**: server-side logging of authentication and admin-mutating actions (§26); no anonymous admin action is possible since every mutating admin route requires a verified session.
- **Least privilege**: single minimal `admin` role (§4); MongoDB Atlas DB user scoped to `readWrite` on the app database only (`DATABASE.md` §5); no broader credential is issued anywhere in the stack.
- **Defense in depth**: validation is enforced at three layers (frontend UX, `express-validator`, Mongoose schema — `DATABASE.md` §4); authentication is checked independently of frontend route guarding on every request (§4).
- **Secure-by-default**: new endpoints are private/authenticated unless explicitly required to be public; new response fields are excluded unless explicitly required in the response shape (`API.md` §5).
- **Fail-safe behavior**: on any ambiguous or failed check (invalid token, failed validation, database error), the system denies the action and returns a generic error rather than allowing it through (§6, §9).

---

## 2. Threat Model

| Threat | Attack surface | Threat actor | Impact | Mitigation | Residual risk |
|---|---|---|---|---|---|
| Unauthorized access to admin functionality | `/api/admin/*` | External attacker, ex-staff | High — content/order tampering | `protect` middleware, `httpOnly` JWT, RBAC (§3–§5) | Session theft if the admin device is compromised — `TBD` mitigation beyond `httpOnly`/`secure` cookie |
| Credential theft (admin password) | Login form, logs, transit | External attacker | High — full admin takeover | `bcrypt` hashing, HTTPS-only transit, no password in logs (§3, §26) | Phishing of the admin's own credentials is outside application-layer control |
| Brute force / credential stuffing | `/api/auth/login` | Automated attacker | Medium–High | Rate limiting (§7), generic error messages (§3) | Distributed low-and-slow attempts below the rate-limit threshold — `TBD` if a lockout mechanism is added |
| Session/token theft | Browser, network | External attacker, XSS payload | High | `httpOnly` (blocks JS access), `secure`, `sameSite` (§5) | A compromised admin machine can still exfiltrate the live session |
| XSS (stored/reflected/DOM) | Enquiry message, any rendered user input | External attacker | Medium — session/data theft if successful | React's default escaping, no `dangerouslySetInnerHTML`, input trimming/length caps (§11) | A future feature that renders raw HTML would need explicit sanitization not yet built |
| CSRF | State-changing admin requests | External attacker via a malicious page | Medium | `sameSite` cookie policy, single-origin production topology (§12) | Would need re-evaluation if `sameSite` is ever relaxed |
| Injection (NoSQL) | Any query built from request input | External attacker | High — data exposure/corruption | Whitelisted-field query construction only, never raw `req.query`/`req.body` (§10, `DATABASE.md` §5) | A future ad hoc query bypassing this pattern — mitigated by code review (`CODING-RULES.md` §20) |
| API abuse / bot / spam / scraping | Public endpoints, enquiry form | Automated clients | Medium | Rate limiting (§7), server-side validation (§9) | Sophisticated distributed scraping — accepted risk at current scale |
| File-upload attacks | `/api/admin/uploads` | Authenticated admin (compromised account) or a bug in validation | Medium | MIME/type/size/count validation, in-memory handling only, Cloudinary as sole binary store (§17) | Malware scanning is not currently implemented (`TBD`) |
| Data exposure (Enquiries/Orders/credentials) | Any API response | External attacker | High | Field-level exclusion, admin-only routes, generic errors (§6, §18) | A future endpoint that forgets `.select()` scoping — mitigated by the API checklist (`API.md` §27) |
| Account takeover / privilege escalation | Admin session, role field | External or insider | High | Single-role model, server-side status/role check on every request (§4) | Not applicable beyond the single admin role at current scope |
| Payment abuse (double-charge, price tampering) | `/api/checkout`, `/api/checkout/verify` | External attacker or a race condition | High | Server-computed amount, signature verification, idempotency (§16) | Distributed double-submission under extreme concurrency — mitigated by snapshot-at-creation (`DATABASE.md` §8) |
| Webhook abuse | N/A — no webhook endpoint currently exists | — | — | Not applicable today; see §16's forward-looking note | Revisit if a Razorpay webhook is added |
| Dependency compromise / supply-chain risk | `npm` packages (frontend/backend) | Upstream package compromise | Medium–High | `npm audit`, lockfiles, dependency minimization (§21) | A zero-day in a pinned dependency before a patch is available |
| Secret leakage | Git history, logs, frontend bundle | Internal mistake, external scanner | High | `.gitignore`, no `VITE_` prefix on secrets, no secrets in logs (§20) | A historical committed secret prior to this policy — `TBD`, requires a one-time repo history audit if ever suspected |
| DDoS / resource exhaustion | Any public endpoint | Automated attacker | Medium | Rate limiting, request-size limits, timeouts (§24) | Network-layer DDoS is outside application-layer control — depends on Hostinger's platform protections (`TBD`) |
| Cache poisoning / cache deception | Any cached response | External attacker | Low at current scope | No shared/reverse-proxy cache exists today (§8) | Revisit if a caching layer is introduced |
| Misconfiguration | Environment variables, CORS, headers | Internal mistake | Medium | Documented environment split, pre-deploy checklist (`API.md` §26) | Human error during manual Hostinger panel configuration — mitigated by the release checklist only |

---

## 3. Authentication

The only authentication mechanism in this system is **admin authentication** — there is no visitor account system (PRD, Out of Scope).

- **Admin authentication**: `bcrypt`-hashed credentials, verified against the `Admin` collection's `email` (unique) and `password` (`select: false`, `DATABASE.md` §2.5).
- **User authentication**: not applicable — visitors never authenticate (no registration/login for the public site).
- **Password requirements**: a minimum length/complexity policy for admin passwords is `TBD` — not specified in `PRD.md`/`TRD.md`; enforce a reasonable minimum at account-creation time once decided.
- **Password hashing**: `bcrypt`, industry-standard cost factor; plaintext is never stored, logged, or returned (§16 of the original Admin Security content, retained below in §15).
- **Salt handling**: `bcrypt` generates and embeds its own per-password salt automatically — no separate salt storage/management is required or implemented.
- **Login validation**: `express-validator` checks presence/format of `email`/`password` before the credential lookup runs (`API.md` §2.1).
- **Failed-login handling**: an invalid email or password returns the same generic `401` message (§9.2 in `API.md`) without revealing which field was wrong or whether the account exists.
- **Brute-force protection**: enforced via rate limiting on `/api/auth/login` (§7, `RATE-02`).
- **Credential-stuffing protection**: the same rate limit and generic-error behavior apply regardless of whether the submitted credentials belong to a real account; no separate credential-stuffing-specific control exists beyond this — additional protection (e.g., breached-password checking) is `TBD`.
- **Account enumeration prevention**: the generic authentication error (above) never reveals account existence (FR-J2).
- **Authentication error messages**: always generic in production (`"Invalid email or password."`) — no stack trace, no field-specific hint (`API.md` §24.2).
- **Session/token creation**: a JWT is issued only on successful login and set as an `httpOnly` cookie (§5).
- **Expiration**: governed by `JWT_EXPIRES_IN` (`TRD.md` §18); exact duration is `TBD`.
- **Rotation**: no refresh-token rotation exists in this system — a single JWT is valid until its expiry or logout; token rotation on each request is not implemented. Revisit if session duration/security requirements change.
- **Revocation**: because the JWT is stateless (no server-side session store), there is no way to revoke a specific token before its expiry today; logout only clears the client's cookie. A server-side revocation list/short-lived-token-plus-refresh strategy is `TBD` if this becomes a requirement.
- **Logout**: `POST /api/auth/logout` clears the `httpOnly` cookie server-side (FR-J4).
- **Password reset**: no password-reset flow is defined by any source document — `TBD`. Until implemented, a lost admin password requires direct database/manual intervention.
- **Password-change flow**: not defined by any source document — `TBD`.
- **Re-authentication for sensitive actions**: not currently implemented (e.g., deleting a Project/Retail item or changing order status does not require re-entering credentials) — `TBD` if a future requirement calls for step-up authentication on destructive actions.
- **Secure recovery process**: `TBD`, pending the password-reset flow above.
- **MFA/2FA**: not implemented; `TBD` — no source document currently requires it for the single-admin-role scope.

Plaintext passwords are never stored under any configuration.

---

## 4. Authorization & RBAC

- **Roles**: a single `admin` role exists at current scope (`DATABASE.md` §2.5); no additional role tier is introduced without a documented product requirement.
- **Permissions**: any authenticated, `active`-status admin may perform the full set of admin operations (Project/Retail/Enquiry/Order CRUD) — there is no per-admin permission subdivision today.
- **Resource ownership**: not applicable in the current model — all admin-managed resources (Projects, Retail, Enquiries, Orders) are owned by the studio collectively, not by an individual admin account; no per-admin resource scoping exists.
- **Admin authorization**: every `/api/admin/*` request is independently authorized by the `protect` middleware, which checks both JWT validity and the `Admin.status` field (`active`/`disabled`) — a structurally valid but `disabled` account's token is rejected (SEC-02, `403`).
- **Privilege boundaries**: no admin action can affect data outside the five defined collections (Projects, Retail, Enquiries, Orders, Admin); there is no cross-tenant or multi-studio boundary in this single-tenant system.
- **Least privilege**: restated from §1 — the single role has exactly the permissions the admin panel needs, nothing broader (e.g., no raw database-shell access is exposed through the API).
- **Server-side authorization**: authorization is enforced entirely server-side by `protect`; the frontend's `ProtectedRoute` component is a UX convenience only and is never trusted as an authorization boundary (FR-J5, `CODING-RULES.md` §15).
- **Route/API authorization**: every route under `/api/admin/*` is registered behind `protect` at the router level, not decided ad hoc per controller (`API.md` §1.1).
- **Object-level authorization**: an admin who is authenticated may act on any Project/Retail/Enquiry/Order `:id` — because there is no per-admin ownership model (see Resource ownership above), there is no IDOR/BOLA distinction to enforce between different admins; the boundary that matters is public-vs-admin, which is enforced by `protect` on every route, not by object ownership checks.
- **Prevention of IDOR/BOLA (public-facing)**: public routes only ever resolve resources by `slug` and only return `published` (and, for Retail, `available`) items (`DATABASE.md` §7) — an unpublished or non-existent slug returns a `404`, never a data leak of unpublished content.
- **Privilege-escalation prevention**: `Admin.role` and `Admin.status` are never client-settable through any update path available to a non-admin; only a direct, authenticated admin data-management action can change them, and no self-service role-elevation endpoint exists.
- **Default-deny behavior**: any route not explicitly marked public in `API.md` §2 is treated as requiring authentication; any request without a valid session is rejected by default rather than allowed unless proven unsafe.

Frontend route protection must never be treated as sufficient authorization — every admin API route re-verifies independently, per §3 above.

---

## 5. Session & Token Security

The project uses a single mechanism: a JWT issued at login and delivered as an `httpOnly` cookie (`TRD.md` §8, `API.md` §2.1) — no alternative session/token strategy exists.

- **Secure cookies**: the JWT is transmitted only via a cookie, never in a response body field the frontend must manually store.
- **HttpOnly**: set on the auth cookie so client-side JavaScript cannot read the token, blocking JS-based token theft (including via a successful XSS payload) (SEC-15).
- **Secure**: the cookie's `Secure` flag is enabled in production, restricting transmission to HTTPS only (SEC-15, `COOKIE_SECURE`).
- **SameSite**: an explicit `sameSite` policy is set, chosen to balance the single-domain production topology with CSRF resistance (SEC-15); the exact value (`Strict`/`Lax`) is `TBD` if not yet finalized, but is never left at the browser default.
- **CSRF protection**: see §12 — primarily provided by the `sameSite` policy given the single-origin topology.
- **Token expiry**: `JWT_EXPIRES_IN` controls how long the cookie/token remains valid (`TRD.md` §18); exact value `TBD`.
- **Refresh-token rotation**: not implemented — this system uses a single non-refreshing JWT (§3). No refresh-token mechanism exists to rotate.
- **Revocation**: as noted in §3, there is no server-side session store, so there is no way to revoke a specific issued token before expiry; only its natural expiry or a signing-secret rotation invalidates it early.
- **Logout invalidation**: `POST /api/auth/logout` clears the cookie client-side; since the JWT itself remains cryptographically valid until expiry, logout is a client-side invalidation, not a server-side revocation (see Revocation above) — acceptable at current scope given the short intended token lifetime (`TBD` exact value).
- **Session fixation prevention**: a new JWT is issued fresh on every successful login (never reusing a pre-existing token value), so a pre-login token cannot be fixed onto a post-login session.
- **Token storage**: only in the `httpOnly` cookie — never in `localStorage`, `sessionStorage`, or a JavaScript-accessible variable (`CODING-RULES.md` §15).
- **Token leakage prevention**: the token is never included in a URL, query string, log line, or error message (§26).
- **Token scope**: the JWT identifies the admin account only (`id`, and whatever minimal claims the login service embeds); it carries no broader capability grant, since only one role exists (§4).
- **Replay protection**: not separately implemented beyond the token's own expiry window — a captured, still-valid token can be replayed until it expires or the signing secret is rotated; this is a known limitation of the stateless-JWT approach and is accepted at current scope.
- **Concurrent-session handling**: no limit on concurrent valid sessions per admin account exists — the same or different devices can hold separate valid tokens simultaneously until each expires; a single-session-per-account enforcement is `TBD` if required later.

---

## 6. API Security

- **Authentication**: JWT-in-cookie verification via `protect`, applied per-route as documented in `API.md` §2 (§3, §5 above).
- **Authorization**: `protect` plus `Admin.status` check (§4 above).
- **Input validation**: `express-validator` chains on every mutating endpoint, authoritative regardless of client-side checks (§9).
- **Schema validation**: Mongoose schema-level validation (`required`, `enum`, `min`) acts as defense in depth beneath `express-validator` (`DATABASE.md` §4).
- **Sanitization**: free-text fields (enquiry message, descriptions) are trimmed and length-capped server-side (`DATABASE.md` §4).
- **Request size limits**: a global JSON body-parser size limit applies to non-multipart endpoints; Multer enforces file size/count limits separately (`API.md` §12/§17); exact byte limits are `TBD`.
- **Content-type validation**: JSON endpoints expect `application/json`; the upload endpoint expects `multipart/form-data` — a mismatched content type is rejected rather than leniently parsed (`API.md` §27).
- **HTTP methods**: each endpoint accepts exactly the method documented in `API.md` §2 — no endpoint silently accepts an undocumented verb (`API.md` §27 checklist).
- **CORS**: see §13.
- **Security headers**: see §14.
- **Rate limiting**: see §7.
- **Timeouts**: the frontend enforces a fixed Axios timeout (`API.md` §6); the backend relies on Node/Express's normal request lifecycle plus the rate-limit/validation chain to avoid indefinitely hanging on bad input — a dedicated server-side per-request timeout middleware is `TBD` if a slow-client/slow-loris style concern is prioritized.
- **Error handling**: centralized Express error-handling middleware maps every error to the standard envelope with a correct, safe status code (`API.md` §13); no internal detail ever reaches the client.
- **Response filtering**: `.select()` scoping ensures listing responses return only display-relevant fields; `select: false` on `Admin.password` ensures it is never serialized (`DATABASE.md` §7, §17).
- **Sensitive-field exclusion**: password hashes, Razorpay/Cloudinary secrets, and the raw `MONGODB_URI` are never included in any response (SEC-12).
- **Pagination**: enforced server-side maximum `limit` on every listing endpoint (`PERF-08`, `DATABASE.md` §19).
- **Resource limits**: see §24.
- **API versioning**: not implemented — the API is unversioned (`/api/*`, no `/v1/` prefix); introduce versioning only if a breaking change is ever required, per a future documented decision (`TBD`).
- **Abuse detection**: currently limited to rate-limit-triggered `429`s and authentication-failure logging (§7, §26); a dedicated anomaly-detection system is `TBD`.
- **Logging**: see §26.
- **Safe status codes**: the documented status-code table (`API.md` §13) is the sole source of truth for what each endpoint may return.
- **Generic production errors**: enforced by `NODE_ENV`-gated verbosity — stack traces and environment detail appear only in local development logs, never in a production response (SEC-09).

Stack traces, secrets, and internal implementation details are never exposed in any environment-facing response.

---

## 7. Rate Limiting

Implemented via `express-rate-limit` (`TRD.md` §2.2), detailed in `TRD.md` §25 and mapped per endpoint in `API.md` §28.

- **Brute-force protection**: `POST /api/auth/login` carries a strict rate limit (`RATE-02`) plus the generic-error rule (§9.2 of `API.md`) so failed attempts never reveal whether an account exists.
- **Login protection**: Repeated failed logins are logged (`TRD.md` LOG-03, without ever logging the password) to support abuse detection alongside the rate limiter.
- **Password reset**: no password-reset endpoint currently exists (§3) — a dedicated rate limit for it is `TBD`, to be added when the flow is implemented.
- **Admin API protection**: All `/api/admin/*` routes carry a stricter, admin-scoped rate limit (`RATE-03`), independent of and in addition to the `protect` authentication/authorization check (§4).
- **Payment endpoint protection**: `POST /api/checkout` and `POST /api/checkout/verify` carry a payment-specific rate limit (`RATE-04`) to prevent order-creation spam and verification brute-forcing.
- **Contact/form abuse protection**: `POST /api/enquiries` carries a form-abuse rate limit (`RATE-05`).
- **Public API abuse**: A general baseline limit (`RATE-01`) applies to all `/api/*` traffic beyond the dedicated limits above.
- **Expensive operations / search/filter endpoints**: filtered/paginated public listing endpoints fall under the general baseline limit (`RATE-06`); no dedicated full-text search endpoint exists (`DATABASE.md` §7).
- **File uploads**: `POST /admin/uploads` is covered by the admin-scoped rate limit (`RATE-03`) in addition to Multer's own file size/count limits (§17).
- **Webhooks**: not applicable — no webhook endpoint currently exists (§16); a webhook-specific rate limit is `TBD` if one is added.
- **Per-IP limits**: applied as the baseline identification method on every rate-limited route (`RATE-07`).
- **Per-user/account limits**: applied additionally on authenticated admin routes so a compromised IP cannot be worked around by rotating accounts and vice versa (`RATE-07`).
- **Endpoint-specific limits**: distinct thresholds per route group as listed above (`RATE-02` through `RATE-06`); exact numeric values are `TBD`.
- **Burst handling**: rate-limit windows are chosen to tolerate normal rapid legitimate use while blocking rapid automated repetition (`RATE-09`); exact window/threshold values are `TBD`.
- **Distributed rate limiting / multi-instance deployments**: the current production topology is a single Node.js process (`TRD.md` §20), so in-memory `express-rate-limit` storage is sufficient today. If the topology ever moves to multiple backend instances, rate-limit state must move to a shared store so limits are enforced consistently across instances (`RATE-11`) — this is a forward-looking requirement, not a current implementation, since no multi-instance deployment or shared-store dependency currently exists (`TRD.md` §2.2).
- **Proxy/load-balancer IP handling**: Express's `trust proxy` setting must be configured correctly for Hostinger's request path so `express-rate-limit` reads the real client IP from `X-Forwarded-For` rather than the proxy's own address (`RATE-08`) — a misconfiguration here silently defeats every per-IP limit above.
- **HTTP 429**: every rate-limited route returns `429` with the standard error envelope once its limit is exceeded (`RATE-10`).
- **Retry behavior / `Retry-After`**: included where `express-rate-limit`'s configuration supports it, so a well-behaved client knows when to retry (`RATE-10`).
- **Monitoring**: rate-limit violations are a monitored event class (§27).
- **Alerting**: alert thresholds for repeated `429`s from a single client are `TBD` (§27).
- **Abuse response**: sustained abuse beyond rate limiting (e.g., a persistent scraper rotating IPs) is handled manually today (e.g., a Hostinger/Atlas-level IP block) — no automated escalation exists; `TBD` if one is built.
- **Bypass prevention**: rate-limit middleware runs before authentication/business logic on every route it protects, and is keyed on the correctly-resolved client identity (proxy-aware, above) rather than a client-supplied header that could be spoofed.

Rate limiting is enforced entirely server-side; no client-side throttling is relied upon for protection.

---

## 8. Caching Security

Detailed in `TRD.md` §26; restated here as security controls specifically.

- **Browser cache**: static, content-hashed frontend assets use long-lived caching; `index.html` uses a short/no-cache directive (`CACHE-01`).
- **CDN/edge cache**: Project/Retail images are served through Cloudinary's own CDN/delivery caching (`TRD.md` §17); no separate CDN is introduced for the app shell or API responses at this scope (`CACHE-02`).
- **Server/application cache**: not applicable — no caching layer (Redis, in-process response cache) currently exists in this system's architecture (`TRD.md` §2.2 explicitly excludes Redis at this scope).
- **Public-content cache**: public `GET` listing/detail endpoints (`/api/projects`, `/api/retail`, and their detail routes) **may** set a short, explicit `Cache-Control: public, max-age=<TBD>` (`CACHE-03`).
- **Private-content cache / never cache sensitive data in shared caches**: no caching layer currently exists beyond browser/HTTP caching and Cloudinary's own asset delivery; any caching introduced later must exclude Enquiry, Order, and Admin data entirely.
- **Never publicly cache admin responses**: every `/api/admin/*` response sets `Cache-Control: no-store` (`CACHE-04`).
- **Never publicly cache payment responses**: every `/api/checkout` and `/api/checkout/verify` response sets `Cache-Control: no-store` (`CACHE-04`).
- **Authentication responses use safe cache controls**: `/api/auth/login`, `/api/auth/me`, and `/api/auth/logout` all set `no-store` — an authentication response must never be replayed from a cache.
- **TTL / revalidation**: where a public listing/detail response sets `max-age` (`CACHE-03`), a conditional-request (`ETag`/`Last-Modified`) revalidation mechanism is added only if a real staleness problem is observed; a short `max-age` alone is sufficient at current scale (`CACHE-05`).
- **Invalidation**: there is no server-side cache to invalidate at this scope; publish/unpublish and CRUD actions take effect immediately in the database and are reflected on the next (uncached, or short-`max-age`) request (`CACHE-06`).
- **Cache keys**: if any response caching is introduced, cache keys must include every request attribute that affects the response body (query params such as pagination/filter values) — and never include an authenticated admin response, per the no-cache rule above (`CACHE-07`).
- **User isolation / authorization-aware caching**: a cached response is never served to a client that has not independently passed authentication/authorization for that route (`CACHE-09`) — this is why admin/payment responses are uncacheable outright, rather than relying on cache-key correctness alone to prevent cross-user data leakage.
- **Cache poisoning**: not currently applicable — no reverse-proxy/shared cache exists that could be poisoned by a manipulated request; if one is introduced, cache keys must be derived only from whitelisted, validated request attributes, never from unvalidated headers.
- **Cache deception**: not currently applicable at this scope for the same reason (no shared cache); if one is introduced, static-looking public paths must not be able to trick the cache into storing a personalized/admin response — enforced by never routing admin/authenticated paths through any cacheable path prefix.
- **Sensitive-response / personal-data protection**: Enquiry and Order data are never served on a cacheable route, since they are exposed only through `no-store` admin endpoints (§18).
- **Cache stampede protection**: not currently applicable at this system's scale (single-instance, no shared cache); if a shared cache layer is introduced later and a hot key risks concurrent cache-miss regeneration, a request-coalescing or locking strategy is required at that time (`CACHE-08`).

Cache is never used as an authorization mechanism — every response that requires authorization is either freshly authorized on each request or marked `no-store`.

---

## 9. Input Validation

- **Validate every external input**: every mutating endpoint validates its inputs before any service/database call — no endpoint trusts client-supplied data by default (SEC-05).
- **Body validation**: `express-validator` `body()` chains check required fields, types, and formats for every mutating request (`DATABASE.md` §4).
- **Query validation**: listing/filter query parameters (pagination, category filters) are validated and bounded before use in a database query (`API.md` §16, `DATABASE.md` §19).
- **Path/parameter validation**: route `:id` parameters are validated as syntactically valid Mongoose ObjectIds before query execution — an invalid format maps to a `404`/`400`, never an uncaught cast error (`DATABASE.md` §4).
- **Header validation**: not required beyond standard `Content-Type` checks (§6) — no custom header carries security-relevant data in this system.
- **Type validation**: one type per field, enforced identically across the Mongoose schema, the `express-validator` chain, and the frontend form (`DATABASE.md` §3).
- **Length limits**: free-text fields (message, description) enforce a defined maximum length (`DATABASE.md` §4); exact limits are `TBD` where not yet specified.
- **Range limits**: numeric fields enforce `min: 0` on all price/amount fields; `year` is constrained to a 4-digit numeric range (`DATABASE.md` §4).
- **Format validation**: email format, slug URL-safety, and phone-as-string are validated at both the `express-validator` and Mongoose layers (`DATABASE.md` §4).
- **Allowlist approach**: controlled-value fields (status enums, category) are validated against a shared, explicit constant list — never accepted as an arbitrary string (`DATABASE.md` §4).
- **Reject malformed input**: any request failing validation is rejected with field-level detail in the standard error envelope — no partial writes occur (`DATABASE.md` §4).
- **Server-side validation is authoritative**: regardless of what the frontend already checked (§6).
- **Frontend validation**: exists purely for UX responsiveness (immediate feedback); it duplicates but never replaces backend validation (`TRD.md` §11).

---

## 10. Injection Protection

- **NoSQL injection**: prevented by never passing a raw `req.query`/`req.body` object directly into a Mongoose filter — only explicitly whitelisted, validated fields are used to build query filters, preventing operator injection (`$gt`, `$where`, etc. supplied by an attacker) (`DATABASE.md` §5).
- **SQL injection**: not applicable — this system uses MongoDB exclusively, via Mongoose; no SQL database or raw SQL query exists anywhere in the stack (`TRD.md` §2.3).
- **Command/OS injection**: not applicable — the backend never shells out to the OS or invokes a child process based on user input; no such functionality is defined by any source document.
- **LDAP injection**: not applicable — no LDAP/directory-service integration exists in this system.
- **Template injection**: not applicable — the backend does not render server-side templates from user input (React renders client-side with standard JSX escaping, §11); no template engine (e.g., EJS, Pug) is part of the stack.
- **Path traversal**: not applicable to file storage — uploaded files are handled in-memory by Multer and forwarded directly to Cloudinary; nothing is written to or read from local disk based on a user-supplied filename/path (`TRD.md` §17, `DATABASE.md` §11).
- **Prototype pollution**: mitigated by using well-maintained, current versions of `express`/`mongoose`/`express-validator` (dependency hygiene, §21) and by never performing a deep-merge of raw, unvalidated client input into an internal object; explicit field whitelisting (as in NoSQL injection, above) is the primary control.
- **Expression injection**: not applicable — no expression-evaluation feature (e.g., a template/formula engine) exists.
- **Unsafe dynamic queries**: no query in this system is built via string concatenation of user input; Mongoose's query builder with explicitly whitelisted fields is used throughout (`DATABASE.md` §5, §7).

Safe query APIs (Mongoose's builder methods) and validated, whitelisted inputs are used for every database interaction.

---

## 11. XSS

- **Stored XSS**: mitigated because free-text fields (enquiry message, project/retail description) are stored as plain text and rendered through React's default JSX escaping — never as raw HTML.
- **Reflected XSS**: mitigated the same way — no server response ever echoes a raw, unescaped request parameter back into an HTML context.
- **DOM XSS**: no client-side code inserts unsanitized data into the DOM via `innerHTML`/`dangerouslySetInnerHTML`; this is treated as a standing implementation rule, not just an incidental current state (`CODING-RULES.md` §4).
- **Output encoding**: React's JSX rendering escapes all interpolated values by default — this is the primary XSS control across the entire frontend.
- **HTML sanitization**: not currently needed because no feature renders user-supplied content as raw HTML; if one is ever added (e.g., rich-text project descriptions), a dedicated sanitization library would need to be introduced and documented at that time — not invented here (`TBD`).
- **Unsafe HTML restrictions**: `dangerouslySetInnerHTML` is not used anywhere in the codebase and is disallowed for rendering any user- or admin-supplied content (`CODING-RULES.md` §4).
- **Safe URL handling**: any user-influenced URL (e.g., a future "website" field) would need scheme validation (`http(s)://` only) before being used in an `href`/`src` — no such field currently exists, so this is a standing rule for the future, not a current implementation.
- **Script injection prevention**: covered by the above — no code path evaluates or injects user-supplied strings as executable script.
- **CSP**: see §14 — a Content-Security-Policy is planned (`TRD.md` SEC-17) as an additional layer beyond output encoding; exact source list is `TBD`.
- **Third-party script control**: the only third-party scripts loaded are Razorpay's checkout widget script and, if used, Google Fonts — no other third-party script is embedded; both are candidates for explicit allowlisting in the CSP (`TBD`).

Database content is never trusted simply because it was entered by an admin — the same output-encoding rules apply to admin-entered Project/Retail content as to visitor-entered Enquiry content.

---

## 12. CSRF

CSRF applies to this system because state-changing admin requests are authenticated via a cookie (JWT), which a malicious page could otherwise induce a logged-in admin's browser to send.

- **CSRF token**: not implemented as a separate mechanism today — the current mitigation relies on the cookie's `sameSite` attribute (below) combined with the single-origin production topology (`TRD.md` §20). A dedicated CSRF token is `TBD` if `sameSite` is ever relaxed (e.g., to support a genuinely cross-origin admin client).
- **SameSite cookies**: the JWT cookie's `sameSite` attribute (SEC-15, §5) is the primary CSRF mitigation — a cross-site request generally cannot attach the cookie under a `Strict`/`Lax` policy.
- **Origin/Referer validation**: not separately implemented beyond CORS's origin restriction (§13); CORS and `sameSite` together are the operative controls.
- **State-changing request protection**: every state-changing admin request (`POST`/`PUT`/`DELETE` on `/api/admin/*`) requires the authenticated cookie, which `sameSite` prevents from being attached cross-site.
- **Login CSRF**: not applicable in the same way — a forced login (setting an attacker-controlled session) is not meaningful here because login requires the actual admin credentials, which an attacker does not have.
- **Sensitive-action protection**: no additional re-authentication step exists for destructive admin actions today (§3) — `sameSite` plus authentication is the current control; step-up confirmation is `TBD`.

No additional CSRF mechanism (e.g., double-submit tokens) is added beyond what the current single-origin, `sameSite`-cookie architecture requires, per the instruction not to over-engineer beyond the actual risk.

---

## 13. CORS

- **Allowed production origin**: the single production domain only, via `CORS_ORIGIN` (SEC-04); no wildcard origin is used.
- **Development origins**: the local Vite dev server's origin, configured separately from the production value (`TRD.md` §5, DEV-01).
- **Methods**: standard REST verbs used by the API (`GET`, `POST`, `PUT`, `DELETE`) are allowed for the configured origin; no additional method is enabled.
- **Headers**: only the headers the API actually requires (`Content-Type`, and cookies via `credentials`) are allowed — no broad `Access-Control-Allow-Headers: *`.
- **Credentials policy**: `credentials: true` is set together with an explicit, non-wildcard origin (never `*` with credentials), since the JWT cookie must be sent cross-port in local development and same-origin in production (SEC-04).
- **Preflight handling**: `OPTIONS` preflight requests succeed for every mutating endpoint from the allowed origin (`API.md` §27 checklist).
- **No wildcard origin with credentials**: enforced as a hard rule — a wildcard `Access-Control-Allow-Origin` is never paired with `credentials: true` (SEC-04).
- **Environment-specific configuration**: `CORS_ORIGIN` is read from environment variables and differs between local development, any preview/staging environment, and production (`TRD.md` §18, §21.3 of `API.md`).

Permissive CORS is never used in production; the allowed origin is always the exact, single production domain.

---

## 14. Security Headers

- **Content-Security-Policy**: restricts script/style/image/connect sources to the app's actual origins (self, Cloudinary, Razorpay's checkout script, Google Fonts if used) — purpose: mitigate XSS impact even if an injection point is ever found (§11). Exact source list is `TBD` pending a full inventory of third-party script/asset origins (`TRD.md` SEC-17).
- **Strict-Transport-Security**: enabled in production (via `helmet`'s HSTS support) to force HTTPS on subsequent visits — purpose: prevent protocol-downgrade/SSL-stripping attacks; not meaningful in local development (no HTTPS there).
- **X-Content-Type-Options**: `nosniff`, set via `helmet` — purpose: prevents the browser from MIME-sniffing a response into an unintended, potentially executable content type.
- **Referrer-Policy**: `strict-origin-when-cross-origin` — purpose: avoids leaking full URL paths (which could include sensitive query parameters) to third-party destinations.
- **Permissions-Policy**: restricts browser feature access (camera, microphone, geolocation, etc.) that this application does not use — exact directive set is `TBD`, defaulting to disabling all features not explicitly required.
- **Frame protection / `frame-ancestors`**: `X-Frame-Options: DENY` (or the equivalent `frame-ancestors 'none'` CSP directive) — purpose: prevents the admin panel from being framed/clickjacked by a malicious page.
- **Cross-Origin policies (`Cross-Origin-Opener-Policy`, `Cross-Origin-Resource-Policy`)**: applied via `helmet`'s defaults where they do not break the Razorpay checkout widget's own cross-origin requirements — exact configuration is `TBD` and must be verified against Razorpay's integration requirements before tightening further.

All of the above are provided primarily through `helmet`'s baseline configuration (BE-16), with the CSP/Permissions-Policy specifics extended per `TRD.md` SEC-17; production behavior for each is confirmed as part of the pre-deploy checklist (`API.md` §26).

---

## 15. Admin Panel Security

Admin functionality is treated as the highest-risk surface in this system.

- **Dedicated authentication**: `bcrypt`-hashed credentials, never reversible encryption or plaintext (SEC-01).
- **Server-side authorization**: `protect` middleware independently re-verifies the JWT and account `status` (`active`/`disabled`) on every `/api/admin/*` request, regardless of frontend route guarding (SEC-02, FR-J5).
- **RBAC**: A single `admin` role exists at current scope (`DATABASE.md` §2.5); no additional role tier is introduced without a documented product requirement — do not build speculative role infrastructure ahead of need.
- **Strong credentials**: password strength policy is `TBD` (§3); credentials are never shared across environments (dev vs. production, §20).
- **MFA/2FA**: not implemented; `TBD` (§3).
- **Login rate limiting**: covered by §7's `RATE-02`.
- **Secure sessions/tokens**: JWT delivered only via an `httpOnly` cookie, `secure: true` in production, with an explicit `sameSite` policy (SEC-15); never stored in `localStorage`/`sessionStorage` (`CODING-RULES.md` §15) — full detail in §5.
- **Privilege escalation prevention**: covered by §4 — `Admin.role`/`status` are never client-settable through any exposed update path.
- **Sensitive-action confirmation**: not currently implemented (§3, §12) — `TBD` for destructive actions (delete Project/Retail, mark an Order cancelled).
- **CSRF protection**: covered by §12.
- **Audit logs**: authentication failures and admin-scoped API failures are logged with request context and the acting admin's identity where authenticated (`TRD.md` LOG-02/LOG-06); a dedicated, queryable audit-log collection is not introduced at this scope unless a future requirement calls for one — current logging is operational (server logs), not a queryable audit trail. Flagged as `TBD` if a queryable audit trail becomes a requirement.
- **Admin activity monitoring**: covered by §27.
- **Account lock/protection strategy**: beyond rate limiting (§7), no explicit account-lockout-after-N-failures mechanism exists — `TBD` if required in addition to rate limiting.
- **File-upload restrictions**: see §17 — uploads are only reachable through an authenticated admin route.
- **API protection**: every admin-mutating endpoint runs the full `protect` + `express-validator` chain — no admin action is reachable through an unauthenticated or unvalidated path (SEC-07, SEC-08).
- **Secret handling**: JWT signing secret, Atlas URI, and all third-party credentials live only in backend environment variables, never in frontend code or a `VITE_`-prefixed variable (SEC-03) — full detail in §20.
- **No sensitive data unnecessarily displayed**: the admin panel never renders `Admin.password`, raw Razorpay/Cloudinary secrets, or the `MONGODB_URI` anywhere in its UI, since the backend never returns them in the first place (`DATABASE.md` §17).
- **Secure logout**: `POST /api/auth/logout` clears the cookie server- and client-side (FR-J4).
- **Session expiration**: governed by `JWT_EXPIRES_IN` (§5); exact duration `TBD`.
- **Re-authentication for critical actions**: not currently implemented — `TBD` (§3, §12).

---

## 16. Payment Security

Payment operations are treated as critical.

- **Server-side payment verification**: Payment success is recognized only after the backend verifies Razorpay's signed response using Razorpay's official signature-verification method; a client-side success callback alone never marks a payment or order successful (SEC-14, FR-G5).
- **Payment-provider authentication**: the backend authenticates to Razorpay using the server-held `RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET` pair (`TRD.md` §18) — the frontend authenticates to nothing directly; it only opens Razorpay's checkout widget using the public `VITE_RAZORPAY_KEY_ID`.
- **Secret-key protection**: `RAZORPAY_KEY_SECRET` exists only server-side; only `RAZORPAY_KEY_ID` (public) is exposed to the frontend via a `VITE_`-prefixed variable (SEC-03, `TRD.md` §18).
- **No payment secrets in frontend**: enforced by never giving a secret a `VITE_` prefix (SEC-03) — verified explicitly in the release checklist (`QA-CHECKLIST.md` §12).
- **Webhook signature verification / webhook authenticity**: No dedicated Razorpay webhook endpoint currently exists (`API.md` §29) — verification happens via the client-driven `checkout/verify` flow. If a webhook endpoint is added later, it must verify the webhook's own signature (using the webhook secret, distinct from the checkout key secret) before trusting any payload (`API.md` §29). This is a forward-looking requirement, not a current gap, since no webhook endpoint is currently defined by source docs.
- **Replay protection**: a given `razorpayPaymentId` verifies successfully only once against its matching Order — a replayed verification request for an already-verified payment is a no-op, not a second state change (`API.md` §22).
- **Idempotency**: `POST /checkout` and `POST /checkout/verify` follow the idempotency rules in `API.md` §22 — a duplicate submission or retry must never create two Orders, two Razorpay orders, or a double-verified payment.
- **Duplicate-payment prevention**: The frontend's `isSubmitting` lock plus the backend's cart/session-scoped checkout validation (`API.md` §22) are the primary guards.
- **Transaction state validation**: `paymentStatus` transitions only through the verification service (never client- or admin-settable, FR-O3); `orderStatus` and `paymentStatus` are tracked independently and never conflated (`DATABASE.md` §2.4).
- **Amount/currency validation**: the payable amount is always computed server-side from re-validated item prices at checkout time and is never accepted from client input at any layer (SEC-13, FR-G3); currency is implicitly INR via Razorpay's configured account — no multi-currency handling exists or is claimed.
- **Order/payment ownership validation**: `checkout/verify` ties a given `razorpayPaymentId`/`razorpayOrderId` pair to the specific `pending` Order it was created for — a verification request cannot be applied to a different Order.
- **Client-side status cannot establish payment success**: restated from the first bullet — this is a hard rule, not a default that can be revisited casually (SEC-14).
- **Payment failure handling**: a failed or cancelled payment is reflected clearly in the UI and never results in an order being marked successful (FR-G6).
- **Timeout handling**: the frontend's fixed Axios timeout (§6) applies to checkout requests the same as any other; a timed-out checkout request does not assume success and shows a retry-capable error state.
- **Safe retries**: a checkout retry after a network failure/timeout does not blindly resubmit — it is subject to the same idempotency safeguards above (`API.md` §22).
- **Provider outage handling**: a Razorpay-side failure is caught at the service layer, logged, and translated into a generic client-facing error — the order remains in a safe `pending`/`failed` state rather than an ambiguous one (`TRD.md` §11).
- **Audit logging without sensitive payment data**: payment verification attempts (success/failure) are logged with the Order ID and outcome, never the full Razorpay payload or any secret (`TRD.md` LOG-05/LOG-06).
- **Sensitive payment-data minimization**: MongoDB stores only Razorpay's own order/payment reference identifiers and a boolean verification status — no raw payment-instrument data is ever received or stored (`DATABASE.md` §2.4).
- **No raw card data storage**: this system never receives or stores raw card data at any layer — Razorpay's hosted checkout handles card entry directly (`DATABASE.md` §2.4).
- **Secure redirects/callbacks**: Razorpay's checkout is opened as an in-page widget rather than a redirect flow at current scope, per the documented integration pattern (`TRD.md` §9) — no external redirect URL requires validation today; if a redirect-based flow is ever adopted, the return URL must be validated against an allowlist (`TBD`).

---

## 17. File Upload Security

Uploads exist only for Project/Retail images via Multer → Cloudinary (`TRD.md` §17, `DATABASE.md` §11), reachable only through the authenticated `POST /admin/uploads` route (§15).

- **Allowed file types**: image MIME types only (`TRD.md` §17).
- **Extension validation**: validated alongside MIME type before forwarding to Cloudinary; a mismatched extension/MIME pair is rejected — exact validation rule set is `TBD` beyond "image MIME types only."
- **MIME validation**: enforced by Multer's file filter before any upload proceeds.
- **File signature/magic-byte validation**: not explicitly defined by source docs — `TBD`; recommended as an additional check beyond declared MIME type if upload abuse is ever observed.
- **Maximum file size**: enforced by Multer; exact byte limit is `TBD`.
- **Filename sanitization / random storage names**: Cloudinary assigns and returns the `publicId` used for storage and later deletion — the original client filename is not used as the storage key (`DATABASE.md` §2.1/§2.2).
- **Path traversal prevention**: not applicable — files are handled in-memory and never written to or read from local disk by filename (`TRD.md` §17).
- **Executable-file rejection**: covered by the image-MIME-type allowlist (above) — non-image file types, including executables, are rejected outright.
- **SVG handling**: not explicitly addressed by source docs — `TBD`. Given SVG's capacity to embed script content, excluding SVG from the allowed image MIME types (or sanitizing it before storage) is recommended once this is formally decided; no such exclusion is currently documented as implemented.
- **Image processing risks**: Cloudinary performs transformation/delivery; no local image-processing library (e.g., ImageMagick) runs in this application, avoiding a class of image-parser vulnerabilities.
- **Malware scanning**: not implemented — `TBD`.
- **Storage isolation**: Cloudinary is the sole binary store, organized per-resource (`projects/<projectId>/`, `retail/<retailId>/`) (`TRD.md` §17); MongoDB never stores binary data.
- **Public/private access**: uploaded images are public-by-design (they are shown on the public site) — there is no private-file-access requirement in this system.
- **Content-Disposition**: governed by Cloudinary's own delivery defaults; not separately configured by this application.
- **Upload rate limiting**: covered by the admin-scoped rate limit (§7, `RATE-03`).
- **Authorization before upload/delete**: `protect` middleware guards `POST /admin/uploads` and the project/retail delete flow that triggers Cloudinary cleanup (§4, §15).
- **Authorization before file access**: not applicable in the restrictive sense — uploaded images are intentionally public once attached to a published Project/Retail item; no authenticated-only image exists in this system.
- **Safe deletion**: deleting a Project/Retail item triggers a Cloudinary `destroy` call using the stored `publicId` — no extra lookup or filename guessing is required or possible (`DATABASE.md` §2.1/§2.2, FR-L4).

---

## 18. Database Security

- **Database authentication**: MongoDB Atlas SCRAM database users; no anonymous access (`DATABASE.md` §5).
- **Least-privilege DB user**: the application's DB user has `readWrite` scoped to this project's database only — never an Atlas admin/global user (`DATABASE.md` §5).
- **Network restrictions**: Atlas's IP allowlist is scoped to the backend's outbound IP(s); no `0.0.0.0/0` unless the hosting plan genuinely provides no stable IP, in which case strong credentials + TLS are the compensating control (`DATABASE.md` §5).
- **TLS**: enforced by Atlas by default for all connections; no plaintext connection path exists (`DATABASE.md` §5).
- **Connection security**: a single pooled Mongoose connection is established once at server start and reused — never reconnected per-request (`DATABASE.md` §1).
- **Schema validation**: Mongoose schema-level validation acts as defense in depth beneath `express-validator` (`DATABASE.md` §4).
- **Query validation / injection prevention**: see §10 — no raw `req.query`/`req.body` is ever passed directly into a Mongoose filter.
- **Index safety**: no unnecessary index (e.g., a text/full-text index with no corresponding feature) is created; every shipped query path is covered by an existing index before it ships (`DATABASE.md` §6).
- **Sensitive-field protection**: `Admin.password` is `select: false` by default; Enquiry/Order data is never returned by any public endpoint; no response ever includes password hashes, Razorpay/Cloudinary secrets, or the raw `MONGODB_URI` (`DATABASE.md` §5, SEC-12).
- **Data minimization**: only the fields defined in `DATABASE.md` §2 are collected/stored — no speculative additional field is added without a documented requirement.
- **Backup security**: see §28.
- **No direct browser-to-database access**: the frontend never connects to MongoDB directly; all data flows through the backend REST API (FR-P1, `DATABASE.md` §1).
- **Production DB credentials protection**: `MONGODB_URI` (with credentials) lives only in Hostinger's environment panel, never in source control (`DATABASE.md` §16).

---

## 19. Data Protection & Privacy

- **Data classification**: Personal/sensitive data in this system consists of Enquiry records (visitor name, email, phone, message) and Order customer information (name, email, phone) — both admin-only visibility (`DATABASE.md` §17). Admin account data (`Admin` collection) is internal, non-public data. Project/Retail content is non-personal, intentionally public data.
- **Collection minimization**: only the fields defined in `PRD.md` §8/`DATABASE.md` §2 are collected — no additional visitor data (e.g., IP-based geolocation, device fingerprinting) is collected beyond what rate limiting/logging incidentally touches (§7, §26).
- **Purpose limitation**: Enquiry data is used only to respond to the visitor's enquiry; Order data is used only to fulfill and manage the purchase — no secondary use (e.g., marketing) is defined or implemented.
- **Access control**: Enquiry/Order data is accessible only to authenticated admins (`DATABASE.md` §17, FR-N4); never exposed on any public route.
- **Retention**: no defined retention/deletion schedule for Enquiry/Order data exists in any source document — `TBD`.
- **Deletion**: admins can delete Enquiries (FR-N3, hard delete); Orders have no defined deletion path in the PRD's scope (order history is treated as a durable business record) — `TBD` if a deletion/anonymization requirement is added.
- **Modification**: Enquiry status is admin-editable (FR-N2); Order `orderStatus` is admin-editable, while `paymentStatus`/`amount`/`items` are immutable after creation (`DATABASE.md` §2.4).
- **Export**: no data-export feature (e.g., a visitor's "download my data" request) is defined — `TBD`.
- **Encryption in transit**: HTTPS end-to-end in production (SEC-11); Atlas connections are TLS-enforced (`DATABASE.md` §5).
- **Encryption at rest**: provided by MongoDB Atlas's default at-rest encryption for the managed cluster tier in use; no additional application-level field encryption is implemented — `TBD` if a stricter requirement (e.g., field-level encryption for Enquiry PII) is introduced.
- **Backup protection**: see §28.
- **Third-party data sharing**: Enquiry data is not shared with any third party beyond triggering an EmailJS notification (which transmits the enquiry content to send the email, per EmailJS's own service); Order/payment data is shared with Razorpay as required to process payment; Project/Retail images are stored with Cloudinary (§30 documents each service's exact role).
- **Privacy-policy alignment**: whether a public-facing privacy policy exists and matches this document's data-handling description is `TBD` — not verified against any source document supplied.

No claim of formal legal compliance (e.g., GDPR, DPDP Act) is made here, since compliance has not been independently verified against applicable law.

---

## 20. Secrets Management

- **Environment variables**: All secrets and environment-specific values (MongoDB Atlas URI, JWT signing secret, EmailJS keys, Razorpay keys, Cloudinary credentials, allowed CORS origin, cookie domain/secure flags) are read from `process.env`, populated by `dotenv` locally and by Hostinger's environment configuration in production — never hardcoded, never committed (BE-14).
- **Secret storage**: local `.env` files only, never committed; production secrets live exclusively in Hostinger's environment-variable panel (DEP-04).
- **`.gitignore`**: `.env*` files are gitignored except `.env.example` (names only, no real values), which is committed so required configuration is discoverable (DEV-02).
- **No secrets in Git**: enforced by the above `.gitignore` rule and by never hardcoding a fallback secret value in code.
- **No secrets in frontend bundles**: anything `VITE_`-prefixed is bundled into client-visible JS — a secret never gets that prefix and never lives in the frontend `.env` file at all (SEC-03).
- **No secrets in logs**: server logs never include the submitted password, JWT, or full third-party credential values (`TRD.md` LOG-01/LOG-03/LOG-06, §26).
- **No secrets in URLs**: no API key or token is ever passed as a URL query parameter; the JWT travels only via the `httpOnly` cookie (§5).
- **Secret rotation**: strong credentials are generated, not chosen, and rotated immediately if ever exposed (e.g., accidental commit, log leak) (`DATABASE.md` §5); a routine (non-incident-driven) rotation schedule is `TBD`.
- **Compromised-secret response**: covered by §32 (Incident Response) — immediate rotation plus investigation of exposure scope.
- **Separate development/production credentials**: development and production never share a database, DB user, or third-party API key set (`DATABASE.md` §1/§16, `TRD.md` §21.3).
- **Minimum required permissions**: the production DB user has exactly `readWrite` on the app's own database — nothing broader (`DATABASE.md` §16); third-party API keys (Razorpay, Cloudinary, EmailJS) are used with whatever minimum scope each provider's dashboard allows, where configurable.

---

## 21. Dependency & Supply-Chain Security

- **Dependency minimization**: no package outside the documented stack list is installed without a specific, named requirement (`TRD.md` §2.1/§2.2, `CODING-RULES.md` §2).
- **Lockfile**: `package-lock.json` is committed in both `frontend/` and `backend/` so installs are reproducible across machines and on Hostinger (DEV-05).
- **Version control**: dependency versions are tracked via the committed lockfile; no dependency is installed with a floating/unpinned version relied upon in production without the lockfile pinning it.
- **Vulnerability scanning / `npm audit`**: run before each production deployment to check for known vulnerabilities in both `frontend/` and `backend/` dependency trees (`TRD.md` SEC-16).
- **Malicious-package awareness**: new dependencies are added only per the justification test in `CODING-RULES.md` §5 (does it already exist, is it already covered, does it provide clear value) — reducing the surface for a typosquatted or malicious package to be introduced casually.
- **Transitive dependencies**: covered by the same `npm audit`/lockfile discipline above — transitive vulnerabilities are surfaced by the audit tool, not manually tracked.
- **Unused-package removal**: a dependency is removed once confirmed genuinely unused, after grepping every import path (`CODING-RULES.md` §5).
- **Update policy**: dependency updates are applied deliberately, not automatically merged without review; a high/critical vulnerability with an available fix is patched before deploying rather than deferred indefinitely (`TRD.md` SEC-16).
- **Security patches**: prioritized ahead of feature work when `npm audit` flags a high/critical issue with an available fix.
- **CI security checks**: no dedicated CI pipeline running `npm audit` automatically is currently defined by source docs — `TBD`; until then, the audit is a manual pre-deploy step (`TRD.md` SEC-16).
- **Avoid unnecessary third-party scripts**: only Razorpay's checkout script (and Google Fonts, if used) are loaded from a third-party origin (§11/§14) — no analytics, ad, or other third-party script is embedded.

---

## 22. Frontend Security

- **No secret keys**: only `VITE_`-prefixed, deliberately public values (API base URL, `VITE_RAZORPAY_KEY_ID`) exist in frontend code — no secret ever gets that prefix (SEC-03, §20).
- **No privileged logic**: all authorization, price calculation, and payment verification logic lives server-side; the frontend never independently decides that an action is authorized (§4).
- **No trusted frontend authorization**: `ProtectedRoute`/frontend route guarding is a UX convenience only, never relied upon as a security boundary (§4, FR-J5).
- **XSS prevention**: covered by §11 — React's default escaping, no `dangerouslySetInnerHTML`.
- **Safe DOM usage**: no direct `innerHTML` manipulation; all rendering goes through React's virtual DOM (`CODING-RULES.md` §4).
- **Safe external links**: any external link (e.g., a social media link in the footer) uses `rel="noopener noreferrer"` where `target="_blank"` is used, preventing the opened page from accessing `window.opener`.
- **Dependency control**: covered by §21 — no unnecessary or unaudited frontend package is introduced.
- **CSP compatibility**: the frontend's build output (Vite-bundled JS/CSS) and the Razorpay checkout script are accounted for when defining the CSP source list (§14, `TBD` exact list) so the policy doesn't break legitimate functionality.
- **Secure storage strategy**: no sensitive data (tokens, secrets) is ever stored in `localStorage`/`sessionStorage`; the only client-side persisted state is non-sensitive cart contents held in React Context (`TRD.md` §2.1, `CODING-RULES.md` §15).
- **Sensitive-data minimization**: the frontend never receives more data than a given view needs — listing views receive summary fields only, per the backend's `.select()` scoping (`PERF-05`).
- **Source-map exposure**: whether production source maps are generated/publicly served is `TBD` — if enabled, they should not be treated as a security boundary (client code is inherently readable), but disabling them in production is a reasonable default to reduce reverse-engineering convenience.
- **Third-party script restrictions**: covered by §21's last bullet and §14's CSP.

---

## 23. Backend Security

- **Secure Express configuration**: a single Express application bootstraps, in order: environment loading (`dotenv`), security middleware, CORS, body parsing, cookie parsing, route registration, static-file serving (production only), and finally the centralized error handler (BE-01).
- **Middleware order**: security-relevant middleware (`helmet`, CORS, rate limiting, authentication, validation) is registered before the corresponding route's controller logic runs, never after (BE-03).
- **Validation middleware**: `express-validator` chains plus a shared `handleValidationErrors` middleware run before any controller/service logic (BE-07, §9).
- **Authentication middleware**: `protect` verifies the JWT from the `httpOnly` cookie on every protected route (BE-08, §3/§5).
- **Authorization middleware**: `protect` also checks `Admin.status`; verified identity is checked before allowing any project/retail/enquiry/order mutation (BE-09, §4).
- **Rate limiting**: `express-rate-limit`, scoped per §7.
- **Security headers**: `helmet`, expanded per §14.
- **CORS**: configured per §13.
- **Request limits**: global JSON body-parser size limit; Multer file size/count limits (§6/§17).
- **Timeouts**: see §6 — a dedicated server-side per-request timeout is `TBD`.
- **Safe error handling**: every thrown/rejected error is funneled to the centralized error-handling middleware, which returns a consistent response shape and logs full context server-side only (BE-11, §6).
- **Secure logging**: see §26.
- **Dependency security**: see §21.
- **Graceful failure**: a database connection failure at startup fails loudly and the server does not begin accepting traffic in a half-broken state (BE-01, `TRD.md` LOG-04); a mid-request failure maps to a generic 500.
- **Process isolation**: not applicable beyond the single Node.js process itself — no sandboxing/containerization beyond what Hostinger's hosting plan provides is defined by source docs (`TBD`).

---

## 24. Availability & Resource Protection

Security also protects availability, not only confidentiality/integrity.

- **DDoS considerations**: network-layer DDoS protection depends on Hostinger's platform-level protections, which are not independently documented here — `TBD`. Application-layer abuse is mitigated by rate limiting (below).
- **Rate limiting**: see §7 — the primary control against both abusive traffic and resource exhaustion via repeated expensive requests.
- **Request-size limits**: global JSON body-parser limit; Multer file size/count limits (§6/§17); exact byte values `TBD`.
- **Connection limits**: governed by Node/Express and the Hostinger platform's own connection handling; no application-level connection-limiting middleware is separately configured — `TBD` if a specific need is identified.
- **Timeout controls**: frontend Axios timeout (§6); a dedicated backend per-request timeout is `TBD`.
- **Expensive-operation protection**: every listing/filter query path is covered by an index before shipping; no `$or` across unindexed fields on high-traffic public routes (`DATABASE.md` §6/§19).
- **Database query limits**: server-side maximum `limit` enforced on every listing endpoint, independent of client-supplied values (`DATABASE.md` §19).
- **Upload limits**: Multer file size/count limits (§17).
- **Memory exhaustion prevention**: in-memory file handling (Multer) is bounded by the same size/count limits (§17); the Node process's own memory ceiling is governed by the Hostinger plan (`TRD.md` MON-03).
- **CPU exhaustion prevention**: no unbounded/synchronous CPU-heavy operation runs on the request path (`TRD.md` §27); expensive work is avoided rather than offloaded to a worker queue, since no job-queue dependency exists at this scope (`TRD.md` §2.2).
- **Queue/backpressure**: not applicable — no async job queue exists in this system's architecture.
- **Graceful degradation**: under load the system should fail predictably (`429`s from rate limiting, clear `5xx` with retry affordance) rather than silently dropping requests or corrupting data (`TRD.md` SCALE-05).
- **Health checks**: a lightweight, unauthenticated health endpoint reports basic process/database-connectivity status (`TRD.md` MON-01).
- **Failure isolation**: a failure in one integration (EmailJS, Cloudinary) does not cascade into failing an unrelated critical action (e.g., enquiry storage succeeding independently of email delivery, FR-I4).
- **Recovery**: the single Node process restarts automatically on a Hostinger-triggered redeploy or crash-recovery event (DEP-09); it does not require manual intervention to come back online after a transient failure.

No claim of immunity from DDoS or of guaranteed zero downtime is made — a brief restart window on deploy is an accepted, documented trade-off (DEP-09).

---

## 25. High-Traffic Security

- **Traffic spikes**: handled primarily through rate limiting (§7) and graceful-degradation behavior (§24) rather than auto-scaling infrastructure, which does not currently exist (`TRD.md` SCALE-01).
- **Concurrent requests**: served by Node's event loop plus Mongoose's connection pool (§18); no per-request reconnection occurs.
- **Multiple backend instances**: not part of the current architecture — production runs a single Node.js process on a single Hostinger server (`TRD.md` §20, SCALE-01).
- **Distributed rate limiting**: not currently needed given the single-instance topology; documented as a required change if multiple instances are ever introduced (`RATE-11`, §7).
- **Shared session/state requirements**: not applicable today since the JWT is stateless and cart state is client-side (`TRD.md` SCALE-02) — this statelessness is what would make a future multi-instance move feasible without a session-affinity requirement.
- **Load balancing**: not present in the current topology; a documented (not implemented) path to introduce it exists in `TRD.md` SCALE-07.
- **Cache safety at scale**: not applicable — no shared cache exists to become inconsistent across instances (§8).
- **Database connection limits**: MongoDB Atlas's own connection limits (tier-dependent) apply; the single backend process's pooled connection count stays well within typical tier limits at current scale — exact pool size is left at the Mongoose/driver default (`DATABASE.md` §19).
- **Resource exhaustion**: covered by §24.
- **Abuse detection**: covered by §7/§27.
- **Monitoring**: covered by §27.
- **Alerting**: covered by §27.
- **Capacity testing**: no load-testing has been performed or is scheduled by any source document — `TBD`; recommended before any traffic-driving event (marketing push, seasonal campaign) (`TRD.md` SCALE-03).

Security controls (rate limiting, authentication, validation) are designed to keep working unchanged if the system is ever horizontally scaled, per the documented forward-looking notes in `TRD.md` §25/§28 — but horizontal scaling itself is not implemented today.

---

## 26. Logging & Audit

- **Security events logged**: authentication failures (login), validation failures on sensitive endpoints (login, checkout, admin mutations), database connection/query errors, and external-integration failures (`TRD.md` LOG-01–LOG-05).
- **Login success/failure**: failed login attempts are logged without ever logging the submitted password (`TRD.md` LOG-03); a dedicated success-login log entry beyond the general request log is `TBD`.
- **Password/security changes**: not applicable today — no password-change/reset flow exists yet (§3); logging for it is `TBD` once implemented.
- **Admin actions**: admin-scoped API failures are logged with request context and the acting admin's identity where authenticated (`TRD.md` LOG-06); logging of successful admin mutations beyond the general request/response cycle is `TBD` if a queryable audit trail is required (§15).
- **Permission changes**: not applicable — no role/permission-change feature exists beyond the single `admin` role (§4).
- **Payment events**: Razorpay verification successes/failures are logged with the Order ID and outcome, never the full payload or a secret (`TRD.md` LOG-05).
- **Webhook failures**: not applicable — no webhook endpoint currently exists (§16).
- **Rate-limit events**: `429` occurrences are a loggable event class; dedicated structured logging for rate-limit hits beyond the response itself is `TBD`.
- **Suspicious requests**: not separately classified beyond validation/authentication failures and rate-limit hits above — a dedicated anomaly classifier is `TBD` (§6).
- **Server errors**: uncaught exceptions and errors passed to the centralized error-handling middleware are logged with request context, excluding secrets and full payment payloads (`TRD.md` LOG-01).
- **No passwords / no tokens / no API keys / no payment secrets in logs**: a hard rule across every log statement in the codebase (`TRD.md` LOG-01/LOG-03/LOG-06).
- **No unnecessary personal data in logs**: log lines carry route, method, timestamp, and — for authenticated requests — the admin identity, not full request bodies containing Enquiry/Order personal data (`TRD.md` LOG-06).
- **Log retention**: no defined retention period exists in any source document — `TBD`.
- **Access control**: logs are accessible only to whoever has access to the Hostinger server/hosting panel — no separate log-viewer UI or role exists in this application.
- **Tamper protection**: not implemented — `TBD`; current logging is plain server-side `console.error`/`console.warn` output via a small `logger.js` utility (`TRD.md` LOG-06), with no write-once/tamper-evident guarantee.

---

## 27. Monitoring & Alerting

- **Authentication failures**: monitored via the login-failure logs described in §26.
- **Rate-limit violations**: monitored via `429` occurrences (§7/§26).
- **Admin activity**: monitored via admin-scoped API failure logs (§15/§26); success-path admin activity monitoring beyond request logs is `TBD`.
- **Payment failures**: monitored via Razorpay verification failure logs (§16/§26).
- **API errors / 4xx/5xx spikes**: visible through the centralized error-handling middleware's logs (§6); a dedicated spike-detection/alerting tool is `TBD`.
- **CPU / RAM**: monitored via Hostinger's own platform metrics; no additional APM dependency is introduced at this scope, per the dependency-minimalism rule (`TRD.md` MON-02).
- **Database load / connection usage**: monitored via MongoDB Atlas's built-in metrics (connections, query performance, storage) (`DATABASE.md` §15).
- **Traffic / latency / availability**: no dedicated uptime/latency monitoring tool is currently integrated beyond the planned health-check endpoint (`TRD.md` MON-01) — `TBD` for a full uptime-monitoring service.
- **Suspicious patterns**: not separately monitored beyond the event classes above — `TBD` for a dedicated behavioral-anomaly system.

Alert thresholds for every item above (e.g., how many `429`s or `5xx`s trigger a notification, and to whom) are `TBD` — not decided by any source document.

---

## 28. Backup & Recovery Security

- **Backup frequency**: MongoDB Atlas's automated Cloud Backup, at the snapshot frequency provided by the cluster tier in use (`DATABASE.md` §13); exact frequency is `TBD` (tier-dependent).
- **Backup encryption**: provided by Atlas's own backup infrastructure for the managed cluster tier in use — no separate application-level backup-encryption step is implemented.
- **Access control**: backups are accessible only through the same Atlas project access that governs the production cluster itself — no broader access than the production database's own access control (§18).
- **Retention**: governed by the Atlas cluster tier's backup retention policy; exact retention window is `TBD`.
- **Backup isolation**: backups are Atlas-managed and isolated from the application's own network/credential surface — the backend has no direct read/write path to backup storage.
- **Restore testing**: point-in-time restore is verified to actually work before being relied upon in an incident, restoring into a scratch database first, verifying integrity, then cutting over — never restoring directly on top of the live production database without a verified copy (`DATABASE.md` §13).
- **Recovery procedure**: cross-check restored data against `Order`/`Enquiry` timestamps to identify what, if anything, was lost between the snapshot and the incident (`DATABASE.md` §13).
- **Secret recovery**: not applicable to database backups — secrets live in environment variables, not the database (§20); a lost/rotated secret is recovered by re-issuing it from the relevant provider (Atlas, Razorpay, Cloudinary, EmailJS), not by restoring from a backup.
- **Database recovery**: no destructive operation (bulk delete, schema drop) runs against production without a recent, verified backup and a second person's confirmation (`DATABASE.md` §13).
- **Ransomware/tampering considerations**: not separately addressed by any source document beyond the backup/restore discipline above — `TBD` for a dedicated ransomware-response plan; the least-privilege DB user and network allowlisting (§18) reduce (but do not eliminate) the risk of a compromised credential enabling mass data tampering.

---

## 29. Deployment & Infrastructure Security

- **HTTPS / TLS**: enforced for all client-server and server-external-service communication in production, via the Hostinger domain's SSL certificate (SEC-11, DEP-05).
- **Production configuration**: `NODE_ENV=production` gates error verbosity, cookie `secure` defaults, and whether the static-serving/SPA-fallback middleware is mounted (BE-14, DEP-06's related config).
- **Secure environment variables**: all backend secrets are entered into Hostinger's Node.js application environment-variable configuration panel — never committed, never hardcoded as a fallback in production code paths (DEP-04, §20).
- **Firewall/network restrictions**: MongoDB Atlas's IP access list is the primary network-restriction control, scoped to the backend's outbound IP(s) (DEP-08, §18); no additional application-level firewall is defined or managed outside Hostinger's own platform.
- **Reverse proxy / load balancer**: not present in the current single-server topology (`TRD.md` §20) — Express directly serves both the API and the static frontend.
- **CDN**: Cloudinary serves as the CDN for images only (§8); no CDN fronts the application shell or API.
- **Health checks**: a lightweight, unauthenticated health endpoint reports process/database-connectivity status (`TRD.md` MON-01).
- **Secure deployment**: Git-based deploy via Hostinger's Node.js application feature — every push to the production branch (or a manually triggered deploy) pulls the latest code (DEP-01).
- **Rollback**: because deployment is Git-based, rolling back means redeploying a previous commit/branch state; the production branch is kept in a state that is always either the current intended release or a clean previous one, never mid-merge (DEP-10).
- **Dependency scanning**: see §21 — `npm audit` before each production deployment.
- **Server access control**: access to the Hostinger hosting panel/server itself is limited to the studio's authorized personnel — exact access-list management (who has Hostinger panel credentials) is `TBD`, outside this application's own access-control mechanisms.
- **SSH/admin access to the server**: governed entirely by Hostinger's own platform (this is a managed Node.js hosting plan, not a raw VPS with independent SSH hardening requirements documented here) — `TBD` if direct server access is ever required.
- **Debug mode disabled**: `NODE_ENV=production` ensures verbose/debug error output is never served in production (SEC-09, §6).
- **Production error handling**: covered by §6 — generic client-facing errors, full detail logged server-side only.
- **Monitoring**: covered by §27.

---

## 30. Third-Party Services

| Service | Purpose | Data shared | Authentication method | Secret storage | Required permissions | Webhook security | Failure behavior | Timeout/retry |
|---|---|---|---|---|---|---|---|---|
| **MongoDB Atlas** | Primary datastore for all application data | Projects, Retail, Enquiries, Orders, Admin accounts | Atlas SCRAM DB user + IP allowlist + TLS | `MONGODB_URI` in backend environment variables (§20) | `readWrite` on the app's own database only (§18) | Not applicable (not a webhook-based service) | Connection failure logged loudly at startup; the server does not begin accepting traffic in a broken state (BE-01) | No dedicated retry-with-backoff is currently implemented — `TBD` |
| **Razorpay** | Payment order creation, checkout UI, payment verification | Order amount, customer name/email/phone (as required for checkout), Razorpay order/payment references | Server-side API key pair (`RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET`); frontend uses only the public key ID | Secret key server-side only, never `VITE_`-prefixed (§16, §20) | Standard checkout/order-creation/payment-verification API scope — no broader account access is used | No webhook endpoint currently implemented (§16); if added, requires webhook-secret signature verification | Provider errors are caught, logged, and translated into a generic client-facing error; order remains in a safe `pending`/`failed` state (§16) | Frontend Axios timeout applies to any Razorpay-related backend call the same as other requests (§6) |
| **Cloudinary** | Image storage and delivery for Project/Retail media | Uploaded image binaries and derived metadata (`url`, `publicId`) | Server-side Cloudinary SDK credentials | `CLOUDINARY_CLOUD_NAME`/`CLOUDINARY_API_KEY`/`CLOUDINARY_API_SECRET` in backend environment variables (§20) | Upload/destroy permissions sufficient for image management — no broader account access is used | Not applicable (not consumed as a webhook source in this system) | Upload/delete errors are caught at the service layer, logged, and surfaced as a generic error without exposing credentials (§16) | Governed by the Cloudinary SDK's own defaults; no custom retry logic is documented — `TBD` |
| **EmailJS** | Sends an email notification when a valid enquiry is submitted | Enquiry content (name, email, phone, message) as needed to compose the notification email | Whatever EmailJS integration pattern is adopted (service/template ID, and a key that is either public or server-side depending on the pattern chosen) | Any server-side-only EmailJS credential lives in backend environment variables; any client-safe identifier is the only one ever `VITE_`-prefixed (`TRD.md` §10) | Send-only — no broader account access is used | Not applicable (EmailJS is not consumed as a webhook source in this system) | A failed EmailJS notification is logged and does not affect the success of the already-stored enquiry (FR-I4, `TRD.md` LOG-05) | No custom retry logic beyond EmailJS's own client/service behavior is documented — `TBD` |

No provider beyond the four above is used by this system; no additional third-party service is introduced here.

---

## 31. Security Testing

Automated and manual testing, cross-referencing `API.md` §25 and `QA-CHECKLIST.md` §6/§14–§16:

- **Authentication**: valid/invalid login, generic error verification, cookie flags (`httpOnly`/`secure`/`sameSite`) inspected via browser dev tools (`QA-CHECKLIST.md` §6).
- **Authorization**: every `/admin/*` route and its backend API tested both via the UI and via direct API calls without a valid session (`API.md` §25).
- **RBAC**: verified that a `disabled` admin account is rejected (`403`) even with a structurally valid token (`API.md` §27).
- **IDOR/BOLA**: verified that an admin can only reach resources through the documented endpoints/IDs and that public routes never leak unpublished data by slug guessing (§4).
- **XSS**: manual attempt to submit script-like content through the enquiry form/description fields and confirm it renders as inert text, never executes (§11).
- **CSRF**: manual verification that a cross-site form post cannot successfully attach the auth cookie, given the configured `sameSite` policy (§12).
- **Injection / NoSQL injection**: manual attempts to pass MongoDB operators (`$gt`, `$where`, etc.) through query/body fields and confirm they are rejected or treated as literal values, never executed as operators (§10).
- **CORS**: verified that a disallowed origin cannot successfully complete a credentialed request, and that preflight succeeds for the allowed origin (§13).
- **Rate limiting**: automated/manual repeated-request tests against login, admin, checkout, and enquiry endpoints, confirming `429` behavior and recovery after the window (`QA-CHECKLIST.md` §14).
- **Cache security**: verified via browser dev tools that admin/payment/auth responses carry `no-store` (`QA-CHECKLIST.md` §15).
- **File uploads**: attempts to upload a non-image file, an oversized file, and a file with a mismatched extension/MIME type, confirming rejection (§17).
- **Admin access**: full CRUD cycle tested both as an authorized admin and as an unauthenticated/unauthorized caller (`API.md` §25).
- **Payment flow**: a full checkout cycle in Razorpay test mode, including a cancelled/failed payment, confirming no successful order is ever created for it (`API.md` §25).
- **Webhooks**: not applicable today (§16) — revisit if a webhook endpoint is added.
- **Secrets**: a repo/build-output scan confirming no secret appears in frontend bundles, committed source, or logs (§20).
- **Dependency vulnerabilities**: `npm audit` run and reviewed before each release (§21).
- **API abuse**: scripted repeated/malformed requests against public endpoints to confirm rate limiting and validation hold (§7/§9).
- **Resource exhaustion**: a basic load-test against public listing/checkout endpoints to observe behavior under concurrent load (`QA-CHECKLIST.md` §13).
- **Error leakage**: a deliberately triggered `500` in a safe environment, confirming only the generic message reaches the client (§6).
- **Security headers**: verified via browser dev tools/an online header-checking tool that `helmet`'s headers and the CSP are present and correctly scoped in production (§14).

---

## 32. Incident Response

**Flow**: `Detection → Containment → Investigation → Eradication → Recovery → Secret rotation → Verification → Documentation → Post-incident review`

- **Detection**: via server-side logs (§26), monitoring (§27), a report from a user/admin, or an external notification (e.g., a provider flagging suspicious activity).
- **Containment**: the affected credential/session is invalidated immediately (rotate the JWT signing secret to invalidate all existing admin sessions if an admin account compromise is suspected, §5); the affected admin account is disabled (`Admin.status = 'disabled'`) if compromise is suspected.
- **Investigation**: server-side logs (§26) are reviewed to determine scope and timeline; database access (via least-privilege, audited Atlas access, §18) is checked for unauthorized queries/changes where feasible.
- **Eradication**: the root cause (a leaked secret, a vulnerable dependency, a misconfiguration) is fixed before restoring normal access — e.g., patching the dependency (§21), correcting the misconfiguration (§29), or closing the exposed access path.
- **Recovery**: affected data is restored from a verified backup if needed (§28), following the documented restore-into-scratch-first procedure; normal service is resumed only after the root cause is closed.
- **Secret rotation**: every credential plausibly exposed during the incident (JWT secret, Razorpay/Cloudinary/EmailJS keys, `MONGODB_URI`) is rotated as part of containment/eradication, not deferred (§20).
- **Verification**: confirm the fix holds (e.g., the previously-vulnerable path is retested, §31) and that no residual unauthorized access remains.
- **Documentation**: the incident, its timeline, root cause, and remediation are recorded — the specific storage location/format for this record is `TBD`.
- **Post-incident review**: the affected control (this document, `TRD.md`, `CODING-RULES.md`) is updated if the incident reveals a gap.

**Incident types covered by this flow**:
- Account compromise (visitor-facing — not applicable, no visitor accounts exist)
- Admin compromise
- Secret leak
- Database leak
- Payment issue (e.g., a suspected double-charge or verification bypass)
- Malicious upload
- Dependency compromise
- API abuse
- DDoS/resource exhaustion

No specific contact name, escalation phone number, or external emergency service is defined here — `TBD`, to be filled in by the studio with real, current contacts rather than invented here.

---

## 33. Security Maintenance

- **Regular dependency review**: periodic `npm audit` runs beyond the mandatory pre-deploy check (§21); cadence `TBD`.
- **Security patching**: applied promptly for high/critical findings (§21); routine (non-critical) updates on a cadence that is `TBD`.
- **Secret rotation**: a routine (non-incident-driven) rotation cadence is `TBD` (§20); incident-driven rotation is immediate and mandatory (§32).
- **Access review**: periodic confirmation that the DB user's permissions are still least-privilege, the Atlas network access list is still current, and no secret has drifted into source control (`DATABASE.md` §15); cadence `TBD`.
- **Admin account review**: periodic check that only currently-authorized studio staff hold active admin accounts, and that any departed staff member's account is disabled promptly; cadence `TBD`.
- **Backup verification**: periodic restore drills to confirm backups are actually restorable (§28, `DATABASE.md` §13); cadence `TBD`.
- **Log review**: periodic review of authentication-failure and error logs for patterns not caught by automated alerting (§26/§27); cadence `TBD`.
- **Vulnerability scanning**: covered by the dependency review above (§21); no additional infrastructure-level vulnerability scanner is currently defined — `TBD`.
- **Security testing**: the test coverage in §31 is re-run at least before every production release touching authentication, payment, or admin functionality (`CODING-RULES.md` §20's high-risk-change list).
- **Configuration review**: periodic confirmation that CORS, security headers, and environment variables in production still match this document's intent (§13/§14/§20); cadence `TBD`.
- **Incident review**: every incident handled per §32 feeds a post-incident review that may update this document or related project docs.

---

## 34. Security Checklist

- [ ] HTTPS enforced end-to-end in production (§29, SEC-11)
- [ ] Admin authentication uses `bcrypt`-hashed credentials, generic error messages, and is rate-limited (§3, §7)
- [ ] `protect` middleware independently verifies every admin request, regardless of frontend guarding (§4, §15)
- [ ] RBAC reflects the single-`admin`-role model with no speculative role infrastructure (§4)
- [ ] JWT cookie is `httpOnly`, `secure` in production, with an explicit `sameSite` policy (§5, §15)
- [ ] `express-rate-limit` applied to login, admin routes, checkout/verify, and enquiries, each with its own threshold (§7)
- [ ] `trust proxy` correctly configured so rate limiting and IP-based logic see the real client IP (§7)
- [ ] Every `/api/admin/*`, `/api/checkout*`, and `/api/auth/*` response sets `Cache-Control: no-store` (§8)
- [ ] No caching layer or CDN is configured to cache admin, payment, or authentication responses (§8)
- [ ] All mutating endpoints validate input server-side via `express-validator` before any database call (§9)
- [ ] No Mongoose filter is ever built from raw, unwhitelisted `req.query`/`req.body` (§10)
- [ ] No `dangerouslySetInnerHTML` or raw HTML rendering of user/admin-supplied content exists anywhere (§11)
- [ ] CSRF risk is addressed via `sameSite` cookie policy appropriate to the single-origin topology (§12)
- [ ] CORS allows only the exact production origin, never a wildcard, for credentialed requests (§13)
- [ ] `helmet` plus the expanded security headers (CSP, `X-Frame-Options`, `Referrer-Policy`, HSTS) are confirmed in production (§14)
- [ ] Admin panel has no unnecessary sensitive-data display and every admin mutation is authenticated + validated (§15)
- [ ] Payment success is recognized only via backend-verified Razorpay signature, never a client callback alone (§16)
- [ ] Webhook signature verification is planned/documented for if a webhook endpoint is ever added (§16) — not applicable today
- [ ] `POST /checkout` and `POST /checkout/verify` are idempotent against duplicate submission (§16)
- [ ] File uploads are restricted to validated image types/sizes and stored only via Cloudinary, never local disk (§17)
- [ ] MongoDB Atlas access is least-privilege, network-restricted, and TLS-enforced, with no direct browser access (§18)
- [ ] `RAZORPAY_KEY_SECRET`, `JWT_SECRET`, `MONGODB_URI`, and all Cloudinary/EmailJS secrets exist only server-side (§16, §20)
- [ ] No secret exists in Git history, frontend bundles, logs, or URLs (§20)
- [ ] `npm audit` (or equivalent) run and high/critical issues resolved before each production deploy (§21)
- [ ] No admin/payment/auth response is ever cacheable under any configuration (§8, §16)
- [ ] No secret, password, or full payment payload ever appears in application logs (§20, §26)
- [ ] Monitoring covers authentication failures, rate-limit violations, admin activity, payment failures, and resource usage, with alert thresholds tracked as `TBD` where undecided (§27)
- [ ] Atlas automated backups are enabled and a restore has been test-verified (§28, `DATABASE.md` §13)
- [ ] Recovery from a backend restart/crash happens automatically without manual intervention (§24, DEP-09)
- [ ] An incident-response flow (Detection → Containment → Investigation → Eradication → Recovery → Secret rotation → Verification → Documentation → Post-incident review) is documented and ready to follow (§32)
- [ ] The security test coverage in §31 is run before any release touching authentication, payment, or admin functionality (§33)
