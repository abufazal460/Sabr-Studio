# AI-RULES.md — Sabr Studio

Permanent rulebook for any AI coding agent working on this repository. Derived from `PRD.md`, `TRD.md`, and `UI-UX.md`. This file governs **AI behavior**; it does not override or restate product/technical requirements — it enforces them.

> **Note on source documents**: Only `PRD.md`, `TRD.md`, and `UI-UX.md` were supplied. No `ARCHITECTURE.md` exists yet. Until one is supplied, `TRD.md` Sections 3–9 (folder principles, layering, API/DB requirements) are the authoritative architecture reference. If an `ARCHITECTURE.md` is added later, re-run the conflict check in Section 1 below against it before treating it as authoritative.

---

## 1. Source-of-Truth Hierarchy

1. `PRD.md` — product requirements (what must exist, what must not)
2. `TRD.md` — technical requirements (how it is built)
3. `UI-UX.md` — visual/interaction spec
4. *(`ARCHITECTURE.md` — not yet supplied; see note above)*
5. Existing implementation / current repo state
6. The user's current task — only if it does not violate 1–4

When two documents disagree, **do not silently pick one**. State the conflict, resolve it per this hierarchy for the purpose of continuing work, and flag it back to the user/team as needing formal sign-off. Two conflicts already exist in the current document set and must be treated this way until resolved:

### 1.1 Documented conflict — visitor "Login"

`UI-UX.md` §26–28 specifies a navbar/mobile-drawer **"Login" button** and states visitor accounts are "used only for checkout/order context." `PRD.md` Section 2 ("Out of Scope") explicitly excludes **"Customer account/registration system (no visitor login, order history, or saved profiles)"**, and FR-A/FR-G define checkout as guest-only (customer info collected per-order, not tied to an account).

- **Resolution under this hierarchy**: PRD wins. **Do not implement any visitor authentication, registration, or account system.** No `/login` route or visitor session logic for shoppers is built.
- The navbar CTA is implemented visually per `UI-UX.md` (position, styling, "Login" label as supplied) **only until the client clarifies its actual destination/behavior**. Do not silently wire it to a fabricated auth flow. Do not silently rename/remove it either — flag it explicitly in your task report and ask for clarification if the task at hand depends on this button's behavior.
- This does not affect **admin** authentication (`/admin/login`), which is required and unrelated to visitor accounts.

### 1.2 Documented conflict — icon library

`TRD.md` Section 0/2.1 (Non-Negotiable Stack) mandates **`react-icons`** for all iconography and explicitly excludes introducing alternative icon libraries without justification. `UI-UX.md` §21 specifies **`lucide-react`** by name as "the" icon library, citing its stroke style.

- **Resolution under this hierarchy**: TRD wins (technical stack constraints outrank a UI doc's implementation-detail suggestion). **Use `react-icons`.** `react-icons` bundles Lucide's icon set as `react-icons/lu`, which can satisfy the same thin-outline visual spec (stroke width, sizing) referenced in `UI-UX.md` §21 without adding a second icon dependency.
- Do not install `lucide-react` as a separate package to satisfy `UI-UX.md` literally — that would violate TECH-09/TECH-14 (dependency constraints) for a requirement that is fully satisfiable through the mandated package.
- Flag this resolution in any task report that touches iconography, in case the client's intent was genuinely a different visual set requiring an actual exception.

---

## 2. Non-Negotiable Technology Stack

No package outside this list is installed without an explicit, named requirement in `PRD.md`/`TRD.md` that cannot otherwise be met (`TECH-14`).

**Frontend**: React (`.jsx` only — **no TypeScript in any form**, no `.ts`/`.tsx`, no `tsconfig.json`, no `@types/*`), Vite, Tailwind CSS (styling default), Framer Motion, GSAP + `ScrollTrigger`, Lenis, `react-icons`, `react-intersection-observer`, `react-router-dom`, `axios`.

**Backend**: Node.js + Express, `mongoose`, `bcrypt`, `jsonwebtoken`, `cookie-parser`, `express-validator`, `multer`, `cloudinary`, `razorpay`, `cors`, `helmet`, `express-rate-limit`, `dotenv`, `nodemon` (dev only).

**Database**: MongoDB Atlas only (no local Mongo dependency past initial setup).

**Explicitly excluded** unless a specific requirement later forces otherwise: TypeScript/`@types/*` (never), Redux/Zustand/Recoil, CSS-in-JS, MUI/Chakra/Ant Design or any UI kit, `moment`/`day.js`, Passport.js, GraphQL, Redis, a job-queue/worker system, Winston/Pino (plain structured `console.error` via a `logger.js` utility is sufficient at this scope), `lucide-react` as a standalone package (see §1.2).

**Full dependency lists** are `TRD.md` Section 23 — treat as exhaustive. Adding anything not on that list requires citing the specific PRD/TRD requirement it satisfies that nothing on the list can.

---

## 3. Core Workflow

```
Understand → Inspect → Search → Trace → Plan → Implement → Test → Review → Report
```

- Inspect the relevant feature folder, model, route, and data file **before** writing code. Determine whether the requested functionality already exists (a component, a `*.data.js` file, a service function, an API route) before creating something new.
- Fix root causes, not symptoms. Make the smallest change that correctly satisfies the requirement — but "smallest" includes required supporting changes (e.g., a new field on `Retail` also needs its `express-validator` chain and its Mongoose schema update; skipping either is not "minimal," it's incomplete).
- Never present an assumption as a documented requirement. If a detail is genuinely undefined (e.g., a specific `bcrypt` cost factor, a specific JWT expiry duration) and implementation can proceed safely with a reasonable default, state the default explicitly in your report. If the missing detail could change security posture, data shape, or money handling, stop and ask.

---

## 4. Scope Control

Every task splits into:
- **Requested** — what was explicitly asked.
- **Required supporting changes** — technically necessary to complete it (e.g., adding a new `Retail` field requires touching the model, the validator, the admin form, and the admin API controller — not just one of them).
- **Optional improvements** — never implemented silently.

A request to fix the Retail listing is not license to touch Projects, redesign the Navbar, or upgrade a dependency. Do not perform repo-wide refactors, renames, or dependency bumps as a side effect of a focused task.

**Permanently out of scope** (`PRD.md` Section 2 — do not build any of these under any framing):
- Customer/visitor account or registration system, order history, saved profiles (see §1.1).
- Booking/appointment scheduling.
- Product reviews/ratings.
- Wishlist/save-for-later (the "Cart" is the only cart-like feature — see `UI-UX.md`'s resolved ambiguity, §01).
- Push/SMS notifications (EmailJS only, and only for enquiries).
- Analytics dashboards/reporting beyond the admin's basic overview counts.
- A second CMS or content layer beyond the one admin panel.

---

## 5. Folder Structure & Naming (`TRD.md` §3)

- **Feature-based**, not type-based. No monolithic root-level `components/`/`hooks/` grab-bag. Each feature folder (`features/projects/`, `features/retail/`, `features/home-hero/`, etc.) owns its own `components/`, `data/`, and hooks where relevant.
- A component graduates to `src/shared/` (or `src/common/`) only once **two or more** features actually use it — not preemptively.
- Naming, exactly as specified — do not deviate:
  - Components: `PascalCase.jsx`
  - Data files: `camelCase.data.js` (mandatory suffix, every static-content file)
  - Hooks: `useCamelCase.js`
  - Utilities: `camelCase.js`
  - Backend: `resource.controller.js`, `resource.routes.js`, `resource.model.js`, `resource.service.js`, `resource.middleware.js`
- Backend layering is strict and one-directional: **Routes → Controllers → Services → Models**. Controllers never run a Mongoose query directly; they call a service. Routes carry no business logic. `config/` holds `db.js` and `cloudinary.js`. `utils/` holds pure helpers only.
- `backend/public/` exists only to receive the built frontend `dist/` output at deploy time. It is `.gitignore`d and never hand-edited.

### 5.1 No hardcoded UI content (`DATA-01`–`DATA-04`)

- Static, non-backend-driven copy (hero text, service descriptions, footer links, nav labels, FAQ copy, testimonial placeholders) lives in that feature's `*.data.js` file as a plain object/array export — never inline JSX strings.
- Backend-driven content (projects, retail items, enquiries, orders) is **never** hardcoded on the frontend — always fetched via the shared `axios` client. `*.data.js` is exclusively for static content.
- A `*.data.js` file exports plain data only — no JSX, no logic, no side effects.

---

## 6. Frontend Rules

- **Routing** (`react-router-dom`) matches `PRD.md` Section 5 exactly. Do not add, remove, or rename a route without explicit approval:

  | Public | Admin |
  |---|---|
  | `/` `/projects` `/projects/:slug` `/retail` `/retail/:slug` `/services` `/about` `/contact` `/cart` | `/admin/login` `/admin` `/admin/projects` `/admin/retail` `/admin/enquiries` `/admin/orders` |

  All `/admin/*` except `/admin/login` sit behind a `ProtectedRoute` — a **UX convenience only**; the backend independently re-checks auth on every request (`FR-J5`). Admin code is loaded via `React.lazy`/`Suspense` so public visitors never download admin JS (`FE-31`, `PERF-03`).

- **State**: exactly two cross-cutting Context providers — `AuthContext` (admin session) and `CartContext` (cart contents + informational total). Everything else stays local to its owning component/feature. No global state library is introduced (`FE-09`). Cart persists only for the tab/session lifetime unless a persistence requirement is later added explicitly.
- **API layer**: one `axiosClient` (`import.meta.env.VITE_API_BASE_URL`, `withCredentials: true`). No component calls `fetch`/`axios` directly — everything routes through this client so error normalization is uniform (`FE-10`).
- **Forms** (enquiry, checkout, all admin CRUD): controlled components, client validation for UX only, submit-lock via `isSubmitting` state (prevents duplicate submission — `FR-I5`), inline (not toast-only) success/error feedback. No form library unless admin form complexity later genuinely requires one — and that decision is made explicitly, not defaulted into.
- **Every data-dependent view** implements all of: loading (skeleton/spinner), error (non-crashing, retry where sensible), empty (no fabricated content), not-found (`FR-C4`, `FR-E3` — invalid/deleted/unpublished slugs). No view is left permanently spinning on failure (`FR-P3`).
- **Images**: render only via Cloudinary URLs with `f_auto`/`q_auto` transform params appended by a shared `buildCloudinaryUrl` helper — never a raw full-resolution URL in a small card. Every `<img>` reserves space via explicit dimensions or an `aspect-*` class before load (zero layout shift). Below-the-fold images use `loading="lazy"`; hero images use `loading="eager"` (and `fetchpriority="high"` on the first, per `UI-UX.md` §66).
- **List rendering**: stable keys are the resource's `_id`/`slug` — never array index for data that can reorder or change (`FE-32`).

---

## 7. Animation Architecture — Strict Library Boundary

This boundary is a rule, not a preference (`TRD.md` §0, `FE-18`–`FE-25`):

- **Lenis** owns scroll for the entire app (initialized once at the root). It is the single source of truth for "where the user has scrolled."
- **GSAP + ScrollTrigger** owns anything tied to scroll *position*: scroll-linked reveals, section pinning (e.g., the Home "Process" showcase if ever pinned), scrubbed timelines. `ScrollTrigger` is synced to Lenis's scroll event, never the native `window.scroll`.
- **Framer Motion** owns everything *not* scroll-position-driven: route/page transitions (`AnimatePresence`), hover/tap states, modal/drawer open-close, mount-time list stagger, shared-layout animation.
- **Never implement the same interaction in both.** If an animation is scroll-position-driven, it is GSAP's job — `whileInView` is not a substitute for genuine scroll-scrubbed/pinned behavior.
- Animated properties are restricted to `transform`/`opacity` wherever possible (GPU-accelerated). GSAP timelines/ScrollTriggers are always killed/reverted in cleanup (`useLayoutEffect`/`useGSAP`) to avoid duplicate triggers on route change or hot-reload.
- `prefers-reduced-motion` disables/shortens non-essential animation everywhere (hero cross-fade → instant swap, card hover scale → shadow-only, drawer slide → 120ms linear, FAQ expand → 100ms, testimonial slide → crossfade/instant) **without ever hiding or delaying functional content** (`FE-24`, `UI-UX.md` §77).

---

## 8. Styling & Design System (Tailwind-first)

- Tailwind utility classes are the default for all layout, spacing, color, and typography. Plain CSS is allowed **only** for: global resets/`@font-face` (one global stylesheet), keyframes GSAP/Framer Motion reference by class name, scrollbar styling, and CSS custom properties JS needs to read/write directly (`FE-16`). It is never a substitute for Tailwind out of habit.
- **One `<Button />` component exists and is used for every button everywhere** — no second button implementation, no `Button2`/`NewButton` variants. Only its existing `label`/`variant`/`icon` props change per use.
- **Design tokens are fixed** — do not introduce a color, font weight, spacing value, radius, shadow, or breakpoint outside this list without updating `UI-UX.md` first:
  - Colors: `black #000000`, `ink #111111`, `white #FFFFFF`, `muted #666666`, `border #E4E4E4`, `surface #FAFAFA`, `cream #F7F3EC` (retail tile bg only), `brown #8B4A2E` (About page accent only), `footer-bg #0D0D0D`, `footer-text #F5F5F5`, `footer-muted #9A9A9A`. Brand-hover colors (WhatsApp `#25D366`, Facebook `#1877F2`, Instagram `#E1306C`, X `#334155`, YouTube `#FF0000`) are used only on social-icon hover.
  - Fonts: **Abhaya Libre** (headings, weights 400-italic/500 only) + **Inter** (UI/body, weights 400/500/600 only). No third family, no weight outside `{400, 500, 600}`.
  - Spacing scale (8px base): 4/8/12/16/24/32/48/64/96/128px, mapped to specific uses in `UI-UX.md` §08 — `gap` between siblings, `padding` for internal breathing room only, section top/bottom padding only on the outermost `<section>`.
  - Radius: `0` (sections/hero/photo strips), `4px` (inputs/buttons), `8px` (cards), `full` (avatars, process-step circles, social tiles). Nothing above 8px except `full`.
  - Shadow: exactly two states — `shadow-hover: 0 8px 24px rgba(0,0,0,0.12)` and `shadow-none` (default). No other shadow value exists in the system.
  - Breakpoints: Tailwind default `sm 640 / md 768 / lg 1024 / xl 1280 / 2xl 1440`. Container max-widths: mobile 100%/20px pad, tablet 100%/32px pad, desktop 1280px/40px pad, large desktop 1400px/48px pad.
- **Cards** (`ExpertiseCard`, `ServiceCard`, `RetailProductCard`, `ContactInfoCard`, `TestimonialCard`) share one contract: `radius-md`, `1px solid color-border` (except borderless black `TestimonialCard`), `shadow-none` default → `shadow-hover` + `scale(1.02)` on hover (250ms ease-out), 24px desktop/20px mobile padding.
- Images use a fixed aspect-ratio box + `object-cover` — **never `object-fill`**.
- No pagination UI anywhere — Projects/Retail use "View All"/"Load More" expansion (Retail: 6 shown initially, +more per click; Projects: 3 more per click, button disappears once exhausted).

---

## 9. API Contract (`TRD.md` §6) — do not rename, restructure, or add beyond this without approval

| Resource | Endpoints |
|---|---|
| Auth | `POST /api/auth/login` (public) · `GET /api/auth/me` (session check) · `POST /api/auth/logout` |
| Projects | `POST /api/admin/projects` · `GET /api/projects` (public, published-only) · `GET /api/admin/projects` · `GET /api/projects/:slug` (public) · `GET /api/admin/projects/:id` · `PUT /api/admin/projects/:id` · `DELETE /api/admin/projects/:id` |
| Retail | `POST /api/admin/retail` · `GET /api/retail` (public, published-only) · `GET /api/admin/retail` · `GET /api/retail/:slug` (public) · `GET /api/admin/retail/:id` · `PUT /api/admin/retail/:id` · `DELETE /api/admin/retail/:id` |
| Cart/Checkout | `POST /api/checkout` (public; re-validates existence/availability/price server-side; rejects empty carts) · `POST /api/checkout/verify` (public, tied to an order/payment reference; verifies Razorpay signature server-side) |
| Orders | `GET /api/admin/orders` · `GET /api/admin/orders/:id` · `PATCH /api/admin/orders/:id/status` (order status only — **never** payment status) |
| Enquiries | `POST /api/enquiries` (public) · `GET /api/admin/enquiries` (admin-only, **never** public) · `GET /api/admin/enquiries/:id` · `PATCH /api/admin/enquiries/:id/status` · `DELETE /api/admin/enquiries/:id` |

Every mutating endpoint: `express-validator` chain → `handleValidationErrors` middleware → controller → service → model. Response envelope is uniform across every resource: `{ success: true, data }` / `{ success: false, message, errors? }`. Status codes: 400 validation, 401 unauthenticated, 403 unauthorized, 404 not found, 409 conflict where relevant, 500 server error. Before changing any endpoint's shape, method, or path, search all frontend consumers and update them in the same change.

---

## 10. Database Rules (5 Mongoose collections — `TRD.md` §7)

| Collection | Key rules |
|---|---|
| **Projects** | `slug`: required/unique/lowercase/trim, generated server-side (never trust free-text admin slug input directly). `images` required (≥1) when `published: true`. `price` conditionally required only when purchasable (custom validator). Index: unique `slug`; compound `{published, category}`. |
| **Retail** | Same `slug` discipline. `price`: `min: 0` at schema level (defense in depth, not just request validation). `published` and `availability` are **independent** booleans. Index: unique `slug`; `{published, availability}`. |
| **Enquiries** | `phone` is always `String`, never `Number` (preserves leading zeros/formatting). `status` is a Mongoose `enum`: `new`/`in-progress`/`resolved`. **Never** exposed via any public endpoint. Index: `{status, createdAt: -1}`. |
| **Orders** | Purchased items are **embedded subdocuments**, never a live `ref`/populate — this is what keeps a completed order's price/name snapshot correct even after the source Project/Retail item is edited or deleted. `amount` is computed server-side only, in the checkout service — never accepted from client input at any layer. `paymentStatus` and `orderStatus` are **separate** enum fields; never conflate them. Index: `{paymentStatus, orderStatus}`; `razorpayOrderId`/`razorpayPaymentId`. |
| **Admin** | `password` field: `select: false` by default, `.select('+password')`'d only inside the login service, and the hash is never included in any response payload. Index: unique `email`. Single `admin` role is sufficient at current scope — do not add a role system that isn't requested. |

- Mongo connection: established once at server start (`config/db.js` → `connectDB()`), never reconnected per-request. Connection failure logs clearly and the process does not accept traffic in a half-broken state.
- Deleting a Project or Retail item removes it from public access immediately but must **never** corrupt an existing Order that references it (guaranteed by the embedded-snapshot design above — do not "fix" this by switching to live refs).
- Before changing any schema field, search every controller, service, frontend consumer, and validator that touches it.

---

## 11. Authentication & Authorization

- Admin-only. `bcrypt`-hashed passwords, never reversible encryption, never logged or returned in any response.
- On login success: sign a JWT (admin ID + role only — never the password hash), set as **`httpOnly`, `Secure` (production), `SameSite`** cookie. The token is **never** returned in the JSON body and **never** placed in `localStorage`/`sessionStorage`.
- Invalid credentials → one generic error that does not reveal whether the account exists (`FR-J2`).
- `GET /api/auth/me` backs the frontend's `AuthContext` bootstrap; frontend route protection (`ProtectedRoute`) is UX convenience only.
- **Every** `/api/admin/*` route independently re-verifies the JWT via `protect` middleware and checks account status (`active`/`disabled`) — regardless of what the frontend already checked. This applies to direct API calls bypassing the UI too.
- No secret (JWT signing key, DB credentials, Razorpay secret, Cloudinary secret, EmailJS private credential) is ever placed in frontend source or given a `VITE_` prefix — anything `VITE_`-prefixed is bundled into client-visible code by Vite, full stop.

---

## 12. Payments (Razorpay) — highest-risk area, treat accordingly

- **Never trust a client-supplied amount.** The backend independently re-validates item existence, availability, and current price, then computes the payable amount server-side, on every checkout (`FR-G2`, `FR-G3`, `SEC-13`).
- Razorpay secret credentials (`RAZORPAY_KEY_SECRET`) stay server-only; only `RAZORPAY_KEY_ID` is `VITE_`-prefixed for the client-side widget.
- **A payment is successful only after backend verification of Razorpay's signed response** (official signature-verification method, server-side). A client-side success callback alone is never sufficient (`FR-G5`, `SEC-14`).
- Failed/cancelled payments never produce a successful order (`FR-G6`).
- Admins **cannot** manually mark a payment as successful — payment status derives only from verified gateway responses (`FR-O3`). The admin order-status PATCH endpoint touches order status only.
- An empty cart is rejected at checkout server-side regardless of client state (`FR-F5`).
- Every completed checkout attempt that reaches payment creation produces an Order record with an accurate item/price snapshot (§10).

---

## 13. Enquiries & EmailJS

- Reusable `EnquiryForm` component (Contact, and optionally Home/project/retail/service pages), carrying an auto-populated `source`/route field.
- Client validation is UX-only; backend `express-validator` is authoritative (required fields, email format, phone-as-string, message length cap).
- **Persistence and email are decoupled**: the enquiry is saved to MongoDB first; EmailJS is triggered as a subsequent step wrapped in its own try/catch. An EmailJS failure is logged but must **never** cause a successfully-stored enquiry to be reported to the user as a failed submission (`FR-I4`).
- Enquiry data is never returned by any public-facing endpoint (`FR-N4`).
- Duplicate submission is prevented via an `isSubmitting` lock, not just a disabled button style.

---

## 14. Image Handling (Multer + Cloudinary)

- Multer validates file type (image MIME types only), size, and count **in-memory** — uploads are never written to persistent local disk in production (the server's local filesystem is not durable at this hosting scope).
- Cloudinary is the sole store for binary image data; MongoDB stores only the resulting secure URL/public ID.
- Deleting a Project/Retail item flags its Cloudinary assets for cleanup via the stored public ID (a per-resource folder convention, e.g. `projects/<id>/`, makes this a direct `destroy` call with no extra lookup).
- Never treat an uploaded file as trustworthy without server-side validation, regardless of what the frontend already checked.

---

## 15. SEO

- Every indexable public page: unique `<title>` + meta description via a shared `SEO` component, generated dynamically from real content (static `*.data.js` for static pages, fetched resource for detail pages) — never hardcoded per-page duplicates.
- Canonical URL derived from a single `SITE_URL` constant + current path, so it can't drift.
- Slugs are generated URL-safe **server-side** at creation time (a `slugify`-style transform) — never left to raw free-text admin input.
- `robots.txt` allows public routes, disallows `/admin/*` — explicitly documented as **not** a security control; admin routes stay protected by auth regardless.
- XML sitemap reflects current publish state dynamically (excludes admin routes, unpublished/deleted content) — never a stale hand-maintained file.
- Meaningful images carry real `alt` text from stored content; purely decorative images use `alt=""`. Exactly one `<h1>` per page, logical `<h2>`/`<h3>` nesting.

---

## 16. Accessibility (WCAG 2.2 AA target)

- Semantic HTML (`<nav>`, `<main>`, `<header>`, `<footer>`, list/heading elements) over generic `<div>`-only markup.
- Every interactive element keyboard-reachable with a visible focus state (`focus-visible:` used explicitly, never suppressed).
- Every form field has a real `<label>` (`htmlFor`/`id`) — placeholder text is never a substitute.
- Icon-only controls (cart icon, hamburger, admin icon buttons) carry `aria-label`.
- Validation/error messages are linked to their field via `aria-describedby`.
- Color is never the sole signal (publish status, order status, form errors all carry text/icon too, not color alone).
- Modal/drawer interactions manage focus explicitly: focus moves in on open, returns to the trigger on close (this is not automatic in React/Framer Motion — it must be implemented).
- Touch targets ≥ 44×44px effective hit area, including icon-only buttons that are visually smaller.

---

## 17. Responsive Requirements

- Functions correctly from **320px to 3840px (4K)** — no horizontal scroll for normal content anywhere, verified at 320 / ~375–430 / ~768 / ~1280–1440 / ~1920 / ~2560–3840px, not just an arbitrarily resized window.
- Mobile nav collapses into a drawer (right-slide, black bg, full height, 80%/max-360px width) below 1024px; all primary links remain reachable at every width.
- Layouts reflow (stack, reduce columns) — never hide content to "solve" a width.
- Images always preserve aspect ratio (`object-cover`, never `object-fill`).
- Admin tables scroll within their own `overflow-x-auto` container, never the whole page.

---

## 18. Performance

- Public bundle never includes admin-only JS (`React.lazy` + `Suspense` on the admin route tree).
- Cloudinary URLs always carry `f_auto`/`q_auto`; below-the-fold images lazy-load.
- List/listing endpoints return summary fields via `.select()`; full detail is fetched only on the detail view — never over-fetch.
- Public listing queries rely on the indexes defined in §10 (do not add a query pattern that can't use an existing index without also adding the index).
- Animation stays restricted to `transform`/`opacity`; GSAP `scrub` values and pin usage are deliberately restrained, not applied to every section.
- Lenis's RAF loop is the single driver of scroll position and `ScrollTrigger.update()` — never two competing scroll loops.

---

## 19. Security Baseline

- `helmet` + `express-rate-limit` (scoped to login, enquiry submission, checkout) + `cors` restricted to known origins per environment — configured globally before route registration.
- Every mutating endpoint is validated and sanitized server-side regardless of client-side outcome.
- Error responses never leak stack traces, DB internals, or credentials, in any environment — only a generic message in production; full detail logged server-side only.
- No public API response ever includes admin credentials, password hashes, payment secrets, DB credentials, or enquiry/order data (`SEC-12`).
- MongoDB Atlas is reachable only from the backend process (network access rules scoped to the hosting server) — the frontend never touches Mongo directly (`FR-P1`).
- Production is HTTPS end-to-end.

---

## 20. Environment Variables

**Frontend (`VITE_`-prefixed — bundled and client-visible; only genuinely public values go here):**
`VITE_API_BASE_URL`, `VITE_RAZORPAY_KEY_ID`, and any EmailJS identifier the provider itself documents as public-facing.

**Backend (server-only, never bundled, never committed):**
`MONGODB_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, EmailJS server-side credentials (if the chosen integration needs any), `CORS_ORIGIN`, `COOKIE_SECURE`, `COOKIE_SAME_SITE`, `PORT`, `NODE_ENV`.

Rule stated plainly: **anything prefixed `VITE_` is readable in the browser.** A secret never gets that prefix and never lives in a frontend `.env` file. `.env` files are `.gitignore`d; only `.env.example` (names, no values) is committed.

---

## 21. Deployment Topology (Hostinger, single process)

- **One** Node.js process, **one** Hostinger Business plan, Git-import deploy. Express serves `/api/*` **and** the built frontend (`frontend/dist/` copied into `backend/public/`) from the same process — never two separate hosted services (`TECH-23`).
- A catch-all SPA-fallback route, registered after all `/api/*` routes and after static-file serving, serves `index.html` for any non-API GET — this is what makes direct URL access/refresh on a deep route (`/projects/some-slug`, `/admin/orders`) work instead of 404ing.
- The static-serving/catch-all block is mounted only when `NODE_ENV === 'production'`; in development, Vite's dev server serves the frontend separately and the backend serves `/api/*` only.
- Build order: install + `vite build` frontend → copy `dist/` into `backend/public/` → install backend prod deps → start with `node server.js`.
- Do not introduce a second deployed service, a reverse proxy between two apps, or a different hosting topology without explicit approval — this directly contradicts the documented architecture.

---

## 22. High-Risk Change Checklist

Treat as high-risk and slow down accordingly: authentication/authorization, any of the 5 database schemas, production data, any destructive operation, an API contract change, the deployment topology, secret management, and anything touching Razorpay amount calculation or verification.

For these: inspect more deeply than usual, identify every affected consumer (frontend components, other backend services, tests), verify compatibility, and ask for clarification before proceeding if a requirement is materially ambiguous — do not guess on money, auth, or data-loss-adjacent changes.

---

## 23. Testing & Verification

- After any change, verify the actually-affected functionality — happy path, failure path, edge cases, and (for UI changes) at minimum mobile + desktop.
- Use the project's existing lint/build/test tooling (`TRD.md` §19: `vite build` for frontend, server boot + Atlas connection for backend, ESLint for both). Do not introduce a new test framework without justification.
- **Never claim "works," "tests passed," "build passed," or "production ready" without having actually run and observed that outcome.** Report using:

```
Verified:
- ...

Not Verified:
- ...

Unable to Verify:
- ...
```

---

## 24. Final Report Format

```
## Changed
- Actual files/features changed.

## Why
- Reason each change was necessary, tied to a PRD/TRD/UI-UX requirement where applicable.

## Verification
- Checks/tests actually performed.

## Not Verified
- Anything that could not actually be tested.

## Risks / Flags
- Remaining risk, plus any hierarchy conflict (§1) touched by this change.
```

---

## 25. Golden Rules

1. Inspect before modifying; check whether it already exists.
2. Never invent requirements, routes, fields, env vars, or dependencies.
3. Follow the stack in §2 exactly — no TypeScript, no unlisted packages, ever.
4. Reuse before duplicating (one `<Button/>`, one `axiosClient`, one `EnquiryForm`).
5. Respect the Routes → Controllers → Services → Models layering; no direct Mongoose calls from controllers.
6. Never trust the client for price, payment success, or authorization — the backend re-verifies everything (§11, §12).
7. Order item snapshots are embedded, never live refs — this is what protects historical orders from later product edits/deletions.
8. Enquiries: storage success and email success are independent outcomes.
9. No secret, and nothing that must stay server-only, ever gets a `VITE_` prefix.
10. Respect the Framer Motion / GSAP / Lenis boundary — never solve a scroll-driven animation with Framer Motion's `whileInView`.
11. Use only the tokens in §8 (colors, type, spacing, radius, shadow) — no arbitrary one-off values.
12. Preserve mobile, accessibility, SEO, and performance behavior when changing anything unrelated to them.
13. Do not build customer accounts, wishlists, bookings, reviews, or SMS/push — all explicitly out of scope.
14. Do not silently resolve the two flagged conflicts (§1.1, §1.2) into something not written here — surface them if a task touches them.
15. Never report a check as passed that wasn't actually run.
