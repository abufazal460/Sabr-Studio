import React from 'react';
import { LuInbox } from 'react-icons/lu';
import { Button } from './Button';

/**
 * EmptyState view (UI-UX §51 & 02-frontend.md §15)
 * Clean, respectful no-data presentation without fabricated placeholder content.
 */
export const EmptyState = ({
  icon: Icon = LuInbox,
  title = 'No items found',
  description = 'There are currently no items available in this view.',
  actionLabel,
  actionTo,
  onAction,
  className = '',
}) => {
  return (
    <div
      className={`py-16 px-6 text-center border border-border bg-surface rounded-md max-w-lg mx-auto my-8 ${className}`}
    >
      <div className="w-12 h-12 rounded-full bg-white border border-border flex items-center justify-center mx-auto mb-4 text-muted">
        <Icon className="w-6 h-6" aria-hidden="true" />
      </div>
      <h3 className="font-abhaya text-2xl text-ink font-medium mb-2">
        {title}
      </h3>
      <p className="text-sm text-muted mb-6 leading-relaxed max-w-sm mx-auto">
        {description}
      </p>
      {actionLabel && (actionTo || onAction) && (
        <Button
          label={actionLabel}
          to={actionTo}
          onClick={onAction}
          variant="Secondary-Outline"
          size="sm"
        />
      )}
    </div>
  );
};

export default EmptyState;
