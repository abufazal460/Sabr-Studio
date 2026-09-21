# QA Checklist — Sabr Studio

Reference docs: `PRD.md`, `TRD.md`, `UI-UX.md`

---

## 1. Functional Testing

**Public routes**
- [ ] `/`, `/projects`, `/projects/:slug`, `/retail`, `/retail/:slug`, `/services`, `/about`, `/contact`, `/cart` all load on direct visit and on refresh
- [ ] Invalid/unknown public route shows a proper 404/not-found page (no crash)
- [ ] Navigation links (Home, Projects, Retail, Services, About, Contact) route correctly; active link state is correct
- [ ] Cart icon in header opens `/cart` (or cart drawer) from every page

**Projects & Retail**
- [ ] `/projects` and `/retail` show only published items (unpublished/deleted never appear)
- [ ] Project/retail cards show correct image, title, price (retail), category
- [ ] Clicking a card navigates to the correct detail page via slug
- [ ] Detail page shows correct data for a valid published slug
- [ ] Invalid, deleted, or unpublished slug shows a not-found state, not fabricated/blank content
- [ ] Purchasable project shows price + purchase CTA; non-purchasable does not
- [ ] Retail item marked unavailable has Add to Cart disabled/hidden

**Cart**
- [ ] Add to cart, update quantity, and remove item all work and reflect in totals
- [ ] Empty cart shows empty state; checkout is not reachable from an empty cart
- [ ] Displayed cart total is clearly informational (not relied on as final payable amount)

**Checkout & Payment (Razorpay)**
- [ ] Checkout form validates required customer fields client- and server-side
- [ ] Backend re-validates item existence, availability, and current price before creating a payment order
- [ ] Payable amount used in Razorpay order is server-calculated, not taken from the client
- [ ] Order is marked successful only after backend verifies the Razorpay payment response
- [ ] Cancelled/failed payment never results in a "successful" order; UI reflects failure clearly
- [ ] Completed order stores a snapshot of item name/qty/price independent of later product edits
- [ ] Order and payment status are tracked as separate fields

**Enquiries**
- [ ] Enquiry form submits successfully with valid data from every page it appears on (Contact, and others per spec)
- [ ] Required-field and format validation triggers both client- and server-side
- [ ] Submit button/loading state prevents duplicate submissions
- [ ] Valid submission is stored in MongoDB and triggers an EmailJS notification
- [ ] EmailJS failure does not cause a successfully stored enquiry to show as failed to the user
- [ ] Enquiry data is never retrievable via any public API endpoint

**Admin Authentication**
- [ ] Valid admin credentials log in successfully; session cookie is set (httpOnly)
- [ ] Invalid credentials show a generic error (does not reveal whether the account exists)
- [ ] Logout invalidates the session/token
- [ ] Direct navigation to any `/admin/*` route (except `/admin/login`) without a session redirects to login
- [ ] Direct API calls to admin endpoints without a valid session/token are rejected (bypassing the UI)

**Admin — Projects & Retail CRUD**
- [ ] Create/read/update/delete works for projects and retail items, including image upload/update via Cloudinary
- [ ] Publish/unpublish toggle immediately affects public visibility without deleting the item
- [ ] Retail availability toggle works independently of publish status
- [ ] Deleting a project/retail item removes it from public access but does not break existing orders referencing it
- [ ] Server-side validation rejects invalid create/update payloads (missing required fields, negative price, etc.)

**Admin — Enquiries & Orders**
- [ ] Admin can view, update status, and delete enquiries
- [ ] Admin can view orders with customer, item, and payment details
- [ ] Admin can update order status (pending/confirmed/completed/cancelled)
- [ ] There is no admin action that can manually mark a payment as successful/verified

**Dashboard**
- [ ] Dashboard links to Projects, Retail, Enquiries, Orders management
- [ ] Overview counts (if shown) match actual data

---

## 2. UI/UX Testing

- [ ] Layout matches the design reference section-by-section on every page
- [ ] Only Abhaya Libre (headings) and Inter (body/UI) are used; no other font/weight appears
- [ ] Only palette colors from the design system appear (black/ink/white/muted/border/surface/cream/brown/footer tones); brown accent appears only on the About page
- [ ] Spacing, radii, and borders follow the design tokens — no arbitrary one-off values
- [ ] The single shared `<Button />` component is used everywhere; no duplicate/ad-hoc button styles
- [ ] Images are never stretched or incorrectly cropped; `object-fit: cover` used consistently in grids
- [ ] Icons are visually consistent in size/stroke across the site
- [ ] All interactive elements have visually distinct Default/Hover/Focus/Active/Disabled states
- [ ] Loading, Selected, Error, and Success states are implemented where applicable (forms, buttons, cards)
- [ ] Cursor rules are correct: pointer on clickable elements, not-allowed on disabled elements
- [ ] Cards, Navbar, Footer, FAQ accordion, and Cart drawer are visually and behaviorally consistent across pages
- [ ] Testimonial carousel is the only horizontally-scrolling element; no other section scrolls sideways

---

## 3. Responsive Testing

- [ ] Verified at 320px, ~375–430px, ~768px, ~1280–1440px, ~1920px, and ~2560–3840px widths
- [ ] No horizontal scrolling/overflow at any breakpoint, on any page
- [ ] Navigation collapses into an accessible mobile menu; all primary links remain reachable
- [ ] Layouts reflow (stack/reduce columns) rather than hiding content at smaller widths
- [ ] Typography remains readable at every supported width (no clipped/overlapping text)
- [ ] Images preserve aspect ratio at all widths
- [ ] Admin panel remains usable on tablet/desktop; large tables scroll within their own container, not the whole page
- [ ] Tested in both portrait and landscape orientation on mobile/tablet
- [ ] No functionality on mobile depends on hover-only interaction

---

## 4. Accessibility

- [ ] Full keyboard path (Tab/Shift+Tab) reaches every interactive element in a logical order
- [ ] Visible focus ring on every focusable element (2px, per design spec)
- [ ] Enter/Space activates buttons and accordion triggers; Escape closes drawer/modal
- [ ] All form fields have properly associated `<label>` elements (not placeholder-only)
- [ ] Icon-only controls (cart icon, mobile menu toggle, social icons) have accessible names via `aria-label`
- [ ] Validation/error messages are programmatically associated with their fields
- [ ] Heading hierarchy is logical: one `<h1>` per page, structured `<h2>`/`<h3>` below it
- [ ] Semantic landmarks used (nav, main, footer, etc.) instead of generic divs where appropriate
- [ ] All meaningful images have descriptive, non-keyword-stuffed alt text; decorative images are hidden from AT
- [ ] Text/background color contrast meets WCAG AA across public and admin UI
- [ ] Color is never the sole means of conveying state/information
- [ ] `prefers-reduced-motion: reduce` disables/shortens non-essential animation without hiding functionality
- [ ] Modal/drawer interactions correctly trap and restore focus on open/close

---

## 5. Performance

- [ ] Images served as WebP with responsive `srcset`, lazy-loaded below the fold, explicit width/height to avoid layout shift
- [ ] Only the required font weights/styles are loaded, with `font-display: swap`
- [ ] Animations use only `transform`/`opacity`; no continuous/looping background animation
- [ ] Lenis + GSAP ScrollTrigger stay in sync and remain smooth under a throttled/low-end device profile
- [ ] At least one genuinely pinned scroll section behaves correctly on desktop and touch
- [ ] Retail/Projects grids paginate via "Load More"/"View All" rather than rendering the full catalog at once
- [ ] No redundant scroll/resize listeners per component (shared/passive listener or IntersectionObserver used)
- [ ] No unnecessary component re-renders on cart updates, form input, or route changes
- [ ] Core Web Vitals (LCP, CLS, INP) are within acceptable range on key pages (Home, Projects, Retail)

---

## 6. Security

- [ ] Frontend never talks to MongoDB directly; all data flows through backend REST APIs
- [ ] No secret (JWT signing key, DB URI, Razorpay secret, Cloudinary secret, EmailJS private key) is exposed to the frontend or has a `VITE_` prefix
- [ ] Admin JWT cookie is `httpOnly`, and `Secure` in production
- [ ] All `/admin/*` API routes independently enforce authentication/authorization server-side (not just frontend route guarding)
- [ ] Sensitive/admin routes have rate limiting (`express-rate-limit`) against brute force
- [ ] Security headers are set via `helmet`
- [ ] All user input (enquiry form, checkout, admin CRUD) is validated/sanitized server-side via `express-validator`
- [ ] File uploads are validated for type, size, and count before forwarding to Cloudinary
- [ ] No public API response ever returns admin credentials, password hashes, payment secrets, or DB credentials
- [ ] Passwords are stored only as bcrypt hashes, never plain text or returned in any response
- [ ] Razorpay payment verification happens server-side using signature verification, not trusted from client callback alone
- [ ] CORS is configured to allow only expected origins

---

## 7. SEO

- [ ] Every indexable public page has a unique `<title>` and meta description reflecting actual content
- [ ] Metadata is generated dynamically (e.g., via React Helmet) per project/retail item, not static/duplicated
- [ ] Each indexable page has a correct canonical URL
- [ ] URLs are clean, lowercase, and slug-based (`/projects/:slug`, `/retail/:slug`)
- [ ] `robots.txt` allows public pages and disallows `/admin/*`
- [ ] XML sitemap includes only published project/retail pages and excludes admin/unpublished/deleted content
- [ ] Open Graph metadata is present on key shareable pages (Home, project/retail detail)
- [ ] Heading hierarchy supports SEO (single `<h1>`, logical `<h2>`/`<h3>`)

---

## 8. Error & Edge Cases

- [ ] Loading state shown while projects/retail/cart/orders data is fetched
- [ ] Empty state shown when no published projects/retail items exist (no broken/fabricated cards)
- [ ] API failure shows an error state without crashing the page or leaving an infinite loading spinner
- [ ] Direct URL access and browser refresh work correctly on every route, including nested/dynamic ones
- [ ] Browser back/forward navigation behaves correctly (cart state, scroll position, filters as applicable)
- [ ] Checkout rejects an item that becomes unavailable/changes price between cart and payment
- [ ] Submitting the enquiry/checkout form with network failure preserves entered data and allows retry
- [ ] Admin session expiry mid-action shows an "unauthorized" state and redirects to login, not a silent failure
- [ ] Deleting a project/retail item referenced by an existing order does not break the order's historical record

---

## 9. Browser & Device Testing

- [ ] Chrome, Firefox, Safari, and Edge (latest versions) — public site and admin panel
- [ ] iOS Safari and Android Chrome on real or emulated devices
- [ ] Touch interactions (tap, scroll) work correctly on mobile without relying on hover
- [ ] Native touch scroll/swipe on the testimonial carousel doesn't break layout or animation sync

---

## 10. Code Quality

- [ ] No console errors or warnings on any page in normal use (public + admin)
- [ ] No broken imports, unused variables, or dead code left in the codebase
- [ ] No duplicate logic where a shared component/utility should be reused (e.g., button, card, API layer)
- [ ] No `.ts`/`.tsx` files, `tsconfig.json`, or `@types/*` packages anywhere in the repo
- [ ] No package installed beyond what's listed in `TRD.md` Section 23 without justification
- [ ] Static UI copy lives in feature-scoped `*.data.js` files, not hardcoded inline in components
- [ ] Frontend production build (`vite build`) completes with no errors
- [ ] Backend starts cleanly in both development and production modes, confirming MongoDB Atlas connection before accepting traffic

---

## 11. Regression Testing

- [ ] Previously working public flows (browse → detail → enquiry, browse → cart → checkout) still work after new changes
- [ ] Previously working admin CRUD flows still work after new changes
- [ ] Existing published projects/retail items still display correctly after schema or UI changes
- [ ] Existing orders/enquiries are unaffected by new deployments
- [ ] No previously fixed bug has reappeared

---

## 12. Release Checklist

- [ ] All environment variables set correctly in production (Mongo URI, JWT secret, Razorpay keys, Cloudinary keys, EmailJS keys) — none exposed to frontend
- [ ] Frontend `dist/` build is correctly copied into `backend/public/`
- [ ] SPA fallback route resolves deep links/refreshes correctly in production (e.g., `/projects/some-slug`, `/admin/orders`)
- [ ] Site is served over HTTPS in production
- [ ] `robots.txt` and sitemap are correct and live in production
- [ ] Razorpay is in live mode (not test keys) before go-live
- [ ] Final smoke test of core flows in production: browse, enquiry submission, retail purchase, admin login, admin CRUD
- [ ] No critical console errors or unhandled request failures in the deployed environment

---

## 13. Performance (Extended)

- [ ] API latency for public listing/detail endpoints is measured under normal load and does not regress after changes
- [ ] Site remains usable under a throttled/low-end network profile (e.g., throttled 3G/4G) in addition to the low-end CPU profile already covered in Section 5
- [ ] Behavior under large-concurrent-traffic simulation (e.g., a basic load-test script hitting `/projects`, `/retail`, and `/enquiries`) is checked at least once before a release expected to drive significant traffic
- [ ] Memory/CPU usage of the backend process is observed under sustained load and does not grow unbounded (no obvious memory leak across repeated requests)
- [ ] Behavior with a large dataset (many projects/retail items/orders) is checked against a seeded large collection, not only the small dataset used in day-to-day development

## 14. Rate Limiting

- [ ] Repeated invalid login attempts against `/api/auth/login` are eventually blocked with `429`, and legitimate login still works after the cooldown window
- [ ] Repeated admin API calls against a stricter admin-scoped limit correctly return `429` once exceeded, without blocking normal admin usage
- [ ] Repeated `POST /api/checkout`/`checkout/verify` calls are rate-limited without blocking a single legitimate checkout attempt
- [ ] Repeated enquiry/form submissions are rate-limited (form spam protection)
- [ ] General public API traffic exceeding the baseline limit receives `429`, not a crash or hang
- [ ] `429` responses use the standard error envelope and, where applicable, a sensible cooldown/recovery period is confirmed by retrying after the window elapses
- [ ] Client IP is correctly resolved behind Hostinger's proxy (`trust proxy`) — rate limiting is not accidentally applied to "all traffic as one client" or bypassed entirely
- [ ] Because production currently runs a single backend instance, multi-instance rate-limit consistency is not applicable yet; this item is revisited if the topology ever changes (`TRD.md` §25 RATE-11)

## 15. Caching

- [ ] Public listing/detail responses that set a cache TTL are confirmed to actually refresh (no stale published/unpublished state shown) after an admin change
- [ ] Cache invalidation/staleness: publishing or unpublishing a project/retail item is reflected on the public site within the documented TTL, not indefinitely stale
- [ ] Every `/api/admin/*` response is confirmed (via browser dev tools/network tab) to carry `Cache-Control: no-store`
- [ ] Every `/api/checkout`, `/api/checkout/verify`, and `/api/auth/*` response is confirmed to carry `Cache-Control: no-store`
- [ ] No admin or payment data is ever retrievable from a shared/browser cache after logout (spot-check via back-navigation and dev tools' cached-response inspection)
- [ ] Static frontend assets use long-lived cache headers while `index.html` itself does not, so a new deploy is picked up without requiring a hard refresh
- [ ] Cache poisoning is not applicable at current scope (no shared/reverse-proxy cache exists) — re-verify this checklist item if such a layer is ever introduced

## 16. Scalability & Resilience

- [ ] Behavior under a burst of concurrent users hitting the same public page/endpoint simultaneously does not produce incorrect data or crashes (e.g., two simultaneous checkouts for the same last-available item both re-validate correctly rather than both succeeding)
- [ ] A simulated backend restart (matching the documented brief-restart-on-deploy behavior, `TRD.md` DEP-09) recovers automatically without manual intervention, and in-flight requests fail gracefully rather than hanging indefinitely
- [ ] A simulated database slowdown/timeout results in a clear error state on the frontend, not an indefinite loading spinner
- [ ] A simulated external service failure (EmailJS, Razorpay, Cloudinary) is handled per the documented decoupling rules — an EmailJS failure never blocks a successful enquiry; a Cloudinary failure is surfaced clearly during upload without corrupting the project/retail record
- [ ] Because no caching layer currently exists, "cache failure" scenarios are not applicable at this scope — re-verify if one is introduced
- [ ] Recovery behavior after any of the above failures returns the system to normal operation without requiring a database restore or manual data fix

## Critical Bugs
- *(list blocking issues found during this QA cycle)*

## Known Issues
- *(list non-blocking issues, deferred fixes, or accepted limitations)*

## Final QA Status
- [ ] Pass — ready for release
- [ ] Pass with known issues — release approved with noted exceptions above
- [ ] Fail — blocked on critical bugs above
