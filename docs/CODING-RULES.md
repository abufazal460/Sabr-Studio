# CODING-RULES.md — Sabr Studio

Reference docs: `PRD.md`, `TRD.md`, `UI-UX.md`, `DATABASE.md`, `API.md`, `DEPLOYMENT.md`. This document governs **how code is written** on this project. It does not restate product/technical requirements — it enforces them at the code level. Nothing below invents a feature, file, package, or architectural choice beyond what those documents already define.

---

## 1. Source of Truth

1. `PRD.md` — what must exist
2. `TRD.md` — how it's technically built (stack, folder principles, layering)
3. `UI-UX.md` — visual/interaction spec, design tokens
4. `DATABASE.md` — schema, indexes, validation, data-integrity rules
5. `API.md` — endpoint contract, request/response envelope, auth/authorization rules
6. `DEPLOYMENT.md` — build, environment, and production topology
7. Existing implementation / current repo state
8. The task at hand — only where it doesn't conflict with 1–6

When a task seems to require something not covered by 1–6, that's a signal to ask, not to invent.

---

## 2. Non-Negotiable Stack

No package outside this list is installed without a specific, named requirement in `PRD.md`/`TRD.md` that nothing on the list already satisfies.

**Frontend**: React (`.jsx` only — no TypeScript in any form, no `.ts`/`.tsx`, no `tsconfig.json`, no `@types/*`), Vite, Tailwind CSS, Framer Motion, GSAP + `ScrollTrigger`, Lenis, `react-icons`, `react-intersection-observer`, `react-router-dom`, `axios`.

**Backend**: Node.js + Express, `mongoose`, `bcrypt`, `jsonwebtoken`, `cookie-parser`, `express-validator`, `multer`, `cloudinary`, `razorpay`, `cors`, `helmet`, `express-rate-limit`, `dotenv`, `nodemon` (dev only).

**Database**: MongoDB Atlas only, via Mongoose.

**Explicitly excluded** unless a specific requirement later forces otherwise: TypeScript/`@types/*` (never), Redux/Zustand/Recoil, CSS-in-JS, any UI kit (MUI/Chakra/Ant Design), `moment`/`day.js`, Passport.js, GraphQL, Redis, a job-queue/worker system, a heavyweight logging library (plain `console.error` via a small `logger.js` utility is sufficient at this scope), a second icon library, a second animation library covering the same interaction type as an existing one.

---

## 3. File Extension & File Type — Strict

The extension determines what may live in a file. This is not stylistic — it is enforced on every change:

| Extension | Allowed content |
|---|---|
| `.js` | JavaScript only |
| `.jsx` | JavaScript + JSX only |
| `.css` | CSS only |
| `.json` | Valid JSON only |
| `.md` | Markdown only |
| `.html` | HTML only |
| `.svg` | SVG only |
| `.webp` `.png` `.jpg` `.jpeg` `.avif` `.gif` `.mp4` `.webm` | The corresponding binary asset only |

- Never put JSX in a `.js` file unless the project's existing Vite/Babel config already supports it there — check `vite.config.js` before assuming.
- Never put JavaScript in a `.css` file, or CSS in a `.jsx` file (styling belongs in Tailwind classes or the project's designated global/scoped stylesheet, per `UI-UX.md`/`AI-RULES.md`'s Tailwind-first rule).
- Never rename a file's extension to make code "work" — fix the code, or the import, instead.
- Before editing any file: check its current extension, its existing imports/exports, and how neighboring files in the same folder are structured. Match that convention exactly; do not introduce a new pattern in an existing folder.

---

## 4. AI-Agent Discipline

Any AI coding agent (or human) working in this repo must not:

- Change a file extension unnecessarily.
- Rename a file or folder unnecessarily.
- Replace an already-decided technology choice (e.g., swap Framer Motion for a different animation approach because it "seems easier").
- Add a package without a named requirement (§2).
- Add generated boilerplate the task didn't ask for (extra config files, starter templates, placeholder pages).
- Add an abstraction (a wrapper hook, a factory, a generic "manager" class) the current codebase doesn't already need.
- Add a comment that doesn't meet the bar in §8.
- Rewrite working code without a concrete reason tied to the task.
- Create a second `Button`, a second Axios client, a second cart context, or any other duplicate of something that already exists — search first.
- Introduce a different code style (naming, formatting, file layout) from what the surrounding code already does.

**Inspect before modifying**: check whether the requested functionality already exists (a component, a `*.data.js` file, a service function, an API route, a Mongoose model) before creating something new. Preserve the existing stack and structure unless a documented requirement in §1's hierarchy requires a change.

---

## 5. Dependencies

Minimum required, always. Before adding any package:

1. Does the functionality already exist somewhere in this project?
2. Is native JavaScript/browser/React capability sufficient?
3. Does an already-installed package (§2) already solve this?
4. Only then: does the new package provide clear, specific project value?

**Never add**: a duplicate library for something already covered, an unused/speculative package, a "decorative" package (adds polish with no functional requirement behind it), a second library solving the same problem as an existing one (e.g., a second icon set, a second animation engine, a second HTTP client), or a package added only to save a few lines of code that are easy to write directly.

Remove a dependency once confirmed genuinely unused — grep for every import path before removing, not just the obvious one.

---

## 6. Folder Structure & Naming

Feature-based, not type-based (`TRD.md` §3):

- No monolithic root-level `components/`/`hooks/` grab-bag. Each feature folder (`features/projects/`, `features/retail/`, `features/home-hero/`, etc.) owns its own `components/`, `data/`, and hooks where relevant.
- A component graduates to `src/shared/` (or `src/common/`) only once **two or more** features actually use it — not preemptively.

**Naming — exact, no deviation:**

| Kind | Convention |
|---|---|
| React components | `PascalCase.jsx` |
| Static-content data files | `camelCase.data.js` (mandatory suffix, every feature's static copy) |
| Hooks | `useCamelCase.js` |
| Utilities | `camelCase.js` |
| Backend controllers | `resource.controller.js` |
| Backend routes | `resource.routes.js` |
| Backend models | `resource.model.js` |
| Backend services | `resource.service.js` |
| Backend middleware | `resource.middleware.js` |

- **Backend layering is strict and one-directional**: Routes → Controllers → Services → Models. Controllers never run a Mongoose query directly (`API.md` §1, §8); routes carry no business logic. `config/` holds `db.js` and `cloudinary.js` only. `utils/` holds pure helpers only.
- `backend/public/` exists only to receive the built frontend `dist/` output at deploy time (`DEPLOYMENT.md` §4). It is `.gitignore`d and never hand-edited.

**No hardcoded UI content**: static, non-backend-driven copy (hero text, service descriptions, footer links, nav labels, FAQ copy) lives in that feature's `*.data.js` file as a plain object/array export — never inline JSX strings. Backend-driven content (projects, retail items, enquiries, orders) is never hardcoded on the frontend — always fetched via `axiosClient` per `API.md`. A `*.data.js` file exports plain data only — no JSX, no logic, no side effects.

---

## 7. Code

**Prefer**: simple solutions; reusable components only where repetition is real (not preemptive); data-driven rendering (map over `*.data.js` arrays rather than hand-writing repeated JSX blocks); semantic HTML; clear, intention-revealing naming; small, focused functions/components; the existing project pattern for the problem at hand; minimal abstraction.

**Avoid**: over-engineering; deep unnecessary component nesting; duplicate logic (reuse `axiosClient`, the one `<Button/>`, shared validators — per `API.md` §6 and `UI-UX.md`); duplicate styles (Tailwind tokens only, §11); dead code; unused variables/imports; unreachable code; magic values where a named constant or shared data structure already fits; premature optimization; premature abstraction.

**Scope discipline**: every task splits into what was requested, the supporting changes technically required to complete it correctly (e.g., a new `Retail` field also needs its `express-validator` chain, its Mongoose schema update, and its admin form — skipping any of these isn't "minimal," it's incomplete), and optional improvements — which are never implemented silently. A request to fix the Retail listing is not license to touch Projects, redesign the Navbar, or bump a dependency.

---

## 8. Comments

Comments are not a substitute for clear code.

**Do not add**: comments on obvious code; AI-generated filler comments; repetitive comments that just restate the line below them; section-divider comments that add no navigational value in a small file; comments explaining self-explanatory code; large explanatory comment blocks.

**Add a comment only when** the reason or constraint is genuinely non-obvious and cannot be expressed more clearly through naming or code structure — e.g., *why* order line items are embedded snapshots rather than live refs (`DATABASE.md` §2.4), or *why* `paymentStatus` is only ever set by the verification service and never by a general update path (`API.md` §10). The comment should explain the "why," not restate the "what."

---

## 9. Rendering & React Performance

- Keep component state local when possible; avoid promoting state to a Context or higher component unless multiple features genuinely need it. This project has exactly two cross-cutting Context providers — `AuthContext` and `CartContext` — everything else stays local. No global state library is introduced.
- Avoid creating unstable objects/functions inline where it causes a measurable rendering problem — but don't wrap every handler in `useCallback` defensively.
- Use `useMemo`/`useCallback`/`memo` only where there's a real, identifiable cost being avoided — not by default, not everywhere.
- Avoid unnecessary `useEffect`. Do not use an effect to compute a value that can be derived directly during render. Avoid state that duplicates something already derivable from props/other state.
- Do not trigger repeated API calls on every render or from an effect with an unstable dependency — fetch on mount/dependency-change, not on every re-render (`API.md` §23).
- Clean up subscriptions, listeners, timers, `IntersectionObserver`s, and GSAP `ScrollTrigger`/timeline instances in effect cleanup (`useLayoutEffect`/`useGSAP`) — this specifically prevents duplicate scroll triggers on route change or hot-reload.
- Avoid rendering hidden duplicate content (e.g., separate desktop/mobile DOM trees both mounted) when a single responsive tree solves it.
- Lazy-load the admin route tree (`React.lazy`/`Suspense`) so public visitors never download admin JS.
- Keep animations performant — see §16.

---

## 10. Performance

Prioritize: fast initial load, low JS execution cost, low memory usage, minimal network requests, efficient rendering, efficient asset loading, stable layout (no layout shift), good Core Web Vitals, and usability on mobile/low-end devices.

Avoid: reaching for a heavy library to solve a simple task; large unnecessary bundle growth; unnecessary/decorative animation; continuous expensive calculations (e.g., a scroll handler doing heavy work on every frame instead of through Lenis/ScrollTrigger); excessive DOM node counts on listing pages; unnecessary re-renders (§9); blocking synchronous operations on the main thread; large, unoptimized assets.

Backend-side performance (`API.md` §23, `DATABASE.md` §12): every listing/filter query path must be covered by an existing index before it ships; listing endpoints `.select()` only display-relevant fields, never full documents; enforce a server-side maximum on any `limit` query param; no prefetch-everything pattern — detail data is fetched only when a user actually navigates to the detail view.

---

## 11. Images & Media

- Use WebP (or AVIF where supported), correct dimensions, and responsive sizing — never a full-resolution image dropped into a small card.
- Lazy-load below-the-fold images (`loading="lazy"`); eager/high-priority loading is justified only for the hero's first image (`loading="eager"`, `fetchpriority="high"` on the first slide, per `UI-UX.md`).
- Reserve space with explicit dimensions or an `aspect-*` class before load, so there's zero layout shift.
- Meaningful images carry real, descriptive `alt` text sourced from stored content (project/retail titles, etc.); purely decorative images use `alt=""`.
- Never stretch an image or distort its aspect ratio — fixed aspect-ratio box + `object-cover`, never `object-fill` (`UI-UX.md` design principle).
- Never load unnecessarily large images, duplicate the same asset at multiple sizes without reason, or mount both a hidden desktop and a hidden mobile image simultaneously when a single responsive image (or `srcset`) would do.
- Render images only through Cloudinary URLs with `f_auto`/`q_auto` transform params appended by a shared helper — never a raw, untransformed Cloudinary URL in a small card (`API.md` §17, `DATABASE.md` §11).
- Videos (where used) load only when needed and are optimized — no autoplaying, undersized-viewport-inappropriate video weight on mobile.

---

## 12. Responsive Design — Strict

Mobile-first. The site must work correctly from 320px mobile width up to 3840px (4K) desktop width, verified at minimum around: 320px, ~375–430px, ~768px, ~1280–1440px, ~1920px, ~2560–3840px (`TRD.md` §10, `UI-UX.md` §63).

Responsive behavior must cover: layout, images, video, typography, spacing, navigation, buttons, forms, cards, grids, tables, modals, sections, and containers.

- Never fix desktop by breaking mobile, or fix mobile by breaking desktop — a change to one breakpoint's layout must be checked against the others before it's considered done.
- No arbitrary fixed pixel width that can overflow its container — use relative units, flexbox/grid, and `max-width: 100%` on media.
- Prevent: horizontal scrolling (the only intentional horizontal-scroll element in this project is the Testimonials carousel track — nothing else scrolls sideways, per `UI-UX.md` §72), text clipping, image distortion, overlapping elements, broken grids, unusable buttons/forms at small widths, excessive dead whitespace, unreadably small text, and 4K layouts stretching content edge-to-edge without a sensible `max-width`.
- Admin tables scroll within their own `overflow-x-auto` container, never the whole page (`PRD.md` §10, `AI-RULES.md` §17).
- Use the project's fixed container max-widths per breakpoint (`UI-UX.md` §08) rather than inventing a new one per page.

---

## 13. Accessibility

- Semantic HTML first (`<nav>`, `<main>`, `<header>`, `<footer>`, real heading/list elements) over generic `<div>`-only markup.
- Every interactive element is keyboard-reachable with a visible focus state (`focus-visible:` used explicitly, never suppressed).
- Every form field has a real, associated `<label>` (`htmlFor`/`id`) — placeholder text is never a substitute.
- Icon-only controls (cart icon, mobile menu toggle, social icons, admin icon buttons) carry `aria-label`.
- Validation/error messages are linked to their field via `aria-describedby`.
- Color is never the sole signal for state (publish status, order status, form errors all carry text/icon too).
- Sufficient text/background contrast — WCAG 2.2 AA target across public and admin UI.
- Use ARIA only where semantic HTML genuinely can't express the interaction (a custom tab panel, a custom accordion) — never as a patch for markup that should just be the correct native element.
- Modal/drawer interactions manage focus explicitly on open and close (this is not automatic — it must be implemented).
- Touch targets keep an effective hit area of at least 44×44px, including icon-only buttons that are visually smaller.

---

## 14. SEO

- Semantic HTML and a correct heading hierarchy: exactly one `<h1>` per page, logical `<h2>`/`<h3>` nesting below it.
- Every indexable public page has a unique, descriptive `<title>` and meta description generated dynamically from real content (static `*.data.js` for static pages, the fetched resource for project/retail detail pages) — never a hardcoded per-page duplicate.
- Canonical URL derived from a single site-URL constant + current path.
- Clean, lowercase, crawlable URLs (`/projects/:slug`, `/retail/:slug`).
- `robots.txt` allows public routes and disallows `/admin/*` — documented explicitly as not a security control; admin routes stay protected by auth regardless.
- XML sitemap reflects current publish state dynamically (excludes admin routes, unpublished/deleted content) — never a stale hand-maintained file.
- Optimized images with meaningful `alt` text (§11); Open Graph metadata on key shareable pages.
- Never add SEO copy that exists only for search engines and adds nothing for a real visitor; never duplicate a heading or block of content purely to repeat a keyword.

---

## 15. Security

- Never expose, anywhere in frontend code or committed source: API keys, passwords, tokens, database credentials, private environment variables, or any secret. Anything `VITE_`-prefixed is bundled into client-visible JS — a secret never gets that prefix (`API.md` §21, `DEPLOYMENT.md` §1).
- Use environment variables for all sensitive configuration, per the exact split documented in `API.md` §21 / `DEPLOYMENT.md` §1 — do not invent a new variable name for something already covered there.
- Client-side validation is a UX convenience only — every mutating backend endpoint runs its own `express-validator` chain regardless of what the frontend already checked (`API.md` §12).
- Every `/api/admin/*` route independently re-verifies the JWT and account status via `protect` middleware — frontend route guarding (`ProtectedRoute`) never substitutes for this (`API.md` §10–§11).
- Never build a Mongoose filter directly from raw `req.query`/`req.body` — only explicitly whitelisted, validated fields (`DATABASE.md` §5, NoSQL-injection prevention).
- `Admin.password` stays `select: false` and is never included in any response payload; no response ever includes payment secrets, Cloudinary secrets, or the raw `MONGODB_URI` (`DATABASE.md` §17, `API.md` §5).
- Follow the project's authentication, authorization, API, and database rules exactly as `API.md` and `DATABASE.md` define them — do not introduce an alternate auth mechanism (e.g., a token in `localStorage`) even temporarily for convenience.

---

## 16. Animation

- Lenis owns scroll for the entire app (initialized once at the root) — the single source of truth for scroll position.
- GSAP + `ScrollTrigger` owns anything tied to scroll *position*: scroll-linked reveals, section pinning, scrubbed timelines — synced to Lenis's scroll event, never the native `window.scroll`.
- Framer Motion owns everything *not* scroll-position-driven: route/page transitions, hover/tap states, modal/drawer open-close, mount-time list stagger, shared-layout animation.
- Never implement the same interaction in both libraries — if it's scroll-position-driven, it's GSAP's job; `whileInView` is not a substitute for genuine scroll-scrubbed/pinned behavior.
- Animated properties are restricted to `transform`/`opacity` wherever possible (GPU-accelerated) — avoid animating properties that trigger layout (`width`, `height`, `top`, `left`, box-shadow spread, etc.).
- No continuous/looping background animation.
- GSAP timelines/`ScrollTrigger`s are always killed/reverted in cleanup to avoid duplicate triggers.
- `prefers-reduced-motion: reduce` disables/shortens non-essential animation everywhere (hero cross-fade → instant swap, card hover scale → shadow-only, drawer slide → shortened linear, FAQ expand → shortened, testimonial slide → crossfade/instant) without ever hiding or delaying functional content.
- Reach for CSS transitions/native behavior first for a simple hover/focus state — don't pull in an animation library for something a two-line Tailwind transition class already does.

---

## 17. Styling & Design Tokens

- Tailwind utility classes are the default for layout, spacing, color, and typography. Plain CSS is allowed only for: global resets/`@font-face` (one global stylesheet), keyframes an animation library references by class name, scrollbar styling, and CSS custom properties JS needs to read/write directly — never a substitute for Tailwind out of habit.
- **One `<Button />` component exists and is used for every button everywhere** — no second button implementation, no `Button2`/`NewButton` variant. Only its existing props change per use.
- **Design tokens are fixed** (`UI-UX.md` §06–§08) — never introduce a color, font weight, spacing value, radius, shadow, or breakpoint outside the documented set:
  - Colors: `black #000000`, `ink #111111`, `white #FFFFFF`, `muted #666666`, `border #E4E4E4`, `surface #FAFAFA`, `cream #F7F3EC` (Retail tile background only), `brown #8B4A2E` (About page accent only), plus the footer and social-hover colors documented in `UI-UX.md` §06.
  - Fonts: Abhaya Libre (headings, weights 400-italic/500 only) + Inter (UI/body, weights 400/500/600 only). No third family, no weight outside `{400, 500, 600}`.
  - Spacing: the documented 8px-based scale only.
  - Radius: `0` / `4px` / `8px` / `full` — nothing above `8px` except `full`.
  - Shadow: exactly `shadow-hover` and `shadow-none` — no other shadow value.
  - Breakpoints: Tailwind defaults (`sm/md/lg/xl/2xl`) with the documented container max-widths per breakpoint.
- Cards share one contract (radius, border, hover shadow + scale, padding) — do not give one card type a bespoke treatment the others don't share.
- Images always use a fixed aspect-ratio box + `object-cover`, never `object-fill`.
- No pagination UI anywhere — Projects/Retail use the documented "View All"/"Load More" expansion pattern.

---

## 18. Code Quality — Pre-Finalization Checklist

Before considering any change complete, verify:

- [ ] No syntax errors
- [ ] No broken imports
- [ ] No unused imports
- [ ] No unused variables
- [ ] No duplicate logic (reused the existing shared component/utility/service instead)
- [ ] No unnecessary packages added
- [ ] No unnecessary or AI-filler comments
- [ ] No unnecessary files created
- [ ] No unnecessary re-renders introduced
- [ ] No console errors or warnings
- [ ] No responsive overflow at any breakpoint touched by the change
- [ ] No broken routes
- [ ] No broken assets (images, fonts)
- [ ] No obvious accessibility regression (keyboard path, labels, focus, contrast)
- [ ] No SEO regression (heading hierarchy, title/meta still correct)
- [ ] No performance regression (bundle size, query efficiency, unnecessary requests)
- [ ] Field names/types still match across frontend, `express-validator`, and Mongoose schema for anything touched (`API.md` §18)

---

## 19. Error Handling

- Handle expected failures explicitly — never silently swallow an error (an empty `catch` block is a bug, not a fix).
- Never expose a raw internal error, stack trace, or database/connection detail to the end user — a generic, safe message is shown; full detail is logged server-side only (`API.md` §13).
- Every data-dependent view implements loading, success, empty, and error states where relevant — no view is left permanently spinning on failure (`API.md` §14).
- On the backend, an async controller/service failure must reach the centralized error-handling middleware — never crash the process or hang the response.
- EmailJS failures are decoupled from enquiry-storage success — a failed notification is logged and never reported to the user as a failed submission (`API.md` §13.1).

---

## 20. Change Discipline

- Modify only what the task actually requires. Do not rewrite unrelated working code, "clean up" a neighboring file that wasn't part of the task, or perform a repo-wide refactor/rename/dependency bump as a side effect of a focused change.
- Do not introduce an unrelated improvement while solving a different problem — note it separately instead of bundling it in.
- Do not change existing behavior unless the documented requirement or the bug being fixed actually calls for it.
- Before changing any shared piece (a schema field, an API endpoint's shape, the `<Button/>` component, a design token), search every consumer — frontend components, backend controllers/services, other tests — and update them together in the same change (`API.md` §2, `AI-RULES.md` §10).
- Treat as high-risk and slow down accordingly: authentication/authorization, any of the five database schemas, production data, any destructive operation, an API contract change, the deployment topology, secret management, and anything touching Razorpay amount calculation or verification. For these, verify compatibility across every affected consumer and ask before proceeding if a requirement is materially ambiguous — never guess on money, auth, or data-loss-adjacent changes.

---

## 21A. Performance, Rate-Limit & Cache Discipline (Implementation Rules)

Restates and enforces `TRD.md` §25–§28 and `API.md` §28–§29 at the code level — no new architecture is introduced here.

- No unnecessary API calls: a component fetches once per mount/dependency-change (§9), never speculatively or on every render.
- No unnecessary database queries: a service function never issues a query it doesn't need for the current operation (e.g., don't fetch a full document just to check existence — use an existence/count query where that's all that's needed).
- No unbounded queries: every listing query enforces the server-side maximum `limit` (`DATABASE.md` §19); never trust a client-supplied `limit`/`skip` without capping it.
- Pagination is required for large datasets: admin listing endpoints (Orders, Enquiries) and any future large collection use `.limit()`/`.skip()` or cursor pagination — never a full unbounded fetch (`PERF-08`).
- Validate all external input: every mutating endpoint's `express-validator` chain runs before any service/database call (§15) — this is not optional under load or time pressure.
- Never trust frontend authorization: `protect` middleware re-verifies every `/api/admin/*` request independently of any frontend route guard (§15).
- Never expose secrets: no API key, credential, or signing secret appears in frontend code, a `VITE_`-prefixed variable, logs, or committed source (§15).
- Never log sensitive credentials: passwords, JWTs, Razorpay secrets, and full payment payloads are never written to logs (`TRD.md` LOG-01/LOG-06) — log identifiers and outcomes, not secrets.
- Use async/non-blocking operations: no synchronous, blocking I/O on the request path; async controller/service functions are wrapped so a rejection reaches the centralized error handler (§19).
- Avoid unnecessary dependencies: no package outside §2's list without a named requirement — this now explicitly includes any caching, rate-limiting, or monitoring package beyond `express-rate-limit`/`helmet`/`compression` (`TRD.md` §27's one justified exception).
- Avoid heavy client-side processing: no expensive computation (large sorts/filters/transforms) run in the browser on data the backend could have already filtered/paginated (§10).
- Follow cache/rate-limit policies: every endpoint respects the `Cache-Control` and rate-limit assignment defined in `API.md` §28 — a new endpoint is not shipped without deciding both, even if the answer is "uncached, baseline rate limit."
- Handle errors safely: no empty `catch` block; every expected failure path is handled explicitly and every unexpected one reaches the centralized error handler without leaking internals (§19).
- Use idempotency for relevant payment operations: `POST /checkout`/`POST /checkout/verify` follow the idempotency safeguards already defined in `API.md` §22 (submit-lock, signature-based one-time verification) — a retry or duplicate submission must never create a second Order or a second charge.

---

## 21. Final Rule

Every implementation must be: **Correct · Clean · Minimal · Responsive · Accessible · SEO-friendly · Secure · Lightweight · High-performance · Maintainable.**

When two valid solutions exist, prefer the simpler one — fewer dependencies, less code, fewer renders, lower runtime cost.

Do not add anything merely because it is possible. Every line of code should trace back to a real requirement in `PRD.md`, `TRD.md`, `UI-UX.md`, `DATABASE.md`, `API.md`, or `DEPLOYMENT.md` — or to the specific task at hand.
