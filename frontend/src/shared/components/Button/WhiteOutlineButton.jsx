import { forwardRef } from "react";
import Button from "./Button";

/**
 * Transparent button with a white border and white text (for use on
 * black/dark backgrounds). Fills to solid white with black text on
 * hover; the border blends into the white fill so no seam is visible.
 *
 * Usage:
 *   <WhiteOutlineButton label="Contact Us" />
 */
const WhiteOutlineButton = forwardRef(function WhiteOutlineButton(
  { variant, ...props },
  ref
) {
  // `variant` is destructured out (and intentionally unused) so it can
  // never be spread into Button and override the locked variant.
  return <Button ref={ref} variant="outlineWhite" {...props} />;
});

export default WhiteOutlineButton;
