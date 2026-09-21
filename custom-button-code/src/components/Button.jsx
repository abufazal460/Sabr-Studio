import { forwardRef } from "react";
import { baseButtonClasses, buttonVariants } from "./buttonStyles";

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

/**
 * Internal base button. Not exported from the package — BlackButton,
 * WhiteButton and OutlineButton are thin, pre-configured wrappers
 * around this so variant styling isn't duplicated three times.
 *
 * Renders a native <button> by default. If `href` is provided it
 * renders a semantic <a> instead (real navigation, not a button
 * pretending to be a link), and disabling it is done via
 * aria-disabled + a blocked click handler, since anchors have no
 * native `disabled` attribute.
 */
const Button = forwardRef(function Button(
  {
    label,
    variant = "black",
    type = "button",
    href,
    disabled = false,
    onClick,
    className = "",
    "aria-label": ariaLabel,
    ...rest
  },
  ref
) {
  const classes = cx(baseButtonClasses, buttonVariants[variant], className);

  if (href) {
    return (
      <a
        ref={ref}
        href={disabled ? undefined : href}
        className={classes}
        aria-label={ariaLabel}
        aria-disabled={disabled || undefined}
        tabIndex={disabled ? -1 : undefined}
        onClick={(event) => {
          if (disabled) {
            event.preventDefault();
            return;
          }
          onClick?.(event);
        }}
        {...rest}
      >
        {label}
      </a>
    );
  }

  return (
    <button
      ref={ref}
      type={type}
      className={classes}
      disabled={disabled}
      onClick={onClick}
      aria-label={ariaLabel}
      {...rest}
    >
      {label}
    </button>
  );
});

export default Button;
