# 08-performance-audit.md — Sabr Studio Full-Stack Performance Audit

Companion to `00-master-context.md` and `01-setup.md` — read both first. This file is the **performance audit prompt only**: it defines what to check, what "correct per the documented architecture" looks like for each area, and how to report a finding. It is not a license to redesign, re-architect, or add infrastructure — an audit produces findings and proposed fixes; it does not silently ship a rewrite.

---

## 1. Role & Objective

You are auditing the Sabr Studio codebase (React/Vite frontend + Node/Express/MongoDB backend, single Hostinger process) for real, measured performance problems — not stylistic preferences, not hypothetical scale. Before flagging anything, **inspect the actual repo and, where possible, actual measurements** (bundle output, network waterfall, `explain()` plans, response timings) — a finding without evidence is not a finding.

---

## 2. Source of Truth

Per `00-master-context.md` §3, the full stack (React/Vite, Tailwind, Framer Motion, GSAP+ScrollTrigger, Lenis, `react-icons`, `axios` frontend; Node/Express/Mongoose/`compression` backend; MongoDB Atlas; single-Hostinger-process deployment) and its constraints are binding — an audit finding can recommend fixing a violation of that stack, but never recommend replacing a piece of it (e.g. "switch to Redis," "add a second animation library," "adopt SSR") unless the source documents already call for it. Where exact thresholds are needed and the source docs mark them `TBD` (rate limits, cache TTLs, size caps — `00-master-context.md` §7), do not invent a number as if it were a spec; propose one as a finding's fix, labeled as a proposal, not a documented requirement.

---

## 3. Reporting Format (every finding, no exceptions)

Each issue is reported as exactly six fields, in this order:

```
Impact:        <user- or system-visible effect, and how severe/likely>
Evidence:      <the actual measurement/observation that proves it — bundle stat, timing,
                explain() output, screenshot/metric, line count, etc.>
Location:      <exact file(s)/route(s)/component(s)/query(ies)>
Cause:         <why it happens, in terms of the actual code>
Fix:           <the smallest change that resolves the cause, staying inside §2's stack>
Verification:  <how to re-measure and confirm the fix worked — not "should be faster">
```

No finding is reported without Evidence and Location filled from actual inspection. "This looks slow" is not a finding.

---

## 4. Frontend Bundle & Loading

- **Bundle size**: inspect the Vite production build output (`vite build` stats) for size and largest contributors. Check no package outside `00-master-context.md` §6.1's approved list has been pulled in (a stray dependency is both a scope violation and a bundle-size finding).
- **Code splitting / lazy loading**: check route-level splitting exists for `react-router-dom` routes (especially the heavier admin panel, which authenticated users only need after login) — verify with actual chunk output, not assumption.
- **Routes**: confirm the mounted route tree matches the canonical table in `00-master-context.md` §5 exactly — an accidentally duplicated or extra route is both a correctness and a bundle-weight issue.
- **Renders**: check for unnecessary re-renders driven by `AuthContext`/`CartContext` (the only two approved Contexts) — e.g. a context value object recreated every render forcing all consumers to re-render. Verify with React DevTools Profiler or equivalent, not guesswork.
- **Fonts**: confirm only Abhaya Libre + Inter at weights {400,500,600} are loaded (`00-master-context.md` §6.9) — no extra weight/style variant pulled in by default from a font-loading snippet; check `font-display` strategy and whether fonts are preloaded/self-hosted vs. blocking render.

---

## 5. Images & Cloudinary

- **Images**: check that image delivery uses Cloudinary-hosted URLs (never local/static binary duplicates — MongoDB never stores binary per §6.8), with explicit `width`/`height` (or aspect-ratio CSS) to prevent layout shift, and lazy-loading (`loading="lazy"` or `react-intersection-observer`, already an approved dependency) for below-the-fold images.
- **Cloudinary**: check whether upload/delivery uses Cloudinary's own optimization (format/quality auto, responsive breakpoints) rather than serving a single oversized master image to every viewport. Confirm Multer still validates in-memory and never writes to local disk in production (§6.8) — a disk write here is both a security and a latency issue.
- **Layout shifts**: correlate with the images/fonts checks above — measure actual CLS (Lighthouse/CrUX or equivalent), don't estimate it.

---

## 6. Network & API Usage

- **Network requests**: confirm all backend calls go through the single `axiosClient` (§6.2) — a component instantiating its own request client or duplicating base-URL/config logic is a finding.
- **API duplication**: check for the same data being fetched redundantly by multiple components/features on one page load (e.g. Projects listing fetched twice because two components each call it independently instead of sharing state/a hook) — verify via an actual network waterfall, not code-reading alone.
- **Caching**: check for missing or incorrect HTTP cache headers on static/public GET responses (Projects/Retail public listings, built frontend assets) — propose only caching that fits the existing stack (e.g. `Cache-Control` headers, static asset caching), never a new caching service; Redis is explicitly out of scope (§6.1/§7).
- **Compression**: verify `compression` middleware is used only if the Hostinger platform doesn't already provide response compression (§6.1's one pre-approved exception, `TRD.md` §27/PERF-15) — flag it as a finding if compression is duplicated at both layers (wasted CPU) or missing at both (larger payloads than necessary).

---

## 7. Animations

- Check animation-related jank or dropped frames using actual profiling (DevTools Performance panel), not assumption.
- Verify the animation library boundary from `00-master-context.md` §6.9 is followed: Framer Motion for component-scoped animation, GSAP+ScrollTrigger for anything scroll-position-driven, Lenis as the single scroll source of truth synced to ScrollTrigger. **A performance fix must never cross this boundary** — e.g. do not "fix" a scroll-driven animation's jank by rewriting it in Framer Motion's `whileInView`; find and fix the actual GSAP/ScrollTrigger implementation issue instead.
- Confirm `prefers-reduced-motion` correctly disables/shortens non-essential animation (a missing check here is both an accessibility and a performance finding for affected users).
- Confirm no page-route-transition animation exists (§6.9 — explicit exclusion); if one has been added, its removal is a correctness fix, not a performance one, but note it if found during the audit.

---

## 8. Backend Latency & Layering

- Check for business logic or blocking work happening outside `services/`, particularly in controllers or routes, that adds avoidable latency (§6.2's Routes → Controllers → Services → Models boundary is also a performance concern — misplaced logic is harder to cache/optimize in isolation).
- Check for any synchronous/blocking operation in a hot request path (e.g. anything that should be async and isn't).
- Verify rate-limited routes (`/api/auth/login`, `/api/checkout`, `/api/checkout/verify`, `/api/enquiries`) apply `express-rate-limit` and aren't unintentionally adding a latency-relevant hot path via inefficient limiter config.

---

## 9. Database Queries, Indexes & Pagination

- **Database queries**: check for N+1 query patterns, unnecessary `populate()` calls (especially anywhere near Orders, where line items must remain embedded snapshots, never live refs — §6.4/ADR-05, so a `populate` there is a correctness bug as well as a performance one), and queries pulling full documents where a projection would do.
- **Indexes**: confirm the required minimum indexes from `00-master-context.md` §6.4 actually exist and are used — unique `slug` (Projects/Retail), `{published, category}` / `{published, availability}`, `{status, createdAt:-1}` (Enquiries), `{paymentStatus, orderStatus}` + Razorpay ID lookups (Orders), unique `email` (Admin). Verify with `explain()`/`.explain("executionStats")` showing an index scan, not a collection scan — this is Evidence, not assumption.
- **Pagination**: confirm admin list endpoints (Enquiries, Orders, and Projects/Retail admin views) actually paginate against the indexes above rather than returning entire collections — check both the query (`limit`/`skip` or cursor) and that the supporting index makes it efficient.

---

## 10. Production Configuration & Asset Delivery

- **Production configuration**: confirm the deployment topology matches `00-master-context.md` §6.11/`01-setup.md` §8 exactly — single Hostinger Node process serving both `/api/*` and `frontend/dist/` copied into `backend/public/`; build order (`vite build` → copy `dist/` → install backend prod deps → `node server.js`); SPA catch-all after all `/api/*` routes and static middleware; `nodemon` and other dev-only tooling never running in production.
- **Asset delivery**: confirm the built frontend's static assets (`backend/public/`) are served with appropriate cache headers/compression, and that `backend/public/` is genuinely the generated build output (never hand-edited — a hand-edit here is also a correctness risk).
- Confirm no `VITE_`-prefixed secret or misconfigured environment variable is inflating the frontend bundle or leaking into production output (§5 of `01-setup.md`).

---

## 11. Rules

- **Preserve functionality and design** — a performance fix that changes visible behavior, layout, or the documented design tokens is out of scope for this audit; flag the trade-off instead of silently applying it.
- **Follow documented animation behavior** — never resolve an animation-performance finding by moving it across the Framer Motion / GSAP+ScrollTrigger / Lenis boundary (§7 above); fix the implementation within its correct library.
- **Avoid premature optimization** — do not propose a fix for a theoretical bottleneck with no measured evidence; do not introduce caching, splitting, or infra changes "in case" they're needed at a scale the app isn't documented to require.
- **Inspect actual bottlenecks before changing code** — every fix in this audit traces back to a finding built on real measurement (§3); no fix is proposed from a code-read alone if it could be measured instead.
- **Prefer simple, measurable improvements** — a small, verifiable change (an index, a memoization, a lazy import) beats a structural rewrite; escalate to a larger fix only when a simple one demonstrably can't resolve the measured issue.
- Do not add a dependency, service, or piece of infrastructure outside `00-master-context.md` §6.1 to fix a performance finding, however convenient it would be — cite the named requirement or don't add it.

---

## 12. Verification

For each finding, confirm (report as **Verified / Not Verified / Unable to Verify**):
1. Evidence was actually captured (measurement, `explain()` output, profiler trace, bundle stat) — not inferred.
2. The proposed fix's Verification step was actually re-run after the fix, showing the metric changed.
3. No documented functionality, design token, or animation-library boundary was altered by the fix.
4. No package/service outside the approved stack (§6.1) was introduced.
5. The fix didn't silently touch a caution-flagged file (`middleware/auth.middleware.js`, checkout verification logic, `.env` naming, the Order embedded-snapshot design — `00-master-context.md` §7) without the extra scrutiny those require.

---

## 13. Completion Criteria

The audit is complete only when:
1. Every checklist area in §4–§10 has been inspected against real evidence, not assumption.
2. Every reported issue follows the exact six-field format in §3.
3. Every proposed fix stays inside the documented architecture and technology stack.
4. No fix was applied — or, if fixes were applied as part of this task, no fix was applied — without its Verification step being run and reported.
5. Any area that could not be measured in the current environment is reported as Unable to Verify rather than skipped silently.
