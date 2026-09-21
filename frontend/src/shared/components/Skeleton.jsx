import React from 'react';

/**
 * Skeleton loading placeholder (UI-UX §49 & 02-frontend.md §15)
 * Sized to match final content per call site.
 */
export const Skeleton = ({
  className = '',
  width,
  height,
  rounded = 'rounded-sm',
}) => {
  const style = {};
  if (width) style.width = width;
  if (height) style.height = height;

  return (
    <div
      style={style}
      aria-hidden="true"
      className={`animate-pulse bg-surface border border-border/40 ${rounded} ${className}`}
    />
  );
};

export default Skeleton;
