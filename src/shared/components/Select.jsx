import React, { forwardRef } from 'react';
import { LuChevronDown } from 'react-icons/lu';
import FormLabel from './FormLabel';
import FormError from './FormError';

export const Select = forwardRef(function Select(
  {
    id,
    name,
    label,
    value,
    onChange,
    onBlur,
    options = [],
    placeholder = 'Select an option',
    required = false,
    disabled = false,
    error,
    className = '',
    selectClassName = '',
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
      <div className="relative">
        <select
          ref={ref}
          id={id}
          name={name || id}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          disabled={disabled}
          required={required}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={errorId}
          className={`w-full bg-white text-ink text-sm px-4 py-3 pr-10 border rounded-sm appearance-none transition-colors duration-150 focus:outline-none focus:ring-1 focus:ring-ink focus:border-ink disabled:bg-surface disabled:text-muted disabled:cursor-not-allowed ${
            error ? 'border-error focus:ring-error focus:border-error' : 'border-border hover:border-muted/50'
          } ${selectClassName}`}
          {...rest}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) => {
            const val = typeof opt === 'object' ? opt.value : opt;
            const text = typeof opt === 'object' ? opt.label : opt;
            return (
              <option key={val} value={val}>
                {text}
              </option>
            );
          })}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-muted">
          <LuChevronDown className="w-4 h-4" aria-hidden="true" />
        </div>
      </div>
      <FormError id={errorId}>{error}</FormError>
    </div>
  );
});

export default Select;
