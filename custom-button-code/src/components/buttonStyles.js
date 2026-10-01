/**
 * Shared styling for all button variants.
 *
 * Layout, spacing, transitions and disabled state live here so every
 * variant stays visually and behaviorally consistent. Only color logic
 * differs between variants (see `buttonVariants`).
 *
 * Border is always present (never `border-none`) even where the design
 * calls for "no visible border" — the border color is simply set to
 * match the background so it's invisible until the hover state changes
 * it. This keeps the box model identical between states and prevents
 * the 1px layout shift that toggling `border-width` would cause.
 */

export const baseButtonClasses = [
  "inline-flex items-center justify-center",
  "select-none truncate max-w-full",
  "font-medium text-sm sm:text-base",
  "px-8 py-3 min-h-[44px] min-w-[44px]",
  "border",

  // Only the properties that actually change are transitioned.
  // Color transitions are slightly slower (premium, smooth hover);
  // the press animation is quicker so it reads as immediate feedback.
  "transition-[background-color,border-color,color,transform] duration-300 ease-out active:duration-150",
  "motion-safe:active:scale-[0.97]",
  "motion-reduce:transition-none motion-reduce:active:scale-100",

  // Design system intentionally omits a visible focus ring.
  "outline-none",

  // Disabled: flat neutral gray, no hover/press interaction at all.
  // `disabled:` covers native <button disabled>; `aria-disabled:` covers
  // the <a> case, since :disabled is not valid on anchor elements.
  "disabled:pointer-events-none aria-disabled:pointer-events-none",
  "disabled:bg-gray-200 aria-disabled:bg-gray-200",
  "disabled:text-gray-400 aria-disabled:text-gray-400",
  "disabled:border-gray-200 aria-disabled:border-gray-200",
].join(" ");

export const buttonVariants = {
  black:
    "bg-black text-white border-black cursor-pointer " +
    "hover:bg-white hover:text-black",

  white:
    "bg-white text-black border-white cursor-pointer " +
    "hover:bg-black hover:text-white hover:border-white",

  // WhiteButton rendered on a dark/black card or section.
  whiteOnDark:
    "bg-white text-red-600 border-white cursor-pointer " +
    "hover:bg-black hover:text-white hover:border-black",

  outlineBlack:
    "bg-transparent text-black border-black cursor-pointer " +
    "hover:bg-black hover:text-white",

  outlineWhite:
    "bg-transparent text-white border-white cursor-pointer " +
    "hover:bg-white hover:text-black",
};
