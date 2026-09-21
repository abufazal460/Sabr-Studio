import React from 'react';

export const FormError = ({
  id,
  children,
  className = '',
}) => {
  if (!children) return null;

  return (
    <p
      id={id}
      role="alert"
      className={`mt-1.5 text-xs text-error font-inter font-normal ${className}`}
    >
      {children}
    </p>
  );
};

export default FormError;
