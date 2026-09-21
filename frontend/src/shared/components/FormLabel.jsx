import React from 'react';

export const FormLabel = ({
  htmlFor,
  children,
  required = false,
  className = '',
}) => {
  return (
    <label
      htmlFor={htmlFor}
      className={`block text-xs uppercase tracking-wider font-medium text-ink mb-1.5 ${className}`}
    >
      {children}
      {required && <span className="text-error ml-1" aria-hidden="true">*</span>}
    </label>
  );
};

export default FormLabel;
