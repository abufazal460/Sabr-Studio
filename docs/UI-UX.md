# Sabr Studio — UI/UX System Documentation

Version 1.0 · Frontend design reference · Source of truth: Figma PNG exports, PRD.md, TRD.md, and client instructions.

---

## 01. Document Overview

**Project:** Sabr Studio — interior design studio website (MERN stack; this document covers the **frontend UI/UX only**).

**Purpose:** Single source of truth for every visual and interaction rule needed to implement the site pixel-accurately and consistently, and to keep future components (including ones built by the admin panel's dynamic data) inside the same system.

**Scope:** Public website — Home, About, Services, Projects, Retail (Shop), Contact — plus the shared Navbar, Footer, Cart drawer, and Inquiry form component. Admin panel UI is out of scope for this document.

```
PRD   = what the product must do
TRD   = how it is technically built (MERN, Razorpay, Cloudinary, EmailJS)
UI-UX = what the user sees, touches and feels
```

**Technology constraint:** All styling is implemented in **Tailwind CSS**. No inline arbitrary CSS files. One reusable `<Button />` component already exists and must be reused everywhere — no new buttons are created anywhere in the app.

**Key resolved ambiguities (read once, then treated as fact everywhere below):**
- The client's "wishlist" is functionally a **cart** (quantity, subtotal, remove, Buy Now → Razorpay). It is documented and built as a **Cart**, not a separate save-for-later wishlist. The PRD's "Wishlist — out of scope" note refers to a *different*, save-for-later feature, which is **not** built.
- The Figma "Contact Us" navbar button is replaced everywhere with a **Login** button (per client note), since visitor accounts are used only for checkout/order context.
- The Figma about-page red "DSA" badge becomes a bordered, white/transparent badge reading **"sabr"**, followed by the line `Sabr Studio · New Delhi · Interior Design`.
- The Home → Process section's 6th "Lighting Design" slot is replaced with **"Material & Colour Consultation"** (one of the six real services) so the six process cards map onto real service language instead of a service Sabr doesn't offer.
- Retail category tabs shown in Figma ("Bed, Sofa, Chair, Light") are placeholders; real category values come from the admin panel per product.

---

## 02. Design Principles

1. **Minimal, editorial, architectural** — the site should read like a design portfolio, not a SaaS product.
2. **Black + white first** — colour is used only where the brand or a real-world icon demands it (WhatsApp green, Instagram pink, etc.) or as the single brown accent on the About page.
3. **Typography does the talking** — large serif display type carries emotion; Inter carries information.
4. **Generous whitespace over decoration** — no gradients, no drop-shadows for their own sake, no rounded-corner excess.
5. **One button, one card language, everywhere** — visual patterns (button, card border, hover shadow) repeat identically across Home, Projects, Retail and Services so the whole site feels like one system.
6. **Content-first, image-honest** — images are never stretched, never cropped incorrectly; `object-fit: cover` with a fixed aspect box is used everywhere a photo appears in a grid.
7. **Performance-conscious motion** — animation uses only `transform`/`opacity`, is short (200–500ms), and respects `prefers-reduced-motion`.

---

## 03. Design References & 04. Figma/PNG Structure

| Filename | Section | Type | Pages using it |
|---|---|---|---|
| `navbar/navbar.png` | Global header | Global component | All pages |
| `footer/footer.png` | Global footer | Global component (palette/layout only — content replaced) | All pages |
| `home/about.png` | Home → Hero-adjacent About teaser, Stats, Expertise/service teaser, trust strip | Home sections | Home |
| `home/service.png` | Home → "Our Services" 3-column teaser | Home section | Home |
| `home/project.png` | Home → Projects strip (4-image grid) | Home section | Home |
| `home/process.png` | Home → "How We Work" 6-step process | Home section | Home |
| `home/testimonials.png` | Home → Testimonials carousel | Home section | Home |
| `home/faq.png` | Home → FAQ accordion | Home section | Home |
| `about/about.png` | About page (hero heading, About Us, Founder) | Page | About |
| `contact/contact.png` | Contact page (info cards + social) | Page | Contact |
| `projects/projects.png` | Projects listing | Page | Projects |
| `retail/figma 1.png` | Retail/Shop listing | Page | Retail |
| `service/service.png` | Services grid layout (card shape only — content replaced) | Page | Services |
| `inquery form/inquery form.png` | Reusable enquiry form | Shared component | Home, Contact, Services |
| *(no PNG supplied)* | Home Hero (2-image crossfade slider) | Home section | Home — built from written spec only |

---

## 05. Brand Identity

- **Wordmark:** "Sabr Studio", set in Abhaya Libre 500, normal case (replaces the Figma placeholder "InDisign").
- **Logo lockup:** wordmark only (no icon mark supplied). Minimum clear space = the cap-height of the "S" on all sides.
- **Light background usage:** black wordmark on white navbar.
- **Dark background usage:** white wordmark on black footer.
- **Brand typography:** Abhaya Libre (display) + Inter (UI/body) — see §07.
- **Brand colors:** Black, White, one Brown accent (About page only). See §06.

---

## 06. Color System

Tailwind config exposes these as CSS variables / theme colors. The palette is intentionally tiny.

| Token | Variable | Hex | Usage |
|---|---|---|---|
| `color-black` | `--color-black` | `#000000` | Primary buttons, borders, footer bg, icons on light bg |
| `color-ink` | `--color-ink` | `#111111` | Default body/heading text on white (not pure `#000` — matches client's "soft black" note) |
| `color-white` | `--color-white` | `#FFFFFF` | Page background, text on black surfaces |
| `color-muted` | `--color-muted` | `#666666` | Secondary text, metadata, card descriptions |
| `color-border` | `--color-border` | `#E4E4E4` | 1px card/section borders, dividers |
| `color-surface` | `--color-surface` | `#FAFAFA` | Subtle section backgrounds (Services cards) |
| `color-cream` | `--color-cream` | `#F7F3EC` | Retail product image tile background only |
| `color-brown` | `--color-brown` | `#8B4A2E` | About page accent heading + accent paragraph text only |
| `color-footer-bg` | `--color-footer-bg` | `#0D0D0D` | Footer background |
| `color-footer-text` | `--color-footer-text` | `#F5F5F5` | Footer body text |
| `color-footer-muted` | `--color-footer-muted` | `#9A9A9A` | Footer secondary text/links |

**Interactive/system colors** (used only where noted):

| State | Hex | Usage |
|---|---|---|
| Hover surface | `#000000` @ 4% overlay | Card hover tint |
| Focus ring | `#111111`, 2px, 2px offset | All focusable elements |
| Error | `#B3261E` | Form validation |
| Success | `#1E7B45` | Form submitted state |
| WhatsApp | `#25D366` | Social icon hover only |
| Facebook | `#1877F2` | Social icon hover only |
| Instagram | `#E1306C` | Social icon hover only |
| X / Twitter | `#334155` (slate-700) | Social icon hover only |
| YouTube | `#FF0000` | Social icon hover only |

No other colors are introduced anywhere in the product.

---

## 07. Typography System

*(This section is the client's supplied typography spec, incorporated verbatim as the binding system — see original brief for full rationale.)*

**Two families only:**
- **Heading / editorial:** `"Abhaya Libre", serif` — weights 400 (italic accent only), 500.
- **Body / UI:** `"Inter", sans-serif` — weights 400, 500, 600.
No third family, no weights outside {400, 500, 600}, no 700+.

| Role | Font | Weight/Style | Size | Line-height | Letter-spacing | Transform |
|---|---|---|---|---|---|---|
| H1 | Abhaya Libre | 500 | `clamp(3.5rem, 7vw, 8rem)` | 0.95 | -0.02em | none |
| H2 | Abhaya Libre | 500 | `clamp(2.5rem, 5vw, 5rem)` | 1 | -0.02em | none |
| H3 | Abhaya Libre | 500 | `clamp(2rem, 3vw, 3rem)` | 1.05 | -0.02em | none |
| H4–H6 | Inter | 500/600 | semantic step-down | 1.2–1.3 | 0 | none |
| Body | Inter | 400 | 1rem | 1.6 | -0.01em | none |
| Editorial italic accent | Abhaya Libre | 400 italic | inherits parent heading size | inherits | inherits | none |
| Navigation | Inter | 500 | 0.875rem | 1.2 | 0 | none |
| Button label | Inter | 500 (600 for high-emphasis CTA) | 0.875rem | 1 | 0 | none |
| Card title | Inter | 600 | ~1rem | 1.3 | 0 | none |
| Card meta | Inter | 400 | ~0.75rem | 1.4 | 0 | none |
| Label (eyebrow) | Inter | 500 | 0.75rem | 1 | 0.1em | uppercase |
| Badge | Inter | 500 | 0.75rem | 1 | 0.1em | uppercase |
| Footer body | Inter | 400 | 0.875rem | 1.5 | 0 | none |
| Footer label | Inter | 500 | 0.75rem | 1 | 0.1em | uppercase |
| Form label | Inter | 500 | 0.875rem | 1.3 | 0 | none |
| Form input | Inter | 400 | 0.9375rem | 1.4 | 0 | none |

**Component typography role table** (use when building anything new): Main display → Abhaya Libre 500 · Section heading → Abhaya Libre 500 · Supporting editorial heading → Abhaya Libre 500 · Editorial accent → Abhaya Libre 400 italic · Body → Inter 400 · Navigation → Inter 500 · Button → Inter 500 (600 if high-emphasis) · Card title → Inter 600 · Card meta → Inter 400 · Label/Badge → Inter 500 uppercase · Footer → Inter 400 · Footer label/Form label → Inter 500.

**Fonts loaded:** Abhaya Libre 400, 500, 400-italic · Inter 400, 500, 600. Nothing else.

**Paragraph width:** long-form body text is capped at `max-width: 42rem` (680px) wherever it appears (About body copy, service descriptions).

---

## 08. Spacing System

8px base unit, expressed as Tailwind spacing scale.

| Token | Value | Usage |
|---|---|---|
| `space-1` | 4px | icon-to-label gaps |
| `space-2` | 8px | tight inline gaps |
| `space-3` | 12px | form field internal padding (vertical) |
| `space-4` | 16px | card internal padding (mobile), button vertical padding |
| `space-6` | 24px | card gap in grids, card padding (desktop) |
| `space-8` | 32px | heading → paragraph spacing |
| `space-12` | 48px | paragraph → CTA spacing, component-to-component |
| `space-16` | 64px | mobile section top/bottom padding |
| `space-24` | 96px | tablet section top/bottom padding |
| `space-32` | 128px | desktop section top/bottom padding |

Explicit distinctions: **margin** is never used between siblings inside a flex/grid (use `gap`); **padding** is reserved for a component's own internal breathing room; **section spacing** (`space-16/24/32`) is only applied as top/bottom padding on the outermost `<section>`.

---

## 09. Layout System, 10. Container System & 11. Grid System

**Containers:**

| Breakpoint | Max-width | Horizontal padding |
|---|---|---|
| Mobile (< 640px) | 100% | 20px |
| Tablet (640–1024px) | 100% | 32px |
| Desktop (1024–1440px) | 1280px, centered | 40px |
| Large desktop (≥ 1440px) | 1400px, centered | 48px |

Full-bleed sections (Hero slider, Testimonials dark band, Footer, Process background) ignore the container max-width but keep their *inner content* inside the standard container padding.

**Grids used across the site:**
- Home "About" trust boxes: 4 columns desktop → 2 columns tablet → 1 column mobile, 0 gap (shared borders), full-bleed row.
- Home "Expertise" 4-card grid: 2×2 desktop/tablet → 1 column mobile, `gap: 24px`.
- Home Services teaser: 3 columns desktop → 2 tablet → 1 mobile, `gap: 32px`.
- Home Projects strip: 4 columns desktop → 2 tablet → 1 mobile, `gap: 0` (edge-to-edge photo strip).
- Home Process: 2 columns (left/right) desktop with center image column → 1 column mobile (image first, then steps 1–6 stacked), `gap: 24px`.
- Projects listing: 1 column, alternating image/content row, full width, `gap: 32px` between rows.
- Retail grid: 3 columns desktop → 2 tablet → 1 mobile, `gap: 24px/32px`.
- Services grid: 3 columns desktop → 2 tablet → 1 mobile, `gap: 24px`.
- Contact info cards: 3 columns desktop → 1 mobile, `gap: 24px`. Social cards: 3 columns desktop → 1 mobile, `gap: 16px`.
- Footer: 3 columns desktop (brand / links / contact) → 1 column mobile, `gap: 48px`.

---

## 12. Typography breakpoints — see §07 (fluid `clamp()` covers this; no discrete per-breakpoint override needed).

## 13. (merged into §08)

## 14–17. (merged into §09–11 above; Image system below)

### Image System

- All photographic images use a fixed aspect-ratio box (`aspect-[4/5]` for portrait cards, `aspect-video` for wide/hero, `aspect-square` for retail tiles) + `object-cover object-center`. Never `object-fill`.
- Retail product tiles: `aspect-square`, background `color-cream`, image padded 8% inside the tile so products don't touch the edge.
- Hero images: full viewport height/width, `object-cover`, no crop distortion, swapped via opacity cross-fade only (never a hard cut, never a slide/translate — see §29).
- All images: explicit `width`/`height` attributes or aspect-ratio CSS to prevent layout shift; lazy-loaded below the fold (`loading="lazy"`), Hero images `loading="eager"`.

---

## 18. Border System & 19. Border Radius System

- **Standard border:** `1px solid var(--color-border)` — used on: Service cards, Process pills (implicit via bg), Contact info cards, Projects listing rows, Retail product cards, Form inputs.
- **Emphasis border:** `1px solid #000000` — Projects "Take a tour" outline button, About "sabr" badge.
- **Hover border:** unchanged color, paired with shadow (see §20) rather than a border-color change, to keep the minimal language.
- **Focus border:** replaced by a focus *ring* (see §54), border itself unchanged.
- **Radius:** the design is editorial/minimal — **no radius above 8px anywhere**.
  - `radius-none` (0): section blocks, hero, photo strips, process pill *rectangle portion*.
  - `radius-sm` (4px): form inputs, buttons (matches existing shared Button component).
  - `radius-md` (8px): cards (Service, Retail, Contact info, Testimonial).
  - `radius-full`: Process step number circles, social icon tiles, avatar images in testimonials.

---

## 20. Shadow System

Only two shadows exist in the whole system — elevation is not a primary design tool here.

| Token | Value | Usage |
|---|---|---|
| `shadow-hover` | `0 8px 24px rgba(0,0,0,0.12)` | Contact info-card hover, Retail/Service card hover, Projects row image hover |
| `shadow-none` | none | Default state of every card |

No shadow is used on the navbar (it uses a bottom border instead) or on static, non-interactive surfaces.

---

## 21. Icon System

- Library: **lucide-react** (matches the thin-stroke outline style seen in `home/service.png` and `service/service.png`).
- Size: 24px default (nav/UI), 20px inline-with-text, 32px inside Service/Process cards.
- Stroke width: 1.5px.
- Color: inherits `currentColor` — black on white surfaces, white on black surfaces; brand color only on social icon hover (§06).
- Spacing: 8px gap between icon and adjacent label.
- Cart, hamburger, and login icons in the navbar are 22px, stroke 1.75px for slightly stronger presence at small size.
- All icon-only buttons carry an `aria-label`.

---

## 22. Image System — see §14–17 above (merged).

---

## 23. Button System

The project has **one existing reusable `<Button />` component**. This document does not redefine its code — every button anywhere in the product (navbar Login, Buy Now, Submit Inquiry, Read More, Take a Tour, View All Projects, Load More, hero CTA, FAQ toggle is *not* a button but an accordion trigger) uses this same component with only the `label` (and `variant`/`icon` props it already exposes) changed. No second button implementation is created.

Documented **usage mapping** (which existing variant to pass, based on the Figma intent):

| Context | Visual intent from Figma | Variant to use |
|---|---|---|
| Navbar "Login" | filled black pill | Primary |
| Hero CTA | filled black on image | Primary |
| Home "Read more" (About teaser, expertise cards) | filled black, small | Primary / Small |
| Projects "Take a tour" | outline, black border, transparent bg | Secondary/Outline |
| Retail "Buy Now" | filled black | Primary |
| Retail "View All Products" / Projects "View All Projects" | filled black, standalone | Primary |
| Retail "Load More" | outline | Secondary/Outline |
| Contact/Home/Services "Submit Inquiry" | filled black, full-width on mobile | Primary |
| Cart drawer "Place Order" | filled black, full-width | Primary |
| Cart drawer "Remove" | text/outline, small | Secondary/Text |

If the existing Button component is missing a state it needs here (loading state on "Place Order" while Razorpay opens, disabled state on Submit Inquiry while pending), that gap is flagged to engineering rather than a new button being built.

---

## 24. Link System

- **Default:** Inter 500, `color-ink`, no underline.
- **Hover:** underline appears (`text-decoration-line: underline; text-underline-offset: 4px`), 150ms ease.
- **Focus:** visible focus ring (§54), no underline change required beyond that.
- **Active:** `color-ink` unchanged (no separate active color — the design doesn't use link color shifts).
- Footer links: `color-footer-muted` default → `color-footer-text` on hover, 150ms.
- Navigation links: see §26/27.

---

## 25. Form System

Applies to the Inquiry Form (§40/§76) and any future form (e.g. checkout contact fields).

| Element | Spec |
|---|---|
| Label | Inter 500, 0.875rem, `color-ink`, 8px below to input, required fields append a red `*` |
| Text input / textarea | 1px `color-border`, radius 4px, padding `12px 16px`, Inter 400, placeholder `color-muted` |
| Select (Project Type) | same box styling as input, native `<select>` styled to match, chevron icon 16px |
| Focus | border → `#111111`, plus 2px focus ring at 20% black opacity |
| Error | border → `#B3261E`, helper text below in `#B3261E`, 0.75rem |
| Success (submitted) | field set clears, a single success message replaces the form area, `#1E7B45` |
| Disabled (while submitting) | 60% opacity, `cursor: not-allowed`, Button shows loading state |
| Field vertical gap | 20px between fields |

---

## 26–28. Navigation System, Header/Navbar, Mobile Navigation

**Desktop navbar** (from `navbar/navbar.png`, adapted):
- Height: 80px. Background: white. Bottom border: 1px `color-border` — appears only after scroll (`scrolled` state adds the border + becomes `position: sticky; top: 0`; before scroll, no border, transparent-safe since page bg is white anyway).
- Layout: `[Logo] —— [Home  About  Service  Projects  Shop  Contact] —— [Cart icon] [Login button]`
- Logo: Abhaya Libre 500, ~1.5rem.
- Nav link gap: 32px. Active route: underline (2px, `color-ink`, offset 6px) + weight stays 500 (no bold jump).
- Cart icon: 22px outline cart icon with a small filled circular badge (black bg, white text, 10px font) showing item count, positioned top-right of the icon. Hidden badge when cart is empty.
- Login button: existing Button component, Primary variant, replaces Figma's "Contact Us".
- Z-index: navbar = 50 (see §71).

**Mobile / tablet navbar (< 1024px, and any width where nav links no longer fit):**
- Shows: `[Logo] —— [Cart icon] [Hamburger icon]`. Login button moves inside the drawer.
- Hamburger → 3-line icon, 24px, transforms into an X on open (see §58 micro-interactions).
- Drawer: slides in from the **right**, full height, **black background**, white text, width 80% (max 360px).
- Drawer content, top to bottom: Close (✕) top-right → nav links (Home, About, Service, Projects, Shop, Contact) stacked, Inter 500, 1.125rem, 24px vertical gap → a `1px solid rgba(255,255,255,0.15)` divider → Login button (full width) → Cart link/button (full width, outline-white variant) below it.
- Open/close animation: drawer translates `translateX(100% → 0)` over 320ms `cubic-bezier(0.16, 1, 0.3, 1)`; a semi-transparent black overlay (`rgba(0,0,0,0.5)`) fades in behind it over the page (0 → 1 opacity, 320ms). Closing reverses both simultaneously.
- Scroll lock: `<body>` scroll is locked while the drawer is open.
- Escape key and outside-click (overlay tap) both close the drawer.
- Focus: first focusable element in the drawer (close button) receives focus on open; focus returns to the hamburger button on close.

---

## 29. Hero Section

No PNG was supplied for this section — built from the written spec:

- Full viewport `height: 100svh`, `width: 100%`. Two interior-design stock images, `object-cover`, absolutely stacked.
- Every 5 seconds, the images **cross-fade** (opacity transition, 1200ms ease-in-out) — not a slide/translate — so the change reads as a soft dissolve, not a slider.
- A black overlay sits above the images at **40% opacity** (`bg-black/40`) so text stays legible without hiding the photography.
- On top of the overlay: a short eyebrow label (uppercase, Inter 500), a large H1 (Abhaya Libre 500, italic accent word allowed per §16 typography rule), one line of supporting body copy (Inter 400, white, `max-width: 42rem`), then a primary CTA button — all center-aligned, vertically centered in the viewport.
- Minimum height on small mobile: `100svh` with `min-height: 560px` fallback so short-viewport devices (landscape phones) never crush the content.
- Reduced motion: cross-fade duration shortens to 0ms (instant swap) when `prefers-reduced-motion: reduce`.

---

## 30. Section System & 25 (dup) Section Headers

Every content section (`<section>`) follows the same shell:

```
[optional eyebrow label — uppercase, small, letter-spaced]
[H2 or H3 section heading]
[optional 1–2 line supporting copy, max-width 42rem, centered or left per section]
[section content]
```

Section vertical padding uses the §08 section tokens (64/96/128px). Section headings are left-aligned by default (matches "Our Services" heading style) except where a section is explicitly centered in Figma (Projects heading, Testimonials heading, FAQ heading — those stay centered/as shown).

---

## 31–32. Component System & Component Master Template

Reusable components identified: `Navbar`, `MobileDrawer`, `Footer`, `Button` (existing), `HeroSlider`, `SectionHeading`, `ExpertiseCard`, `ServiceCard`, `ProjectHomeThumb`, `ProcessStep`, `TestimonialCard`, `FaqAccordionItem`, `AboutFounderBlock`, `ContactInfoCard`, `SocialLinkCard`, `ProjectListingRow`, `RetailProductCard`, `CategoryTabBar`, `CartDrawer`, `CartLineItem`, `InquiryForm` (shared), `Badge`, `StatBlock`.

Each follows this template (values given per-component in their dedicated sections below where they differ from the global defaults already set in §06–§25):

```
Purpose · Structure · Desktop/Tablet/Mobile dimensions · Layout (display/direction/
align/justify/gap/padding/margin) · Typography · Colors · Border · Radius · Shadow ·
Default/Hover/Focus/Active/Selected/Disabled/Loading/Error state · Interaction
(keyboard/touch) · Animation/Transition · Responsive behavior · Accessibility ·
Performance notes · PNG reference · Code mapping
```

---

## 33. Cards (generic card contract)

All cards (`ExpertiseCard`, `ServiceCard`, `RetailProductCard`, `ContactInfoCard`, `TestimonialCard`) share:
- `radius-md` (8px), `1px solid color-border` (except `TestimonialCard`, which is borderless black), default `shadow-none`.
- Padding: 24px desktop / 20px mobile.
- Image (where present): fixed aspect box, `object-cover`, never stretched.
- Hover: `shadow-hover` + `transform: scale(1.02)`, 250ms ease-out, applied to the whole card; image inside additionally scales to `1.05` within its own overflow-hidden container (so the card doesn't grow but the photo "breathes").
- Stacking on mobile: single column, full width, 20px gap between cards.

---

## 34. Home — Expertise/Service teaser (`home/about.png` lower half + `home/service.png`)

**Stats strip** (4 numbers): full-bleed row, 1px borders between and around cells, equal-width columns collapsing to 2×2 on tablet and 1-column on mobile; each cell = big number (Abhaya Libre 500 or Inter 600 — kept as Inter 600 since these are data, not editorial) + small caption (Inter 400, `color-muted`) beneath.

**"Creating Interiors That Inspire and Delight" 2×2 card grid** (`ExpertiseCard`): image top (aspect `4/5` on the card's own crop, black gradient/overlay bottom third for legibility), white heading + 2-line description over the dark portion, "Read more" (existing Button, small).

**Trust strip** (4 items, black full-bleed bar): icon + label pairs, evenly spaced, wraps to 2×2 on mobile.

**Home "Our Services" 3-column teaser** (`home/service.png`): icon (32px, outline) → title (Inter 600, ~1.125rem) → 2-line description (Inter 400, `color-muted`). No card border here — this teaser is intentionally borderless/lighter than the dedicated Services page cards (§39). A thin horizontal rule + "Our Services" heading sits above, left-aligned, exactly as shown.

---

## 35. Home — Projects strip (`home/project.png`)

Centered "Projects" H2. Below it, an edge-to-edge 4-image row (4 → 2 → 1 responsive), each tile `aspect-[3/4]`, `object-cover`, no gap between tiles on desktop (they touch, matching the reference), 1px gap on mobile stack. Hovering a tile: a black overlay (`bg-black/50`) fades in (200ms) with a centered white label "View Project" (Inter 500, small, letter-spaced). Clicking any tile routes to `/projects`.

---

## 36. Home — Process ("How We Work") (`home/process.png`)

- Centered H2 + 1–2 line supporting copy (Inter 400, `color-muted`, centered, max-width 42rem).
- Center column: the process/floor-plan image, contained (not cropped), max-width constrained, vertically centered against the 3-row step stack on each side.
- Left column: steps 1–3 top-to-bottom. Right column: steps 4–6 top-to-bottom. Each step = black pill (radius-full on the number side, radius-none/flat on the text side — a stadium shape with a flat inner edge, per the reference) containing a white circular number badge (radius-full, black number on white or white number on black depending on side — reference shows white circle w/ black text on the connecting edge) + step title (Inter 600, white) + 2-line description (Inter 400, `color-footer-muted`, white at low opacity).
- Step 6 (client-approved substitution): title becomes **"Material & Colour Consultation"** instead of "Lighting Design"; description updated to match that service.
- Responsive: below 1024px the two side columns and center image stack vertically — image first, then all 6 steps in numeric order, each pill full-width. No stretching, no overlap, no shifting at any width from 320px to 4K (pill width is fluid `%`, never a fixed px that could overflow).

---

## 37. Home — Testimonials (`home/testimonials.png`)

- Full-bleed dark band is **not** used — cards themselves are black (matches reference: white page bg, black cards).
- Centered H2 "What Our Customers Say About Us".
- Auto-advancing horizontal carousel: **advances automatically every 5 seconds**, pauses on hover/touch, resumes after.
- Visible cards per breakpoint: **desktop 3, tablet 2, mobile 1** (explicitly overriding the 2-card look in the static PNG, per client instruction).
- Figma's left/right arrow buttons are **removed**; navigation is by **dot indicators** only, centered below the row, active dot = solid black, inactive = `color-border`.
- Card content, top to bottom: large quote-mark glyph (white, Abhaya Libre) → testimonial message (Inter 400, white, 1.5 line-height) → avatar (40px, `radius-full`) + name (Inter 600, white) — **no rating stars, no role, no location**, per client instruction (message + name + photo only).
- Card: `radius-md`, padding 32px, black bg, no border.
- Transition: `transform: translateX()` slide, 500ms ease, autoplay timer resets on manual dot interaction.

---

## 38. Home — FAQ (`home/faq.png`)

- Two-column layout: left = large heading "Do you need some help?" (Abhaya Libre 500, with the second line as the natural wrap — no italic here, matches reference) — right = accordion list, right-aligned to the container.
- Below H2/heading, small centered eyebrow "Frequently Asked Questions" **stays above both columns** as shown.
- Each `FaqAccordionItem`: question (Inter 400, ~1rem) + trailing icon, bottom 1px `color-border` divider, full-width clickable row.
- **Closed:** icon = `+` (24px, thin stroke).
- **Open:** icon rotates 45° into an `×`/`–` visual (single icon, `rotate(45deg)` transform — not a swapped `–` glyph, to keep the icon-rotate feel the client asked for) over 250ms; answer panel expands via animated `max-height`/grid-template-rows trick (not `display:none` toggling) so the **height animates smoothly and no sibling content jumps** — panel uses `transition: grid-template-rows 300ms ease` on a `grid-template-rows: 0fr → 1fr` pattern to avoid the "auto height can't transition" problem and to guarantee **zero layout shift** in the rest of the page during open/close.
- Only one item open at a time (accordion, not independent toggles) — matches the clean, premium single-focus feel requested.
- FAQ copy is **written specifically for Sabr Studio** (services/process/about-informed), not verbatim Figma placeholder text — 5 questions covering: design changes/revisions, typical project timeline, working with existing furniture, how budget is scoped, interior design vs. decorating.

---

## 39. Services (Services page) (`service/service.png` shape, client content)

- Centered H2 "Our Services" (note: on the *page* this may also appear left-aligned per §30 default — Figma shows this one centered, so centered is kept for this specific instance) + supporting copy.
- **6 cards**, 3-column desktop / 2 tablet / 1 mobile, `gap: 24px`. Card: `1px solid color-border`, bg `color-surface` or white/none per client note ("bg none ya white"), padding 32px, `radius-md`.
- Card content: icon (32px outline, mapped per service below) → title (Inter 600, uppercase per reference) → 2-line description (Inter 400, `color-muted`).
- Hover: card scales `1.02`, `shadow-hover` appears, icon scales to `1.1` — exactly the "logo bhi thoda sa scale" behavior requested.
- **Final six services (replacing the 4 placeholder boxes 1-for-1 across a 3×2 grid):**
  1. Residential Interiors
  2. Commercial Interiors
  3. Space Planning
  4. Furniture Layout
  5. 3D Visualization
  6. Material & Colour Consultation

---

## 40. Contact (`contact/contact.png`)

- Centered H2 "Keep In Touch".
- 3 `ContactInfoCard`s (Call Us / Email Us / Address): `1px solid color-border`, `radius-md`, centered content (icon 24px → uppercase label Inter 600 → value Inter 400).
- **Hover:** `shadow-hover` + `scale(1.02)`, 200ms — per client instruction ("box shadow aa jaye aur thoda sa scale ho").
- Divider rule, then centered "Follow & Reach Us On Social Media" H3.
- 5 `SocialLinkCard`s (WhatsApp, Facebook, Instagram, X, YouTube — **LinkedIn removed and replaced with WhatsApp**, per client instruction): icon tile (radius-full or radius-md matching reference) → platform name (Inter 600) → handle (Inter 400, `color-muted`) → external-link icon, right-aligned.
- **Hover:** the icon tile and platform name text switch to that platform's real brand color (WhatsApp `#25D366`, Facebook `#1877F2`, Instagram `#E1306C`, X `#334155`, YouTube `#FF0000`) — per client instruction — over 150ms, plus the same card `shadow-hover` + slight scale used on the info cards for consistency.
- Below the social grid: the shared `InquiryForm` component (§76), full page width capped at the standard container.

---

## 41. Footer (`footer/footer.png` layout, client content)

- Full-bleed, background `color-footer-bg` (#0D0D0D), 1px **white/10%** border across the very top edge (per client: "top par border hoga white color ka").
- 3-column grid desktop (Brand / Quick Links / Contact) → stacked mobile, `gap: 48px`, generous top/bottom section padding (96px desktop / 48px mobile).
- **Column 1 — Brand:** Sabr Studio wordmark (white, Abhaya Libre 500) → 2-line description (Inter 400, `color-footer-muted`) → social icon row: **WhatsApp, Instagram, Facebook, X** (LinkedIn removed per instruction), each a 40px `radius-full` dark tile, hover → brand color background.
- **Column 2 — Quick Links:** label "Quick Links" (Inter 500 uppercase) + every navbar route (Home, About, Service, Projects, Shop, Contact), Inter 400, 12px vertical gap, hover underline.
- **Column 3 — Contact:** label "Contact" + phone number, email, and (optionally) address, Inter 400, `color-footer-text`.
- Bottom bar: centered, small text, `© 2026 Sabr Studio. All rights reserved.` — separated from the columns by a `1px solid rgba(255,255,255,0.1)` divider, 24px padding above/below.

---

## 42–48. Modals / Dropdowns / Tooltips / Accordions / Tabs / Pagination / Toast

- **Modal:** only used for the future Cart's "confirm remove" (optional) and any payment-status confirmation. Overlay `bg-black/50`, panel `radius-md`, `max-width: 480px`, centered, `shadow-hover`, scale+fade-in entrance (200ms), scroll-locked background, Escape/outside-click closes, focus-trapped.
- **Dropdown:** used for the Inquiry form's "Project Type" `<select>` only — native element styled to match inputs (§25); no custom-built dropdown menu elsewhere in the current scope.
- **Tooltips:** not used anywhere in this design (icon buttons rely on visible labels or `aria-label` instead — avoids adding a UI pattern the screenshots don't contain, per §04's "do not add unsupported UI" rule).
- **Accordion:** FAQ (§38) is the only accordion; its spec is the accordion spec.
- **Tabs:** Retail category bar (§45) is the only tab-like control; documented there.
- **Pagination:** not used — Projects and Retail use "View All / Load More" expansion instead (see §65, §39/45 in Page-by-Page spec below), matching the Figma CTA buttons rather than numbered pages.
- **Toast:** a single lightweight success toast is used for "Item added to cart" (bottom-right, black bg, white text, auto-dismiss 3s, slide-up + fade entrance) and for Inquiry form success (§25 inline success state is primary; toast is a supplementary confirmation only if the TRD's future notification layer requires it).

---

## 49. Loading, 50. Error, 51. Empty States

- **Page loading:** skeleton blocks (`bg-color-surface`, subtle pulse animation, `animation: pulse 1.5s ease-in-out infinite`) matching each card's exact dimensions — used for Retail/Projects grids while fetching from the API.
- **Button loading:** existing Button component's loading state (spinner replaces label) is used on Submit Inquiry and Place Order.
- **Error state:** inline message, `#B3261E` text, small icon, with a "Retry" (Secondary button) for failed data fetches (Retail/Projects grids); form field errors per §25.
- **Empty state:** centered icon + 1-line heading + 1-line description (e.g. "No products in this category yet.", "Your cart is empty.") — no CTA unless it's the cart (→ CTA "Continue Shopping").

---

## 52–56. Interaction States (Hover / Focus / Active / Disabled / Selected)

Every interactive element defines all applicable states; the concrete values live in each component's own section above. General rules:
- **Hover** never gates critical functionality — every hover effect (card lift, social color, link underline) is purely decorative feedback; the tap target itself works identically on touch with no hover step required.
- **Focus** — every focusable element gets a visible ring: `outline: 2px solid #111111; outline-offset: 2px` (or Tailwind's `ring-2 ring-offset-2 ring-black`). Never removed without a replacement.
- **Active (pressed):** buttons darken 10% and scale to `0.98` momentarily; active nav route uses the underline treatment (§27).
- **Disabled:** 50–60% opacity, `cursor: not-allowed`, no hover/active transitions fire.
- **Selected:** Retail category tab (§45) — selected tab = white bg / black text; unselected = transparent / white text on the black bar, hover on unselected = white bg / black text preview (per client instruction, "jis jis par hover kare wo ho").

---

## 57–59. Animation & Transition System

- Preferred properties: `transform`, `opacity` only (no animating `width`/`height`/`top`/`left` except the FAQ's grid-rows technique, which is GPU-cheap).
- Standard durations: **150ms** (color/underline), **200–250ms** (card hover/scale), **300–350ms** (drawer/menu/accordion), **500ms** (testimonial slide), **1200ms** (hero cross-fade).
- Standard easing: `ease-out` for entrances, `ease-in-out` for continuous/looping or symmetric transitions, `cubic-bezier(0.16,1,0.3,1)` for the mobile drawer (a slight overshoot-free "snap").
- No parallax, no continuous idle animation anywhere (battery/CPU conscious, per §57's "avoid continuous CPU-heavy animation").

**Documented key animations:**

```
Animation: Hero Cross-fade
Trigger: 5s interval, automatic
Initial: opacity 1 (current image) / 0 (next image)
Final: opacity 0 (previous) / 1 (next)
Duration: 1200ms  Easing: ease-in-out  Repeat: infinite  Reduced motion: instant swap, 0ms

Animation: Card Hover Lift
Trigger: :hover / :focus-within
Initial: scale(1), shadow-none
Final: scale(1.02), shadow-hover
Duration: 200ms  Easing: ease-out  Reduced motion: shadow only, no scale

Animation: FAQ Expand/Collapse
Trigger: click
Initial: grid-template-rows 0fr, icon rotate(0)
Final: grid-template-rows 1fr, icon rotate(45deg)
Duration: 300ms  Easing: ease  Reduced motion: 100ms, no rotate bounce

Animation: Mobile Drawer Open
Trigger: hamburger click
Initial: translateX(100%), overlay opacity 0
Final: translateX(0), overlay opacity 1
Duration: 320ms  Easing: cubic-bezier(0.16,1,0.3,1)  Reduced motion: 120ms linear
```

---

## 60. Scroll Behavior

- `scroll-behavior: smooth` site-wide for in-page anchor links (e.g. Home → "Read more" jump to About section if used as an anchor rather than a route).
- Navbar becomes sticky + gains its bottom border only after the user scrolls past the hero (or past 0px on non-hero pages).
- Cart drawer and mobile nav drawer lock body scroll while open (`overflow: hidden` on `<html>`/`<body>`, scrollbar-gutter preserved to avoid layout shift).
- No scroll-jacking, no section snapping — natural scroll throughout.

---

## 61. Micro-interactions

- Nav underline slides in under the active/hovered link (`transform-origin` grow, 150ms).
- Hero CTA arrow (if used, e.g. "Explore →") nudges 4px right on hover.
- Retail "Buy Now" and cart icon: cart icon does a small 1.15x scale "pop" (150ms) when an item is added, to confirm the action without needing to open the drawer.
- FAQ `+` icon rotate (see §57).
- Hamburger → X morph via the same icon rotating/crossing lines rather than an icon swap.

## 62. Page Transitions

Not used. The client's spec does not request route-level transition animation, and adding one would violate §04's "do not add unsupported UI patterns" rule — explicitly **not implemented**.

---

## 63–64. Responsive Design & 60–66 Mobile Rules

Tested breakpoints: 320 / 360 / 375 / 390 / 414 / 480 / 640 / 768 / 1024 / 1280 / 1440 / 1920+.

Non-negotiables at every width: no horizontal scroll/overflow, no stretched or cropped-wrong images, no overlapping text, no hidden essential content, minimum touch target 44×44px, forms remain fully usable, grids degrade column-count only (never break into broken wrapping).

---

## 64 (Accessibility)

- Semantic HTML (`<nav>`, `<header>`, `<main>`, `<footer>`, one `<h1>` per page, logical heading order).
- Full keyboard operability: nav, drawer, accordion, form, carousel dots, cart drawer.
- Visible focus indicators everywhere (§54).
- All images have descriptive `alt` text (decorative images get `alt=""`).
- Form fields always have a associated `<label>` (not placeholder-only).
- Color contrast: body text `#111111` on `#FFFFFF` and `#F5F5F5` on `#0D0D0D` both exceed WCAG AA; `color-muted` (`#666666`) on white also passes AA for normal text size.
- `prefers-reduced-motion` respected across every animation listed in §57–59.
- Touch targets ≥ 44×44px (icon buttons get invisible padding to reach this even when the icon itself is 22–24px).

---

## 65. Content / Copy Rules

- Headings stay short (≤ 8 words) and are never rewritten from client-supplied copy without reason.
- Button labels are verbs/short phrases ("Read More", "Take a Tour", "Buy Now", "Submit Inquiry", "View All Projects", "Load More") — never full sentences.
- Card descriptions cap at 2 lines with `line-clamp-2` where the design shows a fixed card height (Expertise cards, Service teaser, Retail cards); full text is available on the corresponding detail view (Project "View Details", Retail product detail).

---

## 66. Asset Rules

- Formats: WebP with JPEG fallback for photos; SVG for icons.
- Retail/Project images are uploaded through the admin panel (Cloudinary) — frontend always requests a right-sized responsive variant, never the raw upload, and always sets explicit dimensions to prevent CLS.
- Hero images: two curated interior-design stock photos (until the client supplies final brand photography), optimized ≤ 300KB each, `loading="eager"`, `fetchpriority="high"` on the first.

---

## 67. Page-by-Page UI Specification

### `/` — Home
Header → Hero (cross-fade slider) → About teaser + Stats + Expertise grid + Trust strip (`home/about.png`) → Services teaser (`home/service.png`) → Projects strip (`home/project.png`) → Process (`home/process.png`) → Testimonials (`home/testimonials.png`) → FAQ (`home/faq.png`) → Inquiry Form (shared) → Footer.

### `/about`
Header → "Designing *with soul*" editorial hero (brown italic accent word, right-aligned intro paragraph) → About Us (image + copy) → Founders block (photo, name, softened role line, description, "sabr" badge) → Footer. *(No inquiry form shown in the About reference; Footer follows directly.)*

### `/services`
Header → "Our Services" heading + supporting copy → 6-card grid (§39) → Inquiry Form (shared) → Footer.

### `/projects`
Header → "Projects" H1 → alternating image/content rows (image left, "Take a tour" button + title right — Figma alternates nothing, all rows same side, so the layout is **not** zig-zag, it is consistently image-left/content-right at all times) → "View All Projects" button, shown **only if more than the currently-displayed set exist**, loading **3 more per click**, and the button **disappears entirely** once fewer than 4 total projects exist or once all projects are shown → Footer.

### `/projects/:id` (Project Detail)
Header → Project title/meta → expandable "View Details" description (height animates in, matching FAQ's grid-rows technique, so surrounding layout never jumps as description length varies) → image(s) → related projects → Footer.

### `/shop` (Retail)
Header → "Products" H1 (kept in the editorial serif per the reference's script-style heading, i.e. Abhaya Libre) → black `CategoryTabBar` (All + admin-defined categories) → product grid, **6 products shown initially regardless of breakpoint**, `Load More` button appends more (never replaces), disappearing once the full catalog is loaded → Footer.

### `/shop/:id` (Product Detail)
Header → product image → name → price (₹, admin-controlled, live) → description → Buy Now (Razorpay) / Add to Cart → related products → Footer.

### `/contact`
Header → "Keep In Touch" info cards → Social grid → Inquiry Form (shared) → Footer.

---

## 68. Component Inventory

**Global:** Navbar, MobileDrawer, CartDrawer, Footer, Button (existing), Toast.
**Page-level:** HeroSlider, AboutFounderBlock, CategoryTabBar.
**Section-level:** SectionHeading, StatBlock, ExpertiseCard, ServiceCard (home teaser + services page variants), ProjectHomeThumb, ProcessStep, TestimonialCard, FaqAccordionItem, ContactInfoCard, SocialLinkCard, ProjectListingRow.
**Interactive:** InquiryForm (shared), CartLineItem, Accordion (generic, used by FAQ).
**Form:** TextInput, TextArea, Select, FormLabel, FormError.
**Utility:** Badge, Skeleton, EmptyState, ErrorState.

Reusable across ≥ 2 contexts: `Button`, `SectionHeading`, `Badge`, `InquiryForm`, the card hover pattern (§33), `Skeleton`/`EmptyState`/`ErrorState`.

---

## 69. Design Tokens (Tailwind theme extension summary)

```
colors:  black, ink(#111111), white, muted(#666666), border(#E4E4E4),
         surface(#FAFAFA), cream(#F7F3EC), brown(#8B4A2E),
         footer-bg(#0D0D0D), footer-text(#F5F5F5), footer-muted(#9A9A9A)
fonts:   heading: 'Abhaya Libre', serif   |   body: 'Inter', sans-serif
weights: 400, 500, 600 only
spacing: 4,8,12,16,24,32,48,64,96,128 (px)
radius:  0, 4, 8, full
shadow:  none, hover: 0 8px 24px rgba(0,0,0,.12)
motion:  150,200,250,300,320,500,1200 (ms)
z-index: see §71
breakpoints: 640, 768, 1024, 1280, 1440 (Tailwind default sm/md/lg/xl/2xl)
```

---

## 70. Figma/PNG → Code Mapping

```
navbar.png        → Navbar, MobileDrawer          → tokens: color, spacing, typography(nav)
footer.png        → Footer                        → tokens: color(footer-*), spacing
home/about.png    → StatBlock, ExpertiseCard, AboutTeaser, TrustStrip
home/service.png  → ServiceTeaserSection
home/project.png  → ProjectHomeThumb grid
home/process.png  → ProcessStep ×6
home/testimonials.png → TestimonialCard, carousel dots
home/faq.png       → FaqAccordionItem
about/about.png    → About hero, AboutFounderBlock, Badge("sabr")
contact/contact.png→ ContactInfoCard, SocialLinkCard
projects/projects.png → ProjectListingRow
retail/figma 1.png → CategoryTabBar, RetailProductCard
service/service.png→ ServiceCard (page grid)
inquery form/*.png → InquiryForm (shared)
```

---

## 71. Z-Index / Layering

```
0   base content
10  sticky section elements (none currently besides navbar)
40  navbar (sticky)
50  mobile drawer overlay
60  mobile drawer panel / cart drawer panel
70  toast
80  modal overlay
90  modal panel
```

---

## 72. Overflow Rules

- `<body>` and every top-level section: `overflow-x: hidden` as a safety net; the real fix is that no element is ever given a fixed px width wider than its container.
- Cards never let text overflow — headings wrap naturally, descriptions use `line-clamp` where a fixed height is required (§65).
- Horizontally-scrolling elements: **only** the Testimonials carousel track, which uses `overflow-x: hidden` on the viewport with an internal track that translates (no visible scrollbar) — no other section scrolls horizontally, including on mobile.
- Retail/Projects image tiles: `overflow: hidden` on the container so the hover image-scale (§33) never spills outside the card.

---

## 73. Cursor Rules

- Default: `cursor: default` on static content.
- `cursor: pointer` on every link, button, card-with-click-action, accordion trigger, tab.
- `cursor: not-allowed` on disabled buttons/fields.
- No custom cursors (grab/grabbing) are used anywhere — nothing in this design is draggable.

---

## 74. User Interaction Rules

Click/tap opens routes and toggles (drawer, accordion, tabs, modal). Hover is decorative-only feedback (§52). Keyboard: Tab/Shift+Tab moves focus in DOM order, Enter/Space activates buttons and accordion triggers, Escape closes drawer/modal. Scroll triggers the navbar's sticky/border state. No drag or swipe gestures are required by this design (testimonial carousel advances by timer/dots, not swipe, to keep behavior identical across input types) — though native touch swipe on the carousel track may work incidentally via the browser's default scroll snap and is not actively prevented.

---

## 75. Form Validation

Applies to `InquiryForm`:

| Field | Required | Rule |
|---|---|---|
| Full Name | **Yes** | non-empty, min 2 characters |
| Phone Number | **Yes** | valid phone pattern (10 digits, optional `+country`) |
| Email | No | if filled, must match standard email pattern |
| Project Type | **Yes** | one of: Furniture, Interior Design, Architecture, Other |
| Message | No | free text, no min length; a rows-adjustable textarea (the client's "increase/decrease" note) that auto-grows with content up to a max-height, then scrolls internally |

On submit: client-side validation blocks submission and shows inline field errors (§25) until resolved. On success: Button shows loading → success, form fields clear, and a "Submitted" confirmation replaces/overlays the form area briefly (§50 empty/success state language) before resetting to the blank form.

---

## 76. Performance UI Rules

- Images: WebP, responsive `srcset`, lazy-loaded below the fold, explicit dimensions.
- Fonts: only the 6 required weight/style combinations loaded (§07), `font-display: swap`.
- Animations: `transform`/`opacity` only (§57), no continuous background animation.
- Components: cards, buttons, and section headings are shared/reused rather than re-implemented per page.
- Retail/Projects grids paginate via "Load More"/"View All" rather than rendering the entire catalog at once.
- No unnecessary scroll listeners — the sticky-navbar border uses a single passive scroll listener (or an `IntersectionObserver` sentinel) shared app-wide, not one per component.

---

## 77. Reduced Motion

`prefers-reduced-motion: reduce` removes/shortens: hero cross-fade (instant swap), card hover scale (shadow-only feedback remains), drawer slide (shortened to 120ms linear, no easing overshoot), testimonial slide (crossfade instead of translate, or instant), FAQ expand (100ms, no icon rotate bounce). Essential state feedback (focus rings, color changes, error messages) is never removed.

---

## 78. UI QA Checklist

**Visual:** layout matches PNG references section-by-section · spacing follows §08 tokens only · typography follows §07 exactly (2 families, weights 400/500/600 only) · only palette colors from §06 appear anywhere · borders/radius/shadows match §18–20 · no images stretched/cropped wrong · icons consistent size/stroke (§21).

**Components:** Button = single shared component everywhere, no duplicate button styles · Links, Cards, Forms, Navbar, Footer, FAQ accordion, Cart drawer all match their sections above.

**States:** every interactive element has Default/Hover/Focus/Active/Disabled defined and, where relevant, Selected/Loading/Error/Success (§52–56).

**Responsive:** verified at all breakpoints in §63 · no horizontal overflow anywhere (§72) · mobile never depends on hover-only interaction (§52).

**Accessibility:** keyboard path through every interactive element · focus visible everywhere · alt text present · labels present · semantic landmarks present · contrast passes AA · reduced motion respected.

**Performance:** images optimized/lazy · animations transform/opacity-only · no layout shift on load (explicit image dimensions, skeleton states) · no unnecessary re-renders/listeners.

**Browser behavior:** no overlapping elements · no broken images · no console errors · no unwanted scrollbars · no button/text misalignment.

---

## 79. Final UI/UX Consistency Rules

1. Every page shares the same design system (this document).
2. Every reusable component behaves identically wherever it appears.
3. Spacing, typography, and color always come from §06–§08 tokens — never an arbitrary value.
4. The single existing Button component is used for every button, everywhere, with no exceptions.
5. Hover/Focus/Active/Disabled states are consistent site-wide (same durations, same visual language).
6. Mobile behavior never depends on hover.
7. Images always preserve aspect ratio; nothing is stretched or wrongly cropped.
8. No horizontal overflow exists at any breakpoint.
9. No colors, spacing values, radii, or animation patterns are introduced outside this document without updating it first.
10. The implementation is checked against this document — if something conflicts, **the implementation is fixed to match this document and the source PNGs**, not the other way around.

---

## Open Design Decisions (client sign-off needed before build)

- Confirm the Process step 6 substitution ("Material & Colour Consultation" replacing "Lighting Design") is acceptable, or specify a different one of the 6 services to use instead.
- Confirm final 2 hero stock photos (currently unspecified — placeholders will be used until supplied).
- Confirm whether the About page needs its own Inquiry Form instance (current spec follows the Figma reference, which shows none, and goes straight to Footer).
- Confirm exact Sabr Studio phone/email/address for Contact + Footer (currently using structurally-correct placeholders in the same format as the Figma reference until real values are supplied).

## Change Log

- v1.0 — Initial documentation generated from `navbar.png`, `footer.png`, `home/*.png`, `about/about.png`, `contact/contact.png`, `projects/projects.png`, `retail/figma 1.png`, `service/service.png`, `inquery form/inquery form.png`, the client's written brief, the typography brief, PRD.md and TRD.md.
