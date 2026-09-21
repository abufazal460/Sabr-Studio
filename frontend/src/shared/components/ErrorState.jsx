import React from 'react';
import { LuCircleAlert } from 'react-icons/lu';
import { Button } from './Button';

/**
 * ErrorState view (UI-UX §50 & 02-frontend.md §15)
 * Non-crashing API-failure view with retry affordance.
 */
export const ErrorState = ({
  title = 'Unable to load content',
  message = 'A network or server error occurred. Please try again.',
  onRetry,
  className = '',
}) => {
  return (
    <div
      role="alert"
      className={`py-16 px-6 text-center border border-border bg-surface rounded-md max-w-lg mx-auto my-8 ${className}`}
    >
      <div className="w-12 h-12 rounded-full bg-error/10 border border-error/20 flex items-center justify-center mx-auto mb-4 text-error">
        <LuCircleAlert className="w-6 h-6" aria-hidden="true" />
      </div>
      <h3 className="font-abhaya text-2xl text-ink font-medium mb-2">
        {title}
      </h3>
      <p className="text-sm text-muted mb-6 leading-relaxed max-w-sm mx-auto">
        {message}
      </p>
      {onRetry && (
        <Button
          label="Retry Request"
          onClick={onRetry}
          variant="Secondary-Outline"
          size="sm"
        />
      )}
    </div>
  );
};

export default ErrorState;
