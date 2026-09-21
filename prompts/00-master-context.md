# 00-master-context.md — Sabr Studio

This file is the entry point for any AI agent (or developer) implementing or modifying Sabr Studio. It is a **synthesis and index**, not a replacement for the 12 source documents — it tells you what they say, where they agree, where they conflict (and how that's resolved), and where to go for full detail. Nothing here invents a requirement not already present in the source set.

---

## 1. Role

You are the senior full-stack engineer (or AI coding agent) responsible for implementing, extending, or modifying Sabr Studio — a production MERN application — strictly according to the documented requirements below. You do not redesign, re-architect, or add scope on your own initiative. Before writing code you inspect the existing repository state, the relevant source document section, and this file's conflict-resolution table (Section 4).

---

## 2. Objective

Sabr Studio is a full-stack interior design studio platform: a public marketing/portfolio/e‑commerce website (projects showcase, retail product catalog + cart/checkout, enquiry capture) plus a secured admin panel (full CRUD over projects, retail, enquiries, orders). Built on MERN (MongoDB Atlas, Express, React/Vite, Node.js), deployed as a **single Node.js process on a single Hostinger server** that serves both the REST API and the built frontend.

Your objective on any given task is to implement exactly what the source documents specify — no more, no less — using only the approved technology stack, following the established folder/naming/layering conventions, and preserving every non-negotiable security, data-integrity, accessibility, SEO, and performance rule already defined.

---

## 3. Source of Truth

**Hierarchy** (higher wins on conflict — consistent across `AI-RULES.md` §1 and `CODING-RULES.md` §1):

1. `docs/PRD.md` — **what** must exist (product scope, functional requirements, acceptance criteria)
2. `docs/TRD.md` — **how** it's technically built (stack, layering, API/DB shape, non-negotiables)
3. `docs/ARCHITECTURE.md` — synthesis layer; resolves cross-document contradictions (§5 of that doc), full architectural detail, AI-agent quick-reference (§52)
4. `docs/UI-UX.md` — visual/interaction spec, design tokens
5. `docs/ANIMATION.md` — motion specification (extends UI-UX §57–59)
6. `docs/DATABASE.md` — schema, indexes, validation, data-integrity detail
7. `docs/API.md` — endpoint contract, request/response envelope detail
8. `docs/SECURITY.md` — security control detail
9. `docs/DEPLOYMENT.md` — build/environment/production-topology detail
10. `docs/CODING-RULES.md` / `docs/AI-RULES.md` — how code is written / how an AI agent must behave (enforce, never override, 1–9)
11. `docs/QA-CHECKLIST.md` — verification detail
12. `docs/FOLDER-STRUCTURES.md` — the implementation-ready repository tree (governs file/folder placement; must obey the naming/layering rules in TRD §3 and CODING-RULES §6)
13. Existing implementation / current repo state
14. The task at hand — only where it doesn't conflict with 1–13

When a task requires something not covered by 1–12, that is a signal to ask, not to invent (`AI-RULES.md` §3, `CODING-RULES.md` §1).

---

## 4. Known Conflicts Across Source Documents (read before implementing anything they touch)

The source documents were produced in sequence and are not fully self-consistent. Every conflict below was identified by cross-referencing all 12 files. Where a source document already resolves it, that resolution is restated here as binding; two items are **not** resolved anywhere and require client/stakeholder sign-off before implementation.

| # | Conflict | Where it appears | Resolution (binding) |
|---|---|---|---|
| C1 | Retail route naming: `/shop`, `/shop/:id` vs `/retail`, `/retail/:slug` | `UI-UX.md` §67/§70 use `/shop`; `PRD.md` §5, `TRD.md` §6, `API.md` §2.3, `ANIMATION.md` §13, `FOLDER-STRUCTURES.md`, `ARCHITECTURE.md` §5A-1 all use `/retail` | **`/retail` / `/retail/:slug` is canonical.** Folder = `features/retail/`, not `features/shop/`. The visible `<h1>` may still read "Products" (display copy, not a route). |
| C2 | Navbar "Login" button vs PRD's "no customer accounts" (Out of Scope) | `UI-UX.md` §01/§26–28 implies visitor-account login; `PRD.md` §2 explicitly excludes visitor auth; `ANIMATION.md` §7.5, `AI-RULES.md` §1.1, `FOLDER-STRUCTURES.md` all confirm no visitor auth is built | **No visitor/customer authentication system is built, ever.** The Login CTA is implemented **visually only** (position/styling per UI-UX), not wired to any fabricated auth flow. **Its destination is unresolved between sources**: `ARCHITECTURE.md` §5A-2 *assumes* it links to `/admin/login` but flags this explicitly as needing client confirmation; `FOLDER-STRUCTURES.md` and `AI-RULES.md` §1.1 say leave it inert/unwired until the client clarifies. **Do not wire this button to any destination without explicit confirmation** — treat `ARCHITECTURE.md`'s `/admin/login` linkage as an unconfirmed assumption, not a requirement. |
| C3 | Icon library: `react-icons` vs `lucide-react` | `TRD.md` §0/§2.1 mandates `react-icons`; `UI-UX.md` §21 names `lucide-react` | **Use `react-icons` only** (`react-icons/lu` sub-package provides the same Lucide icon set/stroke style referenced in UI-UX). Never install `lucide-react` as a separate dependency (`AI-RULES.md` §1.2). |
| C4 | Enquiry form: `email` required vs optional | `PRD.md` §8 marks email required; `UI-UX.md` §75 marks it optional (validated only if filled) | **PRD wins — email is required**, both client- and server-side. `DATABASE.md` §2.3 already documents this conflict and its resolution inline. Flag to design/client before the form ships since UI copy may currently imply otherwise. |
| C5 | Enquiry form "Project Type" field | `UI-UX.md` §75 specifies a required `Project Type` select (Furniture / Interior Design / Architecture / Other); `FOLDER-STRUCTURES.md`'s database map lists `projectType` on `enquiry.model.js` | **`PRD.md` §8 and `DATABASE.md` §2.3's canonical Enquiry schema do not include a `projectType`/`Project Type` field.** No source document explicitly resolves this — it is **not** addressed in `ARCHITECTURE.md` §5 or `AI-RULES.md` §1. **Do not add this field silently.** Default to the PRD/DATABASE.md schema (no `projectType`) and flag the discrepancy back to the client/team before building the enquiry form, per the source-of-truth escalation rule. |
| C6 | Admin panel visual spec | `UI-UX.md` §01 states the admin panel UI is explicitly out of scope for that document | **Gap, not a contradiction.** Admin panel functionality/routes are fully defined (PRD §5/§7, TRD §6/§8); its visual layer reuses the public site's design tokens (colors, type, spacing, radius, the one `<Button/>`) per `ARCHITECTURE.md` §5A-4, with a sidebar/table-first layout as an implementation decision, not a UI-UX requirement. |
| C7 | "Wishlist" terminology | `PRD.md` §2 excludes "Wishlist functionality"; UI-UX's client brief calls the Cart a "wishlist" | **No real conflict.** The Cart (PRD FR-F) is the only save/purchase mechanism; no separate save-for-later feature exists. |

**Rule for any future conflict discovered mid-task**: do not silently pick a side. State the conflict, resolve it per the Section 3 hierarchy for the purpose of continuing the current task, and flag it back in your report (`AI-RULES.md` §24, §25.14) — never resolve a documented conflict differently from this table without raising that explicitly.

---

## 5. Scope

### In scope (PRD §2)
- Public site: Home, Projects (listing + `/projects/:slug` detail), Retail (listing + `/retail/:slug` detail), Services, About, Contact, Cart.
- Project showcase (category-based), retail catalog, cart (add/update/remove/view total), Razorpay checkout for retail (and configured purchasable projects).
- Reusable enquiry form (client + server validated) → MongoDB + EmailJS notification.
- Admin panel: authentication, dashboard, full CRUD on Projects/Retail, Enquiry management, Order management, Cloudinary-backed image upload.
- SEO (metadata, sitemap, robots.txt), responsive design (320px–3840px), WCAG 2.2 AA accessibility target.

### Explicitly out of scope (PRD §2 — never build under any framing)
- Customer/visitor account or registration system, order history, saved profiles (see C2).
- Booking/appointment scheduling.
- Product reviews/ratings.
- Wishlist/save-for-later beyond the Cart (see C7).
- Push/SMS notifications (EmailJS enquiry notification only).
- Analytics dashboards/reporting beyond the admin's basic overview counts.
- A second CMS/content layer beyond the one admin panel.

### Routes (canonical — PRD §5, confirmed by TRD/API/ARCHITECTURE; see C1)
| Public | Admin |
|---|---|
| `/` `/projects` `/projects/:slug` `/retail` `/retail/:slug` `/services` `/about` `/contact` `/cart` | `/admin/login` `/admin` `/admin/projects` `/admin/retail` `/admin/enquiries` `/admin/orders` |

Do not add, remove, or rename a route without explicit approval (`TECH-17`).

---

## 6. Implementation Requirements

### 6.1 Non-negotiable technology stack (`TRD.md` §0/§2, restated identically in `AI-RULES.md` §2 and `CODING-RULES.md` §2)

**Frontend**: React, JavaScript-only (`.jsx`, **no TypeScript in any form**), Vite, Tailwind CSS (styling default), Framer Motion, GSAP + `ScrollTrigger`, Lenis, `react-icons` (see C3), `react-intersection-observer`, `react-router-dom`, `axios`.

**Backend**: Node.js + Express, `mongoose`, `bcrypt`, `jsonwebtoken`, `cookie-parser`, `express-validator`, `multer`, `cloudinary`, `razorpay`, `cors`, `helmet`, `express-rate-limit`, `dotenv`, `nodemon` (dev only). `compression` is the one pre-approved exception (`TRD.md` §27, PERF-15) if response compression is needed and the platform doesn't already provide it.

**Database**: MongoDB Atlas only, via Mongoose — no local Mongo dependency past initial setup.

No package outside these lists is installed without a named PRD/TRD requirement nothing on the list already satisfies (`TECH-14`). Full dependency list: `TRD.md` §23.

### 6.2 Architecture & layering
- **Frontend**: feature-based folders (`src/features/<feature>/{components,data,hooks}`), never type-based. A component graduates to `src/shared/` only once ≥2 features use it. Static, non-backend content lives in `*.data.js` files (plain data only, mandatory suffix) — never hardcoded JSX (`TRD.md` §3.3, DATA-01–04). Backend-driven content is always fetched via the single `axiosClient`.
- **Backend**: strict one-directional layering — **Routes → Controllers → Services → Models**. Controllers never run a Mongoose query directly; routes carry no business logic; `services/` owns business rules and external-service orchestration (Cloudinary, Razorpay, EmailJS).
- Naming conventions (exact, no deviation): `PascalCase.jsx` components, `camelCase.data.js` data files, `useCamelCase.js` hooks, `camelCase.js` utilities, `resource.controller.js` / `.routes.js` / `.model.js` / `.service.js` / `.middleware.js` / `.validators.js` backend files, `resource.api.js` frontend API modules.
- The definitive repository tree is `FOLDER-STRUCTURES.md`; it must be read before creating any new top-level structure. `backend/public/` is generated build output only — `.gitignore`d, never hand-edited.
- Full architectural detail, ADRs, and the AI-agent "where new things go" quick-reference: `ARCHITECTURE.md` §6–§38, §52.

### 6.3 API contract (`TRD.md` §6, full detail `API.md` §2, do not rename/restructure without updating both docs + every frontend consumer)

| Resource | Endpoints |
|---|---|
| Auth | `POST /api/auth/login` (public, rate-limited) · `GET /api/auth/me` · `POST /api/auth/logout` |
| Projects | `GET /api/projects` (public, published-only) · `GET /api/projects/:slug` (public) · `GET/POST/PUT/DELETE /api/admin/projects[...]` (admin) |
| Retail | `GET /api/retail` (public, published+available) · `GET /api/retail/:slug` (public) · `GET/POST/PUT/DELETE /api/admin/retail[...]` (admin) |
| Cart/Checkout | `POST /api/checkout` (public, rate-limited; re-validates + computes amount server-side; rejects empty cart) · `POST /api/checkout/verify` (public, rate-limited; verifies Razorpay signature) |
| Orders | `GET /api/admin/orders[...]` · `PATCH /api/admin/orders/:id/status` (order status only — **never** payment status) |
| Enquiries | `POST /api/enquiries` (public, rate-limited) · `GET/PATCH/DELETE /api/admin/enquiries[...]` (admin-only, never public) |

Uniform envelope: `{ success: true, data }` / `{ success: false, message, errors? }`. Status codes: 400 validation, 401 unauthenticated, 403 unauthorized, 404 not found, 409 conflict, 500 server error.

### 6.4 Database (5 Mongoose collections — full schema `DATABASE.md` §2, requirements `TRD.md` §7)
Projects, Retail, Enquiries, Orders, Admin. Key non-negotiables:
- Slugs (Projects/Retail) are **server-generated**, unique, lowercase — never trusted from client input; effectively immutable once published.
- Order line items are **embedded snapshots**, never a live `ref`/populate — this is what protects historical orders from later product edits/deletion (ADR-05). Never "simplify" this.
- `Order.amount` is computed **server-side only**, in the checkout service — never accepted from client input at any layer.
- `Order.paymentStatus` and `Order.orderStatus` are separate enum fields, set through different paths (payment status only via verified Razorpay signature; order status only via the admin PATCH endpoint) — never conflated.
- `Enquiry.phone` is always `String`, never `Number`. `Enquiry` is never exposed via any public endpoint.
- `Admin.password` is `select: false` by default; hash is never returned in any response.
- Required indexes: unique `slug` (Projects/Retail), `{published, category}` / `{published, availability}`, `{status, createdAt:-1}` (Enquiries), `{paymentStatus, orderStatus}` + Razorpay ID lookups (Orders), unique `email` (Admin).

### 6.5 Authentication & authorization (`TRD.md` §8, `SECURITY.md` §3–5)
- Admin-only auth: `bcrypt`-hashed passwords, JWT signed with admin ID + role only, set as `httpOnly`, `Secure` (production), `SameSite` cookie — **never** in the JSON body, **never** in `localStorage`/`sessionStorage`.
- Invalid credentials → one generic error (doesn't reveal account existence).
- Frontend route protection (`ProtectedRoute`) is a UX convenience only — every `/api/admin/*` route independently re-verifies the JWT and account status server-side, regardless of frontend state or direct API access.
- Single `admin` role is sufficient at current scope — do not add a role system that isn't requested.

### 6.6 Payments — highest-risk area (`TRD.md` §12, `AI-RULES.md` §12)
- Never trust a client-supplied amount; the backend re-validates item existence/availability/price and computes the payable amount server-side on every checkout.
- A payment is successful **only** after backend verification of Razorpay's signed response — a client-side success callback alone is never sufficient.
- Failed/cancelled payments never produce a successful order. Admins **cannot** manually mark a payment successful.
- Empty carts are rejected server-side regardless of client state.

### 6.7 Enquiries & EmailJS (`TRD.md` §10)
- Enquiry is persisted to MongoDB **first**; EmailJS notification is a subsequent, independently try/caught step — an EmailJS failure never causes a successfully-stored enquiry to be reported as failed to the user (FR-I4).
- Client validation is UX-only; `express-validator` is authoritative. See C4/C5 for the two unresolved field-level conflicts on this form.

### 6.8 Image handling (`TRD.md` §17, `AI-RULES.md` §14)
- Multer validates type/size/count in-memory (never written to local disk in production) before forwarding to Cloudinary. MongoDB stores only `{url, publicId}` — never binary data. Deleting a Project/Retail item flags its Cloudinary assets for `destroy` via the stored `publicId`.

### 6.9 UI/UX & animation (full detail `UI-UX.md`, `ANIMATION.md`)
- One `<Button/>` component exists and is used for every button everywhere — no second implementation.
- Fixed design tokens only (colors, Abhaya Libre + Inter type scale at weights {400,500,600}, 8px-based spacing scale, radius {0,4,8,full}, two shadow states) — do not introduce a new value without updating `UI-UX.md` first.
- Animation library boundary is strict and non-negotiable: **Framer Motion** owns component-scoped animation (enter/exit, hover/tap, modals, route/page transitions if any); **GSAP + ScrollTrigger** owns anything scroll-position-driven (pinning, scrubbing); **Lenis** is the single scroll source of truth, synced to ScrollTrigger. Never solve a scroll-driven interaction with Framer Motion's `whileInView`.
- `prefers-reduced-motion` disables/shortens all non-essential animation everywhere without hiding functional content.
- No page-route-transition animations exist (`ANIMATION.md` §20 — explicit exclusion).

### 6.10 SEO & accessibility
- Unique `<title>`/meta description per indexable page via a shared `SEO` component; canonical URL from one `SITE_URL` constant; server-generated URL-safe slugs; dynamic `robots.txt`/XML sitemap reflecting current publish state (never stale/hand-maintained); WCAG 2.2 AA target (semantic HTML, full keyboard operability, visible focus, labeled forms, `aria-describedby` on errors, no color-only signaling, managed modal/drawer focus, ≥44×44px touch targets).

### 6.11 Deployment (`DEPLOYMENT.md`, `TRD.md` §20)
- **Single Hostinger Node.js process** serves both `/api/*` and the built frontend (`frontend/dist/` copied into `backend/public/`) — never two separate hosted services. Vercel is **preview-only for the frontend**, never production.
- SPA catch-all route (after all `/api/*` routes and static middleware) serves `index.html` for any non-API GET, enabling deep-link/refresh support.
- Build order: install + `vite build` frontend → copy `dist/` into `backend/public/` → install backend prod deps → `node server.js`. Full checklist: `DEPLOYMENT.md` §11.

---

## 7. Constraints

- Do not invent features, routes, fields, environment variables, or dependencies not present in the source documents.
- Do not change documented public/admin routes, the API contract, or the deployment topology without explicit approval.
- Do not bypass backend validation under any circumstance, regardless of frontend validation outcome.
- Do not allow unauthenticated or unauthorized admin operations, whether via the admin UI or a direct API call.
- Do not trust client-supplied payment amounts or client-side payment success callbacks as authoritative.
- Do not expose secrets (JWT signing key, DB credentials, Razorpay secret, Cloudinary secret, EmailJS private credential) to the frontend — never give a secret a `VITE_` prefix.
- Do not introduce TypeScript, a state-management library beyond the two established Contexts (`AuthContext`, `CartContext`), a UI kit, a second icon or animation library, Redis, GraphQL, or any package outside §6.1 without a named, otherwise-unsatisfiable requirement.
- Do not silently resolve any of the conflicts in Section 4 differently from the stated resolution — surface it explicitly if a task touches it.
- Do not perform repo-wide refactors, renames, or dependency bumps as a side effect of a focused task. Every task splits into Requested / Required supporting changes / Optional improvements — optional improvements are never implemented silently (`AI-RULES.md` §4).
- Files/patterns requiring extra caution before any change (`ARCHITECTURE.md` §52.2): `middleware/auth.middleware.js` (`protect`)/JWT logic, `services/checkout.service.js`'s price/signature-verification logic, any `.env` naming, the Order schema's embedded-snapshot design.
- Many numeric thresholds are intentionally `TBD` in the source docs (rate-limit values, cache TTLs, exact file-size/message-length caps, CSP source list, load-testing capacity targets — see `TRD.md` §25–28). Define these once as named constants when the task requires it; do not treat an invented number as a specification.

---

## 8. Verification

Before considering any change complete, verify against the relevant subset of:
- **Acceptance criteria**: `PRD.md` §12, `TRD.md` §24 (technical acceptance).
- **API correctness**: `API.md` §27 (checklist), §24 (documented request/response examples).
- **Database integrity**: `DATABASE.md` §18 (final checklist).
- **Security**: `SECURITY.md` §34 (checklist) — especially payment verification, auth boundary, secret exposure.
- **QA**: `QA-CHECKLIST.md` — functional, responsive (320px–3840px at the defined breakpoints), accessibility, performance, SEO, error/edge cases.
- **Animation**: `ANIMATION.md` §19 (functional + responsive/accessibility/performance checks).
- Report using the format in `AI-RULES.md` §23–24: **Verified / Not Verified / Unable to Verify**, never claiming a check passed that wasn't actually run.

---

## 9. Completion Criteria

A task is complete only when:
1. The change satisfies the specific PRD/TRD requirement(s) it was scoped against — nothing more, nothing less.
2. It uses only the approved stack (§6.1) and follows the established layering/naming conventions (§6.2).
3. All required supporting changes are made (e.g., a new field touches the model, validator, controller, admin form, and any frontend consumer — not a subset).
4. No conflict in Section 4 was silently resolved differently from its stated resolution.
5. Backend validation, authentication/authorization, and payment-verification rules remain intact and independently enforced, unaffected by unrelated changes.
6. Accessibility, SEO, and responsive behavior for the affected surface are preserved or improved, never regressed.
7. The change has been actually verified (§8) against its affected functionality — happy path, failure path, edge cases — and reported honestly, including anything not verifiable in the current environment.
8. Any newly discovered ambiguity or contradiction is flagged back explicitly rather than silently decided.
