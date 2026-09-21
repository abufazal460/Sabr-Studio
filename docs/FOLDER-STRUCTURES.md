# Sabr Studio — Complete MERN Folder & File Structure

## Purpose and scope

This is the implementation-ready repository map for Sabr Studio: React/Vite frontend, Express API, MongoDB/Mongoose database layer, secure admin panel, and production deployment support. It is a **planned source structure**, not a claim that files already exist.

The structure follows the supplied specifications in this order: PRD → TRD → UI/UX → the remaining operational documents. It includes only in-scope functionality.

### Resolved source conflicts

- Canonical public catalog routes and API names are **`/retail`** and **`/api/retail`**. UI/UX references to `/shop` are treated as a naming inconsistency, because PRD/TRD/API define `/retail`.
- Visitor/customer authentication is deliberately absent. The UI "Login" CTA must remain a visually specified, inert/clarification-required CTA until the client defines its destination. Admin login at `/admin/login` is included.
- Icons use `react-icons` (including `react-icons/lu`), not a separate `lucide-react` dependency.

## Naming contract

| Item | Pattern | Example |
|---|---|---|
| Directories | lowercase kebab-case | `project-detail/` |
| React components/pages | PascalCase `.jsx` | `ProjectDetailPage.jsx` |
| Static data | camelCase `.data.js` | `homeHero.data.js` |
| Hooks | `use` + PascalCase `.js` | `useProjectFilters.js` |
| Utilities/constants/config | camelCase `.js` | `buildCloudinaryUrl.js` |
| API client modules | camelCase `.api.js` | `projects.api.js` |
| Backend layer modules | resource + layer suffix | `projects.service.js` |
| Test files | source name + `.test.jsx` / `.test.js` | `Button.test.jsx` |
| Environment samples | `.env.example` only | `backend/.env.example` |

Rules: all frontend code is JavaScript; no `.ts`, `.tsx`, `tsconfig.json`, or `@types/*`. Static content belongs in a feature `*.data.js` file; backend-driven content is fetched from the API. `backend/public/` is generated deployment output, is ignored by Git, and is never edited manually.

## Complete repository tree

```text
sabr-studio/
├── .editorconfig
├── .gitignore
├── .nvmrc
├── .prettierignore
├── .prettierrc.json
├── CODEOWNERS
├── LICENSE
├── README.md
├── package.json
├── package-lock.json
├── frontend/
│   ├── .env.example
│   ├── .gitignore
│   ├── eslint.config.js
│   ├── index.html
│   ├── package.json
│   ├── package-lock.json
│   ├── postcss.config.js
│   ├── tailwind.config.js
│   ├── vite.config.js
│   ├── public/
│   │   ├── robots.txt
│   │   ├── manifest.webmanifest
│   │   ├── sitemap.xml
│   │   ├── favicon.svg
│   │   ├── og-images/
│   │   │   ├── default-og-image.png
│   │   │   ├── home-og-image.png
│   │   │   └── social-share-placeholder.png
│   │   └── icons/
│   │       ├── apple-touch-icons.png
│   │       ├── favicon-16x16.png
│   │       ├── favicon-32x32.png
│   │       ├── icon-192.png
│   │       ├── icon-512.png
│   │       └── maskable-icon-512.png
│   └── src/
│       ├── main.jsx
│       ├── app/
│       │   ├── App.jsx
│       │   ├── providers/
│       │   │   ├── AppProviders.jsx
│       │   │   ├── AuthProvider.jsx
│       │   │   ├── CartProvider.jsx
│       │   │   ├── ErrorBoundary.jsx
│       │   │   ├── LenisProvider.jsx
│       │   │   └── ScrollRestoration.jsx
│       │   └── routes/
│       │       ├── AppRoutes.jsx
│       │       ├── ProtectedRoute.jsx
│       │       ├── PublicRoutes.jsx
│       │       └── AdminRoutes.jsx
│       ├── assets/
│       │   ├── fonts/
│       │   │   ├── abhaya-libre-regular.woff2
│       │   │   ├── abhaya-libre-medium.woff2
│       │   │   ├── abhaya-libre-regular-italic.woff2
│       │   │   ├── inter-regular.woff2
│       │   │   ├── inter-medium.woff2
│       │   │   └── inter-semibold.woff2
│       │   ├── icons/
│       │   │   ├── brand-mark.svg
│       │   │   ├── brand-wordmark.svg
│       │   │   └── payment-secure.svg
│       │   └── images/
│       │       ├── placeholders/
│       │       │   ├── image-placeholder.webp
│       │       │   ├── project-placeholder.webp
│       │       │   └── retail-placeholder.webp
│       │       └── static-content/
│       │           ├── about/
│       │           │   ├── founder-portrait.webp
│       │           │   └── studio-story.webp
│       │           ├── home/
│       │           │   ├── hero-one.webp
│       │           │   ├── hero-two.webp
│       │           │   ├── service-teaser.webp
│       │           │   └── about-teaser.webp
│       │           └── services/
│       │               └── services-hero.webp
│       ├── features/
│       │   ├── about/
│       │   │   ├── components/
│       │   │   │   ├── AboutHero.jsx
│       │   │   │   ├── AboutStory.jsx
│       │   │   │   └── FounderBlock.jsx
│       │   │   ├── data/
│       │   │   │   └── about.data.js
│       │   │   ├── motion/
│       │   │   │   └── about.motion.js
│       │   │   └── pages/
│       │   │       └── AboutPage.jsx
│       │   ├── admin-auth/
│       │   │   ├── api/
│       │   │   │   └── auth.api.js
│       │   │   ├── components/
│       │   │   │   ├── AdminLoginForm.jsx
│       │   │   │   └── AdminSessionGate.jsx
│       │   │   ├── context/
│       │   │   │   └── AuthContext.jsx
│       │   │   ├── hooks/
│       │   │   │   └── useAdminAuth.js
│       │   │   ├── pages/
│       │   │   │   └── AdminLoginPage.jsx
│       │   │   └── utils/
│       │   │       └── authFormValidation.js
│       │   ├── admin-dashboard/
│       │   │   ├── api/
│       │   │   │   └── dashboard.api.js
│       │   │   ├── components/
│       │   │   │   ├── DashboardHeader.jsx
│       │   │   │   ├── DashboardNav.jsx
│       │   │   │   ├── DashboardStatCard.jsx
│       │   │   │   └── RecentActivityList.jsx
│       │   │   ├── data/
│       │   │   │   └── dashboardNav.data.js
│       │   │   ├── hooks/
│       │   │   │   └── useDashboardOverview.js
│       │   │   ├── layouts/
│       │   │   │   └── AdminLayout.jsx
│       │   │   └── pages/
│       │   │       └── AdminDashboardPage.jsx
│       │   ├── admin-enquiries/
│       │   │   ├── api/
│       │   │   │   └── adminEnquiries.api.js
│       │   │   ├── components/
│       │   │   │   ├── EnquiryDetailsPanel.jsx
│       │   │   │   ├── EnquiryStatusSelect.jsx
│       │   │   │   └── EnquiriesTable.jsx
│       │   │   ├── hooks/
│       │   │   │   └── useAdminEnquiries.js
│       │   │   └── pages/
│       │   │       └── AdminEnquiriesPage.jsx
│       │   ├── admin-orders/
│       │   │   ├── api/
│       │   │   │   └── adminOrders.api.js
│       │   │   ├── components/
│       │   │   │   ├── OrderDetailsPanel.jsx
│       │   │   │   ├── OrderStatusSelect.jsx
│       │   │   │   ├── OrderSummary.jsx
│       │   │   │   └── OrdersTable.jsx
│       │   │   ├── hooks/
│       │   │   │   └── useAdminOrders.js
│       │   │   └── pages/
│       │   │       └── AdminOrdersPage.jsx
│       │   ├── admin-projects/
│       │   │   ├── api/
│       │   │   │   └── adminProjects.api.js
│       │   │   ├── components/
│       │   │   │   ├── ProjectEditorForm.jsx
│       │   │   │   ├── ProjectImageField.jsx
│       │   │   │   ├── ProjectPublishToggle.jsx
│       │   │   │   └── ProjectsAdminTable.jsx
│       │   │   ├── hooks/
│       │   │   │   └── useAdminProjects.js
│       │   │   ├── pages/
│       │   │   │   └── AdminProjectsPage.jsx
│       │   │   └── utils/
│       │   │       └── projectAdminValidation.js
│       │   ├── admin-retail/
│       │   │   ├── api/
│       │   │   │   └── adminRetail.api.js
│       │   │   ├── components/
│       │   │   │   ├── RetailAvailabilityToggle.jsx
│       │   │   │   ├── RetailEditorForm.jsx
│       │   │   │   ├── RetailImageField.jsx
│       │   │   │   ├── RetailPublishToggle.jsx
│       │   │   │   └── RetailAdminTable.jsx
│       │   │   ├── hooks/
│       │   │   │   └── useAdminRetail.js
│       │   │   ├── pages/
│       │   │   │   └── AdminRetailPage.jsx
│       │   │   └── utils/
│       │   │       └── retailAdminValidation.js
│       │   ├── cart/
│       │   │   ├── components/
│       │   │   │   ├── CartDrawer.jsx
│       │   │   │   ├── CartLineItem.jsx
│       │   │   │   ├── CartSummary.jsx
│       │   │   │   └── EmptyCart.jsx
│       │   │   ├── context/
│       │   │   │   └── CartContext.jsx
│       │   │   ├── hooks/
│       │   │   │   └── useCart.js
│       │   │   ├── pages/
│       │   │   │   └── CartPage.jsx
│       │   │   └── utils/
│       │   │       └── cartCalculations.js
│       │   ├── checkout/
│       │   │   ├── api/
│       │   │   │   └── checkout.api.js
│       │   │   ├── components/
│       │   │   │   ├── CheckoutForm.jsx
│       │   │   │   ├── CheckoutSummary.jsx
│       │   │   │   ├── PaymentButton.jsx
│       │   │   │   └── PaymentResult.jsx
│       │   │   ├── config/
│       │   │   │   └── razorpay.config.js
│       │   │   ├── hooks/
│       │   │   │   └── useRazorpayCheckout.js
│       │   │   └── utils/
│       │   │       └── checkoutFormValidation.js
│       │   ├── contact/
│       │   │   ├── components/
│       │   │   │   ├── ContactInfoCard.jsx
│       │   │   │   ├── ContactInfoGrid.jsx
│       │   │   │   └── SocialLinkGrid.jsx
│       │   │   ├── data/
│       │   │   │   └── contact.data.js
│       │   │   ├── motion/
│       │   │   │   └── contact.motion.js
│       │   │   └── pages/
│       │   │       └── ContactPage.jsx
│       │   ├── enquiries/
│       │   │   ├── api/
│       │   │   │   └── enquiries.api.js
│       │   │   ├── components/
│       │   │   │   ├── EnquiryForm.jsx
│       │   │   │   ├── EnquiryFormFields.jsx
│       │   │   │   └── EnquirySuccessState.jsx
│       │   │   ├── config/
│       │   │   │   └── enquiryForm.config.js
│       │   │   ├── hooks/
│       │   │   │   └── useEnquiryForm.js
│       │   │   └── utils/
│       │   │       └── enquiryFormValidation.js
│       │   ├── home/
│       │   │   ├── components/
│       │   │   │   ├── AboutTeaser.jsx
│       │   │   │   ├── ExpertiseCard.jsx
│       │   │   │   ├── ExpertiseGrid.jsx
│       │   │   │   ├── FaqAccordion.jsx
│       │   │   │   ├── FaqAccordionItem.jsx
│       │   │   │   ├── HeroSlider.jsx
│       │   │   │   ├── HomeProjectsStrip.jsx
│       │   │   │   ├── ProcessSection.jsx
│       │   │   │   ├── ProcessStep.jsx
│       │   │   │   ├── ServiceTeaser.jsx
│       │   │   │   ├── StatBlock.jsx
│       │   │   │   ├── TestimonialsCarousel.jsx
│       │   │   │   ├── TestimonialCard.jsx
│       │   │   │   └── TrustStrip.jsx
│       │   │   ├── data/
│       │   │   │   ├── homeAbout.data.js
│       │   │   │   ├── homeFaq.data.js
│       │   │   │   ├── homeHero.data.js
│       │   │   │   ├── homeProcess.data.js
│       │   │   │   ├── homeServices.data.js
│       │   │   │   └── homeTestimonials.data.js
│       │   │   ├── hooks/
│       │   │   │   └── useHeroSlider.js
│       │   │   ├── motion/
│       │   │   │   └── home.motion.js
│       │   │   └── pages/
│       │   │       └── HomePage.jsx
│       │   ├── not-found/
│       │   │   └── pages/
│       │   │       └── NotFoundPage.jsx
│       │   ├── projects/
│       │   │   ├── api/
│       │   │   │   └── projects.api.js
│       │   │   ├── components/
│       │   │   │   ├── ProjectCard.jsx
│       │   │   │   ├── ProjectDetailGallery.jsx
│       │   │   │   ├── ProjectDetailMeta.jsx
│       │   │   │   ├── ProjectDetailsDisclosure.jsx
│       │   │   │   ├── ProjectListing.jsx
│       │   │   │   ├── ProjectListingRow.jsx
│       │   │   │   ├── ProjectPurchaseCta.jsx
│       │   │   │   └── RelatedProjects.jsx
│       │   │   ├── hooks/
│       │   │   │   ├── useProjectDetails.js
│       │   │   │   └── useProjects.js
│       │   │   ├── motion/
│       │   │   │   └── projects.motion.js
│       │   │   ├── pages/
│       │   │   │   ├── ProjectDetailPage.jsx
│       │   │   │   └── ProjectsPage.jsx
│       │   │   └── utils/
│       │   │       └── projectPresentation.js
│       │   ├── retail/
│       │   │   ├── api/
│       │   │   │   └── retail.api.js
│       │   │   ├── components/
│       │   │   │   ├── AddToCartButton.jsx
│       │   │   │   ├── CategoryTabBar.jsx
│       │   │   │   ├── RelatedRetail.jsx
│       │   │   │   ├── RetailDetailGallery.jsx
│       │   │   │   ├── RetailDetailInfo.jsx
│       │   │   │   ├── RetailListing.jsx
│       │   │   │   └── RetailProductCard.jsx
│       │   │   ├── hooks/
│       │   │   │   ├── useRetailDetails.js
│       │   │   │   └── useRetailProducts.js
│       │   │   ├── motion/
│       │   │   │   └── retail.motion.js
│       │   │   ├── pages/
│       │   │   │   ├── RetailDetailPage.jsx
│       │   │   │   └── RetailPage.jsx
│       │   │   └── utils/
│       │   │       └── retailPresentation.js
│       │   └── services/
│       │       ├── components/
│       │       │   ├── ServiceCard.jsx
│       │       │   └── ServicesGrid.jsx
│       │       ├── data/
│       │       │   └── services.data.js
│       │       ├── motion/
│       │       │   └── services.motion.js
│       │       └── pages/
│       │           └── ServicesPage.jsx
│       ├── shared/
│       │   ├── api/
│       │   │   ├── axiosClient.js
│       │   │   └── apiError.js
│       │   ├── components/
│       │   │   ├── feedback/
│       │   │   │   ├── EmptyState.jsx
│       │   │   │   ├── ErrorState.jsx
│       │   │   │   ├── LoadingSpinner.jsx
│       │   │   │   ├── Skeleton.jsx
│       │   │   │   └── Toast.jsx
│       │   │   ├── forms/
│       │   │   │   ├── FormError.jsx
│       │   │   │   ├── FormLabel.jsx
│       │   │   │   ├── Select.jsx
│       │   │   │   ├── TextArea.jsx
│       │   │   │   └── TextInput.jsx
│       │   │   ├── layout/
│       │   │   │   ├── Footer.jsx
│       │   │   │   ├── Header.jsx
│       │   │   │   ├── MainLayout.jsx
│       │   │   │   ├── MobileDrawer.jsx
│       │   │   │   └── Navbar.jsx
│       │   │   └── ui/
│       │   │       ├── Badge.jsx
│       │   │       ├── Button.jsx
│       │   │       ├── IconButton.jsx
│       │   │       ├── Modal.jsx
│       │   │       └── SectionHeading.jsx
│       │   ├── constants/
│       │   │   ├── breakpoints.js
│       │   │   ├── colors.js
│       │   │   ├── layout.js
│       │   │   ├── motion.js
│       │   │   ├── spacing.js
│       │   │   ├── typography.js
│       │   │   └── zIndex.js
│       │   ├── data/
│       │   │   ├── footer.data.js
│       │   │   ├── navigation.data.js
│       │   │   └── site.data.js
│       │   ├── hooks/
│       │   │   ├── useBodyScrollLock.js
│       │   │   ├── useMediaQuery.js
│       │   │   ├── usePrefersReducedMotion.js
│       │   │   └── useScrollDirection.js
│       │   ├── motion/
│       │   │   ├── fade.motion.js
│       │   │   ├── drawer.motion.js
│       │   │   └── stagger.motion.js
│       │   ├── seo/
│       │   │   ├── BreadcrumbSchema.jsx
│       │   │   ├── OrganizationSchema.jsx
│       │   │   ├── ProductSchema.jsx
│       │   │   ├── ProjectSchema.jsx
│       │   │   ├── Seo.jsx
│       │   │   └── seoConfig.js
│       │   └── utils/
│       │       ├── buildCloudinaryUrl.js
│       │       ├── formatCurrency.js
│       │       ├── formatDate.js
│       │       ├── getImageAlt.js
│       │       └── getRouteMeta.js
│       └── styles/
│           ├── global.css
│           ├── tailwind.css
│           └── utilities.css
├── backend/
│   ├── .env.example
│   ├── .gitignore
│   ├── package.json
│   ├── package-lock.json
│   ├── server.js
│   ├── config/
│   │   ├── cloudinary.js
│   │   ├── cors.js
│   │   ├── db.js
│   │   ├── env.js
│   │   └── razorpay.js
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   ├── checkout.controller.js
│   │   ├── enquiries.controller.js
│   │   ├── orders.controller.js
│   │   ├── projects.controller.js
│   │   ├── retail.controller.js
│   │   ├── sitemap.controller.js
│   │   └── uploads.controller.js
│   ├── middlewares/
│   │   ├── error.middleware.js
│   │   ├── handleValidationErrors.middleware.js
│   │   ├── notFound.middleware.js
│   │   ├── protect.middleware.js
│   │   ├── rateLimit.middleware.js
│   │   └── upload.middleware.js
│   ├── models/
│   │   ├── admin.model.js
│   │   ├── enquiry.model.js
│   │   ├── order.model.js
│   │   ├── project.model.js
│   │   └── retail.model.js
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── checkout.routes.js
│   │   ├── enquiries.routes.js
│   │   ├── orders.routes.js
│   │   ├── projects.routes.js
│   │   ├── retail.routes.js
│   │   ├── sitemap.routes.js
│   │   └── uploads.routes.js
│   ├── services/
│   │   ├── auth.service.js
│   │   ├── checkout.service.js
│   │   ├── cloudinary.service.js
│   │   ├── email.service.js
│   │   ├── enquiries.service.js
│   │   ├── orders.service.js
│   │   ├── projects.service.js
│   │   ├── razorpay.service.js
│   │   ├── retail.service.js
│   │   ├── sitemap.service.js
│   │   └── uploads.service.js
│   ├── utils/
│   │   ├── ApiError.js
│   │   ├── asyncHandler.js
│   │   ├── buildCloudinaryPublicId.js
│   │   ├── buildPagination.js
│   │   ├── buildSlug.js
│   │   ├── cookieOptions.js
│   │   ├── logger.js
│   │   ├── sanitizeObject.js
│   │   └── sendResponse.js
│   ├── validators/
│   │   ├── auth.validator.js
│   │   ├── checkout.validator.js
│   │   ├── common.validator.js
│   │   ├── enquiries.validator.js
│   │   ├── orders.validator.js
│   │   ├── projects.validator.js
│   │   ├── retail.validator.js
│   │   └── uploads.validator.js
│   ├── constants/
│   │   ├── enquiryStatus.js
│   │   ├── orderStatus.js
│   │   ├── paymentStatus.js
│   │   ├── projectCategories.js
│   │   ├── retailCategories.js
│   │   ├── validationLimits.js
│   │   └── userRoles.js
│   ├── scripts/
│   │   ├── createAdmin.js
│   │   ├── migrateIndexes.js
│   │   └── verifyDatabase.js
│   ├── tests/
│   │   ├── integration/
│   │   │   ├── auth.integration.test.js
│   │   │   ├── checkout.integration.test.js
│   │   │   ├── enquiries.integration.test.js
│   │   │   ├── projects.integration.test.js
│   │   │   └── retail.integration.test.js
│   │   └── unit/
│   │       ├── buildSlug.test.js
│   │       ├── checkout.service.test.js
│   │       └── razorpay.service.test.js
│   └── public/
│       └── .gitkeep
├── database/
│   ├── README.md
│   ├── indexes/
│   │   ├── admin.indexes.js
│   │   ├── enquiries.indexes.js
│   │   ├── orders.indexes.js
│   │   ├── projects.indexes.js
│   │   └── retail.indexes.js
│   ├── seeds/
│   │   ├── admins.seed.js
│   │   ├── projects.seed.js
│   │   ├── retail.seed.js
│   │   └── seedDatabase.js
│   └── migrations/
│       └── README.md
├── docs/
│   ├── AI-RULES.md
│   ├── API.md
│   ├── CODING-RULES.md
│   ├── DATABASE.md
│   ├── DEPLOYMENT.md
│   ├── PRD.md
│   ├── QA-CHECKLIST.md
│   ├── SECURITY.md
│   ├── TRD.md
│   ├── UI-UX.md
│   ├── architecture/
│   │   ├── data-flow.md
│   │   ├── deployment-flow.md
│   │   └── request-lifecycle.md
│   └── api/
│       ├── openapi.yaml
│       └── postman-collection.json
├── scripts/
│   ├── build-production.js
│   ├── copy-frontend-build.js
│   └── verify-environment.js
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── security-audit.yml
└── vercel.json
```

## Responsibilities by major area

| Area | Owns | Must not own |
|---|---|---|
| `frontend/src/features/` | Feature UI, feature API wrappers, local states, static feature content | Direct Axios/fetch calls from JSX, database access, secrets |
| `frontend/src/shared/` | Pieces truly used by 2+ features: primitives, layouts, SEO, constants | Feature-only components or data |
| `backend/routes/` | HTTP method, path, middleware order | Business logic or Mongoose queries |
| `backend/controllers/` | Request parsing, service calls, HTTP response envelope | Direct model queries or external SDK logic |
| `backend/services/` | Business rules, Mongoose use, payment/media/email orchestration | HTTP response formatting |
| `backend/models/` | Five Mongoose schemas and defensive schema validation | Client-facing formatting |
| `backend/validators/` | `express-validator` chains for every mutation | Persistence or business decisions |
| `database/` | Index/seeding/migration reference materials | A second live database connection layer |

## Backend route-to-file map

| Endpoint | Route file | Controller | Service | Validator/middleware |
|---|---|---|---|---|
| `POST /api/auth/login` | `auth.routes.js` | `auth.controller.js` | `auth.service.js` | login limiter + `auth.validator.js` |
| `GET /api/auth/me` | `auth.routes.js` | `auth.controller.js` | `auth.service.js` | `protect.middleware.js` |
| `POST /api/auth/logout` | `auth.routes.js` | `auth.controller.js` | `auth.service.js` | `protect.middleware.js` |
| `GET /api/projects`, `GET /api/projects/:slug` | `projects.routes.js` | `projects.controller.js` | `projects.service.js` | public query validation |
| `GET/POST/PUT/DELETE /api/admin/projects...` | `projects.routes.js` | `projects.controller.js` | `projects.service.js` | protect + upload + `projects.validator.js` |
| `GET /api/retail`, `GET /api/retail/:slug` | `retail.routes.js` | `retail.controller.js` | `retail.service.js` | public query validation |
| `GET/POST/PUT/DELETE /api/admin/retail...` | `retail.routes.js` | `retail.controller.js` | `retail.service.js` | protect + upload + `retail.validator.js` |
| `POST /api/enquiries` | `enquiries.routes.js` | `enquiries.controller.js` | `enquiries.service.js` + `email.service.js` | enquiry limiter + validator |
| `GET/PATCH/DELETE /api/admin/enquiries...` | `enquiries.routes.js` | `enquiries.controller.js` | `enquiries.service.js` | protect + validator |
| `POST /api/checkout`, `/api/checkout/verify` | `checkout.routes.js` | `checkout.controller.js` | `checkout.service.js` + `razorpay.service.js` | checkout limiter + validator |
| `GET/PATCH /api/admin/orders...` | `orders.routes.js` | `orders.controller.js` | `orders.service.js` | protect + order-status validator |
| Admin media upload support | `uploads.routes.js` | `uploads.controller.js` | `uploads.service.js` + `cloudinary.service.js` | protect + Multer + upload validator |

`paymentStatus` never has an admin update endpoint; it changes only after server-side Razorpay signature verification.

`frontend/public/sitemap.xml` is a local development placeholder only. In production, `sitemap.routes.js` / `sitemap.controller.js` / `sitemap.service.js` generate the XML from currently published Projects and Retail entries so unpublished or deleted content is never indexed.

## Database map

| Collection / model file | Primary fields and important rules | Index source |
|---|---|---|
| `admin.model.js` | name, email, password (`select: false`), role, status, lastLoginAt | `database/indexes/admin.indexes.js` — unique email |
| `project.model.js` | title, generated slug, category, location, year, description, images, details, purchasable, price, published | `projects.indexes.js` — unique slug; `{ published, category }` |
| `retail.model.js` | title, generated slug, category, description, images, price, availability, published | `retail.indexes.js` — unique slug; `{ published, availability }` |
| `enquiry.model.js` | name, email, phone as String, projectType, message, source, status | `enquiries.indexes.js` — `{ status, createdAt: -1 }` |
| `order.model.js` | order identifier, customer snapshot, embedded item snapshots, amount, Razorpay IDs, paymentStatus, orderStatus | `orders.indexes.js` — status compound index and payment identifiers |

## Environment files

`frontend/.env.example`

```dotenv
VITE_API_BASE_URL=/api
VITE_RAZORPAY_KEY_ID=
```

`backend/.env.example`

```dotenv
NODE_ENV=development
PORT=5000
MONGODB_URI=
JWT_SECRET=
JWT_EXPIRES_IN=
COOKIE_SECURE=false
COOKIE_SAME_SITE=lax
CORS_ORIGIN=http://localhost:5173
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
EMAILJS_SERVICE_ID=
EMAILJS_TEMPLATE_ID=
EMAILJS_PUBLIC_KEY=
EMAILJS_PRIVATE_KEY=
```

Never commit a real `.env`, credential, payment secret, token, Atlas URI, or Cloudinary secret. Any `VITE_*` value is client-visible.

## Production build path

```text
frontend source → vite build → frontend/dist → copy-frontend-build.js
→ backend/public (generated) → backend/server.js
→ Express serves /api/* first, static build second, SPA fallback last
```

The root `scripts/build-production.js` orchestrates the frontend build and copying. `vercel.json` is solely for frontend preview deployment; Hostinger runs `backend/server.js` for production.

## Deliberately absent (not create these folders/files)

- `frontend/src/features/customer-auth/`, `login/`, `register/`, `accounts/`, `profiles/`, `wishlist/`, `reviews/`, `booking/`, `analytics/`
- Visitor account models, auth routes, customer sessions, saved orders, or order history APIs
- Redux/Zustand/React Query state folders, TypeScript configuration, UI-library folders, GraphQL, Redis, queues, WebSockets
- Any public enquiries or orders endpoint
- An admin endpoint that writes `paymentStatus`
- Local persistent user-media storage under `public/` or `uploads/`; Cloudinary is the media store

## Implementation order

1. Root configuration, frontend/backend packages, environment templates, and design tokens.
2. Backend config, five models, validators, route/controller/service layers, auth, and security middleware.
3. Shared frontend shell, providers, API client, layouts, UI primitives, and SEO.
4. Public static-content features, then Projects/Retail API-powered views.
5. Cart, checkout, Razorpay verification, and enquiry/EmailJS flow.
6. Lazy-loaded protected admin feature modules and CRUD pages.
7. Tests, CI, deployment scripts, QA/security/production verification.
