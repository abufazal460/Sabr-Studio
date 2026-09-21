# 06-features.md — Sabr Studio Feature Implementation Prompt

Companion to `00-master-context.md` and `01-setup.md` — read both first. This file is the **feature execution prompt**: for each documented feature it names only what implementing it correctly requires. It does not restate setup/scaffolding (`01-setup.md`), full frontend internals (`02-frontend.md`), full backend layering (`03-backend.md`), or full schema detail (`04-database.md`) — where this file needs exact detail it doesn't restate (full component trees, exact validator chains, full index list, precise motion values), go to the source document `00-master-context.md` names for it. Do not invent the gap.

---

## 1. Role & Objective

You are implementing or modifying a specific Sabr Studio feature end-to-end (UI → API → database) exactly as scoped in `PRD.md`/`TRD.md`, using the conventions `00-master-context.md` already establishes. Before touching any feature below, **inspect the existing implementation** (relevant `frontend/src/features/<feature>/`, backend route/controller/service/model files) — extend or fix what exists rather than rebuilding it, and never create a second component, endpoint, or model that duplicates one already in the repo.

---

## 2. Source of Truth

Per `00-master-context.md` §3: `PRD.md` → `TRD.md` → `ARCHITECTURE.md` → `UI-UX.md`/`ANIMATION.md` → `DATABASE.md` → `API.md` → `SECURITY.md` → `CODING-RULES.md`/`AI-RULES.md` → `QA-CHECKLIST.md` → `FOLDER-STRUCTURES.md` → existing repo → current task. Nothing in this file overrides `00-master-context.md` §4's conflict-resolution table — where a feature below touches C1–C7, that table's resolution is binding and any further ambiguity is flagged back, not silently decided.

---

## 3. Global Rules (apply to every feature below — not repeated per section)

- **API envelope**: `{ success: true, data }` / `{ success: false, message, errors? }`; status codes 400/401/403/404/409/500 (`00-master-context.md` §6.3).
- **UI**: one `<Button/>` component used everywhere; fixed design tokens only (colors, Abhaya Libre + Inter, 8px spacing scale, radius {0,4,8,full}, two shadow states) — no ad hoc values (§6.9).
- **Animation boundary**: Framer Motion = component-scoped (enter/exit, hover/tap, modals); GSAP + ScrollTrigger = scroll-position-driven only; Lenis = single scroll source of truth. No page-route-transition animations exist anywhere. `prefers-reduced-motion` disables/shortens all non-essential animation without hiding functional content (§6.9).
- **Accessibility baseline**: WCAG 2.2 AA — semantic HTML, full keyboard operability, visible focus, labeled forms, `aria-describedby` on errors, no color-only signaling, managed modal/drawer focus, ≥44×44px touch targets (§6.10).
- **Responsive baseline**: 320px–3840px, breakpoints per `UI-UX.md`.
- **SEO**: every indexable public page uses the shared `SEO` component (unique title/meta description), canonical URL from `SITE_URL`, reflected in the dynamic sitemap/robots.txt (§6.10).
- **Validation**: client-side validation is UX-only; `express-validator` on the backend is authoritative in every case — never trust client validation alone.
- **Auth boundary**: every `/api/admin/*` route independently re-verifies JWT + account status server-side regardless of frontend route protection (§6.5).
- **Backend layering**: Routes → Controllers → Services → Models, one-directional; controllers never run a Mongoose query directly (§6.2).

---

## 4. Public Features

### 4.1 Home (`/`)
- **Purpose**: landing/marketing entry point.
- **UI**: `src/features/home/`; composed from shared design tokens and the one `<Button/>`; static non-backend content in `*.data.js` files, never hardcoded JSX.
- **API**: none required beyond any shared "featured" data already exposed by Projects/Retail public endpoints, if `UI-UX.md`/`PRD.md` calls for a featured section — do not add a bespoke `/api/home` endpoint.
- **Database**: none directly.
- **Validation / Auth / Security**: none (fully public, no forms).
- **States**: loading only if it fetches featured Projects/Retail data; otherwise static.
- **Responsive / Animation / Accessibility**: per §3 global rules.
- **Acceptance**: page renders at `/`, uses `SEO` component, no console errors, passes global accessibility/responsive checks.

### 4.2 Projects (`/projects`, `/projects/:slug`)
- **Purpose**: category-based portfolio showcase.
- **UI**: listing grid + detail page, `src/features/projects/`.
- **API**: `GET /api/projects` (public, published-only), `GET /api/projects/:slug` (public).
- **Database**: `Project` model — published/category-filtered per `04-database.md` §5/§10; slug is server-generated, unique.
- **Validation**: `:slug` param existence-checked server-side; 404 envelope on miss.
- **Auth/Access**: fully public; unpublished projects never returned.
- **Security**: no client-writable fields accepted on these routes (public GET only).
- **States**: loading skeleton, empty state (no published projects in a category), error (fetch failure), success (grid/detail render).
- **Responsive**: grid reflows per breakpoints, detail page readable at 320px.
- **Animation**: entrance handled by Framer Motion; any scroll-pinned/scrubbed gallery behavior by GSAP+ScrollTrigger — never both for the same interaction.
- **Accessibility**: image `alt` text, keyboard-navigable grid/detail.
- **Acceptance**: listing shows only published items; detail 404s cleanly on bad/unpublished slug; route is exactly `/projects`/`/projects/:slug` (no `/shop`-style deviation — see C1 analog, this route pair is uncontested).

### 4.3 Retail (`/retail`, `/retail/:slug`)
- **Purpose**: purchasable product catalog. Canonical route per C1 — `/retail`, never `/shop`; folder is `features/retail/`.
- **UI**: listing grid + detail page; the display `<h1>` may read "Products" as copy only, never as a route.
- **API**: `GET /api/retail` (public, published **and** available), `GET /api/retail/:slug` (public).
- **Database**: `Retail` model — `{published, availability}` filtered, slug server-generated/unique, image fields `{url, publicId}` only.
- **Validation**: `:slug` existence-checked server-side.
- **Auth/Access**: fully public; unpublished or unavailable items never returned.
- **Security**: price/availability shown here is display-only — checkout re-validates server-side (§4.8), never trusted from this page's state.
- **States**: loading skeleton, empty (no available items), error, success.
- **Responsive/Animation/Accessibility**: per §3.
- **Acceptance**: route is `/retail`/`/retail/:slug` exactly (C1 compliance); unavailable/unpublished items excluded from both endpoints.

### 4.4 Services (`/services`)
- **Purpose**: static service-offering content page.
- **UI**: `src/features/services/`, content-driven from `*.data.js`.
- **API/Database**: none — static content only, unless `PRD.md`/`TRD.md` names a backend-driven services collection (it does not — do not add one).
- **Validation/Auth/Security**: none (public, no forms/writes).
- **States**: static render only.
- **Responsive/Animation/Accessibility**: per §3.
- **Acceptance**: renders at `/services`, `SEO` component present, no invented backend dependency.

### 4.5 About (`/about`)
- Same shape as Services §4.4: static page, no API/DB, `SEO` component, global responsive/animation/accessibility rules apply. **Acceptance**: renders at `/about`, no invented content-management backend.

### 4.6 Contact / Enquiry (`/contact`)
- **Purpose**: reusable enquiry form capturing leads.
- **UI**: `src/features/contact/` (or wherever the reusable enquiry form component lives — reused elsewhere, never re-implemented).
- **API**: `POST /api/enquiries` (public, rate-limited).
- **Database**: `Enquiry` model. **`email` is required** (C4 — PRD wins over UI-UX's "optional"). **No `projectType` field** (C5 — not in the canonical schema; do not add it, flag the discrepancy if this feature is touched). `phone` is always `String`.
- **Validation**: client-side is UX-only; `express-validator` authoritative server-side, matching `DATABASE.md` §2.3's field set exactly.
- **Auth/Access**: public submission; the created `Enquiry` is **never** exposed via any public read endpoint.
- **Security**: enquiry persisted to MongoDB **first**; EmailJS notification is a separate try/caught step — an EmailJS failure must never cause a successfully-stored enquiry to be reported as failed to the user.
- **States**: idle → submitting (loading) → success confirmation → error (validation or persistence failure) — distinct UI for each; empty state N/A (it's a form, not a list).
- **Responsive/Animation**: per §3; form transitions via Framer Motion only.
- **Accessibility**: labeled fields, `aria-describedby` on every validation error, no color-only error signaling, focus moves to first error on failed submit.
- **Acceptance**: submission with missing email is rejected server-side even if client validation is bypassed; EmailJS failure does not surface as a user-facing failure when the DB write succeeded; no `projectType` field present unless the C5 conflict has since been explicitly resolved and cited.

### 4.7 Cart (`/cart`)
- **Purpose**: add/update/remove/view-total for Retail items pre-checkout.
- **UI**: `src/features/cart/`, state via `CartContext` (one of the two approved Contexts — never a third state-management library).
- **API**: cart state is client-side (Context) until checkout; no dedicated `/api/cart` persistence endpoint unless `API.md` names one — do not invent one.
- **Database**: none directly (cart is not persisted server-side pre-checkout unless documented otherwise).
- **Validation**: quantity/availability re-checked at checkout time server-side, not trusted from cart state alone.
- **Auth/Access**: public; no customer accounts exist to scope a cart to (see PRD §2 exclusion) — cart is session/local, never tied to a fabricated user identity.
- **Security**: displayed totals are informational only; never treated as authoritative payment input.
- **States**: empty cart, populated cart, item-removed transition, error (e.g. stale item removed/unavailable at checkout time).
- **Responsive/Animation/Accessibility**: per §3; item add/remove uses Framer Motion.
- **Acceptance**: empty-cart checkout attempt is rejected server-side (§4.8) regardless of any client-side guard; cart never silently invents a persistence layer.

### 4.8 Checkout / Payment (Razorpay)
- **Purpose**: pay for cart contents (and configured purchasable projects) via Razorpay.
- **UI**: checkout flow within/after Cart; no separate route beyond what `PRD.md`/routes table defines.
- **API**: `POST /api/checkout` (public, rate-limited — re-validates item existence/availability/price, computes amount server-side, rejects empty cart), `POST /api/checkout/verify` (public, rate-limited — verifies Razorpay signature).
- **Database**: creates an `Order` on verified success only; line items are **embedded snapshots**, never `ref`/`populate` (ADR-05); `amount` is server-computed only; `paymentStatus` set only via verified signature.
- **Validation**: server re-validates every item's existence/availability/current price at checkout time — client-supplied amounts/prices are never trusted.
- **Auth/Access**: public initiation; no admin action can manually mark a payment successful.
- **Security** (highest-risk area, `TRD.md` §12): a payment is successful **only** after backend verification of Razorpay's signed response — a client-side success callback alone is never sufficient; failed/cancelled payments never produce a successful `Order`.
- **States**: initiating payment (loading), Razorpay modal/redirect, verifying (loading), success, failure/cancelled (distinct, non-blocking — user can retry), server-side rejection (e.g. empty cart, unavailable item).
- **Responsive/Animation/Accessibility**: per §3.
- **Acceptance**: a forged/altered client-side "success" without valid signature verification never creates an `Order`; empty-cart submission is rejected with the correct 400-class response regardless of frontend state.

---

## 5. Admin Features

### 5.1 Admin Auth (`/admin/login`, session)
- **Purpose**: single-role (`admin`) authentication gate for the admin panel.
- **UI**: `/admin/login` form; `ProtectedRoute` wraps all other `/admin/*` routes as a **UX convenience only**.
- **API**: `POST /api/auth/login` (public, rate-limited), `GET /api/auth/me`, `POST /api/auth/logout`.
- **Database**: `Admin` model; `password` is `select: false`, hash never returned in any response; unique `email` index.
- **Validation**: `express-validator` on login payload; server never reveals whether the failure was a bad email vs. bad password.
- **Auth/Access**: `bcrypt`-hashed password compare; JWT signed with admin ID + role only, set `httpOnly`, `Secure` (production), `SameSite` cookie — **never** in the JSON body or `localStorage`/`sessionStorage`.
- **Security**: invalid credentials → one generic error message; every `/api/admin/*` route independently re-verifies the JWT server-side regardless of `ProtectedRoute` state.
- **States**: idle, submitting, invalid-credentials error, success (redirect into admin), session-expired (redirected to login on any 401 from an admin call).
- **Responsive/Animation/Accessibility**: per §3.
- **Note (C2)**: the public navbar's "Login" CTA is **not** this feature's entry point by default — it is implemented visually only per `00-master-context.md` C2 and must not be wired to `/admin/login` (or anywhere) without explicit client confirmation.
- **Acceptance**: no JWT ever appears in a JSON response body or is written to any browser storage API; a direct, unauthenticated `curl` to any `/api/admin/*` route is rejected regardless of frontend state.

### 5.2 Admin Dashboard (`/admin`)
- **Purpose**: authenticated overview (basic counts only — no analytics/reporting beyond that, per scope exclusion).
- **UI**: reuses public-site design tokens (colors, type, spacing, radius, the one `<Button/>`) per the admin visual gap-fill in C6; sidebar/table-first layout is an implementation decision, not a UI-UX requirement.
- **API**: aggregate counts drawn from existing admin list endpoints (Projects/Retail/Enquiries/Orders) — do not add a bespoke `/api/admin/stats` endpoint unless `API.md` names one.
- **Database**: read-only aggregation over existing collections.
- **Auth/Access**: `/api/admin/*` boundary per §5.1.
- **Security**: no write operations originate here.
- **States**: loading, error (fetch failure), success.
- **Responsive/Animation/Accessibility**: per §3.
- **Acceptance**: dashboard requires valid session; counts reflect only real documented collections, no invented analytics widget.

### 5.3 Admin Projects CRUD (`/admin/projects`)
- **Purpose**: full CRUD over Projects, including image management.
- **UI**: list/table + create/edit form, reusing the same `<Button/>`/tokens as public site.
- **API**: `GET/POST/PUT/DELETE /api/admin/projects[...]`.
- **Database**: writes to `Project` model; slug is **server-generated** on create, effectively immutable once published — never accepted as client input; `published` flag controls public visibility (see §4.2).
- **Validation**: `express-validator` on every write; matches `DATABASE.md` §2 field set exactly — no extra fields invented for admin convenience.
- **Auth/Access**: admin-only, per §5.1 boundary.
- **Security**: image uploads go through Multer (in-memory) → Cloudinary; MongoDB stores only `{url, publicId}`, never binary; deleting a project flags its Cloudinary assets for `destroy` via stored `publicId`.
- **States**: list loading/empty/error/success; form submitting, validation-error, save-success, delete-confirmation (destructive action requires explicit confirm step).
- **Responsive/Animation/Accessibility**: per §3; modal/drawer focus is managed on open/close per WCAG baseline.
- **Acceptance**: an unpublished project never appears on `/projects`; deleting a project removes its Cloudinary assets (not just the DB doc); slug cannot be set from the admin form's raw text input.

### 5.4 Admin Retail CRUD (`/admin/retail`)
- Same shape as §5.3, applied to the `Retail` model: `GET/POST/PUT/DELETE /api/admin/retail[...]`, server-generated unique slug, `{published, availability}` gating, image fields `{url, publicId}` only, Cloudinary cleanup on delete.
- **Acceptance**: an unavailable or unpublished retail item never appears on `/retail`; price changes here never retroactively alter an existing `Order`'s embedded snapshot (§4.8).

### 5.5 Admin Enquiry Management (`/admin/enquiries`)
- **Purpose**: view/update/delete captured enquiries.
- **API**: `GET/PATCH/DELETE /api/admin/enquiries[...]` — **admin-only, never public** (no public read endpoint exists or is added).
- **Database**: `Enquiry` model; list uses the `{status, createdAt:-1}` index for sorting/filtering.
- **Validation**: PATCH payload restricted to the documented mutable field(s) (e.g. `status`) — never lets an admin edit `email`/`phone`/message content into something the original submitter didn't send, unless `DATABASE.md`/`API.md` explicitly allows it.
- **Auth/Access**: admin-only per §5.1.
- **Security**: this is the one collection with the strictest "never public" rule in the whole app — double-check no route or aggregation leaks it.
- **States**: list loading/empty/error/success; status-update in-flight/success/error; delete-confirmation.
- **Responsive/Animation/Accessibility**: per §3.
- **Acceptance**: no enquiry data is reachable from any non-admin route, directly or via an unrelated aggregate endpoint.

### 5.6 Admin Order Management (`/admin/orders`)
- **Purpose**: view orders and update **order status only**.
- **API**: `GET /api/admin/orders[...]`, `PATCH /api/admin/orders/:id/status` — order status only, **never** payment status.
- **Database**: `Order` model; `paymentStatus` and `orderStatus` remain separate fields; list uses the `{paymentStatus, orderStatus}` index plus Razorpay ID lookups.
- **Validation**: PATCH body accepts only a valid `orderStatus` enum value.
- **Auth/Access**: admin-only per §5.1.
- **Security**: **admins cannot manually mark a payment successful** — the status PATCH endpoint must reject any attempt to write `paymentStatus`, at the controller/validator layer, not just by convention.
- **States**: list loading/empty/error/success; status-update in-flight/success/error.
- **Responsive/Animation/Accessibility**: per §3.
- **Acceptance**: a PATCH payload containing `paymentStatus` is rejected or ignored, never applied; embedded line-item snapshots remain untouched by any order-status edit.

### 5.7 Image Upload (Cloudinary) — cross-cutting
- **Purpose**: shared upload mechanism used by Projects CRUD (§5.3) and Retail CRUD (§5.4); not an independent route/page.
- **UI**: upload control embedded in the relevant admin form; no standalone "media library" feature exists unless documented — do not build one.
- **API**: rides on the same `POST`/`PUT` admin Projects/Retail endpoints — no separate `/api/admin/upload` endpoint unless `API.md` names one.
- **Database**: only `{url, publicId}` ever persisted, on the owning Project/Retail document — never a standalone `Image` collection.
- **Validation**: Multer validates type/size/count **in-memory**, never writing to local disk in production, before forwarding to Cloudinary.
- **Auth/Access**: admin-only, inherits the boundary of whichever CRUD route it's embedded in.
- **Security**: no unvalidated file type/size reaches Cloudinary; secrets (Cloudinary API secret) stay in `backend/.env`, never sent to the frontend.
- **States**: upload progress/loading, validation-rejection error, success (preview updates), removal (unstages an image before save vs. deletes an already-saved one — Cloudinary `destroy` only applies to the latter).
- **Responsive/Animation/Accessibility**: per §3; upload control is keyboard-operable, not drag-and-drop-only.
- **Acceptance**: no binary image data ever appears in a MongoDB document; an oversized/wrong-type file is rejected before any Cloudinary call is made.

---

## 6. Explicitly Not Features (do not build, even as a "small addition" to one of the above)

Customer/visitor accounts or login flow, order history/saved profiles, booking/appointment scheduling, product reviews/ratings, a wishlist beyond the Cart, push/SMS notifications, analytics/reporting dashboards beyond §5.2's basic counts, a second CMS/content layer, a public Enquiry read endpoint, TypeScript, a UI kit, a second icon or animation library, Redis, GraphQL, or a third global state mechanism beyond `AuthContext`/`CartContext` (`00-master-context.md` §5, §7).

---

## 7. Constraints

- No functionality is added to any feature above beyond what `PRD.md`/`TRD.md`/`API.md`/`DATABASE.md` document for it — an "obviously useful" addition is still an invented feature.
- No duplicate component, endpoint, or model is created where one already exists for the same purpose — extend/fix in place.
- Follow the existing Routes → Controllers → Services → Models layering and feature-based frontend folder structure; do not introduce a different pattern for one feature.
- Inspect the current implementation of a feature before changing it; adjust only what's missing or inconsistent with the source documents.
- Do not silently resolve C1–C7 differently from `00-master-context.md` §4 while implementing any feature above — flag it instead.
- Do not perform a repo-wide refactor as a side effect of one feature's task.

---

## 8. Verification

For whichever feature(s) a task touches, verify (report as **Verified / Not Verified / Unable to Verify**):
1. UI, API, and database changes match the feature's section above and its cited source documents — nothing invented.
2. No new component/endpoint/model duplicates an existing one.
3. Backend validation and the `/api/admin/*` auth boundary are intact and independently enforced.
4. Loading/empty/error/success states are all implemented and distinguishable, not just the happy path.
5. Responsive behavior (320px–3840px) and WCAG 2.2 AA accessibility checks pass for the affected surface.
6. Animation follows the Framer Motion / GSAP+ScrollTrigger / Lenis boundary with no route-transition animation introduced.
7. The feature's own acceptance line(s) above are individually confirmed, not assumed.
8. No sensitive field (Admin password hash, Enquiry data, secrets, unverified payment state) is newly exposed.

---

## 9. Completion Criteria

A feature task is complete only when:
1. It satisfies exactly the documented behavior for that feature — no more, no less.
2. It reuses existing shared components/services/contexts rather than duplicating them.
3. All required supporting changes are made together (UI + API + DB + validation, not a subset left half-done).
4. No conflict in `00-master-context.md` §4 was silently resolved differently from its stated resolution.
5. All checks in §8 pass or are explicitly reported as Not Verified / Unable to Verify.
6. Any newly discovered ambiguity or gap against the source documents is flagged back explicitly rather than silently decided.
