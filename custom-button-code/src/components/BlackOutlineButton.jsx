import { forwardRef } from "react";
import Button from "./Button";

/**
 * Transparent button with a black border and black text. Fills to
 * solid black with white text on hover; the border blends into the
 * black fill so no seam is visible.
 *
 * Usage:
 *   <BlackOutlineButton label="View Project" />
 */
const BlackOutlineButton = forwardRef(function BlackOutlineButton(
  { variant, ...props },
  ref
) {
  // `variant` is destructured out (and intentionally unused) so it can
  // never be spread into Button and override the locked variant.
  return <Button ref={ref} variant="outlineBlack" {...props} />;
});

export default BlackOutlineButton;
