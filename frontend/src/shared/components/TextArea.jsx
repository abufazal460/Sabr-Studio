import React, { forwardRef } from 'react';
import FormLabel from './FormLabel';
import FormError from './FormError';

export const TextArea = forwardRef(function TextArea(
  {
    id,
    name,
    label,
    value,
    onChange,
    onBlur,
    placeholder,
    rows = 4,
    required = false,
    disabled = false,
    error,
    className = '',
    inputClassName = '',
    ...rest
  },
  ref
) {
  const errorId = error && id ? `${id}-error` : undefined;

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <FormLabel htmlFor={id} required={required}>
          {label}
        </FormLabel>
      )}
      <textarea
        ref={ref}
        id={id}
        name={name || id}
        rows={rows}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={errorId}
        className={`w-full bg-white text-ink text-sm px-4 py-3 border rounded-sm transition-colors duration-150 placeholder:text-muted/60 focus:outline-none focus:ring-1 focus:ring-ink focus:border-ink disabled:bg-surface disabled:text-muted disabled:cursor-not-allowed resize-y ${
          error ? 'border-error focus:ring-error focus:border-error' : 'border-border hover:border-muted/50'
        } ${inputClassName}`}
        {...rest}
      />
      <FormError id={errorId}>{error}</FormError>
    </div>
  );
});

export default TextArea;
