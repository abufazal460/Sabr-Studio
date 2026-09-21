import React, { forwardRef } from 'react';
import { Link } from 'react-router-dom';

/**
 * The single canonical Button component for Sabr Studio (02-frontend.md §5 & §8).
 * Supports variants: 'Primary' | 'Secondary-Outline' | 'Secondary-Text' | 'White' | 'WhiteOutline'
 * Handles <button>, <Link to="...">, or <a href="..."> seamlessly.
 */
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
    onClick,
    className = '',
    'aria-label': ariaLabel,
    ...rest
  },
  ref
) {
  const content = label || children;

  // Base classes: 4px radius (rounded-sm), typography, transitions
  const baseClasses =
    'inline-flex items-center justify-center font-medium font-inter tracking-wide transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none rounded-sm';

  // Size classes (2x horizontal padding rule per prompt)
  const sizeClasses = {
    sm: 'text-xs px-4 py-2 min-h-[36px]',
    default: 'text-sm px-6 py-3 min-h-[44px]',
    lg: 'text-base px-8 py-4 min-h-[50px]',
  }[size] || 'text-sm px-6 py-3 min-h-[44px]';

  // Variant classes
  const variantLower = (variant || '').toLowerCase();
  let variantClasses = '';

  if (variantLower === 'primary' || variantLower === 'black') {
    variantClasses = 'bg-black text-white hover:bg-ink active:scale-[0.99] border border-black';
  } else if (
    variantLower === 'secondary-outline' ||
    variantLower === 'outline' ||
    variantLower === 'blackoutline' ||
    variantLower === 'black-outline'
  ) {
    variantClasses = 'bg-transparent text-ink border border-ink hover:bg-surface active:scale-[0.99]';
  } else if (
    variantLower === 'secondary-text' ||
    variantLower === 'text'
  ) {
    variantClasses = 'bg-transparent text-ink border border-transparent hover:underline px-0 py-1 min-h-0';
  } else if (variantLower === 'white') {
    variantClasses = 'bg-white text-ink hover:bg-surface border border-white';
  } else if (
    variantLower === 'whiteoutline' ||
    variantLower === 'white-outline'
  ) {
    variantClasses = 'bg-transparent text-white border border-white hover:bg-white/10';
  } else {
    variantClasses = 'bg-black text-white hover:bg-ink border border-black';
  }

  const widthClass = fullWidth ? 'w-full' : '';
  const combinedClasses = `${baseClasses} ${sizeClasses} ${variantClasses} ${widthClass} ${className}`.trim();

  const renderInner = () => {
    if (loading) {
      return (
        <span className="inline-flex items-center justify-center space-x-2">
          <svg
            className="animate-spin h-4 w-4 current-color"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span className="sr-only">Loading</span>
        </span>
      );
    }

    return (
      <span className="inline-flex items-center justify-center space-x-2">
        {Icon && iconPosition === 'left' && (
          <span className="inline-flex shrink-0 mr-1.5" aria-hidden="true">
            {typeof Icon === 'function' ? <Icon className="w-4 h-4" /> : Icon}
          </span>
        )}
        <span>{content}</span>
        {Icon && iconPosition === 'right' && (
          <span className="inline-flex shrink-0 ml-1.5" aria-hidden="true">
            {typeof Icon === 'function' ? <Icon className="w-4 h-4" /> : Icon}
          </span>
        )}
      </span>
    );
  };

  if (to && !disabled && !loading) {
    return (
      <Link
        ref={ref}
        to={to}
        className={combinedClasses}
        aria-label={ariaLabel}
        onClick={onClick}
        {...rest}
      >
        {renderInner()}
      </Link>
    );
  }

  if (href && !disabled && !loading) {
    return (
      <a
        ref={ref}
        href={href}
        className={combinedClasses}
        aria-label={ariaLabel}
        onClick={onClick}
        {...rest}
      >
        {renderInner()}
      </a>
    );
  }

  return (
    <button
      ref={ref}
      type={type}
      className={combinedClasses}
      disabled={disabled || loading}
      onClick={onClick}
      aria-label={ariaLabel}
      aria-busy={loading || undefined}
      {...rest}
    >
      {renderInner()}
    </button>
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
