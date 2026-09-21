import React from 'react';

/**
 * Badge component (02-frontend.md §8)
 * Small labeled tag e.g. category, status, sabr hallmark
 */
export const Badge = ({
  children,
  variant = 'default',
  className = '',
}) => {
  let variantClasses = 'bg-surface text-ink border-border';

  if (variant === 'dark' || variant === 'black') {
    variantClasses = 'bg-black text-white border-black';
  } else if (variant === 'brown') {
    variantClasses = 'bg-brown/10 text-brown border-brown/20';
  } else if (variant === 'success') {
    variantClasses = 'bg-success/10 text-success border-success/20';
  } else if (variant === 'error') {
    variantClasses = 'bg-error/10 text-error border-error/20';
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-inter font-medium tracking-wide uppercase border ${variantClasses} ${className}`}
    >
      {children}
    </span>
  );
};

export default Badge;
