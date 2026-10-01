import { forwardRef } from "react";
import Button from "./Button";

/**
 * White button with black text. Inverts to black-on-white-border on hover.
 *
 * Pass `onDark` when the button sits on a black/dark card or section:
 * the label starts red instead of black (same hover behavior), matching
 * the design system's dark-background treatment.
 *
 * Usage:
 *   <WhiteButton label="Contact Us" />
 *   <WhiteButton label="Get Started" onDark />
 */
const WhiteButton = forwardRef(function WhiteButton(
  { onDark = false, variant, ...props },
  ref
) {
  // `variant` is destructured out (and intentionally unused) so it can
  // never be spread into Button and override the locked white variant.
  return <Button ref={ref} variant={onDark ? "whiteOnDark" : "white"} {...props} />;
});

export default WhiteButton;
