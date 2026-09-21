import { forwardRef } from "react";
import Button from "./Button";

/**
 * Solid black button. Inverts to white-on-black-border on hover.
 *
 * Usage:
 *   <BlackButton label="View Project" />
 *   <BlackButton label="Submit" type="submit" disabled />
 *   <BlackButton label="Learn More" href="/about" />
 */
const BlackButton = forwardRef(function BlackButton({ variant, ...props }, ref) {
  // `variant` is destructured out (and intentionally unused) so it can
  // never be spread into Button and override the locked "black" variant.
  return <Button ref={ref} variant="black" {...props} />;
});

export default BlackButton;
