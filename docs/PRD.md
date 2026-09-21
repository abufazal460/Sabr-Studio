# Product Requirements Document — Sabr Studio

## 1. Product Overview

Sabr Studio is a full-stack interior design studio platform (MERN: MongoDB, Express.js, React, Node.js) consisting of a public-facing website and a secure admin panel.

The public website allows visitors to explore the studio's past interior design projects, browse retail products, learn about the studio and its founder, and submit enquiries. Visitors can also purchase retail products (and, where configured, purchasable projects) directly through the website using an integrated payment gateway.

The admin panel allows the studio's internal team to manage all dynamic content — projects, retail products, enquiries, and orders — without requiring code changes.

MongoDB is the primary data store for all application data. EmailJS is used to send email notifications when a visitor submits an enquiry. Cloudinary (via Multer on the backend) is used for image storage and delivery.

**High-level system purpose:**
- Give the studio a professional, portfolio-driven online presence.
- Let visitors discover projects and retail products and generate leads through enquiries.
- Let visitors purchase retail products (and configured projects) online.
- Give the studio a single, secure interface to manage all of the above.

---

## 2. Goals & Scope

### Goals
- Present the studio's portfolio and retail catalog in an attractive, professional, and trustworthy way.
- Convert visitor interest into enquiries through a simple, reusable enquiry form.
- Allow visitors to purchase retail products (and configured projects) online through a secure checkout flow.
- Give the studio full content control (projects, retail, enquiries, orders) through a protected admin panel.
- Deliver a lightweight, minimal, responsive, SEO-friendly, and accessible experience.

### In Scope
- Responsive public website (Home, Projects, Project Detail, Retail, Retail Detail, Services, About, Contact).
- Project showcase with category-based listing and detail pages.
- Retail catalog with listing and detail pages.
- Shopping cart for retail products (add, update quantity, remove, view total).
- Checkout and payment for retail products (and purchasable projects) via Razorpay.
- Order and payment status storage and admin order management.
- Reusable enquiry form with EmailJS email notification.
- MongoDB-backed backend REST API for all dynamic data.
- Secure admin authentication and protected admin routes.
- Admin dashboard with Project CRUD, Retail CRUD, Enquiry management, and Order management.
- Image upload and storage via Multer + Cloudinary.
- SEO, responsive design, and accessibility requirements across all public pages.

### Out of Scope
- Customer account/registration system (no visitor login, order history, or saved profiles).
- Online booking/appointment scheduling system.
- Product reviews and ratings.
- Wishlist functionality.
- Push/SMS notifications (email notification via EmailJS only).
- Analytics dashboards or reporting tools beyond the admin overview counts defined in this document.
- Any content management system beyond the admin panel described here.

---

## 3. Target Users

- **Potential Clients (General Leads):** Visitors exploring the studio's overall aesthetic and work quality before deciding to enquire. Interact primarily with the homepage, portfolio, and contact form.
- **Residential Clients:** Homeowners evaluating residential projects (living rooms, kitchens, bedrooms, modular setups) to compare design styles and find a suitable solution. Interact with project listings/filters and project detail pages.
- **Commercial Clients:** Business or office owners assessing the studio's commercial capability. Interact with commercial project portfolios and submit professional enquiries.
- **Retail Visitors & Shoppers:** Visitors interested in purchasing specific decor items or materials rather than full design services. Interact with the Retail listing, product detail pages, cart, and checkout.
- **Admin / Studio Management:** Internal studio staff who manage website content and respond to leads and orders. Interact exclusively with the secure admin panel.

---

## 4. Core Features

| Feature | Description | Primary Users |
|---|---|---|
| Responsive public website | Minimal, animated, mobile-first website covering all public pages | All visitors |
| Project showcase | Dynamic project listing with category context and individual project detail pages | Potential/Residential/Commercial clients |
| Retail catalog | Dynamic retail listing and product detail pages with pricing and availability | Retail visitors |
| Cart & checkout | Add-to-cart, cart management, and Razorpay-based checkout for retail (and configured project) purchases | Retail visitors |
| Order management | Server-authoritative order creation, payment verification, and order/payment status tracking | Retail visitors, Admin |
| Enquiry system | Reusable enquiry form available across relevant pages, validated client- and server-side, stored in MongoDB, triggers EmailJS notification | All visitors |
| Admin authentication | Secure login protecting all admin functionality | Admin |
| Admin dashboard | Central management hub with overview counts and navigation to all management areas | Admin |
| Project management | Full CRUD for projects, including images, category, pricing, and publish status | Admin |
| Retail management | Full CRUD for retail items, including images, price, availability, and publish status | Admin |
| Enquiry management | View, update status, and delete enquiries | Admin |
| Order management | View orders, customer/payment details, and update order status | Admin |
| Image handling | Admin-uploaded images validated by the backend (Multer) and stored on Cloudinary | Admin |
| SEO & accessibility | Structured metadata, semantic HTML, and WCAG 2.2 AA-targeted accessibility across public pages | All visitors, search engines |

---

## 5. Pages & Routes

### Public Routes
| Route | Purpose |
|---|---|
| `/` | Studio introduction and highlights |
| `/projects` | Project listing |
| `/projects/:slug` | Individual project detail |
| `/retail` | Retail product listing |
| `/retail/:slug` | Individual retail product detail |
| `/services` | Studio services overview |
| `/about` | Studio history, mission, and founder profile |
| `/contact` | Contact information and enquiry form |
| `/cart` | Cart contents and purchase summary |

A cart icon is present in the site navigation/header at all times and opens the `/cart` page or an equivalent cart view.

### Admin Routes
| Route | Purpose |
|---|---|
| `/admin/login` | Admin authentication |
| `/admin` | Admin dashboard overview |
| `/admin/projects` | Project management (CRUD) |
| `/admin/retail` | Retail management (CRUD) |
| `/admin/enquiries` | Enquiry management |
| `/admin/orders` | Order and payment status management |

All `/admin/*` routes except `/admin/login` are protected and require an authenticated, authorized admin session, enforced by the backend.

---

## 6. User Flows

**Project Discovery**
Home → Projects → Project Detail → Enquiry

**Project Purchase** (where a project is configured as purchasable)
Home → Projects → Project Detail → Purchase → Checkout → Razorpay → Payment Verification → Order Confirmation

**Retail Discovery**
Home → Retail → Retail Detail

**Retail Purchase**
Retail Detail → Add to Cart → Cart (view/update/remove items) → Buy Now/Checkout → Razorpay → Payment Verification → Order Confirmation

**Enquiry Submission**
Enquiry Form → Client-Side Validation → Backend Validation → MongoDB Storage → EmailJS Notification → Success/Error Response

**Admin Authentication**
Admin Login → Authentication → Admin Dashboard → Protected Routes

**Project Management**
Admin Login → Projects → Create/Read/Update/Delete → Database & Media Update → Updated Public Listing

**Retail Management**
Admin Login → Retail → Create/Read/Update/Delete → Database & Media Update → Updated Public Listing

**Order Management**
Admin Login → Orders → View Order → View Customer/Payment Details → Update Order Status

**Payment Processing**
Cart/Project → Checkout → Backend Creates Payment Order → Razorpay → Payment → Backend Verification → Database Update → Order Confirmation

---

## 7. Functional Requirements

### FR-A — Public Website
- FR-A1: The public website must be accessible without authentication.
- FR-A2: All public pages must render correctly across supported viewport widths (see Section 10).
- FR-A3: Primary navigation must provide access to Home, Projects, Retail, Services, About, Contact, and the Cart icon.

### FR-B — Projects (Listing)
- FR-B1: `/projects` must display only published projects.
- FR-B2: Each project card must display, at minimum, the project image and title, and may display category where applicable.
- FR-B3: Selecting a project card must navigate to that project's detail page.
- FR-B4: Deleted or unpublished projects must never appear in the public listing.
- FR-B5: The public project API must return only published projects.

### FR-C — Project Details
- FR-C1: `/projects/:slug` must resolve the project using its slug.
- FR-C2: The page must display the project's title, description, category, images, and other stored project information, plus an enquiry call-to-action.
- FR-C3: Where a project is configured as purchasable, the page must display its price and a purchase call-to-action.
- FR-C4: An invalid, deleted, or unpublished project slug must return a not-found state; no project data may be fabricated.

### FR-D — Retail (Listing)
- FR-D1: `/retail` must display only published retail items.
- FR-D2: Each retail card must display the product image, title, and price, and an Add to Cart action where the item is purchasable.
- FR-D3: Unavailable items must have their purchase action disabled or hidden.
- FR-D4: Deleted or unpublished retail items must never appear in the public listing.

### FR-E — Retail Details
- FR-E1: `/retail/:slug` must resolve the retail item using its slug.
- FR-E2: The page must display product images, title, description, price, availability, and an Add to Cart action where purchasable.
- FR-E3: An invalid, deleted, or unpublished slug must return a not-found state.

### FR-F — Cart
- FR-F1: Visitors can add purchasable retail products to a cart.
- FR-F2: The cart must display, per item: image, name, unit price, quantity (where supported), and a remove action.
- FR-F3: The cart must display a calculated total; this total is informational only and is not authoritative for payment.
- FR-F4: The cart icon in navigation must open the cart.
- FR-F5: The system must handle an empty cart with an appropriate empty state; checkout must not be available from an empty cart.
- FR-F6: Before checkout, the backend must re-validate each item's existence, availability, and current price.

### FR-G — Checkout & Payment
- FR-G1: Checkout must collect the customer/order information required to complete a purchase.
- FR-G2: The backend must independently verify product/project existence, availability, and current price before creating a payment order.
- FR-G3: The final payable amount must be calculated server-side and must never be trusted from the client.
- FR-G4: The backend must create the Razorpay order and must never expose Razorpay secret credentials to the frontend.
- FR-G5: Payment success must be confirmed only after backend verification of the payment gateway's response; a client-side success callback alone is not sufficient.
- FR-G6: Failed or cancelled payments must not result in an order being marked successful.
- FR-G7: A successful, verified payment must result in an order confirmation state and a stored order record.

### FR-H — Order & Payment Records
- FR-H1: Every completed checkout attempt that reaches payment creation must be represented by an order record.
- FR-H2: Each order must retain a snapshot of the purchased item(s), including name, quantity, and price at time of purchase, independent of later product changes.
- FR-H3: Each order must store the Razorpay order/payment references and payment status.
- FR-H4: Order status and payment status are distinct fields and must be tracked separately.

### FR-I — Enquiries
- FR-I1: A reusable enquiry form must be available on the relevant public pages (at minimum, Contact; may also appear on project/retail/service pages).
- FR-I2: Required fields must be validated on the client for immediate feedback and, independently, on the backend before storage.
- FR-I3: A valid submission must be stored in MongoDB and must trigger an EmailJS notification.
- FR-I4: A failure to send the email notification must not be reported to the user as a failure to submit the enquiry if the enquiry was successfully stored.
- FR-I5: The form must display loading, success, and error states, and must prevent duplicate submission while a request is in progress.

### FR-J — Admin Authentication
- FR-J1: `/admin/login` must authenticate administrators using securely hashed credentials.
- FR-J2: Invalid credentials must return a generic authentication error that does not reveal whether the account exists.
- FR-J3: All `/admin/*` routes other than `/admin/login`, and all corresponding backend APIs, must require a valid authenticated session.
- FR-J4: Admins must be able to log out, invalidating the active session/token.
- FR-J5: Frontend route protection is a UX convenience only; the backend must independently enforce authorization on every protected API call.

### FR-K — Admin Dashboard
- FR-K1: The dashboard must provide navigation to Projects, Retail, Enquiries, and Orders management.
- FR-K2: The dashboard may display overview counts (e.g., number of projects, retail items, enquiries, orders).

### FR-L — Project Management (Admin)
- FR-L1: Admin can create a project with title, slug, description, category, images, optional location/year, optional price, and publish status.
- FR-L2: Admin can view, update, and delete existing projects.
- FR-L3: Admin can toggle a project's publish status.
- FR-L4: A deleted project must be immediately removed from public listings and detail access; associated media should be identified for Cloudinary cleanup.
- FR-L5: All create/update operations must be validated server-side before persistence.

### FR-M — Retail Management (Admin)
- FR-M1: Admin can create a retail item with title, slug, description, images, category, price, availability, and publish status.
- FR-M2: Admin can view, update, and delete existing retail items.
- FR-M3: Admin can toggle publish status and availability independently.
- FR-M4: A deleted retail item must be immediately removed from public listings and must not be purchasable; existing order records referencing that item must remain intact.
- FR-M5: All create/update operations must be validated server-side before persistence.

### FR-N — Enquiry Management (Admin)
- FR-N1: Admin can view all submitted enquiries, including their details and status.
- FR-N2: Admin can update an enquiry's status (e.g., new, in-progress, resolved).
- FR-N3: Admin can delete an enquiry.
- FR-N4: Enquiry data must never be exposed through public APIs.

### FR-O — Order Management (Admin)
- FR-O1: Admin can view all orders, including customer details, purchased items, amount, and payment status.
- FR-O2: Admin can update order status (e.g., pending, confirmed, completed, cancelled).
- FR-O3: Admin cannot mark a payment as successful manually; payment status must derive only from verified gateway responses.

### FR-P — System Behavior
- FR-P1: The frontend must never directly access MongoDB; all data flows through backend REST APIs.
- FR-P2: Public APIs must return only publicly visible data; admin APIs must require authentication and authorization.
- FR-P3: Every state — loading, empty, success, validation error, not-found, unauthorized, and server error — must be handled explicitly and must not leave the UI in a broken or indefinitely-loading condition.

---

## 8. Content & Data

This section defines what data the system must manage. Database schemas, indexes, and Mongoose implementation belong in separate technical documentation (DATABASE.md), not here.

### Project Data
| Field | Type | Notes |
|---|---|---|
| Title | String | Required |
| Slug | String | Required, unique, URL-safe |
| Category | String | Required where categories apply; from an approved set |
| Location | String | Optional |
| Year | Number | Optional; stored as a numeric four-digit year |
| Description | String | Required |
| Images | Array of Strings | Required for published projects; Cloudinary references |
| Project-specific details | Object | Structured additional info (e.g., area, style, scope); fields must be explicitly defined and validated |
| Price | Number | Required only for purchasable projects |
| Published status | Boolean | Required |
| Created/Updated timestamps | Date | Backend-controlled |

### Retail Data
| Field | Type | Notes |
|---|---|---|
| Title | String | Required |
| Slug | String | Required, unique, URL-safe |
| Category | String | Optional/required per catalog needs; from an approved set |
| Description | String | Required |
| Images | Array of Strings | Required for published items; Cloudinary references |
| Price | Number (or defined monetary representation) | Required; must not be negative |
| Availability | Boolean | Required |
| Published status | Boolean | Required |
| Created/Updated timestamps | Date | Backend-controlled |

### Enquiry Data
| Field | Type | Notes |
|---|---|---|
| Name | String | Required |
| Email | String | Required, valid email format |
| Phone | String | Required per form configuration; stored as a string, never as a number |
| Message | String | Required |
| Source/page | String | Origin of the enquiry (e.g., `/contact`, `/projects/:slug`) |
| Status | Controlled String | e.g., `new`, `in-progress`, `resolved` |
| Submission date | Date | Backend-controlled |

### Admin Data
| Field | Type | Notes |
|---|---|---|
| Admin identity | Object | ID, name, email, role, account status |
| Authentication credentials | Hashed | Passwords never stored or returned in plain text |
| Role | Controlled String | Single `admin` role is sufficient for current scope |
| Account status | Controlled value | e.g., `active`, `disabled` |
| Timestamps | Date | createdAt, updatedAt, lastLoginAt |

### Order Data
| Field | Type | Notes |
|---|---|---|
| Order ID | String/Identifier | Unique, backend-generated |
| Customer information | Object | Name, email, phone, and any required contact info collected at checkout |
| Purchased items | Array of Objects | Snapshot of item reference, name, quantity, unit price, and total at time of purchase |
| Order amount | Numeric | Calculated server-side |
| Payment information | Object | Razorpay order reference, payment reference, verification status |
| Payment status | Controlled String | `pending`, `paid`, `failed`, `cancelled` |
| Order status | Controlled String | `pending`, `confirmed`, `completed`, `cancelled` |
| Timestamps | Date | Backend-controlled |

### Data Visibility Rules
- Public users may access only published projects, published retail items, and general public page content.
- Public users must never receive admin credentials, password hashes, enquiries, orders, payment secrets, or other internal data.
- Authenticated admins may access projects, retail items, enquiries, and orders as required for management.

---

## 9. Validation & States

### Form Validation
- All required fields must be validated on both client and backend.
- Email fields must follow valid email syntax.
- Phone fields must be validated against the accepted format and stored as strings.
- Message/description fields must enforce a defined maximum length.
- Backend validation is authoritative regardless of client-side validation outcome.

### Enquiry States
- **Initial** — form ready for input.
- **Validation error** — invalid data shown inline; request not submitted.
- **Submitting** — loading state; duplicate submissions prevented.
- **Success** — enquiry stored, email notification triggered, confirmation shown.
- **Failure** — error shown; user data is not lost; user may retry.

### Content States (Projects & Retail)
- **Loading** — shown while data is fetched.
- **Empty** — shown when no published items exist; no broken cards or fabricated content.
- **Not found** — shown for invalid, deleted, or unpublished slugs.
- **Error** — shown on API failure without crashing the page.
- **Published / Unpublished** — controls public visibility only; both states remain manageable in admin.

### Cart & Checkout States
- **Empty cart** — checkout unavailable; backend rejects an empty checkout request regardless of client state.
- **Item unavailable/invalid at checkout** — rejected with a clear message; user can adjust the cart.
- **Payment success** — shown only after backend-verified payment.
- **Payment failure/cancellation** — shown clearly; no order is marked successful.

### Admin States
- **Unauthenticated** — redirected to `/admin/login`.
- **Invalid credentials** — generic authentication error shown.
- **Authenticated** — dashboard and management areas accessible.
- **Unauthorized** — action blocked with an appropriate error (e.g., expired session).
- **CRUD success/failure** — explicit confirmation or error shown for every create, update, and delete action.

---

## 10. Responsive, SEO & Accessibility

### Responsive Requirements
- The website must function correctly from 320px mobile width up to 3840px (4K) desktop width.
- Navigation must collapse into an accessible mobile menu at small widths; all primary links remain reachable.
- Layouts must reflow (stacking, column reduction) rather than hide content at smaller widths.
- Images must preserve aspect ratio at all widths; no stretching or unintended cropping.
- No page may require horizontal scrolling for normal content.
- Typography must scale so text remains readable at every supported width.
- The admin panel must remain usable on tablet and desktop widths, with complex tables scrolling within their own container rather than the whole page.

### SEO Requirements
- Every indexable public page must have a unique `<title>` and meta description.
- Metadata must be managed dynamically (e.g., via React Helmet) and reflect actual page content.
- Public URLs must be clean, lowercase, and crawlable (e.g., `/projects/:slug`, `/retail/:slug`).
- Each indexable page must have a correct canonical URL.
- A valid `robots.txt` must allow crawling of public pages and disallow `/admin/*` routes (robots configuration is not a security control; admin routes must still be protected by authentication).
- A valid XML sitemap must include indexable public pages, including published project and retail detail pages, and must exclude admin routes and unpublished/deleted content.
- Meaningful images must have descriptive, non-keyword-stuffed alt text.
- Heading hierarchy must be logical (one primary `<h1>` per page, structured `<h2>`/`<h3>` below it).
- Open Graph metadata should be included for key public pages where social sharing is relevant.

### Accessibility Requirements
- Target: WCAG 2.2 AA across public and admin interfaces.
- All interactive elements must be reachable and operable via keyboard, with visible focus states.
- Form fields must have properly associated labels; placeholder text alone is not a label.
- Icon-only controls (e.g., cart icon, mobile menu toggle) must have an accessible name (e.g., `aria-label`).
- Validation and error messages must be programmatically associated with their fields.
- Color must not be the sole means of conveying information; text/background contrast must meet WCAG requirements.
- The site must respect `prefers-reduced-motion`, disabling or reducing non-essential animation without hiding functionality.
- Modal/dialog interactions (where used) must manage focus correctly on open and close.

---

## 11. Integrations

### MongoDB
Primary datastore for projects, retail items, enquiries, orders, and admin data. The backend is the only layer permitted to access MongoDB; the frontend never accesses it directly.

### Backend/API (Node.js + Express)
Serves as the sole intermediary between frontend, database, and external services. Responsible for all CRUD operations, validation, authentication, authorization, enquiry processing, checkout/order creation, and payment verification.

### EmailJS
Sends an email notification whenever a valid enquiry is submitted. Enquiry storage in MongoDB is independent of email delivery; an email failure must not be reported as an enquiry submission failure.

### Razorpay
Handles the payment interface for retail (and configured project) purchases. The backend creates payment orders and verifies payment responses server-side; Razorpay secret credentials remain server-side and are never exposed to the frontend.

### Multer + Cloudinary
Multer handles incoming multipart image uploads on the backend and validates file type, size, and count before forwarding to Cloudinary. Cloudinary stores and delivers project and retail images; MongoDB stores only the resulting image URL/reference, not binary image data.

### Integration Security
- All external service credentials are stored in environment variables and never exposed to the frontend.
- Admin-only integrations (uploads, project/retail management) require authentication and authorization.
- External service failures return controlled, generic error responses without exposing credentials or internal details.

---

## 12. Acceptance Criteria

### Public Website
- All defined public routes (`/`, `/projects`, `/projects/:slug`, `/retail`, `/retail/:slug`, `/services`, `/about`, `/contact`, `/cart`) load correctly, support direct access and browser refresh, and handle invalid routes with a 404/not-found state.
- Project listing displays only published projects with correct title, image, and category.
- Project detail pages display correct data for valid, published projects and a not-found state for invalid, deleted, or unpublished slugs.
- Retail listing displays only published, available items with correct title, image, and price.
- Retail detail pages display correct data and a not-found state for invalid, deleted, or unpublished slugs.

### Cart & Purchase
- Users can add available retail products to the cart, update quantities, and remove items.
- The cart correctly displays an empty state and blocks checkout when empty.
- Checkout re-validates product existence, availability, and price on the backend before payment.
- Payment amount is always calculated server-side and never trusted from the client.
- A payment is marked successful only after backend verification of the Razorpay response.
- Failed or cancelled payments never result in a successful order.
- Completed orders retain a snapshot of purchased item name and price independent of later product edits.

### Enquiries
- The enquiry form rejects invalid or missing required fields, both client- and server-side.
- Valid enquiries are stored in MongoDB and trigger an EmailJS notification.
- An email delivery failure does not cause a stored enquiry to be reported as failed to the user.
- Enquiry data is never exposed through any public API.

### Admin
- Admin authentication accepts valid credentials and rejects invalid ones with a generic error.
- All `/admin/*` routes (other than `/admin/login`) and their backend APIs are inaccessible without a valid authenticated session, including via direct URL access or direct API calls.
- Admin can perform full CRUD on projects and retail items, including image upload/update via Cloudinary, with server-side validation on every operation.
- Publishing/unpublishing a project or retail item correctly updates its public visibility without requiring a deletion.
- Admin can view and update enquiry status and delete enquiries.
- Admin can view orders, customer and payment details, and update order status; admin cannot manually mark a payment as verified/successful.
- Deleting a project or retail item removes it from public access without corrupting any historical order referencing it.

### System-Wide
- No public API ever returns admin credentials, password hashes, payment secrets, or database credentials.
- Every documented state (loading, empty, validation error, not-found, unauthorized, server error, success) is implemented for its corresponding feature; no view remains permanently stuck in a loading state on failure.
- The website is usable without horizontal scrolling or broken layout from 320px to 3840px.
- All indexable public pages have a unique title, meta description, canonical URL, and appropriate alt text on images.
- `robots.txt` and an XML sitemap are present and correctly configured.
- Public and admin interfaces meet the defined keyboard navigation, focus visibility, labeling, and contrast requirements.
- No critical console errors or unhandled request failures occur during normal use of any defined flow.

---

## 13. Performance, Availability & Scalability (Product Requirements)

This section defines product-level expectations only. Implementation mechanisms (caching strategy, rate-limit values, infrastructure topology, etc.) belong in `TRD.md`/`DEPLOYMENT.md`, not here.

### High-Performance Experience
- The public website must feel fast and responsive on typical residential/mobile network conditions and on low-end mobile devices, not only on developer hardware.
- Visitors must not experience a blank or frozen screen while content loads; a loading indicator or skeleton state is always shown instead (see Section 9).

### Reliable Availability
- The public website and checkout flow must be available to visitors with minimal unplanned downtime.
- Planned maintenance or deployments should aim to minimize visible disruption to visitors; brief, clearly-scoped downtime during a deploy is acceptable, but the system must recover automatically without manual intervention.

### Smooth Behavior During Traffic Spikes
- The system must remain usable and must not silently lose data (enquiries, orders) during periods of higher-than-normal visitor traffic (e.g., a marketing push or seasonal interest).
- Where traffic exceeds what the system can serve promptly, the product must degrade gracefully (e.g., a clear "please try again" state) rather than failing silently or corrupting data.
- The product must not promise unlimited concurrent-user capacity; capacity targets and load-testing expectations are defined in `TRD.md` (values `TBD` until load-tested).

### Secure Admin Operations
- Admin functionality must remain accessible only to authorized studio staff at all times, including under load or attack conditions (e.g., repeated failed login attempts must not be able to lock out or degrade the admin experience for legitimate staff beyond a reasonable, temporary cooldown).
- Admin actions that affect content or orders must never be executable by an unauthenticated or unauthorized party, regardless of system load.

### Secure Payment Flow
- The purchase and checkout experience must remain trustworthy under load: a payment must never be double-charged, lost, or recorded incorrectly due to a slow network, a retry, or concurrent requests.
- Visitors must always receive an accurate, timely confirmation of whether their payment succeeded or failed, even during periods of high traffic.

### Graceful Failure Behavior
- If any part of the system (database, payment gateway, email notification, image delivery) is temporarily unavailable, the affected feature must fail visibly and safely (a clear error/retry state) without breaking unrelated parts of the website.
- A failure in a non-critical integration (e.g., email notification) must never cause a critical action (e.g., an enquiry submission or an order) to be reported as failed if that critical action actually succeeded (FR-I4).

### Scalable Growth
- The product must be able to accommodate a growing catalog of projects/retail items and a growing volume of enquiries/orders over time without requiring a redesign of core user-facing flows.
- Growth in content or traffic volume should be addressable primarily through technical/infrastructure changes documented in `TRD.md`/`DEPLOYMENT.md`, not through changes to the product's defined scope.

### No Unnecessary Performance-Heavy Features
- Visual richness (animation, imagery) must not come at the cost of core usability or load performance; any feature that measurably harms performance without a clear product justification is out of scope (Section 2, Out of Scope).
- No feature is added purely for visual polish if it meaningfully increases page weight, load time, or main-thread work without a corresponding product benefit.
