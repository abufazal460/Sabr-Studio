import React from 'react';

/**
 * SectionHeading shell (UI-UX §30)
 * [eyebrow label — uppercase, small, letter-spaced]
 * [H2 or H3 section heading]
 * [optional 1–2 line supporting copy, max-width 42rem]
 */
export const SectionHeading = ({
  eyebrow,
  title,
  description,
  align = 'left',
  as = 'h2',
  className = '',
  light = false,
}) => {
  const HeadingTag = as;
  const isCentered = align === 'center';

  return (
    <div className={`space-y-3 ${isCentered ? 'text-center mx-auto' : ''} ${className}`}>
      {eyebrow && (
        <span
          className={`block text-xs uppercase tracking-widest font-medium ${
            light ? 'text-white/70' : 'text-muted'
          }`}
        >
          {eyebrow}
        </span>
      )}
      <HeadingTag
        className={`font-abhaya text-3xl sm:text-4xl lg:text-5xl tracking-tight leading-[1.15] font-medium ${
          light ? 'text-white' : 'text-ink'
        }`}
      >
        {title}
      </HeadingTag>
      {description && (
        <p
          className={`text-sm sm:text-base leading-relaxed max-w-content ${
            isCentered ? 'mx-auto' : ''
          } ${light ? 'text-white/80' : 'text-muted'}`}
        >
          {description}
        </p>
      )}
    </div>
  );
};

export default SectionHeading;
