import { useState, useId } from 'react';
import PropTypes from 'prop-types';
import { LuX, LuCheck } from 'react-icons/lu';
import Select from '../../../shared/components/Select';
import { Button } from '../../../shared/components/Button';

export const ProjectCategorySelect = ({
  id = 'proj-category',
  label = 'Category',
  value = 'Residential',
  onChange,
  categories = ['Residential', 'Commercial', 'Hospitality'],
  createCategoryApi,
  onCategoryCreated,
  disabled = false,
  required = true,
  error,
}) => {
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [customInput, setCustomInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customError, setCustomError] = useState('');
  const customInputId = useId();

  // Ensure current value is included in the available category options
  const normalizedValue = value ? String(value).trim() : 'Residential';
  const allCategories = Array.from(
    new Set(
      [...categories, normalizedValue]
        .map((c) => String(c || '').trim())
        .filter(Boolean)
    )
  );

  const selectOptions = [
    ...allCategories.map((c) => ({ value: c, label: c })),
    { value: '__custom__', label: '+ Add New Category...' },
  ];

  const handleSelectChange = (e) => {
    const selected = e.target.value;
    if (selected === '__custom__') {
      setIsAddingCustom(true);
      setCustomInput('');
      setCustomError('');
    } else {
      setIsAddingCustom(false);
      setCustomError('');
      onChange?.(selected);
    }
  };

  const handleCreateCustom = async () => {
    const trimmed = customInput.trim();
    if (!trimmed) {
      setCustomError('Category name is required.');
      return;
    }
    if (trimmed.length > 50) {
      setCustomError('Category cannot exceed 50 characters.');
      return;
    }

    // Case-insensitive check against existing categories
    const existing = allCategories.find((c) => c.toLowerCase() === trimmed.toLowerCase());
    if (existing) {
      onChange?.(existing);
      setIsAddingCustom(false);
      setCustomInput('');
      setCustomError('');
      return;
    }

    setIsSubmitting(true);
    setCustomError('');
    try {
      if (createCategoryApi) {
        const res = await createCategoryApi(trimmed);
        const createdName = res?.data?.name || res?.name || trimmed;
        onCategoryCreated?.(createdName);
        onChange?.(createdName);
      } else {
        onCategoryCreated?.(trimmed);
        onChange?.(trimmed);
      }
      setIsAddingCustom(false);
      setCustomInput('');
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to create category.';
      setCustomError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelCustom = () => {
    setIsAddingCustom(false);
    setCustomInput('');
    setCustomError('');
  };

  return (
    <div className="space-y-2">
      <Select
        id={id}
        label={label}
        value={isAddingCustom ? '__custom__' : normalizedValue}
        onChange={handleSelectChange}
        options={selectOptions}
        disabled={disabled || isSubmitting}
        required={required}
        error={error}
      />

      {isAddingCustom && (
        <div className="p-3 bg-surface/50 border border-border rounded-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider text-muted font-medium">
              New Project Category
            </span>
            <button
              type="button"
              onClick={handleCancelCustom}
              className="text-muted hover:text-ink transition-colors p-1"
              aria-label="Cancel adding category"
            >
              <LuX className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <input
              id={customInputId}
              type="text"
              value={customInput}
              onChange={(e) => {
                setCustomInput(e.target.value);
                if (customError) setCustomError('');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleCreateCustom();
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  handleCancelCustom();
                }
              }}
              placeholder="e.g. Mixed-Use, Restoration"
              maxLength={50}
              autoFocus
              disabled={isSubmitting}
              className="flex-1 text-sm bg-white border border-border px-3 py-2 text-ink focus:border-black focus:outline-none rounded-sm"
            />
            <Button
              type="button"
              variant="Primary"
              size="sm"
              icon={LuCheck}
              iconPosition="left"
              label={isSubmitting ? 'Saving...' : 'Add'}
              disabled={isSubmitting || !customInput.trim()}
              onClick={handleCreateCustom}
            />
          </div>
          {customError && (
            <p className="text-xs text-error mt-1" role="alert">
              {customError}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

ProjectCategorySelect.propTypes = {
  id: PropTypes.string,
  label: PropTypes.string,
  value: PropTypes.string,
  onChange: PropTypes.func,
  categories: PropTypes.arrayOf(PropTypes.string),
  createCategoryApi: PropTypes.func,
  onCategoryCreated: PropTypes.func,
  disabled: PropTypes.bool,
  required: PropTypes.bool,
  error: PropTypes.string,
};

export default ProjectCategorySelect;
