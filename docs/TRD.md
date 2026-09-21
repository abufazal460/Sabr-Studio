# Technical Requirements Document — Sabr Studio

Derived strictly from `PRD.md`. This document defines **how** the system technically implements the product requirements. It does not restate business goals or product strategy except where they constrain a technical decision.

This is the finalized, in-depth technical stack revision. It replaces all earlier stack assumptions. Every section below explains not just *what* is required but *how* it must be built, structured, and reasoned about, so both a human developer and an AI coding agent can implement it without guessing.

---

## 0. Non-Negotiable Stack Summary

Read this first — every later section is written against this exact stack. Nothing outside this list may be introduced without explicit approval.

**Frontend**
- React (JavaScript only — **`.jsx` files, no `.ts`/`.tsx` anywhere in the codebase, no TypeScript tooling, no `@types/*` packages**)
- Vite (build tool + dev server)
- Tailwind CSS (primary styling method; plain `.css` is used only where Tailwind genuinely cannot express the requirement — see Section 4)
- Framer Motion (component-level animation: enter/exit, hover, tap, layout transitions, page transitions)
- GSAP + `ScrollTrigger` plugin (scroll-driven animation, section pinning, timeline choreography — anything Framer Motion cannot cleanly do)
- Lenis (smooth scrolling, synced with GSAP ScrollTrigger)
- `react-icons` (all iconography)
- `react-intersection-observer` (visibility-based triggers: lazy render, reveal-on-scroll gating, deferred mounting)
- `react-router-dom` (client-side routing — required by the PRD's route structure; without it there is no way to implement `/projects/:slug`, protected `/admin/*` routes, etc.)
- `axios` (HTTP client — centralized API layer)

**No other frontend package is installed unless a specific, named PRD requirement cannot be met without it.** Every dependency added later must be justified against a specific PRD requirement in Section 23.

**Backend**
- Node.js + Express.js
- Multer (multipart upload handling)
- CORS (`cors` package)
- Cloudinary SDK (`cloudinary`)
- Mongoose (MongoDB ODM/connection layer)
- `dotenv` (environment variable loading)
- `bcrypt` (password hashing)
- `jsonwebtoken` (admin session tokens)
- `cookie-parser` (reading the httpOnly auth cookie)
- `express-validator` (backend request validation)
- `express-rate-limit` (brute-force/abuse protection on sensitive routes)
- `helmet` (security headers)
- Razorpay SDK (`razorpay`) — required by PRD Section 11 for payments
- `nodemon` (development-only process restart)

**No other backend package is installed unless a specific, named PRD requirement cannot be met without it.**

**Database**
- MongoDB Atlas (managed cluster, production and development both point to Atlas — no local MongoDB dependency once past initial setup)
- Mongoose for schema definition, validation, and connection management

**Animation library boundary (explicit rule, not a suggestion):**
- Framer Motion → component-scoped animation: mount/unmount transitions, hover/tap states, shared layout animation, route/page transitions, modal/drawer open-close, list item stagger.
- GSAP + ScrollTrigger → anything tied to scroll position: scroll-linked reveals across the whole page, timeline sequences spanning multiple elements, **section pinning** (e.g., a hero or a showcase section that stays fixed while inner content animates as the user scrolls past it), scrubbed animations.
- Never implement the same interaction in both libraries. If a component's animation is scroll-position-driven, it is GSAP's responsibility, full stop — do not reach for Framer Motion's `whileInView` as a substitute for genuine scroll-scrubbed or pinned behavior.
- Lenis owns the scroll container. GSAP ScrollTrigger is synced to Lenis's scroll event (not the native `window.scroll` event) so pinning and scrubbing stay frame-accurate. Framer Motion's `whileInView`/`useScroll` hooks read from the same Lenis-driven scroll position, not a second, disconnected scroll listener.

---

## 1. Technical Overview

Sabr Studio is a MERN application with two client surfaces (public site, admin panel) served by a single Express/Node REST API backed by MongoDB Atlas, and — in production — served from a **single Node.js process on a single Hostinger server**, with the built React frontend delivered as static files by the same Express app that serves the API (Section 20).

- **Frontend**: React SPA built with Vite, plain JavaScript only, feature-based folder structure, Tailwind-first styling, Framer Motion + GSAP/ScrollTrigger + Lenis for animation, all page content data-driven from per-feature JSON-shaped `*.data.js` files (no hardcoded UI copy/content in components — see Section 4.1).
- **Backend**: Node.js + Express REST API — the only layer permitted to talk to MongoDB, Razorpay, Cloudinary, and EmailJS.
- **Database**: MongoDB Atlas — stores projects, retail items, enquiries, orders, and admin accounts, connected via Mongoose.
- **Admin system**: JWT-authenticated (httpOnly cookie) area for full CRUD on projects, retail, enquiries, and orders.
- **External integrations**: EmailJS (enquiry notification), Razorpay (payment processing), Cloudinary via Multer (image storage/delivery).
- **Production topology**: One Node.js process, one Hostinger hosting plan. Express serves `/api/*` routes and also serves the Vite-built frontend's `dist/` output as static files from the backend's `public/` folder, with an SPA fallback route so client-side routing (`react-router-dom`) works on hard refresh and direct URL access (Section 20).
- **High-level responsibility split**: frontend renders state and collects input; backend owns validation, authorization, business rules, persistence, and all external service calls; MongoDB is the source of truth; external services are never trusted for authoritative state (price, payment success) without backend verification.

---

## 2. Technology Stack

### 2.1 Frontend

| Technology | Why | Where | Responsibility |
|---|---|---|---|
| React (JavaScript, `.jsx`) | Required by PRD; JavaScript is mandated — **no TypeScript in any form**, no `.ts`/`.tsx` files, no type-checking build step | Entire client | Rendering, client-side state, user interaction |
| Vite | Fast dev server (native ESM, instant HMR) and optimized production build (Rollup-based, automatic code-splitting, tree-shaking) | Build tooling | Dev server, production bundling, environment variable exposure via `import.meta.env` |
| `react-router-dom` | Client-side routing for public and admin route groups, including dynamic `:slug` routes and nested protected layouts | App shell | Route matching, protected-route gating, not-found handling |
| Tailwind CSS | Utility-first styling; keeps the design system consistent, avoids CSS bloat/specificity fights, makes responsive rules (`sm:`/`md:`/`lg:`/`2xl:` + custom breakpoints) declarative in markup | All components | Layout, spacing, responsive breakpoints, color/typography tokens defined once in `tailwind.config.js` |
| Plain CSS (minimal, exception-only) | Used only for things Tailwind cannot cleanly express: complex keyframe animations feeding into GSAP timelines, CSS custom properties driving JS-controlled values, `@font-face` declarations, scrollbar styling, print styles if ever needed | A small number of scoped `.css` files (e.g., one global stylesheet for resets/fonts/scrollbar, and occasional component-local files only when justified) | Escape hatch, never the default |
| Framer Motion | Declarative, physics-based component animation with clean React integration (`motion.div`, `AnimatePresence`, `layout` prop) | Interactive components, page/route transitions, modals, cards, list stagger | Enter/exit transitions, hover/tap micro-interactions, shared-layout animation |
| GSAP + ScrollTrigger | Frame-accurate scroll-driven animation and section pinning that Framer Motion is not built for | Hero sections, showcase/portfolio scroll sequences, pinned sections, scroll-scrubbed reveals | Scroll-position-linked animation, timeline choreography, pin/unpin behavior |
| Lenis | Smooth, inertia-based scrolling that feels consistent across trackpad, mouse wheel, and touch, and that GSAP ScrollTrigger can sync against | App root | Owns the scroll behavior for the whole site; dispatches scroll updates consumed by GSAP ScrollTrigger and Framer Motion's scroll hooks |
| `react-icons` | Single, tree-shakeable icon source instead of custom SVG sprite management or multiple icon packages | Anywhere an icon is needed (nav, cart, socials, UI affordances) | Iconography only — import only the specific icon set/icons actually used, so unused icons are tree-shaken out of the bundle |
| `react-intersection-observer` | Declarative wrapper around the native `IntersectionObserver` API for visibility-based logic | Below-the-fold sections, lazy-mounted heavy components, reveal-gated content, infinite-scroll-style triggers if ever needed | Detects when an element enters/leaves the viewport to defer rendering/animation work until needed |
| `axios` | Centralized HTTP client with interceptors (attach auth cookie/credentials, normalize error shapes) | Single `src/api/` (or feature-scoped `api.js` files) | Request/response handling; the only layer allowed to call the backend |

**Explicitly excluded unless a concrete PRD requirement later forces otherwise:** Redux/Zustand/Recoil (React Context + component state is sufficient for this project's scope — cart state, auth state), CSS-in-JS libraries, UI component kits (MUI, Chakra, Ant Design — Tailwind covers this project's minimal design system), moment/day.js (native `Intl.DateTimeFormat` is sufficient for the dates this project needs), any TypeScript-adjacent tooling.

### 2.2 Backend

| Technology | Why | Where | Responsibility |
|---|---|---|---|
| Node.js | Required by PRD | Server runtime | Executes the Express app |
| Express.js | Required by PRD | API layer | Routing, middleware pipeline, request/response lifecycle |
| `bcrypt` | Industry-standard password hashing, never reversible | Admin auth service | Hashes credentials on account creation, compares on login |
| `jsonwebtoken` | Stateless, signed session tokens for admin auth | Auth middleware, login controller | Issues and verifies signed JWTs |
| `cookie-parser` | Reads the httpOnly cookie carrying the JWT | Auth middleware | Parses incoming cookies so the JWT can be extracted and verified |
| `express-validator` | Schema-style request validation without a heavyweight framework | Route-level validation middleware | Field presence, type, format checks before controller logic runs |
| Multer | Required by PRD Section 11: handles multipart image uploads for project/retail media | Upload middleware on project/retail admin routes | Validates file type/size/count in-memory or to a temp buffer before forwarding to Cloudinary; never writes uploads to persistent local disk in production |
| Cloudinary SDK | Required by PRD Section 11: image storage/delivery | Upload service layer | Stores images, returns secure URLs persisted in MongoDB |
| Razorpay SDK | Required by PRD Section 11: payment order creation and verification | Payment service layer | Creates payment orders, verifies payment signatures server-side |
| `cors` | Frontend and backend are logically separate concerns even though co-hosted; also needed for local development where Vite dev server and Express run on different ports | App bootstrap | Restricts cross-origin requests to known origins in each environment |
| `helmet` | Baseline security headers with a single, well-maintained dependency | App bootstrap | Sets protective HTTP headers (X-Content-Type-Options, X-Frame-Options, etc.) |
| `express-rate-limit` | Protects login, enquiry submission, and checkout endpoints from abuse | Route-scoped middleware | Limits request rate per IP on sensitive endpoints |
| `dotenv` | Loads environment variables from `.env` files locally; on Hostinger, variables are set at the platform level and `dotenv` simply becomes a no-op fallback | Server bootstrap (first line executed) | Populates `process.env` in non-production/local runs |
| `nodemon` (dev dependency only) | Restarts the server on file change during local development | Local dev only, never shipped/used in production | Developer productivity only |

**Explicitly excluded unless forced by a concrete requirement:** Passport.js (a hand-rolled JWT + bcrypt flow is simpler and sufficient for a single `admin` role), GraphQL (PRD defines a REST API), a separate job queue/worker system (no async job requirement exists in the PRD), Redis (no caching/session-store requirement exists at this scope), Winston/Pino as a mandatory dependency (start with structured `console.log`/`console.error` plus timestamps; introduce a logging library only if production log volume genuinely requires it).

### 2.3 Database

| Technology | Why | Where | Responsibility |
|---|---|---|---|
| MongoDB Atlas | Required by PRD; primary datastore for all dynamic data; managed cluster removes the need to operate MongoDB infrastructure manually | Single Atlas cluster, one database, five collections | Persists projects, retail, enquiries, orders, admin accounts |
| Mongoose | Schema enforcement, validation, and query construction at the model layer | Model layer (`models/`) | Schema definition, model-level validation (required fields, enums, min/max, unique indexes), query interface, connection lifecycle management |
| Mongoose connection pooling (built-in) | Reliability under concurrent requests without extra configuration | Server bootstrap (`config/db.js` or equivalent) | A single shared connection, established once at server start, reused across all requests — never reconnect per-request |

### 2.4 External Services

| Service | Why | Responsibility |
|---|---|---|
| EmailJS | PRD-mandated enquiry notification channel | Sends a notification email when a valid enquiry is stored; failure is decoupled from enquiry storage success (FR-I4) |
| Razorpay | PRD-mandated payment gateway for retail (and configured project) purchases | Payment order creation, checkout UI, payment verification (server-side signature check) |
| Cloudinary | PRD-mandated image storage/delivery, accessed via Multer | Stores and serves project/retail images with on-the-fly responsive/optimized delivery; MongoDB stores only the resulting URL |

### 2.5 Development Tools

Only tools with a clear technical purpose are included:

- Vite dev server — local frontend development with instant HMR.
- `nodemon` — local backend auto-restart (dev dependency only).
- ESLint (JavaScript config, no TypeScript rule sets) — enforces consistent code style and catches common bugs before they reach production.
- Prettier (optional, if the team wants automatic formatting) — formatting only, never a build dependency.
- Git — version control; the deployment pipeline (Section 20) is Git-import-based on Hostinger, so a clean, buildable `main`/`production` branch is a hard requirement, not a nicety.

No additional libraries are introduced beyond what the PRD's scope and this section justify. Before adding any new package at any point in development, the question to ask is: *does a named PRD requirement fail without it?* If the answer is no, it does not get installed.

---

## 3. Folder & File Structure Principles

**The definitive, final folder tree will be supplied separately by the project owner and is authoritative once provided.** This section defines the *rules* that any folder structure — including the one supplied separately — must follow, so that structure stays consistent and predictable as the codebase grows.

### 3.1 Feature-based organization (frontend)

- The frontend is organized **by feature/section, not by file type.** A "types-first" structure (one giant `components/`, one giant `pages/`, one giant `hooks/` at the root) is not used. Instead, each feature or page-section owns its own folder containing everything specific to it: its components, its data file(s), and, where relevant, its own hooks.
- Shared, truly cross-feature pieces (the layout shell, the reusable `Button`/`Card`/`Section` primitives, the API client, the auth context) live in clearly named shared locations (e.g., `src/shared/` or `src/common/`) — but a component only belongs there once it is genuinely used by two or more features, not by default.
- Example of the *pattern* (illustrative only — not the final tree):
  ```
  src/
    features/
      projects/
        components/
          ProjectCard.jsx
          ProjectGallery.jsx
        data/
          projects.data.js
      retail/
        components/
          RetailCard.jsx
        data/
          retail.data.js
      home-hero/
        components/
          HomeHero.jsx
        data/
          homeHero.data.js
    shared/
      components/
        Button.jsx
        Section.jsx
      api/
        axiosClient.js
  ```
- Every feature folder is self-contained: opening `features/projects/` should tell a developer everything about how the Projects feature is built, without needing to hunt through unrelated folders.

### 3.2 File naming conventions

- Components: `PascalCase.jsx` (e.g., `ProjectCard.jsx`, `EnquiryForm.jsx`).
- Data files: `camelCase.data.js` (e.g., `projects.data.js`, `homeHero.data.js`, `services.data.js`) — the `.data.js` suffix is mandatory and consistent across the entire codebase so any developer or AI agent can immediately identify a static/config data file versus a component or logic file.
- Hooks: `useCamelCase.js` (e.g., `useCart.js`, `useAuth.js`).
- Utility/helper modules: `camelCase.js` (e.g., `formatPrice.js`, `slugify.js`).
- Backend files follow the same discipline: `camelCase.controller.js`, `camelCase.routes.js`, `camelCase.model.js`, `camelCase.service.js`, `camelCase.middleware.js` — the suffix communicates the file's role at a glance.

### 3.3 No hardcoded UI content — data-driven rendering

- **DATA-01**: Static/structural UI content that is not fetched from the backend (e.g., service list items, "why choose us" copy, footer link groups, navigation labels, static marketing sections) must never be written as literal strings/JSX inline inside a component. It is defined as an array of objects (or a single object, as shape requires) in that feature's `*.data.js` file and imported into the component, which maps over it to render.
- **DATA-02**: Content that comes from the backend (projects, retail items, enquiries, orders) is never hardcoded on the frontend at all — it is always fetched through the API layer. `*.data.js` files are exclusively for **static, non-backend-driven UI content** (hero copy, service descriptions, testimonial placeholders if static, navigation structure, social links, footer content, SEO default fallback copy).
- **DATA-03**: Every `*.data.js` file exports plain JavaScript — an array of objects or a single object — matching the shape the consuming component expects. No JSX, no logic, no side effects live inside a data file; it is pure data.
- **DATA-04**: This pattern means: to change a static section's copy, a developer edits one data file, never hunts through component markup. It also means components stay small, readable, and reusable, since layout/behavior (component) is cleanly separated from content (data file).

### 3.4 Backend structure principles

- Routes, controllers, services, models, and middleware are kept in separate, clearly named top-level folders (`routes/`, `controllers/`, `services/`, `models/`, `middleware/`), each grouped internally by resource (e.g., `controllers/project.controller.js`, `controllers/retail.controller.js`).
- `config/` holds environment/connection setup (`db.js` for Mongoose connection, `cloudinary.js` for Cloudinary config).
- `utils/` holds small, pure helper functions shared across controllers/services (e.g., token generation, response formatting).
- The backend's `public/` folder is reserved exclusively for the built frontend (`dist/` output copied in at build/deploy time) — see Section 20. It is never used for anything else, and it is excluded from version control via `.gitignore` (it is a build artifact, not source).

This section exists so that when the final folder structure document is supplied, every rule above (naming, feature-based grouping, data-file convention, backend layering) still applies inside it without contradiction.

---

## 4. Frontend Technical Requirements

### 4.1 Application structure & data flow

- **FE-01 — Application structure**: Feature-based React SPA (Section 3.1). Each route/page composes feature components; feature components read from their feature's `*.data.js` file for static content and from the centralized `axios` API layer for backend-driven content. No component fetches directly with `fetch`/`axios` inline without going through the shared API client.
- **FE-02 — Routing**: `react-router-dom` exposes exactly the routes defined in PRD Section 5 (public and admin), including dynamic `:slug` segments for project/retail detail pages, and a catch-all not-found route. Route definitions live in one clear place (e.g., `src/app/routes.jsx` or `src/app/AppRouter.jsx`) so the full route map is visible at a glance.
- **FE-03 — Public routes**: Render without any authentication check; must be directly accessible via URL and survive a browser refresh (this is guaranteed in production by the SPA fallback described in Section 20 — Hostinger deployment).
- **FE-04 — Admin routes**: All `/admin/*` routes except `/admin/login` are wrapped in a `ProtectedRoute` component that checks auth state (via an `AuthContext`/`useAuth` hook) before rendering; this check is a UX convenience only — the backend independently enforces authorization on every API call (FR-J5).
- **FE-05 — Protected routes**: An unauthenticated user hitting a protected admin route is redirected to `/admin/login`; on successful login, the user returns to the originally requested route where feasible (`react-router-dom`'s location state is used to remember the intended destination).

### 4.2 Reusable components & layouts

- **FE-06 — Reusable components**: The enquiry form, project/retail cards, image galleries, buttons, and section wrappers are implemented once as shared components (`src/shared/components/`) and consumed across multiple features, never copy-pasted per page.
- **FE-07 — Reusable layouts**: A shared `PublicLayout` (header, nav, cart icon, footer) and a separate `AdminLayout` (sidebar/nav, session-aware header, logout control) wrap their respective route groups via nested routing.

### 4.3 Forms

- **FE-08 — Forms**: The enquiry form, checkout form, and all admin CRUD forms are controlled components with field-level client validation, submit-in-progress locking (prevents duplicate submission per FR-I5, implemented by disabling the submit control and tracking a `isSubmitting` state until the request settles), and explicit success/error feedback rendered inline near the form, not as a disconnected toast the user might miss.
- Form state is handled with plain `useState`/`useReducer` — no form library is introduced unless the number/complexity of admin forms later proves this insufficient, in which case the decision is revisited explicitly rather than defaulted into.

### 4.4 State management

- **FE-09 — State management**: `AuthContext` (admin session state) and `CartContext` (cart contents, computed informational total) are the two cross-cutting Context providers. All other state is local to the component/feature that owns it. Cart state persists only for the browser session/tab lifetime unless a specific persistence requirement is later added — no premature `localStorage`/global-store complexity is introduced.
- No client-side storage of admin secrets: the JWT lives in an httpOnly cookie set by the backend (Section 8), never in `localStorage`/`sessionStorage`/component state, so it is inaccessible to JavaScript (and therefore to XSS) entirely.

### 4.5 API communication

- **FE-10 — API communication**: A single `axiosClient` instance (base URL from `import.meta.env.VITE_API_BASE_URL`, `withCredentials: true` so the httpOnly auth cookie is sent) is the only way any component talks to the backend. Response/error interceptors normalize error shapes so every feature handles errors the same way (Section 11).

### 4.6 Loading, error, empty, and not-found states

- **FE-11 — Loading states**: Every data-dependent view (listings, detail pages, admin tables, form submission) renders an explicit loading indicator (a lightweight skeleton or spinner component from `shared/components/`) while its request is in flight — never a blank screen.
- **FE-12 — Error states**: Every data-dependent view renders an explicit, non-crashing error state on API failure (FR-P3), distinct from not-found and empty states, with a retry affordance where it makes sense (e.g., re-fetch listings).
- **FE-13 — Empty states**: Listing views (Projects, Retail, admin tables, cart) render a defined empty state when no published/eligible items exist — no fabricated placeholder content, no skeleton left spinning forever.
- **FE-14 — Not-found states**: Project/retail detail pages render a not-found state for invalid, deleted, or unpublished slugs (FR-C4, FR-E3); unmatched routes render a generic 404 view via the router's catch-all route.

### 4.7 Styling approach (Tailwind-first)

- **FE-15 — Tailwind as the default**: All layout, spacing, color, typography, and responsive behavior is expressed via Tailwind utility classes directly in JSX. `tailwind.config.js` defines the project's design tokens once (color palette, spacing scale, font families, custom breakpoints if the default set is insufficient) so every component pulls from the same source of truth rather than hand-writing one-off values.
- **FE-16 — When plain CSS is allowed**: Only for (a) global resets/base typography/`@font-face` in a single global stylesheet imported once at the app root, (b) keyframes that GSAP/Framer Motion reference by class name where defining them in Tailwind's config is awkward, (c) scrollbar styling, (d) any CSS custom property (`--variable`) that JavaScript needs to read/write directly for an animation value. Plain CSS is never used as a substitute for Tailwind utilities out of habit or preference.
- **FE-17 — Design discipline**: The PRD calls for a minimal, professional aesthetic. This is implemented through generous whitespace (consistent vertical rhythm via a spacing scale, not ad-hoc margins), a restrained color palette and type scale defined once in `tailwind.config.js`, and consistent component sizing — not through arbitrary one-off Tailwind values (`mt-[13px]`) scattered through the codebase. Arbitrary values are a signal to add a token to the config instead.

### 4.8 Animation architecture (Framer Motion + GSAP + Lenis)

- **FE-18 — Lenis setup**: Lenis is initialized once at the application root (e.g., in `App.jsx` inside a `useEffect`, or a dedicated `SmoothScrollProvider` component wrapping the whole app). It drives a `requestAnimationFrame` loop that updates scroll position with easing/inertia. This is the single source of truth for "where the user has scrolled to."
- **FE-19 — GSAP + ScrollTrigger sync with Lenis**: `ScrollTrigger`'s internal scroll listener is told to use Lenis's scroll value instead of the native `window.scroll` — Lenis exposes a `scroll` event that updates `ScrollTrigger` on every tick, and `ScrollTrigger.scrollerProxy`/`ScrollTrigger.update` is called from Lenis's RAF loop so the two stay perfectly in sync. Without this sync, pinned sections and scrubbed animations will visibly lag or jump against Lenis's eased scroll.
- **FE-20 — Section pinning**: Any section that must remain fixed in the viewport while its internal content animates as the user scrolls (e.g., a portfolio showcase, an "our process" section with steps revealing one at a time) is implemented with GSAP's `pin: true` on a `ScrollTrigger` instance, with `pinSpacing` handled correctly so layout below the pinned section is not visually broken. Pinning is set up inside a `useLayoutEffect`/`useGSAP` (from `@gsap/react`, if adopted — otherwise a manually cleaned-up `useEffect`) so timelines are created after layout and torn down (`.kill()`) on unmount, preventing duplicate ScrollTriggers on route change or hot-reload.
- **FE-21 — Framer Motion usage**: Used for anything not tied to scroll position — page/route transition wrapping via `AnimatePresence`, card hover/tap states, modal/drawer open-close, list stagger on mount (e.g., project grid items fading/sliding in once, on initial render or when they first mount after a route change), shared-layout animation (e.g., an image expanding from a card into a detail view, if implemented).
- **FE-22 — `react-intersection-observer` usage**: Used to defer work, not to replace GSAP's scroll-scrubbed animation. Concretely: gating when a heavy component (e.g., a large gallery or an embedded map) actually mounts, triggering a one-time Framer Motion `animate` state change when a section first becomes visible (for simple fade/slide-in reveals that do not need scroll-scrubbing or pinning), and deferring non-critical image loads until they are near the viewport.
- **FE-23 — Performance discipline for animation**: All animated properties are restricted to `transform` and `opacity` wherever possible (GPU-accelerated, does not trigger layout/reflow). `will-change` is applied sparingly and only on elements actively animating, then removed/reset afterward — never left globally on many elements, which degrades performance rather than helping it. GSAP timelines and ScrollTriggers are always killed/reverted in cleanup functions to avoid memory leaks and duplicate triggers across React re-renders and route changes.
- **FE-24 — Reduced motion**: The app reads `prefers-reduced-motion` (via a small hook wrapping `window.matchMedia`) and, when set, disables or significantly reduces non-essential Framer Motion/GSAP animation (e.g., skip scroll-scrubbing, use instant/opacity-only transitions) without ever hiding or delaying functional content or controls.
- **FE-25 — Low-end device consideration**: Animation complexity (number of simultaneously animating elements, use of blur/shadow filters during animation, scrub granularity) is kept deliberately restrained so the experience stays smooth on low-end mobile hardware, not just on the developer's machine — this is a design constraint on *how much* is animated at once, not just *how* it is coded.

### 4.9 SEO (frontend responsibilities)

- **FE-26 — Dynamic metadata**: A shared `SEO`/`Seo` component (wrapping a Helmet-equivalent, or Vite/React 19's native document metadata support if adopted — decision recorded once, applied consistently) sets `<title>`, meta description, and canonical URL per page, sourced from either the page's static data file (for static pages) or the fetched resource (for project/retail detail pages).
- **FE-27 — Open Graph**: The same `SEO` component optionally accepts Open Graph fields (title, description, image) for key public pages (Home, Project Detail, Retail Detail), defaulting to sensible values from data files when a page has none of its own.

### 4.10 Images & media

- **FE-28 — Image handling**: All project/retail images render from Cloudinary URLs; Cloudinary's transformation parameters (width/height, `f_auto` for automatic format, `q_auto` for automatic quality) are appended to the URL at render time via a small `buildCloudinaryUrl` helper, so every image request is already optimized and correctly sized for its container — never a full-resolution original rendered into a small card.
- **FE-29 — Responsive images & no layout shift**: Every image element has an explicit `width`/`height` (or an `aspect-ratio` utility class) reserved before the image loads, so the browser allocates the correct space immediately and no layout shift occurs when the image finishes loading (this directly satisfies the "no layout shifting" requirement in Section 15).
- **FE-30 — Lazy loading**: Below-the-fold images use native `loading="lazy"`, combined with `react-intersection-observer` where finer control over *when* a component mounts (not just when an `<img>` loads) is needed.

### 4.11 Performance (frontend-specific — see also Section 16)

- **FE-31 — Code splitting**: Admin routes are loaded via `React.lazy` + `Suspense` so the public bundle never includes admin-only code. Any particularly heavy feature (e.g., a large gallery/lightbox) is similarly split.
- **FE-32 — Avoiding re-renders**: List rendering (project/retail grids, admin tables) uses stable `key`s (the resource's `_id`/`slug`, never array index for data that can reorder/change) and `React.memo`/`useMemo`/`useCallback` where a measured re-render cost justifies it — not applied speculatively everywhere, which adds complexity without benefit.

---

## 5. Backend Technical Requirements

- **BE-01 — Server initialization**: A single Express application (`server.js` or `app.js` + `server.js` split) bootstraps, in order: environment loading (`dotenv`), security middleware, CORS, body parsing, cookie parsing, route registration, static-file serving for the frontend build (production only — Section 20), and finally the centralized error handler. The server does not begin accepting traffic until the MongoDB Atlas connection is confirmed established.
- **BE-02 — Express configuration**: JSON body parsing (`express.json()`), cookie parsing (`cookie-parser`), CORS restricted to known origin(s) per environment, and `helmet` security headers are configured globally before route registration.
- **BE-03 — Middleware**: Distinct middleware layers exist for: request parsing, CORS, security headers (`helmet`), rate limiting (scoped to login/enquiry/checkout routes), authentication (JWT verification from the httpOnly cookie), authorization (role/status check), request validation (`express-validator` chains per route), file upload handling (Multer, scoped to project/retail admin routes), and centralized error handling (registered last, after all routes).
- **BE-04 — API routing**: Routes are grouped by resource (`auth`, `projects`, `retail`, `enquiries`, `orders`) and by access level (public vs. admin), mounted under clear path prefixes (`/api/auth`, `/api/projects`, `/api/admin/projects`, etc.), each in its own `*.routes.js` file, all aggregated in a single `routes/index.js` mounted once in `server.js`.
- **BE-05 — Controllers**: Controllers handle request/response concerns only (extracting input via `req.body`/`req.params`/`req.query`, calling the relevant service, shaping the JSON response, calling `next(err)` on failure). They never contain direct Mongoose queries or external-service SDK calls.
- **BE-06 — Services/business logic**: A service layer (`services/`) encapsulates business rules — publish-visibility filtering, price re-validation at checkout, order-snapshot construction, payment verification, enquiry-to-email orchestration, Cloudinary upload orchestration — independent of HTTP/Express concerns, so this logic is testable and reusable without a request/response object.
- **BE-07 — Validation**: Every mutating endpoint (create/update for projects, retail, enquiries; checkout; login) runs an `express-validator` validation chain before any service/database call; a validation-result-checking middleware short-circuits with a structured 400 response before the controller body executes if any check fails.
- **BE-08 — Authentication**: Implemented per Section 8. Middleware (`protect`/`requireAuth`) verifies the JWT from the httpOnly cookie on every protected route.
- **BE-09 — Authorization**: Implemented per Section 8; verified identity (and account status) is checked before allowing project/retail/enquiry/order mutations.
- **BE-10 — Database communication**: Only the model/service layer communicates with MongoDB via Mongoose; controllers and routes never issue direct queries.
- **BE-11 — Error handling**: Implemented per Section 11; all thrown/rejected errors are funneled (via `next(err)`, or an `async` route wrapper that forwards rejected promises automatically) to the centralized error-handling middleware, which returns a consistent response shape and logs server-side context.
- **BE-12 — Response handling**: All API responses follow a consistent envelope — e.g., `{ success: true, data }` on success and `{ success: false, message, errors? }` on failure — across every resource, so the frontend's `axios` interceptor can handle all responses uniformly.
- **BE-13 — Logging**: Server errors, authentication failures, database errors, and external-integration failures are logged server-side with request context (method, path, timestamp, and — for authenticated requests — the admin identity, never the password/token itself).
- **BE-14 — Environment configuration**: All secrets and environment-specific values (MongoDB Atlas URI, JWT signing secret, EmailJS keys, Razorpay keys, Cloudinary credentials, allowed CORS origin, cookie domain/secure flags) are read from `process.env`, populated by `dotenv` locally and by Hostinger's environment configuration in production — never hardcoded, never committed.
- **BE-15 — CORS**: In production, since the frontend is served by the same Express server (Section 20), cross-origin requests to the API are not strictly required for the site itself to function — but CORS is still configured explicitly (allowing the production domain, and credentials) so the API remains safely callable from that known origin and rejects everything else.
- **BE-16 — Security middleware**: `helmet` for headers, `express-validator` for input validation/sanitization at the boundary, `express-rate-limit` on login, enquiry submission, and checkout initiation.

**Layer separation (strict):**

- **Routes** — define endpoint paths, HTTP methods, and the middleware chain (validation → auth → controller); no business logic.
- **Controllers** — orchestrate request handling; call services; format responses; contain no Mongoose queries.
- **Services** — business logic, cross-cutting rules, external-service orchestration (Cloudinary, Razorpay, EmailJS).
- **Models** — Mongoose schema definitions and any data-access instance/static methods that belong naturally on the model.
- **Middleware** — cross-cutting concerns (auth, validation runner, upload, rate limiting, error handling) reusable across routes.

---

## 6. API Requirements

(Unchanged in shape from the prior revision — restated here for completeness, now explicitly tied to the JWT/cookie auth mechanism defined in Section 8.)

### Authentication

| Requirement | Detail |
|---|---|
| **API-01 — Admin login** | `POST /api/auth/login`. Public. Validates credentials against a `bcrypt`-hashed password; on success sets an httpOnly, `Secure`, `SameSite=Strict` (or `Lax`, if cross-site behavior is ever needed) cookie containing a signed JWT. On failure returns a generic authentication error (FR-J2) without revealing account existence. |
| **API-02 — Authentication verification** | `GET /api/auth/me`. Requires a valid cookie/JWT. Confirms current admin identity for frontend session bootstrap on app load; returns 401 if invalid/expired. |
| **API-03 — Logout** | `POST /api/auth/logout`. Requires a valid cookie/JWT. Clears the auth cookie, invalidating the active session (FR-J4). |

### Projects

| Requirement | Detail |
|---|---|
| **API-04 — Create project** | `POST /api/admin/projects`. Admin-only. Multer handles image upload → Cloudinary → validated fields persisted (FR-L1, FR-L5). |
| **API-05 — List projects (public)** | `GET /api/projects`. Public. Returns only published projects (FR-B5). |
| **API-06 — List projects (admin)** | `GET /api/admin/projects`. Admin-only. Returns all projects regardless of publish status. |
| **API-07 — Project detail (public)** | `GET /api/projects/:slug`. Public. Returns a published project by slug; not-found for invalid/deleted/unpublished (FR-C4). |
| **API-08 — Project detail (admin)** | `GET /api/admin/projects/:id`. Admin-only. |
| **API-09 — Update project** | `PUT /api/admin/projects/:id`. Admin-only. Validates server-side (FR-L5); supports publish-status toggle (FR-L3); updates Cloudinary media references as needed. |
| **API-10 — Delete project** | `DELETE /api/admin/projects/:id`. Admin-only. Removes from public access immediately (FR-L4); flags associated Cloudinary assets for cleanup. |

### Retail

| Requirement | Detail |
|---|---|
| **API-11 — Create retail item** | `POST /api/admin/retail`. Admin-only. Validates required fields (FR-M1, FR-M5). |
| **API-12 — List retail (public)** | `GET /api/retail`. Public. Returns only published items (FR-D1). |
| **API-13 — List retail (admin)** | `GET /api/admin/retail`. Admin-only. |
| **API-14 — Retail detail (public)** | `GET /api/retail/:slug`. Public. Not-found for invalid/deleted/unpublished (FR-E3). |
| **API-15 — Retail detail (admin)** | `GET /api/admin/retail/:id`. Admin-only. |
| **API-16 — Update retail item** | `PUT /api/admin/retail/:id`. Admin-only. Independent publish/availability toggling (FR-M3). |
| **API-17 — Delete retail item** | `DELETE /api/admin/retail/:id`. Admin-only. Removes from public access/purchasability immediately; existing orders remain intact (FR-M4). |

### Cart & Checkout

| Requirement | Detail |
|---|---|
| **API-18 — Checkout initiation** | `POST /api/checkout`. Public. Backend re-validates existence, availability, and current price for every item server-side before creating a Razorpay order (FR-F6, FR-G2); rejects empty carts (FR-F5). |
| **API-19 — Payment verification** | `POST /api/checkout/verify`. Public (tied to a specific order/payment reference). Verifies the Razorpay signature server-side; updates order/payment status on success; never marks an order successful on failure/cancellation (FR-G5, FR-G6). |

### Orders

| Requirement | Detail |
|---|---|
| **API-20 — List orders (admin)** | `GET /api/admin/orders`. Admin-only (FR-O1). |
| **API-21 — Order detail (admin)** | `GET /api/admin/orders/:id`. Admin-only. |
| **API-22 — Update order status** | `PATCH /api/admin/orders/:id/status`. Admin-only. Order status only; payment status is never settable here (FR-O3). |

### Enquiries

| Requirement | Detail |
|---|---|
| **API-23 — Submit enquiry** | `POST /api/enquiries`. Public. Backend-validated (FR-I2); persisted; triggers EmailJS notification; email failure never breaks the success response (FR-I4). |
| **API-24 — List enquiries (admin)** | `GET /api/admin/enquiries`. Admin-only; never public (FR-N4). |
| **API-25 — Enquiry detail (admin)** | `GET /api/admin/enquiries/:id`. Admin-only. |
| **API-26 — Update enquiry status** | `PATCH /api/admin/enquiries/:id/status`. Admin-only (FR-N2). |
| **API-27 — Delete enquiry** | `DELETE /api/admin/enquiries/:id`. Admin-only (FR-N3). |

For every API requirement above: authentication requirement is stated (Public / Admin-only); request validation is backend-authoritative per Section 11; success returns the relevant resource/confirmation in the standard response envelope (BE-12); failure returns the same envelope's error shape with an appropriate status code (400 validation, 401 unauthenticated, 403 unauthorized, 404 not found, 409 conflict where applicable, 500 server error). No endpoints beyond those required by the PRD's functional requirements are defined.

---

## 7. Database Requirements

MongoDB Atlas stores five logical collections via Mongoose models: Projects, Retail, Enquiries, Orders, Admin. Full field-by-field schema definitions belong in `DATABASE.md`; this section defines technical requirements only.

### Projects
- **Purpose**: Backing store for the project showcase and detail pages.
- **Required data**: Title, unique slug, category, description, images (array of Cloudinary URLs), publish status, optional price (purchasable projects), optional structured project-specific details, timestamps.
- **Mongoose specifics**: `slug` is `required, unique, lowercase, trim`, generated/validated at write time to guarantee URL-safety; `images` is validated to require at least one entry when `published: true`; `price` uses a conditional `required` (a Mongoose custom validator) only when the project is marked purchasable.
- **Relationships**: Referenced by Orders when purchased (snapshotted at purchase time, not live-populated).
- **Required indexes**: Unique index on `slug`; compound index on `{ published: 1, category: 1 }` (or `{ published: 1 }` alone if category filtering is not a hot query path) to keep public listing queries fast as the collection grows.
- **Timestamps**: Mongoose's built-in `{ timestamps: true }` schema option — never client-settable.

### Retail
- **Purpose**: Backing store for the retail catalog, detail pages, and cart/checkout.
- **Required data**: Title, unique slug, description, images, price, availability, publish status, timestamps.
- **Mongoose specifics**: `price` uses a `min: 0` validator (non-negative, enforced at the schema level in addition to request-level validation); `slug` unique/lowercase/trim, same as Projects.
- **Required indexes**: Unique index on `slug`; index on `{ published: 1, availability: 1 }` for efficient public listing queries.
- **Publication/status handling**: `published` and `availability` are independent booleans (FR-M3).

### Enquiries
- **Purpose**: Backing store for lead capture.
- **Required data**: Name, email, phone (String type, never Number, to preserve leading zeros/formatting), message, source/page, status, submission date.
- **Mongoose specifics**: `email` validated against a standard email-format regex/validator at the schema level as a second line of defense behind request validation; `status` is a Mongoose `enum` (`['new', 'in-progress', 'resolved']`) so invalid values are rejected at the database layer even if application logic has a bug.
- **Required indexes**: Index on `{ status: 1, createdAt: -1 }` to support admin listing/sorting/filtering efficiently.
- **Visibility**: Never exposed through any public-facing endpoint (FR-N4).

### Orders
- **Purpose**: Backing store for checkout/payment records and admin order management.
- **Required data**: Order identifier, customer information, snapshot of purchased item(s) (name, quantity, unit price, total at time of purchase), server-calculated order amount, payment information (Razorpay order/payment references, verification status), payment status, order status, timestamps.
- **Mongoose specifics**: Purchased-item snapshots are embedded subdocuments (not a live `ref` populate) so they remain accurate even if the source Project/Retail document later changes or is deleted (FR-H2, FR-M4); `paymentStatus` and `orderStatus` are separate `enum` fields (FR-H4).
- **Required indexes**: Index on `{ paymentStatus: 1, orderStatus: 1 }` for admin filtering; index on `razorpayOrderId`/`razorpayPaymentId` for fast lookup during verification.
- **Data integrity**: `amount` is never accepted from client input at the schema/controller boundary — it is always computed server-side in the checkout service and only the computed value is ever passed to the model (FR-G3).

### Admin
- **Purpose**: Backing store for administrator authentication.
- **Required data**: Name, email, hashed password, role, account status, timestamps including `lastLoginAt`.
- **Mongoose specifics**: `password` field is excluded from query results by default (`select: false` in the schema) so it is never accidentally returned in any API response; it is explicitly `.select('+password')`-ed only inside the login service, immediately after which the hash is never included in the response payload.
- **Required indexes**: Unique index on `email`.

### 7.1 Mongoose connection management

- The connection is established once, at server startup, in a dedicated `config/db.js` module exporting a single `connectDB()` function called from `server.js`.
- Connection failures cause the process to log the error clearly and exit (or retry with backoff, if a resilience requirement is later added) rather than allowing the server to start in a broken, half-functional state.
- `mongoose.set('strictQuery', true)` (or the current Mongoose-recommended equivalent) is set explicitly rather than relying on version-dependent defaults, so query behavior is predictable.

---

## 8. Authentication & Authorization

### Authentication (Who is the user?)

- **AUTH-01**: `/admin/login` accepts credentials and verifies them against a `bcrypt`-hashed password stored in the Admin collection (FR-J1). Plaintext passwords are never stored, logged, or returned in any response. Hashing uses a cost factor appropriate for production security without making login latency noticeable (a standard, current `bcrypt` salt-round value).
- **AUTH-02**: On successful verification, the backend signs a JWT (`jsonwebtoken`) containing the minimum necessary claims (admin ID, role — never the password hash) with a defined, reasonable expiry (e.g., a few hours to a day, tuned to the admin's actual usage pattern), and sets it as an **httpOnly, Secure, SameSite** cookie. The token is never returned in the JSON response body and never stored in `localStorage`/`sessionStorage`, which keeps it inaccessible to any injected client-side script.
- **AUTH-03**: Invalid credentials return a generic authentication error that does not distinguish "user not found" from "wrong password" (FR-J2).
- **AUTH-04**: Logout (`POST /api/auth/logout`) clears the cookie server-side (setting an expired/empty cookie with matching attributes), so the browser stops sending a usable token on subsequent requests (FR-J4).
- **AUTH-05**: Expired or otherwise invalid/missing tokens are rejected by the `protect` middleware with a 401-equivalent response, distinct from an authorization (403) failure for a valid-but-insufficiently-privileged/disabled account.

### Authorization (What is the authenticated user allowed to do?)

- **AUTH-06**: Every `/admin/*` frontend route displays protected content only after the `AuthContext`'s session check resolves (via `GET /api/auth/me` on app load); this is a UX convenience, not a security boundary (FR-J5).
- **AUTH-07**: Every corresponding backend endpoint independently re-verifies authentication (`protect` middleware) and, where relevant, authorization on each request — regardless of frontend route protection (FR-J5, FR-J3).
- **AUTH-08**: The current scope defines a single `admin` role; all authenticated admins may manage projects, retail, enquiries, and orders. Account status (`active`/`disabled`) is checked in the `protect` middleware in addition to token validity, per the Admin Data definition in the PRD.
- **AUTH-09**: Admin functionality (project/retail/enquiry/order CRUD, image upload) is never reachable through any public/unauthenticated endpoint — enforced by mounting all such routes exclusively under the `protect`-guarded `/api/admin/*` prefix.
- **AUTH-10**: No secrets (JWT signing key, database credentials, Razorpay/Cloudinary/EmailJS credentials) are ever placed in frontend source, the Vite bundle, or any `VITE_`-prefixed environment variable (anything prefixed `VITE_` is bundled into client-visible code by Vite, which is precisely why only genuinely public values ever use that prefix — see Section 18).

---

## 9. CRUD Requirements

### Projects
- **Create** → `protect` + admin check → `express-validator` chain → Multer processes image(s) → Cloudinary upload service → persist via Mongoose → return created resource in the standard envelope.
- **Read** → Public: fetch, `.find({ published: true })`, return. Admin: fetch by ID regardless of status, return.
- **Update** → `protect` + admin check → validate → update fields (including independent publish-status toggle) → persist → return updated resource.
- **Delete** → `protect` + admin check → remove document → immediately excluded from public listing/detail queries (since queries always filter on `published`/existence) → flag associated Cloudinary assets for cleanup (a service-layer call to Cloudinary's destroy API using the stored public ID) → return confirmation.

### Retail
Same lifecycle as Projects, with independent `published`/`availability` toggles (FR-M3), and deletion never corrupting an existing order, because orders store an embedded snapshot rather than a live reference (FR-M4).

### Enquiries
- **Create** → Public → client-side validation (UX) → backend validation (authoritative, `express-validator`) → persist via Mongoose → trigger EmailJS notification (awaited but its failure does not change the HTTP response already determined by successful persistence) → return success/error.
- **Read** → Admin-only → list and detail views; never exposed publicly (FR-N4).
- **Update** → Admin-only → status transition only (`new` → `in-progress` → `resolved`) (FR-N2).
- **Delete** → Admin-only → hard removal (FR-N3).

Frontend states rendered exactly per PRD Section 9: Initial, Validation error, Submitting, Success, Failure.

---

## 10. Enquiry & EmailJS Integration

**Flow**: `User Form → Frontend Validation → Backend API → Backend Validation → MongoDB → EmailJS Notification → Response → UI State`

- The enquiry form is a single reusable component (`shared/components/EnquiryForm.jsx`) rendered on Contact and, where configured, on project/retail/service feature pages (FR-I1), carrying a `source`/`page` field auto-populated from the current route so the backend knows where each enquiry originated.
- Frontend validation (required fields, email format via a small shared `isValidEmail` util) gives immediate feedback but is never authoritative.
- On submit: the component sets `isSubmitting = true`, disables the submit control, calls `POST /api/enquiries` via the shared `axiosClient`, and only re-enables/resets on a settled promise (success or failure) — this satisfies FR-I5's duplicate-submission prevention.
- Backend validation (`express-validator`) re-checks all required fields, email format, and message length before any persistence occurs; failures are rejected with field-level error detail in the standard error envelope.
- On successful validation, the enquiry is persisted to MongoDB first (via the model layer); the EmailJS notification is triggered as a subsequent step in the service layer, wrapped in its own `try/catch` so a failure there is caught, logged (LOG-05), and does not throw past the point where the success response has already been determined by the successful `save()`.
- The frontend renders Initial, Validation error, Submitting, Success, and Failure states exactly as defined in PRD Section 9.
- EmailJS configuration (service ID, template ID, and whichever key the chosen EmailJS integration pattern requires client-side vs. server-side) is held in environment variables, scoped correctly per Section 18 — any key that must remain private is used only server-side and never given a `VITE_` prefix.

---

## 11. Validation & Error Handling

### Frontend Validation
- Required-field checks, email/phone format checks, and message length limits are enforced before submission on: enquiry form, checkout form, and all admin CRUD forms, using small shared validator utilities (`shared/utils/validators.js`) rather than duplicated inline regex per form.
- Validation errors are shown inline, associated with their fields (via `aria-describedby` — see Section 14), and prevent submission.
- Frontend validation exists purely for UX responsiveness; it duplicates, but never replaces, backend validation.

### Backend Validation
- Backend validation is authoritative for every mutating endpoint regardless of client-side outcome.
- Implemented as `express-validator` chains attached per route (e.g., `[body('email').isEmail(), body('phone').isString().notEmpty(), ...]`), followed by a shared `handleValidationErrors` middleware that inspects `validationResult(req)` and short-circuits with a structured 400 response before the controller runs.
- Covers: required-field presence, data type correctness, format (email, slug URL-safety, phone-as-string), numeric constraints (non-negative price via a custom validator), and controlled-value fields (status enums, category from an approved set — validated against a shared constant list also referenced by the Mongoose `enum`).
- Free-text input (enquiry message, descriptions) is trimmed and length-capped; if any of this content is ever rendered as raw HTML anywhere (it is not, per the PRD's scope, but the rule stands defensively), it would additionally be sanitized before storage.

### Error Handling
- **400-level validation errors**: returned with field-level detail (`{ success: false, message, errors: [{ field, message }] }`) sufficient for the frontend to highlight the specific issue.
- **Authentication errors (401)**: missing, invalid, or expired cookie/JWT.
- **Authorization errors (403)**: valid session but insufficient permission or disabled account.
- **Not-found errors (404)**: invalid, deleted, or unpublished resource lookups (public), or invalid IDs (admin) — including a check for a syntactically invalid Mongoose ObjectId, which is caught and mapped to a 404/400 rather than surfacing as an uncaught cast error.
- **Database errors**: caught by wrapping async controllers in a small `asyncHandler` utility that forwards rejections to `next(err)`; the centralized error middleware logs full context server-side and returns a generic server error to the client without exposing internals.
- **External service errors** (EmailJS, Razorpay, Cloudinary): caught at the service layer, logged, and translated into a controlled generic response; provider-specific error internals or credentials are never surfaced to the client (PRD Section 11).
- **Server errors (500)**: caught by the centralized error-handling middleware as a last resort; stack traces and environment detail are never included in production responses (only in local development logs).
- **Network failures**: the frontend's `axios` interceptor distinguishes "request never reached the server" (network/timeout error, no `response` object) from "server returned an error" (`response.status` present) and renders the appropriate error state (FR-P3) rather than an indefinite loading state.

---

## 12. Security Requirements

- **SEC-01**: Admin authentication uses `bcrypt`-hashed credentials, never reversible encryption or plaintext.
- **SEC-02**: All admin routes and their backend APIs require a valid authenticated session, independently enforced server-side by the `protect` middleware (FR-J3, FR-J5).
- **SEC-03**: All secrets (Atlas URI, JWT signing key, Razorpay keys, Cloudinary credentials, EmailJS private credentials) live only in backend environment variables, never bundled into the Vite frontend build (only `VITE_`-prefixed, deliberately public values are).
- **SEC-04**: CORS is restricted to known origin(s) per environment (local Vite dev server URL in development, the single production domain in production); wildcard origins are never used for credentialed endpoints.
- **SEC-05**: Every mutating endpoint validates and sanitizes input server-side before persistence (Section 11).
- **SEC-06**: `express-rate-limit` is applied to admin login, enquiry submission, and checkout initiation to reduce brute-force and abuse risk.
- **SEC-07**: Admin endpoints for project/retail/enquiry/order mutation reject any request lacking a valid, authorized session, whether accessed via the admin UI or a direct API call.
- **SEC-08**: Unauthorized CRUD attempts on protected resources return 401/403 and perform no data mutation.
- **SEC-09**: Error responses returned to clients never include stack traces, database internals, or credential values, in any environment.
- **SEC-10**: MongoDB Atlas is reachable only from the backend process (via Atlas's IP allowlist/network access rules configured for the Hostinger server's outbound IP, or a suitably scoped connection setup); no direct client access exists (FR-P1).
- **SEC-11**: Production enforces HTTPS for all client-server and server-external-service communication — the Hostinger domain's SSL certificate covers this at the platform level (Section 20).
- **SEC-12**: No public API response ever includes admin credentials, password hashes, payment secrets, database credentials, or enquiry/order data.
- **SEC-13**: Razorpay payment amounts are always computed and verified server-side; a client-supplied amount is never trusted (FR-G3).
- **SEC-14**: Payment success is recognized only after backend verification of the gateway's signed response (using Razorpay's official signature-verification method with the webhook/checkout secret, server-side only); a client-side callback alone never marks a payment or order successful (FR-G5, FR-G6). Admins cannot manually mark a payment as successful (FR-O3).
- **SEC-15**: The JWT cookie is set with `httpOnly: true` (inaccessible to JavaScript, blocking XSS-based token theft), `secure: true` in production (sent only over HTTPS), and an explicit `sameSite` policy chosen to balance the single-domain deployment topology with CSRF resistance.

No security technology is introduced beyond what these PRD-derived requirements justify.

---

## 13. SEO Technical Requirements

- **SEO-01**: Every indexable public page sets a unique `<title>` and meta description via the shared `SEO` component, generated dynamically from actual page content (e.g., project/retail title and description on detail pages, static copy from the relevant `*.data.js` file on static pages).
- **SEO-02**: Each indexable page defines a correct canonical URL matching its own route, derived from a single `SITE_URL` constant plus the current path so it can never drift out of sync with an environment change.
- **SEO-03**: Public URLs are clean, lowercase, and crawlable — `/projects/:slug`, `/retail/:slug` — with slugs generated to be URL-safe at creation time on the backend (a `slugify`-style transformation applied server-side when a project/retail item is created, never left to free-text admin input alone).
- **SEO-04**: `robots.txt` (served as a static file from the backend's `public/` folder alongside the built frontend, or generated at build time) allows crawling of public routes and disallows `/admin/*`; documented explicitly as not a security control — admin routes remain protected by authentication regardless.
- **SEO-05**: An XML sitemap is generated reflecting current publish state — either dynamically via a backend route (`GET /sitemap.xml`) that queries published projects/retail at request time and streams valid XML, or via a scheduled/build-time generation step; in either case it excludes admin routes and unpublished/deleted content and is never a stale, hand-maintained file.
- **SEO-06**: Meaningful images carry descriptive `alt` text sourced from stored content (project/retail title or a stored description field), not generic filenames; purely decorative images (if any) use an empty `alt=""` so assistive technology skips them, satisfying both SEO and accessibility.
- **SEO-07**: Heading hierarchy is logical on every page — exactly one primary `<h1>`, with `<h2>`/`<h3>` used structurally beneath it, enforced as a code-review discipline since React does not enforce this automatically.
- **SEO-08**: Open Graph metadata is included for key public pages (at minimum Home, Project Detail, Retail Detail) via the same `SEO` component, derived from the same dynamic content source as the page title/description, with a sensible fallback image/description when a specific resource has none of its own.

---

## 14. Accessibility Technical Requirements

Target: WCAG 2.2 AA, applied practically to this project's public and admin interfaces.

- **A11Y-01**: Semantic HTML elements (`<nav>`, `<main>`, `<header>`, `<footer>`, `<section>`, list elements, heading elements) are used for structural content rather than generic `<div>`-only markup — Tailwind styles semantic elements exactly as easily as `<div>`s, so there is no tradeoff for using them.
- **A11Y-02**: All interactive elements (links, buttons, form controls, cart icon, mobile menu toggle) are reachable and operable via keyboard, with visible focus states — Tailwind's `focus-visible:` variant is used explicitly on every custom interactive element rather than relying on (or worse, removing) the browser default.
- **A11Y-03**: All form fields have properly associated `<label>`s (via `htmlFor`/`id` pairing); placeholder text alone never substitutes for a label.
- **A11Y-04**: Icon-only controls (cart icon, mobile menu toggle, icon-only admin action buttons rendered via `react-icons`) carry an accessible name via `aria-label`.
- **A11Y-05**: Validation and error messages are programmatically associated with their fields via `aria-describedby` pointing at the error message's `id`, so assistive technology announces them when they appear.
- **A11Y-06**: ARIA attributes are used only where semantic HTML is insufficient; native semantics are preferred first.
- **A11Y-07**: Text/background color contrast meets WCAG requirements across public and admin UI — verified against the actual color tokens defined in `tailwind.config.js`, not assumed; color is never the sole means of conveying state (publish status, order status, validation errors also carry text/icon indicators, not color alone).
- **A11Y-08**: Meaningful images carry descriptive alt text (shared requirement with SEO-06).
- **A11Y-09**: `prefers-reduced-motion` handling (FE-24) satisfies this requirement directly — non-essential animation is disabled/reduced without hiding or delaying functional content.
- **A11Y-10**: Any modal/dialog interaction (a cart drawer, a confirmation dialog) manages focus correctly on open (focus moves into the dialog, typically to its first focusable element or a heading) and close (focus returns to the element that triggered it) — implemented explicitly, since React/Framer Motion do not provide this automatically.
- **A11Y-11**: Navigation, including the mobile menu, remains fully operable and understandable via keyboard and screen reader across breakpoints — the mobile menu toggle uses `aria-expanded` reflecting its open/closed state.

---

## 15. Responsive & Device Requirements

- **RESP-01**: The application functions correctly from 320px mobile width up to 3840px (4K) desktop width, without horizontal scrolling for normal content, implemented primarily through Tailwind's responsive prefixes plus fluid units rather than a fixed set of hard breakpoint overrides alone.
- **RESP-02**: Navigation collapses into an accessible mobile menu below Tailwind's `md` breakpoint (or a custom breakpoint if the design calls for it); all primary links (Home, Projects, Retail, Services, About, Contact, Cart) remain reachable at every width.
- **RESP-03**: Layouts reflow (stacking, column-count reduction via Tailwind's grid/flex responsive utilities) rather than hiding content at smaller widths.
- **RESP-04 — No stretch, no crop, no layout shift**: Every image reserves its space via an explicit `aspect-ratio` (Tailwind's `aspect-*` utilities) or explicit `width`/`height` attributes before it loads (FE-29); `object-fit: cover` (Tailwind `object-cover`) is used where cropping-to-fill is intentional and consistent, never `object-fill`, which would stretch/distort images. This combination is what actually guarantees zero layout shift and zero unintended stretching across the full 320px–3840px range, not a single rule alone.
- **RESP-05**: Forms (enquiry, checkout, admin CRUD) remain usable and fully visible without overflow at mobile widths — inputs use `w-full` within appropriately constrained containers, never fixed pixel widths.
- **RESP-06**: Project and retail grids adapt column count responsively (e.g., 1 column on mobile, 2 on tablet, 3–4 on desktop, capped at a sensible max on ultra-wide/4K so cards do not become absurdly large — achieved via a `max-w-*` container plus Tailwind's grid responsive classes) without breaking card layout at any width in between.
- **RESP-07**: Typography scales fluidly across the full width range — implemented via Tailwind's responsive text-size utilities at defined breakpoints, and, where a smoother in-between scaling is desired, via `clamp()`-based custom CSS variables (the one sanctioned plain-CSS use case from FE-16) feeding Tailwind's arbitrary-value syntax or a small typography utility layer.
- **RESP-08**: The admin panel remains usable on tablet and desktop widths; complex tables (orders, enquiries, project/retail lists) scroll within their own `overflow-x-auto` container rather than causing the whole page to scroll horizontally.
- **RESP-09**: All interactive elements meet reasonable touch-target sizing (minimum ~44×44px effective hit area) on touch devices.
- **RESP-10 — Testing discipline**: Responsive behavior is verified at genuine boundary widths — 320px, common mobile widths (~375–430px), tablet (~768px), laptop (~1280–1440px), desktop (~1920px), and ultra-wide/4K (~2560–3840px) — not just at the browser's default resized-window size, since layout bugs frequently hide between arbitrarily chosen test points.

---

## 16. Performance Requirements

- **PERF-01**: Project/retail images are served through Cloudinary's delivery pipeline with `f_auto` (automatic best format — WebP/AVIF where supported) and `q_auto` (automatic quality) transformation parameters applied via the URL-building helper (FE-28), rather than as unoptimized raw uploads.
- **PERF-02**: Below-the-fold images are lazy-loaded (`loading="lazy"` plus `react-intersection-observer` where component-level mount deferral is also needed).
- **PERF-03**: Vite's automatic code-splitting plus `React.lazy`/`Suspense` on the admin route tree ensures public visitors never download admin-only JavaScript.
- **PERF-04**: Route-level loading states (FE-11) prevent blank-screen waits during navigation-triggered data fetches.
- **PERF-05**: API requests are scoped to what each view needs (listing endpoints return summary fields via Mongoose `.select()`; full detail is fetched only on the detail view) rather than over-fetching entire documents everywhere.
- **PERF-06**: List rendering avoids unnecessary re-renders through stable keys and `React.memo`/`useMemo` applied where a measured cost justifies it (FE-32).
- **PERF-07**: Database queries for public listings use the indexes defined in Section 7 (publish status, slug, compound indexes) to avoid full-collection scans as data grows.
- **PERF-08**: Pagination (Mongoose `.limit()`/`.skip()`, or cursor-based pagination if list sizes grow large) is applied to admin listing endpoints (orders, enquiries) once volume makes unbounded lists impractical.
- **PERF-09 — Animation performance**: Framer Motion and GSAP animations are restricted to `transform`/`opacity` (FE-23); GSAP `ScrollTrigger` instances use `scrub` values tuned to avoid excessive recalculation, and pinned sections are limited to what is genuinely necessary rather than pinning every section on the page.
- **PERF-10 — Smooth scroll performance**: Lenis's easing/duration values are tuned (not left at aggressive defaults) so the scroll feels smooth without introducing perceptible input lag, and Lenis's RAF loop is the single driver of both scroll position and GSAP's `ScrollTrigger.update()` — never two competing scroll-update loops running simultaneously, which is the most common cause of janky "smooth scroll" implementations.
- **PERF-11 — Low-end device target**: Performance is validated against a throttled CPU/network profile (e.g., browser dev tools' 4x CPU slowdown + a throttled 3G/4G network preset), not only on the developer's own hardware — this directly satisfies the requirement that the site "feel smooth on low-end devices too."
- **PERF-12**: Fonts are loaded efficiently — a minimal number of font weights/families, `font-display: swap` (or an equivalent strategy) so text remains visible during font load rather than invisible, and self-hosted or preconnected font sources to avoid render-blocking third-party font requests where avoidable.
- **PERF-13**: Production frontend builds are minified and tree-shaken via Vite/Rollup automatically; no unused heavy dependencies are shipped (this is why Section 0/2.1's "no unnecessary packages" rule is a performance requirement, not just a tidiness preference — every extra dependency is bytes the low-end mobile user has to download and parse).
- **PERF-14**: Bundle size is periodically checked (e.g., via `vite build` output stats or `rollup-plugin-visualizer` used only as a local/dev-time analysis tool, never a production dependency) so regressions are caught before they ship.

No specific performance score is guaranteed; requirements are measurable and technically reasonable rather than aspirational.

---

## 17. Media & Asset Requirements

- Project and retail images are uploaded by admins through Multer-handled multipart requests (in-memory storage, not written to local disk, since the production server's local filesystem is not a durable or scalable place to keep uploaded files), validated server-side for file type (image MIME types only), size (a defined maximum per file), and count before being forwarded to Cloudinary.
- Cloudinary is the sole store for image binaries; MongoDB persists only the resulting secure URL/public ID (never binary data).
- Images are requested/rendered responsively via Cloudinary's transformation parameters appended per usage context (a smaller transform for a grid card, a larger one for a detail-page hero), never a single fixed full-resolution URL reused everywhere regardless of display size.
- Aspect ratio is preserved in both storage-side handling (no forced distortion) and frontend rendering (RESP-04).
- Every rendered image carries `alt` text sourced from stored content (SEO-06/A11Y-08).
- Video handling is out of scope; no video upload or playback pipeline is defined, as the PRD does not require one.
- Cloudinary asset organization uses a per-resource folder/naming convention (e.g., a `projects/<projectId>/` or `retail/<retailId>/` path prefix within the Cloudinary account) sufficient to support the cleanup step required on deletion (FR-L4) — the stored public ID is always enough, on its own, to issue a Cloudinary `destroy` call without any additional lookup.
- No additional external media-storage service is introduced beyond Cloudinary.

---

## 18. Environment Configuration

### Frontend Environment Variables (`VITE_`-prefixed — bundled into client-visible code by Vite)

Only values that genuinely belong on the client:

- `VITE_API_BASE_URL` — the backend API's base path (in production, since frontend and backend are co-hosted on the same domain, this can simply be a relative `/api` path; in local development it points at `http://localhost:<backend-port>/api`).
- `VITE_RAZORPAY_KEY_ID` — the Razorpay public key identifier required to open the Razorpay checkout widget client-side (the corresponding key **secret** remains backend-only and is never given a `VITE_` prefix, per FR-G4/SEC-03).
- Any EmailJS identifier that the provider's own documentation designates as public-facing, if the chosen EmailJS integration pattern invokes it client-side for a non-sensitive step.

**Rule, stated plainly**: anything prefixed `VITE_` ends up readable in the browser's network tab / bundled JS. If a value is a secret, it never gets that prefix and never lives in the frontend `.env` file at all.

### Backend Environment Variables (server-only, never bundled)

- `MONGODB_URI` — MongoDB Atlas connection string.
- `JWT_SECRET` — signing secret for admin session tokens.
- `JWT_EXPIRES_IN` — token/cookie expiry duration.
- `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` — full Razorpay credential pair (the secret never reaches the frontend).
- `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET`.
- EmailJS server-side credentials, if the chosen integration pattern requires any.
- `CORS_ORIGIN` — the allowed frontend origin per environment.
- `COOKIE_SECURE` / `COOKIE_SAME_SITE` — explicit flags for the auth cookie's security attributes, so production vs. local behavior is configured, not hardcoded conditionally in code.
- `PORT` — the port Express listens on (Hostinger typically assigns/expects this via its own environment variable, which the app reads with a sensible local fallback).
- `NODE_ENV` — `development` / `production`, used to toggle error verbosity (Section 11), cookie `secure` flag defaults, and whether the static frontend-serving middleware is even mounted (Section 20).

No secret values are reproduced in this document; only variable names, their scope (frontend vs. backend), and their purpose are defined. Private secrets are never placed in frontend source code or given a `VITE_` prefix.

---

## 19. Development & Build Requirements

- **DEV-01**: Local development runs the backend with `nodemon` (auto-restart on change) and the frontend with `vite` (hot-reloading dev server), both pointed at development-scoped `.env` files. During local development the two run on separate ports, and CORS (Section 5) is configured to allow the Vite dev server's origin.
- **DEV-02**: Frontend and backend maintain independent, clearly separated `.env` files for development vs. production, preventing accidental use of production credentials locally; `.env` files are `.gitignore`d, and an `.env.example` (with variable names but no real values) is committed instead so the required configuration is discoverable.
- **DEV-03**: The production frontend build (`npm run build` inside the frontend package, i.e., `vite build`) must complete without errors and produce a static, deployable `dist/` bundle.
- **DEV-04**: The production backend must start without errors under production environment configuration, including a successful MongoDB Atlas connection, before it is considered deployable.
- **DEV-05**: Dependency management uses `npm` with a committed `package-lock.json` in both the frontend and backend packages, so installs are reproducible across machines and on Hostinger.
- **DEV-06**: ESLint runs against the JavaScript codebase (React + Node configs as appropriate per package) as a pre-deploy sanity check; there is no TypeScript compiler step anywhere in the pipeline, by design (Section 0).
- **DEV-07**: Build validation (successful frontend build, successful backend startup) is treated as a hard gate before any deployment (Section 24).

Command-level tutorials are intentionally excluded; this section documents requirements, not step-by-step instructions.

---

## 20. Deployment & Production Requirements — Hostinger (Single Server, Git-Based)

This is the definitive production topology: **one Hostinger Business (Node.js-capable) hosting plan, one Git-imported repository, one running Node process that serves both the API and the built frontend.** No separate static hosting, no separate backend host, no reverse proxy between two services — Express does both jobs directly.

### 20.1 Repository shape for a single-server deploy

- The repository contains two packages — a `frontend/` (Vite React app) and a `backend/` (Express app) — or, if the project's supplied folder structure (Section 3) merges them differently, the same principle applies regardless of exact top-level naming: **the frontend's build output must end up inside the backend's `public/` folder**, because that is the folder Express serves as static files in production.
- `backend/public/` is `.gitignore`d — it is a build artifact, populated by the build step, never hand-edited or committed.

### 20.2 Build step (what happens before the server starts)

1. Install frontend dependencies and run `vite build` inside `frontend/`, producing `frontend/dist/`.
2. Copy (or configure Vite's `build.outDir` to output directly to) the contents of `frontend/dist/` into `backend/public/`.
3. Install backend dependencies (`npm install` inside `backend/`, production dependencies only — `nodemon` and any dev-only tooling are declared as `devDependencies` so they are excluded from a production install).
4. Start the backend with `node server.js` (or the platform's expected start command, typically triggered via `npm start`, which should map to exactly this command in `backend/package.json`).

This sequence is expressed as a single top-level `package.json` script (e.g., a root `build` script that runs the frontend build and the copy step, and a `start` script that launches the backend) if Hostinger's Node.js application setup expects one command to build and one to start — matched to whatever Hostinger's specific Node.js hosting panel asks for at setup time.

### 20.3 Express static-serving configuration (production only)

- When `NODE_ENV === 'production'`, after all `/api/*` routes are registered, Express serves `backend/public/` as static files (`express.static(path.join(__dirname, 'public'))`).
- A final catch-all route (registered **after** the static middleware and **after** all `/api/*` routes, so it never intercepts a legitimate API call) responds to any non-API GET request with `backend/public/index.html`. This is the SPA fallback that makes direct URL access and browser refresh work correctly for every `react-router-dom` route (`/projects/some-slug`, `/admin/orders`, etc.) — without it, any route other than `/` would 404 on a hard refresh.
- In development (`NODE_ENV !== 'production'`), this static-serving/catch-all block is skipped entirely — the Vite dev server serves the frontend on its own port, and the backend only serves `/api/*`.

### 20.4 Hostinger-specific deployment requirements

- **DEP-01 — Git import**: The Hostinger Business plan's Node.js application feature imports the repository directly from Git (connecting the repository, selecting the production branch). Every push to that branch (or a manually triggered deploy, depending on Hostinger's exact workflow) pulls the latest code onto the server.
- **DEP-02 — Single Node process**: Hostinger runs the backend's start command as the one persistent Node.js process for the application; that process is what serves both the API and the static frontend build, per Section 20.3. No second process/service is configured.
- **DEP-03 — Node version**: The Node.js version selected in Hostinger's application settings matches the version the project is developed and tested against, pinned via an `engines` field in `backend/package.json` so a version mismatch is surfaced clearly rather than causing subtle runtime bugs.
- **DEP-04 — Environment variables**: All backend environment variables (Section 18) are entered into Hostinger's Node.js application environment-variable configuration panel — never committed to the repository, never hardcoded as a fallback in production code paths.
- **DEP-05 — Domain & SSL**: The Hostinger-issued or connected custom domain is pointed at the Node.js application; Hostinger's SSL (Let's Encrypt or equivalent) is enabled so the entire site — frontend pages and `/api/*` calls alike — is served over HTTPS (SEC-11).
- **DEP-06 — Port binding**: The Express server listens on the port Hostinger's Node.js hosting environment provides (typically via a platform-supplied `PORT` environment variable), read from `process.env.PORT` with a sensible local-development fallback — never a hardcoded production port.
- **DEP-07 — CORS in production**: Since the frontend and API share the same origin in production, CORS's practical role in production is a defensive/explicit allowlist (Section 5's `CORS_ORIGIN`) rather than a functional requirement for the site to work — but it remains configured, not disabled, so the API cannot be casually called cross-origin from an unrelated site.
- **DEP-08 — MongoDB Atlas network access**: Atlas's IP access list is configured to allow connections from Hostinger's server (either a specific outbound IP, if Hostinger exposes a stable one for the plan, or, if the plan uses dynamic/non-static outbound IPs, an appropriately scoped allowance) — this is a required manual configuration step at deploy time, not something the application code can control.
- **DEP-09 — Zero-downtime-minded restarts**: The deployment process restarts the single Node process on each new deploy; because there is only one server/process (no load balancer/multiple instances at this scope), a brief restart window is expected and acceptable — this is documented explicitly so it is not mistaken for a bug.
- **DEP-10 — Rollback path**: Because deployment is Git-based, rolling back to a previous working state means redeploying a previous commit/branch state — the production branch is kept in a state that is always either the current intended release or a clean previous one, never left mid-merge.
- **DEP-11 — Static/media handling**: Cloudinary continues to serve all project/retail images directly in production; the backend's `public/` folder holds only the built frontend app shell/assets, never user-uploaded media.
- **DEP-12 — Build reproducibility**: Because Hostinger runs the build step on its own infrastructure at deploy time (via the Git-import + build/start command configuration), the build must succeed with only `package-lock.json`-pinned dependencies and the environment variables configured in Section 18/DEP-04 — no reliance on any local-machine-only state.

### 20.5 Production request flow (end to end, restated for clarity)

`Browser requests example.com/projects/some-slug` → Hostinger's Node.js app (single Express process) receives the request → not matched by any `/api/*` route → not matched by a literal static file in `public/` → falls through to the SPA catch-all → `index.html` is served → the React app (already loaded/hydrated) resolves `/projects/some-slug` client-side via `react-router-dom` → the `ProjectDetail` feature component calls `GET /api/projects/some-slug` through the shared `axiosClient` (same-origin, relative `/api` base URL) → the same Express process's API route handles it → MongoDB Atlas query → response → rendered.

This single-flow description is the concrete proof that the "one server, one process, backend `public/` folder holds the frontend `dist`" requirement is coherent and sufficient — there is no missing piece in the topology.

---

## 21. Logging & Monitoring

Only what is actually needed, given the PRD's scope:

- **LOG-01 — Server error logging**: Uncaught exceptions and errors passed to the centralized error-handling middleware are logged with request context (route, method, timestamp), excluding secrets and full payment payloads.
- **LOG-02 — API failures**: Failed validation, authentication, and authorization attempts on sensitive endpoints (login, checkout, admin mutations) are logged for operational visibility.
- **LOG-03 — Authentication failures**: Failed login attempts are logged (without ever logging the submitted password) to support basic abuse detection alongside `express-rate-limit`.
- **LOG-04 — Database errors**: Connection failures and query errors are logged server-side with enough detail to diagnose the failure, including at the initial `connectDB()` call so a bad Atlas URI/network-access misconfiguration fails loudly and immediately, not silently.
- **LOG-05 — External integration failures**: EmailJS delivery failures and Razorpay verification failures are logged server-side; EmailJS failures do not affect the user-facing enquiry success response (FR-I4); Razorpay verification failures correctly prevent order success (FR-G6).
- **LOG-06 — Production debugging**: Logs are structured enough (timestamp, route, error type, and — where relevant — the admin identity for admin-scoped errors) to diagnose production incidents without exposing sensitive data in the log output itself. A dedicated logging library is not introduced at this scope; consistent, structured `console.error`/`console.warn` calls through a single small `logger.js` utility (so the format is consistent everywhere) are sufficient unless production log volume later proves otherwise.

No dedicated monitoring/alerting infrastructure is introduced beyond baseline server-side logging, as the PRD does not define a requirement for one.

---

## 22. Technical Constraints

- **TECH-01**: Use the MERN stack (MongoDB, Express.js, React, Node.js) exclusively for application architecture.
- **TECH-02**: Use MongoDB Atlas as the sole application datastore, connected via Mongoose.
- **TECH-03**: Use Express/Node.js for the backend API; the frontend never connects to MongoDB directly (FR-P1).
- **TECH-04**: Use React (JavaScript only, `.jsx`) for the frontend, built with Vite.
- **TECH-05**: **No TypeScript, anywhere, under any circumstance** — no `.ts`/`.tsx` files, no `tsconfig.json`, no `@types/*` packages, no type-checking build step. This is a strict, non-negotiable constraint, not a default that can be revisited casually.
- **TECH-06**: Use Tailwind CSS as the default styling method; plain CSS is used only for the specific exception cases listed in FE-16, never as a general alternative.
- **TECH-07**: Use Framer Motion for component-level animation and GSAP + ScrollTrigger for scroll-driven/pinned animation, per the strict boundary defined in Section 0; the two are never used to implement the same interaction redundantly.
- **TECH-08**: Use Lenis for smooth scrolling, synced to GSAP ScrollTrigger, as the single scroll-position source of truth for the entire app.
- **TECH-09**: Use `react-icons` for all iconography and `react-intersection-observer` for all visibility-based logic; no alternative icon or intersection-observer library is introduced.
- **TECH-10**: Use the documented authentication approach (bcrypt-hashed credentials + httpOnly JWT cookie) for all admin access; no alternate auth mechanism is introduced without approval.
- **TECH-11**: Use EmailJS exclusively for enquiry notification (no SMS/push, per the PRD's explicit Out of Scope).
- **TECH-12**: Use Razorpay exclusively for payment processing.
- **TECH-13**: Use Multer + Cloudinary exclusively for image upload/storage/delivery.
- **TECH-14**: Do not install any package — frontend or backend — that is not explicitly listed in Section 2 or explicitly justified against a named PRD requirement in Section 23. This includes UI kits, state-management libraries, alternative HTTP clients, alternative animation libraries, alternative icon libraries, and any TypeScript-adjacent tooling.
- **TECH-15**: Do not hardcode static UI content inside components; it belongs in a feature-scoped `*.data.js` file (Section 3.3/DATA-01–04).
- **TECH-16**: Do not organize the frontend by file type (a single flat `components/`/`pages/` split); organize by feature, per Section 3.1, pending the final folder structure to be supplied separately.
- **TECH-17**: Do not change documented public/admin routes without approval.
- **TECH-18**: Do not expose secrets (JWT signing key, database credentials, Razorpay secret, Cloudinary credentials, EmailJS private credentials) to the frontend — enforced concretely by never giving a secret a `VITE_` prefix.
- **TECH-19**: Do not bypass backend validation under any circumstance, regardless of frontend validation outcome.
- **TECH-20**: Do not allow unauthenticated or unauthorized admin CRUD operations, whether via the admin UI or direct API calls.
- **TECH-21**: Do not implement customer account/registration, booking/appointment scheduling, product reviews/ratings, wishlists, SMS/push notifications, or an additional CMS beyond the admin panel — all explicitly Out of Scope in the PRD.
- **TECH-22**: Do not trust client-supplied payment amounts or client-side payment success callbacks as authoritative (FR-G3, FR-G5).
- **TECH-23**: Do not deploy the frontend and backend as two separate hosted services; production is a single Node.js process on a single Hostinger application serving both, per Section 20.

---

## 23. Technical Dependencies

**Frontend**
- `react`, `react-dom`, `react-router-dom`.
- `vite`, `@vitejs/plugin-react` (or the current standard Vite React plugin).
- `tailwindcss` (and its required PostCSS/autoprefixer peer setup).
- `framer-motion`.
- `gsap` (including the `ScrollTrigger` plugin, part of the same package).
- `lenis`.
- `react-icons`.
- `react-intersection-observer`.
- `axios`.
- ESLint + the standard React/JavaScript ESLint config (dev dependency).

**Backend**
- `express`.
- `mongoose`.
- `bcrypt`.
- `jsonwebtoken`.
- `cookie-parser`.
- `express-validator`.
- `multer`.
- `cloudinary`.
- `razorpay`.
- `cors`.
- `helmet`.
- `express-rate-limit`.
- `dotenv`.
- `nodemon` (dev dependency only).

**Database**
- MongoDB Atlas (managed service, no npm package beyond `mongoose` itself).

**Build/Deployment**
- Git (source control and the Hostinger deployment trigger).
- Hostinger Business Node.js hosting plan (platform, not a package).
- `npm` with committed `package-lock.json` in both `frontend/` and `backend/`.

Every dependency listed has a direct technical purpose tied to a PRD-derived requirement or a stack rule defined in Section 0; no dependency is included on the basis of popularity alone, and no dependency beyond this list is added without the same justification test.

---

## 24. Technical Acceptance Criteria

- The frontend builds successfully for production (`vite build`) with no build-time errors, and produces a `dist/` output that is successfully copied into `backend/public/`.
- The backend starts successfully in both development (`nodemon`, `NODE_ENV=development`) and production (`node server.js`, `NODE_ENV=production`) configurations, including a successful MongoDB Atlas connection confirmed before the server accepts traffic.
- No `.ts`/`.tsx` file, `tsconfig.json`, or `@types/*` package exists anywhere in the repository.
- No frontend or backend package is present in `package.json` that is not listed in Section 23 or explicitly justified against a named requirement.
- Every feature's static UI content is sourced from that feature's `*.data.js` file, not hardcoded inline in a component — spot-checked across at least Home, Services, and About.
- Frontend communicates correctly with the backend across all defined public and admin flows, using the relative `/api` base URL in production (same-origin) and the explicit local URL in development.
- Admin authentication succeeds with valid hashed credentials, sets a correctly-flagged (`httpOnly`, `Secure` in production) cookie, and fails with a generic error for invalid credentials.
- Protected admin API routes reject unauthenticated and unauthorized requests, including direct API calls bypassing the frontend.
- An authorized admin can perform full CRUD on projects and retail items, including image upload/update via Cloudinary, with server-side validation enforced on every operation.
- Unauthorized users cannot perform any admin CRUD operation, on any surface.
- Project and retail data persist correctly and reflect publish-status/availability changes immediately in public listings/detail access.
- Enquiries persist correctly in MongoDB and trigger an EmailJS notification for every valid submission; an EmailJS delivery failure does not cause a successfully stored enquiry to be reported as failed to the user.
- Checkout re-validates item existence, availability, and price server-side before creating a Razorpay payment order; the payable amount is always calculated server-side.
- A payment is marked successful only after backend verification of the Razorpay response; failed/cancelled payments never produce a successful order; admins cannot manually mark a payment as successful.
- Completed orders retain an accurate item/price snapshot independent of later product edits or deletions.
- Invalid requests are rejected by backend validation with appropriate field-level error detail; API errors return consistent, appropriately-coded responses without leaking internal details.
- Required SEO metadata (title, description, canonical URL, Open Graph where applicable) is generated dynamically for all indexable public pages; `robots.txt` and an XML sitemap are present, correctly scoped, and reflect current publish state.
- Required accessibility behavior (keyboard operability, labeled forms, focus management, contrast, reduced-motion support) is implemented across public and admin interfaces.
- The application functions correctly without horizontal scrolling, image stretching/cropping, or layout shift, tested explicitly at 320px, ~375–430px, ~768px, ~1280–1440px, ~1920px, and ~2560–3840px.
- Lenis-driven smooth scroll and GSAP ScrollTrigger (including at least one genuinely pinned section) behave correctly and remain in sync, verified on both desktop (mouse wheel) and touch (mobile) input, and remain visibly smooth under a throttled/low-end device performance profile.
- `prefers-reduced-motion` correctly disables/reduces non-essential animation without hiding functional content.
- No public API response ever includes admin credentials, password hashes, payment secrets, or database credentials.
- The application is successfully deployed on Hostinger via Git import as a single Node.js process; visiting the production domain serves the frontend, direct navigation/refresh on a deep route (e.g., `/projects/some-slug`, `/admin/orders`) correctly resolves via the SPA fallback rather than 404ing, and `/api/*` routes respond correctly from the same origin.
- The production deployment serves the entire site over HTTPS, with MongoDB Atlas reachable from the Hostinger server per its configured network access rules.
- No critical console errors or unhandled request failures occur during normal use of any defined flow, in the deployed production environment.

---

## 25. Rate Limiting Requirements (Detailed)

Extends SEC-06/BE-16. Implemented via `express-rate-limit` unless a documented need forces otherwise.

- **RATE-01 — Global API protection**: A baseline rate limit applies to all `/api/*` traffic per client (see RATE-08 for client identification) to absorb generic abuse/scraping, in addition to the stricter limits below on sensitive routes. Numeric threshold: `TBD`.
- **RATE-02 — Login/authentication**: `/api/auth/login` has a strict limit tuned for brute-force resistance (SEC-06). Numeric threshold and lockout/cooldown window: `TBD`.
- **RATE-03 — Admin APIs**: All `/api/admin/*` routes carry a rate limit distinct from and stricter than general public traffic, to reduce the blast radius of a compromised or brute-forced admin session. Numeric threshold: `TBD`.
- **RATE-04 — Payment endpoints**: `/api/checkout` and `/api/checkout/verify` are rate-limited per client to prevent payment-flow abuse (duplicate order creation attempts, verification brute-forcing). Numeric threshold: `TBD`.
- **RATE-05 — Contact/enquiry forms**: `/api/enquiries` remains rate-limited (already defined) to prevent form spam; threshold remains `TBD` pending real traffic data.
- **RATE-06 — Expensive/listing endpoints**: Any endpoint doing non-trivial query work (e.g., filtered/paginated listings) is eligible for a general rate limit under RATE-01 even though it is not a dedicated abuse target like login/checkout.
- **RATE-07 — Per-IP and per-account limits**: Limits are applied per client IP at minimum; for authenticated admin routes, an additional per-account limit is applied so one compromised IP cannot be worked around by rotating accounts, and vice versa.
- **RATE-08 — Correct client identification behind a proxy**: Because Hostinger may terminate/proxy incoming connections, Express's `trust proxy` setting must be configured correctly so `express-rate-limit` (and any IP-based logic) reads the real client IP from `X-Forwarded-For` rather than the proxy's own address; a misconfigured `trust proxy` value silently makes all clients share one rate-limit bucket or defeats the limit entirely.
- **RATE-09 — Burst protection**: Rate-limit windows are chosen to tolerate normal rapid legitimate use (e.g., a user quickly correcting a typo'd password) while still blocking rapid repeated automated attempts; exact window/threshold values are `TBD`.
- **RATE-10 — HTTP 429**: Every rate-limited route returns `429 Too Many Requests` with the standard error envelope (Section 12/API.md §13) once its limit is exceeded, including a `Retry-After` header where `express-rate-limit`'s configuration supports it.
- **RATE-11 — Distributed/shared state**: The current production topology is a single Node.js process (Section 20), so in-memory `express-rate-limit` storage is sufficient today. If the topology ever moves to multiple backend instances, rate-limit state must move to a shared store (e.g., a Redis-backed store) so limits are enforced consistently across instances — this is a forward-looking requirement, not a current implementation, since no multi-instance deployment or Redis dependency currently exists (Section 2.2).
- **RATE-12 — Configurable limits**: Rate-limit thresholds and windows are defined as named constants (not scattered magic numbers) so they can be tuned without a code review of the underlying logic; exact values remain `TBD` until real traffic/abuse patterns are observed.

---

## 26. Caching Requirements

No caching layer (Redis, CDN-fronted API, etc.) currently exists in this system's architecture (Section 2.2 explicitly excludes Redis at this scope); the requirements below define correct behavior for the caching that does exist (browser/HTTP caching, Cloudinary's own asset delivery caching) and the ground rules for any caching layer added later.

- **CACHE-01 — Static asset caching**: The built frontend's hashed asset filenames (Vite's default content-hash output naming) are served with a long-lived, immutable `Cache-Control` value (e.g., `public, max-age=31536000, immutable`) since a content change always produces a new filename; `index.html` itself is served with a short/no-cache directive so app updates are picked up on next visit.
- **CACHE-02 — CDN/edge caching**: Project/retail images are already served through Cloudinary's own CDN/delivery caching (`TRD.md` §17); no separate CDN is introduced for the app shell or API responses at this scope.
- **CACHE-03 — Public API caching**: Public `GET` listing/detail endpoints (`/api/projects`, `/api/retail`, and their detail routes) **may** set a short, explicit `Cache-Control: public, max-age=<TBD>` for browser/intermediate caching, since their data changes only via admin action and staleness of a few seconds to minutes is acceptable; exact TTL is `TBD` pending a product decision on acceptable staleness.
- **CACHE-04 — No caching for sensitive/private/payment/admin responses**: Every `/api/admin/*` response and every response on `/api/checkout`, `/api/checkout/verify`, and `/api/auth/*` sets `Cache-Control: no-store` explicitly — these must never be cached by the browser, a shared proxy, or any intermediary.
- **CACHE-05 — Revalidation**: Where a public listing/detail response sets `max-age` (CACHE-03), it is paired with a `Last-Modified`/`ETag`-style revalidation mechanism only if a real staleness problem is observed; a short `max-age` alone is sufficient at current scale and avoids introducing conditional-request handling prematurely.
- **CACHE-06 — Cache invalidation**: There is no server-side cache to invalidate at this scope (no Redis/reverse-proxy cache); publish/unpublish and CRUD actions take effect immediately in the database and are reflected on the next (uncached, or short-`max-age`) request. If a caching layer is added later, its invalidation must be triggered synchronously from the same service-layer mutation that changes the underlying Project/Retail/Order data (Section 6).
- **CACHE-07 — Cache keys**: If any response caching is introduced, cache keys must include everything that affects the response body (query params such as pagination/filter values, and — for any per-admin response, which should not be cached at all per CACHE-04) so two different requests never collide on one cached entry.
- **CACHE-08 — Cache stampede protection**: Not currently applicable at this system's scale (single-instance, no shared cache); if a shared cache layer is introduced later and a hot key (e.g., a heavily-viewed project) risks concurrent cache-miss regeneration, a request-coalescing or locking strategy is required at that time.
- **CACHE-09 — Cache never replaces authorization**: A cached response must never be served to a client that has not independently passed authentication/authorization for that route — this is why CACHE-04 makes admin/payment responses uncacheable outright, rather than relying on cache-key correctness alone to prevent cross-user data leakage.

---

## 27. Compression, Dependency Security & Additional Monitoring

- **PERF-15 — Response compression**: The Express app serves compressed responses (gzip/Brotli) for text-based responses (JSON API responses, and the static frontend build's JS/CSS/HTML) — via a compression middleware (e.g., `compression`) or, if Hostinger's platform layer already compresses responses automatically, that platform behavior is confirmed and documented rather than assumed. If `compression` is added, it is the one exception to Section 2.2's "no package outside this list" rule, justified specifically by this requirement.
- **SEC-16 — Dependency security**: `npm audit` (or equivalent) is run before each production deployment to check for known vulnerabilities in both `frontend/` and `backend/` dependency trees; a high/critical vulnerability with an available fix is patched before deploying, not deferred indefinitely.
- **SEC-17 — Security headers (expanded)**: Beyond `helmet`'s defaults (BE-16), the following are explicitly confirmed rather than left to default behavior: `Content-Security-Policy` scoped to the app's actual script/style/image/connect sources (Cloudinary, Razorpay's checkout script, Google Fonts if used), `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY` (or an equivalent `frame-ancestors` CSP directive) to prevent the admin panel from being framed, and `Referrer-Policy: strict-origin-when-cross-origin`. Exact CSP source list is `TBD` pending a full inventory of third-party script/asset origins.
- **MON-01 — Health check endpoint**: A lightweight, unauthenticated `GET /api/health` (or equivalent) endpoint reports basic process/database-connectivity status, so Hostinger (or any future uptime monitor) can detect an unhealthy instance; it returns no sensitive information.
- **MON-02 — Resource monitoring**: CPU/RAM usage of the Hostinger Node.js process is monitored via Hostinger's own platform metrics (no additional APM dependency is introduced at this scope, per Section 2.2's dependency-minimalism rule); specific alert thresholds are `TBD`.
- **MON-03 — Resource limits**: The Hostinger hosting plan's CPU/RAM ceiling is treated as a known constraint (`TBD` — plan-dependent); the application must fail predictably (e.g., a clear 5xx and a restart, per DEP-09) rather than degrade silently if that ceiling is approached.

---

## 28. Scalability & High-Availability Posture

This section states the system's current scaling posture plainly, per the top-level instruction not to promise unlimited capacity, and defines what would need to change to scale further — without altering the current single-server architecture documented in Section 20.

- **SCALE-01 — Current posture**: Production runs as a single Node.js process on a single Hostinger server (Section 20) — this is a deliberate, documented choice, not an oversight. Horizontal scaling (multiple backend instances behind a load balancer) is **not** part of the current architecture and is not introduced by this document.
- **SCALE-02 — Statelessness (forward-looking)**: The backend already avoids server-held session state (JWT is stateless, cart lives client-side), which is what would make a future move to multiple instances feasible without a session-affinity requirement — this is a property worth preserving, not a new requirement to implement now.
- **SCALE-03 — Capacity targets**: No specific concurrent-user or requests-per-second capacity is guaranteed. Concrete capacity targets and a load-testing plan (e.g., using a tool to simulate concurrent checkout/enquiry traffic) are `TBD` and should be defined before any marketing push expected to drive a significant traffic increase.
- **SCALE-04 — Database scaling**: MongoDB Atlas's own vertical/horizontal scaling (cluster tier upgrade, read replicas) is the scaling lever for database load, independent of the single-server application topology; no change to the application's data-access pattern is required to use a larger Atlas tier.
- **SCALE-05 — Graceful degradation**: Under load the system should fail predictably (429s from rate limiting, clear 5xx with retry affordance) rather than silently dropping requests or corrupting data (Section 25, `API.md` §13).
- **SCALE-06 — Single point of failure, acknowledged**: The single Hostinger process is a known single point of failure at current scope (DEP-09 already documents the accepted brief-restart-on-deploy trade-off); removing it would require the load-balanced multi-instance topology described in SCALE-01 as a future change, not a current requirement.
- **SCALE-07 — Path to horizontal scaling (documented, not implemented)**: If growth later requires it, the documented path is: (1) move rate-limit state to a shared store (RATE-11), (2) confirm no in-memory state exists anywhere else in the request path, (3) add a load balancer/reverse proxy in front of multiple Node instances, (4) revisit `trust proxy`/IP-handling configuration (RATE-08) for the new network hop. This path is recorded for future reference only; none of it is built now.
