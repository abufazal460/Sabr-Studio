# Sabr Studio — Production Animation Specification

## 1. Purpose

This document is the complete animation blueprint for the Sabr Studio public website. It translates the approved product, technical, UI/UX, Figma PNG, and reference-site direction into lightweight, consistent, production-ready motion.

It defines **what moves, when it moves, how often it moves, its trigger, duration, easing, delay, device behavior, accessibility behavior, and performance boundary**. It is not permission to add new UI, visitor-login behavior, page routes, or a generic animation style that does not exist in the supplied design.

The visual language is monochrome: white page background and black text, UI, borders, and surfaces. Animation is used to reveal hierarchy and provide interaction feedback—not as decoration.

## 2. Source material and Figma PNG map

| Figma source PNG | Corresponding feature / animation scope |
|---|---|
| `figma/navbar/navbar.png` | Fixed navbar, first-load crop reveal, active/hover travelling black fill |
| `figma/footer/footer.png` | Footer crop reveal, link and social hover behavior |
| `figma/home/about.png` | Home about teaser, founder image, statistics and expertise cards |
| `figma/home/service.png` | Home services teaser and desktop-only section pin |
| `figma/home/project.png` | Home project-strip hover overlay |
| `figma/home/process.png` | Process heading and six scroll-scrub cards |
| `figma/home/testimonials.png` | Testimonial carousel and active dots |
| `figma/home/faq.png` | FAQ heading, help heading, accordion interaction |
| `figma/inquery form/inquery form.png` | Shared enquiry form; intentionally no entrance animation |
| `figma/about/about.png` | About editorial intro, story and founder section |
| `figma/contact/contact.png` | Contact heading, information cards and social grid |
| `figma/projects/projects.png` | Projects listing heading and project image hover |
| `figma/retail/figma 1.png` | Retail heading, product cards and cart feedback |
| `figma/service/service.png` | Services page heading and paired card reveal |

Reference study: Jamia Academy informs the **navbar link fill/travel interaction only**. Monica Khanna Designs informs the requested **desktop editorial pin / portfolio storytelling rhythm only**. Neither reference permits copying its visuals, content, structure, or animation implementation.

## 3. Non-negotiable motion principles

1. **Motion must have a job.** It may reveal content, explain hierarchy, confirm a click, or show a state change. It must not run merely because animation is possible.
2. **No continuous decorative animation.** The only timed loops allowed are the two-image hero slider and testimonial carousel. Both pause when the page is hidden and respect reduced motion.
3. **Use transforms and opacity.** Animate only `transform` and `opacity` in normal motion. Never animate layout properties such as `width`, `height`, `left`, `top`, `margin`, or `box-shadow` continuously.
4. **No layout shift.** Image containers reserve their aspect ratio before loading. Animation never changes document flow or causes a page jump.
5. **One clear visual vocabulary.** Cropped reveal, small directional translation, short hover scale, and restrained black overlay are repeated consistently. Random bounces, spring overshoot, 3D rotations, parallax, cursor trails, magnetic effects, and background particles are excluded.
6. **Scroll motion is selective.** Only the Home Projects, Home Process, Home Services pin, and Home FAQ help heading use scroll-linked behavior. All other entrances are one-time viewport reveals.
7. **Hover is optional feedback.** Every CTA remains fully usable on touch and keyboard; no action depends on hover.
8. **There are no route/page-transition animations.** The UI/UX specification explicitly excludes them. Navigation must feel immediate.
9. **The existing shared Button component is not changed.** This specification does not introduce a second button animation system.
10. **A visible pointer is only for interactive controls.** `cursor: pointer` applies to links, buttons, image cards that navigate/open something, tabs, accordion triggers, and social links—not decorative text or a non-clickable image.

## 4. Library ownership and implementation boundary

| Motion type | Owner | Use it for | Do not use it for |
|---|---|---|---|
| Component entrance, exit, hover, tap, drawer, accordion, carousel state | Framer Motion | Crop reveals, interactive states, menu/cart panels, dots, FAQ | Scroll-scrub or pinned sections |
| Scroll-position-linked reveal and pin | GSAP + ScrollTrigger | Home Projects card scrub, Process card scrub, Home Services pin, FAQ help-heading scrub | Buttons, nav hover, standard viewport entrances |
| Scroll transport | Lenis | Single app-level smooth-scroll source, synchronized with ScrollTrigger | A separate native scroll listener system |
| Visibility gating | `react-intersection-observer` | One-time reveal mounting and stopping off-screen media work | Scroll-scrub calculations |

Never animate the same element with both Framer Motion and GSAP at the same time. GSAP timelines and ScrollTriggers must be destroyed/reverted when their component unmounts. Lenis is initialized once in the root provider only.

## 5. Motion tokens

### 5.1 Easing

| Token | Value | Use |
|---|---|---|
| `easeStandard` | `ease-out` | Most entrances and hover release |
| `easeEnter` | `cubic-bezier(0.16, 1, 0.3, 1)` | Crop reveals and drawers; no overshoot |
| `easeSmooth` | `ease-in-out` | Hero cross-fade and carousel slide |
| `easeLinear` | `linear` | Reduced-motion shortened drawer only |

### 5.2 Duration and delay scale

| Token | Duration | Use |
|---|---:|---|
| `micro` | 150ms | Text/link color, underline, icon nudge |
| `hover` | 200ms | Image scale, cards, active state |
| `card` | 250ms | Card reveal and hover settle |
| `standard` | 300ms | Crop reveal and accordion |
| `drawer` | 320ms | Mobile/cart drawer |
| `section` | 500ms | Editorial viewport entrance |
| `hero` | 1200ms | Hero image cross-fade |

Allowed stagger increment: **60–100ms**. Maximum entrance delay: **300ms**. Delay is never used to make the interface feel slow; it only establishes a readable order within a group.

### 5.3 Standard reveal recipes

| Name | Initial state | Final state | Duration / trigger |
|---|---|---|---|
| `cropFromTop` | wrapper clips overflow; child `y: -20px`, `opacity: 0` | `y: 0`, `opacity: 1` | 300ms, one time in view |
| `cropFromLeft` | wrapper clips overflow; child `x: -28px`, `opacity: 0` | `x: 0`, `opacity: 1` | 500ms, one time in view |
| `cropFromRight` | wrapper clips overflow; child `x: 28px`, `opacity: 0` | `x: 0`, `opacity: 1` | 500ms, one time in view |
| `cardHover` | `scale(1)`, no extra shadow | `scale(1.02)`, design-system hover shadow | 200–250ms, hover/focus-within |
| `imageHover` | `scale(1)` | `scale(1.03)` inside overflow-hidden media frame | 200ms, hover/focus-within |
| `fadeOverlay` | black overlay `opacity: 0` | black overlay `opacity: 0.42–0.55` | 200ms, hover/focus-within |
| `pressFeedback` | `scale(1)` | `scale(0.98)` while pressed | 150ms; use existing Button behavior only |

Do not use more than one entrance recipe on a single element. A crop wrapper is a simple `overflow: hidden` wrapper; it does not use SVG masks, clip-path morphing, or expensive filters.

## 6. Global behavior

### 6.1 First paint and loading

- Content is visible by default if JavaScript fails. Animation classes are applied only after hydration.
- Above-the-fold hero image has explicit dimensions, `loading="eager"`, and high fetch priority. It must not wait for animation code before it appears.
- Below-the-fold images are lazy-loaded and use a fixed aspect ratio. Animation starts only after the container is ready to render.
- Skeleton loading blocks use the documented subtle pulse only while data is pending. No shimmer gradient or animated blur is used.
- A failure, empty result, or slow network never leaves an animation running indefinitely.

### 6.2 Viewport entrance policy

- One-time viewport entrances begin when roughly **20%** of the section is visible.
- A one-time reveal does not replay when the visitor scrolls away and returns in the same page visit.
- The section must be mounted and visible without waiting for an animation; the visual transition is progressive enhancement.
- On short mobile viewports, start earlier at 10–15% visibility so content does not feel delayed.

### 6.3 Keyboard, focus and touch

- `:focus-visible` receives the same overlay/color treatment as hover where it is meaningful, plus the required visible focus ring.
- Keyboard focus never starts unrelated scroll animation or auto-rotates a carousel.
- Tap feedback is short (`scale(0.98)` for buttons; image cards use only a light opacity/scale state) and does not block navigation.
- Every animated drawer/modal/accordion moves focus correctly and returns it to the trigger on close.

### 6.4 Responsive and reduced-motion policy

| Environment | Motion policy |
|---|---|
| Desktop `≥1024px` | Full approved sequence, including Home Services pin and scroll-scrub sections |
| Tablet `768–1023px` | One-time entrances and simple hover/focus states; no pinned section; scroll-scrub becomes one-time reveal |
| Mobile `<768px` | No pinning, no scroll scrub, no directional exit; headings and content use fast one-time fade/crop reveals only |
| `prefers-reduced-motion: reduce` | No auto slide transition, no scroll scrub/pin, no scale movement; content appears immediately or with 100ms opacity change only |
| Low-performance detection / save-data | Same as tablet/mobile simplified behavior; hero uses instant image swap and carousel auto-play is off |

There is no device check based solely on user-agent. Behavior is selected with media queries, `prefers-reduced-motion`, and a conservative performance fallback. Never force smooth scrolling for a visitor who prefers reduced motion.

## 7. Global fixed navbar

**Figma:** `figma/navbar/navbar.png`  
**Position:** fixed/sticky at the top throughout the public site. It never hides, slides away, or reveals itself based on scroll direction.

### 7.1 First-load entrance

| Element | Animation | Delay |
|---|---|---:|
| Logo / wordmark | `cropFromTop`, 300ms | 0ms |
| Nav links | Individual `cropFromTop`, 250ms, left-to-right | 60ms, then +60ms each |
| Cart control | `cropFromTop`, 250ms | after final nav link + 40ms |
| Visually specified Login CTA | `cropFromTop`, 250ms | after cart + 40ms |

All navbar elements finish within 500ms of first render. Use the same crop reveal for the footer logo. No navbar item has an infinite movement or a scroll-reactive hide/show effect.

### 7.2 Link hover, selected and focus behavior

- Each route link is a relative, overflow-hidden element with a black fill layer below its text.
- **Default:** black text on white; fill translated completely to the left/outside the link.
- **Hover/focus:** black fill travels left-to-right under the label in 200ms; label becomes white in 150ms.
- **Active route:** black fill is already present and label is white. It does not replay on every render.
- **Leave:** fill exits in the direction of travel in 200ms and label returns to black.
- The effect is implemented with one pseudo-element or one absolute span transformed with `translateX`; never animate background-position, width, or layout.

### 7.3 Navbar scroll state

- Navbar remains in its exact position at all scroll offsets.
- Once the page has scrolled beyond the hero/non-hero top edge, it may add the Figma-defined 1px bottom border and solid white background. This change is immediate or 150ms opacity/color only.
- No blur, backdrop-filter, translucent glass, shrink/grow, hide/reveal, or color-theme inversion is added.

### 7.4 Cart interaction

- Cart icon/button: 150ms scale pop to `1.10–1.15` when an item is successfully added, then returns to `1`.
- On hover/focus it may shift upward by 2px and scale to `1.03`; no rotation.
- Clicking opens the cart route/drawer according to the implemented UI. The icon has `aria-label` and a 44×44px hit area.

### 7.5 Login CTA constraint

The product has no visitor login or customer accounts. Its visual CTA may animate as a nav link, but it must not be wired to a fabricated `/login`, registration, or customer session flow. Its destination remains a client decision.

## 8. Global footer

**Figma:** `figma/footer/footer.png`

- Footer logo/wordmark: on its first viewport entry, use `cropFromTop`, 300ms, once only.
- Footer links: default footer color; on hover/focus, transition to white or the documented contrast color in 150ms, with a short 2px underline/travel treatment if present in the design.
- Social icon links: on hover/focus, translate `y(-2px)`, scale `1.05`, and change to the platform color in 200ms. Use: WhatsApp `#25D366`, Facebook `#1877F2`, Instagram `#E1306C`, X `#334155`, YouTube `#FF0000`.
- No footer parallax, staggered scrolling, auto-reveal of every individual link, floating particles, or animated background is allowed.

## 9. Home page motion plan

### 9.1 Hero slider

**Scope:** two curated static interior images, minor black overlay, centered content, existing Button.

| Rule | Specification |
|---|---|
| First image | Visible immediately; no initial blank/fade delay |
| Image transition | Cross-fade: current image opacity 1→0 and next 0→1, 1200ms `easeSmooth` |
| Interval | One transition every 5 seconds; one timer only |
| Direction impression | Add a subtle 1.02→1 image-scale settle on the incoming image only if GPU budget allows; do not translate whole layout |
| Overlay | Static black layer, approximately 35–45% opacity; it does not pulse or animate continuously |
| Heading / supporting text / CTA | Centered and static after normal initial render; no repeated animation with every slide |
| Pausing | Pause timer when tab is hidden; pause while reduced motion is enabled; resume cleanly without rapid catch-up |
| Mobile / reduced motion | Instant image swap at 5 seconds or no auto-rotation if user prefers reduced motion; never a heavy slide/zoom |

Do not use video, canvas, WebGL, multi-layer parallax, large Ken Burns movement, or a page-height scroll-controlled hero.

### 9.2 Home About teaser and statistics

**Figma:** `figma/home/about.png`

- Trigger: first time 20% of the section is visible.
- Founder/about image enters with `cropFromLeft`, 500ms.
- Right-side copy enters with `cropFromRight`, 500ms, 100ms after the image begins.
- Both finish once and do not replay on scroll back.
- If the founder image is an actual click target, use `imageHover` and pointer cursor. If it is decorative, it has no pointer and no click-scale behavior.

**Statistics:**

- Numeric blocks count smoothly from `0` to their actual value once per visit when the statistics row first enters viewport.
- The count lasts 900–1200ms, uses `requestAnimationFrame`, and updates at a readable cadence (not every unnecessary decimal frame).
- Numerals remain monospaced/tabular if the typography setup permits, preventing horizontal layout shift.
- Final output exactly matches stored data, including `+`, `%`, or text suffixes.
- On reduced motion, show the final value immediately. Never replay counting when scrolling back.

### 9.3 Home expertise / four project cards

**Figma source:** Home About section.

- This is a **desktop-only GSAP ScrollTrigger scrub** sequence.
- Two left-column cards originate `x: -10%`, opacity 0; two right-column cards originate `x: 10%`, opacity 0.
- As the visitor scrolls into the section, cards travel smoothly toward `x: 0`, opacity 1. Start at approximately 75% viewport entry and complete around the section midpoint.
- When scrolling beyond the section, cards continue subtly outward and fade toward opacity 0, creating the requested enter/leave storytelling. The distance is small enough that no horizontal page overflow occurs; wrapper has `overflow: clip`/hidden.
- ScrollTrigger uses `scrub: 0.4–0.6`, not `scrub: true`, for smoothness without jitter.
- Cards do not pin. They must remain in normal document flow.
- Tablet/mobile replacement: all four cards use a single one-time 250ms fade/crop reveal with 60ms stagger; no scroll-linked exit.
- Interactive card hover/focus: `cardHover` only. Do not stack another scroll transform on the child that owns hover; use separate outer (GSAP) and inner (Framer) wrappers.

### 9.4 Home Process / “How We Work”

**Figma:** `figma/home/process.png`

- Section heading uses `cropFromTop`, 300ms, once at first viewport entry.
- Central images stay in their designed position; they do not slide, scale, parallax, or pin.
- Six surrounding process boxes use the same desktop scroll-scrub language as Home expertise cards:
  - left-side boxes start `x: -10%`, opacity 0;
  - right-side boxes start `x: 10%`, opacity 0;
  - each settles at its original layout position as the section reaches its center;
  - each moves lightly outward/fades when leaving the section.
- The sequence is tied to section scroll position with `scrub: 0.4–0.6`; it is not a repeated mount animation.
- Use independent transform wrappers for scroll motion and hover motion, if a process card is interactive. No overlapping transform ownership.
- Tablet/mobile replacement: six cards one-time fade/crop reveal; central artwork remains static.

### 9.5 Home Services teaser — pin sequence

**Figma:** `figma/home/service.png`

- This is the only Home section pin.
- Desktop only (`min-width: 1024px`) and only if the section has enough vertical space to complete without content clipping.
- On entry, left-side visual/content reveals with `cropFromLeft`, 500ms, once.
- The service section pins briefly as its designed content settles. The following Home Projects section rises naturally into view after the pin duration, producing the requested editorial handoff.
- Both adjacent sections must use compatible full viewport/minimum heights and identical container widths before enabling the pin. If their layout differs at any breakpoint, disable pin rather than forcing it.
- Pin length: approximately 60–80% of viewport height, not a long scroll trap.
- Use `pinSpacing: true` so the document does not jump. Respect Lenis/ScrollTrigger synchronization.
- No parallax, multi-axis scene, repeated pinning, or animated service-card grid is added here.
- Tablet/mobile/reduced motion: no pin. The section becomes a 500ms one-time left crop reveal, followed by the next section normally.

### 9.6 Home Projects strip

**Figma:** `figma/home/project.png`

- No section entrance animation beyond normal rendering; content must remain calm after the service pin.
- Each project image/link uses an `overflow-hidden` media frame.
- Hover/focus: photo scales to `1.03` over 200ms while a black overlay fades to 42–55% opacity over 200ms.
- Optional existing title/CTA inside the overlay fades in with opacity only; do not introduce extra text if Figma has none.
- Leave reverses smoothly. Touch retains normal tap navigation, not a required first tap to reveal the overlay.
- Card media never changes layout size and never uses filters or blur.

### 9.7 Testimonials carousel

**Figma:** `figma/home/testimonials.png`

- Horizontal carousel is the second and final approved timed loop.
- One visible testimonial state changes every 5 seconds.
- Transition: 500ms horizontal translate on desktop, `easeSmooth`; the outer viewport clips overflow and no page scrollbar is created.
- Dot indicators reflect the active slide. Active dot color/state changes in 150ms; inactive dots remain visibly selectable.
- Dot click/keyboard activation moves directly to that slide and resets the 5-second interval.
- Pause auto-advance on tab hidden, keyboard focus inside carousel, hover on desktop, and reduced motion. Resume after interaction without a surprise immediate transition.
- Reduced motion: no horizontal translation; use instant switch or short 150ms cross-fade. Mobile may use the same simplified fade for lower cost.
- Do not add drag as a required interaction, infinite cloned slides, 3D cards, or multi-row marquee.

### 9.8 FAQ

**Figma:** `figma/home/faq.png`

| Element | Motion |
|---|---|
| Main FAQ heading | `cropFromTop`, 300ms, one time at first viewport entry |
| “Do you need help?” side heading | Desktop GSAP scroll scrub: begins `x: -12%`, opacity 0; reaches `x: 0`, opacity 1 across entry; returns outward/fades when the section is passed. `scrub: 0.4–0.6` |
| FAQ row hover/focus | 150ms color/border feedback only; no card lift unless Figma shows a card surface |
| Accordion open | content expands using CSS grid `grid-template-rows: 0fr → 1fr`, 300ms `easeStandard`; inner body uses `overflow: hidden` |
| Icon | plus rotates 45 degrees into the visual minus state, 200ms; it is not replaced with a second glyph unless accessibility text requires it |
| Open row | uses clear black/text/border highlight, not color alone |
| Accordion close | reverse same transition; 300ms |

- The accordion trigger is a real `<button>` with `aria-expanded` and `aria-controls`.
- One or multiple FAQ rows may be open only if product behavior decides so; default implementation should keep one or none open to avoid unnecessary layout changes.
- On mobile/reduced motion, the side heading becomes a one-time 300ms crop/fade reveal; no scroll-linked exit.

### 9.9 Shared enquiry form

**Figma:** `figma/inquery form/inquery form.png`

- No section entrance animation, card float, staggered field reveal, background movement, or auto-focus animation.
- Inputs use immediate 150ms focus color/border change and the global visible focus ring.
- Validation message appears/disappears with 150ms opacity; it must not push content unexpectedly or rely only on a toast.
- Submit uses the existing Button loading state. The submit lock prevents duplicate requests.
- Successful submission displays the documented inline success state. It can use a 150ms opacity transition only.
- Do not animate form heights, scroll the user automatically, or make form submission dependent on animation completion.

## 10. About page motion plan

**Figma:** `figma/about/about.png`

### 10.1 Editorial hero

- Trigger once, after the page is ready; no route transition wrapper.
- “Designing with soul”/editorial headline enters from left using `cropFromLeft`, 500ms.
- The right introduction paragraph enters using `cropFromRight`, 500ms, delayed 100ms.
- The dividing line stays exactly in its designed position. It does not draw itself, slide, scale, or pulse.
- The entrance runs once only on a visit and does not replay on scroll return.

### 10.2 About story block

- At first section visibility, image uses `cropFromLeft`, 500ms; associated paragraph uses `cropFromRight`, 500ms, delayed 100ms.
- Both are one-time entrances. No scroll-scrub, pinning, parallax, image zoom on scroll, or text word-by-word splitting.

### 10.3 Founder block

- On first entry, the large "sabr" badge/box reveals with a restrained `cropFromTop` or 300ms fade-and-y translation (maximum 16px).
- Founder portrait enters with a single `cropFromRight` or the direction that matches the actual Figma side; it must not conflict with the badge reveal.
- If each image is clickable, it gets `imageHover`: 1.03 scale, 200ms, pointer cursor. Otherwise use no pointer/hover scale.
- No count-up, carousel, or deep scroll effect exists on this page.

## 11. Contact page motion plan

**Figma:** `figma/contact/contact.png`

- “Keep In Touch” heading uses `cropFromTop`, 300ms, once when the page/section first enters view.
- No other entrance animation is used for the contact information body.
- Contact information cards: hover/focus uses `cardHover` (scale 1.02 and documented hover shadow, 200–250ms). Cards must remain accessible and stable; no excessive y translation.
- “Follow & Reach” heading uses a one-time `cropFromTop` or matching crop reveal on its first viewport entry.
- Social link cards retain the same card hover. Additionally, the icon/text transitions to brand color in 200ms:
  - WhatsApp: green `#25D366`
  - Facebook: blue `#1877F2`
  - Instagram: pink `#E1306C`
  - X: slate `#334155`
  - YouTube: red `#FF0000`
- Social color is hover/focus feedback, not the sole indicator of destination. Each has text or accessible label.
- The shared enquiry form follows the no-entrance-animation rules in section 9.9.

## 12. Projects page and detail page

**Figma:** `figma/projects/projects.png`  
**Canonical route:** `/projects` and `/projects/:slug`

### 12.1 Projects listing

- The “Projects” heading uses `cropFromTop`, 300ms, once at first entry.
- No listing-wide stagger, scroll pin, card slide, automatic gallery, or decorative background animation is added.
- Each project row/card image uses `imageHover` only if its whole row/card is a real navigation link.
- If a title/CTA is visible over an image on the designed card, use `fadeOverlay` and opacity-only label reveal. Do not fabricate an overlay in a layout that does not show one.
- Projects load in documented increments (three additional items per action); new items use a 250ms opacity + 12px upward reveal with a 60ms stagger, not a page reload effect.
- Skeleton, empty, error, and not-found states remain calm; only skeleton pulse is permitted while loading.

### 12.2 Project detail

- Title and metadata appear normally; avoid another large page-intro entrance because the user has already chosen a project.
- Image gallery uses hover scale on actionable images only. No autoplaying gallery, masonry rearrangement animation, lightbox zoom, or image parallax unless separately approved.
- “View Details” disclosure follows the FAQ accordion expand/collapse behavior: 300ms grid-row transition, accessible button state.
- Related projects use the same image hover/overlay behavior as the listing; no auto-scroll carousel.
- Optional purchasable-project CTA continues using the existing shared Button behavior only.

## 13. Retail page and retail detail page

**Figma:** `figma/retail/figma 1.png`  
**Canonical route:** `/retail` and `/retail/:slug` (not `/shop`).

### 13.1 Retail listing

- “Products” heading uses exactly the Projects heading behavior: `cropFromTop`, 300ms, once on first entry.
- Category tab bar: selected tab state changes with 150ms black/white color transition; the fill can travel in the same light navbar style if it fits the final tab design. No layout-moving indicator and no long underline animation.
- Product images are real links/buttons only where they navigate. On hover/focus/tap feedback, image scales to 1.03 in 200ms; retain overflow-hidden frame.
- Product cards use the shared 200–250ms hover shadow/scale contract if they are designed as cards.
- Initial catalog count and Load More behavior remain data rules; newly appended products enter with 250ms opacity + 12px y reveal, max 60ms stagger.
- No product card auto-rotation, quick-view modal, wishlist, rating animation, sale badge pop, or floating cart is added.

### 13.2 Retail detail

- Product name can use one-time `cropFromTop`, 300ms, only if it is the clearly designed page heading. Otherwise content renders immediately.
- Product image uses `imageHover` only when click/tap opens an existing gallery interaction; it does not scale merely because it is decorative.
- Add-to-cart uses existing Button state. On a successful add, navbar cart gets its single 150ms 1.10–1.15 scale pop and optional lightweight toast uses 300ms slide-up/fade in, auto-dismiss after 3 seconds.
- Quantity/price changes do not use counting animation. The server remains authoritative for checkout price.
- Related retail products follow listing hover behavior; no carousel is required.

## 14. Services page

**Figma:** `figma/service/service.png`

- “Our Services” heading uses `cropFromTop`, 300ms, once when the page first enters.
- Six service cards reveal as **three paired rows** on desktop:
  1. Row one: left card `cropFromLeft`, right card `cropFromRight`, both begin together.
  2. Row two: same paired reveal, 100ms after row one completes/begins according to scroll position.
  3. Row three: same paired reveal, 100ms after row two.
- The sequence is a light GSAP ScrollTrigger scrub only on desktop, with `scrub: 0.35–0.5`. Each row travels no more than 24–28px and never affects grid layout.
- Tablet/mobile/reduced motion: each row reveals once with the same paired order, but uses 250ms simple crop/fade without scrub.
- Card hover/focus uses `cardHover`; no icon spin, flip, animated gradient, or cursor-follow effect.
- The page does not use the Home Services pin. Pinning is exclusive to the Home teaser where the subsequent Projects handoff exists.

## 15. Cart and checkout

### 15.1 Cart

- Cart row add/remove/reorder feedback uses 200ms opacity and 12px translate only. Never animate total amount as a count-up.
- Quantity changes update immediately with 150ms button feedback and stable row dimensions.
- Removing a line item fades/collapses only after the operation succeeds; respect reduced motion by removing immediately.
- Empty cart state has no decorative animation; CTA uses existing Button behavior.

### 15.2 Checkout and payment result

- Checkout form follows the shared enquiry-form interaction rules.
- Payment initiation displays the existing Button loading state only; do not fake a payment success animation before backend verification.
- Verified success state can fade in over 150–200ms. Failure/cancellation message appears with 150ms opacity and remains readable.
- No confetti, checkmark explosion, payment celebration, or looping success animation is permitted.

## 16. Admin panel

The admin panel is functional and data-dense. It must prioritize speed and clarity over editorial animation.

- Admin login: 200–300ms simple crop/fade for form container on first load only.
- Protected dashboard pages: no route transition; render layout immediately.
- Sidebar/navigation: 150ms selected state color transition only.
- Tables: no staggered row animation. Newly fetched data appears immediately; skeleton pulse only during loading.
- Create/edit forms: focused input and inline validation transitions only, 150ms.
- Delete confirmation modal: 200ms opacity + 12px y transform, focus-trapped; close reverses it.
- Status changes use color/text/icon updates in 150ms, not celebratory motion.
- Image upload preview fades in over 150ms after a valid local preview loads; it must not block upload validation or backend response.

## 17. Performance engineering rules

### 17.1 Budget and execution

- Animate composited properties only: `transform`, `opacity`. A small color transition is permitted for interactive states.
- No `filter`, `backdrop-filter`, blur, CSS `clip-path` morph, SVG path morph, box-shadow tween, canvas, WebGL, or JavaScript-driven frame-by-frame scrolling.
- `will-change: transform` is added only while a currently animating item needs it, then removed. Never place it on every card/image site-wide.
- Use one ScrollTrigger timeline per affected section, not one trigger per child card where a group timeline can do the work.
- Use `gsap.matchMedia()` to create desktop scroll triggers only when eligible and to clean them on breakpoint change.
- Respect image dimensions and Cloudinary responsive transformation URLs; animation cannot compensate for oversized image downloads.
- Do not use a polling interval for scroll. Lenis drives ScrollTrigger sync; passive/observer-based state handles simple navbar border state.

### 17.2 Lifecycle and bug prevention

- Each carousel timer is singular, cleared on unmount, and paused on `document.visibilitychange`.
- Each GSAP context is reverted in cleanup; every ScrollTrigger is destroyed on component unmount and breakpoint switch.
- Avoid React state updates on every scroll frame. ScrollScrub animation is owned by GSAP; React state is used only for semantic interaction state.
- Prevent duplicate initial animation in React Strict Mode by using context cleanup/idempotent initialization.
- Do not create nested horizontal transforms that fight one another. Scroll transform lives on an outer wrapper; hover transform lives on an inner wrapper.
- Never set `overflow-x: hidden` as the only solution to a bad off-screen transform. First keep translation distances relative and clipped by the section wrapper.
- At every breakpoint, test 320, 360, 375, 390, 414, 480, 640, 768, 1024, 1280, 1440, and 1920px+ widths.

## 18. Accessibility requirements

- `prefers-reduced-motion: reduce` is honored everywhere as specified in section 6.4.
- No animation can hide content from screen readers, delay keyboard access, or make essential information visible only after an effect completes.
- Accordions use native buttons, `aria-expanded`, and linked controlled regions.
- Carousel dots are keyboard reachable and clearly announce/select current slide; auto-rotation pauses on focus.
- Interactive images/cards must have a semantic link/button and meaningful accessible label; decorative images use empty alt text and have no pointer behavior.
- Visible focus rings are never replaced by an animation-only state.
- Color transitions are never the sole signal for selected, disabled, validation, order, or payment state.

## 19. Test and QA checklist

### Functional motion checks

- [ ] Navbar stays fixed and never hides/shows based on scroll.
- [ ] Navbar active/hover fill works with mouse, keyboard focus, and touch navigation.
- [ ] Hero has only two images, changes every five seconds, and starts with visible content.
- [ ] Hero and testimonial timers pause when tab is hidden.
- [ ] Home stats count once and show correct final stored values.
- [ ] Desktop Home Projects/Process scrub enters and exits smoothly without horizontal overflow.
- [ ] Home Services pin runs only on eligible desktop layouts and releases cleanly into Projects.
- [ ] FAQ opens/closes, plus/minus state is correct, and keyboard operation works.
- [ ] No animation is attached to the reusable enquiry form entrance.
- [ ] Contact social colors map to the correct platforms.
- [ ] Projects and Retail headings use the same crop reveal and do not duplicate page-wide animation.
- [ ] Services cards reveal in paired row order.
- [ ] Cart pop occurs only after a successful item add.
- [ ] Admin status/data views remain calm and immediately usable.

### Responsive, accessibility and performance checks

- [ ] At `<768px`, no pin or scroll scrub exists.
- [ ] At `768–1023px`, no pin exists and scrub becomes a simple reveal.
- [ ] At `≥1024px`, pinning has correct spacing and no trapped scroll.
- [ ] With reduced motion, all essential content is immediately visible; sliders do not use movement.
- [ ] There is no horizontal document overflow at any tested width.
- [ ] No animation causes CLS, text overlap, image distortion, or broken grid alignment.
- [ ] Keyboard focus remains visible during and after every animated interaction.
- [ ] Screen reader semantics remain correct for carousel, accordion, drawer, and modal.
- [ ] Browser performance remains smooth on a throttled low-end mobile profile; remove desktop-only optional scrub/pin if it degrades responsiveness.
- [ ] LCP/FCP/INP are rechecked after animation implementation; hero media and main-thread work remain the first optimization priority.

## 20. Explicit exclusions

Do not add any of the following without a new approved requirement:

- Visitor login/register/account animation or route.
- Page transition animation between routes.
- Parallax, scroll-jacking, scroll snapping, full-page scene transitions, or 3D effects.
- Large continuous zoom, floating objects, particles, animated gradients, video background, WebGL/canvas, cursor trails, magnetic cursor, or custom cursor.
- Infinite marquee, duplicated-slide carousel, autoplay video, perpetual icon rotation, card flip, or bouncing elements.
- Motion that uses unoptimized images, blocks input, causes layout shift, or lowers mobile responsiveness.
- Heavy behavior copied from the reference websites beyond the narrowly approved navbar fill and desktop Home Services pin concept.

## 21. Implementation sequence

1. Build motion tokens, reduced-motion hook, Lenis root provider, and strict Framer/GSAP ownership utilities.
2. Implement navbar and footer, then validate keyboard/focus and first-load timing.
3. Implement the Hero and static section fundamentals; test FCP/LCP before adding below-fold scroll motion.
4. Add one-time Home About/stat reveals, then desktop-only Project/Process scrub in isolated GSAP contexts.
5. Add the Home Services pin only after matching section heights and responsive layout are verified.
6. Implement testimonial carousel and FAQ accessibility behavior.
7. Apply restrained page-specific motion to About, Contact, Projects, Retail, Services, Cart, and Admin.
8. Run the complete QA checklist at all breakpoints, with reduced motion, throttled CPU/network, keyboard-only navigation, and direct page refreshes.

## 22. Final acceptance criteria

The animation system is complete only when it feels consistent, quiet, responsive, and intentional:

- Every specified section has exactly its required animation behavior and no unnecessary extra motion.
- Crop reveals, timing, direction, and easing follow one unified vocabulary.
- Complex scroll behavior is desktop-only, lightweight, cleaned up correctly, and replaced with simple mobile motion.
- The page works perfectly with motion disabled.
- No feature depends on hover, autoplay, or animation to remain usable.
- The existing Button component, public route contract, performance goals, accessibility target, and black/white visual system stay intact.
