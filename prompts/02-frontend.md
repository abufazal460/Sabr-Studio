# 02-frontend.md — Sabr Studio Frontend Implementation

Companion to `00-master-context.md` (read first — it holds the full conflict-resolution table). This file is the complete, standalone implementation prompt for the **frontend only**. It draws exclusively from `PRD.md`, `TRD.md`, `UI-UX.md`, `ARCHITECTURE.md`, `API.md`, `CODING-RULES.md`, `AI-RULES.md`. Nothing below invents a component, route, field, or library not already specified in those documents.

---

## 1. Role & Objective

You are implementing the React/Vite frontend of Sabr Studio: a public marketing/portfolio/e‑commerce site (Home, Projects, Retail, Services, About, Contact, Cart) plus a protected admin panel shell (routing/layout only — full admin CRUD detail belongs in a separate `03-admin.md`/`04-backend.md` prompt; this file covers the admin panel's frontend routing/session-gating surface, not its CRUD forms). Every page is data-driven where PRD requires it, static-content-driven via `*.data.js` files everywhere else, and built exactly to `UI-UX.md`'s visual spec and `ARCHITECTURE.md`'s frontend architecture (§6–§9, §18–§24, §29–§31, §38).

Before writing any code: inspect the existing repo state, check whether the component/file already exists, and re-read Section 3 (conflicts) below if the task touches any flagged area.

---

## 2. Source of Truth & Frontend-Relevant Conflicts

Hierarchy: `PRD.md` → `TRD.md` → `ARCHITECTURE.md` → `UI-UX.md`/`ANIMATION.md` → `API.md` → `CODING-RULES.md`/`AI-RULES.md` → existing repo → current task. Full detail: `00-master-context.md` §3–4.

**Conflicts that affect frontend work specifically — do not silently resolve these differently:**

| # | Conflict | Binding resolution for frontend code |
|---|---|---|
| C1 | `/shop` (UI-UX) vs `/retail` (PRD/TRD/API) | Build `features/retail/`, routes `/retail` and `/retail/:slug`. Page `<h1>` may still read "Products" — that's copy, not the route. |
| C2 | Navbar "Login" button vs. no-visitor-accounts scope | Render the Login button visually (position/styling per UI-UX §26–28), but **do not wire it to any route or auth flow**. Leave its `onClick`/`to` prop as an explicit `TODO` pending client confirmation — do not default it to `/admin/login` without that confirmation, despite `ARCHITECTURE.md` §5A-2/§19.1 treating that as a working assumption. |
| C3 | `react-icons` (TRD) vs `lucide-react` (UI-UX) | Import from `react-icons/lu` only. Never add `lucide-react` as a dependency. |
| C5 | Enquiry form "Project Type" field (UI-UX §75) not present in PRD/DATABASE.md's Enquiry schema | Do not build this field into the submitted payload without confirming the backend supports it. If UI-UX's form spec is followed visually, the field must not be sent to `POST /api/enquiries` unless `AI-RULES.md`/`DATABASE.md` are updated first — flag this in your task report. |
| C4 | Enquiry `email`: required (PRD) vs optional (UI-UX §75) | Frontend validation treats `email` as **required** (PRD wins). Update the UI copy/asterisk accordingly even though UI-UX's table currently shows it optional. |

---

## 3. Technology Stack (frontend — exact, no substitutions)

**Use**: React (`.jsx` only — zero TypeScript, zero `.ts`/`.tsx`, zero `tsconfig.json`, zero `@types/*`), Vite, Tailwind CSS, Framer Motion, GSAP + `ScrollTrigger`, Lenis, `react-icons` (incl. `react-icons/lu`), `react-intersection-observer`, `react-router-dom`, `axios`.

**Never add without a named PRD/TRD requirement nothing above satisfies**: TypeScript/`@types/*`, Redux/Zustand/Recoil, any CSS-in-JS library, any UI kit (MUI/Chakra/Ant Design), `moment`/`day.js`, `lucide-react` (see C3), a second icon or animation library, a form library (plain controlled components only, per TRD FE-08 — revisit only if admin form complexity genuinely proves insufficient, and only as an explicit decision), a data-fetching/cache library (React Query, SWR — per-page `useState`/`useEffect` fetch is sufficient at this scope, `ARCHITECTURE.md` §22.3).

---

## 4. Frontend Project Structure

```text
frontend/
├── public/                         # favicon, robots.txt fallback if not backend-generated
├── src/
│   ├── app/
│   │   ├── App.jsx                 # root: AuthProvider → CartProvider → SmoothScrollProvider → AppRouter
│   │   ├── AppRouter.jsx           # single source of truth for every route (public + admin)
│   │   └── ProtectedRoute.jsx      # admin route gate — UX convenience only, backend is the real boundary
│   ├── assets/                     # Abhaya Libre / Inter font files, static SVGs not covered by react-icons
│   ├── features/
│   │   ├── home/
│   │   │   ├── components/         # HeroSlider, ExpertiseCard, ProcessStep, TestimonialCard, FaqAccordionItem, ServiceTeaser, ProjectHomeThumb, StatBlock
│   │   │   ├── data/                # homeHero.data.js, process.data.js, testimonials.data.js, faq.data.js, expertise.data.js
│   │   │   └── pages/Home.jsx
│   │   ├── projects/
│   │   │   ├── components/         # ProjectListingRow, ProjectGallery
│   │   │   ├── api/projects.api.js
│   │   │   └── pages/ (ProjectsListing.jsx, ProjectDetail.jsx)
│   │   ├── retail/
│   │   │   ├── components/         # RetailProductCard, CategoryTabBar
│   │   │   ├── api/retail.api.js
│   │   │   └── pages/ (RetailListing.jsx, RetailDetail.jsx)
│   │   ├── cart/
│   │   │   ├── components/         # CartDrawer, CartLineItem
│   │   │   ├── context/CartContext.jsx
│   │   │   ├── api/checkout.api.js
│   │   │   └── pages/Cart.jsx
│   │   ├── services/
│   │   │   ├── data/services.data.js
│   │   │   └── pages/Services.jsx
│   │   ├── about/
│   │   │   ├── data/about.data.js
│   │   │   └── pages/About.jsx
│   │   ├── contact/
│   │   │   ├── data/contact.data.js
│   │   │   └── pages/Contact.jsx
│   │   ├── enquiry/
│   │   │   ├── components/EnquiryForm.jsx   # canonical instance; rendered on Contact + optionally Home/Services/detail pages
│   │   │   └── api/enquiries.api.js
│   │   └── admin/                  # loaded via React.lazy + Suspense — public bundle never includes this
│   │       ├── auth/ (LoginPage.jsx, auth.api.js, AuthContext.jsx)
│   │       ├── dashboard/ (DashboardPage.jsx)
│   │       ├── projects/ (ProjectsAdminPage.jsx, ProjectForm.jsx)
│   │       ├── retail/ (RetailAdminPage.jsx, RetailForm.jsx)
│   │       ├── enquiries/ (EnquiriesAdminPage.jsx)
│   │       └── orders/ (OrdersAdminPage.jsx)
│   ├── shared/
│   │   ├── components/             # Button, SectionHeading, Badge, Skeleton, EmptyState, ErrorState, NotFoundState, TextInput, TextArea, Select, FormLabel, FormError, Seo
│   │   ├── layouts/                 # PublicLayout, AdminLayout
│   │   ├── api/axiosClient.js      # the one HTTP client instance
│   │   ├── hooks/                   # useAuth.js, useCart.js, useReducedMotion.js, useLenisScroll.js
│   │   └── utils/                   # validators.js, formatPrice.js, buildCloudinaryUrl.js
│   ├── styles/globals.css          # Tailwind entry, @font-face, scrollbar styling, clamp()-based CSS custom properties
│   ├── main.jsx
│   └── vite-env-notes.md           # documentation only — no TS env types (TECH-05)
├── tailwind.config.js
├── vite.config.js
├── package.json
└── .env.example
```

**Boundaries (`ARCHITECTURE.md` §7.1/§7.3/§38.2–38.3, enforced, not optional):**
- `shared/` never imports from `features/`. A feature imports `shared/` freely, and another feature only via its `pages/`/`api/` exports — never its `components/` internals.
- A component/utility is promoted to `shared/` only once **≥ 2 features** genuinely use it — never preemptively.
- No component ever calls `axios`/`fetch` directly — always through `axiosClient` via a feature's `api.js` (`TRD FE-01/FE-10`).
- No inline JSX copy for static content — it lives in that feature's `*.data.js` (plain object/array export, no JSX/logic/side effects — `TRD DATA-01–04`).

**Naming (exact — `CODING-RULES.md` §6, `AI-RULES.md` §5):** components `PascalCase.jsx`; static data `camelCase.data.js`; hooks `useCamelCase.js`; utilities `camelCase.js`; feature API modules `camelCase.api.js`.

---

## 5. Design System (`UI-UX.md` §05–§25, tokens mapped into `tailwind.config.js` — `ARCHITECTURE.md` §20)

Implement every token below in `tailwind.config.js`'s `theme.extend`. **No color, font weight, spacing value, radius, shadow, or breakpoint is ever used as a one-off arbitrary Tailwind value** (`mt-[13px]`-style) — if a design need doesn't map to an existing token, that's a signal to add the token, not to invent a value inline.

| Token group | Values |
|---|---|
| Colors | `black #000000` · `ink #111111` (default text) · `white #FFFFFF` · `muted #666666` · `border #E4E4E4` · `surface #FAFAFA` · `cream #F7F3EC` (retail image tile bg only) · `brown #8B4A2E` (About page accent only) · `footer-bg #0D0D0D` · `footer-text #F5F5F5` · `footer-muted #9A9A9A` |
| Interactive colors | Focus ring `#111111` · Error `#B3261E` · Success `#1E7B45` · Brand hovers (social icons only): WhatsApp `#25D366`, Facebook `#1877F2`, Instagram `#E1306C`, X `#334155`, YouTube `#FF0000` |
| Fonts | Heading: **Abhaya Libre** (weights 400-italic accent, 500 only). Body/UI: **Inter** (weights 400, 500, 600 only). No third family, no other weights. |
| Spacing (8px base) | `4 8 12 16 24 32 48 64 96 128px` — Tailwind's default scale already aligns; `gap` between siblings, `padding` for internal breathing room only, section top/bottom padding only on the outermost `<section>` |
| Radius | `0` (sections/hero/photo strips) · `4px` (inputs/buttons) · `8px` (cards) · `full` (avatars, process-step circles, social tiles) — nothing above 8px except `full` |
| Shadow | Exactly two states: `shadow-hover: 0 8px 24px rgba(0,0,0,0.12)` and `shadow-none` (default) |
| Breakpoints | Tailwind defaults: `sm 640 / md 768 / lg 1024 / xl 1280 / 2xl 1440` — no custom breakpoint config needed |
| Container | Mobile <640px: 100%/20px pad · Tablet 640–1024px: 100%/32px pad · Desktop 1024–1440px: 1280px centered/40px pad · ≥1440px: 1400px centered/48px pad |

**Icons**: `react-icons/lu` only (C3), 24px default, 20px inline-with-text, 32px in Service/Process cards, stroke 1.5px, navbar icons 22px/1.75px. Every icon-only control carries `aria-label`.

**The one `<Button/>` component**: already exists conceptually per UI-UX §23 — build it once in `shared/components/Button.jsx` with a `variant` prop (`Primary` / `Secondary-Outline` / `Secondary-Text`), optional `icon`, and a `loading` state (spinner replaces label). **Every button anywhere in the app uses this component** — no second implementation, no `Button2`. Usage mapping (UI-UX §23): Navbar Login → Primary; Hero CTA → Primary; "Read more" → Primary/Small; "Take a tour" → Secondary-Outline; "Buy Now" → Primary; "View All"/"Load More" → Primary / Secondary-Outline respectively; "Submit Inquiry" → Primary, full-width mobile; Cart "Place Order" → Primary, full-width; Cart "Remove" → Secondary-Text.

**Images**: fixed aspect-ratio box (`aspect-[4/5]` portrait cards, `aspect-video` hero/wide, `aspect-square` retail tiles) + `object-cover object-center` — **never `object-fill`**. See §12.

Full token detail, per-section layout specs, and component-by-component visual contracts: `UI-UX.md` §06–§41, §68–§70. Do not re-derive values already given there — implement verbatim.

---

## 6. Routing (`PRD.md` §5, `ARCHITECTURE.md` §8, `AI-RULES.md` §6 — canonical, do not deviate)

Single source of truth: `src/app/AppRouter.jsx`.

| Route | Layout | Access | Page | Data source |
|---|---|---|---|---|
| `/` | PublicLayout | Open | `Home` | Static `*.data.js` (hero, process, testimonials, FAQ) + `GET /api/projects` (limited, for strip) |
| `/projects` | PublicLayout | Open | `ProjectsListing` | `GET /api/projects` |
| `/projects/:slug` | PublicLayout | Open | `ProjectDetail` | `GET /api/projects/:slug` |
| `/retail` | PublicLayout | Open | `RetailListing` | `GET /api/retail` |
| `/retail/:slug` | PublicLayout | Open | `RetailDetail` | `GET /api/retail/:slug` |
| `/services` | PublicLayout | Open | `Services` | Static `*.data.js` |
| `/about` | PublicLayout | Open | `About` | Static `*.data.js` |
| `/contact` | PublicLayout | Open | `Contact` | Static `*.data.js`; `POST /api/enquiries` on submit |
| `/cart` | PublicLayout | Open | `Cart` | Client `CartContext`; `POST /api/checkout` on proceed |
| `*` | PublicLayout | Open | `NotFound` | — generic 404 for any unmatched URL |
| `/admin/login` | standalone (no sidebar) | Open, unauthenticated only | `LoginPage` | `POST /api/auth/login` |
| `/admin` | AdminLayout, `ProtectedRoute` | Protected | `DashboardPage` | `GET /api/auth/me` + overview counts |
| `/admin/projects` | AdminLayout, `ProtectedRoute` | Protected | `ProjectsAdminPage` | `/api/admin/projects[...]` |
| `/admin/retail` | AdminLayout, `ProtectedRoute` | Protected | `RetailAdminPage` | `/api/admin/retail[...]` |
| `/admin/enquiries` | AdminLayout, `ProtectedRoute` | Protected | `EnquiriesAdminPage` | `/api/admin/enquiries[...]` |
| `/admin/orders` | AdminLayout, `ProtectedRoute` | Protected | `OrdersAdminPage` | `/api/admin/orders[...]` |

Rules:
- Do not add, remove, or rename a route without explicit approval (`TECH-17`).
- `PublicLayout`/`AdminLayout` are parent routes with `<Outlet/>` — shared chrome renders once per layout, not once per page (`ARCHITECTURE.md` §8.5).
- `ProtectedRoute` checks `AuthContext.isAuthenticated` (populated via `GET /api/auth/me` on app load) — **this is a UX convenience only**; the backend independently re-verifies every `/api/admin/*` call regardless (`FR-J5`).
- An unauthenticated user hitting a protected admin route is redirected to `/admin/login`; `react-router-dom`'s location state carries the intended destination so login returns them there.
- The entire `features/admin/*` tree is loaded via `React.lazy` + `Suspense` so the public bundle never includes admin JS (`FE-31`, `PERF-03`).
- A matched-but-invalid `:slug` (deleted/unpublished/nonexistent) renders the page's own not-found state (§10), not the router's generic 404 — the route still matches, the underlying `GET` returns 404, and the component renders accordingly (`FR-C4`/`FR-E3`).
- The cart icon lives in the persistent navbar and opens either a `CartDrawer` overlay (quick access) or navigates to `/cart` (full page) — both share the same `CartContext`.

---

## 7. Layout Architecture

- **`PublicLayout`**: `Navbar` (sticky; adds 1px bottom border + white background only after scroll, per UI-UX §26) + `<Outlet/>` + `Footer`. Wraps every public route.
- **`Navbar`** (UI-UX §26–28): Desktop (≥1024px) — `[Logo] — [Home About Service Projects Retail Contact] — [Cart icon] [Login button]`. Below 1024px — `[Logo] — [Cart icon] [Hamburger]`, nav links + Login move into `MobileDrawer`. Cart icon shows a filled badge with item count (hidden when empty), `aria-label` required. Active route: underline + no bold jump.
- **`MobileDrawer`**: right-slide, full height, black background, white text, 80% width (max 360px). Scroll-locked while open. Escape + outside-click close it. Focus moves to the close button on open, returns to the hamburger on close.
- **`Footer`** (UI-UX §41): 3-column (Brand / Quick Links / Contact) desktop → stacked mobile. Quick Links mirror every navbar route.
- **`AdminLayout`**: sidebar (Dashboard, Projects, Retail, Enquiries, Orders, Logout) + session-aware header + `<Outlet/>`. `/admin/login` renders standalone (no sidebar — no session exists yet). Complex tables scroll within their own `overflow-x-auto` container, never the whole page (`RESP-08`).

---

## 8. Reusable / Shared Components (`src/shared/components/` — build once, promote only per the ≥2-feature rule)

| Component | Purpose | Notes |
|---|---|---|
| `Button` | Every button/CTA in the app | See §5 — the single implementation, `variant`/`icon`/`loading` props only |
| `SectionHeading` | `[eyebrow] [H2/H3] [optional supporting copy]` shell used by every content section | UI-UX §30 |
| `Skeleton` | Loading placeholder, sized to match final content per call site | UI-UX §49 |
| `EmptyState` | No-data view — icon + 1-line heading + 1-line description, no fabricated content | UI-UX §51 |
| `ErrorState` | Non-crashing API-failure view with a retry affordance where the failure is plausibly transient | UI-UX §50 |
| `NotFoundState` | Distinct from the router's 404 — for a matched but invalid/deleted/unpublished `:slug` | `FR-C4`/`FR-E3` |
| `Badge` | Small labeled tag (e.g., category, status) | Reused across cards |
| `TextInput`, `TextArea`, `Select`, `FormLabel`, `FormError` | Form primitives | UI-UX §25 — every form built from these, never one-off markup |
| `Seo` | Sets `<title>`, meta description, canonical URL, Open Graph per page | §14 below |
| `CartDrawer`, `CartLineItem` | Cart overlay + line item row | `features/cart/components/` — feature-scoped, not shared, since only Cart uses them directly (Navbar only triggers the drawer, doesn't render its internals) |

**Card contract** (`ExpertiseCard`, `ServiceCard`, `RetailProductCard`, `ContactInfoCard`, `TestimonialCard` — UI-UX §33): `radius-md`, `1px solid color-border` (except borderless black `TestimonialCard`), `shadow-none` default → `shadow-hover` + `scale(1.02)` on hover (250ms ease-out), 24px desktop / 20px mobile padding, fixed-aspect image with `object-cover`.

Never create a second card/button/form-input implementation anywhere in a feature folder — check `shared/components/` first (`CODING-RULES.md` §4/§7).

---

## 9. Feature Architecture

One folder per PRD-defined feature area (§4's tree): `home`, `projects`, `retail`, `cart`, `services`, `about`, `contact`, `enquiry`, `admin/*`. Each is self-contained — its components, its `*.data.js`, its `api.js` (if backend-driven), its `pages/`. A developer opening one feature folder should understand that entire feature without hunting elsewhere.

**Static vs. backend-driven content** (`TRD DATA-01/DATA-02`):
- Static UI copy (hero text, service descriptions, footer links, nav labels, FAQ questions, testimonial content) → that feature's `*.data.js`, imported and mapped over — never inline JSX strings.
- Backend-driven content (projects, retail items, enquiries, orders) → always fetched through the feature's `api.js` via `axiosClient` — never hardcoded, ever.

---

## 10. Public Pages (content/section order per `UI-UX.md` §67, data source per `ARCHITECTURE.md` §19)

### `/` — Home
Header → Hero (2-image cross-fade slider, 5s interval, `object-cover`, 40% black overlay, eager-loaded) → About teaser + Stats strip + Expertise 2×2 grid + Trust strip → Services teaser (3-column) → Projects strip (4-image edge-to-edge row, links to `/projects`) → Process ("How We Work," 6 steps, step 6 = "Material & Colour Consultation") → Testimonials carousel (auto-advance 5s, dot navigation only) → FAQ accordion (5 Sabr-specific questions, single-open) → `EnquiryForm` → Footer. All static content from `home/*.data.js`; Projects strip pulls a limited `GET /api/projects` result.

### `/projects` — Projects Listing
Header → "Projects" H1 → alternating image-left/content-right rows (not zig-zag — consistently image-left) → "View All Projects" button (loads 3 more per click, disappears once <4 total or fully shown) → Footer. States: Loading (skeleton rows), Empty ("no published projects" — no fabricated cards), Error (retry), Success.

### `/projects/:slug` — Project Detail
Header → title/meta → expandable "View Details" description (grid-row height transition, no layout jump) → image gallery → optional purchasable-project price + purchase CTA (only where configured) → related projects → Footer. Not-found state for invalid/deleted/unpublished slug (`FR-C4`).

### `/retail` — Retail Listing
Header → "Products" H1 → `CategoryTabBar` (All + admin-defined categories) → product grid, 6 shown initially, "Load More" appends (never replaces), disappears once fully loaded → Footer. Same Loading/Empty/Error states as Projects.

### `/retail/:slug` — Retail Detail
Header → product image(s) → name → price (admin-controlled, live) → description → availability-gated "Buy Now"/"Add to Cart" (disabled/hidden if unavailable — client-side convenience only, backend re-validates at checkout regardless) → related products → Footer. Not-found state for invalid/deleted/unpublished slug (`FR-E3`).

### `/services`
Header → "Our Services" heading + copy → 6-card grid (Residential Interiors, Commercial Interiors, Space Planning, Furniture Layout, 3D Visualization, Material & Colour Consultation) → `EnquiryForm` → Footer.

### `/about`
Header → editorial hero (brown italic accent) → About Us (image + copy) → Founders block → Footer. No enquiry form on this page per UI-UX §67 (footer follows directly).

### `/contact`
Header → "Keep In Touch" — 3 `ContactInfoCard`s (Call/Email/Address) → Social grid (WhatsApp, Facebook, Instagram, X, YouTube — brand-color hover) → `EnquiryForm` → Footer.

### `/cart`
Header → line items (image, name, unit price, quantity, remove) → informational subtotal (never authoritative — see §13) → empty-cart state (checkout unavailable) → "Place Order"/Checkout CTA → Razorpay flow → payment success/failure state (only after backend verification) → Footer.

Every data-dependent page above implements Loading/Error/Empty/Not-found exactly per §15 — no exceptions, no page left permanently spinning on failure.

---

## 11. State Management (`ARCHITECTURE.md` §22 — exactly two cross-cutting Contexts, nothing more)

| State | Owner | Lifetime | Notes |
|---|---|---|---|
| Admin session (`isAuthenticated`, admin identity) | `AuthContext` | Cookie-backed, not client-persisted | Bootstrapped via `GET /api/auth/me` on app load; cleared on logout or any 401 response |
| Cart contents + informational subtotal | `CartContext` | Session/tab lifetime only — no `localStorage` persistence unless a future requirement adds it | Never treated as authoritative for price/availability; re-validated server-side only at checkout |
| Form field values, `isSubmitting` | Local component state | Component lifetime | Never lifted to Context |
| Fetched listing/detail data | Local page/feature state | Re-fetched per navigation | No client-side cache layer — a deliberate simplicity choice at this scope |
| `prefers-reduced-motion` | `useReducedMotion` hook (`window.matchMedia`) | Reflects OS setting live | Read once, listened for changes |

No Redux/Zustand/Recoil. No premature promotion of page-local fetch state into global state. The JWT itself never enters any client-readable state (httpOnly cookie only).

---

## 12. API Integration Layer

### 12.1 The one Axios client (`src/shared/api/axiosClient.js`)

```js
import axios from 'axios';

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL, // relative '/api' in production, full local URL in dev
  withCredentials: true,                      // sends the httpOnly JWT cookie automatically
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});
```

- No token handling in JS — no `Authorization` header, no `localStorage`/`sessionStorage` for auth state.
- Response interceptor normalizes every failure (validation 400, 401/403/404/409/429/500, network error, timeout) into one shape the UI consumes uniformly.
- On a 401 from any `/api/admin/*` call: clear `AuthContext`, redirect to `/admin/login`. No token-refresh mechanism exists.
- Every feature imports this **same** instance — no per-feature Axios instance, no inline `fetch` calls in components (`FE-10`).

### 12.2 Feature API module pattern

Each backend-driven feature has one `api.js` with small named functions, never inline path strings scattered across components:

```js
// features/projects/api/projects.api.js
import axiosClient from '@/shared/api/axiosClient';

export const getProjects = (params) => axiosClient.get('/projects', { params });
export const getProjectBySlug = (slug) => axiosClient.get(`/projects/${slug}`);
```

### 12.3 Endpoints this frontend consumes (full contract: `API.md` §2, `00-master-context.md` §6.3 — do not add/rename/restructure without updating both docs)

Public: `GET /projects`, `GET /projects/:slug`, `GET /retail`, `GET /retail/:slug`, `POST /enquiries`, `POST /checkout`, `POST /checkout/verify`. Admin: `POST /auth/login`, `GET /auth/me`, `POST /auth/logout`, plus the `/admin/*` CRUD set (Projects, Retail, Enquiries, Orders — full detail belongs to the admin panel prompt, not this one).

### 12.4 Error → UI state mapping (`API.md` §13, exact)

| Status/condition | Frontend behavior |
|---|---|
| Network error / timeout | Normalized message ("Network error, please try again." / "Request timed out.") + retry affordance |
| 400 (validation) | Inline field errors from `errors[]` on forms; a generic banner for non-form 400s |
| 401 | Redirect to `/admin/login`, clear `AuthContext` (admin surface only — no visitor 401s exist) |
| 403 | "You don't have permission to do this" — no redirect loop |
| 404 | Public: page/component not-found state. Admin: "not found" message, no crash |
| 409 | Inline "already exists" message on the offending field (slug/email conflicts) |
| 429 | "Too many attempts, please try again shortly" |
| 500 | Generic "Something went wrong" — never surface raw server error text |

### 12.5 Placeholder convention for in-progress backend work

While a backend endpoint isn't yet available, a feature's `api.js` function is still written with the final signature and real path — never a mocked/inline fake response inside a component. If the endpoint genuinely doesn't exist yet, mark it clearly:

```js
// TODO(backend): GET /api/projects not yet implemented — see 03-backend.md
export const getProjects = (params) => axiosClient.get('/projects', { params });
```

This keeps every component's data-fetching call identical whether the backend is ready or not, and means no component-level mock logic has to be removed later.

---

## 13. Forms & Validation (`ARCHITECTURE.md` §23, `UI-UX.md` §25/§75)

Forms in scope: `EnquiryForm` (shared — Contact, and optionally Home/Services/detail pages), Checkout contact-info fields (Cart page), Admin login form. (Admin CRUD forms belong to the admin-panel prompt.)

**Every form**: controlled components (`useState`/`useReducer`, no form library) built from the shared input primitives (§8) — never one-off input markup.

**Submission lifecycle** (exact — `PRD §9`, `FR-I5`):
1. **Initial** — `isSubmitting = false`.
2. **Validation error** — client validation runs on submit attempt via `shared/utils/validators.js`; failures shown inline (`aria-describedby`-linked), request never sent.
3. **Submitting** — `isSubmitting = true`, submit control disabled (this — not a separate debounce flag — is what prevents duplicate submission).
4. **Success** — fields clear, confirmation shown inline (never a toast-only confirmation for critical feedback).
5. **Failure** — error shown inline, **user's entered data is preserved**, not cleared, so they can retry.

Client validation is UX-only and never authoritative — the backend's `express-validator` chain re-validates regardless of what the client already allowed through. Never skip or weaken a client check on the assumption the backend will "catch it" — both layers are required.

**EnquiryForm fields** (UI-UX §75, with C4/C5 corrections applied): Full Name (required, min 2 chars), Phone (required, valid pattern), Email (**required** per PRD — see C4, not optional as UI-UX's table states), Message (optional, auto-growing textarea). Do **not** include a "Project Type" select unless the backend schema conflict (C5) is confirmed resolved. Carries an auto-populated `source`/route field so the backend knows where each enquiry originated.

**Phone/price data types**: phone is always handled as a string end-to-end (never cast to `Number` — would drop leading zeros/`+country` formatting). Prices are numbers; the cart's displayed subtotal is informational only and is never sent to or trusted by the backend as the payable amount (§14.7 checkout note).

---

## 14. Image Handling (`ARCHITECTURE.md` §24, `TRD FE-28/FE-29/FE-30`)

- All Project/Retail images render from Cloudinary URLs only, via a shared `buildCloudinaryUrl(url, { width, height })` helper in `shared/utils/` that appends `f_auto` (auto format) and `q_auto` (auto quality) transform params — sized per usage context (smaller transform for a grid card, larger for a detail hero). Never render a raw full-resolution upload into a small card.
- Every `<img>` sits inside a fixed aspect-ratio container (`aspect-[4/5]`, `aspect-video`, `aspect-square` per context) with `object-cover object-center` — **never `object-fill`** — so no layout shift occurs and no image is stretched or wrongly cropped.
- Below-the-fold images: `loading="lazy"`, optionally gated further with `react-intersection-observer` where component-level mount deferral is also needed. Hero images: `loading="eager"`, `fetchpriority="high"` on the first.
- Every image carries `alt` text sourced from stored content (project/retail title/description) — purely decorative images use `alt=""`.
- Admin image **upload** (Multer/Cloudinary orchestration) is a backend/admin-panel concern — the public frontend only ever *renders* Cloudinary URLs already stored on a Project/Retail document; it never uploads directly to Cloudinary itself.

---

## 15. Loading / Error / Empty / Not-Found States (`PRD FR-P3`, `TRD FE-11–FE-14`, exact — every data-dependent view implements all four)

| State | Component | When |
|---|---|---|
| Loading | `Skeleton`, sized to match final content | Request in flight — never a blank screen |
| Error | `ErrorState`, retry affordance where the failure is plausibly transient | API failure, network error, timeout |
| Empty | `EmptyState`, no fabricated placeholder content | `success: true` but the result set is empty (no published projects/retail, empty cart, no enquiries in admin) |
| Not-found | `NotFoundState`, distinct from the router's generic 404 | Valid route match but invalid/deleted/unpublished `:slug` |

No view is ever left permanently spinning on failure — every loading state has a corresponding error/timeout resolution path.

---

## 16. Animation (`ANIMATION.md` full spec, boundary restated `ARCHITECTURE.md` §31, `AI-RULES.md` §7)

**Strict, non-negotiable library boundary:**

| Library | Owns | Never used for |
|---|---|---|
| **Framer Motion** | Component-scoped: mount/unmount, hover/tap, modal/drawer open-close, mount-time list stagger, shared-layout animation | Anything tied to scroll position |
| **GSAP + ScrollTrigger** | Scroll-position-linked: section pinning (Home Services teaser only, per `ANIMATION.md` §9.5), scroll-scrub (Home Projects/Process cards, FAQ help-heading), timeline choreography | Buttons, nav hover, standard one-time viewport entrances |
| **Lenis** | Single scroll-position source of truth, initialized once at app root, synced to `ScrollTrigger` | Component animation of any kind |
| `react-intersection-observer` | One-time reveal mounting, deferred image/component loading | Scroll-scrub calculations |

Never implement the same interaction in both Framer Motion and GSAP. GSAP timelines/ScrollTriggers are always killed/reverted on unmount (prevents duplicate triggers on route change/hot-reload). No route/page-transition animation exists (`ANIMATION.md` §20 — explicit exclusion; `AnimatePresence` wraps component-local mount/unmount only, never the router's `<Outlet/>`).

**Motion tokens** (`ANIMATION.md` §5): easing `easeStandard`/`easeEnter`/`easeSmooth`/`easeLinear`; durations `micro 150ms · hover 200ms · card 250ms · standard 300ms · drawer 320ms · section 500ms · hero 1200ms`; stagger 60–100ms, max entrance delay 300ms. Full per-section trigger/duration/easing table: `ANIMATION.md` §7–§16 — implement verbatim, do not re-derive.

**Reduced motion**: `useReducedMotion` hook (wraps `window.matchMedia('(prefers-reduced-motion: reduce)')`) gates both libraries identically — hero cross-fade → instant swap, card hover → shadow-only, drawer → 120ms linear, FAQ expand → 100ms no-bounce, testimonial slide → crossfade/instant. Functional content and controls are never hidden or delayed by this — only decorative motion is reduced.

---

## 17. Responsive Behavior (`UI-UX.md` §09/§63, `ARCHITECTURE.md` §21)

Functions correctly from **320px to 3840px (4K)** with zero horizontal scroll for normal content. Tested boundary widths: 320, 360, 375, 390, 414, 480, 640, 768, 1024, 1280, 1440, 1920, and 2560–3840px.

- Every responsive behavior is expressed via Tailwind's responsive prefixes (`sm: md: lg: xl: 2xl:`) on a **single** component tree — never a forked "mobile version" of a component.
- Grids reflow by column-count reduction only (never hide content) per the per-section counts in `UI-UX.md` §11.
- Nav collapses into `MobileDrawer` below the point where nav links no longer fit (effectively <1024px), implemented as a Tailwind breakpoint toggle (`hidden lg:flex` / `lg:hidden`), never a JS-computed width check.
- Admin tables scroll horizontally within their own `overflow-x-auto` container — never the whole page.
- Touch targets ≥ 44×44px effective hit area everywhere, including visually-smaller icon buttons (padding added, not icon inflation).

---

## 18. Accessibility (WCAG 2.2 AA target — `PRD §10`, `TRD §14`, `ARCHITECTURE.md` §30, `UI-UX.md` §64)

- Semantic HTML (`<nav> <main> <header> <footer> <section>`, list/heading elements) over generic `<div>`-only markup — exactly one `<h1>` per page, logical `<h2>`/`<h3>` nesting beneath it.
- Every interactive element keyboard-reachable with a visible focus state — `focus-visible:` used explicitly (never suppressed) on every custom interactive element.
- Every form field has a real `<label htmlFor>` — placeholder text is never a substitute.
- Icon-only controls (cart icon, hamburger, social links) carry `aria-label`.
- Form/validation errors are linked to their field via `aria-describedby`.
- Color is never the sole signal — validation errors, publish status, etc. carry text/icon indicators too.
- Modal/drawer interactions (`MobileDrawer`, `CartDrawer`) manage focus explicitly: focus moves in on open (to the first focusable element/heading), returns to the trigger element on close — this is not automatic in React/Framer Motion and must be implemented.
- Touch targets ≥44×44px (shared with §17).
- `prefers-reduced-motion` respected everywhere (§16).

---

## 19. SEO (`PRD §10`, `TRD §13`, `ARCHITECTURE.md` §29)

- A shared `<Seo/>` component (`shared/components/Seo.jsx`) sets `<title>`, meta description, and canonical URL on every indexable public page — sourced from the page's `*.data.js` (static pages) or the fetched resource's own title/description (Project/Retail detail pages). Never hardcoded per-page duplicate markup.
- Canonical URL derived from one `SITE_URL` constant + current path — never drifts out of sync across environments.
- Open Graph fields included for at minimum Home, Project Detail, Retail Detail, via the same `<Seo/>` component, with sensible fallback description/image.
- Public URLs are clean, lowercase, crawlable (`/projects/:slug`, `/retail/:slug`) — slugs are **server-generated**, never derived or edited on the frontend.
- `robots.txt` and the XML sitemap are backend responsibilities (dynamic, publish-state-aware) — the frontend contributes nothing to them beyond correct route structure.
- Not-found views (§15) never fabricate or reuse a stale prior page's metadata.

---

## 20. Constraints (restated, concrete)

- **No unnecessary libraries.** Before adding any package: does it already exist in §3's list? Does native JS/React/browser capability suffice? Does an installed package already solve it? Only then does a new package get added — and only against a named requirement nothing else satisfies.
- **No invented features.** Do not add customer accounts, wishlists beyond the Cart, booking/scheduling, reviews/ratings, push/SMS notifications, numbered pagination (Load More/View All only), route-transition animation, custom cursors, drag/swipe gestures, or tooltips — all explicitly excluded (`PRD §2`, `ANIMATION.md §20`, `UI-UX.md §42/§62`).
- **No duplicate components.** One `<Button/>`, one `axiosClient`, one `EnquiryForm`, one `Skeleton`/`EmptyState`/`ErrorState` set, one Card contract. Search `shared/components/` before creating anything that looks similar to something already built.
- Do not add, remove, or rename a route, an API endpoint call shape, or a design token without explicit approval and without updating the source document it came from.
- Do not silently resolve C1–C5 (§2) differently from their stated resolution — surface it in your task report if a change touches any of them.

---

## 21. Verification & Completion Criteria

Before considering any frontend task complete, verify (report as **Verified / Not Verified / Unable to Verify** — `AI-RULES.md` §23):

1. `vite build` completes with zero errors; no `.ts`/`.tsx`/`tsconfig.json`/`@types/*` exists anywhere.
2. No package in `package.json` outside §3's approved list without a cited justification.
3. Every data-dependent view implements Loading/Error/Empty/Not-found (§15) — nothing left permanently spinning.
4. Static content for the affected page is sourced from its `*.data.js` file, not hardcoded inline (spot-check at minimum Home, Services, About).
5. Every button on the affected surface uses the shared `Button` component; no new button implementation was added.
6. Responsive behavior holds at 320px, ~375–430px, ~768px, ~1280–1440px, ~1920px, and ~2560–3840px with no horizontal scroll, stretched/cropped images, or layout shift.
7. Keyboard operability and visible focus verified on every new/changed interactive element; icon-only controls carry `aria-label`.
8. Animation on the affected surface respects the Framer Motion/GSAP/Lenis boundary (§16) and `prefers-reduced-motion`.
9. `<Seo/>` values are set correctly for any new/changed page.
10. No component calls `axios`/`fetch` directly; all requests go through the shared `axiosClient` via a feature `api.js`.
11. Any conflict from §2 touched by this change was flagged, not silently resolved.

A frontend task is complete only when it satisfies the specific requirement it was scoped against, using only the approved stack and existing architectural patterns, with all four view states implemented for anything data-dependent, and with nothing invented beyond what `PRD.md`/`TRD.md`/`UI-UX.md`/`ARCHITECTURE.md` already specify.
