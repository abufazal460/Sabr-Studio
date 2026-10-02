import { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import {
  DemoBlackButton,
  DemoWhiteButton,
  DemoBlackOutlineButton,
  DemoWhiteOutlineButton,
} from '../CustomButtons';
import { baseButtonClasses, buttonVariants } from '../CustomButtons/demoButtonStyles';

/**
 * The single canonical Button component for Sabr Studio (02-frontend.md §5 & §8).
 * Visual system: demo button styles (black / white / outline-black / outline-white),
 * selected automatically from the `variant` prop AND the surrounding background
 * (dark sections get white buttons, light sections get black buttons).
 * Supports variants: 'Primary' | 'Secondary-Outline' | 'Secondary-Text' | 'White' | 'WhiteOutline'
 * Handles <button>, <Link to="...">, or <a href="..."> seamlessly.
 * Extra props (to, href, icon, loading, size, fullWidth) are adapted onto the demo base.
 */
function pickDemoComponent(variant, onDark) {
  const v = (variant || '').toLowerCase();
  if (v === 'white' || v === 'whiteoutline' || v === 'white-outline') {
    return v === 'white' ? DemoWhiteButton : DemoWhiteOutlineButton;
  }
  if (
    v === 'secondary-outline' ||
    v === 'outline' ||
    v === 'blackoutline' ||
    v === 'black-outline' ||
    v === 'outlineblack'
  ) {
    return onDark ? DemoWhiteOutlineButton : DemoBlackOutlineButton;
  }
  if (v === 'secondary-text' || v === 'text') {
    return onDark ? DemoWhiteOutlineButton : DemoBlackOutlineButton;
  }
  // 'Primary' / 'black' / default
  if (onDark) return DemoWhiteButton;
  return DemoBlackButton;
}

export const Button = forwardRef(function Button(
  {
    label,
    children,
    variant = 'Primary',
    size = 'default',
    type = 'button',
    to,
    href,
    icon: Icon,
    iconPosition = 'right',
    loading = false,
    disabled = false,
    fullWidth = false,
    onDark = false,
    onClick,
    className = '',
    'aria-label': ariaLabel,
    ...rest
  },
  ref
) {
  const content = label || children;
  const DemoComponent = pickDemoComponent(variant, onDark);
  const isDisabled = disabled || loading;
  // Demo base only renders `label`; stringify children/icons into a plain label.
  const demoLabel = loading
    ? 'Loading...'
    : typeof content === 'string'
      ? content
      : (Array.isArray(children) ? children.filter((c) => typeof c === 'string').join(' ') : '') ||
        (typeof label === 'string' ? label : 'Submit');

  const sizeClass =
    size === 'sm' ? 'px-4 py-2 min-h-[36px]' : size === 'lg' ? 'px-10 py-4' : '';
  const widthClass = fullWidth ? 'w-full' : '';
  const demoClassName = `${sizeClass} ${widthClass} ${className}`.trim();

  const handleClick = (e) => {
    if (isDisabled) {
      e.preventDefault();
      return;
    }
    onClick?.(e);
  };

  if ((to || href) && !isDisabled) {
    // Client-side route: keep SPA navigation, style with the demo button look.
    // Demo base styles are applied directly onto the Link so it IS the button
    // (single element, correct hover/press/border behavior, keyboard accessible).
    if (to) {
      const v = (variant || 'Primary').toLowerCase();
      const demoVariant =
        v === 'white' ? 'white'
        : v === 'whiteoutline' || v === 'white-outline' ? 'outlineWhite'
        : v === 'secondary-outline' || v === 'outline' || v === 'blackoutline' ||
          v === 'black-outline' || v === 'outlineblack' || v === 'secondary-text' || v === 'text'
          ? onDark ? 'outlineWhite' : 'outlineBlack'
        : onDark ? 'white' : 'black';
      return (
        <Link
          ref={ref}
          to={to}
          className={`${baseButtonClasses} ${buttonVariants[demoVariant]} ${demoClassName}`.trim()}
          aria-label={ariaLabel}
          onClick={handleClick}
          {...rest}
        >
          {demoLabel}
        </Link>
      );
    }
    return (
      <DemoComponent
        ref={ref}
        label={demoLabel}
        href={href}
        onClick={handleClick}
        className={demoClassName}
        aria-label={ariaLabel}
        {...rest}
      />
    );
  }

  return (
    <DemoComponent
      ref={ref}
      label={demoLabel}
      type={type}
      disabled={isDisabled}
      onClick={handleClick}
      className={demoClassName}
      aria-label={ariaLabel}
      aria-busy={loading || undefined}
      {...rest}
    />
  );
});

export const BlackButton = forwardRef((props, ref) => (
  <Button ref={ref} variant="Primary" {...props} />
));

export const BlackOutlineButton = forwardRef((props, ref) => (
  <Button ref={ref} variant="Secondary-Outline" {...props} />
));

export const WhiteButton = forwardRef((props, ref) => (
  <Button ref={ref} variant="White" {...props} />
));

export const WhiteOutlineButton = forwardRef((props, ref) => (
  <Button ref={ref} variant="WhiteOutline" {...props} />
));

export default Button;
