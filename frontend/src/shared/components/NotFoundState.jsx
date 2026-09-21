import React from 'react';
import { LuCircleHelp } from 'react-icons/lu';
import { Button } from './Button';

/**
 * NotFoundState (FR-C4 / FR-E3 & 02-frontend.md §15)
 * Distinct from generic router 404 — used when a matched slug is invalid, unpublished, or removed.
 */
export const NotFoundState = ({
  resourceName = 'Item',
  backTo = '/',
  backLabel = 'Return to Overview',
  className = '',
}) => {
  return (
    <div
      className={`py-24 px-6 text-center border border-border bg-surface rounded-md max-w-lg mx-auto my-12 ${className}`}
    >
      <div className="w-12 h-12 rounded-full bg-white border border-border flex items-center justify-center mx-auto mb-4 text-muted">
        <LuCircleHelp className="w-6 h-6" aria-hidden="true" />
      </div>
      <span className="text-xs uppercase tracking-widest text-muted font-medium block mb-2">
        Not Found
      </span>
      <h2 className="font-abhaya text-3xl text-ink font-medium mb-3">
        {resourceName} Unavailable
      </h2>
      <p className="text-sm text-muted mb-8 leading-relaxed max-w-sm mx-auto">
        The requested {resourceName.toLowerCase()} could not be located. It may have been archived, unpublished, or the link may be mistyped.
      </p>
      <Button
        label={backLabel}
        to={backTo}
        variant="Primary"
        size="default"
      />
    </div>
  );
};

export default NotFoundState;
